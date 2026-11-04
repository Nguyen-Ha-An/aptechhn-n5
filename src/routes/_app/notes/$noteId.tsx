import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';

export const Route = createFileRoute('/_app/notes/$noteId')({
  component: NotePlaceholderPage,
});

function NotePlaceholderPage() {
  const { noteId } = Route.useParams();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: qk.note(noteId),
    queryFn: async () => {
      const { data: note, error: fetchError } = await supabase
        .from('notes')
        .select('id, title, icon')
        .eq('id', noteId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }
      return note;
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

  if (!data) {
    return (
      <EmptyState
        title="Not found"
        body="This page does not exist or was moved to trash."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={data.title.trim() ? data.title : 'Untitled'}
        icon={data.icon ?? undefined}
      />
      <EmptyState
        title="Page editor"
        body="This page is being rebuilt."
      />
    </div>
  );
}
