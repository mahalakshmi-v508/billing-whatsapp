import axios from "axios";
import { useApiCacheStore } from "../stores/useApiCacheStore";

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// API base comes from the environment (VITE_API_URL). Falls back to the
// historical default only for local development so existing dev setups
// keep working without a .env file.
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? "http://localhost:8000/api/" : "");

if (!API_BASE_URL) {
  console.error(
    "VITE_API_URL is not configured. Set it in billing_software_frontend/.env (see .env.example)."
  );
}

// Web/docroot root where uploaded files live. Derive it from the API base by
// stripping "/api/" — matching the working logo-URL convention used across the
// app (EditCompany/profile via API_BASE_URL.replace("/api/", "/")). This yields
// the correct root for both localhost (http://localhost:8000 → public/uploads)
// and production (…/backend/public → public/uploads).
// Can be overridden explicitly with VITE_API_URL_IMAGE.
export const API_BASE_URL_IMAGE =
  (import.meta.env.VITE_API_URL_IMAGE || API_BASE_URL.replace("/api/", "/")).replace(/\/+$/, "");

// Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Prevent UI from hanging on "Loading..." forever when the server is slow/down.
  timeout: 30000,
});

/**
 * The backend API has no server-side session (auth is a client-side
 * localStorage contract), so it cannot tell who performed a request on its own.
 * These headers let the audit middleware attribute each action to the signed-in
 * user without changing every call site. CORS allows all origins, so custom
 * headers are accepted as-is.
 */
function currentUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return {};
    const user = JSON.parse(raw);
    return user && typeof user === "object" ? user : {};
  } catch {
    return {};
  }
}

function activeCompanyId(user) {
  if (user.company_id) return user.company_id;
  const selected = localStorage.getItem("selected_company_id");
  return selected && /^\d+$/.test(selected) ? Number(selected) : null;
}

// Interceptor to strip .php extension and adjust endpoints for the Laravel backend
api.interceptors.request.use((config) => {
  const user = currentUser();

  const userId = user.id ?? user.admin_id ?? null;
  if (userId) config.headers["X-User-Id"] = String(userId);
  if (user.name) config.headers["X-User-Name"] = String(user.name).slice(0, 150);
  if (user.role) config.headers["X-User-Role"] = String(user.role).slice(0, 50);

  const companyId = activeCompanyId(user);
  if (companyId) config.headers["X-Company-Id"] = String(companyId);

  if (config.url) {
    let url = config.url;

    // 1. Remove the .php extension (either at end of path, or followed by query params)
    url = url.replace(/\.php(\?|$)/, '$1');

    // 2. Adjust specific case-sensitive endpoints to match Laravel backend routes
    if (url.includes("/admin/update_Admin")) {
      url = url.replace("/admin/update_Admin", "/admin/update_admin");
    }

    config.url = url;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Endpoints that require real-time polling / live status and should bypass cache
const NO_CACHE_PATTERNS = [
  "/whatsapp/connect_status",
  "/whatsapp/qr",
  "/whatsapp/status",
  "/notifications",
  "/invoice-settings/next-number",
  "next-number",
  "next_number",
];

// Response interceptor: automatically invalidate relevant cache entries on mutations (POST, PUT, DELETE, PATCH)
api.interceptors.response.use(
  (response) => {
    const method = response.config?.method?.toLowerCase();
    if (["post", "put", "delete", "patch"].includes(method)) {
      const rawUrl = response.config?.url || "";
      const cleanPath = String(rawUrl).replace(/^\/?api\//, "").replace(/^\/+/, "");
      const segments = cleanPath.split("/").filter(Boolean);
      const mainResource = segments[0] ? segments[0].replace(/\.php$/, "") : "";

      if (mainResource) {
        useApiCacheStore.getState().clearKey(mainResource);
      }
    }
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Wrap api.get with transparent Zustand in-memory caching
const originalGet = api.get.bind(api);

api.get = async (url, config = {}) => {
  const shouldSkip =
    Boolean(config.skipCache) ||
    NO_CACHE_PATTERNS.some((pattern) => String(url).includes(pattern));

  if (shouldSkip) {
    return originalGet(url, config);
  }

  const user = currentUser();
  const companyId = activeCompanyId(user) || "default";
  const paramsKey = config.params ? JSON.stringify(config.params) : "";
  const cacheKey = `[co:${companyId}] ${url}::${paramsKey}`;

  const cachedData = useApiCacheStore.getState().getCache(cacheKey);
  if (cachedData !== null) {
    return {
      data: cachedData,
      status: 200,
      statusText: "OK (Zustand Cache)",
      headers: {},
      config,
      fromCache: true,
    };
  }

  const response = await originalGet(url, config);

  if (response && response.status >= 200 && response.status < 300 && response.data) {
    const ttlMinutes = typeof config.cacheTtlMinutes === "number" ? config.cacheTtlMinutes : 5;
    useApiCacheStore.getState().setCache(cacheKey, response.data, ttlMinutes);
  }

  return response;
};

/**
 * Manually invalidate specific cache patterns or clear all cache.
 * e.g., invalidateApiCache("products") or invalidateApiCache() for full reset.
 */
export const invalidateApiCache = (pattern) => {
  if (pattern) {
    useApiCacheStore.getState().clearKey(pattern);
  } else {
    useApiCacheStore.getState().clearAll();
  }
};

export default api;