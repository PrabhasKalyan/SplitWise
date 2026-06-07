import { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import {
  CreateExpenseInput,
  CreateGroupInput,
  CreateSettlementInput,
  Expense,
  ExpenseParticipant,
  Group,
  GroupBundle,
  GroupMember,
  PayerInput,
  Profile,
  SettlementTransfer
} from "./types";
import { sendExistingUserNotification } from "./emailjs";

const requireSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  return supabase;
};

const readJson = <T,>(value: unknown, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value as T;
};

const mapExpense = (row: any): Expense => ({
  ...row,
  payer_payload: readJson<PayerInput[]>(row.payer_payload, []),
  settlement_payload: readJson<SettlementTransfer[] | null>(row.settlement_payload, null)
});

export const ensureProfile = async (user: User): Promise<Profile> => {
  const client = requireSupabase();
  const payload = {
    id: user.id,
    email: user.email ?? "",
    full_name:
      user.user_metadata.full_name ??
      user.user_metadata.name ??
      user.email?.split("@")[0] ??
      "Anonymous user",
    avatar_url: user.user_metadata.avatar_url ?? null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
};

export const fetchProfileByEmail = async (email: string) => {
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select("*").eq("email", email).maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
};

export const sendGroupInvite = async (
  email: string,
  groupName: string,
  inviterName: string,
  joinToken: string,
  isNewUser: boolean
) => {
  const client = requireSupabase();
  const joinUrl = `${window.location.origin}/join/${joinToken}`;
  const authUrl = `${window.location.origin}/auth`;
  
  // Call the Supabase Edge Function
  try {
    const { error } = await client.functions.invoke("send-group-invite", {
      body: {
        type: "group-invite",
        email,
        groupName,
        inviterName,
        joinUrl,
        authUrl,
        isNewUser
      }
    });

    if (error) {
      console.error("Edge Function error:", error);
    } else {
      console.log(`Custom SMTP email dispatched via Edge Function to ${email}`);
    }
  } catch (err) {
    console.error("Failed to invoke Edge Function:", err);
  }
};

export const sendMagicLink = async (email: string, redirectTo: string) => {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("send-group-invite", {
    body: {
      type: "magic-link",
      email,
      authUrl: redirectTo
    }
  });

  if (error) throw error;
};

export const fetchGroupsForUser = async (userId: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("group_members")
    .select("*, groups(*)")
    .eq("user_id", userId)
    .neq("status", "removed")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => ({
      membership: row as GroupMember,
      group: row.groups as Group
    }))
    .filter((row) => row.group);
};

export const fetchGroupBundle = async (groupId: string): Promise<GroupBundle> => {
  const client = requireSupabase();

  const [{ data: group, error: groupError }, { data: members, error: membersError }, { data: expenses, error: expensesError }, { data: participants, error: participantsError }] =
    await Promise.all([
      client.from("groups").select("*").eq("id", groupId).single(),
      client.from("group_members").select("*").eq("group_id", groupId).order("created_at", { ascending: true }),
      client.from("expenses").select("*").eq("group_id", groupId).eq("is_deleted", false).order("expense_date", { ascending: false }),
      client.from("expense_participants").select("*").eq("group_id", groupId)
    ]);

  if (groupError) throw groupError;
  if (membersError) throw membersError;
  if (expensesError) throw expensesError;
  if (participantsError) throw participantsError;

  // Also fetch global settlements that involve any of these group members
  const memberIds = (members ?? []).map(m => m.id);
  const { data: globalSettlements } = await client
    .from("expenses")
    .select("*")
    .eq("entry_type", "settlement")
    .eq("settlement_scope", "global")
    .eq("is_deleted", false);

  const relevantGlobal = (globalSettlements ?? []).filter(s => 
    s.settlement_payload?.some((t: any) => memberIds.includes(t.fromGroupMemberId) || memberIds.includes(t.toGroupMemberId))
  );

  return {
    group: group as Group,
    members: (members ?? []) as GroupMember[],
    expenses: [...(expenses ?? []).map(mapExpense), ...relevantGlobal.map(mapExpense)],
    participants: (participants ?? []) as ExpenseParticipant[]
  };
};

export const fetchGlobalSettlements = async () => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("expenses")
    .select("*")
    .eq("entry_type", "settlement")
    .eq("settlement_scope", "global")
    .eq("is_deleted", false)
    .order("expense_date", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapExpense);
};

export const createGroup = async (user: User, input: CreateGroupInput) => {
  const client = requireSupabase();
  const timestamp = new Date().toISOString();
  const { data: group, error: groupError } = await client
    .from("groups")
    .insert({
      name: input.name,
      type: input.type,
      created_by: user.id,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select()
    .single();

  if (groupError) {
    throw groupError;
  }

  const creatorName =
    user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Group creator";

  const memberRows: Array<{
    group_id: string;
    user_id: string | null;
    name: string;
    email: string;
    is_admin: boolean;
    status: string;
    join_token: string;
    added_by: string;
    created_at: string;
    updated_at: string;
  }> = [
    {
      group_id: group.id,
      user_id: user.id,
      name: creatorName,
      email: user.email ?? "",
      is_admin: true,
      status: "active",
      join_token: crypto.randomUUID(),
      added_by: user.id,
      created_at: timestamp,
      updated_at: timestamp
    }
  ];

  const inviteTasks: Array<{ email: string; name: string; token: string; isNew: boolean }> = [];
  const processedEmails = new Set<string>([user.email ?? ""]);

  for (const member of input.members) {
    if (!member.email || processedEmails.has(member.email.toLowerCase())) {
      continue;
    }
    
    processedEmails.add(member.email.toLowerCase());

    const existing = await fetchProfileByEmail(member.email);
    const joinToken = crypto.randomUUID();

    memberRows.push({
      group_id: group.id,
      user_id: existing?.id ?? null,
      name: member.name,
      email: member.email,
      is_admin: member.isAdmin,
      status: existing ? "active" : "pending_account_link",
      join_token: joinToken,
      added_by: user.id,
      created_at: timestamp,
      updated_at: timestamp
    });

    inviteTasks.push({ 
      email: member.email, 
      name: member.name, 
      token: joinToken, 
      isNew: !existing 
    });
  }

  const { error: membersError } = await client.from("group_members").insert(memberRows);

  if (membersError) {
    throw membersError;
  }

  // Send invites after successful database insertion
  for (const task of inviteTasks) {
    if (task.isNew) {
      void sendGroupInvite(task.email, group.name, creatorName, task.token, true).catch(console.error);
    } else {
      void sendExistingUserNotification(task.name, group.name, task.email).catch(console.error);
    }
  }

  return group as Group;
};

export const updateGroup = async (groupId: string, payload: Pick<Group, "name" | "type">) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("groups")
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("id", groupId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Group;
};

export const addGroupMember = async (
  groupId: string,
  addedBy: string,
  input: { name: string; email: string; isAdmin: boolean }
) => {
  const client = requireSupabase();
  const { data: existingMembership, error: checkError } = await client
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .ilike("email", input.email)
    .neq("status", "removed")
    .maybeSingle();

  if (checkError) {
    throw checkError;
  }

  if (existingMembership) {
    throw new Error(`The email ${input.email} is already an active member of this group.`);
  }

  const existing = await fetchProfileByEmail(input.email);
  const groupData = await client.from("groups").select("name").eq("id", groupId).single();
  const profileData = await client.from("profiles").select("full_name").eq("id", addedBy).single();

  // User exists, or is new (we allow adding both now)
  const timestamp = new Date().toISOString();
  const { data, error } = await client
    .from("group_members")
    .insert({
      group_id: groupId,
      user_id: existing?.id ?? null,
      name: input.name,
      email: input.email,
      is_admin: input.isAdmin,
      status: existing ? "active" : "pending_account_link",
      join_token: crypto.randomUUID(),
      added_by: addedBy,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Send notifications
  if (existing) {
    // For existing users, use the pure frontend EmailJS method as requested
    void sendExistingUserNotification(
      input.name || existing.full_name,
      groupData.data?.name || "a group",
      input.email
    ).catch(console.error);
  } else {
    // For new users, use the standard invite flow via Edge Function
    void sendGroupInvite(
      input.email, 
      groupData.data?.name || "a group", 
      profileData.data?.full_name || "Someone", 
      data.join_token,
      true
    ).catch(console.error);
  }

  return data as GroupMember;
};


export const removeGroupMember = async (memberId: string) => {
  const client = requireSupabase();
  const { error } = await client
    .from("group_members")
    .update({
      status: "removed",
      updated_at: new Date().toISOString()
    })
    .eq("id", memberId);

  if (error) {
    throw error;
  }
};

export const uploadChatAttachment = async (file: File) => {
  const client = requireSupabase();
  const filePath = `chat/${crypto.randomUUID()}-${file.name}`;
  const { error } = await client.storage.from("receipts").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from("receipts").getPublicUrl(filePath);
  return data.publicUrl;
};

export const uploadReceipt = async (file: File) => {
  const client = requireSupabase();
  const filePath = `receipts/${crypto.randomUUID()}-${file.name}`;
  const { error } = await client.storage.from("receipts").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from("receipts").getPublicUrl(filePath);
  return data.publicUrl;
};

export const createExpense = async (userId: string, input: CreateExpenseInput) => {
  const client = requireSupabase();
  const timestamp = new Date().toISOString();
  const receiptUrl = input.receiptFile ? await uploadReceipt(input.receiptFile) : null;
  const { data: expense, error: expenseError } = await client
    .from("expenses")
    .insert({
      group_id: input.groupId,
      entry_type: "expense",
      settlement_scope: null,
      title: input.title,
      description: input.description,
      expense_date: input.expenseDate,
      total_amount: input.totalAmount,
      split_method: input.splitMethod,
      receipt_url: receiptUrl,
      created_by: userId,
      payer_payload: input.payers,
      settlement_payload: null,
      is_deleted: false,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select()
    .single();

  if (expenseError) {
    throw expenseError;
  }

  const participantRows = input.participants
    .filter((participant) => participant.isIncluded)
    .map((participant) => ({
      expense_id: expense.id,
      group_id: input.groupId,
      group_member_id: participant.groupMemberId,
      owed_amount: participant.owedAmount,
      input_value: participant.inputValue,
      input_type: participant.inputType,
      is_included: participant.isIncluded,
      created_at: timestamp,
      updated_at: timestamp
    }));

  const { error: participantsError } = await client.from("expense_participants").insert(participantRows);

  if (participantsError) {
    throw participantsError;
  }

  return mapExpense(expense);
};

export const recordSettlement = async (input: CreateSettlementInput) => {
  const client = requireSupabase();
  const totalAmount = input.transfers.reduce((sum, transfer) => sum + transfer.amount, 0);
  const timestamp = new Date().toISOString();

  const { data, error } = await client
    .from("expenses")
    .insert({
      group_id: input.scope === "group" ? input.groupId : null,
      entry_type: "settlement",
      settlement_scope: input.scope,
      title: input.title,
      description: input.description,
      expense_date: input.expenseDate,
      total_amount: totalAmount,
      split_method: "settlement",
      receipt_url: null,
      created_by: input.createdBy,
      payer_payload: [],
      settlement_payload: input.transfers,
      is_deleted: false,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapExpense(data);
};

export const deleteExpense = async (expenseId: string) => {
  const client = requireSupabase();
  const { error } = await client
    .from("expenses")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", expenseId);

  if (error) {
    throw error;
  }
};

export const fetchExpenseDetails = async (expenseId: string) => {
  const client = requireSupabase();
  const [{ data: expense, error: expenseError }, { data: participants, error: participantsError }] =
    await Promise.all([
      client.from("expenses").select("*").eq("id", expenseId).single(),
      client.from("expense_participants").select("*").eq("expense_id", expenseId)
    ]);

  if (expenseError) {
    throw expenseError;
  }

  if (participantsError) {
    throw participantsError;
  }

  return {
    expense: mapExpense(expense),
    participants: (participants ?? []) as ExpenseParticipant[]
  };
};

export const linkGroupMembershipByToken = async (token: string, userId: string) => {
  const client = requireSupabase();
  const { data, error } = await client
    .from("group_members")
    .update({
      user_id: userId,
      status: "active",
      updated_at: new Date().toISOString()
    })
    .eq("join_token", token)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GroupMember;
};
