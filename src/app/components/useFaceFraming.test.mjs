import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("./useFaceFraming.ts", import.meta.url), "utf8");
const helpers = source.slice(source.indexOf("const TARGET_CENTER_X"), source.indexOf("export interface FaceFramingResult"));
const context = vm.createContext({});
vm.runInContext(transformSync(helpers, { loader: "ts" }).code, context);
const { classifyFaceVisibility: classify, advanceFaceVisibility: advance, initialFaceVisibility: initial, calculateFramingCandidate } = context;
const fullBounds = [300, 210, 470, 430];
const fullLandmarks = [[340, 270], [425, 270], [385, 315], [385, 370]];
const leftBounds = [-70, 200, 130, 400];
const leftLandmarks = [[5, 260], [80, 260], [35, 300], [35, 360]];

function confirmedPartial() {
  return [0, 250, 500, 750, 1000].reduce((state, time) => advance(state, "partial", time), initial());
}

test("full face in source stays eligible even outside the centered preview crop", () => {
  assert.equal(classify(fullBounds, fullLandmarks, 0.99, 1280, 720), "full");
  const candidate = calculateFramingCandidate(...fullBounds, 1280, 720, 358, 385);
  assert.equal(candidate.reason, undefined);
  assert.ok(Math.abs(candidate.tx) > 0.1);
});

test("source-edge crossing plus a matching core landmark detects each direction", () => {
  assert.equal(classify(leftBounds, leftLandmarks, 0.99, 1280, 720), "partial");
  assert.equal(classify([1150, 200, 1350, 400], leftLandmarks.map(([horizontal, vertical]) => [1280 - horizontal, vertical]), 0.99, 1280, 720), "partial");
  assert.equal(classify([300, -70, 500, 130], [[350, 5], [450, 5], [400, 50], [400, 100]], 0.99, 1280, 720), "partial");
  assert.equal(classify([300, 590, 500, 790], [[350, 620], [450, 620], [400, 680], [400, 715]], 0.99, 1280, 720), "partial");
});

test("edge proximity, head-padding overflow, and box crossing alone cannot trigger advice", () => {
  assert.equal(classify([1, 200, 201, 400], leftLandmarks, 0.99, 1280, 720), "unknown");
  assert.equal(classify(leftBounds, fullLandmarks, 0.99, 1280, 720), "unknown");
  assert.equal(classify([300, 20, 500, 220], [[350, 60], [450, 60], [400, 120], [400, 170]], 0.99, 1280, 720), "full");
  assert.equal(classify([-1, 200, 199, 400], leftLandmarks, 0.99, 1280, 720), "unknown");
});

test("unreliable detections are unknown, never partial", () => {
  for (const confidence of [0.5, NaN]) assert.equal(classify(leftBounds, leftLandmarks, confidence, 1280, 720), "unknown");
  for (const landmarks of [undefined, [], [[NaN, 4]], [[0, 4], [2, 3], [3, 4], [NaN, 3]]]) {
    assert.equal(classify(leftBounds, landmarks, 0.99, 1280, 720), "unknown");
  }
  assert.equal(classify([NaN, 0, 100, 100], leftLandmarks, 0.99, 1280, 720), "unknown");
  assert.equal(classify(leftBounds, leftLandmarks, 0.99, 0, 720), "unknown");
});

test("pause is immediate but cue waits for a full second of sustained evidence", () => {
  let state = initial();
  for (const time of [0, 250, 500, 750]) {
    state = advance(state, "partial", time);
    assert.equal(state.paused, true);
    assert.equal(state.showCue, false);
  }
  state = advance(state, "partial", 1000);
  assert.equal(state.showCue, true);
  assert.equal(advance(state, "partial", 1250).showCue, true);
});

test("brief lean returns without showing the cue", () => {
  let state = advance(initial(), "partial", 0);
  for (const time of [250, 500, 750, 1000]) state = advance(state, "full", time);
  assert.equal(state.paused, false);
  assert.equal(state.showCue, false);
});

test("cue and pause persist until 750ms of continuous full-face evidence", () => {
  let state = confirmedPartial();
  for (const time of [1250, 1500, 1750]) {
    state = advance(state, "full", time);
    assert.equal(state.paused, true);
    assert.equal(state.showCue, true);
  }
  state = advance(state, "full", 2000);
  assert.equal(state.paused, false);
  assert.equal(state.showCue, false);
});

test("unknown detections and long sampling gaps interrupt confirmation", () => {
  let state = advance(initial(), "partial", 0);
  state = advance(state, "unknown", 250);
  state = advance(state, "partial", 500);
  state = advance(state, "partial", 1000);
  assert.equal(state.showCue, false);
  state = advance(state, "partial", 2500);
  assert.equal(state.showCue, false);
  state = advance(confirmedPartial(), "full", 1250);
  state = advance(state, "unknown", 1500);
  state = advance(state, "full", 1750);
  state = advance(state, "full", 2000);
  assert.equal(state.paused, true);
});

test("cue persists through missing or uncertain detections until a full face returns", () => {
  let state = confirmedPartial();
  state = advance(state, "unknown", 1250);
  assert.equal(state.showCue, true);
  state = advance(state, "unknown", 3000);
  assert.equal(state.showCue, true);
  assert.equal(state.paused, true);
  state = advance(state, "missing", 60000);
  assert.equal(state.showCue, true);
  for (const time of [60250, 60500, 60750, 61000]) state = advance(state, "full", time);
  assert.equal(state.showCue, false);
  assert.equal(state.paused, false);
});

test("uncertain detections alone never create a cue or a pause", () => {
  let state = initial();
  for (const time of [0, 250, 500, 1000, 3000]) state = advance(state, "unknown", time);
  assert.equal(state.paused, false);
  assert.equal(state.showCue, false);
});

test("leaving after a full face and initial absence both produce a sustained cue", () => {
  for (const startingState of [initial(), advance(initial(), "full", 0)]) {
    let state = startingState;
    for (const time of [250, 500, 750, 1000]) {
      state = advance(state, "missing", time);
      assert.equal(state.showCue, false);
      assert.equal(state.paused, true);
    }
    state = advance(state, "missing", 1250);
    assert.equal(state.showCue, true);
    state = advance(state, "missing", 60000);
    assert.equal(state.showCue, true);
  }
});

test("a brief detection miss does not display the cue", () => {
  let state = advance(initial(), "missing", 0);
  for (const time of [250, 500, 750, 1000]) state = advance(state, "full", time);
  assert.equal(state.showCue, false);
  assert.equal(state.paused, false);
});

async function createHookHarness(initialEnhancement = true) {
  const slots = [];
  let cursor = 0;
  let dirty = false;
  let effects = [];
  let interval;
  let now = 0;
  let predictions = [];
  let enhancement = initialEnhancement;
  let cameraEnabled = true;
  let result;
  const video = { videoWidth: 1280, videoHeight: 720, clientWidth: 358, clientHeight: 385, readyState: 2 };
  const react = {
    useState(initialValue) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initialValue === "function" ? initialValue() : initialValue;
      return [slots[index], value => {
        const next = typeof value === "function" ? value(slots[index]) : value;
        if (!Object.is(next, slots[index])) { slots[index] = next; dirty = true; }
      }];
    },
    useRef(value) {
      const index = cursor++;
      return slots[index] ??= { current: value };
    },
    useEffect(callback, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || dependencies.some((value, position) => !Object.is(value, previous.dependencies[position]))) {
        effects.push(() => {
          previous?.cleanup?.();
          slots[index] = { dependencies, cleanup: callback() };
        });
      }
    },
  };
  const runtime = vm.createContext({
    module: { exports: {} },
    require(name) {
      if (name === "react") return react;
      if (name === "@tensorflow/tfjs") return { ready: async () => {}, getBackend: () => "test" };
      if (name === "@tensorflow-models/blazeface") return { load: async () => ({ estimateFaces: async () => predictions }) };
      throw new Error(`Unexpected import: ${name}`);
    },
    URLSearchParams,
    window: { location: { search: "" } },
    performance: { now: () => now },
    Date: { now: () => now },
    setInterval(callback) { interval = callback; return 1; },
    clearInterval() { interval = undefined; },
  });
  vm.runInContext(transformSync(source, { loader: "ts", format: "cjs" }).code, runtime);
  function render() {
    let passes = 0;
    do {
      assert.ok(passes++ < 10, "hook render must settle");
      cursor = 0;
      dirty = false;
      effects = [];
      result = runtime.module.exports.useFaceFraming(video, cameraEnabled, enhancement);
      effects.forEach(effect => effect());
    } while (dirty);
  }
  render();
  await new Promise(resolve => setImmediate(resolve));
  render();
  return {
    get result() { return result; },
    async tick(nextPredictions, time) {
      predictions = nextPredictions;
      now = time;
      interval?.();
      await new Promise(resolve => setImmediate(resolve));
      render();
      return result;
    },
    setEnhancement(value) { enhancement = value; render(); },
    setCamera(value) { cameraEnabled = value; render(); },
  };
}

const fullDetection = [{ topLeft: fullBounds.slice(0, 2), bottomRight: fullBounds.slice(2), landmarks: fullLandmarks, probability: [0.99] }];

test("hook readjusts a full source face outside the previous crop without guidance", async () => {
  const hook = await createHookHarness();
  await hook.tick(fullDetection, 0);
  const previousTransform = hook.result.correctiveTransform;
  const shiftedDetection = [{
    topLeft: [800, 210], bottomRight: [970, 430],
    landmarks: fullLandmarks.map(([horizontal, vertical]) => [horizontal + 500, vertical]), probability: [0.99],
  }];
  for (const time of [250, 500, 750, 1000, 1250, 1500, 1750]) {
    await hook.tick(shiftedDetection, time);
    assert.equal(hook.result.showPartialFaceCue, false);
    assert.equal(hook.result.isFramingPaused, false);
  }
  const candidate = calculateFramingCandidate(800, 210, 970, 430, 1280, 720, 358, 385);
  assert.equal(candidate.reason, undefined);
  assert.notEqual(hook.result.correctiveTransform, previousTransform);
  assert.equal(hook.result.correctiveTransform, context.candidateToTransform(candidate));
  assert.equal(hook.result.correctiveObjectPosition, context.candidateToObjectPosition(candidate));
  assert.equal(hook.result.isCorrecting, true);
});

test("hook restores unadjusted view before guidance for partial or missing source faces", async () => {
  const partialDetection = [{ topLeft: leftBounds.slice(0, 2), bottomRight: leftBounds.slice(2), landmarks: leftLandmarks, probability: [0.99] }];
  for (const absentDetection of [partialDetection, []]) {
    const hook = await createHookHarness();
    await hook.tick(fullDetection, 0);
    assert.equal(hook.result.isCorrecting, true);
    await hook.tick(absentDetection, 250);
    assert.equal(hook.result.correctiveTransform, undefined);
    assert.equal(hook.result.correctiveObjectPosition, "50% 50%");
    assert.equal(hook.result.isCorrecting, false);
    assert.equal(hook.result.isFramingPaused, true);
    assert.equal(hook.result.showPartialFaceCue, false);
    for (const time of [500, 750, 1000, 1250]) await hook.tick(absentDetection, time);
    assert.equal(hook.result.showPartialFaceCue, true);
    assert.equal(hook.result.correctiveTransform, undefined);
    for (const time of [1500, 1750, 2000, 2250]) await hook.tick(fullDetection, time);
    assert.equal(hook.result.showPartialFaceCue, false);
    assert.equal(hook.result.isCorrecting, true);
  }
});

test("hook preserves cue when a framed user leaves and toggles enhancement", async () => {
  const hook = await createHookHarness();
  await hook.tick(fullDetection, 0);
  assert.equal(hook.result.isCorrecting, true);
  for (const time of [250, 500, 750, 1000, 1250]) await hook.tick([], time);
  assert.equal(hook.result.showPartialFaceCue, true);
  const heldTransform = hook.result.correctiveTransform;
  await hook.tick([], 20000);
  assert.equal(hook.result.correctiveTransform, heldTransform);
  assert.equal(hook.result.showPartialFaceCue, true);
  hook.setEnhancement(false);
  assert.equal(hook.result.showPartialFaceCue, true);
  assert.equal(hook.result.correctiveTransform, undefined);
  await hook.tick([], 20250);
  hook.setEnhancement(true);
  await hook.tick([], 20500);
  assert.equal(hook.result.showPartialFaceCue, true);
  assert.equal(hook.result.isCorrecting, false);
  for (const time of [20750, 21000, 21250, 21500]) await hook.tick(fullDetection, time);
  assert.equal(hook.result.showPartialFaceCue, false);
  assert.equal(hook.result.isCorrecting, true);
});

test("hook monitors absence and recovery with enhancement off without adjusting video", async () => {
  const hook = await createHookHarness(false);
  for (const time of [0, 250, 500, 750, 1000]) await hook.tick([], time);
  assert.equal(hook.result.showPartialFaceCue, true);
  assert.equal(hook.result.correctiveTransform, undefined);
  for (const time of [1250, 1500, 1750, 2000]) await hook.tick(fullDetection, time);
  assert.equal(hook.result.showPartialFaceCue, false);
  assert.equal(hook.result.correctiveTransform, undefined);
  assert.equal(hook.result.isCorrecting, false);
});

test("camera off clears the cue and starts fresh on re-entry", async () => {
  const hook = await createHookHarness(false);
  for (const time of [0, 250, 500, 750, 1000]) await hook.tick([], time);
  assert.equal(hook.result.showPartialFaceCue, true);
  hook.setCamera(false);
  assert.equal(hook.result.showPartialFaceCue, false);
  assert.equal(hook.result.isFramingPaused, false);
  hook.setCamera(true);
  await hook.tick(fullDetection, 1250);
  assert.equal(hook.result.showPartialFaceCue, false);
});