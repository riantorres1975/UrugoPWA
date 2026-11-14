import { describe, expect, it } from "vitest";
import { getMapViewportBounds } from "@/lib/map-viewport";

describe("visible map window", () => {
  it("uses the visible height on standalone launch before keyboard events", () => {
    expect(getMapViewportBounds({ innerHeight: 844, clientHeight: 844, visualHeight: 732 })).toEqual({ height: 732, top: 0 });
  });
  it("handles both resizing and overlaying keyboards", () => {
    expect(getMapViewportBounds({ innerHeight: 844, clientHeight: 844, visualHeight: 380, offsetTop: 100 })).toEqual({ height: 380, top: 100 });
    expect(getMapViewportBounds({ innerHeight: 380, clientHeight: 380, visualHeight: 380 })).toEqual({ height: 380, top: 0 });
  });
  it("falls back without visualViewport and ignores transient invalid sizes", () => {
    expect(getMapViewportBounds({ innerHeight: 732, clientHeight: 0 })).toEqual({ height: 732, top: 0 });
    expect(getMapViewportBounds({ innerHeight: 732, clientHeight: 732, visualHeight: NaN })).toEqual({ height: 732, top: 0 });
    expect(getMapViewportBounds({ innerHeight: 0, clientHeight: 0 })).toBeNull();
  });
  it("does not reflow controls during pinch zoom", () => {
    expect(getMapViewportBounds({ innerHeight: 844, clientHeight: 844, visualHeight: 422, scale: 2 })).toBeNull();
  });
  it("does not extend a panned visible window past the layout viewport", () => {
    expect(getMapViewportBounds({ innerHeight: 800, clientHeight: 800, visualHeight: 800, offsetTop: 60 })).toEqual({ height: 740, top: 60 });
  });
});
