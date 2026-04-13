import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { formatDateDisplay } from "../utils/format";
import { Printer, ArrowLeft } from "lucide-react";

export default function CertificatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return subscribeDoc("jobs", id, (data) => {
      setJob(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#F5F1E8" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Loading certificate…</p>
    </div>
  );

  if (!job) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#F5F1E8" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Certificate not found.</p>
    </div>
  );

  const treatmentDate = job.completedAt
    ? new Date(job.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : formatDateDisplay(job.scheduledDate);

  const certNumber = `ABPC-${job.id?.slice(-6).toUpperCase() || "000000"}`;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #F5F1E8 !important; }
          .cert-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#FAF7F2", borderColor: "#E6DFD6" }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: "#8B7E74" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1" />
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors"
          style={{ background: "#8B7E74" }}>
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Page wrapper */}
      <div className="min-h-screen py-10 px-4 print:p-0 print:m-0"
        style={{ background: "#F5F1E8" }}>

        {/* A4 Certificate */}
        <div className="cert-page mx-auto"
          style={{
            width: "100%",
            maxWidth: "210mm",
            minHeight: "297mm",
            background: "#F5F1E8",
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            padding: "14mm 16mm",
            fontFamily: "'Inter', sans-serif",
            color: "#2E2A27",
            position: "relative",
            boxSizing: "border-box",
          }}>

          {/* Outer border */}
          <div style={{
            position: "absolute",
            inset: "8mm",
            border: "1.5px solid #D8CFC4",
            pointerEvents: "none",
          }} />
          {/* Inner border */}
          <div style={{
            position: "absolute",
            inset: "11mm",
            border: "0.5px solid #D8CFC4",
            pointerEvents: "none",
          }} />

          {/* Watermark logo */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 0.04,
            pointerEvents: "none",
            zIndex: 0,
          }}>
            <img src="/cropped_circle_image.png" alt=""
              style={{ width: 280, height: 280, objectFit: "contain" }} />
          </div>

          {/* Content — above watermark */}
          <div style={{ position: "relative", zIndex: 1, height: "100%" }}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6mm" }}>
              <div>
                <p style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#2E2A27",
                  letterSpacing: "0.02em",
                  lineHeight: 1.2,
                }}>A.B. Pest Control</p>
                <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>
                  Insecticide Services
                </p>
                <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 2 }}>
                  Shop No 4, Hanuman Char Rasta, Gopipura, Surat
                </p>
                <p style={{ fontSize: 8.5, color: "#6E6259" }}>
                  +91 98251 88413 · abpestcontrol@gmail.com
                </p>
              </div>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: "1.5px solid #D8CFC4",
                overflow: "hidden",
                flexShrink: 0,
                background: "#FAF7F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <img src="/cropped_circle_image.png" alt="Logo"
                  style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: "1px solid #D8CFC4", marginBottom: "8mm" }} />

            {/* ── TITLE ── */}
            <div style={{ textAlign: "center", marginBottom: "10mm" }}>
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#2E2A27",
                lineHeight: 1.4,
              }}>
                Pest Control Service Certificate
              </p>
              <div style={{
                width: 60,
                height: 2,
                background: "#8B7E74",
                margin: "6px auto 0",
                borderRadius: 1,
              }} />
            </div>

            {/* Certificate number */}
            <div style={{ textAlign: "center", marginBottom: "10mm" }}>
              <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Certificate No: {certNumber}
              </p>
            </div>

            {/* ── BODY ── */}
            <div style={{
              textAlign: "center",
              maxWidth: "140mm",
              margin: "0 auto",
              lineHeight: 2.2,
            }}>
              <p style={{ fontSize: 12, color: "#2E2A27", fontWeight: 400 }}>
                This is to certify that
              </p>

              {/* Customer name */}
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 18,
                fontWeight: 600,
                color: "#2E2A27",
                borderBottom: "1px solid #8B7E74",
                display: "inline-block",
                paddingBottom: 2,
                minWidth: "120mm",
                marginTop: 4,
                marginBottom: 4,
                letterSpacing: "0.02em",
              }}>
                {job.customerName || "________________________"}
              </p>

              <p style={{ fontSize: 12, color: "#2E2A27", marginTop: 8 }}>
                located at
              </p>

              {/* Address */}
              <p style={{
                fontSize: 11,
                color: "#6E6259",
                fontStyle: "italic",
                marginTop: 4,
                marginBottom: 8,
                lineHeight: 1.6,
              }}>
                {job.address || job.customerAddress || "________________________"}
              </p>

              <p style={{ fontSize: 12, color: "#2E2A27", lineHeight: 2 }}>
                has been treated for
              </p>

              {/* Service */}
              <p style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#8B7E74",
                letterSpacing: "0.04em",
                marginTop: 4,
                marginBottom: 4,
              }}>
                {job.treatmentLabel || job.serviceType || job.serviceName || "Pest Control Services"}
              </p>

              <p style={{ fontSize: 12, color: "#2E2A27", lineHeight: 2, marginTop: 8 }}>
                by <strong style={{ fontFamily: "'Playfair Display', serif" }}>AB Pest Control</strong>, in compliance with
                government-approved standards and safety norms.
              </p>

              {/* Warranty */}
              {job.warranty && (
                <div style={{
                  marginTop: "8mm",
                  padding: "4mm 8mm",
                  border: "1px solid #D8CFC4",
                  borderRadius: 4,
                  display: "inline-block",
                  background: "rgba(216,207,196,0.15)",
                }}>
                  <p style={{ fontSize: 10, color: "#8B7E74", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Warranty Period
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#2E2A27", marginTop: 2 }}>
                    {job.warranty}
                  </p>
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            <div style={{
              position: "absolute",
              bottom: "6mm",
              left: 0,
              right: 0,
              padding: "0 4mm",
            }}>
              {/* Top divider */}
              <div style={{ borderTop: "1px solid #D8CFC4", marginBottom: "6mm" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>

                {/* Date + Treatment details */}
                <div>
                  <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>
                    Date of Treatment
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#2E2A27" }}>{treatmentDate}</p>
                  {job.customerPhone && (
                    <p style={{ fontSize: 9, color: "#6E6259", marginTop: 6 }}>
                      Contact: {job.customerPhone}
                    </p>
                  )}
                </div>

                {/* Signature */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ textAlign: "center", minWidth: 120 }}>
                    <div style={{ height: 32, borderBottom: "1px solid #8B7E74", marginBottom: 6, width: 120 }} />
                    <p style={{ fontSize: 10, fontWeight: 600, color: "#2E2A27", letterSpacing: "0.04em" }}>Authorized Signatory</p>
                    <p style={{ fontSize: 9, color: "#8B7E74", marginTop: 2 }}>AB Pest Control</p>
                  </div>
                </div>
              </div>

              {/* Bottom note */}
              <div style={{ textAlign: "center", marginTop: "5mm" }}>
                <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.08em" }}>
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
