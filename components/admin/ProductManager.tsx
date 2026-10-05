"use client";
import StudioErrorText from "@/components/ui/StudioErrorText";
import StudioModal from "@/components/ui/StudioModal";
import devLog from "@/lib/dev-log";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
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
import StudioRowActions from "@/components/ui/StudioRowActions";
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

    const form = new FormData();
    form.append("file", file);
    form.append("folder", "/gosh/products");
    const response = await fetch("/api/upload/imagekit", { method: "POST", credentials: "include", body: form });

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
      name: result.name || "product-image",
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

        expectedStock: editingProduct ? Number(editingProduct.stock || 0) : undefined,

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
          <h2 className="text-xl font-bold text-ink">
            Product Inventory
          </h2>

          <p className="text-sm text-secondary">
            {totalProducts} products in inventory
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:w-auto lg:grid-cols-3">
          <a
            href="/admin/brands"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
          >
            <Tags className="h-4 w-4" />
            Manage Brands
          </a>

          <button
            type="button"
            onClick={() =>
              openAddProductForm()
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand hover:shadow-panel focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Accessories Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-line bg-surface p-4 shadow-soft  ">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />

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
            className="w-full rounded-xl border border-line bg-surface py-3 pl-12 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-focus focus:ring-4 focus:ring-focus/15    "
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
                    ? "bg-brand text-on-brand shadow-soft"
                    : "border border-line bg-surface text-secondary hover:border-line hover:bg-accent-soft     "
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
                    ? "bg-brand text-on-brand shadow-soft"
                    : "border border-line bg-surface text-secondary hover:border-line hover:bg-accent-soft     "
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <div className="w-full max-w-[320px] border-t border-line pt-3 ">
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-secondary ">
          <p>
            Showing{" "}
            <span className="font-bold text-ink ">
              {pageStart}
            </span>
            -
            <span className="font-bold text-ink ">
              {pageEnd}
            </span>{" "}
            of{" "}
            <span className="font-bold text-ink ">
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
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:border-line hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50    "
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>

            <span className="rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent  ">
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
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:border-line hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50    "
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Products */}
      {showListLoading ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center  ">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-transparent" />

          <p className="mt-4 text-sm text-secondary ">
            Loading products...
          </p>
        </div>
      ) : paginatedProducts.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-12 text-center  ">
          <Package className="mx-auto h-12 w-12 text-faint " />

          <h3 className="mt-4 text-lg font-bold text-ink ">
            No products found
          </h3>

          <p className="mt-2 text-sm text-secondary ">
            Add your first product to get started.
          </p>
        </div>
      ) : (
        <div className="studio-table">
          {paginatedProducts.map(
            (product) => (
              <article key={product.id} className="studio-table-row studio-admin-product-row">
    <div className="relative h-[88px] w-[72px] overflow-hidden rounded-lg bg-surface-muted"><img src={getSafeProductImage(product.image)} alt={product.name} loading="lazy" className="h-full w-full object-cover" onError={event => { const image = event.currentTarget; if (image.src !== FALLBACK_PRODUCT_IMAGE) image.src = FALLBACK_PRODUCT_IMAGE; }} /></div>
    <div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-accent">{product.brands?.name || product.brand || "Unlinked brand"}</p><h3 className="mt-1 text-sm font-semibold text-ink">{product.name}</h3><p className="mt-1 line-clamp-1 text-xs text-muted">{product.description}</p><div className="mt-2 flex flex-wrap gap-1.5">
      <span className={"rounded-md px-2 py-1 text-[10px] " + (product.is_active ? "bg-success-soft text-success" : "bg-surface-muted text-muted")}>{product.is_active ? "Active" : "Inactive"}</span>
      {product.badge && <span className="rounded-md bg-accent-soft px-2 py-1 text-[10px] text-accent">{product.badge}</span>}
      {product.brands && <span className={"rounded-md px-2 py-1 text-[10px] " + (product.brands.is_active ? "bg-success-soft text-success" : "bg-surface-muted text-muted")}>{product.brands.is_active ? "Brand active" : "Brand inactive"}</span>}
      {!product.brand_id && <span className="rounded-md bg-warning-soft px-2 py-1 text-[10px] text-warning">Legacy</span>}
      {product.scent_collection && <span className="rounded-md border border-line px-2 py-1 text-[10px] text-muted">{product.scent_collection}</span>}
      {product.category === "Accessories" && <span className="rounded-md bg-accent-soft px-2 py-1 text-[10px] text-accent">Accessory</span>}
    </div></div>
    <div className="studio-admin-product-price"><div className="flex flex-wrap items-baseline justify-between gap-2 text-xs"><span className="font-medium tabular-nums text-ink">{formatPrice(product.price)}</span><span className="tabular-nums text-muted">Stock: {product.stock}</span></div>
      {product.category !== "Accessories" && product.decants && product.decants.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{product.decants.map(decant => <span key={decant.label} className="rounded-md bg-surface-muted px-2 py-1 text-[10px] text-secondary">{decant.label} · {formatPrice(decant.price)}</span>)}</div>}
    </div>
    <StudioRowActions label={"Actions for " + product.name}>
      <button type="button" onClick={() => toggleProductStatus(product.id, product.is_active)} disabled={updatingProducts.has(product.id)} className="studio-compact-button">{updatingProducts.has(product.id) ? "Updating…" : product.is_active ? "Deactivate" : "Activate"}</button>
      <button type="button" onClick={() => openEditProductForm(product)} className="studio-compact-button"><Edit size={14} />Edit</button>
      <button type="button" onClick={() => openDeleteModal(product)} className="studio-compact-button text-destructive"><Trash2 size={14} />Delete</button>
    </StudioRowActions>
  </article>
            )
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay px-4 py-6 ">
          <StudioModal label="Product editor" onDismiss={closeProductForm} lockScroll={false} className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-panel">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface/95 px-6 py-5 ">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
                  {isAccessoryForm
                    ? "Admin Accessory"
                    : "Admin Product"}
                </p>

                <h2 className="mt-1 text-2xl font-semibold text-ink">
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xl font-bold text-on-brand shadow-panel transition hover:bg-brand"
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
                    className="rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-semibold text-destructive"
                  >
                    <StudioErrorText message={error} />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="studio-components-admin-ProductManager-1" className="mb-2 block text-sm font-bold text-ink">
                      {isAccessoryForm
                        ? "Accessory Name *"
                        : "Product Name *"}
                    </label>

                    <input id="studio-components-admin-ProductManager-1"
                      type="text"
                      name="name"
                      required
                      value={
                        formData.name
                      }
                      onChange={
                        handleInputChange
                      }
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
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
                      <p className="mt-2 text-xs font-bold text-accent">
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
                  <label htmlFor="studio-components-admin-ProductManager-2" className="mb-2 block text-sm font-bold text-ink">
                    Description
                  </label>

                  <textarea id="studio-components-admin-ProductManager-2"
                    name="description"
                    value={
                      formData.description
                    }
                    onChange={
                      handleInputChange
                    }
                    className="min-h-28 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                    placeholder={
                      isAccessoryForm
                        ? "Premium refillable perfume travel atomizer with a clean leak-resistant finish."
                        : "Warm amber, vanilla, dark wood"
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="studio-components-admin-ProductManager-3" className="mb-2 block text-sm font-bold text-ink">
                      Price (MMK) *
                    </label>

                    <input id="studio-components-admin-ProductManager-3"
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
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                      placeholder={
                        isAccessoryForm
                          ? "25000"
                          : "89000"
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="studio-components-admin-ProductManager-4" className="mb-2 block text-sm font-bold text-ink">
                      Stock
                    </label>

                    <input id="studio-components-admin-ProductManager-4"
                      type="number"
                      name="stock"
                      min="0"
                      value={
                        formData.stock
                      }
                      onChange={
                        handleInputChange
                      }
                      className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
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

                  {formData.badge === "New" && (
                    <div className="mt-2 rounded-lg border border-info bg-info-soft p-3  ">
                      <p className="text-sm text-info ">
                        <strong>Note:</strong> The &quot;New&quot; badge is independent of promotions. Use it for new products. Creating a promotion for an existing product does not automatically add this badge.
                      </p>
                    </div>
                  )}

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
                  <label className="mb-2 block text-sm font-bold text-ink">
                    Product Image
                  </label>

                  <div
                    onClick={() =>
                      !uploadingImage &&
                      fileInputRef.current?.click()
                    }
                    className={`flex items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-accent-soft/50 px-4 py-5 transition ${
                      uploadingImage
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer hover:border-line hover:bg-accent-soft"
                    }`}
                  >
                    {uploadingImage ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-transparent" />
                    ) : (
                      <Upload className="h-5 w-5 text-accent" />
                    )}

                    <div>
                      <p className="text-sm font-bold text-ink">
                        {imageFile
                          ? imageFile.name
                          : "Click to upload image"}
                      </p>

                      <p className="text-xs text-muted">
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
                    <div className="h-px flex-1 bg-accent-soft" />

                    <span className="text-xs font-semibold text-muted">
                      OR paste URL
                    </span>

                    <div className="h-px flex-1 bg-accent-soft" />
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
                    className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                    placeholder="https://ik.imagekit.io/..."
                  />

                  {(imagePreview ||
                    formData.image) && (
                    <div className="relative mt-3 overflow-hidden rounded-xl border border-line bg-surface p-2">
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
                        className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-on-brand transition hover:bg-brand/80"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Quick View */}
                <div className="rounded-xl border border-line bg-surface/70 p-4">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                      {isAccessoryForm
                        ? "Accessory Details"
                        : "Quick View Details"}
                    </p>

                    <p className="mt-1 text-sm text-muted">
                      {isAccessoryForm
                        ? "Optional content shown inside accessory quick view."
                        : "Optional content shown inside product quick view."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="studio-components-admin-ProductManager-5" className="mb-2 block text-sm font-bold text-ink">
                        {isAccessoryForm
                          ? "Product Details"
                          : "The Story"}
                      </label>

                      <textarea id="studio-components-admin-ProductManager-5"
                        name="quickStory"
                        value={
                          formData.quickStory
                        }
                        onChange={
                          handleInputChange
                        }
                        className="min-h-24 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                        placeholder={
                          isAccessoryForm
                            ? "A short realistic description of the accessory, finish, and daily use."
                            : "A short realistic story about the fragrance, mood, and character."
                        }
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label htmlFor="studio-components-admin-ProductManager-6" className="mb-2 block text-sm font-bold text-ink">
                          {isAccessoryForm
                            ? "Key Features"
                            : "Top Notes"}
                        </label>

                        <input id="studio-components-admin-ProductManager-6"
                          type="text"
                          name="topNotes"
                          value={
                            formData.topNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                          placeholder={
                            isAccessoryForm
                              ? "Refillable, Leak-resistant"
                              : "Bergamot, Citrus"
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor="studio-components-admin-ProductManager-7" className="mb-2 block text-sm font-bold text-ink">
                          {isAccessoryForm
                            ? "Materials"
                            : "Heart Notes"}
                        </label>

                        <input id="studio-components-admin-ProductManager-7"
                          type="text"
                          name="heartNotes"
                          value={
                            formData.heartNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                          placeholder={
                            isAccessoryForm
                              ? "Glass, Metal"
                              : "Jasmine, Rose"
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor="studio-components-admin-ProductManager-8" className="mb-2 block text-sm font-bold text-ink">
                          {isAccessoryForm
                            ? "Care Tips"
                            : "Base Notes"}
                        </label>

                        <input id="studio-components-admin-ProductManager-8"
                          type="text"
                          name="baseNotes"
                          value={
                            formData.baseNotes
                          }
                          onChange={
                            handleInputChange
                          }
                          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
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
                        <label htmlFor="studio-components-admin-ProductManager-9" className="mb-2 block text-sm font-bold text-ink">
                          Made With
                        </label>

                        <textarea id="studio-components-admin-ProductManager-9"
                          name="madeWith"
                          value={
                            formData.madeWith
                          }
                          onChange={
                            handleInputChange
                          }
                          className="min-h-24 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                          placeholder={
                            isAccessoryForm
                              ? "Durable materials selected for daily perfume storage and gifting."
                              : "Premium oils, clean alcohol base, and carefully balanced aroma compounds."
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor="studio-components-admin-ProductManager-10" className="mb-2 block text-sm font-bold text-ink">
                          Best For
                        </label>

                        <textarea id="studio-components-admin-ProductManager-10"
                          name="bestFor"
                          value={
                            formData.bestFor
                          }
                          onChange={
                            handleInputChange
                          }
                          className="min-h-24 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
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
                    <label htmlFor="studio-components-admin-ProductManager-11" className="mb-2 block text-sm font-bold text-ink">
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
                            <label className="mb-1 block text-xs font-semibold text-secondary">
                              {
                                decant.label
                              }
                            </label>

                            <input id="studio-components-admin-ProductManager-11"
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
                              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                              placeholder="12000"
                            />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Promotion Section */}
                <div className="rounded-xl border border-line bg-surface/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                        PRODUCT PROMOTION
                      </p>
                      <p className="mt-1 text-sm text-muted">
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
                        className="h-4 w-4 rounded border-line text-accent focus:ring-2 focus:ring-focus"
                      />
                      <span className="text-sm font-semibold text-ink">Enable Promotion</span>
                    </label>
                  </div>

                  {formData.hasPromotion && (
                    <div className="space-y-4">
                      {/* Existing Product Selector for NEW products */}
                      {!editingProduct && (
                        <>
                          <div>
                            <label className="mb-2 block text-sm font-bold text-ink">
                              Select Existing Product for Promotion
                            </label>
                            <button
                              type="button"
                              onClick={() => setShowProductSelector(!showProductSelector)}
                              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-semibold text-ink transition hover:border-line focus:border-focus focus:outline-none focus:ring-4 focus:ring-focus/15"
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
                                    <span className="ml-2 text-muted">• {formData.selectedProductForPromotion.brand}</span>
                                  </span>
                                  <span className="font-semibold text-accent">{formatPrice(formData.selectedProductForPromotion.price)}</span>
                                </span>
                              ) : (
                                "Choose a product..."
                              )}
                            </button>
                          </div>

                          {showProductSelector && (
                            <div className="rounded-xl border border-line bg-surface p-4">
                              {/* Search */}
                              <div className="mb-4">
                                <input
                                  type="text"
                                  placeholder="Search products by name or brand..."
                                  value={productSearchQuery}
                                  onChange={(e) => setProductSearchQuery(e.target.value)}
                                  className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
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
                                    className="absolute left-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-accent shadow-soft transition hover:border-line hover:bg-accent-soft"
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
                                        className="group relative flex w-[220px] flex-shrink-0 cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-line bg-surface transition-all hover:border-line hover:shadow-soft"
                                      >
                                        {/* Product Image */}
                                        <div className="relative h-[140px] w-full overflow-hidden bg-surface-muted">
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
                                            <div className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-[10px] font-bold uppercase text-on-brand">
                                              {product.badge}
                                            </div>
                                          )}
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-3">
                                          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-accent">
                                            {product.brands?.name || product.brand}
                                          </p>
                                          <h4 className="mt-1 line-clamp-2 min-h-[32px] text-sm font-semibold text-ink">
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
                                  onClick={() => {
                                    const container = document.getElementById('product-selector-scroll');
                                    if (container) {
                                      container.scrollBy({ left: 300, behavior: 'smooth' });
                                    }
                                  }}
                                  className="absolute right-0 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-2 border-line bg-surface text-accent shadow-soft transition hover:border-line hover:bg-accent-soft"
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
                            <div className="rounded-xl border border-line bg-accent-soft p-4">
                              <div className="flex items-center gap-4">
                                {formData.selectedProductForPromotion.image && (
                                  <img
                                    src={getSafeProductImage(formData.selectedProductForPromotion.image)}
                                    alt={formData.selectedProductForPromotion.name}
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-bold uppercase text-accent">Selected Product</p>
                                  <p className="mt-1 font-semibold text-ink">{formData.selectedProductForPromotion.name}</p>
                                  <p className="text-sm text-secondary">{formData.selectedProductForPromotion.brand}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold uppercase text-muted">Original Price</p>
                                  <p className="text-xl font-semibold text-accent">{formatPrice(formData.selectedProductForPromotion.price)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Or for editing existing product */}
                          {editingProduct && !formData.selectedProductForPromotion && (
                            <div className="rounded-xl border border-line bg-accent-soft p-4">
                              <div className="flex items-center gap-4">
                                {editingProduct.image && (
                                  <img
                                    src={getSafeProductImage(editingProduct.image)}
                                    alt={editingProduct.name}
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                )}
                                <div className="flex-1">
                                  <p className="text-xs font-bold uppercase text-accent">Product</p>
                                  <p className="mt-1 font-semibold text-ink">{editingProduct.name}</p>
                                  <p className="text-sm text-secondary">{editingProduct.brands?.name || editingProduct.brand}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold uppercase text-muted">Original Price</p>
                                  <p className="text-xl font-semibold text-accent">{formatPrice(editingProduct.price)}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Discount Percentage Input */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="studio-components-admin-ProductManager-12" className="mb-2 block text-sm font-bold text-ink">
                                Discount Percentage *
                              </label>
                              <input id="studio-components-admin-ProductManager-12"
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
                                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15"
                                placeholder="25"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-ink">
                                Promotion Price (MMK)
                              </label>
                              <div className="w-full rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm font-semibold text-muted">
                                {formData.promotionPrice ? formatPrice(parseFloat(formData.promotionPrice)) : '---'}
                              </div>
                            </div>
                          </div>

                          {/* Discount Display */}
                          {formData.promotionDiscountPercent && formData.promotionPrice && parseFloat(formData.promotionPrice) > 0 && (
                            <div className="flex items-center gap-3 rounded-xl bg-success-soft px-4 py-3 border border-success">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-on-brand font-semibold text-lg">
                                %
                              </div>
                              <div className="flex-1">
                                <p className="text-xs font-bold uppercase text-success">You Save</p>
                                <p className="text-lg font-semibold text-success">
                                  {formData.promotionDiscountPercent}% OFF • {formatPrice((editingProduct?.price || formData.selectedProductForPromotion?.price || 0) - parseFloat(formData.promotionPrice))} Saved
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Promotion Dates */}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="studio-components-admin-ProductManager-13" className="mb-2 block text-sm font-bold text-ink">
                                Start Date & Time *
                              </label>
                              <input id="studio-components-admin-ProductManager-13"
                                type="datetime-local"
                                name="promotionStartDate"
                                required={formData.hasPromotion}
                                value={formData.promotionStartDate}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
                              />
                            </div>

                            <div>
                              <label htmlFor="studio-components-admin-ProductManager-14" className="mb-2 block text-sm font-bold text-ink">
                                End Date & Time *
                              </label>
                              <input id="studio-components-admin-ProductManager-14"
                                type="datetime-local"
                                name="promotionEndDate"
                                required={formData.hasPromotion}
                                value={formData.promotionEndDate}
                                onChange={handleInputChange}
                                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-muted outline-none transition focus:border-focus focus:ring-4 focus:ring-focus/15 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100"
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
                              className="h-4 w-4 rounded border-line text-accent focus:ring-2 focus:ring-focus"
                            />
                            <label
                              htmlFor="promotion_active"
                              className="text-sm font-semibold text-ink"
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
                    className="h-4 w-4 rounded border-line text-accent focus:ring-2 focus:ring-focus"
                  />

                  <label
                    htmlFor="is_active"
                    className="text-sm font-semibold text-ink"
                  >
                    Active (visible on
                    client products
                    page)
                  </label>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t border-line bg-surface/95 px-6 py-4 ">
              <button
                type="button"
                onClick={
                  closeProductForm
                }
                disabled={loading}
                className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-bold text-secondary transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
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
                className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-on-brand shadow-panel transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
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
          </StudioModal>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal &&
        productToDelete && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-overlay px-4 py-6 ">
            <StudioModal label="Delete product" onDismiss={closeDeleteModal} lockScroll={false} className="relative w-full max-w-md overflow-hidden rounded-xl border border-destructive/70 bg-surface shadow-panel">
              <div className="border-b border-destructive/70 px-6 py-5">
                <h2 className="text-xl font-semibold text-ink">
                  Delete Product?
                </h2>

                <p className="mt-2 text-sm text-secondary">
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
                    className="mt-4 rounded-xl border border-destructive bg-destructive-soft px-4 py-3 text-sm font-bold text-destructive"
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
                  className="rounded-full border border-line bg-surface px-5 py-3 text-sm font-bold text-secondary transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
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
                  className="flex items-center gap-2 rounded-full bg-destructive px-6 py-3 text-sm font-semibold text-on-brand shadow-panel transition hover:bg-destructive disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingProduct ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-transparent" />

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
            </StudioModal>
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
