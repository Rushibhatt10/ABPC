import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Edit3, IndianRupee, Save, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createRecord, ensureDefaultServices, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { formatCurrency } from "../utils/format";
import { normalizeServiceName, UNIT_TYPES, getUnitLabel } from "../utils/pricing";
import { SERVICE_PRICING_MENU } from "../constants/services";
import "./PricingPage.css";

function ServiceRow({ service, isPricingAdmin, onSave }) {
  const [editing, setEditing] = useState(false);
  const [prices, setPrices] = useState({ ...service.unitPrices });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const unitOptions = (service.unitOptions || []).filter((u) => u !== "bhk");

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave(service.id, { unitPrices: prices });
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2000);
      setEditing(false);
    } catch {
      setMsg("Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="manage-service-card">
      <div className="manage-service-top">
        <div className="flex-1">
          <p className="manage-service-name">{service.serviceName || service.name}</p>
          <div className="manage-service-prices">
            {unitOptions.map((unit) => (
              <span key={unit} className="manage-price-tag">
                {getUnitLabel(unit)}:{" "}
                {editing ? (
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={prices[unit] ?? ""}
                    onChange={(e) => setPrices((p) => ({ ...p, [unit]: Number(e.target.value) }))}
                    style={{
                      width: "80px",
                      padding: "2px 6px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      marginLeft: "4px",
                    }}
                  />
                ) : (
                  <strong>{formatCurrency(service.unitPrices?.[unit] ?? 0)}</strong>
                )}
              </span>
            ))}
          </div>
          {msg && (
            <p style={{ fontSize: "0.75rem", color: msg === "Saved!" ? "#16a34a" : "#dc2626", marginTop: "4px" }}>
              {msg}
            </p>
          )}
        </div>

        {isPricingAdmin && (
          <div style={{ display: "flex", gap: "6px" }}>
            {editing ? (
              <>
                <button className="primary-btn btn-save" onClick={handleSave} disabled={busy} style={{ maxWidth: "80px", padding: "6px 12px" }}>
                  <Save style={{ width: "0.8rem", height: "0.8rem" }} />
                  Save
                </button>
                <button className="ghost-btn" onClick={() => { setEditing(false); setPrices({ ...service.unitPrices }); }} style={{ maxWidth: "70px", padding: "6px 10px" }}>
                  <X style={{ width: "0.8rem", height: "0.8rem" }} />
                </button>
              </>
            ) : (
              <button className="ghost-btn" onClick={() => setEditing(true)} style={{ padding: "6px 10px" }}>
                <Edit3 style={{ width: "0.85rem", height: "0.85rem" }} />
                Edit
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { isPricingAdmin, isWorker } = useAuth();
  const [services, setServices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => subscribeCollection("services", setServices), []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleInitDefaults = async () => {
    setBusy(true);
    try {
      await ensureDefaultServices();
      showMsg("success", "Default services initialized.");
    } catch {
      showMsg("error", "Failed to initialize services.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveService = async (id, updates) => {
    await updateRecord("services", id, updates);
  };

  const sorted = useMemo(
    () => [...services].sort((a, b) =>
      String(a.serviceName || a.name || "").localeCompare(String(b.serviceName || b.name || ""))
    ),
    [services]
  );

  if (isWorker) {
    return (
      <div className="pricing-page">
        <div className="pricing-header">
          <h1 className="pricing-title">Access Denied</h1>
          <p className="pricing-subtitle">Only admins can manage pricing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-page">
      <div className="pricing-header">
        <div>
          <h1 className="pricing-title">Service Pricing</h1>
          <p className="pricing-subtitle">Set prices directly for each service</p>
        </div>
        {isPricingAdmin && services.length === 0 && (
          <button className="secondary-btn" onClick={handleInitDefaults} disabled={busy}>
            <IndianRupee style={{ width: "1rem", height: "1rem" }} />
            Initialize Default Services
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`manage-msg ${msg.type === "success" ? "manage-msg-success" : "manage-msg-error"}`}>
          {msg.type === "success" ? <CheckCircle2 className="manage-msg-icon" /> : <AlertCircle className="manage-msg-icon" />}
          {msg.text}
        </div>
      )}

      {!isPricingAdmin && (
        <div className="manage-warning">
          <AlertCircle className="manage-warning-icon" />
          <p>View only — only pricing admins can edit prices.</p>
        </div>
      )}

      <div className="manage-services-grid" style={{ marginTop: "1rem" }}>
        {sorted.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>No services yet. Click "Initialize Default Services" to get started.</p>
        ) : (
          sorted.map((svc) => (
            <ServiceRow
              key={svc.id}
              service={svc}
              isPricingAdmin={isPricingAdmin}
              onSave={handleSaveService}
            />
          ))
        )}
      </div>
    </div>
  );
}
