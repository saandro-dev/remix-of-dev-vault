export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          environment: Database["public"]["Enums"]["project_environment"]
          folder_id: string | null
          id: string
          key_value: string
          label: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: Database["public"]["Enums"]["project_environment"]
          folder_id?: string | null
          id?: string
          key_value: string
          label: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: Database["public"]["Enums"]["project_environment"]
          folder_id?: string | null
          id?: string
          key_value?: string
          label?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "key_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bugs: {
        Row: {
          cause_code: string | null
          created_at: string
          id: string
          project_id: string | null
          solution: string | null
          status: Database["public"]["Enums"]["bug_status"]
          symptom: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
          vault_module_id: string | null
        }
        Insert: {
          cause_code?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          symptom: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
          vault_module_id?: string | null
        }
        Update: {
          cause_code?: string | null
          created_at?: string
          id?: string
          project_id?: string | null
          solution?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
          symptom?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          vault_module_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bugs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bugs_vault_module_id_fkey"
            columns: ["vault_module_id"]
            isOneToOne: false
            referencedRelation: "vault_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      devvault_api_audit_log: {
        Row: {
          action: string
          api_key_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          http_status: number | null
          id: number
          ip_address: string | null
          processing_time_ms: number | null
          request_body: Json | null
          success: boolean
          user_id: string
        }
        Insert: {
          action: string
          api_key_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: never
          ip_address?: string | null
          processing_time_ms?: number | null
          request_body?: Json | null
          success?: boolean
          user_id: string
        }
        Update: {
          action?: string
          api_key_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: never
          ip_address?: string | null
          processing_time_ms?: number | null
          request_body?: Json | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devvault_api_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "devvault_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      devvault_api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key_name: string
          key_prefix: string
          last_used_at: string | null
          revoked_at: string | null
          user_id: string
          vault_secret_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name: string
          key_prefix: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id: string
          vault_secret_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key_name?: string
          key_prefix?: string
          last_used_at?: string | null
          revoked_at?: string | null
          user_id?: string
          vault_secret_id?: string
        }
        Relationships: []
      }
      devvault_api_rate_limits: {
        Row: {
          action: string
          attempts: number
          blocked_until: string | null
          identifier: string
          last_attempt_at: string
        }
        Insert: {
          action: string
          attempts?: number
          blocked_until?: string | null
          identifier: string
          last_attempt_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          blocked_until?: string | null
          identifier?: string
          last_attempt_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vault_module_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vault_module_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vault_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_vault_module_id_fkey"
            columns: ["vault_module_id"]
            isOneToOne: false
            referencedRelation: "vault_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      key_folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "key_folders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shared_snippets: {
        Row: {
          id: string
          shared_at: string
          user_id: string
          vault_module_id: string
        }
        Insert: {
          id?: string
          shared_at?: string
          user_id: string
          vault_module_id: string
        }
        Update: {
          id?: string
          shared_at?: string
          user_id?: string
          vault_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_snippets_vault_module_id_fkey"
            columns: ["vault_module_id"]
            isOneToOne: false
            referencedRelation: "vault_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_modules: {
        Row: {
          category: Database["public"]["Enums"]["vault_category"]
          code: string
          context_markdown: string | null
          created_at: string
          dependencies: string | null
          description: string | null
          id: string
          is_public: boolean
          language: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["vault_category"]
          code?: string
          context_markdown?: string | null
          created_at?: string
          dependencies?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          language?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["vault_category"]
          code?: string
          context_markdown?: string | null
          created_at?: string
          dependencies?: string | null
          description?: string | null
          id?: string
          is_public?: boolean
          language?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_devvault_api_key: {
        Args: { p_key_name: string; p_raw_key: string; p_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      revoke_devvault_api_key: {
        Args: { p_key_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_devvault_api_key: {
        Args: { p_raw_key: string }
        Returns: {
          key_id: string
          owner_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      bug_status: "open" | "resolved"
      project_environment: "dev" | "staging" | "prod"
      vault_category: "frontend" | "backend" | "devops" | "security"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      bug_status: ["open", "resolved"],
      project_environment: ["dev", "staging", "prod"],
      vault_category: ["frontend", "backend", "devops", "security"],
    },
  },
} as const
