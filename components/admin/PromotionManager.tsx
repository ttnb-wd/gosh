"use client";
// Updated form controls styling - v2
import { useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Tag, Sparkles, Image as ImageIcon, ExternalLink, Clock, ChevronDown, Calendar, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Promotion } from "@/lib/firebase/promotions-server";
import type { Product } from "@/lib/firebase/products-server";
import { Timestamp } from "firebase/firestore";
import { useCountdown, formatCountdown } from "@/hooks/useCountdown";

interface EnrichedPromotion extends Promotion {
  product?: Product | null;
}

interface PromotionFormData {
  type: "promotion" | "new_product";
  title: string;
  description: string;
  image: string;
  imageFileId: string;
  cta_text: string;
  cta_url: string;
  product_id: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
}

// Custom Dropdown Component
interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  required?: boolean;
}

function CustomDropdown({ value, onChange, options, label, required }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={dropdownRef} className="relative">
      <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-left text-sm font-medium text-[#1f1a14] transition-colors hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:border-[#d4af37]/40"
      >
        <span>{selectedOption?.label || "Select..."}</span>
        <ChevronDown className={`h-4 w-4 text-[#d4af37] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-[#d4af37]/30 bg-white shadow-lg dark:border-[#d4af37]/20 dark:bg-[#1f1a14]"
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[#fffaf0] dark:hover:bg-[#2a2419] ${
                  value === option.value
                    ? "bg-[#fffaf0] text-[#d4af37] dark:bg-[#2a2419]"
                    : "text-[#1f1a14] dark:text-[#fff8e7]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Admin Countdown Component - declared outside to avoid React hooks/static-components rule
function AdminPromotionCountdown({ promotion }: { promotion: Promotion }) {
  const getPromotionStatus = (promo: Promotion): { 
    label: string; 
    color: string; 
    state: "upcoming" | "active" | "expired" | "inactive";
    targetTimestamp: number | null;
  } => {
    if (!promo.is_active) {
      return { 
        label: "Inactive", 
        color: "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800", 
        state: "inactive",
        targetTimestamp: null,
      };
    }

    const now = new Date();
    // Handle both Timestamp objects (if any remain) and ISO strings from API
    const startDate = promo.start_at instanceof Timestamp 
      ? promo.start_at.toDate() 
      : new Date(promo.start_at as unknown as string);
    const endDate = promo.end_at instanceof Timestamp 
      ? promo.end_at.toDate() 
      : new Date(promo.end_at as unknown as string);

    if (now < startDate) {
      return { 
        label: "UPCOMING", 
        color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30", 
        state: "upcoming",
        targetTimestamp: startDate.getTime(),
      };
    }

    if (now > endDate) {
      return { 
        label: "EXPIRED", 
        color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30", 
        state: "expired",
        targetTimestamp: null,
      };
    }

    return { 
      label: "ACTIVE", 
      color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30", 
      state: "active",
      targetTimestamp: endDate.getTime(),
    };
  };

  const formatDateTime = (date: Date): string => {
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) + " · " + date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const status = getPromotionStatus(promotion);
  // Use timestamp (number) instead of Date object to prevent infinite re-renders
  const timeRemaining = useCountdown(status.targetTimestamp);

  if (status.state === "inactive") {
    return null;
  }

  if (status.state === "expired") {
    // Handle both Timestamp objects and ISO strings
    const endDate = promotion.end_at instanceof Timestamp 
      ? promotion.end_at.toDate() 
      : new Date(promotion.end_at as unknown as string);
    
    return (
      <div className="mt-2 space-y-1 text-xs text-[#7a6a55] dark:text-[#b8a892]">
        <div>
          <span className="font-bold">Ended:</span> {formatDateTime(endDate)}
        </div>
      </div>
    );
  }

  if (status.state === "upcoming") {
    // Handle both Timestamp objects and ISO strings
    const startDate = promotion.start_at instanceof Timestamp 
      ? promotion.start_at.toDate() 
      : new Date(promotion.start_at as unknown as string);
    
    return (
      <div className="mt-2 space-y-1 text-xs">
        <div className="text-[#7a6a55] dark:text-[#b8a892]">
          <span className="font-bold">Starts:</span> {formatDateTime(startDate)}
        </div>
        {timeRemaining.total > 0 && (
          <div className="flex items-center gap-1.5 rounded bg-blue-50 px-2 py-1 dark:bg-blue-900/20">
            <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-blue-600 dark:text-blue-400">Starts in:</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              {formatCountdown(timeRemaining)}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Active
  // Handle both Timestamp objects and ISO strings
  const endDate = promotion.end_at instanceof Timestamp 
    ? promotion.end_at.toDate() 
    : new Date(promotion.end_at as unknown as string);
  
  return (
    <div className="mt-2 space-y-1 text-xs">
      <div className="text-[#7a6a55] dark:text-[#b8a892]">
        <span className="font-bold">Ends:</span> {formatDateTime(endDate)}
      </div>
      {timeRemaining.total > 0 && (
        <div className="flex items-center gap-1.5 rounded bg-green-50 px-2 py-1 dark:bg-green-900/20">
          <Clock className="h-3 w-3 text-green-600 dark:text-green-400" />
          <span className="font-bold text-green-600 dark:text-green-400">Remaining:</span>
          <span className="font-mono font-bold text-green-600 dark:text-green-400">
            {formatCountdown(timeRemaining)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function PromotionManager() {
  const [promotions, setPromotions] = useState<EnrichedPromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<PromotionFormData>({
    type: "promotion",
    title: "",
    description: "",
    image: "",
    imageFileId: "",
    cta_text: "Shop Now",
    cta_url: "/products",
    product_id: "",
    is_active: false,
    start_at: "",
    end_at: "",
  });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  async function fetchPromotions() {
    try {
      const response = await fetch("/api/admin/promotions/action", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("Failed to fetch promotions:", response.status, response.statusText);
        return;
      }

      const result = await response.json();

      if (result.success) {
        setPromotions(result.promotions || []);
      }
    } catch (error) {
      console.error("Failed to fetch promotions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const { collection, getDocs, query, orderBy } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/config");

      const productsQuery = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(productsQuery);

      const loadedProducts = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || "",
          brand: typeof data.brand === "string" ? data.brand : "",
          brand_id: data.brand_id || null,
          price: Number(data.price || 0),
          description: data.description || "",
          image: data.image || data.image_url || "",
          imageFileId: data.imageFileId || data.image_file_id || null,
          badge: data.badge || null,
          scent_collection: data.scent_collection || null,
          stock: Number(data.stock || 0),
          category: typeof data.category === "string" ? data.category.trim().toLowerCase() : "",
          is_active: data.is_active !== false,
          decants: Array.isArray(data.decants) ? data.decants : [],
          notes: data.notes && typeof data.notes === "object" ? data.notes : null,
        } as Product;
      });

      setProducts(loadedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);

    try {
      // Get ImageKit auth
      const authResponse = await fetch("/api/imagekit/auth");
      const authData = await authResponse.json();

      // Upload to ImageKit
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", file.name);
      formData.append("publicKey", authData.publicKey);
      formData.append("signature", authData.signature);
      formData.append("expire", authData.expire);
      formData.append("token", authData.token);
      formData.append("folder", "/promotions");

      const uploadResponse = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.url && uploadData.fileId) {
        setFormData((prev) => ({
          ...prev,
          image: uploadData.url,
          imageFileId: uploadData.fileId,
        }));
      }
    } catch (error) {
      console.error("Image upload error:", error);
      alert("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const action = editingId ? "update" : "create";
      const payload: Record<string, unknown> = {
        action,
        data: {
          ...formData,
          product_id: formData.type === "new_product" ? formData.product_id : null,
        },
      };

      if (editingId) {
        payload.promotionId = editingId;
      }

      const response = await fetch("/api/admin/promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Submit failed:", response.status, errorText);
        alert(`Failed to save promotion: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
        resetForm();
      } else {
        alert(result.error || "Failed to save promotion");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("Failed to save promotion");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this promotion?")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete",
          promotionId: id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete failed:", response.status, errorText);
        alert(`Failed to delete promotion: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        alert(result.error || "Failed to delete promotion");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete promotion");
    }
  }

  async function handleToggle(id: string) {
    try {
      const response = await fetch("/api/admin/promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "toggle",
          promotionId: id,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Toggle failed:", response.status, errorText);
        alert(`Failed to toggle promotion: ${response.statusText}`);
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        alert(result.error || "Failed to toggle promotion");
      }
    } catch (error) {
      console.error("Toggle error:", error);
      alert("Failed to toggle promotion");
    }
  }

  function handleEdit(promotion: Promotion) {
    setEditingId(promotion.id);
    
    // Convert Firestore Timestamps to datetime-local format
    let startAt = "";
    let endAt = "";

    if (promotion.start_at) {
      const startDate = promotion.start_at instanceof Timestamp 
        ? promotion.start_at.toDate() 
        : new Date(promotion.start_at as unknown as string);
      startAt = formatDateForInput(startDate);
    }

    if (promotion.end_at) {
      const endDate = promotion.end_at instanceof Timestamp 
        ? promotion.end_at.toDate() 
        : new Date(promotion.end_at as unknown as string);
      endAt = formatDateForInput(endDate);
    }

    setFormData({
      type: promotion.type,
      title: promotion.title,
      description: promotion.description,
      image: promotion.image || "",
      imageFileId: promotion.imageFileId || "",
      cta_text: promotion.cta_text,
      cta_url: promotion.cta_url,
      product_id: promotion.product_id || "",
      is_active: promotion.is_active,
      start_at: startAt,
      end_at: endAt,
    });

    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      type: "promotion",
      title: "",
      description: "",
      image: "",
      imageFileId: "",
      cta_text: "Shop Now",
      cta_url: "/products",
      product_id: "",
      is_active: false,
      start_at: "",
      end_at: "",
    });
    setShowForm(false);
  }

  function formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function getPromotionStatus(promotion: Promotion): { 
    label: string; 
    color: string; 
    state: "upcoming" | "active" | "expired" | "inactive";
  } {
    if (!promotion.is_active) {
      return { 
        label: "Inactive", 
        color: "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800", 
        state: "inactive",
      };
    }

    const now = new Date();
    const startDate = promotion.start_at instanceof Timestamp 
      ? promotion.start_at.toDate() 
      : new Date(promotion.start_at as unknown as string);
    const endDate = promotion.end_at instanceof Timestamp 
      ? promotion.end_at.toDate() 
      : new Date(promotion.end_at as unknown as string);

    if (now < startDate) {
      return { 
        label: "UPCOMING", 
        color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30", 
        state: "upcoming",
      };
    }

    if (now > endDate) {
      return { 
        label: "EXPIRED", 
        color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30", 
        state: "expired",
      };
    }

    return { 
      label: "ACTIVE", 
      color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30", 
      state: "active",
    };
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d4af37] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#1f1a14] dark:text-[#fff8e7]">Promotions & Announcements</h2>
          <p className="mt-1 text-sm text-[#7a6a55] dark:text-[#b8a892]">Manage homepage promotional banners</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-full border border-[#d4af37]/50 bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-4 py-2.5 text-sm font-bold text-[#1f1a14] shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Create Promotion
        </button>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-2xl border border-[#d4af37]/20 bg-white p-6 shadow-sm dark:border-[#d4af37]/10 dark:bg-[#2a2419]"
          >
            <h3 className="mb-4 text-lg font-black text-[#1f1a14] dark:text-[#fff8e7]">
              {editingId ? "Edit Promotion" : "Create New Promotion"}
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Type */}
              <div>
                <CustomDropdown
                  label="Type"
                  value={formData.type}
                  onChange={(value) => setFormData({ ...formData, type: value as "promotion" | "new_product" })}
                  options={[
                    { value: "promotion", label: "Promotion" },
                    { value: "new_product", label: "New Product Announcement" },
                  ]}
                  required
                />
              </div>

              {/* Product Selection */}
              {formData.type === "new_product" && (
                <div>
                  <CustomDropdown
                    label="Select Product"
                    value={formData.product_id}
                    onChange={(value) => setFormData({ ...formData, product_id: value })}
                    options={[
                      { value: "", label: "None (Use custom image)" },
                      ...products.map((product) => ({
                        value: product.id,
                        label: `${product.name} - ${product.brand}`,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Title */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] focus:border-[#d4af37] focus:outline-none dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:focus:border-[#d4af37]"
                  placeholder="e.g., Summer Sale - 20% Off"
                  required
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] focus:border-[#d4af37] focus:outline-none dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:focus:border-[#d4af37]"
                  rows={3}
                  placeholder="Describe your promotion or announcement"
                  required
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  Promotional Image
                  {formData.type === "new_product" && " (Optional - uses product image if not provided)"}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                    className="flex-1 rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] focus:border-[#d4af37] focus:outline-none dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:focus:border-[#d4af37]"
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#d4af37] border-t-transparent" />
                  )}
                </div>
                {formData.image && (
                  <div className="mt-2">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="h-32 w-auto rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              {/* CTA Text */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  CTA Text <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] focus:border-[#d4af37] focus:outline-none dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:focus:border-[#d4af37]"
                  placeholder="e.g., Shop Now"
                  required
                />
              </div>

              {/* CTA URL */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  CTA URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] focus:border-[#d4af37] focus:outline-none dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:focus:border-[#d4af37]"
                  placeholder="e.g., /products?collection=Summer"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={formData.start_at ? new Date(formData.start_at) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFormData({ ...formData, start_at: formatDateForInput(date) });
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] transition-colors hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:border-[#d4af37]/40 dark:focus:border-[#d4af37]"
                  wrapperClassName="w-full"
                  calendarClassName="custom-datepicker"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  End Date & Time <span className="text-red-500">*</span>
                </label>
                <DatePicker
                  selected={formData.end_at ? new Date(formData.end_at) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setFormData({ ...formData, end_at: formatDateForInput(date) });
                    }
                  }}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full rounded-lg border border-[#d4af37]/30 bg-white px-4 py-2.5 text-sm font-medium text-[#1f1a14] transition-colors hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:border-[#d4af37]/40 dark:focus:border-[#d4af37]"
                  wrapperClassName="w-full"
                  calendarClassName="custom-datepicker"
                  required
                />
              </div>

              {/* Is Active */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-[#d4af37]/30 text-[#d4af37] focus:ring-[#d4af37] dark:border-[#d4af37]/20 dark:bg-[#1f1a14]"
                  />
                  <span className="text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">Active</span>
                </label>
                <p className="ml-7 mt-1 text-xs text-[#7a6a55] dark:text-[#b8a892]">
                  Inactive promotions won&apos;t be visible to customers, even if within the date range
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="flex-1 rounded-full bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-6 py-3 text-sm font-bold text-[#1f1a14] transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-[#d4af37]/30 bg-white px-6 py-3 text-sm font-bold text-[#1f1a14] transition-all hover:bg-gray-50 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:bg-[#2a2419]"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Promotions List */}
      <div className="space-y-4">
        {promotions.length === 0 ? (
          <div className="rounded-2xl border border-[#d4af37]/20 bg-white p-12 text-center dark:border-[#d4af37]/10 dark:bg-[#2a2419]">
            <Tag className="mx-auto h-12 w-12 text-[#d4af37]/30" />
            <p className="mt-4 text-sm font-bold text-[#7a6a55] dark:text-[#b8a892]">No promotions yet</p>
            <p className="mt-1 text-xs text-[#7a6a55] dark:text-[#b8a892]">Create your first promotion to get started</p>
          </div>
        ) : (
          promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);
            return (
              <motion.div
                key={promotion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#d4af37]/20 bg-white p-6 shadow-sm dark:border-[#d4af37]/10 dark:bg-[#2a2419]"
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {(promotion.image || (promotion.type === "new_product" && promotion.product?.image)) ? (
                      <img
                        src={promotion.type === "new_product" && promotion.product?.image 
                          ? promotion.product.image 
                          : promotion.image || ""}
                        alt={promotion.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-[#1f1a14] dark:text-[#fff8e7]">{promotion.title}</h3>
                          {promotion.type === "new_product" ? (
                            <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                              <Sparkles className="h-3 w-3" />
                              New Product
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Tag className="h-3 w-3" />
                              Promotion
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-[#7a6a55] dark:text-[#b8a892]">{promotion.description}</p>
                        
                        {promotion.type === "new_product" && promotion.product && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-[#7a6a55] dark:text-[#b8a892]">
                            <span className="font-bold">Product:</span>
                            <span>{promotion.product.name} - {promotion.product.brand}</span>
                          </div>
                        )}

                        {/* Countdown Display */}
                        <AdminPromotionCountdown promotion={promotion} />

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#7a6a55] dark:text-[#b8a892]">
                          <a
                            href={promotion.cta_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[#d4af37] hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {promotion.cta_text}
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggle(promotion.id)}
                          className={`rounded-lg p-2 transition-colors ${
                            promotion.is_active
                              ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700"
                          }`}
                          title={promotion.is_active ? "Deactivate" : "Activate"}
                        >
                          {promotion.is_active ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(promotion)}
                          className="rounded-lg bg-blue-100 p-2 text-blue-600 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(promotion.id)}
                          className="rounded-lg bg-red-100 p-2 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
