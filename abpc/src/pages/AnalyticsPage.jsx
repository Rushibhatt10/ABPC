import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { BarChart3, TrendingUp, Users, Briefcase, IndianRupee, CheckCircle2, Clock, Award } from "lucide-react";
import { EmployeeS } from "../constants/authProfiles";

function MiniBar({ value, max, color = "bg-[var(--brand)]" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AnalyticsPage() {
  const { isEmployee } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("reports", setReports),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = useMemo(() => {
    const totalRevenue = invoices.reduce((s, i) => s + Number(i.received || 0), 0);
    const pendingRevenue = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const pendingJobs = jobs.filter((j) => j.status !== "completed").length;
    const paidInvoices = invoices.filter((i) => Number(i.balance || 0) === 0).length;
    const collectionRate = invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 100) : 0;

    return { totalRevenue, pendingRevenue, completedJobs, pendingJobs, paidInvoices, collectionRate };
  }, [invoices, jobs]);

  // Employee performance
  const EmployeeStats = useMemo(() => {
    return EmployeeS.map((w) => {
      const EmployeeJobs = jobs.filter((j) => Array.isArray(j.assignedTo) ? j.assignedTo.includes(w) : j.assignedTo === w);
      const completed = EmployeeJobs.filter((j) => j.status === "completed").length;
      const EmployeeReports = reports.filter((r) => r.EmployeeName === w).length;
      return { name: w, total: EmployeeJobs.length, completed, reports: EmployeeReports };
    });
  }, [jobs, reports]);

  const maxEmployeeJobs = Math.max(...EmployeeStats.map((w) => w.total), 1);

  // Service breakdown
  const serviceBreakdown = useMemo(() => {
    const map = new Map();
    jobs.forEach((j) => {
      const key = j.serviceType || j.serviceName || "Other";
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [jobs]);

  const maxServiceCount = Math.max(...serviceBreakdown.map((s) => s[1]), 1);

  // Monthly revenue (last 6 months)
  const monthlyRevenue = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short" });
      const revenue = invoices
        .filter((inv) => String(inv.date || "").startsWith(key))
        .reduce((s, inv) => s + Number(inv.received || 0), 0);
      months.push({ key, label, revenue });
    }
    return months;
  }, [invoices]);

  const maxMonthRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

  if (isEmployee) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">Access restricted</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-0.5">Business performance overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), icon: TrendingUp, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
          { label: "Pending Revenue", value: formatCurrency(stats.pendingRevenue), icon: Clock, color: "bg-amber-50 border-amber-100 text-amber-700" },
          { label: "Total Customers", value: customers.length, icon: Users, color: "bg-blue-50 border-blue-100 text-blue-700" },
          { label: "Jobs Completed", value: stats.completedJobs, icon: CheckCircle2, color: "bg-violet-50 border-violet-100 text-violet-700" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
              <Icon className="w-5 h-5 mb-2 opacity-70" />
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-5">Monthly Revenue (Last 6 Months)</h2>
          <div className="space-y-3">
            {monthlyRevenue.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-8 flex-shrink-0">{m.label}</span>
                <div className="flex-1">
                  <MiniBar value={m.revenue} max={maxMonthRevenue} color="bg-[var(--brand)]" />
                </div>
                <span className="text-xs font-bold text-slate-700 w-20 text-right flex-shrink-0">{formatCurrency(m.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-[var(--brand)]" />
            <h2 className="font-bold text-slate-800">Employee Performance</h2>
          </div>
          <div className="space-y-4">
            {EmployeeStats.map((w) => (
              <div key={w.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center text-[var(--brand)] text-xs font-black">
                      {w.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{w.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="text-emerald-600 font-bold">{w.completed} done</span>
                    <span>{w.total} total</span>
                    <span>{w.reports} reports</span>
                  </div>
                </div>
                <MiniBar value={w.completed} max={maxEmployeeJobs} color="bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-5">Top Services</h2>
          <div className="space-y-3">
            {serviceBreakdown.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No job data yet</p>
            ) : (
              serviceBreakdown.map(([service, count]) => (
                <div key={service} className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-600 flex-1 truncate">{service}</span>
                  <div className="w-32">
                    <MiniBar value={count} max={maxServiceCount} color="bg-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-6 text-right flex-shrink-0">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-5">Business Summary</h2>
          <div className="space-y-3">
            {[
              { label: "Total Customers", value: customers.length, icon: Users },
              { label: "Total Jobs", value: jobs.length, icon: Briefcase },
              { label: "Completed Jobs", value: stats.completedJobs, icon: CheckCircle2 },
              { label: "Pending Jobs", value: stats.pendingJobs, icon: Clock },
              { label: "Total Invoices", value: invoices.length, icon: IndianRupee },
              { label: "Collection Rate", value: `${stats.collectionRate}%`, icon: TrendingUp },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{s.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{s.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
