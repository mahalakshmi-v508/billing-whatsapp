import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Search, Star, FileText, X } from "lucide-react";
import { reports, findReportByPath } from "./reportNavigation";
import { getFrequentlyUsedReports } from "./reportUsage";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";

/**
 * Two report dropdowns at the top of every report page:
 *
 *  LEFT  → "Current Report" — searchable list of ALL reports from the
 *          registry (no Frequently Used section inside).
 *  RIGHT → "⭐ Frequently Used" — a SEPARATE dropdown populated ONLY from
 *          the user's actual report viewing history (see reportUsage.js).
 *          Empty state shows a friendly message when nothing viewed yet.
 *
 * Category/group names are NEVER rendered — only actual report names.
 */
export default function ReportsNavDropdown() {
  const location = useLocation();
  const navigate = useNavigate();

  const [leftOpen, setLeftOpen] = useState(false);
  const [freqOpen, setFreqOpen] = useState(false);
  const [q, setQ] = useState("");
  const [frequentlyUsed, setFrequentlyUsed] = useState([]);
  const [freqLoading, setFreqLoading] = useState(false);

  const leftRef = useRef(null);
  const freqRef = useRef(null);
  const inputRef = useRef(null);

  const active = findReportByPath(location.pathname);
  const activePath = active ? active.path : null;

  // Close panels + clear the search whenever the active report changes.
  // (Uses handlers on user actions rather than effects; panel close on
  // navigation is handled in the "go" helpers below.)
  useEffect(() => {
    function onDocClick(e) {
      if (leftRef.current && !leftRef.current.contains(e.target)) setLeftOpen(false);
      if (freqRef.current && !freqRef.current.contains(e.target)) setFreqOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (leftOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [leftOpen]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((r) => r.title.toLowerCase().includes(term));
  }, [q]);

  const loadFrequentlyUsed = useCallback(async () => {
    setFreqLoading(true);
    const list = await getFrequentlyUsedReports();
    setFrequentlyUsed(list);
    setFreqLoading(false);
  }, []);

  const openFreq = () => {
    setLeftOpen(false);
    const next = !freqOpen;
    setFreqOpen(next);
    if (next) loadFrequentlyUsed();
  };

  // panel closes on navigation so a route change after going() re-renders us
  // with both panels closed and fresh frequently-used data.
  const go = (r) => {
    setLeftOpen(false);
    setFreqOpen(false);
    setQ("");
    if (r.path !== location.pathname) navigate(r.path);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "flex-start",
        marginBottom: 18,
        fontFamily: FONT,
      }}
    >
      {/* ── LEFT: Current / all-reports selector ─────────────────────── */}
      <div ref={leftRef} style={{ position: "relative", width: 320, maxWidth: "100%" }}>
        <button
          onClick={() => { setLeftOpen((v) => !v); setFreqOpen(false); }}
          style={triggerStyle}
        >
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

      {/* ── RIGHT: Frequently Used (dynamic from real usage) ─────────── */}
      <div ref={freqRef} style={{ position: "relative", width: 240, maxWidth: "100%" }}>
        <button onClick={openFreq} style={triggerStyle}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#fffbeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f59e0b",
              flexShrink: 0,
            }}
          >
            <Star size={16} />
          </span>
          <span style={triggerLabelStyle(null)}>Frequently Used</span>
          <ChevronDown size={17} style={{ color: "#94a3b8", flexShrink: 0, transform: freqOpen ? "rotate(180deg)" : "none", transition: "transform .15s ease" }} />
        </button>

        {freqOpen && (
          <div style={panelStyle}>
            <div style={{ maxHeight: 340, overflowY: "auto", padding: 6 }}>
              <div style={listSectionLabel}>Frequently Used</div>
              {freqLoading ? (
                <div style={{ padding: "26px 16px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  Loading…
                </div>
              ) : frequentlyUsed.length === 0 ? (
                <div style={{ padding: "26px 16px", textAlign: "center", color: "#9ca3af", fontSize: 12, lineHeight: 1.6 }}>
                  No frequently used reports yet.
                  <div style={{ color: "#cbd5e1", marginTop: 4, fontSize: 11 }}>
                    Reports you open 5+ times will show up here automatically.
                  </div>
                </div>
              ) : (
                frequentlyUsed.map((r) => (
                  <Row key={r.path} title={r.title} starred active={r.path === activePath} onPick={() => go(r)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ title, active, starred, onPick }) {
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
      {starred ? (
        <Star size={14} style={{ color: "#f59e0b", flexShrink: 0 }} />
      ) : (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? INDIGO : "#c7d2fe", flexShrink: 0 }} />
      )}
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
