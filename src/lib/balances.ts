import {
  BalanceRow,
  Expense,
  ExpenseParticipant,
  GroupMember,
  SettlementSuggestion
} from "./types";

const keyByMember = (members: GroupMember[]) =>
  new Map(members.map((member) => [member.id, member]));

export const buildBalanceRows = (
  members: GroupMember[],
  expenses: Expense[],
  participants: ExpenseParticipant[]
) => {
  const memberMap = keyByMember(members);
  const paid = new Map<string, number>();
  const owed = new Map<string, number>();
  const participantsByExpense = new Map<string, ExpenseParticipant[]>();

  for (const participant of participants) {
    const list = participantsByExpense.get(participant.expense_id) ?? [];
    list.push(participant);
    participantsByExpense.set(participant.expense_id, list);
    owed.set(participant.group_member_id, (owed.get(participant.group_member_id) ?? 0) + participant.owed_amount);
  }

  for (const expense of expenses) {
    if (expense.is_deleted) {
      continue;
    }

    if (expense.entry_type === "expense") {
      for (const payer of expense.payer_payload) {
        paid.set(payer.groupMemberId, (paid.get(payer.groupMemberId) ?? 0) + payer.amount);
      }
      continue;
    }

    for (const transfer of expense.settlement_payload ?? []) {
      // Logic: A pays B.
      // A (payer) spends money: totalPaid increases (contribution).
      // B (recipient) receives money: totalPaid decreases (reimbursement).
      // 'Owed' (share of consumption) remains untouched for both.
      paid.set(transfer.fromGroupMemberId, (paid.get(transfer.fromGroupMemberId) ?? 0) + transfer.amount);
      paid.set(transfer.toGroupMemberId, (paid.get(transfer.toGroupMemberId) ?? 0) - transfer.amount);
    }
  }

  const rows: BalanceRow[] = members
    .filter((member) => member.status !== "removed")
    .map((member) => {
      const totalPaid = paid.get(member.id) ?? 0;
      const totalOwed = owed.get(member.id) ?? 0;

      return {
        memberId: member.id,
        memberName: member.name,
        totalPaid,
        totalOwed,
        net: totalPaid - totalOwed
      };
    });

  return {
    rows,
    participantsByExpense
  };
};

export const simplifyDebts = (rows: BalanceRow[]): SettlementSuggestion[] => {
  const debtors = rows
    .filter((row) => row.net < 0)
    .map((row) => ({ ...row, balance: Math.abs(row.net) }))
    .sort((a, b) => b.balance - a.balance);
  const creditors = rows
    .filter((row) => row.net > 0)
    .map((row) => ({ ...row, balance: row.net }))
    .sort((a, b) => b.balance - a.balance);

  const suggestions: SettlementSuggestion[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.balance, creditor.balance);

    if (amount > 0) {
      suggestions.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.memberName,
        toMemberId: creditor.memberId,
        toName: creditor.memberName,
        amount
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance === 0) {
      debtorIndex += 1;
    }

    if (creditor.balance === 0) {
      creditorIndex += 1;
    }
  }

  return suggestions;
};

export const buildPersonalSummary = (rows: BalanceRow[], memberId: string) => {
  const row = rows.find((entry) => entry.memberId === memberId);
  if (!row) {
    return {
      owes: 0,
      owed: 0,
      net: 0
    };
  }

  return {
    owes: row.net < 0 ? Math.abs(row.net) : 0,
    owed: row.net > 0 ? row.net : 0,
    net: row.net
  };
};
