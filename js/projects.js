/* Saved essays: content and layout stay in this browser, separate from AI settings. */
var PROJECT_STORE = 'tf-projects', activeProjectId = null, restoringProject = false;
var projectNoticeTimer;

function readProjects(){
  var list = JSON.parse(localStorage.getItem(PROJECT_STORE) || '[]');
  if (!Array.isArray(list)) throw new Error('Invalid project list');
  return list;
}
function projectCopy(value){
  return JSON.parse(JSON.stringify(value, function(key, v){
    if (['subEl', 'noteTarget', 'argEl'].indexOf(key) >= 0 || (typeof Node !== 'undefined' && v instanceof Node)) return undefined;
    return v;
  }));
}
/* Loading indicators and pending requests cannot survive closing the page. Keep
   their inputs and offer the existing retry controls instead. */
function prepareProjectState(saved){
  var s = projectCopy(saved);
  s.nodes.forEach(function(n){
    if (n.kind === 'term' && !n.guide) n.guide = { status: 'error' };
    if (n.asking) {
      var last = n.talk && n.talk[n.talk.length - 1];
      if (last && last.a != null) { n.boundary = n.text = last.a; last.a = null; }
    }
    n.asking = false;
    if (n.status === 'reading') { n.status = 'error'; n.lastSent = ''; }
    if (n.guide && n.guide.status === 'loading') n.guide.status = 'error';
    if (n.clar) n.clar.items.forEach(function(i){ if (i.reply == null) i.reply = 'This reply was not saved yet. Please ask again.'; });
  });
  ['artStatus', 'chunkStatus'].forEach(function(k){ if (s[k] === 'loading') s[k] = 'error'; });
  s.searches = searchesOf(s); delete s.search;
  s.searches.forEach(function(search){ if (search.status === 'loading') search.status = 'error'; });
  if (s.mull.status === 'loading') s.mull.status = 'error';
  if (s.argumentReview && s.argumentReview.status === 'pending') s.argumentReview.status = 'error';
  if (!s.revealed) s.wantReveal = false;
  if (s.thinking) { s.say = 'Your project is open. You can continue where you left off.'; s.sayList = null; }
  s.thinking = false; s.tool = null;
  return s;
}
function projectNotice(message, failed){
  clearTimeout(projectNoticeTimer);
  $('projectstatus').textContent = message;
  $('projectstatus').classList.toggle('error', !!failed);
  $('saveproject').textContent = failed ? 'Save this project' : 'Saved!';
  projectNoticeTimer = setTimeout(function(){ $('saveproject').textContent = 'Save this project'; $('projectstatus').textContent = ''; }, 5000);
}
function saveProject(){
  try {
    var list = readProjects(), id = activeProjectId || ('p-' + crypto.randomUUID());
    var previous = list.find(function(p){ return p.id === id; });
    var stamp = new Date().toISOString();
    var project = { version: 1, id: id, question: S.q, createdAt: previous ? previous.createdAt : stamp, savedAt: stamp,
      state: projectCopy(S), zoom: mapZoom, scroll: { x: scrollX, y: scrollY }, searchText: $('esq').value,
      folders: projectCopy(OB_CATS), articles: projectCopy(OB_SAVED),
      clarificationDraft: $('say').querySelector('.clarin') ? $('say').querySelector('.clarin').value : '' };
    list = list.filter(function(p){ return p.id !== id; }); list.unshift(project);
    localStorage.setItem(PROJECT_STORE, JSON.stringify(list));
    activeProjectId = id;
    projectNotice('Project saved in this browser.', false);
  } catch(e) { projectNotice('Couldn’t save. Browser storage may be full or unavailable. Your map is still here.', true); }
}
function renderProjects(){
  var box = $('projectlist'); box.replaceChildren();
  try {
    var list = readProjects().sort(function(a,b){ return b.savedAt.localeCompare(a.savedAt); });
    if (!list.length) { box.innerHTML = '<p class="ob-empty">No projects saved yet. Let\'s try a question together and save it!</p>'; return; }
    list.forEach(function(p){
      var card = document.createElement('article'); card.className = 'project-card';
      var open = document.createElement('button'); open.type = 'button'; open.className = 'project-main';
      var title = document.createElement('span'); title.className = 'project-title'; title.textContent = p.question;
      var date = document.createElement('time'); date.dateTime = p.savedAt;
      date.textContent = 'Saved ' + new Date(p.savedAt).toLocaleString('en-SG', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
      var hint = document.createElement('span'); hint.className = 'project-open'; hint.textContent = 'Open project ↗';
      open.append(title, date, hint); open.addEventListener('click', function(){ openProject(p.id); });
      var actions = document.createElement('div'); actions.className = 'project-actions';
      [['PDF / Print', printProject], ['Project backup (.json)', exportProjectJSON], ['Delete project', deleteProject]].forEach(function(action, i){
        var button = document.createElement('button'); button.type = 'button';
        button.className = 'btn project-action'; button.textContent = action[0];
        button.addEventListener('click', function(){ action[1](p.id); }); actions.appendChild(button);
      });
      card.append(open, actions); box.appendChild(card);
    });
  } catch(e) { box.innerHTML = '<p class="ob-empty" role="alert">Saved projects couldn’t be read from this browser.</p>'; }
}
function openProject(id){
  try {
    var p = readProjects().find(function(x){ return x.id === id; });
    if (!p || p.version !== 1 || !p.state || !Array.isArray(p.state.nodes)) throw new Error('Invalid project');
    var state = prepareProjectState(p.state);
    /* Merge saved folder definitions so older projects retain their colours. */
    (p.folders || []).forEach(function(c){ if (!OB_CATS.some(function(x){ return x.id === c.id; })) OB_CATS.push(c); });
    (p.articles || []).forEach(function(a){ if (!OB_SAVED.some(function(x){ return a.artId ? x.artId === a.artId : x.t === a.t && x.cat === a.cat; })) OB_SAVED.push(a); });
    document.body.classList.remove('onb');
    mapZoom = clamp(Number(p.zoom) || 1, ZMIN, ZMAX);
    document.documentElement.style.setProperty('--mapzoom', mapZoom); syncZoomLabel();
    restoringProject = true;
    try { setQuestion(p.question, state); } finally { restoringProject = false; }
    activeProjectId = p.id; $('esq').value = p.searchText || ''; renderSearch();
    resolveArticleLinks(state.arts || [], state, function(){ return S === state; }, function(){ renderRows(); renderWires(); });
    searchesOf(state).forEach(function(search){
      if (Array.isArray(search.items)) resolveArticleLinks(search.items, state,
        function(){ return S === state && searchesOf(S).indexOf(search) >= 0; },
        function(){ renderSearch(); renderWires(); });
    });
    requestAnimationFrame(function(){
      if (S !== state) return;
      var clarification = $('say').querySelector('.clarin');
      if (clarification) clarification.value = p.clarificationDraft || '';
      window.scrollTo(p.scroll ? p.scroll.x : 0, p.scroll ? p.scroll.y : 0); follow();
    });
  } catch(e) { $('projectlist').insertAdjacentHTML('afterbegin', '<p class="ob-empty" role="alert">This project couldn’t be opened. Its saved copy has been kept.</p>'); }
}
$('saveproject').addEventListener('click', saveProject);
/* Saving should not blur a field and start another AI request. Input events
   already keep the map state current, including contenteditable summaries. */
$('saveproject').addEventListener('pointerdown', function(e){ e.preventDefault(); });
