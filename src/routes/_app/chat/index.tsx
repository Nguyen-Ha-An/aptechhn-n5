import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui';

export const Route = createFileRoute('/_app/chat/')({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  return (
    <div>
      <PageHeader title="Chat" />
      <EmptyState
        title="Chat"
        body="This page is being rebuilt."
      />
    </div>
  );
}
