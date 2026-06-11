import { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Receipt, ShieldCheck, MapPin,
  CalendarClock, ChevronRight, LogOut, Menu, X, Users
} from "lucide-react";
import { useCustomerAuth } from "../context/customerAuthState";
import { getRecord } from "../../utils/firestoreHelpers";
import Logo from "../../components/Logo";

const customerNav = [
  { label: "Dashboard",   to: "/customer/dashboard",   icon: LayoutDashboard, end: true },
  { label: "AMC Contracts", to: "/customer/amc",       icon: CalendarClock },
  { label: "Quotations",  to: "/customer/quotations", icon: FileText },
  { label: "Invoices & Bills", to: "/customer/invoices", icon: Receipt },
  { label: "Service Reports", to: "/customer/reports", icon: ShieldCheck },
  { label: "Certificates", to: "/customer/certificates", icon: ShieldCheck }
];

export default function CustomerShell() {
  const { activeCustomer, customerIds, activeCustomerId, selectCustomer, logoutCustomer } = useCustomerAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customerProfiles, setCustomerProfiles] = useState([]);

  // Fetch all property details for switching if they have multiple customer IDs
  useEffect(() => {
    if (customerIds.length <= 1) return;
    Promise.all(customerIds.map(id => getRecord("customers", id)))
      .then(records => setCustomerProfiles(records.filter(Boolean)));
  }, [customerIds]);

  const handleLogout = () => {
    logoutCustomer();
    navigate("/customer/login");
  };

  const handlePropertyChange = (e) => {
    selectCustomer(e.target.value);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <div className="px-1 py-4 border-b border-white/10">
        <Logo variant="horizontal" className="w-full" />
      </div>

      {/* Property Switcher if multiple profiles linked */}
      {customerIds.length > 1 && customerProfiles.length > 0 && (
        <div className="px-4 py-3 border-b border-white/10">
          <label className="block text-[10px] font-black text-white/50 uppercase tracking-widest mb-1.5">
            Switch Property
          </label>
          <select
            value={activeCustomerId}
            onChange={handlePropertyChange}
            className="w-full px-2.5 py-1.5 text-xs bg-white/10 border border-white/20 rounded-xl outline-none text-white font-bold"
          >
            {customerProfiles.map(p => (
              <option key={p.id} value={p.id} className="text-slate-900 font-semibold">
                {p.address ? p.address.slice(0, 24) + "..." : p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {customerNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive ? "text-white" : "text-white/70 hover:text-white hover:bg-white/8"
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
                  <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-[#7ED348]" : "text-white/50 group-hover:text-white/80"}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#7ED348]" />}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile & Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}>
          <div className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ background: "linear-gradient(135deg, #5E9A38, #7ED348)" }}>
            {activeCustomer?.name?.slice(0, 2).toUpperCase() || "AC"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{activeCustomer?.name || "Customer"}</p>
            <div className="flex items-center gap-1 opacity-80">
              <MapPin className="w-2.5 h-2.5 text-[#7ED348] shrink-0" />
              <p className="text-[10px] font-semibold truncate text-[#7ED348]">{activeCustomer?.address || "Gujarat, India"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0" style={{ background: "linear-gradient(180deg, #38702F 0%, #1A3D14 100%)", borderRight: "1px solid rgba(255,255,255,0.12)" }}>
        {renderSidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col shadow-2xl" style={{ background: "linear-gradient(180deg, #38702F 0%, #1A3D14 100%)", borderRight: "1px solid rgba(255,255,255,0.12)" }}>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="shrink-0 h-14 flex items-center px-4 lg:px-6 gap-4 z-30 bg-white border-b border-slate-200">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          {/* User Details */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-[11px] font-black">
                {activeCustomer?.name?.slice(0, 2).toUpperCase() || "AC"}
              </div>
              <span className="text-sm font-semibold text-slate-700">{activeCustomer?.name || "Customer Portal"}</span>
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
