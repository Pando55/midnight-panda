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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chart_scans: {
        Row: {
          account_id: string | null
          analysis: Json
          created_at: string
          expires_at: string
          id: string
          invalidated: boolean
          outcome: string
          source: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          analysis: Json
          created_at?: string
          expires_at?: string
          id?: string
          invalidated?: boolean
          outcome: string
          source: string
          symbol: string
          timeframe: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          analysis?: Json
          created_at?: string
          expires_at?: string
          id?: string
          invalidated?: boolean
          outcome?: string
          source?: string
          symbol?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chart_scans_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          activated_at: string | null
          activated_by_user_id: string | null
          auto_trading_enabled: boolean
          created_at: string
          created_by_user_id: string | null
          customer_email: string
          duration: Database["public"]["Enums"]["license_duration"]
          expires_at: string | null
          id: string
          is_active: boolean
          license_key: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          auto_trading_enabled?: boolean
          created_at?: string
          created_by_user_id?: string | null
          customer_email: string
          duration: Database["public"]["Enums"]["license_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          license_key: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by_user_id?: string | null
          auto_trading_enabled?: boolean
          created_at?: string
          created_by_user_id?: string | null
          customer_email?: string
          duration?: Database["public"]["Enums"]["license_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          license_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          telegram_chat_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          telegram_chat_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_updates: {
        Row: {
          chat_id: number | null
          created_at: string
          raw_update: Json
          update_id: number
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          raw_update: Json
          update_id: number
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          raw_update?: Json
          update_id?: number
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          account_number: string | null
          account_type: string | null
          broker: string | null
          chat_id: number
          created_at: string
          id: string
          instrument: string | null
          license_key: string | null
          linked_user_id: string | null
          lot_size: number | null
          max_positions: number | null
          onboarded_at: string | null
          telegram_username: string | null
          timeframe: string | null
          trailing_stop_pips: number | null
          updated_at: string
          wizard_data: Json
          wizard_state: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          broker?: string | null
          chat_id: number
          created_at?: string
          id?: string
          instrument?: string | null
          license_key?: string | null
          linked_user_id?: string | null
          lot_size?: number | null
          max_positions?: number | null
          onboarded_at?: string | null
          telegram_username?: string | null
          timeframe?: string | null
          trailing_stop_pips?: number | null
          updated_at?: string
          wizard_data?: Json
          wizard_state?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          broker?: string | null
          chat_id?: number
          created_at?: string
          id?: string
          instrument?: string | null
          license_key?: string | null
          linked_user_id?: string | null
          lot_size?: number | null
          max_positions?: number | null
          onboarded_at?: string | null
          telegram_username?: string | null
          timeframe?: string | null
          trailing_stop_pips?: number | null
          updated_at?: string
          wizard_data?: Json
          wizard_state?: string
        }
        Relationships: []
      }
      trade_requests: {
        Row: {
          account_id: string
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          kind: string
          mode: string
          payload: Json
          result: Json
          scan_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key: string
          kind: string
          mode?: string
          payload: Json
          result?: Json
          scan_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          claimed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          idempotency_key?: string
          kind?: string
          mode?: string
          payload?: Json
          result?: Json
          scan_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "trading_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_requests_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "chart_scans"
            referencedColumns: ["id"]
          },
        ]
      }
      trader_profiles: {
        Row: {
          avatar_emoji: string
          badges: string[]
          created_at: string
          id: string
          rank: string
          streak: number
          total_pips: number
          total_trades: number
          updated_at: string
          user_id: string
          username: string
          win_rate: number
          winning_trades: number
        }
        Insert: {
          avatar_emoji?: string
          badges?: string[]
          created_at?: string
          id?: string
          rank?: string
          streak?: number
          total_pips?: number
          total_trades?: number
          updated_at?: string
          user_id: string
          username: string
          win_rate?: number
          winning_trades?: number
        }
        Update: {
          avatar_emoji?: string
          badges?: string[]
          created_at?: string
          id?: string
          rank?: string
          streak?: number
          total_pips?: number
          total_trades?: number
          updated_at?: string
          user_id?: string
          username?: string
          win_rate?: number
          winning_trades?: number
        }
        Relationships: []
      }
      trading_accounts: {
        Row: {
          account_mode: string
          account_number: string
          authorization_expires_at: string | null
          authorization_license_id: string | null
          balance: number
          broker: string
          created_at: string
          credential_hash: string | null
          currency: string
          daily_loss_percent: number
          demo_verified_at: string | null
          equity: number
          free_margin: number
          id: string
          is_demo: boolean
          last_sync_at: string | null
          live_enabled: boolean
          max_exposure_lots: number
          max_risk_percent: number
          pair_code_hash: string | null
          pair_expires_at: string | null
          paired_at: string | null
          platform: string
          selected_symbol: string
          selected_timeframe: string
          server: string
          snapshot: Json
          stopped: boolean
          user_id: string
        }
        Insert: {
          account_mode?: string
          account_number: string
          authorization_expires_at?: string | null
          authorization_license_id?: string | null
          balance?: number
          broker: string
          created_at?: string
          credential_hash?: string | null
          currency?: string
          daily_loss_percent?: number
          demo_verified_at?: string | null
          equity?: number
          free_margin?: number
          id?: string
          is_demo?: boolean
          last_sync_at?: string | null
          live_enabled?: boolean
          max_exposure_lots?: number
          max_risk_percent?: number
          pair_code_hash?: string | null
          pair_expires_at?: string | null
          paired_at?: string | null
          platform: string
          selected_symbol?: string
          selected_timeframe?: string
          server: string
          snapshot?: Json
          stopped?: boolean
          user_id: string
        }
        Update: {
          account_mode?: string
          account_number?: string
          authorization_expires_at?: string | null
          authorization_license_id?: string | null
          balance?: number
          broker?: string
          created_at?: string
          credential_hash?: string | null
          currency?: string
          daily_loss_percent?: number
          demo_verified_at?: string | null
          equity?: number
          free_margin?: number
          id?: string
          is_demo?: boolean
          last_sync_at?: string | null
          live_enabled?: boolean
          max_exposure_lots?: number
          max_risk_percent?: number
          pair_code_hash?: string | null
          pair_expires_at?: string | null
          paired_at?: string | null
          platform?: string
          selected_symbol?: string
          selected_timeframe?: string
          server?: string
          snapshot?: Json
          stopped?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_accounts_authorization_license_id_fkey"
            columns: ["authorization_license_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_licenses: {
        Row: {
          activated_at: string
          created_at: string
          duration: Database["public"]["Enums"]["license_duration"]
          expires_at: string | null
          id: string
          is_active: boolean
          license_key: string
          license_key_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at: string
          created_at?: string
          duration: Database["public"]["Enums"]["license_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          license_key: string
          license_key_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          duration?: Database["public"]["Enums"]["license_duration"]
          expires_at?: string | null
          id?: string
          is_active?: boolean
          license_key?: string
          license_key_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_licenses_license_key_id_fkey"
            columns: ["license_key_id"]
            isOneToOne: true
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_license_key: {
        Args: { _license_key: string }
        Returns: {
          activated_at: string
          duration: Database["public"]["Enums"]["license_duration"]
          expires_at: string
          is_active: boolean
          license_key: string
        }[]
      }
      claim_terminal_request: {
        Args: { aid: string }
        Returns: {
          account_id: string
          claimed_at: string | null
          created_at: string
          expires_at: string
          id: string
          idempotency_key: string
          kind: string
          mode: string
          payload: Json
          result: Json
          scan_id: string | null
          status: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "trade_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      consume_trade_permit: {
        Args: { order_index: number; rid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      queue_terminal_request: {
        Args: {
          aid: string
          body: Json
          idem: string
          knd: string
          md: string
          sid: string
          uid: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      license_duration:
        | "3months"
        | "6months"
        | "12months"
        | "lifetime"
        | "18months"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      license_duration: [
        "3months",
        "6months",
        "12months",
        "lifetime",
        "18months",
      ],
    },
  },
} as const
