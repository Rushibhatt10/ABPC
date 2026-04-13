import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getWhatsAppNumber } from "../utils/format";
import {
  MessageSquare, Send, Bell, FileText, Receipt,
  Briefcase, RefreshCw, Copy, Check, Search, ChevronRight, X,
} from "lucide-react";

// ── Message templates ──────────────────────────────────────────────────────
function buildMessage(type, data) {
  const { name, service, amount, invoiceNo, estimateNo, amcExpiry, jobDate, phone } = data;
  const sig = "\n\n— AB Pest Control\n📞 +91 98251 88413";

  switch (type) {
    case "quotation":
      return `Hello ${name} 👋,\n\nYour quotation *${estimateNo || ""}* for *${service}* is ready.\n\n💰 Total: *${amount}*\n\nPlease review and confirm at your earliest convenience.${sig}`;
    case "invoice":
      return `Hello ${name} 👋,\n\nYour invoice *${invoiceNo || ""}* for *${service}* has been generated.\n\n💰 Amount: *${amount}*\n\nKindly make the payment at your earliest convenience.${sig}`;
    case "invoice_reminder":
      return `Hello ${name},\n\nThis is a gentle reminder that your invoice *${invoiceNo || ""}* of *${amount}* is still pending.\n\nPlease complete the payment to avoid any inconvenience.${sig}`;
    case "payment_reminder":
      return `Hello ${name},\n\nKindly complete your pending payment of *${amount}* at the earliest.\n\nThank you for choosing AB Pest Control! 🙏${sig}`;
    case "amc_renewal":
      return `Hello ${name} 👋,\n\nYour Annual Maintenance Contract (AMC) is expiring on *${amcExpiry || "soon"}*.\n\nRenew now to continue uninterrupted pest control service at your property.${sig}`;
    case "followup":
      return `Hello ${name} 👋,\n\nWe hope your recent *${service}* service went well!\n\nPlease let us know if you have any concerns or need a follow-up visit. We're always here to help. 😊${sig}`;
    case "custom":
      return `Hello ${name},\n\n${sig}`;
    default:
      return "";
  }
}

const MESSAGE_TYPES = [
  { id: "quotation",        label: "Quotation Share",       icon: FileText,     color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  { id: "invoice",          label: "Invoice Share",         icon: Receipt,      color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  { id: "invoice_reminder", label: "Invoice Reminder",      icon: Bell,         color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  { id: "payment_reminder", label: "Payment Reminder",      icon: Bell,         color: "text-rose-600",   bg: "bg-rose-50 border-rose-200" },
  { id: "amc_renewal",      label: "AMC Renewal",           icon: RefreshCw,    color: "text-emerald-600",bg: "bg-emerald-50 border-emerald-200" },
  { id: "followup",         label: "Job Follow-up",         icon: Briefcase,    color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
  { id: "custom",           label: "Custom Message",        icon: MessageSquare,color: "text-[var(--brand)]", bg: "bg-[var(--brand-soft)] border-[var(--brand)]" },
];

// ── WhatsApp Compose Modal ─────────────────────────────────────────────────
function WhatsAppModal({ job, invoices, quotations, amcs, onClose }) {
  const [msgType, setMsgType] = useState("followup");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const customerInvoices = invoices.filter(i => i.customerId === job.customerId || i.customerName === job.customerName);
  const customerQuotations = quotations.filter(q => q.customerId === job.customerId || q.customerName === job.customerName);
  const customerAmc = amcs.find(a => a.customerId === job.customerId || a.customerName === job.customerName);

  const latestInvoice = customerInvoices[customerInvoices.length - 1];
  const latestQuotation = customerQuotations[customerQuotations.length - 1];

  const data = {
    name: job.customerName || "Customer",
    service: job.treatmentLabel || job.serviceType || job.serviceName || "Pest Control",
    amount: formatCurrency(job.finalPrice || job.totalAmount || latestInvoice?.total || 0),
    invoiceNo: latestInvoice?.invoiceNumber || "",
    estimateNo: latestQuotation?.estimateNumber || "",
    amcExpiry: customerAmc?.endDate ? formatDateDisplay(customerAmc.endDate) : "",
    jobDate: formatDateDisplay(job.scheduledDate),
    phone: job.customerPhone || "",
  };

  // Auto-generate message when type changes
  useEffect(() => {
    setMessage(buildMessage(msgType, data));
  }, [msgType]);

  const phone = getWhatsAppNumber(job.customerPhone);

  const handleSend = () => {
    if (!phone) { alert("No phone number for this customer."); return; }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">Send WhatsApp</p>
              <p className="text-xs text-slate-400">{job.customerName} · {job.customerPhone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Job info strip */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{data.service}</p>
              <p className="text-xs text-slate-400">{data.jobDate} · {data.amount}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
              job.status === "completed" ? "bg-emerald-100 text-emerald-700" :
              job.status === "in_progress" ? "bg-blue-100 text-blue-700" :
              "bg-amber-100 text-amber-700"
            }`}>{job.status || "pending"}</span>
          </div>

          {/* Message type selector */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Message Type</p>
            <div className="grid grid-cols-2 gap-2">
              {MESSAGE_TYPES.map((t) => {
                const Icon = t.icon;
                const active = msgType === t.id;
                return (
                  <button key={t.id} type="button" onClick={() => setMsgType(t.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      active ? `${t.bg} ring-1 ring-current` : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                    }`}>
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? t.color : "text-slate-400"}`} />
                    <span className={active ? t.color : ""}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message preview / edit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message Preview</p>
              <button onClick={handleCopy}
                className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                {copied ? <><Check className="w-3 h-3 text-emerald-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-green-400 focus:outline-none text-sm resize-none bg-slate-50 focus:bg-white transition-colors"
              style={{ fontFamily: "inherit", lineHeight: 1.6 }}
            />
            <p className="text-[10px] text-slate-400 mt-1">You can edit the message before sending.</p>
          </div>

          {/* Send button */}
          <button onClick={handleSend} disabled={!phone || !message.trim()}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-white font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Send via WhatsApp
          </button>

        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const { isEmployee } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [amcs, setAmcs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null); // customerId or name
  const [activeTab, setActiveTab] = useState("jobs"); // "jobs" | "reminders" | "quick"

  useEffect(() => {
    const unsubs = [
      subscribeCollection("jobs", setJobs),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("quotations", setQuotations),
      subscribeCollection("amc", setAmcs),
      subscribeCollection("customers", setCustomers),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const pendingInvoices = useMemo(() => invoices.filter(i => Number(i.balance || 0) > 0), [invoices]);

  // Group jobs by customer (unique by customerId or customerName)
  const customerGroups = useMemo(() => {
    const q = search.toLowerCase();
    const map = new Map();
    [...jobs].reverse().forEach(job => {
      const key = job.customerId || job.customerName;
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: job.customerName,
          phone: job.customerPhone || "",
          jobs: [],
        });
      }
      map.get(key).jobs.push(job);
    });
    return [...map.values()].filter(g =>
      !q || g.name?.toLowerCase().includes(q) || g.phone?.includes(q)
    );
  }, [jobs, search]);

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
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">WhatsApp</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Select a job or customer to send a message</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {[
          { key: "jobs",      label: "Jobs",      badge: jobs.length },
          { key: "reminders", label: "Reminders", badge: pendingInvoices.length, alert: pendingInvoices.length > 0 },
          { key: "quick",     label: "Quick Send", badge: customers.length },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === t.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
              t.alert ? "bg-rose-500 text-white" :
              activeTab === t.key ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
            }`}>{t.badge}</span>
          </button>
        ))}
      </div>

      {/* ── JOBS TAB ── */}
      {activeTab === "jobs" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by customer or phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
          </div>

          {customerGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No customers found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customerGroups.map(group => {
                const isOpen = expandedCustomer === group.key;
                const customerAmc = amcs.find(a => a.customerId === group.key || a.customerName === group.name);
                return (
                  <div key={group.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    {/* Customer row */}
                    <button onClick={() => setExpandedCustomer(isOpen ? null : group.key)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left">
                      <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-xs font-black flex-shrink-0">
                        {group.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{group.name}</p>
                        <p className="text-xs text-slate-400">{group.phone} · {group.jobs.length} job{group.jobs.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {customerAmc && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">AMC</span>
                        )}
                        <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      </div>
                    </button>

                    {/* Expanded: jobs + AMC */}
                    {isOpen && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-2">

                        {/* AMC card if exists */}
                        {customerAmc && (
                          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-emerald-800">AMC Active</p>
                              <p className="text-[10px] text-emerald-600">
                                {customerAmc.services?.map(s => s.itemName).join(", ")} · Expires {customerAmc.endDate}
                              </p>
                            </div>
                            <button onClick={() => setSelectedJob({ ...group.jobs[0], _amcRenewal: true, customerName: group.name, customerPhone: group.phone })}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: "#25D366" }}>
                              <MessageSquare className="w-3 h-3" /> Renew
                            </button>
                          </div>
                        )}

                        {/* Jobs list */}
                        {group.jobs.map(job => (
                          <div key={job.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-200">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">{job.treatmentLabel || job.serviceType || job.serviceName}</p>
                              <p className="text-[10px] text-slate-400">{job.scheduledDate} · {job.finalPrice ? `₹${Number(job.finalPrice).toLocaleString("en-IN")}` : ""}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                              job.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                              job.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                              "bg-amber-100 text-amber-700"
                            }`}>{job.status || "pending"}</span>
                            <button onClick={() => setSelectedJob(job)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: "#25D366" }}>
                              <MessageSquare className="w-3 h-3" /> Send
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REMINDERS TAB ── */}
      {activeTab === "reminders" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
            <Bell className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-bold text-amber-700">{pendingInvoices.length} pending payment{pendingInvoices.length !== 1 ? "s" : ""}</p>
          </div>
          {pendingInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <Check className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
              <p className="text-sm text-slate-400">All payments collected 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingInvoices.map(inv => {
                const num = getWhatsAppNumber(inv.customerPhone);
                const text = `Hello ${inv.customerName}, this is a reminder that your payment of ${formatCurrency(inv.balance)} for invoice ${inv.invoiceNumber} from AB Pest Control is pending. Please complete the payment at your earliest convenience.\n\n— AB Pest Control\n📞 +91 98251 88413`;
                return (
                  <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm">{inv.customerName}</p>
                      <p className="text-xs text-slate-400">{inv.invoiceNumber} · Due: <span className="font-semibold text-amber-600">{formatCurrency(inv.balance)}</span></p>
                    </div>
                    <a href={num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : "#"}
                      target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0 active:scale-95 transition-all"
                      style={{ background: "#25D366" }}>
                      <Send className="w-3 h-3" /> Remind
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── QUICK SEND TAB ── */}
      {activeTab === "quick" && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 px-1">Tap to open WhatsApp chat directly</p>
          {customers.map(c => {
            const num = getWhatsAppNumber(c.phone);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-xs font-black flex-shrink-0">
                  {c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.phone}</p>
                </div>
                <a href={num ? `https://wa.me/${num}` : "#"} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0 active:scale-95 transition-all"
                  style={{ background: "#25D366" }}>
                  <MessageSquare className="w-3 h-3" /> Chat
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedJob && (
        <WhatsAppModal
          job={selectedJob}
          invoices={invoices}
          quotations={quotations}
          amcs={amcs}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
