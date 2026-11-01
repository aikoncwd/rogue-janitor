# Rogue Janitor — The coffee-break run (phase 3)

Date: 2026-11-01

## Intent

Rogue Janitor today is an open-ended loop of days with a far-away goal (the Mop of
Yendor at 1500 points, about 15 perfect days) and no way to save. The user wants it to
become a **coffee-break roguelike**: a complete run of **5 working days**, playable in
one sitting (our guess: 5–10 minutes per day, 30–45 minutes per run), that never feels
long, ends with a funny ending either way, and gives the player something to **share**
(a screenshot-friendly results card that can also be copied as text).

Around that spine the user picked, from the review proposals, almost everything:
the remaining bug fixes, a plaque that is obviously a joke, a pocket-money economy
(zorkmids) with a shop of useless things, an inventory, new cleaning tools, combos,
daily objectives with named rooms, new shift events (flooding fountain, sleeping
dragon, goblin intern), keepsakes and lounge decorations, achievements with pop-up
toasts, and a UI pass (end-of-shift card, automatic zoom, minimap, more visible
cleaning, lighting), plus save/continue.

The source wish list is `todo.txt` (user's notes, Spanish) and the brainstorm
conversation. **`todo.txt` says the game ends on day 10; the user later changed that to
5 days** ("un coffee-break roguelike de tan solo 5 niveles"). 5 days is the decision.

## Goals

1. **A 5-day run** with faster dungeon growth and a Mop of Yendor reachable in 5 days.
2. **Two endings, no losing**: the Mop of Yendor ending, or a funny alternative
   ending without the mop. Both end the run with a **shareable results card**.
3. **Save / continue** in localStorage, offered on the title screen.
4. **Zorkmids**: a separate currency, earned from end-of-day pay (by grade) and from
   coins picked up in the dungeon; heroes scatter a bit more coin.
5. **Shop + inventory**: a lounge comrade sells absurd things that **do nothing**
   (and say so). An inventory screen lists what you own; cosmetic "upgraded" tools
   change only flavor text.
6. **New cleaning tools** that *do* matter, for different kinds of mess.
7. **Cleaning combos** that give bonus points.
8. **Daily objectives** on the morning memo, and **random room names** shown in the
   panel ("You are in: …").
9. **New shift events**: the fountain that floods, the sleeping dragon, the goblin
   intern (never tiresome).
10. **Keepsakes and decorations** that accumulate in the staff lounge across the run.
11. **Achievements**: funny ones, persisted across runs, announced with a toast.
12. **UI**: end-of-shift report as a framed card, automatic zoom that fits the
    dungeon, a minimap in the panel, more visible cleaning, some lighting.
13. **Fixes**: everything left from the 2026-11-01 code review (listed below).

## Non-goals

- No translation: all in-game text stays **English**. (The user talks in Spanish.)
- No build step, bundler, framework or npm in the game. Plain scripts, rot.js from
  the CDN (now 2.2.1), openable from `index.html`. Tests stay on `node:test` with
  `tests/harness.js`.
- No real-money, online, or account features. Sharing is copy/paste and screenshots.
- Not a copy of any existing game. References are nods and jokes.
- No player control during the invasion beyond the existing speed / skip.
- Shop items and cosmetic tools have **no gameplay effect**, ever.

## Anti-goals (failure even if it "works")

- The run feels long or grindy. Each day must stay short; nothing new adds mandatory
  busywork. The intern, the dragon and the flood are small, occasional spice.
- Losing. No ending says or implies the player failed. The plaque must read as an
  obvious joke about a sore back, not a death.
- A save that loads into a broken day (missing comrades, frozen engine, wrong
  dungeon). If a save cannot be loaded safely, offer a new game and say why, kindly.
- The shop being a trap: buying silly things never costs Mop points or progress.
- Notification spam: toasts, combo messages and objective updates must not flood the
  log or cover the map for long.
- Breaking what exists: invasion determinism (normal / fast / skip produce the same
  mess), the night scenes, conversations, easter eggs, and the 270 current tests.
- Mean, gory or punching-down jokes. The tone stays: supportive workplace, fake blood,
  theatrical faints, colleagues who like each other.

## Constraints

- Keep the existing user preferences for pacing (invasion 90 ms walk / 200 ms action)
  and visuals (nothing drawn on a black background over walls; use the wall grey).
- Every new random roll that does not belong to the simulated world uses `Flavor.rng`
  (or another clone), never `ROT.RNG`, so drawing, UI and flavor never change the
  dungeon or the invasion.
- Free letter keys are scarce. Today: movement uses `hjklyubn`, `wasd`, arrows,
  numpad; actions use `M P G F R O C E X Q ? #`, `T` music, `V` sound, `+ - 0` zoom,
  `.`/`5` wait. Only **`I`** and **`Z`** are free. This design uses `I` for the
  inventory and `Z` for the vacuum (see Tools). Anything else goes through
  conversations or existing keys.
- localStorage keys already in use: `rj-font`, `rj-best`, `rj-music`, `rj-sound`,
  `rj-mop`. All storage access stays wrapped in try/catch and the game works without
  it.

## Design

### 1. The run: 5 days

- The game ends after the **day 5** shift. When the player leaves on day 5 (exit door,
  confirmed), the usual night is replaced by the ending sequence (section 2).
- **Dungeon growth** (rooms, staff lounge counted as one): day 1 = 5, day 2 = 7,
  day 3 = 10, day 4 = 13, day 5 = 16 (user's numbers). Replace the "+1 or 2 per day, max 16" rule.
- The day counter is visible in the panel as `Day N / 5`.
- **Mop of Yendor target**: lower `targetPoints` so a *decent* run reaches it: about
  80% average cleanliness, chatting with colleagues, doing a couple of requests and
  objectives. Starting value: **650** (our call). The builder tunes it with a headless
  simulation of a "decent" and a "lazy" run and records the reasoning in the plan;
  a lazy run (≈40% per day, no requests) must *not* reach it.
- What gives Mop points stays as today (daily clean %, chats, requests, secrets,
  inspector) plus combos (section 7) and daily objectives (section 8). Zorkmids are
  separate and never convert to Mop points.
- The existing mid-run victory prompt (`victoryPrompt` when points cross the target)
  moves to the ending: points are checked once, at the end of day 5.

### 2. Endings and the results card

- **Mop ending**: a short funny epilogue (several lines, ASCII scene welcome; the
  existing scenes engine can draw one) where the player is handed the Mop of Yendor.
- **No-mop ending**: an equally warm, funny epilogue with no mop: e.g. promoted to
  "Senior Janitor" for showing up, "Employee of the Month (by default)", the comrades
  throw a party anyway. Tone: everything turned out fine. Never "you failed".
- Then the **results card**, centered, framed, designed to be screenshotted:
  - title line with the ending reached,
  - Mop points (and target), average clean %, grade per day (e.g. `B A S A B`),
  - best combo, objectives done, requests done, comrades befriended,
  - zorkmids earned, the silliest thing bought, the mop's name if set with `#name`,
  - achievements **newly unlocked this run** (count + a few names) and the lifetime
    collection (`12 / 20`). Our call: already-owned achievements are not re-tracked per run.
  - a short random funny "review" line from the comrades.
- A key on the card (`C`) **copies a plain-text version** to the clipboard
  (`navigator.clipboard.writeText`, with a graceful fallback message if unavailable).
  The text version is Wordle-style: compact, a few lines, ASCII/Unicode only, ends
  with the game's name. The card also shows that the text was copied.
- After the card: back to the title screen. The finished run's save is cleared.
- The personal best changes meaning: store the **best run** (points, ending) instead
  of the best single shift; the end-of-shift card may still show today's grade.

### 3. Save and continue

- Save automatically **at the start of each day** (after the night, before the
  invasion). Leaving mid-shift and coming back restarts that day's shift from its
  start. (Our call; the user agreed with the summary.)
- Title screen: if a save exists, offer **Continue (day N)** and **New game**; new
  game overwrites the save. With no save, the title works as today.
- What a save must restore so a day plays correctly: day number, Mop points,
  zorkmids, inventory, achievements progress for the run, keepsakes and decorations,
  `convoTags` (paint colour, animal, union, etc.), the comrades (names, species,
  relationships, interactions, quests, retired/partying, hats…), pets and the adopted
  pet, past heroes (for ghosts), name registry, unionist, today's grades, run stats,
  and the RNG state so the day regenerates the same way.
- A save carries a version number. An unreadable or old save is discarded with a
  friendly line on the title screen.
- Achievements and best run live in their own keys and survive "New game".
- This is the riskiest part of the phase (entities hold references to each other and
  to the map). The builder chooses the serialization approach; the plan must include
  a round-trip test: play a day headlessly, save, load into a fresh context, and
  check that the next day generates and plays identically.

### 4. Zorkmids

- New currency, shown in the panel (`$ 37 zm` or similar).
- **End-of-day pay** always, by grade: S 40, A 30, B 20, C 12, D 6 (our starting
  values; builder may tune).
- **Coins in the dungeon**: picking up a coin mess gives a few zorkmids (1–3, or more
  for variants). The hero scatters noticeably more coin than today (e.g. chests
  scatter 3–4 coin piles instead of 2, and an occasional extra coin drop during the
  invasion). The coin request from colleagues keeps working.
- The coin pick-up message mentions the zorkmids ("You pick up the scattered zorkmids.
  (+2 zm)").

### 5. Shop and inventory

- **The shop**: a **fixed NPC** in the staff lounge, present every day from day 1:
  a **mimic** who pretends to be the shop counter (fits the existing mimic jokes).
  Our call: it is *not* a regular comrade. It never joins quest, invitation,
  retirement or union logic, is created with `Flavor.rng` (no world-RNG use, so
  invasion determinism is untouched), and is rebuilt each day rather than saved as
  a comrade (only its name, if randomised, is saved). Talking to them opens the shop
  through the conversation engine (lettered choices), 3–5 items per day from a larger
  pool, with prices.
- The shopkeeper and every item description say clearly that it **does nothing**
  ("Strictly decorative. Absolutely no refunds. Does not make you clean faster.").
- **Item pool** (builder writes the final list, 25+ items), three kinds:
  - **Food and drink**: eaten right away for a funny line ("You eat the Suspicious
    Dungeon Croissant. You feel exactly the same.").
  - **Absurd objects**: kept in the inventory, examinable ("Left-Handed Bucket",
    "Certificate of Authenticity for a Rock", "Ten-Foot Pole (3 ft)").
  - **Cosmetic tool upgrades**: "Mop of Mild Enthusiasm", "Gilded Toilet Brush",
    "Artisanal Squeegee"... The player can **equip** one per tool from the inventory;
    it changes only the tool's name in messages and examine text. No effect.
  - Some items can be **placed in the lounge** as decorations (posters, a plant, a
    rubber duck…). See section 10.
- **Inventory** (`I`): a full-screen list like the help screen: items grouped by
  kind, with descriptions, equip / place actions, the zorkmids total, and the
  keepsakes received. Closes with `I`, `Esc`, `X`, `Backspace`.

### 6. New cleaning tools (these do matter)

Today the verbs are mop (`M`), pick up (`P`/`G`) and fix (`F`/`R`). New tools arrive
during the run as "new equipment from HR", announced on that morning's memo:

- **Vacuum** (`Z`), from **day 2**: cleans dry, fluffy messes, i.e. cobwebs, feathers,
  spores, bone dust, soot, gravel, splinters and similar. It sucks **every** such
  mess within reach at once (all 8 neighbours). It is a **shortcut, not a lock**
  (our call): the old mop / pick-up still clean these one at a time, so nobody gets
  stuck short of 100% and existing mess behaviour and tests stay valid.
- **Squeegee**, from **day 3**, used with `M` on water: clears a whole connected
  puddle of water (up to a cap, e.g. 12 tiles) in one action. Needed mostly by the
  flooding fountain (section 9).
- **Scrub brush**, from **day 4**, used automatically by `M` on stubborn stains
  (graffiti, acid, ectoplasm, scorch…): they take one pass instead of several.
- Help screen, how-to screen and the panel list the tools you own. The panel's
  "mess left" categories should tell which tool each category needs.
- The builder decides the exact mess-to-tool mapping from the existing mess list and
  writes it in the plan.

### 7. Cleaning combos

- Each successful cleaning action (any tool) within **3 turns** of the previous one
  extends the combo; a longer pause, or stepping into a mess that spreads (tracking
  dirt), breaks it.
- The panel shows the running combo (`Combo x7`). At milestones (5, 10, 20, 30…) a
  short message and a bonus in Mop points (our starting values: +5 at 5, +10 at 10,
  +20 at each further 10). Best combo of the day and of the run are tracked.
- No log spam: one line per milestone, not per step.

### 8. Daily objectives and room names

- Every room gets a **random funny name** each day (e.g. "the Hall of Mild Peril",
  "the Slightly Haunted Pantry", "Corridor of Regret"), built from word lists; the
  staff lounge keeps its name. Corridors are "a corridor".
- The panel shows **where you are**: `You are in: the Hall of Mild Peril`.
- The morning memo lists **1–2 objectives** for the day, for example: leave a named
  room spotless; pick up every coin; reach a 15 combo; chat with 3 colleagues; fix all
  the broken furniture in a named room. Each has a reward in Mop points and zorkmids.
- Progress is visible in the panel (short form). Completing one shows a message (and
  may unlock an achievement). Objectives must be achievable in a normal shift.

### 9. New shift events

They join the existing pool of one random event per day (from day 2), with the same
availability rules style as `DayEvents`.

- **The flooding fountain** (day 3+, needs a fountain): the fountain is broken and
  water spreads widely around it (radius 3–4, lots of tiles). The squeegee makes it a
  satisfying cleanup, not a chore. Slippery rules for water stay as they are today.
- **The sleeping dragon** (day 3+): a big friendly dragon naps in a corridor or room,
  blocking tiles. It snores small puffs of soot now and then (capped). Bumping it gets
  a sleepy line; bumping it a third time makes it roll over so you can swap past it.
  It must never block the only way to somewhere permanently. It wakes up and heads to
  the lounge near the end of the shift or when you chat with it (builder's call), and
  becomes a visitor you can talk to.
- **The goblin intern** (day 2+): an eager intern follows you for part of the shift
  and occasionally makes a small mess (a drip, a dropped mug, a crumb). Caps so it is
  never tiresome: at most ~10 messes per day, stops after a while (e.g. 60 turns) or
  as soon as you chat with them and send them to the lounge for "training".

### 9b. Wands, staves and rings (user's request)

Traditional roguelikes (NetHack, Brogue, Rogue) have wands and staffs of many
materials, and rings. The hero should use some during the invasion and leave them
behind as mess.

- **Wands and staves**: during the invasion the hero sometimes **zaps** a wand or
  staff (oak, balsa, glass, iron, bone, crystal, "suspiciously sticky"…) with a funny
  log line and a visible effect that makes the usual kind of mess (scorch, frost
  water, sparkles, a startled comrade fainting theatrically…). Afterwards the item is
  left on the floor **broken or used up** ("Snapped Oak Wand", "Empty Glass Wand
  (0:0)", "Staff of Slight Breeze, cracked"). They are litter, picked up with `P`/`G`
  (or, for a snapped staff, fixed with `F`, builder's call), with examine text.
- **Rings**: **at most 1–2 per day**. The hero drops or loses them (tried one on,
  didn't like it, it was cursed and itchy…). A ring is a special pick-up: it goes to
  the **inventory** with an unidentified name ("a jade ring") and funny lore once
  examined ("Ring of Mildly Increased Snack Detection"). No gameplay effect, like
  shop items. Finding one could count toward an achievement.
- These are produced by the **invasion simulation** using the world RNG in the same
  code path in normal, fast and skip modes (determinism rules unchanged).
- Glyphs and colours follow roguelike tradition where free (`/` wand, `=` ring);
  the builder checks for clashes with existing glyphs (the smashed candelabrum also
  uses `/`) and picks colours by material.

### 10. Keepsakes and lounge decorations

- When you finish a comrade's request (or find their lost item), they may give you a
  **keepsake** (a drawing, a pet rock, a badly knitted scarf…), named after them.
- Keepsakes and decorations bought in the shop appear in the **staff lounge** from the
  next day, as examinable furniture on free spots (wall-adjacent tiles that do not
  block seating or the exit). They persist through the run (saved).
- Because the run is only 5 days, keepsakes start appearing from **day 2**.

### 11. Achievements

- 15–25 funny achievements, persisted across runs in their own localStorage key, each
  unlocked once. Examples (builder writes the final list): "Floor Is Lava (Not Really)"
  (slip 10 times), "Workplace Synergy" (chat with every colleague in one day), "Cookie
  Monster" (read 5 fortunes), "Union Rep" (learn the union story), "Elbereth Eraser",
  "Big Spender" (spend 100 zm on nothing), "Zero Waste" (finish a shift at 100%), "I
  Can Stop Whenever I Want" (30 combo), "Let Sleeping Dragons Lie", "HR Was Informed"
  (send the intern to training), "Pet Whisperer", "You Found Me" (secret room), one
  per ending, and a few hidden ones tied to easter eggs.
- **Toast**: when unlocked, a small framed box near the top-right of the map viewport
  for about 3 seconds ("★ Achievement unlocked: …"), with a short jingle using the
  existing Sfx. Queue toasts if several unlock at once. It must not hide the player.
- A list of achievements (locked ones shown as `???` with a hint) is reachable from
  the title screen and from the inventory screen.

### 12. UI pass

- **End-of-shift report as a card**: the plaque and the report become one centered,
  framed card (grade shown big, a bar for clean %, today's points, zorkmids earned,
  combos, objectives), instead of plain text at the bottom left.
- **The plaque is obviously a joke** (user's request): it is about your **back**, not
  you. Keep the tombstone-parody shape if it reads well, but the text must make the joke
  explicit (e.g. "HERE LIES YOUR BACK — it'll be fine after a nap", "sore from:" instead
  of "killed by:"), and the question **"Do you want your mess identified? [ynq]" loses
  the `[ynq]`**: it becomes a statement that leads into the report.
- **Automatic zoom**: when the player has not chosen a zoom (`0` = automatic), the font
  size is picked so the day's whole dungeon fits the map viewport, within the existing
  min/max sizes. Manual `+`/`-` still overrides and is remembered as today.
- **Minimap** in the side panel: a scaled-down view of the explored dungeon (a few map
  tiles per character), showing the player, the lounge, and where mess remains. Only
  if the panel has room; otherwise hidden. The user wants to "see how it looks", so
  the plan should include a check-in screenshot for it.
- **More visible cleaning**: a short shine on freshly cleaned tiles (fades after a few
  seconds), and the panel's clean % bar coloured by tiers (red → yellow → green).
- **Lighting**: wall torches cast a warm glow on nearby floor; light fades a little
  with distance from the player within view. Subtle: readability first.

### 13. Fixes from the review

- The plaque prompt `[ynq]` (covered in 12).
- The personal best is saved before the player confirms leaving; save it only once the
  shift really ends (and it now becomes "best run", section 2).
- `cleanPercent()` has side effects (it triggers coffee / invitation quests and is
  called on every panel redraw). Split it into a pure percentage and a separate check
  run after cleaning actions. Also guard the `messNumbers[1] == 0` case everywhere.
- The free-tile search near a point is copied four times (`entity.js`, `pet.js`) and
  does not find the nearest tile; extract one helper that does. `Pet.recenter` must not
  move when no tile is found.
- Pet movement: `path==null` checks that never fire, and `steps` never decremented.
- Questing comrades run two full A* searches per turn when the player is unreachable;
  remove the dead branch and avoid the repeated search.
- `Adventurer.tagWall` duplicates `wallsAround()`.
- "the Treasure Chest" keeps its capitals in push / swap messages.
- A visitor named Marx can become the union founder (skip union logic for visitors).
- `Sfx.noise` builds a new buffer on every sound (cache it).
- `Player.getArt` returns `this.bgcolor` (typo, undefined).

## Left to the builder

- Final word lists (room names, shop items, keepsakes, achievements, ending texts,
  comrade reviews), within the tone above.
- Exact mess-to-tool mapping, combo and objective values, prices and pay (starting
  values above), and the `targetPoints` tuning.
- The serialization approach for saves.
- How the shop and inventory screens are drawn, as long as they match the existing
  text-screen style (help screen, how-to screen).
- Splitting the work into phases. Suggested order, each phase playable on its own:
  1. fixes + 5-day run + endings + results card + save/continue + zorkmids;
  2. tools + combos + objectives + room names + wands, staves and rings;
  3. shop + inventory + keepsakes/decorations + achievements;
  4. new events + UI pass (card, auto-zoom, minimap, shine, lighting).
