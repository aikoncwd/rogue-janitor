# Title Screen & Playback — Phase 1 (Core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game a classic animated ASCII title screen, a "how your job works" screen, a security-camera playback banner with dynamic pacing during the hero invasion, and three new tunes — with mess that is identical whether the invasion is watched or skipped.

**Architecture:** Plain browser scripts on globals (no build). A new `Title` module (`script/title.js`) owns the title phase and its animation timer; `Game.phase` gains `'title'` and `'howto'` ahead of `'intro'`. Presentation randomness moves to `Flavor.rng`, a generator separate from `ROT.RNG`. `Invasion` replaces its eventful/boring delay with per-turn "beats" and draws the playback banner.

**Tech Stack:** Vanilla JS, rot.js 2.0.3 (CDN; vendored copy in `tests/vendor/rot.js`), Web Audio chiptune engine (`script/music.js`), `node --test` with the vm harness in `tests/harness.js`.

**Spec:** `docs/superpowers/specs/2026-11-01-title-screen-and-cozy-humor-design.md` (this plan covers "Delivery → phase 1 Core": presentation RNG, §1 title, §2 how-it-works, §3 banner, dynamic pacing in §6, §4 music).

## Global Constraints

- No build step, bundler or npm; plain scripts + rot.js from CDN, openable from `index.html`.
- All in-game text in **English**.
- No new glyphs or tiles.
- Every new screen is dismissed with any key; how-to appears on day 1 only; invasion stays skippable with `Esc`.
- Global keys (zoom `+`/`-`/`0`, `T` music, `V` sound) keep working on every screen and never advance a screen.
- World-changing randomness uses `ROT.RNG`; all presentation randomness (lines, banner, title animation, pacing) uses `Flavor.rng`. Pacing is presentation only.
- Any new file under `script/` is added to **both** `index.html` and `DEFAULT_FILES` in `tests/harness.js`, same order (enforced by `tests/index-html.test.js`).
- Original tunes only; same step notation as `script/music.js`.
- Run all tests with `node --test tests/` (163 passing at plan time).

## Review Focus

1. **Esc / Space on the title, how-to or story screens** — they must just advance one screen, never call `Invasion.skip()` or toggle fast mode before the invasion exists. (Task 2 test `esc and space on pre-invasion screens just advance`.)
2. **Zoom keys on the title** (`+`, `-`, `0`) — redraw, stay on the title. Narrow windows (< 70 cols) get a compact logo, no line wider than the screen. (Task 2 tests `zoom keys do not advance the title`, `narrow screen title fits`.)
3. **Stray timers** — the title animation timer must stop when the title is left; existing tests count `ctx.__timers`. (Task 2 test `title timer stops when leaving the title`.)
4. **Nag throttling** — movement/action keys during the invasion nag at most once per 5 s; Space, Esc, V, T, zoom never nag. (Task 3 test `nag is throttled and ignores control keys`.)
5. **Holds under fast mode and skip** — fast mode divides every hold by `FAST_FACTOR`; skipping schedules no timers at all. (Task 4 tests `fast mode divides holds`, `skipping schedules no hero timers`.)

---

### Task 1: Presentation RNG — same mess whether watched or skipped

**Files:**
- Modify: `script/flavor.js` (add `rng`, `chance`, use `rng` in `line`)
- Modify: `script/invasion.js:142` (the `turn` event's `heroCry` roll)
- Test: `tests/determinism.test.js` (new)

**Interfaces:**
- Produces: `Flavor.rng` — a ROT.RNG-compatible generator (`getUniform()`, `getItem(arr)`, `getUniformInt(a,b)`), created once at load with `ROT.RNG.clone()`; `Flavor.chance(p: number) -> boolean` using `Flavor.rng`. Every later task uses these for presentation randomness.

- [ ] **Step 1: Write the failing test** `tests/determinism.test.js`

Helpers in the file:
- `fingerprint(ctx)`: sorted array of `` `${key}:${tile.mess.name}:${tile.mess.char}` `` for every map tile with a mess, plus `JSON.stringify` of `Invasion.stats` minus `bloodPuddles`.
- `watched(seed)`: `bootHeadless({seed})`, `Game.generateDungeon()`, `Game.phase='invasion'`, `Invasion.instant=true`, `Game.engine.start()`.
- `skippedFromStart(seed)`: same but set `Invasion.skipping = true` before `engine.start()`, then `Invasion.clockIn()` if `Invasion.stage != null`.
- `skippedMidway(seed, n)`: boot with `begin:true`, press keys until `Game.phase=='invasion'` (Task 2 adds screens; write a `toInvasion(ctx)` helper that presses Enter while `phase != 'invasion'`, max 5 presses), `__runTimers()` n times, press Esc (27), then press Enter while `phase != 'cleaning'`.

Tests:
```js
test('mess is identical watched, skipped from start and skipped midway', () => {
    for (const seed of [1, 7, 42]) {
        const a = fingerprint(watched(seed));
        assert.deepEqual(fingerprint(skippedFromStart(seed)), a, 'skip from start, seed ' + seed);
        for (const n of [3, 25]) assert.deepEqual(fingerprint(skippedMidway(seed, n)), a, 'skip at ' + n + ', seed ' + seed);
    }
});
test('Flavor.line does not consume ROT.RNG', () => {
    const ctx = bootHeadless({ files: ['script/flavor.js'], game: false });
    const before = ctx.ROT.RNG.getState();
    for (let i = 0; i < 20; i++) ctx.Flavor.line('heroHit', { hero: 'H', monster: 'M' });
    assert.deepEqual(ctx.ROT.RNG.getState(), before);
});
```
Note: `skippedMidway` boots with `begin:true` (dungeon generated in `begin`), the others call `generateDungeon()` directly; both consume the RNG identically from the seed — if the fingerprints differ only because of this, align `watched`/`skippedFromStart` to also boot with `begin:true` and enter the invasion via `Invasion.start()`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/determinism.test.js`
Expected: FAIL on both tests (watched run consumes `ROT.RNG` in `Flavor.line`).

- [ ] **Step 3: Implement**

In `script/flavor.js`: `rng: ROT.RNG.clone()` (property initialised at load), `chance(p)`, and `line()` uses `this.rng.getItem`. `heroName()` stays on `ROT.RNG` (called in both modes). In `script/invasion.js` `turn` event, replace `ROT.RNG.getUniform() < 0.04` with `Flavor.chance(0.04)`. Leave other `ROT.RNG` rolls in `Invasion.event` as they are (they run in every mode).

- [ ] **Step 4: Run all tests**

Run: `node --test tests/`
Expected: all pass (existing flavor tests still pass; seed-dependent assertions, if any, are updated to the new outcomes without weakening them).

- [ ] **Step 5: Commit**

```bash
git add script/flavor.js script/invasion.js tests/determinism.test.js
git commit -m "fix: presentation RNG so skipping the invasion never changes the mess"
```

---

### Task 2: Title screen and how-it-works screen

**Files:**
- Create: `script/title.js`
- Modify: `script/game.js` (`begin`, `onKey`, `drawMap`)
- Modify: `script/flavor.js` (pools `titleTaglines`, `howtoText`)
- Modify: `index.html`, `tests/harness.js` (`DEFAULT_FILES`: `script/title.js` right after `script/scenes.js`)
- Modify: `tests/phases.test.js` (day-1 helpers go through title/howto)
- Test: `tests/title.test.js` (new)

**Interfaces:**
- Consumes: `Flavor.rng`, `Flavor.line`.
- Produces:
  - `Game.phase` values `'title' | 'howto' | 'intro' | 'invasion' | 'cleaning'`; `Game.begin()` sets `'title'` and calls `Title.start()`.
  - `Title.start()`, `Title.stop()`, `Title.timer` (null when stopped), `Title.TICK_MS = 250`, `Title.frame` (int, +1 per tick), `Title.quitJoke` (bool).
  - `Title.lines(cols) -> string[]` (rot.js `%c{}` colour codes allowed), drawn centred on the **whole** screen (no panel/log) by `Title.draw()`.
  - `Title.handleKey(e) -> boolean`: on title: `q` (keyCode 81) sets `quitJoke = true` and redraws; any other key → `Title.stop()`, `Game.phase = 'howto'`, `Game.drawMap()`. Returns true when handled.
  - `Game.onKey`: after the global-key block, `title` → `Title.handleKey(e)`; `howto` → `phase = 'intro'`, `drawMap()`; `intro`/`invasion` → existing `Invasion.handleKey`.
  - `Game.drawMap`: `title` → `Title.draw(); return;` and `howto` → `drawCentered(Flavor.pools.howtoText); return;` (both before the existing `intro` branch).

Title content (exact copy; logo is ours):
```
 ____                          _             _ _
|  _ \ ___   __ _ _   _  ___  | | __ _ _ __ (_) |_ ___  _ __
| |_) / _ \ / _` | | | |/ _ \ | |/ _` | '_ \| | __/ _ \| '__|
|  _ < (_) | (_| | |_| |  __/ | | (_| | | | | | || (_) | |
|_| \_\___/ \__, |\__,_|\___|_| |\__,_|_| |_|_|\__\___/|_|
            |___/            |__/
```
- Logo amber `#fb3`; when `cols < 70` use the single line `R O G U E   J A N I T O R` instead.
- Vignette: a 40×4 box (`#` border, `#555`), inner row 1 holds messes `!` `%` `,` `~` at fixed columns; the janitor `@` (`#ff0`) walks ping-pong across inner columns 1..36, one column per frame, with the broom `'-\\|/'[frame % 4]` (`#a62`) right after it; a mess character the janitor stands on is not drawn (it "cleans" it, and it reappears when the janitor walks away — it's a loop). Two torches `*` at the box corners flicker: colour picked each frame with `Flavor.rng.getItem(['#f80','#fa0','#fc4'])`.
- Below: `Rogue Janitor 3.6.0-mop` (`#777`) and the tagline (`#ccc`) from `titleTaglines`, changed every 12 frames via `Flavor.line('titleTaglines')`.
- Prompt: `Shall I pick a mop for you? [ynaq]` (`#fff`), then `(any key clocks you in)` (`#777`). When `quitJoke`: an extra line `You can't quit before your shift. Union rules.` (`#f88`).
- Last line: `Original game by Lauren H · rot.js` (`#555`).

`titleTaglines` (≥ 8): "Mop the dungeon. Retrieve the Amulet of Clean-dor.", "Procedurally generated mess. Hand-crafted mopping.", "The RNG made this mess. You get to clean it.", "Permadeath? No. Perma-mess.", "Now with 100% fake blood.", "Rodney says hi. Rodney has the Amulet. Again.", "You hear the footsteps of a janitor on patrol.", "Every YASD starts with 'I'll just...'".

`howtoText` (exact copy, ≤ 16 lines):
```
%c{#ff0}HOW YOUR JOB WORKS%c{}

%c{#0ff}1. TONIGHT%c{}   A hero raids the dungeon. You are %c{#f80}NOT%c{} playing:
             you are watching last night's security footage.
             %c{#ff0}[Space]%c{} fast-forward   %c{#ff0}[Esc]%c{} skip to the morning

%c{#0ff}2. MORNING%c{}   The mess is yours. Mop, pick up, fix.

%c{#0ff}3. BREAKS%c{}    Your colleagues relax in the staff lounge.
             Chat with them. They are lovely.

             Press %c{#ff0}[?]%c{} any time for the full controls.

%c{#777}Press any key.%c{}
```

- [ ] **Step 1: Write the failing tests** `tests/title.test.js` (boot with `bootHeadless({ begin: true })`; `text(ctx)` joins drawn `.text`)

```js
test('day 1 boots into the title', () => {
    // phase 'title'; text includes 'Shall I pick a mop for you?' and '3.6.0-mop'; Title.timer != null
});
test('title -> howto -> intro -> invasion, one key each', () => {
    // Enter: 'howto', text includes 'NOT' and 'security footage'; Enter: 'intro' ('A HERO approaches'); Enter: 'invasion', adventurer.turns == 0
});
test('q on the title tells the union joke and stays', () => {
    // press 81: phase 'title', text includes 'Union rules'; then Enter -> 'howto'
});
test('title animates on its timer', () => {
    // frame f; __runTimers(); Title.frame == f + 1; a new title timer is queued
});
test('title timer stops when leaving the title', () => {
    // Enter; Title.timer == null; no queued timer with ms == Title.TICK_MS
});
test('zoom keys do not advance the title', () => {
    // __press(107, 0, '+'), __press(109, 0, '-'), __press(48, 0, '0'): still 'title'
});
test('V and T do not advance the title', () => {
    // __press(86), __press(84): still 'title'
});
test('esc and space on pre-invasion screens just advance', () => {
    // Esc: 'howto'; Space: 'intro'; Esc: 'invasion' with Invasion.skipping false and Invasion.fast false
});
test('narrow screen title fits', () => {
    // Game.screenSize = [50, 30]; every Title.lines(50) line, colour codes stripped, has length <= 50; contains 'R O G U E'
});
test('day 2 has no title or howto', () => {
    // instant day 1 through to cleaning, Game.nextDay(): phase 'invasion'
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/title.test.js`
Expected: FAIL (`Title` is not defined / phase is 'intro').

- [ ] **Step 3: Implement** `script/title.js`, the `Game` changes and the two pools; add the script to `index.html` and `DEFAULT_FILES`.

- [ ] **Step 4: Update `tests/phases.test.js`**

`bootDay1()` presses Enter twice after boot so existing tests start on the intro as before; rename `day 1 boots into intro and waits` to check the title (no hero turn, only the title timer queued) and add an intro check after two presses. Same for any other test file that boots with `begin: true` and expects `'intro'` (grep `begin: true`).

- [ ] **Step 5: Run all tests**

Run: `node --test tests/`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add script/title.js script/game.js script/flavor.js index.html tests/
git commit -m "feat: animated ASCII title screen and how-your-job-works screen"
```

---

### Task 3: Playback banner and "it's a recording" nag

**Files:**
- Modify: `script/invasion.js` (clock, camera, banner text, nag)
- Modify: `script/game.js` `drawMap` (draw the banner on map row 0 during the invasion)
- Modify: `script/flavor.js` (pool `playbackNag`)
- Test: `tests/banner.test.js` (new)

**Interfaces:**
- Consumes: `Flavor.rng`, `Flavor.line`, `Invasion.now()`, `Invasion.turn`.
- Produces:
  - `Invasion.clockMinutes` (int; set in `reset()` to `60 + Flavor.rng.getUniformInt(0, 90)`, +1 on every `turn` event), `Invasion.camera` (int 1..9, set in `reset()` from `Flavor.rng`).
  - `Invasion.clockText() -> string` like `'02:47 AM'` (minutes wrap at 24h; `12:xx AM` after midnight form).
  - `Invasion.bannerText(width: number) -> string` (rot.js colour codes). Full form:
    `[ ● REC  ▶ PLAYBACK · CAM 3 (floating eye) · 02:47 AM ]  just watch - no input needed`;
    `▶` becomes `▶▶ x4` when `fast`; `●` is `#f00` when `turn % 4 < 2`, else `#400`. If the plain full form is longer than `width - 2`, drop the trailing hint; if still too long, use `● REC ▶ 02:47 AM`.
  - `Invasion.nag()`: if `now() - lastNag >= NAG_MS (5000)`, push `Flavor.line('playbackNag')` to `Game.log`, set `lastNag`, redraw.
  - `Invasion.handleKey`: during the running invasion (`stage == null`, no conversation), keys that are not Space/Esc call `nag()` when they are arrows (37–40), numpad (97–105), or letters `h j k l y u b n m p g f r o c x` (keyCodes). Global keys never reach here (handled earlier in `Game.onKey`).
- Banner drawn in `Game.drawMap` only when `phase == 'invasion' && Invasion.stage == null && !Invasion.skipping`, centred on map row 0, after the curtain, before `drawChrome()`.

`playbackNag` (≥ 4): "You can't do anything. It's a recording.", "You shout at the screen. The hero does not hear you.", "This already happened. Space to fast-forward, Esc to skip.", "You reach for the mop. Patience, it's still last night."

- [ ] **Step 1: Write the failing tests** `tests/banner.test.js` (day-1 boot, press Enter until `invasion`)

```js
test('banner shows REC, PLAYBACK and the clock', () => {
    // drawn text includes 'PLAYBACK' and Invasion.clockText(); clockText matches /^\d\d:\d\d AM$/
});
test('clock advances one minute per hero turn', () => {
    // m = clockMinutes; __runTimers(); clockMinutes == m + 1
});
test('fast mode shows x4', () => { /* Space; bannerText(100) includes '▶▶ x4' */ });
test('banner shortens on narrow maps', () => {
    // bannerText(30) plain length <= 28 and includes 'REC'
});
test('no banner while skipping or during the hand-over', () => {
    // Esc -> stage 'linger'; drawMap(); no drawn text includes 'PLAYBACK'
});
test('nag is throttled and ignores control keys', () => {
    // stub Invasion.now to return t; LEFT -> log has one playbackNag line; LEFT again -> still one;
    // t += 5000; 'm' (77) -> two lines; V(86), T(84), '+'(107) add none; Space/Esc behave as before
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test tests/banner.test.js`
Expected: FAIL.

- [ ] **Step 3: Implement** as in Interfaces.

- [ ] **Step 4: Run all tests** — `node --test tests/` — all pass (existing `movement keys ignored during invasion` still passes: the nag never moves the player).

- [ ] **Step 5: Commit**

```bash
git add script/invasion.js script/game.js script/flavor.js tests/banner.test.js
git commit -m "feat: security-camera playback banner and recording nag"
```

---

### Task 4: Dynamic pacing (beats and holds)

**Files:**
- Modify: `script/invasion.js` (replace `eventful`/`delay(eventful)` with beats)
- Modify: `script/game.js` `drawMap` (speech marker)
- Modify: `tests/phases.test.js` (`turn delay` test uses the new API)
- Test: `tests/pacing.test.js` (new)

**Interfaces:**
- Consumes: `Invasion.event` types already emitted (`enter, hit, faint, loot, door, snack, potion, special, graffiti, heroHurt, turn`), `Game.adventurer.targets`.
- Produces:
  - `Invasion.BEATS = { quiet: 50, spot: 400, hit: 200, combo: 150, faint: 700, loot: 450, door: 350, heroHurt: 250, snack: 900, potion: 1100, special: 1100, graffiti: 1100, enter: 1200, cry: 900 }` (ms).
  - `Invasion.hold` (ms, max of the beats this turn), `Invasion.combo` (consecutive hero turns with a `hit`), `Invasion.speaking` (bool, true when the turn has a speech beat: `snack, potion, special, graffiti, enter, cry`).
  - `Invasion.beat(name: string, line?: string)`: `hold = max(hold, BEATS[name] + (line ? min(500, plainLength(line) * 10) : 0))`; speech names set `speaking`.
  - `Invasion.say(pool, vars, optional)` now returns the logged line (or `''`); each event calls `beat(type, line)`; the `heroCry` roll in `turn` calls `beat('cry', line)` when it logs.
  - A turn whose `targets.length` grew since the previous hero turn gets `beat('spot')`. A `hit` when `combo >= 2` uses `BEATS.combo` instead of `BEATS.hit`.
  - `Invasion.turnDelay() -> number`: `hold || BEATS.quiet`, divided by `FAST_FACTOR` when `fast`.
  - `afterHeroTurn()` computes `turnDelay()`, then resets `hold = 0` and `speaking = false` **after** scheduling, so monster-turn events (e.g. `heroHurt` from `entity.js`) count toward the next hero turn. Remove `BASE_DELAY_MS`, `BORING_DELAY_MS`, `eventful`, `delay()`.
  - Speech marker: while `Invasion.speaking` during a paced turn, `drawMap` draws a static `!` (`#ff0`) on the tile above the hero if it's visible and empty (decision: a static marker, not a blink, so there is still exactly one timer per hero turn).
- No `ROT.RNG` use anywhere in pacing (Task 1's determinism test must keep passing).

- [ ] **Step 1: Write the failing tests** `tests/pacing.test.js` (day-1 boot into the invasion; call `Invasion.event(...)` directly, then read `turnDelay()`)

```js
test('quiet turns are fast', () => { /* fresh hold: turnDelay() == BEATS.quiet */ });
test('a potion holds long enough to read', () => {
    // event('potion'): turnDelay() >= BEATS.potion and speaking == true
});
test('holds take the longest beat of the turn', () => {
    // event('door'); event('potion'): turnDelay() >= BEATS.potion
});
test('fast mode divides holds', () => {
    // event('potion'); d = turnDelay(); Space; turnDelay() == d / FAST_FACTOR
});
test('hold resets after the hero turn is scheduled', () => {
    // event('potion'); afterHeroTurn(); queued timer ms >= BEATS.potion; hold == 0; speaking == false
});
test('skipping schedules no hero timers', () => {
    // Esc; no queued timer whose ms is one of the BEATS values (hand-over TICK_MS timers are fine)
});
```

- [ ] **Step 2: Run to verify they fail** — `node --test tests/pacing.test.js` — FAIL (`turnDelay` undefined).

- [ ] **Step 3: Implement** as in Interfaces; update `tests/phases.test.js` `turn delay` test to assert on `turnDelay()` with and without Space instead of `delay(true/false)`.

- [ ] **Step 4: Run all tests** — `node --test tests/` — all pass, including `tests/determinism.test.js`.

- [ ] **Step 5: Commit**

```bash
git add script/invasion.js script/game.js tests/pacing.test.js tests/phases.test.js
git commit -m "feat: invasion replay with rhythm: quick corridors, holds on the good bits"
```

---

### Task 5: Music — title theme, second invasion tune, second cleaning tune

**Files:**
- Modify: `script/music.js` (`tracks.title`, `tracks.invasion2`, `tracks.cleaning2`)
- Modify: `script/game.js` `musicTrack()`
- Modify: `tests/music.test.js` (track list test)
- Test: `tests/music-tracks.test.js` (new, for `musicTrack()` selection)

**Interfaces:**
- Consumes: `Game.phase`, `Game.day`, `Invasion.stage`, `Game.onBlackScreen()`.
- Produces: `Game.musicTrack() -> string`:
  - `title`, `howto`, `intro` → `'title'`;
  - invasion with `stage` `'card'`/`'curtain'` → `'night'` (unchanged); otherwise `Game.day % 2 == 0 ? 'invasion2' : 'invasion'`;
  - cleaning on a black screen → `'night'`; otherwise `Game.day % 2 == 0 ? 'cleaning2' : 'cleaning'`.

Track briefs (original melodies, implementer composes; voices use waves the engine already supports: `square`, `triangle`, `sine`, `noise`):
- `title`: calm, warm, slightly nostalgic. ~84 bpm, D major, 16 bars, `sine`/`triangle` lead with soft attack, `triangle` bass, a quiet `triangle` arpeggio. No percussion.
- `invasion2`: upbeat "adventure chase". ~156 bpm, A minor turning to C major in the second half, 16 bars, `square` lead, `square` low-volume arpeggio, `triangle` bass with octave jumps, `noise` hat + accented downbeats.
- `cleaning2`: same calm, mop-friendly mood as `cleaning` but its own melody, ~88 bpm, G major, 24 bars, `triangle` lead, `triangle` bass, soft `noise` brush hat.

- [ ] **Step 1: Write the failing tests**

In `tests/music.test.js`, extend `all three tracks exist...` (rename to `all tracks exist, parse and loop at least 8 bars`) to loop over `['invasion','invasion2','cleaning','cleaning2','night','title']`, keeping the existing per-voice whole-bar/length checks, plus:
```js
assert.ok(T.invasion2.bpm > T.invasion.bpm);
assert.ok(T.cleaning2.bpm < T.invasion.bpm && T.title.bpm < T.invasion.bpm);
assert.ok(T.title.bpm > T.night.bpm);
assert.ok(secs('cleaning2') > secs('invasion2'));
```
`tests/music-tracks.test.js`: boot day 1 (`begin: true`): `musicTrack()` is `'title'` on title, howto and intro; day 1 invasion → `'invasion'`; set `Game.day = 2` during the invasion → `'invasion2'`; cleaning day 1 → `'cleaning'`, day 2 → `'cleaning2'`.

- [ ] **Step 2: Run to verify they fail** — `node --test tests/music.test.js tests/music-tracks.test.js` — FAIL.

- [ ] **Step 3: Implement** the three tracks and `musicTrack()`.

- [ ] **Step 4: Run all tests** — `node --test tests/` — all pass.

- [ ] **Step 5: Commit**

```bash
git add script/music.js script/game.js tests/music.test.js tests/music-tracks.test.js
git commit -m "feat: title theme and second invasion and cleaning tunes, rotating by day"
```

---

### Task 6: README and browser check

**Files:**
- Modify: `README.md` (features list)

- [ ] **Step 1: Update `README.md`** features: animated ASCII title screen; "how your job works" screen; the invasion is last night's security-camera footage with a live banner; the replay has rhythm (fast corridors, holds on potions, speeches and faints); three new tunes (title theme, a second invasion march and a second cleaning tune that rotate by day).

- [ ] **Step 2: Browser check** (Chrome with the Claude extension): open `index.html` (served with `python -m http.server` or `npx`-free equivalent such as `uv run python -m http.server` from the repo root). Verify: title animates (janitor walks, broom spins, torches flicker, tagline changes); `q` shows the union joke; Enter → how-to → story → invasion; banner blinks, clock ticks, `▶▶ x4` with Space; holds on potions/faints read well; zoom `+`/`-` on the title; music changes title → invasion. Take screenshots/GIF to show the user.

- [ ] **Step 3: Run all tests** — `node --test tests/` — all pass.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: README features for the title screen, playback banner and new tunes"
```
