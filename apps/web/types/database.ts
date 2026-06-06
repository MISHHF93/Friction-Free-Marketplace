export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
          role: "buyer" | "seller" | "admin" | "super_admin";
          status: "pending" | "active" | "suspended" | "banned" | "deleted";
          verification_level_id: number | null;
          last_sign_in_at: string | null;
          banned_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      profiles: {
        Row: {
          user_id: string;
          display_name: string;
          username: string | null;
          bio: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          location_label: string | null;
          website_url: string | null;
          seller_headline: string | null;
          response_time_minutes: number | null;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { user_id: string; display_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          parent_id: string | null;
          slug: string;
          name: string;
          description: string | null;
          icon_url: string | null;
          sort_order: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & { slug: string; name: string };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      listings: {
        Row: {
          id: string;
          seller_id: string;
          category_id: string | null;
          title: string;
          slug: string | null;
          description: string;
          condition: string | null;
          status: "draft" | "active" | "reserved" | "sold" | "paused" | "expired" | "removed";
          price_amount: number;
          currency: string;
          quantity: number;
          location_city: string | null;
          location_region: string | null;
          location_country: string | null;
          ships_to: string[];
          pickup_available: boolean;
          metadata: Json;
          published_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["listings"]["Row"]> & {
          seller_id: string;
          title: string;
          description: string;
          price_amount: number;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Row"]>;
      };
      listing_images: {
        Row: {
          id: string;
          listing_id: string;
          storage_path: string;
          public_url: string | null;
          alt_text: string | null;
          width: number | null;
          height: number | null;
          sort_order: number;
          status: "pending" | "ready" | "rejected" | "deleted";
          moderation_result: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["listing_images"]["Row"]> & { listing_id: string; storage_path: string };
        Update: Partial<Database["public"]["Tables"]["listing_images"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "buyer" | "seller" | "admin" | "super_admin";
      listing_status: "draft" | "active" | "reserved" | "sold" | "paused" | "expired" | "removed";
      media_status: "pending" | "ready" | "rejected" | "deleted";
    };
    CompositeTypes: Record<string, never>;
  };
};
