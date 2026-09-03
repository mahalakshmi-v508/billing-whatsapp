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

const PARTY_TYPES = [
  { label: "All parties", value: "all" },
  { label: "Receivable", value: "receivable" },
  { label: "Payable", value: "payable" },
];

/* ── Columns ─────────────────────────────────────────────────────────── */
const COLUMNS = [
  { key: "index", label: "#", width: 50 },
  { key: "name", label: "PARTY NAME", width: 200 },
  { key: "type", label: "PARTY TYPE", width: 120 },
  { key: "email", label: "EMAIL", width: 200 },
  { key: "phone", label: "PHONE NO.", width: 140 },
  { key: "receivable", label: "RECEIVABLE BALANCE", width: 170 },
  { key: "payable", label: "PAYABLE BALANCE", width: 160 },
  { key: "creditLimit", label: "CREDIT LIMIT", width: 130 },
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
    `<html><head><title>${title || "All Parties"}</title>
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
export default function AllParties() {
  const { adminId } = getAuth();
  const [companyId, setCompanyId] = useState(null);

  const [dateFilter, setDateFilter] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => new Date());
  const [partyType, setPartyType] = useState("all");
  const [typeOpen, setTypeOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const typeRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load the companies for this admin, default to saved / single company
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        if (match) {
          setCompanyId(Number(match.id));
        } else if (list.length === 1) {
          setCompanyId(Number(list[0].id));
        } else {
          setCompanyId(null);
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  // Fetch parties whenever company / date filter / range changes
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
      };
      if (dateFilter) {
        params.from_date = formatDateISO(startDate);
        params.to_date = formatDateISO(endDate);
      }
      api
        .get("/report/party-statement/parties", { params })
        .then((res) => {
          if (res.data?.status) {
            setParties(res.data.data || []);
          } else {
            setError(res.data?.message || "Failed to load parties.");
          }
        })
        .catch(() => setError("Failed to load parties."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, dateFilter, startDate, endDate]);

  // Filter by party type + search query
  const filtered = useMemo(() => {
    let list = [...parties];
    if (partyType === "receivable") {
      list = list.filter((p) => Number(p.receivable) > 0);
    } else if (partyType === "payable") {
      list = list.filter((p) => Number(p.payable) > 0);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.phone || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [parties, partyType, query]);

  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handleSelectType = (v) => {
    setPartyType(v);
    setTypeOpen(false);
  };

  /* ── Excel export ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["All Parties"],
        ["Period", dateFilter ? `${prettyFrom} to ${prettyTo}` : "All time"],
        [],
        ["#", "Party Name", "Party Type", "Email", "Phone No.", "Receivable Balance", "Payable Balance", "Credit Limit"],
      ];
      filtered.forEach((p, i) => {
        sheetData.push([
          i + 1, p.name || "", p.group || "", p.email || "", p.phone || "",
          fmtINRNum(p.receivable), fmtINRNum(p.payable), fmtINRNum(p.credit_limit),
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 4 }, { wch: 22 }, { wch: 14 }, { wch: 26 }, { wch: 14 },
        { wch: 18 }, { wch: 18 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "All Parties");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `All_Parties_${dateFilter ? `${formatDateISO(startDate)}_to_${formatDateISO(endDate)}` : "All_Time"}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rows) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Party Name</th><th>Party Type</th><th>Email</th><th>Phone No.</th>
          <th class="r">Receivable</th><th class="r">Payable</th><th class="r">Credit Limit</th>
        </tr></thead>
        <tbody>${
          rows.map(
            (p, i) =>
              `<tr>
                <td>${i + 1}</td><td>${p.name || "-"}</td><td>${p.group || "-"}</td>
                <td>${p.email || "-"}</td><td>${p.phone || "-"}</td>
                <td class="r">${fmtINR(p.receivable)}</td><td class="r">${fmtINR(p.payable)}</td>
                <td class="r">${fmtINR(p.credit_limit)}</td>
              </tr>`
          ).join("")
        }</tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>All Parties</h2>
       <div class="meta">${dateFilter ? `${prettyFrom} to ${prettyTo}` : "All time"} &nbsp;|&nbsp; ${filtered.length} party(ies)</div>
       ${buildTable(filtered)}`;
    printElement(el, "All Parties");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. FILTER SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div style={filterRowStyle}>
        {/* LEFT: Date Filter checkbox */}
        <label style={dateFilterLabelStyle}>
          <input
            type="checkbox"
            checked={dateFilter}
            onChange={(e) => setDateFilter(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer", accentColor: INDIGO }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: NAVY }}>Date Filter</span>
        </label>

        {/* Date range (only when Date Filter is enabled) */}
        {dateFilter && (
          <div style={dateRangeBoxStyle}>
            <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>Between</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => setStartDate(parseDateISO(e.target.value))}
              style={dateInputStyle}
            />
            <span style={{ fontSize: 12, color: "#9ca3af" }}>To</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => setEndDate(parseDateISO(e.target.value))}
              style={dateInputStyle}
            />
          </div>
        )}

        {/* Party type dropdown */}
        <div ref={typeRef} style={{ position: "relative" }}>
          <button onClick={() => setTypeOpen((v) => !v)} style={typeBtnStyle}>
            <span style={{ flex: 1, textAlign: "left", fontWeight: 600, color: NAVY }}>
              {PARTY_TYPES.find((t) => t.value === partyType)?.label || "All parties"}
            </span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: typeOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {typeOpen && (
            <div style={dropdownPanelStyle}>
              {PARTY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleSelectType(t.value)}
                  style={{
                    ...dropdownItemStyle,
                    background: t.value === partyType ? "#eef2ff" : "transparent",
                    color: t.value === partyType ? INDIGO : "#334155",
                    fontWeight: t.value === partyType ? 700 : 500,
                  }}
                >
                  {t.label}
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

      {/* Search field */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by party name, email or phone..."
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={14} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. PARTIES TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} style={{ ...thStyle, width: col.width, minWidth: col.width }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>
                        {partyType === "all" ? "No parties found" : `No ${partyType} parties found`}
                      </div>
                      <div style={{ fontSize: 12 }}>Try adjusting the filters or search.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.role + "-" + p.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: NAVY }}>{p.name || "-"}</td>
                    <td style={tdStyle}>
                      <span style={typeBadgeStyle(p.group)}>{p.group === "Supplier" ? "Supplier" : "Customer"}</span>
                    </td>
                    <td style={{ ...tdStyle, color: p.email ? GRAY_TEXT : "#cbd5e1" }}>{p.email || "—"}</td>
                    <td style={{ ...tdStyle, color: p.phone ? GRAY_TEXT : "#cbd5e1" }}>{p.phone || "—"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(p.receivable) > 0 ? "#15803d" : "#9ca3af" }}>
                      {fmtINR(p.receivable)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: Number(p.payable) > 0 ? "#dc2626" : "#9ca3af" }}>
                      {fmtINR(p.payable)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(p.credit_limit)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES
   ═════════════════════════════════════════════════════════════════════ */

const filterRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 10,
  padding: "6px 0",
};

const dateFilterLabelStyle = {
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
  userSelect: "none",
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

const typeBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  width: 150,
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

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 150,
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

function typeBadgeStyle(group) {
  const isSupplier = group === "Supplier";
  return {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    whiteSpace: "nowrap",
    background: isSupplier ? "#fef2f2" : "#eff6ff",
    color: isSupplier ? "#dc2626" : "#1d4ed8",
  };
}
