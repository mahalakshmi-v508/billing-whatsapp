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

const taxCell = (v) =>
  Math.abs(Number(v) || 0) < 0.005 ? "—" : fmtMoney(v);

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

export default function Purchase() {
  const adminId = ADMIN_ID();

  const defaultRange = useMemo(() => {
    const r = periodRangeDate("thisMonth", new Date());
    return { from: fmtDate(r.from), to: fmtDate(r.to) };
  }, []);

  const [periodKey, setPeriodKey] = useState("thisMonth");
  const [fromDate, setFromDate] = useState(defaultRange.from);
  const [toDate, setToDate] = useState(defaultRange.to);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const printHeaderRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!adminId) return;
    const fetchMeta = async () => {
      try {
        const compRes = await api.get("/company/get_companies_by_admin", {
          params: { admin_id: adminId },
        });
        const comps =
          compRes?.data?.data?.length > 0
            ? compRes.data.data
            : compRes?.data?.companies?.length > 0
            ? compRes.data.companies
            : [];
        setCompanies(comps);
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
    setPurchases([]);
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
          console.error("Purchase Report · companies fallback failed:", err);
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
            const params = new URLSearchParams({ company_id: String(id) });
            if (effectiveRange.from) params.append("start_date", effectiveRange.from);
            if (effectiveRange.to) params.append("end_date", effectiveRange.to);
            if (selectedSupplier !== "all") {
              params.append("supplier_id", String(selectedSupplier));
            }
            const [purchRes, supRes] = await Promise.all([
              api.get(`/purchase/get_purchases?${params.toString()}`),
              api.get("/supplier/get_all", { params: { company_id: id } }),
            ]);
            const list = Array.isArray(purchRes.data?.data)
              ? purchRes.data.data
              : Array.isArray(purchRes.data?.purchases)
              ? purchRes.data.purchases
              : [];
            const supList = Array.isArray(supRes.data?.data)
              ? supRes.data.data
              : Array.isArray(supRes.data?.suppliers)
              ? supRes.data.suppliers
              : [];
            return { list, supList };
          } catch (err) {
            console.error("Purchase Report · firm fetch failed:", id, err);
            return null;
          }
        })
      );

      const fetched = results.filter(Boolean);
      const all = [];
      const supMap = new Map();
      fetched.forEach((r) => {
        r.supList.forEach((s) => supMap.set(String(s.id), s));
        all.push(...r.list);
      });
      setSuppliers([...supMap.values()]);
      setPurchases(all);
      if (all.length === 0 && fetched.length === 0 && results.length > 0) {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [adminId, selectedFirm, selectedSupplier, companies, effectiveRange.from, effectiveRange.to]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchReport();
    }, 0);
    return () => clearTimeout(t);
  }, [fetchReport]);

  const companyState = useMemo(() => {
    const m = new Map();
    companies.forEach((c) =>
      m.set(String(c.id), getStateCodeFromGstin(c?.gstin || ""))
    );
    return m;
  }, [companies]);

  const rows = useMemo(() => {
    return purchases
      .map((p) => {
        const total = round2(getNumber(p.total_amount));
        const tax = round2(getNumber(p.gst_total));
        const base = round2(total - tax);
        const sellerState = companyState.get(String(p.company_id));
        const supplier = suppliers.find(
          (s) => String(s.id) === String(p.supplier_id)
        );
        let igst = 0;
        let cgst = 0;
        let sgst = 0;
        let inter = false;
        if (sellerState) {
          const buyerCode = getStateCodeFromGstin(
            p?.supplier_gstin || supplier?.gst_number || ""
          );
          if (buyerCode) {
            inter = String(sellerState) !== String(buyerCode);
          } else {
            const buyerFromName = getStateCodeFromName(
              supplier?.state || p?.state_of_supply || ""
            );
            inter = buyerFromName
              ? String(sellerState) !== String(buyerFromName)
              : false;
          }
        }
        if (inter) {
          igst = tax;
        } else {
          cgst = round2(tax / 2);
          sgst = round2(tax - cgst);
        }
        return {
          id: p.id,
          date: p.purchase_date ? String(p.purchase_date) : "—",
          purchaseNo: p.purchase_no ? String(p.purchase_no) : "—",
          companyId: String(p.company_id || ""),
          supplier:
            p.supplier_name || supplier?.supplier_name || `Supplier ${p.supplier_id || ""}`,
          total,
          base,
          igst,
          cgst,
          sgst,
          cess: 0,
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
  }, [purchases, suppliers, companyState]);

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.purchaseNo.toLowerCase().includes(q) ||
        r.supplier.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc.total = round2(acc.total + r.total);
          acc.base = round2(acc.base + r.base);
          acc.igst = round2(acc.igst + r.igst);
          acc.cgst = round2(acc.cgst + r.cgst);
          acc.sgst = round2(acc.sgst + r.sgst);
          return acc;
        },
        { total: 0, base: 0, igst: 0, cgst: 0, sgst: 0 }
      ),
    [filtered]
  );

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

  const supplierLabel = useMemo(() => {
    if (selectedSupplier === "all") return "ALL SUPPLIERS";
    const s = suppliers.find((x) => String(x.id) === selectedSupplier);
    return s?.supplier_name || selectedSupplier;
  }, [selectedSupplier, suppliers]);

  const filterMeta = useMemo(() => {
    if (periodKey === "all") return "All Time";
    return `${fromDate.split("-").reverse().join("/") || "--"} to ${
      toDate.split("-").reverse().join("/") || "--"
    }`;
  }, [periodKey, fromDate, toDate]);

  const exportXls = () => {
    try {
      const rowsToExport = [
        ...filtered.map((r, i) => ({
          "#": i + 1,
          DATE: r.date,
          "PURCHASE NO": r.purchaseNo,
          SUPPLIER: r.supplier,
          "TOTAL VALUE": round2(r.total),
          "TAXABLE VALUE": round2(r.base),
          "IGST AMOUNT": round2(r.igst),
          "CGST AMOUNT": round2(r.cgst),
          "SGST AMOUNT": round2(r.sgst),
          "ADD. CESS": round2(r.cess),
        })),
        {
          "#": "",
          DATE: "",
          "PURCHASE NO": "TOTAL",
          SUPPLIER: "",
          "TOTAL VALUE": round2(totals.total),
          "TAXABLE VALUE": round2(totals.base),
          "IGST AMOUNT": round2(totals.igst),
          "CGST AMOUNT": round2(totals.cgst),
          "SGST AMOUNT": round2(totals.sgst),
          "ADD. CESS": 0,
        },
      ];
      const ws = XLSX.utils.json_to_sheet(rowsToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Report");
      const fname = `Purchase_Report_${
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
      `<h1>Purchase Report</h1><div class="meta">${meta}</div>${extra}`,
      "Purchase Report"
    );
  };

  const colSpan = 10;

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
        <b>Firm:</b> {firmLabel} | <b>Supplier:</b> {supplierLabel} |{" "}
        <b>Period:</b> {filterMeta}
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
          Purchase Report
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

          <div>
            <div style={labelStyle}>Supplier</div>
            <select
              style={{ ...selectStyle, minWidth: 160 }}
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="all">ALL SUPPLIERS</option>
              {suppliers.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.supplier_name || `Supplier ${s.id}`}
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
              placeholder="Search purchase no / supplier / date…"
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
        <div style={{ border: B, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ borderCollapse: "collapse", width: "100%", minWidth: 1020 }}
            >
              <thead>
                <tr>
                  <th style={{ ...thBase, width: 40, textAlign: "center" }}>
                    #
                  </th>
                  <th style={{ ...thBase, minWidth: 110 }}>Date</th>
                  <th style={{ ...thBase, minWidth: 140 }}>Purchase No</th>
                  <th style={{ ...thBase, minWidth: 180 }}>Supplier</th>
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
                          Unable to load Purchase report. Please try again.
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
                          No data is available for Purchase Report.
                        </div>
                        <div style={{ fontSize: 12 }}>
                          Please try again after making relevant changes.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr
                      key={`${r.date}-${r.purchaseNo}-${i}`}
                      style={{ background: i % 2 ? ALT_BG : "#fff" }}
                    >
                      <td style={{ ...tdBase, textAlign: "center" }}>{i + 1}</td>
                      <td style={{ ...tdBase }}>{r.date}</td>
                      <td style={{ ...tdBase, fontWeight: 600 }}>
                        {r.purchaseNo}
                      </td>
                      <td style={{ ...tdBase }}>{r.supplier}</td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {fmtMoney(r.total)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {fmtMoney(r.base)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(r.igst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(r.cgst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(r.sgst)}
                      </td>
                      <td style={{ ...tdBase, ...tdNum }}>
                        {taxCell(r.cess)}
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
            <th>Date</th>
            <th>Purchase No</th>
            <th>Supplier</th>
            <th>Total Value</th>
            <th>Taxable Value</th>
            <th>IGST Amount</th>
            <th>CGST Amount</th>
            <th>SGST Amount</th>
            <th>Add. Cess</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r, i) => (
            <tr key={`${r.date}-${r.purchaseNo}-${i}`}>
              <td>{i + 1}</td>
              <td>{r.date}</td>
              <td>{r.purchaseNo}</td>
              <td>{r.supplier}</td>
              <td class="num">{r.total.toFixed(2)}</td>
              <td class="num">{r.base.toFixed(2)}</td>
              <td class="num">{r.igst.toFixed(2)}</td>
              <td class="num">{r.cgst.toFixed(2)}</td>
              <td class="num">{r.sgst.toFixed(2)}</td>
              <td class="num">{r.cess.toFixed(2)}</td>
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
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            IGST: {fmtMoney(totals.igst)}
          </span>
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            CGST: {fmtMoney(totals.cgst)}
          </span>
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            SGST: {fmtMoney(totals.sgst)}
          </span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: NAVY }}>
          Total Items:{" "}
          <span style={{ fontWeight: 700 }}>{filtered.length}</span>
          <span style={{ color: GREY, fontWeight: 400, marginLeft: 12 }}>
            ({firmLabel} · {supplierLabel} · {filterMeta})
          </span>
        </div>
      </div>
    </div>
  );
}