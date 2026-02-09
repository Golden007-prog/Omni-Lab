import PptxGenJS from "pptxgenjs";
import saveAs from "file-saver";
import { modernTemplate, PptTemplate, TemplateTextBox } from "../templates/ppt/modernTemplate";
import type { GeneratedSlidesDeck, GeneratedSlide } from "./generateSlides";
import { theme } from "../styles/presentationTheme";

export interface GeneratePresentationOptions {
  fileName?: string;
  template?: PptTemplate;
  /**
   * If true, triggers a browser download using file-saver.
   * If false, returns the Blob only.
   */
  download?: boolean;
}

function addTextBox(
  slide: any,
  text: string,
  box: TemplateTextBox,
  defaults: { fontFace: string }
) {
  slide.addText(text, {
    ...box,
    fontFace: box.fontFace || defaults.fontFace,
  });
}

function toBulletText(bullets: string[]): string {
  // Keep it simple and reliable across PPT viewers.
  return bullets.map((b) => `• ${b}`.trim()).join("\n");
}

function normalizeSlide(slide: GeneratedSlide): GeneratedSlide {
  if (slide.layout === "cover") {
    return {
      layout: "cover",
      title: slide.title?.trim() ?? "",
      subtitle: slide.subtitle?.trim() ?? "",
    };
  }
  if (slide.layout === "section") {
    return {
      layout: "section",
      title: slide.title?.trim() ?? "",
    };
  }
  if (slide.layout === "content") {
    return {
      layout: "content",
      title: slide.title?.trim() ?? "",
      bullets: (slide.bullets ?? []).map((b) => (b ?? "").toString().trim()).filter(Boolean),
    };
  }
  if (slide.layout === "two-column") {
    return {
      layout: "two-column",
      title: slide.title?.trim() ?? "",
      left: (slide.left ?? []).map((b) => (b ?? "").toString().trim()).filter(Boolean),
      right: (slide.right ?? []).map((b) => (b ?? "").toString().trim()).filter(Boolean),
    };
  }
  return {
    layout: "highlight",
    title: slide.title?.trim() ?? "",
    text: slide.text?.trim() ?? "",
  };
}

function addRoundCard(
  pptx: PptxGenJS,
  slide: any,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill: string; line?: string; transparency?: number }
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: opts.fill, transparency: opts.transparency ?? 0 },
    line: { color: opts.line ?? opts.fill, transparency: 85 },
  });
}

/**
 * Template-driven PPTX generator (no PNG slide backgrounds).
 * Gemini JSON → Template → PPTX (Blob) → optional download.
 */
export async function generatePresentation(
  slideDeck: GeneratedSlidesDeck,
  opts: GeneratePresentationOptions = {}
): Promise<Blob> {
  const template = opts.template ?? modernTemplate;
  const fileName = opts.fileName ?? "omni-lab-slides.pptx";
  const shouldDownload = opts.download ?? true;

  const pptx = new PptxGenJS();

  // Custom 16:9 layout matching template inches.
  pptx.defineLayout({
    name: "OMNI_LAB_CUSTOM",
    width: template.slideWidth,
    height: template.slideHeight,
  });
  pptx.layout = "OMNI_LAB_CUSTOM";

  // Basic theme metadata.
  pptx.author = "Omni-Lab Empirical Tutor";
  pptx.company = "Omni-Lab";
  (pptx as any).theme = {
    headFontFace: template.styles.fontFace,
    bodyFontFace: template.styles.fontFace,
    lang: "en-US",
  };

  const slides = slideDeck.slides.map(normalizeSlide);

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.background = { color: template.styles.backgroundColor };

    // Accent bar (editable vector shape).
    s.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.18,
      h: template.slideHeight,
      fill: { color: template.styles.accentColor },
      line: { color: template.styles.accentColor },
    });

    if (slide.layout === "cover") {
      // Decorative blob
      s.addShape(pptx.ShapeType.ellipse, {
        x: 7.2,
        y: -0.6,
        w: 4.0,
        h: 4.0,
        fill: { color: template.styles.accentColor, transparency: 75 },
        line: { color: template.styles.accentColor, transparency: 100 },
      });

      const titleBox = template.layouts.cover.title;
      const subtitleBox = template.layouts.cover.subtitle;
      if (titleBox) addTextBox(s, slide.title, { ...titleBox, color: template.styles.titleColor }, { fontFace: template.styles.fontFace });
      if (subtitleBox) addTextBox(s, slide.subtitle, { ...subtitleBox, color: subtitleBox.color ?? template.styles.bodyColor }, { fontFace: template.styles.fontFace });
      continue;
    }

    if (slide.layout === "section") {
      const titleBox = template.layouts.section.title;
      if (titleBox) addTextBox(s, slide.title, { ...titleBox, color: template.styles.titleColor }, { fontFace: template.styles.fontFace });
      // Accent underline
      s.addShape(pptx.ShapeType.rect, {
        x: 0.9,
        y: 3.55,
        w: 1.1,
        h: 0.08,
        fill: { color: template.styles.accentColor },
        line: { color: template.styles.accentColor },
      });
      continue;
    }

    if (slide.layout === "content") {
      const titleBox = template.layouts.content.title;
      const bodyBox = template.layouts.content.body;

      // Card behind bullets
      addRoundCard(pptx, s, 0.75, 1.35, 8.85, 3.95, {
        fill: "FFFFFF",
        line: "E2E8F0",
        transparency: 0,
      });

      if (titleBox) addTextBox(s, slide.title, { ...titleBox, color: template.styles.titleColor }, { fontFace: template.styles.fontFace });
      if (bodyBox) {
        addTextBox(
          s,
          toBulletText(slide.bullets.slice(0, 6)),
          { ...bodyBox, color: bodyBox.color ?? template.styles.bodyColor, fontSize: Math.max(bodyBox.fontSize, theme.body) },
          { fontFace: template.styles.fontFace }
        );
      }
      continue;
    }

    if (slide.layout === "two-column") {
      const titleBox = template.layouts["two-column"].title;
      const leftBox = template.layouts["two-column"].left;
      const rightBox = template.layouts["two-column"].right;

      addRoundCard(pptx, s, 0.75, 1.35, 4.25, 3.95, { fill: "FFFFFF", line: "E2E8F0" });
      addRoundCard(pptx, s, 5.0, 1.35, 4.55, 3.95, { fill: "FFFFFF", line: "E2E8F0" });

      if (titleBox) addTextBox(s, slide.title, { ...titleBox, color: template.styles.titleColor }, { fontFace: template.styles.fontFace });
      if (leftBox) addTextBox(s, toBulletText(slide.left.slice(0, 6)), { ...leftBox, color: template.styles.bodyColor }, { fontFace: template.styles.fontFace });
      if (rightBox) addTextBox(s, toBulletText(slide.right.slice(0, 6)), { ...rightBox, color: template.styles.bodyColor }, { fontFace: template.styles.fontFace });
      continue;
    }

    if (slide.layout === "highlight") {
      const titleBox = template.layouts.highlight.title;
      const bodyBox = template.layouts.highlight.body;

      addRoundCard(pptx, s, 0.9, 1.55, 8.8, 3.2, { fill: "FFFFFF", line: "E2E8F0" });
      // Accent line
      s.addShape(pptx.ShapeType.rect, {
        x: 1.1,
        y: 1.8,
        w: 0.07,
        h: 2.7,
        fill: { color: template.styles.accentColor },
        line: { color: template.styles.accentColor },
      });

      if (titleBox) addTextBox(s, slide.title, { ...titleBox, color: titleBox.color ?? template.styles.accentColor }, { fontFace: template.styles.fontFace });
      if (bodyBox) addTextBox(s, `“${slide.text}”`, { ...bodyBox, color: template.styles.titleColor }, { fontFace: template.styles.fontFace });
      continue;
    }
  }

  const blob = (await pptx.write({ outputType: "blob" })) as Blob;

  if (shouldDownload) {
    saveAs(blob, fileName);
  }

  return blob;
}

