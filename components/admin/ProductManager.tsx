"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Package, X, EyeOff, CheckCircle, Upload } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import PremiumSelect from "./PremiumSelect";

interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  stock: number;
  category: string;
  is_active: boolean;
  decants: { label: string; price: number }[];
}

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";

const getSafeProductImage = (image?: string | null) => {
  const value = image?.trim();
  if (!value) return FALLBACK_PRODUCT_IMAGE;
  if (value.startsWith("/") || value.startsWith("blob:")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? value
      : FALLBACK_PRODUCT_IMAGE;
  } catch {
    return FALLBACK_PRODUCT_IMAGE;
  }
};

const getStorableProductImage = (image?: string | null) => {
  const value = image?.trim();
  if (!value || value.startsWith("blob:")) return "";
  if (value.startsWith("/")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
};

export default function ProductManager() {
  const supabase = createSupabaseClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [deletingProduct, setDeletingProduct] = useState(false);
  const formatPrice = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload image to Supabase Storage
  const uploadProductImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      console.error("Image upload error:", uploadError.message);
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG, WEBP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Clear URL input when file is selected
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    price: "",
    description: "",
    image: "",
    badge: "",
    stock: "",
    category: "",
    is_active: true,
    decant5ml: "",
    decant10ml: "",
    decant20ml: "",
    decant30ml: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!showProductForm && !showDeleteModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showProductForm, showDeleteModal]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading products:", error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const openAddProductForm = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      brand: "",
      price: "",
      description: "",
      image: "",
      badge: "",
      stock: "",
      category: "",
      is_active: true,
      decant5ml: "",
      decant10ml: "",
      decant20ml: "",
      decant30ml: "",
    });
    setImageFile(null);
    setImagePreview("");
    setShowProductForm(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      price: product.price.toString(),
      description: product.description,
      image: product.image,
      badge: product.badge || "",
      stock: product.stock.toString(),
      category: product.category,
      is_active: product.is_active,
      decant5ml: product.decants?.find(d => d.label === "5ml")?.price.toString() || "",
      decant10ml: product.decants?.find(d => d.label === "10ml")?.price.toString() || "",
      decant20ml: product.decants?.find(d => d.label === "20ml")?.price.toString() || "",
      decant30ml: product.decants?.find(d => d.label === "30ml")?.price.toString() || "",
    });
    setImageFile(null);
    setImagePreview("");
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setImageFile(null);
    setImagePreview("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        setError("Product name is required");
        setLoading(false);
        return;
      }

      if (!formData.price || isNaN(Number(formData.price))) {
        setError("Valid price is required");
        setLoading(false);
        return;
      }

      // Build decants array
      const decants = [
        { label: "5ml", price: Number(formData.decant5ml || 0) },
        { label: "10ml", price: Number(formData.decant10ml || 0) },
        { label: "20ml", price: Number(formData.decant20ml || 0) },
        { label: "30ml", price: Number(formData.decant30ml || 0) },
      ].filter((d) => d.price > 0);

      // Upload image if a new file was selected
      let imageUrl = getStorableProductImage(formData.image);
      if (imageFile) {
        setUploadingImage(true);
        try {
          imageUrl = await uploadProductImage(imageFile);
        } catch (uploadErr: unknown) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Image upload failed. Please try again.");
          setLoading(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      // Build product payload matching actual Supabase schema
      const productPayload = {
        name: formData.name.trim(),
        brand: formData.brand?.trim() || null,
        description: formData.description?.trim() || null,
        image: imageUrl || null,
        category: formData.category || null,
        price: Number(formData.price || 0),
        stock: Number(formData.stock || 0),
        is_active: Boolean(formData.is_active),
        is_featured: false,
        decants: decants.length > 0 ? decants : [],
        notes: {},
      };

      console.log("Product payload:", productPayload);

      let result;
      if (editingProduct) {
        // Update existing product
        result = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingProduct.id)
          .select()
          .single();
      } else {
        // Insert new product
        result = await supabase
          .from("products")
          .insert(productPayload)
          .select()
          .single();
      }

      if (result.error) {
        console.error(editingProduct ? "Update product error:" : "Add product error:", {
          message: result.error.message,
          details: result.error.details,
          hint: result.error.hint,
          code: result.error.code,
        });
        setError(result.error.message || (editingProduct ? "Could not update product." : "Could not add product."));
        setLoading(false);
        return;
      }

      console.log(editingProduct ? "Product updated successfully:" : "Product added successfully:", result.data);

      // Reset form
      setFormData({
        name: "",
        brand: "",
        price: "",
        description: "",
        image: "",
        badge: "",
        stock: "",
        category: "",
        is_active: true,
        decant5ml: "",
        decant10ml: "",
        decant20ml: "",
        decant30ml: "",
      });
      setImageFile(null);
      setImagePreview("");

      // Close modal and reload products
      closeProductForm();
      loadProducts();
    } catch (err) {
      console.error("Unexpected error:", err);
      setError(editingProduct ? "Failed to update product" : "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    // Add to updating set
    setUpdatingProducts(prev => new Set(prev).add(productId));

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !currentStatus })
        .eq("id", productId);

      if (error) {
        console.error("Error updating product status:", error);
        return;
      }

      // Reload products to get fresh data
      loadProducts();
    } catch (error) {
      console.error("Error updating product status:", error);
    } finally {
      // Remove from updating set
      setUpdatingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  const openDeleteModal = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeletingProduct(true);
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productToDelete.id);

      if (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product");
        return;
      }

      // Close modal and reload products
      closeDeleteModal();
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    } finally {
      setDeletingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">Product Inventory</h2>
          <p className="text-sm text-zinc-600">{products.length} products in stock</p>
        </div>
        <button
          onClick={openAddProductForm}
          className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-semibold text-black transition-all duration-300 hover:bg-yellow-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-zinc-300" />
          <h3 className="mt-4 text-lg font-bold text-black">No products found</h3>
          <p className="mt-2 text-sm text-zinc-600">Add your first product to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:border-yellow-400/50 hover:shadow-lg"
            >
              {/* Product Image */}
              <div className="relative aspect-square overflow-hidden bg-zinc-50">
                <img
                  src={getSafeProductImage(product.image)}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const image = e.currentTarget;
                    if (image.src !== FALLBACK_PRODUCT_IMAGE) {
                      image.src = FALLBACK_PRODUCT_IMAGE;
                    }
                  }}
                />
                {product.badge && (
                  <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase text-black">
                    {product.badge}
                  </span>
                )}
                {!product.is_active && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <span className="rounded-full bg-red-500 px-4 py-2 text-xs font-bold uppercase text-white">
                      Inactive
                    </span>
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-600">{product.brand}</p>
                  {product.category === "Accessories" && (
                    <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-bold text-purple-700">
                      Accessory
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-lg font-bold text-black">{product.name}</h3>
                <p className="mt-1 text-sm text-zinc-600">{product.description}</p>
                
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xl font-black text-yellow-600">{formatPrice(product.price)}</span>
                  <span className="text-sm font-semibold text-zinc-600">Stock: {product.stock}</span>
                </div>

                {/* Decant Sizes */}
                {product.decants && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-zinc-500">Decant Sizes:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {product.decants.map((decant) => (
                        <span
                          key={decant.label}
                          className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700"
                        >
                          {decant.label} - {formatPrice(decant.price)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 space-y-3">
                  {/* Toggle Active/Inactive - Full Width */}
                  <button
                    type="button"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                    disabled={updatingProducts.has(product.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      product.is_active
                        ? "border border-yellow-200 bg-white text-neutral-800 hover:border-yellow-400 hover:bg-yellow-50"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    aria-label={product.is_active ? "Deactivate product" : "Activate product"}
                  >
                    {updatingProducts.has(product.id) ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        <span>Updating...</span>
                      </>
                    ) : product.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span>Deactivate</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>

                  {/* Edit and Delete - Side by Side */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => openEditProductForm(product)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-yellow-200 bg-white px-5 py-4 text-sm font-bold text-neutral-800 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(product)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
          <div className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-yellow-300/70 bg-[#fffdf6] shadow-[0_30px_100px_rgba(0,0,0,0.28),0_0_45px_rgba(234,179,8,0.25)]">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-600">Admin Product</p>
                <h2 className="mt-1 text-2xl font-black text-neutral-950">
                  {editingProduct ? "Edit Product" : "Add Product"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeProductForm}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-xl font-bold text-black shadow-[0_10px_25px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300"
                aria-label="Close product form"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="scrollbar-auto-hide overflow-y-auto overflow-x-hidden px-6 py-5 overscroll-contain">
              <form id="product-form" onSubmit={handleAddProduct} className="space-y-5">
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder="Golden Noir"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      Brand
                    </label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder="Dior"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    className="min-h-28 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="Warm amber, vanilla, dark wood"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      Price (MMK) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder="89"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      Stock
                    </label>
                    <input
                      type="number"
                      name="stock"
                      min="0"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder="45"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumSelect
                    label="Category"
                    value={formData.category || ""}
                    placeholder="Select category"
                    options={[
                      { label: "Woody", value: "Woody" },
                      { label: "Oriental", value: "Oriental" },
                      { label: "Floral", value: "Floral" },
                      { label: "Fresh", value: "Fresh" },
                      { label: "Citrus", value: "Citrus" },
                      { label: "Accessories", value: "Accessories" },
                    ]}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        category: value,
                      }))
                    }
                  />

                  <PremiumSelect
                    label="Badge"
                    value={formData.badge || ""}
                    placeholder="No badge"
                    options={[
                      { label: "No badge", value: "" },
                      { label: "Best Seller", value: "Best Seller" },
                      { label: "New", value: "New" },
                      { label: "Limited", value: "Limited" },
                    ]}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        badge: value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Product Image
                  </label>

                  {/* Upload button */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50/50 px-4 py-5 transition hover:border-yellow-400 hover:bg-yellow-50"
                  >
                    <Upload className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-bold text-neutral-800">
                        {imageFile ? imageFile.name : "Click to upload image"}
                      </p>
                      <p className="text-xs text-neutral-500">PNG, JPG, WEBP — max 5MB</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    id="product-image-upload"
                    name="product_image_upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                  />

                  {/* OR divider */}
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-yellow-200" />
                    <span className="text-xs font-semibold text-neutral-400">OR paste URL</span>
                    <div className="h-px flex-1 bg-yellow-200" />
                  </div>

                  {/* URL input */}
                  <input
                    type="text"
                    name="image"
                    value={formData.image}
                    onChange={(e) => {
                      handleInputChange(e);
                      // Clear file when URL is typed
                      if (e.target.value) {
                        setImageFile(null);
                        setImagePreview("");
                      }
                    }}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="https://images.unsplash.com/..."
                  />

                  {/* Image preview */}
                  {(imagePreview || formData.image) && (
                    <div className="relative mt-3 overflow-hidden rounded-2xl border border-yellow-200 bg-white p-2">
                      <img
                        src={imagePreview || getSafeProductImage(formData.image)}
                        alt="Product preview"
                        className="h-48 w-full rounded-xl object-cover"
                        onError={(e) => {
                          const image = e.currentTarget;
                          if (image.src !== FALLBACK_PRODUCT_IMAGE) {
                            image.src = FALLBACK_PRODUCT_IMAGE;
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview("");
                          setFormData((prev) => ({ ...prev, image: "" }));
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Decant Sizes (Price in MMK)
                  </label>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600">5ml</label>
                      <input
                        type="number"
                        name="decant5ml"
                        min="0"
                        step="0.01"
                        value={formData.decant5ml}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder="12"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600">10ml</label>
                      <input
                        type="number"
                        name="decant10ml"
                        min="0"
                        step="0.01"
                        value={formData.decant10ml}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600">20ml</label>
                      <input
                        type="number"
                        name="decant20ml"
                        min="0"
                        step="0.01"
                        value={formData.decant20ml}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder="35"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-neutral-600">30ml</label>
                      <input
                        type="number"
                        name="decant30ml"
                        min="0"
                        step="0.01"
                        value={formData.decant30ml}
                        onChange={handleInputChange}
                        className="w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder="48"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-yellow-300 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                  />
                  <label htmlFor="is_active" className="text-sm font-semibold text-neutral-800">
                    Active (visible on client products page)
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-4 backdrop-blur">
              <button
                type="button"
                onClick={closeProductForm}
                className="rounded-full border border-yellow-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-yellow-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={loading || uploadingImage}
                className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingImage
                  ? "Uploading image..."
                  : loading
                  ? (editingProduct ? "Saving..." : "Adding...")
                  : (editingProduct ? "Save Changes" : "Add Product")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && productToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-red-300/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35),0_0_45px_rgba(239,68,68,0.25)]">
            {/* Header */}
            <div className="border-b border-red-200/70 px-6 py-5">
              <h2 className="text-xl font-black text-neutral-950">Delete Product?</h2>
              <p className="mt-2 text-sm text-neutral-600">
                This action permanently removes &quot;{productToDelete.name}&quot; and cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingProduct}
                className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={deletingProduct}
                className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-black text-white shadow-[0_14px_35px_rgba(239,68,68,0.35)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingProduct ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
