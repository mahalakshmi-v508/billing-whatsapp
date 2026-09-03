import SaleInvoices from "../../sales/SaleInvoices";

/*
 * The reports "Sale" page renders the Sale Invoices page content (the same
 * component used by the admin sidebar /sales/invoices route) inside the
 * reports area, so the report selector stays visible on top.
 */
export default function Sale() {
  return <SaleInvoices />;
}
