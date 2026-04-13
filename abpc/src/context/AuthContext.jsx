import { createContext, useContext, useEffect, useRef, useMemo, useState } from "react";
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

// Read saved worker key from localStorage
function getSavedWorkerKey() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved).key || null;
  } catch { /* ignore */ }
  return null;
}

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ref always holds the latest pending worker key
  // Used by onAuthStateChanged to resolve the worker profile after anon sign-in
  const pendingWorkerKeyRef = useRef(getSavedWorkerKey());

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        // ── Google admin user ──
        const email = firebaseUser.email.toLowerCase();
        if (ALLOWED_ADMIN_EMAILS.has(email)) {
          const adminProfile = ADMIN_PROFILES.find((p) => p.email.toLowerCase() === email);
          if (adminProfile) {
            localStorage.removeItem(SESSION_KEY);
            pendingWorkerKeyRef.current = null;
            setProfile(adminProfile);
            setLoading(false);
            return;
          }
        }
        // Not an allowed admin — reject
        await signOut(firebaseAuth);
        setProfile(null);
        setLoading(false);

      } else if (firebaseUser && !firebaseUser.email) {
        // ── Anonymous user — resolve worker from ref ──
        const key = pendingWorkerKeyRef.current;
        if (key) {
          const workerProfile = WORKER_PROFILES.find((p) => p.key === key);
          if (workerProfile) {
            setProfile(workerProfile);
            setLoading(false);
            return;
          }
        }
        // Anonymous but no worker key — clear
        setProfile(null);
        setLoading(false);

      } else {
        // ── No Firebase user ──
        const key = pendingWorkerKeyRef.current;
        if (key) {
          // Saved worker session exists — create anonymous Firebase session
          try {
            await signInAnonymously(firebaseAuth);
            // onAuthStateChanged will fire again with the anon user above
          } catch {
            pendingWorkerKeyRef.current = null;
            localStorage.removeItem(SESSION_KEY);
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

  // ── Admin login: Google popup ──
  const loginAdmin = async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const email = result.user.email?.toLowerCase();
    if (!ALLOWED_ADMIN_EMAILS.has(email)) {
      await signOut(firebaseAuth);
      throw new Error("This Google account is not authorized as an admin.");
    }
    // profile set by onAuthStateChanged
  };

  // ── Worker login: save key → anonymous Firebase session ──
  const loginWorker = async (key) => {
    const worker = WORKER_PROFILES.find((p) => p.key === key);
    if (!worker) throw new Error("Worker not found.");

    // Save to ref AND localStorage before triggering Firebase
    pendingWorkerKeyRef.current = key;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ key }));

    if (firebaseAuth.currentUser && !firebaseAuth.currentUser.email) {
      // Already anonymous — just set profile directly
      setProfile(worker);
    } else if (!firebaseAuth.currentUser) {
      // No session — sign in anonymously; onAuthStateChanged will set profile
      await signInAnonymously(firebaseAuth);
    } else {
      // Currently signed in as Google admin — sign out first, then anon
      await signOut(firebaseAuth);
      await signInAnonymously(firebaseAuth);
    }
  };

  // Legacy alias
  const loginEmployee = loginWorker;
  const login = async (keyOrEmail, password) => {
    const worker = WORKER_PROFILES.find((p) => p.key === keyOrEmail && p.password === password);
    if (worker) { await loginWorker(worker.key); return; }
    await loginAdmin();
  };

  const logout = async () => {
    pendingWorkerKeyRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
    try { await signOut(firebaseAuth); } catch { /* ignore */ }
  };

  const value = useMemo(() => ({
    isAuthenticated: !!profile,
    profile,
    loading,
    isWorker: profile?.role === "worker",
    isEmployee: profile?.role === "worker",   // alias used across pages
    isAdmin: profile?.role === "admin",
    isPricingAdmin: PRICING_ADMIN_NAMES.has(String(profile?.name || "")),
    login,
    loginAdmin,
    loginWorker,
    loginEmployee,
    logout,
  }), [profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
