import "@testing-library/jest-dom";
import React from "react";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

(global as typeof globalThis & { __mockRouter?: typeof mockRouter }).__mockRouter = mockRouter;

jest.mock("next/navigation", () => ({
  useRouter: () => (global as typeof globalThis & { __mockRouter?: typeof mockRouter }).__mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "",
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, fill, priority, ...rest } = props;
    const resolvedSrc = typeof src === "string" ? src : src?.src || "";
    return React.createElement("img", { src: resolvedSrc, alt: alt || "", ...rest });
  },
}));

beforeEach(() => {
  Object.values(mockRouter).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockClear();
    }
  });
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});
