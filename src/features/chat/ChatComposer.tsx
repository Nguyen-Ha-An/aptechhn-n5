import { useState } from 'react';
import { Paperclip, X, MagnifyingGlass } from '@phosphor-icons/react';
import { useNotesForChat, type NoteForChat } from './queries';
import { Button, Popover, PopoverTrigger, PopoverContent } from '@/components/ui';

interface ChatComposerProps {
  onSend: (message: string, attachNoteIds: string[], includeToday: boolean) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  initialMessage?: string;
  className?: string;
}

export function ChatComposer({
  onSend,
  onStop,
  isStreaming = false,
  initialMessage = '',
  className = '',
}: ChatComposerProps) {
  const [message, setMessage] = useState(initialMessage);
  const [selectedNotes, setSelectedNotes] = useState<NoteForChat[]>([]);
  const [includeToday, setIncludeToday] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: notes, isLoading: notesLoading } = useNotesForChat();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;

    onSend(
      trimmed,
      selectedNotes.map((n) => n.id),
      includeToday,
    );
    setMessage('');
  };

  const handleToggleNote = (note: NoteForChat) => {
    const isAlreadySelected = selectedNotes.some((n) => n.id === note.id);
    if (isAlreadySelected) {
      setSelectedNotes((prev) => prev.filter((n) => n.id !== note.id));
    } else {
      if (selectedNotes.length >= 5) return;
      setSelectedNotes((prev) => [...prev, note]);
    }
  };

  const handleRemoveChip = (id: string) => {
    setSelectedNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const filteredNotes = (notes ?? []).filter((n) =>
    (n.title || 'Untitled').toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  return (
    <div className={`border-t border-rule bg-paper p-3 ${className}`}>
      {/* Attached Notes Chips */}
      {selectedNotes.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5" aria-label="Attached pages">
          {selectedNotes.map((note) => (
            <span
              key={note.id}
              className="inline-flex items-center gap-1 rounded-[6px] border border-rule bg-surface px-2 py-0.5 text-xs text-ink"
            >
              <span>{note.icon || '📄'}</span>
              <span className="max-w-[120px] truncate">{note.title || 'Untitled'}</span>
              <button
                type="button"
                onClick={() => handleRemoveChip(note.id)}
                aria-label={`Remove page ${note.title || 'Untitled'}`}
                className="cursor-pointer text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent rounded"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Message Textarea */}
      <div className="flex flex-col">
        <label htmlFor="chat-message-input" className="mb-1 text-xs font-medium text-ink">
          Message
        </label>
        <textarea
          id="chat-message-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder="Ask a question, request a summary, or make a plan..."
          className="w-full resize-none rounded-[6px] border border-rule bg-surface p-2.5 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors duration-120"
        />
      </div>

      {/* Controls row */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {/* Attach pages popover */}
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 text-xs text-muted hover:text-ink"
              >
                <Paperclip size={14} aria-hidden="true" />
                <span>
                  Attach pages
                  {selectedNotes.length > 0 ? ` (${selectedNotes.length})` : ''}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">Attach pages</span>
                  <span className="text-[11px] text-muted">{selectedNotes.length}/5</span>
                </div>

                {/* Search */}
                <div>
                  <label
                    htmlFor="chat-note-search-input"
                    className="block mb-1 text-xs font-medium text-ink"
                  >
                    Search pages
                  </label>
                  <div className="relative">
                    <MagnifyingGlass
                      size={14}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="chat-note-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search pages..."
                      className="w-full rounded-[6px] border border-rule bg-surface py-1 pl-8 pr-2 text-xs text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
                    />
                  </div>
                </div>

                {/* Note list */}
                <div className="max-h-48 overflow-y-auto space-y-1 py-1">
                  {notesLoading ? (
                    <p className="py-2 text-center text-xs text-muted">Loading pages...</p>
                  ) : filteredNotes.length === 0 ? (
                    <p className="py-2 text-center text-xs text-muted">No pages found.</p>
                  ) : (
                    filteredNotes.map((note) => {
                      const isSelected = selectedNotes.some((n) => n.id === note.id);
                      const isMaxReached = selectedNotes.length >= 5 && !isSelected;
                      return (
                        <label
                          key={note.id}
                          className={`flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-xs select-none transition-colors duration-120 ${
                            isMaxReached
                              ? 'cursor-not-allowed opacity-50 text-muted'
                              : 'cursor-pointer hover:bg-surface text-ink'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isMaxReached}
                            onChange={() => handleToggleNote(note)}
                            className="h-3.5 w-3.5 rounded border-rule text-accent accent-accent focus-visible:outline-2 focus-visible:outline-accent"
                          />
                          <span className="shrink-0">{note.icon || '📄'}</span>
                          <span className="truncate">{note.title || 'Untitled'}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Toggle Include Today's Plan */}
          <label className="inline-flex cursor-pointer items-center gap-2 select-none text-xs text-muted hover:text-ink">
            <input
              type="checkbox"
              role="switch"
              aria-checked={includeToday}
              checked={includeToday}
              onChange={(e) => setIncludeToday(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-rule text-accent accent-accent focus-visible:outline-2 focus-visible:outline-accent"
            />
            <span>Include today's plan</span>
          </label>
        </div>

        {/* Action: Send or Stop */}
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onStop}
            >
              Stop
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!message.trim()}
              onClick={handleSubmit}
            >
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
