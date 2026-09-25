import { useEffect, useState, useRef, useCallback, useMemo } from "react";
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
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  BarChart3,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import DayBookAnalytics from "./DayBookAnalytics";

/* ─── Styling constants (reuse the app's report theme) ─────────────── */
const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const BORDER = "#e2e8f0";
const MONEY_IN = "#15803d";
const MONEY_OUT = "#dc2626";

/* Official WhatsApp logo glyph (same mark used elsewhere in the app) */
const WhatsAppIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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
  const [sharingNo, setSharingNo] = useState(null);
  const [shareOpen, setShareOpen] = useState(null);
  const [sharePos, setSharePos] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const menuRef = useRef(null);
  const shareRef = useRef(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  /* close the 3-dot menu and the Share dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareOpen(null);
        setSharePos(null);
        setShareTarget(null);
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

  /* open the compact Share dropdown anchored just below the clicked Share icon.
     Also closes it when the same Share icon is clicked again. Sends nothing here. */
  const toggleShare = (e, t) => {
    e.stopPropagation();
    if (shareOpen === t.reference) {
      setShareOpen(null);
      setSharePos(null);
      setShareTarget(null);
      return;
    }
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    setSharePos({ right: window.innerWidth - rect.right, top: rect.bottom });
    setShareTarget(t);
    setShareOpen(t.reference);
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

  /* Day Book row kind → Transaction Message type */
  const KIND_TO_TYPE = {
    sale: "sales",
    purchase: "purchase",
    sales_return: "sales_return",
  };

  /* Send the selected Day Book transaction via the existing Personal WhatsApp
     flow (POST /transaction-messages/send). The server resolves the party's
     real WhatsApp number from the row's transaction record and sends the
     configured template on the connected Personal WhatsApp. Triggered ONLY by
     the WhatsApp button inside the Share dropdown — never by the Share icon. */
  const shareRow = async (t) => {
    if (sharingNo === t.reference) return;
    const type = KIND_TO_TYPE[t.kind];
    if (!type || !t.company_id) {
      setShareOpen(null);
      setSharePos(null);
      setShareTarget(null);
      setActionToast({ msg: "This transaction cannot be shared via WhatsApp.", ok: false });
      setTimeout(() => setActionToast(null), 3500);
      return;
    }

    const reference =
      type === "sales" ? { invoice_no: t.reference } :
      type === "purchase" ? { purchase_no: t.reference } :
      { return_no: t.reference };

    setSharingNo(t.reference);
    setShareOpen(null);
    setSharePos(null);
    setShareTarget(null);
    setActionToast({ msg: `Sending ${t.reference} via WhatsApp…`, ok: true });
    try {
      const res = await api.post("/transaction-messages/send", {
        company_id: t.company_id,
        transaction_type: type,
        reference,
      });
      setActionToast({
        msg: res.data?.status ? (res.data?.message || "Message sent via WhatsApp.") : (res.data?.message || "Could not send via WhatsApp."),
        ok: !!res.data?.status,
      });
    } catch (err) {
      setActionToast({
        msg: err.response?.data?.message || err.message || "Failed to send via WhatsApp.",
        ok: false,
      });
    } finally {
      setSharingNo(null);
      setTimeout(() => setActionToast(null), 4000);
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
    <th
      key={col}
      className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200 select-none ${
        alignRight ? "text-right" : "text-left"
      }`}
    >
      <div
        className="inline-flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition"
        onClick={() => toggleSort(col)}
      >
        <span>{col}</span>
        {sortKey === col && (
          <span className="text-[10px] text-indigo-600 font-extrabold">
            {sortDir === 1 ? "▲" : "▼"}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          clickFilterIcon(col);
        }}
        title={`Filter ${col}`}
        className={`ml-1.5 p-1 rounded-md transition cursor-pointer ${
          colFilters[col]
            ? "text-indigo-600 bg-indigo-50"
            : "text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
        }`}
      >
        <Filter size={11} fill={colFilters[col] ? "currentColor" : "none"} />
      </button>
    </th>
  );

  const totalRows = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayed.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  // Analytics rows (Day Book grouped by transaction type)
  const analyticsRows = useMemo(
    () =>
      displayed.map((t) => ({
        date: date || "",
        group: t.type || "General",
        value: Number(t.total || 0),
        count: 1,
        name: t.name || "Unknown",
        paymentType: (t.payment_type || "other").toLowerCase(),
        moneyIn: Number(t.money_in || 0),
        moneyOut: Number(t.money_out || 0),
      })),
    [displayed, date]
  );

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800">
      {viewMode === "analytics" ? (
        <DayBookAnalytics
          rows={analyticsRows}
          date={date}
          firmName={firmNameRef.current}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ── TOP CONTROL CARD ── */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Date Selector */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition">
            <CalendarDays size={16} className="text-slate-400 shrink-0" />
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => {
                setDate(e.target.value || todayStr());
                setSearch("");
              }}
              className="border-none outline-none text-xs font-bold text-slate-800 bg-transparent cursor-pointer"
            />
          </div>

          {/* Firm Dropdown */}
          <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 hover:bg-slate-100/50 transition">
            <Building2 size={16} className="text-slate-400 shrink-0" />
            <select
              value={firm}
              onChange={onFirmChange}
              className="border-none outline-none text-xs font-bold text-slate-800 bg-transparent cursor-pointer"
            >
              <option value="all">All Firms</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              value={search}
              onChange={onSearchChange}
              placeholder="Search by party, reference, type..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 hover:bg-slate-100/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("analytics")}
            disabled={!displayed.length}
            title="Open Analytics"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
          <button
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet size={15} />
            <span>Excel Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── 3 MODERN KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Total Money-In
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1">
              {fmtINR(summary.money_in)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Collections & Inflows</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Total Money-Out
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-rose-600 mt-1">
              {fmtINR(summary.money_out)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Purchases & Outflows</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight size={24} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Net Cash Flow
            </div>
            <div className="text-xl md:text-2xl font-extrabold text-indigo-600 mt-1">
              {fmtINR(summary.net)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Money-In − Money-Out</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-visible">
        {/* Column Filter Panel */}
        {openFilter && (
          <div className="p-3 border-b border-slate-200 bg-slate-50/80 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
              Filter: {openFilter}
            </span>
            <input
              autoFocus
              value={colFilters[openFilter] || ""}
              onChange={(e) =>
                setColFilters((p) => ({ ...p, [openFilter]: e.target.value }))
              }
              placeholder={`Filter ${openFilter.toLowerCase()}…`}
              className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => setColFilters((p) => ({ ...p, [openFilter]: "" }))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <X size={12} /> Clear
            </button>
            <button
              onClick={() => setOpenFilter("")}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px] text-xs">
            <thead>
              <tr>
                {headerCell("Name")}
                {headerCell("Ref. No")}
                {headerCell("Type")}
                {headerCell("Payment Type")}
                {headerCell("Total", true)}
                {headerCell("Money In", true)}
                {headerCell("Money Out", true)}
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50/90 border-b border-slate-200 whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                    Loading transactions…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="text-xs font-bold text-rose-600">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length > 0 ? (
                pagedRows.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{t.name || "-"}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium">{t.reference || "-"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center"
                        style={{
                          background: typeBadge(t.type).bg,
                          color: typeBadge(t.type).color,
                        }}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center capitalize"
                        style={{
                          background: methodBadge(t.payment_type).bg,
                          color: methodBadge(t.payment_type).color,
                        }}
                      >
                        {t.payment_type || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-800">
                      {fmtINR(t.total)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-emerald-600">
                      {fmtINR(t.money_in)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-rose-600">
                      {fmtINR(t.money_out)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => printSingleRow(t)}
                          title="Print"
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition cursor-pointer"
                        >
                          <Printer size={13} />
                        </button>
                        <div className="relative inline-flex">
                          <button
                            onClick={(e) => toggleShare(e, t)}
                            title="Share via WhatsApp"
                            disabled={sharingNo === t.reference}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-emerald-600 transition cursor-pointer disabled:opacity-40"
                          >
                            <Share2 size={13} />
                          </button>

                          {shareOpen === t.reference && sharePos && (
                            <div
                              ref={shareRef}
                              style={{
                                position: "fixed",
                                right: sharePos.right,
                                top: sharePos.top,
                                marginTop: 6,
                                zIndex: 99999,
                              }}
                              className="min-w-[92px] bg-white rounded-xl border border-slate-200 shadow-xl p-2.5 text-center"
                            >
                              <button
                                type="button"
                                title="WhatsApp"
                                aria-label="WhatsApp"
                                disabled={sharingNo === shareTarget.reference}
                                onClick={() => shareRow(shareTarget)}
                                className="w-9 h-9 rounded-full bg-[#25D366] text-white inline-flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                              >
                                <WhatsAppIcon size={17} />
                              </button>
                              <div
                                onClick={() => shareRow(shareTarget)}
                                className="mt-1 text-[10px] font-bold text-slate-600 cursor-pointer hover:text-slate-900"
                              >
                                WhatsApp
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative inline-flex">
                          <button
                            onClick={(e) => toggleMenu(e, t.reference)}
                            title="More actions"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          >
                            <MoreVertical size={14} />
                          </button>

                          {activeMenu === t.reference && menuPos && (
                            <div
                              ref={menuRef}
                              style={{
                                position: "fixed",
                                right: menuPos.right,
                                bottom: menuPos.bottom,
                                marginBottom: 8,
                                zIndex: 99999,
                              }}
                              className="min-w-[160px] bg-white rounded-xl border border-slate-200 shadow-xl py-1 text-left"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(null);
                                  navigate(`/invoice/${t.reference}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                              >
                                <Eye size={14} className="text-slate-500" /> View Invoice
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(null);
                                  navigate(`/sales/edit/${t.reference}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              >
                                <Edit size={14} /> Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(null);
                                  navigate(`/invoice/${t.reference}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                              >
                                <Printer size={14} /> Print POS
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(null);
                                  setDeleteTarget(t);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={32} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">
                        No transactions to show
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ReportPagination
          total={totalRows}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => {
            setRowsPerPage(v);
            setPage(1);
          }}
        />
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && deleteTarget.kind === "sale" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Invoice?</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Invoice #{deleteTarget.reference}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete this invoice? This transaction will be removed from your records.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteInvoice}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition cursor-pointer disabled:opacity-50"
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
          className={`fixed top-6 right-6 z-50 min-w-[280px] max-w-md text-white rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xl transition-all ${
            actionToast.ok ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          <span className="text-xs font-bold">{actionToast.msg}</span>
          <button
            onClick={() => setActionToast(null)}
            className="text-white hover:opacity-75 cursor-pointer p-0.5"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>
      )}
        </>
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
