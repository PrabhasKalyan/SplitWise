import { ReactElement } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAppState } from "../state/AppContext";
import { AppShell } from "./components/AppShell";
import { AuthPage } from "./pages/AuthPage";
import { CreateGroupPage } from "./pages/CreateGroupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExpenseDetailPage } from "./pages/ExpenseDetailPage";
import { AddExpensePage } from "./pages/AddExpensePage";
import { GroupPage } from "./pages/GroupPage";
import { GroupChatPage } from "./pages/GroupChatPage";
import { JoinGroupPage } from "./pages/JoinGroupPage";
import { LandingPage } from "./pages/LandingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { SettlePage } from "./pages/SettlePage";

const LoadingScreen = () => (
  <div className="center-stage">
    <div className="panel panel-ghost">
      <p className="eyebrow">Loading</p>
      <h1>Pulling your balances together...</h1>
    </div>
  </div>
);

const Protected = ({ children }: { children: ReactElement }) => {
  const { user, loading } = useAppState();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return children;
};

export const App = () => {
  const { user } = useAppState();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/join/:token" element={<JoinGroupPage />} />
      <Route
        path="/dashboard"
        element={
          <Protected>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/new"
        element={
          <Protected>
            <AppShell>
              <CreateGroupPage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <Protected>
            <AppShell>
              <GroupPage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/:groupId/chat"
        element={
          <Protected>
            <AppShell>
              <GroupChatPage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/:groupId/expenses/new"
        element={
          <Protected>
            <AppShell>
              <AddExpensePage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/:groupId/expenses/:expenseId"
        element={
          <Protected>
            <AppShell>
              <ExpenseDetailPage />
            </AppShell>
          </Protected>
        }
      />
      <Route
        path="/groups/:groupId/settle"
        element={
          <Protected>
            <AppShell>
              <SettlePage />
            </AppShell>
          </Protected>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
