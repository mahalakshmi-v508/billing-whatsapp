import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
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
  MoreVertical,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Eye,
  Edit2,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import { generateInvoicePdfBase64 } from "../../../utils/invoiceShare";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";

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
  { key: "date", label: "DATE", width: "110px", sortable: true, filterable: true },
  { key: "txn", label: "TXN TYPE", width: "130px", sortable: true, filterable: true },
  { key: "ref", label: "REF NO.", width: "130px", sortable: true, filterable: true },
  { key: "total", label: "TOTAL", width: "120px", sortable: true, filterable: false, align: "right" },
  { key: "receivedPaid", label: "RECEIVED / PAID", width: "140px", sortable: true, filterable: false, align: "right" },
  { key: "txnBalance", label: "TXN BALANCE", width: "130px", sortable: true, filterable: false, align: "right" },
  { key: "receivableBal", label: "RECEIVABLE BAL", width: "150px", sortable: true, filterable: false, align: "right" },
  { key: "payableBal", label: "PAYABLE BAL", width: "140px", sortable: true, filterable: false, align: "right" },
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
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

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
       body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:28px;color:#0f172a;}
       h2{margin:0 0 4px;font-size:18px;color:#1e1b4b;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f8fafc;color:#475569;font-weight:bold;}
       td.r,th.r{text-align:right;}
       .sum{margin-top:16px;font-size:12px;}
       .sum div{display:flex;justify-content:space-between;max-width:360px;padding:4px 0;}
       .net{border-top:1.5px solid #4f46e5;font-weight:700;margin-top:4px;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

function getTxnBadgeClasses(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("sale") && !t.includes("return")) return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  if (t.includes("sale") && t.includes("return")) return "bg-amber-50 text-amber-700 border-amber-200/80";
  if (t.includes("purchase")) return "bg-rose-50 text-rose-700 border-rose-200/80";
  if (t.includes("payment")) return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
  return "bg-slate-50 text-slate-700 border-slate-200/80";
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function PartyStatement() {
  const navigate = useNavigate();
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
  const [filterOpen, setFilterOpen] = useState(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [sharePopup, setSharePopup] = useState({ open: false, row: null, position: { top: 0, left: 0 } });
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [menuPopup, setMenuPopup] = useState({ open: false, row: null, position: { top: 0, left: 0 } });

  const periodRef = useRef(null);
  const partyRef = useRef(null);
  const sharePopupRef = useRef(null);
  const menuPopupRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function onDoc(e) {
      if (periodRef.current && !periodRef.current.contains(e.target)) setPeriodOpen(false);
      if (partyRef.current && !partyRef.current.contains(e.target)) setPartyOpen(false);
      if (sharePopupRef.current && !sharePopupRef.current.contains(e.target) && !e.target.closest('[data-share-btn]')) {
        setSharePopup({ open: false, row: null, position: { top: 0, left: 0 } });
      }
      if (menuPopupRef.current && !menuPopupRef.current.contains(e.target) && !e.target.closest('[data-menu-btn]')) {
        setMenuPopup({ open: false, row: null, position: { top: 0, left: 0 } });
      }
      if (!e.target.closest('[data-filter-box]')) {
        setFilterOpen(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies
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

  // Load parties for company
  useEffect(() => {
    if (companyId === null) return;
    api
      .get("/report/party-statement/parties", { params: { company_id: companyId, admin_id: adminId || 0 } })
      .then((res) => setParties(res.data?.data || []))
      .catch(() => setParties([]));
  }, [companyId, adminId]);

  // Fetch statement on party/date/firm change
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

  const totalRows = displayed.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = displayed.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

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

  const handleShareClick = (t, event) => {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    setMenuPopup({ open: false, row: null, position: { top: 0, left: 0 } });
    setSharePopup({
      open: true,
      row: t,
      position: { top: rect.bottom + 6, left: Math.max(10, rect.left - 40) },
    });
  };

  const closeSharePopup = () => {
    setSharePopup({ open: false, row: null, position: { top: 0, left: 0 } });
  };

  const handleMenuClick = (t, event) => {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    setSharePopup({ open: false, row: null, position: { top: 0, left: 0 } });
    setMenuPopup({
      open: true,
      row: t,
      position: { top: rect.bottom + 6, left: Math.max(10, rect.left - 80) },
    });
  };

  const closeMenuPopup = () => {
    setMenuPopup({ open: false, row: null, position: { top: 0, left: 0 } });
  };

  const handleView = (t) => {
    closeMenuPopup();
    if (t.kind === "sale" && t.ref_no) {
      navigate(`/invoice/${t.ref_no}`);
    }
  };

  const handleEdit = (t) => {
    closeMenuPopup();
    switch (t.kind) {
      case "sale":
        if (t.ref_no) navigate(`/sales/edit/${t.ref_no}`);
        break;
      case "sales_return":
        if (t.id) navigate(`/sales/credit-note/edit/${t.id}`);
        break;
      case "purchase":
      case "payment":
        if (t.id) navigate(`/purchases/edit/${t.id}`);
        break;
      default:
        break;
    }
  };

  const buildTransactionElement = (t) => {
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
    return el;
  };

  const shareViaWhatsApp = async (t) => {
    if (whatsappSending) return;
    setWhatsappSending(true);
    closeSharePopup();

    const partyName = summary.party_name || selectedParty?.name || "Party";
    const phone = selectedParty?.phone || "";

    try {
      if (t.kind === "sale" && t.ref_no) {
        const el = buildTransactionElement(t);
        document.body.appendChild(el);
        el.style.position = "absolute";
        el.style.left = "-9999px";
        el.style.top = "0";

        try {
          const pdfBase64 = await generateInvoicePdfBase64({ element: el, invoiceNo: t.ref_no, isPOS: false });
          const res = await api.post("/whatsapp/send_invoice", {
            company_id: companyId,
            invoice_no: t.ref_no,
            phone: phone,
            pdf_base64: pdfBase64,
            filename: `${t.ref_no}.pdf`,
          });
          showToast(res.data?.message || "Invoice sent via WhatsApp!", "success");
        } catch {
          const fallbackMsg = encodeURIComponent(
            `Party Statement — ${partyName}\nInvoice: ${t.ref_no}\nDate: ${t.date || "-"}\nTotal: ${fmtINR(t.total)}\nReceivable: ${fmtINR(t.receivable_bal)}`
          );
          window.open(`https://wa.me/${phone}?text=${fallbackMsg}`, "_blank");
        } finally {
          el.remove();
        }
      } else {
        const message = encodeURIComponent(
          `Party Statement — ${partyName}\nType: ${t.txn_type || "-"}\nRef: ${t.ref_no || "-"}\nDate: ${t.date || "-"}\nTotal: ${fmtINR(t.total)}\nReceivable: ${fmtINR(t.receivable_bal)}`
        );
        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
      }
    } catch {
      const fallbackMsg = encodeURIComponent(
        `Party Statement — ${partyName}\nType: ${t.txn_type || "-"}\nRef: ${t.ref_no || "-"}\nDate: ${t.date || "-"}\nTotal: ${fmtINR(t.total)}`
      );
      window.open(`https://wa.me/${phone}?text=${fallbackMsg}`, "_blank");
    } finally {
      setWhatsappSending(false);
    }
  };

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
      showToast("Excel exported successfully.", "success");
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════
          1. TOP FILTER SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Period selector */}
          <div ref={periodRef} className="relative">
            <button
              onClick={() => { setPeriodOpen((v) => !v); setPartyOpen(false); }}
              className="inline-flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <Calendar size={14} className="text-indigo-600" />
              <span>{periodLabel}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                {TIME_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePeriodSelect(p.value)}
                    className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                      p.value === period
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Between</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => { setStartDate(parseDateISO(e.target.value)); setPeriod("custom"); }}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-400">To</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => { setEndDate(parseDateISO(e.target.value)); setPeriod("custom"); }}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            />
          </div>

          {/* Party Selector Dropdown */}
          <div ref={partyRef} className="relative min-w-[220px]">
            <button
              onClick={() => { setPartyOpen((v) => !v); setPeriodOpen(false); }}
              className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200/80 rounded-xl hover:bg-slate-100 transition shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <Users size={14} className="text-indigo-600 flex-shrink-0" />
                <span className={selectedParty ? "text-slate-800 font-bold truncate" : "text-slate-400 font-normal"}>
                  {selectedParty ? selectedParty.name : "Select Party"}
                </span>
              </div>
              {selectedParty ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); setSelectedParty(null); setPartyQuery(""); }}
                  className="text-slate-400 hover:text-rose-600 transition p-0.5"
                >
                  <X size={14} />
                </span>
              ) : (
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-150 ${partyOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {partyOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={partyQuery}
                      onChange={(e) => setPartyQuery(e.target.value)}
                      placeholder="Search party..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto p-1 divide-y divide-slate-50">
                  {parties.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 text-xs font-medium">
                      No parties found.
                    </div>
                  ) : (
                    parties
                      .filter((p) => !partyQuery || (p.name || "").toLowerCase().includes(partyQuery.toLowerCase()))
                      .map((p) => (
                        <button
                          key={`${p.role}-${p.id}`}
                          onClick={() => selectParty(p)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between rounded-lg transition-colors ${
                            selectedParty?.id === p.id && selectedParty?.role === p.role
                              ? "bg-indigo-50 text-indigo-700 font-bold"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span className="truncate pr-2 font-medium">{p.name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                            p.role === "customer"
                              ? "bg-blue-50 text-blue-700 border-blue-200/80"
                              : "bg-purple-50 text-purple-700 border-purple-200/80"
                          }`}>
                            {p.role === "customer" ? "Customer" : "Supplier"}
                          </span>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 transition-all shadow-2xs"
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. KPI SUMMARY CARDS RIBBON
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Sale */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Sale</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{fmtINR(summary.total_sale)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Sale net of returns</div>
          </div>
        </div>

        {/* Money-In */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Money-In</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-emerald-600">{fmtINR(summary.total_money_in)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Payments received</div>
          </div>
        </div>

        {/* Total Purchase */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Purchase</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <TrendingDown size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{fmtINR(summary.total_purchase)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Purchases net of returns</div>
          </div>
        </div>

        {/* Money-Out */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Money-Out</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-rose-600">{fmtINR(summary.total_money_out)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Payments made</div>
          </div>
        </div>

        {/* Receivable / Payable */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-900">
              {summary.party_role === "supplier" ? "Total Payable" : "Total Receivable"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Wallet size={16} />
            </div>
          </div>
          <div>
            <div className={`text-xl md:text-2xl font-black ${summary.party_role === "supplier" ? "text-rose-600" : "text-indigo-600"}`}>
              {fmtINR(summary.party_role === "supplier" ? summary.total_payable : summary.total_receivable)}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Net balance outstanding
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. TRANSACTION TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={`px-4 py-3.5 ${col.align === "right" ? "text-right" : "text-left"}`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.align === "right" ? "justify-end w-full" : ""}`}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSort(col.key); }}
                          className="text-slate-400 hover:text-slate-600 transition"
                        >
                          {sortCol === col.key ? (
                            sortDir === "asc" ? <ArrowUp size={12} className="text-indigo-600" /> : <ArrowDown size={12} className="text-indigo-600" />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </button>
                      )}
                      {col.filterable && (
                        <div className="relative" data-filter-box>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFilterOpen(filterOpen === col.key ? null : col.key); }}
                            className={`transition ${filterOpen === col.key || colText[col.key] ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            <Filter size={12} />
                          </button>
                          {filterOpen === col.key && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute top-full left-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-2.5 z-50 normal-case tracking-normal"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={colText[col.key] || ""}
                                onChange={(e) => setColText((p) => ({ ...p, [col.key]: e.target.value }))}
                                placeholder={`Filter ${col.label.toLowerCase()}...`}
                                className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3.5 text-center w-24">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading statement transactions...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-rose-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={28} className="text-rose-500" />
                      <span className="font-semibold">{error}</span>
                    </div>
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No transactions to show</div>
                      <div className="text-xs text-slate-400">Select a party and date range above to view account statement.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((t, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">{t.date || "-"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase border ${getTxnBadgeClasses(t.txn_type)}`}>
                        {t.txn_type || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{t.ref_no || "-"}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">{fmtINR(t.total)}</td>
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                      Number(t.received) > 0 ? "text-emerald-600" : Number(t.paid) > 0 ? "text-rose-600" : "text-slate-400"
                    }`}>
                      {fmtINR(Number(t.received) || Number(t.paid))}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">{fmtINR(t.txn_balance)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{fmtINR(t.receivable_bal)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap">{fmtINR(t.payable_bal)}</td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => printSingleRow(t)}
                          title="Print Entry"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          data-share-btn
                          onClick={(e) => handleShareClick(t, e)}
                          title="Share Entry"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          data-menu-btn
                          onClick={(e) => handleMenuClick(t, e)}
                          title="Options"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modern Universal Pagination */}
        <ReportPagination
          total={totalRows}
          page={safePage}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(1); }}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
           SHARE POPUP (WhatsApp)
          ═══════════════════════════════════════════════════════════════ */}
      {sharePopup.open &&
        sharePopup.row &&
        createPortal(
          <div
            ref={sharePopupRef}
            style={{
              position: "fixed",
              top: sharePopup.position.top,
              left: sharePopup.position.left,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-2 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={() => shareViaWhatsApp(sharePopup.row)}
              disabled={whatsappSending}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition w-full disabled:opacity-50"
            >
              <SiWhatsapp size={18} className="text-[#25D366]" />
              <span>WhatsApp</span>
            </button>
          </div>,
          document.body
        )}

      {/* ═══════════════════════════════════════════════════════════════
           ROW MENU POPUP (View / Edit)
          ═══════════════════════════════════════════════════════════════ */}
      {menuPopup.open &&
        menuPopup.row &&
        createPortal(
          <div
            ref={menuPopupRef}
            style={{
              position: "fixed",
              top: menuPopup.position.top,
              left: menuPopup.position.left,
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 w-32 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={() => handleView(menuPopup.row)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              <Eye size={13} className="text-slate-400" />
              <span>View</span>
            </button>
            <button
              onClick={() => handleEdit(menuPopup.row)}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition"
            >
              <Edit2 size={13} className="text-slate-400" />
              <span>Edit</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
}
