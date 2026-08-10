import { test, expect } from "@playwright/test";
import { capTabloidOutput, capParagraphs, splitSentenceUnits } from "../app/internal/humaniser/paragraphCap";

test.describe("Mode 2 paragraph cap validator", () => {
  test("a four-sentence paragraph becomes two paragraphs, 3 + 1", () => {
    const out = capTabloidOutput("tabloid", "One thing. Two things. Three things. Four things.");
    expect(out.split("\n\n")).toEqual(["One thing. Two things. Three things.", "Four things."]);
  });

  test("a charge-sheet list of four fragments becomes two paragraphs, 3 + 1", () => {
    const input =
      "The A46 Newark Bypass. The A38 Derby Junctions. Energy projects across Scotland. The Acorn scheme is in doubt.";
    const out = capTabloidOutput("tabloid", input);
    expect(out.split("\n\n")).toEqual([
      "The A46 Newark Bypass. The A38 Derby Junctions. Energy projects across Scotland.",
      "The Acorn scheme is in doubt.",
    ]);
  });

  test("a five-sentence paragraph becomes two paragraphs, 3 + 2", () => {
    const out = capTabloidOutput("tabloid", "One. Two. Three. Four. Five.");
    expect(out.split("\n\n")).toEqual(["One. Two. Three.", "Four. Five."]);
  });

  test("quotes remain unchanged when a paragraph is split", () => {
    const quote = 'She said the plan meant "extra cash for war and overseas interventions, but less for schools and hospitals."';
    const input = `Egan warned about jobs. ${quote} Gethins warned too. The cuts come in autumn.`;
    const out = capTabloidOutput("tabloid", input);
    expect(out).toContain(quote);
    expect(out.split("\n\n").length).toBeGreaterThan(1);
  });

  test("numbers remain unchanged when a paragraph is split", () => {
    const input =
      "Analysis estimates it could cost 10,000 jobs. That is £15 billion redirected. The bill is £2 billion. The trade is set.";
    const out = capTabloidOutput("tabloid", input);
    expect(out).toContain("10,000 jobs");
    expect(out).toContain("£15 billion");
    expect(out).toContain("£2 billion");
  });

  test('"around" remains unchanged when a paragraph is split', () => {
    const input =
      "Analysis estimates the plan could cost around 10,000 jobs. Defence employs fewer people. The government moves money. That is the trade.";
    const out = capTabloidOutput("tabloid", input);
    expect(out).toContain("around 10,000 jobs");
  });

  test("does not split a decimal number", () => {
    expect(splitSentenceUnits("The rate is 3.5 per cent and rising.")).toEqual([
      "The rate is 3.5 per cent and rising.",
    ]);
  });

  test("validator does not run for Mode 1 (cleaner)", () => {
    const input = "One. Two. Three. Four.";
    expect(capTabloidOutput("cleaner", input)).toBe(input);
  });

  test("validator does not run for Mode 3 (safer)", () => {
    const input = "One. Two. Three. Four.";
    expect(capTabloidOutput("safer", input)).toBe(input);
  });

  test("validator does not run for Mode 4 (diagnosis)", () => {
    const input = "One. Two. Three. Four.";
    expect(capTabloidOutput("diagnosis", input)).toBe(input);
  });

  test("paragraphs already within the cap are left alone", () => {
    const input = "One. Two.\n\nThree. Four. Five. Six.";
    expect(capParagraphs(input).split("\n\n")).toEqual(["One. Two.", "Three. Four. Five.", "Six."]);
  });
});
