import { NavLink } from "react-router-dom";

const adminItems = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Customers", to: "/admin/customers" },
  { label: "Bills", to: "/admin/bills" },
];

const workerItems = [{ label: "Home", to: "/admin/dashboard" }];

export default function BottomNav({ isWorker }) {
  const navItems = isWorker ? workerItems : adminItems;
  const gridClass = isWorker ? "grid-cols-1" : "grid-cols-3";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 backdrop-blur-xl px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
      <div className={`mx-auto grid max-w-lg gap-2 ${gridClass}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-2xl py-3 text-center text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
