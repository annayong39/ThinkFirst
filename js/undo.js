/* Undo for completed map actions. While an editor has focus, the browser keeps
   its finer-grained text undo; leaving the editor commits one map undo step. */
var undoStack = [], undoing = false;
function clearUndo(){ undoStack = []; }
function isTextEditor(target){ return !!(target && (target.matches('textarea,input,[contenteditable="true"]') || target.closest('[contenteditable="true"]'))); }
function blurTextEditor(){ if (isTextEditor(document.activeElement)) document.activeElement.blur(); }
function recordUndo(restore){
  if (undoing || !S || typeof restore !== 'function') return;
  undoStack.push({ state: S, restore: restore });
  if (undoStack.length > 50) undoStack.shift();
}
function undoLastAction(){
  while (undoStack.length && undoStack[undoStack.length - 1].state !== S) undoStack.pop();
  var action = undoStack.pop();
  if (!action) return false;
  undoing = true;
  try { action.restore(); } finally { undoing = false; }
  return true;
}
document.addEventListener('keydown', function(e){
  if (e.key.toLowerCase() !== 'z' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
  if (document.body.classList.contains('onb') || isTextEditor(document.activeElement)) return;
  if (undoLastAction()) e.preventDefault();
});
