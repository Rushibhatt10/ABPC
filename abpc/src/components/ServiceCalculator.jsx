import { useEffect, useMemo, useState } from "react";
import { Calculator, IndianRupee, Layers } from "lucide-react";
import { getUnitLabel, normalizeServicePricing, UNIT_TYPES } from "../utils/pricing";
import { formatCurrency } from "../utils/format";

/**
 * ServiceCalculator — Simplified direct-price calculator.
 *
 * Props:
 *  - services    : Array of service objects from Firestore
 *  - isAdmin     : Boolean — admins can edit price directly
 *  - onChange    : (data) => void
 *  - initialData : Optional preset values
 */
export default function ServiceCalculator({ services = [], isAdmin = false, onChange, initialData = null }) {
  const [selectedServiceId, setSelectedServiceId] = useState(initialData?.serviceId || "");
  const [selectedUnit, setSelectedUnit] = useState(initialData?.unit_type || "unit");
  const [price, setPrice] = useState(initialData?.price_per_unit ?? "");
  const [quantity, setQuantity] = useState(initialData?.quantity ?? "");

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [selectedServiceId, services]
  );

  const normalized = useMemo(
    () => (selectedService ? normalizeServicePricing(selectedService) : null),
    [selectedService]
  );

  // Available units for selected service (or all if none selected)
  const unitOptions = normalized?.unitOptions?.length
    ? UNIT_TYPES.filter((u) => normalized.unitOptions.includes(u.value))
    : UNIT_TYPES;

  const finalPrice = useMemo(() => {
    const p = parseFloat(price) || 0;
    const q = parseFloat(quantity) || 0;
    return p * q;
  }, [price, quantity]);

  const handleServiceChange = (id) => {
    setSelectedServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (!svc) {
      setPrice("");
      setQuantity("");
      setSelectedUnit("unit");
      return;
    }
    const norm = normalizeServicePricing(svc);
    const firstUnit = norm.unitOptions[0] || "unit";
    setSelectedUnit(firstUnit);
    setPrice(String(norm.unitPrices[firstUnit] || ""));
    setQuantity("");
  };

  const handleUnitChange = (unitValue) => {
    setSelectedUnit(unitValue);
    if (!normalized) return;
    const p = normalized.unitPrices[unitValue] || 0;
    setPrice(String(p || ""));
  };

  useEffect(() => {
    if (!onChange) return;
    onChange({
      serviceId: selectedServiceId,
      service_name: normalized?.serviceName || "",
      unit_type: selectedUnit,
      quantity: parseFloat(quantity) || 0,
      base_price_per_unit: parseFloat(price) || 0,
      adjusted_price_per_unit: parseFloat(price) || 0,
      final_price: finalPrice,
    });
  }, [selectedServiceId, selectedUnit, quantity, price, finalPrice]);

  const unitLabel = getUnitLabel(selectedUnit);

  return (
    <div className="calc-shell">
      {/* Step 1: Service */}
      <div className="calc-step">
        <div className="calc-step-header">
          <span className="calc-step-badge">1</span>
          <label className="calc-step-label">Select Service</label>
        </div>
        <div className="calc-select-wrap">
          <Layers className="calc-select-icon" />
          <select
            className="calc-select"
            value={selectedServiceId}
            onChange={(e) => handleServiceChange(e.target.value)}
          >
            <option value="">— Choose a service —</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.serviceName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Step 2: Unit + Price (shown once service selected) */}
      {selectedServiceId && (
        <div className="calc-step calc-fade-in">
          <div className="calc-step-header">
            <span className="calc-step-badge">2</span>
            <label className="calc-step-label">Unit & Price</label>
          </div>

          {/* Unit pills — only show if more than one option */}
          {unitOptions.length > 1 && (
            <div className="calc-unit-pills" style={{ marginBottom: "0.75rem" }}>
              {unitOptions.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  className={`calc-unit-pill ${selectedUnit === u.value ? "active" : ""}`}
                  onClick={() => handleUnitChange(u.value)}
                >
                  {u.label}
                </button>
              ))}
            </div>
          )}

          {/* Direct price input */}
          <div className="calc-input-wrap">
            <span className="calc-input-prefix">₹</span>
            <input
              className="calc-input"
              type="number"
              step="1"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
            />
            <span className="calc-input-suffix">per {unitLabel}</span>
          </div>
        </div>
      )}

      {/* Step 3: Quantity */}
      {selectedServiceId && (
        <div className="calc-step calc-fade-in">
          <div className="calc-step-header">
            <span className="calc-step-badge">3</span>
            <label className="calc-step-label">Quantity</label>
          </div>
          <div className="calc-input-wrap">
            <Calculator className="calc-input-icon" />
            <input
              className="calc-input"
              type="number"
              step="1"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`e.g. 2 ${unitLabel}`}
            />
            <span className="calc-input-suffix">{unitLabel}</span>
          </div>
        </div>
      )}

      {/* Total */}
      {parseFloat(quantity) > 0 && parseFloat(price) > 0 && (
        <div className="calc-result calc-fade-in">
          <div className="calc-result-formula">
            <span className="calc-formula-item">
              <span className="calc-formula-value">{parseFloat(quantity).toLocaleString("en-IN")}</span>
              <span className="calc-formula-label">{unitLabel}</span>
            </span>
            <span className="calc-formula-op">×</span>
            <span className="calc-formula-item">
              <span className="calc-formula-value">{formatCurrency(parseFloat(price))}</span>
              <span className="calc-formula-label">per {unitLabel}</span>
            </span>
          </div>
          <div className="calc-result-total">
            <span className="calc-result-label">Total</span>
            <span className="calc-result-value">{formatCurrency(finalPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
