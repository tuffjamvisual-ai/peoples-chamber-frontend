import { config } from 'dotenv'; config({ path: '.env.local' });
import pg from 'pg';
const UA='PeoplesChamber/1.0 (+https://www.opengovt.uk; archival copy of GOV.UK OGL press releases)';
const DELAY=800;              // ms between requests (polite ~1.2 req/s)
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

let client;
async function db(){ if(client) return client; client=new pg.Client({connectionString:process.env.DATABASE_URL}); await client.connect(); return client; }
async function q(sql,params){ try{ return await (await db()).query(sql,params); }
  catch(e){ console.log('[db reconnect]',e.message); try{await client?.end();}catch{} client=null; await sleep(1500); return await (await db()).query(sql,params); } }

async function fetchBody(govUrl){
  const path=govUrl.replace(/^https?:\/\/[^/]+/,'');
  for(let attempt=0;attempt<3;attempt++){
    try{
      const res=await fetch(`https://www.gov.uk/api/content${path}`,{headers:{'User-Agent':UA,Accept:'application/json'}});
      if(res.status===404||res.status===410) return {removed:true};
      if(res.status===429){ await sleep(3000*(attempt+1)); continue; }
      if(!res.ok){ if(attempt<2){await sleep(1500*(attempt+1));continue;} return {transient:true}; }
      const j=await res.json();
      return {body:(j.details?.body)||null};
    }catch(e){ if(attempt<2){await sleep(1500*(attempt+1));continue;} return {transient:true}; }
  }
  return {transient:true};
}

const t0=Date.now();
let done=0,stored=0,removed=0,transient=0;
const {rows:[{n:startRemaining}]}=await q("select count(*) n from press_releases where gov_url ilike '%gov.uk%' and body is null and liveness_checked_at is null");
console.log(`[start] ${new Date().toISOString()} remaining=${startRemaining}`);

for(;;){
  const {rows}=await q("select id, gov_url from press_releases where gov_url ilike '%gov.uk%' and body is null and liveness_checked_at is null order by published_at desc nulls last limit 100");
  if(rows.length===0) break;
  for(const r of rows){
    const res=await fetchBody(r.gov_url);
    if(res.body!=null){ await q('update press_releases set body=$1, liveness_checked_at=now(), removed_upstream=false where id=$2',[res.body,r.id]); stored++; }
    else if(res.removed){ await q('update press_releases set liveness_checked_at=now(), removed_upstream=true where id=$1',[r.id]); removed++; }
    else if(res.transient){ await q('update press_releases set liveness_checked_at=now() where id=$1',[r.id]); transient++; }
    else { await q('update press_releases set liveness_checked_at=now() where id=$1',[r.id]); } // 200 but empty body
    done++;
    if(done%50===0){
      const rate=done/((Date.now()-t0)/1000);
      const remaining=startRemaining-done;
      const etaH=(remaining/rate/3600);
      console.log(`[progress] ${new Date().toISOString()} done=${done}/${startRemaining} stored=${stored} removed=${removed} transient=${transient} rate=${rate.toFixed(2)}/s eta=${etaH.toFixed(1)}h`);
    }
    await sleep(DELAY);
  }
}
console.log(`[DONE] ${new Date().toISOString()} done=${done} stored=${stored} removed=${removed} transient=${transient} elapsed=${((Date.now()-t0)/3600000).toFixed(2)}h`);
const {rows:[chk]}=await q("select count(*) filter (where gov_url ilike '%gov.uk%' and body is not null) with_body, count(*) filter (where removed_upstream) removed_n from press_releases");
console.log(`[final] gov.uk with_body=${chk.with_body} removed_upstream=${chk.removed_n}`);
await client?.end();
