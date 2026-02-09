import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileText, X } from "lucide-react";
import type { GeneratedSlidesDeck, GeneratedSlide } from "../services/generateSlides";
import { theme } from "../styles/presentationTheme";

export interface SlidePreviewProps {
  deck: GeneratedSlidesDeck;
  fileNameBase?: string;
  onClose?: () => void;
  onExportPptx?: () => Promise<void> | void;
  onExportPdf?: (elementForPdf: HTMLElement) => Promise<void> | void;
}

function SlideShell({
  children,
  background,
}: {
  children: React.ReactNode;
  background: string;
}) {
  return (
    <div
      className="relative w-full h-full rounded-[28px] overflow-hidden border shadow-2xl"
      style={{
        borderColor: theme.border,
        background,
      }}
    >
      {/* subtle noise-ish overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(1200px 600px at 10% 0%, rgba(124,58,237,0.25), transparent 55%), radial-gradient(900px 500px at 90% 100%, rgba(37,99,235,0.18), transparent 60%)",
          opacity: 0.9,
        }}
      />
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

function TitleKicker({ text }: { text: string }) {
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono tracking-wide border"
      style={{ borderColor: theme.border, color: theme.textMuted, background: theme.surface }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: theme.accent }}
      />
      {text}
    </div>
  );
}

function CoverSlideView({ slide }: { slide: Extract<GeneratedSlide, { layout: "cover" }> }) {
  return (
    <SlideShell background={theme.accentGradient}>
      <div className="h-full w-full flex items-center justify-center p-14">
        <div className="max-w-3xl text-center">
          <TitleKicker text="OMNI-LAB • AI DECK" />
          <h1 className="mt-6 text-6xl font-semibold tracking-tight leading-[1.02] text-white drop-shadow">
            {slide.title}
          </h1>
          <p className="mt-5 text-lg text-white/80 leading-relaxed">{slide.subtitle}</p>
        </div>
      </div>
    </SlideShell>
  );
}

function SectionSlideView({ slide }: { slide: Extract<GeneratedSlide, { layout: "section" }> }) {
  return (
    <SlideShell background={theme.background}>
      <div className="h-full w-full p-14 flex items-center">
        <div className="max-w-3xl">
          <TitleKicker text="SECTION" />
          <h2 className="mt-8 text-6xl font-semibold tracking-tight leading-[1.02]" style={{ color: theme.text }}>
            {slide.title}
          </h2>
          <div className="mt-10 h-1 w-24 rounded-full" style={{ background: theme.accentGradient }} />
        </div>
      </div>
    </SlideShell>
  );
}

function ContentSlideView({ slide }: { slide: Extract<GeneratedSlide, { layout: "content" }> }) {
  return (
    <SlideShell background={theme.background}>
      <div className="h-full w-full p-14 flex">
        <div className={slide.image ? "w-1/2" : "w-full"}>
          <TitleKicker text="KEY IDEAS" />
          <h2 className="mt-6 text-5xl font-semibold tracking-tight" style={{ color: theme.text }}>
            {slide.title}
          </h2>

          <div
            className="mt-10 p-10 rounded-3xl border"
            style={{ background: theme.surfaceStrong, borderColor: theme.border }}
          >
            <ul className="space-y-5">
              {slide.bullets.map((b, idx) => (
                <li key={idx} className="flex items-start gap-4">
                  <span
                    className="mt-2 w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: theme.accent }}
                  />
                  <span className="text-2xl leading-snug" style={{ color: theme.text }}>
                    {b}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {slide.image && (
          <div className="w-1/2 pl-8 flex items-center justify-center">
            <img
              src={slide.image}
              alt="Research illustration"
              className="max-h-[400px] max-w-full rounded-2xl object-contain shadow-lg"
            />
          </div>
        )}
      </div>
    </SlideShell>
  );
}

function TwoColumnSlideView({
  slide,
}: {
  slide: Extract<GeneratedSlide, { layout: "two-column" }>;
}) {
  return (
    <SlideShell background={theme.background}>
      <div className="h-full w-full p-14">
        <TitleKicker text="COMPARISON" />
        <h2 className="mt-6 text-5xl font-semibold tracking-tight" style={{ color: theme.text }}>
          {slide.title}
        </h2>

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl border" style={{ background: theme.surfaceStrong, borderColor: theme.border }}>
            <div className="text-xs font-mono tracking-wider uppercase" style={{ color: theme.textMuted }}>
              Left
            </div>
            <ul className="mt-5 space-y-4">
              {slide.left.map((b, idx) => (
                <li key={idx} className="text-xl leading-snug" style={{ color: theme.text }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-3xl border" style={{ background: theme.surfaceStrong, borderColor: theme.border }}>
            <div className="text-xs font-mono tracking-wider uppercase" style={{ color: theme.textMuted }}>
              Right
            </div>
            <ul className="mt-5 space-y-4">
              {slide.right.map((b, idx) => (
                <li key={idx} className="text-xl leading-snug" style={{ color: theme.text }}>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

function HighlightSlideView({
  slide,
}: {
  slide: Extract<GeneratedSlide, { layout: "highlight" }>;
}) {
  return (
    <SlideShell background={theme.background}>
      <div className="h-full w-full p-14 flex items-center justify-center">
        <div className="max-w-3xl text-center">
          <TitleKicker text={slide.title.toUpperCase()} />
          <div
            className="mt-10 p-12 rounded-[32px] border"
            style={{ background: theme.surfaceStrong, borderColor: theme.border }}
          >
            <div className="text-4xl font-semibold tracking-tight leading-tight" style={{ color: theme.text }}>
              “{slide.text}”
            </div>
            <div className="mt-8 mx-auto h-1 w-24 rounded-full" style={{ background: theme.accentGradient }} />
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

function renderSlide(slide: GeneratedSlide) {
  switch (slide.layout) {
    case "cover":
      return <CoverSlideView slide={slide} />;
    case "section":
      return <SectionSlideView slide={slide} />;
    case "content":
      return <ContentSlideView slide={slide} />;
    case "two-column":
      return <TwoColumnSlideView slide={slide} />;
    case "highlight":
      return <HighlightSlideView slide={slide} />;
  }
}

export default function SlidePreview({
  deck,
  fileNameBase,
  onClose,
  onExportPptx,
  onExportPdf,
}: SlidePreviewProps) {
  const slides = deck.slides ?? [];
  const [index, setIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);

  const canPrev = index > 0;
  const canNext = index < slides.length - 1;

  const title = useMemo(() => {
    const first = slides[0];
    if (first && first.layout === "cover") return first.title;
    return fileNameBase || "Presentation";
  }, [slides, fileNameBase]);

  const scrollTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIndex));
    setIndex(clamped);
    const el = viewportRef.current?.querySelector<HTMLElement>(`[data-slide-idx="${clamped}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const i = Math.round(el.scrollLeft / w);
        setIndex(Math.max(0, Math.min(slides.length - 1, i)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll as any);
    };
  }, [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") scrollTo(index - 1);
      if (e.key === "ArrowRight") scrollTo(index + 1);
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose]);

  if (!slides.length) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 text-slate-200">
        No slides to preview.
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-mono text-slate-500">PRESENTATION PREVIEW</div>
          <div className="truncate text-sm font-semibold text-white">{title}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onExportPptx?.()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border bg-slate-900 hover:bg-slate-800 transition-colors"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            <Download className="w-4 h-4" />
            Export PPT
          </button>
          <button
            onClick={() => {
              if (onExportPdf && pdfRef.current) onExportPdf(pdfRef.current);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border bg-slate-900 hover:bg-slate-800 transition-colors"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border bg-slate-900 hover:bg-slate-800 transition-colors"
            style={{ borderColor: theme.border, color: theme.textMuted }}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={viewportRef}
          className="absolute inset-0 overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory scroll-smooth"
          style={{ background: theme.background }}
        >
          {slides.map((s, i) => (
            <div
              key={i}
              data-slide-idx={i}
              className="snap-center shrink-0 w-full h-full p-6 md:p-10"
            >
              {renderSlide(s)}
            </div>
          ))}
        </div>

        {/* Nav controls */}
        <div className="absolute left-4 right-4 bottom-4 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => scrollTo(index - 1)}
              disabled={!canPrev}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border bg-slate-900/80 hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              onClick={() => scrollTo(index + 1)}
              disabled={!canNext}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border bg-slate-900/80 hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div
            className="pointer-events-auto px-3 py-2 rounded-xl text-xs font-mono border bg-slate-900/80 backdrop-blur"
            style={{ borderColor: theme.border, color: theme.textMuted }}
          >
            {index + 1} / {slides.length}
          </div>
        </div>
      </div>

      {/* Offscreen PDF render target (same slides, stacked) */}
      <div className="fixed -left-[99999px] top-0 w-[1280px]">
        <div ref={pdfRef} className="bg-white text-black">
          {slides.map((s, i) => (
            <div key={i} className="w-[1280px] h-[720px] p-10" style={{ pageBreakAfter: "always" as any }}>
              {/* White-background version for PDF for readability */}
              <div className="w-full h-full rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <div className="w-full h-full p-12">
                  <div className="text-[10px] font-mono text-slate-500">SLIDE {i + 1}</div>
                  <div className="mt-4 text-4xl font-semibold text-slate-900">
                    {"title" in s ? (s as any).title : "Slide"}
                  </div>
                  <div className="mt-8 text-xl text-slate-700 leading-relaxed">
                    {s.layout === "cover" && (
                      <div>
                        <div className="text-5xl font-semibold">{s.title}</div>
                        <div className="mt-3 text-2xl text-slate-600">{s.subtitle}</div>
                      </div>
                    )}
                    {s.layout === "section" && <div className="text-5xl font-semibold">{s.title}</div>}
                    {s.layout === "content" && (
                      <ul className="list-disc pl-6 space-y-2">
                        {s.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {s.layout === "two-column" && (
                      <div className="grid grid-cols-2 gap-8">
                        <ul className="list-disc pl-6 space-y-2">
                          {s.left.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                        <ul className="list-disc pl-6 space-y-2">
                          {s.right.map((b, idx) => (
                            <li key={idx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {s.layout === "highlight" && <div className="text-4xl font-semibold">“{s.text}”</div>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

