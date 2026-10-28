const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/interactions.js', 'utf8');
const layout = source.slice(source.indexOf('function layoutEvidenceSearch(){'), source.indexOf("addEventListener('scroll', follow"));
const cards = [];
let scale = 1;
const top = 100;
const layer = {
  style: {}, offsetWidth: 1000,
  getBoundingClientRect() { return { top, width: 1000 * scale }; },
  querySelectorAll(selector) { return cards.filter(card => selector.split(',').some(part => card.matches(part.trim()))); }
};
const box = { style: {}, getClientRects() { return []; } };
const finish = { style: {}, visible: false, naturalTop: 400, height: 42,
  getClientRects() { return this.visible ? [{}] : []; },
  getBoundingClientRect() {
    const y = top + (this.naturalTop + (parseFloat(this.style.marginTop) || 0)) * scale;
    return { top: y, bottom: y + this.height * scale };
  } };
const c = { document: { querySelector() { return layer; } }, $(id) { return id === 'evidence-finish' ? finish : box; } };
vm.createContext(c);
vm.runInContext(layout, c);

function card(selector, bottom) {
  return { bottom, visible: true,
    matches(part) { return part === selector || (selector === '#row-search .artcard' && part === '.artcard'); },
    getClientRects() { return this.visible ? [{}] : []; },
    getBoundingClientRect() { return { bottom: top + this.bottom * scale }; } };
}

const article = card('.artcard', 650);
cards.push(article);
c.layoutEvidenceSearch();
assert.equal(layer.style.minHeight, '680px', 'Dragged article extends Evidence even with no search board or notes');

const note = card('.evnote', 800), evidence = card('#row-evidence .nw', 950), searchArticle = card('#row-search .artcard', 1100);
cards.push(note, evidence, searchArticle);
c.layoutEvidenceSearch();
assert.equal(layer.style.minHeight, '1130px', 'Search results dragged below their board are included');
searchArticle.visible = false;
c.layoutEvidenceSearch();
assert.equal(layer.style.minHeight, '980px', 'Hidden results do not keep the section expanded');
evidence.bottom = 300;
note.bottom = 200;
article.bottom = 250;
c.layoutEvidenceSearch();
assert.equal(layer.style.minHeight, '330px', 'Moving cards back up lets the section shrink');
for (scale of [0.5, 1.6]) {
  c.layoutEvidenceSearch();
  assert.equal(layer.style.minHeight, '330px', 'Height and bottom padding account for map zoom');
}
cards.length = 0;
c.layoutEvidenceSearch();
assert.equal(layer.style.minHeight, '', 'Removing all cards clears the extra height');
scale = 1;
cards.push(article);
article.bottom = 650;
finish.visible = true;
c.layoutEvidenceSearch();
assert.ok(finish.getBoundingClientRect().top >= article.getBoundingClientRect().bottom + 24,
  'Finish button sits below a dragged article');
assert.ok(top + parseFloat(layer.style.minHeight) >= finish.getBoundingClientRect().bottom + 30,
  'Evidence section includes the finish button');
finish.visible = false;
c.layoutEvidenceSearch();
assert.equal(finish.style.marginTop, '', 'Hiding the button clears its extra gap');
console.log('PASS: Evidence bounds cover dragged articles, notes, own evidence and search results; shrink, removal and zoom work');
