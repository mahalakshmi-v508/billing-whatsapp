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
  Layers,
  Check,
  Building,
  User,
  Phone,
  FileText,
  Save,
  ArrowLeft,
  Receipt,
  FolderPlus,
  Tag,
  CreditCard,
  Percent,
  AlertCircle
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900">Close Expense</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current unsaved changes will be discarded. Do you wish to continue and return to the expense list?
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/25 transition cursor-pointer"
          >
            OK, Discard
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
        const sanitized = calcInput.replace(/×/g, "*").replace(/÷/g, "/");
        const res = Function(`'use strict'; return (${sanitized})`)();
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-72 shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center">
          <span className="font-bold text-xs">Calculator</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-4 bg-slate-50 text-right text-2xl font-black text-slate-900 min-h-[56px] border-b border-slate-200">
          {calcInput || "0"}
        </div>
        <div className="grid grid-cols-4 gap-2 p-3 bg-white">
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => handleBtn(b)}
              className={`py-3 text-sm font-bold rounded-xl border transition cursor-pointer ${
                b === "="
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : b === "C"
                  ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                  : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100"
              }`}
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

      if (res.data?.status) {
        navigate("/purchases/expenses");
      } else {
        alert(res.data?.message || "Failed to save expense");
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      
      {/* ── 1. EXECUTIVE TOP COMMAND BAR ── */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCloseModal(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Back to Expenses"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-black shadow-xs shadow-amber-500/20">
              <Receipt size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {isEditMode ? `Edit Expense Voucher #${editId}` : "Record Expense Voucher"}
                </h1>
                
                {/* GST Toggle Switch */}
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  <span className={`text-[10px] font-black uppercase ${activeTab.isGst ? "text-amber-700" : "text-slate-500"}`}>
                    GST
                  </span>
                  <div
                    onClick={() => {
                      const newGst = !activeTab.isGst;
                      const recalculated = activeTab.rows.map((r) => calculateRow(r, newGst));
                      updateActiveTab({ isGst: newGst, rows: recalculated });
                    }}
                    className={`w-7 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${activeTab.isGst ? "bg-amber-600" : "bg-slate-300"}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${activeTab.isGst ? "translate-x-3" : "translate-x-0"}`} />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Classify operational expenses & track direct overheads</p>
            </div>
          </div>
        </div>

        {/* Multi-Tab Switcher & Utility Tools */}
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive ? "bg-white text-amber-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <X
                      size={12}
                      className="text-slate-400 hover:text-rose-600"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                    />
                  )}
                </div>
              );
            })}

            {!isEditMode && (
              <button
                onClick={handleAddTab}
                className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-amber-700 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title="Add New Expense Tab"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Calculator Tool */}
          <button
            onClick={() => setShowCalculator(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-2xs"
            title="Calculator"
          >
            <Calculator size={16} />
          </button>

          {/* Close Action */}
          <button
            onClick={() => setShowCloseModal(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-2xs"
            title="Close Form"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. FORM WORKSPACE CONTAINER ── */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* ── SECTION 1: EXPENSE CATEGORY & VOUCHER DETAILS CARD ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Tag size={16} className="text-amber-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Expense Classification & Details</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left 6 Columns: Category Autocomplete & Party */}
            <div className="lg:col-span-6 space-y-4">
              {/* Category Search Box */}
              <div ref={categoryRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or enter expense category (e.g. Office Rent, Fuel)..."
                    value={activeTab.categoryName}
                    onChange={(e) => {
                      updateActiveTab({ categoryName: e.target.value, selectedCategory: null });
                      setShowCategoryDropdown(true);
                    }}
                    onClick={() => setShowCategoryDropdown(true)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition shadow-2xs"
                  />
                  <FolderPlus size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <ChevronDown
                    size={14}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                    onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-52 overflow-y-auto z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {categories
                      .filter((c) => (c.name || "").toLowerCase().includes((activeTab.categoryName || "").toLowerCase()))
                      .map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            updateActiveTab({ selectedCategory: c, categoryName: c.name });
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-amber-50/70 border-b border-slate-50 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-bold text-xs text-slate-900">{c.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {c.type || "Indirect Expense"}
                          </span>
                        </button>
                      ))}
                    {categories.length === 0 && (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        Will create <b>"{activeTab.categoryName}"</b> as new category.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Party / Beneficiary Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paid To / Party (Optional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Beneficiary / vendor name..."
                      value={activeTab.partyName}
                      onChange={(e) => updateActiveTab({ partyName: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition"
                    />
                    <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Party Contact Phone</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Phone number..."
                      value={activeTab.partyPhone}
                      onChange={(e) => updateActiveTab({ partyPhone: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition"
                    />
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Voucher No & Date */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Voucher No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Voucher #</label>
                <input
                  type="text"
                  value={activeTab.expenseNo}
                  onChange={(e) => updateActiveTab({ expenseNo: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Voucher Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={activeTab.expenseDate}
                    onChange={(e) => updateActiveTab({ expenseDate: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 transition cursor-pointer"
                  />
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Classification Info Card */}
              <div className="sm:col-span-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Selected Type</span>
                  <span className="text-xs font-black text-amber-950">
                    {activeTab.selectedCategory?.type || "Indirect Operational Expense"}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white text-amber-800 border border-amber-200 shadow-2xs">
                  {activeTab.isGst ? "Tax Deductible" : "Non-GST"}
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ── SECTION 2: EXPENSE ITEMS TABLE (Hero Section) ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-amber-600" />
                <span>Line Items & Overheads ({activeTab.rows.length} rows)</span>
              </span>
            </div>

            <span className="text-[11px] font-bold text-slate-500">
              Specify overhead details, quantities, rates and taxes
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[880px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 font-extrabold text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-10">#</th>
                  <th className="py-3 px-4 border-r border-slate-200/70">Item Name / Service Description</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-24">Qty</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-32">Price / Rate (₹)</th>
                  {activeTab.isGst && (
                    <th className="py-3 px-3 text-center border-r border-slate-200/70 w-36">GST Tax Rate</th>
                  )}
                  <th className="py-3 px-4 text-right border-r border-slate-200/70 w-32">Amount</th>
                  <th className="py-3 px-3 text-center w-12">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-semibold">
                {activeTab.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="group hover:bg-amber-50/20 transition-colors">
                    
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/70 text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Item Name Input with Autocomplete */}
                    <td className="py-2 px-3 border-r border-slate-200/70 relative">
                      <input
                        type="text"
                        placeholder="Search item from catalog or enter name..."
                        value={row.item_name}
                        onChange={(e) => {
                          handleRowChange(idx, "item_name", e.target.value);
                          setActiveItemSearchIndex(idx);
                        }}
                        onClick={() => setActiveItemSearchIndex(idx)}
                        onFocus={() => setActiveItemSearchIndex(idx)}
                        className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-amber-500 transition"
                      />

                      {/* + Add Expense Item Quick Trigger */}
                      <div className="mt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => {
                            setModalTargetRowIndex(idx);
                            setModalInitialItemName(row.item_name || "");
                            setShowAddItemModal(true);
                          }}
                          className="text-[11px] font-bold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                          <span>Add to Catalog</span>
                        </button>
                      </div>

                      {/* Autocomplete suggestions */}
                      {activeItemSearchIndex === idx && (
                        <div
                          ref={itemSuggestRef}
                          className="absolute left-3 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1"
                        >
                          {expenseItemsCatalog
                            .filter((item) =>
                              (item.item_name || "").toLowerCase().includes((row.item_name || "").toLowerCase())
                            )
                            .map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => handleSelectItem(idx, item)}
                                className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-slate-50 flex items-center justify-between cursor-pointer"
                              >
                                <span className="font-bold text-xs text-slate-900">{item.item_name}</span>
                                <span className="font-extrabold text-xs text-amber-700">₹{item.price}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2 border-r border-slate-200/70 text-center">
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={row.qty}
                        onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                        className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-amber-500 transition"
                      />
                    </td>

                    {/* Price */}
                    <td className="py-2 px-2 border-r border-slate-200/70 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                        className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-amber-500 transition"
                      />
                    </td>

                    {/* Tax (if GST enabled) */}
                    {activeTab.isGst && (
                      <td className="py-2 px-2 border-r border-slate-200/70">
                        <div className="grid grid-cols-2 gap-1 items-center">
                          <select
                            value={row.tax_rate}
                            onChange={(e) => handleRowChange(idx, "tax_rate", e.target.value)}
                            className="w-full py-1 px-1 bg-slate-50/70 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 outline-none"
                          >
                            {gstSlabs.map((s) => (
                              <option key={s.label} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <span className="text-[11px] font-bold text-slate-500 text-center truncate">
                            {row.tax_amt ? `₹${Number(row.tax_amt).toFixed(1)}` : "-"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200/70 font-black text-slate-900 text-xs">
                      ₹ {fmtCurrency(row.amount)}
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto"
                        title="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

              {/* Table Footer Summary Bar */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-black text-slate-800 text-xs">
                  <td colSpan={2} className="py-3 px-4 border-r border-slate-200/70">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-amber-600 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>+ Add Expense Row</span>
                    </button>
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200/70 text-slate-900 font-black">
                    {totalQty}
                  </td>
                  <td className="border-r border-slate-200/70"></td>
                  {activeTab.isGst && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/70 text-emerald-700">
                      ₹ {fmtCurrency(totalTax)}
                    </td>
                  )}
                  <td className="py-3 px-4 text-right border-r border-slate-200/70 font-black text-slate-900">
                    ₹ {fmtCurrency(calculatedTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── SECTION 3: SETTLEMENT & EXECUTIVE SUMMARY ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left 7 Cols: Payment Mode & Remarks */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard size={16} className="text-amber-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Disbursement & Notes</h3>
            </div>

            {/* Payment Method Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {["Cash", "Online", "UPI", "Cheque", "Credit"].map((mode) => {
                  const isSelected = activeTab.paymentType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateActiveTab({ paymentType: mode })}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer text-center ${
                        isSelected
                          ? "bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-500/25"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expense Notes / Voucher Remarks</label>
              <textarea
                rows={2}
                placeholder="Enter expense reason, reference number, or transaction notes..."
                value={activeTab.description}
                onChange={(e) => updateActiveTab({ description: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-amber-500 transition"
              />
            </div>
          </div>

          {/* Right 5 Cols: Financial Intelligence Summary Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Expense Total</span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>

            {/* Subtotal & Taxes */}
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">₹ {fmtCurrency(subTotal)}</span>
              </div>
              {activeTab.isGst && (
                <div className="flex justify-between items-center">
                  <span>GST Tax Total</span>
                  <span className="font-bold text-emerald-700">+ ₹ {fmtCurrency(totalTax)}</span>
                </div>
              )}

              {/* Round Off Toggle */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={activeTab.roundOffEnabled}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="cursor-pointer"
                  />
                  <span>Round Off</span>
                </label>
                <span className="font-mono text-slate-500 text-xs">
                  {roundOffVal ? (roundOffVal > 0 ? `+${roundOffVal.toFixed(2)}` : roundOffVal.toFixed(2)) : "0.00"}
                </span>
              </div>
            </div>

            {/* Grand Total Hero Box */}
            <div className="bg-gradient-to-tr from-rose-600 to-amber-600 rounded-2xl p-4 text-white shadow-md shadow-rose-500/20 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-rose-100 uppercase tracking-wider block">Total Expense</span>
                <span className="text-2xl font-black tracking-tight">₹ {fmtCurrency(grandTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-extrabold uppercase">
                  Disbursed
                </span>
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* ── 4. STICKY FLOATING ACTION FOOTER ── */}
      <footer className="bg-white border-t border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between sticky bottom-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-rose-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? "Saving..." : "Save Expense"}</span>
          </button>
        </div>
      </footer>

      {/* Close Confirm Modal */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases/expenses")}
      />

      {/* Calculator Modal */}
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
