/* ───────────────────────────────────────────────────────────────────────────
   Pending WhatsApp send — durable hand-off between a Reports / Sale Invoice
   "Share → WhatsApp" click and the internal /whatsapp page.

   Why this exists
   ---------------
   When WhatsApp is not connected we must NOT open WhatsApp Web / wa.me.
   We store the full invoice context here, navigate internally to /whatsapp,
   and the page consumes + resumes the send after the QR is scanned.

   Storage: sessionStorage (survives same-tab navigation AND refresh, cleared
   when the tab closes). Only non-sensitive context is persisted — never the
   generated PDF, never auth tokens.

   Duplicate-send safety is a two-part guard:
     1. a per-action unique `id` recorded in a "sent history" list
     2. a status flag flipped to "sent" on the stored action itself
   Both are checked before any auto-send, so a refresh, a re-render or a
   repeated connection event can never re-send the same invoice.
   ─────────────────────────────────────────────────────────────────────────── */

const PENDING_KEY = "billing_pending_whatsapp_send";
const HISTORY_KEY = "billing_whatsapp_send_history";
const HISTORY_LIMIT = 50;

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readStore() {
  try {
    const v = safeParse(sessionStorage.getItem(PENDING_KEY), null);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

function writeStore(value) {
  try {
    if (value) sessionStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* storage unavailable (private mode) — flow degrades to in-page sending */
  }
}

function readHistory() {
  try {
    const h = safeParse(sessionStorage.getItem(HISTORY_KEY), []);
    return Array.isArray(h) ? h : [];
  } catch {
    return [];
  }
}

export function getPendingWhatsAppSend() {
  return readStore();
}

export function hasPendingWhatsAppSend() {
  return !!readStore();
}

/* Build a brand-new pending action with a unique id and persist it. */
export function queuePendingWhatsAppSend(action = {}) {
  const pending = {
    id: `pws_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    type: "invoice",
    action: "send_invoice",
    status: "pending",
    createdAt: new Date().toISOString(),
    ...action,
  };
  writeStore(pending);
  return pending;
}

export function updatePendingWhatsAppSend(patch = {}) {
  const current = readStore();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeStore(next);
  return next;
}

export function isPendingWhatsAppSendCompleted(pending) {
  if (!pending) return true;
  if (pending.status === "sent" || pending.status === "cancelled") return true;
  if (pending.id && readHistory().includes(pending.id)) return true;
  return false;
}

/* Permanently block this action id from ever auto-sending again. */
export function markPendingWhatsAppSendSent(pending) {
  if (!pending?.id) return;
  try {
    const history = [pending.id, ...readHistory().filter((x) => x !== pending.id)].slice(0, HISTORY_LIMIT);
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    /* ignore */
  }
  const current = readStore();
  if (current && current.id === pending.id) {
    writeStore({ ...current, status: "sent", sentAt: new Date().toISOString() });
  }
}

export function clearPendingWhatsAppSend() {
  writeStore(null);
}
