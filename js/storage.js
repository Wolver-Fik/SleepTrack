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
    out.entries[k]={bed:e.bed,wake:e.wake,q:q,aw:aw,f:f,note:typeof e.note==='string'?e.note.slice(0,140):''};
  });
  return out;
}
function load(){
  try{
    var raw=localStorage.getItem(KEY);
    if(raw){var c=sanitize(JSON.parse(raw));state.entries=c.entries;state.goal=c.goal;state.custom=c.custom;}
  }catch(e){}
  try{demoOff=localStorage.getItem(DEMO_OFF_KEY)==='1';}catch(e){}
  try{localStorage.setItem(KEY+'-t','1');localStorage.removeItem(KEY+'-t');storageOK=true;}catch(e){storageOK=false;}
}
function persist(){
  try{localStorage.setItem(KEY,JSON.stringify({v:1,goal:state.goal,custom:state.custom,entries:state.entries}));storageOK=true;}
  catch(e){storageOK=false;}
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
    var f=[];
    if(caf)f.push(BASE[0]);if(scr)f.push(BASE[1]);if(ex)f.push(BASE[2]);if(st)f.push(BASE[3]);if(alc)f.push(BASE[4]);if(din)f.push(BASE[5]);
    out[d]={bed:tfmt(bed),wake:tfmt(bed+dm),q:q,aw:aw,f:f,note:''};
    if(dur(out[d])===0)delete out[d];
  }
  return out;
}
function demo(){var t=todayStr();if(!demoCache||demoDay!==t){demoCache=makeDemo();demoDay=t;}return demoCache;}
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
function exportJSON(){
  if(!Object.keys(state.entries).length)return {ok:false,msg:'backup.exportNone'};
  return {ok:true,text:JSON.stringify({v:1,goal:state.goal,custom:state.custom,entries:state.entries})};
}
function exportCSV(){
  var keys=Object.keys(state.entries).sort();
  if(!keys.length)return {ok:false,msg:'backup.exportNone'};
  var I=window.SleepI18n;
  function h(k){return I?I.t('csv.'+k):k;}
  var lines=[h('date')+','+h('bed')+','+h('wake')+','+h('hours')+','+h('quality')+','+h('awakenings')+','+h('factors')+','+h('note')];
  keys.forEach(function(k){
    var e=state.entries[k];
    lines.push([k,e.bed,e.wake,(dur(e)/60).toFixed(2),e.q,e.aw,(e.f||[]).map(factorLabel).join(' | '),e.note||''].map(csvCell).join(','));
  });
  return {ok:true,text:lines.join('\r\n'),count:keys.length};
}
function importJSON(text){
  var o;
  try{o=JSON.parse(String(text||'').trim());}catch(e){return {ok:false,msg:'backup.importInvalid'};}
  var c=sanitize(o),keys=Object.keys(c.entries);
  if(!keys.length)return {ok:false,msg:'backup.importNoNights'};
  keys.forEach(function(k){state.entries[k]=c.entries[k];});
  c.custom.forEach(function(x){if(state.custom.indexOf(x)<0&&BASE.indexOf(x)<0)state.custom.push(x);});
  if(o&&typeof o.goal==='number')state.goal=c.goal;
  persist();
  return {ok:true,count:keys.length};
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
  entries:entries,
  ownEntries:function(){return state.entries;},
  setGoal:setGoal,
  addCustom:addCustom,
  removeCustom:removeCustom,
  exportJSON:exportJSON,
  exportCSV:exportCSV,
  importJSON:importJSON,
  wipe:wipe
};
})();
