/**
 * Shared demo slide-deck data + the "original" (faithful, scrollable)
 * rendering used on the meeting stage itself (brainstorming/screensharing
 * idea 2 — see notes.md). The easy-read/reflow rendering lives separately in
 * `LiquidReflowContentView.tsx`, which imports the same `Slide` data from here
 * so both views stay in sync.
 *
 * Six slides, each a different content type, transcribed from a real rollout
 * deck (PMP/Teams device management). The stage shows the actual slide
 * screenshots (`image`); the reflow view uses the structured per-kind fields
 * below to reflow the same content.
 */

import { useEffect, useRef, useState } from "react";
import slideImg1 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235806.png";
import slideImg2 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235824.png";
import slideImg3 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235843.png";
import slideImg4 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235855.png";
import slideImg5 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235907.png";
import slideImg6 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235919.png";
// Cropped to just the non-text graphics (diagrams, photos, trend lines) — the parts of these
// slides that can't be reflowed as text. Split into one image per distinct item (each chart,
// each photo) rather than one combined strip, so every item stays legible when placed 1-by-1.
import slide1TimelinePart1 from "@/assets/figma/shared-content/slide1-timeline-part1.png";
import slide1TimelinePart2 from "@/assets/figma/shared-content/slide1-timeline-part2.png";
import slide1TimelinePart3 from "@/assets/figma/shared-content/slide1-timeline-part3.png";
import slide2DevicesGraphic from "@/assets/figma/shared-content/slide2-devices-graphic.png";
import slide3ChartLeft from "@/assets/figma/shared-content/slide3-chart-left.png";
import slide3ChartRight from "@/assets/figma/shared-content/slide3-chart-right.png";
import slide4ChartMtra from "@/assets/figma/shared-content/slide4-chart-mtra.png";
import slide4ChartPanels from "@/assets/figma/shared-content/slide4-chart-panels.png";
import slide4ChartPhones from "@/assets/figma/shared-content/slide4-chart-phones.png";
import slide6PhotoLeft from "@/assets/figma/shared-content/slide6-photo-left.png";
import slide6PhotoRight from "@/assets/figma/shared-content/slide6-photo-right.png";

export interface ChartData {
  title: string;
  bars: { label: string; display: string; widthPct: number }[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface LadderItem {
  title: string;
  description: string;
  /** Matches the real slide's own colored phase boxes/dots (green = already done,
   *  indigo = still upcoming) \u2014 losing this status made every phase look identical. */
  status?: "done" | "upcoming";
}

export interface CardItem {
  title: string;
  description: string;
  tone?: "positive" | "caution";
}

export interface SlideGraphic {
  src: string;
  /** Which item this graphic is (e.g. the chart series or table row it illustrates) \u2014
   *  reused verbatim from the slide's own data so a chart is never shown headless. */
  caption?: string;
}

export type Slide =
  | { kind: "bullets"; title: string; subtitle: string; image: string; bullets: string[]; graphicImages?: SlideGraphic[]; titleColor?: string }
  | { kind: "chart"; title: string; subtitle: string; image: string; chart: ChartData; insight?: string; graphicImages?: SlideGraphic[]; titleColor?: string }
  | { kind: "table"; title: string; subtitle: string; image: string; table: TableData; graphicImages?: SlideGraphic[]; titleColor?: string }
  | { kind: "code"; title: string; subtitle: string; image: string; code: string[]; caption: string; graphicImages?: SlideGraphic[]; titleColor?: string }
  | { kind: "ladder"; title: string; subtitle: string; image: string; items: LadderItem[]; graphicImages?: SlideGraphic[]; titleColor?: string }
  | { kind: "cards"; title: string; subtitle: string; image: string; cards: CardItem[]; graphicImages?: SlideGraphic[]; titleColor?: string };

export const DEMO_SLIDES: Slide[] = [
  {
    kind: "ladder",
    title: "Rollout Timeline & Change management plan",
    subtitle: "Each phase is gated \u2014 requires zero Sev1/Sev2 and validated core workflows before proceeding",
    image: slideImg1,
    graphicImages: [{ src: slide1TimelinePart1 }, { src: slide1TimelinePart2 }, { src: slide1TimelinePart3 }],
    items: [
      { title: "Pre-Rollout \u2014 Jan 2026", description: "MC announcement, Docs published", status: "done" },
      { title: "MSD \u2014 Mar 2026", description: "Weekly MSD calls", status: "done" },
      { title: "OEMs \u2014 Apr 2026", description: "TAC in-portal messaging, Migration guide, TAP calls", status: "done" },
      { title: "TAP \u2014 May 2026", description: "Migration tracker (internal), CSM outreach begins", status: "done" },
      { title: "GA - All Customers \u2014 June 2026", description: "Office hours (cont.), TAP calls (cont.)", status: "done" },
      { title: "GA- Gov (GCCH/DoD) Clouds \u2014 July 2026", description: "MC comms / docs updates for Gov cloud customers, Migration tracker for Gov cloud", status: "done" },
      { title: "GA - Gov (GCC) Clouds \u2014 Aug - 2026", description: "", status: "upcoming" },
      { title: "TAC DM Deprecation \u2013 Prod \u2014 Sept \u2013 2026", description: "", status: "upcoming" },
      { title: "TAC DM Deprecation \u2013 GCC/CCH/DoD \u2014 Sept \u2013 2026", description: "", status: "upcoming" },
    ],
  },
  {
    kind: "bullets",
    title: "Converged administration in PMP",
    subtitle: "Unified management of Teams devices in a single portal (PMP)",
    image: slideImg2,
    graphicImages: [{ src: slide2DevicesGraphic }],
    bullets: [
      "Delivering a unified admin experience.",
      "PMP \u2013 one single pane of glass for all device management",
      "Support for all device types irrespective of OS and licenses",
      "Parity between windows and Android. Proactive alerting, reliable and faster device-cloud communication and many more advanced features",
    ],
  },
  {
    kind: "table",
    title: "PMP Adoption",
    subtitle: "Managed tenants and devices (excluding Teams windows devices and SIP) in PMP compared to TAC.",
    image: slideImg3,
    graphicImages: [
      { src: slide3ChartLeft, caption: "Tenants (Public cloud)" },
      { src: slide3ChartRight, caption: "Devices (MTR-A, Panels, Teams Phones)" },
    ],
    table: {
      headers: ["Metric", "Value", "Note"],
      rows: [
        ["Tenants (Public cloud)", "", ""],
        ["TAC (90D)", "148,114", ""],
        ["PMP", "143,304", "96.8% of TAC"],
        ["Devices (MTR-A, Panels, Teams Phones)", "", ""],
        ["TAC Active (90D)", "2,951,977", ""],
        ["TAC online (Today)", "2,704,351", "~230k offline devices need Admin action to bring them online so that they get auto-updated"],
        ["PMP Ready (AA 830 and above)", "2,585,146", "95.6% of TAC online devices have AA>= 830"],
        ["PMP Connected", "2,363,080", "87.4% of TAC online devices are connected to PMP via IotHub"],
      ],
    },
  },
  {
    kind: "chart",
    title: "Device type migration progress",
    subtitle: "Combined across NOAM \u00b7 EMEA \u00b7 APAC",
    image: slideImg4,
    graphicImages: [
      { src: slide4ChartMtra, caption: "MTR-A (Collab Bar + Touch Console)" },
      { src: slide4ChartPanels, caption: "Panels" },
      { src: slide4ChartPhones, caption: "Phones" },
    ],
    chart: {
      title: "PMP Connected of TAC online",
      bars: [
        { label: "MTR-A (Collab Bar + Touch Console)", display: "94.5%", widthPct: 94.5 },
        { label: "Panels", display: "87.3%", widthPct: 87.3 },
        { label: "Phones", display: "74.6%", widthPct: 74.6 },
      ],
    },
  },
  {
    kind: "cards",
    title: "Customer Feedback Snapshot",
    subtitle: "Overall sentiment \u2014 Customers strongly validate PMP's unified Windows and Android management experience, noting that it addresses TAC feedback and adds valuable settings and update capabilities, while initial friction centers on Admin Agent readiness, URL allowlisting, OEM consistency, and rollout predictability.",
    image: slideImg5,
    titleColor: "#5E54E4",
    cards: [
      { title: "Unified PMP experience", description: "Customers see value in one portal for device management, with parity across Windows and Android experiences being appreciated.", tone: "positive" },
      { title: "Settings management", description: "Customers appreciate one settings template across device types; two-way sync in PMP also closes a current TAC gap for Android settings visibility.", tone: "positive" },
      { title: "Update management", description: "Customers see value in PMP update management through version-level targeting, ring-based rollout, and update status tracking.", tone: "positive" },
      { title: "Faster remote actions", description: "Customers explicitly appreciated fast execution for remote actions like restart.", tone: "positive" },
      { title: "Pre-requisites: min Admin Agent version + URL allowlisting", description: "Initial friction was around devices getting updated to the required Admin Agent and network URL allowlisting. We're expediting Admin Agent updates and strengthening customer readiness communication.", tone: "caution" },
      { title: "Settings consistency + UX clarity", description: "Settings visibility and two-way sync support vary by OEM, and some setting labels need to be clearer. We're adding OEM capability indicators and improving setting labels/tooltips.", tone: "caution" },
      { title: "Update predictability / rollout behavior", description: "Customers need clearer expectations around ring mapping and rollout timing. We're clarifying update behavior and customer guidance before broader scale.", tone: "caution" },
    ],
  },
  {
    kind: "bullets",
    title: "Hybrid Work & Product Led Growth",
    subtitle: "Microsoft Teams Shared Space license - $104M",
    image: slideImg6,
    graphicImages: [{ src: slide6PhotoLeft }, { src: slide6PhotoRight }],
    titleColor: "#5E54E4",
    bullets: [
      "Hybrid Work Management",
      "Auto association (301 K+ AA Rooms, 522 K+ AA Peripherals and 3.5 K+ AA Desks) for BYOD Rooms & personal spaces.",
      "Bookable Desks MAD 23 K+",
      "Product Led Growth (Drive MTR growth)",
      "Contributed to 56 K+ MTRs purchase via PLG",
    ],
  },
];

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_DOUBLE_TAP = 2;

type ZoomGesture =
  | { mode: "pinch"; startDist: number; startScale: number }
  | { mode: "pan"; startX: number; startY: number; startTx: number; startTy: number };

/** Pinch-to-zoom + one-finger pan + double-tap-to-zoom, scoped to just the slide image
 *  it's attached to (via a ref) — the rest of the page (swipe-between-slides, page scroll)
 *  is untouched. Uses native (non-passive) touch listeners so `preventDefault` actually
 *  stops the browser's own page-zoom/scroll while a gesture is happening on this image;
 *  React's synthetic touch handlers are passive by default and can't do that. A real
 *  pinch (not just the double-tap fallback) now also feeds idea 1's rotate-hint signal. */
function useSlideZoom(onZoomAttempt?: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const gestureRef = useRef<ZoomGesture | null>(null);
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { txRef.current = tx; }, [tx]);
  useEffect(() => { tyRef.current = ty; }, [ty]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const clamp = (s: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, s));

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        const startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        gestureRef.current = { mode: "pinch", startDist, startScale: scaleRef.current };
        onZoomAttempt?.();
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        const t = e.touches[0];
        gestureRef.current = { mode: "pan", startX: t.clientX, startY: t.clientY, startTx: txRef.current, startTy: tyRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!g) return;
      if (g.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const [a, b] = [e.touches[0], e.touches[1]];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        setScale(clamp(g.startScale * (dist / g.startDist)));
      } else if (g.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        setTx(g.startTx + (t.clientX - g.startX));
        setTy(g.startTy + (t.clientY - g.startY));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return;
      gestureRef.current = null;
      if (scaleRef.current <= 1.02) { setScale(1); setTx(0); setTy(0); }
    };

    // Trackpad pinch (Chrome/Safari report it as a ctrl+wheel gesture) or explicit ctrl+scroll —
    // left alone otherwise so normal scrolling/swiping is unaffected.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      onZoomAttempt?.();
      setScale((s) => clamp(s - e.deltaY * 0.01));
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("wheel", onWheel);
    };
  }, [onZoomAttempt]);

  const onDoubleClick = () => {
    onZoomAttempt?.();
    setScale((s) => {
      const zoomedIn = s <= 1;
      if (!zoomedIn) { setTx(0); setTy(0); }
      return zoomedIn ? ZOOM_DOUBLE_TAP : 1;
    });
  };

  return { containerRef, scale, tx, ty, isZoomed: scale > 1, onDoubleClick };
}

/** One slide preview — the actual slide screenshot, shown at its exact
 *  aspect ratio (letterboxed, never cropped) within the shared-content frame.
 *  This is the real deck as it would look on a screen share. Pinch (or trackpad-pinch/
 *  ctrl+scroll) zooms just this image in place; double-tap toggles a 2x zoom. Both feed
 *  idea 1's rotate-hint signal via `onZoomAttempt`. Scoped entirely to this card — the
 *  rest of the page and the swipe-between-slides gesture are untouched.
 *
 *  `onScaleComputed` reports the real object-contain scale factor once the image loads
 *  (frame size ÷ native pixel size) — idea 1, condition 1: an objectively-computed
 *  legibility signal instead of a behavioral guess. */
export function OriginalSlideCard({
  slide,
  onZoomAttempt,
  onScaleComputed,
}: {
  slide: Slide;
  onZoomAttempt?: () => void;
  onScaleComputed?: (scale: number) => void;
}) {
  const { containerRef, scale, tx, ty, isZoomed, onDoubleClick } = useSlideZoom(onZoomAttempt);
  const reportScale = (img: HTMLImageElement) => {
    const frame = containerRef.current;
    if (!frame || !img.naturalWidth || !img.naturalHeight) return;
    const fit = Math.min(frame.clientWidth / img.naturalWidth, frame.clientHeight / img.naturalHeight);
    onScaleComputed?.(fit);
  };
  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center bg-fy27-surface-card overflow-hidden"
      style={{ touchAction: isZoomed ? "none" : "auto" }}
    >
      <img
        src={slide.image}
        alt={slide.title}
        onDoubleClick={onDoubleClick}
        onLoad={(e) => reportScale(e.currentTarget)}
        draggable={false}
        className="max-w-full max-h-full object-contain select-none"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transition: isZoomed ? "none" : "transform 150ms ease-out",
        }}
      />
    </div>
  );
}

/** The meeting stage's shared-content frame, showing the full 6-slide deck in
 *  its original (unreflowed) form as a horizontally scrollable, snap-paged
 *  strip \u2014 one slide fills the frame at a time, swipe to browse the rest.
 *
 *  `activeIndex`/`onActiveIndexChange` keep this in sync with the easy-read
 *  view (idea 2 feedback: switching modes should stay on the same slide, not
 *  reset to the first one) \u2014 scrolls to `activeIndex` when it changes
 *  externally, and reports the user's own swipes back up via scroll position. */
export function OriginalSlideDeckStrip({
  onZoomAttempt,
  activeIndex = 0,
  onActiveIndexChange,
  onSlideScaleComputed,
}: {
  onZoomAttempt?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  onSlideScaleComputed?: (index: number, scale: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lastScrolledToRef = useRef(activeIndex);

  // Scroll to the active slide when it changes from outside this strip
  // (e.g. returning from easy-read on a different slide than we left on).
  useEffect(() => {
    if (activeIndex === lastScrolledToRef.current) return;
    lastScrolledToRef.current = activeIndex;
    slideRefs.current[activeIndex]?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
  }, [activeIndex]);

  // Report the user's own swipes back up so easy-read opens on the right slide.
  const handleScroll = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScroll = () => {
    if (handleScroll.current) clearTimeout(handleScroll.current);
    handleScroll.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el || !onActiveIndexChange) return;
      const index = Math.round(el.scrollLeft / el.clientWidth);
      const clamped = Math.max(0, Math.min(DEMO_SLIDES.length - 1, index));
      lastScrolledToRef.current = clamped;
      onActiveIndexChange(clamped);
    }, 120);
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="w-full h-full overflow-x-auto snap-x snap-mandatory flex"
      style={{ scrollbarWidth: "none" }}
    >
      {DEMO_SLIDES.map((slide, i) => (
        <div
          key={slide.title}
          ref={(el) => { slideRefs.current[i] = el; }}
          className="w-full h-full shrink-0 snap-center"
        >
          <OriginalSlideCard slide={slide} onZoomAttempt={onZoomAttempt} onScaleComputed={(scale) => onSlideScaleComputed?.(i, scale)} />
        </div>
      ))}
    </div>
  );
}

