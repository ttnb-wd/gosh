"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Edit, EyeOff, Plus, Search, Tags, Trash2, X } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { ComponentErrorBoundary } from "../ErrorBoundaries";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: { id: string }[];
}

interface LegacyBrand {
  name: string;
  productCount: number;
}

interface LegacyProductBrandRow {
  brand: string | null;
  brand_id: string | null;
}

const makeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `brand-${Date.now()}`;

function BrandManagerContent() {
  const supabase = useMemo(() => createSupabaseClient(), []);
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

    const { data, error } = await supabase
      .from("brands")
      .select("*, products(id)")
      .order("name", { ascending: true });

    if (error) {
      setError(error.message || "Could not load brands.");
      setLoading(false);
      return;
    }

    const loadedBrands = (data || []) as Brand[];
    setBrands(loadedBrands);

    const { data: productData, error: productError } = await supabase
      .from("products")
      .select("brand, brand_id")
      .not("brand", "is", null);

    if (!productError && productData) {
      const existingNames = new Set(loadedBrands.map((brand) => brand.name.toLowerCase()));
      const counts = new Map<string, number>();

      (productData as LegacyProductBrandRow[]).forEach((product) => {
        const brandName = typeof product.brand === "string" ? product.brand.trim() : "";
        if (!brandName || product.brand_id || existingNames.has(brandName.toLowerCase())) return;
        counts.set(brandName, (counts.get(brandName) || 0) + 1);
      });

      setLegacyBrands(
        Array.from(counts.entries())
          .map(([legacyName, productCount]) => ({ name: legacyName, productCount }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadBrands();
  }, [loadBrands]);

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

    const response = editingBrand
      ? await supabase.from("brands").update(payload).eq("id", editingBrand.id)
      : await supabase.from("brands").insert({ ...payload, is_active: true });

    if (response.error) {
      setError(response.error.message || "Could not save brand.");
      setSaving(false);
      return;
    }

    setMessage(editingBrand ? "Brand updated." : "Brand added.");
    resetForm();
    await loadBrands();
    setSaving(false);
  };

  const toggleBrand = async (brand: Brand) => {
    setMessage("");
    setError("");

    const { error } = await supabase
      .from("brands")
      .update({ is_active: !brand.is_active })
      .eq("id", brand.id);

    if (error) {
      setError(error.message || "Could not update brand status.");
      return;
    }

    setMessage(!brand.is_active ? "Brand activated." : "Brand deactivated.");
    loadBrands();
  };

  const deleteBrand = async (brand: Brand) => {
    setMessage("");
    setError("");

    const productCount = brand.products?.length || 0;
    if (productCount > 0) {
      const { error } = await supabase
        .from("brands")
        .update({ is_active: false })
        .eq("id", brand.id);

      if (error) {
        setError(error.message || "Could not deactivate brand.");
        return;
      }

      setMessage(`${brand.name} has products, so it was deactivated instead of deleted.`);
      loadBrands();
      return;
    }

    const { error } = await supabase.from("brands").delete().eq("id", brand.id);

    if (error) {
      setError(error.message || "Could not delete brand.");
      return;
    }

    setMessage("Brand deleted.");
    loadBrands();
  };

  const saveLegacyBrand = async (legacyBrand: LegacyBrand, isActive: boolean) => {
    setMessage("");
    setError("");

    const payload = {
      name: legacyBrand.name,
      slug: makeSlug(legacyBrand.name),
      description: null,
      is_active: isActive,
    };

    const { data, error } = await supabase
      .from("brands")
      .insert(payload)
      .select("*, products(id)")
      .single();

    if (error) {
      setError(error.message || "Could not save old brand.");
      return null;
    }

    const savedBrand = data as Brand;
    const { error: linkError } = await supabase
      .from("products")
      .update({ brand_id: savedBrand.id, brand: savedBrand.name })
      .eq("brand", legacyBrand.name)
      .is("brand_id", null);

    if (linkError) {
      setError(linkError.message || "Brand saved, but old products could not be linked.");
      return savedBrand;
    }

    await loadBrands();
    return savedBrand;
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

    const { error } = await supabase
      .from("products")
      .update({ brand: null })
      .eq("brand", legacyBrand.name)
      .is("brand_id", null);

    if (error) {
      setError(error.message || "Could not delete old brand text.");
      return;
    }

    setMessage(`${legacyBrand.name} was removed from old unlinked products.`);
    loadBrands();
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
      <section className="rounded-[28px] border border-yellow-200/80 bg-[#fffdf6] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
            <Tags className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-black">Brand Management</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-500">
              Active brands appear on the customer product filter. Inactive brands stay manageable here.
            </p>
          </div>
        </div>

        {(message || error) && (
          <div
            role="alert"
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <form onSubmit={handleSave} className="grid gap-3 lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-800">Brand Name</label>
            <input
              id="brand-name"
              name="brand_name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
              placeholder="Dior"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-neutral-800">Description</label>
            <input
              id="brand-description"
              name="brand_description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-2xl border border-yellow-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
              placeholder="Luxury fragrance house"
            />
          </div>
          <div className="flex gap-2">
            {editingBrand && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-12 items-center justify-center rounded-full border border-yellow-300 bg-white px-5 text-sm font-black text-neutral-700 transition hover:bg-yellow-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-yellow-400 px-6 text-sm font-black text-black shadow-[0_14px_34px_rgba(234,179,8,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Saving..." : editingBrand ? "Save Brand" : "Add Brand"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">All Brands</h2>
            <p className="text-sm font-semibold text-zinc-500">
              {brands.length + legacyBrands.length} brands in dashboard
            </p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              id="brand-search"
              name="brand_search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search brand..."
              className="w-full rounded-2xl border border-zinc-200 bg-white py-3 pl-12 pr-4 text-sm font-semibold text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
            />
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-6 text-center text-sm font-bold text-zinc-500">
            Loading brands...
          </div>
        ) : totalVisibleBrands === 0 ? (
          <div className="rounded-2xl border border-yellow-100 bg-yellow-50/40 p-6 text-center text-sm font-bold text-zinc-600">
            No brands found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-100">
            {filteredBrands.map((brand) => {
              const productCount = brand.products?.length || 0;
              return (
                <div
                  key={brand.id}
                  className="grid gap-3 border-b border-zinc-100 bg-white p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-black text-black">{brand.name}</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          brand.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {brand.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-500">
                      {brand.description || "No description"}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-zinc-600">
                    <span className="text-black">{productCount}</span>{" "}
                    linked product{productCount === 1 ? "" : "s"}
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => handleEdit(brand)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 text-sm font-black text-neutral-700 transition hover:bg-yellow-50"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-black transition ${
                        brand.is_active
                          ? "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                          : "bg-yellow-400 text-black hover:bg-yellow-300"
                      }`}
                    >
                      {brand.is_active ? <EyeOff className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {brand.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteBrand(brand)}
                      className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
                      title={productCount > 0 ? "Brands with products are deactivated instead of deleted" : "Delete brand"}
                    >
                      {productCount > 0 ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      {productCount > 0 ? "Deactivate" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredLegacyBrands.map((legacyBrand) => (
              <div
                key={`legacy-${legacyBrand.name}`}
                className="grid gap-3 border-b border-zinc-100 bg-yellow-50/35 p-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-base font-black text-black">{legacyBrand.name}</h3>
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                      Active
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-500">
                    No description
                  </p>
                </div>

                <div className="text-sm font-bold text-zinc-600">
                  <span className="text-black">{legacyBrand.productCount}</span>{" "}
                  linked product{legacyBrand.productCount === 1 ? "" : "s"}
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <button
                    type="button"
                    onClick={() => editLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-yellow-200 bg-white px-4 text-sm font-black text-neutral-700 transition hover:bg-yellow-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deactivateLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm font-black text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <EyeOff className="h-4 w-4" />
                    Deactivate
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteLegacyBrand(legacyBrand)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
                    title="Remove this old brand text from unlinked products"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
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
