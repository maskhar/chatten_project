const REDACTED_SERVER_ERROR = /^an error occurred in the server components render/i;

/**
 * Next.js redirects are thrown control-flow values. Callers that catch Server
 * Action failures must let them escape or a successful redirect looks failed.
 */
export function isRedirectError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === "object"
    && "digest" in error
    && typeof error.digest === "string"
    && error.digest.startsWith("NEXT_REDIRECT"),
  );
}

/**
 * Keep actionable errors written by our Server Actions, but never echo Next's
 * production redaction boilerplate (or an arbitrary non-Error value) to an
 * operator.
 */
export function actionErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  return !message || REDACTED_SERVER_ERROR.test(message) ? fallback : message;
}
