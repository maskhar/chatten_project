export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  chatten_cafe: {
    Tables: {
      about_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          image_media_id: string | null
          is_active: boolean
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "about_sections_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_information: {
        Row: {
          address: string | null
          created_at: string
          directions_url: string | null
          email: string | null
          id: string
          is_active: boolean
          map_embed_url: string | null
          phone: string | null
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          directions_url?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          map_embed_url?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          directions_url?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          map_embed_url?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          body: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          slug: string
          starts_at: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          slug: string
          starts_at: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          slug?: string
          starts_at?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          created_at: string
          description: string
          id: string
          image_media_id: string | null
          is_active: boolean
          name: string
          published_at: string | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name: string
          published_at?: string | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name?: string
          published_at?: string | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          image_media_id: string | null
          is_active: boolean
          sort_order: number
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text: string
          created_at?: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          sort_order?: number
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_url: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          published_at: string | null
          sort_order: number
          status: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          published_at?: string | null
          sort_order?: number
          status?: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          published_at?: string | null
          sort_order?: number
          status?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hero_slides_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_sections: {
        Row: {
          created_at: string
          id: string
          is_visible: boolean
          section_key: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_visible?: boolean
          section_key?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt_text: string | null
          attribution: string | null
          bucket: string
          caption: string | null
          category: string | null
          created_at: string
          file_size: number | null
          focal_x: number | null
          focal_y: number | null
          height: number | null
          id: string
          mime_type: string
          original_filename: string
          rights_status: string
          sha256: string | null
          source_reference: string | null
          source_type: string | null
          storage_path: string
          tags: string[]
          title: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          attribution?: string | null
          bucket: string
          caption?: string | null
          category?: string | null
          created_at?: string
          file_size?: number | null
          focal_x?: number | null
          focal_y?: number | null
          height?: number | null
          id?: string
          mime_type: string
          original_filename: string
          rights_status?: string
          sha256?: string | null
          source_reference?: string | null
          source_type?: string | null
          storage_path: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          attribution?: string | null
          bucket?: string
          caption?: string | null
          category?: string | null
          created_at?: string
          file_size?: number | null
          focal_x?: number | null
          focal_y?: number | null
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string
          rights_status?: string
          sha256?: string | null
          source_reference?: string | null
          source_type?: string | null
          storage_path?: string
          tags?: string[]
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          name: string
          price: number | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name: string
          price?: number | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name?: string
          price?: number | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          name: string
          published_at: string | null
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name: string
          published_at?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name?: string
          published_at?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      navigation_items: {
        Row: {
          created_at: string
          href: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          href: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          href?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      opening_hours: {
        Row: {
          closes_at: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          opens_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          body: string | null
          created_at: string
          ends_at: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          slug: string
          starts_at: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          slug: string
          starts_at?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          slug?: string
          starts_at?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_settings: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          og_media_id: string | null
          page_key: string
          robots: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          og_media_id?: string | null
          page_key: string
          robots?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          og_media_id?: string | null
          page_key?: string
          robots?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_settings_og_media_id_fkey"
            columns: ["og_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          site_name: string
          tagline: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          site_name: string
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          site_name?: string
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          platform: string
          sort_order: number
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform: string
          sort_order?: number
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          platform?: string
          sort_order?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      spaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_media_id: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_media_id?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaces_image_media_id_fkey"
            columns: ["image_media_id"]
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author_name: string
          created_at: string
          id: string
          is_active: boolean
          quote: string
          sort_order: number
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          author_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          quote: string
          sort_order?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          quote?: string
          sort_order?: number
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { required_role: string }; Returns: boolean }
      reorder_rows: {
        Args: { ids: string[]; start_offset?: number; target_table: string }
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
  chatten_cafe: {
    Enums: {},
  },
} as const
