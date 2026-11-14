import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'motion/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Animations should not add timing noise to unit tests. Motion renders the final state instead.
MotionGlobalConfig.skipAnimations = true;

// jsdom has no HTTP server. Serve the checked-in mock bundle from disk so the
// screens exercise the same adapter as the browser.
const nativeFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  if (url.startsWith('/mock/')) {
    // Vitest runs with the project root as cwd; `public/` is at that root.
    const path = resolve(process.cwd(), `public${url}`);
    try {
      const body = readFileSync(path);
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': url.endsWith('.json') ? 'application/json' : 'image/png' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  }
  return nativeFetch(input, init);
}) as typeof fetch;

afterEach(() => cleanup());

// jsdom lacks a few browser APIs that Radix UI and the charts expect.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof ResizeObserver;

class NoopIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver ??=
  NoopIntersectionObserver as unknown as typeof IntersectionObserver;

Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
