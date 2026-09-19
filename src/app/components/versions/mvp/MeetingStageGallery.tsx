import React, { useState } from "react";
import { MeetingTile, type TileDisplay, type TileState } from "@/app/components/MeetingTile";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { GALLERY_ROSTER } from "@/app/lib/meetingRoster";
import { ParticipantOptionsSheet, type PersonBadge } from "@/app/components/ParticipantOptionsSheet";
import { useLongPress } from "@/app/lib/useLongPress";
import { SharedContentShare, SharedContentLoading } from "@/app/components/versions/mvp/SharedContentShare";
import { OriginalSlideDeckStrip } from "@/app/components/DemoSlideDeck";
import imgSlideshow from "@/assets/figma/shared-content/slideshow-share.png";

/** Square tile wrapper that opens the participant options sheet on long-press. */
function LongPressTile({ onLongPress, children }: { onLongPress: () => void; children: React.ReactNode }) {
  const handlers = useLongPress(onLongPress);
  return (
    <div
      className="aspect-square select-none active:opacity-70 transition-opacity"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      {children}
    </div>
  );
}

interface MeetingStageGalleryProps {
  isSplit: boolean;
  onCollapseSplit?: () => void;
  isContentSharing?: boolean;
  onEnterFullscreen?: () => void;
  onOpenReflow?: () => void;
  onZoomAttempt?: () => void;
  showRotateHint?: boolean;
  onSlideScaleComputed?: (index: number, scale: number) => void;
  isContentLoading?: boolean;
  activeSlideIndex?: number;
  onActiveSlideIndexChange?: (index: number) => void;
}

const SHARER = "Aadi Kapoor";

/**
 * FY27 MVP gallery stage — a tightly-packed grid of redesigned square participant
 * tiles (MeetingTile), built from the canonical roster. A tile's raised-hand state
 * comes ONLY from the system's `raisedHands` set (ActiveMeetingContext), so it
 * always agrees with the raised-hands panel. Drop-in for the shared MeetingStage.
 */
export function MeetingStageGallery({
  isSplit,
  onCollapseSplit,
  isContentSharing = false,
  onEnterFullscreen,
  onOpenReflow,
  onZoomAttempt,
  showRotateHint,
  onSlideScaleComputed,
  isContentLoading,
  activeSlideIndex,
  onActiveSlideIndexChange,
}: MeetingStageGalleryProps) {
  const { raisedHands, admittedParticipants, spotlightedIds, pinnedIds, removedIds } = useActiveMeeting();
  const [optionsFor, setOptionsFor] = useState<{ id: string; name: string; badge?: PersonBadge } | null>(null);

  const people = [
    ...GALLERY_ROSTER.map((p) => ({
      id: p.id,
      name: p.name,
      img: p.avatar,
      display: p.display as TileDisplay,
      state: (p.activeSpeaker ? "active-speaker" : "muted") as TileState,
      raisedHand: raisedHands.includes(p.id),
      suspected: false,
    })),
    // Lobby guests just admitted — added live (benign auto-removed after 30s;
    // suspected threats are kept and carry the danger warning, via context).
    ...admittedParticipants.map((a) => ({
      id: a.id,
      name: a.name,
      img: a.avatar,
      display: a.display as TileDisplay,
      state: "muted" as TileState,
      raisedHand: false,
      suspected: a.suspected,
    })),
  ]
    .filter((p) => !removedIds.includes(p.id))
    .map((p) => ({ ...p, pinned: pinnedIds.includes(p.id), spotlighted: spotlightedIds.includes(p.id) }));

  // Gallery hierarchy: spotlighted → pinned → video-on → rest. Stable sort keeps
  // the roster order within each tier.
  const rank = (p: (typeof people)[number]) =>
    p.spotlighted ? 3 : p.pinned ? 2 : p.display === "video" ? 1 : 0;
  const ordered = [...people].sort((a, b) => rank(b) - rank(a));

  // Split mode: a single large tile (shared content, else the first active speaker).
  if (isSplit) {
    const active = people.find((p) => p.state === "active-speaker") ?? people[0];
    return (
      <div className="bg-fy27-surface flex flex-col relative h-full pb-1">
        <button onClick={onCollapseSplit} className="w-full h-full p-[2px]">
          {isContentSharing ? (
            isContentLoading ? (
              <div className="relative h-full">
                <div className="absolute inset-0 invisible">
                  <OriginalSlideDeckStrip activeIndex={activeSlideIndex} onSlideScaleComputed={onSlideScaleComputed} />
                </div>
                <SharedContentLoading compact />
              </div>
            ) : <MeetingTile name={SHARER} nameTag={`${SHARER}'s content`} display="shared" sharedSrc={imgSlideshow} />
          ) : (
            <MeetingTile
              name={active.name}
              display={active.display}
              state={active.state}
              raisedHand={active.raisedHand}
              imageSrc={active.img}
            />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-fy27-surface flex flex-col relative h-full">
      <div className="flex-1 overflow-y-auto pb-[100px]">
        {/* Shared content — presenter slideshow share (Figma 996:37625) */}
        {isContentSharing && (
          <SharedContentShare
            sharerName={SHARER}
            onMaximize={onEnterFullscreen}
            onReflow={onOpenReflow}
            onZoomAttempt={onZoomAttempt}
            showRotateHint={showRotateHint}
            onSlideScaleComputed={onSlideScaleComputed}
            isContentLoading={isContentLoading}
            activeSlideIndex={activeSlideIndex}
            onActiveSlideIndexChange={onActiveSlideIndexChange}
          />
        )}

        {/* Gallery — tightly-packed 2-col grid of square tiles (hairline gutter, no padding) */}
        <div className="grid grid-cols-2 gap-[2px]">
          {ordered.map((p) => (
            <LongPressTile
              key={p.id}
              onLongPress={() => setOptionsFor({ id: p.id, name: p.name, badge: p.suspected ? "suspected" : undefined })}
            >
              <MeetingTile
                name={p.name}
                display={p.display}
                state={p.state}
                raisedHand={p.raisedHand}
                imageSrc={p.img}
                suspected={p.suspected}
                pinned={p.pinned}
                spotlighted={p.spotlighted}
              />
            </LongPressTile>
          ))}
        </div>
      </div>

      <ParticipantOptionsSheet
        open={!!optionsFor}
        onClose={() => setOptionsFor(null)}
        id={optionsFor?.id ?? ""}
        name={optionsFor?.name ?? ""}
        badge={optionsFor?.badge}
      />
    </div>
  );
}
