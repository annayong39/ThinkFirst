const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function environment(responses) {
  const calls = [], summaries = [];
  const n = { id: 1, kind: 'term', wtype: 'CONCEPT', phrase: 'social media', boundary: '',
    guide: { status: 'ready', meaning: 'Online platforms for sharing and interacting.', decisions: ['What does social media cover for you here?'] } };
  const c = { S: { q: 'Social media has more influence than politicians. Discuss.', nodes: [n] }, sample: true,
    els: new Map(), SAYS: { readingAnswer: 'Reading', needMoreWords: 'Please explain' },
    $() { return { addEventListener() {} }; }, node(id) { return id === n.id ? n : null; },
    wc(s) { return s.trim().split(/\s+/).length; }, labelFor(x) { return x.phrase; },
    renderMeta() {}, follow() {}, renderMull() {}, askDecisions() {},
    mapJSON(prompt) { calls.push(prompt); return Promise.resolve(responses.shift()); } };
  vm.createContext(c);
  vm.runInContext(fs.readFileSync('js/prompts.js', 'utf8'), c);
  vm.runInContext(fs.readFileSync('js/unpack.js', 'utf8'), c);
  c.summarise = function(x) { summaries.push(c.scopeText(x)); };
  return { c, n, calls, summaries };
}

async function answer(env, text) {
  env.n.boundary = text;
  env.c.followUp(env.n);
  await new Promise(resolve => setImmediate(resolve));
}

(async () => {
  const old = vm.createContext({});
  vm.runInContext(fs.readFileSync('backups/term-unpacking-before-three-questions/prompts.js', 'utf8'), old);
  const early = environment([{ done: false, focus: 'SCOPE', question: 'Why have you chosen that boundary?' }, { done: true }]);
  // Preserve all other prompts, including the existing opening question.
  for (const key of Object.keys(old.PROMPTS)) {
    if (key !== 'termFollowUp') assert.equal(early.c.PROMPTS[key].toString(), old.PROMPTS[key].toString(), key);
  }
  await answer(early, 'Platforms where people share opinions');
  assert.equal(early.n.talk.length, 2);
  assert.equal(early.summaries.length, 0);
  await answer(early, 'I include discussion between users because it can shape their views');
  assert.equal(early.n.unpacked, true);
  assert.equal(early.n.talk.length, 2);
  assert.equal(early.summaries.length, 1);
  assert.match(early.summaries[0], /Platforms where people share opinions/);
  assert.match(early.summaries[0], /discussion between users/);

  const final = environment([{ done: false, focus: 'SCOPE', question: 'Where would you draw the boundary?' },
    { done: false, focus: 'LINK', question: 'How does that boundary fit this question?' }]);
  await answer(final, 'Platforms where people share opinions');
  await answer(final, 'I include public posts and private group discussions');
  assert.equal(final.n.talk.length, 3);
  assert.equal(final.summaries.length, 0);
  await answer(final, 'Both can change views through interaction between users');
  assert.equal(final.calls.length, 2, 'No fourth question request after the third answer');
  assert.equal(final.n.unpacked, true);
  assert.equal(final.summaries.length, 1);
  assert.match(final.summaries[0], /Both can change views/);
  // Students can finish either questioning type at Question 2, including a draft answer.
  for (const type of ['CONCEPT', 'QUALIFIER']) {
    const manual = environment([{ done: false, focus: 'SCOPE', question: 'How would you define that boundary?' }]);
    manual.n.wtype = type;
    assert.equal(manual.c.canFinishTerm(manual.n), false, 'No finish button on the opening question');
    manual.c.finishTerm(manual.n);
    assert.equal(manual.n.unpacked, undefined);
    await answer(manual, 'My first explanation of the term');
    assert.equal(manual.c.canFinishTerm(manual.n), true);
    manual.n.boundary = 'My additional scope decision still in the textbox';
    manual.c.finishTerm(manual.n);
    assert.equal(manual.n.unpacked, true);
    assert.equal(manual.c.openQ(manual.n), null, 'Clicking a finished card must not reopen its unanswered follow-up');
    assert.equal(manual.calls.length, 1, 'Finishing does not request another follow-up');
    assert.match(manual.summaries[0], /My first explanation/);
    assert.match(manual.summaries[0], /My additional scope decision/);
    manual.c.finishTerm(manual.n);
    assert.equal(manual.summaries.length, 1, 'Repeated clicks do not duplicate the summary');
  }
  const command = environment([]);
  command.n.wtype = 'COMMAND';
  command.n.talk = [{ q: 'First', a: 'A response' }, { q: 'Second', a: null }];
  assert.equal(command.c.canFinishTerm(command.n), false);
  command.c.finishTerm(command.n);
  assert.equal(command.summaries.length, 0);
  console.log('PASS: opening and other prompts preserved; finish after two answers or enforce three-question maximum; summaries retain student answers');
  console.log('PASS: manual finish starts at Question 2 for concepts and qualifiers, preserves drafts, stays finished and excludes commands');
})().catch(error => { console.error(error); process.exitCode = 1; });
