import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
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
  AlertCircle,
  CheckCircle2,
  Share2,
  ReceiptText,
  Wallet
} from "lucide-react";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import { useTableColumns } from "../../../hooks/useTableColumns";

const DEFAULT_ADD_EXPENSE_ITEM_COLUMNS = [
  { id: "seq", label: "#", defaultVisible: true },
  { id: "item_name", label: "Item Name / Description", defaultVisible: true, fixed: true },
  { id: "qty", label: "Qty", defaultVisible: true },
  { id: "price", label: "Price / Rate", defaultVisible: true },
  { id: "tax_rate", label: "GST Tax Rate", defaultVisible: true },
  { id: "amount", label: "Amount", defaultVisible: true },
  { id: "action", label: "Action", defaultVisible: true, fixed: true },
];

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
    expenseNo: expenseNoValue ? String(expenseNoValue) : "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentType: "Cash",
    roundOffEnabled: true,
    showDescription: false,
    description: "",
    rows: [createInitialExpenseRow(1)],
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
        className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Close Expense Workspace</h3>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current unsaved changes will be discarded. Do you wish to continue and return to the expense list?
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
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
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition cursor-pointer"
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

  const {
    columns: tableColumns,
    isOpen: isSettingsOpen,
    openSettings,
    closeSettings,
    toggleColumn,
    resetColumns,
    isColumnVisible,
  } = useTableColumns(DEFAULT_ADD_EXPENSE_ITEM_COLUMNS, "add_expense_item_columns_v1");

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

  const categoryRef = useRef(null);
  const itemSuggestRef = useRef(null);
  const activeInputRef = useRef(null);
  const [suggestCoords, setSuggestCoords] = useState(null);

  const updateSuggestPosition = (inputEl) => {
    if (!inputEl) return;
    const rect = inputEl.getBoundingClientRect();
    const dropdownHeight = 224;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + 4;
    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      top = Math.max(8, rect.top - dropdownHeight - 4);
    }

    setSuggestCoords({
      top,
      left: rect.left,
      width: Math.max(rect.width, 320),
    });
  };

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

  // Fetch next expense voucher number immediately on mount in parallel
  useEffect(() => {
    if (isEditMode) return;
    let cancelled = false;
    api.get(`/invoice-settings/next-number?company_id=${companyId}&type=expense`)
      .then((numRes) => {
        if (cancelled) return;
        if (numRes.data?.status && numRes.data?.formatted_number) {
          updateActiveTab({ expenseNo: numRes.data.formatted_number });
        }
      })
      .catch((err) => {
        console.error("Error fetching next expense number:", err);
      });
    return () => { cancelled = true; };
  }, [companyId, isEditMode]);

  // Load Categories & Items Catalog in parallel
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

  // Reposition dropdown on window scroll or resize
  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeItemSearchIndex !== null && activeInputRef.current) {
        updateSuggestPosition(activeInputRef.current);
      }
    };
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [activeItemSearchIndex]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (
        itemSuggestRef.current &&
        !itemSuggestRef.current.contains(e.target) &&
        (!activeInputRef.current || !activeInputRef.current.contains(e.target))
      ) {
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

    // Automatically append next row if there is no empty row at the end
    const hasEmptyRowAtEnd =
      updated.length > 0 &&
      (!updated[updated.length - 1].item_name || updated[updated.length - 1].item_name.trim() === "");

    if (!hasEmptyRowAtEnd) {
      updated.push(createInitialExpenseRow());
    }

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

            // Fetch next sequential expense number from settings
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

            // Reset active tab for continuous next expense data entry
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 antialiased">
      
      {/* ── 1. EXECUTIVE COMMAND BAR & MULTI-EXPENSE VOUCHER TABS ── */}
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
                    <ReceiptText size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title || `Expense #${tab.id}`}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.expenseNo || "Draft"}
                    </span>
                  </div>
                  {tabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-200/80 transition"
                      title="Close tab"
                    >
                      <X size={11} />
                    </button>
                  )}
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
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Calculator"
            >
              <Calculator size={17} />
            </button>

            <HeaderSettingsButton
              variant="voucher"
              onClick={openSettings}
              isActive={isSettingsOpen}
              title="Customise Table Columns"
            />

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
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  OPERATIONAL OVERHEADS
                </span>
                <span className="text-xs text-slate-400 font-medium">• Expense Voucher &amp; Petty Cash</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Expense Voucher #${activeTab.expenseNo || editId}` : "Expense Voucher Studio"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher: Non-GST Expense | GST Expense */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  if (activeTab.isGst) {
                    const recalculated = activeTab.rows.map((r) => calculateRow(r, false));
                    updateActiveTab({ isGst: false, rows: recalculated });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  !activeTab.isGst ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet size={13} />
                <span>Non-GST Expense</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!activeTab.isGst) {
                    const recalculated = activeTab.rows.map((r) => calculateRow(r, true));
                    updateActiveTab({ isGst: true, rows: recalculated });
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab.isGst ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ReceiptText size={13} />
                <span>GST Expense</span>
              </button>
            </div>

            {/* Copy Summary Quick Action */}
            <button
              type="button"
              onClick={() => {
                const summary =
                  "Expense Voucher Details:\n" +
                  `Voucher #: ${activeTab.expenseNo}\n` +
                  `Category: ${activeTab.categoryName || "Uncategorized"}\n` +
                  `Party: ${activeTab.partyName || "Direct / Self"}\n` +
                  `Total: ₹${grandTotal.toFixed(2)}\n` +
                  `Payment Mode: ${activeTab.paymentType.toUpperCase()}`;
                navigator.clipboard?.writeText(summary);
                setToast("Expense summary copied to clipboard!");
                setTimeout(() => setToast(null), 3000);
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>Copy Summary</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toast && (
          <div className="mt-4 px-4 py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. EXPENSE CATEGORY & PARAMETERS CARDS (2-Column Grid) ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        
        {/* Left: Category & Beneficiary / Party (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between" ref={categoryRef}>
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Tag size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Expense Category &amp; Payee</h3>
                  <p className="text-[11px] text-slate-400">Classify expense category or enter party/vendor</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1">
                  {activeTab.selectedCategory?.type || "Operational Overhead"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Expense Category Autocomplete */}
              <div className="sm:col-span-12 relative">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  Expense Category <span className="text-rose-500">*</span>
                </label>
                <div
                  className={`relative border rounded-xl px-3.5 py-2 transition bg-white flex items-center justify-between ${
                    showCategoryDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <FolderPlus size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search or enter expense category (e.g. Office Rent, Fuel)..."
                      value={activeTab.categoryName}
                      onChange={(e) => {
                        updateActiveTab({ categoryName: e.target.value, selectedCategory: null });
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onClick={() => setShowCategoryDropdown(true)}
                      className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 cursor-pointer ml-1.5 flex-shrink-0 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                    onClick={() => setShowCategoryDropdown((v) => !v)}
                  />
                </div>

                {/* Dropdown */}
                {showCategoryDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1 divide-y divide-slate-100 animate-in fade-in duration-100">
                    {categories
                      .filter((c) => (c.name || "").toLowerCase().includes((activeTab.categoryName || "").toLowerCase()))
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            updateActiveTab({ selectedCategory: c, categoryName: c.name });
                            setShowCategoryDropdown(false);
                          }}
                          className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                        >
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {c.type || "Indirect Expense"}
                          </span>
                        </div>
                      ))}
                    {categories.length === 0 && (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        Will record <b>"{activeTab.categoryName}"</b> as new category
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Party / Payee Name */}
              <div className="sm:col-span-7">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Paid To / Beneficiary Name</label>
                <div className="relative border border-slate-300 rounded-xl px-3.5 py-2 bg-white flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <User size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Beneficiary / vendor name (optional)"
                    value={activeTab.partyName}
                    onChange={(e) => updateActiveTab({ partyName: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Party Phone */}
              <div className="sm:col-span-5">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Party Phone</label>
                <div className="relative border border-slate-300 rounded-xl px-3.5 py-2 bg-white flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <Phone size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="10-digit mobile number"
                    value={activeTab.partyPhone}
                    onChange={(e) => updateActiveTab({ partyPhone: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Voucher Metadata Parameters (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Voucher Parameters</h3>
                <p className="text-[11px] text-slate-400">Document number, posting date &amp; classification</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Expense Voucher # */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Voucher #</label>
                <div className="px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs font-black text-blue-700 font-mono tracking-wide text-center">
                  {activeTab.expenseNo || "Draft"}
                </div>
              </div>

              {/* Expense Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Expense Date</label>
                <div className="relative border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white flex items-center focus-within:border-blue-500 transition">
                  <input
                    type="date"
                    value={activeTab.expenseDate}
                    onChange={(e) => updateActiveTab({ expenseDate: e.target.value })}
                    className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Classification Badge Card */}
            <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Tax Classification</span>
                <span className="text-xs font-bold text-slate-800">
                  {activeTab.isGst ? "Input Tax Credit (ITC Eligible)" : "Direct Overhead (Non-GST)"}
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${activeTab.isGst ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                {activeTab.isGst ? "GST Expense" : "Non-GST"}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* ── 4. LINE ITEMS MATRIX TABLE CARD ── */}
      <div className="px-6 md:px-8 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 rounded-t-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Layers size={14} />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Line Items &amp; Expense Catalog
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {activeTab.rows.length} {activeTab.rows.length === 1 ? "Row" : "Rows"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Type item description or choose from category catalog
            </span>
          </div>

          <div className="overflow-x-auto min-h-[160px]">
            <table className="w-full text-left text-xs border-collapse min-w-[880px]">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-600 font-bold select-none text-[11px] uppercase tracking-wider">
                  {isColumnVisible("seq") && <th className="py-3 px-3 text-center border-r border-slate-200/60 w-12">#</th>}
                  {isColumnVisible("item_name") && <th className="py-3 px-4 border-r border-slate-200/60 min-w-[240px]">Item Name / Service Description</th>}
                  {isColumnVisible("qty") && <th className="py-3 px-3 text-center border-r border-slate-200/60 w-24">Qty</th>}
                  {isColumnVisible("price") && <th className="py-3 px-3 text-center border-r border-slate-200/60 w-32">Price / Rate (₹)</th>}
                  {activeTab.isGst && isColumnVisible("tax_rate") && (
                    <th className="py-3 px-0 text-center border-r border-slate-200/60 w-36">
                      <div className="border-b border-slate-200/60 pb-1">GST Tax Rate</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-400">
                        <span>% Slab</span>
                        <span>Tax (₹)</span>
                      </div>
                    </th>
                  )}
                  {isColumnVisible("amount") && <th className="py-3 px-4 text-right border-r border-slate-200/60 w-32">Amount (₹)</th>}
                  <th className="py-3 px-2 text-center w-12">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {activeTab.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* Index */}
                    {isColumnVisible("seq") && (
                      <td className="py-2.5 px-3 text-center border-r border-slate-200/60 text-slate-400 font-bold">
                        {idx + 1}
                      </td>
                    )}

                    {/* Item Name Autocomplete */}
                    {isColumnVisible("item_name") && (
                      <td className="py-2 px-3 border-r border-slate-200/60 relative">
                        <input
                          type="text"
                          placeholder="Search item from catalog or enter name..."
                          value={row.item_name}
                          onChange={(e) => {
                            handleRowChange(idx, "item_name", e.target.value);
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setActiveItemSearchIndex(idx);
                          }}
                          onClick={(e) => {
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setActiveItemSearchIndex(idx);
                          }}
                          onFocus={(e) => {
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setActiveItemSearchIndex(idx);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = (row.item_name || "").trim().toLowerCase();
                              if (!val) return;
                              const match = expenseItemsCatalog.find(
                                (item) => (item.item_name || "").trim().toLowerCase() === val
                              );
                              if (match) {
                                handleSelectItem(idx, match);
                              } else {
                                const hasEmptyRowAtEnd =
                                  activeTab.rows.length > 0 &&
                                  (!activeTab.rows[activeTab.rows.length - 1].item_name || activeTab.rows[activeTab.rows.length - 1].item_name.trim() === "");
                                if (!hasEmptyRowAtEnd) {
                                  updateActiveTab({ rows: [...activeTab.rows, createInitialExpenseRow()] });
                                }
                                setActiveItemSearchIndex(null);
                              }
                            }
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />

                        {/* Add to Catalog Trigger */}
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
                            <span>+ Add to Catalog</span>
                          </button>
                        </div>
                      </td>
                    )}

                    {/* Qty */}
                    {isColumnVisible("qty") && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={row.qty}
                          onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Price */}
                    {isColumnVisible("price") && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => handleRowChange(idx, "price", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Tax Rate (if GST enabled) */}
                    {activeTab.isGst && isColumnVisible("tax_rate") && (
                      <td className="py-2 px-2 border-r border-slate-200/60">
                        <div className="grid grid-cols-2 gap-1 items-center">
                          <select
                            value={row.tax_rate}
                            onChange={(e) => handleRowChange(idx, "tax_rate", e.target.value)}
                            className="w-full py-1.5 px-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                          >
                            {gstSlabs.map((s) => (
                              <option key={s.label} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <span className="text-xs font-bold text-slate-600 text-center font-mono truncate">
                            {row.tax_amt ? `₹${Number(row.tax_amt).toFixed(1)}` : "-"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {isColumnVisible("amount") && (
                      <td className="py-2.5 px-4 text-right border-r border-slate-200/60 font-black text-slate-900 text-xs font-mono">
                        ₹ {fmtCurrency(row.amount)}
                      </td>
                    )}

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
                <tr className="border-t-2 border-slate-200/80 bg-slate-50/80 font-bold text-slate-800 text-xs">
                  <td colSpan={isColumnVisible("seq") ? 2 : 1} className="py-3 px-4 border-r border-slate-200/60">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer border border-blue-200/60 shadow-2xs"
                    >
                      <Plus size={14} strokeWidth={2.5} />
                      <span>Add Row</span>
                    </button>
                  </td>
                  {isColumnVisible("qty") && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 text-slate-900 font-black">
                      {totalQty}
                    </td>
                  )}
                  {isColumnVisible("price") && <td className="border-r border-slate-200/60"></td>}
                  {activeTab.isGst && isColumnVisible("tax_rate") && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 text-emerald-700 font-mono font-black">
                      ₹ {fmtCurrency(totalTax)}
                    </td>
                  )}
                  {isColumnVisible("amount") && (
                    <td className="py-3 px-4 text-right border-r border-slate-200/60 font-black text-slate-900 font-mono">
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

      {/* ── Product Suggestions Floating Popover Portal ── */}
      {activeItemSearchIndex !== null && suggestCoords && createPortal(
        <div
          ref={itemSuggestRef}
          style={{
            position: "fixed",
            top: `${suggestCoords.top}px`,
            left: `${suggestCoords.left}px`,
            width: `${suggestCoords.width}px`,
            zIndex: 999999,
          }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto py-1 divide-y divide-slate-100 animate-in fade-in duration-100"
        >
          {(() => {
            const currentRow = activeTab?.rows?.[activeItemSearchIndex];
            const q = (currentRow?.item_name || "").toLowerCase().trim();
            const filtered = expenseItemsCatalog.filter(
              (item) =>
                !q || (item.item_name || "").toLowerCase().includes(q)
            ).slice(0, 50);

            if (filtered.length === 0) {
              return (
                <div className="px-4 py-3 text-center text-xs text-slate-400 select-none">
                  No items found in catalog. Type custom item name.
                </div>
              );
            }

            return filtered.map((item) => (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectItem(activeItemSearchIndex, item);
                }}
                className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
              >
                <span className="font-bold text-slate-800">{item.item_name}</span>
                <span className="font-black text-blue-600 font-mono">₹{item.price}</span>
              </div>
            ));
          })()}
        </div>,
        document.body
      )}

      {/* ── 5. SETTLEMENT & TOTALS RECONCILIATION SUMMARY ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mb-6">
        
        {/* Left 7 Columns: Payment Mode & Notes */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={14} />
            </div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Disbursement &amp; Notes</h3>
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
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-500/25"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Expense Voucher Remarks &amp; Notes</label>
            <textarea
              rows={2}
              placeholder="Enter expense reason, reference number, or transaction notes..."
              value={activeTab.description}
              onChange={(e) => updateActiveTab({ description: e.target.value })}
              className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition resize-none"
            />
          </div>
        </div>

        {/* Right 5 Columns: Financial Summary & Breakdown */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Wallet size={14} />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Breakdown</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              INR (₹)
            </span>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="space-y-2.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900 font-mono">₹ {fmtCurrency(subTotal)}</span>
            </div>

            {activeTab.isGst && (
              <div className="flex justify-between items-center">
                <span>GST Tax Total</span>
                <span className="font-bold text-emerald-700 font-mono">+ ₹ {fmtCurrency(totalTax)}</span>
              </div>
            )}

            {/* Round Off Toggle */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                <input
                  type="checkbox"
                  checked={activeTab.roundOffEnabled}
                  onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
                <span>Auto Round Off</span>
              </label>
              <span className="text-slate-600 font-bold text-xs font-mono">
                {roundOffVal ? (roundOffVal > 0 ? `+₹${roundOffVal.toFixed(2)}` : `-₹${Math.abs(roundOffVal).toFixed(2)}`) : "₹0.00"}
              </span>
            </div>
          </div>

          {/* Grand Total Hero Box */}
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">Total Expense Amount</span>
              <span className="text-2xl font-black tracking-tight font-mono">₹ {fmtCurrency(grandTotal)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase">
                {activeTab.paymentType} Mode
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ── 6. FIXED FLOATING ACTION FOOTER ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 z-30 flex items-center justify-between shadow-lg">
        <button
          type="button"
          onClick={() => setShowCloseModal(true)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
        >
          Discard
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 mr-2">
            <span>Rows: <strong className="text-slate-900">{activeTab.rows.length}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-blue-600 font-mono font-black">₹{fmtCurrency(grandTotal)}</strong></span>
          </div>

          <button
            type="button"
            onClick={handleSaveExpense}
            disabled={saving}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            <span>{saving ? "Saving..." : isEditMode ? "Update Expense" : "Save Expense"}</span>
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

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        columns={tableColumns}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        title="Customize Expense Line Item Columns"
      />

    </div>
  );
}
