/* SleepTrack — service worker.
   HTML: Network-First con respaldo en caché. Recursos: caché primero con
   revalidación silenciosa. Instalación inmediata y control de clientes. */
(function(){
'use strict';

/* Sube la versión con cada cambio: fuerza la precarga y limpia la caché anterior.
   activate solo borra CacheStorage, nunca IndexedDB ni localStorage. */
var CACHE='sleeptrack-v1.3.3';
var VERSION=CACHE;
var SCOPE=self.registration.scope;
function abs(p){return new URL(p,SCOPE).href;}
var INDEX=abs('./index.html');
var CORE=[
  './','./index.html','./manifest.webmanifest','./css/styles.css',
  './js/i18n/i18n.js','./js/i18n/en.js','./js/i18n/es.js',
  './js/i18n/pt.js','./js/i18n/fr.js','./js/i18n/it.js',
  './js/i18n/de.js','./js/i18n/ru.js','./js/i18n/ja.js',
  './js/storage.js','./js/ios-install.js','./js/app.js',
  './icons/icon.svg','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'
].map(abs);

self.addEventListener('install',function(ev){
  ev.waitUntil(
    caches.open(VERSION)
      .then(function(c){return c.addAll(CORE);})
      .then(function(){return self.skipWaiting();})
      .catch(function(){return self.skipWaiting();})
  );
});

self.addEventListener('activate',function(ev){
  ev.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k.indexOf('sleeptrack-')===0&&k!==VERSION;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

/* Devuelve la escritura para que el evento la incluya en waitUntil. */
function put(url,response){
  if(!response||!response.ok||response.type==='opaque')return Promise.resolve();
  return caches.open(VERSION).then(function(c){return c.put(url,response.clone());}).catch(function(){});
}

self.addEventListener('fetch',function(ev){
  var req=ev.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin)return;

  var isHTML=req.mode==='navigate'||String(req.headers.get('accept')||'').indexOf('text/html')>=0;
  if(isHTML){
    var net=fetch(req);
    /* La respuesta y su copia en caché comparten la misma petición; la
       escritura se espera con waitUntil para que no se interrumpa. */
    ev.waitUntil(net.then(function(res){return put(INDEX,res);}).catch(function(){}));
    ev.respondWith(net.catch(function(){
      return caches.match(INDEX).then(function(r){return r||caches.match(CORE[0]);});
    }));
    return;
  }

  var update=null;
  var cachedResponse=caches.match(req).then(function(cached){
    if(cached){
      update=fetch(req).then(function(res){return put(req.url,res);}).catch(function(){});
      return cached;
    }
    return fetch(req).then(function(res){
      update=put(req.url,res);
      return res;
    });
  });
  ev.respondWith(cachedResponse);
  ev.waitUntil(cachedResponse.then(function(){return update;}).catch(function(){}));
});

self.addEventListener('message',function(ev){
  if(ev.data==='SKIP_WAITING')self.skipWaiting();
});
})();
