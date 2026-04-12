import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getWhatsAppNumber } from "../utils/format";
import { TrendingUp, CheckCircle2, Clock, MessageSquare, Search, Filter } from "lucide-react";

export default function PaymentsPage() {
  const { isWorker } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | pending | paid
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    return subscribeCollection("invoices", setInvoices);
  }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const filtered = useMemo(() => {
    let list = [...invoices].reverse();
    if (filter === "pending") list = list.filter((i) => Number(i.balance || 0) > 0);
    if (filter === "paid") list = list.filter((i) => Number(i.balance || 0) === 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.customerName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q));
    }
    return list;
  }, [invoices, filter, search]);

  const stats = useMemo(() => {
    const collected = invoices.reduce((s, i) => s + Number(i.received || 0), 0);
    const pending = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
    const paidCount = invoices.filter((i) => Number(i.balance || 0) === 0).length;
    const pendingCount = invoices.filter((i) => Number(i.balance || 0) > 0).length;
    return { collected, pending, paidCount, pendingCount };
  }, [invoices]);

  const markPaid = async (inv) => {
    try {
      await updateRecord("invoices", inv.id, { received: inv.total, balance: 0, status: "Paid" });
      showMsg("success", `${inv.invoiceNumber} marked as paid.`);
    } catch (e) {
      showMsg("error", e.message);
    }
  };

  const sendReminder = (inv) => {
    const num = getWhatsAppNumber(inv.customerPhone);
    if (!num) { showMsg("error", "No phone number."); return; }
    const text = `Hello ${inv.customerName}, this is a friendly reminder that your payment of ${formatCurrency(inv.balance)} for invoice ${inv.invoiceNumber} from AB Pest Control is pending. Please make the payment at your earliest convenience. Thank you!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isWorker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Payments</h1>
        <p className="text-slate-500 mt-0.5">Track collections and pending dues</p>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Collected", value: formatCurrency(stats.collected), color: "bg-emerald-50 border-emerald-100 text-emerald-700", icon: TrendingUp },
          { label: "Total Pending", value: formatCurrency(stats.pending), color: "bg-amber-50 border-amber-100 text-amber-700", icon: Clock },
          { label: "Paid Invoices", value: stats.paidCount, color: "bg-blue-50 border-blue-100 text-blue-700", icon: CheckCircle2 },
          { label: "Pending Invoices", value: stats.pendingCount, color: "bg-rose-50 border-rose-100 text-rose-700", icon: Clock },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
              <Icon className="w-5 h-5 mb-2 opacity-70" />
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer or invoice..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "pending", label: "Pending" },
            { key: "paid", label: "Paid" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? "bg-[var(--brand)] text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No payments found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 font-bold text-slate-600">Invoice</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-600">Customer</th>
                  <th className="text-left px-5 py-3.5 font-bold text-slate-600">Date</th>
                  <th className="text-right px-5 py-3.5 font-bold text-slate-600">Total</th>
                  <th className="text-right px-5 py-3.5 font-bold text-slate-600">Received</th>
                  <th className="text-right px-5 py-3.5 font-bold text-slate-600">Balance</th>
                  <th className="text-center px-5 py-3.5 font-bold text-slate-600">Status</th>
                  <th className="text-center px-5 py-3.5 font-bold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr key={inv.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5 text-slate-600">{inv.customerName}</td>
                    <td className="px-5 py-3.5 text-slate-500">{formatDateDisplay(inv.date)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{formatCurrency(inv.total)}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-600 font-semibold">{formatCurrency(inv.received)}</td>
                    <td className="px-5 py-3.5 text-right font-bold">
                      <span className={Number(inv.balance) > 0 ? "text-amber-600" : "text-emerald-600"}>
                        {formatCurrency(inv.balance)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {inv.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {Number(inv.balance) > 0 && (
                          <>
                            <button
                              onClick={() => markPaid(inv)}
                              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              title="Mark Paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => sendReminder(inv)}
                              className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                              title="Send WhatsApp Reminder"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
