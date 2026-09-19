import React from "react";
import { useNavigate } from "react-router";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { useEcsFlag, ECS } from "@/app/lib/ecs";
import { MicOffIcon } from "@/app/components/MicOffIcon";
import { VideoOffIcon } from "@/app/components/VideoOffIcon";

import imgBabak from "@/assets/figma/catchup/conv-avatar.png";
import presenceDot from "@/assets/figma/catchup/conv-presence.svg";
import recordingDot from "@/assets/figma/catchup/recording-dot.svg";
import stripVideo from "@/assets/figma/catchup/strip-video.svg";
import stripMic from "@/assets/figma/catchup/strip-mic.svg";
import atMention from "@/assets/figma/catchup/at-mention.svg";
import composerPlus from "@/assets/figma/catchup/composer-plus.svg";

/* Neutral monochrome glyphs as inline SVG paths so they take a theme token
 * color (default Icon/Primary) via `currentColor`. Inline SVG (not a CSS mask or
 * <img>) guarantees ONLY the glyph path is painted — the icon frame stays
 * transparent — and stays crisp/recolorable on iOS Safari. */
const GLYPHS: Record<string, { vb: string; d: string }> = {
  back: {
    vb: "0 0 10.5003 20.0015",
    d: "M10.2273 1.68664C10.6065 1.28513 10.5885 0.652221 10.1869 0.273002C9.78544 -0.106217 9.15253 -0.0881455 8.77331 0.313366L0.272999 9.31337C-0.0909785 9.69874 -0.0910027 10.3012 0.272944 10.6866L8.77326 19.688C9.15244 20.0896 9.78535 20.1077 10.1869 19.7285C10.5884 19.3493 10.6066 18.7164 10.2274 18.3149L2.37546 10.0001L10.2273 1.68664Z",
  },
  bell: {
    vb: "0 0 24 24",
    d: "M5.21938 6.27997L2.21966 3.28019C1.92677 2.9873 1.92678 2.51242 2.21968 2.21953C2.51257 1.92664 2.98745 1.92665 3.28034 2.21954L21.7801 20.7197C22.073 21.0126 22.073 21.4875 21.7801 21.7804C21.4872 22.0732 21.0123 22.0732 20.7194 21.7803L17.4398 18.5006L15.0001 18.5014C15.0001 20.1582 13.657 21.5014 12.0001 21.5014C10.4024 21.5014 9.09645 20.2524 9.0052 18.6776L8.99966 18.4991L4.27498 18.4999C4.10364 18.4999 3.93413 18.4646 3.77697 18.3964C3.14377 18.1213 2.85342 17.3851 3.12846 16.7519L4.50011 13.594V9.49599C4.50028 8.34367 4.7582 7.25363 5.21938 6.27997ZM15.9391 16.9999L6.36473 7.42534C6.1289 8.07014 6.00022 8.76748 6.00011 9.49609V13.9057L4.65613 16.9999H15.9391ZM13.4997 18.4991L10.5001 18.5014C10.5001 19.3298 11.1717 20.0014 12.0001 20.0014C12.7798 20.0014 13.4206 19.4065 13.4932 18.6458L13.4997 18.4991ZM18.0001 13.9067L18.7084 15.5266L20.8958 17.714C20.9532 17.5705 20.9848 17.4139 20.9848 17.2499C20.9848 17.0775 20.9492 16.907 20.8801 16.7491L19.5001 13.5931V9.49609L19.4959 9.24515C19.3568 5.19084 16.05 1.99609 12.0001 1.99609C10.0984 1.99609 8.36403 2.69926 7.0433 3.86123L8.10667 4.92462C9.15366 4.03291 10.5126 3.49609 12.0001 3.49609C15.2417 3.49609 17.8854 6.05027 17.9965 9.28375L18.0002 9.50895L18.0001 13.9067Z",
  },
  stripChevron: {
    vb: "0 0 12 12",
    d: "M4.64645 2.14645C4.45118 2.34171 4.45118 2.65829 4.64645 2.85355L7.79289 6L4.64645 9.14645C4.45118 9.34171 4.45118 9.65829 4.64645 9.85355C4.84171 10.0488 5.15829 10.0488 5.35355 9.85355L8.85355 6.35355C9.04882 6.15829 9.04882 5.84171 8.85355 5.64645L5.35355 2.14645C5.15829 1.95118 4.84171 1.95118 4.64645 2.14645Z",
  },
  emoji: {
    vb: "0 0 20.0031 20.0031",
    d: "M10.0016 0C15.5253 0 20.0031 4.47785 20.0031 10.0016C20.0031 15.5253 15.5253 20.0031 10.0016 20.0031C4.47785 20.0031 0 15.5253 0 10.0016C0 4.47785 4.47785 0 10.0016 0ZM10.0016 1.5C5.30627 1.5 1.5 5.30627 1.5 10.0016C1.5 14.6968 5.30627 18.5031 10.0016 18.5031C14.6968 18.5031 18.5031 14.6968 18.5031 10.0016C18.5031 5.30627 14.6968 1.5 10.0016 1.5ZM6.46329 12.7849C7.31243 13.8626 8.60344 14.5031 10.0015 14.5031C11.3978 14.5031 12.6872 13.8643 13.5365 12.789C13.7932 12.464 14.2649 12.4086 14.5899 12.6653C14.915 12.9221 14.9704 13.3937 14.7136 13.7187C13.5829 15.1504 11.8617 16.0031 10.0015 16.0031C8.1389 16.0031 6.41567 15.1481 5.28507 13.7132C5.02872 13.3878 5.08466 12.9163 5.41002 12.6599C5.73537 12.4036 6.20694 12.4595 6.46329 12.7849ZM7.002 6.75219C7.69196 6.75219 8.25129 7.31152 8.25129 8.00148C8.25129 8.69144 7.69196 9.25077 7.002 9.25077C6.31204 9.25077 5.75271 8.69144 5.75271 8.00148C5.75271 7.31152 6.31204 6.75219 7.002 6.75219ZM13.002 6.75219C13.692 6.75219 14.2513 7.31152 14.2513 8.00148C14.2513 8.69144 13.692 9.25077 13.002 9.25077C12.312 9.25077 11.7527 8.69144 11.7527 8.00148C11.7527 7.31152 12.312 6.75219 13.002 6.75219Z",
  },
  camera: {
    vb: "0 0 20 18.497",
    d: "M11.9247 0C12.7225 0 13.4607 0.422475 13.8647 1.11037L14.6793 2.49695H16.75C18.5449 2.49695 20 3.95203 20 5.74695V15.247C20 17.0419 18.5449 18.497 16.75 18.497H3.25C1.45507 18.497 0 17.0419 0 15.247V5.74695C0 3.95203 1.45507 2.49695 3.25 2.49695H5.33042L6.205 1.07265C6.61425 0.406155 7.34026 0 8.12238 0H11.9247ZM11.9247 1.5H8.12238C7.89892 1.5 7.6892 1.59947 7.54793 1.76779L7.48325 1.85755L6.38913 3.6394C6.25271 3.86157 6.01071 3.99695 5.75 3.99695H3.25C2.2835 3.99695 1.5 4.78045 1.5 5.74695V15.247C1.5 16.2135 2.2835 16.997 3.25 16.997H16.75C17.7165 16.997 18.5 16.2135 18.5 15.247V5.74695C18.5 4.78045 17.7165 3.99695 16.75 3.99695H14.25C13.9841 3.99695 13.738 3.85613 13.6033 3.62683L12.5714 1.87012C12.4367 1.64082 12.1906 1.5 11.9247 1.5ZM10 5.49695C12.4853 5.49695 14.5 7.51167 14.5 9.99695C14.5 12.4822 12.4853 14.497 10 14.497C7.51472 14.497 5.5 12.4822 5.5 9.99695C5.5 7.51167 7.51472 5.49695 10 5.49695ZM10 6.99695C8.34315 6.99695 7 8.3401 7 9.99695C7 11.6538 8.34315 12.997 10 12.997C11.6569 12.997 13 11.6538 13 9.99695C13 8.3401 11.6569 6.99695 10 6.99695Z",
  },
  mic: {
    vb: "0 0 14 20",
    d: "M13.25 9C13.6297 9 13.9435 9.28215 13.9932 9.64823L14 9.75V10.25C14 13.8094 11.245 16.7254 7.75098 16.9817L7.75 19.25C7.75 19.6642 7.41421 20 7 20C6.6203 20 6.30651 19.7178 6.25685 19.3518L6.25 19.25L6.25002 16.9818C2.83323 16.7316 0.122835 13.938 0.00406027 10.4863L0 10.25V9.75C0 9.33579 0.335786 9 0.75 9C1.1297 9 1.44349 9.28215 1.49315 9.64823L1.5 9.75V10.25C1.5 13.077 3.73445 15.3821 6.5336 15.4956L6.75 15.5H7.25C10.077 15.5 12.3821 13.2656 12.4956 10.4664L12.5 10.25V9.75C12.5 9.33579 12.8358 9 13.25 9ZM7 0C9.20914 0 11 1.79086 11 4V10C11 12.2091 9.20914 14 7 14C4.79086 14 3 12.2091 3 10V4C3 1.79086 4.79086 0 7 0ZM7 1.5C5.61929 1.5 4.5 2.61929 4.5 4V10C4.5 11.3807 5.61929 12.5 7 12.5C8.38071 12.5 9.5 11.3807 9.5 10V4C9.5 2.61929 8.38071 1.5 7 1.5Z",
  },
  more: {
    vb: "0 0 13.5 3.5",
    d: "M3.5 1.75C3.5 2.7165 2.7165 3.5 1.75 3.5C0.783502 3.5 0 2.7165 0 1.75C0 0.783502 0.783502 0 1.75 0C2.7165 0 3.5 0.783502 3.5 1.75ZM8.5 1.75C8.5 2.7165 7.7165 3.5 6.75 3.5C5.7835 3.5 5 2.7165 5 1.75C5 0.783502 5.7835 0 6.75 0C7.7165 0 8.5 0.783502 8.5 1.75ZM11.75 3.5C12.7165 3.5 13.5 2.7165 13.5 1.75C13.5 0.783502 12.7165 0 11.75 0C10.7835 0 10 0.783502 10 1.75C10 2.7165 10.7835 3.5 11.75 3.5Z",
  },
};

function Glyph({
  name,
  color = "var(--fy27-icon-primary)",
  className,
  style,
}: {
  name: keyof typeof GLYPHS;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const g = GLYPHS[name];
  return (
    <svg
      aria-hidden
      viewBox={g.vb}
      className={className}
      style={{ color, display: "block", ...style }}
    >
      <path d={g.d} fill="currentColor" />
    </svg>
  );
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ─── Message thread model ─── */
interface Msg {
  id: string;
  side: "in" | "out";
  text: React.ReactNode;
}

// Grouped exactly as the frame: incoming pair (4px gap) then outgoing, then
// Last-read divider, then the @-mention incoming bubble.
const MESSAGES: Msg[] = [
  {
    id: "1",
    side: "in",
    text: "Hey, I tried the onboarding flow prototype. It feels like to much of work. There are various representations like pinned and starred etc. It may get confusing.",
  },
  {
    id: "2",
    side: "in",
    text: "We could try stepper approach. Although it will add steps to the flow, having a single action/decision at a time will make it simpler than trying to cramp everything on a single screen.",
  },
  {
    id: "3",
    side: "out",
    text: "Agree! I have drafted a proposal for a new onboarding experience. Let’s review it with in the weekly sync.",
  },
];

/* iOS/Body 1 — SF Pro Text Regular 17 / 22 / -0.41 (Teams 2 iOS chat bubble) */
const BUBBLE_TEXT =
  "text-[17px] leading-[22px] tracking-[-0.41px] [word-break:break-word]";

function Bubble({ m }: { m: Msg }) {
  const out = m.side === "out";
  return (
    <div className={`flex ${out ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[275px] rounded-[12px] p-[8px] ${BUBBLE_TEXT} ${
          out ? "bg-fy27-brand text-fy27-text-global" : "bg-fy27-surface-chat-incoming text-fy27-text-dominant"
        }`}
      >
        <span className="block max-w-[258px]">{m.text}</span>
      </div>
    </div>
  );
}

/**
 * L2 "Catch up" conversation surface — reached from the Catchup slice on the
 * Chat / Activity pages. Static content; only the back chevron (→ previous page)
 * and the minimized meeting dock strip (→ the meeting) are interactive. The dock
 * strip is rendered only while a meeting is ongoing (meeting.isActive).
 * Pixel rebuild of Figma frame 769-27207 (Deeper flows - catch up).
 */
export function CatchupPage() {
  const navigate = useNavigate();
  const meeting = useActiveMeeting();
  // ECS flag — gates the minimized meeting dock strip on this page. No UI: the
  // value below is the config default (flip true→false to turn the dock off).
  const [dockFlag] = useEcsFlag(ECS.catchupMeetingDock, true);

  const goToMeeting = () => {
    meeting.returnToMeeting();
    navigate("/meeting", { replace: true });
  };

  return (
    <div
      className="app-safe-top w-full h-full bg-fy27-surface-base flex flex-col relative overflow-hidden"
      style={{ fontFamily: "var(--font-sf-pro)" }}
    >
      {/* ─── Minimized meeting dock strip (ECS-gated, only while a meeting is ongoing) ─── */}
      {dockFlag && meeting.isActive && (
        <button
          onClick={goToMeeting}
          className="shrink-0 h-[40px] px-[16px] flex items-center gap-[4px] text-left"
          aria-label="Return to meeting"
        >
          {meeting.isRecording && <img src={recordingDot} alt="Recording" className="size-[12px] shrink-0" />}
          <span
            className={`min-w-0 truncate text-[15px] text-fy27-text-primary tracking-[-0.23px] ${meeting.isRecording ? "ml-[4px]" : ""}`}
            style={{ fontWeight: 510, lineHeight: "20px" }}
          >
            {meeting.meetingTitle}
          </span>
          <span className="flex-1" />
          <span
            className="text-[12px] text-fy27-text-secondary tabular-nums tracking-[0.06px]"
            style={{ lineHeight: "13px" }}
          >
            {formatElapsed(meeting.elapsed)}
          </span>
          <span className="mx-[2px] size-[3px] rounded-full bg-fy27-icon-secondary shrink-0" />
          {meeting.isVideoOn ? (
            <img src={stripVideo} alt="" className="size-[16px] shrink-0" />
          ) : (
            <VideoOffIcon width={16} height={16} color="var(--fy27-text-secondary)" />
          )}
          {meeting.isMicOn ? (
            <img src={stripMic} alt="" className="size-[16px] shrink-0" />
          ) : (
            <MicOffIcon size={14} color="var(--fy27-text-secondary)" />
          )}
          <Glyph name="stripChevron" color="var(--fy27-icon-secondary)" className="ml-[2px] size-[12px] shrink-0" />
        </button>
      )}

      {/* ─── Foreground — edge-to-edge, rounded top corners only ───
          The canvas is Surface/Subtle Fill (a hair off-white) so the white
          conversation cards lift off it — matching the Figma reference
          (1004:37234). It holds the "11 left" header, a stack of conversation
          cards (Babak in front), and the Keep unread / Mark as read action bar. */}
      <div className="flex-1 min-h-0 bg-fy27-surface-subtle-base rounded-tl-[20px] rounded-tr-[20px] overflow-hidden flex flex-col">
      {/* ─── Header: back · "11 left" · List ─── */}
      <div className="shrink-0 h-[48px] flex items-center relative bg-fy27-surface">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="absolute left-0 top-0 h-[48px] pl-[16px] pr-[10px] flex items-center"
        >
          <Glyph name="back" className="w-[11px] h-[20px]" />
        </button>
        <p
          className="flex-1 text-center text-[17px] text-fy27-text-dominant tracking-[-0.24px]"
          style={{ fontWeight: 510, lineHeight: "20px" }}
        >
          11 left
        </p>
        <button
          className="absolute right-0 top-0 h-[48px] pr-[18px] pl-[10px] flex items-center text-[15px] text-fy27-text-interactive tracking-[-0.24px]"
          style={{ fontWeight: 510, lineHeight: "20px" }}
        >
          List
        </button>
      </div>

      {/* ─── Conversation card stack ───
          The Surface/Subtle Fill canvas provides the contrast; each white card
          lifts off it with Shadow 02 (matching the Figma reference). The front
          Babak card sits on top; two card edges peek behind it as the remaining
          "11 left" unread chats. */}
      <div className="flex-1 min-h-0 relative bg-fy27-surface-subtle-base">
        {/* stacked peeks (the chats behind Babak) — narrower + lower, peeking at the bottom */}
        <div aria-hidden className="absolute left-[24px] right-[24px] top-[13px] bottom-[4px] bg-fy27-surface rounded-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.14),0px_0px_1px_rgba(0,0,0,0.12)]" />
        <div aria-hidden className="absolute left-[16px] right-[16px] top-[10px] bottom-[9px] bg-fy27-surface rounded-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.14),0px_0px_1px_rgba(0,0,0,0.12)]" />
        {/* front card — Babak Shammas (header · messages · composer); ~12px side / ~6px top padding */}
        <div className="absolute inset-x-[12px] top-[6px] bottom-[14px] bg-fy27-surface rounded-[16px] overflow-hidden flex flex-col shadow-[0px_1px_1px_rgba(0,0,0,0.14),0px_0px_1px_rgba(0,0,0,0.12)]">

      {/* ─── Conversation header: avatar · name/Available · bell-off ───
          Teams 2 iOS nav bar (Left-one-or-two-lines): 48px tall, leading/trailing
          padding 16px, avatar→title gap 8px (size/gap/horizontal/small). */}
      <div className="shrink-0 h-[48px] px-[16px] flex items-center gap-[8px] bg-fy27-surface shadow-[0px_1px_1px_rgba(0,0,0,0.14),0px_0px_1px_rgba(0,0,0,0.12)]">
        <div className="relative shrink-0 size-[32px]">
          <img src={imgBabak} alt="" className="size-[32px] rounded-full object-cover" />
          <img
            src={presenceDot}
            alt=""
            className="absolute -bottom-px -right-px size-[14px]"
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p
            className="text-[17px] text-fy27-text-primary truncate tracking-[-0.24px]"
            style={{ fontWeight: 510, lineHeight: "20px" }}
          >
            Babak Shammas
          </p>
          <p
            className="text-[11px] text-fy27-text-secondary truncate tracking-[0.06px]"
            style={{ lineHeight: "11px" }}
          >
            Available
          </p>
        </div>
        <button
          aria-label="Notifications off"
          className="size-[24px] shrink-0 flex items-center justify-center"
        >
          <Glyph name="bell" className="size-[24px]" />
        </button>
      </div>

      {/* ─── Message thread (scrollable) ─── */}
      <div className="flex-1 overflow-y-auto px-[16px] py-[12px] flex flex-col gap-[12px]">
        {/* Time separator */}
        <p className="text-center text-[12px] text-fy27-text-secondary leading-[16px]">
          Today 8:08 AM
        </p>

        <Bubble m={MESSAGES[0]} />

        {/* grouped incoming pair sits 4px from the first incoming bubble */}
        <Bubble m={MESSAGES[1]} />

        <Bubble m={MESSAGES[2]} />

        {/* Last read divider — line #5b5fc7, label SF Pro Text Bold 12 / 16 */}
        <div className="flex items-center gap-[12px] px-[12px]">
          <span className="flex-1 h-px bg-fy27-brand" />
          <span
            className="text-[12px] text-fy27-text-interactive leading-[16px]"
            style={{ fontWeight: 700 }}
          >
            Last read
          </span>
          <span className="flex-1 h-px bg-fy27-brand" />
        </div>

        {/* Incoming with @mention (Laurence in mention color) */}
        <div className="flex justify-start items-start gap-[4px]">
          <div
            className={`max-w-[275px] rounded-[12px] p-[8px] bg-fy27-surface-chat-incoming text-fy27-text-dominant ${BUBBLE_TEXT}`}
          >
            <span className="block max-w-[258px]">
              <span className="text-[#cc4a31]">Laurence</span>, I can get onboard
              with that! Let’s connect tomorrow in-person to detail out the
              proposal.
            </span>
          </div>
          <img src={atMention} alt="" className="size-[16px] shrink-0 mt-[2px]" />
        </div>
      </div>

      {/* ─── Composer (inside the Babak card) ───
          Plus (purple circle) · input pill with emoji INSIDE at the right ·
          camera + mic OUTSIDE the pill to its right. Each glyph rendered at its
          exact frame size, centered in a 24px box. */}
      <div className="shrink-0 px-[16px] py-[9px] flex items-center gap-[13px] bg-fy27-surface">
        <div className="shrink-0">
          <button
            aria-label="Add"
            className="size-[24px] rounded-full bg-fy27-brand flex items-center justify-center"
          >
            <img src={composerPlus} alt="" style={{ width: 9.5, height: 9.5 }} />
          </button>
        </div>
        <div className="flex-1 min-w-0 rounded-[12px] border border-fy27-divider flex items-center justify-between p-[8px]">
          <span className="flex-1 text-[15px] text-fy27-text-secondary tracking-[-0.078px] leading-[20px]">
            Type a message
          </span>
          <span className="size-[24px] shrink-0 flex items-center justify-center">
            <Glyph name="emoji" style={{ width: 20, height: 20 }} />
          </span>
        </div>
        <span className="size-[24px] shrink-0 flex items-center justify-center">
          <Glyph name="camera" style={{ width: 20, height: 18.5 }} />
        </span>
        <span className="size-[24px] shrink-0 flex items-center justify-center">
          <Glyph name="mic" style={{ width: 14, height: 20 }} />
        </span>
      </div>

      {/* close front Babak card + card-stack region */}
        </div>
      </div>

      {/* ─── Card actions: Keep unread · Mark as read · more ───
          Sits on the same Subtle Fill canvas as the card stack (no separate
          background); only the buttons themselves carry a fill. Both are the
          Teams 2 iOS "Pill button" (fully-rounded, Button-1 text, Shadow 02) —
          Keep unread = Surface/Primary, Mark as read = Brand/Accent Primary. */}
      <div className="shrink-0 px-[16px] pt-[12px] pb-[32px] flex items-center gap-[12px] bg-fy27-surface-subtle-base">
        <button
          className="flex-1 px-[16px] py-[10px] rounded-full bg-fy27-surface text-[15px] text-fy27-text-interactive tracking-[-0.24px] shadow-[0px_1px_2px_rgba(0,0,0,0.14),0px_0px_2px_rgba(0,0,0,0.12)] active:opacity-70 transition-opacity"
          style={{ fontWeight: 510, lineHeight: "20px" }}
        >
          Keep unread
        </button>
        <button
          className="flex-1 px-[16px] py-[10px] rounded-full bg-fy27-surface-accent-primary text-[15px] text-fy27-text-on-accent tracking-[-0.24px] shadow-[0px_1px_2px_rgba(0,0,0,0.14),0px_0px_2px_rgba(0,0,0,0.12)] active:opacity-90 transition-opacity"
          style={{ fontWeight: 510, lineHeight: "20px" }}
        >
          Mark as read
        </button>
        <button
          aria-label="More"
          className="size-[40px] shrink-0 rounded-full bg-fy27-surface flex items-center justify-center shadow-[0px_1px_2px_rgba(0,0,0,0.14),0px_0px_2px_rgba(0,0,0,0.12)]"
        >
          <Glyph name="more" className="w-[13.5px] h-[3.5px]" />
        </button>
      </div>
      </div>
    </div>
  );
}
