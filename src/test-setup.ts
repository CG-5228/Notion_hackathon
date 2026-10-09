import "@testing-library/jest-dom/vitest";

// jsdom has no viewport scrolling implementation.
window.scrollTo = vi.fn();
Element.prototype.scrollIntoView = vi.fn();
