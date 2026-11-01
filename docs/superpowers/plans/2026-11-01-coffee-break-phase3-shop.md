# Coffee-break run, part 3: achievements, shop, inventory, keepsakes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Funny achievements with a toast, a mimic shopkeeper selling useless things for zorkmids, an inventory screen (`I`), and keepsakes/decorations that fill the staff lounge across the run.

**Architecture:** Three new modules: `script/achievements.js` (`Achievements`: definitions, `unlock(id)`, toast queue, list screen lines), `script/shop.js` (`Shop`: the shopkeeper object, today's stock, buying, the shop screen), `script/inventory.js` (`Inventory`: the screen, equip/place actions, `Decor` placement in the lounge). Shop and inventory are modal screens owned by the player's key handler (`Player.handleEvent` routes keys while one is open; `Game.drawMap` draws it over the map, like the help screen).

**Tech Stack:** vanilla JS, rot.js 2.2.1, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-01-coffee-break-run-design.md` §5, §10, §11. Base: `feat/phase3-part2`.

## Global Constraints

- Shop items, cosmetic tools and decorations have **no gameplay effect**; every description or the shopkeeper says so.
- The shopkeeper is **not** a comrade: not in `Game.monsterList`, not in the scheduler, never quests/union/invites; created without `ROT.RNG` (a plain object with `getArt`, `cleanerAct`, `describe`, `name`, `tags: {shop: true}`), placed each morning on a free lounge tile.
- Achievements persist across runs in localStorage `rj-achievements` (`{id: true}`), survive New game; `Game.run.newAchievements: string[]` lists this run's first-time unlocks (saved with the run).
- Toast: a framed box at the top-right of the map viewport for `Achievements.TOAST_MS = 3000`, queued one at a time, never drawn over the player's tile; Sfx `'secret'`.
- Keys: `I` opens the inventory (only free letter left besides `Z`); inside screens, letters `a`–`z` pick entries, `Esc`/`X`/`Backspace` close. Title: `[a] achievements` line; `a` opens the list, any key closes it.
- Keepsakes from day 2: finishing a request (`requestThanked`) or returning a lost item (`questItemSuccess`) gives a keepsake named after the comrade (once per comrade per day).
- Decorations (placed keepsakes + bought decor) appear in the lounge each morning on free floor tiles next to a lounge wall that are not the exit door and not adjacent to it; at most `Decor.MAX = 6`.
- All new run state (`inventory`, `equipped`, `run.newAchievements`, `run.spent`, `run.silliest`) is saved; old saves default it.

## Review Focus

1. **Buying with too few zorkmids**: refused kindly, no negative wallet. → Task 2 `you can't buy what you can't afford`.
2. **Opening the shop/inventory while a toast or a conversation is up**: keys go to one place only; closing returns to normal play with the engine still waiting for the player. → Task 3 `screens close back to play`.
3. **An achievement unlocked twice** (or unlocked with no storage): one toast, no throw. → Task 1 `unlock is once, storage optional`.
4. **A lounge too small for decorations**: fewer are placed, nothing blocks the exit or seats. → Task 4 `decor never blocks the exit`.
5. **Continue with items equipped and decor placed**: all restored. → Task 4 `inventory and decor survive a save`.

---

### Task 1: Achievements (spec §11)

**Files:** Create `script/achievements.js`; modify `index.html`, `tests/harness.js`, `script/game.js` (draw toast, `run.newAchievements`), `script/title.js` (`[a] achievements` + list screen), `script/ending.js` (card line), hooks in `player.js` (slip, fortune, ring, secret door, elbereth, mimic, vacuum ≥4, 100% shift via `Game.endShift`), `pet.js` (petting), `eastereggs.js` (`#xyzzy`, Konami), `game.js` (`comboHit` 10/30, `endShift`, `endRun`), `goals.js` (both goals in a day), `entity.js` (chat with every lounge comrade in a day). Test `tests/achievements.test.js`.

**Interfaces:** `Achievements.LIST: [{id, name, desc, hidden?}]` (≥ 20 entries now; part 4 adds dragon/intern ones); `Achievements.unlock(id): boolean` (true when new); `Achievements.has(id)`; `Achievements.count(): {got, total}`; `Achievements.toast(): {text, until} | null`; `Achievements.listLines(width): string[]`; counters on `Game.run.counts = {slips, fortunes}`.

- [ ] Tests: `unlock is once, storage optional`; `a toast shows then goes`; `hooks unlock: slip x10, 5 fortunes, combo 10, ring, 100% shift, petting`; `title lists achievements with ??? for locked hidden ones`; `the card counts this run's new achievements`.
- [ ] RED → implement → suite GREEN → commit `feat: achievements with a toast`.

### Task 2: The shop (spec §5)

**Files:** Create `script/shop.js`; modify `index.html`, harness, `script/game.js` (`moveMonstersToLounge` end → `Shop.place()`; draw shop screen), `script/player.js` (route keys while `Shop.open`), `script/lore.js` (`shopItems` ≥ 25, `shopkeeperLines`). Test `tests/shop.test.js`.

**Interfaces:** `Shop.keeper` (plain object, see constraints; name `"Mimsy the Mimic (Shopkeeper)"`), `Shop.place(): void`, `Shop.stock: item[]` (4 per day, picked with `Flavor.rng`), item = `{id, name, kind: 'food'|'object'|'tool'|'decor', price, desc, tool?}`; `Shop.isOpen: boolean`, `Shop.openShop()`, `Shop.close()`, `Shop.buy(index): string` (message), `Shop.handleKey(e): boolean`, `Shop.lines(): string[]`. Spending updates `Game.zorkmids`, `run.spent`, `run.silliest` (most expensive non-food item); food is eaten at once (funny line), others go to `Game.inventory`.

- [ ] Tests: `the shopkeeper is in the lounge every day, not a comrade`; `bumping opens the shop`; `buying spends zorkmids and fills the pocket`; `food is eaten at once`; `you can't buy what you can't afford`; `every item says it does nothing` (desc or keeper line matches /nothing|decorative|no effect|does not/i); `big spender unlocks at 100 zm`.
- [ ] RED → implement → GREEN → commit `feat: a mimic sells you useless things`.

### Task 3: Inventory screen (spec §5)

**Files:** Create `script/inventory.js`; modify index/harness, `script/player.js` (`I` key, routing), `script/game.js` (draw), cosmetic tool names in clean/vacuum/squeegee/brush messages via `Inventory.toolName(tool)`. Test `tests/inventory.test.js`.

**Interfaces:** `Game.equipped = {mop?, vacuum?, squeegee?, brush?, grabber?, toolbox?}` (item ids); `Inventory.isOpen`, `Inventory.openInv()`, `Inventory.close()`, `Inventory.lines(): string[]` (wallet, items grouped, keepsakes, rings with lore, achievements count), `Inventory.handleKey(e)`: letter → equip tool / toggle place decor; `Inventory.toolName(tool): string | null`.

- [ ] Tests: `I opens and Esc closes`; `screens close back to play` (after closing, a move key moves the player); `equipping renames the vacuum in messages`; `decor can be marked to place`; `rings show their lore`.
- [ ] RED → implement → GREEN → commit `feat: an inventory for your pockets`.

### Task 4: Keepsakes and lounge decorations (spec §10)

**Files:** `script/inventory.js` (`Decor.place()`), `script/entity.js` (keepsake on `requestThanked`/`questItemSuccess`), `script/game.js` (`moveMonstersToLounge` → `Decor.place()`), `script/lore.js` (`keepsakes`), `script/save.js` (`equipped`). Test `tests/decor.test.js` (new name: `tests/keepsakes.test.js`).

**Interfaces:** `Keepsakes.give(comrade): item | null` (day ≥ 2, once per comrade per day); `Decor.MAX = 6`; `Decor.place(): number` (placed count); decoration objects `{char, color, name, desc, tags: {decor: true}, getArt, cleanerAct, describe}`.

- [ ] Tests: `a finished request gives a keepsake from day 2`; `keepsakes and bought decor appear in the lounge next morning`; `decor never blocks the exit`; `inventory and decor survive a save`.
- [ ] RED → implement → GREEN → commit `feat: keepsakes and lounge decorations`.

### Task 5: Chrome check + README

- [ ] Play: shop (buy food, decor, a cosmetic mop), `I` (equip), next day decor in the lounge, a toast. Screenshots. README. Suite green. Commit.
