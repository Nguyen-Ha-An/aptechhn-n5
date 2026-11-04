import { createFileRoute, Link } from '@tanstack/react-router';
import { CaretLeft } from '@phosphor-icons/react';
import { ChatThread } from '@/features/chat';

export const Route = createFileRoute('/_app/chat/$conversationId')({
  component: ConversationDetailPage,
});

function ConversationDetailPage() {
  const { conversationId } = Route.useParams();

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mobile back link */}
      <div className="md:hidden flex items-center border-b border-rule px-3 py-2 shrink-0 bg-paper">
        <Link
          to="/chat"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent rounded py-1 px-1.5"
        >
          <CaretLeft size={14} aria-hidden="true" />
          <span>Back to chats</span>
        </Link>
      </div>

      {/* Main thread */}
      <div className="flex-1 min-h-0">
        <ChatThread conversationId={conversationId} />
      </div>
    </div>
  );
}
