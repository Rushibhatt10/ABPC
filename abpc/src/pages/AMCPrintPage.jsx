import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { formatDateDisplay } from "../utils/format";
import { Printer, ArrowLeft } from "lucide-react";

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

const DURATION_LABEL = { 1: "1 Month", 3: "3 Months (Quarterly)", 6: "6 Months", 12: "12 Months (Annual)" };

export default function AMCPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [amc, setAmc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    return subscribeDoc("amc", id, (data) => {
      setAmc(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#ffffff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Loading agreement…</p>
    </div>
  );
  if (!amc) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#ffffff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Agreement not found.</p>
    </div>
  );

  const contractNo = `AMC-${id?.slice(-6).toUpperCase()}`;
  const endDate = amc.endDate || (amc.startDate ? addMonths(amc.startDate, amc.durationMonths || 12) : "");

  const S = {
    page: {
      width: "100%", maxWidth: "210mm", minHeight: "297mm",
      background: "#ffffff", margin: "0 auto",
      padding: "14mm 16mm", boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif", color: "#2E2A27",
      position: "relative",
      boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    },
    outerBorder: {
      position: "absolute", inset: "8mm",
      border: "1.5px solid #D8CFC4", pointerEvents: "none",
    },
    innerBorder: {
      position: "absolute", inset: "11mm",
      border: "0.5px solid #D8CFC4", pointerEvents: "none",
    },
    watermark: {
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%,-50%)", opacity: 0.04,
      pointerEvents: "none", zIndex: 0,
    },
    content: { position: "relative", zIndex: 1 },
    divider: { borderTop: "1px solid #D8CFC4", margin: "5mm 0" },
    sectionTitle: {
      fontSize: 9, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color: "#8B7E74", marginBottom: 8,
    },
    label: { fontSize: 9, color: "#8B7E74", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 12, fontWeight: 500, color: "#2E2A27", lineHeight: 1.5 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4mm", marginBottom: "4mm" },
    field: { marginBottom: "3mm" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: #ffffff !important; }
          .amc-page { box-shadow: none !important; }
        }
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#FAF7F2", borderColor: "#E6DFD6" }}>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: "#8B7E74" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1" />
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "#8B7E74" }}>
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Page wrapper */}
      <div style={{ background: "#ffffff", minHeight: "100vh", padding: "40px 16px" }}
        className="print:p-0 print:m-0">

        <div className="amc-page" style={S.page}>
          <div style={S.outerBorder} />
          <div style={S.innerBorder} />
          <div style={S.watermark}>
            <img src="/cropped_circle_image.png" alt="" style={{ width: 260, height: 260, objectFit: "contain" }} />
          </div>

          <div style={S.content}>

            {/* ── HEADER ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "5mm" }}>
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#2E2A27", letterSpacing: "0.02em", lineHeight: 1.2 }}>
                  A.B. Pest Control
                </p>
                <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>
                  Insecticide Services
                </p>
                <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 3, lineHeight: 1.6 }}>
                  Shop No 4, Hanuman Char Rasta, Gopipura, Surat · +91 98251 88413
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", background: "#FAF7F2", marginLeft: "auto" }}>
                  <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <p style={{ fontSize: 8, color: "#8B7E74", marginTop: 4, letterSpacing: "0.06em" }}>
                  Ref: {contractNo}
                </p>
              </div>
            </div>

            <div style={S.divider} />

            {/* ── TITLE ── */}
            <div style={{ textAlign: "center", margin: "6mm 0 8mm" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", lineHeight: 1.4 }}>
                Annual Maintenance Contract
              </p>
              <div style={{ width: 50, height: 2, background: "#8B7E74", margin: "5px auto 0", borderRadius: 1 }} />
              <p style={{ fontSize: 9, color: "#8B7E74", marginTop: 5, letterSpacing: "0.1em" }}>
                This agreement is entered into between AB Pest Control and the client mentioned below.
              </p>
            </div>

            {/* ── SECTION 1: CLIENT DETAILS ── */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>1. Client Details</p>
              <div style={{ border: "1px solid #E6DFD6", borderRadius: 4, padding: "4mm", background: "rgba(0,0,0,0.02)" }}>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Client Name</p>
                    <p style={S.value}>{amc.customerName || "—"}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Contact Number</p>
                    <p style={S.value}>{amc.customerPhone || "—"}</p>
                  </div>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Property Address</p>
                  <p style={S.value}>{amc.customerAddress || "—"}</p>
                </div>
                {amc.propertySqft && (
                  <div style={S.field}>
                    <p style={S.label}>Property Size</p>
                    <p style={S.value}>{amc.propertySqft} SqFt</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── SECTION 2: SERVICE DETAILS ── */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>2. Services Covered</p>
              <div style={{ border: "1px solid #E6DFD6", borderRadius: 4, padding: "4mm", background: "rgba(0,0,0,0.02)" }}>
                {amc.services?.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #D8CFC4" }}>
                        <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#8B7E74", textTransform: "uppercase" }}>#</th>
                        <th style={{ textAlign: "left", padding: "4px 6px", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#8B7E74", textTransform: "uppercase" }}>Service</th>
                        <th style={{ textAlign: "right", padding: "4px 6px", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#8B7E74", textTransform: "uppercase" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {amc.services.map((s, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #E6DFD6" }}>
                          <td style={{ padding: "6px 6px", color: "#8B7E74", fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: "6px 6px", color: "#2E2A27", fontWeight: 500 }}>{s.itemName}</td>
                          <td style={{ padding: "6px 6px", textAlign: "right", color: "#2E2A27", fontWeight: 600 }}>
                            {s.price ? `₹${Number(s.price).toLocaleString("en-IN")}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ fontSize: 11, color: "#8B7E74", fontStyle: "italic" }}>No services specified.</p>
                )}
                {amc.notes && (
                  <p style={{ fontSize: 10, color: "#6E6259", marginTop: 8, fontStyle: "italic" }}>Note: {amc.notes}</p>
                )}
              </div>
            </div>

            {/* ── SECTION 3: DURATION & DATES ── */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>3. Duration & Dates</p>
              <div style={{ border: "1px solid #E6DFD6", borderRadius: 4, padding: "4mm", background: "rgba(0,0,0,0.02)" }}>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Contract Duration</p>
                    <p style={S.value}>{DURATION_LABEL[amc.durationMonths] || `${amc.durationMonths} Months`}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Status</p>
                    <p style={{ ...S.value, color: amc.status === "Active" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                      {amc.status || "Active"}
                    </p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Start Date</p>
                    <p style={S.value}>{formatDateDisplay(amc.startDate)}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>End Date</p>
                    <p style={S.value}>{formatDateDisplay(endDate)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 4: TERMS ── */}
            <div style={{ marginBottom: "6mm" }}>
              <p style={S.sectionTitle}>4. Terms & Conditions</p>
              <div style={{ border: "1px solid #E6DFD6", borderRadius: 4, padding: "4mm", background: "rgba(0,0,0,0.02)" }}>
                {[
                  "This contract is valid for the selected duration from the start date mentioned above.",
                  "Service visits will be carried out as per the requirement of each treatment type.",
                  "Any additional work beyond the scope of this contract may be charged separately.",
                  "Payment must be completed as per the agreed terms before or on the service date.",
                  "The client must ensure access to the property on the scheduled service date.",
                  "AB Pest Control is not liable for damages caused by pre-existing structural conditions.",
                  "This contract is non-transferable and applies only to the property mentioned above.",
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "#8B7E74", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    <p style={{ fontSize: 10, color: "#2E2A27", lineHeight: 1.6, margin: 0 }}>{t}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── SIGNATURE SECTION ── */}
            <div style={S.divider} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6mm" }}>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <img src="/sign.png" alt="Signature" style={{ height: 80, width: 200, objectFit: "contain", objectPosition: "center", display: "block", margin: "0 auto 4px" }} /><div style={{ borderBottom: "1px solid #8B7E74", marginBottom: 6, width: 120 }} />
                <p style={{ fontSize: 10, fontWeight: 600, color: "#2E2A27", letterSpacing: "0.04em" }}>Authorized Signatory</p>
                <p style={{ fontSize: 9, color: "#8B7E74", marginTop: 2 }}>AB Pest Control</p>
              </div>
            </div>

            {/* Footer note */}
            <div style={{ textAlign: "center", marginTop: "5mm" }}>
              <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.06em" }}>
                This is a legally binding agreement. Please read all terms before signing.
              </p>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}





