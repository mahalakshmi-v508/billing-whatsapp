import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  trend = "up", // 'up' | 'down' | 'neutral'
  icon: Icon,
  accent = "indigo", // 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan'
  prefix = "",
  suffix = "",
  badge,
  onClick,
}) {
  const accentStyles = {
    indigo: {
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/60",
      topBar: "bg-indigo-500",
      pill: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60",
      topBar: "bg-emerald-500",
      pill: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    rose: {
      iconBg: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60",
      topBar: "bg-rose-500",
      pill: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60",
      topBar: "bg-amber-500",
      pill: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    cyan: {
      iconBg: "bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-400 dark:border-cyan-900/60",
      topBar: "bg-cyan-500",
      pill: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300",
    },
  };

  const style = accentStyles[accent] || accentStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`psx-card relative overflow-hidden p-5 flex flex-col justify-between dark:bg-[#1e293b] dark:border-slate-800 ${
        onClick ? "cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700" : ""
      }`}
    >
      {/* Top accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${style.topBar}`} />

      <div className="flex items-start justify-between gap-3 mb-2 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block min-h-[2.25rem] flex items-center leading-snug">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1 font-display flex items-baseline flex-nowrap min-h-[2rem]">
            {prefix && <span className="mr-0.5">{prefix}</span>}
            <span className="tabular-nums">
              {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            </span>
            {suffix && (
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-1.5 font-sans whitespace-nowrap self-baseline tracking-normal">
                {suffix}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${style.iconBg}`}
          >
            <Icon size={20} strokeWidth={2.2} />
          </div>
        )}
      </div>

      {(subtitle || change !== undefined || badge) && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[1.75rem] overflow-hidden flex-nowrap">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold text-[11px] whitespace-nowrap flex-shrink-0 ${
                trend === "up"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800"
                  : trend === "down"
                  ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800"
                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              }`}
            >
              {trend === "up" && <TrendingUp size={12} strokeWidth={2.5} />}
              {trend === "down" && <TrendingDown size={12} strokeWidth={2.5} />}
              {trend === "neutral" && <Minus size={12} strokeWidth={2.5} />}
              {change}
            </span>
          )}

          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-medium text-[11px] whitespace-nowrap flex-shrink-0">
              {badge}
            </span>
          )}

          {subtitle && (
            <span
              className="text-slate-500 dark:text-slate-400 text-[11px] truncate min-w-0"
              title={typeof subtitle === "string" ? subtitle : undefined}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
