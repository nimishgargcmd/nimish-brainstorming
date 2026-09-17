import { useState } from "react";
import { DEMO_SLIDES, type ChartData, type TableData, type LadderItem, type CardItem, type Slide } from "@/app/components/DemoSlideDeck";

/**
 * Liquid Mode-style "easy read" prototype (brainstorming/screensharing idea 2).
 *
 * Opt-in, portrait-native reflow of shared content: text reflows/wraps at a
 * legible size; charts/images scale-to-width instead of reflowing internally;
 * tables freeze the leftmost column and horizontal-scroll the rest; code wraps.
 * The live-follow badge simulates auto-advancing with the presenter. "View
 * original" is the always-available escape hatch — it exits back to the
 * meeting stage's own faithful rendering (`DemoSlideDeck.tsx`) rather than a
 * fabricated mimic.
 *
 * Slide data (`DEMO_SLIDES`) is shared with `DemoSlideDeck.tsx` so the stage's
 * "original" view and this easy-read view never drift out of sync.
 */

function BackChevronIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <path d="M11.5 3.5L6 9l5.5 5.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  const d = direction === "left" ? "M9.5 3.5L4 9l5.5 5.5" : "M4.5 3.5L10 9l-5.5 5.5";
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d={d} stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 18 18" fill="none">
      <path
        d="M2 3C2 2.44772 2.44772 2 3 2H5C5.55228 2 6 1.55228 6 1C6 0.447715 5.55228 0 5 0H3C1.34315 0 0 1.34315 0 3V5C0 5.55228 0.447715 6 1 6C1.55228 6 2 5.55228 2 5V3ZM2 15C2 15.5523 2.44772 16 3 16H5C5.55228 16 6 16.4477 6 17C6 17.5523 5.55228 18 5 18H3C1.34315 18 0 16.6569 0 15V13C0 12.4477 0.447715 12 1 12C1.55228 12 2 12.4477 2 13V15ZM15 2C15.5523 2 16 2.44772 16 3V5C16 5.55228 16.4477 6 17 6C17.5523 6 18 5.55228 18 5V3C18 1.34315 16.6569 0 15 0H13C12.4477 0 12 0.447715 12 1C12 1.55228 12.4477 2 13 2H15ZM16 15C16 15.5523 15.5523 16 15 16H13C12.4477 16 12 16.4477 12 17C12 17.5523 12.4477 18 13 18H15C16.6569 18 18 16.6569 18 15V13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13V15Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Full-width bar chart card \u2014 the quick-glance numbers, followed by the trend-line graphic
 *  (the one part of the slide that's a real image, not text, so it can't be reflowed). */
function ReflowChart({ chart, graphicImage, title, onExpand }: { chart: ChartData; graphicImage: string; title: string; onExpand: () => void }) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full text-left rounded-[12px] border border-[#e1e1e1] bg-[#f8f8f8] p-[14px] flex flex-col gap-[12px]"
    >
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[#212121] text-[14px] font-semibold leading-[18px]">{chart.title}</span>
        <span className="shrink-0 text-[#5b5fc7]"><ExpandIcon /></span>
      </div>
      <div className="flex flex-col gap-[10px]">
        {chart.bars.map((bar) => (
          <div key={bar.label} className="flex flex-col gap-[4px]">
            <div className="flex items-center justify-between text-[12px] text-[#616161]">
              <span>{bar.label}</span>
              <span className="font-medium text-[#212121]">{bar.display}</span>
            </div>
            <div className="h-[10px] rounded-full bg-[#e1e1e1] overflow-hidden">
              <div className="h-full rounded-full bg-[#5b5fc7]" style={{ width: `${bar.widthPct}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[8px] border border-[#e1e1e1] overflow-hidden bg-white">
        <img src={graphicImage} alt={`${title} \u2014 trend chart`} className="w-full h-auto block" />
      </div>
    </button>
  );
}

/** Expanded chart overlay \u2014 the "tap to inspect" escape hatch for a single element. */
function ChartExpandOverlay({ chart, onClose }: { chart: ChartData; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-[60] bg-black/70 flex items-center justify-center p-[20px]" onClick={onClose}>
      <div className="w-full max-w-[360px] rounded-[16px] bg-white p-[20px] flex flex-col gap-[18px]" onClick={(e) => e.stopPropagation()}>
        <span className="text-[#212121] text-[16px] font-semibold">{chart.title}</span>
        <div className="flex flex-col gap-[16px]">
          {chart.bars.map((bar) => (
            <div key={bar.label} className="flex flex-col gap-[6px]">
              <div className="flex items-center justify-between text-[13px] text-[#616161]">
                <span>{bar.label}</span>
                <span className="text-[18px] font-semibold text-[#212121]">{bar.display}</span>
              </div>
              <div className="h-[16px] rounded-full bg-[#e1e1e1] overflow-hidden">
                <div className="h-full rounded-full bg-[#5b5fc7]" style={{ width: `${bar.widthPct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} className="self-center px-[16px] h-[36px] rounded-full bg-[#f1f1f1] text-[#212121] text-[13px] font-medium">
          Close
        </button>
      </div>
    </div>
  );
}

/** Table with the leftmost column frozen and the remaining columns horizontal-scroll — doc's spreadsheet-header pattern.
 *  A row with empty value/note cells (e.g. a section label like "Devices (MTR-A, Panels, Teams Phones)") renders as
 *  a bolded divider rather than a data row with blank cells. The trend-line graphic follows underneath — the one
 *  part of the slide that's a real image, not text, so it can't be reflowed. */
function ReflowTable({ table, graphicImage, title }: { table: TableData; graphicImage: string; title: string }) {
  const { headers, rows } = table;
  return (
    <div className="flex flex-col gap-[10px]">
      <div className="flex rounded-[8px] border border-[#e1e1e1] overflow-hidden">
        {/* Frozen first column */}
        <div className="shrink-0 bg-[#f1f1f1]">
          <div className="h-[36px] flex items-center px-[10px] text-[11px] font-semibold text-[#616161] border-b border-[#e1e1e1] whitespace-nowrap">
            {headers[0]}
          </div>
          {rows.map((row) => {
            const isDivider = row.slice(1).every((cell) => !cell);
            return (
              <div
                key={row[0]}
                className={`h-[36px] flex items-center px-[10px] text-[12px] border-b border-[#e1e1e1] last:border-b-0 whitespace-nowrap ${isDivider ? "font-semibold" : ""} text-[#212121]`}
              >
                {row[0]}
              </div>
            );
          })}
        </div>
        {/* Scrollable remaining columns */}
        <div className="flex-1 min-w-0 overflow-x-auto">
          <div className="min-w-[360px]">
            <div className="h-[36px] flex border-b border-[#e1e1e1]">
              {headers.slice(1).map((h) => (
                <div key={h} className="flex-1 min-w-[120px] flex items-center px-[10px] text-[11px] font-semibold text-[#616161] whitespace-nowrap">
                  {h}
                </div>
              ))}
            </div>
            {rows.map((row) => (
              <div key={row[0]} className="h-[36px] flex border-b border-[#e1e1e1] last:border-b-0">
                {row.slice(1).map((cell, i) => (
                  <div key={i} className="flex-1 min-w-[120px] flex items-center px-[10px] text-[12px] text-[#212121] whitespace-nowrap">
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-[8px] border border-[#e1e1e1] overflow-hidden bg-white">
        <img src={graphicImage} alt={`${title} \u2014 trend chart`} className="w-full h-auto block" />
      </div>
    </div>
  );
}

/** Code block \u2014 wraps rather than requiring horizontal pinch/pan (doc's "wrap code" treatment). */
function ReflowCode({ code, caption }: { code: string[]; caption: string }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <pre className="rounded-[12px] border border-[#e1e1e1] bg-[#f8f8f8] p-[14px] text-[12px] leading-[18px] text-[#212121] whitespace-pre-wrap break-words" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
        {code.join("\n")}
      </pre>
      <span className="text-[#616161] text-[12px] leading-[16px]">{caption}</span>
    </div>
  );
}

function ReflowLadder({ items }: { items: LadderItem[] }) {
  return (
    <ol className="flex flex-col gap-[10px]">
      {items.map((item, i) => (
        <li key={item.title} className="flex gap-[12px] items-start rounded-[12px] border border-[#e1e1e1] bg-[#f8f8f8] p-[14px]">
          <span className="shrink-0 size-[24px] rounded-full bg-[#5b5fc7] text-white text-[12px] font-semibold flex items-center justify-center">
            {i + 1}
          </span>
          <div className="flex flex-col gap-[2px] min-w-0">
            <span className="text-[#212121] text-[14px] font-semibold leading-[18px]">{item.title}</span>
            {item.description && (
              <span className="text-[#616161] text-[13px] leading-[17px]">{item.description}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReflowCards({ cards }: { cards: CardItem[] }) {
  return (
    <div className="flex flex-col gap-[10px]">
      {cards.map((card) => {
        const toneColor = card.tone === "positive" ? "#107C10" : card.tone === "caution" ? "#986F0B" : undefined;
        return (
          <div
            key={card.title}
            className="rounded-[12px] border border-[#e1e1e1] bg-[#f8f8f8] p-[14px] flex flex-col gap-[4px]"
            style={toneColor ? { borderLeftWidth: 3, borderLeftColor: toneColor } : undefined}
          >
            <span className="text-[#212121] text-[14px] font-semibold leading-[18px]">{card.title}</span>
            <span className="text-[#616161] text-[13px] leading-[17px]">{card.description}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The reflowed, portrait-native, no-pinch-zoom read. Only text truly reflows;
 *  chart/table keep their real slide image (the trend graphs aren't reflowable);
 *  code wraps. Always a light "paper" surface — matches the source slides'
 *  own light theme rather than following the meeting app's own light/dark mode. */
function ReflowBody({ slide, onExpandChart }: { slide: Slide; onExpandChart: () => void }) {
  return (
    <div className="flex flex-col gap-[18px] px-[16px] py-[18px]">
      <div className="flex flex-col gap-[4px]">
        <span className="text-[#616161] text-[12px] leading-[16px]">{slide.subtitle}</span>
        <h1 className="text-[#212121] text-[22px] leading-[28px] font-semibold">{slide.title}</h1>
      </div>

      {slide.kind === "bullets" && (
        <ul className="flex flex-col gap-[10px]">
          {slide.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-[8px] text-[#212121] text-[15px] leading-[22px]">
              <span className="shrink-0 text-[#616161]">&bull;</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.kind === "chart" && (
        <div className="flex flex-col gap-[10px]">
          <ReflowChart chart={slide.chart} graphicImage={slide.graphicImage} title={slide.title} onExpand={onExpandChart} />
          {slide.insight && (
            <span className="text-[#616161] text-[13px] leading-[18px]">{slide.insight}</span>
          )}
        </div>
      )}

      {slide.kind === "table" && <ReflowTable table={slide.table} graphicImage={slide.graphicImage} title={slide.title} />}

      {slide.kind === "code" && <ReflowCode code={slide.code} caption={slide.caption} />}

      {slide.kind === "ladder" && <ReflowLadder items={slide.items} />}

      {slide.kind === "cards" && <ReflowCards cards={slide.cards} />}
    </div>
  );
}

interface LiquidReflowContentViewProps {
  onExit: () => void;
  sharerName?: string;
  /** Which slide the stage was showing when easy-read was opened \u2014 stay on it
   *  instead of resetting to slide 1. */
  initialSlideIndex?: number;
  /** Reports slide navigation back up so the stage stays in sync for when the user exits. */
  onSlideIndexChange?: (index: number) => void;
}

export function LiquidReflowContentView({ onExit, sharerName = "Aadi Kapoor", initialSlideIndex = 0, onSlideIndexChange }: LiquidReflowContentViewProps) {
  const [slideIndex, setSlideIndex] = useState(initialSlideIndex);
  const [isChartExpanded, setChartExpanded] = useState(false);

  const slide = DEMO_SLIDES[slideIndex];
  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(DEMO_SLIDES.length - 1, i));
    setSlideIndex(clamped);
    setChartExpanded(false);
    onSlideIndexChange?.(clamped);
  };
  const goPrev = () => goTo(slideIndex - 1);
  const goNext = () => goTo(slideIndex + 1);

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col" style={{ fontFamily: "var(--font-sf-pro)" }}>
      {/* Header row 1 \u2014 exit, live-follow indicator, and the always-available escape hatch */}
      <div className="shrink-0 flex items-center gap-[10px] px-[12px] pt-[max(12px,env(safe-area-inset-top))] pb-[8px] bg-white border-b border-[#e1e1e1]">
        <button
          type="button"
          aria-label="Exit easy read"
          onClick={onExit}
          className="size-[36px] rounded-full flex items-center justify-center bg-[#f1f1f1] text-[#5b5fc7] shrink-0"
        >
          <BackChevronIcon />
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-[6px]">
          <span className="size-[6px] rounded-full bg-[#107C10] shrink-0" />
          <span className="text-[#616161] text-[11px] leading-[14px] truncate">Live &middot; following {sharerName}</span>
        </div>
        <button
          type="button"
          aria-label="View original slide on the meeting stage"
          onClick={onExit}
          className="shrink-0 px-[12px] h-[32px] rounded-full bg-[#f1f1f1] text-[#212121] text-[12px] font-medium whitespace-nowrap"
        >
          View original
        </button>
      </div>

      {/* Header row 2 \u2014 independent slide navigation, mirrors PPT Live */}
      <div className="shrink-0 flex items-center justify-center gap-[10px] px-[12px] py-[10px] border-b border-[#e1e1e1] bg-white">
        <button
          type="button"
          aria-label="Previous easy-read slide"
          onClick={goPrev}
          disabled={slideIndex === 0}
          className="size-[28px] rounded-full flex items-center justify-center bg-[#f1f1f1] text-[#5b5fc7] disabled:opacity-30"
        >
          <ChevronIcon direction="left" />
        </button>
        <span className="text-[#212121] text-[12px] font-medium whitespace-nowrap">
          Slide {slideIndex + 1} of {DEMO_SLIDES.length}
        </span>
        <button
          type="button"
          aria-label="Next easy-read slide"
          onClick={goNext}
          disabled={slideIndex === DEMO_SLIDES.length - 1}
          className="size-[28px] rounded-full flex items-center justify-center bg-[#f1f1f1] text-[#5b5fc7] disabled:opacity-30"
        >
          <ChevronIcon direction="right" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        <ReflowBody slide={slide} onExpandChart={() => setChartExpanded(true)} />
      </div>

      {isChartExpanded && slide.kind === "chart" && (
        <ChartExpandOverlay chart={slide.chart} onClose={() => setChartExpanded(false)} />
      )}
    </div>
  );
}

