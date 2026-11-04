import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}

afterEach(() => {
  cleanup();
  // Clear any residual styles/pointer-events on body from Radix dialogs
  if (typeof document !== 'undefined') {
    document.body.style.pointerEvents = 'auto';
    document.body.removeAttribute('data-scroll-locked');
  }
});
