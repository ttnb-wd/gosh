export function getAuthErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof TypeError) return "We couldn’t connect right now. Please try again.";
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case "auth/invalid-email": return "Please enter a valid email address.";
    case "auth/user-disabled": return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Invalid email or password.";
    case "auth/email-already-in-use": return "An account already exists with this email. Please sign in instead.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements": return "Use 8–128 characters, including at least one letter and one number.";
    case "auth/network-request-failed": return "We couldn’t connect right now. Please try again.";
    case "auth/too-many-requests": return "Too many attempts. Please try again later.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code": return "This link is invalid, expired, or already used. Please request a new link.";
    case "auth/requires-recent-login":
    case "auth/user-token-expired":
    case "auth/invalid-user-token": return "Please sign in again to continue.";
    default: return fallback;
  }
}

export function safeAuthRedirect(value: string | null, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  const route = value.split(/[?#]/)[0];
  if (/%2f|%5c|%00|%0a|%0d/i.test(route)) return fallback;
  if (["/login", "/register", "/verify-email", "/forgot-password", "/reset-password", "/auth/action"].includes(route)) return fallback;
  // Normal login returns to the storefront; admin login has its own entry.
  if (value === "/admin" || value.startsWith("/admin/")) return "/";
  return value;
}
