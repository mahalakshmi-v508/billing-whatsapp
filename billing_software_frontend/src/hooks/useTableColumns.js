import { useState, useCallback, useMemo } from "react";

/**
 * useTableColumns
 *
 * Custom hook to manage table column visibility with localStorage persistence.
 *
 * @param {string} storageKey - Unique localStorage key for this table
 * @param {Array} defaultColumns - Array of column definition objects [{ key: string, ... }]
 * @returns {Object} {
 *   visibleColumns,
 *   toggleColumn,
 *   selectAllColumns,
 *   resetDefaultColumns,
 *   showColumnDrawer,
 *   setShowColumnDrawer,
 *   openColumnDrawer,
 *   closeColumnDrawer,
 *   visibleColumnCount
 * }
 */
export default function useTableColumns(storageKey, defaultColumns = []) {
  const [showColumnDrawer, setShowColumnDrawer] = useState(false);

  const initialColumns = useMemo(() => {
    try {
      if (storageKey) {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return defaultColumns.reduce((acc, col) => ({
            ...acc,
            [col.key]: parsed[col.key] !== undefined ? !!parsed[col.key] : true,
          }), {});
        }
      }
    } catch (e) {
      console.error(`Error loading table columns for ${storageKey}:`, e);
    }
    return defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  }, [storageKey, defaultColumns]);

  const [visibleColumns, setVisibleColumns] = useState(initialColumns);

  const toggleColumn = useCallback(
    (key) => {
      setVisibleColumns((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        if (storageKey) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch (e) {
            console.error(e);
          }
        }
        return next;
      });
    },
    [storageKey]
  );

  const selectAllColumns = useCallback(
    (val) => {
      const next = defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: !!val }), {});
      setVisibleColumns(next);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
      }
    },
    [storageKey, defaultColumns]
  );

  const resetDefaultColumns = useCallback(() => {
    const next = defaultColumns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
    setVisibleColumns(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
    }
  }, [storageKey, defaultColumns]);

  const openColumnDrawer = useCallback(() => setShowColumnDrawer(true), []);
  const closeColumnDrawer = useCallback(() => setShowColumnDrawer(false), []);

  const visibleColumnCount = useMemo(() => {
    return defaultColumns.filter((col) => visibleColumns[col.key] !== false).length;
  }, [defaultColumns, visibleColumns]);

  return {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    openColumnDrawer,
    closeColumnDrawer,
    visibleColumnCount,
  };
}
