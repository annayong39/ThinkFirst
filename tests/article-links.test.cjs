const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = 'https://www.example.com/news/a-specific-article?utm_source=search';
let request;
let nextTimer = 0;
const timers = new Map();
const context = {
  URL,
  AbortController,
  setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
  clearTimeout(id) { timers.delete(id); },
  matchMedia() { return { matches: false }; },
  TFSettings: { get(key) { return key === 'apiKey' ? 'test-key' : 'gpt-5-mini'; } },
  DEFAULT_MODEL: 'gpt-5-mini',
  PROMPTS: { system: 'Return JSON.' },
  async fetch(url, options) {
    request = { url, body: JSON.parse(options.body) };
    return { ok: true, async json() { return {
      output: [
        { type: 'web_search_call', status: 'completed', action: { sources: [{ url: source, title: 'A specific article - Publisher' }] } },
        { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ articles: [{ title: 'A specific article', url: source }] }), annotations: [] }] }
      ]
    }; } };
  }
};
context.window = context;
vm.createContext(context);
for (const file of ['js/core.js', 'js/ai.js']) vm.runInContext(fs.readFileSync(file, 'utf8'), context);

(async () => {
  const result = await context.TFAI.webJSON('Find articles');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.body.tool_choice, 'required');
  assert.equal(request.body.tools[0].type, 'web_search');
  assert.equal(request.body.tools[0].search_context_size, 'low');
  assert.equal(request.body.reasoning.effort, 'minimal');
  assert.equal(request.body.text, undefined, 'Web search requests must not force JSON mode');
  assert.equal(context.sourcedArticleUrl(result.articles[0].url, result._sources), source);
  assert.equal(context.sourcedArticleUrl('https://www.example.com/news/a-specific-article', result._sources), source);
  assert.equal(context.sourcedArticleUrl('https://www.example.com/news/a-made-up-article', result._sources), '');
  assert.equal(context.sourcedArticleUrl('https://www.example.com/', result._sources), '');
  assert.equal(context.sourcedArticleUrl('https://www.google.com/search?q=article', result._sources), '');
  assert.equal(context.directArticleUrl('https://www.reuters.com/investigates/special-report/'), '');
  assert.equal(context.directArticleUrl('https://www.channelnewsasia.com/singapore'), '');
  vm.runInContext(fs.readFileSync('js/evidence.js', 'utf8').split('function artTerms()')[0], context);
  context.esc = value => String(value);
  const direct = { title: 'Actual headline', source: 'Publisher', url: source, verified: true };
  assert.ok(context.articleSourceLink(direct).includes('href="' + source));
  assert.match(context.articleSourceLink(direct), /Read on Publisher/);
  const older = { title: 'Old headline', source: 'The Straits Times', url: 'https://example.com/', verified: false };
  assert.ok(context.articleSourceLink(older).includes('href="https://www.google.com/search?q=Old%20headline%20The%20Straits%20Times'));
  assert.match(context.articleSourceLink(older), /Read on The Straits Times/);
  assert.doesNotMatch(context.articleSourceLink(older), /\(search\)/);
  context.S = { q: 'An essay question' };
  let fallbackCalls = 0;
  context.sample = {
    webJSON: async () => { throw { code: 'error', message: 'Web search unavailable' }; },
    json: async () => { fallbackCalls++; return { articles: [older] }; }
  };
  const suggested = await new Promise((resolve, reject) => context.articleJSON('Find articles').then(resolve, reject));
  assert.equal(suggested.articles.length, 1);
  assert.equal(fallbackCalls, 1);
  context.sample.webJSON = (prompt, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject({ code: 'cancelled' }));
  });
  const timedSearch = new Promise((resolve, reject) => context.articleJSON('Slow search').then(resolve, reject));
  const webTimer = [...timers].find(([, timer]) => timer.ms === 22000);
  assert.ok(webTimer, 'Live search has a deadline');
  timers.delete(webTimer[0]); webTimer[1].fn();
  assert.equal((await timedSearch).articles.length, 1, 'A slow web search falls back to article suggestions');
  context.PROMPTS.resolveArticles = () => 'Find exact publisher pages';
  context.OB_SAVED = [{ artId: 'old' }];
  older.id = 'old';
  let redraws = 0;
  context.sample.webJSON = async () => ({
    articles: [{ id: 'old', title: 'Published headline', source: 'The Straits Times', summary: 'Published summary', url: source }],
    _sources: [source]
  });
  await context.resolveArticleLinks([older], context.S, () => true, () => { redraws++; });
  assert.equal(older.url, source);
  assert.equal(older.verified, true);
  assert.equal(older.title, 'Published headline');
  assert.equal(context.OB_SAVED[0].url, source);
  assert.equal(context.OB_SAVED[0].source, 'The Straits Times');
  assert.equal(redraws, 1);
  assert.match(context.articleSourceLink(older), /Read on The Straits Times/);
  const missing = { id: 'missing', title: 'Unmatched headline', source: 'Publisher', verified: false };
  context.sample.webJSON = async () => ({ articles: [{ id: 'missing', url: 'https://example.com/' }], _sources: [] });
  await context.resolveArticleLinks([missing], context.S, () => true, () => { redraws++; });
  assert.equal(missing.verified, false);
  assert.equal(redraws, 1);
  assert.match(context.articleSourceLink(missing), /Read on Publisher/);
  assert.doesNotMatch(context.articleSourceLink(missing), /\(search\)/);
  console.log('PASS: direct links use retrieved sources; other cards search by headline; article suggestions fall back when web search fails');
})().catch(error => { console.error(error); process.exitCode = 1; });
