import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  IndianRupee, Receipt, MessageSquare, TrendingUp, Settings,
  Bell, LogOut, Menu, X, ChevronRight, Shield, Zap,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const adminNav = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Jobs", to: "/admin/jobs", icon: Briefcase },
  { label: "Reports", to: "/admin/reports", icon: FileText },
  { label: "Pricing", to: "/admin/pricing", icon: IndianRupee },
  { label: "Invoices", to: "/admin/invoices", icon: Receipt },
  { label: "Quotations", to: "/admin/quotations", icon: FileText },
  { label: "Payments", to: "/admin/payments", icon: TrendingUp },
  { label: "WhatsApp", to: "/admin/whatsapp", icon: MessageSquare },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const workerNav = [
  { label: "ડેશબોર્ડ", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "મારા કામ", to: "/admin/jobs", icon: Briefcase },
  { label: "રિપોર્ટ", to: "/admin/reports", icon: FileText },
];

export default function AppShell({ children }) {
  const { profile, logout, isWorker, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isWorker ? workerNav : adminNav;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 leading-none">AB Pest Control</p>
            <p className="text-sm font-black text-white leading-tight mt-0.5">Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group ${
                  isActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-300" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-emerald-300" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
            {profile?.avatar || profile?.name?.slice(0, 2).toUpperCase() || "AB"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.name}</p>
            <div className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-emerald-400" />
              <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">{profile?.roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--bg-soft)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-gradient-to-b from-[#13562d] to-[#1f7a42]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 flex flex-col bg-gradient-to-b from-[#13562d] to-[#1f7a42] shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 z-30">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-[var(--brand)] flex items-center justify-center text-white text-[10px] font-black">
                {profile?.avatar || profile?.name?.slice(0, 2).toUpperCase() || "AB"}
              </div>
              <span className="text-sm font-semibold text-slate-700">{profile?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
