import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";
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

  /* ── Pagination ───────────────────────────────────────────── */

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    rowsPerPage,
    setRowsPerPage,
  ] = useState(10);

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
      showToast(
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
      showToast(
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
      showToast(
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

  const totalRows = activeRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedStart = (safePage - 1) * rowsPerPage;
  const pagedRows = activeRows.slice(pagedStart, pagedStart + rowsPerPage);
return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto text-slate-800">
      {/* ═══════════════════════════════════════════════════════════════
          1. HEADER & FILTER BAR
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl p-4 md:p-5 shadow-xs border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Date Filters, Firm & Checkbox */}
        <div className="flex flex-wrap items-center gap-3">
          {/* FROM MONTH / YEAR */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">From</span>
            <select
              value={fromMonth}
              onChange={(e) => setFromMonth(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, index) => now.getFullYear() - 5 + index).map((year) => (
                <option key={year} value={year}>
                  {year}
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
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <select
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value))}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, index) => now.getFullYear() - 5 + index).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* FIRM */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500">Firm</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-slate-800 p-0 focus:ring-0 cursor-pointer max-w-[180px]"
            >
              <option value="">Select firm…</option>
              {companies.map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* CONSIDER EXEMPT CHECKBOX */}
          <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 shadow-2xs">
            <input
              type="checkbox"
              checked={considerExempt}
              onChange={(e) => setConsiderExempt(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Consider non-tax as exempted</span>
          </label>
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
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          2. KPI SUMMARY CARDS RIBBON
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Inward Entries */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Total Records</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-slate-900">{activeRows.length}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
              {activeTab === "purchase" ? "Purchase invoices recorded" : "Purchase return entries"}
            </div>
          </div>
        </div>

        {/* Total Inward Supplies Value */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase">Inward Value (₹)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl md:text-2xl font-black text-purple-600">₹{fmtNum(totals.value)}</div>
            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Total eligible inward purchases</div>
          </div>
        </div>

        {/* Current Filing Period */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs flex flex-col justify-between bg-gradient-to-br from-white via-indigo-50/20 to-indigo-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-900">Return Type</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              GSTR-2
            </span>
          </div>
          <div>
            <div className="text-lg md:text-xl font-black text-indigo-700">
              {monthNames[fromMonth - 1]?.slice(0, 3)} {fromYear} – {monthNames[toMonth - 1]?.slice(0, 3)} {toYear}
            </div>
            <div className="text-[10px] text-indigo-500 font-semibold mt-0.5">
              Inward Supply Period
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
              { key: "purchase", label: "Purchase / Inward Supplies", icon: Truck },
              { key: "return", label: "Purchase Return", icon: ArrowUpRight },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setPage(1); }}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-indigo-100"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
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
                      Loading GST R2 inward supplies data...
                    </div>
                  </td>
                </tr>
              ) : !selectedCompany ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">Select a firm</div>
                      <div className="text-xs text-slate-400">Please choose a firm from the top dropdown to generate GST R2.</div>
                    </div>
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Truck size={32} className="text-slate-300" />
                      <div className="text-sm font-bold text-slate-700">No records found</div>
                      <div className="text-xs text-slate-400">No inward supplies found for the selected period.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{row.gstin}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{row.party_name}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{row.invoice_no}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900 whitespace-nowrap">
                      ₹{fmtNum(row.value)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600 whitespace-nowrap">
                      {row.tax_rate}
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
    </div>
  );
}
