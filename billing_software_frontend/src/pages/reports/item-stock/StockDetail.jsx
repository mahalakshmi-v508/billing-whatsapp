import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Calendar, FileSpreadsheet, Printer, RefreshCw, AlertCircle, Package, Layers, TrendingUp, ShoppingCart, Search } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";
import ReportPagination from "../../../components/reports/ReportPagination";

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
const fmtQty = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

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

function defaultRange() {
  const t = new Date();
  return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: new Date(t.getFullYear(), t.getMonth(), t.getDate()) };
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
    `<html><head><title>${title || "Stock Detail"}</title>
     <style>
       *{box-sizing:border-box;}
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:22px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:17px;}
       .meta{color:#64748b;font-size:11.5px;margin-bottom:16px;}
       table{width:100%;border-collapse:collapse;font-size:10.5px;}
       th,td{border:1px solid #dbe2ec;padding:6px 7px;text-align:left;vertical-align:middle;}
       th{background:#f2f4f7;color:#334155;white-space:normal;line-height:1.25;}
       td.r,th.r{text-align:right;}
       tfoot td{background:#f2f4f7;font-weight:700;border-top:2px solid #94a3b8;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

const COLUMNS = [
  { key: "item_name", label: "Item Name", qty: false, money: false },
  { key: "beginning_qty", label: "Beginning Quantity", qty: true, money: false },
  { key: "quantity_in", label: "Quantity In", qty: true, money: false },
  { key: "purchase_amount", label: "Purchase Amount", qty: false, money: true },
  { key: "quantity_out", label: "Quantity Out", qty: true, money: false },
  { key: "sale_amount", label: "Sale Amount", qty: false, money: true },
  { key: "closing_qty", label: "Closing Quantity", qty: true, money: false },
];

export default function StockDetail() {
  const { adminId } = getAuth();
  const [{ from: startDate, to: endDate }, setRange] = useState(defaultRange);
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState("My Company");

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [catOpen, setCatOpen] = useState(false);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const catRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
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

  useEffect(() => {
    if (companyId === null) return;
    api
      .get(`/category/get_all`, { params: { company_id: companyId } })
      .then((res) => {
        if (res.data?.status) setCategories(res.data.data || []);
      })
      .catch(() => {});
  }, [companyId]);

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
        category_id: categoryId,
      };
      api
        .get("/report/stock-detail", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(res.data.totals || {});
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, startDate, endDate, categoryId, reloadKey]);

  const selectedCategory = categories.find((c) => Number(c.id) === Number(categoryId));
  const prettyFrom = startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const prettyTo = endDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => (r.item_name || "").toLowerCase().includes(q));
  }, [rows, search]);

  const handleExcel = () => {
    try {
      const sheetData = [
        ["Stock Detail"],
        [`From: ${prettyFrom}  |  To: ${prettyTo}  |  Category: ${selectedCategory?.name || "All Categories"}`],
        [],
        COLUMNS.map((c) => c.label),
      ];
      filteredRows.forEach((r) => {
        sheetData.push(
          COLUMNS.map((c) =>
            c.key === "item_name" ? r[c.key] || "-" : c.money ? fmtINR(r[c.key]) : fmtQty(r[c.key])
          )
        );
      });
      sheetData.push(
        COLUMNS.map((c) =>
          c.key === "item_name" ? "Total" : c.money ? fmtINR(totals[c.key]) : fmtQty(totals[c.key])
        )
      );
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = COLUMNS.map((c) => ({ wch: c.key === "item_name" ? 30 : 16 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Detail");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Stock_Detail_${formatDateISO(startDate)}_to_${formatDateISO(endDate)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  const handlePrint = () => {
    const th = COLUMNS.map((c) => `<th class="${c.qty || c.money ? "r" : ""}">${c.label}</th>`).join("");
    const buildRow = (r) => {
      const cells = COLUMNS.map((c) => {
        if (c.key === "item_name") return `<td><strong>${r[c.key] || "-"}</strong></td>`;
        const val = c.money ? fmtINR(r[c.key]) : fmtQty(r[c.key]);
        return `<td class="r"><strong>${val}</strong></td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    };
    const body =
      filteredRows.map((r) => buildRow(r)).join("") +
      (filteredRows.length ? buildRow(totals) : "");

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Stock Detail</h2>
       <div class="meta">From: ${prettyFrom} &nbsp;|&nbsp; To: ${prettyTo} &nbsp;|&nbsp; Filter by Item Category: ${selectedCategory?.name || "All Categories"} &nbsp;|&nbsp; ${companyName}</div>
       <table>
         <thead><tr>${th}</tr></thead>
         <tbody>${body}</tbody>
       </table>`;
    printElement(el, "Stock Detail");
  };

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Header & Export Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            <span>Inventory Reports</span>
            <span>•</span>
            <span>Stock Detail</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
            Stock Detail Report
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Complete inward/outward breakdown, purchase and sales valuation, and opening/closing quantity
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
            title="Print Report"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div ref={catRef} className="relative">
            <button
              onClick={() => setCatOpen((v) => !v)}
              className="inline-flex items-center justify-between gap-2 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100 transition-all cursor-pointer min-w-[150px]"
            >
              <span>{selectedCategory?.name || "All Categories"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-[calc(100%+4px)] min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl z-20 py-1 max-h-56 overflow-y-auto">
                <button
                  onClick={() => { setCategoryId(0); setCatOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                >
                  All Categories
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCategoryId(Number(c.id)); setCatOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium cursor-pointer transition-colors"
                  >
                    {c.name || "Category"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* From Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={formatDateISO(startDate)}
              onChange={(e) => setRange({ from: parseDateISO(e.target.value), to: endDate })}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={formatDateISO(endDate)}
              onChange={(e) => setRange({ from: startDate, to: parseDateISO(e.target.value) })}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Search Input */}
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search item..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        <button
          onClick={() => setReloadKey((k) => k + 1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all cursor-pointer ml-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Products</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{filteredRows.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active stock items</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Quantity In (Purchase)</div>
            <div className="text-xl font-black text-blue-600 mt-0.5">
              {fmtQty(totals.quantity_in)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">{fmtINR(totals.purchase_amount)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Quantity Out (Sales)</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">
              {fmtQty(totals.quantity_out)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">{fmtINR(totals.sale_amount)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Total Closing Stock</div>
            <div className="text-xl font-black text-violet-600 mt-0.5">
              {fmtQty(totals.closing_qty)}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">Units in inventory</div>
          </div>
        </div>
      </div>

      {/* Modern Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={`px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 ${
                      c.qty || c.money ? "text-right" : "text-left"
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading stock details...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-rose-500 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                      <span>{error}</span>
                      <button
                        onClick={() => setReloadKey((k) => k + 1)}
                        className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-slate-400 font-medium">
                    No stock details found.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.item_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {fmtQty(r.beginning_qty)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">
                      {fmtQty(r.quantity_in)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {fmtINR(r.purchase_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {fmtQty(r.quantity_out)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">
                      {fmtINR(r.sale_amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-violet-50 text-violet-700 border border-violet-100">
                        {fmtQty(r.closing_qty)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && !error && filteredRows.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50/90 font-bold text-slate-800 text-xs">
                <tr>
                  <td className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{fmtQty(totals.beginning_qty)}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">{fmtQty(totals.quantity_in)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-blue-800">{fmtINR(totals.purchase_amount)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmtQty(totals.quantity_out)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-800">{fmtINR(totals.sale_amount)}</td>
                  <td className="px-4 py-3 text-right font-extrabold text-violet-800">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-violet-100 text-violet-900">
                      {fmtQty(totals.closing_qty)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
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
    </div>
  );
}
