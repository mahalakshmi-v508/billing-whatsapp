import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Printer,
  Calendar,
  X,
  AlertCircle,
  Share2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";

/* ── Time-period presets ───────────────────────────────────────────── */
const TIME_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "thisWeek" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Quarter", value: "thisQuarter" },
  { label: "This Financial Year", value: "thisFY" },
  { label: "Last Financial Year", value: "lastFY" },
  { label: "Custom", value: "custom" },
];

/* ── Table columns ─────────────────────────────────────────────────── */
const COLUMNS = [
  { key: "date", label: "DATE", width: 100, sortable: true, filterable: true },
  { key: "txn", label: "TXN TYPE", width: 120, sortable: true, filterable: true },
  { key: "ref", label: "REF NO.", width: 120, sortable: true, filterable: true },
  { key: "total", label: "TOTAL", width: 100, sortable: true, filterable: false },
  { key: "receivedPaid", label: "RECEIVED/PAID", width: 120, sortable: true, filterable: false },
  { key: "txnBalance", label: "TXN BALANCE", width: 120, sortable: true, filterable: false },
  { key: "receivableBal", label: "RECEIVABLE BALANCE", width: 150, sortable: true, filterable: false },
  { key: "payableBal", label: "PAYABLE BALANCE", width: 130, sortable: true, filterable: false },
];

/* ── Helpers ────────────────────────────────────────────────────────── */
function getRange(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: y };
    }
    case "thisWeek": {
      const s = new Date(today);
      s.setDate(s.getDate() - s.getDay());
      return { start: s, end: today };
    }
    case "thisMonth":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) };
    case "lastMonth":
      return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) };
    case "thisQuarter": {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), qStart, 1), end: new Date(now.getFullYear(), qStart + 3, 0) };
    }
    case "thisFY": {
      const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return { start: new Date(fyStart, 3, 1), end: new Date(fyStart + 1, 2, 31) };
    }
    case "lastFY": {
      const fyStart = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      return { start: new Date(fyStart, 3, 1), end: new Date(fyStart + 1, 2, 31) };
    }
    default:
      return { start: today, end: today };
  }
}

/* ── Money / auth / print helpers ───────────────────────────────────── */
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
    `<html><head><title>${title || "Party Statement"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       .sum{margin-top:16px;font-size:12px;}
       .sum div{display:flex;justify-content:space-between;max-width:360px;padding:3px 0;}
       .net{border-top:1.5px solid #4338ca;font-weight:700;margin-top:4px;}
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
export default function PartyStatement() {
  const { adminId } = getAuth();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [period, setPeriod] = useState("thisMonth");
  const [startDate, setStartDate] = useState(() => getRange("thisMonth").start);
  const [endDate, setEndDate] = useState(() => getRange("thisMonth").end);
  const [partyQuery, setPartyQuery] = useState("");
  const [partyOpen, setPartyOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState(null);

  const [companyId, setCompanyId] = useState(null);
  const [parties, setParties] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_sale: 0, total_purchase: 0, total_expense: 0,
    total_money_in: 0, total_money_out: 0,
    total_receivable: 0, total_payable: 0,
    opening_receivable: 0, opening_payable: 0, party_name: "", party_role: "customer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [colText, setColText] = useState({});

  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(null);

  const periodRef = useRef(null);
  const partyRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false);
      setFilterOpen(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load the companies for this admin, default to the saved / single company
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

  // React to firm change → load parties
  useEffect(() => {
    if (companyId === null) return;
    api
      .get("/report/party-statement/parties", { params: { company_id: companyId, admin_id: adminId || 0 } })
      .then((res) => setParties(res.data?.data || []))
      .catch(() => setParties([]));
  }, [companyId, adminId]);

  // Fetch the statement whenever party / date / firm changes
  useEffect(() => {
    if (!selectedParty || !companyId) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        party_id: selectedParty.id,
        role: selectedParty.role,
        from_date: formatDateISO(startDate),
        to_date: formatDateISO(endDate),
      };
      api
        .get("/report/party-statement/statement", { params })
        .then((res) => {
          if (res.data?.status) {
            setTransactions(res.data.transactions || []);
            setSummary(res.data.summary || {});
          } else {
            setError(res.data?.message || "Failed to load statement.");
          }
        })
        .catch(() => setError("Failed to load statement."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [selectedParty, startDate, endDate, companyId, adminId]);

  const handlePeriodSelect = (p) => {
    setPeriod(p);
    if (p !== "custom") {
      const r = getRange(p);
      setStartDate(r.start);
      setEndDate(r.end);
    }
    setPeriodOpen(false);
  };

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  const selectParty = (p) => {
    setSelectedParty(p);
    setPartyOpen(false);
    setPartyQuery("");
  };

  // Filter by column text
  const filtered = useMemo(() => {
    const keys = Object.keys(colText).filter((k) => (colText[k] || "").trim());
    if (keys.length === 0) return transactions;
    return transactions.filter((t) => {
      for (const k of keys) {
        const fv = colText[k].trim().toLowerCase();
        let cell;
        if (k === "date") cell = t.date || "";
        else if (k === "txn") cell = t.txn_type || "";
        else if (k === "ref") cell = t.ref_no || "";
        else cell = "";
        if (!String(cell).toLowerCase().includes(fv)) return false;
      }
      return true;
    });
  }, [transactions, colText]);

  // Sort
  const displayed = useMemo(() => {
    const list = [...filtered];
    if (!sortCol) return list;
    const numKeys = ["total", "receivedPaid", "txnBalance", "receivableBal", "payableBal"];
    list.sort((a, b) => {
      let av, bv;
      if (sortCol === "total") { av = Number(a.total) || 0; bv = Number(b.total) || 0; }
      else if (sortCol === "receivedPaid") { av = Number(a.received) + Number(a.paid); bv = Number(b.received) + Number(b.paid); }
      else if (sortCol === "txnBalance") { av = Number(a.txn_balance) || 0; bv = Number(b.txn_balance) || 0; }
      else if (sortCol === "receivableBal") { av = Number(a.receivable_bal) || 0; bv = Number(b.receivable_bal) || 0; }
      else if (sortCol === "payableBal") { av = Number(a.payable_bal) || 0; bv = Number(b.payable_bal) || 0; }
      else if (sortCol === "date") { av = a.date || ""; bv = b.date || ""; }
      else if (sortCol === "txn") { av = a.txn_type || ""; bv = b.txn_type || ""; }
      else if (sortCol === "ref") { av = a.ref_no || ""; bv = b.ref_no || ""; }
      else return 0;
      if (numKeys.includes(sortCol)) return (av - bv) * (sortDir === "asc" ? 1 : -1);
      return String(av).localeCompare(String(bv)) * (sortDir === "asc" ? 1 : -1);
    });
    return list;
  }, [filtered, sortCol, sortDir]);

  const periodLabel = TIME_PRESETS.find((p) => p.value === period)?.label || "This Month";
  const prettyTo = endDate ? endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const prettyFrom = startDate ? startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

  /* ── Print ── */
  const handlePrint = () => {
    const title = summary.party_name || selectedParty?.name || "Party";
    const buildTable = (rows) =>
      `<table>
        <thead><tr>
          <th>Date</th><th>Txn Type</th><th>Ref No.</th>
          <th class="r">Total</th><th class="r">Received/Paid</th>
          <th class="r">Txn Balance</th><th class="r">Receivable Bal.</th><th class="r">Payable Bal.</th>
        </tr></thead>
        <tbody>${
          rows.map(
            (t) =>
              `<tr>
                <td>${t.date || "-"}</td><td>${t.txn_type || "-"}</td><td>${t.ref_no || "-"}</td>
                <td class="r">${fmtINR(t.total)}</td><td class="r">${fmtINR(Number(t.received) || Number(t.paid))}</td>
                <td class="r">${fmtINR(t.txn_balance)}</td><td class="r">${fmtINR(t.receivable_bal)}</td><td class="r">${fmtINR(t.payable_bal)}</td>
              </tr>`
          ).join("")
        }</tbody>
      </table>`;

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Party Statement — ${title}</h2>
       <div class="meta">${prettyFrom} to ${prettyTo} &nbsp;|&nbsp; ${displayed.length} transaction(s)</div>
       ${buildTable(displayed)}
       <div class="sum">
         <div><span>Total Sale</span><span>${fmtINR(summary.total_sale || 0)}</span></div>
         <div><span>Total Purchase</span><span>${fmtINR(summary.total_purchase || 0)}</span></div>
         <div><span>Total Expense</span><span>${fmtINR(summary.total_expense || 0)}</span></div>
         <div><span>Total Money-In</span><span>${fmtINR(summary.total_money_in || 0)}</span></div>
         <div><span>Total Money-Out</span><span>${fmtINR(summary.total_money_out || 0)}</span></div>
         <div class="net"><span>Total Receivable</span><span>${fmtINR(summary.total_receivable || 0)}</span></div>
         <div class="net"><span>Total Payable</span><span>${fmtINR(summary.total_payable || 0)}</span></div>
       </div>`;
    printElement(el, "Party Statement");
  };

  /* ── Print a single transaction row ── */
  const printSingleRow = (t) => {
    const el = document.createElement("div");
    el.innerHTML =
      `<h2>${t.txn_type || "Transaction"}</h2>
       <div class="meta">${summary.party_name || selectedParty?.name || "Party"} &nbsp;|&nbsp; ${t.date || "-"}</div>
       <table>
         <tr><th>Date</th><td>${t.date || "-"}</td></tr>
         <tr><th>Ref No.</th><td>${t.ref_no || "-"}</td></tr>
         <tr><th>Txn Type</th><td>${t.txn_type || "-"}</td></tr>
         <tr><th>Total</th><td class="r">${fmtINR(t.total)}</td></tr>
         <tr><th>Received/Paid</th><td class="r">${fmtINR(Number(t.received) || Number(t.paid))}</td></tr>
         <tr><th>Txn Balance</th><td class="r">${fmtINR(t.txn_balance)}</td></tr>
         <tr><th>Receivable Balance</th><td class="r">${fmtINR(t.receivable_bal)}</td></tr>
         <tr><th>Payable Balance</th><td class="r">${fmtINR(t.payable_bal)}</td></tr>
       </table>`;
    printElement(el, "Party Statement Transaction");
  };

  /* ── Share a single transaction row ── */
  const shareRow = async (t) => {
    const text = [
      `Party Statement — ${summary.party_name || selectedParty?.name || "Party"}`,
      `Date: ${t.date || "-"}`,
      `Type: ${t.txn_type || "-"}`,
      `Ref No.: ${t.ref_no || "-"}`,
      `Total: ${fmtINR(t.total)}`,
      `Received/Paid: ${fmtINR(Number(t.received) || Number(t.paid))}`,
      `Txn Balance: ${fmtINR(t.txn_balance)}`,
      `Receivable Balance: ${fmtINR(t.receivable_bal)}`,
      `Payable Balance: ${fmtINR(t.payable_bal)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      if (navigator.share) {
        await navigator.share({ title: "Party Statement Transaction", text }).catch(() => {});
      } else {
        alert("Transaction copied to clipboard:\n\n" + text);
      }
    } catch {
      alert(text);
    }
  };

  /* ── Excel ── */
  const handleExcel = () => {
    try {
      const title = summary.party_name || selectedParty?.name || "Party";
      const sheetData = [
        ["Party Statement — " + title],
        ["Period", prettyFrom + " to " + prettyTo],
        [],
        ["Date", "Txn Type", "Ref No.", "Total", "Received/Paid", "Txn Balance", "Receivable Bal.", "Payable Bal."],
      ];
      displayed.forEach((t) => {
        sheetData.push([
          t.date || "", t.txn_type || "", t.ref_no || "",
          t.total || 0, Number(t.received) || Number(t.paid), t.txn_balance || 0, t.receivable_bal || 0, t.payable_bal || 0,
        ]);
      });
      sheetData.push([]);
      sheetData.push(["Total Sale", "", "", "", fmtINRNum(summary.total_sale || 0)]);
      sheetData.push(["Total Purchase", "", "", "", fmtINRNum(summary.total_purchase || 0)]);
      sheetData.push(["Total Expense", "", "", "", fmtINRNum(summary.total_expense || 0)]);
      sheetData.push(["Total Money-In", "", "", "", fmtINRNum(summary.total_money_in || 0)]);
      sheetData.push(["Total Money-Out", "", "", "", fmtINRNum(summary.total_money_out || 0)]);
      sheetData.push(["Total Receivable", "", "", "", fmtINRNum(summary.total_receivable || 0)]);
      sheetData.push(["Total Payable", "", "", "", fmtINRNum(summary.total_payable || 0)]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 14 }, { wch: 14 }, { wch: 16 },
        { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Party Statement");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Party_Statement_${title.replace(/[^a-z0-9]+/gi, "_")}_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP FILTER SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div style={filterRowStyle}>
        {/* LEFT: Period dropdown */}
        <div ref={periodRef} style={{ position: "relative" }}>
          <button onClick={() => { setPeriodOpen((v) => !v); setPartyOpen(false); }} style={periodBtnStyle}>
            <Calendar size={15} color={INDIGO} />
            <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>{periodLabel}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: periodOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {periodOpen && (
            <div style={dropdownPanelStyle}>
              {TIME_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePeriodSelect(p.value)}
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
            onChange={(e) => { setStartDate(parseDateISO(e.target.value)); setPeriod("custom"); }}
            style={dateInputStyle}
          />
          <span style={{ fontSize: 12, color: "#9ca3af" }}>To</span>
          <input
            type="date"
            value={formatDateISO(endDate)}
            onChange={(e) => { setEndDate(parseDateISO(e.target.value)); setPeriod("custom"); }}
            style={dateInputStyle}
          />
        </div>

        {/* Party selector */}
        <div ref={partyRef} style={{ position: "relative", minWidth: 180 }}>
          <button onClick={() => { setPartyOpen((v) => !v); setPeriodOpen(false); }} style={partyBtnStyle}>
            <Search size={14} color="#94a3b8" />
            <span style={{ fontSize: 13, color: selectedParty ? NAVY : "#94a3b8", fontWeight: selectedParty ? 600 : 400, flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedParty ? selectedParty.name : "Select Party"}
            </span>
            {selectedParty ? (
              <button onClick={(e) => { e.stopPropagation(); setSelectedParty(null); setPartyQuery(""); }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}>
                <X size={14} color="#94a3b8" />
              </button>
            ) : (
              <ChevronDown size={15} style={{ color: "#94a3b8", transform: partyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            )}
          </button>
          {partyOpen && (
            <div style={dropdownPanelStyle}>
              <div style={{ padding: 8, borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                <div style={{ position: "relative" }}>
                  <Search size={14} color="#94a3b8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    value={partyQuery}
                    onChange={(e) => setPartyQuery(e.target.value)}
                    placeholder="Search party..."
                    style={{ ...dateInputStyle, width: "100%", paddingLeft: 32, boxSizing: "border-box", fontSize: 13 }}
                  />
                </div>
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto", padding: 4 }}>
                {parties.length === 0 ? (
                  <div style={{ padding: "14px 12px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
                    No parties available yet.
                    <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>Connect party data to populate this list.</div>
                  </div>
                ) : (
                  parties
                    .filter((p) => !partyQuery || (p.name || "").toLowerCase().includes(partyQuery.toLowerCase()))
                    .map((p) => (
                      <button
                        key={p.role + "-" + p.id}
                        onClick={() => selectParty(p)}
                        style={{
                          ...dropdownItemStyle,
                          background: selectedParty?.id === p.id && selectedParty?.role === p.role ? "#eef2ff" : "transparent",
                          color: selectedParty?.id === p.id && selectedParty?.role === p.role ? INDIGO : "#334155",
                        }}
                      >
                        <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: p.role === "customer" ? "#eff6ff" : "#fef2f2", color: p.role === "customer" ? "#1d4ed8" : "#dc2626", flexShrink: 0 }}>
                            {p.role === "customer" ? "Customer" : "Supplier"}
                          </span>
                        </span>
                      </button>
                    ))
                )}
              </div>
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
          2. TRANSACTION TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th key={col.key} style={{ ...thStyle, width: col.width, minWidth: col.width }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex" }}
                        >
                          {sortCol === col.key ? (
                            sortDir === "asc" ? <ArrowUp size={12} color="#94a3b8" /> : <ArrowDown size={12} color="#94a3b8" />
                          ) : (
                            <ArrowUpDown size={12} color="#cbd5e1" />
                          )}
                        </button>
                      )}
                      {col.filterable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setFilterOpen(filterOpen === col.key ? null : col.key); }}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", position: "relative" }}
                        >
                          <Filter size={12} color={filterOpen === col.key ? INDIGO : "#cbd5e1"} />
                          {filterOpen === col.key && (
                            <div style={filterPopupStyle} onClick={(e) => e.stopPropagation()}>
                              <div style={{ padding: 10 }}>
                                <input
                                  value={colText[col.key] || ""}
                                  onChange={(e) => setColText((p) => ({ ...p, [col.key]: e.target.value }))}
                                  placeholder={`Filter ${col.label.toLowerCase()}...`}
                                  style={{ width: "100%", padding: "6px 8px", border: `1px solid ${LIGHT_BORDER}`, borderRadius: 6, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                                />
                              </div>
                            </div>
                          )}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th key="actions" style={{ ...thStyle, width: 90, minWidth: 90, textAlign: "center" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No transactions to show</div>
                      <div style={{ fontSize: 12 }}>Select a party and date range to view transactions.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((t, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                    <td style={tdStyle}>{t.date || "-"}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: txnBadge(t.txn_type).bg, color: txnBadge(t.txn_type).color }}>
                        {t.txn_type || "-"}
                      </span>
                    </td>
                    <td style={tdStyle}>{t.ref_no || "-"}</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: NAVY }}>{fmtINR(t.total)}</td>
                    <td style={{ ...tdStyle, textAlign: "right", color: Number(t.received) > 0 ? "#15803d" : Number(t.paid) > 0 ? "#dc2626" : "#9ca3af" }}>
                      {fmtINR(Number(t.received) || Number(t.paid))}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: NAVY }}>{fmtINR(t.txn_balance)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(t.receivable_bal)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(t.payable_bal)}</td>
                    <td style={{ ...tdStyle, textAlign: "center", whiteSpace: "nowrap" }}>
                      <button onClick={() => printSingleRow(t)} title="Print" style={rowIconBtnStyle("#4338ca")}>
                        <Printer size={13} />
                      </button>
                      <button onClick={() => shareRow(t)} title="Share" style={rowIconBtnStyle("#0891b2")}>
                        <Share2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
      4. BOTTOM SUMMARY PANEL
          ═══════════════════════════════════════════════════════════════ */}
      <div style={summaryContainerStyle}>
        <button onClick={() => setSummaryOpen((v) => !v)} style={summaryHeaderStyle}>
          <span style={{ fontSize: 14, fontWeight: 700, color: NAVY }}>Party Statement Summary</span>
          <ChevronDown size={18} style={{ color: "#94a3b8", transform: summaryOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
        </button>
        {summaryOpen && (
          <div style={summaryBodyStyle}>
            {/* LEFT: Sale + Money-In */}
            <div style={summaryColStyle}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Total Sale: <span style={{ fontWeight: 400 }}>{fmtINR(summary.total_sale)}</span></div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>(Sale - Sale Return)</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Total Money-In: <span style={{ fontWeight: 400 }}>{fmtINR(summary.total_money_in)}</span></div>
              </div>
            </div>

            {/* MIDDLE: Purchase + Money-Out */}
            <div style={summaryColStyle}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Total Purchase: <span style={{ fontWeight: 400 }}>{fmtINR(summary.total_purchase)}</span></div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>(Purchase - Purchase Return)</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Total Money-out: <span style={{ fontWeight: 400 }}>{fmtINR(summary.total_money_out)}</span></div>
              </div>
            </div>

            {/* Expense */}
            <div style={summaryColStyle}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>Total Expense: <span style={{ fontWeight: 400 }}>{fmtINR(summary.total_expense)}</span></div>
              </div>
            </div>

            {/* VERTICAL DIVIDER */}
            <div style={verticalDividerStyle} />

            {/* RIGHT: Receivable / Payable */}
            <div style={summaryReceivableStyle}>
              <div style={{ fontSize: 13, fontWeight: 600, color: GRAY_TEXT }}>Total Receivable</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#059669", marginTop: 4 }}>{fmtINR(summary.total_receivable)}</div>
              {summary.party_role === "supplier" && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: GRAY_TEXT, marginTop: 14 }}>Total Payable</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626", marginTop: 4 }}>{fmtINR(summary.total_payable)}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Date helpers ───────────────────────────────────────────────────── */
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

const periodBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 14px",
  background: "#fff",
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

const partyBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 12px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  width: "100%",
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

const rowIconBtnStyle = (color) => ({
  width: 28,
  height: 28,
  borderRadius: 6,
  border: `1px solid ${LIGHT_BORDER}`,
  background: "#fff",
  color,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  marginRight: 6,
});

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 200,
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

function txnBadge(t) {
  const map = {
    sale: { bg: "#f0fdf4", color: "#15803d" },
    "sale return": { bg: "#fffbeb", color: "#b45309" },
    purchase: { bg: "#fef2f2", color: "#dc2626" },
    payment: { bg: "#eef2ff", color: "#4338ca" },
    "payment in": { bg: "#eef2ff", color: "#4338ca" },
  };
  return map[String(t || "").toLowerCase()] || { bg: "#f1f5f9", color: "#475569" };
}

const filterPopupStyle = {
  position: "absolute",
  top: "calc(100% + 4px)",
  left: -40,
  zIndex: 70,
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,.1)",
  width: 200,
};

/* ── Summary panel ──────────────────────────────────────────────────── */
const summaryContainerStyle = {
  marginTop: 8,
  background: "#fff",
  borderTop: `1px solid ${LIGHT_BORDER}`,
  boxShadow: "0 -4px 16px rgba(0,0,0,.04)",
  borderRadius: "8px 8px 0 0",
  flexShrink: 0,
};

const summaryHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  cursor: "pointer",
  fontFamily: FONT,
};

const summaryBodyStyle = {
  display: "flex",
  alignItems: "flex-start",
  gap: 24,
  padding: "16px 20px",
  flexWrap: "wrap",
};

const summaryColStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  minWidth: 160,
};

const verticalDividerStyle = {
  width: 1,
  alignSelf: "stretch",
  background: LIGHT_BORDER,
  flexShrink: 0,
};

const summaryReceivableStyle = {
  minWidth: 140,
  textAlign: "right",
  marginLeft: "auto",
};
