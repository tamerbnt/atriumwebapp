export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BusinessCategory =
  | 'pos_inventory'
  | 'appointment_service'
  | 'membership_session'
  | 'project_milestone'
  | 'rental_booking'
  | 'education_cohort'
  | 'freelance_solo';

export type StaffRoleEnum =
  | 'owner'
  | 'manager'
  | 'cashier'
  | 'technician'
  | 'stylist'
  | 'waiter'
  | 'staff'
  | 'creative';

export interface Database {
  public: {
    Tables: {
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          tier_rank: number;
          max_businesses: number;
          max_branches: number;
          max_devices: number;
          max_staff: number;
          cross_branch_reports: boolean;
          shared_members: boolean;
          is_free_tier: boolean;
          trial_days: number;
          price_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tier_rank: number;
          max_businesses: number;
          max_branches: number;
          max_devices: number;
          max_staff: number;
          cross_branch_reports?: boolean;
          shared_members?: boolean;
          is_free_tier?: boolean;
          trial_days?: number;
          price_label?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscription_plans']['Insert']>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          key: string;
          display_name: string;
          icon: string | null;
          description: string | null;
          is_core: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          key: string;
          display_name: string;
          icon?: string | null;
          description?: string | null;
          is_core?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['modules']['Insert']>;
        Relationships: [];
      };
      accounts: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          phone?: string | null;
          phone_number?: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          phone?: string | null;
          phone_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>;
        Relationships: [];
      };
      account_subscriptions: {
        Row: {
          id: string;
          account_id: string;
          plan_id: string;
          status: 'active' | 'trial' | 'expired' | 'grace';
          is_lifetime: boolean;
          trial_ends_at: string | null;
          current_period_end: string | null;
          grace_ends_at: string | null;
          activated_by_voucher: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          plan_id: string;
          status?: 'active' | 'trial' | 'expired' | 'grace';
          is_lifetime?: boolean;
          trial_ends_at?: string | null;
          current_period_end?: string | null;
          grace_ends_at?: string | null;
          activated_by_voucher?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['account_subscriptions']['Insert']>;
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          account_id: string;
          category: BusinessCategory;
          name: string;
          display_name: string | null;
          address: string | null;
          phone: string | null;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          category?: BusinessCategory;
          name: string;
          display_name?: string | null;
          address?: string | null;
          phone?: string | null;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>;
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          account_id: string;
          business_id: string;
          name: string;
          code?: string | null;
          address: string | null;
          phone: string | null;
          is_main_branch: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          business_id: string;
          name: string;
          code?: string | null;
          address?: string | null;
          phone?: string | null;
          is_main_branch?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['branches']['Insert']>;
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          hardware_id: string;
          label: string | null;
          is_active: boolean;
          last_seen_at: string | null;
          registered_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          hardware_id: string;
          label?: string | null;
          is_active?: boolean;
          last_seen_at?: string | null;
          registered_at?: string;
        };
        Update: Partial<Database['public']['Tables']['devices']['Insert']>;
        Relationships: [];
      };
      license_vouchers: {
        Row: {
          id: string;
          code: string;
          plan_id: string;
          duration_months: number;
          is_redeemed: boolean;
          redeemed_by?: string | null;
          redeemed_by_account_id?: string | null;
          redeemed_at: string | null;
          created_by_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          plan_id: string;
          duration_months?: number;
          is_redeemed?: boolean;
          redeemed_by?: string | null;
          redeemed_by_account_id?: string | null;
          redeemed_at?: string | null;
          created_by_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['license_vouchers']['Insert']>;
        Relationships: [];
      };
      account_audit_logs: {
        Row: {
          id: string;
          account_id: string;
          event_type: string;
          actor_id: string | null;
          metadata: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          event_type: string;
          actor_id?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['account_audit_logs']['Insert']>;
        Relationships: [];
      };
      branch_modules: {
        Row: {
          id: string;
          branch_id: string;
          module_id: string;
          is_enabled: boolean;
          enabled_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          module_id: string;
          is_enabled?: boolean;
          enabled_at?: string;
        };
        Update: Partial<Database['public']['Tables']['branch_modules']['Insert']>;
        Relationships: [];
      };
      branch_sync_logs: {
        Row: {
          id: string;
          branch_id: string;
          direction: 'push' | 'pull';
          status: string;
          records_synced: number;
          error_message: string | null;
          synced_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          direction: 'push' | 'pull';
          status: string;
          records_synced?: number;
          error_message?: string | null;
          synced_at?: string;
        };
        Update: Partial<Database['public']['Tables']['branch_sync_logs']['Insert']>;
        Relationships: [];
      };
      device_heartbeats: {
        Row: {
          id: string;
          device_id: string;
          client_version: string | null;
          os_info: string | null;
          ping_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          client_version?: string | null;
          os_info?: string | null;
          ping_at?: string;
        };
        Update: Partial<Database['public']['Tables']['device_heartbeats']['Insert']>;
        Relationships: [];
      };
      system_notifications: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          message: string;
          type: 'warning' | 'info' | 'alert';
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title: string;
          message: string;
          type?: 'warning' | 'info' | 'alert';
          is_read?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['system_notifications']['Insert']>;
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          account_id: string;
          auth_user_id: string | null;
          full_name: string;
          email: string | null;
          phone: string | null;
          role: StaffRoleEnum;
          pin_hash: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          auth_user_id?: string | null;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          role?: StaffRoleEnum;
          pin_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff']['Insert']>;
        Relationships: [];
      };
      staff_branch_assignments: {
        Row: {
          id: string;
          staff_id: string;
          branch_id: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          branch_id: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_branch_assignments']['Insert']>;
        Relationships: [];
      };
      staff_module_permissions: {
        Row: {
          id: string;
          staff_id: string;
          branch_id: string;
          module_id: string;
          can_view: boolean;
          can_edit: boolean;
          can_delete: boolean;
          granted_at: string;
        };
        Insert: {
          id?: string;
          staff_id: string;
          branch_id: string;
          module_id: string;
          can_view?: boolean;
          can_edit?: boolean;
          can_delete?: boolean;
          granted_at?: string;
        };
        Update: Partial<Database['public']['Tables']['staff_module_permissions']['Insert']>;
        Relationships: [];
      };
      members_directory: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          rfid_tag: string | null;
          barcode: string | null;
          status: string;
          gender: string | null;
          photo_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          rfid_tag?: string | null;
          barcode?: string | null;
          status?: string;
          gender?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['members_directory']['Insert']>;
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          member_id: string | null;
          type: string;
          amount_paid: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          member_id?: string | null;
          type: string;
          amount_paid?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['registrations']['Insert']>;
        Relationships: [];
      };
      registration_requests: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          payload: Json;
          status: 'pending' | 'approved' | 'declined';
          requested_at: string;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          payload: Json;
          status?: 'pending' | 'approved' | 'declined';
          requested_at?: string;
          processed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['registration_requests']['Insert']>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          client_id: string | null;
          client_name: string;
          client_phone: string | null;
          staff_id: string | null;
          staff_name: string;
          service_id: string | null;
          service_name: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          price: number;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          client_id?: string | null;
          client_name: string;
          client_phone?: string | null;
          staff_id?: string | null;
          staff_name: string;
          service_id?: string | null;
          service_name: string;
          date: string;
          start_time: string;
          end_time: string;
          duration_minutes?: number;
          price?: number;
          status?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          name: string;
          description: string | null;
          price: number;
          cost: number;
          stock_quantity: number;
          sku: string | null;
          category: string;
          image_url: string | null;
          reorder_level: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          name: string;
          description?: string | null;
          price?: number;
          cost?: number;
          stock_quantity?: number;
          sku?: string | null;
          category?: string;
          image_url?: string | null;
          reorder_level?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          member_id: string | null;
          member_name: string | null;
          total_amount: number;
          payment_method: string;
          items: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          member_id?: string | null;
          member_name?: string | null;
          total_amount?: number;
          payment_method?: string;
          items?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sales']['Insert']>;
        Relationships: [];
      };
      freelance_clients: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          name: string;
          company: string | null;
          email: string;
          phone: string | null;
          currency: string;
          hourly_rate: number;
          status: string;
          monthly_retainer_hours: number | null;
          monthly_retainer_amount: number | null;
          lifetime_billed: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          name: string;
          company?: string | null;
          email: string;
          phone?: string | null;
          currency?: string;
          hourly_rate?: number;
          status?: string;
          monthly_retainer_hours?: number | null;
          monthly_retainer_amount?: number | null;
          lifetime_billed?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_clients']['Insert']>;
        Relationships: [];
      };
      freelance_projects: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          title: string;
          description: string | null;
          pricing_model: string;
          currency: string;
          budget: number;
          estimated_hours: number;
          logged_hours: number;
          stage: string;
          deadline: string | null;
          deliverables: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          title: string;
          description?: string | null;
          pricing_model?: string;
          currency?: string;
          budget?: number;
          estimated_hours?: number;
          logged_hours?: number;
          stage?: string;
          deadline?: string | null;
          deliverables?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_projects']['Insert']>;
        Relationships: [];
      };
      freelance_time_logs: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          project_id: string;
          project_title: string;
          task_description: string;
          duration_seconds: number;
          is_billable: boolean;
          is_invoiced: boolean;
          rate_at_moment: number;
          currency: string;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          project_id: string;
          project_title: string;
          task_description: string;
          duration_seconds?: number;
          is_billable?: boolean;
          is_invoiced?: boolean;
          rate_at_moment?: number;
          currency?: string;
          date?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_time_logs']['Insert']>;
        Relationships: [];
      };
      freelance_invoices: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          client_company: string | null;
          client_email: string;
          invoice_number: string;
          currency: string;
          issue_date: string;
          due_date: string;
          status: string;
          items: Json;
          subtotal: number;
          tax_percent: number;
          tax_amount: number;
          total_amount: number;
          payment_details: Json | null;
          notes: string | null;
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          client_id: string;
          client_name: string;
          client_company?: string | null;
          client_email: string;
          invoice_number: string;
          currency?: string;
          issue_date?: string;
          due_date: string;
          status?: string;
          items?: Json;
          subtotal?: number;
          tax_percent?: number;
          tax_amount?: number;
          total_amount?: number;
          payment_details?: Json | null;
          notes?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_invoices']['Insert']>;
        Relationships: [];
      };
      freelance_proposals: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          client_name: string;
          client_company: string | null;
          client_email: string;
          title: string;
          overview: string | null;
          scope_items: Json;
          pricing_model: string;
          proposed_budget: number;
          currency: string;
          estimated_timeline_weeks: number;
          valid_until: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          client_name: string;
          client_company?: string | null;
          client_email: string;
          title: string;
          overview?: string | null;
          scope_items?: Json;
          pricing_model?: string;
          proposed_budget?: number;
          currency?: string;
          estimated_timeline_weeks?: number;
          valid_until?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_proposals']['Insert']>;
        Relationships: [];
      };
      freelance_expenses: {
        Row: {
          id: string;
          account_id: string;
          branch_id: string;
          category: string;
          vendor: string;
          description: string;
          amount: number;
          currency: string;
          date: string;
          is_tax_deductible: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          branch_id: string;
          category?: string;
          vendor: string;
          description: string;
          amount?: number;
          currency?: string;
          date?: string;
          is_tax_deductible?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['freelance_expenses']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_device_registration: {
        Args: { p_hardware_id: string };
        Returns: {
          status: string;
          device_id: string;
          account_id: string;
          branch_id: string;
          business_id: string;
        };
      };
      check_subscription_status: {
        Args: { p_hardware_id: string };
        Returns: {
          status: string;
          plan_rank: number;
          days_remaining: number;
          cross_branch_reports: boolean;
          shared_members: boolean;
        };
      };
      onboard_owner_account: {
        Args: {
          p_owner_id: string;
          p_full_name: string;
          p_email: string;
          p_business_name: string;
          p_branch_name: string;
          p_category: string;
          p_hardware_id?: string | null;
          p_device_label?: string | null;
          p_voucher_code?: string | null;
          p_modules?: string[] | null;
        };
        Returns: {
          success: boolean;
          account_id: string;
          business_id: string;
          branch_id: string;
          device_id?: string;
          plan_status: string;
          is_lifetime: boolean;
          tier_rank: number;
          plan_name: string;
        };
      };
      redeem_license_voucher: {
        Args: {
          p_account_id: string;
          p_voucher_code: string;
        };
        Returns: {
          success: boolean;
          plan: {
            name: string;
            tier_rank: number;
            is_lifetime: boolean;
          };
          message: string;
        };
      };
      register_device: {
        Args: {
          p_account_id: string;
          p_branch_id: string;
          p_hardware_id: string;
          p_label: string;
        };
        Returns: {
          success: boolean;
          device_id: string;
        };
      };
      revoke_device: {
        Args: {
          p_device_id: string;
          p_account_id: string;
        };
        Returns: {
          success: boolean;
        };
      };
      get_staff_context: {
        Args: {
          p_account_id: string;
          p_staff_id: string;
        };
        Returns: {
          staff_profile: Database['public']['Tables']['staff']['Row'];
          branches: Database['public']['Tables']['branches']['Row'][];
          permissions: Database['public']['Tables']['staff_module_permissions']['Row'][];
        };
      };
      create_business: {
        Args: {
          p_account_id: string;
          p_name: string;
          p_category: string;
          p_address?: string | null;
          p_phone?: string | null;
        };
        Returns: {
          success: boolean;
          business_id: string;
        };
      };
      create_branch: {
        Args: {
          p_account_id: string;
          p_business_id: string;
          p_name: string;
          p_address?: string | null;
          p_phone?: string | null;
        };
        Returns: {
          success: boolean;
          branch_id: string;
        };
      };
      get_staff_profiles: {
        Args: { p_email: string };
        Returns: Array<{
          id: string;
          full_name: string;
          email: string | null;
          role: string;
          role_rank: number;
          pin_code?: string;
          account_id: string;
        }>;
      };
      get_tenant_facilities: {
        Args: { p_tenant_id: string };
        Returns: Array<{
          branch_id: string;
          branch_name: string;
          business_id: string;
          business_name: string;
          category_code: number;
          category_name: string;
          is_main: boolean;
        }>;
      };
      get_staff_for_sync: {
        Args: {
          p_account_id: string;
          p_updated_after?: string | null;
          p_facility_id?: string | null;
        };
        Returns: Database['public']['Tables']['staff']['Row'][];
      };
    };
    Enums: {
      business_category: BusinessCategory;
      staff_role_enum: StaffRoleEnum;
    };
    CompositeTypes: Record<string, never>;
  };
}
