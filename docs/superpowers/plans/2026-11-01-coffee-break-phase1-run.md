# Coffee-break run, phase 1: the 5-day run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the endless loop of days into a 5-day run with two warm endings, a shareable results card, save/continue, zorkmids, a plaque that is obviously a joke, and the review fixes.

**Architecture:** Plain global scripts (no bundler). New modules: `script/save.js` (`Save`: localStorage snapshot of the run, written at the start of each day) and `script/ending.js` (`Ending`: epilogue + results card, new `Game.phase = 'ending'`). Day flow hooks live in `Game` (`endShift`, `endRun`, `nextDay`) and in the exit conversation built by `ConversationBuilder.exitPrompt`.

**Tech Stack:** vanilla JS, rot.js 2.2.1 (CDN; `tests/vendor/rot.js`), `node:test` + `tests/harness.js`.

**Spec:** `docs/superpowers/specs/2026-11-01-coffee-break-run-design.md` (sections 1–4, the plaque part of 12, and 13). Base branch: `fix/review-bugs` (commit `4c579cc`).

## Global Constraints

- All in-game text in English. Tone: supportive workplace, never "you failed".
- No build step, no npm in the game; every new script is added to `index.html` **and** `DEFAULT_FILES` in `tests/harness.js` in the same order (a test enforces it).
- Non-world randomness (flavor, endings, reviews, pay messages) uses `Flavor.rng`, never `ROT.RNG`.
- localStorage access always inside try/catch; the game must run without storage. New keys: `rj-save`, `rj-best-run`. Existing: `rj-font`, `rj-best`, `rj-music`, `rj-sound`, `rj-mop`.
- Rooms per day: `[5, 7, 10, 13, 16]`. Last day: 5. `targetPoints`: 650 (see Task 2 for the estimate).
- Pay by grade (zorkmids): S 40, A 30, B 20, C 12, D 6. Grades: S ≥95, A ≥85, B ≥70, C ≥50, else D (unchanged).
- Nothing drawn on a black background over walls (use the wall grey); invasion pacing unchanged.
- Run `node --test tests/` after every task: all tests pass (old tests whose behaviour the spec replaces are updated in the same task, never deleted without a replacement).

## Review Focus

1. **Continue after a reload mid-shift**: the save is from the start of that day; Continue must replay that day (invasion included) with the same dungeon, not crash or skip a day. → Task 4 test `continue regenerates the same day`.
2. **Corrupt / old / foreign `rj-save`** (bad JSON, other version, missing fields): title offers a new game with a kind line, never throws. → Task 4 test `a broken save is discarded kindly`.
3. **Leaving on day 5 after declining once** ('n' at "Leave for the day?", then bump the door again): pay and stats are counted once. → Task 3 test `declining the exit does not pay or record`.
4. **Clipboard unavailable** (no `navigator.clipboard`, insecure context, harness): `C` on the card shows a fallback line, never throws. → Task 5 test `copy without clipboard falls back`.
5. **Zero mess** (`messNumbers[1] == 0`, e.g. a tiny dungeon): clean % is 100, no NaN in report, card or plaque. → Task 1 test `cleanPercent with no mess is 100`.

---

### Task 1: Review fixes (spec §13)

**Files:**
- Modify: `script/game.js` (`cleanPercent`, new `checkCleanMilestones`), `script/player.js` (`getArt`, call milestones after a clean), `script/panel.js:176`, `script/conversations.js:877`, `script/entity.js` (free-tile searches at ~59-73 and ~127-141, `questAct` ~666-702, union logic in the constructor ~26-31, push/swap messages ~453/457), `script/pet.js` (~100-112 `recenter`, ~201, ~262, `FoodBowl` ~349-362), `script/adventurer.js:252-262` (`tagWall`), `script/sound.js:98` (`noise`)
- Test: `tests/review-fixes4.test.js`

**Interfaces:**
- Produces: `Game.cleanPercent(): number` (pure, integer 0–100, 100 when `messNumbers[1] == 0`); `Game.checkCleanMilestones(): void` (the old coffee/invitation trigger; called by `Player.clean` after a successful clean); `findFreeNear(x: number, y: number, maxR = 100): [number, number] | null` (global function in `entity.js`: nearest passable, entity-free tile by Chebyshev ring, `null` if none).

- [ ] **Step 1: Write the failing tests** in `tests/review-fixes4.test.js` (use the `cleaningDay()` helper pattern from `tests/review-fixes3.test.js`):
  - `cleanPercent with no mess is 100`: `messNumbers = [0,0]` → `cleanPercent() === 100`; `shiftReport()` and `plaqueLines().join()` contain no `NaN`.
  - `cleanPercent has no side effects`: set `coffeeThreshold = -1`, call `cleanPercent()` 50×, no monster's `quests.length` changed.
  - `cleaning triggers the coffee milestone`: `coffeeThreshold = -1`, a mop mess next to the player, press `M` → some eligible lounge monster has a new quest.
  - `findFreeNear returns the nearest free tile`: on a known free cell `k` with free neighbour, occupy `k` → result is at Chebyshev distance 1; on a fully walled 1-tile spot → `null`.
  - `Pet.recenter does not move when nothing is free`: stub `findFreeNear` to return null → pet x/y unchanged.
  - `push messages lower-case the chest`: push a Treasure Chest → log line contains `the treasure chest`.
  - `visitors never found the union`: force `RandomName` to return `'Marx'`, create a visitor via the `Visitors` path used by `dayevents.js:29` → `Game.unionist` unchanged.
  - `player art has the tile background`: `Game.player.getArt()[2]` is a string during cleaning.
- [ ] **Step 2: Run** `node --test tests/review-fixes4.test.js` → the new tests FAIL.
- [ ] **Step 3: Implement.** Split `cleanPercent`/`checkCleanMilestones` (the canAsk guard from `4c579cc` moves into the latter); remove the `messNumbers[1] > 0 ?` guards that become redundant and fix `conversations.js:877`. Replace the four copied searches with `findFreeNear`. Pets: test `path.length <= 1` instead of `path == null`, decrement `steps` when walking. `questAct`: compute the path once per turn; delete the dead `path.length<2` branch (~694-702) and skip the second A* when the first returned no path. `tagWall` calls `wallsAround()`. Push/swap messages use `this.name.toLowerCase()`. Union: skip when `'visitor' in tags` (pass the tag at construction, or clear after). `Sfx.noise` caches one noise `AudioBuffer` per context (longest duration used, sliced by `start`/`dur`). `Player.getArt` returns the tile's `bgColor` (fallback `'#000'`).
- [ ] **Step 4: Run** `node --test tests/` → all PASS.
- [ ] **Step 5: Commit** `fix: pure cleanPercent, nearest free tile, pet and quest pathing, review leftovers`.

### Task 2: The 5-day run (spec §1)

**Files:**
- Modify: `script/game.js` (constants, `nextDay`, `begin`), `script/panel.js` (day line), `tests/scenes.test.js:34-41`
- Test: `tests/run.test.js`

**Interfaces:**
- Produces: `Game.DAY_ROOMS = [5,7,10,13,16]`, `Game.LAST_DAY = 5`, `Game.targetPoints = 650`, `Game.roomsForDay(day: number): number` (clamped to the table). `Game.MAX_ROOMS` and `DAY1_ROOMS` are removed. `nextDay()` no longer sets `player.cutscene = victoryPrompt()` (the Mop is decided in Task 3).

Target estimate (record as a comment next to `targetPoints`): a decent day ≈ 80 (clean %) + ~20 (chats, 3 each) + ~10 (secret door) + ~50 (one request or heart-to-heart) ≈ 160 → ~800 in 5 days; a lazy day ≈ 40 + 10 ≈ 50 → ~250. 650 sits between with room for an off day; phase 2 combos/objectives add a little more.

- [ ] **Step 1: Failing tests** in `tests/run.test.js`: `rooms follow the table` (boot, call `nextDay()` 4× from day 1, record `dungeonRooms` → `[5,7,10,13,16]`, and `rooms.length` of the generated map equals it plus the lounge rule already used today); `no victory cutscene mid-run` (set `yendorPoints = 10000`, `nextDay()` → `player.cutscene == null`, `victory === false`); `panel shows Day N / 5`. Update `tests/scenes.test.js` growth assertion to the table.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per Interfaces; panel day line `Day 3 / 5`.
- [ ] **Step 4: Run** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `feat: a 5-day run with faster-growing dungeons`.

### Task 3: Shift end, zorkmids and the joke plaque (spec §4, §12 plaque, §13 best)

**Files:**
- Modify: `script/conversations.js` (`exitPrompt`), `script/entity.js` (globalTags `endShift`, `endRun`), `script/game.js` (`endShift`, `shiftReport`, `plaqueLines`, `payFor`, coin pick-up in run stats), `script/player.js` (coin pick-up), `script/entity.js` chest `scatter` (~829), `script/adventurer.js` (extra coin drop), `script/panel.js` (zorkmids line), `script/lore.js` (plaque causes wording if needed), `tests/plaque.test.js`, `tests/features2.test.js:185-197`
- Test: `tests/shift-end.test.js`

**Interfaces:**
- Produces: `Game.zorkmids: number`; `Game.run = {grades: string[], cleanPcts: number[], requestsDone: number, zorkmidsEarned: number, chattedWith: string[]}` (reset by `Game.newRun()`; `chattedWith` unique names); `Game.gradeFor(pct: number): string`; `Game.payFor(grade: string): number` (S 40 A 30 B 20 C 12 D 6); `Game.endShift(): void` (idempotent per day: records grade/pct/requests into `run`, pays, adds zorkmids to `run.zorkmidsEarned`; guarded by `Game.shiftEnded` reset in `generateDungeon`); `Game.coinValue(mess): number` (1–3 via `Flavor.rng`, +2 for coin variants other than the plain kind). Exit convo: node "You leave for the day…" carries `globalTags.endShift = true`; on `Game.day == LAST_DAY` the last node carries `globalTags.endRun = true` instead of `nextDay` and the morning lines are omitted. `Game.endRun` is a stub here (sets `Game.phase = 'ending'`); Task 5 fills it.
- Consumes: `Game.cleanPercent()` (Task 1), `Game.LAST_DAY` (Task 2).

Plaque copy (exact): header lines `HERE LIES` / `YOUR BACK` / `(it's fine,` / `just sore)`, then `EMPLOYEE OF THE` / `DAY N`, `cleaned N%`, `sore from:` + wrapped cause. The convo line before it becomes `Do you want your mess identified? (You do. Here it is.)`. The report replaces the best-shift line with `Pay: +N zm   Wallet: N zm` and no longer reads or writes `rj-best`.

- [ ] **Step 1: Failing tests** in `tests/shift-end.test.js`: `confirming the exit pays by grade` (force 90% → after `y` and the next Enter, `zorkmids` increased by 30, `run.grades == ['A']`); `declining the exit does not pay or record` (`n`, bump again, `y` → paid once, one grade); `day 5 ends the run instead of a new day` (`day = 5`, walk the exit convo to the end → `phase == 'ending'`, `day` still 5); `coins give zorkmids` (pick up a `GoldCoins` mess → `zorkmids` +1..+3, message contains `zm`); `chests scatter more coin` (smash a chest headlessly → ≥3 coin messes). Update `tests/plaque.test.js` (`DYWYPI` constant, `sore from:`, `YOUR BACK`; rectangle test unchanged) and replace the `rj-best` assertions in `tests/features2.test.js` with the pay line.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per Interfaces. Chest `scatter: ['GoldCoins', 3]`; the hero drops one extra coin pile in a random room once per invasion through the simulation (world RNG, same path in normal/fast/skip). `requestsDone` comes from `Game.shift.requestsDone`; `chattedWith` from `playerTalkedToday` at `endShift`.
- [ ] **Step 4: Run** `node --test tests/` (determinism tests must still pass) → PASS.
- [ ] **Step 5: Commit** `feat: shift pay in zorkmids, coins worth money, a plaque for your back`.

### Task 4: Save and continue (spec §3)

**Files:**
- Create: `script/save.js`
- Modify: `index.html`, `tests/harness.js` (`DEFAULT_FILES`: after `script/eastereggs.js`), `script/game.js` (`nextDay` writes the save; `newRun()`), `script/title.js` (continue / new game), `script/flavor.js` (title lines)
- Test: `tests/save.test.js`

**Interfaces:**
- Produces (global `Save`): `Save.VERSION = 1`; `Save.KEY = 'rj-save'`; `Save.snapshot(): object` (plain JSON-able); `Save.write(): boolean`; `Save.read(): object | null` (null and sets `Save.problem: string` when unreadable or wrong version); `Save.exists(): boolean`; `Save.clear(): void`; `Save.restore(data): void` (puts the state back on `Game`; does not generate the dungeon); `Save.continueRun(): void` (`restore(read())` then `Game.generateDungeon()`, same as a morning).
- Snapshot contents: `day, dungeonRooms, yendorPoints, zorkmids, run, convoTags, unionist, pastHeroes, nameRegistry, amuletStolen, player.reach`, `monsterList`, `petList`, `playerPet` (as a reference), and `rng: ROT.RNG.getState()`. Entities (`Entity`, `Pet`) and messes (`Mess`, e.g. `questItem`) are encoded with a small graph encoder: each object of a known prototype becomes `{__t: 'Entity'|'Pet'|'Mess', __id: n, ...ownFields}`, repeated references become `{__ref: n}`, functions and DOM-ish values are skipped; decoding uses `Object.create(Proto.prototype)` and resolves refs. Fields that must not be saved: `convoOptions`, anything scheduler/engine related.
- `Game.nextDay()` writes the save **after** `day++`, rooms and points are updated and **before** `generateDungeon()`. `Game.newRun()` resets run state (`day 1`, points, zorkmids, `run`, lists) and `Save.clear()`.
- Title: when `Save.exists()`, the prompt lines become `[c] Continue: day N` and `[n] New game`; `c`/Enter → `Save.continueRun()`; `n` → `newRun()` then today's flow (how-to on day 1). Other non-global keys do nothing. When `Save.problem` is set, show one line (Flavor pool `saveLost`, e.g. "Your old save was mopped up by accident. Fresh start!") and behave as no save.

- [ ] **Step 1: Failing tests** in `tests/save.test.js`:
  - `continue regenerates the same day`: ctx A (seed 1234): reach cleaning on day 1, chat with one comrade, set `convoTags.paint='blue'`, call `Game.nextDay()`; record A's map signature (sorted `key:char`), monster names, `Game.day`. ctx B (seed 999): copy A's `__storage`, boot with `begin:true`, press `c` → B's signature, names, day and `convoTags.paint` equal A's; B's `phase` is `'invasion'`.
  - `entities survive the round trip`: snapshot→JSON→restore keeps `monsterList[i] instanceof Entity`, `playerInteractions`, a `questItem` that is a `Mess` with `droppedBy === monsterList[i]`, and `playerPet === petList[j]`.
  - `a broken save is discarded kindly`: `__storage['rj-save'] = '{oops'` and separately `JSON.stringify({version: 0})` → `Save.exists() === false`, title draw contains the `saveLost` line, no throw.
  - `new game clears the save`: with a save present, press `n` → `rj-save` absent, `day == 1`, `phase == 'howto'`.
  - `no storage still works`: make `localStorage.setItem` throw → `nextDay()` does not throw.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `script/save.js` per Interfaces; wire `nextDay`, `Title.handleKey`, `Title.draw`, `index.html`, harness.
- [ ] **Step 4: Run** `node --test tests/` → PASS (including `index-html.test.js`).
- [ ] **Step 5: Commit** `feat: save at the start of each day, continue from the title screen`.

### Task 5: Endings and the results card (spec §2)

**Files:**
- Create: `script/ending.js`
- Modify: `index.html`, `tests/harness.js` (after `script/save.js`), `script/game.js` (`endRun`, `drawMap` branch, `onKey` routing for `'ending'`, `musicTrack`), `script/conversations.js` (`victoryPrompt` text reused by `Ending`), `script/lore.js` (pools)
- Test: `tests/ending.test.js`

**Interfaces:**
- Consumes: `Game.run`, `Game.zorkmids`, `Game.yendorPoints`, `Game.targetPoints` (Tasks 2–3), `Save.clear()` (Task 4), `EasterEggs.mopName()`.
- Produces: `Game.endRun(): void` (adds the last day's clean % to points like `nextDay` does, sets `victory`, saves `rj-best-run` = `{points, ending}` when better, `Save.clear()`, `Ending.start(kind)`); `Ending.start(kind: 'mop'|'senior')`; `Ending.lines(): string[]` (epilogue, one page per Enter, existing scenes may be shown); `Ending.cardLines(): string[]` (framed, every line the same visible width); `Ending.shareText(): string`; `Ending.copy(): void` (sets `Ending.copyStatus` to `'copied'` or `'manual'`); `Ending.handleKey(e)`: Enter advances pages, then the card; on the card `C` copies, Enter/Esc → `Game.newRun()`, `phase='title'`, `Title.start()`.
- Lore pools (new, `lore.js`): `endingMop` (rewrite of the old victory text: "five days" not "a couple of weeks"), `endingSenior` (promoted to Senior Janitor / Employee of the Month by default / party anyway; never "failed"), `comradeReviews` (≥10 one-liners like "★★★★★ would get fainted on again — Bob the Kobold").
- Card content (spec §2): ending title; `Mop points: N / 650`; `Average clean: N%`; `Grades: B A S A B`; `Requests done: N`; `Comrades befriended: N`; `Zorkmids earned: N`; `Mop: <name>` when set; one review line; footer `[C] copy result   [Enter] back to the title`. Combos/objectives/achievements/shop lines appear only when those fields exist (phases 2–3).
- Share text (exact shape):
  ```
  Rogue Janitor — Mop of Yendor ✔  (or: Senior Janitor ☕)
  5 days · 712 pts · avg 84% · B A S A B
  "★★★★★ would get fainted on again" — Bob the Kobold
  ```
- Copy: `navigator.clipboard.writeText` when present; else a temporary `<textarea>` + `document.execCommand('copy')`; if both are missing or throw → `copyStatus = 'manual'` and the card shows the share text lines with "Copy failed: here it is to type or screenshot."

- [ ] **Step 1: Failing tests** in `tests/ending.test.js`: `points decide the ending` (650 → `'mop'`, 649 → `'senior'`); `the senior ending never says failed` (no `/fail|lose|lost|game over/i` in `Ending.lines()` for `'senior'`); `card lines share one width`; `share text has the grades and points`; `copy without clipboard falls back` (no `navigator` in ctx → `copyStatus === 'manual'`, no throw); `copy with clipboard` (stub `navigator.clipboard.writeText` → called with `shareText()`, `copyStatus === 'copied'`); `after the card a new run starts at the title` (Enter through → `phase == 'title'`, `day == 1`, `Save.exists() === false`); `best run is stored only when better`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** per Interfaces; `drawMap` draws `Ending` centered with `drawCentered`; music track `'title'` during the ending.
- [ ] **Step 4: Run** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `feat: two endings and a shareable results card`.

### Task 6: Play it in Chrome and fix what shows up

**Files:** whatever the run reveals; README `Features` list.

- [ ] **Step 1:** Serve the repo locally and play in Chrome (Claude extension): title (no save), day 1 → leave → day 2 starts; reload the tab → title shows Continue: day 2 → `c` replays day 2. Wait ~300 ms between automated Enters (convo debounce).
- [ ] **Step 2:** Jump to the end headlessly in the page (`Game.day = 5`, `Game.yendorPoints = 700`), leave → Mop ending → card → `C` copies (check `navigator.clipboard.readText` or the status line) → Enter → title without Continue. Repeat with `yendorPoints = 100` → senior ending.
- [ ] **Step 3:** Screenshot the plaque and the card for the user; check widths at the default zoom and at `+`/`-`.
- [ ] **Step 4:** README: replace the Mop/endless wording with the 5-day run, endings, sharing, save/continue, zorkmids.
- [ ] **Step 5: Run** `node --test tests/` → PASS. **Commit** `docs: README for the coffee-break run` (plus any fix commits).
