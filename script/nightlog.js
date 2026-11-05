// Last night's security log (Tab during the shift): everything the floating eye
// camera recorded, line by line with its clock, in a framed scrolling window.
var NightLog = {
    isOpen: false,
    WIDTH: 76,
    INDENT: 10, // "01:23 AM" and two spaces

    open: function () {
        this.isOpen = true;
        Ui.resetScroll('nightlog');
        Game.drawMap();
    },

    close: function () {
        this.isOpen = false;
        Game.drawMap();
    },

    // The transcript as window lines `width` characters wide: the clock, then the
    // text; long entries carry on underneath, indented past the clock.
    lines: function (width) {
        let indent = this.INDENT;
        let out = [];
        Invasion.transcript.forEach(function (entry) {
            let wrapped = Ui.wrapColored(entry.text, Math.max(10, width - indent));
            wrapped.forEach(function (line, i) {
                if (i == 0) {
                    out.push('%c{' + Ui.DIM + '}' + entry.clock + '%c{}  ' + line);
                }
                else {
                    out.push(' '.repeat(indent) + line);
                }
            });
        });
        if (out.length == 0) {
            out.push('%c{' + Ui.DIM + '}The tape is blank. The floating eye blinked.%c{}');
        }
        return out;
    },

    windowWidth: function () {
        return Math.max(20, Math.min(Game.screenSize[0] - 2, this.WIDTH));
    },

    options: function () {
        let k = Ui.key;
        let n = Invasion.transcript.length;
        return {
            id: 'nightlog',
            title: 'Security Log · Cam ' + Invasion.camera,
            color: '#8cf',
            width: this.WIDTH,
            top: [
                '%c{' + Invasion.heroColor() + '}' + Invasion.hero.full + '%c{}' + '%c{' + Ui.DIM + '} · ' + n + (n == 1 ? ' entry' : ' entries') + '%c{}',
                '',
            ],
            body: this.lines(this.windowWidth() - 4),
            footer: k('[↑↓]') + ' scroll  ' + k('[PgUp/PgDn]') + ' page  ' + k('[Home/End]') + ' start/end  ' + k('[Tab]') + ' close',
        };
    },

    draw: function () {
        Ui.window(this.options());
    },

    handleKey: function (e) {
        let code = e.keyCode;
        if (e.preventDefault) {
            e.preventDefault(); // Tab must not move the browser's focus
        }
        if (code == 9 || code == 27 || code == 8 || code == 88) {
            this.close();
            return;
        }
        let page = Math.max(1, Ui.bodyRows(this.options()) - 1);
        if (code == 38 || code == 104) {
            Ui.scrollBy('nightlog', -1);
        }
        else if (code == 40 || code == 98) {
            Ui.scrollBy('nightlog', 1);
        }
        else if (code == 33 || code == 105) {
            Ui.scrollBy('nightlog', -page);
        }
        else if (code == 34 || code == 99) {
            Ui.scrollBy('nightlog', page);
        }
        else if (code == 36 || code == 103) {
            Ui.resetScroll('nightlog');
        }
        else if (code == 35 || code == 97) {
            Ui.offsets.nightlog = Infinity; // the window clamps it to the last page
        }
        Game.drawMap();
    },
};

if (typeof module !== 'undefined') module.exports = NightLog;
