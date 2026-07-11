/**
 * ServicePicker — Category → Subcategory → Unit → Qty → Price
 * Warranty is handled automatically from serviceTerms.js — not shown here.
 *
 * Props:
 *   onAdd(item) — called with { itemName, category, unit, quantity, price, total }
 */
import { useState } from "react";
import { Plus } from "lucide-react";
import { SERVICE_CATEGORIES, UNITS } from "../constants/services";
import { formatCurrency } from "../utils/format";

export default function ServicePicker({ onAdd, addLabel = "Add Item" }) {
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [unit, setUnit] = useState("unit");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [multiSelected, setMultiSelected] = useState([]);

  const selectedCat = SERVICE_CATEGORIES.find((c) => c.category === category);
  const isMulti = selectedCat?.isMultiSelect || false;

  const handleCategoryChange = (val) => {
    setCategory(val);
    setSubcategory("");
    setMultiSelected([]);
    setUnit("unit");
    setQuantity("");
    setPrice("");
  };

  const handleSubcategoryChange = (val) => {
    setSubcategory(val);
    const sub = selectedCat?.subcategories.find((s) => s.name === val);
    if (sub?.defaultUnit) setUnit(sub.defaultUnit);
    setQuantity("");
    setPrice("");
  };

  const toggleMulti = (name) => {
    setMultiSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const total = (parseFloat(price) || 0) * (parseFloat(quantity) || 0);

  const handleAdd = () => {
    if (!category) return;

    if (isMulti) {
      if (multiSelected.length === 0) return;
      if (!price || parseFloat(price) <= 0) return;
      multiSelected.forEach((name) => {
        onAdd({
          itemName: `${category} — ${name}`,
          category,
          unit,
          quantity: parseFloat(quantity) || 1,
          price: parseFloat(price) || 0,
          total: (parseFloat(price) || 0) * (parseFloat(quantity) || 1),
        });
      });
      setMultiSelected([]);
      setQuantity("");
      setPrice("");
      return;
    }

    if (!subcategory) return;
    if (!price || parseFloat(price) <= 0) return;
    onAdd({
      itemName: `${category} — ${subcategory}`,
      category,
      unit,
      quantity: parseFloat(quantity) || 1,
      price: parseFloat(price) || 0,
      total,
    });
    setSubcategory("");
    setQuantity("");
    setPrice("");
  };

  const showFields = subcategory || (isMulti && multiSelected.length > 0);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Add Service</p>

      {/* Category + Subcategory */}
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none bg-white">
          <option value="">Select category</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>{c.category}</option>
          ))}
        </select>

        {!isMulti && (
          <select value={subcategory} onChange={(e) => handleSubcategoryChange(e.target.value)}
            disabled={!category}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none bg-white disabled:opacity-50">
            <option value="">Select service</option>
            {selectedCat?.subcategories.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Multi-select checkboxes */}
      {isMulti && category && (
        <div className="grid grid-cols-2 gap-1.5">
          {selectedCat.subcategories.map((s) => (
            <label key={s.name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-[var(--brand)] transition-colors text-sm">
              <input type="checkbox" checked={multiSelected.includes(s.name)}
                onChange={() => toggleMulti(s.name)} className="accent-[var(--brand)]" />
              {s.name}
            </label>
          ))}
        </div>
      )}

      {/* Unit + Qty + Price */}
      {showFields && (
        <div className="grid grid-cols-3 gap-2">
          <select value={unit} onChange={(e) => setUnit(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none bg-white">
            {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} placeholder="Qty"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
          <input type="number" min="0" step="0.01" value={price}
            onChange={(e) => setPrice(e.target.value)} placeholder="Price ₹"
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none" />
        </div>
      )}

      {/* Total + Add */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-slate-600">
          {quantity && price
            ? <>Total: <strong>{formatCurrency(total)}</strong></>
            : <span className="text-slate-400">Enter qty &amp; price</span>
          }
        </span>
        <button type="button" onClick={handleAdd}
          disabled={!category || (!isMulti && !subcategory) || !price || parseFloat(price) <= 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] transition-colors disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
