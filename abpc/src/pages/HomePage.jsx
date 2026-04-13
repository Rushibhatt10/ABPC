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
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm font-semibold mt-0.5">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
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
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
          isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
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
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
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

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3">આજના જોબ્સ</h2>
        {todayJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="font-semibold text-slate-700">આજ માટે કોઈ જોબ નથી</p>
            <p className="text-sm text-slate-400 mt-1">લેટર ચેક કરો અથવા બધા જોબ્સ જુઓ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayJobs.map((job) => (
              <EmployeeJobCard
                key={job.id}
                job={job}
                onComplete={handleComplete}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-800 mb-3">બધા અસાઇન્ડ જોબ્સ</h2>
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <p className="text-sm text-slate-500">હજુ કોઈ જોબ અસાઇન નથી.</p>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-slate-800 text-sm">{job.customerName}</p>
                    {job.jobType === "Rework" && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                        <RefreshCw className="w-2.5 h-2.5" /> Rework
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{job.serviceType} · {formatDateDisplay(job.scheduledDate)}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  job.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {job.status === "completed" ? "કમ્પ્લીટ" : "પેન્ડિંગ"}
                </span>
              </div>
            ))
          )}
        </div>
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
    { label: "New Customer",  to: "/admin/customers",  icon: Users,     gradient: "from-blue-500 to-blue-600" },
    { label: "Create Job",    to: "/admin/jobs",        icon: Briefcase, gradient: "from-emerald-500 to-emerald-600" },
    { label: "New Invoice",   to: "/admin/invoices",    icon: Receipt,   gradient: "from-violet-500 to-violet-600" },
    { label: "New Quotation", to: "/admin/quotations",  icon: FileText,  gradient: "from-amber-500 to-amber-600" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">

      {/* ── HERO HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl"
        style={{ background: "linear-gradient(135deg, #4A3F38 0%, #6B5E55 60%, #8B7E74 100%)" }}>
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
          { label: "Total Revenue",   value: formatCurrency(stats.totalRevenue),  sub: "All time collected",                          icon: TrendingUp, bg: "bg-emerald-50", border: "border-emerald-100", iconBg: "bg-emerald-500", text: "text-emerald-700" },
          { label: "Pending Amount",  value: formatCurrency(stats.pendingAmount), sub: `${stats.pendingCount} invoice${stats.pendingCount !== 1 ? "s" : ""}`, icon: Clock,      bg: "bg-amber-50",   border: "border-amber-100",   iconBg: "bg-amber-500",   text: "text-amber-700"   },
          { label: "Today's Jobs",    value: stats.todayJobs,                     sub: "Scheduled today",                             icon: Calendar,   bg: "bg-blue-50",    border: "border-blue-100",    iconBg: "bg-blue-500",    text: "text-blue-700"    },
          { label: "Total Customers", value: customers.length,                    sub: "In CRM",                                      icon: Users,      bg: "bg-violet-50",  border: "border-violet-100",  iconBg: "bg-violet-500",  text: "text-violet-700"  },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-4 sm:p-5 flex flex-col gap-3`}>
              <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shadow-sm`}>
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{s.value}</p>
                <p className={`text-xs font-bold mt-1 ${s.text}`}>{s.label}</p>
                {s.sub && <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.to} to={q.to}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 flex flex-col items-center gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 active:scale-95">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${q.gradient} flex items-center justify-center shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-bold text-slate-600 text-center group-hover:text-slate-900 transition-colors leading-tight">{q.label}</span>
                <ArrowRight className="absolute bottom-3 right-3 w-3 h-3 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── WEBSITE ENQUIRIES ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-sm">Website Enquiries</h2>
            {unreadMessages > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">{unreadMessages}</span>
            )}
          </div>
        </div>
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No enquiries yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {[...messages].reverse().map((msg) => (
              <div key={msg.id} className={`px-5 py-4 hover:bg-slate-50 transition-colors ${!msg.read ? "bg-amber-50/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{msg.full_name}</span>
                      {!msg.read && <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold">NEW</span>}
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {msg.phone_number && (
                        <a href={`tel:${msg.phone_number}`} className="flex items-center gap-1 text-xs text-[var(--brand)] hover:underline">
                          <Phone className="w-3 h-3" /> {msg.phone_number}
                        </a>
                      )}
                      {msg.email && (
                        <a href={`mailto:${msg.email}`} className="flex items-center gap-1 text-xs text-slate-500 hover:underline">
                          <Mail className="w-3 h-3" /> {msg.email}
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{msg.message}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {!msg.read && (
                      <button onClick={() => updateRecord("messages", msg.id, { read: true })}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold hover:bg-emerald-200 transition-colors whitespace-nowrap">
                        Mark read
                      </button>
                    )}
                    <button onClick={() => deleteRecord("messages", msg.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors self-end">
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
