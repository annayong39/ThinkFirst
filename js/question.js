/* =====================================================================
   ThinkFirst — QUESTION + PICKED WORDS
   ---------------------------------------------------------------------
   Splits the GP question into words, joins set phrases ("social media"),
   and turns the words a student highlights into Unpack cards (terms).
   ===================================================================== */

/* ---------- question + terms ---------- */
/* ---------- phrases: each word is its own term, unless it belongs to a set phrase like "social media" ---------- */
var SET_PHRASES = ['social media','mass media','news media','mainstream media','traditional media','digital media','new media','artificial intelligence','developing countries','developed countries','developing nations','developed nations','developing world','third world','climate change','global warming','human rights','free speech','freedom of speech','freedom of expression','fake news','public opinion','popular culture','pop culture','mental health','social justice','economic growth','gender equality','income inequality','renewable energy','nuclear energy','space exploration','public transport','national identity','cultural heritage','young people','younger generation','older generation','modern society','modern world','civil society','world peace','international organisations','international organizations','the arts','the media','the internet','public figures','political leaders','role models','social norms','the individual','the state','private sector','public sector','big tech','tech companies','scientific research','higher education','online learning','working from home','cost of living','quality of life','standard of living','the environment','the poor','the rich','the elderly','the young'];
function phraseRanges(list){
  var toks = S.toks.map(function(x){ return norm(x); }), out = [];
  list.forEach(function(ph){
    var ws = norm(ph).split(' ').filter(Boolean); if (ws.length < 2 || ws.length > 4) return;
    for (var i = 0; i + ws.length <= toks.length; i++) {
      var ok = true; for (var j = 0; j < ws.length; j++) if (toks[i + j] !== ws[j]) { ok = false; break; }
      if (ok) out.push([i, i + ws.length - 1]);
    }
  });
  return out;
}
function computeChunks(){
  var all = phraseRanges(SET_PHRASES).concat(phraseRanges(S.llmPhrases || []));
  var mine = (S.userChunks || []).slice();
  /* "the X" phrases only join when X isn't already part of a bigger phrase; prefer longer ranges, no overlaps */
  all.sort(function(a, b){ return (b[1] - b[0]) - (a[1] - a[0]) || a[0] - b[0]; });
  var used = {}, out = [];
  mine.forEach(function(r){ for (var k = r[0]; k <= r[1]; k++) used[k] = 1; out.push(r); });
  all.forEach(function(r){
    if (S.split[r[0] + '-' + r[1]]) return;
    for (var i = r[0]; i <= r[1]; i++) if (used[i]) return;
    for (var k = r[0]; k <= r[1]; k++) used[k] = 1;
    out.push(r);
  });
  /* never join a word that ended a sentence/clause with the next word */
  S.chunks = out.filter(function(r){ if (mine.indexOf(r) >= 0) return true; for (var i = r[0]; i < r[1]; i++) if (/[.,;:!?]$/.test(S.toks[i])) return false; return true; })
    .sort(function(a, b){ return a[0] - b[0]; });
}
function chunkOf(i){ for (var k = 0; k < S.chunks.length; k++) { var r = S.chunks[k]; if (i >= r[0] && i <= r[1]) return r; } return null; }
function range(r){ var a = []; for (var i = r[0]; i <= r[1]; i++) a.push(i); return a; }
function fetchChunks(){
  if (!sample || S.chunkStatus !== 'idle') return;
  S.chunkStatus = 'loading'; var q = S.q;
  var prompt = PROMPTS.findPhrases({ question: q });   /* prompt text: js/prompts.js #1 */
  mapJSON(prompt, {}).then(function(res){
    if (q !== S.q) return;
    var lq = q.toLowerCase();
    S.llmPhrases = (res && Array.isArray(res.phrases) ? res.phrases : []).map(function(x){ return clean(String(x || '')); })
      .filter(function(x){ return x.split(/\s+/).length >= 2 && lq.indexOf(x.toLowerCase()) >= 0; }).slice(0, 6);
    S.chunkStatus = 'ready';
    computeChunks();
    /* if a picked word is now part of a phrase, pick the whole phrase */
    var add = []; S.sel.forEach(function(i){ var r = chunkOf(i); if (r) range(r).forEach(function(k){ if (S.sel.indexOf(k) < 0 && add.indexOf(k) < 0) add.push(k); }); });
    if (add.length) { S.sel = S.sel.concat(add); syncTerms(); }
    renderAll();
  }, function(){ if (q === S.q) S.chunkStatus = 'error'; });
}
function groups(){
  var sel = S.sel.slice().sort(function(a,b){ return a - b; }), out = [], seen = {};
  sel.forEach(function(i){
    if (seen[i]) return;
    var r = chunkOf(i), g = r ? range(r).filter(function(k){ return S.sel.indexOf(k) >= 0; }) : [i];
    g.forEach(function(k){ seen[k] = 1; }); out.push(g);
  });
  return out.map(function(g){ return { key:'t' + g.join('-'), idx:g, phrase:g.map(function(i){ return clean(S.toks[i]); }).join(' ') }; });
}
function syncTerms(){
  var gs = groups(), terms = of('term'), keep = [], given = [];
  gs.forEach(function(g){
    var ex = terms.filter(function(t){ return t.key === g.key; })[0];
    if (!ex) {
      var old = terms.filter(function(t){ return !t.fromMull && given.indexOf(t) < 0 && !gs.some(function(h){ return h.key === t.key; }) && t.idx && t.idx.some(function(i){ return g.idx.indexOf(i) >= 0; }) && t.text; })[0];
      if (old) given.push(old);
      ex = mk('term', { key:g.key, idx:g.idx, phrase:g.phrase, text: old ? old.text : '', meaning: old ? (old.meaning != null ? old.meaning : old.text) : '', boundary: old ? (old.boundary || '') : '' });
    } else { ex.idx = g.idx; ex.phrase = g.phrase; }
    keep.push(ex);
  });
  terms.forEach(function(t){ if (t.fromMull) keep.push(t); });
  terms.forEach(function(t){ if (keep.indexOf(t) < 0) dropNode(t, true); });
  S.nodes = S.nodes.filter(function(n){ return n.kind !== 'term'; }).concat(keep);
}
/* highlight + card colour: 0 = yellow for the student's own words, 2 = purple for words Thinky suggested */
function termColour(n){ return n.fromMull ? 2 : 0; }
function termIndex(n){ var ts = of('term').slice().sort(function(a, b){ return termPos(a.id) - termPos(b.id); }); var k = ts.indexOf(n); return k < 0 ? 0 : k; }
function composeTerm(n){ var m = (n.meaning || '').trim(), b = (n.boundary || '').trim(); return b ? (m ? m + '\nBoundary: ' + b : 'Boundary: ' + b) : m; }
function mk(kind, extra){
  var n = Object.assign({ id: S.nextId++, kind: kind, text: '', status: 'draft', lastSent: '', ai: null, thread: [], replies: {} }, extra || {});
  return n;
}
function dropNode(n, quiet){
  var index = S.nodes.indexOf(n);
  if (!quiet && index >= 0) {
    var relations = S.nodes.filter(function(x){ return x !== n; }).map(function(x){
      return { node: x, linkIndex: x.links && x.links.indexOf(n.id), hadParent: x.parent === n.id };
    }).filter(function(item){ return item.linkIndex >= 0 || item.hadParent; });
    recordUndo(function(){
      if (S.nodes.indexOf(n) < 0) S.nodes.splice(Math.min(index, S.nodes.length), 0, n);
      relations.forEach(function(item){
        if (S.nodes.indexOf(item.node) < 0) return;
        if (item.linkIndex >= 0) {
          item.node.links = item.node.links || [];
          if (item.node.links.indexOf(n.id) < 0) item.node.links.splice(Math.min(item.linkIndex, item.node.links.length), 0, n.id);
        }
        if (item.hadParent && item.node.parent == null) item.node.parent = n.id;
      });
      renderAll();
    });
  }
  if (ctl[n.id]) { try { ctl[n.id].abort(); } catch(e){} delete ctl[n.id]; }
  S.nodes = S.nodes.filter(function(x){ return x !== n; });
  S.nodes.forEach(function(x){ if (x.links) x.links = x.links.filter(function(id){ return id !== n.id; }); if (x.parent === n.id) x.parent = null; });
  var el = els.get(n.id);
  if (n.kind === 'evidence' && el && Number.isInteger(n.evSlot)) {
    S.evidenceSlotHeights = S.evidenceSlotHeights || {};
    S.evidenceSlotHeights[n.evSlot] = el.offsetHeight;
  }
  if (el) { el.remove(); els.delete(n.id); }
  if (!quiet) renderAll();
}
function matchMull(phrase){
  var p = norm(phrase);
  return S.mull.terms.filter(function(m){ var q = norm(m.phrase); return q === p || (q && p && (q.indexOf(p) >= 0 || p.indexOf(q) >= 0)); })[0] || null;
}
function missedMull(){
  var terms = of('term');
  return S.mull.terms.filter(function(m){ return !terms.some(function(t){ var q = norm(m.phrase), p = norm(t.phrase); return q === p || q.indexOf(p) >= 0 || p.indexOf(q) >= 0; }); });
}
function shownIdeas(){ return missedMull().filter(function(m){ return (S.dismissed || []).indexOf(norm(m.phrase)) < 0; }).slice(0, 2); }
function ownNoteTerm(i){ return of('term').filter(function(t){ return t.own && t.idx && t.idx.indexOf(i) >= 0; })[0] || null; }
function toggleTok(i){
  var own = ownNoteTerm(i);
  if (own && S.sel.indexOf(i) < 0) { dropNode(own); var bb = $('toks').children[i]; if (bb) bb.focus(); return; }
  var r = chunkOf(i), idx = r ? range(r) : [i];
  if (S.sel.indexOf(i) >= 0 && r && S.userChunks && S.userChunks.indexOf(r) >= 0) { S.userChunks = S.userChunks.filter(function(u){ return u !== r; }); computeChunks(); }
  S.sel = S.sel.indexOf(i) >= 0 ? S.sel.filter(function(x){ return idx.indexOf(x) < 0; }) : S.sel.concat(idx.filter(function(x){ return S.sel.indexOf(x) < 0; }));
  syncTerms(); prefetch();
  if (!S.revealed) { var n = of('term').length; S.say = n < 2 ? SAYS.tapTwo : SAYS.writeMeaning; S.mood = 'listening'; S.focus = null; }
  if (S.sel.indexOf(i) >= 0) {
    var picked = of('term').find(function(t){ return t.idx && t.idx.indexOf(i) >= 0; });
    if (picked) { S.focus = picked.id; S.mullAt = null; S.pin = null; }
  }
  renderAll();
  var b = $('toks').children[i]; if (b) b.focus();
}

/* ---------- unlocks ---------- */
function stage(){
  if (!S.evOpen) return 1; /* Evidence opens only once every word, including any Thinky left a note on, is dealt with */
  return S.sec === 'argue' ? 3 : 2;
}
