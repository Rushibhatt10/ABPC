import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createRecord, deleteRecord, subscribeCollection, subscribeQuery, updateRecord, nextDocumentNumber } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay, getTodayISO } from "../utils/format";
import { EmployeeS } from "../constants/authProfiles";
import MapLink from "../components/MapLink";
import { getUnitLabel } from "../utils/pricing";
import ServicePicker from "../components/ServicePicker";
import JobReportModal from "../components/JobReportModal";
import JobVideoReportModal from "../components/JobVideoReportModal";
import JobReportsAdminView from "../components/JobReportsAdminView";
import AttendanceCheckIn from "../components/AttendanceCheckIn";
import AttendanceAdminView from "../components/AttendanceAdminView";
import SetJobLocation from "../components/SetJobLocation";
import PaymentModeModal from "../components/PaymentModeModal";
import { TREATMENT_GROUPS, TREATMENT_TEMPLATES, buildSubJobs, getJobsByTreatment } from "../constants/treatmentJobs";
import CustomerSearch from "../components/CustomerSearch";
import "../components/ServiceCalculator.css";
import {
  Briefcase, Plus, X, CheckCircle2, Clock,
  User, Calendar, MapPin, ChevronDown, ChevronUp,
  RefreshCw, History, Search, Link2, UploadCloud, FileText, Receipt,
  Users, ChevronRight, ArrowLeft, Video, BarChart2, Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import FileSaver from "file-saver";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";

const saveAs = FileSaver.saveAs || FileSaver;

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const JOB_FORM_UNITS = [
  { value: "sqft", label: "SqFt" },
  { value: "sqmt", label: "SqMt" },
  { value: "unit", label: "Unit" },
  { value: "piece", label: "Per Piece" },
];

/**
 * Parses warranty string into days.
 * Returns 0 for unknown/invalid formats.
 */
function parseWarrantyDays(w) {
  if (!w || w === "No Warranty") return 0;
  const lower = w.toLowerCase().trim();
  const n = parseInt(lower) || 1;
  if (lower.includes("year"))  return n * 365;
  if (lower.includes("month")) return n * 30;
  if (lower.includes("day"))   return parseInt(lower) || 0;
  return 0; // unknown format → no warranty
}

/**
 * Returns true ONLY if job has a valid warranty AND it hasn't expired.
 */
function isUnderWarranty(job) {
  const days = parseWarrantyDays(job.warranty);
  if (days === 0) return false;
  if (!job.completedAt) return false;
  const expiry = new Date(job.completedAt);
  expiry.setDate(expiry.getDate() + days);
  return new Date() <= expiry;
}

/**
 * "none"    → no warranty or "No Warranty"
 * "pending" → warranty set but job not completed yet
 * "active"  → warranty valid and not expired
 * "expired" → warranty set but past expiry
 */
function warrantyStatus(job) {
  const days = parseWarrantyDays(job.warranty);
  if (days === 0) return "none";
  if (!job.completedAt) return "pending";
  return isUnderWarranty(job) ? "active" : "expired";
}

/**
 * Stable treatment block for job creation so inputs don't remount while typing.
 * @param {{
 *   tKey: string,
 *   tPrice: string,
 *   tQty: string,
 *   tUnit: string,
 *   onTKey: (value: string) => void,
 *   onPrice: (value: string) => void,
 *   onQty: (value: string) => void,
 *   onUnit: (value: string) => void,
 *   label: string,
 * }} props
 */
function TreatmentBlock({ tKey, tPrice, tQty, tUnit, onTKey, onPrice, onQty, onUnit, label }) {
  const tmpl = tKey ? TREATMENT_TEMPLATES[tKey] : null;
  const blockTotal = (parseFloat(tPrice) || 0) * (parseFloat(tQty) || 0);

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {TREATMENT_GROUPS.map((grp) => (
          <div key={grp.group}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{grp.group}</p>
            <div className="flex flex-wrap gap-1.5">
              {grp.items.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onTKey(key); onPrice(""); onQty("1"); onUnit("unit"); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    tKey === key
                      ? "bg-(--brand) text-white border-(--brand)"
                      : "bg-white text-slate-600 border-slate-200 hover:border-(--brand)"
                  }`}
                >
                  {TREATMENT_TEMPLATES[key].label.replace(/^[^â€”]+â€” /, "")}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tKey && (
        <>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <select
              value={tUnit}
              onChange={(e) => onUnit(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-(--brand) focus:outline-none bg-white"
            >
              {JOB_FORM_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <input
              type="number"
              min="0"
              step="any"
              value={tQty}
              onChange={(e) => onQty(e.target.value)}
              placeholder="Qty"
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-(--brand) focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="any"
              value={tPrice}
              onChange={(e) => onPrice(e.target.value)}
              placeholder="Price ₹"
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-(--brand) focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-(--brand-soft) border border-emerald-200">
            <div>
              <p className="text-xs font-bold text-slate-700">{tmpl?.label}</p>
              <p className="text-[10px] text-slate-500">{tQty} {tUnit} Ã— â‚¹{tPrice || 0}</p>
            </div>
            <p className="font-black text-(--brand) text-sm">₹{blockTotal % 1 === 0 ? blockTotal.toLocaleString("en-IN") : blockTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * @param {{
 *   job: Record<string, any>,
 *   subJobs: Array<Record<string, any>>,
 *   attendanceByJob?: Record<string, Record<string, any>>,
 *   isEmployee: boolean,
 *   onMarkSubDone: (subJob: Record<string, any>) => void,
 *   onRaiseRework: (job: Record<string, any>) => void,
 *   busy: boolean,
 *   onJobUpdated?: () => void,
 *   onGenerateInvoice: (job: Record<string, any>) => void,
 *   onOpenReport?: (job: Record<string, any>) => void,
 *   onOpenVideoReport?: (job: Record<string, any>) => void,
 *   onOpenAdminReports?: (job: Record<string, any>) => void,
 *   onOpenCheckIn?: (job: Record<string, any>) => void,
 *   onSetLocation?: (job: Record<string, any>) => void,
 *   onOpenAttendance?: (job: Record<string, any>) => void,
 * }} props
 */
function JobCard({ job, subJobs, attendanceByJob = {}, isEmployee, onMarkSubDone, onRaiseRework, busy, onJobUpdated, onGenerateInvoice, onOpenReport, onOpenVideoReport, onOpenAdminReports, onOpenCheckIn, onSetLocation, onOpenAttendance, latestReportStatus = null }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const attendanceRecord = attendanceByJob[job.id];
  const checkedIn = Boolean(attendanceRecord);
  const checkInTime = attendanceRecord?.timestamp || null;

  // Modal state lifted to parent — use callbacks instead
  const setShowReport = () => (isEmployee ? onOpenReport?.(job) : onOpenAdminReports?.(job));
  const setShowVideoReport = () => (isEmployee ? onOpenReport?.(job) : onOpenAdminReports?.(job));
  const setShowAdminReports = () => onOpenAdminReports?.(job);
  const setShowSetLocation = () => onSetLocation?.(job);
  const jobSubJobs = subJobs.filter((s) => s.jobId === job.id).sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const completedCount = jobSubJobs.filter((s) => s.status === "done").length;
  const jobAddress = job.address || job.customerAddress || "";
  const isRework = job.jobType === "Rework";
  const wStatus = warrantyStatus(job);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${isRework ? "border-violet-200" : "border-slate-200"}`}>
      <div className="p-5">
        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isRework && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
              <RefreshCw className="w-2.5 h-2.5" /> Rework Job
            </span>
          )}
          {wStatus === "active" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              🛡 Under Warranty
            </span>
          )}
          {wStatus === "expired" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              Warranty Expired
            </span>
          )}
          {job.parentJobId && !isEmployee && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
              <Link2 className="w-2.5 h-2.5" /> Linked Job
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{job.customerName}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{job.serviceType || job.serviceName}</p>
            {wStatus === "active" && job.warranty && (
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🛡 {job.warranty}
              </span>
            )}
            {!isEmployee && job.customerPhone && (
              <p className="text-xs text-slate-400 mt-0.5">{job.customerPhone}</p>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${STATUS_COLORS[job.status] || STATUS_COLORS.pending}`}>
            {job.status === "completed" ? "કમ્પ્લીટ" : job.status === "in_progress" ? "ઇન પ્રોગ્રેસ" : "પેન્ડિંગ"}
          </span>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500">
          {jobAddress && (
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{jobAddress}</span>
            </div>
          )}
          {job.scheduledDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatDateDisplay(job.scheduledDate)}</span>
            </div>
          )}
          {!isEmployee && (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>{Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : job.assignedTo}</span>
            </div>
          )}
          {/* Pricing — Admin only */}
          {!isEmployee && (job.finalPrice || job.totalAmount) && (
            <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
              {job.basePrice > 0 && <p className="text-slate-400">Base: {formatCurrency(job.basePrice)}</p>}
              {Number(job.adjustedPrice) !== 0 && (
                <p className="text-amber-600 font-semibold">
                  Adj: {Number(job.adjustedPrice) > 0 ? "+" : ""}{formatCurrency(job.adjustedPrice)}
                  {job.adjustmentReason ? ` · ${job.adjustmentReason}` : ""}
                </p>
              )}
              <p className="font-bold text-slate-800">Final: {formatCurrency(job.finalPrice || job.totalAmount)}</p>
            </div>
          )}
        </div>

        {jobAddress && (
          <MapLink address={jobAddress} className="mt-3"
            label={isEmployee ? "Open in Maps" : "View on Maps"} showDirections={isEmployee} />
        )}

        {jobSubJobs.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-500">સબ-ટાસ્ક ({completedCount}/{jobSubJobs.length})</span>
              <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-(--brand) h-1.5 rounded-full transition-all"
                style={{ width: `${jobSubJobs.length ? (completedCount / jobSubJobs.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Admin actions */}
        {!isEmployee && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.status === "completed" && wStatus === "active" && (
              <button onClick={() => onRaiseRework(job)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#A78BFA" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(139,92,246,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <RefreshCw className="w-3 h-3" /> Complaint
              </button>
            )}
            {job.status === "completed" && !job.reportImage && !job.reportAudio && !job.reportNote && (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34D399" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(16,185,129,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <FileText className="w-3 h-3" /> Reports
              </button>
            )}
            {(job.reportImage || job.reportAudio || job.reportNote) && (
              <button onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60A5FA" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(59,130,246,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <FileText className="w-3 h-3" /> Reports
              </button>
            )}
            {job.status === "completed" && !job.invoiceId && (
              <button onClick={() => onGenerateInvoice(job)} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(245,158,11,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <Receipt className="w-3 h-3" /> Generate Invoice
              </button>
            )}
            {job.invoiceId && (
              <Link to={`/admin/invoices/${job.invoiceId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#34D399" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(16,185,129,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <Receipt className="w-3 h-3" /> View Invoice
              </Link>
            )}
            {job.status === "completed" && (
              <Link to={`/admin/certificate/${job.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#FCD34D" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(245,158,11,0.3)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <FileText className="w-3 h-3" /> Certificate
              </Link>
            )}
            {job.history?.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                <History className="w-3 h-3" /> History ({job.history.length})
              </button>
            )}
            {(job.status === "completed" || job.status === "in_progress") && (
              <button onClick={() => setShowAdminReports(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.3)", color: "#6DBF4A" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(76,122,45,0.4)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <BarChart2 className="w-3 h-3" /> Reports
              </button>
            )}
            <button onClick={() => setShowSetLocation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={job.jobLat && job.jobLng
                ? { background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#60A5FA" }
                : { background: "rgba(228,87,46,0.1)", border: "1px solid rgba(228,87,46,0.25)", color: "#E4572E" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(59,130,246,0.3)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <MapPin className="w-3 h-3" />
              {job.jobLat && job.jobLng ? "Location Set ✓" : "Set Location"}
            </button>
            <button onClick={() => onOpenAttendance?.(job)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{ background: "rgba(228,87,46,0.1)", border: "1px solid rgba(228,87,46,0.25)", color: "#E4572E" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(228,87,46,0.3)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <Users className="w-3 h-3" /> Attendance
            </button>
            {/* Delete Job — admin only */}
            <button
              onClick={async () => {
                if (!window.confirm(`Delete job for ${job.customerName}? This cannot be undone.`)) return;
                try {
                  await deleteRecord("jobs", job.id);
                } catch (e) {
                  alert("Failed to delete job: " + e.message);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ml-auto"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(239,68,68,0.3)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
            {/* Employee: actions gated behind check-in */}
        {isEmployee && (
          <div className="flex gap-2 mt-3 flex-wrap">

            {/* Report Rejected alert — shown to employee */}
            {isEmployee && latestReportStatus?.status?.toLowerCase() === "rejected" && (
              <div className="w-full mt-1 mb-1 px-3 py-2.5 rounded-xl border border-red-400/40"
                style={{ background: "rgba(239,68,68,0.1)" }}>
                <p className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: "#F87171" }}>
                  ⚠ Report Rejected — Resubmit Required
                </p>
                {latestReportStatus.reason && (
                  <p className="text-[10px] italic" style={{ color: "#FCA5A5" }}>
                    Admin: "{latestReportStatus.reason}"
                  </p>
                )}
              </div>
            )}

            {/* Check In button — pending or in_progress without check-in */}
            {!checkedIn && (job.status === "pending" || job.status === "in_progress") && (
              <button onClick={() => onOpenCheckIn?.(job)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: "rgba(76,122,45,0.15)", border: "1px solid rgba(76,122,45,0.35)", color: "#6DBF4A" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 14px rgba(76,122,45,0.45)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                <MapPin className="w-3 h-3" /> Check In
              </button>
            )}

            {/* Report + Video — shown when checked in OR in_progress OR completed */}
            {(checkedIn || job.status === "in_progress" || job.status === "completed") && (
              <>
                {checkedIn && job.status !== "completed" && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                    style={{ background: "rgba(76,122,45,0.12)", border: "1px solid rgba(76,122,45,0.3)", color: "#6DBF4A" }}>
                    <CheckCircle2 className="w-3 h-3" />
                    Checked In
                    {checkInTime && (
                      <span className="ml-1 font-normal" style={{ opacity: 0.6 }}>
                        {new Date(checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </span>
                )}
                <button onClick={() => onOpenReport?.(job)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                  <FileText className="w-3 h-3" /> Report
                </button>
                <button onClick={() => onOpenVideoReport?.(job)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "rgba(76,122,45,0.15)", border: "1px solid rgba(76,122,45,0.3)", color: "#6DBF4A" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 0 16px rgba(76,122,45,0.5)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                  <Video className="w-3 h-3" /> Add Video
                </button>
                {jobSubJobs.length > 0 && job.status !== "completed" && (
                  <span className="flex items-center px-2 py-1 rounded-xl text-[10px] font-semibold"
                    style={{
                      background: "rgba(76,122,45,0.08)",
                      color: completedCount === jobSubJobs.length ? "#6DBF4A" : "#E4572E",
                      border: completedCount === jobSubJobs.length ? "1px solid rgba(76,122,45,0.2)" : "1px solid rgba(228,87,46,0.2)"
                    }}>
                    {completedCount}/{jobSubJobs.length} tasks done
                  </span>
                )}
              </>
            )}

          </div>
        )}
      </div>

      {/* Sub-tasks */}
      {expanded && jobSubJobs.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 space-y-2 bg-slate-50">
          {jobSubJobs.map((sj) => (
            <div key={sj.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {sj.status === "done"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  : <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold text-slate-700">{sj.title}</p>
                  {sj.completedBy && <p className="text-xs text-slate-400">by {sj.completedBy}</p>}
                </div>
              </div>
              {sj.status !== "done" && (
                <button onClick={() => onMarkSubDone(sj)} disabled={busy}
                  className="px-3 py-1 rounded-lg bg-(--brand) text-white text-xs font-bold hover:bg-(--brand-dark) disabled:opacity-60">
                  થઈ ગ્યું ✓
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      {showHistory && job.history?.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job History</p>
          <div className="space-y-1.5">
            {job.history.map((h, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-(--brand) mt-1.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-700">{h.event}</span>
                  {h.at && <span className="text-slate-400 ml-1">· {formatDateDisplay(h.at.split("T")[0])}</span>}
                  {h.reason && <p className="text-slate-500 mt-0.5">{h.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {/* Video Report Modal */}
      {/* Admin Reports View */}
      {/* All modals are rendered at JobsPage level to avoid overflow clipping */}
    </div>
  );
}

function CreateJobModal({ customers, onClose, onSave, saving, reworkSource }) {
  const [selectedCustomer, setSelectedCustomer] = useState(
    reworkSource ? { id: reworkSource.customerId, name: reworkSource.customerName, phone: reworkSource.customerPhone || "", address: reworkSource.address || reworkSource.customerAddress || "" } : null
  );
  const [form, setForm] = useState({ scheduledDate: getTodayISO(), status: "pending", notes: "" });

  const [treatmentKey, setTreatmentKey] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("unit");


  // Extra jobs — each has its own treatmentKey, price, quantity, unit
  const [extraJobs, setExtraJobs] = useState([]);

  const addExtraJob = () => setExtraJobs(p => [...p, { treatmentKey: "", price: "", quantity: "1", unit: "unit" }]);
  const updateExtra = (i, key, val) => setExtraJobs(p => p.map((j, idx) => idx === i ? { ...j, [key]: val } : j));
  const removeExtra = (i) => setExtraJobs(p => p.filter((_, idx) => idx !== i));

  const selectedTemplate = treatmentKey ? TREATMENT_TEMPLATES[treatmentKey] : null;
  const previewJobs = treatmentKey ? getJobsByTreatment(treatmentKey) : [];
  const total = (parseFloat(price) || 0) * (parseFloat(quantity) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedCustomer) { alert("Please select a customer."); return; }
    if (!treatmentKey) { alert("Please select a treatment for Job 1."); return; }
    if (!price || parseFloat(price) <= 0) { alert("Please enter a price for Job 1."); return; }
    // Validate extra jobs
    for (let i = 0; i < extraJobs.length; i++) {
      if (!extraJobs[i].treatmentKey) { alert(`Please select a treatment for Job ${i + 2}.`); return; }
      if (!extraJobs[i].price || parseFloat(extraJobs[i].price) <= 0) { alert(`Please enter a price for Job ${i + 2}.`); return; }
    }

    onSave({
      customerId: selectedCustomer.id || "",
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone || "",
      address: selectedCustomer.address || "",
      ...form,
      serviceId: treatmentKey,
      serviceName: selectedTemplate?.label || treatmentKey,
      serviceType: selectedTemplate?.label || treatmentKey,
      category: selectedTemplate?.category || "",
      unit,
      quantity: parseFloat(quantity) || 1,
      basePrice: parseFloat(price) || 0,
      adjustedPrice: parseFloat(price) || 0,
      finalPrice: total,
      totalAmount: total,
      warranty: "",
      warrantyType: "none",
      warrantyDays: 0,
      treatmentKey,
      treatmentLabel: selectedTemplate?.label || "",
      createdAt: new Date().toISOString(),
      _extraJobs: extraJobs.filter(j => j.treatmentKey && parseFloat(j.price) > 0),
    });
  };
  const grandTotal = total + extraJobs.reduce((s, j) => s + (parseFloat(j.price) || 0) * (parseFloat(j.quantity) || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full sm:max-w-lg mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-slate-900">
            {reworkSource
              ? <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 text-violet-600" />New Rework Job</span>
              : <span className="flex items-center gap-2"><Plus className="w-4 h-4 text-(--brand)" />Create Jobs {extraJobs.length > 0 && <span className="px-2 py-0.5 rounded-full bg-(--brand) text-white text-[10px] font-black">{1 + extraJobs.length}</span>}</span>
            }
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {reworkSource && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
              <Link2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Rework of: <strong>{reworkSource.customerName}</strong> — {reworkSource.serviceType || reworkSource.serviceName}</span>
            </div>
          )}

          {/* Customer */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Customer *</label>
            <CustomerSearch customers={customers} value={selectedCustomer} onChange={setSelectedCustomer} />
          </div>

          {/* Job 1 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Job 1 — Treatment & Pricing *
            </label>
            <TreatmentBlock
              label="Job 1"
              tKey={treatmentKey}
              tPrice={price}
              tQty={quantity}
              tUnit={unit}
              onTKey={setTreatmentKey}
              onPrice={setPrice}
              onQty={setQuantity}
              onUnit={setUnit}
            />
            {previewJobs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {previewJobs.map((j, i) => (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${i < 2 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {i + 1}. {j}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Extra jobs */}
          {extraJobs.map((ej, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Job {i + 2} — Treatment & Pricing *
                </label>
                <button type="button" onClick={() => removeExtra(i)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-rose-500 hover:bg-rose-50 transition-colors">
                  <X className="w-3 h-3" /> Remove
                </button>
              </div>
                            <TreatmentBlock
                label={`Job ${i + 2}`}
                tKey={ej.treatmentKey}
                tPrice={ej.price}
                tQty={ej.quantity}
                tUnit={ej.unit}
                onTKey={(v) => updateExtra(i, "treatmentKey", v)}
                onPrice={(v) => updateExtra(i, "price", v)}
                onQty={(v) => updateExtra(i, "quantity", v)}
                onUnit={(v) => updateExtra(i, "unit", v)}
              />
            </div>
          ))}

          {/* Add another job button */}
          {!reworkSource && (
            <button type="button" onClick={addExtraJob}
              className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{ borderColor: "rgba(76,122,45,0.3)", color: "#4C7A2D" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#4C7A2D"; e.currentTarget.style.background = "rgba(76,122,45,0.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(76,122,45,0.3)"; e.currentTarget.style.background = "transparent"; }}>
              <Plus className="w-4 h-4" /> Add Another Job
            </button>
          )}

          {/* Grand total */}
          {extraJobs.length > 0 && grandTotal > 0 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: "rgba(76,122,45,0.08)", border: "1px solid rgba(76,122,45,0.2)" }}>
              <p className="text-sm font-bold text-slate-700">{1 + extraJobs.length} Jobs · Grand Total</p>
              <p className="font-black text-(--brand) text-lg">₹{grandTotal.toLocaleString("en-IN")}</p>
            </div>
          )}

          {/* Scheduled Date */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Scheduled Date</label>
            <input type="date" value={form.scheduledDate}
              onChange={(e) => setForm((p) => ({ ...p, scheduledDate: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes..." rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm resize-none" />
          </div>

          <div className="bg-(--brand-soft) rounded-xl p-3">
            <p className="text-xs font-bold text-(--brand-dark) mb-1">Assigned to all EMPLOYEEs</p>
            <p className="text-sm text-(--brand)">{EmployeeS.join(", ")}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark) disabled:opacity-60">
              {saving ? "Creating..." : `Create ${1 + extraJobs.length} Job${extraJobs.length > 0 ? "s" : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Customer Jobs Panel — shows all jobs for a selected customer */
function CustomerJobsPanel({ customer, jobs, subJobs, attendanceByJob, isEmployee, onMarkSubDone, onRaiseRework, onGenerateInvoice, busy, onBack, onOpenReport, onOpenVideoReport, onOpenAdminReports, onSetLocation, onOpenAttendance }) {
  const customerJobs = useMemo(() =>
    jobs.filter((j) => j.customerId === customer.id || j.customerName === customer.name)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [jobs, customer]
  );

  const counts = {
    all: customerJobs.length,
    pending: customerJobs.filter(j => j.status === "pending" || !j.status).length,
    in_progress: customerJobs.filter(j => j.status === "in_progress").length,
    completed: customerJobs.filter(j => j.status === "completed").length,
    rework: customerJobs.filter(j => j.jobType === "Rework").length,
  };

  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? customerJobs : customerJobs.filter(j => {
    if (filter === "rework") return j.jobType === "Rework";
    return j.status === filter;
  });

  return (
    <div className="space-y-4">
      {/* Back + Customer header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-(--brand-soft) flex items-center justify-center text-(--brand) text-sm font-black shrink-0">
            {customer.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-black text-slate-900 truncate">{customer.name}</p>
            <p className="text-xs text-slate-400">{customer.phone} · {customer.propertyType}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-slate-900">{counts.all}</p>
          <p className="text-xs text-slate-400">total jobs</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { key: "pending",    label: "Pending",    color: "bg-amber-50 text-amber-700 border-amber-100" },
          { key: "in_progress",label: "Active",     color: "bg-blue-50 text-blue-700 border-blue-100" },
          { key: "completed",  label: "Completed",  color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          { key: "rework",     label: "Rework",     color: "bg-violet-50 text-violet-700 border-violet-100" },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(filter === s.key ? "all" : s.key)}
            className={`rounded-xl border p-2.5 text-center transition-all ${s.color} ${filter === s.key ? "ring-2 ring-offset-1 ring-current" : "opacity-80 hover:opacity-100"}`}>
            <p className="text-lg font-black leading-none">{counts[s.key]}</p>
            <p className="text-[10px] font-bold mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No jobs in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} subJobs={subJobs} attendanceByJob={attendanceByJob} isEmployee={isEmployee}
              onMarkSubDone={onMarkSubDone} onRaiseRework={onRaiseRework}
              onGenerateInvoice={onGenerateInvoice} busy={busy} onJobUpdated={() => {}}
              onOpenReport={onOpenReport} onOpenVideoReport={onOpenVideoReport} onOpenAdminReports={onOpenAdminReports} onSetLocation={onSetLocation} onOpenAttendance={onOpenAttendance}
              latestReportStatus={null} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  const { profile, isEmployee, loading: authLoading } = useAuth();
  const EmployeeName = profile?.EmployeeTag || profile?.name || "";
  const location = useLocation();

  const [jobs, setJobs] = useState([]);
  const [subJobs, setSubJobs] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [reworkSource, setReworkSource] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [viewMode, setViewMode] = useState("jobs"); // "jobs" | "customers"
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Top-level modal state — renders above everything, no overflow clipping
  const [reportJob, setReportJob] = useState(null);
  const [videoReportJob, setVideoReportJob] = useState(null);
  const [adminReportsJob, setAdminReportsJob] = useState(null);
  const [checkInJob, setCheckInJob] = useState(null);       // employee attendance check-in
  const [attendanceJob, setAttendanceJob] = useState(null); // admin attendance view
  const [setLocationJob, setSetLocationJob] = useState(null); // admin set job location
  const [paymentModeJob, setPaymentModeJob] = useState(null); // job waiting for payment mode
  const [warrantySettings, setWarrantySettings] = useState([]);
  const [visitReports, setVisitReports] = useState([]);

  // Map jobId → latest report status (for rejection alert on job card)
  const jobReportStatusMap = useMemo(() => {
    const map = {};
    visitReports.forEach(r => {
      const existing = map[r.jobId];
      const thisNum = r.reportNumber || 0;
      if (!existing || thisNum > (existing.reportNumber || 0)) {
        map[r.jobId] = { status: r.reportStatus || "", reason: r.adminRemarks || "", reportNumber: thisNum };
      }
    });
    return map;
  }, [visitReports]);

  // Auto-open rework modal when navigated from ComplaintsPage
  useEffect(() => {
    if (location.state?.reworkJobId && jobs.length > 0) {
      const sourceJob = jobs.find((j) => j.id === location.state.reworkJobId);
      if (sourceJob) {
        setReworkSource(sourceJob);
        setShowModal(true);
        // Clear state so it doesn't re-trigger
        window.history.replaceState({}, "");
      }
    }
  }, [location.state, jobs]);

  useEffect(() => {
    // Don't subscribe until auth has finished loading — prevents rapid
    // listener churn (empty → real EmployeeName) that causes the Firestore SDK
    // "INTERNAL ASSERTION FAILED: Unexpected state" error on the watch stream.
    if (authLoading) return;

    const jobsQ = isEmployee && EmployeeName
      ? query(collection(firestoreDb, "jobs"), where("assignedTo", "array-contains", EmployeeName))
      : query(collection(firestoreDb, "jobs"), orderBy("createdAt", "desc"));

    const subJobsQ = query(collection(firestoreDb, "subJobs"), orderBy("createdAt", "desc"));

    const unsubs = [
      subscribeQuery(jobsQ, setJobs),
      subscribeQuery(subJobsQ, setSubJobs),
      subscribeCollection("customers", setCustomers),
      subscribeCollection("services", setServices),   
      subscribeCollection("warrantySettings", setWarrantySettings),
      subscribeCollection("serviceVisitReports", setVisitReports),
    ];

    if (isEmployee && EmployeeName) {
      unsubs.push(
        subscribeQuery(
          query(collection(firestoreDb, "attendance"), where("employeeName", "==", EmployeeName)),
          setAttendanceRecords,
        ),
      );
    } else {
      setAttendanceRecords([]);
    }

    return () => unsubs.forEach((u) => u());
  }, [isEmployee, EmployeeName, authLoading]);

  const attendanceByJob = useMemo(() => {
    return attendanceRecords.reduce((acc, record) => {
      if (!record.jobId || acc[record.jobId]) return acc;
      acc[record.jobId] = record;
      return acc;
    }, {});
  }, [attendanceRecords]);

  const filtered = useMemo(() => {
    let list = isEmployee
      ? [...jobs].sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      : jobs;
    if (statusFilter !== "all") list = list.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j) =>
        j.customerName?.toLowerCase().includes(q) ||
        j.serviceType?.toLowerCase().includes(q) ||
        j.id?.toLowerCase().includes(q) ||
        (!isEmployee && j.customerPhone?.includes(q))
      );
    }
    return list;
  }, [jobs, statusFilter, search, isEmployee]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 3000);
  };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const basePayload = {
        ...form,
        assignedTo: EmployeeS,
        jobType: reworkSource ? "Rework" : "Original",
        parentJobId: reworkSource ? reworkSource.id : null,
        history: [{ event: reworkSource ? "Rework job created" : "Job created", at: new Date().toISOString() }],
      };
      // Remove internal _extraJobs key before saving
      const { _extraJobs, ...primaryPayload } = basePayload;

      const jobId = await createRecord("jobs", primaryPayload);
      const subJobsToCreate = buildSubJobs(jobId, form.treatmentKey || "");
      await Promise.all(subJobsToCreate.map((sj) => createRecord("subJobs", sj)));

      // Create extra jobs for the same customer
      if (_extraJobs?.length > 0) {
        for (const extra of _extraJobs) {
          const extraTemplate = TREATMENT_TEMPLATES[extra.treatmentKey];
          const extraTotal = (parseFloat(extra.price) || 0) * (parseFloat(extra.quantity) || 1);
          const extraPayload = {
            customerId: primaryPayload.customerId,
            customerName: primaryPayload.customerName,
            customerPhone: primaryPayload.customerPhone,
            address: primaryPayload.address,
            scheduledDate: primaryPayload.scheduledDate,
            notes: primaryPayload.notes,
            status: "pending",
            assignedTo: EmployeeS,
            jobType: "Original",
            parentJobId: null,
            serviceId: extra.treatmentKey,
            serviceName: extraTemplate?.label || extra.treatmentKey,
            serviceType: extraTemplate?.label || extra.treatmentKey,
            category: extraTemplate?.category || "",
            unit: extra.unit,
            quantity: parseFloat(extra.quantity) || 1,
            basePrice: parseFloat(extra.price) || 0,
            adjustedPrice: parseFloat(extra.price) || 0,
            finalPrice: extraTotal,
            totalAmount: extraTotal,
            warranty: "",
            warrantyType: "none",
            warrantyDays: 0,
            treatmentKey: extra.treatmentKey,
            treatmentLabel: extraTemplate?.label || "",
            createdAt: new Date().toISOString(),
            history: [{ event: "Job created", at: new Date().toISOString() }],
          };
          const extraJobId = await createRecord("jobs", extraPayload);
          const extraSubJobs = buildSubJobs(extraJobId, extra.treatmentKey);
          await Promise.all(extraSubJobs.map((sj) => createRecord("subJobs", sj)));
        }
      }

      setShowModal(false);
      setReworkSource(null);
      const total = 1 + (_extraJobs?.length || 0);
      showMsg("success", reworkSource
        ? "Rework job created and linked to original."
        : `${total} job${total > 1 ? "s" : ""} created and assigned to all Employees.`
      );
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRaiseRework = (job) => {
    setReworkSource(job);
    setShowModal(true);
  };

  const handleGenerateInvoice = (job) => {
    // Open payment mode picker first
    setPaymentModeJob(job);
  };

  const handleGenerateInvoiceWithMode = async (paymentMode, warrantyValue = "") => {
    const job = paymentModeJob;
    setPaymentModeJob(null);
    if (!job) return;
    setBusy(true);
    showMsg("success", "Creating invoice…");
    try {
      const invoiceNumber = await nextDocumentNumber("INV");
      const total = Number(job.finalPrice || job.totalAmount || 0);

      // Auto-match warranty from admin-configured warrantySettings
      const jobLabel = (job.treatmentLabel || job.serviceType || job.serviceName || "").toLowerCase();
      const matchedWarranty = job.warranty || (() => {
        const exact = warrantySettings.find(w => jobLabel === w.serviceName.toLowerCase());
        if (exact) return exact.warrantyPeriod;
        const partial = warrantySettings.find(w =>
          jobLabel.includes(w.serviceName.toLowerCase()) ||
          w.serviceName.toLowerCase().includes(jobLabel) ||
          jobLabel.includes((w.serviceName.split(" — ")[1] || "").toLowerCase()) ||
          (w.serviceName.split(" — ")[1] || "").toLowerCase().includes(jobLabel)
        );
        return partial?.warrantyPeriod || "";
      })();
      const finalWarranty = (warrantyValue || "").trim() || matchedWarranty || "";

      const items = [{
        itemName: job.treatmentLabel || job.serviceType || job.serviceName || "Service",
        quantity: Number(job.quantity) || 1,
        price: Number(job.basePrice) || total,
        discount: 0,
        warranty: finalWarranty,
        finalAmount: total,
      }];

      const invoiceId = await createRecord("invoices", {
        invoiceNumber,
        jobId: job.id,
        date: new Date().toISOString().split("T")[0],
        customerId: job.customerId || "",
        customerName: job.customerName || "",
        customerPhone: job.customerPhone || "",
        customerAddress: job.address || job.customerAddress || "",
        items,
        subtotal: total,
        discountTotal: 0,
        total,
        received: 0,
        balance: total,
        paymentMode,
        warranty: finalWarranty,
        terms: "Terms: 1) Payment due on completion. 2) Taxes extra if applicable.",
        status: "Pending",
        fromJob: true,
      });

      await updateRecord("jobs", job.id, {
        invoiceId,
        warranty: finalWarranty,
        warrantyStartDate: job.completedAt || job.warrantyStartDate || new Date().toISOString(),
      });
      showMsg("success", `Invoice ${invoiceNumber} created · ${paymentMode}.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleMarkSubDone = async (sj) => {
    setBusy(true);
    try {
      await updateRecord("subJobs", sj.id, {
        status: "done", completedBy: EmployeeName, completedAt: new Date().toISOString(),
      });
      const relatedSubJobs = subJobs
        .filter((item) => item.jobId === sj.jobId)
        .map((item) => (item.id === sj.id ? { ...item, status: "done" } : item));
      const allDone = relatedSubJobs.length > 0 && relatedSubJobs.every((item) => item.status === "done");
      await updateRecord("jobs", sj.jobId, {
        status: allDone ? "completed" : "in_progress",
        completedAt: allDone ? new Date().toISOString() : null,
        completedBy: allDone ? EmployeeName : "",
      });
      showMsg("success", `"${sj.title}" marked done.`);
    } catch (e) {
      showMsg("error", e.message);
    } finally {

      setBusy(false);
    }
  };

  const handleCloudUpload = async () => {
    setBusy(true);
    showMsg("success", "Generating Excel file...");
    try {
      if (!jobs || jobs.length === 0) {
        throw new Error("No jobs available to export.");
      }

      // Prepare data
      const exportData = jobs.map((job) => ({
        "Job ID": job.id,
        "Customer Name": job.customerName || "-",
        "Customer Phone": job.customerPhone || "-",
        "Service": job.serviceType || "-",
        "Unit / Qty": (job.quantity ? job.quantity + " " : "") + (job.unit || "-"),
        "Base Price": job.basePrice || 0,
        "Adjusted Price": job.adjustedPrice || 0,
        "Final Price / Total Amount": job.finalPrice || job.totalAmount || 0,
        "Warranty": job.warranty || "No Warranty",
        "Status": job.status || "pending",
        "Assigned To": Array.isArray(job.assignedTo) ? job.assignedTo.join(", ") : (job.assignedTo || "-"),
        "Scheduled Date": job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "-",
      }));

      // Generate worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Jobs");

      // Write to ArrayBuffer
      const excelBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      const fileName = `Jobs_Export_${new Date().getTime()}.xlsx`;
      const file = new File(
        [excelBuffer],
        fileName,
        { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
      );

      if (isDriveUploadConfigured()) {
        showMsg("success", "Uploading jobs Excel directly to Google Drive...");
        const result = await uploadFileToDrive({
          file,
          fileName,
          mimeType: file.type,
          target: "jobs",
          metadata: {
            module: "jobs",
            exportedAt: new Date().toISOString(),
            count: jobs.length,
          },
        });

        showMsg("success", "Jobs Excel uploaded to Google Drive.");
        if (result.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      saveAs(file, fileName);
      showMsg("success", "Drive is not configured yet, so the Excel file was downloaded locally.");
    } catch (e) {
      showMsg("error", e.message);
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => ({
    all: jobs.length,
    pending: jobs.filter((j) => j.status === "pending" || !j.status).length,
    in_progress: jobs.filter((j) => j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
  }), [jobs]);

  const jobChains = useMemo(() => {
    if (isEmployee) return null;
    const originals = filtered.filter((j) => !j.parentJobId);
    return originals.map((orig) => ({
      original: orig,
      reworks: jobs.filter((j) => j.parentJobId === orig.id),
    }));
  }, [filtered, jobs, isEmployee]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">{isEmployee ? "મારા જોબ્સ" : "Jobs"}</h1>
          <p className="text-slate-500 mt-0.5">{jobs.length} {isEmployee ? "ટોટલ જોબ્સ" : "total jobs"} · {jobs.filter(j => j.jobType === "Rework").length} rework</p>
        </div>
        {!isEmployee && (
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:ml-auto">
            {/* View toggle */}
            <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button onClick={() => setViewMode("customers")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${viewMode === "customers" ? "bg-(--brand) text-white" : "text-slate-500 hover:text-slate-700"}` }>
                <Users className="w-3.5 h-3.5" /> By Customer
              </button>
            </div>
            <button onClick={handleCloudUpload} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-60 w-full sm:w-auto min-h-[44px] active:scale-95">
              <UploadCloud className="w-4 h-4" /> Cloud Export
            </button>
            <button onClick={() => { setReworkSource(null); setShowModal(true); }} disabled={busy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark) transition-colors shadow-sm disabled:opacity-60 w-full sm:w-auto min-h-[44px] active:scale-95">
              <Plus className="w-4 h-4" /> Create Job
            </button>
          </div>
        )}
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
          }`}>{msg.text}</div>
      )}

      {/* ── CUSTOMER VIEW ── */}
      {!isEmployee && viewMode === "customers" && (
        selectedCustomer ? (
          <CustomerJobsPanel
            customer={selectedCustomer}
            jobs={jobs}
            subJobs={subJobs}
            attendanceByJob={attendanceByJob}
            isEmployee={false}
            onMarkSubDone={handleMarkSubDone}
            onRaiseRework={handleRaiseRework}
            onGenerateInvoice={handleGenerateInvoice}
            busy={busy}
            onBack={() => setSelectedCustomer(null)}
            onOpenReport={setReportJob}
            onOpenVideoReport={setVideoReportJob}
            onOpenAdminReports={setAdminReportsJob}
            onSetLocation={setSetLocationJob}
            onOpenAttendance={setAttendanceJob}
          />
        ) : (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm bg-white" />
            </div>
            {/* Customer list */}
            {customers
              .filter(c => !search.trim() || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
              .map(c => {
                const cJobs = jobs.filter(j => j.customerId === c.id || j.customerName === c.name);
                if (cJobs.length === 0) return null;
                return (
                  <button key={c.id} onClick={() => setSelectedCustomer(c)}
                    className="w-full bg-white rounded-2xl border border-slate-200 px-4 py-3.5 flex items-center gap-3 hover:border-(--brand) hover:shadow-sm transition-all text-left active:scale-[0.99]">
                    <div className="w-10 h-10 rounded-2xl bg-(--brand-soft) flex items-center justify-center text-(--brand) text-sm font-black shrink-0">
                      {c.name?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.phone}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400">{c.propertyType}</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{cJobs.length}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                  </button>
                );
              })
            }
          </div>
        )
      )}

      {/* ── JOBS VIEW ── */}
      {(isEmployee || viewMode === "jobs") && (<>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {[
          { key: "all", label: isEmployee ? "બધા" : "All" },
          { key: "pending", label: isEmployee ? "પેન્ડિંગ" : "Pending" },
          { key: "in_progress", label: isEmployee ? "ઇન પ્રોગ્રેસ" : "In Progress" },
          { key: "completed", label: isEmployee ? "કમ્પ્લીટ" : "Completed" },
        ].map((tab) => (
          <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${statusFilter === tab.key ? "bg-(--brand) text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{isEmployee ? "કોઈ જોબ મળ્યો નહીં" : "No jobs found"}</p>
          {!isEmployee && (
            <button onClick={() => { setReworkSource(null); setShowModal(true); }}
              className="mt-4 px-4 py-2 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark)">
              Create First Job
            </button>
          )}
        </div>
      ) : isEmployee ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} attendanceByJob={attendanceByJob} isEmployee={isEmployee}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} onOpenReport={setReportJob} onOpenVideoReport={setVideoReportJob} onOpenAdminReports={setAdminReportsJob} onOpenCheckIn={setCheckInJob}
              latestReportStatus={jobReportStatusMap[job.id] || null} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {jobChains.map(({ original, reworks }) => (
            <div key={original.id}>
              <JobCard job={original} subJobs={subJobs} attendanceByJob={attendanceByJob} isEmployee={false}
                onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} onOpenReport={setReportJob} onOpenVideoReport={setVideoReportJob} onOpenAdminReports={setAdminReportsJob} onSetLocation={setSetLocationJob} onOpenAttendance={setAttendanceJob}
                latestReportStatus={jobReportStatusMap[original.id] || null} />
              {reworks.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l-2 border-violet-200 pl-4">
                  <p className="text-xs font-bold text-violet-500 uppercase tracking-wider mb-2">Rework Jobs ({reworks.length})</p>
                  {reworks.map((rw) => (
                    <JobCard key={rw.id} job={rw} subJobs={subJobs} attendanceByJob={attendanceByJob} isEmployee={false}
                      onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} onOpenReport={setReportJob} onOpenVideoReport={setVideoReportJob} onOpenAdminReports={setAdminReportsJob} onSetLocation={setSetLocationJob} onOpenAttendance={setAttendanceJob}
                      latestReportStatus={jobReportStatusMap[rw.id] || null} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {filtered.filter(j => j.parentJobId && !jobChains.find(c => c.original.id === j.parentJobId)).map((job) => (
            <JobCard key={job.id} job={job} subJobs={subJobs} attendanceByJob={attendanceByJob} isEmployee={false}
              onMarkSubDone={handleMarkSubDone} onRaiseRework={handleRaiseRework} busy={busy} onJobUpdated={() => {}} onGenerateInvoice={handleGenerateInvoice} onOpenReport={setReportJob} onOpenVideoReport={setVideoReportJob} onOpenAdminReports={setAdminReportsJob} onSetLocation={setSetLocationJob} onOpenAttendance={setAttendanceJob}
              latestReportStatus={jobReportStatusMap[job.id] || null} />
          ))}
        </div>
      )}

      </>)}

      {showModal && (
        <CreateJobModal customers={customers} onClose={() => { setShowModal(false); setReworkSource(null); }}
          onSave={handleCreate} saving={saving} reworkSource={reworkSource} />
      )}

      {/* ── TOP-LEVEL MODALS — rendered outside job cards, no overflow clipping ── */}
      {reportJob && (
        <JobReportModal
          job={reportJob}
          onClose={() => setReportJob(null)}
          onSaved={() => { setReportJob(null); showMsg("success", "Service Visit Report submitted successfully."); }}
        />
      )}
      {videoReportJob && (
        <JobVideoReportModal job={videoReportJob} onClose={() => setVideoReportJob(null)} />
      )}
      {adminReportsJob && (
        <JobReportsAdminView job={adminReportsJob} onClose={() => setAdminReportsJob(null)} />
      )}
      {/* Attendance check-in — employee side */}
      {checkInJob && (
        <AttendanceCheckIn
          job={checkInJob}
          onClose={() => setCheckInJob(null)}
          onCheckedIn={() => { setCheckInJob(null); showMsg("success", "Attendance marked ✓"); }}
        />
      )}
      {/* Attendance admin view */}
      {attendanceJob && (
        <AttendanceAdminView job={attendanceJob} onClose={() => setAttendanceJob(null)} />
      )}
      {/* Set job location — admin */}
      {setLocationJob && (
        <SetJobLocation
          job={setLocationJob}
          onClose={() => setSetLocationJob(null)}
          onSaved={() => { setSetLocationJob(null); showMsg("success", "Job location saved ✓"); }}
        />
      )}
      {/* Payment mode picker — before generating invoice */}
      {paymentModeJob && (
        <PaymentModeModal
          title={`Invoice for ${paymentModeJob.customerName}`}
          defaultWarranty={paymentModeJob.warranty || ""}
          showWarrantyInput={(paymentModeJob.treatmentLabel || paymentModeJob.serviceType || paymentModeJob.serviceName || "").toLowerCase().includes("termite")}
          onClose={() => setPaymentModeJob(null)}
          onConfirm={handleGenerateInvoiceWithMode}
        />
      )}
    </div>
  );
}




