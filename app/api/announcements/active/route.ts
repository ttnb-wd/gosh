import { NextResponse } from "next/server";
import { limitRequest } from "@/lib/security/abuse";
import { securityError } from "@/lib/security/responses";
import { getActiveAnnouncements } from "@/lib/firebase/announcements-server";
import { publicAnnouncement } from "@/lib/announcements";
import { safeUrl } from "@/lib/security/validation";

export async function GET(request: Request) {
  const limited = await limitRequest(request, "public-catalog", 120, 60);
  if (limited) return limited;
  try {
    const announcements = (await getActiveAnnouncements()).map(value => {
      const result = publicAnnouncement(value);
      // Defense in depth for older/manual database content, like the catalog APIs.
      if (result.image && !safeUrl(result.image)) result.image = null;
      if (result.cta_url && !safeUrl(result.cta_url)) { result.cta_url = ""; result.cta_text = ""; }
      return result;
    });
    return NextResponse.json({ success: true, announcements });
  } catch (error) { return securityError(error, "Could not load announcements."); }
}
