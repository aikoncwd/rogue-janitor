// The hero invasion: a non-interactive, paced replay of the adventurer storming the
// dungeon, told from the monsters' point of view. Receives events from the
// adventurer/monster code, keeps stats, bodies and hit flashes, and hands over
// to the player when the hero leaves.
var Invasion = {
    instant: false, // run every hero turn without delay (tests)
    FAST_FACTOR: 4,
    // Rhythm of the replay (ms): quick through empty corridors, a beat when
    // something comes into view, and holds long enough to read the good bits.
    BEATS: { quiet: 50, spot: 400, hit: 200, combo: 150, faint: 700, loot: 450, door: 350, heroHurt: 250,
        snack: 900, potion: 1100, special: 1100, graffiti: 1100, enter: 1200, cry: 900 },
    SPEECH: ['snack', 'potion', 'special', 'graffiti', 'enter', 'cry'],
    hold: 0,
    combo: 0,
    hitThisTurn: false,
    speaking: false,
    lastTargets: 0,
    fast: false,
    skipping: false,
    timer: null,
    engineStarted: false,

    // Hands control to the hero: called when the intro screen is dismissed (day 1)
    // or when a new day's dungeon is generated (the player's pending unlock resumes it).
    start: function () {
        Game.phase = 'invasion';
        Game.stopQuestBlink();
        Game.drawMap();
        if (!this.engineStarted) {
            this.engineStarted = true;
            Game.engine.start();
        }
    },

    // Records a beat this turn: the turn waits for its longest beat, and a line
    // to read adds a little time (capped).
    beat: function (name, line) {
        let plainLength = line ? line.replace(/%c\{[^}]*\}/g, '').length : 0;
        let ms = this.BEATS[name] + Math.min(500, plainLength * 10);
        this.hold = Math.max(this.hold, ms);
        if (this.SPEECH.indexOf(name) >= 0) {
            this.speaking = true;
        }
    },

    // Delay before the next hero turn.
    turnDelay: function () {
        let ms = this.hold || this.BEATS.quiet;
        return this.fast ? ms / this.FAST_FACTOR : ms;
    },

    // Called after every active hero turn: pause the engine and resume on a timer.
    // Beats are reset only after scheduling, so what monsters do between hero
    // turns counts toward the next one.
    afterHeroTurn: function () {
        let targets = Game.adventurer ? Game.adventurer.targets.length : 0;
        if (targets > this.lastTargets) {
            this.beat('spot');
        }
        this.lastTargets = targets;
        this.combo = this.hitThisTurn ? this.combo + 1 : 0;
        this.hitThisTurn = false;
        if (this.instant || this.skipping || Game.phase != 'invasion') {
            this.hold = 0;
            this.speaking = false;
            return;
        }
        let ms = this.turnDelay();
        Game.engine.lock();
        Game.drawMap();
        this.hold = 0;
        this.speaking = false;
        this.resumeIn(ms);
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
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
            Game.engine.unlock();
        }
    },

    handleKey: function (code) {
        if (Game.phase == 'intro') {
            this.start();
            return true;
        }
        if (this.stage != null) {
            this.clockIn(); // any key hurries the hand-over along
            return true;
        }
        if (Game.player.talking != null) {
            return false; // a conversation owns the keys (e.g. the night screen before day 2)
        }
        if (Game.phase == 'invasion') {
            if (code == 32) {
                this.fast = !this.fast;
                if (this.timer != null) { // rescale the wait that is already running
                    let left = Math.max(0, this.timerDue - this.now());
                    clearTimeout(this.timer);
                    this.timer = null;
                    this.resumeIn(this.fast ? left / this.FAST_FACTOR : left * this.FAST_FACTOR);
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
        this.hold = 0;
        this.combo = 0;
        this.hitThisTurn = false;
        this.speaking = false;
        this.lastTargets = 0;
    },

    // --- Playback banner: the invasion is last night's security footage ---
    clockMinutes: 60,
    camera: 3,
    lastNag: -Infinity,
    NAG_MS: 5000,
    // Besides every movement key in Player.keyMap: action letters m p g f r o c x e,
    // and the wait keys . / 5 / numpad 5 (NumLock off).
    NAG_KEYS: [77, 80, 71, 70, 82, 79, 67, 88, 69, 190, 53, 12, 101],

    clockText: function () {
        let h24 = Math.floor(this.clockMinutes / 60) % 24;
        let m = this.clockMinutes % 60;
        let h12 = h24 % 12 == 0 ? 12 : h24 % 12;
        let pad = function (n) { return (n < 10 ? '0' : '') + n; };
        return pad(h12) + ':' + pad(m) + (h24 < 12 ? ' AM' : ' PM');
    },

    // One line for the top of the map, shortened to fit `width` columns.
    bannerText: function (width) {
        let dot = '%c{' + (this.turn % 4 < 2 ? '#f00' : '#400') + '}●%c{}';
        let play = this.fast ? '▶▶ x' + this.FAST_FACTOR : '▶';
        let clock = this.clockText();
        let forms = [
            '%c{#aaa}[ ' + dot + '%c{#aaa} REC  ' + play + ' PLAYBACK · CAM ' + this.camera + ' (floating eye) · ' + clock + ' ]%c{}  %c{#777}just watch - no input needed%c{}',
            '%c{#aaa}[ ' + dot + '%c{#aaa} REC  ' + play + ' PLAYBACK · CAM ' + this.camera + ' (floating eye) · ' + clock + ' ]%c{}',
            '%c{#aaa}[ ' + dot + '%c{#aaa} REC  ' + play + ' PLAYBACK · ' + clock + ' ]%c{}',
        ];
        for (let i = 0; i < forms.length; i++) {
            if (forms[i].replace(/%c\{[^}]*\}/g, '').length <= width - 2) {
                return forms[i];
            }
        }
        return dot + '%c{#aaa} REC ' + play + ' ' + clock + '%c{}';
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

    say: function (pool, vars, optional = false) {
        if (this.quiet()) {
            return '';
        }
        if (optional) {
            if (this.optionalLogged) {
                return '';
            }
            this.optionalLogged = true;
        }
        vars = vars || {};
        vars.hero = '%c{' + this.heroColor() + '}' + this.hero.short + '%c{}';
        let line = Flavor.line(pool, vars);
        if (line != "") {
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
                break;
            case 'enter':
                this.beat('enter', this.say('heroEnter'));
                this.sound('fanfareIn');
                break;
            case 'hit':
                this.stats.hits++;
                this.beat(this.combo >= 2 ? 'combo' : 'hit');
                this.hitThisTurn = true;
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
            if (Game.map[key].mess != null && Game.map[key].mess.name == '"Blood"') {
                this.stats.bloodPuddles++;
            }
        }
        Game.player.cutscene = ConversationBuilder.chainCutscenes(this.reportCutscene(), Game.player.cutscene);
        Game.phase = 'cleaning';
    },
};

if (typeof module !== 'undefined') module.exports = Invasion;
