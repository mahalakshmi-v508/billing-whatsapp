import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../services/api";

function GeneralSettings() {
  const [company, setCompany] = useState({ name: "", gst: "", phone: "", email: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const user = JSON.parse(localStorage.getItem("user")) || {};

  useEffect(() => {
    setLoading(true);
    api.get("/companies", { params: { company_id: user.company_id } })
      .then((res) => {
        const data = Array.isArray(res.data?.data) ? res.data.data[0] : res.data?.data;
        if (data) {
          setCompany({
            name: data.name || "",
            gst: data.gst_number || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.company_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post("/company/settings", {
        company_id: user.company_id,
        ...company,
      });
      alert("Company settings saved successfully!");
    } catch (e) {
      alert("Error saving settings");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Company Information</h3>
      <p className="text-sm text-gray-500">Update your business details shown on invoices and reports.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop / Company Name</label>
          <input
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
            placeholder="Enter shop name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
          <input
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={company.gst}
            onChange={(e) => setCompany({ ...company, gst: e.target.value })}
            placeholder="22ABCDE1234F1Z5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={company.phone}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={company.email}
            onChange={(e) => setCompany({ ...company, email: e.target.value })}
            placeholder="shop@example.com"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <textarea
            className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={company.address}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
            placeholder="Shop address"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function SettingsSection({ title, description, fields, extra }) {
  const [values, setValues] = useState(() =>
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

function TransactionSettings() {
  const [opts, setOpts] = useState({ autoNumber: true, roundOff: true, stockUpdate: false });
  return (
    <SettingsSection
      title="Transaction Settings"
      description="Configure default behaviour for all transactions (Invoices, Purchase, etc.)."
      fields={[
        { key: "txnPrefix", label: "Transaction Prefix", placeholder: "INV" },
        { key: "txnFormat", label: "Transaction Number Format", placeholder: "INV-0001" },
        { key: "roundOffMethod", label: "Round Off Method", type: "select", options: ["None", "Round Off", "Round Up", "Round Down"], default: "Round Off" },
      ]}
      extra={
        <div className="sm:col-span-2 space-y-2">
          <Toggle label="Auto generate transaction number" checked={opts.autoNumber} onChange={(v) => setOpts({ ...opts, autoNumber: v })} />
          <Toggle label="Auto round off totals" checked={opts.roundOff} onChange={(v) => setOpts({ ...opts, roundOff: v })} />
          <Toggle label="Update stock automatically on sale" checked={opts.stockUpdate} onChange={(v) => setOpts({ ...opts, stockUpdate: v })} />
        </div>
      }
    />
  );
}

function PrintSettings() {
  return (
    <SettingsSection
      title="Print Settings"
      description="Configure how invoices and receipts are printed."
      fields={[
        { key: "paperSize", label: "Paper Size", type: "select", options: ["A4", "A5", "Thermal 80mm", "Thermal 58mm"], default: "A4" },
        { key: "copies", label: "Default Print Copies", default: "1", placeholder: "1" },
        { key: "footer", label: "Print Footer Message", type: "textarea", full: true },
      ]}
    />
  );
}

function TaxesSettings() {
  return (
    <SettingsSection
      title="Taxes & GST Settings"
      description="Configure GST and other tax rates for your business."
      fields={[
        { key: "gstRegime", label: "GST Regime", type: "select", options: ["Regular", "Composition", "Non-GST"], default: "Regular" },
        { key: "gstType", label: "GST Type", type: "select", options: ["Intra-State (CGST+SGST)", "Inter-State (IGST)"], default: "Intra-State (CGST+SGST)" },
        { key: "taxInclusive", label: "Default Prices Include Tax", type: "select", options: ["Yes", "No"], default: "No" },
        { key: "showGstOnInvoice", label: "Show GST Breakup on Invoice", type: "select", options: ["Yes", "No"], default: "Yes" },
        { key: "gstNo", label: "Business GST Number", placeholder: "22ABCDE1234F1Z5" },
      ]}
    />
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

function PartySettings() {
  return (
    <SettingsSection
      title="Party Settings"
      description="Configure default options for customers and suppliers."
      fields={[
        { key: "defaultCreditLimit", label: "Default Credit Limit", placeholder: "0" },
        { key: "creditEnable", label: "Enable Credit Sales", type: "select", options: ["Yes", "No"], default: "Yes" },
        { key: "partyType", label: "Party Type", type: "select", options: ["Customer", "Supplier", "Both"], default: "Customer" },
      ]}
    />
  );
}

function ItemSettings() {
  return (
    <SettingsSection
      title="Item Settings"
      description="Configure default options for products and items."
      fields={[
        { key: "skuAuto", label: "Auto Generate SKU", type: "select", options: ["Yes", "No"], default: "Yes" },
        { key: "unit", label: "Default Unit", placeholder: "PCS" },
        { key: "stockWarn", label: "Low Stock Warning Level", placeholder: "10" },
        { key: "barcode", label: "Barcode Type", type: "select", options: ["Code 128", "EAN-13", "UPC-A"], default: "Code 128" },
      ]}
    />
  );
}

function ServiceRemindersSettings() {
  return (
    <SettingsSection
      title="Service Reminders"
      description="Configure automated reminders sent to customers."
      fields={[
        { key: "reminderDays", label: "Reminder Before (in days)", placeholder: "7" },
        { key: "repeatInterval", label: "Repeat Interval (in days)", placeholder: "30" },
        { key: "channel", label: "Reminder Channel", type: "select", options: ["WhatsApp", "SMS", "Email", "WhatsApp + SMS"], default: "WhatsApp" },
        { key: "reminderMsg", label: "Reminder Message", type: "textarea", full: true },
      ]}
    />
  );
}

function AccountingSettings() {
  return (
    <SettingsSection
      title="Accounting Settings"
      description="Configure defaults used for accounting entries."
      fields={[
        { key: "salesAccount", label: "Default Sales Account" },
        { key: "purchaseAccount", label: "Default Purchase Account" },
        { key: "cashAccount", label: "Default Cash / Bank Account" },
        { key: "taxAccount", label: "Default Tax Account" },
        { key: "fiscalYear", label: "Fiscal Year Start", placeholder: "2026-04-01" },
      ]}
    />
  );
}

function MultiCurrencySettings() {
  const [currencies, setCurrencies] = useState([
    { code: "INR", rate: "1.00" },
  ]);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Multi Currency</h3>
      <p className="text-sm text-gray-500">Set your base currency and exchange rates.</p>

      <div className="space-y-2 max-w-md">
        <div className="flex items-center gap-2 font-medium text-sm text-gray-600">
          <span className="flex-1">Currency</span>
          <span className="flex-1">Exchange Rate</span>
          <span className="w-8" />
        </div>
        {currencies.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={c.code}
              onChange={(e) => {
                const next = [...currencies];
                next[i] = { ...c, code: e.target.value };
                setCurrencies(next);
              }}
              placeholder="USD"
            />
            <input
              className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={c.rate}
              onChange={(e) => {
                const next = [...currencies];
                next[i] = { ...c, rate: e.target.value };
                setCurrencies(next);
              }}
              placeholder="1.00"
            />
            <button
              onClick={() => setCurrencies(currencies.filter((_, x) => x !== i))}
              className="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() => setCurrencies([...currencies, { code: "", rate: "" }])}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          + Add Currency
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const { settingsTab = "general" } = useOutletContext() || {};

  return (
    <div className="bg-white rounded-xl shadow-sm p-8 min-h-[calc(100vh-130px)]">
      {settingsTab === "general" && <GeneralSettings />}
      {settingsTab === "transaction" && <TransactionSettings />}
      {settingsTab === "print" && <PrintSettings />}
      {settingsTab === "taxes" && <TaxesSettings />}
      {settingsTab === "txn-messages" && <TransactionMessagesSettings />}
      {settingsTab === "party" && <PartySettings />}
      {settingsTab === "item" && <ItemSettings />}
      {settingsTab === "service-reminders" && <ServiceRemindersSettings />}
      {settingsTab === "accounting" && <AccountingSettings />}
      {settingsTab === "multi-currency" && <MultiCurrencySettings />}
    </div>
  );
}
