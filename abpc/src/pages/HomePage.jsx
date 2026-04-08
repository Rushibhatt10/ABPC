import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, FileText, IndianRupee, Receipt, TrendingUp, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ensureDefaultServices, updateRecord } from "../utils/firestoreHelpers";
import { endOfDay, formatCurrency, formatDateDisplay, getTodayISO, startOfDay, toDateObject } from "../utils/format";
import { listRecords, subscribeDb } from "../utils/localDb";

const checklistKeys = [
  { key: "inspectionDone", label: "Inspection done" },
  { key: "chemicalApplied", label: "Chemical applied" },
  { key: "areaCovered", label: "Area covered" },
  { key: "customerSatisfied", label: "Customer satisfied" },
];

const buildChecklistDraft = (job) => ({
  inspectionDone: Boolean(job?.checklist?.inspectionDone),
  chemicalApplied: Boolean(job?.checklist?.chemicalApplied),
  areaCovered: Boolean(job?.checklist?.areaCovered),
  customerSatisfied: Boolean(job?.checklist?.customerSatisfied),
});

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function WorkerJobCard({ job, onSave, saving, disabled }) {
  const [draft, setDraft] = useState(() => ({
    checklist: buildChecklistDraft(job),
    notes: job.notes || "",
    images: Array.isArray(job.images) ? job.images : [],
  }));

  const refreshDraftFromJob = () => {
    setDraft({
      checklist: buildChecklistDraft(job),
      notes: job.notes || "",
      images: Array.isArray(job.images) ? job.images : [],
    });
  };

  const handleImageChange = async (event) => {
    const selectedFiles = Array.from(event.target.files || []).slice(0, 2);
    if (!selectedFiles.length) return;
    const imagePayload = await Promise.all(selectedFiles.map((file) => fileToDataUrl(file)));
    setDraft((prev) => ({ ...prev, images: imagePayload }));
  };

  const statusClass = job.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return (
    <article className="app-card">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{job.customerName || "Customer"}</h3>
          <p className="text-xs text-slate-500">{job.serviceName || "Service"}</p>
          <p className="text-xs text-slate-500">Scheduled: {formatDateDisplay(job.scheduledDate)}</p>
        </div>
        <span className={`status-pill ${statusClass}`}>{job.status || "pending"}</span>
      </div>

      <div className="space-y-2">
        {checklistKeys.map((item) => (
          <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              checked={draft.checklist[item.key]}
              className="h-4 w-4 accent-emerald-600"
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  checklist: {
                    ...prev.checklist,
                    [item.key]: event.target.checked,
                  },
                }))
              }
              type="checkbox"
            />
            {item.label}
          </label>
        ))}
      </div>

      <div className="mt-3">
        <label className="field-label" htmlFor={`notes-${job.id}`}>
          Notes
        </label>
        <textarea
          id={`notes-${job.id}`}
          className="field-input min-h-20"
          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Add notes for this visit..."
          value={draft.notes}
        />
      </div>

      <div className="mt-3">
        <label className="field-label" htmlFor={`images-${job.id}`}>
          Upload images (optional)
        </label>
        <input
          id={`images-${job.id}`}
          accept="image/*"
          className="field-input"
          multiple
          onChange={handleImageChange}
          type="file"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button className="secondary-btn" disabled={disabled} onClick={() => onSave(job.id, draft, false)} type="button">
          Save Progress
        </button>
        <button
          className="primary-btn btn-complete"
          disabled={saving || disabled}
          onClick={() => onSave(job.id, draft, true)}
          type="button"
        >
          {saving ? "Saving..." : "Mark Completed"}
        </button>
      </div>
      <button className="mt-2 text-xs font-semibold text-slate-500 underline" onClick={refreshDraftFromJob} type="button">
        Reset Changes
      </button>
    </article>
  );
}

function AdminDashboard({ profile }) {
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [amc, setAmc] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    ensureDefaultServices().catch(() => {});

    const loadAll = () => {
      setCustomers(listRecords("customers"));
      setServices(listRecords("services"));
      setQuotations(listRecords("quotations"));
      setInvoices(listRecords("invoices"));
      setJobs(listRecords("jobs"));
      setAmc(listRecords("amc"));
      setMessages(listRecords("messages"));
    };

    loadAll();
    const unsubscribe = subscribeDb(loadAll);
    return unsubscribe;
  }, []);

  const totals = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const soon = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3));
    const renewalWindow = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));

    const pendingJobs = jobs.filter((job) => job.status !== "completed").length;
    const upcomingVisits = jobs.filter((job) => {
      const date = startOfDay(job.scheduledDate);
      return date && date >= todayStart && date <= soon && job.status !== "completed";
    }).length;
    const pendingPayments = invoices.filter((invoice) => Number(invoice.balance || 0) > 0).length;
    const renewalCount = amc.filter((item) => {
      const endDate = toDateObject(item.endDate);
      return endDate && endDate >= now && endDate <= renewalWindow;
    }).length;
    const collected = invoices.reduce((sum, invoice) => sum + Number(invoice.received || 0), 0);

    return {
      leads: customers.length,
      services: services.length,
      customers: customers.length,
      quotations: quotations.length,
      invoices: invoices.length,
      schedules: pendingJobs,
      reports: formatCurrency(collected),
      upcomingVisits,
      pendingPayments,
      renewalCount,
    };
  }, [amc, customers.length, invoices, jobs, quotations.length, services.length]);

  const summaryCards = [
    {
      label: "Total Revenue",
      value: totals.reports,
      tone: "dashboard-stat-green",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: "Pending Payments",
      value: formatCurrency(
        invoices.filter((invoice) => Number(invoice.balance || 0) > 0).reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0),
      ),
      tone: "dashboard-stat-amber",
      icon: <Clock3 className="h-5 w-5" />,
    },
    {
      label: "Today's Jobs",
      value: jobs.filter((job) => String(job.scheduledDate) === String(getTodayISO())).length,
      tone: "dashboard-stat-blue",
      icon: <CalendarDays className="h-5 w-5" />,
    },
    {
      label: "Total Customers",
      value: totals.customers,
      tone: "dashboard-stat-violet",
      icon: <Users className="h-5 w-5" />,
    },
  ];

  const hasAnySavedData = customers.length || quotations.length || invoices.length || jobs.length;

  const savedOverview = [
    {
      title: "Customers",
      count: customers.length,
      subtitle: "Profiles saved in CRM",
      to: "/admin/customers",
      action: "Open Customers",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "Quotations",
      count: quotations.length,
      subtitle: "Drafts and estimates",
      to: "/admin/bills",
      action: "Open Quotations",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      title: "Bills",
      count: invoices.length,
      subtitle: "Invoices and payment records",
      to: "/admin/bills",
      action: "Open Bills",
      icon: <Receipt className="h-4 w-4" />,
    },
  ];

  return (
    <div className="space-y-4">
      <section className="app-card dashboard-hero">
        <div className="dashboard-hero-top">
          <div>
            <p className="section-kicker">Dashboard</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">{profile?.name || "Team"} Overview</h2>
            <p className="mt-1 text-sm text-slate-500">Modern daily control panel for bills, quotations, jobs, and customers.</p>
          </div>
          <div className="dashboard-icon-wrap">
            <IndianRupee className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="dashboard-stat-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className={`dashboard-stat-card ${card.tone}`}>
            <div className="dashboard-stat-icon">{card.icon}</div>
            <p className="dashboard-stat-value">{card.value}</p>
            <p className="dashboard-stat-label">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="app-card">
        <p className="section-title">Today Alerts</p>
        <div className="space-y-2 text-sm">
          <div className="surface-card flex items-center justify-between">
            <span>Upcoming visits (next 3 days)</span>
            <span className="font-bold">{totals.upcomingVisits}</span>
          </div>
          <div className="surface-card flex items-center justify-between">
            <span>Pending payments</span>
            <span className="font-bold">{totals.pendingPayments}</span>
          </div>
          <div className="surface-card flex items-center justify-between">
            <span>AMC renewals (30 days)</span>
            <span className="font-bold">{totals.renewalCount}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Link className="secondary-btn text-center" to="/admin/new-job">
          Create New Job
        </Link>
        <Link className="secondary-btn text-center btn-view" to="/admin/bills">
          Create Quote / Bill
        </Link>
      </section>

      <section className="app-card saved-section">
        <div>
          <p className="section-kicker">Admin Records</p>
          <p className="section-title">Customers, Quotations, And Bills</p>
          <p className="section-subtitle">One separate section where admin can quickly see all stored records.</p>
        </div>
        {hasAnySavedData ? (
          <div className="saved-record-grid">
            {savedOverview.map((item) => (
              <Link key={item.title} className="saved-record-chip saved-record-link" to={item.to}>
                <div className="saved-record-badge">{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </div>
                <div className="text-right">
                  <p className="mini-stat-value">{item.count}</p>
                  <p className="text-[11px] font-semibold text-emerald-700">{item.action}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div className="dashboard-empty-icon">🪲</div>
            <p className="dashboard-empty-title">No data yet</p>
            <p className="dashboard-empty-copy">Start by adding customers, quotations, bills, or jobs.</p>
          </div>
        )}
      </section>

      <section className="app-card">
        <p className="section-title">Site Messages</p>
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages from the site yet.</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="surface-card text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-slate-900">{msg.full_name}</span>
                  <span className="text-xs text-slate-500">{msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : ""}</span>
                </div>
                <div className="text-slate-600 mb-2">
                  <p><a href={`mailto:${msg.email}`} className="text-blue-600 hover:underline">{msg.email}</a></p>
                  {msg.phone_number && <p><a href={`tel:${msg.phone_number}`} className="text-blue-600 hover:underline">{msg.phone_number}</a></p>}
                </div>
                <p className="text-slate-800 bg-slate-50 p-2 rounded">{msg.message}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function WorkerDashboard({ workerTag }) {
  const [jobs, setJobs] = useState([]);
  const [savingJobId, setSavingJobId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = () => {
      const today = getTodayISO();
      setJobs(
        listRecords("jobs").filter((job) => job?.assignedTo === workerTag && String(job?.scheduledDate) === String(today)),
      );
    };
    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, [workerTag]);

  const saveWorkerJob = async (jobId, draft, markCompleted) => {
    setSavingJobId(jobId);
    try {
      await updateRecord("jobs", jobId, {
        checklist: draft.checklist,
        notes: draft.notes,
        images: draft.images,
        status: markCompleted ? "completed" : "pending",
        completedAt: markCompleted ? new Date().toISOString() : null,
      });
      setMessage(markCompleted ? "Job marked completed." : "Progress saved.");
    } catch (error) {
    } finally {
      setSavingJobId("");
    }
  };

  return (
    <div className="space-y-4">
      {message ? (
        <section className="app-card border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700">
          {message}
        </section>
      ) : null}
      <section className="app-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Worker Dashboard</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-900">Today&apos;s Jobs - {workerTag}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update checklist, add notes/images, then mark the visit completed.
        </p>
      </section>

      {!jobs.length ? (
        <section className="app-card text-center">
          <p className="text-sm text-slate-500">No job assigned for today.</p>
        </section>
      ) : (
        jobs.map((job) => (
          <WorkerJobCard
            key={job.id}
            disabled={false}
            job={job}
            onSave={saveWorkerJob}
            saving={savingJobId === job.id}
          />
        ))
      )}
    </div>
  );
}

export default function HomePage() {
  const { profile, isWorker } = useAuth();

  if (isWorker) {
    return <WorkerDashboard workerTag={profile?.workerTag || "P1"} />;
  }

  return <AdminDashboard profile={profile} />;
}
