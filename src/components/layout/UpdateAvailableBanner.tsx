import React, { useEffect, useState } from "react";
import { Download, AlertOctagon } from "lucide-react";
import {
  appVersionService,
  type AppVersionState,
} from "../../services/AppVersionService";

const DISMISS_KEY_PREFIX = "rsr_update_banner_dismissed_";

/**
 * Compares the running bundle to `appVersions/latest` and surfaces:
 *   - a soft amber banner when a newer version exists (dismissible per-version)
 *   - a hard red blocking overlay when the running version is below
 *     `minSupportedVersion`
 */
export function UpdateAvailableBanner() {
  const [state, setState] = useState<AppVersionState>(appVersionService.getState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    appVersionService.initialize();
    setState(appVersionService.getState());
    const unsub = appVersionService.subscribe(setState);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (state.latest) {
      const key = `${DISMISS_KEY_PREFIX}${state.latest.version}`;
      setDismissed(sessionStorage.getItem(key) === "1");
    }
  }, [state.latest?.version]);

  if (!state.latest) return null;
  if (state.status === "up-to-date") return null;

  const handleDownload = () => {
    if (state.latest?.apkUrl) {
      window.open(state.latest.apkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDismiss = () => {
    if (state.latest) {
      sessionStorage.setItem(`${DISMISS_KEY_PREFIX}${state.latest.version}`, "1");
      setDismissed(true);
    }
  };

  // Hard block: running version is unsupported.
  if (state.status === "update-required") {
    return (
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl">
          <div className="flex items-center gap-3 text-red-600">
            <AlertOctagon size={28} />
            <h2 className="text-[20px] font-bold text-[#1a1a1a]">Update required</h2>
          </div>
          <p className="text-[15px] text-text-secondary leading-relaxed">
            This version (v{state.current}) is no longer supported. Please install
            v{state.latest.version} to continue.
          </p>
          {state.latest.releaseNotes && (
            <p className="text-[13px] text-text-secondary bg-slate-50 rounded-lg p-3 leading-relaxed">
              {state.latest.releaseNotes}
            </p>
          )}
          <button
            onClick={handleDownload}
            disabled={!state.latest.apkUrl}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
          >
            <Download size={18} />
            Download v{state.latest.version}
          </button>
        </div>
      </div>
    );
  }

  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="w-full max-w-[1200px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 px-4 sm:px-6 md:px-8 py-2.5 text-[13px] sm:text-[14px]">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Download size={16} className="flex-shrink-0" />
          <span className="font-medium">
            Update available: v{state.latest.version}
            <span className="hidden sm:inline">
              {" "}— you're on v{state.current}.
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleDownload}
            disabled={!state.latest.apkUrl}
            className="px-3 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-[12px] sm:text-[13px] font-semibold disabled:opacity-50"
          >
            Download
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1 rounded-lg border border-amber-300 hover:bg-amber-100 text-[12px] sm:text-[13px] font-medium"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
