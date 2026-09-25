import { useState, useEffect } from "react";
import { 
  ChevronDown, 
  QrCode, 
  Printer, 
  Maximize2, 
  X, 
  Check, 
  Palette, 
  Sparkles, 
  Layers, 
  Sliders, 
  Eye, 
  FileText, 
  Receipt, 
  ZoomIn, 
  ZoomOut, 
  CheckCircle2,
  Settings2,
  RotateCcw
} from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsHeader, InfoIcon, CheckRow, Badge } from "./settingsUI";
import { DESIGN_COMPONENTS } from "../billing/Invoice";

const blue = "#2563eb";
const STORAGE_KEY = "print_settings";

/* ─── REALISTIC SAMPLE INVOICE DATA FOR LIVE PREVIEW ───────────────────────── */
const SAMPLE_INVOICE = {
  invoice_no: "INV-2026-0001",
  receipt_no: "INV-2026-0001",
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
  notes: "Thank you for shopping with us! Have a pleasant day.",
  terms_conditions: "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payments.\n3. Subject to Coimbatore Jurisdiction.",
  savings_amount: 150,
  previous_balance: 500,
  current_balance: 500,
  products: [
    {
      product_name: "Premium Cotton Shirting Fabric",
      name: "Premium Cotton Shirting Fabric",
      product_code: "5208",
      hsn_code: "5208",
      hsn: "5208",
      qty: 2,
      unit: "Mtr",
      price: 500,
      mrp: 600,
      gst: 18,
      tax_percent: 18,
      amount: 1000,
      tax_amount: 180,
      description: "100% Giza Cotton, 60s Count High Thread",
      batch_no: "B-2026-89",
      exp_date: "12/2028",
      mfg_date: "01/2026",
      size: "XL / 42",
      model_no: "CTN-PREM-01",
      serial_no: "SN-982341"
    },
    {
      product_name: "Silk Zari Border Dhotis (Pack of 2)",
      name: "Silk Zari Border Dhotis (Pack of 2)",
      product_code: "5007",
      hsn_code: "5007",
      hsn: "5007",
      qty: 1,
      unit: "Pcs",
      price: 300,
      mrp: 350,
      gst: 12,
      tax_percent: 12,
      amount: 300,
      tax_amount: 36,
      description: "Pure Kanchipuram Silk border dhotis",
      batch_no: "B-2026-92",
      exp_date: "N/A",
      mfg_date: "02/2026",
      size: "Free Size (8 Mulam)",
      model_no: "SLK-ZAR-02",
      serial_no: "SN-982342"
    },
    {
      product_name: "Linen Formal Casual Material",
      name: "Linen Formal Casual Material",
      product_code: "5309",
      hsn_code: "5309",
      hsn: "5309",
      qty: 1,
      unit: "Mtr",
      price: 200,
      mrp: 250,
      gst: 5,
      tax_percent: 5,
      amount: 200,
      tax_amount: 10,
      description: "French Flax Linen blend",
      batch_no: "B-2026-95",
      exp_date: "N/A",
      mfg_date: "03/2026",
      size: "L / 40",
      model_no: "LIN-FML-03",
      serial_no: "SN-982343"
    }
  ],
  sub_total: 1500,
  tax_amount: 226,
  gst_total: 226,
  total_amount: 1726,
  paid_amount: 1726,
  balance_amount: 0,
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
    <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden transition-all duration-150">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 py-3 px-4 hover:bg-slate-50/80 transition-colors cursor-pointer select-none text-left"
      >
        <span className="flex items-center gap-2.5 text-[13.5px] font-bold text-slate-800">
          <span className="w-1 h-3.5 rounded-full bg-blue-600 flex-shrink-0" />
          <span>{title}</span>
          {badge && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180 text-blue-600" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-1 border-t border-slate-100/90 space-y-1">{children}</div>}
    </div>
  );
}

function LayerRow({ label, checked, onChange, input, onChangeText, info, placeholder }) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            style={{ accentColor: blue }}
          />
          <span className="text-[13px] font-medium text-slate-700">{label}</span>
        </label>
        {info && <InfoIcon title={info} />}
      </div>
      {checked && onChangeText && (
        <div className="mt-2 ml-6">
          <input
            type="text"
            value={input}
            onChange={(e) => onChangeText(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>
      )}
    </div>
  );
}

function SelectRow({ label, value, onChange, options, info }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5">{label}</span>
        {info && <InfoIcon title={info} />}
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer transition shadow-2xs"
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function NumberSpinner({ label, value, onChange, info }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-medium text-slate-700 flex items-center gap-1.5">{label}</span>
        {info && <InfoIcon title={info} />}
      </div>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden w-32 bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-sm font-bold cursor-pointer transition select-none"
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
          className="w-full text-center text-xs font-bold text-slate-800 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 text-sm font-bold cursor-pointer transition select-none"
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
      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 transition-all cursor-pointer relative flex items-center justify-center ${
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
      <div className="grid grid-cols-6 gap-2 py-2"> 
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

function LinkText({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-blue-600 hover:text-blue-700 font-bold mt-1.5 cursor-pointer text-left hover:underline flex items-center gap-1"
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
      <div className="py-1 px-0.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={state.companyLogo} 
              onChange={(e) => set("companyLogo")(e.target.checked)} 
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
              style={{ accentColor: blue }} 
            />
            <span className="text-[13px] font-medium text-slate-700">Company Logo</span>
          </label>
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
    </CollapsibleSection>
  );
}

function ItemTableSection({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Item Table" open={open} onToggle={onToggle}>
      <CheckRow label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} info="Expand item table to full width" />
      <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} info="Minimum rows in item table" />
    </CollapsibleSection>
  );
}

function TotalsAndTaxes({ state, set, open, onToggle }) {
  return (
    <CollapsibleSection title="Totals & Taxes" open={open} onToggle={onToggle}>
      <CheckRow label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} info="Print total item quantity" />
      <div className="py-1 px-0.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={state.amountWithDecimal} 
              onChange={(e) => set("amountWithDecimal")(e.target.checked)} 
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
              style={{ accentColor: blue }} 
            />
            <span className="text-[13px] font-medium text-slate-700">Amount with Decimal <span className="text-slate-400 ml-1">e.g. 0.00</span></span>
          </label>
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
      <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} info="Print payment mode" />
      <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} info="Print acknowledgement" />
    </CollapsibleSection>
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

function ThermalSettings({ state, set, isOpen, toggle }) {
  return (
    <div className="space-y-3 pb-2">
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
                    ? "bg-blue-50/90 border-blue-600 shadow-xs ring-1 ring-blue-500/30"
                    : "hover:bg-slate-50 border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">{posOpt.icon}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{posOpt.label}</div>
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
        <div className="py-1 px-0.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={state.companyLogo} 
                onChange={(e) => set("companyLogo")(e.target.checked)} 
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                style={{ accentColor: blue }} 
              />
              <span className="text-[13px] font-medium text-slate-700">Company Logo</span>
            </label>
          </div>
        </div>
        <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Company address" />
        <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" />
        <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="Phone" />
        <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN" />
      </CollapsibleSection>

      <CollapsibleSection title="Change Transaction Names" open={isOpen("changeTransactionNames")} onToggle={() => toggle("changeTransactionNames")}>
        <button type="button" className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer hover:underline">Change Transaction Names &gt;</button>
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
          <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            <span className="text-xs font-semibold text-slate-700">1. 2 Inch (VYPRTP2001) - Quick Setup</span>
            <button type="button" className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            <span className="text-xs font-semibold text-slate-700">2. 3 Inch (VYPRTP3001) - Quick Setup</span>
            <button type="button" className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            <span className="text-xs font-semibold text-slate-700">3. 2 Inch (VYPRTP2002) - Quick Setup</span>
            <button type="button" className="text-blue-600 hover:text-blue-800 text-xs font-bold cursor-pointer">Setup</button>
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

  // Active Company Data from state inputs (Respects checkboxes)
  const dynamicCompany = {
    company_name: state.companyName !== false ? (state.companyNameText || "My Company") : "",
    company_address: state.address !== false ? (state.addressText || "Plot No. 1, Shop No. 8, Koramangala, Bangalore, 560034") : "",
    phone: state.phone !== false ? (state.phoneText || "9994789683") : "",
    email: state.email !== false ? (state.emailText || "info@mycompany.com") : "",
    gstin: state.gstin !== false ? (state.gstinText || "33AAAAA0000A1Z5") : "",
    bank_name: "State Bank of India",
    account_no: "30294819284",
    ifsc_code: "SBIN0001234",
    branch_name: "Tirupur Main Branch",
    signature: state.printSignatureText !== false ? (state.signatureText || "Authorized Signatory") : "",
    logo: state.companyLogo !== false ? (state.logoUrl || null) : null,
  };

  const renderThemePreview = () => {
    if (!DesignComponent) return null;
    return (
      <DesignComponent
        invoice={SAMPLE_INVOICE}
        company={dynamicCompany}
        color={state.themeColor || "#2563eb"}
        logoUrl={state.companyLogo !== false ? (state.logoUrl || null) : null}
        printSettings={state}
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
          logoUrl={state.companyLogo !== false ? (state.logoUrl || null) : null}
          layout={activePosId}
          printSettings={state}
        />
      );
    }
    return <ThermalReceiptPreview state={state} />;
  };

  return (
    <div className="overflow-hidden flex flex-col h-[calc(100vh-130px)] min-h-[620px] bg-slate-50/50 rounded-2xl border border-slate-200/80 shadow-xs">
      {/* ── Top Header Bar ── */}
      <SettingsHeader
        title="Print Settings"
        subtitle="LAYOUT, COLORS, THERMAL POS & PRINTER CONFIGURATION"
        icon={<Printer size={22} strokeWidth={2.2} />}
        onClose={() => setSettingsTab && setSettingsTab("general")}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Active Mode:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              {state.printer === "thermal" ? "Thermal POS" : "Regular Laser/Inkjet"}
            </span>
          </div>
        }
      />

      {/* ── Two Column Dual-Scroll Body Container ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        
        {/* ── LEFT PANEL: Independent Scrollable Configuration / Controls ── */}
        <div className="w-full lg:w-[48%] xl:w-[45%] 2xl:w-[42%] h-full flex flex-col min-h-0 bg-white border-r border-slate-200/80 overflow-hidden">
          
          {/* Fixed Sticky Header for Left Panel */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex-shrink-0 space-y-3">
            {/* Primary Printer Mode Tabs */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1.5 bg-slate-200/70 rounded-xl p-1 flex-1 shadow-inner">
                {[
                  { id: "regular", label: "REGULAR PRINTER", icon: FileText },
                  { id: "thermal", label: "THERMAL POS", icon: Receipt },
                ].map((t) => {
                  const Icon = t.icon;
                  const isSelected = state.printer === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => set("printer")(t.id)}
                      className={`flex-1 py-2 px-3 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-white text-blue-700 shadow-sm shadow-slate-300/50"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                      }`}
                    >
                      <Icon size={14} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Global Expand / Collapse Accordions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={expandAll}
                  title="Expand all sections"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                >
                  Expand
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  title="Collapse all sections"
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                >
                  Collapse
                </button>
              </div>
            </div>

            {/* Secondary Segmented Sub-Tabs */}
            {state.printer === "regular" ? (
              <div className="flex gap-2">
                {[
                  { id: "layout", label: "CHANGE LAYOUT & TEMPLATES", icon: Layers },
                  { id: "colors", label: "THEME COLOR & ACCENTS", icon: Palette },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = state.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => set("mode")(m.id)}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                          : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex gap-2">
                {[
                  { id: "layout", label: "CHANGE POS RECEIPT LAYOUT", icon: Receipt },
                  { id: "settings", label: "THERMAL SETTINGS & SIZES", icon: Sliders },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSelected = (state.thermalMode || "layout") === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => set("thermalMode")(m.id)}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20"
                          : "bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Independent Scrollable Accordion Settings Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5 paysplitx-scrollbar-light space-y-3.5">
            {state.printer === "regular" ? (
              <>
                {state.mode === "colors" && (
                  <>
                    {/* Theme Color Palette */}
                    <CollapsibleSection title="Theme Color Accent" badge={state.themeColor || "#2563eb"} open={isOpen("themeColor")} onToggle={() => toggle("themeColor")}>
                      <div className="pt-1">
                        <ColorPalette value={state.themeColor} onChange={set("themeColor")} />
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                          <span className="text-xs text-slate-500">Selected Hex:</span>
                          <span 
                            className="text-xs font-mono font-bold px-2.5 py-1 rounded-md text-white shadow-2xs"
                            style={{ backgroundColor: state.themeColor || "#2563eb" }}
                          >
                            {state.themeColor || "#2563eb"}
                          </span>
                        </div>
                      </div>
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
                    {/* Templates Grid Selection */}
                    <CollapsibleSection title="Invoice Templates" badge="7 Styles" open={isOpen("templates")} onToggle={() => toggle("templates")}>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1.5">
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
                                  : "hover:bg-slate-50 border-slate-200/90 bg-white"
                              }`}
                            >
                              <div className="w-full h-11 bg-slate-100 rounded-lg border border-slate-200/80 mb-1.5 flex items-center justify-center text-xl">
                                {tpl.icon || "📄"}
                              </div>
                              <span className="text-xs font-bold text-slate-900 block truncate w-full">{tpl.label}</span>
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
                    
                    {/* Print Settings */}
                    <CollapsibleSection title="Page Size & Layout Config" open={isOpen("printSettings")} onToggle={() => toggle("printSettings")}>
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
                      <div className="py-1 px-0.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={state.amountWithDecimal} 
                              onChange={(e) => set("amountWithDecimal")(e.target.checked)} 
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                              style={{ accentColor: blue }} 
                            />
                            <span className="text-[13px] font-medium text-slate-700">Amount with Decimal <span className="text-slate-400 ml-1">e.g. 0.00</span></span>
                          </label>
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
              </>
            ) : (
              <>
                {(state.thermalMode || "layout") === "layout" && (
                  <>
                    {/* POS Layouts Selection Grid */}
                    <CollapsibleSection title="POS Receipt Layouts" badge="5 Styles" open={isOpen("thermalLayouts")} onToggle={() => toggle("thermalLayouts")}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {POS_LAYOUT_OPTIONS.map((posOpt) => {
                          const isSelected = activePosId === posOpt.id;
                          return (
                            <button
                              key={posOpt.id}
                              type="button"
                              onClick={() => set("posLayout")(posOpt.id)}
                              className={`border rounded-xl p-3 text-left transition cursor-pointer flex flex-col justify-between relative ${
                                isSelected
                                  ? "bg-blue-50/90 border-blue-600 shadow-xs ring-2 ring-blue-500/30"
                                  : "hover:bg-slate-50 border-slate-200/90 bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-lg flex-shrink-0">
                                  {posOpt.icon}
                                </div>
                                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md ${
                                  isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                }`}>
                                  {posOpt.badge}
                                </span>
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  {posOpt.label}
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block" />}
                                </div>
                                <div className="text-[10.5px] text-slate-500 mt-0.5 line-clamp-2">
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
                      <div className="py-1 px-0.5">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={state.companyLogo} 
                              onChange={(e) => set("companyLogo")(e.target.checked)} 
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                              style={{ accentColor: blue }} 
                            />
                            <span className="text-[13px] font-medium text-slate-700">Company Logo</span>
                          </label>
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
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Independent Scrollable Document Preview Canvas ── */}
        <div className="w-full lg:w-[52%] xl:w-[55%] 2xl:w-[58%] h-full flex flex-col min-h-0 bg-slate-100/90 overflow-hidden">
          
          {/* Top Preview Control Toolbar */}
          <div className="px-4 sm:px-5 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide truncate">
                {state.printer === "thermal" ? "Thermal POS Live Preview" : "Live Bill Preview"}
              </span>
              {state.printer === "thermal" ? (
                <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-md text-white bg-slate-800 shadow-2xs truncate hidden sm:inline-block">
                  {activePosObj?.label || "Classic POS"} ({state.pageSize && state.pageSize.includes("58mm") ? "58mm Roll" : "80mm Roll"})
                </span>
              ) : (
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-md text-white shadow-2xs truncate hidden sm:inline-block"
                  style={{ background: state.themeColor || "#2563eb" }}
                >
                  {activeThemeObj.label}
                </span>
              )}
            </div>

            {/* Zoom Controls & Fullscreen */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {state.printer !== "thermal" && (
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(40, z - 10))}
                    className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer transition font-bold"
                    title="Zoom Out"
                  >
                    −
                  </button>
                  {[55, 68, 80].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoomLevel(z)}
                      className={`px-2 py-0.5 rounded-md transition cursor-pointer text-[11px] ${
                        zoomLevel === z ? "bg-slate-900 text-white font-bold" : "hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(100, z + 10))}
                    className="px-1.5 py-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded cursor-pointer transition font-bold"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsFullscreenPreview(true)}
                className="text-xs font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                title="Fullscreen Preview"
              >
                <Maximize2 size={13} />
                <span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Independent Scrollable Preview Area */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-4 sm:p-6 lg:p-8 flex justify-center items-start bg-slate-100/80 paysplitx-scrollbar">
            {state.printer === "thermal" ? (
              <div 
                className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-slate-200/90 my-2 transition-all flex-shrink-0"
                style={{
                  width: state.pageSize && state.pageSize.includes("58mm") ? 270 : 310,
                  maxWidth: "100%",
                }}
              >
                {renderThermalPreview()}
              </div>
            ) : (
              <div
                className="transition-all duration-200 flex-shrink-0"
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
                }}
              >
                {renderThemePreview()}
              </div>
            )}
          </div>

          {/* Bottom Status Toolbar */}
          <div className="px-4 py-2.5 bg-white border-t border-slate-200/80 text-center sm:text-left text-xs text-slate-500 flex items-center justify-between flex-shrink-0 shadow-2xs">
            {state.printer === "thermal" ? (
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-slate-400" />
                <span>
                  Active POS Layout: <strong className="text-slate-800">{activePosObj?.label || "Classic POS"}</strong> • Roll: <strong className="text-slate-800">{state.pageSize || "80mm"}</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span>
                  Active Template: <strong className="text-slate-800">{activeThemeObj.label}</strong> • Accent: <strong style={{ color: state.themeColor || "#2563eb" }}>{state.themeColor || "#2563eb"}</strong> • Size: <strong className="text-slate-800">{state.paperSize || "A4"}</strong>
                </span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Independent dual-pane scrolling enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FULL-SCREEN HIGH RESOLUTION PREVIEW MODAL ── */}
      {isFullscreenPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/85 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 overflow-y-auto">
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