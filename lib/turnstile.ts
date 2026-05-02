interface TurnstileVerifyResult {
  success: boolean;
  "error-codes"?: string[];
}

export async function verifyTurnstileToken(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { success: false, error: "Turnstile secret key is missing." };
  }

  if (!token) {
    return { success: false, error: "Security check is required." };
  }

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });

  const result = (await response.json()) as TurnstileVerifyResult;

  if (!result.success) {
    return {
      success: false,
      error: "Security check failed. Please try again.",
    };
  }

  return { success: true, error: null };
}
