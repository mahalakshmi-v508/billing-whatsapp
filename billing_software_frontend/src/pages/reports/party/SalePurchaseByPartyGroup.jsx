import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  Filter,
  X,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";
const SALE_GREEN = "#15803d";
const PURCHASE_RED = "#dc2626";

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
  if (period === "this_month") return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
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
  if (period === "this_year") return { from: new Date(t.getFullYear(), 0, 1), to: t };
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
    `<html><head><title>${title || "Sale Purchase By Party Group"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       td.sale{color:#15803d;}
       td.purchase{color:#dc2626;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

const COL_KEY = {
  "GROUP NAME": "group_name",
  "SALE AMOUNT": "sale_amount",
  "PURCHASE AMOUNT": "purchase_amount",
};

/* ── Main Component ─────────────────────────────────────────────────── */
export default function SalePurchaseByPartyGroup() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companies, setCompanies] = useState([]);
  const [firm, setFirm] = useState("all"); // "all" | company id
  const [companyId, setCompanyId] = useState(null);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);
  const [openFilter, setOpenFilter] = useState("");
  const [colFilters, setColFilters] = useState({});

  const periodRef = useRef(null);
  const firmRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (firmRef.current && !firmRef.current.contains(e.target)) setFirmOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies for this admin; default firm = "all" (All Firms)
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
        setCompanies(list);
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        if (match) {
          setFirm(String(match.id));
          setCompanyId(Number(match.id));
        }
      })
      .catch(() => setError("Failed to load firms."));
  }, [adminId]);

  const selectFirm = (val) => {
    setFirm(val);
    setCompanyId(val === "all" ? null : Number(val));
    setFirmOpen(false);
    if (val !== "all" && val !== null) {
      const c = companies.find((x) => String(x.id) === String(val));
      if (c) localStorage.setItem("selected_company_id", String(c.id));
    }
  };

  // Fetch report on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        admin_id: adminId || 0,
        company_id: companyId || 0,
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      api
        .get("/report/sale-purchase-by-party-group", { params })
        .then((res) => {
          if (res.data?.status) {
            const norm = (res.data.data || []).map((r) => ({ ...r, group_name: r.name || r.group_name || "General" }));
            setRows(norm);
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [adminId, companyId, startDate, endDate]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  // Search across group name
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.group_name || "").toLowerCase().includes(q));
  }, [rows, query]);

  // Column filters
  const displayed = useMemo(() => {
    if (!colFilters || !Object.keys(colFilters).some((k) => colFilters[k]?.trim())) return searched;
    return searched.filter((row) => {
      for (const col of Object.keys(colFilters)) {
        const fv = (colFilters[col] || "").trim().toLowerCase();
        if (!fv) continue;
        const field = COL_KEY[col];
        const cell = String(field ? row[field] : row[col] ?? "");
        if (!cell.toLowerCase().includes(fv)) return false;
      }
      return true;
    });
  }, [searched, colFilters]);

  // Totals for the visible (filtered/searched) rows
  const visibleTotals = useMemo(() => {
    let sale = 0;
    let purchase = 0;
    displayed.forEach((r) => {
      sale += Number(r.sale_amount || 0);
      purchase += Number(r.purchase_amount || 0);
    });
    return { sale, purchase };
  }, [displayed]);

  const clickFilterIcon = (col) => setOpenFilter((cur) => (cur === col ? "" : col));

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;
  const firmLabel = firm === "all" ? "My Company" : (companies.find((c) => String(c.id) === String(firm))?.company_name || "My Company");

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Sale Purchase By Party Group"],
        ["Period", metaLabel],
        ["Company", firmLabel],
        [],
        ["#", "Group Name", "Sale Amount", "Purchase Amount"],
      ];
      displayed.forEach((r, i) => {
        sheetData.push([
          i + 1, r.group_name || "",
          Number(r.sale_amount || 0), Number(r.purchase_amount || 0),
        ]);
      });
      sheetData.push([
        "Total", "Total",
        Number(visibleTotals.sale || 0), Number(visibleTotals.purchase || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sale Purchase By Party Group");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Sale_Purchase_By_Party_Group_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rowsList) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Group Name</th>
          <th class="r sale">Sale Amount</th>
          <th class="r purchase">Purchase Amount</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) =>
                `<tr>
                  <td>${i + 1}</td><td>${r.group_name || "-"}</td>
                  <td class="r sale">${fmtINR(r.sale_amount)}</td>
                  <td class="r purchase">${fmtINR(r.purchase_amount)}</td>
                </tr>`
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r sale"><strong>${fmtINR(visibleTotals.sale)}</strong></td>
          <td class="r purchase"><strong>${fmtINR(visibleTotals.purchase)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Sale Purchase By Party Group</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${firmLabel}</div>
       ${buildTable(displayed)}`;
    printElement(el, "Sale Purchase By Party Group");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP FILTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        {/* This Month preset dropdown */}
        <div ref={periodRef} style={{ position: "relative" }}>
          <button onClick={() => setPeriodOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{PERIODS.find((p) => p.value === period)?.label || "This Month"}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: periodOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
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

        {/* Date range */}
        <div style={dateRangeBoxStyle}>
          <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>Between</span>
          <input
            type="date"
            value={formatDateISO(startDate)}
            onChange={(e) => { setRange({ from: parseDateISO(e.target.value), to: endDate }); setPeriod("custom"); }}
            style={dateInputStyle}
          />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>To</span>
          <input
            type="date"
            value={formatDateISO(endDate)}
            onChange={(e) => { setRange({ from: startDate, to: parseDateISO(e.target.value) }); setPeriod("custom"); }}
            style={dateInputStyle}
          />
        </div>

        {/* Company/Firm dropdown */}
        <div ref={firmRef} style={{ position: "relative" }}>
          <button onClick={() => setFirmOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{firmLabel}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: firmOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {firmOpen && (
            <div style={{ ...dropdownPanelStyle, maxHeight: 300, overflowY: "auto" }}>
              <button
                onClick={() => selectFirm("all")}
                style={{
                  ...dropdownItemStyle,
                  background: firm === "all" ? "#eef2ff" : "transparent",
                  color: firm === "all" ? INDIGO : "#334155",
                  fontWeight: firm === "all" ? 700 : 500,
                }}
              >
                My Company
              </button>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectFirm(String(c.id))}
                  style={{
                    ...dropdownItemStyle,
                    background: String(c.id) === String(firm) ? "#eef2ff" : "transparent",
                    color: String(c.id) === String(firm) ? INDIGO : "#334155",
                    fontWeight: String(c.id) === String(firm) ? 700 : 500,
                  }}
                >
                  {c.company_name || "My Company"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <button onClick={handleExcel} style={actionBtnStyle}>
            <FileSpreadsheet size={17} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Excel Report</span>
          </button>
          <button onClick={handlePrint} style={actionBtnStyle}>
            <Printer size={17} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Print</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. REPORT CARD (header + table + footer)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableWrapperStyle}>
        {/* Report header: title (left) + search (right) */}
        <div style={reportHeaderStyle}>
          <div style={{ fontSize: 12, fontWeight: 800, color: GRAY_TEXT, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Sale Purchase By Party Group
          </div>
          <div style={{ position: "relative", width: 240, maxWidth: "60%" }}>
            <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by group name..."
              style={searchInputStyle}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflow: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 46, minWidth: 46, borderLeft: `1px solid ${LIGHT_BORDER}` }}>#</th>
                <th style={{ ...thStyle, borderRight: `1px solid ${LIGHT_BORDER}` }}>
                  <div style={headerCellInnerStyle}>
                    GROUP NAME
                    <Filter size={12} color={colFilters["GROUP NAME"] ? INDIGO : "#cbd5e1"} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => clickFilterIcon("GROUP NAME")} />
                  </div>
                  {openFilter === "GROUP NAME" && (
                    <input
                      autoFocus
                      value={colFilters["GROUP NAME"] || ""}
                      onChange={(e) => setColFilters((p) => ({ ...p, "GROUP NAME": e.target.value }))}
                      onBlur={() => setOpenFilter("")}
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenFilter(""); }}
                      placeholder="Filter group..."
                      style={filterInputStyle}
                    />
                  )}
                </th>
                <th style={{ ...thStyle }}>
                  <div style={headerCellInnerStyle}>
                    SALE AMOUNT
                    <Filter size={12} color={colFilters["SALE AMOUNT"] ? INDIGO : "#cbd5e1"} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => clickFilterIcon("SALE AMOUNT")} />
                  </div>
                  {openFilter === "SALE AMOUNT" && (
                    <input
                      autoFocus
                      value={colFilters["SALE AMOUNT"] || ""}
                      onChange={(e) => setColFilters((p) => ({ ...p, "SALE AMOUNT": e.target.value }))}
                      onBlur={() => setOpenFilter("")}
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenFilter(""); }}
                      placeholder="Filter amount..."
                      style={filterInputStyle}
                    />
                  )}
                </th>
                <th style={{ ...thStyle, borderRight: `1px solid ${LIGHT_BORDER}` }}>
                  <div style={headerCellInnerStyle}>
                    PURCHASE AMOUNT
                    <Filter size={12} color={colFilters["PURCHASE AMOUNT"] ? INDIGO : "#cbd5e1"} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => clickFilterIcon("PURCHASE AMOUNT")} />
                  </div>
                  {openFilter === "PURCHASE AMOUNT" && (
                    <input
                      autoFocus
                      value={colFilters["PURCHASE AMOUNT"] || ""}
                      onChange={(e) => setColFilters((p) => ({ ...p, "PURCHASE AMOUNT": e.target.value }))}
                      onBlur={() => setOpenFilter("")}
                      onKeyDown={(e) => { if (e.key === "Enter") setOpenFilter(""); }}
                      placeholder="Filter amount..."
                      style={filterInputStyle}
                    />
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={4} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No groups found</div>
                      <div style={{ fontSize: 12 }}>Try adjusting the filters, date range or search.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((r, i) => (
                  <tr key={r.group_name || i} style={{ borderBottom: `1px solid ${LIGHT_BORDER}`, transition: "background .1s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                    <td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: NAVY }}>{r.group_name || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(r.sale_amount) > 0 ? SALE_GREEN : "#9ca3af" }}>
                      {fmtINR(r.sale_amount)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(r.purchase_amount) > 0 ? PURCHASE_RED : "#9ca3af" }}>
                      {fmtINR(r.purchase_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div style={summaryStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            Total Sale Amount:{" "}
            <span style={{ color: SALE_GREEN }}>{fmtINR(visibleTotals.sale)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            Total Purchase Amount:{" "}
            <span style={{ color: PURCHASE_RED }}>{fmtINR(visibleTotals.purchase)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES
   ═════════════════════════════════════════════════════════════════════ */

const selectBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const actionBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "6px 14px",
  background: "transparent",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const dateRangeBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "#f9fafb",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  whiteSpace: "nowrap",
};

const dateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 130,
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 170,
  zIndex: 60,
  background: "#fff",
  border: `1.5px solid #e0e7ff`,
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  overflow: "hidden",
  fontFamily: FONT,
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 14px",
  background: "transparent",
  border: "none",
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
  transition: "background .1s",
  whiteSpace: "nowrap",
};

const searchInputStyle = {
  width: "100%",
  padding: "8px 30px 8px 34px",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const tableWrapperStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
  minHeight: 0,
};

const reportHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  background: "#fafbfc",
  flexShrink: 0,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONT,
  tableLayout: "auto",
};

const headerCellInnerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: GRAY_TEXT,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  background: "#f9fafb",
  borderRight: `1px solid ${LIGHT_BORDER}`,
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  whiteSpace: "nowrap",
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const filterInputStyle = {
  position: "absolute",
  top: "100%",
  left: 0,
  zIndex: 20,
  minWidth: 140,
  marginTop: 4,
  padding: "6px 9px",
  border: `1px solid ${INDIGO}`,
  borderRadius: 6,
  fontSize: 12,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  boxShadow: "0 8px 20px rgba(30,27,75,.12)",
};

const emptyCellStyle = {
  padding: "70px 24px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  fontSize: 12.5,
  color: "#334155",
  verticalAlign: "middle",
};

const summaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "11px 16px",
  background: "#f8fafc",
  borderTop: `2px solid ${INDIGO}`,
  flexShrink: 0,
};
