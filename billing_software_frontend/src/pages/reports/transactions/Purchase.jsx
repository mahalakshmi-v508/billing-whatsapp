import PurchaseList from "../../purchase/PurchaseList";

/*
 * The reports "Purchase" page renders the Purchase Bills list content (the
 * same component used by the admin sidebar /purchases route) inside the
 * reports area, so the report selector stays visible on top.
 */
export default function Purchase() {
  return <PurchaseList />;
}
