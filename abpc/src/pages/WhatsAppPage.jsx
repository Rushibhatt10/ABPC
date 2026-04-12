import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getWhatsAppNumber } from "../utils/format";
import { MessageSquare, Send, Users, Receipt, FileText, Bell } from "lucide-react";

const TEMPLATES = [
  {
    id: "invoice",
    label: "Invoice Reminder",
    icon: Receipt,
    color: "bg-blue-50 border-blue-200 text-blue-700",
    build: (customer, invoice) =>
      `Hello ${customer?.name || "Customer"}, your invoice ${invoice?.invoiceNumber || ""} from AB Pest Control is ${formatCurrency(invoice?.total || 0)}. Balance due: ${formatCurrency(invoice?.balance || 0)}. Please make the payment at your earliest convenience. Thank you!`,
  },
  {
    id: "quotation",
    label: "Quotation Share",
    icon: FileText,
    color: "bg-violet-50 border-violet-200 text-violet-700",
    build: (customer, quotation) =>
      `Hello ${customer?.name || "Customer"}, your estimate ${quotation?.estimateNumber || ""} from AB Pest Control is ready. Total: ${formatCurrency(quotation?.totalAmount || 0)}. Please review and confirm. Thank you!`,
  },
  {
    id: "reminder",
    label: "Payment Reminder",
    icon: Bell,
    color: "bg-amber-50 border-amber-200 text-amber-700",
    build: (customer) =>
      `Hello ${customer?.name || "Customer"}, this is a friendly reminder from AB Pest Control regarding your pending payment. Please contact us at your earliest convenience. Thank you!`,
  },
  {
    id: "amc",
    label: "AMC Renewal",
    icon: Bell,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    build: (customer) =>
      `Hello ${customer?.name || "Customer"}, your Annual Maintenance Contract (AMC) with AB Pest Control is due for renewal. Please contact us to renew and continue enjoying our pest control services. Thank you!`,
  },
  {
    id: "followup",
    label: "Job Follow-up",
    icon: MessageSquare,
    color: "bg-rose-50 border-rose-200 text-rose-700",
    build: (customer) =>
      `Hello ${customer?.name || "Customer"}, we hope the pest control treatment at your property was satisfactory. Please let us know if you have any concerns or need any follow-up service. AB Pest Control.`,
  },
];

export default function WhatsAppPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("invoice");
  const [selectedDoc, setSelectedDoc] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("quotations", setQuotations),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const customer = useMemo(() => customers.find((c) => c.id === selectedCustomer) || null, [customers, selectedCustomer]);

  const customerInvoices = useMemo(() => invoices.filter((i) => i.customerId === selectedCustomer), [invoices, selectedCustomer]);
  const customerQuotations = useMemo(() => quotations.filter((q) => q.customerId === selectedCustomer), [quotations, selectedCustomer]);

  const template = TEMPLATES.find((t) => t.id === selectedTemplate);

  const doc = useMemo(() => {
    if (selectedTemplate === "invoice") return invoices.find((i) => i.id === selectedDoc) || customerInvoices[0] || null;
    if (selectedTemplate === "quotation") return quotations.find((q) => q.id === selectedDoc) || customerQuotations[0] || null;
    return null;
  }, [selectedTemplate, selectedDoc, invoices, quotations, customerInvoices, customerQuotations]);

  const generatedMessage = useMemo(() => {
    if (!template || !customer) return "";
    return template.build(customer, doc);
  }, [template, customer, doc]);

  const finalMessage = useCustom ? customMessage : generatedMessage;

  const sendMessage = () => {
    if (!customer) return;
    const num = getWhatsAppNumber(customer.phone);
    if (!num) { alert("No phone number for this customer."); return; }
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(finalMessage)}`, "_blank");
  };

  const pendingInvoices = useMemo(() => invoices.filter((i) => Number(i.balance || 0) > 0), [invoices]);

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">WhatsApp</h1>
        <p className="text-slate-500 mt-0.5">Send messages, invoices, and reminders via WhatsApp</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-4">Compose Message</h2>

            {/* Customer */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => { setSelectedCustomer(e.target.value); setSelectedDoc(""); }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                ))}
              </select>
            </div>

            {/* Template */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Message Template</label>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setSelectedTemplate(t.id); setUseCustom(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                        selectedTemplate === t.id && !useCustom
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => { setUseCustom(true); setCustomMessage(generatedMessage); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all ${
                    useCustom
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  Custom Message
                </button>
              </div>
            </div>

            {/* Doc selector for invoice/quotation */}
            {(selectedTemplate === "invoice" && customerInvoices.length > 0) && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Invoice</label>
                <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm">
                  <option value="">Latest invoice</option>
                  {customerInvoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(i.total)}</option>)}
                </select>
              </div>
            )}
            {(selectedTemplate === "quotation" && customerQuotations.length > 0) && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Quotation</label>
                <select value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm">
                  <option value="">Latest quotation</option>
                  {customerQuotations.map((q) => <option key={q.id} value={q.id}>{q.estimateNumber} — {formatCurrency(q.totalAmount)}</option>)}
                </select>
              </div>
            )}

            {/* Message preview / edit */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Message Preview</label>
              <textarea
                value={useCustom ? customMessage : generatedMessage}
                onChange={(e) => { if (useCustom) setCustomMessage(e.target.value); }}
                readOnly={!useCustom}
                rows={5}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm resize-none ${
                  useCustom
                    ? "border-[var(--brand)] focus:outline-none"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={!customer || !finalMessage}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Send className="w-4 h-4" />
              Send via WhatsApp
            </button>
          </div>
        </div>

        {/* Pending reminders */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-slate-800">Pending Payment Reminders</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pendingInvoices.length}</span>
            </div>
            {pendingInvoices.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No pending payments 🎉</p>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.slice(0, 10).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{inv.customerName}</p>
                      <p className="text-xs text-slate-400">{inv.invoiceNumber} · Due: {formatCurrency(inv.balance)}</p>
                    </div>
                    <button
                      onClick={() => {
                        const num = getWhatsAppNumber(inv.customerPhone);
                        if (!num) return;
                        const text = `Hello ${inv.customerName}, this is a reminder that your payment of ${formatCurrency(inv.balance)} for invoice ${inv.invoiceNumber} from AB Pest Control is pending. Thank you!`;
                        window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, "_blank");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors flex-shrink-0"
                    >
                      <Send className="w-3 h-3" />
                      Remind
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick send to all customers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[var(--brand)]" />
              <h2 className="font-bold text-slate-800">All Customers</h2>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-1.5">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.phone}</p>
                  </div>
                  <a
                    href={`https://wa.me/${getWhatsAppNumber(c.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors flex-shrink-0"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Chat
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
