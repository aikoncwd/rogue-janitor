# Coffee-break run, part 2: tools, combos, objectives, rooms, wands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New cleaning tools that matter, cleaning combos, daily objectives on the memo, funny room names in the panel, and wands/staves/rings the hero leaves behind.

**Architecture:** One shared mess-removal path (`Player.removeMess`) used by every tool, so counters, effects, combos and objectives stay in one place. New module `script/goals.js` (`Rooms` names + `Objectives`), called from `DayEvents.start` (the morning, after the invasion). Combos live on `Game.combo`. Wands/rings are new mess types made by the hero's turn (world RNG).

**Tech Stack:** vanilla JS, rot.js 2.2.1, `node:test` + `tests/harness.js`.

**Spec:** `docs/superpowers/specs/2026-11-01-coffee-break-run-design.md` §6, §7, §8, §9b. Base: master `acadc65`.

## Global Constraints

- English in-game text; cozy tone. Non-world randomness (room names, objective picks, ring lore) uses `Flavor.rng`; anything that creates or places mess during the invasion uses `ROT.RNG` on the same path in normal/fast/skip modes.
- Tools by day: vacuum (`Z`) day ≥ 2, squeegee day ≥ 3, scrub brush day ≥ 4. Vacuum is a shortcut: old verbs still clean those messes.
- Vacuum kinds: `Cobweb, Loose Feathers, Spores, Bone Dust, Soot, Gravel, Splinters, Dripped Wax`. Squeegee kinds: `Water, Holy Water, Wet Footprints` (connected flood, cap 12 tiles). Scrub brush: tough stains clear in one pass.
- Combo: a clean within 3 player turns of the previous one extends it; a gap > 3 turns or stepping onto a mess that spreads breaks it. Milestones: 5 → +5 pts, 10 → +10, every further 10 → +20. One log line per milestone.
- Objectives: day 1 → 1, later days → 2; reward +25 pts and +10 zm each; types: `spotless` (a named room), `coins` (all coin piles, only if ≥3), `combo` (reach 15), `chat` (3 colleagues), `fixRoom` (all broken furniture in a named room, only if ≥2 there).
- Rings: at most 2 per raid; they go to `Game.inventory` (saved). New saves without `inventory` still load (default `[]`).
- New scripts go in `index.html` and `tests/harness.js` `DEFAULT_FILES` in the same order.

## Review Focus

1. **Vacuum next to messes it can't take** (blood, litter): only vacuum kinds go, nothing else changes; pressing Z with nothing to vacuum costs no turn spam in the log. → Task 1 test `vacuum only takes dry fluff`.
2. **Squeegee on a huge flood**: never removes more than 12 tiles per press. → Task 1 test `squeegee stops at 12`.
3. **Objective room that is already spotless at dawn** or has no mess: never picked. → Task 3 test `spotless goals pick a dirty room`.
4. **Old save without inventory/combo fields**: Continue works. → Task 4 test `old saves load without inventory`.
5. **Player standing in a room-less corridor**: panel shows "a corridor", no crash. → Task 3 test `corridors have a name`.

---

### Task 1: Tools (spec §6)

**Files:** Modify `script/player.js` (`clean` → uses `removeMess`; new `vacuum`, squeegee in `clean('mop')`, brush in scrub branch; `Z` key), `script/game.js` (`TOOL_DAYS`, `hasTool`, help text), `script/dayevents.js` (memo line on a tool's first day), `script/flavor.js` (howto mention). Test: `tests/tools.test.js`.

**Interfaces:** Produces `Game.TOOL_DAYS = {vacuum: 2, squeegee: 3, brush: 4}`, `Game.hasTool(name): boolean`, `Game.VACUUM_KINDS`, `Game.WATER_KINDS` (arrays of `kind`), `Player.prototype.removeMess(key: string, tool: string): void` (all bookkeeping of a successful clean: messages stay with callers), `Player.prototype.vacuum(): boolean`.

- [ ] Tests: `vacuum only takes dry fluff` (day 2; cobweb + feathers + blood around → Z removes 2, blood stays, `shift.cleaned` +2); `no vacuum on day 1` (Z does nothing, message says it arrives tomorrow); `old verbs still clean fluff` (day 2, P picks feathers); `squeegee clears a connected puddle` (day 3, 5 connected Water tiles → one M clears all 5); `squeegee stops at 12`; `no squeegee before day 3` (M clears one water tile); `scrub brush clears tough stains in one pass` (day 4, acid needs 1 press; day 3 still several); `memo announces new equipment` (day 2 morning log contains `vacuum`).
- [ ] Run → FAIL. Implement. Run `node --test tests/` → PASS. Commit `feat: a vacuum, a squeegee and a scrub brush`.

### Task 2: Combos (spec §7)

**Files:** `script/game.js` (`combo` state, `comboHit()`, `comboBreak()`, reset in `generateDungeon`), `script/player.js` (turn counter in `act`, break in `moveTo`), `script/panel.js` (`Combo x7`), `run.bestCombo`. Test: `tests/combo.test.js`.

**Interfaces:** `Game.turnCount: number` (+1 per player turn), `Game.combo = {count, lastTurn, bestToday}`, `Game.comboHit(): void` (called by `removeMess`), `Game.comboBreak(): void`, `Game.comboBonus(count): number` (5→5, 10→10, 20/30/…→20, else 0), `Game.run.bestCombo: number`.

- [ ] Tests: `quick cleans build a combo`; `a pause breaks it` (4 waits); `stepping in a spreading mess breaks it`; `milestones pay once` (count 5 → +5 pts, one log line); `panel shows the combo`; `best combo reaches the run`.
- [ ] Run → FAIL. Implement. Run suite → PASS. Commit `feat: cleaning combos`.

### Task 3: Room names and daily objectives (spec §8)

**Files:** Create `script/goals.js` (`Rooms`, `Objectives`); modify `index.html`, `tests/harness.js`, `script/dayevents.js` (`start` builds names + objectives, memo lines), `script/panel.js` (`Room:` line, `── GOALS ──` block), `script/player.js`/`script/entity.js` (call `Objectives.check()` after a clean and after a chat). Test: `tests/goals.test.js`.

**Interfaces:** `Rooms.name(roomIndex): string`, `Rooms.at(x, y): string` ("a corridor" outside rooms; `"the Staff Lounge"` for `Game.staffRoomID`), `Rooms.generate(): void` (fills `Game.roomNames` with `Flavor.rng`); `Objectives.list: [{type, room?, label, done}]`, `Objectives.generate(): void`, `Objectives.check(): void` (marks done, pays +25 pts / +10 zm, logs once), `Objectives.lines(width): string[]`. `Game.run.goalsDone: number`.

- [ ] Tests: `every room gets a name, lounge keeps its own`; `corridors have a name`; `day 1 has one goal, later days two`; `spotless goals pick a dirty room`; `finishing a goal pays once`; `goals show on the memo and the panel`; `combo goal counts the combo`.
- [ ] Run → FAIL. Implement. Run suite → PASS. Commit `feat: room names and daily goals`.

### Task 4: Wands, staves and rings (spec §9b)

**Files:** `script/mess.js` (types `BrokenWand`, `CrackedStaff`, `LostRing`), `script/adventurer.js` (`tryZap`, `tryDropRing` in the hero turn), `script/invasion.js` (events `zap`, `ring`), `script/flavor.js`/`script/lore.js` (materials, zap lines, ring lore), `script/player.js` (ring → inventory), `script/game.js` (`inventory`), `script/save.js` (save `inventory`; missing → `[]`). Test: `tests/wands.test.js`.

**Interfaces:** `Game.inventory: [{kind:'ring', name, lore}]`; `Adventurer.prototype.tryZap(): boolean` (≤ 2 per raid, a mess effect + a used-up wand/staff litter at the hero's tile); `Adventurer.prototype.tryDropRing(): boolean` (≤ 2 per raid); `Lore.wandMaterials: [{name, color}]`, `Lore.zapEffects: [{line, mess}]`, `Lore.ringNames`, `Lore.ringLore`.

- [ ] Tests: `the hero leaves used-up wands` (run a raid with forced chance → litter named like `Snapped Oak Wand`, glyph `/`, picked with P); `at most two rings per raid`; `picking up a ring fills the inventory`; `same mess watched or skipped` (existing determinism test still passes; add a wand-count comparison); `old saves load without inventory`.
- [ ] Run → FAIL. Implement. Run suite → PASS. Commit `feat: wands, staves and rings in the hero's wake`.

### Task 5: Chrome check + README

- [ ] Play day 2–4 in Chrome: Z vacuums, squeegee on water, brush on acid, combo line, Room line, goals on memo/panel, a wand on the floor. Screenshot panel. Update README features. Suite green. Commit.
