const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/render.js', 'utf8');
const renderMull = source.slice(source.indexOf('function renderMull(){'), source.indexOf('function positionMull(){'));
const attrs = new Map();
const say = {
  innerHTML: '', hidden: false,
  getAttribute(name) { return attrs.get(name); },
  setAttribute(name, value) { attrs.set(name, value); },
  querySelector() { return null; },
  classList: { toggle() {}, remove() {}, add() {} }
};
const face = { getAttribute() { return 'curious'; } };
const elements = { mull: { classList: { toggle() {} } }, mface: face, say };
const question = 'Why does greater use lead to greater influence?';
const context = {
  S: { mood: 'curious', say: question, mullAt: 'topic-write', topicFocus: 0,
    topicSentences: [{ review: { status: 'question', question } }] },
  $(id) { return elements[id]; },
  esc(value) { return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
  canFinishTerm() { return false; },
  positionMull() {},
  document: { activeElement: null }
};
vm.createContext(context);
vm.runInContext(renderMull, context);

context.renderMull();
assert.match(say.innerHTML, /Why does greater use lead to greater influence\?/);
assert.match(say.innerHTML, /Explain in the &quot;Deeper Explanation&quot; text below!/);
context.S.say = 'Pick an evidence card.';
context.renderMull();
assert.doesNotMatch(say.innerHTML, /topic-review-hint/);
context.S.topicSentences[0].review.status = 'ready';
context.S.say = question;
context.renderMull();
assert.doesNotMatch(say.innerHTML, /topic-review-hint/);
console.log('PASS: every topic review question has the deeper explanation instruction');
