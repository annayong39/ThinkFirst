const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const listeners = {};
const body = { matches: () => false, closest: () => null, classList: { contains: () => false } };
const document = { body, activeElement: body, addEventListener(type, handler) { listeners[type] = handler; } };
const context = { document, S: { q: 'First question' } };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/undo.js', 'utf8'), context);

let position = 40, text = 'new text';
context.recordUndo(() => { position = 0; });
context.recordUndo(() => { text = 'old text'; });
function pressUndo() {
  let prevented = false;
  listeners.keydown({ key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false,
    preventDefault() { prevented = true; } });
  return prevented;
}
assert.equal(pressUndo(), true);
assert.equal(text, 'old text');
assert.equal(position, 40);
assert.equal(pressUndo(), true);
assert.equal(position, 0);
assert.equal(pressUndo(), false);

context.recordUndo(() => { position = -1; });
document.activeElement = { matches: selector => selector.includes('textarea'), closest: () => null };
assert.equal(pressUndo(), false, 'typing keeps the browser’s own undo');
assert.equal(position, 0);
document.activeElement = body;
context.S = { q: 'Another question' };
assert.equal(pressUndo(), false, 'actions from another question are discarded');
assert.equal(position, 0);

let redraws = 0;
context.ctl = {};
context.els = new Map();
context.renderAll = () => { redraws++; };
vm.runInContext(fs.readFileSync('js/question.js', 'utf8'), context);
const removed = { id: 7, kind: 'evidence' };
const connected = { id: 8, kind: 'evidence', links: [7, 9], parent: 7 };
context.S = { nodes: [removed, connected] };
context.dropNode(removed);
assert.equal(context.S.nodes.includes(removed), false);
assert.deepEqual(Array.from(connected.links), [9]);
connected.links.push(10);
assert.equal(context.undoLastAction(), true);
assert.equal(context.S.nodes[0], removed);
assert.deepEqual(Array.from(connected.links), [7, 9, 10]);
assert.equal(connected.parent, 7);
assert.ok(redraws >= 2);

console.log('PASS: undo runs newest map action first, defers to text editing, and stays within one question');
