import html2canvas from "./html2canvasLib.js";
import jsPDF from "jspdf";
import { A4_WIDTH_MM, A4_HEIGHT_MM, A4_WIDTH_PX } from "../constants/printDocument.js";

function getPageElements(element) {
  if (!element) return [];
  if (element.matches?.(".doc-page")) return [element];
  const nested = element.querySelectorAll?.(".doc-page");
  if (nested?.length) {
    return Array.from(nested).filter((el) => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }
  return [element];
}

function styleCloneForCapture(clonedPage, widthPx, heightPx) {
  Object.assign(clonedPage.style, {
    width: `${widthPx}px`,
    maxWidth: `${widthPx}px`,
    minHeight: "auto",
    height: `${heightPx}px`,
    margin: "0",
    boxShadow: "none",
    overflow: "visible",
    boxSizing: "border-box",
  });
}

async function captureElement(pageElement) {
  const widthPx = A4_WIDTH_PX;

  const prev = {
    width: pageElement.style.width,
    maxWidth: pageElement.style.maxWidth,
    height: pageElement.style.height,
    overflow: pageElement.style.overflow,
  };

  pageElement.style.width = `${widthPx}px`;
  pageElement.style.maxWidth = `${widthPx}px`;
  pageElement.style.height = "auto";
  pageElement.style.overflow = "visible";

  const heightPx = Math.max(pageElement.scrollHeight, pageElement.offsetHeight);

  const canvas = await html2canvas(pageElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: widthPx,
    height: heightPx,
    windowWidth: widthPx,
    windowHeight: heightPx,
    scrollX: 0,
    scrollY: -window.scrollY,
    onclone: (_doc, clonedElement) => {
      const target = clonedElement.classList?.contains("doc-page")
        ? clonedElement
        : clonedElement.querySelector?.(".doc-page") || clonedElement;
      const h = Math.max(target.scrollHeight, heightPx);
      styleCloneForCapture(target, widthPx, h);
    },
  });

  pageElement.style.width = prev.width;
  pageElement.style.maxWidth = prev.maxWidth;
  pageElement.style.height = prev.height;
  pageElement.style.overflow = prev.overflow;

  return canvas;
}

function appendCanvasToPdf(pdf, canvas, addNewPageFirst) {
  const pageWidthMm = A4_WIDTH_MM;
  const pageHeightMm = A4_HEIGHT_MM;
  const imgWidthPx = canvas.width;
  const imgHeightPx = canvas.height;
  const sliceHeightPx = Math.floor((pageHeightMm / pageWidthMm) * imgWidthPx);

  let yOffset = 0;
  let sliceIndex = 0;

  while (yOffset < imgHeightPx) {
    const currentSlicePx = Math.min(sliceHeightPx, imgHeightPx - yOffset);

    const slice = document.createElement("canvas");
    slice.width = imgWidthPx;
    slice.height = currentSlicePx;
    const ctx = slice.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, imgWidthPx, currentSlicePx);
    ctx.drawImage(canvas, 0, yOffset, imgWidthPx, currentSlicePx, 0, 0, imgWidthPx, currentSlicePx);

    const sliceHeightMm = (currentSlicePx / imgWidthPx) * pageWidthMm;

    if (addNewPageFirst || sliceIndex > 0) {
      pdf.addPage("a4", "portrait");
    }

    pdf.addImage(slice.toDataURL("image/png"), "PNG", 0, 0, pageWidthMm, sliceHeightMm);

    yOffset += currentSlicePx;
    sliceIndex += 1;
  }

  return sliceIndex;
}

export async function generateA4PdfBlob(element) {
  const pageElements = getPageElements(element);
  if (pageElements.length === 0) return null;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let pdfHasContent = false;

  for (const pageEl of pageElements) {
    const canvas = await captureElement(pageEl);
    const slices = appendCanvasToPdf(pdf, canvas, pdfHasContent);
    if (slices > 0) pdfHasContent = true;
  }

  return pdfHasContent ? pdf.output("blob") : null;
}
