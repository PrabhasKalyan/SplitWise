import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createExpense, fetchGroupBundle } from "../../lib/db";
import { apportionByWeights, computeEqualShares, formatCurrency } from "../../lib/money";
import { CreateExpenseInput, GroupBundle, GroupMember, ParticipantInputType, SplitMethod } from "../../lib/types";
import { useAppState } from "../../state/AppContext";

type ExpenseParticipantDraft = {
  groupMemberId: string;
  isIncluded: boolean;
  inputValue: string;
};

type PayerDraft = {
  groupMemberId: string;
  amount: string;
};

const expenseSplitMethods: Array<Exclude<SplitMethod, "settlement">> = ["equal", "unequal", "percentage", "shares"];

const buildPreview = (
  total: number,
  splitMethod: Exclude<SplitMethod, "settlement">,
  drafts: ExpenseParticipantDraft[]
) => {
  const selected = drafts.filter((draft) => draft.isIncluded);

  if (selected.length === 0) {
    return new Map<string, { owedAmount: number; inputType: ParticipantInputType; inputValue: number | null }>();
  }

  if (splitMethod === "equal") {
    const shares = computeEqualShares(total, selected.length);
    return new Map(
      selected.map((draft, index) => [
        draft.groupMemberId,
        {
          owedAmount: shares[index],
          inputType: "equal" as ParticipantInputType,
          inputValue: null
        }
      ])
    );
  }

  const values = selected.map((draft) => Number(draft.inputValue || 0));
  if (splitMethod === "unequal") {
    return new Map(
      selected.map((draft, index) => [
        draft.groupMemberId,
        {
          owedAmount: values[index],
          inputType: "amount" as ParticipantInputType,
          inputValue: values[index]
        }
      ])
    );
  }

  const apportioned = apportionByWeights(total, values);
  return new Map(
    selected.map((draft, index) => [
      draft.groupMemberId,
      {
        owedAmount: apportioned[index],
        inputType: splitMethod === "percentage" ? ("percentage" as ParticipantInputType) : ("share" as ParticipantInputType),
        inputValue: values[index]
      }
    ])
  );
};

export const AddExpensePage = () => {
  const { groupId } = useParams();
  const { user, dataVersion, refreshData } = useAppState();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<GroupBundle | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState("0");
  const [splitMethod, setSplitMethod] = useState<Exclude<SplitMethod, "settlement">>("equal");
  const [participantDrafts, setParticipantDrafts] = useState<ExpenseParticipantDraft[]>([]);
  const [payerDrafts, setPayerDrafts] = useState<PayerDraft[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!groupId) {
      return;
    }

    void fetchGroupBundle(groupId).then((nextBundle) => {
      setBundle(nextBundle);
      const activeMembers = nextBundle.members.filter((member) => member.status !== "removed");
      setParticipantDrafts(
        activeMembers.map((member) => ({
          groupMemberId: member.id,
          isIncluded: true,
          inputValue: ""
        }))
      );

      const currentMember = activeMembers.find((member) => member.user_id === user?.id) ?? activeMembers[0];
      setPayerDrafts(
        activeMembers.map((member) => ({
          groupMemberId: member.id,
          amount: member.id === currentMember?.id ? "0" : "0"
        }))
      );
    });
  }, [dataVersion, groupId, user?.id]);

  const total = Number(totalAmount || 0);
  const preview = useMemo(() => buildPreview(total, splitMethod, participantDrafts), [participantDrafts, splitMethod, total]);
  const participantTotal = [...preview.values()].reduce((sum, value) => sum + value.owedAmount, 0);
  const payerTotal = payerDrafts.reduce((sum, payer) => sum + Number(payer.amount || 0), 0);

  const activeMembers = bundle?.members.filter((member) => member.status !== "removed") ?? [];
  const memberMap = new Map(activeMembers.map((member) => [member.id, member]));

  const validate = () => {
    if (splitMethod === "unequal" && participantTotal !== total) {
      return "Unequal split amounts must sum exactly to the total.";
    }

    if (splitMethod === "percentage") {
      const percent = participantDrafts
        .filter((draft) => draft.isIncluded)
        .reduce((sum, draft) => sum + Number(draft.inputValue || 0), 0);
      if (percent !== 100) {
        return "Percentages must sum exactly to 100.";
      }
    }

    if (payerTotal !== total) {
      return "Payer contributions must sum exactly to the total.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!bundle || !user) {
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: CreateExpenseInput = {
      groupId: bundle.group.id,
      title,
      description,
      expenseDate,
      totalAmount: total,
      splitMethod,
      receiptFile,
      payers: payerDrafts
        .filter((payer) => Number(payer.amount || 0) > 0)
        .map((payer) => ({
          groupMemberId: payer.groupMemberId,
          amount: Number(payer.amount || 0)
        })),
      participants: participantDrafts.map((draft) => {
        const computed = preview.get(draft.groupMemberId);
        return {
          groupMemberId: draft.groupMemberId,
          owedAmount: computed?.owedAmount ?? 0,
          inputValue: computed?.inputValue ?? null,
          inputType: computed?.inputType ?? "equal",
          isIncluded: draft.isIncluded
        };
      })
    };

    const expense = await createExpense(user.id, payload);
    refreshData();
    navigate(`/groups/${bundle.group.id}/expenses/${expense.id}`);
  };

  if (!bundle) {
    return <div className="panel">Loading expense form...</div>;
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <p className="eyebrow">Add expense</p>
          <h1>{bundle.group.name}</h1>
        </div>
      </div>

      <form className="panel stack-lg" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid-form">
          <label className="field">
            <span>Title</span>
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className="field">
            <span>Total amount</span>
            <input
              className="input"
              type="number"
              min="1"
              value={totalAmount}
              onChange={(event) => setTotalAmount(event.target.value)}
              required
            />
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea className="textarea" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>

        <div className="grid-form">
          <label className="field">
            <span>Date</span>
            <input
              className="input"
              type="date"
              value={expenseDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setExpenseDate(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Split method</span>
            <select className="input" value={splitMethod} onChange={(event) => setSplitMethod(event.target.value as Exclude<SplitMethod, "settlement">)}>
              {expenseSplitMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Receipt image</span>
          <input type="file" accept="image/*" onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)} />
        </label>

        <section className="stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Participants</p>
              <h3>Who owes what</h3>
            </div>
            <span className="pill">{formatCurrency(participantTotal)}</span>
          </div>
          {participantDrafts.map((draft, index) => {
            const member = memberMap.get(draft.groupMemberId) as GroupMember;
            const computed = preview.get(draft.groupMemberId);
            return (
              <div key={draft.groupMemberId} className="participant-row">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={draft.isIncluded}
                    onChange={(event) =>
                      setParticipantDrafts((current) =>
                        current.map((participant, participantIndex) =>
                          participantIndex === index ? { ...participant, isIncluded: event.target.checked } : participant
                        )
                      )
                    }
                  />
                  <span>{member.name}</span>
                </label>
                {splitMethod !== "equal" ? (
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder={splitMethod === "percentage" ? "%" : splitMethod === "shares" ? "shares" : "amount"}
                    value={draft.inputValue}
                    disabled={!draft.isIncluded}
                    onChange={(event) =>
                      setParticipantDrafts((current) =>
                        current.map((participant, participantIndex) =>
                          participantIndex === index ? { ...participant, inputValue: event.target.value } : participant
                        )
                      )
                    }
                  />
                ) : (
                  <span className="pill pill-ghost">{computed ? formatCurrency(computed.owedAmount) : formatCurrency(0)}</span>
                )}
                {splitMethod !== "equal" ? (
                  <span className="muted preview-value">{computed ? formatCurrency(computed.owedAmount) : formatCurrency(0)}</span>
                ) : null}
              </div>
            );
          })}
        </section>

        <section className="stack">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Paid by</p>
              <h3>Multiple payers supported</h3>
            </div>
            <span className="pill">{formatCurrency(payerTotal)}</span>
          </div>
          {payerDrafts.map((draft, index) => {
            const member = memberMap.get(draft.groupMemberId) as GroupMember;
            return (
              <div key={draft.groupMemberId} className="participant-row">
                <span>{member.name}</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={draft.amount}
                  onChange={(event) =>
                    setPayerDrafts((current) =>
                      current.map((payer, payerIndex) =>
                        payerIndex === index ? { ...payer, amount: event.target.value } : payer
                      )
                    )
                  }
                />
              </div>
            );
          })}
        </section>

        {error ? <p className="error-text">{error}</p> : null}
        <button type="submit" className="button">
          Save expense
        </button>
      </form>
    </div>
  );
};
