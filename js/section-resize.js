/* Drag the Evidence/Argue boundary without covering visible Evidence cards. */
(function(){
  var argue = document.querySelector('.layer[aria-labelledby="l3"]');
  var evidence = document.querySelector('.layer[aria-labelledby="l2"]');
  var handle = $('section-resize-handle');
  var drag = null;
  var DEFAULT_MARGIN = 56;
  var CONTENT_GAP = 36;

  function scale(){ return evidence.getBoundingClientRect().width / evidence.offsetWidth || 1; }
  function margin(){ return parseFloat(getComputedStyle(argue).marginTop) || 0; }
  function lastEvidenceBottom(){
    var bottom = evidence.getBoundingClientRect().top;
    evidence.querySelectorAll('.evnote, .artcard, #row-evidence .nw, .search-board:not(.bare), #evidence-finish:not([hidden])').forEach(function(el){
      if (el.getClientRects().length) bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    });
    return bottom;
  }
  function setMargin(value){
    argue.style.marginTop = Math.min(500, Math.max(-2500, value)) + 'px';
    window.clampArgueBoundary();
    follow();
  }
  window.clampArgueBoundary = function(){
    if (!argue.getClientRects().length || !evidence.getClientRects().length) return;
    var top = argue.getBoundingClientRect().top;
    var minimum = lastEvidenceBottom() + CONTENT_GAP * scale();
    if (top < minimum) argue.style.marginTop = (margin() + (minimum - top) / scale()) + 'px';
  };
  handle.addEventListener('pointerdown', function(e){
    if (e.button !== 0) return;
    e.preventDefault();
    drag = { id:e.pointerId, y:e.clientY, margin:margin() };
    handle.classList.add('dragging');
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener('pointermove', function(e){
    if (!drag || e.pointerId !== drag.id) return;
    setMargin(drag.margin + (e.clientY - drag.y) / scale());
  });
  function stop(e){
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    handle.classList.remove('dragging');
    if (handle.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
  }
  handle.addEventListener('pointerup', stop);
  handle.addEventListener('pointercancel', stop);
  handle.addEventListener('dblclick', function(){ setMargin(DEFAULT_MARGIN); });
  handle.addEventListener('keydown', function(e){
    if (e.key === 'Home') { e.preventDefault(); setMargin(DEFAULT_MARGIN); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    setMargin(margin() + (e.key === 'ArrowUp' ? -1 : 1) * (e.shiftKey ? 48 : 16));
  });
})();
