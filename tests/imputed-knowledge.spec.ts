import { test, expect } from "@playwright/test";
import { detectImputedKnowledge } from "../app/internal/humaniser/imputedKnowledge";
import { capTabloidOutput } from "../app/internal/humaniser/paragraphCap";

test.describe("Imputed-knowledge detector", () => {
  test('flags "The government knows this."', () => {
    const r = detectImputedKnowledge("tabloid", "The government knows this.");
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toContain("knows this");
    expect(r.flaggedLines).toContain("The government knows this.");
  });

  test('flags "It is doing it anyway."', () => {
    const r = detectImputedKnowledge("tabloid", "It is doing it anyway.");
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toContain("doing it anyway");
  });

  test('flags "Ministers knew what would happen."', () => {
    const r = detectImputedKnowledge("cleaner", "Ministers knew what would happen.");
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toContain("knew what");
  });

  test('flags "They deliberately ignored warnings."', () => {
    const r = detectImputedKnowledge("safer", "They deliberately ignored warnings.");
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toEqual(expect.arrayContaining(["deliberately", "ignored warnings"]));
  });

  test('flags "The department was aware of the risk."', () => {
    const r = detectImputedKnowledge("tabloid", "The department was aware of the risk.");
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toContain("was aware");
  });

  test('does not flag harmless use of "knowledge" as a noun', () => {
    const r = detectImputedKnowledge("tabloid", "The report improved public knowledge of the issue.");
    expect(r.hasImputedKnowledgeRisk).toBe(false);
    expect(r.flaggedPhrases).toEqual([]);
  });

  test('does not flag "unknowingly"', () => {
    const r = detectImputedKnowledge("tabloid", "They unknowingly approved the plan.");
    expect(r.hasImputedKnowledgeRisk).toBe(false);
  });

  test("does not run for Mode 4 diagnosis-only output", () => {
    const r = detectImputedKnowledge("diagnosis", "The government knows this. Ministers were aware.");
    expect(r.hasImputedKnowledgeRisk).toBe(false);
    expect(r.flaggedPhrases).toEqual([]);
  });

  test("runs for Modes 1, 2 and 3", () => {
    for (const mode of ["cleaner", "tabloid", "safer"] as const) {
      const r = detectImputedKnowledge(mode, "The minister was aware of the risk.");
      expect(r.hasImputedKnowledgeRisk, mode).toBe(true);
    }
  });

  test("does not change the output text", () => {
    const input = "The government knows this.";
    detectImputedKnowledge("tabloid", input);
    expect(input).toBe("The government knows this.");
  });

  test("works after paragraphCap formatting", () => {
    const raw = "One. Two. Three. The government knows this. It is doing it anyway.";
    const formatted = capTabloidOutput("tabloid", raw);
    const r = detectImputedKnowledge("tabloid", formatted);
    expect(r.hasImputedKnowledgeRisk).toBe(true);
    expect(r.flaggedPhrases).toEqual(expect.arrayContaining(["knows this", "doing it anyway"]));
  });
});
