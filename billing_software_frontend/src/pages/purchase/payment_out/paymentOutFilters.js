/**
 * Pure filtering logic for the Payment-Out page.
 *
 * Kept in a React-free module so the rules can be unit tested directly and
 * reused without dragging the page component in.
 */

/* ── Shared data helpers ── */

// Normalise any date-ish value to a plain YYYY-MM-DD string.
// Handles "2026-09-30", "2026-09-30 14:22:01" and "2026-09-30T14:22:01.000Z".
export const toDateKey = (value) => {
  if (!value) return "";
  const iso = String(value).split("T")[0].split(" ")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : "";
};

// Safely coerce API values to a finite number.
export const toNum = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

// Supplier-based Total Amount (sum of all submitted purchase bills for this supplier)
export const getTotalAmount = (p) => {
  if (!p) return 0;
  if (p.supplier_total != null && toNum(p.supplier_total) > 0) {
    return toNum(p.supplier_total);
  }
  if (p.supplier_total_due != null && toNum(p.supplier_total_due) > 0) {
    return toNum(p.supplier_total_due);
  }
  if (p.invoice_total != null && toNum(p.invoice_total) > 0) {
    return toNum(p.invoice_total);
  }
  if (p.total_amount != null && toNum(p.total_amount) > 0) {
    return toNum(p.total_amount);
  }
  return toNum(p.amount);
};

// Payment voucher disbursed amount
export const getPaidAmount = (p) => {
  if (!p) return 0;
  return toNum(p.amount ?? p.paid_amount);
};

// Supplier-based remaining Balance Due (total outstanding dues across submitted bills)
export const getBalanceAmount = (p) => {
  if (!p) return 0;
  if (p.supplier_balance != null) {
    return toNum(p.supplier_balance);
  }
  if (p.supplier_balance_due != null) {
    return toNum(p.supplier_balance_due);
  }
  if (p.balance_amount != null) {
    return toNum(p.balance_amount);
  }
  if (p.invoice_balance != null) {
    return toNum(p.invoice_balance);
  }
  return 0;
};

// Supplier-based Advance Balance
export const getAdvanceAmount = (p) => {
  if (!p) return 0;
  return toNum(p.supplier_advance ?? p.advance_balance ?? p.advance_amount ?? 0);
};

const idOf = (value) => (value == null || value === "" ? "" : String(value));

/**
 * Apply every active Payment-Out filter to the loaded records.
 *
 * All active filters are combined with AND. Each one is strict: a record is
 * only kept when it genuinely matches, and identity is resolved by id *or* by
 * name so a row is never dropped because a join came back empty.
 */
export function filterPaymentOuts(
  payments,
  { fromDate, toDate, selectedFirm, selectedSupplier, searchQuery, companies = [], suppliers = [] } = {}
) {
  const firmId = String(selectedFirm);
  const firmName =
    selectedFirm === "all"
      ? ""
      : String(companies.find((c) => String(c.id) === firmId)?.company_name || "");

  const supplierId = String(selectedSupplier);
  const selectedSupplierRow = suppliers.find((s) => String(s.id) === supplierId);
  const supplierName =
    selectedSupplier === "all"
      ? ""
      : String(selectedSupplierRow?.supplier_name || selectedSupplierRow?.name || "");

  const query = String(searchQuery || "").trim().toLowerCase();

  return (payments || []).filter((item) => {
    /* ── Date range: a from-only or to-only range is still valid ── */
    if (fromDate || toDate) {
      const itemDate = toDateKey(item.payment_date) || toDateKey(item.created_at);
      if (itemDate) {
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
      }
    }

    /* ── Firm filter ── */
    if (selectedFirm !== "all") {
      const rowFirmId = idOf(item.company_id);
      const rowFirmName = String(item.company_name || "");
      const matchesFirm =
        (rowFirmId !== "" && rowFirmId === firmId) ||
        (firmName !== "" && rowFirmName === firmName);
      if (!matchesFirm) return false;
    }

    /* ── Supplier filter ── */
    if (selectedSupplier !== "all") {
      const rowSupplierId = idOf(item.supplier_id);
      const rowSupplierName = String(item.supplier_name || "");
      const matchesSupplier =
        (rowSupplierId !== "" && rowSupplierId === supplierId) ||
        (supplierName !== "" && rowSupplierName === supplierName);
      if (!matchesSupplier) return false;
    }

    /* ── Search across payment + vendor data ── */
    if (query) {
      const haystack = [
        item.receipt_no,
        item.purchase_no,
        item.supplier_name,
        item.supplier_phone,
        item.company_name,
        item.notes,
        item.payment_method,
        getTotalAmount(item),
        getPaidAmount(item),
        getBalanceAmount(item),
        getAdvanceAmount(item),
      ];
      if (!haystack.some((field) => String(field ?? "").toLowerCase().includes(query))) {
        return false;
      }
    }

    return true;
  });
}

/** Totals for the KPI strip, always scoped to the currently filtered set. */
export function summarizePayments(payments) {
  return (payments || []).reduce(
    (acc, p) => {
      acc.total += getTotalAmount(p);
      acc.paid += getPaidAmount(p);
      acc.discount += toNum(p.discount_amount);
      acc.balance += getBalanceAmount(p);
      return acc;
    },
    { total: 0, paid: 0, discount: 0, balance: 0 }
  );
}
