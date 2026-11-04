import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui';

export const Route = createFileRoute('/_app/todos')({
  component: TodosPage,
});

function TodosPage() {
  return (
    <div>
      <PageHeader title="Todos" />
      <EmptyState
        title="Todos"
        body="This page is being rebuilt."
      />
    </div>
  );
}
