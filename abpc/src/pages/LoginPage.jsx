import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Password mapping to users (stored locally)
const PASSWORD_MAP = {
  "ankit123": { key: "ankit", name: "Ankit Bhatt", role: "admin" },
  "akanksha123": { key: "akanksha", name: "Akanksha Bhatt", role: "admin" },
  "nakul123": { key: "nakul", name: "Nakul", role: "worker" },
  "divyesh123": { key: "divyesh", name: "Divyesh", role: "worker" },
  "sagar123": { key: "sagar", name: "Sagar", role: "worker" },
};

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const trimmedPassword = password.trim();
    
    // Check if password exists in map
    const user = PASSWORD_MAP[trimmedPassword];
    
    if (!user) {
      setError("Invalid password. Please try again.");
      return;
    }
    
    setLoading(true);
    try {
      // Login with the mapped user key
      await login(user.key, trimmedPassword);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0d3d20] via-[#13562d] to-[#1f7a42] p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#13562d] to-[#1f7a42] px-8 py-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">AB Pest Control</h1>
            <p className="text-emerald-200 text-sm mt-1 font-medium">Company Operating System</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="flex items-center gap-2 mb-6">
              <Lock className="w-4 h-4 text-[var(--brand)]" />
              <p className="text-sm font-bold text-slate-700">Enter your password to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm font-medium text-slate-800 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Each user has a unique password
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full py-3.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-bold text-sm transition-colors disabled:opacity-60 shadow-lg shadow-emerald-900/20"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-emerald-200/60 text-xs mt-6">
          AB Pest Control © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
