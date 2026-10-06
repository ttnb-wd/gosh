export type AnnouncementType = "coming_soon" | "new_arrival";

/** A Myanmar calendar date (YYYY-MM-DD), not a timestamp or visibility range. */
export interface AnnouncementInput {
  title: string;
  description?: string;
  image?: string | null;
  imageFileId?: string | null;
  cta_text?: string;
  cta_url?: string;
  announcement_type: AnnouncementType;
  arrival_date: string;
  is_active: boolean;
}

export interface Announcement extends AnnouncementInput {
  id: string;
  created_at: unknown;
  updated_at: unknown;
  created_by: string;
}

export type PublicAnnouncement = Pick<Announcement, "id" | "title" | "description" | "image" | "cta_text" | "cta_url" | "announcement_type" | "arrival_date">;

export type AnnouncementAction =
  | { action: "create"; data: AnnouncementInput }
  | { action: "update"; announcementId: string; data: AnnouncementInput }
  | { action: "delete" | "toggle"; announcementId: string };
