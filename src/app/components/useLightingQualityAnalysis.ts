import { useEffect, useRef, useState } from "react";

/**
 * Real-time lighting + quality analysis: samples the live <video> feed onto a small
 * offscreen canvas and measures actual brightness and sharpness — the real "poor
 * lighting" / "poor quality" detection, driving the same corrective CSS filters that
 * used to be behind manual simulate chips. No canned toggles; whatever the camera
 * actually sees is what gets classified and corrected.
 */

const ANALYSIS_INTERVAL_MS = 400;
const SAMPLE_WIDTH = 64;
const SAMPLE_HEIGHT = 48;

// Brightness (0-255 mean luminance) thresholds and the target we correct toward.
const TARGET_LUMINANCE = 130;
const DARK_THRESHOLD = 80;
const BRIGHT_THRESHOLD = 200;
const MIN_BRIGHTNESS_SCALE = 0.6;
const MAX_BRIGHTNESS_SCALE = 2.0;

// Laplacian variance (cheap sharpness proxy) below this reads as blurry/low-detail.
const SHARPNESS_THRESHOLD = 18;

export interface LightingQualityResult {
  isPoorLighting: boolean;
  isPoorQuality: boolean;
  /** CSS filter fragment correcting exposure, or undefined when lighting is already fine. */
  lightingFilter: string | undefined;
  /** CSS filter fragment correcting perceived sharpness, or undefined when quality is already fine. */
  qualityFilter: string | undefined;
  /** True while either correction is actively applied — drives the shared badge/sweep. */
  isCorrecting: boolean;
}

const IDLE_RESULT: LightingQualityResult = {
  isPoorLighting: false,
  isPoorQuality: false,
  lightingFilter: undefined,
  qualityFilter: undefined,
  isCorrecting: false,
};

export function useLightingQualityAnalysis(videoEl: HTMLVideoElement | null, enabled: boolean): LightingQualityResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState<LightingQualityResult>(IDLE_RESULT);

  useEffect(() => {
    if (!enabled || !videoEl) {
      setResult(IDLE_RESULT);
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = SAMPLE_WIDTH;
      canvasRef.current.height = SAMPLE_HEIGHT;
    }
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let cancelled = false;
    let inFlight = false;

    const interval = setInterval(() => {
      if (inFlight || cancelled) return;
      if (videoEl.readyState < 2 || videoEl.videoWidth === 0) return;
      inFlight = true;
      try {
        ctx.drawImage(videoEl, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const pixelCount = SAMPLE_WIDTH * SAMPLE_HEIGHT;
        const gray = new Float32Array(pixelCount);
        let luminanceSum = 0;
        for (let i = 0; i < pixelCount; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const l = 0.299 * r + 0.587 * g + 0.114 * b;
          gray[i] = l;
          luminanceSum += l;
        }
        const meanLuminance = luminanceSum / pixelCount;

        // Discrete Laplacian variance: near-zero for flat/blurry frames, higher for sharp detail.
        let lapSum = 0;
        let lapSumSq = 0;
        let lapCount = 0;
        for (let y = 1; y < SAMPLE_HEIGHT - 1; y++) {
          for (let x = 1; x < SAMPLE_WIDTH - 1; x++) {
            const idx = y * SAMPLE_WIDTH + x;
            const lap = 4 * gray[idx] - gray[idx - 1] - gray[idx + 1] - gray[idx - SAMPLE_WIDTH] - gray[idx + SAMPLE_WIDTH];
            lapSum += lap;
            lapSumSq += lap * lap;
            lapCount++;
          }
        }
        const lapMean = lapSum / lapCount;
        const sharpness = lapSumSq / lapCount - lapMean * lapMean;

        const isPoorLighting = meanLuminance < DARK_THRESHOLD || meanLuminance > BRIGHT_THRESHOLD;
        const isPoorQuality = sharpness < SHARPNESS_THRESHOLD;

        let lightingFilter: string | undefined;
        if (isPoorLighting) {
          const scale = Math.min(MAX_BRIGHTNESS_SCALE, Math.max(MIN_BRIGHTNESS_SCALE, TARGET_LUMINANCE / Math.max(meanLuminance, 20)));
          lightingFilter = `brightness(${scale.toFixed(2)}) contrast(1.06)`;
        }

        let qualityFilter: string | undefined;
        if (isPoorQuality) {
          const deficit = Math.min(1, Math.max(0, (SHARPNESS_THRESHOLD - sharpness) / SHARPNESS_THRESHOLD));
          qualityFilter = `contrast(${(1 + deficit * 0.25).toFixed(2)}) saturate(${(1 + deficit * 0.18).toFixed(2)})`;
        }

        if (!cancelled) {
          setResult({ isPoorLighting, isPoorQuality, lightingFilter, qualityFilter, isCorrecting: isPoorLighting || isPoorQuality });
        }
      } catch {
        // Ignore transient read errors (e.g. a frame not decoded yet) — retry next tick.
      } finally {
        inFlight = false;
      }
    }, ANALYSIS_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, videoEl]);

  return result;
}
