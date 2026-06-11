import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { generateA4PdfBlob } from "../utils/pdfExport";
import { Printer, ArrowLeft, Download, Share2 } from "lucide-react";

export default function QuotationPrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "downloading" or "sharing"

  useEffect(() => {
    if (!id) return;
    return subscribeDoc("quotations", id, (data) => { setQuotation(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && quotation && searchParams.get("autoShare") === "true") {
      setTimeout(() => handleSharePDF(), 1000);
    }
  }, [loading, quotation]);

  const generatePDFBlob = async () => {
    const element = document.querySelector(".print-container") || document.querySelector(".doc-page");
    return generateA4PdfBlob(element);
  };

  const handleDownloadPDF = async () => {
    setBusy("downloading");
    try {
      const blob = await generatePDFBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation_${quotation.estimateNumber || id}.pdf`;
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
      const file = new File([blob], `Quotation_${quotation.estimateNumber || id}.pdf`, { type: "application/pdf" });

      const customMsg = searchParams.get("msg");
      const shareText = customMsg || `Hello *${quotation.customerName}*, 

Please find attached your quotation for *${quotation.serviceType || "Pest Control"}* from AB Pest Control.

Thank you for choosing A.B. Pest Control! 😊`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Quotation - ${quotation.estimateNumber}`,
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
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#fff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Loading quotation…</p>
    </div>
  );
  if (!quotation) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#fff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Quotation not found.</p>
    </div>
  );

  const total = quotation.totalAmount || quotation.items?.reduce((s, i) => s + (i.total || 0), 0) || 0;

  const S = {
    page: {
      width: "100%", maxWidth: "210mm", minHeight: "297mm",
      background: "#ffffff", margin: "0 auto",
      padding: "14mm 16mm", boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif", color: "#2E2A27",
      position: "relative", boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
    },
    outerBorder: { position: "absolute", inset: "8mm", border: "1.5px solid #D8CFC4", pointerEvents: "none" },
    innerBorder: { position: "absolute", inset: "11mm", border: "0.5px solid #D8CFC4", pointerEvents: "none" },
    watermark: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none", zIndex: 0 },
    content: { position: "relative", zIndex: 1 },
    divider: { borderTop: "1px solid #D8CFC4", margin: "5mm 0" },
    sectionTitle: { fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8B7E74", marginBottom: 8 },
    label: { fontSize: 9, color: "#8B7E74", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 },
    value: { fontSize: 12, fontWeight: 500, color: "#2E2A27", lineHeight: 1.5 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4mm", marginBottom: "4mm" },
    field: { marginBottom: "3mm" },
    box: { border: "1px solid #E6DFD6", borderRadius: 4, padding: "4mm", background: "rgba(0,0,0,0.02)" },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>

      {/* Action bar */}
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3 border-b"
        style={{ background: "#FAF7F2", borderColor: "#E6DFD6" }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "#8B7E74" }}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1" />
        <button 
          onClick={handleSharePDF} 
          disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" 
          style={{ background: "#25D366" }}>
          <Share2 className="w-4 h-4" /> {busy === "sharing" ? "Processing..." : "Share to WhatsApp"}
        </button>
        <button 
          onClick={handleDownloadPDF} 
          disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50" 
          style={{ background: "#4C7A2D" }}>
          <Download className="w-4 h-4" /> {busy === "downloading" ? "Downloading..." : "Download PDF"}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-300 transition-all active:scale-95" style={{ background: "#fff" }}>
          <Printer className="w-4 h-4" /> Print View
        </button>
      </div>

      <div style={{ background: "#fff", minHeight: "100vh", padding: "40px 16px" }} className="print-container">
        <div className="doc-page" style={S.page}>
          <div style={S.outerBorder} />
          <div style={S.innerBorder} />
          <div style={S.watermark}>
            <img src="/cropped_circle_image.png" alt="" style={{ width: 260, height: 260, objectFit: "contain" }} />
          </div>

          <div style={S.content}>

            {/* HEADER */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "5mm" }}>
              <div>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#2E2A27", letterSpacing: "0.02em", lineHeight: 1.2 }}>A.B. Pest Control</p>
                <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 3 }}>Insecticide Services</p>
                <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 3, lineHeight: 1.6 }}>Shop No 4, Hanuman Char Rasta, Gopipura, Surat · +91 9374488004 </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", background: "#FAF7F2", marginLeft: "auto" }}>
                  <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <p style={{ fontSize: 8, color: "#8B7E74", marginTop: 4, letterSpacing: "0.06em" }}>Ref: {quotation.estimateNumber}</p>
              </div>
            </div>

            <div style={S.divider} />

            {/* TITLE */}
            <div style={{ textAlign: "center", margin: "6mm 0 8mm" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", lineHeight: 1.4 }}>
                Quotation
              </p>
              <div style={{ width: 50, height: 2, background: "#8B7E74", margin: "5px auto 0", borderRadius: 1 }} />
            </div>

            {/* SECTION 1: QUOTATION FOR */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>1. Quotation For</p>
              <div style={S.box}>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Client Name</p>
                    <p style={S.value}>{quotation.customerName || "—"}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Contact Number</p>
                    <p style={S.value}>{quotation.customerPhone || "—"}</p>
                  </div>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Customer ID</p>
                  <p style={S.value}>{quotation.customerId || "-"}</p>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Address</p>
                  <p style={S.value}>{quotation.customerAddress || "—"}</p>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Quotation Date</p>
                    <p style={S.value}>{formatDateDisplay(quotation.date)}</p>
                  </div>
                  {quotation.propertyType && (
                    <div style={S.field}>
                      <p style={S.label}>Property Type</p>
                      <p style={S.value}>{quotation.propertyType}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: SERVICES */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>2. Services</p>
              <div style={S.box}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #D8CFC4" }}>
                      {["#", "Service", "Qty", "Unit", "Amount"].map((h, i) => (
                        <th key={h} style={{ textAlign: i >= 2 ? "right" : i === 0 ? "left" : "left", padding: "4px 6px", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#8B7E74", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items?.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #E6DFD6" }}>
                        <td style={{ padding: "7px 6px", color: "#8B7E74", fontSize: 10 }}>{i + 1}</td>
                        <td style={{ padding: "7px 6px", color: "#2E2A27", fontWeight: 500 }}>{item.itemName}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#6E6259" }}>{item.quantity}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#6E6259" }}>{item.unit || "—"}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#2E2A27", fontWeight: 600 }}>
                          {formatCurrency(item.total ?? (item.quantity * (item.unitPrice || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: TOTAL */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>3. Summary</p>
              <div style={S.box}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 3px", fontSize: 14, fontWeight: 700, color: "#2E2A27", borderTop: "1.5px solid #D8CFC4", marginTop: 4 }}>
                      <span>Total</span><span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PAYMENT TERMS */}
            {quotation.paymentTerms && (
              <div style={{ marginBottom: "4mm" }}>
                <p style={S.sectionTitle}>4. Payment Terms</p>
                <div style={S.box}>
                  <p style={{ fontSize: 10, color: "#2E2A27", lineHeight: 1.7, whiteSpace: "pre-line" }}>{quotation.paymentTerms}</p>
                </div>
              </div>
            )}

            {/* TERMS */}
            {quotation.terms && (
              <div style={{ marginBottom: "5mm" }}>
                <p style={S.sectionTitle}>5. Terms & Conditions</p>
                <div style={S.box}>
                  <p style={{ fontSize: 10, color: "#2E2A27", lineHeight: 1.7, whiteSpace: "pre-line" }}>{quotation.terms}</p>
                </div>
              </div>
            )}

            {/* SIGNATURE */}
            <div style={S.divider} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6mm" }}>
              <div style={{ textAlign: "center", minWidth: 160 }}>
                <img src="/sign-removebg-preview.png" alt="Signature" style={{ height: 70, width: 180, objectFit: "contain", objectPosition: "center", display: "block", margin: "0 auto 4px" }} />
                <div style={{ borderBottom: "1.5px solid #8B7E74", marginBottom: 6, width: 160, marginLeft: "auto", marginRight: "auto" }} />
                <p style={{ fontSize: 10, fontWeight: 600, color: "#2E2A27", letterSpacing: "0.04em" }}>Authorized Signatory</p>
                <p style={{ fontSize: 9, color: "#8B7E74", marginTop: 2 }}>AB Pest Control</p>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "5mm" }}>
              <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.06em" }}>This quotation is valid for 15 days from the date of issue.</p>
            </div>

          </div>
        </div>

        {quotation.methodology && (
          <div className="doc-page" style={S.page}>
            <div style={S.outerBorder} />
            <div style={S.innerBorder} />
            <div style={S.watermark}>
              <img src="/cropped_circle_image.png" alt="" style={{ width: 260, height: 260, objectFit: "contain" }} />
            </div>

            <div style={S.content}>
              <div style={{ textAlign: "center", marginBottom: "6mm" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", lineHeight: 1.4 }}>
                  6. Methodology
                </p>
                <div style={{ width: 50, height: 2, background: "#8B7E74", margin: "5px auto 0", borderRadius: 1 }} />
              </div>
              <div style={S.box}>
                <p style={{ fontSize: 10, color: "#2E2A27", lineHeight: 1.7, whiteSpace: "pre-line" }}>{quotation.methodology}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}





