import { test, expect } from "@playwright/test";
import { detectWeakenedTrail, extractAnchors } from "../app/internal/humaniser/documentaryDetail";

// A document-heavy "file" source: dates, figures, section number, URL, regulator,
// quote, denial.
const FILE = `On 18 June 2026 the company filed accounts at Companies House worth £4 million. A £384,000 payment was recorded in March 2025. Section 12 of the Act applies. The archived page is at https://web.archive.org/page. The Electoral Commission opened an inquiry. A spokesperson said the claims were "completely without foundation." Farage denies any wrongdoing.`;

test.describe("Documentary-detail preservation warning", () => {
  test("extracts a range of documentary anchors from a file-style source", () => {
    const anchors = extractAnchors(FILE);
    expect(anchors.length).toBeGreaterThanOrEqual(6);
    expect(anchors.some((a) => a.includes("£4 million"))).toBe(true);
    expect(anchors.some((a) => a.includes("companies house"))).toBe(true);
    expect(anchors.some((a) => a.includes("18 june 2026"))).toBe(true);
  });

  test("does not flag when the rewrite keeps the trail", () => {
    const kept = `Accounts filed at Companies House on 18 June 2026 valued the company at £4 million. A £384,000 payment was logged in March 2025. Section 12 of the Act is engaged, and the archived page sits at https://web.archive.org/page. The Electoral Commission has opened an inquiry. A spokesperson called the claims "completely without foundation," and Farage denies any wrongdoing.`;
    expect(detectWeakenedTrail("tabloid", FILE, kept).hasWeakenedTrail).toBe(false);
  });

  test("flags when the rewrite strips too much of the trail", () => {
    const stripped = `The company was worth a fortune and something dodgy went on. People are angry and questions are being asked about who knew what.`;
    const r = detectWeakenedTrail("tabloid", FILE, stripped);
    expect(r.hasWeakenedTrail).toBe(true);
    expect(r.droppedAnchors.length).toBeGreaterThan(0);
    expect(r.totalAnchors).toBeGreaterThan(r.keptAnchors);
  });

  test("does not activate on an argument piece with few anchors", () => {
    const argument = "Pension money is deferred wages. It belongs to savers. Ministers should win the argument on returns, not guilt.";
    expect(detectWeakenedTrail("tabloid", argument, "A shorter version of the same argument.").hasWeakenedTrail).toBe(false);
  });

  test("does not run for diagnosis", () => {
    expect(detectWeakenedTrail("diagnosis", FILE, "nothing").hasWeakenedTrail).toBe(false);
  });

  test("does not run for reddit", () => {
    expect(detectWeakenedTrail("reddit", FILE, "nothing").hasWeakenedTrail).toBe(false);
  });

  test("does not mutate the output", () => {
    const out = "The company was worth a fortune.";
    detectWeakenedTrail("tabloid", FILE, out);
    expect(out).toBe("The company was worth a fortune.");
  });

  test("activates on a legally sensitive source with 3+ anchors and flags a thin rewrite", () => {
    const src = "On 2 March 2026 the MP faced a standards inquiry over a £5,000 donation. He denies wrongdoing.";
    const thin = "An MP took some money and now there are questions being asked about it.";
    const r = detectWeakenedTrail("tabloid", src, thin);
    expect(r.legallySensitive).toBe(true);
    expect(r.hasWeakenedTrail).toBe(true);
  });

  test("a legally sensitive source that keeps its receipts does not flag", () => {
    const src = "On 2 March 2026 the MP faced a standards inquiry over a £5,000 donation. He denies wrongdoing.";
    const kept = "On 2 March 2026 the MP faced a standards inquiry over a £5,000 donation. He denies wrongdoing, his office said.";
    expect(detectWeakenedTrail("tabloid", src, kept).hasWeakenedTrail).toBe(false);
  });
});
