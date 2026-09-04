import { useState } from "react";
import { ChevronDown, ArrowRightLeft } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell, SettingsCard, CheckRow, InfoIcon } from "./settingsUI";

const blue = "#2563eb";
const STORAGE_KEY = "transaction_settings";

const DEFAULT_STATE = {
  invoiceBillNo: true,
  addTime: false,
  cashSaleDefault: false,
  billingName: false,
  customerPoDetails: false,

  inclusiveTax: true,
  displayPurchasePrice: true,
  showLastSalePrice: false,
  showLastPurchasePrice: false,
  freeItemQty: false,
  count: false,
  countText: "Change Text",

  transactionWiseTax: false,
  transactionWiseDiscount: false,
  roundOffTotal: true,
  roundOffNearest: "1",
  roundOffTo: "1",

  ewayBillNo: false,
  quickEntry: false,
  noInvoicePreview: false,
  repeatInvoices: false,
  enablePasscode: false,
  discountDuringPayments: false,
  linkPayments: false,
  dueDates: false,
  showProfit: false,
  termsAndConditions: true,

  firm: "My Company",

  prefixSale: "None",
  prefixCreditNote: "None",
  prefixSaleOrder: "None",
  prefixPurchaseOrder: "None",
  prefixEstimate: "None",
  prefixProformaInvoice: "None",
  prefixDeliveryChallan: "None",
  prefixPaymentIn: "None",

  billingType: "full",
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

function FloatingSelect({ label, value, onChange, options, disabled }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 pt-5 pb-2 pr-8 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-gray-100 disabled:text-gray-400"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <label className="absolute left-3 top-1 text-[11px] text-gray-500 pointer-events-none">
        {label}
      </label>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function SmallSelect({ value, onChange, options }) {
  return (
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
  );
}

function PrefixField({ label, value, onChange, options }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1 ml-1">{label}</label>
      <SmallSelect value={value} onChange={onChange} options={options} />
    </div>
  );
}

function Radio({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 px-1 rounded cursor-pointer select-none group">
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="w-5 h-5 cursor-pointer shrink-0"
        style={{ accentColor: blue }}
      />
      <span className="text-[14px] text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}

function LightButton({ children }) {
  return (
    <button
      type="button"
      className="px-4 py-2 bg-gray-100 text-gray-700 text-[13px] font-medium rounded-lg hover:bg-gray-200 transition w-full text-left flex items-center justify-between"
    >
      {children}
      <span className="text-gray-500">&gt;</span>
    </button>
  );
}

export default function Transaction() {
  const { setSettingsTab } = useSettings();

  const [state, setState] = useState(loadState);
  useBackendSync("transaction", state, setState);

  const set = (key) => (val) =>
    setState((s) => {
      const next = { ...s, [key]: typeof val === "function" ? val(s[key]) : val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* persist best-effort */
      }
      return next;
    });

  const prefixOptions = ["None", "A", "B", "C", "D", "INV", "SALE", "PUR"];
  const roundOptions = ["1", "5", "10", "50", "100"];

  return (
    <SettingsShell
      title="Transaction"
      subtitle="SALES, PURCHASES & DOCUMENTS"
      icon={<ArrowRightLeft size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-6"
    >
        {/* Column 1 */}
        <div className="min-w-0 space-y-6">
          {/* Transaction Header */}
          <SettingsCard title="Transaction Header">
            <CheckRow
              label="Invoice/Bill No."
              checked={state.invoiceBillNo}
              onChange={set("invoiceBillNo")}
              info="Enable invoice or bill numbering"
            />
            <CheckRow
              label="Add Time on Transactions"
              checked={state.addTime}
              onChange={set("addTime")}
              info="Include timestamp on transactions"
            />
            <CheckRow
              label="Cash Sale by default"
              checked={state.cashSaleDefault}
              onChange={set("cashSaleDefault")}
              info="Default new transactions to cash sale"
            />
            <CheckRow
              label="Billing Name of Parties"
              checked={state.billingName}
              onChange={set("billingName")}
              info="Show billing name for parties"
            />
            <CheckRow
              label="Customers P.O. Details on Transactions"
              checked={state.customerPoDetails}
              onChange={set("customerPoDetails")}
              info="Show purchase order details on transactions"
            />
          </SettingsCard>

          {/* More Transaction Features */}
          <SettingsCard title="More Transaction Features">
            <CheckRow
              label="E-way bill no"
              checked={state.ewayBillNo}
              onChange={set("ewayBillNo")}
              info="Enable e-way bill number field"
            />
            <CheckRow
              label="Quick Entry"
              checked={state.quickEntry}
              onChange={set("quickEntry")}
              info="Enable quick entry mode for transactions"
            />
            <CheckRow
              label="Do not Show Invoice Preview"
              checked={state.noInvoicePreview}
              onChange={set("noInvoicePreview")}
              info="Skip invoice preview before saving"
            />
            <CheckRow
              label="Repeat Invoices"
              checked={state.repeatInvoices}
              onChange={set("repeatInvoices")}
              info="Allow repeating invoice entries"
            />
            <CheckRow
              label="Enable Passcode for transaction edit/delete"
              checked={state.enablePasscode}
              onChange={set("enablePasscode")}
              info="Require passcode to edit or delete transactions"
            />
            <CheckRow
              label="Discount During Payments"
              checked={state.discountDuringPayments}
              onChange={set("discountDuringPayments")}
              info="Allow applying discounts during payment"
            />
            <CheckRow
              label="Link Payments to Invoices"
              checked={state.linkPayments}
              onChange={set("linkPayments")}
              info="Link payments directly to invoices"
            />
            <CheckRow
              label="Due Dates and Payment Terms"
              checked={state.dueDates}
              onChange={set("dueDates")}
              info="Enable due dates and payment terms"
            />
            <CheckRow
              label="Show Profit while making Sale Invoice"
              checked={state.showProfit}
              onChange={set("showProfit")}
              info="Show profit margin on sale invoices"
            />
            <CheckRow
              label="Terms and Conditions"
              checked={state.termsAndConditions}
              onChange={set("termsAndConditions")}
              info="Enable terms and conditions on invoices"
            />
            {state.termsAndConditions && (
              <div className="ml-6 mt-2 space-y-3">
                <span className="text-[13.5px] text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
                  Set Terms and Conditions
                </span>
                <div className="space-y-2.5 max-w-[240px]">
                  <LightButton>Additional Fields</LightButton>
                  <LightButton>Transportation Details</LightButton>
                  <LightButton>Additional Charges</LightButton>
                </div>
              </div>
            )}
          </SettingsCard>
        </div>

        {/* Column 2 */}
        <div className="min-w-0 space-y-6">
          {/* Items Table */}
          <SettingsCard title="Items Table">
            <CheckRow
              label="Inclusive/Exclusive Tax on Rate(Price/Unit)"
              checked={state.inclusiveTax}
              onChange={set("inclusiveTax")}
              info="Toggle tax inclusion on item rates"
            />
            <CheckRow
              label="Display Purchase Price of Items"
              checked={state.displayPurchasePrice}
              onChange={set("displayPurchasePrice")}
              info="Show purchase price in item list"
            />
            <CheckRow
              label="Show last 5 Sale Price of Items"
              checked={state.showLastSalePrice}
              onChange={set("showLastSalePrice")}
              info="Display last 5 sale prices for items"
            />
            <CheckRow
              label="Show last 5 Purchase Price of Items"
              checked={state.showLastPurchasePrice}
              onChange={set("showLastPurchasePrice")}
              info="Display last 5 purchase prices for items"
            />
            <CheckRow
              label="Free Item Quantity"
              checked={state.freeItemQty}
              onChange={set("freeItemQty")}
              info="Allow free item quantity entries"
            />
            <div className="flex items-center justify-between py-2 px-1 rounded group">
              <span className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={state.count}
                  onChange={(e) => set("count")(e.target.checked)}
                  className="w-5 h-5 cursor-pointer shrink-0 rounded"
                  style={{ accentColor: blue }}
                />
                <span className="text-[13.5px] text-gray-700">Count</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt("Enter count label:", state.countText);
                    if (next) set("countText")(next);
                  }}
                  className="text-[12px] text-blue-600 hover:text-blue-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded cursor-pointer transition-colors"
                >
                  {state.countText}
                </button>
                <InfoIcon title="Customize count label text" />
              </div>
            </div>
          </SettingsCard>

          {/* Transaction Prefixes */}
          <SettingsCard title="Transaction Prefixes">
            <div className="mb-4">
              <FloatingSelect
                label="Firm"
                value={state.firm}
                onChange={set("firm")}
                options={["My Company"]}
              />
            </div>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <PrefixField
                  label="Sale"
                  value={state.prefixSale}
                  onChange={set("prefixSale")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Credit Note"
                  value={state.prefixCreditNote}
                  onChange={set("prefixCreditNote")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Sale Order"
                  value={state.prefixSaleOrder}
                  onChange={set("prefixSaleOrder")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Purchase Order"
                  value={state.prefixPurchaseOrder}
                  onChange={set("prefixPurchaseOrder")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Estimate"
                  value={state.prefixEstimate}
                  onChange={set("prefixEstimate")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Proforma Invoice"
                  value={state.prefixProformaInvoice}
                  onChange={set("prefixProformaInvoice")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Delivery Challan"
                  value={state.prefixDeliveryChallan}
                  onChange={set("prefixDeliveryChallan")}
                  options={prefixOptions}
                />
                <PrefixField
                  label="Payment In"
                  value={state.prefixPaymentIn}
                  onChange={set("prefixPaymentIn")}
                  options={prefixOptions}
                />
              </div>
            </div>
          </SettingsCard>
        </div>

        {/* Column 3 */}
        <div className="min-w-0 space-y-6">
          {/* Taxes, Discount & Totals */}
          <SettingsCard title="Taxes, Discount & Totals">
            <CheckRow
              label="Transaction wise Tax"
              checked={state.transactionWiseTax}
              onChange={set("transactionWiseTax")}
              info="Apply tax at transaction level"
            />
            <CheckRow
              label="Transaction wise Discount"
              checked={state.transactionWiseDiscount}
              onChange={set("transactionWiseDiscount")}
              info="Apply discount at transaction level"
            />
            <CheckRow
              label="Round Off Total"
              checked={state.roundOffTotal}
              onChange={set("roundOffTotal")}
              info="Round off the total amount"
            />
            {state.roundOffTotal && (
              <div className="flex items-center gap-2 ml-6 mt-2">
                <span className="text-[13px] text-gray-600 whitespace-nowrap">Nearest</span>
                <div className="w-20">
                  <SmallSelect
                    value={state.roundOffNearest}
                    onChange={set("roundOffNearest")}
                    options={roundOptions}
                  />
                </div>
                <span className="text-[13px] text-gray-600 whitespace-nowrap">To</span>
                <div className="w-20">
                  <SmallSelect
                    value={state.roundOffTo}
                    onChange={set("roundOffTo")}
                    options={roundOptions}
                  />
                </div>
              </div>
            )}
          </SettingsCard>

          {/* Billing Type */}
          <SettingsCard title="Billing Type">
            <Radio
              label="Lite Sale"
              checked={state.billingType === "lite"}
              onChange={() => set("billingType")("lite")}
            />
            <Radio
              label="Full Sale"
              checked={state.billingType === "full"}
              onChange={() => set("billingType")("full")}
            />
          </SettingsCard>
        </div>
      </SettingsShell>
  );
}
