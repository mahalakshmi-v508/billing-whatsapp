// Single source of truth mapping:
//   Settings > General > "More Transactions" checkbox
//        → transaction settings key
//        → Main Sidebar > Sale submenu item
//        → route
//
// The Sale dropdown in the sidebar is built from this list, filtered by the
// same `general` settings object that the General settings page persists
// (via useBackendSync → settingsApi). Checking/unchecking a checkbox in
// Settings > General updates this state, and the sidebar reacts to it.
export const SALES_TRANSACTION_MENU_ITEMS = [
  {
    settingsKey: "quotation",
    label: "Estimate/Quotation",
    path: "/sales/quotations",
  },
  {
    settingsKey: "proforma",
    label: "Proforma Invoice",
    path: "/sales/proforma",
  },
  {
    settingsKey: "order",
    label: "Sale/Purchase Order",
    path: "/sales/order",
  },
  {
    settingsKey: "deliveryChallan",
    label: "Delivery Challan",
    path: "/sales/delivery-challan",
  },
  {
    settingsKey: "otherIncome",
    label: "Other Income",
    path: "/sales/other-income",
  },
  {
    settingsKey: "fixedAssets",
    label: "Fixed Assets",
    path: "/sales/fixed-assets",
  },
];