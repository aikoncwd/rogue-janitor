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
