import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryKeys';
import type { Tables } from '@/lib/database.types';

export type Conversation = Tables<'conversations'>;
export type Message = Tables<'messages'>;

export function useConversations() {
  return useQuery({
    queryKey: qk.conversations,
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
}

export function useMessages(conversationId?: string) {
  return useQuery({
    queryKey: qk.messages(conversationId ?? ''),
    enabled: Boolean(conversationId),
    queryFn: async (): Promise<Message[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string): Promise<Conversation> => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ title: title ?? 'New chat' })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}

export function useRenameConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }): Promise<Conversation> => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.conversations });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const { error } = await supabase.from('conversations').delete().eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: qk.conversations });
      queryClient.invalidateQueries({ queryKey: qk.messages(id) });
    },
  });
}

export interface NoteForChat {
  id: string;
  title: string;
  icon: string | null;
}

export function useNotesForChat() {
  return useQuery({
    queryKey: qk.recentNotes,
    queryFn: async (): Promise<NoteForChat[]> => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, title, icon')
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return data ?? [];
    },
  });
}
