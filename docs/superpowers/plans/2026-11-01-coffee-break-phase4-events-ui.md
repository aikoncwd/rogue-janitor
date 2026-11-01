# Coffee-break run, part 4: new shift events and the UI pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Three new shift events (the flooding fountain, the sleeping dragon, the goblin intern) and the UI pass (end-of-shift report card, coloured clean bar and a shine on cleaned tiles, automatic zoom that fits the dungeon, a minimap, torch light).

**Architecture:** Events extend `DayEvents` (`EVENTS`, `eligible`, `run`) plus a per-turn `DayEvents.tick()` called from `Player.act`; the dragon and the intern are plain map objects (like Mimsy: `tags`, `getArt`, `cleanerAct`, `describe`), not comrades. UI: `Scenes.setReport()` (a literal scene like the plaque), `Game.shine`, `Game.fitFontSize()`, `Panel.minimapLines()`, `Light` helpers used by `Game.drawMap`.

**Tech Stack:** vanilla JS, rot.js 2.2.1, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-01-coffee-break-run-design.md` §9 and §12. Base: `feat/phase3-part2` after part 3.

## Global Constraints

- Events use `ROT.RNG` (world changes; decided in `DayEvents.start`, same in every raid mode). Flood: day ≥ 3 and a fountain; dragon: day ≥ 3; intern: day ≥ 2.
- Flood: the fountain breaks (its normal smash path) and Water covers free floor within radius 3 of it.
- Dragon: naps on a corridor tile (not next to a door); bump 1–2 = sleepy line, bump 3 = rolls over and you swap places (achievement `dragon`); snores a Soot puff on a neighbouring tile every 15 player turns, at most 6.
- Intern: follows one step behind you; 15% chance per turn of a small mess on its tile (`Wrapper`, `AppleCore`, `Water`), at most 10; leaves for the lounge after 60 turns or when you bump it ("training", achievement `intern`).
- UI must stay readable: lighting only tints passable floor tiles without an entity; walls keep their colours; text screens unaffected.
- Auto-zoom only when the player has no saved zoom (`rj-font` absent); manual `+`/`-` still wins; `0` returns to auto (now: fit the dungeon).
- Clean bar colours: < 50% `#c33`, < 80% `#cc3`, else `#0c0`. Shine: `Game.SHINE_MS = 2500`.

## Review Focus

1. **Dragon on the only corridor to a room**: you can always get past (bump 3 swaps). → Task 1 `the dragon rolls over on the third bump`.
2. **Intern with nowhere to step** (player in a dead end): it waits, never overlaps the player or a comrade. → Task 1 `the intern never stands on someone`.
3. **Flood with no free floor around the fountain**: no crash, fewer tiles. → Task 1 `flood fills free floor only`.
4. **Auto-zoom on a tiny window / huge dungeon**: clamped to MIN/MAX font. → Task 3 `auto zoom is clamped`.
5. **Minimap on a short panel**: hidden instead of pushing the hints off. → Task 4 `minimap only when there is room`.

---

### Task 1: Events — flood, dragon, intern (spec §9)
Files: `script/dayevents.js`, `script/player.js` (tick, previous position), `script/lore.js` (news, lines). Test `tests/events.test.js`.
Interfaces: `DayEvents.tick()`; `DayEvents.dragon`/`DayEvents.intern` (objects or null, reset in `start`); `Player.prevX/prevY`.
- [ ] Tests: `flood fills free floor only`; `the dragon naps in a corridor and rolls over on the third bump`; `the dragon snores soot, capped`; `the intern follows and makes a little mess, capped`; `the intern never stands on someone`; `bumping the intern sends it to training`; `events are eligible by day`.
- [ ] RED → implement → GREEN → commit `feat: a flooding fountain, a sleeping dragon and a goblin intern`.

### Task 2: Report card, clean bar colours, shine (spec §12)
Files: `script/scenes.js` (`setReport`), `script/conversations.js` (report node), `script/game.js` (`reportCardLines`, `shine`, draw tint, redraw timer), `script/panel.js` (`barColor`). Test `tests/report-card.test.js`.
- [ ] Tests: `the report is a framed card above a short line`; `card lines share one width`; `the clean bar changes colour by tier`; `cleaned tiles shine for a moment`.
- [ ] RED → implement → GREEN → commit `feat: a report card and a little shine`.

### Task 3: Automatic zoom that fits the dungeon (spec §12)
Files: `script/game.js` (`fitFontSize`, call after `generateDungeon` and on `0`). Test `tests/auto-zoom.test.js`.
- [ ] Tests: `with no saved zoom the font fits the dungeon`; `a saved zoom wins`; `auto zoom is clamped`.
- [ ] RED → implement → GREEN → commit `feat: automatic zoom fits the dungeon`.

### Task 4: Minimap (spec §12)
Files: `script/panel.js` (`minimapLines(width, height)`, placement). Test `tests/minimap.test.js`.
- [ ] Tests: `the minimap shows the player and explored rooms`; `unexplored stays blank`; `minimap only when there is room`.
- [ ] RED → implement → GREEN → commit `feat: a minimap in the panel`.

### Task 5: Torch light (spec §12)
Files: `script/game.js` (`lightTint`), draw loop. Test `tests/light.test.js`.
- [ ] Tests: `floor near a torch is warm`; `walls keep their colours`; `drawing stays deterministic` (no ROT.RNG use).
- [ ] RED → implement → GREEN → commit `feat: torch light`.

### Task 6: Chrome check + README
- [ ] Play a day 3–5 in Chrome: flood, dragon, intern, card, zoom, minimap, light. Screenshots. README. Suite green. Commit.
