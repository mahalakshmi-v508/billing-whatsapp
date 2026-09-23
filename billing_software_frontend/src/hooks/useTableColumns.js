import { useState, useMemo, useCallback } from "react";

/**
 * Custom hook to manage table column visibility, persistence in localStorage, and drawer state.
 * @param {string} storageKey - The localStorage key to persist preferences under.
 * @param {Array<{ key: string, label: string }>} defaultColumns - Default list of column configurations.
 */
export default function useTableColumns(storageKey, defaultColumns = []) {
  const [showColumnDrawer, setShowColumnDrawer] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return defaultColumns.reduce((acc, col) => ({
          ...acc,
          [col.key]: parsed[col.key] !== undefined ? Boolean(parsed[col.key]) : true,
        }), {});
      }
    } catch (e) {
      console.error("Error loading column preferences:", e);
    }
    return defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  });

  const toggleColumn = useCallback((key) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving column preferences:", e);
      }
      return next;
    });
  }, [storageKey]);

  const selectAllColumns = useCallback((val = true) => {
    const next = defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: val }), {});
    setVisibleColumns(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error("Error saving column preferences:", e);
    }
  }, [defaultColumns, storageKey]);

  const resetDefaultColumns = useCallback(() => {
    const next = defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    setVisibleColumns(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error("Error resetting column preferences:", e);
    }
  }, [defaultColumns, storageKey]);

  const visibleColumnCount = useMemo(() => {
    return defaultColumns.filter((col) => visibleColumns[col.key]).length || 1;
  }, [defaultColumns, visibleColumns]);

  return {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  };
}
