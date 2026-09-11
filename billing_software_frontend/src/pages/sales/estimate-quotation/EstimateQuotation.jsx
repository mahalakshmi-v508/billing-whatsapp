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

  // Header title switcher (Estimate / Quotation / Proforma)
  const [docType, setDocType] = useState("Estimate");
  const [typeOpen, setTypeOpen] = useState(false);
  const typeRef = useRef(null);
  const docTypeOptions = ["Estimate", "Quotation", "Proforma", "Sale Order"];

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [companies, setCompanies] = useState([]);

  // Saved estimates (localStorage persistence)
  const [actionToast, setActionToast] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null); // { id, x, y } for the fixed 3-dot popup
  const menuRef = useRef(null);

  const MORE_MENU_WIDTH = 176;

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

  // Close the 3-dot menu when the page scrolls so it never floats away
  useEffect(() => {
    const onScroll = () => setMenuAnchor(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);

  // Open the Canva-style popup fixed to the clicked 3-dot button
  const toggleMoreMenu = (e, est) => {
    if (menuAnchor && menuAnchor.id === est.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    let left = rect.right - MORE_MENU_WIDTH;
    if (left < 12) left = 12;
    setMenuAnchor({ id: est.id, x: left, y: rect.bottom + 6 });
  };

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

        <button
          onClick={handleAddEstimate}
          className="flex items-center gap-1.5 px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm rounded-full shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.8} />
          <span>Add {docType}</span>
        </button>
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

      {/* ── 3. SUMMARY CARD ── */}
      <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-100 rounded-2xl p-5 shadow-sm max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quotations</span>
            <div className="text-3xl font-bold text-slate-800 mt-1.5">
              {formatCurrency(summaryTotals.total)}
              <span className="text-xs font-semibold text-slate-400 ml-2 normal-case">({summaryTotals.count} {summaryTotals.count === 1 ? "estimate" : "estimates"})</span>
            </div>
            <div className="mt-3 text-xs text-slate-500 font-medium border-t border-purple-100/70 pt-3">
              <span>Converted: <span className="font-bold text-emerald-600">{formatCurrency(summaryTotals.converted)}</span></span>
              <span className="mx-2 text-slate-300">|</span>
              <span>Open: <span className="font-bold text-purple-600">{formatCurrency(summaryTotals.open)}</span></span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className={`inline-flex items-center gap-1 text-sm font-bold ${pctChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {pctChange.toFixed(0)}%
              <TrendingUp size={15} />
            </span>
            <span className="text-xs text-slate-400 mt-0.5">vs last month</span>
          </div>
        </div>
      </div>

      {/* ── 4. LIST / EMPTY STATE ── */}
      {filteredEstimates.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div className="text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-purple-50 border border-purple-100/80 flex items-center justify-center mb-5">
              <FileText size={36} className="text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No Transactions to show</h3>
            <p className="text-sm text-slate-400 mb-6">You haven&apos;t added any transactions yet.</p>
            <button
              onClick={handleAddEstimate}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold text-sm rounded-full shadow-sm hover:shadow transition transform active:scale-95 cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span>Add {docType}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs min-w-max">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] tracking-wide">
                <th className="py-3 px-4 font-semibold">Ref&nbsp;No</th>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">State</th>
                <th className="py-3 px-4 font-semibold text-center">Items</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEstimates.map((est) => (
                <tr key={est.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-bold text-blue-600">#{est.refNo || est.id}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDateDMY(est.invoiceDate)}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{est.customer_name}</div>
                    {est.customer_phone && <div className="text-[11px] text-slate-400">{est.customer_phone}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{est.stateOfSupply || "-"}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{Array.isArray(est.rows) ? est.rows.length : 0}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-800">{formatCurrency(est.total_amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        est.status === "converted"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : "bg-purple-50 text-purple-600 border border-purple-200"
                      }`}
                    >
                      {est.status || "open"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1 text-slate-400">
                      {/* Print */}
                      <button
                        onClick={() => printEstimate(est)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="Print"
                      >
                        <Printer size={15} />
                      </button>

                      {/* Share */}
                      <button
                        onClick={() => shareEstimate(est)}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition cursor-pointer"
                        title="Share"
                      >
                        <Share2 size={15} />
                      </button>

                      {/* 3-Dot More Menu */}
                      <div className="relative">
                        <button
                          onClick={(e) => toggleMoreMenu(e, est)}
                          data-more-trigger
                          className={`w-7 h-7 flex items-center justify-center rounded-md transition cursor-pointer ${
                            menuAnchor && menuAnchor.id === est.id
                              ? "text-slate-800 bg-slate-100"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          }`}
                          title="More actions"
                        >
                          <MoreVertical size={15} />
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* ── Floating Canva-style Actions Popup (never clipped, overlays page) ── */}
                  {menuAnchor && menuAnchor.id === est.id && (
                    <div
                      ref={menuRef}
                      style={{ top: menuAnchor.y, left: menuAnchor.x, width: MORE_MENU_WIDTH }}
                      className="fixed z-[80] bg-white rounded-xl border border-slate-100 shadow-xl shadow-slate-300/30 py-1.5 animate-in fade-in zoom-in-95 duration-100"
                    >
                      {/* Edit */}
                      <button
                        onClick={() => {
                          setMenuAnchor(null);
                          navigate(`/sales/estimate-quotation/add/${est.id}`);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition text-left cursor-pointer"
                      >
                        <Pencil size={15} className="text-blue-600 flex-shrink-0" />
                        <span>Edit</span>
                      </button>

                      {/* View Quotation */}
                      <button
                        onClick={() => {
                          setMenuAnchor(null);
                          printEstimate(est);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100/70 transition text-left cursor-pointer"
                      >
                        <Eye size={15} className="text-slate-700 flex-shrink-0" />
                        <span>View Quotation</span>
                      </button>

                      {/* Subtle Divider */}
                      <div className="mx-3 my-1.5 border-t border-slate-100" />

                      {/* Delete */}
                      <button
                        onClick={() => {
                          setMenuAnchor(null);
                          setDeleteTarget(est);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition text-left cursor-pointer"
                      >
                        <Trash2 size={15} className="text-red-500 flex-shrink-0" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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