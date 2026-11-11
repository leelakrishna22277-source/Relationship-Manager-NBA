import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";
import { handleTestFetch } from "./__tests__/testFetchHandler";

// Configure virtual fetch for Vitest isolated test environment (never bundles into production)
globalThis.fetch = vi.fn(async (url, options) => {
  return handleTestFetch(String(url), options);
});

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => { },
      removeListener: () => { },
      addEventListener: () => { },
      removeEventListener: () => { },
      dispatchEvent: () => false,
    }),
  });
}

const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index) => Object.keys(store)[index] ?? null,
  };
};

const storageMock = createLocalStorageMock();
Object.defineProperty(window, "localStorage", {
  value: storageMock,
  writable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  value: storageMock,
  writable: true,
});

const sessionStorageMock = createLocalStorageMock();
Object.defineProperty(window, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

beforeEach(() => {
  try {
    sessionStorage.clear();
    localStorage.clear();
  } catch { }
});

