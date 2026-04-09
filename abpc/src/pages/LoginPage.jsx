import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Zap, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Predefined users
const USERS = {
  admins: ["Ankit Bhatt", "Akanksha Bhatt"],
  workers: ["Nakul", "Divyesh", "Sagar"],
};

const ALL_USERS = [...USERS.admins, ...USERS.workers];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    const trimmedName = name.trim();
    
    // Check if name exists in predefined list
    const matchedUser = ALL_USERS.find(
      (u) => u.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (!matchedUser) {
      setError("Name not found. Please enter a valid name.");
      return;
    }
    
    setLoading(true);
    try {
      // Determine role based on user list
      const isAdmin = USERS.admins.some(
        (u) => u.toLowerCase() === trimmedName.toLowerCase()
      );
      
      // Find the key from AUTH_PROFILES for backward compatibility
      const keyMap = {
        "ankit bhatt": "ankit",
        "akanksha bhatt": "akanksha",
        "nakul": "nakul",
        "divyesh": "divyesh",
        "sagar": "sagar",
      };
      
      const key = keyMap[trimmedName.toLowerCase()];
      
      // Login with matched name
      await login(key, "dummy"); // Password not needed anymore
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
              <User className="w-4 h-4 text-[var(--brand)]" />
              <p className="text-sm font-bold text-slate-700">Enter your name to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm font-medium text-slate-800 transition-colors"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Authorized users: Ankit Bhatt, Akanksha Bhatt, Nakul, Divyesh, Sagar
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full py-3.5 rounded-xl bg-[var(--brand)] hover:bg-[var(--brand-dark)] text-white font-bold text-sm transition-colors disabled:opacity-60 shadow-lg shadow-emerald-900/20"
              >
                {loading ? "Signing in..." : "Continue"}
              </button>
            </form>

            {/* Quick Select Buttons */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Select</p>
              <div className="grid grid-cols-2 gap-2">
                {USERS.admins.map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => setName(user)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all"
                  >
                    {user}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {USERS.workers.map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => setName(user)}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-all"
                  >
                    {user}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-emerald-200/60 text-xs mt-6">
          AB Pest Control © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
