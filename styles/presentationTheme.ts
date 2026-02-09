export const theme = {
  // Typography (roughly maps to both preview CSS + PPTX point sizes)
  title: 42,
  subtitle: 20,
  body: 18,
  small: 14,

  // Spacing
  slidePadding: 64,
  cardPadding: 32,
  radius: 24,

  // Colors
  background: "#070A12",
  surface: "rgba(255,255,255,0.06)",
  surfaceStrong: "rgba(255,255,255,0.10)",
  text: "#F8FAFC",
  textMuted: "rgba(248,250,252,0.72)",
  border: "rgba(148,163,184,0.18)",
  accent: "#7c3aed",
  accent2: "#2563eb",

  // Gradients
  accentGradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 55%, #06b6d4 100%)",
} as const;

export function clampLines(items: string[], max: number) {
  return items.slice(0, Math.max(0, max));
}

export function shortenWords(input: string, maxWords: number) {
  const s = (input ?? "").toString().trim();
  if (!s) return "";
  const words = s.split(/\s+/g);
  if (words.length <= maxWords) return s;
  return words.slice(0, maxWords).join(" ").trim() + "…";
}

