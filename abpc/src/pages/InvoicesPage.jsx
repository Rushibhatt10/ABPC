import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, nextDocumentNumber, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, getWhatsAppNumber, toNumber } from "../utils/format";
import { Receipt, Plus, X, Trash2, CheckCircle2, ExternalLink, MessageSquare, Search, FileDown } from "lucide-react";

const createItem = () => ({ itemName: "", quantity: "", price: "", discount: "" });

const defaultWarranty = "Warranty: As per treatment type, subject to site conditions.";
const defaultTerms = "Terms: 1) Payment due on completion. 2) Taxes extra if applicable.";

export default function InvoicesPage() {
  const { isWorker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [priceList, setPriceList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    customerId: "",
    date: getTodayISO(),
    items: [createItem()],
    received: "",
    paymentMode: "UPI",
    warranty: defaultWarranty,
    terms: defaultTerms,
  });

  const [pricePicker, setPricePicker] = useState({ category: "", bhk: "1" });

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("priceList", setPriceList),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const customer = useMemo(() => customers.find((c) => c.id === form.customerId) || null, [customers, form.customerId]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.price), 0);
    const discountTotal = form.items.reduce((s, i) => s + toNumber(i.discount), 0);
    const total = Math.max(subtotal - discountTotal, 0);
    const received = toNumber(form.received);
    const balance = Math.max(total - received, 0);
    return { subtotal, discountTotal, total, received, balance };
  }, [form.items, form.received]);

  const selectedPrice = useMemo(() => {
    if (!pricePicker.category) return null;
    const row = priceList.find((r) => r.category === pricePicker.category);
    if (!row) return null;
    const entry = row.bhkPrices?.[pricePicker.bhk];
    return entry?.editable ?? entry?.base ?? null;
  }, [priceList, pricePicker]);

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

  const addFromPriceList = () => {
    if (selectedPrice === null) { showMsg("error", "Select a price list entry first."); return; }
    const row = priceList.find((r) => r.category === pricePicker.category);
    setForm((p) => ({
      ...p,
      items: [...p.items, { itemName: row?.serviceName || pricePicker.category, quantity: "1", price: String(selectedPrice), discount: "0" }],
    }));
  };

  const updateItem = (idx, key, val) => {
    setForm((p) => ({ ...p, items: p.items.map((item, i) => i === idx ? { ...item, [key]: val } : item) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) { showMsg("error", "Select a customer."); return; }
    setBusy(true);
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const items = form.items
        .filter((i) => i.itemName && toNumber(i.quantity) > 0)
        .map((i) => ({
          itemName: i.itemName,
          quantity: toNumber(i.quantity),
          price: toNumber(i.price),
          discount: toNumber(i.discount),
          finalAmount: Math.max(toNumber(i.quantity) * toNumber(i.price) - toNumber(i.discount), 0),
        }));

      await createRecord("invoices", {
        invoiceNumber,
        date: form.date,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        items,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        total: totals.total,
        received: totals.received,
        balance: totals.balance,
        paymentMode: form.paymentMode,
        warranty: form.warranty,
        terms: form.terms,
        status: totals.balance > 0 ? "Pending" : "Paid",
      });

      setForm({ customerId: "", date: getTodayISO(), items: [createItem()], received: "", paymentMode: "UPI", warranty: defaultWarranty, terms: defaultTerms });
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
    } catch (e) {
      showMsg("error", e.message);
    }
  };

  const handleDelete = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
    setDeletingId(inv.id);
    try {
      await deleteRecord("invoices", inv.id);
      showMsg("success", "Invoice deleted.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setDeletingId("");
    }
  };

  const sendWhatsApp = (inv) => {
    const num = getWhatsAppNumber(inv.customerPhone);
    if (!num) { showMsg("error", "No phone number."); return; }
    const text = `Hello ${inv.customerName}, your invoice ${inv.invoiceNumber} from AB Pest Control is ${formatCurrency(inv.total)}. Balance due: ${formatCurrency(inv.balance)}. Please find the attached PDF for details. Thank you!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (isWorker) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-0.5">{invoices.length} total invoices</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Invoices", value: invoices.length, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Collected", value: formatCurrency(totalRevenue), color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { label: "Pending", value: formatCurrency(totalPending), color: "bg-amber-50 text-amber-700 border-amber-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className="text-xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoices..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
        />
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No invoices yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => (
            <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{inv.invoiceNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      inv.status === "Paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{inv.customerName} · {formatDateDisplay(inv.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">{formatCurrency(inv.total)}</p>
                  {Number(inv.balance) > 0 && (
                    <p className="text-xs text-amber-600 font-semibold">Due: {formatCurrency(inv.balance)}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/invoices/${inv.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </Link>
                <Link
                  to={`/admin/invoices/${inv.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  PDF
                </Link>
                <button
                  onClick={() => sendWhatsApp(inv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp
                </button>
                {inv.status !== "Paid" && (
                  <button
                    onClick={() => markPaid(inv)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Mark Paid
                  </button>
                )}
                <button
                  onClick={() => handleDelete(inv)}
                  disabled={deletingId === inv.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-60 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  {deletingId === inv.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Invoice Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">Create Invoice</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer *</label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm((p) => ({ ...p, customerId: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
                  />
                </div>
              </div>

              {/* Price list picker */}
              {priceList.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Add from Price List</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={pricePicker.category}
                      onChange={(e) => setPricePicker((p) => ({ ...p, category: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
                    >
                      <option value="">Select category</option>
                      {priceList.map((r) => <option key={r.id} value={r.category}>{r.category}</option>)}
                    </select>
                    <select
                      value={pricePicker.bhk}
                      onChange={(e) => setPricePicker((p) => ({ ...p, bhk: e.target.value }))}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
                    >
                      {["1", "2", "3", "4", "bunglow"].map((k) => (
                        <option key={k} value={k}>{k === "bunglow" ? "Bunglow" : `${k} BHK`}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Price: <strong>{selectedPrice !== null ? formatCurrency(selectedPrice) : "—"}</strong></span>
                    <button type="button" onClick={addFromPriceList} className="px-3 py-1.5 rounded-xl bg-[var(--brand)] text-white text-xs font-bold hover:bg-[var(--brand-dark)]">
                      Add Item
                    </button>
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Line Items</p>
                <div className="space-y-3">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <input
                        value={item.itemName}
                        onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                        placeholder="Item name"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                        <input type="number" value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} placeholder="Price" min="0" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                        <input type="number" value={item.discount} onChange={(e) => updateItem(idx, "discount", e.target.value)} placeholder="Discount" min="0" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                      </div>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-xs text-rose-500 hover:text-rose-700 font-semibold">
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setForm((p) => ({ ...p, items: [...p.items, createItem()] }))} className="mt-2 text-sm font-semibold text-[var(--brand)] hover:underline">
                  + Add Item
                </button>
              </div>

              {/* Totals */}
              <div className="bg-[var(--brand-soft)] rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-semibold">{formatCurrency(totals.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Discount</span><span className="font-semibold text-rose-600">-{formatCurrency(totals.discountTotal)}</span></div>
                <div className="flex justify-between border-t border-emerald-200 pt-1.5"><span className="font-bold text-slate-800">Total</span><span className="font-black text-slate-900">{formatCurrency(totals.total)}</span></div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount Received</label>
                  <input type="number" value={form.received} onChange={(e) => setForm((p) => ({ ...p, received: e.target.value }))} placeholder="0" min="0" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Payment Mode</label>
                  <select value={form.paymentMode} onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm">
                    {["UPI", "Cash", "Bank Transfer", "Cheque", "Card"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  {busy ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
