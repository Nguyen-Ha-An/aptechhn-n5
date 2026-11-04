import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import { notifyAchievements } from '@/features/achievements/notifyAchievements';
import type { JSONContent } from '@tiptap/react';
import type { Database, Json } from '@/lib/database.types';

type NoteUpdate = Database['public']['Tables']['notes']['Update'];

export interface NoteRow {
  id: string;
  parent_id: string | null;
  icon: string | null;
  title: string;
  content: JSONContent;
  content_text: string;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteTreeItem {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string | null;
  position: number;
}

export interface TrashItem {
  id: string;
  title: string;
  icon: string | null;
  archived_at: string;
  parent_id: string | null;
}

export interface BacklinkItem {
  id: string;
  title: string;
  icon: string | null;
}

export interface SearchResultItem {
  id: string;
  title: string;
  icon: string | null;
  content_text: string;
}

/**
 * Hook to fetch the non-archived pages for the sidebar tree.
 */
export function useNotesTree() {
  return useQuery({
    queryKey: qk.notesTree,
    queryFn: async (): Promise<NoteTreeItem[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, parent_id, title, icon, position')
        .is('archived_at', null)
        .order('position', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as NoteTreeItem[];
    },
  });
}

/**
 * Hook to fetch a single note by ID.
 */
export function useNote(id: string | undefined) {
  return useQuery({
    queryKey: qk.note(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<NoteRow | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('notes')
        .select('id, parent_id, icon, title, content, content_text, position, archived_at, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }
      return data as NoteRow | null;
    },
  });
}

/**
 * Mutation to create a new note.
 */
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params?: { parentId?: string | null; title?: string }) => {
      const position = Date.now() / 1000;
      const { data, error } = await supabase
        .from('notes')
        .insert({
          parent_id: params?.parentId ?? null,
          title: params?.title ?? '',
          content: { type: 'doc', content: [] },
          content_text: '',
          position,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data as { id: string };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.notesTree }),
        queryClient.invalidateQueries({ queryKey: qk.recentNotes }),
      ]);
      await notifyAchievements(queryClient);
    },
  });
}

/**
 * Mutation to update note title, icon, content, and content_text.
 */
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      icon,
      content,
      content_text,
    }: {
      id: string;
      title?: string;
      icon?: string | null;
      content?: JSONContent;
      content_text?: string;
    }) => {
      const updates: NoteUpdate = {
        updated_at: new Date().toISOString(),
      };
      if (title !== undefined) updates.title = title;
      if (icon !== undefined) updates.icon = icon;
      if (content !== undefined) updates.content = content as unknown as Json;
      if (content_text !== undefined) updates.content_text = content_text;

      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.note(variables.id) }),
        queryClient.invalidateQueries({ queryKey: qk.notesTree }),
        queryClient.invalidateQueries({ queryKey: qk.recentNotes }),
      ]);
    },
  });
}

/**
 * Mutation to archive a note and all its descendants.
 */
export function useArchiveNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      // 1. Fetch non-archived notes to compute descendants
      const { data: allNotes, error: fetchError } = await supabase
        .from('notes')
        .select('id, parent_id')
        .is('archived_at', null);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const targetIds = new Set<string>([noteId]);
      let added = true;
      while (added) {
        added = false;
        for (const note of allNotes ?? []) {
          if (note.parent_id && targetIds.has(note.parent_id) && !targetIds.has(note.id)) {
            targetIds.add(note.id);
            added = true;
          }
        }
      }

      const now = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('notes')
        .update({ archived_at: now })
        .in('id', Array.from(targetIds));

      if (updateError) {
        throw new Error(updateError.message);
      }
      return { noteId, archivedCount: targetIds.size };
    },
    onSuccess: async (_data, noteId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.notesTree }),
        queryClient.invalidateQueries({ queryKey: qk.trash }),
        queryClient.invalidateQueries({ queryKey: qk.recentNotes }),
        queryClient.invalidateQueries({ queryKey: qk.note(noteId) }),
      ]);
    },
  });
}

/**
 * Mutation to restore an archived note and all its descendants.
 * If the parent is archived or missing, restores to root by setting parent_id = null.
 */
export function useRestoreNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data: allNotes, error: fetchError } = await supabase
        .from('notes')
        .select('id, parent_id, archived_at');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      const targetIds = new Set<string>([noteId]);
      let added = true;
      while (added) {
        added = false;
        for (const note of allNotes ?? []) {
          if (note.parent_id && targetIds.has(note.parent_id) && !targetIds.has(note.id)) {
            targetIds.add(note.id);
            added = true;
          }
        }
      }

      const thisNote = (allNotes ?? []).find((n) => n.id === noteId);
      const parentNote = thisNote?.parent_id
        ? (allNotes ?? []).find((n) => n.id === thisNote.parent_id)
        : null;
      const parentIsArchived = thisNote?.parent_id
        ? !parentNote || parentNote.archived_at !== null
        : false;

      if (parentIsArchived) {
        // Restore this note with parent_id = null
        const { error: rootError } = await supabase
          .from('notes')
          .update({ archived_at: null, parent_id: null })
          .eq('id', noteId);

        if (rootError) throw new Error(rootError.message);

        // Restore any remaining descendants
        const descendantIds = Array.from(targetIds).filter((id) => id !== noteId);
        if (descendantIds.length > 0) {
          const { error: descError } = await supabase
            .from('notes')
            .update({ archived_at: null })
            .in('id', descendantIds);
          if (descError) throw new Error(descError.message);
        }
      } else {
        const { error: updateError } = await supabase
          .from('notes')
          .update({ archived_at: null })
          .in('id', Array.from(targetIds));

        if (updateError) throw new Error(updateError.message);
      }

      return { noteId };
    },
    onSuccess: async (_data, noteId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.notesTree }),
        queryClient.invalidateQueries({ queryKey: qk.trash }),
        queryClient.invalidateQueries({ queryKey: qk.recentNotes }),
        queryClient.invalidateQueries({ queryKey: qk.note(noteId) }),
      ]);
    },
  });
}

/**
 * Mutation to permanently delete a note and its descendants.
 */
export function useDeleteNoteForever() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) {
        throw new Error(error.message);
      }
      return { noteId };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.trash }),
        queryClient.invalidateQueries({ queryKey: qk.notesTree }),
        queryClient.invalidateQueries({ queryKey: qk.recentNotes }),
      ]);
    },
  });
}

/**
 * Hook to query all archived notes in the trash.
 */
export function useTrash() {
  return useQuery({
    queryKey: qk.trash,
    queryFn: async (): Promise<TrashItem[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, icon, archived_at, parent_id')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as TrashItem[];
    },
  });
}

/**
 * Hook to query backlinks for a given note.
 */
export function useBacklinks(id: string | undefined) {
  return useQuery({
    queryKey: qk.backlinks(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<BacklinkItem[]> => {
      if (!id) return [];

      const { data: links, error: linksError } = await supabase
        .from('note_links')
        .select('source_id')
        .eq('target_id', id);

      if (linksError) {
        throw new Error(linksError.message);
      }

      const sourceIds = (links ?? []).map((l: { source_id: string }) => l.source_id);
      if (sourceIds.length === 0) {
        return [];
      }

      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('id, title, icon, archived_at')
        .in('id', sourceIds)
        .is('archived_at', null);

      if (notesError) {
        throw new Error(notesError.message);
      }

      return (notes ?? []) as BacklinkItem[];
    },
  });
}

/**
 * Hook to search notes using full-text search. Debounced 250ms, min 2 chars.
 */
export function useSearchNotes(rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const isEnabled = debouncedQuery.length >= 2;

  const query = useQuery({
    queryKey: ['notes', 'search', debouncedQuery],
    enabled: isEnabled,
    queryFn: async (): Promise<SearchResultItem[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, icon, content_text')
        .is('archived_at', null)
        .textSearch('search', debouncedQuery, {
          type: 'websearch',
          config: 'simple',
        })
        .limit(20);

      if (error) {
        throw new Error(error.message);
      }

      return (data ?? []) as SearchResultItem[];
    },
  });

  return {
    ...query,
    data: isEnabled ? query.data ?? [] : [],
    debouncedQuery,
    isSearching: isEnabled && query.isLoading,
  };
}

/**
 * Mutation to sync outgoing [[links]] from source note to targets.
 */
export function useSyncLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, targetIds }: { noteId: string; targetIds: string[] }) => {
      // 1. Delete previous outgoing links for this note
      const { error: delError } = await supabase
        .from('note_links')
        .delete()
        .eq('source_id', noteId);

      if (delError) {
        throw new Error(delError.message);
      }

      const uniqueTargets = Array.from(
        new Set(targetIds.filter((t) => Boolean(t) && t !== noteId)),
      );

      if (uniqueTargets.length === 0) {
        return { count: 0 };
      }

      // Check which target IDs actually exist in notes
      const { data: existingTargets, error: checkError } = await supabase
        .from('notes')
        .select('id')
        .in('id', uniqueTargets);

      if (checkError) {
        throw new Error(checkError.message);
      }

      const validTargetIds = (existingTargets ?? []).map((n: { id: string }) => n.id);
      if (validTargetIds.length === 0) {
        return { count: 0 };
      }

      const rows = validTargetIds.map((target_id) => ({
        source_id: noteId,
        target_id,
      }));

      const { error: insertError } = await supabase.from('note_links').insert(rows);

      if (insertError) {
        throw new Error(insertError.message);
      }

      return { count: rows.length, validTargetIds };
    },
    onSuccess: async (result) => {
      if (result && result.validTargetIds) {
        for (const targetId of result.validTargetIds) {
          await queryClient.invalidateQueries({ queryKey: qk.backlinks(targetId) });
        }
      }
    },
  });
}
