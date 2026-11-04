import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { formatTime } from '@/lib/dates';
import {
  EmptyState,
  ErrorState,
  Skeleton,
  Button,
  IconButton,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
} from '@/components/ui';
import { NoteEditor } from '@/features/notes/editor/NoteEditor';
import { PageIconPicker } from '@/features/notes/PageIconPicker';
import {
  useCreateNote,
  useArchiveNote,
  useRestoreNote,
  useBacklinks,
  useNotesTree,
  type NoteRow,
} from '@/features/notes/queries';
import { useAutosave } from '@/features/notes/useAutosave';
import { useProfile } from '@/features/profile/queries';
import { DotsThree, FileText } from '@phosphor-icons/react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/notes/$noteId')({
  component: NotePage,
});

function NotePage() {
  const { noteId } = Route.useParams();
  const navigate = useNavigate();

  // Query note data
  const {
    data: note,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: qk.note(noteId),
    queryFn: async (): Promise<NoteRow | null> => {
      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('id, parent_id, icon, title, content, content_text, position, archived_at, created_at, updated_at')
        .eq('id', noteId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }
      return data as NoteRow | null;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="border-b border-rule pb-4 mb-6">
          <Skeleton rows={1} className="w-1/3" />
        </div>
        <Skeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error loading page"
        message={error instanceof Error ? error.message : 'Could not load page.'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!note || note.archived_at) {
    return (
      <EmptyState
        title="Not found"
        body="This page does not exist or was moved to trash."
        action={
          <Link to="/">
            <Button variant="secondary">Go to Today</Button>
          </Link>
        }
      />
    );
  }

  return (
    <NoteEditorView
      note={note}
      noteId={noteId}
      onNavigate={(id) => {
        void navigate({ to: '/notes/$noteId', params: { noteId: id } });
      }}
    />
  );
}

interface NoteEditorViewProps {
  note: NoteRow;
  noteId: string;
  onNavigate: (id: string) => void;
}

function NoteEditorView({
  note,
  noteId,
  onNavigate,
}: NoteEditorViewProps) {
  const navigate = useNavigate();
  const { data: backlinks, isLoading: backlinksLoading } = useBacklinks(noteId);
  const { data: notesTreeItems } = useNotesTree();

  const createNote = useCreateNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();

  const handleAddSubpage = async () => {
    try {
      const res = await createNote.mutateAsync({ parentId: noteId });
      if (res?.id) {
        await navigate({
          to: '/notes/$noteId',
          params: { noteId: res.id },
        });
      }
    } catch {
      toast.error('Could not create subpage.');
    }
  };

  const handleArchive = async () => {
    try {
      await archiveNote.mutateAsync(noteId);
      toast.success(`Moved "${note.title || 'Untitled'}" to trash`, {
        action: {
          label: 'Undo',
          onClick: () => {
            void restoreNote.mutateAsync(noteId);
          },
        },
      });
      await navigate({ to: '/' });
    } catch {
      toast.error('Could not archive page.');
    }
  };

  const handleCreateLinkedPage = async (title: string) => {
    try {
      const res = await createNote.mutateAsync({ title });
      return res?.id;
    } catch {
      toast.error('Could not create page.');
      return undefined;
    }
  };
  const { data: profile } = useProfile();
  const tz = profile?.timezone ?? 'Asia/Ho_Chi_Minh';

  const {
    title,
    icon,
    saveStatus,
    setTitle,
    setIcon,
    setContent,
    flush,
  } = useAutosave({
    noteId,
    initialTitle: note.title ?? '',
    initialIcon: note.icon ?? null,
    initialContent: note.content,
    initialContentText: note.content_text ?? '',
  });

  return (
    <div>
      {/* Page Header Area */}
      <header className="border-b border-rule pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="mt-1">
              <PageIconPicker
                icon={icon}
                onChangeIcon={(newIcon) => setIcon(newIcon)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl md:text-3xl font-semibold text-ink tracking-tight">
                <span className="sr-only">{title.trim() ? title : 'Untitled'}</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  aria-label="Page title"
                  className="w-full bg-transparent border-none p-0 focus:outline-none placeholder:text-muted/40 font-serif font-semibold text-ink"
                />
              </h1>

              {/* Save status meta line */}
              <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                {saveStatus.state === 'saving' && <span>Saving...</span>}
                {saveStatus.state === 'saved' && (
                  <span>Saved {formatTime(saveStatus.savedAt, tz)}</span>
                )}
                {saveStatus.state === 'error' && (
                  <div className="flex items-center gap-2">
                    <span className="text-danger">Could not save</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void flush()}
                      className="h-5 px-1.5 text-xs text-ink"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page Actions Menu */}
          <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto">
            <Menu>
              <MenuTrigger asChild>
                <IconButton label="Page options" size="sm">
                  <DotsThree size={18} weight="bold" aria-hidden="true" />
                </IconButton>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuItem onSelect={() => void handleAddSubpage()}>
                  Add subpage
                </MenuItem>
                <MenuSeparator />
                <MenuItem destructive onSelect={() => void handleArchive()}>
                  Move to trash
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        </div>
      </header>

      {/* TipTap Note Editor */}
      <main>
        <NoteEditor
          initialContent={note.content}
          onChange={(newContent, newText) => setContent(newContent, newText)}
          onNavigatePage={onNavigate}
          notesTreeItems={notesTreeItems ?? []}
          onCreatePage={handleCreateLinkedPage}
        />
      </main>

      {/* Linked From (Backlinks) Section */}
      <section aria-labelledby="backlinks-heading" className="mt-16 pt-6 border-t border-rule">
        <h2
          id="backlinks-heading"
          className="text-xs font-semibold text-muted uppercase tracking-wider mb-3"
        >
          Linked from
        </h2>

        {backlinksLoading ? (
          <Skeleton rows={2} />
        ) : !backlinks || backlinks.length === 0 ? (
          <p className="text-xs text-muted">No pages link here yet.</p>
        ) : (
          <div className="space-y-1">
            {backlinks.map((link) => (
              <Link
                key={link.id}
                to="/notes/$noteId"
                params={{ noteId: link.id }}
                className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 text-sm text-ink hover:bg-surface transition-colors"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center text-sm">
                  {link.icon ? (
                    <span role="img" aria-hidden="true">
                      {link.icon}
                    </span>
                  ) : (
                    <FileText size={16} className="text-muted" aria-hidden="true" />
                  )}
                </span>
                <span className="truncate">{link.title || 'Untitled'}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
