/* =====================================================================
   ThinkFirst — SETTINGS
   ---------------------------------------------------------------------
   The gear icon (top right) opens this menu. Everything is saved in
   this browser only (localStorage), never sent anywhere except the
   API key, which goes to OpenAI with each request.

   Settings:
     apiKey    the student's / your OpenAI API key
     model     which OpenAI model Thinky uses
     theme     'system' | 'light' | 'dark'
     fontSize  'small' | 'default' | 'large' | 'xlarge'

   Other files use:
     TFSettings.get('apiKey')        read one setting
     TFSettings.scale()              the font-size multiplier (e.g. 1.12)
     TFSettings.onChange(fn)         run fn(key) whenever a setting changes
   ===================================================================== */

var DEFAULT_MODEL = 'gpt-5-mini';
var FONT_SCALES = { small: 0.9, default: 1, large: 1.12, xlarge: 1.25 };

var TFSettings = (function () {
  var STORE = 'tf-settings';
  var data = { apiKey: '', model: DEFAULT_MODEL, theme: 'system', fontSize: 'default' };
  var listeners = [];

  try { Object.assign(data, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) {}

  function save() { try { localStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {} }
  function get(key) { return data[key]; }
  function set(key, value) {
    if (data[key] === value) return;
    data[key] = value; save(); apply();
    listeners.forEach(function (fn) { fn(key); });
  }
  function scale() { return FONT_SCALES[data.fontSize] || 1; }

  /* theme + font size take effect on the whole page */
  function apply() {
    var root = document.documentElement;
    if (data.theme === 'light' || data.theme === 'dark') root.setAttribute('data-theme', data.theme);
    else root.removeAttribute('data-theme');
    root.style.setProperty('--ui-scale', scale());
    var dot = document.getElementById('setdot');
    if (dot) dot.hidden = !!data.apiKey;
  }

  return { get: get, set: set, scale: scale, apply: apply, onChange: function (fn) { listeners.push(fn); } };
})();
TFSettings.apply();

/* ---------- the menu itself ---------- */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var btn = $('setbtn'), pop = $('setpop'), form = $('setform');

  function fill() {
    $('setkey').value = TFSettings.get('apiKey') || '';
    $('setmodel').value = TFSettings.get('model') || DEFAULT_MODEL;
    form.querySelectorAll('input[name="settheme"]').forEach(function (r) { r.checked = r.value === TFSettings.get('theme'); });
    form.querySelectorAll('input[name="setfont"]').forEach(function (r) { r.checked = r.value === TFSettings.get('fontSize'); });
    $('setmsg').textContent = '';
    $('setkey').type = 'password'; $('setshow').textContent = 'Show';
  }
  function open() { fill(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); $('setkey').focus(); }
  function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }

  btn.addEventListener('click', function () { if (pop.hidden) open(); else close(); });
  $('setdim').addEventListener('click', close);
  $('setclose').addEventListener('click', close);
  pop.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); close(); } });

  /* theme and font size apply as soon as you pick them */
  form.addEventListener('change', function (e) {
    if (e.target.name === 'settheme') TFSettings.set('theme', e.target.value);
    if (e.target.name === 'setfont') TFSettings.set('fontSize', e.target.value);
  });
  $('setshow').addEventListener('click', function () {
    var k = $('setkey'); var show = k.type === 'password';
    k.type = show ? 'text' : 'password'; this.textContent = show ? 'Hide' : 'Show';
  });
  $('setclear').addEventListener('click', function () {
    $('setkey').value = ''; TFSettings.set('apiKey', '');
    $('setmsg').textContent = 'Key removed from this browser.';
  });
  /* the key and model are saved with the Save button */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var key = $('setkey').value.trim(), model = $('setmodel').value.trim() || DEFAULT_MODEL;
    if (key && !/^sk-/.test(key)) { $('setmsg').textContent = 'That doesn’t look like an OpenAI key. They start with “sk-”.'; $('setkey').focus(); return; }
    TFSettings.set('model', model);
    TFSettings.set('apiKey', key);
    $('setmsg').textContent = key ? 'Saved. Thinky is connecting…' : 'Saved. Without a key, Thinky stays hidden.';
    if (key) {
      TFAI.test().then(function () { $('setmsg').textContent = 'Connected. Thinky is ready.'; },
        function (err) { $('setmsg').textContent = TFAI.explain(err); });
    }
  });
})();
