import SaleReport from "./SaleReport";

/*
 * The reports "Sale" page renders the dedicated Sale Report file (the same
 * code as the sale invoices page, but kept as its own reports-local file so
 * it is handled separately from /sales/invoices) inside the reports area,
 * so the report selector stays visible on top.
 */
export default function Sale() {
  return <SaleReport />;
}
