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
const TARGET_CENTER_Y = 0.52;
const TARGET_FACE_HEIGHT = 0.42;
const HEAD_PADDING_TOP = 0.55;
const HEAD_PADDING_BOTTOM = 0.15;
const HEAD_PADDING_SIDE = 0.15;
const TILE_MARGIN_SIDE = 0.08;
const TILE_MARGIN_TOP = 0.06;
const TILE_MARGIN_BOTTOM = 0.16;
const MIN_SCALE = 1;
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

function constrainCandidate(candidate: CorrectionCandidate): CorrectionCandidate {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, candidate.scale));
  const maxOffset = (1 - 1 / scale) / 2;
  return {
    scale,
    tx: Math.max(-maxOffset, Math.min(maxOffset, candidate.tx)),
    ty: Math.max(-maxOffset, Math.min(maxOffset, candidate.ty)),
  };
}

function candidateToTransform(candidate: CorrectionCandidate): string {
  return `scaleX(-1) scale(${candidate.scale}) translate(${candidate.tx * 100}%, ${candidate.ty * 100}%)`;
}

function calculateFramingCandidate(
  faceLeft: number,
  faceTop: number,
  faceRight: number,
  faceBottom: number,
  sourceWidth: number,
  sourceHeight: number,
  tileWidth: number,
  tileHeight: number,
): CorrectionCandidate {
  const neutral = { scale: 1, tx: 0, ty: 0 };
  if (![faceLeft, faceTop, faceRight, faceBottom, sourceWidth, sourceHeight, tileWidth, tileHeight].every(Number.isFinite) ||
      Math.min(sourceWidth, sourceHeight, tileWidth, tileHeight) <= 0 ||
      faceRight <= faceLeft || faceBottom <= faceTop) return neutral;

  const coverScale = Math.max(tileWidth / sourceWidth, tileHeight / sourceHeight);
  const faceWidth = (faceRight - faceLeft) * coverScale / tileWidth;
  const faceHeight = (faceBottom - faceTop) * coverScale / tileHeight;
  const centerX = 0.5 + ((faceLeft + faceRight) / 2 - sourceWidth / 2) * coverScale / tileWidth;
  const centerY = 0.5 + ((faceTop + faceBottom) / 2 - sourceHeight / 2) * coverScale / tileHeight;
  const headLeft = centerX - faceWidth * (0.5 + HEAD_PADDING_SIDE);
  const headRight = centerX + faceWidth * (0.5 + HEAD_PADDING_SIDE);
  const headTop = centerY - faceHeight * (0.5 + HEAD_PADDING_TOP);
  const headBottom = centerY + faceHeight * (0.5 + HEAD_PADDING_BOTTOM);

  if (headLeft <= 0 || headRight >= 1 || headTop <= 0 || headBottom >= 1) return neutral;

  const minScale = Math.max(
    MIN_SCALE,
    TILE_MARGIN_SIDE / headLeft,
    TILE_MARGIN_SIDE / (1 - headRight),
    TILE_MARGIN_TOP / headTop,
    TILE_MARGIN_BOTTOM / (1 - headBottom),
  );
  const maxScale = Math.min(
    MAX_SCALE,
    (1 - 2 * TILE_MARGIN_SIDE) / (headRight - headLeft),
    (1 - TILE_MARGIN_TOP - TILE_MARGIN_BOTTOM) / (headBottom - headTop),
  );
  if (minScale > maxScale) return neutral;

  const scale = Math.max(minScale, Math.min(maxScale, TARGET_FACE_HEIGHT / faceHeight));
  const maxOffset = (1 - 1 / scale) / 2;
  const minTx = Math.max(-maxOffset, (TILE_MARGIN_SIDE - 0.5) / scale - (headLeft - 0.5));
  const maxTx = Math.min(maxOffset, (0.5 - TILE_MARGIN_SIDE) / scale - (headRight - 0.5));
  const minTy = Math.max(-maxOffset, (TILE_MARGIN_TOP - 0.5) / scale - (headTop - 0.5));
  const maxTy = Math.min(maxOffset, (0.5 - TILE_MARGIN_BOTTOM) / scale - (headBottom - 0.5));
  return constrainCandidate({
    scale,
    tx: Math.max(minTx, Math.min(maxTx, (0.5 - TARGET_CENTER_X) / scale - (centerX - 0.5))),
    ty: Math.max(minTy, Math.min(maxTy, (TARGET_CENTER_Y - 0.5) / scale - (centerY - 0.5))),
  });
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
          const candidate = calculateFramingCandidate(
            x1, y1, x2, y2,
            videoEl.videoWidth, videoEl.videoHeight,
            videoEl.clientWidth, videoEl.clientHeight,
          );

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

