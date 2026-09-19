import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { DockUIProvider, useDockUI } from "@/app/components/DockUIContext";
import { MeetingDock } from "@/app/components/MeetingDock";
import { MeetingPiP } from "@/app/components/MeetingPiP";
import { DMHeader } from "@/app/components/DMHeader";
import { ChatThread } from "@/app/components/chat/ChatThread";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { useVersion } from "@/app/versioning/VersionContext";
import { useChatSend, type ChatMessage } from "@/app/components/chat/useChatSend";
import { generateContextualResponse } from "@/app/components/chat/contextualReply";
import { sendChatMessage, sendDMMessage } from "@/app/lib/llm";
import { DM_THREADS } from "@/app/lib/dmData";
import { getLastDockState } from "@/app/lib/dockPersist";

// Meeting participants — same five (with avatars) the in-meeting ChatPanel uses,
// so the "Marketing Team Sync" DM replies match the meeting chat exactly.
import imgBabak from "figma:asset/6900c5f1ebcee87405a464dc927c93633e66e145.png";
import imgMiguel from "figma:asset/685fc6dc030aab2cbea5b15f523d9ce42c11d689.png";
import imgJessica from "figma:asset/3b6bf95da1f13af67c0b3a5e3c9534b640591ce5.png";
import imgRay from "figma:asset/a55a7173204f1d7f74adab6c38113bc9eedbb180.png";
import imgSarah from "figma:asset/503fddd74dcc978ba951b5c79ebe96b95453b1eb.png";

const MEETING_PARTICIPANTS = [
  { name: "Babak S.", avatar: imgSarah },
  { name: "Sarah J.", avatar: imgBabak },
  { name: "Miguel S.", avatar: imgMiguel },
  { name: "Jessica K.", avatar: imgJessica },
  { name: "Ray T.", avatar: imgRay },
];

// Header avatar parity with the Chat list. The calendar-glyph rows (Marketing
// Team Sync / Design / Design exploration) render the same Fluent Calendar
// glyph the list uses; the people rows show a presence dot.
const CALENDAR_REGULAR =
  "M17.75 3C19.5449 3 21 4.45507 21 6.25V17.75C21 19.5449 19.5449 21 17.75 21H6.25C4.45507 21 3 19.5449 3 17.75V6.25C3 4.45507 4.45507 3 6.25 3H17.75ZM19.5 8.5H4.5V17.75C4.5 18.7165 5.2835 19.5 6.25 19.5H17.75C18.7165 19.5 19.5 18.7165 19.5 17.75V8.5ZM7.75 14.5C8.44036 14.5 9 15.0596 9 15.75C9 16.4404 8.44036 17 7.75 17C7.05964 17 6.5 16.4404 6.5 15.75C6.5 15.0596 7.05964 14.5 7.75 14.5ZM12 14.5C12.6904 14.5 13.25 15.0596 13.25 15.75C13.25 16.4404 12.6904 17 12 17C11.3096 17 10.75 16.4404 10.75 15.75C10.75 15.0596 11.3096 14.5 12 14.5ZM7.75 10.5C8.44036 10.5 9 11.0596 9 11.75C9 12.4404 8.44036 13 7.75 13C7.05964 13 6.5 12.4404 6.5 11.75C6.5 11.0596 7.05964 10.5 7.75 10.5ZM12 10.5C12.6904 10.5 13.25 11.0596 13.25 11.75C13.25 12.4404 12.6904 13 12 13C11.3096 13 10.75 12.4404 10.75 11.75C10.75 11.0596 11.3096 10.5 12 10.5ZM16.25 10.5C16.9404 10.5 17.5 11.0596 17.5 11.75C17.5 12.4404 16.9404 13 16.25 13C15.5596 13 15 12.4404 15 11.75C15 11.0596 15.5596 10.5 16.25 10.5ZM17.75 4.5H6.25C5.2835 4.5 4.5 5.2835 4.5 6.25V7H19.5V6.25C19.5 5.2835 18.7165 4.5 17.75 4.5Z";
const CALENDAR_IDS = new Set(["mkt", "explore"]);
const PRESENCE_IDS = new Set(["ray", "kat", "beth", "aadi1", "daisy2", "design"]);

function HeaderAvatar({ id, photo }: { id: string; photo: string }) {
  if (CALENDAR_IDS.has(id)) {
    return (
      <div className="size-[32px] rounded-full bg-fy27-surface-raised flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="size-[18px] block" fill="none" aria-hidden="true">
          <path d={CALENDAR_REGULAR} style={{ fill: "var(--fy27-icon-primary)" }} />
        </svg>
      </div>
    );
  }
  return <img src={photo} alt="" className="size-[32px] rounded-full object-cover" />;
}

/**
 * 1:1 DM chat page (sibling route — NO bottom nav). Replicates the AppShell
 * grey/white layering so the meeting dock peeks out behind a white rounded-top
 * foreground.
 *
 * The body must live INSIDE the DockUIProvider so it can consume the dock UI
 * context — hence the inner component split.
 */
export function DMChatPage() {
  // Seed the dock SYNCHRONOUSLY from the carried-over state so the first paint is
  // already correct — no expanded→collapsed (or reverse) flash on mount.
  const last = getLastDockState();
  return (
    <DockUIProvider
      initialSurfaceDefault={last === "minimized" ? "minimized" : "expanded"}
      initialManualState={last === "collapsed" ? "collapsed" : null}
    >
      <DMChatInner />
    </DockUIProvider>
  );
}

function DMChatInner() {
  const meeting = useActiveMeeting();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const id = conversationId ?? "";
  const { activeVersionId } = useVersion();
  // Checkpoint uses the floating PiP instead of the recessed dock + push-down layering.
  const isMvpCheckpoint = activeVersionId === "mvp-checkpoint";
  const docked = meeting.isActive && meeting.isBackgrounded && !isMvpCheckpoint;

  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Dock rubric for the 1:1 chat ──
  // The dock is seeded synchronously from the carried-over state in DMChatPage
  // (above the provider), so the first paint is already correct. We intentionally
  // do NOT wire useDockScroll here: this thread is bottom-anchored (it auto-scrolls
  // to the latest message), so a scroll-position collapse rule only fires spurious
  // reports that flip the dock and wipe manual/keyboard overrides — the source of
  // the open-flash and the keyboard-close auto-expand. The dock here is driven
  // purely by the carried state + header drag + keyboard focus.
  const { setManualState, manualState } = useDockUI();

  const isMkt = id === "mkt";
  const thread = !isMkt ? DM_THREADS[id] : undefined;

  // Local state for the seeded (non-mkt) threads. For `mkt` we drive the live
  // in-meeting thread from context, so this local state is unused there.
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(thread ? thread.messages : []);

  const messages = isMkt ? meeting.chatMessages : localMessages;
  const setMessages = isMkt ? meeting.setChatMessages : setLocalMessages;

  const headerName = isMkt ? "Marketing Team Sync" : thread?.name ?? "Chat";
  const headerPhoto = thread?.avatar ?? "";
  const headerPresence = PRESENCE_IDS.has(id);

  // Responder + reply fetcher differ per surface: a random meeting participant +
  // the meeting LLM for `mkt`; the fixed recipient + the DM LLM otherwise.
  const getResponder = useMemo(() => {
    if (isMkt) return () => MEETING_PARTICIPANTS[Math.floor(Math.random() * MEETING_PARTICIPANTS.length)];
    const members = thread?.members;
    if (members && members.length > 0) return () => members[Math.floor(Math.random() * members.length)];
    const r = { name: thread?.name ?? "Chat", avatar: thread?.avatar ?? "" };
    return () => r;
  }, [isMkt, thread]);

  const fetchReply = useMemo(() => {
    if (isMkt) {
      return (t: string, n: string, h: Array<{ sender: string; text: string; isMe: boolean }>) =>
        sendChatMessage(t, n, h, meeting.meetingTitle);
    }
    const name = thread?.name ?? "Chat";
    return (t: string, _n: string, h: Array<{ sender: string; text: string; isMe: boolean }>) =>
      sendDMMessage(t, name, h);
  }, [isMkt, thread, meeting.meetingTitle]);

  const dispatchSend = useChatSend({
    messages,
    setMessages,
    getResponder,
    fetchReply,
    fallback: generateContextualResponse,
  });

  // The on-screen keyboard's open state lives here (lifted from ChatThread) so
  // the page can force-close it when the dock becomes expanded — the two can
  // never both be "big".
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Keyboard ↔ dock coexistence:
  //  • Keyboard OPENS → collapse the dock (an expanded dock + open keyboard can't coexist).
  //  • Keyboard CLOSES → do NOT re-expand; leave the dock collapsed (the user can
  //    scroll up to expand it). Closing the keyboard never expands the dock.
  const onComposerFocusChange = (focused: boolean) => {
    if (focused) setManualState("collapsed");
    // On blur: intentionally no clearManual() — closing the keyboard leaves the
    // dock as-is (collapsed).
  };

  // If the dock becomes expanded while the keyboard is open, close the keyboard
  // (they can't coexist). Dragging the dock up to expand wins; the keyboard yields.
  useEffect(() => {
    if (isKeyboardOpen && manualState === "expanded") {
      setIsKeyboardOpen(false);
      onComposerFocusChange(false);
    }
  }, [isKeyboardOpen, manualState]);

  // Unknown conversation id (and not mkt) — nothing to render.
  if (!isMkt && !thread) {
    return (
      <div className="w-full h-full bg-fy27-surface flex items-center justify-center text-fy27-text-secondary text-[15px]">
        Conversation not found.
      </div>
    );
  }

  return (
    <div
      className={`app-safe-top w-full h-full flex flex-col relative overflow-hidden ${docked ? "bg-fy27-surface-subtlest" : "bg-fy27-surface"}`}
      style={{ fontFamily: "var(--font-sf-pro)" }}
    >
      {/* Recessed meeting dock — on the grey background layer (self-gates).
          Checkpoint uses the floating PiP instead. */}
      {!isMvpCheckpoint && <MeetingDock />}

      {/* White foreground card — DM header + thread. */}
      <div
        className={`flex-1 min-h-0 relative overflow-hidden flex flex-col bg-fy27-surface ${docked ? "rounded-tl-[20px] rounded-tr-[20px]" : ""}`}
      >
        <DMHeader
          name={headerName}
          avatar={<HeaderAvatar id={id} photo={headerPhoto} />}
          presence={headerPresence}
          onBack={() => navigate(-1)}
        />
        <ChatThread
          messages={messages}
          setMessages={setMessages}
          onSend={(text) => dispatchSend(text)}
          scrollRef={scrollRef}
          onComposerFocusChange={onComposerFocusChange}
          isKeyboardOpen={isKeyboardOpen}
          onKeyboardOpenChange={setIsKeyboardOpen}
        />
      </div>

      {/* Checkpoint — floating PiP window (self-gates) over the DM page. */}
      <MeetingPiP />
    </div>
  );
}
