import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Plus, DotsThreeVertical, PencilSimple, Trash } from '@phosphor-icons/react';
import {
  useConversations,
  useCreateConversation,
  useRenameConversation,
  useDeleteConversation,
  type Conversation,
} from './queries';
import {
  Button,
  IconButton,
  Dialog,
  ConfirmDialog,
  Field,
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/components/ui';

interface ConversationListProps {
  activeId?: string;
  onSelect?: () => void;
  className?: string;
}

export function ConversationList({ activeId, onSelect, className = '' }: ConversationListProps) {
  const navigate = useNavigate();
  const { data: conversations, isLoading, isError, error, refetch } = useConversations();
  const createMutation = useCreateConversation();
  const renameMutation = useRenameConversation();
  const deleteMutation = useDeleteConversation();

  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);

  const handleStartNewChat = async () => {
    try {
      const newConv = await createMutation.mutateAsync('New chat');
      onSelect?.();
      navigate({ to: '/chat/$conversationId', params: { conversationId: newConv.id } });
    } catch {
      // Handled by mutation or alert
    }
  };

  const handleOpenRename = (conv: Conversation) => {
    setRenameTarget(conv);
    setRenameTitle(conv.title);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameTitle.trim()) return;
    await renameMutation.mutateAsync({ id: renameTarget.id, title: renameTitle.trim() });
    setRenameTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    await deleteMutation.mutateAsync(targetId);
    setDeleteTarget(null);
    if (activeId === targetId) {
      navigate({ to: '/chat' });
    }
  };

  if (isLoading) {
    return (
      <div className={`p-4 space-y-3 ${className}`}>
        <div className="flex items-center justify-between pb-2 border-b border-rule">
          <Skeleton rows={1} className="w-20" />
          <Skeleton rows={1} className="w-16" />
        </div>
        <Skeleton rows={5} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`p-4 ${className}`}>
        <ErrorState
          title="Could not load chats"
          message={error instanceof Error ? error.message : 'Please check your connection.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const list = conversations ?? [];

  return (
    <div className={`flex flex-col h-full bg-paper ${className}`}>
      {/* Header with New chat action */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-rule shrink-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Chats</span>
        <Button
          variant="secondary"
          size="sm"
          loading={createMutation.isPending}
          onClick={handleStartNewChat}
          className="flex items-center gap-1.5"
        >
          <Plus size={14} aria-hidden="true" />
          <span>New chat</span>
        </Button>
      </div>

      {/* List items or Empty state */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {list.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title="No chats yet"
              body="Start a chat to ask questions or make study plans."
              action={
                <Button variant="primary" size="sm" onClick={handleStartNewChat}>
                  Start a chat
                </Button>
              }
            />
          </div>
        ) : (
          list.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                className={`group flex items-center justify-between rounded-[6px] px-2.5 py-2 text-sm transition-colors duration-120 ${
                  isActive
                    ? 'bg-surface font-semibold text-ink'
                    : 'text-ink hover:bg-surface/60'
                }`}
              >
                <Link
                  to="/chat/$conversationId"
                  params={{ conversationId: conv.id }}
                  onClick={onSelect}
                  className="flex-1 truncate focus-visible:outline-2 focus-visible:outline-accent rounded-[4px] pr-2"
                  title={conv.title}
                >
                  {conv.title || 'Untitled chat'}
                </Link>

                <Menu>
                  <MenuTrigger asChild>
                    <IconButton
                      label="Conversation options"
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition-opacity"
                    >
                      <DotsThreeVertical size={16} />
                    </IconButton>
                  </MenuTrigger>
                  <MenuContent align="end">
                    <MenuItem onClick={() => handleOpenRename(conv)}>
                      <PencilSimple size={14} className="mr-2" aria-hidden="true" />
                      Rename
                    </MenuItem>
                    <MenuItem
                      destructive
                      onClick={() => setDeleteTarget(conv)}
                    >
                      <Trash size={14} className="mr-2" aria-hidden="true" />
                      Delete
                    </MenuItem>
                  </MenuContent>
                </Menu>
              </div>
            );
          })
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog
        open={Boolean(renameTarget)}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        title="Rename chat"
      >
        <form onSubmit={handleConfirmRename} className="space-y-4">
          <Field
            label="Chat title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            required
            maxLength={100}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={renameMutation.isPending}
              disabled={!renameTitle.trim()}
            >
              Save
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete ConfirmDialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete conversation?"
        description="This will permanently delete this conversation and all its messages."
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
