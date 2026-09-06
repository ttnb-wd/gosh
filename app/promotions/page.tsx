import { Suspense } from "react";
import PromotionsClient from "./PromotionsClient";

export const dynamic = "force-dynamic";

export default function PromotionsPage() {
  return (
    <Suspense fallback={null}>
      <PromotionsClient />
    </Suspense>
  );
}
