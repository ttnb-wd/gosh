"use client";
import { Reveal } from "@/components/ui/StudioMotion";
import StudioLoading from "@/components/ui/StudioLoading";
import devLog from "@/lib/dev-log";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import StudioSelect from "@/components/ui/StudioSelect";
import QuickViewModal from "./QuickViewModal";
import ProductCardWithPromotion from "./ProductCardWithPromotion";
import { useProductPromotions } from "@/hooks/useProductPromotions";
import { db } from "@/lib/firebase/config";
import { isScentCollection } from "@/lib/collections";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

interface Product {
  id: string | number;
  name: string;
  brand: string;
  brand_id?: string | null;
  scent_collection?: string | null;
  brands?: BrandOption | null;
  price: number;
  description: string;
  image: string;
  badge: string | null;
  category?: string;
  decants: { label: string; price: number }[];
  is_active?: boolean;
  selectedSize?: string;
  sizes?: { label: string; price: number }[];
  notes?: ProductQuickViewNotes;
}

type FirestoreProductDoc = Partial<Omit<Product, "decants" | "id">> & {
  decants?: unknown;
  notes?: unknown;
  image_url?: string | null;
  is_active?: boolean;
  createdAt?: unknown;
  created_at?: unknown;
};

interface BrandOption {
  id: string;
  name: string;
  slug: string;
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

const normalizeNotesArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const notes = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return notes.length > 0 ? notes : undefined;
};

const normalizeQuickViewNotes = (value: unknown): ProductQuickViewNotes | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const notes = value as Record<string, unknown>;

  const normalized = {
    story: typeof notes.story === "string" ? notes.story.trim() : undefined,
    top: normalizeNotesArray(notes.top),
    heart: normalizeNotesArray(notes.heart),
    base: normalizeNotesArray(notes.base),
    madeWith: typeof notes.madeWith === "string" ? notes.madeWith.trim() : undefined,
    bestFor: typeof notes.bestFor === "string" ? notes.bestFor.trim() : undefined,
  };

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
};

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Scroll reveal wrapper component
function ProductRevealCard({ children, index }: { children: React.ReactNode; index: number }) { return <Reveal className="min-w-0" delay={Math.min(index * .04, .2)}>{children}</Reveal>; }

interface ProductSectionProps {
  selectedBrand?: string;
  onBrandSelect?: (brand: string) => void;
  onAddToBag: (product: Product) => void;
}


export default function ProductSection({ selectedBrand = "All", onBrandSelect, onAddToBag }: ProductSectionProps) {
  const searchParams = useSearchParams();
  const collectionParam = searchParams.get("collection");
  const urlCollection = isScentCollection(collectionParam) ? collectionParam : null;
  
  // Original fallback products - NEVER remove these, they are the main products
  const fallbackProducts: Product[] = [
    {
      id: 1,
      name: "Golden Noir",
      brand: "Dior",
      price: 89,
      description: "Warm amber, vanilla, dark wood",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      decants: [
        { label: "5ml", price: 12 },
        { label: "10ml", price: 20 },
        { label: "20ml", price: 35 },
        { label: "30ml", price: 48 }
      ]
    },
    {
      id: 2,
      name: "Velvet Oud",
      brand: "Chanel",
      price: 110,
      description: "Deep oud, soft floral sweetness",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      decants: [
        { label: "5ml", price: 15 },
        { label: "10ml", price: 25 },
        { label: "20ml", price: 42 },
        { label: "30ml", price: 58 }
      ]
    },
    {
      id: 3,
      name: "Midnight Amber",
      brand: "Gucci",
      price: 96,
      description: "Elegant spicy amber evening",
      image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 13 },
        { label: "10ml", price: 22 },
        { label: "20ml", price: 38 },
        { label: "30ml", price: 52 }
      ]
    },
    {
      id: 4,
      name: "Sunlit Bloom",
      brand: "YSL",
      price: 78,
      description: "Fresh citrus, soft floral finish",
      image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop",
      badge: "Limited",
      decants: [
        { label: "5ml", price: 10 },
        { label: "10ml", price: 18 },
        { label: "20ml", price: 30 },
        { label: "30ml", price: 42 }
      ]
    },
    {
      id: 5,
      name: "Royal Musk",
      brand: "Versace",
      price: 120,
      description: "Luxury musk, powdery warmth",
      image: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      decants: [
        { label: "5ml", price: 16 },
        { label: "10ml", price: 28 },
        { label: "20ml", price: 48 },
        { label: "30ml", price: 65 }
      ]
    },
    {
      id: 6,
      name: "Night Elixir",
      brand: "Tom Ford",
      price: 99,
      description: "Bold, rich statement scent",
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 14 },
        { label: "10ml", price: 23 },
        { label: "20ml", price: 39 },
        { label: "30ml", price: 54 }
      ]
    },
    {
      id: 7,
      name: "Ocean Breeze",
      brand: "Jo Malone",
      price: 85,
      description: "Fresh marine, subtle citrus",
      image: "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      decants: [
        { label: "5ml", price: 12 },
        { label: "10ml", price: 19 },
        { label: "20ml", price: 33 },
        { label: "30ml", price: 46 }
      ]
    },
    {
      id: 8,
      name: "Silk Essence",
      brand: "Armani",
      price: 105,
      description: "Sophisticated floral blend",
      image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      decants: [
        { label: "5ml", price: 14 },
        { label: "10ml", price: 24 },
        { label: "20ml", price: 41 },
        { label: "30ml", price: 56 }
      ]
    },
    {
      id: 9,
      name: "Rose Garden",
      brand: "Valentino",
      price: 115,
      description: "Romantic rose, woody base",
      image: "https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?q=80&w=1200&auto=format&fit=crop",
      badge: "Limited",
      category: "Floral",
      decants: [
        { label: "5ml", price: 15 },
        { label: "10ml", price: 26 },
        { label: "20ml", price: 44 },
        { label: "30ml", price: 60 }
      ]
    },
    // Accessories
    {
      id: 101,
      name: "Luxury Travel Atomizer",
      brand: "GOSH PERFUME",
      price: 15,
      description: "Premium refillable travel atomizer for carrying your favorite scent anywhere",
      image: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?q=80&w=1200&auto=format&fit=crop",
      badge: "New",
      category: "Accessories",
      decants: []
    },
    {
      id: 102,
      name: "Premium Gift Box",
      brand: "GOSH PERFUME",
      price: 8,
      description: "Elegant luxury gift packaging for perfume and decant orders",
      image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop",
      badge: null,
      category: "Accessories",
      decants: []
    },
    {
      id: 103,
      name: "Discovery Sample Set",
      brand: "GOSH PERFUME",
      price: 20,
      description: "Curated sample set for discovering your next signature scent",
      image: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?q=80&w=1200&auto=format&fit=crop",
      badge: "Best Seller",
      category: "Accessories",
      decants: []
    },
  ];

  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [activeBrands, setActiveBrands] = useState<BrandOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [selectedDecants, setSelectedDecants] = useState<Record<string, { label: string; price: number }>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("Perfumes");
  const [selectedCollection, setSelectedCollection] = useState<string>(urlCollection || "All Collections");

  const loadRequestRef = useRef(0);
  const activeBrandsRef = useRef<BrandOption[]>([]);

  // Use the promotion hook to fetch active promotions
  const { getPromotion } = useProductPromotions();

  const normalizeProduct = (
    productId: string,
    product: FirestoreProductDoc,
    brandMap: Map<string, BrandOption>
  ): Product => {
    const rawImage =
      (typeof product.image === "string" && product.image) ||
      (typeof product.image_url === "string" && product.image_url) ||
      "";

    let imageUrl =
      "https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=400&auto=format&fit=crop";

    if (rawImage.trim() !== "") {
      const img = rawImage.trim();
      if (
        img.startsWith("http://") ||
        img.startsWith("https://") ||
        img.startsWith("/")
      ) {
        imageUrl = img;
      }
    }

    const brandId =
      typeof product.brand_id === "string" ? product.brand_id : null;
    const brandRelation = brandId ? brandMap.get(brandId) || null : null;
    const legacyBrand =
      typeof product.brand === "string" ? product.brand : "";

    return {
      id: productId,
      name: product.name || "Untitled Perfume",
      brand: brandRelation?.name || legacyBrand || "",
      brand_id: brandId,
      brands: brandRelation,
      price: Number(product.price) || 0,
      description: product.description || "",
      image: imageUrl,
      badge: product.badge || null,
      category: product.category || "",
      scent_collection: product.scent_collection || null,
      notes: normalizeQuickViewNotes(product.notes),
      decants:
        Array.isArray(product.decants) && product.decants.length > 0
          ? product.decants
          : [
              { label: "5ml", price: 13 },
              { label: "10ml", price: 25 },
              { label: "20ml", price: 42 },
              { label: "30ml", price: 58 },
            ],
    };
  };

  useEffect(() => {
    loadActiveBrands();
  }, []);

  useEffect(() => {
    setSelectedCollection(urlCollection || "All Collections");
    if (urlCollection) {
      setSelectedCategory("Perfumes");
    }
  }, [urlCollection]);

  useEffect(() => {
    loadProducts();
  }, [selectedCollection]);

  const loadActiveBrands = async () => {
    try {
      const brandsQuery = query(
        collection(db, "brands"),
              where("is_active", "==", true),
              orderBy("name", "asc")
            );

      const snapshot = await getDocs(brandsQuery);

      const loadedBrands: BrandOption[] = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: typeof data.name === "string" ? data.name : "",
            slug: typeof data.slug === "string" ? data.slug : "",
            is_active: data.is_active !== false,
          };
        })
        .filter((brand) => brand.is_active && brand.name);

      activeBrandsRef.current = loadedBrands;
      setActiveBrands(loadedBrands);
    } catch (error) {
      devLog.error("Error loading Firebase brands:", error);
    }
  };

  const loadProducts = async () => {
    const requestId = ++loadRequestRef.current;

    try {
      setLoading(true);

      const hasCollectionFilter =
        selectedCollection !== "All Collections" &&
        isScentCollection(selectedCollection);

      let loadedProducts = hasCollectionFilter ? [] : [...fallbackProducts];

      try {
        if (activeBrandsRef.current.length === 0) {
          await loadActiveBrands();
        }

        if (requestId !== loadRequestRef.current) {
          return;
        }

        const productsQuery = query(
          collection(db, "products"),
                  where("is_active", "==", true),
                  orderBy("createdAt", "desc")
                );

        const snapshot = await getDocs(productsQuery);

        if (requestId !== loadRequestRef.current) {
          return;
        }

        const brandMap = new Map(
          activeBrandsRef.current.map((brand) => [brand.id, brand])
        );

        const firebaseProducts = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            data: doc.data() as FirestoreProductDoc,
          }))
          .filter(({ data }) => data.is_active !== false)
          .map(({ id, data }) => normalizeProduct(id, data, brandMap))
          .filter((product) => {
            if (
              product.brand_id &&
              product.brands?.is_active !== true
            ) {
              return false;
            }

            if (hasCollectionFilter) {
              return product.scent_collection === selectedCollection;
            }

            return true;
          });

        if (firebaseProducts.length > 0) {
          loadedProducts = firebaseProducts;
        }
      } catch (error) {
        devLog.error("Error loading Firebase products:", error);
      }

      if (requestId !== loadRequestRef.current) {
        return;
      }

      setProducts(loadedProducts);
    } catch (error) {
      devLog.error("Error loading products:", error);

      if (requestId !== loadRequestRef.current) {
        return;
      }

      setProducts(
        selectedCollection !== "All Collections" &&
          isScentCollection(selectedCollection)
          ? []
          : fallbackProducts
      );
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const legacyBrandOptions = Array.from(
    new Set(
      products
        .filter((product) => !product.brand_id)
        .map((product) => product.brand?.trim())
        .filter((brand): brand is string => Boolean(brand && brand !== "GOSH PERFUME"))
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .map((brand) => ({
      id: brand,
      name: brand,
      slug: brand.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      is_active: true,
    }));

  const brands = [
    { id: "All", name: "All", slug: "all", is_active: true },
    ...activeBrands,
    ...legacyBrandOptions.filter(
      (legacyBrand) =>
        !activeBrands.some(
          (activeBrand) => activeBrand.name.toLowerCase() === legacyBrand.name.toLowerCase()
        )
    ),
  ];

  useEffect(() => {
    if (
      selectedBrand !== "All" &&
      brands.length > 1 &&
      !brands.some((brand) => brand.id === selectedBrand)
    ) {
      onBrandSelect?.("All");
    }
  }, [brands, onBrandSelect, selectedBrand]);
  
  const handleQuickView = (product: typeof products[0]) => {
    setQuickViewProduct(product);
    setIsQuickViewOpen(true);
  };

  const handleCloseQuickView = () => {
    setIsQuickViewOpen(false);
    setTimeout(() => setQuickViewProduct(null), 300);
  };

  const handleQuickViewAddToBag = (product: Product, quantity: number) => {
    const selectedDecant = selectedDecants[product.id];
    const finalSize = selectedDecant?.label || "";
    const finalPrice = selectedDecant?.price || product.price;
    
    for (let i = 0; i < quantity; i++) {
      onAddToBag({ ...product, selectedSize: finalSize, price: finalPrice });
    }
  };

  const safeProducts = Array.isArray(products) ? products : [];

  const filteredProducts = safeProducts.filter((product) => {
    // Normalize category for comparison
    const normalizedCategory = String(product.category || "").toLowerCase().trim();
    const isAccessory = normalizedCategory === "accessories" || normalizedCategory === "accessory";
    const normalizedScentCollection = String(product.scent_collection || "").trim();
    
    // Filter by brand
    const selectedBrandRecord = brands.find((brand) => brand.id === selectedBrand);
    const matchesBrand =
      selectedBrand === "All" ||
      product.brand_id === selectedBrand ||
      (!product.brand_id && selectedBrandRecord?.name === product.brand);
    
    // Filter by category
    let matchesCategory = true;
    
    if (selectedCategory === "All") {
      // Show only perfumes, NOT accessories
      matchesCategory = !isAccessory;
    } else if (selectedCategory === "Perfumes") {
      // Show only non-accessory products
      matchesCategory = !isAccessory;
    } else if (selectedCategory === "Accessories") {
      // Show only accessory products
      matchesCategory = isAccessory;
    } else {
      // Specific perfume category (Woody, Oriental, Floral, Fresh, Citrus)
      // Should NOT show accessories
      matchesCategory = !isAccessory && normalizedCategory === selectedCategory.toLowerCase();
    }

    const matchesCollection =
      selectedCollection === "All Collections" ||
      normalizedScentCollection === selectedCollection;
    
    return matchesBrand && matchesCategory && matchesCollection;
  });

  const getBrandTitle = () => {
    const selectedBrandName = brands.find((brand) => brand.id === selectedBrand)?.name || selectedBrand;
    if (selectedCategory === "Accessories") return "Accessories";
    if (selectedCollection !== "All Collections") return `${selectedCollection} Collection`;
    if (selectedCategory === "Perfumes") {
      return selectedBrand === "All" ? "All Perfumes" : `${selectedBrandName} Perfumes`;
    }
    return selectedBrand === "All" ? "All Perfumes" : `${selectedBrandName} Collection`;
  };

  const getProductCount = () => {
    const count = filteredProducts.length;
    if (selectedCategory === "Accessories") {
      return `${count} luxury accessor${count === 1 ? 'y' : 'ies'}`;
    }
    return `${count} luxury perfume${count !== 1 ? 's' : ''}`;
  };

  const selectedBrandLabel =
    selectedBrand === "All"
      ? "All"
      : brands.find((brand) => brand.id === selectedBrand)?.name || "this brand";
  const isCollectionFilterActive = selectedCollection !== "All Collections";

  return (
    <section
      role="region"
      aria-label="Product catalog"
      id="products"
      className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-10 sm:px-6 lg:px-8 lg:py-16"
    >
      {/* Screen Reader Loading Announcement */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {loading ? "Loading products, please wait..." : `${getProductCount()} loaded`}
      </div>

      {/* Section Header */}
      <motion.div
        key={selectedBrand}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="studio-shop-heading mb-6 sm:mb-8"
      >
        <p className="text-xs uppercase tracking-[0.32em] text-brand sm:text-sm sm:tracking-[0.35em]">
          Our Collection
        </p>
        <h2 className="studio-display studio-gradient mt-3 text-3xl font-semibold text-ink sm:mt-4 sm:text-5xl">
          {getBrandTitle()}
        </h2>
        {isCollectionFilterActive && (
          <Link
            href="/products"
            onClick={() => setSelectedCollection("All Collections")}
            className="mt-4 inline-flex rounded-full border border-line bg-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-accent shadow-panel transition hover:bg-surface"
          >
            Clear Collection
          </Link>
        )}
      </motion.div>

      {/* Filter Bar with Product Count and Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:overflow-x-auto sm:pb-0">
          {["Perfumes", "Accessories"].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`min-w-0 rounded-full px-3 py-2.5 text-sm font-bold transition-all duration-300 sm:shrink-0 sm:px-5 ${
                selectedCategory === category
                  ? "bg-brand text-on-brand shadow-panel"
                  : "border border-line bg-surface text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <span className="block truncate whitespace-nowrap">{category}</span>
            </button>
          ))}
        </div>

        <div className="w-full sm:w-56">
          {onBrandSelect && brands.length > 1 && <StudioSelect value={selectedBrand} placeholder="Choose brand" ariaLabel="Filter by brand"
            options={brands.map(brand => ({ value: brand.id, label: brand.id === "All" ? "All brands" : brand.name || "Unbranded" }))} onChange={onBrandSelect} />}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <StudioLoading label="Loading products…" grid />
        ) : filteredProducts.length > 0 ? (
          <motion.div
            key={`${selectedBrand}-${selectedCollection}`}
            variants={container}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 xl:grid-cols-4"
          >
            {filteredProducts.map((product, index) => (
              <ProductRevealCard key={`${selectedBrand}-${product.id}`} index={index}>
                <ProductCardWithPromotion 
                  product={product} 
                  promotion={getPromotion(product.id)}
                  onAddToBag={onAddToBag}
                  onQuickView={handleQuickView}
                  priority={index === 0}
                />
              </ProductRevealCard>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center"
          >
            <div className="w-full rounded-xl border border-line bg-surface p-6 text-center shadow-soft sm:p-12">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-line bg-accent-soft text-accent">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-ink">No perfumes found</h3>
              {isCollectionFilterActive ? (
                <p className="text-secondary">
                  No products found in <span className="font-medium text-accent">{selectedCollection} Collection</span> yet.
                </p>
              ) : (
                <p className="text-secondary">
                  No perfumes available for <span className="font-medium text-accent">{selectedBrandLabel}</span> in this collection yet.
                </p>
              )}
              <p className="mt-2 text-sm text-muted">
                Check back soon for new arrivals!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <QuickViewModal
        product={quickViewProduct}
        isOpen={isQuickViewOpen}
        onClose={handleCloseQuickView}
        onAddToBag={handleQuickViewAddToBag}
        selectedDecants={selectedDecants}
        setSelectedDecants={setSelectedDecants}
      />

    </section>
  );
}
