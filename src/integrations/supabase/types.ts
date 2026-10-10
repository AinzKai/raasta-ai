export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      complaint_events: {
        Row: {
          complaint_id: string;
          created_at: string;
          id: string;
          note: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          complaint_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          complaint_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "complaint_events_complaint_id_fkey";
            columns: ["complaint_id"];
            isOneToOne: false;
            referencedRelation: "complaints";
            referencedColumns: ["id"];
          },
        ];
      };
      complaints: {
        Row: {
          category: string;
          city: string;
          created_at: string;
          department: string;
          description: string;
          evidence: Json;
          id: string;
          jurisdiction_id: string | null;
          official_portal_url: string | null;
          official_reference: string | null;
          official_status: string;
          personal_status: string;
          reference: string;
          service_slug: string | null;
          status: string;
          subject: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: string;
          city?: string;
          created_at?: string;
          department: string;
          description: string;
          evidence?: Json;
          id?: string;
          jurisdiction_id?: string | null;
          official_portal_url?: string | null;
          official_reference?: string | null;
          official_status?: string;
          personal_status?: string;
          reference?: string;
          service_slug?: string | null;
          status?: string;
          subject: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: string;
          city?: string;
          created_at?: string;
          department?: string;
          description?: string;
          evidence?: Json;
          id?: string;
          jurisdiction_id?: string | null;
          official_portal_url?: string | null;
          official_reference?: string | null;
          official_status?: string;
          personal_status?: string;
          reference?: string;
          service_slug?: string | null;
          status?: string;
          subject?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          service_slug: string | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          service_slug?: string | null;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          service_slug?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      journeys: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          id: string;
          jurisdiction_id: string;
          knowledge_version: string;
          service_id: string;
          state: Json;
          status: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          jurisdiction_id: string;
          knowledge_version?: string;
          service_id: string;
          state?: Json;
          status?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          jurisdiction_id?: string;
          knowledge_version?: string;
          service_id?: string;
          state?: Json;
          status?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: { bucket_key: string; request_count: number; window_start: string };
        Insert: { bucket_key: string; request_count?: number; window_start?: string };
        Update: { bucket_key?: string; request_count?: number; window_start?: string };
        Relationships: [];
      };
      source_health: {
        Row: {
          agency_id: string | null;
          checked_at: string;
          content_changed: boolean;
          content_hash: string | null;
          error_message: string | null;
          http_status: number | null;
          id: string;
          jurisdiction_id: string | null;
          review_required: boolean;
          service_slug: string;
          source_id: string | null;
          source_url: string;
          status: string;
        };
        Insert: {
          agency_id?: string | null;
          checked_at?: string;
          content_changed?: boolean;
          content_hash?: string | null;
          error_message?: string | null;
          http_status?: number | null;
          id?: string;
          jurisdiction_id?: string | null;
          review_required?: boolean;
          service_slug: string;
          source_id?: string | null;
          source_url: string;
          status: string;
        };
        Update: {
          agency_id?: string | null;
          checked_at?: string;
          content_changed?: boolean;
          content_hash?: string | null;
          error_message?: string | null;
          http_status?: number | null;
          id?: string;
          jurisdiction_id?: string | null;
          review_required?: boolean;
          service_slug?: string;
          source_id?: string | null;
          source_url?: string;
          status?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          payload: Json | null;
          role: string;
          user_id: string;
        };
        Insert: {
          content?: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          payload?: Json | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          preferred_language: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          preferred_language?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          preferred_language?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cleanup_old_rate_limits: { Args: Record<PropertyKey, never>; Returns: undefined };
      increment_rate_limit: { Args: { p_bucket_key: string }; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
