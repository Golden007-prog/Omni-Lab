export type SlideLayoutKey =
  | "cover"
  | "section"
  | "content"
  | "two-column"
  | "highlight";

export type TextBoxKey = "title" | "subtitle" | "body" | "left" | "right";

/**
 * Minimal subset of PptxGenJS text box options we use.
 * Units are in inches for x/y/w/h.
 */
export interface TemplateTextBox {
  x: number;
  y: number;
  w?: number;
  h?: number;
  fontSize: number;
  bold?: boolean;
  color?: string;
  fontFace?: string;
  align?: "left" | "center" | "right";
  valign?: "top" | "mid" | "bottom";
  lineSpacingMultiple?: number;
}

export interface PptTemplate {
  slideWidth: number;
  slideHeight: number;
  styles: {
    fontFace: string;
    titleColor: string;
    bodyColor: string;
    accentColor: string;
    backgroundColor: string;
  };
  layouts: Record<
    SlideLayoutKey,
    Partial<Record<TextBoxKey, TemplateTextBox>>
  >;
}

/**
 * "Modern" editable template (no PNG backgrounds).
 * Coordinates assume 16:9 widescreen with 10 x 5.625 inches.
 */
export const modernTemplate: PptTemplate = {
  slideWidth: 10,
  slideHeight: 5.625,
  styles: {
    fontFace: "Aptos",
    titleColor: "111827", // slate-900
    bodyColor: "111827",
    accentColor: "7C3AED", // violet-600
    backgroundColor: "F8FAFC", // slate-50
  },
  layouts: {
    cover: {
      title: {
        x: 0.8,
        y: 2.0,
        w: 8.4,
        h: 1.4,
        fontSize: 46,
        bold: true,
        color: "111827",
        align: "center",
        valign: "mid",
        fontFace: "Aptos Display",
      },
      subtitle: {
        x: 1.2,
        y: 3.35,
        w: 7.6,
        h: 0.8,
        fontSize: 20,
        color: "334155", // slate-700
        align: "center",
        valign: "top",
      },
    },
    section: {
      title: {
        x: 0.9,
        y: 2.2,
        w: 8.2,
        h: 1.3,
        fontSize: 44,
        bold: true,
        color: "111827",
        align: "left",
        valign: "mid",
      },
    },
    content: {
      title: {
        x: 0.7,
        y: 0.55,
        w: 8.6,
        h: 0.8,
        fontSize: 30,
        bold: true,
        color: "111827",
        align: "left",
        valign: "mid",
      },
      body: {
        x: 0.85,
        y: 1.55,
        w: 8.3,
        h: 3.6,
        fontSize: 18,
        color: "111827",
        align: "left",
        valign: "top",
        lineSpacingMultiple: 1.1,
      },
    },
    "two-column": {
      title: {
        x: 0.7,
        y: 0.55,
        w: 8.6,
        h: 0.8,
        fontSize: 30,
        bold: true,
        color: "111827",
        align: "left",
        valign: "mid",
      },
      left: {
        x: 0.85,
        y: 1.55,
        w: 4.0,
        h: 3.6,
        fontSize: 18,
        color: "111827",
        align: "left",
        valign: "top",
        lineSpacingMultiple: 1.1,
      },
      right: {
        x: 5.05,
        y: 1.55,
        w: 4.0,
        h: 3.6,
        fontSize: 18,
        color: "111827",
        align: "left",
        valign: "top",
        lineSpacingMultiple: 1.1,
      },
    },
    highlight: {
      title: {
        x: 0.9,
        y: 1.15,
        w: 8.2,
        h: 0.6,
        fontSize: 18,
        bold: true,
        color: "7C3AED",
        align: "center",
        valign: "mid",
      },
      body: {
        x: 1.0,
        y: 2.0,
        w: 8.0,
        h: 2.6,
        fontSize: 36,
        bold: true,
        color: "111827",
        align: "center",
        valign: "mid",
        lineSpacingMultiple: 1.05,
      },
    },
  },
};

