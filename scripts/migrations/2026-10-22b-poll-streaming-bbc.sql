-- 2026-10-22b: the BBC streaming poll (owner's approval, 22 Oct 2026), an ordinary open yes/no poll like the others.
-- Shown on /topics/culture-media-and-sport through its poll words ("bbc"); goes with editorial bc4n8mxw2t.
\set ON_ERROR_STOP on
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM polls WHERE question ILIKE 'Should households that only use streaming services%') THEN
    RAISE EXCEPTION 'the streaming poll already exists';
  END IF;
END $$;

INSERT INTO polls (question, constituency, vote_count_yes, vote_count_no, explainer, archived, poll_type, explainer_sources, explainer_checked)
VALUES (
  'Should households that only use streaming services, such as YouTube or Netflix, have to pay towards the BBC?',
  'Streaming and the BBC',
  0, 0,
  'A TV licence costs £180 a year and is needed to watch live television on any service or to use BBC iPlayer. Households that watch only on-demand services such as YouTube or Netflix do not need one. Lisa Nandy, the Secretary of State for Digital, Culture, Media and Sport, has told MPs that extending the licence to streaming is one of the options under consideration, and decisions are due in a White Paper by the end of the year. Vote Yes if you think households that only stream should contribute towards the BBC. Vote No if you think a licence should only be needed for live TV and BBC iPlayer, as now.',
  false, 'yesno',
  '[{"url": "https://committees.parliament.uk/oralevidence/17956/html/", "label": "Culture, Media and Sport Committee oral evidence, 13 July 2026"},
    {"url": "https://questions-statements.parliament.uk/written-questions/detail/2026-10-09/33170", "label": "Written question UIN 33170, answered 19 October 2026"},
    {"url": "https://www.gov.uk/government/news/cost-of-tv-licence-fee-set-for-202627", "label": "GOV.UK, Cost of TV licence fee set for 2026/27"}]'::jsonb,
  '2026-10-22'
);

SELECT id, constituency, archived, poll_type, jsonb_array_length(explainer_sources) sources, explainer_checked
FROM polls WHERE question ILIKE 'Should households that only use streaming services%';
COMMIT;
