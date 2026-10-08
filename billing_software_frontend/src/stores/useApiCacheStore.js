import { create } from "zustand";

/**
 * Universal In-Memory GET API Cache Store powered by Zustand.
 * Caches GET API responses to prevent redundant network fetches across components/pages.
 */
export const useApiCacheStore = create((set, get) => ({
  cache: {},

  /**
   * Retrieve cached data for a specific cache key if not expired.
   */
  getCache: (key) => {
    const entry = get().cache[key];
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      // Evict expired entry
      get().clearKey(key);
      return null;
    }

    return entry.data;
  },

  /**
   * Set cached data with a time-to-live (TTL in minutes, default: 5 minutes).
   */
  setCache: (key, data, ttlMinutes = 5) => {
    const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: { data, expiresAt },
      },
    }));
  },

  /**
   * Invalidate specific cache keys that match a pattern or endpoint string.
   * e.g., clearKey("products") invalidates all keys containing "products".
   */
  clearKey: (pattern) => {
    if (!pattern) return;
    set((state) => {
      const nextCache = { ...state.cache };
      let changed = false;
      Object.keys(nextCache).forEach((k) => {
        if (k.includes(pattern)) {
          delete nextCache[k];
          changed = true;
        }
      });
      return changed ? { cache: nextCache } : state;
    });
  },

  /**
   * Invalidate multiple patterns at once.
   */
  clearKeys: (patterns = []) => {
    if (!Array.isArray(patterns) || patterns.length === 0) return;
    set((state) => {
      const nextCache = { ...state.cache };
      let changed = false;
      Object.keys(nextCache).forEach((k) => {
        if (patterns.some((p) => k.includes(p))) {
          delete nextCache[k];
          changed = true;
        }
      });
      return changed ? { cache: nextCache } : state;
    });
  },

  /**
   * Completely clear the entire cache (useful on logout, company switch, etc.).
   */
  clearAll: () => set({ cache: {} }),
}));
