/* =====================================================================
   ThinkFirst — THINKY: the mascot drawings
   ---------------------------------------------------------------------
   mullSvg(mood) draws Thinky with a face for each mood.
   Where Thinky moves and what it says is in render.js (renderMull, positionMull).
   ===================================================================== */

/* ---------- Thinky ---------- */
function mullSvg(mood){
  var body = '<g transform="scale(.8333)"><rect x="84" y="44" width="22" height="16" rx="8" fill="#fdee75"/><rect x="84" y="66" width="22" height="16" rx="8" fill="#9edabe"/><path d="M27 28 H93 L91 111 Q91 116 86 116 H34 Q29 116 29 111 Z" fill="var(--mull-body)" stroke="var(--mull-line)" stroke-width="1.5"/><rect x="24" y="14" width="72" height="18" rx="9" fill="var(--mull-line)"/><path d="M44 78 H76 M44 87 H74 M46 96 H72" fill="none" stroke="var(--mull-line)" stroke-width="2.6" stroke-linecap="round"/></g>';
  var FACES = {
    listening: '<circle cx="40" cy="56" r="4" fill="var(--mull-ink)"/><circle cx="60" cy="56" r="4" fill="var(--mull-ink)"/><circle cx="41.3" cy="53.6" r="1.2" fill="#fff"/><circle cx="61.3" cy="53.6" r="1.2" fill="#fff"/><path d="M44 66 Q50 70 56 66" fill="none" stroke="var(--mull-ink)" stroke-width="2.5" stroke-linecap="round"/>',
    thinking: '<circle cx="43" cy="52" r="4" fill="var(--mull-ink)"/><circle cx="63" cy="52" r="4" fill="var(--mull-ink)"/><circle cx="44.2" cy="50.8" r="1.1" fill="#fff"/><circle cx="64.2" cy="50.8" r="1.1" fill="#fff"/><path d="M35 44 Q41 41 47 44" fill="none" stroke="var(--mull-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M54 42 Q60 39 66 42" fill="none" stroke="var(--mull-ink)" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="52" cy="68" rx="3" ry="2.6" fill="var(--mull-ink)"/><circle cx="83" cy="30" r="2.3" fill="var(--mull-line)"/><circle cx="89" cy="23" r="3" fill="var(--mull-line)"/><circle cx="95" cy="14" r="3.8" fill="var(--mull-line)"/>',
    curious: '<circle cx="40" cy="56" r="4" fill="var(--mull-ink)"/><circle cx="60" cy="55" r="4.4" fill="var(--mull-ink)"/><circle cx="41.3" cy="53.6" r="1.2" fill="#fff"/><circle cx="61.3" cy="53.6" r="1.2" fill="#fff"/><path d="M34 47 Q40 45 46 47" fill="none" stroke="var(--mull-ink)" stroke-width="2.3" stroke-linecap="round"/><path d="M54 43 Q60 37 66 41" fill="none" stroke="var(--mull-ink)" stroke-width="2.3" stroke-linecap="round"/><path d="M45 67 Q50 69 55 66.5" fill="none" stroke="var(--mull-ink)" stroke-width="2.5" stroke-linecap="round"/><text x="80" y="36" font-size="20" font-weight="700" font-family="DM Sans,sans-serif" fill="var(--mull-line)">?</text>',
    pleased: '<path d="M35 57 Q40 51 45 57" fill="none" stroke="var(--mull-ink)" stroke-width="3" stroke-linecap="round"/><path d="M55 57 Q60 51 65 57" fill="none" stroke="var(--mull-ink)" stroke-width="3" stroke-linecap="round"/><path d="M42 65 Q50 73 58 65" fill="none" stroke="var(--mull-ink)" stroke-width="2.8" stroke-linecap="round"/>',
    wow: '<path d="M40.0 48.0 L42.1 52.9 L47.0 55.0 L42.1 57.1 L40.0 62.0 L37.9 57.1 L33.0 55.0 L37.9 52.9 Z" fill="#e9c75a" stroke="var(--mull-ink)" stroke-width="1"/><path d="M60.0 48.0 L62.1 52.9 L67.0 55.0 L62.1 57.1 L60.0 62.0 L57.9 57.1 L53.0 55.0 L57.9 52.9 Z" fill="#e9c75a" stroke="var(--mull-ink)" stroke-width="1"/><path d="M42 64 Q50 76 58 64 Z" fill="var(--mull-ink)"/><path d="M86 24 L88 30 L94 32 L88 34 L86 40 L84 34 L78 32 L84 30 Z" fill="#e9c75a"/>',
    cheer: '<path d="M34 56 Q40 49 46 56" fill="none" stroke="var(--mull-ink)" stroke-width="3" stroke-linecap="round"/><path d="M54 56 Q60 49 66 56" fill="none" stroke="var(--mull-ink)" stroke-width="3" stroke-linecap="round"/><path d="M40 63 Q50 79 60 63 Z" fill="var(--mull-ink)"/><path d="M45 69 Q50 73 55 69" fill="#efa9b8"/><path d="M86 24 L88 30 L94 32 L88 34 L86 40 L84 34 L78 32 L84 30 Z" fill="#e9c75a"/><path d="M14 26 L15.5 30 L19.5 31.5 L15.5 33 L14 37 L12.5 33 L8.5 31.5 L12.5 30 Z" fill="#e9c75a"/>',
    oops: '<circle cx="40" cy="56" r="3.6" fill="var(--mull-ink)"/><circle cx="60" cy="56" r="3.6" fill="var(--mull-ink)"/><path d="M34 47 Q39 45 45 49" fill="none" stroke="var(--mull-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M55 49 Q61 45 66 47" fill="none" stroke="var(--mull-ink)" stroke-width="2.2" stroke-linecap="round"/><path d="M43 68 Q46.5 65 50 68 Q53.5 71 57 68" fill="none" stroke="var(--mull-ink)" stroke-width="2.4" stroke-linecap="round"/><path d="M76 38 Q80 46 76 49 Q72 46 76 38 Z" fill="#9fd0ec" stroke="#5f97b8" stroke-width="1"/>'
  };
  var face = FACES[mood] || ('<circle cx="40" cy="55" r="4" fill="var(--mull-ink)"/><circle cx="60" cy="55" r="4" fill="var(--mull-ink)"/><path d="M43 65 Q50 71 57 65" fill="none" stroke="var(--mull-ink)" stroke-width="2.5" stroke-linecap="round"/>');
  return '<svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">' + body + '<g transform="translate(50 45) scale(.78) translate(-50 -56)">' + face + '</g></svg>';
}
function plantSvg(n){
  var s = '<svg viewBox="0 0 30 30" width="28" height="28"><path d="M8 26h14" stroke="#9b8466" stroke-width="3" stroke-linecap="round"/>';
  if (n >= 15) s += '<path d="M15 25V' + (n >= 120 ? 8 : n >= 50 ? 11 : 16) + '" stroke="#6f8d60" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="11" cy="17" rx="4" ry="2.3" fill="#9cb98b" transform="rotate(-25 11 17)"/>';
  else s += '<circle cx="15" cy="23" r="2.5" fill="#b4cc9f"/>';
  if (n >= 50) s += '<ellipse cx="19.5" cy="13" rx="4.5" ry="2.5" fill="#b4cc9f" transform="rotate(25 19.5 13)"/>';
  if (n >= 120) s += '<circle cx="15" cy="6.5" r="3.5" fill="#e9c75a"/>';
  return s + '</svg>';
}
