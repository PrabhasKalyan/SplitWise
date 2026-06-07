import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildBalanceRows, simplifyDebts } from "../../lib/balances";
import { fetchGroupBundle, recordSettlement } from "../../lib/db";
import { formatCurrency } from "../../lib/money";
import { GroupBundle, SettlementTransfer } from "../../lib/types";
import { useAppState } from "../../state/AppContext";

export const SettlePage = () => {
  const { groupId } = useParams();
  const { user, dataVersion, refreshData } = useAppState();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [form, setForm] = useState({
    fromMemberId: "",
    toMemberId: "",
    amount: "",
    description: ""
  });

  useEffect(() => {
    if (!groupId) {
      return;
    }

    void fetchGroupBundle(groupId).then(setBundle);
  }, [dataVersion, groupId]);

  const currentMember = useMemo(
    () => bundle?.members.find((m) => m.user_id === user?.id),
    [bundle?.members, user?.id]
  );

  const model = useMemo(
    () =>
      bundle ? buildBalanceRows(bundle.members, bundle.expenses, bundle.participants) : { rows: [], participantsByExpense: new Map() },
    [bundle]
  );
  
  // Suggestions involving the current user as the PAYER
  const suggestions = useMemo(() => {
    const all = simplifyDebts(model.rows);
    if (!currentMember) return [];
    return all.filter(s => s.fromMemberId === currentMember.id);
  }, [model.rows, currentMember]);

  const [error, setError] = useState("");

  const handleSuggestion = (transfer: SettlementTransfer) => {
    setError("");
    setForm({
      fromMemberId: currentMember?.id || "",
      toMemberId: transfer.toGroupMemberId,
      amount: String(transfer.amount),
      description: "Settle-up"
    });
  };

  // Update suggested amount when recipient changes
  useEffect(() => {
    if (form.toMemberId && currentMember) {
      const suggestion = suggestions.find(s => s.toMemberId === form.toMemberId);
      if (suggestion) {
        setForm(prev => ({ ...prev, amount: String(suggestion.amount) }));
      }
    }
  }, [form.toMemberId, suggestions, currentMember]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bundle || !user || !currentMember) {
      return;
    }

    if (form.toMemberId === currentMember.id) {
      setError("You cannot settle with yourself.");
      return;
    }

    try {
      await recordSettlement({
        groupId: bundle.group.id,
        createdBy: user.id,
        title: "Settlement",
        description: form.description,
        expenseDate: new Date().toISOString().slice(0, 10),
        transfers: [
          {
            fromGroupMemberId: currentMember.id,
            toGroupMemberId: form.toMemberId,
            amount: Number(form.amount)
          }
        ],
        scope: "group"
      });

      refreshData();
      navigate(`/groups/${bundle.group.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to record settlement.");
    }
  };

  if (!bundle) {
    return <div className="panel">Loading settle-up flow...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settle up</p>
          <h1>{bundle.group.name}</h1>
          <p className="muted">Record a payment from yourself to another member.</p>
        </div>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Pending Debts</p>
              <h3>People you owe</h3>
            </div>
          </div>
          <div className="stack">
            {suggestions.length === 0 ? (
              <p className="muted">You don't owe anyone in this group!</p>
            ) : (
              suggestions.map((entry) => (
                <button
                  key={`${entry.fromMemberId}-${entry.toMemberId}`}
                  type="button"
                  className="list-row action-row"
                  onClick={() =>
                    handleSuggestion({
                      fromGroupMemberId: entry.fromMemberId,
                      toGroupMemberId: entry.toMemberId,
                      amount: entry.amount
                    })
                  }
                >
                  <span>
                    Pay <strong>{entry.toName}</strong>
                  </span>
                  <strong>{formatCurrency(entry.amount)}</strong>
                </button>
              ))
            )}
          </div>
        </section>

        <form className="panel stack" onSubmit={(event) => void handleSubmit(event)}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payment Details</p>
              <h3>You are paying</h3>
            </div>
          </div>
          
          <div className="field">
            <span>Recipient</span>
            <select
              className="input"
              value={form.toMemberId}
              onChange={(event) => setForm((current) => ({ ...current, toMemberId: event.target.value }))}
              required
            >
              <option value="">Select someone to pay</option>
              {bundle.members
                .filter((member) => member.id !== currentMember?.id && member.status !== "removed")
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="field">
            <span>Amount</span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                required
              />
              <span className="muted" style={{ whiteSpace: "nowrap" }}>
                (Partial ok)
              </span>
            </div>
          </div>

          <div className="field">
            <span>Description</span>
            <textarea
              className="textarea"
              rows={2}
              placeholder="Optional note..."
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>

          {error && <p className="error-text">{error}</p>}
          
          <button type="submit" className="button" style={{ width: "100%" }}>
            Confirm Payment
          </button>
        </form>
      </div>
    </div>
  );
};
