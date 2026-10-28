const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const promptsContext = vm.createContext({});
vm.runInContext(fs.readFileSync('js/prompts.js', 'utf8'), promptsContext);
const reviewPrompt = vm.runInContext('PROMPTS.topicSentenceReview', promptsContext);
assert.equal(typeof reviewPrompt, 'function', 'Part 7 must exist for the Enter review');
const reviewText = reviewPrompt({ question: 'An essay question', terms: [], topicSentence: 'A draft claim', evidence: [] });
assert.match(reviewText, /STUDENT'S TOPIC SENTENCE: "A draft claim"/);
assert.match(reviewText, /ask ONE question that helps the student explain a gap/);
assert.match(reviewText, /Reply with only JSON: \{"ready": boolean, "question": string\}/);
const argumentPrompt = vm.runInContext('PROMPTS.argumentReview', promptsContext);
assert.equal(typeof argumentPrompt, 'function');
assert.match(argumentPrompt({ question: 'An essay question', terms: [], finalStand: 'My stand', topics: [
  { sentence: 'Point one', evidence: [], explanation: '' },
  { sentence: 'Point two', evidence: [], explanation: '' },
  { sentence: 'Point three', evidence: [], explanation: '' }
] }), /FINAL STAND: "My stand"/);

const finalField = { value: '', addEventListener(type, callback) { this[type] = callback; }, closest() { return { isConnected: true }; } };
const reviewButton = { disabled: false, textContent: '', addEventListener(type, callback) { this[type] = callback; } };
const reviewResult = { innerHTML: '' };
const finalCard = { isConnected: true, querySelector(selector) {
  if (selector === '.argument-review-button') return reviewButton;
  if (selector === '.argument-review-result') return reviewResult;
  return null;
} };
const finalSlot = {
  innerHTML: '',
  querySelector(selector) {
    if (!this.innerHTML.includes('class="final-stand-card"')) return null;
    if (selector === '.final-stand-card') return finalCard;
    if (selector === '.final-stand-text') return finalField;
    if (selector === '.argument-review-button') return reviewButton;
    return null;
  }
};
const box = {
  dataset: {}, innerHTML: '', textContent: '', listeners: {},
  addEventListener(type, callback) { this.listeners[type] = callback; },
  contains() { return true; },
  querySelector(selector) {
    if (selector === '.topic-sentences' && this.innerHTML.includes('class="topic-sentences"')) return {};
    if (selector === '.final-stand-slot' && this.innerHTML.includes('class="final-stand-slot"')) return finalSlot;
    if (selector === '.final-stand-card') return finalSlot.querySelector(selector);
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '.topic-column') return [0, 1, 2].map(() => ({ querySelector() { return { scrollIntoView() {} }; } }));
    if (!this.querySelector('.topic-sentences')) return [];
    this.fields ||= {};
    return this.fields[selector] ||= [0, 1, 2].map(i => ({ dataset: { topic: String(i) }, value: '', checked: false,
      closest() { return { topic: i, isConnected: true }; },
      addEventListener(type, callback) { this[type] = callback; } }));
  }
};
const evidenceLayer = { listeners: {}, addEventListener(type, callback) { this.listeners[type] = callback; } };
const c = {
  S: { sec: 'argue', arts: [{ id: 'a1', title: 'Article title', summary: 'Do not copy this summary' }], nodes: [{ id: 7, kind: 'evidence', text: 'My own full evidence text' }] },
  $(id) {
    if (id === 'argmap') return box;
    if (id.startsWith('topic-text-')) return box.querySelectorAll('.topic-text')[Number(id.slice(-1)) - 1];
    assert.fail('Unexpected element: ' + id);
  },
  esc(s) { return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;'); },
  renderMull() { c.thinkyRendered = true; },
  renderAll() { c.renderArgue(3); },
  requestAnimationFrame(callback) { callback(); },
  searchArticlesOf() { return []; },
  node(id) { return c.S.nodes.find(n => n.id === id); },
  reduced: true,
  document: { body: { classList: { toggle() {} } }, querySelector() { return evidenceLayer; }, addEventListener() {} }
};
vm.createContext(c);
vm.runInContext(fs.readFileSync('js/argue.js', 'utf8'), c);

c.renderArgue(3);
assert.equal((box.innerHTML.match(/class="topic-card"/g) || []).length, 3);
assert.equal((box.innerHTML.match(/class="topic-evidence-branch"/g) || []).length, 3);
assert.doesNotMatch(box.innerHTML, /type="checkbox"/);
assert.doesNotMatch(box.innerHTML, /Deeper explanation|class="evidence-card"/);
assert.equal(c.S.topicChoosing, undefined, 'Evidence picking starts only after a topic sentence is focused');
c.S.sec = 'evidence'; c.renderArgue(2);
assert.match(box.innerHTML, /Unpack and synthesize your findings/, 'Argue is locked in Evidence before it starts');
c.S.sec = 'argue'; c.renderArgue(3);

const text = box.querySelectorAll('.topic-text')[0];
for (const field of box.querySelectorAll('.topic-text')) {
  field.focus();
  assert.equal(c.S.mullAt, 'topic');
  assert.equal(c.S.topicChoosing, true);
  assert.equal(c.S.argEl.topic, Number(field.dataset.topic));
  assert.equal(c.S.say, Number(field.dataset.topic) === 0
    ? "Let's select the evidence that will help you craft your topic sentences! Go back to the evidence layer and click on the evidence cards"
    : "Once again, let's select the relevant evidence for your argument. Remember to have a holistic view of the question!");
  assert.equal(c.thinkyRendered, true);
}
const articleSource = { matches(selector) { return selector === '.artcard'; }, getAttribute() { return 'Aa1'; } };
const ownSource = { matches() { return false; }, getAttribute() { return '7'; } };
function clickSource(source) { evidenceLayer.listeners.click({ target: { closest(selector) { return selector.startsWith('button') ? null : source; } } }); }
c.S.topicChoosing = false;
clickSource(articleSource);
assert.equal(c.S.topicSentences[0].evidence, undefined, 'Evidence clicks do nothing before Thinky prompts selection');
box.querySelectorAll('.topic-text')[0].focus();
c.justDraggedTopicSource = articleSource;
clickSource(articleSource);
assert.equal(c.S.topicSentences[0].evidence, undefined, 'Dragging an Evidence card does not select it for a topic sentence');
clickSource(articleSource);
assert.equal(c.S.topicSentences[0].evidence.length, 1);
assert.equal(c.S.mullAt, 'topic-write');
assert.equal(c.S.say, "Nice! Now let's try to write the topic sentence based on the evidence");
assert.match(box.innerHTML, /<strong>Article title<\/strong>/);
assert.doesNotMatch(box.innerHTML, /Do not copy this summary/);
clickSource(articleSource);
assert.equal(c.S.topicSentences[0].evidence.length, 1, 'Clicking the same article again does not duplicate it');
const firstList = { innerHTML: '' };
const firstRemove = { dataset: { topic: '0', evidence: '0' }, closest(selector) { return selector === '.topic-evidence-list' ? firstList : null; } };
box.listeners.click({ target: { closest(selector) { return selector === '.topic-evidence-remove' ? firstRemove : null; } } });
assert.equal(c.S.topicSentences[0].evidence.length, 0);
assert.equal(c.S.mullAt, 'topic');
assert.equal(c.S.say, c.TOPIC_SELECT_PROMPT);
clickSource(articleSource);
box.querySelectorAll('.topic-text')[1].focus();
clickSource(ownSource);
assert.equal(c.S.topicSentences[1].evidence[0].text, 'My own full evidence text');
assert.match(box.innerHTML, /<span>My own full evidence text<\/span>/);
assert.match(box.innerHTML, /aria-label="Remove evidence from topic sentence 1"/);
const list = { innerHTML: '' };
const remove = { dataset: { topic: '0', evidence: '0' }, closest(selector) { return selector === '.topic-evidence-list' ? list : null; } };
box.listeners.click({ target: { closest(selector) { return selector === '.topic-evidence-remove' ? remove : null; } } });
assert.equal(c.S.topicSentences[0].evidence.length, 0);
assert.equal(c.S.mullAt, 'topic', 'Removing the last item returns Thinky to evidence selection');
assert.equal(c.S.topicSentences[1].evidence.length, 1, 'Removing one topic’s evidence leaves the other topic alone');
assert.equal(list.innerHTML, '');
text.value = 'A clear argument about influence'; text.input();
assert.equal(c.S.topicSentences[0].text, text.value);

c.S.sec = 'evidence'; c.renderArgue(2);
c.S.sec = 'argue'; c.renderArgue(3);
box.dataset.view = ''; c.renderArgue(3);
assert.match(box.innerHTML, /A clear argument about influence/);
assert.equal(finalSlot.innerHTML, '', 'The final stand stays hidden until all three sentences have text');

// Enter sends one review for each topic. A question adds a writing branch;
// a ready sentence and subsequent Enter presses do not.
c.S.q = 'Social media has more influence than politicians. Discuss';
c.sample = {};
c.of = () => [];
c.PROMPTS = {
  topicSentenceReview: data => { c.lastReviewData = data; return 'review prompt'; },
  argumentReview: data => { c.lastArgumentData = data; return 'argument prompt'; }
};
c.mapJSON = prompt => ({ then(ok) {
  if (prompt === 'argument prompt') { c.argumentReviewCalls++; ok(c.argumentResult); }
  else { c.reviewCalls++; ok(c.reviewResult); }
} });
c.reviewCalls = 0;
c.argumentReviewCalls = 0;
c.reviewResult = { ready: false, question: 'How does your chosen evidence show this influence?' };
const firstText = box.querySelectorAll('.topic-text')[0];
firstText.value = 'A clear argument about influence';
firstText.keydown({ key: 'Enter', shiftKey: false, isComposing: false, preventDefault() {} });
assert.equal(c.reviewCalls, 1);
assert.equal(c.lastReviewData.topicSentence, firstText.value);
assert.equal(c.S.say, c.reviewResult.question);
assert.match(box.innerHTML, /class="topic-deeper-branch is-new"/);
assert.match(box.innerHTML, /class="topic-deeper-card is-new"/);
const explanation = box.querySelectorAll('.topic-deeper-text')[0];
explanation.value = 'The evidence shows a specific mechanism.'; explanation.input();
assert.equal(c.S.topicSentences[0].explanation, explanation.value);
explanation.keydown({ key: 'Enter', shiftKey: false, isComposing: false, preventDefault() {} });
assert.equal(c.S.mullAt, 'topic-deeper');
assert.equal(c.S.topicFocus, 0);
assert.equal(c.S.say, "Nice one! Now let's improve on the topic sentence above");
assert.equal(c.S.argEl.topic, 0);
firstText.keydown({ key: 'Enter', shiftKey: false, isComposing: false, preventDefault() {} });
assert.equal(c.reviewCalls, 1, 'A second Enter does not ask another question');
c.reviewResult = { ready: true, question: '' };
const secondText = box.querySelectorAll('.topic-text')[1];
secondText.value = 'A sufficiently specific second claim';
secondText.keydown({ key: 'Enter', shiftKey: false, isComposing: false, preventDefault() {} });
assert.equal(c.reviewCalls, 2);
assert.equal(c.S.topicSentences[1].review.status, 'ready');
assert.equal((box.innerHTML.match(/class="topic-deeper-card/g) || []).length, 1);
const thirdText = box.querySelectorAll('.topic-text')[2];
thirdText.value = 'A third claim about influence'; thirdText.input();
assert.match(finalSlot.innerHTML, /Your Final Stand/);
assert.notEqual(c.S.mullAt, 'final-stand', 'Showing the box does not trigger Thinky');
finalField.focus();
assert.equal(c.S.say, "Now that you have crafted your topic sentences, let's come up with your final stand, your thesis statement");
assert.equal(c.S.mullAt, 'final-stand');
finalField.value = 'My final thesis'; finalField.input({ target: finalField });
assert.equal(c.S.finalStand, 'My final thesis');
assert.equal(reviewButton.disabled, false);
c.argumentResult = { ready: false, feedback: 'The stand does not yet connect all three points.', questions: ['How does point three support your stand?'] };
reviewButton.click();
assert.equal(c.argumentReviewCalls, 1);
assert.equal(c.lastArgumentData.finalStand, 'My final thesis');
assert.equal(c.lastArgumentData.topics.length, 3);
assert.match(reviewResult.innerHTML, /How does point three support your stand\?/);
assert.equal(reviewButton.textContent, 'Review again');
finalField.value = 'A revised final thesis'; finalField.input({ target: finalField });
assert.equal(reviewResult.innerHTML, '', 'Editing the final stand hides the previous review');
c.argumentResult = { ready: true, feedback: 'The revised stand answers the question and the points support it.', questions: [] };
reviewButton.click();
assert.equal(c.argumentReviewCalls, 2);
assert.match(reviewResult.innerHTML, /On track/);
thirdText.value = ' '; thirdText.input();
assert.equal(finalSlot.innerHTML, '', 'The final stand hides if a sentence is cleared');
thirdText.value = 'A revised third claim about influence'; thirdText.input();
assert.match(finalSlot.innerHTML, /A revised final thesis/, 'The final stand retains its draft');
assert.equal(reviewResult.innerHTML, '', 'Feedback from an older draft is hidden');
c.S.sec = 'evidence'; c.renderArgue(2);
c.S.sec = 'argue'; c.renderArgue(3);
assert.match(box.innerHTML, /The evidence shows a specific mechanism\./, 'The deeper explanation survives rerendering');
assert.match(box.innerHTML, /class="topic-deeper-branch"/, 'The deeper branch survives rerendering');
c.S.argueStarted = true;
c.S.sec = 'evidence'; c.renderArgue(2);
assert.match(box.innerHTML, /A clear argument about influence/, 'Topic sentences remain visible when returning to Evidence');
assert.match(box.innerHTML, /The evidence shows a specific mechanism\./, 'Deeper explanation remains visible beside Evidence');

const sourceClasses = () => ({ add() {}, remove() {} });
const articleCard = { getAttribute(name) { return name === 'data-k' ? 'Aa1' : null; }, classList: sourceClasses(), scrollIntoView() { this.scrolled = true; } };
const otherArticle = { getAttribute(name) { return name === 'data-k' ? 'Aother' : null; }, classList: sourceClasses(), scrollIntoView() { this.scrolled = true; } };
const ownCard = { classList: sourceClasses(), scrollIntoView() { this.scrolled = true; } };
const ownWrapper = { getAttribute(name) { return name === 'data-id' ? '7' : null; }, querySelector(selector) { return selector === '.card' ? ownCard : null; } };
c.document.querySelectorAll = selector => selector.includes('.artcard') ? [otherArticle, articleCard] : [ownWrapper];
c.setTimeout = () => {};
function clickTopicCard(topic, evidenceIndex) {
  const card = { dataset: { topic: String(topic), evidenceIndex: String(evidenceIndex) } };
  box.listeners.click({ target: { closest(selector) { return selector === '.topic-evidence-card' ? card : null; } } });
}
c.S.topicSentences[0].evidence = [{ key: 'A:a1', kind: 'article', text: 'Article title' }];
c.S.sec = 'argue'; clickTopicCard(0, 0);
assert.equal(c.S.sec, 'evidence', 'Clicking a topic evidence card returns to Evidence');
assert.equal(articleCard.scrolled, true, 'It scrolls to the matching article ID');
assert.equal(otherArticle.scrolled, undefined, 'It does not scroll to another article');
c.S.sec = 'argue'; clickTopicCard(1, 0);
assert.equal(ownCard.scrolled, true, 'Student-written evidence scrolls to its own card');
c.S.sec = 'unpack'; c.renderArgue(2);
assert.match(box.innerHTML, /Unpack and synthesize your findings/, 'Argue does not stay open when switching to Unpack');
console.log('PASS: topic evidence selection, one-time review, deeper explanation, and final stand');
