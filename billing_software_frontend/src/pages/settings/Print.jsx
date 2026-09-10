import { useState, useEffect } from "react";
import { 
  ChevronDown, QrCode, Printer, Maximize2, X, Check, Palette, Sparkles 
} from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsHeader, InfoIcon, CheckRow } from "./settingsUI";
import { DESIGN_COMPONENTS } from "../billing/Invoice";
const blue = "#2563eb";
const STORAGE_KEY = "print_settings";

/* ─── REALISTIC SAMPLE INVOICE DATA FOR LIVE PREVIEW ───────────────────────── */
const SAMPLE_INVOICE = {
  invoice_no: "INV-2026-0001",
  created_at: new Date().toISOString(),
  invoice_date: new Date().toISOString(),
  due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
  customer_name: "Sri Murugan Traders",
  customer_phone: "+91 98765 43210",
  billing_address: "124, Cross Cut Road, Gandhipuram, Coimbatore - 641012",
  customer_gstin: "33AAAAA0000A1Z5",
  payment_type: "Cash",
  payment_method: "Cash",
  invoice_type: "Tax Invoice",
  gst_type: "with_gst",
  status: "paid",
  products: [
    {
      product_name: "Premium Cotton Shirting Fabric",
      name: "Premium Cotton Shirting Fabric",
      product_code: "5208",
      qty: 2,
      price: 500,
      gst: 18,
      tax_percent: 18,
      amount: 1000,
      tax_amount: 180
    },
    {
      product_name: "Silk Zari Border Dhotis (Pack of 2)",
      name: "Silk Zari Border Dhotis (Pack of 2)",
      product_code: "5007",
      qty: 1,
      price: 300,
      gst: 12,
      tax_percent: 12,
      amount: 300,
      tax_amount: 36
    },
    {
      product_name: "Linen Formal Casual Material",
      name: "Linen Formal Casual Material",
      product_code: "5309",
      qty: 1,
      price: 200,
      gst: 5,
      tax_percent: 5,
      amount: 200,
      tax_amount: 10
    }
  ],
  sub_total: 1500,
  tax_amount: 226,
  gst_total: 226,
  total_amount: 1726,
  paid_amount: 1726,
  balance_amount: 0,
  terms_conditions: "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.\n3. Subject to Coimbatore Jurisdiction."
};

/* ─── THEME OPTIONS ────────────────────────────────────────────────────────── */
const THEME_OPTIONS = [
  {
    id: "tally",
    label: "Tally Theme",
    category: "Classic",
    badge: "Standard",
    icon: "📄"
  },
  {
    id: "gst1",
    label: "GST Theme 1",
    category: "Modern GST",
    badge: "Corporate",
    icon: "📊"
  },
  {
    id: "gst3",
    label: "GST Theme 3",
    category: "Minimal GST",
    badge: "Boxed",
    icon: "📑"
  },
  {
    id: "double_divine",
    label: "Double Divine",
    category: "Premium",
    badge: "Curved Header",
    icon: "🎨"
  },
  {
    id: "french_elite",
    label: "French Elite",
    category: "Classic",
    badge: "Clean",
    icon: "🏛️"
  },
  {
    id: "vintage_classic",
    label: "Vintage Classic",
    category: "Vintage",
    badge: "Traditional",
    icon: "📜"
  },
  {
    id: "vintage_bold",
    label: "Vintage Bold",
    category: "Vintage",
    badge: "High Contrast",
    icon: "📜"
  },
];

/* ─── THERMAL POS LAYOUT / THEME OPTIONS ──────────────────────────────────── */
export const POS_LAYOUT_OPTIONS = [
  {
    id: "pos_classic",
    label: "Classic POS",
    category: "Classic Monospace",
    badge: "Standard",
    icon: "🧾",
    desc: "Clean dot-matrix font, dashed dividers, compact table, standard retail receipt."
  },
  {
    id: "pos_modern",
    label: "Modern Retail POS",
    category: "Contemporary",
    badge: "Clean Sans",
    icon: "🏷️",
    desc: "Modern sans-serif typography, structured header, item code tags, bold total banner."
  },
  {
    id: "pos_detailed",
    label: "Detailed GST POS",
    category: "Tax Invoice",
    badge: "Full Tax Split",
    icon: "📊",
    desc: "HSN codes, rate breakdown, SGST & CGST split table, terms & conditions."
  },
  {
    id: "pos_minimal",
    label: "Quick Minimal POS",
    category: "Fast Billing",
    badge: "Express Token",
    icon: "⚡",
    desc: "High-speed token layout with big bold bill no., large total display."
  },
  {
    id: "pos_vintage",
    label: "Vintage Boutique POS",
    category: "Boutique",
    badge: "Decorative",
    icon: "📜",
    desc: "Double-line borders, store tagline, savings highlight, stylish thank you note."
  }
];

/* ─── 18 VIBRANT COLOR SWATCHES ────────────────────────────────────────────── */
const PALETTE_COLORS = [
  { hex: "#2563eb", name: "Royal Blue" },
  { hex: "#1f8cff", name: "Bright Blue" },
  { hex: "#0284c7", name: "Sky Blue" },
  { hex: "#0d9488", name: "Teal" },
  { hex: "#16a34a", name: "Emerald Green" },
  { hex: "#65a30d", name: "Olive Green" },
  { hex: "#84cc16", name: "Lime Green" },
  { hex: "#6366f1", name: "Indigo" },
  { hex: "#a855f7", name: "Violet" },
  { hex: "#9333ea", name: "Purple" },
  { hex: "#ec4899", name: "Hot Pink" },
  { hex: "#f43f5e", name: "Rose" },
  { hex: "#dc2626", name: "Crimson Red" },
  { hex: "#d97706", name: "Warm Amber" },
  { hex: "#b45309", name: "Ochre" },
  { hex: "#78350f", name: "Warm Brown" },
  { hex: "#4b5563", name: "Slate Gray" },
  { hex: "#0f172a", name: "Midnight Navy" }
];

/* ─── THEME ID NORMALIZER ─────────────────────────────────────────────────── */
export function normalizeThemeId(t) {
  if (!t) return "tally";
  const map = {
    "Tally Theme": "tally",
    "GST Theme 1": "gst1",
    "GST Theme 2": "gst3",
    "GST Theme 3": "gst3",
    "Double Divine": "double_divine",
    "French Elite": "french_elite",
    "POS Receipt": "pos",
    "POS Thermal Receipt": "pos",
    "Minimal Theme": "gst3",
    "Vintage Classic": "vintage_classic",
    "Vintage Bold": "vintage_bold",
    "Landscape Theme 1": "gst1",
    "Landscape Theme 2": "gst3",
  };
  if (map[t]) return map[t];
  const cleaned = String(t).toLowerCase().replace(/\s+/g, "_");
  if (DESIGN_COMPONENTS && DESIGN_COMPONENTS[cleaned]) return cleaned;
  return "tally";
}

const DEFAULT_STATE = {
  printer: "regular",
  mode: "colors",
  thermalMode: "layout",
  posLayout: "pos_classic",

  regularDefault: true,
  repeatHeader: true,

  companyName: true,
  companyNameText: "My Company",
  companyLogo: true,
  address: true,
  addressText: "Plot No. 1, Shop No. 8, Koramangala, Bangalore, 560034",
  email: true,
  emailText: "info@mycompany.com",
  phone: true,
  phoneText: "9994789683",
  gstin: true,
  gstinText: "33AAAAA0000A1Z5",

  paperSize: "A4",
  orientation: "Portrait",
  companyNameSize: "Large",
  invoiceTextSize: "Medium",
  printOriginalDuplicate: false,
  extraSpaceTop: 0,

  expandTableWholePage: false,
  minRowsItemTable: 0,

  totalItemQty: true,
  amountWithDecimal: true,
  receivedAmount: true,
  balanceAmount: true,
  currentBalanceParty: false,
  taxDetails: true,
  youSaved: true,
  printAmountGrouping: true,
  amountInWords: "Indian",

  printDescription: true,
  printTerms: true,
  printReceivedBy: true,
  printDeliveredBy: true,
  printSignatureText: true,
  signatureText: "Authorized Signatory",
  paymentMode: false,
  printAcknowledgement: false,

  template: "tally",
  theme: "tally",
  themeColor: "#2563eb",

  // Thermal printer settings
  pageSize: "2 Inch: 58mm",
  printingType: "Text Printing",
  useTextStyling: true,
  autoCutPaper: true,
  openCashDrawer: false,
  extraLinesEnd: 0,
  numberOfCopies: 1,
  showSNo: true,
  showHSNCode: true,
  showUnits: true,
  showMRP: true,
  showDescription: true,
  showBatchNo: true,
  showExpDate: true,
  showMfgDate: true,
  showSize: true,
  showModelNo: true,
  showSerialNo: true,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const defaultTheme = localStorage.getItem("invoice_default_theme");
    const defaultColor = localStorage.getItem("invoice_default_color");
    const defaultPosLayout = localStorage.getItem("thermal_pos_layout") || localStorage.getItem("invoice_pos_layout");
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      ...DEFAULT_STATE, 
      ...parsed,
      ...(defaultTheme ? { template: defaultTheme, theme: defaultTheme } : {}),
      ...(defaultColor ? { themeColor: defaultColor } : {}),
      ...(defaultPosLayout ? { posLayout: defaultPosLayout } : {})
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function CollapsibleSection({ title, open, onToggle, children, badge }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 py-3 px-4 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 text-[14px] font-bold text-slate-800">
          <span className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(135deg,#1f8cff,#4338ca)" }} />
          {title}
          {badge && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">{badge}</span>
          )}
        </span>
        <ChevronDown size={17} className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

function LayerRow({ label, checked, onChange, input, onChangeText, info, placeholder }) {
  return (
    <div className="py-1.5 px-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 cursor-pointer shrink-0 rounded"
            style={{ accentColor: blue }}
          />
          <span className="text-[13.5px] text-gray-700">{label}</span>
        </div>
        {info && <InfoIcon title={info} />}
      </div>
      {checked && onChangeText && (
        <div className="mt-2 ml-9">
          <input
            type="text"
            value={input}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}

function SelectRow({ label, value, onChange, options, info }) {
  return (
    <div className="py-1.5 px-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13.5px] text-gray-700 flex items-center gap-1.5">{label}</span>
        {info && <InfoIcon title={info} />}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}

function NumberSpinner({ label, value, onChange, info }) {
  return (
    <div className="py-1.5 px-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13.5px] text-gray-700 flex items-center gap-1.5">{label}</span>
        {info && <InfoIcon title={info} />}
      </div>
      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-28">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="px-3 py-2 text-gray-500 hover:bg-gray-100 text-sm cursor-pointer"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onChange(isNaN(n) ? 0 : Math.max(0, n));
          }}
          className="w-12 text-center text-[13.5px] text-gray-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="px-3 py-2 text-gray-500 hover:bg-gray-100 text-sm cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ColorSwatch({ hex, name, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={name || hex}
      aria-label={`Color ${name || hex}`}
      className={`w-8 h-8 rounded-lg flex-shrink-0 transition-all cursor-pointer relative flex items-center justify-center ${
        selected ? "ring-2 ring-slate-900 ring-offset-2 scale-110 shadow-md z-10" : "hover:scale-105 border border-black/10 opacity-90 hover:opacity-100"
      }`}
      style={{ background: hex }}
    >
      {selected && <Check size={13} color="#ffffff" strokeWidth={3} />}
    </button>
  );
}

function ColorPalette({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-2.5 py-2"> 
        {PALETTE_COLORS.map((c) => (
          <ColorSwatch
            key={c.hex}
            hex={c.hex}
            name={c.name}
            selected={(value || "").toLowerCase() === c.hex.toLowerCase()}
            onClick={() => onChange(c.hex)}
          />
        ))}
      </div>
    </div>
  );
}

function LinkText({ children }) {
  return (
    <button
      type="button"
      className="text-[13px] text-blue-600 hover:text-blue-800 font-medium mt-1.5 cursor-pointer text-left"
    >
      {children}
    </button>
  );
}

function PrintCompanyHeader({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Print Company Info / Header" open={open} onToggle={onToggle}>
      <CheckRow label="Make Regular Printer Default" checked={state.regularDefault} onChange={set("regularDefault")} info="Make regular printer the default" />
      <CheckRow label="Print repeat header in all pages" checked={state.repeatHeader} onChange={set("repeatHeader")} info="Repeat company header on every page" />
      <LayerRow label="Company Name" checked={state.companyName} onChange={set("companyName")} input={state.companyNameText} onChangeText={set("companyNameText")} placeholder="My Company" info="Company name printed on invoice" />
      <div className="py-1.5 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <input type="checkbox" checked={state.companyLogo} onChange={(e) => set("companyLogo")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
            <span className="text-[13.5px] text-gray-700">Company Logo</span>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium">(Change)</button>
          </div>
          <InfoIcon title="Print company logo" />
        </div>
      </div>
      <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Address" info="Company address" />
      <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" info="Company email address" />
      <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="9994789683" info="Company phone number" />
      <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN on Sale" info="Company GSTIN" />
    </CollapsibleSection>
  );
}
 
function PrintOptions({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Print Options" open={open} onToggle={onToggle}>
      <SelectRow label="Paper Size" value={state.paperSize} onChange={set("paperSize")} options={["A4", "A5", "Legal"]} info="Paper size" />
      <SelectRow label="Orientation" value={state.orientation} onChange={set("orientation")} options={["Portrait", "Landscape"]} info="Page orientation" />
      <SelectRow label="Company Name Text Size" value={state.companyNameSize} onChange={set("companyNameSize")} options={["Small", "Medium", "Large"]} info="Company name text size" />
      <SelectRow label="Invoice Text Size" value={state.invoiceTextSize} onChange={set("invoiceTextSize")} options={["Small", "Medium", "Large"]} info="Invoice text size" />
      <CheckRow label="Print Original/Duplicate" checked={state.printOriginalDuplicate} onChange={set("printOriginalDuplicate")} info="Print original/duplicate copies" />
      <NumberSpinner label="Extra space on Top of PDF" value={state.extraSpaceTop} onChange={set("extraSpaceTop")} info="Extra space at top of PDF" />
      <LinkText>Change Transaction Names &gt;</LinkText>
    </CollapsibleSection>
  );
}

function ItemTableSection({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Item Table" open={open} onToggle={onToggle}>
      <CheckRow label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} info="Expand item table to full width" />
      <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} info="Minimum rows in item table" />
      <LinkText>Item Table Customization &gt;</LinkText>
    </CollapsibleSection>
  );
}

function TotalsAndTaxes({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Totals & Taxes" open={open} onToggle={onToggle}>
      <CheckRow label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} info="Print total item quantity" />
      <div className="py-1.5 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <input type="checkbox" checked={state.amountWithDecimal} onChange={(e) => set("amountWithDecimal")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
            <span className="text-[13.5px] text-gray-700">Amount with Decimal <span className="text-gray-400 ml-1">e.g. 0.00</span></span>
          </div>
          <InfoIcon title="Print amount with decimal places" />
        </div>
      </div>
      <CheckRow label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} info="Print received amount" />
      <CheckRow label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} info="Print balance amount" />
      <CheckRow label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} info="Print current party balance" />
      <CheckRow label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} info="Print tax details" />
      <CheckRow label="You Saved" checked={state.youSaved} onChange={set("youSaved")} info="Print savings amount" />
      <CheckRow label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} info="Print grouped amount" />
      <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} info="Amount in words format" />
    </CollapsibleSection>
  );
}

function FooterSection({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Footer" open={open} onToggle={onToggle}>
      <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} info="Print description footer" />
      <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} info="Print terms and conditions" />
      <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} info="Print received by" />
      <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} info="Print delivered by" />
      <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" info="Text for signature line" />
      <LinkText>Change Signature</LinkText>
      <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} info="Print payment mode" />
      <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} info="Print acknowledgement" />
    </CollapsibleSection>
  );
}

function ThermalReceiptPreview({ state }) {
  const company = state.companyNameText || "My Company";
  const phone = state.phoneText || "9994789683";

  const items = [
    {
      no: 1,
      name: "Britannia Chocolate Cake",
      hsn: "12345678",
      qty: "100 + 0",
      unit: "Box",
      mrp: "100.00",
      price: "100.00",
      amount: "10,000.00",
      desc: "Britannia Chocolate Cake description",
      disc: "1%",
      discAmt: "-100.00",
      taxable: "500.00",
      final: "10,000.00",
    },
    {
      no: 2,
      name: "Cadbury Chocolate",
      hsn: "34567890",
      qty: "50 + 1",
      unit: "Pac",
      mrp: "150.00",
      price: "150.00",
      amount: "7,500.00",
      desc: "Cadbury cake description",
      disc: "10%",
      discAmt: "-750.00",
      taxable: "375.00",
      final: "7,500.00",
    },
  ];

  return (
    <div className="bg-white text-gray-900" style={{ width: 300, fontFamily: "monospace", fontSize: 11, lineHeight: 1.45 }}>
      {/* Header */}
      <div className="text-center">
        <div className="font-bold text-[13px]">{company}</div>
        <div>Ph.No.: {phone}</div>
      </div>

      <DashedLine />

      <div className="text-center font-bold text-[12px] py-1">Tax Invoice</div>

      <div className="flex justify-between gap-2">
        <div>
          <div>Vyapar tech solutions (Sample Party Name)</div>
          <div>Ph. No.: +91 93339 11911, +91 63644 44752</div>
        </div>
      </div>
      <div className="flex justify-between">
        <div>Date: 02/09/2026</div>
        <div>Invoice No.: Inv12345</div>
      </div>
      <div>Bill To:</div>
      <div>Sarjapur Road, Bangalore</div>
      <div>Place of Supply: Karnataka</div>

      <DashedLine />

      {/* Items */}
      <div className="font-bold">#  Item Name(HSN)</div>
      {items.map((it) => (
        <div key={it.no} className="mt-1">
          <div className="flex justify-between gap-1">
            <span>{it.no}</span>
            <span className="flex-1">{it.name}({it.hsn})</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>{it.qty} + 0{it.unit}</span>
          </div>
          <div className="flex justify-between pl-4">
            <span>MRP: {it.mrp}</span>
            <span>Price: {it.price}</span>
            <span>Amount: {it.amount}</span>
          </div>
          <div className="pl-4">{it.desc}</div>
          {it.no === 1 && (
            <div className="pl-4">
              <div>Batch No.: N1234</div>
              <div>Model No.: A12345</div>
              <div>Exp. Date: 09/2027</div>
              <div>Mfg. Date: 02/09/2026</div>
              <div>Size: Med/32</div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <span>Disc.({it.disc})</span>
            <span style={{ width: 90, textAlign: "right" }}> : {it.discAmt}</span>
          </div>
          <div className="flex justify-end gap-2">
            <span style={{ width: 90, textAlign: "right" }}> : {it.taxable}</span>
          </div>
          <div className="flex justify-end gap-2 font-semibold">
            <span>Final amount</span>
            <span style={{ width: 90, textAlign: "right" }}> : {it.final}</span>
          </div>
        </div>
      ))}

      <DashedLine />

      {/* Totals */}
      <div className="flex justify-between">
        <span>Qty: 150 + 1</span>
        <span style={{ textAlign: "right" }}>17,500.00</span>
      </div>
      <div className="flex justify-between">
        <span>Disc.(0%) </span>
        <span style={{ width: 90, textAlign: "right" }}> : -500.00</span>
      </div>
      <div className="flex justify-between">
        <span>Tax(0%) </span>
        <span style={{ width: 90, textAlign: "right" }}> : 500.00</span>
      </div>
      <div className="flex justify-between">
        <span>Total Disc. </span>
        <span style={{ width: 90, textAlign: "right" }}> : -1,350.00</span>
      </div>
      <div className="flex justify-between font-bold text-[12px]">
        <span>Total </span>
        <span style={{ width: 90, textAlign: "right" }}> : 20,000.00</span>
      </div>
      <div className="flex justify-between">
        <span>Received </span>
        <span style={{ width: 90, textAlign: "right" }}> : 20,000.00</span>
      </div>
      <div className="flex justify-between">
        <span>Balance </span>
        <span style={{ width: 90, textAlign: "right" }}> : 0.00</span>
      </div>

      <DashedLine />

      <div className="text-center py-1">Balance to be paid in 3 days</div>
    </div>
  );
}

function DashedLine() {
  return (
    <div
      className="my-2"
      style={{
        borderTop: "1px dashed #9ca3af",
      }}
    />
  );
}

function ThermalSettings({ state, set, isOpen, toggle }) {

  return (
    <div className="space-y-4 pb-4">
      <CollapsibleSection title="POS Receipt Layout" badge={POS_LAYOUT_OPTIONS.find(p => p.id === (state.posLayout || "pos_classic"))?.label || "Classic POS"} open={isOpen("thermalLayouts")} onToggle={() => toggle("thermalLayouts")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {POS_LAYOUT_OPTIONS.map((posOpt) => {
            const isSelected = (state.posLayout || "pos_classic") === posOpt.id;
            return (
              <button
                key={posOpt.id}
                type="button"
                onClick={() => set("posLayout")(posOpt.id)}
                className={`border rounded-xl p-2.5 text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-blue-50/90 border-blue-600 shadow-sm ring-1 ring-blue-500/30"
                    : "hover:bg-slate-50 border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{posOpt.icon}</span>
                  <div className="min-w-0">
                    <div className="text-[12px] font-bold text-slate-900 truncate">{posOpt.label}</div>
                    <div className="text-[10px] text-slate-500">{posOpt.category}</div>
                  </div>
                </div>
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Page Size" open={isOpen("thermalPageSize")} onToggle={() => toggle("thermalPageSize")}>
        <SelectRow 
          label="Page Size" 
          value={state.pageSize} 
          onChange={set("pageSize")} 
          options={["2 Inch: 58mm", "3 Inch: 68mm", "4 Inch: 88mm", "Custom (Chars)"]} 
        />
        <SelectRow 
          label="Printing Type" 
          value={state.printingType} 
          onChange={set("printingType")} 
          options={["Text Printing", "Image Printing", "Both"]} 
        />
      </CollapsibleSection>

      <CollapsibleSection title="Printing Options" open={isOpen("thermalPrintingOptions")} onToggle={() => toggle("thermalPrintingOptions")}>
        <CheckRow label="Use Text Styling (Bold)" checked={state.useTextStyling} onChange={set("useTextStyling")} />
        <CheckRow label="Auto Cut Paper After Printing" checked={state.autoCutPaper} onChange={set("autoCutPaper")} />
        <CheckRow label="Open Cash Drawer After Printing" checked={state.openCashDrawer} onChange={set("openCashDrawer")} />
      </CollapsibleSection>

      <CollapsibleSection title="Print Settings" open={isOpen("thermalPrintSettings")} onToggle={() => toggle("thermalPrintSettings")}>
        <NumberSpinner label="Extra lines at the end" value={state.extraLinesEnd} onChange={set("extraLinesEnd")} />
        <NumberSpinner label="Number of copies" value={state.numberOfCopies} onChange={set("numberOfCopies")} />
      </CollapsibleSection>

      <CollapsibleSection title="Print Company Info / Header" badge="Thermal" open={isOpen("thermalCompanyHeader")} onToggle={() => toggle("thermalCompanyHeader")}>
        <LayerRow label="Company Name" checked={state.companyName} onChange={set("companyName")} input={state.companyNameText} onChangeText={set("companyNameText")} placeholder="My Company" />
        <div className="py-1.5 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input type="checkbox" checked={state.companyLogo} onChange={(e) => set("companyLogo")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
              <span className="text-[13.5px] text-gray-700">Company Logo</span>
            </div>
          </div>
        </div>
        <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Company address" />
        <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" />
        <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="Phone" />
        <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN" />
      </CollapsibleSection>

      <CollapsibleSection title="Change Transaction Names" open={isOpen("changeTransactionNames")} onToggle={() => toggle("changeTransactionNames")}>
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">Change Transaction Names &gt;</button>
      </CollapsibleSection>

      <CollapsibleSection title="Item Table" open={isOpen("thermalItemTable")} onToggle={() => toggle("thermalItemTable")}>
        <CheckRow label="S.No" checked={state.showSNo} onChange={set("showSNo")} />
        <CheckRow label="HSN/SAC Code" checked={state.showHSNCode} onChange={set("showHSNCode")} />
        <CheckRow label="Units of Measurement" checked={state.showUnits} onChange={set("showUnits")} />
        <CheckRow label="MRP" checked={state.showMRP} onChange={set("showMRP")} />
        <CheckRow label="Description" checked={state.showDescription} onChange={set("showDescription")} />
      </CollapsibleSection>

      <CollapsibleSection title="Additional Item Details" open={isOpen("additionalItemDetails")} onToggle={() => toggle("additionalItemDetails")}>
        <CheckRow label="Batch No." checked={state.showBatchNo} onChange={set("showBatchNo")} />
        <CheckRow label="Exp. Date" checked={state.showExpDate} onChange={set("showExpDate")} />
        <CheckRow label="Mfg. Date" checked={state.showMfgDate} onChange={set("showMfgDate")} />
        <CheckRow label="Size" checked={state.showSize} onChange={set("showSize")} />
        <CheckRow label="Model No." checked={state.showModelNo} onChange={set("showModelNo")} />
        <CheckRow label="Serial No." checked={state.showSerialNo} onChange={set("showSerialNo")} />
      </CollapsibleSection>

      <CollapsibleSection title="Totals & Taxes" open={isOpen("thermalTotalsTaxes")} onToggle={() => toggle("thermalTotalsTaxes")}>
        <CheckRow label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} />
        <CheckRow label="Amount with Decimal e.g. 0.00" checked={state.amountWithDecimal} onChange={set("amountWithDecimal")} />
        <CheckRow label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} />
        <CheckRow label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} />
        <CheckRow label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} />
        <CheckRow label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} />
        <CheckRow label="You Saved" checked={state.youSaved} onChange={set("youSaved")} />
        <CheckRow label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} />
        <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} />
      </CollapsibleSection>

      <CollapsibleSection title="Footer" open={isOpen("thermalFooter")} onToggle={() => toggle("thermalFooter")}>
        <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
        <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
        <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
        <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
        <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
        <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
        <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
      </CollapsibleSection>

      <CollapsibleSection title="Billing Printer Setup" open={isOpen("billingPrinterSetup")} onToggle={() => toggle("billingPrinterSetup")}>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">1. 2 Inch (VYPRTP2001) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">2. 3 Inch (VYPRTP3001) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">3. 2 Inch (VYPRTP2002) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">Setup</button>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

export default function Print() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("print", state, setState);

  const [zoomLevel, setZoomLevel] = useState(68);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  const set = (key) => (val) =>
    setState((s) => {
      const next = { ...s, [key]: typeof val === "function" ? val(s[key]) : val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        if (key === "printer") {
          localStorage.setItem("invoice_printer_type", val);
        }
        if (key === "template" || key === "theme") {
          localStorage.setItem("invoice_default_theme", val);
        }
        if (key === "themeColor") {
          localStorage.setItem("invoice_default_color", val);
        }
        if (key === "posLayout") {
          localStorage.setItem("thermal_pos_layout", val);
          localStorage.setItem("invoice_pos_layout", val);
        }
      } catch {
        /* best-effort */
      }
      return next;
    });

  const ALL_SECTIONS = [
    "themeColor", "companyHeader", "printOptions", "itemTable", "totalsTaxes", "footer",
    "templates", "printSettings",
    "thermalLayouts", "thermalPageSize", "thermalPrintingOptions", "thermalPrintSettings", "thermalCompanyHeader",
    "changeTransactionNames", "thermalItemTable", "additionalItemDetails", "thermalTotalsTaxes", "thermalFooter",
    "billingPrinterSetup",
  ];
  const [openSections, setOpenSections] = useState({});
  const isOpen = (id) => openSections[id] !== false;
  const toggle = (id) => setOpenSections((s) => ({ ...s, [id]: s[id] !== false ? false : true }));
  const collapseAll = () => setOpenSections(Object.fromEntries(ALL_SECTIONS.map((id) => [id, false])));
  const expandAll = () => setOpenSections({});

  // Resolve active regular theme
  const activeThemeId = normalizeThemeId(state.template || state.theme);
  const activeThemeObj = THEME_OPTIONS.find((t) => t.id === activeThemeId) || THEME_OPTIONS[0];
  const DesignComponent = DESIGN_COMPONENTS[activeThemeId] || DESIGN_COMPONENTS.tally || DESIGN_COMPONENTS.classic;
  const isPOS = activeThemeId === "pos";
  const currentScale = isPOS ? 1.0 : zoomLevel / 100;

  // Resolve active thermal POS layout
  const activePosId = state.posLayout || "pos_classic";
  const activePosObj = POS_LAYOUT_OPTIONS.find((p) => p.id === activePosId) || POS_LAYOUT_OPTIONS[0];
  const PosComponent = DESIGN_COMPONENTS[activePosId] || DESIGN_COMPONENTS.pos || DESIGN_COMPONENTS.pos_classic;

  // Active Company Data from state inputs
  const dynamicCompany = {
    company_name: (state.companyName && state.companyNameText) ? state.companyNameText : "My Company",
    company_address: (state.address && state.addressText) ? state.addressText : "Plot No. 1, Shop No. 8, Koramangala, Bangalore, 560034",
    phone: (state.phone && state.phoneText) ? state.phoneText : "9994789683",
    email: (state.email && state.emailText) ? state.emailText : "info@mycompany.com",
    gstin: (state.gstin && state.gstinText) ? state.gstinText : "33AAAAA0000A1Z5",
    bank_name: "State Bank of India",
    account_no: "30294819284",
    ifsc_code: "SBIN0001234",
    branch_name: "Tirupur Main Branch",
    signature: state.printSignatureText ? (state.signatureText || "Authorized Signatory") : "",
    logo: state.companyLogo ? null : null,
  };

  const renderThemePreview = () => {
    if (!DesignComponent) return null;
    return (
      <DesignComponent
        invoice={SAMPLE_INVOICE}
        company={dynamicCompany}
        color={state.themeColor || "#2563eb"}
        logoUrl={null}
      />
    );
  };

  const renderThermalPreview = () => {
    if (PosComponent) {
      return (
        <PosComponent
          invoice={SAMPLE_INVOICE}
          company={dynamicCompany}
          color={state.themeColor || "#2563eb"}
          logoUrl={null}
          layout={activePosId}
        />
      );
    }
    return <ThermalReceiptPreview state={state} />;
  };

  return (
    <div className="overflow-hidden flex flex-col flex-1">
      <div className="flex flex-col flex-1">
        <SettingsHeader
          title="Print Settings"
          subtitle="LAYOUT, COLORS & PRINTERS"
          icon={<Printer size={22} strokeWidth={2.2} />}
          onClose={() => setSettingsTab && setSettingsTab("general")}
        />

        {/* Two column layout with independent scrolling */}
        <div className="flex-1 flex min-h-0">
          {/* Left Panel - Settings with independent scroll */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto overflow-x-hidden bg-transparent">
            <div className="p-6">
              {/* Printer tabs */}
              <div className="flex items-center gap-2 mb-6 flex-shrink-0">
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-1">
                  {[
                    { id: "regular", label: "REGULAR PRINTER" },
                    { id: "thermal", label: "THERMAL PRINTER" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("printer")(t.id)}
                      className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition cursor-pointer ${
                        state.printer === t.id
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={expandAll}
                    title="Expand all sections"
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Expand
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    title="Collapse all sections"
                    className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 transition cursor-pointer"
                  >
                    Collapse
                  </button>
                </div>
              </div>

              {state.printer === "regular" ? (
                <>
                  {/* Secondary tabs for Regular Printer */}
                  <div className="flex gap-6 border-b border-gray-200 mb-6 flex-shrink-0">
                    {[
                      { id: "layout", label: "CHANGE LAYOUT" },
                      { id: "colors", label: "CHANGE COLORS" },
                    ].map((m) => (
                      <div key={m.id} className="flex items-stretch relative">
                        {state.mode === m.id && (
                          <span className="absolute top-0 left-0 right-0 h-[2px] bg-blue-600" />
                        )}
                        <button
                          type="button"
                          onClick={() => set("mode")(m.id)}
                          className={`px-1 pt-2 pb-2 text-xs font-semibold tracking-wide transition cursor-pointer ${
                            state.mode === m.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {m.label}
                        </button>
                        {state.mode === m.id && (
                          <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-pink-500" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6 pb-4">
                    {state.mode === "colors" && (
                      <>
                        {/* Color palette */}
                        <CollapsibleSection title="Theme Color" open={isOpen("themeColor")} onToggle={() => toggle("themeColor")}>
                          <ColorPalette value={state.themeColor} onChange={set("themeColor")} />
                          <p className="text-xs text-gray-500 mt-2">Choose an accent theme color for the printed invoice.</p>
                        </CollapsibleSection>

                        {/* Print Company Info / Header */}
                        <PrintCompanyHeader state={state} set={set} open={isOpen("companyHeader")} onToggle={() => toggle("companyHeader")} />

                        {/* Print Options */}
                        <PrintOptions state={state} set={set} open={isOpen("printOptions")} onToggle={() => toggle("printOptions")} />

                        {/* Item Table */}
                        <ItemTableSection state={state} set={set} open={isOpen("itemTable")} onToggle={() => toggle("itemTable")} />

                        {/* Totals & Taxes */}
                        <TotalsAndTaxes state={state} set={set} open={isOpen("totalsTaxes")} onToggle={() => toggle("totalsTaxes")} />

                        {/* Footer */}
                        <FooterSection state={state} set={set} open={isOpen("footer")} onToggle={() => toggle("footer")} />
                      </>
                    )}

                    {state.mode === "layout" && (
                      <>
                        {/* Templates (Synchronized with InvoiceDesign themes) */}
                        <CollapsibleSection title="Templates" open={isOpen("templates")} onToggle={() => toggle("templates")}>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {THEME_OPTIONS.map((tpl) => {
                              const isSelected = activeThemeId === tpl.id;
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    set("template")(tpl.id);
                                    set("theme")(tpl.id);
                                  }}
                                  className={`border rounded-xl p-2.5 text-center transition cursor-pointer flex flex-col items-center justify-between ${
                                    isSelected
                                      ? "bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-500/30"
                                      : "hover:bg-slate-50 border-gray-200 bg-white"
                                  }`}
                                >
                                  <div className="w-full h-11 bg-slate-100 rounded-lg border border-slate-200/80 mb-1.5 flex items-center justify-center text-xl">
                                    {tpl.icon || "📄"}
                                  </div>
                                  <span className="text-[11.5px] font-bold text-slate-900 block truncate w-full">{tpl.label}</span>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wide">{tpl.category}</span>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleSection>

                        {/* Company Info */}
                        <PrintCompanyHeader state={state} set={set} open={isOpen("companyHeader")} onToggle={() => toggle("companyHeader")} />
                        <CollapsibleSection title="Print Settings" open={isOpen("printSettings")} onToggle={() => toggle("printSettings")}>
                          <SelectRow label="Paper Size" value={state.paperSize} onChange={set("paperSize")} options={["A4", "A5", "Legal", "Thermal 80mm", "Thermal 58mm"]} />
                          <SelectRow label="Orientation" value={state.orientation} onChange={set("orientation")} options={["Portrait", "Landscape"]} />
                          <SelectRow label="Company Name Text Size" value={state.companyNameSize} onChange={set("companyNameSize")} options={["Small", "Medium", "Large"]} />
                          <SelectRow label="Invoice Text Size" value={state.invoiceTextSize} onChange={set("invoiceTextSize")} options={["Small", "Medium", "Large"]} />
                          <CheckRow label="Print Original/Duplicate" checked={state.printOriginalDuplicate} onChange={set("printOriginalDuplicate")} />
                          <NumberSpinner label="Extra space on Top of PDF" value={state.extraSpaceTop} onChange={set("extraSpaceTop")} />
                        </CollapsibleSection>

                        {/* Item Table */}
                        <CollapsibleSection title="Item Table" open={isOpen("itemTable")} onToggle={() => toggle("itemTable")}>
                          <CheckRow label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} />
                          <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} />
                        </CollapsibleSection>

                        {/* Totals & Taxes */}
                        <CollapsibleSection title="Totals & Taxes" open={isOpen("totalsTaxes")} onToggle={() => toggle("totalsTaxes")}>
                          <CheckRow label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} />
                          <div className="py-1.5 px-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <input type="checkbox" checked={state.amountWithDecimal} onChange={(e) => set("amountWithDecimal")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
                                <span className="text-[13.5px] text-gray-700">Amount with Decimal <span className="text-gray-400 ml-1">e.g. 0.00</span></span>
                              </div>
                            </div>
                          </div>
                          <CheckRow label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} />
                          <CheckRow label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} />
                          <CheckRow label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} />
                          <CheckRow label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} />
                          <CheckRow label="You Saved" checked={state.youSaved} onChange={set("youSaved")} />
                          <CheckRow label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} />
                          <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} />
                        </CollapsibleSection>

                        {/* Footer */}
                        <CollapsibleSection title="Footer" open={isOpen("footer")} onToggle={() => toggle("footer")}>
                          <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
                          <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
                          <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
                          <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
                          <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
                          <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
                          <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
                        </CollapsibleSection>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Secondary tabs for Thermal Printer */}
                  <div className="flex gap-6 border-b border-gray-200 mb-6 flex-shrink-0">
                    {[
                      { id: "layout", label: "CHANGE POS LAYOUT" },
                      { id: "settings", label: "THERMAL SETTINGS" },
                    ].map((m) => (
                      <div key={m.id} className="flex items-stretch relative">
                        {(state.thermalMode || "layout") === m.id && (
                          <span className="absolute top-0 left-0 right-0 h-[2px] bg-blue-600" />
                        )}
                        <button
                          type="button"
                          onClick={() => set("thermalMode")(m.id)}
                          className={`px-1 pt-2 pb-2 text-xs font-semibold tracking-wide transition cursor-pointer ${
                            (state.thermalMode || "layout") === m.id ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {m.label}
                        </button>
                        {(state.thermalMode || "layout") === m.id && (
                          <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-pink-500" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-6 pb-4">
                    {(state.thermalMode || "layout") === "layout" && (
                      <>
                        {/* POS Layouts Selection Grid */}
                        <CollapsibleSection title="POS Receipt Layouts" badge="5 Layouts" open={isOpen("thermalLayouts")} onToggle={() => toggle("thermalLayouts")}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {POS_LAYOUT_OPTIONS.map((posOpt) => {
                              const isSelected = activePosId === posOpt.id;
                              return (
                                <button
                                  key={posOpt.id}
                                  type="button"
                                  onClick={() => set("posLayout")(posOpt.id)}
                                  className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between relative ${
                                    isSelected
                                      ? "bg-blue-50/90 border-blue-600 shadow-sm ring-2 ring-blue-500/30"
                                      : "hover:bg-slate-50 border-gray-200 bg-white"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0">
                                      {posOpt.icon}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                      isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                    }`}>
                                      {posOpt.badge}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                                      {posOpt.label}
                                      {isSelected && <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                      {posOpt.desc}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleSection>

                        {/* Page Size & Printing Type in Layout Mode */}
                        <CollapsibleSection title="Page Size & Printer Config" open={isOpen("thermalPageSize")} onToggle={() => toggle("thermalPageSize")}>
                          <SelectRow 
                            label="Page Size" 
                            value={state.pageSize} 
                            onChange={set("pageSize")} 
                            options={["2 Inch: 58mm", "3 Inch: 68mm", "4 Inch: 88mm", "Custom (Chars)"]} 
                          />
                          <SelectRow 
                            label="Printing Type" 
                            value={state.printingType} 
                            onChange={set("printingType")} 
                            options={["Text Printing", "Image Printing", "Both"]} 
                          />
                        </CollapsibleSection>

                        {/* Print Company Info / Header in Layout Mode */}
                        <CollapsibleSection title="Print Company Info / Header" badge="Thermal" open={isOpen("thermalCompanyHeader")} onToggle={() => toggle("thermalCompanyHeader")}>
                          <LayerRow label="Company Name" checked={state.companyName} onChange={set("companyName")} input={state.companyNameText} onChangeText={set("companyNameText")} placeholder="My Company" />
                          <div className="py-1.5 px-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <input type="checkbox" checked={state.companyLogo} onChange={(e) => set("companyLogo")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
                                <span className="text-[13.5px] text-gray-700">Company Logo</span>
                              </div>
                            </div>
                          </div>
                          <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Company address" />
                          <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" />
                          <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="Phone" />
                          <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN" />
                        </CollapsibleSection>
                      </>
                    )}

                    {(state.thermalMode || "layout") === "settings" && (
                      <ThermalSettings state={state} set={set} isOpen={isOpen} toggle={toggle} />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Dynamic Live Theme Preview */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-slate-100 border-l border-gray-200">
            {/* Top Preview Control Bar */}
            <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between gap-2 flex-shrink-0 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide truncate">
                  {state.printer === "thermal" ? "Thermal POS Live Preview" : "Live Bill Preview"}
                </span>
                {state.printer === "thermal" ? (
                  <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md text-white bg-slate-800 shadow-xs truncate hidden sm:inline-block">
                    {activePosObj?.label || "Classic POS"} ({state.pageSize && state.pageSize.includes("58mm") ? "58mm Roll" : "80mm Roll"})
                  </span>
                ) : (
                  <span
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-md text-white shadow-xs truncate hidden sm:inline-block"
                    style={{ background: state.themeColor || "#2563eb" }}
                  >
                    {activeThemeObj.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {state.printer !== "thermal" && (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                    {[55, 68, 80].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZoomLevel(z)}
                        className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                          zoomLevel === z ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-200 text-slate-700"
                        }`}
                      >
                        {z}%
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsFullscreenPreview(true)}
                  className="text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs transition flex items-center gap-1 cursor-pointer"
                  title="Fullscreen Preview"
                >
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
            </div>

            {/* Preview Canvas Area */}
            <div className="flex-1 p-4 bg-slate-100/90 flex justify-center items-start overflow-y-auto overflow-x-hidden relative">
              {state.printer === "thermal" ? (
                <div 
                  className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-slate-200 mt-2 mb-6 transition-all"
                  style={{
                    width: state.pageSize && state.pageSize.includes("58mm") ? 270 : 310,
                    maxWidth: "100%",
                  }}
                >
                  {renderThermalPreview()}
                </div>
              ) : (
                <div
                  className="transition-all duration-200"
                  style={{
                    width: 794,
                    background: "#ffffff",
                    padding: "28px 32px",
                    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
                    borderRadius: 4,
                    transform: `scale(${currentScale})`,
                    transformOrigin: "top center",
                    marginBottom: `-${Math.round(1050 * (1 - currentScale))}px`,
                    pointerEvents: "none",
                    userSelect: "none",
                    flexShrink: 0
                  }}
                >
                  {renderThemePreview()}
                </div>
              )}
            </div>

            {/* Bottom Status Bar */}
            <div className="px-4 py-2 bg-white border-t border-slate-200 text-center text-xs text-slate-500 flex-shrink-0">
              {state.printer === "thermal" ? (
                <span>
                  Active Thermal Layout: <strong>{activePosObj?.label || "Classic POS"}</strong> ({state.pageSize || "80mm / 58mm"})
                </span>
              ) : (
                <span>
                  Showing <strong>{activeThemeObj.label}</strong> with accent <strong style={{ color: state.themeColor }}>{state.themeColor}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL-SCREEN HIGH RESOLUTION PREVIEW MODAL ── */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
          {/* Top Floating Modal Bar */}
          <div className="max-w-4xl w-full mx-auto bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-slate-200/80 mb-4 sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <span className="text-xl">{state.printer === "thermal" ? (activePosObj?.icon || "🧾") : activeThemeObj.icon}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {state.printer === "thermal" ? `${activePosObj?.label || "POS Thermal Receipt"} (Full Resolution)` : `${activeThemeObj.label} (Full Resolution)`}
                </h3>
                <span className="text-xs text-slate-500">
                  {state.printer === "thermal" ? `Layout: ${activePosObj?.label} • Roll: ${state.pageSize || "80mm"}` : `Accent: ${state.themeColor} • Format: A4 Standard`}
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsFullscreenPreview(false)}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              title="Close Full Preview"
            >
              <X size={18} />
            </button>
          </div>

          {/* Full Scale 100% Invoice Paper */}
          <div className="flex justify-center items-start flex-1 py-4">
            <div
              style={{
                width: state.printer === "thermal" ? 330 : 794,
                background: "#ffffff",
                padding: state.printer === "thermal" ? "18px 16px" : "32px 36px",
                boxShadow: "0 12px 48px rgba(0,0,0,0.35)",
                borderRadius: 4,
                minHeight: state.printer === "thermal" ? "auto" : 950
              }}
            >
              {state.printer === "thermal" ? (
                renderThermalPreview()
              ) : (
                renderThemePreview()
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="max-w-4xl w-full mx-auto text-center py-2 text-xs text-white/70">
            Press Close to return
          </div>
        </div>
      )}
    </div>
  );
}