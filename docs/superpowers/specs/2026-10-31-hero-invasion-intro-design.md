# Rogue Janitor — Hero Invasion intro, new UI, sound

Date: 2026-10-31

## Intent

Rogue Janitor is a game about cleaning a dungeon after an adventurer has trashed it.
Today that adventure already happens (`script/adventurer.js`), but invisibly and
instantly before the player gets control. The user wants to **see** it: a
non-interactive sequence where a CPU-controlled hero storms the dungeon turn by turn,
"kills" everyone and makes a mess, followed by the player cleaning **that same
dungeon**. The twist that makes it fun: roguelikes are always told from the hero's
side; this one is told from the **monsters' side**.

The core game (cleaning + befriending monsters in the staff lounge) must stay the
core. The intro is the setup, not a new game.

## Goals

1. **Intro text screen** (day 1 only), monsters' point of view: a humble dungeon,
   monsters living happily, then suddenly a hero arrives. Advance with any key.
2. **Visible invasion**: the existing `Adventurer` simulation runs turn by turn on a
   timer, camera centred on the hero, on the very map the player will clean.
3. **Funny message log** during the invasion: hits, monster screams, the hero's
   heroic shouting, theatrical faints, loot grabbing, door kicking, snacking,
   potion quaffing.
4. **Theatrical deaths**: monsters don't die. They "faint" dramatically, lie there
   during the invasion, and once the hero leaves they get up, dust themselves off and
   go to the staff lounge — exactly as the game already does (`moveMonstersToLounge`).
5. **New UI, layout "B"** (chosen by the user from mockups): map on the left, side
   panel on the right, message log (last 5 lines) under the map.
6. **Sound effects** and small visual juice (my call, user said "go ahead").
7. Everything in **English** (user's decision), matching the existing game text.

## Non-goals

- No player control during the invasion beyond speed / skip.
- No translation of existing content.
- No rewrite of the dungeon generator, mess system or conversation system.
- No build step, bundler, framework or npm. It stays plain scripts + rot.js from CDN,
  openable from `index.html`.

## Anti-goals (would be a failure even if it "works")

- The cleaning game feels secondary or slower to reach (intro must be skippable).
- Monsters actually die / the staff lounge is empty / conversations break.
- The mess the player cleans differs from what they watched being made.
- Real gore. The game's joke is fake blood and workplace safety.
- Message log so spammy it's unreadable.

## How it works (decided)

### Flow per day

```
Day 1:  Intro text screen → Invasion → transition messages → Cleaning (existing)
Day 2+: Invasion (new hero)  → transition messages → Cleaning
```

- The existing day-1 welcome cutscene (`ConversationBuilder.startGameCutscene`) stays,
  shown when the player gets control, after the invasion. Its text should be adjusted
  so it no longer says the monsters "just finished a busy work day" as if unseen
  (e.g. "Now that the hero is gone, the monsters are relaxing in the staff lounge...").
- Pet adoption / victory cutscenes keep working as they do now.

### Invasion phase

- Driven by the existing scheduler/engine and `Adventurer.act`; the difference is it
  runs with a delay between hero turns instead of instantly. Monsters keep their
  existing `act` behaviour (they fight back, drop bottles, etc.).
- **Camera follows the hero.** Rendering currently centres on `Game.player`; it must
  centre on a generic "camera target" (hero during invasion, player afterwards).
- **Visibility during invasion:** show what the hero's FOV sees plus already-seen
  memory (same treatment the player gets). The player's map memory after the
  invasion: my call — the player starts with no memory, as today (the janitor didn't
  see anything; it keeps exploration intact).
- **Controls:** `Space` toggles fast mode (≈4× speed), `Esc` skips to the end
  (run remaining turns instantly, same as today's behaviour). Shown in the panel.
- **Pacing:** normal speed should make a typical invasion last roughly 45–90 s.
  Builder tunes the per-turn delay; may adaptively skip delay on "boring" turns
  (hero walking an empty corridor with nothing new in view) so the action dominates.
- **Fainted monsters** remain visible where they fell (their glyph dimmed/grey, not
  blocking movement), so the player sees a battlefield of bodies. At transition
  they are removed from the map and placed in the lounge by the existing code.
- **Hero identity:** random pompous name + class each day ("Sir Gleamington the
  Paladin", "Brakka Skullsplitter the Barbarian"…). Display only; no stat changes.
- **Transition:** when the hero exits by the down stairs: a few log lines
  ("The hero leaves, humming a victory tune." / "One by one, the fallen monsters get
  up, dust themselves off and head to the staff lounge." / "Your shift begins.")
  plus a short "invasion report" (monsters fainted, loot taken, snacks dropped,
  potions quaffed, blood puddles). Then a key press hands control to the player.

### Flavor text

- New file `script/flavor.js` with text pools: hero battle cries, hit verbs, monster
  pain/fear lines, theatrical faint lines, door kicks, loot grabs, snack/potion lines,
  hero-hurt lines, transition lines, hero names/titles/classes.
- Lines can reference the monster's name (monsters already have names, e.g.
  `entity.name`). Tone: cosy, silly, workplace comedy; monsters are colleagues
  "performing" for the adventurer.
- **Log throttling:** at most ~1 flavor line per hero turn; always log hits/faints,
  sample the rest. No identical line twice in a row.

### UI — layout B

- Map area on the left, side panel (~24 columns) on the right, 5-line message log
  under the map, all drawn in the rot.js display (keeps the terminal look, one
  canvas). Builder may use HTML around the canvas instead if it's cleaner, as long as
  it looks like the mockup (monospace, black, coloured text).
- **Panel in invasion mode:** hero name/class, HP bar, turn; monster roster with
  status (`unharmed` / `fighting!` / `fainted`), coloured glyph; "Mess" bar (current
  mess vs. a reasonable max); key hints.
- **Panel in cleaning mode:** day, cleanliness % bar, list of monsters in the staff
  lounge, remaining mess by category (blood, prints, bottles/mugs, wrappers, broken
  furniture…), key hints (`?` help).
- Message log replaces the current single message line and the top "Cleanliness /
  Day" text. Existing semantics of `Game.sendMessage(msg, important)` (dimmed old
  message, transient look/examine messages) should keep working: newest line
  bright, older lines dimmer.
- Conversations and help screen (`?`) keep working; they can keep their current
  rendering inside the map area.
- Roster may be longer than the panel: truncate with "+N more" (my call).
- Must handle window resize like today (`Game.getSize`).

### Sound

- Synthesized with the Web Audio API (no audio files, nothing to download): hit,
  monster yelp, faint "thud", door kick, loot pickup, potion gulp, hero fanfare on
  entry/exit, mop squish, pick up, fix, door, secret passage found, conversation blip.
- Audio starts only after the first key press (browser autoplay rules).
- `V` toggles sound on/off (free key; not used by current bindings). Shown in the
  panel. Remember the choice in `localStorage` (wrapped in try/catch).
- Throttle so fast mode doesn't produce a wall of noise.

### Visual juice

- Brief flash/highlight on a tile when something is hit (monster or hero).
- Nothing that changes gameplay.

### Settled details (my calls, from the builder review)

- The hero's 10,000-turn fail-safe (`Adventurer.act` → `generateDungeon()`) must not
  regenerate a map the player has just watched; it ends the invasion instead.
- The hero's FOV fills shared tile memory (`Tile.lastSeen`); reset it at handover so
  the player starts with no map memory.
- The janitor `@` is hidden during the invasion (it sits in the staff room).
- Hero HP is small (5), refilled by potions and can go negative; the panel bar uses a
  sensible max and clamps, rather than showing the mockup's 17/20.
- The hero smashes loot instead of taking it: the report counts "loot smashed".
- Victory / pet-adoption cutscenes play when the player gets control, after the
  invasion (where they naturally land today).
- A tile holds one entity, so fainted bodies are drawn as a separate visual layer.

### Small fixes found while reading the code (my call)

- `game.js` ~line 886: monster sort comparator is mis-parenthesised (the `a` terms
  have wrong signs).
- `adventurer.js` line 144/154: `this.currentTarget != [..]` compares arrays by
  reference, so it's always true and recalculates the path every turn. Harmless but
  wasteful; fix if it doesn't change behaviour noticeably.
- Leftover `console.log` in `entity.js` key handler.

## Constraints

- Plain JavaScript in the browser, rot.js 2.0.3 from CDN, no build. Must work by
  opening `index.html` and via a static server.
- Existing keybindings unchanged. New keys: `Space`, `Esc` (invasion only), `V`.
- The invasion must produce the same kinds of mess the current simulation does; the
  mess numbers (`Game.messNumbers`) that drive cleanliness % must be correct after
  the invasion.
- Existing quest/coffee/invitation/party/pet/victory logic must keep working.
- No automated test suite exists; verification is by playing in a browser
  (several days in a row, skip and non-skip paths, resize).

## Left to the builder

- Exact per-turn delay and boring-turn skipping.
- Exact panel column width, colours, bar glyphs.
- Exact sound synthesis parameters.
- How to structure the phase state (e.g. `Game.phase = 'intro'|'invasion'|'cleaning'`).
- Flavor text content (lots of it, in the tone above).
