import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
  writable: true,
  configurable: true,
  value: () => undefined,
});

Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
  writable: true,
  configurable: true,
  value: () => undefined,
});

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  writable: true,
  configurable: true,
  value: vi.fn(() => ({
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 1,
    strokeStyle: "",
    fillStyle: "",
  })),
});
