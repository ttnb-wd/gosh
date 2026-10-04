"use client";
import StudioRowActions from "@/components/ui/StudioRowActions";
import { notify, confirmAction } from "@/components/ui/StudioFeedback";

import { useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Tag, Package, Percent, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DateTimePicker from "@/components/admin/DateTimePicker";
import type { Product } from "@/lib/types/products";
import { Timestamp } from "firebase/firestore";

interface ProductPromotion {
  id: string;
  product_id: string;
  promotion_price: number;
  is_active: boolean;
  start_at: string | Timestamp;
  end_at: string | Timestamp;
  created_at?: string | Timestamp;
  updated_at?: string | Timestamp;
}

interface EnrichedProductPromotion extends ProductPromotion {
  product?: Product | null;
}

interface PromotionFormData {
  product_id: string;
  discount_percent: string;
  promotion_price: string;
  is_active: boolean;
  start_at: string;
  end_at: string;
}

const getSafeProductImage = (images?: string[] | string | null) => {
  // Handle both old single image and new images array
  const imageUrl = Array.isArray(images) ? images[0] : images;
  const value = imageUrl?.trim();
  if (!value) return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
  if (value.startsWith("/") || value.startsWith("blob:")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? value
      : "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
  } catch {
    return "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
  }
};

const formatPrice = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

export default function ProductPromotionManager() {
  const [promotions, setPromotions] = useState<EnrichedProductPromotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectorScrollPosition, setSelectorScrollPosition] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<PromotionFormData>({
    product_id: "",
    discount_percent: "",
    promotion_price: "",
    is_active: true,
    start_at: "",
    end_at: "",
  });

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, []);

  async function fetchPromotions() {
    try {
      const response = await fetch("/api/admin/product-promotions/action", {
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
      const { collection, getDocs, query, orderBy, where } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/config");

      const productsQuery = query(
        collection(db, "products"),
        where("is_active", "==", true),
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
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }

  function handleProductSelect(product: Product) {
    setSelectedProduct(product);
    setFormData(prev => ({
      ...prev,
      product_id: product.id,
      discount_percent: prev.discount_percent || "",
      promotion_price: prev.discount_percent 
        ? String(Math.round(product.price * (1 - parseFloat(prev.discount_percent) / 100)))
        : "",
    }));
    setShowProductSelector(false);
    setProductSearchQuery("");
  }

  function handleDiscountChange(percent: string) {
    const originalPrice = selectedProduct?.price || 0;
    const promotionPrice = originalPrice > 0 && percent 
      ? Math.round(originalPrice * (1 - parseFloat(percent) / 100))
      : "";
    
    setFormData(prev => ({
      ...prev,
      discount_percent: percent,
      promotion_price: String(promotionPrice),
    }));
  }

  function calculateDiscountFromPrices(originalPrice: number, promotionPrice: number): number {
    if (originalPrice <= 0) return 0;
    return Math.round(((originalPrice - promotionPrice) / originalPrice) * 100);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const action = editingId ? "update" : "create";
      const payload: Record<string, unknown> = {
        action,
        data: {
          product_id: formData.product_id,
          promotion_price: parseFloat(formData.promotion_price),
          is_active: formData.is_active,
          start_at: formData.start_at,
          end_at: formData.end_at,
        },
      };

      if (editingId) {
        payload.promotionId = editingId;
      }

      const response = await fetch("/api/admin/product-promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        await response.json();
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
    } catch (error) {
      console.error("Submit error:", error);
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
      const response = await fetch("/api/admin/product-promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete",
          promotionId: id,
        }),
      });

      if (!response.ok) {
        await response.json();
        notify("Unable to delete this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        notify("Unable to delete this item. Please try again.", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      notify("Unable to delete this item. Please try again.", "error");
    }
  }

  async function handleToggle(id: string) {
    try {
      const response = await fetch("/api/admin/product-promotions/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "toggle",
          promotionId: id,
        }),
      });

      if (!response.ok) {
        await response.json();
        notify("Unable to update this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchPromotions();
      } else {
        notify("Unable to update this item. Please try again.", "error");
      }
    } catch (error) {
      console.error("Toggle error:", error);
      notify("Unable to update this item. Please try again.", "error");
    }
  }

  function handleEdit(promotion: EnrichedProductPromotion) {
    setEditingId(promotion.id);
    
    let startAt = "";
    let endAt = "";

    if (promotion.start_at) {
      const startDate = promotion.start_at instanceof Timestamp 
        ? promotion.start_at.toDate() 
        : new Date(promotion.start_at as string);
      startAt = formatDateForInput(startDate);
    }

    if (promotion.end_at) {
      const endDate = promotion.end_at instanceof Timestamp 
        ? promotion.end_at.toDate() 
        : new Date(promotion.end_at as string);
      endAt = formatDateForInput(endDate);
    }

    const product = products.find(p => p.id === promotion.product_id);
    setSelectedProduct(product || null);

    const discountPercent = product 
      ? String(calculateDiscountFromPrices(product.price, promotion.promotion_price))
      : "";

    setFormData({
      product_id: promotion.product_id,
      discount_percent: discountPercent,
      promotion_price: String(promotion.promotion_price),
      is_active: promotion.is_active,
      start_at: startAt,
      end_at: endAt,
    });

    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setSelectedProduct(null);
    setProductSearchQuery("");
    setShowProductSelector(false);
    setFormData({
      product_id: "",
      discount_percent: "",
      promotion_price: "",
      is_active: true,
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

  function getPromotionStatus(promotion: EnrichedProductPromotion): { label: string; color: string } {
    if (!promotion.is_active) {
      return { label: "Inactive", color: "text-muted bg-surface-muted  " };
    }

    const now = new Date();
    const startDate = promotion.start_at instanceof Timestamp 
      ? promotion.start_at.toDate() 
      : new Date(promotion.start_at as string);
    const endDate = promotion.end_at instanceof Timestamp 
      ? promotion.end_at.toDate() 
      : new Date(promotion.end_at as string);

    if (now < startDate) {
      return { label: "Scheduled", color: "text-info bg-info-soft  " };
    }

    if (now > endDate) {
      return { label: "Expired", color: "text-destructive bg-destructive-soft  " };
    }

    return { label: "Active", color: "text-success bg-success-soft  " };
  }

  function scrollProducts(direction: 'left' | 'right') {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({ 
        left: direction === 'left' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
      </div>
    );
  }

  const filteredProducts = products.filter(p => {
    if (!productSearchQuery.trim()) return true;
    const search = productSearchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(search) ||
      p.brand?.toLowerCase().includes(search)
    );
  });

  const originalPrice = selectedProduct?.price || 0;
  const promotionPrice = parseFloat(formData.promotion_price) || 0;
  const savedAmount = originalPrice - promotionPrice;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-ink ">Product Promotions</h2>
          <p className="mt-1 text-sm text-muted ">Manage promotional pricing for products</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (showForm) {
              // Close the form
              resetForm();
            } else {
              // Open the form - reset data but keep form visible
              setEditingId(null);
              setSelectedProduct(null);
              setProductSearchQuery("");
              setShowProductSelector(false);
              setFormData({
                product_id: "",
                discount_percent: "",
                promotion_price: "",
                is_active: true,
                start_at: "",
                end_at: "",
              });
              setShowForm(true);
            }
          }}
          style={{ pointerEvents: 'auto' }}
          className="relative z-[9999] flex shrink-0 items-center gap-2 rounded-full border-2 border-line bg-brand px-5 py-3 text-sm font-bold text-on-brand shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft active:translate-y-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Promotion
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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink ">
                {editingId ? "Edit Promotion" : "Create New Promotion"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-bold text-muted hover:text-ink  "
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="mb-2 block text-sm font-bold text-ink ">
                  Select Product <span className="text-destructive">*</span>
                </label>
                
                {!selectedProduct ? (
                  <button
                    type="button"
                    onClick={() => setShowProductSelector(!showProductSelector)}
                    disabled={editingId !== null}
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold text-muted transition hover:border-line focus:border-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-50   "
                  >
                    Choose a product...
                  </button>
                ) : (
                  <div className="rounded-xl border-2 border-line bg-accent-soft p-4  ">
                    <div className="flex items-center gap-4">
                      <img 
                        src={getSafeProductImage(selectedProduct.images)} 
                        alt={selectedProduct.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase text-accent">Selected Product</p>
                        <p className="mt-1 font-semibold text-ink ">{selectedProduct.name}</p>
                        <p className="text-sm text-muted ">{selectedProduct.brand}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase text-muted ">Original Price</p>
                        <p className="text-xl font-semibold text-accent">{formatPrice(selectedProduct.price)}</p>
                      </div>
                      {!editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(null);
                            setFormData(prev => ({ ...prev, product_id: "", discount_percent: "", promotion_price: "" }));
                          }}
                          className="text-sm font-bold text-destructive hover:text-destructive  "
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {selectedProduct && (
                  <div className="mt-2 rounded-lg border border-info bg-info-soft p-3  ">
                    <p className="text-sm text-info ">
                      <strong>Note:</strong> Creating a promotion does not change the product badge. Badges such as &quot;New&quot; and &quot;Best Seller&quot; are managed in the product settings.
                    </p>
                  </div>
                )}
              </div>

              {/* Product Selector */}
              {showProductSelector && !editingId && (
                <div className="rounded-xl border border-line bg-surface p-4  ">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      placeholder="Search by product name or brand..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-line bg-surface pl-10 pr-4 py-2.5 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/20   "
                    />
                  </div>

                  {/* Horizontal Scroller */}
                  <div className="relative">
                    {/* Left Arrow */}
                    {selectorScrollPosition > 0 && (
                      <button
                        type="button"
                        onClick={() => scrollProducts('left')}
                        className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-accent shadow-soft transition hover:border-line hover:bg-accent-soft   "
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}

                    {/* Products */}
                    <div 
                      ref={scrollContainerRef}
                      className="flex gap-4 overflow-x-auto pb-2"
                      onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        setSelectorScrollPosition(target.scrollLeft);
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <div 
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="group relative flex w-[220px] flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-line bg-surface transition-all hover:border-line hover:shadow-soft   "
                        >
                          {/* Product Image */}
                          <div className="relative h-[140px] w-full overflow-hidden bg-surface-muted   ">
                            <img 
                              src={getSafeProductImage(product.images)} 
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>

                          {/* Product Info */}
                          <div className="p-3">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-accent">
                              {product.brand}
                            </p>
                            <h4 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-semibold text-ink ">
                              {product.name}
                            </h4>
                            <p className="mt-2 text-base font-semibold text-accent">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right Arrow */}
                    <button
                      type="button"
                      onClick={() => scrollProducts('right')}
                      className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-accent shadow-soft transition hover:border-line hover:bg-accent-soft   "
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Discount and Price */}
              {selectedProduct && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="studio-components-admin-ProductPromotionManager-1" className="mb-2 block text-sm font-bold text-ink ">
                        Discount Percentage <span className="text-destructive">*</span>
                      </label>
                      <input id="studio-components-admin-ProductPromotionManager-1"
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={formData.discount_percent}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/20   "
                        placeholder="25"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-ink ">
                        Promotion Price (MMK)
                      </label>
                      <div className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm font-semibold text-muted   ">
                        {formData.promotion_price ? formatPrice(parseFloat(formData.promotion_price)) : '---'}
                      </div>
                    </div>
                  </div>

                  {/* Savings Display */}
                  {formData.discount_percent && formData.promotion_price && promotionPrice > 0 && promotionPrice < originalPrice && (
                    <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 border border-success  ">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-on-brand font-semibold text-lg">
                        %
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase text-success ">You Save</p>
                        <p className="text-lg font-semibold text-success ">
                          {formData.discount_percent}% OFF • {formatPrice(savedAmount)} Saved
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Dates */}
              {selectedProduct && (
                <div className="grid gap-4 sm:grid-cols-2">
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
                    className="rounded-xl py-3 text-sm font-semibold"
                  />

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
                    className="rounded-xl py-3 text-sm font-semibold"
                    showValidationError={
                      !!(formData.start_at && formData.end_at && new Date(formData.end_at) <= new Date(formData.start_at))
                    }
                    validationMessage="End date must be after start date"
                  />
                </div>
              )}

              {/* Active Toggle */}
              {selectedProduct && (
                <div>
                  <label className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-line text-accent focus:ring-focus  "
                    />
                    <span className="text-sm font-bold text-ink ">Promotion Active</span>
                  </label>
                  <p className="ml-6 mt-1 text-xs text-muted ">
                    Inactive promotions won&apos;t be visible to customers
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            {selectedProduct && (
              <div className="mt-6 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-brand transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-bold text-ink transition hover:bg-surface-muted    "
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Promotions List */}
      <div className="space-y-4">
        {promotions.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-12 text-center  ">
            <Tag className="mx-auto h-12 w-12 text-accent/30" />
            <p className="mt-4 text-sm font-bold text-muted ">No product promotions yet</p>
            <p className="mt-1 text-xs text-muted ">Create your first promotion to get started</p>
          </div>
        ) : (
          promotions.map((promotion) => {
            const status = getPromotionStatus(promotion);
            const product = products.find(p => p.id === promotion.product_id);
            const discount = product ? calculateDiscountFromPrices(product.price, promotion.promotion_price) : 0;

            return (
              <motion.div
                key={promotion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-line bg-surface p-6 shadow-soft  "
              >
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  {product?.images && product.images.length > 0 && (
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted ">
                      <img
                        src={getSafeProductImage(product.images)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Package className="h-4 w-4 text-accent" />
                          <h3 className="text-lg font-semibold text-ink ">
                            {product?.name || "Unknown Product"}
                          </h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        {product && (
                          <div className="mt-2 flex flex-wrap items-center gap-4">
                            <div>
                              <p className="text-xs text-muted ">Original Price</p>
                              <p className="text-lg font-bold text-muted line-through">{formatPrice(product.price)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted ">Promotion Price</p>
                              <p className="text-xl font-semibold text-accent">{formatPrice(promotion.promotion_price)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 ">
                              <Percent className="h-3.5 w-3.5 text-success " />
                              <span className="text-sm font-semibold text-success ">{discount}% OFF</span>
                            </div>
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-muted ">
                          <span>
                            {promotion.start_at instanceof Timestamp 
                              ? new Date(promotion.start_at.toDate()).toLocaleDateString()
                              : new Date(promotion.start_at as string).toLocaleDateString()}
                            {" - "}
                            {promotion.end_at instanceof Timestamp 
                              ? new Date(promotion.end_at.toDate()).toLocaleDateString()
                              : new Date(promotion.end_at as string).toLocaleDateString()}
                          </span>
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
