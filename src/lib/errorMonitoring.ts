/**
 * Sentry initialisation + PII scrubbing.
 *
 * Configured to:
 *   - Skip entirely when SENTRY_DSN env var is unset (dev / no monitoring).
 *   - Skip when running in tests.
 *   - Scrub fields that carry biometric / personal data before send so we
 *     don't accidentally exfiltrate face descriptors or attendance photos.
 *
 * To enable: set `VITE_SENTRY_DSN` in `.env.local` (web) or in your APK build
 * env. Sign up at https://sentry.io for a free DSN (5k events/month).
 */
import * as Sentry from "@sentry/react";

// Fields that may carry biometric/personal data. Stripped from events before send.
const PII_FIELDS = [
  "faceDataEncodings",
  "faceDescriptor",
  "photoDataUrl",
  "imageIn",
  "imageOut",
  "facialDataImage",
  "pin",
  "password",
  "passwordHash",
];

function redact(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_FIELDS.includes(key)) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object") {
      out[key] = redact(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function initErrorMonitoring(): void {
  const dsn = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;
  const isProduction = (import.meta as any).env?.MODE === "production";
  const isTest =
    typeof process !== "undefined" &&
    (process.env?.NODE_ENV === "test" || process.env?.VITEST);

  if (!dsn || isTest) {
    if (typeof window !== "undefined") {
      console.info("[errorMonitoring] Sentry disabled — no VITE_SENTRY_DSN.");
    }
    return;
  }

  Sentry.init({
    dsn,
    environment: isProduction ? "production" : "development",
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend(event) {
      // Strip biometric / PII fields from breadcrumbs, contexts, extras.
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          data: bc.data ? redact(bc.data) : bc.data,
        }));
      }
      if (event.contexts) event.contexts = redact(event.contexts);
      if (event.extra) event.extra = redact(event.extra);
      return event;
    },
  });

  // One-line confirmation in console so deployments are easy to spot-check.
  // We don't expose `Sentry` on window in production; if you need to manually
  // capture from DevTools again, import * as Sentry from "@sentry/react"
  // somewhere temporarily.
  if (typeof window !== "undefined") {
    console.info(
      `[errorMonitoring] Sentry initialised. DSN host: ${new URL(dsn).host}`
    );
  }
}

export { Sentry };
