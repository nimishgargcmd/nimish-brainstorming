import React from "react";
import svgPaths from "@/imports/svg-421nqr9b2v";
import svgPathsMore from "@/imports/svg-r0bdvgj63w";
import svgPathsGrid from "@/imports/svg-iv7o0d0hxl";
import svgPathsSettings from "@/imports/svg-jj55k4btsr";
import svgPathsPhone from "@/imports/svg-r18pzyrpzd";
import svgPathsShare from "@/imports/svg-dr4wj00flk";
import svgPathsDesktop from "@/imports/svg-yblxi66xkj";
import { ParticipantsPanel, type Participant } from "@/app/components/ParticipantsPanel";
import { MultitaskingPanel } from "@/app/components/MultitaskingPanel";
import { ReportParticipantSheet } from "@/app/components/ReportParticipantSheet";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { useVersion } from "@/app/versioning/VersionContext";
import { isMvpFamily } from "@/app/versioning/versions";
import { TileGrid, type TileGridItem } from "@/app/components/TileGrid";
import {
  HandDrawIcon,
  AppsIcon,
  ChevronRightIcon,
  BackgroundEffectsIcon,
  CallMyPhoneIcon,
  IncomingVideoOffIcon,
  HoldIcon,
  RttIcon,
  ChatOffIcon,
  RecordIcon,
  TranscriptionIcon,
  LockIcon,
  DialpadIcon,
  InfoIcon,
} from "@/app/components/moreMenuIcons";
import Icon24X from "@/imports/Icon24X24";
import { AudioSettingListRow } from "@/app/components/AudioSettingListRow";
import { DesktopFriendlyIcon } from "@/app/components/DesktopFriendlyIcon";
import { IconChevronRight } from "@/app/components/profile/fluentIcons";
import imgThumbsUp from "figma:asset/b7bdd4e332f1134cea6b347137499723925005ef.png";
import imgRedHeart from "figma:asset/59520d231a783bb20cd3d4f98dfaec2de858b210.png";
import imgClappingHands from "figma:asset/cebe50ea4c5d9b448454b19dd79074e5c5b4d898.png";
import imgGrinningSquintingFace from "figma:asset/05be624ff210f9164b431697c6d21d5e13ab6caa.png";
import imgRaisedHand from "figma:asset/5e065daa3e40aa51484d94e392c06fe496150d5d.png";

interface MorePanelProps {
  onClose: () => void;
  onEmojiClick: (emojiSrc: string) => void;
  onHandRaiseToggle: () => void;
  isHandRaised: boolean;
  onRecordToggle?: () => void;
  onInterpreterToggle?: () => void;
  onCaptionsToggle?: () => void;
  areCaptionsOn?: boolean;
  hasLobbyGuests?: boolean;
  initialView?: "main" | "participants";
  setInitialView?: (view: "main" | "participants") => void;
  isContentSharing?: boolean;
  onContentSharingToggle?: () => void;
  /** Demo-only simulation of the presenter actively annotating the shared content —
   *  stands in for a real "is presenter drawing/pointing" signal (brainstorming/
   *  screensharing idea 1, condition 2). */
  isPresenterAnnotating?: boolean;
  onToggleAnnotationDemo?: () => void;
  /** FY27 MVP: gallery ↔ audio-only view toggle (the tile replaces "Apps" in the grid). */
  isAudioOnly?: boolean;
  onAudioOnlyToggle?: () => void;
  raisedHands?: Array<{ name: string }>;
  /** FY27 MVP: raised-hand roster ids + the in-meeting roster, forwarded to ParticipantsPanel. */
  raisedHandIds?: string[];
  participantsUsers?: Participant[];
  /** FY27 MVP: open the RTT panel (turns RTT on if off). */
  onOpenRtt?: () => void;
  /** FY27 MVP: whether RTT is already on (row label flips to "Show RTT"). */
  isRttOn?: boolean;
  /** MVP checkpoint: expose in-meeting voice/noise control row + selector view. */
  enableVoiceNoiseControl?: boolean;
  /** Current in-meeting audio mode selection. */
  voiceNoiseMode?: "off" | "noise-suppression" | "voice-isolation";
  /** Called when the in-meeting audio mode changes. */
  onVoiceNoiseModeChange?: (mode: "off" | "noise-suppression" | "voice-isolation") => void;
  /** MVP checkpoint: current desktop-friendly view state for the consolidated A/V settings. */
  isDesktopFriendlyView?: boolean;
  /** Called when the desktop-friendly view toggle is flipped. */
  onDesktopFriendlyViewToggle?: () => void;
}

type NestedView = "main" | "meetingInfo" | "meetingSettings" | "share" | "shareScreen" | "participants" | "microphoneSettings" | "videoSettings" | "videoSettingsBackgroundEffects";

// Fluent "Closed Caption Off" glyph (Figma POR 1496:15097), shown on the grid
// tile when live captions are on (tap → hide captions). viewBox 0 0 20 20.
const CC_OFF_PATH = "M1.28034 0.219674C0.987445 -0.0732203 0.512571 -0.0732252 0.219675 0.219663C-0.0732209 0.512551 -0.0732257 0.987421 0.219665 1.28032L1.4698 2.53047C0.584602 3.11109 0 4.11226 0 5.24997V14.7545C0 16.5494 1.45507 18.0045 3.25 18.0045H16.75C16.8132 18.0045 16.8759 18.0027 16.9382 17.9991L18.7194 19.7803C19.0123 20.0732 19.4872 20.0732 19.7801 19.7803C20.073 19.4874 20.073 19.0126 19.7801 18.7197L1.28034 0.219674ZM15.4436 16.5045H3.25C2.2835 16.5045 1.5 15.721 1.5 14.7545V5.24997C1.5 4.52294 1.94336 3.89945 2.57445 3.63513L5.40186 6.46258C4.29288 7.04205 3.5 8.29951 3.5 9.99993C3.5 13.1432 6.21539 14.7746 8.6208 13.4065C8.98085 13.2017 9.10671 12.7438 8.90192 12.3837C8.69714 12.0237 8.23925 11.8978 7.8792 12.1026C6.48411 12.8961 5 12.0045 5 9.99993C5 8.63008 5.69021 7.7809 6.57296 7.63369L15.4436 16.5045ZM18.4295 15.2477C18.4754 15.0913 18.5 14.9258 18.5 14.7545V5.24997C18.5 4.28348 17.7165 3.49998 16.75 3.49998H6.68192L5.18195 1.99999H16.75C18.5449 1.99999 20 3.45506 20 5.24997V14.7545C20 15.3475 19.8412 15.9034 19.5638 16.382L18.4295 15.2477ZM12.5531 9.3712L11.3557 8.17386C12.1688 6.28645 14.2384 5.52423 16.1216 6.5985C16.4814 6.80374 16.6067 7.26178 16.4015 7.62157C16.1962 7.98136 15.7382 8.10665 15.3784 7.90141C14.1366 7.19303 12.8292 7.81615 12.5531 9.3712Z";

// Fluent "Speaker" (volume on) — Share screen WITH audio (Figma POR 1170:41671). viewBox 0 0 20 18.
const SPEAKER_ON_PATH = "M13 1.25244C13 0.173822 11.7255 -0.398411 10.9195 0.318267L6.42794 4.31153C6.29065 4.4336 6.11333 4.50103 5.92961 4.50103H2.25C1.00736 4.50103 0 5.50839 0 6.75103V11.2489C0 12.4916 1.00736 13.4989 2.25 13.4989H5.92956C6.11329 13.4989 6.29063 13.5664 6.42793 13.6885L10.9194 17.6822C11.7255 18.3989 13 17.8267 13 16.748V1.25244ZM7.4246 5.43255L11.5 1.80923V16.1912L7.42465 12.5675C7.01275 12.2013 6.48074 11.9989 5.92956 11.9989H2.25C1.83579 11.9989 1.5 11.6631 1.5 11.2489V6.75103C1.5 6.33681 1.83579 6.00103 2.25 6.00103H5.92961C6.48075 6.00103 7.01272 5.79874 7.4246 5.43255ZM16.9916 2.89977C17.3244 2.65323 17.7941 2.72321 18.0407 3.05606C19.2717 4.71814 20 6.77634 20 9.00246C20 11.2286 19.2717 13.2868 18.0407 14.9489C17.7941 15.2817 17.3244 15.3517 16.9916 15.1051C16.6587 14.8586 16.5888 14.3889 16.8353 14.0561C17.8815 12.6435 18.5 10.8963 18.5 9.00246C18.5 7.10861 17.8815 5.36141 16.8353 3.94885C16.5888 3.616 16.6587 3.14631 16.9916 2.89977ZM15.143 5.37177C15.5072 5.17458 15.9624 5.31002 16.1596 5.67428C16.6958 6.66489 17 7.79926 17 9.00244C17 10.2056 16.6958 11.34 16.1596 12.3306C15.9624 12.6949 15.5072 12.8303 15.143 12.6331C14.7787 12.4359 14.6432 11.9808 14.8404 11.6165C15.2609 10.8397 15.5 9.95013 15.5 9.00244C15.5 8.05476 15.2609 7.16515 14.8404 6.38837C14.6432 6.02411 14.7787 5.56896 15.143 5.37177Z";

// Fluent "Speaker Off" (volume slash) — Share screen WITHOUT audio (Figma POR 1161:26458). viewBox 0 0 20 20.
const SPEAKER_OFF_PATH = "M1.28034 0.219675C0.987445 -0.0732209 0.512571 -0.0732257 0.219675 0.219665C-0.0732209 0.512555 -0.0732257 0.987429 0.219665 1.28032L4.43782 5.49856H2.25C1.00736 5.49856 0 6.50592 0 7.74856V12.2465C0 13.4891 1.00736 14.4965 2.25 14.4965H5.92956C6.11329 14.4965 6.29063 14.5639 6.42793 14.686L10.9194 18.6797C11.7255 19.3965 13 18.8242 13 17.7456V14.0609L18.7194 19.7805C19.0123 20.0734 19.4872 20.0734 19.7801 19.7805C20.073 19.4876 20.073 19.0127 19.7801 18.7198L1.28034 0.219675ZM11.5 12.5609V17.1888L7.42465 13.565C7.01275 13.1988 6.48074 12.9965 5.92956 12.9965H2.25C1.83579 12.9965 1.5 12.6607 1.5 12.2465V7.74856C1.5 7.33435 1.83579 6.99856 2.25 6.99856H5.92961C5.93233 6.99856 5.93505 6.99856 5.93777 6.99855L11.5 12.5609ZM11.5 2.80677V8.31817L13 9.8182V2.24998C13 1.17136 11.7255 0.599126 10.9195 1.3158L7.52003 4.33813L8.58251 5.40062L11.5 2.80677ZM15.141 11.9592L16.279 13.0973C16.7408 12.1628 17 11.1107 17 9.99998C17 8.7968 16.6958 7.66243 16.1596 6.67182C15.9624 6.30755 15.5072 6.17211 15.143 6.36931C14.7787 6.5665 14.6432 7.02165 14.8404 7.38591C15.2609 8.16268 15.5 9.0523 15.5 9.99998C15.5 10.691 15.3729 11.3512 15.141 11.9592ZM17.3881 14.2064L18.4815 15.2998C19.4437 13.7631 20 11.9457 20 9.99999C20 7.77388 19.2717 5.71568 18.0407 4.0536C17.7941 3.72075 17.3244 3.65077 16.9916 3.89731C16.6587 4.14384 16.5888 4.61353 16.8353 4.94639C17.8815 6.35894 18.5 8.10615 18.5 9.99999C18.5 11.5311 18.0958 12.9663 17.3881 14.2064Z";

// Fluent "Desktop Off" (monitor with slash) — Figma 1013:54510. Shown on the
// content-sharing row when it's ON (label "Hide shared content"). viewBox 0 0 20 20.
const DESKTOP_OFF_PATH = "M2.27691 2.98402L2.14645 2.85355C1.95118 2.65829 1.95118 2.34171 2.14645 2.14645C2.34171 1.95118 2.65829 1.95118 2.85355 2.14645L17.8536 17.1464C18.0488 17.3417 18.0488 17.6583 17.8536 17.8536C17.6583 18.0488 17.3417 18.0488 17.1464 17.8536L14.2929 15H13V17H14.5C14.7761 17 15 17.2239 15 17.5C15 17.7761 14.7761 18 14.5 18H5.5C5.22386 18 5 17.7761 5 17.5C5 17.2239 5.22386 17 5.5 17H7V15H4C2.89543 15 2 14.1046 2 13V4C2 3.6291 2.10096 3.28177 2.27691 2.98402ZM13.2929 14L3.03387 3.74098C3.01178 3.82359 3 3.91042 3 4V13C3 13.5523 3.44772 14 4 14H13.2929ZM17 13C17 13.5135 16.613 13.9365 16.1148 13.9935L16.9052 14.7839C17.5549 14.4536 18 13.7788 18 13V4C18 2.89543 17.1046 2 16 2H4.12134L5.12134 3H16C16.5523 3 17 3.44772 17 4V13ZM12 15H8V17H12V15Z";

/* ────────────────────────────────────────────────────────
   FY27 MVP — Figma "Grouped List" rows for the More menu.
   One-line list item: 24px icon slot (glyph at 20px, currentColor) → label
   (Body 1). Two-line items add a Body-2 subtitle and an optional trailing
   chevron. Section headers (Callout-1 bold, no icon) + caption rows
   (Body-2 secondary, no icon) match the Figma grouped-list spec. No per-row
   dividers. MVP-only — gated by isFy27Mvp at every call site below.
   ──────────────────────────────────────────────────────── */
function MvpListRow({
  icon,
  label,
  subtitle,
  trailing,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-[20px] w-full px-[20px] py-[12px] pr-[12px] text-left"
      style={{ fontFamily: "var(--font-sf-pro)", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
    >
      {icon && (
        <span className="grid size-[24px] place-items-center shrink-0 text-fy27-icon-primary">
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0 flex flex-col">
        <span className="text-[17px] leading-[22px] tracking-[-0.41px] font-normal text-fy27-text-primary">
          {label}
        </span>
        {subtitle && (
          <span className="text-[12px] leading-[16px] text-fy27-text-secondary">{subtitle}</span>
        )}
      </span>
      {trailing && <span className="shrink-0 text-fy27-icon-secondary">{trailing}</span>}
    </button>
  );
}

function MvpListCaption({ text }: { text: string }) {
  return (
    <div
      className="px-[20px] py-[8px] text-[12px] leading-[16px] text-fy27-text-secondary"
      style={{ fontFamily: "var(--font-sf-pro)" }}
    >
      {text}
    </div>
  );
}

/**
 * Meeting chiclet — Teams 2 iOS chat-style chiclet (Figma "Report a meeting"
 * 2542:166930). ~58px accent-tertiary card with a left, inset, rounded brand
 * accent bar, showing the meeting name (Bold 15) + location subtitle (13). Used
 * as the subject of the "Report a security concern" sheet in place of a persona card.
 */
function MeetingChiclet({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div
      className="relative flex flex-col justify-center gap-[2px] min-h-[58px] rounded-[8px] bg-fy27-accent-tertiary pl-[22px] pr-[12px] py-[10px]"
      style={{ fontFamily: "var(--font-sf-pro)" }}
    >
      {/* Vertical accent bar — inset ~6px top/bottom, 3px wide, fully rounded (Figma spec) */}
      <span className="absolute left-[4px] top-[6px] bottom-[6px] w-[3px] rounded-full bg-fy27-surface-accent-primary" />
      <p className="text-fy27-text-interactive text-[15px] leading-[20px] font-bold truncate">{name}</p>
      {subtitle && <p className="text-fy27-text-secondary text-[13px] leading-[16px] truncate">{subtitle}</p>}
    </div>
  );
}

export function MorePanel({
  onClose,
  onEmojiClick,
  onHandRaiseToggle,
  isHandRaised,
  onRecordToggle,
  onInterpreterToggle,
  onCaptionsToggle,
  areCaptionsOn = false,
  hasLobbyGuests,
  initialView = "main",
  setInitialView,
  isContentSharing = false,
  onContentSharingToggle,
  isPresenterAnnotating = false,
  onToggleAnnotationDemo,
  isAudioOnly = false,
  onAudioOnlyToggle,
  raisedHands = [],
  raisedHandIds,
  participantsUsers,
  onOpenRtt,
  isRttOn = false,
  enableVoiceNoiseControl = false,
  voiceNoiseMode = "off",
  onVoiceNoiseModeChange,
  isDesktopFriendlyView = false,
  onDesktopFriendlyViewToggle,
}: MorePanelProps) {
  const [currentView, setCurrentView] = React.useState<NestedView>(initialView);
  const { activeVersionId } = useVersion();
  const isFy27Mvp = isMvpFamily(activeVersionId);
  const isMvpCheckpoint = activeVersionId === "mvp-checkpoint";
  const { meetingTitle } = useActiveMeeting();
  const [reportMeetingOpen, setReportMeetingOpen] = React.useState(false);
  // Consolidated A/V settings (MVP checkpoint): background effect selection, mirrors PreJoinPage.
  const [backgroundEffect, setBackgroundEffect] = React.useState<"none" | "blur">("none");
  const noop = () => {};
  const voiceNoiseModeLabel = voiceNoiseMode === "off"
    ? "Default"
    : voiceNoiseMode === "noise-suppression"
      ? "Noise suppression"
      : "Voice isolation";

  // Sync initialView prop changes (e.g. when "View lobby" is clicked while panel is already mounted)
  React.useEffect(() => {
    if (initialView !== "main") {
      setCurrentView(initialView);
    }
  }, [initialView]);

  const handleBackToMain = () => {
    setCurrentView("main");
    setInitialView?.("main");
  };

  // Main menu view
  if (currentView === "main") {
    // Same content as the existing grid, rendered via the reusable TileGrid (MVP).
    const moreTiles: TileGridItem[] = [
      { label: "Participants", onClick: () => setCurrentView("participants"), icon: <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsGrid.p1b349600} fill="currentColor" /></svg> },
      { label: "Share", onClick: () => setCurrentView("share"), icon: <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsGrid.p13afc980} fill="currentColor" /></svg> },
      {
        // View toggle (Figma POR 1496:17394) — gallery ↔ audio-only. Default offers
        // "Audio only view" (Person Voice glyph); once on, offers "Gallery view" (Grid).
        label: isAudioOnly ? "Gallery view" : "Audio only view",
        onClick: () => onAudioOnlyToggle?.(),
        icon: isAudioOnly ? (
          <svg className="size-[18px]" fill="none" viewBox="0 0 18 18">
            <path d="M5.75 10C6.99264 10 8 11.0074 8 12.25V15.75C8 16.9926 6.99264 18 5.75 18H2.25C1.00736 18 0 16.9926 0 15.75V12.25C0 11.0074 1.00736 10 2.25 10H5.75ZM15.75 10C16.9926 10 18 11.0074 18 12.25V15.75C18 16.9926 16.9926 18 15.75 18H12.25C11.0074 18 10 16.9926 10 15.75V12.25C10 11.0074 11.0074 10 12.25 10H15.75ZM5.75 11.5H2.25C1.83579 11.5 1.5 11.8358 1.5 12.25V15.75C1.5 16.1642 1.83579 16.5 2.25 16.5H5.75C6.16421 16.5 6.5 16.1642 6.5 15.75V12.25C6.5 11.8358 6.16421 11.5 5.75 11.5ZM15.75 11.5H12.25C11.8358 11.5 11.5 11.8358 11.5 12.25V15.75C11.5 16.1642 11.8358 16.5 12.25 16.5H15.75C16.1642 16.5 16.5 16.1642 16.5 15.75V12.25C16.5 11.8358 16.1642 11.5 15.75 11.5ZM5.75 0C6.99264 0 8 1.00736 8 2.25V5.75C8 6.99264 6.99264 8 5.75 8H2.25C1.00736 8 0 6.99264 0 5.75V2.25C0 1.00736 1.00736 0 2.25 0H5.75ZM15.75 0C16.9926 0 18 1.00736 18 2.25V5.75C18 6.99264 16.9926 8 15.75 8H12.25C11.0074 8 10 6.99264 10 5.75V2.25C10 1.00736 11.0074 0 12.25 0H15.75ZM5.75 1.5H2.25C1.83579 1.5 1.5 1.83579 1.5 2.25V5.75C1.5 6.16421 1.83579 6.5 2.25 6.5H5.75C6.16421 6.5 6.5 6.16421 6.5 5.75V2.25C6.5 1.83579 6.16421 1.5 5.75 1.5ZM15.75 1.5H12.25C11.8358 1.5 11.5 1.83579 11.5 2.25V5.75C11.5 6.16421 11.8358 6.5 12.25 6.5H15.75C16.1642 6.5 16.5 6.16421 16.5 5.75V2.25C16.5 1.83579 16.1642 1.5 15.75 1.5Z" fill="currentColor" />
          </svg>
        ) : (
          <svg className="size-[22px]" fill="none" viewBox="0 0 20.9968 21.6274">
            <path d="M18.3878 0.092349C18.751 -0.106635 19.2069 0.0265607 19.4058 0.389849C20.4203 2.24201 20.9968 4.368 20.9968 6.6264C20.9968 8.88481 20.4203 11.0108 19.4058 12.863C19.2069 13.2262 18.751 13.3594 18.3878 13.1605C18.0245 12.9615 17.8913 12.5057 18.0903 12.1424C18.9868 10.5055 19.4968 8.62666 19.4968 6.6264C19.4968 4.62615 18.9868 2.74726 18.0903 1.11043C17.8913 0.747144 18.0245 0.291333 18.3878 0.092349ZM15.2863 2.68735C15.667 2.52405 16.108 2.70026 16.2713 3.08092C16.7384 4.16989 16.9968 5.36894 16.9968 6.62638C16.9968 7.88381 16.7384 9.08286 16.2713 10.1718C16.108 10.5525 15.667 10.7287 15.2863 10.5654C14.9057 10.4021 14.7295 9.96113 14.8928 9.58046C15.2813 8.6749 15.4968 7.67678 15.4968 6.62638C15.4968 5.57598 15.2813 4.57786 14.8928 3.67229C14.7295 3.29163 14.9057 2.85065 15.2863 2.68735ZM15.9995 15.8752C15.9995 14.6332 14.9927 13.6263 13.7506 13.6263H2.24888C1.00686 13.6263 0 14.6332 0 15.8752V16.4529C0 17.3456 0.318519 18.2091 0.89828 18.888C2.46458 20.7223 4.8506 21.6274 7.99646 21.6274C11.1418 21.6274 13.529 20.7226 15.0984 18.8891C15.6799 18.2097 15.9995 17.3449 15.9995 16.4506V15.8752ZM2.24888 15.1263H13.7506C14.1642 15.1263 14.4995 15.4616 14.4995 15.8752V16.4506C14.4995 16.9872 14.3078 17.5061 13.9588 17.9137C12.7024 19.3816 10.7348 20.1274 7.99646 20.1274C5.25815 20.1274 3.29228 19.3817 2.03897 17.914C1.69111 17.5066 1.5 16.9885 1.5 16.4529V15.8752C1.5 15.4616 1.83528 15.1263 2.24888 15.1263ZM12.9965 6.631C12.9965 3.86958 10.7579 1.631 7.99646 1.631C5.23503 1.631 2.99646 3.86958 2.99646 6.631C2.99646 9.39242 5.23503 11.631 7.99646 11.631C10.7579 11.631 12.9965 9.39242 12.9965 6.631ZM4.49646 6.631C4.49646 4.698 6.06346 3.131 7.99646 3.131C9.92945 3.131 11.4965 4.698 11.4965 6.631C11.4965 8.564 9.92945 10.131 7.99646 10.131C6.06346 10.131 4.49646 8.564 4.49646 6.631Z" fill="currentColor" />
          </svg>
        ),
      },
      { label: "Record", onClick: onRecordToggle, icon: <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsGrid.p3e114300} fill="currentColor" /></svg> },
      { label: "Transcription", icon: <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsGrid.pa260280} fill="currentColor" /></svg> },
      {
        label: areCaptionsOn ? "Hide captions" : "Show captions",
        onClick: onCaptionsToggle,
        icon: areCaptionsOn
          ? <svg className="size-[24px]" fill="none" viewBox="-2 -2 24 24"><path d={CC_OFF_PATH} fill="currentColor" /></svg>
          : <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsGrid.p3ba1a400} fill="currentColor" /></svg>,
      },
    ];
    return (
      <>
      <MultitaskingPanel
        title="More options"
        onClose={onClose}
        actionButton={undefined}
        showFooter={false}
      >
        {/* Scrollable Content */}
        <div className="px-4 pt-1 pb-3">
          {/* Reactions Row */}
          <div className={`flex items-center justify-between mb-5 ${isFy27Mvp ? "pt-[20px]" : ""}`}>
            <button onClick={() => onEmojiClick(imgThumbsUp)} className="cursor-pointer">
              <img src={imgThumbsUp} alt="Thumbs up" className="w-10 h-10" />
            </button>
            <button onClick={() => onEmojiClick(imgRedHeart)} className="cursor-pointer">
              <img src={imgRedHeart} alt="Red heart" className="w-10 h-10" />
            </button>
            <button onClick={() => onEmojiClick(imgClappingHands)} className="cursor-pointer">
              <img src={imgClappingHands} alt="Clapping hands" className="w-10 h-10" />
            </button>
            <button onClick={() => onEmojiClick(imgGrinningSquintingFace)} className="cursor-pointer">
              <img src={imgGrinningSquintingFace} alt="Grinning face" className="w-10 h-10" />
            </button>
            <div className={`w-[1px] h-10 ${isFy27Mvp ? "bg-fy27-divider" : "bg-white/20 bg-[rgb(50,50,50)]"}`} />
            <button 
              className={`rounded-[50px] flex items-center gap-[4px] px-[12px] py-[4px] ${isFy27Mvp ? "bg-fy27-surface-tertiary" : "bg-[#212122]"}`}
              onClick={onHandRaiseToggle}
            >
              <div className="overflow-clip relative shrink-0 size-[40px]">
                <img src={imgRaisedHand} alt="Raised hand" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" />
              </div>
              <div className="content-stretch flex items-center pr-[4px] relative shrink-0 w-[44px]">
                <div className={`flex flex-col justify-center leading-[0] relative shrink-0 text-[15px] text-center tracking-[-0.24px] whitespace-nowrap ${isFy27Mvp ? "text-fy27-text-primary" : "text-white"}`}>
                  <p className="leading-[20px] font-medium" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                    {isHandRaised ? "Lower" : "Raise"}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Menu Grid */}
          {isFy27Mvp ? (
            <div className="mb-6">
              <TileGrid items={moreTiles} />
            </div>
          ) : (
          <div className="bg-[rgba(36,36,37,0.7)] rounded-[24px] mb-6 py-1">
            {/* Top row */}
            <div className="flex items-center justify-center w-full">
              <button className="flex-1 min-h-px min-w-px cursor-pointer" onClick={() => setCurrentView("participants")}>
                <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.p1b349600} fill="white" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Participants</p>
                    </div>
                  </div>
                </div>
              </button>
              <button className="flex-1 min-h-px min-w-px cursor-pointer" onClick={() => setCurrentView("share")}>
                <div className="flex flex-col items-center justify-center size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.p13afc980} fill="white" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Share</p>
                    </div>
                  </div>
                </div>
              </button>
              <div className="flex-1 min-h-px min-w-px">
                <div className="flex flex-col items-center justify-center size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.p16224e00} fill="white" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Apps</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Bottom row */}
            <div className="flex items-center justify-center w-full">
              <button className="flex-1 min-h-px min-w-px cursor-pointer" onClick={onRecordToggle}>
                <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.p3e114300} fill="white" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Record</p>
                    </div>
                  </div>
                </div>
              </button>
              <div className="flex-1 min-h-px min-w-px">
                <div className="flex flex-col items-center justify-center size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.pa260280} fill="white" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Transcription</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-px min-w-px">
                <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
                  <div className="flex flex-col items-center justify-center px-[8px] py-[12px] w-full">
                    <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip shrink-0">
                      <svg className="block size-[24px]" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                        <path d={svgPathsGrid.p3ba1a400} fill="#E1E1E1" />
                      </svg>
                      <p className="font-['SF_Pro_Text',sans-serif] leading-[16px] not-italic shrink-0 text-[12px] text-center text-white">Captions</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Settings List */}
          {isFy27Mvp ? (
            <div className="flex flex-col">
              {/* Figma "Grouped List" — see node 1170:41628. No per-row dividers. */}
              <MvpListRow
                icon={<HandDrawIcon size={20} />}
                label={isPresenterAnnotating ? "Spatial annotations (on — demo)" : "Spatial annotations"}
                onClick={() => onToggleAnnotationDemo?.()}
              />
              <MvpListRow
                icon={<AppsIcon size={20} />}
                label="Apps"
                subtitle="Start adding apps"
                trailing={<ChevronRightIcon size={12} />}
                onClick={noop}
              />
              {isMvpCheckpoint ? (
                <>
                  {enableVoiceNoiseControl && (
                    <MvpListRow
                      icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p366d01f0} fill="currentColor" /></svg>}
                      label="Microphone settings"
                      subtitle={voiceNoiseModeLabel}
                      trailing={<ChevronRightIcon size={12} />}
                      onClick={() => setCurrentView("microphoneSettings")}
                    />
                  )}
                  {enableVoiceNoiseControl && (
                    <MvpListRow
                      icon={<BackgroundEffectsIcon size={20} />}
                      label="Video settings"
                      subtitle={backgroundEffect === "blur" ? "Blur" : "None"}
                      trailing={<ChevronRightIcon size={12} />}
                      onClick={() => setCurrentView("videoSettings")}
                    />
                  )}
                  <MvpListRow
                    icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p366d01f0} fill="currentColor" /></svg>}
                    label="Speaker audio"
                    onClick={noop}
                  />
                  <MvpListRow
                    icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p421bbf0} fill="currentColor" /></svg>}
                    label="Language settings"
                    onClick={noop}
                  />
                </>
              ) : (
                <MvpListRow
                  icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsMore.p3489a600} fill="currentColor" /></svg>}
                  label="Meeting settings"
                  trailing={<ChevronRightIcon size={12} />}
                  onClick={() => setCurrentView("meetingSettings")}
                />
              )}
              {!isMvpCheckpoint && (
                <MvpListRow icon={<BackgroundEffectsIcon size={20} />} label="Background effects" onClick={noop} />
              )}
              <MvpListRow icon={<CallMyPhoneIcon size={20} />} label="Call my phone" onClick={noop} />
              <MvpListRow icon={<IncomingVideoOffIcon size={20} />} label="Turn off incoming video" onClick={noop} />
              <MvpListRow icon={<HoldIcon size={20} />} label="Put me on hold" onClick={noop} />
              <MvpListRow
                icon={<RttIcon size={20} />}
                label={isRttOn ? "Show RTT" : "Turn on RTT for this meeting"}
                onClick={() => onOpenRtt?.()}
              />
              <MvpListRow icon={<ChatOffIcon size={20} />} label="Don't show chat bubbles" onClick={noop} />

              <MvpListRow
                icon={<RecordIcon size={20} />}
                label="Start recording"
                subtitle="Start both recording and transcription"
                onClick={() => onRecordToggle?.()}
              />
              <MvpListRow icon={<TranscriptionIcon size={20} />} label="Start transcription" onClick={noop} />
              <MvpListCaption text="Start recording or transcription to turn on Copilot" />
              <MvpListRow icon={<LockIcon size={20} />} label="Lock the meeting" onClick={noop} />
              <MvpListRow icon={<DialpadIcon size={20} />} label="Dialpad" onClick={noop} />
              <MvpListRow
                icon={<InfoIcon size={20} />}
                label="Call information"
                onClick={noop}
              />

              {/* Extra items (not in Figma) — reuse the FV row icons/handlers. */}
              <MvpListRow
                icon={
                  <svg className="size-[24px]" fill="none" viewBox="0 0 24 24">
                    <path d={svgPathsMore.p1f0f6680} fill="currentColor" />
                  </svg>
                }
                label="Turn on interpreter for me"
                onClick={() => onInterpreterToggle?.()}
              />
              <MvpListRow
                icon={
                  <svg className="size-[24px]" fill="none" viewBox="0 0 24 24">
                    <path d={svgPathsMore.p4020000} fill="currentColor" />
                  </svg>
                }
                label="Report this meeting"
                onClick={() => setReportMeetingOpen(true)}
              />
              <MvpListRow
                icon={
                  isContentSharing ? (
                    <svg className="size-[24px]" fill="none" viewBox="0 0 20 20"><path d={DESKTOP_OFF_PATH} fill="currentColor" /></svg>
                  ) : (
                    <svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsDesktop.pf1a6a00} fill="currentColor" /></svg>
                  )
                }
                label={isContentSharing ? "Hide shared content" : "Show shared content"}
                onClick={() => onContentSharingToggle?.()}
              />
            </div>
          ) : (
          <div className="bg-[rgba(36,36,37,0.7)] rounded-[24px] overflow-hidden py-0.5">
            {/* Turn on interpreter */}
            <button className="w-full px-4 py-3 flex items-center gap-4 relative cursor-pointer" onClick={onInterpreterToggle}>
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsMore.p1f0f6680} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Turn on interpreter for me
              </span>
              {/* Border bottom - full width */}
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Meeting info */}
            <button 
              className="w-full px-4 py-3.5 flex items-center justify-between gap-4 relative cursor-pointer"
              onClick={() => setCurrentView("meetingInfo")}
            >
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d={svgPathsMore.p4aa6d00} fill="white" />
                </svg>
                <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                  Meeting info
                </span>
              </div>
              <svg className="w-4 h-4 -rotate-90" fill="none" viewBox="0 0 12 12">
                <path d={svgPathsMore.pf4077f0} fill="white" />
              </svg>
              {/* Border bottom - full width */}
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Meeting settings */}
            <button 
              className="w-full px-4 py-3.5 flex items-center justify-between gap-4 relative cursor-pointer"
              onClick={() => setCurrentView("meetingSettings")}
            >
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <path d={svgPathsMore.p3489a600} fill="white" />
                </svg>
                <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                  Meeting settings
                </span>
              </div>
              <svg className="w-4 h-4 -rotate-90" fill="none" viewBox="0 0 12 12">
                <path d={svgPathsMore.pf4077f0} fill="white" />
              </svg>
              {/* Border bottom - full width */}
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Report this meeting */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsMore.p4020000} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Report this meeting
              </span>
              {/* Border bottom - full width */}
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Content sharing toggle — "Turn on/off content sharing" */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 cursor-pointer" onClick={onContentSharingToggle}>
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox={isContentSharing ? "0 0 20 20" : "0 0 24 24"}>
                <path d={isContentSharing ? DESKTOP_OFF_PATH : svgPathsDesktop.pf1a6a00} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                {isContentSharing ? "Hide shared content" : "Show shared content"}
              </span>
            </button>
          </div>
          )}
        </div>
      </MultitaskingPanel>

      {/* Report a security concern — reuses the report sheet with a meeting chiclet
          subject instead of a persona card. Opened from "Report this meeting". */}
      <ReportParticipantSheet
        open={reportMeetingOpen}
        onClose={() => setReportMeetingOpen(false)}
        title="Report a security concern"
        name={meetingTitle || "Marketing Team Sync"}
        subject={<MeetingChiclet name={meetingTitle || "Marketing Team Sync"} subtitle="Conf Room LSQ/13057" />}
      />
      </>
    );
  }

  // Meeting Info nested view
  if (currentView === "meetingInfo") {
    return (
      <MultitaskingPanel
        title="Meeting info"
        onClose={handleBackToMain}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-transparent">
          {isFy27Mvp ? (
            <div className="flex flex-col pt-[20px]">
              <MvpListRow icon={<CallMyPhoneIcon size={20} />} label="Call my phone" onClick={noop} />
              <MvpListRow icon={<DialpadIcon size={20} />} label="Dialpad" onClick={noop} />
              <MvpListRow icon={<InfoIcon size={20} />} label="Call information" onClick={noop} />
            </div>
          ) : (
          <div className="bg-[rgba(36,36,37,0.7)] rounded-[24px] overflow-hidden mx-4 mt-4">
            {/* Call my phone */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsPhone.p2732c200} fill="#E1E1E1" />
              </svg>
              <span className="text-[#e1e1e1] text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Call my phone
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Dialpad */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <div className="w-6 h-6 flex-shrink-0">
                <Icon24X />
              </div>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Dialpad
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Call information */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsMore.p4aa6d00} fill="#E1E1E1" />
              </svg>
              <span className="text-[#e1e1e1] text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Call information
              </span>
            </button>
          </div>
          )}
        </div>
      </MultitaskingPanel>
    );
  }

  // Meeting Settings nested view
  if (currentView === "meetingSettings") {
    return (
      <MultitaskingPanel
        title="Meeting settings"
        onClose={handleBackToMain}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-transparent">
          {isFy27Mvp ? (
            <div className="flex flex-col pt-[20px]">
              {enableVoiceNoiseControl && (
                <MvpListRow
                  icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p366d01f0} fill="currentColor" /></svg>}
                  label="Microphone settings"
                  subtitle={voiceNoiseModeLabel}
                  trailing={<ChevronRightIcon size={12} />}
                  onClick={() => setCurrentView("microphoneSettings")}
                />
              )}
              {enableVoiceNoiseControl && (
                <MvpListRow
                  icon={<BackgroundEffectsIcon size={20} />}
                  label="Video settings"
                  subtitle={backgroundEffect === "blur" ? "Blur" : "None"}
                  trailing={<ChevronRightIcon size={12} />}
                  onClick={() => setCurrentView("videoSettings")}
                />
              )}
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p366d01f0} fill="currentColor" /></svg>}
                label="Speaker audio"
                onClick={noop}
              />
              {!enableVoiceNoiseControl && (
                <MvpListRow icon={<BackgroundEffectsIcon size={20} />} label="Background effects" onClick={noop} />
              )}
              <MvpListRow icon={<HoldIcon size={20} />} label="Put me on hold" onClick={noop} />
              <MvpListRow icon={<RttIcon size={20} />} label="Turn on RTT for this meeting" onClick={noop} />
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsSettings.p421bbf0} fill="currentColor" /></svg>}
                label="Language settings"
                onClick={noop}
              />
              <MvpListRow icon={<LockIcon size={20} />} label="Lock the meeting" onClick={noop} />
            </div>
          ) : (
          <div className="bg-[rgba(36,36,37,0.7)] rounded-[24px] overflow-hidden mx-4 mt-4">
            {/* Speaker audio */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p366d01f0} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Speaker audio
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Background effects */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p2703a100} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Background effects
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Put me on hold */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p3ee99080} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Put me on hold
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Turn on RTT for this meeting */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p1b7cba00} fill="#E1E1E1" />
              </svg>
              <span className="text-[#e1e1e1] text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Turn on RTT for this meeting
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Language settings */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p421bbf0} fill="#E1E1E1" />
              </svg>
              <span className="text-[#e1e1e1] text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Language settings
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Lock the meeting */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsSettings.p1e730880} fill="#E1E1E1" />
              </svg>
              <span className="text-[#e1e1e1] text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Lock the meeting
              </span>
            </button>
          </div>
          )}
        </div>
      </MultitaskingPanel>
    );
  }

  if (currentView === "microphoneSettings") {
    const options: Array<{
      id: "off" | "noise-suppression" | "voice-isolation";
      label: string;
      description: string;
    }> = [
      { id: "off", label: "Default", description: "No additional filtering" },
      { id: "noise-suppression", label: "Noise suppression", description: "Reduces background noise" },
      { id: "voice-isolation", label: "Voice isolation", description: "Keeps only your voice audible" },
    ];

    return (
      <MultitaskingPanel
        title="Microphone settings"
        onClose={handleBackToMain}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-fy27-surface-base pt-[20px] pb-[16px]">
          <div className="mx-[16px] rounded-[16px] bg-fy27-surface overflow-hidden">
            {options.map((option) => {
              const isActive = voiceNoiseMode === option.id;
              return (
                <AudioSettingListRow
                  key={option.id}
                  mode={option.id}
                  label={option.label}
                  description={option.description}
                  isSelected={isActive}
                  onClick={() => onVoiceNoiseModeChange?.(option.id)}
                />
              );
            })}
          </div>

        </div>
      </MultitaskingPanel>
    );
  }

  if (currentView === "videoSettings") {
    return (
      <MultitaskingPanel
        title="Video settings"
        onClose={handleBackToMain}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-fy27-surface-base pt-[20px] pb-[16px]">
          <div className="mx-[16px] rounded-[16px] bg-fy27-surface overflow-hidden">
            <button
              type="button"
              className="w-full min-h-[64px] px-[20px] py-[12px] flex items-center gap-[16px] text-left text-fy27-text-primary active:opacity-70"
              onClick={() => setCurrentView("videoSettingsBackgroundEffects")}
            >
              <span className="size-[24px] shrink-0 inline-flex items-center justify-center" aria-hidden="true">
                <BackgroundEffectsIcon size={24} />
              </span>
              <span className="flex-1 min-w-0 text-[17px] leading-[22px]">Background effects</span>
              <span className="shrink-0 text-fy27-icon-secondary"><IconChevronRight size={20} /></span>
            </button>
            <div className="w-full px-[20px] py-[12px] flex items-center gap-[16px] text-fy27-text-primary">
              <span className="size-[24px] shrink-0 inline-flex items-center justify-center" aria-hidden="true">
                <DesktopFriendlyIcon />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] leading-[22px]">Desktop-friendly view</span>
                <span className="block text-fy27-text-secondary text-[13px] leading-[18px] mt-[1px]">Crops your video to 16:9 feed</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDesktopFriendlyView}
                aria-label="Desktop-friendly view"
                onClick={() => onDesktopFriendlyViewToggle?.()}
                className={`relative w-[52px] h-[32px] rounded-full shrink-0 transition-colors ${isDesktopFriendlyView ? "bg-fy27-brand" : "bg-fy27-icon-disabled"}`}
              >
                <span className={`absolute left-0 top-[2px] size-[28px] rounded-full bg-white shadow-sm transition-transform ${isDesktopFriendlyView ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
              </button>
            </div>
          </div>
        </div>
      </MultitaskingPanel>
    );
  }

  if (currentView === "videoSettingsBackgroundEffects") {
    return (
      <MultitaskingPanel
        title="Background effects"
        onClose={() => setCurrentView("videoSettings")}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-transparent pt-[20px] px-[16px] pb-[16px]">
          <div className="rounded-[16px] bg-fy27-surface overflow-hidden">
            {([
              { id: "none", label: "None" },
              { id: "blur", label: "Blur" },
            ] as const).map((option, idx, arr) => {
              const isSelected = backgroundEffect === option.id;
              return (
                <AudioSettingListRow
                  key={option.id}
                  label={option.label}
                  isSelected={isSelected}
                  showDivider={idx < arr.length - 1}
                  onClick={() => setBackgroundEffect(option.id)}
                />
              );
            })}
          </div>
        </div>
      </MultitaskingPanel>
    );
  }

  // Share nested view
  if (currentView === "share") {
    return (
      <MultitaskingPanel
        title="Share"
        onClose={handleBackToMain}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex-1 overflow-y-auto bg-transparent">
          {isFy27Mvp ? (
            <div className="flex flex-col pt-[20px]">
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsShare.p1f882200} fill="currentColor" /></svg>}
                label="Share PowerPoint"
                onClick={noop}
              />
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsShare.p2444ec80} fill="currentColor" /></svg>}
                label="Share photo"
                onClick={noop}
              />
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsShare.p6f85b80} fill="currentColor" /></svg>}
                label="Share video"
                onClick={noop}
              />
              <MvpListRow
                icon={<svg className="size-[24px]" fill="none" viewBox="0 0 24 24"><path d={svgPathsShare.p13afc980} fill="currentColor" /></svg>}
                label="Share screen"
                onClick={() => setCurrentView("shareScreen")}
              />
            </div>
          ) : (
          <div className="bg-[rgba(36,36,37,0.7)] rounded-[24px] overflow-hidden mx-4 mt-4 py-[2px]">
            {/* Share PowerPoint */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsShare.p1f882200} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Share PowerPoint
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Share photo */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsShare.p2444ec80} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Share photo
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Share video */}
            <button className="w-full px-4 py-3.5 flex items-center gap-4 relative">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsShare.p6f85b80} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Share video
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-[0.5px] bg-[#323232]" />
            </button>

            {/* Share screen — MVP drills into a deeper (L3) view; FV is a leaf. */}
            <button
              className="w-full px-4 py-3.5 flex items-center gap-4"
              onClick={isFy27Mvp ? () => setCurrentView("shareScreen") : undefined}
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <path d={svgPathsShare.p13afc980} fill="white" />
              </svg>
              <span className="text-white text-[17px] tracking-[-0.41px] leading-[22px] font-normal" style={{ fontFamily: 'var(--font-sf-pro)' }}>
                Share screen
              </span>
            </button>
          </div>
          )}
        </div>
      </MultitaskingPanel>
    );
  }

  // Share screen — L3 nested view (MVP only; reached from Share → Share screen).
  if (currentView === "shareScreen") {
    return (
      <MultitaskingPanel
        title="Share screen"
        onClose={() => setCurrentView("share")}
        actionButton={undefined}
        showFooter={false}
        isNestedView={true}
      >
        <div className="flex flex-col pt-[20px]">
          {/* Two one-line list items (both no-op). Reuse the screen-share glyph
              from svgPathsShare; rendered at 20px in a 24px slot. */}
          <MvpListRow
            icon={
              <svg className="size-[24px]" fill="none" viewBox="-2 -2 24 24">
                <path d={SPEAKER_ON_PATH} fill="currentColor" />
              </svg>
            }
            label="Share screen with audio"
            onClick={noop}
          />
          <MvpListRow
            icon={
              <svg className="size-[24px]" fill="none" viewBox="-2 -2 24 24">
                <path d={SPEAKER_OFF_PATH} fill="currentColor" />
              </svg>
            }
            label="Share screen without audio"
            onClick={noop}
          />
        </div>
      </MultitaskingPanel>
    );
  }

  // Participants nested view
  if (currentView === "participants") {
    return (
      <ParticipantsPanel
        onClose={handleBackToMain}
        hasLobbyGuests={hasLobbyGuests}
        raisedHands={raisedHands}
        raisedHandIds={raisedHandIds}
        users={participantsUsers}
      />
    );
  }

  return null;
}