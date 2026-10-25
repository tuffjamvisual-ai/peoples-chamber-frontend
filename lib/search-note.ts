// The sign up note on /search (owner's plan, step 2, 25 Oct 2026, report 70). Shown once per browser session, on the
// visitor's third search, to visitors who are not signed in and have not dismissed it in the last 30 days. Everything
// is kept in this browser (sessionStorage and localStorage, each read inside try/catch); nothing is sent to the server.
//
// SEARCH_NOTE_JS defines window.__ogNoteSearch(q). It runs as an inline script straight after the note's element on
// a full page load, so the note is visible in the first paint and moves nothing, and it is called again on every
// search submitted from the box (SearchInput.tsx), before the new results load. A search is a query of 2 or more
// characters; the same query twice in a row counts once.
export const SEARCH_NOTE_ID = 'og-snote';
export const SEARCH_NOTE_DISMISS_KEY = 'og_snote_dismissed_until';
export const SEARCH_NOTE_DAYS = 30;

export const SEARCH_NOTE_JS = `window.__ogNoteSearch=function(q){try{
var el=document.getElementById('${SEARCH_NOTE_ID}');q=(q||'').trim();
var show=function(v){if(el)el.setAttribute('data-show',v?'1':'0')};
if(q.length<2)return show(false);
var signedIn=/(^|; )og_signed_in=/.test(document.cookie);try{if(localStorage.getItem('user'))signedIn=true}catch(e){}
if(signedIn)return show(false);
try{if(Number(localStorage.getItem('${SEARCH_NOTE_DISMISS_KEY}')||0)>Date.now())return show(false)}catch(e){}
var ss=window.sessionStorage,n=Number(ss.getItem('og_search_count')||0);
if(ss.getItem('og_search_last')!==q){n++;ss.setItem('og_search_count',String(n));ss.setItem('og_search_last',q)}
var shownFor=ss.getItem('og_snote_shown_for');
if(shownFor!==null)return show(shownFor===q);
if(n>=3){ss.setItem('og_snote_shown_for',q);return show(true)}
show(false)}catch(e){}};`;

/** Run the note's logic for a search (the inline script defines it; defined here if this page was reached client side). */
export function noteSearch(q: string): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __ogNoteSearch?: (q: string) => void };
  if (!w.__ogNoteSearch) {
    try { new Function(SEARCH_NOTE_JS)(); } catch { return; }
  }
  w.__ogNoteSearch?.(q);
}
