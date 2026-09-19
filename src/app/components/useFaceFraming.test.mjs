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

test("lost face hides stale advice without resuming automatic movement", () => {
  let state = confirmedPartial();
  state = advance(state, "unknown", 1250);
  assert.equal(state.showCue, true);
  state = advance(state, "unknown", 3000);
  assert.equal(state.showCue, false);
  assert.equal(state.paused, true);
  state = advance(state, "partial", 3250);
  assert.equal(state.showCue, false);
});

test("no face or low confidence alone never creates a cue or a pause", () => {
  let state = initial();
  for (const time of [0, 250, 500, 1000, 3000]) state = advance(state, "unknown", time);
  assert.equal(state.paused, false);
  assert.equal(state.showCue, false);
});