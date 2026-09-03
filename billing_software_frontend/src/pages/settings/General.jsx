import { useState } from "react";
import { Crown, Pencil, ChevronDown, Settings, MessageSquareText } from "lucide-react";
import Transaction from "./Transaction";
import Print from "./Print";
import Taxes from "./Taxes";
import Party from "./Party";
import Item from "./Item";
import Accounting from "./Accounting";
import MultiCurrency from "./MultiCurrency";
import ServiceReminders from "./ServiceReminders";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard, CheckRow, Badge, SectionHint, InfoIcon } from "./settingsUI";

const blue = "#2563eb";

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
    <SettingsShell
      title="General"
      subtitle="APPLICATION, FIRM & WORKSPACE"
      icon={<Settings size={22} strokeWidth={2.2} />}
      onClose={undefined}
      contentClassName="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      {/* ── Column 1: Application ── */}
      <SettingsCard title="Application">
        <CheckRow label="Enable Passcode" checked={state.passcode} onChange={set("passcode")} info="Set a passcode to secure access" />

        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13.5px] text-slate-700">
              Business Currency
              <InfoIcon title="Currency used across the app" />
            </span>
          </div>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-[13.5px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option>₹ Indian Rupee (INR)</option>
              <option>$ US Dollar (USD)</option>
              <option>€ Euro (EUR)</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[13.5px] text-slate-700">
              Amount
              <InfoIcon title="Number of decimal places for amounts" />
              <span className="text-xs text-slate-400 font-normal">(upto Decimal Places)</span>
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden w-20">
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, decimalPlaces: Math.max(0, s.decimalPlaces - 1) }))}
                className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 text-sm"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                value={state.decimalPlaces}
                onChange={(e) => setState((s) => ({ ...s, decimalPlaces: parseDecimal(e.target.value) }))}
                className="w-8 text-center text-[13.5px] text-slate-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, decimalPlaces: Math.min(4, s.decimalPlaces + 1) }))}
                className="px-2 py-1.5 text-slate-500 hover:bg-slate-100 text-sm"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-400">e.g. 0.00</span>
          </div>
        </div>

        <CheckRow label="GSTIN Number" checked={state.gstin} onChange={set("gstin")} info="Show GSTIN on invoices" />
        <CheckRow label="Stop Sale on Negative Stock" checked={state.negativeStock} onChange={set("negativeStock")} info="Prevent sales when stock goes negative" />
        <CheckRow label="Block New Items from Txn Form" checked={state.blockNewItems} onChange={set("blockNewItems")} info="Prevent adding new items during transactions" />
        <CheckRow label="Block New Parties from Txn Form" checked={state.blockNewParties} onChange={set("blockNewParties")} info="Prevent adding new parties during transactions" />
      </SettingsCard>

      {/* ── Column 2: Multi Firm ── */}
      <SettingsCard title="Multi Firm" crown={<Crown size={14} className="text-amber-500" />}>
        <div
          className="flex items-center justify-between rounded-xl border-2 p-3 cursor-pointer mt-1"
          style={{ borderColor: state.selectedCompany === "My Company" ? blue : "#e2e8f0", background: state.selectedCompany === "My Company" ? "#f8fbff" : "#fff" }}
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
            <span className="text-[13.5px] text-slate-800">My Company</span>
          </span>
          <span className="flex items-center gap-2">
            <Badge>DEFAULT</Badge>
            <button type="button" className="text-slate-400 hover:text-blue-600" title="Edit">
              <Pencil size={14} />
            </button>
          </span>
        </div>
      </SettingsCard>

      {/* ── Column 3: Backup & History ── */}
      <SettingsCard title="Backup & History">
        <CheckRow label="Auto Backup" checked={state.autoBackup} onChange={set("autoBackup")} info="Automatically backup your data" />
        <div className="flex items-center gap-1.5 py-1 px-2 text-[13px] text-slate-600 bg-slate-50 rounded-lg mt-1">
          <span>Last Backup 27/05/2026 | 11:05 AM</span>
          <InfoIcon title="Most recent backup timestamp" />
        </div>
        <CheckRow label="Audit Trail" checked={state.auditTrail} onChange={set("auditTrail")} info="Record every change with audit log" />
      </SettingsCard>

      {/* ── Row 2: More Transactions ── */}
      <SettingsCard title="More Transactions">
        <CheckRow label="Estimate/Quotation" checked={state.quotation} onChange={set("quotation")} />
        <CheckRow label="Proforma Invoice" checked={state.proforma} onChange={set("proforma")} />
        <CheckRow label="Sale/Purchase Order" checked={state.order} onChange={set("order")} />
        <CheckRow label="Other Income" checked={state.otherIncome} onChange={set("otherIncome")} info="Record non-sale income" />
        <CheckRow label="Fixed Assets (FA)" checked={state.fixedAssets} onChange={set("fixedAssets")} info="Track fixed assets" />
        <CheckRow label="Delivery Challan" checked={state.deliveryChallan} onChange={set("deliveryChallan")} />
        <CheckRow label="Goods return on Delivery Challan" checked={state.challanReturn} onChange={set("challanReturn")} />
        <CheckRow label="Print amount in Delivery Challan" checked={state.challanAmount} onChange={set("challanAmount")} />
      </SettingsCard>

      {/* ── Row 2: Stock Transfer Between Godowns ── */}
      <SettingsCard title="Stock Transfer Between Godowns">
        <SectionHint>
          Manage all your stores/godowns and transfer stock seamlessly between them. Using this feature, you can transfer stock between stores/godowns and manage your inventory more efficiently.
        </SectionHint>
        <CheckRow
          label="Godown management & Stock transfer"
          checked={state.godown}
          onChange={set("godown")}
          info="Enable multiple godowns and stock transfers"
        />
      </SettingsCard>

      {/* ── Row 2: Customize Your View ── */}
      <SettingsCard title="Customize Your View">
        <label className="block text-[13.5px] font-medium text-slate-700 mt-1">
          Choose Your Screen Zoom/Scale
        </label>
        <p className="text-[12.5px] text-slate-500 leading-relaxed my-1.5">
          You can use this setting to resize the Billing screen, making it larger or smaller to fit your preferences.
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

        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
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
      </SettingsCard>
    </SettingsShell>
  );
}

function TransactionMessagesSettings() {
  const { setSettingsTab } = useSettings();
  const [msgs, setMsgs] = useState({
    saleMsg: "",
    paymentMsg: "",
    purchaseMsg: "",
    creditNoteMsg: "",
  });
  const [saving, setSaving] = useState(false);

  const fields = [
    { key: "saleMsg", label: "Sale Invoice Message" },
    { key: "paymentMsg", label: "Payment Received Message" },
    { key: "purchaseMsg", label: "Purchase Message" },
    { key: "creditNoteMsg", label: "Credit Note Message" },
  ];

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      alert("Transaction Messages saved successfully!");
      setSaving(false);
    }, 400);
  };

  return (
    <SettingsShell
      title="Transaction Messages"
      subtitle="WHATSAPP & SMS CONTENT"
      icon={<MessageSquareText size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="max-w-3xl"
    >
      <SettingsCard title="Transaction Messages">
        <p className="text-[13px] text-slate-500 mb-3">Configure WhatsApp / SMS messages sent on transactions.</p>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">{f.label}</label>
              <textarea
                className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                rows={4}
                value={msgs[f.key]}
                onChange={(e) => setMsgs({ ...msgs, [f.key]: e.target.value })}
                placeholder={`Enter ${f.label.toLowerCase()}`}
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-5 px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </SettingsCard>
    </SettingsShell>
  );
}







export default function General() {
  const { settingsTab = "general" } = useSettings();

  return (
    <div className="bg-transparent min-w-0 flex flex-col flex-1">
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
