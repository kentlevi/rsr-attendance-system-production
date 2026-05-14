/**
 * Read-only mode flag.
 *
 * Set by the auth store when an admin is logged in via cached credentials with
 * no internet connection. Services consult this before issuing Firestore writes
 * so we don't trigger the network retry storm and silently drop mutations.
 *
 * Lives in a standalone module (not in the auth store) to avoid circular imports:
 * the auth store already imports every service, so services cannot import the
 * auth store back. This module is dependency-free.
 */

export class ReadOnlyOfflineError extends Error {
  constructor(action: string = "this action") {
    super(`Offline admin mode is read-only — ${action} cannot be saved until you're back online.`);
    this.name = "ReadOnlyOfflineError";
  }
}

let readOnly = false;

export function isReadOnlyOffline(): boolean {
  return readOnly;
}

export function setReadOnlyOffline(value: boolean): void {
  readOnly = value;
}

/**
 * Throws `ReadOnlyOfflineError` when the app is in offline-admin mode.
 * Call at the top of any service mutation method.
 */
export function assertWritable(action?: string): void {
  if (readOnly) throw new ReadOnlyOfflineError(action);
}
