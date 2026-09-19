import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./PreJoinPage.tsx", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const effect = source.match(/useEffect\(\(\) => \{\n    if \(!enhanceIntroPending[\s\S]*?\}, \[enhanceIntroPending, hasLiveStream\]\);/)?.[0];
assert.ok(effect, "Intro effect must be present");

function createIntro({ live = true, pending = true, reduced = false } = {}) {
  let timer;
  let cleanup;
  const updates = [];
  const animation = { onfinish: null, cancel() { this.cancelled = true; } };
  const durations = [];
  vm.runInNewContext(effect, {
    enhanceIntroPending: pending, hasLiveStream: live,
    useEffect: callback => { cleanup = callback(); },
    setTimeout: callback => { timer = callback; return 1; },
    clearTimeout: () => { timer = undefined; },
    setAutoEnhanceOn: value => updates.push(["enabled", value]),
    setEnhanceIntroPending: value => updates.push(["pending", value]),
    markEnhanceIntroSeen: () => updates.push(["seen"]),
    matchMedia: () => ({ matches: reduced }),
    getComputedStyle: () => ({ getPropertyValue: () => "#5b5fc7" }),
    enhanceButtonRef: { current: { animate: (_frames, options) => { durations.push(options.duration); return animation; } } },
    enhanceIntroAnimationRef: { current: null },
  });
  return { updates, durations, animation, start: () => timer?.(), cleanup: () => cleanup?.() };
}

test("enhancement and seen marker wait until the five-second animation finishes", () => {
  const intro = createIntro();
  intro.start();
  assert.deepEqual(intro.durations, [5000]);
  assert.deepEqual(intro.updates, []);
  intro.animation.onfinish();
  assert.deepEqual(intro.updates, [["enabled", true], ["pending", false], ["seen"]]);
});

test("camera permission and first-entry gates prevent the intro", () => {
  for (const options of [{ live: false }, { pending: false }]) {
    const intro = createIntro(options);
    intro.start();
    assert.deepEqual(intro.updates, []);
    assert.deepEqual(intro.durations, []);
  }
});

test("interruption cancels animation and prevents even a queued finish from enabling enhancement", () => {
  const intro = createIntro();
  intro.start();
  const queuedFinish = intro.animation.onfinish;
  intro.cleanup();
  queuedFinish();
  assert.equal(intro.animation.cancelled, true);
  assert.equal(intro.animation.onfinish, null);
  assert.deepEqual(intro.updates, []);
});

test("cleanup before the settling delay prevents starting", () => {
  const intro = createIntro();
  intro.cleanup();
  intro.start();
  assert.deepEqual(intro.durations, []);
  assert.deepEqual(intro.updates, []);
});

test("reduced motion skips animation and completes the intro", () => {
  const intro = createIntro({ reduced: true });
  intro.start();
  assert.deepEqual(intro.durations, []);
  assert.deepEqual(intro.updates, [["enabled", true], ["pending", false], ["seen"]]);
});