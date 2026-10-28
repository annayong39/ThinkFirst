const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/interactions.js', 'utf8');
const zoomCode = source.slice(source.indexOf('var ZMIN = 0.4'), source.indexOf('/* map: zoom only through the buttons'));
let scrollX = 0;
const frames = [];
const cards = [
  { left: 700, right: 900 },
  { left: 1200, right: 1400 }
];
const context = {
  mapZoom: 0.8,
  innerWidth: 1200,
  innerHeight: 800,
  S: {},
  window: { scrollBy(x) { scrollX += x; } },
  document: {
    documentElement: { style: { setProperty() {} } },
    querySelectorAll() { return [section]; },
    querySelector() { return section; }
  },
  $(id) { return id === 'map' ? map : { textContent: '' }; },
  clamp(value, low, high) { return Math.max(low, Math.min(high, value)); },
  requestAnimationFrame(callback) { frames.push(callback); },
  layoutTermRow() {}, renderWires() {}, positionMull() {}, follow() {}
};
const section = {
  getBoundingClientRect() { return { top: 0, bottom: 1000 }; },
  getAttribute() { return 'l2'; },
  querySelectorAll() { return cards.map(card => ({
    getClientRects() { return [{}]; },
    getBoundingClientRect() { return { left: card.left * context.mapZoom - scrollX, right: card.right * context.mapZoom - scrollX }; }
  })); }
};
const map = { getBoundingClientRect() { return { left: -scrollX, top: 0 }; } };
vm.createContext(context);
vm.runInContext(zoomCode, context);

context.setZoom(1);
while (frames.length) frames.shift()();
assert.equal(context.mapZoom, 1, 'Zoom in works when the Evidence cards can fit');
assert.ok(cards[0].left - scrollX >= 0 && cards[1].right - scrollX <= context.innerWidth,
  'The Evidence cluster is brought into the viewport after zooming');

scrollX = 0;
context.mapZoom = 0.8;
cards[0] = { left: 0, right: 200 };
cards[1] = { left: 1900, right: 2100 };
context.setZoom(1);
assert.equal(context.mapZoom, 0.8, 'Zoom does not enlarge a map already wider than the viewport');
console.log('PASS: zoom recenters visible Evidence cards and avoids enlarging an already clipped map');
