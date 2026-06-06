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

      conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          buyer_id: string;
          seller_id: string;
          status: "open" | "archived" | "blocked" | "closed";
          last_message_at: string | null;
          muted_by: string[];
          closed_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["conversations"]["Row"]> & { buyer_id: string; seller_id: string };
        Update: Partial<Database["public"]["Tables"]["conversations"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          kind: "text" | "attachment" | "offer" | "system" | "pickup_schedule" | "deposit";
          attachments: Json;
          moderation_status: "pending" | "approved" | "flagged" | "removed";
          read_at: string | null;
          client_token: string | null;
          edited_at: string | null;
          deleted_at: string | null;
          reported_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["messages"]["Row"]> & { conversation_id: string; sender_id: string; body: string };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      message_attachments: {
        Row: {
          id: string;
          message_id: string;
          conversation_id: string;
          uploader_id: string;
          storage_bucket: string;
          storage_path: string;
          public_url: string | null;
          file_name: string;
          content_type: string;
          byte_size: number;
          width: number | null;
          height: number | null;
          status: "pending" | "ready" | "rejected" | "deleted";
          moderation_result: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["message_attachments"]["Row"]> & { message_id: string; conversation_id: string; uploader_id: string; storage_path: string; file_name: string; content_type: string; byte_size: number };
        Update: Partial<Database["public"]["Tables"]["message_attachments"]["Row"]>;
      };
      message_read_receipts: {
        Row: { message_id: string; conversation_id: string; user_id: string; read_at: string };
        Insert: Partial<Database["public"]["Tables"]["message_read_receipts"]["Row"]> & { message_id: string; conversation_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["message_read_receipts"]["Row"]>;
      };
      conversation_typing_indicators: {
        Row: { conversation_id: string; user_id: string; is_typing: boolean; typed_at: string; expires_at: string };
        Insert: Partial<Database["public"]["Tables"]["conversation_typing_indicators"]["Row"]> & { conversation_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["conversation_typing_indicators"]["Row"]>;
      };
      offers: {
        Row: {
          id: string; listing_id: string; conversation_id: string | null; buyer_id: string; seller_id: string; created_by_id: string | null; responded_by_id: string | null;
          amount: number; currency: string; message: string | null; status: "pending" | "accepted" | "countered" | "declined" | "expired" | "withdrawn";
          parent_offer_id: string | null; response_message: string | null; expires_at: string | null; accepted_at: string | null; rejected_at: string | null; withdrawn_at: string | null;
          reservation_deposit_amount: number; metadata: Json; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["offers"]["Row"]> & { listing_id: string; buyer_id: string; seller_id: string; amount: number };
        Update: Partial<Database["public"]["Tables"]["offers"]["Row"]>;
      };
      pickup_schedules: {
        Row: {
          id: string; conversation_id: string; listing_id: string | null; offer_id: string | null; buyer_id: string; seller_id: string; proposed_by_id: string;
          status: "proposed" | "confirmed" | "reschedule_requested" | "completed" | "cancelled" | "no_show"; starts_at: string; ends_at: string | null; timezone: string;
          location_label: string; location_details: string | null; safety_notes: string | null; confirmed_at: string | null; completed_at: string | null; cancelled_at: string | null;
          no_show_reported_by_id: string | null; metadata: Json; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["pickup_schedules"]["Row"]> & { conversation_id: string; buyer_id: string; seller_id: string; proposed_by_id: string; starts_at: string; location_label: string };
        Update: Partial<Database["public"]["Tables"]["pickup_schedules"]["Row"]>;
      };
      reservation_deposits: {
        Row: {
          id: string; conversation_id: string; listing_id: string | null; offer_id: string | null; pickup_schedule_id: string | null; buyer_id: string; seller_id: string;
          status: "pending" | "authorized" | "held" | "released" | "forfeited" | "refunded" | "failed" | "cancelled"; amount: number; currency: string; provider: string | null; provider_payment_id: string | null;
          due_at: string | null; authorized_at: string | null; held_at: string | null; released_at: string | null; forfeited_at: string | null; refunded_at: string | null; metadata: Json; created_at: string; updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservation_deposits"]["Row"]> & { conversation_id: string; buyer_id: string; seller_id: string; amount: number };
        Update: Partial<Database["public"]["Tables"]["reservation_deposits"]["Row"]>;
      };
      anti_ghosting_penalties: {
        Row: { id: string; conversation_id: string | null; pickup_schedule_id: string | null; deposit_id: string | null; penalized_user_id: string; reported_by_id: string | null; status: "pending" | "applied" | "waived" | "appealed" | "reversed"; reason: string; penalty_points: number; penalty_amount: number; currency: string; evidence: Json; applied_at: string | null; waived_at: string | null; metadata: Json; created_at: string; updated_at: string };
        Insert: Partial<Database["public"]["Tables"]["anti_ghosting_penalties"]["Row"]> & { penalized_user_id: string; reason: string };
        Update: Partial<Database["public"]["Tables"]["anti_ghosting_penalties"]["Row"]>;
      };
      user_blocks: {
        Row: { blocker_id: string; blocked_id: string; conversation_id: string | null; reason: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["user_blocks"]["Row"]> & { blocker_id: string; blocked_id: string };
        Update: Partial<Database["public"]["Tables"]["user_blocks"]["Row"]>;
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
      ai_agents: {
        Row: {
          id: string;
          owner_user_id: string | null;
          name: string;
          agent_type: "buyer" | "seller" | "listing_creation" | "pricing" | "fraud_detection" | "negotiation" | "support" | "recommendation" | "moderation" | "search";
          status: "active" | "paused" | "disabled" | "deleted";
          instructions: string | null;
          permissions: Json;
          configuration: Json;
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_agents"]["Row"]> & { name: string; agent_type: "buyer" | "seller" | "listing_creation" | "pricing" | "fraud_detection" | "negotiation" | "support" | "recommendation" | "moderation" | "search" };
        Update: Partial<Database["public"]["Tables"]["ai_agents"]["Row"]>;
      };
      ai_tasks: {
        Row: {
          id: string;
          agent_id: string;
          requested_by: string | null;
          task_type: string;
          status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
          input: Json;
          output: Json | null;
          error_message: string | null;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_tasks"]["Row"]> & { agent_id: string; task_type: string };
        Update: Partial<Database["public"]["Tables"]["ai_tasks"]["Row"]>;
      };
      ai_agent_audit_events: {
        Row: {
          id: string;
          actor_id: string | null;
          agent_type: "buyer" | "seller" | "listing_creation" | "pricing" | "fraud_detection" | "negotiation" | "support" | "recommendation" | "moderation" | "search";
          task_id: string | null;
          action: string;
          status: "queued" | "running" | "succeeded" | "failed";
          input_summary: Json;
          output_summary: Json;
          safety_flags: string[];
          tool_calls: Json;
          token_usage: Json;
          latency_ms: number | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["ai_agent_audit_events"]["Row"]> & { agent_type: "buyer" | "seller" | "listing_creation" | "pricing" | "fraud_detection" | "negotiation" | "support" | "recommendation" | "moderation" | "search"; action: string; status: "queued" | "running" | "succeeded" | "failed" };
        Update: Partial<Database["public"]["Tables"]["ai_agent_audit_events"]["Row"]>;
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_type: "user" | "admin" | "system" | "ai_agent";
          action: string;
          table_name: string | null;
          record_id: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & { action: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "buyer" | "seller" | "admin" | "super_admin";
      listing_status: "draft" | "active" | "reserved" | "sold" | "paused" | "expired" | "removed";
      media_status: "pending" | "ready" | "rejected" | "deleted";
      conversation_status: "open" | "archived" | "blocked" | "closed";
      message_kind: "text" | "attachment" | "offer" | "system" | "pickup_schedule" | "deposit";
      attachment_status: "pending" | "ready" | "rejected" | "deleted";
      offer_status: "pending" | "accepted" | "countered" | "declined" | "expired" | "withdrawn";
      pickup_schedule_status: "proposed" | "confirmed" | "reschedule_requested" | "completed" | "cancelled" | "no_show";
      reservation_deposit_status: "pending" | "authorized" | "held" | "released" | "forfeited" | "refunded" | "failed" | "cancelled";
      ghosting_penalty_status: "pending" | "applied" | "waived" | "appealed" | "reversed";
      ai_task_status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
