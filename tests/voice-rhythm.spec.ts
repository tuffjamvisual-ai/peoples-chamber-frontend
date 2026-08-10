import { test, expect } from "@playwright/test";
import { detectVoiceRhythmIssues } from "../app/internal/humaniser/voiceRhythm";

const types = (r: ReturnType<typeof detectVoiceRhythmIssues>) => r.issues.map((i) => i.type);

// An over-polished piece: many one-line verdicts, a cliché, a slogan ending.
const POLISHED = `Headline goes here.

Pension funds hold British savings and companies need capital.

Their first duty is to the saver.

That is where the language starts to grate.

They're looking at risk and return.

Peter Kyle said the quiet part out loud.

That word is risk.`;

// A looser, more natural version: one standalone beat, flowing paragraphs.
const NATURAL = `Headline goes here.

Peter Kyle told the funds to invest more, and warned ministers could force them by law. Savers should have been listening, because this argument is settled with their money.

But pension money is not a spare Treasury account with nicer branding, and the people managing it are not there to deliver a minister's industrial strategy. Their first duty is to the saver, which is where the language starts to grate.

If the government wants more pension money in British companies, it has to make British assets worth backing. They are weighing risk against return, which is what savers pay them to do.`;

test.describe("Voice & Rhythm Quality Pass", () => {
  test("flags too many one-line verdict paragraphs", () => {
    expect(types(detectVoiceRhythmIssues("tabloid", POLISHED))).toContain("one-line-verdicts");
  });

  test("flags a stacked run of short punch lines", () => {
    expect(types(detectVoiceRhythmIssues("tabloid", POLISHED))).toContain("stacked-punchlines");
  });

  test("flags a generic cliché phrase", () => {
    expect(types(detectVoiceRhythmIssues("tabloid", POLISHED))).toContain("generic-phrases");
  });

  test("flags a slogan-like final line", () => {
    expect(types(detectVoiceRhythmIssues("tabloid", POLISHED))).toContain("slogan-ending");
  });

  test("each issue carries lines, a reason and a suggestion", () => {
    const r = detectVoiceRhythmIssues("tabloid", POLISHED);
    for (const issue of r.issues) {
      expect(issue.lines.length).toBeGreaterThan(0);
      expect(issue.reason.length).toBeGreaterThan(0);
      expect(issue.suggestion.length).toBeGreaterThan(0);
    }
  });

  test("flags repeated pivot openers", () => {
    const src = `Headline.

But the first point stands on its own.

But the second point also lands here.

But the third point keeps the turn going.`;
    expect(types(detectVoiceRhythmIssues("tabloid", src))).toContain("pivot-openers");
  });

  test("a looser, natural piece raises far fewer issues", () => {
    const r = detectVoiceRhythmIssues("tabloid", NATURAL);
    expect(r.issues.length).toBeLessThan(2);
  });

  test("does not run for diagnosis", () => {
    expect(detectVoiceRhythmIssues("diagnosis", POLISHED).hasIssue).toBe(false);
  });

  test("does not mutate the output", () => {
    const before = POLISHED;
    detectVoiceRhythmIssues("tabloid", POLISHED);
    expect(before).toBe(POLISHED);
  });
});
