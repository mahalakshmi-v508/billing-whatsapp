import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Printer, RefreshCw } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const FONT = "'Plus Jakarta Sans', sans-serif";
const BORDER = "#e2e8f0";
const NAVY = "#1e3a8a";
const HEADER_BG = "#f1f5f9";
const TOTAL_BG = "#eef2ff";

const ZERO_ROW = { value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
const ZERO_ITC = { igst: 0, cgst: 0, sgst: 0, cess: 0 };

/* ─────────────────────────────────────────────────────────────
   STYLE PRIMITIVES
───────────────────────────────────────────────────────────── */

const tdBase = {
  border: "1px solid " + BORDER,
  padding: "6px 8px",
  fontSize: 11.5,
  color: "#334155",
  verticalAlign: "top",
  fontFamily: FONT,
};

const tdNum = {
  ...tdBase,
  textAlign: "right",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
  width: 100,
  minWidth: 88,
};

const thBase = {
  ...tdBase,
  background: HEADER_BG,
  fontWeight: 700,
  color: "#475569",
  fontSize: 10.5,
  letterSpacing: "0.3px",
};

const rowAlt = { background: "#fafafa" };
const rowTotal = { background: TOTAL_BG, fontWeight: 700, color: NAVY };

function Head({ cols }) {
  return (
    <thead>
      <tr>
        {cols.map((c, i) => (
          <th
            key={i}
            style={{
              ...thBase,
              ...(c.right ? { textAlign: "right" } : {}),
              ...(c.width ? { width: c.width, minWidth: c.width } : {}),
            }}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function SuppliesRow({ num, label, row, stripe, total }) {
  return (
    <tr
      style={{
        ...(stripe ? rowAlt : undefined),
        ...(total ? rowTotal : undefined),
      }}
    >
      <td style={{ ...tdBase, width: 46 }}>{num}</td>
      <td style={{ ...tdBase, minWidth: 240 }}>{label}</td>
      <td style={tdNum}>{fmtNum(row.value)}</td>
      <td style={tdNum}>{fmtNum(row.cgst)}</td>
      <td style={tdNum}>{fmtNum(row.sgst)}</td>
      <td style={tdNum}>{fmtNum(row.igst)}</td>
      <td style={tdNum}>{fmtNum(row.cess)}</td>
    </tr>
  );
}

function ItcRow({ num, label, row, stripe, total }) {
  return (
    <tr
      style={{
        ...(stripe ? rowAlt : undefined),
        ...(total ? rowTotal : undefined),
      }}
    >
      <td style={{ ...tdBase, width: 46 }}>{num}</td>
      <td style={{ ...tdBase, minWidth: 240 }}>{label}</td>
      <td style={tdNum}>{fmtNum(row.igst)}</td>
      <td style={tdNum}>{fmtNum(row.cgst)}</td>
      <td style={tdNum}>{fmtNum(row.sgst)}</td>
      <td style={tdNum}>{fmtNum(row.cess)}</td>
    </tr>
  );
}

function TaxPaidRow({ num, label, payable, cash, itc, stripe, total }) {
  return (
    <tr
      style={{
        ...(stripe ? rowAlt : undefined),
        ...(total ? rowTotal : undefined),
      }}
    >
      <td style={{ ...tdBase, width: 46 }}>{num}</td>
      <td style={{ ...tdBase, minWidth: 220 }}>{label}</td>
      <td style={tdNum}>{fmtNum(payable)}</td>
      <td style={tdNum}>{fmtNum(cash)}</td>
      <td style={tdNum}>{fmtNum(itc)}</td>
      <td style={tdNum}>{fmtNum(round2(cash + itc))}</td>
    </tr>
  );
}

function InfoRow({ num, label, value, stripe }) {
  return (
    <tr style={stripe ? rowAlt : undefined}>
      <td style={{ ...tdBase, width: 46 }}>{num}</td>
      <td style={{ ...tdBase, minWidth: 260 }}>{label}</td>
      <td style={{ ...tdBase, width: 200, fontWeight: 600, color: "#475569" }}>
        {value}
      </td>
    </tr>
  );
}

function SectionHeader({ num, title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        background: HEADER_BG,
        border: "1px solid " + BORDER,
        padding: "7px 10px",
        marginTop: 20,
        marginBottom: 8,
      }}
    >
      <span
        style={{
          fontWeight: 800,
          color: NAVY,
          fontSize: 11.5,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#334155",
          textTransform: "uppercase",
          letterSpacing: "0.2px",
        }}
      >
        {title}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NUMBER HELPERS
───────────────────────────────────────────────────────────── */

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function getNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number) ? null : number;
}

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function roundAll(obj) {
  const out = {};
  Object.keys(obj).forEach((key) => {
    out[key] = round2(obj[key]);
  });
  return out;
}

/* ─────────────────────────────────────────────────────────────
   AUTH + FINANCIAL YEAR
───────────────────────────────────────────────────────────── */

function auth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return {
      adminId:
        user?.role === "admin" ? user?.id : user?.admin_id || null,
    };
  } catch {
    return { adminId: null };
  }
}

// 1 April → 31 March. `fy` looks like "2026-2027".
const fyToRange = (fy) => {
  const startYear = Number(String(fy || "").split("-")[0]);

  if (!startYear) {
    return { from: "", to: "" };
  }

  return {
    from: `${startYear}-04-01`,
    to: `${startYear + 1}-03-31`,
  };
};

function fyStartYearForDate(date) {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/* ─────────────────────────────────────────────────────────────
   STATE / GSTIN HELPERS
───────────────────────────────────────────────────────────── */

const STATE_NAME_TO_CODE = {
  jammuandkashmir: "01",
  jammuandkashmirjk: "01",
  himachalpradesh: "02",
  punjab: "03",
  chandigarh: "04",
  uttarakhand: "05",
  uttarakhandua: "05",
  haryana: "06",
  delhi: "07",
  newdelhi: "07",
  rajasthan: "08",
  uttarpradesh: "09",
  bihar: "10",
  sikkim: "11",
  arunachalpradesh: "12",
  nagaland: "13",
  manipur: "14",
  mizoram: "15",
  tripura: "16",
  meghalaya: "17",
  assam: "18",
  westbengal: "19",
  jharkhand: "20",
  odisha: "21",
  orissa: "21",
  chhattisgarh: "22",
  madhyapradesh: "23",
  gujarat: "24",
  dadranagarhavelianddamandiu: "25",
  dadraandnagarhaveli: "25",
  damananddiu: "25",
  maharashtra: "26",
  karnataka: "27",
  telangana: "28",
  andhrapradesh: "29",
  goa: "30",
  lakshadweep: "31",
  kerala: "32",
  tamilnadu: "33",
  tamilnaduandpuducherry: "33",
  puducherry: "34",
  andamanandnicobarislands: "35",
  ladakh: "38",
  otherterritory: "97",
  others: "99",
  other: "99",
};

const normName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

function getStateCodeFromGstin(value) {
  const s = String(value || "").trim().toUpperCase();

  if (!s || s.length < 2) {
    return null;
  }

  const prefix = s.slice(0, 2);

  if (/^\d{2}$/.test(prefix) && /^[0-9A-Z]+$/.test(s)) {
    return prefix;
  }

  return null;
}

function getStateCodeFromName(value) {
  const key = normName(value);

  if (!key || key.length < 4) {
    return null;
  }

  return STATE_NAME_TO_CODE[key] || null;
}

/* ─────────────────────────────────────────────────────────────
   GST / TAX HELPERS
───────────────────────────────────────────────────────────── */

function getTaxAmount(item) {
  const taxFields = ["gst_total", "tax_total", "gst_amount", "tax_amount"];

  for (const field of taxFields) {
    if (Object.prototype.hasOwnProperty.call(item || {}, field)) {
      const value = getNumber(item?.[field]);

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

function getTaxableValue(item) {
  return getNumber(
    item?.sub_total ?? item?.taxable_value ?? item?.taxableAmount ?? 0
  );
}

function getGstType(item) {
  return String(item?.gst_type ?? item?.gstType ?? "")
    .trim()
    .toLowerCase();
}

function isNonTaxTransaction(item) {
  if (!item) {
    return true;
  }

  const gstType = getGstType(item);

  if (
    gstType === "without_gst" ||
    gstType === "without gst" ||
    gstType === "non_tax" ||
    gstType === "non-tax" ||
    gstType === "exempt"
  ) {
    return true;
  }

  if (gstType === "with_gst" || gstType === "with gst" || gstType === "taxable") {
    return false;
  }

  const taxAmount = getTaxAmount(item);

  if (taxAmount !== null) {
    return taxAmount <= 0;
  }

  const products = Array.isArray(item?.products) ? item.products : [];

  if (products.length > 0) {
    let hasTaxableProduct = false;

    for (const product of products) {
      const gst = Number(
        product?.gst ??
          product?.gst_percentage ??
          product?.gstPercent ??
          product?.tax_rate ??
          0
      );

      if (gst > 0) {
        hasTaxableProduct = true;
        break;
      }
    }

    return !hasTaxableProduct;
  }

  return true;
}

const calculateIgst = (tax, interstate) => (interstate ? round2(tax) : 0);
const calculateCgst = (tax, interstate) => (interstate ? 0 : round2(tax / 2));
const calculateSgst = (tax, interstate) => (interstate ? 0 : round2(tax / 2));
const calculateCess = () => 0;

function resolveSaleInterState(inv, customerRecord, companyStateCode) {
  const coState = getStateCodeFromGstin(inv?.gstin) || companyStateCode;

  let partyState = getStateCodeFromGstin(inv?.customer_gst_no);

  if (!partyState && customerRecord) {
    partyState =
      getStateCodeFromGstin(customerRecord?.gst_no) ||
      getStateCodeFromName(customerRecord?.state);
  }

  if (!coState || !partyState) {
    return false;
  }

  return coState !== partyState;
}

function resolvePurchaseInterState(purchase, supplierRecord, companyStateCode) {
  const coState = getStateCodeFromGstin(purchase?.gstin) || companyStateCode;

  let partyState = getStateCodeFromGstin(purchase?.supplier_gstin);

  if (!partyState && supplierRecord) {
    partyState =
      getStateCodeFromGstin(supplierRecord?.gst_number) ||
      getStateCodeFromName(supplierRecord?.state);
  }

  if (!coState || !partyState) {
    return false;
  }

  return coState !== partyState;
}

/* ─────────────────────────────────────────────────────────────
   PRINT HELPER
───────────────────────────────────────────────────────────── */

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
        <title>${title || "GSTR 9"}</title>

        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 24px;
            color: #1e1b4b;
          }

          h2 {
            margin: 0 0 4px;
            font-size: 18px;
            color: #1e3a8a;
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
            margin-bottom: 14px;
          }

          th,
          td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
            text-align: left;
          }

          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
          }

          td.r,
          th.r {
            text-align: right;
          }

          tr.sec-wrap td {
            background: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
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

/* ─────────────────────────────────────────────────────────────
   GSTR 9 COMPONENT
───────────────────────────────────────────────────────────── */

export default function Gstr9() {
  const { adminId } = auth();

  const now = new Date();
  const currentFyStart = fyStartYearForDate(now);

  /* ── Filter state ─────────────────────────────────────────── */

  const [financialYear, setFinancialYear] = useState(
    `${currentFyStart}-${currentFyStart + 1}`
  );

  const fyOptions = useMemo(() => {
    const list = [];

    for (let y = currentFyStart - 4; y <= currentFyStart; y += 1) {
      list.push(`${y}-${y + 1}`);
    }

    return list;
  }, [currentFyStart]);

  const { from, to } = useMemo(() => fyToRange(financialYear), [financialYear]);

  const [considerExempt, setConsiderExempt] = useState(false);

  /* ── Companies ────────────────────────────────────────────── */

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");

  /* ── Data ─────────────────────────────────────────────────── */

  const [invoices, setInvoices] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(false);

  const printRef = useRef(null);

  /* ── Load companies ───────────────────────────────────────── */

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
      .catch((error) => {
        console.error("Company loading error:", error);
      });
  }, [adminId]);

  /* ── Selected company object ──────────────────────────────── */

  const companyObject = companies.find(
    (c) => String(c.id) === String(selectedCompany)
  );

  const companyStateCode = getStateCodeFromGstin(companyObject?.gstin);

  /* ── Reference maps ───────────────────────────────────────── */

  const customersMap = useMemo(() => {
    const map = new Map();
    customers.forEach((c) => map.set(String(c.id), c));
    return map;
  }, [customers]);

  const suppliersMap = useMemo(() => {
    const map = new Map();
    suppliers.forEach((s) => map.set(String(s.id), s));
    return map;
  }, [suppliers]);

  /* ── Fetch report ─────────────────────────────────────────── */

  const fetchReport = async (companyId) => {
    if (!companyId) return;

    setLoading(true);

    try {
      const invParams = { company_id: Number(companyId) };

      if (from) invParams.from_date = from;
      if (to) invParams.to_date = to;

      const [invRes, purRes, custRes, supRes] = await Promise.allSettled([
        api.get("/invoice/get_filtered_invoices", { params: invParams }),
        api.get("/purchase/get_purchases", {
          params: {
            company_id: Number(companyId),
            status: "submitted",
          },
        }),
        api.get("/customer/get_all_customer", {
          params: { admin_id: Number(adminId) },
        }),
        api.get("/supplier/get_all", {
          params: { company_id: Number(companyId) },
        }),
      ]);

      const invData =
        invRes.status === "fulfilled" && invRes.value?.data?.status
          ? invRes.value.data.data || []
          : [];

      let purData =
        purRes.status === "fulfilled" && purRes.value?.data?.status
          ? purRes.value.data.data || []
          : [];

      if (from && to) {
        purData = purData.filter((p) => {
          const date =
            p?.purchase_date || p?.created_at || p?.date || "";
          return date >= from && date <= to;
        });
      }

      const custData =
        custRes.status === "fulfilled" && custRes.value?.data?.status
          ? custRes.value.data.data || []
          : [];

      const supData =
        supRes.status === "fulfilled" && supRes.value?.data?.status
          ? supRes.value.data.data || []
          : [];

      setInvoices(invData);
      setPurchases(purData);
      setCustomers(custData);
      setSuppliers(supData);
    } catch (err) {
      console.error("GSTR 9 fetch error:", err);
      setInvoices([]);
      setPurchases([]);
      setCustomers([]);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedCompany) {
        fetchReport(selectedCompany);
      }
    }, 0);

    return () => clearTimeout(t);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, from, to]);

  /* ───────────────────────────────────────────────────────────
     Pt II — OUTWARD + INWARD SUPPLIES (annual)
  ─────────────────────────────────────────────────────────── */

  const outward = useMemo(() => {
    const taxable = { value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const nonTax = { value: 0 };

    invoices.forEach((inv) => {
      const customerRecord = customersMap.get(String(inv.customer_id));
      const inter = resolveSaleInterState(inv, customerRecord, companyStateCode);
      const tax = getTaxAmount(inv);
      const taxAmt = round2(tax ?? 0);
      const value = round2(getTaxableValue(inv));

      if (isNonTaxTransaction(inv)) {
        nonTax.value += value;
      } else {
        taxable.value += value;
        taxable.igst += calculateIgst(taxAmt, inter);
        taxable.cgst += calculateCgst(taxAmt, inter);
        taxable.sgst += calculateSgst(taxAmt, inter);
        taxable.cess += calculateCess();
      }
    });

    return {
      taxable: roundAll(taxable),
      nonTax: roundAll(nonTax),
    };
  }, [invoices, customersMap, companyStateCode]);

  const inward = useMemo(() => {
    const reverseCharge = { value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const itc = { igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const nonTax = { value: 0 };

    purchases.forEach((p) => {
      const supplierRecord = suppliersMap.get(String(p.supplier_id));
      const inter = resolvePurchaseInterState(p, supplierRecord, companyStateCode);
      const taxAmt = round2(getTaxAmount(p) ?? 0);
      const value = round2(getTaxableValue(p));

      reverseCharge.value += value;
      reverseCharge.igst += calculateIgst(taxAmt, inter);
      reverseCharge.cgst += calculateCgst(taxAmt, inter);
      reverseCharge.sgst += calculateSgst(taxAmt, inter);
      reverseCharge.cess += calculateCess();

      if (taxAmt > 0) {
        itc.igst += calculateIgst(taxAmt, inter);
        itc.cgst += calculateCgst(taxAmt, inter);
        itc.sgst += calculateSgst(taxAmt, inter);
        itc.cess += calculateCess();
      }

      if (isNonTaxTransaction(p)) {
        nonTax.value += value;
      }
    });

    return {
      reverseCharge: roundAll(reverseCharge),
      itc: roundAll(itc),
      nonTax: roundAll(nonTax),
    };
  }, [purchases, suppliersMap, companyStateCode]);

  /* ── Pt II rows + total ───────────────────────────────────── */

  const pt2Rows = useMemo(() => {
    return [
      {
        num: "4A",
        name: "Outward taxable supplies (other than zero rated, nil rated and exempted)",
        row: outward.taxable,
      },
      {
        num: "4B",
        name: "Inward supplies liable to reverse charge (other than 4C)",
        row: inward.reverseCharge,
      },
      {
        num: "4C",
        name: "Inward supplies liable to reverse charge (received from unregistered persons)",
        row: ZERO_ROW,
      },
      {
        num: "4D",
        name: "Inward supplies received from composition / unregistered suppliers",
        row: ZERO_ROW,
      },
      {
        num: "4E",
        name: "Input tax credit received from ISD",
        row: ZERO_ROW,
      },
      {
        num: "4F",
        name: "Import of goods",
        row: ZERO_ROW,
      },
      {
        num: "4G",
        name: "Import of services",
        row: ZERO_ROW,
      },
      {
        num: "5A",
        name: "Outward taxable supplies (zero rated)",
        row: ZERO_ROW,
      },
      {
        num: "5B",
        name: "Outward supplies (nil rated, exempted)",
        row: {
          ...ZERO_ROW,
          value: considerExempt ? outward.nonTax.value : 0,
        },
      },
      {
        num: "5C",
        name: "Non-GST outward supplies",
        row: {
          ...ZERO_ROW,
          value: considerExempt ? 0 : outward.nonTax.value,
        },
      },
      {
        num: "5D",
        name: "Non-GST inward supplies",
        row: {
          ...ZERO_ROW,
          value: considerExempt ? 0 : inward.nonTax.value,
        },
      },
      {
        num: "5E",
        name: "Inward supplies (nil rated, non-GST)",
        row: ZERO_ROW,
      },
    ];
  }, [outward, inward, considerExempt]);

  const pt2Totals = useMemo(() => {
    return pt2Rows.reduce(
      (acc, r) => {
        acc.value += r.row.value;
        acc.igst += r.row.igst;
        acc.cgst += r.row.cgst;
        acc.sgst += r.row.sgst;
        acc.cess += r.row.cess;
        return acc;
      },
      { value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }
    );
  }, [pt2Rows]);

  /* ── Pt III — ITC as declared ─────────────────────────────── */

  const pt3Available = useMemo(() => {
    return [
      { num: "6A", name: "Import of goods", row: ZERO_ITC },
      { num: "6B", name: "Import of services", row: ZERO_ITC },
      {
        num: "6C",
        name: "Inward supplies liable to reverse charge (other than 6A & 6B above)",
        row: ZERO_ITC,
      },
      { num: "6D", name: "Inward supplies from ISD", row: ZERO_ITC },
      { num: "6E", name: "All other ITC", row: inward.itc },
    ];
  }, [inward]);

  const pt3Ineligible = useMemo(() => {
    return [
      { num: "6F", name: "Ineligible ITC as per section 17(5)", row: ZERO_ITC },
      { num: "6G", name: "Ineligible ITC — others", row: ZERO_ITC },
    ];
  }, []);

  const sumItc = (rows) =>
    rows.reduce(
      (acc, r) => {
        acc.igst += r.row.igst;
        acc.cgst += r.row.cgst;
        acc.sgst += r.row.sgst;
        acc.cess += r.row.cess;
        return acc;
      },
      { igst: 0, cgst: 0, sgst: 0, cess: 0 }
    );

  const pt3AvailableTotal = useMemo(() => roundAll(sumItc(pt3Available)), [pt3Available]);
  const pt3IneligibleTotal = useMemo(() => roundAll(sumItc(pt3Ineligible)), [pt3Ineligible]);

  /* ── Pt IV — Tax paid as declared ─────────────────────────── */

  const taxPaid = useMemo(() => {
    const payable = {
      igst: round2(outward.taxable.igst + inward.reverseCharge.igst),
      cgst: round2(outward.taxable.cgst + inward.reverseCharge.cgst),
      sgst: round2(outward.taxable.sgst + inward.reverseCharge.sgst),
      cess: round2(outward.taxable.cess + inward.reverseCharge.cess),
    };

    const viaItc = {
      igst: round2(Math.min(payable.igst, inward.itc.igst)),
      cgst: round2(Math.min(payable.cgst, inward.itc.cgst)),
      sgst: round2(Math.min(payable.sgst, inward.itc.sgst)),
      cess: round2(Math.min(payable.cess, inward.itc.cess)),
    };

    const cash = {
      igst: round2(payable.igst - viaItc.igst),
      cgst: round2(payable.cgst - viaItc.cgst),
      sgst: round2(payable.sgst - viaItc.sgst),
      cess: round2(payable.cess - viaItc.cess),
    };

    return { payable, viaItc, cash };
  }, [outward, inward]);

  const pt4Rows = [
    {
      num: "7",
      name: "Integrated tax",
      payable: taxPaid.payable.igst,
      cash: taxPaid.cash.igst,
      itc: taxPaid.viaItc.igst,
    },
    {
      num: "7",
      name: "Central tax",
      payable: taxPaid.payable.cgst,
      cash: taxPaid.cash.cgst,
      itc: taxPaid.viaItc.cgst,
    },
    {
      num: "7",
      name: "State/UT tax",
      payable: taxPaid.payable.sgst,
      cash: taxPaid.cash.sgst,
      itc: taxPaid.viaItc.sgst,
    },
    {
      num: "7",
      name: "Cess",
      payable: taxPaid.payable.cess,
      cash: taxPaid.cash.cess,
      itc: taxPaid.viaItc.cess,
    },
    { num: "8", name: "Late fee", payable: 0, cash: 0, itc: 0 },
    { num: "9", name: "Interest", payable: 0, cash: 0, itc: 0 },
  ];

  const pt4Totals = pt4Rows.reduce(
    (acc, r) => {
      acc.payable += r.payable;
      acc.cash += r.cash;
      acc.itc += r.itc;
      return acc;
    },
    { payable: 0, cash: 0, itc: 0 }
  );

  /* ── Pt V — Previous FY transactions ──────────────────────── */

  const pt5Rows = [
    {
      num: "10A",
      name: "Supplies (outward) declared in April to September of current FY relating to previous FY",
      row: ZERO_ROW,
    },
    {
      num: "10B",
      name: "Inward supplies liable to reverse charge (previous FY)",
      row: ZERO_ROW,
    },
    {
      num: "10C",
      name: "ITC for the previous FY claimed in April to September of current FY",
      row: {
        igst: 0,
        value: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
    },
  ];

  /* ── Pt VI — Other information ────────────────────────────── */

  const pt6Rows = [
    { num: "11", name: "Particulars of demands and refunds", value: "Nil" },
    {
      num: "12",
      name: "Information on supplies of goods/capital goods/services from composition supplier",
      value: "No",
    },
    {
      num: "13",
      name: "Details of copies of GSTR-1 and GSTR-2 submitted to different authorities",
      value: "No",
    },
    {
      num: "14",
      name: "Particulars of removal of goods from customs and re-import/deemed export/EOU",
      value: "Nil",
    },
    {
      num: "15",
      name: "Details of registered persons",
      value: companyObject?.gstin || "—",
    },
    {
      num: "16",
      name: "Particulars of finalization of liability for the period",
      value: "No",
    },
    { num: "17", name: "Particulars of demands and pending returns", value: "Nil" },
    { num: "18", name: "Other information", value: "" },
    { num: "19", name: "Issuance of credit note", value: "No" },
  ];

  /* ── HSN-wise summary of outward supplies ─────────────────── */

  const hsnOutward = useMemo(() => {
    const map = new Map();
    let fallback = false;

    invoices.forEach((inv) => {
      const customerRecord = customersMap.get(String(inv.customer_id));
      const inter = resolveSaleInterState(inv, customerRecord, companyStateCode);
      const products = Array.isArray(inv?.products) ? inv.products : [];

      products.forEach((line) => {
        const hsnRaw = String(line?.hsn || line?.hsn_code || "").trim();

        if (!hsnRaw) fallback = true;

        const key =
          hsnRaw ||
          String(line?.product_code || line?.product_name || "—").trim() ||
          "—";

        const qty = Number(line?.qty || 0) + Number(line?.free_qty || 0);
        const taxAmt = round2(
          Number(line?.tax_amount ?? line?.gst_amount ?? 0)
        );
        const rate = Number(
          line?.gst ?? line?.gst_percentage ?? line?.tax_rate ?? 0
        );
        const base = round2(Number(line?.amount ?? 0) - taxAmt);

        const entry =
          map.get(key) ||
          {
            hsn: key,
            uqc: String(line?.unit || ""),
            qty: 0,
            base: 0,
            rate,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0,
          };

        entry.qty += qty;
        entry.base += base;
        entry.igst += calculateIgst(taxAmt, inter);
        entry.cgst += calculateCgst(taxAmt, inter);
        entry.sgst += calculateSgst(taxAmt, inter);
        entry.cess += calculateCess();
        map.set(key, entry);
      });
    });

    const rows = Array.from(map.values()).map((e) => ({
      ...e,
      qty: round2(e.qty),
      base: round2(e.base),
      igst: round2(e.igst),
      cgst: round2(e.cgst),
      sgst: round2(e.sgst),
      cess: round2(e.cess),
    }));

    return { rows, fallback };
  }, [invoices, customersMap, companyStateCode]);

  const hsnOutwardTotal = useMemo(() => {
    return hsnOutward.rows.reduce(
      (acc, e) => {
        acc.qty += e.qty;
        acc.base += e.base;
        acc.igst += e.igst;
        acc.cgst += e.cgst;
        acc.sgst += e.sgst;
        acc.cess += e.cess;
        return acc;
      },
      { qty: 0, base: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }
    );
  }, [hsnOutward]);

  /* ── Shared UI pieces ─────────────────────────────────────── */

  const selectStyle = {
    height: 34,
    padding: "0 30px 0 10px",
    border: "1px solid " + BORDER,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: FONT,
    color: "#334155",
    outline: "none",
    background: "#fff",
    minWidth: 150,
    cursor: "pointer",
  };

  const fieldLabelStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 3,
  };

  const iconBtn = {
    width: 38,
    height: 38,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#fff",
    border: "1px solid " + BORDER,
    boxShadow: "0 1px 2px rgba(15,23,42,.05)",
    cursor: "pointer",
    padding: 0,
    fontFamily: FONT,
    transition: "box-shadow .15s ease, border-color .15s ease",
  };

  const iconBtnDisabled = {
    ...iconBtn,
    opacity: 0.45,
    cursor: "not-allowed",
  };

  const tableWrap = {
    border: "1px solid " + BORDER,
  };

  /* ── Export Excel ─────────────────────────────────────────── */

  const exportXls = () => {
    if (invoices.length === 0 && purchases.length === 0) {
      alert("No data available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();

    const basic = [
      { SNo: "1", Field: "Financial Year", Value: financialYear },
      { SNo: "2", Field: "GSTIN", Value: companyObject?.gstin || "" },
      { SNo: "3A", Field: "Legal Name", Value: companyObject?.company_name || "" },
      { SNo: "3B", Field: "Trade Name (if any)", Value: "" },
    ];

    const supplies = pt2Rows.map((r) => ({
      SNo: r.num,
      Description: r.name,
      "Taxable Value": r.row.value,
      "Central Tax": r.row.cgst,
      "State/UT Tax": r.row.sgst,
      "Integrated Tax": r.row.igst,
      Cess: r.row.cess,
    }));

    const itc = [
      ...pt3Available.map((r) => ({
        SNo: r.num,
        Description: r.name,
        IGST: r.row.igst,
        CGST: r.row.cgst,
        "SGST/UT": r.row.sgst,
        Cess: r.row.cess,
      })),
      ...pt3Ineligible.map((r) => ({
        SNo: r.num,
        Description: r.name,
        IGST: r.row.igst,
        CGST: r.row.cgst,
        "SGST/UT": r.row.sgst,
        Cess: r.row.cess,
      })),
    ];

    const taxPaidSheet = pt4Rows.map((r) => ({
      SNo: r.num,
      Description: r.name,
      "Tax Payable": r.payable,
      "Paid through Cash": r.cash,
      "Paid through ITC": r.itc,
      Total: r.cash + r.itc,
    }));

    const pt5Sheet = pt5Rows.map((r) => ({
      SNo: r.num,
      Description: r.name,
      "Taxable Value": r.row.value,
      "Central Tax": r.row.cgst,
      "State/UT Tax": r.row.sgst,
      "Integrated Tax": r.row.igst,
      Cess: r.row.cess,
    }));

    const pt6Sheet = pt6Rows.map((r) => ({
      SNo: r.num,
      Particulars: r.name,
      Response: r.value,
    }));

    const hsnOutSheet = hsnOutward.rows.map((e) => ({
      "HSN/Product Code": String(e.hsn),
      UQC: e.uqc,
      "Total Quantity": e.qty,
      "Taxable Value": e.base,
      "Rate of Tax": e.rate,
      "Central Tax": e.cgst,
      "State/UT Tax": e.sgst,
      "Integrated Tax": e.igst,
      Cess: e.cess,
    }));

    const hsnInSheet = [
      {
        Note: "Line-item data is not available for purchases; no HSN-wise inward summary can be prepared from the current dataset.",
      },
    ];

    const append = (name, rows) => {
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    append("Pt I-II", [...basic, {}, ...supplies]);
    append("Pt III", itc);
    append("Pt IV", taxPaidSheet);
    append("Pt V", pt5Sheet);
    append("Pt VI", pt6Sheet);
    append("HSN Outward", hsnOutSheet);
    append("HSN Inward", hsnInSheet);

    XLSX.writeFile(wb, `GSTR_9_${financialYear}.xlsx`);
  };

  /* ── Print ────────────────────────────────────────────────── */

  const handlePrint = () => {
    if (invoices.length === 0 && purchases.length === 0) {
      alert("No data available to print.");
      return;
    }

    if (printRef.current) {
      const temp = document.createElement("div");

      temp.innerHTML =
        `<h2 style="margin:0 0 4px;font-size:18px;color:#1e3a8a;">GSTR9 REPORT</h2>
        <div class="meta">Financial Year: <strong>${financialYear}</strong> &nbsp;|&nbsp; Firm: ${
          companyObject?.company_name || "-"
        } (GSTIN ${companyObject?.gstin || "-"}) &nbsp;|&nbsp; Consider non-tax as exempted: ${
          considerExempt ? "Yes" : "No"
        }</div>` + printRef.current.innerHTML;

      printElement(temp, "GSTR 9");
    }
  };

const checkboxInputStyle = {
    width: 15,
    height: 15,
    margin: 0,
    accentColor: "#4338ca",
    cursor: "pointer",
  };

  const checkboxLabelStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    height: 34,
    fontSize: 10.5,
    fontWeight: 700,
    color: "#475569",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  /* ── Render ───────────────────────────────────────────────── */

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "6px 14px 24px",
        boxSizing: "border-box",
        fontFamily: FONT,
      }}
    >
      {/* Top filter + actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div>
          <div style={fieldLabelStyle}>Financial Year</div>

          <select
            value={financialYear}
            onChange={(e) => setFinancialYear(e.target.value)}
            style={selectStyle}
          >
            {fyOptions.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <button
            type="button"
            title="Export Excel"
            aria-label="Export Excel"
            onClick={exportXls}
            style={selectedCompany ? iconBtn : iconBtnDisabled}
            disabled={!selectedCompany}
          >
            <FileSpreadsheet size={17} color="#16a34a" />
          </button>

          <button
            type="button"
            title="Print"
            aria-label="Print"
            onClick={handlePrint}
            style={selectedCompany ? iconBtn : iconBtnDisabled}
            disabled={!selectedCompany}
          >
            <Printer size={17} color="#4338ca" />
          </button>
        </div>
      </div>

      {/* Title row */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#1e1b4b",
              lineHeight: 1.2,
            }}
          >
            GSTR9 REPORT
          </span>

          {loading && (
            <RefreshCw
              size={13}
              style={{ animation: "spin 1s linear infinite", color: "#94a3b8" }}
            />
          )}
        </div>

        <label style={{ ...checkboxLabelStyle, marginLeft: "auto" }}>
          <input
            type="checkbox"
            checked={considerExempt}
            onChange={(e) => setConsiderExempt(e.target.checked)}
            style={checkboxInputStyle}
          />
          CONSIDER NON-TAX AS EXEMPTED
        </label>
      </div>

      {!selectedCompany ? (
        <div
          style={{
            border: "1.5px dashed " + BORDER,
            borderRadius: 10,
            background: "#fff",
            padding: 48,
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          Select a firm to generate the GSTR-9 annual return.
        </div>
      ) : (
        <div ref={printRef}>
          {/* Pt. I — Basic details */}
          <SectionHeader num="Pt. I" title="Basic Details" />

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <Head
              cols={[
                { label: "#", width: 46 },
                { label: "Field" },
                { label: "Value" },
              ]}
            />
            <tbody>
              <tr>
                <td style={{ ...tdBase, width: 46 }}>1</td>
                <td style={{ ...tdBase, minWidth: 260 }}>Financial Year</td>
                <td style={{ ...tdBase, width: 220, fontWeight: 600 }}>
                  {financialYear}
                </td>
              </tr>
              <tr style={rowAlt}>
                <td style={{ ...tdBase, width: 46 }}>2</td>
                <td style={{ ...tdBase, minWidth: 260 }}>GSTIN</td>
                <td style={{ ...tdBase, width: 220, fontWeight: 600 }}>
                  {companyObject?.gstin || ""}
                </td>
              </tr>
              <tr>
                <td style={{ ...tdBase, width: 46 }}>3A</td>
                <td style={{ ...tdBase, minWidth: 260 }}>Legal Name</td>
                <td style={{ ...tdBase, width: 220, fontWeight: 600 }}>
                  {companyObject?.company_name || ""}
                </td>
              </tr>
              <tr style={rowAlt}>
                <td style={{ ...tdBase, width: 46 }}>3B</td>
                <td style={{ ...tdBase, minWidth: 260 }}>Trade Name (if any)</td>
                <td style={{ ...tdBase, width: 220 }} />
              </tr>
            </tbody>
          </table>

          {/* Pt. II — Outward & inward supplies */}
          <SectionHeader
            num="Pt. II"
            title="Details Of Outward And Inward Supplies Declared During The Financial Year"
          />

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <Head
                cols={[
                  { label: "#", width: 46 },
                  { label: "Description" },
                  { label: "Taxable Value", right: true },
                  { label: "Central Tax", right: true },
                  { label: "State/UT Tax", right: true },
                  { label: "Integrated Tax", right: true },
                  { label: "Cess", right: true },
                ]}
              />
              <tbody>
                {pt2Rows.map((r, i) => (
                  <SuppliesRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    row={r.row}
                    stripe={i % 2 === 1}
                  />
                ))}
                <SuppliesRow num="6" label="Total" row={pt2Totals} total />
              </tbody>
            </table>
          </div>

          {/* Pt. III — ITC */}
          <SectionHeader
            num="Pt. III"
            title="Details Of ITCs As Declared In Returns Filed During The Financial Year"
          />

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <Head
                cols={[
                  { label: "#", width: 46 },
                  { label: "Description" },
                  { label: "IGST", right: true },
                  { label: "CGST", right: true },
                  { label: "SGST/UT", right: true },
                  { label: "Cess", right: true },
                ]}
              />
              <tbody>
                {pt3Available.map((r, i) => (
                  <ItcRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    row={r.row}
                    stripe={i % 2 === 1}
                  />
                ))}
                <ItcRow
                  num=""
                  label="Total ITC available (6A-6E)"
                  row={pt3AvailableTotal}
                  total
                />
                {pt3Ineligible.map((r, i) => (
                  <ItcRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    row={r.row}
                    stripe={i % 2 === 1}
                  />
                ))}
                <ItcRow
                  num=""
                  label="Total ITC ineligible (6F-6G)"
                  row={pt3IneligibleTotal}
                  total
                />
              </tbody>
            </table>
          </div>

          {/* Pt. IV — Tax paid */}
          <SectionHeader
            num="Pt. IV"
            title="Details Of Tax Paid As Declared In Returns Filed During The Financial Year"
          />

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <Head
                cols={[
                  { label: "#", width: 46 },
                  { label: "Description" },
                  { label: "Tax Payable", right: true },
                  { label: "Paid Through Cash", right: true },
                  { label: "Paid Through ITC", right: true },
                  { label: "Total", right: true },
                ]}
              />
              <tbody>
                {pt4Rows.map((r, i) => (
                  <TaxPaidRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    payable={r.payable}
                    cash={r.cash}
                    itc={r.itc}
                    stripe={i % 2 === 1}
                  />
                ))}
                <TaxPaidRow
                  num=""
                  label="Total"
                  payable={pt4Totals.payable}
                  cash={pt4Totals.cash}
                  itc={pt4Totals.itc}
                  total
                />
              </tbody>
            </table>
          </div>

          {/* Pt. V — Previous FY transactions */}
          <SectionHeader
            num="Pt. V"
            title="Particulars Of The Transactions For The Previous FY Declared In Returns Of April To September Of Current FY Or Upto Date Of Filing Of Annual Return Of Previous FY Whichever Is Earlier"
          />

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <Head
                cols={[
                  { label: "#", width: 46 },
                  { label: "Description" },
                  { label: "Taxable Value", right: true },
                  { label: "Central Tax", right: true },
                  { label: "State/UT Tax", right: true },
                  { label: "Integrated Tax", right: true },
                  { label: "Cess", right: true },
                ]}
              />
              <tbody>
                {pt5Rows.map((r, i) => (
                  <SuppliesRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    row={r.row}
                    stripe={i % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pt. VI — Other information */}
          <SectionHeader num="Pt. VI" title="Other Information" />

          <div style={tableWrap}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <Head
                cols={[
                  { label: "#", width: 46 },
                  { label: "Particulars" },
                  { label: "Response" },
                ]}
              />
              <tbody>
                {pt6Rows.map((r, i) => (
                  <InfoRow
                    key={i}
                    num={r.num}
                    label={r.name}
                    value={r.value}
                    stripe={i % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* HSN-wise summary — outward supplies */}
          <SectionHeader
            num="Pt. VI"
            title="HSN-Wise Summary Of Outward Supplies"
          />

          {hsnOutward.fallback && (
            <div
              style={{
                fontSize: 10.5,
                color: "#94a3b8",
                marginBottom: 6,
                fontFamily: FONT,
              }}
            >
              HSN codes are not stored in the data; entries are grouped by
              product code.
            </div>
          )}

          <div style={{ ...tableWrap, overflowX: "auto" }}>
            <table
              style={{
                borderCollapse: "collapse",
                minWidth: 860,
                width: "100%",
              }}
            >
              <Head
                cols={[
                  { label: "HSN Code", width: 120 },
                  { label: "UQC", width: 70 },
                  { label: "Total Quantity", right: true },
                  { label: "Taxable Value", right: true },
                  { label: "Rate of Tax", right: true },
                  { label: "Central Tax", right: true },
                  { label: "State/UT Tax", right: true },
                  { label: "Integrated Tax", right: true },
                  { label: "Cess", right: true },
                ]}
              />
              <tbody>
                {hsnOutward.rows.map((e, i) => (
                  <tr key={i} style={i % 2 === 1 ? rowAlt : undefined}>
                    <td style={tdBase}>{e.hsn}</td>
                    <td style={{ ...tdBase, textAlign: "center" }}>{e.uqc}</td>
                    <td style={tdNum}>{fmtNum(e.qty)}</td>
                    <td style={tdNum}>{fmtNum(e.base)}</td>
                    <td style={tdNum}>{e.rate}%</td>
                    <td style={tdNum}>{fmtNum(e.cgst)}</td>
                    <td style={tdNum}>{fmtNum(e.sgst)}</td>
                    <td style={tdNum}>{fmtNum(e.igst)}</td>
                    <td style={tdNum}>{fmtNum(e.cess)}</td>
                  </tr>
                ))}
                <tr style={rowTotal}>
                  <td style={{ ...tdBase, fontWeight: 700 }} colSpan="2">
                    Total
                  </td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.qty)}</td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.base)}</td>
                  <td style={tdNum}>—</td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.cgst)}</td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.sgst)}</td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.igst)}</td>
                  <td style={tdNum}>{fmtNum(hsnOutwardTotal.cess)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* HSN-wise summary — inward supplies */}
          <SectionHeader
            num="Pt. VI"
            title="HSN-Wise Summary Of Inward Supplies"
          />

          <div style={tableWrap}>
            <table
              style={{
                borderCollapse: "collapse",
                minWidth: 860,
                width: "100%",
              }}
            >
              <Head
                cols={[
                  { label: "HSN Code", width: 120 },
                  { label: "UQC", width: 70 },
                  { label: "Total Quantity", right: true },
                  { label: "Taxable Value", right: true },
                  { label: "Rate of Tax", right: true },
                  { label: "Central Tax", right: true },
                  { label: "State/UT Tax", right: true },
                  { label: "Integrated Tax", right: true },
                  { label: "Cess", right: true },
                ]}
              />
              <tbody>
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      ...tdBase,
                      padding: 18,
                      textAlign: "center",
                      color: "#94a3b8",
                    }}
                  >
                    Line-item data is not available for purchases; no HSN-wise
                    inward summary can be prepared from the current dataset.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}