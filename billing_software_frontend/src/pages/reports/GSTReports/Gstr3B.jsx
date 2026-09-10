import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  FileJson,
  FileSpreadsheet,
  Printer,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const BORDER = "#e2e8f0";
const NAVY = "#1e3a8a";
const HEADER_BG = "#f1f5f9";
const TOTAL_BG = "#eef2ff";

/* ─────────────────────────────────────────────────────────────
   DATE RANGE HELPERS
───────────────────────────────────────────────────────────── */

// Native <input type="date"> always yields YYYY-MM-DD.
// This helper guarantees the exact format sent to the API.
function formatDateForApi(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

// Converts YYYY-MM-DD → DD/MM/YYYY for display.
function formatDateForDisplay(value) {
  const m = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
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
   AUTH
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

/* ─────────────────────────────────────────────────────────────
   STATE / GSTIN HELPERS
───────────────────────────────────────────────────────────── */

const STATE_CODES = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Dadra & Nagar Haveli and Daman & Diu",
  "26": "Maharashtra",
  "27": "Karnataka",
  "28": "Telangana",
  "29": "Andhra Pradesh",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Other",
};

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

function getStateLabel(code) {
  if (!code) {
    return "—";
  }

  return STATE_CODES[code] || `State ${code}`;
}

/* ─────────────────────────────────────────────────────────────
   GST / TAX HELPERS
───────────────────────────────────────────────────────────── */

/*
 * Priority for reading the actual tax amount of a transaction:
 *   gst_total  →  tax_total  →  gst_amount  →  tax_amount
 */
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

/*
 * Taxable value comes from the actual transaction base amount.
 */
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

/*
 * Non-tax detection.
 *
 * Priority:
 *   1. Invoice-level gst_type (without_gst / non_tax / exempt → non-tax).
 *   2. Actual invoice tax amount (tax <= 0 → non-tax when field exists).
 *   3. Product GST (fallback only when invoice-level info is missing).
 *
 * A transaction with actual tax > 0 is NEVER treated as non-tax/exempt.
 */
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

    if (hasTaxableProduct) {
      return false;
    }

    return true;
  }

  return true;
}

/*
 * Tax split helpers.  Undeterminable supplies are treated as
 * intra-state (CGST + SGST), which is the standard retail default
 * when no inter-state evidence exists in the data.
 */
const calculateIgst = (tax, interstate) => (interstate ? round2(tax) : 0);
const calculateCgst = (tax, interstate) => (interstate ? 0 : round2(tax / 2));
const calculateSgst = (tax, interstate) => (interstate ? 0 : round2(tax / 2));
const calculateCess = () => 0;

/*
 * Inter-state detection for a SALE invoice.
 *
 * Uses actual GSTIN state codes (company vs customer) and falls back
 * to the customer record's state field when available.
 * Returns false when the supply cannot be established as inter-state.
 */
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

/*
 * Inter-state detection for a PURCHASE.
 *
 * Uses the supplier GSTIN state code and falls back to the supplier
 * record's state field when available.
 */
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

function isUnregisteredCustomer(inv, customerRecord) {
  const gstin = String(
    inv?.customer_gst_no ?? customerRecord?.gst_no ?? ""
  )
    .trim();

  return !gstin;
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
        <title>${title || "GSTR 3B"}</title>

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

          h3.sec {
            margin: 22px 0 8px;
            font-size: 13px;
            color: #1e3a8a;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 6px;
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

          th.section-title {
            background: #1e3a8a;
            color: #ffffff;
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
   GSTR 3B COMPONENT
───────────────────────────────────────────────────────────── */

export default function Gstr3B() {
  const { adminId } = auth();

  const now = new Date();

  /* ── Date filters ─────────────────────────────────────────── */

  const [fromDate, setFromDate] = useState(() => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}-01`;
  });

  const [toDate, setToDate] = useState(() => {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    return `${y}-${String(m).padStart(2, "0")}-${String(
      lastDayOfMonth(y, m)
    ).padStart(2, "0")}`;
  });

  /* ── Checkbox ─────────────────────────────────────────────── */

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

  const tableWrapRef = useRef(null);

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

  /* ── Date range ───────────────────────────────────────────── */

  const { start, end } = useMemo(
    () => ({ start: fromDate, end: toDate }),
    [fromDate, toDate]
  );

  const dateError = !!(start && end && start > end);

  /* ── Selected company object & state code ─────────────────── */

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

      if (start) invParams.from_date = formatDateForApi(start);
      if (end) invParams.to_date = formatDateForApi(end);

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

      if (start && end) {
        purData = purData.filter((p) => {
          const date =
            p?.purchase_date || p?.created_at || p?.date || "";
          return date >= start && date <= end;
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
      console.error("GSTR 3B fetch error:", err);
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
  }, [selectedCompany, start, end]);

  /* ───────────────────────────────────────────────────────────
     OUTWARD SUPPLIES (SALES) — Section 1
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

  /* ───────────────────────────────────────────────────────────
     INWARD SUPPLIES (PURCHASES) — Section 1 (reverse charge),
     Section 3 (ITC) and Section 4 (exempt / non-GST)
  ─────────────────────────────────────────────────────────── */

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

  /* ───────────────────────────────────────────────────────────
     SECTION 1 — ROWS
  ─────────────────────────────────────────────────────────── */

  const section1Rows = useMemo(() => {
    const rows = [
      {
        name: "Outward taxable supplies (other than zero rated, nil rated and exempted)",
        value: outward.taxable.value,
        igst: outward.taxable.igst,
        cgst: outward.taxable.cgst,
        sgst: outward.taxable.sgst,
        cess: outward.taxable.cess,
      },
      {
        name: "Outward supplies (zero rated)",
        value: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        name: "Other outward supplies (nil rated, exempted)",
        value: considerExempt ? outward.nonTax.value : 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      {
        name: "Inward supplies (liable to reverse charge)",
        value: inward.reverseCharge.value,
        igst: inward.reverseCharge.igst,
        cgst: inward.reverseCharge.cgst,
        sgst: inward.reverseCharge.sgst,
        cess: inward.reverseCharge.cess,
      },
      {
        name: "Non-GST outward supplies",
        value: considerExempt ? 0 : outward.nonTax.value,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
    ];

    return rows;
  }, [outward, inward, considerExempt]);

  const section1Totals = useMemo(() => {
    return section1Rows.reduce(
      (acc, r) => {
        acc.value += r.value;
        acc.igst += r.igst;
        acc.cgst += r.cgst;
        acc.sgst += r.sgst;
        acc.cess += r.cess;
        return acc;
      },
      { value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 }
    );
  }, [section1Rows]);

  /* ───────────────────────────────────────────────────────────
     SECTION 2 — INTER-STATE TO UNREGISTERED / COMPOSITION / UIN
     (grouped by Place Of Supply, using actual customer data)
  ─────────────────────────────────────────────────────────── */

  const section2Groups = useMemo(() => {
    const map = new Map();

    invoices.forEach((inv) => {
      if (isNonTaxTransaction(inv)) return;

      const customerRecord = customersMap.get(String(inv.customer_id));

      if (!isUnregisteredCustomer(inv, customerRecord)) return;

      const coState = getStateCodeFromGstin(inv?.gstin) || companyStateCode;
      const partyState = getStateCodeFromName(customerRecord?.state);

      if (!coState || !partyState || coState === partyState) return;

      const posLabel = getStateLabel(partyState);
      const taxAmt = round2(getTaxAmount(inv) ?? 0);
      const value = round2(getTaxableValue(inv));

      const entry = map.get(posLabel) || { pos: posLabel, taxable: 0, igst: 0 };
      entry.taxable += value;
      entry.igst += taxAmt;
      map.set(posLabel, entry);
    });

    return Array.from(map.values()).map((e) => ({
      pos: e.pos,
      taxable: round2(e.taxable),
      igst: round2(e.igst),
    }));
  }, [invoices, customersMap, companyStateCode]);

  const section2Totals = useMemo(() => {
    return section2Groups.reduce(
      (acc, g) => {
        acc.taxable += g.taxable;
        acc.igst += g.igst;
        return acc;
      },
      { taxable: 0, igst: 0 }
    );
  }, [section2Groups]);

  /* ───────────────────────────────────────────────────────────
     SECTION 3 — ELIGIBLE INPUT TAX CREDIT
  ─────────────────────────────────────────────────────────── */

  const section3 = useMemo(() => {
    const available = [
      { name: "Import of goods", igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { name: "Import of services", igst: 0, cgst: 0, sgst: 0, cess: 0 },
      {
        name: "Inward supplies liable to reverse charge (other than 1 & 2 above)",
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0,
      },
      { name: "Inward supplies from ISD", igst: 0, cgst: 0, sgst: 0, cess: 0 },
      {
        name: "All other ITC",
        igst: inward.itc.igst,
        cgst: inward.itc.cgst,
        sgst: inward.itc.sgst,
        cess: inward.itc.cess,
      },
    ];

    const ineligible = [
      { name: "As per section 17(5)", igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { name: "Others", igst: 0, cgst: 0, sgst: 0, cess: 0 },
    ];

    const total = (rows) =>
      rows.reduce(
        (acc, r) => {
          acc.igst += r.igst;
          acc.cgst += r.cgst;
          acc.sgst += r.sgst;
          acc.cess += r.cess;
          return acc;
        },
        { igst: 0, cgst: 0, sgst: 0, cess: 0 }
      );

    return {
      available,
      ineligible,
      availableTotal: roundAll(total(available)),
      ineligibleTotal: roundAll(total(ineligible)),
    };
  }, [inward]);

  /* ───────────────────────────────────────────────────────────
     SECTION 4 — EXEMPT / NIL / NON-GST INWARD SUPPLIES
  ─────────────────────────────────────────────────────────── */

  const section4 = useMemo(() => {
    const row1 = { inter: 0, intra: 0 };
    const row2 = { inter: 0, intra: 0 };

    purchases.forEach((p) => {
      if (!isNonTaxTransaction(p)) return;

      const supplierRecord = suppliersMap.get(String(p.supplier_id));
      const inter = resolvePurchaseInterState(p, supplierRecord, companyStateCode);
      const value = round2(getTaxableValue(p));
      const target = considerExempt ? row1 : row2;

      target[inter ? "inter" : "intra"] += value;
    });

    return {
      row1: roundAll(row1),
      row2: roundAll(row2),
    };
  }, [purchases, suppliersMap, companyStateCode, considerExempt]);

  /* ───────────────────────────────────────────────────────────
     STYLES
  ─────────────────────────────────────────────────────────── */

  const selectStyle = {
    height: 34,
    padding: "0 26px 0 9px",
    border: "1px solid " + BORDER,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: FONT,
    color: "#334155",
    outline: "none",
    background: "#fff",
    minWidth: 120,
    cursor: "pointer",
  };

  const dateInputStyle = {
    height: 34,
    width: 190,
    padding: "0 9px",
    border: "1px solid " + BORDER,
    borderRadius: 6,
    fontSize: 12,
    fontFamily: FONT,
    color: "#334155",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
  };

  const fieldLabelStyle = {
    fontSize: 10,
    fontWeight: 700,
    color: "#94a3b8",
    marginBottom: 3,
    textTransform: "none",
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

  const sectionTitleStyle = {
    fontSize: 13,
    fontWeight: 800,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: "0.2px",
    marginBottom: 8,
  };

  const thStyle = {
    padding: "7px 9px",
    fontSize: 10.5,
    fontWeight: 700,
    color: "#334155",
    background: HEADER_BG,
    border: "1px solid " + BORDER,
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  const thNumStyle = { ...thStyle, textAlign: "right" };

  const tdStyle = {
    padding: "6px 9px",
    fontSize: 11.5,
    border: "1px solid " + BORDER,
    color: "#1e293b",
  };

  const tdNumStyle = { ...tdStyle, textAlign: "right", whiteSpace: "nowrap" };

  const totalRowStyle = {
    background: TOTAL_BG,
    fontWeight: 800,
    color: "#1e1b4b",
  };

  /* ───────────────────────────────────────────────────────────
     EXPORT JSON
  ─────────────────────────────────────────────────────────── */

  const exportJson = () => {
    if (invoices.length === 0 && purchases.length === 0) {
      alert("No data available to export.");
      return;
    }

    const payload = {
      period: { from: start || "All", to: end || "All" },
      consider_non_tax_as_exempted: considerExempt,
      section_1: section1Rows,
      section_1_total: section1Totals,
      section_2: section2Groups,
      section_2_total: section2Totals,
      section_3: {
        itc_available: section3.available,
        itc_available_total: section3.availableTotal,
        ineligible_itc: section3.ineligible,
        ineligible_itc_total: section3.ineligibleTotal,
      },
      section_4: {
        from_supplier_under_composition_scheme_exempt_and_nil: section4.row1,
        non_gst_supply: section4.row2,
      },
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download = `GSTR_3B_${fromDate}_to_${toDate}.json`;

    a.click();

    URL.revokeObjectURL(url);
  };

  /* ───────────────────────────────────────────────────────────
     EXPORT EXCEL — all four sections
  ─────────────────────────────────────────────────────────── */

  const exportXls = () => {
    if (invoices.length === 0 && purchases.length === 0) {
      alert("No data available to export.");
      return;
    }

    const wb = XLSX.utils.book_new();

    const s1Data = section1Rows.map((r) => ({
      "Nature of Supplies": r.name,
      "Total Taxable Value": r.value,
      "Integrated Tax": r.igst,
      "Central Tax": r.cgst,
      "State/UT Tax": r.sgst,
      "Cess": r.cess,
    }));

    s1Data.push({
      "Nature of Supplies": "TOTAL",
      "Total Taxable Value": section1Totals.value,
      "Integrated Tax": section1Totals.igst,
      "Central Tax": section1Totals.cgst,
      "State/UT Tax": section1Totals.sgst,
      "Cess": section1Totals.cess,
    });

    const s1Ws = XLSX.utils.json_to_sheet(s1Data);
    XLSX.utils.book_append_sheet(wb, s1Ws, "1. Outward/RC");

    const s2Data =
      section2Groups.length > 0
        ? section2Groups.map((g) => ({
            "Place Of Supply (State/UT)": g.pos,
            "Unregistered - Total Taxable Value": g.taxable,
            "Unregistered - Amount Of Integrated Tax": g.igst,
            "Composition - Total Taxable Value": 0,
            "Composition - Amount Of Integrated Tax": 0,
            "UIN - Total Taxable Value": 0,
            "UIN - Amount Of Integrated Tax": 0,
          }))
        : [
            {
              "Place Of Supply (State/UT)": "—",
              "Unregistered - Total Taxable Value": 0,
              "Unregistered - Amount Of Integrated Tax": 0,
              "Composition - Total Taxable Value": 0,
              "Composition - Amount Of Integrated Tax": 0,
              "UIN - Total Taxable Value": 0,
              "UIN - Amount Of Integrated Tax": 0,
            },
          ];

    s2Data.push({
      "Place Of Supply (State/UT)": "TOTAL",
      "Unregistered - Total Taxable Value": section2Totals.taxable,
      "Unregistered - Amount Of Integrated Tax": section2Totals.igst,
      "Composition - Total Taxable Value": 0,
      "Composition - Amount Of Integrated Tax": 0,
      "UIN - Total Taxable Value": 0,
      "UIN - Amount Of Integrated Tax": 0,
    });

    const s2Ws = XLSX.utils.json_to_sheet(s2Data);
    XLSX.utils.book_append_sheet(wb, s2Ws, "2. Inter-State");

    const s3Data = [
      { Details: "(A) ITC Available (whether in full or part)", "Integrated Tax": "", "Central Tax": "", "State/UT Tax": "", "Cess": "" },
      ...section3.available.map((r) => ({
        Details: r.name,
        "Integrated Tax": r.igst,
        "Central Tax": r.cgst,
        "State/UT Tax": r.sgst,
        "Cess": r.cess,
      })),
      {
        Details: "A. TOTAL",
        "Integrated Tax": section3.availableTotal.igst,
        "Central Tax": section3.availableTotal.cgst,
        "State/UT Tax": section3.availableTotal.sgst,
        "Cess": section3.availableTotal.cess,
      },
      { Details: "(D) Ineligible ITC", "Integrated Tax": "", "Central Tax": "", "State/UT Tax": "", "Cess": "" },
      ...section3.ineligible.map((r) => ({
        Details: r.name,
        "Integrated Tax": r.igst,
        "Central Tax": r.cgst,
        "State/UT Tax": r.sgst,
        "Cess": r.cess,
      })),
      {
        Details: "D. TOTAL",
        "Integrated Tax": section3.ineligibleTotal.igst,
        "Central Tax": section3.ineligibleTotal.cgst,
        "State/UT Tax": section3.ineligibleTotal.sgst,
        "Cess": section3.ineligibleTotal.cess,
      },
    ];

    const s3Ws = XLSX.utils.json_to_sheet(s3Data);
    XLSX.utils.book_append_sheet(wb, s3Ws, "3. ITC");

    const s4Data = [
      {
        "Nature of Supplies": "From a supplier under composition scheme, Exempt and Nil rated supply",
        "Inter-State Supplies": section4.row1.inter,
        "Intra-State Supplies": section4.row1.intra,
      },
      {
        "Nature of Supplies": "Non GST supply",
        "Inter-State Supplies": section4.row2.inter,
        "Intra-State Supplies": section4.row2.intra,
      },
      {
        "Nature of Supplies": "TOTAL",
        "Inter-State Supplies": section4.row1.inter + section4.row2.inter,
        "Intra-State Supplies": section4.row1.intra + section4.row2.intra,
      },
    ];

    const s4Ws = XLSX.utils.json_to_sheet(s4Data);
    XLSX.utils.book_append_sheet(wb, s4Ws, "4. Exempt/Non-GST");

    XLSX.writeFile(
      wb,
      `GSTR_3B_${fromDate}_to_${toDate}.xlsx`
    );
  };

  /* ───────────────────────────────────────────────────────────
     PRINT — full report
  ─────────────────────────────────────────────────────────── */

  const handlePrint = () => {
    if (invoices.length === 0 && purchases.length === 0) {
      alert("No data available to print.");
      return;
    }

    const s1RowsHtml = section1Rows
      .map(
        (r) => `
          <tr>
            <td>${r.name}</td>
            <td class="r">${fmtNum(r.value)}</td>
            <td class="r">${fmtNum(r.igst)}</td>
            <td class="r">${fmtNum(r.cgst)}</td>
            <td class="r">${fmtNum(r.sgst)}</td>
            <td class="r">${fmtNum(r.cess)}</td>
          </tr>`
      )
      .join("");

    const s2RowsHtml =
      section2Groups.length > 0
        ? section2Groups
            .map(
              (g) => `
                <tr>
                  <td>${g.pos}</td>
                  <td class="r">${fmtNum(g.taxable)}</td>
                  <td class="r">${fmtNum(g.igst)}</td>
                  <td class="r">0.00</td>
                  <td class="r">0.00</td>
                  <td class="r">0.00</td>
                  <td class="r">0.00</td>
                </tr>`
            )
            .join("")
        : `
            <tr>
              <td>—</td>
              <td class="r">0.00</td>
              <td class="r">0.00</td>
              <td class="r">0.00</td>
              <td class="r">0.00</td>
              <td class="r">0.00</td>
              <td class="r">0.00</td>
            </tr>`;

    const s3AvailHtml = section3.available
      .map(
        (r) => `
          <tr>
            <td>${r.name}</td>
            <td class="r">${fmtNum(r.igst)}</td>
            <td class="r">${fmtNum(r.cgst)}</td>
            <td class="r">${fmtNum(r.sgst)}</td>
            <td class="r">${fmtNum(r.cess)}</td>
          </tr>`
      )
      .join("");

    const s3IneligHtml = section3.ineligible
      .map(
        (r) => `
          <tr>
            <td>${r.name}</td>
            <td class="r">${fmtNum(r.igst)}</td>
            <td class="r">${fmtNum(r.cgst)}</td>
            <td class="r">${fmtNum(r.sgst)}</td>
            <td class="r">${fmtNum(r.cess)}</td>
          </tr>`
      )
      .join("");

    const el = document.createElement("div");

    el.innerHTML = `
      <h2>GSTR3 REPORT</h2>

      <div class="meta">
        Period: ${formatDateForDisplay(start) || "All"} → ${formatDateForDisplay(end) || "All"}
        &nbsp; | &nbsp;
        Firm: ${companyObject?.company_name || "-"}
        &nbsp; | &nbsp;
        Consider non-tax as exempted: ${considerExempt ? "Yes" : "No"}
      </div>

      <h3 class="sec">1. Details of outward supplies and inward supplies liable to reverse charge</h3>

      <table>
        <thead>
          <tr>
            <th>Nature of Supplies</th>
            <th class="r">Total Taxable Value</th>
            <th class="r">Integrated Tax</th>
            <th class="r">Central Tax</th>
            <th class="r">State/UT Tax</th>
            <th class="r">Cess</th>
          </tr>
        </thead>
        <tbody>
          ${s1RowsHtml}
          <tr class="total">
            <td>TOTAL</td>
            <td class="r">${fmtNum(section1Totals.value)}</td>
            <td class="r">${fmtNum(section1Totals.igst)}</td>
            <td class="r">${fmtNum(section1Totals.cgst)}</td>
            <td class="r">${fmtNum(section1Totals.sgst)}</td>
            <td class="r">${fmtNum(section1Totals.cess)}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="sec">2. Details of inter-State supplies made to unregistered persons, composition dealer and UIN holders</h3>

      <table>
        <thead>
          <tr>
            <th rowspan="2">Place Of Supply (State/UT)</th>
            <th colspan="2">Supplies Made To Unregistered Persons</th>
            <th colspan="2">Supplies Made To Composition Taxable Persons</th>
            <th colspan="2">Supplies Made To UIN Holders</th>
          </tr>
          <tr>
            <th class="r">Total Taxable Value</th>
            <th class="r">Amount Of Integrated Tax</th>
            <th class="r">Total Taxable Value</th>
            <th class="r">Amount Of Integrated Tax</th>
            <th class="r">Total Taxable Value</th>
            <th class="r">Amount Of Integrated Tax</th>
          </tr>
        </thead>
        <tbody>
          ${s2RowsHtml}
          <tr class="total">
            <td>TOTAL</td>
            <td class="r">${fmtNum(section2Totals.taxable)}</td>
            <td class="r">${fmtNum(section2Totals.igst)}</td>
            <td class="r">0.00</td>
            <td class="r">0.00</td>
            <td class="r">0.00</td>
            <td class="r">0.00</td>
          </tr>
        </tbody>
      </table>

      <h3 class="sec">3. Details of eligible Input Tax Credit</h3>

      <table>
        <thead>
          <tr>
            <th>Details</th>
            <th class="r">Integrated Tax</th>
            <th class="r">Central Tax</th>
            <th class="r">State/UT Tax</th>
            <th class="r">Cess</th>
          </tr>
        </thead>
        <tbody>
          <tr class="sec-wrap">
            <td colspan="5">(A) ITC Available (whether in full or part)</td>
          </tr>
          ${s3AvailHtml}
          <tr class="total">
            <td>A. TOTAL</td>
            <td class="r">${fmtNum(section3.availableTotal.igst)}</td>
            <td class="r">${fmtNum(section3.availableTotal.cgst)}</td>
            <td class="r">${fmtNum(section3.availableTotal.sgst)}</td>
            <td class="r">${fmtNum(section3.availableTotal.cess)}</td>
          </tr>
          <tr class="sec-wrap">
            <td colspan="5">(D) Ineligible ITC</td>
          </tr>
          ${s3IneligHtml}
          <tr class="total">
            <td>D. TOTAL</td>
            <td class="r">${fmtNum(section3.ineligibleTotal.igst)}</td>
            <td class="r">${fmtNum(section3.ineligibleTotal.cgst)}</td>
            <td class="r">${fmtNum(section3.ineligibleTotal.sgst)}</td>
            <td class="r">${fmtNum(section3.ineligibleTotal.cess)}</td>
          </tr>
        </tbody>
      </table>

      <h3 class="sec">4. Details of exempt, nil-rated and non-GST inward supplies</h3>

      <table>
        <thead>
          <tr>
            <th>Nature of Supplies</th>
            <th class="r">Inter-State Supplies</th>
            <th class="r">Intra-State Supplies</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>From a supplier under composition scheme, Exempt and Nil rated supply</td>
            <td class="r">${fmtNum(section4.row1.inter)}</td>
            <td class="r">${fmtNum(section4.row1.intra)}</td>
          </tr>
          <tr>
            <td>Non GST supply</td>
            <td class="r">${fmtNum(section4.row2.inter)}</td>
            <td class="r">${fmtNum(section4.row2.intra)}</td>
          </tr>
          <tr class="total">
            <td>TOTAL</td>
            <td class="r">${fmtNum(section4.row1.inter + section4.row2.inter)}</td>
            <td class="r">${fmtNum(section4.row1.intra + section4.row2.intra)}</td>
          </tr>
        </tbody>
      </table>
    `;

    printElement(el, "GSTR 3B");
  };

  /* ───────────────────────────────────────────────────────────
     RENDER
  ─────────────────────────────────────────────────────────── */

  return (
    <div style={{ fontFamily: FONT, padding: "6px 14px 20px" }}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: INDIGO,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <ClipboardList size={16} />
        </div>

        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "#1e1b4b",
              lineHeight: 1.2,
            }}
          >
            GSTR3 REPORT
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#9ca3af",
              lineHeight: 1.2,
            }}
          >
            GSTR-3B — Outward supplies, ITC &amp; inward supplies
          </div>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {/* FROM */}
        <div>
          <div style={fieldLabelStyle}>From</div>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>

        {/* TO */}
        <div>
          <div style={fieldLabelStyle}>To</div>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={dateInputStyle}
          />
        </div>

        {/* INVALID RANGE */}
        {dateError && (
          <div
            style={{
              flexBasis: "100%",
              fontSize: 10.5,
              fontWeight: 600,
              color: "#dc2626",
              fontFamily: FONT,
            }}
          >
            From date cannot be later than To date. No data will be shown for
            an inverted range.
          </div>
        )}

        {/* FIRM */}
        <div>
          <div style={fieldLabelStyle}>Firm</div>

          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{ ...selectStyle, minWidth: 170 }}
          >
            <option value="">Select firm…</option>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>

        {/* CHECKBOX */}
        <label
          style={{
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
          }}
        >
          <input
            type="checkbox"
            checked={considerExempt}
            onChange={(e) => setConsiderExempt(e.target.checked)}
            style={{
              cursor: "pointer",
              accentColor: INDIGO,
              width: 15,
              height: 15,
              margin: 0,
            }}
          />
          CONSIDER NON-TAX AS EXEMPTED
        </label>

        {/* ACTION BUTTONS */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={exportJson}
            title="Export JSON"
            aria-label="Export JSON"
            style={selectedCompany ? iconBtn : iconBtnDisabled}
            disabled={!selectedCompany}
          >
            <FileJson size={17} color="#64748b" />
          </button>

          <button
            type="button"
            onClick={exportXls}
            title="Export Excel"
            aria-label="Export Excel"
            style={selectedCompany ? iconBtn : iconBtnDisabled}
            disabled={!selectedCompany}
          >
            <FileSpreadsheet size={17} color="#16a34a" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Print"
            aria-label="Print"
            style={selectedCompany ? iconBtn : iconBtnDisabled}
            disabled={!selectedCompany}
          >
            <Printer size={17} color={INDIGO} />
          </button>
        </div>
      </div>

      {/* ── STATUS STRIP ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11.5,
          color: "#64748b",
          marginBottom: 10,
        }}
      >
        {loading && (
          <RefreshCw
            size={14}
            className="animate-spin"
            style={{ animation: "spin 1s linear infinite" }}
          />
        )}

        <span>
          Period: <strong>{formatDateForDisplay(start) || "All"}</strong> →{" "}
          <strong>{formatDateForDisplay(end) || "All"}</strong>
        </span>

        <span>·</span>

        <span>
          Sales: <strong>{invoices.length}</strong>
        </span>

        <span>·</span>

        <span>
          Purchases: <strong>{purchases.length}</strong>
        </span>
      </div>

      {!selectedCompany ? (
        <div
          style={{
            border: "1.5px dashed " + BORDER,
            borderRadius: 10,
            background: "#fff",
            padding: 48,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          Select a firm to generate the GSTR-3B report.
        </div>
      ) : (
        <div
          ref={tableWrapRef}
          style={{
            maxHeight: "calc(100vh - 205px)",
            overflow: "auto",
            paddingRight: 4,
            display: "flex",
            flexDirection: "column",
            gap: 26,
          }}
        >
          {/* ════════ SECTION 1 ════════ */}
          <div>
            <div style={sectionTitleStyle}>
              1. Details of outward supplies and inward supplies liable to
              reverse charge
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                minWidth: 820,
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: "40%" }}>
                    Nature of Supplies
                  </th>
                  <th style={thNumStyle}>Total Taxable Value</th>
                  <th style={thNumStyle}>Integrated Tax</th>
                  <th style={thNumStyle}>Central Tax</th>
                  <th style={thNumStyle}>State/UT Tax</th>
                  <th style={thNumStyle}>Cess</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}
                    >
                      Loading GSTR-3B data…
                    </td>
                  </tr>
                ) : section1Rows.map((r, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{r.name}</td>
                    <td style={tdNumStyle}>{fmtNum(r.value)}</td>
                    <td style={tdNumStyle}>{fmtNum(r.igst)}</td>
                    <td style={tdNumStyle}>{fmtNum(r.cgst)}</td>
                    <td style={tdNumStyle}>{fmtNum(r.sgst)}</td>
                    <td style={tdNumStyle}>{fmtNum(r.cess)}</td>
                  </tr>
                ))}
              </tbody>

              {!loading && (
                <tfoot>
                  <tr style={totalRowStyle}>
                    <td style={{ padding: "8px 9px" }}>TOTAL</td>
                    <td style={tdNumStyle}>{fmtNum(section1Totals.value)}</td>
                    <td style={tdNumStyle}>{fmtNum(section1Totals.igst)}</td>
                    <td style={tdNumStyle}>{fmtNum(section1Totals.cgst)}</td>
                    <td style={tdNumStyle}>{fmtNum(section1Totals.sgst)}</td>
                    <td style={tdNumStyle}>{fmtNum(section1Totals.cess)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ════════ SECTION 2 ════════ */}
          <div>
            <div style={sectionTitleStyle}>
              2. Details of inter-State supplies made to unregistered persons,
              composition dealer and UIN holders
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                minWidth: 940,
              }}
            >
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    style={{ ...thStyle, width: "18%", verticalAlign: "middle" }}
                  >
                    Place Of Supply (State/UT)
                  </th>
                  <th colSpan={2} style={{ ...thStyle, textAlign: "center" }}>
                    Supplies Made To Unregistered Persons
                  </th>
                  <th colSpan={2} style={{ ...thStyle, textAlign: "center" }}>
                    Supplies Made To Composition Taxable Persons
                  </th>
                  <th colSpan={2} style={{ ...thStyle, textAlign: "center" }}>
                    Supplies Made To UIN Holders
                  </th>
                </tr>
                <tr>
                  <th style={thNumStyle}>Total Taxable Value</th>
                  <th style={thNumStyle}>Amount Of Integrated Tax</th>
                  <th style={thNumStyle}>Total Taxable Value</th>
                  <th style={thNumStyle}>Amount Of Integrated Tax</th>
                  <th style={thNumStyle}>Total Taxable Value</th>
                  <th style={thNumStyle}>Amount Of Integrated Tax</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : section2Groups.length > 0 ? (
                  section2Groups.map((g, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{g.pos}</td>
                      <td style={tdNumStyle}>{fmtNum(g.taxable)}</td>
                      <td style={tdNumStyle}>{fmtNum(g.igst)}</td>
                      <td style={tdNumStyle}>0.00</td>
                      <td style={tdNumStyle}>0.00</td>
                      <td style={tdNumStyle}>0.00</td>
                      <td style={tdNumStyle}>0.00</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={tdStyle}>—</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                  </tr>
                )}
              </tbody>

              {!loading && (
                <tfoot>
                  <tr style={totalRowStyle}>
                    <td style={{ padding: "8px 9px" }}>TOTAL</td>
                    <td style={tdNumStyle}>{fmtNum(section2Totals.taxable)}</td>
                    <td style={tdNumStyle}>{fmtNum(section2Totals.igst)}</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                    <td style={tdNumStyle}>0.00</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ════════ SECTION 3 ════════ */}
          <div>
            <div style={sectionTitleStyle}>3. Details of eligible Input Tax Credit</div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                minWidth: 620,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Details</th>
                  <th style={thNumStyle}>Integrated Tax</th>
                  <th style={thNumStyle}>Central Tax</th>
                  <th style={thNumStyle}>State/UT Tax</th>
                  <th style={thNumStyle}>Cess</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr
                      style={{
                        background: NAVY,
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      <td
                        colSpan={5}
                        style={{ padding: "8px 9px", fontSize: 11.5 }}
                      >
                        (A) ITC Available (whether in full or part)
                      </td>
                    </tr>

                    {section3.available.map((r, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdNumStyle}>{fmtNum(r.igst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.cgst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.sgst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.cess)}</td>
                      </tr>
                    ))}

                    <tr style={totalRowStyle}>
                      <td style={{ padding: "8px 9px" }}>A. TOTAL</td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.availableTotal.igst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.availableTotal.cgst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.availableTotal.sgst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.availableTotal.cess)}
                      </td>
                    </tr>

                    <tr
                      style={{
                        background: NAVY,
                        color: "#fff",
                        fontWeight: 800,
                      }}
                    >
                      <td
                        colSpan={5}
                        style={{ padding: "8px 9px", fontSize: 11.5 }}
                      >
                        (D) Ineligible ITC
                      </td>
                    </tr>

                    {section3.ineligible.map((r, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{r.name}</td>
                        <td style={tdNumStyle}>{fmtNum(r.igst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.cgst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.sgst)}</td>
                        <td style={tdNumStyle}>{fmtNum(r.cess)}</td>
                      </tr>
                    ))}

                    <tr style={totalRowStyle}>
                      <td style={{ padding: "8px 9px" }}>D. TOTAL</td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.ineligibleTotal.igst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.ineligibleTotal.cgst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.ineligibleTotal.sgst)}
                      </td>
                      <td style={tdNumStyle}>
                        {fmtNum(section3.ineligibleTotal.cess)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* ════════ SECTION 4 ════════ */}
          <div>
            <div style={sectionTitleStyle}>
              4. Details of exempt, nil-rated and non-GST inward supplies
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
                minWidth: 620,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Nature of Supplies</th>
                  <th style={thNumStyle}>Inter-State Supplies</th>
                  <th style={thNumStyle}>Intra-State Supplies</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td style={tdStyle}>
                        From a supplier under composition scheme, Exempt and Nil
                        rated supply
                      </td>
                      <td style={tdNumStyle}>{fmtNum(section4.row1.inter)}</td>
                      <td style={tdNumStyle}>{fmtNum(section4.row1.intra)}</td>
                    </tr>

                    <tr>
                      <td style={tdStyle}>Non GST supply</td>
                      <td style={tdNumStyle}>{fmtNum(section4.row2.inter)}</td>
                      <td style={tdNumStyle}>{fmtNum(section4.row2.intra)}</td>
                    </tr>
                  </>
                )}
              </tbody>

              {!loading && (
                <tfoot>
                  <tr style={totalRowStyle}>
                    <td style={{ padding: "8px 9px" }}>TOTAL</td>
                    <td style={tdNumStyle}>
                      {fmtNum(section4.row1.inter + section4.row2.inter)}
                    </td>
                    <td style={tdNumStyle}>
                      {fmtNum(section4.row1.intra + section4.row2.intra)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}