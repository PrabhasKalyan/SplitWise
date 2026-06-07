import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchExpenseDetails, fetchGroupBundle } from "../../lib/db";
import { formatCurrency } from "../../lib/money";
import { Expense, ExpenseParticipant, GroupBundle } from "../../lib/types";

export const ExpenseDetailPage = () => {
  const { groupId, expenseId } = useParams();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [participants, setParticipants] = useState<ExpenseParticipant[]>([]);

  useEffect(() => {
    if (!groupId || !expenseId) {
      return;
    }

    void Promise.all([fetchGroupBundle(groupId), fetchExpenseDetails(expenseId)]).then(([groupBundle, detail]) => {
      setBundle(groupBundle);
      setExpense(detail.expense);
      setParticipants(detail.participants);
    });
  }, [expenseId, groupId]);

  const memberMap = useMemo(
    () => new Map((bundle?.members ?? []).map((member) => [member.id, member])),
    [bundle?.members]
  );

  if (!bundle || !expense) {
    return <div className="panel">Loading expense details...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">{expense.entry_type}</p>
          <h1>{expense.title}</h1>
        </div>
        <Link to={`/groups/${bundle.group.id}`} className="button button-secondary">
          Back to group
        </Link>
      </div>

      <div className="stats-grid">
        <article className="panel stat-card">
          <p className="eyebrow">Total</p>
          <h2>{formatCurrency(expense.total_amount)}</h2>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Date</p>
          <h2>{expense.expense_date}</h2>
        </article>
        <article className="panel stat-card">
          <p className="eyebrow">Split</p>
          <h2>{expense.split_method}</h2>
        </article>
      </div>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Description</p>
              <h3>Expense details</h3>
            </div>
          </div>
          <p>{expense.description || "No description provided."}</p>
          {expense.receipt_url ? <img src={expense.receipt_url} alt="Receipt" className="receipt-image" /> : null}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Payers</p>
              <h3>Who covered the bill</h3>
            </div>
          </div>
          <div className="stack">
            {expense.payer_payload.map((payer) => (
              <div key={payer.groupMemberId} className="list-row">
                <span>{memberMap.get(payer.groupMemberId)?.name ?? "Unknown member"}</span>
                <strong>{formatCurrency(payer.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Participants</p>
            <h3>Who owes what</h3>
          </div>
        </div>
        <div className="stack">
          {participants.map((participant) => (
            <div key={participant.id} className="list-row">
              <span>{memberMap.get(participant.group_member_id)?.name ?? "Unknown member"}</span>
              <strong>{formatCurrency(participant.owed_amount)}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
