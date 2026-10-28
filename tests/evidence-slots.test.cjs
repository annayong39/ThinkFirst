const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const evidence = fs.readFileSync('js/evidence.js', 'utf8');
const slotsSource = evidence.slice(evidence.indexOf('function articleSlots('), evidence.indexOf('/* Keep the suggestions visible'));
const context = { document: { createElement() { return { style: {}, setAttribute() {} }; } } };
vm.createContext(context);
vm.runInContext(slotsSource, context);

const items = [{ id: 'first' }, { id: 'middle' }, { id: 'last' }];
const owner = {};
assert.deepEqual(Array.from(context.articleSlots(items, owner, 'slotCount'), item => item && item.id), ['first', 'middle', 'last']);
items.splice(1, 1);
assert.deepEqual(Array.from(context.articleSlots(items, owner, 'slotCount'), item => item && item.id), ['first', null, 'last'], 'Deleting a card preserves the other card slots');
assert.equal(context.emptyArticleSlot(240).style.height, '240px', 'The empty slot keeps the removed card’s height');

const interactions = fs.readFileSync('js/interactions.js', 'utf8');
const dragSource = interactions.slice(interactions.indexOf('function beginCardDrag('), interactions.indexOf("addEventListener('pointermove', function(e){"));
const selectedModels = new Set(items);
const targets = items.map(model => ({ model, el: { classList: { add() {} } } }));
const dragContext = {
  selectedModels,
  blurTextEditor() {},
  clearSelection() { selectedModels.clear(); },
  refreshSelection() {},
  selectionTargets() { return targets; },
  drag: null
};
vm.createContext(dragContext);
vm.runInContext(dragSource, dragContext);
dragContext.beginCardDrag({ clientX: 10, clientY: 20 }, items[0], { classList: { contains(name) { return name === 'artcard'; } } });
assert.equal(dragContext.drag.items.length, 1, 'Dragging one Evidence article does not drag other selected cards');
assert.equal(dragContext.drag.items[0].n, items[0]);
console.log('PASS: Evidence cards keep their slots after removal and drag independently');
