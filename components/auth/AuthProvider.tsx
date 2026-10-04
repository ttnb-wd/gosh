"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

type SessionUser = { uid: string; email: string | null; emailVerified: boolean; full_name: string | null; role: string };
type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated" | "unverified";
  user: User | null;
  sessionUser: SessionUser | null;
};
const AuthContext = createContext<AuthState>({ status: "loading", user: null, sessionUser: null });
export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null, sessionUser: null });
  const generation = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(() => {
    if (inFlight.current) return inFlight.current;
    const currentGeneration = generation.current;
    const task = (async () => {
      try {
        const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
        const result = await response.json();
        if (generation.current !== currentGeneration) return;
        const user = auth.currentUser;
        const authenticated = response.ok && result.status === "authenticated" && (!user || result.user?.uid === user.uid);
        setState({
          user, sessionUser: authenticated ? result.user : null,
          status: authenticated ? "authenticated" : user && !user.emailVerified ? "unverified" : "unauthenticated",
        });
      } catch {
        if (generation.current === currentGeneration) {
          setState({ user: auth.currentUser, sessionUser: null, status: auth.currentUser && !auth.currentUser.emailVerified ? "unverified" : "unauthenticated" });
        }
      }
    })().finally(() => { if (inFlight.current === task) inFlight.current = null; });
    inFlight.current = task;
    return task;
  }, []);

  useEffect(() => {
    const changed = () => {
      generation.current++;
      inFlight.current = null;
      void refresh();
    };
    const unsubscribe = onIdTokenChanged(auth, changed);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("gosh-auth-changed", changed);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    // Recheck expiry without silently renewing a server session.
    const timer = window.setInterval(visible, 60_000);
    return () => {
      generation.current++;
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("gosh-auth-changed", changed);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
