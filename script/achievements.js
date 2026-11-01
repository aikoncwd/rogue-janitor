// Achievements: silly little trophies, kept across runs, announced with a toast.
var Achievements = {
    KEY: 'rj-achievements',
    TOAST_MS: 3000,
    queue: [], // toasts waiting: {id, until}
    timer: null,

    LIST: [
        {id: 'firstDay', name: 'Clocked In', desc: 'Finish your first shift.'},
        {id: 'zeroWaste', name: 'Zero Waste', desc: 'End a shift with the dungeon 100% clean.'},
        {id: 'combo10', name: 'Streaky', desc: 'Reach a 10 combo.'},
        {id: 'combo30', name: 'I Can Stop Whenever I Want', desc: 'Reach a 30 combo.'},
        {id: 'slips10', name: 'Floor Is Lava (Not Really)', desc: 'Slip 10 times in one run.'},
        {id: 'fortunes5', name: 'Cookie Monster', desc: 'Read 5 fortune cookies in one run.'},
        {id: 'secret', name: 'You Found Me', desc: 'Find a secret passage.'},
        {id: 'petting', name: 'Pet Whisperer', desc: 'Pet one of the fuzzy animals.'},
        {id: 'ring', name: 'My Precious (Maybe)', desc: 'Pocket a ring the hero left behind.'},
        {id: 'elbereth', name: 'Elbereth Eraser', desc: 'Mop away an Elbereth engraving.'},
        {id: 'mimic', name: 'It Was a Mimic All Along', desc: 'Try to mop a stain that is secretly a mimic.'},
        {id: 'synergy', name: 'Workplace Synergy', desc: 'Chat with every colleague in the lounge in one day.'},
        {id: 'goals2', name: 'Overachiever', desc: 'Finish both of the day\'s goals.'},
        {id: 'vacuum4', name: 'Suck It Up', desc: 'Vacuum 4 bits of fluff in one go.'},
        {id: 'firstBuy', name: 'Buyer\'s Remorse', desc: 'Buy something useless from the shop.'},
        {id: 'spend100', name: 'Big Spender', desc: 'Spend 100 zorkmids on absolutely nothing.'},
        {id: 'keepsake', name: 'Sentimental', desc: 'Receive a keepsake from a colleague.'},
        {id: 'endingMop', name: 'Mop of Yendor', desc: 'Earn the legendary Mop of Yendor.'},
        {id: 'endingSenior', name: 'Senior Janitor', desc: 'Get promoted anyway.'},
        {id: 'xyzzy', name: 'Nothing Happens', desc: 'Say the magic word.', hidden: true},
        {id: 'konami', name: 'Thirty Lives', desc: 'Enter a certain famous code.', hidden: true},
        {id: 'dragon', name: 'Let Sleeping Dragons Lie', desc: 'Get past a sleeping dragon.'},
        {id: 'intern', name: 'HR Was Informed', desc: 'Send the intern to "training".'},
    ],

    now: function () {
        return Date.now();
    },

    load: function () {
        try {
            let got = JSON.parse(localStorage.getItem(this.KEY));
            return got && typeof got == 'object' ? got : {};
        }
        catch (e) {
            return {};
        }
    },

    has: function (id) {
        return !!this.load()[id];
    },

    def: function (id) {
        return this.LIST.find(function (a) { return a.id == id; });
    },

    // Unlocks an achievement once and queues its toast. True when it is new.
    unlock: function (id) {
        let got = this.load();
        if (got[id] || this.def(id) == null) {
            return false;
        }
        got[id] = true;
        try {
            localStorage.setItem(this.KEY, JSON.stringify(got));
        }
        catch (e) {
            // storage unavailable: still celebrate today
        }
        if (Game.run) {
            Game.run.newAchievements = Game.run.newAchievements || [];
            Game.run.newAchievements.push(id);
        }
        this.queue.push({id: id, until: null}); // shown (and timed) from the next cleaning-screen draw
        Sfx.play('fanfareIn');
        return true;
    },

    // Run counters with an achievement at a threshold.
    THRESHOLDS: {slips: ['slips10', 10], fortunes: ['fortunes5', 5]},
    bump: function (name) {
        let counts = Game.run.counts = Game.run.counts || {};
        counts[name] = (counts[name] || 0) + 1;
        let t = this.THRESHOLDS[name];
        if (t && counts[name] >= t[1]) {
            this.unlock(t[0]);
        }
    },

    count: function () {
        let got = this.load();
        let n = this.LIST.filter(function (a) { return got[a.id]; }).length;
        return {got: n, total: this.LIST.length};
    },

    // The toast to show now, if any: {text, name}.
    toast: function () {
        let t = this.now();
        while (this.queue.length > 0) {
            let head = this.queue[0];
            if (head.until == null) {
                head.until = t + this.TOAST_MS;
            }
            if (t <= head.until) {
                return {title: '★ Achievement unlocked!', name: this.def(head.id).name};
            }
            this.queue.shift();
        }
        return null;
    },

    scheduleRedraw: function () {
        if (this.timer != null || typeof setTimeout == 'undefined') {
            return;
        }
        let self = this;
        this.timer = setTimeout(function () {
            self.timer = null;
            if (Game.display != null && Effects.canRedraw()) {
                Game.drawMap();
            }
            if (self.queue.length > 0) {
                self.scheduleRedraw();
            }
        }, 500);
    },

    // Draws the current toast in the top-right corner of the map viewport.
    drawToast: function () {
        let t = this.toast();
        if (t == null || Game.layoutInfo == null) {
            return;
        }
        let w = Math.max(t.title.length, t.name.length) + 4;
        let x0 = Math.max(0, Game.layoutInfo.mapCols - w - 1);
        let rows = [
            '┌' + '─'.repeat(w - 2) + '┐',
            '│ ' + t.title + ' '.repeat(w - 3 - t.title.length) + '│',
            '│ ' + t.name + ' '.repeat(w - 3 - t.name.length) + '│',
            '└' + '─'.repeat(w - 2) + '┘',
        ];
        let y0 = 1;
        // never over the janitor: drop to the bottom-right instead
        let px = Game.offset[0], py = Game.offset[1];
        if (px >= x0 && px < x0 + w && py >= y0 && py < y0 + rows.length) {
            y0 = Math.max(0, Game.layoutInfo.mapRows - rows.length - 1);
        }
        for (let r = 0; r < rows.length; r++) {
            for (let c = 0; c < rows[r].length; c++) {
                Game.display.draw(x0 + c, y0 + r, rows[r][c], '#fb3', '#222');
            }
        }
        Game.display.drawText(x0 + 2, y0 + 1, '%c{#ff0}%b{#222}' + t.title);
        Game.display.drawText(x0 + 2, y0 + 2, '%c{#fff}%b{#222}' + t.name);
        this.scheduleRedraw(); // to take it down when its time is up
    },

    listLines: function (width) {
        let got = this.load();
        let c = this.count();
        let out = ['%c{#fb3}ACHIEVEMENTS  ' + c.got + ' / ' + c.total + '%c{}', ''];
        this.LIST.forEach(function (a) {
            if (got[a.id]) {
                out.push('%c{#ff0}★ ' + a.name + '%c{} %c{#777}- ' + a.desc + '%c{}');
            }
            else if (a.hidden) {
                out.push('%c{#555}☆ ??? - a secret%c{}');
            }
            else {
                out.push('%c{#777}☆ ' + a.name + ' - ' + a.desc + '%c{}');
            }
        });
        out.push('');
        out.push('%c{#777}Press any key.%c{}');
        return out;
    },
};

if (typeof module !== 'undefined') module.exports = Achievements;
