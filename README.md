# Rogue Janitor

```
  ####################################
  #..............  ~~ .  ,,  ....... #
  #  .  @-   ,,,   ~~~~    "  §   ♥  #
  #   . ' .  !   , , ~~  .   $  D z  #
  ####################################
     somebody has to clean this up.
```

**A cozy roguelike about the morning after.** Every night a hero raids the dungeon. Every morning, you grab the mop.

You are the janitor of the Comrade Dungeon. You don't fight, you don't loot and you can't die. You watch last night's security footage, sigh, and get to work: mop the fake blood, pick up the empty potions, fix the smashed barrels and take long breaks in the staff lounge with the monsters, who are honestly lovely people.

A run is **five working days**, about the length of a coffee break.

> This is a fork of [laurheth/rogue-janitor](https://github.com/laurheth/rogue-janitor), the original 7DRL-style game by Lauren Hetherington ([play the original](https://laurheth.itch.io/rogue-janitor)). This fork expands it into a short, replayable run full of extra silliness.

## A day at work

1. **Night.** A hero kicks the door in. You aren't playing yet: it's a recording, with a blinking `● REC` and a ticking clock. The tape starts paused: `Space` plays or pauses, `→` steps one turn, `F` fast-forwards, `R` rewinds to the start and `Esc` skips. During your shift, `Tab` reads the whole night in the security log.
2. **Morning.** A memo on the corkboard sets the day's goals. The mess is all yours: puddles to mop, litter to pick up, furniture to fix, footprints that spread if you walk through them.
3. **Breaks.** The fainted monsters dust themselves off and retire to the staff lounge. Chat with them, do them favours, find what they lost and spend your zorkmids at Mimsy's shop.
4. **Evening.** You get a report card and a plaque for your poor back, then a night out (or in) with your colleagues.

Do well all week and they may hand you the legendary **Mop of Yendor**. Do badly and... you get promoted anyway. Nobody loses here.

## Highlights

- **A different mess every night.** A procedurally generated dungeon, a fully simulated adventure you only see the aftermath of, and twelve hero classes who each make a mess in their own way (wizards scorch, rangers miss, bards leave sheet music everywhere...).
- **New gear as the week goes on.** A vacuum for fluff, a squeegee for whole puddles and a scrub brush for stubborn stains.
- **Combos and goals.** Clean one thing after another to build a streak, and tick off the morning memo for points and zorkmids.
- **Colleagues worth talking to.** Favours, lost items (watch for the `!`), keepsakes when you help, and gossip about how their shift went.
- **Mimsy the Mimic's Perfectly Useless Shop.** Snacks, posters and a Turbo-Vac 3000 that works exactly like your old vacuum. Hang the decorations up in the lounge.
- **Shift events.** A fountain that floods a room, a dragon napping in a corridor and Gribble the goblin intern, who is very eager to help.
- **Over 20 achievements**, some of them secret, plus NetHack-style `#commands` and a famous code or two.
- **Chiptune music and sound effects** synthesized live in the browser, with no audio files at all.
- **Saves every morning.** Close the tab and pick the run up later.
- **A shareable results card** at the end of the week (`C` copies it as text).

## Controls

| Key | What it does |
| --- | --- |
| arrows, numpad, WASD, `hjkl yubn` | move |
| `.` or `5` | wait a turn |
| `M` | mop |
| `P` / `G` | pick up |
| `F` / `R` | fix |
| `Z` | vacuum (from day 2) |
| `E` / `X` | examine |
| `I` | your pockets (`Tab` for achievements) |
| `Tab` | last night's security log |
| walk into someone | chat, pet, shop |
| `?` | full help |
| `V` / `T` | sound / music |
| `+` / `-` / `0` | zoom / auto-fit |

## Running it

It is plain HTML and JavaScript, so there is no build step. Serve the folder with any static server and open `index.html`:

```sh
npx serve .            # or: python -m http.server
```

[rot.js](https://ondras.github.io/rot.js/hp/) is loaded from a CDN, so the first load needs an internet connection.

The tests run with Node's built-in runner, with no dependencies:

```sh
node --test tests/
```

## Credits

- Original game: **Lauren Hetherington** ([laurheth/rogue-janitor](https://github.com/laurheth/rogue-janitor)), made in about a week and a half.
- This fork: **AikonCWD**.
- Built with [rot.js](https://ondras.github.io/rot.js/hp/). Released under the [MIT License](LICENSE).
