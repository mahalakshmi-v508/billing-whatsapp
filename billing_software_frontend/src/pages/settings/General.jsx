import { useEffect, useState } from "react";
import api from "../../services/api";
import { Info, Crown, Pencil, ChevronDown } from "lucide-react";
import Transaction from "./Transaction";
import Print from "./Print";
import Taxes from "./Taxes";
import Party from "./Party";
import Item from "./Item";
import Accounting from "./Accounting";
import MultiCurrency from "./MultiCurrency";
import ServiceReminders from "./ServiceReminders";
import { useSettings } from "./SettingsContext";

const blue = "#2563eb";

function InfoIcon({ title }) {
  return (
    <span className="inline-flex items-center text-gray-300 hover:text-blue-500 cursor-help transition-colors">
      <Info size={14} aria-label={title} />
    </span>
  );
}

function Checkbox({ label, checked, onChange, info }) {
  return (
    <label className="flex items-center justify-between py-1.5 px-1 rounded cursor-pointer select-none group">
      <span className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 cursor-pointer shrink-0"
          style={{ accentColor: blue }}
        />
        <span className="text-[13.5px] text-gray-700 group-hover:text-gray-900">{label}</span>
      </span>
      {info && <InfoIcon title={info} />}
    </label>
  );
}

function SectionHeading({ title, badge, crown }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h4 className="text-[18px] font-bold text-gray-800 flex items-center gap-1.5">
        {title}
        {crown && <Crown size={14} className="text-amber-500" />}
      </h4>
      {badge}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-200 my-2" />;
}

function GeneralSettings() {
  const [state, setState] = useState({
    passcode: false,
    gstin: true,
    negativeStock: false,
    blockNewItems: false,
    blockNewParties: false,
    decimalPlaces: 2,
    autoBackup: false,
    auditTrail: true,
    quotation: true,
    proforma: true,
    order: true,
    otherIncome: false,
    fixedAssets: false,
    deliveryChallan: true,
    challanReturn: true,
    challanAmount: false,
    godown: false,
    selectedCompany: "My Company",
  });
  const set = (key) => (val) => setState((s) => ({ ...s, [key]: typeof val === "function" ? val(s[key]) : val }));

  const [currency, setCurrency] = useState("₹ Indian Rupee (INR)");

  const scaleValues = [70, 80, 90, 100, 110, 115, 120, 130];
  const [zoom, setZoom] = useState(100);

  const parseDecimal = (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n)) return 2;
    return Math.min(4, Math.max(0, n));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden min-h-[560px]">
      <div className="bg-gradient-to-br from-[#1f8cff] to-[#4338ca] px-8 py-7">
        <h2 className="text-[25px] font-bold text-white">General</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-8 min-w-0 px-8 py-7">
      {/* ── Column 1: Application ── */}
      <div className="min-w-0">
        <SectionHeading title="Application" />
        <Divider />

        <Checkbox
          label="Enable Passcode"
          checked={state.passcode}
          onChange={set("passcode")}
          info="Set a passcode to secure access"
        />

        <div className="py-1.5 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[13.5px] text-gray-700">
              Business Currency
              <InfoIcon title="Currency used across the app" />
            </span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-md text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option>₹ Indian Rupee (INR)</option>
              <option>$ US Dollar (USD)</option>
              <option>€ Euro (EUR)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="py-1.5 px-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[13.5px] text-gray-700">
              Amount
              <InfoIcon title="Number of decimal places for amounts" />
              <span className="text-xs text-gray-400 font-normal">(upto Decimal Places)</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden w-20">
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, decimalPlaces: Math.max(0, s.decimalPlaces - 1) }))}
                className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={state.decimalPlaces}
                onChange={(e) => setState((s) => ({ ...s, decimalPlaces: parseDecimal(e.target.value) }))}
                className="w-8 text-center text-[13.5px] text-gray-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, decimalPlaces: Math.min(4, s.decimalPlaces + 1) }))}
                className="px-2 py-1.5 text-gray-500 hover:bg-gray-100 text-sm"
              >
                +
              </button>
            </div>
            <span className="text-xs text-gray-400">e.g. 0.00</span>
          </div>
        </div>

        <Checkbox label="GSTIN Number" checked={state.gstin} onChange={set("gstin")} info="Show GSTIN on invoices" />
        <Checkbox label="Stop Sale on Negative Stock" checked={state.negativeStock} onChange={set("negativeStock")} info="Prevent sales when stock goes negative" />
        <Checkbox label="Block New Items from Txn Form" checked={state.blockNewItems} onChange={set("blockNewItems")} info="Prevent adding new items during transactions" />
        <Checkbox label="Block New Parties from Txn Form" checked={state.blockNewParties} onChange={set("blockNewParties")} info="Prevent adding new parties during transactions" />
      </div>

      {/* ── Column 2: Multi Firm ── */}
      <div className="min-w-0">
        <SectionHeading title="Multi Firm" crown />
        <Divider />

        <div
          className="flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer mt-1"
          style={{ borderColor: state.selectedCompany === "My Company" ? blue : "#e5e7eb", background: state.selectedCompany === "My Company" ? "#f8fbff" : "#fff" }}
          onClick={() => setState((s) => ({ ...s, selectedCompany: "My Company" }))}
        >
          <span className="flex items-center gap-2.5">
            <input
              type="radio"
              checked={state.selectedCompany === "My Company"}
              onChange={() => {}}
              className="cursor-pointer"
              style={{ accentColor: blue }}
            />
            <span className="text-[13.5px] text-gray-800">My Company</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">DEFAULT</span>
            <button type="button" className="text-gray-400 hover:text-blue-600" title="Edit">
              <Pencil size={14} />
            </button>
          </span>
        </div>
      </div>

      {/* ── Column 3: Backup & History ── */}
      <div className="min-w-0">
        <SectionHeading title="Backup & History" />
        <Divider />

        <Checkbox label="Auto Backup" checked={state.autoBackup} onChange={set("autoBackup")} info="Automatically backup your data" />
        <div className="flex items-center gap-1.5 py-1 px-1 text-[13px] text-gray-600">
          <span>Last Backup 27/05/2026 | 11:05 AM</span>
          <InfoIcon title="Most recent backup timestamp" />
        </div>
        <Checkbox label="Audit Trail" checked={state.auditTrail} onChange={set("auditTrail")} info="Record every change with audit log" />
      </div>

      {/* ── Column 1 (Row 2): More Transactions ── */}
      <div className="min-w-0">
        <SectionHeading title="More Transactions" />
        <Divider />
        <Checkbox label="Estimate/Quotation" checked={state.quotation} onChange={set("quotation")} />
        <Checkbox label="Proforma Invoice" checked={state.proforma} onChange={set("proforma")} />
        <Checkbox label="Sale/Purchase Order" checked={state.order} onChange={set("order")} />
        <Checkbox label="Other Income" checked={state.otherIncome} onChange={set("otherIncome")} info="Record non-sale income" />
        <Checkbox label="Fixed Assets (FA)" checked={state.fixedAssets} onChange={set("fixedAssets")} info="Track fixed assets" />
        <Checkbox label="Delivery Challan" checked={state.deliveryChallan} onChange={set("deliveryChallan")} />
        <Checkbox label="Goods return on Delivery Challan" checked={state.challanReturn} onChange={set("challanReturn")} />
        <Checkbox label="Print amount in Delivery Challan" checked={state.challanAmount} onChange={set("challanAmount")} />
      </div>

      {/* ── Column 2 (Row 2): Stock Transfer Between Godowns ── */}
      <div className="min-w-0">
        <SectionHeading title="Stock Transfer Between Godowns" />
        <Divider />
        <p className="text-[12.5px] text-gray-500 leading-relaxed my-2">
          Manage all your stores/godowns and transfer stock seamlessly between them. Using this feature, you can transfer stock between stores/godowns and manage your inventory more efficiently.
        </p>
        <Checkbox
          label="Godown management & Stock transfer"
          checked={state.godown}
          onChange={set("godown")}
          info="Enable multiple godowns and stock transfers"
        />
      </div>

      {/* ── Column 3 (Row 2): Customize Your View ── */}
      <div className="min-w-0">
        <SectionHeading title="Customize Your View" />
        <Divider />
        <label className="block text-[13.5px] font-medium text-gray-700 mt-1">
          Choose Your Screen Zoom/Scale
        </label>
        <p className="text-[12.5px] text-gray-500 leading-relaxed my-1.5">
          You can use this setting to resize the Vyapar screen, making it larger or smaller to fit your preferences.
        </p>

        <input
          type="range"
          min={70}
          max={130}
          step={1}
          value={zoom}
          onChange={(e) => {
            const raw = parseInt(e.target.value, 10);
            const nearest = scaleValues.reduce((best, v) =>
              Math.abs(v - raw) < Math.abs(best - raw) ? v : best
            );
            setZoom(nearest);
          }}
          className="w-full my-2 accent-blue-600 cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-gray-500 mt-1">
          {scaleValues.map((v) => (
            <span key={v} className={v === zoom ? "font-bold text-blue-600" : ""}>{v}%</span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => alert(`Screen zoom set to ${zoom}%`)}
          className="mt-4 px-5 py-1.5 bg-blue-600 text-white text-[13px] font-medium rounded-full hover:bg-blue-700 transition ml-auto block"
        >
          Apply
        </button>
      </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, description, fields, extra }) {  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, f.default || ""]))
  );
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      alert(title + " saved successfully!");
      setSaving(false);
    }, 400);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={f.rows || 3}
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder || ""}
              />
            ) : f.type === "select" ? (
              <select
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                {(f.options || []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={values[f.key] || ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                placeholder={f.placeholder || ""}
              />
            )}
          </div>
        ))}
        {extra}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative ${checked ? "bg-indigo-600" : "bg-gray-300"}`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}


function TransactionMessagesSettings() {
  return (
    <SettingsSection
      title="Transaction Messages"
      description="Configure WhatsApp / SMS messages sent on transactions."
      fields={[
        { key: "saleMsg", label: "Sale Invoice Message", type: "textarea", full: true },
        { key: "paymentMsg", label: "Payment Received Message", type: "textarea", full: true },
        { key: "purchaseMsg", label: "Purchase Message", type: "textarea", full: true },
        { key: "creditNoteMsg", label: "Credit Note Message", type: "textarea", full: true },
      ]}
    />
  );
}







export default function General() {
  const { settingsTab = "general" } = useSettings();

  return (
    <div className="bg-transparent h-full p-6 min-w-0">
      {settingsTab === "general" && <GeneralSettings />}
      {settingsTab === "transaction" && <Transaction />}
      {settingsTab === "print" && <Print />}
      {settingsTab === "taxes" && <Taxes />}
      {settingsTab === "txn-messages" && <TransactionMessagesSettings />}
      {settingsTab === "party" && <Party />}
      {settingsTab === "item" && <Item />}
      {settingsTab === "service-reminders" && <ServiceReminders />}
      {settingsTab === "accounting" && <Accounting />}
      {settingsTab === "multi-currency" && <MultiCurrency />}
    </div>
  );
}
