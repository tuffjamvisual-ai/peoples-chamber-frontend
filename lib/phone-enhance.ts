// Phones under 640px, and phones held sideways (RT1, lib/breakpoints.ts), every page (owner, 4 Nov 2026). Runs in the browser and does nothing from 640px up, so wider screens
// never see it. Three jobs, so that every page gets them without its own markup:
//   tables   a table with more than 3 columns, or that does not fit, becomes one card per row: the first column is the
//            title and the rest are "label: value" lines in the same order, labels read from the table's own header.
//   links    a link alone in its paragraph is a 44px tap target like any other (lib/globals.css [data-pt-tap]).
//   lists    a list of more than 25 items opens with 3, then Show 10 more adds 10, Show fewer goes back to 3, and the count
//            beside them says what shows ('3 of 241') (ENTRY 239 A4, MOB-LISTS, owner rule 17 Nov 2026; was 25 and 25). If the page is still over 9,800px
//            once it has loaded (owner, 5 Nov 2026: 10,000px at most as a page first opens), tall lists of any kind are cut
//            to about 6,000px, then 3,000px, then 1,500px, and then its sections fold under their headings.
// What it leaves alone (owner, 5 Nov 2026): the long page shortening runs once per page, when the page has loaded, and never
// on a page with its own folds (PhoneFolds, .pf-list; a report, [data-own-folds], is folded on the server, lib/editorials/phone-folds.ts). Nothing inside a fold or a <details> is cut, folded or given a button,
// a list marked data-own-more has its own Show more (PhoneMore.tsx), and once the reader has opened something no list
// gets a new limit. So a press can never shorten what is on the page, or hide what comes after it.
// Back and Forward (owner, 5 Nov 2026): the scroll position and any heading folds left open are kept in sessionStorage
// when a link is followed, and put back on the way back, as content arrives. window.__ogBack tells PhoneFolds it is a return.
// Only data-* attributes change on the page's own elements, which React leaves alone. The first run is inline, right after
// the page, so tables are cards before they are painted; PhoneEnhance.tsx adds the buttons once the page is hydrated and
// repeats the work when a page changes. Styles are in globals.css.
import { PHONE, LIST_FOLD } from './breakpoints';

export const PHONE_ENHANCE_JS = `(function(){
var LIMIT=25,FIRST=3,LSTEP=10,MAXH=9800,CAPS=[6000,3000,1500],opened=false,done=null,wait=0,here=location.href,path=location.pathname,extra=[],OWN='nav,.og-menu-panel,.og-mbar,footer,details,.pf-list,[data-own-more]',BACK='og-phone-back:',RANK=/^(#|no\\.?|rank|position|pos\\.?)$/i;
function pageHeight(){return document.documentElement.scrollHeight}
function narrow(){return window.matchMedia(${JSON.stringify(PHONE)}).matches}
// Tablets (T1-TABFOLD, owner approved 13 Nov 2026): only the long lists job, up to 1,023px.
function listsWide(){return window.matchMedia(${JSON.stringify(LIST_FOLD)}).matches}
function text(e){return (e.textContent||'').replace(/[\\u25B2\\u25BC\\u25B4\\u25BE]/g,'').replace(/\\s+/g,' ').trim()}
function labels(t){
  var head=t.tHead&&t.tHead.rows.length?t.tHead.rows[t.tHead.rows.length-1]:null,body=false;
  if(!head&&t.rows.length){var r=t.rows[0],all=r.cells.length>0;for(var i=0;i<r.cells.length;i++)if(r.cells[i].tagName!=='TH')all=false;if(all){head=r;body=true}}
  var out=[];if(head)for(var c=0;c<head.cells.length;c++){var s=head.cells[c].colSpan||1;for(var k=0;k<s;k++)out.push(text(head.cells[c]))}
  return {list:out,row:body?head:null};
}
function tables(){
  document.querySelectorAll('.ng-page table').forEach(function(t){
    if(t.getAttribute('data-pt-table')==='keep'||!t.rows.length)return;
    var cards=t.getAttribute('data-pt-table')==='cards';
    var count=0;for(var i=0;i<Math.min(t.rows.length,4);i++){var n=0;for(var j=0;j<t.rows[i].cells.length;j++)n+=t.rows[i].cells[j].colSpan||1;count=Math.max(count,n)}
    if(count<2)return;
    if(!cards){
      var box=t.parentElement,room=Math.min(box?box.clientWidth:343,window.innerWidth);
      if(count<=3&&t.scrollWidth<=room+1&&t.offsetWidth<=room+1)return;
    }
    var l=labels(t);
    var first=t.tBodies[0]&&t.tBodies[0].rows[0];
    var rank=l.list.length?RANK.test(l.list[0]):false;
    if(!rank&&first&&first.cells.length>2&&/^\\d{1,4}\\.?$/.test(text(first.cells[0])))rank=true;
    var hidden={};
    if(!cards&&first){var ci=0;for(var h=0;h<first.cells.length;h++){if(getComputedStyle(first.cells[h]).display==='none')hidden[ci]=1;ci+=first.cells[h].colSpan||1}}
    if(l.row)l.row.setAttribute('data-pt','head');
    if(t.tHead){var ctrl=false;t.tHead.querySelectorAll('th,td').forEach(function(th){if(th.querySelector('a,button')){th.setAttribute('data-pt','ctrl');ctrl=true}});if(ctrl)t.setAttribute('data-pt-sort','1')}
    var bodies=[].slice.call(t.tBodies);if(t.tFoot)bodies.push(t.tFoot);
    bodies.forEach(function(b){[].slice.call(b.rows).forEach(function(row){
      if(row===l.row)return;
      var col=0;
      [].slice.call(row.cells).forEach(function(cell){
        var span=cell.colSpan||1,at=col;col+=span;
        if(cell.hasAttribute('data-pt'))return;
        if(span>1&&row.cells.length===1){cell.setAttribute('data-pt','full');return}
        if(hidden[at]){cell.setAttribute('data-pt','hide');return}
        if(/^[,\\u2013\\u2014-]*$/.test(text(cell))&&!cell.querySelector('img,svg,button,a,input')){cell.setAttribute('data-pt','empty');return}
        var title=rank?1:0;
        if(at===title)cell.setAttribute('data-pt','title');else if(rank&&at===0)cell.setAttribute('data-pt','rank');else cell.setAttribute('data-pt','line');
        if(!cell.hasAttribute('data-label')&&at!==title&&!(rank&&at===0))cell.setAttribute('data-label',l.list[at]||'');
      });
    })});
    t.setAttribute('data-pt-table','cards');
  });
}
function links(){
  document.querySelectorAll('.ng-page p a,.ng-page blockquote a,.ng-page figcaption a').forEach(function(a){
    if(a.closest('footer')||a.hasAttribute('data-pt-tap'))return;
    var b=a.closest('p,blockquote,figcaption');
    if(text(b).length<=text(a).length+15)a.setAttribute('data-pt-tap','1');
  });
}
function lists(buttons){
  var found=[].slice.call(document.querySelectorAll('.ng-page ul,.ng-page ol,.ng-page tbody')).concat(extra);
  found.forEach(function(list){
    if(list.children.length<=LIMIT&&!list.__ptButton&&!list.__ptTag)return;
    if(list.closest(OWN)||(opened&&!list.__ptLimit))return;
    var after=list.tagName==='TBODY'?list.parentElement:list;
    var next=after.nextElementSibling;
    if(next&&next.classList.contains('og-phone-more')&&!list.__ptButton)return;
    var shown=[];
    [].forEach.call(list.children,function(c){if(list.__ptTag&&c.tagName!==list.__ptTag)return;c.removeAttribute('data-pm-hide');if(getComputedStyle(c).display!=='none')shown.push(c)});
    if(!list.__ptLimit)list.__ptLimit=FIRST;
    var hash=location.hash.length>1?document.getElementById(decodeURIComponent(location.hash.slice(1))):null;
    if(hash&&list.contains(hash))list.__ptLimit=Math.max(list.__ptLimit,shown.findIndex(function(c){return c.contains(hash)})+1);
    shown.forEach(function(c,i){if(i>=list.__ptLimit)c.setAttribute('data-pm-hide','1')});
    var left=shown.length-list.__ptLimit,b=list.__ptButton;
    if(!buttons)return;
    if(!b||!b.isConnected){
      var cnt=document.createElement('p');cnt.className='og-more-count';cnt.setAttribute('aria-live','polite');
      b=document.createElement('button');b.type='button';b.className='og-phone-more';
      b.addEventListener('click',function(){list.__ptLimit+=LSTEP;lists(true)});
      var few=document.createElement('button');few.type='button';few.className='og-phone-more st-fewer';few.textContent='Show fewer';
      few.addEventListener('click',function(){list.__ptLimit=FIRST;lists(true);var r=list.getBoundingClientRect();if(r.top<0)list.scrollIntoView({block:'start'})});
      if(list.__ptTag&&list.tagName!=='TBODY')shown[Math.min(list.__ptLimit,shown.length)-1].after(cnt,b,few);else after.after(cnt,b,few);
      list.__ptButton=b;b.__count=cnt;b.__fewer=few;
    }
    b.__count.textContent=Math.min(list.__ptLimit,shown.length).toLocaleString('en-GB')+' of '+shown.length.toLocaleString('en-GB');
    // A list cut by the tall-page code (__ptTag) keeps its count and buttons right after the last item showing (T2, 17 Nov).
    if(list.__ptTag&&list.tagName!=='TBODY')shown[Math.min(list.__ptLimit,shown.length)-1].after(b.__count,b,b.__fewer);
    b.style.display=left>0?'':'none';
    b.__fewer.style.display=list.__ptLimit>FIRST?'':'none';
    b.textContent='Show '+Math.min(LSTEP,Math.max(left,0)).toLocaleString('en-GB')+' more';
  });
}
function tall(){CAPS.forEach(function(cap){tallTo(cap)})}
function tallTo(cap){
  if(pageHeight()<=MAXH)return;
  var all=[].slice.call(document.querySelectorAll('.ng-page .dossier-content, .ng-page .dossier-content *')).reverse();
  for(var i=0;i<all.length&&pageHeight()>MAXH;i++){
    var e=all[i];
    if(e.closest(OWN)||e.getBoundingClientRect().height<=cap)continue;
    var tags={},kids=[].filter.call(e.children,function(c){return c.getBoundingClientRect().height>0&&!c.hasAttribute('data-pm-hide')});
    kids.forEach(function(c){tags[c.tagName]=(tags[c.tagName]||0)+1});
    var tag=Object.keys(tags).filter(function(t){return !/^(P|H[1-6]|SPAN|BR|BUTTON|NAV|FOOTER)$/.test(t)}).sort(function(x,y){return tags[y]-tags[x]})[0];
    if(!tag||tags[tag]<6)continue;
    var items=kids.filter(function(c){return c.tagName===tag}),sum=0,n=0;
    items.forEach(function(c){sum+=c.getBoundingClientRect().height});
    if(sum<e.getBoundingClientRect().height*0.6||(tag==='A'&&sum/items.length<150))continue;
    var run=0;for(n=0;n<items.length;n++){run+=items[n].getBoundingClientRect().height;if(run>cap&&n>=4)break}
    if(n>=items.length)continue;
    e.__ptLimit=n;e.__ptTag=tag;if(extra.indexOf(e)<0)extra.push(e);
    lists(true);
  }
}
function folds(){
  ['h2','h3'].forEach(function(level){
    if(pageHeight()<=MAXH)return;
    var hs=[].filter.call(document.querySelectorAll('.ng-page .dossier-content '+level),function(h){return h.getBoundingClientRect().height>0&&!h.closest('table,'+OWN)&&!h.querySelector('a,button,summary')});
    if(hs.length<3)return;
    var stop=level==='h2'?/^(H1|H2|FOOTER|NAV)$/:/^(H1|H2|H3|FOOTER|NAV)$/;
    hs.forEach(function(h,idx){
      if(h.__ptFold)return;h.__ptFold=true;
      var items=[],s=h.nextElementSibling;
      while(s&&!stop.test(s.tagName)){items.push(s);s=s.nextElementSibling}
      if(!items.length)return;
      var open=idx===0,saved=window.__ogBack===address()&&readBack();
      if(saved&&saved.f)open=saved.f.indexOf(h.textContent)>=0;
      var set=function(o){h.setAttribute('aria-expanded',o?'true':'false');items.forEach(function(c){if(o)c.removeAttribute('data-pt-fold-hide');else c.setAttribute('data-pt-fold-hide','1')})};
      h.setAttribute('data-pt-fold','1');h.setAttribute('role','button');h.setAttribute('tabindex','0');
      var toggle=function(){opened=true;open=!open;set(open)};
      h.addEventListener('click',toggle);
      h.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle()}});
      set(open);
    });
  });
}
function address(){return location.pathname+location.search}
function readBack(){try{return JSON.parse(sessionStorage.getItem(BACK+address())||'null')}catch(e){return null}}
function saveBack(){
  if(!narrow())return;
  try{sessionStorage.setItem(BACK+address(),JSON.stringify({y:window.scrollY,f:[].map.call(document.querySelectorAll('[data-pt-fold][aria-expanded="true"]'),function(h){return h.textContent})}))}catch(e){}
}
function returning(){
  if(!narrow())return;
  window.__ogBack=address();
  var saved=readBack(),tries=0,calm=0;
  if(!saved||!saved.y)return;
  // Content arrives after a return (folds opening, panels loading), so the place is set again until it holds. A touch
  // or a wheel means the reader has moved on, and it stops.
  var stop=function(){clearInterval(timer);window.removeEventListener('touchstart',stop);window.removeEventListener('wheel',stop)};
  var timer=setInterval(function(){
    tries++;
    if(Math.abs(window.scrollY-saved.y)>4)window.scrollTo(0,saved.y);
    calm=Math.abs(window.scrollY-saved.y)<=4?calm+1:0;
    if(calm>=6||tries>=30)stop();
  },120);
  window.addEventListener('touchstart',stop,{passive:true});window.addEventListener('wheel',stop,{passive:true});
}
function shorten(){
  if(done===path||document.readyState!=='complete')return;
  done=path;
  if(opened||document.querySelector('.pf-list,[data-own-folds]'))return;
  tall();folds();
}
// Growing lists step by 10 (owner, 15 Nov 2026, COWORK-TO-T1 ENTRY 135 M3 and M7, 141 N6): a list's "Show N more" fold
// (details[data-step-style]: NoJsPager, DataList, the questions and debates lists) opens the whole of the rest without
// JavaScript; with it, on phones and tablets each press shows 10 more by moving the list's own hide rule (the <style> named
// in data-step-style, :nth-child(n+<data-step-from>); or, with data-step-rank, rows marked data-rank from data-step-from - 1
// on are let through 10 at a time), and the fold opens only for the last of them. Once more than the
// first rows show, a "Show fewer" button after the fold goes back to the first rows; the open fold's own summary says
// "Show fewer" too.
var STEP=10;
function stepLabel(d,left){var m=d.querySelector('.st-more');if(!m)return;var n=Math.min(STEP,left),one=d.getAttribute('data-step-one'),many=d.getAttribute('data-step-many');m.textContent='Show '+n.toLocaleString('en-GB')+' more'+(one?' '+(n===1?one:many):'')}
function stepTo(d,added){
  var st=document.getElementById(d.getAttribute('data-step-style'));if(!st)return;
  if(st.__orig==null)st.__orig=st.textContent;
  var from=+d.getAttribute('data-step-from');
  var rank=d.getAttribute('data-step-rank'),not='';
  if(rank){for(var k=from-1;k<from-1+added;k++)not+=':not([data-rank="'+k+'"])';st.textContent=added?st.__orig.split(rank).join(rank+not):st.__orig}
  else st.textContent=added?st.__orig.split(':nth-child(n+'+from).join(':nth-child(n+'+(from+added)):st.__orig;
  d.__added=added;
  stepLabel(d,+d.getAttribute('data-step-left')-added);
  var f=d.__fewer;
  if(added>0&&!(f&&f.isConnected)){
    f=document.createElement('button');f.type='button';f.className='og-phone-more st-fewer';f.textContent='Show fewer';
    f.addEventListener('click',function(){d.open=false;stepTo(d,0);var r=d.getBoundingClientRect();if(r.top<0)d.scrollIntoView({block:'center'})});
    d.after(f);d.__fewer=f;
  }
  if(!added&&f){f.remove();d.__fewer=null}
}
document.addEventListener('click',function(e){
  var s=e.target.closest&&e.target.closest('details[data-step-style] > summary');
  if(!s||!listsWide())return;
  var d=s.parentElement;
  if(d.open){setTimeout(function(){stepTo(d,0)},0);return}
  var added=(d.__added||0)+STEP,left=+d.getAttribute('data-step-left');
  if(added>=left){if(d.__fewer){d.__fewer.remove();d.__fewer=null}return}
  e.preventDefault();stepTo(d,added);
});
// MoreChain on phones and tablets (Cowork ENTRY 152 item 1, owner rule, 16 Nov 2026): /petitions, /edms/[id] and the PMQs
// archive keep 25 a press from 1,024px up and without JavaScript; with it, up to 1,023px, each press adds 10 across the
// chain: its folds open as the rows reach them (their own summaries hidden, .mc-js), rows past the step are hidden (.mc-h),
// and "Show N more" and "Show fewer" buttons follow the chain. "Show fewer" goes back to the opening rows and folds.
function chainOf(d){
  while(d.parentElement&&d.parentElement.matches('details.mc-more'))d=d.parentElement;
  if(d.__chain)return d.__chain;
  var first=d.previousElementSibling;if(!first||!first.classList.contains('mc-first'))return null;
  var pf=3;for(var k=1;k<5;k++)if(first.classList.contains('mc-pf'+k))pf=k;
  var items=[].slice.call(first.children),ds=[],x=d;
  while(x){x.__start=items.length;ds.push(x);var l=x.querySelector(':scope > ul, :scope > ol');if(l)items=items.concat([].slice.call(l.children));x=x.querySelector(':scope > details.mc-more')}
  pf=Math.min(pf,items.length);
  d.__chain={first:first,top:d,pf:pf,items:items,ds:ds,n:pf};return d.__chain;
}
function chainShow(c,n){
  n=Math.min(n,c.items.length);c.n=n;var on=n>c.pf;
  c.items.forEach(function(e,i){e.classList.toggle('mc-h',on&&i>=n)});
  c.ds.forEach(function(d,j){d.classList.toggle('mc-js',on);d.open=on&&(j===0||d.__start<n)});
  if(!on){if(c.more){c.more.remove();c.fewer.remove();c.more=c.fewer=null}return}
  if(!c.more){
    c.more=document.createElement('button');c.more.type='button';c.more.className='og-phone-more';
    c.more.addEventListener('click',function(){chainShow(c,c.n+STEP)});
    c.fewer=document.createElement('button');c.fewer.type='button';c.fewer.className='og-phone-more st-fewer';c.fewer.textContent='Show fewer';
    c.fewer.addEventListener('click',function(){chainShow(c,c.pf);var r=c.first.getBoundingClientRect();if(r.top<0)c.first.scrollIntoView({block:'start'})});
    c.top.after(c.more,c.fewer);
  }
  var left=c.items.length-n;
  c.more.style.display=left>0?'':'none';c.more.textContent='Show '+Math.min(STEP,left).toLocaleString('en-GB')+' more';
}
document.addEventListener('click',function(e){
  var s=e.target.closest&&e.target.closest('details.mc-more > summary');
  if(!s||!listsWide())return;
  var c=chainOf(s.parentElement);if(!c)return;
  e.preventDefault();chainShow(c,c.n+STEP);
});
window.__ogPhone=function(buttons){
  if(location.href!==here){
    here=location.href;
    if(location.pathname!==path){path=location.pathname;opened=false;clearTimeout(wait);wait=setTimeout(function(){wait=0;if(narrow())shorten()},1000)}
  }
  if(!narrow()){if(listsWide())lists(!!buttons);return}
  tables();links();lists(!!buttons);
  if(buttons&&!wait)shorten();
};
document.addEventListener('click',function(e){
  var t=e.target.closest&&e.target.closest('summary,[aria-expanded],[data-pt-fold]');
  if(t&&!t.closest('nav,.og-menu-panel,.og-mbar,footer'))opened=true;
  // A link within the page (#...) is not leaving it: no place to come back to (T1-MOB, 11 Nov 2026).
  var lk=e.target.closest&&e.target.closest('a[href]');
  if(lk&&!/^#/.test(lk.getAttribute('href')||'')){saveBack();window.__ogBack=null}
},true);
window.addEventListener('pagehide',saveBack);
// A move within the page (only the #fragment changes, which also fires popstate) is not a return: the place is not
// set back, or an in-page shortcut would snap back to where it was tapped (T1-MOB, 11 Nov 2026).
window.addEventListener('popstate',function(){if(location.href.split('#')[0]!==here.split('#')[0])returning()});
try{var nav=performance.getEntriesByType('navigation')[0];if(nav&&nav.type==='back_forward')returning()}catch(e){}
window.__ogPhone(false);
})();`;
