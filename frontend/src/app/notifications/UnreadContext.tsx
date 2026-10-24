// frontend/src/app/notifications/UnreadContext.tsx
//
// Shares the number of unread inbox items with the whole app
// (the bell in the navbar shows it, the inbox updates it).
// Same pattern as LocationContext.
//

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../../supabaseClient";
import { countUnread } from "../../services/inbox";

const POLL_MS = 60_000; // check again every minute

interface UnreadContextValue {
  count: number;
  /** Re-count now, after marking something as read */
  refresh: () => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Follow login / logout
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user?.id ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    setCount(await countUnread(userId));
  }, [userId]);

  // Count right away, then every minute while logged in
  useEffect(() => {
    refresh();
    if (!userId) return;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [userId, refresh]);

  return (
    <UnreadContext.Provider value={{ count, refresh }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error("useUnread must be used inside <UnreadProvider>");
  return ctx;
}
