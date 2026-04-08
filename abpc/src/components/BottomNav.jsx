import { NavLink } from "react-router-dom";
import { Bell, FileText, Home, Plus, Users } from "lucide-react";

const adminItems = [
  { label: "Home", to: "/admin/homepage", icon: Home },
  { label: "Customers", to: "/admin/customers", icon: Users },
  { label: "Create", to: "/admin/new-job", icon: Plus, featured: true },
  { label: "Bills", to: "/admin/bills", icon: FileText },
  { label: "Alerts", to: "/admin/reminders", icon: Bell },
];

const workerItems = [{ label: "Home", to: "/admin/homepage", icon: Home }];

export default function BottomNav({ isWorker }) {
  const navItems = isWorker ? workerItems : adminItems;
  const gridClass = isWorker ? "grid-cols-1" : "grid-cols-5";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 backdrop-blur-xl px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
      <div className={`mx-auto grid max-w-lg gap-2 ${gridClass}`}>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="group">
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <span
                  className={`flex flex-col items-center justify-center gap-1 rounded-3xl py-2 text-center transition-all ${
                    item.featured ? "translate-y-16px" : ""
                  } ${
                    isActive && !item.featured
                      ? "text-emerald-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <span
                    className={`flex items-center justify-center rounded-2xl ${
                      item.featured
                        ? "h-14 w-14 bg-emerald-600 text-white shadow-[0_18px_35px_rgba(22,163,74,0.32)]"
                        : `h-10 w-10 ${isActive ? "bg-emerald-50" : "bg-transparent"}`
                    }`}
                  >
                    <Icon className={`${item.featured ? "h-7 w-7" : "h-5 w-5"}`} />
                  </span>
                  <span className={`text-[10px] font-bold ${item.featured ? "text-emerald-700" : ""}`}>{item.label}</span>
                </span>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
