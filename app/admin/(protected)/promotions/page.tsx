import { Metadata } from "next";
import ProductPromotionManager from "@/components/admin/ProductPromotionManager";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata: Metadata = {
  title: "Promotions | Admin",
  description: "Manage product promotions and discounts",
};

export default function PromotionsPage() {
  return <><AdminHeader title="Promotions" subtitle="Considered offers, thoughtfully timed" /><main><ProductPromotionManager /></main></>;
}
