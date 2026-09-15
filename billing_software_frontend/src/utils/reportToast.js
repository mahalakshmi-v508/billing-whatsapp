/* Minimal module-level toast store for the Reports section.
   Pages import { showToast } from here to push a toast; the shared
   <ReportToaster/> (mounted once in ReportsLayout) renders them. */

let toasts = [];
const listeners = new Set();
let nextId = 0;

function emit() {
  listeners.forEach((l) => l());
}

/**
 * Push a toast notification.
 * kind: "success" | "error" | "warning"
 */
export function showToast(message, kind = "success", duration = 4000) {
  const id = ++nextId;
  toasts = [...toasts, { id, message, kind }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, duration);
}

export function subscribeReportToast(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getReportToasts() {
  return toasts;
}

export function clearReportToasts() {
  toasts = [];
  emit();
}