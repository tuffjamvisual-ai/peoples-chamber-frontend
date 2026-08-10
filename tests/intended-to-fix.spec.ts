import { test, expect } from "@playwright/test";
import { detectImputedKnowledge } from "../app/internal/humaniser/imputedKnowledge";
import { detectDroppedHedges } from "../app/internal/humaniser/approximationHedge";

test.describe('"intended to" false-positive fix', () => {
  test('imputed: "intended to unlock up to £50 billion" (thing purpose) does not fire', () => {
    expect(
      detectImputedKnowledge("tabloid", "a voluntary deal with major pension providers intended to unlock up to £50 billion").hasImputedKnowledgeRisk,
    ).toBe(false);
    expect(
      detectImputedKnowledge("tabloid", "Reeves secured a deal intended to unlock up to £50 billion of investment.").hasImputedKnowledgeRisk,
    ).toBe(false);
  });

  test('imputed: "ministers intended to" / "he intended to" (actor) still fire', () => {
    expect(detectImputedKnowledge("tabloid", "Ministers intended to force the funds to invest at home.").hasImputedKnowledgeRisk).toBe(true);
    expect(detectImputedKnowledge("tabloid", "He intended to mislead the committee.").hasImputedKnowledgeRisk).toBe(true);
  });

  test("approx: intended-to-unlock-up-to-£50-billion preserved = no hedge warning", () => {
    expect(
      detectDroppedHedges(
        "tabloid",
        "a deal intended to unlock up to £50 billion",
        "a deal intended to unlock up to £50 billion of investment",
      ).hasDroppedHedge,
    ).toBe(false);
  });

  test('approx: "up to £50 billion" -> "£50 billion" = warning', () => {
    const r = detectDroppedHedges("tabloid", "a deal to unlock up to £50 billion", "a deal to unlock £50 billion");
    expect(r.hasDroppedHedge).toBe(true);
    expect(r.drops[0].missingHedge).toBe("up to");
  });

  test('approx: "around 10,000" -> "10,000" = warning', () => {
    expect(detectDroppedHedges("tabloid", "could cost around 10,000 jobs", "could cost 10,000 jobs").hasDroppedHedge).toBe(true);
  });

  test('approx: "roughly two thirds" -> "two thirds" = warning', () => {
    expect(detectDroppedHedges("tabloid", "roughly two thirds of places", "two thirds of places").hasDroppedHedge).toBe(true);
  });
});
