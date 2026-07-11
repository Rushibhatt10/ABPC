import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, formatDateTime, getWhatsAppNumber, roundMoney, toDateObject } from "../utils/format";
import {
  TrendingUp, CheckCircle2, Clock, MessageSquare, Search, IndianRupee, X,
  User, Phone, MapPin, Briefcase, Calendar, ExternalLink, Receipt, ChevronRight,
  CreditCard, History,
} from "lucide-react";

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
};

const PAYMENT_MODES = ["Cash", "UPI", "Cheque", "Bank Transfer", "Card"];

const MODE_COLORS = {
  Cash: "#16a34a",
  UPI: "#7c3aed",
  Cheque: "#0369a1",
  "Bank Transfer": "#b45309",
  Card: "#e4572e",
};

function getInvoiceJobIds(invoice) {
  const ids = new Set();
  if (invoice?.jobId) ids.add(invoice.jobId);
  (invoice?.jobIds || []).forEach((id) => ids.add(id));
  (invoice?.items || []).forEach((item) => { if (item.jobId) ids.add(item.jobId); });
  return [...ids];
}

function getPaymentHistory(invoice) {
  if (invoice?.paymentHistory?.length) {
    return [...invoice.paymentHistory].sort((a, b) => {
      const aTime = toDateObject(a.at)?.getTime() || 0;
      const bTime = toDateObject(b.at)?.getTime() || 0;
      return bTime - aTime;
    });
  }
  if (Number(invoice?.received) > 0) {
    const at = invoice.updatedAt?.toDate?.()?.toISOString()
      || invoice.lastPaymentAt
      || invoice.date
      || "";
    return [{
      amount: Number(invoice.received),
      mode: invoice.paymentMode || "—",
      at,
      note: invoice.status === "Paid" ? "Payment recorded" : "Partial payment recorded",
      synthetic: true,
    }];
  }
  return [];
}

function DetailRow({ label, value, icon: Icon, href }) {
  const content = (
    <div className="flex items-start gap-2.5">
      {Icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.45)" }} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
        <p className="text-sm font-semibold text-white mt-0.5 break-words">{value || "—"}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }
  return content;
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={glass}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        {Icon && <Icon className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />}
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.5)" }}>{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Small modal to record a partial or full payment */
function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(invoice.balance || ""));
  const [mode, setMode] = useState(invoice.paymentMode || "UPI");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0) { alert("Enter a valid amount."); return; }
    setSaving(true);
    try {
      const newReceived = Number(invoice.received || 0) + paid;
      const newBalance = Math.max(0, Number(invoice.total || 0) - newReceived);
      const at = new Date().toISOString();
      const entry = {
        amount: paid,
        mode,
        at,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      await updateRecord("invoices", invoice.id, {
        received: newReceived,
        balance: newBalance,
        paymentMode: mode,
        status: newBalance === 0 ? "Paid" : "Partial",
        paymentHistory: [...(invoice.paymentHistory || []), entry],
        lastPaymentAt: at,
      });
      onSaved();
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
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
            <input type="number" min="0.01" max={invoice.balance} step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setAmount(String(roundMoney(Number(invoice.balance) * pct / 100)))}
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
              {PAYMENT_MODES.map(m => (
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Advance, final settlement, cheque #123"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
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

function PaymentDetailPanel({ invoice, jobs, customer, onRecordPayment, onMarkPaid, onSendReminder }) {
  const linkedJobs = useMemo(() => {
    const ids = getInvoiceJobIds(invoice);
    return ids.map((id) => jobs.find((j) => j.id === id)).filter(Boolean);
  }, [invoice, jobs]);

  const paymentHistory = useMemo(() => getPaymentHistory(invoice), [invoice]);
  const isPaid = Number(invoice.balance || 0) === 0;
  const waLink = getWhatsAppNumber(invoice.customerPhone || customer?.phone)
    ? `https://wa.me/${getWhatsAppNumber(invoice.customerPhone || customer?.phone)}`
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-5" style={{ ...glass, border: `1px solid ${isPaid ? "rgba(76,122,45,0.25)" : "rgba(228,87,46,0.25)"}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white">{invoice.invoiceNumber}</h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={
                isPaid
                  ? { background: "rgba(76,122,45,0.2)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }
                  : { background: "rgba(228,87,46,0.15)", color: "#E4572E", border: "1px solid rgba(228,87,46,0.3)" }
              }>{invoice.status || (isPaid ? "Paid" : "Pending")}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
              Invoice date: {formatDateDisplay(invoice.date)}
              {invoice.lastPaymentAt && <> · Last payment: {formatDateTime(invoice.lastPaymentAt)}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-white">{formatCurrency(invoice.total)}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: isPaid ? "#6DBF4A" : "#E4572E" }}>
              {isPaid ? "Fully paid" : `Balance: ${formatCurrency(invoice.balance)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {!isPaid && (
            <>
              <button onClick={onRecordPayment}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition-all"
                style={{ background: "linear-gradient(135deg,#1F3D1F,#4C7A2D)" }}>
                <IndianRupee className="w-3.5 h-3.5" /> Record Payment
              </button>
              <button onClick={onMarkPaid}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(76,122,45,0.15)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Fully Paid
              </button>
              <button onClick={onSendReminder}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(34,197,94,0.1)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.2)" }}>
                <MessageSquare className="w-3.5 h-3.5" /> Send Reminder
              </button>
            </>
          )}
          <Link to={`/admin/invoices/${invoice.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ExternalLink className="w-3.5 h-3.5" /> View Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer */}
        <SectionCard title="Customer Details" icon={User}>
          <div className="space-y-3">
            <DetailRow label="Name" value={invoice.customerName || customer?.name} icon={User} />
            <DetailRow label="Phone" value={invoice.customerPhone || customer?.phone} icon={Phone} href={waLink} />
            <DetailRow label="Address" value={invoice.customerAddress || customer?.address} icon={MapPin} />
            {(invoice.customerId || customer?.id) && (
              <DetailRow label="Customer ID" value={invoice.customerId || customer?.id} icon={Receipt} />
            )}
          </div>
        </SectionCard>

        {/* Payment summary */}
        <SectionCard title="Payment Summary" icon={CreditCard}>
          <div className="space-y-2.5">
            {[
              { label: "Invoice Total", value: formatCurrency(invoice.total), color: "white" },
              { label: "Amount Received", value: formatCurrency(invoice.received), color: "#6DBF4A" },
              { label: "Balance Due", value: formatCurrency(invoice.balance), color: Number(invoice.balance) > 0 ? "#E4572E" : "#6DBF4A" },
              { label: "Payment Mode", value: invoice.paymentMode || "—", color: MODE_COLORS[invoice.paymentMode] || "rgba(255,255,255,0.7)" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>{row.label}</span>
                <span className="font-bold" style={{ color: row.color }}>{row.value}</span>
              </div>
            ))}
            {Number(invoice.discountTotal) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Discount</span>
                <span className="font-bold" style={{ color: "#F87171" }}>-{formatCurrency(invoice.discountTotal)}</span>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Linked jobs */}
      <SectionCard title={`Linked Jobs (${linkedJobs.length || invoice.items?.length || 0})`} icon={Briefcase}>
        {linkedJobs.length > 0 ? (
          <div className="space-y-3">
            {linkedJobs.map((job) => (
              <div key={job.id} className="rounded-xl p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm">{job.treatmentLabel || job.serviceType || job.serviceName || "Service"}</p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>Job #{job.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <p className="font-black text-sm text-white shrink-0">{formatCurrency(job.finalPrice || job.totalAmount || job.basePrice)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  {job.scheduledDate && (
                    <div>
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Scheduled</p>
                      <p className="font-semibold text-white mt-0.5">{formatDateDisplay(job.scheduledDate)}</p>
                    </div>
                  )}
                  {job.completedAt && (
                    <div>
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Completed</p>
                      <p className="font-semibold text-white mt-0.5">{formatDateTime(job.completedAt)}</p>
                    </div>
                  )}
                  {job.assignedTo && (
                    <div>
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Assigned To</p>
                      <p className="font-semibold text-white mt-0.5">{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</p>
                    </div>
                  )}
                  {job.status && (
                    <div>
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Status</p>
                      <p className="font-semibold text-white mt-0.5 capitalize">{job.status.replace("_", " ")}</p>
                    </div>
                  )}
                  {(job.address || job.customerAddress) && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Job Address</p>
                      <p className="font-semibold text-white mt-0.5">{job.address || job.customerAddress}</p>
                    </div>
                  )}
                  {job.warranty && (
                    <div>
                      <p className="font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>Warranty</p>
                      <p className="font-semibold mt-0.5" style={{ color: "#6DBF4A" }}>{job.warranty}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(invoice.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2" style={{ borderBottom: idx < (invoice.items.length - 1) ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div>
                  <p className="font-semibold text-white">{item.itemName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Qty: {item.quantity} {item.unit || ""}</p>
                </div>
                <p className="font-bold text-white">{formatCurrency(item.finalAmount || item.total || (item.quantity * item.price))}</p>
              </div>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.3)" }}>No job or line item details available</p>
            )}
          </div>
        )}
      </SectionCard>

      {/* Invoice line items */}
      {invoice.items?.length > 0 && linkedJobs.length > 0 && (
        <SectionCard title="Invoice Line Items" icon={Receipt}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-400px">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Service", "Qty", "Rate", "Amount"].map((h, i) => (
                    <th key={h} className={`py-2 text-xs font-bold uppercase tracking-wider ${i > 0 ? "text-right" : "text-left"}`}
                      style={{ color: "rgba(255,255,255,0.35)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2.5 font-semibold text-white">{item.itemName}</td>
                    <td className="py-2.5 text-right" style={{ color: "rgba(255,255,255,0.6)" }}>{item.quantity}</td>
                    <td className="py-2.5 text-right" style={{ color: "rgba(255,255,255,0.6)" }}>{formatCurrency(item.price || item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-bold text-white">{formatCurrency(item.finalAmount || item.total || (item.quantity * item.price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* Payment history */}
      <SectionCard title={`Payment History (${paymentHistory.length})`} icon={History}>
        {paymentHistory.length > 0 ? (
          <div className="space-y-0">
            {paymentHistory.map((entry, idx) => (
              <div key={idx} className="flex gap-3 py-3" style={{ borderBottom: idx < paymentHistory.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(76,122,45,0.15)", border: "1px solid rgba(76,122,45,0.25)" }}>
                  <IndianRupee className="w-3.5 h-3.5" style={{ color: "#6DBF4A" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-sm">{formatCurrency(entry.amount)}</p>
                      <p className="text-xs mt-0.5" style={{ color: MODE_COLORS[entry.mode] || "rgba(255,255,255,0.5)" }}>{entry.mode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-white flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
                        {formatDateDisplay(entry.at)}
                      </p>
                      <p className="text-[10px] mt-0.5 flex items-center gap-1 justify-end" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Clock className="w-3 h-3" />
                        {formatDateTime(entry.at).split(", ").slice(1).join(", ") || formatDateTime(entry.at)}
                      </p>
                    </div>
                  </div>
                  {entry.note && (
                    <p className="text-xs mt-1.5 px-2 py-1 rounded-lg inline-block" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}>
                      {entry.note}
                    </p>
                  )}
                  {entry.synthetic && (
                    <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Estimated from invoice totals — future payments will be logged individually</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <History className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>No payments recorded yet</p>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Use Record Payment to log the first entry</p>
          </div>
        )}
      </SectionCard>

      {invoice.terms && (
        <SectionCard title="Terms" icon={Receipt}>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.5)" }}>{invoice.terms}</p>
        </SectionCard>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const { isEmployee } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [selectedId, setSelectedId] = useState(null);
  const [recordInvoice, setRecordInvoice] = useState(null);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("customers", setCustomers),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const filtered = useMemo(() => {
    let list = [...invoices];
    if (filter === "pending") list = list.filter(i => Number(i.balance || 0) > 0);
    if (filter === "paid") list = list.filter(i => Number(i.balance || 0) === 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.customerName?.toLowerCase().includes(q) ||
        i.invoiceNumber?.toLowerCase().includes(q) ||
        i.customerPhone?.includes(q) ||
        getInvoiceJobIds(i).some((jid) => jid.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (sortBy === "amount-high") return Number(b.total || 0) - Number(a.total || 0);
      if (sortBy === "amount-low") return Number(a.total || 0) - Number(b.total || 0);
      if (sortBy === "balance-high") return Number(b.balance || 0) - Number(a.balance || 0);
      const aDate = toDateObject(a.lastPaymentAt || a.date)?.getTime() || 0;
      const bDate = toDateObject(b.lastPaymentAt || b.date)?.getTime() || 0;
      return sortBy === "oldest" ? aDate - bDate : bDate - aDate;
    });
    return list;
  }, [invoices, filter, search, sortBy]);

  const selectedInvoice = useMemo(
    () => filtered.find((i) => i.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  const customerMap = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c])),
    [customers]
  );

  const stats = useMemo(() => ({
    collected: invoices.reduce((s, i) => s + Number(i.received || 0), 0),
    pending: invoices.reduce((s, i) => s + Number(i.balance || 0), 0),
    paidCount: invoices.filter(i => Number(i.balance || 0) === 0).length,
    pendingCount: invoices.filter(i => Number(i.balance || 0) > 0).length,
  }), [invoices]);

  const markPaid = async (inv) => {
    try {
      const balance = Number(inv.balance || 0);
      const at = new Date().toISOString();
      const history = [...(inv.paymentHistory || [])];
      if (balance > 0) {
        history.push({
          amount: balance,
          mode: inv.paymentMode || "—",
          at,
          note: "Marked as fully paid",
        });
      }
      await updateRecord("invoices", inv.id, {
        received: inv.total,
        balance: 0,
        status: "Paid",
        paymentHistory: history,
        lastPaymentAt: at,
      });
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
        <p className="mt-0.5 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Full payment details — customers, jobs, dates & history</p>
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
          { label: "Total Collected", value: formatCurrency(stats.collected), icon: TrendingUp, accent: "#4C7A2D" },
          { label: "Total Pending", value: formatCurrency(stats.pending), icon: Clock, accent: "#E4572E" },
          { label: "Paid Invoices", value: stats.paidCount, icon: CheckCircle2, accent: "#4C7A2D" },
          { label: "Pending Invoices", value: stats.pendingCount, icon: Clock, accent: "#E4572E" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02]"
              style={{ ...glass, border: `1px solid ${s.accent}33` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.accent}22` }}>
                <Icon className="w-18px h-18px" style={{ color: s.accent }} />
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
            placeholder="Search customer, invoice, phone, or job..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={filter === tab.key
                ? { background: "linear-gradient(135deg,#2F4F2F,#4C7A2D)", color: "#fff", boxShadow: "0 0 16px rgba(76,122,45,0.3)" }
                : { ...glass, color: "rgba(255,255,255,0.6)" }}>
              {tab.label}
            </button>
          ))}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{ ...glass, color: "rgba(255,255,255,0.6)" }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="balance-high">Highest balance</option>
            <option value="amount-high">Highest amount</option>
            <option value="amount-low">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Master-detail layout */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 sm:p-12 text-center" style={glass}>
          <TrendingUp className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
          <p className="font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>No payments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5">
          {/* Invoice list */}
          <div className="lg:col-span-2 space-y-2 max-h-[70vh] lg:overflow-y-auto lg:pr-1">
            {filtered.map((inv) => {
              const active = selectedInvoice?.id === inv.id;
              const isPaid = Number(inv.balance || 0) === 0;
              const jobCount = getInvoiceJobIds(inv).length;
              return (
                <button key={inv.id} type="button" onClick={() => setSelectedId(inv.id)}
                  className="w-full text-left rounded-2xl p-4 transition-all"
                  style={{
                    ...glass,
                    border: active ? "1px solid rgba(76,122,45,0.45)" : glass.border,
                    background: active ? "rgba(76,122,45,0.08)" : glass.background,
                    boxShadow: active ? "0 0 20px rgba(76,122,45,0.12)" : "none",
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-sm">{inv.invoiceNumber}</p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={
                          isPaid
                            ? { background: "rgba(76,122,45,0.2)", color: "#6DBF4A" }
                            : { background: "rgba(228,87,46,0.15)", color: "#E4572E" }
                        }>{isPaid ? "Paid" : "Pending"}</span>
                      </div>
                      <p className="text-sm font-semibold mt-1 truncate" style={{ color: "rgba(255,255,255,0.7)" }}>{inv.customerName}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateDisplay(inv.date)}</span>
                        {jobCount > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{jobCount} job{jobCount !== 1 ? "s" : ""}</span>}
                        {inv.paymentMode && <span>{inv.paymentMode}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-start gap-1">
                      <div>
                        <p className="font-black text-white text-sm">{formatCurrency(inv.total)}</p>
                        {!isPaid && <p className="text-[10px] font-bold mt-0.5" style={{ color: "#E4572E" }}>Due {formatCurrency(inv.balance)}</p>}
                        {isPaid && <p className="text-[10px] font-bold mt-0.5" style={{ color: "#6DBF4A" }}>Received {formatCurrency(inv.received)}</p>}
                      </div>
                      <ChevronRight className="w-4 h-4 mt-1 hidden lg:block" style={{ color: active ? "#6DBF4A" : "rgba(255,255,255,0.2)" }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3 lg:max-h-[70vh] lg:overflow-y-auto">
            {selectedInvoice ? (
              <PaymentDetailPanel
                invoice={selectedInvoice}
                jobs={jobs}
                customer={customerMap[selectedInvoice.customerId]}
                onRecordPayment={() => setRecordInvoice(selectedInvoice)}
                onMarkPaid={() => markPaid(selectedInvoice)}
                onSendReminder={() => sendReminder(selectedInvoice)}
              />
            ) : (
              <div className="rounded-2xl p-12 text-center" style={glass}>
                <Receipt className="w-12 h-12 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>Select an invoice to view details</p>
              </div>
            )}
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
