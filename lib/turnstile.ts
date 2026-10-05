import "server-only";
interface TurnstileVerifyResult {
  success: boolean;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (process.env.NODE_ENV !== "production" && token === "__LOCAL_TURNSTILE_BYPASS__") {
    return { success: true, error: null };
  }

  if (!secret) {
    return { success: false, error: "Security check is temporarily unavailable." };
  }

  if (typeof token !== "string" || !token || token.length > 2048) {
    return { success: false, error: "Security check is required." };
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(10_000),
  });

  const result = (await response.json()) as TurnstileVerifyResult;

  const allowedHosts = new Set(["www.goshperfumestudio.com", "goshperfumestudio.com",
    ...(process.env.TURNSTILE_ALLOWED_HOSTNAMES || "").split(",").map(h => h.trim()).filter(Boolean)]);
  if (!result.success || (process.env.NODE_ENV === "production" && !allowedHosts.has(result.hostname || ""))) {
    return {
      success: false,
      error: "Security check failed. Please try again.",
    };
  }

  return { success: true, error: null };
}
