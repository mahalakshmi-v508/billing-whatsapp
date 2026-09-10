import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import api from "../../../services/api";

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
  minWidth: 220,
  flex: "0 1 260px",
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
const chipBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  height: 36,
  borderRadius: 7,
  border: B,
  background: "#fff",
  padding: "0 12px",
  fontSize: 12.5,
  fontWeight: 600,
  fontFamily: FONT,
  cursor: "pointer",
  color: "#1e293b",
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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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
  const custGstinCode = getStateCodeFromGstin(
    invoice?.customer_gst_no || invoice?.gst_no
  );
  if (custGstinCode)
    return String(sellerStateCode) !== String(custGstinCode) ? true : false;
  const cs = getStateCodeFromName(customerStateCode);
  if (cs) return String(sellerStateCode) !== String(cs) ? true : false;
  return false;
};

/* Invoice-type terminology mirrors the app's own invoice print logic
   (src/pages/billing/Invoice.jsx): explicit invoice_type when present,
   otherwise "Bill of Supply" for non-GST invoices and "Tax Invoice" for GST. */
const resolveInvoiceType = (inv) => {
  if (inv?.invoice_type) return String(inv.invoice_type);
  if (inv?.gst_type === "without_gst") return "Bill of Supply";
  return "Tax Invoice";
};

/* Resolve the SAC/service code for a line item from every code field the
   project stores. When no SAC/HSN field is present the code falls back to the
   product code (the same fallback the existing HSN report / invoice print
   use), else "-". `fallback` marks rows that were NOT resolved from a real
   SAC/HSN value so the page can surface an honest notice. */
const resolveSacCode = (line, prodMap) => {
  const code =
    String(line?.sac || "").trim() ||
    String(line?.sac_code || "").trim() ||
    String(line?.hsn || "").trim() ||
    String(line?.hsn_code || "").trim() ||
    String(line?.hsn_sac || "").trim();
  if (code) return { code, fallback: false };
  const prod =
    String(line?.product_code || "").trim() ||
    String(prodMap.get(String(line?.product_id || "")) || "").trim();
  return { code: prod || "-", fallback: !prod };
};

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "thisWeek", label: "This Week" },
  { key: "thisMonth", label: "This Month" },
  { key: "thisYear", label: "This Year" },
  { key: "between", label: "Custom" },
  { key: "all", label: "All Time" },
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
    case "thisMonth":
      return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case "thisYear":
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
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
  .tot td { background: #f9fafb; font-weight: bold; }
  </style></head><body>${content}</body></html>`);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 60 * 1000);
  }, 250);
};

const sortSac = (a, b) => {
  const na = Number(a);
  const nb = Number(b);
  if (na && nb) {
    if (na !== nb) return na - nb;
    return String(a).localeCompare(String(b));
  }
  return String(a).localeCompare(String(b));
};

export default function SACReport() {
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
  const [error, setError] = useState(false);
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
        (custOk?.data?.customers || []).forEach((c) =>
          cMap.set(String(c.id), c)
        );
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
    setError(false);
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
          console.error("SAC Report · companies fallback failed:", err);
        }
      }
      let firmIds;
      if (selectedFirm === "all") {
        firmIds = comps.map((c) => String(c.id));
      } else {
        firmIds = [selectedFirm];
      }
      if (firmIds.length === 0) {
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        firmIds.map(async (id) => {
          try {
            const [invRes, prodRes] = await Promise.all([
              api.get("/invoice/get_filtered_invoices", {
                params: {
                  company_id: id,
                  ...(effectiveRange.from
                    ? { from_date: effectiveRange.from }
                    : {}),
                  ...(effectiveRange.to
                    ? { to_date: effectiveRange.to }
                    : {}),
                },
              }),
              api.get("/product/get_all", { params: { company_id: id } }),
            ]);
            const prodMap = new Map();
            const prodData = prodRes.data || {};
            const prodList = Array.isArray(prodData)
              ? prodData
              : Array.isArray(prodData.data)
              ? prodData.data
              : Array.isArray(prodData.products)
              ? prodData.products
              : [];
            prodList.forEach((p) =>
              prodMap.set(String(p.id), p?.product_code || "")
            );
            const list = Array.isArray(invRes.data?.data)
              ? invRes.data.data
              : Array.isArray(invRes.data?.invoices)
              ? invRes.data.invoices
              : [];
            return { list, prodMap };
          } catch (err) {
            console.error("SAC Report · firm fetch failed:", id, err);
            return null;
          }
        })
      );

      const fetched = results.filter(Boolean);
      const all = [];
      const prodMapAll = new Map();
      fetched.forEach((r) => {
        r.prodMap.forEach((v, k) => prodMapAll.set(k, v));
        all.push(...r.list);
      });
      setInvoices(all);
      if (all.length === 0 && fetched.length === 0 && results.length > 0) {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
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

  const productCodes = useMemo(() => {
    const m = new Map();
    invoices.forEach((inv) => {
      const lines = Array.isArray(inv?.products) ? inv.products : [];
      lines.forEach((line) => {
        const pid = String(line?.product_id || "");
        if (pid) m.set(pid, line?.product_code || "");
      });
    });
    return m;
  }, [invoices]);

  const sacGroups = useMemo(() => {
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
      const invoiceType = resolveInvoiceType(inv);
      const lines =
        Array.isArray(inv?.products) && inv.products.length > 0
          ? inv.products
          : inv?.invoice_items || [];
      lines.forEach((line) => {
        if (!line) return;
        const { code: sac, fallback } = resolveSacCode(line, productCodes);
        const key = `${sac}|${invoiceType}`;
        const tax = round2(
          getNumber(line?.tax_amount ?? line?.gst_amount ?? 0)
        );
        const hasAmount =
          line?.amount != null ||
          line?.line_total != null ||
          line?.total_amount != null;
        const total = hasAmount
          ? round2(getNumber(line?.amount ?? line?.line_total ?? 0))
          : round2(
              (getNumber(line?.qty) + getNumber(line?.free_qty)) *
                (getNumber(line?.price) - getNumber(line?.discount))
            );
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
        let entry = map.get(key);
        if (!entry) {
          entry = {
            sac,
            invoiceType,
            invoicesNo: new Set(),
            total: 0,
            base: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
            fallback,
          };
          map.set(key, entry);
        } else {
          entry.fallback = entry.fallback || fallback;
        }
        entry.invoicesNo.add(inv?.invoice_no || "");
        entry.total = round2(entry.total + total);
        entry.base = round2(entry.base + base);
        entry.igst = round2(entry.igst + igst);
        entry.cgst = round2(entry.cgst + cgst);
        entry.sgst = round2(entry.sgst + sgst);
        entry.cess = 0;
      });
    });
    return [...map.values()].sort(
      (a, b) =>
        sortSac(a.sac, b.sac) || a.invoiceType.localeCompare(b.invoiceType)
    );
  }, [invoices, customersMap, productCodes]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return sacGroups;
    return sacGroups.filter(
      (g) =>
        g.sac.toLowerCase().includes(q) ||
        g.invoiceType.toLowerCase().includes(q) ||
        [...g.invoicesNo].some((no) => no.toLowerCase().includes(q))
    );
  }, [sacGroups, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, g) => {
          acc.total = round2(acc.total + g.total);
          acc.base = round2(acc.base + g.base);
          return acc;
        },
        { total: 0, base: 0 }
      ),
    [filtered]
  );

  const hasFallback =
    !loading && !error && sacGroups.length > 0 && sacGroups.some((g) => g.fallback);

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
    if (periodKey === "all") return "All Time";
    return `${fromDate.split("-").reverse().join("/") || "--"} to ${
      toDate.split("-").reverse().join("/") || "--"
    }`;
  }, [periodKey, fromDate, toDate]);

  const exportXls = () => {
    try {
      const rows = [
        ...filtered.map((g, i) => ({
          "#": i + 1,
          SAC: g.sac,
          "INVOICE TYPE": g.invoiceType,
          "TOTAL VALUE": round2(g.total),
          "TAXABLE VALUE": round2(g.base),
          "IGST AMOUNT": round2(g.igst),
          "CGST AMOUNT": round2(g.cgst),
          "SGST AMOUNT": round2(g.sgst),
          "ADD. CESS": round2(g.cess),
        })),
        {
          "#": "",
          SAC: "TOTAL",
          "INVOICE TYPE": "",
          "TOTAL VALUE": round2(totals.total),
          "TAXABLE VALUE": round2(totals.base),
          "IGST AMOUNT": round2(filtered.reduce((a, g) => a + g.igst, 0)),
          "CGST AMOUNT": round2(filtered.reduce((a, g) => a + g.cgst, 0)),
          "SGST AMOUNT": round2(filtered.reduce((a, g) => a + g.sgst, 0)),
          "ADD. CESS": 0,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SAC Report");
      const fname = `SAC_Report_${
        periodKey === "all" ? "all" : `${fromDate}_${toDate}`
      }.xlsx`;
      XLSX.writeFile(wb, fname);
    } catch (err) {
      console.error(err);
      alert("Unable to generate Excel. Please try again.");
    }
  };

  const handlePrint = () => {
    const meta = printHeaderRef.current?.innerHTML || "";
    const body = printRef.current?.innerHTML || "";
    const extra = `<table>${body}</table><p style="font-size:12px;font-weight:bold;">Total Value: ${fmtMoney(
      totals.total
    )} &nbsp;|&nbsp; Total Items: ${filtered.length}</p>`;
    printElement(
      `<h1>SAC Report</h1><div class="meta">${meta}</div>${extra}`,
      "SAC Report"
    );
  };

  const colSpan = 8;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily: FONT,
      }}
    >
      <div ref={printHeaderRef} style={{ display: "none" }}>
        <b>Firm:</b> {firmLabel} | <b>Period:</b> {filterMeta}
        {search.trim() ? ` | Search: ${search.trim()}` : ""}
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        <h2
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: NAVY,
            paddingBottom: 10,
          }}
        >
          SAC Report
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            gap: 12,
            rowGap: 10,
          }}
        >
          <div>
            <div style={labelStyle}>Period</div>
            <select
              style={{ ...selectStyle, minWidth: 150 }}
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

          <div>
            <div style={labelStyle}>Between</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <input
                type="date"
                style={dateInputStyle}
                value={fromDate}
                onChange={onFromDateChange}
              />
              <span style={{ fontSize: 12, color: GREY, fontWeight: 600 }}>
                To
              </span>
              <input
                type="date"
                style={dateInputStyle}
                value={toDate}
                onChange={onToDateChange}
              />
            </div>
          </div>

          <div>
            <div style={labelStyle}>Firm</div>
            <select
              style={{ ...selectStyle, minWidth: 160 }}
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

          <div style={{ flex: 1, minWidth: 20 }} />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              title="Export Excel"
              style={{ ...chipBtnStyle, color: "#15803d" }}
              onClick={exportXls}
            >
              <FileSpreadsheet size={16} />
              Excel Report
            </button>
            <button
              type="button"
              title="Print"
              style={{ ...chipBtnStyle, color: "#4f46e5" }}
              onClick={handlePrint}
            >
              <Printer size={16} />
              Print
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 12,
            marginBottom: 6,
          }}
        >
          <div style={searchStyle}>
            <Search size={14} color={GREY} />
            <input
              style={searchInputStyle}
              placeholder="Search SAC / invoice type / invoice #…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: GREY,
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                }}
                title="Clear search"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 16px 8px" }}>
        {hasFallback && (
          <div
            style={{
              fontSize: 10.5,
              color: "#b45309",
              marginBottom: 6,
              fontFamily: FONT,
            }}
          >
            SAC/service codes are not stored for some items in the current
            data; those entries are grouped by product code (shown as "-" when
            no code exists).
          </div>
        )}
        <div style={{ border: B, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}
            >
              <thead>
                <tr>
                  <th style={{ ...thBase, width: 40, textAlign: "center" }}>
                    #
                  </th>
                  <th style={{ ...thBase, minWidth: 120 }}>Sac</th>
                  <th style={{ ...thBase, minWidth: 150 }}>Invoice Type</th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 120 }}>
                    Total Value
                  </th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 120 }}>
                    Taxable Value
                  </th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 110 }}>
                    Igst Amount
                  </th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 110 }}>
                    Cgst Amount
                  </th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 110 }}>
                    Sgst Amount
                  </th>
                  <th style={{ ...thBase, textAlign: "right", minWidth: 100 }}>
                    Add. Cess
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      style={{ ...tdBase, textAlign: "center", color: GREY }}
                    >
                      <RefreshCw
                        size={14}
                        style={{ verticalAlign: "-2px", marginRight: 6 }}
                      />
                      Loading…
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      style={{ ...tdBase, textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 10,
                          padding: "28px 12px",
                          color: "#b45309",
                        }}
                      >
                        <AlertTriangle size={22} />
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          Unable to load SAC report. Please try again.
                        </div>
                        <button
                          type="button"
                          style={{
                            ...chipBtnStyle,
                            color: "#1d4ed8",
                            borderColor: "#bfdbfe",
                          }}
                          onClick={() => fetchReport()}
                        >
                          <RefreshCw size={14} />
                          Retry
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colSpan}
                      style={{ ...tdBase, textAlign: "center" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          padding: "42px 12px",
                          color: GREY,
                        }}
                      >
                        <Search size={24} />
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                          No data is available for SAC Wise Summary Report.
                        </div>
                        <div style={{ fontSize: 12 }}>
                          Please try again after making relevant changes.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((g, i) => (
                    <tr
                      key={`${g.sac}-${g.invoiceType}-${i}`}
                      style={{ background: i % 2 ? ALT_BG : "#fff" }}
                    >
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        {i + 1}
                      </td>
                      <td style={{ ...tdBase, fontWeight: 600 }}>{g.sac}</td>
                      <td style={{ ...tdBase }}>{g.invoiceType}</td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {fmtMoney(g.total)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {fmtMoney(g.base)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(g.igst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(g.cgst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(g.sgst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(g.cess)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hidden print table (report body only) */}
      <div ref={printRef} style={{ display: "none" }}>
        <thead>
          <tr>
            <th>#</th>
            <th>SAC</th>
            <th>Invoice Type</th>
            <th>Total Value</th>
            <th>Taxable Value</th>
            <th>IGST Amount</th>
            <th>CGST Amount</th>
            <th>SGST Amount</th>
            <th>Add. Cess</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g, i) => (
            <tr key={`${g.sac}-${g.invoiceType}-${i}`}>
              <td>{i + 1}</td>
              <td>{g.sac}</td>
              <td>{g.invoiceType}</td>
              <td class="num">{g.total.toFixed(2)}</td>
              <td class="num">{g.base.toFixed(2)}</td>
              <td class="num">{g.igst.toFixed(2)}</td>
              <td class="num">{g.cgst.toFixed(2)}</td>
              <td class="num">{g.sgst.toFixed(2)}</td>
              <td class="num">{g.cess.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
          padding: "10px 16px 14px",
          borderTop: B,
        }}
      >
        <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY }}>
          Total Value:{" "}
          <span style={{ fontWeight: 700 }}>{fmtMoney(totals.total)}</span>
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            (Taxable: {fmtMoney(totals.base)})
          </span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY }}>
          Total Items:{" "}
          <span style={{ fontWeight: 700 }}>{filtered.length}</span>
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            ({firmLabel} · {filterMeta})
          </span>
        </div>
      </div>
    </div>
  );
}