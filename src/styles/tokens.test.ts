import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tokens, tokenCssVariables, type ThemeTokens } from './tokens';

describe('tokens parity with app.css', () => {
  const cssPath = path.resolve(__dirname, './app.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('contains all CSS custom property declarations for light theme matching tokens', () => {
    (Object.keys(tokens.light) as (keyof ThemeTokens)[]).forEach((key) => {
      const varName = tokenCssVariables[key];
      const value = tokens.light[key];
      expect(cssContent).toContain(varName);
      expect(cssContent).toContain(value);
    });
  });

  it('contains all CSS custom property values for dark theme matching tokens', () => {
    (Object.keys(tokens.dark) as (keyof ThemeTokens)[]).forEach((key) => {
      const value = tokens.dark[key];
      expect(cssContent).toContain(value);
    });
  });

  it('matches all token values exactly', () => {
    // Light theme block check
    expect(cssContent).toMatch(
      /--color-paper:\s*#FBFAF7;[\s\S]*--color-surface:\s*#F3F1EC;[\s\S]*--color-ink:\s*#1F1E1C;[\s\S]*--color-muted:\s*#6B675F;[\s\S]*--color-rule:\s*#E4E0D7;[\s\S]*--color-accent:\s*#B5432F;[\s\S]*--color-accent-ink:\s*#FFFFFF;[\s\S]*--color-danger:\s*#9F2D20;/
    );

    // Dark theme block check
    expect(cssContent).toMatch(
      /--color-paper:\s*#191817;[\s\S]*--color-surface:\s*#22211F;[\s\S]*--color-ink:\s*#ECEAE4;[\s\S]*--color-muted:\s*#A8A398;[\s\S]*--color-rule:\s*#34322E;[\s\S]*--color-accent:\s*#E07A5F;[\s\S]*--color-accent-ink:\s*#191817;[\s\S]*--color-danger:\s*#F08A7A;/
    );
  });
});
