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
      iconBg: "bg-indigo-50 text-indigo-600 border-indigo-100",
      topBar: "bg-indigo-500",
      pill: "bg-indigo-50 text-indigo-700",
    },
    emerald: {
      iconBg: "bg-emerald-50 text-emerald-600 border-emerald-100",
      topBar: "bg-emerald-500",
      pill: "bg-emerald-50 text-emerald-700",
    },
    rose: {
      iconBg: "bg-rose-50 text-rose-600 border-rose-100",
      topBar: "bg-rose-500",
      pill: "bg-rose-50 text-rose-700",
    },
    amber: {
      iconBg: "bg-amber-50 text-amber-600 border-amber-100",
      topBar: "bg-amber-500",
      pill: "bg-amber-50 text-amber-700",
    },
    cyan: {
      iconBg: "bg-cyan-50 text-cyan-600 border-cyan-100",
      topBar: "bg-cyan-500",
      pill: "bg-cyan-50 text-cyan-700",
    },
  };

  const style = accentStyles[accent] || accentStyles.indigo;

  return (
    <div
      onClick={onClick}
      className={`psx-card relative overflow-hidden p-5 flex flex-col justify-between ${
        onClick ? "cursor-pointer hover:border-indigo-300" : ""
      }`}
    >
      {/* Top accent strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${style.topBar}`} />

      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1 font-display">
            {prefix}
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
            {suffix}
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
        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-semibold ${
                trend === "up"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : trend === "down"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600 border border-slate-200"
              }`}
            >
              {trend === "up" && <TrendingUp size={12} strokeWidth={2.5} />}
              {trend === "down" && <TrendingDown size={12} strokeWidth={2.5} />}
              {trend === "neutral" && <Minus size={12} strokeWidth={2.5} />}
              {change}
            </span>
          )}

          {badge && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {badge}
            </span>
          )}

          {subtitle && <span className="text-slate-500 truncate">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
