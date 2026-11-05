var ConversationBuilder = {
    usedGenericOptions:[],
    idleOptions: ["is vaping.","is enjoying a relaxing drink.","is reading a book.","is having a coffee.","is eating an apple.",
        "is doing a crossword. Seven down: 'hero's least favourite chore'. Eight letters.","is painting a tiny miniature of themselves.",
        "is rolling a d20 over and over, waiting for a 20.","is knitting a scarf for a hydra. All of the necks.",
        "is reading 'Dungeons on a Budget'.","is napping with one eye open.","is doing gentle stretches after a hard night of fainting.",
        "is reorganising their pocket lint by colour.","is reading the security log and laughing.","is writing fan fiction about the janitor.",
        "is sipping tea with the pinky out.","is teaching a newt to fetch."],
    partyOptions: ["is vaping.","is enjoying a relaxing drink.","is dancing.","is headbanging.","is doing the robot. Badly.",
        "is starting a conga line.","is air-guitaring on a mop.","is singing karaoke into a turkey leg."],
    words: ['Wicked','Sweet','Awesome','Tubular','Mondo','Heinous','Excellent','Epic','Metal','Hardcore',
        'Radical','Natural 20','Splendid','Righteous','Gnarly','Critical'],
    buildConvos: function(speaker,party=false) {
        speaker.playerTalkedToday=false;
        var newConversation;
        if (!party) {
            newConversation = [[{action: ROT.RNG.getItem(this.idleOptions),any:-1}]];
        }
        else {
            newConversation = [[{action: ROT.RNG.getItem(this.partyOptions),any:-1}]];
        }

        let specificConvo = this.specificConvo(speaker);

        if (specificConvo != null) {
            newConversation.push(specificConvo);
        }
        else if (speaker.friends.length>0 && 0.2 > ROT.RNG.getUniform()) {
            let friend=ROT.RNG.getItem(speaker.friends);
            newConversation.push(this.loveMyFriend(friend));
        }
        else {
            newConversation.push(this.randomGeneric(speaker,party));
        }

        //return newConversation;
        if (speaker.damagedealt>=4) {
            newConversation.push(this.lottaDamage(speaker));
        }
        else if (speaker.damagedealt<=1 && ROT.RNG.getUniform()>0.8) {
            newConversation.push(this.noDamage(speaker));
        }
        //newConversation.push(this.impressed());

        if (speaker.questItem != null && !('questItemSuccess' in speaker.convoTags)) {
            this.searchQuestConvo(newConversation,speaker);
        }

        if (party) {
            let partyRoomDiscovery=[
                {text:"Welcome to the %c{#f0f}Secret Party room%c{}!",any:1,conditions:{foundPartyRoom:false}},
                {text:"This used to be where we held union meetings...",any:2},
                {text:"But since overthrowing the boss, we can have those meetings publicly instead!",any:3},
                {text:"We've still got this room though so, now we use it to party!",any:4},
                {text:"Hang out and dance for a while :)",any:-1,globalTags:{foundPartyRoom:true}}
            ];
            newConversation.push(partyRoomDiscovery);
        }

        // now and then, a hint about an easter egg (at most one per conversation;
        // before the request offer, which must be heard first)
        if (!party && typeof EasterEggs != 'undefined' && Flavor.chance(0.3)) {
            let hint = EasterEggs.pickHint();
            if (hint != null) {
                newConversation.push([{text: hint, any: -1}]);
            }
        }

        delete speaker.convoTags.request;
        delete speaker.convoTags.requestThanked;
        delete speaker.convoTags.offerSeen;
        if (!party) {
            Requests.offer(speaker, newConversation);
        }

        if (!speaker.metPlayer) {
            newConversation.push(this.meetingPlayer(speaker));
        }
        speaker.convos=newConversation;
        speaker.lastDay = Game.day;
    },
    
    lostLines: [
        "Oh dang I lost my {item}! Can you help me find it?",
        "Have you seen my {item}? The hero knocked it out of my hands and it went... somewhere!",
        "I rolled a 1 on my Dexterity save and dropped my {item}. Keep an eye out for it?",
        "My {item} is gone! I think it's in the dungeon. Unless a mimic ate it. Please let it not be a mimic.",
        "Psst. I lost my {item} last night. It has sentimental value. And a name. Don't ask its name.",
    ],
    foundLines: [
        "You found my {item}! Thank you so much ^.^",
        "MY {item}! You're the best janitor in the multiverse!",
        "You found my {item}! I'd hug you but I'm still a bit ketchupy.",
        "Ahh, my {item}! I owe you one. No, two. No, a whole d20's worth.",
    ],

    searchQuestConvo: function(newConversation, speaker) {
        let item = speaker.questItemName;
        var findConvo=[
            {text:ROT.RNG.getItem(this.lostLines).replace('{item}', item),any:-1,conditions:{questItemGot:false},tags:{questHeard:true}}
        ];
        var gotConvo = [
            {text:ROT.RNG.getItem(this.foundLines).replace('{item}', item),any:-1,conditions:{questItemGot:true},tags:{questItemSuccess:true},globalTags:{yendorPoints:50}}
        ];
        if (speaker.questItemName.toLowerCase() == 'favourite hat') {
            gotConvo[0].any=1;
            gotConvo.push({
                action: "puts on their favourite hat.",any:2,tags:{wearingHat:true}
            });
            gotConvo.push({
                text: "Fits just as well as always :D",any:-1
            })
        }
        newConversation.push(findConvo);
        newConversation.push(gotConvo);
    },

    specificConvo: function(speaker) {
        if (speaker.playerInteractions > 1) {
            if ('wantsCareer' in speaker.convoTags && !('appliedToSchool' in speaker.convoTags)) {
                var newConvo= [
                    {text: "So, I've been thinking of applying to Monster School to become a "+speaker.convoTags.wantsCareer+"!",any:1},
                    {text: "This application is huge though, holy frig.",
                        "Dang, that sucks. Thoughts and prayers, friend.":2,
                        "You can do it! Maybe other folks in the dungeon could help out?":3,
                        "Hey, I bet I could help out!":4,
                    },
                    {text:"Thanks! With the power of thoughts and prayers I'm certain this will work out!",any:-1,tags:{appliedToSchool:false}},
                    {},
                    {text:"Hey, thanks so much! Here's my cover letter, let me know what you think!",any:5},
                    {message:"You read the paper...",any:6},
                    {message:"Dear Monster School,",any:7},
                    {message:"All my life, I have lived here, deep in a dungeon.",any:8},
                    {message:"All that time, I have yearned to be a "+speaker.convoTags.wantsCareer+".",any:9},
                    {message:"Please accept me to Monster School.",any:10},
                    {message:"Sincerely, "+speaker.name,any:11},
                    {text:"So, what do you think??","It's good!":12,"It could use some work.":12},
                    {text:"Thanks for your opinion!! I'll keep at it and let you know when I hear back :)",any:-1,tags:{appliedToSchool:true},globalTags:{yendorPoints:50}},
                ];
                if (speaker.friends.length>0) {
                    newConvo[3] = {text:"Yeah! My good friend "+ROT.RNG.getItem(speaker.friends)+" will help for sure!",any:-1,tags:{appliedToSchool:true}};
                }
                else {
                    newConvo[3] = {text:"Hmm... yeah? Maybe I can ask around. Thanks!",any:-1,tags:{appliedToSchool:false}};
                }
                return newConvo;
            }
            if ('depression' in speaker.convoTags && !('depressionConvoA' in speaker.convoTags)) {
                var newConvo = [{
                                    text: "How've you been doing today, friend?",
                                    "I'm doing pretty well today!":1,
                                    "Ehh, I've been better, but I'm alright.":2,
                                    "Honestly, having a rough time today.":3,
                                },
                                {text:"I'm glad to hear that :D!",any:4},
                                {text:"That's real. I'm glad you're doing alright, though :)",any:4},
                                {text:"Oof. I'm sorry to hear that. I'm having a rough time, too. My anxiety is through the roof.",any:5},
                                {text:"I'm having a hard time today. My anxiety is through the roof.",any:5},
                                {text:"Is it okay if I talk about it?",y:7,n:6},
                                {text:"That's legit! Maybe we can chat another time :)",any:-1},
                                {text:"I'm terrified I'll just never amount to anything, and nothing I do will ever matter.",any:8},
                                {text:"And like... what if other folks in the dungeon are only pretending to be nice to me?",any:9},
                                {
                                    text:"I'm not sure if I'm making sense.",
                                    "You're totally making sense. I feel that way sometimes too.":12,
                                    "I'm not sure, but your feelings are real and I'm here for you.":12,
                                    "Maybe you should vape some more?":10,
                                    "Have you tried not worrying about things?":11
                                },
                                {text:"Hmm. I already vape a lot, but I'll try to vape even more!",any:-1,tags:{depressionConvoA:false}},
                                {text:"Uh. Yes. Constantly? Nevermind.",any:-1,tags:{depressionConvoA:false},globalTags:{yendorPoints:-20}},
                                {text:"That's comforting to hear.",any:13},
                                {text:"Thank you for listening, friend ^.^",any:-1,tags:{depressionConvoA:true},globalTags:{yendorPoints:50}}
                            ];
                return newConvo;
            }
        }
        if (speaker.playerInteractions>2) {
            if ('wantsCareer' in speaker.convoTags && 'appliedToSchool' in speaker.convoTags && !('careerConcluded' in speaker.convoTags)) {
                if (speaker.convoTags.appliedToSchool) {
                    return [
                        {text:"Hey! Guess what??",any:1},
                        {text:"I got accepted to Monster School!!",any:2},
                        {text:"I'm gonna take some classes and then become a professional "+speaker.convoTags.wantsCareer+"!",any:3},
                        {text:"I'm so excited! Thank you so much for your help!",any:-1,tags:{careerConcluded:true},globalTags:{yendorPoints:50}},
                    ];
                }
                else {
                    return [
                        {action:"wipes away tears.",any:1},
                        {text:"I didn't get into Monster School :(",any:2},
                        {text:"I'm disappointed, but I've got a good gig here. Life goes on and all that.",any:-1,tags:{careerConcluded:false}},
                        //{text:"I can still do "+speaker.convoTags.wantsCareer+" stuff as a hobby! I think that will be enough.",any:-1,tags:{careerConcluded:false}},
                    ];
                }
            }
        }
        if (speaker.playerInteractions > 0) {
            if ('wantsCareer' in speaker.convoTags) {
                if (speaker.convoTags.wantsCareer == 'painter' || speaker.convoTags.wantsCareer == 'artist' || speaker.convoTags.wantsCareer == 'interior designer') {
                    if (ROT.RNG.getUniform() > 0.5) {
                        speaker.convoTags.wantsToPaint = true;
                    }
                    if ('wantsToPaint' in speaker.convoTags && speaker.convoTags.wantsToPaint) {
                        return [
                            { text: "Hmm... I've been thinking, the colors on these walls are getting kind of old!", any: 1 },
                            { text: "Do you think I should repaint the dungeon?", y: 2, n: 9 },
                            {
                                text: "Heck yeah! What colour do you think I should go with?",
                                "How about a nice dark purple?": 3,
                                "Let's make everything red!": 4,
                                "Hmm... Let's make it green!": 5,
                                "Blue, like the sky!": 6,
                                "Let's make it a nice golden yellow!": 7,
                                "Honestly, it's rustic, but I like the classic colours!": 8,
                                globalTags:{yendorPoints:20}
                            },
                            { text: "Heck yeah! I'll have the dungeon purple by tomorrow :D", any: -1, globalTags: { paint: 'purple' } },
                            { text: "Bold! I like it. The dungeon will be red by tomorrow!", any: -1, globalTags: { paint: 'red' } },
                            { text: "How vibrant! I'll paint it green overnight tonight :D", any: -1, globalTags: { paint: 'green' } },
                            { text: "Nice! Good way to make the inside feel outdoorsy. Blue, coming up!", any: -1, globalTags: { paint: 'blue' } },
                            { text: "I like it! The dungeon will be yellow by tomorrow :D", any: -1, globalTags: { paint: 'yellow' } },
                            { text: "Fair! Sometimes, classic really is the best! I'll have it painted tomorrow :)", any: -1, globalTags: { paint: 'default' } },
                            { text: "Fair! I just wanna practice on something... let me know if you change your mind!", any: -1 }
                        ];
                    }
                }
            }
        }
        return null;
    },

    randomGeneric: function(speaker) {
        //let option = Math.floor(ROT.RNG.getUniform() * 10);
        let possibilities=[
            [
                "It's nice to relax after a long day in the dungeon!"
            ],
            [
                "Sometimes you're in a really remote room in the dungeon...",
                "It takes forever for the adventurer to show up!",
                "It's alright though. It's relaxing to hang out for a bit."
            ],
            [
                "Adventuring is the biggest industry in dungeons. It's like tourism, but more fun."
            ],
            [
                "Psst, don't tell adventurers, but all that 'blood' is just watered down ketchup.",
                "Real violence is a strict violation of workplace safety regulations!"
            ],
            [
                "Golly I could go for a hot cup of coffee right about now."
            ],
            [
                "Dang I love fighting adventurers!"
            ],
            [
                "The dungeon is run as a workers co-op.",
                "We used to have a Boss but... well, let's just say these teeth and claws aren't just for show!",
                "I don't know about you, but I for one think things run a lot better when there's no bosses!"
            ],
        ];
        if (Game.unionist != null && Game.unionist != speaker.name) {
            possibilities.push([
                "This dungeon used to have a really bad boss. They were a mean wizard who hoarded wealth and kept docking our pay.",
                "At some point, it got to be too much.",
                Game.unionist+" set up a meeting, we started working together as comrades, and we overthrew the boss!",
                "After all, there were many more of us, and money can't save you from the teeth and claws of organized monsters!",
                "These days, we run the dungeon as a workers co-op. Everyone who is a part of the dungeon has a say, and everyone reaps the rewards!"
            ]);
        }
        if ('big' in speaker.tags) {
            possibilities.push([
                "When you're a big monster like me, it's sometimes hard to move around.",
                "When you think about it, dungeons are pretty cramped, underground spaces!",
                "Luckily, for a "+speaker.species.toLowerCase()+", I'm pretty good at squeezing through hallways."
            ]);
            possibilities.push([
                "With long limbs like mine, it's pretty easy to reach things that are really high up.",
                "Smaller monsters sometimes can't reach things. And, you know what? That's okay!",
                "I'm always happy to help my friends out!"
            ]);
            possibilities.push([
                "I'm huge, which means I have huge guts, and a huge appetite!",
                "Luckily, we have very generous and flexible lunch breaks here.",
                "Always take your lunch break! Nothing is more important than your health!"
            ]);
        }
        if ('small' in speaker.tags) {
            possibilities.push([
                "When I first started working here, it was intimidating to work with some pretty huge monsters.",
                "I'm really small, and they're really big! Honestly I was afraid they would crush me by accident.",
                "But in my time here I've learned...",
                "They're all a bunch of softies!",
                "You know what they say: The biggest monsters also have the biggest hearts!"
            ]);
            possibilities.push([
                "This dungeon is full of little nooks and crannies. I love trying to fit into them."
            ]);
        }
        if (speaker.species=='Myconid') {
            possibilities.push([
                "Sorry about the spores. When I get excited I just... puff.",
                "And heroes make me VERY excited.",
                "Don't worry, they're the friendly kind of spores. Mostly."
            ]);
            possibilities.push([
                "I'm a fungus, so technically I'm a fun guy.",
                "...",
                "Nobody ever laughs at that one."
            ]);
        }
        if (speaker.species=='Harpy') {
            possibilities.push([
                "Did the hero get any feathers on you? Sorry, I moult when I'm stressed.",
                "And throwing feathers at adventurers is VERY stressful.",
                "Honestly it's mostly for the drama."
            ]);
            possibilities.push([
                "I sing in the dungeon choir on weekends!",
                "Adventurers say our singing is 'deadly'. I choose to take that as a compliment."
            ]);
        }
        if (speaker.species=='Mimic') {
            possibilities.push([
                "Please don't tell anyone I'm not actually a treasure chest.",
                "Oh. You already knew? Was it the drool?",
                "It's always the drool."
            ]);
            possibilities.push([
                "Being a mimic is all about patience. You wait, and wait, and wait...",
                "And then the hero opens you and you go BLAAAH and they scream!",
                "Best part of my day, every day."
            ]);
        }
        if (speaker.species=='Skeleton') {
            possibilities.push([
                "Have you seen my left femur? I think the hero knocked it loose.",
                "It's fine, I have a spare. Somewhere.",
                "Being a skeleton means you're never really missing anything for long."
            ]);
            possibilities.push([
                "People think skeletons are spooky, but I'm really just a big softie.",
                "Well. A big hardie. I have no soft parts at all, actually.",
                "But emotionally! Emotionally I'm soft."
            ]);
        }
        if (speaker.species=='Ghost') {
            possibilities.push([
                "Ectoplasm is SO hard to get out of carpets. Sorry in advance.",
                "Good thing the dungeon has stone floors!",
                "...you might need a few goes at it, though."
            ]);
            possibilities.push([
                "I haunted this dungeon before it was cool.",
                "Now I'm in the union! Ghosts get dental, too. Not that I need it."
            ]);
        }
        if (speaker.species=='Slime') {
            possibilities.push([
                "Sorry about the trail. I can't help it, I'm about 90% goo.",
                "I tried wearing socks once. It did not go well.",
                "Watch your step around my puddles, they're slippery!"
            ]);
        }
        if (speaker.species=='Hydra') {
            possibilities.push([
                "Hey, pull my head ;)",
                "OH NO OH FRIG YOU PULLED ONE OF MY HEADS OFF",
                "Hahaha just kidding, I've got like a dozen.",
                "When you're a hydra you get to have some fun party tricks."
            ]);
        }
        if ('rangeMess' in speaker.tags && speaker.tags.rangeMess=='Scorch') {
            possibilities.push([
                "Do I like fire? Yes of course.",
                "But does that mean I like to just burn things, willy nilly?",
                "...also yes."
            ]);
        }

        if (speaker.species=='Imp' || speaker.species=='Balor') {
            possibilities.push([
                "The best thing about being a demonic being of eternally burning flame?",
                "I always host the BEST barbeques.",
                "Next time I have one, I'll invite you!"
            ]);
        }

        if (speaker.species=='Naga') {
            possibilities.push([
                "Being a cold blooded snake monster is tough sometimes.",
                "It gets so cold! Folks never seem to have the heat turned up enough.",
                "Make sure you close doors behind you. It gets so drafty in here sometimes."
            ]);
            possibilities.push([
                "Spitting acid is fun. It is pretty messy though.",
                "On the bright side, it kills just about any bacteria that might be growing on a surface?",
                "I haven't been sick in at least a few decades."
            ]);
        }

        // the new staff
        if (speaker.species=='Newt') {
            possibilities.push([
                "Every hero who meets me thinks the same thing: 'You kill the newt!'",
                "But I don't die! I faint! With dignity!",
                "One hit point, a hundred percent heart."
            ]);
            possibilities.push([
                "Being the smallest monster in the dungeon has perks.",
                "Nobody ever expects me to carry anything heavy.",
                "And I fit in the snack cupboard. Shh."
            ]);
        }
        if (speaker.species=='Fruit Bat') {
            possibilities.push([
                "Sorry about the fruit pits. I eat when I'm nervous.",
                "And I'm nervous when there's a hero. And when there isn't. So, always.",
                "Want a fig? I have like forty."
            ]);
            possibilities.push([
                "I hang upside down to relax. Gets the blood to the brain.",
                "Best ideas I ever had, I had upside down."
            ]);
        }
        if (speaker.species=='Floating Eye') {
            possibilities.push([
                "Fun fact: I'm the security camera. Well, my cousin is. I'm the backup.",
                "I see everything. EVERYTHING. You missed a spot in the east corridor, by the way.",
                "Not judging! Just observing."
            ]);
            possibilities.push([
                "Heroes have a rule: never melee a floating eye.",
                "Every single one of them breaks it.",
                "I've started keeping a tally. I need a bigger wall."
            ]);
        }
        if (speaker.species=='Leprechaun') {
            possibilities.push([
                "I'm the co-op treasurer! Every zorkmid accounted for.",
                "The pot at the end of the rainbow? Savings account. Very good interest.",
                "Heroes keep trying to steal it. Joke's on them, it's direct deposit now."
            ]);
            possibilities.push([
                "When a hero hits me I drop a few coins. It's in my contract.",
                "Keep what you find, love. Consider it a tip. You've earned it."
            ]);
        }
        if (speaker.species=='Cockatrice') {
            possibilities.push([
                "People are SO scared of me. One little petrification incident...",
                "Okay, forty-two incidents. But they're all statues now and they look great!",
                "Kidding. Kidding! I'm on stone-free duty. HR made me sign a thing."
            ]);
            possibilities.push([
                "If you find any of my eggs lying around, wear gloves.",
                "You wear gloves for mopping anyway, right? Good janitor."
            ]);
        }
        if (speaker.species=='Gelatinous Cube') {
            possibilities.push([
                "I'm a gelatinous cube! Basically a walking lost and found.",
                "If you've lost anything in the last six months, it's probably inside me.",
                "Sorry. I'll cough it up eventually."
            ]);
            possibilities.push([
                "People think cubes are boring. Four corners, six sides, no personality.",
                "But I contain multitudes! Mostly boots. But multitudes!"
            ]);
        }
        if (speaker.species=='Unicorn') {
            possibilities.push([
                "In other dungeons, heroes throw gems at unicorns to make friends.",
                "Here I throw worthless glass back at them. It's called boundaries.",
                "Also glitter. Sorry about the glitter. It just... happens around me."
            ]);
            possibilities.push([
                "I'm co-aligned with everyone in this dungeon. That's the co-op spirit!",
                "Except Kevin. Kevin and I have a complicated alignment."
            ]);
        }
        if (speaker.species=='Lich') {
            possibilities.push([
                "I was a librarian for three hundred years before I became undead.",
                "Then I was an undead librarian for three hundred more.",
                "Now I'm in the dungeon book club. It's the most exciting thing I've ever done."
            ]);
            possibilities.push([
                "Everyone asks where my phylactery is.",
                "It's my coffee mug. 'World's Okayest Lich'. If it breaks, I'm done for. So I never wash it.",
                "...Please don't wash it."
            ]);
        }
        if (speaker.species=='Goblin') {
            possibilities.push([
                "Goblins get a bad rap. Stabby, sneaky, smelly.",
                "I'm only stabby on weekdays. Weekends I bake.",
                "My scones are famous in three dungeons."
            ]);
            possibilities.push([
                "Did you know goblins invented the dungeon break room?",
                "Before us, everyone just took naps in treasure chests. Mimics HATED that."
            ]);
        }
        if (speaker.species=='Kobold') {
            possibilities.push([
                "Kobolds love traps! Every trap in this dungeon? We built them. With love.",
                "The whoopee cushion one was my idea. Proudest day of my life.",
                "If you find one sprung, re-arm it, would you? For art."
            ]);
            possibilities.push([
                "In another dungeon, kobolds worship dragons.",
                "Here we just play dice with one on Thursdays. Much healthier."
            ]);
        }
        if (speaker.species=='Ogre') {
            possibilities.push([
                "Ogres are like onions. We have layers.",
                "...Wait, that might be a different thing. Copyright. Never mind.",
                "Ogres are like lasagna. Also layers. Also delicious."
            ]);
        }
        if (speaker.species=='Troll') {
            possibilities.push([
                "Trolls regenerate. Cuts, bruises, bad moods. All gone by lunch.",
                "Only thing that doesn't regenerate is my patience for heroes who don't wipe their boots."
            ]);
        }
        if (speaker.species=='Balor') {
            possibilities.push([
                "Big, red, on fire, wings. I know. Very scary.",
                "I volunteer at the cave-kitten shelter on weekends.",
                "The kittens like me because I'm warm."
            ]);
        }

        // a little multiverse gossip, from anyone
        possibilities.push([
            "Have you ever been to Caves of Qud? Lovely place. Very crabby. Lots of crabs, I mean.",
            "There, you greet people with 'Live and drink'. And you pay in water!",
            "Here we pay in zorkmids. Water just makes a mess. Ask the janitor. Ask yourself, I mean."
        ]);
        possibilities.push([
            "My cousin works in Brogue. He's a monkey. Steals one thing per hero, then runs.",
            "He says it's not about the item. It's about the thrill.",
            "He's in therapy now."
        ]);
        possibilities.push([
            "I did an exchange semester in the Complex. Cogmind territory. All robots.",
            "Nice folks! Lost a few of my parts. They found most of them.",
            "That's why my left arm beeps sometimes."
        ]);
        possibilities.push([
            "Do you play Crawl? Dungeon Crawl Stone Soup?",
            "Every time I get used to a feature, the devs remove it. For balance!",
            "I respect it. Honestly I wish I could remove Mondays for balance."
        ]);
        possibilities.push([
            "You know what I love about procedural generation?",
            "Every morning the dungeon is different, but the coffee machine is always in the same place.",
            "That's the real hand-crafted content."
        ]);
        possibilities.push([
            "Rogue, the very first one, had no janitor at all.",
            "The levels just... reset. Clean. Every time.",
            "Lazy, if you ask me. We do it properly here."
        ]);
        possibilities.push([
            "I tried playing a tabletop campaign once. I was a level 3 Accountant.",
            "My special ability was 'Audit'. The DM hated it.",
            "Best session ever."
        ]);
        possibilities.push([
            "Sometimes I think about how all of this is decided by the RNG.",
            "Who gets hit, who faints, which room floods...",
            "And then I think: well, the RNG hired you, and that worked out great!"
        ]);
        possibilities.push([
            "Is it weird that I like the sound of a mop?",
            "Swish, swish. It's very calming. Like rain, but cleaner."
        ]);
        possibilities.push([
            "The best part of a raid is the morning after.",
            "Coffee, a little stretch, and someone nice tidying up while we tell stories.",
            "That someone is you! Thanks for being the someone."
        ]);
        possibilities.push([
            "I keep a list of every hero who ever kicked my door.",
            "It's a long list. It's mostly kickers.",
            "One of them knocked once. I think about them a lot."
        ]);
        possibilities.push([
            "If you ever feel overwhelmed, just mop one tile.",
            "Then another. Before you know it, it's a whole room!",
            "That's how I do everything. Even fainting."
        ]);

        if (speaker.playerInteractions>1 && Game.yendorPoints>1000) {
            possibilities.push([
                "You do a lot of really good work around here. I'm impressed!",
                "Remember to take a break now and then!",
            ]);
        }

        if (speaker.playerInteractions>0) {
            possibilities.push([
                "There's a few secret rooms in the dungeon. Try to find them!",
                "One of them is a VERY good place to party."
            ]);
            possibilities.push([
                "I'm really glad you started working here!"
            ]);
            possibilities.push([
                "I really appreciate all the work you do here!"
            ]);
            if (speaker.species != 'Hydra') {
                possibilities.push([
                    "We fight adventurers, but it's more like really intense LARPing.",
                    "Monsters are never severely injured; sometimes we're a little sore.",
                    "Hydras lose a few heads but that's kind of like a haircut for them so, it's fine?",
                    "Adventurers want as authentic an experience as they can get, but we never actually kill them.",
                    "We beat them up and take their money to fund the dungeon, and they just keep returning!"
                ]);
            }
            else {
                possibilities.push([
                    "I lose heads all the time.",
                    "People think each head has their own brain and they get lost every time...",
                    "But that's silly!",
                    "The truth is: Hydra brains are stored in the bones."
                ]);
            }
            if (speaker.species == 'Dragon') {
                possibilities.push([
                    "I have a treasure hoard at home that I like to sleep on.",
                    "I'm not a rich dragon, though. No, my hoard consists of stuffed animals, anime, and dice."
                ]);
                possibilities.push([
                    "I love table top roleplaying!",
                    "My favourite game is Offices and Humans.",
                    "My best character is a level 12 Receptionist named Mx. Drizzle Snapper!",
                    "They're chaotic good which means they like to steal office supplies and give them to school children."
                ]);
                possibilities.push([
                    "I've got a HUGE dice collection.",
                    "I live in a warehouse, because I'm so big, and I sleep on a pile of dice that fills half of it.",
                    "It's my hoard ^.^"
                ]);
            }
        }

        if (speaker.playerInteractions>1) {
            possibilities.push([
                "I worked some pretty friggin bad jobs before I got this one.",
                "Capitalism does its damnedest to make us all miserable.",
                "Makes you think your worth is tied into how well you do your job, and nothing else.",
                "Well nuts to that! You're awesome for your own sake! We all are!",
                "Financial circumstance might mean you have to do a bad job, but never forget:",
                "You're more than whatever job you have to do to survive."
            ]);
            possibilities.push([
                "One perk of this place is the excellent medical benefits.",
                "We're pretty safe with our fighting, but you still get bumped around a fair bit. Injuries happen.",
                "As such, our health plan pretty much covers everything.",
                "Including trans healthcare!",
                "All healthcare should be free, and trans rights are human rights!"
            ]);
        }
        
        if (speaker.playerInteractions>2) {
            possibilities.push(["Trans Rights!"]);
            possibilities.push([
                "Honestly life, and the world, are pretty scary sometimes.",
                "But we've got each other, and one way or another, we're going to make it through!",
                "Come hang out with me any time you want to :)"
            ]);
        }


        if (speaker.playerInteractions>3 && Game.yendorPoints<200) {
            possibilities.push([
                "Wow! You've been here for several days and...",
                "Havn't done much cleaning?",
                "Honestly, that's fine though.",
                "From each according to their ability, and to each according to their needs!",
                "I think you're a hella cool person and I don't mind!!"
            ]);
        }

        let fancyOptions=3;
        var toReturn;
        var option;
        let breaker=0;
        do {
            option = Math.floor(ROT.RNG.getUniform() * (possibilities.length + fancyOptions));

            if (!('careerChange' in speaker.tags)) {
                if (option == 2) {
                    option += Math.floor(ROT.RNG.getUniform() * (possibilities.length)) + 1;
                }
            }
            else {
                if (!('wantsCareer' in speaker.convoTags)) {
                    //if (ROT.RNG.getUniform())
                    option = 2;
                }
            }
            switch (option) {
                case 0:
                    toReturn = [{ text: "Hey friend, want to vape with me?", y: 1, n: 2 },
                    { action: "passes you their vape. It's nice!", any: -1 },
                    { text: "Legit! Nobody should make you feel bad for saying no :)", any: -1 },
                    ];
                    break;
                case 1:
                    toReturn = [{ text: "Gee whiz I love dogs. And cats. Humans have good taste in critters.", any: 1, conditions: { animal: false } },
                    { text: "What's your favourite type of critter?", "I love cats!": 2, "Dogs are good and I like to pet them!": 3, "Rabbits are great!": 4, "Rats are my favourite!": 5, "I love horses. Neigh!": 6, "I'm not really an animal person...": 7 },
                    { text: "Wow! Cats! Me too!", any: -1, globalTags: { animal: 'cat' } },
                    { text: "Wow! Dogs! Me too!", any: -1, globalTags: { animal: 'dog' } },
                    { text: "Wow! Rabbits! Me too!", any: -1, globalTags: { animal: 'rabbit' } },
                    { text: "Wow! Rats! Me too!", any: -1, globalTags: { animal: 'rat' } },
                    { text: "Wow! Horses! Me too!", any: -1, globalTags: { animal: 'horse' } },
                    { text: "That's legit! More for me to cuddle myself, then!", any: -1, globalTags: { animal: 'none' } },
                    ];
                    break;
                case 2:
                    let other;
                    if ('wantsCareer' in speaker.convoTags) {
                        other = speaker.convoTags.wantsCareer;
                    }
                    else {
                        let otheropts = ["chef", "web developer", "game developer", "painter", "artist", "dancer", "musician", "doctor", "vet", "nurse", "interior designer"];
                        other = ROT.RNG.getItem(otheropts);
                    }
                    toReturn = [{ text: "Being a dungeon monster is fun but I'd love to be a " + other + " someday.", any: -1, tags: { wantsCareer: other } }];
                    break;
                default:
                    option -= fancyOptions;
                    var newConvo = [];
                    for (let i = 0; i < possibilities[option].length; i++) {
                        var next = { text: possibilities[option][i] };
                        if (i < (possibilities[option].length - 1)) {
                            next.any = (i + 1);
                        }
                        else {
                            next.any = -1;
                        }
                        newConvo.push(next);
                    }
                    //console.log(newConvo);
                    toReturn = newConvo;
            }
            breaker++;
        } while (breaker < 20 && this.usedGenericOptions.indexOf(toReturn[0].text)>=0);
        this.usedGenericOptions.push(toReturn[0].text);

        return toReturn;
    },

    meetingPlayer: function(speaker) {
        let parts=speaker.name.split(' ');
        let firstName=parts[0];
        let name=speaker.name;
        let greetings=[
            "Hey! Don't think we've met. My name is "+firstName+". "+name+"!",
            "Ahoy, I'm "+name+"! How do you do?",
            "Hi! I'm "+firstName+"! It's always nice to see a new face :)",
            "It's me! "+name+"!",
            "Good morning and welcome to the dungeon! I'm "+name+", but you can just call me "+firstName+".",
            "Hey there! My name is "+name+". It's nice to meet you!",
            "Oh! The new janitor! I'm "+firstName+". I faint on the left side of the hall, mostly.",
            "Hello, hello! "+name+", level "+(speaker.level || 1)+", lawful cozy. Nice to meet you!",
            "Welcome aboard! I'm "+firstName+". If anyone asks, I was VERY scary last night.",
            "Hi! "+name+" here. Don't mind the ketchup, it's from work.",
            "*rolls a d20* Seventeen! That's a good first impression. Hi, I'm "+firstName+"!",
        ];
        return [{text:ROT.RNG.getItem(greetings),any:-1}];
    },

    loveMyFriend: function(friend) {
        let phrases=[
            friend+" and I go way back! We started working here around the same time, too.",
            "Nothing beats just sitting back and defending some treasure with my pal, "+friend+"!",
            "My friend, "+friend+", has such a good sense of humor.",
            "We defend a lot of treasure here, but the best treasure of all is my friend "+friend+"!",
            friend+" taught me how to faint properly. Knees first, then a little sigh.",
            "Me and "+friend+" are starting a band. We're called The Random Number Generators.",
            friend+" always saves me the good chair in the lounge. That's friendship.",
            "If "+friend+" were a dice, they'd be a natural 20. Every time.",
            "Last night "+friend+" took a hit meant for me. Well, the ketchup did. Still counts!",
        ];
        return [{text:ROT.RNG.getItem(phrases),any:-1}];
    },

    noDamage: function(speaker) {
        let openPhrases=["Dang, didn't even get one hit in today!","That adventurer was pretty good!","Haha I was just hanging out vaping and this adventurer came from nowhere.","Wowzers I got walloped today.",
            "I rolled a 1. Then another 1. The dice hate me today.","I swung, I missed, I fainted. In that order. Very fast.","The hero didn't even notice me. I was RIGHT THERE."];
        let closePhrases=["Sometimes you have a rough day, but it's alright! Tomorrow will friggin rule!","You get knocked down, but you just have to get back up again!","Rough days happen but I still love working here!","Next time the adventurer won't be so lucky!",
            "The RNG giveth, the RNG taketh away. Tomorrow it giveth again!","At least my fainting was on point. Ten out of ten fainting."];
        //let option = Math.floor(8*ROT.RNG.getUniform());
        var conversation=[{text:ROT.RNG.getItem(openPhrases),any:1},
            {text:ROT.RNG.getItem(closePhrases),any:-1}
            ];
        if (ROT.RNG.getUniform()>0.5 && !('depression' in Game.convoTags)) {
            conversation[1].any=2;
            conversation.push({text:"Do you ever have rough days?",y:3,n:6});
            conversation.push({text:"That's real. Me too, friend.",any:4,globalTags:{yendorPoints:20,depression:true},tags:{depression:true}});
            conversation.push({text:"Listen, if you ever need someone to talk to, or like... vape with?",any:5});
            conversation.push({text:"I'm right here with ya.",any:-1});
            conversation.push({text:"I'm really glad to hear that, friend!",any:7,globalTags:{depression:false}});
            conversation.push({text:"You're a cool person and you do a heck of a lot. You deserve to be happy!",any:-1});

            conversation[0].conditions={depression:false};
        }
        return conversation;
    },

    lottaDamage: function(speaker) {
        let openPhrases=["Haha! I walloped that adventurer!","That adventurer didn't see me coming :)","We really beat that adventurer up!","Most of that 'blood' out there wasn't from monsters, I'll tell you that much :D","That adventurer got WRECKED.","You should've seen the look on the adventurer's face when they met me!",
            "Natural 20 after natural 20! I was ON FIRE last night!","The hero had to quaff THREE potions because of me. Three!","I made the hero save-scum. That's the highest compliment in this business."];
        let closePhrases=["They made it through, but they had to work extra hard to get by me!","Days like today remind me why I love this job!","These teeth and claws aren't just for show, you know!","You look pretty tough yourself; I bet you'd wipe the floor with them if you joined us someday!","I reckon you'd kick some butt too if you were there :)"];
        if (speaker.friends.length>0) {
            let friend = ROT.RNG.getItem(speaker.friends);
            closePhrases.push("I think my favourite part was teaming up on them with my good pal "+friend+"!");
            closePhrases.push(friend+" threw some dang good punches too!");
            closePhrases.push(friend+" and I make a really good team! We all do, honestly! You included!!");
            openPhrases.push("Dang, me and "+friend+" gave that adventurer a rough time!");
        }
        if ('ranged' in speaker.tags) {
            if (speaker.tags.rangeMess == 'Scorch') {
                openPhrases.push("I burned that adventurer something fierce!");
                openPhrases.push("That adventurer was looking pretty crispy by the time I was through with them!");
                openPhrases.push("Gosh darn I just LOVE toasting adventurers.");
                openPhrases.push("Fire's good. Fire from me is even better :)");
            }
            else if (speaker.tags.rangeMess == 'Ectoplasm') {
                openPhrases.push("I slimed that adventurer good! Ectoplasm everywhere!");
                openPhrases.push("Boo! That's all it took. They jumped SO high.");
            }
            else if (speaker.tags.rangeMess == 'Feathers') {
                openPhrases.push("I dive-bombed that adventurer like six times!");
                openPhrases.push("They sneezed every time I flew past. Feathers!");
            }
            else if (speaker.tags.rangeMess == 'AcidPool') {
                openPhrases.push("That adventurer was pretty drenched in acid when I was through with them.");
                openPhrases.push("I love melting adventurers with acid!");
            }
            else if (speaker.tags.rangeMess == 'WorthlessGlass') {
                openPhrases.push("I threw SO much worthless glass at that hero. They kept picking it up!");
                openPhrases.push("The hero thought my glass was gems. Every time. Every single time.");
            }
            else if (speaker.tags.rangeMess == 'Frost') {
                openPhrases.push("I gave that hero a chill they'll remember. And a cold, probably.");
                openPhrases.push("Cone of cold! Well, cone of chilly. It's the thought that counts.");
            }
        }
        let option = Math.floor(10*ROT.RNG.getUniform());
        switch (option) {
            default:
            return [{text:ROT.RNG.getItem(openPhrases),any:1},
                    {text:ROT.RNG.getItem(closePhrases),any:-1}
                    ];
            case 8:
            return [{action:"flexes and kisses their muscles.",any:1},
                {text:ROT.RNG.getItem(openPhrases),any:-1}
                ];
            case 9:
            return [
                {text:"You ever think about joining us sometime during the main event?",y:1,n:2},
                {text:"Yes! I love it. A hard worker like you, you would wreck any adventurer lucky enough to meet you!",any:-1},
                {text:"Fair enough! Definitely not for everyone. Still though, I hope you get to see the recordings; it's quite a spectacle :)",any:-1},
            ]
        }
    },

    impressed: function() {
        return [{text:"Dang! I'm impressed! You cleaned a lot!",any:-1,conditions:{cleanliness:50}}];
    },

    cleanConvo: function(mess) {
        let owner = mess.droppedBy;
        let item=false;
        let messname=mess.displayName();
        let messnamePlural=mess.plural().toLowerCase();
        if (mess.cleanMethod == 'get') {
            if (owner.dropMessConvo) {
                return;
            }
            else {
                item=true;
                owner.dropMessConvo=true;
            }
        }
        if ((mess.cleanMethod == 'mop')) {
            if (owner.rangeMessConvo) {
                return;
            }
            else {
                owner.rangeMessConvo=true;
            }
        }

        let startMessages;
        let endMessages;
        if (item) {
            startMessages=[
                "Oh, thanks for picking up my "+messname+"!",
                "Oops! I knew I forgot something. That "+messname+" was mine...",
                "Oh dang sorry about the "+messname+".",
                "Oof, forgot to clean up after myself. Thanks for picking up my "+messname+"!",
                "Is that my "+messname+"? It IS! I was looking everywhere. Well, nowhere. But still!",
                "My "+messname+"! You found it before the gelatinous cube did. Hero of the morning!",
            ];
            endMessages=[
                "I know, I know... leaving "+messnamePlural+" lying around on the job. I'll do better tomorrow!",
                "Bad habit. I will try to be more mindful not to leave "+messnamePlural+" all over the place in the future.",
            ];
        }
        else {
            startMessages=[
                "Oh yeah those "+messnamePlural+" were me. Whoops.",
                "Yeah my aim was a bit off on that one. Thanks for mopping up the "+messnamePlural+".",
                "Aaahh I got a little carried away! Thanks for cleaning the "+messnamePlural+"!",
                "Those "+messnamePlural+" were my fault! Sorry about that.",
                "In my defence, the "+messnamePlural+" were very dramatic. Thanks for cleaning them!",
                "I rolled for 'tidy combat' and failed. Sorry about the "+messnamePlural+"!",
            ];
            endMessages=[
                "The adventurer sure felt it, though :) Worth it?",
                "I just get so excited when I'm fighting adventurers D:",
            ];
        }
        endMessages.push("You do a really amazing job around here!");
        endMessages.push("I really heckin' appreciate the work you do!");

        var newConvo= [
            {text:ROT.RNG.getItem(startMessages),any:-1,globalTags:{yendorPoints:3}},
        ];
        if (ROT.RNG.getUniform()>0.6) {
            newConvo[0].any=1;
            newConvo.push({text:ROT.RNG.getItem(endMessages),any:-1})
        }
        owner.convos.push(newConvo);
    },

    coffeeConvo: function(tags,speaker) {
        var newConvo;
        let option=Math.floor(6*ROT.RNG.getUniform());
        switch (option) {
            default:
            case 0:
            newConvo = [
                {text:"Hey! I'm running to the cafe. Want anything?","I'd love a coffee!":1,"How about some tea?":2,"Can I have a donut?":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! I'll bring you some coffee when I've got it!",any:-1,tags:{food:'coffee'}},
                {text:ROT.RNG.getItem(this.words)+"! I'll bring you some tea when I've got it!",any:-1,tags:{food:'tea'}},
                {text:ROT.RNG.getItem(this.words)+"! I'll bring you back a donut when I've got it!",any:-1,tags:{food:'donut'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
            case 1:
            newConvo = [
                {text:"I'm going to go swing by Monster Pizza. Want anything?","Pepperoni!":1,"Marinara's my favourite!":2,"Vegetables! All of them!":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! I'll be back with a pepperoni pizza shortly :D",any:-1,tags:{food:'pepperoni pizza'}},
                {text:ROT.RNG.getItem(this.words)+"! Pizza marinara coming right up :)",any:-1,tags:{food:'pizza marinara'}},
                {text:ROT.RNG.getItem(this.words)+"! Vegetable pizza coming up!",any:-1,tags:{food:'vegetable pizza'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
            case 2:
            newConvo = [
                {text:"I'm going to "+RandomName(false)+"'s Healthy Select. Want anything?","How about a yummy wrap?":1,"Guacamole!":2,"Salad!":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! I'll bring you your wrap when I've got it!",any:-1,tags:{food:'wrap'}},
                {text:ROT.RNG.getItem(this.words)+"! I'll bring you some guacamole when it's ready!",any:-1,tags:{food:'guacamole'}},
                {text:ROT.RNG.getItem(this.words)+"! Salad, on its way!",any:-1,tags:{food:'salad'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
            case 3:
            newConvo = [
                {text:"I'm going to "+RandomName(false)+"'s All-day Breakfast. Want anything?","Pancakes please!":1,"Tofu Scramble would be awesome!":2,"Bagel!":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! Pancakes will be on their way shortly!",any:-1,tags:{food:'pancakes'}},
                {text:ROT.RNG.getItem(this.words)+"! I will be back with your tofu scramble!",any:-1,tags:{food:'tofu scramble'}},
                {text:ROT.RNG.getItem(this.words)+"! Bagels rule! I will bring you a bagel!",any:-1,tags:{food:'bagel'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
            case 4:
            newConvo = [
                {text:"I'm heading to the Minetown Bakery. Want anything?","A cinnamon roll!":1,"Lembas, please!":2,"Something with sprinkles!":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! One cinnamon roll, coming up!",any:-1,tags:{food:'cinnamon roll'}},
                {text:ROT.RNG.getItem(this.words)+"! Lembas it is. One bite and you're full for a week!",any:-1,tags:{food:'lembas'}},
                {text:ROT.RNG.getItem(this.words)+"! The sprinkliest thing they have!",any:-1,tags:{food:'sprinkle donut'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
            case 5:
            newConvo = [
                {text:"I'm popping over to the Joppa Juice Bar. Want anything?","A watervine smoothie!":1,"Fresh water, a whole dram!":2,"Something with a mango!":3,"No thanks":4},
                {text:ROT.RNG.getItem(this.words)+"! Watervine smoothie. Live and drink!",any:-1,tags:{food:'watervine smoothie'}},
                {text:ROT.RNG.getItem(this.words)+"! A whole dram! You're rich now!",any:-1,tags:{food:'dram of fresh water'}},
                {text:ROT.RNG.getItem(this.words)+"! Mango juice, Brogue-style!",any:-1,tags:{food:'mango juice'}},
                {text:"Okie doke!",any:-1},
            ];
            break;
        }
        
        return newConvo;
    },

    deliverConvo: function(tags,speaker) {
        let food;
        if ('food' in tags && tags.food != false) {
            food = tags.food;
        }
        else {
            return null;
        }
        var newConvo;
        let enjoy = ["I really hope you enjoy it :)", "Careful, it's still warm!", "I got you an extra napkin. You're welcome.",
            "The cashier rolled a d20 for your order and got a 20. It's extra good.", "Enjoy! You earned it!"];
        newConvo = [
            {text:"Here's the "+food+" you asked for!",any:1},
            {text:ROT.RNG.getItem(enjoy),any:-1},
        ];
        tags.food=false;
        return newConvo;
    },

    invitationConvo: function(tags,speaker) {
        var newConvo;
        if (speaker.species == 'Imp' || speaker.species == 'Balor' || speaker.species == 'Dragon' ) {
            newConvo = [
                { text: "Holy heck you cleaned so much! I'm impressed!", any: 1 },
                { text: "Hey, I'm hosting a barbeque tonight. Yes, we're using raging hellfire. From me. Wanna come?", y: 2, n: 4 },
                { text: ROT.RNG.getItem(this.words)+"! We can all leave together when you're ready to call it a day!", any: 3, globalTags: { invitationAccepted: true, yendorPoints: 10, dinnerPlan: speaker.name+"'s barbeque", dinnerHost: speaker.name } },
                { text: "Remember, it doesn't need to be spotless! Your health and happiness are way more important than work; call it a day on your own terms!", any: -1 },
                { text: "That's alright :) I'll invite you to the next one!", any: 3 },
            ];
        }
        else {
            let planOpts = ['dinner', 'drinks', 'dancing', 'dice night', 'karaoke'];
            let plan = ROT.RNG.getItem(planOpts);
            newConvo = [
                { text: "Hey! You've done so much cleaning, holy cow!", any: 1 },
                { text: "Listen, a bunch of us were planning to get together for " + plan + " after work. Wanna come?", y: 2, n: 4 },
                { text: ROT.RNG.getItem(this.words)+"! We'll leave together when you're ready to call it a day!", any: 3, globalTags: { invitationAccepted: true, yendorPoints: 10, dinnerPlan: plan, dinnerHost: speaker.name } },
                { text: "Remember, it doesn't need to be spotless! Your health and happiness are way more important than work; call it a day on your own terms!", any: -1 },
                { text: "That's alright :) We do something every day; we'll keep you in the loop for future plans!", any: 3 },
            ];
        }
        return newConvo;
    },

    victoryPrompt: function() {
        var nextConvo=[];
        var victoryScene = [
            "When you arrive at work, everyone greets you enthusiastically!",
            "You've been here for a couple of weeks, and have already made a fantastic impression!",
            "Everyone has banded together, and given you the best gift the dungeon has to offer:",
            "You have been gifted the legendary %c{#ff0}Mop of Yendor%c{}!",
            "Its mystic energies flow through your hands. You feel like your cleaning abilities have become supercharged. No mess will stand in your way again!",
            "%c{#ff0}You have won the hearts of your comrades and, by extension, this game. Thank you for playing!%c{}"
        ];
        for (let i = 0; i < victoryScene.length; i++) {
            var nextMsg = { message: victoryScene[i], any: (nextConvo.length + 1) };
            if (i == (victoryScene.length - 1)) {
                nextMsg.globalTags = { victory: true };
                nextMsg.any = -1;
            }
            nextConvo.push(nextMsg);
        }
        return nextConvo;
    },

    exitPrompt: function() {
        var nextConvo=[];
        
        let messages;
        if ('invitationAccepted' in Game.convoTags && Game.convoTags.invitationAccepted) {
            var description=[
                "It's really delightful, and you have a fantastic night with your comrades!",
                "You have a really wonderful evening!",
                "It's so fun! You are rejuvenated by the fun night!"
            ];
            switch(Game.convoTags.dinnerPlan) {
                default:
                description.push('The barbeque is so good! Lots of fantastic flamed food!');
                description.push('The barbeque melts when the hellfire gets a bit too warm. You roast marshmallows on the remains though, so it is still good!');
                description.push('Who knew monster fire was better than propane AND charcoal? So good!');
                break;
                case 'dinner':
                description.push("You have a really delicious meal and are pleasantly full by the end of it!");
                description.push("It's buffet style and you get a lot of really good food!");
                description.push("You have some ramen. At the end, your fortune cookie says:'Your day tomorrow will be "+ROT.RNG.getItem(this.words).toLowerCase()+"'. Wow!");
                break;
                case 'dancing':
                description.push("You dance the whole night. It's so fun and energetic!");
                description.push("Some really good classic metal is played and you headbang the whole night!");
                description.push("Some wicked good music from the 90's plays. Such nostalgia! Wow! ");
                break;
                case 'dice night':
                description.push("The dragon runs the game. You play a level 1 Janitor. You save the kingdom by mopping the final boss's lair!");
                description.push("You roll three natural 20s in a row. The whole table screams. The dragon has to lie down.");
                description.push("The campaign is 'Dungeons and Dishwashers'. You win. Everybody wins. There are snacks.");
                break;
                case 'karaoke':
                description.push("The harpy sings a power ballad. Every glass in the place shatters. Nobody minds.");
                description.push("You and a skeleton duet 'Dancing in the Dark'. Bones rattle. A standing ovation.");
                description.push("The ogre sings a lullaby. Half the bar falls asleep. It's the best night ever.");
                break;
                case 'drinks':
                description.push("You have a beverage called a 'Gin and "+RandomName(false)+"'. It's surprisingly "+ROT.RNG.getItem(this.words)+"?");
                description.push("Everyone has a round and boisterously jokes about the day's events. It's fun!");
                description.push("It's actually pretty quiet; lots of folks stayed in tonight, so it's a relatively quiet night with 3 or 4 of you.");
                break;
            }
            messages=[
                "Leave for the day and head out with everyone to "+Game.convoTags.dinnerPlan+"?",
                "You and your comrades leave together for "+Game.convoTags.dinnerPlan+"!",
                {message: ROT.RNG.getItem(description), scene: Scenes.forPlan(Game.convoTags.dinnerPlan)},
                "Eventually, the night comes to an end. Your eyes grow heavy and it is time to rest.",
                {message: "You go home, and get a nice, full 8 hours of sleep.", scene: 'sleep'}
                ];
        }
        else {
            messages=[
                "Leave for the day and go home?",
                "You leave for the day, and head home.",
                {message: "You have a really relaxing evening at home! You read a book and play some video games.", scene: 'home'},
                {message: "Eventually, it's time to sleep. You go to bed and have a nice, full 8 hours of sleep.", scene: 'sleep'}
            ];
        }
        if ('animal' in Game.convoTags && Game.convoTags.animal != 'none') {
            messages.push("You have a really happy dream about "+Game.convoTags.animal+"s!");
        }
        // the plaque, then the report (the report *is* the identification)
        Scenes.setPlaque(Game.plaqueLines());
        Scenes.setReport(Game.reportCardLines(), Game.cleanPercent());
        messages.splice(2, 0, {message: 'Do you want your mess identified? (You do. Here it is.)', scene: 'plaque'},
            {message: Game.shiftReportLine(), scene: 'report'});
        if (Game.todayEvent == 'inspector') {
            let good = Game.cleanPercent() >= 80;
            let verdict = {message: Flavor.rng.getItem(good ? Lore.inspectorVerdict.good : Lore.inspectorVerdict.bad)};
            if (good) {
                verdict.globalTags = {yendorPoints: 100};
            }
            messages.splice(4, 0, verdict);
        }
        let lastDay = Game.day >= Game.LAST_DAY;
        if (!lastDay) {
            messages.push("In the morning, you wake up, and have a delicious breakfast.");
            messages.push("Time for another day of work!");
        }
        for (let i=0;i<messages.length;i++) {
            // a line is either plain text or {message, scene} with an ASCII scene above it
            var nextMsg = typeof messages[i] == 'string' ? {message:messages[i]} : {message:messages[i].message, scene:messages[i].scene};
            if (typeof messages[i] != 'string' && messages[i].globalTags) {
                nextMsg.globalTags = messages[i].globalTags;
            }
            if (i==0) {
                nextMsg.y=1;
                nextMsg.n=-1;
            }
            else {
                nextMsg.any=(i+1);
                if (i>1) {
                    nextMsg.blackScreenMessage=true;
                }
            }
            if (i==1) {
                nextMsg.globalTags=Object.assign({}, nextMsg.globalTags, {endShift:true}); // you said yes: the shift is over
            }
            if (i==(messages.length-1)) {
                nextMsg.globalTags=lastDay ? {endRun:true,invitationAccepted:false} : {nextDay:true,invitationAccepted:false};
                nextMsg.any=-1;
                //if (Game.yendorPoints+Game.cleanPercent() > Game.targetPoints && !Game.victory) {
                //    nextMsg.any=(i+1);
                //}
            }

            nextConvo.push(nextMsg);
        }
        
        return nextConvo;
    },

    // Joins two cutscenes (arrays of {message, any} nodes) into one.
    chainCutscenes: function(a, b) {
        if (b == null || b.length == 0) {
            return a;
        }
        let joined = a.map(function(n) { return Object.assign({}, n); });
        joined[joined.length-1].any = a.length;
        for (let i = 0; i < b.length; i++) {
            let node = Object.assign({}, b[i]);
            if (typeof node.any == 'number' && node.any >= 0) {
                node.any += a.length;
            }
            joined.push(node);
        }
        return joined;
    },

    startGameCutscene: function() {
        let newConvo=[];
        let text=[
            'Welcome to %c{#ff0}Rogue Janitor%c{}!',
            'You have a new job as dungeon janitor for the %c{#f00}Comrade Dungeon%c{}, and today is your first day!',
            'Now that the hero is gone, your monstrous colleagues are relaxing in the staff lounge...',
            '...but your day is just beginning!',
            'Talk to your comrades, get to know them, and %c{#ff0}clean the dungeon%c{}!',
            'Press %c{#ff0}?%c{} at any time for instructions!'
        ];
        for (let i=0;i<text.length;i++) {
            let nextNode = {message:text[i],any:(i+1)};
            newConvo.push(nextNode);
        }
        newConvo[newConvo.length-1].any=-1;
        return newConvo;
    },

    petConvo: function(speaker) {
        let idlePet = ["is running around."];
        var newConversation = [[{ action: ROT.RNG.getItem(idlePet), any: -1 }]];

        let interactConvo=[{any:1}];
        if (speaker.sound[0]=='text') {
            interactConvo[0].text=speaker.sound[1]+"!";
        }
        else {
            interactConvo[0].action=speaker.sound[1].toLowerCase()+"s happily!";
        }

        interactConvo.push({
            message:'What will you do?',
            'Pet them!':2,
            'Play with them!':3,
            'Hug them!':4
        });

        interactConvo.push({
            message:'You pet '+speaker.name+'!',
            any:-1,
            tags:{petAction:'pet'}
        });

        interactConvo.push({
            message:'You throw a toy. '+speaker.name+' runs after it, then keeps running!',
            any:-1,
            tags:{petAction:'play'}
        });

        interactConvo.push({
            message:'You hug '+speaker.name+'. They are very, very soft!',
            any:-1,
            tags:{petAction:'hug'},
        });

        newConversation.push(interactConvo);

        if (speaker.name == speaker.species) {
            let names = [RandomName(false), RandomName(false), RandomName(false), RandomName(false)];
            let metConvo = [
                { any: 1, conditions: { petName: false } },
                { message: "Wow! A really cute " + speaker.species.toLowerCase() + "!", any: 2 },
                { message: "They need a name. What would you like to name them?" }
            ];
            let finalNode = metConvo.length + names.length;
            for (let i = 0; i < names.length; i++) {
                metConvo[2][names[i]] = (metConvo.length);
                let nextNode = { message: "The " + speaker.species + "'s name is now " + names[i] + "!" };
                nextNode.any = finalNode;
                nextNode.tags = { petName: names[i] };
                metConvo.push(nextNode);
            }
            metConvo.push({ any: -1 });
            if (speaker.sound[0]=='text') {
                metConvo[0].text=speaker.sound[1]+"! :)";
                metConvo[metConvo.length-1].text=speaker.sound[1]+"!! :D";
            }
            else {
                metConvo[0].action=speaker.sound[1].toLowerCase()+"s happily!";
                metConvo[metConvo.length-1].action=speaker.sound[1].toLowerCase()+"s enthusiastically!! :D";
            }
            newConversation.push(metConvo);
        }
        speaker.convos=newConversation;
    },
}

// Favours your comrades ask of you: clear every last bit of one kind of mess.
var Requests = {
    MAX_PER_DAY: 3,
    CHANCE: 0.35,
    REWARD: 40,
    OWN_FIRST: 0.5, // how often a comrade asks about their own species' mess first
    types: [
        {key:'slime', label:'Slime', species:'Slime', test:function(m){ return /^(Slime |Slimy )/.test(m.kind); },
            ask:"Sorry about all my slime... Could you mop up every last bit of it? It's embarrassing."},
        {key:'feathers', label:'Feathers', species:'Harpy', test:function(m){ return m.kind == 'Loose Feathers'; },
            ask:"I moulted all over the dungeon. Could you pick up all my feathers? I'd do it but... wings."},
        {key:'bones', label:'Bones', species:'Skeleton', test:function(m){ return m.kind == 'Loose Bone' || m.kind == 'Bone Dust'; },
            ask:"Bits of me are all over the place! Could you collect my bones and sweep up the bone dust?"},
        {key:'ecto', label:'Ectoplasm', species:'Ghost', test:function(m){ return m.kind == 'Ectoplasm'; },
            ask:"I may have... leaked. Could you scrub up all the ectoplasm? It's stubborn stuff."},
        {key:'spores', label:'Spores', species:'Myconid', test:function(m){ return m.kind == 'Spores'; },
            ask:"I got a bit puffy today. Could you clean up all my spores before someone sneezes?"},
        {key:'drool', label:'Drool', species:'Mimic', test:function(m){ return m.kind == 'Mimic Drool'; },
            ask:"Could you mop up all my drool? If the next hero sees it they'll know I'm not a real chest."},
        {key:'graffiti', label:'Graffiti', test:function(m){ return m.kind == 'Graffiti'; },
            ask:"The hero wrote rude things about me on the walls! Could you scrub off all the graffiti?"},
        {key:'coins', label:'Gold coins', test:function(m){ return m.kind == 'Scattered Gold Coins'; },
            ask:"That's our payroll scattered all over the floor! Could you pick up all the gold coins?"},
        {key:'pages', label:'Loose pages', test:function(m){ return m.kind == 'Loose Pages'; },
            ask:"The book club's books got shredded! Could you gather up all the loose pages?"},
        {key:'cobwebs', label:'Cobwebs', test:function(m){ return m.kind == 'Cobweb'; },
            ask:"Cobwebs give me the creeps. Could you clear every single one out?"},
        {key:'swords', label:'Swords', test:function(m){ return m.kind == 'Dropped Sword' || m.kind == 'Stray Arrow'; },
            ask:"Someone's going to trip on all those dropped weapons! Could you pick them all up?"},
        {key:'litter', label:'Mugs & bottles', test:function(m){ return /^Empty (Coffee Mug|Bottle)$/.test(m.kind); },
            ask:"Okay, I admit it, we leave mugs and bottles everywhere. Could you round them all up?"},
        // the new staff
        {key:'fruit', label:'Fruit pits', species:'Fruit Bat', test:function(m){ return m.kind == 'Fruit Pits'; },
            ask:"I may have eaten a whole orchard last night. Could you pick up the fruit pits? Someone will slip."},
        {key:'eyedrops', label:'Eye drops', species:'Floating Eye', test:function(m){ return m.kind == 'Puddle of Eye Drops'; },
            ask:"I cried a little when the hero hit me. A lot, actually. Could you mop up the eye drops?"},
        {key:'eggs', label:'Cockatrice eggs', species:'Cockatrice', test:function(m){ return m.kind == 'Cockatrice Egg (Do Not Touch)'; },
            ask:"I laid a few eggs out of stress. Could you collect them? With gloves. ALWAYS with gloves."},
        {key:'gelatin', label:'Gelatin', species:'Gelatinous Cube', test:function(m){ return m.kind == 'Gelatin Puddle' || m.kind == 'Cube Leftovers'; },
            ask:"I leaked some of myself, and some of what was inside myself. Could you clean up the gelatin and the leftovers?"},
        {key:'glitter', label:'Glitter', species:'Unicorn', test:function(m){ return m.kind == 'Glitter' || m.kind == 'Glittery Footprints'; },
            ask:"The glitter. It's everywhere. It's always everywhere. Could you get rid of every last speck? I believe in you."},
        {key:'frost', label:'Frost', species:'Lich', test:function(m){ return m.kind == 'Patch of Frost'; },
            ask:"My spells left frost all over the floor. Could you mop it before somebody slips and joins me in undeath?"},
        {key:'glass', label:'Worthless glass', species:'Unicorn', test:function(m){ return m.kind == 'Worthless Piece of Glass'; },
            ask:"I threw a LOT of worthless glass at the hero. Would you pick it all up? It's worthless. But it's MY worthless."},
        // anybody's
        {key:'traps', label:'Sprung traps', test:function(m){ return m.kind == 'Sprung Trap'; },
            ask:"The hero sprung our traps! Could you re-arm them all? The kobolds worked so hard on those."},
        {key:'fixall', label:'Broken furniture', test:function(m){ return m.cleanMethod == 'fix' && m.kind != 'Sprung Trap'; },
            ask:"So much of our furniture got smashed. Could you fix every last piece? I miss my favourite chair."},
        {key:'footprints', label:'Footprints', test:function(m){ return / Footprints$/.test(m.kind); },
            ask:"Footprints! Everywhere! Muddy, sticky, glowing... Could you mop every single one?"},
        {key:'scorch', label:'Scorch marks', test:function(m){ return m.kind == 'Scorch Mark'; },
            ask:"Somebody got a bit fiery last night. Could you scrub off all the scorch marks?"},
        {key:'water', label:'Puddles', test:function(m){ return m.kind == 'Water' || m.kind == 'Holy Water' || m.kind == 'Puddle of Eye Drops'; },
            ask:"There are puddles all over the dungeon. Could you mop them all up? My socks are SOAKED."},
        {key:'food', label:'Leftover food', test:function(m){ return m.kind == 'Apple Core' || m.kind == 'Gnawed Drumstick' || m.kind == 'Discarded Candy Wrapper' || m.kind == 'Fruit Pits'; },
            ask:"The hero left food everywhere! Could you clear away every wrapper, core and bone before the rats throw a party?"},
        {key:'shards', label:'Shards', test:function(m){ return m.kind == 'Pottery Shards' || m.kind == 'Broken Flask'; },
            ask:"All those broken pots and flasks... Could you pick up every shard? Nobody likes a pointy surprise."},
        {key:'music', label:'Sheet music', test:function(m){ return m.kind == 'Sheet Music'; },
            ask:"That bard left sheet music everywhere. Could you collect it? The choir wants to see if it's any good."},
        {key:'scrap', label:'Loose metal', test:function(m){ return m.kind == 'Dropped Sword' || m.kind == 'Loose Armor Piece' || m.kind == 'Used Wand' || m.kind == 'Cracked Staff'; },
            ask:"Swords, wands, armour bits... the floor is a scrapyard! Could you gather up all the loose metal?"},
        {key:'soot', label:'Soot', test:function(m){ return m.kind == 'Soot' || m.kind == 'Sooty Footprints'; },
            ask:"Smoke bombs, incense, dragon snores... Could you clean up all the soot? I keep sneezing."},
        {key:'pies', label:'Cream pie', test:function(m){ return m.kind == 'Cream Pie Splat'; },
            ask:"Somebody's pie trap went off. It smells amazing but it's SO sticky. Could you mop up every splat?"},
        {key:'confetti', label:'Confetti', test:function(m){ return m.kind == 'Confetti'; },
            ask:"Confetti everywhere! Was it someone's birthday? Could you sweep it all up?"},
        {key:'dice', label:'Dice', test:function(m){ return m.kind == 'Stray Die'; },
            ask:"The dice! They rolled everywhere! Could you collect every single one? A d4 in the foot is no joke."},
        {key:'bananas', label:'Banana peels', test:function(m){ return m.kind == 'Banana Peel'; },
            ask:"That monkey left banana peels all over! Could you pick them up before someone does a cartoon slip?"},
    ],
    // other ways of asking (key -> lines), so the same favour isn't always worded the same
    asks: {
        slime: ["I'm leaking again. Could you mop up all my slime trails? I'd do it, but I'd just make more.",
            "Every puddle of slime out there has my name on it. Literally, I signed one. Could you clean them all?"],
        feathers: ["Stress moult. Big one. Could you collect every feather? I'll knit you a pillow.",
            "There's more of my plumage on the floor than on me. Could you pick up the feathers?"],
        bones: ["I'm not all here today. Could you gather my bones and the bone dust? Spare parts are precious.",
            "Could you round up all the loose bones? I'm missing a rib. Or I have an extra one. Hard to say."],
        ecto: ["I left ectoplasm all over the dungeon. It glows in the dark. Could you scrub it all off?",
            "Could you clean up my ectoplasm? Ghost goo is very hard to get out of grout."],
        spores: ["The hero made me so nervous I puffed spores everywhere. Could you vacuum them all up?",
            "Atchoo! Sorry, my own spores. Could you clean them all before the whole lounge catches them?"],
        drool: ["My drool is everywhere. Could you mop it? If the next hero sees it, my cover's blown.",
            "I drooled. A lot. In my defence, the hero smelled like snacks. Could you mop it up?"],
        graffiti: ["Someone wrote 'MONSTERS STINK' on the wall. I do not stink. Could you scrub ALL the graffiti?",
            "The walls are covered in hero scribbles. Could you scrub them clean? Spelling mistakes hurt my eyes."],
        coins: ["The co-op's coins are all over the floor! Could you pick up every one? Ask the leprechaun, they counted.",
            "Coins, coins, coins! Could you round them all up? Keep a few. Finder's fee."],
        pages: ["Book club is tonight and our books are in pieces! Could you gather the loose pages?",
            "Pages everywhere! I think the hero was looking for a spellbook. Could you gather them up?"],
        cobwebs: ["The spiders moved out but left their webs. Could you clear every cobweb?",
            "I walked into a cobweb face-first this morning. Could you clear them all? For my dignity."],
        swords: ["Dropped weapons are a workplace hazard! Could you collect every sword and arrow?",
            "The hero left their armoury on our floor. Could you pick up all the swords and arrows?"],
        litter: ["The lounge has 'mug creep'. They're migrating. Could you collect every empty mug and bottle?",
            "Bottles, mugs, bottles... Could you round up all the empties? We'll do better. Probably."],
        traps: ["Our beautiful traps, all sprung! Could you re-arm every single one? For the craft.",
            "The traps need resetting. The kobolds made me promise to ask nicely. Please?"],
        fixall: ["The furniture took a beating. Could you fix all of it? A dungeon isn't a home without its tables.",
            "Everything's broken! Could you fix every last smashed thing? I'll owe you a favour. A big one."],
        footprints: ["Muddy footprints from wall to wall. Could you mop up every one? I'll get the hero some doormats.",
            "Could you mop all the footprints? The floor looks like a map of everywhere the hero went."],
        water: ["Puddles! I stepped in three already. Could you mop up all the water?",
            "There's water everywhere, and not the good drinking kind. Could you mop it all?"],
        food: ["The hero ate like a dragon and left the leftovers everywhere. Could you clear it all?",
            "Wrappers and cores all over! Could you pick up every scrap of food? The ants are getting ideas."],
        glitter: ["Glitter. In my mane. On the floor. In my dreams. Could you clean it all up? Please. PLEASE."],
        dice: ["Dice everywhere! Could you pick them all up? The dragon counts them, you know. Every night."],
    },
    thanks: [
        "You did it! Not a trace of {label} left anywhere. Thank you!",
        "Not one bit of {label} left! You're a natural 20 of a janitor!",
        "The {label}? GONE. You're incredible. Like, statistically incredible.",
        "No more {label}! I could cry. I won't, I'd just make more mess.",
        "Every last bit of {label}, gone! I'm telling the whole co-op about this.",
    ],
    rewards: [
        "hands you a cookie they were saving.",
        "gives you a big, slightly crushing hug.",
        "promises to put in a good word at the next co-op meeting.",
        "gives you a hand-drawn 'Employee of the Day' certificate.",
        "high-fives you. It stings a little, in a good way.",
        "rolls a d20 to decide your reward. It's a 20. They give you a hug AND a cookie.",
        "draws you a little medal on a napkin. It says 'MOP HERO'.",
        "promises to name their next pet rock after you.",
        "does a little victory dance. It's mostly wiggling.",
        "gives you a sticker. It's a sticker of a mop. It's perfect.",
        "salutes you with a ketchup packet.",
    ],

    type: function(key) {
        for (let i=0;i<this.types.length;i++) {
            if (this.types[i].key == key) {
                return this.types[i];
            }
        }
        return null;
    },

    remaining: function(key) {
        let t = this.type(key);
        if (t == null) {
            return 0;
        }
        let n = 0;
        for (let k in Game.map) {
            let m = Game.map[k].mess;
            if (m != null && t.test(m)) {
                n++;
            }
        }
        return n;
    },

    // Species-specific favours come first; anyone can ask the generic ones.
    pick: function(speaker) {
        let mine = [], generic = [];
        for (let i=0;i<this.types.length;i++) {
            let t = this.types[i];
            let n = this.remaining(t.key);
            if (n < 1 || n > 30) {
                continue;
            }
            if (t.species == speaker.species) {
                mine.push(t);
            }
            else if (t.species == null) {
                generic.push(t);
            }
        }
        // their own mess first, now and then; otherwise anything (their own included)
        if (mine.length > 0 && (generic.length == 0 || ROT.RNG.getUniform() < this.OWN_FIRST)) {
            return ROT.RNG.getItem(mine);
        }
        let all = mine.concat(generic);
        return all.length > 0 ? ROT.RNG.getItem(all) : null;
    },

    offer: function(speaker, convos) {
        if (Game.requestsOffered >= this.MAX_PER_DAY || ROT.RNG.getUniform() >= this.CHANCE) {
            return false;
        }
        let t = this.pick(speaker);
        if (t == null) {
            return false;
        }
        Game.requestsOffered++;
        this.push(convos, t);
        return true;
    },

    // The favour itself: the question, and the thanks waiting for when it's done.
    push: function(convos, t) {
        let yes = ["You're the best! Come find me when it's done.", "Yay! I'll be right here. Vaping. Gratefully.",
            "You're a hero! The good kind. Come back when it's done!", "Thank you thank you! Roll for cleaning!"];
        let no = ["No worries! Forget I asked :)", "Totally fine! It's not going anywhere. Literally.", "That's okay! Maybe tomorrow's janitor. Which is you. No pressure!"];
        convos.push([
            {text:ROT.RNG.getItem([t.ask].concat(this.asks[t.key] || [])), y:1, n:2, tags:{offerSeen:true}},
            {text:ROT.RNG.getItem(yes), any:-1, tags:{request:t.key}},
            {text:ROT.RNG.getItem(no), any:-1},
        ]);
        convos.push([
            {text:ROT.RNG.getItem(this.thanks).replace('{label}', t.label.toLowerCase()), any:1,
                conditions:{requestDone:true}, tags:{requestThanked:true}, globalTags:{yendorPoints:this.REWARD}},
            {action:ROT.RNG.getItem(this.rewards), any:-1},
        ]);
    },

    isDone: function(speaker) {
        let key = speaker.convoTags.request;
        return key != null && !speaker.convoTags.requestThanked && this.remaining(key) == 0;
    },

    // Open favours for the side panel: [{who, label, left}]
    active: function() {
        let out = [];
        for (let i=0;i<Game.monsterList.length;i++) {
            let m = Game.monsterList[i];
            if (m.alive && m.convoTags.request && !m.convoTags.requestThanked) {
                let t = this.type(m.convoTags.request);
                if (t) {
                    out.push({who:m, label:t.label, left:this.remaining(t.key)});
                }
            }
        }
        return out;
    },
};

if (typeof module !== 'undefined') module.exports = Requests;
