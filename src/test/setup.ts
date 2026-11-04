import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

configure({ asyncUtilTimeout: 3000 });

if (typeof window !== 'undefined') {
  window.scrollTo = () => {};

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

afterEach(() => {
  cleanup();
  // Clear any residual styles/pointer-events on body from Radix dialogs
  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = 'auto';
    document.body.removeAttribute('data-scroll-locked');
  }
});
