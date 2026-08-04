import { describe, expect, it } from "vitest";
import { isValidSlug, normalizeSlug, suggestSlugFromName } from "@/lib/slug";

describe("slug helpers", () => {
  it("normalizes names into URL slugs", () => {
    expect(normalizeSlug("Blue Ionian Tours!")).toBe("blue-ionian-tours");
    expect(normalizeSlug("  Saranda--Boat  ")).toBe("saranda-boat");
  });

  it("validates slug shape", () => {
    expect(isValidSlug("blue-ionian")).toBe(true);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("-bad-")).toBe(false);
    expect(isValidSlug("Upper")).toBe(false);
  });

  it("suggests a fallback slug", () => {
    expect(suggestSlugFromName("X")).toBe("my-tours");
    expect(suggestSlugFromName("Ksamil Dive")).toBe("ksamil-dive");
  });
});
