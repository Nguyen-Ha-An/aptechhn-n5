import { describe, it, expect } from 'vitest';
import { runContrastChecks, getContrastRatio, hexToLuminance } from '../../scripts/contrast';

describe('contrast check calculations', () => {
  it('correctly calculates relative luminance for white and black', () => {
    expect(hexToLuminance('#FFFFFF')).toBeCloseTo(1.0, 2);
    expect(hexToLuminance('#000000')).toBeCloseTo(0.0, 2);
  });

  it('correctly calculates contrast ratio between white and black', () => {
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21.0, 1);
  });

  it('asserts all 14 required token pairs meet WCAG 2.1 AA (>= 4.5:1)', () => {
    const { results, allPassed } = runContrastChecks();
    expect(results).toHaveLength(14);
    expect(allPassed).toBe(true);

    for (const res of results) {
      expect(res.ratio).toBeGreaterThanOrEqual(res.minRatio);
      expect(res.pass).toBe(true);
    }
  });
});
