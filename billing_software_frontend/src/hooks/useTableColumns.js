import { useState, useMemo, useCallback } from "react";

/**
 * Universal custom hook to manage table column visibility, persistence in localStorage, and drawer state.
 * Supports both signatures:
 *   useTableColumns(storageKey, defaultColumns)
 *   useTableColumns(defaultColumns, storageKey)
 */
export default function useTableColumns(arg1, arg2) {
  const storageKey = typeof arg1 === "string" ? arg1 : (typeof arg2 === "string" ? arg2 : "table_columns_default");
  const rawColumns = Array.isArray(arg1) ? arg1 : (Array.isArray(arg2) ? arg2 : []);

  // Normalize column definitions so both .key and .id work seamlessly
  const defaultColumns = useMemo(() => {
    return rawColumns.map((col) => {
      const key = col.key || col.id || "";
      const id = col.id || col.key || "";
      const defaultVisible = col.defaultVisible !== undefined ? col.defaultVisible : (col.visible !== undefined ? col.visible : true);
      return {
        ...col,
        key,
        id,
        defaultVisible,
      };
    });
  }, [rawColumns]);

  const [showColumnDrawer, setShowColumnDrawer] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return defaultColumns.reduce((acc, col) => {
            const isVis = parsed[col.key] !== undefined ? Boolean(parsed[col.key]) : (parsed[col.id] !== undefined ? Boolean(parsed[col.id]) : col.defaultVisible);
            return {
              ...acc,
              [col.key]: isVis,
              [col.id]: isVis,
            };
          }, {});
        } else if (Array.isArray(parsed)) {
          return defaultColumns.reduce((acc, col) => {
            const found = parsed.find(
              (p) => (typeof p === "string" && (p === col.key || p === col.id)) ||
                     (p && typeof p === "object" && (p.key === col.key || p.id === col.id || p.key === col.id || p.id === col.key))
            );
            const isVis = found
              ? (typeof found === "object" && found.visible !== undefined ? Boolean(found.visible) : true)
              : col.defaultVisible;
            return {
              ...acc,
              [col.key]: isVis,
              [col.id]: isVis,
            };
          }, {});
        }
      }
    } catch (e) {
      console.error("Error loading column preferences:", e);
    }
    return defaultColumns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.defaultVisible,
      [col.id]: col.defaultVisible,
    }), {});
  });

  const toggleColumn = useCallback((colIdentifier) => {
    setVisibleColumns((prev) => {
      const col = defaultColumns.find((c) => c.key === colIdentifier || c.id === colIdentifier);
      const k = col ? col.key : colIdentifier;
      const id = col ? col.id : colIdentifier;
      const nextVal = !prev[k];
      const next = {
        ...prev,
        [k]: nextVal,
        [id]: nextVal,
      };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.error("Error saving column preferences:", e);
      }
      return next;
    });
  }, [defaultColumns, storageKey]);

  const selectAllColumns = useCallback((val = true) => {
    const next = defaultColumns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.fixed ? true : val,
      [col.id]: col.fixed ? true : val,
    }), {});
    setVisibleColumns(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error("Error saving column preferences:", e);
    }
  }, [defaultColumns, storageKey]);

  const resetDefaultColumns = useCallback(() => {
    const next = defaultColumns.reduce((acc, col) => ({
      ...acc,
      [col.key]: col.defaultVisible,
      [col.id]: col.defaultVisible,
    }), {});
    setVisibleColumns(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.error("Error resetting column preferences:", e);
    }
  }, [defaultColumns, storageKey]);

  const isColumnVisible = useCallback((colKey) => {
    if (visibleColumns[colKey] !== undefined) return Boolean(visibleColumns[colKey]);
    return true;
  }, [visibleColumns]);

  const liveColumns = useMemo(() => {
    return defaultColumns.map((col) => ({
      ...col,
      visible: visibleColumns[col.key] !== undefined ? Boolean(visibleColumns[col.key]) : (visibleColumns[col.id] !== undefined ? Boolean(visibleColumns[col.id]) : col.defaultVisible),
    }));
  }, [defaultColumns, visibleColumns]);

  const visibleColumnCount = useMemo(() => {
    return defaultColumns.filter((col) => visibleColumns[col.key] || visibleColumns[col.id]).length || defaultColumns.length || 1;
  }, [defaultColumns, visibleColumns]);

  return {
    // Sales pattern:
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumns,
    selectAllColumns,
    resetDefaultColumns,

    // Purchase / helper pattern:
    isOpen: showColumnDrawer,
    openSettings: () => setShowColumnDrawer(true),
    closeSettings: () => setShowColumnDrawer(false),
    columns: liveColumns,
    toggleColumn,
    resetColumns: resetDefaultColumns,
    isColumnVisible,
    visibleColumnCount,
  };
}

export { useTableColumns };
