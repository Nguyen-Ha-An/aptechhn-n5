import { describe, it, expect } from 'vitest';
import {
  SLASH_COMMAND_ITEMS,
  filterSlashItems,
  isSlashTriggerAllowed,
} from './slashCommand';

describe('slashCommand', () => {
  it('contains the 10 specified block command items', () => {
    expect(SLASH_COMMAND_ITEMS).toHaveLength(10);
    const ids = SLASH_COMMAND_ITEMS.map((item) => item.id);
    expect(ids).toEqual([
      'text',
      'heading-1',
      'heading-2',
      'heading-3',
      'bullet-list',
      'ordered-list',
      'task-list',
      'blockquote',
      'code-block',
      'horizontal-rule',
    ]);
  });

  it('filters command list by title and hint case-insensitively', () => {
    expect(filterSlashItems('')).toHaveLength(10);
    expect(filterSlashItems('heading')).toHaveLength(3);
    expect(filterSlashItems('h1')).toHaveLength(1);
    expect(filterSlashItems('to-do')).toHaveLength(1);
    expect(filterSlashItems('quote')).toHaveLength(1);
    expect(filterSlashItems('code')).toHaveLength(1);
    expect(filterSlashItems('divider')).toHaveLength(1);
    expect(filterSlashItems('nonexistent query')).toHaveLength(0);
  });

  it('triggers only at the start of a block or after whitespace', () => {
    // Start of a block (parentOffset === 0)
    expect(isSlashTriggerAllowed({ parentOffset: 0, charBefore: '' })).toBe(true);

    // After space or tab or newline
    expect(isSlashTriggerAllowed({ parentOffset: 5, charBefore: ' ' })).toBe(true);
    expect(isSlashTriggerAllowed({ parentOffset: 3, charBefore: '\t' })).toBe(true);
    expect(isSlashTriggerAllowed({ parentOffset: 1, charBefore: '\n' })).toBe(true);

    // After non-whitespace (e.g. typing URL https://x.y/z)
    expect(isSlashTriggerAllowed({ parentOffset: 6, charBefore: ':' })).toBe(false);
    expect(isSlashTriggerAllowed({ parentOffset: 12, charBefore: 'y' })).toBe(false);
    expect(isSlashTriggerAllowed({ parentOffset: 8, charBefore: '/' })).toBe(false);
    expect(isSlashTriggerAllowed({ parentOffset: 4, charBefore: 'a' })).toBe(false);
  });
});
