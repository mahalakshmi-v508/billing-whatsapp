import { X, Sparkles } from "lucide-react";

export const accent = "#2563eb";
export const gradient = "linear-gradient(135deg, #1f8cff 0%, #4338ca 100%)";

/** Small circular info tooltip icon */
export function InfoIcon({ title }) {
  return (
    <span
      className="info-icon inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 text-slate-500 hover:bg-blue-500 hover:text-white cursor-help transition-colors flex-shrink-0 text-[10px] font-bold"
      title={title}
      aria-label={title}
    >
      i
    </span>
  );
}

/** Modern custom square checkbox row */
export function CheckRow({ label, checked, onChange, info, extra, sub, size = "sm" }) {
  return (
    <div className="py-1.5">
      <label className="check-row group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer select-none transition-colors hover:bg-slate-50">
        <span className="flex items-center gap-2.5 min-w-0">
          <span
            className={`relative inline-flex items-center justify-center rounded-[5px] border-2 transition-all cursor-pointer shrink-0 ${
              size === "lg" ? "w-[22px] h-[22px]" : "w-5 h-5"
            } ${
              checked
                ? "bg-blue-600 border-blue-600 shadow-sm shadow-blue-600/30"
                : "bg-white border-slate-300 group-hover:border-blue-400"
            }`}
            onClick={(e) => {
              if (sub || extra) e.preventDefault();
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {checked && (
              <svg
                width={size === "lg" ? 13 : 12}
                height={size === "lg" ? 13 : 12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span className="text-[13.5px] text-slate-700 group-hover:text-slate-900 transition-colors">
            {label}
          </span>
        </span>
        <span className="flex items-center gap-2 flex-shrink-0">
          {extra && <span className="flex items-center">{extra}</span>}
          {info && <InfoIcon title={info} />}
        </span>
      </label>
      {sub && <div className="ml-10 mt-1.5">{sub}</div>}
    </div>
  );
}

/** Modern iOS-style toggle */
export function Toggle({ checked, onChange, label, info }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none group">
      <span className="flex items-center gap-2.5 min-w-0">
        {label && (
          <span className="text-[13.5px] text-slate-700 group-hover:text-slate-900 transition-colors">
            {label}
          </span>
        )}
        {info && <InfoIcon title={info} />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-blue-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

/** Section title with accent dot */
export function SectionTitle({ title, crown, children }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h4 className="section-title flex items-center gap-2 text-[16px] font-bold text-slate-800">
        <span className="w-1 h-4 rounded-full" style={{ background: gradient }} />
        {title}
        {crown}
      </h4>
      {children}
    </div>
  );
}

/** Wrapper for a group of settings in a white card */
export function SettingsCard({ title, crown, badge, children, className = "" }) {
  return (
    <div className={`settings-card bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 ${className}`}>
      {(title || badge) && (
        <div className="flex items-center justify-between mb-1">
          <h4 className="section-title flex items-center gap-2 text-[15px] font-bold text-slate-800">
            <span className="w-1 h-4 rounded-full" style={{ background: gradient }} />
            {title}
            {crown}
          </h4>
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

/** Page header shell */
export function SettingsHeader({ title, subtitle, icon, onClose }) {
  return (
    <div className="settings-header bg-white/80 backdrop-blur border-b border-slate-200/70 px-8 py-5 flex items-center justify-between gap-4 rounded-t-2xl">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 flex-shrink-0"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-[22px] font-extrabold text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12.5px] text-slate-500 font-medium tracking-wide mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors flex-shrink-0"
        >
          <X size={18} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

/** Full page layout: header + scrollable content area */
export function SettingsShell({ title, subtitle, icon, onClose, children, contentClassName = "" }) {
  return (
    <div className="overflow-hidden flex flex-col flex-1 bg-slate-50">
      <SettingsHeader title={title} subtitle={subtitle} icon={icon} onClose={onClose} />
      <div className={`flex-1 overflow-y-auto px-10 py-9 ${contentClassName}`}>{children}</div>
    </div>
  );
}

/** Small premium / feature badge */
export function Badge({ children, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    gray: "bg-slate-100 text-slate-500 border-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold border rounded-full px-2 py-0.5 ${
        tones[tone] || tones.blue
      }`}
    >
      {children}
    </span>
  );
}

/** Decorative sparkle for section hints */
export function SectionHint({ children }) {
  return (
    <p className="flex items-center gap-1.5 text-[12.5px] text-slate-500 leading-relaxed my-2">
      <Sparkles size={13} className="text-blue-400 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}
