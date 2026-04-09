import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AUTH_PROFILES } from "../constants/authProfiles";
import { Settings, User, Shield, Users, Info, LogOut, ChevronRight, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { profile, logout, isAdmin, isPricingAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const admins = AUTH_PROFILES.filter((p) => !["nakul", "divyesh", "sagar"].includes(p.key));
  const workers = AUTH_PROFILES.filter((p) => ["nakul", "divyesh", "sagar"].includes(p.key));

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "team", label: "Team", icon: Users },
    { key: "about", label: "About", icon: Info },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--brand)] flex items-center justify-center text-white text-xl font-black">
                {profile?.avatar || profile?.name?.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{profile?.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-3.5 h-3.5 text-[var(--brand)]" />
                  <span className="text-sm font-semibold text-[var(--brand)]">{profile?.roleName}</span>
                </div>
                {isPricingAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    <Lock className="w-2.5 h-2.5" />
                    Pricing Admin
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Name", value: profile?.name },
                { label: "Role", value: profile?.roleName },
                { label: "Worker Tag", value: profile?.workerTag || "N/A" },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500 font-medium">{f.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">Sign Out</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4">Admins</h2>
            <div className="space-y-3">
              {admins.map((p) => (
                <div key={p.key} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.roleName}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[var(--brand)]" />
                    <span className="text-xs font-semibold text-[var(--brand)]">Admin</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4">Workers</h2>
            <div className="space-y-3">
              {workers.map((p) => (
                <div key={p.key} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-black flex-shrink-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.roleName}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Worker</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "about" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#13562d] to-[#1f7a42] flex items-center justify-center">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">AB Pest Control</h2>
                <p className="text-sm text-slate-500">Company Operating System</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Version", value: "2.0.0" },
                { label: "Platform", value: "React + Firebase" },
                { label: "Database", value: "Firestore" },
                { label: "Storage", value: "Firebase Storage" },
                { label: "Auth", value: "Firebase Auth" },
              ].map((f) => (
                <div key={f.label} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-500 font-medium">{f.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[var(--brand-soft)] rounded-2xl border border-emerald-200 p-5">
            <h3 className="font-bold text-[var(--brand-dark)] mb-3">Features</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                "CRM", "Job Management", "Workforce Tracking", "Billing",
                "Payments", "WhatsApp", "Analytics", "Reports",
                "Pricing", "Quotations", "Invoices", "Role-based Access",
              ].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-sm text-[var(--brand-dark)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
