import * as Sentry from "@sentry/browser";

let initialized = false;

export function initSentry() {
  if (initialized || typeof window === "undefined") return;
  const dsn = import.meta.env["VITE_SENTRY_DSN"];
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    environment: import.meta.env["VITE_SENTRY_ENVIRONMENT"] || "production",
    // Chat messages and document photos can contain personal details — never
    // let Sentry capture request/response bodies, form data, or DOM text.
    sendDefaultPii: false,
  });
  initialized = true;
}

export function captureError(error: unknown) {
  if (!initialized) return;
  Sentry.captureException(error);
}
