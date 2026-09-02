import { useState } from "react";
import { Pencil, Trash2, Plus, X, ChevronDown } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";

const STORAGE_KEY = "tax_settings";

const DEFAULT_STATE = {
  enableGST: true,
  enableHSN: true,
  additionalCess: false,
  reverseCharge: false,
  enablePlaceOfSupply: true,
  compositeScheme: false,
  enableTCS: false,
  enableTDS: false,
};

const toTax = (name, rate) => ({ name, rate, type: name.slice(0, name.indexOf("@")) });

const TAX_RATES = [
  toTax("IGST@0%", 0),
  toTax("SGST@0%", 0),
  toTax("CGST@0%", 0),
  toTax("IGST@0.25%", 0.25),
  toTax("SGST@0.125%", 0.125),
  toTax("CGST@0.125%", 0.125),
  toTax("IGST@3%", 3),
  toTax("SGST@1.5%", 1.5),
  toTax("CGST@1.5%", 1.5),
  toTax("IGST@5%", 5),
  toTax("SGST@2.5%", 2.5),
  toTax("CGST@2.5%", 2.5),
  toTax("IGST@12%", 12),
  toTax("SGST@6%", 6),
  toTax("CGST@6%", 6),
  toTax("IGST@18%", 18),
  toTax("SGST@9%", 9),
  toTax("CGST@9%", 9),
  toTax("IGST@28%", 28),
  toTax("SGST@14%", 14),
  toTax("CGST@14%", 14),
];

const TAX_GROUPS = [
  { name: "GST@0%", sub: ["SGST@0%", "CGST@0%"] },
  { name: "GST@0.25%", sub: ["SGST@0.125%", "CGST@0.125%"] },
  { name: "GST@3%", sub: ["SGST@1.5%", "CGST@1.5%"] },
  { name: "GST@5%", sub: ["SGST@2.5%", "CGST@2.5%"] },
  { name: "GST@12%", sub: ["SGST@6%", "CGST@6%"] },
  { name: "GST@18%", sub: ["SGST@9%", "CGST@9%"] },
  { name: "GST@28%", sub: ["SGST@14%", "CGST@14%"] },
  { name: "GST@40%", sub: [] },
];

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

function BlueDotIcon() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 flex-shrink-0"
      title="Premium"
      aria-label="Premium"
    />
  );
}

function RedIcon() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 flex-shrink-0"
      title="Restricted"
      aria-label="Restricted"
    />
  );
}

function GstCheckbox({ label, checked, onChange, info, extra }) {
  return (
    <label className="flex items-center cursor-pointer select-none group py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-[22px] h-[22px] cursor-pointer shrink-0 rounded-[4px]"
        style={{ accentColor: "#2563eb" }}
      />
      <span className="ml-3 text-[21px] text-gray-800 group-hover:text-gray-950">{label}</span>
      {info && (
        <span className="ml-2.5 flex items-center">
          <InfoIcon title={info} />
        </span>
      )}
      {extra && <span className="ml-2.5 flex items-center gap-1.5">{extra}</span>}
    </label>
  );
}

function GstSettingsColumn({ state, set, onTaxList }) {
  return (
    <div className="flex flex-col">
      <h2 className="text-[25px] font-bold text-gray-900">GST Settings</h2>
      <div className="h-px bg-gray-200 my-4" />

      <div className="space-y-0.5">
        <GstCheckbox label="Enable GST" checked={state.enableGST} onChange={set("enableGST")} info="Turn on GST for your business" />
        <GstCheckbox label="Enable HSN/SAC Code" checked={state.enableHSN} onChange={set("enableHSN")} info="Enable HSN/SAC codes on items" />
        <GstCheckbox label="Additional Cess On Item" checked={state.additionalCess} onChange={set("additionalCess")} info="Apply additional cess on items" />
        <GstCheckbox label="Reverse Charge" checked={state.reverseCharge} onChange={set("reverseCharge")} info="Enable reverse charge transactions" />
        <GstCheckbox label="Enable Place of Supply" checked={state.enablePlaceOfSupply} onChange={set("enablePlaceOfSupply")} info="Capture place of supply on invoices" />
        <GstCheckbox label="Composite Scheme" checked={state.compositeScheme} onChange={set("compositeScheme")} info="Enable composite scheme for GST" />
        <GstCheckbox label="Enable TCS" checked={state.enableTCS} onChange={set("enableTCS")} info="Enable Tax Collected at Source" extra={<BlueDotIcon />} />
        <GstCheckbox label="Enable TDS" checked={state.enableTDS} onChange={set("enableTDS")} info="Enable Tax Deducted at Source" extra={<><RedIcon /><BlueDotIcon /></>} />
      </div>

      <button
        type="button"
        onClick={onTaxList}
        className="mt-8 px-5 py-3 bg-gray-100 hover:bg-gray-200 text-blue-600 font-semibold text-[18px] rounded-lg flex items-center transition-colors self-start"
      >
        Tax List
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}

function ColumnHeader({ title, onAdd }) {
  return (
    <div className="flex items-center justify-between pr-2">
      <h3 className="text-[23px] font-bold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={onAdd}
        className="w-8 h-8 rounded-full border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-500 flex items-center justify-center transition-colors"
        title={`Add ${title}`}
      >
        <Plus size={18} strokeWidth={2} />
      </button>
    </div>
  );
}

function TaxRatesColumn({ rates, onEdit }) {
  return (
    <div className="flex flex-col min-h-0">
      <ColumnHeader title="Tax Rates" onAdd={() => {}} />
      <div className="h-px bg-gray-200 my-4" />
      <div className="overflow-y-auto pr-1 space-y-0 max-h-[380px]">
        {rates.map(({ name, rate, type }, i) => (
          <div key={i} className="border-b border-gray-100 last:border-0 py-2 flex items-center justify-between">
            <span className="text-[18px] text-gray-800">{name}</span>
            <span className="text-[18px] text-gray-800 w-12 text-right">{rate}</span>
            <span className="flex items-center gap-2 ml-3">
              <button type="button" className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit" onClick={() => onEdit({ name, rate, type }, i)}>
                <Pencil size={16} strokeWidth={2} />
              </button>
              <button type="button" className="text-gray-400 hover:text-red-600 transition-colors" title="Delete" onClick={() => {}}>
                <Trash2 size={16} strokeWidth={2} />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxGroupColumn({ groups, onEdit }) {
  return (
    <div className="flex flex-col min-h-0">
      <ColumnHeader title="Tax Group" onAdd={() => {}} />
      <div className="h-px bg-gray-200 my-4" />
      <div className="overflow-y-auto pr-1 space-y-0 max-h-[380px]">
        {groups.map((g, i) => (
          <div key={i} className="border-b border-gray-100 last:border-0 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[18px] font-medium text-gray-900">{g.name}</span>
              <span className="flex items-center gap-2">
                <button type="button" className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit" onClick={() => onEdit(g, i)}>
                  <Pencil size={16} strokeWidth={2} />
                </button>
                <button type="button" className="text-gray-400 hover:text-red-600 transition-colors" title="Delete" onClick={() => {}}>
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </span>
            </div>
            {g.sub.length > 0 && (
              <div className="mt-1 flex gap-6 pl-1">
                {g.sub.map((s) => (
                  <span key={s} className="text-[14px] text-blue-600">{s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FloatingInput({ label, value, onChange, type = "text" }) {
  return (
    <div className="relative w-full">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=" "
        className="peer w-full border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-[21px] text-gray-900 outline-none transition-colors focus:border-blue-500"
      />
      <label className="absolute left-3 top-1 text-[11px] text-gray-500 pointer-events-none transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[18px] peer-focus:top-1 peer-focus:text-[11px] peer-focus:text-blue-600">
        {label}
      </label>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="peer w-full appearance-none border border-gray-300 rounded-lg px-3 pt-5 pb-2 text-[21px] text-gray-900 outline-none transition-colors focus:border-blue-500 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <label className="absolute left-3 top-1 text-[11px] text-gray-500 pointer-events-none">
        {label}
      </label>
      <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function EditTaxRateModal({ rate, onClose, onSave }) {
  const [name, setName] = useState(rate.name);
  const [rateValue, setRateValue] = useState(String(rate.rate));
  const [type, setType] = useState(rate.type);

  const handleSave = () => {
    const base = {
      name: name || rate.name,
      type,
    };
    const parsed = parseFloat(rateValue);
    base.rate = Number.isFinite(parsed) ? parsed : rate.rate;
    onSave(base);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-[425px] p-6 shadow-lg">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-[23px] font-bold text-gray-900">Edit Tax Rate</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 text-white flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-4">
          <FloatingInput label="Tax Name" value={name} onChange={setName} />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <FloatingInput label="Rate" value={rateValue} onChange={setRateValue} type="number" />
          <SelectField label="Tax Type" value={type} onChange={setType} options={["IGST", "SGST", "CGST"]} />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] px-7 py-2.5 rounded-lg transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] px-7 py-2.5 rounded-lg transition-colors"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTaxGroupModal({ group, rates, onClose, onSave }) {
  const [name, setName] = useState(group.name);
  const [selected, setSelected] = useState(() => {
    const set = new Set(group.sub || []);
    return new Set(set);
  });

  const toggle = (taxName) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(taxName)) next.delete(taxName);
      else next.add(taxName);
      return next;
    });

  const handleSave = () => {
    const groupName = name.trim() || group.name;
    const sub = rates.filter((r) => selected.has(r.name)).map((r) => r.name);
    onSave({ name: groupName, sub });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl w-full max-w-[425px] p-6 shadow-lg flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between mb-5">
          <h3 className="text-[23px] font-bold text-gray-900">Edit Tax Group</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 text-white flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="mb-4">
          <FloatingInput label="Enter Group Name" value={name} onChange={setName} />
        </div>

        <div className="mb-2">
          <span className="text-[21px] font-bold text-gray-800">Select Taxes</span>
        </div>

        <div className="overflow-y-auto pr-1 border-y border-gray-100 -mx-6 px-6 max-h-[40vh]">
          {rates.map((r) => (
            <label key={r.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer select-none">
              <span className="text-[18px] text-gray-800">{r.name}</span>
              <span className="flex items-center gap-3">
                <span className="text-[14px] text-gray-500">{r.rate}%</span>
                <input
                  type="checkbox"
                  checked={selected.has(r.name)}
                  onChange={() => toggle(r.name)}
                  className="w-[22px] h-[22px] cursor-pointer shrink-0 rounded-[4px]"
                  style={{ accentColor: "#10b981" }}
                />
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-5 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] w-[105px] h-[45px] rounded-lg transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] w-[105px] h-[45px] rounded-lg transition-colors"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Taxes() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("taxes", state, setState);
  const [showTaxList, setShowTaxList] = useState(false);
  const [rates, setRates] = useState(TAX_RATES);
  const [groups, setGroups] = useState(TAX_GROUPS);
  const [editingRate, setEditingRate] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

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

  const handleTaxList = () => setShowTaxList((v) => !v);

  const openEdit = (rate, index) => setEditingRate({ ...rate, index });
  const closeEditRate = () => setEditingRate(null);
  const saveEdit = (edited) => {
    setRates((prev) => prev.map((r, i) => (i === editingRate.index ? { ...r, ...edited } : r)));
    setEditingRate(null);
  };

  const openEditGroup = (group, index) => setEditingGroup({ ...group, index });
  const closeEditGroup = () => setEditingGroup(null);
  const saveEditGroup = (edited) => {
    setGroups((prev) => prev.map((g, i) => (i === editingGroup.index ? { ...g, ...edited } : g)));
    setEditingGroup(null);
  };

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden min-h-[560px]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#1f8cff] to-[#4338ca] px-8 py-7">
        <h2 className="text-[25px] font-bold text-white">Taxes &amp; GST</h2>
      </div>
      <button
        type="button"
        onClick={() => setSettingsTab && setSettingsTab("general")}
        title="Close"
        className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow flex items-center justify-center transition-colors z-10"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {showTaxList ? (
        <div className="grid grid-cols-3 gap-8 px-8 py-7">
          <GstSettingsColumn state={state} set={set} onTaxList={handleTaxList} />
          <TaxRatesColumn rates={rates} onEdit={openEdit} />
          <TaxGroupColumn groups={groups} onEdit={openEditGroup} />
        </div>
      ) : (
        <div className="max-w-[480px] px-8 py-7">
          <GstSettingsColumn state={state} set={set} onTaxList={handleTaxList} />
        </div>
      )}

      {editingRate && (
        <EditTaxRateModal
          rate={editingRate}
          onClose={closeEditRate}
          onSave={saveEdit}
        />
      )}

      {editingGroup && (
        <EditTaxGroupModal
          group={editingGroup}
          rates={rates}
          onClose={closeEditGroup}
          onSave={saveEditGroup}
        />
      )}
    </div>
  );
}
