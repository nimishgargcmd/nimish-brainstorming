import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { ChatPanel } from "@/app/components/ChatPanel";
import { CopilotPanel } from "@/app/components/CopilotPanel";
import { MorePanel } from "@/app/components/MorePanel";
import { RttPanel } from "@/app/components/RttPanel";
import { useRttSimulation } from "@/app/lib/useRttSimulation";
import { BottomNav } from "@/app/components/BottomNav";
import { SelfVideoTile } from "@/app/components/SelfVideoTile";
import { SelfControlsProvider } from "@/app/components/SelfControlsContext";
import { FloatingSelfTile } from "@/app/components/versions/mvp/FloatingSelfTile";
import { AudioOnlyStage } from "@/app/components/versions/mvp/AudioOnlyStage";
import { CaptionBox } from "@/app/components/CaptionBox";
import { AdditionalInfoLayer } from "@/app/components/AdditionalInfoLayer";
import { ImmersiveMeetingBar } from "@/app/components/ImmersiveMeetingBar";
import { ImmersiveSplitProvider, IMMERSIVE_OFFSET_PX } from "@/app/components/ImmersiveSplitContext";
import { PanelResizeHandle } from "@/app/components/PanelResizeHandle";
import { MeetingHeader } from "@/app/components/MeetingHeader";
import type { MeetingHeaderHandle } from "@/app/components/MeetingHeader";
import { NotificationUFD, type NotificationConfig } from "@/app/components/NotificationUFD";
import { AgendaTimerPanel } from "@/app/components/AgendaTimerPanel";
import { NotificationsPanel } from "@/app/components/NotificationsPanel";
import { RaisedHandsPanel } from "@/app/components/RaisedHandsPanel";
import { SwipeableViews } from "@/app/components/SwipeableViews";
import { useToast } from "@/app/components/ToastContext";
import { useVersionedComponent } from "@/app/versioning/useVersionedComponent";
import { useVersion } from "@/app/versioning/VersionContext";
import { isMvpFamily } from "@/app/versioning/versions";
import { GALLERY_PARTICIPANT_COUNT, MEETING_ROSTER, SELF_ID, rosterById } from "@/app/lib/meetingRoster";
import { raisedHandNameToId, type Participant } from "@/app/components/ParticipantsPanel";
import { UBar } from "@/app/components/UBar";
import { FullscreenContentView } from "@/app/components/FullscreenContentView";
import { LiquidReflowContentView } from "@/app/components/LiquidReflowContentView";
import { useActiveMeeting, type AgendaItem } from "@/app/components/ActiveMeetingContext";
import { useCamera } from "@/app/components/CameraContext";
import { AudioModeProvider } from "@/app/components/AudioModeContext";
import { AudioSettingListRow } from "@/app/components/AudioSettingListRow";
import { playToggleTone } from "@/app/lib/toggleTone";
import { VoiceIsolationConsentSheet } from "@/app/components/VoiceIsolationConsentSheet";

// Import Figma placeholder images for chat avatars
import imgBabak from "figma:asset/6900c5f1ebcee87405a464dc927c93633e66e145.png";
import imgMiguel from "figma:asset/685fc6dc030aab2cbea5b15f523d9ce42c11d689.png";
import imgJessica from "figma:asset/3b6bf95da1f13af67c0b3a5e3c9534b640591ce5.png";
import imgRay from "figma:asset/a55a7173204f1d7f74adab6c38113bc9eedbb180.png";
import imgSarah from "figma:asset/503fddd74dcc978ba951b5c79ebe96b95453b1eb.png";

// Import emoji assets for seed chat reactions
import imgThumbsUp from "figma:asset/b7bdd4e332f1134cea6b347137499723925005ef.png";
import imgRedHeart from "figma:asset/59520d231a783bb20cd3d4f98dfaec2de858b210.png";
import imgClappingHands from "figma:asset/cebe50ea4c5d9b448454b19dd79074e5c5b4d898.png";

// Static raised-hands lookups (don't depend on render state).
// Canonical roster → the panels' Participant shape (FY27 MVP).
const MVP_ROSTER_PARTICIPANTS: Participant[] = MEETING_ROSTER.map((p) => ({
  id: p.id, name: p.name, avatar: p.avatar, presence: p.presence, role: p.role, isMicMuted: p.isMicMuted,
  isVideoOff: p.display !== "video",
}));
// Roster id → legacy short name (Final-Vision name-map consumers).
const ID_TO_SHORT_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(raisedHandNameToId).map(([k, v]) => [v, k])
);

// Notification types — embeds the structured Teams 2 "UFD card" config.
interface Notification extends NotificationConfig {
  id: number;
  type: "critical" | "informational";
  // Stable identity for dedupe/snooze checks, independent of display copy.
  nudgeId?: string;
  // Overrides DEFAULT_UFD_DISMISS_MS for nudges that need longer on stage.
  autoDismissMs?: number;
}

const VOICE_ISOLATION_SPEAKER_NUDGE_ID = "voice-isolation-speaker-turn-off";
const DEFAULT_UFD_DISMISS_MS = 4000;
const VOICE_NOISE_NUDGE_DISMISS_MS = 10000;
// Promote-landscape rotate-hint icon (brainstorming/screensharing idea 1).
const ROTATE_HINT_SHOW_DELAY_MS = 5000;
const ROTATE_HINT_VISIBLE_MS = 4000;

export function MeetingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const meeting = useActiveMeeting();
  const camera = useCamera();
  const { show: showToast } = useToast();

  const [activePanel, setActivePanel] = useState<
    "chat" | "copilot" | "more" | "agenda" | "notifications" | "hands" | "rtt" | null
  >(null);
  const [isVideoOn, setIsVideoOn] = useState(meeting.isVideoOn);
  const [isMicOn, setIsMicOn] = useState(meeting.isMicOn);
  // Accidental-touch guard: long-press the self-tile to disable mic/camera taps.
  const [controlsLocked, setControlsLocked] = useState(false);
  // Caller Kit accidental-touch guard: tapping camera-on there jumps straight here
  // (camera still off) and asks for confirmation on this screen instead.
  const [cameraOnConfirmOpen, setCameraOnConfirmOpen] = useState(false);
  useEffect(() => {
    if ((location.state as { confirmCameraOn?: boolean } | null)?.confirmCameraOn) {
      setCameraOnConfirmOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // In-meeting A/V settings: crops the self feed to a widescreen frame (mirrors PreJoinPage).
  const [isDesktopFriendlyView, setIsDesktopFriendlyView] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
  const { isRecording, setIsRecording, areCaptionsOn, toggleCaptions, notificationCount: notificationCounter, incrementNotificationCount, decrementNotificationCount, resetNotificationCount, lobbyCount, setLobbyCount } = meeting;
  const { isRttOn, rttCaptionsOn, startRtt } = meeting;
  const hasLobbyGuests = lobbyCount > 0;
  const [morePanelInitialView, setMorePanelInitialView] = useState<"main" | "participants">("main");

  // Immersive (drag-to-maximize) split — resets to the default 35:65 each time a panel opens/changes.
  const [isImmersive, setIsImmersive] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const panelDragRef = useRef<{ startY: number; startH: number; moved: number; lastH: number } | null>(null);
  useEffect(() => { setIsImmersive(false); }, [activePanel]);

  // Divider drag: panel follows the finger between the default (65vh) and immersive (fill) detents.
  const panelDefaultPx = () => window.innerHeight * 0.65;
  const panelFillPx = () => {
    const screen = document.querySelector(".app-safe-top");
    const topInset = screen ? parseFloat(getComputedStyle(screen).paddingTop) || 0 : 0;
    return window.innerHeight - topInset - IMMERSIVE_OFFSET_PX;
  };

  const handlePanelDragDown = useCallback((e: React.PointerEvent) => {
    const startH = isImmersive ? panelFillPx() : panelDefaultPx();
    panelDragRef.current = { startY: e.clientY, startH, moved: 0, lastH: startH };
    setIsDraggingPanel(true);
    setDragHeight(startH);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [isImmersive]);

  const handlePanelDragMove = useCallback((e: React.PointerEvent) => {
    const d = panelDragRef.current;
    if (!d) return;
    const delta = d.startY - e.clientY; // up grows the panel
    d.moved = Math.max(d.moved, Math.abs(delta));
    const h = Math.min(panelFillPx(), Math.max(panelDefaultPx(), d.startH + delta));
    d.lastH = h;
    setDragHeight(h);
  }, []);

  const handlePanelDragUp = useCallback(() => {
    const d = panelDragRef.current;
    panelDragRef.current = null;
    setIsDraggingPanel(false);
    setDragHeight(null);
    if (!d) return;
    if (d.moved < 6) { setIsImmersive((v) => !v); return; } // tap toggles
    const mid = (panelDefaultPx() + panelFillPx()) / 2;
    setIsImmersive(d.lastH >= mid);
  }, []);

  // ┌─────────────────────────────────────────────────────────────────────┐
  // │  CONTENT SHARING TOGGLE                                            │
  // └─────────────────────────────────────────────────────────────────────┘
  const [isContentSharing, setIsContentSharing] = useState(meeting.isContentSharing);

  // Fullscreen shared content view — immersive landscape mode
  const [isFullscreenContent, setIsFullscreenContent] = useState(false);

  // Liquid Mode-style easy-read (reflow) view — opt-in, portrait-native (brainstorming/screensharing idea 2)
  const [isLiquidReflowOpen, setIsLiquidReflowOpen] = useState(false);
  // Which slide is showing, shared between the stage strip and easy-read so switching
  // modes stays on the same slide instead of resetting to the first one.
  const [stageSlideIndex, setStageSlideIndex] = useState(0);

  // Promote-landscape rotate-hint icon (brainstorming/screensharing idea 1) — small animated
  // icon next to the easy-read button, shown once per share (5s in, or 2 zoom attempts).
  const [showRotateHint, setShowRotateHint] = useState(false);
  const zoomAttemptCountRef = useRef(0);
  const rotateHintFiredRef = useRef(false);
  const rotateHintShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotateHintHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsContentSharingForNudgeRef = useRef(isContentSharing);

  // Current view state (0: on-the-go, 1: gallery, 2: focus)
  const [currentView, setCurrentView] = useState(1);

  // Versioned meeting stage: Final Vision = full SwipeableViews carousel;
  // FY27 MVP = gallery only (no swipe / page dots). Falls back to SwipeableViews.
  const MeetingViews = (useVersionedComponent("MeetingViews") ?? SwipeableViews) as typeof SwipeableViews;
  const Header = (useVersionedComponent("Header") ?? MeetingHeader) as typeof MeetingHeader;

  // FY27 MVP layout divergence: docked U-bar vs Final Vision's floating BottomNav.
  const { activeVersionId } = useVersion();
  const isFy27Mvp = isMvpFamily(activeVersionId);
  // MVP checkpoint — stage redesign: header/AIL/notifications overlay the tiles,
  // prioritised 6-tile slot + overflow ParticipantTray, self encapsulated in the
  // tray (no floating PiP) when others > 6 or content is shared.
  const isMvpCheckpoint = activeVersionId === "mvp-checkpoint";
  // Meeting screens default to dark mode across variants. Applying `.dark` to
  // the meeting subtree redeclares every --fy27-*/shadcn token to its dark
  // value (custom properties inherit down the DOM tree), so in-meeting UI stays
  // dark regardless of the global theme.
  const meetingThemeClass = "dark";

  // ── Raised hands — single source of truth = ActiveMeetingContext.raisedHands (ids) ──
  const isHandRaised = meeting.raisedHands.includes(SELF_ID);

  // FY27 MVP roster with the SELF row's mic/camera synced to the live meeting
  // controls, so toggling video/mic in the dock reflects in the participant list.
  const mvpRosterParticipants = useMemo(
    () =>
      MVP_ROSTER_PARTICIPANTS.map((p) =>
        p.id === SELF_ID ? { ...p, isMicMuted: !isMicOn, isVideoOff: !isVideoOn } : p
      ),
    [isMicOn, isVideoOn]
  );
  // {name}[] adapter for the legacy consumers (AIL count pill, Copilot, More, Fullscreen).
  const displayRaisedHands = isFy27Mvp
    ? meeting.raisedHands.map((id) => ({ name: rosterById(id)?.name ?? id }))
    : meeting.raisedHands.map((id) => ID_TO_SHORT_NAME[id]).filter(Boolean).map((name) => ({ name }));

  // ┌─────────────────────────────────────────────────────────────────────┐
  // │  AGENDA TIMER STATE  (persisted in context across backgrounding)   │
  // └─────────────────────────────────────────────────────────────────────┘
  // Agenda topics live in context (editable + persisted across backgrounding)
  const agendaItems = meeting.agendaItems;

  const currentTopicIndex = meeting.agendaTopicIndex;
  const isAgendaPaused = meeting.agendaPaused;

  const currentTopic = agendaItems[currentTopicIndex] ?? agendaItems[agendaItems.length - 1];

  // FY27 MVP — ambient RTT simulation. Runs only while the meeting is foreground
  // (this component mounted), RTT is on, and its captions toggle is on.
  useRttSimulation({
    enabled: isFy27Mvp && isRttOn && rttCaptionsOn,
    meetingTitle: meeting.meetingTitle,
    currentTopic: currentTopic?.title ?? "",
  });

  // Minutes already spent on the in-progress topic — clamps the edit-view duration stepper.
  const currentTopicElapsedSec = isAgendaPaused
    ? Math.max(0, currentTopic.duration * 60 - (meeting.agendaPausedRemaining ?? currentTopic.duration * 60))
    : Math.max(0, Math.floor((Date.now() - meeting.agendaTimerEpoch) / 1000));
  const currentTopicElapsedMin = currentTopicElapsedSec / 60;
  const agendaItemsWithStatus = agendaItems.map((item, i) => ({
    ...item,
    status: i < currentTopicIndex ? "complete" as const
          : i === currentTopicIndex ? "in-progress" as const
          : "not-started" as const,
  }));

  // On mount: auto-advance through any topics that elapsed while backgrounded
  useEffect(() => {
    if (isAgendaPaused) return;
    let idx = meeting.agendaTopicIndex;
    let epoch = meeting.agendaTimerEpoch;
    while (idx < agendaItems.length - 1) {
      const duration = agendaItems[idx].duration * 60;
      const elapsed = Math.floor((Date.now() - epoch) / 1000);
      if (elapsed >= duration) {
        epoch = epoch + duration * 1000;
        idx++;
      } else {
        break;
      }
    }
    if (idx !== meeting.agendaTopicIndex) {
      meeting.updateAgendaState({ agendaTopicIndex: idx, agendaTimerEpoch: epoch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimerComplete = useCallback(() => {
    if (meeting.agendaTopicIndex < meeting.agendaItems.length - 1) {
      meeting.updateAgendaState({
        agendaTopicIndex: meeting.agendaTopicIndex + 1,
        agendaTimerEpoch: Date.now(),
        agendaPausedRemaining: null,
      });
    }
  }, [meeting]);

  const handleAgendaReset = useCallback(() => {
    meeting.updateAgendaState({
      agendaTopicIndex: 0,
      agendaPaused: false,
      agendaTimerEpoch: Date.now(),
      agendaPausedRemaining: null,
    });
  }, [meeting]);

  // Persist agenda edits. If the in-progress topic's duration changed while paused,
  // shift the saved remaining by the same delta so the edit isn't lost on resume.
  // (When running, the epoch-based countdown recomputes remaining automatically.)
  const handleSaveAgendaItems = useCallback((items: AgendaItem[]) => {
    const oldDur = meeting.agendaItems[meeting.agendaTopicIndex]?.duration;
    const newDur = items[meeting.agendaTopicIndex]?.duration;
    if (
      meeting.agendaPaused &&
      meeting.agendaPausedRemaining != null &&
      oldDur != null &&
      newDur != null &&
      newDur !== oldDur
    ) {
      meeting.updateAgendaState({
        agendaPausedRemaining: Math.max(0, meeting.agendaPausedRemaining + (newDur - oldDur) * 60),
      });
    }
    meeting.setAgendaItems(items);
  }, [meeting]);

  const handleAgendaPause = useCallback(() => {
    if (meeting.agendaPaused) {
      // Resuming: adjust epoch so calculated remaining matches saved remaining
      const topicDuration = (meeting.agendaItems[meeting.agendaTopicIndex]?.duration ?? 10) * 60;
      const saved = meeting.agendaPausedRemaining ?? topicDuration;
      const newEpoch = Date.now() - (topicDuration - saved) * 1000;
      meeting.updateAgendaState({
        agendaPaused: false,
        agendaTimerEpoch: newEpoch,
        agendaPausedRemaining: null,
      });
    } else {
      // Pausing: calculate and save current remaining
      const topicDuration = (meeting.agendaItems[meeting.agendaTopicIndex]?.duration ?? 10) * 60;
      const elapsed = Math.floor((Date.now() - meeting.agendaTimerEpoch) / 1000);
      const remaining = Math.max(0, topicDuration - elapsed);
      meeting.updateAgendaState({
        agendaPaused: true,
        agendaPausedRemaining: remaining,
      });
    }
  }, [meeting]);

  // Notification state
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [notificationQueue, setNotificationQueue] = useState<Notification[]>([]);
  const notificationIdRef = useRef(1);
  const notificationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const demoTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Recording notification alternates: odd triggers (1st, 3rd, ...) are indicator + voiceover
  // only, even triggers (2nd, 4th, ...) surface the full banner.
  const recordingNotificationCountRef = useRef(0);
  const [recordingAnnouncement, setRecordingAnnouncement] = useState("");
  const announceRecordingStarted = useCallback(() => {
    const text = "Recording and transcription started";
    // Clear-then-set on the next tick so repeated identical text still re-triggers VoiceOver/TalkBack.
    setRecordingAnnouncement("");
    window.setTimeout(() => setRecordingAnnouncement(text), 50);
    // Speak it out loud too — aria-live is silent unless a real screen reader is running,
    // and this proto needs to be audible when demoed in a plain browser.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  }, []);
  const demoVoicePromptTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noisePromptSnoozeUntilRef = useRef(0);
  const voiceIsolationSpeakerPromptSnoozeUntilRef = useRef(0);
  const voiceNoiseModeRef = useRef<"off" | "noise-suppression" | "voice-isolation">("noise-suppression");
  const audioRouteRef = useRef<"phone" | "speaker" | "bluetooth">("phone");
  const voiceIsolationUserPreferenceOnRef = useRef(false);
  const r92AutoRestoreVoiceIsolationRef = useRef(false);
  const previousAudioRouteRef = useRef<"phone" | "speaker" | "bluetooth">("phone");
  const currentNotificationTypeRef = useRef<"critical" | "informational" | null>(null);
  // Keep a ref mirror of the queue so timer closures always see the latest value
  const notificationQueueRef = useRef<Notification[]>([]);
  const { seenNotificationTypesRef } = meeting;
  // Mirror of currentNotification for use inside stable callbacks (avoids stale closures)
  const currentNotificationRef = useRef<Notification | null>(null);
  // Ref mirror of whether the notifications hub is open — read inside stable callbacks
  // to avoid incrementing the badge when the user is actively viewing the hub.
  const isNotificationHubOpenRef = useRef(false);

  // Sync queue ref whenever queue state changes
  useEffect(() => {
    notificationQueueRef.current = notificationQueue;
  }, [notificationQueue]);

  // Sync currentNotification ref so stable callbacks can read the latest value
  useEffect(() => {
    currentNotificationRef.current = currentNotification;
  }, [currentNotification]);

  // Advance to the next notification in the queue — or clear if empty.
  // Uses the ref so timer closures always read the latest queue.
  const advanceNotification = useCallback(() => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    const queue = notificationQueueRef.current;
    if (queue.length > 0) {
      const next = queue[0];
      setCurrentNotification(next);
      currentNotificationTypeRef.current = next.type;
      setNotificationQueue(queue.slice(1));
      // All UFDs auto-dismiss after 4s (including the lobby card) unless they override it.
      notificationTimerRef.current = setTimeout(() => advanceNotification(), next.autoDismissMs ?? DEFAULT_UFD_DISMISS_MS);
    } else {
      setCurrentNotification(null);
      currentNotificationTypeRef.current = null;
    }
  }, []);

  // Pause the auto-dismiss timer while a notification is expanded; restart a
  // fresh 4s on collapse. MeetingPage owns the timer (advanceNotification).
  const handleNotificationExpandChange = useCallback((expanded: boolean) => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    if (!expanded) {
      const duration = currentNotificationRef.current?.autoDismissMs ?? DEFAULT_UFD_DISMISS_MS;
      notificationTimerRef.current = setTimeout(() => advanceNotification(), duration);
    }
  }, [advanceNotification]);

  // Remove the lobby UFD (active + queued) — called when the lobby is cleared.
  const dismissLobbyNotifications = useCallback(() => {
    notificationQueueRef.current = notificationQueueRef.current.filter((n) => n.icon !== "lobby");
    setNotificationQueue((prev) => prev.filter((n) => n.icon !== "lobby"));
    if (currentNotificationRef.current?.icon === "lobby") {
      advanceNotification();
    }
  }, [advanceNotification]);

  // Track previous mic state for mute-sound logic
  const prevMicRef = useRef(isMicOn);

  // Ref for MeetingHeader imperative show() method
  const headerRef = useRef<MeetingHeaderHandle>(null);

  // Play a short "mute" tone via Web Audio API
  const playMuteSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 400;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
      osc.onended = () => ctx.close();
    } catch {
      // Silently swallow if AudioContext is unavailable
    }
  }, []);

  // Auto-mute mic and turn off video when entering On-the-go mode
  useEffect(() => {
    if (currentView === 0) {
      if (prevMicRef.current) {
        playMuteSound();
      }
      setIsMicOn(false);
      setIsVideoOn(false);
    }
  }, [currentView, playMuteSound]);

  // Keep prevMicRef in sync with actual mic state
  useEffect(() => {
    prevMicRef.current = isMicOn;
  }, [isMicOn]);

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      if (demoVoicePromptTimerRef.current) clearTimeout(demoVoicePromptTimerRef.current);
    };
  }, []);

  // Persistent state for Chat Panel
  // Chat thread lives in context now (shared live with the "Marketing Team Sync" DM page).
  const { chatMessages, setChatMessages } = meeting;

  // Persistent state for Copilot Panel
  const [copilotMessages, setCopilotMessages] = useState<Array<{
    text: string;
    isUser: boolean;
    isLoading?: boolean;
    followUpPrompts?: string[];
    media?: { url: string; type: string }[];
  }>>([]);

  const handlePanelToggle = useCallback((panel: "chat" | "copilot" | "more" | "agenda" | "notifications" | "hands") => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === "notifications") {
        // Opening the hub acknowledges all items → clear badge (Teams desktop behavior).
        // seenNotificationTypesRef is NOT cleared here — the hub still shows historical items.
        isNotificationHubOpenRef.current = true;
        resetNotificationCount();
      } else {
        isNotificationHubOpenRef.current = false;
      }
    }
    setMorePanelInitialView("main");
  }, [activePanel, resetNotificationCount]);

  const handleClosePanel = useCallback(() => {
    setActivePanel(null);
    setMorePanelInitialView("main");
    isNotificationHubOpenRef.current = false;
  }, []);

  // Long-press self-tile toggles the mic/camera lock; double-tapping a locked
  // control in the U-bar unlocks (handled inside UBar via onUnlockControls).
  const handleToggleControlsLock = useCallback(() => {
    setControlsLocked((prev) => {
      const next = !prev;
      showToast(next ? "Mic & camera locked" : "Mic & camera unlocked", undefined, { icon: next ? "lock" : "unlock" });
      return next;
    });
  }, [showToast]);

  // A single (non-unlocking) tap on a locked mic/camera button — nudge the user
  // toward the unlock gesture instead of silently swallowing the tap.
  const handleLockedSingleTap = useCallback(() => {
    showToast("Double tap to unlock mic and camera", undefined, { icon: "info" });
  }, [showToast]);

  // Handle mic toggle with sound alerts
  const handleMicToggle = () => {
    const newMicState = !isMicOn;
    setIsMicOn(newMicState);
    playToggleTone(newMicState);
  };

  // Handle video toggle with the same audio feedback as mic
  const handleVideoToggle = () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    playToggleTone(newVideoState);
  };

  // Handle emoji reaction
  const handleEmojiClick = useCallback((emojiSrc: string) => {
    setActiveEmoji(emojiSrc);
    setTimeout(() => { setActiveEmoji(null); }, 4000);
  }, []);

  // Handle hand raise toggle (self) — single source of truth in context.
  const handleHandRaiseToggle = useCallback(() => {
    meeting.toggleHand(SELF_ID);
  }, [meeting]);

  // Participant data
  const participants = [
    { id: 1, name: "Aadi Kapoor", image: "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: false },
    { id: 2, name: "Sarah Johnson", image: "https://images.unsplash.com/photo-1672685667592-0392f458f46f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: true },
    { id: 3, name: "Miguel Silva", image: "https://images.unsplash.com/photo-1758873272955-3b066dd11c6b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: false },
    { id: 4, name: "Jessica Kline", image: "https://images.unsplash.com/photo-1762341118920-0b65e8d88aa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: false },
    { id: 5, name: "Ray Tanaka", image: "https://images.unsplash.com/photo-1652471943570-f3590a4e52ed?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: false },
    { id: 6, name: "Babak Shammas", image: "https://images.unsplash.com/photo-1762341118920-0b65e8d88aa2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400", isActive: false },
  ];
  // Participants in the meeting = stage tiles + me. FY27 MVP renders the gallery
  // roster (single source of truth); Final Vision keeps its own local list.
  const totalParticipants = (isFy27Mvp ? GALLERY_PARTICIPANT_COUNT : participants.length) + 1 + meeting.admittedParticipants.length - (isFy27Mvp ? meeting.removedIds.length : 0);

  // Checkpoint: the self tile lives INSIDE the ParticipantTray (no floating PiP)
  // when others exceed 6 or content is shared. others = total − self. In the
  // multitasking (split) view there is no tray — only a single large tile — so the
  // self falls back to the FloatingSelfTile (like FY27 MVP) whenever a panel is open.
  const othersCount = totalParticipants - 1;
  const selfInTray = isMvpCheckpoint && activePanel === null && (othersCount > 6 || isContentSharing);

  // MVP: keep the context participantCount field in sync with the live total.
  useEffect(() => {
    if (isFy27Mvp) meeting.setParticipantCount(totalParticipants);
  }, [isFy27Mvp, totalParticipants, meeting.setParticipantCount]);

  // Start the meeting in the context when this page mounts (if not already active)
  useEffect(() => {
    if (!meeting.isActive) {
      meeting.startMeeting("Marketing Team Sync", totalParticipants);
    } else {
      // Returning from background — sync participant count
      meeting.setParticipantCount(totalParticipants);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block iOS Safari edge-swipe back/forward navigation while in meeting
  useEffect(() => {
    // 1. Popstate guard — if browser back somehow fires, push back immediately
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    // 2. Intercept touches that start near the left/right screen edges
    //    to prevent Safari from initiating its swipe-back/forward gesture.
    //    Allow touches on interactive elements (buttons, links) so they still receive clicks.
    const EDGE_WIDTH = 30; // px from screen edge
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && (touch.clientX < EDGE_WIDTH || touch.clientX > window.innerWidth - EDGE_WIDTH)) {
        const target = e.target as HTMLElement;
        if (target.closest('button, a, [role="button"], input, select, textarea')) return;
        e.preventDefault();
      }
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: false });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // Sync mic/video from context when returning from background
  useEffect(() => {
    if (meeting.isActive && !meeting.isBackgrounded) {
      setIsMicOn(meeting.isMicOn);
      setIsVideoOn(meeting.isVideoOn);
      setIsContentSharing(meeting.isContentSharing);
    }
  }, [meeting.isActive, meeting.isBackgrounded]);

  // Sync local mic/video changes back to context
  useEffect(() => {
    if (meeting.isActive) {
      meeting.setMicOn(isMicOn);
    }
  }, [isMicOn]);

  useEffect(() => {
    if (meeting.isActive) {
      meeting.setVideoOn(isVideoOn);
    }
  }, [isVideoOn]);

  // Sync shared camera track with local video state
  useEffect(() => {
    camera.setTrackEnabled(isVideoOn);
  }, [isVideoOn, camera.setTrackEnabled]);

  // Acquire camera when meeting page mounts (idempotent)
  useEffect(() => {
    camera.acquireCamera();
  }, [camera.acquireCamera]);

  // Sync local content-sharing state back to context
  useEffect(() => {
    if (meeting.isActive) {
      meeting.setContentSharing(isContentSharing);
    }
  }, [isContentSharing]);

  // Notification handling — only used for initial queue pickup when no notification is active
  useEffect(() => {
    if (notificationQueue.length > 0 && !currentNotification) {
      advanceNotification();
    }
  }, [notificationQueue, currentNotification, advanceNotification]);

  const triggerNotification = useCallback((notification: Omit<Notification, "id">) => {
    const newNotification: Notification = { ...notification, id: notificationIdRef.current++ };
    const notificationIcon = notification.icon;
    if (!seenNotificationTypesRef.current.has(notificationIcon)) {
      seenNotificationTypesRef.current.add(notificationIcon);
      // Don't increment the badge if the hub is open — the user is already looking at it.
      if (!isNotificationHubOpenRef.current) {
        incrementNotificationCount();
      }
    }
    const currentType = currentNotificationTypeRef.current;
    if (currentType === "informational" && notification.type === "critical") {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
      setCurrentNotification(newNotification);
      currentNotificationTypeRef.current = notification.type;
      notificationTimerRef.current = setTimeout(() => advanceNotification(), newNotification.autoDismissMs ?? DEFAULT_UFD_DISMISS_MS);
      return;
    }
    if (currentType === "critical" && notification.type === "informational") return;
    if (currentType === "critical" && notification.type === "critical") {
      setNotificationQueue(prev => [...prev, newNotification]);
      return;
    }
    if (!currentType) {
      setCurrentNotification(newNotification);
      currentNotificationTypeRef.current = notification.type;
      notificationTimerRef.current = setTimeout(() => advanceNotification(), newNotification.autoDismissMs ?? DEFAULT_UFD_DISMISS_MS);
    } else {
      setNotificationQueue(prev => [...prev, newNotification]);
    }
  }, [advanceNotification]);

  // Hard dismiss — user manually swiped or tapped X.
  // They have read the notification → remove from hub, decrement counter.
  const dismissNotification = useCallback(() => {
    const current = currentNotificationRef.current;
    if (current) {
      seenNotificationTypesRef.current.delete(current.icon);
      decrementNotificationCount();
    }
    advanceNotification();
  }, [advanceNotification]);

  // Promote-landscape hint (brainstorming/screensharing idea 1): a small animated rotate
  // icon (Reels-style — rotates 90deg and back) next to the easy-read button, shown once per
  // share either 5s after sharing starts or as soon as the user double-taps/zooms twice.
  const triggerRotateHint = useCallback(() => {
    if (rotateHintFiredRef.current) return;
    rotateHintFiredRef.current = true;
    if (rotateHintShowTimerRef.current) clearTimeout(rotateHintShowTimerRef.current);
    setShowRotateHint(true);
    if (rotateHintHideTimerRef.current) clearTimeout(rotateHintHideTimerRef.current);
    rotateHintHideTimerRef.current = setTimeout(() => setShowRotateHint(false), ROTATE_HINT_VISIBLE_MS);
  }, []);

  useEffect(() => {
    if (isContentSharing && !prevIsContentSharingForNudgeRef.current) {
      zoomAttemptCountRef.current = 0;
      rotateHintFiredRef.current = false;
      setShowRotateHint(false);
      if (rotateHintShowTimerRef.current) clearTimeout(rotateHintShowTimerRef.current);
      rotateHintShowTimerRef.current = setTimeout(() => triggerRotateHint(), ROTATE_HINT_SHOW_DELAY_MS);
    }
    if (!isContentSharing) {
      if (rotateHintShowTimerRef.current) clearTimeout(rotateHintShowTimerRef.current);
      if (rotateHintHideTimerRef.current) clearTimeout(rotateHintHideTimerRef.current);
      zoomAttemptCountRef.current = 0;
      rotateHintFiredRef.current = false;
      setShowRotateHint(false);
    }
    prevIsContentSharingForNudgeRef.current = isContentSharing;
  }, [isContentSharing, triggerRotateHint]);

  // Clear pending timers on unmount.
  useEffect(() => {
    return () => {
      if (rotateHintShowTimerRef.current) clearTimeout(rotateHintShowTimerRef.current);
      if (rotateHintHideTimerRef.current) clearTimeout(rotateHintHideTimerRef.current);
    };
  }, []);

  // Zoom/pinch signal on the shared content — 2 attempts shows the rotate hint immediately.
  const handleContentZoomAttempt = useCallback(() => {
    zoomAttemptCountRef.current += 1;
    if (zoomAttemptCountRef.current >= 2) triggerRotateHint();
  }, [triggerRotateHint]);

  const snoozeNoisePrompt = useCallback(() => {
    noisePromptSnoozeUntilRef.current = Date.now() + 2 * 60 * 1000;
    if (currentNotificationRef.current?.icon === "background-noise") {
      dismissNotification();
    }
  }, [dismissNotification]);

  const snoozeVoiceIsolationSpeakerPrompt = useCallback(() => {
    voiceIsolationSpeakerPromptSnoozeUntilRef.current = Date.now() + 2 * 60 * 1000;
    if (currentNotificationRef.current?.nudgeId === VOICE_ISOLATION_SPEAKER_NUDGE_ID) {
      dismissNotification();
    }
  }, [dismissNotification]);

  const handleViewLobby = useCallback(() => {
    dismissNotification();
    setMorePanelInitialView("participants");
    setActivePanel("more");
  }, [dismissNotification]);

  const handleRecordToggle = useCallback(() => {
    setIsRecording(true);
    recordingNotificationCountRef.current += 1;
    const showRecordingBanner = recordingNotificationCountRef.current % 2 === 0;
    if (showRecordingBanner) {
      triggerNotification({
        type: "critical",
        icon: "recording",
        heading: "Recording started",
        body: "Recording and transcription have started in English (UK). By joining, you consent to this meeting being recorded. Privacy Policy",
        dismiss: true,
      });
    } else {
      // Notification manager stays silent — only the header indicator and a voiceover announcement fire.
      announceRecordingStarted();
    }
    demoTimerRef.current = setTimeout(() => {
      if (voiceNoiseModeRef.current === "off") {
        triggerNotification({
          type: "informational",
          icon: "background-noise",
          nudgeId: "noise-suppression-prompt",
          autoDismissMs: VOICE_NOISE_NUDGE_DISMISS_MS,
          heading: "Background noise detected",
          body: "Noise suppression filters out sounds around you so others hear only your voice.",
          buttons: [
            { label: "Not now", variant: "outline", onClick: () => snoozeNoisePrompt() },
            {
              label: "Turn on Noise suppression",
              variant: "filled",
              onClick: () => {
                setVoiceNoiseMode("noise-suppression");
                showToast("Noise suppression is switched on", "noise-suppression");
                if (currentNotificationRef.current?.icon === "background-noise") {
                  dismissNotification();
                }
              },
            },
          ],
          dismiss: true,
        });
      }

      // R9.1 follows as the third in-order nudge: Record -> Noise -> Voice Isolation.
      demoVoicePromptTimerRef.current = setTimeout(() => {
        const multipleVoicesDetected = true;
        const isEligibleAudioRoute = audioRouteRef.current !== "speaker";
        const isEligibleMode = voiceNoiseModeRef.current === "off" || voiceNoiseModeRef.current === "noise-suppression";
        if (!multipleVoicesDetected || !isEligibleAudioRoute || !isEligibleMode) return;

        triggerNotification({
          type: "informational",
          icon: "background-noise",
          nudgeId: "voice-isolation-prompt",
          autoDismissMs: VOICE_NOISE_NUDGE_DISMISS_MS,
          heading: "Other voices detected",
          body: "Voice isolation keeps only your voice audible and removes people talking nearby.",
          buttons: [
            {
              label: "Not now",
              variant: "outline",
              onClick: () => {
                if (currentNotificationRef.current?.icon === "background-noise") {
                  dismissNotification();
                }
              },
            },
            {
              label: "Turn on Voice isolation",
              variant: "filled",
              onClick: () => {
                if (hasVoiceIsolationConsent) {
                  setVoiceNoiseMode("voice-isolation");
                  voiceIsolationUserPreferenceOnRef.current = true;
                  r92AutoRestoreVoiceIsolationRef.current = false;
                  showToast("Voice isolation is switched on", "voice-isolation");
                } else {
                  setIsVoiceIsolationConsentOpen(true);
                }
                if (currentNotificationRef.current?.icon === "background-noise") {
                  dismissNotification();
                }
              },
            },
          ],
          dismiss: true,
        });
      }, 4500);
    }, 4500);
  }, [triggerNotification, showToast, snoozeNoisePrompt, dismissNotification, announceRecordingStarted]);

  const handleInterpreterToggle = useCallback(() => {
    triggerNotification({
      type: "informational",
      icon: "interpreter",
      heading: "Interpreter is on",
      body: "This meeting will be interpreted for you in English.",
      rightCta: { label: "Settings", onClick: () => {} },
    });
  }, [triggerNotification]);

  const handleContentSharingToggle = useCallback(() => { setIsContentSharing((prev) => !prev); }, []);

  // FY27 MVP: gallery ↔ audio-only stage toggle (driven from the More menu tile).
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const handleAudioOnlyToggle = useCallback(() => { setIsAudioOnly((prev) => !prev); }, []);
  // MVP checkpoint-only in-meeting audio mode selector (noise + voice).
  const [voiceNoiseMode, setVoiceNoiseMode] = useState<"off" | "noise-suppression" | "voice-isolation">(meeting.voiceNoiseMode);
  const [selectedAudioRoute, setSelectedAudioRoute] = useState<"phone" | "speaker" | "bluetooth">("phone");
  const [isVoiceNoiseSheetOpen, setIsVoiceNoiseSheetOpen] = useState(false);
  const suppressVoiceNoiseSheetTapUntilRef = useRef(0);
  const [isVoiceIsolationConsentOpen, setIsVoiceIsolationConsentOpen] = useState(false);
  const [hasVoiceIsolationConsent, setHasVoiceIsolationConsent] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("voiceIsolationConsentAccepted") === "true";
    } catch {
      return false;
    }
  });
  const micLongPressHintStyle = "none" as const;

  useEffect(() => {
    voiceNoiseModeRef.current = voiceNoiseMode;
  }, [voiceNoiseMode]);

  useEffect(() => {
    meeting.setVoiceNoiseMode(voiceNoiseMode);
  }, [voiceNoiseMode, meeting]);

  useEffect(() => {
    if (!isMvpCheckpoint) {
      setIsVoiceNoiseSheetOpen(false);
      setIsVoiceIsolationConsentOpen(false);
    }
  }, [isMvpCheckpoint]);

  const handleAudioRouteChange = useCallback((route: "phone" | "speaker" | "bluetooth") => {
    audioRouteRef.current = route;
    setSelectedAudioRoute(route);
  }, []);

  const showVoiceModeToast = useCallback((mode: "off" | "noise-suppression" | "voice-isolation") => {
    const message = mode === "off"
      ? "No filter on microphone"
      : mode === "noise-suppression"
        ? "Noise suppression is switched on"
        : "Voice isolation is switched on";
    showToast(message, mode);
  }, [showToast]);

  const maybeShowVoiceIsolationSpeakerTurnOffPrompt = useCallback((opts?: { ignoreSnooze?: boolean }) => {
    const multipleVoicesDetected = true;
    if (!isMvpCheckpoint) return;
    if (!meeting.isActive || !multipleVoicesDetected) return;
    if (selectedAudioRoute !== "speaker") return;
    if (voiceNoiseMode !== "voice-isolation") return;
    if (!opts?.ignoreSnooze && Date.now() < voiceIsolationSpeakerPromptSnoozeUntilRef.current) return;
    if (currentNotificationRef.current?.nudgeId === VOICE_ISOLATION_SPEAKER_NUDGE_ID) return;
    if (notificationQueueRef.current.some((n) => n.nudgeId === VOICE_ISOLATION_SPEAKER_NUDGE_ID)) return;

    triggerNotification({
      type: "informational",
      icon: "background-noise",
      nudgeId: VOICE_ISOLATION_SPEAKER_NUDGE_ID,
      autoDismissMs: VOICE_NOISE_NUDGE_DISMISS_MS,
      heading: "Others are speaking near your mic",
      body: "Voice isolation is filtering them out. Switch it off so everyone in the room can be heard.",
      buttons: [
        {
          label: "Keep on",
          variant: "outline",
          onClick: () => {
            snoozeVoiceIsolationSpeakerPrompt();
          },
        },
        {
          label: "Turn off Voice isolation",
          variant: "filled",
          onClick: () => {
            // R9.2: context-driven temporary turn off; preserve pre-prompt user preference.
            r92AutoRestoreVoiceIsolationRef.current = voiceIsolationUserPreferenceOnRef.current;
            setVoiceNoiseMode("noise-suppression");
            showToast("Voice isolation is switched off", "off", { iconMode: "voice-isolation", muted: true });
            if (currentNotificationRef.current?.nudgeId === VOICE_ISOLATION_SPEAKER_NUDGE_ID) {
              dismissNotification();
            }
          },
        },
      ],
      dismiss: true,
    });
  }, [isMvpCheckpoint, meeting.isActive, selectedAudioRoute, voiceNoiseMode, triggerNotification, showToast, dismissNotification, snoozeVoiceIsolationSpeakerPrompt]);

  useEffect(() => {
    if (!isMvpCheckpoint || !meeting.isActive || selectedAudioRoute !== "speaker" || voiceNoiseMode !== "voice-isolation") return;

    const initialTimer = window.setTimeout(() => {
      maybeShowVoiceIsolationSpeakerTurnOffPrompt();
    }, 12000);
    const cadenceTimer = window.setInterval(() => {
      maybeShowVoiceIsolationSpeakerTurnOffPrompt();
    }, 30000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(cadenceTimer);
    };
  }, [isMvpCheckpoint, meeting.isActive, selectedAudioRoute, voiceNoiseMode, maybeShowVoiceIsolationSpeakerTurnOffPrompt]);

  useEffect(() => {
    if (!isMvpCheckpoint) {
      previousAudioRouteRef.current = selectedAudioRoute;
      return;
    }

    const previousRoute = previousAudioRouteRef.current;
    const movedToSpeaker = previousRoute !== "speaker" && selectedAudioRoute === "speaker";
    const movedBackToHeadset = previousRoute === "speaker" && selectedAudioRoute !== "speaker";

    if (movedToSpeaker && voiceNoiseMode === "voice-isolation") {
      // Explicit user request: show R9.2 every time the route switches to speaker with VI on.
      maybeShowVoiceIsolationSpeakerTurnOffPrompt({ ignoreSnooze: true });
    }

    if (movedBackToHeadset && r92AutoRestoreVoiceIsolationRef.current && voiceNoiseMode !== "voice-isolation") {
      setVoiceNoiseMode("voice-isolation");
      showVoiceModeToast("voice-isolation");
      r92AutoRestoreVoiceIsolationRef.current = false;
    }
    previousAudioRouteRef.current = selectedAudioRoute;
  }, [isMvpCheckpoint, selectedAudioRoute, voiceNoiseMode, showVoiceModeToast, maybeShowVoiceIsolationSpeakerTurnOffPrompt]);

  const maybeShowNoiseSuppressionPrompt = useCallback(() => {
    if (!isMvpCheckpoint) return;
    if (!meeting.isActive || !isMicOn || voiceNoiseMode !== "off") return;
    if (Date.now() < noisePromptSnoozeUntilRef.current) return;
    if (currentNotificationRef.current?.icon === "background-noise") return;
    if (notificationQueueRef.current.some((n) => n.icon === "background-noise")) return;

    triggerNotification({
      type: "informational",
      icon: "background-noise",
      nudgeId: "noise-suppression-prompt",
      autoDismissMs: VOICE_NOISE_NUDGE_DISMISS_MS,
      heading: "Background noise detected",
      body: "Noise suppression filters out sounds around you so others hear only your voice.",
      buttons: [
        { label: "Not now", variant: "outline", onClick: () => snoozeNoisePrompt() },
        {
          label: "Turn on Noise suppression",
          variant: "filled",
          onClick: () => {
            setVoiceNoiseMode("noise-suppression");
            showVoiceModeToast("noise-suppression");
            if (currentNotificationRef.current?.icon === "background-noise") {
              dismissNotification();
            }
          },
        },
      ],
      dismiss: true,
    });
  }, [isMvpCheckpoint, meeting.isActive, isMicOn, voiceNoiseMode, triggerNotification, showVoiceModeToast, snoozeNoisePrompt, dismissNotification]);

  useEffect(() => {
    if (!isMvpCheckpoint || !meeting.isActive || !isMicOn || voiceNoiseMode !== "off") return;

    const initialTimer = window.setTimeout(() => {
      maybeShowNoiseSuppressionPrompt();
    }, 12000);
    const cadenceTimer = window.setInterval(() => {
      maybeShowNoiseSuppressionPrompt();
    }, 30000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(cadenceTimer);
    };
  }, [isMvpCheckpoint, meeting.isActive, isMicOn, voiceNoiseMode, maybeShowNoiseSuppressionPrompt]);

  const requestVoiceNoiseModeChange = useCallback((
    mode: "off" | "noise-suppression" | "voice-isolation",
    opts?: { closeMicSheet?: boolean }
  ) => {
    if (!isMvpCheckpoint) return;

    if (mode === "voice-isolation" && !hasVoiceIsolationConsent) {
      if (opts?.closeMicSheet) setIsVoiceNoiseSheetOpen(false);
      setIsVoiceIsolationConsentOpen(true);
      return;
    }

    setVoiceNoiseMode(mode);
    if (mode === "voice-isolation") {
      voiceIsolationUserPreferenceOnRef.current = true;
      r92AutoRestoreVoiceIsolationRef.current = false;
    } else {
      // Manual switch away from Voice Isolation cancels restore behavior.
      voiceIsolationUserPreferenceOnRef.current = false;
      r92AutoRestoreVoiceIsolationRef.current = false;
    }
    if (opts?.closeMicSheet) setIsVoiceNoiseSheetOpen(false);
    showVoiceModeToast(mode);
  }, [isMvpCheckpoint, hasVoiceIsolationConsent, showVoiceModeToast]);

  const handleOpenVoiceNoiseSheet = useCallback(() => {
    if (!isMvpCheckpoint) return;
    // Strict guard: ignore all immediate interactions after long-press sheet open.
    suppressVoiceNoiseSheetTapUntilRef.current = performance.now() + 1600;
    // If a multitasking panel is open, close it before showing mode sheet.
    setActivePanel(null);
    setIsVoiceNoiseSheetOpen(true);
  }, [isMvpCheckpoint]);

  const handleVoiceNoiseSheetCapture = useCallback((e: React.SyntheticEvent) => {
    if (performance.now() < suppressVoiceNoiseSheetTapUntilRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleAcceptVoiceIsolationConsent = useCallback(() => {
    if (!isMvpCheckpoint) return;
    setHasVoiceIsolationConsent(true);
    try {
      window.localStorage.setItem("voiceIsolationConsentAccepted", "true");
    } catch {
      // Ignore storage failures in prototype mode.
    }
    setIsVoiceIsolationConsentOpen(false);
    setVoiceNoiseMode("voice-isolation");
    voiceIsolationUserPreferenceOnRef.current = true;
    r92AutoRestoreVoiceIsolationRef.current = false;
    showToast("Voice profile creation started", "voice-isolation");
  }, [isMvpCheckpoint, showToast]);

  const handleDenyVoiceIsolationConsent = useCallback(() => {
    if (!isMvpCheckpoint) return;
    setIsVoiceIsolationConsentOpen(false);
    // Keep existing mode unchanged (off or noise suppression).
    showToast("Voice Isolation could not be switched on", undefined, { variant: "error" });
  }, [isMvpCheckpoint, showToast]);
  const handleEnterFullscreen = useCallback(() => { setIsFullscreenContent(true); }, []);
  const handleExitFullscreen = useCallback(() => { setIsFullscreenContent(false); }, []);
  const handleOpenReflow = useCallback(() => { setIsLiquidReflowOpen(true); }, []);
  const handleCloseReflow = useCallback(() => { setIsLiquidReflowOpen(false); }, []);
  const handleTimerClick = useCallback(() => { handlePanelToggle("agenda"); }, [handlePanelToggle]);
  const handleNotificationClick = useCallback(() => { handlePanelToggle("notifications"); }, [handlePanelToggle]);
  const handleRaisedHandsClick = useCallback(() => { handlePanelToggle("hands"); }, [handlePanelToggle]);

  const handleDismissNotification = useCallback((notificationId: string) => {
    seenNotificationTypesRef.current.delete(notificationId);
    decrementNotificationCount();
  }, [decrementNotificationCount]);

  // When the lobby is cleared (all guests admitted/denied → lobbyCount 0), the lobby
  // notification can still be sitting in the hub (auto-dismiss doesn't remove it from
  // seen). Clear it automatically — but only if it actually survives there.
  const prevLobbyCountRef = useRef(lobbyCount);
  useEffect(() => {
    if (prevLobbyCountRef.current > 0 && lobbyCount === 0 && seenNotificationTypesRef.current.has("lobby")) {
      handleDismissNotification("lobby");
    }
    prevLobbyCountRef.current = lobbyCount;
  }, [lobbyCount, handleDismissNotification, seenNotificationTypesRef]);

  const handleClearAllNotifications = useCallback(() => {
    seenNotificationTypesRef.current.clear();
    resetNotificationCount();
  }, []);

  // End call — play a leave tone and navigate back to calendar
  const handleEndCall = useCallback(() => {
    // Play a short "leave" tone
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 350;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
      osc.onended = () => ctx.close();
    } catch {
      // Silently swallow
    }
    meeting.endMeeting();
    camera.releaseCamera();
    // flushSync: the in-meeting 1s timers re-render this tree and starve the
    // router's transition, leaving the URL on /calendar with MeetingPage still up.
    navigate("/calendar", { flushSync: true });
  }, [navigate, meeting, camera]);

  // Back button — background the meeting and return to calendar
  const handleBack = useCallback(() => {
    meeting.backgroundMeeting();
    navigate("/calendar", { flushSync: true });
  }, [meeting, navigate]);

  // AIL + UFD elements — shared by the in-flow layer (MVP/FV) and the checkpoint
  // overlay stack (header → AIL → notification, floating over the tiles).
  const ufdEl = currentNotification ? (
    <NotificationUFD
      key={currentNotification.id}
      {...currentNotification}
      onDismiss={dismissNotification}
      onExpandChange={handleNotificationExpandChange}
      hasStack={notificationQueue.filter(n => n.type === "critical").length > 0}
      stackCount={notificationQueue.filter(n => n.type === "critical").length}
      nextNotification={notificationQueue.length > 0 ? notificationQueue[0] : undefined}
    />
  ) : null;
  const ailEl = (
    <AdditionalInfoLayer
      raisedHands={displayRaisedHands}
      timerMinutes={currentTopic.duration}
      timerTopicName={currentTopic.title}
      agendaDurations={agendaItems.map((item) => item.duration)}
      currentTopicIndex={currentTopicIndex}
      timerEpoch={meeting.agendaTimerEpoch}
      timerPausedRemaining={meeting.agendaPausedRemaining}
      onTimerComplete={handleTimerComplete}
      isTimerPaused={isAgendaPaused}
      notificationCount={notificationCounter}
      onTimerClick={handleTimerClick}
      isTimerPressed={activePanel === "agenda"}
      onNotificationClick={handleNotificationClick}
      isNotificationPressed={activePanel === "notifications"}
      onRaisedHandsClick={handleRaisedHandsClick}
      isRaisedHandsPressed={activePanel === "hands"}
    />
  );

  return (
    <AudioModeProvider value={voiceNoiseMode}>
    <SelfControlsProvider controlsLocked={controlsLocked} onToggleControlsLock={handleToggleControlsLock}>
    <div className={meetingThemeClass} style={{ display: "contents" }}>
      {/* Screen-reader-only announcement for the odd-numbered "indicator only" recording triggers */}
      <span aria-live="assertive" className="sr-only">{recordingAnnouncement}</span>
      {/* Meeting Content - Vertical Stack */}
      <div className="app-safe-top absolute top-0 bottom-0 left-0 right-0 flex flex-col bg-fy27-surface">
        {/* Immersive mode replaces the header + AIL with a minimal meeting-presence strip */}
        {isImmersive && activePanel ? (
          <ImmersiveMeetingBar participantCount={totalParticipants} onEndCall={handleEndCall} onBack={handleBack} isRecording={isRecording} />
        ) : (
        <>
        {/* Meeting Header - Hidden in split screen mode. Checkpoint renders the
            header as an OVERLAY inside the stage instead (see below). */}
        {!activePanel && !isMvpCheckpoint && (
          <Header ref={headerRef} onVisibilityChange={setIsHeaderVisible} participantCount={totalParticipants} onEndCall={handleEndCall} onBack={handleBack} isRecording={isRecording} onAudioRouteChange={handleAudioRouteChange} selectedAudioRoute={selectedAudioRoute} alwaysVisible={currentView === 0} />
        )}

        {/* UFD or Additional Information Layer - Hidden in On-the-Go mode.
            MVP + multitasking (a panel is open): the UFD OVERLAYS the AIL
            (Option B) — the AIL stays mounted underneath, the notification card
            is layered on top. Otherwise the UFD replaces the AIL as before.
            Checkpoint with NO panel renders the AIL/notification as overlays in
            the stage; with a panel open it uses the in-flow layer like MVP. */}
        {currentView !== 0 && (!isMvpCheckpoint || !!activePanel) && (() => {
          // MVP: the UFD always overlays the AIL (Option B) — in the full gallery
          // stage AND in multitasking — so the AIL stays mounted (dimmed) underneath
          // instead of being replaced. FV keeps the replace behavior below.
          if (isFy27Mvp && currentNotification) {
            return (
              <div className="relative shrink-0 pb-[4px]">
                {/* AIL stays mounted but dimmed so it recedes behind the
                    translucent UFD (no distracting bleed-through). */}
                <div className="opacity-20 pointer-events-none transition-opacity duration-200">{ailEl}</div>
                <div className="absolute inset-x-0 top-0 z-30">{ufdEl}</div>
              </div>
            );
          }
          // Default: UFD replaces the AIL (FV only).
          return currentNotification ? (
            <div className="shrink-0 pb-[4px]">{ufdEl}</div>
          ) : (
            <div className="pb-[4px]">{ailEl}</div>
          );
        })()}
        </>
        )}

        {/* Meeting Stage */}
        <div
          className={`flex-1 relative overflow-hidden transition-all duration-300 ease-out ${isImmersive ? "opacity-0 pointer-events-none" : ""}`}
          onClick={() => {
            if (!isHeaderVisible && !activePanel) {
              headerRef.current?.show();
            }
          }}
        >
          {isMvpCheckpoint && !activePanel && !isAudioOnly ? (
            /* Checkpoint full stage — the header FLOATS as an overlay; the AIL sits
               IN-FLOW in the same z-plane as the tiles + tray (stacked at the top,
               pushing them down). The notification lives on the header's plane: it
               anchors to the AIL top, and drops to 4px below the header when the
               header is showing. */
            <div className="flex flex-col h-full relative">
              {currentView !== 0 && (
                <div className="absolute top-0 left-0 right-0 z-50 pointer-events-auto">
                  <Header ref={headerRef} overlay onVisibilityChange={setIsHeaderVisible} participantCount={totalParticipants} onEndCall={handleEndCall} onBack={handleBack} isRecording={isRecording} onAudioRouteChange={handleAudioRouteChange} selectedAudioRoute={selectedAudioRoute} alwaysVisible={currentView === 0} />
                </div>
              )}
              {currentView !== 0 && (
                <div className="shrink-0 relative z-20 px-[4px] pt-[4px]">
                  {ailEl}
                </div>
              )}
              <div className="flex-1 relative min-h-0">
                <MeetingViews
                  isSplit={false}
                  onCollapseSplit={handleClosePanel}
                  isMicOn={isMicOn}
                  isVideoOn={isVideoOn}
                  onMicToggle={handleMicToggle}
                  onHandRaiseToggle={handleHandRaiseToggle}
                  isHandRaised={isHandRaised}
                  onViewChange={setCurrentView}
                  isContentSharing={isContentSharing}
                  onEnterFullscreen={handleEnterFullscreen}
                  onOpenReflow={handleOpenReflow}
                  onZoomAttempt={handleContentZoomAttempt}
                  showRotateHint={showRotateHint}
                  activeSlideIndex={stageSlideIndex}
                  onActiveSlideIndexChange={setStageSlideIndex}
                  activeEmoji={activeEmoji}
                />
              </div>
              {/* Notification — header plane. Anchored to the AIL top (4px), moves
                  to 4px below the header (60px) while the header is visible. */}
              {currentView !== 0 && currentNotification && (
                <div
                  className="absolute inset-x-0 z-40 transition-all duration-300 ease-in-out"
                  style={{ top: isHeaderVisible ? 60 : 4 }}
                >
                  {ufdEl}
                </div>
              )}
            </div>
          ) : isAudioOnly && isFy27Mvp ? (
            <AudioOnlyStage isSplit={activePanel !== null} onCollapseSplit={handleClosePanel} totalCount={totalParticipants} />
          ) : (
            <MeetingViews
              isSplit={activePanel !== null}
              onCollapseSplit={handleClosePanel}
              isMicOn={isMicOn}
              isVideoOn={isVideoOn}
              onMicToggle={handleMicToggle}
              onHandRaiseToggle={handleHandRaiseToggle}
              isHandRaised={isHandRaised}
              onViewChange={setCurrentView}
              isContentSharing={isContentSharing}
              onEnterFullscreen={handleEnterFullscreen}
              onOpenReflow={handleOpenReflow}
              onZoomAttempt={handleContentZoomAttempt}
              showRotateHint={showRotateHint}
              activeSlideIndex={stageSlideIndex}
              onActiveSlideIndexChange={setStageSlideIndex}
              activeEmoji={activeEmoji}
            />
          )}
          
          {/* Floating Self Video Tile — Final Vision keeps SelfVideoTile;
              FY27 MVP uses the redesigned SelfTile (portrait/landscape). Checkpoint
              hides it when the self lives in the ParticipantTray (>6 / content). */}
          {currentView !== 0 && !isFy27Mvp && (
            <SelfVideoTile isMicOn={isMicOn} isVideoOn={isVideoOn} isSplit={activePanel !== null} activeEmoji={activeEmoji} isHandRaised={isHandRaised} />
          )}
          {currentView !== 0 && isFy27Mvp && !selfInTray && (
            <FloatingSelfTile
              isVideoOn={isAudioOnly ? false : isVideoOn}
              isMicOn={isMicOn}
              isHandRaised={isHandRaised}
              activeEmoji={activeEmoji}
              isSplit={activePanel !== null}
              isDesktopFriendlyView={isDesktopFriendlyView}
            />
          )}

          {/* Live captions box — sits just above the floating self tile (75×100),
              shown only when captions are on (More menu) and NOT in the
              multitasking (split) stage. MVP only. */}
          {currentView !== 0 && isFy27Mvp && areCaptionsOn && activePanel === null && (
            <div className="absolute z-20 left-[12px] right-[12px] bottom-[120px]">
              <CaptionBox text="What I am trying to say is that I love how I can just ask Copilot answers to what someone asks me in the meeting and just appear smarter..." />
            </div>
          )}
          
          {/* Bottom Nav Overlay Zone (Final Vision only — FY27 MVP docks the U-bar) */}
          {!activePanel && currentView !== 0 && !isFy27Mvp && (
            <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
          )}
          
          {/* Bottom Navigation - Floating in gallery mode (Final Vision) */}
          {!activePanel && currentView !== 0 && !isFy27Mvp && (
            <div className="absolute bottom-0 left-0 right-0 z-20">
              <BottomNav
                activePanel={activePanel}
                onPanelToggle={handlePanelToggle}
                isVideoOn={isVideoOn}
                isMicOn={isMicOn}
                onVideoToggle={handleVideoToggle}
                onMicToggle={handleMicToggle}
              />
            </div>
          )}
        </div>

        {/* FY27 MVP: docked U-bar — the scrolling stage ends above it (gallery). */}
        {!activePanel && isFy27Mvp && (
          <UBar
            activePanel={activePanel}
            onPanelToggle={handlePanelToggle}
            isVideoOn={isAudioOnly ? false : isVideoOn}
            isMicOn={isMicOn}
            onVideoToggle={handleVideoToggle}
            onMicToggle={handleMicToggle}
            onMicLongPress={isMvpCheckpoint ? handleOpenVoiceNoiseSheet : undefined}
            micLongPressHintStyle={micLongPressHintStyle}
            videoDisabled={isAudioOnly}
            controlsLocked={controlsLocked}
            onUnlockControls={handleToggleControlsLock}
            onLockedSingleTap={handleLockedSingleTap}
          />
        )}

        {/* Divider grip — sits on the seam between the stage/strip and the panel */}
        {activePanel && (
          <PanelResizeHandle
            onPointerDown={handlePanelDragDown}
            onPointerMove={handlePanelDragMove}
            onPointerUp={handlePanelDragUp}
          />
        )}

        {/* Multitasking Panels — wrapped so every MultitaskingPanel (incl. nested views) reads the immersive height */}
        <ImmersiveSplitProvider value={{ isImmersive, dragHeight, isDragging: isDraggingPanel }}>
        {activePanel === "chat" && <ChatPanel onClose={handleClosePanel} meetingTitle={meeting.meetingTitle} messages={chatMessages} setMessages={setChatMessages} />}
        {activePanel === "copilot" && <CopilotPanel onClose={handleClosePanel} meetingContext={{ meetingTitle: meeting.meetingTitle, agendaItems: agendaItemsWithStatus.map(i => ({ title: i.title, duration: i.duration, status: i.status })), currentTopic: currentTopic.title, participantCount: meeting.participantCount, raisedHands: displayRaisedHands.map(h => h.name), isTimerPaused: isAgendaPaused }} messages={copilotMessages} setMessages={setCopilotMessages} />}
        {activePanel === "more" && (
          <MorePanel
            onClose={handleClosePanel}
            onEmojiClick={handleEmojiClick}
            onHandRaiseToggle={handleHandRaiseToggle}
            isHandRaised={isHandRaised}
            onRecordToggle={handleRecordToggle}
            onInterpreterToggle={handleInterpreterToggle}
            onCaptionsToggle={toggleCaptions}
            areCaptionsOn={areCaptionsOn}
            hasLobbyGuests={hasLobbyGuests}
            initialView={morePanelInitialView}
            setInitialView={setMorePanelInitialView}
            isContentSharing={isContentSharing}
            onContentSharingToggle={handleContentSharingToggle}
            isAudioOnly={isAudioOnly}
            onAudioOnlyToggle={handleAudioOnlyToggle}
            raisedHands={displayRaisedHands}
            raisedHandIds={isFy27Mvp ? meeting.raisedHands : undefined}
            participantsUsers={isFy27Mvp ? mvpRosterParticipants : undefined}
            onOpenRtt={isFy27Mvp ? () => { startRtt(); setActivePanel("rtt"); } : undefined}
            isRttOn={isRttOn}
            enableVoiceNoiseControl={isMvpCheckpoint}
            voiceNoiseMode={voiceNoiseMode}
            onVoiceNoiseModeChange={requestVoiceNoiseModeChange}
            isDesktopFriendlyView={isDesktopFriendlyView}
            onDesktopFriendlyViewToggle={() => setIsDesktopFriendlyView((current) => !current)}
          />
        )}
        {activePanel === "agenda" && <AgendaTimerPanel onClose={handleClosePanel} currentTopicName={currentTopic.title} agendaItems={agendaItemsWithStatus} onPause={handleAgendaPause} onReset={handleAgendaReset} isPaused={isAgendaPaused} currentTopicIndex={currentTopicIndex} currentElapsedMin={currentTopicElapsedMin} onSaveItems={handleSaveAgendaItems} />}
        {activePanel === "notifications" && (
          <NotificationsPanel
            onClose={handleClosePanel}
            seenNotifications={seenNotificationTypesRef.current}
            onDismissNotification={handleDismissNotification}
            onClearAll={handleClearAllNotifications}
            onViewLobby={handleViewLobby}
          />
        )}
        {activePanel === "hands" && <RaisedHandsPanel onClose={handleClosePanel} raisedHands={displayRaisedHands} raisedHandIds={isFy27Mvp ? meeting.raisedHands : undefined} roster={isFy27Mvp ? mvpRosterParticipants : undefined} />}
        {isFy27Mvp && activePanel === "rtt" && <RttPanel onClose={handleClosePanel} />}
        </ImmersiveSplitProvider>

        {/* Controls over the panel. Final Vision: BottomNav. FY27 MVP: U-bar. */}
        {activePanel && currentView !== 0 && !isFy27Mvp && (
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#181818]">
            <BottomNav
              activePanel={activePanel}
              onPanelToggle={handlePanelToggle}
              isVideoOn={isVideoOn}
              isMicOn={isMicOn}
              onVideoToggle={handleVideoToggle}
              onMicToggle={handleMicToggle}
            />
          </div>
        )}
        {activePanel && currentView !== 0 && isFy27Mvp && (
          <div className="absolute bottom-0 left-0 right-0 z-30">
            <UBar
              activePanel={activePanel}
              onPanelToggle={handlePanelToggle}
              isVideoOn={isAudioOnly ? false : isVideoOn}
              isMicOn={isMicOn}
              onVideoToggle={handleVideoToggle}
              onMicToggle={handleMicToggle}
              onMicLongPress={isMvpCheckpoint ? handleOpenVoiceNoiseSheet : undefined}
              micLongPressHintStyle={micLongPressHintStyle}
              videoDisabled={isAudioOnly}
              controlsLocked={controlsLocked}
              onUnlockControls={handleToggleControlsLock}
              onLockedSingleTap={handleLockedSingleTap}
            />
          </div>
        )}
      </div>

      {isMvpCheckpoint && isVoiceNoiseSheetOpen && (
        <div className="absolute inset-0 z-[90] flex items-end justify-center" style={{ fontFamily: "var(--font-sf-pro)" }}>
          <button
            aria-label="Close microphone settings"
            className="absolute inset-0 bg-black/35"
            onClick={() => setIsVoiceNoiseSheetOpen(false)}
          />
          <div className="relative w-full max-w-[430px] rounded-t-[22px] bg-fy27-surface-base border-t border-x border-fy27-divider shadow-[0px_-10px_36px_rgba(0,0,0,0.42)] pb-[max(10px,env(safe-area-inset-bottom))]">
            <div className="pt-[8px] pb-[4px] flex justify-center">
              <span className="h-[4px] w-[44px] rounded-full bg-fy27-divider" aria-hidden="true" />
            </div>
            <div className="px-[16px] pt-[4px] pb-[10px]">
              <div className="text-center text-fy27-text-primary text-[20px] leading-[28px] font-semibold">
                Microphone settings
              </div>
            </div>
              <div
                className="mx-[16px] mb-[8px] rounded-[16px] bg-fy27-surface overflow-hidden"
                onPointerDownCapture={handleVoiceNoiseSheetCapture}
                onPointerUpCapture={handleVoiceNoiseSheetCapture}
                onClickCapture={handleVoiceNoiseSheetCapture}
              >
              {([
                { id: "off", label: "Default", description: "No additional filtering" },
                { id: "noise-suppression", label: "Noise suppression", description: "Reduces background noise" },
                { id: "voice-isolation", label: "Voice isolation", description: "Keeps only your voice audible" },
              ] as const).map((option) => {
                const isActive = voiceNoiseMode === option.id;
                return (
                  <AudioSettingListRow
                    key={option.id}
                    mode={option.id}
                    label={option.label}
                    description={option.description}
                    isSelected={isActive}
                    onClick={() => requestVoiceNoiseModeChange(option.id, { closeMicSheet: true })}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isMvpCheckpoint && (
        <VoiceIsolationConsentSheet
          open={isVoiceIsolationConsentOpen}
          onAccept={handleAcceptVoiceIsolationConsent}
          onDismiss={handleDenyVoiceIsolationConsent}
        />
      )}

      {/* Caller Kit accidental-touch guard: camera was tapped on there — confirm
          here, on the meeting stage, before actually turning it on. */}
      {cameraOnConfirmOpen && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/40">
          <div className="w-[270px] rounded-[14px] overflow-hidden bg-[#2c2c2e] text-center" style={{ fontFamily: "var(--font-sf-pro)" }}>
            <div className="px-[16px] pt-[18px] pb-[16px]">
              <div className="text-white text-[17px] font-semibold">Turn camera on?</div>
              <div className="text-white/70 text-[13px] mt-[4px]">Others in the meeting will see your video.</div>
            </div>
            <div className="flex border-t border-white/15">
              <button
                onClick={() => setCameraOnConfirmOpen(false)}
                className="flex-1 py-[12px] text-[17px] text-[#0a84ff] border-r border-white/15"
              >
                Cancel
              </button>
              <button
                onClick={() => { setIsVideoOn(true); setCameraOnConfirmOpen(false); }}
                className="flex-1 py-[12px] text-[17px] font-semibold text-[#0a84ff]"
              >
                Turn On
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Shared Content — Immersive landscape overlay */}
      {isFullscreenContent && (
        <FullscreenContentView
          onExit={handleExitFullscreen}
          sharerName="Aadi Kapoor"
          raisedHands={displayRaisedHands}
          timerMinutes={currentTopic.duration}
          timerTopicName={currentTopic.title}
          isRecording={isRecording}
          lobbyCount={lobbyCount}
          notificationCount={notificationCounter}
          isMicOn={isMicOn}
          isVideoOn={isVideoOn}
        />
      )}

      {/* Easy read — Liquid Mode-style reflow overlay, opt-in (brainstorming/screensharing idea 2) */}
      {isLiquidReflowOpen && (
        <LiquidReflowContentView
          onExit={handleCloseReflow}
          sharerName="Aadi Kapoor"
          initialSlideIndex={stageSlideIndex}
          onSlideIndexChange={setStageSlideIndex}
        />
      )}

      {/* Keyframes for notification animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
    </SelfControlsProvider>
    </AudioModeProvider>
  );
}