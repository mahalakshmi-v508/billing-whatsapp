/*
 * Single source of truth for the Reports navigation (the report registry).
 *
 * The in-page report dropdown (ReportsNavDropdown) is organised into
 * expandable/collapsible sections (reportSections), each with a heading and
 * its sub-reports. Any report that isn't grouped into one of these sections
 * lives in `otherReports`, shown as a flat "All Reports" group.
 *
 * The "GST reports" section is a dedicated sales/GST-return submenu:
 *   GSTR 1, GSTR 2, GSTR 3 B, GSTR 9, Sale Summary By HSN, SAC Report
 *
 * Each report entry carries:
 *   `path`  → the client route (rendered under <ReportsLayout/>)
 *   `title` → the report name shown in the UI
 *   `slug`  → stable identifier used to locate/locate the page component and
 *             for Frequently-Used tracking
 *
 * `reports`, `findReportByPath` and `defaultReportPath` are the flattened
 * helpers consumed by reportUsage.js / ReportsLayout / the dropdown — kept for
 * backward compatibility.
 *
 * NOTE: There is NO "frequently used" concept hardcoded here. "Frequently
 * Used" is derived at runtime from real user report activity (see
 * reportUsage.js).
 */

/** Organisational folder metadata (purely to organise code, never rendered). */
export const reportGroups = [
  { key: "transactions", label: "Transactions", folder: "transactions" },
  { key: "profit-loss", label: "Profit & Loss", folder: "profit-loss" },
  { key: "financial", label: "Financial", folder: "financial" },
  { key: "party", label: "Party", folder: "party" },
  { key: "gst", label: "GST Reports", folder: "GSTReports" },
  { key: "stock", label: "Stock", folder: "stock" },
];

/**
 * The sectioned navigation structure shown in the report dropdown. Each section
 * is an expandable heading whose `reports` are its sub-items.
 */
export const reportSections = [
  {
    key: "item-stock",
    label: "Item / Stock Report",
    reports: [
      { title: "Stock Summary", path: "/reports/stock-summary", slug: "StockSummary" },
      { title: "Item Report By Party", path: "/reports/item-report-by-party", slug: "ItemReportByParty" },
      { title: "Item Wise Profit And Loss", path: "/reports/item-wise-profit-and-loss", slug: "ItemWiseProfitAndLoss" },
      { title: "Item Category Wise Profit And Loss", path: "/reports/item-category-wise-profit-and-loss", slug: "ItemCategoryWiseProfitAndLoss" },
      { title: "Low Stock Summary", path: "/reports/low-stock-summary", slug: "LowStockSummary" },
      { title: "Stock Detail", path: "/reports/stock-detail", slug: "StockDetail" },
      { title: "Item Detail", path: "/reports/item-detail", slug: "ItemDetail" },
      { title: "Sale / Purchase Report By Item Category", path: "/reports/sale-purchase-by-item-category", slug: "SalePurchaseByItemCategory" },
      { title: "Stock Summary Report By Item Category", path: "/reports/stock-summary-by-item-category", slug: "StockSummaryByItemCategory" },
      { title: "Item Wise Discount", path: "/reports/item-wise-discount", slug: "ItemWiseDiscount" },
    ],
  },
  {
    key: "business-status",
    label: "Business Status",
    reports: [
      { title: "Bank Statement", path: "/reports/bank-statement", slug: "BankStatement" },
      { title: "Discount Report", path: "/reports/discount-report", slug: "DiscountReport" },
    ],
  },
  {
    key: "taxes",
    label: "Taxes",
    reports: [
      { title: "GST Report", path: "/reports/gst-report", slug: "GSTReport" },
      { title: "GST Rate Report", path: "/reports/gst-rate-report", slug: "GSTRateReport" },
      { title: "Form No. 27EQ", path: "/reports/form-27eq", slug: "FormNo27EQ" },
      { title: "TCS Receivable", path: "/reports/tcs-receivable", slug: "TCSReceivable" },
      { title: "TDS Payable", path: "/reports/tds-payable", slug: "TDSPayable" },
      { title: "TDS Receivable", path: "/reports/tds-receivable", slug: "TDSReceivable" },
    ],
  },
  {
    key: "gst-reports",
    label: "GST Reports",
    reports: [
      { title: "GSTR 1", path: "/reports/gst-r1", slug: "GstR1" },
      { title: "GSTR 2", path: "/reports/gst-r2", slug: "GstR2" },
      { title: "GSTR 3 B", path: "/reports/gstr-3b", slug: "Gstr3B" },
      { title: "GSTR 9", path: "/reports/gstr-9", slug: "Gstr9" },
      { title: "Sale Summary By HSN", path: "/reports/sale-summary-by-hsn", slug: "SaleSummaryByHSN" },
      { title: "SAC Report", path: "/reports/sac-report", slug: "SACReport" },
    ],
  },
  {
    key: "expense",
    label: "Expense Report",
    reports: [
      { title: "Expense", path: "/reports/expense", slug: "Expense" },
      { title: "Expense Category Report", path: "/reports/expense-category-report", slug: "ExpenseCategoryReport" },
      { title: "Expense Item Report", path: "/reports/expense-item-report", slug: "ExpenseItemReport" },
    ],
  },
  {
    key: "sale-order",
    label: "Sale Order Report",
    reports: [
      { title: "Sale Orders", path: "/reports/sale-orders", slug: "SaleOrders" },
      { title: "Sale Order Item", path: "/reports/sale-order-item", slug: "SaleOrderItem" },
    ],
  },
  {
    key: "loan",
    label: "Loan Accounts",
    reports: [
      { title: "Loan Statement", path: "/reports/loan-statement", slug: "LoanStatement" },
    ],
  },
];

/** Reports that are not grouped into a section — shown as a flat "All Reports" group. */
export const otherReports = [
  { title: "Sale", path: "/reports/sale", slug: "Sale" },
  { title: "Purchase", path: "/reports/purchase", slug: "Purchase" },
  { title: "Day Book", path: "/reports/day-book", slug: "DayBook" },
  { title: "All Transactions", path: "/reports/all-transactions", slug: "AllTransactions" },
  { title: "Payment In", path: "/reports/payment-in", slug: "PaymentIn" },
  { title: "Payment Out", path: "/reports/payment-out", slug: "PaymentOut" },

  { title: "Party Statement", path: "/reports/party-statement", slug: "PartyStatement" },
  { title: "All Parties", path: "/reports/all-parties", slug: "AllParties" },
  { title: "Party Report By Item", path: "/reports/party-by-item", slug: "PartyReportByItem" },
  { title: "Sale Purchase By Party", path: "/reports/sale-purchase-by-party", slug: "SalePurchaseByParty" },
  { title: "Sale Purchase By Party Group", path: "/reports/sale-purchase-by-party-group", slug: "SalePurchaseByPartyGroup" },
];

/** Flat list of every report (all sections + other reports). */
export const reports = [...otherReports, ...reportSections.flatMap((s) => s.reports)];

/** Return the report (from the full registry) whose path matches, if any. */
export function findReportByPath(pathname) {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/$/, "");
  return reports.find((r) => r.path === normalized) || null;
}

/** Default (first) report path, used when landing on /reports. */
export const defaultReportPath = reports[0].path;
