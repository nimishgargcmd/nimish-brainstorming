import { MeetingStageGallery } from "@/app/components/versions/mvp/MeetingStageGallery";

/**
 * FY27 MVP meeting stage — Gallery only.
 *
 * The `MeetingViews` slot's FY27 MVP override: no horizontal swiping, no page
 * indicators, and On-the-go / Focus are not rendered (hidden for now, to be
 * configured later). Final Vision keeps the full SwipeableViews carousel.
 *
 * Accepts the same props as SwipeableViews so it's a drop-in; the on-the-go /
 * focus-only props are ignored. Because it never switches the view away from
 * Gallery, MeetingPage's `currentView` stays 1 and the header/auto-mute logic
 * (all gated on `currentView !== 0`) keeps working.
 */
interface MeetingViewsProps {
  isSplit: boolean;
  onCollapseSplit?: () => void;
  isContentSharing?: boolean;
  onEnterFullscreen?: () => void;
  onOpenReflow?: () => void;
  onZoomAttempt?: () => void;
  showRotateHint?: boolean;
  activeSlideIndex?: number;
  onActiveSlideIndexChange?: (index: number) => void;
  // ignored (kept so it drops into the SwipeableViews slot)
  isMicOn?: boolean;
  isVideoOn?: boolean;
  onMicToggle?: () => void;
  onHandRaiseToggle?: () => void;
  isHandRaised?: boolean;
  onViewChange?: (viewIndex: number) => void;
}

export function MeetingViewsGallery({
  isSplit,
  onCollapseSplit,
  isContentSharing = false,
  onEnterFullscreen,
  onOpenReflow,
  onZoomAttempt,
  showRotateHint,
  activeSlideIndex,
  onActiveSlideIndexChange,
}: MeetingViewsProps) {
  return (
    <div className="h-full w-full relative overflow-hidden bg-fy27-surface">
      <MeetingStageGallery
        isSplit={isSplit}
        onCollapseSplit={onCollapseSplit}
        isContentSharing={isContentSharing}
        onEnterFullscreen={onEnterFullscreen}
        onOpenReflow={onOpenReflow}
        onZoomAttempt={onZoomAttempt}
        showRotateHint={showRotateHint}
        activeSlideIndex={activeSlideIndex}
        onActiveSlideIndexChange={onActiveSlideIndexChange}
      />
    </div>
  );
}
