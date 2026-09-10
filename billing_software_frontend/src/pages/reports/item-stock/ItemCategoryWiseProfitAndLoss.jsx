import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, Search, Printer, FileSpreadsheet, RefreshCw, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#64748b";
const LIGHT_BORDER = "#e2e8f0";

const PERIODS = [
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Last 30 Days", value: "last_30_days" },
  { label: "This Year", value: "this_year" },
  { label: "All Time", value: "all_time" },
];

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtINRNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDateISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function applyPeriod(period) {
  const t = today();
  if (period === "this_month") {
    return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
  }
  if (period === "last_month") {
    const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const last = new Date(t.getFullYear(), t.getMonth(), 0);
    return { from: first, to: last };
  }
  if (period === "last_30_days") {
    const from = new Date(t);
    from.setDate(from.getDate() - 29);
    return { from, to: t };
  }
  if (period === "this_year") {
    return { from: new Date(t.getFullYear(), 0, 1), to: t };
  }
  return { from: new Date(2000, 0, 1), to: t };
}

/** Print a DOM node without leaving the app (hidden iframe). */
function printElement(element, title) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed", width: "0", height: "0",
    border: "0", visibility: "hidden", right: "0", bottom: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<html><head><title>${title || "Item Category Wise Profit And Loss"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       .summary{margin-top:10px;text-align:right;font-size:12px;font-weight:700;color:#1e1b4b;}
       .summary span{color:#15803d;}
       table{width:100%;border-collapse:collapse;font-size:10.5px;}
       th,td{border:1px solid #dbe2ec;padding:6px 7px;text-align:left;vertical-align:middle;}
       th{background:#f2f4f7;color:#334155;white-space:normal;line-height:1.25;}
       td.r,th.r{text-align:right;}
       td.g,th.g{color:#15803d;font-weight:600;}
       td.neg{color:#dc2626;font-weight:600;}
       td.child{color:#475569;}
       tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

/* Exactly the 12 required columns — nothing else. */
const COLUMNS = [
  { key: "name", label: "Category Name", width: 210, min: 190, txt: true },
  { key: "sale", label: "Sale", width: 92, min: 84 },
  { key: "sale_return", label: "Cr. Note / Sale Return", width: 118, min: 108 },
  { key: "purchase", label: "Purchase", width: 92, min: 84 },
  { key: "purchase_return", label: "Dr. Note / Purchase Return", width: 120, min: 110 },
  { key: "opening_stock", label: "Opening Stock", width: 92, min: 84 },
  { key: "closing_stock", label: "Closing Stock", width: 92, min: 84 },
  { key: "tax_receivable", label: "Tax Receivable", width: 96, min: 86 },
  { key: "tax_payable", label: "Tax Payable", width: 88, min: 80 },
  { key: "mfg_cost", label: "Mfg. Cost", width: 78, min: 72 },
  { key: "consumption_cost", label: "Consumption Cost", width: 96, min: 88 },
  { key: "net_profit", label: "Net Profit/Loss", width: 104, min: 96 },
];

const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.min, 0);

/* ── Main Component ─────────────────────────────────────────────────── */
export default function ItemCategoryWiseProfitAndLoss() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));

  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);

  const [filter, setFilter] = useState({ type: "all", id: 0, label: "All Items" });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [periodOpen, setPeriodOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const periodRef = useRef(null);
  const filterRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Resolve the firm silently (no visible firm filter) — existing project logic.
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        const chosen = match || list[0] || null;
        if (chosen) {
          setCompanyId(Number(chosen.id));
          setCompanyName(chosen.company_name || "My Company");
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  // Options for the "All Items" dropdown (existing category/subcategory APIs).
  useEffect(() => {
    if (!companyId) return;
    api.get(`/category/get_all?company_id=${companyId}`).then((res) => {
      if (res.data?.status) setCategories(res.data.data || []);
    }).catch(() => {});
    api.get(`/subcategory/get_all?company_id=${companyId}`).then((res) => {
      if (res.data?.status) setSubcategories(res.data.data || []);
    }).catch(() => {});
  }, [companyId]);

  const categoryName = useMemo(() => {
    const m = {};
    categories.forEach((c) => { if (c) m[String(c.id)] = c.name; });
    return m;
  }, [categories]);

  const filterOptions = useMemo(() => {
    const opts = [{ type: "all", id: 0, label: "All Items", parent: "" }];
    categories.forEach((c) => opts.push({ type: "category", id: Number(c.id), label: c.name, parent: "" }));
    subcategories.forEach((s) => {
      opts.push({
        type: "subcategory",
        id: Number(s.id),
        label: s.name,
        parent: s.category_id ? categoryName[String(s.category_id)] || "" : "",
      });
    });
    return opts;
  }, [categories, subcategories, categoryName]);

  // Fetch report on any filter change.
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      if (filter.type === "category") params.category_id = filter.id;
      if (filter.type === "subcategory") params.subcategory_id = filter.id;
      api
        .get("/report/item-category-wise-profit-loss", { params })
        .then((res) => {
          if (res.data?.status) {
            const list = res.data.data || [];
            setRows(list);
            setExpanded(new Set(list.filter((p) => (p.children || []).length > 0).map((p) => String(p.id))));
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, filter, reloadKey]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const selectFilter = (o) => {
    setFilter({ type: o.type, id: o.id, label: o.label });
    setFilterOpen(false);
  };

  const toggleExpanded = (id) => {
    const key = String(id);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Search over category / subcategory names (compact — no extra cards).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows
      .map((p) => {
        if (p.name.toLowerCase().includes(q)) return { ...p, children: p.children || [] };
        const matchedChildren = (p.children || []).filter((c) => String(c.name).toLowerCase().includes(q));
        if (matchedChildren.length > 0) return { ...p, children: matchedChildren };
        return null;
      })
      .filter(Boolean);
  }, [rows, query]);

  // Flatten displayed rows (parents + expanded children) for table/report totals.
  const displayRows = useMemo(() => {
    const list = [];
    visible.forEach((p) => {
      list.push({ ...p, depth: 0, isChild: false });
      if (expanded.has(String(p.id))) {
        (p.children || []).forEach((c) => list.push({ ...c, depth: 1, isChild: true }));
      }
    });
    return list;
  }, [visible, expanded]);

  // Totals over top-level rows (parents aggregate their children).
  const shownTotals = useMemo(() => {
    const t = {};
    COLUMNS.forEach((c) => { if (!c.txt) t[c.key] = 0; });
    visible.forEach((p) => {
      COLUMNS.forEach((c) => {
        if (!c.txt) t[c.key] += Number(p[c.key] || 0);
      });
    });
    return t;
  }, [visible]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo} | ${companyName} | ${filter.label}`;

  /* ── Excel (exactly the 12 required columns) ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Item Category Wise Profit And Loss"],
        ["Period", metaLabel],
        [],
        COLUMNS.map((c) => c.label),
      ];
      displayRows.forEach((r) => {
        sheetData.push(COLUMNS.map((c) => (c.txt ? (r.isChild ? "  " + r[c.key] : r[c.key]) || "-" : fmtINRNum(r[c.key]))));
      });
      sheetData.push(COLUMNS.map((c) => (c.txt ? "Total" : fmtINRNum(shownTotals[c.key] || 0))));
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(13, c.label.length + 3) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Category Wise P & L");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Item_Category_Wise_Profit_And_Loss_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.txt ? "" : "r"}">${c.label}</th>`).join("");
    const buildRow = (r) => {
      const cells = COLUMNS.map((c) => {
        if (c.txt) {
          const nm = r.isChild ? "&nbsp;&nbsp;&nbsp;" + (r[c.key] || "-") : r[c.key] || "-";
          return `<td class="${r.isChild ? "child" : ""}"><strong>${nm}</strong></td>`;
        }
        const val = Number(r[c.key] || 0);
        const cls = c.key === "net_profit" ? (val >= 0 ? "g" : "neg") + " r" : "r";
        return `<td class="${cls}"><strong>${fmtINR(val)}</strong></td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body = displayRows.map((r) => buildRow(r)).join("") + buildRow(
      Object.fromEntries(COLUMNS.map((c) => (c.txt ? [c.key, "Total"] : [c.key, shownTotals[c.key] || 0]))),
      true
    );

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Item Category Wise Profit And Loss</h2>
       <div class="meta">${metaLabel}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>
       <div class="summary">Total Amount: <span>${fmtINR(shownTotals.net_profit)}</span></div>`;
    printElement(el, "Item Category Wise Profit And Loss");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "2px 0", display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. FILTER BAR — Filter by: [period] From/To dates [All Items]
          ═══════════════════════════════════════════════════════════════ */}
      <div style={filterBarStyle}>
        <span style={filterByLabelStyle}>Filter by:</span>

        <div ref={periodRef} style={{ position: "relative" }}>
          <button onClick={() => setPeriodOpen((v) => !v)} style={compactSelectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY, fontSize: 12.5 }}>
              {PERIODS.find((p) => p.value === period)?.label || "This Month"}
            </span>
            <ChevronDown size={14} style={{ color: "#94a3b8", transform: periodOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {periodOpen && (
            <div style={dropdownPanelStyle}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => selectPeriod(p)}
                  style={{
                    ...dropdownItemStyle,
                    background: p.value === period ? "#eef2ff" : "transparent",
                    color: p.value === period ? INDIGO : "#334155",
                    fontWeight: p.value === period ? 700 : 500,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={dateFieldStyle}>
          <input
            type="date"
            value={formatDateISO(startDate)}
            onChange={(e) => { setRange({ from: parseDateISO(e.target.value), to: endDate }); setPeriod("custom"); }}
            style={compactDateInputStyle}
            title="From date"
          />
          <span style={{ fontSize: 11, color: GRAY_TEXT, fontWeight: 600 }}>To</span>
          <input
            type="date"
            value={formatDateISO(endDate)}
            onChange={(e) => { setRange({ from: startDate, to: parseDateISO(e.target.value) }); setPeriod("custom"); }}
            style={compactDateInputStyle}
            title="To date"
          />
        </div>

        <div ref={filterRef} style={{ position: "relative" }}>
          <button onClick={() => setFilterOpen((v) => !v)} style={compactSelectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY, fontSize: 12.5 }}>{filter.label}</span>
            <ChevronDown size={14} style={{ color: "#94a3b8", transform: filterOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {filterOpen && (
            <div style={{ ...dropdownPanelStyle, maxHeight: 320, overflowY: "auto", minWidth: 210 }}>
              {filterOptions.map((o) => (
                <button
                  key={o.type + "-" + o.id}
                  onClick={() => selectFilter(o)}
                  style={{
                    ...dropdownItemStyle,
                    paddingLeft: o.type === "subcategory" ? 26 : 12,
                    background: filter.type === o.type && filter.id === o.id ? "#eef2ff" : "transparent",
                    color: filter.type === o.type && filter.id === o.id ? INDIGO : o.type === "subcategory" ? "#64748b" : "#334155",
                    fontWeight: filter.type === o.type && filter.id === o.id ? 700 : 500,
                  }}
                >
                  {o.type === "subcategory" ? "↳ " + o.label : o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. DETAILS — search / print / excel icon buttons
          ═══════════════════════════════════════════════════════════════ */}
      <div style={detailsRowStyle}>
        <span style={detailsTitleStyle}>Details</span>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
          {searchOpen ? (
            <div ref={searchRef} style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 9, zIndex: 1 }} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search category / item"
                style={{
                  width: 190,
                  padding: "6px 10px 6px 28px",
                  border: `1px solid ${LIGHT_BORDER}`,
                  borderRadius: 6,
                  fontSize: 12.5,
                  fontFamily: FONT,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          ) : (
            <button onClick={() => { setSearchOpen(true); setQuery(""); }} title="Search" style={iconBtnStyle}>
              <Search size={16} color="#475569" />
            </button>
          )}
          <button onClick={handlePrint} title="Print" style={iconBtnStyle}>
            <Printer size={16} color="#475569" />
          </button>
          <button onClick={handleExcel} title="Excel" style={iconBtnStyle}>
            <FileSpreadsheet size={16} color={INDIGO} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. TABLE — one continuous scrollable 12-column table
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={{ ...tableStyle, minWidth: TABLE_MIN_WIDTH }}>
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} style={{ ...thStyle, width: c.width, minWidth: c.min, textAlign: c.txt ? "left" : "center" }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <AlertCircle size={24} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                      <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: `1px solid ${LIGHT_BORDER}`,
                          background: "#fff",
                          color: INDIGO,
                          fontSize: 12.5,
                          fontWeight: 600,
                          fontFamily: FONT,
                          cursor: "pointer",
                        }}
                      >
                        <RefreshCw size={13} />
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : displayRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No data available</div>
                  </td>
                </tr>
              ) : (
                displayRows.map((r) => (
                  <tr key={(r.isChild ? "sub-" : "cat-") + r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}`, background: r.isChild ? "#fcfcfd" : "#fff" }}>
                    <td style={{ ...tdStyle, paddingLeft: r.isChild ? 34 : 10 }}>
                      {!r.isChild && (r.children || []).length > 0 && (
                        <button
                          onClick={() => toggleExpanded(r.id)}
                          title={expanded.has(String(r.id)) ? "Collapse" : "Expand"}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            marginRight: 6,
                            verticalAlign: "middle",
                            display: "inline-flex",
                          }}
                        >
                          {expanded.has(String(r.id)) ? (
                            <ChevronDown size={14} color="#94a3b8" />
                          ) : (
                            <ChevronRight size={14} color="#94a3b8" />
                          )}
                        </button>
                      )}
                      {!r.isChild && (r.children || []).length === 0 && (
                        <span style={{ display: "inline-block", width: 20 }} />
                      )}
                      <span style={{ fontSize: 12.5, fontWeight: r.isChild ? 500 : 700, color: r.isChild ? "#475569" : NAVY }}>
                        {r.name || "-"}
                      </span>
                    </td>
                    {COLUMNS.filter((c) => !c.txt).map((c) => {
                      const val = Number(r[c.key] || 0);
                      const isNet = c.key === "net_profit" && val !== 0;
                      return (
                        <td
                          key={c.key}
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: r.isChild ? 600 : 700,
                            color: isNet ? (val >= 0 ? "#15803d" : "#dc2626") : r.isChild ? "#475569" : "#334155",
                          }}
                        >
                          {fmtINR(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && displayRows.length > 0 && (
              <tfoot>
                <tr>
                  <td style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 800, color: NAVY, fontSize: 12.5 }}>Total</td>
                  {COLUMNS.filter((c) => !c.txt).map((c) => (
                    <td key={c.key} style={{ ...tdStyle, background: "#f2f4f7", fontWeight: 700, color: NAVY, fontSize: 12.5, textAlign: "right" }}>
                      {fmtINR(shownTotals[c.key] || 0)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {!loading && !error && displayRows.length > 0 && (
          <div style={totalAmountBarStyle}>
            Total Amount:&nbsp;
            <span style={{ color: Number(shownTotals.net_profit) >= 0 ? "#15803d" : "#dc2626" }}>
              {fmtINR(shownTotals.net_profit)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES — compact accounting-report look (Vyapar style)
   ═════════════════════════════════════════════════════════════════════ */

const filterBarStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "8px 12px",
  background: "#f5f7fb",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  marginBottom: 10,
};

const filterByLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: GRAY_TEXT,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const compactSelectBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const compactDateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 12,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 118,
};

const dateFieldStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 5px)",
  left: 0,
  minWidth: 160,
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
  borderRadius: 8,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  overflow: "hidden",
  fontFamily: FONT,
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "7px 12px",
  background: "transparent",
  border: "none",
  fontSize: 12.5,
  fontFamily: FONT,
  cursor: "pointer",
  transition: "background .1s",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const iconBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 6,
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  cursor: "pointer",
  flexShrink: 0,
};

const detailsRowStyle = {
  display: "flex",
  alignItems: "center",
  padding: "6px 0",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  marginBottom: 10,
};

const detailsTitleStyle = {
  fontSize: 10.5,
  fontWeight: 800,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const tableContainerStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  overflow: "hidden",
  background: "#fff",
  minHeight: 0,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONT,
  tableLayout: "fixed",
};

const thStyle = {
  padding: "7px 8px",
  fontSize: 10,
  fontWeight: 700,
  color: "#475569",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  background: "#f2f4f7",
  borderRight: `1px solid ${LIGHT_BORDER}`,
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  whiteSpace: "normal",
  lineHeight: 1.3,
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 2,
  verticalAlign: "middle",
};

const emptyCellStyle = {
  padding: "70px 24px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "6px 8px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  borderRight: `1px solid ${LIGHT_BORDER}`,
  fontSize: 12,
  color: "#334155",
  verticalAlign: "middle",
};

const totalAmountBarStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  padding: "8px 14px",
  background: "#fff",
  borderTop: `1px solid ${LIGHT_BORDER}`,
  fontSize: 13,
  fontWeight: 800,
  color: NAVY,
};