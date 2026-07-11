/**
 * Vite dev can resolve the UMD html2canvas build (no default export).
 * Always import the ESM build through this module.
 */
import html2canvas from "html2canvas/dist/html2canvas.esm.js";

export default html2canvas;
