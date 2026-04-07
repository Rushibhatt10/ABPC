import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AUTH_PROFILES } from "../constants/authProfiles";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { loginAsRole } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProfile = AUTH_PROFILES.find((profile) => profile.key === selectedRole);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginAsRole(selectedRole, password);
      setPassword("");
      navigate("/admin", { replace: true });
    } catch (authError) {
      setError(authError.message || "Unable to log in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="app-card w-full max-w-md">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">A B Pest Control</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Simple CRM Login</h1>
        <p className="mt-1 text-sm text-slate-500">Choose role and enter password.</p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {AUTH_PROFILES.map((profile) => (
            <button
              key={profile.key}
              type="button"
              className={`rounded-xl border p-3 text-left transition ${
                selectedRole === profile.key
                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              onClick={() => setSelectedRole(profile.key)}
            >
              <p className="text-sm font-bold text-slate-900">{profile.loginLabel}</p>
              <p className="text-xs text-slate-500">{profile.roleName}</p>
            </button>
          ))}
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleLogin}>
          <div className="surface-card border-emerald-100 bg-emerald-50">
            <p className="text-xs font-semibold text-emerald-700">Selected User</p>
            <p className="text-sm font-bold text-emerald-900">{selectedProfile?.name}</p>
          </div>

          <div>
            <label className="field-label" htmlFor="localCode">
              Password
            </label>
            <input
              id="localCode"
              className="field-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              required
            />
          </div>

          {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}

          <button className="primary-btn" disabled={loading} type="submit">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Role passwords can be edited in <code>src/constants/authProfiles.js</code>.
        </p>
      </div>
    </div>
  );
}