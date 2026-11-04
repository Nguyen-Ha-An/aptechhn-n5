import { useState } from 'react';
import { Dialog } from '@/components/ui';
import { useSearchNotes } from './queries';
import { FileText, MagnifyingGlass } from '@phosphor-icons/react';

export interface SearchNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNote: (noteId: string) => void;
}

export function SearchNotesDialog({
  open,
  onOpenChange,
  onSelectNote,
}: SearchNotesDialogProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    data: results,
    isSearching,
    isError,
    refetch,
    debouncedQuery,
  } = useSearchNotes(query);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
    onOpenChange(nextOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev >= results.length - 1 ? 0 : prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const clamped = Math.min(selectedIndex, results.length - 1);
      const item = results[clamped];
      if (item) {
        onSelectNote(item.id);
        handleOpenChange(false);
      }
    }
  };

  const activeIndex = Math.min(selectedIndex, Math.max(0, results.length - 1));

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Search pages"
      className="max-w-lg p-0 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 border-b border-rule px-4 py-3">
        <MagnifyingGlass size={18} className="text-muted shrink-0" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search by title or content..."
          aria-label="Search pages"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded-[4px] px-1"
        />
      </div>

      <div
        role="listbox"
        tabIndex={0}
        aria-label="Search results"
        aria-activedescendant={results.length > 0 ? `search-result-${activeIndex}` : undefined}
        className="max-h-80 overflow-y-auto p-2 focus:outline-none"
      >
        {isError && (
          <div className="py-8 text-center text-xs text-danger flex flex-col items-center gap-2">
            <span>Failed to search pages.</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs text-ink underline hover:text-accent font-medium min-h-[44px] px-2 flex items-center justify-center"
            >
              Retry
            </button>
          </div>
        )}

        {!isError && query.trim().length < 2 && (
          <div className="py-8 text-center text-xs text-muted">
            Type at least 2 characters to search.
          </div>
        )}

        {!isError && query.trim().length >= 2 && isSearching && (
          <div className="py-8 text-center text-xs text-muted">
            Searching pages...
          </div>
        )}

        {!isError && query.trim().length >= 2 && !isSearching && results.length === 0 && (
          <div className="py-8 text-center text-xs text-muted">
            No pages found for &ldquo;{debouncedQuery}&rdquo;
          </div>
        )}

        {!isError &&
          results.map((note, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={note.id}
                id={`search-result-${index}`}
                role="option"
                type="button"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectNote(note.id);
                  handleOpenChange(false);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full items-start gap-3 rounded-[6px] p-2.5 text-left transition-colors min-h-[44px] md:min-h-0 ${
                  isSelected ? 'bg-surface font-medium text-ink' : 'text-ink hover:bg-surface'
                }`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-base">
                  {note.icon ? (
                    <span role="img" aria-hidden="true">
                      {note.icon}
                    </span>
                  ) : (
                    <FileText size={16} className="text-muted" aria-hidden="true" />
                  )}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm">{note.title || 'Untitled'}</span>
                  {note.content_text && (
                    <span className="line-clamp-1 text-xs text-muted">
                      {note.content_text}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
      </div>
    </Dialog>
  );
}
