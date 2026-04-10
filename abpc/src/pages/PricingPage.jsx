import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Edit3, IndianRupee, Lock, Settings2 } from "lucide-react";
import UnitTypesDisplay from "../components/UnitTypesDisplay";
import { useAuth } from "../context/AuthContext";
import { createRecord, ensureDefaultServices, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency } from "../utils/format";
import { SERVICE_PRICING_MENU } from "../constants/services";
import { getServicePriceForUnit, getUnitLabel, normalizeServiceName, normalizeServicePricing } from "../utils/pricing";

const createServiceForm = () => ({
  id: "",
  serviceName: "",
  unitType: "",
  price: "",
});

export default function PricingPage() {
  const { isPricingAdmin, isWorker } = useAuth();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(createServiceForm());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => subscribeCollection("services", setServices), []);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => String(a.name || a.serviceName || "").localeCompare(String(b.name || b.serviceName || ""))),
    [services],
  );
  const selectedMenuService = useMemo(
    () => SERVICE_PRICING_MENU.find((item) => normalizeServiceName(item.serviceName) === normalizeServiceName(form.serviceName)) || null,
    [form.serviceName],
  );
  const allowedUnits = selectedMenuService?.unitOptions || [];

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const loadDefaults = async () => {
    setBusy(true);
    try {
      await ensureDefaultServices();
      showMsg("success", "Default services initialized.");
    } catch (error) {
      showMsg("error", error.message || "Failed to initialize services.");
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => setForm(createServiceForm());

  const handleServiceChange = (serviceName) => {
    const selectedService = services.find((item) => normalizeServiceName(item.serviceName || item.name) === normalizeServiceName(serviceName));
    const fallbackMenu = SERVICE_PRICING_MENU.find((item) => normalizeServiceName(item.serviceName) === normalizeServiceName(serviceName));
    const source = selectedService || fallbackMenu || {};
    const autoFill = getServicePriceForUnit(source);

    setForm((prev) => ({
      ...prev,
      serviceName,
      unitType: autoFill.unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const handleUnitChange = (unitType) => {
    const selectedService = services.find((item) => normalizeServiceName(item.serviceName || item.name) === normalizeServiceName(form.serviceName));
    const fallbackMenu = SERVICE_PRICING_MENU.find((item) => normalizeServiceName(item.serviceName) === normalizeServiceName(form.serviceName));
    const source = selectedService || fallbackMenu || {};
    const autoFill = getServicePriceForUnit(source, unitType);

    setForm((prev) => ({
      ...prev,
      unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.serviceName.trim()) {
      showMsg("error", "Service name is required.");
      return;
    }
    if (Number(form.price) <= 0) {
      showMsg("error", "Price must be greater than zero.");
      return;
    }

    const payload = {
      name: form.serviceName.trim(),
      serviceName: form.serviceName.trim(),
      unitOptions: selectedMenuService?.unitOptions || [form.unitType],
      unitPrices: {
        ...(normalizeServicePricing(services.find((item) => item.id === form.id) || selectedMenuService || {}).unitPrices || {}),
        [form.unitType]: Number(form.price),
      },
    };

    setBusy(true);
    try {
      if (form.id) {
        await updateRecord("services", form.id, payload);
        showMsg("success", "Service updated.");
      } else {
        await createRecord("services", payload);
        showMsg("success", "Service created.");
      }
      resetForm();
    } catch (error) {
      showMsg("error", error.message || "Failed to save service.");
    } finally {
      setBusy(false);
    }
  };

  const editService = (service) => {
    const normalized = normalizeServicePricing(service);
    setForm({
      id: service.id,
      serviceName: normalized.serviceName,
      unitType: normalized.unitType,
      price: String(normalized.price || ""),
    });
  };

  if (isWorker) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access Restricted</p>
          <p className="text-sm text-slate-400">Workers cannot access pricing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Service Pricing</h1>
          <p className="text-slate-500 mt-0.5">Store one unit type and one price for each service.</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl border border-var(--brand) px-4 py-2.5 text-sm font-bold text-var(--brand) transition-colors hover:bg-var(--brand-soft) disabled:opacity-60"
          disabled={busy}
          onClick={loadDefaults}
          type="button"
        >
          <IndianRupee className="h-4 w-4" />
          Initialize Services
        </button>
      </div>

      {msg.text ? (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          msg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {msg.text}
        </div>
      ) : null}

      {!isPricingAdmin ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-700">You can view services, but only pricing admins can edit them.</p>
        </div>
      ) : null}

      <UnitTypesDisplay />

      <form className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-var(--brand)" />
          <h2 className="text-lg font-black text-slate-900">Admin Service Form</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="field-label">Service Name</label>
            <select
              className="field-input"
              disabled={!isPricingAdmin || busy}
              onChange={(event) => handleServiceChange(event.target.value)}
              value={form.serviceName}
            >
              <option value="">Select service</option>
              {SERVICE_PRICING_MENU.map((service) => (
                <option key={service.serviceName} value={service.serviceName}>
                  {service.serviceName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Unit Type</label>
            <select
              className="field-input"
              disabled={!isPricingAdmin || busy}
              onChange={(event) => handleUnitChange(event.target.value)}
              value={form.unitType}
            >
              <option value="">Select unit</option>
              {allowedUnits.map((unit) => (
                <option key={unit} value={unit}>{getUnitLabel(unit)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Price</label>
            <input
              className="field-input"
              disabled={!isPricingAdmin || busy}
              min="0"
              onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
              placeholder="3000"
              type="number"
              value={form.price}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="primary-btn btn-save max-w-xs" disabled={!isPricingAdmin || busy} type="submit">
            {form.id ? "Update Service" : "Create Service"}
          </button>
          <button className="secondary-btn max-w-xs" disabled={busy} onClick={resetForm} type="button">
            Reset
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">Saved Services</h2>
        {!sortedServices.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No services configured yet.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {sortedServices.map((service) => {
              const normalized = normalizeServicePricing(service);
              return (
                <article key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black text-slate-900">{normalized.serviceName}</p>
                      <div className="mt-2 space-y-1">
                        {normalized.unitOptions.map((unit) => (
                          <p key={unit} className="text-sm text-slate-500">
                            {getUnitLabel(unit)}: <span className="font-semibold text-slate-800">{formatCurrency(normalized.unitPrices[unit])}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                    {isPricingAdmin ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-var(--brand) hover:text-var(--brand)"
                        onClick={() => editService(service)}
                        type="button"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
