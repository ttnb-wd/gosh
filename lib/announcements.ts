import { BUSINESS_TIME_ZONE, parseBusinessSchedule } from "@/lib/business-schedule";
import type { Announcement, PublicAnnouncement } from "@/lib/types/announcements";

export const ANNOUNCEMENT_LABELS = {
  coming_soon: "COMING SOON",
  new_arrival: "NEW ARRIVAL",
} as const;

export function isArrivalDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    parseBusinessSchedule(`${value}T12:00`) !== null;
}

export function formatArrivalDate(value: string): string {
  if (!isArrivalDate(value)) return "Invalid date";
  // Noon is solely a formatting anchor; storage stays a calendar-date string.
  const date = parseBusinessSchedule(`${value}T12:00`)!;
  return date.toLocaleDateString("en-US", {
    timeZone: BUSINESS_TIME_ZONE, month: "short", day: "numeric", year: "numeric",
  });
}

/** Explicit public fields exclude actor IDs, upload IDs and database metadata. */
export function publicAnnouncement(value: Announcement): PublicAnnouncement {
  return {
    id: value.id, title: value.title, description: value.description || "",
    image: value.image || null, cta_text: value.cta_text || "", cta_url: value.cta_url || "",
    announcement_type: value.announcement_type, arrival_date: value.arrival_date,
  };
}

export function announcementSaveError(result: unknown): string {
  if (result && typeof result === "object" && "error" in result && typeof result.error === "string" && result.error.length <= 300) return result.error;
  return "Unable to save this announcement. Please try again.";
}
