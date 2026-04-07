import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AUTH_PROFILES, getProfileByKey, isWorkerRole } from "../constants/authProfiles";

const AuthContext = createContext(null);
const AUTH_SESSION_KEY = "abpc_simple_session";

const PROFILES = AUTH_PROFILES.map((profile) => ({
  ...profile,
  role: isWorkerRole(profile.key) ? "worker" : "admin",
}));

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(AUTH_SESSION_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const match = PROFILES.find((p) => p.key === parsed.key);
        if (match) setProfile(match);
      } catch (e) {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = (roleKey, password) => {
    const match = PROFILES.find((p) => p.key === roleKey && p.password === password);
    if (match) {
      setProfile(match);
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ key: match.key }));
      return true;
    }
    throw new Error("Invalid password");
  };

  const loginAsRole = async (roleKey, password) => login(roleKey, password);

  const logout = () => {
    setProfile(null);
    localStorage.removeItem(AUTH_SESSION_KEY);
  };

  const value = useMemo(
    () => ({
      isAuthenticated: !!profile,
      profile,
      loading,
      isWorker: profile?.role === "worker",
      login,
      loginAsRole,
      logout,
    }),
    [profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
