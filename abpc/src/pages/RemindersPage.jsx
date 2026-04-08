import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  cleanupPastVisits,
  createRecord,
  deleteAllBusinessData,
  deleteRecord,
  deleteRecordsByField,
} from "../utils/firestoreHelpers";
import {
  daysBetween,
  endOfDay,
  formatCurrency,
  formatDateDisplay,
  getTodayISO,
  startOfDay,
  toDateObject,
  toLocalISODate,
  toNumber,
} from "../utils/format";
import { listRecords, subscribeDb } from "../utils/localDb";

const buildSchedule = (startDate, endDate, count) => {
  const parsedStart = startOfDay(startDate);
  const parsedEnd = startOfDay(endDate);
  const visits = Math.max(1, toNumber(count));

  if (!parsedStart || !parsedEnd) {
    return [];
  }

  if (visits === 1) {
    return [toLocalISODate(parsedStart)];
  }

  const distance = parsedEnd.getTime() - parsedStart.getTime();
  if (distance <= 0) {
    return Array.from({ length: visits }, () => toLocalISODate(parsedStart));
  }

  const step = distance / (visits - 1);
  return Array.from({ length: visits }, (_, index) => {
    const date = new Date(parsedStart.getTime() + step * index);
    return toLocalISODate(date);
  });
};

const getReminderCardStyle = (level) => {
  if (level === "high") {
    return "border border-rose-200 bg-rose-50 text-rose-800";
  }
  if (level === "medium") {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border border-emerald-200 bg-emerald-50 text-emerald-800";
};

export default function RemindersPage() {
  const { isWorker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [amcList, setAmcList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    customerId: "",
    startDate: getTodayISO(),
    endDate: getTodayISO(),
    visits: "4",
    assignedTo: "P1",
    serviceName: "AMC Pest Control",
  });

  useEffect(() => {
    const load = () => {
      setCustomers(listRecords("customers"));
      setJobs(listRecords("jobs"));
      setInvoices(listRecords("invoices"));
      setAmcList(listRecords("amc"));
    };

    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId) || null,
    [customers, form.customerId],
  );

  const notifications = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
    const renewalWindow = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));

    const pendingVisits = jobs
      .filter((job) => job.status !== "completed")
      .map((job) => ({ ...job, scheduled: startOfDay(job.scheduledDate) }))
      .filter((job) => job.scheduled);

    const overdueVisits = pendingVisits.filter((job) => job.scheduled < todayStart);
    const todayVisits = pendingVisits.filter((job) => job.scheduled >= todayStart && job.scheduled <= todayEnd);
    const upcomingVisits = pendingVisits.filter((job) => job.scheduled > todayEnd && job.scheduled <= weekEnd);

    const pendingPayments = invoices
      .filter((invoice) => Number(invoice.balance || 0) > 0)
      .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));

    const renewalAlerts = amcList
      .map((amc) => {
        const endDate = startOfDay(amc.endDate);
        const daysLeft = daysBetween(now, endDate);
        return {
          ...amc,
          endDateObj: endDate,
          daysLeft,
          urgency:
            daysLeft === null ? "low" : daysLeft < 0 ? "high" : daysLeft <= 7 ? "high" : daysLeft <= 30 ? "medium" : "low",
        };
      })
      .filter((amc) => amc.endDateObj && amc.endDateObj <= renewalWindow)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));

    return {
      overdueVisits,
      todayVisits,
      upcomingVisits,
      pendingPayments,
      renewalAlerts,
    };
  }, [amcList, invoices, jobs]);

  const createAmc = async (event) => {
    event.preventDefault();
    if (!selectedCustomer) {
      setMessage("Please select customer for AMC.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");
    try {
      const scheduledVisits = buildSchedule(form.startDate, form.endDate, toNumber(form.visits));
      const amcId = await createRecord("amc", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        startDate: form.startDate,
        endDate: form.endDate,
        numberOfVisits: toNumber(form.visits),
        scheduledVisits,
        assignedTo: form.assignedTo,
        status: "Active",
      });

      await Promise.all(
        scheduledVisits.map((visitDate) =>
          createRecord("jobs", {
            amcId,
            customerId: selectedCustomer.id,
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone,
            customerAddress: selectedCustomer.address,
            serviceName: form.serviceName,
            pricingMode: "amc",
            areaSqft: 0,
            unitPrice: 0,
            fixedPrice: 0,
            totalAmount: 0,
            assignedTo: form.assignedTo,
            scheduledDate: visitDate,
            notes: "Auto-created from AMC schedule",
            checklist: {
              inspectionDone: false,
              chemicalApplied: false,
              areaCovered: false,
              customerSatisfied: false,
            },
            images: [],
            status: "pending",
          }),
        ),
      );

      setMessage("AMC created with auto-scheduled visits.");
      setForm((prev) => ({
        ...prev,
        customerId: "",
      }));
    } catch (saveError) {
      setError(saveError?.message || "Failed to create AMC.");
    } finally {
      setSaving(false);
    }
  };

  const deleteAmcContract = async (amc) => {
    const confirmed = window.confirm(`Delete AMC for ${amc.customerName} and all linked visits?`);
    if (!confirmed) return;

    setBusyAction(amc.id);
    setMessage("");
    setError("");
    try {
      const visitCount = await deleteRecordsByField("jobs", "amcId", "==", amc.id);
      await deleteRecord("amc", amc.id);
      setMessage(`AMC deleted. Removed ${visitCount} linked visits.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete AMC.");
    } finally {
      setBusyAction("");
    }
  };

  const clearPastVisitsNow = async () => {
    const confirmed = window.confirm("Delete all visits from past dates now?");
    if (!confirmed) return;

    setBusyAction("clearPast");
    setMessage("");
    setError("");
    try {
      const deleted = await cleanupPastVisits(getTodayISO());
      setMessage(`${deleted} past visit(s) deleted.`);
    } catch (cleanupError) {
      setError(cleanupError?.message || "Failed to delete past visits.");
    } finally {
      setBusyAction("");
    }
  };

  const deleteAllDataNow = async () => {
    const confirmText = window.prompt('Type "DELETE ALL" to remove all CRM data.');
    if (confirmText !== "DELETE ALL") return;

    setBusyAction("deleteAll");
    setMessage("");
    setError("");
    try {
      const summary = await deleteAllBusinessData();
      const totalDeleted = Object.values(summary).reduce((sum, value) => sum + Number(value || 0), 0);
      setMessage(`All business data deleted successfully. Records removed: ${totalDeleted}.`);
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete all data.");
    } finally {
      setBusyAction("");
    }
  };

  if (isWorker) {
    return (
      <section className="app-card text-center">
        <p className="text-sm text-slate-500">Workers can only access today&apos;s jobs.</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <section className="app-card border border-rose-200 bg-rose-50 text-sm font-medium text-rose-700">
          {error}
        </section>
      ) : null}
      {message ? (
        <section className="app-card border border-emerald-200 bg-emerald-50 text-sm font-medium text-emerald-700">
          {message}
        </section>
      ) : null}

      <section className="app-card">
        <p className="section-title">Notification Center</p>
        <div className="space-y-2 text-sm">
          <div className={`surface-card flex justify-between ${getReminderCardStyle("high")}`}>
            <span>Overdue visits</span>
            <span className="font-bold">{notifications.overdueVisits.length}</span>
          </div>
          <div className={`surface-card flex justify-between ${getReminderCardStyle("medium")}`}>
            <span>Today&apos;s visits</span>
            <span className="font-bold">{notifications.todayVisits.length}</span>
          </div>
          <div className={`surface-card flex justify-between ${getReminderCardStyle("low")}`}>
            <span>Upcoming visits (7 days)</span>
            <span className="font-bold">{notifications.upcomingVisits.length}</span>
          </div>
          <div className={`surface-card flex justify-between ${getReminderCardStyle("high")}`}>
            <span>Pending payments</span>
            <span className="font-bold">{notifications.pendingPayments.length}</span>
          </div>
          <div className={`surface-card flex justify-between ${getReminderCardStyle("medium")}`}>
            <span>AMC renewals (30 days)</span>
            <span className="font-bold">{notifications.renewalAlerts.length}</span>
          </div>
        </div>
      </section>

      <section className="app-card space-y-3">
        <p className="section-title">Create AMC</p>
        <form className="space-y-3" onSubmit={createAmc}>
          <select
            className="field-input"
            onChange={(event) => setForm((prev) => ({ ...prev, customerId: event.target.value }))}
            required
            value={form.customerId}
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} - {customer.phone}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="field-input"
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              type="date"
              value={form.startDate}
            />
            <input
              className="field-input"
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              type="date"
              value={form.endDate}
            />
          </div>
          <input
            className="field-input"
            min="1"
            onChange={(event) => setForm((prev) => ({ ...prev, visits: event.target.value }))}
            placeholder="Number of visits"
            type="number"
            value={form.visits}
          />
          <select
            className="field-input"
            onChange={(event) => setForm((prev) => ({ ...prev, assignedTo: event.target.value }))}
            value={form.assignedTo}
          >
            <option value="P1">P1 (Pest Controller 1)</option>
            <option value="P2">P2 (Pest Controller 2)</option>
          </select>
          <input
            className="field-input"
            onChange={(event) => setForm((prev) => ({ ...prev, serviceName: event.target.value }))}
            placeholder="Service name for auto visits"
            value={form.serviceName}
          />
          <button className="primary-btn btn-create" disabled={saving} type="submit">
            {saving ? "Creating..." : "Create AMC + Auto Schedule"}
          </button>
        </form>
      </section>

      <section className="app-card">
        <p className="section-title">Alert Details</p>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-rose-700">Overdue Visits</p>
          {notifications.overdueVisits.length ? (
            notifications.overdueVisits.slice(0, 8).map((job) => (
              <div key={job.id} className={`surface-card ${getReminderCardStyle("high")}`}>
                <p className="font-semibold">{job.customerName}</p>
                <p className="text-xs">
                  {job.serviceName} | {formatDateDisplay(job.scheduledDate)} | Assigned {job.assignedTo}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No overdue visits.</p>
          )}

          <p className="pt-2 font-semibold text-amber-700">Today&apos;s Visits</p>
          {notifications.todayVisits.length ? (
            notifications.todayVisits.slice(0, 8).map((job) => (
              <div key={job.id} className={`surface-card ${getReminderCardStyle("medium")}`}>
                <p className="font-semibold">{job.customerName}</p>
                <p className="text-xs">
                  {job.serviceName} | {formatDateDisplay(job.scheduledDate)} | Assigned {job.assignedTo}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No visits for today.</p>
          )}

          <p className="pt-2 font-semibold text-emerald-700">Upcoming Visits</p>
          {notifications.upcomingVisits.length ? (
            notifications.upcomingVisits.slice(0, 8).map((job) => (
              <div key={job.id} className={`surface-card ${getReminderCardStyle("low")}`}>
                <p className="font-semibold">{job.customerName}</p>
                <p className="text-xs">
                  {job.serviceName} | {formatDateDisplay(job.scheduledDate)} | Assigned {job.assignedTo}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No upcoming visits.</p>
          )}

          <p className="pt-2 font-semibold text-rose-700">Pending Payments</p>
          {notifications.pendingPayments.length ? (
            notifications.pendingPayments.slice(0, 8).map((invoice) => (
              <div key={invoice.id} className={`surface-card ${getReminderCardStyle("high")}`}>
                <p className="font-semibold">{invoice.customerName}</p>
                <p className="text-xs">
                  {invoice.invoiceNumber} | Balance {formatCurrency(invoice.balance)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No pending payments.</p>
          )}

          <p className="pt-2 font-semibold text-amber-700">AMC Renewals</p>
          {notifications.renewalAlerts.length ? (
            notifications.renewalAlerts.slice(0, 8).map((amc) => (
              <div key={amc.id} className={`surface-card ${getReminderCardStyle(amc.urgency)}`}>
                <p className="font-semibold">{amc.customerName}</p>
                <p className="text-xs">
                  End date {formatDateDisplay(amc.endDate)} | Days left: {amc.daysLeft}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No renewal alerts.</p>
          )}
        </div>
      </section>

      <section className="app-card">
        <p className="section-title">AMC Contracts</p>
        <div className="space-y-2">
          {!amcList.length ? (
            <p className="text-sm text-slate-500">No AMC contracts yet.</p>
          ) : (
            [...amcList].reverse().map((amc) => (
              <div key={amc.id} className="surface-card text-sm">
                <p className="font-bold text-slate-900">{amc.customerName}</p>
                <p className="text-xs text-slate-500">
                  {formatDateDisplay(amc.startDate)} - {formatDateDisplay(amc.endDate)} | Assigned {amc.assignedTo}
                </p>
                <p className="mt-1 text-xs text-slate-500">Visits: {(amc.scheduledVisits || []).join(", ")}</p>
                <button
                  className="danger-btn mt-2 text-xs"
                  disabled={busyAction === amc.id}
                  onClick={() => deleteAmcContract(amc)}
                  type="button"
                >
                  {busyAction === amc.id ? "Deleting..." : "Delete AMC Contract"}
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="app-card space-y-2">
        <p className="section-title">Data Controls</p>
        <button
          className="warning-btn"
          disabled={busyAction === "clearPast"}
          onClick={clearPastVisitsNow}
          type="button"
        >
          {busyAction === "clearPast" ? "Deleting..." : "Delete Past Visits Now"}
        </button>
        <button
          className="danger-btn"
          disabled={busyAction === "deleteAll"}
          onClick={deleteAllDataNow}
          type="button"
        >
          {busyAction === "deleteAll" ? "Deleting..." : "Delete All Business Data"}
        </button>
      </section>
    </div>
  );
}
