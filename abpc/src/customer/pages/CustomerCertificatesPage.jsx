import { useEffect, useState, useMemo, useRef } from "react";
import { useCustomerAuth } from "../context/customerAuthState";
import { subscribeQuery } from "../../utils/firestoreHelpers";
import { collection, query, where } from "firebase/firestore";
import { firestoreDb } from "../../firebase/firestore";
import { formatDateDisplay, toDateObject } from "../../utils/format";
import { getWarrantyDays, getWarrantyLabel } from "../../utils/warranty";
import { Award, Eye, Download, Printer, X, Award as CertIcon } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function CustomerCertificatesPage() {
  const { activeCustomerId } = useCustomerAuth();
  
  const [completedJobs, setCompletedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [busy, setBusy] = useState("");

  const certAreaRef = useRef(null);

  useEffect(() => {
    if (!activeCustomerId) return;
    const q = query(
      collection(firestoreDb, "jobs"),
      where("customerId", "==", activeCustomerId),
      where("status", "==", "completed")
    );
    return subscribeQuery(q, setCompletedJobs);
  }, [activeCustomerId]);

  const sortedJobs = useMemo(() => {
    return [...completedJobs].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
  }, [completedJobs]);

  const generatePDFBlob = async () => {
    const element = certAreaRef.current;
    if (!element) return null;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    pdf.addImage(imgData, "PNG", 0, 0, 210, 297);
    return pdf.output("blob");
  };

  const handleDownloadPDF = async (job) => {
    setBusy("downloading");
    try {
      const blob = await generatePDFBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Certificate_${job.customerName || job.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed", err);
    } finally {
      setBusy("");
    }
  };

  const printCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="no-print">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Protection Certificates</h1>
        <p className="text-slate-500 mt-0.5 text-sm">Download and print your completed pest treatment certificates and warranty documents</p>
      </div>

      <div className="grid md:grid-cols-5 gap-6 no-print">
        
        {/* Certificate list */}
        <div className="md:col-span-2 space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Available Certificates</h2>
          {sortedJobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-400">
              <Award className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No certificates available yet.
            </div>
          ) : (
            <div className="space-y-2">
              {sortedJobs.map((job) => {
                const certNo = `ABPC-${job.id?.slice(-6).toUpperCase()}`;
                const completionDate = job.completedAt 
                  ? formatDateDisplay(job.completedAt.split("T")[0])
                  : formatDateDisplay(job.scheduledDate);
                const warrantyLabel = getWarrantyLabel(job);
                const warrantyDays = getWarrantyDays(job);
                const warrantyStartValue = job.completedAt || job.warrantyStartDate || job.scheduledDate;
                const warrantyStartDate = warrantyStartValue ? toDateObject(warrantyStartValue) : null;
                const warrantyEndDate = warrantyStartDate && warrantyDays > 0
                  ? (() => {
                      const next = new Date(warrantyStartDate);
                      next.setDate(next.getDate() + warrantyDays);
                      return next;
                    })()
                  : null;

                return (
                  <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3 shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-bold text-slate-800 text-sm leading-tight">
                        {job.treatmentLabel || job.serviceType || job.serviceName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Cert: {certNo} · Date: {completionDate}
                      </p>
                      {warrantyLabel && (
                        <div className="mt-1.5 space-y-1">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700">
                            🛡 {warrantyLabel} Warranty
                          </span>
                          <p className="text-[10px] text-slate-400">
                            Valid from {formatDateDisplay(warrantyStartDate)}{warrantyEndDate ? ` to ${formatDateDisplay(warrantyEndDate)}` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="ghost-btn p-2 rounded-xl flex items-center justify-center shrink-0"
                      title="View Certificate"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Informative instructions sidebar */}
        <div className="md:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center items-center text-center space-y-3 min-h-[300px]">
          <Award className="w-16 h-16 text-[var(--brand-soft)] text-[var(--brand)] animate-pulse" />
          <h3 className="font-black text-slate-900 text-lg">Pest Service Credentials</h3>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            Every completed service at your premises generates an official treatment certificate complete with active warranty periods. Select a certificate from the left to view, print, or export as PDF.
          </p>
        </div>

      </div>

      {/* Fullscreen Certificate Viewer Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col overflow-y-auto no-print">
          
          {/* Top modal action bar (no-print) */}
          <div className="bg-[#FAF7F2] border-b border-[#E6DFD6] px-4 py-3 flex items-center gap-3 sticky top-0 z-50">
            <button 
              onClick={() => setSelectedJob(null)} 
              className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <div className="flex-1" />
            <button 
              onClick={() => handleDownloadPDF(selectedJob)} 
              disabled={!!busy}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "#4C7A2D", border: "none", cursor: "pointer" }}
            >
              <Download className="w-4 h-4" /> {busy === "downloading" ? "Downloading..." : "Download PDF"}
            </button>
            <button 
              onClick={printCertificate} 
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-300 bg-white transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" /> Print Certificate
            </button>
          </div>

          {/* Certificate Page Wrapper */}
          <div className="flex-1 py-10 px-4 bg-slate-900/10 flex justify-center items-start">
            
            {/* Printable Certificate Page */}
            <div 
              ref={certAreaRef}
              className="cert-page bg-white relative shadow-2xl" 
              style={{
                width: "100%", maxWidth: "210mm", minHeight: "297mm",
                margin: "0 auto", padding: "14mm 16mm",
                fontFamily: "'Inter', sans-serif", color: "#2E2A27",
                boxSizing: "border-box"
              }}
            >
              {/* Outer border */}
              <div style={{ position: "absolute", inset: 8, border: "1.5px solid #D8CFC4", pointerEvents: "none", zIndex: 0 }} />
              {/* Inner border */}
              <div style={{ position: "absolute", inset: 12, border: "0.5px solid #D8CFC4", pointerEvents: "none", zIndex: 0 }} />

              {/* Watermark logo */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.035, pointerEvents: "none", zIndex: 0, width: 220, height: 220 }}>
                <img src="/cropped_circle_image.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>

              {/* Content Container */}
              <div style={{ position: "relative", zIndex: 1 }} className="space-y-6">
                
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <h2 style={{ fontFamily: "serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#2E2A27" }}>
                      A.B. Pest Control
                    </h2>
                    <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.15em", textTransform: "uppercase", margin: "2px 0 0" }}>
                      Insecticide Services
                    </p>
                    <p style={{ fontSize: 8, color: "#6E6259", margin: "5px 0 0", lineHeight: 1.5 }}>
                      Shop No 4, Hanuman Char Rasta, Gopipura, Surat<br/>
                      +91 9374488004 · abpestcontrol@gmail.com
                    </p>
                  </div>
                  <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", background: "#FAF7F2" }}>
                    <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #D8CFC4" }} />

                {/* Title */}
                <div style={{ textAlign: "center" }} className="space-y-1.5">
                  <h3 style={{ fontFamily: "serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2E2A27", margin: 0 }}>
                    Pest Control Service Certificate
                  </h3>
                  <div style={{ width: 40, height: 2, background: "#8B7E74", margin: "5px auto 0" }} />
                  <p style={{ fontSize: 8.5, color: "#8B7E74", margin: "5px 0 0" }}>
                    Certificate No: ABPC-{selectedJob.id?.slice(-6).toUpperCase()}
                  </p>
                </div>

                {/* Body Text */}
                <div style={{ textAlign: "center", maxWidth: "150mm", margin: "0 auto", lineHeight: 2.2 }} className="space-y-4 pt-4">
                  <p style={{ fontSize: 11, color: "#2E2A27", margin: 0 }}>This is to certify that</p>
                  
                  <h4 style={{ fontFamily: "serif", fontSize: 18, fontWeight: 600, color: "#2E2A27", borderBottom: "1px solid #8B7E74", display: "inline-block", paddingBottom: 2, minWidth: "120mm", margin: 0 }}>
                    {selectedJob.customerName}
                  </h4>
                  
                  <p style={{ fontSize: 10.5, color: "#2E2A27", margin: 0 }}>located at</p>
                  
                  <p style={{ fontSize: 10.5, color: "#6E6259", fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>
                    {selectedJob.address || selectedJob.customerAddress}
                  </p>
                  
                  <p style={{ fontSize: 10.5, color: "#2E2A27", margin: 0 }}>has been treated for</p>
                  
                  <h5 style={{ fontFamily: "serif", fontSize: 13, fontWeight: 600, color: "#8B7E74", margin: 0 }}>
                    {selectedJob.treatmentLabel || selectedJob.serviceType || selectedJob.serviceName}
                  </h5>

                  <p style={{ fontSize: 10.5, color: "#2E2A27", margin: 0, lineHeight: 1.6 }}>
                    by <strong>AB Pest Control</strong>, in compliance with<br />
                    government-approved standards and safety norms.
                  </p>

                  {/* Warranty */}
                  {(() => {
                    const warrantyLabel = getWarrantyLabel(selectedJob);
                    const warrantyDays = getWarrantyDays(selectedJob);
                    const warrantyStartValue = selectedJob.completedAt || selectedJob.warrantyStartDate || selectedJob.scheduledDate;
                    const warrantyStartDate = warrantyStartValue ? toDateObject(warrantyStartValue) : null;
                    const warrantyEndDate = warrantyStartDate && warrantyDays > 0
                      ? (() => {
                          const next = new Date(warrantyStartDate);
                          next.setDate(next.getDate() + warrantyDays);
                          return next;
                        })()
                      : null;
                    return warrantyLabel ? (
                      <div style={{ display: "inline-block", margin: "8mm auto 0", padding: "3.5mm 9mm", border: "1px solid #D8CFC4", borderRadius: 4, background: "rgba(0,0,0,0.012)" }}>
                        <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>Warranty Period</p>
                        <p style={{ fontSize: 12.5, fontWeight: 600, color: "#2E2A27", margin: "2px 0 0" }}>{warrantyLabel}</p>
                        <p style={{ fontSize: 8.5, color: "#6E6259", margin: "4px 0 0" }}>
                          Valid from {formatDateDisplay(warrantyStartDate)}{warrantyEndDate ? ` to ${formatDateDisplay(warrantyEndDate)}` : ""}
                        </p>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Footer Signatures */}
                <div style={{ paddingTop: "10mm" }}>
                  <div style={{ borderTop: "1px solid #D8CFC4", marginBottom: "5mm" }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 2px" }}>Date of Treatment</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#2E2A27", margin: 0 }}>
                        {selectedJob.completedAt 
                          ? new Date(selectedJob.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
                          : formatDateDisplay(selectedJob.scheduledDate)}
                      </p>
                      {selectedJob.customerPhone && (
                        <p style={{ fontSize: 8.5, color: "#6E6259", margin: "4px 0 0" }}>Phone: {selectedJob.customerPhone}</p>
                      )}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <img src="/sign-removebg-preview.png" alt="Signature" style={{ height: 55, width: 140, objectFit: "contain", objectPosition: "center", display: "block", margin: "0 auto 3px" }} />
                      <div style={{ borderBottom: "1px solid #8B7E74", width: 120, margin: "0 auto 4px" }} />
                      <p style={{ fontSize: 9.5, fontWeight: 600, color: "#2E2A27", margin: 0 }}>Authorized Signatory</p>
                      <p style={{ fontSize: 8.5, color: "#8B7E74", margin: "1px 0 0" }}>AB Pest Control</p>
                    </div>
                  </div>

                  <div style={{ textAlign: "center", marginTop: "6mm" }}>
                    <p style={{ fontSize: 7, color: "#8B7E74", margin: 0 }}>
                      This certificate is issued as proof of pest control treatment carried out at the above premises.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      )}

      {/* Print styles wrapper (print-only) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .cert-page, .cert-page * {
            visibility: visible;
          }
          .cert-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            height: 297mm !important;
            box-shadow: none !important;
            padding: 12mm 14mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
}
