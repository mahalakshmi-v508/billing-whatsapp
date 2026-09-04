import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Search,
  FileSpreadsheet,
  Printer,
  Share2,
  Building2,
  Filter,
  X,
  AlertCircle,
  Inbox,
  MoreVertical,
  Eye,
  Trash2,
  Edit,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

/* ─── Styling constants (reuse the app's report theme) ─────────────── */
const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const BORDER = "#e2e8f0";
const MONEY_IN = "#15803d";
const MONEY_OUT = "#dc2626";

const methodBadge = (m) => {
  const map = {
    cash: { bg: "#f0fdf4", color: "#15803d" },
    online: { bg: "#eff6ff", color: "#1d4ed8" },
    upi: { bg: "#faf5ff", color: "#7e22ce" },
    credit: { bg: "#fffbeb", color: "#b45309" },
    card: { bg: "#eff6ff", color: "#1d4ed8" },
    bank: { bg: "#eef2ff", color: "#4338ca" },
    cheque: { bg: "#f5f3ff", color: "#6d28d9" },
  };
  return map[(m || "").toLowerCase()] || { bg: "#f8fafc", color: "#64748b" };
};

const typeBadge = (t) => {
  const map = {
    sale: { bg: "#f0fdf4", color: "#15803d" },
    purchase: { bg: "#fef2f2", color: "#dc2626" },
    "sales return": { bg: "#fffbeb", color: "#b45309" },
  };
  return map[(t || "").toLowerCase()] || { bg: "#eef2ff", color: "#4338ca" };
};

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtINRNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
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
    `<html><head><title>${title || "Day Book"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       .sum{margin-top:14px;font-size:12px;}
       .sum div{display:flex;justify-content:space-between;max-width:340px;padding:3px 0;}
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

const COL_FIELD = {
  "Name": "name",
  "Ref. No": "reference",
  "Type": "type",
  "Payment Type": "payment_type",
  "Total": "total",
  "Money In": "money_in",
  "Money Out": "money_out",
};
const NUM_COLS = new Set(["Total", "Money In", "Money Out"]);

export default function DayBook() {
  const navigate = useNavigate();
  const { adminId } = getAuth();
  const [companies, setCompanies] = useState([]);
  const [firm, setFirm] = useState("all"); // "all" | company id
  const [date, setDate] = useState(todayStr());
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ money_in: 0, money_out: 0, net: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState(1);
  const [colFilters, setColFilters] = useState({}); // { columnKey: value }
  const [openFilter, setOpenFilter] = useState("");
  const searchTimer = useRef(null);
  const firmNameRef = useRef("ALL FIRMS");

  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);
  const menuRef = useRef(null);

  /* close the 3-dot menu on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* open the 3-dot menu anchored above the clicked button (fixed positioning so it is never clipped) */
  const toggleMenu = (e, reference) => {
    e.stopPropagation();
    if (activeMenu === reference) {
      setActiveMenu(null);
      setMenuPos(null);
      return;
    }
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.top, top: rect.bottom });
    setActiveMenu(reference);
  };

  /* delete a sale invoice on this day book row */
  const handleDeleteInvoice = async () => {
    if (!deleteTarget || deleteTarget.kind !== "sale") return;
    setDeleting(true);
    try {
      const res = await api.post("/invoice/delete_invoice", {
        invoice_no: deleteTarget.reference,
      });
      if (res.data?.status) {
        setTransactions((prev) => prev.filter((t) => t.reference !== deleteTarget.reference));
        setActionToast({ msg: "Invoice deleted successfully.", ok: true });
        setTimeout(() => setActionToast(null), 3500);
      } else {
        setActionToast({ msg: res.data?.message || "Failed to delete invoice.", ok: false });
        setTimeout(() => setActionToast(null), 3500);
      }
    } catch {
      setActionToast({ msg: "Error deleting invoice.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  /* load companies for this admin, default to saved selected company */
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
          firmNameRef.current = match.company_name || "ALL FIRMS";
        } else if (list.length === 1) {
          setFirm(String(list[0].id));
          firmNameRef.current = list[0].company_name || "ALL FIRMS";
        } else {
          setFirm("all");
          firmNameRef.current = "ALL FIRMS";
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  /* fetch day-book for the selected firm + date */
  const fetchDayBook = useCallback(
    async (f, d, q) => {
      if (!f) return;
      setLoading(true);
      setError("");
      try {
        const params = { company_id: f === "all" ? 0 : Number(f), date: d, search: q || "" };
        if (adminId) params.admin_id = adminId;
        const res = await api.get("/report/day-book", { params });
        if (res.data?.status) {
          setTransactions(res.data.transactions || []);
          setSummary(res.data.summary || { money_in: 0, money_out: 0, net: 0 });
        } else {
          setError(res.data?.message || "Failed to load transactions.");
        }
      } catch {
        setError("Failed to load transactions.");
      } finally {
        setLoading(false);
      }
    },
    [adminId]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchDayBook(firm, date, ""), 0);
    return () => clearTimeout(t);
  }, [firm, date, fetchDayBook]);

  /* debounced server-side search */
  const onSearchChange = (e) => {
    const v = e.target.value;
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchDayBook(firm, date, v), 350);
  };
  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const onFirmChange = (e) => {
    const v = e.target.value;
    setFirm(v);
    setSearch("");
    if (v === "all") {
      firmNameRef.current = "ALL FIRMS";
    } else {
      const c = companies.find((x) => String(x.id) === String(v));
      firmNameRef.current = c?.company_name || "ALL FIRMS";
      localStorage.setItem("selected_company_id", v);
    }
  };

  const sortedFiltered = useCallback(() => {
    let list = [...transactions];
    if (colFilters && Object.keys(colFilters).some((k) => colFilters[k]?.trim())) {
      list = list.filter((row) => {
        for (const col of Object.keys(colFilters)) {
          const fv = colFilters[col].trim().toLowerCase();
          if (!fv) continue;
          const cell = String(row[COL_FIELD[col]] ?? row[col] ?? "");
          if (!cell.toLowerCase().includes(fv)) return false;
        }
        return true;
      });
    }
    if (sortKey && COL_FIELD[sortKey]) {
      const key = COL_FIELD[sortKey];
      const isNum = NUM_COLS.has(sortKey);
      list.sort((a, b) => {
        let av = a[key], bv = b[key];
        if (isNum) { av = Number(av) || 0; bv = Number(bv) || 0; }
        else { av = String(av ?? "").toLowerCase(); bv = String(bv ?? "").toLowerCase(); }
        return (av < bv ? -1 : av > bv ? 1 : 0) * sortDir;
      });
    }
    return list;
  }, [transactions, colFilters, sortKey, sortDir]);

  const displayed = sortedFiltered();

  const toggleSort = (col) => {
    if (sortKey === col) setSortDir((d) => -d);
    else { setSortKey(col); setSortDir(1); }
  };

  const clickFilterIcon = (col) => setOpenFilter((cur) => (cur === col ? "" : col));

  /* ── PRINT ── */
  const buildPrintTable = (rows) =>
    `<table>
      <thead><tr>
        <th>Name</th><th>Ref. No</th><th>Type</th><th>Payment Type</th>
        <th class="r">Total</th><th class="r">Money In</th><th class="r">Money Out</th>
      </tr></thead>
      <tbody>${
        rows.map(
          (t) =>
            `<tr>
              <td>${t.name || "-"}</td><td>${t.reference || "-"}</td>
              <td>${t.type || "-"}</td><td>${t.payment_type || "-"}</td>
              <td class="r">${fmtINR(t.total)}</td>
              <td class="r">${fmtINR(t.money_in)}</td>
              <td class="r">${fmtINR(t.money_out)}</td>
            </tr>`
        ).join("")
      }</tbody>
    </table>`;

  const handlePrint = () => {
    const prettyDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Day Book</h2>
       <div class="meta">${firmNameRef.current} &nbsp;|&nbsp; ${prettyDate} &nbsp;|&nbsp; ${displayed.length} transaction(s)</div>
       ${buildPrintTable(displayed)}
       <div class="sum">
         <div><span>Total Money-In</span><span>${fmtINR(summary.money_in)}</span></div>
         <div><span>Total Money-Out</span><span>${fmtINR(summary.money_out)}</span></div>
         <div class="net"><span>Money In - Money Out</span><span>${fmtINR(summary.net)}</span></div>
       </div>`;
    printElement(el, "Day Book");
  };

  const printSingleRow = (t) => {
    const prettyDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Day Book</h2>
       <div class="meta">${firmNameRef.current} &nbsp;|&nbsp; ${prettyDate}</div>
       <table>
         <tr><th>Name</th><td>${t.name || "-"}</td></tr>
         <tr><th>Ref. No</th><td>${t.reference || "-"}</td></tr>
         <tr><th>Type</th><td>${t.type || "-"}</td></tr>
         <tr><th>Payment Type</th><td>${t.payment_type || "-"}</td></tr>
         <tr><th>Total</th><td class="r">${fmtINR(t.total)}</td></tr>
         <tr><th>Money In</th><td class="r">${fmtINR(t.money_in)}</td></tr>
         <tr><th>Money Out</th><td class="r">${fmtINR(t.money_out)}</td></tr>
       </table>`;
    printElement(el, "Day Book Transaction");
  };

  const shareRow = async (t) => {
    const prettyDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
    const text = [
      `Day Book — ${firmNameRef.current} | ${prettyDate}`,
      `Name: ${t.name || "-"}`,
      `Ref. No: ${t.reference || "-"}`,
      `Type: ${t.type || "-"}`,
      `Payment: ${t.payment_type || "-"}`,
      `Total: ${fmtINR(t.total)}`,
      `Money In: ${fmtINR(t.money_in)}`,
      `Money Out: ${fmtINR(t.money_out)}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      if (navigator.share) {
        await navigator.share({ title: "Day Book Transaction", text }).catch(() => {});
      } else {
        alert("Transaction copied to clipboard:\n\n" + text);
      }
    } catch {
      alert(text);
    }
  };

  /* ── EXCEL (always generates a valid .xlsx, even when empty) ── */
  const handleExcel = () => {
    try {
      const sheetData = [["Date", "Name", "Reference No", "Type", "Payment Type", "Total", "Money In", "Money Out"]];
      displayed.forEach((t) => {
        sheetData.push([
          date, t.name || "", t.reference || "", t.type || "", t.payment_type || "",
          t.total || 0, t.money_in || 0, t.money_out || 0,
        ]);
      });
      sheetData.push([]);
      sheetData.push(["Total Money-In", "", "", "", "", "", fmtINRNum(summary.money_in), ""]);
      sheetData.push(["Total Money-Out", "", "", "", "", "", "", fmtINRNum(summary.money_out)]);
      sheetData.push(["Net Money", "", "", "", "", "", fmtINRNum(summary.net), ""]);

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 12 }, { wch: 22 }, { wch: 16 }, { wch: 14 },
        { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Day Book");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Day_Book_${date}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  const headerCell = (col, alignRight = false) => (
    <th key={col} style={{ padding: "9px 12px", textAlign: alignRight ? "right" : "left", fontSize: 11, fontWeight: 700, color: "#334155", borderRight: "1px solid " + BORDER, whiteSpace: "nowrap" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(col)}>
        <span>{col}</span>
        {sortKey === col && <span style={{ fontSize: 9, color: INDIGO }}>{sortDir === 1 ? "▲" : "▼"}</span>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); clickFilterIcon(col); }}
        title={`Filter ${col}`}
        style={{
          border: "none", background: "transparent", cursor: "pointer",
          color: colFilters[col] ? INDIGO : "#94a3b8", marginLeft: 5, verticalAlign: "middle",
        }}
      >
        <Filter size={11} fill={colFilters[col] ? "#c7d2fe" : "none"} />
      </button>
    </th>
  );

  return (
    <div style={{ fontFamily: FONT, padding: "8px 18px 20px" }}>
      {/* ── TOP CONTROL ROW ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        {/* date */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid " + BORDER, borderRadius: 8, padding: "7px 10px", background: "#fff" }}>
          <CalendarDays size={15} color="#64748b" />
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => { setDate(e.target.value || todayStr()); setSearch(""); }}
            style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT, color: "#1e293b", background: "transparent", padding: 0 }}
          />
        </div>

        {/* firm dropdown */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px solid " + BORDER, borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
          <Building2 size={15} color="#64748b" />
          <select
            value={firm}
            onChange={onFirmChange}
            style={{ border: "none", outline: "none", fontSize: 12, fontFamily: FONT, color: "#1e293b", background: "transparent", cursor: "pointer", fontWeight: 600 }}
          >
            <option value="all">ALL FIRMS</option>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.company_name}</option>
            ))}
          </select>
        </div>

        {/* actions on the right */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleExcel} style={actionBtn("#16a34a")}>
            <FileSpreadsheet size={15} /> Excel Report
          </button>
          <button onClick={handlePrint} style={actionBtn("#dc2626")}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div style={{ marginBottom: 12, maxWidth: 420 }}>
        <div style={{ position: "relative" }}>
          <Search size={15} color="#64748b" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={onSearchChange}
            placeholder="Search"
            style={{
              width: "100%", padding: "8px 12px 8px 34px",
              border: "1.5px solid " + BORDER, borderRadius: 8, fontSize: 12,
              fontFamily: FONT, outline: "none", background: "#fff", color: "#1e293b",
            }}
          />
        </div>
      </div>

      {/* ── SUMMARY LINE ── */}
      <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 12, fontSize: 12.5 }}>
        <div>Total Money-In: <strong style={{ color: MONEY_IN }}>{fmtINR(summary.money_in)}</strong></div>
        <div>Total Money-Out: <strong style={{ color: MONEY_OUT }}>{fmtINR(summary.money_out)}</strong></div>
        <div>Total Money In - Total Money Out: <strong style={{ color: INDIGO }}>{fmtINR(summary.net)}</strong></div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ border: "1.5px solid " + BORDER, borderRadius: 8, background: "#fff", overflow: "visible" }}>
        {/* column filter panel */}
        {openFilter && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid " + BORDER, background: "#f8fafc", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", whiteSpace: "nowrap" }}>Filter: {openFilter}</span>
            <input
              autoFocus
              value={colFilters[openFilter] || ""}
              onChange={(e) => setColFilters((p) => ({ ...p, [openFilter]: e.target.value }))}
              placeholder={`Filter ${openFilter.toLowerCase()}…`}
              style={{ flex: 1, minWidth: 180, padding: "6px 10px", border: "1.5px solid " + BORDER, borderRadius: 6, fontSize: 12, fontFamily: FONT, outline: "none" }}
            />
            <button onClick={() => setColFilters((p) => ({ ...p, [openFilter]: "" }))} style={miniBtn}><X size={12} /> Clear</button>
            <button onClick={() => setOpenFilter("")} style={{ ...miniBtn, fontWeight: 700 }}>Done</button>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900, fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid " + BORDER }}>
                {headerCell("Name")}
                {headerCell("Ref. No")}
                {headerCell("Type")}
                {headerCell("Payment Type")}
                {headerCell("Total", true)}
                {headerCell("Money In", true)}
                {headerCell("Money Out", true)}
                <th style={{ padding: "9px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ padding: 54, textAlign: "center", color: "#94a3b8" }}>Loading…</td></tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={{ padding: 54, textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <AlertCircle size={30} color="#dc2626" />
                      <span style={{ color: "#dc2626", fontWeight: 600 }}>{error}</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length > 0 ? displayed.map((t, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>{t.name || "-"}</td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>{t.reference || "-"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "4px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: typeBadge(t.type).bg, color: typeBadge(t.type).color }}>
                      {t.type}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "4px 9px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: methodBadge(t.payment_type).bg, color: methodBadge(t.payment_type).color }}>
                      {t.payment_type || "-"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#1e293b" }}>{fmtINR(t.total)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: MONEY_IN }}>{fmtINR(t.money_in)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: MONEY_OUT }}>{fmtINR(t.money_out)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center", whiteSpace: "nowrap" }}>
                    <button onClick={() => printSingleRow(t)} title="Print" style={rowIconBtn("#4338ca")}><Printer size={13} /></button>
                    <button onClick={() => shareRow(t)} title="Share" style={rowIconBtn("#0891b2")}><Share2 size={13} /></button>
                    <div style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
                      <button
                        onClick={(e) => toggleMenu(e, t.reference)}
                        title="More actions"
                        style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid " + BORDER, background: "#fff", color: "#64748b", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenu === t.reference && menuPos && (
                        <div
                          ref={menuRef}
                          style={{
                            position: "fixed", right: menuPos.right, bottom: menuPos.bottom, marginBottom: 8, minWidth: 160,
                            background: "#fff", borderRadius: 12, border: "1px solid " + BORDER,
                            boxShadow: "0 -10px 30px rgba(30, 27, 75, 0.15)", padding: "5px 0",
                            zIndex: 99999, textAlign: "left", fontFamily: FONT,
                          }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(null); navigate(`/invoice/${t.reference}`); }}
                            style={menuItemBtn}
                          >
                            <Eye size={14} color="#64748b" /> View Invoice
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(null); navigate(`/sales/edit/${t.reference}`); }}
                            style={menuItemBtn}
                          >
                            <Edit size={14} color="#4338ca" /> Edit
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(null); navigate(`/invoice/${t.reference}`); }}
                            style={menuItemBtn}
                          >
                            <Printer size={14} color="#15803d" /> Print POS
                          </button>
                          <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                          <button
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(null); setDeleteTarget(t); }}
                            style={{ ...menuItemBtn, color: "#dc2626" }}
                          >
                            <Trash2 size={14} color="#dc2626" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} style={{ padding: 54, textAlign: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <Inbox size={30} color="#cbd5e1" />
                      <span style={{ color: "#64748b", fontWeight: 600 }}>No transactions to show</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && deleteTarget.kind === "sale" && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(2px)", padding: 20 }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, boxShadow: "0 20px 50px rgba(30, 27, 75, 0.3)", maxWidth: 420, width: "100%", padding: 22 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Delete Invoice?</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                  Invoice #{deleteTarget.reference}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px", lineHeight: 1.6 }}>
              Are you sure you want to permanently delete this invoice?
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                style={{ ...miniBtn, padding: "8px 16px", fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteInvoice}
                style={{ ...miniBtn, padding: "8px 16px", fontSize: 12, color: "#fff", background: "#dc2626", border: "none", fontWeight: 700 }}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION TOAST NOTIFICATION ── */}
      {actionToast && (
        <div
          style={{
            position: "fixed", top: 24, right: 28, zIndex: 99999, minWidth: 280, maxWidth: 420,
            background: actionToast.ok ? "#10b981" : "#ef4444", color: "#fff", borderRadius: 6,
            padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 14, boxShadow: actionToast.ok ? "0 6px 20px rgba(16, 185, 129, 0.4)" : "0 6px 20px rgba(239, 68, 68, 0.4)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{actionToast.msg}</span>
          <button
            onClick={() => setActionToast(null)}
            style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

const actionBtn = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  color: "#fff",
  background: color,
  border: "none",
  cursor: "pointer",
  fontFamily: FONT,
});
const rowIconBtn = (color) => ({
  width: 28,
  height: 28,
  borderRadius: 6,
  border: "1px solid " + BORDER,
  background: "#fff",
  color,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  marginRight: 4,
});
const menuItemBtn = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  border: "none",
  background: "transparent",
  color: "#334155",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "left",
  whiteSpace: "nowrap",
  cursor: "pointer",
  fontFamily: FONT,
};
const miniBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  border: "1px solid " + BORDER,
  borderRadius: 6,
  background: "#fff",
  color: "#334155",
  fontSize: 11,
  fontWeight: 600,
  fontFamily: FONT,
  cursor: "pointer",
};
