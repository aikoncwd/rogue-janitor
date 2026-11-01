// The end of the run (after the day-5 shift): a short epilogue, one page per Enter,
// then a results card made for screenshots, which C copies as plain text.
// Two endings and no losing: the Mop of Yendor, or a promotion anyway.
var Ending = {
    CARD_W: 46, // inner width of the card
    kind: null, // 'mop' | 'senior'
    page: 0,
    onCard: false,
    copyStatus: null, // null | 'copied' | 'manual'
    review: null,

    start: function (kind) {
        this.kind = kind;
        this.page = 0;
        this.onCard = false;
        this.copyStatus = null;
        this.review = this.pickReview();
        Game.phase = 'ending';
        Game.drawMap();
    },

    lines: function () {
        return this.kind == 'mop' ? Lore.endingMop : Lore.endingSenior;
    },

    title: function () {
        return this.kind == 'mop' ? 'Mop of Yendor ✔' : 'Senior Janitor ☕';
    },

    pickReview: function () {
        let names = (Game.run.chattedWith || []).slice();
        if (names.length == 0) {
            names = Game.monsterList.filter(function (m) { return m.tags && m.tags.monster && !m.tags.visitor; }).map(function (m) { return m.name; });
        }
        let who = names.length > 0 ? Flavor.rng.getItem(names) : 'the staff lounge';
        return { quote: Flavor.rng.getItem(Lore.comradeReviews), who: who };
    },

    stats: function () {
        let r = Game.run;
        let pcts = r.cleanPcts || [];
        let avg = pcts.length > 0 ? Math.round(pcts.reduce(function (a, b) { return a + b; }, 0) / pcts.length) : 0;
        return {
            points: Game.yendorPoints,
            avg: avg,
            grades: (r.grades || []).join(' '),
            requests: r.requestsDone || 0,
            friends: (r.chattedWith || []).length,
            zorkmids: r.zorkmidsEarned || 0,
        };
    },

    shareText: function () {
        let s = this.stats();
        return 'Rogue Janitor — ' + this.title() + '\n' +
            Game.LAST_DAY + ' days · ' + s.points + ' pts · avg ' + s.avg + '% · ' + s.grades + '\n' +
            '"' + this.review.quote + '" — ' + this.review.who;
    },

    wrap: function (text, width) {
        let out = [];
        let line = '';
        text.split(' ').forEach(function (w) {
            if (line.length > 0 && (line + ' ' + w).length > width) {
                out.push(line);
                line = w;
            }
            else {
                line = line.length > 0 ? line + ' ' + w : w;
            }
        });
        out.push(line);
        return out;
    },

    // The framed results card; every line has the same visible width.
    cardLines: function () {
        let W = this.CARD_W;
        let s = this.stats();
        let pad = function (text, color) {
            let plain = text.replace(/%c\{[^}]*\}/g, '');
            let body = color ? '%c{' + color + '}' + text + '%c{}' : text;
            return '%c{#777}║%c{} ' + body + ' '.repeat(Math.max(0, W - 2 - plain.length)) + ' %c{#777}║%c{}';
        };
        let center = function (text, color) {
            let left = Math.floor((W - 2 - text.length) / 2);
            return pad(' '.repeat(Math.max(0, left)) + text, color);
        };
        let row = function (label, value) {
            return pad(label + ' '.repeat(Math.max(1, 22 - label.length)) + value);
        };
        let out = ['%c{#777}╔' + '═'.repeat(W) + '╗%c{}'];
        out.push(center('ROGUE JANITOR · RUN COMPLETE', '#fb3'));
        out.push(center(this.kind == 'mop' ? 'The Mop of Yendor is yours!' : 'Promoted to Senior Janitor!', '#ff0'));
        out.push(pad(''));
        out.push(row('Mop points', s.points + ' / ' + Game.targetPoints));
        out.push(row('Average clean', s.avg + '%'));
        out.push(row('Grades', s.grades));
        out.push(row('Requests done', String(s.requests)));
        out.push(row('Comrades befriended', String(s.friends)));
        out.push(row('Zorkmids earned', String(s.zorkmids)));
        let ach = Achievements.count();
        out.push(row('Achievements', (Game.run.newAchievements || []).length + ' new (' + ach.got + ' / ' + ach.total + ')'));
        if (Game.run.silliest) {
            out.push(row('Silliest purchase', Panel.fit(Game.run.silliest, W - 25)));
        }
        let mop = typeof EasterEggs != 'undefined' ? EasterEggs.mopName() : null;
        if (mop) {
            out.push(row('Your mop', mop));
        }
        let best = Game.loadBestRun();
        if (best != null) {
            out.push(row('Best run', best.points + ' pts'));
        }
        out.push(pad(''));
        let self = this;
        this.wrap('"' + this.review.quote + '"', W - 4).forEach(function (l) { out.push(center(l, '#ccc')); });
        out.push(center('— ' + this.review.who, '#777'));
        out.push(pad(''));
        if (this.copyStatus == 'copied') {
            out.push(center('Copied! Paste it anywhere.', '#0c0'));
        }
        else if (this.copyStatus == 'manual') {
            out.push(center('Copy failed. Type it or take a screenshot:', '#f88'));
            this.shareText().split('\n').forEach(function (l) {
                self.wrap(l, W - 4).forEach(function (w) { out.push(center(w, '#ccc')); });
            });
        }
        out.push(center('[C] copy result   [Enter] back to the title', '#777'));
        out.push('%c{#777}╚' + '═'.repeat(W) + '╝%c{}');
        return out;
    },

    copy: function () {
        let text = this.shareText();
        let self = this;
        let fallback = function () {
            try {
                if (typeof document != 'undefined' && document.createElement && document.execCommand && document.body) {
                    let area = document.createElement('textarea');
                    area.value = text;
                    area.style.position = 'fixed';
                    area.style.opacity = '0';
                    document.body.appendChild(area);
                    area.select();
                    let ok = document.execCommand('copy');
                    document.body.removeChild(area);
                    self.copyStatus = ok ? 'copied' : 'manual';
                    return;
                }
            }
            catch (e) {
                // fall through
            }
            self.copyStatus = 'manual';
        };
        try {
            if (typeof navigator != 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                this.copyStatus = 'copied';
                navigator.clipboard.writeText(text).then(function () {}, function () {
                    fallback();
                    Game.drawMap();
                });
            }
            else {
                fallback();
            }
        }
        catch (e) {
            fallback();
        }
        Game.drawMap();
    },

    handleKey: function (e) {
        if (!this.onCard) {
            if (e.keyCode == 13 || e.keyCode == 32 || e.keyCode == 27) {
                this.page++;
                if (this.page >= this.lines().length) {
                    this.onCard = true;
                }
                Game.drawMap();
            }
            return true;
        }
        if (e.keyCode == 67) {
            this.copy();
            return true;
        }
        if (e.keyCode == 13 || e.keyCode == 27) {
            Game.newRun();
            Game.phase = 'title';
            Title.start();
            Game.drawMap();
        }
        return true;
    },

    draw: function () {
        if (this.onCard) {
            Title.drawLines(this.cardLines(), true);
            return;
        }
        let cols = Game.screenSize ? Game.screenSize[0] : 80;
        let text = this.wrap(this.lines()[this.page], Math.max(20, Math.min(70, cols - 4)));
        Title.drawLines(text.concat(['', '%c{#777}Press [enter] to continue.%c{}']), false);
    },
};

if (typeof module !== 'undefined') module.exports = Ending;
