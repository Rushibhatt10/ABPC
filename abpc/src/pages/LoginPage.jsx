import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Shield, HardHat } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const EMPLOYEE_PASSWORD_MAP = {
  "nakul8004":   "nakul",
  "divyesh8004": "divyesh",
  "sagar8004":   "sagar",
};

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(16px)",
};

export default function LoginPage() {
  const { loginAdmin, loginEmployee, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("admin");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && !loading) navigate("/admin", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B0B0B" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(76,122,45,0.2)", borderTopColor: "#4C7A2D", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>Verifying…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const switchTab = (t) => { setTab(t); setError(""); setPin(""); };

  const handleGoogleSignIn = async () => {
    setError(""); setBusy(true);
    try { await loginAdmin(); }
    catch (err) {
      const msg = err.message || "";
      setError(
        msg.includes("popup-closed") || msg.includes("cancelled") ? "Sign-in cancelled." :
        msg.includes("not authorized") ? "This account is not authorized." :
        "Sign-in failed. Please try again."
      );
    } finally { setBusy(false); }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setError("");
    const key = EMPLOYEE_PASSWORD_MAP[pin.trim()];
    if (!key) { setError("Incorrect PIN. Please try again."); return; }
    setBusy(true);
    try { await loginEmployee(key); }
    catch (err) { setError(err.message || "Login failed."); setBusy(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0B0B", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>

      {/* Background glow */}
      <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(76,122,45,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
          <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", marginBottom: 20, border: "2px solid rgba(76,122,45,0.4)", boxShadow: "0 0 30px rgba(76,122,45,0.25), 0 0 60px rgba(76,122,45,0.1)" }}>
            <img src="/cropped_circle_image.png" alt="AB Pest Control" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <p style={{ fontFamily: '"Bebas Neue", Impact, sans-serif', fontSize: "1.8rem", color: "#8AA844", letterSpacing: "0.06em", lineHeight: 1, margin: 0 }}>
            A.B. PEST CONTROL
          </p>
          <p style={{ fontFamily: 'Montserrat, sans-serif', fontSize: "0.6rem", color: "#E4572E", letterSpacing: "0.4em", marginTop: 4, textTransform: "uppercase" }}>
            INSECTICIDE SERVICES
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 10, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Operating System
          </p>
        </div>

        {/* Card */}
        <div style={{ ...glass, borderRadius: 20, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { key: "admin",    label: "Admin",    Icon: Shield },
              { key: "employee", label: "Employee", Icon: HardHat },
            ].map(({ key, label, Icon }) => (
              <button key={key} onClick={() => switchTab(key)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "14px 0", fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
                  textTransform: "uppercase", border: "none", cursor: "pointer", transition: "all 0.2s",
                  color: tab === key ? "#4C7A2D" : "rgba(255,255,255,0.3)",
                  background: tab === key ? "rgba(76,122,45,0.08)" : "transparent",
                  borderBottom: tab === key ? "2px solid #4C7A2D" : "2px solid transparent",
                }}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div style={{ padding: 28 }}>

            {error && (
              <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171", fontSize: 13, fontWeight: 600 }}>
                {error}
              </div>
            )}

            {/* Admin — Google */}
            {tab === "admin" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                  Admin access is secured via authorized Google accounts only.
                </p>

                <button onClick={handleGoogleSignIn} disabled={busy}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                    padding: "14px 20px", borderRadius: 14, cursor: busy ? "not-allowed" : "pointer",
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "#FFFFFF", fontSize: 14, fontWeight: 700, transition: "all 0.2s",
                    opacity: busy ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.borderColor = "rgba(76,122,45,0.4)"; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}>

                  {/* Google G logo — proper colored version */}
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>

                  {busy ? "Signing in…" : "Continue with Google"}
                </button>
              </div>
            )}

            {/* Employee — PIN */}
            {tab === "employee" && (
              <form onSubmit={handleEmployeeSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                    Employee PIN
                  </label>
                  <input
                    type="password"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    style={{
                      width: "100%", padding: "14px 16px", borderRadius: 14, fontSize: 20,
                      fontWeight: 900, letterSpacing: "0.3em", textAlign: "center",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#FFFFFF", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                    }}
                    onFocus={e => e.target.style.borderColor = "#4C7A2D"}
                    onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
                  />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 8 }}>
                    Each employee has a unique PIN
                  </p>
                </div>

                <button type="submit" disabled={busy || !pin.trim()}
                  style={{
                    width: "100%", padding: "14px 20px", borderRadius: 14, border: "none",
                    background: busy || !pin.trim() ? "rgba(76,122,45,0.3)" : "linear-gradient(135deg, #2F4F2F, #4C7A2D)",
                    color: "#FFFFFF", fontSize: 13, fontWeight: 800, letterSpacing: "0.12em",
                    textTransform: "uppercase", cursor: busy || !pin.trim() ? "not-allowed" : "pointer",
                    boxShadow: busy || !pin.trim() ? "none" : "0 0 20px rgba(76,122,45,0.3)",
                    transition: "all 0.2s",
                  }}>
                  {busy ? "Verifying…" : "Sign In"}
                </button>
              </form>
            )}

          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.15)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 24 }}>
          AB Pest Control © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
