/* SleepTrack — núcleo de internacionalización.
   Los archivos js/i18n/<codigo>.js registran sus diccionarios aquí.
   Expone window.SleepI18n. */
(function(){
'use strict';

var KEY='sleeptrack-lang';
var CODES=['en','es','pt','fr','it','de','ru','ja'];
var BASE='en';
var dicts={},current=BASE,listeners=[];

function register(code,dict){if(!dict)return;dicts[code]=dict;}
function supported(code){return CODES.indexOf(code)>=0;}
function detect(){
  var saved=null;
  try{saved=localStorage.getItem(KEY);}catch(e){}
  if(supported(saved))return saved;
  var nav=String(navigator.language||'').toLowerCase().replace('_','-');
  var root=nav.split('-')[0];
  return supported(root)?root:BASE;
}
function raw(key,lang){
  var d=dicts[lang||current]||{};
  if(Object.prototype.hasOwnProperty.call(d,key))return d[key];
  if(lang!==BASE){var b=dicts[BASE]||{};if(Object.prototype.hasOwnProperty.call(b,key))return b[key];}
  return key;
}
function t(key,vars){
  var s=raw(key);
  if(typeof s!=='string')return s;
  if(!vars)return s;
  return s.replace(/\{(\w+)\}/g,function(m,k){
    return (vars[k]!==undefined&&vars[k]!==null)?vars[k]:m;
  });
}
function plural(n){
  try{
    if(typeof Intl!=='undefined'&&Intl.PluralRules)return new Intl.PluralRules(current).select(n);
  }catch(e){}
  return n===1?'one':'other';
}
function nkey(base,n){return base+'.'+plural(n);}
function count(base,n){return t(nkey(base,n),{n:n});}
function apply(){
  var root=document.documentElement;
  root.lang=current;
  var a=document.querySelectorAll('[data-i18n]');
  for(var i=0;i<a.length;i++)a[i].textContent=t(a[i].getAttribute('data-i18n'));
  var b=document.querySelectorAll('[data-i18n-html]');
  for(i=0;i<b.length;i++)b[i].innerHTML=t(b[i].getAttribute('data-i18n-html'));
  var c=document.querySelectorAll('[data-i18n-ph]');
  for(i=0;i<c.length;i++)c[i].placeholder=t(c[i].getAttribute('data-i18n-ph'));
  var d=document.querySelectorAll('[data-i18n-aria]');
  for(i=0;i<d.length;i++)d[i].setAttribute('aria-label',t(d[i].getAttribute('data-i18n-aria')));
  var e=document.querySelectorAll('[data-i18n-title]');
  for(i=0;i<e.length;i++)e[i].title=t(e[i].getAttribute('data-i18n-title'));
  var sel=document.getElementById('langSel');
  if(sel)sel.value=current;
  document.title=t('meta.title');
}
function setLang(code){
  if(!supported(code)||code===current)return;
  current=code;
  try{localStorage.setItem(KEY,code);}catch(e){}
  apply();
  for(var i=0;i<listeners.length;i++)listeners[i](code);
}
function init(){current=detect();apply();return current;}
function onChange(fn){if(typeof fn==='function')listeners.push(fn);}

window.SleepI18n={
  CODES:CODES,
  register:register,
  init:init,
  apply:apply,
  t:t,
  raw:raw,
  get:raw,
  count:count,
  plural:plural,
  current:function(){return current;},
  setLang:setLang,
  onChange:onChange
};
})();
