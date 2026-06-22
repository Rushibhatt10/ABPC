import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatCurrency, formatDateDisplay } from "../../utils/format";
import { CalendarClock, Shield, CheckCircle2, Clock, Calendar, HelpCircle } from "lucide-react";
import { matchesCustomerRecord } from "../utils/customerRecordMatch";

const DURATIONS_MAP = {
  1: { label: "1 Month", visits: 1 },
  3: { label: "3 Months (Quarterly)", visits: 1 },
  6: { label: "6 Months (Half-Yearly)", visits: 2 },
  12: { label: "12 Months (Annual)", visits: 4 }
};

export default function CustomerAMCPage() {
  const { activeCustomerId, activeCustomer } = useCustomerAuth();
  const [amcs, setAmcs] = useState([]);

  useEffect(() => {
    if (!activeCustomerId) return;
    const q = query(collection(firestoreDb, "amc"));
    return subscribeQuery(q, (records) => {
      setAmcs(records.filter((record) => matchesCustomerRecord(record, activeCustomerId, activeCustomer)));
    });
  }, [activeCustomerId, activeCustomer]);

  const sortedAmcs = useMemo(() => {
    return [...amcs].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
  }, [amcs]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">AMC Contracts</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Review your active pest protection plans and visit logs</p>
      </div>

      {sortedAmcs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center">
          <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No AMC Contracts Found</p>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            You don't have any active or past Annual Maintenance Contracts registered. Please contact support.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedAmcs.map((amc) => {
            const startDateStr = formatDateDisplay(amc.startDate);
            const endDateStr = formatDateDisplay(amc.endDate);
            const durationLabel = DURATIONS_MAP[amc.durationMonths]?.label || `${amc.durationMonths} Months`;
            
            const totalVisits = Number(amc.visits || 4);
            const visitLog = amc.visitLog || [];
            const completedVisits = visitLog.length;
            const remainingVisits = Math.max(0, totalVisits - completedVisits);

            const isExpired = new Date(amc.endDate) < new Date();
            const amcStatus = isExpired ? "Expired" : amc.status || "Active";

            return (
              <div
                key={amc.id}
                className={`bg-white rounded-3xl border p-5 sm:p-6 shadow-sm space-y-5 ${
                  isExpired ? "border-slate-200 bg-slate-50/50" : "border-slate-200"
                }`}
              >
                {/* Top Title Row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-base">
                        {durationLabel} Protect Plan
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isExpired 
                          ? "bg-rose-100 text-rose-700 border border-rose-200" 
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}>
                        {amcStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Contract ID: {amc.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800 text-base">{formatCurrency(amc.totalAmount)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Contract Total</p>
                  </div>
                </div>

                {/* Contract Dates info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{startDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{endDateStr}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing status</p>
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-150 text-[10px] font-bold mt-1">
                      {amc.invoiceId ? "Invoiced" : "Pending Invoice"}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Services Included</p>
                    <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
                      {amc.services?.map(s => s.itemName).join(", ") || "General Protection"}
                    </p>
                  </div>
                </div>

                {/* Visits Tracker Dashboard */}
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Visits Progress</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-3 bg-slate-50 border border-slate-150 text-center">
                      <p className="text-xs text-slate-500 font-semibold">Total Visits</p>
                      <p className="text-lg font-black text-slate-900 mt-0.5">{totalVisits}</p>
                    </div>
                    <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-100 text-center">
                      <p className="text-xs text-emerald-600 font-semibold">Completed</p>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">{completedVisits}</p>
                    </div>
                    <div className="rounded-xl p-3 bg-blue-50 border border-blue-150 text-center">
                      <p className="text-xs text-blue-600 font-semibold">Remaining</p>
                      <p className="text-lg font-black text-blue-700 mt-0.5">{remainingVisits}</p>
                    </div>
                  </div>
                </div>

                {/* Visit logs timeline */}
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3.5">Visit History Log</h4>
                  {visitLog.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150/60 text-center text-xs text-slate-400">
                      <Clock className="w-5 h-5 mx-auto mb-1.5 text-slate-300" />
                      No visits logged yet. The first service visit will be scheduled shortly.
                    </div>
                  ) : (
                    <div className="relative border-l border-blue-150 pl-4 ml-2.5 space-y-4">
                      {visitLog.map((visit, i) => (
                        <div key={i} className="relative">
                          <span className="absolute -left-[22px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
                              Visit #{i + 1}
                              <span className="text-[10px] font-normal text-slate-400">· {formatDateDisplay(visit.date)}</span>
                            </p>
                            {visit.notes && <p className="text-xs text-slate-500 italic">"{visit.notes}"</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
