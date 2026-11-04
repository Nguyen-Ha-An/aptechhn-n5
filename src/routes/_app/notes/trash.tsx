import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import {
  Button,
  EmptyState,
  ErrorState,
  Skeleton,
  ConfirmDialog,
} from '@/components/ui';
import {
  useTrash,
  useRestoreNote,
  useDeleteNoteForever,
  type TrashItem,
} from '@/features/notes/queries';
import { formatLongDate } from '@/lib/dates';
import { useProfile } from '@/features/profile/queries';
import { FileText, ArrowCounterClockwise, Trash as TrashIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/notes/trash')({
  component: TrashPage,
});

function TrashRow({
  item,
  tz,
  onRestore,
  onDeleteForever,
}: {
  item: TrashItem;
  tz: string;
  onRestore: (id: string) => Promise<unknown>;
  onDeleteForever: (id: string) => Promise<unknown>;
}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formattedDate = item.archived_at
    ? formatLongDate(new Date(item.archived_at), tz)
    : '';

  return (
    <div className="flex items-center justify-between gap-3 border-b border-rule py-3 px-1 transition-colors hover:bg-surface rounded-[6px]">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg">
          {item.icon ? (
            <span role="img" aria-hidden="true">
              {item.icon}
            </span>
          ) : (
            <FileText size={18} className="text-muted" aria-hidden="true" />
          )}
        </span>
        <div className="flex flex-col min-w-0">
          <span className="truncate font-medium text-sm text-ink">
            {item.title || 'Untitled'}
          </span>
          {formattedDate && (
            <span className="text-xs text-muted">
              Archived on {formattedDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="secondary"
          size="sm"
          loading={isRestoring}
          onClick={async () => {
            try {
              setIsRestoring(true);
              await onRestore(item.id);
              toast.success('Page restored');
            } catch {
              toast.error('Failed to restore page');
            } finally {
              setIsRestoring(false);
            }
          }}
        >
          <ArrowCounterClockwise size={14} className="mr-1.5" aria-hidden="true" />
          <span>Restore</span>
        </Button>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete forever"
          description="This will permanently delete this page and any of its subpages. This action cannot be undone."
          confirmText="Delete forever"
          variant="danger"
          onConfirm={async () => {
            try {
              setIsDeleting(true);
              await onDeleteForever(item.id);
              toast.success('Page permanently deleted');
            } catch {
              toast.error('Failed to delete page');
            } finally {
              setIsDeleting(false);
            }
          }}
          trigger={
            <Button variant="danger" size="sm" loading={isDeleting}>
              <TrashIcon size={14} className="mr-1.5" aria-hidden="true" />
              <span>Delete forever</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function TrashPage() {
  const { data: profile } = useProfile();
  const tz = profile?.timezone ?? 'Asia/Ho_Chi_Minh';

  const { data: trashItems, isLoading, isError, error, refetch } = useTrash();
  const restoreNote = useRestoreNote();
  const deleteNoteForever = useDeleteNoteForever();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Trash" icon="🗑️" />
        <Skeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Trash" icon="🗑️" />
        <ErrorState
          title="Error loading trash"
          message={error instanceof Error ? error.message : 'Could not load trash.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Trash"
        icon="🗑️"
        meta={
          trashItems && trashItems.length > 0
            ? `${trashItems.length} archived ${trashItems.length === 1 ? 'page' : 'pages'}`
            : undefined
        }
      />

      {!trashItems || trashItems.length === 0 ? (
        <EmptyState
          title="Trash is empty"
          body="Pages moved to trash will appear here."
        />
      ) : (
        <div className="space-y-1">
          {trashItems.map((item) => (
            <TrashRow
              key={item.id}
              item={item}
              tz={tz}
              onRestore={(id) => restoreNote.mutateAsync(id)}
              onDeleteForever={(id) => deleteNoteForever.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
