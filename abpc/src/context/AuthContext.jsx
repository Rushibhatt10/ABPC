import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { firebaseAuth, googleProvider } from "../firebase/auth";
import { AUTH_PROFILES, isEmployeeRole, PRICING_ADMIN_NAMES } from "../constants/authProfiles";

const AuthContext = createContext(null);
const SESSION_KEY = "abpc_worker_session";

const ALLOWED_ADMIN_EMAILS = new Set([
  "ankbhatt8004@gmail.com",
  "abpestcontrol8@gmail.com",
  "bhattakanksha029@gmail.com",
]);

const ADMIN_PROFILES = AUTH_PROFILES.filter((p) => !isEmployeeRole(p.key)).map((p) => ({
  ...p, role: "admin", workerName: p.name,
}));

const WORKER_PROFILES = AUTH_PROFILES.filter((p) => isEmployeeRole(p.key)).map((p) => ({
  ...p, role: "worker", workerName: p.EmployeeTag || p.name,
}));

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let workerProfile = null;

    // Check for saved worker session first
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (saved) {
        const { key } = JSON.parse(saved);
        const savedProfile = WORKER_PROFILES.find((p) => p.key === key);
        if (savedProfile) {
          workerProfile = savedProfile;
        }
      }
    } catch { /* ignore */ }

    // Firebase auth state listener
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // Real Google user — check if allowed admin
        const email = firebaseUser.email.toLowerCase();
        if (ALLOWED_ADMIN_EMAILS.has(email)) {
          const adminProfile = ADMIN_PROFILES.find((p) => p.email.toLowerCase() === email);
          if (adminProfile) {
            localStorage.removeItem(SESSION_KEY);
            setProfile(adminProfile);
            setLoading(false);
            return;
          }
        }
        // Email not in allowed list — sign out silently
        await signOut(firebaseAuth);
        setProfile(null);
        setLoading(false);
      } else if (firebaseUser && !firebaseUser.email) {
        // Anonymous user — this is a worker session
        if (workerProfile) {
          setProfile(workerProfile);
        }
        setLoading(false);
      } else {
        // No Firebase user at all
        if (workerProfile) {
          // Profile has a saved session but no Firebase anon session — create one
          try {
            await signInAnonymously(firebaseAuth);
          } catch {
            setProfile(null);
            setLoading(false);
          }
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return unsub;
  }, []);

  // Admin: Google Sign-In popup
  const loginAdmin = async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const email = result.user.email?.toLowerCase();
    if (!ALLOWED_ADMIN_EMAILS.has(email)) {
      await signOut(firebaseAuth);
      throw new Error("This Google account is not authorized as an admin.");
    }
    // profile will be set by onAuthStateChanged
  };

  // Worker: local password auth + anonymous Firebase session for Firestore
  const loginWorker = async (key) => {
    const worker = WORKER_PROFILES.find((p) => p.key === key);
    if (!worker) throw new Error("Worker not found.");
    localStorage.setItem(SESSION_KEY, JSON.stringify({ key }));
    if (!firebaseAuth.currentUser) {
      await signInAnonymously(firebaseAuth);
    } else {
      setProfile(worker);
    }
  };


  // Legacy login() for backward compat
  const login = async (keyOrEmail, password) => {
    const worker = WORKER_PROFILES.find((p) => p.key === keyOrEmail && p.password === password);
    if (worker) { await loginWorker(worker.key); return; }
    await loginAdmin();
  };

  const logout = async () => {
    const wasAdmin = profile?.role === "admin";
    setProfile(null);
    localStorage.removeItem(SESSION_KEY);
    try { await signOut(firebaseAuth); } catch { /* ignore */ }
    if (!wasAdmin) {
      // Re-sign in anonymously so Firestore still works if needed
      // Actually just leave it — they're logged out
    }
  };

  const value = useMemo(() => ({
    isAuthenticated: !!profile,
    profile,
    loading,
    isWorker: profile?.role === "worker",
    isAdmin: profile?.role === "admin",
    // Keep isEmployee as alias for backward compat with existing pages
    isEmployee: profile?.role === "worker",
    isPricingAdmin: PRICING_ADMIN_NAMES.has(String(profile?.name || "")),
    login,
    loginAdmin,
    loginWorker,
    // alias for LoginPage
    loginEmployee: loginWorker,
    logout,
  }), [profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
