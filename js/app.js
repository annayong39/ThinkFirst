/* =====================================================================
   ThinkFirst — APP START
   ---------------------------------------------------------------------
   Loaded last. Shows the start page and connects Thinky to OpenAI
   if an API key is saved in Settings.
   ===================================================================== */

/* Connect (or disconnect) Thinky. Runs on load and whenever the key changes. */
function connectAI() {
  if (TFAI.ready()) {
    sample = TFAI; live = true;
    /* fill in anything that was waiting for the AI */
    of('term').forEach(function (t) { if (!t.guide || t.guide.status === 'offline') { t.guide = null; fetchGuide(t); } });
    of('term').forEach(function (t) { if (t.status === 'offline') { t.status = 'draft'; t.lastSent = ''; } });
    if (S.chunkStatus === 'error') S.chunkStatus = 'idle';
    fetchChunks();
    if (S.sel.length) prefetch();
  } else {
    sample = null; live = false;
    of('term').forEach(function (t) { if (!t.guide || t.guide.status !== 'ready') t.guide = { status: 'offline' }; });
  }
  renderAll();
  if (document.body.classList.contains('onb')) renderMull();
}

TFSettings.onChange(function (key) {
  if (key === 'apiKey') connectAI();
  if (key === 'fontSize') { syncZoomLabel(); requestAnimationFrame(follow); }
});

setQuestion(DEFAULT_Q);   /* a sample question sits behind the start page */
showOnboard();
connectAI();
