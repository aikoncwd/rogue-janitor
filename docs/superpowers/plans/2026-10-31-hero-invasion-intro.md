# Hero Invasion Intro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing hidden adventurer simulation a visible, funny, skippable "invasion" told from the monsters' side, followed by the normal cleaning game, with a new side-panel UI (layout B) and synthesized sound.

**Architecture:** The ROT engine already runs the `Adventurer` before the player is scheduled. A new `Invasion` controller paces it (the hero locks the engine after each turn and a timer unlocks it), receives events from hero/monster code, writes flavor lines to a new `MessageLog`, plays `Sfx`, keeps stats/bodies, and hands over to the player. Rendering moves to a layout with map viewport + right `Panel` + bottom log, centred on a camera target (hero or player). Pure modules (`flavor`, `messagelog`, `sound`, `panel` helpers) are Node-testable; integration is tested headlessly by loading all scripts into a `vm` context with stubs.

**Tech Stack:** Plain browser JavaScript (global scripts, no build), rot.js 2.0.3 (CDN in game, vendored copy for tests), Web Audio API, Node 26 `node:test` for tests.

**Spec:** `docs/superpowers/specs/2026-10-31-hero-invasion-intro-design.md`

## Global Constraints

- No build step, bundler, framework or npm dependencies. Game runs by opening `index.html`; rot.js stays on `https://cdn.jsdelivr.net/npm/rot-js@2.0.3/dist/rot.js`.
- All in-game text in English.
- Existing keybindings unchanged. New keys: `Space` (fast toggle, invasion only), `Esc` (skip, invasion only), `V` (sound toggle, any phase).
- Monsters never die: `alive=false` during invasion means "fainted"; `moveMonstersToLounge` still revives them into lounge/party room.
- The player cleans exactly the mess the hero made; `Game.messNumbers` must be correct after the invasion.
- Quest / coffee / invitation / party / pet / victory logic must keep working.
- New scripts must also export for Node: end each new file with `if (typeof module !== 'undefined') module.exports = X;` (harmless in browser).
- `localStorage` access always inside try/catch.
- Tests: `node --test tests/` from the repo root.

## Review Focus

1. **Days 2+**: `nextDay()` is called from inside a conversation while the player holds the engine lock; the new day's invasion must start and pace correctly (not run instantly, not hang). → test in Task 5.
2. **Skip mid-invasion** (Esc after some paced turns): pending timer must not unlock the engine a second time after the skip finished (double unlock → hero/player act out of order). → test in Task 5.
3. **Keys during invasion**: movement/mop/etc. keys must do nothing; the hidden player must not act or move. → test in Task 5.
4. **Hero never reaches the stairs** (10,000-turn fail-safe): must end the invasion on the same map, not regenerate it. → test in Task 4.
5. **Small windows / resize**: map viewport, panel and log must not overlap or produce negative sizes at small window sizes (e.g. 60×20 cells). → test in Task 6.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `script/flavor.js` | create | Text pools + picking (no immediate repeats) + hero names |
| `script/messagelog.js` | create | Scrolling log model (fresh/stale lines, dedupe) |
| `script/sound.js` | create | `Sfx`: Web Audio synthesis, throttle, mute + persistence |
| `script/invasion.js` | create | Phase controller: intro → invasion → handover; pacing; stats; bodies; flashes; event handling |
| `script/panel.js` | create | Layout math, side panel content, mess categories |
| `script/game.js` | modify | Layout-aware `drawMap`, camera, log-backed `sendMessage`, phase flow in `init`/`generateDungeon`/`nextDay`, comparator fix |
| `script/adventurer.js` | modify | Event hooks, pacing lock, `leave()`, fail-safe, `currentTarget` fix |
| `script/entity.js` | modify | Event hooks in `adventurerAct` and `act`, remove `console.log` |
| `script/player.js` | modify | Phase gating, `V` key, Sfx on actions |
| `script/tile.js` | modify | Secret-door hint uses camera target only in cleaning phase |
| `script/conversations.js` | modify | Welcome text, `chainCutscenes` |
| `index.html` | modify | Script tags |
| `.gitignore` | modify | `.superpowers/` |
| `tests/harness.js` | create | Loads vendored rot + game scripts into a `vm` context with DOM stubs |
| `tests/vendor/rot.js` | create | rot.js 2.0.3 dist, downloaded |
| `tests/*.test.js` | create | One file per task |

---

### Task 1: Headless test harness + small fixes

**Files:**
- Create: `tests/harness.js`, `tests/vendor/rot.js`, `tests/baseline.test.js`
- Modify: `.gitignore`, `script/game.js:885-887`, `script/adventurer.js:144,154`, `script/entity.js:327`

**Interfaces:**
- Produces: `bootHeadless({ seed = 1234, files = DEFAULT_FILES } = {}) -> ctx` in `tests/harness.js`. `ctx` is the vm context; game globals are `ctx.Game`, `ctx.ROT`, `ctx.Invasion` (later), etc. It: sets `ROT.RNG.setSeed(seed)`; stubs `window` (`addEventListener`/`removeEventListener` recording listeners in `ctx.__listeners`), `document`, `localStorage` (in-memory), `setTimeout`/`clearTimeout` (manual queue: `ctx.__timers`, `ctx.__runTimers()` runs all due), `console`; builds `Game.display` stub (`draw`, `drawText` recording calls into `ctx.__drawn`, `clear`, `computeSize() -> [100, 40]`, `setOptions`, `getContainer`); then replicates `Game.init` *without* the DOM: `Game.scheduler = new ROT.Scheduler.Simple()`, `Game.player = new Player(-1,-1,-1)`, `Game.fov = ...`, `Game.engine = new ROT.Engine(Game.scheduler)`, `Game.getSize(false)`. It does **not** generate a dungeon.
- Produces: `ctx.__press(keyCode)` dispatches a fake `keydown` (`{keyCode, charCode:0, preventDefault(){}}`) to every registered listener.
- `DEFAULT_FILES` = the `<script>` list from `index.html` in order (update it in later tasks when tags are added).

- [ ] **Step 1: Vendor rot.js and ignore brainstorm files**

Run: `xh -d https://cdn.jsdelivr.net/npm/rot-js@2.0.3/dist/rot.js -o tests/vendor/rot.js` and append `.superpowers/` to `.gitignore`.
Expected: `tests/vendor/rot.js` exists, ~200 KB.

- [ ] **Step 2: Write the baseline test (current behaviour, synchronous hero)**

```js
// tests/baseline.test.js
test('hero runs to completion and monsters retire to lounge', () => {
  const ctx = bootHeadless();
  ctx.Game.generateDungeon();
  ctx.Game.engine.start();               // runs until Player.act locks
  assert.equal(ctx.Game.adventurer.active, false);
  assert.ok(ctx.Game.messNumbers[0] > 50);
  const today = ctx.Game.monsterList.filter(m => m.alive);
  assert.ok(today.length > 0);
  assert.ok(today.every(m => m.retired));
});
test('monster sort puts higher level first', () => {
  const ctx = bootHeadless(); ctx.Game.generateDungeon(); ctx.Game.engine.start();
  // all playerInteractions are 0 on day 1, so order is by 2*level + friends.length, descending
  const score = m => 2*m.level + m.playerInteractions + m.friends.length;
  const s = ctx.Game.monsterList.map(score);
  for (let i = 1; i < s.length; i++) assert.ok(s[i-1] >= s[i]);
});
```

- [ ] **Step 3: Run it**

Run: `node --test tests/`
Expected: first test PASS (characterises current behaviour); comparator test FAIL.

- [ ] **Step 4: Fix the three small bugs**

`game.js` comparator → `(2*b.level + b.playerInteractions + b.friends.length) - (2*a.level + a.playerInteractions + a.friends.length)`. `adventurer.js` lines 144/154: compare coordinates (`x`/`y` values), not array references. `entity.js:327`: delete the `console.log`. Also delete the two `console.log` in `mess.js` `QuestMess` and the one in `AddMonster`.

- [ ] **Step 5: Run tests** — `node --test tests/` → all PASS.

- [ ] **Step 6: Commit**

```bash
git add .gitignore tests/ script/game.js script/adventurer.js script/entity.js script/mess.js docs/
git commit -m "test: headless harness; fix monster sort, path recalculation, debug logs"
```

---

### Task 2: Flavor text and message log

**Files:**
- Create: `script/flavor.js`, `script/messagelog.js`, `tests/flavor.test.js`, `tests/messagelog.test.js`

**Interfaces:**
- Produces `Flavor` (global object):
  - `Flavor.pools`: object of string arrays. Required keys: `heroEnter`, `heroCry`, `heroHit`, `monsterPain`, `monsterFaint`, `doorKick`, `lootSmash`, `snack`, `potion`, `heroHurt`, `heroExit`, `monstersGetUp`, `shiftBegins`, `heroFirst`, `heroLast`, `heroClass`, `introText`. Placeholders: `{hero}` (short hero name), `{monster}` (monster `name`), `{item}` (loot name, lowercase). At least 8 lines per event pool; `introText` is the day-1 intro screen (6–10 lines, monsters' POV: humble Comrade Dungeon, monsters happily at work/at their hobbies, an ominous door creak, "A HERO approaches...", "Press any key."). Tone: cosy workplace comedy; monsters are performing for the adventurer; "blood" is fake.
  - `Flavor.line(poolName: string, vars: object = {}) -> string` — random line from pool with placeholders replaced; never returns the same line as the previous call for that pool when the pool has >1 line. Uses `ROT.RNG`.
  - `Flavor.heroName() -> {short: string, full: string}` — e.g. `{short:'Sir Gleamington', full:'Sir Gleamington the Paladin'}` built from `heroFirst` + `heroLast` + `heroClass`.
- Produces `MessageLog` (constructor):
  - `new MessageLog(max = 50)`
  - `push(text: string) -> void` — appends `{text, fresh:true}`; if `text` equals the newest line's text, only marks it fresh (no duplicate). Trims to `max`.
  - `markStale() -> void` — all lines `fresh=false`.
  - `recent(n: number) -> Array<{text, fresh}>` — last `n`, oldest first.
  - `clear() -> void`.

- [ ] **Step 1: Write failing tests**

```js
// tests/flavor.test.js  (load rot + flavor.js via bootHeadless({files:['script/flavor.js']}))
test('line substitutes placeholders', () => {
  ctx.Flavor.pools.t = ['{hero} hits {monster}!', 'x'];
  // force first line by seeding/looping until it appears
  assert.match(lineContaining('hits'), /^Brakka hits Gob the Goblin!$/);
});
test('line never repeats twice in a row', () => {
  let prev = ''; for (let i=0;i<200;i++){ const l = ctx.Flavor.line('heroCry'); assert.notEqual(l, prev); prev = l; }
});
test('all required pools exist with >= 8 lines (introText 6-10)', ...);
test('heroName full = short + " the " + class', ...);
// tests/messagelog.test.js
test('push dedupes consecutive identical text and refreshes it', ...);   // push a, markStale, push a → length 1, fresh true
test('recent returns oldest-first last n', ...);                         // push a..g, recent(5) → c,d,e,f,g
test('trims to max', ...);                                                // max 3, push 5 → length 3
```

- [ ] **Step 2: Run** — `node --test tests/` → new tests FAIL (`Flavor is not defined`).
- [ ] **Step 3: Implement `script/flavor.js` and `script/messagelog.js`** per Interfaces (write the flavor content in full).
- [ ] **Step 4: Run** — `node --test tests/` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: flavor text pools and message log model"`

---

### Task 3: Synthesized sound

**Files:**
- Create: `script/sound.js`, `tests/sound.test.js`

**Interfaces:**
- Produces `Sfx` (global object):
  - `Sfx.names`: `['hit','yelp','faint','door','smash','gulp','munch','fanfareIn','fanfareOut','mop','pickup','fix','secret','blip','heroHurt']`
  - `Sfx.play(name: string) -> boolean` — returns `true` if a sound was scheduled. No-op (`false`) when muted, when audio is not unlocked, when name unknown, or when the same name played < `Sfx.minGapMs` (= 70) ago, or when > `Sfx.maxPerSecond` (= 12) sounds played in the last second.
  - `Sfx.unlock() -> void` — creates the `AudioContext` via `Sfx.createContext()` (default: `new (window.AudioContext||window.webkitAudioContext)()`, overridable for tests) on first user key press; resumes if suspended.
  - `Sfx.toggle() -> boolean` — flips mute, persists `'rj-sound'` = `'on'|'off'` in `localStorage` (try/catch), returns new `enabled`.
  - `Sfx.enabled: boolean` — initialised from `localStorage` (default `true`; if storage throws → `true`).
  - `Sfx.now() -> number` — ms clock, overridable in tests.
- Each sound is a short oscillator/noise envelope (≤ 400 ms; fanfares ≤ 900 ms), master gain ≈ 0.15. Exact synthesis is the builder's call.

- [ ] **Step 1: Write failing tests** with a fake context counting `createOscillator`/`createBufferSource` calls and a fake clock:

```js
test('no sound before unlock', ...);                       // play('hit') === false
test('plays after unlock', ...);                           // unlock(); play('hit') === true; oscillators > 0
test('same sound within 70ms is throttled', ...);          // t=0 true, t=50 false, t=80 true
test('global cap of 12 per second', ...);                  // 13 distinct-time plays of mixed names in 1s → 13th false
test('toggle persists and mutes', ...);                    // toggle() → false; localStorage 'rj-sound'==='off'; play false
test('throwing localStorage does not break', ...);         // storage getter throws → Sfx.enabled true, toggle works
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: synthesized sound effects with throttle and mute"`

---

### Task 4: Invasion controller (headless, instant mode)

**Files:**
- Create: `script/invasion.js`, `tests/invasion.test.js`
- Modify: `script/adventurer.js`, `script/entity.js:142-186,494-516`, `script/game.js` (`generateDungeon`, `moveMonstersToLounge` caller, new `forgetMap`), `script/conversations.js` (`chainCutscenes`, welcome text), `script/tile.js:36-42`, `index.html`, `tests/harness.js` (`DEFAULT_FILES`)

**Interfaces:**
- Consumes: `Flavor.line`, `Flavor.heroName` (Task 2), `MessageLog` (Task 2), `Sfx.play` (Task 3).
- Produces `Game.phase: 'intro'|'invasion'|'handover'|'cleaning'` and `Game.log = new MessageLog()` (created once in `Game` init / harness).
- Produces `Game.cameraTarget() -> {x, y}` — `Game.adventurer` while phase is `intro`/`invasion` (and `adventurer.active`), else `Game.player`.
- Produces `Game.forgetMap() -> void` — every tile `lastSeen=' '`, `visible=false`.
- Produces `Invasion` (global object):
  - `Invasion.instant: boolean` (pacing comes in Task 5; in this task every hero turn runs without delay).
  - `Invasion.reset(adventurer) -> void` — called by `Game.generateDungeon` after `populateRooms()`: stores `hero = Flavor.heroName()`, `roster = Game.monsterList.filter(m => m.alive && !m.retired)` (captured at that moment), zeroes `stats = {fainted:0, hits:0, lootSmashed:0, snacks:0, potions:0, doors:0, heroHurt:0}`, `bodies = []`, `flashes = {}`, `turn = 0`.
  - `Invasion.event(type: string, data: object) -> void` — types and their data: `'enter' {}`, `'hit' {monster}`, `'faint' {monster}`, `'loot' {entity}`, `'door' {x,y}`, `'snack' {}`, `'potion' {}`, `'heroHurt' {by}`, `'turn' {}`. Updates stats; `faint` pushes `{x, y, char: monster.char}` to `bodies`; `hit`/`heroHurt` set `flashes[x+','+y] = 2` (turns to live); `turn` increments `turn` and decays flashes. When not skipping, also pushes a `Flavor.line` to `Game.log` and calls `Sfx.play` (map: hit→`hit`+maybe `monsterPain` line, faint→`faint`, loot→`smash`, door→`door`, snack→`munch`, potion→`gulp`, heroHurt→`heroHurt`, enter→`fanfareIn` + `heroEnter` line). Throttle: at most one *optional* flavor line per hero turn (`heroCry`, `monsterPain`, `heroHurt`, `snack`); `hit`, `faint`, `door`, `loot`, `enter`, `potion` always log.
  - `Invasion.finish() -> void` — called when the hero leaves (normally or via fail-safe): pushes `heroExit`, `monstersGetUp`, `shiftBegins` lines; plays `fanfareOut`; clears `bodies` and `flashes`; `Game.forgetMap()`; sets `Game.player.cutscene = ConversationBuilder.chainCutscenes(Invasion.reportCutscene(), Game.player.cutscene)`; sets `Game.phase = 'cleaning'`.
  - `Invasion.reportCutscene() -> Array<convoNode>` — one `{message, any}` node per line: title line with `hero.full`, then counts ("Monsters fainted (theatrically): N", "Loot smashed: N", "Snacks eaten on duty: N", "Potions quaffed: N", "Doors kicked: N").
- Produces `ConversationBuilder.chainCutscenes(a, b) -> Array` — `b` may be `null` (returns `a`). Concatenates; renumbers `b`'s `any` indices by `+a.length` (keeping `-1`), and sets `a`'s last node `any` to `a.length`. Other node fields preserved (e.g. `globalTags`).
- Modify `Adventurer`:
  - `Adventurer.prototype.leave() -> void` — the exit code currently inline in `nextDestination` (remove from map, `active=false`, `Game.moveMonstersToLounge()`, `Game.scheduler.add(Game.player,true)`) **plus** `Invasion.finish()` after `moveMonstersToLounge`. `nextDestination` calls it.
  - Fail-safe: `turns > 10000` → `this.leave()` (instead of `Game.generateDungeon()`); `Adventurer.maxTurns = 10000` as a property so tests can lower it.
  - Emit: `'turn'` at the start of each active `act`; `'snack'` where a `Wrapper` is dropped; `'potion'` where an `EmptyPotion` is dropped; `'door'` where it opens a door; `'enter'` on its first `act` (`turns === -1` before increment); `'heroHurt'` in `Adventurer.prototype.damage` (data `{by:null}`).
- Modify `Entity.prototype.adventurerAct`: loot branch emits `'loot' {entity:this}`; monster branch emits `'hit' {monster:this}` and, when `hp <= 0`, `'faint' {monster:this}`.
- Modify `Entity.prototype.act` ranged branch: when `Game.adventurer.hp--` happens emit `'heroHurt' {by:this}`.
- `Tile.getArt` secret-door hint: only when `Game.phase === 'cleaning'`, distance from `Game.player`.
- `startGameCutscene` line 3 becomes: `'Now that the hero is gone, your monstrous colleagues are relaxing in the staff lounge...'`.
- `index.html`: add `flavor.js`, `messagelog.js`, `sound.js`, `invasion.js` (before `game.js` is fine; all are global objects used at runtime only).

- [ ] **Step 1: Write failing tests**

```js
// tests/invasion.test.js
function runInstant(ctx){ ctx.Game.generateDungeon(); ctx.Game.phase='invasion'; ctx.Invasion.instant=true; ctx.Game.engine.start(); }
test('stats and roster after a full invasion', () => {
  const ctx = bootHeadless(); runInstant(ctx);
  assert.equal(ctx.Game.phase, 'cleaning');
  assert.ok(ctx.Invasion.roster.length > 0);
  assert.equal(ctx.Invasion.stats.fainted, ctx.Invasion.roster.filter(m=>m.hp<=0).length);
  assert.ok(ctx.Invasion.roster.every(m => m.alive && m.retired));      // got up, went to lounge
  assert.equal(ctx.Invasion.bodies.length, 0);
});
test('map memory is wiped at handover', ...);       // every tile lastSeen === ' '
test('handover cutscene starts with report and keeps welcome text', ...); // player.cutscene[0].message includes hero.full; contains 'Now that the hero is gone'
test('messNumbers match mess actually on the map', ...);  // count tiles with mess === Game.messNumbers[0]
test('fail-safe ends invasion on same map', () => {
  const ctx = bootHeadless(); ctx.Adventurer.prototype.maxTurns = 3;   // or instance prop after generate
  ctx.Game.generateDungeon(); const mapRef = ctx.Game.map; ctx.Game.phase='invasion'; ctx.Invasion.instant=true; ctx.Game.engine.start();
  assert.equal(ctx.Game.map, mapRef); assert.equal(ctx.Game.phase,'cleaning'); assert.equal(ctx.Game.adventurer.active,false);
});
test('chainCutscenes renumbers', ...);              // a=[{any:1},{any:-1}], b=[{any:1},{any:-1}] → anys [1,2,3,-1]
test('log receives hit and faint lines when not skipping', ...);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** per Interfaces. **Step 4: Run** → all PASS (including Task 1 baseline, updated to set `Invasion.instant=true` if needed).
- [ ] **Step 5: Commit** — `git commit -m "feat: invasion controller with events, stats, fainting and handover"`

---

### Task 5: Phases, pacing, controls, camera

**Files:**
- Modify: `script/invasion.js`, `script/adventurer.js` (`act`), `script/game.js` (`init`, `generateDungeon`, `nextDay`), `script/player.js` (`act`, `handleEvent`, `getArt`), `tests/phases.test.js` (create)

**Interfaces:**
- Consumes: Task 4 `Invasion`, `Game.phase`, `Game.cameraTarget()`.
- Produces in `Invasion`:
  - `Invasion.BASE_DELAY_MS = 90`, `Invasion.FAST_FACTOR = 4`, `Invasion.BORING_DELAY_MS = 25` (applied when the hero's last turn produced no event other than `'turn'` and it has no live targets). Builder may tune these values after playtesting.
  - `Invasion.fast: boolean`, `Invasion.skipping: boolean`.
  - `Invasion.afterHeroTurn() -> void` — called at the end of every active `Adventurer.act`. If `instant || skipping`: return (engine keeps running). Else `Game.engine.lock()`, `Game.drawMap()`, and schedule one timer (store id in `Invasion.timer`) that sets `Invasion.timer = null` and calls `Game.engine.unlock()`.
  - `Invasion.start() -> void` — phase → `'invasion'`, `event('enter')`. If `Game.engine` has never been started (`Invasion.engineStarted` false) → `Game.engine.start()` and set the flag; otherwise do nothing (the current lock holder will unlock).
  - `Invasion.skip() -> void` — `skipping = true`; `clearTimeout(timer)`; if a timer was pending → `Game.engine.unlock()` exactly once. Hero then runs synchronously to `finish()`. `finish()` resets `skipping=false`, `fast=false`.
  - `Invasion.handleKey(code) -> boolean` — during `'invasion'`: `32` (Space) toggles `fast`; `27` (Esc) → `skip()`; returns `true` if handled. During `'intro'`: any key → `Invasion.start()`.
- `Game.init` / harness: create everything, `generateDungeon()`, and if `day === 1` set phase `'intro'` and draw intro; register one global `keydown` listener (`Game.onKey`) that: calls `Sfx.unlock()`; on `86` (V) calls `Sfx.toggle()` and redraws; otherwise forwards to `Invasion.handleKey` when phase is `intro`/`invasion`. Do **not** call `engine.start()` in `init`.
- `Game.generateDungeon` ends with: `Invasion.reset(this.adventurer)`; if `this.day > 1` → `Invasion.start()` (engine is already started and locked by the player inside the conversation; its pending unlock resumes it — Review Focus 1).
- `Player.handleEvent`: return immediately unless `Game.phase === 'cleaning'`. `Player.prototype.getArt`: while `Game.phase !== 'cleaning'`, return the art of the tile it stands on as if empty (`[tile.char, tile.color, tile.bgColor]`), so the `@` is invisible during intro/invasion.
- Camera: every place in `game.js` `drawMap` that uses `this.player.x/y` / `Game.player.x/y` for viewport and FOV uses `Game.cameraTarget()`.

- [ ] **Step 1: Write failing tests** (manual timers from harness)

```js
test('day 1 boots into intro and waits', ...);     // phase 'intro', adventurer.turns === -1
test('any key starts paced invasion', () => {      // __press(13) → phase 'invasion'; adventurer.turns === 0; one timer pending
});
test('timer advances one hero turn', ...);          // __runTimers() → turns === 1
test('space speeds up', ...);                       // __press(32) → next timer delay === 90/4
test('esc skips to cleaning with no double unlock', () => {
  // start, run 3 timers, __press(27): phase 'cleaning'; no timers pending; player is the actor holding the lock
  // (assert Game.player listener registered exactly once and adventurer.active === false)
});
test('movement keys ignored during invasion', ...);  // record player.x/y; __press(37) → unchanged, turns unchanged
test('day 2 invasion is paced after nextDay', () => {
  // finish day 1 instantly, then call Game.nextDay() from a state where the engine is locked by the player,
  // then simulate the player's unlock (Game.player.endTurn()) → phase 'invasion', exactly one timer pending
});
test('V toggles sound in any phase', ...);
test('player glyph not drawn during invasion', ...); // no __drawn entry with '@'
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: paced invasion with intro screen, fast/skip controls and hero camera"`

---

### Task 6: Layout B — panel, log, bodies, flashes

**Files:**
- Create: `script/panel.js`, `tests/panel.test.js`
- Modify: `script/game.js` (`getSize`, `drawMap`, `sendMessage`), `script/entity.js` (conversation drawing rows if needed), `index.html`, `style/style.css` (only if needed)

**Interfaces:**
- Consumes: `Game.log`, `Invasion.hero/roster/stats/bodies/flashes/fast`, `Sfx.enabled`, `Game.phase`, `Game.cameraTarget()`.
- Produces `Panel` (global object):
  - `Panel.WIDTH = 24`, `Panel.LOG_ROWS = 5`, `Panel.MESS_BAR_MAX = 400`, `Panel.HERO_HP_MAX = 6`.
  - `Panel.layout(cols: number, rows: number) -> {mapCols, mapRows, panelX, logY, offset:[x,y]}` — `panelX = cols - WIDTH` (panel hidden, `panelX = cols`, when `cols < 60`); `mapCols = panelX`; `logY = rows - LOG_ROWS`; separator row at `logY - 1`; `mapRows = logY - 1`; `offset = [floor(mapCols/2), floor(mapRows/2)]`. All values ≥ 1 (clamp). `Game.getSize` stores the result in `Game.layoutInfo` and sets `Game.offset = layout.offset`.
  - `Panel.messCategories() -> {blood, prints, spills, litter, broken, other}` — counts of `Game.map[*].mess`: `broken` = `cleanMethod==='fix'`; `prints` = name ends with `Footprints`; `blood` = name contains `Blood` (not prints); `spills` = Water/Acid/Scorch/Splinters; `litter` = other `cleanMethod==='get'` (excluding `unique` quest items); `other` = the rest.
  - `Panel.lines(phase: string) -> Array<string>` — rot.js `%c{}` formatted lines. Invasion: `── INVASION ──`, `hero.full` (cyan), HP bar (`█` × clamp(hp,0,HERO_HP_MAX) of `HERO_HP_MAX`, green; rest dim) + `hp/HERO_HP_MAX`, `Turn N`, blank, `── MONSTERS ──`, one line per roster monster `glyph name status` with status `unharmed` (hp==maxhp), `fighting!` (`active` && alive), `fainted` (!alive, dim) — truncated to fit with `+N more`, blank, `── MESS ──` bar vs `MESS_BAR_MAX` + count, blank, hints `[Space] fast (on/off)`, `[Esc] skip`, `[V] sound on/off`. Cleaning: `── SHIFT ──`, `Day N`, `Clean` bar + `%`, blank, `── STAFF LOUNGE ──` names of monsters `alive && retired && !partying` (truncate `+N more`), blank, `── MESS LEFT ──` non-zero categories, blank, `[?] help  [V] sound`.
  - `Panel.draw(display, layoutInfo) -> void` — draws `lines(Game.phase)` in the panel column.
- `Game.sendMessage(msg, important)`: keep signature and current semantics (non-important ignored if a fresh message exists; `msg=null` just redraws) but push to `Game.log` instead of drawing one line; `Game.lastMessage = ""` sites call `Game.log.markStale()`.
- `drawMap`: map limited to `mapCols × mapRows`; then bodies (dim `#555` glyph on tiles with no entity, only where visible), then flashes (bg `#a00` for 1–2 turns), separator row of `─` (dim), log rows from `Game.log.recent(LOG_ROWS)` (fresh = white, stale = `#777`), panel. Remove top "Cleanliness/Day" text. Intro phase draws `Flavor.pools.introText` centred in the map area. Help screen and conversations keep drawing in the map area (they use `Game.offset`, which now is the map viewport).

- [ ] **Step 1: Write failing tests**

```js
test('layout 100x40', () => assert.deepEqual(ctx.Panel.layout(100,40), {mapCols:76,mapRows:34,panelX:76,logY:35,offset:[38,17]}));
test('layout narrow hides panel', ...);     // layout(50,20).panelX === 50, mapCols === 50
test('layout tiny stays positive', ...);    // layout(10,6) → all >= 1
test('messCategories counts', ...);          // place makeMess BloodPool, BloodPrints, MudPrints, Wrapper, BrokenTable → {blood:1, prints:2, litter:1, broken:1, ...}
test('invasion panel shows hero, statuses and truncation', ...); // fake roster of 30 → contains 'fainted', '+' more line, length <= rows
test('sendMessage writes to log and keeps non-important semantics', ...);
test('cleaning drawMap does not draw "Cleanliness:" at row 1', ...);
```

- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: layout B with side panel, message log, bodies and hit flashes"`

---

### Task 7: Sound in cleaning actions + browser verification

**Files:**
- Modify: `script/player.js` (`clean`, `openClose`, `moveTo` secret, door), `script/entity.js` (conversation advance → `blip`), `script/tile.js` (`openSecretDoor` → `secret`)

**Interfaces:**
- Consumes: `Sfx.play` names from Task 3.

- [ ] **Step 1: Wire sounds** — mop → `mop`; get/pick up → `pickup`; fix → `fix`; door open/close → `door`; secret passage → `secret`; conversation line advance → `blip`.
- [ ] **Step 2: Run** — `node --test tests/` → all PASS.
- [ ] **Step 3: Browser verification.** Serve with `uv run python -m http.server 8000` and open `http://localhost:8000`. Check and note results:
  1. Day 1: intro text → key → hero `H` enters with camera on it, log lines appear, panel shows hero/roster/mess, bodies stay grey, hits flash.
  2. `Space` speeds up and back; `Esc` skips straight to the report.
  3. Report → welcome text → player in staff room, map unexplored, panel in cleaning mode; mopping/picking up decreases "mess left" and plays sounds; `V` mutes.
  4. Talk to a monster in the lounge; complete the day (go home / dinner) → Day 2 invasion with a new hero name runs paced.
  5. Resize window narrow and wide: no overlap; panel hides below 60 columns.
  6. `?` help and examine (`X`) still work. No console errors throughout.
- [ ] **Step 4: Commit** — `git commit -m "feat: sound effects for cleaning actions"`
