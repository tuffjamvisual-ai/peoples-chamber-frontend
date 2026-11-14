// T1-NLDESIGN (ENTRY 70): the one-stream email design (lib/newsletter-template.ts).
//   npx tsx --tsconfig tsconfig.json --test scripts/checks/newsletter-template.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIssue, emailFor, unsubscribeUrl } from '../../lib/newsletter-issue';
import { capsLead, withOverdue, LOGO_URL, FOLDER_TOP, FOLDER_MID } from '../../lib/newsletter-template';

const issue = [
  'Subject: A question?',
  'Preview text: An MP asked on 19 October.',
  '',
  '# opengovt Weekly · 15 November 2026',
  '',
  '## The short version',
  '',
  '- **25 days overdue:** an answer.',
  '- **Coming up:** answers due.',
  '',
  'Hello and welcome to opengovt Weekly.',
  '',
  '## Still waiting',
  '',
  '**25 days and counting:** On 19 October an MP asked.',
  '',
  '**The money:** words. [Our full report](https://www.opengovt.uk/editorials/r)',
  '',
  '> "A quoted answer."',
  '',
  '## In case you missed them',
  '',
  '**£12.8bn.** Words. [How we worked it out](https://www.opengovt.uk/editorials/x)',
  '',
  '**Andy Burnham** was at the meeting. [What the minutes say](https://www.opengovt.uk/editorials/y)',
  '',
  'One new thing on the site: search. [Try it](https://www.opengovt.uk/pmqs)',
  '',
  'Which decision should we look into next? Just reply.',
  '',
  'John Sanders',
  'opengovt',
  '',
  '‘Our view’ is our opinion.',
  '',
  '[Unsubscribe]({{unsubscribe_url}}) · [Privacy policy](https://www.opengovt.uk/privacy)',
].join('\n');
const tok = '22222222-2222-2222-2222-222222222222';
const html = emailFor(parseIssue(issue), tok, '', '2026-11-15').html;

test('one stream on the folder: no cards, boxes, tabs, borders or shaded panels; 680px; logo at the top', () => {
  assert.ok(html.includes('max-width:680px') && html.includes('width="680"'));
  assert.ok(html.includes('src="https://www.opengovt.uk/newsletter/logo.png" width="225" height="72" alt="opengovt"'), 'the site header logo');
  assert.ok(/<p align="center" style="margin:0 0 22px;text-align:center"><img class="ogw-logo"[^>]*style="display:block;margin:0 auto;/.test(html), 'logo centred, 22px under it');
  assert.ok(html.includes('margin:0 0 8px;text-align:center">By <strong>') && html.includes('margin:0 0 30px;line-height:1.6">'), 'byline centred, spacing at the top');
  assert.ok(/<p style="font-family:'Special Elite'[^"]*margin:0 0 14px">Hello and welcome/.test(html), 'the stream below stays left aligned');
  assert.ok(!/border(-left|-top|-bottom|-right)?:\s*[1-9]/.test(html), 'no borders (border:0 on the logo image only)');
  assert.ok(!/border-radius|box-shadow/.test(html));
  const bgs = new Set([...html.matchAll(/background(?:-color)?:(#[0-9a-f]{6})/gi)].map((m) => m[1].toLowerCase()));
  assert.deepEqual([...bgs].sort(), ['#2a221c', '#e8d3a2'], 'the dark surround and the paper colour only');
  assert.ok(html.includes(`background-image:url(${FOLDER_TOP}),url(${FOLDER_MID})`) && html.includes(`background="${FOLDER_MID}"`), 'folder art, paper colour underneath');
  assert.ok(html.includes('fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Special+Elite') || html.includes('fonts.googleapis.com/css2?family=Bebas+Neue&family=Special+Elite'));
  assert.ok(/font-family:'Bebas Neue',Impact,'Arial Narrow',sans-serif;font-size:24px[^"]*color:#7a1612[^"]*">THE SHORT VERSION</.test(html), 'headings in Bebas Neue 24px red');
  assert.ok(/font-family:'Special Elite','Courier New',Courier,monospace;font-size:16px/.test(html), 'body in Special Elite');
  assert.ok(html.indexOf(`src="${LOGO_URL}"`) < html.indexOf('By <strong>JOHN SANDERS</strong>'));
});

test('welcome first, then headings in capitals, bullets, capitals run-in labels, sentence case lead-ins', () => {
  const at = (s: string) => { const i = html.indexOf(s); assert.ok(i >= 0, s); return i; };
  assert.ok(at('Hello and welcome') < at('>THE SHORT VERSION<'));
  assert.ok(at('>THE SHORT VERSION<') < at('&bull; <strong>25 days overdue:</strong>'));
  at('<strong>25 DAYS AND COUNTING:</strong> On 19 October');
  at('<strong>The money:</strong> words.');
  at('<strong>£12.8BN:</strong> Words.');
  at('<strong>ANDY BURNHAM:</strong> was at');
  assert.ok(at('>NEW ON OPENGOVT<') < at('One new thing') && at('>YOUR QUESTION<') < at('Which decision'));
  assert.ok(/margin:0 0 14px 18px"><span style="font-family:'Courier New'[^"]*;font-size:15px">&quot;A quoted answer/.test(html), 'quote indented, typewriter');
});

test('links underlined in red, own unsubscribe link, sign-off and 13px footer', () => {
  for (const u of ['https://www.opengovt.uk/editorials/r', 'https://www.opengovt.uk/editorials/x', 'https://www.opengovt.uk/pmqs', unsubscribeUrl(tok)]) assert.ok(html.includes(`href="${u}" style="color:#7a1612;text-decoration:underline"`), u);
  assert.ok(html.includes('John Sanders<br><strong>opengovt</strong>'));
  assert.ok(/font-size:13px[^"]*">‘Our view’ is our opinion\./.test(html));
  assert.ok(!html.includes('{{'));
});

test('capsLead and the overdue count', () => {
  assert.equal(capsLead('**£12.8bn.** That'), '**£12.8BN:** That');
  assert.equal(capsLead('**Andy Burnham** was'), '**ANDY BURNHAM:** was');
  const card = 'Subject: Q?\n\n## Still waiting\n\n**Dept: 25 days overdue**\n\n- Answer due: 21 October\n- Last checked: 14 November, no answer\n\n[x]({{unsubscribe_url}})';
  assert.match(withOverdue(parseIssue(card), '2026-11-14').body, /24 days overdue/);
  assert.ok(!/overdue/.test(withOverdue(parseIssue(card.replace('no answer', 'answered')), '2026-11-17').body));
  assert.equal(withOverdue(parseIssue(issue), '2026-11-20').body, parseIssue(issue).body, 'no due line: left as written');
});

test('caricatures: full picture in a polaroid frame beside the first-mention paragraph, desktop only', () => {
  const people = [{ name: 'Andy Burnham', id: 1427 }, { name: 'Danny Kruger', id: 4858 }];
  const twice = issue.replace('One new thing on the site: search.', 'One new thing on the site: search. Andy Burnham again.');
  const h = emailFor(parseIssue(twice), tok, '', '2026-11-15', people).html;
  const imgs = [...h.matchAll(/<img src="([^"]+)" width="84" height="84" alt="([^"]+)"/g)];
  assert.deepEqual(imgs.map((m) => [m[1], m[2]]), [['https://www.opengovt.uk/newsletter/mps/1427.jpg', 'Andy Burnham']], 'Kruger is not named in this test issue; Burnham once');
  assert.ok(/<td class="ogw-ph" valign="top" width="108"[^>]*><div style="background:#fbf8f0;padding:6px 6px 18px;box-shadow:[^"]*;transform:rotate\(-2deg\);width:84px"><img src="https:\/\/www.opengovt.uk\/newsletter\/mps\/1427.jpg"[^>]*><\/div><\/td><td valign="top"><p style="[^"]*margin:0"><strong>ANDY BURNHAM:<\/strong>/.test(h), 'frame left, the first-mention paragraph right');
  assert.ok(/@media only screen and \(max-width:599px\)\{td\.ogw-ph\{display:none!important/.test(h), 'hidden on phones');
  assert.ok(!emailFor(parseIssue(twice), tok, '', '2026-11-15').html.includes('ogw-ph"'), 'no people, no pictures');
});

test('View in your browser: only with a live web copy; the web copy itself has no link to itself, noindex, newsletter page for Unsubscribe', () => {
  assert.ok(!html.includes('View in your browser') && !html.includes('Tips, corrections'), 'no web copy given: no link, no tips line');
  const withWeb = emailFor(parseIssue(issue), tok, '', '2026-11-15', [], { webUrl: 'https://www.opengovt.uk/newsletter/issues/2026-11-15.html' }).html;
  assert.ok(/<p align="center" style="[^"]*margin:0 0 30px;line-height:1.6;text-align:center"><a class="ogw-il" href="https:\/\/www.opengovt.uk\/newsletter\/issues\/2026-11-15.html" style="color:#7a1612;text-decoration:underline">View in your browser<\/a>/.test(withWeb), 'centred, red as in the reference');
  const web = emailFor(parseIssue(issue), '', '', '2026-11-15', [], { web: true, webUrl: 'x' }).html;
  assert.ok(web.includes('<meta name="robots" content="noindex, follow">') && !web.includes('View in your browser'));
  assert.ok(web.includes('href="https://www.opengovt.uk/newsletter" style') && !web.includes('unsubscribe?token'));
});
