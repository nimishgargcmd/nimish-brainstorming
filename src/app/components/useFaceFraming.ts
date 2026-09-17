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
            setCorrectiveTransform(undefined);
            setIsCorrecting(false);
            return;
          }
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

          const isMeaningful =
            Math.abs(scale - 1) > MEANINGFUL_SCALE_DELTA ||
            Math.abs(tx * 100) > MEANINGFUL_OFFSET_PERCENT ||
            Math.abs(ty * 100) > MEANINGFUL_OFFSET_PERCENT;

          setCorrectiveTransform(`scaleX(-1) scale(${scale.toFixed(3)}) translate(${(tx * 100).toFixed(2)}%, ${(ty * 100).toFixed(2)}%)`);
          setIsCorrecting(isMeaningful);
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
