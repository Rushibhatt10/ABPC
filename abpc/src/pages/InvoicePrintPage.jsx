import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { subscribeDoc } from "../utils/firestoreHelpers";
import { formatCurrency, formatDateDisplay } from "../utils/format";
import { generateA4PdfBlob } from "../utils/pdfExport";
import { Printer, ArrowLeft, Download, Share2, ShieldCheck } from "lucide-react";

export default function InvoicePrintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "downloading" or "sharing"
  const [showWarrantyCard, setShowWarrantyCard] = useState(false);

  useEffect(() => {
    if (!id) return;
    return subscribeDoc("invoices", id, (data) => { setInvoice(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!loading && invoice && searchParams.get("autoShare") === "true") {
      // Small delay to ensure DOM is ready for canvas
      setTimeout(() => handleSharePDF(), 1000);
    }
  }, [loading, invoice]);

  const generatePDFBlob = async () => {
    const element = document.querySelector(".doc-page");
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
      link.download = `Invoice_${invoice.invoiceNumber || id}.pdf`;
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
      const file = new File([blob], `Invoice_${invoice.invoiceNumber || id}.pdf`, { type: "application/pdf" });

      const customMsg = searchParams.get("msg");
      const shareText = customMsg || `Hello *${invoice.customerName}*, 

Please find attached your Tax Invoice *#${invoice.invoiceNumber}* from AB Pest Control.

Total Amount: ${formatCurrency(invoice.total)}
Status: ${invoice.status}

Thank you for choosing A.B. Pest Control! 😊`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice - ${invoice.invoiceNumber}`,
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
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Loading invoice…</p>
    </div>
  );
  if (!invoice) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "#fff" }}>
      <p style={{ color: "#8B7E74", fontSize: 14 }}>Invoice not found.</p>
    </div>
  );

  const isPaid = invoice.status === "Paid" || Number(invoice.balance) === 0;
  const warrantyItems = invoice.items?.filter(i => i.warranty) || [];

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
        {warrantyItems.length > 0 && (
          <button
            onClick={() => setShowWarrantyCard(p => !p)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
            style={{ background: showWarrantyCard ? "#16a34a" : "#f0fdf4", color: showWarrantyCard ? "#fff" : "#16a34a", border: "1.5px solid #86efac" }}>
            <ShieldCheck className="w-4 h-4" /> {showWarrantyCard ? "Hide Warranty Card" : "Warranty Card"}
          </button>
        )}
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
                <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 3, lineHeight: 1.6 }}>Shop No 4, Hanuman Char Rasta, Gopipura, Surat · +91 9374488004</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", background: "#FAF7F2", marginLeft: "auto" }}>
                  <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <p style={{ fontSize: 8, color: "#8B7E74", marginTop: 4, letterSpacing: "0.06em" }}>Ref: {invoice.invoiceNumber}</p>
              </div>
            </div>

            <div style={S.divider} />

            {/* TITLE */}
            <div style={{ textAlign: "center", margin: "6mm 0 8mm" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", lineHeight: 1.4 }}>
                Tax Invoice
              </p>
              <div style={{ width: 50, height: 2, background: "#8B7E74", margin: "5px auto 0", borderRadius: 1 }} />
              {isPaid && (
                <p style={{ fontSize: 9, color: "#16a34a", marginTop: 6, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>✓ Paid</p>
              )}
            </div>

            {/* SECTION 1: BILL TO */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>1. Bill To</p>
              <div style={S.box}>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Client Name</p>
                    <p style={S.value}>{invoice.customerName || "—"}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Contact Number</p>
                    <p style={S.value}>{invoice.customerPhone || "—"}</p>
                  </div>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Customer ID (Portal Login)</p>
                  <p style={S.value}>{invoice.customerId || "-"}</p>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Address</p>
                  <p style={S.value}>{invoice.customerAddress || "—"}</p>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Invoice Date</p>
                    <p style={S.value}>{formatDateDisplay(invoice.date)}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Payment Mode</p>
                    <p style={S.value}>{invoice.paymentMode || "—"}</p>
                  </div>
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
                      {["#", "Service", "Qty", "Rate", "Amount"].map((h, i) => (
                        <th key={h} style={{ textAlign: i >= 2 ? "right" : i === 0 ? "left" : "left", padding: "4px 6px", fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", color: "#8B7E74", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #E6DFD6" }}>
                        <td style={{ padding: "7px 6px", color: "#8B7E74", fontSize: 10 }}>{i + 1}</td>
                        <td style={{ padding: "7px 6px", color: "#2E2A27", fontWeight: 500 }}>
                          {item.itemName}
                          {item.warranty && <span style={{ fontSize: 9, color: "#8B7E74", marginLeft: 6 }}>· {item.warranty}</span>}
                        </td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#6E6259" }}>{item.quantity}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#6E6259" }}>{item.price ? formatCurrency(item.price) : "—"}</td>
                        <td style={{ padding: "7px 6px", textAlign: "right", color: "#2E2A27", fontWeight: 600 }}>
                          {formatCurrency(item.finalAmount ?? item.total ?? (item.quantity * (item.price || 0)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: PAYMENT SUMMARY */}
            <div style={{ marginBottom: "5mm" }}>
              <p style={S.sectionTitle}>3. Payment Summary</p>
              <div style={S.box}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ minWidth: 200 }}>
                    {[
                      { label: "Subtotal", value: formatCurrency(invoice.subtotal ?? invoice.total) },
                      ...(Number(invoice.discountTotal) > 0 ? [{ label: "Discount", value: `−${formatCurrency(invoice.discountTotal)}` }] : []),
                      { label: "Received", value: formatCurrency(invoice.received) },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, color: "#6E6259" }}>
                        <span>{r.label}</span><span>{r.value}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 3px", fontSize: 14, fontWeight: 700, color: "#2E2A27", borderTop: "1.5px solid #D8CFC4", marginTop: 4 }}>
                      <span>Total</span><span>{formatCurrency(invoice.total)}</span>
                    </div>
                    {Number(invoice.balance) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11, fontWeight: 600, color: "#b45309" }}>
                        <span>Balance Due</span><span>{formatCurrency(invoice.balance)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* TERMS */}
            {invoice.terms && (
              <div style={{ marginBottom: "5mm" }}>
                <p style={S.sectionTitle}>4. Terms & Conditions</p>
                <div style={S.box}>
                  <p style={{ fontSize: 10, color: "#2E2A27", lineHeight: 1.7, whiteSpace: "pre-line" }}>{invoice.terms}</p>
                </div>
              </div>
            )}

            {/* WARRANTY SECTION */}
            {invoice.items?.some(i => i.warranty) && (
              <div style={{ marginBottom: "5mm" }}>
                <p style={S.sectionTitle}>5. Warranty Details</p>
                <div style={{ ...S.box, background: "rgba(22,163,74,0.04)", borderColor: "#bbf7d0" }}>
                  {invoice.items.filter(i => i.warranty).map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "5px 0", borderBottom: i < invoice.items.filter(x => x.warranty).length - 1 ? "1px solid #dcfce7" : "none" }}>
                      <span style={{ fontSize: 13, lineHeight: 1 }}>🛡</span>
                      <div>
                        <p style={{ fontSize: 10.5, fontWeight: 600, color: "#2E2A27", margin: 0 }}>{item.itemName}</p>
                        <p style={{ fontSize: 10, color: "#16a34a", margin: "2px 0 0", fontWeight: 500 }}>{item.warranty}</p>
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 6, fontStyle: "italic" }}>
                    Warranty is valid from the date of treatment as per the terms agreed upon. Structural damage, acts of nature, and reinfestation due to external sources are not covered.
                  </p>
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
              <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.06em" }}>Thank you for your business. This is a computer-generated invoice.</p>
            </div>

          </div>
        </div>
      </div>

      {/* WARRANTY CARD */}
      {showWarrantyCard && warrantyItems.length > 0 && (
        <div className="doc-page" style={{ ...S.page, marginTop: 32, pageBreakBefore: "always" }}>
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
                <p style={{ fontSize: 8.5, color: "#6E6259", marginTop: 3, lineHeight: 1.6 }}>Shop No 4, Hanuman Char Rasta, Gopipura, Surat · +91 9374488004</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", border: "1.5px solid #D8CFC4", overflow: "hidden", background: "#FAF7F2", marginLeft: "auto" }}>
                  <img src="/cropped_circle_image.png" alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            </div>

            <div style={S.divider} />

            {/* TITLE */}
            <div style={{ textAlign: "center", margin: "6mm 0 8mm" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#2E2A27", lineHeight: 1.4 }}>
                Warranty Card
              </p>
              <div style={{ width: 50, height: 2, background: "#16a34a", margin: "5px auto 0", borderRadius: 1 }} />
            </div>

            {/* Customer Info */}
            <div style={{ marginBottom: "6mm" }}>
              <p style={S.sectionTitle}>Customer Details</p>
              <div style={S.box}>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Client Name</p>
                    <p style={S.value}>{invoice.customerName || "—"}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Contact Number</p>
                    <p style={S.value}>{invoice.customerPhone || "—"}</p>
                  </div>
                </div>
                <div style={S.field}>
                  <p style={S.label}>Address</p>
                  <p style={S.value}>{invoice.customerAddress || "—"}</p>
                </div>
                <div style={S.grid2}>
                  <div style={S.field}>
                    <p style={S.label}>Invoice Ref</p>
                    <p style={S.value}>{invoice.invoiceNumber || "—"}</p>
                  </div>
                  <div style={S.field}>
                    <p style={S.label}>Treatment Date</p>
                    <p style={S.value}>{formatDateDisplay(invoice.date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Warranty Items */}
            <div style={{ marginBottom: "6mm" }}>
              <p style={S.sectionTitle}>Services & Warranty</p>
              <div style={{ border: "1px solid #bbf7d0", borderRadius: 6, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "rgba(22,163,74,0.07)", borderBottom: "1px solid #bbf7d0" }}>
                      {["#", "Service", "Warranty Period"].map((h, i) => (
                        <th key={h} style={{ textAlign: i === 2 ? "right" : i === 0 ? "left" : "left", padding: "6px 8px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#16a34a", textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {warrantyItems.map((item, i) => (
                      <tr key={i} style={{ borderBottom: i < warrantyItems.length - 1 ? "1px solid #dcfce7" : "none" }}>
                        <td style={{ padding: "8px", color: "#8B7E74", fontSize: 10 }}>{i + 1}</td>
                        <td style={{ padding: "8px", color: "#2E2A27", fontWeight: 600 }}>{item.itemName}</td>
                        <td style={{ padding: "8px", textAlign: "right", color: "#16a34a", fontWeight: 700, fontSize: 12 }}>{item.warranty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Warranty Terms */}
            <div style={{ marginBottom: "6mm" }}>
              <p style={S.sectionTitle}>Warranty Terms & Conditions</p>
              <div style={{ ...S.box, background: "rgba(22,163,74,0.03)", borderColor: "#bbf7d0" }}>
                {[
                  "Warranty is valid from the date of treatment as mentioned above.",
                  "This warranty covers re-treatment in case of re-infestation of the same pest species.",
                  "Warranty does not cover new construction, structural damage, or damage caused by water seepage.",
                  "Acts of nature, reinfestation due to external sources, and misuse are not covered.",
                  "Any renovation or drilling in treated area will void the warranty.",
                  "For warranty claims, contact AB Pest Control within the warranty period.",
                ].map((term, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 9, color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <p style={{ fontSize: 9.5, color: "#2E2A27", lineHeight: 1.6, margin: 0 }}>{term}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.divider} />

            {/* Footer: signature + validity */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "5mm" }}>
              <div>
                <p style={{ fontSize: 9, color: "#8B7E74", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Warranty Valid From</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#2E2A27" }}>{formatDateDisplay(invoice.date)}</p>
                <p style={{ fontSize: 9, color: "#6E6259", marginTop: 3 }}>As per individual service warranty periods above</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <img src="/sign-removebg-preview.png" alt="Signature" style={{ height: 70, width: 180, objectFit: "contain", objectPosition: "center", display: "block", margin: "0 auto 4px" }} />
                <div style={{ borderBottom: "1.5px solid #8B7E74", marginBottom: 5, width: 160, marginLeft: "auto", marginRight: "auto" }} />
                <p style={{ fontSize: 10, fontWeight: 600, color: "#2E2A27", letterSpacing: "0.04em" }}>Authorized Signatory</p>
                <p style={{ fontSize: 9, color: "#8B7E74", marginTop: 2 }}>AB Pest Control</p>
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: "6mm" }}>
              <p style={{ fontSize: 8, color: "#8B7E74", letterSpacing: "0.06em" }}>
                This warranty card is issued by A.B. Pest Control. Please retain for your records. · +91 9374488004
              </p>
            </div>
          </div>
        </div>
      )}
  </>
  );
}
