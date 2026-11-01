# Cozy Humor — Phase 2 (Content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill the dungeon with roguelike humour: funny item variants on existing glyphs, rumors and fortune cookies, new hero classes and invasion events, Rodney and the Amulet, small cozy events during the shift, NetHack-style easter eggs that colleagues hint at, an end-of-shift plaque — plus the pacing revision and the wall-torch background the user asked for after playing phase 1.

**Architecture:** Plain browser scripts on globals. New data lives in `script/lore.js` (`Lore`: variants, rumors, memos, hints, killedBy, visitor lines); invasion text stays in `script/flavor.js`. A mess keeps its canonical name in `mess.kind` so all logic keys off `kind` while `name` can be a funny variant. New modules: `script/dayevents.js` (`DayEvents`, `Visitors`) and `script/eastereggs.js` (`EasterEggs`).

**Tech Stack:** Vanilla JS, rot.js 2.0.3, `node --test` with `tests/harness.js`.

**Spec:** `docs/superpowers/specs/2026-11-01-title-screen-and-cozy-humor-design.md` — phase 2 = §5 item variety, §6 classes/events, "Pacing revision", "Wall torch background", "Yendor, Rodney and the Amulet", §7 cleaning-day events, §8 rumors, §9 easter eggs (incl. "Colleagues drop hints"), §10 plaque.

## Global Constraints

- No build step / npm; plain scripts + rot.js. New `script/*.js` files go in **both** `index.html` and `DEFAULT_FILES` (`tests/harness.js`), same order (enforced by `tests/index-html.test.js`). Order: `script/lore.js` right after `script/flavor.js`; `script/dayevents.js` and `script/eastereggs.js` right after `script/conversations.js`.
- All in-game text in **English**; tone: cozy workplace comedy, never mean or gory.
- No new glyphs or tiles.
- **World vs presentation RNG:** anything that changes the world (mess, variants, teleports, events, visitors) uses `ROT.RNG` and runs identically when the invasion is watched, fast-forwarded or skipped; pure text choices use `Flavor.rng` / `Flavor.line` / `Flavor.chance`. `tests/determinism.test.js` must keep passing after every task.
- Logic must use `mess.kind`, never `mess.name`, to recognise a mess type.
- Run tests with `timeout 100 node --test tests/` (206 passing at plan time).

## Review Focus

1. **`#` on a Spanish keyboard** (AltGr+3: `ctrlKey`/`altKey` true, `e.key == '#'`) must open the prompt, and letters typed in it (`m`, `p`, `h`...) must never mop/move. (Task 5 test `prompt swallows game keys and works with AltGr`.)
2. **A cutscene or conversation opening while the `#` prompt is open** — the prompt closes silently; no stray input. (Task 5 test `prompt closes when a conversation starts`.)
3. **Visitors leaking into the next day** (invasion roster, panel, monsterList) — they are removed in `Game.nextDay`. (Task 4 test `visitors leave before the next invasion`.)
4. **Quest items and unique messes never get a variant name.** (Task 2 test `quest items keep their names`.)
5. **Variant names inside existing sentences** ("Stand next to the … to pick it up", "You scrub the …") stay grammatical enough: no double articles, plural rule only on real plurals. (Task 2 test `variant names read well in cleaning messages`.)

---

### Task 1: Pacing revision and wall-decor backgrounds

**Files:**
- Modify: `script/invasion.js` (beats → base speed + small extras)
- Modify: `script/entity.js` (attachToWall adopts the wall's background)
- Modify: `tests/pacing.test.js`, `tests/phases.test.js` (old BEATS assertions)
- Test: `tests/pacing.test.js`, `tests/wall-decor.test.js` (new)

**Interfaces:**
- Produces: `Invasion.WALK_MS = 90`, `Invasion.ACTION_MS = 200`, `Invasion.EXTRA_MS = { potion: 120, snack: 100, cry: 100, faint: 120, special: 150, graffiti: 100, enter: 150, lost: 150, scroll: 150, saveScum: 150, elbereth: 120, backIn5: 100, quip: 100 }`, `Invasion.MAX_TURN_MS = 350`.
  - `Invasion.beat(name: string)`: marks the turn busy; `extra = max(extra, EXTRA_MS[name] || 0)`; speech names (`snack, potion, special, graffiti, enter, cry, lost, scroll, saveScum, elbereth, backIn5, quip`) set `speaking`. No line-length scaling (drop the `line` parameter's effect; callers may still pass it).
  - `Invasion.turnDelay() -> number`: `min(MAX_TURN_MS, (busy ? ACTION_MS : WALK_MS) + extra)`, then `/ FAST_FACTOR` when fast. A turn is busy if any beat happened or `Game.adventurer.targets.length > 0`.
  - `afterHeroTurn` resets `busy`, `extra`, `speaking` after scheduling (same ordering as today). Remove `BEATS`, `hold`, `SPEECH`.
- Entity: when `attachToWall` moves an entity onto a wall tile and the entity's `bgColor` is `'#000'`, set `this.bgColor` to that tile's `bgColor` (the exit door keeps its own `'#c33'`).

- [ ] **Step 1: Write the failing tests**

`tests/pacing.test.js` — replace the BEATS-based tests (keep `skipping schedules no hero timers`, `hold resets…`→ renamed `pacing state resets after the hero turn is scheduled`, the Space-rescaling test, the varied-rhythm test) with:
```js
test('walking turns use the original walking speed', () => { /* busy=false, extra=0, no targets: turnDelay() == 90 */ });
test('turns with action use the original action speed', () => { /* event('hit') -> 200; event('door') -> 200; event('loot') -> 200 */ });
test('special actions add a little on top', () => { /* event('potion') -> 320; event('special') -> 350; event('faint') -> 320 */ });
test('no turn is longer than MAX_TURN_MS', () => { /* every EXTRA_MS key: beat(k); turnDelay() <= 350 */ });
test('fast mode divides the whole turn', () => { /* event('potion'); Space; turnDelay() == 320 / 4 */ });
```
Varied-rhythm test: seen delays include 90 and 200, and some value > 200.
`tests/wall-decor.test.js`:
```js
test('a wall torch takes its wall background', () => {
    // mini map: floor 0,0 ('#000' bg), wall 0,1 with bgColor '#777'; GetEntity('Torch',0,0)
    // torch at 0,1 and torch.bgColor == '#777'; Tile getArt() for 0,1 returns bg '#777'
});
test('the exit door keeps its red background', () => { /* same map, GetEntity('ExitDoor',0,0).bgColor == '#c33' */ });
```

- [ ] **Step 2: Run to verify they fail** — `timeout 100 node --test tests/pacing.test.js tests/wall-decor.test.js` — FAIL.
- [ ] **Step 3: Implement** as in Interfaces; update `tests/phases.test.js` `turn delay…` test to the new numbers.
- [ ] **Step 4: Run all tests** — `timeout 100 node --test tests/` — all pass.
- [ ] **Step 5: Commit** — `git commit -m "feat: replay back to its original speed with small holds; wall decor takes the wall background"`

---

### Task 2: Mess kinds, item variants, examine text, rumors and fortune cookies

**Files:**
- Create: `script/lore.js`
- Modify: `script/mess.js` (`Mess` gets `kind`; `makeMess` applies variants; `makeVariant`), `script/panel.js` (`messCategories` uses `kind`), `script/conversations.js` (`Requests` tests use `kind`), `script/invasion.js` (blood count uses `kind`), `script/game.js` (examine shows `desc`), `script/player.js` (fortune cookie on pickup)
- Modify: `index.html`, `tests/harness.js`
- Test: `tests/variants.test.js` (new)

**Interfaces:**
- Produces:
  - `mess.kind` (string) = the canonical name passed to `new Mess(...)`; never changed afterwards (`QuestMess` renames `name` only).
  - `Lore.VARIANT_CHANCE = 0.4`; `Lore.variants`: `{ [makeMessType]: Array<{ name, desc?, pickup? }> }` for `LoosePages, SpentScroll, EmptyPotion, EmptyBottle, AppleCore, DroppedSword, GoldCoins, Crossword, EmptyMug, Wrapper` — at least 3 each, copy from spec §5 plus the two fake amulets of Yendor on `Crossword`; `AppleCore` includes `{ name: 'Fortune Cookie', pickup: 'fortune' }`. Examine `desc` for the Necronomicon ("You decide not to read it. Good call.") and KLAATU scroll ("You remember the first two words. The third one... nectar? nickel?").
  - `Lore.rumors`: ≥ 40 lines, each starting with "They say" (spec §8 list, Rodney/Amulet lines, Brogue, DCSS, Sil, Angband, Infra Arcana, Cogmind, RNG, procgen, permadeath). `Lore.rumor() -> string` via `Flavor.rng`.
  - `makeMess(x, y, type)` — after creating the mess and its tough-stain setup, if `type in Lore.variants` and `ROT.RNG.getUniform() < Lore.VARIANT_CHANCE`: copy a random variant (`ROT.RNG.getItem`) into `name`, `desc`, `pickup`. Glyph, colours, importance, cleanMethod and spreading are untouched.
  - `makeVariant(x, y, type, variantName) -> Mess`: `makeMess` then force `name = variantName` (and that variant's `desc`/`pickup` if it is in the table). Used by Tasks 3 and 4.
  - Examine of a mess: `name + ". " + (desc ? desc + " " : "") + action`.
  - Picking up a mess with `pickup == 'fortune'` logs `You crack the fortune cookie. It reads: "<rumor>"`.
  - The title tagline (`script/title.js`) shows `Lore.rumor()` instead of a `titleTaglines` line one time in four (`Flavor.chance(0.25)`), skipping rumors longer than the screen; test `title sometimes shows a rumor` (stub `Flavor.chance` true → tagline is in `Lore.rumors`).
  - `TOUGH_STAINS`, `panel.messCategories`, `Requests` tests (`conversations.js` ~1006–1024) and `Invasion.finish` blood count use `kind`.

- [ ] **Step 1: Write the failing tests** `tests/variants.test.js` (boot, `generateDungeon()`, use a free floor key with no mess/entity)

```js
test('every variant keeps its type: glyph, colour, clean method and kind', () => {
    // for each type in Lore.variants: base = makeMess on a cleared tile with Lore.VARIANT_CHANCE = 0
    // then 30 makeMess with VARIANT_CHANCE = 1: same char/color/cleanMethod, kind == base.name, name in the table
});
test('variants show up about 40% of the time', () => { /* 200 LoosePages: 20%..60% have name != kind */ });
test('quest items keep their names', () => { /* QuestMess(monster,x,y).name starts with monster.name + "'s " and kind is a quest type */ });
test('panel categories and favours count variants by kind', () => {
    // a 'Scroll labeled KLAATU BARADA NIKTO' (kind 'Loose Pages') counts as litter;
    // Requests pages test(m) true for it; 'Scattered Zorkmids' passes the coins test
});
test('examine shows the variant description', () => {
    // makeVariant(..., 'LoosePages', 'Page of the Necronomicon (do not read aloud)'); examine it: transient includes 'You decide not to read it.'
});
test('fortune cookies hold a rumor', () => {
    // makeVariant next to the player, 'AppleCore', 'Fortune Cookie'; player.clean('get'); last log line starts 'You crack the fortune cookie' and contains a Lore.rumors entry
});
test('variant names read well in cleaning messages', () => {
    // pick up 'Scattered Zorkmids' -> 'You pick up the scattered zorkmids.'; no 'the the'
});
test('rumors: at least 40, all "They say..."', () => { /* Lore.rumors.length >= 40 && every(l => l.startsWith('They say')) */ });
```

- [ ] **Step 2: Run to verify they fail** — `timeout 60 node --test tests/variants.test.js` — FAIL (`Lore` undefined).
- [ ] **Step 3: Implement** as in Interfaces (add `script/lore.js` to `index.html` and `DEFAULT_FILES`).
- [ ] **Step 4: Run all tests** — all pass (existing favour/panel tests prove the `kind` switch).
- [ ] **Step 5: Commit** — `git commit -m "feat: funny item variants on existing glyphs, rumors and fortune cookies"`

---

### Task 3: New hero classes, invasion events, Rodney and the Amulet

**Files:**
- Modify: `script/adventurer.js` (classes, specials, `tryEvent`, save-scum, Elbereth)
- Modify: `script/invasion.js` (event cases, quips, stats), `script/flavor.js` (pools), `script/player.js` (Elbereth erase line)
- Test: `tests/invasion-content.test.js` (new)

**Interfaces:**
- Consumes: `makeVariant` (Task 2), `Invasion.beat` names (Task 1).
- Produces:
  - `Adventurer.classes` adds `Tourist { color:'#fd8', hp:5, dmg:1, every:20, special:'snapshot', stat:'Photos taken' }`, `Valkyrie { color:'#adf', hp:7, dmg:2, every:30, special:'frost', stat:'Battle cries' }`, `Speedrunner { color:'#f6a', hp:4, dmg:1, every:25, special:'energyDrink', stat:'Frames saved' }`, `Necromancer { color:'#9a9', hp:5, dmg:1, every:30, special:'readAloud', stat:'Pages read aloud' }`. Signature mess via `makeVariant`: Tourist → `Wrapper` "Expensive Gift Shop Receipt" + `GoldCoins` "Overpriced Souvenir Coins"; Valkyrie → `Water` "Melted Frost" ×2; Speedrunner → `EmptyBottle` "Energy Drink Can"; Necromancer → `LoosePages` "Page of the Necronomicon (do not read aloud)".
  - `Flavor.pools`: `special_Tourist|Valkyrie|Speedrunner|Necromancer` (3 lines each, spec §6 jokes: flash photo, "VALHALLA!", "ANY%!"/"FRAME PERFECT!", "KLAATU BARADA... NECKTIE?"); `heroClass` += the 4; `heroFirst` += "Rodney", "Yasd the Unlucky", "Ascension Andy", "Scummy McSavefile", "Gelatinous Kevin's Cousin"; `heroLast` += "Bones", "of Seed 42"; `heroQuip` (≥ 8, spec §6 list); `heroAmulet` ("WHERE IS THE AMULET OF YENDOR?!", "I'm here for the Amulet!"…) and `rodneyReply` ("Rodney has it. Again.", "Bottom floor, take the stairs, mind the wet floor sign."…); `heroLost`, `monsterDirections`, `scrollRead`, `scrollOutcome_teleport|loss|menu|confetti`, `backIn5`, `saveScum` ("You die... Do you want your possessions identified? ...Restoring from save."), `saveScumReply` ("Wait, didn't we just...?"), `elbereth`, `elberethReply` ("Oh, Elbereth. Sure. *walks around it politely*") — ≥ 3 lines each.
  - `Adventurer.prototype.tryEvent()`: called once per active hero turn after the existing turn logic; world randomness via `ROT.RNG`; at most one event every `Adventurer.EVENT_GAP = 25` turns, `Adventurer.EVENT_CHANCE = 0.06` per eligible turn; picks among eligible: `lost` (an awake monster within 6 tiles; drops `makeVariant(Crossword, 'Hand-drawn Map (wrong)')`), `scroll` (outcome by `ROT.RNG` among teleport / loss / menu / confetti; teleport moves the hero to a random passable, entity-free floor tile and forces a path recalculation; confetti = `splat('LoosePages',1,3)`; always drops a `SpentScroll`), `backIn5` (≥1 fainted and ≥1 awake roster monster; text only), `elbereth` (like `tagWall` but the graffiti `name = 'Engraving: Elbereth'`, `mess.elbereth = true`). Emits `Invasion.event(<name>, data)`.
  - Save-scum: in `takeTurn`, the **first** time `hp<=0 && turns%5==0` in an invasion: `hp = maxHp`, `this.savedOnce = true`, `Invasion.event('saveScum')` — no potion mess, no potion stat. Later ones use the existing potion path.
  - `Invasion.event` cases for `lost, scroll, backIn5, saveScum, elbereth` (log + `beat`); `turn` also rolls `Flavor.chance(0.03)` for `heroQuip`; `enter` rolls `Flavor.chance(0.3)` for `heroAmulet` followed by a `rodneyReply` from a random roster monster. `Speedrunner` turns: `turnDelay()` × 0.7.
  - `Invasion.finish()` sets `Game.amuletStolen = Flavor.chance(0.25)` (read by Task 4's memo).
  - `Player.clean`: finishing a mop on a mess with `elbereth` logs `You erase the engraving. Sorry, Elbereth.` instead of the usual line.

- [ ] **Step 1: Write the failing tests** `tests/invasion-content.test.js`

```js
test('new classes have a special, a stat and flavor lines', () => { /* 4 classes in Adventurer.classes and Flavor.pools.heroClass; special_* pools >= 3 */ });
test('each new special leaves its signature mess', () => {
    // generateDungeon; hero.setClass(cls); call hero[def.special](); a mess with the variant name is on the map
});
test('special events are spaced out', () => {
    // instant invasion over seeds 1..5 with an event counter (wrap Invasion.event): consecutive special-event turns differ by >= 25
});
test('save-scum happens once and replaces that potion', () => {
    // hero.hp = 0; hero.turns = 10; takeTurn(): hp == maxHp, stats.potions unchanged, savedOnce;
    // hero.hp = 0; turns = 15; takeTurn(): stats.potions + 1
});
test('scroll teleport lands on a free floor tile', () => { /* force outcome 'teleport'; tile passable, entity is the hero */ });
test('Elbereth engraving is graffiti and apologises when erased', () => {
    // force the elbereth event next to a wall; mess.kind == 'Graffiti', name includes 'Elbereth';
    // player mops it until gone; log includes 'Sorry, Elbereth.'
});
test('Rodney and the Amulet appear in the invasion lines', () => { /* heroAmulet and rodneyReply pools exist, >= 3, mention Amulet/Rodney */ });
```

- [ ] **Step 2: Run to verify they fail** — FAIL.
- [ ] **Step 3: Implement** as in Interfaces.
- [ ] **Step 4: Run all tests** — all pass, including `tests/determinism.test.js`.
- [ ] **Step 5: Commit** — `git commit -m "feat: tourist, valkyrie, speedrunner and necromancer heroes; lost heroes, scrolls, save-scums, Elbereth and Rodney"`

---

### Task 4: Shift events — memos, visitors, birthdays, mimic stains, rubber duck, bones, Rodney

**Files:**
- Create: `script/dayevents.js` (`Visitors`, `DayEvents`)
- Modify: `script/invasion.js` (`finish` calls `DayEvents.start()`), `script/game.js` (`nextDay` calls `Visitors.clear()`; examine of an entity shows `examineText`), `script/conversations.js` (`exitPrompt` inspector line), `script/player.js` (mimic stain giggle), `script/lore.js` (memos, visitor lines)
- Modify: `index.html`, `tests/harness.js`
- Test: `tests/dayevents.test.js` (new)

**Interfaces:**
- Consumes: `makeVariant` (Task 2), `Game.amuletStolen` (Task 3), `Lore`.
- Produces:
  - `Lore.memos` (≥ 10, spec §7 memos + "MEMO: Rodney, please return the Amulet to lost & found."), `Lore.amuletMemo` ("The Amulet of Yendor has been stolen again. Rodney says it's fine, he has spares."), `Lore.visitors = { inspector, bones, rodney }` (each: `name`, `char`, `color`, `lines: string[]`), `Lore.inspectorVerdict = { good: [...], bad: [...] }`, `Lore.birthdayLines`.
  - `Visitors.add({ name, char, color, lines }) -> Entity`: an `Entity` with tags `{ monster: true, visitor: true }`, `retired: true`, placed on a random passable, entity-free, mess-free tile inside `Game.rooms[Game.staffRoomID]`; `convos = [[{ action: 'waves at you.', any: -1 }], <lines as nodes {text, any: i+1} … last any: -1>]`. `Visitors.clear()`: removes every `visitor` entity from `Game.monsterList` and the map.
  - `DayEvents.EVENTS = ['inspector','birthday','mimicStain','rubberDuck','bones','rodney']`; `DayEvents.start()` (called at the end of `Invasion.finish`): always logs `%c{#ff0}MEMO:%c{} <memo>` (the Amulet memo when `Game.amuletStolen` from the day before, else `Lore.memos` via `Flavor.rng`); on `Game.day >= 2`, with `ROT.RNG` picks one eligible event (25% none) and calls `DayEvents.run(name)`. Eligibility: `bones` needs `Game.day >= 3` and `Game.pastHeroes.length > 0`; `rodney` needs `Game.day >= 4`; `rubberDuck` needs an intact Fountain; `mimicStain` needs a mop-able mess. `Game.todayEvent = name`.
  - `DayEvents.run(name)`:
    - `inspector`: `Visitors.add(Lore.visitors.inspector)`; `exitPrompt` adds, right after the shift report, a line from `inspectorVerdict.good` (and `Game.yendorPoints += 100`) when `cleanPercent() >= 80`, else from `.bad`.
    - `birthday`: random lounge monster `m.birthday = true`; `makeVariant` an `AppleCore` named "Birthday Cake" on a free lounge tile; push a convo onto `m.convos` (`Lore.birthdayLines`, last node `globalTags: { yendorPoints: 30 }`).
    - `mimicStain`: a random mess with `cleanMethod == 'mop'` gets `mimic = true`; finishing it logs `Hehe, that tickles!` and `The stain was a mimic! It giggles and scurries off to the lounge.`
    - `rubberDuck`: the fountain entity gets `examineText = "There's a rubber duck in it. It knows things. You explain your problems to it."`; examining an entity shows `name + ". " + (examineText || '')`.
    - `bones`: `Visitors.add` with name `"Ghost of " + pastHero.full`, ghost glyph/colour of the existing Ghost monster, lines from `Lore.visitors.bones` with `{hero}` and `{killedBy}` (from `Lore.killedBy`, Task 6 pool — define the pool here, Task 6 reuses it).
    - `rodney`: `Visitors.add(Lore.visitors.rodney)` (char `@`, colour `#f0f`, tea, retirement, heroes "who never call", the Amulet in his sock drawer).
  - `Game.pastHeroes`: `Invasion.finish` pushes `{ full: hero.full, cls }` each day.
  - `Game.nextDay` starts with `Visitors.clear()`.

- [ ] **Step 1: Write the failing tests** `tests/dayevents.test.js` (instant day 1 to cleaning via `toIntro` + Enter presses; use `Game.day = n` and `DayEvents.run(name)` directly)

```js
test('every shift starts with a memo', () => { /* after day-1 handover a log line starts with 'MEMO:' (strip colour codes) */ });
test('no shift event on day 1', () => { /* Game.todayEvent == null */ });
test('the stolen Amulet makes the next memo', () => { /* Game.amuletStolen = true; DayEvents.start(); memo == Lore.amuletMemo */ });
test('inspector visits and judges the shift', () => {
    // run('inspector'): a visitor named Inspector... in the lounge; exitPrompt() has a verdict line after the report;
    // cleanPercent stubbed to 90 -> yendorPoints +100
});
test('birthday: cake in the lounge and a birthday chat', () => { /* cake mess kind 'Apple Core' named 'Birthday Cake' inside the lounge; m.convos last has birthday lines */ });
test('mimic stain giggles when cleaned', () => { /* run('mimicStain'); mop it fully next to the player; log has 'Hehe, that tickles!' */ });
test('rubber duck in the fountain', () => { /* place/find a Fountain; run('rubberDuck'); examine it: transient includes 'rubber duck' */ });
test('bones: a previous hero haunts the lounge', () => { /* Game.day = 3; pastHeroes = [{full:'Chad the Bard'}]; run('bones'); visitor 'Ghost of Chad the Bard' */ });
test('Rodney visits from day 4', () => { /* run('rodney'); visitor named Rodney...; talking to him shows Amulet lines */ });
test('visitors leave before the next invasion', () => {
    // run('inspector'); Game.nextDay(): no entity with tags.visitor in monsterList or on the map; Invasion.roster has none
});
```

- [ ] **Step 2: Run to verify they fail** — FAIL.
- [ ] **Step 3: Implement** as in Interfaces (add `script/dayevents.js` to `index.html` and `DEFAULT_FILES`).
- [ ] **Step 4: Run all tests** — all pass, including determinism.
- [ ] **Step 5: Commit** — `git commit -m "feat: daily memos and cozy shift events: inspector, birthdays, mimic stains, rubber duck, bones and Rodney"`

---

### Task 5: Easter eggs and colleague hints

**Files:**
- Create: `script/eastereggs.js` (`EasterEggs`)
- Modify: `script/player.js` (`#`, `Q`, prompt routing, mop name line), `script/game.js` (`onKey` Konami tracking; prompt shown as the newest log row; prompt closes when a conversation starts), `script/conversations.js` (`buildConvos` hint), `script/lore.js` (hints), `index.html`, `tests/harness.js`
- Test: `tests/eastereggs.test.js` (new)

**Interfaces:**
- Produces:
  - `EasterEggs.prompt` (`null` or the typed string), `EasterEggs.openPrompt()`, `EasterEggs.handleKey(e) -> boolean` (printable `e.key` of length 1 appends, max 24 chars; Backspace deletes; Enter runs; Esc cancels), `EasterEggs.run(command: string)`, `EasterEggs.promptText() -> string` (`'# ' + prompt + '_'`).
  - Commands (case-insensitive, first word): `pray` (first per day: "You feel a hopeful feeling. The bucket refills."; again: "You feel that the Mop God is displeased."), `xyzzy` ("Nothing happens."), `elbereth` ("You write Elbereth in the dust with your mop. Then you mop it."), `name <text>` (saves to `localStorage['rj-mop']` in try/catch, ≤ 20 chars; replies "You call your mop: <text>."), `chat` ("You talk to yourself. You agree with yourself."), `quit` (same as `Q`), else "Unknown extended command. (Try #pray.)".
  - `Q` (keyCode 81, cleaning, no conversation): logs "Really quit? And leave the mess for the next janitor? [yn]"; next key `y` → "You can't. Your shift isn't over. (Union rules.)", `n` → "Good choice.", anything else cancels.
  - Konami: `EasterEggs.track(keyCode)` from `Game.onKey` during cleaning; sequence `[38,38,40,40,37,39,37,39,66,65]`; on match logs "You feel like you have 30 extra lives. You still only have one mop." and `Sfx.play('fanfareIn')`. Movement still happens.
  - `EasterEggs.mopName() -> string|null`; after a completed mop, `Flavor.chance(0.2)` adds "You swish <name>." when named.
  - `EasterEggs.tried` (`{ [key]: true }` for `pray, xyzzy, elbereth, name, chat, quit, konami`).
  - `Lore.hints = { pray: [...], xyzzy: [...], name: [...], konami: [...], elbereth: [...], quit: [...] }` (≥ 2 each; spec §9 examples).
  - `EasterEggs.pickHint() -> string|null` via `Flavor.rng`: weight 1 per untried key, 0.25 per tried key; skips hints in `Game.hintsToday`; records the pick. `Game.hintsToday` resets in `Game.nextDay`.
  - `ConversationBuilder.buildConvos` (non-party): with `Flavor.chance(0.3)`, push `[{ text: hint, any: -1 }]` before the `meetingPlayer` push.
  - Routing: in `Player.handleEvent`, before everything else (after the phase check): if `EasterEggs.prompt != null` → `EasterEggs.handleKey(e)`, return; if a quit question is pending → answer it, return; `e.key == '#'` → open the prompt. AltGr/Ctrl/Alt do not block `#`. When a conversation starts (`Game.player.talking` set) the prompt closes without running.

- [ ] **Step 1: Write the failing tests** `tests/eastereggs.test.js` (cleaning day 1; helpers `type(ctx, str)` pressing `{keyCode, key}` per char, `last(ctx)` = newest log text)

```js
test('#xyzzy: nothing happens', () => { /* '#','x','y','z','z','y',Enter -> 'Nothing happens.' */ });
test('#pray works once a day', () => { /* hopeful, then displeased */ });
test('#name names the mop and it is remembered', () => { /* '#name Excalibroom' -> storage rj-mop == 'Excalibroom'; Flavor.chance stubbed true; mop a mess -> 'You swish Excalibroom.' */ });
test('unknown command suggests #pray', () => {});
test('Esc closes the prompt without running anything', () => {});
test('prompt swallows game keys and works with AltGr', () => {
    // press {keyCode:51, key:'#', ctrlKey:true, altKey:true}: prompt open; 'm','h' typed: player did not move or mop; Esc
});
test('prompt closes when a conversation starts', () => { /* open prompt; Game.player.talking = monster; next drawMap/key: prompt null, no log line */ });
test('Q asks, y tells the union joke, n is a good choice', () => {});
test('Konami code', () => { /* arrows + b + a: log includes '30 extra lives'; player position changed by the arrows */ });
test('colleagues hint at easter eggs, never the same twice a day', () => {
    // Flavor.chance stubbed true; buildConvos on 6 monsters: each has a hint convo, all texts distinct, all from Lore.hints
});
test('tried eggs are hinted less', () => { /* tried.pray = true: pickHint weight table gives pray 0.25, others 1 */ });
```

- [ ] **Step 2: Run to verify they fail** — FAIL.
- [ ] **Step 3: Implement** as in Interfaces (add `script/eastereggs.js` to `index.html` and `DEFAULT_FILES`). Check `#` and `Q` are not bound in `Player.keyMap` or `handleEvent`.
- [ ] **Step 4: Run all tests** — all pass.
- [ ] **Step 5: Commit** — `git commit -m "feat: #pray, #xyzzy, #name, Q, Konami code, and colleagues who hint at them"`

---

### Task 6: End-of-shift plaque and "Do you want your mess identified?"

**Files:**
- Modify: `script/scenes.js` (literal scenes, `setPlaque`), `script/game.js` (`plaqueLines()`), `script/conversations.js` (`exitPrompt` plaque node), `script/lore.js` (`killedBy` from Task 4 — extend to ≥ 10)
- Test: `tests/plaque.test.js` (new)

**Interfaces:**
- Consumes: `Lore.killedBy`.
- Produces:
  - `Scenes.art.<name>.literal` (bool): when true, `Scenes.cell` returns `[ch, palette colour]` without the `@` / `1`–`3` substitutions.
  - `Scenes.setPlaque(lines: string[])`: sets `Scenes.art.plaque = { literal: true, frames: [lines, lines with the `*` flowers swapped for `,` (a gentle two-frame flicker)], palette: { '/':'#999','\\':'#999','|':'#999','-':'#999','_':'#6a4','*':'#f8c',',':'#f8c', default text '#ddd' } }`.
  - `Game.plaqueLines() -> string[]`: the spec §10 stone (our drawing), every line the same width; rows `REST` / `IN` / `PEACE,` / `YOUR BACK` / blank / `EMPLOYEE OF THE` / `DAY <day>` / `cleaned <pct>%` / `killed by:` / one or two ≤ 16-char lines of a `Lore.killedBy` cause (via `Flavor.rng`, word-wrapped).
  - `exitPrompt()`: calls `Scenes.setPlaque(Game.plaqueLines())` and inserts `{ message: 'Do you want your mess identified? [ynq]', scene: 'plaque' }` immediately before the shift-report node (any key continues; the report is the "identification").

- [ ] **Step 1: Write the failing tests** `tests/plaque.test.js`

```js
test('exit prompt shows the plaque before the report', () => {
    // nodes = exitPrompt(); i = index of the report node; nodes[i-1].scene == 'plaque' and its message is the DYWYPI line
});
test('the plaque names the day, the score and a funny cause', () => {
    // Game.day = 3; cleanPercent stubbed 87: lines include 'DAY 3' and 'cleaned 87%'; a killedBy word appears
});
test('the plaque is a clean rectangle', () => { /* all lines same length; killedBy rows <= 16 chars of text */ });
test('literal scenes keep digits and @ as text', () => { /* Scenes.current = {name:'plaque', cast:[...]}; cell(...'3'...) -> ['3', ...] */ });
```

- [ ] **Step 2: Run to verify they fail** — FAIL.
- [ ] **Step 3: Implement** as in Interfaces.
- [ ] **Step 4: Run all tests** — all pass.
- [ ] **Step 5: Commit** — `git commit -m "feat: end-of-shift plaque: rest in peace, your back"`

---

### Task 7: README and browser check

**Files:**
- Modify: `README.md`

- [ ] **Step 1: README** features: item variants (Necronomicon, KLAATU BARADA NIKTO, zorkmids…), fortune-cookie rumors, four new hero classes, lost heroes / unknown scrolls / save-scumming / Elbereth, Rodney and the Amulet, daily memos and shift events (inspector, birthdays, mimic stains, rubber duck, ghosts of past heroes, Rodney's visit), `#` extended commands + `Q` + Konami code with colleague hints, the end-of-shift plaque.
- [ ] **Step 2: Browser check** (Chrome with the Claude extension, `python -m http.server 8765 --bind 127.0.0.1`, hard reload): replay speed (walking ~90 ms, holds subtle), torch background, a variant examine, `#pray` on the real keyboard, `Q`, the plaque at the end of a shift, no console errors. Screenshots for the user.
- [ ] **Step 3: Run all tests** — all pass.
- [ ] **Step 4: Commit** — `git commit -m "docs: README features for phase 2"`
