import React, { useState } from "react";
import { MeetingTile } from "@/app/components/MeetingTile";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { ParticipantOptionsSheet, type PersonBadge } from "@/app/components/ParticipantOptionsSheet";
import { useLongPress } from "@/app/lib/useLongPress";
import { SharedContentShare, SharedContentLoading } from "@/app/components/versions/mvp/SharedContentShare";
import { OriginalSlideDeckStrip } from "@/app/components/DemoSlideDeck";
import { ParticipantTray } from "@/app/components/versions/mvp/ParticipantTray";
import { buildOrderedStagePeople, type StagePerson } from "@/app/lib/stagePeople";
import imgSlideshow from "@/assets/figma/shared-content/slideshow-share.png";

const SHARER = "Aadi Kapoor";
const MAX_GRID = 6;

/** Square tile wrapper that opens the participant options sheet on long-press. */
function LongPressTile({ onLongPress, children }: { onLongPress: () => void; children: React.ReactNode }) {
  const handlers = useLongPress(onLongPress);
  return (
    <div
      className="relative min-h-0 min-w-0 select-none active:opacity-70 transition-opacity"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    >
      {children}
    </div>
  );
}

interface MeetingStageCheckpointProps {
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
  isMicOn?: boolean;
  isVideoOn?: boolean;
  isHandRaised?: boolean;
  activeEmoji?: string | null;
}

/**
 * FY27 MVP checkpoint meeting stage — Figma "Meeting Stage / Gallery"
 * (1nOzCyPZXU9ExtnvsPEeKM · 1021:37700).
 *
 * Tiles fill the full stage (header/AIL/notifications overlay on top, rendered by
 * MeetingPage). A prioritised slot shows up to 6 tiles with count-specific layouts
 * (spotlight > pin > video > rest). When others exceed 6, the top slot shows the 6
 * highest-priority tiles and the overflow + the sticky self move into a horizontal
 * ParticipantTray. When content is shared, it takes centre stage and ALL
 * participants move to the tray (self sticky right, spotlit immediately left of self).
 */
export function MeetingStageCheckpoint({
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
  isMicOn = true,
  isVideoOn = true,
  isHandRaised = false,
  activeEmoji,
}: MeetingStageCheckpointProps) {
  const { raisedHands, admittedParticipants, spotlightedIds, pinnedIds, removedIds } = useActiveMeeting();
  const [optionsFor, setOptionsFor] = useState<{ id: string; name: string; badge?: PersonBadge } | null>(null);

  // Priority-ordered (DESCENDING) roster — shared builder keeps the grid, tray,
  // and fullscreen gallery in perfect agreement.
  const ordered = buildOrderedStagePeople({ raisedHands, admittedParticipants, spotlightedIds, pinnedIds, removedIds });

  const openOptions = (p: StagePerson) =>
    setOptionsFor({ id: p.id, name: p.name, badge: p.suspected ? "suspected" : undefined });

  const tile = (p: StagePerson) => (
    <LongPressTile key={p.id} onLongPress={() => openOptions(p)}>
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
  );

  const trayFor = (list: StagePerson[]) => (
    <ParticipantTray
      participants={list}
      isVideoOn={isVideoOn}
      isMicOn={isMicOn}
      isHandRaised={isHandRaised}
      activeEmoji={activeEmoji}
      onParticipantLongPress={(p) =>
        setOptionsFor({ id: p.id, name: p.name, badge: p.suspected ? "suspected" : undefined })
      }
    />
  );

  const optionsSheet = (
    <ParticipantOptionsSheet
      open={!!optionsFor}
      onClose={() => setOptionsFor(null)}
      id={optionsFor?.id ?? ""}
      name={optionsFor?.name ?? ""}
      badge={optionsFor?.badge}
    />
  );

  // ── Split (a panel is open): single large tile (shared content or active speaker) ──
  if (isSplit) {
    const active = ordered.find((p) => p.state === "active-speaker") ?? ordered[0];
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
          ) : active ? (
            <MeetingTile
              name={active.name}
              display={active.display}
              state={active.state}
              raisedHand={active.raisedHand}
              imageSrc={active.img}
            />
          ) : null}
        </button>
        {optionsSheet}
      </div>
    );
  }

  // ── Content shared: content centre-stage + ALL participants in the tray ──
  if (isContentSharing) {
    const allAsc = [...ordered].reverse(); // ascending → highest priority last (nearest self)
    return (
      <div className="bg-fy27-surface flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-hidden">
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
            splitLayout
          />
        </div>
        {trayFor(allAsc)}
        {optionsSheet}
      </div>
    );
  }

  const n = ordered.length;

  // ── Overflow (>6): top-6 prioritised grid + tray(overflow + self) ──
  if (n > MAX_GRID) {
    const top6 = ordered.slice(0, MAX_GRID);
    const overflowAsc = [...ordered.slice(MAX_GRID)].reverse(); // highest of the overflow nearest self
    return (
      <div className="bg-fy27-surface flex flex-col h-full">
        <div className="grid grid-cols-2 grid-rows-3 gap-[2px] flex-1 min-h-0 p-[2px]">
          {top6.map(tile)}
        </div>
        {trayFor(overflowAsc)}
        {optionsSheet}
      </div>
    );
  }

  // ── Prioritised slot (≤6): count-specific fit-to-height layout ──
  return (
    <div className="bg-fy27-surface h-full p-[2px]">
      <PrioritySlot count={n} tiles={ordered.map(tile)} />
      {optionsSheet}
    </div>
  );
}

/** Count-specific grid layouts (Figma 1021:37721/37728/37734/37743/37751/37798). */
function PrioritySlot({ count, tiles }: { count: number; tiles: React.ReactNode[] }) {
  switch (count) {
    case 0:
      return <div className="h-full" />;
    case 1:
      return <div className="grid h-full">{tiles[0]}</div>;
    case 2:
      return <div className="grid grid-rows-2 gap-[2px] h-full">{tiles}</div>;
    case 3:
      return (
        <div className="grid grid-cols-2 grid-rows-2 gap-[2px] h-full">
          <div className="col-span-2 min-h-0">{tiles[0]}</div>
          {tiles[1]}
          {tiles[2]}
        </div>
      );
    case 4:
      return <div className="grid grid-cols-2 grid-rows-2 gap-[2px] h-full">{tiles}</div>;
    case 5:
      return (
        <div className="grid grid-cols-2 grid-rows-3 gap-[2px] h-full">
          {tiles[0]}
          {tiles[1]}
          {tiles[2]}
          {tiles[3]}
          <div className="col-span-2 min-h-0">{tiles[4]}</div>
        </div>
      );
    case 6:
    default:
      return <div className="grid grid-cols-2 grid-rows-3 gap-[2px] h-full">{tiles.slice(0, 6)}</div>;
  }
}
