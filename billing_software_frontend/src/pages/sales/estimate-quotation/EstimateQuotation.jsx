import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Printer,
  Share2,
  MoreVertical,
  Filter,
  Eye,
  Trash2,
  AlertTriangle,
  X,
  FileText,
  Pencil,
  User,
  MapPin,
  Layers,
  IndianRupee,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Quotation creation date" },
  { key: "ref_no", label: "Ref No", icon: FileText, color: "text-blue-600", bg: "bg-blue-50", desc: "Quotation reference number" },
  { key: "party_name", label: "Party Name", icon: User, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Client or customer name" },
  { key: "state", label: "State", icon: MapPin, color: "text-purple-600", bg: "bg-purple-50", desc: "Place of supply" },
  { key: "items", label: "Items", icon: Layers, color: "text-amber-600", bg: "bg-amber-50", desc: "Number of line items" },
  { key: "amount", label: "Amount", icon: IndianRupee, color: "text-teal-600", bg: "bg-teal-50", desc: "Total quotation value" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-cyan-600", bg: "bg-cyan-50", desc: "Open or Converted status" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "Print, Convert & Delete" },
];

const PERIOD_LABELS = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom",
};

export default function EstimateQuotation() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "admin" ? user?.id : user?.admin_id;

  // Table columns management
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("estimate_columns", DEFAULT_COLUMNS);

  // Header filters
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [docType, setDocType] = useState("Estimate");
  const [typeOpen, setTypeOpen] = useState(false);
  const docTypeOptions = ["Estimate", "Quotation"];
  const typeRef = useRef(null);

  // Search & view
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Actions & Modals
  const [actionToast, setActionToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
  const menuRef = useRef(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const ESTIMATE_STORAGE_KEY = "saved_estimates";

  const getSavedEstimates = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(ESTIMATE_STORAGE_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, []);

  const [estimates, setEstimates] = useState(getSavedEstimates);

  // Refresh estimates when list re-focuses
  useEffect(() => {
    const refresh = () => setEstimates(getSavedEstimates());
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [getSavedEstimates]);

  const handleDeleteEstimate = (id) => {
    try {
      const saved = JSON.parse(localStorage.getItem(ESTIMATE_STORAGE_KEY) || "[]");
      const next = (Array.isArray(saved) ? saved : []).filter((e) => String(e.id) !== String(id));
      localStorage.setItem(ESTIMATE_STORAGE_KEY, JSON.stringify(next));
      setEstimates(next);
      setDeleteTarget(null);
      setActionToast("Estimate deleted.");
      setTimeout(() => setActionToast(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  };

  const formatYMD = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Compute the date range for a given period
  const getPeriodRange = (p) => {
    const now = new Date();
    let start;
    let end;

    switch (p) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.getFullYear(), now.getMonth(), diff);
        end = new Date();
        break;
      }
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        start = null;
        end = null;
    }

    return { start, end };
  };

  // Date range
  const initialRange = getPeriodRange("this_month");
  const [fromDate, setFromDate] = useState(initialRange.start ? formatYMD(initialRange.start) : "");
  const [toDate, setToDate] = useState(initialRange.end ? formatYMD(initialRange.end) : "");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const applyPeriod = (p) => {
    const { start, end } = getPeriodRange(p);
    setFromDate(start ? formatYMD(start) : "");
    setToDate(end ? formatYMD(end) : "");
    setShowDatePicker(false);
  };

  // Fetch firms
  useEffect(() => {
    if (!adminId) return;
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (res.data.status) setCompanies(res.data.data);
      })
      .catch(console.error);
  }, [adminId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenuId(null);
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Print a single estimate in a printable window
  const printEstimate = (est) => {
    if (!est) return;
    const rowsHtml = (Array.isArray(est.rows) ? est.rows : [])
      .map(
        (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.item || "-"}</td>
            <td>${r.qty || 0}</td>
            <td>${r.unit || ""}</td>
            <td>${formatCurrency(r.price)}</td>
            <td>${formatCurrency(r.discount_amt)}</td>
            <td>${r.tax_rate || 0}%</td>
            <td>${formatCurrency(r.amount)}</td>
          </tr>`
      )
      .join("");
    const termsHtml = est.termsText
      ? `<p style="font-size:12px;margin-top:14px;border-top:1px solid #e2e8f0;padding-top:8px;"><strong>Terms &amp; Conditions:</strong><br/>${est.termsText}</p>`
      : "";
    const win = window.open("", "_blank", "width=880,height=720");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Estimate #${est.refNo}</title>
          <style>
            body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:36px;}
            h1{font-size:22px;margin:0 0 2px;}
            .muted{color:#64748b;font-size:12px;}
            table{width:100%;border-collapse:collapse;font-size:12px;margin-top:18px;}
            th{background:#f1f5f9;text-align:left;padding:7px 8px;border:1px solid #e2e8f0;}
            td{padding:7px 8px;border:1px solid #e2e8f0;}
            .right{text-align:right;}
            .total-row td{font-weight:700;}
            .totals{margin-top:14px;margin-left:auto;width:280px;font-size:12px;}
            .totals div{display:flex;justify-content:space-between;padding:3px 0;}
            .totals .grand{font-size:14px;font-weight:800;border-top:2px solid #0f172a;margin-top:4px;padding-top:8px;}
            .brand{display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:16px;}
          </style>
        </head>
        <body>
          <div class="brand">
            <div>
              <h1>Estimate / Quotation</h1>
              <div class="muted">Ref No. #${est.refNo}</div>
            </div>
            <div class="right muted">
              <div>Invoice Date: ${formatDateDMY(est.invoiceDate)}</div>
              <div>State of Supply: ${est.stateOfSupply || "-"}</div>
            </div>
          </div>
          <div class="muted"><strong style="color:#0f172a;">Customer:</strong> ${est.customer_name || "-"}${est.customer_phone ? ` &nbsp;(${est.customer_phone})` : ""}</div>
          <table>
            <thead>
              <tr><th>#</th><th>ITEM</th><th>QTY</th><th>UNIT</th><th class="right">PRICE/UNIT</th><th class="right">DISCOUNT</th><th class="right">TAX</th><th class="right">AMOUNT</th></tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal</span><span>${formatCurrency(est.subtotal)}</span></div>
            <div><span>Discount</span><span>${formatCurrency(est.discount_total)}</span></div>
            <div><span>Tax</span><span>${formatCurrency(est.tax_total)}</span></div>
            <div><span>Round Off</span><span>${formatCurrency(est.round_off)}</span></div>
            <div class="grand"><span>Total</span><span>${formatCurrency(est.total_amount)}</span></div>
          </div>
          ${termsHtml}
        </body>
      </html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const handleAddEstimate = () => navigate("/sales/estimate-quotation/add");

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Estimates filtered by current date range, firm & search
  const filteredEstimates = useMemo(() => {
    return estimates.filter((e) => {
      if (fromDate && e.invoiceDate && new Date(e.invoiceDate) < new Date(fromDate)) return false;
      if (toDate && e.invoiceDate && new Date(e.invoiceDate) > new Date(toDate)) return false;
      if (selectedFirm !== "all" && String(e.company_id) !== String(selectedFirm)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(e.refNo || e.id || "").toLowerCase();
        const cust = String(e.customer_name || "").toLowerCase();
        const phone = String(e.customer_phone || "").toLowerCase();
        const amt = String(e.total_amount || "").toLowerCase();
        if (!refNo.includes(q) && !cust.includes(q) && !phone.includes(q) && !amt.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [estimates, fromDate, toDate, selectedFirm, searchQuery]);

  const summaryTotals = useMemo(() => {
    let total = 0;
    let converted = 0;
    let open = 0;
    filteredEstimates.forEach((e) => {
      const amt = parseFloat(e.total_amount || 0);
      total += amt;
      if (e.status === "converted") converted += amt;
      else open += amt;
    });
    return { count: filteredEstimates.length, total, converted, open };
  }, [filteredEstimates]);

  // % change vs last month
  const lastMonthTotal = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return estimates.reduce((acc, e) => {
      if (!e.invoiceDate) return acc;
      const d = new Date(e.invoiceDate);
      return d >= start && d <= end ? acc + (parseFloat(e.total_amount) || 0) : acc;
    }, 0);
  }, [estimates]);
  const pctChange = lastMonthTotal > 0 ? ((summaryTotals.total - lastMonthTotal) / lastMonthTotal) * 100 : 0;

  // Pagination calculation
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFirm, fromDate, toDate, period]);

  const totalPages = Math.ceil(filteredEstimates.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedEstimates = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredEstimates.slice(start, start + rowsPerPage);
  }, [filteredEstimates, safePage, rowsPerPage]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredEstimates.length === 0) {
      alert("No data available to export.");
      return;
    }
    const dataToExport = filteredEstimates.map((est, index) => ({
      "S.No": index + 1,
      "Ref No": est.refNo || est.id || "-",
      "Date": formatDateDMY(est.invoiceDate),
      "Customer Name": est.customer_name || "Cash / Walk-in",
      "Customer Phone": est.customer_phone || "-",
      "State": est.stateOfSupply || "-",
      "Items Count": Array.isArray(est.rows) ? est.rows.length : 0,
      "Total Amount": parseFloat(est.total_amount || 0),
      "Status": est.status || "Open",
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estimates_Quotations");
    XLSX.writeFile(wb, `Estimates_Quotations_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ── 1. TOP HEADER ROW: Title + Add Estimate ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-2 select-none">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{docType}/Quotation</h1>
          <div ref={typeRef} className="relative">
            <button
              onClick={() => setTypeOpen((v) => !v)}
              className="flex items-center justify-center w-6 h-6 rounded-full hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Switch document type"
            >
              <ChevronDown size={16} className={`transition-transform ${typeOpen ? "rotate-180" : ""}`} />
            </button>
            {typeOpen && (
              <div className="absolute left-0 top-7 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                {docTypeOptions.map((t) => (
                  <div
                    key={t}
                    onClick={() => { setDocType(t); setTypeOpen(false); }}
                    className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                      docType === t ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleAddEstimate}
            className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add {docType}</span>
          </button>

          <HeaderSettingsButton
            variant="list"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* ── 2. FILTER ROW ── */}
      <div className="flex flex-wrap items-center gap-2.5 py-4 text-xs">
        <span className="font-semibold text-slate-500 mr-1">Filter by :</span>

        {/* Period Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>{PERIOD_LABELS[period] || "This Month"}</span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
          </button>
          {periodOpen && (
            <div className="absolute left-0 top-9 w-36 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <div
                  key={key}
                  onClick={() => {
                    setPeriod(key);
                    setPeriodOpen(false);
                    if (key === "custom") setShowDatePicker(true);
                    else applyPeriod(key);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                    period === key ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date Range Pill + Custom Picker */}
        <div
          onClick={() => setShowDatePicker((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-sky-50/50 hover:bg-sky-100/50 text-slate-700 font-medium rounded-full border border-sky-100/80 transition cursor-pointer select-none"
        >
          <Calendar size={14} className="text-slate-500" />
          <span>
            {fromDate ? formatDateDMY(fromDate) : "01/09/2026"} To {toDate ? formatDateDMY(toDate) : "30/09/2026"}
          </span>
        </div>

        {showDatePicker && (
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs text-slate-700 outline-none"
            />
            <span className="text-slate-400">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs text-slate-700 outline-none"
            />
          </div>
        )}

        {/* Firms Dropdown Pill */}
        <div className="relative">
          <button
            onClick={() => setFirmOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-50/80 hover:bg-sky-100/70 text-slate-700 font-semibold rounded-full border border-sky-100 transition cursor-pointer"
          >
            <span>
              {selectedFirm === "all"
                ? "All Firms"
                : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
            </span>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
          </button>
          {firmOpen && (
            <div className="absolute left-0 top-9 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div
                onClick={() => { setSelectedFirm("all"); setFirmOpen(false); }}
                className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                  selectedFirm === "all" ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                All Firms
              </div>
              {companies.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedFirm(String(c.id)); setFirmOpen(false); }}
                  className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition ${
                    selectedFirm === String(c.id) ? "bg-blue-50 text-blue-600 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {c.company_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 3. SUMMARY KPI CARD (Matching Sale Invoice design) ── */}
      <div className="my-2">
        <div className="bg-white border border-purple-200/90 rounded-2xl p-4 w-72 sm:w-80 shadow-2xs">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Quotations</span>
            <div className="flex flex-col items-end">
              <span className={`inline-flex items-center text-[11px] font-extrabold ${pctChange >= 0 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-rose-600 bg-rose-50 border-rose-200"} px-2 py-0.5 rounded-md border`}>
                {pctChange >= 0 ? `+${pctChange.toFixed(0)}%` : `${pctChange.toFixed(0)}%`} ↗
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">vs last month</span>
            </div>
          </div>

          <div className="text-2xl font-black text-slate-900 my-1 tracking-tight">
            {formatCurrency(summaryTotals.total)}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
            <span>
              Converted: <strong className="text-slate-800 font-bold">{formatCurrency(summaryTotals.converted)}</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Open: <strong className="text-slate-800 font-bold">{formatCurrency(summaryTotals.open)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS SECTION: Header + Action Icons + Table ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs mt-6 overflow-hidden">
        
        {/* Transactions Section Top Row */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Transactions</h2>

          {/* Action Icons: Search, Excel, Print */}
          <div className="flex items-center gap-2">
            {/* Inline Search Toggle */}
            {showSearchInput ? (
              <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full text-xs animate-in fade-in duration-150">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Search estimate, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="bg-transparent text-xs text-slate-700 outline-none w-44"
                />
                <button
                  onClick={() => { setShowSearchInput(false); setSearchQuery(""); }}
                  className="text-slate-400 hover:text-slate-600 ml-1 text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Search Transactions"
              >
                <Search size={17} />
              </button>
            )}

            {/* Excel Badge Export Button */}
            <button
              onClick={handleExportExcel}
              className="w-8 h-8 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
              title="Export to Excel (.xlsx)"
            >
              <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded leading-none shadow-2xs">
                xls
              </span>
            </button>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              title="Print Table"
            >
              <Printer size={17} />
            </button>
          </div>
        </div>

        {/* Transactions Table with Vertical Grid Lines */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold select-none">
                {visibleColumns.date && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Date
                  </th>
                )}
                {visibleColumns.ref_no && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Ref No
                  </th>
                )}
                {visibleColumns.party_name && (
                  <th className="py-3 px-4 border-r border-slate-200 whitespace-nowrap">
                    Party Name
                  </th>
                )}
                {visibleColumns.state && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    State
                  </th>
                )}
                {visibleColumns.items && (
                  <th className="py-3 px-3.5 border-r border-slate-200 text-center whitespace-nowrap">
                    Items
                  </th>
                )}
                {visibleColumns.amount && (
                  <th className="py-3 px-4 border-r border-slate-200 text-right whitespace-nowrap">
                    Amount
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="py-3 px-3.5 border-r border-slate-200 whitespace-nowrap">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Actions</th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredEstimates.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-500">No transactions to show</p>
                    <p className="text-xs text-slate-400 mt-1">You haven&apos;t added any transactions yet.</p>
                  </td>
                </tr>
              ) : (
                paginatedEstimates.map((est, idx) => {
                  const isConverted = est.status === "converted";
                  const isMenuOpen = activeMenuId === est.id;

                  return (
                    <tr
                      key={est.id || idx}
                      className="group hover:bg-[#eaedf2] transition-colors duration-150 text-slate-700 cursor-pointer"
                      onClick={() => printEstimate(est)}
                    >
                      {/* Date */}
                      {visibleColumns.date && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-slate-600 group-hover:text-slate-900 whitespace-nowrap">
                          {formatDateDMY(est.invoiceDate)}
                        </td>
                      )}

                      {/* Ref No */}
                      {visibleColumns.ref_no && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 font-medium group-hover:font-bold text-blue-600 group-hover:text-blue-800 whitespace-nowrap">
                          #{est.refNo || est.id}
                        </td>
                      )}

                      {/* Party Name */}
                      {visibleColumns.party_name && (
                        <td className="py-3.5 px-4 border-r border-slate-200 font-medium group-hover:font-bold text-slate-800 group-hover:text-slate-950 whitespace-nowrap">
                          <div>{est.customer_name || "Cash / Walk-in"}</div>
                          {est.customer_phone && (
                            <div className="text-[10px] text-slate-400">{est.customer_phone}</div>
                          )}
                        </td>
                      )}

                      {/* State */}
                      {visibleColumns.state && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 text-slate-600 group-hover:text-slate-900 font-medium whitespace-nowrap">
                          {est.stateOfSupply || "-"}
                        </td>
                      )}

                      {/* Items */}
                      {visibleColumns.items && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {Array.isArray(est.rows) ? est.rows.length : 0}
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-3.5 px-4 border-r border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(est.total_amount)}
                        </td>
                      )}

                      {/* Status */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-3.5 border-r border-slate-200 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wide border ${
                              isConverted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                            }`}
                          >
                            {est.status || "open"}
                          </span>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Print Icon Button */}
                          <button
                            onClick={() => printEstimate(est)}
                            className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                            title="Print"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share with Popover */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveShareId(activeShareId === est.id ? null : est.id);
                              }}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="Share"
                            >
                              <Share2 size={15} />
                            </button>
                            <ShareTransactionPopover
                              isOpen={activeShareId === est.id}
                              onClose={() => setActiveShareId(null)}
                              transaction={{
                                refNo: est.refNo,
                                customer_name: est.customer_name,
                                customer_phone: est.customer_phone,
                                date: est.invoiceDate,
                                total_amount: est.total_amount,
                                payment_type: "Estimate",
                              }}
                              type="Estimate"
                            />
                          </div>

                          {/* 3-Dot More Menu */}
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenuId(isMenuOpen ? null : est.id)}
                              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                              title="More actions"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-0 top-8 w-38 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    navigate(`/sales/estimate-quotation/add/${est.id}`);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition text-left cursor-pointer"
                                >
                                  <Pencil size={14} className="text-blue-600" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    printEstimate(est);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition text-left cursor-pointer"
                                >
                                  <Eye size={14} />
                                  <span>View</span>
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setDeleteTarget(est);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition text-left cursor-pointer"
                                >
                                  <Trash2 size={14} className="text-red-600" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* ── PAGINATION BAR ── */}
          {filteredEstimates.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-200 text-xs text-slate-600 bg-white">
              <div className="flex items-center gap-4">
                <span>
                  Showing <strong className="font-semibold text-slate-800">{(safePage - 1) * rowsPerPage + 1}</strong> to{" "}
                  <strong className="font-semibold text-slate-800">{Math.min(safePage * rowsPerPage, filteredEstimates.length)}</strong> of{" "}
                  <strong className="font-semibold text-slate-800">{filteredEstimates.length}</strong> quotations
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Rows:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white text-slate-700 outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce((acc, p, i, arr) => {
                    if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "..." ? (
                      <span key={`dots-${i}`} className="px-2 text-slate-400 font-bold">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium text-xs transition cursor-pointer ${
                          safePage === item
                            ? "bg-blue-600 text-white font-bold shadow-sm"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  type="button"
                  disabled={safePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={22} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Estimate?</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Are you sure you want to permanently delete quotation <strong className="font-semibold text-slate-800">#{deleteTarget.refNo || deleteTarget.id}</strong> for <strong className="font-semibold text-slate-800">{deleteTarget.customer_name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEstimate(deleteTarget.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTION TOAST ── */}
      {actionToast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[99999] px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-200">
          {actionToast}
        </div>
      )}

      {/* ── COLUMN SETTINGS DRAWER ── */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Table Columns"
        subtitle="Show or hide columns in your quotations list"
      />
    </div>
  );
}