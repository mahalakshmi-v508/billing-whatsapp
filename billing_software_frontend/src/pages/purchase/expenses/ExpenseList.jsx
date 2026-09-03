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
  ArrowUpDown,
  Filter,
  Layers,
  Package,
  FolderPlus,
  CheckCircle2,
  TrendingDown,
  ChevronRight
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
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── 1. TOP TABS BAR (CATEGORY | ITEMS - Polished Design) ── */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 28,
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("CATEGORY")}
          style={{
            padding: "14px 18px",
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: activeTab === "CATEGORY" ? "#2563eb" : "#64748b",
            borderBottom: activeTab === "CATEGORY" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s ease"
          }}
        >
          <Layers size={16} color={activeTab === "CATEGORY" ? "#2563eb" : "#94a3b8"} />
          <span>CATEGORY</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ITEMS")}
          style={{
            padding: "14px 18px",
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.6px",
            color: activeTab === "ITEMS" ? "#2563eb" : "#64748b",
            borderBottom: activeTab === "ITEMS" ? "3px solid #2563eb" : "3px solid transparent",
            background: "transparent",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.15s ease"
          }}
        >
          <Package size={16} color={activeTab === "ITEMS" ? "#2563eb" : "#94a3b8"} />
          <span>ITEMS</span>
        </button>
      </div>

      {/* ── 2. DUAL-PANE MAIN LAYOUT ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", overflow: "hidden" }}>
        
        {/* ── LEFT PANEL: Category / Items List ── */}
        <div
          style={{
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            height: "calc(100vh - 51px)"
          }}
        >
          {/* Left Header: Search lens + + Add Expense Red Button */}
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
            
            <div style={{ position: "relative", flex: 1 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search..."
                value={leftSearchQuery}
                onChange={(e) => setLeftSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  borderRadius: 20,
                  border: "1px solid #e2e8f0",
                  fontSize: 12.5,
                  outline: "none",
                  background: "#f8fafc",
                  transition: "border 0.2s"
                }}
              />
            </div>

            {/* + Add Expense Primary Red Button */}
            <button
              type="button"
              onClick={() => navigate("/purchases/expenses/add")}
              style={{
                background: "linear-gradient(135deg, #e11d48, #be123c)",
                color: "#ffffff",
                border: "none",
                borderRadius: 20,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                boxShadow: "0 3px 10px rgba(225, 29, 72, 0.3)",
                whiteSpace: "nowrap",
                transition: "transform 0.15s, box-shadow 0.15s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <Plus size={14} strokeWidth={3} />
              <span>Add Expense</span>
            </button>

          </div>

          {/* List Table Header */}
          <div
            style={{
              padding: "9px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: "0.5px",
              textTransform: "uppercase"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span>{activeTab === "CATEGORY" ? "CATEGORY" : "ITEM"}</span>
              <ArrowUpDown size={11} color="#94a3b8" />
            </div>
            <span>AMOUNT</span>
          </div>

          {/* Left List Scrollable Body */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "CATEGORY" ? (
              filteredCategories.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>
                  No categories found.
                </div>
              ) : (
                filteredCategories.map((cat) => {
                  const isSelected = selectedCategory?.id === cat.id;
                  const isMenuOpen = activeCatMenuId === cat.id;
                  const totalAmt = Number(cat.total_amount || 0);

                  return (
                    <div
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: "11px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: isSelected ? "#f0f9ff" : "#ffffff",
                        borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "#ffffff"; }}
                    >
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: isSelected ? 800 : 600, color: isSelected ? "#0369a1" : "#1e293b" }}>
                          {cat.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                          {cat.type || "Indirect Expense"}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: totalAmt > 0 ? "#1e293b" : "#94a3b8",
                            background: isSelected && totalAmt > 0 ? "#e0f2fe" : "transparent",
                            padding: isSelected && totalAmt > 0 ? "2px 6px" : "0",
                            borderRadius: 6
                          }}
                        >
                          ₹ {totalAmt.toLocaleString("en-IN")}
                        </span>

                        {/* Category 3-dots Menu */}
                        <div data-menu-container style={{ position: "relative" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveCatMenuId((prev) => (prev === cat.id ? null : cat.id));
                            }}
                            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 3, display: "flex", borderRadius: 4 }}
                          >
                            <MoreVertical size={14} />
                          </button>

                          {isMenuOpen && (
                            <div
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 22,
                                width: 120,
                                background: "#ffffff",
                                borderRadius: 8,
                                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                                border: "1px solid #e2e8f0",
                                zIndex: 9999,
                                padding: "4px 0"
                              }}
                            >
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCategory(cat);
                                  setCatNameInput(cat.name);
                                  setCatTypeInput(cat.type || "Indirect Expense");
                                  setCategoryModalOpen(true);
                                  setActiveCatMenuId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8, color: "#1e293b", cursor: "pointer", fontWeight: 600 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <Pencil size={13} color="#2563eb" />
                                <span>Edit</span>
                              </div>
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(cat);
                                  setActiveCatMenuId(null);
                                }}
                                style={{ padding: "7px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8, color: "#dc2626", cursor: "pointer", borderTop: "1px solid #f1f5f9", fontWeight: 600 }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <Trash2 size={13} color="#dc2626" />
                                <span>Delete</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* ITEMS Tab List */
              filteredItemsCatalog.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>
                  No items to show
                </div>
              ) : (
                filteredItemsCatalog.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      style={{
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: isSelected ? "#f0f9ff" : "#ffffff",
                        borderLeft: isSelected ? "4px solid #2563eb" : "4px solid transparent"
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                          {item.item_name}
                        </div>
                        {item.category_name && (
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {item.category_name}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#2563eb" }}>
                        ₹ {fmtCurrency(item.price || 0)}
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>

          {/* Quick Add Category Prompt at bottom */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCatNameInput("");
                setCatTypeInput("Indirect Expense");
                setCategoryModalOpen(true);
              }}
              style={{
                width: "100%",
                padding: "8px 0",
                background: "#ffffff",
                border: "1.5px dashed #93c5fd",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 800,
                color: "#2563eb",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
              }}
            >
              <FolderPlus size={15} />
              <span>Create New Category</span>
            </button>
          </div>

        </div>

        {/* ── RIGHT PANEL: Transactions Table ── */}
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 51px)", overflowY: "auto", background: "#f8fafc" }}>
          
          {/* Right Header Area (Matching Screenshot 1) */}
          <div
            style={{
              padding: "16px 28px",
              background: "#ffffff",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#1e293b", textTransform: "uppercase", letterSpacing: "-0.2px" }}>
                  {activeTab === "CATEGORY"
                    ? selectedCategory?.name || "ALL EXPENSES"
                    : selectedItem?.item_name || "ALL ITEMS"}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    background: "#f1f5f9",
                    color: "#475569"
                  }}
                >
                  {activeTab === "CATEGORY" ? selectedCategory?.type || "Direct Expense" : "Expense Item"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {/* Total Card */}
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 10,
                  padding: "6px 14px",
                  textAlign: "right"
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9f1239", textTransform: "uppercase" }}>Total Expense</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#be123c" }}>
                  ₹ {fmtCurrency(currentTotal)}
                </div>
              </div>

              {/* Balance Card */}
              <div
                style={{
                  background: currentBalance > 0 ? "#fff7ed" : "#f0fdf4",
                  border: `1px solid ${currentBalance > 0 ? "#fed7aa" : "#bbf7d0"}`,
                  borderRadius: 10,
                  padding: "6px 14px",
                  textAlign: "right"
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: currentBalance > 0 ? "#c2410c" : "#15803d", textTransform: "uppercase" }}>Balance Due</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: currentBalance > 0 ? "#ea580c" : "#16a34a" }}>
                  ₹ {fmtCurrency(currentBalance)}
                </div>
              </div>
            </div>
          </div>

          {/* Right Filter & Search Bar */}
          <div style={{ padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: 320 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search by ref, party, amount..."
                value={rightSearchQuery}
                onChange={(e) => setRightSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 36px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  outline: "none",
                  background: "#ffffff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={fetchData}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  cursor: "pointer"
                }}
                title="Refresh"
              >
                <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "0 12px",
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#16a34a",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer"
                }}
                title="Export Excel"
              >
                <FileSpreadsheet size={17} />
                <span>Excel</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "0 12px",
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#334155",
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: "pointer"
                }}
                title="Print Transactions"
              >
                <Printer size={17} />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Transactions Table Body */}
          <div style={{ flex: 1, padding: "0 28px 28px 28px" }}>
            
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 240, color: "#64748b", gap: 10 }}>
                <RefreshCw size={20} className="animate-spin text-blue-600" />
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>Loading transactions...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 48, textAlign: "center", color: "#94a3b8" }}>
                <FileText size={42} strokeWidth={1.2} style={{ margin: "0 auto 12px auto", color: "#cbd5e1" }} />
                <div style={{ fontSize: 15, fontWeight: 800, color: "#334155" }}>No transactions found</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Click "+ Add Expense" to record a new expense in this category.</div>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "visible", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      <th style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span>DATE</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span>EXP NO.</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span>PARTY</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span>PAYMENT TYPE</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                          <span>AMOUNT</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                          <span>BALANCE</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                          <span>STATUS</span>
                          <Filter size={10} color="#94a3b8" />
                        </div>
                      </th>
                      <th style={{ padding: "12px 16px", width: 40, textAlign: "center" }}></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map((tx) => {
                      const isMenuOpen = activeTxMenuId === tx.id;
                      const isPaid = Number(tx.balance_amount || 0) <= 0;

                      return (
                        <tr
                          key={tx.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isMenuOpen ? "#f8fafc" : "#ffffff",
                            transition: "background 0.15s"
                          }}
                          onMouseEnter={(e) => { if (!isMenuOpen) e.currentTarget.style.background = "#f8fafc"; }}
                          onMouseLeave={(e) => { if (!isMenuOpen) e.currentTarget.style.background = "#ffffff"; }}
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b" }}>{formatDateDMY(tx.expense_date)}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 800, color: "#2563eb" }}>#{tx.expense_no || tx.id}</td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#1e293b" }}>{tx.party_name || "-"}</td>
                          <td style={{ padding: "12px 16px" }}>
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: 6,
                                background: "#f1f5f9",
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: "#334155"
                              }}
                            >
                              {tx.payment_type || "Cash"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 900, color: "#1e293b" }}>
                            ₹ {fmtCurrency(tx.total_amount)}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: Number(tx.balance_amount || 0) > 0 ? "#dc2626" : "#64748b" }}>
                            ₹ {fmtCurrency(tx.balance_amount)}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <span
                              style={{
                                padding: "4px 12px",
                                borderRadius: 14,
                                fontSize: 11.5,
                                fontWeight: 800,
                                background: isPaid ? "#dcfce7" : "#fef3c7",
                                color: isPaid ? "#15803d" : "#b45309",
                                display: "inline-block"
                              }}
                            >
                              {isPaid ? "Paid" : "Partial"}
                            </span>
                          </td>

                          {/* Action 3-dots Menu */}
                          <td data-menu-container style={{ padding: "12px 16px", textAlign: "center", position: "relative" }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTxMenuId((prev) => (prev === tx.id ? null : tx.id));
                              }}
                              style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4, borderRadius: 4 }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {isMenuOpen && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 12,
                                  top: "100%",
                                  width: 130,
                                  background: "#ffffff",
                                  borderRadius: 8,
                                  boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                                  border: "1px solid #cbd5e1",
                                  zIndex: 99999,
                                  padding: "4px 0",
                                  textAlign: "left"
                                }}
                              >
                                <div
                                  onClick={() => {
                                    navigate(`/purchases/expenses/edit/${tx.id}`);
                                    setActiveTxMenuId(null);
                                  }}
                                  style={{ padding: "8px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8, color: "#1e293b", cursor: "pointer", fontWeight: 600 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Pencil size={13} color="#2563eb" />
                                  <span>Edit</span>
                                </div>
                                <div
                                  onClick={() => {
                                    setDeleteTarget(tx);
                                    setActiveTxMenuId(null);
                                  }}
                                  style={{ padding: "8px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 8, color: "#dc2626", cursor: "pointer", borderTop: "1px solid #f1f5f9", fontWeight: 600 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Trash2 size={13} color="#dc2626" />
                                  <span>Delete</span>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ── 3. ADD / EDIT CATEGORY MODAL ── */}
      {categoryModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setCategoryModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: 400,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              padding: 22
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: "#1e293b" }}>
                {editingCategory ? "Edit Expense Category" : "New Expense Category"}
              </h3>
              <button onClick={() => setCategoryModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Generator Fuel, Stationery, Office Rent"
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  autoFocus
                  required
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1.5px solid #2563eb", fontSize: 13.5, outline: "none" }}
                />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
                  Expense Type
                </label>
                <select
                  value={catTypeInput}
                  onChange={(e) => setCatTypeInput(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, outline: "none", background: "#ffffff", cursor: "pointer" }}
                >
                  <option value="Indirect Expense">Indirect Expense (Office, Tea, Rent, Salary)</option>
                  <option value="Direct Expense">Direct Expense (Transport, Freight)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#475569" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  style={{ padding: "8px 22px", borderRadius: 6, border: "none", background: "#1d72fe", color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: savingCat ? "not-allowed" : "pointer" }}
                >
                  {savingCat ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 4. DELETE EXPENSE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: 420,
              maxWidth: "92vw",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #fee2e2", background: "#fff5f5" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#991b1b" }}>Delete Expense Voucher</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#b91c1c" }}>This voucher will be removed from your expenses.</p>
              </div>
            </div>

            <div style={{ padding: "20px", fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>
              Are you sure you want to delete Expense <b>#{deleteTarget.expense_no || deleteTarget.id}</b> ({deleteTarget.category_name}) of amount <b>₹{fmtCurrency(deleteTarget.total_amount)}</b>?
            </div>

            <div style={{ padding: "14px 20px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteExpense}
                disabled={deleting}
                style={{ padding: "8px 22px", borderRadius: 6, border: "none", background: "#dc2626", color: "#ffffff", fontSize: 13, fontWeight: 800, cursor: deleting ? "not-allowed" : "pointer" }}
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
