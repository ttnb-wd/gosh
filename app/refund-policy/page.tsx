import PolicyPage from "@/components/PolicyPage";
import { refundPolicy } from "@/lib/policies";

export default function RefundPolicyPage() {
  return <PolicyPage policy={refundPolicy} />;
}
