-- Meaning search corpus (Cowork ENTRY 390 GO; the C1 corpus of the ENTRY 390 test, scripts on branch t1-meaning): one JSON
-- line per record /search can offer as 'Related by meaning', with the site path its page is served at (as in
-- lib/sitemap and lib/search-content.ts), the text that is embedded (as tested: at most 1,000 characters), and the date
-- and House shown beside it (ENTRY 390 PICTURES: the same dates the exact results show; null where a record has none).
-- READ ONLY. Run by scripts/meaning/load-embeddings.ts inside BEGIN READ ONLY ... ROLLBACK with the 60 s limit.
-- Changes from the test corpus: reports at /editorials/ or /briefings/ (the test used /reports/, which is a list);
-- debates at /debates/<Hansard id> (as the debates list links); APPGs at the APPG list searched for their title (no page
-- of their own; Cowork ENTRY 390 PICTURES answer 2); Lords votes left out (no page); committees limited to the 29 with
-- pages (lib/committees.ts COMMITTEE_IDS, applied by the loader); special advisers once per name, with whether they are
-- in the latest appointments list (their row on the special advisers page has an anchor).
-- Dates: debate sitting date; Commons vote date; bill last updated (as /search labels it); motion tabled; petition
-- opened; report and briefing published.
select json_build_object('kind', k, 'path', u, 'title', t, 'text', left(regexp_replace(x, '\s+', ' ', 'g'), 1000), 'ref', r,
                         'date', d, 'house', h) from (
 select 'mp' k, '/mps/' || member_id u, coalesce(display_name, name) t,
        coalesce(display_name, name) || ', MP for ' || coalesce(constituency, '') || ' (' || coalesce(party, '') || ')' x, null::text r,
        null::date d, null::text h
   from mps where current_member
 union all select 'peer', '/lords/' || member_id, name_display,
        name_display || ', member of the House of Lords (' || coalesce(party, '') || ', ' || coalesce(peerage_type, '') || ')' || case when is_current then '' else ', former member' end, null, null, null
   from peers
 union all select 'council', '/councils/' || slug, name, name || '. ' || coalesce(type_label, '') || ', ' || coalesce(region, country, '') || '. ' || coalesce(left(description, 300), ''), null, null, null
   from councils where slug is not null
 union all select 'constituency', '/constituencies/' || slug, name, name || ', UK Parliament constituency in ' || coalesce(region, nation, ''), null, null, null
   from constituencies where slug is not null
 union all select 'organisation', '/organisations/' || slug, name, name, null, null, null from organisation_index where slug is not null
 union all select case when kind = 'briefing' then 'briefing' else 'report' end, case when kind = 'briefing' then '/briefings/' else '/editorials/' end || slug,
        headline, headline || '. ' || coalesce(standfirst, ''), null, published_at, null
   from editorials where coalesce(unpublished, false) = false and slug is not null
 union all select 'briefing', '/briefings/' || slug, headline, headline || '. ' || coalesce(left(summary, 400), ''), null, (published_at at time zone 'Europe/London')::date, null
   from briefings where is_published and slug is not null
 union all select 'bill', '/bills/' || id, title, title || '. ' || coalesce(left(coalesce(plain_summary, description, long_title), 400), ''), null,
        (last_update at time zone 'Europe/London')::date, null
   from bill where hidden_reason is null
 union all select 'commons_vote', '/divisions/pw-' || division_date_only || '-' || division_number || '-commons', division_title, 'Commons vote: ' || coalesce(division_title, ''), null,
        division_date_only::date, 'Commons'
   from commons_divisions_fts where division_date_only is not null and division_number is not null
 union all select 'committee', '/committees/' || id, name, name || '. ' || coalesce(left(purpose, 300), ''), id::text, null, null from committees
 union all select 'appg', '/transparency/appgs?q=', title, 'All Party Parliamentary Group: ' || title || '. ' || coalesce(left(purpose, 300), ''), null, null, null
   from appgs where title is not null
 union all select 'edm', '/edms/' || id, title, 'Early day motion: ' || coalesce(title, ''), null, date_tabled, 'Commons' from early_day_motions
 union all select 'petition', '/petitions/' || id, action, 'Petition: ' || coalesce(action, '') || '. ' || coalesce(left(background, 300), ''), null,
        (opened_at at time zone 'Europe/London')::date, null
   from petitions
 union all select 'debate', '/debates/' || upper(hansard_ext_id), title, 'Debate: ' || coalesce(title, '') || '. ' || coalesce(left(summary, 300), ''), null,
        sitting_date::date, case when house in ('Commons', 'Lords') then house end
   from debates where hansard_ext_id is not null
 union all select * from (
   select distinct on (s.name) 'special_adviser', '/transparency/special-advisers', s.name,
          s.name || ', special adviser, ' || coalesce(s.area, '') || ', ' || coalesce(s.quarter, ''),
          case when exists (select 1 from spad_appointments a where a.adviser_name = s.name) then 'listed' else '' end, null::date, null::text
     from special_advisers s order by s.name, s.id desc) sa
) z where t is not null and btrim(t) <> '';
