import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildBalanceRows, buildPersonalSummary, simplifyDebts } from "../../lib/balances";
import { fetchGlobalSettlements, fetchGroupBundle, fetchGroupsForUser, recordSettlement } from "../../lib/db";
import { formatCurrency } from "../../lib/money";
import { GroupBundle, GroupMember, SettlementTransfer } from "../../lib/types";
import { useAppState } from "../../state/AppContext";

export const DashboardPage = () => {
  const { user, dataVersion, refreshData } = useAppState();
  const [bundles, setBundles] = useState<GroupBundle[]>([]);
  const [globalSettlements, setGlobalSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settlementForm, setSettlementForm] = useState({
    fromMemberId: "",
    toMemberId: "",
    amount: "",
    description: ""
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError("");
    void fetchGroupsForUser(user.id)
      .then(async (memberships) => {
        const loadedBundles = await Promise.all(memberships.map((item) => fetchGroupBundle(item.group.id)));
        const globalEntries = await fetchGlobalSettlements();
        setBundles(loadedBundles);
        setGlobalSettlements(globalEntries);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load dashboard."))
      .finally(() => setLoading(false));
  }, [dataVersion, user]);

  const activeMembers = useMemo(() => {
    const map = new Map<string, GroupMember & { groupName: string }>();
    for (const bundle of bundles) {
      for (const member of bundle.members.filter((entry) => entry.status !== "removed")) {
        map.set(member.id, { ...member, groupName: bundle.group.name });
      }
    }

    return [...map.values()];
  }, [bundles]);

  const balanceModel = useMemo(() => {
    const allMembers = bundles.flatMap((bundle) => bundle.members);
    const allExpenses = bundles.flatMap((bundle) => bundle.expenses).concat(globalSettlements);
    const allParticipants = bundles.flatMap((bundle) => bundle.participants);
    const { rows } = buildBalanceRows(allMembers, allExpenses, allParticipants);
    const memberIds = allMembers.filter((member) => member.user_id === user?.id).map((member) => member.id);
    const personal = rows
      .filter((row) => memberIds.includes(row.memberId))
      .map((row) => buildPersonalSummary(rows, row.memberId))
      .reduce(
        (accumulator, summary) => ({
          owes: accumulator.owes + summary.owes,
          owed: accumulator.owed + summary.owed,
          net: accumulator.net + summary.net
        }),
        { owes: 0, owed: 0, net: 0 }
      );
    const userSuggestions = simplifyDebts(rows).filter(
      (entry) => memberIds.includes(entry.fromMemberId) || memberIds.includes(entry.toMemberId)
    );

    return {
      rows,
      personal,
      userSuggestions
    };
  }, [bundles, globalSettlements, user?.id]);

  const userMemberIds = useMemo(
    () => bundles.flatMap(b => b.members).filter(m => m.user_id === user?.id).map(m => m.id),
    [bundles, user?.id]
  );

  const handleSettlement = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !settlementForm.fromMemberId) {
      return;
    }

    const transfer: SettlementTransfer = {
      fromGroupMemberId: settlementForm.fromMemberId,
      toGroupMemberId: settlementForm.toMemberId,
      amount: Number(settlementForm.amount)
    };

    await recordSettlement({
      createdBy: user.id,
      title: "Cross-group settlement",
      description: settlementForm.description,
      expenseDate: new Date().toISOString().slice(0, 10),
      transfers: [transfer],
      scope: "global"
    });

    setSettlementForm({
      fromMemberId: "",
      toMemberId: "",
      amount: "",
      description: ""
    });
    refreshData();
  };

  // Update suggested amount when recipient changes
  useEffect(() => {
    if (settlementForm.toMemberId) {
      const suggestion = balanceModel.userSuggestions.find(s => s.toMemberId === settlementForm.toMemberId);
      if (suggestion) {
        setSettlementForm(prev => ({ ...prev, amount: String(suggestion.amount) }));
      }
    }
  }, [settlementForm.toMemberId, balanceModel.userSuggestions]);

  if (loading) {
    return <div className="panel">Loading dashboard...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Overall balance summary</h1>
        </div>
        <Link to="/groups/new" className="button">
          Create group
        </Link>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="stats-grid">
        <article className="panel stat-card">
          <p className="eyebrow">Total you owe</p>
          <h2>{formatCurrency(balanceModel.personal.owes)}</h2>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Total owed to you</p>
          <h2>{formatCurrency(balanceModel.personal.owed)}</h2>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Net balance</p>
          <h2>{formatCurrency(balanceModel.personal.net)}</h2>
        </article>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Per-person</p>
              <h3>Simplified settle-up suggestions</h3>
            </div>
          </div>
          <div className="stack">
            {balanceModel.userSuggestions.length === 0 ? (
              <p className="muted">You’re fully settled up across your current groups.</p>
            ) : (
              balanceModel.userSuggestions.map((entry) => (
                <div key={`${entry.fromMemberId}-${entry.toMemberId}`} className="list-row">
                  <span>
                    {entry.fromName} pays {entry.toName}
                  </span>
                  <strong>{formatCurrency(entry.amount)}</strong>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Record Payment</p>
              <h3>You are paying someone</h3>
            </div>
          </div>
          <form className="stack" onSubmit={(event) => void handleSettlement(event)}>
            <div className="field">
              <span>Select your account</span>
              <select
                className="input"
                value={settlementForm.fromMemberId}
                onChange={(event) => setSettlementForm((current) => ({ ...current, fromMemberId: event.target.value }))}
                required
              >
                <option value="">Choose which group to pay from</option>
                {activeMembers
                  .filter(m => m.user_id === user?.id)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} (in {member.groupName})
                    </option>
                  ))}
              </select>
            </div>

            <div className="field">
              <span>Recipient</span>
              <select
                className="input"
                value={settlementForm.toMemberId}
                onChange={(event) => setSettlementForm((current) => ({ ...current, toMemberId: event.target.value }))}
                required
              >
                <option value="">Who are you paying?</option>
                {activeMembers
                  .filter(m => m.user_id !== user?.id && m.status !== "removed")
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} · {member.groupName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="field">
              <span>Amount</span>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Amount to pay"
                value={settlementForm.amount}
                onChange={(event) => setSettlementForm((current) => ({ ...current, amount: event.target.value }))}
                required
              />
            </div>

            <textarea
              className="textarea"
              rows={2}
              placeholder="Description (optional)"
              value={settlementForm.description}
              onChange={(event) => setSettlementForm((current) => ({ ...current, description: event.target.value }))}
            />
            <button type="submit" className="button">
              Confirm Global Payment
            </button>
          </form>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Groups</p>
            <h3>Per-group balances</h3>
          </div>
        </div>
        {bundles.length === 0 ? (
          <div className="empty-state">
            <h3>No groups yet.</h3>
            <p>Create a group to start logging expenses.</p>
          </div>
        ) : (
          <div className="group-grid">
            {bundles.map((bundle) => {
              const { rows } = buildBalanceRows(bundle.members, bundle.expenses, bundle.participants);
              const currentRows = rows.filter((row) =>
                bundle.members.some((member) => member.user_id === user?.id && member.id === row.memberId)
              );
              const net = currentRows.reduce((sum, row) => sum + row.net, 0);

              return (
                <Link key={bundle.group.id} to={`/groups/${bundle.group.id}`} className="panel panel-link">
                  <p className="eyebrow">{bundle.group.type}</p>
                  <h3>{bundle.group.name}</h3>
                  <p className="muted">
                    {bundle.members.filter((member) => member.status !== "removed").length} members · {bundle.expenses.length} entries
                  </p>
                  <strong>{formatCurrency(net)}</strong>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
