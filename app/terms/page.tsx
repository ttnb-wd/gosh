import PolicyPage from "@/components/PolicyPage";
import { termsPolicy } from "@/lib/policies";

export default function TermsPage() {
  return <PolicyPage policy={termsPolicy} />;
}
