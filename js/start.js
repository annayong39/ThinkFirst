/* =====================================================================
   ThinkFirst — START PAGE: question box + saved-example folders
   ---------------------------------------------------------------------
   The first screen: type a GP question, browse saved examples by topic,
   add your own topic folders (saved in this browser).
   ===================================================================== */

/* ---------- onboarding (added) ---------- */
var OB_CATS = [
  { id:'media', label:'Media & Technology' },
  { id:'politics', label:'Politics & Governance' },
  { id:'science', label:'Science & Environment' },
  { id:'society', label:'Society & Values' },
  { id:'arts', label:'Arts & Culture' }
];
/* Sample saves for the prototype. In the real app these come from the student's saved Evidence cards. */
var OB_SAVED = [
  { cat:'media', t:'POFMA (Singapore, 2019)', key:'POFMA', url:'https://globalvoices.org/2019/05/15/singapore-parliament-approves-anti-fake-news-law-will-this-curtail-free-speech/', note:'Law that lets the government order corrections to online falsehoods. Shows politicians can still shape what spreads online, so social media is not beyond their reach.', from:'Social media has more influence than politicians. Discuss.', when:'2 days ago' },
  { cat:'media', t:'Australia’s under-16 social media ban', key:'under-16', url:'https://abcnews.go.com/US/wireStory/australias-house-representatives-passes-bill-banning-children-younger-116257823', note:'Passed in late 2024: platforms must keep under-16s off. Lawmakers deciding how young people use platforms, not the other way round.', from:'Social media has more influence than politicians. Discuss.', when:'2 days ago' },
  { cat:'media', t:'TikTok trends shaping what teens buy', key:'TikTok', url:'https://www.news4jax.com/business/2021/10/13/as-seen-on-tiktok-is-the-new-as-seen-on-tv/', note:'My own feed: products going viral overnight. Influence on habits, but is that the same as political influence?', from:'Social media has more influence than politicians. Discuss.', when:'Last week' },
  { cat:'politics', t:'Singapore’s GE campaigning online', key:'online', url:'https://www.malaymail.com/news/singapore/2025/05/01/why-podcasts-are-becoming-singapore-politicians-favourite-platform-for-ge2025-campaigns/175226', note:'Parties now run podcasts and short videos. Politicians using social media themselves, so it is not either/or.', from:'Social media has more influence than politicians. Discuss.', when:'Last week' },
  { cat:'science', t:'Paris Agreement (2015)', key:'Paris Agreement', url:'https://unfccc.int/process-and-meetings/the-paris-agreement', note:'Countries agreed to limit warming. Good for “governments can act together”, but targets are not legally forced.', from:'How far should individuals be responsible for tackling climate change?', when:'3 weeks ago' },
  { cat:'science', t:'Singapore’s carbon tax', key:'carbon tax', url:'https://www.asiafinancial.com/singapore-to-raise-its-carbon-tax-500-in-2024', note:'Introduced in 2019 and set to rise over time. Example of a state pushing behaviour through price instead of asking individuals.', from:'How far should individuals be responsible for tackling climate change?', when:'3 weeks ago' },
  { cat:'society', t:'Ageing population in Singapore', key:'Ageing', url:'https://www.asianews.it/news-en/Singapore-increasingly-resigned-to-demographic-winter-58014.html', note:'Fewer working adults per elderly person. Useful for questions on family vs state responsibility.', from:'Is it the responsibility of the family to care for the elderly?', when:'Last month' },
  { cat:'arts', t:'National Gallery Singapore (opened 2015)', key:'National Gallery', url:'https://www.malaymail.com/news/life/2015/11/24/singapore-opens-s532m-national-gallery/1010991', note:'State-funded arts space. Shows government valuing the arts, but who decides what gets shown?', from:'Should the arts be funded by the state?', when:'Last month' }
];
var obOpen = 'media', obFresh = null;
/* topics the student adds get the next colour from this list (front, back) */
var OB_NEW_COLOURS = [['#f6c4d4','#e59bb3'],['#a9dcdc','#7dc2c2'],['#e8d6b2','#d0b98b'],['#bfc8f3','#98a4e1'],['#d6e8a4','#b4d077'],['#f3cfa0','#e0ae6c']];
try { localStorage.removeItem('tf-topics'); } catch(e){} /* clears the test folders added earlier */
try { (JSON.parse(localStorage.getItem('tf-topics2') || '[]') || []).forEach(function(t){ if (t && t.id && t.label) OB_CATS.push(t); }); } catch(e){}
function openTopicPop(){ $('obtopic').value = ''; $('obtopicerr').textContent = ''; $('obpop').hidden = false; setTimeout(function(){ $('obtopic').focus(); }, 30); }
function closeTopicPop(){ $('obpop').hidden = true; $('obadd').focus(); }
function addTopic(){
  var name = $('obtopic').value.replace(/\s+/g, ' ').trim();
  if (!name) { $('obtopicerr').textContent = 'Type a topic name first.'; $('obtopic').focus(); return; }
  if (OB_CATS.some(function(c){ return c.label.toLowerCase() === name.toLowerCase(); })) { $('obtopicerr').textContent = 'You already have a folder called that.'; $('obtopic').focus(); return; }
  var added = OB_CATS.filter(function(c){ return c.user; }).length, col = OB_NEW_COLOURS[added % OB_NEW_COLOURS.length];
  var t = { id: 'u' + Date.now().toString(36), label: name, f: col[0], b: col[1], user: true };
  OB_CATS.push(t);
  try { localStorage.setItem('tf-topics2', JSON.stringify(OB_CATS.filter(function(c){ return c.user; }))); } catch(e){}
  $('obpop').hidden = true;
  obOpen = t.id; obFresh = t.id; renderOnboard(); obFresh = null;
  var f = document.querySelector('.sv-folder[data-cat="' + t.id + '"]'); if (f) { f.focus(); f.scrollIntoView({block:'nearest', behavior:'smooth'}); }
}
function obPlural(n){ return n + (n === 1 ? ' note' : ' notes'); }
function obHost(u){ try { return new URL(u).hostname.replace(/^www\./,''); } catch(e){ return 'source'; } }
function obTitle(x){ var t = esc(x.t), k = esc(x.key || ''); return k && t.indexOf(k) >= 0 ? t.replace(k, '<mark>' + k + '</mark>') : t; }
function renderOnboard(){
  /* shelf: one folder per topic; the open one tips its flap and its papers rise */
  $('obshelf').innerHTML = OB_CATS.map(function(c){
    var n = OB_SAVED.filter(function(x){ return x.cat === c.id; }).length, sheets = '', on = obOpen === c.id;
    for (var k = 1; k <= Math.min(3, n); k++) sheets += '<span class="sheet s' + k + '"></span>';
    return '<button type="button" class="sv-folder sv-t-' + c.id + (on ? ' open' : '') + (c.id === obFresh ? ' fresh' : '') + '"' + (c.f ? ' style="--f:' + c.f + ';--b:' + c.b + '"' : '') + ' data-cat="' + c.id + '" aria-expanded="' + on + '" aria-controls="obdrawer"><span class="back"></span>' + sheets +
      '<span class="front"><span class="name">' + esc(c.label) + '</span><span class="count">' + obPlural(n) + '</span></span></button>';
  }).join('');
  renderDrawer();
}
function renderDrawer(){
  Array.prototype.forEach.call($('obshelf').children, function(f){ var on = f.getAttribute('data-cat') === obOpen; f.classList.toggle('open', on); f.setAttribute('aria-expanded', String(on)); });
  var d = $('obdrawer');
  if (!obOpen) { d.hidden = true; d.innerHTML = ''; return; }
  var c = OB_CATS.filter(function(x){ return x.id === obOpen; })[0], list = OB_SAVED.filter(function(x){ return x.cat === obOpen; });
  d.hidden = false; d.className = 'sv-drawer sv-t-' + obOpen; d.style.cssText = c.f ? '--f:' + c.f + ';--b:' + c.b : '';
  d.innerHTML = '<div class="dh"><h3>' + esc(c.label) + '</h3><span>' + (list.length ? obPlural(list.length) + ' · tap a note to read the article' : 'No notes yet') + '</span></div>' +
    (list.length ? '<div class="sv-notes">' + list.map(function(x, i){
      var url = x.artId && !x.verified ? '' : directArticleUrl(x.url);
      return '<a class="sv-note" href="' + esc(url || articleSearchUrl(x.t, x.source)) + '" target="_blank" rel="noopener noreferrer" style="animation-delay:' + (i * 70) + 'ms">' +
        '<h4>' + obTitle(x) + '</h4><p class="sum">' + esc(x.note) + '</p>' +
        '<div class="meta"><span>Saved ' + esc(x.when.charAt(0).toLowerCase() + x.when.slice(1)) + '</span><span>From “' + esc(x.from.replace(/\.$/, '')) + '”</span></div>' +
        '<div class="go"><span>Read on ' + esc(x.source || (url ? obHost(url) : 'article')) + '</span><span aria-hidden="true">↗</span></div></a>';
    }).join('') + '</div>' : '<div class="ob-empty">Nothing saved here yet. Examples you add in Evidence will show up here.</div>');
}

function showOnboard(){
  document.body.classList.add('onb'); syncZoomLabel();
  S.focus = null; S.mullAt = null; S.mood = 'listening';
  S.say = SAYS.hello;
  renderOnboard(); renderProjects(); renderMull();
  window.scrollTo(0, 0);
}
function startFromOnboard(){
  var q = $('obq').value.replace(/\s+/g, ' ').trim();
  if (wc(q) < 4) { $('oberr').textContent = 'Write the full question first (at least a few words).'; $('obq').focus(); return; }
  $('oberr').textContent = '';
  document.body.classList.remove('onb'); syncZoomLabel();
  setQuestion(q);
  window.scrollTo(0, 0);
  requestAnimationFrame(function(){ follow(); });
}
$('obgo').addEventListener('click', startFromOnboard);
$('obq').addEventListener('keydown', function(e){ if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startFromOnboard(); } });
$('obq').addEventListener('input', function(){ $('oberr').textContent = ''; });
$('obtry').addEventListener('click', function(){ $('obq').value = DEFAULT_Q + '.'; $('obq').focus(); });
$('obadd').addEventListener('click', openTopicPop);
$('obpopcancel').addEventListener('click', closeTopicPop);
$('obpopdim').addEventListener('click', closeTopicPop);
$('obpopform').addEventListener('submit', function(e){ e.preventDefault(); addTopic(); });
$('obpopform').addEventListener('keydown', function(e){ if (e.key === 'Escape') { e.preventDefault(); closeTopicPop(); } });
$('obshelf').addEventListener('click', function(e){ var f = e.target.closest('.sv-folder'); if (!f) return; var c = f.getAttribute('data-cat'); obOpen = obOpen === c ? null : c; renderDrawer(); });
$('brand').addEventListener('click', showOnboard);
$('brand').addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showOnboard(); } });
