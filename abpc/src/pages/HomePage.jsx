import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Briefcase, TrendingUp, Clock, CheckCircle2,
  Calendar, ArrowRight, Plus, FileText, Receipt,
  MessageSquare, Trash2, Phone, Mail, Search, RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { subscribeCollection, subscribeQuery, updateRecord, deleteRecord } from "../utils/firestoreHelpers";
import { formatCurrency, getTodayISO, formatDateDisplay } from "../utils/format";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import MapLink from "../components/MapLink";

function StatCard({ label, value, icon, color, sub }) {
  const IconComponent = icon;
  const colors = {
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const iconColors = {
    green: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    blue: "bg-blue-100 text-blue-600",
    violet: "bg-violet-100 text-violet-600",
    rose: "bg-rose-100 text-rose-600",
  };
  return (
    <div className={`rounded-2xl border-2 p-5 transition-all duration-300 hover:scale-[1.02] ${colors[color]}`}
      style={{
        boxShadow: `0 10px 30px -10px rgba(0,0,0,0.05), 0 0 15px -5px ${color === 'green' ? 'rgba(16,185,129,0.2)' :
            color === 'amber' ? 'rgba(245,158,11,0.2)' :
              color === 'blue' ? 'rgba(59,130,246,0.2)' :
                color === 'violet' ? 'rgba(139,92,246,0.2)' :
                  'rgba(0,0,0,0.05)'
          }`
      }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconColors[color]}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{value}</p>
      <p className="text-sm font-bold mt-1.5 text-slate-700">{label}</p>
      {sub && <p className="text-[11px] mt-1 font-medium opacity-60">{sub}</p>}
    </div>
  );
}

function EmployeeJobCard({ job, onComplete, saving }) {
  const [notes, setNotes] = useState(job.notes || "");

  const isCompleted = job.status === "completed";
  const jobAddress = job.address || job.customerAddress || "";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-900">{job.customerName || "Customer"}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{job.serviceType || job.serviceName || "Service"}</p>
          {jobAddress ? <p className="text-xs text-slate-400 mt-0.5">{jobAddress}</p> : null}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}>
          {isCompleted ? "કમ્પ્લીટ" : "પેન્ડિંગ"}
        </span>
      </div>

      {jobAddress ? (
        <MapLink
          address={jobAddress}
          className="mb-4"
          label="Open in Maps"
          showDirections
        />
      ) : null}


      {!isCompleted && (
        <div className="text-sm font-semibold text-slate-500 py-2">
          જોબ ચાલુ છે...
        </div>
      )}

      {isCompleted && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            જોબ કમ્પ્લીટ થઈ
          </div>
          {job.notes && (
            <div className="px-3 py-2 bg-slate-50 rounded-xl">
              <p className="text-xs font-bold text-slate-500 mb-1">નોટ્સ:</p>
              <p className="text-sm text-slate-700">{job.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmployeeDashboard({ profile }) {
  const EmployeeName = profile?.EmployeeTag || profile?.name || "";
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(firestoreDb, "jobs"),
      where("assignedTo", "array-contains", EmployeeName)
    );
    return subscribeQuery(q, setJobs);
  }, [EmployeeName]);

  const sortedJobs = useMemo(() =>
    [...jobs].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    if (!search.trim()) return sortedJobs;
    const q = search.toLowerCase();
    return sortedJobs.filter((j) =>
      j.customerName?.toLowerCase().includes(q) ||
      j.serviceType?.toLowerCase().includes(q) ||
      j.id?.toLowerCase().includes(q)
    );
  }, [sortedJobs, search]);

  const todayJobs = useMemo(() => {
    const today = getTodayISO();
    return filteredJobs.filter((j) => String(j.scheduledDate) === today || !j.scheduledDate);
  }, [filteredJobs]);

  const tomorrowISO = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const [dayFilter, setDayFilter] = useState("today"); // "today" | "tomorrow" | "all"

  const displayJobs = useMemo(() => {
    if (dayFilter === "today") return filteredJobs.filter(j => String(j.scheduledDate) === getTodayISO() || !j.scheduledDate);
    if (dayFilter === "tomorrow") return filteredJobs.filter(j => String(j.scheduledDate) === tomorrowISO);
    return filteredJobs;
  }, [filteredJobs, dayFilter, tomorrowISO]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const handleComplete = async (jobId, data) => {
    setSaving(true);
    try {
      await updateRecord("jobs", jobId, {
        status: "completed",
        checklist: data.checklist,
        notes: data.notes,
        completedAt: new Date().toISOString(),
        completedBy: EmployeeName,
      });
      showMsg("success", "જોબ કમ્પ્લીટ થઈ!");
    } catch (err) {
      showMsg("error", err.message || "જોબ અપડેટ કરવામાં એરર આવી");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">હેય, {profile?.name} 👋</h1>
        <p className="text-slate-500 mt-1">આજના તમારા અસાઇન કરેલા ટાસ્ક અહીં છે.</p>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
          }`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="ટોટલ જોબ્સ" value={jobs.length} icon={Briefcase} color="blue" />
        <StatCard label="આજના જોબ્સ" value={todayJobs.length} icon={Calendar} color="green" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="જોબ ID અથવા કસ્ટમર નામ સર્ચ કરો..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-[var(--brand)] focus:outline-none text-sm bg-white" />
      </div>

      {/* Day filter */}
      <div className="flex gap-2">
        {[
          { key: "today", label: "આજ" },
          { key: "tomorrow", label: "કાલ" },
          { key: "all", label: "બધા" },
        ].map(t => (
          <button key={t.key} onClick={() => setDayFilter(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${dayFilter === t.key ? "bg-[var(--brand)] text-white" : "bg-white border border-slate-200 text-slate-600"
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3">
          {dayFilter === "today" ? "આજના જોબ્સ" : dayFilter === "tomorrow" ? "કાલના જોબ્સ" : "બધા જોબ્સ"}
        </h2>
        {displayJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">કોઈ જોબ મળ્યો નહીં</p>
            <p className="text-sm text-slate-400 mt-1">બીજો ટૅબ ટ્રાય કરો</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayJobs.map((job) => (
              <EmployeeJobCard key={job.id} job={job} onComplete={handleComplete} saving={saving} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function AdminDashboard({ profile }) {
  const [customers, setCustomers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const unsubs = [
      subscribeCollection("customers", setCustomers),
      subscribeCollection("jobs", setJobs),
      subscribeCollection("invoices", setInvoices),
      subscribeCollection("messages", setMessages),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const stats = useMemo(() => {
    const today = getTodayISO();
    const totalRevenue = invoices.reduce((s, i) => s + Number(i.received || 0), 0);
    const pendingPayments = invoices.filter((i) => Number(i.balance || 0) > 0);
    const pendingAmount = pendingPayments.reduce((s, i) => s + Number(i.balance || 0), 0);
    const todayJobs = jobs.filter((j) => String(j.scheduledDate) === today);
    const completedJobs = jobs.filter((j) => j.status === "completed");
    return { totalRevenue, pendingAmount, pendingCount: pendingPayments.length, todayJobs: todayJobs.length, completedJobs: completedJobs.length };
  }, [invoices, jobs]);

  const recentJobs = useMemo(() => [...jobs].reverse().slice(0, 5), [jobs]);
  const recentCustomers = useMemo(() => [...customers].reverse().slice(0, 4), [customers]);
  const unreadMessages = messages.filter(m => !m.read).length;
  const firstName = profile?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quickLinks = [
    { label: "New Customer", to: "/admin/customers", icon: Users, gradient: "from-blue-500 to-blue-600" },
    { label: "Create Job", to: "/admin/jobs", icon: Briefcase, gradient: "from-emerald-500 to-emerald-600" },
    { label: "New Invoice", to: "/admin/invoices", icon: Receipt, gradient: "from-violet-500 to-violet-600" },
    { label: "New Quotation", to: "/admin/quotations", icon: FileText, gradient: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
        style={{ background: "linear-gradient(135deg, #1F3D1F 0%, #2F4F2F 60%, #4C7A2D 100%)", border: "1px solid rgba(76,122,45,0.3)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative px-5 sm:px-8 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{greeting}</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{firstName} 👋</h1>
            <p className="text-white/70 text-sm mt-1.5">Here's your business snapshot for today.</p>
          </div>
          <Link to="/admin/jobs"
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition-all backdrop-blur-sm border border-white/20 self-start sm:self-auto active:scale-95">
            <Plus className="w-4 h-4" /> New Job
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(stats.totalRevenue), sub: "All time collected", icon: TrendingUp, bg: "border-[rgba(76,122,45,0.3)]", iconBg: "bg-[#4C7A2D]", text: "text-[#4C7A2D]" },
          { label: "Pending Amount", value: formatCurrency(stats.pendingAmount), sub: `${stats.pendingCount} invoice${stats.pendingCount !== 1 ? "s" : ""}`, icon: Clock, bg: "border-[rgba(228,87,46,0.3)]", iconBg: "bg-[#E4572E]", text: "text-[#E4572E]" },
          { label: "Today's Jobs", value: stats.todayJobs, sub: "Scheduled today", icon: Calendar, bg: "border-[rgba(59,130,246,0.3)]", iconBg: "bg-blue-600", text: "text-blue-600", color: 'blue' },
          { label: "Total Customers", value: customers.length, sub: "In CRM", icon: Users, bg: "border-[rgba(139,92,246,0.3)]", iconBg: "bg-violet-600", text: "text-violet-600", color: 'violet' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border-2 ${s.bg} p-4 sm:p-5 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.05] hover:shadow-lg`}
              style={{ background: "#ffffff", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1)" }}>
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shadow-lg shadow-black/5`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                <p className={`text-xs font-black mt-2 uppercase tracking-wider ${s.text}`}>{s.label}</p>
                {s.sub && <p className="text-[10px] text-slate-400 font-bold mt-1">{s.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div>
        <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.to} to={q.to}
                className="group relative overflow-hidden rounded-2xl p-4 flex flex-col items-center gap-3 hover:scale-[1.05] transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md"
                style={{ background: "#ffffff", border: "2px solid rgba(0,0,0,0.04)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(76,122,45,0.4)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(0,0,0,0.04)"}>
                <div className={`w-12 h-12 rounded-2xl bg-gradient ${q.gradient} flex items-center justify-center shadow-lg shadow-black/10 group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-black text-slate-600 text-center group-hover:text-slate-900 transition-colors uppercase tracking-wider">{q.label}</span>
                <ArrowRight className="absolute bottom-3 right-3 w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── WEBSITE ENQUIRIES ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(76,122,45,0.2)" }}>
              <MessageSquare className="w-3.5 h-3.5 text-[#4C7A2D]" />
            </div>
            <h2 className="font-bold text-white text-sm">Website Enquiries</h2>
            {unreadMessages > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{unreadMessages}</span>
            )}
          </div>
        </div>
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "rgba(255,255,255,0.15)" }} />
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>No enquiries yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {[...messages].reverse().map((msg) => (
              <div key={msg.id} className="px-5 py-4 transition-colors"
                style={{ background: msg.read ? "transparent" : "rgba(228,87,46,0.06)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-sm text-white">{msg.full_name}</span>
                      {!msg.read && <span className="px-1.5 py-0.5 rounded-full bg-[#E4572E] text-white text-[10px] font-bold">NEW</span>}
                      <span className="text-[11px] ml-auto flex items-center gap-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                        📅 {msg.createdAt ? new Date(msg.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {msg.phone_number && (
                        <a href={`tel:${msg.phone_number}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#4C7A2D" }}>
                          <Phone className="w-3 h-3" /> {msg.phone_number}
                        </a>
                      )}
                      {msg.email && (
                        <a href={`mailto:${msg.email}`} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <Mail className="w-3 h-3" /> {msg.email}
                        </a>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{msg.message}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!msg.read && (
                      <button onClick={() => updateRecord("messages", msg.id, { read: true })}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        style={{ background: "rgba(76,122,45,0.2)", color: "#6DBF4A", border: "1px solid rgba(76,122,45,0.3)" }}>
                        Mark read
                      </button>
                    )}
                    <button onClick={() => deleteRecord("messages", msg.id)}
                      className="p-1.5 rounded-lg transition-colors self-end"
                      style={{ color: "rgba(255,255,255,0.2)" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#F87171"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default function HomePage() {
  const { profile, isEmployee } = useAuth();
  if (isEmployee) return <EmployeeDashboard profile={profile} />;
  return <AdminDashboard profile={profile} />;
}
