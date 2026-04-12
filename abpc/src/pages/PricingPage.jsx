import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  IndianRupee,
  Save,
  Settings2,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  createRecord,
  ensureDefaultServices,
  subscribeCollection,
  updateRecord,
} from "../utils/firestoreHelpers";
import { formatCurrency } from "../utils/format";
import {
  getServicePriceForUnit,
  getUnitLabel,
  normalizeServiceName,
  normalizeServicePricing,
  UNIT_TYPES,
} from "../utils/pricing";
import { SERVICE_PRICING_MENU } from "../constants/services";
import ServiceCalculator from "../components/ServiceCalculator";
import "../components/ServiceCalculator.css";
import "./PricingPage.css";

/* ─── Manage Services Panel ─── */
function ManageServicesPanel({ services, isPricingAdmin, busy, onBusyChange }) {
  const [form, setForm] = useState({
    id: "",
    serviceName: "",
    unitType: "",
    price: "",
  });
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [expanded, setExpanded] = useState(false);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const selectedMenuService = useMemo(
    () =>
      SERVICE_PRICING_MENU.find(
        (item) =>
          normalizeServiceName(item.serviceName) ===
          normalizeServiceName(form.serviceName)
      ) || null,
    [form.serviceName]
  );

  const allowedUnits = UNIT_TYPES.map((u) => u.value);

  const handleServiceChange = (serviceName) => {
    const selectedService = services.find(
      (item) =>
        normalizeServiceName(item.serviceName || item.name) ===
        normalizeServiceName(serviceName)
    );
    const fallbackMenu = SERVICE_PRICING_MENU.find(
      (item) =>
        normalizeServiceName(item.serviceName) ===
        normalizeServiceName(serviceName)
    );
    const source = selectedService || fallbackMenu || {};
    const autoFill = getServicePriceForUnit(source);

    setForm((prev) => ({
      ...prev,
      id: selectedService?.id || "",
      serviceName,
      unitType: autoFill.unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const handleUnitChange = (unitType) => {
    const selectedService = services.find(
      (item) =>
        normalizeServiceName(item.serviceName || item.name) ===
        normalizeServiceName(form.serviceName)
    );
    const fallbackMenu = SERVICE_PRICING_MENU.find(
      (item) =>
        normalizeServiceName(item.serviceName) ===
        normalizeServiceName(form.serviceName)
    );
    const source = selectedService || fallbackMenu || {};
    const autoFill = getServicePriceForUnit(source, unitType);

    setForm((prev) => ({
      ...prev,
      unitType,
      price: autoFill.price ? String(autoFill.price) : "",
    }));
  };

  const resetForm = () =>
    setForm({ id: "", serviceName: "", unitType: "", price: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.serviceName.trim()) {
      showMsg("error", "Service name is required.");
      return;
    }
    if (Number(form.price) <= 0) {
      showMsg("error", "Price must be greater than zero.");
      return;
    }

    const existing = services.find(
      (s) => normalizeServiceName(s.serviceName || s.name) === normalizeServiceName(form.serviceName)
    );
    const existingPrices = existing?.unitPrices || {};
    const updatedUnitPrices = {
      ...existingPrices,
      [form.unitType]: Number(form.price),
    };

    const payload = {
      name: form.serviceName.trim(),
      serviceName: form.serviceName.trim(),
      unitOptions: Array.from(new Set([...(existing?.unitOptions || []), ...(selectedMenuService?.unitOptions || []), form.unitType])),
      unitPrices: updatedUnitPrices,
    };

    onBusyChange(true);
    try {
      if (existing) {
        await updateRecord("services", existing.id, payload);
        showMsg("success", "Service updated.");
      } else {
        await createRecord("services", payload);
        showMsg("success", "Service created.");
      }
      resetForm();
    } catch (error) {
      showMsg("error", error.message || "Failed to save service.");
    } finally {
      onBusyChange(false);
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
    setExpanded(true);
  };

  const sortedServices = useMemo(
    () =>
      [...services].sort((a, b) =>
        String(a.name || a.serviceName || "").localeCompare(
          String(b.name || b.serviceName || "")
        )
      ),
    [services]
  );

  const loadDefaults = async () => {
    onBusyChange(true);
    try {
      await ensureDefaultServices();
      showMsg("success", "Default services initialized.");
    } catch (error) {
      showMsg("error", error.message || "Failed to initialize services.");
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div className="manage-panel" style={{ marginTop: "1rem" }}>
      <div className="manage-panel-body" style={{ borderTop: "none" }}>
          {msg.text && (
            <div
              className={`manage-msg ${msg.type === "success" ? "manage-msg-success" : "manage-msg-error"}`}
            >
              {msg.type === "success" ? (
                <CheckCircle2 className="manage-msg-icon" />
              ) : (
                <AlertCircle className="manage-msg-icon" />
              )}
              {msg.text}
            </div>
          )}

          {!isPricingAdmin && (
            <div className="manage-warning">
              <AlertCircle className="manage-warning-icon" />
              <p>You can view services, but only pricing admins can edit.</p>
            </div>
          )}

          {isPricingAdmin && (
            <>
              {services.length === 0 && (
                <button
                  type="button"
                  className="secondary-btn"
                  disabled={busy}
                  onClick={loadDefaults}
                  style={{ maxWidth: "16rem" }}
                >
                  <IndianRupee
                    style={{ width: "1rem", height: "1rem" }}
                  />
                  Initialize Default Services
                </button>
              )}

              <form className="manage-form" onSubmit={handleSubmit}>
                <div className="manage-form-grid">
                  <div>
                    <label className="field-label">Service Name</label>
                    <select
                      className="field-input"
                      disabled={!isPricingAdmin || busy}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      value={form.serviceName}
                    >
                      <option value="">Select service</option>
                      {SERVICE_PRICING_MENU.map((service) => (
                        <option
                          key={service.serviceName}
                          value={service.serviceName}
                        >
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
                      onChange={(e) => handleUnitChange(e.target.value)}
                      value={form.unitType}
                    >
                      <option value="">Select unit</option>
                      {allowedUnits.map((unit) => (
                        <option key={unit} value={unit}>
                          {getUnitLabel(unit)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Price</label>
                    <input
                      className="field-input"
                      disabled={!isPricingAdmin || busy}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      placeholder="3000"
                      type="number"
                      value={form.price}
                    />
                  </div>
                </div>

                <div className="manage-form-actions">
                  <button
                    className="primary-btn btn-save"
                    disabled={!isPricingAdmin || busy}
                    type="submit"
                    style={{ maxWidth: "12rem" }}
                  >
                    <Save style={{ width: "1rem", height: "1rem" }} />
                    {form.id ? "Update" : "Create"}
                  </button>
                  <button
                    className="ghost-btn"
                    disabled={busy}
                    onClick={resetForm}
                    type="button"
                    style={{ maxWidth: "8rem" }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Saved services list */}
          <div className="manage-services-grid">
            {sortedServices.map((service) => {
              const normalized = normalizeServicePricing(service);
              return (
                <div key={service.id} className="manage-service-card">
                  <div className="manage-service-top">
                    <div>
                      <p className="manage-service-name">
                        {normalized.serviceName}
                      </p>
                      <div className="manage-service-prices">
                        {normalized.unitOptions.map((unit) => (
                          <span key={unit} className="manage-price-tag">
                            {getUnitLabel(unit)}:{" "}
                            <strong>
                              {formatCurrency(normalized.unitPrices[unit])}
                            </strong>
                          </span>
                        ))}
                      </div>
                    </div>
                    {isPricingAdmin && (
                      <button
                        className="ghost-btn"
                        onClick={() => editService(service)}
                        type="button"
                      >
                        <Edit3
                          style={{ width: "0.85rem", height: "0.85rem" }}
                        />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function PricingPage() {
  const { isPricingAdmin, isWorker, isAdmin } = useAuth();
  const [services, setServices] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeCollection("services", setServices), []);

  if (isWorker) {
    return (
      <div className="pricing-page">
        <div className="pricing-header">
          <div>
            <h1 className="pricing-title">Access Denied</h1>
            <p className="pricing-subtitle">Only admins can manage pricing configurations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      {/* Header */}
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">Add Units & Manage Services</h1>
          <p className="pricing-subtitle">Configure base prices for service units across the application</p>
        </div>
      </div>

      {/* Admin: Manage services */}
      {isAdmin && (
        <ManageServicesPanel
          services={services}
          isPricingAdmin={isPricingAdmin}
          busy={busy}
          onBusyChange={setBusy}
        />
      )}
    </div>
  );
}
