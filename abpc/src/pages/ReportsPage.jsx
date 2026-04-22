import { useEffect, useMemo, useState } from "react";
import { collection, orderBy, query, where } from "firebase/firestore";
import { firestoreDb } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { createRecord, subscribeQuery, updateRecord, subscribeCollection, deleteRecord } from "../utils/firestoreHelpers";
import { compressImage, validateFileSize, uid } from "../utils/mediaHelpers";
import { uploadToCloudinary } from "../utils/cloudinaryUpload";
import { useVoiceRecorder } from "../hooks/useVoiceRecorder";
import { FileText, Image, Mic, Filter, X, Plus, Camera, Trash2, Square, AlertCircle, Download, Printer, CheckCircle2, Eye, EyeOff, UploadCloud, RefreshCw, Link2 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { isDriveUploadConfigured, uploadFileToDrive } from "../utils/driveUpload";

const EmployeeS = ["Nakul", "Divyesh", "Sagar"];
const MAX_IMAGE_MB = 1;
const MAX_AUDIO_MB = 1;

export default function ReportsPage() {
  const { profile, isEmployee, isAdmin } = useAuth();
  const EmployeeName = profile?.EmployeeTag || profile?.name || "";

  const [jobs, setJobs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [reports, setReports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [filterJob, setFilterJob] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ jobId: "", notes: "", images: [], imageFiles: [] });
  const [deleteConfirm, setDeleteConfirm] = useState(null); // reportId to confirm delete

  const voiceRec = useVoiceRecorder();

  useEffect(() => {
    // Employee query: no orderBy to avoid composite index requirement — sorted client-side below
    const jobsQ = isEmployee
      ? query(collection(firestoreDb, "jobs"), where("assignedTo", "array-contains", EmployeeName))
      : query(collection(firestoreDb, "jobs"), orderBy("createdAt", "desc"));

    // Real-time reports subscription for instant admin visibility
    const reportsQ = query(collection(firestoreDb, "reports"), orderBy("timestamp", "desc"));

    const unsubs = [
      subscribeQuery(jobsQ, setJobs, (err) => showMsg("error", `Jobs load failed: ${err.code}`)),
      subscribeQuery(reportsQ, setReports, (err) => showMsg("error", `Reports load failed: ${err.code} — check Firestore rules`)),
      subscribeCollection("customers", setCustomers),
    ];
    return () => unsubs.forEach((u) => u());
  }, [isEmployee, EmployeeName]);

  const visible = useMemo(() => {
    return reports.filter((r) => {
      if (isEmployee && r.EmployeeName !== EmployeeName) return false;
      if (filterJob && r.jobId !== filterJob) return false;
      if (!isEmployee && filterEmployee && r.EmployeeName !== filterEmployee) return false;
      return true;
    });
  }, [reports, isEmployee, EmployeeName, filterJob, filterEmployee]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: "", text: "" }), 4000);
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Validate size
    for (const f of files) {
      const err = validateFileSize(f, MAX_IMAGE_MB);
      if (err) { showMsg("error", err); return; }
    }

    // Compress
    setUploadProgress("Compressing images...");
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f, MAX_IMAGE_MB)));
      setForm((p) => ({
        ...p,
        imageFiles: [...p.imageFiles, ...compressed],
        images: [...p.images, ...compressed.map((f) => URL.createObjectURL(f))],
      }));
      setUploadProgress("");
    } catch (err) {
      showMsg("error", "Image compression failed.");
      setUploadProgress("");
    }
  };

  const removeImage = (idx) => {
    URL.revokeObjectURL(form.images[idx]);
    setForm((p) => ({
      ...p,
      images: p.images.filter((_, i) => i !== idx),
      imageFiles: p.imageFiles.filter((_, i) => i !== idx),
    }));
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!form.jobId) { showMsg("error", "Select a job first."); return; }

    // Validate voice size
    if (voiceRec.blob) {
      const err = validateFileSize(new File([voiceRec.blob], "voice.webm"), MAX_AUDIO_MB);
      if (err) { showMsg("error", err); return; }
    }

    setBusy(true);
    setUploadProgress("Creating report...");
    
    try {
      // Step 1: Create report document first (without URLs)
      const reportId = await createRecord("reports", {
        jobId: form.jobId,
        EmployeeName,
        uploaderUid: profile?.uid || "",
        notes: form.notes,
        imageUrls: [],
        audioUrl: null,
        timestamp: new Date().toISOString(),
        checklist: null,
      });

      // Step 2: Upload images to Cloudinary and WAIT for completion
      const uploadedImages = [];
      for (let i = 0; i < form.imageFiles.length; i++) {
        setUploadProgress(`Uploading image ${i + 1}/${form.imageFiles.length}...`);
        const url = await uploadToCloudinary(form.imageFiles[i]);
        uploadedImages.push(url);
        await createRecord("mediaUploads", {
          jobId: form.jobId,
          reportId,
          uploaderUid: profile?.uid || "",
          type: "image",
          downloadUrl: url,
          createdAt: new Date().toISOString(),
        });
      }

      // Step 3: Upload voice to Cloudinary and WAIT for completion
      let voiceUrl = null;
      if (voiceRec.blob) {
        setUploadProgress("Uploading voice note...");
        voiceUrl = await uploadToCloudinary(voiceRec.blob);
        await createRecord("mediaUploads", {
          jobId: form.jobId,
          reportId,
          uploaderUid: profile?.uid || "",
          type: "audio",
          downloadUrl: voiceUrl,
          createdAt: new Date().toISOString(),
        });
      }

      // Step 4: ONLY AFTER all uploads complete, update report with URLs
      await updateRecord("reports", reportId, { 
        imageUrls: uploadedImages, 
        audioUrl: voiceUrl 
      });

      // Cleanup
      form.images.forEach((url) => URL.revokeObjectURL(url));
      setForm({ jobId: "", notes: "", images: [], imageFiles: [] });
      voiceRec.reset();
      setShowForm(false);
      setUploadProgress("");
      showMsg("success", "Report submitted successfully!");
    } catch (err) {
      console.error("Upload error:", err);
      showMsg("error", err.message || "Upload failed. Please try again.");
      setUploadProgress("");
    } finally {
      setBusy(false);
    }
  };

  const getJobLabel = (jobId) => {
    const j = jobs.find((j) => j.id === jobId);
    return j ? `${j.customerName} — ${j.serviceType}` : jobId;
  };

  const getCustomerData = (jobId) => {
    const j = jobs.find((j) => j.id === jobId);
    if (!j) return null;
    const c = customers.find((c) => c.id === j.customerId);
    return { job: j, customer: c };
  };

  // Returns rework info for a report's job
  const getReworkInfo = (jobId) => {
    const j = jobs.find((jb) => jb.id === jobId);
    if (!j) return null;
    if (j.jobType === "Rework" && j.parentJobId) {
      return { isRework: true, parentJobId: j.parentJobId };
    }
    const reworks = jobs.filter((rj) => rj.parentJobId === jobId && rj.jobType === "Rework");
    return reworks.length > 0 ? { hasReworks: true, reworks } : null;
  };

  const handleDeleteReport = async (reportId) => {
    try {
      await deleteRecord("reports", reportId);
      setDeleteConfirm(null);
      showMsg("success", "Report deleted.");
    } catch (err) {
      console.error("Delete error:", err);
      showMsg("error", "Failed to delete report.");
      setDeleteConfirm(null);
    }
  };

  // Excel export
  const exportToExcel = async () => {
    const data = visible.map((r) => {
      const { job, customer } = getCustomerData(r.jobId) || {};
      return {
        "Customer Name": job?.customerName || "N/A",
        "Phone Number": customer?.phone || "N/A",
        "Address": customer?.address || job?.address || "N/A",
        "Service Type": job?.serviceType || "N/A",
        "Employee Name": r.EmployeeName || "N/A",
        "Date": r.timestamp ? new Date(r.timestamp).toLocaleDateString("en-IN") : "N/A",
        "Time": r.timestamp ? new Date(r.timestamp).toLocaleTimeString("en-IN") : "N/A",
        "Notes": r.notes || "N/A",
        "Inspection Done": r.checklist?.inspectionDone ? "Yes" : "No",
        "Chemical Applied": r.checklist?.chemicalApplied ? "Yes" : "No",
        "Area Covered": r.checklist?.areaCovered ? "Yes" : "No",
        "Customer Satisfied": r.checklist?.customerSatisfied ? "Yes" : "No",
        "Images": (r.imageUrls || []).length,
        "Voice Note": r.audioUrl ? "Yes" : "No",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const fileName = `CRM_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    const file = new File(
      [excelBuffer],
      fileName,
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
    );

    try {
      if (isDriveUploadConfigured()) {
        showMsg("success", "Uploading reports Excel directly to Google Drive...");
        const result = await uploadFileToDrive({
          file,
          fileName,
          mimeType: file.type,
          target: "reports",
          metadata: {
            module: "reports",
            exportedAt: new Date().toISOString(),
            count: visible.length,
          },
        });

        showMsg("success", "Reports Excel uploaded to Google Drive.");
        if (result.url) {
          window.open(result.url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      saveAs(file, fileName);
      showMsg("success", "Drive is not configured yet, so the Excel file was downloaded locally.");
    } catch (err) {
      showMsg("error", err.message || "Failed to export reports.");
    }
  };

  // Print view
  const printReports = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { showMsg("error", "Popup blocked. Allow popups to print."); return; }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>AB Pest Control - Reports</title>
  <style>
    @page { size: A4; margin: 0; }
    @media print {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        color: black !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
      .print-page {
        width: 210mm;
        height: 297mm;
        padding: 20mm;
        box-sizing: border-box;
        overflow: hidden;
      }
      ::-webkit-scrollbar { display: none !important; }
    }
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #1f7a42; font-size: 18px; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
    th { background-color: #f3f8f4; font-weight: bold; }
    .no-print { margin-top: 20px; }
  </style>
</head>
<body>
  <div class="print-page">
    <h1>AB Pest Control - Job Reports</h1>
    <p>Generated on: ${new Date().toLocaleString("en-IN")}</p>
    <table>
      <thead>
        <tr>
          <th>Customer</th>
          <th>Service</th>
          <th>Employee</th>
          <th>Date/Time</th>
          <th>Notes</th>
          <th>Payment Status</th>
        </tr>
      </thead>
      <tbody>
        ${visible.map((r) => {
          const { job } = getCustomerData(r.jobId) || {};
          const allDone = r.checklist && Object.values(r.checklist).every(Boolean);
          return `
            <tr>
              <td>${job?.customerName || "N/A"}</td>
              <td>${job?.serviceType || "N/A"}</td>
              <td>${r.EmployeeName || "N/A"}</td>
              <td>${r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN") : "N/A"}</td>
              <td>${r.notes || "—"}</td>
              <td>${allDone ? "✓ Complete" : "Pending"}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
    <div class="no-print">
      <button onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; background: #1f7a42; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
      <button onclick="window.close()" style="margin-left: 10px; padding: 10px 20px; background: #64748b; color: white; border: none; border-radius: 5px; cursor: pointer;">Close</button>
    </div>
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">{isEmployee ? "રિપોર્ટ્સ" : "Reports"}</h1>
          <p className="text-slate-500 mt-0.5">{visible.length} {isEmployee ? "રિપોર્ટ્સ" : "reports"}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Cloud Export
              </button>
              <button
                onClick={printReports}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </>
          )}
          {isEmployee && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark) transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              નવો રિપોર્ટ સબમિટ કરો
            </button>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
          msg.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
        }`}>
          {msg.text}
        </div>
      )}

      {/* Admin filters */}
      {!isEmployee && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Filters</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm"
            >
              <option value="">All Jobs</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.customerName} — {j.serviceType}</option>
              ))}
            </select>
            <select
              value={filterEmployee}
              onChange={(e) => setFilterEmployee(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm"
            >
              <option value="">All Employees</option>
              {EmployeeS.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Reports list */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">{isEmployee ? "હજુ કોઈ રિપોર્ટ નથી" : "No reports yet"}</p>
          {isEmployee && <p className="text-sm text-slate-400 mt-1">ઉપર નવો રિપોર્ટ સબમિટ કરો</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((r) => {
            const allDone = r.checklist && Object.values(r.checklist).every(Boolean);
            const images = r.imageUrls || r.images || [];
            const audioSrc = r.audioUrl || r.voiceNote || null;
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-(--brand-soft) flex items-center justify-center text-(--brand) text-xs font-black">
                        {r.EmployeeName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{r.EmployeeName}</p>
                        <p className="text-xs text-slate-400">{r.timestamp ? new Date(r.timestamp).toLocaleString("en-IN") : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {allDone && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Complete
                      </span>
                    )}
                    {images.length > 0 && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold">
                        <Image className="w-3 h-3" />
                        {images.length}
                      </span>
                    )}
                    {audioSrc && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-600 text-xs font-bold">
                        <Mic className="w-3 h-3" />
                        Voice
                      </span>
                    )}
                    {/* Admin-only delete button */}
                    {isAdmin && (
                      deleteConfirm === r.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-rose-600 font-semibold">Delete?</span>
                          <button
                            onClick={() => handleDeleteReport(r.id)}
                            className="px-2 py-1 rounded-lg bg-rose-500 text-white text-xs font-bold hover:bg-rose-600"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 rounded-lg bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(r.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-3 px-3 py-2 bg-slate-50 rounded-xl">
                  Job: {getJobLabel(r.jobId)}
                </div>

                {/* Rework Job section */}
                {(() => {
                  const rw = getReworkInfo(r.jobId);
                  if (!rw) return null;
                  if (rw.isRework) return (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                      <RefreshCw className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-violet-700">Rework Job</span>
                        <span className="text-xs text-violet-500 ml-1.5">· Original Job ID:</span>
                        <span className="text-xs font-mono text-violet-700 ml-1 break-all">{rw.parentJobId}</span>
                      </div>
                    </div>
                  );
                  if (rw.hasReworks) return (
                    <div className="mb-3 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Link2 className="w-3.5 h-3.5 text-violet-600" />
                        <span className="text-xs font-bold text-violet-700">Has {rw.reworks.length} Rework Job{rw.reworks.length > 1 ? "s" : ""}</span>
                      </div>
                      {rw.reworks.map((rwj) => (
                        <div key={rwj.id} className="text-xs text-violet-600 font-mono mt-0.5">↳ {rwj.id}</div>
                      ))}
                    </div>
                  );
                  return null;
                })()}

                {r.checklist && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {[
                      { key: "inspectionDone", label: "ઇન્સ્પેક્શન" },
                      { key: "chemicalApplied", label: "કેમિકલ" },
                      { key: "areaCovered", label: "એરિયા" },
                      { key: "customerSatisfied", label: "સેટિસ્ફાઈડ" },
                    ].map((s) => (
                      <div key={s.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold ${
                        r.checklist[s.key] ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-400"
                      }`}>
                        {r.checklist[s.key] ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-current" />}
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}

                {r.notes && (
                  <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap">{r.notes}</p>
                )}

                {/* Images — always visible to admins */}
                {images.length > 0 && (
                  <div className="mb-3">
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Camera className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-bold text-blue-600">Photos ({images.length})</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="block group relative">
                          <img
                            src={url}
                            alt={`Report image ${i + 1}`}
                            className="w-full h-20 object-cover rounded-xl border border-slate-200 group-hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                              <Eye className="w-4 h-4 text-slate-700" />
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voice note — always visible to admins */}
                {audioSrc && (
                  <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Mic className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs font-bold text-violet-700">Voice Note</span>
                    </div>
                    <audio controls src={audioSrc} className="w-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Report Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-slate-900">નવો રિપોર્ટ સબમિટ કરો</h2>
              <button onClick={() => { setShowForm(false); voiceRec.reset(); }} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">જોબ સિલેક્ટ કરો *</label>
                <select
                  value={form.jobId}
                  onChange={(e) => setForm((p) => ({ ...p, jobId: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm"
                >
                  <option value="">જોબ સિલેક્ટ કરો</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.customerName} — {j.serviceType}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">નોટ્સ</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="કરેલ કામ વિશે ડિટેઇલ લખો..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-(--brand) focus:outline-none text-sm resize-none"
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> ફોટો અપલોડ (દરેક મેક્સ {MAX_IMAGE_MB}MB)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-(--brand-soft) file:text-(--brand) file:text-xs file:font-bold file:cursor-pointer"
                />
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Preview ${i + 1}`} className="w-full h-20 object-cover rounded-xl border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice recorder */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" /> વૉઇસ નોટ (મેક્સ {MAX_AUDIO_MB}MB)</span>
                </label>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  {voiceRec.state === "idle" && (
                    <button
                      type="button"
                      onClick={voiceRec.start}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-bold hover:bg-violet-600 transition-colors"
                    >
                      <Mic className="w-4 h-4" />
                      રેકોર્ડિંગ સ્ટાર્ટ કરો
                    </button>
                  )}
                  {voiceRec.state === "requesting" && (
                    <div className="text-center text-sm text-slate-500">માઇક્રોફોન પરમિશન...</div>
                  )}
                  {voiceRec.state === "recording" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-lg font-black text-slate-900">{voiceRec.durationFmt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={voiceRec.stop}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        રેકોર્ડિંગ સ્ટોપ કરો
                      </button>
                    </div>
                  )}
                  {voiceRec.state === "stopped" && voiceRec.blob && (
                    <div className="space-y-3">
                      <audio controls src={URL.createObjectURL(voiceRec.blob)} className="w-full" />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={voiceRec.reset}
                          className="flex-1 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          રી-રેકોર્ડ કરો
                        </button>
                      </div>
                    </div>
                  )}
                  {voiceRec.state === "error" && (
                    <div className="flex items-center gap-2 text-rose-600 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{voiceRec.errorMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {uploadProgress && (
                <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  {uploadProgress}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => { 
                    setShowForm(false); 
                    voiceRec.reset(); 
                    form.images.forEach((url) => URL.revokeObjectURL(url));
                    setForm({ jobId: "", notes: "", images: [], imageFiles: [] });
                    setUploadProgress("");
                  }} 
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  કેન્સલ
                </button>
                <button 
                  type="submit" 
                  disabled={busy || !form.jobId}
                  className="flex-1 py-2.5 rounded-xl bg-(--brand) text-white text-sm font-bold hover:bg-(--brand-dark) disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      અપલોડ થઈ રહ્યું છે...
                    </>
                  ) : (
                    "રિપોર્ટ સબમિટ કરો"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
