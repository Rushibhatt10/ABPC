import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, BarChart3,
  Receipt, MessageSquare, TrendingUp, Settings,
  Bell, LogOut, Menu, X, ChevronRight, Shield, CalendarClock, AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection } from "../utils/firestoreHelpers";
import Logo from "./Logo";

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const adminNav = [
  { label: "Dashboard",   to: "/admin",             icon: LayoutDashboard, end: true },
  { label: "Customers",   to: "/admin/customers",   icon: Users },
  { label: "Quotations",  to: "/admin/quotations",   icon: FileText },
  { label: "Jobs",        to: "/admin/jobs",         icon: Briefcase },
  { label: "Invoices",    to: "/admin/invoices",     icon: Receipt },
  { label: "AMC",         to: "/admin/amc",          icon: CalendarClock },
  { label: "Payments",    to: "/admin/payments",     icon: TrendingUp },
  { label: "WhatsApp",    to: "/admin/whatsapp",     icon: MessageSquare },
  { label: "Analytics",   to: "/admin/analytics",    icon: BarChart3 },
  { label: "Settings",    to: "/admin/settings",     icon: Settings },
];

const EmployeeNav = [
  { label: "ડેશબોર્ડ", to: "/admin", icon: LayoutDashboard, end: true },
  { label: "મારા જોબ્સ", to: "/admin/jobs", icon: Briefcase },
  { label: "રિપોર્ટ્સ", to: "/admin/reports", icon: FileText },
];

export default function AppShell({ children }) {
  const { profile, logout, isEmployee, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Live badge counts — admin only, wait for auth to finish loading
  const [complaints, setComplaints] = useState([]);
  const [amcs, setAmcs] = useState([]);
  useEffect(() => {
    if (authLoading || !isAdmin) return;
    const unsubs = [
      subscribeCollection("complaints", setComplaints),
      subscribeCollection("amc", setAmcs),
    ];
    return () => unsubs.forEach(u => u());
  }, [isAdmin, authLoading]);

  const openComplaints = complaints.filter(c => c.status !== "Resolved").length;
  const expiringAmcs = amcs.filter(a => a.status === "Active" && daysUntil(a.endDate) <= 30 && daysUntil(a.endDate) >= 0).length;

  const navItems = isEmployee ? EmployeeNav : adminNav;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <div className="px-1 py-4 border-b border-white/10">
        <Logo variant="horizontal" className="w-full" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge = !isEmployee && (
            (item.to === "/admin/complaints" && openComplaints > 0) ? openComplaints :
            (item.to === "/admin/amc" && expiringAmcs > 0) ? expiringAmcs :
            null
          );
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? "text-white"
                    : "text-white/70 hover:text-white hover:bg-white/8"
                }`
              }
              style={({ isActive }) => isActive ? {
                background: "linear-gradient(135deg, rgba(126, 211, 72, 0.45), rgba(76, 122, 45, 0.35))",
                boxShadow: "0 4px 20px rgba(126, 211, 72, 0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
                border: "1px solid rgba(126, 211, 72, 0.5)",
              } : {}}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#7ED348]" : "text-white/50 group-hover:text-white/80"}`} />
                  <span className="flex-1">{item.label}</span>
                  {badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none"
                      style={{ background: item.to === "/admin/amc" ? "rgba(245,158,11,0.9)" : "rgba(239,68,68,0.9)", color: "#fff" }}>
                      {badge}
                    </span>
                  )}
                  {isActive && !badge && <ChevronRight className="w-3 h-3 text-[#7ED348]" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "linear-gradient(135deg, #5E9A38, #7ED348)" }}>
            {profile?.avatar || profile?.name?.slice(0, 2).toUpperCase() || "AB"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{profile?.name}</p>
            <div className="flex items-center gap-1">
              <Shield className="w-2.5 h-2.5 text-[#7ED348]" />
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#7ED348" }}>{profile?.roleName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-(--bg-soft) overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0" style={{ background: "linear-gradient(180deg, #38702F 0%, #1A3D14 100%)", borderRight: "1px solid rgba(255,255,255,0.12)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col shadow-2xl" style={{ background: "linear-gradient(180deg, #38702F 0%, #1A3D14 100%)", borderRight: "1px solid rgba(255,255,255,0.12)" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden overflow-x-hidden">
        {/* Top Header */}
        <header className="shrink-0 h-14 flex items-center px-4 lg:px-6 gap-4 z-30 bg-white border-b border-slate-200">
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
              <div className="w-7 h-7 rounded-lg bg-(--brand) flex items-center justify-center text-white text-[10px] font-black">
                {profile?.avatar || profile?.name?.slice(0, 2).toUpperCase() || "AB"}
              </div>
              <span className="text-sm font-semibold text-slate-700">{profile?.name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto admin-main">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
