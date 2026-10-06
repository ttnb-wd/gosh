import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./admin";
import { isArrivalDate } from "@/lib/announcements";
import type { Announcement, AnnouncementInput } from "@/lib/types/announcements";

const announcementsCollection = adminDb.collection("announcements");

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const snapshot = await announcementsCollection.doc(id).get();
  return snapshot.exists ? { ...(snapshot.data() as Omit<Announcement, "id">), id: snapshot.id } : null;
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const snapshot = await announcementsCollection.orderBy("created_at", "desc").get();
  return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Announcement, "id">), id: doc.id }));
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  // No arrival-date gating/expiration. Sort in memory to avoid a new composite index.
  const snapshot = await announcementsCollection.where("is_active", "==", true).get();
  return snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Announcement, "id">), id: doc.id }))
    .filter(value => (value.announcement_type === "coming_soon" || value.announcement_type === "new_arrival") && isArrivalDate(value.arrival_date))
    .sort((a, b) => timestampMillis(b.created_at) - timestampMillis(a.created_at));
}

function timestampMillis(value: unknown): number {
  return value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function"
    ? (value as { toMillis(): number }).toMillis() : 0;
}

export async function createAnnouncement(data: AnnouncementInput, actor: string): Promise<string> {
  const ref = announcementsCollection.doc();
  await ref.set({ ...data, created_by: actor, created_at: FieldValue.serverTimestamp(), updated_at: FieldValue.serverTimestamp() });
  return ref.id;
}

export async function updateAnnouncement(id: string, data: AnnouncementInput | Pick<AnnouncementInput, "is_active">): Promise<void> {
  await announcementsCollection.doc(id).update({ ...data, updated_at: FieldValue.serverTimestamp() });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await announcementsCollection.doc(id).delete();
}
