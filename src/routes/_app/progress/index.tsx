import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui';

export const Route = createFileRoute('/_app/progress/')({
  component: ProgressPage,
});

function ProgressPage() {
  return (
    <div>
      <PageHeader title="Progress" />
      <EmptyState
        title="Progress"
        body="This page is being rebuilt."
      />
    </div>
  );
}
