import { GoogleGenerativeAI, Part, GenerativeModel } from "@google/generative-ai";
import { getApiKey, MODELS } from "./geminiConfig";
import {
  isWithinInlineLimit,
  processFileForInlineData,
  uploadFileToGemini,
} from "../utils/fileHelpers";
import { clampLines, shortenWords } from "../styles/presentationTheme";
import { getResearchImage, getSlideContext } from "./researchImageService";

// =============================================================================
// Types
// =============================================================================

export type SlideLayout = "cover" | "section" | "content" | "two-column" | "highlight";

export interface BaseSlide {
  title: string;
  image?: string;
  visualDescription?: string;
}

export interface CoverSlide extends BaseSlide {
  layout: "cover";
  subtitle: string;
}

export interface SectionSlide extends BaseSlide {
  layout: "section";
}

export interface ContentSlide extends BaseSlide {
  layout: "content";
  bullets: string[];
}

export interface TwoColumnSlide extends BaseSlide {
  layout: "two-column";
  left: string[];
  right: string[];
}

export interface HighlightSlide extends BaseSlide {
  layout: "highlight";
  text: string;
}

export type GeneratedSlide = CoverSlide | SectionSlide | ContentSlide | TwoColumnSlide | HighlightSlide;

export interface GeneratedSlidesDeck {
  slides: GeneratedSlide[];
}

interface SlideBlueprint {
  layout: SlideLayout;
  title: string;
  purpose: string;
}

// =============================================================================
// Helpers
// =============================================================================

function extractLikelyJsonObject(text: string): string {
  const trimmed = text.trim();
  // Fast path: already JSON
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;

  // Strip fenced code blocks if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Fallback: take from first "{"/"[" to last "}"/"]"
  const startObj = trimmed.indexOf("{");
  const startArr = trimmed.indexOf("[");
  
  // Determine if we are looking for an array or object
  const start = (startArr > -1 && (startObj === -1 || startArr < startObj)) ? startArr : startObj;
  
  if (start > -1) {
    const endChar = trimmed[start] === "[" ? "]" : "}";
    const end = trimmed.lastIndexOf(endChar);
    if (end > start) return trimmed.slice(start, end + 1).trim();
  }

  return trimmed;
}

function normalizeSlide(slide: any): GeneratedSlide {
  const layout = (slide.layout || "content") as SlideLayout;
  const title = shortenWords(slide.title || "Untitled", 10);
  const image = slide.image;
  // Capture visual description if provided by the model
  const visualDescription = slide.visual_description || slide.visualDescription;

  if (layout === "cover") {
    return { 
      layout: "cover", 
      title, 
      subtitle: shortenWords(slide.subtitle || "", 20),
      image,
      visualDescription
    };
  }
  if (layout === "section") {
    return {
      layout: "section",
      title,
      image,
      visualDescription
    };
  }
  if (layout === "content") {
    return {
      layout: "content",
      title,
      bullets: clampLines((slide.bullets || []).map((b: string) => shortenWords(b, 15)), 6),
      image,
      visualDescription
    };
  }
  if (layout === "two-column") {
    return {
      layout: "two-column",
      title,
      left: clampLines((slide.left || []).map((b: string) => shortenWords(b, 12)), 6),
      right: clampLines((slide.right || []).map((b: string) => shortenWords(b, 12)), 6),
      image,
      visualDescription
    };
  }
  if (layout === "highlight") {
    return { 
      layout: "highlight", 
      title, 
      text: shortenWords(slide.text || "", 25),
      image,
      visualDescription
    };
  }
  
  // Fallback
  return { 
    layout: "content", 
    title, 
    bullets: ["Content placeholder"],
    image,
    visualDescription
  };
}

// =============================================================================
// Step 1: Outline Generation
// =============================================================================

async function generateOutline(
  model: GenerativeModel, 
  contextParts: Part[], 
  count: number,
  titleHint?: string
): Promise<SlideBlueprint[]> {
  const prompt = `
You are the Presentation Architect.
Analyze the provided document and create a strategic slide outline.

Goal: Create a ${count}-slide presentation structure.
${titleHint ? `Focus Topic: ${titleHint}` : ""}

Instructions:
- **Figures & Diagrams**: If the source text mentions specific Figures (e.g. "Figure 1"), create a slide specifically to explain that diagram.
- **Visuals**: Plan for slides that utilize diagrams to explain complex concepts.

Return a JSON ARRAY of objects. Each object must have:
- "layout": One of ["cover", "section", "content", "two-column", "highlight"]
- "title": Short, engaging title (max 6 words)
- "purpose": A brief instruction of what this slide should cover (1 sentence)

Rules:
1. First slide MUST be "cover".
2. Include at least one "section" break.
3. Last slide should be "highlight" (conclusion/impact).
4. Use "two-column" for comparisons or pros/cons.
5. JSON ONLY. No markdown.

Example Output:
[
  { "layout": "cover", "title": "Project Alpha", "purpose": "Title and subtitle" },
  { "layout": "content", "title": "Figure 1 Analysis", "purpose": "Explain the architecture diagram shown in Figure 1" }
]
`;

  const result = await model.generateContent([...contextParts, { text: prompt }]);
  const text = result.response.text();
  
  try {
    const raw = JSON.parse(extractLikelyJsonObject(text));
    if (Array.isArray(raw)) return raw as SlideBlueprint[];
    if (raw.slides && Array.isArray(raw.slides)) return raw.slides as SlideBlueprint[];
    throw new Error("Invalid outline format");
  } catch (e) {
    console.error("Outline parse error:", text);
    // Fallback outline if AI fails
    return [
      { layout: "cover", title: titleHint || "Presentation", purpose: "Title slide" },
      { layout: "content", title: "Overview", purpose: "Key concepts" },
      { layout: "highlight", title: "Key Takeaway", purpose: "Conclusion" }
    ];
  }
}

// =============================================================================
// Step 2: Single Slide Generation
// =============================================================================

async function generateSingleSlide(
  model: GenerativeModel, 
  contextParts: Part[], 
  blueprint: SlideBlueprint
): Promise<GeneratedSlide> {
  const prompt = `
You are the Slide Designer. Generate content for ONE slide.

Context:
- Title: "${blueprint.title}"
- Layout: "${blueprint.layout}"
- Goal: ${blueprint.purpose}

Instructions:
- **Visuals**: You must provide a 'visual_description' field. This will be sent to an AI Image Generator.
- **Figures**: If this slide explains a Figure from the text, describe that figure in detail in 'visual_description' so it can be recreated.
- **Diagrams**: If explaining a process, request a diagram in 'visual_description'.

Return valid JSON for this layout type:

${blueprint.layout === "cover" ? '{ "layout": "cover", "title": "...", "subtitle": "...", "visual_description": "..." }' : ""}
${blueprint.layout === "section" ? '{ "layout": "section", "title": "...", "visual_description": "..." }' : ""}
${blueprint.layout === "content" ? '{ "layout": "content", "title": "...", "bullets": ["...", "..."], "visual_description": "..." }' : ""}
${blueprint.layout === "two-column" ? '{ "layout": "two-column", "title": "...", "left": ["..."], "right": ["..."], "visual_description": "..." }' : ""}
${blueprint.layout === "highlight" ? '{ "layout": "highlight", "title": "...", "text": "...", "visual_description": "..." }' : ""}

Content Rules:
- Bullets: Max 5 items, max 10 words each.
- Tone: Professional, concise, impactful.
- Visual Description: Detailed prompt for image generation (e.g. "A flow chart showing the water cycle with labels").
- JSON ONLY.
`;

  try {
    // Generate content using the full context to ensure accuracy
    const result = await model.generateContent([...contextParts, { text: prompt }]);
    const text = result.response.text();
    const raw = JSON.parse(extractLikelyJsonObject(text));
    return normalizeSlide({ ...raw, layout: blueprint.layout });
  } catch (e) {
    console.warn(`Failed to generate slide "${blueprint.title}", using fallback.`);
    return normalizeSlide({ 
      layout: blueprint.layout, 
      title: blueprint.title, 
      bullets: ["Content generation failed", "Please edit manually"] 
    });
  }
}

// =============================================================================
// Main Export
// =============================================================================

export interface GenerateSlidesParams {
  file?: File;
  text?: string;
  titleHint?: string;
  slideCount?: number;
}

export async function generateSlides({
  file,
  text,
  titleHint,
  slideCount = 8,
}: GenerateSlidesParams): Promise<GeneratedSlidesDeck> {
  if (!file && !text) {
    throw new Error("generateSlides requires at least one of: file, text");
  }

  const apiKey = getApiKey();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ 
    model: MODELS.VISUALIZER,
    generationConfig: { responseMimeType: "application/json" }
  });

  // 1. Prepare Context Parts
  const parts: Part[] = [];
  
  if (file) {
    if (isWithinInlineLimit(file.size)) {
      const processed = await processFileForInlineData(file);
      if (!processed.success || !processed.data) throw new Error(processed.error);
      parts.push(processed.data.inlinePart);
    } else {
      const uploaded = await uploadFileToGemini(file, apiKey);
      parts.push({
        fileData: { fileUri: uploaded.uri, mimeType: uploaded.mimeType },
      });
    }
  }

  if (text?.trim()) {
    parts.push({ text: `Context:\n${text.trim()}` });
  }

  console.log("[Slides] 1. Generating Outline...");
  
  // 2. Generate Outline
  const outline = await generateOutline(model, parts, slideCount, titleHint);
  console.log(`[Slides] Outline generated: ${outline.length} slides`);

  // 3. Generate Slides (Batched)
  // We process in batches of 3 to allow some speed but prevent rate limits
  const BATCH_SIZE = 3;
  const slides: GeneratedSlide[] = [];

  for (let i = 0; i < outline.length; i += BATCH_SIZE) {
    const batch = outline.slice(i, i + BATCH_SIZE);
    console.log(`[Slides] Generating batch ${i / BATCH_SIZE + 1}...`);
    
    // Run batch in parallel
    const batchResults = await Promise.all(
      batch.map(bp => generateSingleSlide(model, parts, bp))
    );
    
    slides.push(...batchResults);
    
    // Brief pause to be nice to the API (optional, effectively handled by await overhead)
    if (i + BATCH_SIZE < outline.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  // 4. Post-process: Add Research Images
  console.log("[Slides] Generating images with Nano Banana...");
  const finalSlides = await Promise.all(slides.map(async (slide) => {
    // Only generate images for non-text-heavy layouts or if specifically requested
    if (slide.layout === "section") return slide; // Sections usually simple
    
    try {
      // Prioritize the model's visual description
      const prompt = slide.visualDescription || slide.title;
      // If we have a specific visual description, we don't need extra context as much
      const context = slide.visualDescription ? undefined : getSlideContext(slide);
      
      const imageUrl = await getResearchImage(prompt, context);
      
      if (imageUrl) {
        return { ...slide, image: imageUrl };
      }
    } catch (e) {
      console.warn("Image generation failed for slide", slide.title, e);
    }
    return slide;
  }));

  return { slides: finalSlides };
}
