# Fairshare - Shared Expense MVP

Fairshare is a Splitwise-inspired shared-expense application built for groups, balances, and real-time collaboration. It allows users to track bills, manage group memberships, and settle debts with a focus on privacy and a polished consumer-grade experience.

## 🚀 Key Features

- **Consolidated Auth:** Single sign-in experience using Google OAuth and email magic links.
- **Group Management:** Create and manage groups (Trip, Home, Couple, Other) with multi-payer support.
- **Strict User-Centric Settlements:** Logged-in users record their own payments, with smart amount suggestions based on simplified debt logic.
- **Real-time Group Chat:** Dedicated chat page using WebSockets for instant messaging.
- **Local-First Privacy:** Chat history and images are stored strictly in your browser's **IndexedDB**.
- **Custom Invitations:** Personalized emails sent directly from the browser via Gmail SMTP.
- **Receipt Management:** Upload and view receipt images for any expense.

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite, TypeScript
- **Backend/Auth:** Supabase
- **Database:** PostgreSQL (with triggers for auto-profile creation)
- **Local Storage:** IndexedDB (via custom wrapper)
- **Email:** SmtpJS (Secure POST) + Gmail SMTP
- **Testing:** Playwright E2E

## 🏁 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A Supabase project
- A Google Cloud Console project (for OAuth)

### 2. Environment Variables
Create a `.env` file in the root directory and add the following:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Gmail SMTP for Invitations
# Password must be an App Password if using 2FA
SMTP_USER=your-email@gmail.com
SMTP_PASS="your-app-password"

# Google OAuth (Optional for local dev, required for Supabase)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Database Setup
Run the SQL migrations found in `supabase/migrations/` in your Supabase SQL Editor in the following order:
1. `20260605_initial_schema.sql`
2. `20260606_auth_triggers.sql` (Auto-profile creation)
3. `20260606_fix_rls_recursion.sql` (Security fixes)
4. `20260606_enforce_unique_emails.sql` (Uniqueness constraint)
5. `20260606_fix_creation_rls.sql` (Group creation fix)

### 4. Installation & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run E2E tests
npx playwright test
```

## 📦 Deployment

### Supabase Edge Functions (Optional)
While the app uses browser-based SMTP by default to avoid rate limits, a fallback Edge Function is available:
```bash
supabase functions deploy send-group-invite --no-verify-jwt
supabase secrets set SMTP_USER=your-email@gmail.com SMTP_PASS="your-password"
```

### Vercel
Connect your GitHub repository to Vercel and import the environment variables from your `.env` file. Vercel will automatically detect the Vite build settings.

## 📄 Documentation
For deep-dive details on architecture and implementation decisions, see:
- [AI_CONTEXT.md](./AI_CONTEXT.md)
- [BUILD_PLAN.md](./BUILD_PLAN.md)
