-- Step 3 of the house style change (no dashes or hyphens in our own prose): database text.
-- Briefings (headline, body), poll questions and explainers, and news commentary.
-- Each change is an exact phrase, checked to occur once in its row before it is replaced.
-- Quotes, names and official titles are left alone. Originals are kept in style_backup_20261017.
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE public.style_backup_20261017 AS
  SELECT 'briefings'::text AS tbl, slug::text AS row_key, jsonb_build_object('headline', headline, 'body', body) AS original FROM public.briefings
  UNION ALL SELECT 'polls', id::text, jsonb_build_object('question', question, 'explainer', explainer) FROM public.polls
  UNION ALL SELECT 'uk_political_news', id::text, jsonb_build_object('commentary', commentary) FROM public.uk_political_news;
ALTER TABLE public.style_backup_20261017 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.style_backup_20261017 FROM anon, authenticated;

DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Clacton by-election confirmed$t$, ''))) / length($t$Clacton by-election confirmed$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$Clacton by-election confirmed$t$, $t$Clacton byelection confirmed$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$from crypto-billionaire and Reform donor$t$, ''))) / length($t$from crypto-billionaire and Reform donor$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$from crypto-billionaire and Reform donor$t$, $t$from cryptocurrency billionaire and Reform donor$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$under anti-money laundering rules$t$, ''))) / length($t$under anti-money laundering rules$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$under anti-money laundering rules$t$, $t$under anti money laundering rules$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$adds a criminal-law dimension$t$, ''))) / length($t$adds a criminal-law dimension$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$adds a criminal-law dimension$t$, $t$adds a criminal law dimension$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$in the resulting by-election, set for$t$, ''))) / length($t$in the resulting by-election, set for$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$in the resulting by-election, set for$t$, $t$in the resulting byelection, set for$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Farage's highest-profile opponent$t$, ''))) / length($t$Farage's highest-profile opponent$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Farage's highest-profile opponent$t$, $t$Farage's most prominent opponent$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$1f7715902c$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$triggering a second by-election.$t$, ''))) / length($t$triggering a second by-election.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 1f7715902c: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$triggering a second by-election.$t$, $t$triggering a second byelection.$t$) WHERE slug::text = $t$1f7715902c$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 1f7715902c: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$31e92efe19$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$triggering a by-election he intends$t$, ''))) / length($t$triggering a by-election he intends$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 31e92efe19: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$triggering a by-election he intends$t$, $t$triggering a byelection he intends$t$) WHERE slug::text = $t$31e92efe19$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 31e92efe19: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$31e92efe19$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$funded by long-time associate$t$, ''))) / length($t$funded by long-time associate$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 31e92efe19: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$funded by long-time associate$t$, $t$funded by longstanding associate$t$) WHERE slug::text = $t$31e92efe19$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 31e92efe19: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$31e92efe19$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$under anti-money laundering rules$t$, ''))) / length($t$under anti-money laundering rules$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 31e92efe19: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$under anti-money laundering rules$t$, $t$under anti money laundering rules$t$) WHERE slug::text = $t$31e92efe19$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 31e92efe19: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$39fae59df8$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$the Makerfield by-election$t$, ''))) / length($t$the Makerfield by-election$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 39fae59df8: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$the Makerfield by-election$t$, $t$the Makerfield byelection$t$) WHERE slug::text = $t$39fae59df8$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 39fae59df8: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$52c0c7633d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$The cross-party Treasury Committee has$t$, ''))) / length($t$The cross-party Treasury Committee has$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 52c0c7633d: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$The cross-party Treasury Committee has$t$, $t$The Treasury Committee, with members from across the parties, has$t$) WHERE slug::text = $t$52c0c7633d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 52c0c7633d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$52c0c7633d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$were effectively mis-sold their loans$t$, ''))) / length($t$were effectively mis-sold their loans$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 52c0c7633d: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$were effectively mis-sold their loans$t$, $t$had effectively been wrongly sold their loans$t$) WHERE slug::text = $t$52c0c7633d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 52c0c7633d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$57f7c0f6bf$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$the Makerfield by-election$t$, ''))) / length($t$the Makerfield by-election$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 57f7c0f6bf: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$the Makerfield by-election$t$, $t$the Makerfield byelection$t$) WHERE slug::text = $t$57f7c0f6bf$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 57f7c0f6bf: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$5d946914c1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Cross-party committee tells government to pay Universal Credit to 66-year-olds facing pension gap$t$, ''))) / length($t$Cross-party committee tells government to pay Universal Credit to 66-year-olds facing pension gap$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline 5d946914c1: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$Cross-party committee tells government to pay Universal Credit to 66-year-olds facing pension gap$t$, $t$Committee of MPs from all parties tells government to pay Universal Credit to people aged 66 facing pension gap$t$) WHERE slug::text = $t$5d946914c1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 5d946914c1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$5d946914c1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$A cross-party committee of MPs has told the government it must increase Universal Credit for 66-year-olds or$t$, ''))) / length($t$A cross-party committee of MPs has told the government it must increase Universal Credit for 66-year-olds or$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 5d946914c1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$A cross-party committee of MPs has told the government it must increase Universal Credit for 66-year-olds or$t$, $t$A committee of MPs from across the parties has told the government it must increase Universal Credit for people aged 66 or$t$) WHERE slug::text = $t$5d946914c1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 5d946914c1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$5d946914c1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Without action, 66-year-olds in the gap year$t$, ''))) / length($t$Without action, 66-year-olds in the gap year$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 5d946914c1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Without action, 66-year-olds in the gap year$t$, $t$Without action, people aged 66 in the gap year$t$) WHERE slug::text = $t$5d946914c1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 5d946914c1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$5d946914c1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$least likely to be working full-time.$t$, ''))) / length($t$least likely to be working full-time.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 5d946914c1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$least likely to be working full-time.$t$, $t$least likely to be working full time.$t$) WHERE slug::text = $t$5d946914c1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 5d946914c1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$5d946914c1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$It is cross-party, giving$t$, ''))) / length($t$It is cross-party, giving$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 5d946914c1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$It is cross-party, giving$t$, $t$Its members come from across the parties, giving$t$) WHERE slug::text = $t$5d946914c1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 5d946914c1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$7bb78d3366$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$to give more decision-making authority to regional governments$t$, ''))) / length($t$to give more decision-making authority to regional governments$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 7bb78d3366: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$to give more decision-making authority to regional governments$t$, $t$to give regional governments more authority to make decisions$t$) WHERE slug::text = $t$7bb78d3366$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 7bb78d3366: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$85f83b42f1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$George Cottrell, a long-time aide$t$, ''))) / length($t$George Cottrell, a long-time aide$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 85f83b42f1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$George Cottrell, a long-time aide$t$, $t$George Cottrell, a longstanding aide$t$) WHERE slug::text = $t$85f83b42f1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 85f83b42f1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$85f83b42f1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$will fight the by-election he just caused$t$, ''))) / length($t$will fight the by-election he just caused$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 85f83b42f1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$will fight the by-election he just caused$t$, $t$will fight the byelection he just caused$t$) WHERE slug::text = $t$85f83b42f1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 85f83b42f1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$85f83b42f1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Farage is betting Clacton re-elects him anyway.$t$, ''))) / length($t$Farage is betting Clacton re-elects him anyway.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 85f83b42f1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Farage is betting Clacton re-elects him anyway.$t$, $t$Farage is betting Clacton elects him again anyway.$t$) WHERE slug::text = $t$85f83b42f1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 85f83b42f1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$85f83b42f1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Kemi Badenoch called the by-election a "gimmick."$t$, ''))) / length($t$Kemi Badenoch called the by-election a "gimmick."$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 85f83b42f1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Kemi Badenoch called the by-election a "gimmick."$t$, $t$Kemi Badenoch called the byelection a "gimmick."$t$) WHERE slug::text = $t$85f83b42f1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 85f83b42f1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$85f83b42f1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$and Dares Clacton to Re-Elect Him$t$, ''))) / length($t$and Dares Clacton to Re-Elect Him$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline 85f83b42f1: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$and Dares Clacton to Re-Elect Him$t$, $t$and Dares Clacton to Elect Him Again$t$) WHERE slug::text = $t$85f83b42f1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 85f83b42f1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$920e6b2857$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Two long-delayed accountability issues$t$, ''))) / length($t$Two long-delayed accountability issues$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 920e6b2857: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Two long-delayed accountability issues$t$, $t$Two accountability issues, long delayed,$t$) WHERE slug::text = $t$920e6b2857$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 920e6b2857: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$920e6b2857$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$grassroots sports and free-to-air broadcasts.$t$, ''))) / length($t$grassroots sports and free-to-air broadcasts.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 920e6b2857: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$grassroots sports and free-to-air broadcasts.$t$, $t$grassroots sports and broadcasts that are free to air.$t$) WHERE slug::text = $t$920e6b2857$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 920e6b2857: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$920e6b2857$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Thirty-seven bills were announced in the 2026 King's Speech.$t$, ''))) / length($t$Thirty-seven bills were announced in the 2026 King's Speech.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 920e6b2857: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Thirty-seven bills were announced in the 2026 King's Speech.$t$, $t$The 2026 King's Speech announced 37 bills.$t$) WHERE slug::text = $t$920e6b2857$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 920e6b2857: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$920e6b2857$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$follows the long-running Undercover Policing Inquiry$t$, ''))) / length($t$follows the long-running Undercover Policing Inquiry$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 920e6b2857: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$follows the long-running Undercover Policing Inquiry$t$, $t$follows the Undercover Policing Inquiry, which has run for years$t$) WHERE slug::text = $t$920e6b2857$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 920e6b2857: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$95b73adcf0$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$the Makerfield by-election$t$, ''))) / length($t$the Makerfield by-election$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 95b73adcf0: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$the Makerfield by-election$t$, $t$the Makerfield byelection$t$) WHERE slug::text = $t$95b73adcf0$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 95b73adcf0: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$99612fea22$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before$t$, ''))) / length($t$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 99612fea22: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$A cross-party committee of MPs published a report this week demanding the government boost Universal Credit for 66-year-olds before$t$, $t$A committee of MPs from across the parties published a report this week demanding the government boost Universal Credit for people aged 66 before$t$) WHERE slug::text = $t$99612fea22$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 99612fea22: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$99612fea22$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Only 42 per cent of 66-year-olds are$t$, ''))) / length($t$Only 42 per cent of 66-year-olds are$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 99612fea22: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Only 42 per cent of 66-year-olds are$t$, $t$Only 42 per cent of people aged 66 are$t$) WHERE slug::text = $t$99612fea22$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 99612fea22: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$99612fea22$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Thousands of 66-Year-Olds Are Being$t$, ''))) / length($t$Thousands of 66-Year-Olds Are Being$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline 99612fea22: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$Thousands of 66-Year-Olds Are Being$t$, $t$Thousands of People Aged 66 Are Being$t$) WHERE slug::text = $t$99612fea22$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 99612fea22: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$9daa8d566a$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$after a two-week drinking water outage$t$, ''))) / length($t$after a two-week drinking water outage$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body 9daa8d566a: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$after a two-week drinking water outage$t$, $t$after a drinking water outage lasting two weeks$t$) WHERE slug::text = $t$9daa8d566a$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings 9daa8d566a: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$a789cb7e7d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$A peer-reviewed analysis in the British Medical Journal says the UK-US pharmaceutical trade deal agreed$t$, ''))) / length($t$A peer-reviewed analysis in the British Medical Journal says the UK-US pharmaceutical trade deal agreed$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body a789cb7e7d: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$A peer-reviewed analysis in the British Medical Journal says the UK-US pharmaceutical trade deal agreed$t$, $t$A peer reviewed analysis in the British Medical Journal says the pharmaceutical trade deal between the UK and the US agreed$t$) WHERE slug::text = $t$a789cb7e7d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings a789cb7e7d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$a789cb7e7d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$to pay for higher-priced American medicines$t$, ''))) / length($t$to pay for higher-priced American medicines$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body a789cb7e7d: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$to pay for higher-priced American medicines$t$, $t$to pay for more expensive American medicines$t$) WHERE slug::text = $t$a789cb7e7d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings a789cb7e7d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$a789cb7e7d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Co-author Professor Samuel Cross said$t$, ''))) / length($t$Co-author Professor Samuel Cross said$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body a789cb7e7d: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Co-author Professor Samuel Cross said$t$, $t$Professor Samuel Cross, one of the authors, said$t$) WHERE slug::text = $t$a789cb7e7d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings a789cb7e7d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$a789cb7e7d$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$UK-US drugs deal could cause$t$, ''))) / length($t$UK-US drugs deal could cause$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline a789cb7e7d: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$UK-US drugs deal could cause$t$, $t$Drugs deal with the US could cause$t$) WHERE slug::text = $t$a789cb7e7d$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings a789cb7e7d: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$dc5ff3e650$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$the Makerfield by-election$t$, ''))) / length($t$the Makerfield by-election$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body dc5ff3e650: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$the Makerfield by-election$t$, $t$the Makerfield byelection$t$) WHERE slug::text = $t$dc5ff3e650$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings dc5ff3e650: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$ef9b698039$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$forcing a by-election in which$t$, ''))) / length($t$forcing a by-election in which$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body ef9b698039: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$forcing a by-election in which$t$, $t$forcing a byelection in which$t$) WHERE slug::text = $t$ef9b698039$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings ef9b698039: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$ef9b698039$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$If Farage loses the by-election,$t$, ''))) / length($t$If Farage loses the by-election,$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body ef9b698039: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$If Farage loses the by-election,$t$, $t$If Farage loses the byelection,$t$) WHERE slug::text = $t$ef9b698039$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings ef9b698039: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$ef9b698039$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Kemi Badenoch called the by-election "fake"$t$, ''))) / length($t$Kemi Badenoch called the by-election "fake"$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body ef9b698039: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Kemi Badenoch called the by-election "fake"$t$, $t$Kemi Badenoch called the byelection "fake"$t$) WHERE slug::text = $t$ef9b698039$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings ef9b698039: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT headline INTO v FROM public.briefings WHERE slug::text = $t$ef9b698039$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$dares Clacton to re-elect him$t$, ''))) / length($t$dares Clacton to re-elect him$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.headline ef9b698039: phrase found % times', c; END IF;
  UPDATE public.briefings SET headline = replace(headline, $t$dares Clacton to re-elect him$t$, $t$dares Clacton to elect him again$t$) WHERE slug::text = $t$ef9b698039$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings ef9b698039: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$efd6a67e16$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$is not being treated as terrorism-related.$t$, ''))) / length($t$is not being treated as terrorism-related.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body efd6a67e16: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$is not being treated as terrorism-related.$t$, $t$is not being treated as related to terrorism.$t$) WHERE slug::text = $t$efd6a67e16$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings efd6a67e16: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$efd6a67e16$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$A 26-year-old white British man$t$, ''))) / length($t$A 26-year-old white British man$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body efd6a67e16: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$A 26-year-old white British man$t$, $t$A white British man aged 26$t$) WHERE slug::text = $t$efd6a67e16$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings efd6a67e16: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$eff6a11636$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Short Money (taxpayer-funded parliamentary support cash)$t$, ''))) / length($t$Short Money (taxpayer-funded parliamentary support cash)$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body eff6a11636: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Short Money (taxpayer-funded parliamentary support cash)$t$, $t$Short Money (parliamentary support funded by taxpayers)$t$) WHERE slug::text = $t$eff6a11636$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings eff6a11636: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$eff6a11636$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$and ex-husband of Nicola Sturgeon$t$, ''))) / length($t$and ex-husband of Nicola Sturgeon$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body eff6a11636: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$and ex-husband of Nicola Sturgeon$t$, $t$and former husband of Nicola Sturgeon$t$) WHERE slug::text = $t$eff6a11636$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings eff6a11636: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$f8627e2be1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$stand in the by-election he himself triggered$t$, ''))) / length($t$stand in the by-election he himself triggered$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body f8627e2be1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$stand in the by-election he himself triggered$t$, $t$stand in the byelection he himself triggered$t$) WHERE slug::text = $t$f8627e2be1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings f8627e2be1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$f8627e2be1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Kemi Badenoch called the by-election "fake"$t$, ''))) / length($t$Kemi Badenoch called the by-election "fake"$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body f8627e2be1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$Kemi Badenoch called the by-election "fake"$t$, $t$Kemi Badenoch called the byelection "fake"$t$) WHERE slug::text = $t$f8627e2be1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings f8627e2be1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT body INTO v FROM public.briefings WHERE slug::text = $t$f8627e2be1$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$from Thailand-based cryptocurrency billionaire Christopher Harborne.$t$, ''))) / length($t$from Thailand-based cryptocurrency billionaire Christopher Harborne.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'briefings.body f8627e2be1: phrase found % times', c; END IF;
  UPDATE public.briefings SET body = replace(body, $t$from Thailand-based cryptocurrency billionaire Christopher Harborne.$t$, $t$from Christopher Harborne, a cryptocurrency billionaire based in Thailand.$t$) WHERE slug::text = $t$f8627e2be1$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'briefings f8627e2be1: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$50$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$adding around 10-15% to typical bills$t$, ''))) / length($t$adding around 10-15% to typical bills$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 50: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$adding around 10-15% to typical bills$t$, $t$adding around 10% to 15% to typical bills$t$) WHERE id::text = $t$50$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 50: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$50$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$reduced some levies in 2022-23$t$, ''))) / length($t$reduced some levies in 2022-23$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 50: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$reduced some levies in 2022-23$t$, $t$reduced some levies in 2022/23$t$) WHERE id::text = $t$50$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 50: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$53$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$targeted help for low-income households$t$, ''))) / length($t$targeted help for low-income households$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 53: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$targeted help for low-income households$t$, $t$targeted help for households on low incomes$t$) WHERE id::text = $t$53$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 53: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$55$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$instead of all over-65s.$t$, ''))) / length($t$instead of all over-65s.$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 55: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$instead of all over-65s.$t$, $t$instead of everyone over 65.$t$) WHERE id::text = $t$55$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 55: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$55$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$lost the £200-£300 annual payment$t$, ''))) / length($t$lost the £200-£300 annual payment$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 55: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$lost the £200-£300 annual payment$t$, $t$lost the £200 to £300 annual payment$t$) WHERE id::text = $t$55$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 55: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$62$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$at 18 per cent for basic-rate taxpayers and 24 per cent for higher-rate taxpayers$t$, ''))) / length($t$at 18 per cent for basic-rate taxpayers and 24 per cent for higher-rate taxpayers$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 62: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$at 18 per cent for basic-rate taxpayers and 24 per cent for higher-rate taxpayers$t$, $t$at 18 per cent for basic rate taxpayers and 24 per cent for higher rate taxpayers$t$) WHERE id::text = $t$62$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 62: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$64$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$as the post-war new town development corporations did$t$, ''))) / length($t$as the post-war new town development corporations did$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 64: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$as the post-war new town development corporations did$t$, $t$as the new town development corporations did after the Second World War$t$) WHERE id::text = $t$64$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 64: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$65$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$to buy long-term empty homes$t$, ''))) / length($t$to buy long-term empty homes$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 65: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$to buy long-term empty homes$t$, $t$to buy long term empty homes$t$) WHERE id::text = $t$65$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 65: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$66$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$video since the pandemic; face-to-face assessments fell$t$, ''))) / length($t$video since the pandemic; face-to-face assessments fell$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 66: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$video since the pandemic; face-to-face assessments fell$t$, $t$video since the pandemic; assessments in person fell$t$) WHERE id::text = $t$66$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 66: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$66$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$would raise face-to-face assessments to 30 per cent$t$, ''))) / length($t$would raise face-to-face assessments to 30 per cent$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 66: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$would raise face-to-face assessments to 30 per cent$t$, $t$would raise assessments in person to 30 per cent$t$) WHERE id::text = $t$66$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 66: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$68$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$Vote No if you think single-party government and$t$, ''))) / length($t$Vote No if you think single-party government and$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 68: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$Vote No if you think single-party government and$t$, $t$Vote No if you think government by a single party and$t$) WHERE id::text = $t$68$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 68: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$69$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$should be a full-time job$t$, ''))) / length($t$should be a full-time job$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 69: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$should be a full-time job$t$, $t$should be a full time job$t$) WHERE id::text = $t$69$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 69: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$71$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$in contempt for non-cooperation can produce$t$, ''))) / length($t$in contempt for non-cooperation can produce$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 71: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$in contempt for non-cooperation can produce$t$, $t$in contempt for refusing to cooperate can produce$t$) WHERE id::text = $t$71$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 71: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$72$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$would let low-speed robots use$t$, ''))) / length($t$would let low-speed robots use$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 72: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$would let low-speed robots use$t$, $t$would let robots that travel at low speed use$t$) WHERE id::text = $t$72$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 72: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT explainer INTO v FROM public.polls WHERE id::text = $t$74$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$speed limit in built-up areas is 30mph$t$, ''))) / length($t$speed limit in built-up areas is 30mph$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.explainer 74: phrase found % times', c; END IF;
  UPDATE public.polls SET explainer = replace(explainer, $t$speed limit in built-up areas is 30mph$t$, $t$speed limit in built up areas is 30mph$t$) WHERE id::text = $t$74$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 74: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT question INTO v FROM public.polls WHERE id::text = $t$74$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$default speed limit in built-up areas?$t$, ''))) / length($t$default speed limit in built-up areas?$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'polls.question 74: phrase found % times', c; END IF;
  UPDATE public.polls SET question = replace(question, $t$default speed limit in built-up areas?$t$, $t$default speed limit in built up areas?$t$) WHERE id::text = $t$74$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'polls 74: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT commentary INTO v FROM public.uk_political_news WHERE id::text = $t$3$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$a particularly slow-moving glacier$t$, ''))) / length($t$a particularly slow-moving glacier$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary 3: phrase found % times', c; END IF;
  UPDATE public.uk_political_news SET commentary = replace(commentary, $t$a particularly slow-moving glacier$t$, $t$a particularly slow moving glacier$t$) WHERE id::text = $t$3$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news 3: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT commentary INTO v FROM public.uk_political_news WHERE id::text = $t$3$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$A bracing exercise in self-knowledge$t$, ''))) / length($t$A bracing exercise in self-knowledge$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary 3: phrase found % times', c; END IF;
  UPDATE public.uk_political_news SET commentary = replace(commentary, $t$A bracing exercise in self-knowledge$t$, $t$A bracing exercise in self knowledge$t$) WHERE id::text = $t$3$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news 3: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT commentary INTO v FROM public.uk_political_news WHERE id::text = $t$4$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$business costs for 2024-25, a figure$t$, ''))) / length($t$business costs for 2024-25, a figure$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary 4: phrase found % times', c; END IF;
  UPDATE public.uk_political_news SET commentary = replace(commentary, $t$business costs for 2024-25, a figure$t$, $t$business costs for 2024/25, a figure$t$) WHERE id::text = $t$4$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news 4: % rows', n; END IF;
END $do$;
DO $do$ DECLARE v text; c int; n int; BEGIN
  SELECT commentary INTO v FROM public.uk_political_news WHERE id::text = $t$6$t$;
  c := (length(coalesce(v,'')) - length(replace(coalesce(v,''), $t$the spirit of pure civic-mindedness$t$, ''))) / length($t$the spirit of pure civic-mindedness$t$);
  IF c <> 1 THEN RAISE EXCEPTION 'uk_political_news.commentary 6: phrase found % times', c; END IF;
  UPDATE public.uk_political_news SET commentary = replace(commentary, $t$the spirit of pure civic-mindedness$t$, $t$the spirit of pure civic mindedness$t$) WHERE id::text = $t$6$t$;
  GET DIAGNOSTICS n = ROW_COUNT; IF n <> 1 THEN RAISE EXCEPTION 'uk_political_news 6: % rows', n; END IF;
END $do$;

COMMIT;
