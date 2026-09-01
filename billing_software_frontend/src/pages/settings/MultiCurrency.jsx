import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useSettings } from "./SettingsContext";

const STORAGE_KEY = "multi_currency_settings";

const DEFAULT_STATE = {
  liveExchangeRate: false,
  currencies: [],
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

export default function MultiCurrency() {
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

  const hasCurrencies = state.currencies && state.currencies.length > 0;

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

      {/* Header */}
      <div className="bg-gradient-to-br from-[#1f8cff] to-[#4338ca] px-8 py-7">
        <h2 className="text-[25px] font-bold text-white">Multi-Currency</h2>
      </div>

      <div className="px-8 py-7">
        {/* Info banner */}
        <div className="w-full flex items-center rounded-lg px-5 py-3.5 bg-amber-50 border border-amber-100">
          <p className="text-[18px] text-gray-800 leading-snug">
            ✨ Vyapar now supports Multi-Currency, so you can manage all your bills &amp; transactions in any currency you need!
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-5 mt-5">
          <div className="flex items-center gap-2">
            <Toggle checked={state.liveExchangeRate} onChange={set("liveExchangeRate")} />
            <span className="text-[18px] text-gray-700">Get Live Exchange Rate</span>
            <InfoIcon title="Get live exchange rates" />
          </div>

          <div className="w-px h-7 bg-gray-300" />

          <button
            type="button"
            onClick={() => {}}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-[18px] rounded-lg px-4 transition-colors"
            style={{ height: 40 }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Add New Currency
            <InfoIcon title="Add new currency" />
          </button>
        </div>

        {/* Currency table */}
        {hasCurrencies ? (
          <table className="w-full mt-6 border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left text-[13px] text-gray-500">
                <th className="px-4 py-3 border border-gray-200 font-semibold">Name</th>
                <th className="px-4 py-3 border border-gray-200 font-semibold">Symbol</th>
                <th className="px-4 py-3 border border-gray-200 font-semibold">Exchange Rate</th>
                <th className="px-4 py-3 border border-gray-200 font-semibold">Set on Date</th>
                <th className="px-4 py-3 border border-gray-200 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.currencies.map((c) => (
                <tr key={c.name}>
                  <td className="px-4 py-3 border border-gray-200 text-[18px] text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 border border-gray-200 text-[18px] text-gray-800">{c.symbol}</td>
                  <td className="px-4 py-3 border border-gray-200 text-[18px] text-gray-800">{c.rate}</td>
                  <td className="px-4 py-3 border border-gray-200 text-[18px] text-gray-800">{c.date}</td>
                  <td className="px-4 py-3 border border-gray-200" />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Empty state
          <div className="w-full mt-8 flex flex-col items-center py-16">
            <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4Z" />
              </svg>
            </div>
            <p className="mt-5 text-[21px] font-semibold text-gray-800">No Currencies to show</p>
            <p className="mt-1.5 text-[18px] text-gray-500">Add your Base currency to start adding more currencies.</p>
            <button
              type="button"
              onClick={() => {}}
              className="mt-5 bg-red-600 hover:bg-red-700 text-white font-semibold text-[19px] rounded-lg flex items-center px-5 transition-colors"
              style={{ height: 46 }}
            >
              <Plus size={20} strokeWidth={2.5} className="mr-1.5" />
              Add Base Currency
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
