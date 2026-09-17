import { SlideshowControlBar } from "@/app/components/versions/mvp/SlideshowControlBar";
import { OriginalSlideDeckStrip, DEMO_SLIDES } from "@/app/components/DemoSlideDeck";

/**
 * Presenter slideshow share — Figma `996:37625` (Mobile Meeting Redesign).
 * Full-width stack: shared slide (224) · slideshow control bar (48) · name-tag bar (52).
 * MVP-only; shown in the gallery when content sharing is active.
 *
 * The shared-slide area shows the 6-slide demo deck in its original
 * (unreflowed) form via `OriginalSlideDeckStrip` — a horizontally scrollable,
 * snap-paged strip, one slide filling the frame at a time (brainstorming/
 * screensharing idea 2 — see notes.md). The control bar's counter and prev/next
 * reflect and drive that same deck; "To presenter"/"Take control" stay demo
 * no-ops. The bottom-right maximize button opens the fullscreen content view
 * via `onMaximize`. The "Aa" button opens the opt-in Liquid Mode-style
 * easy-read/reflow prototype via `onReflow`.
 */

/** Full-screen maximize (corner brackets) — Figma asset 996:37815 inner Shape. */
function MaximizeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" fill="none" className="text-fy27-icon-interactive">
      <path
        d="M2 3C2 2.44772 2.44772 2 3 2H5C5.55228 2 6 1.55228 6 1C6 0.447715 5.55228 0 5 0H3C1.34315 0 0 1.34315 0 3V5C0 5.55228 0.447715 6 1 6C1.55228 6 2 5.55228 2 5V3ZM2 15C2 15.5523 2.44772 16 3 16H5C5.55228 16 6 16.4477 6 17C6 17.5523 5.55228 18 5 18H3C1.34315 18 0 16.6569 0 15V13C0 12.4477 0.447715 12 1 12C1.55228 12 2 12.4477 2 13V15ZM15 2C15.5523 2 16 2.44772 16 3V5C16 5.55228 16.4477 6 17 6C17.5523 6 18 5.55228 18 5V3C18 1.34315 16.6569 0 15 0H13C12.4477 0 12 0.447715 12 1C12 1.55228 12.4477 2 13 2H15ZM16 15C16 15.5523 15.5523 16 15 16H13C12.4477 16 12 16.4477 12 17C12 17.5523 12.4477 18 13 18H15C16.6569 18 18 16.6569 18 15V13C18 12.4477 17.5523 12 17 12C16.4477 12 16 12.4477 16 13V15Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Easy-read (reflow) entry point — a simple "Aa" glyph, distinct from Maximize. */
function EasyReadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-fy27-icon-interactive">
      <path
        d="M2.2 12L5.1 4h1.4l2.9 8H8.1l-.73-2.05H3.83L3.1 12H2.2Zm1.94-2.86h2.62L5.5 5.24 4.14 9.14ZM10.4 12.15c-.5 0-.92-.14-1.24-.42-.32-.28-.48-.66-.48-1.14 0-.53.2-.94.6-1.24.4-.3.94-.47 1.63-.51l1.2-.08v-.24c0-.36-.1-.63-.3-.81-.2-.18-.48-.27-.85-.27-.32 0-.58.07-.79.21-.2.14-.33.32-.4.55l-.9-.16c.1-.44.34-.79.71-1.05.37-.26.85-.39 1.42-.39.66 0 1.18.17 1.55.51.37.34.55.82.55 1.44v3.28h-.87l-.06-.68h-.03c-.16.25-.38.45-.65.6-.27.15-.6.22-.99.22Zm.24-.77c.42 0 .76-.12 1.02-.35.26-.24.39-.55.39-.94v-.33l-1.02.07c-.4.03-.7.11-.9.25-.2.14-.3.34-.3.6 0 .24.08.42.24.55.16.13.35.15.57.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Reels-style rotate hint (brainstorming/screensharing idea 1) — a small phone glyph that
 *  rotates 90° and back on a loop, nudging toward landscape without any text/banner. */
function RotateHintIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 16 16"
      fill="none"
      className="text-fy27-icon-interactive animate-rotate-hint"
      style={{ transformOrigin: "50% 50%" }}
    >
      <rect x="4.25" y="1.5" width="7.5" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="11.9" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function SharedContentShare({
  sharerName,
  onMaximize,
  onReflow,
  onZoomAttempt,
  showRotateHint = false,
  splitLayout = false,
  activeSlideIndex,
  onActiveSlideIndexChange,
}: {
  sharerName: string;
  onMaximize?: () => void;
  onReflow?: () => void;
  onZoomAttempt?: () => void;
  showRotateHint?: boolean;
  splitLayout?: boolean;
  activeSlideIndex?: number;
  onActiveSlideIndexChange?: (index: number) => void;
}) {
  const controlBar = (
    <SlideshowControlBar
      fullWidth
      current={(activeSlideIndex ?? 0) + 1}
      total={DEMO_SLIDES.length}
      onPrev={() => onActiveSlideIndexChange?.(Math.max(0, (activeSlideIndex ?? 0) - 1))}
      onNext={() => onActiveSlideIndexChange?.(Math.min(DEMO_SLIDES.length - 1, (activeSlideIndex ?? 0) + 1))}
    />
  );

  // Name-tag / fullscreen row.
  const nametagRow = (
    <div className="h-[52px] px-[8px] flex items-center gap-[10px]">
      <div className="h-[28px] p-[4px] rounded-[3px] bg-fy27-nametag-bg backdrop-blur-[45px] flex items-center min-w-0">
        <span className="px-[2px] truncate text-fy27-text-primary text-[12px] leading-[16px]">{sharerName}&apos;s content</span>
      </div>
      <div className="flex-1" />
      {showRotateHint && (
        <div
          role="img"
          aria-label="Tip: rotate your phone for a bigger view"
          className="size-[52px] rounded-[8px] flex items-center justify-center shrink-0"
        >
          <RotateHintIcon />
        </div>
      )}
      <button
        type="button"
        aria-label="Open easy read"
        onClick={onReflow}
        className="size-[52px] rounded-[8px] flex items-center justify-center shrink-0"
      >
        <EasyReadIcon />
      </button>
      <button
        type="button"
        aria-label="Open shared content fullscreen"
        onClick={onMaximize}
        className="size-[52px] rounded-[8px] flex items-center justify-center shrink-0"
      >
        <MaximizeIcon />
      </button>
    </div>
  );


  // Checkpoint (split): fill the available height — slide centred in the upper
  // area; the nametag/fullscreen row then the slideshow control pinned to the
  // bottom with a 10px gap above the filmstrip.
  if (splitLayout) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-sf-pro)" }}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <OriginalSlideDeckStrip onZoomAttempt={onZoomAttempt} activeIndex={activeSlideIndex} onActiveIndexChange={onActiveSlideIndexChange} />
        </div>
        {nametagRow}
        {controlBar}
        <div className="h-[10px] shrink-0" />
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[4px] bg-fy27-surface mb-[2px]" style={{ fontFamily: "var(--font-sf-pro)" }}>
      {/* Shared slide deck — original form, scrollable */}
      <div className="w-full h-[224px]">
        <OriginalSlideDeckStrip onZoomAttempt={onZoomAttempt} activeIndex={activeSlideIndex} onActiveIndexChange={onActiveSlideIndexChange} />
      </div>

      {nametagRow}
      {controlBar}
    </div>
  );
}
