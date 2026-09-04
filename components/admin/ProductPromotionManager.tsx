"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Tag, Package, Percent, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Product } from "@/lib/firebase/products-server";
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

const getSafeProductImage = (image?: string | null) => {
  const value = image?.trim();
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
        const result = await response.json();
        alert(result.error || `Failed to save promotion: ${response.statusText}`);
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
        const result = await response.json();
        alert(result.error || `Failed to delete promotion: ${response.statusText}`);
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
        const result = await response.json();
        alert(result.error || `Failed to toggle promotion: ${response.statusText}`);
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
      return { label: "Inactive", color: "text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800" };
    }

    const now = new Date();
    const startDate = promotion.start_at instanceof Timestamp 
      ? promotion.start_at.toDate() 
      : new Date(promotion.start_at as string);
    const endDate = promotion.end_at instanceof Timestamp 
      ? promotion.end_at.toDate() 
      : new Date(promotion.end_at as string);

    if (now < startDate) {
      return { label: "Scheduled", color: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" };
    }

    if (now > endDate) {
      return { label: "Expired", color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" };
    }

    return { label: "Active", color: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" };
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#d4af37] border-t-transparent" />
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
          <h2 className="text-2xl font-black text-[#1f1a14] dark:text-[#fff8e7]">Product Promotions</h2>
          <p className="mt-1 text-sm text-[#7a6a55] dark:text-[#b8a892]">Manage promotional pricing for products</p>
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
          className="relative z-[9999] flex shrink-0 items-center gap-2 rounded-full border-2 border-[#d4af37] bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-5 py-3 text-sm font-bold text-[#1f1a14] shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 cursor-pointer"
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
            className="overflow-hidden rounded-[24px] border border-[#d4af37]/20 bg-white p-6 shadow-sm dark:border-[#d4af37]/10 dark:bg-[#2a2419]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#1f1a14] dark:text-[#fff8e7]">
                {editingId ? "Edit Promotion" : "Create New Promotion"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-bold text-[#7a6a55] hover:text-[#1f1a14] dark:text-[#b8a892] dark:hover:text-[#fff8e7]"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                  Select Product <span className="text-red-500">*</span>
                </label>
                
                {!selectedProduct ? (
                  <button
                    type="button"
                    onClick={() => setShowProductSelector(!showProductSelector)}
                    disabled={editingId !== null}
                    className="w-full rounded-2xl border border-[#d4af37]/30 bg-white px-4 py-3 text-left text-sm font-semibold text-neutral-500 transition hover:border-[#d4af37]/50 focus:border-[#d4af37] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#b8a892]"
                  >
                    Choose a product...
                  </button>
                ) : (
                  <div className="rounded-xl border-2 border-[#d4af37]/40 bg-gradient-to-br from-yellow-50/50 to-white p-4 dark:from-[#d4af37]/5 dark:to-[#2a2419]">
                    <div className="flex items-center gap-4">
                      <img 
                        src={getSafeProductImage(selectedProduct.image)} 
                        alt={selectedProduct.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase text-[#d4af37]">Selected Product</p>
                        <p className="mt-1 font-black text-[#1f1a14] dark:text-[#fff8e7]">{selectedProduct.name}</p>
                        <p className="text-sm text-[#7a6a55] dark:text-[#b8a892]">{selectedProduct.brand}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase text-[#7a6a55] dark:text-[#b8a892]">Original Price</p>
                        <p className="text-xl font-black text-[#d4af37]">{formatPrice(selectedProduct.price)}</p>
                      </div>
                      {!editingId && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProduct(null);
                            setFormData(prev => ({ ...prev, product_id: "", discount_percent: "", promotion_price: "" }));
                          }}
                          className="text-sm font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Product Selector */}
              {showProductSelector && !editingId && (
                <div className="rounded-2xl border border-[#d4af37]/20 bg-white p-4 dark:border-[#d4af37]/10 dark:bg-[#1f1a14]">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6a55]" />
                    <input
                      type="text"
                      placeholder="Search by product name or brand..."
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-[#d4af37]/30 bg-white pl-10 pr-4 py-2.5 text-sm font-semibold text-[#1f1a14] placeholder:text-neutral-400 outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#2a2419] dark:text-[#fff8e7]"
                    />
                  </div>

                  {/* Horizontal Scroller */}
                  <div className="relative">
                    {/* Left Arrow */}
                    {selectorScrollPosition > 0 && (
                      <button
                        type="button"
                        onClick={() => scrollProducts('left')}
                        className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#d4af37]/50 bg-white text-[#d4af37] shadow-lg transition hover:border-[#d4af37] hover:bg-yellow-50 dark:border-[#d4af37]/30 dark:bg-[#1f1a14] dark:hover:bg-[#2a2419]"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}

                    {/* Products */}
                    <div 
                      ref={scrollContainerRef}
                      className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-[#d4af37]/30"
                      onScroll={(e) => {
                        const target = e.target as HTMLDivElement;
                        setSelectorScrollPosition(target.scrollLeft);
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <div 
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="group relative flex w-[220px] flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/20 bg-white transition-all hover:border-[#d4af37] hover:shadow-lg dark:border-[#d4af37]/10 dark:bg-[#2a2419] dark:hover:border-[#d4af37]/50"
                        >
                          {/* Product Image */}
                          <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#fff7e6] via-white to-[#f8eeee] dark:from-[#d4af37]/5 dark:via-[#2a2419] dark:to-[#1f1a14]">
                            <img 
                              src={getSafeProductImage(product.image)} 
                              alt={product.name}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {product.badge && (
                              <div className="absolute left-2 top-2 rounded-full bg-[#d4af37] px-2 py-1 text-[10px] font-bold uppercase text-[#1f1a14]">
                                {product.badge}
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="p-3">
                            <p className="truncate text-[10px] font-black uppercase tracking-wider text-[#d4af37]">
                              {product.brand}
                            </p>
                            <h4 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-black text-[#1f1a14] dark:text-[#fff8e7]">
                              {product.name}
                            </h4>
                            <p className="mt-2 text-base font-black text-[#d4af37]">
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
                      className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#d4af37]/50 bg-white text-[#d4af37] shadow-lg transition hover:border-[#d4af37] hover:bg-yellow-50 dark:border-[#d4af37]/30 dark:bg-[#1f1a14] dark:hover:bg-[#2a2419]"
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
                      <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                        Discount Percentage <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        step="1"
                        value={formData.discount_percent}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        className="w-full rounded-2xl border border-[#d4af37]/30 bg-white px-4 py-3 text-sm font-semibold text-[#1f1a14] placeholder:text-neutral-400 outline-none transition focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7]"
                        placeholder="25"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                        Promotion Price (MMK)
                      </label>
                      <div className="w-full rounded-2xl border border-[#d4af37]/20 bg-gray-50 px-4 py-3 text-sm font-semibold text-[#7a6a55] dark:border-[#d4af37]/10 dark:bg-[#2a2419] dark:text-[#b8a892]">
                        {formData.promotion_price ? formatPrice(parseFloat(formData.promotion_price)) : '---'}
                      </div>
                    </div>
                  </div>

                  {/* Savings Display */}
                  {formData.discount_percent && formData.promotion_price && promotionPrice > 0 && promotionPrice < originalPrice && (
                    <div className="flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3 border border-green-200 dark:bg-green-900/20 dark:border-green-900/30">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white font-black text-lg">
                        %
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold uppercase text-green-700 dark:text-green-300">You Save</p>
                        <p className="text-lg font-black text-green-600 dark:text-green-400">
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
                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                      Start Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_at}
                      onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                      className="w-full rounded-2xl border border-[#d4af37]/30 bg-white px-4 py-3 text-sm font-semibold text-[#1f1a14] transition focus:border-[#d4af37] focus:outline-none focus:ring-4 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">
                      End Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_at}
                      onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                      className="w-full rounded-2xl border border-[#d4af37]/30 bg-white px-4 py-3 text-sm font-semibold text-[#1f1a14] transition focus:border-[#d4af37] focus:outline-none focus:ring-4 focus:ring-[#d4af37]/20 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Active Toggle */}
              {selectedProduct && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 rounded border-[#d4af37]/30 text-[#d4af37] focus:ring-[#d4af37] dark:border-[#d4af37]/20 dark:bg-[#1f1a14]"
                    />
                    <span className="text-sm font-bold text-[#1f1a14] dark:text-[#fff8e7]">Promotion Active</span>
                  </label>
                  <p className="ml-6 mt-1 text-xs text-[#7a6a55] dark:text-[#b8a892]">
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
                  className="flex-1 rounded-full bg-[linear-gradient(135deg,#d4af37,#f7d774)] px-6 py-3 text-sm font-bold text-[#1f1a14] transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Promotion" : "Create Promotion"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-[#d4af37]/30 bg-white px-6 py-3 text-sm font-bold text-[#1f1a14] transition hover:bg-gray-50 dark:border-[#d4af37]/20 dark:bg-[#1f1a14] dark:text-[#fff8e7] dark:hover:bg-[#2a2419]"
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
          <div className="rounded-2xl border border-[#d4af37]/20 bg-white p-12 text-center dark:border-[#d4af37]/10 dark:bg-[#2a2419]">
            <Tag className="mx-auto h-12 w-12 text-[#d4af37]/30" />
            <p className="mt-4 text-sm font-bold text-[#7a6a55] dark:text-[#b8a892]">No product promotions yet</p>
            <p className="mt-1 text-xs text-[#7a6a55] dark:text-[#b8a892]">Create your first promotion to get started</p>
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
                className="rounded-2xl border border-[#d4af37]/20 bg-white p-6 shadow-sm dark:border-[#d4af37]/10 dark:bg-[#2a2419]"
              >
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  {product?.image && (
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                      <img
                        src={getSafeProductImage(product.image)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#d4af37]" />
                          <h3 className="text-lg font-black text-[#1f1a14] dark:text-[#fff8e7]">
                            {product?.name || "Unknown Product"}
                          </h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        {product && (
                          <div className="mt-2 flex flex-wrap items-center gap-4">
                            <div>
                              <p className="text-xs text-[#7a6a55] dark:text-[#b8a892]">Original Price</p>
                              <p className="text-lg font-bold text-gray-400 line-through">{formatPrice(product.price)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-[#7a6a55] dark:text-[#b8a892]">Promotion Price</p>
                              <p className="text-xl font-black text-[#d4af37]">{formatPrice(promotion.promotion_price)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 dark:bg-green-900/30">
                              <Percent className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                              <span className="text-sm font-black text-green-600 dark:text-green-400">{discount}% OFF</span>
                            </div>
                          </div>
                        )}

                        <div className="mt-2 flex items-center gap-3 text-xs text-[#7a6a55] dark:text-[#b8a892]">
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
