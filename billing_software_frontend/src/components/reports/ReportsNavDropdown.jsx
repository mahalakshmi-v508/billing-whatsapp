import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Search, Plus, FileText, X } from "lucide-react";
import { reports, findReportByPath } from "./reportNavigation";
import { getFrequentlyUsedReports, removeFrequentReport } from "./reportUsage";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";

/**
 * Report header used at the top of every report page:
 *
 *  FIRST ROW → "Current Report" — searchable list of ALL reports from the
 *              registry.
 *  SECOND ROW → small compact chips, one per frequently-used report (from the
 *              user's actual viewing history, see reportUsage.js). Each chip
 *              navigates to that report; its × removes ONLY that chip from
 *              Frequently Used (persisted on the backend).
 *
 * No "Frequently Used" title and no outer container — just the chips.
 * Group names are NEVER rendered — only actual report names.
 */
export default function ReportsNavDropdown() {
  const location = useLocation();
  const navigate = useNavigate();

  const [leftOpen, setLeftOpen] = useState(false);
  const [q, setQ] = useState("");
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);

  const leftRef = useRef(null);
  const inputRef = useRef(null);

  const active = findReportByPath(location.pathname);
  const activePath = active ? active.path : null;

  // Close the panel when clicking elsewhere.
  useEffect(() => {
    function onDocClick(e) {
      if (leftRef.current && !leftRef.current.contains(e.target)) setLeftOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (leftOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [leftOpen]);

  // Load the frequently-used reports from the backend once on mount.
  useEffect(() => {
    let cancelled = false;
    getFrequentlyUsedReports().then((list) => {
      if (!cancelled) setFrequentlyUsed(list);
    });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r) => r.title.toLowerCase().includes(term));
  }, [q]);

  // Navigate to a report; chip relies on the same go() so a route change
  // re-renders us with the panel closed.
  const go = (r) => {
    setLeftOpen(false);
    setQ("");
    if (r.path !== location.pathname) navigate(r.path);
  };

  // Remove ONLY this report from Frequently Used. Optimistic UI update; the
  // backend DELETES its record so it stays gone after refresh, and the usage
  // count restarts from 1 the next time the report is viewed.
  const removeFrequent = (slug) => {
    setFrequentlyUsed((prev) => prev.filter((r) => r.slug !== slug));
    removeFrequentReport(slug);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginBottom: 18,
        fontFamily: FONT,
      }}
    >
      {/* ── FIRST DROPDOWN: Current / all-reports selector ───────────── */}
      <div ref={leftRef} style={{ position: "relative", width: 320, maxWidth: "100%" }}>
        <button onClick={() => setLeftOpen((v) => !v)} style={triggerStyle}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#eef2ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: INDIGO,
              flexShrink: 0,
            }}
          >
            <FileText size={16} />
          </span>
          <span style={triggerLabelStyle(active)}>
            {active ? active.title : "Search or select a report..."}
          </span>
          <ChevronDown size={17} style={{ color: "#94a3b8", flexShrink: 0, transform: leftOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
        </button>

        {leftOpen && (
          <div style={panelStyle}>
            <div style={{ padding: 12, borderBottom: "1px solid #eef2ff" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} color="#6366f1" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search or select a report..."
                  style={searchInputStyle}
                />
                {q && (
                  <button onClick={() => setQ("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ maxHeight: 340, overflowY: "auto", padding: 6 }}>
              <div style={listSectionLabel}>All Reports</div>
              {filtered.length === 0 ? (
                <div style={{ padding: "18px 12px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  No reports match "{q.trim()}"
                </div>
              ) : (
                filtered.map((r) => (
                  <Row key={r.path} title={r.title} active={r.path === activePath} onPick={() => go(r)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BELOW THE DROPDOWN: small frequently-used chips (no title/box) ── */}
      {frequentlyUsed.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", alignItems: "center", padding: "1px 0" }}>
          {frequentlyUsed.map((r) => (
            <div key={r.slug} style={{ display: "inline-flex", alignItems: "center", gap: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 999, padding: "2px 3px 2px 10px", flexShrink: 0, boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>
              <button type="button" onClick={() => go(r)} title={`Open ${r.title}`} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: "2px 2px 2px 0", cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>
                <Plus size={13} color="#059669" style={{ flexShrink: 0 }} /> {r.title}
              </button>
              <button
                type="button"
                title={`Remove ${r.title} from frequently used`}
                aria-label={`Remove ${r.title} from frequently used`}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); removeFrequent(r.slug); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", border: "none", background: "#f3f4f6", color: "#6b7280", cursor: "pointer", fontSize: 13, lineHeight: 1, flexShrink: 0 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ title, active, onPick }) {
  return (
    <button
      onClick={onPick}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f5f7ff"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "9px 12px",
        borderRadius: 9,
        border: "none",
        cursor: "pointer",
        background: active ? "#eef2ff" : "transparent",
        fontFamily: FONT,
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        color: active ? INDIGO : "#475569",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? INDIGO : "#c7d2fe", flexShrink: 0 }} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
    </button>
  );
}

const triggerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "12px 16px",
  background: "#fff",
  border: "1.5px solid #e0e7ff",
  borderRadius: 13,
  boxShadow: "0 8px 24px rgba(30,27,75,.05)",
  cursor: "pointer",
  fontFamily: FONT,
};

const triggerLabelStyle = (active) => ({
  flex: 1,
  textAlign: "left",
  fontSize: 13,
  fontWeight: 700,
  color: active ? "#1e1b4b" : "#94a3b8",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const panelStyle = {
  position: "absolute",
  top: "calc(100% + 8px)",
  left: 0,
  right: 0,
  zIndex: 60,
  background: "#fff",
  border: "1.5px solid #e0e7ff",
  borderRadius: 14,
  boxShadow: "0 22px 50px rgba(30,27,75,.18)",
  overflow: "hidden",
  fontFamily: FONT,
};

const searchInputStyle = {
  width: "100%",
  padding: "10px 12px 10px 36px",
  background: "#f8fafc",
  border: "1.5px solid #e0e7ff",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  fontFamily: FONT,
  color: "#334155",
  boxSizing: "border-box",
  paddingRight: 36,
};

const listSectionLabel = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "#94a3b8",
  padding: "10px 12px 4px",
};