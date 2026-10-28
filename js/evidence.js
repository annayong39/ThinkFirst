/* =====================================================================
   ThinkFirst — EVIDENCE: articles and search
   ---------------------------------------------------------------------
   fetchArticles()  Evidence opens → 4–5 articles for the whole question, free (not wired to any word) (prompt #5)
   runSearch()      the search bar → 3–4 articles (prompt #6)
   Also the article boxes themselves: drag, remove, move to a folder.
   ===================================================================== */

/* ---------- Evidence: Thinky recommends 4–5 articles for the question as a whole, based on everything the student unpacked ---------- */
function catOf(id){ return OB_CATS.filter(function(c){ return c.id === id; })[0] || OB_CATS[0]; }
function catStyle(c){ return c.f ? ' style="--f:' + c.f + ';--b:' + c.b + '"' : ''; }
function articleSourceLink(a){
  var url = a.verified ? directArticleUrl(a.url) : '';
  return '<a class="go" href="' + esc(url || articleSearchUrl(a.title, a.source)) + '" target="_blank" rel="noopener noreferrer"><span>'
    + 'Read on ' + esc(a.source || 'article')
    + '</span><span aria-hidden="true">&#8599;</span></a>';
}
/* Keep empty card slots so removing one article never rearranges its neighbours. */
function articleSlots(items, owner, countKey){
  items.forEach(function(a, i){ if (!Number.isInteger(a.slot) || a.slot < 0) a.slot = i; });
  owner[countKey] = Math.max(owner[countKey] || 0, items.reduce(function(n, a){ return Math.max(n, a.slot + 1); }, 0));
  var slots = Array(owner[countKey]).fill(null);
  items.forEach(function(a){ slots[a.slot] = a; });
  return slots;
}
function emptyArticleSlot(height){
  var slot = document.createElement('div'); slot.className = 'artcard-slot';
  slot.style.height = (height || 0) + 'px'; slot.setAttribute('aria-hidden', 'true');
  return slot;
}
/* Keep the suggestions visible while a single extra web search checks any
   missing URLs. Never turn a guessed URL into a direct article link. */
function resolveArticleLinks(items, state, isCurrent, redraw){
  var missing = items.filter(function(a){ return !a.verified || !directArticleUrl(a.url); });
  if (!missing.length || !sample) return;
  return sample.webJSON(PROMPTS.resolveArticles({ question: state.q, articles: missing }), {}).then(function(res){
    if (S !== state || !isCurrent()) return;
    var found = res && Array.isArray(res.articles) ? res.articles : [], changed = false;
    missing.forEach(function(a){
      if (items.indexOf(a) < 0) return;
      var match = found.filter(function(item){ return item && item.id === a.id; })[0];
      var url = match && sourcedArticleUrl(match.url, res._sources);
      if (!url) return;
      a.url = url; a.verified = true;
      a.title = String(match.title || a.title).slice(0, 120);
      a.source = String(match.source || a.source).slice(0, 60);
      a.summary = String(match.summary || a.summary).slice(0, 260);
      OB_SAVED.filter(function(item){ return item.artId === a.id; }).forEach(function(saved){
        saved.t = a.title; saved.source = a.source; saved.note = a.summary; saved.url = url; saved.verified = true;
      });
      changed = true;
    });
    if (changed) redraw();
  }, function(){ /* The cards keep their publication-specific search links. */ });
}
/* If live web search fails, still suggest articles for the student to explore. */
function articleJSON(prompt){
  var fallback = prompt + '\nIf live web search is unavailable, still suggest relevant published articles you know. Leave URL empty when uncertain.';
  return { then: function(ok, fail){
    var state = S, webCtl = new AbortController(), webTimedOut = false;
    var webTimer = setTimeout(function(){ webTimedOut = true; webCtl.abort(); }, 22000);
    function tryFallback(){
      if (S !== state) return;
      var plainCtl = new AbortController(), plainTimedOut = false;
      var plainTimer = setTimeout(function(){ plainTimedOut = true; plainCtl.abort(); }, 18000);
      return mapJSON(fallback, { signal: plainCtl.signal }).then(function(res){
        clearTimeout(plainTimer); return ok(res);
      }, function(err){
        clearTimeout(plainTimer);
        return fail(plainTimedOut ? { code: 'timeout', message: 'The article search took too long.' } : err);
      });
    }
    return mapJSON(prompt, { web: true, signal: webCtl.signal }).then(function(res){
      clearTimeout(webTimer);
      if (S !== state) return;
      if (res && Array.isArray(res.articles) && res.articles.length) return ok(res);
      return tryFallback();
    }, function(err){
      clearTimeout(webTimer);
      if (S !== state) return;
      if (!webTimedOut && err && (err.code === 'cancelled' || err.code === 'no_key' || err.code === 'not_granted')) return fail(err);
      return tryFallback();
    });
  } };
}
function artTerms(){ return of('term').filter(function(t){ return (t.summary || scopeText(t) || t.text || '').trim(); }).slice(0, 6); }
function fetchArticles(){
  if (!sample || S.artStatus === 'loading' || S.artStatus === 'ready') return;
  var terms = artTerms(); if (!terms.length) return;
  S.artStatus = 'loading'; renderRows();
  var cats = OB_CATS.map(function(c){ return c.id + ' (' + c.label + ')'; }).join(', ');
  /* prompt text: js/prompts.js #5 (articles) */
  var prompt = PROMPTS.articles({
    question: S.q, folders: cats,
    terms: terms.map(function(t){
      var g = t.guide && t.guide.status === 'ready' ? t.guide : null;
      return { term: labelFor(t), type: t.wtype || '', meaning: g && g.meaning ? String(g.meaning).slice(0, 240) : '',
        boundaries: String(scopeText(t) || t.text || '').trim().slice(0, 400), unpacking: t.summary ? String(t.summary).slice(0, 400) : '' };
    })
  });
  articleJSON(prompt).then(function(res){
    var list = (res && Array.isArray(res.articles) ? res.articles : []), ids = OB_CATS.map(function(c){ return c.id; }), out = [];
    list.forEach(function(a){
      if (!a || !a.title || out.length >= 5) return; /* 4–5 articles for the whole question. */
      var cat = ids.indexOf(a.cat) >= 0 ? a.cat : 'society', title = String(a.title).slice(0, 120), src = String(a.source || '').slice(0, 60);
      var url = sourcedArticleUrl(a.url, res._sources);
      out.push({ id: 'a' + out.length + Date.now().toString(36), title: title, source: src, year: a.year ? String(a.year).slice(0, 4) : '', summary: String(a.summary || '').slice(0, 260), aspect: String(a.aspect || '').slice(0, 40), angle: String(a.angle || '').slice(0, 40), cat: cat,
        url: url, verified: !!url });
    });
    S.arts = out; S.artStatus = out.length ? 'ready' : 'error';
    /* nothing is saved into a folder until the student chooses one ("Save to folder" on each card) */
    if (out.length) { S.focus = null; S.mullAt = 'evidence'; S.mood = 'cheer'; S.say = SAYS.articlesFound; mapLater(evToolsTour, 5000); }
    renderAll(); renderMull();
    resolveArticleLinks(out, S, function(){ return S.arts === out; }, function(){ renderRows(); renderWires(); });
  }, function(err){ if (err && err.code === 'cancelled') return; S.artStatus = 'error'; handleAccess(err); renderRows(); });
}
/* ---------- Evidence search: the student types an idea or claim, Thinky suggests related articles (not linked to any card) ---------- */
function revealSearchBoard(search){
  var state = S;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    if (S !== state || searchesOf(S).indexOf(search) < 0 || searchesOf(S).slice(-1)[0] !== search) return;
    var board = $('row-search').querySelector('[data-search-id="' + search.id + '"]');
    if (board) board.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }); });
}
function runSearch(qry){
  qry = String(qry || '').replace(/\s+/g, ' ').trim(); if (!qry) return;
  var pending = searchesOf(S).find(function(sr){ return sr.status === 'loading' && sr.q.toLowerCase() === qry.toLowerCase(); });
  if (pending) { revealSearchBoard(pending); return; }
  S.searches = searchesOf(S); delete S.search;
  var my = { id: 'q' + crypto.randomUUID(), q: qry, status: sample ? 'loading' : 'offline', items: [] };
  S.searches.push(my); renderSearch(); revealSearchBoard(my);
  if (!sample) return;
  closeSubQs();
  var cats = OB_CATS.map(function(c){ return c.id + ' (' + c.label + ')'; }).join(', ');
  /* prompt text: js/prompts.js #6 (search) */
  var prompt = PROMPTS.search({
    question: S.q, query: qry.slice(0, 200), folders: cats,
    terms: artTerms().map(function(t){ return { term: labelFor(t), context: String(t.summary || scopeText(t) || t.text || '').slice(0, 200) }; })
  });
  S.focus = null; S.pin = null; S.mullAt = 'search'; S.thinking = true; S.mood = 'thinking'; S.say = SAYS.searching({ query: qry.slice(0, 60) }); renderMull();
  articleJSON(prompt).then(function(res){
    if (searchesOf(S).indexOf(my) < 0) return;
    var ids = OB_CATS.map(function(c){ return c.id; });
    my.items = (res && Array.isArray(res.articles) ? res.articles : []).filter(function(a){ return a && a.title; }).map(function(a, i){
      var title = String(a.title).slice(0, 120), src = String(a.source || '').slice(0, 60);
      var url = sourcedArticleUrl(a.url, res._sources);
      return { id: 's' + crypto.randomUUID(), title: title, source: src, year: a.year ? String(a.year).slice(0, 4) : '', summary: String(a.summary || '').slice(0, 260), angle: String(a.angle || '').slice(0, 40),
        cat: ids.indexOf(a.cat) >= 0 ? a.cat : 'society', url: url, verified: !!url, saved: null };
    }).slice(0, 4);
    my.status = my.items.length ? 'ready' : 'empty';
    S.thinking = false; S.mood = my.items.length ? 'pleased' : 'oops';
    S.focus = null; S.pin = null; S.mullAt = 'search';
    S.say = my.items.length ? SAYS.searchFound : SAYS.searchNone;
    renderSearch(my); renderMull();
    if (my.items.length) revealSearchBoard(my);
    resolveArticleLinks(my.items, S, function(){ return searchesOf(S).indexOf(my) >= 0; }, function(){ renderSearch(); renderWires(); });
  }, function(err){ if (searchesOf(S).indexOf(my) < 0 || (err && err.code === 'cancelled')) return; my.status = 'error'; S.thinking = false; S.mood = 'oops'; S.focus = null; S.pin = null; S.mullAt = 'search'; S.say = SAYS.searchFailed; handleAccess(err); renderSearch(); renderMull(); });
}
function renderSearch(animate){
  follow();
  var box = $('row-search'); box.replaceChildren();
  var searches = searchesOf(S);
  box.classList.toggle('all-bare', searches.length > 0 && searches.every(function(sr){ return sr.bare && sr.status === 'ready' && sr.items.length; }));
  searches.slice().reverse().forEach(function(sr){
    var board = document.createElement('div'); board.className = 'search-board';
    if (sr.id) board.setAttribute('data-search-id', sr.id);
    if (sr.bare && sr.status === 'ready' && sr.items.length) board.classList.add('bare');
    else {
      var head = document.createElement('div'); head.className = 'srhead';
      head.innerHTML = '<b>Results for “' + esc(sr.q) + '”</b><button type="button" class="x" aria-label="Close results">✕</button>';
      /* ✕ hides this board's frame but leaves its article cards on the map. */
      head.querySelector('button').addEventListener('click', function(){
        if (sr.status === 'ready' && sr.items.length) sr.bare = true;
        else S.searches = searchesOf(S).filter(function(x){ return x !== sr; });
        renderSearch();
      });
      board.appendChild(head);
    }
    if (sr.status === 'loading') board.insertAdjacentHTML('beforeend', '<div class="artnote"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Thinky is searching…</div>');
    else if (sr.status !== 'ready') {
      var msg = sr.status === 'offline' ? 'Thinky can’t reach the AI here, so search isn’t available.' : sr.status === 'empty' ? 'No good matches. Try different words.' : 'That search didn’t come through.';
      var notice = document.createElement('div'); notice.className = 'artnote'; notice.innerHTML = esc(msg) + (sr.status === 'offline' ? '' : ' <button type="button" class="linkbtn">Try again</button>');
      var retry = notice.querySelector('button'); if (retry) retry.addEventListener('click', function(){ runSearch(sr.q); });
      board.appendChild(notice);
    } else {
      var row = document.createElement('div'); row.className = 'srrow';
      sr.slotHeights = sr.slotHeights || {};
      articleSlots(sr.items, sr, 'slotCount').forEach(function(a, i){
        if (!a) { row.appendChild(emptyArticleSlot(sr.slotHeights[i])); return; }
        var g = document.createElement('article'); artLook(g, a);
        if (animate === sr) { g.classList.add('entering'); g.style.animationDelay = (i * 80) + 'ms'; }
        g.setAttribute('data-k', 'A' + a.id);
        g.innerHTML = '<div class="ahead"><span class="fslot"></span><button type="button" class="x ax" aria-label="Remove this article" title="Remove">✕</button></div>'
          + '<h4>' + esc(a.title) + '</h4><p class="sum">' + esc(a.summary) + '</p>'
          + articleSourceLink(a);
        makeDraggable(g, a);
        g.querySelector('.ax').addEventListener('click', function(){
          var index = sr.items.indexOf(a), status = sr.status, bare = sr.bare, boardIndex = searchesOf(S).indexOf(sr);
          sr.slotHeights[a.slot] = g.offsetHeight;
          recordUndo(function(){
            S.searches = searchesOf(S);
            if (S.searches.indexOf(sr) < 0) S.searches.splice(Math.min(boardIndex, S.searches.length), 0, sr);
            sr.status = status; sr.bare = bare;
            if (sr.items.indexOf(a) < 0) sr.items.splice(Math.min(index, sr.items.length), 0, a);
            renderSearch(); renderWires();
          });
          sr.items = sr.items.filter(function(x){ return x !== a; });
          renderSearch();
        });
        g.querySelector('.fslot').replaceWith(folderMenu(g, a, function(){ renderSearch(); renderMull(); }));
        row.appendChild(g);
      });
      board.appendChild(row);
    }
    box.appendChild(board);
  });
  refreshSelection();
  renderEvidenceFinish();
}
$('esearch').addEventListener('submit', function(e){ e.preventDefault(); runSearch($('esq').value); });
/* Enter searches; Shift+Enter keeps a line break in the compact search box. */
$('esq').addEventListener('keydown', function(e){ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('esearch').requestSubmit ? $('esearch').requestSubmit() : runSearch($('esq').value); } });
/* ---------- saving an article card to an evidence folder (css/evidence.css .fmenu) ----------
   Top left of each card: a round "+ Save to folder" button. It opens a list of the evidence folders
   (the same folders as the start page), plus "Create a new folder". Once saved, the button shows that
   folder's name and colour, and the card's border takes the folder colour; clicking it moves the card. */
function artLook(g, a){
  var c = a.saved ? catOf(a.saved) : null;
  g.className = 'artcard' + (c ? ' saved sv-t-' + c.id : '');
  if (c && c.f) { g.style.setProperty('--f', c.f); g.style.setProperty('--b', c.b); }
}
function folderMenu(card, a, after){
  var m = document.createElement('div'); m.className = 'fmenu';
  var sc = a.saved ? catOf(a.saved) : null;
  m.innerHTML = (sc
      ? '<button type="button" class="fbtn saved sv-t-' + esc(sc.id) + '"' + catStyle(sc) + ' aria-haspopup="menu" aria-expanded="false" title="Saved here. Click to move it to another folder"><i aria-hidden="true"></i><span class="fname">' + esc(sc.label) + '</span><span class="fchev" aria-hidden="true"></span></button>'
      : '<button type="button" class="fbtn" aria-haspopup="menu" aria-expanded="false"><span class="fplus" aria-hidden="true">+</span>Save to folder</button>')
    + '<div class="fpop" role="menu" hidden><div class="fhead">Save to folder</div><div class="flist"></div>'
    + '<button type="button" class="fnew"><span class="fplus" aria-hidden="true">+</span>Create a new folder</button>'
    + '<form class="fform" hidden><input type="text" maxlength="40" autocomplete="off" placeholder="Folder name" aria-label="New folder name"><button type="submit" class="fmake">Create</button><div class="ferr" role="alert"></div></form>'
    + '</div>';
  var btn = m.querySelector('.fbtn'), pop = m.querySelector('.fpop'), list = m.querySelector('.flist'), nw = m.querySelector('.fnew'), form = m.querySelector('.fform'), inp = form.querySelector('input'), err = form.querySelector('.ferr');
  function fill(){
    list.innerHTML = OB_CATS.map(function(o){ var on = o.id === a.saved, hint = !a.saved && o.id === a.cat;
      return '<button type="button" role="menuitem" class="fopt sv-t-' + esc(o.id) + (on ? ' on' : '') + '" data-v="' + esc(o.id) + '"' + catStyle(o) + '>'
        + '<i aria-hidden="true"></i><span>' + esc(o.label) + '</span>' + (on ? '<b class="ftag">✓</b>' : hint ? '<b class="ftag">suggested</b>' : '') + '</button>'; }).join('');
  }
  function save(v){ closeFolderMenus(); saveArticle(a, v); after(); }
  btn.addEventListener('click', function(e){
    e.stopPropagation(); var open = pop.hidden; closeFolderMenus(); if (!open) return;
    fill(); form.hidden = true; nw.hidden = false; err.textContent = ''; inp.value = '';
    pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); card.classList.add('menuopen');
  });
  list.addEventListener('click', function(e){ var o = e.target.closest('.fopt'); if (o) save(o.getAttribute('data-v')); });
  nw.addEventListener('click', function(){ nw.hidden = true; form.hidden = false; inp.focus(); });
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var r = newFolder(inp.value); if (typeof r === 'string') { err.textContent = r; inp.focus(); return; }
    save(r.id);
  });
  return m;
}
/* put the article in a folder (or move it): it then shows up in that folder on the start page */
function saveArticle(a, v){
  var first = !a.saved; a.saved = v; a.cat = v;
  var ex = OB_SAVED.filter(function(x){ return x.artId === a.id; })[0];
  if (ex) { ex.cat = v; ex.source = a.source; ex.url = a.verified ? directArticleUrl(a.url) : ''; ex.verified = !!a.verified; }
  else OB_SAVED.unshift({ cat: v, t: a.title, source: a.source, key: a.aspect || '', note: a.summary, from: S.q, when: 'Just now', url: a.verified ? directArticleUrl(a.url) : '', verified: !!a.verified, artId: a.id });
  S.say = first ? SAYS.savedTo({ folder: catOf(v).label }) : SAYS.movedTo({ folder: catOf(v).label }); S.mood = 'pleased';
}
/* a new evidence folder, made the same way as "Add Topic" on the start page (same colours, same saved list) */
function newFolder(name){
  name = String(name || '').replace(/\s+/g, ' ').trim();
  if (!name) return 'Type a folder name first.';
  if (OB_CATS.some(function(c){ return c.label.toLowerCase() === name.toLowerCase(); })) return 'You already have a folder called that.';
  var added = OB_CATS.filter(function(c){ return c.user; }).length, col = OB_NEW_COLOURS[added % OB_NEW_COLOURS.length];
  var t = { id: 'u' + Date.now().toString(36), label: name, f: col[0], b: col[1], user: true };
  OB_CATS.push(t);
  try { localStorage.setItem('tf-topics2', JSON.stringify(OB_CATS.filter(function(c){ return c.user; }))); } catch(e){}
  return t;
}
function closeFolderMenus(){
  document.querySelectorAll('.fpop').forEach(function(p){ p.hidden = true; });
  document.querySelectorAll('.fbtn[aria-expanded="true"]').forEach(function(b){ b.setAttribute('aria-expanded', 'false'); });
  document.querySelectorAll('.artcard.menuopen').forEach(function(c){ c.classList.remove('menuopen'); });
}
document.addEventListener('pointerdown', function(e){ if (!e.target.closest('.fmenu')) closeFolderMenus(); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeFolderMenus(); });
/* article boxes drag freely, like the Unpack cards (mouse: anywhere on the box; touch: its top strip) */
function makeDraggable(g, a){
  if (a.dx || a.dy) g.style.translate = (a.dx || 0) + 'px ' + (a.dy || 0) + 'px';
  g.addEventListener('pointerdown', function(e){
    if (e.button > 0 || e.target.closest('button,select,a,label,input,.fmenu')) return;
    if (e.pointerType === 'touch' && !e.target.closest('.ahead')) return;
    e.preventDefault();
    beginCardDrag(e, a, g);
  });
}
function renderArticles(st){
  var row = $('row-art'); row.innerHTML = ''; row.classList.remove('cols'); row.style.height = '';
  if (st < 2) return;
  if (S.artStatus === 'loading') { row.innerHTML = '<div class="artnote"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>Thinky is finding articles for your question…</div>'; return; }
  if (S.artStatus === 'error') { var b = document.createElement('div'); b.className = 'artnote'; b.innerHTML = 'Couldn’t find articles just now. <button type="button" class="linkbtn">Try again</button>'; b.querySelector('button').addEventListener('click', function(){ S.artStatus = 'idle'; fetchArticles(); }); row.appendChild(b); return; }
  /* free cards in one row: not tied to any word, no wire */
  S.artSlotHeights = S.artSlotHeights || {};
  articleSlots(S.arts, S, 'artSlotCount').forEach(function(a, i){
    if (!a) { row.appendChild(emptyArticleSlot(S.artSlotHeights[i])); return; }
    var title = esc(a.title);
    var g = document.createElement('article'); artLook(g, a);
    g.setAttribute('data-k', 'A' + a.id);
    sprout(g, 'A' + a.id, i * 160);
    g.innerHTML = '<div class="ahead"><span class="fslot"></span><button type="button" class="x ax" aria-label="Remove this article" title="Remove">✕</button></div>'
      + '<h4>' + title + '</h4><p class="sum">' + esc(a.summary) + '</p>'
      + articleSourceLink(a);
    makeDraggable(g, a);
    g.querySelector('.ax').addEventListener('click', function(){
      var index = S.arts.indexOf(a);
      S.artSlotHeights[a.slot] = g.offsetHeight;
      var saved = OB_SAVED.map(function(item, i){ return { item: item, index: i }; }).filter(function(entry){ return entry.item.artId === a.id; });
      recordUndo(function(){
        if (S.arts.indexOf(a) < 0) S.arts.splice(Math.min(index, S.arts.length), 0, a);
        saved.forEach(function(entry){ if (OB_SAVED.indexOf(entry.item) < 0) OB_SAVED.splice(Math.min(entry.index, OB_SAVED.length), 0, entry.item); });
        renderRows(); renderWires();
      });
      S.arts = S.arts.filter(function(x){ return x !== a; });
      for (var k = OB_SAVED.length - 1; k >= 0; k--) if (OB_SAVED[k].artId === a.id) OB_SAVED.splice(k, 1);
      S.say = SAYS.removed; S.mood = 'listening'; renderRows(); renderWires(); renderMull();
    });
    g.querySelector('.fslot').replaceWith(folderMenu(g, a, function(){ renderRows(); renderMull(); }));
    row.appendChild(g);
  });
  refreshSelection();
}
/* ~5s after the articles appear, Thinky moves to the left panel (search, add your own, Text tool) and explains them.
   Once per question, and only if Thinky is still on the "found articles" line (the student hasn't started something else). */
function evToolsTour(){
  if (!S.evOpen || S.evToured || S.say !== SAYS.articlesFound) return;
  S.evToured = true;
  S.focus = null; S.pin = null; S.askNode = null; S.mullAt = 'evtools'; S.mood = 'curious';
  S.say = SAYS.evToolsIntro; S.sayList = SAYS.evToolsTips.slice(); S.sayListFor = S.say;
  renderMull();
}
/* called after a word is unpacked or one of Thinky's notes is closed: once every word is dealt with, open Evidence */
function nudgeEvidence(){
  if (!unpackDone()) return;
  var a = document.activeElement; if (a && a.matches && a.matches('textarea')) { mapLater(nudgeEvidence, 2500); return; }
  openEvidence();
}
/* Evidence opens: Thinky says well done and moves down; the 4–5 articles are fetched a moment later, so they appear AFTER it has spoken */
function openEvidence(){
  if (S.evOpen) return;
  S.evOpen = true; S.sec = 'evidence'; S.focus = null; S.mullAt = 'evidence'; S.mood = 'cheer';
  S.say = SAYS.unpackFinished;
  renderAll();
  var ev = document.querySelector('[aria-labelledby="l2"]');
  if (ev) { try { ev.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); } catch(e) {} }
  setTimeout(follow, 450); setTimeout(follow, 900);
  mapLater(fetchArticles, 2200);
}
function handleAccess(err){
  var code = err && err.code;
  /* no key, or OpenAI rejected the key: Thinky goes quiet until a working key is saved in Settings */
  if (code === 'no_key' || code === 'not_granted') { sample = null; live = false; return true; }
  return false;
}
