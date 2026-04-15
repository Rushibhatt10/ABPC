import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getWhatsAppNumber } from "../utils/format";
import { TrendingUp, CheckCircle2, Clock, MessageSquare, Search, IndianRupee, X } from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
};

/** Small modal to record a partial or full payment */
function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(invoice.balance || ""));
  const [mode, setMode] = useState(invoice.paymentMode || "UPI");
  const [saving, setSaving] = useState(false);
  const MODES = ["Cash", "UPI", "Cheque", "Bank Transfer", "Card"];

  const handleSave = async () => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0) { alert("Enter a valid amount."); return; }
    setSaving(true);
    try {
      const newReceived = Number(invoice.received || 0) + paid;
      const newBalance = Math.max(0, Number(invoice.total || 0) - newReceived);
      await updateRecord("invoices", invoice.id, {
        received: newReceived,
        balance: newBalance,
        paymentMode: mode,
        status: newBalance === 0 ? "Paid" : "Partial",
      });
      onSaved();
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden" style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <p className="font-bold text-white text-sm">Record Payment</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{invoice.customerName} · {invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: "Total", value: formatCurrency(invoice.total), color: "rgba(255,255,255,0.7)" },
              { label: "Received", value: formatCurrency(invoice.received), color: "#6DBF4A" },
              { label: "Balance", value: formatCurrency(invoice.balance), color: "#E4572E" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="font-black text-sm" style={{ color: s.color }}>{s.value}</p>
                <p className="mt-0.5 font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Amount Received (₹)</label>
            <input type="number" min="1" max={invoice.balance} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setAmount(String(Math.round(Number(invoice.balance) * pct / 100)))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(76,122,45,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Payment Mode</label>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES.map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className="py-2 rounded-xl text-xs font-semibold transition-all"
                  style={mode === m
                    ? { background: "rgba(76,122,45,0.2)", border: "1px solid rgba(76,122,45,0.4)", color: "#6DBF4A" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#1F3D1F,#4C7A2D)", boxShadow: "0 0 16px rgba(76,122,45,0.3)" }}>
              {saving ? "Saving…" : "Record Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { isEmployee } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [recordInvoice, setRecordInvoice] = useState(null); // invoice for partial payment modal

  useEffect(() => subscribeCollection("invoices", setInvoices), []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const filtered = useMemo(() => {
    let list = [...invoices].reverse();
    if (filter === "pending") list = list.filter(i => Number(i.balance || 0) > 0);
    if (filter === "paid")    list = list.filter(i => Number(i.balance || 0) === 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.customerName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q));
    }
    return list;
  }, [invoices, filter, search]);

  const stats = useMemo(() => ({
    collected:    invoices.reduce((s, i) => s + Number(i.received || 0), 0),
    pending:      invoices.reduce((s, i) => s + Number(i.balance || 0), 0),
    paidCount:    invoices.filter(i => Number(i.balance || 0) === 0).length,
    pendingCount: invoices.filter(i => Number(i.balance || 0) > 0).length,
  }), [invoices]);

  const markPaid = async (inv) => {
    try {
      await updateRecord("invoices", inv.id, { received: inv.total, balance: 0, status: "Paid" });
      showMsg("success", `${inv.invoiceNumber} marked as paid.`);
    } catch (e) { showMsg("error", e.message); }
  };

  const sendReminder = (inv) => {
    const num = getWhatsAppNumber(inv.customerPhone);
    if (!num) { showMsg("error", "No phone number."); return; }
    const text = `Hello ${inv.customerName}, this is a friendly reminder that your payment of ${formatCurrency(inv.balance)} for invoice ${inv.invoiceNumber} from AB Pest Control is pending. Thank you!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isEmployee) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
        <p className="font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Access restricted</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-white">Payments</h1>
        <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Track collections and pending dues</p>
      </div>

      {msg.text && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{
          background: msg.type === "success" ? "rgba(76,122,45,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${msg.type === "success" ? "rgba(76,122,45,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: msg.type === "success" ? "#6DBF4A" : "#F87171",
        }}>{msg.text}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Collected",  value: formatCurrency(stats.collected),    icon: TrendingUp,  accent: "#4C7A2D" },
          { label: "Total Pending",    value: formatCurrency(stats.pending),       icon: Clock,       accent: "#E4572E" },
          { label: "Paid Invoices",    value: stats.paidCount,                     icon: CheckCircle2,accent: "#4C7A2D" },
          { label: "Pending Invoices", value: stats.pendingCount,                  icon: Clock,       accent: "#E4572E" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02]"
              style={{ ...glass, border: `1px solid ${s.accent}33` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}22` }}>
                <Icon className="w-[18px] h-[18px]" style={{ color: s.accent }} />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-white leading-none">{s.value}</p>
                <p className="text-xs font-bold mt-1" style={{ color: s.accent }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer or invoice..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm" />
        </div>
        <div className="flex gap-2">
          {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={filter === tab.key
                ? { background: "linear-gradient(135deg,#2F4F2F,#4C7A2D)", color: "#fff", boxShadow: "0 0 16px rgba(76,122,45,0.3)" }
                : { ...glass, color: "rgba(255,255,255,0.6)" }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 sm:p-12 text-center" style={glass}>
          <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
          <p className="font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>No payments found</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
                  {["Invoice", "Customer", "Date", "Total", "Received", "Balance", "Status", "Actions"].map((h, i) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-bold uppercase tracking-wider ${i >= 3 && i <= 5 ? "text-right" : i >= 6 ? "text-center" : "text-left"}`}
                      style={{ color: "rgba(255,255,255,0.4)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv, idx) => (
                  <tr key={inv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td className="px-5 py-3.5 font-semibold text-white">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3.5" style={{ color: "rgba(255,255,255,0.7)" }}>{inv.customerName}</td>
                    <td className="px-5 py-3.5" style={{ color: "rgba(255,255,255,0.4)" }}>{formatDateDisplay(inv.date)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-white">{formatCurrency(inv.total)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold" style={{ color: "#6DBF4A" }}>{formatCurrency(inv.received)}</td>
                    <td className="px-5 py-3.5 text-right font-bold">
                      <span style={{ color: Number(inv.balance) > 0 ? "#E4572E" : "#6DBF4A" }}>{formatCurrency(inv.balance)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={
                        inv.status === "Paid"
                          ? { background: "rgba(76,122,45,0.2)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }
                          : { background: "rgba(228,87,46,0.15)", color: "#E4572E", border: "1px solid rgba(228,87,46,0.3)" }
                      }>{inv.status || "Pending"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {Number(inv.balance) > 0 && (<>
                          <button onClick={() => setRecordInvoice(inv)} title="Record Payment"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(228,87,46,0.15)", color: "#E4572E" }}>
                            <IndianRupee className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => markPaid(inv)} title="Mark Fully Paid"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(76,122,45,0.15)", color: "#6DBF4A" }}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => sendReminder(inv)} title="Send WhatsApp Reminder"
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#4ADE80" }}>
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {recordInvoice && (
        <RecordPaymentModal
          invoice={recordInvoice}
          onClose={() => setRecordInvoice(null)}
          onSaved={() => { setRecordInvoice(null); showMsg("success", "Payment recorded."); }}
        />
      )}
    </div>
  );
}
