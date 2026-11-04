import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

declare const Bun: {
  YAML: {
    parse(input: string): unknown;
  };
};

describe('GitHub Actions workflows YAML validation', () => {
  const workflowsDir = path.resolve(__dirname, '../../.github/workflows');
  const files = ['ci.yml', 'pages.yml', 'supabase.yml'];

  for (const filename of files) {
    it(`parses ${filename} as valid YAML`, () => {
      const filePath = path.join(workflowsDir, filename);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = Bun.YAML.parse(content) as { name?: string; jobs?: Record<string, unknown> };
      expect(parsed).toBeDefined();
      expect(typeof parsed.name).toBe('string');
      expect(parsed.jobs).toBeDefined();
      expect(Object.keys(parsed.jobs ?? {}).length).toBeGreaterThan(0);
    });
  }
});
