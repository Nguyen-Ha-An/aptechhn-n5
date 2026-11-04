import { useState, useEffect, useRef, useCallback } from 'react';
import type { JSONContent } from '@tiptap/react';
import { extractLinks } from './doc';
import { useUpdateNote, useSyncLinks } from './queries';

export type SaveStatus =
  | { state: 'saved'; savedAt: Date }
  | { state: 'saving' }
  | { state: 'error'; error: Error };

export interface UseAutosaveOptions {
  noteId: string;
  initialTitle?: string;
  initialIcon?: string | null;
  initialContent?: JSONContent;
  initialContentText?: string;
}

const DEFAULT_DOC: JSONContent = { type: 'doc', content: [] };

export function useAutosave({
  noteId,
  initialTitle = '',
  initialIcon = null,
  initialContent = DEFAULT_DOC,
  initialContentText = '',
}: UseAutosaveOptions) {
  const [title, setTitleState] = useState(initialTitle);
  const [icon, setIconState] = useState<string | null>(initialIcon);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({
    state: 'saved',
    savedAt: new Date(),
  });

  const updateNoteMutation = useUpdateNote();
  const syncLinksMutation = useSyncLinks();

  const updateMutateRef = useRef(updateNoteMutation.mutateAsync);
  const syncMutateRef = useRef(syncLinksMutation.mutateAsync);

  useEffect(() => {
    updateMutateRef.current = updateNoteMutation.mutateAsync;
    syncMutateRef.current = syncLinksMutation.mutateAsync;
  }, [updateNoteMutation.mutateAsync, syncLinksMutation.mutateAsync]);

  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const latestDataRef = useRef({
    title: initialTitle,
    icon: initialIcon,
    content: initialContent,
    content_text: initialContentText,
  });

  const lastNoteIdRef = useRef(noteId);

  // If noteId changes to a different note, reset state
  useEffect(() => {
    if (lastNoteIdRef.current !== noteId) {
      lastNoteIdRef.current = noteId;
      setTitleState(initialTitle);
      setIconState(initialIcon);
      latestDataRef.current = {
        title: initialTitle,
        icon: initialIcon,
        content: initialContent,
        content_text: initialContentText,
      };
      dirtyRef.current = false;
      setSaveStatus({ state: 'saved', savedAt: new Date() });
    }
  }, [noteId, initialTitle, initialIcon, initialContent, initialContentText]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!dirtyRef.current) return;
    dirtyRef.current = false;

    setSaveStatus({ state: 'saving' });

    const currentData = { ...latestDataRef.current };

    try {
      await updateMutateRef.current({
        id: noteId,
        title: currentData.title,
        icon: currentData.icon,
        content: currentData.content,
        content_text: currentData.content_text,
      });

      const links = extractLinks(currentData.content);
      await syncMutateRef.current({
        noteId,
        targetIds: links,
      });

      setSaveStatus({ state: 'saved', savedAt: new Date() });
    } catch (err) {
      dirtyRef.current = true;
      setSaveStatus({
        state: 'error',
        error: err instanceof Error ? err : new Error('Could not save'),
      });
    }
  }, [noteId]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveStatus({ state: 'saving' });

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      void flush();
    }, 800);
  }, [flush]);

  const setTitle = useCallback(
    (newTitle: string) => {
      setTitleState(newTitle);
      latestDataRef.current.title = newTitle;
      scheduleSave();
    },
    [scheduleSave],
  );

  const setIcon = useCallback(
    (newIcon: string | null) => {
      setIconState(newIcon);
      latestDataRef.current.icon = newIcon;
      scheduleSave();
    },
    [scheduleSave],
  );

  const setContent = useCallback(
    (newContent: JSONContent, newContentText: string) => {
      latestDataRef.current.content = newContent;
      latestDataRef.current.content_text = newContentText;
      scheduleSave();
    },
    [scheduleSave],
  );

  // Flush on unmount / route change (stable across renders of same noteId)
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        void flush();
      }
    };
  }, [noteId, flush]);

  // Flush on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current) {
        void flush();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [flush]);

  return {
    title,
    icon,
    saveStatus,
    setTitle,
    setIcon,
    setContent,
    flush,
  };
}
