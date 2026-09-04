import { useState } from "react";
import { ChevronDown, Crown, Lock, Boxes } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell } from "./settingsUI";

const STORAGE_KEY = "item_settings";

const DEFAULT_STATE = {
  enableItem: true,
  sellType: "Product",
  barcodeScan: false,
  stockMaintenance: true,
  manufacturing: false,
  showLowStockDialog: true,
  itemsUnit: true,
  defaultUnit: false,
  itemCategory: true,
  partyWiseItemRate: false,
  description: false,
  itemWiseTax: true,
  itemWiseDiscount: true,
  updateSalePrice: false,
  quantityDecimals: 2,
  wholesalePrice: false,
  mrp: false,
  calcTaxOnMrp: false,
  serialNo: false,
  batchNo: false,
  expDate: false,
  mfgDate: false,
  modelNo: false,
  size: false,
  expDateVal: "",
  mfgDateVal: "",
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
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white cursor-help transition-colors flex-shrink-0 text-[11px] font-bold"
      title={title}
      aria-label={title}
    >
      i
    </span>
  );
}

function CrownIcon() {
  return <Crown size={15} className="text-amber-500 flex-shrink-0" />;
}

function LockedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 font-medium">
      <Lock size={11} />
      Locked
    </span>
  );
}

function ItemCheckbox({ label, checked, onChange, info, extra, sub }) {
  return (
    <div className="py-[8px]">
      <label className="flex items-center cursor-pointer select-none group">
        <span
          className={`relative inline-flex items-center justify-center rounded-md border-2 transition-all cursor-pointer shrink-0 ${
            checked
              ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-600/30"
              : "bg-white border-slate-300 group-hover:border-blue-400"
          }`}
          style={{ width: 23, height: 23 }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {checked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="ml-3 text-[19px] text-slate-800 group-hover:text-slate-950 font-medium">{label}</span>
        {info && (
          <span className="ml-2 flex items-center">
            <InfoIcon title={info} />
          </span>
        )}
        {extra && <span className="ml-2 flex items-center">{extra}</span>}
      </label>
      {sub}
    </div>
  );
}

function ColumnHeading({ title, trailing }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-[25px] font-bold text-slate-900">
          <span className="w-1.5 h-6 rounded-full" style={{ background: "linear-gradient(135deg,#1f8cff,#4338ca)" }} />
          {title}
        </h2>
        {trailing}
      </div>
      <div className="h-px bg-slate-200 my-4" />
    </div>
  );
}

function SectionLabel({ children, info, trailing }) {
  return (
    <div className="flex items-center gap-2 mt-7 mb-2">
      <span className="text-[19px] font-semibold text-blue-950">{children}</span>
      {info && <InfoIcon title={info} />}
      {trailing}
    </div>
  );
}

function TextInput({ placeholder, width = 160 }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      className="bg-white border border-gray-300 rounded-lg px-3 text-[19px] text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500"
      style={{ height: 48, width }}
    />
  );
}

function DateSelect({ value, onChange }) {
  return (
    <div className="relative">
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg pl-2.5 pr-2 text-[15px] text-gray-700 outline-none focus:border-blue-500 cursor-pointer"
        style={{ height: 48, width: 150 }}
      />
    </div>
  );
}

function FieldRow({ checked, onChange, label, input }) {
  return (
    <div className="py-2">
      <label className="flex items-center cursor-pointer select-none group">
        <span
          className={`relative inline-flex items-center justify-center rounded-md border-2 transition-all cursor-pointer shrink-0 ${
            checked
              ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-600/30"
              : "bg-white border-slate-300 group-hover:border-blue-400"
          }`}
          style={{ width: 23, height: 23 }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          {checked && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="ml-3 text-[19px] text-slate-800 group-hover:text-slate-950 font-medium">{label}</span>
      </label>
      {input && <div className="ml-9 mt-1.5">{input}</div>}
    </div>
  );
}

export default function Item() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("item", state, setState);

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
    <SettingsShell
      title="Item"
      subtitle="ITEM MASTERS, BATCH & CUSTOM FIELDS"
      icon={<Boxes size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-10"
    >
      {/* COLUMN 1 - Item Settings */}
      <div className="flex flex-col space-y-[6px]">
        <ColumnHeading title="Item Settings" />

          <ItemCheckbox label="Enable Item" checked={state.enableItem} onChange={set("enableItem")} info="Enable items" />

          <div className="py-2.5">
            <div className="flex items-center">
              <span className="text-[19px] text-gray-800">What do you sell?</span>
              <span className="ml-2 flex items-center">
                <InfoIcon title="What do you sell" />
              </span>
            </div>
            <div className="relative mt-1.5 inline-block">
              <select
                value={state.sellType}
                onChange={(e) => set("sellType")(e.target.value)}
                className="appearance-none border border-gray-300 rounded-lg pl-3 pr-9 text-[19px] text-gray-900 outline-none focus:border-blue-500 cursor-pointer bg-white"
                style={{ height: 44, width: 200 }}
              >
                <option>Product</option>
                <option>Service</option>
              </select>
              <ChevronDown size={18} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <ItemCheckbox label="Barcode Scan" checked={state.barcodeScan} onChange={set("barcodeScan")} info="Barcode scan" />
          <ItemCheckbox label="Stock Maintenance" checked={state.stockMaintenance} onChange={set("stockMaintenance")} info="Stock maintenance" />
          <ItemCheckbox label="Manufacturing" checked={state.manufacturing} onChange={set("manufacturing")} info="Manufacturing" extra={<LockedBadge />} />
          <ItemCheckbox label="Show Low Stock Dialog" checked={state.showLowStockDialog} onChange={set("showLowStockDialog")} info="Show low stock dialog" />
          <ItemCheckbox label="Items Unit" checked={state.itemsUnit} onChange={set("itemsUnit")} info="Items unit" />
          <ItemCheckbox label="Default Unit" checked={state.defaultUnit} onChange={set("defaultUnit")} info="Default unit" />
          <ItemCheckbox label="Item Category" checked={state.itemCategory} onChange={set("itemCategory")} info="Item category" />
          <ItemCheckbox label="Party Wise Item Rate" checked={state.partyWiseItemRate} onChange={set("partyWiseItemRate")} info="Party wise item rate" extra={<CrownIcon />} />
          <ItemCheckbox label="Description" checked={state.description} onChange={set("description")} info="Description" extra={<span className="text-[14px] text-blue-600">Change Text</span>} />
          <ItemCheckbox label="Item wise Tax" checked={state.itemWiseTax} onChange={set("itemWiseTax")} info="Item wise tax" />
          <ItemCheckbox label="Item wise Discount" checked={state.itemWiseDiscount} onChange={set("itemWiseDiscount")} info="Item wise discount" />
          <ItemCheckbox label="Update Sale Price from Transaction" checked={state.updateSalePrice} onChange={set("updateSalePrice")} info="Update sale price from transaction" />

          <div className="py-2.5">
            <div className="flex items-center">
              <span className="text-[19px] text-gray-700">Quantity</span>
              <span className="ml-2 flex items-center">
                <InfoIcon title="Quantity decimal places" />
              </span>
            </div>
            <div className="text-[13px] text-gray-500">(upto Decimal Places)</div>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="number"
                min="0"
                max="4"
                value={state.quantityDecimals}
                onChange={(e) => set("quantityDecimals")(parseInt(e.target.value, 10) || 0)}
                className="w-16 border border-gray-300 rounded-lg px-3 text-center text-[19px] text-gray-900 outline-none focus:border-blue-500"
                style={{ height: 40 }}
              />
              <span className="text-[14px] text-gray-500">e.g. 0.00</span>
            </div>
          </div>

          <ItemCheckbox label="Wholesale Price" checked={state.wholesalePrice} onChange={set("wholesalePrice")} info="Wholesale price" extra={<CrownIcon />} />
        </div>

        {/* COLUMN 2 - Additional Item Fields */}
        <div className="flex flex-col">
          <ColumnHeading title="Additional Item Fields" trailing={<CrownIcon />} />

          <SectionLabel>MRP/Price</SectionLabel>
          <FieldRow checked={state.mrp} onChange={set("mrp")} label="MRP" input={<TextInput placeholder="MRP" />} />
          <div className="py-2">
            <label className="flex items-center cursor-pointer select-none group">
              <input type="checkbox" checked={state.calcTaxOnMrp} onChange={(e) => set("calcTaxOnMrp")(e.target.checked)} className="w-6 h-6 cursor-pointer shrink-0 rounded-[4px]" style={{ accentColor: "#2563eb" }} />
              <span className="ml-3 text-[19px] text-gray-800">Calculate Tax based on MRP</span>
              <span className="ml-2 flex items-center"><InfoIcon title="Calculate tax based on MRP" /></span>
            </label>
          </div>

          <SectionLabel info="Serial No. tracking">Serial No. Tracking</SectionLabel>
          <FieldRow checked={state.serialNo} onChange={set("serialNo")} label="Serial No./ IMEI No. etc" input={<TextInput placeholder="Serial No." />} />

          <SectionLabel info="Batch tracking">Batch Tracking</SectionLabel>
          <FieldRow checked={state.batchNo} onChange={set("batchNo")} label="Batch No." input={<TextInput placeholder="Batch No." />} />
          <FieldRow checked={state.expDate} onChange={set("expDate")} label="Exp Date" input={<div className="flex items-center gap-2"><DateSelect value={state.expDateVal} onChange={set("expDateVal")} /><TextInput placeholder="Exp. Date" /></div>} />
          <FieldRow checked={state.mfgDate} onChange={set("mfgDate")} label="Mfg Date" input={<div className="flex items-center gap-2"><DateSelect value={state.mfgDateVal} onChange={set("mfgDateVal")} /><TextInput placeholder="Mfg. Date" /></div>} />
          <FieldRow checked={state.modelNo} onChange={set("modelNo")} label="Model No." input={<TextInput placeholder="Model No." />} />
          <FieldRow checked={state.size} onChange={set("size")} label="Size" input={<TextInput placeholder="Size" />} />
        </div>

        {/* COLUMN 3 - Item Custom Fields */}
        <div className="flex flex-col">
          <ColumnHeading title="Item Custom Fields" trailing={<><InfoIcon title="Custom fields" /><CrownIcon /></>} />

          <button
            type="button"
            onClick={() => {}}
            className="mt-4 px-6 bg-gray-100 hover:bg-gray-200 text-blue-600 font-semibold text-[19px] rounded-lg flex items-center transition-colors self-start"
            style={{ height: 50 }}
          >
            Add Custom Fields
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

    </SettingsShell>
  );
}
