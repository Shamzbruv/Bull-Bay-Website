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
      announcements: {
        Row: {
          body: string
          campus_id: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          published_at: string | null
          status: string
          title: string
        }
        Insert: {
          body: string
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          status?: string
          title: string
        }
        Update: {
          body?: string
          campus_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_plan_items: {
        Row: {
          category: string | null
          church_year_id: string
          created_at: string
          description: string | null
          event_id: string | null
          id: string
          ministry_id: string | null
          month: string
          organization_id: string
          planned_date: string | null
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string | null
          church_year_id: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          ministry_id?: string | null
          month: string
          organization_id: string
          planned_date?: string | null
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string | null
          church_year_id?: string
          created_at?: string
          description?: string | null
          event_id?: string | null
          id?: string
          ministry_id?: string | null
          month?: string
          organization_id?: string
          planned_date?: string | null
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "annual_plan_items_church_year_id_fkey"
            columns: ["church_year_id"]
            isOneToOne: false
            referencedRelation: "church_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_plan_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_plan_items_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_plan_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: number
          metadata: Json
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          metadata?: Json
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          metadata?: Json
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          latitude: number | null
          livestream_url: string | null
          longitude: number | null
          name: string
          organization_id: string
          parish: string | null
          phone: string | null
          postal_code: string | null
          service_schedule: Json
          slug: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          latitude?: number | null
          livestream_url?: string | null
          longitude?: number | null
          name: string
          organization_id: string
          parish?: string | null
          phone?: string | null
          postal_code?: string | null
          service_schedule?: Json
          slug: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          latitude?: number | null
          livestream_url?: string | null
          longitude?: number | null
          name?: string
          organization_id?: string
          parish?: string | null
          phone?: string | null
          postal_code?: string | null
          service_schedule?: Json
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "campuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      care_case_access: {
        Row: {
          case_id: string
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          case_id: string
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          case_id?: string
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_case_access_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "care_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      care_cases: {
        Row: {
          category: string | null
          confidential_notes: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          owner_id: string | null
          status: string
          subject_profile_id: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          confidential_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          owner_id?: string | null
          status?: string
          subject_profile_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          confidential_notes?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          owner_id?: string | null
          status?: string
          subject_profile_id?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_cases_subject_profile_id_fkey"
            columns: ["subject_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      church_years: {
        Row: {
          created_at: string
          ends_on: string
          id: string
          label: string
          organization_id: string
          starts_on: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_on: string
          id?: string
          label: string
          organization_id: string
          starts_on: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_on?: string
          id?: string
          label?: string
          organization_id?: string
          starts_on?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_years_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          interest: string | null
          kind: string
          last_name: string | null
          message: string | null
          organization_id: string
          phone: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          interest?: string | null
          kind: string
          last_name?: string | null
          message?: string | null
          organization_id: string
          phone?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          interest?: string | null
          kind?: string
          last_name?: string | null
          message?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_entitlements: {
        Row: {
          created_at: string
          download_count: number
          email: string | null
          expires_at: string | null
          id: string
          license_key_hash: string | null
          max_downloads: number | null
          order_item_id: string | null
          product_id: string | null
          profile_id: string | null
          revoked_at: string | null
        }
        Insert: {
          created_at?: string
          download_count?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          license_key_hash?: string | null
          max_downloads?: number | null
          order_item_id?: string | null
          product_id?: string | null
          profile_id?: string | null
          revoked_at?: string | null
        }
        Update: {
          created_at?: string
          download_count?: number
          email?: string | null
          expires_at?: string | null
          id?: string
          license_key_hash?: string | null
          max_downloads?: number | null
          order_item_id?: string | null
          product_id?: string | null
          profile_id?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_entitlements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_entitlements_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctrine_statements: {
        Row: {
          created_at: string
          id: string
          ordinal: number
          organization_id: string
          statement: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordinal: number
          organization_id: string
          statement: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ordinal?: number
          organization_id?: string
          statement?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctrine_statements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      donation_allocations: {
        Row: {
          amount_minor: number
          donation_id: string
          fund_id: string
          id: string
        }
        Insert: {
          amount_minor: number
          donation_id: string
          fund_id: string
          id?: string
        }
        Update: {
          amount_minor?: number
          donation_id?: string
          fund_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "donation_allocations_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donation_allocations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          donor_email: string | null
          donor_name: string | null
          donor_profile_id: string | null
          id: string
          is_recurring: boolean
          organization_id: string
          provider: string | null
          provider_payment_id: string | null
          receipt_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_profile_id?: string | null
          id?: string
          is_recurring?: boolean
          organization_id: string
          provider?: string | null
          provider_payment_id?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          donor_email?: string | null
          donor_name?: string | null
          donor_profile_id?: string | null
          id?: string
          is_recurring?: boolean
          organization_id?: string
          provider?: string | null
          provider_payment_id?: string | null
          receipt_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_profile_id_fkey"
            columns: ["donor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          created_at: string
          event_id: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          profile_id: string | null
          quantity: number
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          profile_id?: string | null
          quantity?: number
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          profile_id?: string | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          campus_id: string | null
          capacity: number | null
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          location_name: string | null
          online_url: string | null
          organization_id: string
          price_minor: number
          registration_closes_at: string | null
          registration_opens_at: string | null
          registration_required: boolean
          slug: string
          starts_at: string
          status: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          campus_id?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location_name?: string | null
          online_url?: string | null
          organization_id: string
          price_minor?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_required?: boolean
          slug: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          campus_id?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          location_name?: string | null
          online_url?: string | null
          organization_id?: string
          price_minor?: number
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          registration_required?: boolean
          slug?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      funds: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          profile_id: string
          role: string
          status: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          profile_id: string
          role?: string
          status?: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          profile_id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          campus_id: string | null
          capacity: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location_area: string | null
          meeting_schedule: string | null
          ministry_id: string | null
          name: string
          organization_id: string
          slug: string
          visibility: string
        }
        Insert: {
          campus_id?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_area?: string | null
          meeting_schedule?: string | null
          ministry_id?: string | null
          name: string
          organization_id: string
          slug: string
          visibility?: string
        }
        Update: {
          campus_id?: string | null
          capacity?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_area?: string | null
          meeting_schedule?: string | null
          ministry_id?: string | null
          name?: string
          organization_id?: string
          slug?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "households_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: number
          quantity_delta: number
          reason: string
          reference_id: string | null
          reference_type: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: never
          quantity_delta: number
          reason: string
          reference_id?: string | null
          reference_type?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: never
          quantity_delta?: number
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ministries: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          leader_profile_id: string | null
          name: string
          organization_id: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          leader_profile_id?: string | null
          name: string
          organization_id: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          leader_profile_id?: string | null
          name?: string
          organization_id?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "ministries_leader_profile_id_fkey"
            columns: ["leader_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ministry_assignments: {
        Row: {
          church_year_id: string | null
          created_at: string
          created_by: string | null
          display_name: string | null
          id: string
          is_active: boolean
          ministry_id: string
          organization_id: string
          position_title: string
          profile_id: string | null
          public_visible: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          church_year_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          ministry_id: string
          organization_id: string
          position_title: string
          profile_id?: string | null
          public_visible?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          church_year_id?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean
          ministry_id?: string
          organization_id?: string
          position_title?: string
          profile_id?: string | null
          public_visible?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_assignments_church_year_id_fkey"
            columns: ["church_year_id"]
            isOneToOne: false
            referencedRelation: "church_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_assignments_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ministry_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json
          email_enabled: boolean
          profile_id: string
          push_enabled: boolean
          sms_enabled: boolean
          updated_at: string
        }
        Insert: {
          categories?: Json
          email_enabled?: boolean
          profile_id: string
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Update: {
          categories?: Json
          email_enabled?: boolean
          profile_id?: string
          push_enabled?: boolean
          sms_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          name_snapshot: string
          order_id: string
          product_id: string | null
          quantity: number
          sku_snapshot: string | null
          tax_minor: number
          total_minor: number
          unit_price_minor: number
          variant_id: string | null
        }
        Insert: {
          id?: string
          name_snapshot: string
          order_id: string
          product_id?: string | null
          quantity: number
          sku_snapshot?: string | null
          tax_minor?: number
          total_minor: number
          unit_price_minor: number
          variant_id?: string | null
        }
        Update: {
          id?: string
          name_snapshot?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku_snapshot?: string | null
          tax_minor?: number
          total_minor?: number
          unit_price_minor?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_profile_id: string | null
          discount_minor: number
          fulfillment_method: string | null
          id: string
          order_number: string
          organization_id: string
          provider: string | null
          provider_payment_id: string | null
          shipping_address: Json | null
          shipping_minor: number
          status: string
          subtotal_minor: number
          tax_minor: number
          total_minor: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_profile_id?: string | null
          discount_minor?: number
          fulfillment_method?: string | null
          id?: string
          order_number?: string
          organization_id: string
          provider?: string | null
          provider_payment_id?: string | null
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_profile_id?: string | null
          discount_minor?: number
          fulfillment_method?: string | null
          id?: string
          order_number?: string
          organization_id?: string
          provider?: string | null
          provider_payment_id?: string | null
          shipping_address?: Json | null
          shipping_minor?: number
          status?: string
          subtotal_minor?: number
          tax_minor?: number
          total_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_currency: string
          id: string
          name: string
          slug: string
          timezone: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          id?: string
          name: string
          slug: string
          timezone?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          id?: string
          name?: string
          slug?: string
          timezone?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          published_at: string | null
          seo_description: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          published_at?: string | null
          seo_description?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          published_at?: string | null
          seo_description?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          donation_id: string | null
          id: string
          order_id: string | null
          organization_id: string
          provider: string
          provider_payment_id: string
          raw_payload: Json | null
          status: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          donation_id?: string | null
          id?: string
          order_id?: string | null
          organization_id: string
          provider: string
          provider_payment_id: string
          raw_payload?: Json | null
          status?: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          donation_id?: string | null
          id?: string
          order_id?: string | null
          organization_id?: string
          provider?: string
          provider_payment_id?: string
          raw_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          description: string
        }
        Insert: {
          code: string
          description: string
        }
        Update: {
          code?: string
          description?: string
        }
        Relationships: []
      }
      prayer_requests: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          organization_id: string
          request_body: string
          status: string
          submitter_contact: string | null
          submitter_name: string | null
          submitter_profile_id: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          organization_id: string
          request_body: string
          status?: string
          submitter_contact?: string | null
          submitter_name?: string | null
          submitter_profile_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          request_body?: string
          status?: string
          submitter_contact?: string | null
          submitter_name?: string | null
          submitter_profile_id?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "prayer_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prayer_requests_submitter_profile_id_fkey"
            columns: ["submitter_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          name: string
          price_minor_override: number | null
          product_id: string
          sku: string
          track_inventory: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_minor_override?: number | null
          product_id: string
          sku: string
          track_inventory?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_minor_override?: number | null
          product_id?: string
          sku?: string
          track_inventory?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          digital_asset_path: string | null
          id: string
          image_urls: string[]
          kind: string
          name: string
          organization_id: string
          price_minor: number
          slug: string
          status: string
          tax_class: string
          taxable: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          digital_asset_path?: string | null
          id?: string
          image_urls?: string[]
          kind: string
          name: string
          organization_id: string
          price_minor: number
          slug: string
          status?: string
          tax_class?: string
          taxable?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          digital_asset_path?: string | null
          id?: string
          image_urls?: string[]
          kind?: string
          name?: string
          organization_id?: string
          price_minor?: number
          slug?: string
          status?: string
          tax_class?: string
          taxable?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_path: string | null
          campus_id: string | null
          communication_email_opt_in: boolean
          communication_sms_opt_in: boolean
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          gender: string | null
          household_id: string | null
          id: string
          joined_at: string | null
          last_name: string | null
          membership_status: string
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_contact_method: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_path?: string | null
          campus_id?: string | null
          communication_email_opt_in?: boolean
          communication_sms_opt_in?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          household_id?: string | null
          id?: string
          joined_at?: string | null
          last_name?: string | null
          membership_status?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferred_contact_method?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_path?: string | null
          campus_id?: string | null
          communication_email_opt_in?: boolean
          communication_sms_opt_in?: boolean
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          gender?: string | null
          household_id?: string | null
          id?: string
          joined_at?: string | null
          last_name?: string | null
          membership_status?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          actor_id: string | null
          amount_minor: number
          created_at: string
          id: string
          payment_id: string
          provider_refund_id: string | null
          reason: string | null
          status: string
        }
        Insert: {
          actor_id?: string | null
          amount_minor: number
          created_at?: string
          id?: string
          payment_id: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          actor_id?: string | null
          amount_minor?: number
          created_at?: string
          id?: string
          payment_id?: string
          provider_refund_id?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_code: string
          role_id: string
        }
        Insert: {
          permission_code: string
          role_id: string
        }
        Update: {
          permission_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sermon_series: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          organization_id: string
          slug: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          organization_id: string
          slug: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          organization_id?: string
          slug?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sermon_series_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sermons: {
        Row: {
          audio_path: string | null
          campus_id: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          organization_id: string
          preached_at: string | null
          published_at: string | null
          scripture_references: string[]
          series_id: string | null
          slug: string
          speaker: string | null
          status: string
          summary: string | null
          thumbnail_url: string | null
          title: string
          topics: string[]
          transcript: string | null
          updated_at: string
          video_id: string | null
          video_provider: string | null
        }
        Insert: {
          audio_path?: string | null
          campus_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          organization_id: string
          preached_at?: string | null
          published_at?: string | null
          scripture_references?: string[]
          series_id?: string | null
          slug: string
          speaker?: string | null
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          topics?: string[]
          transcript?: string | null
          updated_at?: string
          video_id?: string | null
          video_provider?: string | null
        }
        Update: {
          audio_path?: string | null
          campus_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          organization_id?: string
          preached_at?: string | null
          published_at?: string | null
          scripture_references?: string[]
          series_id?: string | null
          slug?: string
          speaker?: string | null
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          topics?: string[]
          transcript?: string | null
          updated_at?: string
          video_id?: string | null
          video_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sermons_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sermons_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "sermon_series"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_goals: {
        Row: {
          created_at: string
          due_on: string | null
          goal_text: string
          id: string
          metric_type: string | null
          progress_value: number | null
          public_visible: boolean
          sort_order: number
          status: string
          strategic_movement_id: string
          target_unit: string | null
          target_value: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_on?: string | null
          goal_text: string
          id?: string
          metric_type?: string | null
          progress_value?: number | null
          public_visible?: boolean
          sort_order?: number
          status?: string
          strategic_movement_id: string
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_on?: string | null
          goal_text?: string
          id?: string
          metric_type?: string | null
          progress_value?: number | null
          public_visible?: boolean
          sort_order?: number
          status?: string
          strategic_movement_id?: string
          target_unit?: string | null
          target_value?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_goals_strategic_movement_id_fkey"
            columns: ["strategic_movement_id"]
            isOneToOne: false
            referencedRelation: "strategic_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_movements: {
        Row: {
          church_year_id: string
          created_at: string
          description: string | null
          expected_outcome: string | null
          id: string
          name: string
          objective: string | null
          public_visible: boolean
          short_label: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          church_year_id: string
          created_at?: string
          description?: string | null
          expected_outcome?: string | null
          id?: string
          name: string
          objective?: string | null
          public_visible?: boolean
          short_label?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          church_year_id?: string
          created_at?: string
          description?: string | null
          expected_outcome?: string | null
          id?: string
          name?: string
          objective?: string | null
          public_visible?: boolean
          short_label?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_movements_church_year_id_fkey"
            columns: ["church_year_id"]
            isOneToOne: false
            referencedRelation: "church_years"
            referencedColumns: ["id"]
          },
        ]
      }
      strategic_priorities: {
        Row: {
          church_year_id: string
          created_at: string
          id: string
          is_primary_focus: boolean
          public_visible: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          church_year_id: string
          created_at?: string
          id?: string
          is_primary_focus?: boolean
          public_visible?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          church_year_id?: string
          created_at?: string
          id?: string
          is_primary_focus?: boolean
          public_visible?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategic_priorities_church_year_id_fkey"
            columns: ["church_year_id"]
            isOneToOne: false
            referencedRelation: "church_years"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          campus_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Insert: {
          campus_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id: string
          role_id: string
          user_id: string
        }
        Update: {
          campus_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_assignments: {
        Row: {
          profile_id: string
          responded_at: string | null
          shift_id: string
          status: string
        }
        Insert: {
          profile_id: string
          responded_at?: string | null
          shift_id: string
          status?: string
        }
        Update: {
          profile_id?: string
          responded_at?: string | null
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "volunteer_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_opportunities: {
        Row: {
          campus_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          ministry_id: string | null
          organization_id: string
          title: string
        }
        Insert: {
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          ministry_id?: string | null
          organization_id: string
          title: string
        }
        Update: {
          campus_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          ministry_id?: string | null
          organization_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_opportunities_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_opportunities_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteer_shifts: {
        Row: {
          created_at: string
          ends_at: string | null
          event_id: string | null
          id: string
          opportunity_id: string
          slots: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          event_id?: string | null
          id?: string
          opportunity_id: string
          slots?: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          event_id?: string | null
          id?: string
          opportunity_id?: string
          slots?: number
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_shifts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_shifts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "volunteer_opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          event_type: string
          id: number
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_type: string
          id?: never
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          event_type?: string
          id?: never
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      variant_stock_levels: {
        Row: {
          available: number | null
          variant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_household_id: { Args: never; Returns: string }
      current_profile_id: { Args: never; Returns: string }
      has_permission: {
        Args: { org: string; permission: string }
        Returns: boolean
      }
      immutable_english_tsvector: { Args: { input: string }; Returns: unknown }
      next_order_number: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
          versioning_status: string
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
          versioning_status?: string
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          archived_at: string | null
          bucket_id: string | null
          created_at: string | null
          id: string
          is_delete_marker: boolean
          is_versioned: boolean
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          is_delete_marker?: boolean
          is_versioned?: boolean
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
