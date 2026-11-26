/* SleepTrack — cálculos, gráficos, motor de patrones e interacción.
   Requiere js/i18n/*.js y js/storage.js (window.SleepI18n, window.SleepStorage). */
(function(){
'use strict';

var S=window.SleepStorage,I=window.SleepI18n;
if(!S||!I)return;
function L(k,v){return I.t(k,v);}
function C(k,n){return I.count(k,n);}
function WD_LONG(){return I.get('weekday.long');}
function WD_SHORT(){return I.get('weekday.short');}
function WD_INITIAL(){return I.get('weekday.initial');}
function MO_LONG(){return I.get('month.long');}
function MO_SHORT(){return I.get('month.short');}
function QLAB(){return I.get('quality.labels');}

var state=S.state();
var ui={range:30,avg:'week',histN:20,editing:null,confirmDel:null,wipe:false,lastW:0,tab:'record',calYM:todayStr().slice(0,7),calSel:'',year:+todayStr().slice(0,4)};
var form={q:0,aw:0,f:{}};
var TABS=['record','analysis','history'];

function $(id){return document.getElementById(id);}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function pad(n){return n<10?'0'+n:''+n;}
function f1(v){return Math.round(v*10)/10;}
function decSep(){try{return (1.1).toLocaleString(I.current()).replace(/[0-9]/g,'').charAt(0)||'.';}catch(e){return ',';}}
function num1(x){return x.toFixed(1).replace('.',decSep());}
function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function pdate(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2],12);}
function addDays(s,n){var d=pdate(s);d.setDate(d.getDate()+n);return dstr(d);}
function todayStr(){return dstr(new Date());}
function dow(s){return pdate(s).getDay();}
function tmin(t){var p=t.split(':');return (+p[0])*60+(+p[1]);}
function tfmt(m){m=((Math.round(m)%1440)+1440)%1440;return pad(Math.floor(m/60))+':'+pad(m%60);}
function dur(e){return ((tmin(e.wake)-tmin(e.bed))+1440)%1440;}
function fmtDur(m){m=Math.round(m);var neg=m<0;m=Math.abs(m);var h=Math.floor(m/60),r=m%60;var s=h?(h+' h'+(r?' '+r+' min':'')):(r+' min');return (neg?'−':'')+s;}
function bigDur(m){var h=Math.floor(m/60),r=Math.round(m%60);if(r===60){h++;r=0;}return '<span class="n">'+h+'</span><span class="u">h</span><span class="n">'+pad(r)+'</span><span class="u">min</span>';}
function goalTxt(){return String(state.goal).replace('.',decSep())+' h';}
function dateLabel(d){
  var w=WD_SHORT(),m=MO_SHORT();
  return L('date.short',{weekday:w[dow(d)],d:+d.slice(8),m:m[+d.slice(5,7)-1]});
}
function factorName(f){return S.factorLabel?S.factorLabel(f):f;}
function formatAw(n){return C('describe.aw',n);}
function avg(a){return a.length?a.reduce(function(x,y){return x+y;},0)/a.length:null;}
function sd(a){if(a.length<2)return null;var m=avg(a);return Math.sqrt(avg(a.map(function(x){return (x-m)*(x-m);})));}
function bedN(r){return (tmin(r.bed)-720+1440)%1440;}

function buildRows(src){
  return Object.keys(src).sort().map(function(k){var e=src[k];return {date:k,bed:e.bed,wake:e.wake,q:e.q,aw:e.aw,f:e.f||[],note:e.note||'',d:dur(e)};});
}
function rows(){return buildRows(S.entries());}
function byDate(rs){var m={};rs.forEach(function(r){m[r.date]=r;});return m;}
function inWin(rs,endStr,n){var s=addDays(endStr,-n);return rs.filter(function(r){return r.date>s&&r.date<=endStr;});}
function daysList(n){var t=todayStr(),a=[];for(var i=n-1;i>=0;i--)a.push(addDays(t,-i));return a;}

/* ---------- Cabecera ---------- */
function renderToday(){
  var t=new Date();
  $('today').textContent=L('today',{weekday:WD_LONG()[t.getDay()],day:t.getDate(),month:MO_LONG()[t.getMonth()],year:t.getFullYear()});
}

/* ---------- Pestañas ---------- */
function setTab(name){
  if(TABS.indexOf(name)<0)return;
  ui.tab=name;
  TABS.forEach(function(k){
    $('view-'+k).hidden=(k!==name);
    var b=$('tabBtn-'+k);
    b.setAttribute('aria-selected',String(k===name));
    b.tabIndex=(k===name?0:-1);
  });
  /* El ancho de los gráficos solo es real cuando la vista está visible. */
  if(name==='analysis')renderCharts(rows());
}

/* ---------- KPIs ---------- */
function renderKpis(rs){
  var t=todayStr();
  var w7=inWin(rs,t,7),p7=inWin(rs,addDays(t,-7),7),w30=inWin(rs,t,30),w14=inWin(rs,t,14);
  var h='';
  function tile(lab,val,sub,cls,subCls){h+='<div class="kpi"><span class="lab">'+lab+'</span><span class="k-val'+(cls?' '+cls:'')+'">'+val+'</span><span class="k-sub'+(subCls?' '+subCls:'')+'">'+sub+'</span></div>';}
  var a7=avg(w7.map(function(r){return r.d;}));
  var sub7=C('kpi.nights',w7.length);
  var sc='';
  if(a7!==null&&p7.length>=2){var dd=a7-avg(p7.map(function(r){return r.d;}));if(Math.abs(dd)>=5){sub7=L('kpi.vsPrev',{d:(dd>0?'+':'−')+fmtDur(Math.abs(dd))});sc=dd>0?'up':'down';}}
  tile(L('kpi.avg7'),a7===null?'—':bigDur(a7),a7===null?L('kpi.noRecords'):sub7,'',sc);
  var a30=avg(w30.map(function(r){return r.d;}));
  tile(L('kpi.avg30'),a30===null?'—':bigDur(a30),a30===null?L('kpi.noRecords'):L('kpi.registered',{n:w30.length}),'','');
  var q7=avg(w7.map(function(r){return r.q;}));
  var ql=QLAB();
  tile(L('kpi.quality7'),q7===null?'—':num1(q7)+'<span class="u">/ 5</span>',q7===null?L('kpi.noRecords'):ql[Math.max(1,Math.min(5,Math.round(q7)))],'','');
  var aw7=avg(w7.map(function(r){return r.aw;}));
  tile(L('kpi.awake7'),aw7===null?'—':num1(aw7),aw7===null?L('kpi.noRecords'):L('kpi.perNight'),'','');
  if(w7.length){
    var bal=w7.reduce(function(s,r){return s+(state.goal*60-r.d);},0);
    if(bal<=0){tile(L('kpi.debt'),L('kpi.noDebt'),L('kpi.reserve',{d:fmtDur(-bal)}),'good','');}
    else{tile(L('kpi.debt'),bigDur(bal),L('kpi.debtIn',{n:C('kpi.nights',w7.length),goal:goalTxt()}),bal>300?'bad':(bal>120?'warn':''),'');}
  }else tile(L('kpi.debt'),'—',L('kpi.debtNoneWeek'),'','');
  if(w14.length>=3){
    var sb=sd(w14.map(bedN)),sw=sd(w14.map(function(r){return tmin(r.wake);}));
    tile(L('kpi.regularity'),'±'+Math.round(sb)+'<span class="u">min</span>',L('kpi.regSub',{w:Math.round(sw)}),sb<=30?'good':(sb>60?'warn':''),'');
  }else tile(L('kpi.regularity'),'—',L('kpi.regNeed'),'','');
  $('kpis').innerHTML=h;
}

/* ---------- Resumen rápido ---------- */
function renderRecent(rs){
  var list=rs.slice(-3).reverse(),h='';
  if(!list.length){$('recent').innerHTML='<li class="empty" style="margin-top:2px">'+L('recent.empty')+'</li>';return;}
  list.forEach(function(r){
    var dots='';for(var i=1;i<=5;i++)dots+='<i class="'+(i<=r.q?'on':'')+'"></i>';
    h+='<li class="rrow"><span class="r-date">'+dateLabel(r.date)+'</span><span class="r-main">'+fmtDur(r.d)+' · '+r.bed+' → '+r.wake+'</span><span class="r-q" role="img" aria-label="'+L('recent.qualityAria',{q:r.q})+'">'+dots+'</span></li>';
  });
  $('recent').innerHTML=h;
}

/* ---------- Gráficos SVG ---------- */
function svgOpen(w,h,label){return '<svg class="chart" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+label+'">';}
function topRound(x,y,w,h,r){r=Math.min(r,w/2,h);return 'M'+x+','+(y+h)+'V'+f1(y+r)+'Q'+x+','+y+' '+f1(x+r)+','+y+'H'+f1(x+w-r)+'Q'+f1(x+w)+','+y+' '+f1(x+w)+','+f1(y+r)+'V'+f1(y+h)+'Z';}
function xLabels(days,Lft,cw,y){
  var n=days.length,s='',init=WD_INITIAL(),mo=MO_SHORT();
  days.forEach(function(d,i){
    var x=f1(Lft+cw*i+cw/2),dd=+d.slice(8);
    if(n<=14){
      s+='<text class="ax" x="'+x+'" y="'+y+'" text-anchor="middle">'+init[dow(d)]+'</text><text class="ax dim" x="'+x+'" y="'+(y+12)+'" text-anchor="middle">'+dd+'</text>';
    }else if(n<=31){
      var step=Math.max(1,Math.ceil(24/cw));
      if((n-1-i)%step===0)s+='<text class="ax" x="'+x+'" y="'+y+'" text-anchor="middle">'+dd+'</text>';
    }else if(dd===1||dd===15){
      s+='<text class="ax" x="'+x+'" y="'+y+'" text-anchor="middle">'+(dd===1?esc(L('chart.monthDay',{d:1,m:mo[+d.slice(5,7)-1]})):'15')+'</text>';
    }
  });
  return s;
}
function hits(days,Lft,cw,T,ih){
  var s='';
  days.forEach(function(d,i){s+='<rect class="hit" data-d="'+d+'" x="'+f1(Lft+cw*i)+'" y="'+T+'" width="'+f1(cw)+'" height="'+f1(ih)+'"/>';});
  return s;
}
function chartHours(rs,w,n){
  var days=daysList(n),map=byDate(rs);
  var Lft=36,R=56,T=12,B=n<=14?38:24,H=200,iw=w-Lft-R,ih=H-T-B,cw=iw/n,bw=Math.max(2,Math.min(30,cw*0.62));
  var mx=0;days.forEach(function(d){if(map[d])mx=Math.max(mx,map[d].d/60);});
  var ym=Math.ceil(Math.max(state.goal+1,mx)/2)*2;
  function Y(v){return T+ih-(v/ym)*ih;}
  var s=svgOpen(w,H,L('chart.ariaHours'));
  for(var v=0;v<=ym;v+=2){s+='<line class="grid" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Y(v))+'" y2="'+f1(Y(v))+'"/><text class="ax" x="'+(Lft-6)+'" y="'+f1(Y(v)+3.5)+'" text-anchor="end">'+v+' h</text>';}
  days.forEach(function(d,i){
    var r=map[d];if(!r)return;
    var y=Y(r.d/60),x=Lft+cw*i+(cw-bw)/2;
    s+='<path class="'+(r.d>=state.goal*60?'b-ok':'b-low')+'" d="'+topRound(f1(x),f1(y),f1(bw),f1(Y(0)-y),3)+'"/>';
  });
  s+='<line class="goal-l2" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Y(state.goal))+'" y2="'+f1(Y(state.goal))+'"/><text class="ax" x="'+(w-R+6)+'" y="'+f1(Y(state.goal)+3.5)+'">'+esc(L('header.goal')+' '+goalTxt())+'</text>';
  var pts=[];
  days.forEach(function(d,i){
    var win=[];for(var j=Math.max(0,i-6);j<=i;j++){if(map[days[j]])win.push(map[days[j]].d);}
    if(win.length)pts.push(f1(Lft+cw*i+cw/2)+','+f1(Y(avg(win)/60)));
  });
  if(pts.length>1)s+='<polyline class="ma" points="'+pts.join(' ')+'"/>';
  s+=xLabels(days,Lft,cw,H-B+14)+hits(days,Lft,cw,T,ih);
  return s+'</svg>';
}
function chartWindow(rs,w,n){
  var days=daysList(n),map=byDate(rs);
  var Lft=40,R=56,T=12,B=n<=14?38:24,H=220,iw=w-Lft-R,ih=H-T-B,cw=iw/n,bw=Math.max(2,Math.min(30,cw*0.62));
  var info=[];
  days.forEach(function(d,i){var r=map[d];if(r){var b=(tmin(r.bed)-1080+1440)%1440;info.push({i:i,r:r,b:b,e:b+r.d});}});
  var lo=240,hi=840;
  if(info.length){
    lo=Math.floor((Math.min.apply(null,info.map(function(x){return x.b;}))-45)/60)*60;
    hi=Math.ceil((Math.max.apply(null,info.map(function(x){return x.e;}))+45)/60)*60;
  }
  var span=hi-lo,step=span>600?120:60;
  function Y(m){return T+(m-lo)/span*ih;}
  var s=svgOpen(w,H,L('chart.ariaWindow'));
  for(var m=lo;m<=hi;m+=step){s+='<line class="grid" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Y(m))+'" y2="'+f1(Y(m))+'"/><text class="ax" x="'+(Lft-6)+'" y="'+f1(Y(m)+3.5)+'" text-anchor="end">'+tfmt(m+1080)+'</text>';}
  info.forEach(function(x){
    var y1=Y(x.b),y2=Y(x.e),bx=Lft+cw*x.i+(cw-bw)/2;
    s+='<rect class="win" x="'+f1(bx)+'" y="'+f1(y1)+'" width="'+f1(bw)+'" height="'+f1(Math.max(2,y2-y1))+'" rx="'+f1(Math.min(3,bw/2))+'" style="opacity:'+(0.28+0.14*x.r.q).toFixed(2)+'"/>';
  });
  if(info.length>=2){
    var ab=avg(info.map(function(x){return x.b;})),ae=avg(info.map(function(x){return x.e;}));
    s+='<line class="avgl" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Y(ab))+'" y2="'+f1(Y(ab))+'"/><text class="ax" x="'+(w-R+6)+'" y="'+f1(Y(ab)+3.5)+'">~'+tfmt(ab+1080)+'</text>';
    s+='<line class="avgl" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Y(ae))+'" y2="'+f1(Y(ae))+'"/><text class="ax" x="'+(w-R+6)+'" y="'+f1(Y(ae)+3.5)+'">~'+tfmt(ae+1080)+'</text>';
  }
  s+=xLabels(days,Lft,cw,H-B+14)+hits(days,Lft,cw,T,ih);
  return s+'</svg>';
}
function chartQuality(rs,w,n){
  var days=daysList(n),map=byDate(rs);
  var Lft=36,R=14,T=10,P1=120,GAP=32,P2=54,B=n<=14?38:24,H=T+P1+GAP+P2+B,iw=w-Lft-R,cw=iw/n,bw=Math.max(2,Math.min(30,cw*0.62));
  function Yq(v){return T+P1-((v-1)/4)*P1;}
  var s=svgOpen(w,H,L('chart.ariaQuality'));
  for(var v=1;v<=5;v++){s+='<line class="grid" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+f1(Yq(v))+'" y2="'+f1(Yq(v))+'"/><text class="ax" x="'+(Lft-6)+'" y="'+f1(Yq(v)+3.5)+'" text-anchor="end">'+v+'</text>';}
  var seg=[];
  function flush(){if(seg.length>1)s+='<polyline class="qline" points="'+seg.join(' ')+'"/>';seg=[];}
  days.forEach(function(d,i){var r=map[d];if(r)seg.push(f1(Lft+cw*i+cw/2)+','+f1(Yq(r.q)));else flush();});
  flush();
  var rad=n<=30?3.5:2.2;
  days.forEach(function(d,i){var r=map[d];if(r)s+='<circle class="qdot" cx="'+f1(Lft+cw*i+cw/2)+'" cy="'+f1(Yq(r.q))+'" r="'+rad+'"/>';});
  var top2=T+P1+GAP,base2=top2+P2,awMax=3;
  days.forEach(function(d){if(map[d])awMax=Math.max(awMax,map[d].aw);});
  s+='<text class="ax" x="'+Lft+'" y="'+(top2-10)+'">'+esc(L('chart.aw'))+'</text>';
  s+='<line class="grid" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+base2+'" y2="'+base2+'"/><line class="grid" x1="'+Lft+'" x2="'+(w-R)+'" y1="'+top2+'" y2="'+top2+'"/>';
  s+='<text class="ax" x="'+(Lft-6)+'" y="'+(base2+3.5)+'" text-anchor="end">0</text><text class="ax" x="'+(Lft-6)+'" y="'+(top2+3.5)+'" text-anchor="end">'+awMax+'</text>';
  days.forEach(function(d,i){
    var r=map[d];if(!r||!r.aw)return;
    var hh=r.aw/awMax*P2;
    s+='<path class="awbar" d="'+topRound(f1(Lft+cw*i+(cw-bw)/2),f1(base2-hh),f1(bw),f1(hh),3)+'"/>';
  });
  s+=xLabels(days,Lft,cw,base2+14)+hits(days,Lft,cw,T,base2-T);
  return s+'</svg>';
}
function describe(d,rs,prefix){
  var r=byDate(rs)[d],head='<strong>'+(prefix||'')+dateLabel(d)+'</strong>';
  if(!r)return head+L('describe.noRecord');
  return head+' · '+r.bed+' → '+r.wake+' · '+fmtDur(r.d)+' · '+L('describe.quality',{q:r.q,lab:QLAB()[r.q].toLowerCase()})+' · '+formatAw(r.aw)+
    (r.f.length?'<br>'+r.f.map(function(f){return esc(factorName(f));}).join(' · '):'')+(r.note?'<br>“'+esc(r.note)+'”':'');
}
function defaultReadout(rs){
  var el=$('readout');
  if(!rs.length){el.textContent=L('recent.empty');return;}
  el.innerHTML=describe(rs[rs.length-1].date,rs,L('describe.lastNight'));
}
function renderCharts(rs){
  if($('view-analysis').hidden)return;
  rs=rs||rows();
  var w=Math.max(200,Math.floor($('charts').clientWidth)||600);
  ui.lastW=w;
  $('chHours').innerHTML=chartHours(rs,w,ui.range);
  $('chWin').innerHTML=chartWindow(rs,w,ui.range);
  $('chQ').innerHTML=chartQuality(rs,w,ui.range);
  defaultReadout(rs);
}

/* ---------- Promedios ---------- */
function renderAvgs(rs){
  var list=[],t=todayStr(),i,mo=MO_SHORT();
  if(ui.avg==='week'){
    var dd=(pdate(t).getDay()+6)%7,mon=addDays(t,-dd);
    for(i=7;i>=0;i--){
      var st=addDays(mon,-7*i),en=addDays(st,6);
      var pr=rs.filter(function(r){return r.date>=st&&r.date<=en;});
      list.push({lab:L('chart.monthDay',{d:+st.slice(8),m:mo[+st.slice(5,7)-1]}),rows:pr});
    }
  }else{
    var d0=pdate(t);
    for(i=5;i>=0;i--){
      var dm=new Date(d0.getFullYear(),d0.getMonth()-i,1,12),key=dm.getFullYear()+'-'+pad(dm.getMonth()+1);
      list.push({lab:mo[dm.getMonth()]+(dm.getFullYear()!==d0.getFullYear()?' '+String(dm.getFullYear()).slice(2):''),rows:rs.filter(function(r){return r.date.slice(0,7)===key;})});
    }
  }
  var mx=state.goal*60*1.15;
  list.forEach(function(p){var a=avg(p.rows.map(function(r){return r.d;}));p.a=a;if(a!==null)mx=Math.max(mx,a*1.05);});
  var h='';
  list.forEach(function(p){
    if(p.a===null){
      h+='<li class="arow"><span class="a-lab">'+esc(p.lab)+'</span><div class="a-track"><b style="left:'+f1(state.goal*60/mx*100)+'%"></b></div><span class="a-val">—<small>'+L('kpi.noRecords')+'</small></span></li>';
    }else{
      var q=avg(p.rows.map(function(r){return r.q;}));
      h+='<li class="arow"><span class="a-lab">'+esc(p.lab)+'</span><div class="a-track"><i class="'+(p.a>=state.goal*60?'':'low')+'" style="width:'+f1(p.a/mx*100)+'%"></i><b style="left:'+f1(state.goal*60/mx*100)+'%"></b></div><span class="a-val">'+fmtDur(p.a)+'<small>'+L('avgs.cal',{q:num1(q)})+ ' · '+C('kpi.nights',p.rows.length)+'</small></span></li>';
    }
  });
  $('avgList').innerHTML=h;
}
function renderWeekdays(rs){
  var g={0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  rs.forEach(function(r){g[dow(addDays(r.date,-1))].push(r);});
  var order=[1,2,3,4,5,6,0],names=WD_SHORT();
  var mx=state.goal*60*1.1,best=-1,bq=-1,bd=-1;
  order.forEach(function(k){
    var a=avg(g[k].map(function(r){return r.d;}));if(a!==null)mx=Math.max(mx,a);
    if(g[k].length>=2){var q=avg(g[k].map(function(r){return r.q;}));if(q>bq||(q===bq&&a>bd)){bq=q;bd=a;best=k;}}
  });
  var h='';
  order.forEach(function(k){
    var a=avg(g[k].map(function(r){return r.d;})),q=avg(g[k].map(function(r){return r.q;}));
    h+='<div class="wd-col'+(k===best?' best':'')+'"><span class="wd-v">'+(a===null?'—':num1(a/60)+' h')+'</span><div class="wd-bar">'+(a===null?'':'<i style="height:'+f1(a/mx*100)+'%"></i>')+'</div><b>'+esc(names[k])+'</b><span class="wd-q">'+(q===null?'—':L('avgs.cal',{q:num1(q)}))+'</span></div>';
  });
  $('wd').innerHTML=h;
}

/* ---------- Motor de patrones ---------- */
function insights(rs){
  var t=todayStr(),r90=inWin(rs,t,90),out=[];
  if(r90.length<5)return {need:true,n:r90.length,list:[]};
  function ins(lab,text,tone){out.push({lab:lab,text:text,tone:tone||''});}
  var names={};r90.forEach(function(r){r.f.forEach(function(f){names[f]=true;});});
  var fx=[];
  Object.keys(names).forEach(function(f){
    var w=r90.filter(function(r){return r.f.indexOf(f)>=0;}),wo=r90.filter(function(r){return r.f.indexOf(f)<0;});
    if(w.length<3||wo.length<3)return;
    var dq=avg(w.map(function(r){return r.q;}))-avg(wo.map(function(r){return r.q;}));
    var dd=avg(w.map(function(r){return r.d;}))-avg(wo.map(function(r){return r.d;}));
    var da=avg(w.map(function(r){return r.aw;}))-avg(wo.map(function(r){return r.aw;}));
    if(Math.abs(dq)>=0.3||Math.abs(da)>=0.5)fx.push({f:f,w:w,wo:wo,dq:dq,dd:dd,da:da});
  });
  fx.sort(function(a,b){return Math.abs(b.dq)-Math.abs(a.dq);});
  fx.slice(0,3).forEach(function(x){
    var s=L('insights.factorText',{f:esc(factorName(x.f)),a:num1(avg(x.w.map(function(r){return r.q;}))),b:num1(avg(x.wo.map(function(r){return r.q;})))});
    if(Math.abs(x.dd)>=15)s+=L(x.dd<0?'insights.factorLess':'insights.factorMore',{d:fmtDur(Math.abs(x.dd))});
    if(Math.abs(x.da)>=0.5)s+=L(x.da>0?'insights.factorAwMore':'insights.factorAwLess',{n:num1(Math.abs(x.da))});
    ins(L('insights.factorLabel',{n:x.w.length}),s,x.dq<0?'warn':'good');
  });
  var g={};r90.forEach(function(r){var k=dow(addDays(r.date,-1));(g[k]=g[k]||[]).push(r);});
  var arr=[];
  Object.keys(g).forEach(function(k){if(g[k].length>=2)arr.push({k:+k,q:avg(g[k].map(function(r){return r.q;})),d:avg(g[k].map(function(r){return r.d;}))});});
  if(arr.length>=3){
    arr.sort(function(a,b){return b.q-a.q||b.d-a.d;});
    var b=arr[0],wz=arr[arr.length-1],wd=WD_LONG();
    if(b.q-wz.q>=0.4)ins(L('insights.weekdayLabel'),L('insights.weekdayText',{best:wd[b.k],worst:wd[wz.k],q:num1(b.q),d:fmtDur(b.d),q2:num1(wz.q),d2:fmtDur(wz.d)}),'');
  }
  var r30=inWin(rs,t,30);
  if(r30.length>=4){
    var sb=Math.round(sd(r30.map(bedN))),sw=Math.round(sd(r30.map(function(r){return tmin(r.wake);})));
    var lv=sb<=30?L('insights.regVery'):(sb<=60?L('insights.regMod'):L('insights.regIrregular'));
    var txt=L('insights.regularityText',{b:sb,w:sw,lvl:lv})+(sb>60?L('insights.regTip'):'');
    ins(L('insights.regularityLabel'),txt,sb<=30?'good':(sb>60?'warn':''));
  }
  var w7=inWin(rs,t,7);
  if(w7.length>=3){
    var bal=w7.reduce(function(s,r){return s+(state.goal*60-r.d);},0);
    ins(L('insights.debtLabel'),bal>0?L('insights.debtMore',{d:fmtDur(bal),goal:goalTxt()}):L('insights.debtLess',{d:fmtDur(-bal),goal:goalTxt()}),bal>180?'warn':(bal<=0?'good':''));
  }
  var p7=inWin(rs,addDays(t,-7),7);
  if(w7.length>=3&&p7.length>=3){
    var dt=avg(w7.map(function(r){return r.d;}))-avg(p7.map(function(r){return r.d;}));
    if(Math.abs(dt)>=15)ins(L('insights.trendLabel'),L(dt>0?'insights.trendMore':'insights.trendLess',{d:fmtDur(Math.abs(dt))}),dt>0?'good':'warn');
  }
  var fr=r90.filter(function(r){var k=dow(r.date);return k===0||k===6;}),wk=r90.filter(function(r){var k=dow(r.date);return k!==0&&k!==6;});
  if(fr.length>=2&&wk.length>=2){
    function mid(r){return bedN(r)+r.d/2;}
    var dm=avg(fr.map(mid))-avg(wk.map(mid));
    if(Math.abs(dm)>=30)ins(L('insights.weekendLabel'),L('insights.weekendText',{d:Math.round(Math.abs(dm)),dir:L(dm>0?'insights.weekendLater':'insights.weekendEarlier')}),dm>45?'warn':'');
  }
  var hit=r90.filter(function(r){return r.d>=state.goal*60;}),miss=r90.filter(function(r){return r.d<state.goal*60;});
  if(hit.length>=3&&miss.length>=3){
    var qd=avg(hit.map(function(r){return r.q;}))-avg(miss.map(function(r){return r.q;}));
    if(qd>=0.4)ins(L('insights.goalLabel'),L('insights.goalText',{goal:goalTxt(),a:num1(avg(hit.map(function(r){return r.q;}))),b:num1(avg(miss.map(function(r){return r.q;})))}),'good');
  }
  return {need:false,n:r90.length,list:out};
}
function renderInsights(rs){
  var r=insights(rs),h='';
  if(r.need){h='<li style="grid-template-columns:minmax(0,1fr)"><p class="empty" style="margin:0">'+L('insights.need',{n:r.n})+'</p></li>';}
  else if(!r.list.length){h='<li style="grid-template-columns:minmax(0,1fr)"><p class="empty" style="margin:0">'+L('insights.none')+'</p></li>';}
  else r.list.forEach(function(x){h+='<li><span class="dot '+x.tone+'"></span><div><span class="lab">'+x.lab+'</span><p>'+x.text+'</p></div></li>';});
  $('ins').innerHTML=h;
}

/* ---------- Calendario de descanso ---------- */
function shiftMonth(ym,n){
  var p=ym.split('-'),d=new Date(+p[0],+p[1]-1+n,1,12);
  return d.getFullYear()+'-'+pad(d.getMonth()+1);
}
function calState(r){
  if(!r)return {cls:'',key:'calendar.empty'};
  var g=state.goal*60;
  if(r.q>=4&&r.d>=g)return {cls:'cal-opt',key:'calendar.opt'};
  if(r.q<=2||r.d<g*0.75)return {cls:'cal-short',key:'calendar.short'};
  return {cls:'cal-reg',key:'calendar.reg'};
}
function renderCalendar(rs){
  var ym=ui.calYM,p=ym.split('-'),y=+p[0],m=+p[1]-1,mo=MO_LONG(),ws=WD_SHORT(),map=byDate(rs);
  $('calLabel').textContent=mo[m]+' '+y;
  $('calWeek').innerHTML=ws.map(function(w){return '<span>'+esc(w)+'</span>';}).join('');
  var days=new Date(y,m+1,0).getDate(),first=new Date(y,m,1).getDay(),h='';
  for(var i=0;i<first;i++)h+='<span class="cal-blank" aria-hidden="true"></span>';
  for(var day=1;day<=days;day++){
    var date=ym+'-'+pad(day),r=map[date],st=calState(r);
    var aria=+day+' '+mo[m]+' '+y+' · '+(r?fmtDur(r.d)+' · '+L('recent.qualityAria',{q:r.q}):L('calendar.noRecord'));
    h+='<button type="button" class="cal-day '+st.cls+(ui.calSel===date?' sel':'')+'" data-date="'+date+'" aria-pressed="'+(ui.calSel===date)+'" aria-label="'+esc(aria)+'">'+day+'</button>';
  }
  $('calGrid').innerHTML=h;
  var d=$('calDetail');
  if(ui.calSel&&ui.calSel.slice(0,7)===ym){
    var s=calState(map[ui.calSel]);
    d.innerHTML='<div class="cal-detail-head"><strong>'+L('calendar.detail')+'</strong>'+(S.isDemo()?'':'<button type="button" class="ghost" id="calEdit">'+L('calendar.edit')+'</button>')+'</div>'+describe(ui.calSel,rs,'')+'<span class="cal-tag '+s.cls+'">'+L(s.key)+'</span>';
  }else{
    d.innerHTML='<p class="empty" style="margin:0">'+L('calendar.hint')+'</p>';
  }
}

/* ---------- Correlación de factores (tendencia personal, no diagnóstico) ---------- */
function renderCorrelation(rs){
  var names={};
  rs.forEach(function(r){r.f.forEach(function(f){names[f]=true;});});
  var list=[];
  Object.keys(names).forEach(function(f){
    var w=rs.filter(function(r){return r.f.indexOf(f)>=0;});
    var wo=rs.filter(function(r){return r.f.indexOf(f)<0;});
    if(w.length<2||wo.length<2)return;
    var qa=avg(w.map(function(r){return r.q;})),qb=avg(wo.map(function(r){return r.q;}));
    var da=avg(w.map(function(r){return r.d;})),db=avg(wo.map(function(r){return r.d;}));
    list.push({f:f,a:w.length,b:wo.length,qa:qa,qb:qb,da:da,db:db,dq:qa-qb,dd:da-db});
  });
  if(!list.length){$('corrList').innerHTML='<li class="empty">'+L('corr.need')+'</li>';return;}
  list.sort(function(x,y){return Math.abs(y.dq)-Math.abs(x.dq)||Math.abs(y.dd)-Math.abs(x.dd);});
  var h='';
  list.slice(0,8).forEach(function(x){
    var cq=x.dq>=0?'good':'warn',cd=x.dd>=0?'good':'warn';
    h+='<li class="corr-row">'+
      '<div class="corr-name"><b>'+esc(factorName(x.f))+'</b><small>'+L('corr.counts',{a:x.a,b:x.b})+'</small></div>'+
      '<div class="corr-metric"><span class="lab">'+L('corr.quality')+'</span><b class="'+cq+'">'+(x.dq>=0?'+':'−')+num1(Math.abs(x.dq))+'</b><small>'+num1(x.qa)+' vs '+num1(x.qb)+'</small></div>'+
      '<div class="corr-metric"><span class="lab">'+L('corr.duration')+'</span><b class="'+cd+'">'+(x.dd>=0?'+':'−')+fmtDur(Math.abs(x.dd))+'</b><small>'+fmtDur(x.da)+' vs '+fmtDur(x.db)+'</small></div>'+
      '</li>';
  });
  $('corrList').innerHTML=h;
}

/* ---------- Comparación mensual y evolución anual ---------- */
function monthStats(list){
  if(!list.length)return null;
  return {
    n:list.length,
    h:avg(list.map(function(r){return r.d;})),
    q:avg(list.map(function(r){return r.q;})),
    reg:sd(list.map(bedN)),
    debt:avg(list.map(function(r){return Math.max(0,state.goal*60-r.d);}))
  };
}
function monthRows(rs,ym){return rs.filter(function(r){return r.date.slice(0,7)===ym;});}
function signedMin(v){return (v>=0?'+':'−')+fmtDur(Math.abs(v));}
function deltaClass(d,betterHigh){
  var good=betterHigh?d>0:d<0,bad=betterHigh?d<0:d>0;
  return good?'good':(bad?'warn':'');
}
function cmpTile(lab,cur,prev,delta,cls,sub){
  return '<div class="cmp-tile"><span class="lab">'+lab+'</span><b>'+cur+'</b><span class="cmp-prev">'+L('monthly.previous')+': '+prev+'</span><span class="cmp-delta '+(cls||'')+'">'+(delta||'—')+(sub?' '+sub:'')+'</span></div>';
}
function renderMonthly(rs){
  var curYM=todayStr().slice(0,7),prevYM=shiftMonth(curYM,-1);
  var a=monthStats(monthRows(rs,curYM)),b=monthStats(monthRows(rs,prevYM)),h='';
  function tile(lab,va,vb,d,betterHigh,sub){h+=cmpTile(lab,va,vb,d,deltaClass(d,betterHigh),sub);}
  tile(L('monthly.hours'),a?fmtDur(a.h):'—',b?fmtDur(b.h):'—',a&&b?signedMin(a.h-b.h):'',true,'');
  tile(L('monthly.quality'),a?num1(a.q)+' / 5':'—',b?num1(b.q)+' / 5':'—',a&&b?((a.q-b.q>=0?'+':'−')+num1(Math.abs(a.q-b.q))):'',true,'');
  tile(L('monthly.regularity'),a&&a.reg!==null?'±'+Math.round(a.reg)+' min':'—',b&&b.reg!==null?'±'+Math.round(b.reg)+' min':'—',a&&b&&a.reg!==null&&b.reg!==null?signedMin(a.reg-b.reg):'',false,'');
  tile(L('monthly.debt'),a?fmtDur(a.debt):'—',b?fmtDur(b.debt):'—',a&&b?signedMin(a.debt-b.debt):'',false,L('monthly.perNight'));
  $('monthCompare').innerHTML=h;

  $('yearLabel').textContent=String(ui.year);
  var mo=MO_SHORT(),mlong=MO_LONG(),list=[],mx=state.goal*60;
  for(var m=0;m<12;m++){
    var key=ui.year+'-'+pad(m+1),st=monthStats(monthRows(rs,key));
    if(st)mx=Math.max(mx,st.h);
    list.push({ym:key,m:m,st:st});
  }
  var g='';
  list.forEach(function(x){
    var pct=x.st?f1(Math.min(100,x.st.h/mx*100)):0;
    var aria=L('yearly.cellAria',{m:mlong[x.m],y:ui.year,h:x.st?fmtDur(x.st.h):L('monthly.noData'),q:x.st?num1(x.st.q):'—'});
    g+='<button type="button" class="year-cell'+(x.ym===curYM?' cur':'')+'" data-ym="'+x.ym+'" aria-label="'+esc(aria)+'">'+
      '<span class="y-lab">'+esc(mo[x.m])+'</span><span class="y-bar"><i class="'+(x.st&&x.st.h>=state.goal*60?'ok':'')+'" style="height:'+pct+'%"></i></span>'+
      '<span class="y-val">'+(x.st?num1(x.st.h/60)+' h':'—')+'</span><span class="y-q">'+(x.st?num1(x.st.q):'—')+'</span></button>';
  });
  $('yearGrid').innerHTML=g;
}

/* ---------- Historial ---------- */
function renderHistory(rs){
  var dm=S.isDemo(),list=rs.slice().reverse(),shown=list.slice(0,ui.histN),h='',ws=WD_SHORT(),mo=MO_SHORT();
  shown.forEach(function(r){
    var dots='';for(var i=1;i<=5;i++)dots+='<i class="'+(i<=r.q?'on':'')+'"></i>';
    var tags=r.f.map(function(f){return '<span class="t">'+esc(factorName(f))+'</span>';}).join('')+(r.note?'<em>“'+esc(r.note)+'”</em>':'');
    h+='<li class="hrow"><div class="h-date"><b>'+esc(ws[dow(r.date)])+'</b><span>'+(+r.date.slice(8))+' '+esc(mo[+r.date.slice(5,7)-1])+'</span></div>'+
      '<div><div class="h-line"><span class="h-dur">'+fmtDur(r.d)+'</span><span class="h-times">'+r.bed+' → '+r.wake+'</span><span class="dots" role="img" aria-label="'+L('recent.qualityAria',{q:r.q})+'">'+dots+'</span><span class="h-aw">'+formatAw(r.aw)+'</span></div>'+(tags?'<div class="h-tags">'+tags+'</div>':'')+'</div>'+
      (dm?'<div></div>':'<div class="h-act"><button type="button" data-edit="'+r.date+'">'+L('history.edit')+'</button><button type="button" data-del="'+r.date+'" class="'+(ui.confirmDel===r.date?'conf':'')+'">'+(ui.confirmDel===r.date?L('history.confirm'):L('history.delete'))+'</button></div>')+'</li>';
  });
  $('hist').innerHTML=h;
  $('histMore').innerHTML=list.length>shown.length?'<button type="button" class="ghost more" id="moreBtn">'+L('history.showMore',{n:list.length-shown.length})+'</button>':'';
}

/* ---------- Formulario ---------- */
function msg(t,err){
  var el=$('msg');el.textContent=t;el.className=err?'err':'';
  clearTimeout(msg.t);if(!err)msg.t=setTimeout(function(){el.textContent='';},3500);
}
function allFactors(){
  var a=BASE_IDS();
  state.custom.forEach(function(x){if(a.indexOf(x)<0)a.push(x);});
  Object.keys(form.f).forEach(function(x){if(a.indexOf(x)<0)a.push(x);});
  return a;
}
function BASE_IDS(){return S.BASE;}
function renderChips(){
  var h='';
  allFactors().forEach(function(f){
    var on=!!form.f[f],cust=S.BASE.indexOf(f)<0&&state.custom.indexOf(f)>=0;
    h+='<span class="chipw"><button type="button" class="chip" data-f="'+esc(f)+'" aria-pressed="'+on+'">'+esc(factorName(f))+'</button>'+(cust?'<button type="button" class="chip-x" data-fx="'+esc(f)+'" aria-label="'+L('form.customRemove',{name:esc(factorName(f))})+'">×</button>':'')+'</span>';
  });
  $('chips').innerHTML=h;
}
function renderQ(){
  var h='',ql=QLAB();
  for(var i=1;i<=5;i++)h+='<button type="button" data-q="'+i+'" aria-pressed="'+(form.q===i)+'"><b>'+i+'</b><span>'+esc(ql[i])+'</span></button>';
  $('qRow').innerHTML=h;
}
function updateDur(){
  var bed=$('fBed').value,wake=$('fWake').value,v=$('durVal'),fill=$('durFill'),sub=$('durSub');
  if(!bed||!wake){v.textContent='—';fill.style.width='0';fill.className='';sub.textContent=L('form.durIncomplete');return;}
  var d=dur({bed:bed,wake:wake}),g=state.goal*60;
  if(d===0){v.textContent='—';fill.style.width='0';fill.className='';sub.textContent=L('form.durSame');return;}
  var h=Math.floor(d/60),m=d%60;
  v.innerHTML=h+'<small>h</small>'+pad(m)+'<small>min</small>';
  fill.style.width=Math.min(100,d/g*100)+'%';fill.className=d>=g?'met':'';
  var diff=d-g;
  sub.textContent=d>16*60?L('form.durLong'):(Math.abs(diff)<5?L('form.durExact',{goal:goalTxt()}):(diff<0?L('form.durLess',{d:fmtDur(-diff),goal:goalTxt()}):L('form.durMore',{d:fmtDur(diff),goal:goalTxt()})));
}
function syncForm(){
  renderQ();renderChips();
  $('awVal').textContent=form.aw;
  var ex=!!state.entries[$('fDate').value];
  $('saveBtn').textContent=L(ex?'form.update':'form.save');
  $('entryTitle').textContent=L(ex?'form.editTitle':'form.newTitle');
  $('todayBtn').hidden=($('fDate').value===todayStr());
  updateDur();
}
function setForm(date){
  $('fDate').value=date;
  var e=state.entries[date];
  if(e){
    $('fBed').value=e.bed;$('fWake').value=e.wake;form.q=e.q;form.aw=e.aw;form.f={};
    e.f.forEach(function(x){form.f[x]=true;});$('fNote').value=e.note||'';
  }else{form.q=0;form.aw=0;form.f={};$('fNote').value='';}
  syncForm();
}
function initForm(){
  var t=todayStr();
  $('fDate').max=t;
  var last=null,keys=Object.keys(state.entries).sort();
  if(keys.length)last=state.entries[keys[keys.length-1]];
  $('fBed').value=last?last.bed:'23:30';
  var now=new Date(),hr=now.getHours();
  if(hr>=4&&hr<12){$('fWake').value=pad(hr)+':'+pad(Math.floor(now.getMinutes()/5)*5);}
  else $('fWake').value=last?last.wake:'07:30';
  setForm(t);
}
function onSubmit(ev){
  ev.preventDefault();
  var date=$('fDate').value,bed=$('fBed').value,wake=$('fWake').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){msg(L('form.val.date'),true);return;}
  if(date>todayStr()){msg(L('form.val.future'),true);return;}
  if(!bed||!wake){msg(L('form.val.times'),true);return;}
  if(dur({bed:bed,wake:wake})===0){msg(L('form.val.same'),true);return;}
  if(!form.q){msg(L('form.val.quality'),true);return;}
  var f=Object.keys(form.f).filter(function(k){return form.f[k];});
  state.entries[date]={bed:bed,wake:wake,q:form.q,aw:form.aw,f:f,note:$('fNote').value.trim().slice(0,140)};
  S.persist();syncForm();render();
  msg(L(S.storageOK()?'form.saved':'form.saveFail'),!S.storageOK());
}

/* ---------- Copia de seguridad ---------- */
function bmsg(t,err){var el=$('bmsg');el.textContent=t;el.className=err?'err':'';}
function storageMsg(r){return L(r.msg&&String(r.msg).indexOf('backup.')===0?r.msg:'backup.exportNone');}
function doExport(){
  var r=S.exportJSON();
  if(!r.ok){bmsg(storageMsg(r),true);return;}
  var txt=r.text,ta=$('bk');ta.value=txt;ta.focus();ta.select();
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){bmsg(L('backup.jsonCopied'),false);},function(){bmsg(L('backup.jsonManual'),false);});
  }else bmsg(L('backup.jsonManual'),false);
}
function doExportCSV(){
  var r=S.exportCSV();
  if(!r.ok){bmsg(storageMsg(r),true);return;}
  var name='sleeptrack-'+todayStr()+'.csv';
  try{
    if(!window.Blob||!window.URL||!URL.createObjectURL)throw new Error('sin descarga');
    var blob=new Blob(['\uFEFF'+r.text],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);if(a.parentNode)a.parentNode.removeChild(a);},1000);
    bmsg(L('backup.csvDone',{n:C('kpi.nights',r.count)}),false);
  }catch(e){
    var ta=$('bk');ta.value=r.text;ta.focus();ta.select();
    bmsg(L('backup.csvManual'),false);
  }
}
function doImport(){
  var txt=$('bk').value.trim();
  if(!txt){bmsg(L('backup.importEmpty'),true);return;}
  var r=S.importJSON(txt);
  if(!r.ok){bmsg(r.msgText||storageMsg(r),true);return;}
  setForm($('fDate').value||todayStr());render();
  bmsg(L('backup.importDone',{n:C('kpi.nights',r.count)}),false);
}
function doWipe(){
  if(!ui.wipe){
    ui.wipe=true;$('bkWipe').textContent=L('backup.wipeConfirm');
    setTimeout(function(){ui.wipe=false;$('bkWipe').textContent=L('backup.wipe');},4000);return;
  }
  ui.wipe=false;$('bkWipe').textContent=L('backup.wipe');ui.calSel='';
  S.wipe();setForm(todayStr());render();bmsg(L('backup.wipeDone'),false);
}
function doDemoOff(){S.dismissDemo();render();}

/* ---------- Render general ---------- */
function renderFoot(){
  var n=Object.keys(S.ownEntries()).length;
  $('foot').innerHTML=S.storageOK()
    ?'<i></i><span>'+L('foot.ok',{n:C('kpi.nights',n)})+'</span>'
    :'<i class="bad"></i><span>'+L('foot.notOk')+'</span>';
}
function render(){
  var rs=rows();
  $('banner').hidden=!S.isDemo();
  $('goalVal').textContent=goalTxt();
  renderKpis(rs);renderRecent(rs);renderAvgs(rs);renderWeekdays(rs);renderInsights(rs);renderHistory(rs);renderCalendar(rs);renderCorrelation(rs);renderMonthly(rs);renderFoot();
  if(ui.tab==='analysis')renderCharts(rs);
  $('rangeSeg').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-range')===ui.range));});
  $('avgSeg').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-avg')===ui.avg));});
}

/* ---------- Eventos ---------- */
function bind(){
  $('langSel').addEventListener('change',function(ev){I.setLang(ev.target.value);});
  $('tabs').addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-tab]');if(!b)return;
    setTab(b.getAttribute('data-tab'));
  });
  $('tabs').addEventListener('keydown',function(ev){
    var i=TABS.indexOf(ui.tab),next=null;
    if(ev.key==='ArrowRight')next=TABS[(i+1)%TABS.length];
    else if(ev.key==='ArrowLeft')next=TABS[(i+TABS.length-1)%TABS.length];
    else if(ev.key==='Home')next=TABS[0];
    else if(ev.key==='End')next=TABS[TABS.length-1];
    if(!next)return;
    ev.preventDefault();setTab(next);$('tabBtn-'+next).focus();
  });
  $('goHistory').addEventListener('click',function(){setTab('history');});
  $('demoOffBtn').addEventListener('click',doDemoOff);
  $('goalMinus').addEventListener('click',function(){state.goal=Math.max(5,state.goal-0.5);S.persist();render();updateDur();});
  $('goalPlus').addEventListener('click',function(){state.goal=Math.min(10,state.goal+0.5);S.persist();render();updateDur();});
  $('form').addEventListener('submit',onSubmit);
  $('fBed').addEventListener('input',updateDur);
  $('fWake').addEventListener('input',updateDur);
  $('fDate').addEventListener('change',function(){if(!$('fDate').value){$('fDate').value=todayStr();}setForm($('fDate').value);});
  $('todayBtn').addEventListener('click',function(){setForm(todayStr());});
  $('qRow').addEventListener('click',function(ev){var b=ev.target.closest('button[data-q]');if(!b)return;form.q=+b.getAttribute('data-q');renderQ();});
  $('awMinus').addEventListener('click',function(){form.aw=Math.max(0,form.aw-1);$('awVal').textContent=form.aw;});
  $('awPlus').addEventListener('click',function(){form.aw=Math.min(30,form.aw+1);$('awVal').textContent=form.aw;});
  $('chips').addEventListener('click',function(ev){
    var x=ev.target.closest('button[data-fx]');
    if(x){var n=x.getAttribute('data-fx');S.removeCustom(n);delete form.f[n];renderChips();return;}
    var b=ev.target.closest('button[data-f]');if(!b)return;
    var k=b.getAttribute('data-f');if(form.f[k])delete form.f[k];else form.f[k]=true;renderChips();
  });
  function addCustom(){
    var v=$('fCustom').value.trim().slice(0,24);if(!v)return;
    S.addCustom(v);form.f[v]=true;$('fCustom').value='';renderChips();
  }
  $('addCustom').addEventListener('click',addCustom);
  $('fCustom').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();addCustom();}});
  $('fNote').addEventListener('keydown',function(ev){if(ev.key==='Enter'){ev.preventDefault();$('saveBtn').click();}});
  $('rangeSeg').addEventListener('click',function(ev){var b=ev.target.closest('button[data-range]');if(!b)return;ui.range=+b.getAttribute('data-range');render();});
  $('avgSeg').addEventListener('click',function(ev){var b=ev.target.closest('button[data-avg]');if(!b)return;ui.avg=b.getAttribute('data-avg');render();});
  $('calGrid').addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-date]');if(!b)return;
    ui.calSel=b.getAttribute('data-date');renderCalendar(rows());
  });
  $('calPrev').addEventListener('click',function(){ui.calYM=shiftMonth(ui.calYM,-1);ui.calSel='';renderCalendar(rows());});
  $('calNext').addEventListener('click',function(){ui.calYM=shiftMonth(ui.calYM,1);ui.calSel='';renderCalendar(rows());});
  $('calDetail').addEventListener('click',function(ev){
    if(!ev.target.closest('#calEdit')||!ui.calSel)return;
    var d=ui.calSel;setTab('record');setForm(d);$('entryTitle').scrollIntoView({block:'start'});
  });
  $('yearPrev').addEventListener('click',function(){ui.year=Math.max(1970,ui.year-1);renderMonthly(rows());});
  $('yearNext').addEventListener('click',function(){ui.year=Math.min(2100,ui.year+1);renderMonthly(rows());});
  $('yearGrid').addEventListener('click',function(ev){
    var b=ev.target.closest('button[data-ym]');if(!b)return;
    ui.calYM=b.getAttribute('data-ym');ui.calSel='';renderCalendar(rows());
    $('calTitle').scrollIntoView({block:'start'});
  });
  function onHit(ev){var t=ev.target;if(t&&t.classList&&t.classList.contains('hit')){$('readout').innerHTML=describe(t.getAttribute('data-d'),rows(),'');}}
  $('charts').addEventListener('pointerover',onHit);
  $('charts').addEventListener('click',onHit);
  $('charts').addEventListener('pointerleave',function(){defaultReadout(rows());});
  $('hist').addEventListener('click',function(ev){
    var e=ev.target.closest('button[data-edit]');
    if(e){setTab('record');setForm(e.getAttribute('data-edit'));$('entryTitle').scrollIntoView({block:'start'});return;}
    var d=ev.target.closest('button[data-del]');if(!d)return;
    var date=d.getAttribute('data-del');
    if(ui.confirmDel===date){
      delete state.entries[date];ui.confirmDel=null;S.persist();
      if(ui.calSel===date)ui.calSel='';
      if($('fDate').value===date)setForm(date);
      render();
    }else{
      ui.confirmDel=date;renderHistory(rows());
      setTimeout(function(){if(ui.confirmDel===date){ui.confirmDel=null;renderHistory(rows());}},4000);
    }
  });
  $('histMore').addEventListener('click',function(ev){if(ev.target.id==='moreBtn'){ui.histN+=20;renderHistory(rows());}});
  $('bkExport').addEventListener('click',doExport);
  $('bkExportCsv').addEventListener('click',doExportCSV);
  $('bkImport').addEventListener('click',doImport);
  $('bkWipe').addEventListener('click',doWipe);
  var rt=null;
  function onResize(){
    if(ui.tab!=='analysis')return;
    clearTimeout(rt);
    rt=setTimeout(function(){var w=Math.max(200,Math.floor($('charts').clientWidth)||600);if(w!==ui.lastW)renderCharts();},120);
  }
  if(window.ResizeObserver)new ResizeObserver(onResize).observe($('charts'));
  else window.addEventListener('resize',onResize);
}

/* ---------- Service worker ---------- */
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  if(!/^https?:$/.test(location.protocol))return;
  var refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(refreshing)return;
    refreshing=true;window.location.reload();
  });
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js').catch(function(){});
  });
}

function init(){
  S.load();
  /* La migracion a IndexedDB es asincrona: si cambio los datos, refresco la
     interfaz sin alterar el estado que el usuario ya tenia en pantalla. */
  window.addEventListener('sleeptrack:storage-ready',function(ev){
    if(ev&&ev.detail&&ev.detail.changed){renderToday();render();}
  });
  if(S.whenReady)S.whenReady().catch(function(){});
  I.init();
  renderToday();
  I.onChange(function(){
    if(S.refreshDemo)S.refreshDemo();
    renderToday();
    render();
    syncForm();
    if(ui.wipe)$('bkWipe').textContent=L('backup.wipeConfirm');
  });
  bind();
  initForm();
  setTab('record');
  render();
  registerSW();
}
init();
})();
