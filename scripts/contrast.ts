import { tokens } from '../src/styles/tokens';

interface ContrastCheck {
  theme: 'light' | 'dark';
  pair: string;
  fgName: string;
  fgHex: string;
  bgName: string;
  bgHex: string;
  ratio: number;
  minRatio: number;
  pass: boolean;
}

function sRgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function hexToLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  let r = 0;
  let g = 0;
  let b = 0;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex.charAt(0) + cleanHex.charAt(0), 16) / 255;
    g = parseInt(cleanHex.charAt(1) + cleanHex.charAt(1), 16) / 255;
    b = parseInt(cleanHex.charAt(2) + cleanHex.charAt(2), 16) / 255;
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function runContrastChecks(): { results: ContrastCheck[]; allPassed: boolean } {
  const requiredPairs: { fg: 'ink' | 'muted' | 'accent' | 'accentInk'; bg: 'paper' | 'surface' | 'accent'; min: number }[] = [
    { fg: 'ink', bg: 'paper', min: 4.5 },
    { fg: 'ink', bg: 'surface', min: 4.5 },
    { fg: 'muted', bg: 'paper', min: 4.5 },
    { fg: 'muted', bg: 'surface', min: 4.5 },
    { fg: 'accent', bg: 'paper', min: 4.5 },
    { fg: 'accent', bg: 'surface', min: 4.5 },
    { fg: 'accentInk', bg: 'accent', min: 4.5 },
  ];

  const results: ContrastCheck[] = [];

  for (const theme of ['light', 'dark'] as const) {
    const palette = tokens[theme];
    for (const item of requiredPairs) {
      const fgHex = palette[item.fg];
      const bgHex = palette[item.bg];
      const ratio = getContrastRatio(fgHex, bgHex);
      const pass = ratio >= item.min;

      results.push({
        theme,
        pair: `${item.fg} on ${item.bg}`,
        fgName: item.fg,
        fgHex,
        bgName: item.bg,
        bgHex,
        ratio: Math.round(ratio * 100) / 100,
        minRatio: item.min,
        pass,
      });
    }
  }

  const allPassed = results.every((r) => r.pass);
  return { results, allPassed };
}

function main() {
  console.log('Running WCAG 2.1 AA Contrast Checks for FocusLearn Palette...\n');
  const { results, allPassed } = runContrastChecks();

  // Print formatted markdown / ASCII table
  console.log('| Theme | Pair | FG Hex | BG Hex | Contrast Ratio | Min Required | Result |');
  console.log('|---|---|---|---|---|---|---|');
  for (const row of results) {
    const formattedRatio = `${row.ratio.toFixed(2)}:1`;
    const minReq = `${row.minRatio.toFixed(1)}:1`;
    const status = row.pass ? 'PASS' : 'FAIL';
    console.log(
      `| ${row.theme.padEnd(5)} | ${row.pair.padEnd(20)} | ${row.fgHex} | ${row.bgHex} | ${formattedRatio.padEnd(14)} | ${minReq.padEnd(12)} | ${status} |`
    );
  }

  console.log('');
  if (allPassed) {
    console.log('✓ All 14 contrast checks passed (WCAG 2.1 AA >= 4.5:1).');
    process.exit(0);
  } else {
    console.error('✗ Some contrast checks failed to meet the required threshold.');
    process.exit(1);
  }
}

if (import.meta.main || process.argv[1]?.endsWith('contrast.ts')) {
  main();
}
