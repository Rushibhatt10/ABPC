import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeCollection, updateRecord } from "../utils/firestoreHelpers";
import { PRICE_LIST_BASE } from "../seeds/priceListBase";
import { IndianRupee, Lock, Unlock, AlertCircle } from "lucide-react";

const BHK_KEYS = ["1", "2", "3", "4", "bunglow"];
const BHK_LABEL = { "1": "1 BHK", "2": "2 BHK", "3": "3 BHK", "4": "4 BHK", bunglow: "Bunglow" };

const toNum = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function PricingPage() {
  const { isPricingAdmin, isWorker } = useAuth();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // "docId__bhkKey"
  const [editValue, setEditValue] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    return subscribeCollection("priceList", setRows);
  }, []);

  const indexed = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => map.set(`${r.category}__${r.serviceName}`, r));
    return map;
  }, [rows]);

  const merged = useMemo(() =>
    PRICE_LIST_BASE.map((seed) => ({
      ...seed,
      doc: indexed.get(`${seed.category}__${seed.serviceName}`) || null,
    })),
    [indexed]
  );

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const initializePrices = async () => {
    setBusy(true);
    try {
      for (const seed of PRICE_LIST_BASE) {
        if (indexed.has(`${seed.category}__${seed.serviceName}`)) continue;
        const bhkPrices = {};
        for (const key of BHK_KEYS) {
          const base = seed.bhkPrices?.[key]?.base ?? null;
          if (base === null) continue;
          bhkPrices[key] = { base, editable: base };
        }
        await createRecord("priceList", {
          category: seed.category,
          serviceName: seed.serviceName,
          bhkPrices,
          baseLocked: true,
        });
      }
      showMsg("success", "Price list initialized. Base prices are locked.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (docId, bhkKey, currentValue) => {
    if (!isPricingAdmin) return;
    setEditingCell(`${docId}__${bhkKey}`);
    setEditValue(String(currentValue ?? ""));
  };

  const saveEdit = async (docId, bhkKey) => {
    const val = toNum(editValue);
    if (val === null) { showMsg("error", "Enter a valid number."); return; }
    setBusy(true);
    try {
      const doc = rows.find((r) => r.id === docId);
      await updateRecord("priceList", docId, {
        bhkPrices: {
          ...(doc?.bhkPrices || {}),
          [bhkKey]: { ...(doc?.bhkPrices?.[bhkKey] || {}), editable: val },
        },
      });
      showMsg("success", "Price updated.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
      setEditingCell(null);
    }
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Pricing</h1>
          <p className="text-slate-500 mt-0.5">Manage service prices by category and property size</p>
        </div>
        {isPricingAdmin && (
          <button
            onClick={initializePrices}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--brand)] text-[var(--brand)] text-sm font-bold hover:bg-[var(--brand-soft)] transition-colors disabled:opacity-60"
          >
            <IndianRupee className="w-4 h-4" />
            Initialize Prices
          </button>
        )}
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {!isPricingAdmin && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">You can view prices but only Ankit Bhatt & Akanksha Bhatt can edit them.</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3.5 font-bold text-slate-700 min-w-[200px]">Service</th>
                {BHK_KEYS.map((k) => (
                  <th key={k} className="text-center px-4 py-3.5 font-bold text-slate-700 min-w-[110px]">{BHK_LABEL[k]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merged.map((row, idx) => (
                <tr key={row.category} className={`border-b border-slate-100 ${idx % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{row.category}</p>
                    {row.doc?.baseLocked && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400">Base locked</span>
                      </div>
                    )}
                  </td>
                  {BHK_KEYS.map((key) => {
                    const base = row.doc?.bhkPrices?.[key]?.base ?? null;
                    const editable = row.doc?.bhkPrices?.[key]?.editable ?? null;
                    const cellKey = `${row.doc?.id}__${key}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <td key={key} className="px-4 py-4 text-center">
                        {base === null ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-400">Base: ₹{base}</div>
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(row.doc.id, key);
                                    if (e.key === "Escape") setEditingCell(null);
                                  }}
                                  autoFocus
                                  className="w-20 px-2 py-1 rounded-lg border border-[var(--brand)] text-xs text-center focus:outline-none"
                                />
                                <button
                                  onClick={() => saveEdit(row.doc.id, key)}
                                  disabled={busy}
                                  className="px-2 py-1 rounded-lg bg-[var(--brand)] text-white text-xs font-bold"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(row.doc?.id, key, editable ?? base)}
                                disabled={!isPricingAdmin || !row.doc?.id}
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                  isPricingAdmin && row.doc?.id
                                    ? "bg-[var(--brand-soft)] text-[var(--brand)] hover:bg-emerald-100 cursor-pointer"
                                    : "bg-slate-100 text-slate-600 cursor-default"
                                }`}
                              >
                                ₹{editable ?? base}
                                {isPricingAdmin && row.doc?.id && (
                                  <Unlock className="w-2.5 h-2.5 inline ml-1 opacity-60" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
