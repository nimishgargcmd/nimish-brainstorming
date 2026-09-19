import { useEffect, useRef, useState } from "react";

const ANALYSIS_INTERVAL_MS = 400;
const SAMPLE_WIDTH = 160;
const SAMPLE_HEIGHT = 120;

// Brightness (0-255 mean luminance) thresholds and the target we correct toward.
const TARGET_LUMINANCE = 130;
const DARK_THRESHOLD = 80;
const BRIGHT_THRESHOLD = 200;
const MIN_BRIGHTNESS_SCALE = 0.6;
const MAX_BRIGHTNESS_SCALE = 2.0;

// Laplacian variance (cheap sharpness proxy) below this reads as blurry/low-detail.
const SHARPNESS_THRESHOLD = 18;

interface QualitySample {
  gray: Float32Array;
  luminance: number;
  contrast: number;
  sharpness: number;
  motion: number | null;
}

function measureQuality(data: Uint8ClampedArray, width: number, height: number, previous: Float32Array | null): QualitySample {
  const count = width * height;
  const gray = new Float32Array(count);
  let total = 0;
  let squared = 0;
  let movement = 0;
  for (let index = 0; index < count; index++) {
    const value = 0.299 * data[index * 4] + 0.587 * data[index * 4 + 1] + 0.114 * data[index * 4 + 2];
    gray[index] = value;
    total += value;
    squared += value * value;
    if (previous?.length === count) movement += Math.abs(value - previous[index]);
  }
  let lapTotal = 0;
  let lapSquared = 0;
  for (let vertical = 1; vertical < height - 1; vertical++) {
    for (let horizontal = 1; horizontal < width - 1; horizontal++) {
      const index = vertical * width + horizontal;
      const lap = 4 * gray[index] - gray[index - 1] - gray[index + 1] - gray[index - width] - gray[index + width];
      lapTotal += lap;
      lapSquared += lap * lap;
    }
  }
  const lapCount = (width - 2) * (height - 2);
  const luminance = total / count;
  return {
    gray,
    luminance,
    contrast: Math.sqrt(Math.max(0, squared / count - luminance * luminance)),
    sharpness: Math.max(0, lapSquared / lapCount - (lapTotal / lapCount) ** 2),
    motion: previous?.length === count ? movement / count : null,
  };
}

type CleaningEvidence = "blur" | "clear" | "uncertain";

function cleaningEvidence(sample: QualitySample): CleaningEvidence {
  if (![sample.luminance, sample.contrast, sample.sharpness, sample.motion].every(value => typeof value === "number" && Number.isFinite(value))) return "uncertain";
  if (sample.luminance < DARK_THRESHOLD || sample.luminance > BRIGHT_THRESHOLD || sample.contrast < 12 || sample.motion! > 2) return "uncertain";
  if (sample.sharpness < SHARPNESS_THRESHOLD) return "blur";
  return sample.sharpness >= 30 ? "clear" : "uncertain";
}

interface CleaningState {
  showCue: boolean;
  blurSince: number | null;
  clearSince: number | null;
  lastSampleAt: number | null;
}

function initialCleaningState(): CleaningState {
  return { showCue: false, blurSince: null, clearSince: null, lastSampleAt: null };
}

function advanceCleaning(state: CleaningState, evidence: CleaningEvidence, now: number): CleaningState {
  if (state.lastSampleAt !== null && (now - state.lastSampleAt > 1200 || now < state.lastSampleAt)) state = initialCleaningState();
  if (evidence === "uncertain") return { ...initialCleaningState(), lastSampleAt: now };
  if (evidence === "blur") {
    const blurSince = state.blurSince ?? now;
    return { showCue: state.showCue || now - blurSince >= 6000, blurSince, clearSince: null, lastSampleAt: now };
  }
  const clearSince = state.clearSince ?? now;
  return { showCue: state.showCue && now - clearSince < 2000, blurSince: null, clearSince, lastSampleAt: now };
}

function captureDiagnostics(constraints: MediaTrackConstraints, settings: MediaTrackSettings, width: number, height: number) {
  const preferred = (value: ConstrainULong | undefined) => typeof value === "number" ? value : value?.exact ?? value?.ideal;
  const requestedWidth = preferred(constraints.width);
  const requestedHeight = preferred(constraints.height);
  const requestedEdges = [requestedWidth ?? 0, requestedHeight ?? 0].sort((first, second) => first - second);
  const decodedEdges = [width, height].sort((first, second) => first - second);
  return {
    requested: { width: constraints.width, height: constraints.height, frameRate: constraints.frameRate },
    delivered: { width: settings.width, height: settings.height, frameRate: settings.frameRate, facingMode: settings.facingMode },
    decoded: { width, height },
    belowRequestedResolution: requestedEdges[0] > 0 && width > 0 && height > 0
      ? decodedEdges[0] < requestedEdges[0] || decodedEdges[1] < requestedEdges[1]
      : null,
  };
}

export interface LightingQualityResult {
  isPoorLighting: boolean;
  isPoorQuality: boolean;
  lightingFilter: string | undefined;
  qualityFilter: string | undefined;
  isCorrecting: boolean;
  showCleaningCue: boolean;
  dismissCleaningCue: () => void;
  diagnostic: string | null;
}

const IDLE_RESULT = {
  isPoorLighting: false,
  isPoorQuality: false,
  lightingFilter: undefined as string | undefined,
  qualityFilter: undefined as string | undefined,
  isCorrecting: false,
  showCleaningCue: false,
  diagnostic: null as string | null,
};

export function useLightingQualityAnalysis(videoEl: HTMLVideoElement | null, enabled: boolean, enhancementEnabled = true, guidanceEligible = true): LightingQualityResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [result, setResult] = useState(IDLE_RESULT);
  const [dismissed, setDismissed] = useState(false);
  const [debugEnabled] = useState(() => new URLSearchParams(window.location.search).get("qualityDebug") === "1");

  useEffect(() => {
    setResult(IDLE_RESULT);
    if (!enabled || !videoEl) {
      return;
    }

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = SAMPLE_WIDTH;
      canvasRef.current.height = SAMPLE_HEIGHT;
    }
    const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let previous: Float32Array | null = null;
    let cleaning = initialCleaningState();
    let lastMediaTime = -1;
    let lastTrack: MediaStreamTrack | undefined;
    let lastDimensions = "";
    const reset = (reason: string) => {
      previous = null;
      cleaning = initialCleaningState();
      setResult({ ...IDLE_RESULT, diagnostic: debugEnabled ? reason : null });
    };

    const interval = setInterval(() => {
      try {
        const track = (videoEl.srcObject as MediaStream | null)?.getVideoTracks?.()[0];
        const dimensions = `${videoEl.videoWidth}x${videoEl.videoHeight}`;
        if (track !== lastTrack || dimensions !== lastDimensions) {
          reset("Camera changed; collecting fresh samples");
          lastTrack = track;
          lastDimensions = dimensions;
          lastMediaTime = -1;
        }
        if (document.visibilityState === "hidden" || videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight || videoEl.paused || !track || track.readyState !== "live" || !track.enabled || track.muted || videoEl.currentTime === lastMediaTime) {
          reset("Waiting for fresh active camera frames");
          return;
        }
        lastMediaTime = videoEl.currentTime;
        ctx.drawImage(videoEl, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const { data } = ctx.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const sample = measureQuality(data, SAMPLE_WIDTH, SAMPLE_HEIGHT, previous);
        previous = sample.gray;
        const evidence = guidanceEligible ? cleaningEvidence(sample) : "uncertain";
        cleaning = advanceCleaning(cleaning, evidence, performance.now());
        const isPoorLighting = sample.luminance < DARK_THRESHOLD || sample.luminance > BRIGHT_THRESHOLD;
        let lightingFilter: string | undefined;
        if (isPoorLighting) {
          const scale = Math.min(MAX_BRIGHTNESS_SCALE, Math.max(MIN_BRIGHTNESS_SCALE, TARGET_LUMINANCE / Math.max(sample.luminance, 20)));
          lightingFilter = `brightness(${scale.toFixed(2)}) contrast(1.06)`;
        }
        const diagnostic = debugEnabled ? JSON.stringify({
          ...captureDiagnostics(track.getConstraints(), track.getSettings(), videoEl.videoWidth, videoEl.videoHeight),
          analysis: {
            luminance: +sample.luminance.toFixed(1), contrast: +sample.contrast.toFixed(1),
            sharpness: +sample.sharpness.toFixed(1), motion: sample.motion === null ? null : +sample.motion.toFixed(1),
            evidence, guidanceEligible, experimental: true,
          },
        }, null, 2) : null;
        setResult({
          isPoorLighting, isPoorQuality: evidence === "blur", lightingFilter, qualityFilter: undefined,
          isCorrecting: isPoorLighting, showCleaningCue: cleaning.showCue, diagnostic,
        });
      } catch {
        reset("Camera frame analysis unavailable");
      }
    }, ANALYSIS_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, videoEl, guidanceEligible, debugEnabled]);

  return {
    ...result,
    lightingFilter: enabled && enhancementEnabled ? result.lightingFilter : undefined,
    isCorrecting: enabled && enhancementEnabled && result.isCorrecting,
    showCleaningCue: enabled && guidanceEligible && !dismissed && result.showCleaningCue,
    dismissCleaningCue: () => setDismissed(true),
    diagnostic: debugEnabled ? `${result.diagnostic ?? "Camera inactive"}\nCleaning advice dismissed: ${dismissed}` : null,
  };
}
