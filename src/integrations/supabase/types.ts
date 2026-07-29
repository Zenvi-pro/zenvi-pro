export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      api_pricing: {
        Row: {
          effective_from: string
          flat_cost_per_unit: number
          id: string
          input_cost_per_million: number
          model_pattern: string
          output_cost_per_million: number
          provider: string
        }
        Insert: {
          effective_from?: string
          flat_cost_per_unit?: number
          id?: string
          input_cost_per_million?: number
          model_pattern: string
          output_cost_per_million?: number
          provider: string
        }
        Update: {
          effective_from?: string
          flat_cost_per_unit?: number
          id?: string
          input_cost_per_million?: number
          model_pattern?: string
          output_cost_per_million?: number
          provider?: string
        }
        Relationships: []
      }
      bonus_config: {
        Row: {
          description: string | null
          event_type: string
          is_repeatable: boolean
          points: number
        }
        Insert: {
          description?: string | null
          event_type: string
          is_repeatable?: boolean
          points: number
        }
        Update: {
          description?: string | null
          event_type?: string
          is_repeatable?: boolean
          points?: number
        }
        Relationships: []
      }
      bonus_events: {
        Row: {
          awarded_at: string
          event_key: string | null
          event_type: string
          id: string
          points_awarded: number
          user_id: string
        }
        Insert: {
          awarded_at?: string
          event_key?: string | null
          event_type: string
          id?: string
          points_awarded: number
          user_id: string
        }
        Update: {
          awarded_at?: string
          event_key?: string | null
          event_type?: string
          id?: string
          points_awarded?: number
          user_id?: string
        }
        Relationships: []
      }
      desktop_auth_sessions: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string
          refresh_token: string | null
          state: string
          used: boolean
          user_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string
          refresh_token?: string | null
          state: string
          used?: boolean
          user_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string
          refresh_token?: string | null
          state?: string
          used?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      operation_pricing: {
        Row: {
          active: boolean
          category: string
          description: string | null
          operation_key: string
          points_per_unit: number
          provider: string | null
          unit_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string
          description?: string | null
          operation_key: string
          points_per_unit: number
          provider?: string | null
          unit_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          description?: string | null
          operation_key?: string
          points_per_unit?: number
          provider?: string | null
          unit_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      llm_model_tiers: {
        Row: {
          base_credits_per_call: number
          context_threshold_tokens: number
          description: string | null
          model_pattern: string
          surcharge_block_tokens: number
          surcharge_credits_per_block: number
          tier_band: string
          updated_at: string
        }
        Insert: {
          base_credits_per_call: number
          context_threshold_tokens?: number
          description?: string | null
          model_pattern: string
          surcharge_block_tokens?: number
          surcharge_credits_per_block?: number
          tier_band: string
          updated_at?: string
        }
        Update: {
          base_credits_per_call?: number
          context_threshold_tokens?: number
          description?: string | null
          model_pattern?: string
          surcharge_block_tokens?: number
          surcharge_credits_per_block?: number
          tier_band?: string
          updated_at?: string
        }
        Relationships: []
      }
      point_transactions: {
        Row: {
          balance_after: number | null
          bucket: string
          category: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          idempotency_key: string | null
          input_tokens: number | null
          model: string | null
          note: string | null
          operation: string | null
          output_tokens: number | null
          overage_usd: number | null
          points_delta: number
          provider: string | null
          quantity: number | null
          refund_of: string | null
          session_id: string | null
          total_tokens: number | null
          txn_type: string
          user_id: string
        }
        Insert: {
          balance_after?: number | null
          bucket: string
          category?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          idempotency_key?: string | null
          input_tokens?: number | null
          model?: string | null
          note?: string | null
          operation?: string | null
          output_tokens?: number | null
          overage_usd?: number | null
          points_delta: number
          provider?: string | null
          quantity?: number | null
          refund_of?: string | null
          session_id?: string | null
          txn_type: string
          user_id: string
        }
        Update: {
          balance_after?: number | null
          bucket?: string
          category?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          idempotency_key?: string | null
          input_tokens?: number | null
          model?: string | null
          note?: string | null
          operation?: string | null
          output_tokens?: number | null
          overage_usd?: number | null
          points_delta?: number
          provider?: string | null
          quantity?: number | null
          refund_of?: string | null
          session_id?: string | null
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_refund_of_fkey"
            columns: ["refund_of"]
            isOneToOne: false
            referencedRelation: "point_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          error: string | null
          event_type: string
          payload: Json
          processed_at: string
          stripe_event_id: string
        }
        Insert: {
          error?: string | null
          event_type: string
          payload: Json
          processed_at?: string
          stripe_event_id: string
        }
        Update: {
          error?: string | null
          event_type?: string
          payload?: Json
          processed_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          billing_interval: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tier_config: {
        Row: {
          annual_monthly_points: number
          description: string | null
          max_accumulated_points: number
          max_concurrent_generations: number
          max_daily_generations: number
          max_export_resolution: string
          max_indexing_minutes_per_month: number
          monthly_points: number
          overage_allowed: boolean
          overage_markup_percentage: number
          overage_monthly_cap_usd: number
          rollover_cap_points: number
          rollover_percentage: number
          seats: number
          stripe_annual_price_id: string | null
          stripe_annual_price_id_sandbox: string | null
          stripe_monthly_price_id: string | null
          stripe_monthly_price_id_sandbox: string | null
          tier: string
          updated_at: string
        }
        Insert: {
          annual_monthly_points: number
          description?: string | null
          max_accumulated_points?: number
          max_concurrent_generations?: number
          max_daily_generations?: number
          max_export_resolution?: string
          max_indexing_minutes_per_month?: number
          monthly_points: number
          overage_allowed?: boolean
          overage_markup_percentage?: number
          overage_monthly_cap_usd?: number
          rollover_cap_points?: number
          rollover_percentage?: number
          seats?: number
          stripe_annual_price_id?: string | null
          stripe_annual_price_id_sandbox?: string | null
          stripe_monthly_price_id?: string | null
          stripe_monthly_price_id_sandbox?: string | null
          tier: string
          updated_at?: string
        }
        Update: {
          annual_monthly_points?: number
          description?: string | null
          max_accumulated_points?: number
          max_concurrent_generations?: number
          max_daily_generations?: number
          max_export_resolution?: string
          max_indexing_minutes_per_month?: number
          monthly_points?: number
          overage_allowed?: boolean
          overage_markup_percentage?: number
          overage_monthly_cap_usd?: number
          rollover_cap_points?: number
          rollover_percentage?: number
          seats?: number
          stripe_annual_price_id?: string | null
          stripe_annual_price_id_sandbox?: string | null
          stripe_monthly_price_id?: string | null
          stripe_monthly_price_id_sandbox?: string | null
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      usage_anomalies: {
        Row: {
          action_taken: string | null
          baseline_avg_credits: number
          category: string | null
          detected_at: string
          id: string
          multiplier: number
          note: string | null
          resolved_at: string | null
          spend_today_credits: number
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          baseline_avg_credits: number
          category?: string | null
          detected_at?: string
          id?: string
          multiplier: number
          note?: string | null
          resolved_at?: string | null
          spend_today_credits: number
          user_id: string
        }
        Update: {
          action_taken?: string | null
          baseline_avg_credits?: number
          category?: string | null
          detected_at?: string
          id?: string
          multiplier?: number
          note?: string | null
          resolved_at?: string | null
          spend_today_credits?: number
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          billing_interval: string
          bonus_points: number
          created_at: string
          in_standard_mode: boolean
          overage_enabled: boolean
          overage_limit_usd: number
          overage_spent_cycle: number
          referral_code: string | null
          referred_by: string | null
          rollover_points: number
          subscription_points: number
          topup_points: number
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_interval?: string
          bonus_points?: number
          created_at?: string
          in_standard_mode?: boolean
          overage_enabled?: boolean
          overage_limit_usd?: number
          overage_spent_cycle?: number
          referral_code?: string | null
          referred_by?: string | null
          rollover_points?: number
          subscription_points?: number
          topup_points?: number
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_interval?: string
          bonus_points?: number
          created_at?: string
          in_standard_mode?: boolean
          overage_enabled?: boolean
          overage_limit_usd?: number
          overage_spent_cycle?: number
          referral_code?: string | null
          referred_by?: string | null
          rollover_points?: number
          subscription_points?: number
          topup_points?: number
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          access_token: string
          allowed_tier: string | null
          created_at: string
          id: string
          source_code_id: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          access_token?: string
          allowed_tier?: string | null
          created_at?: string
          id?: string
          source_code_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          access_token?: string
          allowed_tier?: string | null
          created_at?: string
          id?: string
          source_code_id?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      access_codes: {
        Row: {
          allowed_tier: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          note: string | null
          uses: number
        }
        Insert: {
          allowed_tier?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          uses?: number
        }
        Update: {
          allowed_tier?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          uses?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allocate_free_tier_monthly: { Args: never; Returns: number }
      allocate_monthly_points: {
        Args: { p_billing_interval: string; p_tier: string; p_user_id: string }
        Returns: undefined
      }
      award_bonus: {
        Args: { p_event_key?: string; p_event_type: string }
        Returns: number
      }
      charge_llm_call: {
        Args: {
          p_idempotency_key?: string
          p_input_tokens?: number
          p_model: string
          p_note?: string
          p_output_tokens?: number
          p_provider?: string
        }
        Returns: string
      }
      charge_operation: {
        Args: {
          p_duration_seconds?: number
          p_idempotency_key?: string
          p_note?: string
          p_operation: string
          p_provider?: string
          p_session_id?: string
          p_units?: number
        }
        Returns: string
      }
      check_operation_allowed: {
        Args: {
          p_duration_seconds?: number
          p_operation: string
          p_units?: number
        }
        Returns: {
          allowed: boolean
          balance: number
          block_reason: string | null
          in_standard_mode: boolean
          overage_enabled: boolean
          required: number
          tier: string
        }[]
      }
      resolve_operation_points: {
        Args: {
          p_duration_seconds?: number
          p_operation: string
          p_units?: number
        }
        Returns: number
      }
      calculate_api_cost: {
        Args: {
          p_input_tokens: number
          p_model: string
          p_output_tokens: number
          p_provider: string
          p_units?: number
        }
        Returns: number
      }
      check_credits_allowed: {
        Args: { p_estimated_credits?: number }
        Returns: {
          allowed: boolean
          balance: number
          in_standard_mode: boolean
          overage_enabled: boolean
          required: number
          tier: string
        }[]
      }
      claim_waitlist_token: { Args: { token: string }; Returns: boolean }
      complete_desktop_auth_session: {
        Args: {
          p_access_token: string
          p_refresh_token: string
          session_state: string
        }
        Returns: boolean
      }
      compute_llm_credits: {
        Args: {
          p_input_tokens?: number
          p_model: string
          p_output_tokens?: number
        }
        Returns: {
          base: number
          credits: number
          over_tokens: number
          surcharge: number
          tier_band: string
        }[]
      }
      credit_points: {
        Args: {
          p_bucket: string
          p_note?: string
          p_operation?: string
          p_points: number
          p_txn_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      deduct_points: {
        Args: {
          p_note?: string
          p_operation: string
          p_points: number
          p_provider?: string
          p_session_id?: string
        }
        Returns: string
      }
      detect_spend_anomalies: { Args: never; Returns: number }
      get_admin_anomalies: {
        Args: { p_limit?: number }
        Returns: {
          action_taken: string
          baseline_avg_credits: number
          detected_at: string
          email: string
          id: string
          multiplier: number
          note: string
          resolved_at: string
          spend_today_credits: number
          user_id: string
        }[]
      }
      get_admin_summary: {
        Args: never
        Returns: {
          anomalies_this_week: number
          est_arr_usd: number
          est_gross_margin_pct: number
          est_gross_profit_usd: number
          est_mrr_usd: number
          free_users: number
          legacy_count: number
          lifetime_count: number
          max_count: number
          month_credits_used: number
          month_request_count: number
          month_total_cost_usd: number
          overage_enabled_users: number
          pro_count: number
          standard_mode_users: number
          starter_count: number
          total_paid_users: number
        }[]
      }
      get_admin_top_spenders: {
        Args: { p_limit?: number }
        Returns: {
          cost_usd: number
          credits_used: number
          email: string
          in_standard_mode: boolean
          overage_enabled: boolean
          request_count: number
          tier: string
          user_id: string
        }[]
      }
      get_category_breakdown: {
        Args: { p_month_offset?: number }
        Returns: {
          category: string
          request_count: number
          total_credits: number
          total_usd_est: number
        }[]
      }
      get_credits_balance: {
        Args: never
        Returns: {
          billing_interval: string
          bonus_points: number
          in_standard_mode: boolean
          overage_enabled: boolean
          overage_limit_usd: number
          overage_spent_cycle: number
          referral_code: string
          rollover_points: number
          subscription_points: number
          topup_points: number
          total_points: number
        }[]
      }
      get_monthly_totals: {
        Args: never
        Returns: {
          monthly_points_limit: number
          percentage_used: number
          tier: string
          total_credits_used: number
          total_requests: number
        }[]
      }
      get_point_history: {
        Args: {
          p_limit?: number
          p_month_offset?: number
          p_txn_type?: string
        }
        Returns: {
          balance_after: number
          bucket: string
          category: string
          created_at: string
          credits_charged: number
          duration_seconds: number
          id: string
          idempotency_key: string
          input_tokens: number
          model: string
          note: string
          operation: string
          operation_label: string
          output_tokens: number
          points_delta: number
          provider: string
          quantity: number
          refund_of: string
          total_tokens: number
          txn_type: string
        }[]
      }
      get_stripe_customer_id: { Args: never; Returns: string }
      get_tier_config: {
        Args: { p_tier: string }
        Returns: {
          annual_monthly_points: number
          description: string | null
          max_accumulated_points: number
          max_concurrent_generations: number
          max_daily_generations: number
          max_export_resolution: string
          max_indexing_minutes_per_month: number
          monthly_points: number
          overage_allowed: boolean
          overage_markup_percentage: number
          overage_monthly_cap_usd: number
          rollover_cap_points: number
          rollover_percentage: number
          seats: number
          tier: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "tier_config"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_usage_history: {
        Args: { months_back?: number }
        Returns: {
          month: string
          request_count: number
          total_credits: number
        }[]
      }
      get_usage_summary: {
        Args: never
        Returns: {
          provider: string
          request_count: number
          total_credits: number
          total_input_tokens: number
          total_output_tokens: number
        }[]
      }
      get_user_by_referral_code: { Args: { p_code: string }; Returns: string }
      get_user_download_access: { Args: never; Returns: boolean }
      lookup_waitlist_token_for_user: { Args: never; Returns: string }
      get_user_claimed_waitlist_token: { Args: never; Returns: string }
      get_claimed_token_for_code: { Args: { p_code: string }; Returns: string }
      get_user_waitlist_allowed_tier: { Args: never; Returns: string }
      validate_token_for_plan: {
        Args: { token: string; target_tier: string }
        Returns: boolean
      }
      get_user_subscription: {
        Args: never
        Returns: {
          cancel_at_period_end: boolean
          current_period_end: string
          status: string
          tier: string
          stripe_subscription_id: string | null
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      poll_desktop_auth_session: {
        Args: { session_state: string }
        Returns: {
          access_token: string
          authenticated: boolean
          refresh_token: string
        }[]
      }
      record_stripe_event: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: boolean
      }
      refund_points: {
        Args: {
          p_note?: string
          p_operation: string
          p_original_txn?: string
          p_points: number
        }
        Returns: undefined
      }
      update_overage_settings: {
        Args: { p_enabled: boolean; p_limit_usd: number }
        Returns: undefined
      }
      validate_waitlist_token: {
        Args: { token: string }
        Returns: {
          allowed_tier: string | null
          is_valid: boolean
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

