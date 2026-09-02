import { useEffect, useRef } from "react";
import { fetchSettings, saveSettings } from "./settingsApi";

/**
 * Syncs a settings component's local `state`/`setState` with the backend
 * company_settings row under `pageKey`.
 *
 * - On mount: fetch the server copy and overlay it over local state (server is
 *   the source of truth on load).
 * - Every subsequent state change is pushed to the backend (debounced inside
 *   saveSettings) while the page still keeps its own localStorage cache.
 *
 * Place ONE call at the top of a settings component:
 *   useBackendSync("transaction", state, setState);
 */
export function useBackendSync(pageKey, state, setState) {
  const hydrated = useRef(false);

  useEffect(() => {
    let mounted = true;
    fetchSettings().then((server) => {
      if (!mounted) return;
      const incoming = server && server[pageKey];
      if (incoming) {
        setState((s) => ({ ...s, ...incoming }));
      }
      hydrated.current = true;
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    saveSettings({ [pageKey]: state });
  }, [state, pageKey]);
}