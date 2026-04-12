import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, nextDocumentNumber, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, getWhatsAppNumber, toNumber } from "../utils/format";
import { FileText, Plus, X, Trash2, ExternalLink, MessageSquare, Search, ArrowRight, FileDown } from "lucide-react";
import ServicePicker from "../components/ServicePicker";
import CustomerSearch from "../components/CustomerSearch";

const createItem = () => ({ itemName: "", quantity: "", unit: "job", unitPrice: "" });

const defaultMethodology = "Methodology: Drilling at regular intervals, chemical injection through nozzles, and final sealing.";
const defaultWarranty = "Warranty: As per treatment type, subject to site conditions.";
const defaultPaymentTerms = "Payment terms: 50% advance and remaining on completion.";
const defaultTerms = "Terms: 1) Quotation valid for 15 days. 2) Taxes extra if applicable.";

export default function QuotationsPage() {
  const { isWorker } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    customerId: "",
    date: getTodayISO(),
    items: [],
    methodology: defaultMethodology,
    warranty: defaultWarranty,
    paymentTerms: defaultPaymentTerms,
    terms: defaultTerms,
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("quotations", setQuotations),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const customer = selectedCustomer;

  const total = useMemo(() =>
    form.items.reduce((s, i) => s + toNumber(i.quantity) * toNumber(i.unitPrice), 0),
    [form.items]
  );

  const filtered = useMemo(() => {
    if (!search) return [...quotations].reverse();
    const q = search.toLowerCase();
    return [...quotations].reverse().filter(
      (q2) => q2.customerName?.toLowerCase().includes(q) || q2.estimateNumber?.toLowerCase().includes(q)
    );
  }, [quotations, search]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleServiceAdd = (item) => {
    setForm((p) => ({
      ...p,
      items: [...p.items, {
        itemName: item.itemName,
        quantity: String(item.quantity),
        unit: item.unit || "unit",
        unitPrice: String(item.price),
      }],
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
      const estimateNumber = await nextDocumentNumber("EST");
      const items = form.items
        .filter((i) => i.itemName && toNumber(i.quantity) > 0)
        .map((i) => ({
          itemName: i.itemName,
          quantity: toNumber(i.quantity),
          unit: i.unit || "job",
          unitPrice: toNumber(i.unitPrice),
          total: toNumber(i.quantity) * toNumber(i.unitPrice),
        }));

      await createRecord("quotations", {
        estimateNumber,
        date: form.date,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        propertyType: customer.propertyType,
        items,
        totalAmount: items.reduce((s, i) => s + i.total, 0),
        methodology: form.methodology,
        warranty: form.warranty,
        paymentTerms: form.paymentTerms,
        terms: form.terms,
        status: "Draft",
      });

      setForm({ customerId: "", date: getTodayISO(), items: [], methodology: defaultMethodology, warranty: defaultWarranty, paymentTerms: defaultPaymentTerms, terms: defaultTerms });
      setSelectedCustomer(null);
      setShowForm(false);
      showMsg("success", `Quotation ${estimateNumber} created.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (q) => {
    if (!window.confirm(`Delete quotation ${q.estimateNumber}?`)) return;
    setDeletingId(q.id);
    try {
      await deleteRecord("quotations", q.id);
      showMsg("success", "Quotation deleted.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setDeletingId("");
    }
  };

  const sendWhatsApp = (q) => {
    const num = getWhatsAppNumber(q.customerPhone);
    if (!num) { showMsg("error", "No phone number."); return; }
    const text = `Hello ${q.customerName}, your estimate ${q.estimateNumber} from AB Pest Control is ready. Total: ${formatCurrency(q.totalAmount)}. Please find the attached PDF for details. Thank you!`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const convertToInvoice = async (q) => {
    if (!window.confirm(`Convert ${q.estimateNumber} to an invoice?`)) return;
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const items = (q.items || []).map((i) => ({
        itemName: i.itemName,
        quantity: toNumber(i.quantity),
        price: toNumber(i.unitPrice),
        discount: 0,
        finalAmount: toNumber(i.quantity) * toNumber(i.unitPrice),
      }));
      const total = items.reduce((s, i) => s + i.finalAmount, 0);

      const invoiceId = await createRecord("invoices", {
        invoiceNumber,
        date: getTodayISO(),
        customerId: q.customerId,
        customerName: q.customerName,
        customerPhone: q.customerPhone || "",
        customerAddress: q.customerAddress || "",
        items,
        subtotal: total,
        discountTotal: 0,
        total,
        received: 0,
        balance: total,
        paymentMode: "UPI",
        warranty: q.warranty || "",
        terms: q.terms || "",
        status: "Pending",
        fromQuotation: q.estimateNumber,
      });

      await updateRecord("quotations", q.id, { status: "Converted to Invoice" });
      showMsg("success", `Invoice ${invoiceNumber} created.`);
      navigate(`/admin/invoices/${invoiceId}`);
    } catch (e) {
      showMsg("error", e.message);
    }
  };

  if (isWorker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quotations</h1>
          <p className="text-slate-500 mt-0.5">{quotations.length} total quotations</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Quotation
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
          { label: "Total", value: quotations.length, color: "bg-blue-50 text-blue-700 border-blue-100" },
          { label: "Draft", value: quotations.filter((q) => q.status === "Draft").length, color: "bg-amber-50 text-amber-700 border-amber-100" },
          { label: "Converted", value: quotations.filter((q) => q.status === "Converted to Invoice").length, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
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
          placeholder="Search quotations..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No quotations yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{q.estimateNumber}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      q.status === "Converted to Invoice" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {q.status || "Draft"}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{q.customerName} · {formatDateDisplay(q.date)}</p>
                </div>
                <p className="font-black text-slate-900">{formatCurrency(q.totalAmount)}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/admin/quotations/${q.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </Link>
                <Link
                  to={`/admin/quotations/${q.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <FileDown className="w-3 h-3" />
                  PDF
                </Link>
                <button
                  onClick={() => sendWhatsApp(q)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  WhatsApp
                </button>
                {q.status !== "Converted to Invoice" && (
                  <button
                    onClick={() => convertToInvoice(q)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Convert to Invoice
                  </button>
                )}
                <button
                  onClick={() => handleDelete(q)}
                  disabled={deletingId === q.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors disabled:opacity-60 ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  {deletingId === q.id ? "..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">Create Quotation</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer *</label>
                  <CustomerSearch
                    customers={customers}
                    value={selectedCustomer}
                    onChange={setSelectedCustomer}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm" />
                </div>
              </div>

              {/* Service Picker */}
              <ServicePicker onAdd={handleServiceAdd} addLabel="Add to Quotation" />

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Line Items {form.items.length > 0 && `(${form.items.length})`}</p>
                {form.items.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">No items yet — use the picker above or add manually below.</p>
                ) : (
                  <div className="space-y-3">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3 space-y-2">
                        <input value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)} placeholder="Item name" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} placeholder="Qty" min="0" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                          <input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} placeholder="Unit" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                          <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} placeholder="Price ₹" min="0" className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
                        </div>
                        <button type="button" onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))} className="text-xs text-rose-500 hover:text-rose-700 font-semibold">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => setForm((p) => ({ ...p, items: [...p.items, createItem()] }))} className="mt-2 text-sm font-semibold text-[var(--brand)] hover:underline">+ Add manually</button>
              </div>

              <div className="bg-[var(--brand-soft)] rounded-xl p-4 flex items-center justify-between">
                <span className="font-bold text-slate-800">Total</span>
                <span className="font-black text-xl text-slate-900">{formatCurrency(total)}</span>
              </div>

              <div className="space-y-3">
                {[
                  { key: "methodology", label: "Methodology" },
                  { key: "warranty", label: "Warranty" },
                  { key: "paymentTerms", label: "Payment Terms" },
                  { key: "terms", label: "Terms & Conditions" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                    <textarea value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none" />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  {busy ? "Creating..." : "Create Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
