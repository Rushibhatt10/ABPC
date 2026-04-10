import { useEffect, useMemo, useState } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeCollection, subscribeQuery, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO } from "../utils/format";
import { WORKERS } from "../constants/authProfiles";
import MapLink from "../components/MapLink";
import { getServiceAutoFill, getServicePriceForUnit, getUnitLabel } from "../utils/pricing";
import {
  Briefcase, Plus, X, CheckCircle2, Clock,
  User, Calendar, MapPin, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function JobCard({ job, subJobs, isWorker, onMarkSubDone, busy }) {
  const [expanded, setExpanded] = useState(false);
  const jobSubJobs = subJobs.filter((s) => s.jobId === job.id);
  const completedCount = jobSubJobs.filter((s) => s.status === "done").length;
  const jobAddress = job.address || job.customerAddress || "";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{job.customerName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{job.serviceType}</p>
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
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</span>
          </div>
        </div>

        {jobAddress ? (
          <MapLink
            address={jobAddress}
            className="mt-3"
            label={isWorker ? "Open in Maps" : "View on Maps"}
            showDirections={isWorker}
          />
        ) : null}

        {jobSubJobs.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">સબ-ટાસ્ક ({completedCount}/{jobSubJobs.length})</span>
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-[var(--brand)] h-1.5 rounded-full transition-all"
                style={{ width: `${jobSubJobs.length ? (completedCount / jobSubJobs.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {expanded && jobSubJobs.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 space-y-2 bg-slate-50">
          {jobSubJobs.map((sj) => (
            <div key={sj.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {sj.status === "done" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-700">{sj.title}</p>
                  {sj.completedBy && (
                    <p className="text-xs text-slate-400">by {sj.completedBy}</p>
                  )}
                </div>
              </div>
              {sj.status !== "done" && (
                <button
                  onClick={() => onMarkSubDone(sj)}
                  disabled={busy}
                  className="px-3 py-1 rounded-lg bg-[var(--brand)] text-white text-xs font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60"
                >
                  થઈ ગ્યું ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateJobModal({ customers, services, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    customerName: "",
    customerId: "",
    address: "",
    serviceId: "",
    serviceType: "",
    unit: "",
    price: "",
    scheduledDate: getTodayISO(),
    status: "pending",
    notes: "",
  });

  const handleCustomerChange = (id) => {
    const c = customers.find((c) => c.id === id);
    setForm((p) => ({
      ...p,
      customerId: id,
      customerName: c?.name || "",
      address: c?.address || "",
    }));
  };

  const handleServiceChange = (id) => {
    const service = services.find((item) => item.id === id);
    const autoFill = getServiceAutoFill(service || {});
    setForm((prev) => ({
      ...prev,
      serviceId: id,
      serviceType: autoFill.serviceName,
      unit: autoFill.unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const handleUnitChange = (unitType) => {
    const service = services.find((item) => item.id === form.serviceId);
    const autoFill = getServicePriceForUnit(service || {}, unitType);
    setForm((prev) => ({
      ...prev,
      unit: autoFill.unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const selectedService = useMemo(
    () => services.find((item) => item.id === form.serviceId) || null,
    [form.serviceId, services],
  );
  const selectedServiceConfig = useMemo(
    () => (selectedService ? getServiceAutoFill(selectedService) : null),
    [selectedService],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.serviceId || Number(form.price) <= 0) return;

    onSave({
      ...form,
      serviceName: form.serviceType,
      unit: form.unit,
      finalPrice: Number(form.price),
      totalAmount: Number(form.price),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Create New Job</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
            <p className="mt-1 text-xs text-slate-400">This job-specific address will be saved and used for Google Maps.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Service *</label>
            <select
              value={form.serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
            >
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>{service.name || service.serviceName}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit</label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-600"
                disabled={!selectedServiceConfig}
                onChange={(e) => handleUnitChange(e.target.value)}
                value={form.unit}
              >
                <option value="">Select unit</option>
                {(selectedServiceConfig?.unitOptions || []).map((unit) => (
                  <option key={unit} value={unit}>{getUnitLabel(unit)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Price</label>
              <input
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm"
                min="0"
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                placeholder="Auto-filled price"
                type="number"
                value={form.price}
              />
            </div>
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
            {form.price ? <p className="mt-2 text-sm font-bold text-slate-800">Final price: {formatCurrency(form.price)}</p> : null}
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

  const [jobs, setJobs] = useState([]);
  const [subJobs, setSubJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    // Worker query: no orderBy to avoid composite index requirement — sorted client-side below
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
    // Sort client-side for worker (no server-side orderBy to avoid index requirement)
    const sorted = isWorker
      ? [...jobs].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      : jobs;
    if (statusFilter === "all") return sorted;
    return sorted.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter, isWorker]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const jobId = await createRecord("jobs", {
        ...form,
        assignedTo: WORKERS,
      });
      await Promise.all([
        createRecord("subJobs", { jobId, title: "Inspection", status: "pending", completedBy: "", completedAt: null }),
        createRecord("subJobs", { jobId, title: "Treatment", status: "pending", completedBy: "", completedAt: null }),
        createRecord("subJobs", { jobId, title: "Cleanup", status: "pending", completedBy: "", completedAt: null }),
      ]);
      setShowModal(false);
      showMsg("success", "Job created and assigned to all workers.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkSubDone = async (sj) => {
    setBusy(true);
    try {
      await updateRecord("subJobs", sj.id, {
        status: "done",
        completedBy: workerName,
        completedAt: new Date().toISOString(),
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

  const counts = useMemo(() => ({
    all: jobs.length,
    pending: jobs.filter((j) => j.status === "pending" || !j.status).length,
    in_progress: jobs.filter((j) => j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  }), [jobs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{isWorker ? "મારા જોબ્સ" : "Jobs"}</h1>
          <p className="text-slate-500 mt-0.5">{jobs.length} {isWorker ? "ટોટલ જોબ્સ" : "total jobs"}</p>
        </div>
        {!isWorker && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Job
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: "all", label: isWorker ? "બધા" : "All" },
          { key: "pending", label: isWorker ? "પેન્ડિંગ" : "Pending" },
          { key: "in_progress", label: isWorker ? "ઇન પ્રોગ્રેસ" : "In Progress" },
          { key: "completed", label: isWorker ? "કમ્પ્લીટ" : "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? "bg-[var(--brand)] text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${
              statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Jobs grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{isWorker ? "કોઈ જોબ મળ્યો નહીં" : "No jobs found"}</p>
          {!isWorker && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)]"
            >
              Create First Job
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              subJobs={subJobs}
              isWorker={isWorker}
              onMarkSubDone={handleMarkSubDone}
              busy={busy}
            />
          ))}
        </div>
      )}

      {showModal && (
      <CreateJobModal
        customers={customers}
        onClose={() => setShowModal(false)}
        onSave={handleCreate}
        saving={saving}
        services={services}
      />
      )}
    </div>
  );
}
