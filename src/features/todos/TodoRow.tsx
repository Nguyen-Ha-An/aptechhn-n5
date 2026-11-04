import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { DotsThree, CalendarBlank } from '@phosphor-icons/react';
import { isOverdue, todayKey, addDays } from '@/lib/dates';
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuLabel,
  Popover,
  PopoverTrigger,
  PopoverContent,
  IconButton,
  Button,
} from '@/components/ui';
import {
  useUpdateTodo,
  useDeleteTodo,
  useRestoreTodo,
  type Todo,
  type TodoPriority,
} from './queries';

export interface TodoRowProps {
  todo: Todo;
  tz: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function formatDueDateLabel(dueKey: string): string {
  const [y, m, d] = dueKey.split('-').map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${day} ${month}`;
}

function getDueDateDisplay(dueKey: string | null, tz: string): { label: string; isOver: boolean } {
  if (!dueKey) {
    return { label: 'No date', isOver: false };
  }
  const today = todayKey(tz);
  if (dueKey === today) {
    return { label: 'Today', isOver: false };
  }
  if (dueKey === addDays(today, 1)) {
    return { label: 'Tomorrow', isOver: false };
  }
  if (isOverdue(dueKey, tz)) {
    return { label: `Overdue: ${formatDueDateLabel(dueKey)}`, isOver: true };
  }
  return { label: formatDueDateLabel(dueKey), isOver: false };
}

function formatPriorityDisplay(priority: string): string {
  switch (priority) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'None';
  }
}

export function TodoRow({
  todo,
  tz,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: TodoRowProps) {
  const navigate = useNavigate();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const restoreTodo = useRestoreTodo();

  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(todo.title);
  const [prevTitle, setPrevTitle] = useState(todo.title);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const editInputRef = useRef<HTMLInputElement>(null);

  if (todo.title !== prevTitle) {
    setPrevTitle(todo.title);
    setDraftTitle(todo.title);
  }

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleToggleDone = () => {
    updateTodo.mutate({
      id: todo.id,
      done: !todo.done,
    });
  };

  const handleSaveTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== todo.title) {
      updateTodo.mutate({
        id: todo.id,
        title: trimmed,
      });
    } else {
      setDraftTitle(todo.title);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftTitle(todo.title);
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleDateChange = (newDate: string) => {
    updateTodo.mutate({
      id: todo.id,
      due_date: newDate || null,
    });
    setPopoverOpen(false);
  };

  const handleClearDate = () => {
    updateTodo.mutate({
      id: todo.id,
      due_date: null,
    });
    setPopoverOpen(false);
  };

  const handlePrioritySelect = (priority: TodoPriority) => {
    updateTodo.mutate({
      id: todo.id,
      priority,
    });
  };

  const handleDelete = () => {
    deleteTodo.mutate(todo.id);
    toast('Todo deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          restoreTodo.mutate(todo);
        },
      },
    });
  };

  const handleFocusOnThis = () => {
    navigate({
      to: '/focus',
      search: { todo: todo.id } as never,
    });
  };

  const handleRowKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) {
      return;
    }
    if (e.altKey && e.key === 'ArrowUp') {
      if (canMoveUp && onMoveUp) {
        e.preventDefault();
        onMoveUp();
      }
    } else if (e.altKey && e.key === 'ArrowDown') {
      if (canMoveDown && onMoveDown) {
        e.preventDefault();
        onMoveDown();
      }
    }
  };

  const { label: dueDateText, isOver: isDueDateOver } = getDueDateDisplay(todo.due_date, tz);

  return (
    <div
      className="group relative flex items-center gap-3 rounded-[6px] border-b border-rule/50 px-3 py-2.5 transition-colors duration-120 hover:bg-surface/60"
    >
      {/* Checkbox with accessible name matching todo title */}
      <div className="flex items-center">
        <input
          id={`todo-${todo.id}`}
          type="checkbox"
          checked={todo.done}
          onChange={handleToggleDone}
          onKeyDown={handleRowKeyDown}
          aria-label={todo.title}
          className="h-4 w-4 cursor-pointer rounded-[4px] accent-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        />
      </div>

      {/* Title (editable inline) */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleSaveTitle}
            aria-label="Edit todo title"
            className="w-full rounded-[4px] border border-rule bg-paper px-2 py-0.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            onKeyDown={handleRowKeyDown}
            aria-label={`Edit title: ${todo.title}`}
            className={`w-full truncate rounded-[4px] px-1 py-0.5 text-left text-sm transition-colors cursor-pointer select-text focus-visible:outline-2 focus-visible:outline-accent ${
              todo.done ? 'text-muted line-through' : 'text-ink hover:text-ink/80'
            }`}
          >
            {todo.title}
          </button>
        )}
      </div>

      {/* Row actions (always visible) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Due date button + Popover */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
                isDueDateOver
                  ? 'text-danger font-medium hover:bg-surface'
                  : 'text-muted hover:text-ink hover:bg-surface'
              }`}
              aria-label={`Due date: ${dueDateText}`}
            >
              <CalendarBlank size={14} aria-hidden="true" />
              <span>{dueDateText}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <label
              htmlFor={`date-picker-${todo.id}`}
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Due date
            </label>
            <input
              id={`date-picker-${todo.id}`}
              type="date"
              value={todo.due_date || ''}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-[6px] border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent"
            />
            <div className="mt-2.5 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClearDate}>
                Clear date
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority menu (small muted text label, NOT a coloured pill) */}
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className="rounded-[4px] px-1.5 py-1 text-xs text-muted transition-colors cursor-pointer hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              aria-label={`Priority: ${formatPriorityDisplay(todo.priority)}`}
            >
              {todo.priority === 'none' ? 'Priority' : formatPriorityDisplay(todo.priority)}
            </button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuLabel>Priority</MenuLabel>
            <MenuItem onClick={() => handlePrioritySelect('none')}>None</MenuItem>
            <MenuItem onClick={() => handlePrioritySelect('low')}>Low</MenuItem>
            <MenuItem onClick={() => handlePrioritySelect('medium')}>Medium</MenuItem>
            <MenuItem onClick={() => handlePrioritySelect('high')}>High</MenuItem>
          </MenuContent>
        </Menu>

        {/* More actions Menu */}
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={`More actions for ${todo.title}`}
              size="sm"
              variant="ghost"
              className="text-muted hover:text-ink"
            >
              <DotsThree size={18} weight="bold" />
            </IconButton>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem onClick={handleFocusOnThis}>Focus on this</MenuItem>
            <MenuItem
              disabled={!canMoveUp}
              onClick={() => {
                if (canMoveUp && onMoveUp) {
                  onMoveUp();
                }
              }}
            >
              Move up
            </MenuItem>
            <MenuItem
              disabled={!canMoveDown}
              onClick={() => {
                if (canMoveDown && onMoveDown) {
                  onMoveDown();
                }
              }}
            >
              Move down
            </MenuItem>
            <MenuSeparator />
            <MenuItem destructive onClick={handleDelete}>
              Delete
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </div>
  );
}
