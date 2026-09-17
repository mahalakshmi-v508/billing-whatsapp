import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import AddExpenseItemModal from "./AddExpenseItemModal";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Calculator,
  Layers,
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
  AlertCircle,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Check,
  SlidersHorizontal,
} from "lucide-react";

const DEFAULT_ITEM_COLUMNS = [
  { key: "item_name", label: "Item Name / Description", icon: Layers, color: "text-blue-600", bg: "bg-blue-50", desc: "Expense item name / description" },
  { key: "qty", label: "Qty", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Quantity / count" },
  { key: "price", label: "Price / Rate", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Unit price / rate" },
  { key: "gst_rate", label: "Tax (GST)", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "GST tax rate & amount" },
  { key: "amount", label: "Amount", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Total line expense amount" },
];

const gstSlabs = [
  { label: "0% GST", value: 0 },
  { label: "5% GST", value: 5 },
  { label: "12% GST", value: 12 },
  { label: "18% GST", value: 18 },
  { label: "28% GST", value: 28 }
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
    expenseNo: expenseNoValue ? String(expenseNoValue) : `EXP-${String(index).padStart(4, "0")}`,
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
          <h3 className="text-sm font-bold text-slate-900">Close Expense Workspace</h3>
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
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer"
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
        // eslint-disable-next-line no-eval
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
          <span className="font-bold text-xs flex items-center gap-1.5"><Calculator size={13} /> Calculator</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-4 bg-slate-50 text-right text-2xl font-black text-slate-900 min-h-[56px] border-b border-slate-200 font-mono">
          {calcInput || "0"}
        </div>
        <div className="grid grid-cols-4 gap-2 p-3 bg-white">
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => handleBtn(b)}
              className={`py-3 text-sm font-bold rounded-xl border transition cursor-pointer font-mono ${
                b === "="
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
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
  const [toast, setToast] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Column customization drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("expense_item_columns", DEFAULT_ITEM_COLUMNS);

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
  const handleAddTab = async () => {
    const nextIdx = tabs.length + 1;
    let nextExpenseNo = String(nextIdx);
    try {
      const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=expense`);
      if (numRes.data?.status && numRes.data?.formatted_number) {
        nextExpenseNo = numRes.data.formatted_number;
      }
    } catch {
      nextExpenseNo = `EXP-${String(nextIdx).padStart(4, "0")}`;
    }
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
      
      const cnt = countRes.data?.count || 0;
      setExistingCount(cnt);

      if (!isEditMode) {
        try {
          const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=expense`);
          if (numRes.data?.status && numRes.data?.formatted_number) {
            updateActiveTab({ expenseNo: numRes.data.formatted_number });
          } else {
            updateActiveTab({ expenseNo: `EXP-${String(cnt + 1).padStart(4, "0")}` });
          }
        } catch {
          updateActiveTab({ expenseNo: `EXP-${String(cnt + 1).padStart(4, "0")}` });
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
      diff = Number((rounded - rawTotal).toFixed(2));
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
    setErrorMsg("");
    const validRows = activeTab.rows.filter((r) => r.item_name && (parseFloat(r.price) || 0) >= 0);
    if (validRows.length === 0 && !activeTab.categoryName) {
      setErrorMsg("Please select a Category or enter an item name with price.");
      return;
    }

    if (!activeTab.categoryName) {
      setErrorMsg("Please select or enter an Expense Category.");
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
        const savedExpenseNo = res.data.expense_no || res.data.invoice_no || activeTab.expenseNo;
        if (isEditMode) {
          setToast(`Expense #${savedExpenseNo} updated successfully!`);
          setTimeout(() => navigate("/purchases/expenses"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Expense #${savedExpenseNo} recorded successfully!`);
            setTimeout(() => setToast(null), 4000);

            let nextExpenseNo = "";
            try {
              const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=expense`);
              if (numRes.data?.status && numRes.data?.formatted_number) {
                nextExpenseNo = numRes.data.formatted_number;
              } else {
                nextExpenseNo = `EXP-${String(existingCount + 2).padStart(4, "0")}`;
              }
            } catch (e) {
              nextExpenseNo = `EXP-${String(existingCount + 2).padStart(4, "0")}`;
            }

            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === activeTabId
                  ? createNewExpenseTab(tab.id, 1, nextExpenseNo)
                  : tab
              )
            );
          } else {
            navigate(`/invoice/${savedExpenseNo}`);
          }
        }
      } else {
        setErrorMsg(res.data?.message || "Failed to save expense");
      }
    } catch (err) {
      console.error("Error saving expense:", err);
      setErrorMsg("Failed to save expense");
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20">
      {/* ── 1. EXECUTIVE COMMAND BAR & EXPENSE VOUCHER TABS ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 pt-3 pb-0 shadow-xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          {/* Voucher Workspace Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t-2 ${
                    isActive
                      ? "border-blue-600 bg-slate-50 text-blue-700 shadow-xs font-bold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Receipt size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.expenseNo || "Draft"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-200/80 transition"
                    title="Close tab"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* + Add New Expense Tab */}
            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTab}
                className="h-8 px-2.5 mb-1 flex items-center gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold border border-dashed border-blue-300 transition cursor-pointer"
                title="Add New Expense Voucher"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Expense</span>
              </button>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 pb-2 flex-shrink-0">
            {/* GST Dual Mode Toggle Switch */}
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <span className={`text-[11px] font-bold uppercase ${activeTab.isGst ? "text-blue-700 font-black" : "text-slate-500"}`}>
                {activeTab.isGst ? "GST Tax On" : "Non-GST"}
              </span>
              <div
                onClick={() => {
                  const newGst = !activeTab.isGst;
                  const recalculated = activeTab.rows.map((r) => calculateRow(r, newGst));
                  updateActiveTab({ isGst: newGst, rows: recalculated });
                }}
                className={`w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-colors ${activeTab.isGst ? "bg-blue-600" : "bg-slate-300"}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${activeTab.isGst ? "translate-x-3.5" : "translate-x-0"}`} />
              </div>
            </div>

            <HeaderSettingsButton variant="voucher" onClick={() => setShowColumnDrawer(true)} />

            {/* Quick Calculator */}
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              title="Toggle Quick Calculator"
            >
              <Calculator size={15} />
              <span className="hidden md:inline">Calculator</span>
            </button>

            {/* Close Page */}
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close Workspace"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. WORKSPACE HEADER BANNER ── */}
      <div className="px-6 md:px-8 pt-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Expenses"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                  Corporate Overhead
                </span>
                <span className="text-xs text-slate-400 font-medium">• Direct & Indirect Expenses</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Expense Voucher #${activeTab.expenseNo}` : "Corporate Expense & Overhead Console"}
              </h1>
            </div>
          </div>
        </div>

        {/* Success Toast & Error Alerts */}
        {toast && (
          <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. EXPENSE CLASSIFICATION & VOUCHER PARAMETERS CARDS ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Classification & Beneficiary Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Tag size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Classification & Beneficiary</h3>
                <p className="text-[11px] text-slate-400">Select expense head category and payee vendor</p>
              </div>
            </div>

            {activeTab.selectedCategory && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 border border-purple-200 text-purple-700">
                {activeTab.selectedCategory.type || "Indirect Expense"}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Category Search Box */}
            <div ref={categoryRef} className="relative sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Expense Category Head <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border rounded-xl px-3.5 py-2.5 transition bg-white flex items-center justify-between ${
                  showCategoryDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  <FolderPlus size={15} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search or enter expense category (e.g. Office Rent, Electricity, Travel)..."
                    value={activeTab.categoryName}
                    onChange={(e) => {
                      updateActiveTab({ categoryName: e.target.value, selectedCategory: null });
                      setShowCategoryDropdown(true);
                    }}
                    onClick={() => setShowCategoryDropdown(true)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <ChevronDown
                  size={15}
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="text-slate-400 cursor-pointer flex-shrink-0"
                />
              </div>

              {/* Suggestions Popover */}
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-50 py-1.5 animate-in fade-in">
                  {categories
                    .filter((c) => (c.name || "").toLowerCase().includes((activeTab.categoryName || "").toLowerCase()))
                    .map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          updateActiveTab({ selectedCategory: c, categoryName: c.name });
                          setShowCategoryDropdown(false);
                        }}
                        className="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition"
                      >
                        <span className="font-bold text-xs text-slate-900">{c.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {c.type || "Indirect Expense"}
                        </span>
                      </div>
                    ))}
                  {categories.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Will create <b className="text-slate-800">"{activeTab.categoryName}"</b> as new category.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Paid To / Beneficiary Party */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Paid To / Payee Name</label>
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Beneficiary / Vendor name..."
                  value={activeTab.partyName}
                  onChange={(e) => updateActiveTab({ partyName: e.target.value })}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Payee Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Payee Phone / Contact</label>
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Phone number..."
                  value={activeTab.partyPhone}
                  onChange={(e) => updateActiveTab({ partyPhone: e.target.value })}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Voucher Parameters Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Receipt size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Voucher Parameters</h3>
              <p className="text-[11px] text-slate-400">Sequential voucher ref & transaction date</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Voucher # */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Expense Voucher #
              </span>
              <input
                type="text"
                value={activeTab.expenseNo}
                onChange={(e) => updateActiveTab({ expenseNo: e.target.value })}
                className="w-40 text-right font-mono font-bold text-xs text-blue-700 bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
              />
            </div>

            {/* Expense Date */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Expense Date
              </span>
              <input
                type="date"
                value={activeTab.expenseDate}
                onChange={(e) => updateActiveTab({ expenseDate: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            {/* Tax Deductible Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Percent size={13} className="text-slate-400" /> Tax Treatment
              </span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                activeTab.isGst ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"
              }`}>
                {activeTab.isGst ? "Input GST Tax Deductible" : "Standard Non-GST Expense"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. OVERHEAD ITEMS & DIRECT COST MATRIX ── */}
      <div className="px-6 md:px-8 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Overhead Items & Direct Costs</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                {activeTab.rows.length} Rows
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Expense Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-3.5 border-r border-slate-200 w-12 text-center">#</th>
                  {visibleColumns.item_name && (
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[280px]">ITEM NAME / SERVICE DESCRIPTION</th>
                  )}
                  {visibleColumns.qty && (
                    <th className="py-3 px-3 border-r border-slate-200 w-24 text-right">QTY</th>
                  )}
                  {visibleColumns.price && (
                    <th className="py-3 px-3 border-r border-slate-200 w-36 text-right">PRICE / RATE (₹)</th>
                  )}
                  {activeTab.isGst && visibleColumns.gst_rate && (
                    <th className="py-3 px-3 border-r border-slate-200 w-36 text-right">GST TAX RATE</th>
                  )}
                  {visibleColumns.amount && (
                    <th className="py-3 px-4 border-r border-slate-200 w-36 text-right">AMOUNT</th>
                  )}
                  <th className="py-3 px-3 w-16 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activeTab.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/25 transition-colors group">
                    {/* Index */}
                    <td className="py-2.5 px-3.5 border-r border-slate-200 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Item Name with Catalog Autocomplete */}
                    {visibleColumns.item_name && (
                      <td className="py-2 px-3 border-r border-slate-200 relative">
                        <input
                          type="text"
                          placeholder="Search catalog item or type service description..."
                          value={row.item_name}
                          onChange={(e) => {
                            handleRowChange(idx, "item_name", e.target.value);
                            setActiveItemSearchIndex(idx);
                          }}
                          onClick={() => setActiveItemSearchIndex(idx)}
                          onFocus={() => setActiveItemSearchIndex(idx)}
                          className="w-full bg-transparent outline-none font-semibold text-slate-800 text-xs placeholder:font-normal placeholder:text-slate-400"
                        />

                        <div className="mt-1 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setModalTargetRowIndex(idx);
                              setModalInitialItemName(row.item_name || "");
                              setShowAddItemModal(true);
                            }}
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={11} strokeWidth={2.5} />
                            <span>Add to Catalog</span>
                          </button>
                        </div>

                        {/* Suggestions Popover */}
                        {activeItemSearchIndex === idx && (
                          <div
                            ref={itemSuggestRef}
                            className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 py-1"
                          >
                            {expenseItemsCatalog
                              .filter((item) =>
                                (item.item_name || "").toLowerCase().includes((row.item_name || "").toLowerCase())
                              )
                              .map((item) => (
                                <div
                                  key={item.id}
                                  onClick={() => handleSelectItem(idx, item)}
                                  className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs border-b border-slate-50 last:border-none transition"
                                >
                                  <span className="font-bold text-slate-800">{item.item_name}</span>
                                  <span className="text-blue-600 font-mono font-bold">₹{parseFloat(item.price || 0).toLocaleString()}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Qty */}
                    {visibleColumns.qty && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={row.qty}
                          onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                          className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                        />
                      </td>
                    )}

                    {/* Price / Rate */}
                    {visibleColumns.price && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                          className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                        />
                      </td>
                    )}

                    {/* GST Tax Rate */}
                    {activeTab.isGst && visibleColumns.gst_rate && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={row.tax_rate}
                            onChange={(e) => handleRowChange(idx, "tax_rate", e.target.value)}
                            className="bg-transparent outline-none text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            {gstSlabs.map((s) => (
                              <option key={s.label} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-300">|</span>
                          <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-right">
                            {row.tax_amt ? Number(row.tax_amt).toFixed(1) : "0.0"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {visibleColumns.amount && (
                      <td className="py-2 px-4 border-r border-slate-200 text-right font-black text-slate-900 text-xs font-mono">
                        ₹{fmtCurrency(row.amount)}
                      </td>
                    )}

                    {/* Action */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        disabled={activeTab.rows.length <= 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30 cursor-pointer"
                        title="Delete row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-200 text-xs">
                  <td colSpan={visibleColumns.item_name ? 2 : 1} className="py-3 px-4 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>ADD EXPENSE ROW</span>
                    </button>
                  </td>
                  {visibleColumns.qty && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-black">{totalQty}</td>
                  )}
                  {visibleColumns.price && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-bold text-slate-500">TOTALS</td>
                  )}
                  {activeTab.isGst && visibleColumns.gst_rate && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                      ₹ {fmtCurrency(totalTax)}
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="py-3 px-4 border-r border-slate-200 text-right text-sm text-purple-700 font-black font-mono">
                      ₹ {fmtCurrency(calculatedTotal)}
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── 5. SETTLEMENT & EXECUTIVE SUMMARY ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Disbursement Method & Remarks (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Payment Disbursement & Remarks</h3>
          </div>

          {/* Payment Method Selector Chips */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-2 block">Disbursement Mode</label>
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
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">Voucher Notes / Description</label>
            <textarea
              rows={2}
              placeholder="Enter purpose, transaction ID, or bill reference notes..."
              value={activeTab.description}
              onChange={(e) => updateActiveTab({ description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-blue-500 font-medium resize-none bg-slate-50/50"
            />
          </div>
        </div>

        {/* Right: Financial Reconciliation & Grand Total Billboard (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <DollarSign size={16} className="text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Financial Disbursement Summary</h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Gross Subtotal */}
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Subtotal (Net Costs)</span>
                <span className="font-mono font-bold text-slate-900">₹ {fmtCurrency(subTotal)}</span>
              </div>

              {/* GST Tax Total */}
              {activeTab.isGst && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Input GST Tax</span>
                  <span className="font-mono font-bold text-emerald-700">+ ₹ {fmtCurrency(totalTax)}</span>
                </div>
              )}

              {/* Round Off */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(activeTab.roundOffEnabled)}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                  />
                  <span className="font-bold text-slate-700">Auto Round-Off</span>
                </label>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  {roundOffVal !== 0 ? (roundOffVal > 0 ? `+₹${roundOffVal}` : `-₹${Math.abs(roundOffVal)}`) : "₹0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Grand Total Hero Banner */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-2xl p-5 text-white shadow-lg shadow-purple-600/20">
              <div className="flex items-center justify-between text-purple-200 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Total Expense Disbursed</span>
                <span className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-[10px]">Settled</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                ₹ {fmtCurrency(grandTotal)}
              </div>
              <div className="mt-2 text-[11px] text-purple-200/90 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span>Recorded against company operational ledger</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. STICKY COMMAND FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveExpense}
            className="app-btn-primary px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditMode ? "Update Expense" : "Save Expense"}</span>
          </button>
        </div>
      </div>

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

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_ITEM_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in expense items"
      />
    </div>
  );
}
