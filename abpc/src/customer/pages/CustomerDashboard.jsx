import { useEffect, useState, useMemo } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatCurrency, formatDateDisplay, toDateObject } from "../../utils/format";
import { parseWarrantyDays } from "../../utils/warranty";
import {
  Calendar, CreditCard, FileText, Bell, CheckCircle2,
  Clock, Shield, ArrowRight, User
} from "lucide-react";
import { Link } from "react-router-dom";

export default function CustomerDashboard() {
  const { activeCustomer, activeCustomerId } = useCustomerAuth();
  
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [amcs, setAmcs] = useState([]);

  // Subscribe to customer-related documents in Firestore
  useEffect(() => {
    if (!activeCustomerId) return;

    const jobsQ = query(
      collection(firestoreDb, "jobs"),
      where("customerId", "==", activeCustomerId)
    );
    const invoicesQ = query(
      collection(firestoreDb, "invoices"),
      where("customerId", "==", activeCustomerId)
    );
    const quotationsQ = query(
      collection(firestoreDb, "quotations"),
      where("customerId", "==", activeCustomerId)
    );
    const amcsQ = query(
      collection(firestoreDb, "amc"),
      where("customerId", "==", activeCustomerId)
    );

    const unsubs = [
      subscribeQuery(jobsQ, setJobs),
      subscribeQuery(invoicesQ, setInvoices),
      subscribeQuery(quotationsQ, setQuotations),
      subscribeQuery(amcsQ, setAmcs)
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [activeCustomerId]);

  // Compute stats
  const activeAmc = useMemo(() => {
    return amcs.find(a => a.status === "Active") || null;
  }, [amcs]);

  const nextJob = useMemo(() => {
    const pending = jobs.filter(j => j.status !== "completed" && j.scheduledDate);
    if (pending.length === 0) return null;
    return [...pending].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  }, [jobs]);

  const pendingQuotesCount = useMemo(() => {
    return quotations.filter(q => q.status === "Draft" && !q.customerApprovalStatus).length;
  }, [quotations]);

  const unpaidInvoices = useMemo(() => {
    return invoices.filter(i => Number(i.balance || 0) > 0);
  }, [invoices]);

  const unpaidInvoicesCount = unpaidInvoices.length;
  const unpaidInvoicesSum = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
  }, [unpaidInvoices]);

  const completedJobs = useMemo(() => {
    return [...jobs]
      .filter(job => job.status === "completed")
      .sort((a, b) => new Date(b.completedAt || b.scheduledDate || 0) - new Date(a.completedAt || a.scheduledDate || 0));
  }, [jobs]);

  // Build a warranty map: jobId → { warranty, startDate }
  // Matches by jobId first, then by service name similarity
  const jobWarrantyMap = useMemo(() => {
    const map = {};

    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (!item.warranty) return;
        // Direct jobId match
        const jobId = item.jobId || inv.jobId;
        if (jobId && !map[jobId]) {
          map[jobId] = { warranty: item.warranty, startDate: inv.date };
        }
      });
    });

    // Second pass: match by service name for jobs that didn't get a direct hit
    completedJobs.forEach(job => {
      if (map[job.id]) return; // already matched
      const jobName = (job.treatmentLabel || job.serviceType || job.serviceName || "").toLowerCase().trim();
      if (!jobName) return;

      // Find an invoice item whose itemName closely matches this job's service name
      for (const inv of invoices) {
        for (const item of (inv.items || [])) {
          if (!item.warranty) continue;
          const itemName = (item.itemName || "").toLowerCase().trim();
          if (
            itemName === jobName ||
            itemName.includes(jobName) ||
            jobName.includes(itemName) ||
            // e.g. "Termite — Foundation Treatment" vs "Foundation Treatment"
            jobName.includes(itemName.split(" — ")[1] || "") ||
            itemName.includes(jobName.split(" — ")[1] || "")
          ) {
            map[job.id] = { warranty: item.warranty, startDate: inv.date };
            break;
          }
        }
        if (map[job.id]) break;
      }

      // Last resort: top-level invoice.warranty
      if (!map[job.id]) {
        for (const inv of invoices) {
          if (inv.warranty && (inv.jobId === job.id || inv.jobIds?.includes(job.id))) {
            map[job.id] = { warranty: inv.warranty, startDate: inv.date };
            break;
          }
        }
      }
    });

    return map;
  }, [invoices, completedJobs]);

  // Generate dynamic notifications timeline feed
  const timelineEvents = useMemo(() => {
    const events = [];

    // AMC active events
    amcs.forEach(amc => {
      events.push({
        id: `amc-${amc.id}`,
        title: amc.status === "Active" ? "AMC Contract Active" : "AMC Contract Expired",
        date: amc.startDate,
        description: `Plan: ${amc.services?.map(s => s.itemName).join(", ") || "General Services"}`,
        type: "amc",
        timestamp: new Date(amc.startDate).getTime()
      });

      // Visit logs as completions
      if (amc.visitLog) {
        amc.visitLog.forEach((visit, i) => {
          events.push({
            id: `visit-${amc.id}-${i}`,
            title: `AMC Visit #${i + 1} Completed`,
            date: visit.date,
            description: visit.notes || "Routine pest service checkup.",
            type: "completed",
            timestamp: new Date(visit.date).getTime()
          });
        });
      }
    });

    // Job events
    jobs.forEach(job => {
      if (job.status === "completed") {
        events.push({
          id: `job-done-${job.id}`,
          title: "Pest Treatment Completed",
          date: job.completedAt?.split("T")[0] || job.scheduledDate,
          description: `${job.serviceType || "Service"} completed by ${job.completedBy || "technician"}.`,
          type: "completed",
          timestamp: new Date(job.completedAt || job.scheduledDate).getTime()
        });
      } else if (job.scheduledDate) {
        events.push({
          id: `job-sched-${job.id}`,
          title: "Service Visit Scheduled",
          date: job.scheduledDate,
          description: `${job.serviceType || "Service"} is scheduled.`,
          type: "scheduled",
          timestamp: new Date(job.scheduledDate).getTime()
        });
      }
    });

    // Invoice events
    invoices.forEach(inv => {
      events.push({
        id: `inv-${inv.id}`,
        title: `Invoice Generated: ${inv.invoiceNumber}`,
        date: inv.date,
        description: `Total invoice amount: ${formatCurrency(inv.total)}`,
        type: "invoice",
        timestamp: new Date(inv.date).getTime()
      });
    });

    // Sort descending by date
    return events.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  }, [jobs, invoices, amcs]);

  return (
    <div className="space-y-6 sm:space-y-8">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(135deg, #1F3D1F 0%, #2F4F2F 60%, #4C7A2D 100%)", border: "1px solid rgba(76,122,45,0.3)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative px-5 sm:px-8 py-6 sm:py-8">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">Customer Dashboard</p>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">Welcome, {activeCustomer?.name} 👋</h1>
          <p className="text-white/70 text-sm mt-1.5">Here is an overview of your active pest protection plans and services.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* AMC Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeAmc ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {activeAmc ? "Active" : "No Plan"}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {activeAmc ? "Protected" : "Inactive"}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wide">AMC Plan</p>
            {activeAmc && (
              <p className="text-[10px] text-slate-400 mt-0.5">Expires: {formatDateDisplay(activeAmc.endDate)}</p>
            )}
          </div>
        </div>

        {/* Next Visit Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            {nextJob && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">Scheduled</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-lg sm:text-xl font-black text-slate-900 leading-none truncate">
              {nextJob ? formatDateDisplay(nextJob.scheduledDate) : "Not Scheduled"}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wide">Next Visit</p>
            {nextJob && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{nextJob.serviceType || nextJob.serviceName}</p>
            )}
          </div>
        </div>

        {/* Pending Quotes Card */}
        <Link to="/customer/quotations" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            {pendingQuotesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{pendingQuotesCount} NEW</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {pendingQuotesCount}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wide group-hover:text-[var(--brand)] transition-colors">Pending Quotes</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tap to review & sign</p>
          </div>
        </Link>

        {/* Unpaid Invoices Card */}
        <Link to="/customer/invoices" className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.03] shadow-sm hover:shadow-md group">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform">
              <CreditCard className="w-5 h-5" />
            </div>
            {unpaidInvoicesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">Unpaid</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-lg sm:text-xl font-black text-slate-900 leading-none">
              {unpaidInvoicesCount > 0 ? formatCurrency(unpaidInvoicesSum) : "₹0.00"}
            </p>
            <p className="text-xs font-bold text-slate-500 mt-1.5 uppercase tracking-wide group-hover:text-[var(--brand)] transition-colors">Pending Payments</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{unpaidInvoicesCount} invoices pending</p>
          </div>
        </Link>

      </div>

      {/* Dashboard Details Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Next Scheduled Job Details */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
            Scheduled Service
          </h2>
          {nextJob ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">{nextJob.serviceType || nextJob.serviceName}</p>
                  <p className="text-xs text-slate-500">{formatDateDisplay(nextJob.scheduledDate)}</p>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Details</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-amber-600">Scheduled Visit</span>
                </div>
                {nextJob.notes && (
                  <p className="text-xs text-slate-600 border-t border-slate-200/60 pt-2 italic">"{nextJob.notes}"</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-500">No scheduled visits</p>
              <p className="text-[10px] text-slate-400 mt-0.5">All treatments complete!</p>
            </div>
          )}
        </div>

        {/* Notifications / Timeline Events */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            Recent Service History
          </h2>

          {timelineEvents.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-semibold text-slate-500">No recent updates</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-6">
              {timelineEvents.map((evt) => {
                const iconColor = 
                  evt.type === "completed" ? "bg-emerald-500 ring-emerald-100" :
                  evt.type === "scheduled" ? "bg-blue-500 ring-blue-100" :
                  evt.type === "amc" ? "bg-emerald-600 ring-emerald-150" :
                  "bg-amber-500 ring-amber-100";

                return (
                  <div key={evt.id} className="relative">
                    {/* timeline marker */}
                    <span className={`absolute -left-[27px] top-1.5 w-3 h-3 rounded-full ring-4 ${iconColor}`} />
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-slate-800 leading-tight">{evt.title}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatDateDisplay(evt.date)}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
