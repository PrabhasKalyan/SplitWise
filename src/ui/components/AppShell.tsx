import { NavLink } from "react-router-dom";
import { PropsWithChildren } from "react";
import { useAppState } from "../../state/AppContext";
import { isSupabaseConfigured } from "../../lib/supabase";

export const AppShell = ({ children }: PropsWithChildren) => {
  const { profile, signOut, isConfigured } = useAppState();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <NavLink to="/dashboard" className="brand">
            Fairshare
          </NavLink>
          <p className="topbar-copy">Groups, balances, and settle-up flows in one place.</p>
        </div>
        <nav className="topnav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/groups/new">Create group</NavLink>
          <button type="button" className="button button-secondary" onClick={() => void signOut()}>
            Sign out
          </button>
        </nav>
      </header>

      {!isSupabaseConfigured ? (
        <div className="banner">
          Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to run the full app against Supabase.
        </div>
      ) : null}

      <main className="page-shell">
        <aside className="sidebar panel">
          <p className="eyebrow">Signed in</p>
          <h3>{profile?.full_name ?? "Account"}</h3>
          <p>{profile?.email ?? "No email loaded"}</p>
          <div className="sidebar-links">
            <NavLink to="/dashboard">Overview</NavLink>
            <NavLink to="/groups/new">New group</NavLink>
          </div>
        </aside>
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
};
