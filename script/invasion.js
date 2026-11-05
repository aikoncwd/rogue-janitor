// The hero invasion: a non-interactive, paced replay of the adventurer storming the
// dungeon, told from the monsters' point of view. Receives events from the
// adventurer/monster code, keeps stats, bodies and hit flashes, and hands over
// to the player when the hero leaves.
var Invasion = {
    instant: false, // run every hero turn without delay (tests)
    FAST_FACTOR: 4,
    // Rhythm of the replay: every turn plays at the original speed (90 ms walking,
    // 200 ms when something is going on); a few special moments add a little on top.
    WALK_MS: 90,
    ACTION_MS: 200,
    MAX_TURN_MS: 350,
    EXTRA_MS: { potion: 120, snack: 100, cry: 100, faint: 120, special: 150, graffiti: 100, enter: 150,
        lost: 150, scroll: 150, saveScum: 150, elbereth: 120, backIn5: 100, quip: 100 },
    SPEECH: ['snack', 'potion', 'special', 'graffiti', 'enter', 'cry', 'lost', 'scroll', 'saveScum', 'elbereth', 'backIn5', 'quip'],
    busy: false,
    extra: 0,
    speaking: false,
    fast: false,
    skipping: false,
    timer: null,
    engineStarted: false,
    // Video controls: the footage starts paused on its first frame every day.
    startPaused: true, // tests of the old self-running replay switch this off
    paused: false,
    held: false, // the engine is locked by a pause, with no timer to resume it
    gate: null, // releases the hero's very first turn (see firstFrameGate)

    // Hands control to the hero: called when the intro screen is dismissed (day 1)
    // or when a new day's dungeon is generated (the player's pending unlock resumes it).
    start: function () {
        Game.phase = 'invasion';
        this.takeFootageStart();
        Game.stopQuestBlink();
        Game.drawMap();
        if (!this.engineStarted) {
            this.engineStarted = true;
            Game.engine.start();
        }
    },

    // Records something happening this turn: it becomes an action turn, and the
    // biggest extra of the turn is added on top (extras do not stack).
    beat: function (name) {
        this.busy = true;
        this.extra = Math.max(this.extra, this.EXTRA_MS[name] || 0);
        if (this.SPEECH.indexOf(name) >= 0) {
            this.speaking = true;
        }
    },

    // Delay before the next hero turn.
    turnDelay: function () {
        let targets = Game.adventurer ? Game.adventurer.targets.length : 0;
        let base = (this.busy || targets > 0) ? this.ACTION_MS : this.WALK_MS;
        let ms = Math.min(this.MAX_TURN_MS, base + this.extra);
        if (Game.adventurer && Game.adventurer.heroClass == 'Speedrunner') {
            ms = ms * 0.7; // ANY%!
        }
        return this.fast ? ms / this.FAST_FACTOR : ms;
    },

    // Called after every active hero turn: pause the engine and resume on a timer.
    // Beats are reset only after scheduling, so what monsters do between hero
    // turns counts toward the next one.
    afterHeroTurn: function () {
        if (this.instant || this.skipping || Game.phase != 'invasion') {
            this.busy = false;
            this.extra = 0;
            this.speaking = false;
            return;
        }
        let ms = this.turnDelay();
        Game.engine.lock();
        Game.drawMap();
        this.busy = false;
        this.extra = 0;
        this.speaking = false;
        if (this.paused) {
            this.held = true; // play or step releases it
            return;
        }
        this.resumeIn(ms);
    },

    // The hero's first turn waits for the player while the footage is paused.
    holdFirst: function (hero) {
        return this.paused && !this.instant && !this.skipping && Game.phase == 'invasion';
    },

    // A synchronous thenable: rot.js locks the engine and hands us its unlock,
    // which runs right after the hero's first turn once the footage moves.
    firstFrameGate: function (hero) {
        return {
            then: function (unlock) {
                Invasion.gate = function () {
                    hero.act(true);
                    unlock();
                };
            },
        };
    },

    // Lets the next hero turn happen, whatever is holding it.
    release: function () {
        if (this.gate != null) {
            let gate = this.gate;
            this.gate = null;
            gate();
        }
        else if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
            Game.engine.unlock();
        }
        else if (this.held) {
            this.held = false;
            Game.engine.unlock();
        }
    },

    play: function (fast) {
        this.paused = false;
        this.fast = fast;
        this.release();
    },

    pause: function () {
        this.paused = true;
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
            this.held = true;
        }
    },

    // One hero turn forward; while playing it only pauses.
    step: function () {
        if (!this.paused) {
            this.pause();
            return;
        }
        this.release();
    },

    // --- Rewind: the night is a simulation, so going back means rebuilding the
    // morning (as Continue does) and running it again with the same dice. ---
    morning: null,
    rewoundFootage: null,

    // Taken as the dungeon is built (the world and its dice)...
    takeMorning: function () {
        this.morning = {
            save: Save.snapshot(),
            flavor: Flavor.rng.getState(), // the banner clock and camera are rolled while building
            cutscene: Game.player.cutscene,
            footage: null,
        };
    },

    // ...and as the footage starts: the title screen and the night conversation
    // roll presentation dice and write to the log in between.
    takeFootageStart: function () {
        if (this.rewoundFootage != null) { // a rewind: put the presentation back as it was
            let f = this.rewoundFootage;
            this.rewoundFootage = null;
            Flavor.rng.setState(f.flavor);
            Flavor.lastLines = Object.assign({}, f.lastLines);
            Game.log.lines = JSON.parse(JSON.stringify(f.log));
            if (this.morning != null) {
                this.morning.footage = f;
            }
            return;
        }
        if (this.morning != null && this.morning.footage == null) {
            this.morning.footage = {
                flavor: Flavor.rng.getState(),
                lastLines: Object.assign({}, Flavor.lastLines),
                log: JSON.parse(JSON.stringify(Game.log.lines)),
            };
        }
    },

    rewind: function () {
        let m = this.morning;
        if (Game.phase != 'invasion' || this.stage != null || m == null) {
            return false;
        }
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.gate = null;
        this.held = false;
        this.skipping = false;
        this.fast = false;
        let footage = m.footage;
        Save.restore(m.save); // decodes fresh objects every time
        Game.player.cutscene = m.cutscene;
        Flavor.rng.setState(m.flavor);
        // a fresh engine: the old one stays locked, waiting for a turn that never comes
        Game.engine = new ROT.Engine(Game.scheduler);
        this.engineStarted = false;
        let paused = this.startPaused;
        this.startPaused = true; // the rebuilt night waits on its first frame
        this.rewoundFootage = footage;
        Game.generateDungeon(); // on day 2+ this calls start()
        this.startPaused = paused;
        if (Game.phase != 'invasion' || !this.engineStarted) {
            this.start();
        }
        return true;
    },

    toggleFast: function () {
        this.fast = !this.fast;
        if (this.timer != null) { // rescale the wait that is already running
            let left = Math.max(0, this.timerDue - this.now());
            clearTimeout(this.timer);
            this.timer = null;
            this.resumeIn(this.fast ? left / this.FAST_FACTOR : left * this.FAST_FACTOR);
        }
    },

    // The hero's next turn starts in `ms`; remembers when, so fast mode can
    // shorten a hold that is already running.
    timerDue: 0,
    resumeIn: function (ms) {
        this.timerDue = this.now() + ms;
        this.timer = setTimeout(function () {
            Invasion.timer = null;
            Game.engine.unlock();
        }, ms);
    },

    // Run the rest of the invasion instantly.
    skip: function () {
        this.skipping = true;
        this.paused = false;
        this.release();
    },

    handleKey: function (code) {
        if (Game.phase == 'intro') {
            this.start();
            return true;
        }
        if (this.stage != null) {
            if ((this.stage == 'linger' || this.stage == 'curtain') && this.REPLAY_KEYS.indexOf(code) >= 0) {
                return true; // still stepping or pausing: let the curtain and the card play
            }
            this.clockIn(); // any other key hurries the hand-over along
            return true;
        }
        if (Game.player.talking != null) {
            return false; // a conversation owns the keys (e.g. the night screen before day 2)
        }
        if (Game.phase == 'invasion') {
            if (code == 32) { // Space: play / pause
                if (this.paused) {
                    this.play(false);
                }
                else {
                    this.pause();
                }
                Game.drawMap();
                return true;
            }
            if (code == 39 || code == 102) { // right arrow (or numpad 6): one turn
                this.step();
                Game.drawMap();
                return true;
            }
            if (code == 70) { // F: fast
                if (this.paused) {
                    this.play(true);
                }
                else {
                    this.toggleFast();
                }
                Game.drawMap();
                return true;
            }
            if (code == 82) { // R: rewind to the first frame
                if (this.rewind) {
                    this.rewind();
                }
                Game.drawMap();
                return true;
            }
            if (code == 27) {
                this.skip();
                return true;
            }
            if (this.stage == null && (code in Game.player.keyMap || this.NAG_KEYS.indexOf(code) >= 0)) {
                this.nag();
                return true;
            }
        }
        return false;
    },

    hero: { short: 'The hero', full: 'The hero' },
    roster: [],
    stats: {},
    bodies: [],
    flashes: {},
    turn: 0,
    optionalLogged: false,

    reset: function (adventurer) {
        this.hero = Flavor.heroName();
        this.roster = Game.monsterList.filter(function (m) { return m.alive && !m.retired; });
        this.stats = { fainted: 0, hits: 0, lootSmashed: 0, snacks: 0, potions: 0, doors: 0, heroHurt: 0, graffiti: 0, specials: 0 };
        if (adventurer && adventurer.setClass) {
            adventurer.setClass(this.hero.cls);
        }
        this.bodies = [];
        this.flashes = {};
        this.turn = 0;
        this.optionalLogged = false;
        this.clockMinutes = 60 + Flavor.rng.getUniformInt(0, 90);
        this.camera = Flavor.rng.getUniformInt(1, 9);
        this.lastNag = -Infinity;
        this.busy = false;
        this.extra = 0;
        this.speaking = false;
        this.paused = this.startPaused;
        this.held = false;
        this.gate = null;
        this.transcript = [];
    },

    // --- Playback banner: the invasion is last night's security footage ---
    clockMinutes: 60,
    camera: 3,
    lastNag: -Infinity,
    NAG_MS: 5000,
    // Besides every movement key in Player.keyMap: action letters m p g f r o c x e,
    // and the wait keys . / 5 / numpad 5 (NumLock off).
    REPLAY_KEYS: [32, 39, 102, 70, 82], // Space, right arrow, numpad 6, F, R
    NAG_KEYS: [77, 80, 71, 79, 67, 88, 69, 190, 53, 12, 101],

    clockText: function () {
        let h24 = Math.floor(this.clockMinutes / 60) % 24;
        let m = this.clockMinutes % 60;
        let h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        let pad = function (n) { return (n < 10 ? '0' : '') + n; };
        return pad(h12) + ':' + pad(m) + (h24 < 12 ? ' AM' : ' PM');
    },

    // One line for the top of the map, shortened to fit `width` columns.
    bannerText: function (width) {
        let dot = '%c{' + (this.turn % 4 < 2 ? '#f00' : '#500') + '}●%c{}';
        let play = this.paused ? '❚❚ PAUSED' : this.fast ? '▶▶ x' + this.FAST_FACTOR : '▶ PLAY';
        let clock = this.clockText();
        let forms = [
            '%c{#fff}[ ' + dot + '%c{#fff} REC  ' + play + ' PLAYBACK · CAM ' + this.camera + ' (floating eye) · ' + clock + ' ]%c{}',
            '%c{#fff}[ ' + dot + '%c{#fff} REC  ' + play + ' PLAYBACK · ' + clock + ' ]%c{}',
        ];
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].replace(/%c\{[^}]*\}/g, '').length <= width - 2) {
                return forms[i];
            }
        }
        return dot + '%c{#fff} REC ' + play + ' ' + clock + '%c{}';
    },

    // The replay keys, for the row under the REC line (shortened to fit `width`).
    controlsText: function (width) {
        let k = function (key) { return '%c{#ff0}' + key + '%c{#ddd}'; };
        let forms = [
            k('[Space]') + ' play/pause  ' + k('[→]') + ' step  ' + k('[F]') + ' fast  ' + k('[R]') + ' rewind  ' + k('[Esc]') + ' skip%c{}',
            k('Space') + ' play  ' + k('→') + ' step  ' + k('F') + ' fast  ' + k('R') + ' rewind  ' + k('Esc') + ' skip%c{}',
            k('Spc') + ' ' + k('→') + ' ' + k('F') + ' ' + k('R') + ' ' + k('Esc') + '%c{}',
        ];
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].replace(/%c\{[^}]*\}/g, '').length <= width - 2) {
                return forms[i];
            }
        }
        return forms[forms.length - 1];
    },

    // Pressing game keys during the replay: a gentle reminder, at most every NAG_MS.
    nag: function () {
        let t = this.now();
        if (t - this.lastNag < this.NAG_MS) {
            return;
        }
        this.lastNag = t;
        Game.log.push(Flavor.line('playbackNag'));
        Game.drawMap();
    },

    // Logging and sounds are suppressed while skipping (only the report matters then).
    quiet: function () {
        return this.skipping === true;
    },

    // Everything the night says goes to the security log (the transcript), with the
    // camera clock; the message bar only gets it while the footage plays.
    transcript: [],

    record: function (line) {
        if (line) {
            this.transcript.push({ clock: this.clockText(), text: line });
        }
    },

    say: function (pool, vars, optional = false) {
        if (optional) {
            if (this.optionalLogged) {
                return '';
            }
            this.optionalLogged = true;
        }
        vars = vars || {};
        vars.hero = '%c{' + this.heroColor() + '}' + this.hero.short + '%c{}';
        let line = Flavor.line(pool, vars);
        this.record(line);
        if (line != "" && !this.quiet()) {
            Game.log.push(line);
        }
        return line;
    },

    sound: function (name) {
        if (!this.quiet()) {
            Sfx.play(name);
        }
    },

    flash: function (x, y) {
        this.flashes[x + ',' + y] = 2;
    },

    monsterName: function (monster) {
        return '%c{' + monster.color + '}' + monster.name + '%c{}';
    },

    event: function (type, data) {
        data = data || {};
        switch (type) {
            case 'turn':
                this.turn++;
                this.clockMinutes++;
                Game.log.markStale(); // last turn's lines dim, this turn's stay bright
                this.optionalLogged = false;
                for (let key in this.flashes) {
                    this.flashes[key]--;
                    if (this.flashes[key] <= 0) {
                        delete this.flashes[key];
                    }
                }
                if (Flavor.chance(0.04)) {
                    let cry = this.say('heroCry', {}, true);
                    if (cry) {
                        this.beat('cry', cry);
                    }
                }
                else if (Flavor.chance(0.03)) {
                    let quip = this.say('heroQuip', {}, true);
                    if (quip) {
                        this.beat('quip', quip);
                    }
                }
                break;
            case 'enter':
                this.beat('enter', this.say('heroEnter'));
                if (Flavor.chance(0.3) && this.roster.length > 0) {
                    this.say('heroAmulet');
                    this.say('rodneyReply', { monster: this.monsterName(Flavor.rng.getItem(this.roster)) });
                }
                this.sound('fanfareIn');
                break;
            case 'hit':
                this.stats.hits++;
                this.beat('hit');
                this.flash(data.monster.x, data.monster.y);
                this.say('heroHit', { monster: this.monsterName(data.monster) });
                this.sound('hit');
                if (data.monster.hp > 0 && ROT.RNG.getUniform() < 0.5) {
                    this.say('monsterPain', { monster: this.monsterName(data.monster) }, true);
                    this.sound('yelp');
                }
                break;
            case 'faint':
                this.stats.fainted++;
                this.bodies.push({ x: data.monster.x, y: data.monster.y, char: data.monster.char });
                this.beat('faint', this.say('monsterFaint', { monster: this.monsterName(data.monster) }));
                this.sound('faint');
                break;
            case 'loot':
                this.stats.lootSmashed++;
                this.beat('loot', this.say('lootSmash', { item: data.entity.name.toLowerCase() }));
                this.sound('smash');
                break;
            case 'door':
                this.stats.doors++;
                this.beat('door', this.say('doorKick'));
                this.sound('door');
                break;
            case 'zap':
                this.beat('snack', this.say('zap', {wand: data.wand, effect: data.effect}, true));
                this.sound('spray');
                break;
            case 'ring':
                this.beat('snack', this.say('ring', {}, true));
                break;
            case 'purse':
                this.beat('snack', this.say('purse', {}, true));
                this.sound('coins');
                break;
            case 'snack':
                this.stats.snacks++;
                this.beat('snack', this.say('snack', {}, true));
                this.sound('munch');
                break;
            case 'potion':
                this.stats.potions++;
                this.beat('potion', this.say('potion'));
                this.sound('gulp');
                break;
            case 'special':
                this.stats.specials++;
                this.beat('special', this.say('special_' + data.cls));
                this.sound('spray');
                break;
            case 'graffiti':
                this.stats.graffiti++;
                this.beat('graffiti', this.say('graffiti', { item: ROT.RNG.getItem(Flavor.pools.graffitiTags) }));
                this.sound('spray');
                break;
            case 'lost':
                this.say('heroLost');
                this.say('monsterDirections', { monster: this.monsterName(data.monster) });
                this.beat('lost');
                break;
            case 'scroll':
                this.say('scrollRead');
                this.say('scrollOutcome_' + data.outcome);
                this.sound('spray');
                this.beat('scroll');
                break;
            case 'backIn5':
                this.say('backIn5', { monster: this.monsterName(data.monster) });
                this.beat('backIn5');
                break;
            case 'saveScum': {
                this.say('saveScum');
                let awake = this.roster.filter(function (m) { return m.hp > 0; });
                if (awake.length > 0) {
                    this.say('saveScumReply', { monster: this.monsterName(Flavor.rng.getItem(awake)) });
                }
                this.sound('gulp');
                this.beat('saveScum');
                break;
            }
            case 'elbereth':
                this.stats.graffiti++;
                this.say('elbereth');
                if (data.monster) {
                    this.say('elberethReply', { monster: this.monsterName(data.monster) });
                }
                this.sound('spray');
                this.beat('elbereth');
                break;
            case 'heroHurt':
                this.stats.heroHurt++;
                this.flash(Game.adventurer.x, Game.adventurer.y);
                this.beat('heroHurt', this.say('heroHurt', {}, true));
                this.sound('heroHurt');
                break;
        }
    },

    reportCutscene: function () {
        let s = this.stats;
        let lines = [
            '%c{#ff0}Invasion report:%c{} %c{' + this.heroColor() + '}' + this.hero.full + '%c{} has left the building.',
            'Monsters fainted (theatrically): ' + s.fainted,
            'Loot smashed: ' + s.lootSmashed + '   Doors kicked: ' + s.doors,
            'Snacks eaten on duty: ' + s.snacks + '   Potions quaffed: ' + s.potions,
            'Blood puddles (fake): ' + s.bloodPuddles + '   Walls vandalised: ' + s.graffiti,
            this.classStat() + ': ' + s.specials,
        ];
        // one screen for the whole report: a single Enter to read it all
        return [{ message: lines.join('\n'), any: -1 }];
    },

    // --- Hand-over: the pause between the hero leaving and the shift starting ---
    // 'linger'  the camera stays on the empty stairs for a moment,
    // 'curtain' the screen closes from the top and bottom,
    // 'card'    a title card for the night shift,
    // then clockIn() moves everyone to the lounge and the player takes over.
    LINGER_MS: 2500,
    SKIP_LINGER_MS: 800,
    CURTAIN_MS: 1200,
    CARD_MS: 4500,
    TICK_MS: 40,
    stage: null,
    stageStart: 0,
    stageEnd: 0,
    exitSpot: null,
    cardLines: [],
    handoverTimer: null,

    now: function () {
        return Date.now();
    },

    handover: function (x, y) {
        let skipped = this.skipping;
        this.skipping = false; // the exit line and sound play even after a skip
        this.say('heroExit');
        this.sound('fanfareOut');
        if (this.instant) {
            this.clockIn();
            return;
        }
        this.exitSpot = { x: x, y: y };
        Game.engine.lock();
        this.setStage('linger', skipped ? this.SKIP_LINGER_MS : this.LINGER_MS);
    },

    setStage: function (stage, ms) {
        this.stage = stage;
        this.stageStart = this.now();
        this.stageEnd = this.stageStart + ms;
        Game.drawMap();
        this.tick();
    },

    // Fraction of the current stage that has gone by (0..1).
    stageProgress: function () {
        let len = this.stageEnd - this.stageStart;
        return len > 0 ? Math.max(0, Math.min(1, (this.now() - this.stageStart) / len)) : 1;
    },

    tick: function () {
        let self = this;
        this.handoverTimer = setTimeout(function () {
            self.handoverTimer = null;
            if (self.stage == null) {
                return;
            }
            if (self.now() < self.stageEnd) {
                if (self.stage == 'curtain') {
                    Game.drawMap();
                }
                self.tick();
                return;
            }
            if (self.stage == 'linger') {
                self.setStage('curtain', self.CURTAIN_MS);
            }
            else if (self.stage == 'curtain') {
                self.cardLines = self.makeCard();
                self.setStage('card', self.CARD_MS);
            }
            else {
                self.clockIn();
            }
        }, this.TICK_MS);
    },

    makeCard: function () {
        return [
            '%c{#777}~ ~ ~%c{}',
            '',
            '%c{#ff0}' + Flavor.line('cardTitle', {}).replace('{day}', Game.day) + '%c{}',
            '',
            Flavor.line('cardLine', {}),
            '',
            '%c{#777}~ ~ ~%c{}',
        ];
    },

    // Rows of the map area hidden by the closing curtain, counted from each edge.
    curtainRows: function (mapRows) {
        if (this.stage != 'curtain') {
            return 0;
        }
        return Math.ceil(this.stageProgress() * Math.ceil(mapRows / 2));
    },

    clockIn: function () {
        let locked = this.stage != null;
        if (this.handoverTimer != null) {
            clearTimeout(this.handoverTimer);
            this.handoverTimer = null;
        }
        this.stage = null;
        this.exitSpot = null;
        Game.moveMonstersToLounge();
        Game.scheduler.add(Game.player, true);
        this.finish();
        if (locked) {
            Game.engine.unlock();
        }
    },

    classStat: function () {
        let a = Game.adventurer;
        let def = a && a.heroClass ? Adventurer.classes[a.heroClass] : null;
        return def ? def.stat : 'Heroic deeds';
    },

    heroColor: function () {
        return Game.adventurer ? Game.adventurer.color : '#0ff';
    },

    finish: function () {
        this.skipping = false;
        this.fast = false;
        this.paused = false;
        this.held = false;
        this.gate = null;
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.say('monstersGetUp');
        this.say('shiftBegins');
        this.bodies = [];
        this.flashes = {};
        Game.forgetMap();
        this.stats.bloodPuddles = 0;
        for (let key in Game.map) {
            if (Game.map[key].mess != null && Game.map[key].mess.kind == '"Blood"') {
                this.stats.bloodPuddles++;
            }
        }
        Game.player.cutscene = ConversationBuilder.chainCutscenes(this.reportCutscene(), Game.player.cutscene);
        Game.phase = 'cleaning';
        DayEvents.start(); // the memo, and maybe a visitor or a birthday (or a ghost of an earlier hero)
        Game.pastHeroes.push({ full: this.hero.full, cls: this.hero.cls });
        Game.amuletStolen = Flavor.chance(0.25); // tomorrow's memo may mention it
        this.tapeTip();
    },

    TAPE_COMMENT_CHANCE: 0.35,

    // A comrade in the staff room mentions the security log: always on day 1
    // (that's how you learn about Tab), now and then on later mornings.
    tapeTip: function () {
        let pool = Game.day <= 1 ? 'tapeTip' : 'tapeComment';
        if (pool == 'tapeComment' && !Flavor.chance(this.TAPE_COMMENT_CHANCE)) {
            return;
        }
        let crew = this.roster.filter(function (m) { return m.alive && m.retired; });
        if (crew.length == 0) {
            crew = Game.monsterList.filter(function (m) { return m.alive; });
        }
        if (crew.length == 0) {
            return;
        }
        let line = Flavor.line(pool, { monster: this.monsterName(Flavor.rng.getItem(crew)) });
        if (line) {
            Game.log.push(line);
        }
    },
};

if (typeof module !== 'undefined') module.exports = Invasion;
