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
  Tag,
  Share2,
  Edit,
  Eye,
  Building2,
  CreditCard,
  ShieldAlert,
  Wallet,
  LayoutGrid
} from "lucide-react";
import ShareTransactionPopover from "../../../components/ShareTransactionPopover";

export default function ExpenseList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Companies state
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    user?.company_id || localStorage.getItem("selected_company_id") || ""
  );

  // View Mode: "all" (Primary: All Expense Vouchers) | "split" (Secondary: By Category / Item)
  const [viewMode, setViewMode] = useState("all");

  // Filter tab when in split view: "CATEGORY" or "ITEMS"
  const [activeTab, setActiveTab] = useState("CATEGORY");

  // Status Filter for vouchers: "all" | "paid" | "unpaid"
  const [statusFilter, setStatusFilter] = useState("all");

  // Data states
  const [categories, setCategories] = useState([]);
  const [itemsCatalog, setItemsCatalog] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Search queries
  const [search, setSearch] = useState("");
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Menus & Modals
  const [activeTxMenuId, setActiveTxMenuId] = useState(null);
  const [activeCatMenuId, setActiveCatMenuId] = useState(null);
  const [activeShareId, setActiveShareId] = useState(null);
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

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Load Companies
  useEffect(() => {
    if (!adminId) {
      setLoading(false);
      return;
    }
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (res.data?.status && Array.isArray(res.data.data)) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          const activeId = savedId || (res.data.data.length > 0 ? res.data.data[0].id : "");
          if (activeId) {
            setSelectedCompany(activeId);
            fetchData(activeId);
          } else {
            fetchData("");
          }
        } else {
          fetchData("");
        }
      })
      .catch(() => fetchData(""));
  }, [adminId]);

  // Load Categories, Items, and Expenses for the given company
  const fetchData = async (cId = selectedCompany) => {
    setLoading(true);
    try {
      const compParam = cId ? `&company_id=${cId}` : "";
      const compParamQ = cId ? `?company_id=${cId}` : "";

      const [catRes, itemRes, expRes] = await Promise.all([
        api.get(`/expense/categories?admin_id=${adminId || 0}${compParam}`),
        api.get(`/expense/items${compParamQ}`),
        api.get(`/expense/list?admin_id=${adminId || 0}${compParam}`)
      ]);

      let cats = [];
      if (catRes.data?.status && Array.isArray(catRes.data.data)) {
        cats = catRes.data.data;
        setCategories(cats);
        if (cats.length > 0) {
          setSelectedCategory((prev) => {
            if (prev && cats.some((c) => c.id === prev.id)) {
              return cats.find((c) => c.id === prev.id);
            }
            return cats[0];
          });
        } else {
          setSelectedCategory(null);
        }
      } else {
        setCategories([]);
        setSelectedCategory(null);
      }

      if (itemRes.data?.status && Array.isArray(itemRes.data.data)) {
        const items = itemRes.data.data;
        setItemsCatalog(items);
        if (items.length > 0) {
          setSelectedItem((prev) => {
            if (prev && items.some((i) => i.id === prev.id)) {
              return items.find((i) => i.id === prev.id);
            }
            return items[0];
          });
        } else {
          setSelectedItem(null);
        }
      } else {
        setItemsCatalog([]);
        setSelectedItem(null);
      }

      if (expRes.data?.status && Array.isArray(expRes.data.data)) {
        setExpenses(expRes.data.data);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      console.error("Error loading expenses data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (cId) => {
    setSelectedCompany(cId);
    localStorage.setItem("selected_company_id", cId);
    fetchData(cId);
  };

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

  // 4 KPI Stat Calculations (PaySplitX standard matching Purchase Bills)
  const kpiMetrics = useMemo(() => {
    let totalSpent = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let pendingCount = 0;
    let settledCount = 0;

    expenses.forEach((e) => {
      const tot = Number(e.total_amount || 0);
      const bal = Number(e.balance_amount || 0);
      const paid = tot - bal;

      totalSpent += tot;
      totalPaid += paid > 0 ? paid : 0;
      totalPending += bal > 0 ? bal : 0;

      if (bal > 0) pendingCount++;
      else settledCount++;
    });

    return {
      totalSpent,
      totalPaid,
      totalPending,
      pendingCount,
      settledCount,
      categoriesCount: categories.length
    };
  }, [expenses, categories]);

  // Filtered Left Categories List
  const filteredCategories = useMemo(() => {
    if (!sidebarSearch.trim()) return categories;
    const q = sidebarSearch.toLowerCase().trim();
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [categories, sidebarSearch]);

  // Filtered Left Items List
  const filteredItemsCatalog = useMemo(() => {
    if (!sidebarSearch.trim()) return itemsCatalog;
    const q = sidebarSearch.toLowerCase().trim();
    return itemsCatalog.filter((item) => (item.item_name || "").toLowerCase().includes(q));
  }, [itemsCatalog, sidebarSearch]);

  // Filtered Bills / Vouchers
  const filteredTransactions = useMemo(() => {
    let list = expenses;

    if (viewMode === "split") {
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
          return itemsArr.some(
            (i) => (i.item_name || i.item || "").toLowerCase() === (selectedItem.item_name || "").toLowerCase()
          );
        });
      }
    }

    if (statusFilter === "paid") {
      list = list.filter((e) => Number(e.balance_amount || 0) <= 0);
    } else if (statusFilter === "unpaid") {
      list = list.filter((e) => Number(e.balance_amount || 0) > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.expense_no || "").toLowerCase().includes(q) ||
          (e.party_name || "").toLowerCase().includes(q) ||
          (e.category_name || "").toLowerCase().includes(q) ||
          (e.payment_type || "").toLowerCase().includes(q) ||
          String(e.total_amount || "").includes(q)
      );
    }

    return list;
  }, [expenses, viewMode, activeTab, selectedCategory, selectedItem, statusFilter, search]);

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
          company_id: selectedCompany || 0,
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
      Date: formatDateDMY(item.expense_date),
      "Expense No": item.expense_no || item.id,
      "Party Name": item.party_name || "-",
      Category: item.category_name || "-",
      "Payment Mode": item.payment_type || "Cash",
      Amount: item.total_amount || 0,
      Balance: item.balance_amount || 0,
      Status: Number(item.balance_amount || 0) <= 0 ? "Paid" : "Partial"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-6 min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 font-sans animate-in fade-in duration-300">
      
      {/* ── 1. EXECUTIVE COMMAND HEADER (Matches Purchase Bills Header) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-100 ring-2 ring-amber-50">
              <Receipt size={20} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Expense Management
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80">
              {expenses.length} Total Vouchers
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {categories.length} Categories
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track operational spending, vendor expenses, cost categories, and pending overhead settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-amber-600" : "text-slate-500"} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
            title="Print List"
          >
            <Printer size={14} className="text-slate-500" />
            <span>Print</span>
          </button>
          <button
            onClick={() => navigate("/purchases/expenses/add")}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-amber-200 transition transform active:scale-95 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── 2. METRIC STAT CARDS (PaySplitX 4-Card Strip matching Purchase Bills) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Expenses Volume */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalSpent)}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-amber-600 font-bold">{expenses.length}</span>
            <span>recorded expense vouchers</span>
          </div>
        </div>

        {/* Paid & Settled Outflow */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disbursed (Paid)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalPaid)}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">{kpiMetrics.settledCount}</span> fully settled vouchers
          </div>
        </div>

        {/* Outstanding Payables */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Balance</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 tracking-tight my-1 font-display">
            ₹{fmt(kpiMetrics.totalPending)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span>{kpiMetrics.pendingCount} vouchers awaiting settlement</span>
          </div>
        </div>

        {/* Active Expense Categories */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost Categories</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Folder size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
            {categories.length}
          </div>
          <div className="text-[11px] text-slate-500">
            <span className="font-semibold text-indigo-600">{itemsCatalog.length}</span> catalog items tracked
          </div>
        </div>
      </div>

      {/* ── 3. CONTROLS BAR: Firm Selection + View Mode Toggles (Matches Purchase Bills) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Company Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Firm:</span>
          {companies.length === 0 ? (
            <span className="text-xs text-slate-500 font-semibold">Primary Firm</span>
          ) : (
            companies.map((c) => {
              const isActive = String(selectedCompany) === String(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleCompanyChange(c.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-amber-600 text-white shadow-sm shadow-amber-200 ring-2 ring-amber-600/20"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>🏢</span>
                  <span>{c.company_name}</span>
                </button>
              );
            })
          )}
        </div>

        {/* View Mode Segmented Control: All Bills (Primary) vs By Category View (Secondary) */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setViewMode("all")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "all"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers size={14} />
            <span>All Expenses ({expenses.length})</span>
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "split"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LayoutGrid size={14} />
            <span>By Category View</span>
          </button>
        </div>
      </div>

      {/* ── 4. MAIN CONTENT VIEW ── */}
      {viewMode === "all" ? (
        /* ── VIEW A: ALL EXPENSES FLAT DIRECTORY TABLE (Primary default matching Purchase Bills) ── */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Table Header Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search by voucher #, party, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 font-medium transition shadow-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: "all", label: "All Expenses" },
                { id: "unpaid", label: "Pending Payment" },
                { id: "paid", label: "Settled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md ml-1">
                {filteredTransactions.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-16 text-center text-slate-400">
                <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto mb-2" />
                <span className="font-semibold text-xs">Loading expense vouchers...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Receipt size={28} />
                </div>
                <h3 className="font-bold text-sm text-slate-800">No Expense Vouchers Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No expense records matched your current search and status filters.
                </p>
                <button
                  onClick={() => navigate("/purchases/expenses/add")}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-xl font-bold text-xs shadow-sm"
                >
                  <Plus size={14} /> Record First Expense
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Voucher No</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Party / Vendor</th>
                    <th className="py-3.5 px-4">Mode</th>
                    <th className="py-3.5 px-4 text-right">Total (₹)</th>
                    <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTransactions.map((item) => {
                    const isPaid = Number(item.balance_amount || 0) <= 0;
                    return (
                      <tr key={item.id} className="hover:bg-amber-50/20 transition-colors text-slate-700">
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {formatDateDMY(item.expense_date)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100">
                            #{item.expense_no || item.id}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {item.category_name || "General"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{item.party_name || "Cash Entry"}</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold uppercase">
                            {item.payment_type || "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ₹{fmt(item.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            ₹{fmt(item.balance_amount)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid ? "bg-emerald-600" : "bg-amber-600"
                              }`}
                            />
                            {isPaid ? "Settled" : "Pending"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => navigate(`/purchases/expenses/edit/${item.id}`)}
                              title="Edit Voucher"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => navigate(`/invoice/${item.expense_no || item.id}`)}
                              title="Print Receipt"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveShareId(activeShareId === item.id ? null : item.id);
                                }}
                                title="Share Voucher"
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <Share2 size={14} />
                              </button>
                              <ShareTransactionPopover
                                isOpen={activeShareId === item.id}
                                onClose={() => setActiveShareId(null)}
                                transaction={item}
                                type="Expense"
                              />
                            </div>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              title="Delete Voucher"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* ── VIEW B: MASTER-DETAIL BY CATEGORY / ITEM (Secondary view matching Purchase By Supplier) ── */
        <div className="grid grid-cols-1 lg:grid-cols-[330px_1fr] gap-6 items-start">
          
          {/* LEFT: CATEGORIES & ITEMS SIDEBAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            
            {/* Category / Item Segment Pill Switcher */}
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab("CATEGORY")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
                  activeTab === "CATEGORY"
                    ? "bg-white text-amber-800 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Categories ({categories.length})
              </button>
              <button
                onClick={() => setActiveTab("ITEMS")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition text-center cursor-pointer ${
                  activeTab === "ITEMS"
                    ? "bg-white text-amber-800 shadow-xs border border-slate-200"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Catalog ({itemsCatalog.length})
              </button>
            </div>

            {/* Sidebar Top: Search & Add */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder={activeTab === "CATEGORY" ? "Search categories..." : "Search items..."}
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white font-medium transition"
                />
                {sidebarSearch && (
                  <button
                    onClick={() => setSidebarSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCatNameInput("");
                  setCatTypeInput("Indirect Expense");
                  setCategoryModalOpen(true);
                }}
                className="w-full py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>+ Add Category</span>
              </button>
            </div>

            {/* Sidebar List Items */}
            <div className="max-h-[580px] overflow-y-auto divide-y divide-slate-100">
              {activeTab === "CATEGORY" ? (
                filteredCategories.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No categories found.
                  </div>
                ) : (
                  filteredCategories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    const totalAmt = Number(cat.total_amount || 0);

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSearch("");
                        }}
                        className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-50/70 border-l-4 border-amber-600"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isSelected
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Folder size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className={`font-bold text-xs truncate ${isSelected ? "text-amber-900" : "text-slate-800"}`}>
                              {cat.name}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase font-semibold">
                              {cat.type || "Indirect Expense"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-1.5">
                          <div className="font-black text-xs text-slate-900">
                            ₹{fmt(totalAmt)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCategory(cat);
                              setCatNameInput(cat.name);
                              setCatTypeInput(cat.type || "Indirect Expense");
                              setCategoryModalOpen(true);
                            }}
                            className="w-6 h-6 rounded hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat);
                            }}
                            className="w-6 h-6 rounded hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                /* Items Catalog */
                filteredItemsCatalog.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No catalog items found.
                  </div>
                ) : (
                  filteredItemsCatalog.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item);
                          setSearch("");
                        }}
                        className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-amber-50/70 border-l-4 border-amber-600"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              isSelected
                                ? "bg-amber-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Tag size={15} />
                          </div>
                          <div className="min-w-0">
                            <div className={`font-bold text-xs truncate ${isSelected ? "text-amber-900" : "text-slate-800"}`}>
                              {item.item_name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {item.category_name || "General"}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-black text-xs text-slate-900">
                            ₹{fmt(item.price || 0)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* RIGHT: SELECTED CATEGORY / ITEM VOUCHERS LEDGER */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            
            {/* Scope Executive Header Banner */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                  {activeTab === "CATEGORY" ? <Folder size={22} /> : <Tag size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {activeTab === "CATEGORY"
                        ? selectedCategory?.name || "All Categories"
                        : selectedItem?.item_name || "All Items"}
                    </h2>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 font-bold text-[11px] rounded-md uppercase">
                      {activeTab === "CATEGORY" ? selectedCategory?.type || "Indirect Expense" : "Catalog Item"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vouchers recorded under this specific scope
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-4 py-2 text-right">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Spent</span>
                  <span className="text-base font-black text-rose-900">
                    ₹{fmt(filteredTransactions.reduce((acc, x) => acc + Number(x.total_amount || 0), 0))}
                  </span>
                </div>
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 text-right">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Balance Due</span>
                  <span className="text-base font-black text-amber-900">
                    ₹{fmt(filteredTransactions.reduce((acc, x) => acc + Number(x.balance_amount || 0), 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Invoices Toolbar */}
            <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Filter vouchers by Voucher # or party..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 outline-none focus:border-amber-500 focus:bg-white font-medium transition"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Status Segment Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: "all", label: "All" },
                  { id: "unpaid", label: "Pending" },
                  { id: "paid", label: "Settled" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === tab.id
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "text-slate-500 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
                <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md ml-1">
                  {filteredTransactions.length}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {filteredTransactions.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Receipt size={28} />
                  </div>
                  <h3 className="font-bold text-sm text-slate-800">No Vouchers In This Scope</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Record an expense under this category or catalog item to track expenses here.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Voucher No</th>
                      <th className="py-3 px-4">Party</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Total (₹)</th>
                      <th className="py-3 px-4 text-right">Pending (₹)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTransactions.map((item) => {
                      const isPaid = Number(item.balance_amount || 0) <= 0;
                      return (
                        <tr key={item.id} className="hover:bg-amber-50/20 transition-colors text-slate-700">
                          <td className="py-3 px-4 text-slate-600 font-medium whitespace-nowrap">
                            {formatDateDMY(item.expense_date)}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                              #{item.expense_no || item.id}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {item.party_name || "Cash"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold uppercase">
                              {item.payment_type || "Cash"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                            ₹{fmt(item.total_amount)}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              ₹{fmt(item.balance_amount)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPaid ? "bg-emerald-600" : "bg-amber-600"
                                }`}
                              />
                              {isPaid ? "Paid" : "Partial"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => navigate(`/purchases/expenses/edit/${item.id}`)}
                                title="Edit Details"
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => navigate(`/invoice/${item.expense_no || item.id}`)}
                                title="Print Receipt"
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              >
                                <Printer size={14} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                title="Delete Voucher"
                                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

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
              Are you sure you want to delete Expense voucher <b>#{deleteTarget.expense_no || deleteTarget.id}</b> ({deleteTarget.category_name}) for amount <b>₹{fmt(deleteTarget.total_amount)}</b>?
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
