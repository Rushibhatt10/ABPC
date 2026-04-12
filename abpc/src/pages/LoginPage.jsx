import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, Shield, HardHat } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const WORKER_PASSWORD_MAP = {
  "nakul123":   "nakul",
  "divyesh123": "divyesh",
  "sagar123":   "sagar",
};

export default function LoginPage() {
  const { loginAdmin, loginWorker, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("admin");
  const [workerPass, setWorkerPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/admin" replace />;

  const switchTab = (t) => { setTab(t); setError(""); };

  // Admin: Google Sign-In popup
  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await loginAdmin();
      navigate("/admin", { replace: true });
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("popup-closed") || msg.includes("cancelled")) {
        setError("Sign-in cancelled.");
      } else if (msg.includes("not authorized")) {
        setError("This Google account is not authorized.");
      } else {
        setError("Sign-in failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Worker: password only
  const handleWorkerSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const key = WORKER_PASSWORD_MAP[workerPass.trim()];
    if (!key) { setError("Incorrect password."); return; }
    setLoading(true);
    try {
      loginWorker(key);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d20] via-[#13562d] to-[#1f7a42] p-4">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Branding */}
          <div className="bg-gradient-to-r from-[#13562d] to-[#1f7a42] px-8 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-black text-white">AB Pest Control</h1>
            <p className="text-emerald-200 text-xs mt-1 tracking-wide">Company Operating System</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {[
              { key: "admin",  label: "Admin",  Icon: Shield },
              { key: "worker", label: "Worker", Icon: HardHat },
            ].map(({ key, label, Icon }) => (
              <button key={key} onClick={() => switchTab(key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold transition-colors ${
                  tab === key
                    ? "text-[var(--brand)] border-b-2 border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "text-slate-400 hover:text-slate-600"
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          <div className="px-8 py-8">

            {/* Admin — Google Sign-In only */}
            {tab === "admin" && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500 text-center">
                  Admin access is secured via Google.<br />
                  Only authorized accounts can sign in.
                </p>

                {error && (
                  <p className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium text-center">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-sm transition-all disabled:opacity-60 shadow-sm"
                >
                  {/* Google logo SVG */}
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  {loading ? "Signing in…" : "Sign in with Google"}
                </button>
              </div>
            )}

            {/* Worker — password only */}
            {tab === "worker" && (
              <form onSubmit={handleWorkerSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                  <input
                    type="password"
                    value={workerPass}
                    onChange={(e) => setWorkerPass(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm text-slate-800 transition-colors"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Each worker has a unique password</p>
                </div>
                {error && (
                  <p className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading || !workerPass.trim()}
                  className="w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors disabled:opacity-60">
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            )}

          </div>
        </div>
        <p className="text-center text-emerald-200/50 text-xs mt-5">AB Pest Control © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
