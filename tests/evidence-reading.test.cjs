const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const c = {
  URL, Date,
  window: { matchMedia() { return { matches: false }; } },
  matchMedia() { return { matches: false }; },
  document: { body: { classList: { contains() { return false; } } } },
  TFSettings: { scale() { return 1; } },
  SAYS: { yourTurn: 'Start', evidenceSearchReady: 'Search ready' },
  renderMeta() {}, renderMull() {}, renderAll() {}, maybeReveal() {}
};
vm.createContext(c);
for (const file of ['js/core.js', 'js/reading.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), c);
const renderSource = fs.readFileSync('js/render.js', 'utf8');
vm.runInContext(renderSource.slice(renderSource.indexOf('function renderTab('), renderSource.indexOf('function place(')), c);

c.S = c.fresh('How does social media shape public opinion?');
const n = { id: 1, kind: 'evidence', text: 'ALS Ice Bucket Challenge raised $115 million', status: 'draft' };
c.S.nodes.push(n);
const url = c.trigger(n);
assert.equal(url, 'https://www.google.com/search?q=ALS%20Ice%20Bucket%20Challenge%20raised%20%24115%20million');
assert.equal(n.status, 'done');
assert.equal(n.ai.searchUrl, url);
assert.equal(n.ai.level, undefined);
assert.equal(c.S.say, 'Search ready');

const attributes = new Map();
const tab = { classList: { remove() {}, add() {} }, offsetWidth: 200,
  getAttribute(key) { return attributes.get(key) || null; }, setAttribute(key, value) { attributes.set(key, value); },
  removeAttribute(key) { attributes.delete(key); } };
c.renderTab(n, tab);
assert.match(tab.innerHTML, /class="go"[^>]*>.*Search on Google/);
assert.match(tab.innerHTML, /href="https:\/\/www\.google\.com\/search\?q=ALS/);
assert.doesNotMatch(tab.innerHTML, /Solid|Push|Works|HTTP 400|Try again/);

n.text = 'A different evidence example';
assert.equal(c.trigger(n), 'https://www.google.com/search?q=A%20different%20evidence%20example');
assert.equal(n.ai.searchUrl, c.trigger(n));
console.log('PASS: every evidence example gets a Google search link without an AI request or grade');
