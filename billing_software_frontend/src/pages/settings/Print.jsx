import { useState } from "react";
import { ChevronDown, QrCode, Printer } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsHeader, InfoIcon, CheckRow } from "./settingsUI";

const blue = "#2563eb";
const STORAGE_KEY = "print_settings";

const DEFAULT_STATE = {
  printer: "regular",
  mode: "colors",

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
  gstinText: "",

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

  template: "Tally Theme",
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
    if (!saved) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_STATE;
  }
}

function SectionHeading({ title }) {
  return (
    <h4 className="flex items-center gap-2 text-[16px] font-bold text-slate-800 mb-2">
      <span className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(135deg,#1f8cff,#4338ca)" }} />
      {title}
    </h4>
  );
}

function Divider() {
  return <div className="h-px bg-slate-200 my-3" />;
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
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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
          className="px-3 py-2 text-gray-500 hover:bg-gray-100 text-sm"
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
          className="px-3 py-2 text-gray-500 hover:bg-gray-100 text-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}

const TEMPLATES = ["Tally Theme", "Landscape Theme 1", "Landscape Theme 2", "GST Theme 1", "GST Theme 2", "Minimal Theme"];

const COLOR_PALETTE = [
  { hex: "#b39ddb", label: "Light Purple" },
  { hex: "#009688", label: "Teal Blue" },
  { hex: "#9e9e9e", label: "Gray" },
  { hex: "#616161", label: "Dark Gray" },
  { hex: "#9e9d24", label: "Olive" },
  { hex: "#1e88e5", label: "Blue" },
  { hex: "#00bcd4", label: "Cyan" },
  { hex: "#43a047", label: "Green" },
  { hex: "#7cb342", label: "Lime Green" },
  { hex: "#795548", label: "Dark Brown" },
  { hex: "#8e24aa", label: "Purple" },
  { hex: "#c2185b", label: "Dark Pink" },
  { hex: "#d84315", label: "Reddish Brown" },
  { hex: "#f4511e", label: "Orange Brown" },
  { hex: "#673ab7", label: "Violet" },
  { hex: "#ec407a", label: "Magenta" },
  { hex: "#ffb300", label: "Light Orange" },
  { hex: "#f57c00", label: "Mustard/Orange" },
  { hex: "#f06292", label: "Pink" },
  { hex: "#fb8c00", label: "Orange" },
  { hex: "#e53935", label: "Red" },
  { hex: "#ff6d00", label: "Reddish Orange" },
  { hex: "#6d4c41", label: "Dark Brown" },
  { hex: "#ffffff", label: "White" },
];

function ColorSwatch({ hex, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hex}
      aria-label={`Color ${hex}`}
      className="w-10 h-10 rounded-full flex-shrink-0 transition-transform hover:scale-110"
      style={{
        background: hex,
        boxShadow: selected
          ? "0 0 0 4px #c6f500, 0 0 0 6px #1e88e5"
          : "inset 0 0 0 1px rgba(0,0,0,0.15)",
      }}
    />
  );
}

function ColorPalette({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-x-5 gap-y-4 py-2 sm:grid-cols-8 lg:grid-cols-12">
        {COLOR_PALETTE.map((c) => (
          <ColorSwatch
            key={c.hex + c.label}
            hex={c.hex}
            selected={value === c.hex}
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
      className="text-[13px] text-blue-600 hover:text-blue-800 font-medium mt-1.5"
    >
      {children}
    </button>
  );
}

function PrintCompanyHeader({ state, set }) {
  return (
    <div>
      <SectionHeading title="Print Company Info / Header" />
      <Divider />
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
    </div>
  );
}
 
function PrintOptions({ state, set }) {
  return (
    <div>
      <SectionHeading title="Print Options" />
      <Divider />
      <SelectRow label="Paper Size" value={state.paperSize} onChange={set("paperSize")} options={["A4", "A5", "Legal"]} info="Paper size" />
      <SelectRow label="Orientation" value={state.orientation} onChange={set("orientation")} options={["Portrait", "Landscape"]} info="Page orientation" />
      <SelectRow label="Company Name Text Size" value={state.companyNameSize} onChange={set("companyNameSize")} options={["Small", "Medium", "Large"]} info="Company name text size" />
      <SelectRow label="Invoice Text Size" value={state.invoiceTextSize} onChange={set("invoiceTextSize")} options={["Small", "Medium", "Large"]} info="Invoice text size" />
      <CheckRow label="Print Original/Duplicate" checked={state.printOriginalDuplicate} onChange={set("printOriginalDuplicate")} info="Print original/duplicate copies" />
      <NumberSpinner label="Extra space on Top of PDF" value={state.extraSpaceTop} onChange={set("extraSpaceTop")} info="Extra space at top of PDF" />
      <LinkText>Change Transaction Names &gt;</LinkText>
    </div>
  );
}

function ItemTableSection({ state, set }) {
  return (
    <div>
      <SectionHeading title="Item Table" />
      <Divider />
      <CheckRow label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} info="Expand item table to full width" />
      <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} info="Minimum rows in item table" />
      <LinkText>Item Table Customization &gt;</LinkText>
    </div>
  );
}

function TotalsAndTaxes({ state, set }) {
  return (
    <div>
      <SectionHeading title="Totals & Taxes" />
      <Divider />
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
    </div>
  );
}

function FooterSection({ state, set }) {
  return (
    <div>
      <SectionHeading title="Footer" />
      <Divider />
      <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} info="Print description footer" />
      <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} info="Print terms and conditions" />
      <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} info="Print received by" />
      <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} info="Print delivered by" />
      <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" info="Text for signature line" />
      <LinkText>Change Signature</LinkText>
      <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} info="Print payment mode" />
      <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} info="Print acknowledgement" />
    </div>
  );
}

function InvoicePreview() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 text-gray-800 shadow-sm">
      {/* Title */}
      <div className="text-center border-b border-gray-200 pb-3 mb-3">
        <h5 className="text-xl font-bold tracking-wide text-gray-900">Tax Invoice</h5>
      </div>

      {/* Company header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
          Logo
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">My Company</div>
          <div className="text-xs text-gray-600">Phone: 9994789683</div>
        </div>
      </div>

      {/* Bill To / Invoice Details grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-gray-800">Bill To:</div>
          <div className="text-gray-700">Classic enterprises</div>
          <div className="text-gray-700">Plot No. 1, Shop No. 8,</div>
          <div className="text-gray-700">Koramangala, Bangalore,</div>
          <div className="text-gray-700">560034</div>
          <div className="font-bold text-gray-800 mt-2">Ship To:</div>
          <div className="text-gray-700">Mehta Textiles, Marathalli Road,</div>
          <div className="text-gray-700">Bangalore, Karnataka, 560034</div>
        </div>
        <div className="text-right space-y-1">
          <div className="font-bold text-gray-800">Invoice Details:</div>
          <div className="text-gray-700">Invoice No.: Inv. 101</div>
          <div className="text-gray-700">Date: 02-07-2019</div>
          <div className="text-gray-700">Time: 12:30 PM</div>
          <div className="text-gray-700">Due Date: 17-07-2019</div>
        </div>
      </div>

      {/* Items table */}
      <div className="mb-4">
        <table className="w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-left">#</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-left">Item name</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-left">HSC/SAC</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-right">Qty</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-right">Price/unit</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-right">Discount</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-right">GST</th>
              <th className="border border-gray-300 px-2 py-1.5 font-semibold text-gray-700 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">1</td>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">ITEM 1</td>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">1234</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">1+1</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹10.00</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹0.10 (1%)</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹0.50 (5%)</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700 font-medium">₹10.40</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">2</td>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">ITEM 2</td>
              <td className="border border-gray-300 px-2 py-1 text-gray-700">6325</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">1</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹30.00</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹0.00 (0%)</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹5.40 (18%)</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700 font-medium">₹35.40</td>
            </tr>
            <tr className="bg-gray-50 font-semibold">
              <td className="border border-gray-300 px-2 py-1 text-gray-700" colSpan={3}>TOTAL</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">2+1</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700" colSpan={2}>Discount: ₹0.10</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">GST: ₹5.90</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800">₹45.80</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tax Summary */}
      <div className="mb-4">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-left">HSN/SAC</th>
              <th className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-right">Taxable Amt (₹)</th>
              <th className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-center" colSpan={2}>CGST</th>
              <th className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-center" colSpan={2}>SGST</th>
              <th className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-right">Total Tax (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 px-2 py-1 text-gray-600">-</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹50.20</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">2.5%</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹1.26</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">2.5%</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹1.26</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹5.40</td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-2 py-1 text-gray-600">-</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹30.00</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">9.0%</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹2.70</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">9.0%</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹2.70</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-700">₹5.40</td>
            </tr>
            <tr className="font-semibold bg-gray-50">
              <td className="border border-gray-300 px-2 py-1 text-gray-800">Total</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800">₹80.20</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800"></td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800">₹3.96</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800"></td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800">₹3.96</td>
              <td className="border border-gray-300 px-2 py-1 text-right text-gray-800">₹9.92</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="space-y-1">
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="text-gray-600">Sub Total</span>
            <span className="font-medium text-gray-800">₹45.80</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="text-gray-600">Discount (12%)</span>
            <span className="font-medium text-gray-800">₹5.50</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="text-gray-600">Tax (5%)</span>
            <span className="font-medium text-gray-800">₹2.02</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 py-1">
            <span className="text-gray-600">TCS (1%)</span>
            <span className="font-medium text-gray-800">₹0.42</span>
          </div>
          <div className="flex justify-between py-1 font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-gray-900">₹42.32</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="bg-gray-50 p-2 rounded border border-gray-200">
            <div className="text-[9px] text-gray-500">Invoice Amount In Words</div>
            <div className="text-[10px] font-medium text-gray-800">Forty Two Rupees and Thirty Two Paisa only</div>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Received</span>
            <span className="text-gray-800">₹12.00</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Balance</span>
            <span className="text-gray-800">₹30.32</span>
          </div>
          <div className="flex justify-between py-1 font-semibold">
            <span className="text-gray-800">You Saved</span>
            <span className="text-green-600">₹111.60</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-3 grid grid-cols-2 gap-4 text-[9px]">
        <div>
          <div className="font-bold text-gray-800 mb-1">Description:</div>
          <div className="text-gray-600">Sale Description</div>
          <div className="mt-2">
            <div className="inline-flex items-center gap-1 border border-gray-300 px-2 py-1 rounded">
              <QrCode size={18} className="text-gray-600" />
            </div>
          </div>
          <div className="font-bold text-gray-800 mt-2 mb-1">Bank Details:</div>
          <div className="text-gray-600">Bank Name: 123123123123</div>
          <div className="text-gray-600">Bank Account No.: 12312312312</div>
          <div className="text-gray-600">Bank IFSC code: 123123123</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-gray-800 mb-1">Terms &amp; Conditions:</div>
          <div className="text-gray-600">Thanks for doing business with us!</div>
          <div className="font-bold text-gray-800 mt-2 mb-1">For: My Company:</div>
          <div className="mt-4 mb-1 text-gray-400">[ Signature ]</div>
          <div className="border-t border-gray-300 pt-1 inline-block text-gray-700">Authorized Signatory</div>
        </div>
      </div>
    </div>
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

function ThermalSettings() {
  const [state, setState] = useState(loadState);

  const set = (key) => (val) =>
    setState((s) => {
      const next = { ...s, [key]: typeof val === "function" ? val(s[key]) : val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });

  return (
    <div className="space-y-6 pb-4">
      <div>
        <SectionHeading title="Page Size" />
        <Divider />
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
      </div>

      <div>
        <SectionHeading title="Printing Options" />
        <Divider />
        <CheckRow label="Use Text Styling (Bold)" checked={state.useTextStyling} onChange={set("useTextStyling")} />
        <CheckRow label="Auto Cut Paper After Printing" checked={state.autoCutPaper} onChange={set("autoCutPaper")} />
        <CheckRow label="Open Cash Drawer After Printing" checked={state.openCashDrawer} onChange={set("openCashDrawer")} />
      </div>

      <div>
        <SectionHeading title="Print Settings" />
        <Divider />
        <NumberSpinner label="Extra lines at the end" value={state.extraLinesEnd} onChange={set("extraLinesEnd")} />
        <NumberSpinner label="Number of copies" value={state.numberOfCopies} onChange={set("numberOfCopies")} />
      </div>

      <div>
        <SectionHeading title="Print Company Info / Header" />
        <Divider />
        <LayerRow label="Company Name" checked={state.companyName} onChange={set("companyName")} input={state.companyNameText} onChangeText={set("companyNameText")} placeholder="My Company" />
        <div className="py-1.5 px-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input type="checkbox" checked={state.companyLogo} onChange={(e) => set("companyLogo")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
              <span className="text-[13.5px] text-gray-700">Company Logo</span>
            </div>
            <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Change</button>
          </div>
        </div>
        <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Company address" />
        <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" />
        <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="Phone" />
        <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN" />
      </div>

      <div>
        <SectionHeading title="Change Transaction Names" />
        <Divider />
        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Change Transaction Names &gt;</button>
      </div>

      <div>
        <SectionHeading title="Item Table" />
        <Divider />
        <CheckRow label="S.No" checked={state.showSNo} onChange={set("showSNo")} />
        <CheckRow label="HSN/SAC Code" checked={state.showHSNCode} onChange={set("showHSNCode")} />
        <CheckRow label="Units of Measurement" checked={state.showUnits} onChange={set("showUnits")} />
        <CheckRow label="MRP" checked={state.showMRP} onChange={set("showMRP")} />
        <CheckRow label="Description" checked={state.showDescription} onChange={set("showDescription")} />
      </div>

      <div>
        <SectionHeading title="Additional Item Details" />
        <Divider />
        <CheckRow label="Batch No." checked={state.showBatchNo} onChange={set("showBatchNo")} />
        <CheckRow label="Exp. Date" checked={state.showExpDate} onChange={set("showExpDate")} />
        <CheckRow label="Mfg. Date" checked={state.showMfgDate} onChange={set("showMfgDate")} />
        <CheckRow label="Size" checked={state.showSize} onChange={set("showSize")} />
        <CheckRow label="Model No." checked={state.showModelNo} onChange={set("showModelNo")} />
        <CheckRow label="Serial No." checked={state.showSerialNo} onChange={set("showSerialNo")} />
      </div>

      <div>
        <SectionHeading title="Totals & Taxes" />
        <Divider />
        <CheckRow label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} />
        <CheckRow label="Amount with Decimal e.g. 0.00" checked={state.amountWithDecimal} onChange={set("amountWithDecimal")} />
        <CheckRow label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} />
        <CheckRow label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} />
        <CheckRow label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} />
        <CheckRow label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} />
        <CheckRow label="You Saved" checked={state.youSaved} onChange={set("youSaved")} />
        <CheckRow label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} />
        <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} />
      </div>

      <div>
        <SectionHeading title="Footer" />
        <Divider />
        <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
        <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
        <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
        <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
        <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
        <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
        <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
      </div>

      <div>
        <SectionHeading title="Billing Printer Setup" />
        <Divider />
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">1. 2 Inch (VYPRTP2001) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">2. 3 Inch (VYPRTP3001) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Setup</button>
          </div>
          <div className="flex items-center justify-between p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
            <span className="text-sm text-gray-700">3. 2 Inch (VYPRTP2002) - Quick Setup</span>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Setup</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Print() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("print", state, setState);

  const set = (key) => (val) =>
    setState((s) => {
      const next = { ...s, [key]: typeof val === "function" ? val(s[key]) : val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });

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
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 flex-shrink-0">
                {[
                  { id: "regular", label: "REGULAR PRINTER" },
                  { id: "thermal", label: "THERMAL PRINTER" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => set("printer")(t.id)}
                    className={`flex-1 px-4 py-2 text-xs font-semibold rounded-md transition ${
                      state.printer === t.id
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {state.printer === "regular" ? (
                <>
                  {/* Secondary tabs */}
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
                          className={`px-1 pt-2 pb-2 text-xs font-semibold tracking-wide transition ${
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
                        <div>
                          <SectionHeading title="Theme Color" />
                          <Divider />
                          <ColorPalette value={state.themeColor} onChange={set("themeColor")} />
                          <p className="text-xs text-gray-500 mt-2">Choose a theme color for the printed invoice.</p>
                        </div>

                        {/* Print Company Info / Header */}
                        <PrintCompanyHeader state={state} set={set} />

                        {/* Print Options */}
                        <PrintOptions state={state} set={set} />

                        {/* Item Table */}
                        <ItemTableSection state={state} set={set} />

                        {/* Totals & Taxes */}
                        <TotalsAndTaxes state={state} set={set} />

                        {/* Footer */}
                        <FooterSection state={state} set={set} />
                      </>
                    )}

                    {state.mode === "layout" && (
                      <>
                        {/* Templates */}
                        <div>
                          <SectionHeading title="Templates" />
                          <Divider />
                          <div className="grid grid-cols-3 gap-3">
                            {TEMPLATES.map((tpl) => (
                              <button
                                key={tpl}
                                type="button"
                                onClick={() => set("template")(tpl)}
                                className={`border rounded-lg p-2 text-center transition ${
                                  state.template === tpl
                                    ? "bg-blue-50 border-blue-300 shadow-sm"
                                    : "hover:bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="h-12 bg-gray-100 rounded border border-gray-200 mb-1 flex items-center justify-center text-[8px] text-gray-400">
                                  {tpl}
                                </div>
                                <span className="text-[10px] font-medium text-gray-700">{tpl}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Company Info */}
                        <div>
                          <SectionHeading title="Print Company Info / Header" />
                          <Divider />
                          <CheckRow label="Make Regular Printer Default" checked={state.regularDefault} onChange={set("regularDefault")} />
                          <CheckRow label="Print repeat header in all pages" checked={state.repeatHeader} onChange={set("repeatHeader")} />
                          <LayerRow label="Company Name" checked={state.companyName} onChange={set("companyName")} input={state.companyNameText} onChangeText={set("companyNameText")} placeholder="My Company" />
                          <div className="py-1.5 px-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <input type="checkbox" checked={state.companyLogo} onChange={(e) => set("companyLogo")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
                                <span className="text-[13.5px] text-gray-700">Company Logo</span>
                              </div>
                              <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium">Change</button>
                            </div>
                          </div>
                          <LayerRow label="Address" checked={state.address} onChange={set("address")} input={state.addressText} onChangeText={set("addressText")} placeholder="Company address" />
                          <LayerRow label="Email" checked={state.email} onChange={set("email")} input={state.emailText} onChangeText={set("emailText")} placeholder="Email" />
                          <LayerRow label="Phone Number" checked={state.phone} onChange={set("phone")} input={state.phoneText} onChangeText={set("phoneText")} placeholder="Phone" />
                          <LayerRow label="GSTIN on Sale" checked={state.gstin} onChange={set("gstin")} input={state.gstinText} onChangeText={set("gstinText")} placeholder="GSTIN" />
                        </div>

                        {/* Print Settings */}
                        <div>
                          <SectionHeading title="Print Settings" />
                          <Divider />
                          <SelectRow label="Paper Size" value={state.paperSize} onChange={set("paperSize")} options={["A4", "A5", "Legal", "Thermal 80mm", "Thermal 58mm"]} />
                          <SelectRow label="Orientation" value={state.orientation} onChange={set("orientation")} options={["Portrait", "Landscape"]} />
                          <SelectRow label="Company Name Text Size" value={state.companyNameSize} onChange={set("companyNameSize")} options={["Small", "Medium", "Large"]} />
                          <SelectRow label="Invoice Text Size" value={state.invoiceTextSize} onChange={set("invoiceTextSize")} options={["Small", "Medium", "Large"]} />
                          <CheckRow label="Print Original/Duplicate" checked={state.printOriginalDuplicate} onChange={set("printOriginalDuplicate")} />
                          <NumberSpinner label="Extra space on Top of PDF" value={state.extraSpaceTop} onChange={set("extraSpaceTop")} />
                        </div>

                        {/* Item Table */}
                        <div>
                          <SectionHeading title="Item Table" />
                          <Divider />
                          <CheckRow label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} />
                          <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} />
                        </div>

                        {/* Totals & Taxes */}
                        <div>
                          <SectionHeading title="Totals & Taxes" />
                          <Divider />
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
                        </div>

                        {/* Footer */}
                        <div>
                          <SectionHeading title="Footer" />
                          <Divider />
                          <CheckRow label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
                          <CheckRow label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
                          <CheckRow label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
                          <CheckRow label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
                          <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
                          <CheckRow label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
                          <CheckRow label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <ThermalSettings />
              )}
            </div>
          </div>

          {/* Right Panel - Preview with independent scroll */}
          <div className="w-1/2 overflow-y-auto overflow-x-hidden bg-gray-50">
            <div className="p-6 flex justify-center">
              <div className="w-full flex justify-center">
                {state.printer === "thermal" ? (
                  <ThermalReceiptPreview state={state} />
                ) : (
                  <div className="max-w-md w-full">
                    <InvoicePreview />
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-gray-400 mt-3">Live Preview</p>
            </div>  
          </div>
        </div>
      </div>
    </div>
  );
}