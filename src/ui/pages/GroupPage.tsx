import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { buildBalanceRows, simplifyDebts } from "../../lib/balances";
import { addGroupMember, fetchGroupBundle, removeGroupMember, updateGroup } from "../../lib/db";
import { formatCurrency } from "../../lib/money";
import { GroupBundle, GroupType } from "../../lib/types";
import { useAppState } from "../../state/AppContext";
import { GroupChatPanel } from "../components/GroupChatPanel";

const groupTypes: GroupType[] = ["trip", "home", "couple", "other"];

export const GroupPage = () => {
  const { groupId } = useParams();
  const { user, dataVersion, refreshData } = useAppState();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupForm, setGroupForm] = useState({ name: "", type: "trip" as GroupType });
  const [memberForm, setMemberForm] = useState({ name: "", email: "", isAdmin: false });

  useEffect(() => {
    if (!groupId) {
      return;
    }

    setLoading(true);
    void fetchGroupBundle(groupId)
      .then((nextBundle) => {
        setBundle(nextBundle);
        setGroupForm({
          name: nextBundle.group.name,
          type: nextBundle.group.type
        });
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load group."))
      .finally(() => setLoading(false));
  }, [dataVersion, groupId]);

  const currentMember = useMemo(
    () => bundle?.members.find((member) => member.user_id === user?.id) ?? null,
    [bundle?.members, user?.id]
  );
  const isAdmin = Boolean(currentMember?.is_admin);
  const balanceModel = useMemo(
    () =>
      bundle ? buildBalanceRows(bundle.members, bundle.expenses, bundle.participants) : { rows: [], participantsByExpense: new Map() },
    [bundle]
  );
  const suggestions = useMemo(() => simplifyDebts(balanceModel.rows), [balanceModel.rows]);

  const handleGroupUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!bundle || !isAdmin) {
      return;
    }

    await updateGroup(bundle.group.id, groupForm);
    refreshData();
  };

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!bundle || !currentMember) {
      return;
    }

    await addGroupMember(bundle.group.id, currentMember.user_id ?? currentMember.added_by, memberForm);
    setMemberForm({ name: "", email: "", isAdmin: false });
    refreshData();
  };

  if (loading || !bundle) {
    return <div className="panel">Loading group...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">{bundle.group.type}</p>
          <h1>{bundle.group.name}</h1>
        </div>
        <div className="button-row">
          <Link to={`/groups/${bundle.group.id}/chat`} className="button button-secondary">
            Group chat
          </Link>
          <Link to={`/groups/${bundle.group.id}/expenses/new`} className="button">
            Add expense
          </Link>
          <Link to={`/groups/${bundle.group.id}/settle`} className="button button-secondary">
            Settle up
          </Link>
        </div>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      <div className="stats-grid">
        {balanceModel.rows.map((row) => (
          <article key={row.memberId} className="panel stat-card">
            <p className="eyebrow">{row.memberName}</p>
            <h3>{formatCurrency(row.net)}</h3>
            <p className="muted">
              Paid {formatCurrency(row.totalPaid)} · Owes {formatCurrency(row.totalOwed)}
            </p>
          </article>
        ))}
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Simplified debts</p>
              <h3>Who should pay whom</h3>
            </div>
          </div>
          <div className="stack">
            {suggestions.length === 0 ? (
              <p className="muted">Everyone is settled in this group.</p>
            ) : (
              suggestions.map((entry) => (
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
              <p className="eyebrow">Members</p>
              <h3>Group access</h3>
            </div>
          </div>
          <div className="stack">
            {bundle.members
              .filter((member) => member.status !== "removed")
              .map((member) => {
                const row = balanceModel.rows.find((entry) => entry.memberId === member.id);
                const canRemove = isAdmin && member.id !== currentMember?.id && (row?.net ?? 0) === 0;

                return (
                  <div key={member.id} className="list-row">
                    <div>
                      <strong>{member.name}</strong>
                      <p className="muted">
                        {member.email} · {member.status}
                        {member.is_admin ? " · admin" : ""}
                      </p>
                    </div>
                    {canRemove ? (
                      <button type="button" className="button button-secondary" onClick={() => void removeGroupMember(member.id).then(refreshData)}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {isAdmin ? (
        <form className="panel stack-lg" onSubmit={(event) => void handleAddMember(event)} style={{ padding: "32px" }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Add member</p>
              <h3>Directly add by name and email</h3>
            </div>
          </div>
          <div className="grid-form">
            <input
              className="input"
              placeholder="Name"
              value={memberForm.name}
              onChange={(event) => setMemberForm((current) => ({ ...current, name: event.target.value }))}
              required
            />
            <input
              className="input"
              type="email"
              placeholder="Email"
              value={memberForm.email}
              onChange={(event) => setMemberForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={memberForm.isAdmin}
                  onChange={(event) => setMemberForm((current) => ({ ...current, isAdmin: event.target.checked }))}
                />
                <span>Make admin</span>
              </label>
              <button type="submit" className="button">
                Add member
              </button>
            </div>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Expenses</p>
            <h3>Recent activity</h3>
          </div>
        </div>
        <div className="stack">
          {bundle.expenses.map((expense) => (
            <Link key={expense.id} to={`/groups/${bundle.group.id}/expenses/${expense.id}`} className="list-row list-link">
              <div>
                <strong>{expense.title}</strong>
                <p className="muted">
                  {expense.entry_type} · {expense.expense_date}
                </p>
              </div>
              <strong>{formatCurrency(expense.total_amount)}</strong>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};
