import { test, expect } from "@playwright/test";
import { detectDroppedHedges } from "../app/internal/humaniser/approximationHedge";

test.describe("Approximation-hedge checker", () => {
  test('flags "around 10,000" becoming "10,000"', () => {
    const r = detectDroppedHedges("tabloid", "The plan could cost around 10,000 jobs.", "The plan could cost 10,000 jobs.");
    expect(r.hasDroppedHedge).toBe(true);
    expect(r.drops[0].figure).toBe("10,000");
    expect(r.drops[0].missingHedge).toBe("around");
  });

  test('flags "Roughly two thirds" becoming "Two thirds"', () => {
    const r = detectDroppedHedges("tabloid", "Roughly two thirds of places are private.", "Two thirds of places are private.");
    expect(r.hasDroppedHedge).toBe(true);
    expect(r.drops[0].figure.toLowerCase()).toBe("two thirds");
    expect(r.drops[0].missingHedge.toLowerCase()).toBe("roughly");
  });

  test('flags "up to £10,000" becoming "£10,000"', () => {
    const r = detectDroppedHedges("tabloid", "Councils paid up to £10,000 a week.", "Councils paid £10,000 a week.");
    expect(r.hasDroppedHedge).toBe(true);
    expect(r.drops[0].missingHedge).toBe("up to");
  });

  test('flags "an estimated £1.6 billion" becoming "£1.6 billion"', () => {
    const r = detectDroppedHedges("safer", "Councils spent an estimated £1.6 billion.", "Councils spent £1.6 billion.");
    expect(r.hasDroppedHedge).toBe(true);
    expect(r.drops[0].missingHedge.toLowerCase()).toBe("an estimated");
  });

  test('does not flag "around 10,000" becoming "roughly 10,000"', () => {
    const r = detectDroppedHedges("tabloid", "It could cost around 10,000 jobs.", "It could cost roughly 10,000 jobs.");
    expect(r.hasDroppedHedge).toBe(false);
  });

  test('does not flag "more than £4 million" becoming "over £4 million"', () => {
    const r = detectDroppedHedges("cleaner", "A portfolio worth more than £4 million.", "A portfolio worth over £4 million.");
    expect(r.hasDroppedHedge).toBe(false);
  });

  test('does not flag when the output preserves "up to"', () => {
    const r = detectDroppedHedges("tabloid", "Councils paid up to £10,000 a week.", "Some councils paid up to £10,000 a week.");
    expect(r.hasDroppedHedge).toBe(false);
  });

  test("does not flag when the figure is absent from the output", () => {
    const r = detectDroppedHedges("tabloid", "It could cost around 10,000 jobs.", "It could cost many jobs.");
    expect(r.hasDroppedHedge).toBe(false);
  });

  test("does not mutate the output text", () => {
    const output = "The plan could cost 10,000 jobs.";
    detectDroppedHedges("tabloid", "around 10,000 jobs", output);
    expect(output).toBe("The plan could cost 10,000 jobs.");
  });

  test("runs for Modes 1, 2 and 3", () => {
    for (const mode of ["cleaner", "tabloid", "safer"] as const) {
      const r = detectDroppedHedges(mode, "Roughly two thirds of places.", "Two thirds of places.");
      expect(r.hasDroppedHedge, mode).toBe(true);
    }
  });

  test("does not run for Mode 4 diagnosis", () => {
    const r = detectDroppedHedges("diagnosis", "Roughly two thirds of places.", "Two thirds of places.");
    expect(r.hasDroppedHedge).toBe(false);
    expect(r.drops).toEqual([]);
  });
});
