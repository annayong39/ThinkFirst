/* =====================================================================
   ThinkFirst — RENDER: drawing the mind map
   ---------------------------------------------------------------------
   Builds and updates every card, row, wire and Thinky's position.
   renderAll() redraws everything; smaller render* functions redraw one part.
   ===================================================================== */

/* ---------- rendering ---------- */
function renderSteps(){
  var st = stage();
  $('steps').innerHTML = ['Unpack','Evidence','Argue'].map(function(l, k){
    var n = k + 1; return '<span class="step' + (n === st ? ' on' : n < st ? ' done' : '') + '"><b>' + (n < st ? '✓' : n) + '</b>' + l + '</span>';
  }).join('');
}
function updateQuestionReminder(){
  var reminder = $('question-reminder');
  if (!reminder) return;
  if (!S || !S.q || document.body.classList.contains('onb')) { if (!reminder.hidden) reminder.hidden = true; return; }
  if (reminder.textContent !== S.q) reminder.textContent = S.q;
  var question = $('qcard').getBoundingClientRect();
  var header = document.querySelector('.top').getBoundingClientRect();
  var hidden = question.bottom > header.bottom;
  if (reminder.hidden !== hidden) reminder.hidden = hidden;
}
var questionReminderRaf = 0;
function queueQuestionReminder(){
  if (questionReminderRaf) return;
  questionReminderRaf = requestAnimationFrame(function(){ questionReminderRaf = 0; updateQuestionReminder(); });
}
window.addEventListener('scroll', queueQuestionReminder, { passive: true });
window.addEventListener('resize', queueQuestionReminder);
function renderQuestion(){
  var box = $('toks'); box.innerHTML = '';
  var missedWords = {};
  if (S.revealed) shownIdeas().forEach(function(m){ norm(m.phrase).split(' ').forEach(function(w){ missedWords[w] = 1; }); });
  S.toks.forEach(function(t, i){
    var b = document.createElement('button'); b.type = 'button'; b.textContent = t;
    var on = S.sel.indexOf(i) >= 0 || !!ownNoteTerm(i), cls = 'tok';
    if (on) { var term = of('term').filter(function(x){ return x.idx && x.idx.indexOf(i) >= 0; })[0]; cls += ' on'; if (term) cls += ' tc' + termColour(term); var ix = term && term.idx && term.idx.length ? term.idx : [i]; if (i === Math.min.apply(null, ix)) cls += ' hs'; if (i === Math.max.apply(null, ix)) cls += ' he'; }
    else if (S.revealed && missedWords[norm(t)]) cls += ' missed';
    var cr = chunkOf(i); if (cr) { cls += ' ch' + (i === cr[1] ? ' chend' : ''); b.title = 'Part of the phrase “' + range(cr).map(function(k){ return clean(S.toks[k]); }).join(' ') + '”'; }
    b.className = cls; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.setAttribute('data-i', i);
    b.addEventListener('click', function(){ if (suppressTokClick) return; toggleTok(i); });
    box.appendChild(b);
  });
  var n = of('term').filter(function(t){ return !t.fromMull || t.own; }).length;
  $('qfoot').innerHTML = S.revealed ? '' : '<span>Highlight the words you want to unpack!</span>';
}

function labelFor(n){
  if (n.kind === 'term') return n.phrase;
  if (n.kind === 'branch') return BR[n.btype] || 'Branch';
  return KIND_LABEL[n.kind];
}
/* Unpack: Thinky flies to the clicked card and asks its current question in the speech bubble */
function askDecisions(n){
  if (S.subEl) closeSubQs(true); /* Thinky leaves the answer card it was showing */
  if (n.cmdGuide) { /* command words: no question, just a pointer to the card's guide */
    S.focus = n.id; S.mullAt = null; S.pin = null; S.say = SAYS.commandNote; S.sayList = null; S.mood = 'pleased'; renderMull(); return true;
  }
  if (n.asking) return false;
  var q = openQ(n); /* js/unpack.js */
  if (!q) return false; /* no question waiting: all 5 answered, or the Definition isn't ready yet */
  S.focus = n.id; S.mullAt = null; S.pin = null;
  var first = !n.talk || n.talk.length === 1;
  S.say = first ? (n.summary ? SAYS.stillDeciding : SAYS.decideOwnWords) : SAYS.digDeeper;
  S.sayList = [q]; S.sayListFor = S.say; S.askNode = n.id; /* askNode: the card the "Ask Thinky" box belongs to */
  S.mood = 'curious'; renderMull(); return true;
}
function placeholder(n){
  if (n.asked) return 'Answer Thinky: ' + n.asked.q;
  if (n.kind === 'term') return 'Define this term’s scope in context. What’s included or excluded?';
  if (n.kind === 'evidence') return 'A news story, something from class, your own feed…';
  if (n.kind === 'claim') return 'I think ___ has more influence because ___';
  return 'Write your branch…';
}
function minWords(n){ return n.kind === 'term' ? 2 : 3; }

var TERM_TYPE_HELP = {
  CONCEPT: { label: 'Concept term', description: 'An idea or subject in the question that needs unpacking and defining its scope.' },
  QUALIFIER: { label: 'Qualifier term', description: 'A qualifier term limits or compares a claim, helping you identify exactly what your essay must test.' },
  COMMAND: { label: 'Command word', description: 'A word or phrase that tells you what to do with the claim, such as discuss, compare, assess or evaluate it.' }
};

/* Unpack chat layout trial: set to false to restore the original reply tree. */
var UNPACK_CHAT_TRIAL = true;

function createEl(n){
  var w = document.createElement('div');
  w.className = 'nw' + (n.kind === 'claim' ? ' wide' : '');
  var chatTrial = n.kind === 'term' && UNPACK_CHAT_TRIAL;
  if (chatTrial) w.classList.add('unpack-chat-trial');
  if (n.kind === 'term' && !restoringProject) mapLater(function(){ fetchGuide(n); }, 0);
  if (n.kind === 'term' || n.kind === 'evidence' || n.kind === 'branch') { birth('n' + n.id); w.classList.add('sprout'); w.style.animationDelay = (reduced ? 0 : DRAW) + 'ms'; }
  w.setAttribute('data-id', n.id);
  w.innerHTML = '<article class="card"><div class="lbl"><span class="nm"></span><span class="bslot"></span><span class="sp"></span>'
    + (n.kind === 'term' ? '<span class="termtype-slot" hidden><button type="button" class="termtype" aria-describedby="termtype-help-' + n.id + '"><span class="termtype-label"></span><span class="termtype-tip" id="termtype-help-' + n.id + '" role="tooltip"></span></button></span>' : '')
    + '<span class="xs"></span></div>'
    + '<div class="chips extra" hidden></div>'
    + '<div class="cnote" hidden></div>'
    + (n.kind === 'term'
      ? '<div class="guide"><div class="flab">Definition</div><div class="gmean"></div><ul class="gdec" hidden></ul></div><div class="cmdguide" hidden><div class="flab mine">How to approach it</div><p class="cg"></p></div>'
        + (chatTrial ? '<div class="subs" hidden></div>' : '')
        + '<div class="flab mine scopelab">Extent of Scope</div><textarea class="main fld" data-f="boundary"></textarea>'
      : '<textarea class="main fld"></textarea>')
    + '<div class="status"></div>' + '</article>' /* no "+" link handle on Unpack cards any more */ + (n.kind === 'term' && !chatTrial ? '<div class="subs" hidden></div>' : '') + '<div class="tab' + (n.kind === 'evidence' ? ' evidence-tab' : '') + '" hidden></div>';
  var ta = w.querySelector('textarea.main');
  if (n.kind === 'term' && n.boundary == null) n.boundary = n.text || '';
  if (n.kind === 'term') {
    var typeBadge = w.querySelector('.termtype');
    function placeTypeTip(){
      var rect = typeBadge.getBoundingClientRect(), width = document.documentElement.clientWidth;
      var room = typeBadge.querySelector('.termtype-tip').getBoundingClientRect().width + 12;
      typeBadge.classList.toggle('tip-left', width - rect.right < room && rect.left >= room);
      typeBadge.classList.toggle('tip-below', width - rect.right < room && rect.left < room);
      w.classList.add('termtype-open');
    }
    typeBadge.addEventListener('mouseenter', placeTypeTip);
    typeBadge.addEventListener('focus', placeTypeTip);
    typeBadge.addEventListener('mouseleave', function(){ w.classList.remove('termtype-open'); });
    typeBadge.addEventListener('blur', function(){ w.classList.remove('termtype-open'); });
    /* the unpacking statement is editable; edits are just kept, nothing is re-sent */
    var summaryBefore = '';
    w.addEventListener('focusin', function(e){ if (e.target.matches && e.target.matches('.mysum p')) summaryBefore = n.summary || ''; });
    w.addEventListener('focusout', function(e){
      if (!(e.target.matches && e.target.matches('.mysum p')) || summaryBefore === n.summary) return;
      var previous = summaryBefore;
      recordUndo(function(){ n.summary = previous; renderMeta(n); renderWords(); renderWires(); });
    });
    w.addEventListener('input', function(e){ if (e.target.matches && e.target.matches('.mysum p')) n.summary = e.target.innerText.replace(/\s+/g, ' ').trim(); });
    w.addEventListener('keydown', function(e){ if (e.key === 'Enter' && !e.shiftKey && e.target.matches && e.target.matches('.mysum p')) { e.preventDefault(); e.target.blur(); } });
    w.addEventListener('paste', function(e){ if (!(e.target.matches && e.target.matches('.mysum p'))) return; e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData('text'); document.execCommand('insertText', false, t); });
  }
  if (n.kind === 'term') w.querySelector('article').addEventListener('click', function(e){ if (!e.target.closest('textarea,button,a,input,.subs') && !S.thinking) askDecisions(n); });
  w.querySelectorAll('textarea.fld').forEach(function(f){
    var key = f.getAttribute('data-f');
    var textBefore = '', statusBefore, sentBefore, aiBefore;
    f.value = key ? (n[key] || '') : n.text;
    f.addEventListener('input', function(){
      if (key) n[key] = f.value; n.text = f.value;
      var cur = n.text.trim();
      if (ctl[n.id] && cur !== n.lastSent) { try { ctl[n.id].abort(); } catch(e){} delete ctl[n.id]; n.status = n.ai ? 'stale' : 'draft'; S.thinking = false; S.say = SAYS.listening; S.mood = 'listening'; renderMull(); }
      else if (n.status === 'done' && (n.kind !== 'term' || (n.reads || 0) < 2) && cur !== n.lastSent) n.status = 'stale';
      else if (n.status === 'stale' && cur === n.lastSent) n.status = 'done';
      renderMeta(n); renderWords();
    });
    f.addEventListener('focus', function(){
      if (n.kind === 'term') clearSelection();
      textBefore = f.value; statusBefore = n.status; sentBefore = n.lastSent; aiBefore = n.ai;
      S.focus = n.id;
      if (n.kind === 'evidence' && !n.text.trim()) {
        S.mullAt = null; S.pin = null; S.askNode = null; S.sayList = null;
        S.say = SAYS.ownEvidencePrompt; S.mood = 'curious'; renderMull(); return;
      }
      if (n.kind === 'term' && !S.thinking) {
        if (askDecisions(n)) return;
        S.mullAt = null; S.mood = n.summary ? 'pleased' : 'listening';
        S.say = n.summary ? SAYS.cardChange : n.guide && n.guide.status === 'ready' ? SAYS.cardRead : SAYS.cardWrite;
        renderMull(); return;
      }
      positionMull();
    });
    f.addEventListener('keydown', function(e){
      if (e.key !== 'Enter' || e.shiftKey) return;
      e.preventDefault();
      if (n.kind === 'term') { followUp(n); return; } /* next question; "My unpacking" after question 5 (js/unpack.js) */
      f.blur();
      if (n.kind === 'evidence') trigger(n);
    });
    /* Thinky reads once the student leaves the card, not when moving between its two boxes */
    /* term cards: once the student clicks anywhere outside the card (often straight into the next card), send the boundaries right away */
    /* Unpack cards never call the AI on click-out: only Enter does (see the keydown handler above) */
    f.addEventListener('blur', function(){
      if (f.value !== textBefore) {
        var previous = textBefore, previousStatus = statusBefore, previousSent = sentBefore, previousAI = aiBefore;
        recordUndo(function(){
          if (!node(n.id)) return;
          if (ctl[n.id]) { try { ctl[n.id].abort(); } catch(e) {} delete ctl[n.id]; }
          f.value = previous; n.text = previous; if (key) n[key] = previous;
          n.status = previousStatus; n.lastSent = previousSent; n.ai = previousAI;
          renderMeta(n); renderWords(); renderWires();
        });
      }
      mapLater(function(){ if (w.contains(document.activeElement)) return; if (n.kind !== 'term') trigger(n); }, 0);
    });
  });
  var lb = w.querySelector('.lbl');
  if (n.kind === 'term') w.querySelector('.nm').title = 'Drag to move this card';
  else lb.title = 'Drag to move this card';
  lb.addEventListener('pointerdown', function(e){
    if (e.target.closest('button')) return;
    e.preventDefault();
    beginCardDrag(e, n, w);
  });
  w.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-del')) { dropNode(n); return; }
    if (b.hasAttribute('data-split')) { var cr = chunkOf(n.idx[0]); if (cr) { S.split[cr[0] + '-' + cr[1]] = true; S.userChunks = (S.userChunks || []).filter(function(u){ return u !== cr; }); } computeChunks(); syncTerms(); renderAll(); return; }
    if (b.hasAttribute('data-link')) { var t = +b.getAttribute('data-link'); n.link = n.link === t ? null : t; renderAll(); return; }
    if (b.hasAttribute('data-side')) { var s = +b.getAttribute('data-side'); n.side = n.side === s ? null : s; renderMeta(n); return; }
    if (b.hasAttribute('data-grow')) { grow(n, b.getAttribute('data-grow')); return; }
    if (b.hasAttribute('data-skip')) { var q = qById(n, b.getAttribute('data-skip')); if (q) { q.skipped = true; n.thread.push({q:q.q, a:null}); renderMeta(n); } return; }
    if (b.hasAttribute('data-sum')) { summarise(n); return; }
    if (b.hasAttribute('data-gretry')) { n.guide = null; fetchGuide(n); return; }
    if (b.hasAttribute('data-retry')) { if (n.kind === 'term') summarise(n); else trigger(n, true); return; }
  });
  var replyBefore = '';
  w.querySelector('.tab').addEventListener('focusin', function(e){ if (e.target.matches('.reply')) replyBefore = e.target.value; });
  w.querySelector('.tab').addEventListener('focusout', function(e){
    if (!e.target.matches('.reply')) return;
    var qid = e.target.getAttribute('data-q'), q = qById(n, qid), v = e.target.value.trim();
    if (e.target.value !== replyBefore) {
      var previousReply = replyBefore;
      recordUndo(function(){
        n.replies[qid] = previousReply;
        var field = w.querySelector('.reply[data-q="' + qid + '"]');
        if (field) field.value = previousReply;
        renderWords();
      });
    }
    n.replies[qid] = e.target.value;
    if (q && !q.done && wc(v) >= 2) { q.done = true; n.thread.push({q:q.q, a:v}); trigger(n, true); }
  });
  w.querySelector('.tab').addEventListener('input', function(e){ if (e.target.matches('.reply')) { n.replies[e.target.getAttribute('data-q')] = e.target.value; renderWords(); } });
  w.querySelector('.tab').addEventListener('keydown', function(e){ if (e.target.matches('.reply') && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.target.blur(); } });
  return w;
}
/* Unpack: each answer the student gave Thinky becomes a small card stacked neatly below the term card,
   on a straight rail with a tick into each card (the lines are CSS: .subs in css/map.css).
   The newest one pops in. They stay fixed in place (no dragging). Clicking one makes Thinky
   fly over to it and show, in its own speech bubble, the question it asked for that answer. */
function renderSubs(n, w){
  var box = w.querySelector('.subs'); if (!box) return;
  var done = (n.talk || []).filter(function(t){ return t.a != null; });
  var k = JSON.stringify(done.map(function(t){ return t.a; }));
  if (box.getAttribute('data-k') === k) return; box.setAttribute('data-k', k);
  box.hidden = !done.length;
  box.innerHTML = done.map(function(t, i){
    return '<div class="sub" role="button" tabindex="0" aria-pressed="false" aria-label="' + esc('Answer ' + (i + 1) + '. Show the question Thinky asked') + '"><p>' + esc(t.a) + '</p></div>';
  }).join('');
  box.querySelectorAll('.sub').forEach(function(s, i){
    s.addEventListener('click', function(){ showSubQ(s, done[i].q); });
    s.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSubQ(s, done[i].q); } });
  });
}
/* Thinky flies to the clicked answer card and shows the question it asked for it (click it again to put Thinky back) */
var subPrev = null; /* what Thinky was saying before, so it can go back to it */
function showSubQ(s, q){
  if (S.subEl === s) { closeSubQs(); return; }
  if (!S.subEl) subPrev = { say: S.say, sayList: S.sayList, sayListFor: S.sayListFor, askNode: S.askNode, mood: S.mood };
  closeSubQs(true);
  S.subEl = s; s.classList.add('open'); s.setAttribute('aria-pressed', 'true');
  S.pin = null; S.mullAt = null; S.askNode = null; /* no "Ask Thinky" box here: it's just a reminder of the question */
  S.say = SAYS.youWereAsked; S.sayList = [q]; S.sayListFor = S.say; S.mood = 'curious';
  renderMull();
}
function closeSubQs(keep){
  if (!S.subEl) return;
  document.querySelectorAll('.subs .sub.open').forEach(function(x){ x.classList.remove('open'); x.setAttribute('aria-pressed', 'false'); });
  S.subEl = null;
  if (keep) return;
  /* Thinky goes back to what it was saying, unless something new has happened since */
  if (subPrev && S.say === SAYS.youWereAsked) { S.say = subPrev.say; S.sayList = subPrev.sayList; S.sayListFor = subPrev.sayListFor; S.askNode = subPrev.askNode; S.mood = subPrev.mood; }
  subPrev = null; renderMull();
}
/* clicking anywhere else, or pressing Escape, puts Thinky back */
document.addEventListener('pointerdown', function(e){ if (!e.target.closest('.subs .sub, #mull')) closeSubQs(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSubQs(); });
function qById(n, id){ return n.ai && Array.isArray(n.ai.questions) ? n.ai.questions.filter(function(q){ return q.id === id; })[0] : null; }

function renderMeta(n){
  var w = els.get(n.id); if (!w) return;
  var card = w.querySelector('.card');
  var cls = 'card k-' + n.kind;
  if (n.kind === 'branch') cls += ' b-' + n.btype;
  if (n.status === 'reading') cls += ' busy';
  card.className = cls;
  w.querySelector('.nm').textContent = n.cmdLabel || labelFor(n); /* command words show the whole phrase, e.g. "To what extent" */
  w.querySelector('.bslot').innerHTML = n.kind === 'term' && n.fromMull && !n.own ? '<span class="badge idea">Thinky’s idea</span>' : '';
  w.querySelector('.xs').innerHTML = n.kind === 'evidence' || n.kind === 'branch' ? '<button type="button" class="x" data-del aria-label="Remove this ' + esc(labelFor(n).toLowerCase()) + '">✕</button>' : '';
  var cn = w.querySelector('.cnote');
  if (n.note) { cn.hidden = false; if (cn.getAttribute('data-t') !== n.note) { cn.setAttribute('data-t', n.note); cn.innerHTML = MINI_MULL + '<span>' + esc(n.note) + '</span>'; } } else cn.hidden = true;
  if (n.kind === 'term') { for (var c = 0; c < 3; c++) card.classList.toggle('tc' + c, termColour(n) === c); w.querySelector('.xs').innerHTML = ''; } /* no 01, 02… number on Unpack cards */
  var ta = w.querySelector('textarea.main');
  ta.placeholder = placeholder(n);
  ta.setAttribute('aria-label', labelFor(n));
  var extra = w.querySelector('.extra');
  if (false) {
    extra.hidden = false;
    extra.innerHTML = '<span>links to</span>' + of('term').map(function(t){ return '<button type="button" class="chip' + (n.link === t.id ? ' on' : '') + '" data-link="' + t.id + '" aria-pressed="' + (n.link === t.id) + '">' + esc(t.phrase) + '</button>'; }).join('');
  } else if (n.kind === 'claim') {
    extra.hidden = false;
    extra.innerHTML = '<span>I</span>' + ['agree','disagree','say it depends'].map(function(l, k){ return '<button type="button" class="chip' + (n.side === k ? ' on' : '') + '" data-side="' + k + '" aria-pressed="' + (n.side === k) + '">' + l + '</button>'; }).join('');
  } else extra.hidden = true;
  var st = w.querySelector('.status');
  var txt = n.status === 'reading' ? '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Thinky is reading…'
    : n.status === 'stale' ? 'Edited. Click away for a fresh read.'
    : n.status === 'done' ? 'Read by Thinky ↓'
    : wc(n.text) >= minWords(n) ? 'Click anywhere outside to send to Thinky' : 'Your words first';
  if (n.kind === 'evidence') txt = '';
  if (n.kind === 'term') {
    var typeHelp = TERM_TYPE_HELP[n.wtype], typeSlot = w.querySelector('.termtype-slot');
    typeSlot.hidden = !typeHelp;
    if (typeHelp) {
      typeSlot.querySelector('.termtype-label').textContent = typeHelp.label;
      typeSlot.querySelector('.termtype-tip').textContent = typeHelp.description;
    }
    w.querySelector('.tab').hidden = true;
    renderGuide(n, w);
    renderSubs(n, w);
    card.classList.toggle('took', !!n.unpacked); /* unpacked: "My unpacking" takes the place of the Extent of Scope box */
    /* command words: "How to approach it" replaces Extent of Scope and "My unpacking" (css/map.css .card.cmd) */
    card.classList.toggle('cmd', !!n.cmdGuide);
    card.classList.toggle('nosum', !n.summary && !n.cmdGuide); /* condensed Unpack still shows the Definition if there's no final unpacking yet */
    var cgb = w.querySelector('.cmdguide'); cgb.hidden = !n.cmdGuide;
    if (n.cmdGuide) { w.querySelector('.cg').textContent = n.cmdGuide; st.innerHTML = ''; return; }
    if (n.status === 'reading') { st.innerHTML = '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Thinky is putting your unpacking together…'; return; }
    if (n.summary && (n.status === 'done' || n.status === 'stale')) {
      var cur = st.querySelector('.mysum p'); if (cur && document.activeElement === cur) return; /* don't redraw while they're editing it */
      var fresh = st.getAttribute('data-v') !== String(n.summaryV);
      st.setAttribute('data-v', n.summaryV);
      st.innerHTML = '<div class="sample mysum' + (fresh ? ' pop' : '') + (n.status === 'stale' ? ' old' : '') + '"><b class="plab">' + (n.unpacked ? '<span class="edhint">Click to edit</span>' : 'My unpacking <span class="edhint">· click to edit</span>') + '</b><p contenteditable="true" spellcheck="true" role="textbox" aria-label="My unpacking, editable" title="Click to edit">' + esc(n.summary) + '</p>' + (n.status === 'stale' ? '<div class="stip">Edited. Press Enter to update.</div>' : '') + '</div>';
      return;
    }
    st.removeAttribute('data-v');
    if (n.status === 'offline') txt = 'Add your OpenAI key in Settings (top right) to let Thinky help.';
    else if (n.status === 'error') txt = 'That didn’t come through. <button type="button" class="retry" data-retry>Try again</button>';
    else txt = '';
    st.innerHTML = txt;
    return;
  }
  st.innerHTML = txt;
  renderTab(n, w.querySelector('.tab'));
}
function renderTab(n, tab){
  var key = n.status + '|' + (n.ai ? n.ai.v : '') + '|' + (n.kind === 'evidence' ? n.text : n.ai && Array.isArray(n.ai.questions) ? n.ai.questions.map(function(q){ return (q.done ? 'd' : '') + (q.skipped ? 's' : '') + (q.grown ? 'g' : ''); }).join('') : '');
  if (n.status === 'draft' || (n.status === 'stale' && !n.ai)) { tab.hidden = true; tab.removeAttribute('data-k'); return; }
  if (tab.getAttribute('data-k') === key) return;
  var pop = !tab.getAttribute('data-k') || tab.getAttribute('data-k').split('|')[1] !== key.split('|')[1];
  tab.setAttribute('data-k', key); tab.hidden = false;
  var h = '';
  if (n.kind === 'evidence') {
    var searchUrl = n.ai && n.ai.searchUrl && n.status !== 'stale' ? n.ai.searchUrl : articleSearchUrl(n.text.trim().slice(0, 240), '');
    h = '<a class="go" href="' + esc(searchUrl) + '" target="_blank" rel="noopener noreferrer"><span>Search on Google</span><span aria-hidden="true">↗</span></a>';
    tab.innerHTML = h;
    if (pop) { tab.classList.remove('pop'); void tab.offsetWidth; tab.classList.add('pop'); }
    return;
  }
  if (n.status === 'reading') h = '<div class="think"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Reading this against the rest of your map…</div>';
  else if (n.status === 'offline') h = '<div class="think">Thinky can’t reach the AI. Add your OpenAI API key in Settings (the gear, top right).</div>';
  else if (n.status === 'error') h = '<div class="think">That read didn’t come through. <button type="button" class="ans" data-retry>Try again</button></div>';
  else if (n.ai && n.kind === 'term') {
    n.ai.questions.forEach(function(q){
      h += '<div class="q mini"><div class="qt">' + esc(q.q) + '</div></div>';
    });
  }
  else if (n.ai) {
    var a = n.ai, lvl = a.level;
    h += '<div class="meter" aria-label="Thinky’s read: ' + ['','developing','solid','sharp'][lvl] + '"><i class="f"></i><i class="' + (lvl >= 2 ? 'f' : '') + '"></i><i class="' + (lvl >= 3 ? 'f' : '') + '"></i><span>' + ['','Developing','Solid','Sharp'][lvl] + '</span>' + (n.status === 'stale' ? '<span style="color:var(--muted);font-weight:500">· from your last version</span>' : '') + '</div>';
    if (a.heard) h += '<div class="heard">“' + esc(a.heard) + '”</div>';
    if (a.strong) h += '<div class="ln ok"><b>Works</b><span>' + esc(a.strong) + '</span></div>';
    if (a.push) h += '<div class="ln push"><b>Push</b><span>' + esc(a.push) + '</span></div>';
    a.questions.forEach(function(q){
      h += '<div class="q"><span class="lens">' + esc(q.lens) + '</span>' + (q.quote ? '<span class="quote">“' + esc(q.quote) + '”</span>' : '') + '<div class="qt">' + esc(q.q) + '</div>';
      if (q.done || q.grown) h += '<span class="donechip">✓ ' + (q.grown ? 'you grew a branch for this' : 'you answered') + '</span>';
      else if (q.skipped) h += '<span class="tag">skipped</span>';
      else if (q.grow) h += '<div class="qa"><button type="button" class="ans" data-grow="' + esc(q.id) + '">+ Grow a ' + esc(BR[q.grow]) + ' branch</button><button type="button" class="skip" data-skip="' + esc(q.id) + '">Not now</button></div>';
      else h += '<textarea class="reply" data-q="' + esc(q.id) + '" placeholder="Your answer… click away and Thinky goes deeper" aria-label="Your answer to Thinky"></textarea><div class="qa"><button type="button" class="skip" data-skip="' + esc(q.id) + '">Not now</button></div>';
      h += '</div>';
    });
  }
  tab.innerHTML = h;
  tab.querySelectorAll('.reply').forEach(function(r){ r.value = n.replies[r.getAttribute('data-q')] || ''; });
  if (pop) { tab.classList.remove('pop'); void tab.offsetWidth; tab.classList.add('pop'); }
}

function place(n, row){
  var w = els.get(n.id);
  if (!w) { w = createEl(n); els.set(n.id, w); }
  if (w.parentNode !== row) row.appendChild(w);
  w.style.translate = (n.dx || n.dy) ? (n.dx || 0) + 'px ' + (n.dy || 0) + 'px' : '';
  renderMeta(n);
}
/* where a phrase sits in the question (token indexes) */
function phraseIdx(phrase){
  var ws = norm(phrase || '').split(' ').filter(Boolean), toks = S.toks.map(function(x){ return norm(x); });
  for (var i = 0; i + ws.length <= toks.length; i++) { var ok = true; for (var j = 0; j < ws.length; j++) { if (toks[i + j] !== ws[j]) { ok = false; break; } } if (ok && ws.length) return ws.map(function(_, j){ return i + j; }); }
  var hit = []; toks.forEach(function(x, i){ if (ws.indexOf(x) >= 0) hit.push(i); }); return hit;
}
/* Unpack row as a tidy tree: one row, cards in the same left-to-right order as their words,
   sized so they all fit. Same order + one row = no wire can cross another. */
function layoutTermRow(){ layoutTermRow0(); layoutArts(); }
/* place each word's article column right under that word's card (ignoring any drag offset); falls back to a wrapped row when columns would be too narrow */
function layoutArts(){
  var row = $('row-art'), cols = row.querySelectorAll('.artcol'); if (!cols.length) return;
  var mobile = window.matchMedia && matchMedia('(max-width:760px)').matches;
  var rr = row.getBoundingClientRect(), Z = zoomNow() || 1, spots = [];
  Array.prototype.forEach.call(cols, function(c){
    var n = node(+c.getAttribute('data-term')), w = n && els.get(n.id), cd = w && w.querySelector('.card'); if (!cd) return;
    var r = cd.getBoundingClientRect();
    spots.push({ c: c, mid: (r.left + r.width / 2 - rr.left) / Z - (n.dx || 0), w: cd.offsetWidth });
  });
  spots.sort(function(a, b){ return a.mid - b.mid; });
  var cw = Math.min.apply(null, spots.map(function(s){ return s.w; }).concat([270]));
  spots.forEach(function(s, i){ if (i) cw = Math.min(cw, spots[i].mid - spots[i - 1].mid - 16); });
  if (mobile || spots.length !== cols.length || cw < 170) {
    row.classList.remove('cols'); row.style.height = '';
    Array.prototype.forEach.call(cols, function(c){ c.style.left = ''; c.style.width = ''; });
    return;
  }
  row.classList.add('cols');
  var h = 0;
  spots.forEach(function(s){ s.c.style.width = cw + 'px'; s.c.style.left = Math.round(s.mid - cw / 2) + 'px'; h = Math.max(h, s.c.offsetHeight); });
  row.style.height = h + 'px';
}
function layoutTermRow0(){
  var row = $('row-term'); if (!row) return;
  var items = Array.prototype.filter.call(row.children, function(c){ return c.classList.contains('nw') || c.classList.contains('ghostcard'); });
  items.forEach(function(c){
    var pos = 999;
    if (c.classList.contains('nw')) { var n = node(+c.getAttribute('data-id')); var ix = n && (n.idx && n.idx.length ? n.idx : phraseIdx(n.phrase)); if (ix && ix.length) pos = ix[0]; }
    else { var gx = phraseIdx(c.getAttribute('data-phrase')); if (gx.length) pos = gx[0]; }
    c.style.order = pos;
  });
  var mobile = window.matchMedia && matchMedia('(max-width:760px)').matches;
  var n = items.length, W = row.clientWidth, gap = 14;
  if (mobile || !n) { items.forEach(function(c){ c.style.width = ''; }); row.classList.remove('wrap'); return; }
  items.sort(function(a, b){ return (+a.style.order) - (+b.style.order); });
  var cw = Math.floor((W - gap * (n - 1)) / n);
  function reset(c){ c.style.marginRight = ''; c.style.marginTop = ''; c.classList.remove('tier2'); }
  var maxW = document.body.classList.contains('unpack-mini') ? 220 : 270; /* condensed Unpack: slightly narrower cards */
  if (cw >= 190 || n < 3) {
    row.classList.remove('wrap', 'stagger');
    cw = clamp(cw, 150, maxW);
    items.forEach(function(c){ reset(c); c.style.width = cw + 'px'; });
    return;
  }
  /* many words: two staggered tiers. Every 2nd card drops down and sits in the gap
     between the cards above, so its wire runs straight down through that gap. */
  var P, cw2 = Math.floor(Math.min(maxW, (2 * W - 56 * (n - 1)) / (n + 1))); /* leaves a 56px lane between upper cards for each lower wire */
  if (cw2 < 150) { row.classList.add('wrap'); row.classList.remove('stagger'); items.forEach(function(c){ reset(c); c.style.width = '150px'; }); return; }
  row.classList.add('stagger'); row.classList.remove('wrap');
  P = (W - cw2) / (n - 1); /* spread so the outer cards line up with the row edges */
  var h1 = 0;
  items.forEach(function(c, i){ c.style.width = cw2 + 'px'; c.style.marginRight = i < n - 1 ? (P - cw2) + 'px' : '0px'; if (i % 2 === 0) { c.classList.remove('tier2'); c.style.marginTop = ''; h1 = Math.max(h1, c.offsetHeight); } });
  items.forEach(function(c, i){ if (i % 2 === 1) { c.classList.add('tier2'); c.style.marginTop = (h1 + 30) + 'px'; } });
}
function termPos(id){ var t = id && node(id); return t && t.idx ? t.idx[0] : 999; }
function orderRow(row, list){
  var cur = Array.prototype.filter.call(row.children, function(c){ return c.classList.contains('nw'); });
  var want = list.map(function(n){ return els.get(n.id); }).filter(Boolean);
  if (cur.length === want.length && cur.every(function(c, i){ return c === want[i]; })) return;
  var f = document.activeElement;
  want.forEach(function(x){ row.appendChild(x); });
  if (f && f !== document.activeElement && f.isConnected) { try { f.focus(); } catch(e){} }
}
function renderRows(){
  var st = stage();
  /* terms */
  var rt = $('row-term');
  rt.querySelectorAll('.lock,.ghostcard').forEach(function(x){ x.remove(); });
  var terms = of('term');
  if (!terms.length) rt.insertAdjacentHTML('afterbegin', '<div class="lock">Highlight the key words in the question to unpack them.</div>');
  terms.sort(function(a, b){ return (a.idx ? a.idx[0] : 999) - (b.idx ? b.idx[0] : 999); });
  terms.forEach(function(t){ place(t, rt); });
  var tt = $('termtools'); tt.innerHTML = '';
  var mineT = terms.filter(function(t){ return !t.fromMull; });
  if (!S.revealed && mineT.length >= 2) {
    var allRead = mineT.every(function(t){ return t.status === 'done' || t.status === 'stale' || t.status === 'error' || t.status === 'offline'; });
    var db = document.createElement('button'); db.type = 'button'; db.className = 'btn';
    db.textContent = S.wantReveal ? 'Thinky is having a think…' : 'I’m done unpacking';
    db.disabled = !allRead || !!S.wantReveal;
    db.title = allRead ? 'Move on to Evidence. Thinky may sketch a branch to explore.' : 'Finish your cards first';
    db.addEventListener('click', function(){ S.wantReveal = true; renderRows(); maybeReveal(); });
    tt.appendChild(db);
  }
  /* after "I'm done unpacking": Thinky's notes are showing. The student can unpack them, or press "I'm done" to move on to Evidence anyway */
  if (S.revealed && !S.evOpen) {
    var fin = document.createElement('button'); fin.type = 'button'; fin.className = 'btn'; fin.textContent = 'I’m done';
    fin.title = 'Move on to Evidence';
    fin.addEventListener('click', function(){ openEvidence(); });
    tt.appendChild(fin);
  }
  if (S.revealed) shownIdeas().forEach(function(m, gi){
    var g = document.createElement('article'); g.className = 'ghostcard'; g.setAttribute('data-phrase', m.phrase);
    sprout(g, 'g' + norm(m.phrase), gi * 260);
    g.classList.add('note');
    g.innerHTML = '<div class="notebody"><div class="nbody"><span class="why">' + esc(m.why) + '</span><button type="button" class="addbtn" data-go>+ Unpack it myself</button></div></div><button type="button" class="x nx" aria-label="Hide this note" title="Hide this note">✕</button>';
    g.querySelector('[data-go]').addEventListener('click', function(){
      /* becomes the student's own card, wired to its word like any other */
      /* exactly one card, for exactly the term in this note; other words in the question stay untouched */
      var ix = phraseIdx(m.phrase);
      var t = mk('term', { key:'m:' + norm(m.phrase), phrase:m.phrase, idx: ix.length ? ix : null, fromMull:true, own:true });
      S.nodes.push(t);
      S.focus = t.id; S.say = SAYS.yourTakeFirst; S.mood = 'listening';
      renderAll(); focusNode(t.id);
    });
    g.querySelector('.nx').addEventListener('click', function(){ S.dismissed = (S.dismissed || []).concat([norm(m.phrase)]); renderAll(); mapLater(nudgeEvidence, 900); });
    rt.appendChild(g);
  });
  layoutTermRow();
  /* evidence */
  var re = $('row-evidence');
  re.querySelectorAll('.lock,.addslot,.evidence-slot').forEach(function(x){ x.remove(); });
  renderArticles(st);
  if (st < 2) re.insertAdjacentHTML('afterbegin', '<div class="lock">Lets unpack some terms first!</div>');
  else {
    var evs = of('evidence').slice().sort(function(a, b){ return termPos((a.links || [])[0]) - termPos((b.links || [])[0]); });
    var nextSlot = Math.max(S.evidenceSlotCount || 0, evs.reduce(function(n, e){ return Number.isInteger(e.evSlot) ? Math.max(n, e.evSlot + 1) : n; }, 0));
    evs.forEach(function(e){ if (!Number.isInteger(e.evSlot) || e.evSlot < 0) e.evSlot = nextSlot++; });
    S.evidenceSlotCount = Math.max(nextSlot, evs.reduce(function(n, e){ return Math.max(n, e.evSlot + 1); }, 0));
    evs.sort(function(a, b){ return a.evSlot - b.evSlot; });
    evs.forEach(function(e){ place(e, re); });
    orderRow(re, evs);
    S.evidenceSlotHeights = S.evidenceSlotHeights || {};
    var present = new Set(evs.map(function(e){ return e.evSlot; }));
    for (var slot = 0; slot < S.evidenceSlotCount; slot++) {
      if (present.has(slot)) continue;
      var gap = document.createElement('div'); gap.className = 'evidence-slot';
      gap.style.height = (S.evidenceSlotHeights[slot] || 0) + 'px'; gap.setAttribute('aria-hidden', 'true');
      var next = evs.find(function(e){ return e.evSlot > slot; });
      re.insertBefore(gap, next ? els.get(next.id) : null);
    }
    /* "Add your own evidence" lives in the Evidence toolbar (#addev, js/tools.js). */
  }
  /* argue: the argument map (replaces the old claim + branches) */
  renderArgue(st);
  renderEvidenceFinish();
  refreshSelection();
}
function sprout(g, key, delay){
  var age = birth(key, delay);
  if (reduced || age > DRAW + POP) { g.classList.add('still'); return; }
  g.classList.add('sprout'); g.style.animationDelay = Math.max(0, DRAW - age) + 'ms';
}
function focusNode(id){ var w = els.get(id); if (w) { var ta = w.querySelector('textarea.main'); try { ta.focus(); } catch(e){} } }

function renderWires(){
  var map = $('map'), mr = map.getBoundingClientRect(), svg = $('wires'), Z = zoomNow();
  svg.setAttribute('width', mr.width / Z); svg.setAttribute('height', mr.height / Z);
  function box(el){ var r = el.getBoundingClientRect(); return {cx: (r.left + r.width / 2 - mr.left) / Z, top: (r.top - mr.top) / Z, bottom: (r.bottom - mr.top) / Z}; }
  function path(a, b, cls, key, tOver){
    if (b.via != null && b.via > a.bottom + 20 && b.via < b.top) {
      var tt = tOver != null ? tOver : drawProg(key), k = 0.72, bend = {cx: b.cx, top: b.via};
      if (tt >= 1) return '<path class="wire' + (cls ? ' ' + cls : '') + '" d="M' + a.cx + ' ' + a.bottom + ' C' + a.cx + ' ' + (a.bottom + b.via) / 2 + ' ' + b.cx + ' ' + (a.bottom + b.via) / 2 + ' ' + b.cx + ' ' + b.via + ' L' + b.cx + ' ' + b.top + '"/>';
      if (tt <= k) return path(a, bend, cls, null, tt / k);
      var yy = b.via + (b.top - b.via) * (tt - k) / (1 - k);
      return path(a, bend, '', null, 1).replace('class="wire"', 'class="wire drawing' + (cls ? ' ' + cls : '') + '"') + '<path class="wire drawing' + (cls ? ' ' + cls : '') + '" d="M' + b.cx + ' ' + b.via + ' L' + b.cx + ' ' + yy.toFixed(1) + '"/>'
        + '<circle class="pen halo" cx="' + b.cx + '" cy="' + yy.toFixed(1) + '" r="9"/><circle class="pen" cx="' + b.cx + '" cy="' + yy.toFixed(1) + '" r="4.5"/>';
    }
    var y1 = a.bottom, y2 = b.top, my = (y1 + y2) / 2, t = tOver != null ? tOver : drawProg(key);
    if (t >= 1) return '<path class="wire' + (cls ? ' ' + cls : '') + '" d="M' + a.cx + ' ' + y1 + ' C' + a.cx + ' ' + my + ' ' + b.cx + ' ' + my + ' ' + b.cx + ' ' + y2 + '"/>';
    if (t <= 0) return '';
    /* split the cubic at t (de Casteljau) so the line ends exactly where the pen is */
    function L(p, q){ return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; }
    var P0 = [a.cx, y1], P1 = [a.cx, my], P2 = [b.cx, my], P3 = [b.cx, y2];
    var A = L(P0, P1), B = L(P1, P2), C = L(P2, P3), D = L(A, B), E = L(B, C), F = L(D, E);
    function f(p){ return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
    return '<path class="wire drawing' + (cls ? ' ' + cls : '') + '" d="M' + f(P0) + ' C' + f(A) + ' ' + f(D) + ' ' + f(F) + '"/>'
      + '<circle class="pen halo" cx="' + F[0].toFixed(1) + '" cy="' + F[1].toFixed(1) + '" r="9"/><circle class="pen" cx="' + F[0].toFixed(1) + '" cy="' + F[1].toFixed(1) + '" r="4.5"/>';
  }
  var p = '', qp = '', q = box($('qcard')), rowTop = ($('row-term').getBoundingClientRect().top - mr.top) / Z - 14;
  function tokIdx(t){
    if (t.idx && t.idx.length) return t.idx;
    var ws = norm(t.phrase || '').split(' '), toks = S.toks.map(function(x){ return norm(x); });
    for (var i = 0; i < toks.length; i++) { var ok = true; for (var j = 0; j < ws.length; j++) { if (toks[i + j] !== ws[j]) { ok = false; break; } } if (ok) return ws.map(function(_, j){ return i + j; }); }
    var hit = []; toks.forEach(function(x, i){ if (ws.indexOf(x) >= 0) hit.push(i); }); return hit;
  }
  function tokAnchor(idx){
    var kids = $('toks').children, l = Infinity, r = -Infinity, b = -Infinity;
    idx.forEach(function(i){ var k = kids[i]; if (!k) return; var rr = k.getBoundingClientRect(); l = Math.min(l, rr.left); r = Math.max(r, rr.right); b = Math.max(b, rr.bottom); });
    return l === Infinity ? null : {cx: ((l + r) / 2 - mr.left) / Z, bottom: (b - mr.top) / Z};
  }
  function dot(a, cls){ return '<circle class="tipdot' + (cls ? ' ' + cls : '') + '" cx="' + a.cx + '" cy="' + a.bottom + '" r="3.5"/>'; }
  of('term').forEach(function(t){ var w = els.get(t.id); if (!w || !w.isConnected) return; var a = tokAnchor(tokIdx(t)) || q, bb = box(w.querySelector('.card')); if (w.classList.contains('tier2')) bb.via = rowTop; qp += path(a, bb, '', 'n' + t.id) + dot(a); });
  $('row-term').querySelectorAll('.ghostcard').forEach(function(g){ if (!g.offsetParent) return; /* hidden while Unpack is condensed */ var a = tokAnchor(tokIdx({phrase: g.getAttribute('data-phrase')})) || q; var gk = 'g' + norm(g.getAttribute('data-phrase')); if (born[gk] != null && now() < born[gk]) return; var gb = box(g); if (g.classList.contains('tier2')) gb.via = rowTop; qp += path(a, gb, 'ghost', gk) + dot(a, 'ghost'); });
  var qs = $('qwires'); qs.setAttribute('width', mr.width / Z); qs.setAttribute('height', mr.height / Z); qs.innerHTML = qp;
  of('evidence').forEach(function(e){
    var w = els.get(e.id); if (!w || !w.isConnected) return;
    (e.links || []).forEach(function(tid){ var t = els.get(tid); if (t && t.isConnected) p += path(box(t.querySelector('.card')), box(w.querySelector('.card')), '', 'L' + tid + '-' + e.id); });
  });
  /* recommended articles are free cards for the whole question: no wire to any word */
  var c = of('claim')[0], cw = c && els.get(c.id);
  if (cw && cw.isConnected) {
    var cb = box(cw.querySelector('.card'));
    of('evidence').filter(read_).forEach(function(e){ var w = els.get(e.id); if (w) p += path(box(w), cb, 'soft'); });
    of('branch').forEach(function(b){ var w = els.get(b.id); if (w && w.isConnected) p += path(box(cw), box(w.querySelector('.card')), '', 'n' + b.id); });
  }
  p += noteWires(box, path); /* Evidence notes → notes and cards (js/tools.js) */
  svg.innerHTML = p;
  if (animating()) follow();
}
function renderWords(){
  var n = 0; S.nodes.forEach(function(x){ n += wc(x.text); x.thread.forEach(function(t){ n += wc(t.a); }); Object.keys(x.replies).forEach(function(k){ var q = qById(x, k); if (!q || !q.done) n += wc(x.replies[k]); }); });
  $('wc').textContent = n + ' word' + (n === 1 ? '' : 's'); $('plant').innerHTML = plantSvg(n);
}
function renderLive(){
  /* Thinky only appears once the AI is connected; no Thinky = no AI */
  var m = $('mull'); if (m) m.hidden = !sample;
}
function renderMull(){
  var m = $('mull'); if (!m) return;
  var mf = $('mface');
  if (mf.getAttribute('data-mood') !== S.mood) { mf.setAttribute('data-mood', S.mood); mf.innerHTML = mullSvg(S.mood); mf.classList.remove('react'); void mf.offsetWidth; mf.classList.add('react'); }
  m.classList.toggle('thinking', S.thinking);
  var say = $('say');
  var list = (S.sayList && S.sayListFor === S.say) ? S.sayList : null;
  var topic = S.mullAt === 'topic-write' && Array.isArray(S.topicSentences) ? S.topicSentences[S.topicFocus] : null;
  var topicHint = !!(topic && topic.review && topic.review.status === 'question' && S.say === topic.review.question);
  var sk = S.say + '|' + (list ? list.join('|') : '') + (topicHint ? '|topic-hint' : '');
  /* Unpack questions get a small "Ask Thinky" chat under them (js/unpack.js clarify) */
  var an = list && S.askNode ? node(S.askNode) : null; if (an && an.kind !== 'term') an = null;
  var canFinish = canFinishTerm(an);
  var cl = an && an.clar && an.clar.q === list[0] ? an.clar.items : [];
  var ck = an ? an.id + '|' + canFinish + '|' + JSON.stringify(cl) : '';
  if (say.getAttribute('data-k') !== sk || say.getAttribute('data-c') !== ck) {
    var popIt = say.getAttribute('data-k') !== sk;
    var oldIn = say.querySelector('.clarin'), typed = oldIn ? oldIn.value : '', hadFocus = oldIn && document.activeElement === oldIn;
    say.setAttribute('data-k', sk); say.setAttribute('data-c', ck);
    say.innerHTML = esc(S.say) + (topicHint ? '<p class="topic-review-hint">Explain in the &quot;Deeper Explanation&quot; text below!</p>' : '')
      + (list ? '<ul>' + list.map(function(d){ return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '')
      + (canFinish ? '<div class="finish-term-choice"><p class="finish-term-prompt">' + esc(SAYS.finishTermPrompt) + '</p><button type="button" class="finish-term" data-finish-term="' + an.id + '">' + esc(SAYS.finishTerm) + '</button></div>' : '')
      + (an ? '<div class="clar">' + cl.map(function(i){ return '<p class="cask">' + esc(i.ask) + '</p><p class="crep">' + (i.reply == null ? '<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' : esc(i.reply)) + '</p>'; }).join('')
        + '<input class="clarin" type="text" placeholder="' + esc(SAYS.clarifyHint) + '" aria-label="Ask Thinky what this question means"></div>' : '');
    say.classList.toggle('has-list', !!list);
    var ni = say.querySelector('.clarin'); if (ni && !popIt) { ni.value = typed; if (hadFocus) ni.focus(); }
    if (popIt) { say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop'); }
  }
  say.hidden = !S.say;
  positionMull();
}
function positionMull(){
  var m = $('mull'), vw = innerWidth, vh = innerHeight; if (!m) return;
  if (S.pin) { var px = clamp(S.pin.x, 8, vw - 72), py = clamp(S.pin.y, 8, vh - 72); m.className = 'mull ' + (px > vw / 2 ? 'l' : 'r') + (S.thinking ? ' thinking' : '') + ' still'; m.style.left = (px / zoomNow()) + 'px'; m.style.top = (py / zoomNow()) + 'px'; return; }
  var w = S.focus && els.get(S.focus), slot = S.mullAt === 'evidence' && !of('evidence').length && $('addev').offsetParent && $('addev');
  var ae = S.mullAt === 'argue' ? $('l3') : null;
  if (S.mullAt === 'topic' || S.mullAt === 'topic-write' || S.mullAt === 'topic-deeper') {
    var topicField = $('topic-text-' + (Number(S.topicFocus) + 1));
    var deeperField = S.mullAt === 'topic-deeper' && document.querySelector('.topic-deeper-text[data-topic="' + S.topicFocus + '"]');
    ae = S.argEl && S.argEl.isConnected ? S.argEl : deeperField ? deeperField.closest('.topic-deeper-card') : topicField && topicField.closest('.topic-card');
  }
  if (S.mullAt === 'final-stand') ae = S.argEl && S.argEl.isConnected ? S.argEl : document.querySelector('.final-stand-card');
  if (S.mullAt === 'note' && S.noteTarget && S.noteTarget.isConnected) ae = S.noteTarget; /* Thinky prompting beside a new note (js/tools.js) */
  if (S.mullAt === 'evtools') { var et = $('evidence-toolbar'); if (et && et.offsetParent) ae = et; } /* Thinky explaining the Evidence tools (js/evidence.js evToolsTour) */
  if (S.mullAt === 'search' && $('esearch').offsetParent) ae = $('esearch');
  var se = S.subEl && S.subEl.isConnected ? S.subEl : null; /* an answer card the student clicked to see Thinky's question */
  var target = document.body.classList.contains('onb') ? $('obcard') : (se || (w && w.isConnected ? w : ae || slot || $('qcard')));
  var r = target.getBoundingClientRect(), x, y, side = 'r', sw = Math.min(240, vw - 110), Zm = zoomNow();
  var focusedTerm = w && node(S.focus), scopeBox = focusedTerm && focusedTerm.kind === 'term' && target === w ? w.querySelector('textarea.main') : null;
  var scopeRect = scopeBox && scopeBox.offsetParent ? scopeBox.getBoundingClientRect() : null;
  var preferredY = scopeRect ? scopeRect.top + 12 : r.top - 4;
  if (S.mullAt === 'argue' && target === ae) {
    x = clamp(r.right + 8, 8, vw - 72); y = clamp(r.top - 4, 70, vh - 190);
    m.className = 'mull r argue' + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
    m.style.setProperty('--argue-speech-left', Math.round((r.left - x) / Zm) + 'px');
    m.style.left = Math.round(x / Zm) + 'px'; m.style.top = Math.round(y / Zm) + 'px';
    return;
  }
  if (S.mullAt === 'topic' && target === ae) {
    x = clamp(r.left + 5, 8, vw - 285); y = clamp(r.bottom + 74, 70, vh - 180);
    m.className = 'mull r topic' + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
    m.style.left = Math.round(x / Zm) + 'px'; m.style.top = Math.round(y / Zm) + 'px';
    return;
  }
  if ((S.mullAt === 'topic-write' || S.mullAt === 'topic-deeper' || S.mullAt === 'final-stand') && target === ae) {
    if (r.right + (84 + 220) * Zm < vw) {
      x = r.right + 8; y = clamp(r.top + 20, 70, vh - 150);
      m.className = 'mull r topic-write' + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
    } else {
      x = clamp(r.left + 5, 8, Math.max(8, vw - 285)); y = clamp(r.bottom + 74, 70, vh - 180);
      m.className = 'mull r topic' + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
    }
    m.style.left = Math.round(x / Zm) + 'px'; m.style.top = Math.round(y / Zm) + 'px';
    return;
  }
  /* Keep Thinky's Evidence help beside the moved toolbar, below its controls. */
  if ((S.mullAt === 'evtools' || S.mullAt === 'search') && target === ae) {
    var sb = $('esearch'), tr = (sb && sb.offsetParent ? sb : target).getBoundingClientRect();
    x = clamp(S.mullAt === 'evtools' ? r.left + r.width / 2 - 150 : tr.left, 8, vw - 300);
    y = clamp(tr.bottom + 12, 70, vh - 220);
    m.className = 'mull r narrow' + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
    m.style.left = Math.round(x / Zm) + 'px'; m.style.top = Math.round(y / Zm) + 'px';
    return;
  }
  /* a spot is free only if Thinky + bubble would not cover another card */
  var others = Array.prototype.filter.call(document.querySelectorAll('#map .nw, #map .ghostcard, #map .abox, #map .apt, #map .artcard, #map .evnote'), function(c){ return c !== target && !c.contains(target) && c.offsetParent; }).map(function(c){ return c.getBoundingClientRect(); });
  function free(L, T, W, H){ return !others.some(function(o){ return L < o.right && L + W > o.left && T < o.bottom && T + H > o.top; }); }
  var boxW = (74 + sw) * Zm, boxH = 90 * Zm;
  if (r.right + 84 * Zm + sw * Zm < vw && free(r.right + 10, preferredY, boxW, boxH)) { x = r.right + 10; side = 'r'; }
  else if (r.left - (84 + sw) * Zm > 0 && free(r.left - boxW, preferredY, boxW, boxH)) { x = r.left - 74 * Zm; side = 'l'; }
  else x = undefined;
  var below = false;
  if (side === 'r' && x === undefined) {}
  if (x === undefined) { x = clamp(r.right - 64 * Zm, 8, vw - 72 * Zm); side = x > vw / 2 ? 'l' : 'r'; below = true; }
  y = below ? clamp(r.bottom + 6, 70, vh - 90) : clamp(preferredY, 70, vh - 90);
  if (r.bottom < 60 || r.top > vh) { side = 'l'; x = vw - 84; y = vh - 90; }
  m.className = 'mull ' + side + (S.thinking ? ' thinking' : '') + (S.still ? ' still' : '');
  m.style.left = Math.round(x / zoomNow()) + 'px'; m.style.top = Math.round(y / zoomNow()) + 'px'; /* .mull is zoomed with the map, so its own px are scaled */
  if (S.still) { void m.offsetWidth; S.still = false; m.classList.remove('still'); }
}
/* which section is in focus (light teal background, css/map.css .layer.focus):
   Unpack until Evidence opens, then Evidence. After that, the TITLE of the other section ("Unpack" / "Evidence")
   becomes clickable: hovering it shows it can be opened, clicking it moves the focus there.
   When Evidence is in focus, Unpack condenses to each word + its final unpacking, a little smaller. */
function focusSec(){ return !S.evOpen ? 'unpack' : (S.sec || 'evidence'); }
function hasEvidenceNotes(){
  if (!S || !S.evOpen) return false;
  var articles = (S.arts || []).concat(searchArticlesOf(S));
  return (S.notes || []).some(function(n){
    return String(n.text || '').trim() && (n.links || []).some(function(key){
      if (typeof key !== 'string') return false;
      if (key.slice(0, 2) === 'A:') return articles.some(function(a){ return String(a.id) === key.slice(2); });
      if (key.slice(0, 2) === 'E:') { var evidence = node(+key.slice(2)); return evidence && evidence.kind === 'evidence'; }
      return false;
    });
  });
}
function renderEvidenceFinish(){
  var finish = $('evidence-finish');
  finish.hidden = !hasEvidenceNotes() || !!S.argueStarted || S.sec === 'argue';
  if (finish.hidden) finish.style.marginTop = '';
  follow();
}
function renderFocus(){
  var sec = focusSec();
  document.querySelector('[aria-labelledby="l1"]').classList.toggle('focus', sec === 'unpack');
  document.querySelector('[aria-labelledby="l2"]').classList.toggle('focus', sec === 'evidence');
  document.querySelector('[aria-labelledby="l3"]').classList.toggle('focus', sec === 'argue');
  document.body.classList.toggle('unpack-mini', S.evOpen && sec !== 'unpack');
  document.body.classList.toggle('argue-focus', sec === 'argue');
  [['l1', 'unpack'], ['l2', 'evidence'], ['l3', 'argue']].forEach(function(p){
    var h = $(p[0]), can = !!S.evOpen && sec !== p[1] && (p[1] !== 'argue' || hasEvidenceNotes());
    h.classList.toggle('switchable', can);
    if (can) { h.setAttribute('role', 'button'); h.setAttribute('tabindex', '0'); h.title = 'Open ' + h.textContent; }
    else { h.removeAttribute('role'); h.removeAttribute('tabindex'); h.removeAttribute('title'); }
  });
}
function setSec(sec){ if (!S.evOpen || focusSec() === sec || (sec === 'argue' && !hasEvidenceNotes())) return; if (S.sec === 'argue' || sec === 'argue') S.argueStarted = true; S.sec = sec; renderAll(); follow(); }
[['l1', 'unpack'], ['l2', 'evidence'], ['l3', 'argue']].forEach(function(p){
  var h = $(p[0]);
  h.addEventListener('click', function(){ if (h.classList.contains('switchable')) setSec(p[1]); });
  h.addEventListener('keydown', function(e){ if ((e.key === 'Enter' || e.key === ' ') && h.classList.contains('switchable')) { e.preventDefault(); setSec(p[1]); } });
});
$('finish-evidence').addEventListener('click', function(){
  if (!hasEvidenceNotes()) return;
  S.sec = 'argue'; S.argueStarted = true; S.focus = null; S.pin = null; S.askNode = null; S.sayList = null;
  S.mullAt = 'argue'; S.argEl = $('l3'); S.say = 'Good job unpacking! Now we shall start crafting out topic sentences'; S.mood = 'cheer';
  renderAll();
  var section = document.querySelector('[aria-labelledby="l3"]');
  if (section) section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  setTimeout(follow, 450);
});
function renderAll(){ renderFocus(); renderNotes(); /* js/tools.js */ document.body.classList.toggle('ev-open', stage() >= 2); renderSteps(); renderQuestion(); renderRows(); renderWords(); renderLive(); requestAnimationFrame(function(){ renderWires(); renderMull(); updateQuestionReminder(); }); }

/* ---------- growing branches ---------- */
function grow(n, qid){
  var q = qById(n, qid); if (!q || !q.grow) return;
  var c = of('claim')[0]; if (!c) return;
  if (of('branch').length >= 6) { S.say = SAYS.tooManyBranches; renderMull(); return; }
  q.grown = true; n.thread.push({q:q.q, a:'(answered with a new branch)'});
  var b = mk('branch', { btype: q.grow, parent: c.id, asked: { from: n.id, q: q.q } });
  S.nodes.push(b); S.focus = b.id;
  S.say = SAYS.newBranch; S.mood = 'listening';
  renderAll(); focusNode(b.id);
}
