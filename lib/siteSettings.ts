import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase/config";

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
 * Get site settings from Firestore
 * Returns default settings if none exist or on error
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snapshot = await getDoc(doc(db, "site_settings", "1"));

    if (!snapshot.exists()) {
      return defaultSettings;
    }

    const data = snapshot.data() as Partial<SiteSettings>;

    return { ...defaultSettings, ...data };
  } catch (err) {
    console.error("Unexpected error fetching site settings:", err);
    return defaultSettings;
  }
}

/**
 * Update site settings in Firestore
 * Uses a singleton document to create or update the row
 */
export async function updateSiteSettings(
  settings: Partial<SiteSettings>
): Promise<{ success: boolean; error?: string }> {
  try {
    const rest = { ...settings };
    delete rest.id;
    delete rest.created_at;
    delete rest.updated_at;

    await setDoc(
      doc(db, "site_settings", "1"),
      {
        ...rest,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: unknown) {
    console.error("Unexpected error updating site settings:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update settings",
    };
  }
}

/**
 * Get default settings (useful for reset functionality)
 */
export function getDefaultSettings(): SiteSettings {
  return { ...defaultSettings };
}
