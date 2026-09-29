import { describe, expect, it } from "vitest";
import { classifyGenre, classifyStyles } from "../src/classify";

describe("classifyGenre", () => {
  it("maps source categories", () => {
    expect(classifyGenre("Battle", "Battle Pro 2026")).toBe("battle");
    expect(classifyGenre("Show", "Hip Hope")).toBe("show");
    expect(classifyGenre("Compétition", "P.O.W")).toBe("competition");
    expect(classifyGenre("Camp", "Summer camp")).toBe("camp");
    expect(classifyGenre(null, "Something")).toBe("other");
  });
  it("detects workshops and conferences from the title", () => {
    expect(classifyGenre("Battle", "Popping Workshop with Boogaloo Sam")).toBe("workshop");
    expect(classifyGenre("Festival", "Hip-hop conference 2026")).toBe("conference");
  });
});

describe("classifyStyles", () => {
  it("detects specific styles", () => {
    expect(classifyStyles("Locking & Popping Jam")).toEqual(expect.arrayContaining(["locking", "popping"]));
    expect(classifyStyles("Waacking Night")).toContain("waacking");
    expect(classifyStyles("Electro Style Battle")).toContain("electro");
  });
  it("adds hip-hop to breaking events and defaults to hip-hop", () => {
    expect(classifyStyles("BBoy Battle")).toEqual(expect.arrayContaining(["breaking", "hip-hop"]));
    expect(classifyStyles("Mystery event")).toEqual(["hip-hop"]);
  });
  it("detects all-style", () => {
    expect(classifyStyles("All Style Battle")).toContain("all-style");
  });
});
