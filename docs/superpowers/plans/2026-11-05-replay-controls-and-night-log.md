# Replay Controls and Night Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the hero replay (the Floating Eye camera footage) video controls (play/pause, step, fast, rewind, skip) and let the janitor read last night's full security log with Tab during the shift.

**Architecture:** The replay stays a live simulation. Pausing holds the ROT engine between hero turns; the very first frame is held by a synchronous thenable returned from `Adventurer.act`. Rewind rebuilds the morning the way Continue does: a `Save.snapshot()` (plus `Flavor.rng` state, log and cutscene) taken at the top of `generateDungeon`, restored, then the dungeon is generated again on a fresh engine, so the same seed replays the same night. `Invasion` keeps a transcript of every line it says (also while skipping); a new `NightLog` window renders it.

**Tech Stack:** plain browser JS globals, rot.js 2.2.1, node:test via `tests/harness.js` (`node --test tests/`).

**Spec (agreed in chat, 2026-11-05):**
- The replay starts **paused on the first frame every day** (also after Continue).
- Replay keys: `Space` play/pause (plays at normal speed), `→` step one hero turn (if playing: just pause), `F` fast x4 toggle (from pause: plays fast), `R` rewind = back to the first frame, paused, by re-running the simulation, `Esc` skip to the end (as now).
- Controls are **always visible** during the replay: a second banner row under the REC line, plus the side panel.
- The log is **only readable during the cleaning shift**, key **Tab** (L, Q and every other letter are taken). It shows the whole night with the camera clock; long lines wrap with a hanging indent, nothing is cut. Scroll: ↑/↓, PgUp/PgDn, Home/End; close with Tab, Esc, X or Backspace.
- Lines said while skipping (Esc) still reach the log; rewind restarts the log.
- Day 1: a staff-room comrade comments on the tape in the message bar and teaches Tab. Later days: sometimes (35%) a short comment that also names Tab. Help (`?`) gets a Tab row.

## Global Constraints

- All in-game text in English; chat with the user in Spanish.
- Replay speed unchanged: `WALK_MS` 90, `ACTION_MS` 200, extras as today.
- Nothing drawn on a black background over walls: banner rows use the wall grey (`Game.dungeonTheme.roomWalls[1]`) like the existing REC strip.
- No Claude co-author trailer in commits (user's rule overrides the harness reminder).
- Watching/stepping/rewinding/skipping must never change the dungeon the player cleans (ROT.RNG only drives the simulation; `Flavor.rng` is presentation).

## Review Focus

- Rewind after the hero has fainted monsters, smashed loot and spread mess: map, roster HP and mess must be exactly the morning's again → covered by Task 2's equality test after N steps.
- Rewind on day 2+ (engine already running, player once in the scheduler) and after Continue → Task 2 test on day 2.
- Esc pressed while paused on the very first frame (gate pending) → Task 1 test "skip from first frame reaches cleaning".
- A log entry longer than three window widths, with colour codes, on a narrow screen → Task 3 wrap test.
- Tab pressed during a conversation or with the shop open must not open the log → Task 4 test.

---

### Task 1: Pause, step, play, fast and skip

**Files:**
- Modify: `script/invasion.js` (state, `start`, `afterHeroTurn`, `skip`, `handleKey`, `bannerText`, new `controlsText`, `finish`)
- Modify: `script/adventurer.js:395` (`Adventurer.prototype.act`)
- Modify: `script/game.js:384-392` (second banner row)
- Modify: `script/panel.js:169` (replay control hints)
- Modify: `script/flavor.js:49` (`playbackNag` mentions the new keys)
- Modify: existing tests that rely on the replay auto-running (set `ctx.Invasion.startPaused = false`)
- Test: `tests/replay-controls.test.js`

**Interfaces:**
- Produces on `Invasion`: `startPaused: true` (tests may set false), `paused: bool`, `held: bool` (engine locked by us with no timer), `gate: function|null` (first-frame release), `play(fast: bool)`, `pause()`, `step()`, `release()`, `holdFirst(hero) -> bool`, `firstFrameGate(hero) -> thenable`, `controlsText(width) -> string`.
- `reset()` sets `paused = this.startPaused`, `held = false`, `gate = null`.

- [ ] **Step 1: Write failing tests** in `tests/replay-controls.test.js` (boot with `bootHeadless({ seed, begin: true })`, reach the invasion with `toIntro` + Enter as `save.test.js` does, `Invasion.instant` false):
  - `starts paused before the hero's first turn`: `Invasion.paused === true`, `Invasion.turn === 0`, `__timers` holds no replay timer, `Game.adventurer.turns === -1`.
  - `→ steps one hero turn while paused`: press 39 three times → `Invasion.turn === 3`, still paused, no pending timer.
  - `Space plays at normal speed, Space again pauses`: press 32 → `paused false`, a timer of 90 or 200 ms (≤ 350) is queued; press 32 → `paused true`, timer list empty; `__runTimers()` changes nothing.
  - `→ while playing only pauses`: play, press 39 → paused, turn unchanged.
  - `F plays fast from pause and toggles back`: press 70 → `fast true`, `paused false`; press 70 → `fast false`, still playing.
  - `skip from first frame reaches cleaning`: press 27 at frame 0 → `Game.phase` goes to cleaning after the handover (`__runTimers` / any key), stats equal an `instant` run of the same seed (reuse `fingerprint` shape from `determinism.test.js`).
  - `controls always shown`: after `Game.drawMap()` while paused, `__drawn` has a text containing `PAUSED` on row 0 and one containing `rewind` on row 1; `controlsText(30)` plain length ≤ 28.
- [ ] **Step 2: Run** `node --test tests/replay-controls.test.js` → FAIL.
- [ ] **Step 3: Implement.**
  - `Adventurer.prototype.act`: `if (this.turns == -1 && Invasion.holdFirst(this)) return Invasion.firstFrameGate(this);` before `takeTurn`.
  - `holdFirst`: `paused && !instant && !skipping && Game.phase == 'invasion'`.
  - `firstFrameGate(hero)` returns `{ then: function (unlock) { Invasion.gate = function () { hero.act(); unlock(); }; } }` (synchronous on purpose: rot 2.2.1 locks the engine and calls `then(unlock)`; the lock counter keeps it locked if `afterHeroTurn` locked again inside).
  - `afterHeroTurn`: when `paused`, lock, draw, reset beats, set `held = true`, no timer.
  - `release()`: run `gate` (clearing it first) / or clear a pending timer and `Game.engine.unlock()` / or if `held`, clear it and unlock.
  - `play(fast)`: `paused = false`, `this.fast = fast`, `release()`. `pause()`: `paused = true`; a pending timer is cleared and becomes `held`. `step()`: if not paused → `pause()`; else `release()` (stays paused, so the next `afterHeroTurn` holds again).
  - `skip()`: `skipping = true`, `paused = false`, `release()`.
  - `handleKey` while `phase == 'invasion'`, `stage == null`: 32 → paused ? `play(false)` : `pause()`; 39 and 102 → `step()`; 70 → paused ? `play(true)` : toggle `fast` with the existing timer rescale; 82 → `rewind()` (Task 2; until then a no-op guard `if (this.rewind)`); 27 → `skip()`. Remove 70 and 82 from `NAG_KEYS`. Redraw after each.
  - `bannerText`: state text `❚❚ PAUSED` / `▶ PLAY` / `▶▶ x4`; drop "just watch - no input needed".
  - `controlsText(width)`: first form that fits `width - 2`: `[Space] play/pause  [→] step  [F] fast  [R] rewind  [Esc] skip`, then `Space play  → step  F fast  R rewind  Esc skip`, then `Spc → F R Esc`. Keys `#ff0`, words `#ddd`.
  - `game.js`: draw row 1 with the same wall-grey strip and `controlsText(mapCols)`, centred, under the same condition as the REC row.
  - `panel.js` tail: `[Space] play/pause`, `[→] step  [R] rewind`, `[F] fast: on/off`, `[Esc] skip`, then V/T/zoom as now.
  - `playbackNag`: replace the Space line with `"This already happened. Space plays, → steps, Esc skips."`.
  - `finish()`: also `paused = false`, `held = false`, `gate = null`.
- [ ] **Step 4: Run** `node --test tests/` → new tests PASS. Existing tests that expected the replay to run on timers now fail: fix each by setting `ctx.Invasion.startPaused = false` right after boot (not by changing assertions). List the files touched in the commit message.
- [ ] **Step 5: Commit** `feat: replay starts paused, with play/pause, step and fast controls`.

### Task 2: Rewind to the first frame

**Files:**
- Modify: `script/game.js:706` (`generateDungeon` takes the morning snapshot first)
- Modify: `script/invasion.js` (`morning`, `takeMorning`, `rewind`)
- Test: `tests/replay-controls.test.js`

**Interfaces:**
- Consumes: `Save.snapshot()`, `Save.restore(data)`, `Flavor.rng.getState/setState`, Task 1's `paused/gate/held/timer`.
- Produces: `Invasion.morning = { save, flavor, lastLines, log, cutscene }`, `Invasion.takeMorning()`, `Invasion.rewind()`.

- [ ] **Step 1: Write failing tests:**
  - `R rewinds to the first frame, paused`: step 25 turns, record `signature` (map chars + mess per key, as `save.test.js`), adventurer x/y/hp, roster names+hp, `Invasion.stats`, `Game.log.lines` texts; press 82 → `paused`, `turn === 0`, `adventurer.turns === -1`; step 25 again → every recorded value deep-equals.
  - `rewound night ends in the same dungeon`: rewind after 40 steps, then Esc → cleaning fingerprint equals a run of the same seed without rewind.
  - `rewind on day 2`: play day 1 instantly to cleaning, `Game.nextDay()`, step 10, rewind, step 10 → same as before the rewind; then Esc, finish the handover, and the player can move (an arrow key changes `player.x/y` or the engine is not stuck: `Game.phase == 'cleaning'` and a key press runs `endTurn`).
  - `R does nothing during the hand-over or in the shift`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - `generateDungeon` first line: `Invasion.takeMorning();` storing `Save.snapshot()`, `Flavor.rng.getState()`, a copy of `Flavor.lastLines`, `JSON.parse(JSON.stringify(Game.log.lines))` and `Game.player.cutscene`.
  - `rewind()` guard: `phase == 'invasion' && stage == null && morning != null`. Then: clear timer, `gate = null`, `held = false`, `skipping = false`, `fast = false`; `Save.restore(m.save)` (it decodes fresh objects each call); `Game.player.cutscene = m.cutscene`; restore Flavor state, `lastLines`, log lines; `Game.engine = new ROT.Engine(Game.scheduler)`; `engineStarted = false`; `Game.generateDungeon()` (re-snapshots an identical morning; on day > 1 it calls `start()`); `if (Game.day == 1) this.start();`. `reset()` inside generateDungeon leaves it paused because `startPaused` is true; if a test set `startPaused` false, force `paused = true` after the rebuild. The abandoned engine stays locked forever (same as `freshRun`).
  - If the equality test fails, find the leaking state (anything the invasion mutates that `Save.snapshot` does not cover) and add it to `morning`; do not weaken the test.
- [ ] **Step 4: Run** `node --test tests/` → all PASS.
- [ ] **Step 5: Commit** `feat: rewind the security footage to the first frame`.

### Task 3: The night transcript and the log window

**Files:**
- Modify: `script/invasion.js` (`transcript`, `record`, `say`)
- Modify: `script/ui.js` (`wrapColored`)
- Create: `script/nightlog.js`
- Modify: `index.html`, `tests/harness.js` DEFAULT_FILES (after `inventory.js`), `script/game.js` (`drawWindows`, `screenOpen`)
- Test: `tests/nightlog.test.js`

**Interfaces:**
- Produces: `Invasion.transcript: [{clock: string, text: string}]` (reset in `reset()`, restored empty by rewind since rewind calls `reset`); `Ui.wrapColored(text, width) -> string[]`; `NightLog = { isOpen, open(), close(), lines(width) -> string[], draw(), handleKey(e) }`, window id `'nightlog'`.

- [ ] **Step 1: Write failing tests:**
  - `transcript keeps every line with the camera clock`: a non-skipped full run (`startPaused = false`, drive with `__runTimers` or step until cleaning) → transcript length ≥ number of `Game.log.lines` added during the night, every `clock` matches `/^\d\d:\d\d [AP]M$/`.
  - `skipping still records`: press Esc at frame 0 → transcript non-empty and contains `heroExit`'s line; `Game.log` did not get the skipped lines (as today).
  - `wrapColored`: a 200-char line with `%c{#0ff}Sir Bob%c{}` in it, width 30 → every line's `Ui.plainLength` ≤ 30, joined plain text equals the original plain text (spaces normalised), and a line that starts inside a colour span begins with that `%c{...}`.
  - `NightLog.lines(40)`: first line of an entry starts with the clock, continuation lines start with 10 spaces, no line longer than 40 visible chars.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - `say()`: build the line even when `quiet()`; always `record(line)`; push to `Game.log` only when not quiet. Keep the `optional` throttle as is. `record(line)` pushes `{clock: this.clockText(), text: line}` when the line is non-empty.
  - `Ui.wrapColored`: word wrap measuring with `plainLength`; remember the last `%c{x}` opened (closed by `%c{}`); when a line breaks inside a span, close it at the end of the line and reopen it at the start of the next. Overlong words are cut like `Ui.wrap`.
  - `NightLog.lines(width)`: per entry, `'%c{#777}' + clock + '%c{}  '` + first wrapped line (text width `width - 10`), then `' '.repeat(10) + line` for the rest.
  - `NightLog.draw()`: `Ui.window({ id: 'nightlog', title: 'Security Log · Cam ' + Invasion.camera, width: 76, top: [hero full name in hero colour, entries count + ' entries'], body: this.lines(inner), footer: '[↑↓] scroll  [PgUp/PgDn] page  [Home/End] start/end  [Tab] close' })` with `Ui.key` labels; inner = `min(cols - 2, 76) - 4`.
  - `handleKey(e)`: always `preventDefault`. 9/27/8/88 close; 38/104 up 1; 40/98 down 1; 33/105 and 34/99 by `Ui.bodyRows(...)`; 36/103 offset 0; 35/97 offset `Infinity` (the window clamps). Redraw.
  - `open()` resets the scroll to the top. `Game.screenOpen` also checks `NightLog.isOpen`; `drawWindows` draws it.
- [ ] **Step 4: Run** `node --test tests/` → PASS (`tests/index-html.test.js` may need the new script listed).
- [ ] **Step 5: Commit** `feat: last night's security log window`.

### Task 4: Tab during the shift, the comrade's tip, help and README

**Files:**
- Modify: `script/player.js` (key handler: NightLog first, `case 9`)
- Modify: `script/flavor.js` (pools `tapeTip`, `tapeComment`)
- Modify: `script/invasion.js` (`tapeTip()` called at the end of `finish()`)
- Modify: `script/game.js:477` (`helpLines`)
- Modify: `README.md:22`
- Test: `tests/nightlog.test.js`

**Interfaces:**
- Consumes: `NightLog.open/handleKey/isOpen`, `Invasion.transcript`.
- Produces: `Invasion.tapeTip()`; Flavor pools `tapeTip` and `tapeComment` (each line contains `{monster}` and `[Tab]`).

- [ ] **Step 1: Write failing tests:**
  - `Tab opens the log in the shift`: cleaning day (as `cleaningDay` in `save.test.js`), press 9 → `NightLog.isOpen`; press 9 → closed; Esc also closes; while open, an arrow key does not move the player.
  - `Tab does nothing while talking or with the shop/pockets open` and during the replay (`phase == 'invasion'`).
  - `day 1 tip`: after the handover, `Game.log` has a line with `[Tab]` and the name of a monster that is `alive && retired`.
  - `later days`: with `Flavor.chance` stubbed to true on day 2 a `tapeComment` line with `[Tab]` appears; stubbed to false, none.
  - `help lists Tab`: `Game.helpLines()` has a line whose plain text starts with `Tab` and mentions `security log`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - `player.js` handler: after the `Inventory.isOpen` branch, `if (NightLog.isOpen) { NightLog.handleKey(e); return; }`; in the key switch `case 9: e.preventDefault(); NightLog.open(); Game.drawMap(); return;` (Tab is outside `keyMap`; the global `onKey` already ignores it, so the browser focus move must be stopped here).
  - `tapeTip()`: pick from `roster` filtered `alive && retired` (fallback: any alive comrade; none → skip). Day 1 always `tapeTip`; later days `Flavor.chance(0.35)` → `tapeComment`. Push with `Game.log.push(Flavor.line(pool, { monster: this.monsterName(m) }))` and `record` it too.
  - Pool lines (cozy, funny, English), e.g. tapeTip: `'{monster} waves the tape at you: "Missed the good bits? The whole security log is up. Press [Tab]."'`, `'{monster}: "The floating eye saw everything. Everything. [Tab] if you want the gory details. Well, the ketchup details."'`; tapeComment: `'{monster} is rewatching last night on loop. "[Tab] if you want to see me faint again. I was magnificent."'` — 3-4 lines each.
  - `helpLines`: under EVERYTHING ELSE after `I`: `row('Tab', "last night's security log")`.
  - README line 22: replay starts paused; `Space` play/pause, `→` step, `F` fast, `R` rewind, `Esc` skip; during the shift `Tab` reads the security log.
- [ ] **Step 4: Run** `node --test tests/` → all PASS.
- [ ] **Step 5: Commit** `feat: Tab reads the security log; a comrade tells you about it`.

### Task 5: Check it in Chrome

- [ ] Serve with the node static server on 127.0.0.1:5174 (python can't bind here). In Chrome: day 1 starts paused with both banner rows; → steps; Space plays at the usual pace; F fast; R rewinds to the same night; Esc skips; in the shift the comrade's tip appears, Tab opens the log, long lines wrap, scroll keys work, Tab closes. Narrow window: controls row uses a short form. Wait ~300 ms between automated Enters.
- [ ] Fix anything found (with a test when it is logic), commit, then one fresh whole-branch review.
