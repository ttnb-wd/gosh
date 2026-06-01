import { createSupabaseClient } from "./supabase/client";

export interface WebsiteSettings {
  id?: string;
  website_name: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_hours: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  viber_phone: string | null;
  whatsapp_phone: string | null;
  delivery_note: string | null;
  footer_text: string | null;
  about_text: string | null;
  created_at?: string;
  updated_at?: string;
}

export const defaultWebsiteSettings: WebsiteSettings = {
  website_name: "GOSH PERFUME",
  tagline: "Luxury fragrance collection",
  description: "Premium perfumes and accessories.",
  address: "",
  phone: "",
  email: "",
  opening_hours: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  viber_phone: "",
  whatsapp_phone: "",
  delivery_note: "",
  footer_text: "Premium perfumes crafted for everyday elegance.",
  about_text: "",
};

export async function getWebsiteSettings(): Promise<WebsiteSettings> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("website_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching website settings:", error.message);
      return defaultWebsiteSettings;
    }

    if (!data) {
      return defaultWebsiteSettings;
    }

    return { ...defaultWebsiteSettings, ...(data as WebsiteSettings) };
  } catch (error) {
    console.error("Unexpected website settings fetch error:", error);
    return defaultWebsiteSettings;
  }
}

export async function updateWebsiteSettings(
  settings: WebsiteSettings
): Promise<{ success: boolean; error?: string; data?: WebsiteSettings }> {
  try {
    const supabase = createSupabaseClient();
    const payload = {
      website_name: settings.website_name || defaultWebsiteSettings.website_name,
      tagline: settings.tagline || null,
      description: settings.description || null,
      address: settings.address || null,
      phone: settings.phone || null,
      email: settings.email || null,
      opening_hours: settings.opening_hours || null,
      facebook_url: settings.facebook_url || null,
      instagram_url: settings.instagram_url || null,
      tiktok_url: settings.tiktok_url || null,
      viber_phone: settings.viber_phone || null,
      whatsapp_phone: settings.whatsapp_phone || null,
      delivery_note: settings.delivery_note || null,
      footer_text: settings.footer_text || null,
      about_text: settings.about_text || null,
      updated_at: new Date().toISOString(),
    };

    const query = settings.id
      ? supabase
          .from("website_settings")
          .update(payload)
          .eq("id", settings.id)
          .select("*")
          .single()
      : supabase.from("website_settings").insert(payload).select("*").single();

    const { data, error } = await query;

    if (error) {
      console.error("Error updating website settings:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as WebsiteSettings };
  } catch (error) {
    console.error("Unexpected website settings update error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update website settings",
    };
  }
}
