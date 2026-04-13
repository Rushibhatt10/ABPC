import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, Shield, HardHat } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Employee_PASSWORD_MAP = {
  "nakul123":   "nakul",
  "divyesh123": "divyesh",
  "sagar123":   "sagar",
};

export default function LoginPage() {
  const { loginAdmin, loginEmployee, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d20] to-[#1f7a42]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <div className="text-white text-sm font-medium">Authorizing access...</div>
      </div>
    </div>
  );

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const switchTab = (t) => { 
    setTab(t); 
    setError(""); 
    setPassword("");
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      await loginAdmin();
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("popup-closed") || msg.includes("cancelled") || msg.includes("popup_closed")) {
        setError("Sign-in cancelled.");
      } else if (msg.includes("not authorized")) {
        setError("This Google account is not authorized.");
      } else {
        setError("Sign-in failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };


  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;
    setError("");
    const key = Employee_PASSWORD_MAP[password.trim()];
    if (!key) { setError("Incorrect password."); return; }
    setBusy(true);
    try {
      await loginEmployee(key);
    } catch (err) {
      setError(err.message || "Login failed.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d20] via-[#13562d] to-[#1f7a42] p-4 font-sans">
      {/* Animated Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-400/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">

          {/* Header */}
          <div className="bg-gradient-to-br from-[#13562d] to-[#1f7a42] px-8 py-10 text-center relative">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">AB PEST CONTROL</h1>
              <p className="text-emerald-100/80 text-[10px] sm:text-xs mt-1.5 font-bold uppercase tracking-[0.2em]">Enterprise Operating System</p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex p-1.5 bg-slate-100/50 mx-6 mt-6 rounded-xl border border-slate-200/60">
            {[
              { key: "admin", label: "Admin Portal", Icon: Shield },
              { key: "Employee", label: "Worker Access", Icon: HardHat },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-black transition-all duration-300 ${
                  tab === key
                    ? "bg-white text-[#13562d] shadow-md border border-slate-200"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab === key ? "text-[#13562d]" : "text-slate-400"}`} />
                {label}
              </button>
            ))}
          </div>

          <div className="px-8 pb-10 pt-8">
            {error && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {error}
                </div>
              </div>
            )}

            {/* Admin Login */}
            {tab === "admin" && (
              <div className="space-y-6">
                <div className="text-center space-y-3 mb-4">
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    Admin access is strictly secured via Google.<br />
                    Only authorized company emails can sign in.
                  </p>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                  {busy ? "Authenticating..." : "Continue with Google"}
                </button>
              </div>
            )}

            {/* Employee Login */}
            {tab === "Employee" && (
              <form onSubmit={handleEmployeeSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Employee PIN</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your 8-digit PIN"
                    required
                    autoFocus
                    className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-[#1f7a42] focus:ring-4 focus:ring-emerald-500/5 focus:outline-none text-center text-lg font-black tracking-[0.5em] transition-all bg-slate-50/30 placeholder:tracking-normal placeholder:text-xs placeholder:font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-2 font-bold text-center uppercase tracking-wider">Access to assigned jobs only</p>
                </div>
                <button
                  type="submit"
                  disabled={busy || !password.trim()}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
                >
                  {busy ? "Validating..." : "Launch Dashboard"}
                </button>
              </form>
            )}

          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-[10px] font-black text-emerald-100/40 uppercase tracking-[0.3em]">
            AB Pest Control © {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-4">
            <span className="w-1 h-1 rounded-full bg-emerald-400/30"></span>
            <span className="w-1 h-1 rounded-full bg-emerald-400/30"></span>
            <span className="w-1 h-1 rounded-full bg-emerald-400/30"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
