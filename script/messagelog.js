// Scrolling message log. Newest line last; "fresh" lines were added since the
// player's last move and are drawn brighter.
function MessageLog(max = 50) {
    this.max = max;
    this.lines = [];
}

MessageLog.prototype.push = function (text) {
    let last = this.lines[this.lines.length - 1];
    if (last && last.text == text) {
        last.fresh = true;
        return;
    }
    this.lines.push({ text: text, fresh: true });
    if (this.lines.length > this.max) {
        this.lines.splice(0, this.lines.length - this.max);
    }
};

MessageLog.prototype.markStale = function () {
    for (let i = 0; i < this.lines.length; i++) {
        this.lines[i].fresh = false;
    }
};

MessageLog.prototype.recent = function (n) {
    return this.lines.slice(Math.max(0, this.lines.length - n));
};

MessageLog.prototype.clear = function () {
    this.lines = [];
};

if (typeof module !== 'undefined') module.exports = MessageLog;
