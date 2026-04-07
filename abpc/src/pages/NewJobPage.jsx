import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, ensureDefaultServices, nextDocumentNumber } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, toNumber } from "../utils/format";
import { listRecords, subscribeDb } from "../utils/localDb";

const defaultForm = {
  customerId: "",
  serviceId: "",
  pricingMode: "per_sq_ft",
  areaSqft: "",
  unitPrice: "",
  fixedPrice: "",
  assignedTo: "P1",
  scheduledDate: getTodayISO(),
  notes: "",
  createQuotation: true,
};

export default function NewJobPage() {
  const { isWorker } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    ensureDefaultServices().catch(() => {});

    const load = () => {
      setCustomers(listRecords("customers"));
      const list = listRecords("services");
      setServices(list);
      setJobs(listRecords("jobs"));
      setForm((prev) => {
        if (prev.serviceId || !list.length) return prev;
        const first = list[0];
        return {
          ...prev,
          serviceId: first.id,
          pricingMode: first.pricingType || "per_sq_ft",
          unitPrice: first.unitPrice ? String(first.unitPrice) : "",
          fixedPrice: first.fixedPrice ? String(first.fixedPrice) : "",
        };
      });
    };

    load();
    const unsubscribe = subscribeDb(load);
    return unsubscribe;
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === form.customerId) || null,
    [customers, form.customerId],
  );
  const selectedService = useMemo(
    () => services.find((service) => service.id === form.serviceId) || null,
    [form.serviceId, services],
  );

  const total = useMemo(() => {
    if (form.pricingMode === "fixed") {
      return toNumber(form.fixedPrice);
    }
    return toNumber(form.areaSqft) * toNumber(form.unitPrice);
  }, [form.areaSqft, form.fixedPrice, form.pricingMode, form.unitPrice]);

  const handleServiceChange = (serviceId) => {
    const service = services.find((serviceItem) => serviceItem.id === serviceId);
    setForm((prev) => ({
      ...prev,
      serviceId,
      pricingMode: service?.pricingType || "per_sq_ft",
      unitPrice: service?.unitPrice ? String(service.unitPrice) : "",
      fixedPrice: service?.fixedPrice ? String(service.fixedPrice) : "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedCustomer || !selectedService) {
      setSuccess("Please select customer and service.");
      return;
    }

    setSaving(true);
    setSuccess("");

    try {
      const jobId = await createRecord("jobs", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        pricingMode: form.pricingMode,
        areaSqft: toNumber(form.areaSqft),
        unitPrice: toNumber(form.unitPrice),
        fixedPrice: toNumber(form.fixedPrice),
        totalAmount: total,
        assignedTo: form.assignedTo,
        scheduledDate: form.scheduledDate,
        notes: form.notes,
        checklist: {
          inspectionDone: false,
          chemicalApplied: false,
          areaCovered: false,
          customerSatisfied: false,
        },
        images: [],
        status: "pending",
      });

      let estimateNumber = "";
      if (form.createQuotation) {
        estimateNumber = await nextDocumentNumber("EST");
        await createRecord("quotations", {
          estimateNumber,
          date: form.scheduledDate,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          customerAddress: selectedCustomer.address,
          propertyType: selectedCustomer.propertyType || "Residential",
          items: [
            {
              itemName: selectedService.name,
              quantity: form.pricingMode === "fixed" ? 1 : toNumber(form.areaSqft),
              unit: form.pricingMode === "fixed" ? "job" : "sq ft",
              unitPrice: form.pricingMode === "fixed" ? toNumber(form.fixedPrice) : toNumber(form.unitPrice),
              total,
            },
          ],
          totalAmount: total,
          methodology:
            "Drilling at regular intervals, chemical injection through nozzles, and final surface sealing as required.",
          warranty: "Warranty as per treatment type and site condition.",
          paymentTerms: "50% advance, balance on completion.",
          bankDetails: "A B Pest Control | A/C 1234567890 | IFSC ABCD0001234",
          terms:
            "1. Quotation valid for 15 days. 2. Furniture movement by client. 3. Government taxes extra if applicable.",
          status: "Draft",
          sourceJobId: jobId,
        });
      }

      setForm((prev) => ({
        ...defaultForm,
        serviceId: prev.serviceId,
      }));
      setSuccess(
        estimateNumber
          ? `Job created and quotation ${estimateNumber} prepared.`
          : "Job created successfully.",
      );
    } catch (saveError) {
      setError(saveError?.message || "Failed to create job.");
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (job) => {
    const confirmed = window.confirm(`Delete job for ${job.customerName || "customer"} on ${job.scheduledDate}?`);
    if (!confirmed) return;

    setDeletingJobId(job.id);
    setError("");
    setSuccess("");
    try {
      await deleteRecord("jobs", job.id);
      setSuccess("Job deleted successfully.");
    } catch (deleteError) {
      setError(deleteError?.message || "Failed to delete job.");
    } finally {
      setDeletingJobId("");
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
      <section className="app-card">
        <p className="section-title">New Job Workflow</p>
        <p className="text-sm text-slate-500">Create a service visit in simple steps and auto-calculate pricing.</p>
      </section>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <section className="app-card space-y-3">
          <p className="text-sm font-bold text-slate-900">Step 1: Customer</p>
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
        </section>

        <section className="app-card space-y-3">
          <p className="text-sm font-bold text-slate-900">Step 2: Service</p>
          <select className="field-input" onChange={(event) => handleServiceChange(event.target.value)} value={form.serviceId}>
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          {selectedService ? <p className="text-xs text-slate-500">{selectedService.description}</p> : null}

          <div className="grid grid-cols-2 gap-2">
            <button
              className={`ghost-btn ${form.pricingMode === "per_sq_ft" ? "border-emerald-300 bg-emerald-50" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, pricingMode: "per_sq_ft" }))}
              type="button"
            >
              Per sq ft
            </button>
            <button
              className={`ghost-btn ${form.pricingMode === "fixed" ? "border-emerald-300 bg-emerald-50" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, pricingMode: "fixed" }))}
              type="button"
            >
              Fixed
            </button>
          </div>

          {form.pricingMode === "per_sq_ft" ? (
            <div className="grid grid-cols-2 gap-2">
              <input
                className="field-input"
                min="0"
                onChange={(event) => setForm((prev) => ({ ...prev, areaSqft: event.target.value }))}
                placeholder="Area (sq ft)"
                type="number"
                value={form.areaSqft}
              />
              <input
                className="field-input"
                min="0"
                onChange={(event) => setForm((prev) => ({ ...prev, unitPrice: event.target.value }))}
                placeholder="Price / sq ft"
                type="number"
                value={form.unitPrice}
              />
            </div>
          ) : (
            <input
              className="field-input"
              min="0"
              onChange={(event) => setForm((prev) => ({ ...prev, fixedPrice: event.target.value }))}
              placeholder="Fixed price"
              type="number"
              value={form.fixedPrice}
            />
          )}

          <div className="surface-card flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600">Auto Total</span>
            <span className="text-lg font-extrabold text-slate-900">{formatCurrency(total)}</span>
          </div>
        </section>

        <section className="app-card space-y-3">
          <p className="text-sm font-bold text-slate-900">Step 3: Assignment</p>
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
            onChange={(event) => setForm((prev) => ({ ...prev, scheduledDate: event.target.value }))}
            type="date"
            value={form.scheduledDate}
          />

          <textarea
            className="field-input min-h-20"
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Internal notes"
            value={form.notes}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              checked={form.createQuotation}
              className="h-4 w-4 accent-emerald-600"
              onChange={(event) => setForm((prev) => ({ ...prev, createQuotation: event.target.checked }))}
              type="checkbox"
            />
            Also create quotation draft automatically
          </label>
        </section>

        {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}
        <button className="primary-btn" disabled={saving} type="submit">
          {saving ? "Saving..." : "Create Job"}
        </button>
      </form>

      <section className="app-card">
        <p className="section-title">Recent Jobs</p>
        <div className="space-y-2">
          {!jobs.length ? (
            <p className="text-sm text-slate-500">No jobs yet.</p>
          ) : (
            [...jobs].reverse().slice(0, 8).map((job) => (
              <article key={job.id} className="surface-card">
                <p className="text-sm font-bold text-slate-900">{job.customerName || "Customer"}</p>
                <p className="text-xs text-slate-500">
                  {job.serviceName} | {formatDateDisplay(job.scheduledDate)} | {job.assignedTo}
                </p>
                <p className="text-xs text-slate-500">Total {formatCurrency(job.totalAmount)}</p>
                <button
                  className="mt-2 w-full rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700"
                  disabled={deletingJobId === job.id}
                  onClick={() => deleteJob(job)}
                  type="button"
                >
                  {deletingJobId === job.id ? "Deleting..." : "Delete Job"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}