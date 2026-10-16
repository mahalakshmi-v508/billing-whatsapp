import React, { useState, useEffect } from "react";
import { DownloadCloud, RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * UpdateNotificationBanner
 * Renders non-intrusive auto-update alerts and download progress in the Electron desktop app.
 * If running in a regular web browser, this component returns null without any side-effects.
 */
export default function UpdateNotificationBanner() {
  const [updateState, setUpdateState] = useState(null); // null | 'available' | 'downloading' | 'downloaded' | 'error'
  const [version, setVersion] = useState("");
  const [progress, setProgress] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Only activate if running inside Electron with the preload API exposed
    if (typeof window === "undefined" || !window.electronAPI) {
      return;
    }

    const unsubscribeStatus = window.electronAPI.onUpdaterStatus?.((data) => {
      if (!data) return;

      if (data.status === "available") {
        setVersion(data.version || "");
        setUpdateState("available");
        setIsDismissed(false);
      } else if (data.status === "downloaded") {
        setVersion(data.version || "");
        setUpdateState("downloaded");
        setIsDismissed(false);
      } else if (data.status === "error") {
        // Log error silently, do not disturb user unless already downloading
        setUpdateState((prev) => (prev === "downloading" ? "error" : null));
      }
    });

    const unsubscribeProgress = window.electronAPI.onDownloadProgress?.((data) => {
      if (!data) return;
      setUpdateState("downloading");
      setProgress(data.percent || 0);
      setIsDismissed(false);
    });

    return () => {
      if (typeof unsubscribeStatus === "function") unsubscribeStatus();
      if (typeof unsubscribeProgress === "function") unsubscribeProgress();
    };
  }, []);

  if (isDismissed || !updateState || typeof window === "undefined" || !window.electronAPI) {
    return null;
  }

  const handleRestart = () => {
    if (window.electronAPI?.restartAndInstall) {
      window.electronAPI.restartAndInstall();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <aside
      aria-label="Desktop application update notification"
      className="fixed bottom-5 right-5 z-50 max-w-md w-full bg-slate-900/95 text-white p-4 rounded-xl shadow-2xl border border-slate-700/80 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {updateState === "downloaded" ? (
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : updateState === "error" ? (
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <DownloadCloud className="w-5 h-5 animate-bounce" />
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-100">
              {updateState === "downloaded"
                ? "Update Ready to Install"
                : updateState === "downloading"
                ? `Downloading Update (${progress}%)`
                : updateState === "available"
                ? "New Version Available"
                : "Update Notice"}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {updateState === "downloaded"
                ? `Cashio v${version} is ready. Restart when you finish current bills.`
                : updateState === "downloading"
                ? `Downloading Cashio v${version} in background...`
                : updateState === "available"
                ? `A newer version v${version} was found.`
                : "Update failed to download. Will retry on next startup."}
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {updateState === "downloading" && (
        <div className="mt-3 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {updateState === "downloaded" && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Later (Keep Billing)
          </button>
          <button
            onClick={handleRestart}
            className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Restart & Install
          </button>
        </div>
      )}
    </aside>
  );
}
