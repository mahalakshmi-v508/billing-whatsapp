/**
 * Default values for the company setting blobs.
 *
 * These live outside the settings screens so that both the screens and the
 * billing/sales pages can share them without a component file exporting
 * non-component values (which breaks React Fast Refresh).
 */

export const DEFAULT_POS_SETTINGS = {
  auto_print_on_save: false,
  mandatory_customer_mobile: false,
  default_billing_screen: "quick", // "quick" | "detailed"
  barcode_scanner_speed_mode: true,
  auto_clear_cart_after_save: true,
};

export const DEFAULT_STOCK_SETTINGS = {
  negative_stock_mode: "block", // "block" | "warning" | "allow"
  low_stock_alert: true,
  low_stock_threshold: 5,
  expiry_control_mode: "block", // "block" | "warning" | "disabled"
  near_expiry_alert: true,
  near_expiry_days: 30,
};

export const DEFAULT_STORE_SETUP = {
  counter_name: "Counter-1",
  store_logo: "",
  owner_signature: "",
  signature_label: "Authorized Signatory",
  working_hours: "09:00 AM - 10:00 PM (All Days)",
  store_slogan: "தரமான பொருட்கள், நியாயமான விலை!",
  show_counter_on_bill: true,
  show_logo_on_bill: true,
  show_signature_on_bill: true,
  show_slogan_on_bill: true,
  show_working_hours_on_bill: true,
};

export const DEFAULT_TAX_BACKUP = {
  default_tax_mode: "inclusive", // "inclusive" (with_gst) | "exclusive" (without_gst)
  allow_cashier_tax_toggle: true, // Allow cashier to toggle tax mode on POS screen
  apply_to_unlisted_items: true,
  auto_backup_reminder: true,
  last_backup_date: null,
};

export const DEFAULT_WHATSAPP_DEFAULTS = {
  default_country_code: "+91",
  auto_prefix_country_code: true,
  send_daily_summary_to_owner: true,
  owner_whatsapp_number: "",
  daily_summary_time: "21:00",
  include_payment_breakdown: true,
  include_top_items: true,
};
