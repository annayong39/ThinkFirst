const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/render.js', 'utf8');
const transition = source.slice(source.indexOf('function focusSec(){'), source.indexOf('function renderAll(){'));
function element(label) {
  const classes = new Set();
  return { textContent: label, style: {}, hidden: false, listeners: {},
    classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
    addEventListener(type, callback) { this.listeners[type] = callback; },
    setAttribute() {}, removeAttribute() {}, scrollIntoView() { this.scrolled = true; } };
}
const elements = { l1: element('Unpack'), l2: element('Evidence'), l3: element('Argue'),
  'evidence-finish': element('Finish Evidence'), 'finish-evidence': element('I’m done synthesizing my evidence'), argmap: element('Argument map') };
const c = { S: { evOpen: true, sec: 'evidence', notes: [], arts: [] }, document: {
  body: { classList: { toggle() {} } },
  querySelector(selector) { return elements[/l(\d)/.exec(selector)[0]]; }
}, $(id) { return elements[id]; }, node(id) { return c.S.nodes && c.S.nodes.find(n => n.id === id); }, searchArticlesOf() { return []; }, follow() {}, reduced: true, setTimeout() {}, renderAll() { c.renderFocus(); c.renderEvidenceFinish(); } };
vm.createContext(c);
vm.runInContext(transition, c);

c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true);
elements['finish-evidence'].listeners.click();
assert.equal(c.S.sec, 'evidence', 'The button cannot open Argue before a note has content');

c.S.notes.push({ text: 'These examples show different kinds of influence' });
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true, 'A written note alone is insufficient');
elements['finish-evidence'].listeners.click();
assert.equal(c.S.sec, 'evidence', 'The button cannot be used without an evidence connection');
c.S.notes[0].links = ['N:another-note'];
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true, 'Connecting two notes is insufficient');
c.S.notes[0].links = ['A:missing'];
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true, 'A removed article does not count');
c.S.arts.push({ id: 'article-1' });
c.S.notes[0].links = ['A:article-1'];
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, false);
c.S.notes[0].links = [];
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true, 'Removing the connection hides the button again');
c.S.nodes = [{ id: 7, kind: 'evidence' }];
c.S.notes[0].links = ['E:7'];
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, false, 'A link to a student evidence card also counts');
elements['finish-evidence'].listeners.click();
assert.equal(c.S.sec, 'argue');
assert.equal(c.S.say, 'Good job unpacking! Now we shall start crafting out topic sentences');
assert.equal(c.S.mullAt, 'argue');
assert.equal(c.S.argueStarted, true);
assert.equal(elements['evidence-finish'].hidden, true);
assert.equal(elements.l3.classList.contains('focus'), true);
assert.equal(elements.l2.classList.contains('focus'), false);
assert.equal(elements.l3.scrolled, true);
c.setSec('evidence');
assert.equal(elements.l2.classList.contains('focus'), true);
c.renderEvidenceFinish();
assert.equal(elements['evidence-finish'].hidden, true, 'The finish button stays gone after Argue has opened');
c.setSec('argue');
assert.equal(elements.l3.classList.contains('focus'), true);
console.log('PASS: only a written note connected to evidence unlocks Argue, and the button stays gone after entering it');
