import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatDateDisplay, toDateObject, daysBetween } from "../utils/format";
import {
  AlertTriangle, CheckCircle2, Clock, MessageSquare,
  Plus, X, RefreshCw, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Search,
} from "lucide-react";

const COMPLAINT_TYPES = ["Complaint", "Feedback", "Rework Request"];
const COMPLAINT_STATUSES = ["Open", "In Progress", "Resolved"];
const WARRANTY_MONTHS = 12;

const STATUS_COLORS = {
  Open: "bg-rose-100 text-rose-700",
  "In Progress": "bg-amber-100 text-amber-700",
  Resolved: "bg-emerald-100 text-emerald-700",
};

const TYPE_COLORS = {
  Complaint: "bg-rose-50 border-rose-200 text-rose-700",
  Feedback: "bg-blue-50 border-blue-200 text-blue-700",
  "Rework Request": "bg-violet-50 border-violet-200 text-violet-700",
};

// Safely convert any date value (string, Timestamp, Date) to a display string
function safeDate(value) {
  if (!value) return null;
  const d = toDateObject(value);
  if (!d) return null;
  return d.toISOString().split("T")[0];
}

function isUnderWarranty(completedAt) {
  if (!completedAt) return false;
  const completed = toDateObject(completedAt);
  if (!completed) return false;
  const now = new Date();
  const monthsDiff = (now.getFullYear() - completed.getFullYear()) * 12 + (now.getMonth() - completed.getMonth());
  return monthsDiff < WARRANTY_MONTHS;
}

function isPendingIssue(complaint) {
  if (complaint.status === "Resolved") return false;
  if (!complaint.createdAt) return false;
  const created = toDateObject(complaint.createdAt);
  if (!created) return false;
  const days = daysBetween(created, new Date());
  return days != null && days > 7;
}

export default function ComplaintsPage() {
  const { isEmployee } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [form, setForm] = useState({
    linkedJobId: "",
    complaintType: "Complaint",
    description: "",
  });

  useEffect(() => {
    if (isEmployee) return;
    const unsubs = [
      subscribeCollection("complaints", setComplaints),
      subscribeCollection("jobs", setJobs),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isEmployee]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const completedJobs = useMemo(() => jobs.filter((j) => j.status === "completed"), [jobs]);

  const enriched = useMemo(() =>
    complaints.map((c) => {
      const job = jobs.find((j) => j.id === c.linkedJobId);
      const warranty = job ? isUnderWarranty(job.completedAt) : false;
      const pending = isPendingIssue(c);
      return { ...c, job, warranty, pendingIssue: pending };
    }),
    [complaints, jobs]
  );

  const filtered = useMemo(() => {
    let list = [...enriched].sort((a, b) => {
      const ta = toDateObject(a.createdAt) ?? new Date(0);
      const tb = toDateObject(b.createdAt) ?? new Date(0);
      return tb - ta;
    });
    if (filterStatus !== "all") list = list.filter((c) => c.status === filterStatus);
    if (filterType !== "all") list = list.filter((c) => c.complaintType === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.serviceType?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, filterStatus, filterType, search]);

  const stats = useMemo(() => ({
    total: complaints.length,
    open: complaints.filter((c) => c.status === "Open").length,
    inProgress: complaints.filter((c) => c.status === "In Progress").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  }), [complaints]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.linkedJobId) { showMsg("error", "Please link this to a job."); return; }
    if (!form.description.trim()) { showMsg("error", "Please add a description."); return; }
    setBusy(true);
    try {
      const job = jobs.find((j) => j.id === form.linkedJobId);
      await createRecord("complaints", {
        linkedJobId: form.linkedJobId,
        jobNumber: job?.jobNumber || "",
        customerName: job?.customerName || "",
        serviceType: job?.serviceType || job?.serviceName || "",
        complaintType: form.complaintType,
        description: form.description.trim(),
        status: "Open",
        resolution: "",
      });
      setForm({ linkedJobId: "", complaintType: "Complaint", description: "" });
      setShowForm(false);
      showMsg("success", "Complaint submitted successfully.");
    } catch (err) {
      showMsg("error", err.message || "Failed to submit.");
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await updateRecord("complaints", id, { status });
      showMsg("success", `Status updated to ${status}.`);
    } catch (err) {
      showMsg("error", err.message);
    }
  };

  const handleRework = (complaint) => {
    if (!complaint.linkedJobId) {
      showMsg("error", "No linked job found on this complaint.");
      return;
    }
    navigate("/admin/jobs", { state: { reworkJobId: complaint.linkedJobId } });
    updateRecord("complaints", complaint.id, { status: "In Progress" }).catch(() => {});
  };

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Complaints & Feedback</h1>
          <p className="text-slate-500 mt-0.5">{complaints.length} total records</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Complaint
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total, color: "bg-slate-50 text-slate-700 border-slate-200" },
          { label: "Open", value: stats.open, color: "bg-rose-50 text-rose-700 border-rose-100" },
          { label: "In Progress", value: stats.inProgress, color: "bg-amber-50 text-amber-700 border-amber-100" },
          { label: "Resolved", value: stats.resolved, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.color}`}>
            <p className="text-2xl font-black text-slate-900">{s.value}</p>
            <p className="text-xs font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, service, description..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...COMPLAINT_STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === s
                  ? "bg-[var(--brand)] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {s === "all" ? "All Status" : s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...COMPLAINT_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filterType === t
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {t === "all" ? "All Types" : t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No complaints found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${TYPE_COLORS[c.complaintType] || ""}`}>
                        {c.complaintType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[c.status] || ""}`}>
                        {c.status}
                      </span>
                      {c.warranty && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" /> Under Warranty
                        </span>
                      )}
                      {c.pendingIssue && c.status !== "Resolved" && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3 h-3" /> Pending Issue
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900">{c.customerName || "—"}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.serviceType} · {formatDateDisplay(safeDate(c.createdAt))}</p>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    {expandedId === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                <p className="text-sm text-slate-700 line-clamp-2">{c.description}</p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {c.status === "Open" && (
                    <button
                      onClick={() => updateStatus(c.id, "In Progress")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <Clock className="w-3 h-3" /> Mark In Progress
                    </button>
                  )}
                  {c.status !== "Resolved" && (
                    <button
                      onClick={() => updateStatus(c.id, "Resolved")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Mark Resolved
                    </button>
                  )}
                  {c.complaintType === "Rework Request" && c.status !== "Resolved" && (
                    <button
                      onClick={() => handleRework(c)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" /> Continue Existing Job
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === c.id && (
                <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.description}</p>
                  </div>
                  {c.job && (
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded-xl p-3 border border-slate-200">
                        <p className="font-bold text-slate-500 mb-1">Linked Job</p>
                        <p className="font-semibold text-slate-800">{c.job.customerName}</p>
                        <p className="text-slate-500">{c.job.serviceType || c.job.serviceName}</p>
                        <p className="text-slate-400 mt-1">Status: <span className="font-semibold">{c.job.status}</span></p>
                        {c.job.completedAt && (
                          <p className="text-slate-400">Completed: {formatDateDisplay(safeDate(c.job.completedAt))}</p>
                        )}
                      </div>
                      {c.job.history?.length > 0 && (
                        <div className="bg-white rounded-xl p-3 border border-slate-200">
                          <p className="font-bold text-slate-500 mb-1">Job History</p>
                          <div className="space-y-1">
                            {c.job.history.map((h, i) => (
                              <p key={i} className="text-slate-600">
                                <span className="font-semibold">{h.event}</span>
                                {h.at ? ` · ${formatDateDisplay(safeDate(h.at))}` : ""}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">New Complaint / Feedback</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Link to Job *</label>
                <select
                  value={form.linkedJobId}
                  onChange={(e) => setForm((p) => ({ ...p, linkedJobId: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
                >
                  <option value="">Select a completed job</option>
                  {completedJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.customerName} — {j.serviceType || j.serviceName} ({formatDateDisplay(j.scheduledDate)})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Complaints must be linked to an existing job. No new job will be created.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {COMPLAINT_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, complaintType: t }))}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                        form.complaintType === t
                          ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe the issue or feedback in detail..."
                  rows={4}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
                  {busy ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
