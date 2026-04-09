import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { firebaseAuth } from "../firebase/auth";
import { AUTH_PROFILES, isWorkerRole, PRICING_ADMIN_NAMES } from "../constants/authProfiles";

const AuthContext = createContext(null);
const AUTH_SESSION_KEY = "abpc_simple_session";

const PROFILES = AUTH_PROFILES.map((profile) => ({
  ...profile,
  role: isWorkerRole(profile.key) ? "worker" : "admin",
  workerName: profile.workerTag || profile.name,
}));

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTH_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = PROFILES.find((p) => p.key === parsed.key) || null;
        if (match) setProfile(match);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Give Firebase 3s max — if anonymous auth is disabled, we still proceed
    const timer = setTimeout(() => {
      if (!cancelled) setFirebaseReady(true);
    }, 3000);

    const ensureFirebaseSession = async () => {
      try {
        if (!firebaseAuth.currentUser) {
          await signInAnonymously(firebaseAuth);
        }
      } catch {
        // anonymous auth not enabled in Firebase console — app still works
        // Firestore reads/writes will use security rules without auth
      } finally {
        clearTimeout(timer);
        if (!cancelled) setFirebaseReady(true);
      }
    };
    ensureFirebaseSession();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [firebaseReady]);

  const login = async (roleKey, password) => {
    const match = PROFILES.find((p) => p.key === roleKey && p.password === password) || null;
    if (!match) throw new Error("Invalid credentials");
    setProfile(match);
    localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ key: match.key }));
  };

  const loginAsRole = async (roleKey, password) => login(roleKey, password);

  const logout = () => {
    setProfile(null);
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch { /* ignore */ }
  };

  const value = useMemo(
    () => ({
      isAuthenticated: !!profile,
      profile,
      loading,
      isWorker: profile?.role === "worker",
      isAdmin: profile?.role === "admin",
      isPricingAdmin: PRICING_ADMIN_NAMES.has(String(profile?.name || "")),
      login,
      loginAsRole,
      logout,
    }),
    [profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
