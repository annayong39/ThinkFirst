const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const storage = new Map();
function environment() {
  const elements = new Map(), frames = [], timers = [];
  function element() { return { value:'', textContent:'', children:[], classList:{toggle(){},remove(){}},
    addEventListener(){}, click(){}, remove(){}, querySelector(){return null;}, replaceChildren(){this.children=[];}, append(...x){this.children.push(...x);},
    appendChild(x){this.children.push(x);}, insertAdjacentHTML(){}, style:{setProperty(){}} }; }
  const c = { console, crypto:require('node:crypto').webcrypto, Date, Blob, Node:class {},
    document:{getElementById(id){if(!elements.has(id)) elements.set(id,element());return elements.get(id);},
      createElement:element,body:element(),documentElement:element()},
    localStorage:{getItem(k){return storage.get(k)||null;},setItem(k,v){storage.set(k,v);}},
    setTimeout(fn){timers.push(fn);return timers.length;},clearTimeout(){},
    requestAnimationFrame(fn){frames.push(fn);}, scrollX:12,scrollY:300,
    SAYS:{yourTurn:'Start'}, ZMIN:.4,ZMAX:1.6, OB_CATS:[{id:'custom',label:'My topic',f:'#abc',b:'#def'}],
    OB_SAVED:[], syncZoomLabel(){},renderSearch(){},follow(){},resolveArticleLinks(){},
    setQuestion(q,s){c.S=s;},matchMedia(){return {matches:false};} };
  c.window=c;c.scrollTo=(x,y)=>{c.restoredScroll={x,y};};
  c.alert=message=>{c.lastAlert=message;};c.confirm=()=>false;
  c.URL=class extends URL { static createObjectURL(blob){c.downloadBlob=blob;return 'blob:test';} static revokeObjectURL(){} };
  vm.createContext(c);
  for(const p of ['js/core.js','js/projects.js','js/project-export.js','js/project-print.js']) vm.runInContext(fs.readFileSync(p,'utf8'),c);
  return {c,frames,timers};
}
(async function(){
  let {c}=environment();
  c.S=c.fresh('Should technology shape education?');
  Object.assign(c.S,{sel:[1],evOpen:true,revealed:true,sec:'evidence',dismissed:['education'],
    nodes:[{id:1,kind:'term',text:'',status:'done',summary:'My scope',wtype:'CONCEPT',dx:120,dy:30,
      guide:{status:'ready',meaning:'Definition',decisions:['What counts?']},
      talk:[{q:'What counts?',a:'Schools and universities'}],clar:{items:[{ask:'Explain',reply:'Think about scope'}]}},
      {id:2,kind:'evidence',text:'My example',status:'done',links:[1],ai:{heard:'My example',questions:[]},thread:[],replies:{}}],
    arts:[{id:'a1',title:'Article',saved:'custom',dx:50}],
    notes:[{id:'n1',text:'A point',x:100,y:200,links:['A:a1','E:2','N:n2']},
      {id:'n2',text:'A related point',x:300,y:260,links:[]}],
    search:{q:'education',status:'ready',items:[{id:'s1',title:'Search result'}]}});
  c.S.noteTarget=new c.Node();c.mapZoom=.85;c.$('esq').value='education';
  c.saveProject();
  let saved=JSON.parse(storage.get('tf-projects'));
  assert.equal(saved.length,1);assert.equal(saved[0].state.noteTarget,undefined);
  assert.equal(saved[0].state.nodes[0].summary,'My scope');
  const id=saved[0].id;
  c.S.nodes[0].summary='Edited scope';c.saveProject();
  saved=JSON.parse(storage.get('tf-projects'));
  assert.equal(saved.length,1);assert.equal(saved[0].id,id);assert.equal(saved[0].state.nodes[0].summary,'Edited scope');
  // A fresh JS session reads the same persisted project, including its layout.
  const reloaded=environment();c=reloaded.c;c.openProject(id);reloaded.frames.forEach(fn=>fn());
  assert.equal(c.S.nodes[0].summary,'Edited scope');assert.equal(c.S.notes[0].links[1],'E:2');assert.equal(c.S.notes[0].links[2],'N:n2');
  assert.equal(c.S.searches.length,1);assert.equal(c.S.searches[0].q,'education');
  assert.equal(c.S.nodes[0].dx,120);assert.equal(c.S.arts[0].saved,'custom');assert.equal(c.mapZoom,.85);
  assert.equal(c.$('esq').value,'education');assert.equal(c.restoredScroll.y,300);assert.equal(c.activeProjectId,id);
  c.renderProjects();assert.equal(c.$('projectlist').children.length,1);
  assert.equal(c.$('projectlist').children[0].children[1].children.length,3);
  // Export reads the saved record, even if the current map has changed.
  c.S.nodes[0].summary='Unsaved edit';c.exportProjectJSON(id);
  const backup=JSON.parse(await c.downloadBlob.text());
  assert.equal(backup.state.nodes[0].summary,'Edited scope');
  assert.equal(backup.state.notes[0].links[0],'A:a1');assert.equal(backup.apiKey,undefined);
  backup.state.arts[0].source='Example News';backup.state.arts[0].url='https://example.com/article';backup.state.arts[0].verified=true;
  backup.state.topicSentences=[
    {text:'First distinct claim',evidence:[{key:'A:a1',kind:'article',text:'Article'}]},
    {text:'Second distinct claim',evidence:[{key:'E:2',kind:'own',text:'My example'}]},
    {text:'Third distinct claim',evidence:[]}];
  backup.state.finalStand='My considered position';
  const print=c.projectPrintHTML(backup);
  for(const content of ['Edited scope','My example','Article','Search result','A point','First distinct claim','Second distinct claim','Third distinct claim','My considered position','Notes and connections','size:A4 portrait']) assert.ok(print.includes(content),content);
  assert.ok(!print.includes('Schools and universities'));
  assert.ok(!print.includes('Think about scope'));
  assert.match(print,/href="https:\/\/example\.com\/article"/);
  assert.match(print,/Note 1|class="connection-note"/);
  const multiple=JSON.parse(JSON.stringify(backup));
  multiple.state.searches=[{q:'first search',status:'ready',items:[{id:'s-first',title:'First result',summary:'First summary'}]},
    {q:'second search',status:'ready',items:[{id:'s-second',title:'Second result',summary:'Second summary'}]}];
  delete multiple.state.search;
  const multiPrint=c.projectPrintHTML(multiple);
  for(const content of ['First result','Second result']) assert.ok(multiPrint.includes(content),content);
  const unsafe=JSON.parse(JSON.stringify(backup));unsafe.question='<script>alert(1)</script>';unsafe.state.arts[0].url='javascript:alert(1)';
  const safe=c.projectPrintHTML(unsafe);assert.ok(safe.includes('&lt;script&gt;'));assert.ok(!safe.includes('<script>'));assert.ok(!safe.includes('href="javascript:'));
  c.open=()=>null;c.printProject(id);assert.match(c.lastAlert,/allow pop-ups/);
  let printed=0,written='';const printTimers=[];
  c.open=()=>({document:{open(){},write(html){written=html;},close(){},getElementById(){return {addEventListener(){}};}},setTimeout(fn){printTimers.push(fn);},focus(){},print(){printed++;}});
  c.printProject(id);printTimers.forEach(fn=>fn());assert.equal(printed,1);assert.ok(written.includes('Edited scope'));
  const savedBeforeDelete=storage.get('tf-projects');c.deleteProject(id);assert.equal(storage.get('tf-projects'),savedBeforeDelete);
  c.confirm=()=>true;c.deleteProject(id);assert.equal(JSON.parse(storage.get('tf-projects')).length,0);assert.equal(c.activeProjectId,null);
  storage.set('tf-projects',savedBeforeDelete);
  c.activeProjectId=null;c.S=c.fresh('Another question');c.S.searches=multiple.state.searches;c.saveProject();
  assert.equal(JSON.parse(storage.get('tf-projects')).length,2);
  const multiId=JSON.parse(storage.get('tf-projects'))[0].id;c.openProject(multiId);
  assert.equal(c.S.searches.length,2);assert.equal(c.S.searches[1].items[0].title,'Second result');
  const pending=c.fresh('Pending question');pending.thinking=true;pending.artStatus='loading';
  pending.nodes=[{asking:true,status:'reading',talk:[{q:'Why?',a:'My unfinished answer'}],guide:{status:'loading'}}];
  const ready=c.prepareProjectState(pending);
  assert.equal(ready.nodes[0].boundary,'My unfinished answer');assert.equal(ready.nodes[0].talk[0].a,null);
  assert.equal(ready.nodes[0].status,'error');assert.equal(ready.artStatus,'error');assert.equal(ready.thinking,false);
  const before=storage.get('tf-projects');c.localStorage.setItem=()=>{throw Error('Quota exceeded');};c.saveProject();
  assert.equal(storage.get('tf-projects'),before);assert.match(c.$('projectstatus').textContent,/Couldn’t save/);
  c.deleteProject(id);assert.equal(storage.get('tf-projects'),before);assert.match(c.lastAlert,/Couldn’t delete/);
  let resolve,called=false;c.sample={json(){return new Promise(r=>resolve=r);}};
  const request=c.mapJSON('prompt',{}).then(()=>{called=true;});c.S=c.fresh('Different project');resolve({});await request;
  assert.equal(called,false);
  const start=reloaded.timers.length;c.mapLater(()=>{called=true;},100);c.S=c.fresh('Yet another project');
  reloaded.timers[start]();assert.equal(called,false);
  console.log('PASS: save/restore, JSON download, print content and dialog, escaped content, delete/cancel/failure, stale requests and timers');
})().catch(e=>{console.error(e);process.exitCode=1;});
