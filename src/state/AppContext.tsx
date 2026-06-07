import { Session, User } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";
import { ensureProfile } from "../lib/db";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { Profile } from "../lib/types";

interface AppState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  dataVersion: number;
  refreshData: () => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      return;
    }

    const initialize = async () => {
      console.log('Initializing AppState...');
      try {
        const { data } = await client.auth.getSession();
        console.log('Session data:', data.session ? 'Present' : 'Absent');
        setSession(data.session);

        if (data.session?.user) {
          const nextProfile = await ensureProfile(data.session.user);
          setProfile(nextProfile);
        }
      } catch (err) {
        console.error('Failed to initialize AppState:', err);
      } finally {
        setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setProfile(null);
        return;
      }

      void ensureProfile(nextSession.user).then(setProfile).catch(console.error);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AppState>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isConfigured: isSupabaseConfigured,
      dataVersion,
      refreshData: () => setDataVersion((value) => value + 1),
      signOut: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
      }
    }),
    [dataVersion, loading, profile, session]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within AppProvider");
  }

  return context;
};
