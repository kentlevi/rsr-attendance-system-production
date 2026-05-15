import { doc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { db, logFirestoreError, OperationType } from "../lib/firebase";

/**
 * In-app version checker.
 *
 * Compares the bundle's compile-time __APP_VERSION__ against
 * `appVersions/latest` in Firestore. Surfaces three states to the UI:
 *   - `up-to-date`  : running version matches or exceeds latest
 *   - `update-available`  : newer version published; banner suggests download
 *   - `update-required`   : running version below minSupportedVersion; UI may
 *                            block until update is installed
 *
 * The Firestore doc shape (admin-maintained):
 *   appVersions/latest = {
 *     version: "1.4.0",                 // newest released version
 *     apkUrl: "https://.../v1.4.0.apk", // download URL (Drive/Storage/your site)
 *     minSupportedVersion: "1.2.0",     // anything below is forced-update
 *     releaseNotes: "Optional...",
 *     releasedAt: "2026-05-15T..."
 *   }
 */

export interface AppVersionInfo {
  version: string;
  apkUrl?: string;
  minSupportedVersion?: string;
  releaseNotes?: string;
  releasedAt?: string;
}

export type AppVersionStatus = "up-to-date" | "update-available" | "update-required";

export interface AppVersionState {
  current: string;
  latest: AppVersionInfo | null;
  status: AppVersionStatus;
}

const COLLECTION = "appVersions";
const LATEST_DOC = "latest";

// Compare semver-ish strings ("1.2.3"). Returns -1/0/1.
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((p) => parseInt(p, 10) || 0);
  const pb = b.split(".").map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const av = pa[i] ?? 0;
    const bv = pb[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

class AppVersionService {
  private current: string =
    typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
  private latest: AppVersionInfo | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private listeners: ((state: AppVersionState) => void)[] = [];

  initialize(): void {
    if (this.unsubscribe) return;
    try {
      const ref = doc(db, COLLECTION, LATEST_DOC);
      this.unsubscribe = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            this.latest = snap.data() as AppVersionInfo;
            this.notifyListeners();
          }
        },
        (error) => {
          // Non-fatal — without a published version doc, the app just silently
          // skips the update banner.
          logFirestoreError(error, OperationType.GET, `${COLLECTION}/${LATEST_DOC}`);
        },
      );
    } catch (e) {
      // Firestore SDK or test mock is missing required exports. Don't block
      // the rest of the app from rendering.
      console.warn("AppVersionService.initialize skipped:", e);
    }
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  getState(): AppVersionState {
    return {
      current: this.current,
      latest: this.latest,
      status: this.computeStatus(),
    };
  }

  subscribe(listener: (state: AppVersionState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private computeStatus(): AppVersionStatus {
    if (!this.latest) return "up-to-date";
    if (
      this.latest.minSupportedVersion &&
      compareVersions(this.current, this.latest.minSupportedVersion) < 0
    ) {
      return "update-required";
    }
    if (compareVersions(this.current, this.latest.version) < 0) {
      return "update-available";
    }
    return "up-to-date";
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }
}

export const appVersionService = new AppVersionService();
