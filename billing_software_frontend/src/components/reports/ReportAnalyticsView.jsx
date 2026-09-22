import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, BarChart3, Sparkles, X } from "lucide-react";

const GROUP_COLORS = [
  "#7c3aed",
  "#6366f1",
  "#0891b2",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
];

const fmtMoney = (v, symbol = "₹") =>
  `${symbol}${Number(v || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const fmtMoney2 = (v, symbol = "₹") =>
  `${symbol}${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function TrendTooltip({ active, payload, label, symbol }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div
      style={{
        background: "#0f172a",
        color: "#fff",
        borderRadius: "10px",
        padding: "8px 12px",
        fontSize: "12px",
        boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        {data.fullDate || label || ""}
      </div>
      <div style={{ fontWeight: 600, color: "#a5b4fc" }}>
        Value: {fmtMoney2(data.value, symbol)}
      </div>
      {data.count != null && (
        <div style={{ color: "#94a3b8", marginTop: 2, fontSize: 11 }}>
          {data.count} record{data.count === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}

function DonutTooltip({ active, payload, symbol }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: "#0f172a",
        color: "#fff",
        borderRadius: "10px",
        padding: "8px 12px",
        fontSize: "12px",
        boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
      }}
    >
      <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: item.payload.color,
            display: "inline-block",
          }}
        />
        {item.name}
      </div>
      <div style={{ color: "#94a3b8", marginTop: 4 }}>
        Value:{" "}
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {fmtMoney(item.value, symbol)}
        </span>
      </div>
      <div style={{ color: "#94a3b8" }}>
        Records:{" "}
        <span style={{ color: "#fff", fontWeight: 700 }}>
          {item.payload.count}
        </span>{" "}
        ({item.payload.percent}%)
      </div>
    </div>
  );
}

/**
 * Generic report analytics modal.
 *
 * rows: normalized array of { date?: "YYYY-MM-DD", group?: string, value: number, count?: number }
 */
export default function ReportAnalyticsView({
  title = "Analytics",
  subtitle = "",
  rows = [],
  symbol = "₹",
  groupLabel = "Breakdown",
  emptyMessage = "No data available for the selected period.",
  onClose,
}) {
  const [granularity, setGranularity] = useState("auto");
  const [metricView, setMetricView] = useState("value");

  const summary = useMemo(() => {
    let totalValue = 0;
    let highest = null;

    rows.forEach((r) => {
      const v = Number(r.value) || 0;
      totalValue += v;
      if (!highest || v > highest.value) {
        highest = { value: v, group: r.group || "-", date: r.date || "" };
      }
    });

    return {
      records: rows.length,
      totalValue,
      avg: rows.length ? totalValue / rows.length : 0,
      highest,
    };
  }, [rows]);

  const trendData = useMemo(() => {
    let effective = granularity;
    if (granularity === "auto") {
      const times = rows
        .map((r) => (r.date ? new Date(r.date).getTime() : NaN))
        .filter(Number.isFinite);
      if (times.length > 1) {
        const span = (Math.max(...times) - Math.min(...times)) / 86400000;
        effective = span > 60 ? "monthly" : span > 21 ? "weekly" : "daily";
      } else {
        effective = "daily";
      }
    }

    const map = new Map();

    rows.forEach((r) => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) return;

      let key;
      let label;
      let fullDate;

      if (effective === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        fullDate = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      } else if (effective === "weekly") {
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const week =
          Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        key = `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
        label = `W${week} '${String(d.getFullYear()).slice(-2)}`;
        fullDate = `Week ${week}, ${d.getFullYear()}`;
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        fullDate = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      }

      if (!map.has(key)) {
        map.set(key, { key, label, fullDate, sortTime: d.getTime(), value: 0, count: 0 });
      }
      const item = map.get(key);
      item.value += Number(r.value) || 0;
      item.count += Number(r.count) || 1;
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [rows, granularity]);

  const groupData = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const name = (r.group || "General").trim() || "General";
      if (!map.has(name)) map.set(name, { name, value: 0, count: 0 });
      const item = map.get(name);
      item.value += Number(r.value) || 0;
      item.count += Number(r.count) || 1;
    });

    const sorted = Array.from(map.values()).sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 6);
    const topTotal = top.reduce((s, g) => s + g.value, 0);
    const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0) || 1;

    return {
      top,
      all: sorted,
      data: top.map((g, i) => ({
        ...g,
        color: GROUP_COLORS[i % GROUP_COLORS.length],
        percent: (((g.value / topTotal) * 100).toFixed(0)),
        share: total > 0 ? (g.value / total) * 100 : 0,
      })),
      totalRecords: rows.length,
    };
  }, [rows]);

  const hasDates = trendData.length > 0;
  const maxShare =
    Math.max(...groupData.data.map((g) => g.share), 0) || 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 115,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        className="pb-no-print"
        style={{
          width: "min(96vw, 1000px)",
          maxHeight: "94vh",
          background: "#fff",
          borderRadius: "14px",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "14px 18px",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div className="min-w-0">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "11px",
                fontWeight: 700,
                color: "#7c3aed",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <Sparkles size={13} /> Report Analytics
            </div>
            <h3
              style={{
                margin: "2px 0 0",
                fontSize: "16px",
                fontWeight: 800,
                color: "#17243a",
                display: "flex",
                alignItems: "center",
                gap: 8,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <BarChart3 size={17} style={{ color: "#7c3aed", flexShrink: 0 }} />
              {title}
            </h3>
            {subtitle && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: "12px",
                  color: "#64748b",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#64748b",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Close analytics"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflow: "auto", padding: "18px", background: "#f8fafc", flex: 1 }}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: "70px 0",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {emptyMessage}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ marginBottom: 16 }}>
                {[
                  {
                    label: "Total Records",
                    value: String(summary.records),
                    color: "#7c3aed",
                    bg: "#f5f3ff",
                  },
                  {
                    label: "Total Value",
                    value: fmtMoney(summary.totalValue, symbol),
                    color: "#10b981",
                    bg: "#ecfdf5",
                  },
                  {
                    label: "Average",
                    value: fmtMoney(summary.avg, symbol),
                    color: "#0891b2",
                    bg: "#ecfeff",
                  },
                  {
                    label: "Highest",
                    value: fmtMoney(summary.highest?.value, symbol),
                    color: "#f59e0b",
                    bg: "#fffbeb",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "12px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#94a3b8",
                        fontSize: "10.5px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          width: 20,
                          height: 20,
                          borderRadius: 7,
                          alignItems: "center",
                          justifyContent: "center",
                          background: s.bg,
                          color: s.color,
                          fontSize: 11,
                        }}
                      >
                        <Award size={12} />
                      </span>
                      {s.label}
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "#1e293b",
                      }}
                    >
                      {s.value}
                    </div>
                    {s.label === "Highest" && summary.highest?.group && (
                      <div
                        style={{
                          marginTop: 2,
                          fontSize: "11px",
                          color: "#64748b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {summary.highest.group}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="grid grid-cols-1 lg:grid-cols-3 gap-3"
                style={{ marginBottom: 16 }}
              >
                {/* Trend */}
                <div
                  className="lg:col-span-2"
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#334155",
                      }}
                    >
                      Value Trend
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-[11px] font-semibold"
                      >
                        {["value", "count"].map((m) => (
                          <button
                            key={m}
                            onClick={() => setMetricView(m)}
                            style={{ cursor: "pointer", border: "none" }}
                            className={`px-2 py-1 rounded-md capitalize transition-all ${
                              metricView === m
                                ? "bg-white text-indigo-700 shadow-sm font-bold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/80 p-0.5 text-[11px] font-semibold">
                        {["auto", "daily", "weekly", "monthly"].map((g) => (
                          <button
                            key={g}
                            onClick={() => setGranularity(g)}
                            style={{ cursor: "pointer", border: "none" }}
                            className={`px-2 py-1 rounded-md capitalize transition-all ${
                              granularity === g
                                ? "bg-indigo-600 text-white shadow-sm font-bold"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!hasDates ? (
                    <div
                      style={{
                        height: 190,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#94a3b8",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      No date information available for trend analysis.
                    </div>
                  ) : (
                    <div style={{ height: 190, width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 6, right: 6, left: -8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="rptTrendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10.5, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            tick={{ fontSize: 10.5, fill: "#94a3b8" }}
                            axisLine={false}
                            tickLine={false}
                            width={44}
                            tickFormatter={(v) =>
                              metricView === "count"
                                ? v
                                : symbol === "₹"
                                  ? `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                                  : `${symbol}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                            }
                          />
                          <Tooltip content={<TrendTooltip symbol={symbol} />} />
                          <Area
                            type="monotone"
                            dataKey={metricView}
                            name={metricView === "count" ? "Records" : "Value"}
                            stroke="#7c3aed"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#rptTrendGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Group donut */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#334155",
                      marginBottom: 8,
                    }}
                  >
                    {groupLabel}
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 168,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={groupData.data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={46}
                          outerRadius={66}
                          paddingAngle={3}
                          strokeWidth={0}
                        >
                          {groupData.data.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip symbol={symbol} />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <span style={{ fontSize: "17px", fontWeight: 800, color: "#1e293b" }}>
                        {groupData.data.length}
                      </span>
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 700,
                          color: "#94a3b8",
                          textTransform: "uppercase",
                        }}
                      >
                        Groups
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {groupData.data.slice(0, 4).map((g) => (
                      <div key={g.name}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            fontSize: "11px",
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontWeight: 600,
                              color: "#334155",
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 3,
                                background: g.color,
                                flexShrink: 0,
                              }}
                            />
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {g.name}
                            </span>
                          </span>
                          <span style={{ fontWeight: 700, color: "#475569", flexShrink: 0 }}>
                            {fmtMoney(g.value, symbol)}
                          </span>
                        </div>
                        <div
                          style={{
                            height: 5,
                            background: "#f1f5f9",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.max(4, (g.share / maxShare) * 100)}%`,
                              background: g.color,
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top groups full list */}
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                    Top {groupLabel} by Value
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8" }}>
                    {groupData.data.length} shown
                  </span>
                </div>
                {groupData.data.length === 0 ? (
                  <div
                    style={{
                      padding: "24px 0",
                      textAlign: "center",
                      color: "#94a3b8",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    No breakdown available.
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                  >
                    {groupData.data.map((g, idx) => (
                      <div
                        key={g.name}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #eef2f6",
                          borderRadius: "10px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              background: `${g.color}1a`,
                              color: g.color,
                              fontSize: "10px",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#1e293b",
                              minWidth: 0,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                            title={g.name}
                          >
                            {g.name}
                          </span>
                          <span
                            style={{
                              marginLeft: "auto",
                              fontSize: "12px",
                              fontWeight: 800,
                              color: g.color,
                              flexShrink: 0,
                            }}
                          >
                            {fmtMoney(g.value, symbol)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 6,
                            fontSize: "10.5px",
                            color: "#94a3b8",
                          }}
                        >
                          <span>
                            {g.count} record{g.count === 1 ? "" : "s"}
                          </span>
                          <span style={{ fontWeight: 700, color: "#64748b" }}>
                            {g.share.toFixed(1)}%
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            height: 5,
                            background: "#e9edf2",
                            borderRadius: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, Math.max(4, (g.share / maxShare) * 100))}%`,
                              background: g.color,
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}