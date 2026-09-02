import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, formatDateTime, getWhatsAppNumber, roundMoney, toDateObject } from "../utils/format";
import {
  TrendingUp, CheckCircle2, Clock, MessageSquare, Search, IndianRupee, X,
  User, Phone, MapPin, Briefcase, Calendar, ExternalLink, Receipt, ChevronRight,
  CreditCard, History, Building2, Pencil, Check,
} from "lucide-react";

export const BANK_ACCOUNTS = [
  {
    id: "iob_278",
    bankName: "Indian Overseas Bank",
    accountHolder: "Divyesh Ahir Thakor",
    accountNumber: "155701000007278",
    accountNumberMasked: "155701000007278",
    ifsc: "IOBA0001557",
    branch: "Anand Mahal Road",
    upiId: "DIVYESHBHAITHAKORBHAIAHIR426@iob",
  },
  {
    id: "boi_138",
    bankName: "Bank of India",
    accountHolder: "Neelam Sharma",
    accountNumber: "696010110015138",
    accountNumberMasked: "696010110015138",
    ifsc: "BKID0006960",
  },
  {
    id: "kotak_729",
    bankName: "Kotak Mahindra Bank Ltd.",
    accountHolder: "Ankit Harshadbhai Bhatt",
    accountNumber: "4148696729",
    accountNumberMasked: "4148696729",
    upiId: "9374488004@kotakbank",
  },
  {
    id: "gpay_okicici",
    bankName: "Google Pay / ICICI Bank",
    accountHolder: "Akanksha Bhatt",
    accountNumber: "",
    accountNumberMasked: "",
    ifsc: "",
    branch: "",
    upiId: "bhattakanksha029-6@okicici",
  },
];

const MODE_COLORS = {
  Cash: "#16a34a",
  UPI: "#7c3aed",
  Cheque: "#0284c7",
  "Bank Transfer": "#d97706",
  Card: "#ea580c",
};

const PAYMENT_MODES = ["UPI", "Cheque", "Bank Transfer", "Cash"];

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
      receivedIn: invoice.lastReceivedIn || "—",
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
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-slate-100 border border-slate-200">
          <Icon className="w-3.5 h-3.5 text-slate-500" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5 break-words">{value || "—"}</p>
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 bg-slate-50 border-b border-slate-200">
        {Icon && <Icon className="w-4 h-4 text-slate-400" />}
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</p>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Small modal to record a partial or full payment */
function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(invoice.balance || ""));
  const [mode, setMode] = useState(invoice.paymentMode || "UPI");
  const [selectedBankId, setSelectedBankId] = useState(invoice.lastBankAccountId || "");
  const [bankError, setBankError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const requiresBankSelection = mode === "UPI" || mode === "Cheque" || mode === "Bank Transfer";

  const handleSave = async () => {
    const paid = parseFloat(amount);
    if (!paid || paid <= 0) { alert("Enter a valid amount."); return; }
    if (requiresBankSelection && !selectedBankId) {
      setBankError("Please select the bank account where payment was received.");
      return;
    }
    setSaving(true);
    try {
      const bankObj = requiresBankSelection ? BANK_ACCOUNTS.find(b => b.id === selectedBankId) : null;
      const newReceived = Number(invoice.received || 0) + paid;
      const newBalance = Math.max(0, Number(invoice.total || 0) - newReceived);
      const at = new Date().toISOString();
      const receivedInText = requiresBankSelection
        ? (bankObj
          ? `${bankObj.bankName} · ${bankObj.accountHolder} (A/C: ${bankObj.accountNumber}${bankObj.upiId ? ` · UPI: ${bankObj.upiId}` : ""})`
          : "")
        : "Cash";
      const entry = {
        amount: paid,
        mode,
        bankAccountId: requiresBankSelection ? (selectedBankId || "") : "",
        bankName: requiresBankSelection ? (bankObj?.bankName || "") : "",
        accountHolder: requiresBankSelection ? (bankObj?.accountHolder || "") : "",
        accountNumber: requiresBankSelection ? (bankObj?.accountNumber || "") : "",
        accountNumberMasked: requiresBankSelection ? (bankObj?.accountNumber || "") : "",
        ifsc: requiresBankSelection ? (bankObj?.ifsc || "") : "",
        branch: requiresBankSelection ? (bankObj?.branch || "") : "",
        upiId: requiresBankSelection ? (bankObj?.upiId || "") : "",
        receivedIn: receivedInText,
        at,
        ...(note.trim() ? { note: note.trim() } : {}),
      };
      await updateRecord("invoices", invoice.id, {
        received: newReceived,
        balance: newBalance,
        paymentMode: mode,
        lastBankAccountId: requiresBankSelection ? (selectedBankId || "") : "",
        lastReceivedIn: receivedInText,
        status: newBalance === 0 ? "Paid" : "Partial",
        paymentHistory: [...(invoice.paymentHistory || []), entry],
        lastPaymentAt: at,
      });
      onSaved();
    } catch (e) { alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden bg-white border border-slate-200 text-slate-900">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <p className="font-bold text-slate-900 text-sm">Record Payment</p>
            <p className="text-xs text-slate-500 mt-0.5">{invoice.customerName} · {invoice.invoiceNumber}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            {[
              { label: "Total", value: formatCurrency(invoice.total), color: "text-slate-800" },
              { label: "Received", value: formatCurrency(invoice.received), color: "text-emerald-600" },
              { label: "Balance", value: formatCurrency(invoice.balance), color: "text-rose-600" },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-2.5 bg-slate-50 border border-slate-200">
                <p className={`font-black text-sm ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 font-bold text-slate-400 uppercase text-[10px]">{s.label}</p>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Amount Received (₹)</label>
            <input type="number" min="0.01" max={invoice.balance} step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-900 bg-white border border-slate-200 focus:border-emerald-600 focus:outline-none" />
            <div className="flex gap-2 mt-2">
              {[25, 50, 75, 100].map(pct => (
                <button key={pct} type="button"
                  onClick={() => setAmount(String(roundMoney(Number(invoice.balance) * pct / 100)))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300">
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => {
                  setMode(m);
                  if (m === "Cash") {
                    setSelectedBankId("");
                    setBankError("");
                  }
                }}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                    mode === m
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {requiresBankSelection && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Payment Received In <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2">
                {BANK_ACCOUNTS.map((acc) => {
                  const isSelected = selectedBankId === acc.id;
                  return (
                    <label
                      key={acc.id}
                      onClick={() => { setSelectedBankId(acc.id); setBankError(""); }}
                      className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentReceivedInBank"
                        value={acc.id}
                        checked={isSelected}
                        onChange={() => { setSelectedBankId(acc.id); setBankError(""); }}
                        className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer shrink-0 mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900">{acc.bankName}</p>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                          Account Holder: <span className="font-semibold text-slate-800">{acc.accountHolder}</span>
                        </p>
                        {acc.accountNumber && (
                          <p className="text-[11px] font-mono font-semibold text-slate-700 mt-0.5">
                            A/C No: {acc.accountNumber}
                          </p>
                        )}
                        {acc.upiId && (
                          <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                            UPI ID: <span className="font-mono font-semibold text-purple-700">{acc.upiId}</span>
                          </p>
                        )}
                        {acc.ifsc && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            IFSC: <span className="font-mono">{acc.ifsc}</span>{acc.branch ? ` · ${acc.branch}` : ""}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {bankError && (
                <p className="text-xs font-semibold text-rose-600 mt-1.5">{bankError}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Note (optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="e.g. Advance, final settlement, cheque #123"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-900 bg-white border border-slate-200 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none" />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 bg-emerald-600 hover:bg-emerald-700 shadow-md">
              {saving ? "Saving…" : "Save Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentDetailPanel({ invoice, jobs, customer, onRecordPayment, onMarkPaid, onSendReminder }) {
  const [editingBankIdx, setEditingBankIdx] = useState(null);
  const [editingBankId, setEditingBankId] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const handleSaveBank = async (entryIdx) => {
    if (!editingBankId) return;
    setSavingBank(true);
    const bankObj = BANK_ACCOUNTS.find(b => b.id === editingBankId);
    const history = [...(invoice.paymentHistory || [])];
    history[entryIdx] = {
      ...history[entryIdx],
      bankAccountId: editingBankId,
      bankName: bankObj?.bankName || "",
      accountHolder: bankObj?.accountHolder || "",
      accountNumber: bankObj?.accountNumber || "",
      accountNumberMasked: bankObj?.accountNumber || "",
      upiId: bankObj?.upiId || "",
      ifsc: bankObj?.ifsc || "",
      branch: bankObj?.branch || "",
      receivedIn: bankObj ? `${bankObj.bankName} · ${bankObj.accountHolder}${bankObj.accountNumber ? ` (A/C: ${bankObj.accountNumber})` : ""}${bankObj.upiId ? ` · UPI: ${bankObj.upiId}` : ""}` : "",
    };
    await updateRecord("invoices", invoice.id, {
      paymentHistory: history,
      lastBankAccountId: editingBankId,
      lastReceivedIn: history[entryIdx].receivedIn,
    });
    setSavingBank(false);
    setEditingBankIdx(null);
    setEditingBankId("");
  };
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
      <div className={`rounded-2xl p-5 border bg-white shadow-sm ${isPaid ? "border-emerald-200" : "border-rose-200"}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-slate-900">{invoice.invoiceNumber}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isPaid
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-rose-50 text-rose-700 border-rose-300"
              }`}>{invoice.status || (isPaid ? "Paid" : "Pending")}</span>
            </div>
            <p className="text-sm mt-1 text-slate-500">
              Invoice date: {formatDateDisplay(invoice.date)}
              {invoice.lastPaymentAt && <> · Last payment: {formatDateTime(invoice.lastPaymentAt)}</>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900">{formatCurrency(invoice.total)}</p>
            <p className={`text-xs font-bold mt-0.5 ${isPaid ? "text-emerald-600" : "text-rose-600"}`}>
              {isPaid ? "Fully paid" : `Balance: ${formatCurrency(invoice.balance)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
          {(String(invoice.paymentMode || "").toLowerCase() !== "cash") && (
            <button onClick={onRecordPayment}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs">
              <IndianRupee className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}
          {!isPaid && (
            <>
              <button onClick={onMarkPaid}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 transition-all">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Fully Paid
              </button>
              <button onClick={onSendReminder}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-all">
                <MessageSquare className="w-3.5 h-3.5" /> Send Reminder
              </button>
            </>
          )}
          <Link to={`/admin/invoices/${invoice.id}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-all">
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
              { label: "Invoice Total", value: formatCurrency(invoice.total), color: "text-slate-900" },
              { label: "Amount Received", value: formatCurrency(invoice.received), color: "text-emerald-600" },
              { label: "Balance Due", value: formatCurrency(invoice.balance), color: Number(invoice.balance) > 0 ? "text-rose-600" : "text-emerald-600" },
              { label: "Payment Mode", value: invoice.paymentMode || "—", color: MODE_COLORS[invoice.paymentMode] ? "" : "text-slate-700" },
              { label: "Received In", value: (invoice.paymentMode === "Cash" ? "Cash" : (invoice.lastReceivedIn || invoice.receivedIn || "—")), color: "text-slate-800" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">{row.label}</span>
                <span className={`font-bold ${row.color}`} style={row.label === "Payment Mode" && MODE_COLORS[row.value] ? { color: MODE_COLORS[row.value] } : {}}>{row.value}</span>
              </div>
            ))}
            {Number(invoice.discountTotal) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Discount</span>
                <span className="font-bold text-rose-600">-{formatCurrency(invoice.discountTotal)}</span>
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
              <div key={job.id} className="rounded-xl p-3.5 bg-slate-50 border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm">{job.treatmentLabel || job.serviceType || job.serviceName || "Service"}</p>
                    <p className="text-xs mt-0.5 font-mono text-slate-400">Job #{job.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <p className="font-black text-sm text-slate-900 shrink-0">{formatCurrency(job.finalPrice || job.totalAmount || job.basePrice)}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  {job.scheduledDate && (
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400">Scheduled</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{formatDateDisplay(job.scheduledDate)}</p>
                    </div>
                  )}
                  {job.completedAt && (
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400">Completed</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{formatDateTime(job.completedAt)}</p>
                    </div>
                  )}
                  {job.assignedTo && (
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400">Assigned To</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</p>
                    </div>
                  )}
                  {job.status && (
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400">Status</p>
                      <p className="font-semibold text-slate-800 mt-0.5 capitalize">{job.status.replace("_", " ")}</p>
                    </div>
                  )}
                  {(job.address || job.customerAddress) && (
                    <div className="col-span-2 sm:col-span-3">
                      <p className="font-bold uppercase tracking-wider text-slate-400">Job Address</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{job.address || job.customerAddress}</p>
                    </div>
                  )}
                  {job.warranty && (
                    <div>
                      <p className="font-bold uppercase tracking-wider text-slate-400">Warranty</p>
                      <p className="font-semibold text-emerald-600 mt-0.5">{job.warranty}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(invoice.items || []).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0">
                <div>
                  <p className="font-semibold text-slate-900">{item.itemName}</p>
                  <p className="text-xs mt-0.5 text-slate-400">Qty: {item.quantity} {item.unit || ""}</p>
                </div>
                <p className="font-bold text-slate-900">{formatCurrency(item.finalAmount || item.total || (item.quantity * item.price))}</p>
              </div>
            ))}
            {(!invoice.items || invoice.items.length === 0) && (
              <p className="text-sm text-center py-4 text-slate-400">No job or line item details available</p>
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
                <tr className="border-b border-slate-200">
                  {["Service", "Qty", "Rate", "Amount"].map((h, i) => (
                    <th key={h} className={`py-2 text-xs font-bold uppercase tracking-wider text-slate-400 ${i > 0 ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-2.5 font-semibold text-slate-900">{item.itemName}</td>
                    <td className="py-2.5 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-2.5 text-right text-slate-600">{formatCurrency(item.price || item.unitPrice)}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">{formatCurrency(item.finalAmount || item.total || (item.quantity * item.price))}</td>
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
          <div className="space-y-0 divide-y divide-slate-100">
            {paymentHistory.map((entry, idx) => (
              <div key={idx} className="flex gap-3 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-emerald-50 border border-emerald-200">
                  <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{formatCurrency(entry.amount)}</p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: MODE_COLORS[entry.mode] || "#475569" }}>{entry.mode}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {formatDateDisplay(entry.at)}
                      </p>
                      <p className="text-[10px] mt-0.5 flex items-center gap-1 justify-end text-slate-400">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(entry.at).split(", ").slice(1).join(", ") || formatDateTime(entry.at)}
                      </p>
                    </div>
                  </div>
                  {entry.note && (
                    <p className="text-xs mt-1.5 px-2 py-1 rounded-lg inline-block bg-slate-100 text-slate-600 font-medium">
                      {entry.note}
                    </p>
                  )}

                  {/* Bank account display + inline edit */}
                  <div className="mt-1.5">
                    {entry.mode === "Cash" ? (
                      <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                        Cash
                      </div>
                    ) : editingBankIdx === idx ? (
                      <div className="border border-emerald-300 rounded-xl bg-emerald-50/60 p-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Select Bank Account</p>
                        <div className="space-y-1.5">
                          {BANK_ACCOUNTS.map(acc => (
                            <label key={acc.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-all ${
                                editingBankId === acc.id
                                  ? "bg-white border-emerald-500 ring-2 ring-emerald-500/20"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}>
                              <input type="radio" name={`edit-bank-${idx}`} value={acc.id}
                                checked={editingBankId === acc.id}
                                onChange={() => setEditingBankId(acc.id)}
                                className="w-3.5 h-3.5 accent-emerald-600 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900">{acc.bankName}</p>
                                <p className="text-[10px] text-slate-600">{acc.accountHolder}</p>
                                {acc.accountNumber && <p className="text-[10px] font-mono text-slate-500">A/C: {acc.accountNumber}</p>}
                                {acc.upiId && <p className="text-[10px] font-mono text-purple-700">{acc.upiId}</p>}
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => handleSaveBank(idx)} disabled={!editingBankId || savingBank}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-all">
                            <Check className="w-3 h-3" /> {savingBank ? "Saving…" : "Save"}
                          </button>
                          <button onClick={() => { setEditingBankIdx(null); setEditingBankId(""); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-lg space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold min-w-0">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{entry.bankName || entry.receivedIn || "No bank selected"}</span>
                          </div>
                          <button
                            onClick={() => { setEditingBankIdx(idx); setEditingBankId(entry.bankAccountId || ""); }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-700 transition-all shrink-0">
                            <Pencil className="w-2.5 h-2.5" /> Edit
                          </button>
                        </div>
                        {(entry.accountHolder || entry.accountNumberMasked) && (
                          <p className="text-[11px] text-slate-500 pl-5">
                            {entry.accountHolder}{entry.accountNumberMasked ? ` · A/C: ${entry.accountNumberMasked}` : ""}
                          </p>
                        )}
                        {entry.upiId && (
                          <p className="text-[10px] font-mono text-purple-700 pl-5">{entry.upiId}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {entry.synthetic && (
                    <p className="text-[10px] mt-1 text-slate-400">Estimated from invoice totals — future payments will be logged individually</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-400">No payments recorded yet</p>
            <p className="text-xs mt-1 text-slate-300">Use Record Payment to log the first entry</p>
          </div>
        )}
      </SectionCard>

      {invoice.terms && (
        <SectionCard title="Terms" icon={Receipt}>
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-slate-600">{invoice.terms}</p>
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
  const [bankFilter, setBankFilter] = useState("all");
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
    if (bankFilter !== "all") {
      list = list.filter(i =>
        (i.paymentHistory || []).some(ph => ph.bankAccountId === bankFilter) ||
        i.lastBankAccountId === bankFilter
      );
    }
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
  }, [invoices, filter, bankFilter, search, sortBy]);

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

  const markPaid = (inv) => {
    setRecordInvoice(inv);
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
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold text-slate-400">Access restricted</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Payments</h1>
        <p className="mt-0.5 text-sm text-slate-500">Full payment details — customers, jobs, dates & history</p>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-semibold border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>{msg.text}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Collected", value: formatCurrency(stats.collected), icon: TrendingUp, accent: "#16a34a", bg: "bg-emerald-50", text: "text-emerald-700" },
          { label: "Total Pending", value: formatCurrency(stats.pending), icon: Clock, accent: "#e11d48", bg: "bg-rose-50", text: "text-rose-700" },
          { label: "Paid Invoices", value: stats.paidCount, icon: CheckCircle2, accent: "#16a34a", bg: "bg-emerald-50", text: "text-emerald-700" },
          { label: "Pending Invoices", value: stats.pendingCount, icon: Clock, accent: "#e11d48", bg: "bg-rose-50", text: "text-rose-700" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3 bg-white border border-slate-200 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                <Icon className="w-5 h-5" style={{ color: s.accent }} />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                <p className={`text-xs font-bold mt-1 ${s.text}`}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customer, invoice, phone, or job..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none shadow-xs" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[{ key: "all", label: "All" }, { key: "pending", label: "Pending" }, { key: "paid", label: "Paid" }].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                filter === tab.key
                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}>
              {tab.label}
            </button>
          ))}
          <select value={bankFilter} onChange={e => setBankFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-white border border-slate-200 focus:border-emerald-500 focus:outline-none shadow-xs">
            <option value="all" className="text-slate-900 bg-white">All Accounts</option>
            {BANK_ACCOUNTS.map(acc => (
              <option key={acc.id} value={acc.id} className="text-slate-900 bg-white">
                {acc.bankName} ({acc.accountNumberMasked})
              </option>
            ))}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 bg-white border border-slate-200 focus:border-emerald-500 focus:outline-none shadow-xs">
            <option value="newest" className="text-slate-900 bg-white">Newest first</option>
            <option value="oldest" className="text-slate-900 bg-white">Oldest first</option>
            <option value="balance-high" className="text-slate-900 bg-white">Highest balance</option>
            <option value="amount-high" className="text-slate-900 bg-white">Highest amount</option>
            <option value="amount-low" className="text-slate-900 bg-white">Lowest amount</option>
          </select>
        </div>
      </div>

      {/* Master-detail layout */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl p-8 sm:p-12 text-center bg-white border border-slate-200 shadow-sm">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold text-slate-400">No payments found</p>
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
                  className={`w-full text-left rounded-2xl p-4 transition-all border shadow-sm ${
                    active
                      ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900 text-sm">{inv.invoiceNumber}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPaid ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}>{isPaid ? "Paid" : "Pending"}</span>
                      </div>
                      <p className="text-sm font-semibold mt-1 truncate text-slate-700">{inv.customerName}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateDisplay(inv.date)}</span>
                        {jobCount > 0 && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{jobCount} job{jobCount !== 1 ? "s" : ""}</span>}
                        {inv.paymentMode && <span>{inv.paymentMode}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-start gap-1">
                      <div>
                        <p className="font-black text-slate-900 text-sm">{formatCurrency(inv.total)}</p>
                        {!isPaid && <p className="text-[10px] font-bold mt-0.5 text-rose-600">Due {formatCurrency(inv.balance)}</p>}
                        {isPaid && <p className="text-[10px] font-bold mt-0.5 text-emerald-600">Received {formatCurrency(inv.received)}</p>}
                      </div>
                      <ChevronRight className={`w-4 h-4 mt-1 hidden lg:block ${active ? "text-emerald-600" : "text-slate-300"}`} />
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
              <div className="rounded-2xl p-12 text-center bg-white border border-slate-200 shadow-sm">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-slate-400">Select an invoice to view details</p>
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
