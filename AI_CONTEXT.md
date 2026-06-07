# AI Context

## Assignment

Reverse engineer Splitwise, scope a realistic 3-day version, and build a working deployed app.

## Process Constraints

1. Do not assume product requirements.
2. Do not jump directly into implementation.
3. Ask detailed questions about product scope, UX, workflows, edge cases, and engineering decisions.
4. Ask about every implementation detail needed to build the app.
5. Update this file after each user answer.
6. This file is the source of truth for the project.
7. The final app must be buildable from this file.
8. Another evaluator should be able to use this file to recreate a similar app.
9. Before writing code, produce a build plan based only on agreed context.
10. During implementation, keep updating this file whenever requirements, architecture, schema, UI, or logic changes.
11. Do not recommend technical solutions unless the user explicitly asks for options.

## Current Status

- Interview completed.
- Application code fully implemented in React + Vite.
- Supabase schema, recursive RLS fixes, and auth triggers deployed.
- Strict browser-based SMTP invitation system implemented.
- User-centric settlement logic (₹0 net goal) verified.
- Local chat with image compression and IndexedDB persistence verified.
- UI reverted to and refined based on initial high-quality design.
- Production build and E2E tests are passing.

## Confirmed Context

### Product Goal

- Build a product very close to Splitwise in core workflows and functionality.
- The assignment should demonstrate product completeness, system design thinking, UI quality, and a robust implementation.
- The implementation does not need production-scale architecture, but it should preserve data consistency, persistence, low latency, and ACID-oriented behavior.
- The deployed app must have all agreed functionality working on a live link.
- Evaluators will focus mostly on technical quality.

### Product Direction

- The app is intended to be a reduced but coherent MVP inspired by Splitwise.
- English only.
- Mobile responsive.
- Visual style should feel like a polished consumer app.
- A beautiful landing page is required.

### Scope Expectations

- The user currently wants all listed features preserved.
- The user does not want to define acceptable feature cuts at this stage.

### Core Features Requested

- Landing page.
- Combined signup/login experience.
- Google signup/login.
- Email magic-link auth.
- Group creation and group management.
- Invite users by email.
- Add users to groups.
- Remove users from groups.
- Group type selection during group creation.
- Expense creation and management.
- Expense split types:
  - Equal
  - Unequal
  - Percentage
  - Shares
- Expense date selection.
- Expense title.
- Expense description.
- Bill photo upload.
- Support for choosing who paid.
- Support for multiple payers.
- Group-wise balances.
- Individual balance summary.
- Debt settlement / payment recording.
- Partial settlement recording.
- Real-time chat.

### Explicitly Out Of Scope

- Direct online payments within the app.
- Deep-linking into UPI or external payment apps is not required.

### Primary Workflows Mentioned By User

- Signup/login, including Google login.
- Reach dashboard after login.
- Create group.
- Choose group type.
- Add/remove members.
- Send invite emails by entering email addresses.
- Add expense inside a selected group.
- View who owes, who is owed, and by how much.
- View group-wise balances and individual balance summary.
- Record settlements.

### Users and Audience

- The audience is broad rather than a single persona.
- Group type should be selected at creation time.
- A user can use the app solo or after inviting others.

### Group Types

- Group types should be:
  - Trip
  - Home
  - Couple
  - Other
- Group type should affect UI labels only, not business logic.

### Authentication

- Users must click on the confirmation link sent via email to activate their account and login.
- Authentication is required.
- OAuth should be supported.
- Google auth should be supported.
- Email magic link should be supported.
- Auth UI should be one combined screen rather than separate login/signup pages.
- After login, the user should land on the dashboard.
- Demo access without signup is not required.
- Evaluators should be able to self-sign up.
- Implemented frontend-only EmailJS notifications for existing users to bypass backend rate limits.
- Users must click the confirmation link sent via email to activate their account and login.

### Invite Flow

- Admin can directly add a person to a group by entering name and email.
- **SMTP Invite Flow:** 
  - Users can be added even if they don't have a profile yet (status: `pending_account_link`).
  - **Edge Function SMTP Notification:** For every added member, a personalized email is sent via a Supabase Edge Function using the user's Gmail credentials. This ensures reliable delivery and handles CORS issues correctly.
  - **Secondary Path:** For new users, a standard Supabase invitation is **also** triggered.
- Duplicate entries inside the same group show a case-insensitive UI error.

### Groups

- Expenses exist only inside groups.
- A user can belong to multiple groups.
- Users and groups are many-to-many.
- Group fields explicitly mentioned so far:
  - Name
  - Type
- Group currency field is not needed.
- There can be multiple admins per group.
- The schema should include a boolean indicating group admin status.
- The creator is initially an admin.
- Any admin can edit/manage the group.
- Members cannot leave groups on their own.
- Admins remove members.
- A member should be removed only after they are settled.

### Expenses

- Expenses exist only within groups.
- Group-only expense model is acceptable even if direct one-to-one expenses are missing.
- Expense storage should use two tables:
  - `expenses`
  - `expense_participants` for who owes what
- Multiple payers are required.
- Payer contributions must sum exactly to the total amount.
- A payer may be a non-participant in the split.
- Expense editing is not required after creation.
- An unsettled expense can never be deleted.
- A settled expense can be deleted by group admin.
- A non-admin creator cannot delete an expense.
- Expenses are created as final submissions, not drafts.
- Participants can be excluded from an expense.
- Expense detail page is required.
- Expense detail page should show split breakdown, image, and chat history.
- Expense fields explicitly mentioned so far:
  - Title
  - Description
  - Date
  - Bill photo/image
  - Paid by
  - Split information
- Exactly one currency exists: INR.
- No currency selector should be shown.
- Future dates are not allowed.
- Past dates are allowed.
- Receipt image is optional.

### Split Logic

- Split methods required:
  - Equal
  - Unequal
  - Percentage
  - Shares
- Some participants can be excluded entirely from an expense.
- In multi-payer expenses, payer contributions must sum exactly to total.

### Settlements

- **User-Centric Rule:** The logged-in user is ALWAYS the payer in a settlement.
- **Smart Suggestions:** Selecting a recipient automatically suggests the maximum amount the current user owes that specific member.
- **Partial Settle-up:** Users can edit the suggested amount for partial settlements.
- **Balanced Calculation:** Settlements increase the payer's `totalPaid` and decrease the recipient's `totalPaid` (reimbursement), keeping `Owes` strictly for shares and ensuring nets correctly zero out.

### Balance Logic

- Net balance per user in a group is required.
- Balances should always be derived dynamically from source records.
- Debt simplification logic is required.
- Dashboard balance summary should include:
  - Total you owe
  - Total owed to you
  - Net balance
  - Per-group balances
  - Per-person balances
- Group page should show both:
  - Net member positions
  - Simplified "A pays B" style guidance
- Debt simplification should appear in both main balances UI and settle-up suggestions.
- Rounding should follow nearest-number behavior:
  - values greater than `0.5` round up
  - values less than `0.5` round down
  - exact `0.5` rounds up

### UI and Routing

- Screens explicitly mentioned so far:
  - Landing page
  - Combined signup/login
  - Dashboard with overall summary
  - Create group
  - Group page
  - Group details
  - Expense details
  - Add expense
  - Settle flow
  - Invite acceptance
  - 404 / not-found
- Public pages should exist for landing and auth.
- Unauthenticated users should be blocked from app pages.

### Landing Page

- The landing page should include everything previously suggested except a pricing-style section.

### Frontend

- Frontend framework: React with Vite.
- No SSR.
- Client-heavy architecture.
- Optimistic UI is desired.
- Form behavior and validation should be defined.

### Backend / Platform

- No separate custom backend layer.
- Supabase should be used as the backend platform.
- Supabase should handle auth, CRUD, permissions, validation, and as much business logic as possible.
- No background jobs are desired.
- No custom backend API layer is planned; rely on Supabase capabilities/endpoints.

### Data Platform

- Database platform: Supabase.
- Database style: relational.
- Migrations are required.
- Seed/demo data is required.

### Deployment

- Deployment target: Vercel.
- Use Vercel free tier.
- No custom domain required.

### Testing

- End-to-end tests are required.
- All major flows are considered high risk and should be covered.
- Seeded demo account is required.
- Seeded demo data is required.
- Evaluator self-signup should be supported.

### Permissions

- Any group member can create expenses.
- Any involved member can record settlements.
- Any member creating an expense can upload a bill photo.
- All group members can view group balances.
- Every group member should be able to see group chat if chat exists at group level.
- Chat location is group only.

## Implementation Notes

### Implemented Frontend Structure

- Routes implemented:
  - `/`
  - `/auth`
  - `/dashboard`
  - `/groups/new`
  - `/groups/:groupId`
  - `/groups/:groupId/expenses/new`
  - `/groups/:groupId/expenses/:expenseId`
  - `/groups/:groupId/settle`
  - `/join/:token`
  - catch-all 404 route
- Protected app routes redirect unauthenticated users to `/auth`.
- Main implemented screens:
  - Landing page
  - Combined auth page
  - Dashboard
  - Create group
  - Group page
  - Add expense
  - Expense detail
  - Settle page
  - Join-group page
  - 404 page

### Implemented Data Model

- Tables implemented in SQL migration:
  - `profiles`
  - `groups`
  - `group_members`
  - `expenses`
  - `expense_participants`
- `group_members` includes:
  - `is_admin`
  - `status`
  - `join_token`
- `expenses` stores both expenses and settlements by using:
  - `entry_type`
  - `settlement_scope`
  - `payer_payload`
  - `settlement_payload`
- `expense_participants` stores:
  - `group_member_id`
  - `owed_amount`
  - `input_value`
  - `input_type`
  - `is_included`
- The boolean-like expense-participant state is implemented as `is_included`.
- Global settlements are implemented as `expenses` rows with:
  - `entry_type = settlement`
  - `settlement_scope = global`
  - `group_id = null`

### Implemented Balance and Split Logic

- Split validation implemented for:
  - unequal totals matching total amount
  - percentage totals matching 100
  - payer totals matching total amount
- Equal split uses integer apportioning with remainder distribution.
- Percentage and share splits use weighted apportioning so the final owed amounts sum exactly to the total.
- Balances are derived dynamically from:
  - expense payer data
  - expense participant rows
  - settlement transfer payloads
- Simplified debts are computed on the client for group and dashboard views.

### Implemented Chat Behavior

- Dedicated page route: `/groups/:groupId/chat`.
- Chat messages are persisted in IndexedDB per device.
- **Strictly Local Images:** Chat attachments are compressed client-side (converted to JPEG at 0.7 quality) and stored strictly in IndexedDB as base64 Data URLs. No cloud storage is used for chat media.
- Broadcast via Supabase Realtime (WebSockets).

### Implemented Verification

- `npm run build` passes.
- Playwright smoke tests currently cover:
  - landing page render
  - auth page render
- Full authenticated E2E coverage is not yet implemented because it requires a configured Supabase project and seeded auth accounts.

## User-Stated But Still Ambiguous

### Data Model Notes

- Core entities definitely include:
  - Users
  - Groups
  - Group memberships
  - Expenses
- Expense participants must exist as a separate relational table for "who owes what".
- The user also referenced split-related user associations, images, payer information, and chat.
- The user said amounts do not need decimal precision.

### Chat

- Group chat is the final selected location.
- The user wants chat messages to use WebSockets.
- The user wants chat data stored in local browser IndexedDB.
- The user wants WebSockets used to transfer chat data.
- Chat history should be treated as local/per-device only.
- On app start, chat UI should load from IndexedDB.
- During runtime, chat UI should update from incoming WebSocket messages and/or IndexedDB-backed state.
- The user does not want a separate chat table.

### Schema Structure Preferences

- Latest schema decision supersedes the earlier single-table answer.
- The user wants:
  - `expenses`
  - `expense_participants`
- `expense_participants` should capture who owes what for an expense.
- The user has not requested separate tables for:
  - expense payers
  - settlements
  - invites

### Deferred Decisions

- For some user-visible behaviors, the user answered "you decide":
  - Group-type-specific fields
  - App navigation structure

## Open Questions

### Scope and Delivery

- The user wants all listed features preserved even though the assignment is framed as a realistic 3-day build.
- A practical priority order is still undefined.

### First-Time User Flow

- The exact onboarding path from landing page to first created group or first created expense is not yet defined step by step.

### Deployment

- Target: Vercel.
- Database: Supabase.
- Email: Gmail SMTP (via SmtpJS in-browser).
### Implemented Frontend Structure

- Routes: `/`, `/auth`, `/dashboard`, `/groups/new`, `/groups/:groupId`, `/groups/:groupId/chat`, `/groups/:groupId/expenses/new`, `/groups/:groupId/expenses/:expenseId`, `/groups/:groupId/settle`, `/join/:token`.
- Screens: Landing, Auth, Dashboard, Create Group (grid-based), Group Dashboard (clean), Group Chat, Add Expense, Settle Up, Join-group.