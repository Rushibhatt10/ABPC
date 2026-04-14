import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  Receipt, MessageSquare, TrendingUp, Settings,
  Bell, LogOut, Menu, X, ChevronRight, Shield, CalendarClock, Award,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const adminNav = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Jobs", to: "/admin/jobs", icon: Briefcase },
  { label: "Invoices", to: "/admin/invoices", icon: Receipt },
  { label: "Quotations", to: "/admin/quotations", icon: FileText },
  { label: "AMC", to: "/admin/amc", icon: CalendarClock },
  { label: "Payments", to: "/admin/payments", icon: TrendingUp },
  { label: "WhatsApp", to: "/admin/whatsapp", icon: MessageSquare },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

const EmployeeNav = [
  { label: "ડેશબોર્ડ", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "મારા જોબ્સ", to: "/admin/jobs", icon: Briefcase },
  { label: "રિપોર્ટ્સ", to: "/admin/reports", icon: FileText },
];

export default function AppShell({ children }) {
  const { profile, logout, isEmployee, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = isEmployee ? EmployeeNav : adminNav;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-1 py-4 border-b border-white/10">
        <Logo variant="horizontal" className="w-full" />
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
                    ? "text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`
              }
              style={({ isActive }) => isActive ? {
                background: "rgba(76, 122, 45, 0.2)",
                boxShadow: "0 0 12px rgba(76, 122, 45, 0.2)",
                border: "1px solid rgba(76, 122, 45, 0.3)",
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-[#4C7A2D]" : ""}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-[#4C7A2D]" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0" style={{ background: "linear-gradient(180deg, #1F3D1F 0%, #0F1F0F 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col shadow-2xl" style={{ background: "linear-gradient(180deg, #1F3D1F 0%, #0F1F0F 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden overflow-x-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 flex items-center px-4 lg:px-6 gap-4 z-30" style={{ background: "#121212", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
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
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
