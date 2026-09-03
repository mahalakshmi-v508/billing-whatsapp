import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import AddExpenseItemModal from "./AddExpenseItemModal";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Calculator,
  Settings,
  AlignLeft,
  ChevronsUpDown,
  Zap,
  Check,
  Building,
  User,
  Phone,
  FileText,
  Share2,
  Save,
  ArrowLeft
} from "lucide-react";

const gstSlabs = [
  { label: "Select", value: 0 },
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 }
];

function createInitialExpenseRow(id = null) {
  return {
    id: id || Date.now() + Math.random(),
    item_name: "",
    hsn_sac: "",
    qty: 1,
    price: "",
    tax_rate: 0,
    tax_amt: 0,
    amount: 0,
  };
}

function createNewExpenseTab(id, index, expenseNoValue = null) {
  return {
    id,
    title: `Expense #${index}`,
    isGst: false,
    selectedCategory: null,
    categoryName: "",
    partyName: "",
    partyPhone: "",
    expenseNo: expenseNoValue ? String(expenseNoValue) : String(index),
    expenseDate: new Date().toISOString().split("T")[0],
    paymentType: "Cash",
    roundOffEnabled: true,
    showDescription: false,
    description: "",
    rows: [createInitialExpenseRow(1), createInitialExpenseRow(2)],
  };
}

/* ── Close Confirmation Dialog ── */
function CloseConfirmModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;
  return (
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
      onClick={onCancel}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: 420,
          maxWidth: "92vw",
          boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Close Expense</h3>
          <button onClick={onCancel} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px", fontSize: 14, color: "#475569", lineHeight: 1.5 }}>
          Current unsaved changes will be discarded. Do you wish to continue?
        </div>
        <div style={{ padding: "14px 20px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0" }}>
          <button
            onClick={onCancel}
            style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#1d72fe", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Discard & Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Built-in Calculator Modal ── */
function CalculatorModal({ isOpen, onClose }) {
  const [calcInput, setCalcInput] = useState("");
  if (!isOpen) return null;

  const handleBtn = (val) => {
    if (val === "C") setCalcInput("");
    else if (val === "=") {
      try {
        // eslint-disable-next-line no-eval
        const res = eval(calcInput.replace(/×/g, "*").replace(/÷/g, "/"));
        setCalcInput(String(res));
      } catch {
        setCalcInput("Error");
      }
    } else {
      setCalcInput((prev) => prev + val);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: 290,
          boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 16px", background: "#1e293b", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5 }}>Calculator</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px", background: "#f8fafc", textAlign: "right", fontSize: 24, fontWeight: 900, color: "#0f172a", minHeight: 52, borderBottom: "1px solid #e2e8f0" }}>
          {calcInput || "0"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, padding: 14 }}>
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => handleBtn(b)}
              style={{
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: b === "=" ? "#2563eb" : b === "C" ? "#fee2e2" : "#ffffff",
                color: b === "=" ? "#ffffff" : b === "C" ? "#dc2626" : "#1e293b",
                cursor: "pointer",
                transition: "background 0.1s"
              }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AddExpense() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  const [existingCount, setExistingCount] = useState(0);
  const [tabs, setTabs] = useState([createNewExpenseTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);

  const [categories, setCategories] = useState([]);
  const [expenseItemsCatalog, setExpenseItemsCatalog] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [activeItemSearchIndex, setActiveItemSearchIndex] = useState(null);

  // Add Item Modal popup
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [modalTargetRowIndex, setModalTargetRowIndex] = useState(null);
  const [modalInitialItemName, setModalInitialItemName] = useState("");

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoryRef = useRef(null);
  const itemSuggestRef = useRef(null);

  // Active Tab
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  const updateActiveTab = (updates) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // Add new tab
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const nextExpenseNo = existingCount + tabs.length + 1;
    const newId = Date.now();
    const newTab = createNewExpenseTab(newId, nextIdx, nextExpenseNo);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close tab
  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setShowCloseModal(true);
      return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[0].id);
    }
  };

  // Load Categories & Items Catalog
  const fetchCatalog = async () => {
    try {
      const [catRes, itemRes, countRes] = await Promise.all([
        api.get(`/expense/categories?company_id=${companyId}&admin_id=${adminId || 0}`),
        api.get(`/expense/items?company_id=${companyId}`),
        api.get(`/expense/list?company_id=${companyId}&admin_id=${adminId || 0}`)
      ]);

      if (catRes.data?.status) setCategories(catRes.data.data || []);
      if (itemRes.data?.status) setExpenseItemsCatalog(itemRes.data.data || []);
      if (countRes.data?.status) {
        const cnt = countRes.data.count || 0;
        setExistingCount(cnt);
        if (!isEditMode) {
          updateActiveTab({ expenseNo: String(cnt + 1) });
        }
      }
    } catch (err) {
      console.error("Error loading expense catalog:", err);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [companyId, adminId]);

  // Load Expense if Edit Mode
  useEffect(() => {
    if (isEditMode && editId) {
      api.get(`/expense/get_by_id?id=${editId}`)
        .then((res) => {
          if (res.data?.status && res.data.data) {
            const d = res.data.data;
            const loadedRows = Array.isArray(d.items)
              ? d.items
              : typeof d.items === "string"
              ? JSON.parse(d.items || "[]")
              : [];

            setTabs([
              {
                id: 1,
                title: `Edit #${d.expense_no || d.id}`,
                isGst: Boolean(d.is_gst),
                selectedCategory: { id: d.category_id, name: d.category_name },
                categoryName: d.category_name || "",
                partyName: d.party_name || "",
                partyPhone: d.party_phone || "",
                expenseNo: d.expense_no || String(d.id),
                expenseDate: d.expense_date || new Date().toISOString().split("T")[0],
                paymentType: d.payment_type || "Cash",
                roundOffEnabled: true,
                showDescription: Boolean(d.description),
                description: d.description || "",
                rows: loadedRows.length > 0 ? loadedRows.map((r, i) => ({ ...r, id: i + 1 })) : [createInitialExpenseRow(1)],
              }
            ]);
            setActiveTabId(1);
          }
        })
        .catch(console.error);
    }
  }, [isEditMode, editId]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (itemSuggestRef.current && !itemSuggestRef.current.contains(e.target)) {
        setActiveItemSearchIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Row calculation
  const calculateRow = (row, isGst = activeTab.isGst) => {
    const q = parseFloat(row.qty) || 1;
    const p = parseFloat(row.price) || 0;
    const taxRate = isGst ? (parseFloat(row.tax_rate) || 0) : 0;

    const baseAmount = q * p;
    const taxAmt = (baseAmount * taxRate) / 100;
    const finalAmt = baseAmount + taxAmt;

    return {
      ...row,
      tax_amt: taxAmt,
      amount: finalAmt
    };
  };

  // Row change handler
  const handleRowChange = (index, field, value) => {
    const updated = [...activeTab.rows];
    let row = { ...updated[index], [field]: value };
    row = calculateRow(row, activeTab.isGst);
    updated[index] = row;
    updateActiveTab({ rows: updated });
  };

  // Select Item from catalog
  const handleSelectItem = (index, item) => {
    const updated = [...activeTab.rows];
    let row = {
      ...updated[index],
      item_name: item.item_name,
      hsn_sac: item.hsn_sac || "",
      price: parseFloat(item.price) || "",
      tax_rate: parseFloat(item.tax_rate) || 0,
      qty: 1
    };
    row = calculateRow(row, activeTab.isGst);
    updated[index] = row;
    updateActiveTab({ rows: updated });
    setActiveItemSearchIndex(null);
  };

  // Add Row
  const handleAddRow = () => {
    updateActiveTab({ rows: [...activeTab.rows, createInitialExpenseRow()] });
  };

  // Delete Row
  const handleDeleteRow = (index) => {
    if (activeTab.rows.length <= 1) {
      updateActiveTab({ rows: [createInitialExpenseRow(1)] });
      return;
    }
    const filtered = activeTab.rows.filter((_, i) => i !== index);
    updateActiveTab({ rows: filtered });
  };

  // Totals Summary
  const { totalQty, subTotal, totalTax, calculatedTotal, roundOffVal, grandTotal } = useMemo(() => {
    let tQty = 0;
    let sTot = 0;
    let tTax = 0;
    let rawTotal = 0;

    activeTab.rows.forEach((r) => {
      const q = parseFloat(r.qty) || 0;
      const p = parseFloat(r.price) || 0;
      tQty += q;
      sTot += q * p;
      tTax += parseFloat(r.tax_amt) || 0;
      rawTotal += parseFloat(r.amount) || 0;
    });

    let rounded = rawTotal;
    let diff = 0;
    if (activeTab.roundOffEnabled) {
      rounded = Math.round(rawTotal);
      diff = rounded - rawTotal;
    }

    return {
      totalQty: tQty,
      subTotal: sTot,
      totalTax: tTax,
      calculatedTotal: rawTotal,
      roundOffVal: diff,
      grandTotal: rounded
    };
  }, [activeTab.rows, activeTab.roundOffEnabled]);

  // Save Expense Voucher
  const handleSaveExpense = async () => {
    const validRows = activeTab.rows.filter((r) => r.item_name && (parseFloat(r.price) || 0) >= 0);
    if (validRows.length === 0 && !activeTab.categoryName) {
      alert("Please select a Category or enter an item name with price.");
      return;
    }

    if (!activeTab.categoryName) {
      alert("Please select or enter an Expense Category.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: isEditMode ? editId : undefined,
        admin_id: adminId,
        company_id: companyId,
        expense_no: activeTab.expenseNo || "1",
        expense_date: activeTab.expenseDate,
        category_id: activeTab.selectedCategory?.id || null,
        category_name: activeTab.selectedCategory?.name || activeTab.categoryName,
        party_name: activeTab.partyName,
        party_phone: activeTab.partyPhone,
        is_gst: activeTab.isGst,
        items: validRows,
        sub_total: subTotal,
        tax_total: totalTax,
        round_off: roundOffVal,
        total_amount: grandTotal,
        paid_amount: grandTotal,
        balance_amount: 0,
        payment_type: activeTab.paymentType,
        description: activeTab.description
      };

      const url = isEditMode ? "/expense/update" : "/expense/create";
      const res = await api.post(url, payload);

      if (res.data.status) {
        navigate("/purchases/expenses");
      } else {
        alert(res.data.message || "Failed to save expense");
      }
    } catch (err) {
      console.error("Error saving expense:", err);
      alert("Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const fmtCurrency = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  return (
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      
      {/* ── 1. TOP TABS & UTILITY BAR (Matching Screenshots 3 & 5) ── */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 44,
          boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
        }}
      >
        {/* Multi-tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#1d72fe" : "#64748b",
                  borderBottom: isActive ? "2.5px solid #1d72fe" : "2.5px solid transparent",
                  background: isActive ? "#f8fafc" : "transparent",
                  cursor: "pointer",
                  borderRadius: "6px 6px 0 0",
                  transition: "all 0.15s"
                }}
              >
                <span>{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#94a3b8", display: "flex" }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}

          {!isEditMode && (
            <button
              type="button"
              onClick={handleAddTab}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#1d72fe",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginLeft: 6,
                boxShadow: "0 2px 5px rgba(29, 114, 254, 0.3)"
              }}
              title="Add New Expense Tab"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Right utility icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 6, borderRadius: 6 }}
            title="Open Calculator"
          >
            <Calculator size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 6, borderRadius: 6 }}
            title="Close Form"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── 2. PAGE HEADER TITLE & GST TOGGLE ── */}
      <div style={{ padding: "16px 28px 10px 28px", display: "flex", alignItems: "center", gap: 24 }}>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.3px" }}>Expense</h2>

        {/* GST Toggle Switch */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: activeTab.isGst ? "#2563eb" : "#64748b" }}>
            GST
          </span>
          <div
            onClick={() => {
              const newGst = !activeTab.isGst;
              const recalculated = activeTab.rows.map((r) => calculateRow(r, newGst));
              updateActiveTab({ isGst: newGst, rows: recalculated });
            }}
            style={{
              width: 40,
              height: 22,
              borderRadius: 12,
              background: activeTab.isGst ? "#2563eb" : "#cbd5e1",
              padding: 2,
              cursor: "pointer",
              transition: "background 0.2s",
              position: "relative"
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#ffffff",
                transform: activeTab.isGst ? "translateX(18px)" : "translateX(0)",
                transition: "transform 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
              }}
            />
          </div>
        </div>
      </div>

      {/* ── 3. MAIN FORM BODY ── */}
      <div style={{ flex: 1, padding: "8px 28px 28px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Top Header Card: Expense Category * (Left) and Expense No/Date (Right) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            padding: "18px 24px",
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: 36,
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          {/* Left: Expense Category * */}
          <div ref={categoryRef} style={{ position: "relative" }}>
            <div
              onClick={() => setShowCategoryDropdown((prev) => !prev)}
              style={{
                border: "1.5px solid #2563eb",
                borderRadius: 8,
                padding: "6px 14px",
                background: "#ffffff",
                position: "relative",
                cursor: "pointer"
              }}
            >
              <label
                style={{
                  position: "absolute",
                  top: -9,
                  left: 12,
                  background: "#ffffff",
                  padding: "0 4px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#2563eb"
                }}
              >
                Expense Category *
              </label>
              <input
                type="text"
                placeholder="Select or enter category..."
                value={activeTab.categoryName}
                onChange={(e) => {
                  updateActiveTab({ categoryName: e.target.value, selectedCategory: null });
                  setShowCategoryDropdown(true);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => setShowCategoryDropdown(true)}
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "#1e293b",
                  padding: "3px 0",
                  cursor: "text"
                }}
              />
              <ChevronDown
                size={16}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategoryDropdown((prev) => !prev);
                }}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: `translateY(-50%) ${showCategoryDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
                  transition: "transform 0.15s",
                  color: "#64748b",
                  cursor: "pointer"
                }}
              />
            </div>

            {/* Category Autocomplete Dropdown */}
            {showCategoryDropdown && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 44,
                  width: "100%",
                  background: "#ffffff",
                  borderRadius: 8,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  border: "1px solid #cbd5e1",
                  maxHeight: 220,
                  overflowY: "auto",
                  zIndex: 999
                }}
              >
                {categories
                  .filter((c) =>
                    (c.name || "").toLowerCase().includes((activeTab.categoryName || "").toLowerCase())
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        updateActiveTab({ selectedCategory: c, categoryName: c.name });
                        setShowCategoryDropdown(false);
                      }}
                      style={{
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: "#64748b" }}>{c.type || "Indirect Expense"}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Right: Expense No & Date */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            
            {/* Expense No */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Expense No</span>
              <input
                type="text"
                value={activeTab.expenseNo}
                onChange={(e) => updateActiveTab({ expenseNo: e.target.value })}
                style={{ width: 90, border: "none", outline: "none", textAlign: "right", fontSize: 13.5, fontWeight: 800, color: "#1e293b" }}
              />
            </div>

            {/* Date */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Date</span>
              <input
                type="date"
                value={activeTab.expenseDate}
                onChange={(e) => updateActiveTab({ expenseDate: e.target.value })}
                style={{ border: "none", outline: "none", fontSize: 12.5, fontWeight: 700, color: "#1e293b", cursor: "pointer" }}
              />
            </div>

          </div>

        </div>

        {/* ── 4. ITEMS TABLE (Exact Matches Screenshots 3 & 5) ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            overflow: "visible",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 800, fontSize: 11.5, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                <th style={{ padding: "11px 14px", width: 36 }}>#</th>
                <th style={{ padding: "11px 14px" }}>ITEM</th>
                <th style={{ padding: "11px 14px", width: 90, textAlign: "center" }}>QTY</th>
                <th style={{ padding: "11px 14px", width: 140, textAlign: "center" }}>PRICE/UNIT</th>
                
                {/* TAX Header (if GST enabled) */}
                {activeTab.isGst && (
                  <th style={{ width: 150, padding: 0, textAlign: "center", fontWeight: 800, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                    <div style={{ padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>TAX</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontSize: 10.5, color: "#6b7280", fontWeight: 600 }}>
                      <div style={{ padding: "3px 2px", borderRight: "1px solid #e2e8f0" }}>%</div>
                      <div style={{ padding: "3px 2px" }}>AMOUNT</div>
                    </div>
                  </th>
                )}

                <th style={{ padding: "11px 14px", width: 130, textAlign: "right" }}>AMOUNT</th>
                <th style={{ padding: "11px 8px", width: 36 }}></th>
              </tr>
            </thead>

            <tbody>
              {activeTab.rows.map((row, idx) => {
                const isItemSearchOpen = activeItemSearchIndex === idx;

                return (
                  <tr key={row.id || idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    
                    {/* Index */}
                    <td style={{ padding: "10px 14px", color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>

                    {/* Item Name Input with Autocomplete + "+ Add Expense Item" Link */}
                    <td style={{ padding: "10px 14px", position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Enter item name..."
                        value={row.item_name}
                        onChange={(e) => {
                          handleRowChange(idx, "item_name", e.target.value);
                          setActiveItemSearchIndex(idx);
                        }}
                        onFocus={() => setActiveItemSearchIndex(idx)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1e293b",
                          outline: "none"
                        }}
                      />

                      {/* + Add Expense Item Link Button (Matching Screenshot 5) */}
                      <div style={{ marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setModalTargetRowIndex(idx);
                            setModalInitialItemName(row.item_name || "");
                            setShowAddItemModal(true);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#2563eb",
                            fontSize: 11.5,
                            fontWeight: 700,
                            cursor: "pointer",
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          <Plus size={13} strokeWidth={2.5} />
                          <span>Add Expense Item</span>
                        </button>
                      </div>

                      {/* Item Autocomplete Suggestions */}
                      {isItemSearchOpen && (
                        <div
                          ref={itemSuggestRef}
                          style={{
                            position: "absolute",
                            left: 14,
                            top: 44,
                            width: 320,
                            background: "#ffffff",
                            borderRadius: 8,
                            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                            border: "1px solid #cbd5e1",
                            maxHeight: 190,
                            overflowY: "auto",
                            zIndex: 9999
                          }}
                        >
                          {expenseItemsCatalog
                            .filter((item) =>
                              (item.item_name || "").toLowerCase().includes((row.item_name || "").toLowerCase())
                            )
                            .map((item) => (
                              <div
                                key={item.id}
                                onClick={() => handleSelectItem(idx, item)}
                                style={{
                                  padding: "9px 14px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f1f5f9"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                              >
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{item.item_name}</span>
                                <span style={{ fontSize: 12.5, color: "#2563eb", fontWeight: 800 }}>₹{item.price}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </td>

                    {/* Qty */}
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={row.qty}
                        onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: "center",
                          outline: "none"
                        }}
                      />
                    </td>

                    {/* Price / Unit */}
                    <td style={{ padding: "10px 14px" }}>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "7px 10px",
                          borderRadius: 6,
                          border: "1px solid #cbd5e1",
                          fontSize: 13,
                          fontWeight: 800,
                          textAlign: "center",
                          outline: "none"
                        }}
                      />
                    </td>

                    {/* Tax % & Amount (if GST enabled) */}
                    {activeTab.isGst && (
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <select
                            value={row.tax_rate}
                            onChange={(e) => handleRowChange(idx, "tax_rate", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "6px 4px",
                              borderRadius: 6,
                              border: "1px solid #cbd5e1",
                              fontSize: 12,
                              fontWeight: 700,
                              outline: "none",
                              background: "#ffffff"
                            }}
                          >
                            {gstSlabs.map((s) => (
                              <option key={s.label} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                            ₹{row.tax_amt ? Number(row.tax_amt).toFixed(2) : "0"}
                          </div>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 900, color: "#1e293b", fontSize: 13.5 }}>
                      ₹ {fmtCurrency(row.amount)}
                    </td>

                    {/* Delete Row */}
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                        title="Delete row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Footer: ADD ROW & Summary Totals */}
          <div
            style={{
              padding: "12px 20px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              onClick={handleAddRow}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                borderRadius: 6,
                border: "1.5px solid #1d72fe",
                background: "#ffffff",
                color: "#1d72fe",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(29, 114, 254, 0.1)"
              }}
            >
              <Plus size={15} strokeWidth={3} />
              <span>ADD ROW</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 28, fontSize: 13, fontWeight: 700, color: "#475569" }}>
              <div>TOTAL QTY: <span style={{ color: "#1e293b", fontWeight: 900 }}>{totalQty}</span></div>
              {activeTab.isGst && (
                <div>TAX: <span style={{ color: "#15803d", fontWeight: 900 }}>₹ {fmtCurrency(totalTax)}</span></div>
              )}
              <div>SUBTOTAL: <span style={{ color: "#1e293b", fontWeight: 900 }}>₹ {fmtCurrency(calculatedTotal)}</span></div>
            </div>
          </div>

        </div>

        {/* ── 5. SETTLEMENT AREA (Payment Type, Round Off, Grand Total) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 28,
            background: "#ffffff",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            padding: "18px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
          }}
        >
          {/* Left: Payment Type & Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            
            {/* Payment Type */}
            <div style={{ width: 230 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
                Payment Type
              </label>
              <select
                value={activeTab.paymentType}
                onChange={(e) => updateActiveTab({ paymentType: e.target.value })}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="Cash">Cash</option>
                <option value="Online">Online / Netbanking</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit</option>
              </select>
            </div>

            {/* Description Toggle */}
            {!activeTab.showDescription ? (
              <button
                type="button"
                onClick={() => updateActiveTab({ showDescription: true })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  width: "fit-content"
                }}
              >
                <AlignLeft size={15} />
                <span>+ ADD DESCRIPTION</span>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>Description / Expense Notes</span>
                <textarea
                  rows="2"
                  placeholder="Enter expense reason or notes..."
                  value={activeTab.description}
                  onChange={(e) => updateActiveTab({ description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 13,
                    outline: "none"
                  }}
                />
              </div>
            )}

          </div>

          {/* Right: Round Off & Grand Total */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end", justifyContent: "center" }}>
            
            {/* Round Off Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={activeTab.roundOffEnabled}
                  onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                <span>Round Off</span>
              </label>

              <input
                type="text"
                readOnly
                value={roundOffVal ? (roundOffVal > 0 ? `+${roundOffVal.toFixed(2)}` : roundOffVal.toFixed(2)) : "0.00"}
                style={{ width: 84, padding: "5px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "#64748b" }}
              />
            </div>

            {/* Total Box */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: "#1e293b" }}>Total</span>
              <div
                style={{
                  minWidth: 170,
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#1e293b",
                  textAlign: "right"
                }}
              >
                ₹ {fmtCurrency(grandTotal)}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 6. BOTTOM ACTION BAR (Share ▾ | Save) ── */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "14px 28px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.03)"
        }}
      >
        {/* Share ▾ Split Button */}
        <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #93c5fd", borderRadius: 6, overflow: "hidden", background: "#ffffff" }}>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#2563eb",
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            Share
          </button>
          <div style={{ borderLeft: "1.5px solid #bfdbfe", padding: "9px 10px", color: "#2563eb", cursor: "pointer", display: "flex" }}>
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Save Button (Primary Blue) */}
        <button
          type="button"
          onClick={handleSaveExpense}
          disabled={saving}
          style={{
            background: "linear-gradient(135deg, #1d72fe, #1e40af)",
            border: "none",
            color: "#ffffff",
            borderRadius: 6,
            padding: "10px 36px",
            fontSize: 14,
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 3px 10px rgba(29, 114, 254, 0.35)",
            transition: "transform 0.15s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          {saving ? "Saving..." : (
            <span><u>S</u>ave</span>
          )}
        </button>
      </div>

      {/* Close Confirm Modal */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases/expenses")}
      />

      {/* Built-in Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

      {/* Add Expense Item Modal Popup */}
      <AddExpenseItemModal
        isOpen={showAddItemModal}
        categoryId={activeTab.selectedCategory?.id}
        initialItemName={modalInitialItemName}
        onClose={() => setShowAddItemModal(false)}
        onSuccess={(newItem) => {
          fetchCatalog();
          if (modalTargetRowIndex !== null) {
            handleSelectItem(modalTargetRowIndex, newItem);
          }
        }}
      />

    </div>
  );
}
