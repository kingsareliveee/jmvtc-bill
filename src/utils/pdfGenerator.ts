// PDF Generation and Print Utilities
import html2pdf from 'html2pdf.js';

/**
 * Downloads the specified invoice DOM element as an A4 PDF.
 * @param elementId The HTML element ID containing the A4 layout.
 * @param filename The output PDF filename.
 */
export function downloadBillPDF(elementId: string, filename: string): void {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  // Configuration options for high quality rendering
  const opt = {
    margin:       [0.15, 0.15, 0.15, 0.15], // Small tight margin to ensure everything fits on 1 page
    filename:     filename,
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  // Run html2pdf
  html2pdf().set(opt as any).from(element).save();
}

/**
 * Prints the invoice utilizing the browser print dialogue.
 * Works hand-in-hand with CSS print styles in index.css.
 */
export function printBill(): void {
  window.print();
}

/**
 * Generates and returns the invoice PDF as a Blob.
 * @param elementId The HTML element ID containing the A4 layout.
 */
export async function generateBillPDFBlob(elementId: string): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  const opt = {
    margin:       [0.15, 0.15, 0.15, 0.15],
    image:        { type: 'jpeg', quality: 1.0 },
    html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  return await (html2pdf() as any).set(opt).from(element).outputPdf('blob');
}

