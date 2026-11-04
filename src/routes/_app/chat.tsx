import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { ConversationList } from '@/features/chat';

export const Route = createFileRoute('/_app/chat')({
  component: ChatLayout,
});

function ChatLayout() {
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeConversationId =
    pathParts.length > 1 && pathParts[0] === 'chat' ? pathParts[1] : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] md:h-[calc(100vh-10rem)] min-h-[480px]">
      <PageHeader title="Chat" />
      <div className="flex flex-1 min-h-0 border border-rule rounded-[6px] overflow-hidden bg-paper">
        {/* Desktop left column */}
        <aside className="hidden md:flex w-60 md:w-64 border-r border-rule h-full flex-col shrink-0">
          <ConversationList activeId={activeConversationId} />
        </aside>

        {/* Detail area */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
