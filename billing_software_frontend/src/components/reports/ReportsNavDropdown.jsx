import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Search,
  FileText,
  X,
  Sparkles,
  Receipt,
  Users,
  FileCheck,
  Package,
  Percent,
  CreditCard,
  ShoppingCart,
  ArrowRight,
  BarChart3,
  Check,
  CornerDownLeft,
  Star,
} from "lucide-react";
import { reports, reportSections, otherReports, findReportByPath } from "./reportNavigation";

/** Reports hidden from the dropdown */
const HIDDEN_REPORT_PATHS = new Set([
  "/reports/all-transactions",
  "/reports/profit-loss",
  "/reports/cash-flow",
  "/reports/trial-balance",
  "/reports/balance-sheet",
  "/reports/bank-statement",
  "/reports/discount-report",
  "/reports/loan-statement",
]);

/** Category icon helper */
const CATEGORY_ICONS = {
  transaction: Receipt,
  party: Users,
  "gst-reports": FileCheck,
  "item-stock": Package,
  "business-status": BarChart3,
  taxes: Percent,
  expense: CreditCard,
  "sale-order": ShoppingCart,
  loan: FileText,
  other: FileText,
};

const STARRED_STORAGE_KEY = "paysplit_starred_reports";

export default function ReportsNavDropdown() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selectedSectionKey, setSelectedSectionKey] = useState("transaction");

  // ── Starred reports state persisted in localStorage ──
  const [starredPaths, setStarredPaths] = useState(() => {
    try {
      const saved = localStorage.getItem(STARRED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    // Default initial starred reports
    return ["/reports/sale", "/reports/day-book", "/reports/gst-r1"];
  });

  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const activeReport = findReportByPath(location.pathname);
  const activePath = activeReport ? activeReport.path : null;

  // Toggle star status for a report path
  const toggleStar = (path) => {
    setStarredPaths((prev) => {
      let next;
      if (prev.includes(path)) {
        next = prev.filter((p) => p !== path);
      } else {
        next = [...prev, path];
      }
      try {
        localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const isStarred = (path) => starredPaths.includes(path);

  // List of full report objects that are starred
  const starredReportsList = useMemo(() => {
    return starredPaths
      .map((path) => reports.find((r) => r.path === path))
      .filter(Boolean);
  }, [starredPaths]);

  // Identify which section contains the currently active report
  const currentSection = useMemo(() => {
    if (!activePath) return null;
    return (
      reportSections.find((s) => s.reports.some((r) => r.path === activePath)) || {
        key: "other",
        label: "General Reports",
      }
    );
  }, [activePath]);

  // Set initial selected section to match current active report
  useEffect(() => {
    if (currentSection && currentSection.key) {
      setSelectedSectionKey(currentSection.key);
    }
  }, [currentSection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global hotkey: Ctrl+K or Cmd+K to toggle report dropdown, Escape to close
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((v) => !v);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filtered reports matching search query
  const searchMatches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return reports.filter(
      (r) => !HIDDEN_REPORT_PATHS.has(r.path) && r.title.toLowerCase().includes(term)
    );
  }, [q]);

  const go = (r) => {
    setIsOpen(false);
    setQ("");
    if (r.path !== location.pathname) {
      navigate(r.path);
    }
  };

  const visibleSections = useMemo(() => {
    return reportSections.filter((section) =>
      section.reports.some((r) => !HIDDEN_REPORT_PATHS.has(r.path))
    );
  }, []);

  const activeSectionObj = useMemo(() => {
    if (selectedSectionKey === "other") {
      return {
        key: "other",
        label: "All Reports",
        reports: otherReports.filter((r) => !HIDDEN_REPORT_PATHS.has(r.path)),
      };
    }
    return (
      visibleSections.find((s) => s.key === selectedSectionKey) || visibleSections[0]
    );
  }, [selectedSectionKey, visibleSections]);

  const searching = q.trim().length > 0;

  return (
    <div className="space-y-3 mb-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. MAIN SELECTOR TRIGGER & POPUP CONTAINER ── */}
      <div ref={dropdownRef} className="relative inline-block w-full sm:w-auto">
        {/* Modern Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`w-full sm:w-auto min-w-[320px] max-w-md bg-white p-2.5 sm:p-3 rounded-2xl border transition-all text-left flex items-center justify-between gap-4 cursor-pointer shadow-xs ${
            isOpen
              ? "border-indigo-500 ring-4 ring-indigo-50 shadow-md"
              : "border-slate-200/90 hover:border-indigo-300 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <BarChart3 size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 truncate flex items-center gap-1.5">
                <span>{currentSection?.label || "Financial Report"}</span>
                <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {activeReport ? activeReport.title : "Select Financial Report..."}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200/60">
              ⌘K
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 transition-transform duration-200 ${
                isOpen ? "rotate-180 text-indigo-600" : ""
              }`}
            >
              <ChevronDown size={16} />
            </div>
          </div>
        </button>

        {/* ── 2. ADVANCED MEGA-DROPDOWN COMMAND PALETTE ── */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-50 w-full sm:w-[680px] lg:w-[760px] max-w-[95vw] bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Top Search Toolbar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search any report (e.g. GSTR 1, Stock Summary, Day Book, Party)..."
                  className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/60">
                <span>ESC</span>
              </div>
            </div>

            {/* Content Area: Search Mode vs Multi-Category Split Mode */}
            {searching ? (
              /* Search Results Mode */
              <div className="p-4 max-h-[380px] overflow-y-auto">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
                  Matching Reports ({searchMatches.length})
                </div>

                {searchMatches.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-sm font-bold text-slate-700">No matching reports found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No financial reports match &quot;{q.trim()}&quot;. Try searching another term.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {searchMatches.map((r) => {
                      const isActive = r.path === activePath;
                      const starred = isStarred(r.path);
                      return (
                        <div
                          key={r.path}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isActive
                              ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-2xs"
                              : "bg-white hover:bg-slate-50 border-slate-200/70 text-slate-800"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => go(r)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isActive ? "bg-indigo-600" : "bg-slate-300"
                              }`}
                            />
                            <span className="text-xs font-semibold truncate">{r.title}</span>
                          </button>

                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {/* Star Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(r.path);
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                starred
                                  ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                  : "text-slate-300 hover:text-amber-400 hover:bg-slate-100"
                              }`}
                              title={starred ? "Unpin from outside menu" : "Star & pin to outside menu"}
                            >
                              <Star
                                size={14}
                                className={starred ? "fill-amber-400 text-amber-500" : ""}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => go(r)}
                              className="p-1 text-slate-300 hover:text-indigo-600 cursor-pointer"
                            >
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Split-Pane Multi-Category Command Mode */
              <div className="flex flex-col sm:flex-row min-h-[340px] max-h-[420px]">
                {/* Left Sidebar: Categories Navigation */}
                <div className="w-full sm:w-[240px] bg-slate-50/80 border-b sm:border-b-0 sm:border-r border-slate-200/70 p-2 sm:p-2.5 space-y-1 overflow-y-auto flex-shrink-0">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Report Categories
                  </div>

                  {visibleSections.map((sec) => {
                    const Icon = CATEGORY_ICONS[sec.key] || FileText;
                    const isSelected = selectedSectionKey === sec.key;
                    const count = sec.reports.filter((r) => !HIDDEN_REPORT_PATHS.has(r.path)).length;
                    const hasActiveChild = sec.reports.some((r) => r.path === activePath);

                    return (
                      <button
                        type="button"
                        key={sec.key}
                        onClick={() => setSelectedSectionKey(sec.key)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                          isSelected
                            ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                            : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            size={15}
                            className={isSelected ? "text-indigo-600" : "text-slate-400"}
                          />
                          <span className="truncate">{sec.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasActiveChild && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          )}
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-slate-200/60 text-slate-500"
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {otherReports.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSectionKey("other")}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        selectedSectionKey === "other"
                          ? "bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText
                          size={15}
                          className={
                            selectedSectionKey === "other" ? "text-indigo-600" : "text-slate-400"
                          }
                        />
                        <span className="truncate">All Reports</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/60 text-slate-500">
                        {otherReports.filter((r) => !HIDDEN_REPORT_PATHS.has(r.path)).length}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right Panel: Selected Category Reports Grid */}
                <div className="flex-1 p-4 sm:p-5 overflow-y-auto bg-white">
                  <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {activeSectionObj?.label}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Click star to pin any report outside the dropdown
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {activeSectionObj?.reports?.length || 0} reports
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSectionObj?.reports?.map((r) => {
                      const isActive = r.path === activePath;
                      const starred = isStarred(r.path);
                      return (
                        <div
                          key={r.path}
                          className={`group flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                            isActive
                              ? "bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-2xs"
                              : "bg-slate-50/40 hover:bg-indigo-50/30 border-slate-200/70 hover:border-indigo-200 text-slate-800"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => go(r)}
                            className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
                                isActive
                                  ? "bg-indigo-600"
                                  : "bg-slate-300 group-hover:bg-indigo-400"
                              }`}
                            />
                            <span
                              className={`text-xs font-semibold truncate ${
                                isActive ? "font-bold text-indigo-900" : "text-slate-800"
                              }`}
                            >
                              {r.title}
                            </span>
                          </button>

                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {/* Star Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(r.path);
                              }}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                starred
                                  ? "bg-amber-50 text-amber-500 hover:bg-amber-100"
                                  : "text-slate-300 hover:text-amber-400 hover:bg-white"
                              }`}
                              title={starred ? "Unpin from outside menu" : "Star & pin to outside menu"}
                            >
                              <Star
                                size={14}
                                className={starred ? "fill-amber-400 text-amber-500" : ""}
                              />
                            </button>

                            {isActive && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/60 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Check size={10} />
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Footer Ribbon */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-amber-500" />
                <span>Click ⭐ to pin your favorite reports outside the dropdown</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
                <span>Select with</span>
                <CornerDownLeft size={10} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. STARRED REPORTS MENU OUTSIDE OF DROPDOWN (Replaced "Frequent:") ── */}
      {starredReportsList.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200/80 text-[11px] font-bold uppercase tracking-wider flex-shrink-0">
            <Star size={13} className="fill-amber-400 text-amber-500" />
            <span>Pinned:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-nowrap">
            {starredReportsList.map((r) => {
              const isCurrent = r.path === activePath;
              return (
                <div
                  key={r.path}
                  className={`inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border text-xs font-semibold transition-all flex-shrink-0 ${
                    isCurrent
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs font-bold"
                      : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => go(r)}
                    className="cursor-pointer hover:underline text-[11.5px] flex items-center gap-1.5"
                  >
                    <Star size={11} className="fill-amber-400 text-amber-500 flex-shrink-0" />
                    <span>{r.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleStar(r.path);
                    }}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 text-xs cursor-pointer ml-0.5"
                    title={`Unstar ${r.title}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
