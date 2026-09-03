import { useState } from "react";
import { ChevronDown, Users, X } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell } from "./settingsUI";

const STORAGE_KEY = "party_settings";

const DEFAULT_STATE = {
  partyGrouping: false,
  shippingAddress: false,
  managePartyStatus: false,
  enablePaymentReminder: true,
  reminderDays: 1,
  field1: { enabled: false, label: "Additional Field 1", showInPrint: false },
  field2: { enabled: false, label: "Additional Field 2", showInPrint: false },
  field3: { enabled: false, label: "Additional Field 3", showInPrint: false },
  field4: { enabled: false, label: "Additional Field 4", showInPrint: false },
  enableLoyalty: false,
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

function BlueDotIcon() {
  return (
    <span
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 flex-shrink-0"
      title="Premium"
      aria-label="Premium"
    />
  );
}

function GstCheckbox({ label, checked, onChange, info, extra }) {
  return (
    <label className="flex items-center cursor-pointer select-none group py-[10px]">
      <span
        className={`relative inline-flex items-center justify-center rounded-md border-2 transition-all cursor-pointer shrink-0 ${
          checked
            ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-600/30"
            : "bg-white border-slate-300 group-hover:border-blue-400"
        }`}
        style={{ width: 24, height: 24 }}
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
        <span className="ml-2.5 flex items-center">
          <InfoIcon title={info} />
        </span>
      )}
      {extra && <span className="ml-2.5 flex items-center">{extra}</span>}
    </label>
  );
}

function ColumnHeading({ title, info }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-[25px] font-bold text-slate-900">
          <span className="w-1.5 h-6 rounded-full" style={{ background: "linear-gradient(135deg,#1f8cff,#4338ca)" }} />
          {title}
        </h2>
        {info && <InfoIcon title={info} />}
      </div>
      <div className="h-px bg-slate-200 my-4" />
    </div>
  );
}

function AdditionalFieldRow({ field, onToggle, onShowInPrint }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={field.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-6 h-6 cursor-pointer shrink-0 rounded-[4px]"
          style={{ accentColor: "#2563eb" }}
        />
        <input
          type="text"
          value={field.label}
          onChange={(e) => field.onChangeLabel(e.target.value)}
          placeholder={field.placeholder}
          className="w-full max-w-[300px] bg-white border border-gray-300 rounded-lg px-3 text-[21px] text-gray-900 outline-none focus:border-blue-500"
          style={{ height: 52 }}
        />
      </div>
      <div className="flex items-center gap-2 ml-9 mt-1.5">
        <Toggle checked={field.showInPrint} onChange={onShowInPrint} />
        <span className="text-[21px] text-gray-800">Show In Print</span>
      </div>
    </div>
  );
}

function AdditionalField4Row({ field, onToggle, onShowInPrint }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={field.enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-6 h-6 cursor-pointer shrink-0 rounded-[4px]"
          style={{ accentColor: "#2563eb" }}
        />
        <input
          type="text"
          value={field.label}
          onChange={(e) => field.onChangeLabel(e.target.value)}
          placeholder={field.placeholder}
          className="bg-white border border-gray-300 rounded-lg px-3 text-[21px] text-gray-900 outline-none focus:border-blue-500"
          style={{ height: 52, width: 245 }}
        />
        <div className="relative">
          <input
            type="text"
            value="dd/mm/yy"
            readOnly
            className="bg-white border border-gray-300 rounded-lg px-3 pr-9 text-[21px] text-gray-500 outline-none cursor-default"
            style={{ height: 52, width: 160 }}
          />
          <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>
      <div className="flex items-center gap-2 ml-9 mt-1.5">
        <Toggle checked={field.showInPrint} onChange={onShowInPrint} />
        <span className="text-[21px] text-gray-800">Show In Print</span>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-[38px] h-[22px] rounded-full flex items-center transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span
        className={`bg-white w-[16px] h-[16px] rounded-full shadow transition-transform ${checked ? "translate-x-[19px]" : "translate-x-[3px]"}`}
      />
    </button>
  );
}

function ReminderMessageModal({ initialMessage, onClose, onSave }) {
  const [additional, setAdditional] = useState(initialMessage);

  const resetDefault = () => setAdditional("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white rounded-xl shadow-lg"
        style={{ width: "545px", maxWidth: "calc(100vw - 40px)", padding: 24 }}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-[23px] font-bold text-gray-900">Add/Edit Reminder Message</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 text-white flex items-center justify-center transition-colors"
            title="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="h-px bg-gray-200 my-4" />

        <div className="text-[23px] text-gray-900 leading-relaxed">
          <p>Dear, [Party Name]</p>
          <p>
            Your payment of [Amount] is pending with [Business
            <br />
            Name]
          </p>
        </div>

        <textarea
          value={additional}
          onChange={(e) => setAdditional(e.target.value)}
          placeholder="Type additional message"
          className="mt-5 w-full bg-white border border-gray-300 rounded-lg p-4 text-[21px] text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 resize-none"
          style={{ height: 115 }}
        />

        <p className="mt-4 text-[21px] text-gray-900 leading-snug">
          If you have already made the payment, kindly ignore this
          <br />
          message.
        </p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] w-[105px] h-[45px] rounded-lg transition-colors shadow-sm"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={resetDefault}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] w-[165px] h-[45px] rounded-lg transition-colors shadow-sm"
          >
            RESET DEFAULT
          </button>
          <button
            type="button"
            onClick={() => onSave(additional)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[18px] w-[105px] h-[45px] rounded-lg transition-colors shadow-sm"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Party() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("party", state, setState);

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

  const setField = (key) => (patch) =>
    setState((s) => {
      const next = { ...s, [key]: { ...s[key], ...(typeof patch === "function" ? patch(s[key]) : patch) } };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });

  const [showReminder, setShowReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");

  const openReminder = () => {
    try {
      setReminderMessage(localStorage.getItem("party_reminder") || "");
    } catch {
      setReminderMessage("");
    }
    setShowReminder(true);
  };
  const closeReminder = () => setShowReminder(false);
  const saveReminder = (msg) => {
    try {
      localStorage.setItem("party_reminder", msg);
    } catch {
      /* best-effort */
    }
    setShowReminder(false);
  };

  return (
    <SettingsShell
      title="Party"
      subtitle="PARTY MASTERS, FIELDS & LOYALTY"
      icon={<Users size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-10"
    >
      {/* LEFT COLUMN - Party Settings */}
      <div className="flex flex-col space-y-[6px]">
        <ColumnHeading title="Party Settings" />
          <GstCheckbox label="Party Grouping" checked={state.partyGrouping} onChange={set("partyGrouping")} info="Group related parties" />
          <GstCheckbox label="Shipping Address" checked={state.shippingAddress} onChange={set("shippingAddress")} info="Enable shipping address" />
          <GstCheckbox label="Manage Party Status" checked={state.managePartyStatus} onChange={set("managePartyStatus")} info="Manage party status" />
          <GstCheckbox label="Enable Payment Reminder" checked={state.enablePaymentReminder} onChange={set("enablePaymentReminder")} info="Enable payment reminders" />

          <div className="mt-7 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="text-[19px] text-gray-700">Remind me for payment due in</span>
              <InfoIcon title="Reminder days" />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <input
                type="number"
                min="0"
                value={state.reminderDays}
                onChange={(e) => set("reminderDays")(parseInt(e.target.value, 10) || 0)}
                className="w-16 bg-white border border-gray-300 rounded-lg px-3 text-[21px] text-gray-900 outline-none focus:border-blue-500 text-center"
                style={{ height: 44 }}
              />
              <span className="text-[19px] text-gray-700">(days)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={openReminder}
            className="mt-10 px-6 bg-gray-100 hover:bg-gray-200 text-blue-600 font-semibold text-[21px] rounded-lg flex items-center transition-colors self-start"
            style={{ height: 52 }}
          >
            Reminder Message
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* CENTER COLUMN - Additional fields */}
        <div className="flex flex-col space-y-2">
          <ColumnHeading title="Additional fields" info="Extra party fields" />
          <AdditionalFieldRow
            field={{ ...state.field1, onChangeLabel: (v) => setField("field1")({ label: v }), placeholder: "Additional Field 1" }}
            onToggle={(v) => setField("field1")({ enabled: v })}
            onShowInPrint={(v) => setField("field1")({ showInPrint: v })}
          />
          <AdditionalFieldRow
            field={{ ...state.field2, onChangeLabel: (v) => setField("field2")({ label: v }), placeholder: "Additional Field 2" }}
            onToggle={(v) => setField("field2")({ enabled: v })}
            onShowInPrint={(v) => setField("field2")({ showInPrint: v })}
          />
          <AdditionalFieldRow
            field={{ ...state.field3, onChangeLabel: (v) => setField("field3")({ label: v }), placeholder: "Additional Field 3" }}
            onToggle={(v) => setField("field3")({ enabled: v })}
            onShowInPrint={(v) => setField("field3")({ showInPrint: v })}
          />
          <AdditionalField4Row
            field={{ ...state.field4, onChangeLabel: (v) => setField("field4")({ label: v }), placeholder: "Additional Field 4" }}
            onToggle={(v) => setField("field4")({ enabled: v })}
            onShowInPrint={(v) => setField("field4")({ showInPrint: v })}
          />
        </div>

        {/* RIGHT COLUMN - Enable Loyalty Point */}
        <div className="flex flex-col space-y-[6px]">
          <ColumnHeading title="Enable Loyalty Point" />
          <GstCheckbox
            label="Enable Loyalty Point"
            checked={state.enableLoyalty}
            onChange={set("enableLoyalty")}
            info="Enable loyalty points"
            extra={<BlueDotIcon />}
          />
        </div>

      {showReminder && (
        <ReminderMessageModal
          initialMessage={reminderMessage}
          onClose={closeReminder}
          onSave={saveReminder}
        />
      )}
    </SettingsShell>
  );
}
