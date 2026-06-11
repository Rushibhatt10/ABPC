/**
 * CustomerSearch - Searchable customer selector with inline "Add New Customer" modal.
 *
 * Props:
 *   customers       : array of customer objects from Firestore
 *   value           : selected customer object or null
 *   onChange(c)     : called with full customer object when selected, or null when cleared
 *   onCustomerCreated(c) : called after a new customer is saved (optional)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, Plus, X, MapPin, AlertCircle, Check } from "lucide-react";
import { createRecord, updateRecord } from "../utils/firestoreHelpers";
import { updatePhoneMapping } from "../customer/utils/customerHelpers";

const propertyTypes = ["Residential", "Commercial", "Industrial"];

function buildAddress({ flatNo, society, area, city, pin }) {
  return [flatNo, society, area, city, pin].filter(Boolean).join(", ");
}

function AddCustomerModal({ customers, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", phone: "", propertyType: "Residential", email: "", notes: "",
    flatNo: "", society: "", area: "", city: "", pin: "",
  });
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState("");

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const checkDuplicate = (phone) => {
    const dup = customers.find((c) => c.phone?.replace(/\D/g, "") === phone.replace(/\D/g, "") && phone.length >= 10);
    setDupWarning(dup ? `Customer already exists: ${dup.name}.` : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dupWarning) return;
    const address = buildAddress(form);
    if (!address) {
      alert("Please fill at least Society/Area and City.");
      return;
    }

    setSaving(true);
    try {
      const id = await createRecord("customers", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address,
        propertyType: form.propertyType,
        email: form.email.trim(),
        notes: form.notes.trim(),
      });
      await updateRecord("customers", id, { customerId: id });
      await updatePhoneMapping(id, form.phone);
      onSaved({
        id,
        customerId: id,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address,
        propertyType: form.propertyType,
        email: form.email.trim(),
        notes: form.notes.trim(),
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Add New Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
            <input value={form.name} onChange={f("name")} required placeholder="Customer full name" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input
              value={form.phone}
              onChange={(e) => { f("phone")(e); checkDuplicate(e.target.value); }}
              required
              placeholder="10-digit mobile number"
              className={inputCls}
            />
            {dupWarning && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                {dupWarning}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Address *</label>
            <p className="text-[10px] text-slate-400 -mt-1">Society/Area + City is enough for GPS to work.</p>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Flat / House No.</label>
              <input value={form.flatNo} onChange={f("flatNo")} placeholder="e.g. B-204, House No. 12" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Society / Building Name *</label>
              <input value={form.society} onChange={f("society")} placeholder="e.g. Shyam Residency, Green Park Society" className={inputCls} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Area / Landmark *</label>
              <input value={form.area} onChange={f("area")} placeholder="e.g. Satellite, Near Iscon Cross Road" className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">City *</label>
                <input value={form.city} onChange={f("city")} placeholder="e.g. Ahmedabad" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">PIN Code</label>
                <input value={form.pin} onChange={f("pin")} placeholder="e.g. 380015" maxLength={6} className={inputCls} />
              </div>
            </div>

            {buildAddress(form) && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700 leading-relaxed">{buildAddress(form)}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Type</label>
            <div className="grid grid-cols-3 gap-2">
              {propertyTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, propertyType: t }))}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.propertyType === t ? "border-(--brand) bg-(--brand-soft) text-(--brand)" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button
              type="submit"
              disabled={saving || !!dupWarning}
              className="flex-1 py-2.5 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark) disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Portal-based dropdown that renders to document.body to escape overflow:auto clipping.
 */
function DropdownPortal({ inputWrapRef, results, query, activeIdx, onSelect, onActiveIdx, onAddNew }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);

  const updatePos = useCallback(() => {
    if (!inputWrapRef.current) return;
    const rect = inputWrapRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, [inputWrapRef]);

  useEffect(() => {
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [updatePos]);

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        zIndex: 99999,
        borderRadius: 12,
        background: "#ffffff",
        border: "2px solid #e2e8f0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
        maxHeight: "min(320px, 50vh)",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
      {results.length === 0 && query.trim() && (
        <div style={{ padding: "12px 16px", fontSize: 14, color: "#64748b" }}>
          No customers found for &quot;{query}&quot;
        </div>
      )}

      {results.map((customer, i) => (
        <button
          key={customer.id}
          type="button"
          onMouseDown={() => onSelect(customer)}
          onMouseEnter={() => onActiveIdx(i)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            textAlign: "left",
            border: "none",
            cursor: "pointer",
            borderBottom: "1px solid #f1f5f9",
            background: activeIdx === i ? "rgba(76,122,45,0.08)" : "#ffffff",
            transition: "background 0.15s",
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, flexShrink: 0,
            background: "#ecfdf5", color: "#4C7A2D",
          }}>
            {customer.name?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {customer.name}
            </p>
            <p style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
              {customer.phone} · {customer.address}
            </p>
          </div>
          {activeIdx === i && <Check style={{ width: 16, height: 16, flexShrink: 0, color: "#059669" }} />}
        </button>
      ))}

      <button
        type="button"
        onMouseDown={onAddNew}
        onMouseEnter={() => onActiveIdx(results.length)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          textAlign: "left",
          border: "none",
          cursor: "pointer",
          background: activeIdx === results.length ? "rgba(76,122,45,0.08)" : "#ffffff",
          transition: "background 0.15s",
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, background: "#ecfdf5",
        }}>
          <Plus style={{ width: 16, height: 16, color: "#059669" }} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#059669" }}>+ Add New Customer</span>
      </button>
    </div>,
    document.body
  );
}

/**
 * @param {{
 *   customers?: Array<Record<string, any>>,
 *   value?: Record<string, any> | null,
 *   onChange: (customer: Record<string, any> | null) => void,
 *   onCustomerCreated?: (customer: Record<string, any>) => void,
 *   placeholder?: string,
 * }} props
 */
export default function CustomerSearch({ customers = [], value, onChange, onCustomerCreated, placeholder = "Search customer by name or phone..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const inputRef = useRef(null);
  const inputWrapRef = useRef(null);

  const results = query.trim().length === 0
    ? []
    : customers.filter((c) => {
        const q = query.toLowerCase();
        return c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          (c.customerId || c.id)?.toLowerCase().includes(q);
      }).slice(0, 8);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (inputWrapRef.current?.contains(e.target)) return;
      // Check if click is in the portal dropdown (any element with our portal z-index)
      const el = e.target;
      if (el?.closest?.("[data-customer-dropdown]")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (customer) => {
    onChange(customer);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    const total = results.length + 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % total);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + total) % total);
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx < results.length) select(results[activeIdx]);
      else setShowAddModal(true);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const handleNewCustomer = (customer) => {
    setShowAddModal(false);
    select(customer);
    onCustomerCreated?.(customer);
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 bg-[#4C7A2D]">
          {value.name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{value.name}</p>
          <p className="text-xs truncate text-slate-500">{value.phone} · {value.address}</p>
        </div>
        <button
          type="button"
          onClick={clear}
          className="p-1.5 rounded-lg shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const showDropdown = open && query.trim();

  return (
    <>
      <div ref={inputWrapRef} className="relative">
        <div
          className="relative rounded-xl"
          style={{
            background: "#ffffff",
            border: "2px solid #cbd5e1",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.08)",
          }}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(Boolean(e.target.value.trim()));
              setActiveIdx(0);
            }}
            onFocus={() => setOpen(Boolean(query.trim()))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-sm focus:outline-none"
            style={{
              background: "#ffffff",
              color: "#0f172a",
              border: "none",
              boxShadow: "none",
            }}
          />
        </div>
      </div>

      {/* Portal dropdown — escapes overflow:auto clipping */}
      {showDropdown && (
        <DropdownPortal
          inputWrapRef={inputWrapRef}
          results={results}
          query={query}
          activeIdx={activeIdx}
          onSelect={select}
          onActiveIdx={setActiveIdx}
          onAddNew={() => {
            setOpen(false);
            setShowAddModal(true);
          }}
        />
      )}

      {showAddModal && (
        <AddCustomerModal
          customers={customers}
          onClose={() => setShowAddModal(false)}
          onSaved={handleNewCustomer}
        />
      )}
    </>
  );
}
