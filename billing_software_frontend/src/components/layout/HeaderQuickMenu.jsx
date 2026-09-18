import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ReceiptText,
  ShoppingCart,
  Wallet,
  IndianRupee,
  RotateCcw,
  FileText,
  FileMinus,
  UserPlus,
  PackagePlus,
  Truck,
  Store,
  Search,
  X,
  Sparkles,
  Command,
  ChevronDown,
  ArrowRight
} from "lucide-react";

export default function HeaderQuickMenu({
  isOpen,
  setIsOpen,
  navigate,
  role = "admin",
  containerRef
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, setIsOpen]);

  const actionSections = [
    {
      category: "Sales & Invoicing",
      color: "emerald",
      badge: "Inward Realization",
      items: [
        {
          name: "New Sale Invoice",
          sub: "Create GST tax invoice & print",
          path: "/sales/add",
          shortcut: "ALT + S",
          icon: ReceiptText,
          accent: "bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white"
        },
        {
          name: "Payment-In Receipt",
          sub: "Collect customer outstanding dues",
          path: "/sales/payment-in",
          shortcut: "ALT + I",
          icon: IndianRupee,
          accent: "bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white"
        },
        {
          name: "Estimate / Quotation",
          sub: "Draft and send sales quote",
          path: "/sales/estimate-quotation",
          shortcut: "ALT + Q",
          icon: FileText,
          accent: "bg-sky-50 text-sky-600 border-sky-200 group-hover:bg-sky-600 group-hover:text-white"
        },
        {
          name: "Sale Return / Cr Note",
          sub: "Goods return & credit adjustment",
          path: "/sales/credit-note/add",
          shortcut: "ALT + R",
          icon: RotateCcw,
          accent: "bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white"
        }
      ]
    },
    {
      category: "Purchases & Expenses",
      color: "indigo",
      badge: "Outward Sourcing",
      items: [
        {
          name: "New Purchase Bill",
          sub: "Inward stock from supplier",
          path: "/purchases/new",
          shortcut: "ALT + P",
          icon: ShoppingCart,
          accent: "bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white"
        },
        {
          name: "Record Expense",
          sub: "Operational expense vouchers",
          path: "/purchases/expenses/add",
          shortcut: "ALT + E",
          icon: Wallet,
          accent: "bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-600 group-hover:text-white"
        },
        {
          name: "Payment-Out Voucher",
          sub: "Supplier debit disbursements",
          path: "/purchases/payment-out",
          shortcut: "ALT + O",
          icon: IndianRupee,
          accent: "bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white"
        },
        {
          name: "Purchase Return / Dr Note",
          sub: "Debit note to vendor partner",
          path: "/purchases/debit-note/add",
          shortcut: "ALT + L",
          icon: FileMinus,
          accent: "bg-amber-50 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white"
        }
      ]
    },
    {
      category: "Customers & Logistics",
      color: "violet",
      badge: "Directory & Transport",
      items: [
        {
          name: "Add Customer",
          sub: "Client party profile & credit limit",
          path: "/customer",
          shortcut: "ALT + C",
          icon: UserPlus,
          accent: "bg-violet-50 text-violet-600 border-violet-200 group-hover:bg-violet-600 group-hover:text-white"
        },
        {
          name: "Add Product SKU",
          sub: "Item catalog, pricing & stock",
          path: "/products",
          shortcut: "ALT + D",
          icon: PackagePlus,
          accent: "bg-cyan-50 text-cyan-600 border-cyan-200 group-hover:bg-cyan-600 group-hover:text-white"
        },
        {
          name: "POS Counter Billing",
          sub: "Rapid barcode & cash register POS",
          path: "/billing",
          shortcut: "ALT + B",
          icon: Store,
          accent: "bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white"
        },
        {
          name: "Generate E-Way Bill",
          sub: "GST goods transport pass",
          path: "/e-way",
          shortcut: "ALT + W",
          icon: Truck,
          accent: "bg-teal-50 text-teal-600 border-teal-200 group-hover:bg-teal-600 group-hover:text-white"
        }
      ]
    }
  ];

  // Filter actions based on search
  const filteredSections = useMemo(() => {
    if (!search.trim()) return actionSections;
    const q = search.toLowerCase();
    return actionSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.sub.toLowerCase().includes(q) ||
            item.shortcut.toLowerCase().includes(q)
        )
      }))
      .filter((sec) => sec.items.length > 0);
  }, [search]);

  const handleActionClick = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* ── TRIGGER BUTTON ── */}
      <div className="flex items-center gap-2">
        {/* Quick POS Terminal for instant checkout */}
        {(role === "admin" || role === "cashier") && (
          <button
            type="button"
            onClick={() => navigate("/billing")}
            title="Fast POS Counter (Alt + B)"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition cursor-pointer shadow-xs"
          >
            <Store size={14} className="text-emerald-600" />
            <span>POS Counter</span>
          </button>
        )}

        {/* Primary Quick Actions Command Palette Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Quick Actions Command Menu (Ctrl + Enter)"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-sm select-none ${
            isOpen
              ? "bg-indigo-600 text-white shadow-glow-brand ring-2 ring-indigo-500/30"
              : "bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white shadow-glow-brand"
          }`}
        >
          <Plus size={15} strokeWidth={2.6} className={isOpen ? "rotate-45 transition-transform" : "transition-transform"} />
          <span>Quick Actions</span>
          <kbd className="hidden md:inline-block text-[10px] font-mono bg-white/20 text-white px-1.5 py-0.2 rounded font-semibold">
            Ctrl+↵
          </kbd>
          <ChevronDown
            size={13}
            className={`text-white/80 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* ── ADVANCED MEGA-MENU POPOVER ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute right-0 top-12 w-[760px] max-w-[95vw] bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden z-50"
          >
            {/* 1. Header Toolbar with Live Filter */}
            <div className="p-4 bg-slate-900 text-white flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 flex items-center justify-center">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black tracking-wide font-display uppercase">
                      Executive Command Menu
                    </h3>
                    <p className="text-[11px] text-slate-300 font-medium">
                      One-click transactional shortcuts & management actions
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Menu (Esc)"
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Live Action Search Filter */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by action name, purpose, or shortcut (e.g. 'sale', 'payment', 'stock')..."
                  className="w-full bg-white/10 border border-white/15 focus:border-indigo-400 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none transition shadow-inner"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* 2. Categorized Quick Action Grid */}
            <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto paysplitx-scrollbar-light bg-white">
              {filteredSections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {filteredSections.map((sec, sIdx) => (
                    <div key={sIdx} className="space-y-2.5">
                      {/* Section Header - No text length restriction */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 gap-2">
                        <span className="text-[11px] font-black text-slate-800 font-display tracking-tight uppercase leading-snug break-words">
                          {sec.category}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0 whitespace-nowrap">
                          {sec.badge}
                        </span>
                      </div>

                      {/* Section Items */}
                      <div className="space-y-1.5">
                        {sec.items.map((item, iIdx) => {
                          const IconComponent = item.icon;
                          return (
                            <div
                              key={iIdx}
                              onClick={() => handleActionClick(item.path)}
                              className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-300 cursor-pointer transition flex items-start justify-between gap-2.5 group shadow-2xs hover:shadow-xs"
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div
                                  className={`w-7 h-7 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${item.accent}`}
                                >
                                  <IconComponent size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight break-words">
                                    {item.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 leading-snug break-words mt-0.5">
                                    {item.sub}
                                  </div>
                                </div>
                              </div>

                              <span className="text-[9.5px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md flex-shrink-0 group-hover:border-indigo-300 group-hover:text-indigo-600 transition ml-1 self-start">
                                {item.shortcut}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white">
                  <Command size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-700">No actions match "{search}"</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Try searching for sale, purchase, customer, or expense.</p>
                </div>
              )}
            </div>

            {/* 3. Keyboard Shortcut Reference Footer */}
            <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Shortcuts:</span>
                <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                  Ctrl + Enter
                </span>
                <span className="text-slate-400">Toggle</span>
                <span className="font-mono text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                  Esc
                </span>
                <span className="text-slate-400">Close</span>
              </div>

              <span className="text-[10px] font-semibold text-indigo-600 hidden sm:inline">
                PaySplitX Executive Suite ⚡
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
