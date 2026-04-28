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
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Store,
  CreditCard,
  Megaphone,
  Share2,
  Settings as SettingsIcon,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSiteSettings();
      setSettings(data);
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

      const result = await updateSiteSettings(settings);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Settings saved successfully!",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to save settings",
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
    if (
      confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      setSettings(getDefaultSettings());
      setMessage({
        type: "success",
        text: "Settings reset to defaults. Click Save to apply.",
      });
    }
  };

  const updateSetting = <K extends keyof SiteSettings>(
    key: K,
    value: SiteSettings[K]
  ) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminHeader
          title="Settings"
          subtitle="Manage store, checkout, payment, and website behavior"
        />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Success/Error Message */}
        {message && (
          <div
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
                  type="text"
                  value={settings.country}
                  onChange={(e) => updateSetting("country", e.target.value)}
                  className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                  placeholder="Myanmar"
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
      </main>
    </div>
  );
}
