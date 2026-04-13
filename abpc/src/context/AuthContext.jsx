import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { firebaseAuth, googleProvider } from "../firebase/auth";
import { AUTH_PROFILES, isEmployeeRole, PRICING_ADMIN_NAMES } from "../constants/authProfiles";

const AuthContext = createContext(null);
const SESSION_KEY = "abpc_Employee_session";

// Only these Google accounts are allowed as admins
const ALLOWED_ADMIN_EMAILS = new Set([
  "ankbhatt8004@gmail.com",
  "abpestcontrol8@gmail.com",
  "bhattakanksha029@gmail.com",
]);

const ADMIN_PROFILES = AUTH_PROFILES.filter((p) => !isEmployeeRole(p.key)).map((p) => ({
  ...p, role: "admin", EmployeeName: p.name,
}));

const Employee_PROFILES = AUTH_PROFILES.filter((p) => isEmployeeRole(p.key)).map((p) => ({
  ...p, role: "Employee", EmployeeName: p.EmployeeTag || p.name,
}));

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore Employee session from localStorage on mount
  useEffect(() => {
    const restoreEmployee = async () => {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (saved) {
          const { key } = JSON.parse(saved);
          const match = Employee_PROFILES.find((p) => p.key === key);
          if (match) {
            // Ensure anonymous Firebase session exists for Firestore access
            if (!firebaseAuth.currentUser) {
              await signInAnonymously(firebaseAuth);
            }
            setProfile(match);
          }
        }
      } catch { /* ignore */ }
    };
    restoreEmployee();
  }, []);

  // Firebase auth state — handles admin Google sessions
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser?.email) {
        const email = firebaseUser.email.toLowerCase();
        if (ALLOWED_ADMIN_EMAILS.has(email)) {
          const adminProfile = ADMIN_PROFILES.find(
            (p) => p.email.toLowerCase() === email
          );
          if (adminProfile) {
            setProfile(adminProfile);
            localStorage.removeItem(SESSION_KEY);
          } else {
            // Authenticated with Google but email not mapped — sign out
            signOut(firebaseAuth);
          }
        } else {
          // Not an allowed admin email — reject and sign out
          signOut(firebaseAuth);
          setProfile((prev) => (prev?.role === "admin" ? null : prev));
        }
      } else {
        setProfile((prev) => (prev?.role === "admin" ? null : prev));
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Admin login — Google Sign-In popup
  const loginAdmin = async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const email = result.user.email?.toLowerCase();
    if (!ALLOWED_ADMIN_EMAILS.has(email)) {
      await signOut(firebaseAuth);
      throw new Error("This Google account is not authorized as an admin.");
    }
    // profile set by onAuthStateChanged
  };

  // Employee login — local only, signs in anonymously to Firebase so Firestore rules pass
  const loginEmployee = async (key) => {
    const Employee = Employee_PROFILES.find((p) => p.key === key);
    if (!Employee) throw new Error("Employee not found.");
    // Anonymous Firebase session satisfies `request.auth != null` in Firestore rules
    if (!firebaseAuth.currentUser) {
      await signInAnonymously(firebaseAuth);
    }
    setProfile(Employee);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ key }));
  };

  // Legacy login() kept so any existing callers don't break
  const login = async (keyOrEmail, password) => {
    const Employee = Employee_PROFILES.find((p) => p.key === keyOrEmail && p.password === password);
    if (Employee) { loginEmployee(Employee.key); return; }
    await loginAdmin();
  };

  const logout = async () => {
    const wasAdmin = profile?.role === "admin";
    setProfile(null);
    localStorage.removeItem(SESSION_KEY);
    if (wasAdmin) {
      try { await signOut(firebaseAuth); } catch { /* ignore */ }
    }
  };

  const value = useMemo(() => ({
    isAuthenticated: !!profile,
    profile,
    loading,
    isEmployee: profile?.role === "Employee",
    isAdmin: profile?.role === "admin",
    isPricingAdmin: PRICING_ADMIN_NAMES.has(String(profile?.name || "")),
    login,
    loginAdmin,
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
