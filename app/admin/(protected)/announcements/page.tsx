import AnnouncementManager from "@/components/admin/AnnouncementManager";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata = {
  title: "Announcements | Admin",
  description: "Manage marketing announcements and banners",
};

export default function AnnouncementsPage() {
  return <><AdminHeader title="Announcements" subtitle="The latest from your studio" /><main><AnnouncementManager /></main></>;
}
