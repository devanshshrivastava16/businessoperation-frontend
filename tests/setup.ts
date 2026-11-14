import '@testing-library/jest-dom/vitest'

// Minimal polyfills required by framer-motion / jsdom
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList
  }
  if (!window.ResizeObserver) {
    class ResizeObserverPolyfill {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver
  }
}
