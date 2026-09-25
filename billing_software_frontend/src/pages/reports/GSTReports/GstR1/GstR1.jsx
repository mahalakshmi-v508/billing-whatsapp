import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../../services/api";
import * as XLSX from "xlsx";
import ReportPagination from "../../../../components/reports/ReportPagination";
import GstR1Analytics from "./GstR1Analytics";
import { showToast } from "../../../../utils/reportToast";
import {
  BarChart3,
  FileDown,
  Printer,
  FileJson,
  ReceiptText,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";

/* ─── Theme reused from the rest of the Reports pages ─────────────── */
const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const BORDER = "#e2e8f0";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ─── Build YYYY-MM-DD boundaries ─────────────────────────────────── */
function buildRange(fromMonth, fromYear, toMonth, toYear) {
  const start =
    fromMonth && fromYear
      ? `${fromYear}-${String(fromMonth).padStart(2, "0")}-01`
      : "";

  let end = "";

  if (toMonth && toYear) {
    const lastDay = new Date(toYear, toMonth, 0).getDate();

    end = `${toYear}-${String(toMonth).padStart(2, "0")}-${String(
      lastDay
    ).padStart(2, "0")}`;
  }

  return { start, end };
}

/* ─── Standard numeric formatter ─────────────────────────────────── */
const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ─── Resolve GSTIN/UIN ───────────────────────────────────────────── */
/*
 * IMPORTANT:
 * Do not classify the invoice as EXEMPT based on gst_total.
 *
 * GST R1 should display the customer's GST number when available.
 * If customer GST number is not available, show N/A.
 */
const resolveGstinLabel = (customerGstNo) => {
  return (customerGstNo || "").toString().trim() || "N/A";
};

/* ─── Print helper ────────────────────────────────────────────────── */
function printElement(element, title) {
  const iframe = document.createElement("iframe");

  Object.assign(iframe.style, {
    position: "fixed",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
    right: "0",
    bottom: "0",
  });

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  doc.open();

  doc.write(`
    <html>
      <head>
        <title>${title || "GST R1"}</title>

        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 28px;
            color: #1e1b4b;
          }

          h2 {
            margin: 0 0 4px;
            font-size: 18px;
          }

          .meta {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 18px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          th,
          td {
            border: 1px solid #e2e8f0;
            padding: 6px 8px;
            text-align: left;
          }

          th {
            background: #f1f5f9;
            color: #334155;
          }

          td.r,
          th.r {
            text-align: right;
          }

          tr.total td {
            background: #eef2ff;
            font-weight: 700;
          }
        </style>
      </head>

      <body>
        ${element.innerHTML}
      </body>
    </html>
  `);

  doc.close();

  const win = iframe.contentWindow;

  const fire = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  if (doc.readyState === "complete") {
    fire();
  } else {
    win.addEventListener("load", fire);
  }
}

/* ─── Auth ────────────────────────────────────────────────────────── */
function auth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      adminId:
        user?.role === "admin" ? user?.id : user?.admin_id || null,
    };
  } catch {
    return {
      adminId: null,
    };
  }
}

/**
 * GST R1 — Outward supplies (Sales) return report.
 *
 * IMPORTANT FRONTEND BEHAVIOUR:
 *
 * 1. Use the existing invoice API.
 * 2. Do NOT filter invoices using gst_total.
 * 3. Do NOT filter using gst_type.
 * 4. Do NOT show only EXEMPT records.
 * 5. Show ALL invoices returned by the API.
 * 6. Product GST percentage is used as Tax Rate.
 * 7. Customer GST number is used as GSTIN/UIN.
 * 8. No hardcoded customer/invoice values.
 */
export default function GstR1() {
  const { adminId } = auth();

  const now = new Date();

  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());

  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());

  const [activeTab, setActiveTab] = useState("sale");

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);

  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const tableWrapRef = useRef(null);

  /* ── Load companies ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!adminId) return;

    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;

        const list = res.data.data || [];

        setCompanies(list);

        const saved = localStorage.getItem("selected_company_id");

        const match = saved
          ? list.find((c) => String(c.id) === String(saved))
          : null;

        if (match) {
          setSelectedCompany(String(match.id));
        } else if (list.length === 1) {
          setSelectedCompany(String(list[0].id));
        }
      })
      .catch(() => {});
  }, [adminId]);

  /* ── Date range ─────────────────────────────────────────────────── */
  const { start, end } = useMemo(
    () =>
      buildRange(
        fromMonth,
        fromYear,
        toMonth,
        toYear
      ),
    [fromMonth, fromYear, toMonth, toYear]
  );

  /* ── Fetch report ────────────────────────────────────────────────── */
  const fetchReport = async (companyId) => {
    if (!companyId) return;

    setLoading(true);

    try {
      const params = {
        company_id: Number(companyId),
      };

      if (start) {
        params.from_date = start;
      }

      if (end) {
        params.to_date = end;
      }

      /* ── Existing invoice API ───────────────────────────────────── */
      const invRes = await api.get(
        "/invoice/get_filtered_invoices",
        {
          params,
        }
      );

      const invData = invRes.data?.status
        ? invRes.data.data || []
        : [];

      /*
       * IMPORTANT:
       * Store the complete API response.
       * No GST filtering here.
       */
      setInvoices(invData);

      /* ── Sale return / credit notes ─────────────────────────────── */
      const cnRes = await api.get(
        "/credit_note/list",
        {
          params: {
            company_id: Number(companyId),
          },
        }
      );

      let cnData = cnRes.data?.status
        ? cnRes.data.data || []
        : [];

      if (start && end) {
        cnData = cnData.filter((c) => {
          const d = c.return_date || c.created_at;

          return d >= start && d <= end;
        });
      }

      setCreditNotes(cnData);
    } catch (err) {
      console.error("GST R1 fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Reload report when filters change ──────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedCompany) {
        fetchReport(selectedCompany);
      }
    }, 0);

    return () => clearTimeout(t);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, start, end]);

  /**
   * ──────────────────────────────────────────────────────────────────
   * SALE / OUTWARD SUPPLY ROWS
   * ──────────────────────────────────────────────────────────────────
   *
   * IMPORTANT CHANGE:
   *
   * OLD:
   *   gst_total === 0 -> EXEMPT
   *   checkbox -> filter taxable/exempt
   *
   * NEW:
   *   Show ALL invoices returned by API.
   *
   * No invoice is removed because gst_total is 0.
   * No invoice is removed because gst_type is without_gst.
   *
   * Product GST is used as Tax Rate.
   */
  const saleRows = useMemo(() => {
    const rows = [];

    invoices.forEach((inv) => {
      const customerGstNo = (
        inv.customer_gst_no || ""
      )
        .toString()
        .trim();

      const products = Array.isArray(inv.products)
        ? inv.products
        : [];

      /*
       * If invoice has products:
       * create one GST R1 row for each product.
       */
      if (products.length > 0) {
        products.forEach((p, index) => {
          const gstPct = Number(
            p.gst ??
              p.gst_percentage ??
              p.gstPercent ??
              0
          );

          const qty = Number(
            p.qty ??
              p.quantity ??
              1
          );

          const price = Number(
            p.price ??
              p.unit_price ??
              p.rate ??
              0
          );

          const lineValue = qty * price;

          rows.push({
            id: `${inv.id}-${index}`,

            gstin: resolveGstinLabel(
              customerGstNo
            ),

            party_name:
              inv.customer_name ||
              "Cash Sale",

            invoice_no:
              inv.invoice_no || "-",

            date:
              inv.created_at || "-",

            value: lineValue,

            tax_rate: gstPct,
          });
        });
      } else {
        /*
         * Invoice without product array.
         * Still show the invoice instead of dropping it.
         */
        const value = Number(
          inv.sub_total ??
            inv.total_amount ??
            0
        );

        rows.push({
          id: `${inv.id}-invoice`,

          gstin: resolveGstinLabel(
            customerGstNo
          ),

          party_name:
            inv.customer_name ||
            "Cash Sale",

          invoice_no:
            inv.invoice_no || "-",

          date:
            inv.created_at || "-",

          value,

          tax_rate: 0,
        });
      }
    });

    return rows;
  }, [invoices]);

  /* ── Sale return rows ───────────────────────────────────────────── */
  const returnRows = useMemo(() => {
    const rows = [];

    creditNotes.forEach((c, index) => {
      const customerGstNo = (
        c.customer_gst_no || ""
      )
        .toString()
        .trim();

      const taxAmt = Number(
        c.tax_total || 0
      );

      const subTotal = Number(
        c.sub_total || 0
      );

      const taxRate =
        taxAmt && subTotal
          ? Math.round(
              (taxAmt / subTotal) * 100
            )
          : 0;

      rows.push({
        id: `${c.id || index}-return`,

        gstin: resolveGstinLabel(
          customerGstNo
        ),

        party_name:
          c.customer_name ||
          "Cash Customer",

        invoice_no:
          c.return_no ||
          c.invoice_no ||
          "-",

        date:
          c.return_date ||
          c.created_at ||
          "-",

        value: Number(
          c.total_amount || 0
        ),

        tax_rate: taxRate,
      });
    });

    return rows;
  }, [creditNotes]);

  /* ── Active rows ────────────────────────────────────────────────── */
  const activeRows =
    activeTab === "sale"
      ? saleRows
      : returnRows;

  /* ── Totals ─────────────────────────────────────────────────────── */
  const totals = useMemo(() => {
    return activeRows.reduce(
      (acc, r) => {
        acc.value += Number(
          r.value || 0
        );

        return acc;
      },
      {
        value: 0,
      }
    );
  }, [activeRows]);

  /* ── Export JSON ────────────────────────────────────────────────── */
  const exportJson = () => {
    if (activeRows.length === 0) {
      showToast("No data available to export.", "warning");
      return;
    }

    const blob = new Blob(
      [
        JSON.stringify(
          activeRows,
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      `GST_R1_${activeTab}_${fromYear}-${fromMonth || "00"}_to_${toYear}-${toMonth || "00"}.json`;

    a.click();

    URL.revokeObjectURL(url);
  };

  /* ── Export Excel ───────────────────────────────────────────────── */
  const exportXls = () => {
    if (activeRows.length === 0) {
      showToast("No data available to export.", "warning");
      return;
    }

    const data = activeRows.map(
      (r) => ({
        "GSTIN/UIN": r.gstin,
        "Party Name": r.party_name,
        "Invoice No": r.invoice_no,
        Date: r.date,
        "Value (₹)": r.value,
        "Tax Rate (%)": r.tax_rate,
      })
    );

    data.push({
      "GSTIN/UIN": "TOTAL",
      "Party Name": "",
      "Invoice No": "",
      Date: "",
      "Value (₹)": totals.value,
      "Tax Rate (%)": "",
    });

    const ws =
      XLSX.utils.json_to_sheet(data);

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `GST R1 ${
        activeTab === "sale"
          ? "Outward"
          : "Return"
      }`
    );

    XLSX.writeFile(
      wb,
      `GST_R1_${activeTab}.xlsx`
    );
  };

  /* ── Print ───────────────────────────────────────────────────────── */
  const handlePrint = () => {
    if (activeRows.length === 0) {
      showToast("No data available to print.", "warning");
      return;
    }

    const el =
      document.createElement("div");

    el.innerHTML = `
      <h2>
        GST R1 —
        ${
          activeTab === "sale"
            ? "Outward Supplies (Sales)"
            : "Sale Returns"
        }
      </h2>

      <div class="meta">
        Period:
        ${start || "All"}
        →
        ${end || "All"}
        &nbsp;|&nbsp;
        ${activeRows.length} record(s)
      </div>

      <table>
        <thead>
          <tr>
            <th>GSTIN/UIN</th>
            <th>Party Name</th>
            <th>Invoice No</th>
            <th>Date</th>
            <th class="r">Value</th>
            <th class="r">Tax Rate</th>
          </tr>
        </thead>

        <tbody>
          ${activeRows
            .map(
              (r) => `
                <tr>
                  <td>
                    ${r.gstin || "-"}
                  </td>

                  <td>
                    ${r.party_name || "-"}
                  </td>

                  <td>
                    ${r.invoice_no || "-"}
                  </td>

                  <td>
                    ${r.date || "-"}
                  </td>

                  <td class="r">
                    ${fmtNum(r.value)}
                  </td>

                  <td class="r">
                    ${r.tax_rate}%
                  </td>
                </tr>
              `
            )
            .join("")}

          <tr class="total">
            <td colspan="4">
              TOTAL
            </td>

            <td class="r">
              ${fmtNum(totals.value)}
            </td>

            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    printElement(
      el,
      `GST R1 ${activeTab}`
    );
  };

  /* ── Select style ───────────────────────────────────────────────── */
  const selectStyle = {
    padding: "9px 12px",
    border:
      "1.5px solid " + BORDER,
    borderRadius: 9,
    fontSize: 13,
    fontFamily: FONT,
    color: "#334155",
    outline: "none",
    background: "#fff",
    minWidth: 150,
  };

  /* ── Action button ──────────────────────────────────────────────── */
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

  const totalRows = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedStart = (safePage - 1) * rowsPerPage;
  const pagedRows = activeRows.slice(pagedStart, pagedStart + rowsPerPage);

  const analyticsRows = useMemo(() => {
    if (!activeRows.length) return [];
    return activeRows.map((r) => ({
      date: r.date || "",
      group: r.party_name || "",
      value: Number(r.value || 0),
      count: 1,
    }));
  }, [activeRows]);

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800">
      {viewMode === "analytics" ? (
        <GstR1Analytics
          rows={activeRows}
          period={`${monthNames[fromMonth - 1]} ${fromYear} → ${monthNames[toMonth - 1]} ${toYear}`}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & FILTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Date Filters & Firm */}
        <div className="flex flex-wrap items-center gap-3">
          {/* FROM MONTH / YEAR */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">From</span>
            <select
              value={fromMonth}
              onChange={(e) => setFromMonth(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* TO MONTH / YEAR */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">To</span>
            <select
              value={toMonth}
              onChange={(e) => setToMonth(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => now.getFullYear() - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* FIRM SELECTOR */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Firm</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer max-w-[180px]"
            >
              <option value="">Select firm…</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportJson}
            disabled={!selectedCompany}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-cyan-200 bg-cyan-50/80 text-cyan-700 hover:bg-cyan-100/80 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileJson size={15} />
            <span>JSON</span>
          </button>

          <button
            onClick={exportXls}
            disabled={!selectedCompany}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={15} />
            <span>Excel</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!selectedCompany}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={15} />
            <span>Print</span>
          </button>

          <button
            onClick={() => setViewMode("analytics")}
            disabled={!selectedCompany}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/80 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 size={15} />
            <span>Analytics</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. KPI SUMMARY CARDS RIBBON
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Invoices / Records */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Records</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ReceiptText size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{activeRows.length}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {activeTab === "sale" ? "Outward invoices billed" : "Credit notes / return entries"}
            </div>
          </div>
        </div>

        {/* Total Supplies Value */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Supplies Value (₹)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ReceiptText size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-emerald-600">₹{fmtNum(totals.value)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total taxable and bill value</div>
          </div>
        </div>

        {/* Current Filing Period */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-900">Return Type</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              GSTR-1
            </span>
          </div>
          <div>
            <div className="text-lg md:text-xl font-black text-indigo-700">
              {monthNames[fromMonth - 1]?.slice(0, 3)} {fromYear} – {monthNames[toMonth - 1]?.slice(0, 3)} {toYear}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Filing Period Duration
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          3. TABS AND TABLE CONTAINER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Tab Headers */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {[
              { key: "sale", label: "Sale / Outward Supplies", icon: ReceiptText },
              { key: "return", label: "Sale Return (Credit Notes)", icon: ArrowDownLeft },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); setPage(1); }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-indigo-100"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <Icon size={14} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-slate-500 flex items-center gap-2">
            {loading && <RefreshCw size={13} className="animate-spin text-indigo-600" />}
            <span><strong>{activeRows.length}</strong> record(s)</span>
          </div>
        </div>

        {/* Data Table */}
        <div ref={tableWrapRef} className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5">GSTIN / UIN</th>
                <th className="px-4 py-3.5">PARTY NAME</th>
                <th className="px-4 py-3.5">INVOICE NO.</th>
                <th className="px-4 py-3.5">DATE</th>
                <th className="px-4 py-3.5 text-right">VALUE (₹)</th>
                <th className="px-4 py-3.5 text-right">TAX RATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2 font-medium">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading GST R1 outward supplies data...
                    </div>
                  </td>
                </tr>
              ) : !selectedCompany ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ReceiptText size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">Select a firm</div>
                      <div className="text-xs text-slate-400">Please choose a firm from the top dropdown to generate GST R1.</div>
                    </div>
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <ReceiptText size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No records found</div>
                      <div className="text-xs text-slate-400">No transactions recorded for the selected period.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{r.gstin}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{r.party_name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹{fmtNum(r.value)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 whitespace-nowrap">
                      {r.tax_rate}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {activeRows.length > 0 && !loading && selectedCompany && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                  <td colSpan={4} className="px-4 py-3.5 uppercase tracking-wider text-[11px] text-slate-600">
                    Total
                  </td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900">
                    ₹{fmtNum(totals.value)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-400">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Universal Pagination */}
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

      </>
      )}
    </div>
  );
}