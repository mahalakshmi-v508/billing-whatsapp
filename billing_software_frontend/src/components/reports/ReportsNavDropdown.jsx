import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Receipt,
  ShoppingCart,
  Calendar,
  Users,
  TrendingUp,
  FileCheck,
  FileSpreadsheet,
  Package,
  Percent,
  CreditCard,
  IndianRupee,
  AlertTriangle,
  FileText,
  Search,
  Sliders,
  Sparkles,
  BarChart3,
  Layers,
  ArrowRight,
  Settings2,
  X,
  Check,
  RotateCcw,
  SlidersHorizontal,
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";
import { reports, reportSections, otherReports, findReportByPath } from "./reportNavigation";

/** Reports hidden by default from navigation */
const HIDDEN_REPORT_PATHS = new Set([
  "/reports/bank-statement",
  "/reports/discount-report",
  "/reports/loan-statement",
]);

const VISIBILITY_STORAGE_KEY = "reports_menu_visibility";

/** Category Definitions matching "Invoice & Document Numbering" style */
const CATEGORIES = [
  "All",
  "Sales & Orders",
  "Purchase",
  "Party & CRM",
  "GST Compliance",
  "Stock & Items",
  "Taxes",
  "Expenses",
  "Accounts",
];

/** Map each report path to its visual Category and Short Code / Slug */
const REPORT_METADATA = {
  "/reports/sale": { category: "Sales & Orders", code: "SALE-01", icon: Receipt },
  "/reports/purchase": { category: "Purchase", code: "PURCH-01", icon: ShoppingCart },
  "/reports/day-book": { category: "Sales & Orders", code: "DAY-BOOK", icon: Calendar },
  "/reports/sale-orders": { category: "Sales & Orders", code: "SO-REP", icon: ShoppingCart },
  "/reports/sale-order-item": { category: "Sales & Orders", code: "SO-ITEM", icon: ShoppingCart },

  "/reports/party-statement": { category: "Party & CRM", code: "PARTY-STMT", icon: Users },
  "/reports/party-profit-loss": { category: "Party & CRM", code: "PARTY-PL", icon: TrendingUp },
  "/reports/all-parties": { category: "Party & CRM", code: "ALL-PARTIES", icon: Users },
  "/reports/party-by-item": { category: "Party & CRM", code: "PARTY-ITEM", icon: Package },
  "/reports/sale-purchase-by-party": { category: "Party & CRM", code: "SP-PARTY", icon: Users },
  "/reports/sale-purchase-by-party-group": { category: "Party & CRM", code: "SP-GROUP", icon: Users },

  "/reports/gst-r1": { category: "GST Compliance", code: "GSTR-1", icon: FileCheck },
  "/reports/gst-r2": { category: "GST Compliance", code: "GSTR-2", icon: FileCheck },
  "/reports/gstr-3b": { category: "GST Compliance", code: "GSTR-3B", icon: FileCheck },
  "/reports/gstr-9": { category: "GST Compliance", code: "GSTR-9", icon: FileCheck },
  "/reports/sale-summary-by-hsn": { category: "GST Compliance", code: "HSN-SUM", icon: FileSpreadsheet },
  "/reports/sac-report": { category: "GST Compliance", code: "SAC-REP", icon: FileSpreadsheet },

  "/reports/stock-summary": { category: "Stock & Items", code: "STOCK-SUM", icon: Package },
  "/reports/item-report-by-party": { category: "Stock & Items", code: "ITEM-PARTY", icon: Package },
  "/reports/item-wise-profit-and-loss": { category: "Stock & Items", code: "ITEM-PL", icon: TrendingUp },
  "/reports/item-category-wise-profit-and-loss": { category: "Stock & Items", code: "CAT-PL", icon: TrendingUp },
  "/reports/low-stock-summary": { category: "Stock & Items", code: "LOW-STOCK", icon: AlertTriangle },
  "/reports/stock-detail": { category: "Stock & Items", code: "STOCK-DTL", icon: Package },
  "/reports/item-detail": { category: "Stock & Items", code: "ITEM-DTL", icon: Package },
  "/reports/sale-purchase-by-item-category": { category: "Stock & Items", code: "SP-CAT", icon: Package },
  "/reports/stock-summary-by-item-category": { category: "Stock & Items", code: "STOCK-CAT", icon: Package },
  "/reports/item-wise-discount": { category: "Stock & Items", code: "ITEM-DISC", icon: Percent },

  "/reports/gst-report": { category: "Taxes", code: "GST-REP", icon: Percent },
  "/reports/gst-rate-report": { category: "Taxes", code: "GST-RATE", icon: Percent },
  "/reports/form-27eq": { category: "Taxes", code: "F-27EQ", icon: FileText },
  "/reports/tcs-receivable": { category: "Taxes", code: "TCS-REC", icon: CreditCard },
  "/reports/tds-payable": { category: "Taxes", code: "TDS-PAY", icon: CreditCard },
  "/reports/tds-receivable": { category: "Taxes", code: "TDS-REC", icon: CreditCard },

  "/reports/expense": { category: "Expenses", code: "EXP-01", icon: CreditCard },
  "/reports/expense-category-report": { category: "Expenses", code: "EXP-CAT", icon: CreditCard },
  "/reports/expense-item-report": { category: "Expenses", code: "EXP-ITEM", icon: CreditCard },

  "/reports/payment-in": { category: "Accounts", code: "PAYIN-REP", icon: IndianRupee },
  "/reports/payment-out": { category: "Accounts", code: "PAYOUT-REP", icon: IndianRupee },
};

function getAllValidReports() {
  return reports.filter((r) => !HIDDEN_REPORT_PATHS.has(r.path));
}

function loadInitialEnabledPaths() {
  try {
    const saved = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed);
      }
    }
  } catch (e) {
    console.error(e);
  }
  return new Set(getAllValidReports().map((r) => r.path));
}

export default function ReportsNavDropdown() {
  const location = useLocation();
  const navigate = useNavigate();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerSearch, setDrawerSearch] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [enabledPaths, setEnabledPaths] = useState(loadInitialEnabledPaths);

  const activeCardRef = useRef(null);

  const activeReport = findReportByPath(location.pathname);
  const activePath = activeReport ? activeReport.path : null;

  // Save visibility changes to localStorage
  const saveVisibility = (newSet) => {
    setEnabledPaths(newSet);
    try {
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleReportVisibility = (path) => {
    const next = new Set(enabledPaths);
    if (next.has(path)) {
      if (next.size > 1) {
        next.delete(path);
      }
    } else {
      next.add(path);
    }
    saveVisibility(next);
  };

  const enableAll = () => {
    const allPaths = new Set(getAllValidReports().map((r) => r.path));
    saveVisibility(allPaths);
  };

  const disableAllExceptActive = () => {
    const current = activePath || reports[0].path;
    saveVisibility(new Set([current]));
  };

  const toggleCategory = (catName) => {
    const catReports = getAllValidReports().filter((r) => {
      const meta = REPORT_METADATA[r.path] || { category: "Sales & Orders" };
      return meta.category === catName;
    });
    const allCatPaths = catReports.map((r) => r.path);
    const areAllEnabled = allCatPaths.every((p) => enabledPaths.has(p));

    const next = new Set(enabledPaths);
    if (areAllEnabled) {
      // Uncheck all in category (guaranteeing at least 1 report remains enabled)
      allCatPaths.forEach((p) => {
        if (next.size > 1) next.delete(p);
      });
    } else {
      // Check all in category
      allCatPaths.forEach((p) => next.add(p));
    }
    saveVisibility(next);
  };

  // Sync category filter to active report's category
  useEffect(() => {
    if (activePath && REPORT_METADATA[activePath]) {
      const targetCategory = REPORT_METADATA[activePath].category;
      if (categoryFilter !== "All" && categoryFilter !== targetCategory) {
        setCategoryFilter(targetCategory);
      }
    }
  }, [activePath]);

  // Smoothly scroll active card into view
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activePath, categoryFilter, enabledPaths]);

  // Close drawer on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSettingsOpen]);

  const allReportsList = useMemo(() => getAllValidReports(), []);

  // Filtered reports visible in main carousel
  const visibleMenuReports = useMemo(() => {
    return allReportsList.filter((r) => {
      // Must be enabled by user
      if (!enabledPaths.has(r.path)) return false;

      const meta = REPORT_METADATA[r.path] || { category: "Sales & Orders", code: r.slug, icon: FileText };
      const isCategoryMatch = categoryFilter === "All" || meta.category === categoryFilter;
      const isSearchMatch =
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meta.category.toLowerCase().includes(searchQuery.toLowerCase());

      return isCategoryMatch && isSearchMatch;
    });
  }, [allReportsList, enabledPaths, categoryFilter, searchQuery]);

  // Reports grouped by category for drawer view
  const drawerGroupedReports = useMemo(() => {
    const groups = {};
    CATEGORIES.filter((c) => c !== "All").forEach((cat) => {
      groups[cat] = [];
    });

    allReportsList.forEach((r) => {
      const meta = REPORT_METADATA[r.path] || { category: "Sales & Orders", code: r.slug, icon: FileText };
      const cat = meta.category || "Sales & Orders";
      if (!groups[cat]) groups[cat] = [];

      const matchSearch =
        !drawerSearch ||
        r.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        meta.code.toLowerCase().includes(drawerSearch.toLowerCase()) ||
        cat.toLowerCase().includes(drawerSearch.toLowerCase());

      if (matchSearch) {
        groups[cat].push({ ...r, meta });
      }
    });

    return groups;
  }, [allReportsList, drawerSearch]);

  const go = (r) => {
    if (r.path !== location.pathname) {
      navigate(r.path);
    }
  };

  const enabledCount = enabledPaths.size;
  const totalCount = allReportsList.length;

  return (
    <div className="space-y-2 mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* ── 1. FIRST ROW: SEARCH, VIEWING ACTIVE REPORT, & SETTINGS BUTTON ── */}
      <div className="flex items-center justify-between gap-3 bg-white p-2 sm:px-3 sm:py-2 rounded-2xl border border-slate-200/80 shadow-2xs flex-wrap">
        {/* Left: Quick Search */}
        <div className="relative flex-1 min-w-[180px] sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reports..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs font-medium transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer p-0.5"
            >
              ✕
            </button>
          )}
        </div>

        {/* Center: Viewing Active Report */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-500 font-semibold truncate">
          <Eye size={13} className="text-blue-600 shrink-0" />
          <span className="text-slate-400 font-medium">Viewing:</span>
          <strong className="text-slate-800 font-bold truncate max-w-[180px] sm:max-w-[320px]">
            {activeReport ? activeReport.title : "Report"}
          </strong>
        </div>

        {/* Right: ⚙️ Report Menu Settings Button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          title="Configure Report Menu & Visibility"
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 shadow-2xs cursor-pointer flex-shrink-0"
        >
          <Settings2 size={14} className="text-blue-600" />
          <span className="hidden sm:inline">Settings</span>
          <span className="text-[10.5px] font-bold px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
            {enabledCount}/{totalCount}
          </span>
        </button>
      </div>

      {/* ── 2. SECOND ROW: CATEGORY TABS STRIP ── */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto paysplitx-scrollbar-light max-w-full">
        {CATEGORIES.map((cat) => {
          const isSelected = categoryFilter === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${isSelected
                ? "bg-white text-blue-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── 2. HORIZONTAL SCROLLABLE REPORT CARDS SELECTOR STRIP ── */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 paysplitx-scrollbar-light">
        {visibleMenuReports.length === 0 ? (
          <div className="py-2 px-3 text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200 flex items-center gap-2">
            <AlertTriangle size={13} className="text-amber-500" />
            <span>No enabled reports in this category. Click <strong>Settings</strong> to enable reports.</span>
          </div>
        ) : (
          visibleMenuReports.map((doc) => {
            const isSelected = doc.path === activePath;
            const meta = REPORT_METADATA[doc.path] || { category: "Sales & Orders", code: doc.slug, icon: FileText };
            const Icon = meta.icon || FileText;

            return (
              <button
                key={doc.path}
                ref={isSelected ? activeCardRef : null}
                type="button"
                onClick={() => go(doc)}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-left transition-all whitespace-nowrap shrink-0 cursor-pointer select-none ${isSelected
                  ? "bg-blue-50/70 border-blue-500 shadow-sm ring-2 ring-blue-500/15"
                  : "bg-white hover:bg-slate-50 border-slate-200 shadow-xs hover:border-slate-300"
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition flex-shrink-0 ${isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-100 text-slate-600"
                    }`}
                >
                  <Icon size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{doc.title}</div>
                  <div className={`text-[10.5px] font-mono font-bold ${isSelected ? "text-blue-600" : "text-slate-400"}`}>
                    {meta.code}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* ── 3. RIGHT-SIDE SLIDE-OVER DRAWER MODAL VIEW ── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsSettingsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Right Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">

              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
                    <SlidersHorizontal size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-slate-900 truncate">
                      Report Menu Visibility
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate">
                      Enable or disable items in the main report menu
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center border border-slate-200 transition cursor-pointer shadow-2xs"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Search & Quick Filter Toolbar */}
              <div className="p-3.5 border-b border-slate-100 bg-white space-y-2.5 flex-shrink-0">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Filter reports by name or category..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {drawerSearch && (
                    <button
                      type="button"
                      onClick={() => setDrawerSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Quick Selection Buttons */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={enableAll}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-100 transition cursor-pointer"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={disableAllExceptActive}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold border border-slate-200 transition cursor-pointer"
                    >
                      Disable Others
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-slate-500">
                    <strong className="text-blue-600">{enabledCount}</strong> of {totalCount} Visible
                  </span>
                </div>
              </div>

              {/* Drawer Content: Grouped Reports with Toggles */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 paysplitx-scrollbar-light">
                {Object.entries(drawerGroupedReports).map(([catName, list]) => {
                  if (list.length === 0) return null;
                  const allCatEnabled = list.every((r) => enabledPaths.has(r.path));
                  const someCatEnabled = list.some((r) => enabledPaths.has(r.path));

                  return (
                    <div key={catName} className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
                      {/* Category Header with Master Category Toggle */}
                      <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-700 truncate">
                            {catName}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/70 text-slate-600">
                            {list.filter((r) => enabledPaths.has(r.path)).length}/{list.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleCategory(catName)}
                          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {allCatEnabled ? "Disable All" : "Enable All"}
                        </button>
                      </div>

                      {/* Items List */}
                      <div className="divide-y divide-slate-100">
                        {list.map((r) => {
                          const isEnabled = enabledPaths.has(r.path);
                          const isCurrentActive = r.path === activePath;
                          const Icon = r.meta.icon || FileText;

                          return (
                            <div
                              key={r.path}
                              onClick={() => toggleReportVisibility(r.path)}
                              className={`p-3 flex items-center justify-between gap-3 transition cursor-pointer select-none hover:bg-slate-50/80 ${isEnabled ? "bg-white" : "bg-slate-50/40 opacity-70"
                                }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${isEnabled ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-100 text-slate-400"
                                  }`}>
                                  <Icon size={15} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                                    <span>{r.title}</span>
                                    {isCurrentActive && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        CURRENT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10.5px] font-mono text-slate-400">
                                    {r.meta.code}
                                  </div>
                                </div>
                              </div>

                              {/* Toggle Switch */}
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => toggleReportVisibility(r.path)}
                                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${isEnabled ? "bg-blue-600" : "bg-slate-300"
                                    }`}
                                >
                                  <span
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isEnabled ? "left-[18px]" : "left-0.5"
                                      }`}
                                  />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 flex-shrink-0">
                <p className="text-[11px] text-slate-400">
                  Settings are automatically saved
                </p>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm shadow-blue-500/20 transition cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
