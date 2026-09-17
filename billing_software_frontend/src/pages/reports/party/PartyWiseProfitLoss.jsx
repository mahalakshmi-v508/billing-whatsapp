import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  Filter,
  X,
  AlertCircle,
  Phone,
  UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";
const PROFIT_GREEN = "#15803d";
const LOSS_RED = "#dc2626";

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
    `<html><head><title>${title || "Party Wise Profit And Loss"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       td.profit{color:#15803d;}
       td.loss{color:#dc2626;}
       tfoot td{background:#f1f5f9;font-weight:700;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function PartyWiseProfitLoss() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const [partyId, setPartyId] = useState("all"); // "all" | party id
  const [parties, setParties] = useState([]);

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const periodRef = useRef(null);
  const companyRef = useRef(null);
  const partyRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
      if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies for this admin; default = saved / first company
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
        const chosen = match || list[0] || null;
        if (chosen) {
          setCompanyId(Number(chosen.id));
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    localStorage.setItem("selected_company_id", String(c.id));
    setCompanyOpen(false);
    setPartyId("all");
  };

  // Load parties for the party filter (scoped to admin/company)
  useEffect(() => {
    if (!adminId) return;
    const params = {
      admin_id: adminId || 0,
      company_id: companyId || 0,
    };
    api
      .get("/report/party-statement/parties", { params })
      .then((res) => {
        if (res.data?.status) {
          setParties(res.data.parties || res.data.data || []);
        }
      })
      .catch(() => {});
  }, [adminId, companyId]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  // Fetch report on filter change
  useEffect(() => {
    if (companyId === null && !adminId) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        admin_id: adminId || 0,
        company_id: companyId || 0,
        party_id: partyId === "all" ? 0 : Number(partyId),
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      api
        .get("/report/party-wise-profit-loss", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [adminId, companyId, partyId, startDate, endDate]);

  // Search across party name / phone
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.party_name || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const displayed = searched;

  // Totals for the visible (searched) rows
  const visibleTotals = useMemo(() => {
    let sale = 0;
    let profit = 0;
    displayed.forEach((r) => {
      sale += Number(r.total_sale_amount || 0);
      profit += Number(r.profit || 0);
    });
    return { sale, profit };
  }, [displayed]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const metaLabel = `${prettyFrom} to ${prettyTo}`;
  const companyLabel =
    companyId !== null && companyId !== undefined
      ? (companies.find((c) => Number(c.id) === Number(companyId))?.company_name || "My Company")
      : "All Companies";
  const partyLabel =
    partyId === "all"
      ? "All Parties"
      : (parties.find((p) => String(p.id) === String(partyId))?.name || "All Parties");

  const totalRows = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayed.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  /* ── Excel export ── */
  const handleExcel = () => {
    if (rows.length === 0) {
      showToast("No data to export.", "warning");
      return;
    }
    try {
      const sheetData = [
        ["Party Wise Profit And Loss"],
        ["Period", metaLabel],
        ["Company", companyLabel],
        [],
        ["#", "Party Name", "Phone No.", "Total Sale Amount", "Profit (+) / Loss (-)"],
      ];
      displayed.forEach((r, i) => {
        sheetData.push([
          i + 1,
          r.party_name || "-",
          r.phone || "",
          Number(r.total_sale_amount || 0),
          Number(r.profit || 0),
        ]);
      });
      sheetData.push([
        "Total",
        "Total",
        "",
        Number(visibleTotals.sale || 0),
        Number(visibleTotals.profit || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 4 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Party Wise Profit And Loss");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Party_Wise_Profit_And_Loss_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
      showToast("Excel report downloaded.", "success");
    } catch {
      showToast("Excel export failed. Please try again.", "error");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    if (rows.length === 0) {
      showToast("No data to print.", "warning");
      return;
    }
    const buildRows = (rowsList) =>
      rowsList
        .map(
          (r, i) =>
            `<tr>
              <td>${i + 1}</td><td>${r.party_name || "-"}</td><td>${r.phone || "-"}</td>
              <td class="r">${fmtINR(r.total_sale_amount)}</td>
              <td class="r ${Number(r.profit) >= 0 ? "profit" : "loss"}">${fmtINR(r.profit)}</td>
            </tr>`
        )
        .join("");

    const f = document.createElement("div");
    f.innerHTML =
      `<h2>Party Wise Profit And Loss</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyLabel} &nbsp;|&nbsp; ${partyLabel}</div>
       <table>
         <thead><tr>
           <th>#</th><th>Party Name</th><th>Phone No.</th>
           <th class="r">Total Sale Amount</th>
           <th class="r">Profit (+) / Loss (-)</th>
         </tr></thead>
         <tbody>${buildRows(displayed)}</tbody>
         <tfoot><tr>
           <td colspan="3"><strong>Total</strong></td>
           <td class="r"><strong>${fmtINR(visibleTotals.sale)}</strong></td>
           <td class="r ${visibleTotals.profit >= 0 ? "profit" : "loss"}"><strong>${fmtINR(visibleTotals.profit)}</strong></td>
         </tr></tfoot>
       </table>`;
    printElement(f, "Party Wise Profit And Loss");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER — title + date range + party + company + actions
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

        {/* Party dropdown */}
        <div ref={partyRef} style={{ position: "relative" }}>
          <button onClick={() => setPartyOpen((v) => !v)} style={selectBtnStyle}>
            <UserCheck size={15} color={INDIGO} />
            <span style={{ fontWeight: 600, color: NAVY }}>{partyLabel}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: partyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {partyOpen && (
            <div style={{ ...dropdownPanelStyle, maxHeight: 300, overflowY: "auto" }}>
              <button
                onClick={() => { setPartyId("all"); setPartyOpen(false); }}
                style={{
                  ...dropdownItemStyle,
                  background: partyId === "all" ? "#eef2ff" : "transparent",
                  color: partyId === "all" ? INDIGO : "#334155",
                  fontWeight: partyId === "all" ? 700 : 500,
                }}
              >
                All Parties
              </button>
              {parties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPartyId(String(p.id)); setPartyOpen(false); }}
                  style={{
                    ...dropdownItemStyle,
                    background: String(p.id) === String(partyId) ? "#eef2ff" : "transparent",
                    color: String(p.id) === String(partyId) ? INDIGO : "#334155",
                    fontWeight: String(p.id) === String(partyId) ? 700 : 500,
                  }}
                >
                  {p.name || `Party #${p.id}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Firm / Company selector */}
        <div ref={companyRef} style={{ position: "relative" }}>
          <button onClick={() => setCompanyOpen((v) => !v)} style={selectBtnStyle} title="Company">
            <span style={{ fontWeight: 600, color: NAVY }}>{companyLabel}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: companyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {companyOpen && (
            <div style={{ ...dropdownPanelStyle, maxHeight: 300, overflowY: "auto" }}>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  style={{
                    ...dropdownItemStyle,
                    background: Number(c.id) === Number(companyId) ? "#eef2ff" : "transparent",
                    color: Number(c.id) === Number(companyId) ? INDIGO : "#334155",
                    fontWeight: Number(c.id) === Number(companyId) ? 700 : 500,
                  }}
                >
                  {c.company_name || "My Company"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={handleExcel} style={actionBtnStyle} title="Export Report">
            <FileSpreadsheet size={17} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Export Report</span>
          </button>
          <button onClick={handlePrint} style={actionBtnStyle} title="Print">
            <Printer size={17} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Print</span>
          </button>
        </div>
      </div>

      {/* Search field */}
      <div style={{ position: "relative", marginBottom: 12, maxWidth: 320, width: "100%" }}>
        <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by party name or phone..."
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={14} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. REPORT TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableWrapperStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 46, minWidth: 46 }}>#</th>
                <th style={{ ...thStyle, borderRight: `1px solid ${LIGHT_BORDER}` }}>
                  PARTY NAME
                </th>
                <th style={{ ...thStyle }}>
                  PHONE NO.
                </th>
                <th style={{ ...thStyle, textAlign: "right" }}>TOTAL SALE AMOUNT</th>
                <th style={{ ...thStyle, textAlign: "right" }}>PROFIT (+) / LOSS (-)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No parties found</div>
                      <div style={{ fontSize: 12 }}>Try adjusting the filters, date range or search.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => {
                  const profit = Number(r.profit || 0);
                  return (
                    <tr key={r.party_id + "-" + r.party_name} style={{ borderBottom: `1px solid ${LIGHT_BORDER}`, transition: "background .1s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <td style={{ ...tdStyle, textAlign: "center", color: GRAY_TEXT }}>{(safePage - 1) * rowsPerPage + i + 1}</td>
                      <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: NAVY }}>{r.party_name || "-"}</td>
                      <td style={{ ...tdStyle, color: GRAY_TEXT }}>{r.phone || "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: NAVY }}>
                        {fmtINR(r.total_sale_amount)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: profit >= 0 ? PROFIT_GREEN : LOSS_RED }}>
                        {profit >= 0 ? "+" : "-"}{fmtINR(Math.abs(profit))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <ReportPagination
          total={totalRows}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(1); }}
        />

        {/* Summary footer */}
        <div style={summaryStyle}>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            Total Sale Amount:{" "}
            <span style={{ color: NAVY }}>{fmtINR(visibleTotals.sale)}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>
            Total Profit (+) / Loss (-):{" "}
            <span style={{ color: visibleTotals.profit >= 0 ? PROFIT_GREEN : LOSS_RED }}>
              {visibleTotals.profit >= 0 ? "+" : "-"}{fmtINR(Math.abs(visibleTotals.profit))}
            </span>
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
  zIndex: 80,
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
  padding: "9px 34px 9px 36px",
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
  flexWrap: "wrap",
};