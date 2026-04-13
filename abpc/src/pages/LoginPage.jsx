import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Shield, HardHat, Zap } from "lucide-react";
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
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <div className="text-slate-500 text-xs font-medium uppercase tracking-widest">Verifying...</div>
      </div>
    </div>
  );

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const switchTab = (t) => { 
    setTab(t); 
    setError(""); 
    setPin("");
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
        setError("This account is not authorized as an admin.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setError("");
    const key = Employee_PASSWORD_MAP[pin.trim()];
    if (!key) { 
      setError("Incorrect PIN. Please try again."); 
      return; 
    }
    setBusy(true);
    try {
      await loginEmployee(key);
    } catch (err) {
      setError(err.message || "Login failed.");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="w-full max-w-md">
        
        {/* Simple Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-600 rounded-xl shadow-lg mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">AB PEST CONTROL</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Operating System</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => switchTab("admin")}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                tab === "admin" ? "bg-white text-emerald-600 border-b-2 border-emerald-600" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              }`}
            >
              <Shield className="w-4 h-4" /> Admin
            </button>
            <button
              onClick={() => switchTab("worker")}
              className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${
                tab === "worker" ? "bg-white text-emerald-600 border-b-2 border-emerald-600" : "bg-slate-50 text-slate-400 hover:text-slate-600"
              }`}
            >
              <HardHat className="w-4 h-4" /> Worker
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}

            {tab === "admin" && (
              <div className="space-y-6">
                <p className="text-sm text-slate-500 text-center leading-relaxed">
                  Admin portal is accessed via authorized Google accounts only.
                </p>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
                  </svg>
                  {busy ? "Signing in..." : "Continue with Google"}
                </button>
              </div>
            )}

            {tab === "worker" && (
              <form onSubmit={handleWorkerSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Worker PIN</label>
                  <input
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoFocus
                    className="w-full px-4 py-4 rounded-xl border border-slate-200 focus:border-emerald-500 focus:outline-none text-center text-xl font-black tracking-widest transition-all bg-slate-50 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy || !pin.trim()}
                  className="w-full py-4 rounded-xl bg-slate-800 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {busy ? "Verifying..." : "Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-8">
          AB Pest Control © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
