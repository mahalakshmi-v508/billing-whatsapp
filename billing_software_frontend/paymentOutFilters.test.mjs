import assert from "node:assert/strict";
import {
  filterPaymentOuts,
  summarizePayments,
  getTotalAmount,
  getPaidAmount,
  getBalanceAmount,
} from "./src/pages/purchase/payment_out/paymentOutFilters.js";

const COMPANIES = [
  { id: 1, company_name: "Alpha Traders" },
  { id: 2, company_name: "Beta Enterprises" },
];

const SUPPLIERS = [
  { id: 10, supplier_name: "Sri Ram Vendor" },
  { id: 11, supplier_name: "Kumar Supplies" },
  { id: 12, supplier_name: "Nova Traders" },
];

const PAYMENTS = [
  {
    id: 1, company_id: 1, company_name: "Alpha Traders",
    supplier_id: 10, supplier_name: "Sri Ram Vendor",
    receipt_no: "REC-1", purchase_no: "PUR-1",
    payment_date: "2026-09-05", amount: 1000, invoice_total: 4000, invoice_balance: 3000,
    payment_method: "cash", notes: "Part payment", supplier_phone: "9876543210",
  },
  {
    id: 2, company_id: 1, company_name: "Alpha Traders",
    supplier_id: 11, supplier_name: "Kumar Supplies",
    receipt_no: "REC-2", purchase_no: "PUR-2",
    payment_date: "2026-09-20", amount: 2500, invoice_total: 2500, invoice_balance: 0,
    payment_method: "upi", notes: "Full settlement", supplier_phone: "9000000001",
  },
  {
    id: 3, company_id: 2, company_name: "Beta Enterprises",
    supplier_id: 10, supplier_name: "Sri Ram Vendor",
    receipt_no: "REC-3", purchase_no: "PUR-3",
    payment_date: "2026-10-02", amount: 750, invoice_total: 750, invoice_balance: 0,
    payment_method: "cheque", notes: "Advance", supplier_phone: "9876543210",
  },
  {
    id: 4, company_id: 2, company_name: "Beta Enterprises",
    supplier_id: 12, supplier_name: "Nova Traders",
    receipt_no: "REC-4", purchase_no: "PUR-4",
    payment_date: "2026-08-14", amount: 3200, invoice_total: 3200, invoice_balance: 500,
    payment_method: "cash", notes: "", supplier_phone: "9111111111",
  },
  {
    // Row whose supplier join came back empty but name is present.
    id: 5, company_id: 1, company_name: "Alpha Traders",
    supplier_id: null, supplier_name: "Nova Traders",
    receipt_no: "REC-5", purchase_no: "PUR-5",
    payment_date: "2026-09-30", amount: 500, invoice_total: 500, invoice_balance: 0,
    payment_method: "cash", notes: "orphan row", supplier_phone: null,
  },
];

const run = (over = {}) =>
  filterPaymentOuts(PAYMENTS, {
    fromDate: "",
    toDate: "",
    selectedFirm: "all",
    selectedSupplier: "all",
    searchQuery: "",
    companies: COMPANIES,
    suppliers: SUPPLIERS,
    ...over,
  }).map((p) => p.id);

let pass = 0;
const test = (name, fn) => {
  fn();
  pass += 1;
  console.log(`  ok  ${name}`);
};

console.log("\nPayment-Out filter logic\n");

test("no filters returns the original dataset", () => {
  assert.deepEqual(run(), [1, 2, 3, 4, 5]);
});

test("This Month preset window (Sep 2026) keeps only September rows", () => {
  assert.deepEqual(run({ fromDate: "2026-09-01", toDate: "2026-09-30" }), [1, 2, 5]);
});

test("to-date boundary is inclusive (last day of range is kept)", () => {
  assert.ok(run({ fromDate: "2026-09-01", toDate: "2026-09-30" }).includes(5));
});

test("from-date boundary is inclusive", () => {
  assert.ok(run({ fromDate: "2026-09-05", toDate: "2026-09-30" }).includes(1));
});

test("Today preset (same from/to) still returns that day", () => {
  assert.deepEqual(run({ fromDate: "2026-09-30", toDate: "2026-09-30" }), [5]);
});

test("from-date only still filters", () => {
  // Rows 1,2,5 are on/after 2026-09-01; row 3 is 2026-10-02 (also in range);
  // row 4 is 2026-08-14 (out of range).
  assert.deepEqual(run({ fromDate: "2026-09-01" }), [1, 2, 3, 5]);
});

test("to-date only still filters", () => {
  assert.deepEqual(run({ toDate: "2026-09-05" }), [1, 4]);
});

test("firm filter returns only that firm's payments", () => {
  assert.deepEqual(run({ selectedFirm: "1" }), [1, 2, 5]);
  assert.deepEqual(run({ selectedFirm: "2" }), [3, 4]);
});

test("firm filter is strict: rows with no company_id are NOT let through", () => {
  const withNull = [{ ...PAYMENTS[0], company_id: null, company_name: null }];
  assert.equal(
    filterPaymentOuts(withNull, {
      fromDate: "", toDate: "", selectedFirm: "1", selectedSupplier: "all",
      searchQuery: "", companies: COMPANIES, suppliers: SUPPLIERS,
    }).length,
    0
  );
});

test("firm filter matches on firm name when the id join is empty", () => {
  const byName = [{ ...PAYMENTS[0], company_id: null }];
  assert.equal(
    filterPaymentOuts(byName, {
      fromDate: "", toDate: "", selectedFirm: "1", selectedSupplier: "all",
      searchQuery: "", companies: COMPANIES, suppliers: SUPPLIERS,
    }).length,
    1
  );
});

test("supplier filter returns only that supplier's payments", () => {
  assert.deepEqual(run({ selectedSupplier: "10" }), [1, 3]);
  assert.deepEqual(run({ selectedSupplier: "11" }), [2]);
  assert.deepEqual(run({ selectedSupplier: "12" }), [4, 5]);
});

test("supplier filter matches on name when supplier_id is null (broken join)", () => {
  // Row 5 has supplier_id null but supplier_name "Nova Traders" -> id 12.
  assert.deepEqual(run({ selectedSupplier: "12" }), [4, 5]);
});

test("search matches receipt number", () => {
  assert.deepEqual(run({ searchQuery: "REC-2" }), [2]);
});

test("search matches supplier / vendor name", () => {
  assert.deepEqual(run({ searchQuery: "sri ram" }), [1, 3]);
});

test("search matches notes", () => {
  assert.deepEqual(run({ searchQuery: "advance" }), [3]);
});

test("search matches amount", () => {
  assert.deepEqual(run({ searchQuery: "2500" }), [2]);
});

test("search matches payment method", () => {
  assert.deepEqual(run({ searchQuery: "cheque" }), [3]);
});

test("search is case insensitive and trimmed", () => {
  assert.deepEqual(run({ searchQuery: "  KUMAR  " }), [2]);
});

test("search with no match returns nothing", () => {
  assert.deepEqual(run({ searchQuery: "zzzz-nope" }), []);
});

test("firm + supplier combine with AND", () => {
  assert.deepEqual(run({ selectedFirm: "1", selectedSupplier: "10" }), [1]);
});

test("firm + date range combine with AND", () => {
  assert.deepEqual(run({ selectedFirm: "1", fromDate: "2026-09-01", toDate: "2026-09-10" }), [1]);
});

test("supplier + date range combine with AND", () => {
  assert.deepEqual(run({ selectedSupplier: "10", fromDate: "2026-10-01" }), [3]);
});

test("all filters together apply", () => {
  assert.deepEqual(
    run({ selectedFirm: "1", selectedSupplier: "11", fromDate: "2026-09-01", toDate: "2026-09-30", searchQuery: "kumar" }),
    [2]
  );
});

test("all filters together can legitimately produce an empty result", () => {
  assert.deepEqual(
    run({ selectedFirm: "2", selectedSupplier: "11", fromDate: "2026-09-01", toDate: "2026-09-30" }),
    []
  );
});

test("clearing filters restores the original dataset", () => {
  const filtered = run({ selectedFirm: "1", selectedSupplier: "10", fromDate: "2026-09-01", toDate: "2026-09-30", searchQuery: "sri" });
  assert.deepEqual(filtered, [1]);
  assert.deepEqual(run(), [1, 2, 3, 4, 5]);
});

test("summary cards follow the filtered set", () => {
  const all = summarizePayments(PAYMENTS);
  assert.equal(all.paid, 1000 + 2500 + 750 + 3200 + 500);
  assert.equal(all.total, 4000 + 2500 + 750 + 3200 + 500);
  assert.equal(all.balance, 3000 + 0 + 0 + 500 + 0);

  const sep = filterPaymentOuts(PAYMENTS, {
    fromDate: "2026-09-01", toDate: "2026-09-30",
    selectedFirm: "all", selectedSupplier: "all", searchQuery: "",
    companies: COMPANIES, suppliers: SUPPLIERS,
  });
  const sepSummary = summarizePayments(sep);
  assert.equal(sep.length, 3);
  assert.equal(sepSummary.paid, 1000 + 2500 + 500);
  assert.equal(sepSummary.balance, 3000);
});

test("amount helpers fall back to the linked purchase invoice", () => {
  assert.equal(getTotalAmount({ amount: 1000, invoice_total: 4000 }), 4000);
  assert.equal(getPaidAmount({ amount: 1000 }), 1000);
  assert.equal(getBalanceAmount({ invoice_balance: 3000 }), 3000);
  assert.equal(getBalanceAmount({}), 0);
});

test("null payment_date falls back to created_at for the date filter", () => {
  const rows = [{ id: 9, payment_date: null, created_at: "2026-09-15 10:00:00", supplier_id: 10, company_id: 1 }];
  assert.deepEqual(
    filterPaymentOuts(rows, {
      fromDate: "2026-09-01", toDate: "2026-09-30",
      selectedFirm: "all", selectedSupplier: "all", searchQuery: "",
      companies: COMPANIES, suppliers: SUPPLIERS,
    }).map((p) => p.id),
    [9]
  );
});

test("empty dataset and missing filter object are safe", () => {
  assert.deepEqual(filterPaymentOuts([], {}), []);
  assert.deepEqual(filterPaymentOuts(undefined, {}), []);
});

console.log(`\n${pass} passing\n`);
