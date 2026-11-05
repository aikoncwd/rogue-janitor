const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { DEFAULT_FILES } = require('./harness');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('index.html declares UTF-8 so box-drawing glyphs in scripts render', () => {
    assert.match(html, /<meta charset="utf-8">/i);
});

test('index.html loads the same scripts, in the same order, as the test harness', () => {
    const scripts = [...html.matchAll(/<script src="(script\/[^"]+)"><\/script>/g)].map(m => m[1]);
    assert.deepEqual(scripts, DEFAULT_FILES);
});

test('index.html loads nothing from the internet (it must run offline and on itch.io)', () => {
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1]);
    assert.ok(refs.includes('vendor/rot.js'));
    for (const r of refs) {
        assert.doesNotMatch(r, /^https?:/, r);
        assert.ok(fs.existsSync(path.join(__dirname, '..', r)), r + ' exists');
    }
});

test('the itch build packs everything the page loads', () => {
    const { files, zip, crc32 } = require('../tools/build-itch');
    const list = files();
    for (const f of DEFAULT_FILES.concat(['index.html', 'vendor/rot.js', 'style/style.css'])) {
        assert.ok(list.includes(f), f);
    }
    assert.strictEqual(crc32(Buffer.from('123456789')), 0xcbf43926);
    const z = zip([{ name: 'a.txt', data: Buffer.from('hello') }]);
    assert.strictEqual(z.readUInt32LE(0), 0x04034b50);
    assert.strictEqual(z.readUInt32LE(z.length - 22), 0x06054b50);
});

test('the page has a fallback without JavaScript and a label for the game', () => {
    assert.match(html, /<noscript>/);
    assert.match(html, /aria-label="[^"]+"/);
    assert.match(html, /name="viewport"/);
});
