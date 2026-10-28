/* A concise, document-style essay plan made from a saved project snapshot. */
function projectPrintHTML(project) {
  var state = project.state || {}, nodes = state.nodes || [];
  var articles = (state.arts || []).concat(searchArticlesOf(state));
  var ownEvidence = nodes.filter(function(node) { return node.kind === 'evidence'; });
  var notes = state.notes || [];
  var topics = state.topicSentences || [];

  function text(value) { return esc(String(value == null ? '' : value)); }
  function paragraph(value) { return text(value).replace(/\r?\n/g, '<br>'); }
  function section(title, content) {
    return '<section class="outline-section"><h2>' + title + '</h2>' +
      (content || '<p class="empty">Nothing saved in this section yet.</p>') + '</section>';
  }
  function articleLink(article, label) {
    var url = article && article.verified ? directArticleUrl(article.url) : '';
    var href = url || articleSearchUrl(article && article.title, article && article.source);
    return '<a href="' + text(href) + '" target="_blank" rel="noopener noreferrer">' + text(label || (article && article.title) || 'Article') + '</a>';
  }
  function articleById(id) {
    return articles.find(function(article) { return String(article.id) === String(id); });
  }
  function evidenceById(id) {
    return ownEvidence.find(function(item) { return String(item.id) === String(id); });
  }
  function evidenceLabel(item) {
    var key = String(item.key || '');
    if (key.slice(0, 2) === 'A:') {
      var article = articleById(key.slice(2));
      return article ? articleLink(article, article.title) : text(item.text);
    }
    if (key.slice(0, 2) === 'E:') {
      var own = evidenceById(key.slice(2));
      return paragraph(own ? own.text : item.text);
    }
    return paragraph(item.text);
  }

  var terms = nodes.filter(function(node) { return node.kind === 'term'; });
  var unpack = terms.map(function(term) {
    var result = String(term.summary || '').trim();
    var command = String(term.cmdGuide || '').trim();
    var label = term.cmdLabel || term.phrase || term.text || 'Key term';
    return '<article class="unpack-entry"><h3>' + text(label) + '</h3>' +
      (result ? '<p>' + paragraph(result) + '</p>' : command ? '<p>' + paragraph(command) + '</p>' : '<p class="empty">No final unpacking saved.</p>') + '</article>';
  }).join('');

  var seen = new Set();
  var evidence = articles.map(function(article) {
    if (!article || seen.has(String(article.id))) return '';
    seen.add(String(article.id));
    var url = article.verified ? directArticleUrl(article.url) : '';
    return '<li class="evidence-entry"><strong>' + articleLink(article, article.title || 'Article') + '</strong>' +
      (article.source ? '<span class="source">' + text(article.source) + '</span>' : '') +
      (article.summary ? '<p>' + paragraph(article.summary) + '</p>' : '') +
      (!url ? '<span class="source">Opens a search for this article; a direct source link was not saved.</span>' : '') + '</li>';
  }).join('');
  evidence += ownEvidence.map(function(item) {
    var links = item.ai && Array.isArray(item.ai.links) ? item.ai.links : [];
    return '<li class="evidence-entry"><strong>' + paragraph(item.text || 'Student example') + '</strong>' +
      (links.length ? '<ul class="source-links">' + links.map(function(link) {
        var url = directArticleUrl(link.url);
        return url ? '<li><a href="' + text(url) + '" target="_blank" rel="noopener noreferrer">' + text(link.title || link.source || url) + '</a></li>' : '';
      }).join('') + '</ul>' : '<span class="source"><a href="' + text(articleSearchUrl(item.text || '', '')) + '" target="_blank" rel="noopener noreferrer">Search for a source</a></span>') + '</li>';
  }).join('');

  function noteTarget(key) {
    var kind = key.slice(0, 2), id = key.slice(2);
    if (kind === 'A:') { var article = articleById(id); return article && article.title; }
    if (kind === 'E:') { var own = evidenceById(id); return own && own.text; }
    if (kind === 'N:') { var note = notes.find(function(item) { return String(item.id) === id; }); return note && note.text; }
    return '';
  }
  var diagram = notes.map(function(note) {
    var targets = (note.links || []).map(noteTarget).filter(Boolean);
    return '<figure class="connection"><div class="connection-note"><small>Note</small><span>' + paragraph(note.text || 'Untitled note') + '</span></div>' +
      (targets.length ? '<div class="connection-line" aria-hidden="true"></div><div class="connection-targets">' + targets.map(function(target) {
        return '<div class="connection-target">' + paragraph(target) + '</div>';
      }).join('') + '</div>' : '') + '</figure>';
  }).join('');

  var argumentsHTML = [0, 1, 2].map(function(index) {
    var topic = topics[index] || {}, items = topic.evidence || [];
    return '<article class="argument-entry"><h3>Topic sentence ' + (index + 1) + '</h3>' +
      '<p class="topic-text">' + (String(topic.text || '').trim() ? paragraph(topic.text) : '<span class="empty">Not written yet.</span>') + '</p>' +
      '<h4>Supporting evidence</h4>' +
      (items.length ? '<ul>' + items.map(function(item) { return '<li>' + evidenceLabel(item) + '</li>'; }).join('') + '</ul>' : '<p class="empty">No evidence selected.</p>') + '</article>';
  }).join('');
  var stand = '<div class="final-stand"><h3>Final stand</h3><p>' +
    (String(state.finalStand || '').trim() ? paragraph(state.finalStand) : '<span class="empty">Not written yet.</span>') + '</p></div>';

  var date = project.savedAt ? new Date(project.savedAt) : null;
  var saved = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + text(projectFilename(project)) + '</title><style>' + PROJECT_PRINT_CSS + '</style></head>' +
    '<body><div class="printbar"><span>Essay plan preview</span><button id="print" type="button">Print / Save as PDF</button></div>' +
    '<main class="document"><header class="document-header"><div class="wordmark">think<span>first</span></div>' + (saved ? '<div class="saved">Saved ' + text(saved) + '</div>' : '') + '</header>' +
    '<h1>' + text(project.question || state.q || 'Essay question') + '</h1>' +
    section('1. Unpack', unpack) +
    section('2. Evidence', (evidence ? '<ol class="evidence-list">' + evidence + '</ol>' : '') +
      (diagram ? '<div class="diagram-section"><h3>Notes and connections</h3><p class="diagram-caption">A simple view of the links in your evidence mind map.</p>' + diagram + '</div>' : '')) +
    section('3. Argue', argumentsHTML + stand) +
    '</main></body></html>';
}

var PROJECT_PRINT_CSS = `
@page{size:A4 portrait;margin:18mm 17mm}
*{box-sizing:border-box}
body{margin:0;background:#ececea;color:#2d362f;font:11pt/1.5 Arial,sans-serif}
.printbar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;padding:12px max(20px,calc((100vw - 210mm)/2));background:#f3effc;font-size:13px}
.printbar button{border:0;border-radius:999px;background:#ccbdf4;color:#2d362f;padding:9px 17px;font:inherit;font-weight:700;cursor:pointer}
.document{width:min(210mm,100%);min-height:297mm;margin:24px auto;padding:18mm 17mm;background:#fff;box-shadow:0 5px 25px #0002}
.document-header{display:flex;justify-content:space-between;align-items:center;gap:12px;color:#687064;font-size:9pt}
.wordmark{font-size:15pt;font-weight:700;color:#2d362f;letter-spacing:-.05em}.wordmark span{background:#ccbdf4;border-radius:20px;padding:1px 4px;margin-left:1px}
h1{margin:12mm 0 9mm;font-size:18pt;line-height:1.3;font-weight:700;overflow-wrap:anywhere}
h2{font-size:14pt;margin:0 0 5mm;padding-bottom:2mm;border-bottom:1px solid #cfc9bc}
h3{font-size:11pt;margin:0 0 2mm}h4{font-size:9pt;margin:3mm 0 1mm;color:#5b4a96}
p{margin:0 0 3mm;overflow-wrap:anywhere}.outline-section{margin:0 0 9mm}
.unpack-entry,.argument-entry,.final-stand{margin:0 0 5mm;break-inside:avoid-page}
.unpack-entry h3{display:inline-block;background:#fff3ad;padding:1mm 2mm;border-radius:3mm}.unpack-entry p{margin:1mm 0 0}
.evidence-list{margin:0;padding-left:6mm}.evidence-entry{padding-left:1mm;margin:0 0 5mm;break-inside:avoid-page}.evidence-entry strong{font-size:10pt}
.source{display:block;color:#687064;font-size:9pt;margin-top:1mm}.evidence-entry p{margin:1mm 0 0;font-size:9pt}
.source-links{margin:2mm 0 0;padding-left:5mm;font-size:9pt}
a{color:#5b4a96;text-decoration:underline;overflow-wrap:anywhere}
.diagram-section{margin-top:7mm}.diagram-caption{font-size:9pt;color:#687064}
.connection{display:grid;grid-template-columns:minmax(0,1fr) 12mm minmax(0,1fr);align-items:center;gap:0;margin:3mm 0;break-inside:avoid-page}
.connection-note,.connection-target{border:1px solid #ccbdf4;border-radius:3mm;background:#f6f2ff;padding:2.5mm;overflow-wrap:anywhere;font-size:9pt}
.connection-note small{display:block;color:#5b4a96;font-weight:700;text-transform:uppercase;font-size:7pt;margin-bottom:1mm}
.connection-line{height:1px;background:#9e90c4}.connection-targets{display:grid;gap:2mm}.connection-target{background:#fff}
.connection:not(:has(.connection-targets)){grid-template-columns:minmax(0,1fr)}
.argument-entry{padding-left:4mm;border-left:2px solid #ccbdf4}.argument-entry ul{margin:1mm 0 0;padding-left:5mm}.argument-entry li{margin:0 0 1mm;overflow-wrap:anywhere}
.topic-text{font-weight:600}.final-stand{padding:4mm 5mm;background:#fffaf0;border:1px solid #e6d9ae;border-radius:3mm}
.final-stand h3{color:#5b4a96}.final-stand p{margin:0;font-weight:600}.empty{color:#687064;font-style:italic}
@media(max-width:700px){.document{margin:0;padding:22px;min-height:0}.printbar{padding:10px 16px}}
@media print{body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.printbar{display:none}.document{width:auto;min-height:0;margin:0;padding:0;box-shadow:none}a{color:#5b4a96;text-decoration:underline}}
`;
