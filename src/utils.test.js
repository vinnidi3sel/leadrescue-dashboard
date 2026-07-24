import { isDayActive, hexToRgb, parseRecap } from "./utils";

describe("isDayActive", () => {
  it("returns false for missing or empty days", () => {
    expect(isDayActive("Mon", null)).toBe(false);
    expect(isDayActive("Mon", undefined)).toBe(false);
    expect(isDayActive("Mon", [])).toBe(false);
  });

  it("matches exact day keys case-insensitively", () => {
    expect(isDayActive("Tue", ["Tue"])).toBe(true);
    expect(isDayActive("Tue", ["tue"])).toBe(true);
    expect(isDayActive("Tue", ["TUE"])).toBe(true);
    expect(isDayActive("Wed", ["Tue"])).toBe(false);
  });

  it("matches full day names against short keys", () => {
    expect(isDayActive("Tue", ["Tuesday"])).toBe(true);
    expect(isDayActive("Sat", ["saturday"])).toBe(true);
    expect(isDayActive("Sun", ["Saturday"])).toBe(false);
  });

  it('activates every day for "today" and "anytime"', () => {
    for (const dk of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]) {
      expect(isDayActive(dk, ["today"])).toBe(true);
      expect(isDayActive(dk, ["Anytime"])).toBe(true);
    }
  });

  it('activates Mon–Fri for "weekdays" and Sat/Sun for "weekend"', () => {
    for (const dk of ["Mon","Tue","Wed","Thu","Fri"]) {
      expect(isDayActive(dk, ["weekdays"])).toBe(true);
      expect(isDayActive(dk, ["weekend"])).toBe(false);
    }
    for (const dk of ["Sat","Sun"]) {
      expect(isDayActive(dk, ["weekend"])).toBe(true);
      expect(isDayActive(dk, ["weekdays"])).toBe(false);
    }
  });

  it("matches any day in a multi-day list", () => {
    expect(isDayActive("Mon", ["Tue","Mon"])).toBe(true);
    expect(isDayActive("Fri", ["Tue","Mon"])).toBe(false);
  });

  // Documents current behavior: prefix matching is bidirectional, so a bare
  // initial like "T" lights up both Tue and Thu. If this is ever considered
  // wrong, this test is the place where the decision is recorded.
  it("treats single-letter entries as matching every day sharing that initial", () => {
    expect(isDayActive("Tue", ["T"])).toBe(true);
    expect(isDayActive("Thu", ["T"])).toBe(true);
    expect(isDayActive("Sat", ["S"])).toBe(true);
    expect(isDayActive("Sun", ["S"])).toBe(true);
    expect(isDayActive("Mon", ["T"])).toBe(false);
  });
});

describe("hexToRgb", () => {
  it("converts hex colors with or without a leading #", () => {
    expect(hexToRgb("#c89456")).toBe("200,148,86");
    expect(hexToRgb("c89456")).toBe("200,148,86");
    expect(hexToRgb("#FFFFFF")).toBe("255,255,255");
    expect(hexToRgb("#000000")).toBe("0,0,0");
  });

  it("falls back to grey for malformed input", () => {
    expect(hexToRgb("")).toBe("128,128,128");
    expect(hexToRgb("#fff")).toBe("128,128,128");
    expect(hexToRgb("not-a-color")).toBe("128,128,128");
  });
});

describe("parseRecap", () => {
  it("returns a single text part when there are no quotes", () => {
    expect(parseRecap("plain sentence")).toEqual([
      { type: "text", val: "plain sentence" },
    ]);
  });

  it("returns an empty list for an empty string", () => {
    expect(parseRecap("")).toEqual([]);
  });

  it("splits out a quote in the middle of text", () => {
    expect(parseRecap("She said <q>no heat</q> twice.")).toEqual([
      { type: "text", val: "She said " },
      { type: "q", val: "no heat" },
      { type: "text", val: " twice." },
    ]);
  });

  it("handles multiple quotes and quotes at the start and end", () => {
    expect(parseRecap("<q>first</q> then <q>second</q>")).toEqual([
      { type: "q", val: "first" },
      { type: "text", val: " then " },
      { type: "q", val: "second" },
    ]);
  });

  it("treats an unclosed <q> as plain text", () => {
    expect(parseRecap("She said <q>no heat")).toEqual([
      { type: "text", val: "She said <q>no heat" },
    ]);
  });
});
