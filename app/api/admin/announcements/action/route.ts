import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/apiAuth";
import { InputError, readJson } from "@/lib/security/validation";
import { securityError } from "@/lib/security/responses";
import { recordAdminChange } from "@/lib/security/audit";
import { getAllAnnouncements, getAnnouncement, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/lib/firebase/announcements-server";
import { deleteImageKitFile } from "@/lib/imagekit";
import type { AnnouncementAction } from "@/lib/types/announcements";

export async function GET(request: NextRequest) {
  try {
    await requireAdminApiAuth(request);
    return NextResponse.json({ success: true, announcements: await getAllAnnouncements() });
  } catch (error) { return securityError(error, "Could not load announcements."); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminApiAuth(request);
    const body = await readJson(request, "announcementAction") as AnnouncementAction;
    if (body.action === "create") {
      const id = await createAnnouncement(body.data, actor.uid);
      await recordAdminChange(actor.uid, "announcement.create", id);
      return NextResponse.json({ success: true, announcementId: id });
    }

    const existing = await getAnnouncement(body.announcementId);
    if (!existing) throw new InputError("Announcement not found.", 404);

    if (body.action === "update") {
      await updateAnnouncement(body.announcementId, body.data);
    } else if (body.action === "toggle") {
      await updateAnnouncement(body.announcementId, { is_active: !existing.is_active });
    } else {
      await deleteAnnouncement(body.announcementId);
    }
    await recordAdminChange(actor.uid, `announcement.${body.action}`, body.announcementId);

    const replacedImage = body.action === "update" && body.data.image && body.data.imageFileId && body.data.imageFileId !== existing.imageFileId;
    if (existing.imageFileId && (body.action === "delete" || replacedImage)) {
      try { await deleteImageKitFile(existing.imageFileId); }
      catch { console.error("Announcement image cleanup failed."); }
    }
    return NextResponse.json({ success: true });
  } catch (error) { return securityError(error, "Could not save this announcement. Please try again."); }
}
