# Build Plan

This plan is derived from [AI_CONTEXT.md](/Users/prabhaskalyan/splitwise/AI_CONTEXT.md:1). It is the pre-implementation plan for a 3-day Splitwise-inspired MVP with the exact constraints and product choices agreed during the interview.

## 1. Product Research

### How Splitwise Was Studied

- Reviewed Splitwise's official marketing site to understand its product positioning and feature surface.
- Reviewed Splitwise help articles for the core product loop, group creation, balance behavior, simplify-debts logic, member removal, and group deletion.
- Cross-checked those findings against the user interview to separate "actual Splitwise behavior" from "assignment-specific requirements".

### Official Sources Used

- Splitwise homepage: https://www.splitwise.com/
- How Splitwise works: https://feedback.splitwise.com/knowledgebase/articles/1088920-how-do-i-use-splitwise
- Group creation: https://feedback.splitwise.com/knowledgebase/articles/321623-how-do-i-create-a-group
- Balance behavior and simplify debts: https://feedback.splitwise.com/knowledgebase/articles/425486-help-my-balances-are-wrong
- Simplify debts details: https://feedback.splitwise.com/knowledgebase/articles/107220-what-does-the-simplify-debts-setting-do
- Removing a member from a group: https://feedback.splitwise.com/knowledgebase/articles/177468-how-do-i-remove-a-person-from-a-group
- Group deletion: https://feedback.splitwise.com/knowledgebase/articles/77192-how-do-i-delete-a-group
- Permissions in Splitwise: https://feedback.splitwise.com/knowledgebase/articles/264547-can-i-set-a-group-admin-or-set-different-permis

### What Was Learned

- Splitwise's core loop is sign up, create a group, add members, add expenses, inspect balances, then settle up.
- Core expense inputs are total amount, who paid, who owes, optional notes, optional receipt, and date overrides.
- Simplify Debts reduces payment hops without changing each person's total net owed.
- This project uses a custom admin model for group management and member removal.

### Workflows Identified

- Auth: sign in with Google or magic link, then land on dashboard.
- Group setup: create a group, choose a type, add members by name/email.
- Group membership: add users to a group, including users who have not yet signed up.
- Expense entry: multi-payer group expenses with equal, unequal, percentage, or share-based splitting.
- Balance review: per-group balances, overall totals, and simplified settle-up guidance.
- Settlement recording: user-centric recording of payments between members.
- Chat: local/per-device group chat with WebSocket transport and IndexedDB persistence.

### Product Assumptions Made

- MVP focus: group-only expenses are supported.
- Receipt upload is optional and limited to one image per expense.
- Chat is local-first, treating history as a per-device convenience.
- Settlements are recorded as a special entry type within the expense data model.
- Payer contributions are captured directly in the primary expense record.

## 2. Architecture

### Tech Stack

- Frontend: React + Vite
- Backend/Auth/Database: Supabase
- Local Storage: IndexedDB (Chat history and images)
- Email Delivery: Custom Gmail SMTP via Supabase Edge Function
- Testing: Playwright E2E

### Database Schema

#### `profiles`
- `id`, `email`, `full_name`, `avatar_url`.
- Automatic creation via PostgreSQL trigger `on_auth_user_created`.

#### `groups`
- `id`, `name`, `type`, `created_by`.

#### `group_members`
- `id`, `group_id`, `user_id` (nullable), `name`, `email`, `is_admin`, `status` (`active`, `pending_account_link`, `removed`).
- Security integrity maintained via security-definer helper functions to avoid recursive RLS.

#### `expenses`
- `id`, `group_id`, `entry_type` (`expense`, `settlement`), `total_amount`, `split_method`, `payer_payload`, `settlement_payload`.

#### `expense_participants`
- `id`, `expense_id`, `group_member_id`, `owed_amount`, `is_included`.

### Settlement Logic

- **User-Centric Enforcement:** The logged-in user is ALWAYS the payer in any recorded settlement.
- **Smart suggestions:** Recipient selection automatically populates the amount with the user's current debt to that member.
- **Partial Payments:** Users can manually override suggested amounts for partial settle-ups.
- **Balance Math:** Settlements increase payer `totalPaid` and decrease recipient `totalPaid` (reimbursement) to reach a ₹0 net standing.

### API Design

- Direct Supabase table interactions for CRUD.
- **Email Notifications:** Custom notifications are sent via a **Supabase Edge Function** using the user's Gmail SMTP configuration. This handles cross-origin issues and ensures reliable delivery.
- **Hybrid Flow:** New users receive a custom Gmail notification plus a secondary Supabase invitation link.

### Realtime / Chat

- **WebSocket Transport:** Group chat delivery via Supabase Realtime broadcast channels.
- **Strict Local Storage:** Messages AND images are written strictly to **IndexedDB**.
- **Image Compression:** Attachments are compressed and converted to JPEG client-side before base64 encoding to ensure reliable local storage and delivery.

### Frontend Structure

- Dedicated route architecture: `/dashboard`, `/groups/:id`, `/groups/:id/chat`, etc.
- UI focused on high-quality consumer-grade experience with refined spacing and visibility.

### Deployment Approach

- Frontend: Vercel.
- Database/Auth: Supabase.
- Config: Environment variables for Supabase and SMTP credentials.

## 3. AI Collaboration Process

### How The AI Was Instructed

- Instructed to treat `AI_CONTEXT.md` as the source of truth and update it continuously.
- Required to ask detailed discovery questions before making implementation assumptions.
- Guided to maintain 100% compliance with product requirements defined in foundational MD files.

### What Questions The AI Asked

- Discovery on admin models, schema normalization, and chat persistence strategies.
- Clarifications on settlement permissions and invitation flows.
- Technical decisions regarding SMTP delivery methods and rate-limit avoidance.

### How The User Answered

- Pushed for feature richness within a 3-day MVP scope.
- Constrained architecture to Supabase, single-currency INR, and local-only chat.
- Refined the invite flow to prioritize Gmail SMTP delivery.

### How The Plan Evolved

- Transitioned from Edge Functions to Browser SMTP to ensure instant delivery.
- Refined settlement logic from "any member" to "user as payer" for better privacy.
- Adjusted chat storage to handle large images via local compression and IndexedDB.

### How AI_CONTEXT.md Was Maintained

- Updated after every major requirement change or logic refinement.
- Used as the primary reference for all feature implementations.

## 4. Tradeoffs

### What Was Simplified

- Single currency (INR) and no decimal precision for amounts.
- Group-only expense model (no 1-to-1 friend expenses).
- No expense editing after creation.

### What Was Hardcoded

- Supported group types and currency symbols.
- Nearest-number rounding logic.

### What Was Avoided

- No custom backend server layer.
- No shared cloud storage for chat media (strictly local).
- No multi-currency or automated currency conversion.
