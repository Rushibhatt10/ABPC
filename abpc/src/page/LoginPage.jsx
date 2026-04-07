import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLES = [
  { key: "admin", label: "Admin", name: "Ankit Bhatt" },
  { key: "p1", label: "P1", name: "Pest Controller 1" },
  { key: "p2", label: "P2", name: "Pest Controller 2" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      login(selectedRole, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError("Incorrect password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/50 px-6 font-sans">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 sm:p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-slate-100/50 relative overflow-hidden">
          {/* Decorative radial gradient */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
          
          <div className="text-center mb-10 relative">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">AB Pest Control</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 mt-3">Simple CRM Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8 relative">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 block text-center">Choose Your Profile</label>
              <div className="grid grid-cols-1 gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => setSelectedRole(role.key)}
                    className={`flex flex-col items-start p-5 rounded-2xl border-2 transition-all duration-300 group ${
                      selectedRole === role.key
                        ? "border-emerald-500 bg-emerald-50/50 ring-4 ring-emerald-500/10"
                        : "border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-200"
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedRole === role.key ? "text-emerald-600" : "text-slate-400"}`}>
                      {role.label}
                    </span>
                    <span className={`text-base font-bold tracking-tight ${selectedRole === role.key ? "text-slate-900" : "text-slate-500"}`}>
                      {role.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3 block text-center">Security Password</label>
              <input
                type="password"
                required
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl outline-none focus:border-slate-900 focus:bg-white transition-all font-bold text-center tracking-[1em] text-lg text-slate-900 placeholder:tracking-normal placeholder:font-medium placeholder:text-slate-300"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 py-3 px-4 rounded-xl text-center">
                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-slate-200 mt-2 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Enter Workspace"}
            </button>
          </form>

          <div className="mt-12 text-center relative">
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.25em] leading-relaxed">
              Authorized Personnel Only <br /> 
              <span className="text-slate-200 tracking-normal font-medium normal-case block mt-1">AB Pest Control Insecticide Services</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
