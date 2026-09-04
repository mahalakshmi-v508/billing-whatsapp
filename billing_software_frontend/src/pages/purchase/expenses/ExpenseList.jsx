import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  RefreshCw,
  FileText,
  AlertTriangle,
  X,
  Printer,
  FileSpreadsheet,
  Layers,
  Package,
  FolderPlus,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  TrendingUp,
  Receipt,
  ArrowUpRight,
  SlidersHorizontal,
  Folder,
  Tag
} from "lucide-react";

export default function ExpenseList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // View mode tab: "CATEGORY" or "ITEMS"
  const [activeTab, setActiveTab] = useState("CATEGORY");

  // Data states
  const [categories, setCategories] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Search queries
  const [leftSearchQuery, setLeftSearchQuery] = useState("");
  const [rightSearchQuery, setRightSearchQuery] = useState("");

  // Menus & Modals
  const [activeTxMenuId, setActiveTxMenuId] = useState(null);
  const [activeCatMenuId, setActiveCatMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Add / Edit Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catNameInput, setCatNameInput] = useState("");
  const [catTypeInput, setCatTypeInput] = useState("Indirect Expense");
  const [savingCat, setSavingCat] = useState(false);

  // Format Helper: DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const fmtCurrency = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Load Categories, Items, and Expenses
  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, itemRes, expRes] = await Promise.all([
        api.get(`/expense/categories?company_id=${companyId}&admin_id=${adminId || 0}`),
        api.get(`/expense/items?company_id=${companyId}`),
        api.get(`/expense/list?company_id=${companyId}&admin_id=${adminId || 0}`)
      ]);

      let cats = [];
      if (catRes.data?.status && Array.isArray(catRes.data.data)) {
        cats = catRes.data.data;
        setCategories(cats);
        if (!selectedCategory && cats.length > 0) {
          setSelectedCategory(cats[0]);
        }
      }

      if (itemRes.data?.status && Array.isArray(itemRes.data.data)) {
        setItemsCatalog(itemRes.data.data);
      }

      if (expRes.data?.status && Array.isArray(expRes.data.data)) {
        setExpenses(expRes.data.data);
      }
    } catch (err) {
      console.error("Error loading expenses data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, adminId]);

  // Close menus on outside click safely
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.closest("[data-menu-container]")) return;
      setActiveTxMenuId(null);
      setActiveCatMenuId(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Left Categories List
  const filteredCategories = useMemo(() => {
    if (!leftSearchQuery.trim()) return categories;
    const q = leftSearchQuery.toLowerCase().trim();
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [categories, leftSearchQuery]);

  // Filtered Left Items List
  const filteredItemsCatalog = useMemo(() => {
    if (!leftSearchQuery.trim()) return itemsCatalog;
    const q = leftSearchQuery.toLowerCase().trim();
    return itemsCatalog.filter((item) => (item.item_name || "").toLowerCase().includes(q));
  }, [itemsCatalog, leftSearchQuery]);

  // Total Company Expense Sum
  const totalCompanyExpenses = useMemo(() => {
    return expenses.reduce((acc, e) => acc + Number(e.total_amount || 0), 0);
  }, [expenses]);

  // Filtered Right Transactions List
  const filteredTransactions = useMemo(() => {
    let list = expenses;

    if (activeTab === "CATEGORY" && selectedCategory) {
      list = list.filter(
        (e) =>
          Number(e.category_id) === Number(selectedCategory.id) ||
          (e.category_name || "").toLowerCase() === (selectedCategory.name || "").toLowerCase()
      );
    } else if (activeTab === "ITEMS" && selectedItem) {
      list = list.filter((e) => {
        const itemsArr = Array.isArray(e.items)
          ? e.items
          : typeof e.items === "string"
          ? JSON.parse(e.items || "[]")
          : [];
        return itemsArr.some((i) => (i.item_name || i.item || "").toLowerCase() === (selectedItem.item_name || "").toLowerCase());
      });
    }

    if (rightSearchQuery.trim()) {
      const q = rightSearchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.expense_no || "").toLowerCase().includes(q) ||
          (e.party_name || "").toLowerCase().includes(q) ||
          (e.payment_type || "").toLowerCase().includes(q) ||
          String(e.total_amount || "").includes(q)
      );
    }

    return list;
  }, [expenses, activeTab, selectedCategory, selectedItem, rightSearchQuery]);

  // Calculate Header Summary Totals for Active Selection
  const { currentTotal, currentBalance } = useMemo(() => {
    let tot = 0;
    let bal = 0;
    filteredTransactions.forEach((e) => {
      tot += Number(e.total_amount || 0);
      bal += Number(e.balance_amount || 0);
    });
    return { currentTotal: tot, currentBalance: bal };
  }, [filteredTransactions]);

  // Save Category (Create / Edit)
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catNameInput.trim()) {
      alert("Please enter a category name");
      return;
    }

    setSavingCat(true);
    try {
      if (editingCategory) {
        const res = await api.post("/expense/category/update", {
          id: editingCategory.id,
          name: catNameInput.trim(),
          type: catTypeInput
        });
        if (res.data.status) {
          fetchData();
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }
      } else {
        const res = await api.post("/expense/category/create", {
          name: catNameInput.trim(),
          type: catTypeInput,
          company_id: companyId,
          admin_id: adminId
        });
        if (res.data.status) {
          fetchData();
          setCategoryModalOpen(false);
          if (res.data.data) setSelectedCategory(res.data.data);
        }
      }
    } catch (err) {
      console.error("Error saving category:", err);
      alert("Failed to save category");
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    try {
      const res = await api.post("/expense/category/delete", { id: cat.id });
      if (res.data.status) {
        fetchData();
        if (selectedCategory?.id === cat.id) {
          setSelectedCategory(null);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  // Delete Expense Voucher
  const confirmDeleteExpense = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/expense/delete", { id: deleteTarget.id });
      if (res.data.status) {
        setDeleteTarget(null);
        fetchData();
      } else {
        alert(res.data.message || "Failed to delete expense");
      }
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = filteredTransactions.map((item, idx) => ({
      "S.No": idx + 1,
      "Date": formatDateDMY(item.expense_date),
      "Expense No": item.expense_no || item.id,
      "Party Name": item.party_name || "-",
      "Category": item.category_name || "-",
      "Payment Type": item.payment_type || "Cash",
      "Amount": item.total_amount || 0,
      "Balance": item.balance_amount || 0,
      "Status": Number(item.balance_amount || 0) <= 0 ? "Paid" : "Partial"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_${selectedCategory?.name || "all"}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1520px] mx-auto min-h-screen space-y-4 bg-[#f8fafc] font-sans text-slate-800">
      
      {/* ── 1. EXECUTIVE COMMAND HEADER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Receipt size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Expense Management</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {expenses.length} vouchers
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Track operational expenses, categorize overheads and monitor spending breakdown
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-amber-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Export Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            title="Print View"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Print</span>
          </button>

          {/* Primary CTA */}
          <button
            onClick={() => navigate("/purchases/expenses/add")}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── 2. SEGMENTED TAB SWITCHER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex items-center gap-2 w-fit">
        <button
          onClick={() => setActiveTab("CATEGORY")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition cursor-pointer ${
            activeTab === "CATEGORY"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Layers size={14} />
          <span>Expense Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ITEMS")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition cursor-pointer ${
            activeTab === "ITEMS"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Package size={14} />
          <span>Catalog Items ({itemsCatalog.length})</span>
        </button>
      </div>

      {/* ── 3. DUAL-PANE SPLIT WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── LEFT MASTER PANEL (4 Cols) ── */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col max-h-[750px]">
          
          {/* Left Header */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                {activeTab === "CATEGORY" ? "Categories Directory" : "Items Master"}
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {activeTab === "CATEGORY" ? categories.length : itemsCatalog.length} records
              </span>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={activeTab === "CATEGORY" ? "Search categories..." : "Search items..."}
                value={leftSearchQuery}
                onChange={(e) => setLeftSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Left List Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {activeTab === "CATEGORY" ? (
              filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No categories found.
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const isMenuOpen = activeCatMenuId === cat.id;
                  const totalAmt = Number(cat.total_amount || 0);
                  const sharePct = totalCompanyExpenses > 0 ? Math.round((totalAmt / totalCompanyExpenses) * 100) : 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? "bg-amber-50/80 border border-amber-200/90 shadow-xs"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <Folder size={14} className={isSelected ? "text-amber-600" : "text-slate-400"} />
                          <span className={`text-xs font-bold truncate ${isSelected ? "text-amber-950" : "text-slate-800"}`}>
                            {cat.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                            {cat.type || "Indirect Expense"}
                          </span>
                          {sharePct > 0 && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              {sharePct}% share
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-black ${isSelected ? "text-amber-900" : "text-slate-900"}`}>
                          ₹ {totalAmt.toLocaleString("en-IN")}
                        </span>

                        {/* 3-dots Menu */}
                        <div data-menu-container className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCatMenuId((prev) => (prev === cat.id ? null : cat.id));
                            }}
                            className="w-6 h-6 rounded-md hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            <MoreVertical size={13} />
                          </button>

                          {isMenuOpen && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(cat);
                                  setCatNameInput(cat.name);
                                  setCatTypeInput(cat.type || "Indirect Expense");
                                  setCategoryModalOpen(true);
                                  setActiveCatMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Pencil size={12} className="text-blue-600" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat);
                                  setActiveCatMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer border-t border-slate-100 mt-0.5 pt-1"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* Items Catalog */
              filteredItemsCatalog.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  No items found in catalog.
                </div>
              ) : (
                filteredItemsCatalog.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`p-3 rounded-xl transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-amber-50/80 border border-amber-200/90 shadow-xs"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Tag size={13} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-800">{item.item_name}</span>
                        </div>
                        {item.category_name && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{item.category_name}</span>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-slate-900">
                        ₹ {fmtCurrency(item.price || 0)}
                      </span>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Left Footer: + New Category Button */}
          <div className="p-3 border-t border-slate-200 bg-slate-50/70">
            <button
              onClick={() => {
                setEditingCategory(null);
                setCatNameInput("");
                setCatTypeInput("Indirect Expense");
                setCategoryModalOpen(true);
              }}
              className="w-full py-2 bg-white hover:bg-slate-100 border border-dashed border-amber-400/80 text-amber-700 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FolderPlus size={14} />
              <span>+ Create New Category</span>
            </button>
          </div>
        </div>

        {/* ── RIGHT DETAIL WORKSPACE (8 Cols) ── */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Active Detail Header & KPI Blocks */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Scope</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                  {activeTab === "CATEGORY" ? selectedCategory?.type || "Direct Expense" : "Expense Item"}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                {activeTab === "CATEGORY"
                  ? selectedCategory?.name || "All Expenses"
                  : selectedItem?.item_name || "All Items"}
              </h2>
            </div>

            {/* KPI Cards */}
            <div className="flex items-center gap-3">
              <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-2.5 text-right">
                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Spent</span>
                <span className="text-base font-black text-rose-900">₹ {fmtCurrency(currentTotal)}</span>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2.5 text-right">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Balance Due</span>
                <span className="text-base font-black text-amber-900">₹ {fmtCurrency(currentBalance)}</span>
              </div>
            </div>
          </div>

          {/* Search & Transaction Controls */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search voucher #, party, amount..."
                value={rightSearchQuery}
                onChange={(e) => setRightSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
              {rightSearchQuery && (
                <button onClick={() => setRightSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-slate-500">
              {filteredTransactions.length} vouchers recorded
            </span>
          </div>

          {/* Transaction Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Date</th>
                    <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Voucher #</th>
                    <th className="py-3 px-5 border-r border-slate-200/70 whitespace-nowrap">Party / Supplier</th>
                    <th className="py-3 px-4 border-r border-slate-200/70 whitespace-nowrap">Payment Mode</th>
                    <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Total Amount</th>
                    <th className="py-3 px-5 border-r border-slate-200/70 text-right whitespace-nowrap">Balance Due</th>
                    <th className="py-3 px-4 border-r border-slate-200/70 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <RefreshCw size={22} className="animate-spin text-amber-500 mx-auto mb-2" />
                        <span>Loading expense vouchers...</span>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-14 text-center text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
                          <Receipt size={22} />
                        </div>
                        <p className="font-extrabold text-slate-700 text-sm">No Expense Transactions Found</p>
                        <p className="text-xs text-slate-400 mt-1">No vouchers recorded for this category yet.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((item, idx) => {
                      const isPaid = Number(item.balance_amount || 0) <= 0;
                      const isMenuOpen = activeTxMenuId === item.id;

                      return (
                        <tr key={item.id || idx} className="group hover:bg-amber-50/30 transition-colors duration-150 text-slate-700">
                          {/* DATE */}
                          <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap text-slate-600 font-semibold">
                            {formatDateDMY(item.expense_date)}
                          </td>

                          {/* VOUCHER NO */}
                          <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                              #{item.expense_no || item.id}
                            </span>
                          </td>

                          {/* PARTY NAME */}
                          <td className="py-3.5 px-5 border-r border-slate-200/70 whitespace-nowrap font-bold text-slate-900">
                            {item.party_name || "-"}
                          </td>

                          {/* PAYMENT TYPE */}
                          <td className="py-3.5 px-4 border-r border-slate-200/70 whitespace-nowrap">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200 uppercase">
                              {item.payment_type || "Cash"}
                            </span>
                          </td>

                          {/* TOTAL AMOUNT */}
                          <td className="py-3.5 px-5 border-r border-slate-200/70 font-extrabold text-slate-900 text-right whitespace-nowrap">
                            ₹ {fmtCurrency(item.total_amount)}
                          </td>

                          {/* BALANCE DUE */}
                          <td className={`py-3.5 px-5 border-r border-slate-200/70 font-bold text-right whitespace-nowrap ${
                            Number(item.balance_amount || 0) > 0 ? "text-rose-600" : "text-emerald-700"
                          }`}>
                            ₹ {fmtCurrency(item.balance_amount)}
                          </td>

                          {/* STATUS */}
                          <td className="py-3.5 px-4 border-r border-slate-200/70 text-center whitespace-nowrap font-bold">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Partial
                              </span>
                            )}
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => navigate(`/purchases/expenses/edit/${item.id}`)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Edit Expense"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Delete Expense"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ── MODAL: CREATE / EDIT CATEGORY ── */}
      {categoryModalOpen && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
          onClick={() => setCategoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingCategory ? "Edit Category" : "Create Expense Category"}
                  </h3>
                  <p className="text-[11px] text-slate-500">Group and classify your overheads</p>
                </div>
              </div>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Office Rent, Fuel, Electricity"
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Classification *
                </label>
                <select
                  value={catTypeInput}
                  onChange={(e) => setCatTypeInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs outline-none focus:border-amber-600 transition bg-white"
                >
                  <option value="Indirect Expense">Indirect Expense (Overheads, Utilities)</option>
                  <option value="Direct Expense">Direct Expense (COGS, Raw Materials)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {savingCat ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE EXPENSE CONFIRMATION ── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-rose-200 bg-rose-50/70 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">Delete Expense Voucher</h3>
                <p className="text-[11px] text-rose-600 font-medium">This action will remove the record permanently</p>
              </div>
            </div>

            <div className="p-6 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete Expense voucher <b>#{deleteTarget.expense_no || deleteTarget.id}</b> ({deleteTarget.category_name}) for amount <b>₹{fmtCurrency(deleteTarget.total_amount)}</b>?
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                disabled={deleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Voucher"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}