import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

function luminance(hex) {
  const rgb = hex.length === 3 ? [...hex].map(char => char + char).join('') : hex;
  const channels = rgb.match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test('light and dark text colors meet WCAG AA contrast', () => {
  const css = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const block of css.matchAll(/:root[^}]+}/g)) {
    const colors = Object.fromEntries([...block[0].matchAll(/--([\w-]+): #([a-f0-9]+)/g)].map(match => [match[1], luminance(match[2])]));
    const ratio = (a, b) => (Math.max(colors[a], colors[b]) + 0.05) / (Math.min(colors[a], colors[b]) + 0.05);
    for (const background of ['paper', 'surface']) {
      expect(ratio('ink', background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('muted', background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio('on-accent', 'accent')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('accent', 'paper')).toBeGreaterThanOrEqual(3);
  }
});
