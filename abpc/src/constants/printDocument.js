/** A4 at 96 DPI — matches browser mm rendering */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_WIDTH_PX = 794;

/** Shared inline styles for admin print documents (invoice, quotation, AMC) */
export function getDocPageStyles() {
  return {
    page: {
      width: "100%",
      maxWidth: `${A4_WIDTH_MM}mm`,
      minHeight: "auto",
      height: "auto",
      background: "#ffffff",
      margin: "0 auto",
      padding: "12mm 14mm",
      boxSizing: "border-box",
      fontFamily: "'Inter', sans-serif",
      color: "#2E2A27",
      position: "relative",
      boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
      overflow: "visible",
    },
    outerBorder: {
      position: "absolute",
      inset: "7mm",
      border: "1.5px solid #D8CFC4",
      pointerEvents: "none",
    },
    innerBorder: {
      position: "absolute",
      inset: "10mm",
      border: "0.5px solid #D8CFC4",
      pointerEvents: "none",
    },
    watermark: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%,-50%)",
      opacity: 0.04,
      pointerEvents: "none",
      zIndex: 0,
    },
    content: { position: "relative", zIndex: 1 },
    divider: { borderTop: "1px solid #D8CFC4", margin: "4mm 0" },
    sectionTitle: {
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#8B7E74",
      marginBottom: 6,
    },
    label: {
      fontSize: 9,
      color: "#8B7E74",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      marginBottom: 2,
    },
    value: { fontSize: 12, fontWeight: 500, color: "#2E2A27", lineHeight: 1.45 },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "3mm",
      marginBottom: "3mm",
    },
    field: { marginBottom: "2.5mm" },
    box: {
      border: "1px solid #E6DFD6",
      borderRadius: 4,
      padding: "3.5mm",
      background: "rgba(0,0,0,0.02)",
    },
  };
}

export const PRINT_DOCUMENT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 0; }
    html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
    .no-print { display: none !important; }
    .print-container {
      padding: 0 !important;
      margin: 0 !important;
      background: #fff !important;
      min-height: 0 !important;
    }
    .doc-page {
      width: ${A4_WIDTH_MM}mm !important;
      max-width: ${A4_WIDTH_MM}mm !important;
      min-height: ${A4_HEIGHT_MM}mm !important;
      height: auto !important;
      margin: 0 auto !important;
      padding: 12mm 14mm !important;
      box-shadow: none !important;
      overflow: visible !important;
      page-break-after: always;
      break-after: page;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .doc-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`;
