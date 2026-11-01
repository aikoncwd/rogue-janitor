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

    // Pinned to the corkboard every morning.
    memos: [
        "Please stop dying in the hallway.",
        "The fountain is NOT a bathtub.",
        "Whoever keeps writing Elbereth on the walls: we know it's you, Kevin.",
        "The RNG has been instructed to be nicer.",
        "Rodney, please return the Amulet to lost & found.",
        "Fake blood goes in the RED bucket. Real ketchup goes on fries.",
        "Mimics: please stop pretending to be the mop bucket.",
        "Reminder: theatrical fainting is not a sick day.",
        "Whoever ate the lichen in the fridge: it was not yours. It never rots, but still.",
        "Hero season is here. Please remember to stretch before dying.",
        "The secret door is a secret. Stop telling the heroes.",
        "Team-building trust fall on Friday. Skeletons, please hold on to your bones.",
    ],
    amuletMemo: "The Amulet of Yendor has been stolen again. Rodney says it's fine, he has spares.",

    // What a shift event says when it starts.
    eventNews: {
        inspector: "A health inspector is visiting the staff lounge today. Better make it shine!",
        birthday: "It's {monster}'s birthday today! There's cake in the lounge.",
        mimicStain: "One of today's stains looks... suspiciously smug.",
        bones: "You feel a chill. A ghost is waiting in the staff lounge.",
        rodney: "Rodney is having tea in the staff lounge today.",
    },

    birthdayLines: [
        "It's my birthday today! ^.^",
        "Somebody baked a cake and everything. Have a slice!",
        "You sing a slightly off-key happy birthday. They love it.",
    ],

    inspectorVerdict: {
        good: [
            "The inspector nods: \"Spotless. Well, nearly. A+ for the dungeon!\" (+100)",
            "The inspector beams: \"I could eat lichen off this floor!\" (+100)",
            "The inspector stamps a gold star on their clipboard. (+100)",
        ],
        bad: [
            "The inspector frowns at a sticky footprint: \"We'll talk next time.\"",
            "The inspector writes for a very long time on the clipboard.",
            "The inspector slips on something and leaves without a word.",
        ],
    },

    // Funny causes of death for heroes' ghosts and the end-of-shift plaque.
    // The two endings of a run (one page per line) and what your comrades say about you.
    endingMop: [
        "Five days. Five shifts. One very tired back.",
        "On your way out, the whole staff lounge is waiting for you. Somebody hid a cake behind the fountain.",
        "Rodney steps forward, looks both ways, and hands you something wrapped in a hero's cape.",
        "It is the legendary %c{#ff0}Mop of Yendor%c{}! It hums faintly. It smells of lemons and victory.",
        "Its mystic energies flow through your hands. No mess will ever stand in your way again. (Mess has been informed.)",
        "%c{#ff0}You won the hearts of your comrades and, by extension, this game. Thank you for playing!%c{}",
    ],
    endingSenior: [
        "Five days. Five shifts. One very tired back.",
        "On your way out, the whole staff lounge is waiting for you. There is a banner. It is spelled almost right.",
        "The Mop of Yendor stays in its glass case for now. Rodney says it is 'mostly decorative anyway'.",
        "Instead, you are promoted to %c{#ff0}Senior Janitor%c{}! The badge is a bottle cap. You get a slightly comfier chair.",
        "Also: Employee of the Month (by default, but it still counts). Everybody claps. The mimic claps loudest.",
        "%c{#ff0}You won the hearts of your comrades, and they want you back tomorrow. Thank you for playing!%c{}",
    ],
    comradeReviews: [
        "★★★★★ would get fainted on again",
        "Best janitor this dungeon has had. Also the only one.",
        "Mopped around me while I was being dramatic. Very professional.",
        "Found my missing umbrella. I owe you one hydra hug per head.",
        "The floors are so clean I can see my many reflections.",
        "10/10, did not slip on anything. Okay, once.",
        "Listened to all my stories. Even the long one about the ogre.",
        "Never once asked what's in the barrels. A true professional.",
        "Smells faintly of lemon. We approve.",
        "Gave the heroes nothing to complain about. They complained anyway.",
        "Fixed my bookshelf and didn't judge my bookshelf.",
        "Our union rep says you can stay forever.",
    ],
    // Wands, staves and rings the hero leaves behind.
    wandMaterials: [
        { name: 'Oak', color: '#c96' }, { name: 'Balsa', color: '#eda' }, { name: 'Glass', color: '#aef' },
        { name: 'Iron', color: '#99a' }, { name: 'Bone', color: '#eee' }, { name: 'Crystal', color: '#c9f' },
        { name: 'Driftwood', color: '#a98' }, { name: 'Suspiciously Sticky', color: '#da3' },
    ],
    zapEffects: [
        { line: 'A fireball scorches the floor. Nobody was standing there. Probably.', mess: 'Scorch', staff: 'Firebolt' },
        { line: 'It rains indoors for a moment.', mess: 'Water', staff: 'Drizzle' },
        { line: 'A puff of soot. The wand coughs.', mess: 'Soot', staff: 'Mild Smoke' },
        { line: 'Mushrooms sprout, sneeze, and vanish.', mess: 'Spores', staff: 'Fungal Growth' },
        { line: 'A ghostly glow splashes everywhere.', mess: 'Ectoplasm', staff: 'Spooky Lights' },
        { line: 'Holy water sprinkles out. The floor feels blessed and damp.', mess: 'HolyWater', staff: 'Blessed Sprinkles' },
    ],
    ringNames: ['a jade ring', 'a wooden ring', 'a coral ring', 'an opal ring', 'a twisted ring', 'a tin ring',
        'a ruby ring', 'a moonstone ring', 'a granite ring', 'an ivory ring'],
    ringLore: [
        'Ring of Mildly Increased Snack Detection.',
        'Ring of Regeneration (it regenerates the ring).',
        'Ring of Conflict Avoidance. Works great.',
        'Ring of Free Action (terms and conditions apply).',
        'Ring of Teleport Control, if you could teleport.',
        'Ring of See Invisible. You see nothing. Is it working?',
        'Ring of Aggravate Janitor. It pinches.',
        'Ring of Slow Digestion, for long shifts.',
        'Ring of Levitation. It hovers one millimetre. Sometimes.',
        'Ring of Polymorph Control: it stays a ring.',
    ],
    // Mimsy's shop: everything here does nothing (and says so).
    shopkeeperLines: [
        "\"Welcome, welcome! Nothing in here does anything. That's the charm.\"",
        "\"All sales final. All items useless. Everybody wins.\"",
        "\"No, I'm not a chest. I'm a shop. Totally different.\"",
        "\"Buy something! Or just stand there. I'm a mimic, I can wait.\"",
    ],
    shopItems: [
        { id: 'croissant', name: 'Suspicious Dungeon Croissant', kind: 'food', price: 3, desc: 'Flaky. Does nothing for you.', eat: 'You eat the croissant. You feel exactly the same.' },
        { id: 'slimeJelly', name: 'Slime Jelly (Lime)', kind: 'food', price: 4, desc: 'It wobbles. It does nothing.', eat: 'It wobbles all the way down. No effect, but it was fun.' },
        { id: 'coffee', name: 'Cup of Dungeon Roast', kind: 'food', price: 2, desc: 'Strong. Does nothing you would notice.', eat: 'You drink the coffee. You feel exactly the same, but louder.' },
        { id: 'lembas', name: 'Elven Waybread (Expired)', kind: 'food', price: 6, desc: 'One bite fills a grown elf. Does nothing for janitors.', eat: 'You nibble the waybread. You feel exactly the same.' },
        { id: 'pizza', name: 'Cold Pizza from the Party Room', kind: 'food', price: 2, desc: 'Nobody knows how old it is. Does nothing.', eat: 'It is cold. It is pizza. It does nothing. Perfect.' },
        { id: 'fortune', name: 'Box of Fortune Cookies (Empty)', kind: 'food', price: 1, desc: 'The fortunes were eaten. Does nothing.', eat: 'You eat the box. Your fortune: you feel exactly the same.' },
        { id: 'potion', name: 'Potion of Water (Probably)', kind: 'food', price: 5, desc: 'Unidentified. Spoiler: does nothing.', eat: 'You quaff the potion. It was water. You feel exactly the same.' },
        { id: 'pole', name: 'Ten-Foot Pole (3 ft)', kind: 'object', price: 8, desc: 'For poking things from a distance. A short one. Does nothing.' },
        { id: 'bucket', name: 'Left-Handed Bucket', kind: 'object', price: 7, desc: 'Holds water the same as any bucket. Does nothing special.' },
        { id: 'rockCert', name: 'Certificate of Authenticity for a Rock', kind: 'object', price: 9, desc: 'The rock is not included. The certificate does nothing.' },
        { id: 'dice', name: 'Loaded Dice (Unloaded)', kind: 'object', price: 6, desc: 'They roll like normal dice. No effect on the RNG.' },
        { id: 'map', name: 'Map of a Different Dungeon', kind: 'object', price: 5, desc: 'Lovely penmanship. Does not help you here.' },
        { id: 'amulet', name: 'Cheap Plastic Amulet of Yendor', kind: 'object', price: 15, desc: 'Says "Made in Gehennom" on the back. Does nothing.' },
        { id: 'scroll', name: 'Scroll of Mail (Spam)', kind: 'object', price: 2, desc: 'You have won a free hero! Does nothing.' },
        { id: 'mug', name: 'Mug: "I Survived the Night Shift"', kind: 'object', price: 7, desc: 'Purely sentimental. Does nothing.' },
        { id: 'poster', name: 'Motivational Poster: "Hang In There"', kind: 'decor', price: 12, desc: 'A kitten on a slime. Strictly decorative.' },
        { id: 'plant', name: 'Potted Mandrake (Muted)', kind: 'decor', price: 14, desc: 'It used to scream. Now it just sulks. Decorative.' },
        { id: 'duck', name: 'Rubber Duck Army (6 ducks)', kind: 'decor', price: 10, desc: 'They watch. They judge. Purely decorative.' },
        { id: 'lamp', name: 'Lava Lamp (Real Lava)', kind: 'decor', price: 18, desc: 'Very warm. Strictly decorative. Do not touch.' },
        { id: 'statue', name: 'Tiny Statue of Yourself', kind: 'decor', price: 25, desc: 'Holding a tiny mop. Just for show.' },
        { id: 'banner', name: 'Banner: "Employee of the Moment"', kind: 'decor', price: 9, desc: 'Purely decorative. The moment has passed.' },
        { id: 'mopEnth', name: 'Mop of Mild Enthusiasm', kind: 'tool', tool: 'mop', price: 20, desc: 'Cleans exactly as well as your old mop. No effect, more vibes.' },
        { id: 'mopGold', name: 'Gilded Mop (Gold Paint)', kind: 'tool', tool: 'mop', price: 30, desc: 'Shiny. The paint does nothing.' },
        { id: 'vacTurbo', name: 'Turbo-Vac 3000', kind: 'tool', tool: 'vacuum', price: 25, desc: 'Same vacuum, louder sticker. No effect.' },
        { id: 'squeegeeArt', name: 'Artisanal Squeegee', kind: 'tool', tool: 'squeegee', price: 18, desc: 'Hand-carved. Squeegees exactly the same. Does nothing extra.' },
        { id: 'brushGold', name: 'Gilded Toilet Brush', kind: 'tool', tool: 'brush', price: 22, desc: 'Fancy. Scrubs the same. Purely for show.' },
        { id: 'brushLuck', name: 'Lucky Scrub Brush', kind: 'tool', tool: 'brush', price: 15, desc: 'Luck not included. No effect.' },
    ],
    killedBy: [
        "a slippery puddle",
        "an unexpectedly heavy bucket",
        "Kevin's crossword",
        "the RNG",
        "a mimic disguised as a mess",
        "a falling torch",
        "reading the Necronomicon aloud",
        "too many energy drinks",
        "a very rude kobold",
        "a cursed mop",
        "tripping over loose pages",
        "a fortune cookie",
    ],

    visitors: {
        inspector: {
            name: 'Inspector Gnoll-Bertson',
            char: 'g',
            color: '#9cf',
            lines: [
                "Inspector Gnoll-Bertson, Dungeon Health & Safety.",
                "Don't mind me. Just checking for... *runs a claw along a shelf* ...dust.",
                "I'll give my verdict when your shift is over. No pressure!",
            ],
        },
        bones: {
            char: 'G',
            color: '#bcf',
            lines: [
                "Ooooh... hello. I'm the ghost of {hero}.",
                "I was killed by {killedBy}. Very embarrassing.",
                "This is my bones level now. Mind if I haunt the lounge for a bit?",
                "Do you think anyone will find my stuff? It's worth a lot of points.",
            ],
        },
        rodney: {
            name: 'Rodney the Retired Wizard',
            char: '@',
            color: '#f0f',
            lines: [
                "Ah, the janitor! Rodney. Retired. Tea?",
                "Heroes these days. They kick down your door, take your Amulet, and never call.",
                "Between you and me, I keep the real Amulet of Yendor in my sock drawer.",
                "The ones they steal are fakes from the gift shop. Business is good!",
            ],
        },
    },

    // Colleagues mention the easter eggs in passing, so the player tries them.
    hints: {
        pray: [
            "Did you know if you type #pray the Mop God sometimes answers? Gary swears by it.",
            "When the mess gets too much, I #pray. Doesn't help, but it's nice.",
        ],
        xyzzy: [
            "Old janitors say xyzzy is a magic word. You type #xyzzy. Never worked for me.",
            "My grandma used to whisper #xyzzy into the mop bucket. Nothing ever happened.",
        ],
        name: [
            "Some folks name their mop. #name, I think? Mine is called Sir Swishalot.",
            "A mop with a name cleans better. Science! Try #name.",
        ],
        konami: [
            "Kevin keeps pressing up, up, down, down... on everything. Weird guy.",
            "Somebody told me there's a code: up up down down left right left right B A. For what, though?",
        ],
        elbereth: [
            "Heroes keep writing Elbereth everywhere. You could #elbereth too, if you wanted.",
            "I bet if you typed #elbereth the floor would feel very safe.",
        ],
        quit: [
            "Ever tried to quit? Press Q. Go on. The union has opinions.",
            "Someone once tried to #quit mid-shift. Legendary.",
        ],
    },

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
