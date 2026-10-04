import { redirect } from "next/navigation";

// Reuse the existing signup form and its GOSH design.
export default function RegisterPage() { redirect("/login?mode=signup"); }
