-- Meaning search corpus (Cowork ENTRY 390 GO; the C1 corpus of the ENTRY 390 test, scripts on branch t1-meaning): one JSON
-- line per record /search can offer as 'Related by meaning', with the site path its page is served at (as in
-- lib/sitemap and lib/search-content.ts) and the text that is embedded (as tested: at most 1,000 characters).
-- READ ONLY. Run by scripts/meaning/load-embeddings.ts inside BEGIN READ ONLY ... ROLLBACK with the 60 s limit.
-- Changes from the test corpus: reports at /editorials/ or /briefings/ (the test used /reports/, which is a list);
-- debates at /debates/<Hansard id> (as the debates list links); Lords votes and APPGs left out (no page of their own);
-- committees limited to the 29 with pages (lib/committees.ts COMMITTEE_IDS, applied by the loader); special advisers once
-- per name, with whether they are in the latest appointments list (their row on the special advisers page has an anchor).
select json_build_object('kind', k, 'path', u, 'title', t, 'text', left(regexp_replace(x, '\s+', ' ', 'g'), 1000), 'ref', r) from (
 select 'mp' k, '/mps/' || member_id u, coalesce(display_name, name) t,
        coalesce(display_name, name) || ', MP for ' || coalesce(constituency, '') || ' (' || coalesce(party, '') || ')' x, null::text r
   from mps where current_member
 union all select 'peer', '/lords/' || member_id, name_display,
        name_display || ', member of the House of Lords (' || coalesce(party, '') || ', ' || coalesce(peerage_type, '') || ')' || case when is_current then '' else ', former member' end, null
   from peers
 union all select 'council', '/councils/' || slug, name, name || '. ' || coalesce(type_label, '') || ', ' || coalesce(region, country, '') || '. ' || coalesce(left(description, 300), ''), null
   from councils where slug is not null
 union all select 'constituency', '/constituencies/' || slug, name, name || ', UK Parliament constituency in ' || coalesce(region, nation, ''), null
   from constituencies where slug is not null
 union all select 'organisation', '/organisations/' || slug, name, name, null from organisation_index where slug is not null
 union all select case when kind = 'briefing' then 'briefing' else 'report' end, case when kind = 'briefing' then '/briefings/' else '/editorials/' end || slug,
        headline, headline || '. ' || coalesce(standfirst, ''), null
   from editorials where coalesce(unpublished, false) = false and slug is not null
 union all select 'briefing', '/briefings/' || slug, headline, headline || '. ' || coalesce(left(summary, 400), ''), null from briefings where is_published and slug is not null
 union all select 'bill', '/bills/' || id, title, title || '. ' || coalesce(left(coalesce(plain_summary, description, long_title), 400), ''), null
   from bill where hidden_reason is null
 union all select 'commons_vote', '/divisions/pw-' || division_date_only || '-' || division_number || '-commons', division_title, 'Commons vote: ' || coalesce(division_title, ''), null
   from commons_divisions_fts where division_date_only is not null and division_number is not null
 union all select 'committee', '/committees/' || id, name, name || '. ' || coalesce(left(purpose, 300), ''), id::text from committees
 union all select 'edm', '/edms/' || id, title, 'Early day motion: ' || coalesce(title, ''), null from early_day_motions
 union all select 'petition', '/petitions/' || id, action, 'Petition: ' || coalesce(action, '') || '. ' || coalesce(left(background, 300), ''), null from petitions
 union all select 'debate', '/debates/' || upper(hansard_ext_id), title, 'Debate: ' || coalesce(title, '') || '. ' || coalesce(left(summary, 300), ''), null
   from debates where hansard_ext_id is not null
 union all select * from (
   select distinct on (s.name) 'special_adviser', '/transparency/special-advisers', s.name,
          s.name || ', special adviser, ' || coalesce(s.area, '') || ', ' || coalesce(s.quarter, ''),
          case when exists (select 1 from spad_appointments a where a.adviser_name = s.name) then 'listed' else '' end
     from special_advisers s order by s.name, s.id desc) sa
) z where t is not null and btrim(t) <> '';
