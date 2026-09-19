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

import { useEffect, useRef } from "react";
import slideImg1 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235806.png";
import slideImg2 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235824.png";
import slideImg3 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235843.png";
import slideImg4 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235855.png";
import slideImg5 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235907.png";
import slideImg6 from "@/assets/figma/shared-content/Screenshot 2026-09-16 235919.png";
// Cropped to just the non-text graphics (diagrams, photos, trend lines) — the parts of these
// slides that can't be reflowed as text, so they're shown as images alongside the reflowed text.
import slide1TimelineGraphic from "@/assets/figma/shared-content/slide1-timeline-graphic.png";
import slide2DevicesGraphic from "@/assets/figma/shared-content/slide2-devices-graphic.png";
import slide3TableGraphic from "@/assets/figma/shared-content/slide3-table-graphic.png";
import slide4ChartGraphic from "@/assets/figma/shared-content/slide4-chart-graphic.png";
import slide6PhotosGraphic from "@/assets/figma/shared-content/slide6-photos-graphic.png";

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
}

export interface CardItem {
  title: string;
  description: string;
  tone?: "positive" | "caution";
}

export type Slide =
  | { kind: "bullets"; title: string; subtitle: string; image: string; bullets: string[]; graphicImage?: string; titleColor?: string }
  | { kind: "chart"; title: string; subtitle: string; image: string; chart: ChartData; insight?: string; graphicImage?: string; titleColor?: string }
  | { kind: "table"; title: string; subtitle: string; image: string; table: TableData; graphicImage?: string; titleColor?: string }
  | { kind: "code"; title: string; subtitle: string; image: string; code: string[]; caption: string; graphicImage?: string; titleColor?: string }
  | { kind: "ladder"; title: string; subtitle: string; image: string; items: LadderItem[]; graphicImage?: string; titleColor?: string }
  | { kind: "cards"; title: string; subtitle: string; image: string; cards: CardItem[]; graphicImage?: string; titleColor?: string };

export const DEMO_SLIDES: Slide[] = [
  {
    kind: "ladder",
    title: "Rollout Timeline & Change management plan",
    subtitle: "Each phase is gated \u2014 requires zero Sev1/Sev2 and validated core workflows before proceeding",
    image: slideImg1,
    graphicImage: slide1TimelineGraphic,
    items: [
      { title: "Pre-Rollout \u2014 Jan 2026", description: "MC announcement, Docs published" },
      { title: "MSD \u2014 Mar 2026", description: "Weekly MSD calls" },
      { title: "OEMs \u2014 Apr 2026", description: "TAC in-portal messaging, Migration guide, TAP calls" },
      { title: "TAP \u2014 May 2026", description: "Migration tracker (internal), CSM outreach begins" },
      { title: "GA - All Customers \u2014 June 2026", description: "Office hours (cont.), TAP calls (cont.)" },
      { title: "GA- Gov (GCCH/DoD) Clouds \u2014 July 2026", description: "MC comms / docs updates for Gov cloud customers, Migration tracker for Gov cloud" },
      { title: "GA - Gov (GCC) Clouds \u2014 Aug - 2026", description: "" },
      { title: "TAC DM Deprecation \u2013 Prod \u2014 Sept \u2013 2026", description: "" },
      { title: "TAC DM Deprecation \u2013 GCC/CCH/DoD \u2014 Sept \u2013 2026", description: "" },
    ],
  },
  {
    kind: "bullets",
    title: "Converged administration in PMP",
    subtitle: "Unified management of Teams devices in a single portal (PMP)",
    image: slideImg2,
    graphicImage: slide2DevicesGraphic,
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
    graphicImage: slide3TableGraphic,
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
    graphicImage: slide4ChartGraphic,
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
    titleColor: "#5b5fc7",
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
    graphicImage: slide6PhotosGraphic,
    titleColor: "#5b5fc7",
    bullets: [
      "Hybrid Work Management",
      "Auto association (301 K+ AA Rooms, 522 K+ AA Peripherals and 3.5 K+ AA Desks) for BYOD Rooms & personal spaces.",
      "Bookable Desks MAD 23 K+",
      "Product Led Growth (Drive MTR growth)",
      "Contributed to 56 K+ MTRs purchase via PLG",
    ],
  },
];

/** One slide preview \u2014 the actual slide screenshot, shown at its exact
 *  aspect ratio (letterboxed, never cropped) within the shared-content frame.
 *  This is the real deck as it would look on a screen share. A double-tap/
 *  double-click stands in for a pinch-zoom gesture (feeds idea 1's struggle signal). */
export function OriginalSlideCard({ slide, onZoomAttempt }: { slide: Slide; onZoomAttempt?: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-fy27-surface-card">
      <img
        src={slide.image}
        alt={slide.title}
        onDoubleClick={onZoomAttempt}
        className="max-w-full max-h-full object-contain"
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
}: {
  onZoomAttempt?: () => void;
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
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
          <OriginalSlideCard slide={slide} onZoomAttempt={onZoomAttempt} />
        </div>
      ))}
    </div>
  );
}

