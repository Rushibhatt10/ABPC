import { useState } from "react";
import { UNIT_TYPES } from "../utils/pricing";

export default function UnitTypesDisplay() {
  const [selectedUnit, setSelectedUnit] = useState("");

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-900">Unit Types</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="field-label">All Units</label>
          <select
            className="field-input"
            onChange={(event) => setSelectedUnit(event.target.value)}
            value={selectedUnit}
          >
            <option value="">Select unit</option>
            {UNIT_TYPES.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <p className="field-label">Comma Separated</p>
          <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {UNIT_TYPES.map((unit) => unit.label).join(", ")}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <p className="field-label">Tags</p>
        <div className="flex flex-wrap gap-2">
          {UNIT_TYPES.map((unit) => (
            <span
              key={unit.value}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {unit.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
