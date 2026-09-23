import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import {
  Plus,
  ChevronDown,
  Calendar,
  FileText,
  TrendingUp,
  X,
  Eye,
  Trash2,
  Printer,
  Share2,
  MoreVertical,
  Pencil,
} from "lucide-react";
import TableActions from "../../../components/ui/TableActions";

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
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

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

  // Refresh estimates when list re-focuses (e.g. after saving from form)
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

  // Date range (defaults to current month)
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
      if (e.target.closest("[data-more-trigger]")) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAnchor(null);
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

  // Share estimate summary via WhatsApp
  const shareEstimate = (est) => {
    if (!est) return;
    const text = `*Estimate #${est.refNo}*\nCustomer: ${est.customer_name || "-"}\nDate: ${formatDateDMY(est.invoiceDate)}\nTotal: ${formatCurrency(est.total_amount)}\n`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleAddEstimate = () => navigate("/sales/estimate-quotation/add");

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Estimates filtered by current date range & firm
  const filteredEstimates = useMemo(() => {
    if (!estimates.length) return [];
    return estimates.filter((e) => {
      if (fromDate && e.invoiceDate && new Date(e.invoiceDate) < new Date(fromDate)) return false;
      if (toDate && e.invoiceDate && new Date(e.invoiceDate) > new Date(toDate)) return false;
      if (selectedFirm !== "all" && String(e.company_id) !== String(selectedFirm)) return false;
      return true;
    });
  }, [estimates, fromDate, toDate, selectedFirm]);

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

  return (
    <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. TOP HEADER: Title + Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 select-none">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-indigo-100 ring-4 ring-indigo-50/50">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {docType}s &amp; Quotations
              </h1>
              <div ref={typeRef} className="relative">
                <button
                  onClick={() => setTypeOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                  title="Switch document type"
                >
                  <span>{docType}</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${typeOpen ? "rotate-180" : ""}`} />
                </button>
                {typeOpen && (
                  <div className="absolute left-0 top-8 w-44 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                    {docTypeOptions.map((t) => (
                      <div
                        key={t}
                        onClick={() => { setDocType(t); setTypeOpen(false); }}
                        className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition flex items-center justify-between ${
                          docType === t ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{t}</span>
                        {docType === t && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage, print, and track all sales estimates and quotation proposals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddEstimate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>Create {docType}</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC KPI CARDS (PaySplitX 4-Card Strip) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Value */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Value</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(summaryTotals.total)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              ₹
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>{summaryTotals.count} Total quotes</span>
            <span className={`inline-flex items-center gap-1 font-bold ${pctChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
              {pctChange.toFixed(0)}% <TrendingUp size={13} />
            </span>
          </div>
        </div>

        {/* Card 2: Converted Quotes */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Converted to Sale</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1 tracking-tight">
                {formatCurrency(summaryTotals.converted)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Eye size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Fulfilled proposals</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {summaryTotals.total > 0 ? `${Math.round((summaryTotals.converted / summaryTotals.total) * 100)}%` : "0%"} rate
            </span>
          </div>
        </div>

        {/* Card 3: Open / Pending */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Open / Pending</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1 tracking-tight">
                {formatCurrency(summaryTotals.open)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Awaiting confirmation</span>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Follow-up ready
            </span>
          </div>
        </div>

        {/* Card 4: Average Quote Size */}
        <div className="relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Quote</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(summaryTotals.count > 0 ? summaryTotals.total / summaryTotals.count : 0)}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              Avg
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Per document size</span>
            <span className="text-[11px] font-semibold text-slate-600">Active period</span>
          </div>
        </div>
      </div>

      {/* ── 3. FILTER TOOLBAR & DATE SELECTORS ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>

          {/* Period Pill Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>{PERIOD_LABELS[period] || "This Month"}</span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute left-0 top-9 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setPeriod(key);
                      setPeriodOpen(false);
                      if (key === "custom") setShowDatePicker(true);
                      else applyPeriod(key);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-medium cursor-pointer transition ${
                      period === key ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Date Range Button + Custom Picker */}
          <div
            onClick={() => setShowDatePicker((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer select-none"
          >
            <Calendar size={13} className="text-slate-400" />
            <span>
              {fromDate ? formatDateDMY(fromDate) : "Start"} — {toDate ? formatDateDMY(toDate) : "End"}
            </span>
          </div>

          {showDatePicker && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-sm text-xs">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs text-slate-700 outline-none font-medium"
              />
              <span className="text-slate-400 font-bold">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs text-slate-700 outline-none font-medium"
              />
            </div>
          )}

          {/* Firms Dropdown Pill */}
          <div className="relative">
            <button
              onClick={() => setFirmOpen((v) => !v)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <span>
                {selectedFirm === "all"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
              </span>
              <ChevronDown size={13} className={`text-slate-400 transition-transform ${firmOpen ? "rotate-180" : ""}`} />
            </button>
            {firmOpen && (
              <div className="absolute left-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div
                  onClick={() => { setSelectedFirm("all"); setFirmOpen(false); }}
                  className={`px-3.5 py-2 text-xs font-semibold cursor-pointer transition ${
                    selectedFirm === "all" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  All Firms
                </div>
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedFirm(String(c.id)); setFirmOpen(false); }}
                    className={`px-3.5 py-2 text-xs font-medium cursor-pointer transition ${
                      selectedFirm === String(c.id) ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {c.company_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            {filteredEstimates.length} records
          </span>
        </div>
      </div>

      {/* ── 4. DIRECTORY TABLE CARD ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No {docType.toLowerCase()}s found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mb-6">
              There are no {docType.toLowerCase()}s matching the selected filters or date range.
            </p>
            <button
              onClick={handleAddEstimate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition hover:from-indigo-700 hover:to-indigo-800 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>Create New {docType}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-max">
              <thead>
                <tr className="border-b border-slate-200/80 bg-[#fbfcfd] text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3.5 px-4">Ref&nbsp;No</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">State</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredEstimates.map((est) => (
                  <tr key={est.id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-indigo-600">
                      #{est.refNo || est.id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{formatDateDMY(est.invoiceDate)}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{est.customer_name}</div>
                      {est.customer_phone && <div className="text-[11px] text-slate-400 font-normal">{est.customer_phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{est.stateOfSupply || "-"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        {Array.isArray(est.rows) ? est.rows.length : 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatCurrency(est.total_amount)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          est.status === "converted"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${est.status === "converted" ? "bg-emerald-600" : "bg-indigo-600"}`} />
                        {est.status || "open"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <TableActions
                        onPrint={() => printEstimate(est)}
                        printTitle="Print Quotation"
                        shareTransaction={{
                          refNo: est.refNo,
                          customer_name: est.customer_name,
                          customer_phone: est.customer_phone,
                          date: est.invoiceDate,
                          total_amount: est.total_amount,
                          payment_type: "Estimate",
                        }}
                        shareType="Estimate"
                        onViewInvoice={() => printEstimate(est)}
                        viewInvoiceLabel="View Invoice"
                        menuItems={[
                          {
                            label: "Edit",
                            icon: Pencil,
                            onClick: () => navigate(`/sales/estimate-quotation/add/${est.id}`),
                          },
                          {
                            label: "View Invoice",
                            icon: Eye,
                            onClick: () => printEstimate(est),
                          },
                          { isDivider: true },
                          {
                            label: "Delete",
                            icon: Trash2,
                            isDanger: true,
                            onClick: () => setDeleteTarget(est),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. DELETE CONFIRM MODAL ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Delete Estimate?</h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-slate-500 leading-relaxed">
                You are about to permanently delete{" "}
                <span className="font-bold text-slate-700">#{deleteTarget.refNo || deleteTarget.id}</span> for{" "}
                <span className="font-bold text-slate-700">{deleteTarget.customer_name}</span>. This action cannot be
                undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteEstimate(deleteTarget.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition cursor-pointer"
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
    </div>
  );
}