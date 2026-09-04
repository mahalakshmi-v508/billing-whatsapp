import api from "../../services/api";

const CACHE_KEY = "company_settings_cache";

function getCompanyId() {
  try {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    if (u && u.company_id) return u.company_id;
    const sel = localStorage.getItem("selected_company_id");
    if (sel && /^\d+$/.test(sel)) return Number(sel);
  } catch {
    /* ignore */
  }
  return null;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* best-effort */
  }
}

export async function fetchSettings() {
  const companyId = getCompanyId();
  const fallback = readCache();
  if (!companyId) return Promise.resolve(fallback || {});
  try {
    const res = await api.get("/settings/get", { params: { company_id: companyId } });
    const data = (res.data && res.data.data) || {};
    writeCache(data);
    return data;
  } catch {
    return Promise.resolve(fallback || {});
  }
}

export async function saveSettings(patch) {
  const companyId = getCompanyId();
  if (!companyId) return;
  const cache = readCache() || {};
  const merged = { ...cache, ...patch };
  writeCache(merged);
  try {
    await api.post("/settings/save", { company_id: companyId, settings: merged });
  } catch {
    /* offline: keep local copy, will retry next save */
  }
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const debouncedSave = debounce(saveSettings, 600);

export { debouncedSave, getCompanyId };