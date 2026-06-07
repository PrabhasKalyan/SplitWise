export type UUID = string;

export type GroupType = "trip" | "home" | "couple" | "other";
export type GroupMemberStatus = "active" | "pending_account_link" | "removed";
export type EntryType = "expense" | "settlement";
export type SplitMethod = "equal" | "unequal" | "percentage" | "shares" | "settlement";
export type SettlementScope = "group" | "global";
export type ParticipantInputType = "amount" | "percentage" | "share" | "equal";

export interface Profile {
  id: UUID;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: UUID;
  name: string;
  type: GroupType;
  created_by: UUID;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: UUID;
  group_id: UUID;
  user_id: UUID | null;
  name: string;
  email: string;
  is_admin: boolean;
  status: GroupMemberStatus;
  join_token: string;
  added_by: UUID;
  created_at: string;
  updated_at: string;
}

export interface PayerInput {
  groupMemberId: UUID;
  amount: number;
}

export interface SettlementTransfer {
  fromGroupMemberId: UUID;
  toGroupMemberId: UUID;
  amount: number;
}

export interface Expense {
  id: UUID;
  group_id: UUID | null;
  entry_type: EntryType;
  settlement_scope: SettlementScope | null;
  title: string;
  description: string;
  expense_date: string;
  total_amount: number;
  split_method: SplitMethod;
  receipt_url: string | null;
  created_by: UUID;
  payer_payload: PayerInput[];
  settlement_payload: SettlementTransfer[] | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseParticipant {
  id: UUID;
  expense_id: UUID;
  group_id: UUID;
  group_member_id: UUID;
  owed_amount: number;
  input_value: number | null;
  input_type: ParticipantInputType | null;
  is_included: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithParticipants extends Expense {
  participants: ExpenseParticipant[];
}

export interface GroupBundle {
  group: Group;
  members: GroupMember[];
  expenses: Expense[];
  participants: ExpenseParticipant[];
}

export interface ChatMessage {
  id: string;
  groupId: UUID;
  senderId: UUID;
  senderName: string;
  content: string;
  imageUrl: string | null;
  sentAt: string;
}

export interface CreateGroupInput {
  name: string;
  type: GroupType;
  members: Array<{ name: string; email: string; isAdmin: boolean }>;
}

export interface CreateExpenseInput {
  groupId: UUID;
  title: string;
  description: string;
  expenseDate: string;
  totalAmount: number;
  splitMethod: Exclude<SplitMethod, "settlement">;
  receiptFile?: File | null;
  payers: PayerInput[];
  participants: Array<{
    groupMemberId: UUID;
    owedAmount: number;
    inputValue: number | null;
    inputType: ParticipantInputType;
    isIncluded: boolean;
  }>;
}

export interface CreateSettlementInput {
  groupId?: UUID;
  createdBy: UUID;
  title: string;
  description: string;
  expenseDate: string;
  transfers: SettlementTransfer[];
  scope: SettlementScope;
}

export interface BalanceRow {
  memberId: UUID;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  net: number;
}

export interface SettlementSuggestion {
  fromMemberId: UUID;
  fromName: string;
  toMemberId: UUID;
  toName: string;
  amount: number;
}
