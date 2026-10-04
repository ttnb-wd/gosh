import { safeAuthRedirect } from "./errors";

// One deployment setting shared by browser and server email flows.
const PRODUCTION_SITE_URL = "https://www.goshperfumestudio.com";

export function getAuthSiteUrl(developmentOrigin?: string): string {
  if (process.env.NODE_ENV !== "production" && developmentOrigin) {
    try {
      const url = new URL(developmentOrigin);
      if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return url.origin;
    } catch { /* Use the configured site instead. */ }
  }
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || PRODUCTION_SITE_URL);
    if (url.protocol === "https:") return url.origin;
  } catch { /* Never construct email links from an invalid configuration. */ }
  return PRODUCTION_SITE_URL;
}

export function verificationPath(destination: string | null, state?: "sent" | "failed"): string {
  const params = new URLSearchParams({ redirect: safeAuthRedirect(destination) });
  if (state === "sent") params.set("sent", "1");
  if (state === "failed") params.set("delivery", "failed");
  return `/verify-email?${params}`;
}

export function getEmailActionUrl(path: string, developmentOrigin?: string): string {
  return new URL(path, getAuthSiteUrl(developmentOrigin)).toString();
}

// Firebase puts our continuation URL in the action link. Extract only a local,
// safe destination; never redirect to a URL supplied by an email query string.
export function getVerificationDestination(redirect: string | null, continueUrl: string | null): string {
  if (redirect) return safeAuthRedirect(redirect);
  try {
    if (continueUrl) return safeAuthRedirect(new URL(continueUrl).searchParams.get("redirect"));
  } catch { /* Fall back to the account. */ }
  return "/account";
}
