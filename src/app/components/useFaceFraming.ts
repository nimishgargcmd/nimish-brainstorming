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
const HEAD_PADDING_TOP = 0.30;
const HEAD_PADDING_BOTTOM = 0.15;
const HEAD_PADDING_SIDE = 0.15;
const TILE_MARGIN_SIDE = 0.08;
const TILE_MARGIN_TOP = 0.04;
const TILE_MARGIN_BOTTOM = 0.04;
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

interface CorrectionCandidate {
  scale: number;
  tx: number; // fraction, not yet a percent string
  ty: number;
  coverageX?: number;
  coverageY?: number;
  reason?: string;
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
  const maxOffsetX = ((candidate.coverageX ?? 1) - 1 / scale) / 2;
  const maxOffsetY = ((candidate.coverageY ?? 1) - 1 / scale) / 2;
  return {
    ...candidate,
    scale,
    tx: Math.max(-maxOffsetX, Math.min(maxOffsetX, candidate.tx)),
    ty: Math.max(-maxOffsetY, Math.min(maxOffsetY, candidate.ty)),
  };
}

function candidateToTransform(candidate: CorrectionCandidate): string {
  const bounded = constrainCandidate({ scale: candidate.scale, tx: candidate.tx, ty: candidate.ty });
  return `scaleX(-1) scale(${bounded.scale}) translate(${bounded.tx * 100}%, ${bounded.ty * 100}%)`;
}

function candidateToObjectPosition(candidate: CorrectionCandidate): string {
  const bounded = constrainCandidate({ scale: candidate.scale, tx: candidate.tx, ty: candidate.ty });
  const extraWidth = (candidate.coverageX ?? 1) - 1;
  const extraHeight = (candidate.coverageY ?? 1) - 1;
  const horizontal = extraWidth > 0 ? 50 - (candidate.tx - bounded.tx) / extraWidth * 100 : 50;
  const vertical = extraHeight > 0 ? 50 - (candidate.ty - bounded.ty) / extraHeight * 100 : 50;
  return `${Math.max(0, Math.min(100, horizontal))}% ${Math.max(0, Math.min(100, vertical))}%`;
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
      faceRight <= faceLeft || faceBottom <= faceTop) return { ...neutral, reason: "Invalid dimensions or detection" };

  const coverScale = Math.max(tileWidth / sourceWidth, tileHeight / sourceHeight);
  const coverageX = sourceWidth * coverScale / tileWidth;
  const coverageY = sourceHeight * coverScale / tileHeight;
  const sourceLeft = (1 - coverageX) / 2;
  const sourceTop = (1 - coverageY) / 2;
  const faceWidth = (faceRight - faceLeft) * coverScale / tileWidth;
  const faceHeight = (faceBottom - faceTop) * coverScale / tileHeight;
  const centerX = 0.5 + ((faceLeft + faceRight) / 2 - sourceWidth / 2) * coverScale / tileWidth;
  const centerY = 0.5 + ((faceTop + faceBottom) / 2 - sourceHeight / 2) * coverScale / tileHeight;
  const headLeft = centerX - faceWidth * (0.5 + HEAD_PADDING_SIDE);
  const headRight = centerX + faceWidth * (0.5 + HEAD_PADDING_SIDE);
  const headTop = centerY - faceHeight * (0.5 + HEAD_PADDING_TOP);
  const headBottom = centerY + faceHeight * (0.5 + HEAD_PADDING_BOTTOM);

  if (headLeft <= sourceLeft || headRight >= 1 - sourceLeft ||
      headTop <= sourceTop || headBottom >= 1 - sourceTop) return { ...neutral, reason: "Estimated head outside camera image" };

  const minScale = Math.max(
    MIN_SCALE,
    TILE_MARGIN_SIDE / (headLeft - sourceLeft),
    TILE_MARGIN_SIDE / (1 - sourceLeft - headRight),
    TILE_MARGIN_TOP / (headTop - sourceTop),
    TILE_MARGIN_BOTTOM / (1 - sourceTop - headBottom),
  );
  const maxScale = Math.min(
    MAX_SCALE,
    (1 - 2 * TILE_MARGIN_SIDE) / (headRight - headLeft),
    (1 - TILE_MARGIN_TOP - TILE_MARGIN_BOTTOM) / (headBottom - headTop),
  );
  if (minScale > maxScale) return { ...neutral, reason: `Head margins cannot fit (${minScale.toFixed(2)} > ${maxScale.toFixed(2)})` };

  const horizontalCenteringScale = 1 / (coverageX - 2 * Math.abs(centerX - 0.5));
  const scale = Math.max(minScale, Math.min(maxScale, Math.max(TARGET_FACE_HEIGHT / faceHeight, horizontalCenteringScale)));
  const maxOffsetX = (coverageX - 1 / scale) / 2;
  const maxOffsetY = (coverageY - 1 / scale) / 2;
  const minTx = Math.max(-maxOffsetX, (TILE_MARGIN_SIDE - 0.5) / scale - (headLeft - 0.5));
  const maxTx = Math.min(maxOffsetX, (0.5 - TILE_MARGIN_SIDE) / scale - (headRight - 0.5));
  const minTy = Math.max(-maxOffsetY, (TILE_MARGIN_TOP - 0.5) / scale - (headTop - 0.5));
  const maxTy = Math.min(maxOffsetY, (0.5 - TILE_MARGIN_BOTTOM) / scale - (headBottom - 0.5));
  return constrainCandidate({
    scale,
    coverageX,
    coverageY,
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

type FaceVisibility = "partial" | "full" | "missing" | "unknown";

interface FaceVisibilityState {
  paused: boolean;
  showCue: boolean;
  partialSince: number | null;
  fullSince: number | null;
  lastSampleAt: number;
}

function initialFaceVisibility(): FaceVisibilityState {
  return { paused: false, showCue: false, partialSince: null, fullSince: null, lastSampleAt: 0 };
}

function classifyFaceVisibility(
  bounds: number[], landmarks: unknown, confidence: number, width: number, height: number,
): FaceVisibility {
  if (!Number.isFinite(confidence) || confidence < 0.9 ||
      ![...bounds, width, height].every(Number.isFinite) || bounds.length !== 4 || width <= 0 || height <= 0 ||
      !Array.isArray(landmarks) || landmarks.length < 4) return "unknown";
  const core = landmarks.slice(0, 4);
  if (!core.every(point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite))) return "unknown";
  const [left, top, right, bottom] = bounds;
  const faceWidth = right - left;
  const faceHeight = bottom - top;
  if (faceWidth <= 0 || faceHeight <= 0) return "unknown";
  const crossesLeft = left < -faceWidth * 0.02 && core.some(point => point[0] <= width * 0.02);
  const crossesRight = right > width + faceWidth * 0.02 && core.some(point => point[0] >= width * 0.98);
  const crossesTop = top < -faceHeight * 0.02 && core.some(point => point[1] <= height * 0.02);
  const crossesBottom = bottom > height + faceHeight * 0.02 && core.some(point => point[1] >= height * 0.98);
  if (crossesLeft || crossesRight || crossesTop || crossesBottom) return "partial";
  if (left > faceWidth * 0.02 && right < width - faceWidth * 0.02 &&
      top > faceHeight * 0.02 && bottom < height - faceHeight * 0.02 &&
      core.every(point => point[0] > 0 && point[0] < width && point[1] > 0 && point[1] < height)) return "full";
  return "unknown";
}

function advanceFaceVisibility(state: FaceVisibilityState, evidence: FaceVisibility, now: number): FaceVisibilityState {
  const next = { ...state, lastSampleAt: now };
  if (now - state.lastSampleAt > 750) {
    next.partialSince = null;
    next.fullSince = null;
  }
  if (evidence === "partial" || evidence === "missing") {
    next.paused = true;
    next.fullSince = null;
    next.partialSince ??= now;
    next.showCue = state.showCue || now - next.partialSince >= 1000;
  } else if (evidence === "full") {
    next.partialSince = null;
    next.fullSince ??= now;
    if (now - next.fullSince >= 750) {
      next.paused = false;
      next.showCue = false;
    }
  } else {
    next.partialSince = null;
    next.fullSince = null;
  }
  return next;
}

export interface FaceFramingResult {
  /** True once BlazeFace has finished loading and detection can run. */
  isModelReady: boolean;
  /** Mirrored CSS transform that recenters/rescales the detected face; undefined when no face is detected or no correction is needed. */
  correctiveTransform: string | undefined;
  correctiveObjectPosition: string;
  /** True while the computed correction is non-trivial (drives the "AI enhanced" badge). */
  isCorrecting: boolean;
  isFramingPaused: boolean;
  showPartialFaceCue: boolean;
  diagnostic: string | null;
}

export function useFaceFraming(videoEl: HTMLVideoElement | null, enabled: boolean, autoFramingEnabled = true): FaceFramingResult {
  const [debugEnabled] = useState(() => new URLSearchParams(window.location.search).get("framingDebug") === "1");
  const [diagnostic, setDiagnostic] = useState<string | null>(debugEnabled ? "Loading face detector" : null);
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [correctiveTransform, setCorrectiveTransform] = useState<string | undefined>(undefined);
  const [correctiveObjectPosition, setCorrectiveObjectPosition] = useState("50% 50%");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [isFramingPaused, setIsFramingPaused] = useState(false);
  const [showPartialFaceCue, setShowPartialFaceCue] = useState(false);
  const autoFramingEnabledRef = useRef(autoFramingEnabled);
  const resetFramingRef = useRef(false);

  useEffect(() => {
    autoFramingEnabledRef.current = autoFramingEnabled;
    resetFramingRef.current = true;
    setCorrectiveTransform(undefined);
    setCorrectiveObjectPosition("50% 50%");
    setIsCorrecting(false);
  }, [autoFramingEnabled]);

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
          if (debugEnabled) setDiagnostic(`Model ready (${tf.getBackend()}); waiting for camera`);
        }
      } catch (error) {
        if (!cancelled && debugEnabled) setDiagnostic(`Model failed: ${String(error).slice(0, 180)}`);
        // No WebGL/WASM backend available, or model failed to load — auto-framing
        // just won't correct anything; the raw feed still shows normally.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debugEnabled]);

  useEffect(() => {
    if (!enabled || !videoEl || !isModelReady) {
      setCorrectiveTransform(undefined);
      setCorrectiveObjectPosition("50% 50%");
      setIsCorrecting(false);
      setIsFramingPaused(false);
      setShowPartialFaceCue(false);
      return;
    }

    let cancelled = false;
    let inFlight = false;
    // The currently-applied (committed) correction, and a pending candidate waiting
    // to prove it's a sustained change before it gets committed.
    let applied: CorrectionCandidate | null = null;
    let pending: { candidate: CorrectionCandidate; since: number } | null = null;
    let missTicks = 0;
    let visibility = initialFaceVisibility();
    const observeVisibility = (evidence: FaceVisibility) => {
      const next = advanceFaceVisibility(visibility, evidence, performance.now());
      if (next.paused && !visibility.paused && autoFramingEnabledRef.current) {
        applied = null;
        setCorrectiveTransform(undefined);
        setCorrectiveObjectPosition("50% 50%");
        setIsCorrecting(false);
      }
      if (next.paused || visibility.paused) pending = null;
      if (!next.paused && visibility.paused) applied = null;
      visibility = next;
      setIsFramingPaused(next.paused);
      setShowPartialFaceCue(next.showCue);
      return next.paused;
    };
    const report = (message: string) => {
      if (debugEnabled) setDiagnostic(`${tf.getBackend()} | camera ${videoEl.videoWidth}x${videoEl.videoHeight} | tile ${videoEl.clientWidth}x${videoEl.clientHeight}\n${message}`);
    };

    const interval = setInterval(() => {
      if (inFlight) return;
      const model = modelRef.current;
      if (!model || videoEl.readyState < 2 || videoEl.videoWidth === 0) {
        observeVisibility("unknown");
        report(`Waiting for video frames (readyState ${videoEl.readyState})`);
        return;
      }
      inFlight = true;
      model
        .estimateFaces(videoEl, false)
        .then((predictions) => {
          if (cancelled) return;
          if (resetFramingRef.current) {
            applied = null;
            pending = null;
            resetFramingRef.current = false;
          }

          if (!predictions.length) {
            observeVisibility("missing");
            missTicks += 1;
            report(`No face detected (${missTicks} samples)`);
            return;
          }
          missTicks = 0;

          // Use the most confident detection.
          const face = predictions.reduce((best, p) =>
            (p.probability?.[0] ?? 0) > (best.probability?.[0] ?? 0) ? p : best
          );
          const [x1, y1] = face.topLeft as [number, number];
          const [x2, y2] = face.bottomRight as [number, number];
          const evidence = classifyFaceVisibility(
            [x1, y1, x2, y2], face.landmarks, face.probability?.[0] ?? 0,
            videoEl.videoWidth, videoEl.videoHeight,
          );
          if (observeVisibility(evidence)) {
            report(`Framing paused (${evidence}); ${visibility.showCue ? "Move fully into view" : "confirming visibility"}\nFace ${[x1, y1, x2, y2].map(Math.round).join(", ")}`);
            return;
          }
          if (!autoFramingEnabledRef.current) {
            report(`Visibility ${evidence}; auto-framing off`);
            return;
          }
          const candidate = calculateFramingCandidate(
            x1, y1, x2, y2,
            videoEl.videoWidth, videoEl.videoHeight,
            videoEl.clientWidth, videoEl.clientHeight,
          );
          const details = `Face ${[x1, y1, x2, y2].map(Math.round).join(", ")}\n${candidate.reason ?? `Target zoom ${candidate.scale.toFixed(2)}, shift ${(candidate.tx * 100).toFixed(1)}%, ${(candidate.ty * 100).toFixed(1)}%`}`;

          if (!applied) {
            applied = candidate;
            pending = null;
            setCorrectiveTransform(candidateToTransform(applied));
            setCorrectiveObjectPosition(candidateToObjectPosition(applied));
            setIsCorrecting(isCandidateMeaningful(applied));
            report(`Applied\n${details}`);
            return;
          }

          if (!candidatesDiffer(candidate, applied)) {
            // Still within the dead-zone of what's already applied — hold steady.
            pending = null;
            report(`Holding\n${details}`);
            return;
          }

          const now = Date.now();
          if (pending && !candidatesDiffer(candidate, pending.candidate)) {
            // Same distinct change persisting — commit once it's held long enough.
            if (now - pending.since >= COMMIT_DEBOUNCE_MS) {
              applied = candidate;
              pending = null;
              setCorrectiveTransform(candidateToTransform(applied));
              setCorrectiveObjectPosition(candidateToObjectPosition(applied));
              setIsCorrecting(isCandidateMeaningful(applied));
              report(`Readjusting\n${details}`);
            } else {
              report(`Waiting for stable position (${now - pending.since}/${COMMIT_DEBOUNCE_MS}ms)\n${details}`);
            }
          } else {
            // A new distinct change just appeared — start its debounce timer.
            pending = { candidate, since: now };
            report(`New position; waiting ${COMMIT_DEBOUNCE_MS}ms\n${details}`);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            observeVisibility("unknown");
            report(`Detection failed: ${String(error).slice(0, 180)}`);
          }
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
  }, [enabled, videoEl, isModelReady, debugEnabled]);

  return { isModelReady, correctiveTransform, correctiveObjectPosition, isCorrecting, isFramingPaused, showPartialFaceCue, diagnostic };
}

