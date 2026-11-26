/* SleepTrack — persistencia, modo demo, meta y copias de seguridad.
   Se carga antes que app.js y expone window.SleepStorage. */
(function(){
'use strict';

var KEY='diario-sueno-v1';
var DEMO_OFF_KEY=KEY+'-demo-off';
/* Los factores base son identificadores estables: la interfaz los traduce
   en cada idioma, pero los datos guardados no cambian al cambiar de idioma. */
var BASE=['caffeine','screens','exercise','stress','alcohol','dinner','nap','noise'];
var LEGACY={
  'Cafeína tarde':'caffeine','Cafeina tarde':'caffeine','Late caffeine':'caffeine','Caféine tardive':'caffeine','Caffeina tardiva':'caffeine','Später Koffein':'caffeine','Поздний кофеин':'caffeine','遅い時間のカフェイン':'caffeine','Cafeína tardia':'caffeine',
  'Pantalla antes de dormir':'screens','Screens before bed':'screens','Écrans avant le coucher':'screens','Schermi prima di dormire':'screens','Bildschirme vor dem Schlafen':'screens','Экраны перед сном':'screens','就寝前の画面':'screens','Ecrãs antes de dormir':'screens',
  'Ejercicio':'exercise','Exercise':'exercise','Exercice':'exercise','Attività fisica':'exercise','Bewegung':'exercise','Физическая активность':'exercise','運動':'exercise','Exercício':'exercise',
  'Estrés':'stress','Stress':'stress','Стресс':'stress','ストレス':'stress',
  'Alcohol':'alcohol','Alcool':'alcohol','Алкоголь':'alcohol','アルコール':'alcohol','Álcool':'alcohol',
  'Cena pesada':'dinner','Heavy dinner':'dinner','Dîner copieux':'dinner','Cena pesante':'dinner','Schweres Abendessen':'dinner','Плотный ужин':'dinner','重い夕食':'dinner','Jantar pesado':'dinner',
  'Siesta':'nap','Nap':'nap','Pisolino':'nap','Nickerchen':'nap','Сон днём':'nap','昼寝':'nap',
  'Ruido o calor':'noise','Noise or heat':'noise','Bruit ou chaleur':'noise','Rumore o calore':'noise','Lärm oder Hitze':'noise','Шум или жара':'noise','騒音や暑さ':'noise','Ruído ou calor':'noise'
};

var state={entries:{},goal:8,custom:[]};
var storageOK=true;
var demoCache=null,demoDay='',demoOff=false;

/* ---------- Capa IndexedDB (Etapa 1) ----------
   IndexedDB es el almacen principal; localStorage se conserva como espejo
   sincrono para que app.js no tenga que cambiar su API. Los archivos
   (fotos, recortes, etc.) se guardan en el store 'files', sin el limite
   de 5 MB de localStorage. */
var DB_NAME='sleeptrack_db';
var DB_VERSION=1;
/* v2 añade energy, caffeineAt y screensMin; los respaldos v1 siguen siendo válidos. */
var SCHEMA_VERSION=2;
var STORE_STATE='state';
var STORE_FILES='files';
var STATE_KEY='main';
var dbPromise=null,idbReady=false,idbFailed=false,pendingWrite=false,localHadData=false;
var initPromise=null,writeChain=Promise.resolve(),memoryBackup=null;

function idbOpen(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(function(resolve,reject){
    if(!('indexedDB' in window)){reject(new Error('IndexedDB no disponible'));return;}
    var req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=function(){
      var db=req.result;
      if(!db.objectStoreNames.contains(STORE_STATE))db.createObjectStore(STORE_STATE);
      if(!db.objectStoreNames.contains(STORE_FILES))db.createObjectStore(STORE_FILES,{keyPath:'id'});
    };
    req.onsuccess=function(){idbReady=true;resolve(req.result);};
    req.onerror=function(){idbFailed=true;reject(req.error||new Error('No se pudo abrir IndexedDB'));};
    req.onblocked=function(){idbFailed=true;reject(new Error('IndexedDB bloqueada'));};
  });
  return dbPromise;
}
function idbRequest(db,store,mode,run){
  return new Promise(function(resolve,reject){
    var tx=db.transaction(store,mode),os=tx.objectStore(store),result;
    try{result=run(os);}catch(e){reject(e);return;}
    tx.oncomplete=function(){resolve(result&&result.result!==undefined?result.result:undefined);};
    tx.onerror=function(){reject(tx.error||new Error('Error de IndexedDB'));};
    tx.onabort=function(){reject(tx.error||new Error('Transaccion abortada'));};
  });
}
function idbGet(store,key){
  return idbOpen().then(function(db){return idbRequest(db,store,'readonly',function(os){return os.get(key);});});
}
function idbGetAll(store){
  return idbOpen().then(function(db){return idbRequest(db,store,'readonly',function(os){return os.getAll();});});
}
function idbPut(store,key,value){
  return idbOpen().then(function(db){
    return idbRequest(db,store,'readwrite',function(os){
      return key===undefined?os.put(value):os.put(value,key);
    });
  });
}
function idbDelete(store,key){
  return idbOpen().then(function(db){return idbRequest(db,store,'readwrite',function(os){return os.delete(key);});});
}
function localSnapshot(){
  var snap={};
  try{[KEY,DEMO_OFF_KEY].forEach(function(k){var v=localStorage.getItem(k);if(v!==null)snap[k]=v;});}catch(e){}
  return snap;
}
function stateData(){return {goal:state.goal,custom:state.custom,entries:state.entries};}
function envelope(data){
  return {schemaVersion:SCHEMA_VERSION,app:'sleeptrack',v:1,data:data,localStorage:localSnapshot(),updatedAt:new Date().toISOString()};
}
function writeIDB(data){
  writeChain=writeChain.then(function(){
    return idbPut(STORE_STATE,STATE_KEY,envelope(data));
  }).catch(function(){idbFailed=true;});
  return writeChain;
}
function applyData(d){
  var c=sanitize(d),changed=false;
  if(JSON.stringify(state.entries)!==JSON.stringify(c.entries)){state.entries=c.entries;changed=true;}
  if(JSON.stringify(state.custom)!==JSON.stringify(c.custom)){state.custom=c.custom;changed=true;}
  if(state.goal!==c.goal){state.goal=c.goal;changed=true;}
  return changed;
}
function mergeData(local,remote,preferLocal){
  var out={goal:(preferLocal&&local&&typeof local.goal==='number')?local.goal:(remote&&remote.goal)||8,custom:[],entries:{}};
  var add=function(k,v){if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&v&&typeof v==='object')out.entries[k]=v;};
  Object.keys((remote&&remote.entries)||{}).forEach(function(k){add(k,remote.entries[k]);});
  Object.keys((local&&local.entries)||{}).forEach(function(k){add(k,local.entries[k]);});
  [((remote&&remote.custom)||[]),((local&&local.custom)||[])].forEach(function(list){
    (Array.isArray(list)?list:[]).forEach(function(x){if(typeof x==='string'&&x&&out.custom.indexOf(x)<0)out.custom.push(x);});
  });
  if(preferLocal&&local&&typeof local.goal==='number')out.goal=local.goal;
  return out;
}
function notifyReady(changed){
  try{
    window.dispatchEvent(new CustomEvent('sleeptrack:storage-ready',{detail:{changed:!!changed,fromIndexedDB:true}}));
  }catch(e){}
}
function initIDB(){
  if(initPromise)return initPromise;
  initPromise=idbOpen().then(function(){
    return idbGet(STORE_STATE,STATE_KEY);
  }).then(function(rec){
    var local=stateData(),merged=local;
    if(rec){
      var remote=(rec.schemaVersion&&rec.data)?rec.data:rec;
      merged=mergeData(localHadData?local:null,remote,localHadData||pendingWrite);
      var changed=applyData(merged);
      persist();
      notifyReady(changed);
    }else{
      // First run: migrate every localStorage record into IndexedDB.
      writeIDB(local);
      notifyReady(false);
    }
  }).catch(function(){
    idbFailed=true;
    notifyReady(false);
  });
  return initPromise;
}
function whenReady(){return initIDB();}
/* Archivos/imagenes: se guardan en IndexedDB, nunca en localStorage. */
function putFile(id,data,meta){
  var rec={id:String(id),data:data,type:(meta&&meta.type)||'',name:(meta&&meta.name)||'',
    size:typeof data==='string'?data.length:((data&&data.size)||0),schemaVersion:SCHEMA_VERSION,
    createdAt:new Date().toISOString()};
  return idbPut(STORE_FILES,undefined,rec);
}
function getFile(id){return idbGet(STORE_FILES,String(id));}
function listFiles(){return idbGetAll(STORE_FILES);}
function deleteFile(id){return idbDelete(STORE_FILES,String(id));}

/* Utilidades internas de fecha/hora (las cuentas de la app viven en app.js) */
function pad(n){return n<10?'0'+n:''+n;}
function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function pdate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2],12);}
function addDays(s,n){var d=pdate(s);d.setDate(d.getDate()+n);return dstr(d);}
function todayStr(){return dstr(new Date());}
function dow(s){return pdate(s).getDay();}
function tmin(t){var p=t.split(':');return (+p[0])*60+(+p[1]);}
function tfmt(m){m=((Math.round(m)%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60);}
function validT(t){return typeof t==='string'&&/^\d{2}:\d{2}$/.test(t)&&+t.slice(0,2)<24&&+t.slice(3)<60;}
function dur(e){return ((tmin(e.wake)-tmin(e.bed))+1440)%1440;}

/* ---------- Persistencia ---------- */
function sanitize(o){
  var out={entries:{},goal:8,custom:[]};
  if(!o||typeof o!=='object')return out;
  if(typeof o.goal==='number'&&o.goal>=4&&o.goal<=12)out.goal=Math.round(o.goal*2)/2;
  if(Array.isArray(o.custom))out.custom=o.custom.filter(function(x){return typeof x==='string'&&x.trim()&&x.length<=24;}).slice(0,12).map(function(x){var v=x.trim();return LEGACY[v]||v;});
  var src=(o.entries&&typeof o.entries==='object')?o.entries:{};
  Object.keys(src).forEach(function(k){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return;
    var e=src[k];if(!e||typeof e!=='object')return;
    if(!validT(e.bed)||!validT(e.wake))return;
    var q=Math.round(+e.q);if(!(q>=1&&q<=5))return;
    if(dur(e)===0)return;
    var aw=Math.max(0,Math.min(30,Math.round(+e.aw||0)));
    var f=Array.isArray(e.f)?e.f.filter(function(x){return typeof x==='string'&&x.length>0&&x.length<=30;}).slice(0,16).map(function(x){return LEGACY[x]||x;}):[];
    /* Etapa 2: datos opcionales. Se normalizan a '' cuando no se registraron,
       de modo que JSON, CSV, demo e importación usen el mismo esquema. */
    var ev=Math.round(+e.energy),energy=(ev>=1&&ev<=5)?ev:'';
    var caffeineAt=validT(e.caffeineAt)?e.caffeineAt:'';
    var sm=Number(e.screensMin),screensMin=(e.screensMin!==''&&e.screensMin!=null&&isFinite(sm)&&sm>=0&&sm<=600)?Math.round(sm):'';
    out.entries[k]={bed:e.bed,wake:e.wake,q:q,aw:aw,f:f,note:typeof e.note==='string'?e.note.slice(0,140):'',
      energy:energy,caffeineAt:caffeineAt,screensMin:screensMin};
  });
  return out;
}
function load(){
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){localHadData=true;var parsed=JSON.parse(raw),c=sanitize(parsed&&parsed.data?parsed.data:parsed);state.entries=c.entries;state.goal=c.goal;state.custom=c.custom;}
  }catch(e){}
  try{demoOff=localStorage.getItem(DEMO_OFF_KEY)==='1';}catch(e){}
  try{localStorage.setItem(KEY+'-t','1');localStorage.removeItem(KEY+'-t');storageOK=true;}catch(e){storageOK=false;}
  /* Migracion automatica: localStorage -> IndexedDB, sin perder registros. */
  initIDB();
}
function persist(){
  var payload={v:1,schemaVersion:SCHEMA_VERSION,app:'sleeptrack',goal:state.goal,custom:state.custom,entries:state.entries};
  try{localStorage.setItem(KEY,JSON.stringify(payload));storageOK=true;}
  catch(e){storageOK=false;}
  pendingWrite=true;
  writeIDB({goal:state.goal,custom:state.custom,entries:state.entries});
}
function persistDemoOff(){
  try{localStorage.setItem(DEMO_OFF_KEY,'1');}catch(e){storageOK=false;}
}

/* ---------- Modo demo ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function gauss(r){var u=0,v=0;while(u===0)u=r();while(v===0)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function makeDemo(){
  var r=rng(2611),out={},t=todayStr();
  for(var i=44;i>=1;i--){
    var d=addDays(t,-i);
    if(r()<0.09)continue;
    var wd=dow(d),free=(wd===0||wd===6);
    var caf=r()<0.25,scr=r()<0.4,ex=r()<0.35,st=r()<0.3,alc=r()<(free?0.28:0.08),din=r()<0.15;
    var bed=(free?1450:1400)+gauss(r)*32+(scr?22:0)+(alc?20:0);
    var dm=420+(free?40:0)+gauss(r)*36-(caf?22:0)-(alc?15:0);
    var aw=Math.max(0,Math.round(0.7+(caf?0.7:0)+(st?0.9:0)+(alc?0.9:0)+(din?0.4:0)-(ex?0.3:0)+gauss(r)*0.7));
    var q=3.7+(ex?0.5:0)-(caf?0.7:0)-(st?0.7:0)-(scr?0.4:0)-(alc?0.5:0)+(dm-450)/120*0.7-aw*0.15+gauss(r)*0.45;
    q=Math.max(1,Math.min(5,Math.round(q)));
    var energy=Math.max(1,Math.min(5,Math.round(1.2+(q-1)*0.62+(dm-420)/150-aw*0.12+gauss(r)*0.3)));
    /* Cafeína tardía después de las 16:00; algo de cafeína temprana en otras noches. */
    var caffeineAt=caf?tfmt(960+Math.round(r()*150)):(r()<0.45?tfmt(660+Math.round(r()*270)):'');
    var screensMin=scr?Math.round((45+r()*100)/5)*5:Math.round((5+r()*25)/5)*5;
    var f=[];
    if(caf)f.push(BASE[0]);if(scr)f.push(BASE[1]);if(ex)f.push(BASE[2]);if(st)f.push(BASE[3]);if(alc)f.push(BASE[4]);if(din)f.push(BASE[5]);
    out[d]={bed:tfmt(bed),wake:tfmt(bed+dm),q:q,aw:aw,f:f,note:demoNote(q,caf,st),
      energy:energy,caffeineAt:caffeineAt,screensMin:screensMin};
    if(dur(out[d])===0)delete out[d];
  }
  return out;
}
function demoNote(q,caf,st){
  var I=window.SleepI18n;
  var key=q>=4?'demo.note1':(q<=2?'demo.note3':((caf||st)?'demo.note2':''));
  return key&&I?I.t(key):'';
}
function demo(){var t=todayStr();if(!demoCache||demoDay!==t){demoCache=makeDemo();demoDay=t;}return demoCache;}
function refreshDemo(){demoCache=null;demoDay='';}
function isDemo(){return !demoOff&&Object.keys(state.entries).length===0;}
function entries(){return isDemo()?demo():state.entries;}

/* ---------- Meta y factores personalizados ---------- */
function setGoal(v){state.goal=Math.round(Math.max(4,Math.min(12,+v))*2)/2;persist();}
function addCustom(v){
  v=String(v||'').trim().slice(0,24);
  if(!v)return false;
  if(BASE.indexOf(v)<0&&state.custom.indexOf(v)<0){state.custom.push(v);persist();}
  return true;
}
function removeCustom(v){state.custom=state.custom.filter(function(c){return c!==v;});persist();}

/* ---------- Etiquetas de factores ---------- */
function factorLabel(f){
  var id=LEGACY[f]||f,I=window.SleepI18n;
  if(I){var v=I.t('factors.'+id);if(v!=='factors.'+id)return v;}
  return f;
}

/* ---------- Copias de seguridad ---------- */
function csvCell(v){
  var s=String(v==null?'':v);
  return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function backupPayload(){
  return {app:'sleeptrack',schemaVersion:SCHEMA_VERSION,v:1,exportedAt:new Date().toISOString(),
    goal:state.goal,custom:state.custom,entries:state.entries};
}
function exportJSON(){
  if(!Object.keys(state.entries).length)return {ok:false,msg:'backup.exportNone'};
  return {ok:true,text:JSON.stringify(backupPayload())};
}
/* Validacion de origen y estructura antes de sobrescribir cualquier dato. */
function validateBackup(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return {ok:false,msgText:'El archivo no contiene un respaldo válido.'};
  if(o.app&&String(o.app).toLowerCase()!=='sleeptrack')return {ok:false,msgText:'Este respaldo pertenece a otra aplicación y no se importará.'};
  var sv=o.schemaVersion==null?1:Number(o.schemaVersion);
  if(!isFinite(sv)||sv<1||sv>SCHEMA_VERSION)return {ok:false,msgText:'La versión de esquema del respaldo no es compatible.'};
  if(!o.entries||typeof o.entries!=='object'||Array.isArray(o.entries))return {ok:false,msgText:'El respaldo no tiene registros válidos.'};
  /* sanitize valida también los campos opcionales de la Etapa 2 (energía,
     cafeína y pantallas) sin descartar respaldos anteriores que no los tenían. */
  var rawKeys=Object.keys(o.entries),clean=sanitize(o),keys=Object.keys(clean.entries);
  if(!keys.length)return {ok:false,msg:'backup.importNoNights'};
  if(keys.length!==rawKeys.length)return {ok:false,msgText:'El respaldo está incompleto o dañado: hay registros no válidos.'};
  return {ok:true,data:clean,version:sv};
}
function exportCSV(){
  var keys=Object.keys(state.entries).sort();
  if(!keys.length)return {ok:false,msg:'backup.exportNone'};
  var I=window.SleepI18n;
  function h(k){return I?I.t('csv.'+k):k;}
  var lines=[h('date')+','+h('bed')+','+h('wake')+','+h('hours')+','+h('quality')+','+h('awakenings')+','+h('factors')+','+h('note')+','+h('energy')+','+h('caffeine')+','+h('screens')];
  keys.forEach(function(k){
    var e=state.entries[k];
    lines.push([k,e.bed,e.wake,(dur(e)/60).toFixed(2),e.q,e.aw,(e.f||[]).map(factorLabel).join(' | '),e.note||'',
      e.energy||'',e.caffeineAt||'',(e.screensMin==null||e.screensMin==='')?'':e.screensMin].map(csvCell).join(','));
  });
  return {ok:true,text:lines.join('\r\n'),count:keys.length};
}
function importJSON(text){
  /* Respaldo temporal en memoria: si algo falla, se restaura sin tocar IndexedDB. */
  memoryBackup={data:stateData(),demoOff:demoOff};
  try{
    var o=JSON.parse(String(text||'').trim()),v=validateBackup(o);
    if(!v.ok)return {ok:false,msg:v.msg||'backup.importInvalid',msgText:v.msgText};
    var keys=Object.keys(v.data.entries);
    /* Restaurar reproduce el respaldo: no se conservan noches que el archivo
       ya no contiene. Se muta el objeto vivo que usa app.js. */
    state.entries=v.data.entries;
    state.custom=v.data.custom.filter(function(x){return BASE.indexOf(x)<0;});
    if(o&&typeof o.goal==='number')state.goal=v.data.goal;
    persist();
    return {ok:true,count:keys.length};
  }catch(e){
    if(memoryBackup){
      state.entries=memoryBackup.data.entries;
      state.custom=memoryBackup.data.custom;
      state.goal=memoryBackup.data.goal;
      demoOff=memoryBackup.demoOff;
      persist();
    }
    return {ok:false,msg:'backup.importInvalid',msgText:'No se pudo importar el respaldo; tus datos siguen intactos.'};
  }finally{memoryBackup=null;}
}
function wipe(){state.entries={};state.custom=[];persist();}

window.SleepStorage={
  BASE:BASE,
  factorLabel:factorLabel,
  state:function(){return state;},
  storageOK:function(){return storageOK;},
  load:load,
  persist:persist,
  sanitize:sanitize,
  isDemo:isDemo,
  dismissDemo:function(){demoOff=true;persistDemoOff();},
  refreshDemo:refreshDemo,
  entries:entries,
  ownEntries:function(){return state.entries;},
  setGoal:setGoal,
  addCustom:addCustom,
  removeCustom:removeCustom,
  exportJSON:exportJSON,
  exportCSV:exportCSV,
  importJSON:importJSON,
  validateBackup:validateBackup,
  wipe:wipe,
  /* Etapa 1: almacenamiento durable y sin limite de 5 MB */
  DB_NAME:DB_NAME,
  SCHEMA_VERSION:SCHEMA_VERSION,
  whenReady:whenReady,
  isIndexedDBReady:function(){return idbReady&&!idbFailed;},
  putFile:putFile,
  getFile:getFile,
  listFiles:listFiles,
  deleteFile:deleteFile
};
})();
