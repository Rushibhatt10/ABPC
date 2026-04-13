import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, ensureDefaultServices, nextDocumentNumber } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO, toNumber } from "../utils/format";
import { subscribeCollection } from "../utils/firestoreHelpers";
import { SERVICE_CATEGORIES } from "../constants/services";
import { TREATMENT_GROUPS, TREATMENT_TEMPLATES, buildSubJobs } from "../constants/treatmentJobs";
import { Check, ChevronRight, Zap, Plus, Info } from "lucide-react";

const defaultForm = {
  customerId: "",
  serviceId: "",
  pricingMode: "per_sq_ft",
  areaSqft: "",
  unitPrice: "",
  fixedPrice: "",
  jobAddress: "",
  assignedTo: "P1",
  scheduledDate: getTodayISO(),
  notes: "",
  createQuotation: true,
};

export default function NewJobPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [treatmentKey, setTreatmentKey] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");

  useEffect(() => {
    ensureDefaultServices().catch(() => {});

    const unsubscribers = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("services", (list) => {
        setServices(list);
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
      }),
      subscribeCollection("jobs", setJobs),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
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

    // Find treatmentKey from label
    const fullName = service?.serviceName || service?.name || "";
    const tKey = Object.keys(TREATMENT_TEMPLATES).find(
      key => TREATMENT_TEMPLATES[key].label === fullName
    );
    setTreatmentKey(tKey || "");
  };

  const handleCategoryChange = (catName) => {
    setSelectedCategory(catName);
    setSelectedSubcategory("");
  };

  const handleSubcategoryChange = (subName) => {
    setSelectedSubcategory(subName);
    const fullName = `${selectedCategory} — ${subName}`;
    const service = services.find(s => (s.serviceName === fullName || s.name === fullName || s.name === subName));
    if (service) {
      handleServiceChange(service.id);
    } else {
      // If not in catalog, we still set treatmentKey for subjobs if it exists in templates
      const tKey = Object.keys(TREATMENT_TEMPLATES).find(
        key => TREATMENT_TEMPLATES[key].label === fullName
      );
      setTreatmentKey(tKey || "");
    }
  };



  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedCustomer) {
      setError("Please select a customer.");
      return;
    }
    if (!selectedService && !treatmentKey) {
      setError("Please select a treatment.");
      return;
    }

    setSaving(true);
    setSuccess("");

    try {
      const treatmentTemplate = treatmentKey ? TREATMENT_TEMPLATES[treatmentKey] : null;

      const jobId = await createRecord("jobs", {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        customerAddress: selectedCustomer.address,
        address: form.jobAddress.trim() || selectedCustomer.address || "",
        serviceId: selectedService?.id || treatmentKey,
        serviceName: selectedService?.name || treatmentTemplate?.label || "Custom Service",
        serviceType: selectedService?.name || treatmentTemplate?.label || "Custom Service",
        pricingMode: form.pricingMode,
        areaSqft: toNumber(form.areaSqft),
        unitPrice: toNumber(form.unitPrice),
        fixedPrice: toNumber(form.fixedPrice),
        totalAmount: total,
        assignedTo: form.assignedTo,
        scheduledDate: form.scheduledDate,
        notes: form.notes,
        treatmentKey: treatmentKey || "",
        status: "pending",
        history: [{ event: "Job created", at: new Date().toISOString() }],
        images: [],
      });

      // Create Sub-Jobs if treatmentKey exists
      if (treatmentKey) {
        const subJobsList = buildSubJobs(jobId, treatmentKey);
        await Promise.all(subJobsList.map(sj => createRecord("subJobs", sj)));
      }

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
        customerId: prev.customerId,
      }));
      setTreatmentKey("");
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

  if (isEmployee) {
    return (
      <section className="app-card text-center">
        <p className="text-sm text-slate-500">Employees can only access today&apos;s jobs.</p>
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
            onChange={(event) => {
              const customerId = event.target.value;
              const customer = customers.find((item) => item.id === customerId);
              setForm((prev) => ({
                ...prev,
                customerId,
                jobAddress: customer?.address || "",
              }));
            }}
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

          <div>
            <label className="field-label" htmlFor="job-address">Job Address</label>
            <textarea
              className="field-input min-h-20"
              id="job-address"
              onChange={(event) => setForm((prev) => ({ ...prev, jobAddress: event.target.value }))}
              placeholder="123 Main Street, Surat, Gujarat"
              value={form.jobAddress}
            />
            <p className="mt-1 text-xs text-slate-500">Saved per job and used to open Google Maps for the Employee.</p>
          </div>
        </section>

        <section className="app-card space-y-4">
          <p className="text-sm font-bold text-slate-900">Step 2: Service & Pricing</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              className="field-input"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">Select category</option>
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>

            <select
              className="field-input transition-all"
              value={selectedSubcategory}
              onChange={(e) => handleSubcategoryChange(e.target.value)}
              disabled={!selectedCategory}
            >
              <option value="">Select service</option>
              {SERVICE_CATEGORIES.find(c => c.category === selectedCategory)?.subcategories.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          {treatmentKey && TREATMENT_TEMPLATES[treatmentKey] && (
             <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-100">
               <Zap className="w-3.5 h-3.5" />
               <span>Treatment Type: <strong>{TREATMENT_TEMPLATES[treatmentKey].label.split(" — ")[1]}</strong> selected automatically.</span>
             </div>
          )}

          <details className="cursor-pointer">
            <summary className="text-xs text-slate-400 hover:text-slate-600">Advanced: Service Catalog ID</summary>
            <div className="mt-2">
              <select className="field-input" onChange={(event) => handleServiceChange(event.target.value)} value={form.serviceId}>
                <option value="">Manually select from catalog</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.serviceName || service.name}
                  </option>
                ))}
              </select>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-2">
            <button
              className={`ghost-btn ${form.pricingMode === "per_sq_ft" ? "btn-toggle-active" : ""}`}
              onClick={() => setForm((prev) => ({ ...prev, pricingMode: "per_sq_ft" }))}
              type="button"
            >
              Per sq ft
            </button>
            <button
              className={`ghost-btn ${form.pricingMode === "fixed" ? "btn-toggle-active" : ""}`}
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
        <button className="primary-btn btn-create" disabled={saving} type="submit">
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
                <p className="text-xs text-slate-500">{job.address || job.customerAddress || "No address saved"}</p>
                <p className="text-xs text-slate-500">Total {formatCurrency(job.totalAmount)}</p>
                <button
                  className="danger-btn mt-2 text-xs"
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
