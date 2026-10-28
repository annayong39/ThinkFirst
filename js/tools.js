/* =====================================================================
   ThinkFirst — EVIDENCE TOOLS (toolbar at the top of Evidence)
   ---------------------------------------------------------------------
   "+ Add your own evidence" adds an evidence card
   Tools:
     Text   click it, then click anywhere in the Evidence section: a note
            appears there to type into. Notes keep what you type, can be
            dragged by their top strip, and have an × to delete them.
            An empty note disappears when you click away.
            Each note has a small + at the bottom: drag it onto an evidence
            card or another note to connect them
            with a dashed line. Drag it again to connect more cards. A small ×
            in the middle of each line removes that connection.
   Notes live in S.notes: [{ id, x, y, text, dx, dy, links }], x/y measured
   from the Evidence note canvas's top-left corner. links: ['A:<article id>',
   'E:<evidence card id>' or 'N:<note id>']. A new question starts with none.
   Add more tools here: a button in index.html (.evtoolbox) + its code below.
   ===================================================================== */

/* ---------- + Add your own evidence ---------- */
$('addev').addEventListener('click', function(){
  if (of('evidence').length >= 4) { S.say = SAYS.tooMuchEvidence; renderMull(); return; }
  var e = mk('evidence', { links: [] }); S.nodes.push(e); S.focus = e.id; renderAll(); focusNode(e.id);
});

/* ---------- Text tool ---------- */
var evLayer = document.querySelector('[aria-labelledby="l2"]'), noteEls = new Map();
function setTool(t){
  S.tool = S.tool === t ? null : t;
  $('tooltext').setAttribute('aria-pressed', String(S.tool === 'text'));
  document.body.classList.toggle('tool-text', S.tool === 'text');
  if (S.tool !== 'text') ghost.hidden = true;
}
$('tooltext').addEventListener('click', function(e){ e.stopPropagation(); setTool('text'); });
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && S.tool) setTool(S.tool); });

/* with the Text tool on, a soft grey "Add text" follows the cursor over Evidence, so you can see where the note will go */
var ghost = document.createElement('div'); ghost.className = 'textghost'; ghost.textContent = 'Add text'; ghost.hidden = true; ghost.setAttribute('aria-hidden', 'true');
document.body.appendChild(ghost);
var NO_NOTE = 'button,a,input,textarea,select,label,form,.evidence-toolbar,.artcard,.nw,.ghostcard,.evnote,.fmenu,#mull'; /* places a note can't be dropped */
evLayer.addEventListener('pointermove', function(e){
  var on = S.tool === 'text' && S.evOpen && !e.target.closest(NO_NOTE);
  ghost.hidden = !on; if (on) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
});
evLayer.addEventListener('pointerleave', function(){ ghost.hidden = true; });
/* with the Text tool on, a click on an empty spot in Evidence drops a note there */
evLayer.addEventListener('click', function(e){
  if (S.tool !== 'text' || !S.evOpen) return;
  if (e.target.closest(NO_NOTE)) return;
  ghost.hidden = true;
  var canvas = $('evnotes'), r = canvas.getBoundingClientRect(), k = r.width / canvas.offsetWidth || 1; /* undo the map zoom */
  var n = { id: 'n' + Date.now().toString(36), x: Math.round((e.clientX - r.left) / k), y: Math.round((e.clientY - r.top) / k), text: '' };
  (S.notes = S.notes || []).push(n);
  setTool('text'); /* one note per click: the tool switches off */
  renderNotes();
  var ta = noteEls.get(n.id) && noteEls.get(n.id).querySelector('textarea'); if (ta) ta.focus();
  /* Thinky moves next to the new note and prompts the student to group examples into a point (js/render.js positionMull) */
  S.focus = null; S.pin = null; S.askNode = null; S.sayList = null; S.mullAt = 'note'; S.noteTarget = noteEls.get(n.id);
  S.mood = 'curious'; S.say = SAYS.noteNudge; renderMull();
});

/* draw the notes: build each one once (so typing is never interrupted), remove deleted ones */
function removeEvidenceNote(n, textToRestore){
  var index = (S.notes || []).indexOf(n);
  if (index < 0) return;
  var linkKey = 'N:' + n.id;
  var incoming = (S.notes || []).filter(function(other){ return other !== n && (other.links || []).indexOf(linkKey) >= 0; })
    .map(function(other){ return { note: other, index: other.links.indexOf(linkKey) }; });
  recordUndo(function(){
    n.text = textToRestore;
    if ((S.notes || []).indexOf(n) < 0) S.notes.splice(Math.min(index, S.notes.length), 0, n);
    incoming.forEach(function(item){
      if (S.notes.indexOf(item.note) < 0) return;
      item.note.links = item.note.links || [];
      if (item.note.links.indexOf(linkKey) < 0) item.note.links.splice(Math.min(item.index, item.note.links.length), 0, linkKey);
    });
    renderNotes(); renderWires();
  });
  S.notes = S.notes.filter(function(other){ return other !== n; });
  S.notes.forEach(function(other){ other.links = (other.links || []).filter(function(k){ return k !== 'N:' + n.id; }); });
  renderNotes(); renderWires();
}
function duplicateEvidenceNote(n){
  var copy = { id: 'n' + crypto.randomUUID(), x: n.x, y: n.y,
    dx: n.dx || 0, dy: n.dy || 0, text: n.text || '', links: [] };
  (S.notes = S.notes || []).push(copy);
  renderNotes();
  return copy;
}
function renderNotes(){
  var box = $('evnotes'), notes = (S && S.notes) || [];
  box.hidden = !S.evOpen;
  $('tooltext').setAttribute('aria-pressed', String(S.tool === 'text')); document.body.classList.toggle('tool-text', S.tool === 'text'); /* stays in step after a new question */
  if (S.tool !== 'text') ghost.hidden = true;
  noteEls.forEach(function(el, id){ if (!notes.some(function(n){ return n.id === id; })) { el.remove(); noteEls.delete(id); } });
  notes.forEach(function(n){
    if (noteEls.has(n.id)) return;
    var el = document.createElement('div'); el.className = 'evnote';
    el.setAttribute('data-note-id', n.id);
    el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    if (n.dx || n.dy) el.style.translate = (n.dx || 0) + 'px ' + (n.dy || 0) + 'px';
    el.innerHTML = '<div class="nhead" title="Drag to move; hold Alt and drag to duplicate"><span>Note</span><button type="button" class="x nx" aria-label="Delete this note" title="Delete">✕</button></div>'
      + '<textarea rows="2" placeholder="Type a note…" aria-label="Note"></textarea>'
      + '<button type="button" class="nplug" aria-label="Drag to another note or evidence card to connect" title="Drag to another note or evidence card to connect">+</button>';
    var ta = el.querySelector('textarea'); ta.value = n.text || '';
    var textBefore = ta.value;
    function grow(){ ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
    ta.addEventListener('focus', function(){ textBefore = ta.value; });
    ta.addEventListener('input', function(){ n.text = ta.value; grow(); renderEvidenceFinish(); });
    ta.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); ta.blur(); }
    });
    ta.addEventListener('blur', function(){
      var incoming = (S.notes || []).some(function(other){ return other !== n && (other.links || []).indexOf('N:' + n.id) >= 0; });
      if (!ta.value.trim() && !(n.links || []).length && !incoming && !linkDrag2) { removeEvidenceNote(n, textBefore); return; }
      if (ta.value !== textBefore) {
        var previous = textBefore;
        recordUndo(function(){ n.text = previous; ta.value = previous; grow(); renderEvidenceFinish(); renderWires(); });
      }
    });
    el.querySelector('.nx').addEventListener('click', function(){
      removeEvidenceNote(n, n.text);
    });
    el.querySelector('.nplug').addEventListener('pointerdown', function(e){ startNoteLink(e, n, this); });
    /* Alt + drag the top strip to duplicate this note; a normal drag moves it. */
    el.querySelector('.nhead').addEventListener('pointerdown', function(e){
      if (e.target.closest('button')) return;
      e.preventDefault(); beginCardDrag(e, n, el, { duplicateNote: e.altKey });
    });
    box.appendChild(el); noteEls.set(n.id, el); setTimeout(grow, 0);
  });
  renderEvidenceFinish();
  refreshSelection();
  follow();
}

/* ---------- connecting a note to evidence cards or another note ---------- */
var linkDrag2 = null; /* { note, plug, over } while the + is being dragged */
var tmpWire = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); tmpWire.setAttribute('class', 'notedrag'); tmpWire.setAttribute('aria-hidden', 'true'); document.body.appendChild(tmpWire);
/* the note or evidence card under the pointer */
function cardAt(x, y, sourceId){
  var el = document.elementFromPoint(x, y); if (!el) return null;
  var noteEl = el.closest('#evnotes .evnote');
  if (noteEl) { var noteId = noteEl.getAttribute('data-note-id'); return noteId !== sourceId ? { key: 'N:' + noteId, el: noteEl } : null; }
  var a = el.closest('#row-art .artcard, #row-search .artcard'); if (a) return { key: 'A:' + a.getAttribute('data-k').slice(1), el: a };
  var w = el.closest('#row-evidence .nw'); if (w) { var n = node(+w.getAttribute('data-id')); if (n && n.kind === 'evidence') return { key: 'E:' + n.id, el: w.querySelector('.card') }; }
  return null;
}
function startNoteLink(e, n, plug){
  e.preventDefault(); e.stopPropagation();
  linkDrag2 = { note: n, plug: plug, over: null };
  document.body.classList.add('notelinking');
  moveNoteLink(e);
}
function moveNoteLink(e){
  if (!linkDrag2) return;
  var r = linkDrag2.plug.getBoundingClientRect(), ax = r.left + r.width / 2, ay = r.top + r.height / 2, bx = e.clientX, by = e.clientY, my = (ay + by) / 2;
  tmpWire.innerHTML = '<path d="M' + ax + ' ' + ay + ' C' + ax + ' ' + my + ' ' + bx + ' ' + my + ' ' + bx + ' ' + by + '"/>';
  var hit = cardAt(bx, by, linkDrag2.note.id);
  if (linkDrag2.over && (!hit || hit.el !== linkDrag2.over.el)) linkDrag2.over.el.classList.remove('notedrop');
  if (hit) hit.el.classList.add('notedrop');
  linkDrag2.over = hit;
}
function endNoteLink(){
  if (!linkDrag2) return;
  var d = linkDrag2; linkDrag2 = null; tmpWire.innerHTML = ''; document.body.classList.remove('notelinking');
  if (d.over) {
    d.over.el.classList.remove('notedrop');
    d.note.links = d.note.links || [];
    var reverse = d.over.key.slice(0, 2) === 'N:' && (S.notes || []).some(function(n){ return n.id === d.over.key.slice(2) && (n.links || []).indexOf('N:' + d.note.id) >= 0; });
    if (!reverse && d.note.links.indexOf(d.over.key) < 0) {
      d.note.links.push(d.over.key);
      birth('note-' + d.note.id + '|' + d.over.key);
    }
  }
  renderEvidenceFinish(); renderWires();
}
addEventListener('pointermove', moveNoteLink);
addEventListener('pointerup', endNoteLink);
addEventListener('pointercancel', endNoteLink);

/* called by renderWires (js/render.js): dashed links between notes and cards, plus a small × to remove each */
var linkBox = document.createElement('div'); linkBox.className = 'notelinks'; $('map').appendChild(linkBox);
function noteWires(box, path){
  var p = '', want = [];
  if (S.evOpen) (S.notes || []).forEach(function(n){
    var ne = noteEls.get(n.id); if (!ne || !ne.isConnected) return;
    n.links = (n.links || []).filter(function(k){
      var kind = k.slice(0, 2), id = k.slice(2);
      var t = kind === 'N:' ? noteEls.get(id)
        : kind === 'A:' ? document.querySelector('#row-art .artcard[data-k="A' + id + '"], #row-search .artcard[data-k="A' + id + '"]')
        : kind === 'E:' && els.get(+id) ? els.get(+id).querySelector('.card') : null;
      if (!t || !t.isConnected) return kind === 'N:' ? (S.notes || []).some(function(other){ return other.id === id; })
        : kind === 'A:' ? (S.arts || []).concat(searchArticlesOf(S)).some(function(a){ return a.id === id; })
        : kind === 'E:' && !!node(+id); /* temporarily hidden cards keep their links; deleted cards do not */
      var a = box(ne), b = box(t), from = a, to = b;
      if (kind === 'N:' && b.top < a.top) { from = b; to = a; }
      p += path(from, to, 'notelink', 'note-' + n.id + '|' + k);
      want.push({ id: n.id + '|' + k, n: n, k: k, x: (from.cx + to.cx) / 2, y: (from.bottom + to.top) / 2 });
      return true;
    });
  });
  /* the little × buttons: keep the same elements while the links stay the same, just move them */
  var key = want.map(function(w){ return w.id; }).join(',');
  if (linkBox.getAttribute('data-k') !== key) {
    linkBox.setAttribute('data-k', key);
    linkBox.innerHTML = want.map(function(w, i){ return '<button type="button" class="nlx" data-i="' + i + '" aria-label="Remove this connection" title="Remove this connection">✕</button>'; }).join('');
    linkBox.querySelectorAll('.nlx').forEach(function(b){
      b.addEventListener('click', function(){ var w = linkBox._want[+b.getAttribute('data-i')]; if (!w) return; w.n.links = w.n.links.filter(function(k){ return k !== w.k; }); renderEvidenceFinish(); renderWires(); });
    });
  }
  linkBox._want = want;
  linkBox.querySelectorAll('.nlx').forEach(function(b, i){ var w = want[i]; if (w) { b.style.left = w.x + 'px'; b.style.top = w.y + 'px'; } });
  return p;
}
