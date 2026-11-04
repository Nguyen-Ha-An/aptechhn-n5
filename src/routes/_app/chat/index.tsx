import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ConversationList, useConversations, useCreateConversation } from '@/features/chat';
import { Button, EmptyState } from '@/components/ui';

export const Route = createFileRoute('/_app/chat/')({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const navigate = useNavigate();
  const { data: conversations } = useConversations();
  const createMutation = useCreateConversation();

  const handleStartNewChat = async () => {
    try {
      const newConv = await createMutation.mutateAsync('New chat');
      navigate({ to: '/chat/$conversationId', params: { conversationId: newConv.id } });
    } catch {
      // Handled
    }
  };

  const list = conversations ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* Mobile view: list-as-page */}
      <div className="flex-1 md:hidden">
        <ConversationList />
      </div>

      {/* Desktop view: placeholder / prompt */}
      <div className="hidden md:flex flex-col items-center justify-center h-full p-8 text-center my-auto">
        {list.length === 0 ? (
          <EmptyState
            title="No chats yet"
            body="Start a chat to ask questions or make study plans."
            action={
              <Button
                variant="primary"
                size="sm"
                loading={createMutation.isPending}
                onClick={handleStartNewChat}
              >
                Start a chat
              </Button>
            }
          />
        ) : (
          <div className="max-w-sm space-y-3">
            <p className="font-serif text-lg font-semibold text-ink">No chat selected</p>
            <p className="text-sm text-muted">
              Choose a conversation from the left or create a new chat to begin.
            </p>
            <Button
              variant="secondary"
              size="sm"
              loading={createMutation.isPending}
              onClick={handleStartNewChat}
            >
              New chat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
