// The comrades who come over during the shift: the food run, the one who just wants
// to talk, and tonight's plan. Picks use Flavor.rng (presentation only) and avoid
// repeats within a run (Game.run.placesSeen, chatsSeen, plansSeen).
var Visits = {
    // Picks an item not yet seen this run (then forgets them all once every item is used).
    fresh: function (list, seenKey, idOf) {
        let run = (typeof Game != 'undefined' && Game.run) ? Game.run : {};
        let seen = run[seenKey] || [];
        let pool = list.filter(function (it) { return seen.indexOf(idOf(it)) < 0; });
        if (pool.length == 0) {
            // forget only this list: other things kept under the same key stay seen
            let ids = list.map(idOf);
            seen = seen.filter(function (id) { return ids.indexOf(id) < 0; });
            pool = list.slice();
        }
        let pick = Flavor.rng.getItem(pool);
        run[seenKey] = seen.concat([idOf(pick)]);
        return pick;
    },

    // ------------------------------------------------------------- the food run
    // ask: the opening line; options: [answer, food, reply]; quip: said on delivery.
    PLACES: [
        {id: 'cafe', ask: "Hey! I'm running to the cafe. Want anything?",
            options: [["I'd love a coffee!", 'coffee', "I'll bring you some coffee when I've got it!"],
                ["How about some tea?", 'tea', "I'll bring you some tea when I've got it!"],
                ["Can I have a donut?", 'donut', "I'll bring you back a donut when I've got it!"]]},
        {id: 'pizza', ask: "I'm going to go swing by Monster Pizza. Want anything?",
            options: [["Pepperoni!", 'pepperoni pizza', "I'll be back with a pepperoni pizza shortly :D"],
                ["Marinara's my favourite!", 'pizza marinara', "Pizza marinara coming right up :)"],
                ["Vegetables! All of them!", 'vegetable pizza', "Vegetable pizza coming up!"]],
            quip: "The delivery imp tried to charge me a 'dungeon fee'. I paid it in compliments."},
        {id: 'healthy', ask: "I'm going to {name}'s Healthy Select. Want anything?",
            options: [["How about a yummy wrap?", 'wrap', "I'll bring you your wrap when I've got it!"],
                ["Guacamole!", 'guacamole', "I'll bring you some guacamole when it's ready!"],
                ["Salad!", 'salad', "Salad, on its way!"]]},
        {id: 'breakfast', ask: "I'm going to {name}'s All-day Breakfast. Want anything?",
            options: [["Pancakes please!", 'pancakes', "Pancakes will be on their way shortly!"],
                ["Tofu Scramble would be awesome!", 'tofu scramble', "I will be back with your tofu scramble!"],
                ["Bagel!", 'bagel', "Bagels rule! I will bring you a bagel!"]]},
        {id: 'bakery', ask: "I'm heading to the Minetown Bakery. Want anything?",
            options: [["A cinnamon roll!", 'cinnamon roll', "One cinnamon roll, coming up!"],
                ["Lembas, please!", 'lembas', "Lembas it is. One bite and you're full for a week!"],
                ["Something with sprinkles!", 'sprinkle donut', "The sprinkliest thing they have!"]],
            quip: "The watchman eyed me the whole time. I didn't even TOUCH the fountain."},
        {id: 'juice', ask: "I'm popping over to the Joppa Juice Bar. Want anything?",
            options: [["A watervine smoothie!", 'watervine smoothie', "Watervine smoothie. Live and drink!"],
                ["Fresh water, a whole dram!", 'dram of fresh water', "A whole dram! You're rich now!"],
                ["Something with a mango!", 'mango juice', "Mango juice, Brogue-style!"]]},
        {id: 'sushi', ask: "I'm off to Sokoban Sushi. Want anything? They push the plates to you. Only orthogonally.",
            options: [["A boulder roll!", 'boulder roll', "One boulder roll. Don't push it into a corner!"],
                ["Nigiri, please!", 'plate of nigiri', "Nigiri! I'll carry it very carefully. No diagonals."],
                ["The 'one wrong move' platter!", "'one wrong move' platter", "Bold! If I drop it, we restart the level."]],
            quip: "I had to push three tables out of the way to reach the counter. I only got stuck twice."},
        {id: 'fortune', ask: "I'm going to the Delphi Fortune Cookie Stand. Want anything?",
            options: [["A fortune cookie!", 'fortune cookie', "One cookie, one prophecy!"],
                ["Almond cookies!", 'bag of almond cookies', "Almond cookies, no prophecy. Very restful."],
                ["Whatever the Oracle recommends!", "Oracle's recommendation", "The Oracle says... 'Yes.' Okay!"]],
            quip: "The cookie says: 'They say that the janitor is the real hero.' I didn't even peek. Much."},
        {id: 'medusa', ask: "I'm swinging by Medusa's Coffee Bar. Want anything? Don't worry, I'll go blindfolded.",
            options: [["An espresso!", 'espresso', "An espresso. I'll try not to make eye contact with it."],
                ["A rock-hard biscotti!", 'biscotti', "A biscotti! It was a regular cookie once. It looked up."],
                ["Iced latte!", 'iced latte', "Iced latte! Ice... or stone? Only one way to find out!"]],
            quip: "I think this is yours. If it isn't, it belongs to the statue by the door."},
        {id: 'dimsum', ask: "I'm going to Hydra Dim Sum. Five heads, five steamers. Want anything?",
            options: [["Dumplings!", 'dumplings', "Dumplings! Every head recommended a different one."],
                ["Bao buns!", 'bao buns', "Bao! Fluffy as a cloud. A cloud with pork in it."],
                ["One of everything. Times five.", 'very large dim sum', "Times five! You're speaking the hydra's language."]],
            quip: "The hydra argued with itself about the bill for twenty minutes. Two heads cried."},
        {id: 'canteen', ask: "I'm going to the Crawl Canteen. They've changed the menu again, but they still do something. Want anything?",
            options: [["Royal jelly!", 'royal jelly', "Royal jelly! Sticky and regal."],
                ["A ration, please!", 'ration', "A ration. Classic. Timeless. Beige."],
                ["Do they still do chunks?", 'ration', "Oh... they removed chunks. For balance! I'll get you a ration."]],
            quip: "They removed the napkins while I was in the queue. Balance, apparently."},
        {id: 'gas', ask: "I'm heading to the gas station at the edge of the Cataclysm. Want anything?",
            options: [["A hot dog!", 'hot dog', "A hot dog. It's been on the roller since the apocalypse. Seasoned!"],
                ["A can of beans!", 'can of cold beans', "Beans! I'll bring a can opener this time."],
                ["Just a soda, please.", 'soda', "A soda. Unmutated. I checked twice."]],
            quip: "The cashier was a zombie. Very polite. Very, very slow."},
        {id: 'truck', ask: "There's a new food truck by the stairs. Run by a mimic. It's also the truck. Want anything?",
            options: [["Tacos!", 'tacos', "Tacos! I'll knock on the counter first. Gently."],
                ["Churros!", 'churros', "Churros! Count them when you get them."],
                ["Whatever isn't secretly a mimic!", 'mystery basket', "...They all look so honest. I'll pick one."]],
            quip: "Count your churros. If one has teeth, it's the owner's cousin. Give it back."},
        {id: 'tavern', ask: "I'm off to the Dwarven Tavern. They just reopened after the magma thing. Want anything?",
            options: [["A plump helmet roast!", 'plump helmet roast', "Plump helmet roast! The finest mushroom money can dig."],
                ["Dwarven ale!", 'dwarven ale', "Dwarven ale! They won't serve anything else, honestly."],
                ["Prepared quarry bush leaves!", 'quarry bush leaves', "Quarry bush leaves! Very fancy. Very crunchy."]],
            quip: "A cat followed me all the way back. It's in the lounge now. It lives here now."},
        {id: 'coldbrew', ask: "I'm heading to the Lich's Cold Brew. Want anything?",
            options: [["Cold brew! The colder the better!", 'cold brew', "Cold brew. Undead cold. You'll feel it in your bones."],
                ["Phylac-tea, please!", 'phylac-tea', "Phylac-tea! They keep the leaves in a jar marked 'NOT MY SOUL'."],
                ["An iced matcha!", 'iced matcha', "An iced matcha! Green as a fresh zombie."]],
            quip: "I tipped. The lich said they'd remember it forever. Literally forever."},
        {id: 'grill', ask: "I'm going to the Slime Mold Grill. Want anything?",
            options: [["A slime mold!", 'slime mold', "A slime mold! Or whatever you named your favourite fruit."],
                ["A tin. Surprise me.", 'tin', "A tin! Could be spinach. Could be anything. That's the magic."],
                ["A food ration!", 'food ration', "A whole food ration! You'll be satiated till Thursday."]],
            quip: "If you got the tin: it took me forty turns to open. You're welcome."},
    ],

    NO_THANKS: ["Okie doke!", "No worries! Drink some water, though!", "More for me!", "Next time, then! I'll keep asking. Forever.",
        "Fair. You're on a roll. Don't let me break your combo."],

    ENJOY: ["I really hope you enjoy it :)", "Careful, it's still warm!", "I got you an extra napkin. You're welcome.",
        "The cashier rolled a d20 for your order and got a 20. It's extra good.", "Enjoy! You earned it!",
        "Eat it sitting down. Mops can wait five minutes.", "It's not cursed. I asked. Twice."],

    foodRun: function (speaker) {
        let p = this.fresh(this.PLACES, 'placesSeen', function (x) { return x.id; });
        let first = {text: this.withName(p.ask)};
        let convo = [first];
        for (let i = 0; i < p.options.length; i++) {
            let o = p.options[i];
            first[o[0]] = i + 1;
            convo.push({text: Flavor.rng.getItem(ConversationBuilder.words) + "! " + o[2], any: -1,
                tags: {food: o[1], foodQuip: p.quip || null}});
        }
        first["No thanks"] = convo.length;
        convo.push({text: Flavor.rng.getItem(this.NO_THANKS), any: -1});
        return convo;
    },

    delivery: function (tags) {
        let convo = [{text: "Here's the " + tags.food + " you asked for!", any: 1}];
        if (tags.foodQuip) {
            convo.push({text: tags.foodQuip, any: 2});
        }
        convo.push({text: Flavor.rng.getItem(this.ENJOY), any: -1});
        tags.food = false;
        Achievements.bump('snacks');
        tags.foodQuip = null;
        return convo;
    },

    // -------------------------------------------------- the one who just wants to talk
    // id, species (optional: only them), intro: lines, ask + options {answer: [lines]},
    // outro: the closing line, dream: what you dream about tonight (optional).
    CHATS: [
        {id: 'heroDream', intro: ["Hey. No mess, no request. I just... had the weirdest dream.",
            "I was the hero. Shiny armour, big sword. And then I had to clean up after MYSELF."],
            ask: "Is that a nightmare? I can't tell if it's a nightmare.",
            options: {"That's definitely a nightmare.": ["RIGHT? All those feathers. And I don't even have feathers!"],
                "Did you do a good job?": ["...I did, actually. I used the squeegee and everything. Huh."],
                "What happened next?": ["I woke up. Then I checked I still had claws. I did. Big relief."]},
            outro: "Thanks for listening. I feel lighter. Like a hero who forgot their armour.",
            dream: "You dream you're the hero, and then you clean up after yourself. It's fine. It's actually fine."},
        {id: 'examDream', intro: ["Got a sec? I dreamt I had to retake the Monster Exam.",
            "Section three: Menacing Postures. I hadn't studied. I just stood there. Unmenacing."],
            ask: "Do you ever have that dream? The one where you're not ready?",
            options: {"All the time.": ["Oh good. I mean, not good. But good. You know what I mean."],
                "Everyone does.": ["Everyone? Even the dragon? ...Huh. That helps, weirdly."],
                "Show me your menacing posture.": ["*does a pose* ...Okay, that felt great. Grr. GRR. Thanks!"]},
            outro: "I'll practise my growl in the mirror tonight. Thanks, friend.",
            dream: "You dream you're sitting the Janitor Exam. Every question is 'mop?'. You ace it."},
        {id: 'surfaceDream', intro: ["Can I tell you about my dream? It's a short one.",
            "I was outside. On the surface. There was a big yellow light in the ceiling and NOBODY had cleaned it. So bright!"],
            ask: "Have you ever been up there?",
            options: {"Yes, it's called the sun.": ["The sun. THE SUN. You say it so casually! Is it hot? Don't tell me. I want to imagine."],
                "Only on weekends.": ["Weekends! Some day I'll take one. A whole weekend of not fainting."],
                "Nah, I like it down here.": ["Me too. The damp is good for my skin. But a little light would be nice."]},
            outro: "Anyway. That's my dream. Back to my corner. Thanks for listening!",
            dream: "You dream of the surface. The sun is huge and someone hands you a squeegee for it."},
        {id: 'howAreYou', intro: ["Hey, I'm not here to ask for anything. I just wanted to check on you."],
            ask: "How are YOU doing? Like, really?",
            options: {"Honestly? Pretty good.": ["Yeah? That's great! You look good with a mop. It suits you."],
                "A bit tired, to be honest.": ["Tired is allowed. You don't have to mop it all, you know. Nobody's grading. Well... the report card is. But it's nice about it."],
                "I don't really know.": ["That's allowed too. Want to just stand here a minute? We don't have to say anything.", "*you stand together for a while. It helps.*"]},
            outro: "Okay. I'll let you get back to it. My door's always open. Well, I don't have a door. My corner's always open."},
        {id: 'justXp', intro: ["Ugh, sorry. I need to vent for a sec. Is that okay?",
            "The hero looked right at me and said 'oh, it's just XP'. JUST XP!"],
            ask: "Am I just XP?",
            options: {"You're way more than XP.": ["...Yeah. I've got hobbies. And a sourdough starter. XP doesn't have a sourdough starter."],
                "They also tripped on a door, so.": ["HA! They did, didn't they? Right on their face. Okay. Okay, I feel better."],
                "Want to talk about it?": ["Not really. I think I just needed someone to hear it. You heard it. That's enough."]},
            outro: "Thanks. Venting to the janitor: cheaper than therapy, and the floor gets cleaned too."},
        {id: 'respawn', intro: ["Can I ask you something weird? No wrong answers.",
            "When I respawn every morning... am I the same me as yesterday?"],
            ask: "Is it still me?",
            options: {"You're you. I'd know.": ["You would, wouldn't you? You've mopped up after every version of me. That's... sweet, actually."],
                "Ship of Theseus, but {species}.": ["Ship of... {species}. I like that. I'm a ship. A small, angry ship."],
                "Does it matter? I like this one.": ["...You like this one? Okay. Then I'll be this one. On purpose."]},
            outro: "Philosophy makes me hungry. Thanks for thinking about it with me!"},
        {id: 'goodNews', intro: ["I don't need anything! I just wanted to tell SOMEONE.",
            "I finished my scarf! The one I've been knitting for a year!"],
            ask: "It's forty metres long. It's for the hydra. Is that too much?",
            options: {"It's perfect!": ["I KNOW, RIGHT? Each neck gets its own stripe. The middle one wanted sparkles."],
                "Forty metres?!": ["Five necks! Eight metres each! I did the maths! Mostly!"],
                "Can you make me one?": ["Can I?! Yes! Short, though. You only have the one neck. It'll be so quick!"]},
            outro: "Okay, that's all. I'm going to go stare at it proudly. Bye!"},
        {id: 'letter', intro: ["Can I read you something? I wrote a letter to the hero. I'm not sending it."],
            ask: "'Dear hero. Please wipe your feet. That's it.' ...Too harsh?",
            options: {"Not harsh enough.": ["Ooh. I could add 'sincerely'. That's the meanest word I know."],
                "It's perfect.": ["It is, isn't it? Short. To the point. Like my legs."],
                "Send it!": ["Send it?! No! ...Maybe. I'll slip it under the entrance. Anonymously. They'll know."]},
            outro: "Writing things down really helps. Thanks for being my reader!"},
        {id: 'tired', intro: ["Hey. Sorry. I'm just... tired, you know?", "Not hero-tired. Just... tired-tired."],
            ask: "Do you ever get like that?",
            options: {"Me too, sometimes.": ["Yeah? Somehow that makes it smaller. Like a small tired instead of a big one."],
                "Sit down for a bit. I'll mop around you.": ["...You'd do that? *sits* Oh. Oh, this is nice. You missed a spot. Kidding."],
                "Want to come to the lounge after?": ["Maybe. Or maybe I'll just go home and sleep for nine hours. Both are good. Thanks for asking."]},
            outro: "Okay. Small tired. I can do small tired. Thanks, friend."},
        {id: 'question', intro: ["Quick question. It's been bugging me all morning."],
            ask: "If a mimic disguises itself as a sandwich... is it a sandwich?",
            options: {"Yes. It's a sandwich.": ["Bold. So I could EAT it? ...No. No, I couldn't. It would eat me first."],
                "No. It's a mimic.": ["So it's never really a chest either? Is ANYTHING a chest? Oh no."],
                "Ask the mimic.": ["Ask the... oh. Oh, that's so respectful. I'm going to ask. I'll report back."]},
            outro: "Thanks! I'll be thinking about this all night."},
        {id: 'compliment', intro: ["Hi! I'm not stopping. I'm just walking past to say:",
            "you're doing great. That's it. That's the whole thing."],
            ask: "Okay bye!",
            options: {"Thanks! You too!": ["Me too?! Aw! Okay. I'm doing great. We're both doing great!"],
                "Wait, really?": ["Really really. The floor's never been this shiny. I can see my teeth in it."]},
            outro: "Bye for real now! *waves the whole way back*"},
        {id: 'homesick', intro: ["Do you ever miss your old job? I miss my old dungeon sometimes."],
            ask: "Level 2 had the best damp. Is it silly to miss damp?",
            options: {"Not silly at all.": ["You get it. It was a nice damp. Earthy. Not like this upstairs damp."],
                "This dungeon has damp too!": ["It does. It does! Under the third sink. I'll go and visit it on my break."],
                "Tell me about it.": ["Oh, there was a puddle shaped like a duck. And a bat called Clive. Good times."]},
            outro: "Thanks for letting me ramble. This place is home too, now. A bit."},
        {id: 'ghost', species: 'Ghost', intro: ["Oh! You can see me. Sorry, I forget people can.",
            "Folks walk right through me. Literally. It's a bit lonely, if I'm honest."],
            ask: "Do you think I'm... noticeable?",
            options: {"I noticed you!": ["You did! You looked right at me! Okay. That's a good day, then."],
                "You're the coolest one here. Temperature-wise too.": ["Hehe. I'm literally five degrees. Thank you, though!"],
                "Come and haunt the lounge with us.": ["I could rattle a chain at lunch. Just a little one. Friendly rattling."]},
            outro: "Thanks for seeing me. I'll float back now. Visibly."},
        {id: 'mimic', species: 'Mimic', intro: ["Psst. It's me. The chest. Well, not a chest. You know.",
            "People only talk to me when they think I'm full of gold."],
            ask: "Nobody ever asks the chest how it's doing.",
            options: {"How are you doing?": ["...Nobody's ever asked that. I'm okay. I think I'm better now, actually."],
                "You're more than a chest.": ["I'm also a barrel on weekends. But I know what you mean. Thank you."],
                "I'll always knock first.": ["You'd knock?! Oh, that's the nicest thing. I'll open gently. No teeth."]},
            outro: "Okay. Back to sitting very still. *closes, happily*"},
        {id: 'eye', species: 'Floating Eye', intro: ["Hi. Don't worry, I'm not going to paralyse you. I just wanted to talk."],
            ask: "Nobody makes eye contact with me. I get why. But still. Do you think I'm weird?",
            options: {"You're lovely. I just blink a lot.": ["Ha! Blinking's allowed. I do it too. Well. Once. It's a big event."],
                "I'll look. Briefly. Respectfully.": ["*happy floating* That was the best quarter-second of my week."],
                "Weird is good here.": ["It is, isn't it? This whole dungeon is weird. I fit right in."]},
            outro: "Okay! I'll float along. Thanks for not looking away. Much."},
        {id: 'dragon', species: 'Dragon', intro: ["Can I confess something? You won't tell anyone?",
            "I don't hoard gold. I hoard spoons. Three thousand spoons."],
            ask: "Is that... weird for a dragon?",
            options: {"Spoons are great!": ["THEY ARE GREAT. Shiny, curved, useful at breakfast. Gold can't stir soup."],
                "Do you have a favourite?": ["A little wooden one. It's not even shiny. It's just... a good spoon."],
                "Your secret's safe with me.": ["Thank you. I'll show you the hoard someday. Bring a spoon. Not to keep. To visit."]},
            outro: "Phew. That's been sitting on my chest for centuries. Literally, on top of the spoons."},
        {id: 'lich', species: 'Lich', intro: ["I've been thinking. I put my soul in a jar some centuries ago."],
            ask: "Some days I wonder if I should have picked a nicer jar. Is that vain?",
            options: {"Not vain. It's your soul!": ["It IS my soul. It deserves a jar with a little lid. Maybe a ribbon."],
                "What's wrong with the jar?": ["It used to hold pickles. I can still smell them. For eternity."],
                "We could decorate it!": ["Stickers? On my phylactery? ...Yes. Yes, I think that's what I've been missing."]},
            outro: "Thank you. Being undead is a lot less lonely with a good janitor around."},
        {id: 'unicorn', species: 'Unicorn', intro: ["Hey. Can I be honest for a sec?",
            "Everyone thinks I'm all rainbows. Some days I'm just a horse with a stick on its head."],
            ask: "Is it okay to not be magical every day?",
            options: {"Totally okay.": ["Thank you. Today I'm going to be a regular horse. Maybe eat some hay. Normal stuff."],
                "The stick is very nice though.": ["It IS a nice stick. I polish it. Okay, that cheered me up."],
                "I'm not magical either.": ["You make floors shine. That's magic. Don't argue with the unicorn."]},
            outro: "Thanks for letting me be just a horse for a minute."},
        {id: 'cube', species: 'Gelatinous Cube', intro: ["Hey. I accidentally absorbed my own lunch box again."],
            ask: "I'm not sad. I'm just full of regrets. And a lunch box. Is that sad?",
            options: {"A little sad. But also funny.": ["Okay, it's a bit funny. The fork's waving at you. See?"],
                "I'll get you a new lunch box.": ["A NON-absorbable one? Is that a thing? You'd do that?"],
                "Everyone absorbs a lunch box sometimes.": ["...Do they? No. But thank you for saying so."]},
            outro: "I'll go and digest my feelings. And the lunch box. Thanks!"},
    ],

    chatFor: function (speaker) {
        let mine = this.CHATS.filter(function (c) { return c.species == speaker.species; });
        let seen = (Game.run && Game.run.chatsSeen) || [];
        mine = mine.filter(function (c) { return seen.indexOf(c.id) < 0; });
        let c = mine.length > 0 && Flavor.chance(0.7) ? mine[0] :
            this.fresh(this.CHATS.filter(function (x) { return !x.species; }), 'chatsSeen', function (x) { return x.id; });
        if (Game.run) {
            Game.run.chatsSeen = Game.run.chatsSeen || [];
            if (Game.run.chatsSeen.indexOf(c.id) < 0) {
                Game.run.chatsSeen.push(c.id);
            }
        }
        return c;
    },

    // A chat def as a conversation: intro lines, the question, each answer's reply, the outro.
    buildChat: function (c, speaker) {
        let who = String(speaker.species || 'monster').toLowerCase();
        let say = function (t) { return t.replace(/\{species\}/g, who); };
        let convo = [];
        for (let i = 0; i < c.intro.length; i++) {
            convo.push({text: say(c.intro[i]), any: i + 1});
        }
        let ask = {text: say(c.ask)};
        convo.push(ask);
        let ends = [];
        for (let answer in c.options) {
            ask[say(answer)] = convo.length;
            let lines = c.options[answer];
            for (let i = 0; i < lines.length; i++) {
                let node = {text: say(lines[i]), any: convo.length + 1};
                convo.push(node);
                if (i == lines.length - 1) {
                    ends.push(node);
                }
            }
        }
        let outro = {text: say(c.outro), any: -1, globalTags: {yendorPoints: 10, listened: true}};
        if (c.dream) {
            outro.globalTags.sharedDream = c.dream;
            outro.globalTags.dreamer = speaker.name;
        }
        for (let i = 0; i < ends.length; i++) {
            ends[i].any = convo.length;
        }
        convo.push(outro);
        return convo;
    },

    chat: function (speaker) {
        return this.buildChat(this.chatFor(speaker), speaker);
    },

    // ------------------------------------------------------------- tonight's plan
    ROGUELIKES: ['NetHack', 'Brogue', 'Dungeon Crawl Stone Soup', 'Angband', 'ADOM', 'Caves of Qud', 'Cogmind',
        'DoomRL', 'Tales of Maj\'Eyal', 'Sil', 'the original Rogue', 'Shiren the Wanderer', 'Pixel Dungeon', 'Infra Arcana',
        'Cataclysm: DDA', 'Jupiter Hell', 'UnReal World', 'Moria'],
    MOVIES: ['Return of the Mop', 'Sweeping Beauty', 'Gone with the Wand', 'The Fellowship of the Bucket',
        'Bucket List 2: Still Kicking', 'Dust Busters', 'The Lich King (Director\'s Unlife Cut)', 'Mopocalypse Now'],

    // id: the plan word; label: how "head out with everyone to ..." reads; ask(host): the invitation;
    // scene; nights: what happens (functions get the plan details).
    PLANS: [
        {id: 'dinner', label: 'dinner', scene: 'dinner', ask: "a bunch of us were planning to get together for dinner after work.",
            nights: ["You have a really delicious meal and are pleasantly full by the end of it!",
                "It's buffet style and you get a lot of really good food!",
                "You have some ramen. At the end, your fortune cookie says: 'Your day tomorrow will be {word}'. Wow!",
                "The ogre orders 'one of everything'. The waiter cries. The ogre tips beautifully.",
                "Somebody's birthday song gets sung at the wrong table. Everyone joins in anyway."]},
        {id: 'drinks', label: 'drinks', scene: 'drinks', ask: "a bunch of us were planning to get together for drinks after work.",
            nights: ["You have a beverage called a 'Gin and {name}'. It's surprisingly {word}?",
                "Everyone has a round and boisterously jokes about the day's events. It's fun!",
                "It's actually pretty quiet; lots of folks stayed in tonight, so it's a relatively quiet night with 3 or 4 of you.",
                "Someone orders a potion of booze. It's just apple juice. Nobody notices. Great night."]},
        {id: 'dancing', label: 'dancing', scene: 'dancing', ask: "a bunch of us were planning to go dancing after work.",
            nights: ["You dance the whole night. It's so fun and energetic!",
                "Some really good classic metal is played and you headbang the whole night!",
                "Some wicked good music from the 90's plays. Such nostalgia! Wow!",
                "The skeleton does the robot. The robot would be proud. There is no robot. Still."]},
        {id: 'dice night', label: 'dice night', scene: 'dice', ask: "we're doing dice night after work. Bring a pencil and a character sheet!",
            nights: ["The dragon runs the game. You play a level 1 Janitor. You save the kingdom by mopping the final boss's lair!",
                "You roll three natural 20s in a row. The whole table screams. The dragon has to lie down.",
                "The campaign is 'Dungeons and Dishwashers'. You win. Everybody wins. There are snacks.",
                "The party spends two hours planning a heist. Then everyone just walks in the front door. It works."]},
        {id: 'karaoke', label: 'karaoke', scene: 'karaoke', ask: "we're doing karaoke after work. There's a song about mops. I checked.",
            nights: ["The harpy sings a power ballad. Every glass in the place shatters. Nobody minds.",
                "You and a skeleton duet 'Dancing in the Dark'. Bones rattle. A standing ovation.",
                "The ogre sings a lullaby. Half the bar falls asleep. It's the best night ever.",
                "You sing 'Sweep Me Off My Feet'. Badly. Joyfully. The key change gets a standing ovation."]},
        {id: 'roguelike night', label: 'roguelike night', scene: 'roguelike',
            ask: "we're playing {game} at mine tonight. One keyboard, six backseat drivers. Wanna come?",
            nights: ["You play {game}. You die on level 3 to a newt. Everyone cheers anyway.",
                "Someone yells 'DON'T QUAFF IT!' a second too late. It was a potion of sleeping. The @ naps; the room does too.",
                "Permadeath. Eleven times. Best night of the year.",
                "The goblins cheer every time a goblin on screen lands a hit. Professional solidarity.",
                "You spend twenty minutes naming your dog. It falls down the stairs before you do. You all hold a little funeral."]},
        {id: 'movie night', label: 'movie night', scene: 'movie', ask: "it's movie night! We're watching '{movie}'. I'll make the popcorn.",
            nights: ["'{movie}' is a masterpiece. The ghost cries at the ending. So do you. A little.",
                "Everyone talks through '{movie}'. Nobody knows the plot. It's perfect.",
                "The floating eye doesn't blink once during '{movie}'. It's that good. Or it can't.",
                "You fall asleep halfway through '{movie}'. Someone puts a blanket on you. Cozy."]},
        {id: 'stargazing', label: 'stargazing', scene: 'stars', ask: "we're going stargazing tonight. There's a hole in the roof of the tower. Bring a blanket!",
            nights: ["You lie on a blanket and count shooting stars. You make a wish. It's about the mop.",
                "Someone names a constellation 'The Bucket'. It really does look like a bucket.",
                "The harpy knows the names of all the stars. They made most of them up. They're good names.",
                "Nobody says much. Nobody needs to. It's a very good quiet."]},
        {id: 'fishing', label: 'the underground lake', scene: 'fishing', ask: "we're going fishing at the underground lake tonight. Mostly sitting, a bit of fishing.",
            nights: ["You catch a blind cave fish. It looks at you, sort of. You let it go. It swims off, sort of.",
                "Nobody catches anything. Everybody tells a story about a huge fish. All the stories are lies. Lovely evening.",
                "Something huge brushes your line. You decide, together, not to find out what it was.",
                "You catch an old boot. Inside the boot, a smaller fish. Inside the fish, a ring. You throw it all back."]},
        {id: 'hot springs', label: 'the hot springs', scene: 'springs', ask: "we're heading to the hot springs after work. Very relaxing. The slime has to stay in the shallow end.",
            nights: ["You soak until your fingers wrinkle. The troll's whole body wrinkles. They say it's fine.",
                "The steam smells of minerals and calm. You forget what a mop is for a whole hour.",
                "Somebody brings a rubber duck. It is, mysteriously, the same duck as always.",
                "The naga coils around the warmest rock and starts purring. You didn't know nagas purr."]},
        {id: 'skull bowling', label: 'skull bowling', scene: 'bowling', ask: "we're going skull bowling tonight. Don't worry, the skulls volunteer.",
            nights: ["You bowl a strike! The pins clatter and say 'nice one!'. They're skeletons. They're friendly.",
                "The skull you're bowling with gives you tips. 'More spin.' It works!",
                "You throw nine gutter balls. The skull says it's had worse. You don't ask.",
                "The lich bowls a perfect game. Nobody is surprised. They've had centuries to practise."]},
    ],

    // Some comrades prefer a certain night out.
    FAVOURITE: {Imp: 'barbeque', Balor: 'barbeque', Dragon: 'barbeque', Naga: 'hot springs', Skeleton: 'skull bowling',
        Lich: 'skull bowling', Ghost: 'movie night', Harpy: 'karaoke', 'Floating Eye': 'stargazing'},

    BBQ: {label: null, scene: 'bbq',
        nights: ["The barbeque is so good! Lots of fantastic flamed food!",
            "The barbeque melts when the hellfire gets a bit too warm. You roast marshmallows on the remains though, so it is still good!",
            "Who knew monster fire was better than propane AND charcoal? So good!",
            "The veggie skewers come out perfect. The meat skewers come out as ash. Everyone eats veggie skewers."]},

    planFor: function (id) {
        for (let i = 0; i < this.PLANS.length; i++) {
            if (this.PLANS[i].id == id) {
                return this.PLANS[i];
            }
        }
        return id && id.indexOf('barbeque') >= 0 ? this.BBQ : null;
    },

    // Fills {name} with a made-up name (only when the line has one).
    withName: function (line) {
        return line.indexOf('{name}') >= 0 ? line.replace('{name}', SideName()) : line;
    },

    // Fills {game}, {movie}, {word} and {name} in a plan line.
    fill: function (line) {
        let t = (typeof Game != 'undefined' && Game.convoTags) || {};
        return this.withName(line.replace('{game}', t.dinnerGame || 'NetHack').replace('{movie}', t.dinnerMovie || this.MOVIES[0])
            .replace('{word}', Flavor.rng.getItem(ConversationBuilder.words).toLowerCase()));
    },

    invitation: function (speaker) {
        let fav = this.FAVOURITE[speaker.species];
        let words = ConversationBuilder.words;
        let useFav = fav == 'barbeque' || (fav != null && Flavor.chance(0.6));
        if (fav == 'barbeque') {
            return [
                {text: "Holy heck you cleaned so much! I'm impressed!", any: 1},
                {text: "Hey, I'm hosting a barbeque tonight. Yes, we're using raging hellfire. From me. Wanna come?", y: 2, n: 4},
                {text: Flavor.rng.getItem(words) + "! We can all leave together when you're ready to call it a day!", any: 3,
                    globalTags: {invitationAccepted: true, yendorPoints: 10, dinnerPlan: speaker.name + "'s barbeque", dinnerHost: speaker.name}},
                {text: "Remember, it doesn't need to be spotless! Your health and happiness are way more important than work; call it a day on your own terms!", any: -1},
                {text: "That's alright :) I'll invite you to the next one!", any: 3},
            ];
        }
        let plan = useFav ? this.planFor(fav)
            : this.fresh(this.PLANS, 'plansSeen', function (p) { return p.id; });
        let tags = {invitationAccepted: true, yendorPoints: 10, dinnerPlan: plan.id, dinnerHost: speaker.name,
            dinnerGame: Flavor.rng.getItem(this.ROGUELIKES), dinnerMovie: Flavor.rng.getItem(this.MOVIES)};
        let ask = plan.ask.replace('{game}', tags.dinnerGame).replace('{movie}', tags.dinnerMovie);
        let opener = Flavor.rng.getItem(["Hey! You've done so much cleaning, holy cow!", "Look at this place! It's sparkling!",
            "Wow, I can see my reflection in the floor. Hi, me!", "You've been at it all shift! Okay, listen."]);
        return [
            {text: opener, any: 1},
            {text: "Listen, " + ask + (/\?$/.test(ask) ? "" : " Wanna come?"), y: 2, n: 4},
            {text: Flavor.rng.getItem(words) + "! We'll leave together when you're ready to call it a day!", any: 3, globalTags: tags},
            {text: "Remember, it doesn't need to be spotless! Your health and happiness are way more important than work; call it a day on your own terms!", any: -1},
            {text: "That's alright :) We do something every day; we'll keep you in the loop for future plans!", any: 3},
        ];
    },

    // What happens on a night out: [label, description, scene].
    night: function (planId) {
        let p = this.planFor(planId) || this.PLANS[0];
        let common = ["It's really delightful, and you have a fantastic night with your comrades!",
            "You have a really wonderful evening!", "It's so fun! You are rejuvenated by the fun night!"];
        return {label: p.label || planId, scene: p.scene,
            description: this.fill(Flavor.rng.getItem(common.concat(p.nights)))};
    },

    // ------------------------------------------------------------- a night in
    HOME: [
        {scene: 'home', text: "You have a really relaxing evening at home! You read a book and play some video games."},
        {scene: 'home', text: "You play a few runs of {game} at home. You get further than ever. Then a newt happens."},
        {scene: 'cook', text: "You cook a big pot of soup. Enough for tomorrow's lunch. And the slime's."},
        {scene: 'cook', text: "You bake bread from scratch. It comes out shaped like a mop. Delicious, though."},
        {scene: 'bath', text: "You take a long bath with a rubber duck. Not THE rubber duck. A civilian duck."},
        {scene: 'bath', text: "Bubble bath. Candles. Your mop-arm finally stops aching. Bliss."},
    ],

    homeNight: function () {
        let h = Flavor.rng.getItem(this.HOME);
        return {message: h.text.replace('{game}', Flavor.rng.getItem(this.ROGUELIKES)), scene: h.scene};
    },
};

if (typeof module !== 'undefined') module.exports = Visits;
