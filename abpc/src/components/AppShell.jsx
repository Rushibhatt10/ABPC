import { useAuth } from "../context/AuthContext";
import BottomNav from "./BottomNav";
import { useNavigate } from "react-router-dom";

export default function AppShell({ children }) {
  const { profile, logout, isWorker } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-32">
      {/* Decorative top gradient */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none" />

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-5">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-600 leading-none mb-1">AB Pest Control</span>
            <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Console</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{profile?.name || "Ankit Bhatt"}</p>
            <button
              type="button"
              className="ghost-btn px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-emerald-700"
              onClick={handleLogout}
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pt-8">
        {children}
      </main>

      <BottomNav isWorker={isWorker} />
    </div>
  );
}
