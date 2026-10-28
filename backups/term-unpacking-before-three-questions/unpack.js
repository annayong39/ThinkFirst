/* =====================================================================
   ThinkFirst — UNPACK: Definition, boundaries and "My unpacking"
   ---------------------------------------------------------------------
   fetchGuide(n)  a word is highlighted → its type + Definition + Thinky's first question (prompt #3)
   followUp(n)    Enter in "Extent of Scope" → Thinky's next question, by word type (prompt #3b)
   clarify(n, t)  "Ask Thinky" box under the question → Thinky explains what it meant (prompt #3c)
   summarise(n)   Thinky judges the term unpacked, or Enter after the last question → "My unpacking" (prompt #4)
   Only Enter calls the AI on an Unpack card; clicking out does nothing.

   n.wtype is the word's type from prompt #3: CONCEPT, QUALIFIER or COMMAND (never shown).
   n.talk holds the conversation on a card: [{ q: Thinky's question, a: the
   student's answer, or null while it's still waiting for one, focus: the
   direction the question aimed at, from TERM_DIRS (never shown) }].
   n.unpacked = true once prompt #3b judges the term unpacked: no more questions.
   n.clar holds the "Ask Thinky" chat about the current question:
   { q: the question, items: [{ ask, reply }] }. It starts fresh with each new question.
   ===================================================================== */

/* Each kind of word is unpacked differently (prompt #3 decides the kind; see TERM_TYPES in js/prompts.js).
   TERM_MAX:  the most questions Thinky asks before Enter writes "My unpacking"
   TERM_DIRS: the directions Thinky checks off, in the order it asks about them */
var TERM_MAX  = { CONCEPT: 5, QUALIFIER: 3, COMMAND: 2 };
var TERM_DIRS = { CONCEPT: ['MEANING', 'SCOPE', 'LINK'], QUALIFIER: ['STANDARD', 'COMPARISON', 'STANCE'], COMMAND: ['TASK', 'APPLY'] };
function wtype(n){ return TERM_MAX[n.wtype] ? n.wtype : 'CONCEPT'; } /* unknown or missing → treat as a concept word, as before */

/* ---------- Unpack: Thinky gives the general meaning + decisions; the student sets the boundaries ---------- */
function renderGuide(n, w){
  var g = n.guide, gm = w.querySelector('.gmean'), gd = w.querySelector('.gdec'); if (!gm) return;
  var key = g ? g.status + '|' + (g.meaning || '') : 'none';
  if (gm.getAttribute('data-k') === key) return; gm.setAttribute('data-k', key);
  if (!g || g.status === 'loading') { gm.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Thinky is looking this word up…'; gd.innerHTML = ''; return; }
  if (g.status === 'offline') { gm.textContent = 'Add your OpenAI key in Settings (top right) to see a definition. You can still set your boundaries below.'; gd.innerHTML = ''; return; }
  if (g.status === 'error') { gm.innerHTML = 'That didn’t come through. <button type="button" class="retry" data-gretry>Try again</button>'; gd.innerHTML = ''; return; }
  gm.textContent = g.meaning;
  gd.innerHTML = g.decisions.map(function(d){ return '<li>' + esc(d) + '</li>'; }).join('');
  gm.parentNode.classList.remove('pop'); void gm.offsetWidth; gm.parentNode.classList.add('pop');
}
/* ---------- command words (Discuss, To what extent…): a pre-set guide instead of questions ---------- */
/* is this highlighted word (part of) a command phrase on the pre-set list that appears in the question?
   e.g. "extent" → "To what extent". Returns { phrase as written in the question, meaning, guide } or null. */
function findCommand(n){
  var t = norm(n.phrase); if (t.length < 3 || typeof COMMAND_GUIDES === 'undefined') return null;
  var q = ' ' + norm(S.q) + ' ', raw = String(S.q || '');
  for (var i = 0; i < COMMAND_GUIDES.length; i++) {
    var c = COMMAND_GUIDES[i];
    for (var j = 0; j < c.match.length; j++) {
      var m = norm(c.match[j]);
      if ((' ' + m + ' ').indexOf(' ' + t + ' ') < 0 || q.indexOf(' ' + m + ' ') < 0) continue;
      var at = raw.toLowerCase().indexOf(c.match[j]), shown = at >= 0 ? raw.substr(at, c.match[j].length) : c.match[j];
      return { phrase: shown.charAt(0).toUpperCase() + shown.slice(1), meaning: c.meaning, guide: c.guide };
    }
  }
  return null;
}
/* fill a command-word card: Definition + "How to approach it", no questions; it counts as unpacked straight away */
function setCommand(n, phrase, meaning, guide){
  n.wtype = 'COMMAND'; n.cmdLabel = phrase; n.cmdGuide = guide;
  n.guide = { status: 'ready', meaning: meaning, decisions: [] };
  n.unpacked = true; n.summary = guide; n.summaryV = Date.now(); n.status = 'done';
  renderMeta(n); follow();
  if (S.focus === n.id && !S.thinking) askDecisions(n);
  maybeReveal(); mapLater(nudgeEvidence, 1500); /* a command card finishes at once: if it was the last word to deal with, Evidence can open */
}
function fetchGuide(n){
  if (n.kind !== 'term' || (n.guide && n.guide.status !== 'error')) return;
  var cmd = findCommand(n); if (cmd) { setCommand(n, cmd.phrase, cmd.meaning, cmd.guide); return; } /* on the pre-set list: no AI needed */
  if (!sample) { if (live === false) { n.guide = { status: 'offline' }; renderMeta(n); } return; }
  n.guide = { status: 'loading' }; renderMeta(n);
  var q = S.q, term = labelFor(n);
  var prompt = PROMPTS.termGuide({ question: q, term: term });   /* prompt text: js/prompts.js #3 */
  mapJSON(prompt, {}).then(function(res){
    if (!node(n.id) || q !== S.q) return;
    var dec = (res && Array.isArray(res.decisions) ? res.decisions : []).map(function(d){ return String(d || '').trim().slice(0, 200); }).filter(Boolean).slice(0, 3);
    var mean = String((res && res.meaning) || '').trim().slice(0, 260);
    n.guide = mean ? { status: 'ready', meaning: mean, decisions: dec } : { status: 'error' };
    var ty = String((res && res.type) || '').trim().toUpperCase(); if (TERM_MAX[ty]) n.wtype = ty; /* CONCEPT / QUALIFIER / COMMAND */
    var gd = String((res && res.guide) || '').trim().slice(0, 260);
    if (ty === 'COMMAND' && mean && gd) { setCommand(n, labelFor(n), mean, gd); return; } /* a command word not on the pre-set list: the AI wrote its guide */
    renderMeta(n); follow();
    if (S.focus === n.id && mean && !S.thinking) askDecisions(n);
  }, function(err){
    if (!node(n.id)) return;
    n.guide = { status: handleAccess(err) ? 'offline' : 'error' }; renderMeta(n); renderLive();
  });
}
/* the question Thinky is currently waiting for an answer to, or null */
function openQ(n){
  var g = n.guide;
  if (!n.talk || !n.talk.length) return g && g.status === 'ready' && g.decisions.length ? g.decisions[0] : null;
  var last = n.talk[n.talk.length - 1];
  return last.a == null ? last.q : null;
}
/* everything the student has written for this term: each answer (shown as sub-cards) plus anything new in the box */
function scopeText(n){
  var parts = (n.talk || []).filter(function(t){ return t.a != null; }).map(function(t){ return t.a; });
  var d = (n.boundary || '').trim(); if (d) parts.push(d);
  return parts.join('\n').trim();
}
/* put text in the Extent of Scope box (empty after each answer, so the next answer starts fresh) */
function setBox(n, v){
  n.boundary = v; n.text = v;
  var w = els.get(n.id), ta = w && w.querySelector('textarea.main'); if (ta) ta.value = v;
}
/* the AI call failed: put the answer back in the box so pressing Enter again retries it */
function unAnswer(n, last){ setBox(n, last.a || ''); last.a = null; delete last.k; renderMeta(n); follow(); } /* k: so the retried answer animates in again */
function followUp(n){
  if (n.cmdGuide) return; /* command words have no questions */
  var a = (n.boundary || '').trim();
  if (wc(a) < 2) { S.focus = n.id; S.say = SAYS.needMoreWords; S.mood = 'listening'; renderMull(); return; }
  if (n.asking) return; /* already thinking of the next question */
  var g = n.guide && n.guide.status === 'ready' ? n.guide : null;
  if (!sample || !g || !g.decisions.length) { summarise(n); return; } /* no AI or no first question: go straight to "My unpacking" */
  if (n.unpacked) { summarise(n); return; } /* Thinky already judged this term unpacked: Enter just refreshes "My unpacking" */
  var ty = wtype(n), max = TERM_MAX[ty], dirs = TERM_DIRS[ty];
  if (!n.talk) n.talk = [{ q: g.decisions[0], a: null, focus: dirs[0] }]; /* question 1 always aims at this type's first direction */
  var last = n.talk[n.talk.length - 1];
  if (last.a == null) { last.a = a.slice(0, 600); setBox(n, ''); renderMeta(n); follow(); } /* the answer moves into a sub-card below; the box empties */
  if (n.talk.length >= max) { n.unpacked = true; summarise(n); return; } /* all of this type's questions answered */
  n.asking = true;
  S.focus = n.id; S.mullAt = null; S.thinking = true; S.mood = 'thinking'; S.say = SAYS.readingAnswer; renderMull();
  /* prompt text: js/prompts.js #3b (termFollowUp) */
  var prompt = PROMPTS.termFollowUp({
    question: S.q, term: labelFor(n), meaning: g.meaning, type: ty, dirs: dirs, max: max,
    talk: n.talk, turn: n.talk.length + 1, nudge: n.talk.length + 1 === max
  });
  mapJSON(prompt, {}).then(function(res){
    n.asking = false; if (!node(n.id)) return;
    S.thinking = false;
    /* the GP checklist in prompt #3b says the term is unpacked: stop asking and write "My unpacking" */
    if (res && res.done === true) { n.unpacked = true; summarise(n, true); return; }
    var q = String((res && res.question) || '').trim().slice(0, 200);
    var fo = String((res && res.focus) || '').toUpperCase(); if (dirs.indexOf(fo) < 0) fo = '';
    if (!q) { unAnswer(n, last); if (S.focus === n.id) { S.say = SAYS.didntComeThrough; S.mood = 'oops'; } renderMull(); return; }
    n.talk.push({ q: q, a: null, focus: fo });
    if (S.focus === n.id) askDecisions(n); else renderMull();
  }, function(err){
    n.asking = false; if (!node(n.id)) return;
    S.thinking = false; unAnswer(n, last); /* pressing Enter again retries */
    var off = handleAccess(err);
    if (S.focus === n.id) { S.say = off ? SAYS.cantReach : err && err.code === 'rate_limited' ? SAYS.breather : SAYS.didntComeThrough; S.mood = 'oops'; }
    renderMull(); renderLive();
  });
}
/* the student asks Thinky what its current question means; this is not an answer, so the question stays open */
function clarify(n, ask){
  ask = String(ask || '').trim().slice(0, 300);
  var q = openQ(n); if (!ask || !q || !sample) return;
  if (!n.clar || n.clar.q !== q) n.clar = { q: q, items: [] };
  var cl = n.clar; if (cl.items.some(function(i){ return i.reply == null; })) return; /* still answering the last one */
  var item = { ask: ask, reply: null }; cl.items.push(item);
  renderMull();
  /* prompt text: js/prompts.js #3c (termClarify) */
  var prompt = PROMPTS.termClarify({
    question: S.q, term: labelFor(n), thinkyQ: q, ask: ask,
    chat: cl.items.filter(function(i){ return i !== item && i.reply; })
  });
  mapJSON(prompt, {}).then(function(res){
    var r = String((res && res.reply) || '').trim().replace(/^I mean\s*[:,\-–—]?\s*/i, ''); /* drop an "I mean:" opener if the AI still adds one */
    item.reply = (r.charAt(0).toUpperCase() + r.slice(1)).slice(0, 400) || SAYS.didntComeThrough;
    renderMull();
  }, function(err){
    item.reply = handleAccess(err) ? SAYS.cantReach : SAYS.didntComeThrough;
    renderMull(); renderLive();
  });
}
/* the "Ask Thinky" box lives inside the speech bubble, which is redrawn often, so listen on the bubble itself */
$('say').addEventListener('keydown', function(e){
  if (!e.target.matches('.clarin') || e.key !== 'Enter') return;
  e.preventDefault();
  var n = node(S.askNode), t = e.target.value; e.target.value = ''; /* clear first, so the redraw doesn't put the sent text back */
  if (n) clarify(n, t);
});
function summarise(n, quiet){
  var b = scopeText(n);
  if (quiet && S.focus === n.id) quiet = false; /* clicked onto empty space, not another card: Thinky can stay here */
  if (wc(b) < 2) { S.focus = n.id; S.say = SAYS.needMoreWords; S.mood = 'listening'; renderMull(); return; }
  if (n.summary && b === n.lastSent && n.status === 'done') return;
  if (!sample) { if (live === false) { n.status = 'offline'; renderMeta(n); } return; }
  if (ctl[n.id]) { try { ctl[n.id].abort(); } catch(e){} }
  var c = new AbortController(); ctl[n.id] = c;
  n.lastSent = b; n.status = 'reading';
  if (!quiet) { S.focus = n.id; S.thinking = true; S.mood = 'thinking'; S.say = SAYS.unpacking; }
  renderMeta(n); renderMull();
  var g = n.guide && n.guide.status === 'ready' ? n.guide : null;
  /* prompt text: js/prompts.js #4 (unpackSummary) */
  var prompt = PROMPTS.unpackSummary({
    question: S.q, term: labelFor(n), type: wtype(n), boundaries: b.slice(0, 1500),
    meaning: g ? g.meaning : '', talk: n.talk || (g && g.decisions.length ? [{ q: g.decisions[0], a: null }] : [])
  });
  mapJSON(prompt, { signal: c.signal }).then(function(res){
    if (c.signal.aborted || !node(n.id)) return;
    delete ctl[n.id]; if (!quiet) S.thinking = false;
    var here = !quiet || S.focus === n.id; /* only talk about this card if the student is still on it */
    var sm = String((res && res.summary) || '').trim();
    if (!sm) { n.status = 'error'; if (here) { S.say = SAYS.didntComeThrough; S.mood = 'oops'; } renderMeta(n); renderMull(); return; }
    n.summary = sm.slice(0, 500); n.gap = ''; n.summaryV = Date.now();
    n.status = scopeText(n) === b ? 'done' : 'stale';
    if (here) { S.mood = 'pleased'; S.say = SAYS.unpackDone; }
    renderAll(); maybeReveal(); mapLater(nudgeEvidence, 7000);
  }, function(err){
    if (err && err.code === 'cancelled') return;
    delete ctl[n.id]; if (!quiet) S.thinking = false;
    n.status = handleAccess(err) ? 'offline' : 'error'; n.lastSent = '';
    if (!quiet || S.focus === n.id) { S.say = n.status === 'offline' ? SAYS.cantReach : SAYS.didntComeThrough; S.mood = 'oops'; }
    renderMeta(n); renderMull(); renderLive();
  });
}
