"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getSiteSettings,
  updateSiteSettings,
  getDefaultSettings,
  SiteSettings,
} from "@/lib/siteSettings";
import {
  defaultWebsiteSettings,
  getWebsiteSettings,
  updateWebsiteSettings,
  type WebsiteSettings,
} from "@/lib/websiteSettings";
import {
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Store,
  CreditCard,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings>(
    defaultWebsiteSettings
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [siteData, websiteData] = await Promise.all([
        getSiteSettings(),
        getWebsiteSettings(),
      ]);
      setSettings(siteData);
      setWebsiteSettings(websiteData);
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      setMessage(null);

      const [siteResult, websiteResult] = await Promise.all([
        updateSiteSettings(settings),
        updateWebsiteSettings(websiteSettings),
      ]);

      if (siteResult.success && websiteResult.success) {
        if (websiteResult.data) {
          setWebsiteSettings({
            ...defaultWebsiteSettings,
            ...websiteResult.data,
          });
        }
        setMessage({
          type: "success",
          text: "Settings saved successfully!",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text:
            siteResult.error ||
            websiteResult.error ||
            "Failed to save settings",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setSettings(getDefaultSettings());
    setWebsiteSettings(defaultWebsiteSettings);
    setMessage({
      type: "success",
      text: "Settings reset to defaults. Click Save to apply.",
    });
    setShowResetConfirm(false);
  };

  const updateSetting = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const updateWebsiteSetting = <K extends keyof WebsiteSettings>(
    key: K,
    value: WebsiteSettings[K]
  ) => {
    setWebsiteSettings({ ...websiteSettings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminHeader
          title="Settings"
          subtitle="Manage store, checkout, payment, and website behavior"
        />
        {/* Screen Reader Loading Announcement */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        >
          Loading settings, please wait...
        </div>
        <main role="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-yellow-100"></div>
            <p className="mt-4 text-sm font-medium text-zinc-600">
              Loading settings...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen">
        <AdminHeader
          title="Settings"
          subtitle="Manage store, checkout, payment, and website behavior"
        />
        {/* Screen Reader Error Announcement */}
        <div 
          role="alert" 
          aria-live="assertive" 
          aria-atomic="true"
          className="sr-only"
        >
          Failed to load settings
        </div>
        <main role="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[28px] border border-red-200 bg-red-50 p-12 text-center shadow-sm">
            <AlertCircle className="mx-auto h-12 w-12 text-red-600" />
            <p className="mt-4 text-sm font-medium text-red-700">
              Failed to load settings
            </p>
            <button
              onClick={loadSettings}
              className="mt-4 rounded-xl bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <AdminHeader
        title="Website Settings"
        subtitle="Manage store, checkout, payment, and website behavior"
      />

      {/* Screen Reader Settings Loaded Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        Settings loaded successfully
      </div>

      <main role="main" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Success/Error Message */}
        {message && (
          <div
            role="alert"
            className={`mb-6 flex items-center gap-3 rounded-[22px] border px-5 py-4 ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <p className="text-sm font-semibold">{message.text}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Store Information */}
          <div className="rounded-[28px] border border-yellow-200/70 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Store className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-black">
                  Store Information
                </h2>
                <p className="text-sm text-zinc-600">
                  Basic store details and contact information
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Store Name
                </label>
                <input
                  id="setting-store-name"
                  name="store_name"
                  type="text"
                  value={settings.store_name}
                  onChange={(e) =>
                    updateSetting("store_name", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="GOSH PERFUME"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Store Tagline
                </label>
                <input
                  id="setting-store-tagline"
                  name="store_tagline"
                  type="text"
                  value={settings.store_tagline || ""}
                  onChange={(e) =>
                    updateSetting("store_tagline", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Luxury Perfume"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Email
                </label>
                <input
                  id="setting-store-email"
                  name="store_email"
                  type="email"
                  value={settings.store_email || ""}
                  onChange={(e) =>
                    updateSetting("store_email", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="contact@goshperfume.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Phone
                </label>
                <input
                  id="setting-store-phone"
                  name="store_phone"
                  type="tel"
                  value={settings.store_phone || ""}
                  onChange={(e) =>
                    updateSetting("store_phone", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="+95 9 123 456 789"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Address
                </label>
                <input
                  id="setting-store-address"
                  name="store_address"
                  type="text"
                  value={settings.store_address || ""}
                  onChange={(e) =>
                    updateSetting("store_address", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="123 Main Street"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  City
                </label>
                <input
                  id="setting-city"
                  name="city"
                  type="text"
                  value={settings.city || ""}
                  onChange={(e) => updateSetting("city", e.target.value)}
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Yangon"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Country
                </label>
                <input
                  id="setting-country"
                  name="country"
                  type="text"
                  value={settings.country}
                  onChange={(e) => updateSetting("country", e.target.value)}
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Myanmar"
                />
              </div>
            </div>
          </div>

          {/* Website Information */}
          <div className="rounded-[28px] border border-yellow-200/70 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Store className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-black">
                  Website Information
                </h2>
                <p className="text-sm text-zinc-600">
                  Public website text, contact details, social links, and notes
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Website Name
                </label>
                <input
                  id="website-name"
                  name="website_name"
                  type="text"
                  value={websiteSettings.website_name || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("website_name", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="GOSH PERFUME"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Website Tagline
                </label>
                <input
                  id="website-tagline"
                  name="tagline"
                  type="text"
                  value={websiteSettings.tagline || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("tagline", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Luxury fragrance collection"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Short Description
                </label>
                <textarea
                  id="website-description"
                  name="description"
                  value={websiteSettings.description || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("description", e.target.value)
                  }
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Premium perfumes and accessories."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Business Address
                </label>
                <input
                  id="website-address"
                  name="address"
                  type="text"
                  value={websiteSettings.address || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("address", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Business address"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Phone Number
                </label>
                <input
                  id="website-phone"
                  name="phone"
                  type="tel"
                  value={websiteSettings.phone || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("phone", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="09777460056"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Email Address
                </label>
                <input
                  id="website-email"
                  name="email"
                  type="email"
                  value={websiteSettings.email || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("email", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="hello@goshperfume.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Opening Hours
                </label>
                <input
                  id="website-opening-hours"
                  name="opening_hours"
                  type="text"
                  value={websiteSettings.opening_hours || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("opening_hours", e.target.value)
                  }
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Mon - Sat: 9:00 AM - 7:00 PM"
                />
              </div>

              {[
                ["facebook_url", "Facebook Link", "https://facebook.com/..."],
                ["instagram_url", "Instagram Link", "https://instagram.com/..."],
                ["tiktok_url", "TikTok Link", "https://tiktok.com/@..."],
                ["viber_phone", "Viber Phone", "09777460056"],
                ["whatsapp_phone", "WhatsApp Phone", "09777460056"],
              ].map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    {label}
                  </label>
                  <input
                    id={`website-${key}`}
                    name={key}
                    type="text"
                    value={
                      (websiteSettings[
                        key as keyof WebsiteSettings
                      ] as string | null) || ""
                    }
                    onChange={(e) =>
                      updateWebsiteSetting(
                        key as keyof WebsiteSettings,
                        e.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder={placeholder}
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Delivery Note
                </label>
                <textarea
                  id="website-delivery-note"
                  name="delivery_note"
                  value={websiteSettings.delivery_note || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("delivery_note", e.target.value)
                  }
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Delivery note shown during checkout"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  Footer Description
                </label>
                <textarea
                  id="website-footer-text"
                  name="footer_text"
                  value={websiteSettings.footer_text || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("footer_text", e.target.value)
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Premium perfumes crafted for everyday elegance."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-neutral-800">
                  About Short Text
                </label>
                <textarea
                  id="website-about-text"
                  name="about_text"
                  value={websiteSettings.about_text || ""}
                  onChange={(e) =>
                    updateWebsiteSetting("about_text", e.target.value)
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Short story text for About page"
                />
              </div>
            </div>
          </div>

          {/* Checkout & Delivery */}
          <div className="rounded-[28px] border border-yellow-200/70 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <CreditCard className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-black">
                  Checkout & Delivery
                </h2>
                <p className="text-sm text-zinc-600">
                  Configure checkout and delivery options
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                <div>
                  <p className="font-bold text-black">Enable Checkout</p>
                  <p className="text-sm text-zinc-600">
                    Allow customers to place orders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSetting(
                      "enable_checkout",
                      !settings.enable_checkout
                    )
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    settings.enable_checkout ? "bg-yellow-400" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      settings.enable_checkout
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Delivery Fee (MMK)
                  </label>
                  <input
                    id="setting-delivery-fee"
                    name="delivery_fee"
                    type="number"
                    min="0"
                    value={settings.delivery_fee}
                    onChange={(e) =>
                      updateSetting("delivery_fee", Number(e.target.value))
                    }
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Minimum Order (MMK)
                  </label>
                  <input
                    id="setting-minimum-order-amount"
                    name="minimum_order_amount"
                    type="number"
                    min="0"
                    value={settings.minimum_order_amount}
                    onChange={(e) =>
                      updateSetting(
                        "minimum_order_amount",
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4">
                <div>
                  <p className="font-bold text-black">Free Delivery</p>
                  <p className="text-sm text-zinc-600">
                    Waive delivery fee for all orders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSetting(
                      "free_delivery_enabled",
                      !settings.free_delivery_enabled
                    )
                  }
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    settings.free_delivery_enabled
                      ? "bg-yellow-400"
                      : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      settings.free_delivery_enabled
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-neutral-800">
                  Payment Methods
                </p>

                {[
                  {
                    key: "allow_cash_on_delivery" as const,
                    label: "Cash on Delivery",
                  },
                  { key: "allow_kbzpay" as const, label: "KBZPay" },
                  { key: "allow_wavepay" as const, label: "WavePay" },
                  { key: "allow_ayapay" as const, label: "AYAPay" },
                  {
                    key: "allow_bank_transfer" as const,
                    label: "Bank Transfer",
                  },
                ].map((method) => (
                  <div
                    key={method.key}
                    className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-3"
                  >
                    <p className="text-sm font-semibold text-black">
                      {method.label}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        updateSetting(method.key, !settings[method.key])
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        settings[method.key] ? "bg-yellow-400" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                          settings[method.key]
                            ? "translate-x-6"
                            : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Accounts - Continued in next message due to length */}
        </div>

        {/* Sticky Save/Reset Buttons */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>

        {showResetConfirm && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[24px] border border-yellow-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.28),0_0_45px_rgba(234,179,8,0.18)]">
              <div className="border-b border-yellow-100 px-6 py-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                  Reset Settings
                </p>
                <h2 className="mt-1 text-xl font-black text-black">
                  Restore defaults?
                </h2>
                <p className="mt-2 text-sm font-medium text-zinc-600">
                  This will replace the form values with default store settings. You still need to click Save Settings to apply them.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmReset}
                  className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.30)] transition hover:bg-yellow-300"
                >
                  Reset Defaults
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
