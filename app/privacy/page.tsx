import PolicyPage from "@/components/PolicyPage";
import { privacyPolicy } from "@/lib/policies";

export default function PrivacyPage() {
  return <PolicyPage policy={privacyPolicy} />;
}
