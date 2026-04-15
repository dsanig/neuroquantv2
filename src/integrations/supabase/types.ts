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
      app_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
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
      capital_ledger: {
        Row: {
          account: string | null
          action_type: string
          amount: number
          created_at: string
          event_date: string
          id: string
          notes: string | null
          running_balance: number | null
          source: string
          updated_at: string
        }
        Insert: {
          account?: string | null
          action_type: string
          amount: number
          created_at?: string
          event_date: string
          id?: string
          notes?: string | null
          running_balance?: number | null
          source?: string
          updated_at?: string
        }
        Update: {
          account?: string | null
          action_type?: string
          amount?: number
          created_at?: string
          event_date?: string
          id?: string
          notes?: string | null
          running_balance?: number | null
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      condor_trades: {
        Row: {
          account: string | null
          broker_trade_ids: string[] | null
          close_date: string | null
          contracts: number
          created_at: string
          currency: string
          exchange_mic: string | null
          expiration_date: string
          id: string
          import_batch_id: string | null
          instrument_id: string | null
          isin: string | null
          long_call_strike: number
          long_put_strike: number
          multiplier: number
          notes: string | null
          premium_paid_to_close: number | null
          premium_per_share: number
          short_call_strike: number
          short_put_strike: number
          status: string
          trade_date: string
          underlying: string
          updated_at: string
        }
        Insert: {
          account?: string | null
          broker_trade_ids?: string[] | null
          close_date?: string | null
          contracts?: number
          created_at?: string
          currency?: string
          exchange_mic?: string | null
          expiration_date: string
          id?: string
          import_batch_id?: string | null
          instrument_id?: string | null
          isin?: string | null
          long_call_strike: number
          long_put_strike: number
          multiplier?: number
          notes?: string | null
          premium_paid_to_close?: number | null
          premium_per_share?: number
          short_call_strike: number
          short_put_strike: number
          status?: string
          trade_date: string
          underlying: string
          updated_at?: string
        }
        Update: {
          account?: string | null
          broker_trade_ids?: string[] | null
          close_date?: string | null
          contracts?: number
          created_at?: string
          currency?: string
          exchange_mic?: string | null
          expiration_date?: string
          id?: string
          import_batch_id?: string | null
          instrument_id?: string | null
          isin?: string | null
          long_call_strike?: number
          long_put_strike?: number
          multiplier?: number
          notes?: string | null
          premium_paid_to_close?: number | null
          premium_per_share?: number
          short_call_strike?: number
          short_put_strike?: number
          status?: string
          trade_date?: string
          underlying?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condor_trades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
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
          password_secret: string | null
          port: number
          schema_name: string | null
          ssl_mode: string
          updated_at: string
          username: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          database_name?: string
          enabled?: boolean
          host: string
          id?: string
          last_connected_at?: string | null
          last_error?: string | null
          last_status?: string
          name: string
          password_secret?: string | null
          port?: number
          schema_name?: string | null
          ssl_mode?: string
          updated_at?: string
          username?: string
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
          password_secret?: string | null
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
          column_mappings: Json | null
          connection_id: string
          created_at: string
          dataset_key: string
          id: string
          notes: string | null
          schema_name: string
          table_name: string
          transform_rules: Json | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          column_mappings?: Json | null
          connection_id: string
          created_at?: string
          dataset_key: string
          id?: string
          notes?: string | null
          schema_name?: string
          table_name: string
          transform_rules?: Json | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          column_mappings?: Json | null
          connection_id?: string
          created_at?: string
          dataset_key?: string
          id?: string
          notes?: string | null
          schema_name?: string
          table_name?: string
          transform_rules?: Json | null
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
      exchanges: {
        Row: {
          active: boolean
          country: string | null
          created_at: string
          currency: string
          id: string
          mic: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          mic: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          country?: string | null
          created_at?: string
          currency?: string
          id?: string
          mic?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      fee_schedules: {
        Row: {
          active: boolean
          created_at: string
          fee_per_contract: number
          id: string
          max_fee: number | null
          min_fee: number | null
          name: string
          per_leg: boolean
          strategy_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          fee_per_contract?: number
          id?: string
          max_fee?: number | null
          min_fee?: number | null
          name: string
          per_leg?: boolean
          strategy_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          fee_per_contract?: number
          id?: string
          max_fee?: number | null
          min_fee?: number | null
          name?: string
          per_leg?: boolean
          strategy_type?: string
          updated_at?: string
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
      instruments: {
        Row: {
          active: boolean
          asset_class: string
          company_name: string
          country: string | null
          created_at: string
          currency: string
          exchange_mic: string | null
          google_finance_symbol: string | null
          id: string
          internal_symbol: string | null
          isin: string | null
          mapping_status: string
          multiplier: number
          notes: string | null
          preferred_listing: boolean
          sector_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          asset_class?: string
          company_name: string
          country?: string | null
          created_at?: string
          currency?: string
          exchange_mic?: string | null
          google_finance_symbol?: string | null
          id?: string
          internal_symbol?: string | null
          isin?: string | null
          mapping_status?: string
          multiplier?: number
          notes?: string | null
          preferred_listing?: boolean
          sector_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          asset_class?: string
          company_name?: string
          country?: string | null
          created_at?: string
          currency?: string
          exchange_mic?: string | null
          google_finance_symbol?: string | null
          id?: string
          internal_symbol?: string | null
          isin?: string | null
          mapping_status?: string
          multiplier?: number
          notes?: string | null
          preferred_listing?: boolean
          sector_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instruments_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_overrides: {
        Row: {
          active: boolean
          actor: string
          created_at: string
          data_domain: string
          effective_end: string | null
          effective_start: string
          field_name: string
          id: string
          instrument_id: string | null
          override_value: Json
          reason: string
          replace_behavior: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          actor?: string
          created_at?: string
          data_domain: string
          effective_end?: string | null
          effective_start?: string
          field_name: string
          id?: string
          instrument_id?: string | null
          override_value: Json
          reason: string
          replace_behavior?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          actor?: string
          created_at?: string
          data_domain?: string
          effective_end?: string | null
          effective_start?: string
          field_name?: string
          id?: string
          instrument_id?: string | null
          override_value?: Json
          reason?: string
          replace_behavior?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_overrides_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
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
      market_data_cache: {
        Row: {
          created_at: string
          data_domain: string
          fallback_chain_attempted: string[] | null
          fetched_at: string
          id: string
          instrument_id: string | null
          is_delayed: boolean
          is_stale: boolean
          provider_name: string
          raw_response: Json | null
          source_timestamp: string | null
          symbol_queried: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          data_domain: string
          fallback_chain_attempted?: string[] | null
          fetched_at?: string
          id?: string
          instrument_id?: string | null
          is_delayed?: boolean
          is_stale?: boolean
          provider_name: string
          raw_response?: Json | null
          source_timestamp?: string | null
          symbol_queried?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          data_domain?: string
          fallback_chain_attempted?: string[] | null
          fetched_at?: string
          id?: string
          instrument_id?: string | null
          is_delayed?: boolean
          is_stale?: boolean
          provider_name?: string
          raw_response?: Json | null
          source_timestamp?: string | null
          symbol_queried?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "market_data_cache_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      market_data_providers: {
        Row: {
          allowed_currencies: string[]
          api_key_ref: string | null
          asset_class_coverage: string[]
          cache_duration_seconds: number
          config: Json
          created_at: string
          enabled: boolean
          exchange_restrictions: string[]
          health_status: string
          id: string
          last_error: string | null
          last_error_at: string | null
          last_successful_fetch: string | null
          name: string
          priority: number
          provider_type: string
          rate_limit_per_minute: number | null
          region_coverage: string[]
          retry_max: number
          stale_threshold_seconds: number
          updated_at: string
          use_cases: string[]
        }
        Insert: {
          allowed_currencies?: string[]
          api_key_ref?: string | null
          asset_class_coverage?: string[]
          cache_duration_seconds?: number
          config?: Json
          created_at?: string
          enabled?: boolean
          exchange_restrictions?: string[]
          health_status?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_successful_fetch?: string | null
          name: string
          priority?: number
          provider_type?: string
          rate_limit_per_minute?: number | null
          region_coverage?: string[]
          retry_max?: number
          stale_threshold_seconds?: number
          updated_at?: string
          use_cases?: string[]
        }
        Update: {
          allowed_currencies?: string[]
          api_key_ref?: string | null
          asset_class_coverage?: string[]
          cache_duration_seconds?: number
          config?: Json
          created_at?: string
          enabled?: boolean
          exchange_restrictions?: string[]
          health_status?: string
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_successful_fetch?: string | null
          name?: string
          priority?: number
          provider_type?: string
          rate_limit_per_minute?: number | null
          region_coverage?: string[]
          retry_max?: number
          stale_threshold_seconds?: number
          updated_at?: string
          use_cases?: string[]
        }
        Relationships: []
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
      sectors: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      source_priority_rules: {
        Row: {
          created_at: string
          data_domain: string
          enabled: boolean
          id: string
          notes: string | null
          priority_order: number
          provider_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_domain: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority_order?: number
          provider_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_domain?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority_order?: number
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_priority_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "market_data_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      symbol_mappings: {
        Row: {
          created_at: string
          id: string
          instrument_id: string
          notes: string | null
          preferred: boolean
          provider_name: string
          provider_symbol: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          instrument_id: string
          notes?: string | null
          preferred?: boolean
          provider_name: string
          provider_symbol: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          instrument_id?: string
          notes?: string | null
          preferred?: boolean
          provider_name?: string
          provider_symbol?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "symbol_mappings_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_profiles: {
        Row: {
          active: boolean
          applicable_strategies: string[]
          created_at: string
          id: string
          name: string
          rate: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applicable_strategies?: string[]
          created_at?: string
          id?: string
          name: string
          rate?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applicable_strategies?: string[]
          created_at?: string
          id?: string
          name?: string
          rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      wheel_campaign_events: {
        Row: {
          campaign_id: string
          capital_impact: number | null
          created_at: string
          description: string | null
          event_date: string
          event_type: string
          id: string
          metadata: Json | null
          premium_impact: number | null
          trade_id: string | null
        }
        Insert: {
          campaign_id: string
          capital_impact?: number | null
          created_at?: string
          description?: string | null
          event_date: string
          event_type: string
          id?: string
          metadata?: Json | null
          premium_impact?: number | null
          trade_id?: string | null
        }
        Update: {
          campaign_id?: string
          capital_impact?: number | null
          created_at?: string
          description?: string | null
          event_date?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          premium_impact?: number | null
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wheel_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wheel_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wheel_campaign_events_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "wheel_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_campaigns: {
        Row: {
          account: string | null
          assignment_flag: boolean
          called_away_flag: boolean
          campaign_end: string | null
          campaign_start: string
          created_at: string
          id: string
          instrument_id: string | null
          notes: string | null
          roll_count: number
          status: string
          underlying: string
          updated_at: string
        }
        Insert: {
          account?: string | null
          assignment_flag?: boolean
          called_away_flag?: boolean
          campaign_end?: string | null
          campaign_start: string
          created_at?: string
          id?: string
          instrument_id?: string | null
          notes?: string | null
          roll_count?: number
          status?: string
          underlying: string
          updated_at?: string
        }
        Update: {
          account?: string | null
          assignment_flag?: boolean
          called_away_flag?: boolean
          campaign_end?: string | null
          campaign_start?: string
          created_at?: string
          id?: string
          instrument_id?: string | null
          notes?: string | null
          roll_count?: number
          status?: string
          underlying?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_campaigns_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
        ]
      }
      wheel_trades: {
        Row: {
          account: string | null
          broker_trade_id: string | null
          campaign_id: string | null
          close_date: string | null
          contracts: number
          created_at: string
          currency: string
          delta_at_entry: number | null
          exchange_mic: string | null
          expiration_date: string
          id: string
          import_batch_id: string | null
          instrument_id: string | null
          isin: string | null
          multiplier: number
          notes: string | null
          premium_paid_to_close: number | null
          premium_per_share: number
          sector_id: string | null
          status: string
          stock_cost_basis: number | null
          strike: number
          trade_date: string
          trade_type: string
          underlying: string
          updated_at: string
        }
        Insert: {
          account?: string | null
          broker_trade_id?: string | null
          campaign_id?: string | null
          close_date?: string | null
          contracts?: number
          created_at?: string
          currency?: string
          delta_at_entry?: number | null
          exchange_mic?: string | null
          expiration_date: string
          id?: string
          import_batch_id?: string | null
          instrument_id?: string | null
          isin?: string | null
          multiplier?: number
          notes?: string | null
          premium_paid_to_close?: number | null
          premium_per_share?: number
          sector_id?: string | null
          status?: string
          stock_cost_basis?: number | null
          strike: number
          trade_date: string
          trade_type?: string
          underlying: string
          updated_at?: string
        }
        Update: {
          account?: string | null
          broker_trade_id?: string | null
          campaign_id?: string | null
          close_date?: string | null
          contracts?: number
          created_at?: string
          currency?: string
          delta_at_entry?: number | null
          exchange_mic?: string | null
          expiration_date?: string
          id?: string
          import_batch_id?: string | null
          instrument_id?: string | null
          isin?: string | null
          multiplier?: number
          notes?: string | null
          premium_paid_to_close?: number | null
          premium_per_share?: number
          sector_id?: string | null
          status?: string
          stock_cost_basis?: number | null
          strike?: number
          trade_date?: string
          trade_type?: string
          underlying?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_trades_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "wheel_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wheel_trades_instrument_id_fkey"
            columns: ["instrument_id"]
            isOneToOne: false
            referencedRelation: "instruments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wheel_trades_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
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
