"use client";
import devLog from "@/lib/dev-log";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  EyeOff,
  Package,
  Plus,
  Search,
  Tags,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { SCENT_COLLECTIONS } from "@/lib/collections";
import PremiumSelect from "./PremiumSelect";
import { ComponentErrorBoundary } from "../ErrorBoundaries";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useAdminAuth } from "./AdminAuthProvider";

interface Product {
  id: string;
  name: string;
  brand: string;
  brand_id?: string | null;
  brands?: Brand | null;
  price: number;
  description: string;
  image: string;
  imageFileId?: string | null;
  badge: string | null;
  scent_collection?: string | null;
  stock: number;
  category: string;
  is_active: boolean;
  decants: { label: string; price: number }[];
  notes?: ProductQuickViewNotes | null;
  createdAt?: Timestamp | Date | string | null;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface ProductQuickViewNotes {
  story?: string;
  top?: string[];
  heart?: string[];
  base?: string[];
  madeWith?: string;
  bestFor?: string;
}

interface ImageKitUploadResult {
  url: string;
  fileId: string;
  name: string;
  filePath?: string;
}

interface ImageKitAuthResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
}

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";

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

const getSafeProductImage = (image?: string | null) => {
  const value = image?.trim();

  if (!value) {
    return FALLBACK_PRODUCT_IMAGE;
  }

  if (value.startsWith("/") || value.startsWith("blob:")) {
    return value;
  }

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

  if (!value || value.startsWith("blob:")) {
    return "";
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? value
      : "";
  } catch {
    return "";
  }
};

const parseCommaSeparatedNotes = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const stringifyNotes = (value?: string[]) =>
  Array.isArray(value) ? value.join(", ") : "";

const hasQuickViewNotes = (notes: ProductQuickViewNotes) =>
  Boolean(
    notes.story ||
      notes.top?.length ||
      notes.heart?.length ||
      notes.base?.length ||
      notes.madeWith ||
      notes.bestFor
  );

function ProductManagerContent() {
  /*
   * Firestore reads/writes for admin collections require an authenticated
   * admin token. The browser Firebase client auth is restored asynchronously
   * after a full page load / refresh, so we must not run any Firestore query
   * until the admin session has been fully restored and verified.
   */
  const { user, isAdmin, loading: authLoading } = useAdminAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [legacyBrandNames, setLegacyBrandNames] = useState<string[]>([]);
  const [productPromotions, setProductPromotions] = useState<Map<string, { id: string; promotion_price: number; is_active: boolean; start_at: string; end_at: string }>>(new Map());

  const [showProductSelector, setShowProductSelector] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [selectorScrollPosition, setSelectorScrollPosition] = useState(0);

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [listLoading, setListLoading] = useState(true);
  const showListLoading = useDelayedLoading(listLoading, 400);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof productStatusFilters)[number]["value"]>("all");

  const [categoryFilter, setCategoryFilter] =
    useState<(typeof productCategoryFilters)[number]["value"]>("all");

  const [brandFilter, setBrandFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [totalProducts, setTotalProducts] = useState(0);

  const [loading, setLoading] = useState(false);
  const showSaveLoading = useDelayedLoading(loading, 400);

  const [error, setError] = useState("");

  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(
    new Set()
  );

  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);
  const showImageUploadLoading = useDelayedLoading(uploadingImage, 300);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatPrice = (value: number) =>
    `${Math.round(value || 0).toLocaleString()} MMK`;

  const totalPages = Math.max(
    1,
    Math.ceil(totalProducts / PRODUCTS_PER_PAGE)
  );

  const pageStart =
    totalProducts === 0
      ? 0
      : (currentPage - 1) * PRODUCTS_PER_PAGE + 1;

  const pageEnd = Math.min(
    currentPage * PRODUCTS_PER_PAGE,
    totalProducts
  );

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    brand_id: "",
    price: "",
    description: "",
    image: "",
    imageFileId: "",
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
    // Promotion fields
    hasPromotion: false,
    selectedProductForPromotion: null as Product | null,
    promotionDiscountPercent: "",
    promotionPrice: "",
    promotionStartDate: "",
    promotionEndDate: "",
    promotionActive: true,
  });

  const isAccessoryForm = formData.category === "Accessories";

  const brandOptions = useMemo(() => {
    const currentBrand = editingProduct?.brands || null;

    const options = brands.map((brand) => ({
      label: brand.is_active
        ? brand.name
        : `${brand.name} (inactive)`,
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
      if (
        !brands.some(
          (brand) =>
            brand.name.toLowerCase() === brandName.toLowerCase()
        )
      ) {
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
        label: brand.is_active
          ? brand.name
          : `${brand.name} (inactive)`,
        value: brand.id,
      })),

      ...legacyBrandNames.map((brandName) => ({
        label: brandName,
        value: `legacy:${brandName}`,
      })),

      {
        label: "Unlinked Brand",
        value: "unlinked",
      },
    ],
    [brands, legacyBrandNames]
  );

  const selectedBrand =
    brands.find((brand) => brand.id === formData.brand_id) || null;

  const legacyBrand =
    !formData.brand_id && formData.brand?.trim()
      ? formData.brand.trim()
      : "";

  /**
   * ---------------------------------------------------------
   * IMAGEKIT
   * ---------------------------------------------------------
   *
   * Product images are stored in ImageKit.
   *
   * Required:
   *
   * NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY
   * NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT
   *
   * The private key NEVER belongs in this client component.
   *
   * The auth endpoint should be:
   *
   * /api/imagekit/auth
   *
   * and must return:
   *
   * {
   *   token,
   *   expire,
   *   signature,
   *   publicKey
   * }
   */

  const getImageKitAuth = async (): Promise<ImageKitAuthResponse> => {
    const response = await fetch("/api/imagekit/auth", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    if (!response.ok) {
      let message = "Could not authenticate ImageKit upload.";

      try {
        const result = (await response.json()) as {
          error?: string;
        };

        if (result.error) {
          message = result.error;
        }
      } catch {
        // Ignore invalid JSON response.
      }

      throw new Error(message);
    }

    const data = (await response.json()) as ImageKitAuthResponse;

    if (
      !data.token ||
      !data.expire ||
      !data.signature ||
      !data.publicKey
    ) {
      throw new Error(
        "Invalid ImageKit authentication response."
      );
    }

    return data;
  };

  const uploadProductImage = async (
    file: File
  ): Promise<ImageKitUploadResult> => {
    if (!file.type.startsWith("image/")) {
      throw new Error(
        "Please upload a valid image file (PNG, JPG, WEBP)."
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image must be smaller than 5MB.");
    }

    const auth = await getImageKitAuth();

    const endpoint =
      "https://upload.imagekit.io/api/v1/files/upload";

    const fileExtension =
      file.name.split(".").pop()?.toLowerCase() || "jpg";

    const safeBaseName =
      file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .slice(0, 80) || "product";

    const fileName = `${Date.now()}-${safeBaseName}.${fileExtension}`;

    const form = new FormData();

    form.append("file", file);
    form.append("fileName", fileName);
    form.append("publicKey", auth.publicKey);
    form.append("signature", auth.signature);
    form.append("expire", String(auth.expire));
    form.append("token", auth.token);

    /*
     * ImageKit folder structure.
     *
     * Example:
     *
     * /products/2026/08/product-name.jpg
     */
    form.append(
      "folder",
      "/products"
    );

    form.append(
      "useUniqueFileName",
      "true"
    );

    form.append(
      "tags",
      "gosh,product"
    );

    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
    });

    let result: Partial<ImageKitUploadResult> & {
      message?: string;
      error?: string;
    } = {};

    try {
      result = await response.json();
    } catch {
      // Ignore invalid JSON.
    }

    if (!response.ok || !result.url || !result.fileId) {
      throw new Error(
        result.message ||
          result.error ||
          "ImageKit image upload failed."
      );
    }

    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name || fileName,
      filePath: result.filePath,
    };
  };

  /**
   * ---------------------------------------------------------
   * FIRESTORE / PRODUCT API
   * ---------------------------------------------------------
   *
   * Reads are done from Firebase Firestore.
   *
   * Mutations go through:
   *
   * /api/admin/products/action
   *
   * This keeps admin authorization on the server.
   */

  const callProductAction = async (
    body: Record<string, unknown>
  ) => {
    const response = await fetch(
      "/api/admin/products/action",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      }
    );

    let result: {
      data?: unknown;
      error?: string;
    } = {};

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Server returned an invalid response."
      );
    }

    if (!response.ok || result.error) {
      throw new Error(
        result.error || "Product action failed."
      );
    }

    return result.data;
  };

  /**
   * ---------------------------------------------------------
   * LOAD PRODUCT PROMOTIONS
   * ---------------------------------------------------------
   */

  const loadProductPromotions = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/product-promotions/action", {
        credentials: "include",
      });

      if (!response.ok) {
        devLog.error("Failed to fetch product promotions:", response.status);
        return;
      }

      const result = await response.json();

      if (result.success && Array.isArray(result.promotions)) {
        const promotionMap = new Map<string, { 
          id: string; 
          promotion_price: number; 
          is_active: boolean; 
          start_at: string; 
          end_at: string 
        }>(
          result.promotions.map((promo: { 
            id: string; 
            product_id: string; 
            promotion_price: number; 
            is_active: boolean; 
            start_at: string; 
            end_at: string 
          }) => [
            promo.product_id,
            {
              id: promo.id,
              promotion_price: promo.promotion_price,
              is_active: promo.is_active,
              start_at: promo.start_at,
              end_at: promo.end_at,
            },
          ])
        );
        setProductPromotions(promotionMap);
      }
    } catch (error) {
      devLog.error("Error loading product promotions:", error);
    }
  }, []);

  /**
   * ---------------------------------------------------------
   * LOAD BRANDS
   * ---------------------------------------------------------
   */

  const loadBrands = useCallback(async () => {
    try {
      const brandsQuery = query(
        collection(db, "brands"),
        orderBy("name", "asc")
      );

      const snapshot = await getDocs(brandsQuery);

      const loadedBrands: Brand[] = snapshot.docs.map(
        (doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name || "",
            slug: data.slug || "",
            description:
              typeof data.description === "string"
                ? data.description
                : null,
            is_active:
              data.is_active !== false,
          };
        }
      );

      setBrands(loadedBrands);

      /**
       * Find legacy product brand strings.
       *
       * Products created before brand linking may still contain:
       *
       * brand: "Dior"
       * brand_id: null
       */

      const productsSnapshot = await getDocs(
        collection(db, "products")
      );

      const savedBrandNames = new Set(
        loadedBrands.map((brand) =>
          brand.name.toLowerCase()
        )
      );

      const legacyNames = Array.from(
        new Set(
          productsSnapshot.docs
            .map((doc) => {
              const data = doc.data();

              const brand =
                typeof data.brand === "string"
                  ? data.brand.trim()
                  : "";

              const brandId =
                typeof data.brand_id === "string"
                  ? data.brand_id
                  : null;

              return {
                brand,
                brandId,
              };
            })
            .filter(
              (product) =>
                product.brand &&
                !product.brandId &&
                !savedBrandNames.has(
                  product.brand.toLowerCase()
                )
            )
            .map((product) => product.brand)
        )
      ).sort((a, b) => a.localeCompare(b));

      setLegacyBrandNames(legacyNames);
    } catch (error) {
      devLog.error(
        "Error loading Firebase brands:",
        error
      );
    }
  }, []);

  /**
   * ---------------------------------------------------------
   * LOAD PRODUCTS
   * ---------------------------------------------------------
   *
   * Firestore does not support SQL ilike.
   *
   * We therefore load the admin inventory and perform the
   * small admin-side search/filter/pagination locally.
   *
   * This keeps the UI behavior the same.
   */

  const loadProducts = useCallback(async () => {
    try {
      setListLoading(true);

      const productsQuery = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(productsQuery);

      const loadedProducts: Product[] = snapshot.docs.map(
        (doc) => {
          const data = doc.data();

          const brand =
            typeof data.brand === "string"
              ? data.brand
              : "";

          return {
            id: doc.id,
            name: data.name || "",
            brand,
            brand_id: data.brand_id || null,
            price: Number(data.price || 0),
            description: data.description || "",
            image: data.image || "",
            imageFileId:
              data.imageFileId ||
              data.image_file_id ||
              null,
            badge: data.badge || null,
            scent_collection:
              data.scent_collection || null,
            stock: Number(data.stock || 0),
            category:
              typeof data.category === "string"
                ? data.category.trim().toLowerCase()
                : "",
            is_active:
              data.is_active !== false,
            decants: Array.isArray(data.decants)
              ? data.decants
              : [],
            notes:
              data.notes &&
              typeof data.notes === "object"
                ? data.notes
                : null,
            createdAt:
              data.createdAt ||
              data.created_at ||
              null,
          };
        }
      );

      /**
       * Attach brand documents to products.
       */
      const brandMap = new Map(
        brands.map((brand) => [brand.id, brand])
      );

      const enrichedProducts = loadedProducts.map(
        (product) => ({
          ...product,
          brands: product.brand_id
            ? brandMap.get(product.brand_id) || null
            : null,
        })
      );

      setProducts(enrichedProducts);
    } catch (error) {
      devLog.error(
        "Error loading Firebase products:",
        error
      );
    } finally {
      setListLoading(false);
    }
  }, [brands]);

  /**
   * ---------------------------------------------------------
   * FILTER PRODUCTS
   * ---------------------------------------------------------
   */

  const filteredProducts = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      if (
        statusFilter === "active" &&
        !product.is_active
      ) {
        return false;
      }

      if (
        statusFilter === "inactive" &&
        product.is_active
      ) {
        return false;
      }

      if (
        categoryFilter === "perfume" &&
        product.category.trim().toLowerCase() === "accessories"
      ) {
        return false;
      }

      if (
        categoryFilter === "accessories" &&
        product.category.trim().toLowerCase() !== "accessories"
      ) {
        return false;
      }

      if (brandFilter !== "all") {
        if (brandFilter === "unlinked") {
          if (product.brand_id) {
            return false;
          }
        } else if (brandFilter.startsWith("legacy:")) {
          const legacyName = brandFilter.replace(
            /^legacy:/,
            ""
          );

          if (
            product.brand_id ||
            product.brand !== legacyName
          ) {
            return false;
          }
        } else if (
          product.brand_id !== brandFilter
        ) {
          return false;
        }
      }

      if (search) {
        const searchableText = [
          product.name,
          product.brand,
          product.brands?.name || "",
          product.category,
          product.scent_collection || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [
    products,
    searchQuery,
    statusFilter,
    categoryFilter,
    brandFilter,
  ]);

  const paginatedProducts = useMemo(() => {
    const from =
      (currentPage - 1) * PRODUCTS_PER_PAGE;

    return filteredProducts.slice(
      from,
      from + PRODUCTS_PER_PAGE
    );
  }, [filteredProducts, currentPage]);

  /**
   * ---------------------------------------------------------
   * EFFECTS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;
    loadBrands();
    loadProductPromotions();
  }, [loadBrands, loadProductPromotions, authLoading, user, isAdmin]);

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;
    loadProducts();
  }, [loadProducts, authLoading, user, isAdmin]);

  useEffect(() => {
    setTotalProducts(filteredProducts.length);

    const nextTotalPages = Math.max(
      1,
      Math.ceil(
        filteredProducts.length /
          PRODUCTS_PER_PAGE
      )
    );

    setCurrentPage((page) =>
      Math.min(page, nextTotalPages)
    );
  }, [filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    statusFilter,
    categoryFilter,
    brandFilter,
  ]);

  /**
   * Lock body scroll while modal is open.
   */

  useEffect(() => {
    if (
      !showProductForm &&
      !showDeleteModal
    ) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [
    showProductForm,
    showDeleteModal,
  ]);

  /**
   * ---------------------------------------------------------
   * FORM HELPERS
   * ---------------------------------------------------------
   */

  const resetForm = () => {
    setFormData({
      name: "",
      brand: "",
      brand_id: "",
      price: "",
      description: "",
      image: "",
      imageFileId: "",
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
      hasPromotion: false,
      selectedProductForPromotion: null,
      promotionDiscountPercent: "",
      promotionPrice: "",
      promotionStartDate: "",
      promotionEndDate: "",
      promotionActive: true,
    });

    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAddProductForm = (
    presetCategory = ""
  ) => {
    setEditingProduct(null);
    resetForm();
    setFormData((prev) => ({
      ...prev,
      category: presetCategory,
    }));
    setError("");
    setShowProductForm(true);
  };

  const openEditProductForm = (
    product: Product
  ) => {
    setEditingProduct(product);

    const existingPromotion = productPromotions.get(product.id);

    const formatDateForInput = (dateStr: string): string => {
      try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch {
        return "";
      }
    };

    setFormData({
      name: product.name,
      brand:
        product.brands?.name ||
        product.brand ||
        "",
      brand_id: product.brand_id || "",
      price: String(product.price),
      description: product.description || "",
      image: product.image || "",
      imageFileId:
        product.imageFileId || "",
      badge: product.badge || "",
      scent_collection:
        product.scent_collection || "",
      stock: String(product.stock || 0),
      category: product.category || "",
      is_active: product.is_active,

      decant5ml:
        product.decants?.find(
          (d) => d.label === "5ml"
        )?.price?.toString() || "",

      decant10ml:
        product.decants?.find(
          (d) => d.label === "10ml"
        )?.price?.toString() || "",

      decant20ml:
        product.decants?.find(
          (d) => d.label === "20ml"
        )?.price?.toString() || "",

      decant30ml:
        product.decants?.find(
          (d) => d.label === "30ml"
        )?.price?.toString() || "",

      quickStory:
        product.notes?.story || "",

      topNotes: stringifyNotes(
        product.notes?.top
      ),

      heartNotes: stringifyNotes(
        product.notes?.heart
      ),

      baseNotes: stringifyNotes(
        product.notes?.base
      ),

      madeWith:
        product.notes?.madeWith || "",

      bestFor:
        product.notes?.bestFor || "",

      // Promotion fields
      hasPromotion: !!existingPromotion,
      selectedProductForPromotion: existingPromotion ? product : null,
      promotionDiscountPercent: existingPromotion && product.price > 0 
        ? String(Math.round(((product.price - existingPromotion.promotion_price) / product.price) * 100))
        : "",
      promotionPrice: existingPromotion ? String(existingPromotion.promotion_price) : "",
      promotionStartDate: existingPromotion ? formatDateForInput(existingPromotion.start_at) : "",
      promotionEndDate: existingPromotion ? formatDateForInput(existingPromotion.end_at) : "",
      promotionActive: existingPromotion ? existingPromotion.is_active : true,
    });

    setImageFile(null);
    setImagePreview("");
    setError("");
    setShowProductForm(true);
  };

  const closeProductForm = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setImageFile(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * ---------------------------------------------------------
   * IMAGE SELECTION
   * ---------------------------------------------------------
   */

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please upload a valid image file (PNG, JPG, WEBP)."
      );

      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5MB."
      );

      e.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);

    setFormData((prev) => ({
      ...prev,
      image: "",
      imageFileId: "",
    }));
  };

  /**
   * ---------------------------------------------------------
   * INPUT
   * ---------------------------------------------------------
   */

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement |
        HTMLTextAreaElement |
        HTMLSelectElement
    >
  ) => {
    const {
      name,
      value,
      type,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement)
              .checked
          : value,
    }));
  };

  /**
   * ---------------------------------------------------------
   * SAVE PRODUCT
   * ---------------------------------------------------------
   */

  const handleAddProduct = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      /**
       * Required validation.
       */

      if (!formData.name.trim()) {
        setError(
          "Product name is required."
        );
        return;
      }

      const price = Number(formData.price);

      if (
        !formData.price ||
        Number.isNaN(price) ||
        price < 0
      ) {
        setError(
          "Valid price is required."
        );
        return;
      }

      const stock = Number(
        formData.stock || 0
      );

      if (
        Number.isNaN(stock) ||
        stock < 0
      ) {
        setError(
          "Stock must be a valid number."
        );
        return;
      }

      /**
       * -----------------------------------------------------
       * IMAGE
       * -----------------------------------------------------
       */

      let imageUrl =
        getStorableProductImage(
          formData.image
        );

      let imageFileId =
        formData.imageFileId || "";

      if (imageFile) {
        setUploadingImage(true);

        try {
          const uploadedImage =
            await uploadProductImage(
              imageFile
            );

          imageUrl =
            uploadedImage.url;

          imageFileId =
            uploadedImage.fileId;
        } catch (uploadError) {
          devLog.error(
            "ImageKit upload error:",
            uploadError
          );

          setError(
            uploadError instanceof Error
              ? uploadError.message
              : "Image upload failed. Please try again."
          );

          return;
        } finally {
          setUploadingImage(false);
        }
      }

      /**
       * -----------------------------------------------------
       * DECANTS
       * -----------------------------------------------------
       */

      const decants =
        formData.category ===
        "Accessories"
          ? []
          : [
              {
                label: "5ml",
                price: Number(
                  formData.decant5ml || 0
                ),
              },
              {
                label: "10ml",
                price: Number(
                  formData.decant10ml || 0
                ),
              },
              {
                label: "20ml",
                price: Number(
                  formData.decant20ml || 0
                ),
              },
              {
                label: "30ml",
                price: Number(
                  formData.decant30ml || 0
                ),
              },
            ].filter(
              (decant) => decant.price > 0
            );

      /**
       * -----------------------------------------------------
       * QUICK VIEW NOTES
       * -----------------------------------------------------
       */

      const quickViewNotes: ProductQuickViewNotes =
        {
          story:
            formData.quickStory.trim(),

          top: parseCommaSeparatedNotes(
            formData.topNotes
          ),

          heart:
            parseCommaSeparatedNotes(
              formData.heartNotes
            ),

          base:
            parseCommaSeparatedNotes(
              formData.baseNotes
            ),

          madeWith:
            formData.madeWith.trim(),

          bestFor:
            formData.bestFor.trim(),
        };

      /**
       * -----------------------------------------------------
       * BRAND
       * -----------------------------------------------------
       */

      const selectedBrandName =
        selectedBrand?.name ||
        formData.brand.trim() ||
        "";

      /**
       * -----------------------------------------------------
       * FIRESTORE PRODUCT PAYLOAD
       * -----------------------------------------------------
       *
       * Important:
       *
       * No legacy database fields/functions here.
       */

      const productPayload = {
        name: formData.name.trim(),

        brand_id:
          formData.brand_id || null,

        brand:
          selectedBrandName || null,

        description:
          formData.description.trim() ||
          null,

        image:
          imageUrl || null,

        imageFileId:
          imageFileId || null,

        category:
          formData.category || null,

        badge:
          formData.badge || null,

        scent_collection:
          formData.scent_collection || null,

        price,

        stock,

        is_active:
          Boolean(formData.is_active),

        is_featured: false,

        decants,

        notes: hasQuickViewNotes(
          quickViewNotes
        )
          ? quickViewNotes
          : {},
      };

      /**
       * Existing Firebase admin product action API.
       */

      const result = await callProductAction({
        action: "save",

        productId:
          editingProduct?.id || null,

        product: productPayload,
      }) as { id: string } | undefined;

      // Get the product ID (either from editing or newly created)
      const savedProductId = editingProduct?.id || result?.id || null;

      /**
       * -------------------------------------------------------
       * HANDLE PROMOTION
       * -------------------------------------------------------
       */

      if (formData.hasPromotion) {
        const targetProductId = editingProduct?.id || formData.selectedProductForPromotion?.id || savedProductId;
        const targetProductPrice = editingProduct?.price || formData.selectedProductForPromotion?.price || price;

        if (!targetProductId) {
          setError("Cannot create promotion: No product selected.");
          return;
        }

        const promotionDiscountPercent = parseFloat(formData.promotionDiscountPercent);
        const promotionPrice = parseFloat(formData.promotionPrice);

        // Validate promotion data
        if (!formData.promotionDiscountPercent || isNaN(promotionDiscountPercent) || promotionDiscountPercent <= 0 || promotionDiscountPercent >= 100) {
          setError("Valid discount percentage (1-99%) is required when promotion is enabled.");
          return;
        }

        if (!formData.promotionPrice || isNaN(promotionPrice) || promotionPrice <= 0) {
          setError("Valid promotion price is required when promotion is enabled.");
          return;
        }

        if (promotionPrice >= targetProductPrice) {
          setError("Promotion price must be less than the original product price.");
          return;
        }

        if (!formData.promotionStartDate || !formData.promotionEndDate) {
          setError("Promotion start and end dates are required.");
          return;
        }

        const existingPromotion = productPromotions.get(targetProductId);

        try {
          const promotionPayload = {
            action: existingPromotion ? "update" : "create",
            promotionId: existingPromotion?.id || undefined,
            data: {
              product_id: targetProductId,
              promotion_price: promotionPrice,
              is_active: formData.promotionActive,
              start_at: formData.promotionStartDate,
              end_at: formData.promotionEndDate,
            },
          };

          const promotionResponse = await fetch("/api/admin/product-promotions/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(promotionPayload),
          });

          if (!promotionResponse.ok) {
            const promotionResult = await promotionResponse.json();
            throw new Error(promotionResult.error || "Failed to save promotion");
          }

          await loadProductPromotions();
        } catch (promotionError) {
          devLog.error("Promotion save error:", promotionError);
          setError(
            promotionError instanceof Error
              ? `Product saved, but promotion failed: ${promotionError.message}`
              : "Product saved, but promotion failed."
          );
          return;
        }
      } else if (!formData.hasPromotion) {
        // If promotion checkbox is unchecked, delete existing promotion
        const targetProductId = editingProduct?.id || savedProductId;
        if (targetProductId) {
          const existingPromotion = productPromotions.get(targetProductId);
          if (existingPromotion) {
            try {
              await fetch("/api/admin/product-promotions/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  action: "delete",
                  promotionId: existingPromotion.id,
                }),
              });
              await loadProductPromotions();
            } catch (deleteError) {
              devLog.error("Promotion delete error:", deleteError);
              // Don't fail the whole operation if promotion delete fails
            }
          }
        }
      }

      /**
       * Reset and reload.
       */

      resetForm();

      closeProductForm();

      await loadProducts();
    } catch (err) {
      devLog.error(
        editingProduct
          ? "Update product error:"
          : "Add product error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : editingProduct
          ? "Failed to update product."
          : "Failed to add product."
      );
    } finally {
      setLoading(false);
      setUploadingImage(false);
    }
  };

  /**
   * ---------------------------------------------------------
   * TOGGLE PRODUCT STATUS
   * ---------------------------------------------------------
   */

  const toggleProductStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    setUpdatingProducts((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });

    try {
      await callProductAction({
        action: "setActive",
        productId,
        isActive: !currentStatus,
      });

      await loadProducts();
    } catch (error) {
      devLog.error(
        "Error updating product status:",
        error
      );
    } finally {
      setUpdatingProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  /**
   * ---------------------------------------------------------
   * DELETE
   * ---------------------------------------------------------
   */

  const openDeleteModal = (
    product: Product
  ) => {
    setDeleteError("");
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
    setDeleteError("");
  };

  const confirmDeleteProduct =
    async () => {
      if (!productToDelete) {
        return;
      }

      setDeletingProduct(true);
      setDeleteError("");

      try {
        await callProductAction({
          action: "delete",
          productId: productToDelete.id,

          /**
           * Pass ImageKit fileId so the server can optionally
           * remove the old ImageKit file.
           */
          imageFileId:
            productToDelete.imageFileId ||
            null,
        });

        closeDeleteModal();

        await loadProducts();
      } catch (error) {
        devLog.error(
          "Error deleting product:",
          error
        );

        setDeleteError(
          error instanceof Error
            ? error.message
            : "Failed to delete product. Please try again."
        );
      } finally {
        setDeletingProduct(false);
      }
    };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-black">
            Product Inventory
          </h2>

          <p className="text-sm text-zinc-600">
            {totalProducts} products in inventory
          </p>
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
            onClick={() =>
              openAddProductForm()
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_18px_42px_rgba(234,179,8,0.34)] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Perfume Product
          </button>

          <button
            type="button"
            onClick={() =>
              openAddProductForm(
                "Accessories"
              )
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-5 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 hover:shadow-[0_18px_42px_rgba(234,179,8,0.34)] focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Accessories Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm dark:border-yellow-400/25 dark:bg-[#15100b]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />

          <input
            id="admin-product-search"
            name="admin_product_search"
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search product, brand, or category..."
            className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:placeholder:text-[#fff7e6]/45"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {productStatusFilters.map(
            (item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    item.value
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  statusFilter ===
                  item.value
                    ? "bg-yellow-400 text-black shadow-md"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12] dark:hover:!text-[#d4af37]"
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {productCategoryFilters.map(
            (item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setCategoryFilter(
                    item.value
                  )
                }
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  categoryFilter ===
                  item.value
                    ? "bg-yellow-400 text-black shadow-md"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12] dark:hover:!text-[#d4af37]"
                }`}
              >
                {item.label}
              </button>
            )
          )}
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

      {/* Pagination */}
      {!showListLoading && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">
          <p>
            Showing{" "}
            <span className="font-bold text-black dark:!text-[#fff7e6]">
              {pageStart}
            </span>
            -
            <span className="font-bold text-black dark:!text-[#fff7e6]">
              {pageEnd}
            </span>{" "}
            of{" "}
            <span className="font-bold text-black dark:!text-[#fff7e6]">
              {totalProducts}
            </span>{" "}
            products
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.max(
                      1,
                      page - 1
                    )
                )
              }
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12]"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="rounded-full bg-yellow-50 px-4 py-2 text-sm font-black text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
              {currentPage} /{" "}
              {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage(
                  (page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                )
              }
              disabled={
                currentPage >= totalPages
              }
              className="inline-flex items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 py-2 text-sm font-bold text-neutral-800 transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6]/75 dark:hover:bg-[#231b12]"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Products */}
      {showListLoading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-yellow-400/25 dark:bg-[#15100b]">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-yellow-400 border-t-transparent" />

          <p className="mt-4 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">
            Loading products...
          </p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center dark:border-yellow-400/25 dark:bg-[#15100b]">
          <Package className="mx-auto h-12 w-12 text-zinc-300 dark:text-[#fff7e6]/35" />

          <h3 className="mt-4 text-lg font-bold text-black dark:!text-[#fff7e6]">
            No products found
          </h3>

          <p className="mt-2 text-sm text-zinc-600 dark:!text-[#fff7e6]/65">
            Add your first product to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedProducts.map(
            (product) => (
              <div
                key={product.id}
                className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white text-black shadow-sm transition-all duration-300 hover:border-yellow-400/50 hover:shadow-lg dark:border-yellow-400/25 dark:bg-[#15100b] dark:text-[#fff7e6] dark:shadow-[0_18px_42px_rgba(0,0,0,0.28)] dark:hover:border-yellow-400/45 ${
                  product.category ===
                  "Accessories"
                    ? "w-full max-w-[320px] justify-self-start"
                    : ""
                }`}
              >
                {/* Image */}
                <div
                  className={`relative overflow-hidden bg-zinc-50 dark:bg-[#0f0b07] ${
                    product.category ===
                    "Accessories"
                      ? "h-36 sm:h-40"
                      : "h-40 sm:h-44 lg:h-48"
                  }`}
                >
                  <img
                    src={getSafeProductImage(
                      product.image
                    )}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => {
                      const image =
                        e.currentTarget;

                      if (
                        image.src !==
                        FALLBACK_PRODUCT_IMAGE
                      ) {
                        image.src =
                          FALLBACK_PRODUCT_IMAGE;
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

                {/* Info */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-yellow-600 dark:!text-yellow-300">
                      {product.brands?.name ||
                        product.brand ||
                        "Unlinked brand"}
                    </p>

                    <div className="flex shrink-0 items-center gap-1">
                      {product.brands && (
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                            product.brands
                              .is_active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:!text-emerald-200"
                              : "bg-zinc-100 text-zinc-500 dark:bg-[#231b12] dark:!text-[#fff7e6]/55"
                          }`}
                        >
                          {product.brands
                            .is_active
                            ? "Brand active"
                            : "Brand inactive"}
                        </span>
                      )}

                      {!product.brand_id && (
                        <span className="rounded-full bg-yellow-50 px-2 py-1 text-[10px] font-black uppercase text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
                          Legacy
                        </span>
                      )}

                      {product.category ===
                        "Accessories" && (
                        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700 dark:bg-[#f7e7b3] dark:!text-[#8d5f00]">
                          Accessory
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-1 line-clamp-1 text-base font-bold leading-tight text-black dark:!text-[#fff7e6]">
                    {product.name}
                  </h3>

                  {product.scent_collection && (
                    <div className="mt-1.5">
                      <span className="inline-flex rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-yellow-700 dark:border-yellow-400/30 dark:bg-[#231b12] dark:!text-yellow-300">
                        {
                          product.scent_collection
                        }
                      </span>
                    </div>
                  )}

                  <p className="mt-1 line-clamp-1 min-h-[20px] text-sm text-zinc-600 dark:!text-[#fff7e6]/65">
                    {product.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-lg font-black text-yellow-600 dark:!text-yellow-300">
                      {formatPrice(
                        product.price
                      )}
                    </span>

                    <span className="text-sm font-semibold text-zinc-600 dark:!text-[#fff7e6]/75">
                      Stock:{" "}
                      {product.stock}
                    </span>
                  </div>

                  {product.category !==
                    "Accessories" &&
                    product.decants &&
                    product.decants.length >
                      0 && (
                      <div className="mt-2.5">
                        <p className="text-xs font-semibold text-zinc-500 dark:!text-[#fff7e6]/65">
                          Decant Sizes:
                        </p>

                        <div className="mt-1 flex max-h-[52px] flex-wrap gap-1 overflow-hidden">
                          {product.decants.map(
                            (decant) => (
                              <span
                                key={
                                  decant.label
                                }
                                className="rounded-full border border-transparent bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-yellow-400/20 dark:bg-[#231b12] dark:!text-[#fff7e6]/75"
                              >
                                {
                                  decant.label
                                }{" "}
                                -{" "}
                                {formatPrice(
                                  decant.price
                                )}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Actions */}
                  <div className="mt-3 space-y-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        toggleProductStatus(
                          product.id,
                          product.is_active
                        )
                      }
                      disabled={updatingProducts.has(
                        product.id
                      )}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        product.is_active
                          ? "border border-yellow-200 bg-white text-neutral-800 hover:border-yellow-400 hover:bg-yellow-50 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:hover:bg-[#231b12]"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-950/35 dark:!text-emerald-200"
                      }`}
                      aria-label={
                        product.is_active
                          ? "Deactivate product"
                          : "Activate product"
                      }
                    >
                      {updatingProducts.has(
                        product.id
                      ) ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>
                            Updating...
                          </span>
                        </>
                      ) : product.is_active ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          <span>
                            Deactivate
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            Activate
                          </span>
                        </>
                      )}
                    </button>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          openEditProductForm(
                            product
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-200 bg-white px-4 py-2.5 text-sm font-bold text-neutral-800 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-yellow-400/25 dark:bg-[#1c160f] dark:!text-[#fff7e6] dark:hover:bg-[#231b12]"
                        aria-label="Edit product"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openDeleteModal(
                            product
                          )
                        }
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
            )
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
          <div className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-yellow-300/70 bg-[#fffdf6] shadow-[0_30px_100px_rgba(0,0,0,0.28),0_0_45px_rgba(234,179,8,0.25)]">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-5 backdrop-blur">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-600">
                  {isAccessoryForm
                    ? "Admin Accessory"
                    : "Admin Product"}
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
                onClick={
                  closeProductForm
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-xl font-bold text-black shadow-[0_10px_25px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300"
                aria-label="Close product form"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="scrollbar-auto-hide overflow-y-auto overflow-x-hidden px-6 py-5 overscroll-contain">
              <form
                id="product-form"
                onSubmit={
                  handleAddProduct
                }
                className="space-y-5"
              >
                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      {isAccessoryForm
                        ? "Accessory Name *"
                        : "Product Name *"}
                    </label>

                    <input
                      type="text"
                      name="name"
                      required
                      value={
                        formData.name
                      }
                      onChange={
                        handleInputChange
                      }
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder={
                        isAccessoryForm
                          ? "Travel Atomizer"
                          : "Golden Noir"
                      }
                    />
                  </div>

                  <div>
                    <PremiumSelect
                      label={
                        isAccessoryForm
                          ? "Brand / Maker"
                          : "Brand"
                      }
                      value={
                        formData.brand_id ||
                        (legacyBrand
                          ? `legacy:${legacyBrand}`
                          : "")
                      }
                      placeholder={
                        brandOptions.length >
                        0
                          ? "Select brand"
                          : "Add brands first"
                      }
                      options={
                        brandOptions
                      }
                      onChange={(
                        value
                      ) => {
                        if (
                          value.startsWith(
                            "legacy:"
                          )
                        ) {
                          const legacyName =
                            value.replace(
                              /^legacy:/,
                              ""
                            );

                          setFormData(
                            (prev) => ({
                              ...prev,
                              brand_id:
                                "",
                              brand:
                                legacyName,
                            })
                          );

                          return;
                        }

                        const nextBrand =
                          brands.find(
                            (brand) =>
                              brand.id ===
                              value
                          );

                        setFormData(
                          (prev) => ({
                            ...prev,
                            brand_id:
                              value,
                            brand:
                              nextBrand?.name ||
                              prev.brand,
                          })
                        );
                      }}
                    />

                    {legacyBrand && (
                      <p className="mt-2 text-xs font-bold text-yellow-700">
                        Legacy brand:{" "}
                        {legacyBrand}.
                        Choose a brand
                        to link this
                        product.
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
                    value={
                      formData.description
                    }
                    onChange={
                      handleInputChange
                    }
                    className="min-h-28 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder={
                      isAccessoryForm
                        ? "Premium refillable perfume travel atomizer with a clean leak-resistant finish."
                        : "Warm amber, vanilla, dark wood"
                    }
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
                      value={
                        formData.price
                      }
                      onChange={
                        handleInputChange
                      }
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder={
                        isAccessoryForm
                          ? "25000"
                          : "89000"
                      }
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
                      value={
                        formData.stock
                      }
                      onChange={
                        handleInputChange
                      }
                      className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                      placeholder={
                        isAccessoryForm
                          ? "25"
                          : "45"
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <PremiumSelect
                    label="Badge"
                    value={
                      formData.badge ||
                      ""
                    }
                    placeholder="No badge"
                    options={[
                      {
                        label:
                          "No badge",
                        value: "",
                      },
                      {
                        label:
                          "Best Seller",
                        value:
                          "Best Seller",
                      },
                      {
                        label: "New",
                        value: "New",
                      },
                      {
                        label:
                          "Limited",
                        value:
                          "Limited",
                      },
                    ]}
                    onChange={(
                      value
                    ) =>
                      setFormData(
                        (prev) => ({
                          ...prev,
                          badge: value,
                        })
                      )
                    }
                  />

                  {!isAccessoryForm && (
                    <PremiumSelect
                      label="Scent Collection"
                      value={
                        formData.scent_collection ||
                        ""
                      }
                      placeholder="Select scent collection"
                      options={scentCollectionOptions.map(
                        (option) => ({
                          label:
                            option.label,
                          value:
                            option.value,
                        })
                      )}
                      onChange={(
                        value
                      ) =>
                        setFormData(
                          (prev) => ({
                            ...prev,
                            scent_collection:
                              value,
                          })
                        )
                      }
                    />
                  )}
                </div>

                {/* ImageKit Upload */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-neutral-800">
                    Product Image
                  </label>

                  <div
                    onClick={() =>
                      !uploadingImage &&
                      fileInputRef.current?.click()
                    }
                    className={`flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-yellow-300 bg-yellow-50/50 px-4 py-5 transition ${
                      uploadingImage
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:border-yellow-400 hover:bg-yellow-50"
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
                    ) : (
                      <Upload className="h-5 w-5 text-yellow-600" />
                    )}

                    <div>
                      <p className="text-sm font-bold text-neutral-800">
                        {imageFile
                          ? imageFile.name
                          : "Click to upload image"}
                      </p>

                      <p className="text-xs text-neutral-500">
                        ImageKit • PNG, JPG,
                        WEBP — max 5MB
                      </p>
                    </div>
                  </div>

                  <input
                    ref={
                      fileInputRef
                    }
                    id="product-image-upload"
                    name="product_image_upload"
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={
                      handleImageChange
                    }
                  />

                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-yellow-200" />

                    <span className="text-xs font-semibold text-neutral-400">
                      OR paste URL
                    </span>

                    <div className="h-px flex-1 bg-yellow-200" />
                  </div>

                  <input
                    type="text"
                    name="image"
                    value={
                      formData.image
                    }
                    onChange={(e) => {
                      handleInputChange(
                        e
                      );

                      if (
                        e.target.value
                      ) {
                        setImageFile(
                          null
                        );
                        setImagePreview(
                          ""
                        );

                        setFormData(
                          (prev) => ({
                            ...prev,
                            imageFileId:
                              "",
                          })
                        );

                        if (
                          fileInputRef.current
                        ) {
                          fileInputRef.current.value =
                            "";
                        }
                      }
                    }}
                    className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                    placeholder="https://ik.imagekit.io/..."
                  />

                  {(imagePreview ||
                    formData.image) && (
                    <div className="relative mt-3 overflow-hidden rounded-2xl border border-yellow-200 bg-white p-2">
                      <img
                        src={
                          imagePreview ||
                          getSafeProductImage(
                            formData.image
                          )
                        }
                        alt="Product preview"
                        className="h-48 w-full rounded-xl object-cover"
                        onError={(e) => {
                          const image =
                            e.currentTarget;

                          if (
                            image.src !==
                            FALLBACK_PRODUCT_IMAGE
                          ) {
                            image.src =
                              FALLBACK_PRODUCT_IMAGE;
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(
                            null
                          );

                          setImagePreview(
                            ""
                          );

                          setFormData(
                            (prev) => ({
                              ...prev,
                              image: "",
                              imageFileId:
                                "",
                            })
                          );

                          if (
                            fileInputRef.current
                          ) {
                            fileInputRef.current.value =
                              "";
                          }
                        }}
                        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick View */}
                <div className="rounded-[24px] border border-yellow-200 bg-white/70 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-600">
                      {isAccessoryForm
                        ? "Accessory Details"
                        : "Quick View Details"}
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
                        {isAccessoryForm
                          ? "Product Details"
                          : "The Story"}
                      </label>

                      <textarea
                        name="quickStory"
                        value={
                          formData.quickStory
                        }
                        onChange={
                          handleInputChange
                        }
                        className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                        placeholder={
                          isAccessoryForm
                            ? "A short realistic description of the accessory, finish, and daily use."
                            : "A short realistic story about the fragrance, mood, and character."
                        }
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm
                            ? "Key Features"
                            : "Top Notes"}
                        </label>

                        <input
                          type="text"
                          name="topNotes"
                          value={
                            formData.topNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={
                            isAccessoryForm
                              ? "Refillable, Leak-resistant"
                              : "Bergamot, Citrus"
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm
                            ? "Materials"
                            : "Heart Notes"}
                        </label>

                        <input
                          type="text"
                          name="heartNotes"
                          value={
                            formData.heartNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={
                            isAccessoryForm
                              ? "Glass, Metal"
                              : "Jasmine, Rose"
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          {isAccessoryForm
                            ? "Care Tips"
                            : "Base Notes"}
                        </label>

                        <input
                          type="text"
                          name="baseNotes"
                          value={
                            formData.baseNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={
                            isAccessoryForm
                              ? "Keep dry, Clean gently"
                              : "Amber, Vanilla"
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          Made With
                        </label>

                        <textarea
                          name="madeWith"
                          value={
                            formData.madeWith
                          }
                          onChange={
                            handleInputChange
                          }
                          className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={
                            isAccessoryForm
                              ? "Durable materials selected for daily perfume storage and gifting."
                              : "Premium oils, clean alcohol base, and carefully balanced aroma compounds."
                          }
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-bold text-neutral-800">
                          Best For
                        </label>

                        <textarea
                          name="bestFor"
                          value={
                            formData.bestFor
                          }
                          onChange={
                            handleInputChange
                          }
                          className="min-h-24 w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                          placeholder={
                            isAccessoryForm
                              ? "Travel, gifting, handbag carry, and perfume refills."
                              : "Daily wear, evening events, office, dates, or special occasions."
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Decants */}
                {!isAccessoryForm && (
                  <div>
                    <label className="mb-2 block text-sm font-bold text-neutral-800">
                      Decant Sizes (Price in
                      MMK)
                    </label>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      {[
                        {
                          label: "5ml",
                          name: "decant5ml",
                          value:
                            formData.decant5ml,
                        },
                        {
                          label: "10ml",
                          name: "decant10ml",
                          value:
                            formData.decant10ml,
                        },
                        {
                          label: "20ml",
                          name: "decant20ml",
                          value:
                            formData.decant20ml,
                        },
                        {
                          label: "30ml",
                          name: "decant30ml",
                          value:
                            formData.decant30ml,
                        },
                      ].map(
                        (decant) => (
                          <div
                            key={
                              decant.name
                            }
                          >
                            <label className="mb-1 block text-xs font-semibold text-neutral-600">
                              {
                                decant.label
                              }
                            </label>

                            <input
                              type="number"
                              name={
                                decant.name
                              }
                              min="0"
                              step="0.01"
                              value={
                                decant.value
                              }
                              onChange={
                                handleInputChange
                              }
                              className="w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                              placeholder="12000"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Promotion Section */}
                <div className="rounded-[24px] border border-yellow-200 bg-white/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-600">
                        PRODUCT PROMOTION
                      </p>
                      <p className="mt-1 text-sm text-neutral-500">
                        {editingProduct ? "Set promotional pricing for this product" : "Add promotion to this new product"}
                      </p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.hasPromotion}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({ 
                            ...prev, 
                            hasPromotion: checked,
                            selectedProductForPromotion: checked && editingProduct ? editingProduct : prev.selectedProductForPromotion,
                          }));
                          if (!checked) {
                            setShowProductSelector(false);
                            setProductSearchQuery("");
                          }
                        }}
                        className="h-4 w-4 rounded border-yellow-300 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                      />
                      <span className="text-sm font-semibold text-neutral-800">Enable Promotion</span>
                    </label>
                  </div>

                  {formData.hasPromotion && (
                    <div className="space-y-4">
                      {/* Existing Product Selector for NEW products */}
                      {!editingProduct && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-neutral-800">
                              Select Existing Product for Promotion
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowProductSelector(!showProductSelector)}
                              className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-left text-sm font-semibold text-neutral-900 transition hover:border-yellow-400 focus:border-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200/60"
                            >
                              {formData.selectedProductForPromotion ? (
                                <span className="flex items-center gap-3">
                                  {formData.selectedProductForPromotion.image && (
                                    <img 
                                      src={getSafeProductImage(formData.selectedProductForPromotion.image)} 
                                      alt={formData.selectedProductForPromotion.name}
                                      className="h-10 w-10 rounded-lg object-cover"
                                    />
                                  )}
                                  <span className="flex-1">
                                    <span className="font-bold">{formData.selectedProductForPromotion.name}</span>
                                    <span className="ml-2 text-neutral-500">• {formData.selectedProductForPromotion.brand}</span>
                                  </span>
                                  <span className="font-black text-yellow-600">{formatPrice(formData.selectedProductForPromotion.price)}</span>
                                </span>
                              ) : (
                                "Choose a product..."
                              )}
                            </button>
                          </div>

                          {showProductSelector && (
                            <div className="rounded-2xl border border-yellow-200 bg-white p-4">
                              {/* Search */}
                              <div className="mb-4">
                                <input
                                  type="text"
                                  placeholder="Search products by name or brand..."
                                  value={productSearchQuery}
                                  onChange={(e) => setProductSearchQuery(e.target.value)}
                                  className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                                />
                              </div>

                              {/* Horizontal Product Scroller */}
                              <div className="relative">
                                {/* Left Arrow */}
                                {selectorScrollPosition > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const container = document.getElementById('product-selector-scroll');
                                      if (container) {
                                        container.scrollBy({ left: -300, behavior: 'smooth' });
                                      }
                                    }}
                                    className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-300 bg-white text-yellow-600 shadow-lg transition hover:border-yellow-400 hover:bg-yellow-50"
                                  >
                                    <ChevronLeft className="h-5 w-5" />
                                  </button>
                                )}

                                {/* Products Container */}
                                <div 
                                  id="product-selector-scroll"
                                  className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-yellow-300"
                                  onScroll={(e) => {
                                    const target = e.target as HTMLDivElement;
                                    setSelectorScrollPosition(target.scrollLeft);
                                  }}
                                >
                                  {products
                                    .filter(p => {
                                      if (!productSearchQuery.trim()) return true;
                                      const search = productSearchQuery.toLowerCase();
                                      return (
                                        p.name.toLowerCase().includes(search) ||
                                        p.brand?.toLowerCase().includes(search) ||
                                        p.brands?.name.toLowerCase().includes(search)
                                      );
                                    })
                                    .map((product) => (
                                      <div 
                                        key={product.id}
                                        onClick={() => {
                                          setFormData(prev => ({ 
                                            ...prev, 
                                            selectedProductForPromotion: product,
                                            promotionDiscountPercent: "",
                                            promotionPrice: "",
                                          }));
                                          setShowProductSelector(false);
                                          setProductSearchQuery("");
                                        }}
                                        className="group relative flex w-[220px] flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-yellow-200 bg-white transition-all hover:border-yellow-400 hover:shadow-lg"
                                      >
                                        {/* Product Image */}
                                        <div className="relative h-[140px] w-full overflow-hidden bg-gradient-to-br from-[#fff7e6] via-white to-[#f8eeee]">
                                          <img 
                                            src={getSafeProductImage(product.image)} 
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            onError={(e) => {
                                              const img = e.currentTarget;
                                              img.src = "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";
                                            }}
                                          />
                                          {product.badge && (
                                            <div className="absolute left-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-bold uppercase text-black">
                                              {product.badge}
                                            </div>
                                          )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-3">
                                          <p className="truncate text-[10px] font-black uppercase tracking-wider text-yellow-600">
                                            {product.brands?.name || product.brand}
                                          </p>
                                          <h4 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-black text-neutral-900">
                                            {product.name}
                                          </h4>
                                          <p className="mt-2 text-base font-black text-yellow-600">
                                            {formatPrice(product.price)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                </div>

                                {/* Right Arrow */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const container = document.getElementById('product-selector-scroll');
                                    if (container) {
                                      container.scrollBy({ left: 300, behavior: 'smooth' });
                                    }
                                  }}
                                  className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-yellow-300 bg-white text-yellow-600 shadow-lg transition hover:border-yellow-400 hover:bg-yellow-50"
                                >
                                  <ChevronRight className="h-5 w-5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Promotion Details - Show for both new products (if product selected) and editing */}
                      {(editingProduct || formData.selectedProductForPromotion) && (
                        <>
                          {/* Selected Product Display */}
                          {formData.selectedProductForPromotion && (
                            <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white p-4">
                              <div className="flex items-center gap-4">
                                {formData.selectedProductForPromotion.image && (
                                  <img 
                                    src={getSafeProductImage(formData.selectedProductForPromotion.image)} 
                                    alt={formData.selectedProductForPromotion.name}
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-bold uppercase text-yellow-600">Selected Product</p>
                                  <p className="mt-1 font-black text-neutral-900">{formData.selectedProductForPromotion.name}</p>
                                  <p className="text-sm text-neutral-600">{formData.selectedProductForPromotion.brand}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold uppercase text-neutral-500">Original Price</p>
                                  <p className="text-xl font-black text-yellow-600">{formatPrice(formData.selectedProductForPromotion.price)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Or for editing existing product */}
                          {editingProduct && !formData.selectedProductForPromotion && (
                            <div className="rounded-xl border border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-white p-4">
                              <div className="flex items-center gap-4">
                                {editingProduct.image && (
                                  <img 
                                    src={getSafeProductImage(editingProduct.image)} 
                                    alt={editingProduct.name}
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-bold uppercase text-yellow-600">Product</p>
                                  <p className="mt-1 font-black text-neutral-900">{editingProduct.name}</p>
                                  <p className="text-sm text-neutral-600">{editingProduct.brands?.name || editingProduct.brand}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold uppercase text-neutral-500">Original Price</p>
                                  <p className="text-xl font-black text-yellow-600">{formatPrice(editingProduct.price)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Discount Percentage Input */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-bold text-neutral-800">
                                Discount Percentage *
                              </label>
                              <input
                                type="number"
                                name="promotionDiscountPercent"
                                required={formData.hasPromotion}
                                min="1"
                                max="99"
                                step="1"
                                value={formData.promotionDiscountPercent}
                                onChange={(e) => {
                                  const percent = e.target.value;
                                  const originalPrice = editingProduct?.price || formData.selectedProductForPromotion?.price || 0;
                                  const promotionPrice = originalPrice > 0 && percent 
                                    ? Math.round(originalPrice * (1 - parseFloat(percent) / 100))
                                    : "";
                                  setFormData(prev => ({
                                    ...prev,
                                    promotionDiscountPercent: percent,
                                    promotionPrice: String(promotionPrice),
                                  }));
                                }}
                                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                                placeholder="25"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-neutral-800">
                                Promotion Price (MMK)
                              </label>
                              <div className="w-full rounded-2xl border border-yellow-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                                {formData.promotionPrice ? formatPrice(parseFloat(formData.promotionPrice)) : '---'}
                              </div>
                            </div>
                          </div>

                          {/* Discount Display */}
                          {formData.promotionDiscountPercent && formData.promotionPrice && parseFloat(formData.promotionPrice) > 0 && (
                            <div className="flex items-center gap-3 rounded-2xl bg-green-50 px-4 py-3 border border-green-200">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white font-black text-lg">
                                %
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold uppercase text-green-700">You Save</p>
                                <p className="text-lg font-black text-green-600">
                                  {formData.promotionDiscountPercent}% OFF • {formatPrice((editingProduct?.price || formData.selectedProductForPromotion?.price || 0) - parseFloat(formData.promotionPrice))} Saved
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Promotion Dates */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-sm font-bold text-neutral-800">
                                Start Date & Time *
                              </label>
                              <input
                                type="datetime-local"
                                name="promotionStartDate"
                                required={formData.hasPromotion}
                                value={formData.promotionStartDate}
                                onChange={handleInputChange}
                                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-neutral-800">
                                End Date & Time *
                              </label>
                              <input
                                type="datetime-local"
                                name="promotionEndDate"
                                required={formData.hasPromotion}
                                value={formData.promotionEndDate}
                                onChange={handleInputChange}
                                className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 placeholder:text-neutral-400 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                              />
                            </div>
                          </div>

                          {/* Promotion Active Toggle */}
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              name="promotionActive"
                              id="promotion_active"
                              checked={formData.promotionActive}
                              onChange={handleInputChange}
                              className="h-4 w-4 rounded border-yellow-300 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                            />
                            <label
                              htmlFor="promotion_active"
                              className="text-sm font-semibold text-neutral-800"
                            >
                              Promotion Active (visible to customers)
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={
                      formData.is_active
                    }
                    onChange={
                      handleInputChange
                    }
                    className="h-4 w-4 rounded border-yellow-300 text-yellow-400 focus:ring-2 focus:ring-yellow-400"
                  />

                  <label
                    htmlFor="is_active"
                    className="text-sm font-semibold text-neutral-800"
                  >
                    Active (visible on
                    client products
                    page)
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t border-yellow-200/70 bg-[#fffdf6]/95 px-6 py-4 backdrop-blur">
              <button
                type="button"
                onClick={
                  closeProductForm
                }
                disabled={loading}
                className="rounded-full border border-yellow-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="product-form"
                disabled={
                  loading ||
                  uploadingImage
                }
                className="rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-[0_14px_35px_rgba(234,179,8,0.35)] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {showImageUploadLoading
                  ? "Uploading image..."
                  : showSaveLoading
                  ? editingProduct
                    ? "Saving..."
                    : isAccessoryForm
                    ? "Adding Accessory..."
                    : "Adding..."
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

      {/* Delete Modal */}
      {showDeleteModal &&
        productToDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-md">
            <div className="relative w-full max-w-md overflow-hidden rounded-[24px] border border-red-300/70 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.35),0_0_45px_rgba(239,68,68,0.25)]">
              <div className="border-b border-red-200/70 px-6 py-5">
                <h2 className="text-xl font-black text-neutral-950">
                  Delete Product?
                </h2>

                <p className="mt-2 text-sm text-neutral-600">
                  This action permanently
                  removes &quot;
                  {
                    productToDelete.name
                  }
                  &quot; and cannot be
                  undone.
                </p>

                {deleteError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
                  >
                    {deleteError}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={
                    closeDeleteModal
                  }
                  disabled={
                    deletingProduct
                  }
                  className="rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    confirmDeleteProduct
                  }
                  disabled={
                    deletingProduct
                  }
                  className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-black text-white shadow-[0_14px_35px_rgba(239,68,68,0.35)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingProduct ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                      <span>
                        Deleting...
                      </span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />

                      <span>
                        Delete Product
                      </span>
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