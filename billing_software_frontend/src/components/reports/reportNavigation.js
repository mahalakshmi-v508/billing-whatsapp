/*
 * Single source of truth for the Reports navigation (the report registry).
 *
 * INTERNAL only: each report carries `group` metadata (transactions /
 * profit-loss / financial / party) purely to organise code into folders.
 * The group value is NEVER rendered in the UI — the dropdown is flat and
 * shows only actual report names.
 *
 * `path`  → the client route (rendered under <ReportsLayout/>)
 * `title` → the report name shown in the dropdown
 * `slug`  → stable identifier used to locate the page component
 *
 * NOTE: There is NO "frequently used" concept hardcoded here. "Frequently
 * Used" is derived at runtime from real user report activity (see
 * reportUsage.js). The reports array below is purely the available registry.
 */

export const reportGroups = [
  { key: "transactions", label: "Transactions", folder: "transactions" },
  { key: "profit-loss", label: "Profit & Loss", folder: "profit-loss" },
  { key: "financial", label: "Financial", folder: "financial" },
  { key: "party", label: "Party", folder: "party" },
];

export const reports = [
  { title: "Sale", path: "/reports/sale", group: "transactions", slug: "Sale" },
  { title: "Purchase Bills", path: "/reports/purchase", group: "transactions", slug: "Purchase" },
  { title: "Day Book", path: "/reports/day-book", group: "transactions", slug: "DayBook" },
  { title: "All Transactions", path: "/reports/all-transactions", group: "transactions", slug: "AllTransactions" },

  { title: "Party Statement", path: "/reports/party-statement", group: "party", slug: "PartyStatement" },
  { title: "All Parties", path: "/reports/all-parties", group: "party", slug: "AllParties" },
  { title: "Party Report By Item", path: "/reports/party-by-item", group: "party", slug: "PartyReportByItem" },
  { title: "Sale Purchase By Party", path: "/reports/sale-purchase-by-party", group: "party", slug: "SalePurchaseByParty" },
  { title: "Sale Purchase By Party Group", path: "/reports/sale-purchase-by-party-group", group: "party", slug: "SalePurchaseByPartyGroup" },
];

/** Return the report (from the registry) whose path matches, if any. */
export function findReportByPath(pathname) {
  if (!pathname) return null;
  const normalized = pathname.replace(/\/$/, "");
  return reports.find((r) => r.path === normalized) || null;
}

/** Default (first) report path, used when landing on /reports. */
export const defaultReportPath = reports[0].path;
