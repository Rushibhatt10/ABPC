import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createRecord, deleteRecord, subscribeCollection,
  updateRecord, nextDocumentNumber,
} from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO } from "../utils/format";
import {
  CalendarClock, Plus, X, Trash2, Search, AlertCircle,
  Clock, FileText, Receipt, CheckCircle2, RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ServicePicker from "../components/ServicePicker";
import CustomerSearch from "../components/CustomerSearch";
import PaymentModeModal from "../components/PaymentModeModal";

// Duration → visits mapping (1 visit per month)
const DURATIONS = [
  { label: "1 Month",           months: 1,  visits: 1,  visitLabel: "1 visit" },
  { label: "3 Months",          months: 3,  visits: 3,  visitLabel: "3 visits" },
  { label: "6 Months",          months: 6,  visits: 6,  visitLabel: "6 visits" },
  { label: "12 Months (Annual)", months: 12, visits: 12, visitLabel: "12 visits" },
];

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function AMCPage() {
  const { isEmployee } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [invoicingId, setInvoicingId] = useState("");
  const [paymentModeAmc, setPaymentModeAmc] = useState(null); // AMC waiting for payment mode
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [deletingId, setDeletingId] = useState("");

  const [form, setForm] = useState({
    durationMonths: 12,
    startDate: getTodayISO(),
    services: [],
    totalAmount: "",
    notes: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("amc", setAmcs),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const endDate = useMemo(
    () => (form.startDate ? addMonths(form.startDate, form.durationMonths) : ""),
    [form.startDate, form.durationMonths]
  );

  const selectedDuration = DURATIONS.find(d => d.months === form.durationMonths) || DURATIONS[3];
  const totalAmt = parseFloat(form.totalAmount) || 0;
  const advanceAmt = Math.round(totalAmt * 0.5);
  const balanceAmt = totalAmt - advanceAmt;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) { showMsg("error", "Select a customer."); return; }
    if (form.services.length === 0) { showMsg("error", "Add at least one service."); return; }
    if (!totalAmt || totalAmt <= 0) { showMsg("error", "Enter total AMC amount."); return; }
    setBusy(true);
    try {
      await createRecord("amc", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        durationMonths: form.durationMonths,
        visits: selectedDuration.visits,
        startDate: form.startDate,
        endDate,
        services: form.services,
        totalAmount: totalAmt,
        advanceAmount: advanceAmt,
        balanceAmount: balanceAmt,
        notes: form.notes,
        status: "Active",
        invoiceId: null,
      });
      setForm({ durationMonths: 12, startDate: getTodayISO(), services: [], totalAmount: "", notes: "" });
      setSelectedCustomer(null);
      setShowForm(false);
      showMsg("success", "AMC created successfully.");
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (amc) => {
    if (!window.confirm(`Delete AMC for ${amc.customerName}?`)) return;
    setDeletingId(amc.id);
    try {
      await deleteRecord("amc", amc.id);
      showMsg("success", "AMC deleted.");
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setDeletingId("");
    }
  };

  // Step 1: open payment mode picker
  const handleGenerateInvoice = (amc) => {
    if (!Number(amc.totalAmount)) { showMsg("error", "Set AMC amount first."); return; }
    setPaymentModeAmc(amc);
  };

  // Step 2: create invoice with chosen mode
  const handleGenerateInvoiceWithMode = async (paymentMode) => {
    const amc = paymentModeAmc;
    setPaymentModeAmc(null);
    if (!amc) return;
    setInvoicingId(amc.id);
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const total = Number(amc.totalAmount || 0);
      const advance = Number(amc.advanceAmount || Math.round(total * 0.5));
      const balance = total - advance;

      const dur = DURATIONS.find(d => d.months === amc.durationMonths) || DURATIONS[3];
      const serviceNames = amc.services?.map(s => s.itemName).join(", ") || "AMC Services";

      const items = [{
        itemName: `AMC — ${serviceNames} (${dur.label} · ${dur.visitLabel})`,
        quantity: 1,
        price: total,
        discount: 0,
        warranty: "",
        finalAmount: total,
      }];

      const invoiceId = await createRecord("invoices", {
        invoiceNumber,
        amcId: amc.id,
        date: getTodayISO(),
        customerId: amc.customerId || "",
        customerName: amc.customerName || "",
        customerPhone: amc.customerPhone || "",
        customerAddress: amc.customerAddress || "",
        items,
        subtotal: total,
        discountTotal: 0,
        total,
        received: advance,
        balance,
        paymentMode,
        warranty: "",
        terms: `AMC Terms: 50% advance paid. Balance ₹${balance.toLocaleString("en-IN")} due on completion of first visit. ${dur.visitLabel} included over ${dur.label}.`,
        status: "Partial",
        fromAMC: true,
      });

      await updateRecord("amc", amc.id, { invoiceId });
      showMsg("success", `Invoice ${invoiceNumber} created · ${paymentMode}.`);
    } catch (err) {
      showMsg("error", err.message);
    } finally {
      setInvoicingId("");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...amcs].reverse().filter((a) =>
      !q ||
      a.customerName?.toLowerCase().includes(q) ||
      a.customerPhone?.includes(q) ||
      a.customerAddress?.toLowerCase().includes(q)
    );
  }, [amcs, search]);

  const expiringSoon = useMemo(
    () => amcs.filter((a) => a.status === "Active" && daysUntil(a.endDate) <= 30 && daysUntil(a.endDate) >= 0),
    [amcs]
  );

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">AMC Management</h1>
          <p className="text-slate-500 mt-0.5">{amcs.length} contracts · {expiringSoon.length} expiring soon</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm w-full sm:w-auto min-h-[44px] active:scale-95 sm:ml-auto">
          <Plus className="w-4 h-4" /> New AMC
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>{msg.text}</div>
      )}

      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-700">Expiring Soon ({expiringSoon.length})</span>
          </div>
          <div className="space-y-1.5">
            {expiringSoon.map((a) => {
              const days = daysUntil(a.endDate);
              return (
                <div key={a.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-800">{a.customerName}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${days <= 7 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {days === 0 ? "Expires today" : `${days} days left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, address..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
      </div>

      {/* AMC list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No AMC contracts yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((amc) => {
            const days = daysUntil(amc.endDate);
            const isExpired = days < 0;
            const isExpiringSoon = days >= 0 && days <= 30;
            const dur = DURATIONS.find(d => d.months === amc.durationMonths) || DURATIONS[3];
            const total = Number(amc.totalAmount || 0);
            const advance = Number(amc.advanceAmount || Math.round(total * 0.5));
            const balance = Number(amc.balanceAmount ?? (total - advance));

            return (
              <div key={amc.id} className={`bg-white rounded-2xl border p-4 sm:p-5 ${
                isExpired ? "border-rose-200" : isExpiringSoon ? "border-amber-200" : "border-slate-200"
              }`}>
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-slate-900">{amc.customerName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{amc.customerPhone} · {amc.customerAddress}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      isExpired ? "bg-rose-100 text-rose-700" :
                      isExpiringSoon ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                      {isExpired ? "Expired" : isExpiringSoon ? `${days}d left` : "Active"}
                    </span>
                    <button onClick={() => handleDelete(amc)} disabled={deletingId === amc.id}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Duration + dates */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {dur.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold">
                    {dur.visitLabel}
                  </span>
                  <span>{formatDateDisplay(amc.startDate)} → {formatDateDisplay(amc.endDate)}</span>
                </div>

                {/* Payment breakdown */}
                {total > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</p>
                      <p className="text-sm font-black text-slate-800 mt-0.5">{formatCurrency(total)}</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Advance (50%)</p>
                      <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(advance)}</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-amber-50 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Balance</p>
                      <p className="text-sm font-black text-amber-700 mt-0.5">{formatCurrency(balance)}</p>
                    </div>
                  </div>
                )}

                {/* Services */}
                {amc.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {amc.services.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-semibold">
                        {s.itemName}
                      </span>
                    ))}
                  </div>
                )}

                {amc.notes && (
                  <p className="text-xs text-slate-500 mb-3 italic">{amc.notes}</p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => navigate(`/admin/amc/${amc.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand)] text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white transition-colors">
                    <FileText className="w-3 h-3" /> View Agreement
                  </button>

                  {/* Invoice button */}
                  {!amc.invoiceId ? (
                    <button
                      onClick={() => handleGenerateInvoice(amc)}
                      disabled={invoicingId === amc.id || !total}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: "rgba(228,87,46,0.1)", border: "1px solid rgba(228,87,46,0.25)", color: "#E4572E" }}
                      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 12px rgba(228,87,46,0.3)"}
                      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                      <Receipt className="w-3 h-3" />
                      {invoicingId === amc.id ? "Creating…" : !total ? "Set amount first" : "Generate Invoice"}
                    </button>
                  ) : (
                    <Link to={`/admin/invoices/${amc.invoiceId}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                      <CheckCircle2 className="w-3 h-3" /> View Invoice
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create AMC Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">New AMC Contract</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

              {/* Customer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer *</label>
                <CustomerSearch customers={customers} value={selectedCustomer} onChange={setSelectedCustomer} />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration & Visits</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map((d) => (
                    <button key={d.months} type="button"
                      onClick={() => setForm((p) => ({ ...p, durationMonths: d.months }))}
                      className={`px-3 py-3 rounded-xl border text-left transition-all ${
                        form.durationMonths === d.months
                          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                          : "border-slate-200 text-slate-600 hover:border-[var(--brand)]"
                      }`}>
                      <p className="text-sm font-bold">{d.label}</p>
                      <p className={`text-[10px] mt-0.5 ${form.durationMonths === d.months ? "text-white/70" : "text-slate-400"}`}>
                        {d.visitLabel} · 50% advance
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm min-h-[42px]" />
                {endDate && (
                  <p className="text-xs text-slate-500 mt-1">End date: <strong>{formatDateDisplay(endDate)}</strong></p>
                )}
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total AMC Amount (₹) *</label>
                <input type="number" min="0" step="1" value={form.totalAmount}
                  onChange={(e) => setForm((p) => ({ ...p, totalAmount: e.target.value }))}
                  placeholder="Enter total contract amount"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm min-h-[42px]" />

                {/* Live payment breakdown */}
                {totalAmt > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="rounded-xl p-2.5 text-center bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                      <p className="text-sm font-black text-slate-800">{formatCurrency(totalAmt)}</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-emerald-50 border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Advance 50%</p>
                      <p className="text-sm font-black text-emerald-700">{formatCurrency(advanceAmt)}</p>
                    </div>
                    <div className="rounded-xl p-2.5 text-center bg-amber-50 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">Balance</p>
                      <p className="text-sm font-black text-amber-700">{formatCurrency(balanceAmt)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Services */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Services Covered *</label>
                <ServicePicker onAdd={(item) => setForm((p) => ({ ...p, services: [...p.services, item] }))} addLabel="Add Service" />
                {form.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.services.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-semibold">
                        {s.itemName}
                        <button type="button" onClick={() => setForm((p) => ({ ...p, services: p.services.filter((_, j) => j !== i) }))} className="hover:text-rose-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="Any special conditions..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none min-h-[42px]" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  {busy ? "Creating..." : "Create AMC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment mode picker — before generating invoice */}
      {paymentModeAmc && (
        <PaymentModeModal
          title={`Invoice for ${paymentModeAmc.customerName}`}
          onClose={() => setPaymentModeAmc(null)}
          onConfirm={handleGenerateInvoiceWithMode}
        />
      )}
    </div>
  );
}
