/**
 * Concurrent-edit detection helpers.
 *
 * Stamps writes with `updatedAt` (ISO timestamp) + `updatedBy` (admin login id)
 * so the audit trail is always populated, and exposes a soft warning when two
 * admins try to edit the same record at the same time.
 *
 * Soft warning, not a hard lock: the second writer is rejected with a friendly
 * error pointing at the other admin. They reload, see the latest data, and decide
 * whether to redo their change.
 */

export class ConcurrentEditError extends Error {
  readonly latestUpdatedAt: string;
  readonly latestUpdatedBy: string;

  constructor(latestUpdatedAt: string, latestUpdatedBy: string) {
    super(
      `This record was just modified by ${latestUpdatedBy || "another admin"} at ${
        new Date(latestUpdatedAt).toLocaleTimeString()
      }. Reload the page to see the latest version before editing again.`
    );
    this.name = "ConcurrentEditError";
    this.latestUpdatedAt = latestUpdatedAt;
    this.latestUpdatedBy = latestUpdatedBy;
  }
}

export interface AuditMeta {
  updatedAt: string;
  updatedBy: string;
}

/**
 * Returns the current actor identity for audit stamping. Pulled from the
 * admin-session sentinel set during login. Falls back to "system" for
 * background jobs (leave replenishment, sync) that aren't user-initiated.
 */
export function currentEditor(): string {
  if (typeof window === "undefined") return "system";
  try {
    return sessionStorage.getItem("rsr_admin_login_id") || "system";
  } catch {
    return "system";
  }
}

/** Always-stamped audit metadata for a fresh write. */
export function stampAuditMeta(): AuditMeta {
  return {
    updatedAt: new Date().toISOString(),
    updatedBy: currentEditor(),
  };
}
