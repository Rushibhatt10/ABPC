import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, nextDocumentNumber, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, getWhatsAppNumber, toNumber } from "../utils/format";
import { Receipt, Plus, X, Trash2, CheckCircle2, ExternalLink, MessageSquare, Search, FileDown, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import CustomerSearch from "../components/CustomerSearch";

const defaultTerms = "Terms: 1) Payment due on completion. 2) Taxes extra if applicable.";

export default function InvoicesPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [form, setForm] = useState({ date: getTodayISO(), received: "", paymentMode: "UPI", terms: defaultTerms });
  const [showJobPicker, setShowJobPicker] = useState(true);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("jobs", setJobs),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  // Jobs for selected customer that don't already have an invoice
  const customerJobs = useMemo(() => {
    if (!selectedCustomer) return [];
    return jobs.filter(j =>
      (j.customerId === selectedCustomer.id || j.customerName === selectedCustomer.name) &&
      j.status === "completed"
    ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [jobs, selectedCustomer]);

  // Auto-select all jobs when customer changes
  useEffect(() => {
    setSelectedJobIds(new Set(customerJobs.map(j => j.id)));
  }, [customerJobs.length, selectedCustomer?.id]);

  const selectedJobs = customerJobs.filter(j => selectedJobIds.has(j.id));

  // Build line items from selected jobs
  const lineItems = useMemo(() =>
    selectedJobs.map(j => ({
      itemName: j.treatmentLabel || j.serviceType || j.serviceName || "Service",
      quantity: j.quantity || 1,
      unit: j.unit || "unit",
      price: j.finalPrice || j.totalAmount || j.basePrice || 0,
      discount: 0,
      warranty: j.warranty || "",
      jobId: j.id,
      finalAmount: j.finalPrice || j.totalAmount || j.basePrice || 0,
    })),
    [selectedJobs]
  );

  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((s, i) => s + i.finalAmount, 0);
    const received = toNumber(form.received);
    const balance = Math.max(subtotal - received, 0);
    return { subtotal, total: subtotal, received, balance };
  }, [lineItems, form.received]);

  const filtered = useMemo(() => {
    if (!search) return [...invoices].reverse();
    const q = search.toLowerCase();
    return [...invoices].reverse().filter(
      (i) => i.customerName?.toLowerCase().includes(q) || i.invoiceNumber?.toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const toggleJob = (jobId) => {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      next.has(jobId) ? next.delete(jobId) : next.add(jobId);
      return next;
    });
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setSelectedJobIds(new Set());
    setForm({ date: getTodayISO(), received: "", paymentMode: "UPI", terms: defaultTerms });
    setShowJobPicker(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) { showMsg("error", "Select a customer."); return; }
    if (lineItems.length === 0) { showMsg("error", "Select at least one job."); return; }
    setBusy(true);
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const invoiceId = await createRecord("invoices", {
        invoiceNumber,
        date: form.date,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone || "",
        customerAddress: selectedCustomer.address || "",
        items: lineItems,
        subtotal: totals.subtotal,
        discountTotal: 0,
        total: totals.total,
        received: totals.received,
        balance: totals.balance,
        paymentMode: form.paymentMode,
        warranty: lineItems.map(i => i.warranty).filter(Boolean).join(", "),
        terms: form.terms,
        status: totals.balance > 0 ? "Pending" : "Paid",
        jobIds: [...selectedJobIds],
      });

      // Link invoice back to each job
      await Promise.all([...selectedJobIds].map(jobId =>
        updateRecord("jobs", jobId, { invoiceId })
      ));

      resetForm();
      setShowForm(false);
      showMsg("success", `Invoice ${invoiceNumber} created.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (inv) => {
    try {
      await updateRecord("invoices", inv.id, { received: inv.total, balance: 0, status: "Paid" });
      showMsg("success", `${inv.invoiceNumber} marked as paid.`);
    } catch (e) { showMsg("error", e.message); }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    setDeletingId(inv.id);
    try {
      await deleteRecord("invoices", inv.id);
      showMsg("success", "Invoice deleted.");
    } catch (e) { showMsg("error", e.message); }
    finally { setDeletingId(""); }
  };

  const sendWhatsApp = (inv) => {
    const num = getWhatsAppNumber(inv.customerPhone);
    if (!num) { showMsg("error", "No phone number."); return; }
    const text = `Hello ${inv.customerName}, your invoice ${inv.invoiceNumber} from AB Pest Control is ${formatCurrency(inv.total)}. Balance due: ${formatCurrency(inv.balance)}. Thank you!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.received || 0), 0);
  const totalPending = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-0.5">{invoices.length} total invoices</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-var(--brand) text-white text-sm font-bold hover:bg-var(--brand-dark) transition-colors shadow-sm w-full sm:w-auto min-h-44px active:scale-95 sm:ml-auto">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: "Total", value: invoices.length, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Collected", value: formatCurrency(totalRevenue), color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { label: "Pending", value: formatCurrency(totalPending), color: "bg-amber-50 text-amber-700 border-amber-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className="text-lg sm:text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-var(--brand) focus:outline-none text-sm bg-white" />
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{inv.customerName} · {formatDateDisplay(inv.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{formatCurrency(inv.total)}</p>
                  {Number(inv.balance) > 0 && <p className="text-xs text-amber-600 font-semibold">Due: {formatCurrency(inv.balance)}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/admin/invoices/${inv.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-var(--brand) hover:text-var(--brand) transition-colors">
                  <ExternalLink className="w-3 h-3" /> View
                </Link>
                <Link to={`/admin/invoices/${inv.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                  <FileDown className="w-3 h-3" /> PDF
                </Link>
                <button onClick={() => sendWhatsApp(inv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
                  <MessageSquare className="w-3 h-3" /> WhatsApp
                </button>
                {inv.status !== "Paid" && (
                  <button onClick={() => markPaid(inv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                    <CheckCircle2 className="w-3 h-3" /> Mark Paid
                  </button>
                )}
                <button onClick={() => handleDelete(inv)} disabled={deletingId === inv.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-60 ml-auto">
                  <Trash2 className="w-3 h-3" /> {deletingId === inv.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE INVOICE MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg mx-2 sm:mx-auto max-h-[92vh] overflow-y-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-black text-slate-900">New Invoice</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">

              {/* Step 1: Customer */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Customer *</label>
                <CustomerSearch customers={customers} value={selectedCustomer}
                  onChange={(c) => { setSelectedCustomer(c); setSelectedJobIds(new Set()); }} />
              </div>

              {/* Step 2: Jobs from this customer */}
              {selectedCustomer && (
                <div>
                  <button type="button" onClick={() => setShowJobPicker(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-400" />
                      <span>Completed Jobs ({customerJobs.length})</span>
                      {selectedJobIds.size > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-var(--brand) text-white text-[10px] font-bold">{selectedJobIds.size} selected</span>
                      )}
                    </div>
                    {showJobPicker ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </button>

                  {showJobPicker && (
                    <div className="mt-2 space-y-2">
                      {customerJobs.length === 0 ? (
                        <div className="px-4 py-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                          <Briefcase className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                          <p className="text-sm text-slate-400">No completed jobs for this customer</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-1">
                            <button type="button" onClick={() => setSelectedJobIds(new Set(customerJobs.map(j => j.id)))}
                              className="text-xs font-bold text-var(--brand) hover:underline">Select all</button>
                            <span className="text-slate-300">·</span>
                            <button type="button" onClick={() => setSelectedJobIds(new Set())}
                              className="text-xs font-bold text-slate-400 hover:underline">Clear</button>
                          </div>
                          {customerJobs.map(job => {
                            const checked = selectedJobIds.has(job.id);
                            const amount = job.finalPrice || job.totalAmount || job.basePrice || 0;
                            return (
                              <label key={job.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${checked ? "border-var(--brand) bg-var(--brand-soft)" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                                <input type="checkbox" checked={checked} onChange={() => toggleJob(job.id)}
                                  className="accent-var(--brand) w-4 h-4 flex-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 truncate">
                                    {job.treatmentLabel || job.serviceType || job.serviceName}
                                  </p>
                                  <p className="text-xs text-slate-400">{formatDateDisplay(job.scheduledDate)}{job.warranty ? ` · ${job.warranty}` : ""}</p>
                                </div>
                                <p className="font-black text-slate-900 text-sm flex-0">{formatCurrency(amount)}</p>
                              </label>
                            );
                          })}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Summary of selected items */}
              {lineItems.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Items ({lineItems.length})</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {lineItems.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{item.itemName}</p>
                          {item.warranty && <p className="text-xs text-emerald-600">🛡 {item.warranty}</p>}
                        </div>
                        <p className="font-bold text-slate-900 text-sm flex-0 ml-3">{formatCurrency(item.finalAmount)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <span className="font-black text-slate-800">Total</span>
                    <span className="font-black text-xl text-slate-900">{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              )}

              {/* Step 4: Payment details */}
              {lineItems.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Date</label>
                      <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-var(--brand) focus:outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Payment Mode</label>
                      <select value={form.paymentMode} onChange={(e) => setForm(p => ({ ...p, paymentMode: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-var(--brand) focus:outline-none text-sm">
                        {["UPI", "Cash", "Bank Transfer", "Cheque", "Card"].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Amount Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input type="number" value={form.received} onChange={(e) => setForm(p => ({ ...p, received: e.target.value }))}
                        placeholder="0" min="0"
                        className="w-full pl-7 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-var(--brand) focus:outline-none text-sm" />
                    </div>
                    {totals.balance > 0 && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">Balance due: {formatCurrency(totals.balance)}</p>
                    )}
                    {totals.received >= totals.total && totals.total > 0 && (
                      <p className="text-xs text-emerald-600 font-semibold mt-1">✓ Fully paid</p>
                    )}
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy || lineItems.length === 0}
                  className="flex-1 py-3 rounded-xl bg-var(--brand) text-white text-sm font-bold hover:bg-var(--brand-dark) disabled:opacity-50 transition-colors">
                  {busy ? "Creating..." : `Create Invoice${totals.total > 0 ? ` · ${formatCurrency(totals.total)}` : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
