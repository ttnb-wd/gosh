import PolicyPage from "@/components/PolicyPage";
import { deliveryPolicy } from "@/lib/policies";

export default function DeliveryPolicyPage() {
  return <PolicyPage policy={deliveryPolicy} />;
}
