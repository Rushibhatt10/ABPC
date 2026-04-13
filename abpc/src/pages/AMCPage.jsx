import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatDateDisplay, getTodayISO } from "../utils/format";
import { CalendarClock, Plus, X, Trash2, Search, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import ServicePicker from "../components/ServicePicker";
import CustomerSearch from "../components/CustomerSearch";

const DURATIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months (Quarterly)", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "12 Months (Annual)", months: 12 },
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
  const [customers, setCustomers] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [deletingId, setDeletingId] = useState("");

  const [form, setForm] = useState({
    durationMonths: 12,
    startDate: getTodayISO(),
    services: [],
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

  const customer = selectedCustomer;

  const endDate = useMemo(
    () => (form.startDate ? addMonths(form.startDate, form.durationMonths) : ""),
    [form.startDate, form.durationMonths]
  );

  const handleServiceAdd = (item) => {
    setForm((p) => ({ ...p, services: [...p.services, item] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) { showMsg("error", "Select a customer."); return; }
    if (form.services.length === 0) { showMsg("error", "Add at least one service."); return; }
    setBusy(true);
    try {
      await createRecord("amc", {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        durationMonths: form.durationMonths,
        startDate: form.startDate,
        endDate,
        services: form.services,
        notes: form.notes,
        status: "Active",
      });
      setForm({ durationMonths: 12, startDate: getTodayISO(), services: [], notes: "" });
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...amcs].reverse().filter((a) =>
      !q ||
      a.customerName?.toLowerCase().includes(q) ||
      a.customerPhone?.includes(q) ||
      a.customerAddress?.toLowerCase().includes(q)
    );
  }, [amcs, search]);

  // Expiry alerts: AMCs expiring within 30 days
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
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm w-full sm:w-auto min-h-[44px] active:scale-95 sm:ml-auto"
        >
          <Plus className="w-4 h-4" />
          New AMC
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name, phone, address..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
        />
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
            return (
              <div key={amc.id} className={`bg-white rounded-2xl border p-4 sm:p-5 ${isExpired ? "border-rose-200" : isExpiringSoon ? "border-amber-200" : "border-slate-200"}`}>
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
                    <button
                      onClick={() => handleDelete(amc)}
                      disabled={deletingId === amc.id}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {amc.durationMonths} months</span>
                  <span>{formatDateDisplay(amc.startDate)} → {formatDateDisplay(amc.endDate)}</span>
                </div>

                {amc.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {amc.services.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xs font-semibold">
                        {s.itemName}
                      </span>
                    ))}
                  </div>
                )}

                {amc.notes && (
                  <p className="text-xs text-slate-500 mt-2 italic">{amc.notes}</p>
                )}
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
                <CustomerSearch
                  customers={customers}
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Duration</label>
                <div className="grid grid-cols-2 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.months}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, durationMonths: d.months }))}
                      className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                        form.durationMonths === d.months
                          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                          : "border-slate-200 text-slate-600 hover:border-[var(--brand)]"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm min-h-[42px]"
                />
                {endDate && (
                  <p className="text-xs text-slate-500 mt-1">End date: <strong>{formatDateDisplay(endDate)}</strong></p>
                )}
              </div>

              {/* Services */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Services Covered</label>
                <ServicePicker onAdd={handleServiceAdd} addLabel="Add Service" />
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
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any special conditions..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none min-h-[42px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  {busy ? "Creating..." : "Create AMC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
