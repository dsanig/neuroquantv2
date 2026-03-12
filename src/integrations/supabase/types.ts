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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          actor: string
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          source: string
        }
        Insert: {
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          source?: string
        }
        Update: {
          actor?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: []
      }
      database_connections: {
        Row: {
          active: boolean
          created_at: string
          database_name: string
          enabled: boolean
          host: string
          id: string
          last_connected_at: string | null
          last_error: string | null
          last_status: string
          name: string
          password_secret: string
          port: number
          schema_name: string | null
          ssl_mode: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          database_name: string
          enabled?: boolean
          host: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_status?: string
          name: string
          password_secret: string
          port?: number
          schema_name?: string | null
          ssl_mode?: string
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          database_name?: string
          enabled?: boolean
          host?: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_status?: string
          name?: string
          password_secret?: string
          port?: number
          schema_name?: string | null
          ssl_mode?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      dataset_mappings: {
        Row: {
          active: boolean
          connection_id: string
          created_at: string
          dataset_key: string
          id: string
          notes: string | null
          schema_name: string
          table_name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          connection_id: string
          created_at?: string
          dataset_key: string
          id?: string
          notes?: string | null
          schema_name?: string
          table_name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          connection_id?: string
          created_at?: string
          dataset_key?: string
          id?: string
          notes?: string | null
          schema_name?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dataset_mappings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "database_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          active: boolean
          created_at: string
          encrypted: boolean
          encryption_type: string | null
          filename_pattern: string
          host: string
          id: string
          last_connected_at: string | null
          last_error: string | null
          last_status: string
          name: string
          password_ref: string | null
          pgp_armored: boolean | null
          pgp_key_ref: string | null
          pgp_passphrase_ref: string | null
          polling_schedule: string
          port: number
          protocol: string
          remote_path: string
          type: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          encrypted?: boolean
          encryption_type?: string | null
          filename_pattern?: string
          host: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_status?: string
          name: string
          password_ref?: string | null
          pgp_armored?: boolean | null
          pgp_key_ref?: string | null
          pgp_passphrase_ref?: string | null
          polling_schedule?: string
          port?: number
          protocol?: string
          remote_path?: string
          type?: string
          updated_at?: string
          username: string
        }
        Update: {
          active?: boolean
          created_at?: string
          encrypted?: boolean
          encryption_type?: string | null
          filename_pattern?: string
          host?: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_status?: string
          name?: string
          password_ref?: string | null
          pgp_armored?: boolean | null
          pgp_key_ref?: string | null
          pgp_passphrase_ref?: string | null
          polling_schedule?: string
          port?: number
          protocol?: string
          remote_path?: string
          type?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_rows: number
          file_name: string
          id: string
          imported_rows: number
          mapping_version: string
          parser_profile_id: string | null
          parser_profile_name: string
          raw_file_data: string | null
          source_id: string | null
          source_name: string
          started_at: string
          status: string
          total_rows: number
          triggered_by: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number
          file_name: string
          id?: string
          imported_rows?: number
          mapping_version?: string
          parser_profile_id?: string | null
          parser_profile_name: string
          raw_file_data?: string | null
          source_id?: string | null
          source_name: string
          started_at?: string
          status?: string
          total_rows?: number
          triggered_by?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_rows?: number
          file_name?: string
          id?: string
          imported_rows?: number
          mapping_version?: string
          parser_profile_id?: string | null
          parser_profile_name?: string
          raw_file_data?: string | null
          source_id?: string | null
          source_name?: string
          started_at?: string
          status?: string
          total_rows?: number
          triggered_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_parser_profile_id_fkey"
            columns: ["parser_profile_id"]
            isOneToOne: false
            referencedRelation: "parser_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          batch_id: string
          created_at: string
          field: string
          id: string
          message: string
          row_number: number
          value: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          field: string
          id?: string
          message: string
          row_number: number
          value?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          field?: string
          id?: string
          message?: string
          row_number?: number
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      mapping_rules: {
        Row: {
          created_at: string
          dedup_behavior: string
          default_value: string | null
          destination_table: string
          field_type: string
          id: string
          profile_id: string
          required: boolean
          sort_order: number
          source_field: string
          target_field: string
          transform: string | null
          updated_at: string
          validation: string | null
        }
        Insert: {
          created_at?: string
          dedup_behavior?: string
          default_value?: string | null
          destination_table: string
          field_type?: string
          id?: string
          profile_id: string
          required?: boolean
          sort_order?: number
          source_field: string
          target_field: string
          transform?: string | null
          updated_at?: string
          validation?: string | null
        }
        Update: {
          created_at?: string
          dedup_behavior?: string
          default_value?: string | null
          destination_table?: string
          field_type?: string
          id?: string
          profile_id?: string
          required?: boolean
          sort_order?: number
          source_field?: string
          target_field?: string
          transform?: string | null
          updated_at?: string
          validation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mapping_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "parser_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      normalized_records: {
        Row: {
          batch_id: string
          created_at: string
          destination_table: string
          id: string
          mapped_data: Json
          validation_errors: Json | null
          validation_status: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          destination_table: string
          id?: string
          mapped_data: Json
          validation_errors?: Json | null
          validation_status?: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          destination_table?: string
          id?: string
          mapped_data?: Json
          validation_errors?: Json | null
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "normalized_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      parser_profiles: {
        Row: {
          created_at: string
          date_format: string
          date_parsing_rule: string | null
          dedup_key: string | null
          delimiter: string
          encoding: string
          file_type: string
          header_detection: string | null
          header_row: number
          id: string
          name: string
          numeric_format: string
          numeric_parsing_rule: string | null
          skip_condition: string | null
          skip_rows: number
          source_pattern: string
          updated_at: string
          validation_rules: string | null
          version: number
        }
        Insert: {
          created_at?: string
          date_format?: string
          date_parsing_rule?: string | null
          dedup_key?: string | null
          delimiter?: string
          encoding?: string
          file_type?: string
          header_detection?: string | null
          header_row?: number
          id?: string
          name: string
          numeric_format?: string
          numeric_parsing_rule?: string | null
          skip_condition?: string | null
          skip_rows?: number
          source_pattern?: string
          updated_at?: string
          validation_rules?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          date_format?: string
          date_parsing_rule?: string | null
          dedup_key?: string | null
          delimiter?: string
          encoding?: string
          file_type?: string
          header_detection?: string | null
          header_row?: number
          id?: string
          name?: string
          numeric_format?: string
          numeric_parsing_rule?: string | null
          skip_condition?: string | null
          skip_rows?: number
          source_pattern?: string
          updated_at?: string
          validation_rules?: string | null
          version?: number
        }
        Relationships: []
      }
      raw_rows: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          raw_data: Json
          row_number: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          raw_data: Json
          row_number: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          raw_data?: Json
          row_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "raw_rows_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
