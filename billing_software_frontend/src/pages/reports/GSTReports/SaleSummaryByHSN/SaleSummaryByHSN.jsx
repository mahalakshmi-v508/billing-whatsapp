import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../../../services/api";
import ReportPagination from "../../../../components/reports/ReportPagination";
import SaleSummaryByHSNAnalytics from "./SaleSummaryByHSNAnalytics";
import { showToast } from "../../../../utils/reportToast";

function auth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return {
      adminId: user?.role === "admin" ? user?.id : user?.admin_id || null,
    };
  } catch {
    return { adminId: null };
  }
}

const ADMIN_ID = () => auth().adminId;

const NAVY = "#334e68";
const GREY = "#5b6b7c";
const BORDER = "#e2e8f0";
const HDR_BG = "#f1f5f9";
const ALT_BG = "#fafafa";
const FONT = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const PAD = "6px 10px";
const B = `1px solid ${BORDER}`;

const selectStyle = {
  height: 36,
  borderRadius: 7,
  border: B,
  background: "#fff",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#1e293b",
  padding: "0 24px 0 9px",
  outline: "none",
  cursor: "pointer",
  fontFamily: FONT,
};
const labelStyle = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.4,
  color: GREY,
  textTransform: "uppercase",
  marginBottom: 4,
};
const dateInputStyle = {
  height: 36,
  borderRadius: 7,
  border: B,
  padding: "0 6px",
  fontSize: 12.5,
  fontFamily: FONT,
  color: "#1e293b",
  outline: "none",
  width: 140,
};
const searchStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  height: 34,
  borderRadius: 7,
  border: B,
  padding: "0 10px",
  background: "#fff",
  width: 250,
};
const searchInputStyle = {
  border: "none",
  outline: "none",
  fontSize: 12.5,
  fontFamily: FONT,
  color: "#1e293b",
  background: "transparent",
  width: "100%",
};
const iconBtnStyle = {
  height: 36,
  width: 36,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: B,
  background: "#fff",
  cursor: "pointer",
  color: GREY,
  boxShadow: "none",
};
const thBase = {
  background: HDR_BG,
  color: "#475569",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  padding: PAD,
  borderRight: B,
  borderBottom: B,
  whiteSpace: "nowrap",
};
const tdBase = {
  fontSize: 12.5,
  color: "#1e293b",
  padding: PAD,
  borderRight: B,
  borderBottom: B,
  background: "#fff",
};
const tdNum = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
};

const round2 = (n) =>
  Math.round((Number(n) || 0) * 100) / 100;

const getNumber = (v) => Number(v) || 0;

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const taxCell = (v) => (Math.abs(Number(v) || 0) < 0.005 ? "—" : fmtMoney(v));

const STATE_NAME_TO_CODE = {
  "jammu and kashmir": "01",
  "himachal pradesh": "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  haryana: "06",
  "delhi": "07",
  rajastan: "08",
  "rajasthan": "08",
  "uttar pradesh": "09",
  bihar: "10",
  sikkim: "11",
  "arunachal pradesh": "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  "west bengal": "19",
  jharkhand: "20",
  odisha: "21",
  orissa: "21",
  chhattisgarh: "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "dadra and nagar haveli and daman and diu": "26",
  dadra: "26",
  maharashtra: "27",
  "andhra pradesh": "28",
  karnataka: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  "tamil nadu": "33",
  puducherry: "34",
  "andaman and nicobar islands": "35",
  telangana: "36",
  "ladakh": "37",
  "up": "09",
  "tamilnadu": "33",
};

const normName = (s) => {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[-\\.]/g, "")
    .trim();
};

const getStateCodeFromGstin = (gstin) => {
  const g = normName(gstin);
  return /^\d{2}/.test(g) ? g.slice(0, 2) : "";
};

const getStateCodeFromName = (name) => {
  if (!name) return "";
  const n = normName(name);
  if (STATE_NAME_TO_CODE[n]) return STATE_NAME_TO_CODE[n];
  for (const [k, v] of Object.entries(STATE_NAME_TO_CODE)) {
    if (n && n.startsWith(k)) return v;
    if (n && n.includes(k) && n.length < 40) return v;
  }
  return "";
};

const calculateIgst = (taxAmount) => round2(getNumber(taxAmount));
const calculateCgst = (taxAmount) => round2(getNumber(taxAmount) / 2);
const calculateSgst = (taxAmount) => round2(getNumber(taxAmount) / 2);

const resolveSaleInterState = (invoice, customerStateCode, sellerStateCode) => {
  const custGstinCode = getStateCodeFromGstin(invoice?.customer_gst_no || invoice?.gst_no);
  if (custGstinCode) return String(sellerStateCode) !== String(custGstinCode) ? true : false;
  const cs = getStateCodeFromName(customerStateCode);
  if (cs) return String(sellerStateCode) !== String(cs) ? true : false;
  return false;
};

const PERIODS = [
  { key: "today", label: "Today", first: true },
  { key: "thisWeek", label: "This Week" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisQuarter", label: "This Quarter" },
  { key: "thisHalfYear", label: "This Half Year" },
  { key: "thisYear", label: "This Year" },
  { key: "lastYear", label: "Last Year" },
  { key: "all", label: "All Period" },
  { key: "between", label: "Between" },
];

const periodRangeDate = (key, now) => {
  const d = new Date(now || new Date());
  const y = d.getFullYear();
  const m = d.getMonth();
  const today = new Date(y, m, d.getDate());
  switch (key) {
    case "today":
      return { from: today, to: today };
    case "thisWeek": {
      const s = new Date(today);
      s.setDate(s.getDate() - s.getDay());
      return { from: s, to: today };
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { from: s, to: today };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { from: s, to: today };
    }
    case "thisMonth":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case "lastMonth":
      return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    case "thisQuarter": {
      const q = Math.floor(m / 3) * 3;
      return { from: new Date(y, q, 1), to: new Date(y, q + 3, 0) };
    }
    case "thisHalfYear": {
      const h = m < 6 ? 0 : 6;
      return { from: new Date(y, h, 1), to: new Date(y, h + 6, 0) };
    }
    case "thisYear":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
    case "lastYear":
      return { from: new Date(y - 1, 0, 1), to: new Date(y - 1, 11, 31) };
    default:
      return { from: today, to: today };
  }
};

const printElement = (content, title) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
  body { font-family: Arial, sans-serif; color: #111; margin: 18px; font-size: 12px; }
  h1 { font-size: 16px; margin: 0; }
  .meta { color: #444; font-size: 11px; margin: 6px 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  th { background: #f3f4f6; border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;
       text-transform: uppercase; text-align: left; }
  td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 12px; }
  .num { text-align: right; white-space: nowrap; }
  .tot td { font-weight: bold; }
  </style></head><body>${content}</body></html>`);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 60 * 1000);
  }, 250);
};
export default function SaleSummaryByHSN() {
  const adminId = ADMIN_ID();

  const defaultRange = useMemo(() => {
    const r = periodRangeDate("thisMonth", new Date());
    return { from: fmtDate(r.from), to: fmtDate(r.to) };
  }, []);

  const [periodKey, setPeriodKey] = useState("thisMonth");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [customersMap, setCustomersMap] = useState(new Map());
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const printHeaderRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!adminId) return;
    const fetchMeta = async () => {
      try {
        const [compRes, custRes] = await Promise.allSettled([
          api.get("/company/get_companies_by_admin", {
            params: { admin_id: adminId },
          }),
          api.get("/customer/get_all_customer", {
            params: { admin_id: adminId },
          }),
        ]);
        const compOk = compRes.status === "fulfilled" ? compRes.value : null;
        const custOk = custRes.status === "fulfilled" ? custRes.value : null;
        const comps =
          compOk?.data?.data?.length > 0
            ? compOk.data.data
            : compOk?.data?.companies?.length > 0
            ? compOk.data.companies
            : [];
        setCompanies(comps);
        const cMap = new Map();
        (custOk?.data?.data || []).forEach((c) => cMap.set(String(c.id), c));
        (custOk?.data?.customers || []).forEach((c) => cMap.set(String(c.id), c));
        setCustomersMap(cMap);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMeta();
  }, [adminId]);

  const effectiveRange = useMemo(() => {
    if (periodKey === "between") return { from: fromDate, to: toDate };
    if (periodKey === "all") return { from: "", to: "" };
    const r = periodRangeDate(periodKey, new Date());
    return { from: fmtDate(r.from), to: fmtDate(r.to) };
  }, [periodKey, fromDate, toDate]);

  const fetchReport = useCallback(async () => {
    if (!adminId) return;
    setLoading(true);
    setInvoices([]);
    try {
      let comps = companies;
      if (selectedFirm === "all" && comps.length === 0) {
        try {
          const compRes = await api.get("/company/get_companies_by_admin", {
            params: { admin_id: adminId },
          });
          comps = Array.isArray(compRes.data?.data)
            ? compRes.data.data
            : Array.isArray(compRes.data?.companies)
            ? compRes.data.companies
            : [];
          setCompanies(comps);
        } catch (err) {
          console.error("Sale Summary By HSN · companies fallback failed:", err);
        }
      }
      let firmIds;
      if (selectedFirm === "all") {
        firmIds = comps.map((c) => String(c.id));
      } else {
        firmIds = [selectedFirm];
      }
      if (firmIds.length === 0) {
console.warn(
        "Sale Summary By HSN · no firms to fetch. companies=",
        comps,
        "adminId=",
        adminId
      );
      setLoading(false);
      return;
    }
      const tasks = firmIds.map((id) =>
        Promise.allSettled([
          api.get("/invoice/get_filtered_invoices", {
            params: {
              company_id: id,
              ...(effectiveRange.from ? { from_date: effectiveRange.from } : {}),
              ...(effectiveRange.to ? { to_date: effectiveRange.to } : {}),
            },
          }),
          api.get("/product/get_all", { params: { company_id: id } }),
        ])
      );
      const allResults = await Promise.allSettled(tasks);
      const all = [];
      allResults.forEach((res) => {
        if (res.status !== "fulfilled" || !res.value?.length) return;
        const [invRes, prodRes] = res.value;
        const prodMap = new Map();
        const prodList =
          prodRes.status === "fulfilled"
            ? Array.isArray(prodRes.value?.data?.data)
              ? prodRes.value.data.data
              : Array.isArray(prodRes.value?.data?.products)
              ? prodRes.value.data.products
              : []
            : [];
        prodList.forEach((p) => prodMap.set(String(p.id), p?.product_code || ""));
        const d =
          invRes.status === "fulfilled"
            ? Array.isArray(invRes.value?.data?.data)
              ? invRes.value.data.data
              : Array.isArray(invRes.value?.data?.invoices)
              ? invRes.value.data.invoices
              : []
            : [];
        d.forEach((inv) => {
          const lines =
            Array.isArray(inv?.products) && inv.products.length > 0
              ? inv.products
              : inv?.invoice_items || [];
          lines.forEach((line) => {
            if (!line) return;
            line.displayCode =
              String(line?.product_code || "").trim() ||
              prodMap.get(String(line?.product_id || "")) ||
              String(line?.hsn || "").trim();
          });
        });
        all.push(...d);
      });
      setInvoices(all);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [adminId, selectedFirm, companies, effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchReport();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchReport]);

  const hsnGroups = useMemo(() => {
    const map = new Map();
    invoices.forEach((inv) => {
      const sellerState = getStateCodeFromGstin(inv?.gstin || inv?.gst_no);
      const cust = customersMap.get(String(inv?.customer_id));
      let inter = false;
      if (sellerState) {
        inter = resolveSaleInterState(
          inv,
          cust?.state || cust?.state_name || "",
          sellerState
        );
      } else {
        const c = cust?.state || "";
        const cs = getStateCodeFromName(c);
        inter = cs ? String(cs) !== String(cust?.state || "") : false;
      }
      const prod =
        Array.isArray(inv?.products) && inv.products.length > 0
          ? inv.products
          : inv?.invoice_items || [];
      prod.forEach((line) => {
        if (!line) return;
        const key =
          String(line?.displayCode || "").trim() ||
          String(line?.product_id || "").trim() ||
          "NA";
        const mapKey = `${inv?.company_id || "0"}|${key}`;
        const tax = round2(getNumber(line?.tax_amount ?? line?.gst_amount ?? 0));
        const total = round2(getNumber(line?.amount));
        const base = round2(total - tax);
        let igst = 0;
        let cgst = 0;
        let sgst = 0;
        if (inter) {
          igst = calculateIgst(tax);
        } else {
          cgst = calculateCgst(tax);
          sgst = calculateSgst(tax);
        }
        let entry = map.get(mapKey);
        if (!entry) {
          entry = {
            hsn: key,
            items: [],
            total: 0,
            base: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
          };
          map.set(mapKey, entry);
        }
        entry.items.push({
          name: line?.product_name || key,
          code: line?.product_code || "",
          unit: line?.unit || "",
          qty: round2(getNumber(line?.qty) + getNumber(line?.free_qty)),
          rate: getNumber(line?.gst ?? line?.gst_percentage ?? 0),
          base,
          tax,
          total,
        });
        entry.total = round2(entry.total + total);
        entry.base = round2(entry.base + base);
        entry.igst = round2(entry.igst + igst);
        entry.cgst = round2(entry.cgst + cgst);
        entry.sgst = round2(entry.sgst + sgst);
        entry.cess = 0;
      });
    });
    return [...map.values()].sort((a, b) => b.base - a.base);
  }, [invoices, customersMap]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return hsnGroups;
    return hsnGroups.filter((g) => {
      if (g.hsn.toLowerCase().includes(q)) return true;
      return g.items.some(
        (it) =>
          (it.name || "").toLowerCase().includes(q) ||
          (it.code || "").toLowerCase().includes(q) ||
          String(it.qty || "").includes(q)
      );
    });
  }, [hsnGroups, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (a, g) => {
          a.total = round2(a.total + g.total);
          a.base = round2(a.base + g.base);
          return a;
        },
        { total: 0, base: 0 }
      ),
    [filtered]
  );

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState("report");

  const onPeriodChange = (e) => {
    const key = e.target.value;
    setPeriodKey(key);
    if (key !== "between" && key !== "all") {
      const r = periodRangeDate(key, new Date());
      setFromDate(fmtDate(r.from));
      setToDate(fmtDate(r.to));
    }
  };

  const onFromDateChange = (e) => {
    setFromDate(e.target.value);
    setPeriodKey("between");
  };

  const onToDateChange = (e) => {
    setToDate(e.target.value);
    setPeriodKey("between");
  };

  const firmLabel = useMemo(() => {
    if (selectedFirm === "all") return "ALL FIRMS";
    const c = companies.find((x) => String(x.id) === selectedFirm);
    return c?.company_name || c?.firm_name || selectedFirm;
  }, [selectedFirm, companies]);

  const filterMeta = useMemo(() => {
    if (periodKey === "all") return "All Period";
    return `${fromDate.split("-").reverse().join("/") || "--"} to ${
      toDate.split("-").reverse().join("/") || "--"
    }`;
  }, [periodKey, fromDate, toDate]);

  const exportXls = () => {
    try {
      const makeSummaryRows = () =>
        filtered.map((g, i) => ({
          "#": i + 1,
          HSN: g.hsn,
          "TOTAL VALUE": round2(g.total),
          "TAXABLE VALUE": round2(g.base),
          "IGST AMOUNT": round2(g.igst),
          "CGST AMOUNT": round2(g.cgst),
          "SGST AMOUNT": round2(g.sgst),
          "ADD. CESS": round2(g.cess),
        }));
      const makeDetailRows = () =>
        filtered.flatMap((g) =>
          g.items.map((it) => ({
            HSN: g.hsn,
            ITEM: it.name,
            QTY: it.qty,
            RATE_PERCENT: it.rate,
            TAXABLE_VALUE: round2(it.base),
            TAX_AMOUNT: round2(it.tax),
            TOTAL_VALUE: round2(it.total),
          }))
        );
      const totalRows = [
        ...makeSummaryRows(),
        {
          "#": "",
          HSN: "TOTAL",
          "TOTAL VALUE": round2(totals.total),
          "TAXABLE VALUE": round2(totals.base),
          "IGST AMOUNT": round2(filtered.reduce((a, g) => a + g.igst, 0)),
          "CGST AMOUNT": round2(filtered.reduce((a, g) => a + g.cgst, 0)),
          "SGST AMOUNT": round2(filtered.reduce((a, g) => a + g.sgst, 0)),
          "ADD. CESS": 0,
        },
      ];
      const ws1 = XLSX.utils.json_to_sheet(totalRows);
      const ws2 = XLSX.utils.json_to_sheet(makeDetailRows());
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "HSN Summary");
      XLSX.utils.book_append_sheet(wb, ws2, "Item Details");
      const fname = `Sale_Summary_By_HSN_${
        periodKey === "all" ? "all" : `${fromDate}_${toDate}`
      }.xlsx`;
      XLSX.writeFile(wb, fname);
    } catch (err) {
      console.error(err);
      showToast("Unable to generate Excel. Please try again.", "error");
    }
  };

  const handlePrint = () => {
    const meta = printHeaderRef.current?.innerHTML || "";
    const body = printRef.current?.innerHTML || "";
    printElement(
      `<h1>Sale Summary By HSN</h1><div class="meta">${meta}</div><table>${body}</table>`,
      "Sale Summary By HSN"
    );
  };

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedStart = (safePage - 1) * rowsPerPage;
  const pagedRows = filtered.slice(pagedStart, pagedStart + rowsPerPage);

  const analyticsRows = useMemo(() => {
    if (!filtered.length) return [];
    return filtered.map((g) => ({
      date: "",
      group: g.hsn,
      value: Number(g.base || 0),
      count: g.items?.length || 1,
    }));
  }, [filtered]);

  return (
    <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 space-y-3.5 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {viewMode === "analytics" ? (
        <SaleSummaryByHSNAnalytics
          rows={filtered}
          period={filterMeta || ""}
          onClose={() => setViewMode("report")}
        />
      ) : (
        <>
      <div ref={printHeaderRef} style={{ display: "none" }}>
        <b>Firm:</b> {firmLabel} | <b>Period:</b> {filterMeta}
        {search.trim() ? ` | Search: ${search.trim()}` : ""}
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Period</span>
            <select
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer min-w-[140px]"
              value={periodKey}
              onChange={onPeriodChange}
            >
              {PERIODS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Between</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
                value={fromDate}
                onChange={onFromDateChange}
              />
              <span className="text-xs font-bold text-slate-400">to</span>
              <input
                type="date"
                className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-2.5 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
                value={toDate}
                onChange={onToDateChange}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Firm</span>
            <select
              className="bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer min-w-[160px]"
              value={selectedFirm}
              onChange={(e) => setSelectedFirm(e.target.value)}
            >
              <option value="all">ALL FIRMS</option>
              {companies.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name || c.firm_name || `Firm ${c.id}`}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <RefreshCw size={15} className="animate-spin text-blue-600 ml-2" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Export Excel"
            onClick={exportXls}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Excel
          </button>
          <button
            type="button"
            title="Print"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
          >
            <Printer size={15} className="text-slate-600" />
            Print
          </button>
          <button
            type="button"
            title="View Analytics"
            onClick={() => setViewMode("analytics")}
            disabled={!filtered.length}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl border border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/80 hover:border-indigo-300 transition-all shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarChart3 size={15} className="text-indigo-600" />
            Analytics
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50/60 to-white p-4 rounded-2xl border border-indigo-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-indigo-700 uppercase">Total HSN Groups</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{filtered.length}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Active HSN Codes</div>
        </div>
        <div className="bg-gradient-to-br from-blue-50/60 to-white p-4 rounded-2xl border border-blue-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">Total Value</span>
          <div className="text-xl font-black text-slate-800 tracking-tight mt-1">{fmtMoney(totals.total)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Gross Invoiced Value</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/60 to-white p-4 rounded-2xl border border-emerald-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">Taxable Value</span>
          <div className="text-xl font-black text-emerald-900 tracking-tight mt-1">{fmtMoney(totals.base)}</div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">Net Taxable Base</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50/60 to-white p-4 rounded-2xl border border-purple-100/80 shadow-2xs">
          <span className="text-[11px] font-bold tracking-wider text-purple-700 uppercase">Total Tax Amount</span>
          <div className="text-xl font-black text-purple-900 tracking-tight mt-1">
            {fmtMoney(totals.igst + totals.cgst + totals.sgst + totals.cess)}
          </div>
          <div className="text-[11px] font-medium text-slate-400 mt-0.5">IGST + CGST + SGST + Cess</div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Table Search Header */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-[240px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by HSN / item name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Showing {filtered.length} HSN items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75">
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center w-12">#</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">HSN</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Total Value</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Taxable Value</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">IGST Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">CGST Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">SGST Amount</th>
                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Add. Cess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-xs">
                    <RefreshCw size={18} className="inline animate-spin mr-2 text-blue-600" />
                    Loading HSN data…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 text-xs font-medium">
                    No records found for the selected period and firm.
                  </td>
                </tr>
              ) : (
                pagedRows.map((g, i) => (
                  <tr key={`${g.hsn}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-xs text-center font-medium text-slate-400">{pagedStart + i + 1}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800">{g.hsn}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-900 text-right tabular-nums">{fmtMoney(g.total)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700 text-right tabular-nums">{fmtMoney(g.base)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">{taxCell(g.igst)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">{taxCell(g.cgst)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">{taxCell(g.sgst)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 text-right tabular-nums">{taxCell(g.cess)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/90 font-bold border-t border-slate-200/80 text-slate-800">
                  <td className="px-4 py-3 text-xs text-center" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{fmtMoney(totals.total)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{fmtMoney(totals.base)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{taxCell(totals.igst)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{taxCell(totals.cgst)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{taxCell(totals.sgst)}</td>
                  <td className="px-4 py-3 text-xs text-right tabular-nums text-slate-900">{taxCell(totals.cess)}</td>
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

      </>
      )}
    </div>
  );
}