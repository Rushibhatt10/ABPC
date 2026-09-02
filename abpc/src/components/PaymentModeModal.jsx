/**
 * PaymentModeModal — shown before generating any invoice.
 * User picks payment mode → confirmed → invoice is created with that mode printed on it.
 */
import { useState } from "react";
import { X, CreditCard, Smartphone, Building2, CheckCircle2 } from "lucide-react";

const MODES = [
  { value: "UPI",           label: "UPI",           icon: Smartphone,  color: "#7c3aed", bg: "rgba(124,58,237,0.1)",  border: "rgba(124,58,237,0.3)" },
  { value: "Cheque",        label: "Cheque",        icon: CreditCard,  color: "#0369a1", bg: "rgba(3,105,161,0.1)",   border: "rgba(3,105,161,0.3)" },
  { value: "Bank Transfer", label: "Bank Transfer", icon: Building2,   color: "#b45309", bg: "rgba(180,83,9,0.1)",    border: "rgba(180,83,9,0.3)" },
];

export default function PaymentModeModal({ onConfirm, onClose, title = "Generate Invoice", defaultWarranty = "", showWarrantyInput = true }) {
  const [selected, setSelected] = useState("UPI");
  const [warranty, setWarranty] = useState(defaultWarranty);

  return (
    <div className="fixed inset-0 z-300 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-bold text-slate-900 text-sm">{title}</p>
            <p className="text-xs text-slate-400 mt-0.5">Select payment mode for this invoice</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode picker */}
        <div className="p-5 space-y-2">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = selected === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelected(m.value)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                style={{
                  borderColor: isSelected ? m.border : "transparent",
                  background: isSelected ? m.bg : "rgba(0,0,0,0.02)",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "rgba(0,0,0,0.02)"; }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-0"
                  style={{ background: isSelected ? m.bg : "rgba(0,0,0,0.05)" }}>
                  <Icon className="w-4 h-4" style={{ color: isSelected ? m.color : "#94a3b8" }} />
                </div>
                <span className="font-semibold text-sm flex-1"
                  style={{ color: isSelected ? m.color : "#374151" }}>
                  {m.label}
                </span>
                {isSelected && <CheckCircle2 className="w-4 h-4 flex-0" style={{ color: m.color }} />}
              </button>
            );
          })}
        </div>

        {showWarrantyInput && (
          <div className="px-5 pb-3">
            <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">
              Warranty (optional)
            </label>
            <input
              type="text"
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              placeholder="e.g. 5 Years or 1 Year"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[var(--brand)] focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">This will appear on the invoice and in the customer portal.</p>
          </div>
        )}

        {/* Confirm */}
        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={() => onConfirm(selected, warranty)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#1F3D1F,#4C7A2D)", boxShadow: "0 0 16px rgba(76,122,45,0.3)" }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 24px rgba(76,122,45,0.5)"}
            onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 16px rgba(76,122,45,0.3)"}>
            Create Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
