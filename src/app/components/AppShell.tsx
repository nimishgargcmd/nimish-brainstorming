import React from "react";
import { Outlet } from "react-router";
import { MeetingDock } from "@/app/components/MeetingDock";
import { MeetingPiP } from "@/app/components/MeetingPiP";
import { AppBottomNav } from "@/app/components/AppBottomNav";
import { DockUIProvider } from "@/app/components/DockUIContext";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { useVersion } from "@/app/versioning/VersionContext";
import { ProfileDrawerProvider } from "@/app/components/profile/ProfileDrawerContext";
import { AccountSheet } from "@/app/components/profile/AccountSheet";
import { VersionIndicator } from "@/app/components/profile/VersionIndicator";

/**
 * Teams app shell — the WhatsApp-style layering.
 *
 * When a meeting is backgrounded, the BACKGROUND is a grey layer (#e5e5e5) that
 * holds the recessed meeting dock at the top; the Teams pages live in a WHITE
 * FOREGROUND card (rounded top) that sits on top and is pushed down below the
 * dock — so the meeting peeks out behind/above the foreground. With no meeting,
 * the foreground simply fills the screen (plain white app).
 *
 * The dock lives here once (shared across tabs); meeting state stays in
 * ActiveMeetingProvider above this, so persistence is unaffected.
 */
export function AppShell() {
  const meeting = useActiveMeeting();
  const { activeVersionId } = useVersion();
  // Checkpoint replaces the recessed dock + push-down layering with a floating
  // repositionable PiP window, so the page fills the screen normally.
  const isMvpCheckpoint = activeVersionId === "mvp-checkpoint";
  const docked = meeting.isActive && meeting.isBackgrounded && !isMvpCheckpoint;

  return (
    <DockUIProvider>
      <ProfileDrawerProvider>
        <div
          className={`app-safe-top w-full h-full flex flex-col relative overflow-hidden ${docked ? "bg-fy27-surface-subtlest" : "bg-fy27-surface"}`}
          style={{ fontFamily: "var(--font-sf-pro)" }}
        >
          {/* Recessed meeting dock — on the background layer (self-gates). Checkpoint
              uses the floating PiP instead. */}
          {!isMvpCheckpoint && <MeetingDock />}

          {/* Foreground card housing the active page (surface/primary) */}
          <div
            className={`flex-1 min-h-0 relative overflow-hidden bg-fy27-surface ${docked ? "rounded-tl-[20px] rounded-tr-[20px]" : ""}`}
          >
            <Outlet />
          </div>

          {/* Shared bottom navigation (floats over the foreground) */}
          <AppBottomNav />

          {/* Checkpoint — floating PiP window (self-gates) over the L0/L1 pages. */}
          <MeetingPiP />

          {/* Versioning: "viewing vX" indicator + the Account sheet */}
          <VersionIndicator />
          <AccountSheet />
        </div>
      </ProfileDrawerProvider>
    </DockUIProvider>
  );
}
