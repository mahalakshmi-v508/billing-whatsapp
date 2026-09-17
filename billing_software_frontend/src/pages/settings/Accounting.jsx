import { useState } from "react";
import { Calculator } from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell, SettingsCard, InfoIcon } from "./settingsUI";

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

export default function Accounting() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("accounting", state, setState);

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
    <SettingsShell
      title="Accounting"
      subtitle="MODULES & LEDGER"
      icon={<Calculator size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="max-w-3xl"
    >
      <SettingsCard title="Accounting Module">
        <div className="flex items-center justify-between gap-4 mt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[14.5px] text-slate-700">Enable Accounting module</span>
            <InfoIcon title="Enable the accounting module" />
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.enableAccounting}
            onClick={() => setEnableAccounting(!state.enableAccounting)}
            className={`relative w-12 h-7 rounded-full transition-colors shrink-0 cursor-pointer ${
              state.enableAccounting ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                state.enableAccounting ? "left-[24px]" : "left-1"
              }`}
            />
          </button>
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}
