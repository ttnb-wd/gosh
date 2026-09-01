import devLog from "@/lib/dev-log";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase/config";

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
    const q = query(
      collection(db, "website_settings"),
      orderBy("created_at", "asc"),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return defaultWebsiteSettings;
    }

    const data = snapshot.docs[0].data() as WebsiteSettings;

    return {
      ...defaultWebsiteSettings,
      ...data,
      id: snapshot.docs[0].id,
    };
  } catch (error) {
    devLog.error("Unexpected website settings fetch error:", error);
    return defaultWebsiteSettings;
  }
}

export async function updateWebsiteSettings(
  settings: WebsiteSettings
): Promise<{ success: boolean; error?: string; data?: WebsiteSettings }> {
  try {
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
    };

    const targetDoc = settings.id
      ? doc(db, "website_settings", settings.id)
      : doc(collection(db, "website_settings"));

    await setDoc(
      targetDoc,
      {
        ...payload,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      success: true,
      data: { ...defaultWebsiteSettings, ...payload, id: targetDoc.id },
    };
  } catch (error) {
    devLog.error("Unexpected website settings update error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update website settings",
    };
  }
}
