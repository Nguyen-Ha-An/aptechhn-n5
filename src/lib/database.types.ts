// Regenerate with `bunx supabase gen types typescript --local > src/lib/database.types.ts`

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          theme: string
          timezone: string
          focus_minutes: number
          short_break_minutes: number
          long_break_minutes: number
          cycles_before_long_break: number
          auto_start_breaks: boolean
          notifications: boolean
          legacy_imported_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          theme?: string
          timezone?: string
          focus_minutes?: number
          short_break_minutes?: number
          long_break_minutes?: number
          cycles_before_long_break?: number
          auto_start_breaks?: boolean
          notifications?: boolean
          legacy_imported_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          theme?: string
          timezone?: string
          focus_minutes?: number
          short_break_minutes?: number
          long_break_minutes?: number
          cycles_before_long_break?: number
          auto_start_breaks?: boolean
          notifications?: boolean
          legacy_imported_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          id: string
          user_id: string
          title: string
          done: boolean
          due_date: string | null
          priority: string
          position: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title: string
          done?: boolean
          due_date?: string | null
          priority?: string
          position?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          done?: boolean
          due_date?: string | null
          priority?: string
          position?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          id: string
          user_id: string
          parent_id: string | null
          icon: string | null
          title: string
          content: Json
          content_text: string
          position: number
          archived_at: string | null
          created_at: string
          updated_at: string
          search: unknown | null
        }
        Insert: {
          id?: string
          user_id?: string
          parent_id?: string | null
          icon?: string | null
          title?: string
          content?: Json
          content_text?: string
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          search?: unknown | null
        }
        Update: {
          id?: string
          user_id?: string
          parent_id?: string | null
          icon?: string | null
          title?: string
          content?: Json
          content_text?: string
          position?: number
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          search?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_links: {
        Row: {
          source_id: string
          target_id: string
          user_id: string
        }
        Insert: {
          source_id: string
          target_id: string
          user_id?: string
        }
        Update: {
          source_id?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_links_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_links_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          todo_id: string | null
          mode: string
          started_at: string
          ended_at: string
          planned_seconds: number | null
          focused_seconds: number
          paused_seconds: number
          phase_count: number
          focus_rating: number | null
          reflection: string | null
          created_at: string
        }
        Insert: {
          id: string
          user_id?: string
          todo_id?: string | null
          mode: string
          started_at: string
          ended_at: string
          planned_seconds?: number | null
          focused_seconds: number
          paused_seconds?: number
          phase_count?: number
          focus_rating?: number | null
          reflection?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          todo_id?: string | null
          mode?: string
          started_at?: string
          ended_at?: string
          planned_seconds?: number | null
          focused_seconds?: number
          paused_seconds?: number
          phase_count?: number
          focus_rating?: number | null
          reflection?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "todos"
            referencedColumns: ["id"]
          },
        ]
      }
      distractions: {
        Row: {
          id: string
          session_id: string
          user_id: string
          category: string
          note: string | null
          occurred_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string
          category: string
          note?: string | null
          occurred_at: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          category?: string
          note?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distractions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          user_id: string
          achievement_id: string
          unlocked_at: string
        }
        Insert: {
          user_id?: string
          achievement_id: string
          unlocked_at?: string
        }
        Update: {
          user_id?: string
          achievement_id?: string
          unlocked_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id?: string
          role: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          role?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage: {
        Row: {
          user_id: string
          day: string
          requests: number
        }
        Insert: {
          user_id: string
          day: string
          requests?: number
        }
        Update: {
          user_id?: string
          day?: string
          requests?: number
        }
        Relationships: []
      }
    }
    Views: {
      user_stats: {
        Row: {
          user_id: string
          total_focus_minutes: number
          sessions_count: number
          todos_done: number
          notes_count: number
          current_streak: number
          best_streak: number
          has_undistracted: boolean
        }
        Relationships: []
      }
    }
    Functions: {
      check_achievements: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      consume_ai_quota: {
        Args: {
          p_limit: number
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database['public']['Tables'] & Database['public']['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database['public']['Tables'] &
        Database['public']['Views'])
    ? (Database['public']['Tables'] &
        Database['public']['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database['public']['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database['public']['Tables']
    ? Database['public']['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database['public']['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof Database['public']['Enums']
    ? Database['public']['Enums'][PublicEnumNameOrOptions]
    : never
