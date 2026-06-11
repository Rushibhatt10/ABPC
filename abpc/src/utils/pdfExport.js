import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

export async function generateA4PdfBlob(element) {
  if (!element) return null;

  const pageElements = element.matches?.(".doc-page")
    ? [element]
    : Array.from(element.querySelectorAll(".doc-page"));

  if (pageElements.length === 0) return null;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  for (let pageIndex = 0; pageIndex < pageElements.length; pageIndex += 1) {
    const pageElement = pageElements[pageIndex];
    const canvas = await html2canvas(pageElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
      windowWidth: A4_WIDTH_PX,
      windowHeight: A4_HEIGHT_PX,
      onclone: (clonedDocument) => {
        const clonedPage = clonedDocument.querySelector(".doc-page");
        if (!clonedPage) return;
        Object.assign(clonedPage.style, {
          width: `${A4_WIDTH_PX}px`,
          maxWidth: `${A4_WIDTH_PX}px`,
          minHeight: `${A4_HEIGHT_PX}px`,
          margin: "0",
          boxShadow: "none",
        });
      },
    });

    const imageHeightMm = A4_WIDTH_MM * canvas.height / canvas.width;

    if (pageIndex > 0) pdf.addPage("a4", "portrait");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, A4_WIDTH_MM, imageHeightMm);
  }

  return pdf.output("blob");
}
