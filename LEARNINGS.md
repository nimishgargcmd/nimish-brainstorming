# Learnings — Mobile Teams Meeting Multitasking IA

## 2026-05-26 — Design principles need a strict clarity template

**Context.** While writing principles for the Meeting dock (`docs/principles/meeting-dock-principles.html`), the user had to ask for clarification four times across the session: O3's abstract third sentence ("treated as mutually exclusive rather than stacked vertically"), V3's "one way to check" that used phrases like "different edge or floats it", Q1 in the decision rubric where "any element that occupies the bottom edge" wrongly captured the keyboard, and finally a full-document clarity revision request.

**Decision.** Restructured every principle to a strict three-part template:
1. **Rule.** One declarative sentence. No hedges ("usually", "tends to"), no abstract paraphrases, no jargon.
2. **Example.** One concrete sentence naming a specific surface or interaction.
3. **Violated if.** An observable signal — something a reader could literally point at in a mockup or interaction, not an instruction to "ask yourself whether…".

Also dropped recurring jargon from the document: "contention", "hunting", "side-of-eye motion", "mutually exclusive", "core layout". Replaced with plain words ("space", "scrolls through", "distract", "either typing or on camera").

**Outcome.** Document now reads consistently. Each principle has one rule, one example, one literal check. Verdict labels in the rubric were also rewritten to drop "contention" jargon.

**Reusable insight.** When writing principles or rules that other people will apply, the trap is layering: rule → abstract paraphrase → "test" that restates the rule. Each layer feels like it adds clarity but actually adds interpretation surface. The fix is the **Rule → Example → Violated if** template, where the third bullet must point at an observable thing (a mockup showing X, an interaction taking N taps), never an instruction to "consider whether…".

**Also worth keeping** (separate lesson, same session):
- When using `mcp__figma__get_screenshot`, the rendered PNGs are aggressively cached at the asset level even after the source Figma file is edited. The `contentsOnly: true` flag busts the cache in some cases. If both flags return identical bytes after a confirmed edit, the source frames may genuinely be visually identical (e.g., linked component instances).

## 2026-06-24 — Framer Motion remount flash: `motion.div` with no `initial` flashes natural height

**Context.** Navigating Chat → DM jittered the white foreground *only when the dock was collapsed*. Earlier guesses (synchronous state seed, entrance-skip on the outer dock) didn't kill it. L0 → L0 (Chat → Activity) was always seamless.
**Decision.** Found the real cause: the dock's **inner** expanded-content `motion.div` had `animate={{ height: collapsed ? 0 : 'auto' }}` but **no `initial` prop**. L0 → L0 keeps the same AppShell mounted (the dock never remounts), but Chat → DM is a sibling route that **remounts** a fresh `MeetingDock`. On that remount Framer painted the tiles at their natural (full) height for one frame, then animated to 0 — which made the outer `height:'auto'` measure tall→short and resized the foreground. Fix: `initial={false}` so a fresh mount paints straight at the target height; expand/collapse interactions after mount still animate.
**Outcome.** Seamless. It was collapsed-only because expanded's natural height already equals the target (no flash), and L0→L0 never remounts.
**Reusable insight.** A `motion.div` animating `height` to/from `0`/`auto` will **flash its natural height on first mount** unless you set `initial={false}` (or an explicit `initial`). Symptom: a layout "jump" that appears only when the component remounts (route change) and only in the collapsed/closed state. The diagnostic tell is "fine within a shared layout, jitters across a route boundary."

## 2026-06-24 — Carrying ephemeral UI state across sibling routes that each own a provider

**Context.** The meeting dock's expanded/collapsed/minimized state had to survive Chat → DM, but those are sibling routes that each mount their **own** `DockUIProvider` + `MeetingDock` (no shared parent provider), so React state can't flow between them.
**Decision.** Bridge via a tiny module-level holder (`dockPersist.ts`: `getLastDockState`/`setLastDockState`, written by the live dock on every state change). The new surface reads it **synchronously during render** and seeds the provider's `useState` initializers (`initialManualState`/`initialSurfaceDefault`) — NOT via `useEffect`, which would let the wrong state paint for one frame. A second module flag (`dockHasEnteredSession`) suppresses the slide-in entrance animation on carry-over so the dock looks continuous, and is reset when the session truly ends (return-to-meeting / end-call).
**Outcome.** The dock renders at the correct state on the very first paint of the new route — no flash, no effect-driven correction.
**Reusable insight.** To carry transient UI state across route boundaries where a shared React provider isn't available, use a module-level holder + **synchronous** `useState` seeding (read in render, not in an effect). Effects run after first paint, so seeding in an effect guarantees a one-frame flash of the default state.

## 2026-06-24 — Extracted avatar PNGs bake in presence dots; use clean persona symbols

**Context.** DM bubble avatars for Ray/Beth/Daisy showed a green presence dot that looked wrong (the app draws its own presence overlay separately). The dot was **baked into** the source PNGs that had been screenshot-extracted from a Figma chat-list frame.
**Decision.** Re-pulled the same personas from the **Fluent Avatars** component library (`get_screenshot` on the named persona symbols, e.g. Ray Tanaka `3596:350`, Beth Davies `3589:202`) — these render the clean face with no status ring — and repointed the imports. Same faces, no baked dot, and it also fixed a latent double-dot in the list (baked dot + overlay).
**Reusable insight.** Avatars screenshot from a composed frame inherit whatever badges/rings that frame drew. For reusable avatar assets, export the **bare persona/component symbol**, not a cell from a list mockup — then the app controls presence/badges itself.

## 2026-06-24 — iOS PWA home-screen tile (apple-touch-icon) gotchas

**Context.** The "Add to Home Screen" preview kept showing a generic black "T" monogram instead of the Teams tile, even after the icon, manifest, and `<link>` tags were all correct and served 200.
**Decision.** Three separate fixes/realisations: (1) the apple-touch-icon must be an **opaque, full-bleed square PNG** — transparent rounded corners get filled black by iOS, which also masks the icon itself; flatten onto a solid background and let iOS apply its own squircle. (2) iOS caches the tile **at add-to-home-screen time** and reads only the links in the *currently loaded* DOM — a stale cached page shows the monogram, so a hard reload / cache-bust query (`?v=N`) is required before re-adding. (3) On a **self-signed dev cert**, iOS's home-screen icon fetcher runs outside the Safari context that accepted the cert, so the icon fetch silently fails even though the app's own sub-resources load — it only resolves over a trusted (deployed) cert.
**Reusable insight.** A correct apple-touch-icon that still won't appear is almost always one of: transparent corners (→ flatten opaque), a cached page (→ cache-bust + re-add), or a self-signed cert blocking the icon fetcher (→ test on the real HTTPS deployment). Also: Figma's `get_screenshot` won't upscale a node beyond its native size — request a node authored at the size you need (e.g. a 180px icon artboard) rather than scaling a 16/48px one.

## 2026-09-19 — Reflowing landscape content (slides/screenshots) to portrait: crop-per-item + caption + sampled color, not theme tokens

**Context.** Building the screenshare Easy Read prototype (`brainstorming/screensharing/notes.md`, `LiquidReflowContentView.tsx`), several rounds of live feedback each caught a different way "reflow" was quietly losing information or legibility: charts/photos combined into one wide image went illegible when scaled to phone width; cropped charts with no label became "headless" (no way to tell which chart was which); the reflow's colors didn't match the source slides because it inherited the app's own dark/light theme tokens; and a slide's color-coded status (done/upcoming) was only in an image, not in the reflowed text.

**Decision.** Converged on a repeatable set of rules for turning a landscape screenshot into a portrait-native read:
1. Reflow genuinely-text content fully (never shrink it to fit width).
2. A real, non-reflowable visual (chart, diagram, photo) must be cropped to **one item per image** and shown one-per-row — never combine multiple items into a single wide strip, which becomes unreadable once scaled to phone width.
3. Every such image needs a **caption** — reuse the exact label already used elsewhere on the slide (chart series name, table row name) rather than showing an unlabeled graphic.
4. Only keep the image if it adds information the reflowed text doesn't already carry — if a status/value is already conveyed via text/color, the image is redundant clutter and should be dropped (this is exactly what happened to a timeline's status-dot image once the equivalent text list started color-coding status itself).
5. Sample the **source's own colors** (title color, chart colors, tone colors) directly from the screenshot pixels (Python/PIL histogram of a cropped region) rather than guessing or reusing the app's theme tokens — a reflowed reading surface should look like the source document, not like the host app's chrome.

**Outcome.** All 5 rules ended up needing an explicit, deliberate **exception to the "always use `--fy27-*` tokens, never raw hex" house rule** — see the `CLAUDE.md` "Screenshare enhancements" bullet. That's intentional: Easy Read is a light "paper" surface meant to match the *source deck*, not the meeting app's own theme, so don't "fix" its raw hex colors back to tokens.

**Reusable insight.** When converting any landscape/desktop-native content to a portrait mobile reflow: text reflows, real graphics get cropped one-item-per-image and captioned, and colors get sampled from the source rather than inherited from the host app's theme. Before adding a "helpful" image, check whether the same information is already elsewhere in reflowed text/color — if so, the image is redundant, not helpful.

