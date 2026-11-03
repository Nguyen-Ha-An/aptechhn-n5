/**
 * Notes Page - Notion-inspired note editor
 * Features: Markdown support, slash commands, [[backlinks]]
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Input, Badge, EmptyState, Drawer } from '../components/ui';
import { Note } from '../types';
import { SLASH_COMMANDS } from '../constants';
import {
  FileText,
  Plus,
  Search,
  Hash,
  Calendar,
  Link2,
  Trash2,
  X,
  ChevronRight,
} from 'lucide-react';

export const NotesPage: React.FC = () => {
  const { state, addNote, updateNote, deleteNote, showToast } = useGlobal();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Filter notes
  const filteredNotes = useMemo(() => {
    if (!searchQuery) return state.notes;
    const q = searchQuery.toLowerCase();
    return state.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [state.notes, searchQuery]);

  // Sort by updated date
  const sortedNotes = useMemo(() => {
    return [...filteredNotes].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [filteredNotes]);

  // Find backlinks for current note
  const backlinks = useMemo(() => {
    if (!selectedNote) return [];
    const titlePattern = `[[${selectedNote.title}]]`;
    return state.notes.filter((n) => n.id !== selectedNote.id && n.content.includes(titlePattern));
  }, [selectedNote, state.notes]);

  const handleCreateNote = () => {
    const note = addNote({
      title: 'Untitled',
      content: '',
      tags: [],
      projectId: null,
      linkedTaskIds: [],
      linkedSessionIds: [],
    });
    setSelectedNote(note);
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    showToast('Note saved', 'success');
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    setSelectedNote(null);
    showToast('Note deleted', 'info');
  };

  // Handle slash commands
  const handleContentChange = (value: string) => {
    if (!selectedNote) return;

    // Check for slash command
    const lastSlash = value.lastIndexOf('/');
    if (lastSlash !== -1 && value[lastSlash - 1] !== '/') {
      const afterSlash = value.slice(lastSlash);
      if (afterSlash.length <= 10 && !afterSlash.includes(' ')) {
        setShowSlashMenu(true);
        // Position menu near cursor (simplified)
        if (editorRef.current) {
          const rect = editorRef.current.getBoundingClientRect();
          setSlashPosition({ top: rect.top + 100, left: rect.left + 20 });
        }
      } else {
        setShowSlashMenu(false);
      }
    } else {
      setShowSlashMenu(false);
    }

    const updated = { ...selectedNote, content: value };
    setSelectedNote(updated);
    updateNote(selectedNote.id, { content: value });
  };

  // Insert slash command
  const insertSlashCommand = (command: typeof SLASH_COMMANDS[0]) => {
    if (!selectedNote || !editorRef.current) return;

    const content = selectedNote.content;
    const lastSlash = content.lastIndexOf('/');
    const newContent = content.slice(0, lastSlash) + command.insert;

    const updated = { ...selectedNote, content: newContent };
    setSelectedNote(updated);
    updateNote(selectedNote.id, { content: newContent });

    setShowSlashMenu(false);
    editorRef.current.focus();
  };

  // Resolve [[backlinks]] to actual notes
  const resolveBacklinks = (content: string) => {
    return content.replace(/\[\[([^\]]+)\]\]/g, (match, title) => {
      const linkedNote = state.notes.find((n) => n.title === title);
      if (linkedNote) {
        return `[${title}](#note-${linkedNote.id})`;
      }
      return match;
    });
  };

  // Render markdown (simplified)
  const renderMarkdown = (content: string) => {
    const resolved = resolveBacklinks(content);
    return resolved
      .split('\n')
      .map((line, i) => {
        // Headers
        if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
        // Quote
        if (line.startsWith('> ')) return <blockquote key={i} className="border-l-4 border-gray-300 pl-4 text-gray-600 italic">{line.slice(2)}</blockquote>;
        // Checkbox
        if (line.startsWith('- [ ] ')) return <p key={i} className="flex items-center gap-2"><input type="checkbox" disabled />{line.slice(6)}</p>;
        if (line.startsWith('- [x] ')) return <p key={i} className="flex items-center gap-2"><input type="checkbox" checked disabled /><span className="line-through text-gray-400">{line.slice(6)}</span></p>;
        // List
        if (line.startsWith('- ')) return <p key={i} className="ml-4">• {line.slice(2)}</p>;
        // Divider
        if (line === '---') return <hr key={i} className="my-4" />;
        // Normal
        return <p key={i} className="mb-2">{line || '\u00A0'}</p>;
      });
  };

  return (
    <div className="h-full flex">
      {/* Notes List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Notes</h2>
            <Button size="sm" onClick={handleCreateNote}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {sortedNotes.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </div>
          ) : (
            sortedNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => {
                  setSelectedNote(note);
                  setIsEditing(false);
                }}
                className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedNote?.id === note.id
                    ? 'bg-white border-l-2 border-l-indigo-600'
                    : 'hover:bg-white'
                }`}
              >
                <h3 className="font-medium text-gray-900 text-sm truncate">
                  {note.title || 'Untitled'}
                </h3>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {note.content.slice(0, 50) || 'Empty note'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(note.updatedAt).toLocaleDateString()}
                  </span>
                  {note.tags.length > 0 && (
                    <Badge variant="outline" size="sm">
                      <Hash className="w-3 h-3" />
                      {note.tags[0]}
                    </Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        {selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <input
                value={selectedNote.title}
                onChange={(e) => {
                  const updated = { ...selectedNote, title: e.target.value };
                  setSelectedNote(updated);
                  updateNote(selectedNote.id, { title: e.target.value });
                }}
                className="text-xl font-bold border-0 focus:ring-0 focus:outline-none bg-transparent"
                placeholder="Untitled"
              />
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <Button size="sm" onClick={handleSave}>
                    Save
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(selectedNote.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Metadata */}
            <div className="px-6 py-2 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(selectedNote.updatedAt).toLocaleString()}
              </span>
              {backlinks.length > 0 && (
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  {backlinks.length} backlinks
                </span>
              )}
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditing ? (
                <div className="relative">
                  <textarea
                    ref={editorRef}
                    value={selectedNote.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full h-[calc(100vh-300px)] p-0 border-0 focus:ring-0 focus:outline-none resize-none text-gray-700 font-mono text-sm"
                    placeholder="Start writing... Use / for commands, [[Note Title]] for links"
                  />

                  {/* Slash Command Menu */}
                  {showSlashMenu && (
                    <div
                      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 w-48"
                      style={{ top: slashPosition.top, left: slashPosition.left }}
                    >
                      {SLASH_COMMANDS.map((cmd) => (
                        <button
                          key={cmd.command}
                          onClick={() => insertSlashCommand(cmd)}
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                        >
                          <span className="text-gray-400 font-mono text-xs">{cmd.command}</span>
                          <span>{cmd.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="prose prose-sm max-w-none">
                  {selectedNote.content ? (
                    renderMarkdown(selectedNote.content)
                  ) : (
                    <p className="text-gray-400 italic">Click Edit to start writing...</p>
                  )}
                </div>
              )}
            </div>

            {/* Backlinks */}
            {backlinks.length > 0 && !isEditing && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  <Link2 className="w-3 h-3 inline mr-1" />
                  Backlinks
                </h4>
                <div className="space-y-1">
                  {backlinks.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setSelectedNote(note);
                        setIsEditing(false);
                      }}
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      <ChevronRight className="w-3 h-3" />
                      {note.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={<FileText className="w-16 h-16" />}
            title="Select a note"
            description="Choose a note from the list or create a new one"
            action={{ label: 'Create Note', onClick: handleCreateNote }}
          />
        )}
      </div>
    </div>
  );
};

export default NotesPage;
