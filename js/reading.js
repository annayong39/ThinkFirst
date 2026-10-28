/* Evidence search links and the Unpack-to-Evidence transition. */
function trigger(n){
  if (n.kind !== 'evidence') return '';
  var value = n.text.trim();
  if (!value) { renderMeta(n); return ''; }
  var url = articleSearchUrl(value.slice(0, 240), '');
  if (value !== n.lastSent || !n.ai || n.ai.searchUrl !== url || n.status !== 'done') {
    n.lastSent = value; n.status = 'done'; n.searchError = '';
    n.ai = { v: Date.now(), searchUrl: url };
    S.focus = n.id; S.mood = 'pleased'; S.say = SAYS.evidenceSearchReady;
    renderAll(); maybeReveal();
  }
  return url;
}
function prefetch(){
  if (!sample || S.mull.status === 'loading' || S.mull.status === 'ready') return;
  S.mull.status = 'loading';
  prefetchCtl = new AbortController(); var my = prefetchCtl, q = S.q;
  var prompt = PROMPTS.keyWords({ question: q });
  mapJSON(prompt, {signal:my.signal}).then(function(res){
    if (my.signal.aborted || q !== S.q) return;
    var lq = q.toLowerCase();
    S.mull.terms = (res && Array.isArray(res.terms) ? res.terms : []).map(function(t){ return { phrase: clean(String((t && t.phrase) || '')), why: String((t && t.why) || '').slice(0, 180) }; })
      .filter(function(t){ return t.phrase && lq.indexOf(t.phrase.toLowerCase()) >= 0; }).slice(0, 5);
    S.mull.status = 'ready'; maybeReveal();
  }, function(err){ if (err && err.code === 'cancelled') return; S.mull.status = 'error'; handleAccess(err); maybeReveal(); });
}
function maybeReveal(){
  if (S.revealed || !S.wantReveal) return;
  var mine = of('term').filter(function(t){ return !t.fromMull; });
  if (mine.length < 2 || !mine.every(function(t){ return t.status === 'done' || t.status === 'stale' || t.status === 'error' || t.status === 'offline'; })) return;
  if (S.mull.status === 'idle') { prefetch(); }
  if (S.mull.status === 'loading' || S.mull.status === 'idle') { if (sample) { S.say = SAYS.thinkingToo; renderMull(); } return; }
  S.revealed = true;
  var ideas = Math.min(2, missedMull().length);
  S.focus = null; S.mood = 'cheer';
  if (ideas) {
    S.say = ideas === 1 ? SAYS.unpackFinishedNote : SAYS.unpackFinishedNotes;
    renderAll();
  } else openEvidence();
}
function unpackDone(){
  if (!S.revealed || S.evOpen || of('evidence').length || shownIdeas().length) return false;
  var terms = of('term');
  return terms.length >= 2 && terms.every(function(t){ return t.status === 'done' || t.status === 'stale' || t.status === 'error' || t.status === 'offline'; });
}
