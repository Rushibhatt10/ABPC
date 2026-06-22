import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AUTH_PROFILES } from "../constants/authProfiles";
import { Settings, User, Shield, Users, Info, LogOut, ChevronRight, Lock, ShieldCheck, Plus, Trash2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { subscribeCollection, createRecord, updateRecord, deleteRecord } from "../utils/firestoreHelpers";
import { useEffect } from "react";
import { SERVICE_CATEGORIES } from "../constants/services";

export default function SettingsPage() {
  const { profile, logout, isAdmin, isPricingAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [warrantySettings, setWarrantySettings] = useState([]);
  const [newWarranty, setNewWarranty] = useState({ serviceCategory: "Termite", serviceName: "", warrantyPeriod: "" });
  const [warrantySaving, setWarrantySaving] = useState(false);
  const [warrantyMsg, setWarrantyMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    return subscribeCollection("warrantySettings", setWarrantySettings);
  }, []);

  const termiteSubcategories = SERVICE_CATEGORIES.find(c => c.category === "Termite")?.subcategories || [];
  const allServices = SERVICE_CATEGORIES.flatMap(cat =>
    cat.subcategories.map(sub => ({ label: `${cat.category} — ${sub.name}`, value: `${cat.category} — ${sub.name}` }))
  );

  const showWarrantyMsg = (type, text) => {
    setWarrantyMsg({ type, text });
    setTimeout(() => setWarrantyMsg({ type: "", text: "" }), 3000);
  };

  const handleAddWarranty = async () => {
    if (!newWarranty.serviceName || !newWarranty.warrantyPeriod) {
      showWarrantyMsg("error", "Fill in service and warranty period.");
      return;
    }
    setWarrantySaving(true);
    try {
      await createRecord("warrantySettings", {
        serviceCategory: newWarranty.serviceCategory,
        serviceName: newWarranty.serviceName,
        warrantyPeriod: newWarranty.warrantyPeriod,
      });
      setNewWarranty({ serviceCategory: "Termite", serviceName: "", warrantyPeriod: "" });
      showWarrantyMsg("success", "Warranty option added.");
    } catch (e) {
      showWarrantyMsg("error", e.message);
    } finally {
      setWarrantySaving(false);
    }
  };

  const handleDeleteWarranty = async (id) => {
    if (!window.confirm("Delete this warranty option?")) return;
    try {
      await deleteRecord("warrantySettings", id);
      showWarrantyMsg("success", "Deleted.");
    } catch (e) {
      showWarrantyMsg("error", e.message);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const admins = AUTH_PROFILES.filter((p) => !["nakul", "divyesh", "sagar"].includes(p.key));
  const Employees = AUTH_PROFILES.filter((p) => ["nakul", "divyesh", "sagar"].includes(p.key));

  const tabs = [
    { key: "profile", label: "Profile", icon: User },
    { key: "team", label: "Team", icon: Users },
    { key: "warranty", label: "Warranty", icon: ShieldCheck },
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
                { label: "Employee Tag", value: profile?.EmployeeTag || "N/A" },
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
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white text-xs font-black flex-0">
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
            <h2 className="font-bold text-slate-800 mb-4">Employees</h2>
            <div className="space-y-3">
              {Employees.map((p) => (
                <div key={p.key} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-black flex-0">
                    {p.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.roleName}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Employee</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "warranty" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-800">Warranty Options</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Define warranty periods for termite and other treatments. These options will appear when creating invoices and will be printed on warranty cards.
            </p>

            {warrantyMsg.text && (
              <div className={`mb-3 px-3 py-2 rounded-xl text-sm font-medium border ${warrantyMsg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
                {warrantyMsg.text}
              </div>
            )}

            {/* Add new warranty */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add New Warranty Option</p>
              <div className="space-y-2">
                <select
                  value={newWarranty.serviceName}
                  onChange={(e) => setNewWarranty(p => ({ ...p, serviceName: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none text-sm bg-white"
                >
                  <option value="">Select Service</option>
                  {allServices.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <div className="flex gap-2">
                  <input
                    value={newWarranty.warrantyPeriod}
                    onChange={(e) => setNewWarranty(p => ({ ...p, warrantyPeriod: e.target.value }))}
                    placeholder="Warranty period (e.g. 5 Years, 1 Year)"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none text-sm bg-white"
                  />
                  <button
                    onClick={handleAddWarranty}
                    disabled={warrantySaving}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Existing warranty options */}
            {warrantySettings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No warranty options yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {warrantySettings.map((w) => (
                  <div key={w.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{w.serviceName}</p>
                      <p className="text-xs text-emerald-600 font-bold mt-0.5">🛡 {w.warrantyPeriod}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWarranty(w.id)}
                      className="ml-3 p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "about" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient from-[#13562d] to-[#1f7a42] flex items-center justify-center">
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
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] flex-0" />
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
