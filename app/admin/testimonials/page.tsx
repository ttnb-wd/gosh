"use client";

import { useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { createSupabaseClient } from "@/lib/supabase/client";
import { CheckCircle2, Eye, EyeOff, Pencil, RefreshCw, Search, Star, Trash2, X } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  comment: string;
  rating: number;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type FilterType = "all" | "active" | "inactive";

const filters: Array<{ key: FilterType; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    role: "",
    rating: 5,
    comment: "",
    avatar_url: "",
  });

  const loadTestimonials = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error: fetchError } = await supabase
        .from("testimonials")
        .select("id, name, role, comment, rating, avatar_url, is_active, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTestimonials((data || []) as Testimonial[]);
    } catch (fetchError) {
      console.error("Testimonials fetch error:", fetchError);
      setError("Could not load testimonials.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTestimonials();
  }, []);

  const counts = useMemo(
    () => ({
      all: testimonials.length,
      active: testimonials.filter((testimonial) => testimonial.is_active).length,
      inactive: testimonials.filter((testimonial) => !testimonial.is_active).length,
    }),
    [testimonials]
  );

  const filteredTestimonials = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return testimonials.filter((testimonial) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && testimonial.is_active) ||
        (filter === "inactive" && !testimonial.is_active);

      const matchesSearch =
        !query ||
        testimonial.name.toLowerCase().includes(query) ||
        testimonial.comment.toLowerCase().includes(query) ||
        testimonial.role?.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, searchQuery, testimonials]);

  const updateTestimonial = async (testimonialId: string, updates: Partial<Testimonial>) => {
    setUpdatingId(testimonialId);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { data, error: updateError } = await supabase
        .from("testimonials")
        .update(updates)
        .eq("id", testimonialId)
        .select("id, name, role, comment, rating, avatar_url, is_active, created_at, updated_at")
        .single();

      if (updateError) throw updateError;

      setTestimonials((prev) =>
        prev.map((testimonial) => (testimonial.id === testimonialId ? (data as Testimonial) : testimonial))
      );
    } catch (updateError) {
      console.error("Testimonial update error:", updateError);
      setError("Could not update the testimonial.");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteTestimonial = async (testimonialId: string) => {
    if (!window.confirm("Delete this testimonial?")) return;

    setUpdatingId(testimonialId);
    setError(null);

    try {
      const supabase = createSupabaseClient();
      const { error: deleteError } = await supabase.from("testimonials").delete().eq("id", testimonialId);

      if (deleteError) throw deleteError;

      setTestimonials((prev) => prev.filter((testimonial) => testimonial.id !== testimonialId));
    } catch (deleteError) {
      console.error("Testimonial delete error:", deleteError);
      setError("Could not delete the testimonial.");
    } finally {
      setUpdatingId(null);
    }
  };

  const beginEdit = (testimonial: Testimonial) => {
    setEditingId(testimonial.id);
    setDraft({
      name: testimonial.name,
      role: testimonial.role || "",
      rating: testimonial.rating,
      comment: testimonial.comment,
      avatar_url: testimonial.avatar_url || "",
    });
  };

  const saveEdit = async (testimonialId: string) => {
    if (!draft.name.trim() || !draft.comment.trim() || draft.rating < 1 || draft.rating > 5) {
      setError("Name, comment, and a rating from 1 to 5 are required.");
      return;
    }

    await updateTestimonial(testimonialId, {
      name: draft.name.trim(),
      role: draft.role.trim() || null,
      rating: draft.rating,
      comment: draft.comment.trim(),
      avatar_url: draft.avatar_url.trim() || null,
    });
    setEditingId(null);
  };

  return (
    <div className="min-h-screen">
      <AdminHeader title="Testimonials" subtitle="Manage customer comments" />

      <main role="main" className="p-6">
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  filter === item.key
                    ? "bg-yellow-400 text-black"
                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-yellow-50"
                }`}
              >
                {item.label} ({counts[item.key]})
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm font-bold text-black outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60 sm:w-72"
                placeholder="Search name or comment..."
              />
            </div>

            <button
              type="button"
              onClick={loadTestimonials}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-yellow-600" />
            <p className="mt-3 text-sm font-bold text-zinc-500">Loading testimonials...</p>
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <Star className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-base font-black text-black">No testimonials found</p>
            <p className="mt-1 text-sm text-zinc-500">Customer comments will appear here after submission.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTestimonials.map((testimonial) => {
              const isEditing = editingId === testimonial.id;

              return (
                <article key={testimonial.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                            testimonial.is_active ? "bg-zinc-100 text-zinc-700" : "bg-red-50 text-red-700"
                          }`}
                        >
                          {testimonial.is_active ? "Active" : "Inactive"}
                        </span>
                        <p className="text-xs font-bold text-zinc-400">
                          {new Date(testimonial.created_at).toLocaleString()}
                        </p>
                      </div>

                      {isEditing ? (
                        <div className="grid gap-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <input
                              value={draft.name}
                              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-black outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                              placeholder="Name"
                            />
                            <input
                              value={draft.role}
                              onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value }))}
                              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-black outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                              placeholder="Role"
                            />
                          </div>
                          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                            <select
                              value={draft.rating}
                              onChange={(event) => setDraft((prev) => ({ ...prev, rating: Number(event.target.value) }))}
                              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-black outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>
                                  {value} stars
                                </option>
                              ))}
                            </select>
                            <input
                              value={draft.avatar_url}
                              onChange={(event) => setDraft((prev) => ({ ...prev, avatar_url: event.target.value }))}
                              className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-black outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                              placeholder="Avatar URL"
                            />
                          </div>
                          <textarea
                            value={draft.comment}
                            onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))}
                            rows={4}
                            className="resize-none rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold text-black outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-200/60"
                            placeholder="Comment"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex gap-1">
                            {[...Array(testimonial.rating)].map((_, index) => (
                              <Star key={index} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                          <h2 className="text-lg font-black text-black">{testimonial.name}</h2>
                          {testimonial.role && <p className="mt-1 text-sm font-bold text-zinc-500">{testimonial.role}</p>}
                          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{testimonial.comment}</p>
                        </>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => saveEdit(testimonial.id)}
                            disabled={updatingId === testimonial.id}
                            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
                          >
                            <X className="h-4 w-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => updateTestimonial(testimonial.id, { is_active: !testimonial.is_active })}
                            disabled={updatingId === testimonial.id}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {testimonial.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            {testimonial.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => beginEdit(testimonial)}
                            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-black text-zinc-700 transition hover:bg-zinc-50"
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteTestimonial(testimonial.id)}
                            disabled={updatingId === testimonial.id}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
