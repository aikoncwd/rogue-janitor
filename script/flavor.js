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

        saveLost: [
            "Your old save was mopped up by accident. Fresh start!",
            "We couldn't read your old timesheet. New shift, new you!",
            "The save file slipped on a puddle. Let's start over.",
        ],
        titleTaglines: [
            "Mop the dungeon. Retrieve the Amulet of Clean-dor.",
            "Procedurally generated mess. Hand-crafted mopping.",
            "The RNG made this mess. You get to clean it.",
            "Permadeath? No. Perma-mess.",
            "Now with 100% fake blood.",
            "Rodney says hi. Rodney has the Amulet. Again.",
            "You hear the footsteps of a janitor on patrol.",
            "Every YASD starts with 'I'll just...'",
        ],

        howtoText: [
            "%c{#ff0}HOW YOUR JOB WORKS%c{}",
            "",
            "%c{#0ff}1. TONIGHT%c{}   A hero raids the dungeon. You are %c{#f80}NOT%c{} playing:",
            "             you are watching last night's security footage.",
            "             %c{#ff0}[Space]%c{} fast-forward   %c{#ff0}[Esc]%c{} skip to the morning",
            "",
            "%c{#0ff}2. MORNING%c{}   The mess is yours. Mop, pick up, fix.",
            "",
            "%c{#0ff}3. BREAKS%c{}    Your colleagues relax in the staff lounge.",
            "             Chat with them. They are lovely.",
            "",
            "             Press %c{#ff0}[?]%c{} during your shift for the full controls.",
            "",
            "%c{#777}Press any key.%c{}",
        ],

        playbackNag: [
            "You can't do anything. It's a recording.",
            "You shout at the screen. The hero does not hear you.",
            "This already happened. Space plays, → steps, Esc skips.",
            "You reach for the mop. Patience, it's still last night.",
        ],

        // A comrade in the staff room tells you about the security log (day 1)...
        tapeTip: [
            '{monster} waves a tape at you: "Missed the good bits? The whole security log is up. Press [Tab]."',
            '{monster}: "The floating eye saw everything. Everything. [Tab] if you want the gory details. Well, the ketchup details."',
            '{monster} points at the camera: "It writes it all down, you know. Press [Tab] to read last night\'s log."',
            '{monster}: "New here? Last night is all in the security log. [Tab]. Bring popcorn."',
        ],
        // ...and on later mornings, now and then, mentions it again.
        tapeComment: [
            '{monster} is rewatching last night on loop: "[Tab] if you want to see me faint again. I was magnificent."',
            '{monster}: "Did you read the log? [Tab]. Page three. My best line yet."',
            '{monster} sighs: "The floating eye got my bad side again. It\'s all in the log. [Tab]."',
            '{monster}: "Someone check the security log. [Tab]. I want to know who kicked MY door."',
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
        zap: [
            "{hero} zaps a {wand} at nothing in particular. {effect}",
            "{hero} waves a {wand} dramatically. {effect}",
            "{hero} engrave-tests a {wand}. {effect}",
        ],
        ring: [
            "{hero} tries on a ring, decides it clashes with the armor, and drops it.",
            "{hero} takes off an itchy ring and tosses it over a shoulder.",
            "A ring slips off {hero}'s finger. Nobody notices but the camera.",
        ],
        purse: [
            "{hero}'s coin purse has a hole in it. Zorkmids trickle onto the floor.",
            "{hero} drops a handful of zorkmids and decides they are beneath a hero.",
            "Coins jingle out of {hero}'s pocket. Nobody tells them.",
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

        graffiti: [
            "{hero} scrawls \"{item}\" on the wall. In permanent marker.",
            "{hero} pauses to carve \"{item}\" into the stonework.",
            "{hero} spray-paints \"{item}\" on a wall. The monsters gasp.",
            "{hero} writes \"{item}\" on the wall. The spelling is creative.",
            "{hero} tags the wall: \"{item}\". Somebody will have to scrub that.",
        ],
        graffitiTags: [
            "HERO WAS HERE", "LOOT OR DIE", "FIRST!", "MONSTERS STINK", "GLORY 4 EVER",
            "CALL ME ;)", "DRAGONS R FAKE", "THIS WAY ->", "I CAME I SAW I LOOTED",
        ],
        special_Paladin: [
            "{hero} blesses the room. Holy water splashes everywhere.",
            "{hero} sprinkles holy water on the floor \"just in case\".",
            "{hero} performs a purifying ritual. The floor is now soggy AND holy.",
        ],
        special_Barbarian: [
            "{hero} tears into a turkey drumstick and tosses the bone.",
            "{hero} eats a drumstick in three bites. The bone goes flying.",
            "{hero} pauses for a mid-battle drumstick. \"RAAARGH. Delicious.\"",
        ],
        special_Wizard: [
            "{hero} casts FIREBALL! At nothing in particular.",
            "{hero} reads a scroll aloud and the room catches fire a little.",
            "{hero} hurls a fireball. The scroll crumbles to the floor.",
        ],
        special_Ranger: [
            "{hero} looses an arrow. It misses everything.",
            "{hero} fires a warning shot into the wall.",
            "{hero} shoots an arrow at a suspicious shadow. It was a coat rack.",
        ],
        special_Rogue: [
            "{hero} throws a smoke bomb and vanishes! Then reappears, coughing.",
            "{hero} drops a smoke bomb for dramatic effect. Soot everywhere.",
            "{hero} tosses a smoke bomb. Nobody was looking.",
        ],
        special_Bard: [
            "{hero} plays a rousing ballad. Sheet music flutters to the floor.",
            "{hero} improvises a song about their own bravery.",
            "{hero} strums a power chord. Pages of sheet music scatter.",
        ],
        special_Archeologist: [
            "{hero} digs a hole looking for ancient artifacts. Finds a sock.",
            "{hero} excavates the floor. \"This tile is at least a week old!\"",
            "{hero} pulls out a tiny shovel and digs. Dirt everywhere.",
        ],
        special_Alchemist: [
            "{hero} mixes two potions. They fizz, bubble and spill.",
            "{hero} drops a flask. Something bubbly oozes out.",
            "{hero} tries a new recipe. It explodes, but only a little.",
        ],
        special_Tourist: [
            "{hero} takes a flash photo. Everyone sees spots for a while.",
            "{hero} poses for a selfie with a 'defeated' monster. The monster does bunny ears.",
            "{hero} buys a souvenir from nobody and drops the receipt.",
        ],
        special_Valkyrie: [
            "{hero} bellows \"VALHALLA!\" and the room gets noticeably colder.",
            "{hero} stamps their boots. Frost melts into puddles everywhere.",
            "{hero} raises a frosty blade. The floor gets very, very wet.",
        ],
        special_Speedrunner: [
            "{hero} shouts \"ANY%!\" and crushes an energy drink can.",
            "{hero} yells \"FRAME PERFECT!\" at a perfectly normal doorway.",
            "{hero} mutters \"reset? no, keep going\" and chugs another energy drink.",
        ],
        special_Necromancer: [
            "{hero} reads aloud: \"KLAATU BARADA... NECKTIE?\" Nothing rises. A page falls.",
            "{hero} tries to raise the dead. The 'dead' politely stay down, they're on a break.",
            "{hero} flips through the Necronomicon. A page comes loose.",
        ],
        heroQuip: [
            "{hero} mutters: \"Never melee a floating eye...\"",
            "{hero} says: \"I'll just check this one more room.\"",
            "{hero} grumbles: \"It was the RNG's fault.\"",
            "{hero} sighs: \"This seed is cursed.\"",
            "{hero} yelps: \"Wait, I didn't press that!\"",
            "{hero} squints at a chest: \"Was that a mimic? It's always a mimic.\"",
            "{hero} muses: \"I should've played a Minotaur Berserker.\"",
            "{hero} asks nobody: \"Is this a YASD? This feels like a YASD.\"",
        ],
        heroAmulet: [
            "{hero} bellows: \"WHERE IS THE AMULET OF YENDOR?!\"",
            "{hero} announces: \"I'm here for the Amulet!\"",
            "{hero} demands: \"Hand over the Amulet of Yendor!\"",
        ],
        rodneyReply: [
            "{monster} sighs: \"Rodney has it. Again.\"",
            "{monster} points: \"Bottom floor, take the stairs, mind the wet floor sign.\"",
            "{monster} shrugs: \"Ask Rodney. He borrowed it for 'a quick thing' ages ago.\"",
            "{monster} whispers: \"Rodney sells fake ones at the gift shop, you know.\"",
        ],
        heroLost: [
            "{hero} stops, turns the map upside down, and looks lost.",
            "{hero} has been walking in circles. Again.",
            "{hero} looks around: \"Have I been here before? Everything looks procedurally generated.\"",
        ],
        monsterDirections: [
            "{monster} breaks character: \"Down the hall, second left. You're welcome.\"",
            "{monster} politely points the hero toward the next room.",
            "{monster} draws them a little map. It is wrong, but it's the thought that counts.",
        ],
        scrollRead: [
            "{hero} reads an unidentified scroll!",
            "{hero} unrolls a mysterious scroll and reads it out loud.",
            "{hero} reads a scroll labeled ZELGO MER. Brave.",
        ],
        scrollOutcome_loss: [
            "{hero} feels a strange sense of loss.",
            "{hero} has a feeling they forgot something important. Like where they parked.",
            "Nothing happens. {hero} feels oddly disappointed.",
        ],
        scrollOutcome_menu: [
            "It is a takeaway menu. {hero} orders a pizza.",
            "The scroll reads: \"2-for-1 kebabs, Tuesdays.\" {hero} takes note.",
            "It's a coupon for 10% off at the Minetown shop. Expired.",
        ],
        scrollOutcome_confetti: [
            "Confetti bursts from the scroll! Paper everywhere.",
            "The scroll explodes into a shower of tiny pages. Festive.",
            "A party popper scroll! It's someone's birthday, apparently.",
        ],
        backIn5: [
            "{monster} holds up a little sign: BACK IN 5.",
            "{monster} flips a sign: ON BREAK. PLEASE SLAY LATER.",
            "{monster} puts up a sign: CLOSED FOR LUNCH. The hero waits, confused.",
        ],
        saveScum: [
            "{hero} dies... \"Do you want your possessions identified?\" ...Restoring from save.",
            "{hero} collapses! The world flickers. Restoring from save...",
            "{hero} is defeated! Somewhere, a save file is reloaded. Restoring from save.",
        ],
        saveScumReply: [
            "{monster} blinks: \"Wait, didn't we just...?\"",
            "{monster} frowns: \"Hey! No save-scumming!\"",
            "{monster} mutters: \"Every single time.\"",
        ],
        elbereth: [
            "{hero} engraves \"Elbereth\" on the wall. Very carefully.",
            "{hero} writes Elbereth in the dust. And on the wall. Just in case.",
            "{hero} scratches \"ELBERETH\" into the stone and feels very safe.",
        ],
        elberethReply: [
            "{monster} reads it: \"Oh, Elbereth. Sure.\" *walks around it politely*",
            "{monster} nods respectfully at the engraving and carries on.",
            "{monster} sighs: \"Someone's going to have to scrub that.\"",
        ],

        cardTitle: [
            "Night shift, day {day}",
            "Day {day}: the night shift",
            "After hours, day {day}",
        ],
        cardLine: [
            "The dust settles. Somewhere, a mop bucket waits.",
            "The monsters limp off to the staff lounge. You clock in.",
            "The dungeon is quiet now. Quiet, and very, very sticky.",
            "The hero is gone. The mess, sadly, is not.",
            "You punch your time card. The machine goes 'ka-chunk'.",
            "You tie your apron and roll up your sleeves.",
        ],

        heroFirst: [
            "Sir Gleamington", "Brakka", "Lady Valoria", "Thrognar", "Percival", "Ser Shinyboots",
            "Elandriel", "Grimbold", "Dame Fortitude", "Chad", "Xandar", "Bartholomew",
            "Rodney", "Yasd the Unlucky", "Ascension Andy", "Scummy McSavefile", "Gelatinous Kevin's Cousin",
        ],
        heroLast: [
            "Skullsplitter", "the Bold", "Dragonbane", "of the Prophecy", "Loothoarder", "Doorkicker",
            "the Unwashed", "Goblinbane", "the Mildly Famous", "Ironpants", "Bones", "of Seed 42",
        ],
        heroClass: [
            "Paladin", "Barbarian", "Wizard", "Ranger", "Rogue", "Bard", "Archeologist", "Alchemist",
            "Tourist", "Valkyrie", "Speedrunner", "Necromancer",
        ],
    },

    lastLines: {},

    // Presentation randomness (which funny line, banner clock, title animation...).
    // Kept apart from ROT.RNG so that watching, fast-forwarding or skipping the
    // invasion never changes the dungeon the player cleans.
    rng: ROT.RNG.clone(),

    chance: function (p) {
        return this.rng.getUniform() < p;
    },

    line: function (poolName, vars = {}) {
        let pool = this.pools[poolName];
        if (!pool || pool.length == 0) {
            return "";
        }
        let choice;
        do {
            choice = this.rng.getItem(pool);
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
        let joiner = / (the|of) /.test(short) ? ", " : " the ";
        return { short: short, full: short + joiner + cls, cls: cls };
    },
};

if (typeof module !== 'undefined') module.exports = Flavor;
