/* =====================================================================
   ThinkFirst — DEV ONLY: "Skip to Evidence" button (for prototyping)
   ---------------------------------------------------------------------
   A small button at the bottom right of the mind map. Pressing it skips
   the whole Unpack phase and opens Evidence straight away, so the
   Evidence section can be worked on without unpacking every time.

   What it does:
     1. Asks the AI ONCE to unpack the question the way a reasonable JC
        student would: it keeps the words you highlighted (and adds key
        words until there are 3), and for each word writes a definition,
        a few short student-style answers to Thinky's questions, and a
        final "My unpacking". Command words get a "How to approach it".
     2. Fills the Unpack cards with that, finished, as if you'd done it.
     3. Skips Thinky's notes on missed words.
     4. Opens Evidence the normal way (Thinky's line, then the articles),
        using those unpackings as the context.
   No API key → it falls back to short placeholder unpackings.

   NOTE: unlike every other prompt, this one lives here, not in
   js/prompts.js, so that deleting this file removes ALL of it.

   TO REMOVE IT COMPLETELY: delete this file, and delete the one line
       <script src="js/devskip.js"></script>
   at the bottom of index.html. Nothing else uses it.
   ===================================================================== */
(function(){
  var b = document.createElement('button');
  b.type = 'button'; b.id = 'devskip'; b.textContent = 'Skip to Evidence ⏭';
  b.title = 'Prototyping only: auto-unpack and open Evidence';
  b.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:26;padding:8px 14px;border-radius:999px;'
    + 'border:1.5px dashed var(--accent);background:var(--paper);color:var(--accent);font:inherit;font-size:12.5px;font-weight:700;'
    + 'cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.12)';
  document.body.appendChild(b);

  var busy = false, busyState = null;
  /* only on the mind map page, not the start page, and only until Evidence is open */
  function sync(){ if (busyState !== S) busy = false; b.hidden = document.body.classList.contains('onb') || !!(window.S && S.evOpen); b.disabled = busy; b.textContent = busy ? 'Unpacking for you…' : 'Skip to Evidence ⏭'; }
  sync(); setInterval(sync, 500);

  /* the one AI prompt this button uses */
  function prompt(q, picked){
    return `You are helping test a General Paper essay planner. Unpack the key terms of this essay question the way a thoughtful Singapore JC student would, so the result can be used as context for finding evidence.

Essay question: "${q}"
${picked.length ? `Terms the student highlighted (keep ALL of these, copied exactly): ${picked.map(function(p){ return '"' + p + '"'; }).join(', ')}\n` : ''}${picked.length < 3 ? `Add the most important other key terms from the question so there are 3 terms in total. Copy each EXACTLY as it appears in the question, 1 to 3 words, no punctuation.\n` : ''}
For each term give:
- "phrase": the term exactly as in the question
- "type": "CONCEPT" (topic word), "QUALIFIER" (more, only, enough, always…) or "COMMAND" (Discuss, To what extent, How far…)
- "meaning": a clear one-sentence definition of the term in this question, 25 words or fewer
- "talk": for CONCEPT and QUALIFIER only, 2 to 3 items, each {"q": a short question Thinky might ask to unpack the term, "a": the student's short, casual typed answer, 6 to 20 words, with a real boundary or example (e.g. what they include or leave out, a Singapore example)}. For COMMAND, [].
- "summary": for CONCEPT and QUALIFIER, the student's final unpacking: 2 sentences, 50 words or fewer, first person, e.g. "In this question, 'X' refers to … I focus on … and leave out …", built only from their answers. For COMMAND, "".
- "guide": for COMMAND only, one sentence on how to approach the essay because of it. Otherwise "".
Reply with only JSON: {"terms": [{"phrase": string, "type": string, "meaning": string, "talk": [{"q": string, "a": string}], "summary": string, "guide": string}]}`;
  }

  /* find the question's word positions for a phrase, so it can be highlighted like a student would */
  function findIdx(phrase){
    var ws = norm(phrase).split(' ').filter(Boolean), toks = S.toks.map(function(t){ return norm(t); });
    for (var i = 0; i + ws.length <= toks.length; i++) {
      var ok = true; for (var j = 0; j < ws.length; j++) if (toks[i + j] !== ws[j]) { ok = false; break; }
      if (ok) return ws.map(function(_, j){ return i + j; });
    }
    return [];
  }
  function stopCalls(t){ if (ctl[t.id]) { try { ctl[t.id].abort(); } catch(e){} delete ctl[t.id]; } t.asking = false; }

  /* fill one card as if the student had unpacked it */
  function fill(t, r){
    stopCalls(t);
    var type = String(r.type || '').toUpperCase();
    if (type === 'COMMAND' && r.guide) {
      t.wtype = 'COMMAND'; t.cmdLabel = t.cmdLabel || t.phrase; t.cmdGuide = String(r.guide).slice(0, 260);
      t.guide = { status: 'ready', meaning: String(r.meaning || '').slice(0, 260), decisions: [] };
      t.summary = t.cmdGuide;
    } else {
      t.wtype = type === 'QUALIFIER' ? 'QUALIFIER' : 'CONCEPT';
      t.guide = { status: 'ready', meaning: String(r.meaning || '').slice(0, 260), decisions: [] };
      t.talk = (Array.isArray(r.talk) ? r.talk : []).filter(function(x){ return x && x.a; }).slice(0, 3)
        .map(function(x){ return { q: String(x.q || '').slice(0, 200), a: String(x.a).slice(0, 300), focus: '' }; });
      t.boundary = ''; t.text = '';
      t.summary = String(r.summary || '').slice(0, 500) || ('In this question, ‘' + t.phrase + '’ is used in its usual sense.');
    }
    t.unpacked = true; t.status = 'done'; t.summaryV = Date.now(); t.lastSent = scopeText(t);
  }
  /* no AI: finish the cards with short placeholders instead */
  function placeholders(){
    if (of('term').length < 2) {
      var free = S.toks.map(function(t, i){ return i; }).filter(function(i){ return S.sel.indexOf(i) < 0 && clean(S.toks[i]).length > 3; });
      free.sort(function(x, y){ return clean(S.toks[y]).length - clean(S.toks[x]).length; });
      S.sel = S.sel.concat(free.slice(0, 2 - of('term').length)); syncTerms();
    }
    of('term').forEach(function(t){
      stopCalls(t);
      if (!t.guide || t.guide.status !== 'ready') t.guide = { status: 'ready', meaning: '', decisions: [] };
      if (!t.summary) t.summary = scopeText(t) || ('In this question, ‘' + (t.cmdLabel || t.phrase) + '’ is used in its usual sense.');
      t.unpacked = true; t.status = 'done'; t.summaryV = Date.now();
    });
  }
  function finish(){
    S.wantReveal = true; S.revealed = true; S.thinking = false;
    S.dismissed = (S.dismissed || []).concat((S.mull.terms || []).map(function(m){ return norm(m.phrase); })); /* skip Thinky's notes */
    renderAll(); openEvidence();
    busy = false; sync();
  }

  b.addEventListener('click', function(){
    if (!window.S || S.evOpen || busy) return;
    if (!sample) { placeholders(); finish(); return; }
    busy = true; busyState = S; sync();
    S.focus = null; S.thinking = true; S.mood = 'thinking'; S.say = 'Unpacking the question for you (dev skip)…'; renderMull();
    var q = S.q, picked = of('term').filter(function(t){ return !t.fromMull; }).map(function(t){ return t.phrase; });
    mapJSON(prompt(q, picked), {}).then(function(res){
      if (q !== S.q) { busy = false; sync(); return; }
      var list = res && Array.isArray(res.terms) ? res.terms : [];
      /* highlight any new words the AI picked, then fill every card */
      list.forEach(function(r){
        if (!r || !r.phrase || of('term').some(function(t){ return norm(t.phrase) === norm(r.phrase); })) return;
        var ix = findIdx(r.phrase); if (!ix.length) return;
        S.sel = S.sel.concat(ix.filter(function(i){ return S.sel.indexOf(i) < 0; }));
      });
      syncTerms();
      of('term').forEach(function(t){
        var r = list.filter(function(x){ return x && norm(x.phrase) === norm(t.phrase); })[0];
        if (r) fill(t, r);
      });
      placeholders(); /* anything the AI missed still gets finished */
      finish();
    }, function(){ placeholders(); finish(); });
  });
})();
