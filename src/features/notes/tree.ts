export interface NoteItem {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  position: number;
}

export interface NoteTreeNode extends NoteItem {
  children: NoteTreeNode[];
}

/**
 * Builds a hierarchical tree from a flat list of note records.
 * Sibling nodes are sorted ascending by position.
 * Cycles or orphans (parent_id pointing to missing node) are attached to root.
 */
export function buildTree(items: NoteItem[]): NoteTreeNode[] {
  const itemMap = new Map<string, NoteTreeNode>();

  for (const item of items) {
    itemMap.set(item.id, {
      ...item,
      children: [],
    });
  }

  const roots: NoteTreeNode[] = [];

  for (const item of items) {
    const node = itemMap.get(item.id)!;
    const parent = item.parent_id ? itemMap.get(item.parent_id) : undefined;

    // Avoid self-parenting and link to valid parent
    if (parent && parent.id !== item.id) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortNodes(nodes: NoteTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.position !== b.position) {
        return a.position - b.position;
      }
      return a.title.localeCompare(b.title);
    });

    for (const node of nodes) {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    }
  }

  sortNodes(roots);
  return roots;
}
