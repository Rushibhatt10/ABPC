import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { formatDateDisplay } from "../utils/format";
import { Printer, ArrowLeft, Download, Share2 } from "lucide-react";
import html2canvas from "../utils/html2canvasLib.js";
import jsPDF from "jspdf";

export default function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!id) return;
    return subscribeDoc("jobs", id, (data) => { setJob(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && job && searchParams.get("autoShare") === "true") {
      setTimeout(() => handleSharePDF(), 1000);
    }
  }, [loading, job]);

  const generatePDFBlob = async () => {
    const element = document.querySelector(".cert-page");
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

  const handleDownloadPDF = async () => {
    setBusy("downloading");
    try {
      const blob = await generatePDFBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Certificate_${job.customerName || id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF download failed", err);
    } finally {
      setBusy("");
    }
  };

  const handleSharePDF = async () => {
    setBusy("sharing");
    try {
      const blob = await generatePDFBlob();
      if (!blob) return;
      const file = new File([blob], `Certificate_${job.customerName || id}.pdf`, { type: "application/pdf" });

      const customMsg = searchParams.get("msg");
      const shareText = customMsg || `We hope your recent *${job.treatmentLabel || job.serviceType || job.serviceName}* service went well! 

Please find your service certificate attached.

Please let us know if you have any concerns or need a follow-up visit. We're always here to help. 😊`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Certificate - ${job.customerName}`,
          text: shareText,
        });
      } else {
        alert("Sharing files is only supported on mobile browsers. On Desktop, please Download the PDF and attach it to WhatsApp manually.");
      }
    } catch (err) {
      console.error("Sharing failed", err);
    } finally {
      setBusy("");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Loading certificate…</p>
    </div>
  );
  if (!job) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#fff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Certificate not found.</p>
    </div>
  );

  const certNo = `ABPC-${id?.slice(-6).toUpperCase()}`;
  const treatmentDate = job.completedAt
    ? new Date(job.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : formatDateDisplay(job.scheduledDate);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#FAF7F2", borderColor: "#E6DFD6" }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#8B7E74", background: "none", border: "none", cursor: "pointer" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1" />
        <button 
          onClick={handleSharePDF} 
          disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" 
          style={{ background: "#25D366", border: "none", cursor: "pointer" }}>
          <Share2 className="w-4 h-4" /> {busy === "sharing" ? "Processing..." : "Share"}
        </button>
        <button 
          onClick={handleDownloadPDF} 
          disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" 
          style={{ background: "#4C7A2D", border: "none", cursor: "pointer" }}>
          <Download className="w-4 h-4" /> {busy === "downloading" ? "Downloading..." : "Download PDF"}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-300 transition-all active:scale-95" style={{ background: "#fff", cursor: "pointer" }}>
          <Printer className="w-4 h-4" /> Print View
        </button>
      </div>

      {/* Page wrapper */}
      <div className="cert-wrap" style={{ background: "#fff", minHeight: "100vh", padding: "40px 16px" }}>
        <div className="cert-page" style={{
          width: "100%", maxWidth: "210mm", minHeight: "297mm",
          margin: "0 auto", background: "#fff",
          boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
          fontFamily: "'Inter', sans-serif", color: "#2E2A27",
          position: "relative",
          padding: "14mm 16mm",
        }}>

          {/* Outer border */}
          <div style={{ position: "absolute", inset: 8, border: "1.5px solid #D8CFC4", pointerEvents: "none", zIndex: 0 }} />
          {/* Inner border */}
          <div style={{ position: "absolute", inset: 12, border: "0.5px solid #D8CFC4", pointerEvents: "none", zIndex: 0 }} />

          {/* Faint watermark — very low opacity, no overflow */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none", zIndex: 0, width: 220, height: 220 }}>
            <img src="/cropped_circle_image.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          {/* All content above watermark */}
          <div style={{ position: "relative", zIndex: 1 }}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "6mm" }}>
              {/* Company info */}
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#2E2A27", letterSpacing: "0.02em", lineHeight: 1.2, margin: 0 }}>
                  A.B. Pest Control
                </p>
                <p style={{ fontSize: 8.5, color: "#8B7E74", letterSpacing: "0.16em", textTransform: "uppercase", margin: "3px 0 0" }}>
                  Insecticide Services
                </p>
                <p style={{ fontSize: 8, color: "#6E6259", margin: "4px 0 0", lineHeight: 1.6 }}>
                  Shop No 4, Hanuman Char Rasta, Gopipura, Surat
                </p>
                <p style={{ fontSize: 8, color: "#6E6259", margin: 0 }}>
                  +91 9374488004 · abpestcontrol@gmail.com · abpestcontrol.in
                </p>
              </div>
              {/* Logo */}
              <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", flexShrink: 0, background: "#FAF7F2" }}>
                <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #D8CFC4", marginBottom: "7mm" }} />

            {/* ── TITLE ── */}
            <div style={{ textAlign: "center", marginBottom: "6mm" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", margin: 0, lineHeight: 1.4 }}>
                Pest Control Service Certificate
              </p>
              <div style={{ width: 48, height: 2, background: "#8B7E74", margin: "6px auto 0", borderRadius: 1 }} />
              <p style={{ fontSize: 8.5, color: "#8B7E74", margin: "6px 0 0", letterSpacing: "0.08em" }}>
                Certificate No: {certNo}
              </p>
            </div>

            {/* ── BODY ── */}
            <div style={{ textAlign: "center", maxWidth: "145mm", margin: "0 auto", lineHeight: 2 }}>

              <p style={{ fontSize: 11.5, color: "#2E2A27", margin: 0 }}>This is to certify that</p>

              {/* Customer name */}
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: "#2E2A27", borderBottom: "1px solid #8B7E74", display: "inline-block", paddingBottom: 2, minWidth: "120mm", margin: "6px 0 4px", letterSpacing: "0.02em" }}>
                {job.customerName || "________________________"}
              </p>

              <p style={{ fontSize: 11, color: "#2E2A27", margin: "4px 0 2px" }}>located at</p>

              {/* Address */}
              <p style={{ fontSize: 10.5, color: "#6E6259", fontStyle: "italic", margin: "2px 0 6px", lineHeight: 1.5 }}>
                {job.address || job.customerAddress || "________________________"}
              </p>

              <p style={{ fontSize: 11, color: "#2E2A27", margin: "4px 0" }}>has been treated for</p>

              {/* Service */}
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: "#8B7E74", letterSpacing: "0.04em", margin: "4px 0 6px" }}>
                {job.treatmentLabel || job.serviceType || job.serviceName || "Pest Control Services"}
              </p>

              <p style={{ fontSize: 11, color: "#2E2A27", margin: "4px 0", lineHeight: 1.8 }}>
                by <strong style={{ fontFamily: "'Playfair Display', serif" }}>AB Pest Control</strong>, in compliance with<br />
                government-approved standards and safety norms.
              </p>

              {/* Warranty */}
              {job.warranty && (
                <div style={{ display: "inline-block", margin: "10mm auto 0", padding: "4mm 10mm", border: "1px solid #D8CFC4", borderRadius: 4, background: "rgba(0,0,0,0.015)" }}>
                  <p style={{ fontSize: 8.5, color: "#8B7E74", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>Warranty Period</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#2E2A27", margin: "3px 0 0" }}>{job.warranty}</p>
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            <div style={{ marginTop: "12mm" }}>
              <div style={{ borderTop: "1px solid #D8CFC4", marginBottom: "6mm" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>

                {/* Date + Contact */}
                <div>
                  <p style={{ fontSize: 8.5, color: "#8B7E74", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Date of Treatment</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#2E2A27", margin: 0 }}>{treatmentDate}</p>
                  {job.customerPhone && (
                    <p style={{ fontSize: 8.5, color: "#6E6259", margin: "5px 0 0" }}>Contact: {job.customerPhone}</p>
                  )}
                </div>

                {/* Signature */}
                <div style={{ textAlign: "center" }}>
                  <img src="/sign-removebg-preview.png" alt="Signature" style={{ height: 70, width: 180, objectFit: "contain", objectPosition: "center", display: "block", margin: "0 auto 4px" }} />
                  <div style={{ borderBottom: "1px solid #8B7E74", width: 140, margin: "0 auto 5px" }} />
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#2E2A27", letterSpacing: "0.04em", margin: 0 }}>Authorized Signatory</p>
                  <p style={{ fontSize: 9, color: "#8B7E74", margin: "2px 0 0" }}>AB Pest Control</p>
                </div>
              </div>

              {/* Bottom note */}
              <div style={{ textAlign: "center", marginTop: "6mm" }}>
                <p style={{ fontSize: 7.5, color: "#8B7E74", letterSpacing: "0.06em", margin: 0 }}>
                  This certificate is issued as proof of pest control treatment carried out at the above premises.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
