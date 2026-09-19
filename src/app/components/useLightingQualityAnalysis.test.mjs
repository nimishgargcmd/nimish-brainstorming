import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { transformSync } from "esbuild";

const source = readFileSync(new URL("./useLightingQualityAnalysis.ts", import.meta.url), "utf8");
const helpers = source.slice(source.indexOf("const ANALYSIS_INTERVAL_MS"), source.indexOf("export interface LightingQualityResult"));
const context = vm.createContext({});
vm.runInContext(transformSync(helpers, { loader: "ts" }).code, context);
const { measureQuality, cleaningEvidence, initialCleaningState, advanceCleaning } = context;

function frame(pixel) {
  const data = new Uint8ClampedArray(160 * 120 * 4);
  for (let vertical = 0; vertical < 120; vertical++) {
    for (let horizontal = 0; horizontal < 160; horizontal++) {
      const index = (vertical * 160 + horizontal) * 4;
      const value = pixel(horizontal, vertical);
      data.set([value, value, value, 255], index);
    }
  }
  return data;
}

const softFrame = frame(horizontal => 128 + 40 * Math.sin(horizontal / 20));
const sharpFrame = frame((horizontal, vertical) => (horizontal + vertical) % 2 ? 180 : 70);
const measure = (data, previous = null) => measureQuality(data, 160, 120, previous);
const stable = data => measure(data, measure(data).gray);

function confirmedBlur() {
  let state = initialCleaningState();
  for (let now = 0; now <= 6000; now += 400) state = advanceCleaning(state, "blur", now);
  return state;
}

test("sustained low-detail image is a blur candidate, not a smudge diagnosis", () => {
  assert.equal(cleaningEvidence(stable(softFrame)), "blur");
  assert.equal(cleaningEvidence(stable(sharpFrame)), "clear");
});

test("blank, dark, overexposed, moving, and first samples do not advise cleaning", () => {
  for (const data of [frame(() => 128), frame(horizontal => 30 + 20 * Math.sin(horizontal / 20)), frame(horizontal => 230 + 20 * Math.sin(horizontal / 20))]) {
    assert.equal(cleaningEvidence(stable(data)), "uncertain");
  }
  assert.equal(cleaningEvidence(measure(softFrame)), "uncertain");
  assert.equal(cleaningEvidence(measure(sharpFrame, measure(softFrame).gray)), "uncertain");
  assert.equal(cleaningEvidence({ ...stable(softFrame), sharpness: NaN }), "uncertain");
});

test("cue needs six continuous seconds and two seconds of sharp recovery", () => {
  let state = initialCleaningState();
  for (let now = 0; now < 6000; now += 400) {
    state = advanceCleaning(state, "blur", now);
    assert.equal(state.showCue, false);
  }
  state = advanceCleaning(state, "blur", 6000);
  assert.equal(state.showCue, true);
  for (let now = 6400; now < 8400; now += 400) {
    state = advanceCleaning(state, "clear", now);
    assert.equal(state.showCue, true);
  }
  assert.equal(advanceCleaning(state, "clear", 8400).showCue, false);
});

test("uncertain frames and long gaps invalidate the cleaning cue", () => {
  assert.equal(advanceCleaning(confirmedBlur(), "uncertain", 6400).showCue, false);
  assert.equal(advanceCleaning(confirmedBlur(), "blur", 9000).showCue, false);
  let state = advanceCleaning(initialCleaningState(), "blur", 0);
  state = advanceCleaning(state, "uncertain", 400);
  assert.equal(advanceCleaning(state, "blur", 800).blurSince, 800);
});

test("capture diagnostics compare requested resolution without orientation or identity leakage", () => {
  const constraints = { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: "private" };
  const settings = { width: 640, height: 480, frameRate: 30, deviceId: "private", groupId: "private" };
  const diagnostic = context.captureDiagnostics(constraints, settings, 640, 480);
  assert.equal(diagnostic.belowRequestedResolution, true);
  assert.equal(context.captureDiagnostics(constraints, settings, 720, 1280).belowRequestedResolution, false);
  assert.equal(context.captureDiagnostics({}, settings, 640, 480).belowRequestedResolution, null);
  assert.equal(JSON.stringify(diagnostic).includes("private"), false);
});

function createHookHarness(debug = true) {
  const slots = [];
  let cursor = 0;
  let dirty = false;
  let effects = [];
  let interval;
  let now = 0;
  let pixels = softFrame;
  let failRead = false;
  let enabled = true;
  let enhancement = false;
  let eligible = true;
  let result;
  const track = { enabled: true, muted: false, readyState: "live", getConstraints: () => ({ width: { ideal: 1280 }, height: { ideal: 720 } }), getSettings: () => ({ width: 640, height: 480, frameRate: 30 }) };
  const video = { readyState: 2, videoWidth: 640, videoHeight: 480, currentTime: 0, paused: false, srcObject: { getVideoTracks: () => [track] } };
  const document = {
    visibilityState: "visible",
    createElement: () => ({ getContext: () => ({ drawImage() {}, getImageData() { if (failRead) throw new Error("read failed"); return { data: pixels }; } }) }),
  };
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
    require(name) { assert.equal(name, "react"); return react; },
    URLSearchParams, window: { location: { search: debug ? "?qualityDebug=1" : "" } }, document,
    performance: { now: () => now },
    setInterval(callback) { interval = callback; return 1; },
    clearInterval() { interval = undefined; },
  });
  vm.runInContext(transformSync(source, { loader: "ts", format: "cjs" }).code, runtime);
  function render() {
    let passes = 0;
    do {
      assert.ok(passes++ < 10);
      cursor = 0;
      dirty = false;
      effects = [];
      result = runtime.module.exports.useLightingQualityAnalysis(video, enabled, enhancement, eligible);
      effects.forEach(effect => effect());
    } while (dirty);
  }
  render();
  return {
    video, track, document,
    get result() { return result; },
    tick(data = softFrame, fresh = true) {
      pixels = data;
      now += 400;
      if (fresh) video.currentTime += 0.4;
      interval?.();
      render();
      return result;
    },
    blur() { for (let count = 0; count < 17; count++) this.tick(); },
    setEnhancement(value) { enhancement = value; render(); },
    setEnabled(value) { enabled = value; render(); },
    setEligible(value) { eligible = value; render(); },
    failRead() { failRead = true; },
    dismiss() { result.dismissCleaningCue(); render(); },
  };
}

test("live hook advises with AI off, survives AI toggles, and dismissal lasts for the visit", () => {
  const hook = createHookHarness();
  hook.blur();
  assert.equal(hook.result.showCleaningCue, true);
  assert.equal(hook.result.lightingFilter, undefined);
  assert.equal(hook.result.qualityFilter, undefined);
  assert.equal(hook.result.isCorrecting, false);
  assert.match(hook.result.diagnostic, /"belowRequestedResolution": true/);
  hook.setEnhancement(true);
  assert.equal(hook.result.showCleaningCue, true);
  hook.dismiss();
  assert.equal(hook.result.showCleaningCue, false);
  hook.setEnabled(false);
  hook.setEnabled(true);
  hook.blur();
  assert.equal(hook.result.showCleaningCue, false);
  hook.setEnhancement(false);
  hook.blur();
  assert.equal(hook.result.showCleaningCue, false);
});

test("framing takes priority and recovery starts fresh confirmation", () => {
  const hook = createHookHarness();
  hook.blur();
  hook.setEligible(false);
  assert.equal(hook.result.showCleaningCue, false);
  hook.blur();
  assert.equal(hook.result.showCleaningCue, false);
  hook.setEligible(true);
  hook.tick();
  assert.equal(hook.result.showCleaningCue, false);
  hook.blur();
  assert.equal(hook.result.showCleaningCue, true);
  for (let count = 0; count < 8; count++) hook.tick(sharpFrame);
  assert.equal(hook.result.showCleaningCue, false);
});

test("camera off, stale frames, hidden pages, track replacement, and read failures clear advice", () => {
  for (const invalidate of [
    hook => hook.setEnabled(false),
    hook => hook.tick(softFrame, false),
    hook => { hook.document.visibilityState = "hidden"; hook.tick(); },
    hook => { hook.track.muted = true; hook.tick(); },
    hook => { hook.video.srcObject = { getVideoTracks: () => [{ ...hook.track }] }; hook.tick(); },
    hook => { hook.failRead(); hook.tick(); },
  ]) {
    const hook = createHookHarness();
    hook.blur();
    assert.equal(hook.result.showCleaningCue, true);
    invalidate(hook);
    assert.equal(hook.result.showCleaningCue, false);
  }
});

test("brightness correction remains AI-gated and quality debug is opt-in", () => {
  const hook = createHookHarness(false);
  const dark = frame(() => 30);
  hook.tick(dark);
  assert.equal(hook.result.lightingFilter, undefined);
  hook.setEnhancement(true);
  assert.match(hook.result.lightingFilter, /brightness/);
  assert.equal(hook.result.qualityFilter, undefined);
  assert.equal(hook.result.isCorrecting, true);
  assert.equal(hook.result.showCleaningCue, false);
  assert.equal(hook.result.diagnostic, null);
  hook.setEnhancement(false);
  assert.equal(hook.result.isCorrecting, false);
  assert.equal(hook.result.lightingFilter, undefined);
});