import { MeetingStageCheckpoint } from "@/app/components/versions/mvp/MeetingStageCheckpoint";

/**
 * MVP checkpoint meeting stage — the `MeetingViews` slot override for the
 * `mvp-checkpoint` version. A drop-in for SwipeableViews/MeetingViewsGallery:
 * Gallery only (no swipe / page dots), but with the checkpoint's prioritised
 * 6-tile slot + overflow ParticipantTray. Forwards the self mic/video/hand +
 * reaction state through to the stage (the self tile lives in the tray when
 * others > 6 or content is shared).
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
  isMicOn?: boolean;
  isVideoOn?: boolean;
  onMicToggle?: () => void;
  onHandRaiseToggle?: () => void;
  isHandRaised?: boolean;
  onViewChange?: (viewIndex: number) => void;
  activeEmoji?: string | null;
}

export function MeetingViewsCheckpoint({
  isSplit,
  onCollapseSplit,
  isContentSharing = false,
  onEnterFullscreen,
  onOpenReflow,
  onZoomAttempt,
  showRotateHint,
  activeSlideIndex,
  onActiveSlideIndexChange,
  isMicOn,
  isVideoOn,
  isHandRaised,
  activeEmoji,
}: MeetingViewsProps) {
  return (
    <div className="h-full w-full relative overflow-hidden bg-fy27-surface">
      <MeetingStageCheckpoint
        isSplit={isSplit}
        onCollapseSplit={onCollapseSplit}
        isContentSharing={isContentSharing}
        onEnterFullscreen={onEnterFullscreen}
        onOpenReflow={onOpenReflow}
        onZoomAttempt={onZoomAttempt}
        showRotateHint={showRotateHint}
        activeSlideIndex={activeSlideIndex}
        onActiveSlideIndexChange={onActiveSlideIndexChange}
        isMicOn={isMicOn}
        isVideoOn={isVideoOn}
        isHandRaised={isHandRaised}
        activeEmoji={activeEmoji}
      />
    </div>
  );
}
