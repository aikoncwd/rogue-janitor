// Things the dungeon remembers: funny names for everyday mess, rumors, memos, hints,
// visitors... Data only (plus tiny helpers). Invasion lines live in flavor.js.
var Lore = {
    // Chance that a piece of litter shows up under one of its funny names.
    VARIANT_CHANCE: 0.4,

    // makeMess type -> alternative names (same glyph, colour and clean method).
    variants: {
        LoosePages: [
            { name: 'Page of the Necronomicon (do not read aloud)', desc: 'You decide not to read it. Good call.' },
            { name: 'Scroll labeled KLAATU BARADA NIKTO', desc: 'You remember the first two words. The third one... nectar? nickel?' },
            { name: 'Scroll labeled ELBIB YLOH', desc: 'It smells faintly of incense and bad decisions.' },
            { name: 'Scroll labeled READ ME', desc: 'You do not read it. Nobody ever reads the README.' },
            { name: 'Dog-eared Spellbook of Force Bolt' },
            { name: 'Unpaid Invoice from the Shopkeeper', desc: '"Usage fee: 1 footprint, 5 zorkmids."' },
            { name: "Page from 'Mopping for Dummies'", desc: 'Chapter 3: "Mop, then rinse. Never the other way around."' },
            { name: 'Overdue Library Book', desc: 'Checked out by one "R. of Yendor". Three thousand years overdue.' },
            { name: 'Tome of Lore (spoilers)' },
            { name: 'Map of the Next Level (wrong)' },
            { name: 'Instruction Manual for a Mimic', desc: 'Step 1: look like a chest. Step 2: there is no step 2.' },
        ],
        SpentScroll: [
            { name: 'Scroll of Remove Curse (expired)' },
            { name: 'Rune of Recall (smudged)' },
            { name: 'Scroll of Identify (it was a scroll)' },
            { name: 'Scroll of Magic Mapping (crumpled)' },
            { name: 'Scroll labeled FOOBIE BLETCH', desc: 'Whatever it did, it did it already.' },
        ],
        EmptyPotion: [
            { name: 'Empty Potion of Booze' },
            { name: 'Empty Potion of See Invisible (probably)' },
            { name: 'Unidentified Murky Potion', desc: 'It is empty. You are still not sure what it was.' },
            { name: 'Empty Potion of Descent' },
            { name: 'Potion of Gain Level (empty, sadly)' },
            { name: "Bottle labeled 'DO NOT QUAFF'", desc: 'Somebody quaffed it.' },
        ],
        EmptyBottle: [
            { name: 'Empty Potion of Fruit Juice' },
            { name: 'Flask of Holy Water (mostly)' },
            { name: 'Bottle of Dwarvish Ale (dregs)' },
            { name: 'Bottle with a message: HELP, STUCK IN DUNGEON' },
        ],
        AppleCore: [
            { name: 'Lichen Corpse (still fresh)', desc: 'Lichen never rots. That is the whole trick.' },
            { name: 'Half-eaten Slime Mold' },
            { name: 'Food Ration Wrapper' },
            { name: 'Tin of Spinach (opened)' },
            { name: 'Lembas Crumbs' },
            { name: 'Fortune Cookie', desc: 'There is a little paper inside.', pickup: 'fortune' },
            { name: 'Mystery Meat', desc: 'You decide it is chicken.' },
        ],
        DroppedSword: [
            { name: 'Dull Vorpal Blade' },
            { name: 'Rusty Long Sword +0' },
            { name: 'Excalibur (rental)', desc: 'Return to the Lady of the Lake by Friday.' },
            { name: 'Cursed Two-Handed Sword', desc: 'It is welded to nobody, thankfully.' },
            { name: 'Wooden Practice Sword' },
            { name: 'Elven Dagger, bent' },
        ],
        GoldCoins: [
            { name: 'Scattered Zorkmids' },
            { name: 'Gold Coins (chocolate)', desc: 'Somebody already took a bite.' },
            { name: 'Pile of Au' },
        ],
        Crossword: [
            { name: 'Cheap Plastic Ring' },
            { name: 'Ring of Free Action (from a cereal box)' },
            { name: 'Ring of Teleport Control (does nothing)' },
            { name: 'Cheap Plastic Amulet of Yendor (souvenir)', desc: 'Rodney sells these at the gift shop.' },
            { name: 'Fake Amulet of Yendor (made in Minetown)' },
        ],
        EmptyMug: [
            { name: "Mug: WORLD'S OKAYEST GOBLIN" },
            { name: 'Mug: I SURVIVED THE DUNGEONS OF DOOM' },
            { name: 'Mug: RNG IS MY CO-PILOT' },
            { name: 'Mug: I <3 PERMADEATH' },
        ],
        Wrapper: [
            { name: 'Elbereth Bar Wrapper' },
            { name: 'Protein Bar Wrapper (+1 STR)' },
            { name: 'Snack Wrapper (Ham-flavoured)' },
            { name: 'Candy Wrapper' },
        ],
    },

    // NetHack-tradition rumors: fortune cookies and, now and then, the title screen.
    rumors: [
        "They say that the janitor knows where every secret door is.",
        "They say the eels in Brogue are judging your mopping.",
        "They say Trog would never read a memo.",
        "They say in Sil you gain experience by noticing things. Notice the stains.",
        "They say Morgoth never once cleaned up after himself.",
        "They say Cogmind robots pick up their own parts. Show-offs.",
        "They say in Infra Arcana, the lights go out right when you finish mopping.",
        "They say you should never melee a floating eye. Or mop one.",
        "They say the RNG giveth, and the RNG taketh away.",
        "They say this dungeon was generated from seed 42.",
        "They say a Mop of Yendor exists. They say a lot of things.",
        "They say Rodney still hasn't returned the Amulet to the library.",
        "They say Rodney keeps the real Amulet in his sock drawer.",
        "They say permadeath is just a strong opinion.",
        "They say the @ stands for 'Absolutely clean'.",
        "They say every YASD starts with 'I'll just...'.",
        "They say the shopkeeper charges for every footprint.",
        "They say Elbereth is tired of being written on floors.",
        "They say a wand of digging makes a terrible mop.",
        "They say the Oracle mostly answers questions about stains.",
        "They say you can't mop a cockatrice. Not twice, anyway.",
        "They say procedural generation is just the dungeon rearranging the furniture.",
        "They say the stairs down always lead to more stairs down.",
        "They say the hero never reads the scroll of remove mess.",
        "They say the Dungeon Crawl orcs keep a very tidy barracks.",
        "They say Angband has a hundred levels and not one janitor.",
        "They say the deepest level of Brogue has the cleanest floor.",
        "They say in Sil-Q, the songs of the Noldor scare off dust bunnies.",
        "They say Infra Arcana's cultists never wipe their boots.",
        "They say Cogmind leaves no stain behind. It leaves parts.",
        "They say the bones of a dead hero are worth a lot of points.",
        "They say ascension is just mopping all the way up.",
        "They say 'You feel like someone is helping you' means the janitor came by.",
        "They say a floating eye is just a security camera with feelings.",
        "They say mimics only pretend to be messes when they're bored.",
        "They say the RNG has a favourite colleague. It won't say who.",
        "They say the hero's mother still does their laundry.",
        "They say the hydra had to fill in nine timesheets.",
        "They say quaffing from the fountain is how wishes, and colds, happen.",
        "They say the best roguelike is the one with the cleanest dungeon.",
        "They say the Wizard of Yendor retired to grow tomatoes.",
        "They say no seed has ever generated a clean dungeon.",
        "They say the slimes are slippery on purpose.",
        "They say the kobolds run the best book club in the dungeon.",
    ],

    rumor: function () {
        return Flavor.rng.getItem(this.rumors);
    },

    // The variant record for a name, if any.
    variantNamed: function (type, name) {
        let list = this.variants[type] || [];
        for (let i = 0; i < list.length; i++) {
            if (list[i].name == name) {
                return list[i];
            }
        }
        return null;
    },
};

if (typeof module !== 'undefined') module.exports = Lore;
