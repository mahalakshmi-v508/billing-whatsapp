/**
 * Shared presentation helpers for the audit trail UI.
 *
 * Action colours match the existing StatusBadge tone vocabulary used across the
 * bill History screens so the audit drawer feels native to the app.
 */

export const ACTION_STYLES = {
  create: {
    label: "Created",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  update: {
    label: "Updated",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  delete: {
    label: "Deleted",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  toggle: {
    label: "Status",
    chip: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
  payment: {
    label: "Payment",
    chip: "bg-teal-50 text-teal-700 border-teal-200",
    dot: "bg-teal-500",
  },
  login: {
    label: "Sign In",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  logout: {
    label: "Sign Out",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  approve: {
    label: "Approved",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  reject: {
    label: "Rejected",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
  cancel: {
    label: "Cancelled",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  mark_paid: {
    label: "Marked Paid",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  comment: {
    label: "Comment",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  send: {
    label: "Sent",
    chip: "bg-cyan-50 text-cyan-700 border-cyan-200",
    dot: "bg-cyan-500",
  },
  export: {
    label: "Export",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  print: {
    label: "Print",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  submit: {
    label: "Submitted",
    chip: "bg-sky-50 text-sky-700 border-sky-200",
    dot: "bg-sky-500",
  },
};

const FALLBACK = {
  label: "Action",
  chip: "bg-slate-100 text-slate-600 border-slate-200",
  dot: "bg-slate-400",
};

export function actionStyle(action) {
  return ACTION_STYLES[action] || {
    ...FALLBACK,
    label: action ? String(action).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Action",
  };
}

/** Grouping key for the "Today / Yesterday / date" section separators. */
export function dayGroup(isoString) {
  if (!isoString) return "Unknown";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Split a flat list into ordered day buckets for the timeline view. */
export function groupByDay(rows) {
  const buckets = [];
  const index = new Map();

  rows.forEach((row) => {
    const key = dayGroup(row.created_at);
    if (!index.has(key)) {
      const bucket = { key, rows: [] };
      index.set(key, bucket);
      buckets.push(bucket);
    }
    index.get(key).rows.push(row);
  });

  return buckets;
}

/** Human label for a role value. */
export function roleLabel(role) {
  if (!role) return "";
  return String(role).replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Human-readable value for one diff cell (redacts nothing further). */
function displayValue(value) {
  if (value === null || value === undefined) return "(empty)";
  if (typeof value === "object") {
    try {
      const text = JSON.stringify(value);
      return text.length > 80 ? `${text.slice(0, 80)}…` : text;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/** "" / null / undefined all mean "no value" for comparison purposes. */
function isEmptyish(value) {
  return value === null || value === undefined || value === "";
}

/**
 * True when two snapshot values are effectively the same, so they must NOT be
 * reported as a change:
 *   - both empty-ish ("" vs null vs undefined vs missing)
 *   - exactly equal (same value, same type)
 */
function valuesEqual(a, b) {
  if (isEmptyish(a) && isEmptyish(b)) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Columns that never belong in the human-readable change list: primary keys,
 * audit timestamps, actor columns, tokens and secrets.
 */
function isInternalField(key) {
  const k = String(key).toLowerCase();
  if (k === "id" || k.endsWith("_id")) return true;      // id, customer_id, invoice_id…
  if (k.endsWith("_at")) return true;                     // created_at, updated_at…
  if (k.endsWith("_by")) return true;                     // created_by, updated_by…
  if (k === "timestamps") return true;
  return /(password|token|otp|secret|api_key|remember)/.test(k);
}

/**
 * Turn technical column names into plain billing-software labels.
 */
const FIELD_LABELS = {
  customer_name: "Customer Name",
  first_name: "First Name",
  last_name: "Last Name",
  name: "Name",
  phone: "Phone Number",
  mobile: "Mobile Number",
  mobile_number: "Mobile Number",
  email: "Email",
  address: "Address",
  billing_address: "Billing Address",
  shipping_address: "Shipping Address",
  city: "City",
  state: "State",
  pincode: "PIN Code",
  postal_code: "PIN Code",
  credit_limit: "Credit Limit",
  opening_balance: "Opening Balance",
  product_name: "Product Name",
  description: "Description",
  hsn_code: "HSN Code",
  gst_rate: "GST %",
  price: "Price",
  mrp: "MRP",
  cost_price: "Cost Price",
  selling_price: "Selling Price",
  unit_price: "Unit Price",
  quantity: "Quantity",
  qty: "Quantity",
  stock: "Stock",
  reorder_level: "Reorder Level",
  unit: "Unit",
  company_name: "Company Name",
  supplier_name: "Supplier Name",
  gstin: "GSTIN",
  gst_number: "GST Number",
  pan: "PAN Number",
  pan_number: "PAN Number",
  customer_code: "Customer Code",
  product_code: "Product Code",
  invoice_no: "Invoice Number",
  purchase_no: "Purchase Number",
  bill_no: "Bill Number",
  voucher_no: "Voucher Number",
  invoice_status: "Invoice Status",
  payment_status: "Payment Status",
  order_status: "Order Status",
  status: "Status",
  amount: "Amount",
  paid_amount: "Paid Amount",
  total_amount: "Total Amount",
  grand_total: "Grand Total",
  total: "Total",
  discount: "Discount",
  tax: "Tax",
  tax_rate: "Tax Rate",
  gst: "GST",
  balance: "Balance",
  balance_due: "Balance Due",
  due_amount: "Due Amount",
  date: "Date",
  due_date: "Due Date",
  invoice_date: "Invoice Date",
  payment_date: "Payment Date",
  notes: "Notes",
  remark: "Remark",
  category: "Category",
  category_name: "Category",
  brand: "Brand",
  brand_name: "Brand",
  subcategory: "Sub-Category",
  type: "Type",
  weight: "Weight",
};

const CURRENCY_KEYS = [
  "price", "mrp", "cost_price", "selling_price", "unit_price",
  "credit_limit", "opening_balance",
  "amount", "paid_amount", "total_amount", "grand_total", "total",
  "discount", "tax", "tax_rate", "gst", "balance", "balance_due",
  "due_amount", "advance_balance", "advance_amount", "commission",
];

/** snake_case → Title Case fallback when no friendly label exists. */
function friendlyLabel(key) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Present one value the way a normal user expects (₹, Yes/No, quoted text). */
function prettyValue(key, value) {
  if (isEmptyish(value)) return "empty";

  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "number" && CURRENCY_KEYS.includes(key)) {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }
  if (typeof value === "string" && CURRENCY_KEYS.includes(key) && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  }

  if (typeof value === "object") {
    try {
      const text = JSON.stringify(value);
      return text.length > 80 ? `'${text.slice(0, 80)}…'` : `'${text || "—"}'`;
    } catch {
      return "'—'";
    }
  }

  return `'${displayValue(value)}'`;
}

/** Pick a recognisable record name from a snapshot when record_label is missing. */
function scanRecordName(values) {
  const order = [
    "customer_name", "name", "product_name", "company_name", "supplier_name",
    "invoice_no", "purchase_no", "bill_no", "email", "phone",
  ];
  for (const key of order) {
    if (values && values[key] !== null && values[key] !== undefined && values[key] !== "") {
      return String(values[key]);
    }
  }
  return "";
}

/**
 * Generate plain-English sentences describing an audit entry.
 *
 * Works on the whole log row (not just the snapshots) so it can also echo the
 * record's name and type for create/delete wording. Only fields that actually
 * changed between before/after are turned into sentences.
 *
 * Returns: { intro, sentences: string[], total }
 */
export function describeChanges(log) {
  const action = log?.action || "";
  const recordType = log?.record_type || log?.module || "Record";
  const recordLabel = log?.record_label || scanRecordName(log?.new_values) || scanRecordName(log?.old_values);

  const oldValues = log?.old_values;
  const newValues = log?.new_values;
  const oldObj = oldValues && typeof oldValues === "object" ? oldValues : null;
  const newObj = newValues && typeof newValues === "object" ? newValues : null;

  const isCreate = action === "create" || (!oldObj && newObj);
  const isDelete = action === "delete" || (oldObj && !newObj);

  // ── CREATE ─────────────────────────────────────────────────────────────
  if (isCreate) {
    const type = String(recordType).length > 1 ? String(recordType).toLowerCase() : "record";
    return {
      intro: recordLabel
        ? `A new ${type} '${recordLabel}' was created.`
        : `A new ${type} record was created.`,
      sentences: [],
      total: 0,
    };
  }

  // ── DELETE (uses the before-snapshot) ──────────────────────────────────
  if (isDelete) {
    return {
      intro: recordLabel
        ? `${recordType} '${recordLabel}' was deleted.`
        : `The record was deleted.`,
      sentences: [],
      total: 0,
    };
  }

  // ── PAYMENT-TYPE ACTIONS ───────────────────────────────────────────────
  if (action === "payment" || action === "collect") {
    const amountKey = ["amount", "paid_amount", "payment_amount", "total_amount", "total"].find(
      (k) => newObj && newObj[k] !== null && newObj[k] !== undefined
    );
    if (amountKey) {
      const amount = prettyValue(amountKey, newObj[amountKey]);
      const target = recordLabel
        ? `${String(recordType).toLowerCase()} ${recordLabel.match(/^#/) ? "" : "#"}${recordLabel}`
        : String(recordType).toLowerCase();
      return {
        intro: `Payment of ${amount} was added to ${target}.`,
        sentences: [],
        total: 0,
      };
    }
  }

  // ── UPDATE: only fields that genuinely changed ─────────────────────────
  // Compare only keys that exist in BOTH snapshots. A key that the "after"
  // snapshot lacks is not evidence of removal (the response may simply omit it).
  const sentences = [];
  const keys = Object.keys(oldObj || {})
    .filter((key) => newObj && Object.prototype.hasOwnProperty.call(newObj, key));

  for (const key of keys) {
    if (isInternalField(key)) continue;

    const before = oldObj[key];
    const after = newObj[key];
    if (valuesEqual(before, after)) continue;

    const label = friendlyLabel(key);
    const from = prettyValue(key, before);
    const to = prettyValue(key, after);

    if (from === "empty") {
      sentences.push(`${label} was changed from empty to ${to}.`);
    } else if (to === "empty") {
      sentences.push(`${label} was cleared from ${from}.`);
    } else {
      sentences.push(`${label} changed from ${from} to ${to}.`);
    }
  }

  if (sentences.length === 0) {
    return { intro: "No meaningful changes were detected.", sentences: [], total: 0 };
  }

  return { intro: "Changes made:", sentences, total: sentences.length };
}