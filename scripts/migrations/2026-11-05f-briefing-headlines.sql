-- 2026-11-05f: shorter headlines for 18 briefings, 60 characters or fewer (owner's "yes", 5 Nov 2026). Headline only:
-- public.briefings.headline, matched on public.briefings.slug, the address of the page (/briefings/<slug>). Slugs, bodies,
-- sources, summaries and dates are unchanged; search_vec is a generated column and follows the headline.
-- Either all 18 change or none: for each one the block stops unless the headline is exactly the "before" text and
-- exactly 1 row updates. Old headlines: "Claude outputs/backups/briefing-headlines-before-2026-11-05.csv", written below.
-- Needs no code change and works with the code on main. Undo: restore the headlines from that file.
-- Run from the project folder: psql "$DATABASE_URL" -f scripts/migrations/2026-11-05f-briefing-headlines.sql
-- Then: node scripts/revalidate.js with the briefing pages and the pages that list them.
\set ON_ERROR_STOP on
BEGIN READ WRITE;
SET LOCAL statement_timeout = '60s';
SET LOCAL lock_timeout = '5s';
\copy (SELECT slug AS id, headline AS old_headline FROM public.briefings WHERE slug IN ('920e6b2857', '85f83b42f1', 'efd6a67e16', '57f7c0f6bf', '5d946914c1', '7bb78d3366', '1f7715902c', '31e92efe19', '39fae59df8', '52c0c7633d', '95b73adcf0', '99612fea22', 'a789cb7e7d', 'dc5ff3e650', '9daa8d566a', 'ef9b698039', 'eff6a11636', 'f8627e2be1') ORDER BY slug) TO 'Claude outputs/backups/briefing-headlines-before-2026-11-05.csv' WITH (FORMAT csv, HEADER true)
DO $do$
DECLARE
  r record;
  n integer;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ($h$920e6b2857$h$, $h$Lords set to debate cohabitation rights, undercover policing and genocide determination this week, after years of parliamentary inaction$h$, $h$Lords to debate cohabitation rights and undercover policing$h$),
    ($h$85f83b42f1$h$, $h$Farage Quits Parliament Amid Funding Scandal and Dares Clacton to Elect Him Again$h$, $h$Farage quits Parliament amid funding row, stands again$h$),
    ($h$efd6a67e16$h$, $h$Ann Widdecombe murdered at her Dartmoor home, killer still at large$h$, $h$Ann Widdecombe murdered at Dartmoor home, killer at large$h$),
    ($h$57f7c0f6bf$h$, $h$Starmer faces his last PMQs today as Labour leadership race enters final straight$h$, $h$Starmer's last PMQs as Labour race enters final straight$h$),
    ($h$5d946914c1$h$, $h$Committee of MPs from all parties tells government to pay Universal Credit to people aged 66 facing pension gap$h$, $h$MPs: pay Universal Credit to over 66s facing pension gap$h$),
    ($h$7bb78d3366$h$, $h$Labour nominations close this week and Burnham is on course to be PM by Sunday, but some of his own MPs say a coronation denies members their voice$h$, $h$Burnham on course for PM by Sunday as nominations close$h$),
    ($h$1f7715902c$h$, $h$Farage's £5m gift reported to crime agency as Clacton byelection confirmed for August$h$, $h$Farage's £5m gift reported to crime agency, byelection set$h$),
    ($h$31e92efe19$h$, $h$Farage quits his own seat to dodge standards probe, then tries to win it back$h$, $h$Farage quits his seat amid standards probe, stands again$h$),
    ($h$39fae59df8$h$, $h$Burnham on course to become PM unopposed as Labour nominations open$h$, $h$Burnham on course to be PM unopposed as nominations open$h$),
    ($h$52c0c7633d$h$, $h$MPs accuse government of a moral betrayal over student loan freeze it promised would never happen$h$, $h$MPs accuse government of moral betrayal on student loans$h$),
    ($h$95b73adcf0$h$, $h$Burnham Set to Be Crowned PM Tomorrow With No One to Stop Him$h$, $h$Burnham set to be confirmed as PM tomorrow, unopposed$h$),
    ($h$99612fea22$h$, $h$MPs Say Thousands of People Aged 66 Are Being Left on £425 a Month While They Wait for a Pension$h$, $h$MPs: thousands aged 66 left on £425 a month awaiting pension$h$),
    ($h$a789cb7e7d$h$, $h$Drugs deal with the US could cause 229,000 NHS deaths, BMJ analysis finds$h$, $h$US drugs deal could cause 229,000 NHS deaths, BMJ finds$h$),
    ($h$dc5ff3e650$h$, $h$Burnham's Coronation Begins as Labour Nominations Open With No Serious Challenger Left$h$, $h$Labour nominations open with no serious rival to Burnham$h$),
    ($h$9daa8d566a$h$, $h$South East Water's boss is gone but regulators still haven't fixed the company that left Tunbridge Wells without water for two weeks$h$, $h$Tunbridge Wells water: boss gone, regulators yet to act$h$),
    ($h$ef9b698039$h$, $h$Farage quits parliament to dodge standards probe, dares Clacton to elect him again$h$, $h$Farage quits Parliament, dares Clacton to elect him again$h$),
    ($h$eff6a11636$h$, $h$Electoral Commission probing SNP over taxpayer cash after Murrell embezzlement conviction$h$, $h$Electoral Commission probes SNP after Murrell conviction$h$),
    ($h$f8627e2be1$h$, $h$Farage Quits Parliament to Dodge Standards Probe, Then Immediately Tries to Win His Seat Back$h$, $h$Farage quits Parliament amid standards probe, stands again$h$)
  ) AS t(slug, before_text, after_text) LOOP
    UPDATE public.briefings SET headline = r.after_text WHERE slug = r.slug AND headline = r.before_text;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN
      RAISE EXCEPTION 'briefing %: % rows matched its before text, expected 1', r.slug, n;
    END IF;
  END LOOP;
END
$do$;
COMMIT;
