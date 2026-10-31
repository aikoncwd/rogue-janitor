# Rogue Janitor — Title screen, "how it works", playback banner, music and cozy humor

Date: 2026-11-01

## Intent

The game already has a night invasion (watched, not played) followed by the cleaning
shift. Two problems and one wish:

1. There is no proper front door. The game opens straight on a story text. A classic
   roguelike deserves a classic title screen (Rogue / NetHack spirit, pure ASCII).
2. New players don't know the invasion is **not interactive**. They press keys and
   nothing obeys them. The game must say so up front and keep reminding them while
   the hero plays, with a slightly animated "this is a recording" banner.
3. The game should feel **cozy, pleasant, funny**: more jokes, events, easter eggs,
   more variety in items and music, and many references to the roguelike world
   (NetHack, Rogue, Brogue, DCSS, Infra Arcana, Angband, Cogmind, Sil-Q, and the
   genre in general: procedural generation, RNG, permadeath, bones, YASD...).

The user approved every proposal in the brainstorm and asked for more references,
more item variety without new glyphs, and two or three new tunes.

## Goals

1. **Title screen** (new phase `title`, first thing on load).
2. **How-it-works screen** (new phase `howto`, day 1 only), then the existing story
   intro, then the invasion.
3. **Playback banner** during the invasion ("security camera footage").
4. **Music**: a title theme, an alternative upbeat invasion tune, and a second calm
   cleaning tune; tracks rotate by day.
5. **Item variety**: the same glyph/mess type can appear under many funny names
   (with optional examine text). No new glyphs.
6. **More invasion humor**: new hero classes and new invasion events.
7. **Cozy cleaning-day events**: one random small event per day from day 2.
8. **Easter eggs**: NetHack-style `#` extended commands, Konami code, quit joke,
   naming the mop.
9. **Rumors** (fortune cookies) full of roguelike references.
10. **End-of-shift tombstone/plaque** parody + "Do you want your mess identified?".

## Non-goals

- No new glyphs or tiles; reuse existing characters and colors.
- No changes to the dungeon generator, scoring formula or conversation engine
  (new conversations use the existing builder).
- No build step, bundler or npm; plain scripts + rot.js from CDN, as today.
- No translation: all in-game text stays in **English** (decided earlier).
- Not a copy of any existing game. References are jokes and nods, never recreated
  screens, maps, monsters lists or mechanics. The tombstone is a parody, the title
  logo is our own.

## Anti-goals (failure even if it "works")

- Reaching the cleaning game gets slower: every new screen is dismissed with any key
  and the how-to screen appears only on day 1. The invasion stays skippable (`Esc`).
- The mess the player cleans differs from what was watched, or depends on whether
  the invasion was skipped. New invasion events must produce mess through the same
  simulation code path in normal, fast and skip modes.
- Jokes that are mean, gory or punch down. The tone is a supportive workplace:
  fake blood, theatrical faints, colleagues who like each other.
- Log spam. Existing throttling rules (≈1 flavor line per hero turn, no identical
  line twice in a row) apply to all new lines.
- Easter eggs that break normal controls (e.g. eating movement keys).

## Flow

```
Load → TITLE → (any key) → HOWTO [day 1] → STORY INTRO [day 1, existing] → INVASION
     → transition/report (existing) → CLEANING → night screens (existing)
Day 2+: INVASION (new hero) → ... (no title, no howto)
```

`Game.phase` gains `'title'` and `'howto'` before the existing `'intro'`.
`Game.begin()` sets `phase = 'title'`. `Invasion.handleKey` (or a small new
`Title` module) advances title → howto → intro → invasion on any non-global key.
Global keys (zoom, `T` music, `V` sound) keep working on every screen.

## 1. Title screen

Drawn with the rot.js display, centred in the whole screen (no side panel/log).

- Big ASCII logo "ROGUE JANITOR" (figlet-like, our own lettering). Colour: logo in
  a warm yellow/amber, subtitle grey.
- Under it, a small framed dungeon vignette (~40×4) with animation (~4 fps, a
  `setInterval` running only while `phase == 'title'`):
  - torches `*` flicker between two/three warm colours,
  - the janitor `@` with the broom cycling `- \ | /`, slowly walking back and forth
    across the vignette and "cleaning" a `~` / `,` in front of it,
  - a few messes (`!`, `%`, `,`) sitting there.
- Right of / under the vignette: version line `Rogue Janitor 3.6.0-mop` and a
  rotating tagline (new pool `titleTaglines`, changes every few seconds), e.g.
  "Mop the dungeon. Retrieve the Amulet of Clean-dor.",
  "Procedurally generated mess. Hand-crafted mopping.",
  "The RNG made this mess. You get to clean it.",
  "Permadeath? No. Perma-mess.",
  "Now with 100% fake blood.".
- Bottom prompt, NetHack homage:
  `Shall I pick a mop for you? [ynaq]` and below, dim: `(any key clocks you in)`.
  Every key starts the game; the joke is that the answer doesn't matter. Pressing
  `q` shows one log-less line on the title: "You can't quit before your shift. Union
  rules." and still waits for another key.
- Credits line: "Original game by Lauren H · rot.js".
- Music: new `title` track (calm, see §4).

## 2. How-it-works screen (day 1 only)

Plain centred text, three numbered beats + controls, ending with "Press any key".

```
              HOW YOUR JOB WORKS

  1. TONIGHT     A hero raids the dungeon. You are NOT playing:
                 you are watching last night's security footage.
                 [Space] fast-forward   [Esc] skip to the morning

  2. MORNING     The mess is yours. Mop, pick up, fix.

  3. BREAKS      Your colleagues relax in the staff lounge.
                 Chat with them. They are lovely.

                 Press [?] any time for the full controls.
```

Exact wording is the builder's; keep it under ~16 lines and keep the "you are NOT
playing" idea explicit. Then the existing `Flavor.pools.introText` story screen.

## 3. Playback banner (invasion)

Concept: the invasion is the dungeon's **security camera recording**, and the camera
is a floating eye.

- One line at the top of the map area, drawn over the map, every frame of the
  invasion (including the night-shift card is not needed; only while the hero moves):
  `[ ● REC  ▶ PLAYBACK · CAM 3 (floating eye) · 02:47 AM ]  just watch - no input needed`
- `●` blinks (red / dark) about once per second; `▶` becomes `▶▶ x4` in fast mode;
  while skipping nothing is drawn.
- The clock starts at a random time between 01:00 and 02:30 AM and advances one
  minute per hero turn (wraps sensibly; display only).
- Camera number changes with the room the hero is in (room index → `CAM n`), purely
  cosmetic. If room lookup is awkward, a fixed number per day is fine (builder's
  call).
- If the player presses a movement/action key during the invasion, log one line
  (throttled: at most once every ~5 s) from a pool `playbackNag`:
  "You can't do anything. It's a recording.",
  "You shout at the screen. The hero does not hear you.",
  "This already happened. Space to fast-forward, Esc to skip.",
  "You reach for the mop. Patience, it's still last night.".
- Narrow screens: shorten the banner (`● REC ▶ 02:47 AM`) when it doesn't fit.

## 4. Music

Same engine, same notation (`script/music.js`), original tunes only.

| Track         | Mood                                      | Used for |
|---------------|-------------------------------------------|----------|
| `title` (new) | calm, warm, a bit nostalgic; ~80–90 bpm   | title + howto + story intro |
| `invasion`    | existing pompous march                    | invasion, odd days |
| `invasion2` (new) | more upbeat/heroic, faster (~150–160 bpm), "adventure chase" feel, square lead + arpeggio + drums | invasion, even days |
| `cleaning`    | existing cozy lo-fi                       | cleaning, odd days |
| `cleaning2` (new) | same calm, mop-friendly mood, different key/melody, maybe a gentle swing | cleaning, even days |
| `night`       | existing lullaby                          | night screens |

`Game.musicTrack()` picks the variant by `Game.day % 2`. The title screen does not
use `night` any more. Each new tune loops cleanly (bar count consistent across
voices); add to the existing music tests that every track parses and voice lengths
match.

## 5. Item variety: same glyph, many names

Mechanism: in `makeMess`, after creating a mess of a given **type** (the `switch`
key: `'LoosePages'`, `'EmptyPotion'`...), with some probability (~35–50%) replace its
display `name` with a random **variant** from a table, and optionally attach a
short `desc` shown when examined. The type, glyph, colour, importance, clean method
and spreading stay identical. Anything that groups or counts messes (panel
categories, tough stains, quest items, tests) must keep using the type, not the
display name; the builder must check `TOUGH_STAINS`, panel category counts and
quest-item naming, and store the type on the mess (e.g. `mess.type`) if it isn't
already.

Variant tables (starting set; builder may add more in the same spirit):

- `?` LoosePages / SpentScroll: "Page of the Necronomicon (do not read aloud)",
  "Scroll labeled KLAATU BARADA NIKTO", "Scroll labeled ELBIB YLOH",
  "Scroll labeled READ ME", "Scroll of Remove Curse (expired)",
  "Dog-eared Spellbook of Force Bolt", "Unpaid Invoice from the Shopkeeper",
  "Page from 'Mopping for Dummies'", "Overdue Library Book", "Tome of Lore (spoilers)",
  "Rune of Recall (smudged)", "Map of the Next Level (wrong)", "Instruction Manual for a Mimic".
  Examining the Necronomicon: "You decide not to read it. Good call."
  Examining KLAATU...: "You remember the first two words. The third one... nectar? nickel?"
- `!` EmptyPotion / EmptyBottle: "Empty Potion of Booze", "Empty Potion of See
  Invisible (probably)", "Unidentified Murky Potion", "Empty Potion of Descent",
  "Empty Potion of Fruit Juice", "Flask of Holy Water (mostly)", "Potion of Gain Level
  (empty, sadly)", "Bottle labeled 'DO NOT QUAFF'".
- `%` AppleCore / food: "Lichen Corpse (still fresh)", "Half-eaten Slime Mold",
  "Food Ration Wrapper", "Tin of Spinach (opened)", "Lembas Crumbs",
  "Fortune Cookie" (see §8), "Mystery Meat", "Ration of Jerky".
- `)` DroppedSword: "Dull Vorpal Blade", "Rusty Long Sword +0", "Excalibur (rental)",
  "Cursed Two-Handed Sword", "Wooden Practice Sword", "Elven Dagger, bent".
- `$` GoldCoins: "Scattered Zorkmids", "Gold Coins (chocolate)", "Pile of Au".
- `=` Crossword: "Crumpled Crossword", "Cheap Plastic Ring", "Ring of Free Action
  (from a cereal box)", "Ring of Teleport Control (does nothing)".
- `u` EmptyMug: "Mug: WORLD'S OKAYEST GOBLIN", "Mug: I SURVIVED THE DUNGEONS OF
  DOOM", "Mug: RNG IS MY CO-PILOT", "Mug: I <3 PERMADEATH".
- `w` Wrapper: "Candy Wrapper", "Elbereth Bar Wrapper", "Protein Bar Wrapper
  (+1 STR)", "Snack Wrapper (Ham-flavoured)".
- Other messes may get variants if a good joke exists; none is required.

Examine shows `name` plus `desc` when present.

## 6. Invasion: new hero classes and events

### New classes (added to `heroClass`, each with a `special_<Class>` pool and a
signature mess using existing mess types/variants)

- **Tourist**: Hawaiian shirt, camera. Special: flash photo — the target monster is
  "blinded" (loses its next turn, display only if simpler) and the line says so;
  drops `Wrapper` variants ("Expensive Gift Shop Receipt") and `GoldCoins`
  ("Overpriced Souvenir Coins").
- **Valkyrie**: confident, cold. Special: shouts "VALHALLA!" and leaves `Water`
  ("Melted Frost") puddles.
- **Speedrunner**: shouts "ANY%!", "FRAME PERFECT!", "RESET? NO, KEEP GOING!";
  shorter per-turn delay while this hero is on screen (×0.7), drops `Wrapper`
  ("Energy Drink Can" variant on `EmptyBottle`).
- **Necromancer** (optional, builder's call): reads loose pages aloud
  ("KLAATU BARADA... NECKTIE?") and leaves `LoosePages` variants.

Hero names pool gets roguelike-flavoured additions, e.g. "Rodney", "Yasd the
Unlucky", "Ascension Andy", "Scummy McSavefile", "Bones", "Seed 42", "Gelatinous
Kevin's Cousin".

### New events (all must run through the simulation, identical in fast/skip)

Each is a low-probability per-turn or per-room check inside the adventurer turn,
at most one special event every N turns so they stay special:

- **Lost hero**: asks the nearest awake monster for directions; the monster points
  politely; log 2 lines. No mess or a `Crossword` variant "Hand-drawn Map".
- **Unknown scroll**: hero reads an unidentified scroll; random harmless outcome
  among: teleports to another tile in the level (real move), "You feel a strange
  sense of loss", "The scroll is a takeaway menu", confetti (`LoosePages` variants
  around). Drops a `SpentScroll` variant.
- **BACK IN 5**: if a monster has fainted and others are alive, one monster holds a
  "BACK IN 5" sign; flavor only.
- **Save-scum** (my call on the mechanics): the hero never truly dies in the code;
  at `hp<=0` it drinks a potion every 5 turns (`script/adventurer.js`). The **first**
  time `hp<=0` in an invasion, instead of that potion: "You die... Do you want your
  possessions identified? ...Restoring from save." The hero blinks and is restored
  **in place** at full HP (no teleport, so its route and invasion length don't
  change); monsters nearby: "Wait, didn't we just...?". Later low-HP moments use the
  existing potion as today. The potion stat simply counts one less that day.
- **Elbereth**: hero engraves "Elbereth" on the floor (graffiti mess with that
  text). Monsters walking past say things like "Oh, Elbereth. Sure. *walks around
  it politely*". When the player cleans it: "You erase the engraving. Sorry,
  Elbereth."
- **Random roguelike quips** pool `heroQuip` (sampled like `heroCry`): "Never melee a
  floating eye", "I'll just check this one more room", "It was the RNG's fault",
  "This seed is cursed", "Wait, I didn't press that", "Was that a mimic? It's always a
  mimic", "I should've played a Minotaur Berserker".

### Dynamic pacing (rhythm, not a metronome)

Today every hero turn waits a fixed delay (200 ms eventful / 90 ms boring). The user
wants rhythm: the replay should breathe, speed through dull bits and **hold** on the
good moments, like an edited highlight reel.

- Each hero turn computes its delay from what happened in it (the "beat"), not just
  eventful/boring. Suggested beats (builder tunes the numbers):
  - walking an empty corridor, nothing new in view: very fast (~40–60 ms), several
    quiet steps may be chained;
  - entering a new room / spotting monsters: a short **pause** (~400 ms), like a
    camera beat;
  - a hit: normal (~200 ms); a faint: hold (~700 ms) so the dramatic line can be read;
  - quaffing a potion, eating, speaking a battle cry or quip, any special event
    (Elbereth, lost hero, unknown scroll, save-scum, class special): **hold** long
    enough to read the line (~900–1500 ms, scaled by line length);
  - chained combos: several hits in a row speed up slightly (~150 ms) to feel
    frantic, then a hold on the final faint.
- Optional "speech moment": when the hero shouts or talks to a monster, the hero
  glyph (or a small `!`/`"` marker next to it) flashes for the hold, so the pause
  reads as intentional, not as lag.
- Fast mode divides every delay by `FAST_FACTOR`; skip ignores delays entirely.
  Pacing is presentation only: it never changes the simulation or RNG order.
- The banner clock still advances per hero turn (pauses don't freeze it oddly;
  builder's call whether holds add a minute).

### Pacing revision (phase 2, user feedback after playing phase 1)

The phase-1 beats did not feel right: holds between actions were too long, and
walking (25 ms after halving) was so quick the hero seemed to fly. New rule:

- **Base speed = the original pre-phase-1 timing**, for every turn: 90 ms per
  walking turn, 200 ms per turn with action (monsters in view or any event) — the
  old `BORING_DELAY_MS` / `BASE_DELAY_MS`.
- Special actions **add a small extra on top of the base**, never replace it:
  roughly +60–150 ms for potions, snacks, speeches/cries, faints and class specials;
  nothing extra for plain hits, doors or loot. No extra per line length.
  "Sin pasarte": the longest turn should stay well under ~400 ms.
- Fast mode, running-hold rescaling and skip behave as in phase 1.

### Yendor, Rodney and the Amulet

The game already has `yendorPoints` and the "Mop of Yendor" ending. Lean into it:

- **Rodney** (the Wizard of Yendor) is a recurring off-screen character: a retired
  wizard who lives on the bottom floor and keeps borrowing the Amulet.
  - Invasion quips: heroes shout "WHERE IS THE AMULET OF YENDOR?!", "I'm here for
    the Amulet!", and monsters answer "Rodney has it. Again." / "Bottom floor, take
    the stairs, mind the wet floor sign."
  - Some days a hero exits with "a shiny amulet": next day's memo says "MEMO: The
    Amulet of Yendor has been stolen again. Rodney says it's fine, he has spares."
  - An item variant on `=`/`"`-like existing messes (no new glyph):
    "Cheap Plastic Amulet of Yendor (souvenir)", "Fake Amulet of Yendor (made in
    Minetown)".
  - Memos and rumors: "They say Rodney keeps the real Amulet in his sock drawer.",
    "MEMO: Rodney, please return the Amulet to lost & found."
  - Optional lounge cameo (builder's call): from day 4, Rodney visits the lounge for
    tea with a short conversation about retirement and heroes "who never call".
- The title tagline pool and the tombstone use the Yendor joke too
  ("Retrieve the Amulet of Clean-dor", "Mop of Yendor").

## 7. Cleaning-day events (cozy, day 2+)

At the start of each cleaning shift from day 2, pick at most one event (with some
chance of none). Announced with one log line and, where noted, a lounge
conversation via the existing ConversationBuilder.

- **Health inspector**: a visitor (existing monster type/glyph, named "Inspector
  Gnoll-Bertson" or similar) walks around; at the end of the shift, a comment based
  on cleanliness; bonus Yendor points if cleanliness ≥ 80%.
- **Birthday**: a random colleague's birthday. "Cake" appears in the lounge (a `%`
  variant). Talking to them offers a "Happy birthday!" line for Yendor points.
- **Mimic stain**: one mess is a mimic in disguise. When cleaned, it giggles and
  runs to the lounge ("Hehe, that tickles!"). Uses existing mimic monster if one
  exists that day; otherwise a dedicated line only.
- **Memo of the day**: a line at shift start, "MEMO: Please stop dying in the
  hallway.", "MEMO: The fountain is NOT a bathtub.", "MEMO: Whoever keeps writing
  Elbereth on the walls: we know it's you, Kevin.", "MEMO: The RNG has been
  instructed to be nicer.". Happens every day (not exclusive with the others).
- **Rubber duck**: the fountain (if repaired/present) holds a rubber duck; examining
  it: "A rubber duck. It knows things. You explain your problems to it."
- **Bones visitor**: from day 3, the ghost of a previous day's hero visits the
  lounge ("Ghost of Chad the Bard — killed by a slippery puddle"). Short
  conversation, harmless, leaves at the end of the day.

## 8. Rumors and fortune cookies

New pool `rumors` (≈40 lines). Shown when picking up a "Fortune Cookie" variant
("You crack the fortune cookie. It reads: ...") and occasionally as the title
tagline. Tone: "They say..." in the NetHack tradition. Examples:

- "They say that the janitor knows where every secret door is."
- "They say the eels in Brogue are judging your mopping."
- "They say Trog would never read a memo."
- "They say in Sil you gain experience by noticing things. Notice the stains."
- "They say Morgoth never once cleaned up after himself."
- "They say Cogmind robots pick up their own parts. Show-offs."
- "They say in Infra Arcana, the lights go out right when you finish mopping."
- "They say you should never melee a floating eye. Or mop one."
- "They say the RNG giveth, and the RNG taketh away."
- "They say this dungeon was generated from seed 42."
- "They say a mop of Yendor exists. They say a lot of things."
- "They say Rodney still hasn't returned the Amulet to the library."
- "They say permadeath is just a strong opinion."
- "They say the @ stands for 'Absolutely clean'."
- "They say every YASD starts with 'I'll just...'."
- "They say the shopkeeper charges for every footprint."

## 9. Easter eggs

- **`#` extended command prompt** (cleaning phase only, when no conversation): a
  one-line input in the log area (`# _`). Enter runs, Esc cancels. Commands:
  - `#pray`: "You feel that the Mop God is displeased." (first time per day:
    "You feel a hopeful feeling. The bucket refills."; cosmetic).
  - `#xyzzy`: "Nothing happens."
  - `#elbereth`: "You write Elbereth in the dust with your mop. Then you mop it."
  - `#name <text>`: names the mop (saved in localStorage `rj-mop`); later cleaning
    lines occasionally say "You swish <name>." Default unnamed.
  - `#chat`: "You talk to yourself. You agree with yourself."
  - `#quit`: same joke as `Q`.
  - unknown: "Unknown extended command. (Try #pray.)"
- **`Q`**: "Really quit? And leave the mess for the next janitor? [yn]" — `y`: "You
  can't. Your shift isn't over. (Union rules.)"; `n`: "Good choice."
- **Konami code** (↑↑↓↓←→←→ B A) during cleaning: "You feel like you have 30 extra
  lives. You still only have one mop." plus a short happy SFX. Movement still
  happens normally; detection is a passive key-history check.

- **Colleagues drop hints** (user request): now and then a colleague in the lounge
  mentions an easter egg in passing, so the player feels invited to try it, e.g.
  "Did you know if you type #pray the Mop God sometimes answers? Gary swears by it.",
  "Old janitors say xyzzy is a magic word. Never worked for me.",
  "Some folks name their mop. #name, I think? Mine is called Sir Swishalot.",
  "Kevin keeps pressing up, up, down, down... on everything. Weird guy."
  Random, at most one hint per conversation, never the same hint twice in a day;
  hints for eggs the player already tried become rarer.

All easter-egg key handling must not block existing keys (`#` and `Q` are currently
unused — builder verifies).

## 10. End of shift: tombstone plaque + DYWYPI

When the player goes home (where `Game.shiftReport` is shown today), first show an
ASCII stone plaque, our own drawing:

```
              ----------
             /          \
            /    REST    \
           /      IN      \
          /    PEACE,      \
         |   YOUR BACK      |
         |                  |
         |  EMPLOYEE OF THE |
         |      DAY  3      |
         |  cleaned 87%     |
         |  killed by: a    |
         |  slippery puddle |
         |                  |
        *|     *  *  *      |*
   _____)/\\_//(\/(/\)/\//\/|_)______
```

"killed by" is a random funny cause (pool `killedBy`: "a slippery puddle",
"an unexpectedly heavy bucket", "Kevin's crossword", "the RNG", "a mimic disguised as
a mess"...). Then the prompt `Do you want your mess identified? [ynq]` — any answer
proceeds to the existing shift report (the report *is* the identification). Builder
may merge the plaque and report on one screen if space allows.

## Presentation RNG (prerequisite, my call)

Today the mess already depends on whether the invasion was skipped:
`Invasion.say()` returns early while skipping, but when it runs, `Flavor.line()`
draws from `ROT.RNG`, the same generator the simulation uses. Watching consumes
random numbers that skipping doesn't, so every later roll differs.

Fix first, before adding any new text: all presentation randomness (flavor lines,
quips, nags, banner clock/camera, title animation, pacing) uses a **separate
generator** (e.g. a cloned `ROT.RNG` instance, `Flavor.rng`), never `ROT.RNG`.
Anything that changes the world (events, mess, mess-name variants, teleports) uses
`ROT.RNG` and runs identically in every mode. Existing seeds will produce different
dungeons/invasions after this change; that is acceptable (seeds aren't exposed to
players). The test must compare a full watched run against a run where Esc is
pressed partway through (and a fully skipped one), same seed, same final mess.

## Delivery (my call)

Two phases, each with its own tests and a browser check:

1. **Core**: presentation RNG fix, title screen, how-it-works, playback banner,
   dynamic pacing, new music tracks.
2. **Content**: item variants, new classes/events, Yendor/Rodney, cleaning-day
   events, rumors, easter eggs, tombstone.

## Constraints and testing

- Plain JS, same style as the existing modules; new text pools go in
  `script/flavor.js` (split into `script/rumors.js` if it gets long).
- Existing test harness (`tests/harness.js`, node, rot.js vendored). Add tests for:
  phase flow title → howto → intro → invasion (day 1) and straight invasion on day 2;
  playback banner text (clock advancing, fast marker); variants keep type/glyph/
  colour and counts by type; new classes/events produce identical mess in instant vs
  paced mode (same seed); music tracks parse with consistent lengths; `#` command
  parsing; `Q` and Konami detection.
- Manual visual check in the browser (Chrome with the Claude extension is
  available) for the title animation, banner and tombstone, at small and large zoom.
- `README.md` features list updated.

## Left to the builder

Exact wording of new lines (keep the tone), exact logo lettering, tune melodies,
event probabilities, the variant probability, layout details when the screen is
narrow, and whether optional items (Necromancer class, per-room camera numbers) are
included.
