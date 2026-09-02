import { useCallback, useEffect, useState } from "react";
import { fetchSettings, saveSettings } from "./settingsApi";

/**
 * Wires a settings page's state to the backend company_settings row.
 *
 * Before mounting we optimistically read from the backend cache (which mirrors
 * the server), then reconcile with the server on mount. Every write is
 * persisted both to localStorage (per-page key) and to the backend (page-keyed
 * sub-object, debounced).
 *
 * @param {string} pageKey  unique key for this page inside the settings row
 * @param {object} defaults default field values
 */
export function useCompanySetting(pageKey, defaults) {
  const STORAGE_KEY = `settings_${pageKey}`;

  const readLocal = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }, [STORAGE_KEY, defaults]);

  const [state, setState] = useState(readLocal);

  useEffect(() => {
    let mounted = true;
    fetchSettings().then((server) => {
      if (!mounted) return;
      const merged = { ...readLocal(), ...((server && server[pageKey]) || {}) };
      setState(merged);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* best-effort */
      }
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const set = useCallback(
    (key) =>
      (val) => {
        setState((s) => {
          const next = { ...s, [key]: typeof val === "function" ? val(s[key]) : val };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            /* best-effort */
          }
          saveSettings({ [pageKey]: next });
          return next;
        });
      },
    [STORAGE_KEY, pageKey]
  );

  const setEntire = useCallback(
    (next) => {
      setState((s) => {
        const merged = typeof next === "function" ? next(s) : next;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch {
          /* best-effort */
        }
        saveSettings({ [pageKey]: merged });
        return merged;
      });
    },
    [STORAGE_KEY, pageKey]
  );

  return [state, set, setEntire];
}

/**
 * Legacy alias for pages that already call loadState()/set().
 */
export function mergeLocal(key, defaults) {
  return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") };
}