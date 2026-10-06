/**
 * Shared inventory stock-alert rules.
 *
 * These were previously hardcoded per page (5 on the products list, 5 on the
 * dashboard, none on the header notifications), which let the same product show
 * as a low-stock alert in one view and stay hidden in another. Keeping the rules
 * here means the bell, the dashboard tables and the products list can never
 * disagree about what counts as low or out of stock.
 */

/** Stock below this level raises a "low stock" alert. */
export const LOW_STOCK_THRESHOLD = 10;

/** Read a product's stock as a safe number (null/undefined/NaN collapse to 0). */
export function getStock(product) {
  const value = Number(product?.stock);
  return Number.isFinite(value) ? value : 0;
}

/** True when the product has run out (zero or a negative oversold quantity). */
export function isOutOfStock(product) {
  return getStock(product) <= 0;
}

/** True when the product still has stock but sits under the alert threshold. */
export function isLowStock(product) {
  const stock = getStock(product);
  return stock > 0 && stock < LOW_STOCK_THRESHOLD;
}

/** Healthy stock: at or above the threshold. */
export function isInStock(product) {
  return getStock(product) >= LOW_STOCK_THRESHOLD;
}

/** "Out of Stock" / "Low Stock" / "In Stock" - the single label source. */
export function getStockStatus(product) {
  if (isOutOfStock(product)) return "out_of_stock";
  if (isLowStock(product)) return "low_stock";
  return "in_stock";
}

/** Human label for the three buckets. */
export function getStockStatusLabel(product) {
  const status = getStockStatus(product);
  if (status === "out_of_stock") return "Out of Stock";
  if (status === "low_stock") return "Low Stock";
  return "In Stock";
}

/**
 * Matches one product against a products-page filter tab.
 * "all" returns true so callers can use this as the single filter predicate.
 */
export function matchesStockTab(product, tab) {
  const status = getStockStatus(product);
  // Inactive products are excluded from the actionable alert tabs, matching the
  // previous behaviour where only active SKUs could raise a low-stock alert.
  const isActionable = product?.status === "active";

  if (tab === "in_stock") return status === "in_stock";
  if (tab === "out_of_stock") return status === "out_of_stock";
  if (tab === "low_stock") return status === "low_stock" && isActionable;
  return true;
}

/** Count helper for the products-page tab badges. */
export function countByStockStatus(products, status) {
  return (products || []).filter((p) => getStockStatus(p) === status).length;
}

/** Active low-stock count (excludes out-of-stock rows, which get their own bucket). */
export function countLowStock(products) {
  return (products || []).filter((p) => p?.status === "active" && isLowStock(p)).length;
}