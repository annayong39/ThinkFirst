/* =====================================================================
   ThinkFirst — CORE: shared state, constants and small helpers
   ---------------------------------------------------------------------
   Loaded first (after settings + ai). Every other file uses these.
     S       the whole app state for the current question (see fresh())
     sample  the AI connection (TFAI) when a key is saved, otherwise null
     live    false when we know the AI is unreachable
   ===================================================================== */

var DEFAULT_Q = 'Social media has more influence than politicians. Discuss';
var BR = {because:'Because', limit:'Limit', counter:'Counter', sowhat:'So what?', evidence:'Evidence'};
var KIND_LABEL = {term:'Key term', evidence:'Evidence', claim:'My gut take', branch:'Branch'};
var S, sample = null, live = null, ctl = {}, prefetchCtl = null, drag = null;
var els = new Map();
var suppressTokClick = false;
var mapZoom = 1;
/* the zoom actually applied to the map: map/start-page zoom × the Settings font size */
function zoomNow(){ return (document.body.classList.contains('onb') ? (obZoom || 1) : mapZoom) * TFSettings.scale(); }
var MINI_MULL = '<svg class="pm" viewBox="0 0 120 120" aria-label="Thinky asks"><rect x="84" y="44" width="22" height="16" rx="8" fill="#fdee75"/><rect x="84" y="66" width="22" height="16" rx="8" fill="#9edabe"/><path d="M27 28 H93 L91 111 Q91 116 86 116 H34 Q29 116 29 111 Z" fill="#f3effc" stroke="#9e90c4" stroke-width="3"/><rect x="24" y="14" width="72" height="18" rx="9" fill="#9e90c4"/><circle cx="51" cy="56" r="5" fill="#2d362f"/><circle cx="69" cy="56" r="5" fill="#2d362f"/><path d="M53 70 Q60 76 67 70" fill="none" stroke="#2d362f" stroke-width="4.5" stroke-linecap="round"/></svg>';
/* draw-then-pop: each new card's wire is drawn from its word first, then the card sprouts at the wire's end */
var DRAW = 520, POP = 560, born = {};
var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
function now(){ return (window.performance && performance.now) ? performance.now() : Date.now(); }
function birth(key, delay){ if (!born[key]) born[key] = now() + (delay || 0); return now() - born[key]; }
function drawProg(key){ if (reduced || !key || born[key] == null) return 1; var t = (now() - born[key]) / DRAW; t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
function animating(){ if (reduced) return false; var t = now(); for (var k in born) { if (t - born[k] < DRAW + POP) return true; } return false; }
var $ = function(id){ return document.getElementById(id); };
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* A saved article should link to its page, never an old search-result URL. */
function directArticleUrl(value){
  try {
    var u = new URL(String(value || '').trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    if (/(^|\.)google\.|(^|\.)(bing|duckduckgo)\.com$/i.test(u.hostname)) return '';
    if (!u.pathname || u.pathname === '/' || /\/(search|search-results)\/?$/i.test(u.pathname)) return '';
    if (/^\/(?:news|world|singapore|asia|business|sport|sports|technology|politics|latest|investigates|investigates\/special-report)\/?$/i.test(u.pathname)) return '';
    return u.href;
  } catch(e){ return ''; }
}
/* Only use a link that the live web search actually retrieved. Matching the
   host and path allows the model to omit tracking parameters from its reply. */
function articleSearchUrl(title, source){
  return 'https://www.google.com/search?q=' + encodeURIComponent([String(title || '').trim(), String(source || '').trim()].filter(Boolean).join(' '));
}
function sourcedArticleUrl(value, sources){
  var candidate = directArticleUrl(value);
  if (!candidate || !Array.isArray(sources)) return '';
  function key(raw){
    try {
      var u = new URL(raw), params = [];
      u.searchParams.forEach(function(value, name){ if (!/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$)/i.test(name)) params.push(name + '=' + value); });
      return u.hostname.replace(/^www\./, '').toLowerCase() + u.pathname.replace(/\/+$/, '').toLowerCase() + '?' + params.sort().join('&');
    }
    catch(e){ return ''; }
  }
  var wanted = key(candidate);
  return (sources.map(directArticleUrl).find(function(source){ return source && key(source) === wanted; })) || '';
}
function wc(s){ return (String(s || '').trim().match(/\S+/g) || []).length; }
function norm(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function clean(s){ return String(s).replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, ''); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function node(id){ for (var i = 0; i < S.nodes.length; i++) if (S.nodes[i].id === id) return S.nodes[i]; return null; }
function of(kind){ return S.nodes.filter(function(n){ return n.kind === kind; }); }
function read_(n){ return n.status === 'done'; }
function searchesOf(state){
  var list = Array.isArray(state.searches) ? state.searches : [];
  return state.search && list.indexOf(state.search) < 0 ? list.concat([state.search]) : list;
}
function searchArticlesOf(state){
  return searchesOf(state).reduce(function(all, search){ return all.concat(search.items || []); }, []);
}

function fresh(q){
  return { q: q, toks: q.split(/\s+/).filter(Boolean), sel: [], nodes: [], nextId: 1,
    mull: {status:'idle', terms:[]}, chunks: [], llmPhrases: [], chunkStatus: 'idle', split: {}, revealed: false, evOpen: false, arts: [], artStatus: 'idle', searches: [],
    topicSentences: [{ text: '' }, { text: '' }, { text: '' }], finalStand: '', argueStarted: false,
    focus: null, say: SAYS.yourTurn, mood: 'neutral', thinking: false };
}

/* Ignore requests and deferred work from a map that has since been closed.
   Compare the state object, not the question: two projects can share a question. */
function mapJSON(prompt, opts){
  var state = S, pending = opts && opts.web ? sample.webJSON(prompt, opts) : sample.json(prompt, opts);
  return { then: function(ok, fail){
    return pending.then(function(result){ if (S === state) return ok(result); },
      function(err){ if (S === state && fail) return fail(err); });
  } };
}
function mapLater(fn, delay){
  var state = S;
  return setTimeout(function(){ if (S === state) fn(); }, delay);
}
