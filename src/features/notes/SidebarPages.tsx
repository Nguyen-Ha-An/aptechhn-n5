import { useState, useCallback, useContext } from 'react';
import { Link, useNavigate, useRouterState } from '@tanstack/react-router';
import { QueryClientContext } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  MagnifyingGlass,
  CaretRight,
  DotsThree,
  Trash,
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import {
  IconButton,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  Skeleton,
} from '@/components/ui';
import {
  useNotesTree,
  useCreateNote,
  useArchiveNote,
  useRestoreNote,
} from './queries';
import { buildTree, type NoteTreeNode } from './tree';
import { SearchNotesDialog } from './SearchNotesDialog';

interface TreeNodeRowProps {
  node: NoteTreeNode;
  depth?: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onAddSubpage: (parentId: string) => void;
  onArchive: (id: string, title: string) => void;
  currentNoteId?: string;
}

function TreeNodeRow({
  node,
  depth = 0,
  expandedIds,
  onToggleExpand,
  onAddSubpage,
  onArchive,
  currentNoteId,
}: TreeNodeRowProps) {
  const navigate = useNavigate();
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isCurrent = currentNoteId === node.id;

  return (
    <div
      role="treeitem"
      aria-selected={isCurrent}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-level={depth + 1}
    >
      <div
        className={`group relative flex h-7 items-center gap-1 rounded-[6px] px-1 text-xs transition-colors ${
          isCurrent
            ? 'bg-paper font-semibold text-ink'
            : 'text-ink hover:bg-surface'
        }`}
        style={{ paddingLeft: `${Math.max(4, depth * 14 + 4)}px` }}
      >
        {/* Expand / collapse trigger */}
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? `Collapse ${node.title || 'Untitled'}` : `Expand ${node.title || 'Untitled'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node.id);
            }}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] text-muted hover:bg-surface hover:text-ink"
          >
            <CaretRight
              size={12}
              className={`transition-transform duration-120 ${isExpanded ? 'rotate-90' : ''}`}
              aria-hidden="true"
            />
          </button>
        ) : (
          <span className="w-5 shrink-0" aria-hidden="true" />
        )}

        {/* Page Link */}
        <Link
          to="/notes/$noteId"
          params={{ noteId: node.id }}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate py-1 outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">
            {node.icon ? (
              <span role="img" aria-hidden="true">
                {node.icon}
              </span>
            ) : (
              <FileText size={14} className="text-muted" aria-hidden="true" />
            )}
          </span>
          <span className="truncate">{node.title || 'Untitled'}</span>
        </Link>

        {/* Row Menu */}
        <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label="More options"
                className="flex h-5 w-5 items-center justify-center rounded-[4px] text-muted hover:bg-surface hover:text-ink"
              >
                <DotsThree size={14} weight="bold" aria-hidden="true" />
              </button>
            </MenuTrigger>
            <MenuContent align="start">
              <MenuItem onSelect={() => onAddSubpage(node.id)}>
                Add subpage
              </MenuItem>
              <MenuItem
                onSelect={() => {
                  void navigate({
                    to: '/notes/$noteId',
                    params: { noteId: node.id },
                  });
                }}
              >
                Rename
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                destructive
                onSelect={() => onArchive(node.id, node.title || 'Untitled')}
              >
                Move to trash
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div role="group">
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              onAddSubpage={onAddSubpage}
              onArchive={onArchive}
              currentNoteId={currentNoteId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarPages() {
  const queryContext = useContext(QueryClientContext);
  if (!queryContext) {
    return (
      <div className="mt-6 px-3">
        <div className="flex items-center justify-between text-xs font-semibold text-muted mb-1.5">
          <span>Pages</span>
        </div>
      </div>
    );
  }
  return <SidebarPagesContent />;
}

function SidebarPagesContent() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  // Extract current note ID if on /notes/$noteId
  const match = currentPath.match(/\/notes\/([^/]+)/);
  const currentNoteId = match && match[1] !== 'trash' ? match[1] : undefined;

  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: notes, isLoading, isError } = useNotesTree();
  const createNote = useCreateNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();

  const tree = buildTree(notes ?? []);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreateRootPage = async () => {
    try {
      const res = await createNote.mutateAsync({});
      if (res?.id) {
        await navigate({
          to: '/notes/$noteId',
          params: { noteId: res.id },
        });
      }
    } catch {
      toast.error('Could not create page.');
    }
  };

  const handleAddSubpage = async (parentId: string) => {
    try {
      const res = await createNote.mutateAsync({ parentId });
      if (res?.id) {
        setExpandedIds((prev) => new Set(prev).add(parentId));
        await navigate({
          to: '/notes/$noteId',
          params: { noteId: res.id },
        });
      }
    } catch {
      toast.error('Could not create subpage.');
    }
  };

  const handleArchive = async (id: string, title: string) => {
    try {
      await archiveNote.mutateAsync(id);
      toast.success(`Moved "${title}" to trash`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreNote.mutateAsync(id);
          },
        },
      });
      if (currentNoteId === id) {
        await navigate({ to: '/' });
      }
    } catch {
      toast.error('Could not archive page.');
    }
  };

  return (
    <div className="mt-6 px-3">
      {/* Section Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted mb-1.5">
        <span>Pages</span>
        <div className="flex items-center gap-0.5">
          <IconButton
            label="Search pages"
            size="sm"
            onClick={() => setSearchOpen(true)}
          >
            <MagnifyingGlass size={14} aria-hidden="true" />
          </IconButton>
          <IconButton
            label="New page"
            size="sm"
            onClick={() => void handleCreateRootPage()}
          >
            <Plus size={14} aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      {/* Pages Content */}
      {isLoading ? (
        <div className="py-2">
          <Skeleton rows={3} />
        </div>
      ) : isError ? (
        <div className="py-2 text-xs text-danger">Failed to load pages.</div>
      ) : tree.length === 0 ? (
        <div className="py-2">
          <p className="text-xs text-muted mb-2">No pages yet</p>
          <button
            type="button"
            onClick={() => void handleCreateRootPage()}
            className="flex items-center gap-1.5 text-xs text-ink hover:underline font-medium"
          >
            <Plus size={12} aria-hidden="true" />
            <span>New page</span>
          </button>
        </div>
      ) : (
        <div
          role="tree"
          aria-label="Pages"
          className="space-y-0.5"
        >
          {tree.map((node) => (
            <TreeNodeRow
              key={node.id}
              node={node}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              onAddSubpage={(pId) => void handleAddSubpage(pId)}
              onArchive={(nId, t) => void handleArchive(nId, t)}
              currentNoteId={currentNoteId}
            />
          ))}
        </div>
      )}

      {/* Trash link */}
      <div className="mt-3 pt-2 border-t border-rule">
        <Link
          to="/notes/trash"
          className={`flex h-7 items-center gap-2 rounded-[6px] px-2 text-xs transition-colors ${
            currentPath === '/notes/trash'
              ? 'bg-paper font-semibold text-ink'
              : 'text-muted hover:bg-surface hover:text-ink'
          }`}
        >
          <Trash size={14} aria-hidden="true" />
          <span>Trash</span>
        </Link>
      </div>

      <SearchNotesDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectNote={(noteId) => {
          void navigate({
            to: '/notes/$noteId',
            params: { noteId },
          });
        }}
      />
    </div>
  );
}
