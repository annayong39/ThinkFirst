/* =====================================================================
   ThinkFirst — INTERACTIONS: question, dragging, zoom
   ---------------------------------------------------------------------
   setQuestion()  start a new question
   Slide across words to join them, drag cards, drag a link from an
   Unpack card onto Evidence, zoom buttons and box selection.
   ===================================================================== */

/* ---------- wiring ---------- */
function setQuestion(q, saved){
  clearUndo();
  Object.keys(ctl).forEach(function(k){ try { ctl[k].abort(); } catch(e){} }); ctl = {};
  if (prefetchCtl) { try { prefetchCtl.abort(); } catch(e){} }
  els.forEach(function(el){ el.remove(); }); els.clear();
  ['row-term','termtools','row-search','row-art','row-evidence','row-claim','row-branch','argmap'].forEach(function(id){ $(id).innerHTML = ''; });
  noteEls.forEach(function(el){ el.remove(); }); noteEls.clear();
  if (sizeWatch) sizeWatch.disconnect();
  drag = null; mdrag = null; marquee = null; selectedModels.clear(); marqueeBox.hidden = true; slide = null; linkDrag = null; linkDrag2 = null; subPrev = null;
  tmpWire.innerHTML = ''; linkBox.innerHTML = ''; linkBox.removeAttribute('data-k');
  document.body.classList.remove('selecting', 'linking', 'notelinking');
  $('qin').hidden = true; $('esq').value = '';
  activeProjectId = null; clearTimeout(projectNoticeTimer);
  $('saveproject').textContent = 'Save this project'; $('projectstatus').textContent = '';
  S = saved || fresh(q); born = {}; computeChunks();
  renderAll(); if (!saved) fetchChunks();
}
$('qeditbtn').addEventListener('click', function(){ var b = $('qin'); b.hidden = !b.hidden; if (!b.hidden) { $('qinput').value = S.q; $('qinput').focus(); } });
function useQ(){ var v = $('qinput').value.trim(); if (v.length < 8) return; $('qin').hidden = true; setQuestion(v); }
$('quse').addEventListener('click', useQ);
$('qinput').addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); useQ(); } });
$('reset').addEventListener('click', function(){ setQuestion(S.q); });
$('tidy').addEventListener('click', function(){
  var items = S.nodes.concat(S.arts || [], searchArticlesOf(S));
  var before = items.map(function(n){ return { n: n, x: n.dx || 0, y: n.dy || 0 }; });
  var answers = S.nodes.reduce(function(all, n){ return all.concat(n.talk || []); }, []).map(function(t){ return { t: t, x: t.dx || 0, y: t.dy || 0 }; });
  var answerEls = Array.from(document.querySelectorAll('.subs .sub')).map(function(el){ return { el: el, translate: el.style.translate }; });
  if (before.some(function(item){ return item.x || item.y; }) || answers.some(function(item){ return item.x || item.y; }))
    recordUndo(function(){
      before.forEach(function(item){ item.n.dx = item.x; item.n.dy = item.y; });
      answers.forEach(function(item){ item.t.dx = item.x; item.t.dy = item.y; });
      answerEls.forEach(function(item){ if (item.el.isConnected) item.el.style.translate = item.translate; });
      selectionTargets().forEach(function(item){ item.el.style.translate = (item.model.dx || 0) + 'px ' + (item.model.dy || 0) + 'px'; });
      follow();
    });
  S.nodes.forEach(function(n){ n.dx = 0; n.dy = 0; (n.talk || []).forEach(function(t){ t.dx = 0; t.dy = 0; }); });
  document.querySelectorAll('.subs .sub').forEach(function(s){ s.style.translate = ''; });
  (S.arts || []).concat(searchArticlesOf(S)).forEach(function(a){ a.dx = 0; a.dy = 0; });
  document.querySelectorAll('.artcard').forEach(function(g){ g.style.translate = ''; });
  els.forEach(function(w){ w.style.translate = ''; }); follow();
});
/* Selection is kept in memory; each card's dx/dy is already part of the saved project. */
var selectedModels = new Set(), marquee = null;
var marqueeBox = document.createElement('div');
marqueeBox.className = 'map-marquee'; marqueeBox.hidden = true; marqueeBox.setAttribute('aria-hidden', 'true');
document.body.appendChild(marqueeBox);
function selectionTargets(){
  var targets = [];
  $('map').querySelectorAll('.nw[data-id]').forEach(function(el){
    var model = node(+el.getAttribute('data-id'));
    if (model && el.getClientRects().length) targets.push({ model: model, el: el });
  });
  $('map').querySelectorAll('.artcard[data-k]').forEach(function(el){
    var id = el.getAttribute('data-k').slice(1);
    var model = (S.arts || []).concat(searchArticlesOf(S)).find(function(a){ return a.id === id; });
    if (model && el.getClientRects().length) targets.push({ model: model, el: el });
  });
  $('map').querySelectorAll('.evnote[data-note-id]').forEach(function(el){
    var id = el.getAttribute('data-note-id');
    var model = (S.notes || []).find(function(n){ return n.id === id; });
    if (model && el.getClientRects().length) targets.push({ model: model, el: el });
  });
  return targets;
}
function refreshSelection(){
  selectionTargets().forEach(function(item){ item.el.classList.toggle('map-selected', selectedModels.has(item.model)); });
}
function clearSelection(){ selectedModels.clear(); refreshSelection(); }
function beginCardDrag(e, model, el, options){
  blurTextEditor();
  if (options && options.duplicateNote) {
    drag = { sx: e.clientX, sy: e.clientY, duplicateSource: model, items: [] };
    return;
  }
  var evidenceCard = el.classList.contains('artcard') || el.classList.contains('evnote') || model.kind === 'evidence';
  if (evidenceCard || !selectedModels.has(model)) { clearSelection(); selectedModels.add(model); refreshSelection(); }
  var items = selectionTargets().filter(function(item){ return selectedModels.has(item.model); });
  drag = { sx: e.clientX, sy: e.clientY, origin: el, items: items.map(function(item){
    item.el.classList.add('dragging');
    return { n: item.model, w: item.el, ox: item.model.dx || 0, oy: item.model.dy || 0 };
  }) };
}
addEventListener('pointermove', function(e){
  if (!drag) return;
  if (drag.duplicateSource) {
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 4) return;
    var copy = duplicateEvidenceNote(drag.duplicateSource), copyEl = noteEls.get(copy.id);
    clearSelection();
    selectedModels.add(copy); refreshSelection();
    copyEl.classList.add('dragging');
    drag.createdNote = copy;
    drag.items = [{ n: copy, w: copyEl, ox: copy.dx, oy: copy.dy }];
    drag.duplicateSource = null;
  }
  drag.items.forEach(function(item){
    item.n.dx = item.ox + (e.clientX - drag.sx) / zoomNow();
    item.n.dy = item.oy + (e.clientY - drag.sy) / zoomNow();
    item.w.style.translate = item.n.dx + 'px ' + item.n.dy + 'px';
  });
  follow();
});
var mdrag = null;
$('mface').addEventListener('pointerdown', function(e){ e.preventDefault(); var r = $('mull').getBoundingClientRect(); mdrag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; });
addEventListener('pointermove', function(e){ if (!mdrag) return; S.pin = { x: e.clientX - mdrag.dx, y: e.clientY - mdrag.dy }; positionMull(); });
addEventListener('pointerup', function(){ mdrag = null; });
addEventListener('pointercancel', function(){ mdrag = null; });
$('mface').addEventListener('dblclick', function(){ S.pin = null; positionMull(); });
function endDrag(){
  if (!drag) return;
  if (drag.createdNote) {
    var created = drag.createdNote;
    recordUndo(function(){
      selectedModels.delete(created);
      S.notes = (S.notes || []).filter(function(n){ return n !== created; });
      renderNotes(); renderWires();
    });
  }
  var moved = drag.items.filter(function(item){ return item.n.dx !== item.ox || item.n.dy !== item.oy; });
  if (moved.length && drag.origin && S.topicChoosing) {
    var origin = drag.origin;
    justDraggedTopicSource = origin;
    setTimeout(function(){ if (justDraggedTopicSource === origin) justDraggedTopicSource = null; }, 0);
  }
  if (moved.length && !drag.createdNote) {
    var before = drag.items.map(function(item){ return { n: item.n, x: item.ox, y: item.oy }; });
    recordUndo(function(){
      before.forEach(function(item){ item.n.dx = item.x; item.n.dy = item.y; });
      selectionTargets().forEach(function(item){
        if (before.some(function(old){ return old.n === item.model; }))
          item.el.style.translate = (item.model.dx || 0) + 'px ' + (item.model.dy || 0) + 'px';
      });
      follow();
    });
  }
  drag.items.forEach(function(item){ item.w.classList.remove('dragging'); });
  drag = null; follow();
}
addEventListener('pointerup', endDrag);
addEventListener('pointercancel', endDrag);
document.addEventListener('keydown', function(e){
  if (e.key !== 'Delete' || e.ctrlKey || e.metaKey || e.altKey || isTextEditor(document.activeElement) || document.body.classList.contains('onb')) return;
  var chosen = Array.from(selectedModels), removed = false;
  chosen.forEach(function(model){
    var target = selectionTargets().find(function(item){ return item.model === model; });
    var button = target && target.el.querySelector('.nx,.ax,[data-del]');
    if (button) { button.click(); removed = true; }
  });
  if (removed) { e.preventDefault(); clearSelection(); }
});
var raf = 0;
function follow(){ if (raf) return; raf = requestAnimationFrame(function(){ raf = 0; S.still = true; layoutTermRow(); layoutEvidenceSearch(); if (typeof window.clampArgueBoundary === 'function') window.clampArgueBoundary(); renderWires(); positionMull(); watchSizes(); }); }
var scrollRaf = 0;
function followScroll(){
  if (scrollRaf || !S) return;
  scrollRaf = requestAnimationFrame(function(){ scrollRaf = 0; S.still = true; positionMull(); });
}
function layoutEvidenceSearch(){
  var layer = document.querySelector('[aria-labelledby="l2"]'), box = $('row-search');
  if (!layer || !box) return;
  var scale = layer.getBoundingClientRect().width / layer.offsetWidth || 1;
  var cards = layer.querySelectorAll('.evnote, #row-art .artcard, #row-evidence .nw');
  var bottom = 0;
  cards.forEach(function(card){
    if (card.getClientRects().length) bottom = Math.max(bottom, card.getBoundingClientRect().bottom);
  });
  if (box.getClientRects().length) {
    var previous = parseFloat(box.style.marginTop) || 0;
    var naturalTop = box.getBoundingClientRect().top - previous * scale;
    var needed = Math.max(0, Math.ceil((bottom + 24 - naturalTop) / scale));
    if (needed !== previous) box.style.marginTop = needed + 'px';
    var occupiedBottom = bottom;
    box.querySelectorAll('.search-board').forEach(function(board){
      var oldGap = parseFloat(board.style.marginTop) || 0;
      var boardTop = board.getBoundingClientRect().top - oldGap * scale;
      var gap = Math.max(0, Math.ceil((occupiedBottom + 24 - boardTop) / scale));
      if (gap !== oldGap) board.style.marginTop = gap + 'px';
      occupiedBottom = Math.max(occupiedBottom, board.getBoundingClientRect().bottom);
      board.querySelectorAll('.artcard').forEach(function(card){
        if (card.getClientRects().length) occupiedBottom = Math.max(occupiedBottom, card.getBoundingClientRect().bottom);
      });
    });
  } else if (box.style.marginTop) box.style.marginTop = '';
  /* Dragged cards use translate, so their visual bounds can extend past their
     original rows. Include every Evidence card, not only absolute-positioned notes,
     so the green section and the following Argue section follow their positions. */
  var contentBottom = 0;
  layer.querySelectorAll('.evnote, .artcard, #row-evidence .nw, .search-board').forEach(function(card){
    if (card.getClientRects().length) contentBottom = Math.max(contentBottom, card.getBoundingClientRect().bottom);
  });
  var finish = $('evidence-finish');
  if (finish && finish.getClientRects().length) {
    var oldFinishGap = parseFloat(finish.style.marginTop) || 0;
    var finishTop = finish.getBoundingClientRect().top - oldFinishGap * scale;
    var finishGap = Math.max(0, Math.ceil((contentBottom + 24 - finishTop) / scale));
    if (finishGap !== oldFinishGap) finish.style.marginTop = finishGap + 'px';
    contentBottom = Math.max(contentBottom, finish.getBoundingClientRect().bottom);
  } else if (finish && finish.style.marginTop) finish.style.marginTop = '';
  var minHeight = contentBottom ? Math.ceil((contentBottom - layer.getBoundingClientRect().top) / scale) + 30 : 0;
  if ((parseFloat(layer.style.minHeight) || 0) !== minHeight) layer.style.minHeight = minHeight ? minHeight + 'px' : '';
}
addEventListener('scroll', followScroll, {passive:true});
addEventListener('resize', function(){ layoutTermRow(); follow(); });
/* keep the wires attached: whenever ANY card changes size (a box is dragged bigger, text wraps
   differently after zooming, an answer card is added, fonts finish loading…), re-lay out the
   rows and redraw every wire. Watching only the whole map missed changes inside one card. */
var sizeWatch = 'ResizeObserver' in window ? new ResizeObserver(follow) : null;
function watchSizes(){
  if (!sizeWatch) return;
  sizeWatch.observe($('map')); sizeWatch.observe($('qcard'));
  document.querySelectorAll('#map .nw, #map .ghostcard, #map .artcard, #map .evnote, #row-search, #map .subs .sub, #map textarea').forEach(function(el){ sizeWatch.observe(el); }); /* observing the same element twice is harmless */
}
watchSizes();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(follow); /* text gets its final size once the fonts load */

/* the first question is set up in app.js, once every file has loaded */


/* ---------- slide across neighbouring words to join them into one phrase ---------- */
var slide = null;
function tokAt(x, y){ var el = document.elementFromPoint(x, y); el = el && el.closest && el.closest('#toks .tok'); return el ? +el.getAttribute('data-i') : null; }
function slideRange(a, b){
  var lo = Math.min(a, b), hi = Math.max(a, b);
  var r1 = chunkOf(lo), r2 = chunkOf(hi); if (r1) lo = Math.min(lo, r1[0]); if (r2) hi = Math.max(hi, r2[1]);
  if (hi - lo > 3) { if (b > a) hi = lo + 3; else lo = hi - 3; } /* up to 4 words */
  return [lo, hi];
}
function paintSlide(){
  var kids = $('toks').children;
  for (var i = 0; i < kids.length; i++) { var inR = !!(slide && slide.on && i >= slide.r[0] && i <= slide.r[1]); kids[i].classList.toggle('joining', inR); kids[i].classList.toggle('js', inR && i === slide.r[0]); kids[i].classList.toggle('je', inR && i === slide.r[1]); }
  $('toks').classList.toggle('sliding', !!(slide && slide.on));
}
$('toks').addEventListener('pointerdown', function(e){
  var t = e.target.closest('.tok'); if (!t || e.button > 0) return;
  slide = { a: +t.getAttribute('data-i'), x: e.clientX, y: e.clientY, on: false, r: null };
});
addEventListener('pointermove', function(e){
  if (!slide) return;
  var moved = Math.abs(e.clientX - slide.x) + Math.abs(e.clientY - slide.y);
  var j = tokAt(e.clientX, e.clientY);
  /* only counts as a slide once the finger/cursor travels into a different word */
  var dxs = Math.abs(e.clientX - slide.x), dys = Math.abs(e.clientY - slide.y);
  if (!slide.on && (dxs < 10 || dys > dxs * 1.2 || j == null || j === slide.a)) return;
  if (j == null) return;
  slide.on = true; slide.r = slideRange(slide.a, j);
  if (slide.r[0] === slide.r[1]) { slide.r = null; slide.on = false; }
  paintSlide();
});
function endSlide(){
  if (!slide) return;
  var done = slide.on && slide.r && slide.r[1] > slide.r[0] ? slide.r : null;
  slide = null; paintSlide();
  if (!done) return;
  suppressTokClick = true; setTimeout(function(){ suppressTokClick = false; }, 0);
  S.userChunks = (S.userChunks || []).filter(function(u){ return u[1] < done[0] || u[0] > done[1]; }).concat([done]);
  Object.keys(S.split).forEach(function(k){ var ab = k.split('-'); if (+ab[0] <= done[1] && +ab[1] >= done[0]) delete S.split[k]; });
  computeChunks();
  range(done).forEach(function(i){ if (S.sel.indexOf(i) < 0) S.sel.push(i); });
  syncTerms(); prefetch();
  var ph = range(done).map(function(i){ return clean(S.toks[i]); }).join(' ');
  if (!S.revealed) { S.say = of('term').length < 2 ? SAYS.tapTwo : SAYS.writeMeaning; S.mood = 'listening'; S.focus = null; }
  renderAll();
}
addEventListener('pointerup', endSlide);
addEventListener('pointercancel', function(){ slide = null; paintSlide(); });


/* ---------- drag a link from an Unpack card's + onto an Evidence card ---------- */
var linkDrag = null;
(function(){ var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); sv.id = 'dragwire'; $('map').appendChild(sv); })();
function evAt(x, y){ var el = document.elementFromPoint(x, y); var w = el && el.closest && el.closest('#row-evidence .nw'); return w ? node(+w.getAttribute('data-id')) : null; }
function drawDrag(x, y){
  var sv = $('dragwire'), mr = $('map').getBoundingClientRect(), Z = zoomNow();
  if (!linkDrag) { sv.innerHTML = ''; return; }
  var r = linkDrag.plug.getBoundingClientRect(), ax = (r.left + r.width / 2 - mr.left) / Z, ay = (r.top + r.height / 2 - mr.top) / Z, bx = (x - mr.left) / Z, by = (y - mr.top) / Z, my = (ay + by) / 2;
  sv.setAttribute('width', mr.width / Z); sv.setAttribute('height', mr.height / Z);
  sv.innerHTML = '<path d="M' + ax + ' ' + ay + ' C' + ax + ' ' + my + ' ' + bx + ' ' + my + ' ' + bx + ' ' + by + '"/><circle cx="' + bx + '" cy="' + by + '" r="5"/>';
}
$('row-term').addEventListener('pointerdown', function(e){
  var pl = e.target.closest('.plug'); if (!pl) return;
  e.preventDefault(); e.stopPropagation();
  var w = pl.closest('.nw'); linkDrag = { from: +w.getAttribute('data-id'), plug: pl, over: null };
  document.body.classList.add('linking');
  $('row-evidence').querySelectorAll('.nw').forEach(function(x){ x.classList.add('linkable'); });
  drawDrag(e.clientX, e.clientY);
});
addEventListener('pointermove', function(e){
  if (!linkDrag) return;
  e.preventDefault();
  var ev = evAt(e.clientX, e.clientY);
  if (linkDrag.over !== (ev && ev.id)) {
    $('row-evidence').querySelectorAll('.nw.droptarget').forEach(function(x){ x.classList.remove('droptarget'); });
    if (ev) { var w = els.get(ev.id); if (w) w.classList.add('droptarget'); }
    linkDrag.over = ev ? ev.id : null;
  }
  drawDrag(e.clientX, e.clientY);
});
function endLink(e){
  if (!linkDrag) return;
  var ld = linkDrag; linkDrag = null; drawDrag();
  document.body.classList.remove('linking');
  $('row-evidence').querySelectorAll('.nw').forEach(function(x){ x.classList.remove('linkable', 'droptarget'); });
  var ev = e && e.type === 'pointerup' ? evAt(e.clientX, e.clientY) : null, t = node(ld.from);
  if (!ev || !t) return;
  ev.links = ev.links || [];
  if (ev.links.indexOf(t.id) >= 0) { ev.links = ev.links.filter(function(id){ return id !== t.id; }); S.say = SAYS.unlinked({ term: t.phrase }); S.mood = 'listening'; }
  else { ev.links.push(t.id); S.say = SAYS.linked({ term: t.phrase }); S.mood = 'pleased'; }
  S.focus = ev.id; renderAll();
}
addEventListener('pointerup', endLink);
addEventListener('pointercancel', endLink);


/* ---------- zoom and select cards by dragging across empty map space ---------- */
var ZMIN = 0.4, ZMAX = 1.6;
/* Zoom around the section being viewed, using its cards rather than the empty
   map frame. This keeps hand-arranged Evidence maps from slipping off screen. */
function zoomSection(){
  var middle = innerHeight / 2;
  var sections = Array.from(document.querySelectorAll('#map .layer')).reverse();
  return sections.find(function(section){
    var r = section.getBoundingClientRect();
    return r.top <= middle && r.bottom >= middle;
  }) || document.querySelector('#map .layer.focus');
}
function zoomContentBounds(section){
  if (!section) return null;
  var selector = section.getAttribute('aria-labelledby') === 'l1'
    ? '#row-term .nw, #row-term .ghostcard'
    : section.getAttribute('aria-labelledby') === 'l2'
      ? '.evnote, #row-art .artcard, #row-evidence .nw, #row-search .artcard'
      : '.topic-card, .topic-evidence-card, .topic-deeper-card, .final-stand-card';
  var bounds = null;
  section.querySelectorAll(selector).forEach(function(card){
    if (!card.getClientRects().length) return;
    var r = card.getBoundingClientRect();
    if (!bounds) bounds = { left:r.left, right:r.right };
    else { bounds.left = Math.min(bounds.left, r.left); bounds.right = Math.max(bounds.right, r.right); }
  });
  return bounds;
}
function centerZoomContent(section){
  var b = zoomContentBounds(section);
  if (!b || (b.left >= 20 && b.right <= innerWidth - 20)) return;
  window.scrollBy((b.left + b.right) / 2 - innerWidth / 2, 0);
  positionMull();
}
function setZoom(z, cx, cy){
  var section = zoomSection(), bounds = zoomContentBounds(section);
  if (z > mapZoom && bounds && bounds.right > bounds.left) {
    /* Stop enlarging before the chosen section becomes wider than the window. */
    z = Math.min(z, Math.max(mapZoom, mapZoom * (innerWidth - 40) / (bounds.right - bounds.left)));
  }
  z = clamp(Math.round(z * 100) / 100, ZMIN, ZMAX);
  if (z === mapZoom) { centerZoomContent(section); return; }
  var map = $('map'), r = map.getBoundingClientRect();
  if (cx == null) { cx = innerWidth / 2; cy = innerHeight / 2; }
  var px = (cx - r.left) / mapZoom, py = (cy - r.top) / mapZoom; /* the map point under the cursor */
  mapZoom = z; document.documentElement.style.setProperty('--mapzoom', z);
  var r2 = map.getBoundingClientRect();
  window.scrollBy(r2.left + px * z - cx, r2.top + py * z - cy); /* keep that point under the cursor */
  $('zpct').textContent = Math.round(z * 100) + '%';
  S.still = true; layoutTermRow(); renderWires(); positionMull();
  follow(); /* and once more on the next frame, after text has re-wrapped at the new zoom */
  requestAnimationFrame(function(){ centerZoomContent(section); });
}
/* map: zoom only through the buttons; the mouse wheel scrolls the page as normal */
/* the start page zooms and pans the same way, with its own zoom level */
var obZoom = 1;
function onStart(){ return document.body.classList.contains('onb'); }
function syncZoomLabel(){ $('zpct').textContent = Math.round((onStart() ? obZoom : mapZoom) * 100) + '%'; }
function setObZoom(z, cx, cy){
  z = clamp(Math.round(z * 100) / 100, ZMIN, ZMAX); if (z === obZoom) return;
  var ob = $('onboard'), r = ob.getBoundingClientRect();
  if (cx == null) { cx = innerWidth / 2; cy = innerHeight / 2; }
  var px = (cx - r.left) / obZoom, py = (cy - r.top) / obZoom;
  obZoom = z; document.documentElement.style.setProperty('--obzoom', z);
  var r2 = ob.getBoundingClientRect();
  window.scrollBy(r2.left + px * z - cx, r2.top + py * z - cy);
  syncZoomLabel(); positionMull();
}
/* start page: zoom only through the buttons; the mouse wheel scrolls the page as normal */
$('zoomctl').addEventListener('click', function(e){
  var b = e.target.closest('[data-z]'); if (!b) return;
  var k = b.getAttribute('data-z');
  if (onStart()) {
    if (k === 'in') setObZoom(obZoom * 1.15);
    else if (k === 'out') setObZoom(obZoom / 1.15);
    else if (k === 'reset') setObZoom(1);
    else { var oh = $('onboard').getBoundingClientRect().height / obZoom; setObZoom(Math.min(1, (innerHeight - 90) / oh)); window.scrollTo({ top: 0, left: 0 }); }
    return;
  }
  if (k === 'in') setZoom(mapZoom * 1.15);
  else if (k === 'out') setZoom(mapZoom / 1.15);
  else if (k === 'reset') setZoom(1);
  else { var h = $('map').getBoundingClientRect().height / mapZoom, w = $('map').getBoundingClientRect().width / mapZoom; setZoom(Math.min(1, (innerHeight - 90) / h, (innerWidth - 20) / w)); var top = $('map').getBoundingClientRect().top + scrollY - 70; window.scrollTo({ top: Math.max(0, top), left: 0 }); }
});
function isEmpty(t){ return !t.closest('.nw,.ghostcard,.artcard,button,textarea,input,a,.tok,.qcard .toks,#mull,.zoomctl,.rowtools,.addslot,.addev,.evtoolbox,.evnote,.nlx,.lhead,.lock,.artnote,.srhead'); }
function marqueeRect(x1, y1, x2, y2){
  return { left: Math.min(x1, x2), top: Math.min(y1, y2), right: Math.max(x1, x2), bottom: Math.max(y1, y2) };
}
function overlaps(a, b){ return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
function updateMarquee(x, y){
  var r = marqueeRect(marquee.x, marquee.y, x, y);
  marqueeBox.style.left = r.left + 'px'; marqueeBox.style.top = r.top + 'px';
  marqueeBox.style.width = (r.right - r.left) + 'px'; marqueeBox.style.height = (r.bottom - r.top) + 'px';
  selectedModels.clear();
  selectionTargets().forEach(function(item){ if (overlaps(r, item.el.getBoundingClientRect())) selectedModels.add(item.model); });
  refreshSelection();
}
$('map').addEventListener('pointerdown', function(e){
  if (e.button !== 0 || e.pointerType === 'touch' || S.tool === 'text' || !isEmpty(e.target)) return;
  e.preventDefault();
  blurTextEditor();
  clearSelection();
  marquee = { x: e.clientX, y: e.clientY, on: false };
});
addEventListener('pointermove', function(e){
  if (!marquee) return;
  if (!marquee.on && Math.abs(e.clientX - marquee.x) + Math.abs(e.clientY - marquee.y) < 4) return;
  marquee.on = true; marqueeBox.hidden = false; document.body.classList.add('selecting');
  updateMarquee(e.clientX, e.clientY);
});
function endMarquee(){
  if (!marquee) return;
  marquee = null; marqueeBox.hidden = true; document.body.classList.remove('selecting');
}
addEventListener('pointerup', endMarquee);
addEventListener('pointercancel', endMarquee);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { endMarquee(); clearSelection(); } });
