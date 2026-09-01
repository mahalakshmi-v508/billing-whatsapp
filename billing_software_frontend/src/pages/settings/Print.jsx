import { useState } from "react";
import { Info, ChevronDown, QrCode } from "lucide-react";
import { useSettings } from "./SettingsContext";

const blue = "#2563eb";
const STORAGE_KEY = "print_settings";

const DEFAULT_STATE = {
  printer: "regular",
  mode: "layout",

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

function InfoIcon({ title }) {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-500 hover:bg-blue-500 hover:text-white cursor-help transition-colors flex-shrink-0"
      title={title}
    >
      <Info size={11} strokeWidth={2.5} aria-label={title} />
    </span>
  );
}

function Checkbox({ label, checked, onChange, info }) {
  return (
    <label className="flex items-center justify-between py-2 px-1 rounded cursor-pointer select-none group">
      <span className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-5 h-5 cursor-pointer shrink-0 rounded"
          style={{ accentColor: blue }}
        />
        <span className="text-[13.5px] text-gray-700 group-hover:text-gray-900">{label}</span>
      </span>
      {info && <InfoIcon title={info} />}
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-gray-200 my-3" />;
}

function SectionHeading({ title }) {
  return <h4 className="text-[18px] font-bold text-gray-800 mb-1">{title}</h4>;
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
        <Checkbox label="Use Text Styling (Bold)" checked={state.useTextStyling} onChange={set("useTextStyling")} />
        <Checkbox label="Auto Cut Paper After Printing" checked={state.autoCutPaper} onChange={set("autoCutPaper")} />
        <Checkbox label="Open Cash Drawer After Printing" checked={state.openCashDrawer} onChange={set("openCashDrawer")} />
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
        <Checkbox label="S.No" checked={state.showSNo} onChange={set("showSNo")} />
        <Checkbox label="HSN/SAC Code" checked={state.showHSNCode} onChange={set("showHSNCode")} />
        <Checkbox label="Units of Measurement" checked={state.showUnits} onChange={set("showUnits")} />
        <Checkbox label="MRP" checked={state.showMRP} onChange={set("showMRP")} />
        <Checkbox label="Description" checked={state.showDescription} onChange={set("showDescription")} />
      </div>

      <div>
        <SectionHeading title="Additional Item Details" />
        <Divider />
        <Checkbox label="Batch No." checked={state.showBatchNo} onChange={set("showBatchNo")} />
        <Checkbox label="Exp. Date" checked={state.showExpDate} onChange={set("showExpDate")} />
        <Checkbox label="Mfg. Date" checked={state.showMfgDate} onChange={set("showMfgDate")} />
        <Checkbox label="Size" checked={state.showSize} onChange={set("showSize")} />
        <Checkbox label="Model No." checked={state.showModelNo} onChange={set("showModelNo")} />
        <Checkbox label="Serial No." checked={state.showSerialNo} onChange={set("showSerialNo")} />
      </div>

      <div>
        <SectionHeading title="Totals & Taxes" />
        <Divider />
        <Checkbox label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} />
        <Checkbox label="Amount with Decimal e.g. 0.00" checked={state.amountWithDecimal} onChange={set("amountWithDecimal")} />
        <Checkbox label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} />
        <Checkbox label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} />
        <Checkbox label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} />
        <Checkbox label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} />
        <Checkbox label="You Saved" checked={state.youSaved} onChange={set("youSaved")} />
        <Checkbox label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} />
        <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} />
      </div>

      <div>
        <SectionHeading title="Footer" />
        <Divider />
        <Checkbox label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
        <Checkbox label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
        <Checkbox label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
        <Checkbox label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
        <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
        <Checkbox label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
        <Checkbox label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
      </div>

      <div>
        <SectionHeading title="Vyapar Printer Setup" />
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
    <div className="h-full bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between flex-shrink-0 bg-gradient-to-br from-[#1f8cff] to-[#4338ca]">
          <h2 className="text-[25px] font-bold text-white">Print Settings</h2>
          <button
            type="button"
            onClick={() => setSettingsTab && setSettingsTab("general")}
            title="Close"
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow flex items-center justify-center transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

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
                  <div className="flex gap-4 border-b border-gray-200 mb-6 flex-shrink-0">
                    {[
                      { id: "layout", label: "CHANGE LAYOUT" },
                      { id: "colors", label: "CHANGE COLORS" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => set("mode")(m.id)}
                        className={`px-1 py-2 text-xs font-semibold border-b-2 transition ${
                          state.mode === m.id
                            ? "text-blue-600 border-blue-600"
                            : "text-gray-500 border-transparent hover:text-gray-700"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-6 pb-4">
                    {state.mode === "colors" && (
                      <div>
                        <SectionHeading title="Theme Color" />
                        <Divider />
                        <div className="flex flex-wrap gap-3 py-2">
                          {[
                            { color: "#2563eb", name: "Blue" },
                            { color: "#16a34a", name: "Green" },
                            { color: "#dc2626", name: "Red" },
                            { color: "#d97706", name: "Orange" },
                            { color: "#7c3aed", name: "Purple" },
                            { color: "#0f172a", name: "Dark" },
                            { color: "#ec4899", name: "Pink" },
                            { color: "#14b8a6", name: "Teal" },
                            { color: "#8b5cf6", name: "Violet" },
                            { color: "#f59e0b", name: "Amber" },
                          ].map((c) => (
                            <button
                              key={c.color}
                              type="button"
                              onClick={() => set("themeColor")(c.color)}
                              className={`w-10 h-10 rounded-full border-2 cursor-pointer hover:scale-110 transition-all ${
                                state.themeColor === c.color
                                  ? "border-blue-600 ring-2 ring-blue-300 ring-offset-2"
                                  : "border-gray-200 hover:border-gray-400"
                              }`}
                              style={{ background: c.color }}
                              title={c.name}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Choose a theme color for the printed invoice.</p>
                        
                        <Divider />
                        <div className="mt-2">
                          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div 
                              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: state.themeColor }}
                            >
                              A
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-800">Preview Color</div>
                              <div className="text-xs text-gray-500">Selected color will appear in invoice headers</div>
                            </div>
                          </div>
                        </div>
                      </div>
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
                          <Checkbox label="Make Regular Printer Default" checked={state.regularDefault} onChange={set("regularDefault")} />
                          <Checkbox label="Print repeat header in all pages" checked={state.repeatHeader} onChange={set("repeatHeader")} />
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
                          <Checkbox label="Print Original/Duplicate" checked={state.printOriginalDuplicate} onChange={set("printOriginalDuplicate")} />
                          <NumberSpinner label="Extra space on Top of PDF" value={state.extraSpaceTop} onChange={set("extraSpaceTop")} />
                        </div>

                        {/* Item Table */}
                        <div>
                          <SectionHeading title="Item Table" />
                          <Divider />
                          <Checkbox label="Expand table to print on whole page" checked={state.expandTableWholePage} onChange={set("expandTableWholePage")} />
                          <NumberSpinner label="Min No. of Rows in Item Table" value={state.minRowsItemTable} onChange={set("minRowsItemTable")} />
                        </div>

                        {/* Totals & Taxes */}
                        <div>
                          <SectionHeading title="Totals & Taxes" />
                          <Divider />
                          <Checkbox label="Total Item Quantity" checked={state.totalItemQty} onChange={set("totalItemQty")} />
                          <div className="py-1.5 px-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <input type="checkbox" checked={state.amountWithDecimal} onChange={(e) => set("amountWithDecimal")(e.target.checked)} className="w-5 h-5 cursor-pointer shrink-0 rounded" style={{ accentColor: blue }} />
                                <span className="text-[13.5px] text-gray-700">Amount with Decimal <span className="text-gray-400 ml-1">e.g. 0.00</span></span>
                              </div>
                            </div>
                          </div>
                          <Checkbox label="Received Amount" checked={state.receivedAmount} onChange={set("receivedAmount")} />
                          <Checkbox label="Balance Amount" checked={state.balanceAmount} onChange={set("balanceAmount")} />
                          <Checkbox label="Current Balance of Party" checked={state.currentBalanceParty} onChange={set("currentBalanceParty")} />
                          <Checkbox label="Tax Details" checked={state.taxDetails} onChange={set("taxDetails")} />
                          <Checkbox label="You Saved" checked={state.youSaved} onChange={set("youSaved")} />
                          <Checkbox label="Print Amount with Grouping" checked={state.printAmountGrouping} onChange={set("printAmountGrouping")} />
                          <SelectRow label="Amount in Words" value={state.amountInWords} onChange={set("amountInWords")} options={["Indian", "English", "International"]} />
                        </div>

                        {/* Footer */}
                        <div>
                          <SectionHeading title="Footer" />
                          <Divider />
                          <Checkbox label="Print Description" checked={state.printDescription} onChange={set("printDescription")} />
                          <Checkbox label="Print Terms and Conditions" checked={state.printTerms} onChange={set("printTerms")} />
                          <Checkbox label="Print Received by details" checked={state.printReceivedBy} onChange={set("printReceivedBy")} />
                          <Checkbox label="Print Delivered by details" checked={state.printDeliveredBy} onChange={set("printDeliveredBy")} />
                          <LayerRow label="Print Signature Text" checked={state.printSignatureText} onChange={set("printSignatureText")} input={state.signatureText} onChangeText={set("signatureText")} placeholder="Authorized Signatory" />
                          <Checkbox label="Payment Mode" checked={state.paymentMode} onChange={set("paymentMode")} />
                          <Checkbox label="Print Acknowledgement" checked={state.printAcknowledgement} onChange={set("printAcknowledgement")} />
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
              <div className="max-w-md w-full">
                <InvoicePreview />
                <p className="text-center text-xs text-gray-400 mt-3">Live Preview</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}