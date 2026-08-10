import { test, expect } from "@playwright/test";
import { detectDuplicates } from "../app/internal/humaniser/duplicateGlitch";
import { detectRemovedStrongLines } from "../app/internal/humaniser/strongLine";
import { detectProcessNotes } from "../app/internal/humaniser/processNote";

test.describe("Duplicate / glitch detector", () => {
  test("flags a duplicated sentence", () => {
    const out =
      "The council said the tender was assessed independently. The council said the tender was assessed independently.";
    const r = detectDuplicates("tabloid", out);
    expect(r.hasDuplicate).toBe(true);
    expect(r.duplicates[0].phrase).toContain("the tender was assessed independently");
  });

  test("flags a repeated 8+ word phrase inside a paragraph (paste loop)", () => {
    const out =
      "Kyle's pitch, all Manchesterism, devolution and an active industrial strategy, is meant to sound practical. Kyle's pitch, all Manchesterism, devolution and an active industrial strategy, is meant to sound practical. To some investors it may sound different.";
    const r = detectDuplicates("tabloid", out);
    expect(r.hasDuplicate).toBe(true);
  });

  test("does not flag common short phrases", () => {
    const out = "The government said pension funds should invest. The government wants pension funds to back Britain.";
    const r = detectDuplicates("tabloid", out);
    expect(r.hasDuplicate).toBe(false);
  });

  test("does not run for diagnosis", () => {
    const out = "The council said the tender was assessed independently. The council said the tender was assessed independently.";
    expect(detectDuplicates("diagnosis", out).hasDuplicate).toBe(false);
  });

  test("does not mutate output", () => {
    const out = "a b c d e f g h a b c d e f g h";
    detectDuplicates("tabloid", out);
    expect(out).toBe("a b c d e f g h a b c d e f g h");
  });
});

test.describe("Strong-line preservation check", () => {
  const SOURCE = `Labour wants pension funds to back Britain.

Peter Kyle has said the quiet part loudly.

The business secretary told Britain's pension funds to invest more.

Their first duty is to the saver.`;

  test("flags a distinctive strong line missing from the output", () => {
    const out = "Peter Kyle said the quiet part out loud. The business secretary told pension funds to invest more. Their first duty is to the saver.";
    const r = detectRemovedStrongLines("tabloid", SOURCE, out);
    expect(r.hasRemovedStrongLine).toBe(true);
    expect(r.removed.some((x) => x.line === "Peter Kyle has said the quiet part loudly.")).toBe(true);
  });

  test("does not flag when the line is preserved exactly", () => {
    const out = "Peter Kyle has said the quiet part loudly. The business secretary told pension funds to invest more. Their first duty is to the saver.";
    const r = detectRemovedStrongLines("tabloid", SOURCE, out);
    expect(r.hasRemovedStrongLine).toBe(false);
  });

  test("does not flag the headline or a dateline", () => {
    const src = `He Voted to Cut the Fund. Then He Applied to It.

By Open Govt · 30 June 2026

A company he part-owns applied for £18,000.`;
    // Output drops the headline and dateline but they must not be flagged as strong lines.
    const out = "A company he part-owns applied for £18,000.";
    const r = detectRemovedStrongLines("tabloid", src, out);
    expect(r.hasRemovedStrongLine).toBe(false);
  });

  test("does not run for diagnosis", () => {
    const out = "nothing here";
    expect(detectRemovedStrongLines("diagnosis", SOURCE, out).hasRemovedStrongLine).toBe(false);
  });

  test("does not mutate output", () => {
    const out = "Peter Kyle said the quiet part out loud.";
    detectRemovedStrongLines("tabloid", SOURCE, out);
    expect(out).toBe("Peter Kyle said the quiet part out loud.");
  });
});

test.describe("Process-note detector", () => {
  test('flags a "Preserved verbatim" note after the article', () => {
    const out = "The finished article ends here.\n\nPreserved verbatim: could force them by law, up to £50 billion.";
    const r = detectProcessNotes("tabloid", out);
    expect(r.hasProcessNote).toBe(true);
  });

  test('flags an "Edits applied" note after the article', () => {
    const out = "The finished article ends here.\n\nEdits applied: bankroll changed to back.";
    const r = detectProcessNotes("tabloid", out);
    expect(r.hasProcessNote).toBe(true);
  });

  test("does not flag legitimate article text", () => {
    const out = "Ministers are entitled to ask what the country gets in return. That is a fair question.";
    const r = detectProcessNotes("tabloid", out);
    expect(r.hasProcessNote).toBe(false);
  });

  test("does not run for diagnosis", () => {
    const out = "Preserved verbatim: everything.";
    expect(detectProcessNotes("diagnosis", out).hasProcessNote).toBe(false);
  });
});
