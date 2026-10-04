"use client";
import StudioRowActions from "@/components/ui/StudioRowActions";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Edit, EyeOff, Plus, Search, Tags, Trash2, X } from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ComponentErrorBoundary } from "../ErrorBoundaries";
import { useAdminAuth } from "./AdminAuthProvider";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at?: unknown;
  updated_at?: unknown;
  products?: { id: string }[];
}

interface LegacyBrand {
  name: string;
  productCount: number;
}

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `brand-${Date.now()}`;

function BrandManagerContent() {
  /*
   * Firestore reads/writes for admin collections require an authenticated
   * admin token. The browser Firebase client auth is restored asynchronously
   * after a full page load / refresh, so we must not run any Firestore query
   * until the admin session has been fully restored and verified.
   */
  const { user, isAdmin, loading: authLoading } = useAdminAuth();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [legacyBrands, setLegacyBrands] = useState<LegacyBrand[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadBrands = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const brandsQuery = query(
        collection(db, "brands"),
        orderBy("name", "asc")
      );

      const productsSnapshot = await getDocs(
        collection(db, "products")
      );

      const productRows = productsSnapshot.docs.map((productDoc) => {
        const data = productDoc.data();

        return {
          id: productDoc.id,
          brand:
            typeof data.brand === "string" ? data.brand : null,
          brand_id:
            typeof data.brand_id === "string"
              ? data.brand_id
              : null,
        };
      });

      const productIdsByBrand = new Map<string, string[]>();

      productRows.forEach((product) => {
        if (!product.brand_id) return;

        const ids = productIdsByBrand.get(product.brand_id) || [];
        ids.push(product.id);
        productIdsByBrand.set(product.brand_id, ids);
      });

      const brandsSnapshot = await getDocs(brandsQuery);

      const loadedBrands: Brand[] = brandsSnapshot.docs.map(
        (brandDoc) => {
          const data = brandDoc.data();

          return {
            id: brandDoc.id,
            name: typeof data.name === "string" ? data.name : "",
            slug: typeof data.slug === "string" ? data.slug : "",
            description:
              typeof data.description === "string"
                ? data.description
                : null,
            is_active: data.is_active !== false,
            products:
              (productIdsByBrand.get(brandDoc.id) || []).map(
                (productId) => ({ id: productId })
              ),
          };
        }
      );

      setBrands(loadedBrands);

      const existingNames = new Set(
        loadedBrands.map((brand) => brand.name.toLowerCase())
      );
      const counts = new Map<string, number>();

      productRows.forEach((product) => {
        const brandName =
          typeof product.brand === "string"
            ? product.brand.trim()
            : "";

        if (
          !brandName ||
          product.brand_id ||
          existingNames.has(brandName.toLowerCase())
        ) {
          return;
        }

        counts.set(
          brandName,
          (counts.get(brandName) || 0) + 1
        );
      });

      setLegacyBrands(
        Array.from(counts.entries())
          .map(([legacyName, productCount]) => ({
            name: legacyName,
            productCount,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load brands."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user || !isAdmin) return;
    loadBrands();
  }, [loadBrands, authLoading, user, isAdmin]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingBrand(null);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setDescription(brand.description || "");
    setMessage("");
    setError("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Brand name is required.");
      return;
    }

    setSaving(true);
    const payload = {
      name: cleanName,
      slug: makeSlug(cleanName),
      description: description.trim() || null,
    };

    try {
      if (editingBrand) {
        await updateDoc(doc(db, "brands", editingBrand.id), {
          ...payload,
          updated_at: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "brands"), {
          ...payload,
          is_active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }

      setMessage(editingBrand ? "Brand updated." : "Brand added.");
      resetForm();
      await loadBrands();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save brand."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleBrand = async (brand: Brand) => {
    setMessage("");
    setError("");

    try {
      await updateDoc(doc(db, "brands", brand.id), {
        is_active: !brand.is_active,
        updated_at: serverTimestamp(),
      });

      setMessage(!brand.is_active ? "Brand activated." : "Brand deactivated.");
      await loadBrands();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Could not update brand status."
      );
    }
  };

  const deleteBrand = async (brand: Brand) => {
    setMessage("");
    setError("");

    const productCount = brand.products?.length || 0;

    try {
      if (productCount > 0) {
        await updateDoc(doc(db, "brands", brand.id), {
          is_active: false,
          updated_at: serverTimestamp(),
        });

        setMessage(`${brand.name} has products, so it was deactivated instead of deleted.`);
        await loadBrands();
        return;
      }

      await deleteDoc(doc(db, "brands", brand.id));

      setMessage("Brand deleted.");
      await loadBrands();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete brand."
      );
    }
  };

  const saveLegacyBrand = async (legacyBrand: LegacyBrand, isActive: boolean): Promise<Brand | null> => {
    setMessage("");
    setError("");

    const payload = {
      name: legacyBrand.name,
      slug: makeSlug(legacyBrand.name),
      description: null,
      is_active: isActive,
    };

    try {
      const brandRef = await addDoc(collection(db, "brands"), {
        ...payload,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      const savedBrand: Brand = {
        id: brandRef.id,
        ...payload,
        products: [],
      };

      const productsQuery = query(
        collection(db, "products"),
        where("brand", "==", legacyBrand.name)
      );
      const productsSnapshot = await getDocs(productsQuery);

      const linkUpdates = productsSnapshot.docs
        .filter((productDoc) => !productDoc.data().brand_id)
        .map((productDoc) =>
          updateDoc(productDoc.ref, {
            brand_id: savedBrand.id,
            brand: savedBrand.name,
            updated_at: serverTimestamp(),
          })
        );

      await Promise.all(linkUpdates);

      await loadBrands();
      return savedBrand;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save old brand."
      );
      return null;
    }
  };

  const editLegacyBrand = async (legacyBrand: LegacyBrand) => {
    const savedBrand = await saveLegacyBrand(legacyBrand, true);
    if (!savedBrand) return;

    setEditingBrand(savedBrand);
    setName(savedBrand.name);
    setDescription(savedBrand.description || "");
    setMessage(`${savedBrand.name} is now a saved brand. You can edit it here.`);
  };

  const deactivateLegacyBrand = async (legacyBrand: LegacyBrand) => {
    const savedBrand = await saveLegacyBrand(legacyBrand, false);
    if (!savedBrand) return;

    setMessage(`${savedBrand.name} is now saved as inactive and linked to old products.`);
  };

  const deleteLegacyBrand = async (legacyBrand: LegacyBrand) => {
    setMessage("");
    setError("");

    try {
      const productsQuery = query(
        collection(db, "products"),
        where("brand", "==", legacyBrand.name)
      );
      const productsSnapshot = await getDocs(productsQuery);

      const updates = productsSnapshot.docs
        .filter((productDoc) => !productDoc.data().brand_id)
        .map((productDoc) =>
          updateDoc(productDoc.ref, {
            brand: null,
            updated_at: serverTimestamp(),
          })
        );

      await Promise.all(updates);

      setMessage(`${legacyBrand.name} was removed from old unlinked products.`);
      await loadBrands();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete old brand text."
      );
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const filteredLegacyBrands = legacyBrands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );
  const totalVisibleBrands = filteredBrands.length + filteredLegacyBrands.length;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface p-5 shadow-panel">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <Tags className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">Brand Management</h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              Active brands appear on the customer product filter. Inactive brands stay manageable here.
            </p>
          </div>
        </div>

        {(message || error) && (
          <div
            role="alert"
            className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-destructive bg-destructive-soft text-destructive"
                : "border-success bg-success-soft text-success"
            }`}
          >
            {error || message}
          </div>
        )}

        <form onSubmit={handleSave} className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-bold text-ink">Brand Name</label>
            <input
              id="brand-name"
              name="brand_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-focus focus:ring-4 focus:ring-focus/15"
              placeholder="Dior"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-ink">Description</label>
            <input
              id="brand-description"
              name="brand_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-focus focus:ring-4 focus:ring-focus/15"
              placeholder="Luxury fragrance house"
            />
          </div>
          <div className="flex gap-2">
            {editingBrand && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-secondary transition hover:bg-accent-soft"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand shadow-panel transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : editingBrand ? "Save Brand" : "Add Brand"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-4 shadow-soft sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">All Brands</h2>
            <p className="text-sm font-semibold text-muted">
              {brands.length + legacyBrands.length} brands in dashboard
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              id="brand-search"
              name="brand_search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search brand..."
              className="w-full rounded-xl border border-line bg-surface py-3 pl-12 pr-4 text-sm font-semibold text-ink outline-none transition placeholder:text-muted focus:border-focus focus:ring-4 focus:ring-focus/15"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-line-muted bg-surface-muted p-6 text-center text-sm font-bold text-muted">
            Loading brands...
          </div>
        ) : totalVisibleBrands === 0 ? (
          <div className="rounded-xl border border-line bg-accent-soft/40 p-6 text-center text-sm font-bold text-secondary">
            No brands found.
          </div>
        ) : (
          <div className="studio-table rounded-xl border border-line-muted">
            {filteredBrands.map((brand) => {
              const productCount = brand.products?.length || 0;
              return (
                <div
                  key={brand.id}
                  className="grid gap-3 border-b border-line-muted bg-surface p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-ink">{brand.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          brand.is_active
                            ? "bg-success-soft text-success"
                            : "bg-surface-muted text-muted"
                        }`}
                      >
                        {brand.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-muted">
                      {brand.description || "No description"}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-secondary">
                    <span className="text-ink">{productCount}</span>{" "}
                    linked product{productCount === 1 ? "" : "s"}
                  </div>

                  <StudioRowActions>
<button
                      type="button"
                      onClick={() => handleEdit(brand)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-secondary transition hover:bg-accent-soft"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>

<button
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                        brand.is_active
                          ? "border border-line bg-surface-muted text-secondary hover:bg-surface-muted"
                          : "bg-brand text-on-brand hover:bg-brand"
                      }`}
                    >
                      {brand.is_active ? <EyeOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {brand.is_active ? "Deactivate" : "Activate"}
                    </button>

<button aria-label={productCount > 0 ? "Brands with products are deactivated instead of deleted" : "Delete brand"}
                      type="button"
                      onClick={() => deleteBrand(brand)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-destructive bg-destructive-soft px-4 text-sm font-semibold text-destructive transition hover:bg-destructive-soft"
                      data-studio-tooltip={productCount > 0 ? "Brands with products are deactivated instead of deleted" : "Delete brand"}
                    >
                      {productCount > 0 ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      {productCount > 0 ? "Deactivate" : "Delete"}
                    <span className="text-xs">{productCount > 0 ? "Brands with products are deactivated instead of deleted" : "Delete brand"}</span></button>
</StudioRowActions>
                </div>
              );
            })}
            {filteredLegacyBrands.map((legacyBrand) => (
              <div
                key={`legacy-${legacyBrand.name}`}
                className="grid gap-3 border-b border-line-muted bg-accent-soft/35 p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-semibold text-ink">{legacyBrand.name}</h3>
                    <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-muted">
                    No description
                  </p>
                </div>

                <div className="text-sm font-bold text-secondary">
                  <span className="text-ink">{legacyBrand.productCount}</span>{" "}
                  linked product{legacyBrand.productCount === 1 ? "" : "s"}
                </div>

                <StudioRowActions>
<button
                    type="button"
                    onClick={() => editLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-secondary transition hover:bg-accent-soft"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>

<button
                    type="button"
                    onClick={() => deactivateLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface-muted px-4 text-sm font-semibold text-secondary transition hover:bg-surface-muted"
                  >
                    <EyeOff className="h-4 w-4" />
                    Deactivate
                  </button>

<button aria-label="Remove this old brand text from unlinked products"
                    type="button"
                    onClick={() => deleteLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-destructive bg-destructive-soft px-4 text-sm font-semibold text-destructive transition hover:bg-destructive-soft"
                    data-studio-tooltip="Remove this old brand text from unlinked products"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
</StudioRowActions>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function BrandManager() {
  return (
    <ComponentErrorBoundary context="brand-manager">
      <BrandManagerContent />
    </ComponentErrorBoundary>
  );
}
