import React, { ReactNode } from "react";
import svgPaths from "@/imports/svg-421nqr9b2v";
import svgPathsMore from "@/imports/svg-r0bdvgj63w";
import svgPathsNav from "@/imports/svg-jfy15c3zsm";
import { useImmersiveSplit, IMMERSIVE_OFFSET_PX } from "@/app/components/ImmersiveSplitContext";
import { useVersion } from "@/app/versioning/VersionContext";
import { isMvpFamily } from "@/app/versioning/versions";

interface MultitaskingPanelProps {
  title: string | ReactNode;
  onClose: () => void;
  actionButton?: ReactNode;
  children: ReactNode;
  footerComponent?: ReactNode;
  showFooter?: boolean;
  isNestedView?: boolean;
}

const DEFAULT_HEIGHT = "65vh";

/**
 * Reserved bottom space for the docked control bar (overlaid by MeetingPage).
 * FY27 MVP docks the full U-bar (button row 80 + home indicator 21 + 1px border ≈ 102px)
 * so the footer/composer clears it; Final Vision floats a shorter BottomNav (94px).
 */
const DOCK_RESERVE_MVP = 102;
const DOCK_RESERVE_FV = 94;

export function MultitaskingPanel({
  title,
  onClose,
  actionButton,
  children,
  footerComponent,
  showFooter = false,
  isNestedView = false,
}: MultitaskingPanelProps) {
  // Immersive height/drag state comes from context; the grip itself lives on the divider (in MeetingPage).
  const immersive = useImmersiveSplit();
  const isImmersive = immersive?.isImmersive ?? false;
  const dragHeight = immersive?.dragHeight ?? null;
  const isDragging = immersive?.isDragging ?? false;

  // FY27 MVP restyle (Figma "Multitasking shell" 962:41573) is version-gated so
  // Final Vision keeps its glassy treatment untouched.
  const { activeVersionId } = useVersion();
  const isMvp = isMvpFamily(activeVersionId);

  const height =
    dragHeight != null
      ? `${dragHeight}px`
      : isImmersive
      ? `calc(100dvh - var(--app-top-inset) - ${IMMERSIVE_OFFSET_PX}px)`
      : DEFAULT_HEIGHT;

  const shellClass = isMvp
    ? "bg-fy27-surface overflow-hidden"
    : "backdrop-blur-[4px] bg-[rgba(24,24,24,0.98)] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.08)]";

  return (
    <div
      className={`flex-shrink-0 rounded-tl-[20px] rounded-tr-[20px] flex flex-col relative ${shellClass}`}
      style={{
        height,
        transition: isDragging ? "none" : "height 300ms ease-out",
      }}
    >
      {/* Sticky Header.
          MVP: Teams 2 iOS "Navigation bar" (Figma 964:29959) — 48px, Surface/Tertiary,
          bare Dismiss/back glyph at 16px left padding (no circle), centered Subhead-1 title.
          FV: original glass close button at 62px. */}
      {isMvp ? (
        <div className="flex-shrink-0 relative flex items-center justify-center h-[48px] w-full bg-fy27-surface text-fy27-icon-primary">
          {/* Center: title (Subhead 1). Padded so it never collides with the action groups. */}
          <h2
            className="text-fy27-text-primary font-medium text-[17px] tracking-[-0.24px] leading-[20px] whitespace-nowrap px-[64px] truncate text-center"
            style={{ fontFamily: "var(--font-sf-pro)" }}
          >
            {title}
          </h2>

          {/* Left actions — bare Dismiss / back glyph at 16px (no background). */}
          <div className="absolute left-0 top-0 h-[48px] flex items-center gap-[4px] pl-[16px]">
            <button
              onClick={onClose}
              aria-label={isNestedView ? "Back" : "Close"}
              className="size-[24px] flex items-center justify-center active:opacity-60 transition-opacity"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path d={isNestedView ? svgPathsNav.p3dc95180 : svgPaths.p2f52be80} fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Right actions — flexible region: up to two 24pt icons and/or a label
              (per the Teams 2 iOS nav bar). Panels supply them via `actionButton`. */}
          {actionButton && (
            <div className="absolute right-0 top-0 h-[48px] flex items-center gap-[20px] pr-[16px]">
              {actionButton}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-center justify-between relative h-[62px] px-4">
          {/* Close/Back button with glass color-dodge effect */}
          <button
            onClick={onClose}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-full">
              <div className="absolute inset-0 bg-[#333] mix-blend-color-dodge rounded-full" />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgb(0, 0, 0) 0%, rgb(0, 0, 0) 100%), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.5) 100%)",
                }}
              />
            </div>
            {isNestedView ? (
              <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsNav.p3dc95180} fill="white" />
              </svg>
            ) : (
              <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24">
                <path d={svgPaths.p2f52be80} fill="white" />
              </svg>
            )}
          </button>

          {/* Title */}
          <h2
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-medium text-[17px] tracking-[-0.24px] leading-[20px]"
            style={{ fontFamily: "var(--font-sf-pro)" }}
          >
            {title}
          </h2>

          {/* Action button - optional */}
          {actionButton ? actionButton : <div className="w-[44px] h-[44px]" />}
        </div>
      )}

      {/* Scrollable Content (the "scroll window" — Surface/Base in MVP) */}
      <div className={`flex-1 overflow-y-auto ${isMvp ? "bg-fy27-surface-base" : ""}`}>
        {children}
      </div>

      {/* Optional Footer / Composer (Surface/Tertiary in MVP) */}
      {showFooter && footerComponent && (
        <div className={`flex-shrink-0 ${isMvp ? "bg-fy27-surface" : ""}`}>
          {footerComponent}
        </div>
      )}

      {/* FV: divider above the floating bottom nav. MVP: the docked U-bar carries
          its own top border, so the reserve below just needs to clear it. */}
      {!isMvp && <div className="h-[1px] bg-[#323232] flex-shrink-0" />}

      {/* Space reserved for the docked control bar (overlaid by MeetingPage). */}
      <div className="flex-shrink-0" style={{ height: isMvp ? DOCK_RESERVE_MVP : DOCK_RESERVE_FV }} />
    </div>
  );
}
