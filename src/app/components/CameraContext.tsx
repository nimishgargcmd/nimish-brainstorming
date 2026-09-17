import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

/**
 * Shared camera stream context.
 *
 * Problems this solves:
 * 1. Multiple components each calling getUserMedia → browser may deny or
 *    return different streams; toggling video kills one but not the other.
 * 2. track.stop() on unmount permanently destroys the camera track; it
 *    cannot be re-enabled, only re-acquired via a fresh getUserMedia call.
 * 3. Conditional rendering of <video> means srcObject must be re-attached
 *    every time the element mounts — a single useEffect([], []) misses this.
 *
 * Design:
 * - One MediaStream lives in context, shared by all consumers.
 * - `acquireCamera()` is idempotent: if a healthy stream exists, it's a no-op.
 * - `releaseCamera()` stops all tracks (called only on meeting end).
 * - Video on/off toggles track.enabled (cheap, instant, no permission prompt).
 * - A ref-callback helper (`attachVideo`) sets srcObject on any <video> element.
 * - If a track unexpectedly ends (browser revokes permission), the stream is
 *   cleared so the next `acquireCamera()` call re-prompts.
 */

interface CameraContextType {
  /** The shared MediaStream (null if not acquired or denied). */
  stream: MediaStream | null;
  /** Whether the camera was denied or errored. */
  cameraError: boolean;
  /** 'idle' | 'requesting' | 'active' | 'denied' */
  cameraStatus: "idle" | "requesting" | "active" | "denied";
  /** Acquire the camera (idempotent — no-op if already active). */
  acquireCamera: () => Promise<void>;
  /** Release the camera (stops all tracks). Call on meeting end. */
  releaseCamera: () => void;
  /** Enable or disable the video track without stopping it. */
  setTrackEnabled: (enabled: boolean) => void;
  /**
   * Ref-callback that attaches the shared stream to a <video> element.
   * Use as: <video ref={attachVideo} ... />
   * Automatically sets srcObject whenever the element mounts.
   */
  attachVideo: (el: HTMLVideoElement | null) => void;
  /** Current camera facing: 'user' (front) | 'environment' (back). */
  facingMode: "user" | "environment";
  /** Flip between front and back camera (stops + re-acquires the stream). */
  flipCamera: () => Promise<void>;
}

const CameraContext = createContext<CameraContextType | null>(null);

export function useCamera() {
  const ctx = useContext(CameraContext);
  if (!ctx) throw new Error("useCamera must be used within CameraProvider");
  return ctx;
}

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "requesting" | "active" | "denied"
  >("idle");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const facingModeRef = useRef<"user" | "environment">("user");

  // Keep the stream in a ref so callbacks always see the latest value
  // without re-creating themselves (avoids stale closures).
  const streamRef = useRef<MediaStream | null>(null);

  // Track all mounted <video> elements so we can re-attach srcObject
  // if the stream is re-acquired after a release.
  const videoElementsRef = useRef<Set<HTMLVideoElement>>(new Set());

  // Multiple components (PreJoinPage, SelfVideoTile, MeetingPage, …) each call
  // acquireCamera() on mount. Without coalescing, each fires its own concurrent
  // getUserMedia() request; on some webcam drivers a second simultaneous open
  // of the same device fails, and that straggler's catch block can clobber a
  // sibling call's successful stream (cameraError=true wins even though a live
  // stream exists). This ref makes concurrent callers share one real request.
  const inFlightAcquireRef = useRef<Promise<void> | null>(null);

  // Helper: push the stream into all registered video elements.
  const pushStreamToElements = useCallback((s: MediaStream | null) => {
    videoElementsRef.current.forEach((el) => {
      if (el.srcObject !== s) {
        el.srcObject = s;
      }
    });
  }, []);

  const acquireCamera = useCallback(async () => {
    // Already have a healthy stream — nothing to do.
    if (streamRef.current) {
      const tracks = streamRef.current.getVideoTracks();
      if (tracks.length > 0 && tracks[0].readyState === "live") {
        // Re-push to any newly mounted video elements.
        pushStreamToElements(streamRef.current);
        return;
      }
      // Tracks ended (browser revoked); clear and re-acquire.
      streamRef.current = null;
    }

    // A request is already in flight (from another concurrently-mounting
    // consumer) — await that one instead of starting a second getUserMedia().
    if (inFlightAcquireRef.current) {
      return inFlightAcquireRef.current;
    }

    setCameraStatus("requesting");
    const request = (async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facingModeRef.current,
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraStatus("active");
        setCameraError(false);

        // Push to all currently-mounted video elements.
        pushStreamToElements(mediaStream);

        // Listen for unexpected track end (e.g. browser revokes permission).
        mediaStream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            if (streamRef.current === mediaStream) {
              streamRef.current = null;
              setStream(null);
              setCameraStatus("idle");
            }
          });
        });
      } catch {
        setCameraError(true);
        setCameraStatus("denied");
      } finally {
        inFlightAcquireRef.current = null;
      }
    })();
    inFlightAcquireRef.current = request;
    return request;
  }, [pushStreamToElements]);

  const flipCamera = useCallback(async () => {
    const next = facingModeRef.current === "user" ? "environment" : "user";
    facingModeRef.current = next;
    setFacingMode(next);
    // Stop current tracks so acquireCamera re-requests with the new facing mode.
    // (facingMode is treated as "ideal", so single-camera devices just flip the
    // mirror rather than erroring.)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
    }
    await acquireCamera();
  }, [acquireCamera]);

  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    setCameraStatus("idle");
    setCameraError(false);
    pushStreamToElements(null);
  }, [pushStreamToElements]);

  const setTrackEnabled = useCallback((enabled: boolean) => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }, []);

  /**
   * Ref-callback for <video> elements. Registers the element so it
   * receives srcObject now and on any future stream change.
   */
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      if (el) {
        videoElementsRef.current.add(el);
        // Immediately attach the current stream.
        if (streamRef.current && el.srcObject !== streamRef.current) {
          el.srcObject = streamRef.current;
        }
      } else {
        // Element unmounted — remove from registry.
        // Do NOT stop the stream.
        videoElementsRef.current.forEach((registered) => {
          if (!document.body.contains(registered)) {
            videoElementsRef.current.delete(registered);
          }
        });
      }
    },
    [] // stable — never changes
  );

  // When stream state changes, push to all video elements.
  useEffect(() => {
    pushStreamToElements(stream);
  }, [stream, pushStreamToElements]);

  return (
    <CameraContext.Provider
      value={{
        stream,
        cameraError,
        cameraStatus,
        acquireCamera,
        releaseCamera,
        setTrackEnabled,
        attachVideo,
        facingMode,
        flipCamera,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}
