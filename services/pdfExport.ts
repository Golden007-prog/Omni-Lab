export async function exportElementToPdf(opts: {
  element: HTMLElement;
  fileName: string;
  /**
   * Slide canvas size in pixels. 1280x720 matches 16:9.
   * Used to keep html2canvas rendering crisp.
   */
  pixelWidth?: number;
}): Promise<void> {
  const { element, fileName, pixelWidth = 1280 } = opts;

  const mod: any = await import("html2pdf.js");
  const html2pdf: any = mod?.default ?? mod;

  // html2pdf uses html2canvas + jsPDF under the hood.
  // We render at a higher scale for sharper text.
  const scale = Math.max(1, Math.min(3, pixelWidth / 640));

  await html2pdf()
    .set({
      margin: 0,
      filename: fileName,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      },
      jsPDF: { unit: "px", format: [1280, 720], orientation: "landscape" },
      pagebreak: { mode: ["css", "legacy"] },
    })
    .from(element)
    .save();
}

