const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

const source = fs.readFileSync('js/evidence.js', 'utf8');
const runSearchSource = source.slice(source.indexOf('function revealSearchBoard(search){'), source.indexOf('function renderSearch(animate){'));
const pending = [];
const state = { q: 'A question', searches: [] };
const context = {
  S: state, crypto, sample: true,
  searchesOf(s) { return s.searches; },
  renderSearch() {}, closeSubQs() {}, renderMull() {}, artTerms() { return []; },
  resolveArticleLinks() {}, requestAnimationFrame() {},
  PROMPTS: { search({ query }) { return query; } },
  OB_CATS: [{ id: 'society', label: 'Society' }],
  SAYS: { searching() { return 'Searching'; }, searchFound: 'Found', searchNone: 'None', searchFailed: 'Failed' },
  articleJSON(prompt) { return new Promise(resolve => pending.push({ prompt, resolve })); },
  sourcedArticleUrl(url) { return url; },
  handleAccess() {},
};
vm.createContext(context);
vm.runInContext(runSearchSource, context);

(async () => {
  context.runSearch('first example');
  context.runSearch('second example');
  context.runSearch('second example');
  assert.equal(state.searches.length, 2);
  assert.deepEqual(pending.map(p => p.prompt), ['first example', 'second example']);
  pending[1].resolve({ articles: [{ title: 'Second result', summary: 'Second summary' }] });
  await Promise.resolve();
  pending[0].resolve({ articles: [{ title: 'First result', summary: 'First summary' }] });
  await Promise.resolve();
  assert.deepEqual(state.searches.map(s => s.q), ['first example', 'second example']);
  assert.deepEqual(state.searches.map(s => s.items[0].title), ['First result', 'Second result']);
  assert.notEqual(state.searches[0].items[0].id, state.searches[1].items[0].id);
  console.log('PASS: repeated searches keep both result sets in order, even when responses finish out of order');
})().catch(error => { console.error(error); process.exitCode = 1; });
