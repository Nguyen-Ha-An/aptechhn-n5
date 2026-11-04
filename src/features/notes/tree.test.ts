import { describe, it, expect } from 'vitest';
import { buildTree, type NoteItem } from './tree';

describe('buildTree', () => {
  it('returns empty array when given empty list', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('builds flat root nodes when no parent_id is set and sorts by position', () => {
    const items: NoteItem[] = [
      { id: '3', parent_id: null, title: 'Third', icon: null, position: 30 },
      { id: '1', parent_id: null, title: 'First', icon: null, position: 10 },
      { id: '2', parent_id: null, title: 'Second', icon: null, position: 20 },
    ];

    const tree = buildTree(items);
    expect(tree.map((n) => n.id)).toEqual(['1', '2', '3']);
    expect(tree[0]?.children).toEqual([]);
  });

  it('nests children under their parents and sorts siblings by position', () => {
    const items: NoteItem[] = [
      { id: 'root-1', parent_id: null, title: 'Root 1', icon: '📁', position: 1 },
      { id: 'child-1-2', parent_id: 'root-1', title: 'Child 1.2', icon: null, position: 20 },
      { id: 'child-1-1', parent_id: 'root-1', title: 'Child 1.1', icon: null, position: 10 },
      { id: 'root-2', parent_id: null, title: 'Root 2', icon: null, position: 2 },
      { id: 'subchild', parent_id: 'child-1-1', title: 'Deep Subchild', icon: null, position: 5 },
    ];

    const tree = buildTree(items);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.id).toBe('root-1');
    expect(tree[0]?.children.map((c) => c.id)).toEqual(['child-1-1', 'child-1-2']);
    expect(tree[0]?.children[0]?.children.map((c) => c.id)).toEqual(['subchild']);
    expect(tree[1]?.id).toBe('root-2');
  });

  it('handles orphans (parent not in list) and self-references by placing at root', () => {
    const items: NoteItem[] = [
      { id: 'orphan', parent_id: 'missing-parent', title: 'Orphan', icon: null, position: 1 },
      { id: 'self', parent_id: 'self', title: 'Self Parent', icon: null, position: 2 },
    ];

    const tree = buildTree(items);
    expect(tree).toHaveLength(2);
    expect(tree.map((n) => n.id)).toEqual(['orphan', 'self']);
  });
});
