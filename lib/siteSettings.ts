import { createSupabaseClient } from "./supabase/client";

export interface SiteSettings {
  id: number;
  store_name: string;
  store_tagline: string | null;
  store_email: string | null;
  store_phone: string | null;
  store_address: string | null;
  city: string | null;
  country: string;
  enable_checkout: boolean;
  allow_cash_on_delivery: boolean;
  allow_kbzpay: boolean;
  allow_wavepay: boolean;
  allow_ayapay: boolean;
  allow_bank_transfer: boolean;
  free_delivery_enabled: boolean;
  delivery_fee: number;
  minimum_order_amount: number;
  kbzpay_account_name: string | null;
  kbzpay_phone: string | null;
  wavepay_account_name: string | null;
  wavepay_phone: string | null;
  ayapay_account_name: string | null;
  ayapay_phone: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  announcement_enabled: boolean;
  announcement_text: string | null;
  announcement_type: "info" | "success" | "warning" | "promo";
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  messenger_url: string | null;
  order_auto_confirm: boolean;
  low_stock_threshold: number;
  maintenance_mode: boolean;
  maintenance_message: string;
  created_at?: string;
  updated_at?: string;
}

// Default settings fallback
const defaultSettings: SiteSettings = {
  id: 1,
  store_name: "GOSH PERFUME",
  store_tagline: "Luxury Perfume",
  store_email: null,
  store_phone: null,
  store_address: null,
  city: null,
  country: "Myanmar",
  enable_checkout: true,
  allow_cash_on_delivery: true,
  allow_kbzpay: true,
  allow_wavepay: true,
  allow_ayapay: true,
  allow_bank_transfer: true,
  free_delivery_enabled: true,
  delivery_fee: 0,
  minimum_order_amount: 0,
  kbzpay_account_name: null,
  kbzpay_phone: null,
  wavepay_account_name: null,
  wavepay_phone: null,
  ayapay_account_name: null,
  ayapay_phone: null,
  bank_name: null,
  bank_account_name: null,
  bank_account_number: null,
  announcement_enabled: false,
  announcement_text: null,
  announcement_type: "info",
  facebook_url: null,
  instagram_url: null,
  tiktok_url: null,
  messenger_url: null,
  order_auto_confirm: false,
  low_stock_threshold: 5,
  maintenance_mode: false,
  maintenance_message: "We are updating our store. Please check back soon.",
};

/**
 * Get site settings from Supabase
 * Returns default settings if none exist or on error
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = createSupabaseClient();

    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching site settings:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return defaultSettings;
    }

    if (!data) {
      console.warn("No site settings found, using defaults");
      return defaultSettings;
    }

    return data as SiteSettings;
  } catch (err) {
    console.error("Unexpected error fetching site settings:", err);
    return defaultSettings;
  }
}

/**
 * Update site settings in Supabase
 * Uses upsert to create or update the singleton row
 */
export async function updateSiteSettings(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabaseClient();

    const { error } = await supabase
      .from("site_settings")
      .upsert(
        {
          id: 1,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .eq("id", 1);

    if (error) {
      console.error("Error updating site settings:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error updating site settings:", err);
    return { success: false, error: err.message || "Failed to update settings" };
  }
}

/**
 * Get default settings (useful for reset functionality)
 */
export function getDefaultSettings(): SiteSettings {
  return { ...defaultSettings };
}
