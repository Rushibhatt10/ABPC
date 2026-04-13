import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeCollection, subscribeQuery, updateRecord, nextDocumentNumber } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO } from "../utils/format";
import { EmployeeS } from "../constants/authProfiles";
import MapLink from "../components/MapLink";
import { getUnitLabel } from "../utils/pricing";
import ServicePicker from "../components/ServicePicker";
import JobReportModal from "../components/JobReportModal";
import { TREATMENT_GROUPS, TREATMENT_TEMPLATES, buildSubJobs, getJobsByTreatment } from "../constants/treatmentJobs";
import CustomerSearch from "../components/CustomerSearch";
import "../components/ServiceCalculator.css";
import {
  Briefcase, Plus, X, CheckCircle2, Clock,
  User, Calendar, MapPin, ChevronDown, ChevronUp,
  RefreshCw, History, Search, Link2, UploadCloud, FileText, Receipt,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

/**
 * Parses warranty string into days.
 * Returns 0 for unknown/invalid formats.
 */
function parseWarrantyDays(w) {
  if (!w || w === "No Warranty") return 0;
  const lower = w.toLowerCase().trim();
  const n = parseInt(lower) || 1;
  if (lower.includes("year"))  return n * 365;
  if (lower.includes("month")) return n * 30;
  if (lower.includes("day"))   return parseInt(lower) || 0;
  return 0; // unknown format → no warranty
}

/**
 * Returns true ONLY if job has a valid warranty AND it hasn't expired.
 */
function isUnderWarranty(job) {
  const days = parseWarrantyDays(job.warranty);
  if (days === 0) return false;
  if (!job.completedAt) return false;
  const expiry = new Date(job.completedAt);
  expiry.setDate(expiry.getDate() + days);
  return new Date() <= expiry;
}

/**
 * "none"    → no warranty or "No Warranty"
 * "pending" → warranty set but job not completed yet
 * "active"  → warranty valid and not expired
 * "expired" → warranty set but past expiry
 */
function warrantyStatus(job) {
  const days = parseWarrantyDays(job.warranty);
  if (days === 0) return "none";
  if (!job.completedAt) return "pending";
  return isUnderWarranty(job) ? "active" : "expired";
}

function JobCard({ job, subJobs, isEmployee, onMarkSubDone, onRaiseRework, busy, onJobUpdated, onGenerateInvoice }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const jobSubJobs = subJobs.filter((s) => s.jobId === job.id);
  const completedCount = jobSubJobs.filter((s) => s.status === "done").length;
  const jobAddress = job.address || job.customerAddress || "";
  const isRework = job.jobType === "Rework";
  const wStatus = warrantyStatus(job);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isRework ? "border-violet-200" : "border-slate-200"}`}>
      <div className="p-5">
        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isRework && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
              <RefreshCw className="w-2.5 h-2.5" /> Rework Job
            </span>
          )}
          {wStatus === "active" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              🛡 Under Warranty
            </span>
          )}
          {wStatus === "expired" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              Warranty Expired
            </span>
          )}
          {job.parentJobId && !isEmployee && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              <Link2 className="w-2.5 h-2.5" /> Linked Job
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{job.customerName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{job.serviceType || job.serviceName}</p>
            {wStatus === "active" && job.warranty && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🛡 {job.warranty}
              </span>
            )}
            {!isEmployee && job.customerPhone && (
              <p className="text-xs text-slate-400 mt-0.5">{job.customerPhone}</p>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${STATUS_COLORS[job.status] || STATUS_COLORS.pending}`}>
            {job.status === "completed" ? "કમ્પ્લીટ" : job.status === "in_progress" ? "ઇન પ્રોગ્રેસ" : "પેન્ડિંગ"}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          {jobAddress && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{jobAddress}</span>
            </div>
          )}
          {job.scheduledDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formatDateDisplay(job.scheduledDate)}</span>
            </div>
          )}
          {!isEmployee && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</span>
            </div>
          )}
          {/* Pricing — Admin only */}
          {!isEmployee && (job.finalPrice || job.totalAmount) && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
              {job.basePrice > 0 && <p className="text-slate-400">Base: {formatCurrency(job.basePrice)}</p>}
              {Number(job.adjustedPrice) !== 0 && (
                <p className="text-amber-600 font-semibold">
                  Adj: {Number(job.adjustedPrice) > 0 ? "+" : ""}{formatCurrency(job.adjustedPrice)}
                  {job.adjustmentReason ? ` · ${job.adjustmentReason}` : ""}
                </p>
              )}
              <p className="font-bold text-slate-800">Final: {formatCurrency(job.finalPrice || job.totalAmount)}</p>
            </div>
          )}
        </div>

        {jobAddress && (
          <MapLink address={jobAddress} className="mt-3"
            label={isEmployee ? "Open in Maps" : "View on Maps"} showDirections={isEmployee} />
        )}

        {jobSubJobs.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">સબ-ટાસ્ક ({completedCount}/{jobSubJobs.length})</span>
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-[var(--brand)] h-1.5 rounded-full transition-all"
                style={{ width: `${jobSubJobs.length ? (completedCount / jobSubJobs.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Admin actions */}
        {!isEmployee && (
          <div className="flex flex-wrap gap-2 mt-3">
            {job.status === "completed" && wStatus === "active" && (
              <button onClick={() => onRaiseRework(job)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
                <RefreshCw className="w-3 h-3" /> Complaint 
              </button>
            )}
            {job.status === "completed" && !job.reportImage && !job.reportAudio && !job.reportNote && (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <FileText className="w-3 h-3" /> Add Report
              </button>
            )}
            {(job.reportImage || job.reportAudio || job.reportNote) && (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                <FileText className="w-3 h-3" /> View Report
              </button>
            )}
            {/* Invoice — Generate or View */}
            {job.status === "completed" && !job.invoiceId && (
              <button onClick={() => onGenerateInvoice(job)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors active:scale-95">
                <Receipt className="w-3 h-3" /> Generate Invoice
              </button>
            )}
            {job.invoiceId && (
              <a href={`/admin/invoices/${job.invoiceId}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Receipt className="w-3 h-3" /> View Invoice
              </a>
            )}
            {job.history?.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <History className="w-3 h-3" /> History ({job.history.length})
              </button>
            )}
          </div>
        )}
        {/* Employee: Add Report button when job completed */}
        {isEmployee && job.status === "completed" && (
          <div className="flex gap-2 mt-3">
            {!job.reportImage && !job.reportAudio && !job.reportNote ? (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <FileText className="w-3 h-3" /> Add Report
              </button>
            ) : (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                <FileText className="w-3 h-3" /> View Report
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sub-tasks */}
      {expanded && jobSubJobs.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 space-y-2 bg-slate-50">
          {jobSubJobs.map((sj) => (
            <div key={sj.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {sj.status === "done"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-slate-700">{sj.title}</p>
                  {sj.completedBy && <p className="text-xs text-slate-400">by {sj.completedBy}</p>}
                </div>
              </div>
              {sj.status !== "done" && (
                <button onClick={() => onMarkSubDone(sj)} disabled={busy}
                  className="px-3 py-1 rounded-lg bg-[var(--brand)] text-white text-xs font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  થઈ ગ્યું ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && job.history?.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job History</p>
          <div className="space-y-1.5">
            {job.history.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] mt-1.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">{h.event}</span>
                  {h.at && <span className="text-slate-400 ml-1">· {formatDateDisplay(h.at.split("T")[0])}</span>}
                  {h.reason && <p className="text-slate-500 mt-0.5">{h.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <JobReportModal
          job={job}
          onClose={() => setShowReport(false)}
          onSaved={() => { setShowReport(false); onJobUpdated?.(); }}
        />
      )}
    </div>
  );
}

function CreateJobModal({ customers, onClose, onSave, saving, reworkSource }) {
  const [selectedCustomer, setSelectedCustomer] = useState(
    reworkSource ? { id: reworkSource.customerId, name: reworkSource.customerName, phone: reworkSource.customerPhone || "", address: reworkSource.address || reworkSource.customerAddress || "" } : null
  );
  const [form, setForm] = useState({ scheduledDate: getTodayISO(), status: "pending", notes: "" });
  const [pickedService, setPickedService] = useState(null);
  const [treatmentKey, setTreatmentKey] = useState("");
  const [previewJobs, setPreviewJobs] = useState([]);

  const handleTreatmentSelect = (key) => {
    setTreatmentKey(key);
    setPreviewJobs(getJobsByTreatment(key));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) { alert("Please select a customer."); return; }
    if (!pickedService) { alert("Please select a service."); return; }
    if (!treatmentKey) { alert("Please select a treatment type."); return; }

    onSave({
      customerId: selectedCustomer.id || "",
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone || "",
      address: selectedCustomer.address || "",
      ...form,
      serviceId: pickedService.itemName,
      serviceName: pickedService.itemName,
      serviceType: pickedService.itemName,
      category: pickedService.category || "",
      unit: pickedService.unit || "unit",
      quantity: Number(pickedService.quantity) || 0,
      basePrice: Number(pickedService.price) || 0,
      adjustedPrice: Number(pickedService.price) || 0,
      finalPrice: Number(pickedService.total) || 0,
      totalAmount: Number(pickedService.total) || 0,
      warranty: pickedService.warranty || "",
      warrantyType: pickedService.warranty && pickedService.warranty !== "No Warranty" ? "limited" : "none",
      warrantyDays: parseWarrantyDays(pickedService.warranty) || 0,
      treatmentKey,
      treatmentLabel: TREATMENT_TEMPLATES[treatmentKey]?.label || "",
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">
            {reworkSource ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-violet-600" />New Rework Job</span> : "Create New Job"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {reworkSource && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
              <Link2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Rework of: <strong>{reworkSource.customerName}</strong> — {reworkSource.serviceType || reworkSource.serviceName}</span>
            </div>
          )}

          {/* Customer */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer *</label>
            <CustomerSearch customers={customers} value={selectedCustomer} onChange={setSelectedCustomer} />
          </div>

          {/* Treatment Type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Treatment Type *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {TREATMENT_GROUPS.map((grp) => (
                <div key={grp.group}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{grp.group}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {grp.items.map((key) => (
                      <button key={key} type="button" onClick={() => handleTreatmentSelect(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          treatmentKey === key ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-slate-600 border-slate-200 hover:border-[var(--brand)]"
                        }`}>
                        {TREATMENT_TEMPLATES[key].label.replace(/^[^—]+— /, "")}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {previewJobs.length > 0 && (
              <div className="mt-2 bg-slate-50 rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{previewJobs.length} jobs will be created</p>
                <div className="flex flex-wrap gap-1">
                  {previewJobs.map((j, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${i < 2 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                      {i + 1}. {j}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Service & Pricing */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Service & Pricing</label>
            <ServicePicker onAdd={(item) => setPickedService(item)} addLabel="Select Service" />
            {pickedService && (
              <div className="mt-2 flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--brand-soft)] border border-emerald-200">
                <div>
                  <p className="text-sm font-bold text-slate-800">{pickedService.itemName}</p>
                  <p className="text-xs text-slate-500">{pickedService.quantity} {pickedService.unit} × ₹{pickedService.price}{pickedService.warranty ? ` · ${pickedService.warranty}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-[var(--brand)]">₹{(pickedService.total || 0).toLocaleString("en-IN")}</p>
                  <button type="button" onClick={() => setPickedService(null)} className="text-xs text-rose-500 hover:underline">Change</button>
                </div>
              </div>
            )}
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scheduled Date</label>
            <input type="date" value={form.scheduledDate}
              onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..." rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none" />
          </div>

          <div className="bg-[var(--brand-soft)] rounded-xl p-3">
            <p className="text-xs font-bold text-[var(--brand-dark)] mb-1">Assigned to all workers</p>
            <p className="text-sm text-[var(--brand)]">{EmployeeS.join(", ")}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
              {saving ? "Creating..." : "Create Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { profile, isEmployee } = useAuth();
  const EmployeeName = profile?.EmployeeTag || profile?.name || "";
  const location = useLocation();

  const [jobs, setJobs] = useState([]);
  const [subJobs, setSubJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [reworkSource, setReworkSource] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  // Auto-open rework modal when navigated from ComplaintsPage
  useEffect(() => {
    if (location.state?.reworkJobId && jobs.length > 0) {
      const sourceJob = jobs.find((j) => j.id === location.state.reworkJobId);
      if (sourceJob) {
        setReworkSource(sourceJob);
        setShowModal(true);
        // Clear state so it doesn't re-trigger
        window.history.replaceState({}, "");
      }
    }
  }, [location.state, jobs]);

  useEffect(() => {
    const jobsQ = isEmployee
      ? query(collection(firestoreDb, "jobs"), where("assignedTo", "array-contains", EmployeeName))
      : query(collection(firestoreDb, "jobs"), orderBy("createdAt", "desc"));
    const unsubs = [
      subscribeQuery(jobsQ, setJobs),
      subscribeQuery(query(collection(firestoreDb, "subJobs"), orderBy("createdAt", "desc")), setSubJobs),
      subscribeCollection("customers", setCustomers),
      subscribeCollection("services", setServices),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isEmployee, EmployeeName]);

  const filtered = useMemo(() => {
    let list = isEmployee
      ? [...jobs].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      : jobs;
    if (statusFilter !== "all") list = list.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.customerName?.toLowerCase().includes(q) ||
        j.serviceType?.toLowerCase().includes(q) ||
        j.id?.toLowerCase().includes(q) ||
        (!isEmployee && j.customerPhone?.includes(q))
      );
    }
    return list;
  }, [jobs, statusFilter, search, isEmployee]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        assignedTo: EmployeeS,
        jobType: reworkSource ? "Rework" : "Original",
        parentJobId: reworkSource ? reworkSource.id : null,
        history: [{ event: reworkSource ? "Rework job created" : "Job created", at: new Date().toISOString() }],
      };
      const jobId = await createRecord("jobs", payload);
      const subJobsToCreate = buildSubJobs(jobId, form.treatmentKey || "");
      await Promise.all(subJobsToCreate.map((sj) => createRecord("subJobs", sj)));
      setShowModal(false);
      setReworkSource(null);
      showMsg("success", reworkSource ? "Rework job created and linked to original." : "Job created and assigned to all Employees.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRaiseRework = (job) => {
    setReworkSource(job);
    setShowModal(true);
  };

  const handleGenerateInvoice = async (job) => {
    setBusy(true);
    showMsg("success", "Creating invoice…");
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const total = Number(job.finalPrice || job.totalAmount || 0);
      const items = [{
        itemName: job.treatmentLabel || job.serviceType || job.serviceName || "Service",
        quantity: Number(job.quantity) || 1,
        price: Number(job.basePrice) || total,
        discount: 0,
        warranty: job.warranty || "",
        finalAmount: total,
      }];

      const invoiceId = await createRecord("invoices", {
        invoiceNumber,
        jobId: job.id,
        date: new Date().toISOString().split("T")[0],
        customerId: job.customerId || "",
        customerName: job.customerName || "",
        customerPhone: job.customerPhone || "",
        customerAddress: job.address || job.customerAddress || "",
        items,
        subtotal: total,
        discountTotal: 0,
        total,
        received: 0,
        balance: total,
        paymentMode: "UPI",
        warranty: job.warranty || "",
        terms: "Terms: 1) Payment due on completion. 2) Taxes extra if applicable.",
        status: "Pending",
        fromJob: true,
      });

      // Link invoice back to job
      await updateRecord("jobs", job.id, { invoiceId });
      showMsg("success", `Invoice ${invoiceNumber} created.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSubDone = async (sj) => {
    setBusy(true);
    try {
      await updateRecord("subJobs", sj.id, {
        status: "done", completedBy: EmployeeName, completedAt: new Date().toISOString(),
      });
      const relatedSubJobs = subJobs
        .filter((item) => item.jobId === sj.jobId)
        .map((item) => (item.id === sj.id ? { ...item, status: "done" } : item));
      const allDone = relatedSubJobs.length > 0 && relatedSubJobs.every((item) => item.status === "done");
      await updateRecord("jobs", sj.jobId, {
        status: allDone ? "completed" : "in_progress",
        completedAt: allDone ? new Date().toISOString() : null,
        completedBy: allDone ? EmployeeName : "",
      });
      showMsg("success", `"${sj.title}" marked done.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {

      setBusy(false);
    }
  };

  const handleCloudUpload = async () => {
    setBusy(true);
    showMsg("success", "Generating Excel file...");
    try {
      if (!jobs || jobs.length === 0) {
        throw new Error("No jobs available to export.");
      }

      // Prepare data
      const exportData = jobs.map((job) => ({
        "Job ID": job.id,
        "Customer Name": job.customerName || "-",
        "Customer Phone": job.customerPhone || "-",
        "Service": job.serviceType || "-",
        "Unit / Qty": (job.quantity ? job.quantity + " " : "") + (job.unit || "-"),
        "Base Price": job.basePrice || 0,
        "Adjusted Price": job.adjustedPrice || 0,
        "Final Price / Total Amount": job.finalPrice || job.totalAmount || 0,
        "Warranty": job.warranty || "No Warranty",
        "Status": job.status || "pending",
        "Assigned To": Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : (job.assignedTo || "-"),
        "Scheduled Date": job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "-",
      }));

      // Generate worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jobs");

      // Write to ArrayBuffer
      const excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const fileName = `Jobs_Export_${new Date().getTime()}.xlsx`;
      const file = new File(
        [excelBuffer],
        fileName,
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );

      if (isDriveUploadConfigured()) {
        showMsg("success", "Uploading jobs Excel directly to Google Drive...");
        const result = await uploadFileToDrive({
          file,
          fileName,
          mimeType: file.type,
          target: "jobs",
          metadata: {
            module: "jobs",
            exportedAt: new Date().toISOString(),
            count: jobs.length,
          },
        });

        showMsg("success", "Jobs Excel uploaded to Google Drive.");
        if (result.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      saveAs(file, fileName);
      showMsg("success", "Drive is not configured yet, so the Excel file was downloaded locally.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => ({
    all: jobs.length,
    pending: jobs.filter((j) => j.status === "pending" || !j.status).length,
    in_progress: jobs.filter((j) => j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  }), [jobs]);

  const jobChains = useMemo(() => {
    if (isEmployee) return null;
    const originals = filtered.filter((j) => !j.parentJobId);
    return originals.map((orig) => ({
      original: orig,
      reworks: jobs.filter((j) => j.parentJobId === orig.id),
    }));
  }, [filtered, jobs, isEmployee]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{isEmployee ? "મારા જોબ્સ" : "Jobs"}</h1>
          <p className="text-slate-500 mt-0.5">{jobs.length} {isEmployee ? "ટોટલ જોબ્સ" : "total jobs"} · {jobs.filter(j => j.jobType === "Rework").length} rework</p>
        </div>
        {!isEmployee && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
            <button onClick={handleCloudUpload} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-60 w-full sm:w-auto min-h-[44px] active:scale-95">
              <UploadCloud className="w-4 h-4" /> Cloud Export
            </button>
            <button onClick={() => { setReworkSource(null); setShowModal(true); }} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm disabled:opacity-60 w-full sm:w-auto min-h-[44px] active:scale-95">
              <Plus className="w-4 h-4" /> Create Job
            </button>
          </div>
        )}
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
          }`}>{msg.text}</div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={isEmployee ? "જોબ ID અથવા કસ્ટમર નામ સર્ચ કરો..." : "Search by customer, phone, job ID, service..."}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "all", label: isEmployee ? "બધા" : "All" },
          { key: "pending", label: isEmployee ? "પેન્ડિંગ" : "Pending" },
          { key: "in_progress", label: isEmployee ? "ઇન પ્રોગ્રેસ" : "In Progress" },
          { key: "completed", label: isEmployee ? "કમ્પ્લીટ" : "Completed" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${statusFilter === tab.key ? "bg-[var(--brand)] text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{isEmployee ? "કોઈ જોબ મળ્યો નહીં" : "No jobs found"}</p>
          {!isEmployee && (
            <button onClick={() => { setReworkSource(null); setShowModal(true); }}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)]">
              Create First Job
            </button>
          )}
        </div>
      ) : isEmployee ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} isEmployee={isEmployee}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {jobChains.map(({ original, reworks }) => (
            <div key={original.id}>
              <JobCard job={original} subJobs={subJobs} isEmployee={false}
                onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} />
              {reworks.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 border-violet-200 pl-4">
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Rework Jobs ({reworks.length})</p>
                  {reworks.map((rw) => (
                    <JobCard key={rw.id} job={rw} subJobs={subJobs} isEmployee={false}
                      onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.filter(j => j.parentJobId && !jobChains.find(c => c.original.id === j.parentJobId)).map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} isEmployee={false}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateJobModal customers={customers} onClose={() => { setShowModal(false); setReworkSource(null); }}
          onSave={handleCreate} saving={saving} reworkSource={reworkSource} isEmployee={isEmployee} />
      )}
    </div>
  );
}
