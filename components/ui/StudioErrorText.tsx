/** Render feedback without exposing service internals; validation wording stays intact. */
export default function StudioErrorText({ message, fallback = "We couldn’t complete that request. Please try again." }: { message: string | null; fallback?: string }) {
  const technical = /firebase|firestore|auth\/|permission.denied|grpc|EACCES|SQL|stack trace|ImageKit|Server returned|INVALID_|UNAVAILABLE|network request failed|fetch failed|is not a function|Cannot read|not defined|Unexpected token|TypeError|ReferenceError|https?:\/\//i.test(message ?? "");
  return <>{technical ? fallback : message}</>;
}
