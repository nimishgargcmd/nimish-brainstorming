import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import svgPaths from "@/imports/svg-0tmtsigajy";
import { MicOnIcon } from "@/app/components/MicOnIcon";
import { MicOffIcon } from "@/app/components/MicOffIcon";
import { VideoOnIcon } from "@/app/components/VideoOnIcon";
import { VideoOffIcon } from "@/app/components/VideoOffIcon";
import { useCamera } from "@/app/components/CameraContext";
import { useActiveMeeting } from "@/app/components/ActiveMeetingContext";
import { BottomSheet } from "@/app/components/BottomSheet";
import { AudioModeGlyph } from "@/app/components/AudioModeIcon";
import { BluetoothIcon, PhoneIcon, SpeakerIcon } from "@/app/components/AudioRouteIcons";
import { BackgroundEffectsIcon } from "@/app/components/moreMenuIcons";
import { IconCheck, IconChevronRight, IconDismiss } from "@/app/components/profile/fluentIcons";
import { useVersion } from "@/app/versioning/VersionContext";
import { isMvpFamily } from "@/app/versioning/versions";
import { useFaceFraming } from "@/app/components/useFaceFraming";
import { useLightingQualityAnalysis } from "@/app/components/useLightingQualityAnalysis";

// Pre-join self-view backup image
import imgSelf from "@/assets/figma/account/udayan.jpg";
import imgMsLogo from "figma:asset/ms-logo.png";

/* ─── Audio Device Data (same as On-the-go mode) ─── */

interface AudioDevice {
  id: string;
  name: string;
  icon: "phone" | "speaker" | "bluetooth";
  connected?: boolean;
}

const audioDevices: AudioDevice[] = [
  { id: "phone", name: "iPhone", icon: "phone" },
  { id: "speaker", name: "Speaker", icon: "speaker" },
  { id: "bluetooth", name: "AirPods Pro", icon: "bluetooth", connected: true },
];

/** Fluent Video Switch (flip camera) — 16-grid, currentColor. Same glyph as SelfTile. */
function VideoSwitch() {
  return (
    <svg width={20} height={20} viewBox="0 0 16 16" fill="currentColor" style={{ display: "block" }}>
      <path d="M2 2.5C2 1.11929 3.11929 0 4.5 0H9.5C10.8807 0 12 1.11929 12 2.5V3.11308L13.8911 2.08241C14.3909 1.81003 15 2.17178 15 2.74096V7.25907C15 7.82825 14.3909 8.19 13.8911 7.91762L12 6.88695V7.5C12 8.88071 10.8807 10 9.5 10H4.5C3.11929 10 2 8.88071 2 7.5V2.5ZM12 5.74808L14 6.8381V3.16193L12 4.25195V5.74808ZM4.5 1C3.67157 1 3 1.67157 3 2.5V7.5C3 8.32843 3.67157 9 4.5 9H9.5C10.3284 9 11 8.32843 11 7.5V2.5C11 1.67157 10.3284 1 9.5 1H4.5ZM1.66913 9.88882C1.34616 10.0121 1.06056 10.1486 0.822726 10.2986C0.407633 10.5603 0 10.9537 0 11.5C0 12.0463 0.407633 12.4397 0.822726 12.7014C1.26283 12.9789 1.86646 13.2103 2.56787 13.3973C3.97801 13.7734 5.89836 14 8 14C8.09854 14 8.19667 13.9995 8.29438 13.9985L7.14645 15.1464C6.95118 15.3417 6.95118 15.6583 7.14645 15.8536C7.34171 16.0488 7.65829 16.0488 7.85355 15.8536L9.85355 13.8536C10.0488 13.6583 10.0488 13.3417 9.85355 13.1464L7.85355 11.1464C7.65829 10.9512 7.34171 10.9512 7.14645 11.1464C6.95118 11.3417 6.95118 11.6583 7.14645 11.8536L8.29139 12.9985C8.19476 12.9995 8.09762 13 8 13C5.95951 13 4.12986 12.7789 2.82553 12.4311C2.16971 12.2562 1.67499 12.0566 1.35605 11.8555C1.0121 11.6387 1 11.506 1 11.5C1 11.494 1.0121 11.3613 1.35605 11.1445C1.63272 10.97 2.04166 10.7967 2.57329 10.6397C2.22446 10.4508 1.9173 10.1947 1.66913 9.88882ZM11.9238 10.3021C12.2165 10.0572 12.4618 9.75753 12.6439 9.41883C12.9212 9.47523 13.1845 9.53664 13.4321 9.60267C14.1335 9.78971 14.7372 10.0211 15.1773 10.2986C15.5924 10.5603 16 10.9537 16 11.5C16 12.0463 15.5924 12.4397 15.1773 12.7014C14.7372 12.9789 14.1335 13.2103 13.4321 13.3973C13.1661 13.4683 12.882 13.5339 12.5819 13.5937C12.278 13.6542 12 13.4175 12 13.1076C12 12.8633 12.176 12.6553 12.4155 12.6071C12.6845 12.553 12.9381 12.4941 13.1745 12.4311C13.8303 12.2562 14.325 12.0566 14.644 11.8555C14.9879 11.6387 15 11.506 15 11.5C15 11.494 14.9879 11.3613 14.644 11.1445C14.325 10.9434 13.8303 10.7438 13.1745 10.5689C12.7987 10.4687 12.3793 10.379 11.9238 10.3021Z" />
    </svg>
  );
}

function AudioDeviceIcon({ icon }: { icon: AudioDevice["icon"] }) {
  switch (icon) {
    case "phone": return <PhoneIcon />;
    case "speaker": return <SpeakerIcon />;
    case "bluetooth": return <BluetoothIcon />;
  }
}

/* ─── Animated Dots for Connecting State ─── */

function AnimatedDots() {
  const [dotCount, setDotCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  // Render "Connecting" with animated trailing dots
  const dots = ".".repeat(dotCount);
  const hiddenDots = ".".repeat(3 - dotCount);

  return (
    <span>
      Connecting{dots}
      <span className="opacity-0">{hiddenDots}</span>
    </span>
  );
}

/* ─── PreJoinPage Component ─── */

export function PreJoinPage() {
  const navigate = useNavigate();
  const meeting = useActiveMeeting();
  // Final Vision keeps the original round-pill Join button (Figma Make baseline
  // `ButtonsOnPreJoin` → rounded-[50px]); FY27 MVP uses the Teams 2 iOS Accent
  // button (rounded-[8px], Figma 1143:60669).
  const { activeVersionId } = useVersion();
  const isFy27Mvp = isMvpFamily(activeVersionId);
  const isMvpCheckpoint = activeVersionId === "mvp-checkpoint";

  // A/V control state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [preJoinVoiceNoiseMode, setPreJoinVoiceNoiseMode] = useState<"off" | "noise-suppression" | "voice-isolation">(meeting.voiceNoiseMode);
  const [isMicSettingsSheetOpen, setIsMicSettingsSheetOpen] = useState(false);
  const [isVoiceIsolationConsentOpen, setIsVoiceIsolationConsentOpen] = useState(false);
  const [hasVoiceIsolationConsent, setHasVoiceIsolationConsent] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("voiceIsolationConsentAccepted") === "true";
    } catch {
      return false;
    }
  });
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<string>("phone");
  const audioPickerRef = useRef<HTMLDivElement>(null);
  const audioPopupRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const speakerBtnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ bottom: number; right: number } | null>(null);

  // Video auto-enhance demo (brainstorming/video bucket 1): lighting, quality, and framing
  // are all detected live off the camera feed and corrected automatically — no toggles.
  const [autoEnhanceOn, setAutoEnhanceOn] = useState(true);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Shared camera context — single stream for the whole app
  const { stream: cameraStream, cameraError, acquireCamera, setTrackEnabled, attachVideo, flipCamera } = useCamera();

  // Real-time detection drives all three corrections (only meaningful once a live stream exists).
  const hasLiveStream = isVideoOn && !!cameraStream && !cameraError;
  const faceFraming = useFaceFraming(videoEl, hasLiveStream && autoEnhanceOn);
  const lightingQuality = useLightingQualityAnalysis(videoEl, hasLiveStream && autoEnhanceOn);

  // <video ref> needs to both receive the shared camera stream (attachVideo) and be readable
  // here for face detection — combine both into one ref callback.
  const attachVideoAndTrack = useCallback(
    (el: HTMLVideoElement | null) => {
      attachVideo(el);
      setVideoEl(el);
    },
    [attachVideo]
  );

  // Acquire camera on mount, and retry whenever the user turns video back on — acquireCamera()
  // is idempotent (no-op once a healthy stream exists), so this just covers the case where the
  // initial mount-time request never got a permission prompt or was denied/dismissed.
  useEffect(() => {
    if (isVideoOn) {
      acquireCamera();
    }
  }, [isVideoOn, acquireCamera]);

  // Sync track.enabled with local isVideoOn
  useEffect(() => {
    setTrackEnabled(isVideoOn);
  }, [isVideoOn, setTrackEnabled]);

  // Play a short mute/unmute tone (same as MeetingPage)
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

  // Close audio picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const isInsideButton = audioPickerRef.current?.contains(target);
      const isInsidePopup = audioPopupRef.current?.contains(target);
      if (!isInsideButton && !isInsidePopup) {
        setShowAudioPicker(false);
      }
    }
    if (showAudioPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAudioPicker]);

  const handleAudioSelect = (deviceId: string) => {
    setSelectedAudio(deviceId);
    setShowAudioPicker(false);
  };

  const handleJoinNow = () => {
    if (isConnecting) return;
    setIsConnecting(true);
    // Save A/V state to context so MeetingPage can pick it up
    meeting.setMicOn(isMicOn);
    meeting.setVideoOn(isVideoOn);
    if (isMvpCheckpoint) {
      meeting.setVoiceNoiseMode(preJoinVoiceNoiseMode);
    }
    setTimeout(() => {
      navigate("/meeting", { replace: true });
    }, 2000);
  };

  const handleSelectPreJoinVoiceNoiseMode = (mode: "off" | "noise-suppression" | "voice-isolation") => {
    if (mode === "voice-isolation" && !hasVoiceIsolationConsent) {
      setIsMicSettingsSheetOpen(false);
      setIsVoiceIsolationConsentOpen(true);
      return;
    }
    setPreJoinVoiceNoiseMode(mode);
    setIsMicSettingsSheetOpen(false);
  };

  const handleAcceptVoiceIsolationConsent = () => {
    setHasVoiceIsolationConsent(true);
    try {
      window.localStorage.setItem("voiceIsolationConsentAccepted", "true");
    } catch {
      // Ignore storage failures in prototype mode.
    }
    setPreJoinVoiceNoiseMode("voice-isolation");
    setIsVoiceIsolationConsentOpen(false);
  };

  const handleDenyVoiceIsolationConsent = () => {
    // Keep existing mode unchanged (off or noise suppression).
    setIsVoiceIsolationConsentOpen(false);
  };

  const handleBack = () => {
    navigate("/calendar", { replace: true });
  };

  /* ── Shared sub-elements (rendered once, positioned differently per state) ── */
  // The self-tile background is now always photographic (live video, or the fallback photo
  // whether video is off or the camera errored) — so tile content always uses the fixed-white
  // "global" tokens for contrast over the dark scrim, regardless of video on/off.
  const tileIconColor = "var(--fy27-icon-global)";
  const tileTextClass = "text-fy27-text-global";

  // Auto-enhance demo: build the corrective filter for the self feed. Lighting/quality/framing
  // are all real-time detections (see hooks above) — nothing here is a canned simulation.
  const lightingQualityCorrecting = lightingQuality.isCorrecting;
  const isAutoEnhancing = lightingQualityCorrecting || faceFraming.isCorrecting;

  // One-shot "AI made a change" sweep animation across the tile, replayed each time lighting
  // or quality correction newly kicks in (not on every continuous framing tick).
  const [sweepKey, setSweepKey] = useState(0);
  const prevLightingQualityCorrectingRef = useRef(false);
  useEffect(() => {
    if (lightingQualityCorrecting && !prevLightingQualityCorrectingRef.current) {
      setSweepKey((k) => k + 1);
    }
    prevLightingQualityCorrectingRef.current = lightingQualityCorrecting;
  }, [lightingQualityCorrecting]);

  // "AI enhanced" badge behaves like a toast: it flashes on for 1s each time a new
  // correction kicks in, then dismisses itself even if the correction is still active.
  const [isBadgeVisible, setIsBadgeVisible] = useState(false);
  const prevIsAutoEnhancingRef = useRef(false);
  const badgeHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isAutoEnhancing && !prevIsAutoEnhancingRef.current) {
      setIsBadgeVisible(true);
      if (badgeHideTimeoutRef.current) clearTimeout(badgeHideTimeoutRef.current);
      badgeHideTimeoutRef.current = setTimeout(() => setIsBadgeVisible(false), 1000);
    }
    prevIsAutoEnhancingRef.current = isAutoEnhancing;
  }, [isAutoEnhancing]);
  useEffect(() => {
    return () => {
      if (badgeHideTimeoutRef.current) clearTimeout(badgeHideTimeoutRef.current);
    };
  }, []);

  const videoFilterParts: string[] = [];
  if (lightingQuality.lightingFilter) {
    videoFilterParts.push(lightingQuality.lightingFilter);
  }
  if (lightingQuality.qualityFilter) {
    videoFilterParts.push(lightingQuality.qualityFilter);
  }
  const selfVideoFilter = videoFilterParts.length ? videoFilterParts.join(" ") : undefined;
  // Real auto-framing: while auto-enhance is on and a face is detected off-center/wrongly sized,
  // apply the computed corrective zoom + recenter; otherwise just mirror (show real framing as-is).
  const selfVideoTransform = autoEnhanceOn && faceFraming.correctiveTransform ? faceFraming.correctiveTransform : "scaleX(-1)";
  const selfVideoObjectFit: "cover" | "contain" = "cover";
  // Slow, gentle glide for auto-framing/enhance corrections — a fast snap reads as jumpy.
  const selfVideoStyle = { filter: selfVideoFilter, transform: selfVideoTransform, objectFit: selfVideoObjectFit, objectPosition: autoEnhanceOn ? faceFraming.correctiveObjectPosition : "50% 50%", transition: "filter 400ms ease, transform 2200ms cubic-bezier(0.22, 1, 0.36, 1), object-position 2200ms cubic-bezier(0.22, 1, 0.36, 1)" };

  const topBarContent = (
    <div className="flex items-start justify-between px-[16px] w-full">
      {/* Left: Background effects */}
      <div className="flex gap-[8px] items-center">
        <div className="size-[24px] inline-flex items-center justify-center shrink-0" style={{ color: tileIconColor }}>
          <BackgroundEffectsIcon size={20} />
        </div>
        <p className={`text-[12px] ${tileTextClass}`} style={{ fontWeight: 400, lineHeight: "16px" }}>
          Background effects
        </p>
      </div>
      {/* Right: Flip camera, then Auto-enhance toggle stacked below it (video auto-enhance demo) */}
      <div className="flex flex-col items-center gap-[10px]">
        <button
          type="button"
          onClick={() => { void flipCamera(); }}
          aria-label="Flip camera"
          className="size-[24px] flex items-center justify-center shrink-0 cursor-pointer active:opacity-50 transition-opacity duration-100"
          style={{ color: tileIconColor }}
        >
          <VideoSwitch />
        </button>
        {isVideoOn && (
          <button
            type="button"
            onClick={() => setAutoEnhanceOn(v => !v)}
            aria-label={autoEnhanceOn ? "Turn off auto-enhance" : "Turn on auto-enhance"}
            aria-pressed={autoEnhanceOn}
            className="size-[24px] rounded-full flex items-center justify-center shrink-0 cursor-pointer active:opacity-50 transition-colors duration-150"
            style={{ backgroundColor: autoEnhanceOn ? "var(--fy27-brand-primary)" : "rgba(255,255,255,0.16)" }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>✨</span>
          </button>
        )}
      </div>
    </div>
  );

  const controlsContent = (
    <div className="w-full flex items-start justify-between p-[12px] bg-gradient-to-t from-[rgba(0,0,0,0.73)] to-[rgba(0,0,0,0)]">
      {/* Video toggle */}
      <button
        onClick={() => {
          // Re-request the camera directly inside the click handler (a real user gesture) —
          // more reliable than an effect alone for getting the permission prompt on mobile.
          if (!isVideoOn) void acquireCamera();
          setIsVideoOn(v => !v);
        }}
        className="flex flex-[1_0_0] flex-col items-center justify-center overflow-clip relative cursor-pointer"
      >
        <div className="flex flex-col gap-[4px] items-center justify-center overflow-clip relative shrink-0">
          <div className="h-[28px] w-[28px] flex items-center justify-center shrink-0">
            <div className="h-[28px] w-[24px] relative shrink-0 flex items-center justify-center">
              {isVideoOn
                ? <VideoOnIcon width={20} height={14} color={tileIconColor} />
                : <VideoOffIcon width={24} height={28} color={tileIconColor} />
              }
            </div>
          </div>
          <p className={`text-[12px] text-center ${tileTextClass}`} style={{ fontWeight: 400, lineHeight: "16px" }}>
            {isVideoOn ? "Video is on" : "Video is off"}
          </p>
        </div>
      </button>

      {/* Mic toggle + desktop-like settings chevron on the right */}
      <div className="flex flex-[1_0_0] flex-col items-center justify-center overflow-clip relative">
        <div className="flex items-center justify-center gap-[8px]">
          <button
            onClick={() => {
              playMuteSound();
              setIsMicOn(m => !m);
            }}
            className="h-[28px] w-[28px] flex items-center justify-center shrink-0 relative cursor-pointer"
            aria-label={isMicOn ? "Mute" : "Unmute"}
          >
            {isMicOn ? (
              <MicOnIcon size={21.6} color={tileIconColor} />
            ) : (
              <MicOffIcon size={24} color={tileIconColor} />
            )}
            {isMvpCheckpoint && preJoinVoiceNoiseMode !== "off" && (
              <span
                aria-hidden="true"
                className="absolute right-[-2px] bottom-[-2px] inline-flex items-center justify-center text-current pointer-events-none"
                style={{ color: tileIconColor }}
                title={preJoinVoiceNoiseMode === "noise-suppression" ? "Noise suppression on" : "Voice isolation on"}
              >
                <AudioModeGlyph mode={preJoinVoiceNoiseMode} size={10} />
              </span>
            )}
          </button>

          {isMvpCheckpoint && (
            <button
              type="button"
              title="Open microphone settings"
              aria-label="Open microphone settings"
              onClick={() => setIsMicSettingsSheetOpen(true)}
              className="h-[24px] w-[24px] inline-flex items-center justify-center rounded-[8px] border border-transparent bg-transparent text-white opacity-85 active:opacity-65"
            >
              <IconChevronRight size={10} className="rotate-90" />
            </button>
          )}
        </div>

        <p className={`mt-[4px] text-[12px] text-center ${tileTextClass}`} style={{ fontWeight: 400, lineHeight: "16px" }}>
          {isMicOn ? "Mic is on" : "Mic is off"}
        </p>
      </div>

      {/* Speaker / Audio device picker */}
      <div className="flex flex-[1_0_0] flex-col items-center justify-center overflow-clip relative" ref={audioPickerRef}>
        <button
          ref={speakerBtnRef}
          onClick={() => {
            // Compute position before opening
            if (!showAudioPicker && speakerBtnRef.current && pageRef.current) {
              const btnRect = speakerBtnRef.current.getBoundingClientRect();
              const pageRect = pageRef.current.getBoundingClientRect();
              const btnCenterX = btnRect.left + btnRect.width / 2 - pageRect.left;
              const bottomFromPage = pageRect.height - (btnRect.top - pageRect.top) + 8;
              // Right edge of menu should align near the right edge of the button
              const rightFromPage = pageRect.width - btnCenterX - 125; // 125 = half of 250px menu
              setMenuPos({ bottom: bottomFromPage, right: Math.max(rightFromPage, 8) });
            }
            setShowAudioPicker(prev => !prev);
          }}
          className="flex flex-col gap-[4px] items-center justify-center relative shrink-0 cursor-pointer active:opacity-50 transition-opacity duration-100"
        >
          <div className="h-[28px] w-[28px] flex items-center justify-center shrink-0">
            <div className="size-[24px] overflow-clip relative shrink-0" style={{ color: tileIconColor }}>
              <SpeakerIcon size={20} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>
          <p className={`text-[12px] text-center ${tileTextClass}`} style={{ fontWeight: 400, lineHeight: "16px" }}>
            {audioDevices.find(d => d.id === selectedAudio)?.name || "Speaker"}
          </p>
        </button>
      </div>
    </div>
  );

  return (
    <div
      ref={pageRef}
      className="app-safe-top w-full h-full bg-fy27-surface flex flex-col relative overflow-hidden"
      style={{ fontFamily: "var(--font-sf-pro)" }}
    >
      {/* ─── Main Content ─── */}
      <div className="flex-1 min-h-0 flex flex-col gap-[16px]">
        {/* Top Bar: X button + Meeting Title */}
        <div className="flex gap-[20px] items-center justify-center shrink-0 w-full mx-[0px] mt-[10px] mb-[0px]">
          {/* X / Dismiss button */}
          <div className="shrink-0">
            <button
              onClick={handleBack}
              aria-label="Close pre-join"
              className="size-[48px] flex items-center justify-center"
            >
              <IconDismiss size={20} className="text-fy27-icon-primary" />
            </button>
          </div>
          {/* Title */}
          <div className="flex-1 min-w-0">
            <p className="text-[17px] tracking-[-0.41px] text-fy27-text-primary" style={{ fontWeight: 600, lineHeight: "22px" }}>
              Marketing Team Sync
            </p>
          </div>
        </div>

        {/* MS Logo (32x32) */}
        <div className="flex items-center justify-center shrink-0 w-full">
          <img src={imgMsLogo} alt="Microsoft" className="w-8 h-8" />
        </div>

        {/* Subtitle */}
        <div className="flex items-center justify-center shrink-0 w-full">
          <p className="text-[12px] text-fy27-text-primary" style={{ fontWeight: 400, lineHeight: "16px" }}>
            Choose your audio and video settings
          </p>
        </div>

        {/* ─── Self Tile Card ─── */}
        <div className="flex items-center px-[16px] shrink-0 w-full" style={{ flex: "1 0 0", minHeight: 0 }}>
          <div className="flex-1 self-stretch rounded-[12px] flex flex-col items-center relative overflow-clip px-[0px] pt-[12px] pb-[0px]">
            {/* Letterbox / fallback backdrop */}
            <div className="absolute inset-0 bg-black" />

            {/* Full-bleed feed: live video only when video is on AND a real stream is available;
                otherwise the same fallback photo covers video-off, camera error, and not-yet-acquired states. */}
            {isVideoOn && cameraStream && !cameraError ? (
              <video
                ref={attachVideoAndTrack}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={selfVideoStyle}
              />
            ) : (
              <img
                src={imgSelf}
                alt="You"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={isVideoOn ? selfVideoStyle : undefined}
              />
            )}

            {/* If the browser has already denied camera permission, retrying silently does nothing —
                surface that instead of leaving the fallback photo unexplained. */}
            {isVideoOn && cameraError && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-20 px-[12px] py-[6px] rounded-[8px] text-center"
                style={{ top: "52px", backgroundColor: "rgba(0,0,0,0.65)", maxWidth: "80%" }}
              >
                <span className="text-[11px] text-white" style={{ fontWeight: 500 }}>
                  Camera blocked — check this site's camera permission in your browser settings
                </span>
              </div>
            )}

            {/* One-shot "AI made a change" sweep — replays (remounts via key) each time a chip newly gets corrected */}
            {sweepKey > 0 && (
              <div
                key={sweepKey}
                aria-hidden
                className="animate-ai-sweep absolute inset-0 z-[15] pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(100deg, rgba(255,255,255,0) 35%, rgba(255,255,255,0.55) 48%, rgba(168,152,250,0.6) 50%, rgba(255,255,255,0.55) 52%, rgba(255,255,255,0) 65%)",
                  backgroundSize: "300% 100%",
                }}
              />
            )}

            {/* Auto-enhance badge — flashes for 1s like a toast, then dismisses itself */}
            {isVideoOn && isBadgeVisible && (
              <div
                className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-[4px] px-[10px] py-[4px] rounded-full"
                style={{ top: "52px", backgroundColor: "rgba(0,0,0,0.55)" }}
              >
                <span style={{ fontSize: 13, lineHeight: 1 }}>✨</span>
                <span className="text-[11px] text-white" style={{ fontWeight: 600 }}>
                  AI enhanced
                </span>
              </div>
            )}

            {faceFraming.diagnostic !== null && (
              <output
                aria-label="Framing diagnostics"
                className="absolute left-[12px] right-[48px] top-[90px] z-20 rounded-[4px] px-[8px] py-[6px] text-[11px] leading-[15px] whitespace-pre-wrap break-words pointer-events-none text-white bg-black/80"
              >
                {!autoEnhanceOn ? "Auto-enhance off\n" : !hasLiveStream ? "No active camera stream\n" : ""}
                {faceFraming.diagnostic}
              </output>
            )}

            {/* Top gradient overlay */}
            <div className="absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/50 to-transparent pt-[12px]">
              {topBarContent}
            </div>

            {/* Bottom gradient overlay */}
            <div className="absolute bottom-0 left-0 w-full z-10">
              {controlsContent}
            </div>
          </div>
        </div>

        {/* Audio Device Picker — iOS Context Menu style (HIG: label left, icon right, checkmark leading) */}
        {showAudioPicker && (
          <>
            {/* Scrim — tapping outside dismisses */}
            <div
              className="absolute inset-0 z-40"
              style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
              onClick={() => setShowAudioPicker(false)}
            />
            {/* Context menu surface */}
            <div
              className="absolute z-50 w-[250px]"
              style={{
                bottom: menuPos ? `${menuPos.bottom}px` : "210px",
                right: menuPos ? `${menuPos.right}px` : undefined,
                left: menuPos ? undefined : "50%",
                transform: menuPos ? undefined : "translateX(-50%)",
              }}
              ref={audioPopupRef}
            >
              <div
                className="rounded-[14px] overflow-hidden"
                style={{
                  backgroundColor: "rgba(44,44,46,0.55)",
                  backdropFilter: "saturate(190%) blur(40px)",
                  WebkitBackdropFilter: "saturate(190%) blur(40px)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.45), 0 0 0 0.33px rgba(255,255,255,0.1)",
                }}
              >
                {/* Section header — balanced vertical padding */}
                <div className="px-[16px] py-[11px]">
                  <p
                    className="text-[#98989f] text-[13px]"
                    style={{
                      fontFamily: "var(--font-sf-pro)",
                      fontWeight: 400,
                      lineHeight: "16px",
                      letterSpacing: "-0.08px",
                    }}
                  >
                    Audio Output
                  </p>
                </div>

                {/* Menu items */}
                {audioDevices.map((device, index) => {
                  const isSelected = selectedAudio === device.id;
                  return (
                    <div key={device.id}>
                      {/* Full-width hairline separator */}
                      <div className="h-px bg-[rgba(84,84,88,0.36)]" />

                      <button
                        onClick={() => handleAudioSelect(device.id)}
                        className="w-full flex items-center gap-[10px] pl-[16px] pr-[14px] py-[11px] active:bg-[rgba(255,255,255,0.12)]"
                      >
                        {/* Leading checkmark — occupies space even when unchecked for alignment */}
                        <div className="shrink-0 w-[16px] flex items-center justify-center">
                          {isSelected && (
                            <span className="text-white"><IconCheck size={13} /></span>
                          )}
                        </div>

                        {/* Label + subtitle */}
                        <div className="flex-1 flex flex-col items-start min-w-0">
                          <span
                            className="text-white text-[17px] truncate w-full text-left"
                            style={{
                              fontFamily: "var(--font-sf-pro)",
                              fontWeight: 400,
                              lineHeight: "22px",
                              letterSpacing: "-0.41px",
                            }}
                          >
                            {device.name}
                          </span>
                          {device.connected && (
                            <div className="flex items-center gap-[4px] mt-[1px]">
                              <div className="w-[6px] h-[6px] rounded-full bg-[#30D158]" />
                              <span
                                className="text-[#98989f] text-[12px]"
                                style={{
                                  fontFamily: "var(--font-sf-pro)",
                                  fontWeight: 400,
                                  lineHeight: "16px",
                                  letterSpacing: "-0.08px",
                                }}
                              >
                                Connected
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Trailing device icon */}
                        <div className="shrink-0 w-[24px] flex items-center justify-center opacity-60 text-white">
                          <AudioDeviceIcon icon={device.icon} />
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {isMvpCheckpoint && (
        <BottomSheet
          open={isMicSettingsSheetOpen}
          onClose={() => setIsMicSettingsSheetOpen(false)}
          ariaLabel="Microphone settings"
          surfaceClassName="bg-fy27-surface-tertiary"
          className="px-0 pb-[max(14px,env(safe-area-inset-bottom))]"
        >
          <div className="py-[4px]">
            <div className="px-[20px] pt-[4px] pb-[8px]">
              <p className="text-fy27-text-primary text-[17px] tracking-[-0.41px]" style={{ fontWeight: 600, lineHeight: "22px" }}>
                Microphone settings
              </p>
            </div>
            {([
              { id: "off", label: "Off", description: "No audio filtering." },
              { id: "noise-suppression", label: "Noise suppression", description: "Reduces Background Noise" },
              { id: "voice-isolation", label: "Voice isolation", description: "Keeps only your voice audible" },
            ] as const).map((option) => {
              const isSelected = preJoinVoiceNoiseMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectPreJoinVoiceNoiseMode(option.id)}
                  className="w-full px-[20px] py-[12px] flex items-start gap-[16px] text-left text-fy27-text-primary active:opacity-70"
                >
                  <span
                    className={`mt-[2px] inline-flex items-center justify-center h-[22px] w-[22px] rounded-full ${
                      option.id === "noise-suppression"
                        ? "text-fy27-brand"
                        : option.id === "voice-isolation"
                          ? "text-[#6f56ff]"
                          : "text-fy27-icon-secondary"
                    }`}
                    aria-hidden="true"
                  >
                    <AudioModeGlyph mode={option.id} size={14} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-fy27-text-primary" style={{ fontSize: "17px", letterSpacing: "-0.41px", lineHeight: "22px" }}>
                      {option.label}
                    </span>
                    <span className="block text-fy27-text-secondary mt-[1px]" style={{ fontSize: "13px", lineHeight: "18px" }}>
                      {option.description}
                    </span>
                  </span>
                  <span className="mt-[2px] w-[20px] shrink-0 text-fy27-icon-secondary">
                    {isSelected ? (
                      <span className="inline-flex size-[20px] items-center justify-center"><IconCheck size={13} /></span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </BottomSheet>
        )}

        {isMvpCheckpoint && isVoiceIsolationConsentOpen && (
          <div className="absolute inset-0 z-[95] flex items-center justify-center px-[20px]" style={{ fontFamily: "var(--font-sf-pro)" }}>
            <button
              aria-label="Close voice isolation consent"
              className="absolute inset-0 bg-black/45"
              onClick={handleDenyVoiceIsolationConsent}
            />
            <div className="relative w-full max-w-[360px] rounded-[18px] bg-fy27-surface-raised border border-fy27-divider shadow-[0px_16px_48px_rgba(0,0,0,0.36)] p-[16px]">
              <div className="text-fy27-text-primary text-[20px] leading-[26px] tracking-[-0.41px] font-semibold">
                Turn on Voice isolation?
              </div>
              <div className="mt-[8px] text-fy27-text-secondary text-[14px] leading-[20px]">
                To enable precise Voice isolation, we create a voice signature from your audio. What you say is not recorded, only your voice signature is used.
                <span>{" "}</span>
                <a
                  href="https://privacy.microsoft.com/privacystatement"
                  target="_blank"
                  rel="noreferrer"
                  className="text-fy27-brand underline"
                >
                  Click here to learn more.
                </a>
              </div>
              <div className="mt-[16px] flex justify-end gap-[8px]">
                <button
                  className="h-[36px] px-[14px] rounded-[10px] border border-fy27-divider text-fy27-text-primary bg-fy27-surface active:opacity-70"
                  onClick={handleDenyVoiceIsolationConsent}
                >
                  Not now
                </button>
                <button
                  className="h-[36px] px-[14px] rounded-[10px] bg-fy27-brand text-white active:opacity-70"
                  onClick={handleAcceptVoiceIsolationConsent}
                >
                  Turn on
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signed in text */}
        <div className="flex items-center justify-center px-[16px] w-full">
          <p className="text-[13px] text-fy27-text-primary text-center tracking-[-0.08px]" style={{ fontWeight: 400, lineHeight: "18px" }}>
            Signed in as uvidyanta@microsoft.com
          </p>
        </div>

        {/* ─── Buttons ─── */}
        <div className="shrink-0 w-full">
          <div className="flex flex-col gap-[12px] items-center px-[16px] w-full mx-[0px] mt-[0px]" style={{ marginBottom: "var(--app-footer-inset)" }}>
            {/* Join now — MVP: Accent rounded-8 (Figma 1143:60669); Final Vision: original round pill (rounded-[50px], Figma Make `ButtonsOnPreJoin`) */}
            <button
              onClick={handleJoinNow}
              className={`${isConnecting ? 'bg-[#1f157e]' : 'bg-fy27-brand'} flex items-center justify-center gap-[8px] h-[52px] px-[16px] ${isFy27Mvp ? "rounded-[8px]" : "rounded-[50px]"} shrink-0 w-full cursor-pointer transition-colors duration-150`}
            >
              <p className={`text-[15px] text-center tracking-[-0.24px] whitespace-nowrap ${isConnecting ? "text-fy27-text-global" : "text-fy27-text-on-accent"}`} style={{ fontWeight: 500, lineHeight: "20px" }}>
                {isConnecting ? <AnimatedDots /> : "Join now"}
              </p>
            </button>

            {/* Bottom two buttons: hidden while connecting but keep their layout
                space (visibility only — no displacement). Both versions. */}
            {/* More join options — MVP: Outline rounded-8 (Figma 1143:60671); Final Vision: round pill (rounded-[50px]) */}
            <button
              aria-hidden={isConnecting}
              tabIndex={isConnecting ? -1 : undefined}
              className={`flex items-center justify-center gap-[8px] h-[52px] px-[16px] ${isFy27Mvp ? "rounded-[8px]" : "rounded-[50px]"} border border-fy27-brand shrink-0 w-full cursor-pointer active:opacity-60 transition-opacity duration-100 ${isConnecting ? "invisible" : ""}`}
            >
              <p className="text-fy27-text-interactive text-[15px] text-center tracking-[-0.24px] whitespace-nowrap" style={{ fontWeight: 500, lineHeight: "20px" }}>
                More join options
              </p>
            </button>

            {/* Privacy and cookies — Subtle (Figma 1143:60673): text-only, Button 2 type */}
            <button
              aria-hidden={isConnecting}
              tabIndex={isConnecting ? -1 : undefined}
              className={`flex items-center justify-center gap-[4px] h-[28px] px-[8px] rounded-[4px] shrink-0 cursor-pointer active:opacity-60 transition-opacity duration-100 ${isConnecting ? "invisible" : ""}`}
            >
              <p className="text-fy27-text-interactive text-[13px] text-center tracking-[-0.08px] whitespace-nowrap" style={{ fontWeight: 500, lineHeight: "18px" }}>
                Privacy and cookies
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}