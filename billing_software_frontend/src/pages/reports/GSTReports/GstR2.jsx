import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  FileDown,
  Printer,
  FileJson,
  Truck,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────────────────────
   DATE RANGE
───────────────────────────────────────────────────────────── */

function buildRange(
  fromMonth,
  fromYear,
  toMonth,
  toYear
) {
  const start =
    fromMonth && fromYear
      ? `${fromYear}-${String(fromMonth).padStart(
          2,
          "0"
        )}-01`
      : "";

  let end = "";

  if (toMonth && toYear) {
    const lastDay = new Date(
      toYear,
      toMonth,
      0
    ).getDate();

    end = `${toYear}-${String(toMonth).padStart(
      2,
      "0"
    )}-${String(lastDay).padStart(2, "0")}`;
  }

  return {
    start,
    end,
  };
}

/* ─────────────────────────────────────────────────────────────
   NUMBER FORMAT
───────────────────────────────────────────────────────────── */

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* ─────────────────────────────────────────────────────────────
   DATE FORMAT
───────────────────────────────────────────────────────────── */

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}

/* ─────────────────────────────────────────────────────────────
   AUTH
───────────────────────────────────────────────────────────── */

function auth() {
  try {
    const user = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    return {
      adminId:
        user?.role === "admin"
          ? user?.id
          : user?.admin_id || null,
    };
  } catch {
    return {
      adminId: null,
    };
  }
}

/* ─────────────────────────────────────────────────────────────
   GET NUMERIC VALUE
───────────────────────────────────────────────────────────── */

function getNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number)
    ? null
    : number;
}

/* ─────────────────────────────────────────────────────────────
   GET ACTUAL TAX AMOUNT
───────────────────────────────────────────────────────────── */

/*
 * We check invoice-level tax fields first.
 *
 * Priority:
 *   gst_total
 *   tax_total
 *   gst_amount
 *   tax_amount
 *
 * Returns:
 *   number  -> when tax information exists
 *   null    -> when API did not provide any tax amount
 */
function getTaxAmount(item) {
  const taxFields = [
    "gst_total",
    "tax_total",
    "gst_amount",
    "tax_amount",
  ];

  for (const field of taxFields) {
    if (
      Object.prototype.hasOwnProperty.call(
        item || {},
        field
      )
    ) {
      const value = getNumber(
        item?.[field]
      );

      if (value !== null) {
        return value;
      }
    }
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────
   CHECK WHETHER TRANSACTION IS NON-TAX
───────────────────────────────────────────────────────────── */

/*
 * Meaning of:
 *
 * "Consider non-tax as exempted"
 *
 * When checkbox is ON:
 *
 *   ONLY tax-free / non-tax transactions
 *   should be displayed.
 *
 * When checkbox is OFF:
 *
 *   ALL transactions should be displayed.
 *
 * Important:
 *
 * We do NOT decide based only on product.gst.
 *
 * Example:
 *
 * product.gst = 18
 * gst_type = without_gst
 * gst_total = 0
 *
 * This transaction is still non-tax because
 * the invoice itself is without GST.
 */
function isNonTaxTransaction(item) {
  if (!item) {
    return true;
  }

  /* ── 1. Explicit invoice GST type ─────────────────────────── */

  const gstType = String(
    item?.gst_type ??
      item?.gstType ??
      ""
  )
    .trim()
    .toLowerCase();

  if (
    gstType === "without_gst" ||
    gstType === "without gst" ||
    gstType === "non_tax" ||
    gstType === "non-tax" ||
    gstType === "exempt"
  ) {
    return true;
  }

  if (
    gstType === "with_gst" ||
    gstType === "with gst" ||
    gstType === "taxable"
  ) {
    return false;
  }

  /* ── 2. Actual invoice tax amount ─────────────────────────── */

  const taxAmount = getTaxAmount(item);

  if (taxAmount !== null) {
    return taxAmount <= 0;
  }

  /* ── 3. Check products when invoice-level tax is unavailable ─ */

  const products = Array.isArray(
    item?.products
  )
    ? item.products
    : [];

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

  /*
   * If absolutely no tax information exists,
   * treat it as non-tax.
   */
  return true;
}

/* ─────────────────────────────────────────────────────────────
   GET TAX RATE
───────────────────────────────────────────────────────────── */

function getTaxRate(item) {
  if (!item) return 0;

  /*
   * First try invoice-level tax rate fields.
   */
  const directRateFields = [
    "gst_rate",
    "tax_rate",
    "gst_percentage",
    "tax_percentage",
  ];

  for (const field of directRateFields) {
    const value = getNumber(
      item?.[field]
    );

    if (value !== null) {
      return value;
    }
  }

  /*
   * If products exist, use the GST rate
   * from the product.
   */
  const products = Array.isArray(
    item?.products
  )
    ? item.products
    : [];

  if (products.length > 0) {
    const rates = products
      .map((product) =>
        Number(
          product?.gst ??
            product?.gst_percentage ??
            product?.gstPercent ??
            product?.tax_rate ??
            0
        )
      )
      .filter(
        (rate) => rate > 0
      );

    if (rates.length > 0) {
      return rates[0];
    }
  }

  /*
   * Last fallback:
   * calculate from actual tax amount.
   */
  const taxAmount =
    getTaxAmount(item);

  const subTotal = Number(
    item?.sub_total || 0
  );

  if (
    taxAmount !== null &&
    taxAmount > 0 &&
    subTotal > 0
  ) {
    return Math.round(
      (taxAmount / subTotal) * 100
    );
  }

  return 0;
}

/* ─────────────────────────────────────────────────────────────
   GET VALUE
───────────────────────────────────────────────────────────── */

function getTransactionValue(item) {
  return Number(
    item?.total_amount ??
      item?.total ??
      item?.grand_total ??
      item?.sub_total ??
      0
  );
}

/* ─────────────────────────────────────────────────────────────
   GET PARTY NAME
───────────────────────────────────────────────────────────── */

function getPartyName(item) {
  return (
    item?.supplier_name ||
    item?.supplier ||
    item?.party_name ||
    item?.partyName ||
    "Purchase"
  );
}

/* ─────────────────────────────────────────────────────────────
   GET BILL NUMBER
───────────────────────────────────────────────────────────── */

function getBillNumber(item) {
  return (
    item?.purchase_no ||
    item?.bill_no ||
    item?.invoice_no ||
    item?.purchase_number ||
    item?.bill_number ||
    "-"
  );
}

/* ─────────────────────────────────────────────────────────────
   GET GSTIN
───────────────────────────────────────────────────────────── */

function getGstin(item, considerExempt) {
  const gstin = (
    item?.supplier_gstin ||
    item?.supplier_gst_no ||
    item?.gstin ||
    item?.gst_no ||
    ""
  )
    .toString()
    .trim();

  if (gstin) {
    return gstin;
  }

  /*
   * Only tax-free records should show EXEMPT
   * when the checkbox is active.
   */
  if (
    considerExempt &&
    isNonTaxTransaction(item)
  ) {
    return "EXEMPT";
  }

  return "N/A";
}

/* ─────────────────────────────────────────────────────────────
   PRINT HELPER
───────────────────────────────────────────────────────────── */

function printElement(
  element,
  title
) {
  const iframe =
    document.createElement(
      "iframe"
    );

  Object.assign(iframe.style, {
    position: "fixed",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
    right: "0",
    bottom: "0",
  });

  document.body.appendChild(
    iframe
  );

  const doc =
    iframe.contentWindow.document;

  doc.open();

  doc.write(`
    <html>
      <head>
        <title>
          ${title || "GST R2"}
        </title>

        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 28px;
            color: #1e1b4b;
          }

          h2 {
            margin: 0 0 5px;
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
            padding: 7px 8px;
          }

          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-align: left;
          }

          td.right,
          th.right {
            text-align: right;
          }

          td.center,
          th.center {
            text-align: center;
          }

          tr.total td {
            background: #ffffff;
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

  const win =
    iframe.contentWindow;

  const fire = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(
        () => iframe.remove(),
        1500
      );
    }
  };

  if (
    doc.readyState ===
    "complete"
  ) {
    fire();
  } else {
    win.addEventListener(
      "load",
      fire
    );
  }
}

/* ─────────────────────────────────────────────────────────────
   GST R2 COMPONENT
───────────────────────────────────────────────────────────── */

export default function GstR2() {
  const { adminId } = auth();

  const now = new Date();

  /* ── Date filters ─────────────────────────────────────────── */

  const [
    fromMonth,
    setFromMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    fromYear,
    setFromYear,
  ] = useState(
    now.getFullYear()
  );

  const [
    toMonth,
    setToMonth,
  ] = useState(
    now.getMonth() + 1
  );

  const [
    toYear,
    setToYear,
  ] = useState(
    now.getFullYear()
  );

  /* ── Checkbox ─────────────────────────────────────────────── */

  const [
    considerExempt,
    setConsiderExempt,
  ] = useState(false);

  /* ── Tabs ─────────────────────────────────────────────────── */

  const [
    activeTab,
    setActiveTab,
  ] = useState(
    "purchase"
  );

  /* ── Companies ────────────────────────────────────────────── */

  const [
    companies,
    setCompanies,
  ] = useState([]);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState("");

  /* ── Data ─────────────────────────────────────────────────── */

  const [
    purchases,
    setPurchases,
  ] = useState([]);

  const [
    debitNotes,
    setDebitNotes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const tableWrapRef =
    useRef(null);

  /* ───────────────────────────────────────────────────────────
     LOAD COMPANIES
  ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!adminId) return;

    api
      .get(
        `/company/get_companies_by_admin?admin_id=${adminId}`
      )
      .then((res) => {
        if (!res.data?.status) {
          return;
        }

        const list =
          res.data.data || [];

        setCompanies(list);

        const saved =
          localStorage.getItem(
            "selected_company_id"
          );

        const match = saved
          ? list.find(
              (company) =>
                String(
                  company.id
                ) ===
                String(saved)
            )
          : null;

        if (match) {
          setSelectedCompany(
            String(match.id)
          );
        } else if (
          list.length === 1
        ) {
          setSelectedCompany(
            String(
              list[0].id
            )
          );
        }
      })
      .catch((error) => {
        console.error(
          "Company loading error:",
          error
        );
      });
  }, [adminId]);

  /* ───────────────────────────────────────────────────────────
     DATE RANGE
  ─────────────────────────────────────────────────────────── */

  const { start, end } =
    useMemo(
      () =>
        buildRange(
          fromMonth,
          fromYear,
          toMonth,
          toYear
        ),
      [
        fromMonth,
        fromYear,
        toMonth,
        toYear,
      ]
    );

  /* ───────────────────────────────────────────────────────────
     FETCH PURCHASES + RETURNS
  ─────────────────────────────────────────────────────────── */

  const fetchReport = async (
    companyId
  ) => {
    if (!companyId) {
      return;
    }

    setLoading(true);

    try {
      /* ── Purchase API ─────────────────────────────────────── */

      const purchaseResponse =
        await api.get(
          "/purchase/get_purchases",
          {
            params: {
              company_id:
                Number(companyId),

              status:
                "submitted",
            },
          }
        );

      let purchaseData =
        purchaseResponse.data
          ?.status
          ? purchaseResponse.data
              .data || []
          : [];

      /* ── Date filter ──────────────────────────────────────── */

      if (start && end) {
        purchaseData =
          purchaseData.filter(
            (purchase) => {
              const date =
                purchase?.purchase_date ||
                purchase?.created_at ||
                purchase?.date ||
                "";

              return (
                date >= start &&
                date <= end
              );
            }
          );
      }

      setPurchases(
        purchaseData
      );

      /* ── Debit note / purchase return ─────────────────────── */

      const debitResponse =
        await api.get(
          "/debit_note/list",
          {
            params: {
              company_id:
                Number(companyId),
            },
          }
        );

      let debitData =
        debitResponse.data
          ?.status
          ? debitResponse.data
              .data || []
          : [];

      if (start && end) {
        debitData =
          debitData.filter(
            (debit) => {
              const date =
                debit?.return_date ||
                debit?.created_at ||
                debit?.date ||
                "";

              return (
                date >= start &&
                date <= end
              );
            }
          );
      }

      setDebitNotes(
        debitData
      );
    } catch (error) {
      console.error(
        "GST R2 report error:",
        error
      );

      setPurchases([]);
      setDebitNotes([]);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────────────────────────────────────────
     FETCH WHEN FILTER CHANGES
  ─────────────────────────────────────────────────────────── */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        if (selectedCompany) {
          fetchReport(
            selectedCompany
          );
        }
      }, 0);

    return () =>
      clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedCompany,
    start,
    end,
  ]);

  /* ───────────────────────────────────────────────────────────
     PURCHASE ROWS
  ─────────────────────────────────────────────────────────── */

  const purchaseRows =
    useMemo(() => {
      /*
       * IMPORTANT:
       *
       * Checkbox OFF
       * → ALL purchases
       *
       * Checkbox ON
       * → ONLY non-tax purchases
       */

      const filteredPurchases =
        considerExempt
          ? purchases.filter(
              (purchase) =>
                isNonTaxTransaction(
                  purchase
                )
            )
          : purchases;

      return filteredPurchases.map(
        (purchase, index) => {
          const taxRate =
            getTaxRate(
              purchase
            );

          return {
            id:
              purchase?.id ||
              `purchase-${index}`,

            gstin:
              getGstin(
                purchase,
                considerExempt
              ),

            party_name:
              getPartyName(
                purchase
              ),

            invoice_no:
              getBillNumber(
                purchase
              ),

            date:
              purchase?.purchase_date ||
              purchase?.created_at ||
              purchase?.date ||
              "-",

            value:
              getTransactionValue(
                purchase
              ),

            tax_rate:
              taxRate,
          };
        }
      );
    }, [
      purchases,
      considerExempt,
    ]);

  /* ───────────────────────────────────────────────────────────
     PURCHASE RETURN ROWS
  ─────────────────────────────────────────────────────────── */

  const returnRows =
    useMemo(() => {
      /*
       * Checkbox OFF
       * → ALL returns
       *
       * Checkbox ON
       * → ONLY non-tax returns
       */

      const filteredDebitNotes =
        considerExempt
          ? debitNotes.filter(
              (debit) =>
                isNonTaxTransaction(
                  debit
                )
            )
          : debitNotes;

      return filteredDebitNotes.map(
        (debit, index) => {
          const taxRate =
            getTaxRate(debit);

          return {
            id:
              debit?.id ||
              `return-${index}`,

            gstin:
              getGstin(
                debit,
                considerExempt
              ),

            party_name:
              debit?.supplier_name ||
              debit?.supplier ||
              debit?.party_name ||
              "Purchase",

            invoice_no:
              debit?.bill_no ||
              debit?.return_no ||
              debit?.invoice_no ||
              "-",

            date:
              debit?.return_date ||
              debit?.created_at ||
              debit?.date ||
              "-",

            value:
              getTransactionValue(
                debit
              ),

            tax_rate:
              taxRate,
          };
        }
      );
    }, [
      debitNotes,
      considerExempt,
    ]);

  /* ───────────────────────────────────────────────────────────
     ACTIVE ROWS
  ─────────────────────────────────────────────────────────── */

  const activeRows =
    activeTab === "purchase"
      ? purchaseRows
      : returnRows;

  /* ───────────────────────────────────────────────────────────
     TOTAL
  ─────────────────────────────────────────────────────────── */

  const totals =
    useMemo(() => {
      return activeRows.reduce(
        (result, row) => {
          result.value +=
            Number(
              row?.value || 0
            );

          return result;
        },
        {
          value: 0,
        }
      );
    }, [activeRows]);

  /* ───────────────────────────────────────────────────────────
     EXPORT JSON
  ─────────────────────────────────────────────────────────── */

  const exportJson = () => {
    if (
      activeRows.length === 0
    ) {
      alert(
        "No data available to export."
      );
      return;
    }

    const exportData =
      activeRows.map(
        (row) => ({
          "GSTIN/UIN":
            row.gstin,

          "Party Name":
            row.party_name,

          "Bill Details No.":
            row.invoice_no,

          Date:
            row.date,

          "Value (₹)":
            row.value,

          "Rate (%)":
            row.tax_rate,
        })
      );

    const blob =
      new Blob(
        [
          JSON.stringify(
            exportData,
            null,
            2
          ),
        ],
        {
          type:
            "application/json",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement(
        "a"
      );

    link.href = url;

    link.download =
      `GST_R2_${activeTab}.json`;

    link.click();

    URL.revokeObjectURL(
      url
    );
  };

  /* ───────────────────────────────────────────────────────────
     EXPORT XLS
  ─────────────────────────────────────────────────────────── */

  const exportXls = () => {
    if (
      activeRows.length === 0
    ) {
      alert(
        "No data available to export."
      );
      return;
    }

    const data =
      activeRows.map(
        (row) => ({
          "GSTIN/UIN":
            row.gstin,

          "Party Name":
            row.party_name,

          "Bill Details No.":
            row.invoice_no,

          Date:
            row.date,

          "Value (₹)":
            row.value,

          "Rate (%)":
            row.tax_rate,
        })
      );

    data.push({
      "GSTIN/UIN":
        "TOTAL",

      "Party Name":
        "",

      "Bill Details No.":
        "",

      Date:
        "",

      "Value (₹)":
        totals.value,

      "Rate (%)":
        "",
    });

    const worksheet =
      XLSX.utils.json_to_sheet(
        data
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      activeTab ===
      "purchase"
        ? "GST R2"
        : "Purchase Return"
    );

    XLSX.writeFile(
      workbook,
      `GST_R2_${activeTab}.xlsx`
    );
  };

  /* ───────────────────────────────────────────────────────────
     PRINT
  ─────────────────────────────────────────────────────────── */

  const handlePrint = () => {
    if (
      activeRows.length === 0
    ) {
      alert(
        "No data available to print."
      );
      return;
    }

    const element =
      document.createElement(
        "div"
      );

    element.innerHTML = `
      <h2>
        GST R2 —
        ${
          activeTab ===
          "purchase"
            ? "Inward Supplies"
            : "Purchase Returns"
        }
      </h2>

      <div class="meta">
        Period:
        ${start || "All"}
        →
        ${end || "All"}
        &nbsp; | &nbsp;

        Consider non-tax as exempted:
        ${
          considerExempt
            ? "Yes"
            : "No"
        }

        &nbsp; | &nbsp;

        ${activeRows.length}
        record(s)
      </div>

      <table>
        <thead>
          <tr>
            <th>GSTIN/UIN</th>
            <th>Party Name</th>
            <th class="center">
              Bill Details No.
            </th>
            <th>Date</th>
            <th class="right">
              Value
            </th>
            <th class="right">
              Rate
            </th>
          </tr>
        </thead>

        <tbody>
          ${activeRows
            .map(
              (row) => `
                <tr>
                  <td>
                    ${
                      row.gstin ||
                      "-"
                    }
                  </td>

                  <td>
                    ${
                      row.party_name ||
                      "-"
                    }
                  </td>

                  <td class="center">
                    ${
                      row.invoice_no ||
                      "-"
                    }
                  </td>

                  <td>
                    ${formatDate(
                      row.date
                    )}
                  </td>

                  <td class="right">
                    ${fmtNum(
                      row.value
                    )}
                  </td>

                  <td class="right">
                    ${
                      row.tax_rate
                    }
                  </td>
                </tr>
              `
            )
            .join("")}

          <tr class="total">
            <td colspan="4">
              Total
            </td>

            <td class="right">
              ${fmtNum(
                totals.value
              )}
            </td>

            <td></td>
          </tr>
        </tbody>
      </table>
    `;

    printElement(
      element,
      `GST R2 ${activeTab}`
    );
  };

  /* ───────────────────────────────────────────────────────────
     STYLES
  ─────────────────────────────────────────────────────────── */

  const selectStyle = {
    padding:
      "9px 12px",

    border:
      "1.5px solid " +
      BORDER,

    borderRadius: 9,

    fontSize: 13,

    fontFamily: FONT,

    color: "#334155",

    outline: "none",

    background: "#fff",

    minWidth: 150,
  };

  const actionBtn = (
    color
  ) => ({
    display:
      "inline-flex",

    alignItems:
      "center",

    gap: 6,

    padding:
      "8px 14px",

    borderRadius: 8,

    fontSize: 12,

    fontWeight: 700,

    color: "#fff",

    background: color,

    border: "none",

    cursor: "pointer",

    fontFamily: FONT,
  });

  /* ───────────────────────────────────────────────────────────
     UI
  ─────────────────────────────────────────────────────────── */

  return (
    <div
      style={{
        fontFamily: FONT,
        padding:
          "8px 18px 20px",
      }}
    >
      {/* ── HEADER ───────────────────────────────────────────── */}

      <div
        style={{
          display:
            "flex",

          alignItems:
            "center",

          gap: 12,

          marginBottom: 14,

          flexWrap:
            "wrap",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,

            background:
              "linear-gradient(135deg,#0ea5e9,#4338ca)",

            display:
              "flex",

            alignItems:
              "center",

            justifyContent:
              "center",

            color: "#fff",

            flexShrink: 0,
          }}
        >
          <Truck size={19} />
        </div>

        <div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: "#1e1b4b",
            }}
          >
            GST R2 — Inward Supplies
          </div>

          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            Purchases &amp; purchase
            returns GST return
          </div>
        </div>
      </div>

      {/* ── FILTERS ──────────────────────────────────────────── */}

      <div
        style={{
          display:
            "flex",

          flexWrap:
            "wrap",

          alignItems:
            "flex-end",

          gap: 12,

          marginBottom: 14,
        }}
      >
        {/* FROM */}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 5,
            }}
          >
            From
          </div>

          <div
            style={{
              display:
                "flex",

              gap: 8,
            }}
          >
            <select
              value={fromMonth}
              onChange={(e) =>
                setFromMonth(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                selectStyle
              }
            >
              {monthNames.map(
                (
                  month,
                  index
                ) => (
                  <option
                    key={month}
                    value={
                      index + 1
                    }
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <select
              value={fromYear}
              onChange={(e) =>
                setFromYear(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                selectStyle
              }
            >
              {Array.from(
                {
                  length: 12,
                },
                (_, index) =>
                  now.getFullYear() -
                  5 +
                  index
              ).map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* TO */}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 5,
            }}
          >
            To
          </div>

          <div
            style={{
              display:
                "flex",

              gap: 8,
            }}
          >
            <select
              value={toMonth}
              onChange={(e) =>
                setToMonth(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                selectStyle
              }
            >
              {monthNames.map(
                (
                  month,
                  index
                ) => (
                  <option
                    key={month}
                    value={
                      index + 1
                    }
                  >
                    {month}
                  </option>
                )
              )}
            </select>

            <select
              value={toYear}
              onChange={(e) =>
                setToYear(
                  Number(
                    e.target.value
                  )
                )
              }
              style={
                selectStyle
              }
            >
              {Array.from(
                {
                  length: 12,
                },
                (_, index) =>
                  now.getFullYear() -
                  5 +
                  index
              ).map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* FIRM */}

        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 5,
            }}
          >
            Firm
          </div>

          <select
            value={
              selectedCompany
            }
            onChange={(e) =>
              setSelectedCompany(
                e.target.value
              )
            }
            style={
              selectStyle
            }
          >
            <option value="">
              Select firm…
            </option>

            {companies.map(
              (company) => (
                <option
                  key={
                    company.id
                  }
                  value={String(
                    company.id
                  )}
                >
                  {
                    company.company_name
                  }
                </option>
              )
            )}
          </select>
        </div>

        {/* ── CHECKBOX ───────────────────────────────────────── */}

        <label
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            gap: 7,

            paddingBottom: 9,

            cursor:
              "pointer",

            userSelect:
              "none",

            fontSize: 12,

            fontWeight: 600,

            color:
              "#475569",
          }}
        >
          <input
            type="checkbox"
            checked={
              considerExempt
            }
            onChange={(e) =>
              setConsiderExempt(
                e.target.checked
              )
            }
            style={{
              width: 16,
              height: 16,
              accentColor:
                "#4338ca",
              cursor:
                "pointer",
            }}
          />

          Consider non-tax as
          exempted
        </label>

        {/* ACTION BUTTONS */}

        <div
          style={{
            marginLeft:
              "auto",

            display:
              "flex",

            gap: 8,

            flexWrap:
              "wrap",
          }}
        >
          <button
            onClick={
              exportJson
            }
            disabled={
              !selectedCompany
            }
            style={{
              ...actionBtn(
                "#0891b2"
              ),

              opacity:
                !selectedCompany
                  ? 0.5
                  : 1,

              cursor:
                !selectedCompany
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <FileJson
              size={15}
            />

            Export JSON
          </button>

          <button
            onClick={
              exportXls
            }
            disabled={
              !selectedCompany
            }
            style={{
              ...actionBtn(
                "#16a34a"
              ),

              opacity:
                !selectedCompany
                  ? 0.5
                  : 1,

              cursor:
                !selectedCompany
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <FileDown
              size={15}
            />

            Export XLS
          </button>

          <button
            onClick={
              handlePrint
            }
            disabled={
              !selectedCompany
            }
            style={{
              ...actionBtn(
                "#dc2626"
              ),

              opacity:
                !selectedCompany
                  ? 0.5
                  : 1,

              cursor:
                !selectedCompany
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <Printer
              size={15}
            />

            Print
          </button>
        </div>
      </div>

      {/* ── TABS ─────────────────────────────────────────────── */}

      <div
        style={{
          display:
            "flex",

          gap: 8,

          marginBottom: 12,

          flexWrap:
            "wrap",
        }}
      >
        <button
          onClick={() =>
            setActiveTab(
              "purchase"
            )
          }
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            gap: 6,

            padding:
              "8px 16px",

            borderRadius: 9,

            border:
              "1.5px solid " +
              (activeTab ===
              "purchase"
                ? INDIGO
                : BORDER),

            background:
              activeTab ===
              "purchase"
                ? INDIGO
                : "#fff",

            color:
              activeTab ===
              "purchase"
                ? "#fff"
                : "#475569",

            fontSize: 12,

            fontWeight: 700,

            cursor:
              "pointer",

            fontFamily:
              FONT,
          }}
        >
          <ArrowUpRight
            size={14}
          />

          Purchase / Inward
        </button>

        <button
          onClick={() =>
            setActiveTab(
              "return"
            )
          }
          style={{
            display:
              "inline-flex",

            alignItems:
              "center",

            gap: 6,

            padding:
              "8px 16px",

            borderRadius: 9,

            border:
              "1.5px solid " +
              (activeTab ===
              "return"
                ? INDIGO
                : BORDER),

            background:
              activeTab ===
              "return"
                ? INDIGO
                : "#fff",

            color:
              activeTab ===
              "return"
                ? "#fff"
                : "#475569",

            fontSize: 12,

            fontWeight: 700,

            cursor:
              "pointer",

            fontFamily:
              FONT,
          }}
        >
          <ArrowUpRight
            size={14}
          />

          Purchase Return
        </button>

        {/* RECORD COUNT */}

        <div
          style={{
            marginLeft:
              "auto",

            alignSelf:
              "center",

            display:
              "flex",

            alignItems:
              "center",

            gap: 8,

            fontSize: 12,

            color:
              "#64748b",
          }}
        >
          {loading && (
            <RefreshCw
              size={14}
              style={{
                animation:
                  "spin 1s linear infinite",
              }}
            />
          )}

          <strong>
            {
              activeRows.length
            }
          </strong>

          record(s)
        </div>
      </div>

      {/* ── TABLE ────────────────────────────────────────────── */}

      <div
        style={{
          border:
            "1.5px solid " +
            BORDER,

          borderRadius: 10,

          background:
            "#fff",

          overflow:
            "hidden",
        }}
      >
        <div
          ref={
            tableWrapRef
          }
          style={{
            overflowX:
              "auto",
          }}
        >
          <table
            style={{
              width:
                "100%",

              borderCollapse:
                "collapse",

              fontSize: 12,

              minWidth:
                850,
            }}
          >
            {/* HEADER */}

            <thead>
              <tr
                style={{
                  background:
                    "#f8fafc",

                  borderBottom:
                    "1.5px solid " +
                    BORDER,
                }}
              >
                <th
                  style={{
                    padding:
                      "10px 12px",

                    fontSize: 11,

                    fontWeight: 700,

                    color:
                      "#334155",

                    borderRight:
                      "1px solid " +
                      BORDER,

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "left",
                  }}
                >
                  GSTIN/UIN
                </th>

                <th
                  style={{
                    padding:
                      "10px 12px",

                    fontSize: 11,

                    fontWeight: 700,

                    color:
                      "#334155",

                    borderRight:
                      "1px solid " +
                      BORDER,

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "left",
                  }}
                >
                  Party Name
                </th>

                {/* BILL DETAILS */}

                <th
                  style={{
                    padding:
                      "6px 12px 2px",

                    fontSize: 10,

                    fontWeight: 600,

                    color:
                      "#64748b",

                    borderRight:
                      "1px solid " +
                      BORDER,

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "center",
                  }}
                >
                  Bill Details

                  <div
                    style={{
                      fontSize: 11,

                      fontWeight: 700,

                      color:
                        "#334155",

                      marginTop: 3,
                    }}
                  >
                    No.
                  </div>
                </th>

                <th
                  style={{
                    padding:
                      "10px 12px",

                    fontSize: 11,

                    fontWeight: 700,

                    color:
                      "#334155",

                    borderRight:
                      "1px solid " +
                      BORDER,

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "left",
                  }}
                >
                  Date
                </th>

                <th
                  style={{
                    padding:
                      "10px 12px",

                    fontSize: 11,

                    fontWeight: 700,

                    color:
                      "#334155",

                    borderRight:
                      "1px solid " +
                      BORDER,

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "right",
                  }}
                >
                  Value
                </th>

                <th
                  style={{
                    padding:
                      "10px 12px",

                    fontSize: 11,

                    fontWeight: 700,

                    color:
                      "#334155",

                    whiteSpace:
                      "nowrap",

                    textAlign:
                      "right",
                  }}
                >
                  Rate
                </th>
              </tr>
            </thead>

            {/* BODY */}

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,

                      textAlign:
                        "center",

                      color:
                        "#94a3b8",
                    }}
                  >
                    Loading GST R2
                    data…
                  </td>
                </tr>
              ) : !selectedCompany ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,

                      textAlign:
                        "center",

                      color:
                        "#94a3b8",
                    }}
                  >
                    Select a firm to
                    generate the
                    report.
                  </td>
                </tr>
              ) : activeRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      padding: 48,

                      textAlign:
                        "center",

                      color:
                        "#64748b",
                    }}
                  >
                    {considerExempt
                      ? "No non-tax / exempted records found."
                      : "No records found for the selected period."}
                  </td>
                </tr>
              ) : (
                activeRows.map(
                  (
                    row,
                    index
                  ) => (
                    <tr
                      key={
                        row.id ||
                        index
                      }
                      style={{
                        borderBottom:
                          "1px solid #f1f5f9",
                      }}
                    >
                      {/* GSTIN */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          fontFamily:
                            "monospace",

                          color:
                            "#64748b",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          row.gstin
                        }
                      </td>

                      {/* PARTY */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          fontWeight: 600,

                          color:
                            "#1e293b",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          row.party_name
                        }
                      </td>

                      {/* BILL NO */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          color:
                            "#334155",

                          whiteSpace:
                            "nowrap",

                          textAlign:
                            "center",
                        }}
                      >
                        {
                          row.invoice_no
                        }
                      </td>

                      {/* DATE */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          color:
                            "#475569",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {formatDate(
                          row.date
                        )}
                      </td>

                      {/* VALUE */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          textAlign:
                            "right",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {fmtNum(
                          row.value
                        )}
                      </td>

                      {/* RATE */}

                      <td
                        style={{
                          padding:
                            "9px 12px",

                          textAlign:
                            "right",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {
                          row.tax_rate
                        }
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>

            {/* TOTAL */}

            {activeRows.length >
              0 &&
              !loading &&
              selectedCompany && (
                <tfoot>
                  <tr
                    style={{
                      background:
                        "#fff",

                      borderTop:
                        "1px solid " +
                        BORDER,
                    }}
                  >
                    <td
                      colSpan={4}
                      style={{
                        padding:
                          "10px 12px",

                        fontWeight:
                          600,

                        color:
                          "#475569",
                      }}
                    >
                      Total
                    </td>

                    <td
                      style={{
                        padding:
                          "10px 12px",

                        textAlign:
                          "right",

                        fontWeight:
                          700,

                        color:
                          "#1e293b",
                      }}
                    >
                      {fmtNum(
                        totals.value
                      )}
                    </td>

                    <td />
                  </tr>
                </tfoot>
              )}
          </table>
        </div>
      </div>
    </div>
  );
}