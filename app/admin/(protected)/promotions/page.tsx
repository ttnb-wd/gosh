import { Metadata } from "next";
import ProductPromotionManager from "@/components/admin/ProductPromotionManager";

export const metadata: Metadata = {
  title: "Promotions | Admin",
  description: "Manage product promotions and discounts",
};

export default function PromotionsPage() {
  return <ProductPromotionManager />;
}
