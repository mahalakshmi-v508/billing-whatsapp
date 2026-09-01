import { useState } from "react";
import { X } from "lucide-react";
import { useSettings } from "./SettingsContext";

const STORAGE_KEY = "accounting_settings";

const DEFAULT_STATE = {
  enableAccounting: false,
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

export default function Accounting() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);

  const setEnableAccounting = (val) =>
    setState((s) => {
      const next = { ...s, enableAccounting: val };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden min-h-[560px]">
      <button
        type="button"
        onClick={() => setSettingsTab && setSettingsTab("general")}
        title="Close"
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-500 hover:text-gray-800 shadow flex items-center justify-center transition-colors z-10"
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      <div className="bg-gradient-to-br from-[#1f8cff] to-[#4338ca] px-8 py-7">
        <h2 className="text-[25px] font-bold text-white">Accounting</h2>
      </div>

      <div className="px-8 py-7">
        <label className="flex items-center cursor-pointer select-none group py-1">
          <input
            type="checkbox"
            checked={state.enableAccounting}
            onChange={(e) => setEnableAccounting(e.target.checked)}
            className="w-6 h-6 cursor-pointer shrink-0 rounded-[4px]"
            style={{ accentColor: "#2563eb" }}
          />
          <span className="ml-3 text-[21px] text-gray-800 group-hover:text-gray-950">Enable Accounting module</span>
          <span className="ml-2.5 flex items-center">
            <InfoIcon title="Enable the accounting module" />
          </span>
        </label>
      </div>
    </div>
  );
}
