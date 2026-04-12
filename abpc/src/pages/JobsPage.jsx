import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeCollection, subscribeQuery, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO } from "../utils/format";
import { WORKERS } from "../constants/authProfiles";
import MapLink from "../components/MapLink";
import { getUnitLabel } from "../utils/pricing";
import ServiceCalculator from "../components/ServiceCalculator";
import "../components/ServiceCalculator.css";
import {
  Briefcase, Plus, X, CheckCircle2, Clock,
  User, Calendar, MapPin, ChevronDown, ChevronUp,
  RefreshCw, History, Search, Link2, UploadCloud,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function JobCard({ job, subJobs, isWorker, onMarkSubDone, onRaiseRework, busy }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const jobSubJobs = subJobs.filter((s) => s.jobId === job.id);
  const completedCount = jobSubJobs.filter((s) => s.status === "done").length;
  const jobAddress = job.address || job.customerAddress || "";
  const isRework = job.jobType === "Rework";

  // Warranty: completed within last 12 months
  const underWarranty = useMemo(() => {
    if (!job.completedAt) return false;
    const completed = new Date(job.completedAt);
    const months = (new Date() - completed) / (1000 * 60 * 60 * 24 * 30);
    return months < 12;
  }, [job.completedAt]);

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
          {underWarranty && job.status === "completed" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              Under Warranty
            </span>
          )}
          {job.parentJobId && !isWorker && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              <Link2 className="w-2.5 h-2.5" /> Linked Job
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{job.customerName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{job.serviceType || job.serviceName}</p>
            {!isWorker && job.customerPhone && (
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
          {!isWorker && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</span>
            </div>
          )}
          {/* Pricing — Admin only */}
          {!isWorker && (job.finalPrice || job.totalAmount) && (
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
            label={isWorker ? "Open in Maps" : "View on Maps"} showDirections={isWorker} />
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
        {!isWorker && (
          <div className="flex flex-wrap gap-2 mt-3">
            {job.status === "completed" && (
              <button onClick={() => onRaiseRework(job)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
                <RefreshCw className="w-3 h-3" /> Raise Rework Job
              </button>
            )}
            {job.history?.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <History className="w-3 h-3" /> History ({job.history.length})
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
    </div>
  );
}

function CreateJobModal({ customers, services, onClose, onSave, saving, reworkSource, isWorker: modalIsWorker }) {
  const [form, setForm] = useState({
    customerName: reworkSource?.customerName || "",
    customerId: reworkSource?.customerId || "",
    address: reworkSource?.address || reworkSource?.customerAddress || "",
    scheduledDate: getTodayISO(),
    status: "pending",
    notes: "",
  });
  const [calcData, setCalcData] = useState(null);

  const handleCustomerChange = (id) => {
    const c = customers.find((c) => c.id === id);
    setForm((p) => ({
      ...p,
      customerId: id,
      customerName: c?.name || "",
      address: c?.address || "",
    }));
  };

  const finalPrice = calcData?.final_price || 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!calcData?.serviceId) return;

    if (!modalIsWorker && finalPrice <= 0) return;

    onSave({
      ...form,
      serviceId: calcData.serviceId || "",
      serviceName: calcData.service_name || "",
      serviceType: calcData.service_name || "",
      unit: calcData.unit_type || "",
      quantity: Number(calcData.quantity) || 0,
      basePrice: Number(calcData.base_price_per_unit) || 0,
      adjustedPrice: Number(calcData.adjusted_price_per_unit) || 0,
      finalPrice: Number(finalPrice) || 0,
      totalAmount: Number(finalPrice) || 0,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">
            {reworkSource ? (
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-violet-600" />
                New Rework Job
              </span>
            ) : "Create New Job"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {reworkSource && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
              <Link2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>This is a rework of: <strong>{reworkSource.customerName}</strong> — {reworkSource.serviceType || reworkSource.serviceName}. A new job will be created and linked.</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer</label>
            <select
              value={form.customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            >
              <option value="">Select customer or enter manually</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
          {!form.customerId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer Name *</label>
              <input
                value={form.customerName}
                onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                required
                placeholder="Customer name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="123 Main Street, Surat, Gujarat"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
            />
          </div>

          {/* Service Calculator — clean pricing flow */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Service & Pricing</p>
            <ServiceCalculator
              services={services}
              isAdmin={!modalIsWorker}
              onChange={setCalcData}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scheduled Date</label>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
            />
          </div>
          <div className="bg-[var(--brand-soft)] rounded-xl p-3">
            <p className="text-xs font-bold text-[var(--brand-dark)] mb-1">Assigned to all workers</p>
            <p className="text-sm text-[var(--brand)]">{WORKERS.join(", ")}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
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
  const { profile, isWorker } = useAuth();
  const workerName = profile?.workerTag || profile?.name || "";
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
    const jobsQ = isWorker
      ? query(collection(firestoreDb, "jobs"), where("assignedTo", "array-contains", workerName))
      : query(collection(firestoreDb, "jobs"), orderBy("createdAt", "desc"));
    const unsubs = [
      subscribeQuery(jobsQ, setJobs),
      subscribeQuery(query(collection(firestoreDb, "subJobs"), orderBy("createdAt", "desc")), setSubJobs),
      subscribeCollection("customers", setCustomers),
      subscribeCollection("services", setServices),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isWorker, workerName]);

  const filtered = useMemo(() => {
    let list = isWorker
      ? [...jobs].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      : jobs;
    if (statusFilter !== "all") list = list.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.customerName?.toLowerCase().includes(q) ||
        j.serviceType?.toLowerCase().includes(q) ||
        j.id?.toLowerCase().includes(q) ||
        (!isWorker && j.customerPhone?.includes(q))
      );
    }
    return list;
  }, [jobs, statusFilter, search, isWorker]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        assignedTo: WORKERS,
        jobType: reworkSource ? "Rework" : "Original",
        parentJobId: reworkSource ? reworkSource.id : null,
        history: [{ event: reworkSource ? "Rework job created" : "Job created", at: new Date().toISOString() }],
      };
      const jobId = await createRecord("jobs", payload);
      await Promise.all([
        createRecord("subJobs", { jobId, title: "Inspection", status: "pending", completedBy: "", completedAt: null }),
        createRecord("subJobs", { jobId, title: "Treatment", status: "pending", completedBy: "", completedAt: null }),
        createRecord("subJobs", { jobId, title: "Cleanup", status: "pending", completedBy: "", completedAt: null }),
      ]);
      setShowModal(false);
      setReworkSource(null);
      showMsg("success", reworkSource ? "Rework job created and linked to original." : "Job created and assigned to all workers.");
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

  const handleMarkSubDone = async (sj) => {
    setBusy(true);
    try {
      await updateRecord("subJobs", sj.id, {
        status: "done", completedBy: workerName, completedAt: new Date().toISOString(),
      });
      const relatedSubJobs = subJobs
        .filter((item) => item.jobId === sj.jobId)
        .map((item) => (item.id === sj.id ? { ...item, status: "done" } : item));
      const allDone = relatedSubJobs.length > 0 && relatedSubJobs.every((item) => item.status === "done");
      await updateRecord("jobs", sj.jobId, {
        status: allDone ? "completed" : "in_progress",
        completedAt: allDone ? new Date().toISOString() : null,
        completedBy: allDone ? workerName : "",
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
    if (isWorker) return null;
    const originals = filtered.filter((j) => !j.parentJobId);
    return originals.map((orig) => ({
      original: orig,
      reworks: jobs.filter((j) => j.parentJobId === orig.id),
    }));
  }, [filtered, jobs, isWorker]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{isWorker ? "મારા જોબ્સ" : "Jobs"}</h1>
          <p className="text-slate-500 mt-0.5">{jobs.length} {isWorker ? "ટોટલ જોબ્સ" : "total jobs"} · {jobs.filter(j => j.jobType === "Rework").length} rework</p>
        </div>
        {!isWorker && (
          <div className="flex items-center gap-3">
            <button onClick={handleCloudUpload} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-60">
              <UploadCloud className="w-4 h-4" /> Cloud Export
            </button>
            <button onClick={() => { setReworkSource(null); setShowModal(true); }} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm disabled:opacity-60">
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
          placeholder={isWorker ? "જોબ ID અથવા કસ્ટમર નામ સર્ચ કરો..." : "Search by customer, phone, job ID, service..."}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: isWorker ? "બધા" : "All" },
          { key: "pending", label: isWorker ? "પેન્ડિંગ" : "Pending" },
          { key: "in_progress", label: isWorker ? "ઇન પ્રોગ્રેસ" : "In Progress" },
          { key: "completed", label: isWorker ? "કમ્પ્લીટ" : "Completed" },
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
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{isWorker ? "કોઈ જોબ મળ્યો નહીં" : "No jobs found"}</p>
          {!isWorker && (
            <button onClick={() => { setReworkSource(null); setShowModal(true); }}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)]">
              Create First Job
            </button>
          )}
        </div>
      ) : isWorker ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} isWorker={isWorker}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {jobChains.map(({ original, reworks }) => (
            <div key={original.id}>
              <JobCard job={original} subJobs={subJobs} isWorker={false}
                onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} />
              {reworks.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 border-violet-200 pl-4">
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Rework Jobs ({reworks.length})</p>
                  {reworks.map((rw) => (
                    <JobCard key={rw.id} job={rw} subJobs={subJobs} isWorker={false}
                      onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.filter(j => j.parentJobId && !jobChains.find(c => c.original.id === j.parentJobId)).map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} isWorker={false}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateJobModal customers={customers} onClose={() => { setShowModal(false); setReworkSource(null); }}
          onSave={handleCreate} saving={saving} services={services} reworkSource={reworkSource} isWorker={isWorker} />
      )}
    </div>
  );
}
