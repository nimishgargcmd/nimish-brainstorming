import { useEffect, useRef, useState } from "react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";

/**
 * Real-time auto-framing: runs BlazeFace face detection on a live <video> element
 * and computes the CSS transform (scale + translate, mirrored) needed to recenter
 * and properly size the detected face — the actual "poor framing -> AI corrects it"
 * feature, driven by wherever the user really holds the camera (no manual toggle).
 */

// Desired on-screen position/size of the face once corrected.
const TARGET_CENTER_X = 0.5; // horizontal center
const TARGET_CENTER_Y = 0.42; // slightly above vertical center (eye-line framing)
const TARGET_FACE_HEIGHT = 0.32; // face height as a fraction of the tile height
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.8;
const DETECT_INTERVAL_MS = 250;
// Below this, treat the correction as negligible (already well-framed) — avoids
// jittery micro-adjustments and keeps the "AI enhanced" badge from flickering.
const MEANINGFUL_SCALE_DELTA = 0.06;
const MEANINGFUL_OFFSET_PERCENT = 4;

// Stability controls: once a correction is applied, small subsequent movements are
// ignored (dead-zone) so the frame doesn't keep nudging on every twitch. A distinct,
// larger change has to persist for COMMIT_DEBOUNCE_MS before it's actually applied,
// so a brief lean-over doesn't trigger an instant reframe. If the face disappears
// only briefly (glance away, momentary miss), the last framing is kept as-is rather
// than snapping back to raw.
const DEADZONE_SCALE_DELTA = 0.08;
const DEADZONE_OFFSET_FRACTION = 0.03; // 3% of tile size
const COMMIT_DEBOUNCE_MS = 1300;
const MISS_GRACE_TICKS = 8; // ~2s at DETECT_INTERVAL_MS before clearing on lost detection

interface CorrectionCandidate {
  scale: number;
  tx: number; // fraction, not yet a percent string
  ty: number;
}

function candidatesDiffer(a: CorrectionCandidate, b: CorrectionCandidate): boolean {
  return (
    Math.abs(a.scale - b.scale) > DEADZONE_SCALE_DELTA ||
    Math.abs(a.tx - b.tx) > DEADZONE_OFFSET_FRACTION ||
    Math.abs(a.ty - b.ty) > DEADZONE_OFFSET_FRACTION
  );
}

function candidateToTransform(c: CorrectionCandidate): string {
  return `scaleX(-1) scale(${c.scale.toFixed(3)}) translate(${(c.tx * 100).toFixed(2)}%, ${(c.ty * 100).toFixed(2)}%)`;
}

function isCandidateMeaningful(c: CorrectionCandidate): boolean {
  return (
    Math.abs(c.scale - 1) > MEANINGFUL_SCALE_DELTA ||
    Math.abs(c.tx * 100) > MEANINGFUL_OFFSET_PERCENT ||
    Math.abs(c.ty * 100) > MEANINGFUL_OFFSET_PERCENT
  );
}

export interface FaceFramingResult {
  /** True once BlazeFace has finished loading and detection can run. */
  isModelReady: boolean;
  /** Mirrored CSS transform that recenters/rescales the detected face; undefined when no face is detected or no correction is needed. */
  correctiveTransform: string | undefined;
  /** True while the computed correction is non-trivial (drives the "AI enhanced" badge). */
  isCorrecting: boolean;
}

export function useFaceFraming(videoEl: HTMLVideoElement | null, enabled: boolean): FaceFramingResult {
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [correctiveTransform, setCorrectiveTransform] = useState<string | undefined>(undefined);
  const [isCorrecting, setIsCorrecting] = useState(false);

  // Load the model once, lazily, regardless of `enabled` (so it's ready by the time it's needed).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await tf.ready();
        const model = await blazeface.load();
        if (!cancelled) {
          modelRef.current = model;
          setIsModelReady(true);
        }
      } catch {
        // No WebGL/WASM backend available, or model failed to load — auto-framing
        // just won't correct anything; the raw feed still shows normally.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !videoEl || !isModelReady) {
      setCorrectiveTransform(undefined);
      setIsCorrecting(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    // The currently-applied (committed) correction, and a pending candidate waiting
    // to prove it's a sustained change before it gets committed.
    let applied: CorrectionCandidate | null = null;
    let pending: { candidate: CorrectionCandidate; since: number } | null = null;
    let missTicks = 0;

    const interval = setInterval(() => {
      if (inFlight) return;
      const model = modelRef.current;
      if (!model || videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
      inFlight = true;
      model
        .estimateFaces(videoEl, false)
        .then((predictions) => {
          if (cancelled) return;

          if (!predictions.length) {
            missTicks += 1;
            if (missTicks > MISS_GRACE_TICKS) {
              applied = null;
              pending = null;
              setCorrectiveTransform(undefined);
              setIsCorrecting(false);
            }
            // Within the grace period: keep showing whatever's currently applied.
            return;
          }
          missTicks = 0;

          // Use the most confident detection.
          const face = predictions.reduce((best, p) =>
            (p.probability?.[0] ?? 0) > (best.probability?.[0] ?? 0) ? p : best
          );
          const [x1, y1] = face.topLeft as [number, number];
          const [x2, y2] = face.bottomRight as [number, number];
          const vw = videoEl.videoWidth;
          const vh = videoEl.videoHeight;
          const centerXNorm = (x1 + x2) / 2 / vw;
          const centerYNorm = (y1 + y2) / 2 / vh;
          const heightNorm = (y2 - y1) / vh;

          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_FACE_HEIGHT / Math.max(heightNorm, 0.01)));

          // Centered (-0.5..0.5) coordinates; X is solved assuming a trailing scaleX(-1) mirror.
          const v0 = centerXNorm - 0.5;
          const u0 = centerYNorm - 0.5;
          const vTarget = TARGET_CENTER_X - 0.5;
          const uTarget = TARGET_CENTER_Y - 0.5;
          const tx = -vTarget / scale - v0;
          const ty = uTarget / scale - u0;
          const candidate: CorrectionCandidate = { scale, tx, ty };

          if (!applied) {
            applied = candidate;
            pending = null;
            setCorrectiveTransform(candidateToTransform(applied));
            setIsCorrecting(isCandidateMeaningful(applied));
            return;
          }

          if (!candidatesDiffer(candidate, applied)) {
            // Still within the dead-zone of what's already applied — hold steady.
            pending = null;
            return;
          }

          const now = Date.now();
          if (pending && !candidatesDiffer(candidate, pending.candidate)) {
            // Same distinct change persisting — commit once it's held long enough.
            if (now - pending.since >= COMMIT_DEBOUNCE_MS) {
              applied = candidate;
              pending = null;
              setCorrectiveTransform(candidateToTransform(applied));
              setIsCorrecting(isCandidateMeaningful(applied));
            }
          } else {
            // A new distinct change just appeared — start its debounce timer.
            pending = { candidate, since: now };
          }
        })
        .catch(() => {
          // Transient detection error (e.g. frame not ready) — ignore, try again next tick.
        })
        .finally(() => {
          inFlight = false;
        });
    }, DETECT_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, videoEl, isModelReady]);

  return { isModelReady, correctiveTransform, isCorrecting };
}

