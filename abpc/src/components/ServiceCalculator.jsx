import { useEffect, useMemo, useState } from "react";
import { Calculator, IndianRupee, Layers, Ruler, Tag } from "lucide-react";
import { getServicePriceForUnit, getUnitLabel, normalizeServicePricing, UNIT_TYPES } from "../utils/pricing";
import { formatCurrency } from "../utils/format";

/**
 * ServiceCalculator — Clean, step-by-step pricing calculator.
 *
 * Props:
 *  - services        : Array of service objects from Firestore (or SERVICE_PRICING_MENU)
 *  - isAdmin         : Boolean — admins can edit price_per_unit
 *  - onChange         : (data) => void — fires on every value change with full calculation data
 *  - initialData      : Optional preset values for editing (service_name, unit_type, quantity, price_per_unit)
 */
export default function ServiceCalculator({ services = [], isAdmin = false, onChange, initialData = null }) {
  const [selectedServiceId, setSelectedServiceId] = useState(initialData?.serviceId || "");
  const [selectedUnit, setSelectedUnit] = useState(initialData?.unit_type || "");
  const [pricePerUnit, setPricePerUnit] = useState(initialData?.price_per_unit ?? "");
  const [basePrice, setBasePrice] = useState(initialData?.base_price_per_unit ?? 0);
  const [quantity, setQuantity] = useState(initialData?.quantity ?? "");

  // Resolve selected service
  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return services.find((s) => s.id === selectedServiceId) || null;
  }, [selectedServiceId, services]);

  const normalized = useMemo(() => {
    if (!selectedService) return null;
    return normalizeServicePricing(selectedService);
  }, [selectedService]);

  // Available unit options globally
  const unitOptions = UNIT_TYPES.map(u => u.value);

  // Compute final price
  const finalPrice = useMemo(() => {
    const price = parseFloat(pricePerUnit) || 0;
    const qty = parseFloat(quantity) || 0;
    return price * qty;
  }, [pricePerUnit, quantity]);

  // On service change → auto-select first unit + fetch base price
  const handleServiceChange = (id) => {
    setSelectedServiceId(id);
    const service = services.find((s) => s.id === id);
    if (!service) {
      setSelectedUnit("");
      setPricePerUnit("");
      setBasePrice(0);
      setQuantity("");
      return;
    }
    const norm = normalizeServicePricing(service);
    const firstUnit = UNIT_TYPES[0]?.value || "sqft";
    const price = norm.unitPrices[firstUnit] || 0;
    setSelectedUnit(firstUnit);
    setBasePrice(price);
    setPricePerUnit(String(price));
    setQuantity("");
  };

  // On unit change → fetch price for that unit
  const handleUnitChange = (unitType) => {
    setSelectedUnit(unitType);
    if (!selectedService) return;
    const autoFill = getServicePriceForUnit(selectedService, unitType);
    setBasePrice(autoFill.price);
    setPricePerUnit(String(autoFill.price));
  };

  // Push changes to parent
  useEffect(() => {
    if (!onChange) return;
    onChange({
      serviceId: selectedServiceId,
      service_name: normalized?.serviceName || "",
      unit_type: selectedUnit,
      quantity: parseFloat(quantity) || 0,
      base_price_per_unit: parseFloat(basePrice) || 0,
      adjusted_price_per_unit: parseFloat(pricePerUnit) || 0,
      final_price: parseFloat(finalPrice) || 0,
    });
  }, [selectedServiceId, selectedUnit, quantity, pricePerUnit, basePrice, finalPrice]);

  const unitLabel = getUnitLabel(selectedUnit);
  const ppu = parseFloat(pricePerUnit) || 0;

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
            id="calc-service-select"
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

      {/* Step 2: Unit Type */}
      {selectedServiceId && (
        <div className="calc-step calc-fade-in">
          <div className="calc-step-header">
            <span className="calc-step-badge">2</span>
            <label className="calc-step-label">Select Unit Type</label>
          </div>
          <div className="calc-unit-pills">
            {unitOptions.map((unit) => (
              <button
                key={unit}
                type="button"
                className={`calc-unit-pill ${selectedUnit === unit ? "active" : ""}`}
                onClick={() => handleUnitChange(unit)}
              >
                <Ruler className="calc-unit-pill-icon" />
                {getUnitLabel(unit)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Price Per Unit (ADMIN ONLY) */}
      {selectedUnit && isAdmin && (
        <div className="calc-step calc-fade-in">
          <div className="calc-step-header">
            <span className="calc-step-badge">3</span>
            <label className="calc-step-label">Price Per {unitLabel}</label>
          </div>

          <div className="calc-base-tag">
            <Tag className="calc-base-tag-icon" />
            <span>Base Price: <strong>{formatCurrency(basePrice)}</strong> per {unitLabel}</span>
          </div>

          <div className="calc-input-wrap">
            <span className="calc-input-prefix">₹</span>
            <input
              id="calc-price-input"
              className="calc-input"
              type="number"
              step="0.01"
              min="0"
              value={pricePerUnit}
              onChange={(e) => setPricePerUnit(e.target.value)}
              placeholder="Enter price"
            />
            <span className="calc-input-suffix">per {unitLabel}</span>
          </div>

          {ppu !== basePrice && ppu > 0 && (
            <div className={`calc-price-diff ${ppu > basePrice ? "up" : "down"}`}>
              {ppu > basePrice ? "▲" : "▼"} {ppu > basePrice ? "+" : ""}
              {formatCurrency(ppu - basePrice)} from base
            </div>
          )}
        </div>
      )}

      {/* Step 4: Quantity */}
      {selectedUnit && (
        <div className="calc-step calc-fade-in">
          <div className="calc-step-header">
            <span className="calc-step-badge">{isAdmin ? "4" : "3"}</span>
            <label className="calc-step-label">Enter Quantity</label>
          </div>
          <div className="calc-input-wrap">
            <Calculator className="calc-input-icon" />
            <input
              id="calc-quantity-input"
              className="calc-input"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`e.g. 400.5 ${unitLabel}`}
            />
            <span className="calc-input-suffix">{unitLabel}</span>
          </div>
        </div>
      )}

      {/* Step 5: Final Price (ADMIN ONLY) */}
      {isAdmin && parseFloat(quantity) > 0 && ppu > 0 && (
        <div className="calc-result calc-fade-in">
          <div className="calc-result-formula">
            <span className="calc-formula-item">
              <span className="calc-formula-value">{parseFloat(quantity).toLocaleString("en-IN")}</span>
              <span className="calc-formula-label">{unitLabel}</span>
            </span>
            <span className="calc-formula-op">×</span>
            <span className="calc-formula-item">
              <span className="calc-formula-value">{formatCurrency(ppu)}</span>
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
