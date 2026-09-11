import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
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

const fmtQty = (n) => Number(n || 0).toLocaleString("en-IN");

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
    `<html><head><title>${title || "Item Report By Party"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
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
export default function ItemReportByParty() {
  const { adminId } = getAuth();

  const [period, setPeriod] = useState("this_month");
  const [{ from: startDate, to: endDate }, setRange] = useState(applyPeriod("this_month"));
  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState(0);
  const [partyRole, setPartyRole] = useState("");
  const [partyName, setPartyName] = useState("All Parties");

  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [periodOpen, setPeriodOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);

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

  // Load companies for this admin, default to saved / single company
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
          setCompanyName(chosen.company_name || "My Company");
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    setCompanyName(c.company_name || "My Company");
    setPartyId(0);
    setPartyRole("");
    setPartyName("All Parties");
    setCompanyOpen(false);
  };

  // Load parties (customers + suppliers) for the selected company
  useEffect(() => {
    if (!companyId) return;
    api
      .get("/report/party-statement/parties", { params: { company_id: companyId, admin_id: adminId || 0 } })
      .then((res) => setParties(res.data?.status ? res.data.data || [] : []))
      .catch(() => setParties([]));
  }, [companyId, adminId]);

  // Fetch report from the backend on any filter change
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
        party_id: partyId,
        role: partyRole,
      };
      api
        .get("/report/item-report-by-party", { params })
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
  }, [companyId, adminId, startDate, endDate, partyId, partyRole]);

  const selectPeriod = (p) => {
    setPeriod(p.value);
    setRange(applyPeriod(p.value));
    setPeriodOpen(false);
  };

  const selectParty = (p) => {
    if (!p) {
      setPartyId(0);
      setPartyRole("");
      setPartyName("All Parties");
    } else {
      setPartyId(Number(p.id));
      setPartyRole(p.role || "");
      setPartyName(p.name || "All Parties");
    }
    setPartyOpen(false);
  };

  // Search filter across item names
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.item_name || "").toLowerCase().includes(q));
  }, [rows, query]);

  // Totals from the currently displayed (filtered) rows
  const totals = useMemo(() => {
    const t = { sale_qty: 0, sale_amt: 0, purchase_qty: 0, purchase_amt: 0 };
    filtered.forEach((r) => {
      t.sale_qty += Number(r.sale_qty || 0);
      t.sale_amt += Number(r.sale_amt || 0);
      t.purchase_qty += Number(r.purchase_qty || 0);
      t.purchase_amt += Number(r.purchase_amt || 0);
    });
    return t;
  }, [filtered]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const metaLabel = `${prettyFrom} to ${prettyTo}`;

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Item Report By Party"],
        ["Period", metaLabel],
        ["Company", companyName],
        ["Party", partyName],
        [],
        ["#", "Item Name", "Sale Quantity", "Sale Amount", "Purchase Quantity", "Purchase Amount"],
      ];
      filtered.forEach((r, i) => {
        sheetData.push([
          i + 1, r.item_name || "-",
          Number(r.sale_qty || 0), fmtINRNum(r.sale_amt),
          Number(r.purchase_qty || 0), fmtINRNum(r.purchase_amt),
        ]);
      });
      sheetData.push([
        "Total", "Total",
        Number(totals.sale_qty || 0), fmtINRNum(totals.sale_amt),
        Number(totals.purchase_qty || 0), fmtINRNum(totals.purchase_amt),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Item Report By Party");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Item_Report_By_Party_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
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
          <th>#</th><th>Item Name</th>
          <th class="r">Sale Qty</th><th class="r">Sale Amount</th>
          <th class="r">Purchase Qty</th><th class="r">Purchase Amount</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) =>
                `<tr>
                  <td>${i + 1}</td><td>${r.item_name || "-"}</td>
                  <td class="r">${fmtQty(r.sale_qty)}</td><td class="r">${fmtINR(r.sale_amt)}</td>
                  <td class="r">${fmtQty(r.purchase_qty)}</td><td class="r">${fmtINR(r.purchase_amt)}</td>
                </tr>`
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r"><strong>${fmtQty(totals.sale_qty)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.sale_amt)}</strong></td>
          <td class="r"><strong>${fmtQty(totals.purchase_qty)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.purchase_amt)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Item Report By Party</h2>
       <div class="meta">${metaLabel} &nbsp;|&nbsp; ${companyName} &nbsp;|&nbsp; ${partyName}</div>
       ${buildTable(filtered)}`;
    printElement(el, "Item Report By Party");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER / DATE + COMPANY SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        {/* Period preset dropdown */}
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

        {/* Company dropdown */}
        <div ref={companyRef} style={{ position: "relative" }}>
          <button onClick={() => setCompanyOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{companyName}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: companyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {companyOpen && (
            <div style={dropdownPanelStyle}>
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
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <button onClick={handleExcel} style={actionBtnStyle}>
            <FileSpreadsheet size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Excel Report</span>
          </button>
          <button onClick={handlePrint} style={actionBtnStyle}>
            <Printer size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Print</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. DETAILS → FILTERS (party)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={detailsCardStyle}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: GRAY_TEXT, marginBottom: 8 }}>
          Details
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
            Filters
          </span>
          <div ref={partyRef} style={{ position: "relative" }}>
            <button onClick={() => setPartyOpen((v) => !v)} style={selectBtnStyle}>
              <span style={{ fontWeight: 600, color: NAVY }}>{partyName}</span>
              <ChevronDown size={15} style={{ color: "#94a3b8", transform: partyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            </button>
            {partyOpen && (
              <div style={{ ...dropdownPanelStyle, maxHeight: 320, overflowY: "auto", minWidth: 220 }}>
                <button
                  onClick={() => selectParty(null)}
                  style={{
                    ...dropdownItemStyle,
                    background: partyId === 0 ? "#eef2ff" : "transparent",
                    color: partyId === 0 ? INDIGO : "#334155",
                    fontWeight: partyId === 0 ? 700 : 500,
                  }}
                >
                  All Parties
                </button>
                {parties.map((p) => (
                  <button
                    key={p.role + "-" + p.id}
                    onClick={() => selectParty(p)}
                    style={{
                      ...dropdownItemStyle,
                      background: String(p.id) === String(partyId) ? "#eef2ff" : "transparent",
                      color: String(p.id) === String(partyId) ? INDIGO : "#334155",
                      fontWeight: String(p.id) === String(partyId) ? 700 : 500,
                    }}
                  >
                    {p.name}
                  </button>
                ))}
                {parties.length === 0 && (
                  <div style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>No parties found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search field */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by item name..."
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={14} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. REPORT TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 50, minWidth: 50 }}>#</th>
                <th style={{ ...thStyle, width: 260, minWidth: 220 }}>ITEM NAME</th>
                <th style={{ ...thStyle, width: 120, minWidth: 110 }}>SALE QUANTITY</th>
                <th style={{ ...thStyle, width: 140, minWidth: 130 }}>SALE AMOUNT</th>
                <th style={{ ...thStyle, width: 150, minWidth: 120 }}>PURCHASE QUANTITY</th>
                <th style={{ ...thStyle, width: 160, minWidth: 140 }}>PURCHASE AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No items found</div>
                      <div style={{ fontSize: 12 }}>Try adjusting the date range, party or search.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: NAVY }}>{r.item_name || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtQty(r.sale_qty)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(r.sale_amt) > 0 ? "#15803d" : "#9ca3af" }}>
                      {fmtINR(r.sale_amt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{fmtQty(r.purchase_qty)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(r.purchase_amt) > 0 ? "#dc2626" : "#9ca3af" }}>
                      {fmtINR(r.purchase_amt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${INDIGO}`, background: "#eef2ff" }}>
                <td colSpan={2} style={{ ...tdStyle, fontWeight: 800, color: NAVY, fontSize: 13 }}>Total</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {fmtQty(totals.sale_qty)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {fmtINR(totals.sale_amt)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {fmtQty(totals.purchase_qty)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {fmtINR(totals.purchase_amt)}
                </td>
              </tr>
            </tfoot>
          </table>
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
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const detailsCardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  padding: "12px 16px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 10,
  marginBottom: 10,
  fontFamily: FONT,
};

const searchInputStyle = {
  width: "100%",
  padding: "10px 36px 10px 38px",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const tableContainerStyle = {
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
  tableLayout: "fixed",
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
  padding: "80px 24px",
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