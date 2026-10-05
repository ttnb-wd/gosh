"use client";
import devLog from "@/lib/dev-log";
import StudioRowActions from "@/components/ui/StudioRowActions";
import { notify, confirmAction } from "@/components/ui/StudioFeedback";
// Updated form controls styling - v2
import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Tag, Sparkles, Image as ImageIcon, ExternalLink, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudioSelect from "@/components/ui/StudioSelect";
import DateTimePicker from "@/components/admin/DateTimePicker";
import type { Promotion } from "@/lib/types/promotions";
import type { Product } from "@/lib/types/products";
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
    return <StudioSelect value={value} onChange={onChange} options={options} label={label + (required ? " *" : "")} placeholder="Select…" />;
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
        color: "text-muted bg-surface-muted  ",
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
        color: "text-info bg-info-soft  ",
        state: "upcoming",
        targetTimestamp: startDate.getTime(),
      };
    }

    if (now > endDate) {
      return {
        label: "EXPIRED",
        color: "text-destructive bg-destructive-soft  ",
        state: "expired",
        targetTimestamp: null,
      };
    }

    return {
      label: "ACTIVE",
      color: "text-success bg-success-soft  ",
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
      <div className="mt-2 space-y-1 text-xs text-muted ">
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
        <div className="text-muted ">
          <span className="font-bold">Starts:</span> {formatDateTime(startDate)}
        </div>
        {timeRemaining.total > 0 && (
          <div className="flex items-center gap-1.5 rounded bg-info-soft px-2 py-1 ">
            <Clock className="h-3 w-3 text-info " />
            <span className="font-bold text-info ">Starts in:</span>
            <span className="font-mono font-bold text-info ">
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
      <div className="text-muted ">
        <span className="font-bold">Ends:</span> {formatDateTime(endDate)}
      </div>
      {timeRemaining.total > 0 && (
        <div className="flex items-center gap-1.5 rounded bg-success-soft px-2 py-1 ">
          <Clock className="h-3 w-3 text-success " />
          <span className="font-bold text-success ">Remaining:</span>
          <span className="font-mono font-bold text-success ">
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
        devLog.error("Application operation failed.");
        return;
      }

      const result = await response.json();

      if (result.success) {
        setPromotions(result.promotions || []);
      }
    } catch  {
      devLog.error("Application operation failed.");
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
          price: Number(data.price || 0),
          description: data.description || "",
          images: data.images || (data.image ? [data.image] : []),
          imageFileIds: data.imageFileIds || (data.imageFileId ? [data.imageFileId] : []),
          stock: Number(data.stock || 0),
          category: typeof data.category === "string" ? data.category.trim().toLowerCase() : "",
          is_active: data.is_active !== false,
          is_featured: data.is_featured || false,
          decant_sizes: Array.isArray(data.decant_sizes) ? data.decant_sizes : (Array.isArray(data.decants) ? data.decants : []),
          notes: data.notes && typeof data.notes === "object" ? data.notes : null,
          volume: data.volume || null,
          concentration: data.concentration || null,
          discount: data.discount || null,
          created_at: data.created_at || "",
          updated_at: data.updated_at || "",
        } as Product;
      });

      setProducts(loadedProducts);
    } catch  {
      devLog.error("Application operation failed.");
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "/gosh/promotions");
      const uploadResponse = await fetch("/api/upload/imagekit", { method: "POST", credentials: "include", body: formData });
      if (!uploadResponse.ok) throw new Error("Upload failed.");

      const uploadData = await uploadResponse.json();

      if (uploadData.url && uploadData.fileId) {
        setFormData((prev) => ({
          ...prev,
          image: uploadData.url,
          imageFileId: uploadData.fileId,
        }));
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to upload this image. Please try again.", "error");
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

        devLog.error("Application operation failed.");
        notify("Unable to save your changes. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
        resetForm();
      } else {
        notify("Unable to save your changes. Please try again.", "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to save your changes. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmAction("Are you sure you want to delete this promotion?"))) {
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

        devLog.error("Application operation failed.");
        notify("Unable to delete this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        notify("Unable to delete this item. Please try again.", "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to delete this item. Please try again.", "error");
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

        devLog.error("Application operation failed.");
        notify("Unable to update this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        notify("Unable to update this item. Please try again.", "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to update this item. Please try again.", "error");
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
        color: "text-muted bg-surface-muted  ",
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
        color: "text-info bg-info-soft  ",
        state: "upcoming",
      };
    }

    if (now > endDate) {
      return {
        label: "EXPIRED",
        color: "text-destructive bg-destructive-soft  ",
        state: "expired",
      };
    }

    return {
      label: "ACTIVE",
      color: "text-success bg-success-soft  ",
      state: "active",
    };
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink ">Promotions & Announcements</h2>
          <p className="mt-1 text-sm text-muted ">Manage homepage promotional banners</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-full border border-line bg-brand px-4 py-2.5 text-sm font-bold text-on-brand shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft"
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
            className="overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-soft  "
          >
            <h3 className="mb-4 text-lg font-semibold text-ink ">
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
                <label htmlFor="studio-components-admin-PromotionManager-1" className="mb-2 block text-sm font-bold text-ink ">
                  Title <span className="text-destructive">*</span>
                </label>
                <input id="studio-components-admin-PromotionManager-1"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  placeholder="e.g., Summer Sale - 20% Off"
                  required
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="studio-components-admin-PromotionManager-2" className="mb-2 block text-sm font-bold text-ink ">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea id="studio-components-admin-PromotionManager-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  rows={3}
                  placeholder="Describe your promotion or announcement"
                  required
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label htmlFor="studio-components-admin-PromotionManager-3" className="mb-2 block text-sm font-bold text-ink ">
                  Promotional Image
                  {formData.type === "new_product" && " (Optional - uses product image if not provided)"}
                </label>
                <div className="flex items-center gap-4">
                  <input id="studio-components-admin-PromotionManager-3"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                    className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-line border-t-transparent" />
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
                <label htmlFor="studio-components-admin-PromotionManager-4" className="mb-2 block text-sm font-bold text-ink ">
                  CTA Text <span className="text-destructive">*</span>
                </label>
                <input id="studio-components-admin-PromotionManager-4"
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  placeholder="e.g., Shop Now"
                  required
                />
              </div>

              {/* CTA URL */}
              <div>
                <label htmlFor="studio-components-admin-PromotionManager-5" className="mb-2 block text-sm font-bold text-ink ">
                  CTA URL <span className="text-destructive">*</span>
                </label>
                <input id="studio-components-admin-PromotionManager-5"
                  type="text"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  placeholder="e.g., /products?collection=Summer"
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <DateTimePicker
                  selected={formData.start_at ? new Date(formData.start_at) : null}
                  onChange={(date) => {
                    if (date) {
                      setFormData({ ...formData, start_at: formatDateForInput(date) });
                    }
                  }}
                  label="Start Date & Time"
                  required
                  minDate={new Date()}
                  placeholderText="Select start date and time"
                />
              </div>

              {/* End Date */}
              <div>
                <DateTimePicker
                  selected={formData.end_at ? new Date(formData.end_at) : null}
                  onChange={(date) => {
                    if (date) {
                      setFormData({ ...formData, end_at: formatDateForInput(date) });
                    }
                  }}
                  label="End Date & Time"
                  required
                  minDate={formData.start_at ? new Date(formData.start_at) : new Date()}
                  placeholderText="Select end date and time"
                  showValidationError={
                    !!(formData.start_at && formData.end_at && new Date(formData.end_at) <= new Date(formData.start_at))
                  }
                  validationMessage="End date must be after start date"
                />
              </div>

              {/* Is Active */}
              <div className="md:col-span-2">
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-line text-accent focus:ring-focus  "
                  />
                  <span className="text-sm font-bold text-ink ">Active</span>
                </label>
                <p className="ml-7 mt-1 text-xs text-muted ">
                  Inactive promotions won&apos;t be visible to customers, even if within the date range
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="flex-1 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-brand transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-surface-muted    "
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
          <div className="rounded-xl border border-line bg-surface p-12 text-center  ">
            <Tag className="mx-auto h-12 w-12 text-accent/30" />
            <p className="mt-4 text-sm font-bold text-muted ">No promotions yet</p>
            <p className="mt-1 text-xs text-muted ">Create your first promotion to get started</p>
          </div>
        ) : (
          promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);
            return (
              <motion.div
                key={promotion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-line bg-surface p-6 shadow-soft  "
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted ">
                    {(promotion.image || (promotion.type === "new_product" && promotion.product?.images && promotion.product.images.length > 0)) ? (
                      <img
                        src={promotion.type === "new_product" && promotion.product?.images && promotion.product.images.length > 0
                          ? promotion.product.images[0]
                          : promotion.image || ""}
                        alt={promotion.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-faint " />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-ink ">{promotion.title}</h3>
                          {promotion.type === "new_product" ? (
                            <span className="flex items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-xs font-bold text-info  ">
                              <Sparkles className="h-3 w-3" />
                              New Product
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent  ">
                              <Tag className="h-3 w-3" />
                              Promotion
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted ">{promotion.description}</p>

                        {promotion.type === "new_product" && promotion.product && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted ">
                            <span className="font-bold">Product:</span>
                            <span>{promotion.product.name} - {promotion.product.brand}</span>
                          </div>
                        )}

                        {/* Countdown Display */}
                        <AdminPromotionCountdown promotion={promotion} />

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted ">
                          <a
                            href={promotion.cta_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {promotion.cta_text}
                          </a>
                        </div>
                      </div>

                      {/* Actions */}
                      <StudioRowActions>
<button aria-label={promotion.is_active ? "Deactivate" : "Activate"}
                          type="button"
                          onClick={() => handleToggle(promotion.id)}
                          className={`rounded-lg p-2 transition-colors ${
                            promotion.is_active
                              ? "bg-success-soft text-success hover:bg-success-soft   "
                              : "bg-surface-muted text-muted hover:bg-surface-muted   "
                          }`}
                          data-studio-tooltip={promotion.is_active ? "Deactivate" : "Activate"}
                        >
                          {promotion.is_active ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        <span className="text-xs">{promotion.is_active ? "Deactivate" : "Activate"}</span></button>

<button aria-label="Edit"
                          type="button"
                          onClick={() => handleEdit(promotion)}
                          className="rounded-lg bg-info-soft p-2 text-info transition-colors hover:bg-info-soft   "
                          data-studio-tooltip="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        <span className="text-xs">Edit</span></button>

<button aria-label="Delete"
                          type="button"
                          onClick={() => handleDelete(promotion.id)}
                          className="rounded-lg bg-destructive-soft p-2 text-destructive transition-colors hover:bg-destructive-soft   "
                          data-studio-tooltip="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        <span className="text-xs">Delete</span></button>
</StudioRowActions>
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
