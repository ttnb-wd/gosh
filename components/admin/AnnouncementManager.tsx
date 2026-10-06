"use client";
import devLog from "@/lib/dev-log";
import StudioRowActions from "@/components/ui/StudioRowActions";
import { notify, confirmAction } from "@/components/ui/StudioFeedback";

import { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Power, PowerOff, Sparkles, Image as ImageIcon, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudioSelect from "@/components/ui/StudioSelect";
import { ANNOUNCEMENT_LABELS, formatArrivalDate, announcementSaveError } from "@/lib/announcements";
import type { Announcement, AnnouncementType } from "@/lib/types/announcements";

interface AnnouncementFormData {
  title: string;
  description: string;
  image: string;
  imageFileId: string;
  cta_text: string;
  cta_url: string;
  is_active: boolean;
  announcement_type: AnnouncementType;
  arrival_date: string;
}

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: "",
    description: "",
    image: "",
    imageFileId: "",
    cta_text: "Learn More",
    cta_url: "/products",
    is_active: false,
    announcement_type: "coming_soon",
    arrival_date: "",
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    try {
      const response = await fetch("/api/admin/announcements/action", {
        credentials: "include",
      });

      if (!response.ok) {
        devLog.error("Application operation failed.");
        return;
      }

      const result = await response.json();

      if (result.success) {
        setAnnouncements(result.announcements || []);
      }
    } catch  {
      devLog.error("Application operation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "/gosh/uploads");
      const uploadResponse = await fetch("/api/upload/imagekit", { method: "POST", credentials: "include", body: formData });
      if (!uploadResponse.ok) throw new Error("Upload failed.");

      const uploadData = await uploadResponse.json();

      if (uploadData.url && uploadData.fileId) {
        setFormData((prev) => ({
          ...prev,
          image: uploadData.url,
          imageFileId: uploadData.fileId,
        }));
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to upload this image. Please try again.", "error");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const action = editingId ? "update" : "create";
      const payload: Record<string, unknown> = {
        action,
        data: {
          ...formData,
        },
      };

      if (editingId) {
        payload.announcementId = editingId;
      }

      const response = await fetch("/api/admin/announcements/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result: unknown = await response.json();

      if (!response.ok) {

        devLog.error("Application operation failed.");
        notify(announcementSaveError(result), "error");
        return;
      }

      if (result && typeof result === "object" && "success" in result && result.success) {
        await fetchAnnouncements();
        resetForm();
      } else {
        notify(announcementSaveError(result), "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to save your changes. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirmAction("Are you sure you want to delete this announcement?"))) {
      return;
    }

    try {
      const response = await fetch("/api/admin/announcements/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "delete",
          announcementId: id,
        }),
      });

      if (!response.ok) {
        notify("Unable to delete this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchAnnouncements();
      } else {
        notify("Unable to delete this item. Please try again.", "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to delete this item. Please try again.", "error");
    }
  }

  async function handleToggle(id: string) {
    try {
      const response = await fetch("/api/admin/announcements/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "toggle",
          announcementId: id,
        }),
      });

      if (!response.ok) {
        notify("Unable to update this item. Please try again.", "error");
        return;
      }

      const result = await response.json();

      if (result.success) {
        await fetchAnnouncements();
      } else {
        notify("Unable to update this item. Please try again.", "error");
      }
    } catch  {
      devLog.error("Application operation failed.");
      notify("Unable to update this item. Please try again.", "error");
    }
  }

  function handleEdit(announcement: Announcement) {
    setEditingId(announcement.id);

    setFormData({
      title: announcement.title || "",
      description: announcement.description || "",
      image: announcement.image || "",
      imageFileId: announcement.imageFileId || "",
      cta_text: announcement.cta_text || "",
      cta_url: announcement.cta_url || "",
      is_active: announcement.is_active,
      announcement_type: announcement.announcement_type,
      arrival_date: announcement.arrival_date,
    });

    setShowForm(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormData({
      title: "",
      description: "",
      image: "",
      imageFileId: "",
      cta_text: "Learn More",
      cta_url: "/products",
      is_active: false,
      announcement_type: "coming_soon",
      arrival_date: "",
    });
    setShowForm(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink ">Announcements</h2>
          <p className="mt-1 text-sm text-muted ">Manage upcoming products and new arrivals</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-full border border-line bg-brand px-4 py-2.5 text-sm font-bold text-on-brand shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft"
        >
          <Plus className="h-4 w-4" />
          Create Announcement
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
            <h3 className="mb-4 text-lg font-semibold text-ink ">
              {editingId ? "Edit Announcement" : "Create New Announcement"}
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Title */}
              <div className="md:col-span-2">
                <label htmlFor="studio-components-admin-AnnouncementManager-1" className="mb-2 block text-sm font-bold text-ink ">
                  Title <span className="text-destructive">*</span>
                </label>
                <input id="studio-components-admin-AnnouncementManager-1"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  maxLength={200}
                  placeholder="e.g., New Collection Available"
                  required
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="studio-components-admin-AnnouncementManager-2" className="mb-2 block text-sm font-bold text-ink ">
                  Description (optional)
                </label>
                <textarea id="studio-components-admin-AnnouncementManager-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  rows={3}
                  placeholder="Describe your announcement"
                  maxLength={5000}
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label htmlFor="studio-components-admin-AnnouncementManager-3" className="mb-2 block text-sm font-bold text-ink ">
                  Announcement Image
                </label>
                <div className="flex items-center gap-4">
                  <input id="studio-components-admin-AnnouncementManager-3"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                    className="flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                    disabled={uploadingImage}
                  />
                  {uploadingImage && (
                    <div className="h-6 w-6 animate-spin rounded-full border-4 border-line border-t-transparent" />
                  )}
                </div>
                {formData.image && (
                  <div className="mt-2">
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="h-32 w-auto rounded-lg object-cover"
                    />
                  </div>
                )}
              </div>

              {/* CTA Text */}
              <div>
                <label htmlFor="studio-components-admin-AnnouncementManager-4" className="mb-2 block text-sm font-bold text-ink ">
                  CTA Text (optional)
                </label>
                <input id="studio-components-admin-AnnouncementManager-4"
                  type="text"
                  value={formData.cta_text}
                  onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  maxLength={100}
                  placeholder="e.g., Learn More"
                />
              </div>

              {/* CTA URL */}
              <div>
                <label htmlFor="studio-components-admin-AnnouncementManager-5" className="mb-2 block text-sm font-bold text-ink ">
                  CTA URL (optional)
                </label>
                <input id="studio-components-admin-AnnouncementManager-5"
                  type="text"
                  value={formData.cta_url}
                  onChange={(e) => setFormData({ ...formData, cta_url: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none    "
                  placeholder="e.g., /products?collection=Summer"
                  maxLength={2048}
                />
              </div>

              <div>
                <StudioSelect label="Announcement Type *" value={formData.announcement_type}
                  onChange={(value) => setFormData({ ...formData, announcement_type: value as AnnouncementType })}
                  options={[{ value: "coming_soon", label: "COMING SOON" }, { value: "new_arrival", label: "NEW ARRIVAL" }]} />
              </div>
              <div>
                <label htmlFor="announcement-arrival-date" className="mb-2 block text-sm font-bold text-ink">
                  Arrival Date <span className="text-destructive">*</span>
                </label>
                <input id="announcement-arrival-date" type="date" required value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:border-focus focus:outline-none" />
              </div>

              {/* Is Active */}
              <div className="md:col-span-2">
                <label className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-5 w-5 rounded border-line text-accent focus:ring-focus  "
                  />
                  <span className="text-sm font-bold text-ink ">Active</span>
                </label>
                <p className="ml-7 mt-1 text-xs text-muted ">
                  Only active announcements are visible to customers
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={submitting || uploadingImage}
                className="flex-1 rounded-full bg-brand px-6 py-3 text-sm font-bold text-on-brand transition-all hover:-translate-y-0.5 hover:shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Announcement" : "Create Announcement"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-bold text-ink transition-all hover:bg-surface-muted    "
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface p-12 text-center  ">
            <Sparkles className="mx-auto h-12 w-12 text-accent/30" />
            <p className="mt-4 text-sm font-bold text-muted ">No announcements yet</p>
            <p className="mt-1 text-xs text-muted ">Create your first announcement to get started</p>
          </div>
        ) : (
          announcements.map((announcement) => {
            const status = announcement.is_active
              ? { label: "Active", color: "text-success bg-success-soft" }
              : { label: "Inactive", color: "text-muted bg-surface-muted" };
            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-line bg-surface p-6 shadow-soft  "
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-surface-muted ">
                    {announcement.image ? (
                      <img
                        src={announcement.image}
                        alt={announcement.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-faint " />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-ink ">{announcement.title}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.color}`}>
                            {ANNOUNCEMENT_LABELS[announcement.announcement_type]} · {status.label}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted ">{announcement.description}</p>

                        <p className="mt-2 text-xs text-muted">Arrival Date: {formatArrivalDate(announcement.arrival_date)}</p>

                        {announcement.cta_url && announcement.cta_text && <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted ">
                          <a
                            href={announcement.cta_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-accent hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {announcement.cta_text}
                          </a>
                        </div>}
                      </div>

                      {/* Actions */}
                      <StudioRowActions>
<button aria-label={announcement.is_active ? "Deactivate" : "Activate"}
                          type="button"
                          onClick={() => handleToggle(announcement.id)}
                          className={`rounded-lg p-2 transition-colors ${
                            announcement.is_active
                              ? "bg-success-soft text-success hover:bg-success-soft   "
                              : "bg-surface-muted text-muted hover:bg-surface-muted   "
                          }`}
                          data-studio-tooltip={announcement.is_active ? "Deactivate" : "Activate"}
                        >
                          {announcement.is_active ? (
                            <Power className="h-4 w-4" />
                          ) : (
                            <PowerOff className="h-4 w-4" />
                          )}
                        <span className="text-xs">{announcement.is_active ? "Deactivate" : "Activate"}</span></button>

<button aria-label="Edit"
                          type="button"
                          onClick={() => handleEdit(announcement)}
                          className="rounded-lg bg-info-soft p-2 text-info transition-colors hover:bg-info-soft   "
                          data-studio-tooltip="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        <span className="text-xs">Edit</span></button>

<button aria-label="Delete"
                          type="button"
                          onClick={() => handleDelete(announcement.id)}
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
