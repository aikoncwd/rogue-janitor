// NetHack-style extended commands (#pray, #xyzzy, #name...), the quit joke, the
// Konami code, and the hints colleagues drop about them.
var EasterEggs = {
    prompt: null,        // null, or what has been typed after '#'
    quitPending: false,
    MAX_PROMPT: 24,
    MAX_NAME: 20,
    KONAMI: [38, 38, 40, 40, 37, 39, 37, 39, 66, 65],
    history: [],
    tried: {},

    openPrompt: function () {
        this.prompt = '';
        Game.drawMap();
    },

    closePrompt: function () {
        this.prompt = null;
    },

    promptText: function () {
        return '%c{#ff0}#%c{} ' + this.prompt + '_';
    },

    // Keys while the prompt is open or the quit question is pending. Returns
    // true when the key was used here (and must not reach the game).
    handleKey: function (e) {
        if (this.quitPending) {
            this.quitPending = false;
            if (e.keyCode == 89) { // y
                Game.sendMessage("You can't. Your shift isn't over. (Union rules.)");
            }
            else if (e.keyCode == 78) { // n
                Game.sendMessage("Good choice.");
            }
            Game.drawMap();
            return true;
        }
        if (this.prompt == null) {
            return false;
        }
        if (e.keyCode == 13) {
            let command = this.prompt;
            this.prompt = null;
            this.run(command);
        }
        else if (e.keyCode == 27) {
            this.prompt = null;
        }
        else if (e.keyCode == 8) {
            this.prompt = this.prompt.slice(0, -1);
        }
        else if (typeof e.key == 'string' && e.key.length == 1 && this.prompt.length < this.MAX_PROMPT) {
            this.prompt += e.key;
        }
        Game.drawMap();
        return true;
    },

    askQuit: function () {
        this.tried.quit = true;
        this.quitPending = true;
        Game.sendMessage("Really quit? And leave the mess for the next janitor? [yn]");
    },

    run: function (command) {
        let words = command.trim().split(/\s+/);
        let verb = (words[0] || '').toLowerCase();
        let rest = command.trim().slice(words[0] ? words[0].length : 0).trim();
        switch (verb) {
            case 'pray':
                this.tried.pray = true;
                // kept in the run: saved with it, and forgotten when a new run starts
                if (Game.run.prayedDay != Game.day) {
                    Game.run.prayedDay = Game.day;
                    Game.sendMessage("You feel a hopeful feeling. The bucket refills.");
                }
                else {
                    Game.sendMessage("You feel that the Mop God is displeased.");
                }
                break;
            case 'xyzzy':
                this.tried.xyzzy = true;
                Achievements.unlock('xyzzy');
                Game.sendMessage("Nothing happens.");
                break;
            case 'elbereth':
                this.tried.elbereth = true;
                Game.sendMessage("You write Elbereth in the dust with your mop. Then you mop it.");
                break;
            case 'name':
                this.tried.name = true;
                if (rest == '') {
                    Game.sendMessage("Name your mop what? (#name Sir Swishalot)");
                    break;
                }
                rest = rest.slice(0, this.MAX_NAME);
                try {
                    localStorage.setItem('rj-mop', rest);
                }
                catch (err) {
                    // storage unavailable: the name lasts for this session
                }
                this.sessionName = rest;
                Game.sendMessage("You call your mop: " + rest + ".");
                break;
            case 'chat':
                this.tried.chat = true;
                Game.sendMessage("You talk to yourself. You agree with yourself.");
                break;
            case 'quit':
                this.askQuit();
                break;
            default:
                Game.sendMessage("Unknown extended command. (Try #pray.)");
        }
    },

    mopName: function () {
        try {
            let saved = localStorage.getItem('rj-mop');
            if (saved) {
                return saved;
            }
        }
        catch (err) {
            // storage unavailable
        }
        return this.sessionName || null;
    },

    // Passive: every key during the shift; movement still happens as usual.
    track: function (code) {
        this.history.push(code);
        if (this.history.length > this.KONAMI.length) {
            this.history.shift();
        }
        if (this.history.join(',') == this.KONAMI.join(',')) {
            this.history = [];
            this.tried.konami = true;
            Achievements.unlock('konami');
            Game.sendMessage("You feel like you have 30 extra lives. You still only have one mop.");
            Sfx.play('fanfareIn');
        }
    },

    // --- hints dropped by colleagues ---

    hintWeights: function () {
        let w = {};
        for (let k in Lore.hints) {
            w[k] = this.tried[k] ? 0.25 : 1;
        }
        return w;
    },

    // A hint nobody has given yet today, or null.
    pickHint: function () {
        let used = Game.hintsToday;
        let weights = {};
        let all = this.hintWeights();
        for (let k in all) {
            if (Lore.hints[k].some(function (h) { return used.indexOf(h) < 0; })) {
                weights[k] = all[k];
            }
        }
        if (Object.keys(weights).length == 0) {
            return null;
        }
        let key = Flavor.rng.getWeightedValue(weights);
        let fresh = Lore.hints[key].filter(function (h) { return used.indexOf(h) < 0; });
        let hint = Flavor.rng.getItem(fresh);
        used.push(hint);
        return hint;
    },
};

if (typeof module !== 'undefined') module.exports = EasterEggs;
