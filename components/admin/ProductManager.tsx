"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, Edit, EyeOff, Package, Plus, Search, Tags, Trash2, Upload, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { SCENT_COLLECTIONS } from "@/lib/collections";
import PremiumSelect from "./PremiumSelect";
import { ComponentErrorBoundary } from "../ErrorBoundaries";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";

interface Product {
  id: string;
  name: string;
  brand: string;
  brand_id?: string | null;
  brands?: Brand | null;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  scent_collection?: string | null;
  stock: number;
  category: string;
  is_active: boolean;
  decants: { label: string; price: number }[];
  notes?: ProductQuickViewNotes | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface LegacyProductBrandRow {
  brand: string | null;
  brand_id: string | null;
}

interface ProductQuickViewNotes {
  story?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  madeWith?: string;
  bestFor?: string;
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

const parseCommaSeparatedNotes = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const stringifyNotes = (value?: string[]) => (Array.isArray(value) ? value.join(", ") : "");

const hasQuickViewNotes = (notes: ProductQuickViewNotes) =>
  Boolean(
    notes.story ||
      notes.top?.length ||
      notes.heart?.length ||
      notes.base?.length ||
      notes.madeWith ||
      notes.bestFor
  );

const PRODUCTS_PER_PAGE = 12;
const productStatusFilters = [
  { label: "All Products", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
] as const;

const productCategoryFilters = [
  { label: "All Categories", value: "all" },
  { label: "Perfume Products", value: "perfume" },
  { label: "Accessories Products", value: "accessories" },
] as const;

const scentCollectionOptions = SCENT_COLLECTIONS.map((collection) => ({
  label: collection,
  value: collection,
}));

function ProductManagerContent() {
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [legacyBrandNames, setLegacyBrandNames] = useState<string[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const showListLoading = useDelayedLoading(listLoading, 400);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof productStatusFilters)[number]["value"]>("all");
  const [categoryFilter, setCategoryFilter] = useState<(typeof productCategoryFilters)[number]["value"]>("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(false);
  const showSaveLoading = useDelayedLoading(loading, 400);
  const [error, setError] = useState("");
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const formatPrice = (value: number) => `${Math.round(value || 0).toLocaleString()} MMK`;
  const totalPages = Math.max(1, Math.ceil(totalProducts / PRODUCTS_PER_PAGE));
  const pageStart = totalProducts === 0 ? 0 : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * PRODUCTS_PER_PAGE, totalProducts);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const showImageUploadLoading = useDelayedLoading(uploadingImage, 300);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload image to Supabase Storage
  const uploadProductImage = async (file: File): Promise<{ publicUrl: string; filePath: string }> => {
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
    return { publicUrl: data.publicUrl, filePath };
  };

  const deleteUploadedProductImage = async (filePath: string | null) => {
    if (!filePath) return;

    const { error: removeError } = await supabase.storage
      .from("product-images")
      .remove([filePath]);

    if (removeError) {
      console.warn("Product image cleanup failed:", removeError.message);
    }
  };

  const callProductAction = async (body: Record<string, unknown>) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Admin session expired. Please sign in again.");
    }

    const response = await fetch("/api/admin/products/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { data?: unknown; error?: string };

    if (!response.ok || result.error) {
      throw new Error(result.error || "Product action failed.");
    }

    return result.data;
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
    brand_id: "",
    price: "",
    description: "",
    image: "",
    badge: "",
    scent_collection: "",
    stock: "",
    category: "",
    is_active: true,
    decant5ml: "",
    decant10ml: "",
    decant20ml: "",
    decant30ml: "",
    quickStory: "",
    topNotes: "",
    heartNotes: "",
    baseNotes: "",
    madeWith: "",
    bestFor: "",
  });
  const isAccessoryForm = formData.category === "Accessories";

  const brandOptions = useMemo(() => {
    const currentBrand = editingProduct?.brands || null;
    const options = brands.map((brand) => ({
      label: brand.is_active ? brand.name : `${brand.name} (inactive)`,
      value: brand.id,
    }));

    if (
      currentBrand &&
      !currentBrand.is_active &&
      !options.some((option) => option.value === currentBrand.id)
    ) {
      options.push({
        label: `${currentBrand.name} (inactive)`,
        value: currentBrand.id,
      });
    }

    legacyBrandNames.forEach((brandName) => {
      if (!brands.some((brand) => brand.name.toLowerCase() === brandName.toLowerCase())) {
        options.push({
          label: brandName,
          value: `legacy:${brandName}`,
        });
      }
    });

    return options;
  }, [brands, editingProduct, legacyBrandNames]);

  const brandFilterOptions = useMemo(
    () => [
      { label: "All Brands", value: "all" },
      ...brands.map((brand) => ({
        label: brand.is_active ? brand.name : `${brand.name} (inactive)`,
        value: brand.id,
      })),
      ...legacyBrandNames.map((brandName) => ({
        label: brandName,
        value: `legacy:${brandName}`,
      })),
      { label: "Unlinked Brand", value: "unlinked" },
    ],
    [brands, legacyBrandNames]
  );

  const selectedBrand = brands.find((brand) => brand.id === formData.brand_id) || null;
  const legacyBrand = !formData.brand_id && formData.brand?.trim() ? formData.brand.trim() : "";

  const loadBrands = useCallback(async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, slug, description, is_active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading brands:", error);
      return;
    }

    const loadedBrands = (data || []) as Brand[];
    setBrands(loadedBrands);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("brand, brand_id")
      .not("brand", "is", null);

    if (!productError && productData) {
      const savedBrandNames = new Set(loadedBrands.map((brand) => brand.name.toLowerCase()));
      const legacyNames = Array.from(
        new Set(
          (productData as LegacyProductBrandRow[])
            .map((product) => ({
              brand: typeof product.brand === "string" ? product.brand.trim() : "",
              brandId: product.brand_id,
            }))
            .filter((product) => product.brand && !product.brandId && !savedBrandNames.has(product.brand.toLowerCase()))
            .map((product) => product.brand)
        )
      ).sort((a, b) => a.localeCompare(b));

      setLegacyBrandNames(legacyNames);
    }
  }, [supabase]);

  const loadProducts = useCallback(async () => {
    try {
      setListLoading(true);

      const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
      const to = from + PRODUCTS_PER_PAGE - 1;
      const search = searchQuery.trim();

      let query = supabase
        .from("products")
        .select("*, brands(id, name, slug, description, is_active)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      }

      if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      }

      if (categoryFilter === "perfume") {
        query = query.neq("category", "Accessories").not("category", "is", null);
      }

      if (categoryFilter === "accessories") {
        query = query.eq("category", "Accessories");
      }

      if (brandFilter !== "all") {
        if (brandFilter === "unlinked") {
          query = query.is("brand_id", null);
        } else if (brandFilter.startsWith("legacy:")) {
          query = query
            .is("brand_id", null)
            .eq("brand", brandFilter.replace(/^legacy:/, ""));
        } else {
          query = query.eq("brand_id", brandFilter);
        }
      }

      if (search) {
        const escapedSearch = search.replace(/[%_]/g, "\\$&");
        query = query.or(`name.ilike.%${escapedSearch}%,brand.ilike.%${escapedSearch}%,category.ilike.%${escapedSearch}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error loading products:", error);
        return;
      }

      setProducts(
        ((data || []) as Product[]).map((product) => ({
          ...product,
          brand: product.brands?.name || product.brand || "",
        }))
      );
      setTotalProducts(count || 0);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setListLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, categoryFilter, brandFilter, supabase]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, brandFilter]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!showProductForm && !showDeleteModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showProductForm, showDeleteModal]);

  const openAddProductForm = (presetCategory = "") => {
    setEditingProduct(null);
    setFormData({
      name: "",
      brand: "",
      brand_id: "",
      price: "",
      description: "",
      image: "",
      badge: "",
      scent_collection: "",
      stock: "",
      category: presetCategory,
      is_active: true,
      decant5ml: "",
      decant10ml: "",
      decant20ml: "",
      decant30ml: "",
      quickStory: "",
      topNotes: "",
      heartNotes: "",
      baseNotes: "",
      madeWith: "",
      bestFor: "",
    });
    setImageFile(null);
    setImagePreview("");
    setShowProductForm(true);
  };

  const openEditProductForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brands?.name || product.brand || "",
      brand_id: product.brand_id || "",
      price: product.price.toString(),
      description: product.description,
      image: product.image,
      badge: product.badge || "",
      scent_collection: product.scent_collection || "",
      stock: product.stock.toString(),
      category: product.category,
      is_active: product.is_active,
      decant5ml: product.decants?.find(d => d.label === "5ml")?.price.toString() || "",
      decant10ml: product.decants?.find(d => d.label === "10ml")?.price.toString() || "",
      decant20ml: product.decants?.find(d => d.label === "20ml")?.price.toString() || "",
      decant30ml: product.decants?.find(d => d.label === "30ml")?.price.toString() || "",
      quickStory: product.notes?.story || "",
      topNotes: stringifyNotes(product.notes?.top),
      heartNotes: stringifyNotes(product.notes?.heart),
      baseNotes: stringifyNotes(product.notes?.base),
      madeWith: product.notes?.madeWith || "",
      bestFor: product.notes?.bestFor || "",
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
    let uploadedImagePath: string | null = null;

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
      const decants = formData.category === "Accessories"
        ? []
        : [
            { label: "5ml", price: Number(formData.decant5ml || 0) },
            { label: "10ml", price: Number(formData.decant10ml || 0) },
            { label: "20ml", price: Number(formData.decant20ml || 0) },
            { label: "30ml", price: Number(formData.decant30ml || 0) },
          ].filter((d) => d.price > 0);

      const quickViewNotes: ProductQuickViewNotes = {
        story: formData.quickStory.trim(),
        top: parseCommaSeparatedNotes(formData.topNotes),
        heart: parseCommaSeparatedNotes(formData.heartNotes),
        base: parseCommaSeparatedNotes(formData.baseNotes),
        madeWith: formData.madeWith.trim(),
        bestFor: formData.bestFor.trim(),
      };

      // Upload image if a new file was selected
      let imageUrl = getStorableProductImage(formData.image);
      if (imageFile) {
        setUploadingImage(true);
        try {
          const uploadedImage = await uploadProductImage(imageFile);
          imageUrl = uploadedImage.publicUrl;
          uploadedImagePath = uploadedImage.filePath;
        } catch (uploadErr: unknown) {
          setError(uploadErr instanceof Error ? uploadErr.message : "Image upload failed. Please try again.");
          setLoading(false);
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }

      const selectedBrandName = selectedBrand?.name || formData.brand?.trim() || "";

      // Build product payload matching actual Supabase schema
      const productPayload = {
        name: formData.name.trim(),
        brand_id: formData.brand_id || null,
        brand: selectedBrandName || null,
        description: formData.description?.trim() || null,
        image: imageUrl || null,
        category: formData.category || null,
        badge: formData.badge || null,
        scent_collection: formData.scent_collection || null,
        price: Number(formData.price || 0),
        stock: Number(formData.stock || 0),
        is_active: Boolean(formData.is_active),
        is_featured: false,
        decants: decants.length > 0 ? decants : [],
        notes: hasQuickViewNotes(quickViewNotes) ? quickViewNotes : {},
      };

      let savedProduct: Product | null = null;
      try {
        savedProduct = (await callProductAction({
          action: "save",
          productId: editingProduct?.id || null,
          product: productPayload,
        })) as Product | null;
      } catch (saveError) {
        await deleteUploadedProductImage(uploadedImagePath);
        console.error(editingProduct ? "Update product error:" : "Add product error:", saveError);
        setError(saveError instanceof Error ? saveError.message : editingProduct ? "Could not update product." : "Could not add product.");
        setLoading(false);
        return;
      }
      if (savedProduct?.id) {
        const { error: productMetaUpdateError } = await supabase
          .from("products")
          .update({
            badge: formData.badge || null,
            scent_collection: formData.scent_collection || null,
          })
          .eq("id", savedProduct.id);

        if (productMetaUpdateError) {
          const { error: collectionOnlyUpdateError } = await supabase
            .from("products")
            .update({ scent_collection: formData.scent_collection || null })
            .eq("id", savedProduct.id);

          if (collectionOnlyUpdateError) {
            console.warn("Product collection fallback save skipped:", collectionOnlyUpdateError);
          } else {
            console.warn("Product badge save skipped. Add the products.badge column in Supabase to save badges.", productMetaUpdateError);
          }
        }
      }

      // Reset form
      setFormData({
        name: "",
        brand: "",
        brand_id: "",
        price: "",
        description: "",
        image: "",
        badge: "",
        scent_collection: "",
        stock: "",
        category: "",
        is_active: true,
        decant5ml: "",
        decant10ml: "",
        decant20ml: "",
        decant30ml: "",
        quickStory: "",
        topNotes: "",
        heartNotes: "",
        baseNotes: "",
        madeWith: "",
        bestFor: "",
      });
      setImageFile(null);
      setImagePreview("");

      // Close modal and reload products
      closeProductForm();
      loadProducts();
    } catch (err) {
      await deleteUploadedProductImage(uploadedImagePath);
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
      await callProductAction({
        action: "setActive",
        productId,
        isActive: !currentStatus,
      });

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
    setDeleteError("");
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
    setDeleteError("");
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeletingProduct(true);
    try {
      await callProductAction({
        action: "delete",
        productId: productToDelete.id,
      });

      // Close modal and reload products
      closeDeleteModal();
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      setDeleteError("Failed to delete product. Please try again.");
    } finally {
      setDeletingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">Product Inventory</h2>
          <p className="text-sm text-zinc-600">{totalProducts} products in inventory</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto lg:grid-cols-3">
          <a
            href="/admin/brands"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_18px_42px_rgba(234,179,8,0.34)] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          >
            <Tags className="h-4 w-4" />
            Manage Brands
          </a>
          <button
            type="button"
            onClick={() => openAddProductForm()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_18px_42px_rgba(234,179,8,0.34)] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Perfume Product
          </button>
          <button
            type="button"
            onClick={() => openAddProductForm("Accessories")}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_18px_42px_rgba(234,179,8,0.34)] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Accessories Product
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm dark:border-yellow-400/25 dark:bg-[#15100b]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
          <input
            id="admin-product-search"
            name="admin_product_search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search product, brand, or category..."
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:placeholder:text-[#fff7e6]/45"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {productStatusFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatusFilter(item.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                statusFilter === item.value
                  ? "bg-yellow-400 text-black shadow-md"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12] dark:hover:!text-[#d4af37]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {productCategoryFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setCategoryFilter(item.value)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                categoryFilter === item.value
                  ? "bg-yellow-400 text-black shadow-md"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12] dark:hover:!text-[#d4af37]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="w-full max-w-[320px] border-t border-yellow-100 pt-3 dark:border-yellow-400/20">
          <PremiumSelect
            label="Filter by Brand"
            value={brandFilter}
            placeholder="All Brands"
            options={brandFilterOptions}
            onChange={setBrandFilter}
          />
        </div>
      </div>

      {!showListLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">
          <p>
            Showing <span className="font-bold text-black dark:!text-[#fff7e6]">{pageStart}</span>-<span className="font-bold text-black dark:!text-[#fff7e6]">{pageEnd}</span> of{" "}
            <span className="font-bold text-black dark:!text-[#fff7e6]">{totalProducts}</span> products
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12]"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {showListLoading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-yellow-400/25 dark:bg-[#15100b]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-yellow-400/25 dark:bg-[#15100b]">
          <Package className="mx-auto h-12 w-12 text-zinc-300 dark:text-[#fff7e6]/35" />
          <h3 className="mt-4 text-lg font-bold text-black dark:!text-[#fff7e6]">No products found</h3>
          <p className="mt-2 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">Add your first product to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white text-black shadow-sm transition-all duration-300 hover:border-yellow-400/50 hover:shadow-lg dark:border-yellow-400/25 dark:bg-[#15100b] dark:text-[#fff7e6] dark:shadow-[0_18px_42px_rgba(0,0,0,0.28)] dark:hover:border-yellow-400/45 ${
                product.category === "Accessories" ? "w-full max-w-[320px] justify-self-start" : ""
              }`}
            >
              {/* Product Image */}
              <div
                className={`relative overflow-hidden bg-zinc-50 dark:bg-[#0f0b07] ${
                  product.category === "Accessories" ? "h-36 sm:h-40" : "h-40 sm:h-44 lg:h-48"
                }`}
              >
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
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-yellow-600 dark:!text-yellow-300">
                    {product.brands?.name || product.brand || "Unlinked brand"}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    {product.brands && (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                          product.brands.is_active
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:!text-emerald-200"
                            : "bg-zinc-100 text-zinc-500 dark:bg-[#231b12] dark:!text-[#fff7e6]/55"
                        }`}
                      >
                        {product.brands.is_active ? "Brand active" : "Brand inactive"}
                      </span>
                    )}
                    {!product.brand_id && (
                      <span className="rounded-full bg-yellow-50 px-2 py-1 text-[10px] font-black uppercase text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
                        Legacy
                      </span>
                    )}
                    {product.category === "Accessories" && (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
                        Accessory
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="mt-1 line-clamp-1 text-base font-bold leading-tight text-black dark:!text-[#fff7e6]">{product.name}</h3>
                {product.scent_collection && (
                  <div className="mt-1.5">
                    <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-yellow-700 dark:border-yellow-400/30 dark:bg-[#231b12] dark:!text-yellow-300">
                      {product.scent_collection}
                    </span>
                  </div>
                )}
                <p
                  className="mt-1 line-clamp-1 min-h-[20px] text-sm text-zinc-600 dark:!text-[#fff7e6]/65"
                >
                  {product.description}
                </p>
                
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-lg font-black text-yellow-600 dark:!text-yellow-300">{formatPrice(product.price)}</span>
                  <span className="text-sm font-semibold text-zinc-600 dark:!text-[#fff7e6]/75">Stock: {product.stock}</span>
                </div>

                {/* Decant Sizes */}
                {product.category !== "Accessories" && product.decants && product.decants.length > 0 && (
                  <div className="mt-2.5">
                    <p className="text-xs font-semibold text-zinc-500 dark:!text-[#fff7e6]/65">Decant Sizes:</p>
                    <div className="mt-1 flex max-h-[52px] flex-wrap gap-1 overflow-hidden">
                      {product.decants.map((decant) => (
                        <span
                          key={decant.label}
                          className="rounded-full border border-transparent bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-yellow-400/20 dark:bg-[#231b12] dark:!text-[#fff7e6]/75"
                        >
                          {decant.label} - {formatPrice(decant.price)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 space-y-2.5">
                  {/* Toggle Active/Inactive - Full Width */}
                  <button
                    type="button"
                    onClick={() => toggleProductStatus(product.id, product.is_active)}
                    disabled={updatingProducts.has(product.id)}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      product.is_active
                        ? "border border-yellow-200 bg-white text-neutral-800 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:hover:bg-[#231b12]"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-950/35 dark:!text-emerald-200"
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
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => openEditProductForm(product)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:hover:bg-[#231b12]"
                      aria-label="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteModal(product)}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400/30 dark:bg-red-950/35 dark:!text-red-200 dark:hover:bg-red-950/50"
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
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-600">
                  {isAccessoryForm ? "Admin Accessory" : "Admin Product"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-neutral-950">
                  {editingProduct
                    ? isAccessoryForm
                      ? "Edit Accessory"
                      : "Edit Product"
                    : isAccessoryForm
                    ? "Add Accessory"
                    : "Add Product"}
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
                  <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      {isAccessoryForm ? "Accessory Name *" : "Product Name *"}
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder={isAccessoryForm ? "Travel Atomizer" : "Golden Noir"}
                    />
                  </div>

                  <div>
                    <PremiumSelect
                      label={isAccessoryForm ? "Brand / Maker" : "Brand"}
                      value={formData.brand_id || (legacyBrand ? `legacy:${legacyBrand}` : "")}
                      placeholder={brandOptions.length > 0 ? "Select brand" : "Add brands first"}
                      options={brandOptions}
                      onChange={(value) => {
                        if (value.startsWith("legacy:")) {
                          const legacyName = value.replace(/^legacy:/, "");
                          setFormData((prev) => ({
                            ...prev,
                            brand_id: "",
                            brand: legacyName,
                          }));
                          return;
                        }

                        const nextBrand = brands.find((brand) => brand.id === value);
                        setFormData((prev) => ({
                          ...prev,
                          brand_id: value,
                          brand: nextBrand?.name || prev.brand,
                        }));
                      }}
                    />
                    {legacyBrand && (
                      <p className="mt-2 text-xs font-bold text-yellow-700">
                        Legacy brand: {legacyBrand}. Choose a brand to link this product.
                      </p>
                    )}
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
                    placeholder={isAccessoryForm ? "Premium refillable perfume travel atomizer with a clean leak-resistant finish." : "Warm amber, vanilla, dark wood"}
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
                      placeholder={isAccessoryForm ? "25000" : "89000"}
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
                      placeholder={isAccessoryForm ? "25" : "45"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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

                  {!isAccessoryForm && (
                    <PremiumSelect
                      label="Scent Collection"
                      value={formData.scent_collection || ""}
                      placeholder="Select scent collection"
                      options={scentCollectionOptions.map((option) => ({
                        label: option.label,
                        value: option.value,
                      }))}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          scent_collection: value,
                        }))
                      }
                    />
                  )}
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

                <div className="rounded-[24px] border border-yellow-200 bg-white/70 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-600">
                      {isAccessoryForm ? "Accessory Details" : "Quick View Details"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {isAccessoryForm
                        ? "Optional content shown inside accessory quick view."
                        : "Optional content shown inside product quick view."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Product Details" : "The Story"}
                      </label>
                      <textarea
                        name="quickStory"
                        value={formData.quickStory}
                        onChange={handleInputChange}
                        className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder={isAccessoryForm ? "A short realistic description of the accessory, finish, and daily use." : "A short realistic story about the fragrance, mood, and character."}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Key Features" : "Top Notes"}
                        </label>
                        <input
                          type="text"
                          name="topNotes"
                          value={formData.topNotes}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={isAccessoryForm ? "Refillable, Leak-resistant" : "Bergamot, Citrus"}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Materials" : "Heart Notes"}
                        </label>
                        <input
                          type="text"
                          name="heartNotes"
                          value={formData.heartNotes}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={isAccessoryForm ? "Glass, Metal" : "Jasmine, Rose"}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Care Tips" : "Base Notes"}
                        </label>
                        <input
                          type="text"
                          name="baseNotes"
                          value={formData.baseNotes}
                          onChange={handleInputChange}
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={isAccessoryForm ? "Keep dry, Clean gently" : "Amber, Vanilla"}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Made With" : "Made With"}
                        </label>
                        <textarea
                          name="madeWith"
                          value={formData.madeWith}
                          onChange={handleInputChange}
                          className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={isAccessoryForm ? "Durable materials selected for daily perfume storage and gifting." : "Premium oils, clean alcohol base, and carefully balanced aroma compounds."}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm ? "Best For" : "Best For"}
                        </label>
                        <textarea
                          name="bestFor"
                          value={formData.bestFor}
                          onChange={handleInputChange}
                          className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={isAccessoryForm ? "Travel, gifting, handbag carry, and perfume refills." : "Daily wear, evening events, office, dates, or special occasions."}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {!isAccessoryForm && (
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
                )}

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
                {showImageUploadLoading
                  ? "Uploading image..."
                  : showSaveLoading
                  ? (editingProduct ? "Saving..." : isAccessoryForm ? "Adding Accessory..." : "Adding...")
                  : editingProduct
                  ? "Save Changes"
                  : isAccessoryForm
                  ? "Add Accessory"
                  : "Add Product"}
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
              {deleteError && (
                <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {deleteError}
                </div>
              )}
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

export default function ProductManager() {
  return (
    <ComponentErrorBoundary context="product-manager">
      <ProductManagerContent />
    </ComponentErrorBoundary>
  );
}
