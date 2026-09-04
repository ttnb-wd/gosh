import { Metadata } from "next";
import ProductPromotionManager from "@/components/admin/ProductPromotionManager";

export const metadata: Metadata = {
  title: "Product Promotions | Admin",
  description: "Manage product promotional pricing",
};

export default function ProductPromotionsPage() {
  return <ProductPromotionManager />;
}
