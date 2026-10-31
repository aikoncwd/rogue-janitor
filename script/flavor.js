// Flavor text for the hero invasion, told from the monsters' side.
// Placeholders: {hero} (short hero name), {monster} (monster name), {item} (loot name).
var Flavor = {
    pools: {
        introText: [
            "%c{#ff0}The Comrade Dungeon%c{} is a humble little dungeon.",
            "Its monsters are hard-working folk. They guard treasure, water the moss,",
            "and take turns bringing snacks to the staff lounge.",
            "Today was a perfectly ordinary day. Kevin the Kobold was doing a crossword.",
            "Then the front door creaked open...",
            "%c{#0ff}A HERO approaches!%c{} Everyone, places! Remember your training!",
            "",
            "%c{#777}Press any key.%c{}",
        ],

        heroEnter: [
            "{hero} kicks open the front door. \"FOR GLORY AND LOOT!\"",
            "{hero} strides in, cape billowing for no discernible reason.",
            "{hero} enters the dungeon and immediately steps in a puddle.",
            "{hero} arrives, already monologuing about destiny.",
            "{hero} bursts in. Somewhere, a goblin drops their coffee.",
            "{hero} enters! The monsters scramble to their marks.",
            "{hero} marches in, humming their own theme song.",
            "{hero} appears in a dramatic swirl of mud.",
        ],
        heroCry: [
            "{hero} shouts: \"HAVE AT THEE!\"",
            "{hero} yells: \"NO MONSTER SHALL STAND BEFORE ME!\"",
            "{hero} bellows: \"WHERE IS THE TREASURE?!\"",
            "{hero} cries: \"FEEL THE WRATH OF THE PROPHECY!\"",
            "{hero} roars: \"I HAVE TRAINED FOR THIS FOR WEEKS!\"",
            "{hero} screams: \"MY BLADE THIRSTS!\" The blade does not, in fact, thirst.",
            "{hero} announces: \"I AM THE CHOSEN ONE!\" Nobody chose them.",
            "{hero} hollers: \"FOR MY VILLAGE!\" Which village is unclear.",
            "{hero} grunts heroically.",
            "{hero} strikes a pose at nobody in particular.",
        ],
        heroHit: [
            "{hero} whacks {monster}!",
            "{hero} bonks {monster} on the head!",
            "{hero} slashes at {monster}! The fake blood sprays everywhere.",
            "{hero} smites {monster} with righteous fury!",
            "{hero} hits {monster}! A packet of fake blood bursts.",
            "{hero} swings wildly and connects with {monster}!",
            "{hero} pokes {monster} with the pointy end!",
            "{hero} delivers a mighty blow to {monster}!",
            "{hero} kicks {monster} in the shins!",
        ],
        monsterPain: [
            "{monster} screams: \"ARGH! The PAIN!\" (It is mostly ketchup.)",
            "{monster} howls: \"Tell my family I love them!\"",
            "{monster} yelps: \"Ow! Ow! Okay that one actually hurt a bit!\"",
            "{monster} cries: \"Not the face! I have a date later!\"",
            "{monster} wails: \"I was two days from retirement!\"",
            "{monster} shrieks: \"MY TAXES! Who will do my taxes?!\"",
            "{monster} groans: \"Is this covered by the dental plan?\"",
            "{monster} squeals: \"You'll never take me aliiiiive!\"",
            "{monster} gasps: \"It's... just a flesh wound!\"",
            "{monster} whimpers: \"I should have taken the day off.\"",
        ],
        monsterFaint: [
            "{monster} clutches their chest and collapses, very theatrically.",
            "{monster} falls over and plays dead. Their tail twitches.",
            "{monster} staggers, gasps \"Rosebud...\" and faints.",
            "{monster} dies dramatically. Then peeks. Then dies again, harder.",
            "{monster} spins three times and flops to the floor.",
            "{monster} faints. A small sign reading 'DEFEATED' appears from nowhere.",
            "{monster} collapses with a long, operatic wail.",
            "{monster} falls down. \"Am I doing this right?\" they whisper.",
            "{monster} slumps against the wall and stays very, very still.",
        ],
        doorKick: [
            "{hero} kicks a door open. It was not locked.",
            "{hero} smashes through a door. The hinges file a complaint.",
            "{hero} boots a door off its frame. Somebody will have to fix that.",
            "{hero} shoulder-charges a door. It swings open politely.",
            "{hero} bursts through a door with a war cry.",
            "{hero} kicks a door. Then rubs their foot.",
            "{hero} opens a door with unnecessary violence.",
            "{hero} flings a door open: \"NOBODY MOVE!\"",
        ],
        lootSmash: [
            "{hero} smashes the {item} looking for treasure!",
            "{hero} demolishes the {item}! \"Mine now!\"",
            "{hero} loots the {item} by breaking it into tiny pieces.",
            "{hero} hacks the {item} apart. There was nothing inside.",
            "{hero} kicks over the {item}. Very heroic.",
            "{hero} plunders the {item} with great enthusiasm.",
            "{hero} wrecks the {item}. The insurance forms will be long.",
            "{hero} rummages through the {item} and leaves it in ruins.",
        ],
        snack: [
            "{hero} eats a candy bar mid-battle and drops the wrapper.",
            "{hero} munches a snack. \"Heroing is hungry work.\"",
            "{hero} tosses a candy wrapper over their shoulder.",
            "{hero} pauses the carnage for a quick snack.",
            "{hero} chews loudly. Crumbs everywhere.",
            "{hero} unwraps a granola bar with loud crinkling.",
            "{hero} eats a snack. They do not offer to share.",
            "{hero} litters. The monsters gasp in horror.",
        ],
        potion: [
            "{hero} quaffs a healing potion and drops the empty bottle.",
            "{hero} gulps down a potion. *GLUG GLUG GLUG*",
            "{hero} drinks a potion and burps triumphantly.",
            "{hero} chugs a red potion. \"I feel AMAZING!\"",
            "{hero} downs a potion and tosses the bottle aside.",
            "{hero} drinks a potion. Tastes like cherry cough syrup.",
            "{hero} heals up. The bottle rolls under a table.",
            "{hero} swigs a potion: \"Ahh, refreshing!\"",
        ],
        heroHurt: [
            "{hero} gets hit! \"Is that all you've got?!\"",
            "{hero} takes a hit and bleeds (fake) all over the floor.",
            "{hero} is struck! \"A mere scratch!\"",
            "{hero} winces: \"Ow. OW. Okay.\"",
            "{hero} gets bonked and staggers.",
            "{hero} takes damage! Their armor makes a sad clang.",
            "{hero} is hit! \"I shall remember this!\"",
            "{hero} stumbles: \"That was a lucky shot!\"",
        ],
        heroExit: [
            "{hero} leaves through the stairs, humming a victory tune.",
            "{hero} heads downstairs to the next level, very pleased with themselves.",
            "{hero} departs, muttering about experience points.",
            "{hero} strides off down the stairs. The dungeon falls silent.",
            "{hero} leaves. Somewhere, a bard starts writing a song about it.",
            "{hero} vanishes down the stairs. Nobody waves.",
            "{hero} exits, already bragging to nobody.",
            "{hero} is gone at last. A distant \"FOR GLORY!\" echoes.",
        ],
        monstersGetUp: [
            "One by one, the fallen monsters get up and dust themselves off.",
            "The monsters stop playing dead. \"Is it gone?\" \"It's gone.\"",
            "The 'corpses' sit up, stretch, and high-five each other.",
            "Everyone gets up. \"Great performance today, team!\"",
            "The monsters peel themselves off the floor and head to the lounge.",
            "The dead rise! For coffee. They head to the staff lounge.",
            "The monsters get up, rubbing their bruises, and shuffle off to the lounge.",
            "\"Same time tomorrow?\" The monsters stagger off to the staff lounge.",
        ],
        shiftBegins: [
            "The dungeon is a disaster. Your shift begins.",
            "You grab your mop. Time to get to work.",
            "You look at the mess and sigh. Your shift begins.",
            "Somebody has to clean all this up. That somebody is you.",
            "You tie your apron. The dungeon needs you.",
            "You crack your knuckles and pick up the mop.",
            "Your shift begins. The fake blood won't mop itself.",
            "Time to clean. Thank goodness it's a supportive work environment.",
        ],

        heroFirst: [
            "Sir Gleamington", "Brakka", "Lady Valoria", "Thrognar", "Percival", "Ser Shinyboots",
            "Elandriel", "Grimbold", "Dame Fortitude", "Chad", "Xandar", "Bartholomew",
        ],
        heroLast: [
            "Skullsplitter", "the Bold", "Dragonbane", "of the Prophecy", "Loothoarder", "Doorkicker",
            "the Unwashed", "Goblinbane", "the Mildly Famous", "Ironpants",
        ],
        heroClass: [
            "Paladin", "Barbarian", "Valkyrie", "Rogue", "Wizard", "Ranger", "Knight",
            "Samurai", "Archeologist", "Monk",
        ],
    },

    lastLines: {},

    line: function (poolName, vars = {}) {
        let pool = this.pools[poolName];
        if (!pool || pool.length == 0) {
            return "";
        }
        let choice;
        do {
            choice = ROT.RNG.getItem(pool);
        } while (pool.length > 1 && choice == this.lastLines[poolName]);
        this.lastLines[poolName] = choice;
        return choice.replace(/\{(hero|monster|item)\}/g, function (m, key) {
            return (key in vars) ? vars[key] : m;
        });
    },

    heroName: function () {
        let first = ROT.RNG.getItem(this.pools.heroFirst);
        let short = first;
        if (ROT.RNG.getUniform() > 0.4) {
            short = first + " " + ROT.RNG.getItem(this.pools.heroLast);
        }
        let cls = ROT.RNG.getItem(this.pools.heroClass);
        return { short: short, full: short + " the " + cls };
    },
};

if (typeof module !== 'undefined') module.exports = Flavor;
