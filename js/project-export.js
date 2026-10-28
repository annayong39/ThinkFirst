/* Export the saved snapshot, without opening or changing the current map. */
function savedProject(id){
  var p = readProjects().find(function(item){ return item.id === id; });
  if (!p || !p.state) throw new Error('This saved project is no longer available.');
  return p;
}
function projectActionError(message){ window.alert(message); }
function projectFilename(p){
  var question = String(p.question || 'essay').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90).replace(/[. ]+$/, '');
  return 'ThinkFirst - ' + (question || 'essay') + ' - ' + String(p.savedAt || '').slice(0, 10);
}
function deleteProject(id){
  try {
    var p = savedProject(id);
    if (!window.confirm('Delete this saved project?\n\n' + p.question + '\n\nThis cannot be undone. Downloaded PDF and JSON files will remain on your computer.')) return;
    // Read again after the confirmation, preserving any other updated projects.
    var list = readProjects().filter(function(item){ return item.id !== id; });
    localStorage.setItem(PROJECT_STORE, JSON.stringify(list));
    if (activeProjectId === id) activeProjectId = null;
    renderProjects();
  } catch(e) { projectActionError('Couldn’t delete this project. Its saved copy has been kept.'); }
}
function exportProjectJSON(id){
  var url, link;
  try {
    var p = savedProject(id);
    // Export only the project record; settings and API credentials are separate.
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json;charset=utf-8' });
    url = URL.createObjectURL(blob);
    link = document.createElement('a'); link.href = url; link.download = projectFilename(p) + '.json';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  } catch(e) {
    if (link) link.remove(); if (url) URL.revokeObjectURL(url);
    projectActionError('Couldn’t download the project backup. Please try again.');
  }
}

/* Full text used by the visual print edition's measured detail pages. */
function projectDetailHTML(p){
  var s = p.state, nodes = s.nodes || [], articles = s.arts || [], searches = searchesOf(s);
  function text(value){ return esc(value == null ? '' : value); }
  function field(label, value){
    return value == null || value === '' ? '' : '<div class="field"><b>' + text(label) + '</b><p>' + text(value) + '</p></div>';
  }
  function section(title, contents){ return '<section><h2>' + text(title) + '</h2>' + (contents || '<p class="muted">Nothing added yet.</p>') + '</section>'; }
  function entry(title, contents){ return '<article class="entry"><h3>' + text(title) + '</h3>' + contents + '</article>'; }
  function nodeLabel(id){
    var n = nodes.find(function(item){ return String(item.id) === String(id); });
    return n ? (n.phrase || (n.kind === 'evidence' ? 'Evidence #' : 'Card #') + n.id) : 'Removed card';
  }
  function feedback(n){
    var html = '', ai = n.ai;
    if (ai) {
      html += field('Thinky’s read', ['', 'Developing', 'Solid', 'Sharp'][ai.level]);
      html += field('What Thinky heard', ai.heard) + field('Works', ai.strong) + field('Push', ai.push);
      (ai.questions || []).forEach(function(q){
        html += field('Thinky asks' + (q.skipped ? ' (skipped)' : ''), q.q);
        html += field('Your answer', n.replies && n.replies[q.id]);
      });
    }
    (n.thread || []).forEach(function(t){ html += field('Earlier question', t.q) + field('Your answer', t.a); });
    return html;
  }
  function evidenceReading(n){
    var html = n.text && n.text.trim() ? '<div class="field"><b>Explore this example</b><p><a href="' + text(articleSearchUrl(n.text.trim().slice(0, 240), '')) + '">Search Google for articles</a></p></div>' : '';
    return html + (n.ai && Array.isArray(n.ai.links) ? n.ai.links : []).map(function(item){
      var url = directArticleUrl(item.url);
      return url ? '<div class="field"><b>Further reading</b><p><a href="' + text(url) + '">' + text(item.title || url) + '</a>' + (item.source ? ' · ' + text(item.source) : '') + '</p></div>' : '';
    }).join('');
  }
  function article(a){
    var folder = (p.folders || []).find(function(c){ return c.id === a.saved; });
    var html = field('Source', [a.source, a.year].filter(Boolean).join(' · ')) + field('Summary', a.summary);
    html += field('Aspect', a.aspect) + field('Angle', a.angle) + field('Saved folder', folder && folder.label);
    var safe = a.verified ? directArticleUrl(a.url) : '';
    if (safe) html += '<div class="field"><b>Source link</b><p><a href="' + text(safe) + '">' + text(safe) + '</a></p></div>';
    return entry(a.title || 'Article', html);
  }
  var unpack = nodes.filter(function(n){ return n.kind === 'term'; }).map(function(n){
    var html = field('Definition', n.guide && n.guide.meaning) + field('How to approach it', n.cmdGuide);
    (n.talk || []).forEach(function(t){ html += field('Thinky asks', t.q) + field('Your answer', t.a == null ? '(Not answered yet)' : t.a); });
    if (!(n.talk || []).length) (n.guide && n.guide.decisions || []).forEach(function(q){ html += field('Thinky asks', q); });
    html += field('Extent of scope / draft', n.boundary || n.text) + field('My unpacking', n.summary);
    if (n.clar) {
      html += field('Question being clarified', n.clar.q);
      (n.clar.items || []).forEach(function(i){ html += field('You asked Thinky', i.ask) + field('Thinky replied', i.reply || '(Reply pending when saved)'); });
    }
    return entry(n.cmdLabel || n.phrase || 'Key term', html);
  }).join('');
  var evidence = nodes.filter(function(n){ return n.kind === 'evidence'; }).map(function(n){
    return entry('Evidence #' + n.id, field('Your evidence', n.text) + field('Connected key terms', (n.links || []).map(nodeLabel).join(', ')) + evidenceReading(n));
  }).join('');
  var notes = (s.notes || []).map(function(n, i){
    var links = (n.links || []).map(function(k){
      if (k.slice(0, 2) === 'E:') return nodeLabel(k.slice(2));
      if (k.slice(0, 2) === 'N:') {
        var noteIndex = (s.notes || []).findIndex(function(other){ return other.id === k.slice(2); });
        return noteIndex < 0 ? 'Removed note' : 'Note ' + (noteIndex + 1) + ': ' + String(s.notes[noteIndex].text || '').slice(0, 100);
      }
      var a = articles.concat(searchArticlesOf(s)).find(function(x){ return x.id === k.slice(2); });
      return a ? a.title : 'Removed article';
    });
    return entry('Note ' + (i + 1), field('Your note', n.text) + field('Connected notes and evidence', links.join('; ')));
  }).join('');
  var extra = nodes.filter(function(n){ return n.kind !== 'term' && n.kind !== 'evidence'; }).map(function(n){
    return entry(n.phrase || n.btype || n.kind, field('Your writing', n.text) + field('Summary', n.summary) + field('Connected cards', (n.links || []).map(nodeLabel).join(', ')) + feedback(n));
  }).join('');
  var body = section('01 · Unpack', unpack) + section('02 · Recommended articles', articles.map(article).join(''));
  searches.forEach(function(search){ body += section('Search results: ' + search.q, (search.items || []).map(article).join('')); });
  body += section('03 · Your evidence', evidence) + section('04 · Notes and connections', notes);
  if (extra) body += section('Arguments and other cards', extra);
  if (p.clarificationDraft) body += section('Unsent question to Thinky', field('Draft', p.clarificationDraft));
  return body;
}
function printProject(id){
  var preview;
  try {
    var html = projectPrintHTML(savedProject(id));
    preview = window.open('', '_blank');
    if (!preview) { projectActionError('Please allow pop-ups for ThinkFirst, then click PDF / Print again.'); return; }
    preview.document.open(); preview.document.write(html); preview.document.close();
    preview.document.getElementById('print').addEventListener('click', function(){ preview.focus(); preview.print(); });
    // The document flows naturally onto portrait A4 pages in the browser's print layout.
    preview.setTimeout(function(){ if (!preview.closed) { preview.focus(); preview.print(); } }, 150);
  } catch(e) { if (preview) preview.close(); projectActionError('Couldn’t prepare the print version. Please try again.'); }
}
