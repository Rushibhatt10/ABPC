/**
 * CustomerSearch — Searchable customer selector with inline "Add New Customer" modal.
 *
 * Props:
 *   customers       : array of customer objects from Firestore
 *   value           : selected customer object or null
 *   onChange(c)     : called with full customer object when selected, or null when cleared
 *   onCustomerCreated(c) : called after a new customer is saved (optional)
 */
import { useEffect, useRef, useState } from "react";
import { Search, Plus, X, User, Phone, MapPin, AlertCircle, Check } from "lucide-react";
import { createRecord } from "../utils/firestoreHelpers";

const propertyTypes = ["Residential", "Commercial", "Industrial"];

function AddCustomerModal({ customers, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", propertyType: "Residential", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [dupWarning, setDupWarning] = useState("");

  const checkDuplicate = (phone) => {
    const dup = customers.find((c) => c.phone?.replace(/\D/g, "") === phone.replace(/\D/g, "") && phone.length >= 10);
    setDupWarning(dup ? `⚠️ ${dup.name} already exists with this number.` : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dupWarning) return;
    setSaving(true);
    try {
      const id = await createRecord("customers", {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        propertyType: form.propertyType,
        email: form.email.trim(),
        notes: form.notes.trim(),
      });
      onSaved({ id, ...form });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">Add New Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name *</label>
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Customer full name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone *</label>
            <input value={form.phone} onChange={(e) => { setForm((p) => ({ ...p, phone: e.target.value })); checkDuplicate(e.target.value); }}
              required placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm" />
            {dupWarning && (
              <p className="flex items-center gap-1 text-xs text-amber-600 mt-1 font-semibold">
                <AlertCircle className="w-3 h-3" />{dupWarning}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Address *</label>
            <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required
              placeholder="Full property address" rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Property Type</label>
            <div className="grid grid-cols-3 gap-2">
              {propertyTypes.map((t) => (
                <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, propertyType: t }))}
                  className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    form.propertyType === t ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !!dupWarning}
              className="flex-1 py-2.5 rounded-xl bg-[var(--brand)] text-white text-sm font-bold hover:bg-[var(--brand-dark)] disabled:opacity-60">
              {saving ? "Saving..." : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomerSearch({ customers = [], value, onChange, onCustomerCreated, placeholder = "Search customer by name or phone..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter results
  const results = query.trim().length === 0 ? [] : customers.filter((c) => {
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  }).slice(0, 8);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (c) => {
    onChange(c);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    const total = results.length + 1; // +1 for Add New
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % total); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + total) % total); }
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx < results.length) select(results[activeIdx]);
      else setShowAddModal(true);
    }
    if (e.key === "Escape") setOpen(false);
  };

  const handleNewCustomer = (c) => {
    setShowAddModal(false);
    select(c);
    onCustomerCreated?.(c);
  };

  // Selected state — show read-only card
  if (value) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--brand-soft)] border border-emerald-200">
        <div className="w-9 h-9 rounded-xl bg-[var(--brand)] flex items-center justify-center text-white text-xs font-black flex-shrink-0">
          {value.name?.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{value.name}</p>
          <p className="text-xs text-slate-500 truncate">{value.phone} · {value.address}</p>
        </div>
        <button type="button" onClick={clear} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0" title="Change customer">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div ref={dropdownRef} className="relative">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white"
          />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            {results.length === 0 && query.trim() && (
              <div className="px-4 py-3 text-sm text-slate-400">No customers found for "{query}"</div>
            )}
            {results.length === 0 && !query.trim() && (
              <div className="px-4 py-3 text-sm text-slate-400">Start typing to search...</div>
            )}
            {results.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => select(c)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-slate-100 last:border-0 ${
                  activeIdx === i ? "bg-[var(--brand-soft)]" : "hover:bg-slate-50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-black flex-shrink-0">
                  {c.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{c.name}</p>
                  <p className="text-xs text-slate-400 truncate">{c.phone} · {c.address}</p>
                </div>
                {activeIdx === i && <Check className="w-4 h-4 text-[var(--brand)] flex-shrink-0" />}
              </button>
            ))}

            {/* Add new customer option */}
            <button
              type="button"
              onMouseDown={() => { setOpen(false); setShowAddModal(true); }}
              onMouseEnter={() => setActiveIdx(results.length)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                activeIdx === results.length ? "bg-emerald-50" : "hover:bg-emerald-50"
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-sm font-bold text-emerald-700">+ Add New Customer</span>
            </button>
          </div>
        )}
      </div>

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
