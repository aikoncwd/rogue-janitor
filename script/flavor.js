// Flavor text for the hero invasion, told from the monsters' side.
// Placeholders: {hero} (short hero name), {monster} (monster name), {item} (loot name),
// {other} (a second monster), {trap} (a trap's name).
// Pools called base_Key (e.g. monsterPain_Slime, lootSmash_Sink, enter_Wizard) are
// optional specialisations: Flavor.pick() uses them now and then instead of the base.
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
            "Your save was eaten by a gelatinous cube. It says sorry. Fresh start!",
            "The old save rolled a natural 1 on its Constitution save. New run!",
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
            "The DevTeam thought of everything. Except the cleanup.",
            "Roll for initiative. Then roll up your sleeves.",
            "Live and drink, friend. Then mop what you spilled.",
            "No eels were harmed in the making of this dungeon.",
            "Xom finds your mopping hilarious.",
            "Now with 40% more glitter. We are so sorry.",
            "A @ walks into a dungeon. You get the bill.",
            "It's dangerous to go alone. Take a bucket.",
            "Seed 42. Mess 9000.",
            "Like a coffee break, but stickier.",
        ],

        howtoText: [
            "%c{#ff0}HOW YOUR JOB WORKS%c{}",
            "",
            "%c{#0ff}1. TONIGHT%c{}   A hero raids the dungeon. You are %c{#f80}NOT%c{} playing:",
            "             you are watching last night's security footage.",
            "             The tape starts paused:",
            "             %c{#ff0}[Space]%c{} play/pause  %c{#ff0}[→]%c{} step  %c{#ff0}[F]%c{} fast",
            "             %c{#ff0}[R]%c{} rewind  %c{#ff0}[Esc]%c{} skip to the morning",
            "",
            "%c{#0ff}2. MORNING%c{}   The mess is yours. Mop, pick up, fix.",
            "             Missed something? %c{#ff0}[Tab]%c{} reads the security log.",
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
            "You try to mop the screen. It is now a clean screen. The mess is still on it.",
            "It's footage. You can't Elbereth a recording.",
            "You press the key very hard. History remains unchanged.",
            "The floating eye camera blinks at you. Not yet.",
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
            '{monster}: "I\'m submitting last night to the Dungeon Film Festival. Read the script: [Tab]."',
            '{monster}: "The log says I \'collapsed operatically\'. [Tab]. I\'m framing it."',
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
            `{hero} enters. "Hello, {hero}, welcome to the Comrade Dungeon!" says nobody.`,
            "{hero} descends the stairs. The dungeon whispers: \"oh no, not again.\"",
            "{hero} strolls in, reading a strategy wiki on a scroll.",
            "{hero} enters with a 47-item inventory and no plan.",
            "{hero} rolls initiative. Gets a 2. Comes in anyway.",
            "{hero} arrives fresh from character creation. The stats were rerolled 31 times.",
            "{hero} steps inside and says: \"Okay, this time I'm playing carefully.\" (They are not.)",
            "{hero} enters. A sign at the door reads: PLEASE WIPE YOUR BOOTS. They do not.",
            "{hero} kicks the door, misses, and walks in normally.",
            "{hero} arrives. The RNG cracks its knuckles.",
        ],
        heroEnter_Wizard: [
            "{hero} teleports in. Lands in the wrong room. Walks to the right one.",
            "{hero} glides in, robe sweeping up a week of dust.",
        ],
        heroEnter_Speedrunner: [
            "{hero} clips through the front door. Literally. The door is fine. The hinges are in shock.",
            "{hero} enters at frame 1 and is already shouting splits.",
        ],
        heroEnter_Tourist: [
            "{hero} enters in a loud shirt, camera first. \"Is this the gift shop?\"",
            "{hero} arrives with a guidebook titled 'Dungeons on 5 Zorkmids a Day'.",
        ],
        heroEnter_Barbarian: [
            "{hero} enters by walking through the wall next to the door. Out of principle.",
            "{hero} roars at the doormat. The doormat says WELCOME. It is less sure now.",
        ],
        heroEnter_Bard: [
            "{hero} enters to their own entrance music. They brought speakers.",
        ],
        heroEnter_Monk: [
            "{hero} enters silently, barefoot. The floor is sticky. A single tear.",
        ],
        heroEnter_Wanderer: [
            "{hero} enters with a random assortment of gear and no idea why.",
            "{hero} wanders in. Even they don't know what class they are.",
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
            "{hero} yells: \"ROLL FOR DAMAGE!\" Nobody brought dice.",
            "{hero} shouts: \"I CAST... uh... HIT!\"",
            "{hero} bellows: \"EXPERIENCE POINTS! COME TO ME!\"",
            "{hero} shrieks: \"I HAVE ADVANTAGE!\" They do not.",
            "{hero} cries: \"THIS IS FOR THE SAVE FILE I LOST IN 2009!\"",
            "{hero} roars: \"GIT GUD, MONSTERS!\" The monsters are already very good.",
            "{hero} shouts: \"I'VE READ THE SPOILERS!\"",
            "{hero} hollers: \"ASCENSION OR BUST!\"",
            "{hero} yells: \"LEEROY—\" and is gently shushed by the dungeon.",
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
            "{hero} hits {monster}! (d6 roll: 4. The ketchup roll: 6.)",
            "{hero} bops {monster} with the flat of the blade. Polite, at least.",
            "{hero} lands a critical hit on {monster}! Critically theatrical.",
            "{hero} hits {monster} with a move they saw in a cutscene.",
            "{hero} thwacks {monster}. A squeaky toy noise comes from somewhere.",
            "{hero} attacks {monster}! The ketchup sachet had it coming.",
            "{hero} hits {monster}! THWACK! (Sound effect provided by {monster}.)",
            "{hero} smacks {monster} with a shield. Shields are for hitting, apparently.",
            "{hero} hits {monster} so hard the camera shakes. It's a cheap camera.",
            "{hero} pummels {monster}! It's very effective! (Wrong game.)",
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
            "{monster} yells: \"I rolled to dodge! I rolled a ONE!\"",
            "{monster} cries: \"The DM said this encounter was balanced!\"",
            "{monster} moans: \"My hit points! They were already so few!\"",
            "{monster} squeaks: \"Ouch! My AC is clearly a lie!\"",
            "{monster} sobs: \"Everything is going dark... no wait, that's my visor.\"",
            "{monster} winces: \"Remind me to file a form about this.\"",
            "{monster} gasps: \"I can see the light! ...it's the torch. Never mind.\"",
            "{monster} groans: \"I'm getting too old for this dungeon.\"",
            "{monster} shouts: \"Medic! MEDIC! Oh wait, that's me. Never mind.\"",
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
            "{monster} is slain! (Terms and conditions apply.)",
            "{monster} faints into a pre-placed beanbag. Workplace safety!",
            "{monster} falls over and whispers: \"Remember me in the morgue file.\"",
            "{monster} drops to the floor. Their stunt double was on a break.",
            "{monster} faints. A tiny harp plays. Nobody knows who brought the harp.",
            "{monster} keels over and leaves a perfectly shaped chalk outline. They brought chalk.",
            "{monster} collapses. \"Tell the RNG... it won.\"",
            "{monster} goes down like a sack of procedurally generated potatoes.",
            "{monster} faints and starts snoring almost immediately. Long night.",
            "{monster} dies. Dies a bit more. Bows. Lies down.",
            "{monster} is defeated! The defeat animation takes eleven seconds.",
        ],

        // A second line, now and then, for one species when it gets hit...
        monsterPain_Goblin: [
            "{monster} squeals: \"I'm on minimum wage! Well, co-op wage! Still!\"",
            "{monster} yelps: \"Goblins have feelings! Small, pointy feelings!\"",
        ],
        monsterPain_Kobold: [
            "{monster} yips: \"Not the tail! The tail is load-bearing!\"",
            "{monster} squeaks: \"I'm telling the dragon on you!\"",
        ],
        monsterPain_Myconid: [
            "{monster} puffs a cloud of panicked spores. \"Sorry! SORRY! *puff*\"",
            "{monster} squeaks: \"Ow! My cap! It took me all summer to grow that!\"",
        ],
        monsterPain_Ogre: [
            "{monster} rumbles: \"Ow. That was... a bit rude.\"",
            "{monster} blinks slowly: \"Did you just... hit me? Okay. Ow, I guess.\"",
        ],
        monsterPain_Imp: [
            "{monster} cackles through the pain: \"Is that all, meat-hero?\" Then quietly: \"ow\"",
            "{monster} squeaks: \"I'm telling my union rep! Who is also me!\"",
        ],
        monsterPain_Slime: [
            "{monster} jiggles indignantly. Some of it lands on the ceiling.",
            "{monster} goes: \"Blorp?!\" which is slime for \"How rude!\"",
        ],
        monsterPain_Harpy: [
            "{monster} screeches and moults six feathers out of pure stress.",
            "{monster} shrieks: \"My plumage! It was CONDITIONED!\"",
        ],
        monsterPain_Mimic: [
            "{monster} yells: \"OW! Hey! I was being a chest! You can't hit a chest!\"",
            "{monster} drools in protest: \"Lid! Not the lid!\"",
        ],
        monsterPain_Troll: [
            "{monster} grunts: \"Hit me all you like. I regenerate. It's my whole thing.\"",
            "{monster} roars, then checks if the bruise is gone yet. It is.",
        ],
        monsterPain_Naga: [
            "{monster} hisses: \"Ssssseriously?! Ssssso rude!\"",
            "{monster} coils up: \"I was HIBERNATING. Sort of.\"",
        ],
        monsterPain_Ghost: [
            "{monster} wails: \"OoooOOOW! I didn't even know that could hurt!\"",
            "{monster} flickers: \"You hit me! Through me! Mostly through me!\"",
        ],
        monsterPain_Skeleton: [
            "{monster} rattles: \"That's my funny bone! Ha! No, really, ow.\"",
            "{monster} clatters: \"I felt that in my everything. I am mostly everything.\"",
        ],
        monsterPain_Hydra: [
            "{monster} howls from three heads at once. The fourth head is on a break.",
            "{monster}: \"OW!\" \"Ow!\" \"ow.\" \"...Ow?\" (A head was late.)",
        ],
        monsterPain_Dragon: [
            "{monster} roars: \"Do you know how long it takes to polish these scales?!\"",
            "{monster} sulks: \"I have a hoard of dice at home and THIS is how I'm treated?\"",
        ],
        monsterPain_Balor: [
            "{monster} flares up: \"Careful! I'm very flammable! I mean, I'm FIRE!\"",
        ],
        monsterPain_Newt: [
            "{monster} squeaks the tiniest \"ow\" ever recorded.",
            "{monster} blinks: \"I have one hit point. ONE.\"",
        ],
        monsterPain_FruitBat: [
            "{monster} flaps in circles: \"Rude! Rude! Rude! Rude!\"",
            "{monster} squeaks and drops a half-eaten fig.",
        ],
        monsterPain_FloatingEye: [
            "{monster} blinks rapidly: \"Did you just melee me?! Have you not READ anything?!\"",
            "{monster} winces: \"Not the eye! I'm ALL eye!\"",
        ],
        monsterPain_Leprechaun: [
            "{monster} yelps and drops a few coins: \"Me gold! Me lovely co-op gold!\"",
            "{monster} hops away: \"Catch me if ye can! ...Ow. Ye can.\"",
        ],
        monsterPain_Cockatrice: [
            "{monster} squawks: \"Gloves! You're wearing GLOVES, right?! HR is very strict!\"",
            "{monster} hisses: \"Bad idea, hero. Usually. Today I'm on stone-free duty.\"",
        ],
        monsterPain_GelatinousCube: [
            "{monster} wobbles. A boot, a spoon and a ten-foot pole wobble inside it.",
            "{monster} jiggles: \"You can't hurt a cube! ...Oh. You can.\"",
        ],
        monsterPain_Unicorn: [
            "{monster} neighs: \"I'm a co-aligned unicorn! You're supposed to throw GEMS at me!\"",
            "{monster} huffs: \"Mind the horn! It's decorative! And sharp!\"",
        ],
        monsterPain_Lich: [
            "{monster} sighs: \"I have been undead for six hundred years. And now this.\"",
            "{monster} rasps: \"My phylactery is a mug, you know. You'll never find it.\"",
        ],

        // ...and when it faints.
        monsterFaint_Goblin: [
            "{monster} faints and their tiny helmet rolls off in slow motion.",
        ],
        monsterFaint_Kobold: [
            "{monster} faints. \"Kevin, tell the dragon I was brave,\" they whisper.",
        ],
        monsterFaint_Myconid: [
            "{monster} collapses into a puff of spores. Very artistic. Very sneezy.",
        ],
        monsterFaint_Ogre: [
            "{monster} topples like a tree. The whole dungeon goes BOOM. A shelf falls somewhere.",
        ],
        monsterFaint_Slime: [
            "{monster} melts into a puddle. \"I'm fine. I do this every Tuesday.\"",
        ],
        monsterFaint_Mimic: [
            "{monster} slams its lid shut and pretends to be an ordinary chest. Convincingly.",
        ],
        monsterFaint_Skeleton: [
            "{monster} collapses into a neat pile of bones, alphabetised.",
        ],
        monsterFaint_Ghost: [
            "{monster} fades out with a sad \"oooo\". Then fades back in to check the camera angle.",
        ],
        monsterFaint_Hydra: [
            "{monster} faints one head at a time. It takes a while.",
        ],
        monsterFaint_Dragon: [
            "{monster} faints across three tiles. The game has to redraw the room.",
        ],
        monsterFaint_Troll: [
            "{monster} faints. Then regenerates. Then faints again, out of politeness.",
        ],
        monsterFaint_Newt: [
            "You kill the newt! ...is what the log WOULD say. {monster} just lies down, very small and very dramatic.",
            "{monster} faints. Somewhere, a thousand players read 'You kill the newt!' and feel nothing.",
        ],
        monsterFaint_FruitBat: [
            "{monster} hangs upside down from the ceiling and plays dead. Nobody can tell the difference.",
        ],
        monsterFaint_FloatingEye: [
            "{monster} closes its eye and sinks slowly to the floor. The camera loses a cousin.",
        ],
        monsterFaint_Leprechaun: [
            "{monster} faints into a little pot. The pot has no gold in it. That's in the co-op account.",
        ],
        monsterFaint_Cockatrice: [
            "{monster} faints and turns to stone. Then back. \"Old habit, sorry.\"",
        ],
        monsterFaint_GelatinousCube: [
            "{monster} slowly deflates into a sad gelatin rectangle.",
        ],
        monsterFaint_Unicorn: [
            "{monster} faints gracefully onto a cloud of glitter. It took weeks to rehearse.",
        ],
        monsterFaint_Lich: [
            "{monster} crumbles to dust, then reassembles out of habit, then pretends to crumble again.",
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
            "WHAMM!! {hero} kicks a door. The door has a push handle.",
            "{hero} rolls to open a door. Natural 20. It was already ajar.",
            "{hero} kicks a door. \"This door is locked.\" It isn't. They kick it anyway.",
            "{hero} kicks a door open and checks behind it for treasure. Finds a broom.",
            "{hero} knocks first, then kicks. Manners!",
            "{hero} kicks a door. A small sign on it read 'PLEASE KNOCK'.",
            "{hero} slams a door open. The kobold behind it spills their tea.",
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
            "{hero} searches the {item}. Searching, in hero terms, means destroying.",
            "{hero} smashes the {item}. Somewhere, a procedural generator sighs.",
            "{hero} breaks the {item}. \"For science!\" There is no science.",
            "{hero} applies the {item}. To the floor. Hard.",
        ],
        // Specific furniture, chosen now and then over the generic line.
        lootSmash_Chest: [
            "{hero} kicks the treasure chest open. It wasn't a mimic. They kick it again, just in case.",
            "{hero} smashes the chest: \"Wait! That's a... no, it's just a chest.\" Coins everywhere.",
            "{hero} #forces the chest lock with a sword. The sword wins. So does the floor, with coins.",
        ],
        lootSmash_Table: [
            "{hero} flips the table. (╯°□°)╯︵ ┻━┻",
            "{hero} smashes the table. It was set for a little tea party. Was.",
        ],
        lootSmash_Cauldron: [
            "{hero} kicks over the cauldron. The soup of the day is now the floor of the day.",
            "{hero} tips the cauldron, hoping for loot. Finds lentils.",
        ],
        lootSmash_Barrel: [
            "{hero} smashes a barrel. It's full of ale. And now it's full of floor.",
            "{hero} cracks open a barrel: \"Loot!\" It is ale. \"...Loot!\"",
        ],
        lootSmash_Bookshelf: [
            "{hero} topples the bookshelf. The book club will be furious.",
            "{hero} searches the bookshelf for spellbooks by throwing every book on the floor.",
        ],
        lootSmash_Pot: [
            "{hero} smashes a clay pot. Classic. Absolutely classic.",
            "{hero} breaks a pot and looks for rupees. Wrong dungeon.",
        ],
        lootSmash_WeaponRack: [
            "{hero} raids the weapon rack. All the swords are foam. They take them anyway.",
        ],
        lootSmash_Fountain: [
            "{hero} quaffs from the fountain. The fountain is not amused. It bursts.",
            "{hero} #dips a sword into the fountain, hoping for Excalibur. The plumbing gives up.",
            "{hero} kicks the fountain. You hear bubbling water. Lots of it.",
        ],
        lootSmash_Rock: [
            "{hero} smashes a rock. It was a normal rock. They seem disappointed.",
        ],
        lootSmash_Column: [
            "{hero} knocks a column down. The ceiling holds. Good ceiling.",
        ],
        lootSmash_Banner: [
            "{hero} tears down a banner. It said WELCOME HEROES. It was a nice banner.",
        ],
        lootSmash_Torch: [
            "{hero} yanks a torch off the wall. \"It's for light!\" It goes out immediately.",
        ],
        lootSmash_Statue: [
            "{hero} smashes the statue. It was a statue of a previous hero. Awkward.",
            "{hero} breaks a statue, looking for a cockatrice victim inside. It was just marble.",
        ],
        lootSmash_Candleabra: [
            "{hero} knocks over the candelabrum. Mood lighting: ruined.",
        ],
        lootSmash_Throne: [
            "{hero} sits on the throne. You feel a wrenching sensation! It was the throne breaking.",
            "{hero} sits on the throne and demands a wish. The throne gives up instead.",
            "{hero} sits on the throne. \"Your stomach feels content.\" Then it snaps in half.",
        ],
        lootSmash_Sink: [
            "{hero} kicks the sink. Klunk! The pipes moan. Something shiny clinks out.",
            "{hero} quaffs from the sink. It tastes like a goblin's toothbrush. They kick it out of spite.",
            "{hero} kicks the sink, because NetHack taught them sinks drop rings. The DevTeam thinks of everything.",
        ],
        lootSmash_Dummy: [
            "{hero} attacks the training dummy. It wins on points. They destroy it out of pride.",
            "{hero} practises a combo on the training dummy. Straw everywhere.",
            "{hero} defeats the training dummy! +0 experience. Worth it.",
        ],
        lootSmash_SnackMachine: [
            "{hero} shakes the snack machine until it surrenders everything. Even the coins.",
            "{hero} pays for a snack, it gets stuck, and the machine pays the price.",
            "{hero} smashes the vending machine: \"OUT OF ORDER? NOT ANY MORE!\"",
        ],
        lootSmash_FishTank: [
            "{hero} smashes the fish tank. An eel looks at them with deep Brogue-ish disappointment.",
            "{hero} looks for treasure in the fish tank, with a hammer. A wet, flopping mistake.",
        ],
        lootSmash_Altar: [
            "{hero} drops their whole inventory on the altar to check for curses. Candles everywhere.",
            "{hero} kicks the altar. Somewhere, a god of tidiness frowns.",
        ],
        lootSmash_ArmorStand: [
            "{hero} tries on the armor stand's armor. Nothing fits. Pieces everywhere.",
            "{hero} knocks over the armor stand: \"Prepare to—oh, it's empty.\"",
        ],
        lootSmash_CrystalBall: [
            "{hero} gazes into the crystal ball and sees... themselves, about to drop it. They drop it.",
            "{hero} cracks the crystal ball. It foretold this, and is very smug about it.",
        ],

        zap: [
            "{hero} zaps a {wand} at nothing in particular. {effect}",
            "{hero} waves a {wand} dramatically. {effect}",
            "{hero} engrave-tests a {wand}. {effect}",
            "{hero} breaks the seal on a {wand} and points it at the ceiling. {effect}",
            "{hero} zaps a {wand} at a suspicious shadow. {effect}",
            "{hero} reads the {wand} instructions too late. {effect}",
        ],
        ring: [
            "{hero} tries on a ring, decides it clashes with the armor, and drops it.",
            "{hero} takes off an itchy ring and tosses it over a shoulder.",
            "A ring slips off {hero}'s finger. Nobody notices but the camera.",
            "{hero} puts on a ring, feels nothing, and flicks it away. \"Unidentified junk.\"",
            "{hero} drops a ring to free up an inventory slot. Ring slots, the eternal struggle.",
            "{hero} juggles three rings, catches two.",
        ],
        purse: [
            "{hero}'s coin purse has a hole in it. Zorkmids trickle onto the floor.",
            "{hero} drops a handful of zorkmids and decides they are beneath a hero.",
            "Coins jingle out of {hero}'s pocket. Nobody tells them.",
            "You hear someone counting money. It's {hero}. Badly. Some coins fall.",
            "{hero} tips a bard. There is no bard. The coins land on the floor.",
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
            "{hero} is Hungry. {hero} eats a food ration in one turn, somehow.",
            "{hero} eats a lichen corpse. \"Never rots!\" they say, mouth full.",
            "{hero} opens a tin. It smells of spinach. They feel stronger. They feel littering.",
            "{hero} snacks on a slime mold. The slime looks on, horrified.",
            "{hero} eats a fortune cookie. The fortune reads: \"Pick up your trash.\" They do not.",
            "{hero} stops to cook a meal at a campfire they brought. Wrapper, peel, crumbs. Joppa-style.",
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
            "{hero} quaffs an unidentified potion. It was healing. Lucky. The bottle hits the floor.",
            "{hero} drinks a potion of booze by mistake. \"Ooh, I feel heroic-er.\"",
            "{hero} drinks a dram of fresh water like it's a fine wine. Somewhere, a Qud merchant weeps.",
            "{hero} quaffs and gains 1d8 hit points. Rolls a 1. Drinks another.",
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
            "{hero} takes a hit! Their HP bar goes yellow. The music gets tense.",
            "{hero} is hit! \"You miss. You miss. You miss. The monster hits!\" Classic.",
            "{hero} gets whacked: \"That's not fair, I didn't pause!\"",
            "{hero} takes damage and checks the HP twice, then three times.",
            "{hero} is struck! A ketchup packet bursts on impact. It is very convincing.",
            "{hero} takes a hit and mutters: \"Should've worn the helmet.\"",
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
            "{hero} takes the stairs. \"There is a staircase down here. You climb down.\"",
            "{hero} leaves for depth 2. Godspeed. Depth 2 is also our dungeon. We have a lot of floors.",
            "{hero} descends, still not having read a single sign.",
            "{hero} departs. Their muddy footprints stay behind, as a souvenir.",
            "{hero} heads downstairs. The level feeling: \"This dungeon is sticky.\"",
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
            "The monsters get up and compare their death scenes. Everyone gets a gold star.",
            "\"Cut! That's a wrap!\" The monsters get up and head to the lounge.",
            "The monsters rise, stretch and log their overtime.",
            "Somebody puts the kettle on. The fallen monsters recover remarkably fast.",
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
            "You fill the bucket. You roll a d20 for motivation. 17. Good enough.",
            "You clock in. The RNG has left you a present. Many presents. All sticky.",
            "Welcome, janitor! You are a lawful neutral human Janitor. Your shift begins.",
            "You put on your rubber gloves. Cockatrice-proof AND ketchup-proof.",
        ],

        // Little asides from the world, the dice and the people who made dungeons.
        // Presentation only (Flavor.rng): they never change the mess.
        diceAside: [
            "(Somewhere behind a screen, a DM rolls a d20 and says \"hmm.\")",
            "(Natural 1! Nobody knows whose. Everyone checks their dice.)",
            "(The RNG rolls 3d6 for drama. 18. Wow.)",
            "(A saving throw is made. Saved! Against what? Paperwork.)",
            "(The dice clatter off the table and under the fridge. Re-roll!)",
            "(Critical hit! The critical part is the cleanup.)",
            "(Somebody roll for perception. The janitor will notice everything tomorrow anyway.)",
            "(Rolling with advantage. Rolling with disadvantage. Rolling with a mop.)",
            "(The d20 lands on its edge. Everyone agrees to never speak of this.)",
            "(THAC0 is mentioned. Several monsters shudder.)",
        ],
        devAside: [
            "The DevTeam thinks of everything. Except who cleans up.",
            "Somewhere, Brian Walker adds one more eel to a lake. Just to be sure.",
            "Somewhere, Josh Ge watches a robot lose a part and smiles.",
            "Somewhere in Qud, Jason Grinblat and Brian Bucklew write a book about this exact puddle.",
            "Somewhere, a Crawl dev removes a feature and everyone agrees it was for the best.",
            "Somewhere, Linley Henzell's original dungeon sighs approvingly.",
            "Somewhere, Thomas Biskup promises this will all be fixed in the next update.",
            "Somewhere, Rogue's original team draws one more @ by hand.",
            "Xom thinks this is hilarious.",
            "You hear the footsteps of a guard on patrol. It's the janitor's alarm clock.",
            "You hear bubbling water. Somebody's going to have to mop that.",
            "You hear the chime of a cash register. Mimsy has a customer!",
            "You feel a strange vibration under your feet. It's the hero's playlist.",
            "This line was procedurally generated. Lovingly.",
            "The floating eye camera zooms in. Then out. Then in. It's having fun.",
            "You have a feeling of déjà vu. It's the same seed as Tuesday.",
            "Somewhere, a Cogmind recycler bot quietly judges the floor.",
            "A watervine farmer in Joppa feels a disturbance in the puddles.",
            "Trog does not approve of this dungeon's book club.",
            "Okawaru notes the hero's technique. Okawaru is not impressed.",
            "This level feeling: \"You have a good feeling about the snacks here.\"",
            "Somewhere, a speedrunner sees this footage and cries.",
            "The dungeon's procedural generator takes a small bow.",
        ],
        // Monsters talking to each other while the raid goes on.
        monsterBanter: [
            "{monster} whispers to {other}: \"Is it my turn to faint?\" \"No, you fainted Tuesday.\"",
            "{monster} mouths to {other}: \"Remember: big gasp, then fall LEFT.\"",
            "{monster} passes {other} a ketchup packet. \"For the dramatic bit.\"",
            "{monster} tells {other}: \"Hero spotted. Places, everyone. Places!\"",
            "{monster} asks {other}: \"Did you remember to unplug the cauldron?\"",
            "{monster} and {other} quietly rehearse a death scene.",
            "{monster} to {other}: \"This one's a Speedrunner type, I can feel it.\"",
            "{monster} nudges {other}: \"Psst. Your fly is open.\" \"I'm a slime.\" \"...Right.\"",
            "{monster} offers {other} a mint before the big fight.",
            "{monster} reminds {other} about book club on Thursday.",
            "{monster} and {other} flip a coin to decide who gets hit first.",
            "{monster} tells {other}: \"I bet they're going to kick the door. They always kick the door.\"",
            "{monster} asks {other}: \"Do I look intimidating?\" \"You look very intimidating.\" \"Thanks.\"",
        ],

        graffiti: [
            "{hero} scrawls \"{item}\" on the wall. In permanent marker.",
            "{hero} pauses to carve \"{item}\" into the stonework.",
            "{hero} spray-paints \"{item}\" on a wall. The monsters gasp.",
            "{hero} writes \"{item}\" on the wall. The spelling is creative.",
            "{hero} tags the wall: \"{item}\". Somebody will have to scrub that.",
            "{hero} engraves \"{item}\" with their sword. The sword is now blunt.",
            "{hero} writes \"{item}\" in glowing ink. Very hard to scrub. Very.",
        ],
        graffitiTags: [
            "HERO WAS HERE", "LOOT OR DIE", "FIRST!", "MONSTERS STINK", "GLORY 4 EVER",
            "CALL ME ;)", "DRAGONS R FAKE", "THIS WAY ->", "I CAME I SAW I LOOTED",
            "YASD", "NAT 20", "ASCEND OR DIE", "DONT TRUST THE CHEST", "RNG HATES ME",
            "LIVE AND DRINK", "TROG WAS HERE", "ELBERETH?", "GG", "@ <3 $", "SAVE POINT ->",
            "NEVER MELEE THE EYE", "HJKL 4 LIFE", "I KILLED A NEWT",
        ],
        special_Paladin: [
            "{hero} blesses the room. Holy water splashes everywhere.",
            "{hero} sprinkles holy water on the floor \"just in case\".",
            "{hero} performs a purifying ritual. The floor is now soggy AND holy.",
            "{hero} smites an unholy-looking mop bucket with holy water. It was the janitor's bucket.",
            "{hero} lays on hands. On the floor. Wetly.",
        ],
        special_Barbarian: [
            "{hero} tears into a turkey drumstick and tosses the bone.",
            "{hero} eats a drumstick in three bites. The bone goes flying.",
            "{hero} pauses for a mid-battle drumstick. \"RAAARGH. Delicious.\"",
            "{hero} eats a drumstick, bone and all, then spits the bone out. It ricochets.",
            "{hero} flexes so hard a drumstick falls out of their loincloth.",
        ],
        special_Wizard: [
            "{hero} casts FIREBALL! At nothing in particular.",
            "{hero} reads a scroll aloud and the room catches fire a little.",
            "{hero} hurls a fireball. The scroll crumbles to the floor.",
            "{hero} casts a spell at 40% failure. It fails upwards. Scorch marks.",
            "{hero} casts magic missile at the darkness. The darkness is now singed.",
        ],
        special_Ranger: [
            "{hero} looses an arrow. It misses everything.",
            "{hero} fires a warning shot into the wall.",
            "{hero} shoots an arrow at a suspicious shadow. It was a coat rack.",
            "{hero} fires a volley of arrows. One hits. The floor. Repeatedly.",
            "{hero} shoots an apple off a goblin's head. There was no apple. Close call.",
        ],
        special_Rogue: [
            "{hero} throws a smoke bomb and vanishes! Then reappears, coughing.",
            "{hero} drops a smoke bomb for dramatic effect. Soot everywhere.",
            "{hero} tosses a smoke bomb. Nobody was looking.",
            "{hero} sneaks very loudly behind a smoke bomb.",
            "{hero} backstabs the air in a cloud of soot. Stealthy!",
        ],
        special_Bard: [
            "{hero} plays a rousing ballad. Sheet music flutters to the floor.",
            "{hero} improvises a song about their own bravery.",
            "{hero} strums a power chord. Pages of sheet music scatter.",
            "{hero} casts Vicious Mockery. The monsters are mildly offended. Sheet music everywhere.",
            "{hero} plays 'Wonderwall'. The dungeon begs them to stop.",
        ],
        special_Archeologist: [
            "{hero} digs a hole looking for ancient artifacts. Finds a sock.",
            "{hero} excavates the floor. \"This tile is at least a week old!\"",
            "{hero} pulls out a tiny shovel and digs. Dirt everywhere.",
            "{hero} applies a pick-axe to the floor. \"You dig a pit in the floor.\" Correct.",
            "{hero} digs for treasure and finds the dungeon's plumbing. Leaves quickly.",
        ],
        special_Alchemist: [
            "{hero} mixes two potions. They fizz, bubble and spill.",
            "{hero} drops a flask. Something bubbly oozes out.",
            "{hero} tries a new recipe. It explodes, but only a little.",
            "{hero} dips a potion into another potion. \"Interesting.\" BOOM. \"Very interesting.\"",
            "{hero} brews something purple and nervous-looking. It escapes.",
        ],
        special_Tourist: [
            "{hero} takes a flash photo. Everyone sees spots for a while.",
            "{hero} poses for a selfie with a 'defeated' monster. The monster does bunny ears.",
            "{hero} buys a souvenir from nobody and drops the receipt.",
            "{hero} pays 300 zorkmids for a 'genuine dungeon pebble'. Drops the receipt.",
            "{hero} asks a skeleton for directions to the gift shop. Leaves a tip.",
        ],
        special_Valkyrie: [
            "{hero} bellows \"VALHALLA!\" and the room gets noticeably colder.",
            "{hero} stamps their boots. Frost melts into puddles everywhere.",
            "{hero} raises a frosty blade. The floor gets very, very wet.",
            "{hero} wins. Valkyries always win. The ice, however, melts.",
            "{hero} sings a battle hymn so cold the torches shiver.",
        ],
        special_Speedrunner: [
            "{hero} shouts \"ANY%!\" and crushes an energy drink can.",
            "{hero} yells \"FRAME PERFECT!\" at a perfectly normal doorway.",
            "{hero} mutters \"reset? no, keep going\" and chugs another energy drink.",
            "{hero} tries a wall clip. The wall says no. Another can hits the floor.",
            "{hero} checks the timer: \"Behind on splits!\" Slams a drink. Drops the can.",
        ],
        special_Necromancer: [
            "{hero} reads aloud: \"KLAATU BARADA... NECKTIE?\" Nothing rises. A page falls.",
            "{hero} tries to raise the dead. The 'dead' politely stay down, they're on a break.",
            "{hero} flips through the Necronomicon. A page comes loose.",
            "{hero} casts Animate Skeleton. The skeleton is busy. Union rules.",
            "{hero} chants dark words. The dark words have a typo. A page flutters away.",
        ],
        special_Monk: [
            "{hero} meditates, lights incense and leaves the ash behind. Inner peace, outer mess.",
            "{hero} achieves enlightenment. Also leaves ash on the floor.",
            "{hero} does a flying kick in a cloud of incense smoke. Namaste.",
        ],
        special_Healer: [
            "{hero} bandages a monster who didn't ask. The wrapper goes on the floor.",
            "{hero} applies a stethoscope to a slime. \"Hmm. Gooey.\" Drops a bandage wrapper.",
            "{hero} casts Cure Light Wounds on themselves. Drops the used bandage. Ew.",
        ],
        special_Berserker: [
            "{hero} goes berserk! Trog approves! The furniture does not! Splinters!",
            "{hero} rages at a perfectly innocent chair. The chair loses.",
            "{hero} drops a pamphlet: 'TROG SAYS: BOOKS ARE FOR BURNING'. The book club is appalled.",
        ],
        special_Wanderer: [
            "{hero} rummages in their random starting kit and drops something baffling.",
            "{hero} finds an item they didn't know they had. Leaves it on the floor, confused.",
            "{hero} empties a pocket. Even the Wanderer doesn't know what that was.",
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
            "{hero} whispers: \"Search. Search. Search. Search. Search.\"",
            "{hero} grumbles: \"Where's the water ritual? I'm parched.\"",
            "{hero} mutters: \"If I see an eel I'm leaving.\"",
            "{hero} checks their inventory for the ninth time.",
            "{hero} says: \"Is the mimic... behind me?\" It's not. Yet.",
            "{hero} complains: \"These levels all look the same.\" They are procedurally generated.",
            "{hero} says: \"I should really identify these potions.\" Quaffs one instead.",
            "{hero} wonders aloud: \"Who cleans all this up, anyway?\" The camera zooms in on nobody.",
            "{hero} hums the shop music under their breath.",
            "{hero} mutters: \"Just one more turn.\"",
            "{hero} grumbles: \"In my last run I had a Ring of Slow Digestion by now.\"",
            "{hero} asks the wall: \"Are you a secret door?\" The wall says nothing. Suspicious.",
        ],
        heroAmulet: [
            "{hero} bellows: \"WHERE IS THE AMULET OF YENDOR?!\"",
            "{hero} announces: \"I'm here for the Amulet!\"",
            "{hero} demands: \"Hand over the Amulet of Yendor!\"",
            "{hero} asks politely: \"Excuse me, is the Amulet on this floor?\"",
            "{hero} shouts: \"I've come for the Amulet! Or a reasonable facsimile!\"",
        ],
        rodneyReply: [
            "{monster} sighs: \"Rodney has it. Again.\"",
            "{monster} points: \"Bottom floor, take the stairs, mind the wet floor sign.\"",
            "{monster} shrugs: \"Ask Rodney. He borrowed it for 'a quick thing' ages ago.\"",
            "{monster} whispers: \"Rodney sells fake ones at the gift shop, you know.\"",
            "{monster} yawns: \"Depth 26 in Brogue, bottom of Gehennom over there. Here? Lost and found.\"",
            "{monster}: \"Did you check behind the fridge? Everything ends up behind the fridge.\"",
        ],
        heroLost: [
            "{hero} stops, turns the map upside down, and looks lost.",
            "{hero} has been walking in circles. Again.",
            "{hero} looks around: \"Have I been here before? Everything looks procedurally generated.\"",
            "{hero} reads a magic mapping scroll. It's a map of the wrong dungeon.",
            "{hero} explores automatically. Auto-explore gives up and goes home.",
            "{hero} stares at a wall for a long time, waiting for it to be a secret door.",
        ],
        monsterDirections: [
            "{monster} breaks character: \"Down the hall, second left. You're welcome.\"",
            "{monster} politely points the hero toward the next room.",
            "{monster} draws them a little map. It is wrong, but it's the thought that counts.",
            "{monster} sighs and walks the hero to the next room by the hand.",
            "{monster}: \"Follow the muddy footprints. They're yours.\"",
        ],
        scrollRead: [
            "{hero} reads an unidentified scroll!",
            "{hero} unrolls a mysterious scroll and reads it out loud.",
            "{hero} reads a scroll labeled ZELGO MER. Brave.",
            "{hero} reads a scroll labeled ELAM EBOW. Bold.",
            "{hero} reads a scroll labeled THARR. Somebody gasps.",
            "{hero} reads a scroll labeled VERR YED HORRE. In a terrible accent.",
        ],
        scrollOutcome_loss: [
            "{hero} feels a strange sense of loss.",
            "{hero} has a feeling they forgot something important. Like where they parked.",
            "Nothing happens. {hero} feels oddly disappointed.",
            "{hero} forgets the map. And the spells. And their middle name.",
            "Who was that Maud person anyway? {hero} doesn't know any more.",
        ],
        scrollOutcome_menu: [
            "It is a takeaway menu. {hero} orders a pizza.",
            "The scroll reads: \"2-for-1 kebabs, Tuesdays.\" {hero} takes note.",
            "It's a coupon for 10% off at the Minetown shop. Expired.",
            "It's a flyer: 'LOST: one Amulet. Answers to Yendor. Ask Rodney.'",
            "It's a patch note: 'Fixed heroes reading random scrolls.' Not fixed.",
        ],
        scrollOutcome_confetti: [
            "Confetti bursts from the scroll! Paper everywhere.",
            "The scroll explodes into a shower of tiny pages. Festive.",
            "A party popper scroll! It's someone's birthday, apparently.",
            "The scroll of genocide... of tidiness! Paper everywhere.",
        ],
        backIn5: [
            "{monster} holds up a little sign: BACK IN 5.",
            "{monster} flips a sign: ON BREAK. PLEASE SLAY LATER.",
            "{monster} puts up a sign: CLOSED FOR LUNCH. The hero waits, confused.",
            "{monster} raises a sign: OUT OF HIT POINTS, RESTOCKING.",
            "{monster} hangs a sign: GONE FISHING (FOR EELS).",
        ],
        saveScum: [
            "{hero} dies... \"Do you want your possessions identified?\" ...Restoring from save.",
            "{hero} collapses! The world flickers. Restoring from save...",
            "{hero} is defeated! Somewhere, a save file is reloaded. Restoring from save.",
            "{hero} dies! \"You die...\" The tombstone appears, then un-appears. Save-scummed.",
            "{hero} perishes! A cheat code is entered off-camera. They're back.",
        ],
        saveScumReply: [
            "{monster} blinks: \"Wait, didn't we just...?\"",
            "{monster} frowns: \"Hey! No save-scumming!\"",
            "{monster} mutters: \"Every single time.\"",
            "{monster} sighs: \"This is a roguelike! It's in the name!\"",
            "{monster}: \"Permadeath means PERMA, hero.\"",
        ],
        elbereth: [
            "{hero} engraves \"Elbereth\" on the wall. Very carefully.",
            "{hero} writes Elbereth in the dust. And on the wall. Just in case.",
            "{hero} scratches \"ELBERETH\" into the stone and feels very safe.",
            "{hero} engraves Elbereth. Spells it Elbcreth. Engraves it again.",
        ],
        elberethReply: [
            "{monster} reads it: \"Oh, Elbereth. Sure.\" *walks around it politely*",
            "{monster} nods respectfully at the engraving and carries on.",
            "{monster} sighs: \"Someone's going to have to scrub that.\"",
            "{monster}: \"That only works on some of us, you know. I'm union. It's in the contract.\"",
        ],

        // Traps the hero walks into ({trap} is its name).
        trapSprung: [
            "{hero} steps on a {trap}! CLICK.",
            "CLICK! {hero} finds a {trap}. With their foot.",
            "{hero} triggers a {trap}. \"Ah. Yes. I meant to do that.\"",
            "{hero} walks right into a {trap}. They did not search.",
        ],
        trap_glitter: [
            "FWOOMPH! A cloud of glitter. {hero} sparkles. The floor sparkles. Everything sparkles forever.",
            "A glitter bomb goes off! The glitter will outlive us all.",
        ],
        trap_pie: [
            "SPLAT! A cream pie hits {hero} square in the face. The monsters applaud.",
            "A pie launcher fires! Lemon meringue, everywhere.",
        ],
        trap_bucket: [
            "A bucket of water tips onto {hero}'s head. Classic. Timeless.",
            "SPLOOSH! {hero} is soaked. So is the floor.",
        ],
        trap_confetti: [
            "POP! Confetti everywhere! \"Congratulations, you are the 1000th hero!\"",
            "A confetti cannon fires. {hero} is very confused and slightly festive.",
        ],
        trap_trapdoor: [
            "A trap door opens! {hero} falls through... and climbs back up, muddy and embarrassed.",
            "{hero} falls into a trap door! \"There's a trap door here.\" Was. Now there's a hole.",
        ],
        trap_arrow: [
            "An arrow shoots out of the wall! It misses. A second one misses better.",
            "Twang! A rubber-tipped arrow bounces off {hero}'s helmet.",
        ],
        trap_whoopee: [
            "PFFFFRRRRT. A whoopee cushion trap. {hero} looks around. The monsters keep a straight face. Barely.",
            "A whoopee cushion goes off under {hero}. The kobolds cannot breathe from laughing.",
        ],
        trap_bear: [
            "A plush bear trap hugs {hero}'s ankle. It's very affectionate. It takes a while to let go.",
            "SNAP! A bear trap! It's a teddy bear holding a sign: GOTCHA.",
        ],
        trap_rust: [
            "A gush of water hits {hero}'s helmet. It rusts a little. The floor rusts a little too.",
            "A rust trap sprays {hero}! Their armor squeaks for the rest of the night.",
        ],
        trap_sleep: [
            "A cloud of gas! {hero} falls asleep for a moment and drools on the floor.",
            "{hero} steps on a sleeping gas trap and takes a short, drooly nap.",
        ],

        // The janitor resets a sprung trap in the morning.
        trapRearm: [
            "You carefully re-arm the {trap}. Ready for the next hero!",
            "You reset the {trap}. Click. Somewhere, a future hero shivers.",
            "You re-arm the {trap} and give it a little pat. Good trap.",
            "You reset the {trap}. The DevTeam would be proud.",
            "You re-arm the {trap}, and add a tiny 'Wet Floor' sign for fairness.",
        ],

        cardTitle: [
            "Night shift, day {day}",
            "Day {day}: the night shift",
            "After hours, day {day}",
            "Day {day}. The morning after.",
            "Episode {day}: The Mess Strikes Back",
        ],
        cardLine: [
            "The dust settles. Somewhere, a mop bucket waits.",
            "The monsters limp off to the staff lounge. You clock in.",
            "The dungeon is quiet now. Quiet, and very, very sticky.",
            "The hero is gone. The mess, sadly, is not.",
            "You punch your time card. The machine goes 'ka-chunk'.",
            "You tie your apron and roll up your sleeves.",
            "The level was generated. The mess was simulated. The mop is real.",
            "Somewhere, a d20 rolls. You roll up your sleeves.",
            "You hear the drip of a single, ketchup-coloured drop.",
            "The torches flicker. The puddles glisten. The coffee brews.",
        ],

        heroFirst: [
            "Sir Gleamington", "Brakka", "Lady Valoria", "Thrognar", "Percival", "Ser Shinyboots",
            "Elandriel", "Grimbold", "Dame Fortitude", "Chad", "Xandar", "Bartholomew",
            "Rodney", "Yasd the Unlucky", "Ascension Andy", "Scummy McSavefile", "Gelatinous Kevin's Cousin",
            "Hjkl", "Seed 1337", "Player One", "Mx. Rerollsalot", "Brogan", "Dungeona", "Wizbit",
            "Sir Autoexplore", "Snapjaw Steve", "Lenny Leveldrain", "Captain Search", "Nat Twenty",
            "Plinth", "Gorbo", "Twinkletoes", "Edgelord Dave", "Mopsy",
        ],
        heroLast: [
            "Skullsplitter", "the Bold", "Dragonbane", "of the Prophecy", "Loothoarder", "Doorkicker",
            "the Unwashed", "Goblinbane", "the Mildly Famous", "Ironpants", "Bones", "of Seed 42",
            "the Overleveled", "of Joppa", "Newtslayer", "the Unidentified", "Stairdiver", "the Twice-Saved",
            "of Depth 3", "Quaffington", "the Hungry", "Wallkicker", "of the Lost Save",
        ],
        heroClass: [
            "Paladin", "Barbarian", "Wizard", "Ranger", "Rogue", "Bard", "Archeologist", "Alchemist",
            "Tourist", "Valkyrie", "Speedrunner", "Necromancer", "Monk", "Healer", "Berserker", "Wanderer",
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

    // The pool to draw from: base_key (spaces dropped) now and then, when it exists.
    pick: function (base, key, p = 0.5) {
        let special = base + '_' + String(key || '').replace(/ /g, '');
        if (key && this.pools[special] && this.pools[special].length > 0 && this.chance(p)) {
            return special;
        }
        return base;
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
        return choice.replace(/\{(\w+)\}/g, function (m, key) {
            return (key in vars) ? vars[key] : m;
        });
    },

    heroName: function () {
        let first = ROT.RNG.getItem(this.pools.heroFirst);
        let short = first;
        if (ROT.RNG.getUniform() > 0.4 && !/ (the|of) /.test(first)) { // one epithet is plenty
            short = first + " " + ROT.RNG.getItem(this.pools.heroLast);
        }
        let cls = ROT.RNG.getItem(this.pools.heroClass);
        let joiner = / (the|of) /.test(short) ? ", " : " the ";
        return { short: short, full: short + joiner + cls, cls: cls };
    },
};

if (typeof module !== 'undefined') module.exports = Flavor;
