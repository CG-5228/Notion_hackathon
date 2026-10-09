import "@testing-library/jest-dom/vitest";

// jsdom has no viewport scrolling implementation.
if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
}
