// Phones under 640px, every page (owner, 4 Nov 2026). Runs in the browser and does nothing from 640px up, so wider screens
// never see it. Three jobs, so that every page gets them without its own markup:
//   tables   a table with more than 3 columns, or that does not fit, becomes one card per row: the first column is the
//            title and the rest are "label: value" lines in the same order, labels read from the table's own header.
//   links    a link alone in its paragraph is a 44px tap target like any other (lib/globals.css [data-pt-tap]).
//   lists    a list of more than 25 items shows 25, then a Show more button adds 25. If the page is still over 15,000px,
//            tall lists of any kind are cut to about 6,000px and then its sections fold under their headings.
// Only data-* attributes change on the page's own elements, which React leaves alone. The first run is inline, right after
// the page, so tables are cards before they are painted; PhoneEnhance.tsx adds the buttons once the page is hydrated and
// repeats the work when a page changes. Styles are in globals.css.
export const PHONE_ENHANCE_JS = `(function(){
var LIMIT=25,MAXH=15000,CAP=6000,user=false,extra=[],RANK=/^(#|no\\.?|rank|position|pos\\.?)$/i;
function pageHeight(){return document.documentElement.scrollHeight}
function narrow(){return window.innerWidth<640}
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
    if(list.closest('nav,.og-menu-panel,.og-mbar,footer,details:not([open])'))return;
    var after=list.tagName==='TBODY'?list.parentElement:list;
    var next=after.nextElementSibling;
    if(next&&next.classList.contains('og-phone-more')&&!list.__ptButton)return;
    var shown=[];
    [].forEach.call(list.children,function(c){if(list.__ptTag&&c.tagName!==list.__ptTag)return;c.removeAttribute('data-pm-hide');if(getComputedStyle(c).display!=='none')shown.push(c)});
    if(!list.__ptLimit)list.__ptLimit=LIMIT;
    var hash=location.hash.length>1?document.getElementById(decodeURIComponent(location.hash.slice(1))):null;
    if(hash&&list.contains(hash))list.__ptLimit=Math.max(list.__ptLimit,shown.findIndex(function(c){return c.contains(hash)})+LIMIT);
    shown.forEach(function(c,i){if(i>=list.__ptLimit)c.setAttribute('data-pm-hide','1')});
    var left=shown.length-list.__ptLimit,b=list.__ptButton;
    if(left<=0){if(b){b.remove();list.__ptButton=null}return}
    if(!buttons)return;
    if(!b||!b.isConnected){
      b=document.createElement('button');b.type='button';b.className='og-phone-more';
      b.addEventListener('click',function(){user=true;list.__ptLimit+=LIMIT;lists(true)});
      if(list.__ptTag)shown[list.__ptLimit-1].after(b);else after.parentNode.insertBefore(b,after.nextSibling);
      list.__ptButton=b;
    }
    b.textContent='Show more ('+left.toLocaleString('en-GB')+' left)';
  });
}
function tall(){
  if(user||pageHeight()<=MAXH)return;
  var all=[].slice.call(document.querySelectorAll('.ng-page .dossier-content, .ng-page .dossier-content *')).reverse();
  for(var i=0;i<all.length&&pageHeight()>MAXH;i++){
    var e=all[i];
    if(e.__ptCapped||e.closest('nav,footer,details:not([open]),.og-menu-panel')||e.getBoundingClientRect().height<=CAP)continue;
    var tags={},kids=[].filter.call(e.children,function(c){return c.getBoundingClientRect().height>0&&!c.hasAttribute('data-pm-hide')});
    kids.forEach(function(c){tags[c.tagName]=(tags[c.tagName]||0)+1});
    var tag=Object.keys(tags).filter(function(t){return !/^(P|H[1-6]|SPAN|A|BR|BUTTON|NAV|FOOTER)$/.test(t)}).sort(function(x,y){return tags[y]-tags[x]})[0];
    if(!tag||tags[tag]<6)continue;
    var items=kids.filter(function(c){return c.tagName===tag}),sum=0,n=0;
    items.forEach(function(c){sum+=c.getBoundingClientRect().height});
    if(sum<e.getBoundingClientRect().height*0.6)continue;
    var run=0;for(n=0;n<items.length;n++){run+=items[n].getBoundingClientRect().height;if(run>CAP&&n>=4)break}
    if(n>=items.length)continue;
    e.__ptCapped=true;e.__ptLimit=n;e.__ptTag=tag;if(extra.indexOf(e)<0)extra.push(e);
    lists(true);
  }
}
function folds(){
  ['h2','h3'].forEach(function(level){
    if(user||pageHeight()<=MAXH)return;
    var hs=[].filter.call(document.querySelectorAll('.ng-page .dossier-content '+level),function(h){return h.getBoundingClientRect().height>0&&!h.closest('nav,footer,table,details:not([open])')});
    if(hs.length<3)return;
    var stop=level==='h2'?/^(H1|H2|FOOTER|NAV)$/:/^(H1|H2|H3|FOOTER|NAV)$/;
    hs.forEach(function(h,idx){
      if(h.__ptFold)return;h.__ptFold=true;
      var items=[],s=h.nextElementSibling;
      while(s&&!stop.test(s.tagName)){items.push(s);s=s.nextElementSibling}
      if(!items.length)return;
      var open=idx===0;
      var set=function(o){h.setAttribute('aria-expanded',o?'true':'false');items.forEach(function(c){if(o)c.removeAttribute('data-pt-fold-hide');else c.setAttribute('data-pt-fold-hide','1')})};
      h.setAttribute('data-pt-fold','1');h.setAttribute('role','button');h.setAttribute('tabindex','0');
      var toggle=function(){user=true;open=!open;set(open)};
      h.addEventListener('click',toggle);
      h.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();toggle()}});
      set(open);
    });
  });
}
window.__ogPhone=function(buttons){if(!narrow())return;tables();links();lists(!!buttons);if(buttons){tall();folds()}};
window.__ogPhone(false);
})();`;
