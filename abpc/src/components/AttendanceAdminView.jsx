/**
 * AttendanceAdminView — Admin sees live employee attendance for a job.
 * Real-time updates via Firestore subscription.
 */
import { useEffect, useState } from "react";
import { X, MapPin, CheckCircle2, Clock, User, Navigation } from "lucide-react";
import { subscribeQuery } from "../utils/firestoreHelpers";
import { collection, query, where, orderBy } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { formatDistance } from "../utils/geoLocation";
import { EmployeeS } from "../constants/authProfiles";

const glass = {
  background: "rgba(14,14,14,0.98)",
  border: "1px solid rgba(255,255,255,0.1)",
  backdropFilter: "blur(24px)",
};

const STATUS = {
  Present:    { label: "At Location ✅", color: "#6DBF4A", bg: "rgba(76,122,45,0.15)", border: "rgba(76,122,45,0.3)" },
  "Not Arrived": { label: "Not Arrived", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)" },
};

export default function AttendanceAdminView({ job, onClose }) {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    const q = query(
      collection(firestoreDb, "attendance"),
      where("jobId", "==", job.id),
      orderBy("timestamp", "asc")
    );
    return subscribeQuery(q, setRecords);
  }, [job.id]);

  // Build employee status map
  const assignedEmployees = Array.isArray(job.assignedTo) ? job.assignedTo : EmployeeS;
  const checkedInMap = {};
  records.forEach(r => { checkedInMap[r.employeeName] = r; });

  const presentCount = Object.keys(checkedInMap).length;

  return (
    <div className="fixed inset-0 z-200 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ ...glass, boxShadow: "0 24px 80px rgba(0,0,0,0.9)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-black text-white text-sm">Attendance</p>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Live
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              {job.customerName} · {presentCount}/{assignedEmployees.length} present
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl"
            style={{ color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {/* Job address */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <MapPin className="w-3.5 h-3.5 flex-0 mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
              {job.address || job.customerAddress || "No address set"}
            </p>
          </div>

          {/* Employee list */}
          <div className="space-y-2">
            {assignedEmployees.map(name => {
              const rec = checkedInMap[name];
              const isPresent = !!rec;
              const s = isPresent ? STATUS.Present : STATUS["Not Arrived"];

              return (
                <div key={name} className="rounded-2xl p-4"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black"
                        style={{ background: isPresent ? "rgba(76,122,45,0.2)" : "rgba(255,255,255,0.06)", color: isPresent ? "#6DBF4A" : "rgba(255,255,255,0.4)" }}>
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{name}</p>
                        {isPresent && (
                          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                            {new Date(rec.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                      {s.label}
                    </span>
                  </div>

                  {isPresent && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
                        style={{ background: "rgba(76,122,45,0.1)", border: "1px solid rgba(76,122,45,0.2)" }}>
                        <Navigation className="w-3 h-3" style={{ color: "#6DBF4A" }} />
                        <span className="text-[10px] font-bold" style={{ color: "#6DBF4A" }}>
                          {formatDistance(rec.distanceKm)} from site
                        </span>
                      </div>
                      {rec.empAccuracy && (
                        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                          GPS ±{Math.round(rec.empAccuracy)}m
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Assigned", value: assignedEmployees.length, color: "rgba(255,255,255,0.7)" },
                { label: "Present", value: presentCount, color: "#6DBF4A" },
                { label: "Pending", value: assignedEmployees.length - presentCount, color: "#E4572E" },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.3)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
