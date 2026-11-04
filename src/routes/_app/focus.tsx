import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui';

export const Route = createFileRoute('/_app/focus')({
  component: FocusPage,
});

function FocusPage() {
  return (
    <div>
      <PageHeader title="Focus" />
      <EmptyState
        title="Focus"
        body="This page is being rebuilt."
      />
    </div>
  );
}
