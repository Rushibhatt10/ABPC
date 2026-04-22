import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInAnonymously, signInWithPopup, signOut } from "firebase/auth";
import { firebaseAuth, googleProvider } from "../firebase/auth";
import { AUTH_PROFILES, isEmployeeRole, PRICING_ADMIN_NAMES } from "../constants/authProfiles";
import { upsertUserDoc } from "../utils/firestoreHelpers";

const AuthContext = createContext(null);
const SESSION_KEY = "abpc_EMPLOYEE_session";

const ALLOWED_ADMIN_EMAILS = new Set([
  "ankbhatt8004@gmail.com",
  "abpestcontrol8@gmail.com",
  "bhattakanksha029@gmail.com",
]);

const ADMIN_PROFILES = AUTH_PROFILES.filter((p) => !isEmployeeRole(p.key)).map((p) => ({
  ...p,
  role: "admin",
  EMPLOYEEName: p.name,
}));

const EMPLOYEE_PROFILES = AUTH_PROFILES.filter((p) => isEmployeeRole(p.key)).map((p) => ({
  ...p,
  role: "EMPLOYEE",
  EMPLOYEEName: p.EmployeeTag || p.name,
}));

function getSavedEMPLOYEEKey() {
  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved).key || null;
  } catch {
    // ignore malformed storage
  }
  return null;
}

const toAccessRole = (appProfile) => {
  if (!appProfile) return "viewer";
  return appProfile.role === "admin" ? "admin" : "field_technician";
};

const buildSyncedProfile = (firebaseUser, appProfile) => ({
  uid: firebaseUser.uid,
  authProvider: firebaseUser.isAnonymous ? "anonymous" : "google",
  email: firebaseUser.email || "",
  name: appProfile.name || "",
  employeeTag: appProfile.EmployeeTag || "",
  role: toAccessRole(appProfile),
  roleName: appProfile.roleName || "",
});

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const pendingEMPLOYEEKeyRef = useRef(getSavedEMPLOYEEKey());

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        const email = firebaseUser.email.toLowerCase();
        if (ALLOWED_ADMIN_EMAILS.has(email)) {
          const adminProfile = ADMIN_PROFILES.find((p) => p.email.toLowerCase() === email);
          if (adminProfile) {
            const syncedProfile = { ...adminProfile, uid: firebaseUser.uid };
            localStorage.removeItem(SESSION_KEY);
            pendingEMPLOYEEKeyRef.current = null;
            await upsertUserDoc(firebaseUser.uid, buildSyncedProfile(firebaseUser, syncedProfile));
            setProfile(syncedProfile);
            setLoading(false);
            return;
          }
        }

        await signOut(firebaseAuth);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (firebaseUser && !firebaseUser.email) {
        const key = pendingEMPLOYEEKeyRef.current;
        if (key) {
          const employeeProfile = EMPLOYEE_PROFILES.find((p) => p.key === key);
          if (employeeProfile) {
            const syncedProfile = { ...employeeProfile, uid: firebaseUser.uid };
            await upsertUserDoc(firebaseUser.uid, buildSyncedProfile(firebaseUser, syncedProfile));
            setProfile(syncedProfile);
            setLoading(false);
            return;
          }
        }

        setProfile(null);
        setLoading(false);
        return;
      }

      const key = pendingEMPLOYEEKeyRef.current;
      if (!key) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await signInAnonymously(firebaseAuth);
      } catch {
        pendingEMPLOYEEKeyRef.current = null;
        localStorage.removeItem(SESSION_KEY);
        setProfile(null);
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  const loginAdmin = useCallback(async () => {
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    const email = result.user.email?.toLowerCase();
    if (!ALLOWED_ADMIN_EMAILS.has(email)) {
      await signOut(firebaseAuth);
      throw new Error("This Google account is not authorized as an admin.");
    }
  }, []);

  const loginEMPLOYEE = useCallback(async (key) => {
    const employee = EMPLOYEE_PROFILES.find((p) => p.key === key);
    if (!employee) throw new Error("EMPLOYEE not found.");

    pendingEMPLOYEEKeyRef.current = key;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ key }));

    if (firebaseAuth.currentUser && !firebaseAuth.currentUser.email) {
      const syncedProfile = { ...employee, uid: firebaseAuth.currentUser.uid };
      await upsertUserDoc(firebaseAuth.currentUser.uid, buildSyncedProfile(firebaseAuth.currentUser, syncedProfile));
      setProfile(syncedProfile);
      return;
    }

    if (!firebaseAuth.currentUser) {
      await signInAnonymously(firebaseAuth);
      return;
    }

    await signOut(firebaseAuth);
    await signInAnonymously(firebaseAuth);
  }, []);

  const loginEmployee = loginEMPLOYEE;
  const login = useCallback(async (keyOrEmail, password) => {
    const employee = EMPLOYEE_PROFILES.find((p) => p.key === keyOrEmail && p.password === password);
    if (employee) {
      await loginEMPLOYEE(employee.key);
      return;
    }
    await loginAdmin();
  }, [loginAdmin, loginEMPLOYEE]);

  const logout = useCallback(async () => {
    pendingEMPLOYEEKeyRef.current = null;
    localStorage.removeItem(SESSION_KEY);
    setProfile(null);
    try {
      await signOut(firebaseAuth);
    } catch {
      // ignore logout cleanup failures
    }
  }, []);

  const value = useMemo(() => ({
    isAuthenticated: !!profile,
    profile,
    loading,
    isEMPLOYEE: profile?.role === "EMPLOYEE",
    isEmployee: profile?.role === "EMPLOYEE",
    isAdmin: profile?.role === "admin",
    isPricingAdmin: PRICING_ADMIN_NAMES.has(String(profile?.name || "")),
    login,
    loginAdmin,
    loginEMPLOYEE,
    loginEmployee,
    logout,
  }), [profile, loading, login, loginAdmin, loginEMPLOYEE, loginEmployee, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
