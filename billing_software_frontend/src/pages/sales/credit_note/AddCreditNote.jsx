import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Search,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  Phone,
  FileText,
  MapPin,
  CreditCard,
  Wallet,
  TrendingDown,
  Save,
  Layers,
  Sparkles,
  DollarSign,
  Check,
  Percent,
} from "lucide-react";

const DEFAULT_ITEM_COLUMNS = [
  { key: "item", label: "Item", icon: Layers, color: "text-blue-600", bg: "bg-blue-50", desc: "Return product name / description" },
  { key: "qty", label: "Quantity", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Returned item count / quantity" },
  { key: "unit", label: "Unit", icon: Percent, color: "text-purple-600", bg: "bg-purple-50", desc: "Unit of measurement (PCS, KG, etc.)" },
  { key: "price", label: "Price / Unit", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Original unit price" },
  { key: "discount", label: "Discount", icon: Percent, color: "text-amber-600", bg: "bg-amber-50", desc: "Discount percent & amount" },
  { key: "tax", label: "Tax (GST)", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "GST tax rate (%) & amount" },
  { key: "amount", label: "Amount", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Total line item return value" },
];

/* ── Indian States List for State of Supply ──────────────────────────── */
const INDIAN_STATES = [
  "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana",
  "Maharashtra", "Gujarat", "Delhi", "Rajasthan", "Uttar Pradesh",
  "West Bengal", "Bihar", "Odisha", "Punjab", "Haryana", "Goa"
];

/* ── Units List ──────────────────────────────────────────────────────── */
const UNITS = ["NONE", "PCS", "BOX", "KGS", "BAGS", "LTR", "MTR", "DOZEN", "GRAM", "SET"];

/* ── Tax Rates List ──────────────────────────────────────────────────── */
const TAX_RATES = [
  { label: "0% GST", value: 0 },
  { label: "5% GST", value: 5 },
  { label: "12% GST", value: 12 },
  { label: "18% GST", value: 18 },
  { label: "28% GST", value: 28 },
];

function createInitialRow(id = null) {
  return {
    id: id || Date.now() + Math.random(),
    product_id: 0,
    item: "",
    qty: "",
    unit: "PCS",
    price: 0,
    discount_pct: 0,
    discount_amt: 0,
    tax_rate: 0,
    tax_amt: 0,
    amount: 0,
  };
}

function createNewCreditNoteTab(id, index, returnNoValue = null) {
  return {
    id,
    title: `Credit Note #${index}`,
    partyQuery: "",
    selectedParty: null,
    phoneNo: "",
    returnNo: returnNoValue ? String(returnNoValue) : `CN-${String(index).padStart(4, "0")}`,
    invoiceNo: "",
    invoiceDate: "",
    returnDate: new Date().toISOString().split("T")[0],
    stateOfSupply: "Tamil Nadu",
    paymentType: "Cash",
    bottomDiscountPct: 0,
    bottomDiscountAmt: 0,
    paidAmountEnabled: false,
    paidAmount: "",
    rows: [createInitialRow(1), createInitialRow(2)],
  };
}

export default function AddCreditNote() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Tabs state
  const [tabs, setTabs] = useState([createNewCreditNoteTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);

  // Active Tab object
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  }, [tabs, activeTabId]);

  // Column Customization Drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("credit_note_item_columns", DEFAULT_ITEM_COLUMNS);

  // Update active tab helper
  const updateActiveTab = (updates) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // Add new tab with auto-incremented return no
  const handleAddTab = async () => {
    const nextIdx = tabs.length + 1;
    let nextReturnNo = String(nextIdx);
    try {
      const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=credit_note`);
      if (numRes.data?.status && numRes.data?.formatted_number) {
        nextReturnNo = numRes.data.formatted_number;
      }
    } catch {
      nextReturnNo = `CN-${String(nextIdx).padStart(4, "0")}`;
    }
    const newId = Date.now();
    const newTab = createNewCreditNoteTab(newId, nextIdx, nextReturnNo);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close a tab
  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      navigate("/sales/credit-note");
      return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  // Customer party suggestions & state
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [loadingParties, setLoadingParties] = useState(false);
  const partyRef = useRef(null);

  // Products DB
  const [productsList, setProductsList] = useState([]);
  const [activeSearchRow, setActiveSearchRow] = useState(null);

  // UI state
  const [showPaymentTypeDropdown, setShowPaymentTypeDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null);

  // Load products list & prefetch customer list & initialize return no
  useEffect(() => {
    const loadInitData = async () => {
      try {
        if (companyId) {
          const pRes = await api.get(`/product/get?company_id=${companyId}`);
          if (pRes.data?.data) {
            setProductsList(pRes.data.data || []);
          }
        }
        if (adminId) {
          const cRes = await api.get(`/customer/customer_search?admin_id=${adminId}&q=`);
          if (cRes.data?.status) {
            setPartySuggestions(cRes.data.data || []);
          }
        }

        if (!isEditMode) {
          try {
            const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=credit_note`);
            if (numRes.data?.status && numRes.data?.formatted_number) {
              updateActiveTab({ returnNo: numRes.data.formatted_number });
            } else {
              updateActiveTab({ returnNo: "CN-0001" });
            }
          } catch (e) {
            updateActiveTab({ returnNo: "CN-0001" });
          }
        } else {
          const editRes = await api.get(`/credit_note/get_by_id?id=${editId}`);
          if (editRes.data?.status && editRes.data?.data) {
            const cn = editRes.data.data;
            const prods = Array.isArray(cn.products)
              ? cn.products
              : typeof cn.products === "string"
              ? JSON.parse(cn.products || "[]")
              : [];

            updateActiveTab({
              title: `Edit Return #${cn.return_no || cn.id}`,
              returnNo: cn.return_no || String(cn.id),
              invoiceNo: cn.invoice_no || "",
              invoiceDate: cn.invoice_date || "",
              returnDate: cn.return_date || new Date().toISOString().split("T")[0],
              partyQuery: cn.customer_name || "",
              phoneNo: cn.customer_phone || "",
              stateOfSupply: cn.state_of_supply || "Tamil Nadu",
              paymentType: cn.payment_type ? cn.payment_type.charAt(0).toUpperCase() + cn.payment_type.slice(1) : "Cash",
              bottomDiscountAmt: cn.discount_total || 0,
              paidAmountEnabled: parseFloat(cn.refund_amount || 0) > 0,
              paidAmount: parseFloat(cn.refund_amount || 0) > 0 ? String(cn.refund_amount) : "",
              rows: prods.length > 0
                ? prods.map((p, i) => ({
                    id: i + 1,
                    product_id: p.product_id || 0,
                    item: p.item || p.product_name || "",
                    qty: p.qty !== undefined ? String(p.qty) : "1",
                    unit: p.unit || "PCS",
                    price: parseFloat(p.price || 0),
                    discount_pct: parseFloat(p.discount_pct || 0),
                    discount_amt: parseFloat(p.discount_amt || 0),
                    tax_rate: parseFloat(p.tax_rate || 0),
                    tax_amt: parseFloat(p.tax_amt || 0),
                    amount: parseFloat(p.amount || 0),
                  }))
                : [createInitialRow(1)],
            });
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadInitData();
  }, [companyId, adminId, editId, isEditMode]);

  // Search Customer Party
  const handleSearchParty = async (q) => {
    updateActiveTab({ partyQuery: q });
    setShowPartyDropdown(true);
    setLoadingParties(true);
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(q || "")}`);
      if (res.data?.status) {
        setPartySuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingParties(false);
    }
  };

  const selectParty = (cust) => {
    updateActiveTab({
      selectedParty: cust,
      partyQuery: cust.name || cust.customer_name || "",
      phoneNo: cust.phone || "",
    });
    setShowPartyDropdown(false);
    setErrorMsg("");
  };

  // Close party dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Row Calculation Helper
  const recalculateRow = (row) => {
    const q = parseFloat(row.qty) || 0;
    const p = parseFloat(row.price) || 0;
    const gross = q * p;

    let disc = parseFloat(row.discount_amt) || 0;
    if (parseFloat(row.discount_pct) > 0) {
      disc = (gross * parseFloat(row.discount_pct)) / 100;
    }
    const taxable = Math.max(0, gross - disc);

    let tax = 0;
    if (parseFloat(row.tax_rate) > 0) {
      tax = (taxable * parseFloat(row.tax_rate)) / 100;
    }

    const amt = taxable + tax;
    return {
      ...row,
      discount_amt: disc,
      tax_amt: tax,
      amount: amt,
    };
  };

  // Update a Row
  const updateRow = (idx, field, value) => {
    const nextRows = [...activeTab.rows];
    nextRows[idx] = { ...nextRows[idx], [field]: value };
    nextRows[idx] = recalculateRow(nextRows[idx]);
    updateActiveTab({ rows: nextRows });
  };

  // Select Product for Row
  const selectProductForRow = (idx, prod) => {
    const nextRows = [...activeTab.rows];
    const price = parseFloat(prod.price || prod.sale_price || prod.mrp || 0);
    const taxRate = parseFloat(prod.tax_rate || prod.gst_rate || 0);
    const currentQty = nextRows[idx].qty;
    const initialQty = currentQty && parseFloat(currentQty) > 0 ? currentQty : "1";
    nextRows[idx] = recalculateRow({
      ...nextRows[idx],
      product_id: prod.id,
      item: prod.product_name || prod.name,
      qty: initialQty,
      price: price,
      tax_rate: taxRate,
      unit: prod.unit || "PCS",
    });
    updateActiveTab({ rows: nextRows });
    setActiveSearchRow(null);
  };

  // Add Row
  const addRow = () => {
    updateActiveTab({
      rows: [...activeTab.rows, createInitialRow()],
    });
  };

  // Remove Row
  const removeRow = (idx) => {
    if (activeTab.rows.length === 1) return;
    const nextRows = activeTab.rows.filter((_, i) => i !== idx);
    updateActiveTab({ rows: nextRows });
  };

  // Summary Calculations for Active Tab
  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    let disc = 0;
    let totalQty = 0;

    (activeTab.rows || []).forEach((r) => {
      sub += (parseFloat(r.qty) || 0) * (parseFloat(r.price) || 0);
      disc += parseFloat(r.discount_amt) || 0;
      tax += parseFloat(r.tax_amt) || 0;
      totalQty += parseFloat(r.qty) || 0;
    });

    const netBeforeBottom = sub - disc + tax;
    let bottomDisc = parseFloat(activeTab.bottomDiscountAmt) || 0;
    if (parseFloat(activeTab.bottomDiscountPct) > 0) {
      bottomDisc = (netBeforeBottom * parseFloat(activeTab.bottomDiscountPct)) / 100;
    }

    const grandTotal = Math.max(0, netBeforeBottom - bottomDisc);

    const paidAmt = activeTab.paidAmountEnabled
      ? (activeTab.paidAmount !== "" ? parseFloat(activeTab.paidAmount) : grandTotal)
      : 0;
    const balAmt = Math.max(0, grandTotal - paidAmt);

    return {
      subtotal: sub,
      discount: disc + bottomDisc,
      tax: tax,
      totalQty,
      grandTotal: Math.round(grandTotal),
      paidAmount: paidAmt,
      balance: balAmt,
    };
  }, [activeTab]);

  // Calculate real-time impact on Customer Debt & Advance Store Credit
  const customerAdjustment = useMemo(() => {
    if (!activeTab.selectedParty) return null;
    const pending = parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0);
    const advance = parseFloat(activeTab.selectedParty.advance_balance ?? 0);
    const unpaidReturn = totals.balance;

    if (unpaidReturn <= 0) return null;

    const deductFromPending = Math.min(pending, unpaidReturn);
    const remainingPending = Math.max(0, pending - deductFromPending);
    const excessToAdvance = unpaidReturn - deductFromPending;
    const newAdvance = advance + excessToAdvance;

    return {
      currentPending: pending,
      currentAdvance: advance,
      deductFromPending,
      remainingPending,
      excessToAdvance,
      newAdvance,
    };
  }, [activeTab.selectedParty, totals.balance]);

  // Save or Update Credit Note
  const handleSave = async () => {
    const validRows = (activeTab.rows || []).filter((r) => r.item.trim() !== "");
    if (validRows.length === 0) {
      setErrorMsg("Please enter at least one returned item.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const payload = {
        admin_id: adminId,
        company_id: parseInt(companyId) || 0,
        cashier_id: user.id || 0,
        return_no: activeTab.returnNo,
        invoice_no: activeTab.invoiceNo,
        invoice_date: activeTab.invoiceDate,
        return_date: activeTab.returnDate,
        customer_id: activeTab.selectedParty?.id || 0,
        customer_name: activeTab.partyQuery.trim() || "Cash Customer",
        customer_phone: activeTab.phoneNo,
        products: validRows,
        sub_total: totals.subtotal,
        tax_total: totals.tax,
        discount_total: totals.discount,
        round_off: 0,
        total_amount: totals.grandTotal,
        refund_amount: totals.paidAmount,
        balance_amount: totals.balance,
        payment_type: activeTab.paymentType.toLowerCase(),
        state_of_supply: activeTab.stateOfSupply,
        description: "",
      };

      let res;
      if (isEditMode) {
        res = await api.post("/credit_note/update", { id: editId, ...payload });
      } else {
        res = await api.post("/credit_note/create", payload);
      }

      if (res.data.status) {
        const savedReturnNo = res.data.return_no || res.data.invoice_no || activeTab.returnNo;
        if (isEditMode) {
          setToast(`Credit Note #${savedReturnNo} updated successfully!`);
          setTimeout(() => navigate("/sales/credit-note"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Credit Note #${savedReturnNo} created successfully!`);
            setTimeout(() => setToast(null), 4000);

            let nextReturnNo = "";
            try {
              const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=credit_note`);
              if (numRes.data?.status && numRes.data?.formatted_number) {
                nextReturnNo = numRes.data.formatted_number;
              } else {
                nextReturnNo = `CN-${String(tabs.length + 1).padStart(4, "0")}`;
              }
            } catch (e) {
              nextReturnNo = `CN-${String(tabs.length + 1).padStart(4, "0")}`;
            }

            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === activeTabId
                  ? createNewCreditNoteTab(tab.id, 1, nextReturnNo)
                  : tab
              )
            );
          } else {
            navigate(`/invoice/${savedReturnNo}`);
          }
        }
      } else {
        setErrorMsg(res.data.message || "Failed to save credit note.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving credit note.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20">
      {/* ── 1. EXECUTIVE COMMAND BAR & CREDIT NOTE TABS ── */}
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
                    <RotateCcw size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.returnNo || "Draft"}
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

            {/* + Add New Return Tab */}
            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTab}
                className="h-8 px-2.5 mb-1 flex items-center gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold border border-dashed border-blue-300 transition cursor-pointer"
                title="Add New Credit Note"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Return</span>
              </button>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 pb-2 flex-shrink-0">
            <HeaderSettingsButton
              variant="voucher"
              onClick={() => setShowColumnDrawer(true)}
              isActive={showColumnDrawer}
            />

            {/* Close Page */}
            <button
              type="button"
              onClick={() => navigate("/sales/credit-note")}
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
              onClick={() => navigate("/sales/credit-note")}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Credit Notes"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  Sales Return Desk
                </span>
                <span className="text-xs text-slate-400 font-medium">• Customer Credit Voucher</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Credit Note #${activeTab.returnNo}` : "Customer Sales Return & Credit Desk"}
              </h1>
            </div>
          </div>
        </div>

        {/* Success Toast & Error alert */}
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

      {/* ── 3. CUSTOMER INTELLIGENCE & RETURN PARAMETERS CARDS ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Customer Intelligence & Return Context (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer & Party Profile</h3>
                <p className="text-[11px] text-slate-400">Select customer returning goods for ledger balance adjustment</p>
              </div>
            </div>

            {activeTab.selectedParty && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={11} /> Linked Party
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Party AutoComplete */}
            <div ref={partyRef} className="relative sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Party / Customer Name <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border rounded-xl px-3.5 py-2.5 transition bg-white flex items-center justify-between ${
                  showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  <Search size={15} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={activeTab.partyQuery}
                    onChange={(e) => handleSearchParty(e.target.value)}
                    onFocus={() => {
                      handleSearchParty(activeTab.partyQuery);
                      setShowPartyDropdown(true);
                    }}
                    placeholder="Search customer by name or phone..."
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <ChevronDown
                  size={15}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="text-slate-400 cursor-pointer flex-shrink-0"
                />
              </div>

              {/* Suggestions Popover */}
              {showPartyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 py-1.5 animate-in fade-in">
                  {loadingParties ? (
                    <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Loading party directory...</span>
                    </div>
                  ) : partySuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching customers found.
                    </div>
                  ) : (
                    partySuggestions.map((cust) => {
                      const bal = parseFloat(cust.pending_amount ?? cust.balance ?? 0);
                      const adv = parseFloat(cust.advance_balance ?? 0);
                      return (
                        <div
                          key={cust.id}
                          onClick={() => selectParty(cust)}
                          className="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{cust.name || cust.customer_name}</div>
                            {cust.phone && <div className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={10} /> {cust.phone}</div>}
                          </div>
                          <div className="text-right">
                            {bal > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold">
                                Pending Debt: ₹{bal.toLocaleString()}
                              </span>
                            )}
                            {adv > 0 && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                Advance: ₹{adv.toLocaleString()}
                              </span>
                            )}
                            {bal <= 0 && adv <= 0 && (
                              <span className="text-[10px] text-slate-400">Clear</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Phone / Mobile</label>
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={activeTab.phoneNo}
                  onChange={(e) => updateActiveTab({ phoneNo: e.target.value })}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Selected Party Summary Pill */}
            <div className="flex flex-col justify-end">
              {activeTab.selectedParty ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Current Ledger:</span>
                  <div className="flex items-center gap-1.5">
                    {parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0) > 0 ? (
                      <span className="text-xs font-bold text-red-600">
                        ₹{parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0).toLocaleString()} (Customer Debt)
                      </span>
                    ) : parseFloat(activeTab.selectedParty.advance_balance ?? 0) > 0 ? (
                      <span className="text-xs font-bold text-emerald-600">
                        ₹{parseFloat(activeTab.selectedParty.advance_balance ?? 0).toLocaleString()} (Advance Credit)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600">Clear / Zero Balance</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center text-[11px] text-slate-400 italic">
                  One-off cash return mode
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Return & Invoice Parameters Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Return Parameters</h3>
              <p className="text-[11px] text-slate-400">Credit note ref & original invoice linkages</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Credit Note / Return No */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <RotateCcw size={13} className="text-slate-400" /> Return Voucher #
              </span>
              <input
                type="text"
                value={activeTab.returnNo}
                onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
                className="w-40 text-right font-mono font-bold text-xs text-blue-700 bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
              />
            </div>

            {/* Original Invoice No */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Orig. Invoice #
              </span>
              <input
                type="text"
                placeholder="Optional ref #..."
                value={activeTab.invoiceNo}
                onChange={(e) => updateActiveTab({ invoiceNo: e.target.value })}
                className="w-40 text-right font-medium text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
              />
            </div>

            {/* Return Date */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Return Date
              </span>
              <input
                type="date"
                value={activeTab.returnDate}
                onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            {/* State of Supply */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> Place of Supply
              </span>
              <select
                value={activeTab.stateOfSupply}
                onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DYNAMIC RETURNED ITEMS MATRIX ── */}
      <div className="px-6 md:px-8 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Returned Goods Line Items</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {(activeTab.rows || []).length} Items Returned
              </span>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="app-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add Return Item</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-3.5 border-r border-slate-200 w-12 text-center">#</th>
                  {visibleColumns.item && <th className="py-3 px-4 border-r border-slate-200 min-w-[260px]">ITEM</th>}
                  {visibleColumns.qty && <th className="py-3 px-3 border-r border-slate-200 w-24 text-right">QTY</th>}
                  {visibleColumns.unit && <th className="py-3 px-3 border-r border-slate-200 w-24">UNIT</th>}
                  {visibleColumns.price && <th className="py-3 px-3 border-r border-slate-200 w-36 text-right">PRICE/UNIT</th>}
                  {visibleColumns.discount && <th className="py-3 px-3 border-r border-slate-200 w-32 text-right">DISCOUNT</th>}
                  {visibleColumns.tax && <th className="py-3 px-3 border-r border-slate-200 w-32 text-right">TAX</th>}
                  {visibleColumns.amount && <th className="py-3 px-4 border-r border-slate-200 w-36 text-right">AMOUNT</th>}
                  <th className="py-3 px-3 w-16 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {(activeTab.rows || []).map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/25 transition-colors group">
                    {/* Index */}
                    <td className="py-2.5 px-3.5 border-r border-slate-200 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    {/* Item Autocomplete */}
                    {visibleColumns.item && (
                      <td className="py-2 px-3 border-r border-slate-200 relative">
                        <input
                          type="text"
                          placeholder="Search product from sales catalog..."
                          value={row.item}
                          onChange={(e) => {
                            updateRow(idx, "item", e.target.value);
                            setActiveSearchRow(idx);
                          }}
                          onFocus={() => setActiveSearchRow(idx)}
                          className="w-full bg-transparent outline-none font-semibold text-slate-800 text-xs placeholder:font-normal placeholder:text-slate-400"
                        />

                        {/* Suggestions Popover */}
                        {activeSearchRow === idx && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 py-1">
                            {productsList
                              .filter(
                                (p) =>
                                  !row.item ||
                                  (p.product_name &&
                                    p.product_name.toLowerCase().includes(row.item.toLowerCase()))
                              )
                              .slice(0, 8)
                              .map((prod) => (
                                <div
                                  key={prod.id}
                                  onClick={() => selectProductForRow(idx, prod)}
                                  className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs border-b border-slate-50 last:border-none transition"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800">{prod.product_name}</span>
                                  </div>
                                  <span className="text-blue-600 font-mono font-bold">
                                    ₹{parseFloat(prod.sale_price || prod.price || 0).toLocaleString()}
                                  </span>
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
                          min="0"
                          step="any"
                          placeholder="0"
                          value={row.qty}
                          onChange={(e) => updateRow(idx, "qty", e.target.value)}
                          className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {visibleColumns.unit && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <select
                          value={row.unit}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          className="w-full bg-transparent outline-none text-slate-700 text-xs font-semibold cursor-pointer rounded px-1 py-1"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Price / Unit */}
                    {visibleColumns.price && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => updateRow(idx, "price", e.target.value)}
                          className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                        />
                      </td>
                    )}

                    {/* Discount */}
                    {visibleColumns.discount && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            placeholder="%"
                            value={row.discount_pct || ""}
                            onChange={(e) => updateRow(idx, "discount_pct", e.target.value)}
                            className="w-11 text-right outline-none bg-transparent font-semibold text-slate-700 text-xs focus:bg-white rounded px-1 py-0.5"
                          />
                          <span className="text-slate-300">|</span>
                          <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-right">
                            {parseFloat(row.discount_amt || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Tax */}
                    {visibleColumns.tax && (
                      <td className="py-2 px-2 border-r border-slate-200">
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={row.tax_rate}
                            onChange={(e) => updateRow(idx, "tax_rate", e.target.value)}
                            className="bg-transparent outline-none text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            {TAX_RATES.map((t) => (
                              <option key={t.label} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <span className="text-slate-300">|</span>
                          <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-right">
                            {parseFloat(row.tax_amt || 0).toFixed(1)}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {visibleColumns.amount && (
                      <td className="py-2 px-4 border-r border-slate-200 text-right font-black text-slate-900 text-xs font-mono">
                        ₹{parseFloat(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    )}

                    {/* Action */}
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={(activeTab.rows || []).length === 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-30 cursor-pointer"
                          title="Remove returned item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-200 text-xs">
                  <td colSpan={visibleColumns.item ? 2 : 1} className="py-3 px-4 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={addRow}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>ADD RETURN ITEM</span>
                    </button>
                  </td>
                  {visibleColumns.qty && <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-black">{totals.totalQty}</td>}
                  {visibleColumns.unit && <td className="py-3 px-3 border-r border-slate-200"></td>}
                  {visibleColumns.price && <td className="py-3 px-3 border-r border-slate-200 text-right font-bold text-slate-500">TOTALS</td>}
                  {visibleColumns.discount && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                      {formatCurrency(totals.discount)}
                    </td>
                  )}
                  {visibleColumns.tax && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                      {formatCurrency(totals.tax)}
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="py-3 px-4 border-r border-slate-200 text-right text-sm text-amber-700 font-black font-mono">
                      {formatCurrency(totals.grandTotal)}
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── 5. CUSTOMER LEDGER IMPACT & FINANCIAL SETTLEMENT ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Customer Ledger Impact & Refund Settlement Mode (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Hero Feature: Customer Ledger Impact Box */}
          {customerAdjustment && (
            <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                    Customer Ledger Reversal Impact
                  </h4>
                </div>
                <span className="text-[11px] font-mono font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-full border border-blue-200">
                  Unpaid Return Balance: ₹{totals.balance.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Debt Deduction</span>
                    <TrendingDown size={14} className="text-red-500" />
                  </div>
                  <div className="text-lg font-black text-red-600 mt-1">
                    - {formatCurrency(customerAdjustment.deductFromPending)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>Remaining Debt:</span>
                    <strong className="text-slate-800">{formatCurrency(customerAdjustment.remainingPending)}</strong>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Advance Store Credit</span>
                    <Wallet size={14} className="text-emerald-500" />
                  </div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    + {formatCurrency(customerAdjustment.excessToAdvance)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <span>New Advance Balance:</span>
                    <strong className="text-slate-800">{formatCurrency(customerAdjustment.newAdvance)}</strong>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic mt-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500 flex-shrink-0" />
                <span>Excess store credit will automatically apply on the customer's next sales bill.</span>
              </p>
            </div>
          )}

          {/* Settlement Method Selector */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <CreditCard size={15} className="text-blue-600" />
              <span>Return Settlement & Refund Mode</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Payment Type */}
              <div className="relative">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Payment / Settlement Method</label>
                <div
                  onClick={() => setShowPaymentTypeDropdown(!showPaymentTypeDropdown)}
                  className="border border-slate-300 hover:border-slate-400 rounded-xl px-3.5 py-2.5 bg-white flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800">{activeTab.paymentType}</span>
                  <ChevronDown size={15} className="text-slate-400" />
                </div>

                {showPaymentTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in">
                    {["Cash", "Credit", "Bank Transfer", "UPI"].map((type) => (
                      <div
                        key={type}
                        onClick={() => {
                          updateActiveTab({ paymentType: type });
                          setShowPaymentTypeDropdown(false);
                        }}
                        className={`px-3.5 py-2 text-xs font-medium cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                          activeTab.paymentType === type ? "text-blue-600 font-bold bg-blue-50/70" : "text-slate-700"
                        }`}
                      >
                        <span>{type}</span>
                        {activeTab.paymentType === type && <Check size={13} className="text-blue-600" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Spot Cash Refund Toggle */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Immediate Spot Cash Refund</label>
                <div className="border border-slate-300 rounded-xl p-2.5 bg-white flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={activeTab.paidAmountEnabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateActiveTab({
                          paidAmountEnabled: checked,
                          paidAmount: checked ? totals.grandTotal : "",
                        });
                      }}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                    />
                    <span className="text-xs font-bold text-slate-700">Cash Refunded</span>
                  </label>
                  <input
                    type="number"
                    disabled={!activeTab.paidAmountEnabled}
                    value={activeTab.paidAmount}
                    onChange={(e) => updateActiveTab({ paidAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-28 text-right border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Financial Reconciliation & Grand Total Billboard (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <DollarSign size={16} className="text-amber-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Return Financial Valuation</h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Gross Subtotal */}
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Gross Returned Subtotal</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(totals.subtotal)}</span>
              </div>

              {/* Total Discounts */}
              {totals.discount > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Discount Reversal</span>
                  <span className="font-mono font-bold text-red-600">- {formatCurrency(totals.discount)}</span>
                </div>
              )}

              {/* Total GST Tax */}
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Input GST Reversal</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(totals.tax)}</span>
              </div>

              {/* Refund vs Balance breakdown */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Refunded on Spot</span>
                  <span className="font-mono font-bold text-emerald-600">{formatCurrency(totals.paidAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Unpaid / Added to Ledger</span>
                  <span className="font-mono font-bold text-blue-700">{formatCurrency(totals.balance)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grand Total Hero Banner */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl p-5 text-white shadow-lg shadow-amber-600/20">
              <div className="flex items-center justify-between text-amber-100 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Credit Note Total Valuation</span>
                <span className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-[10px]">Net Return</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {formatCurrency(totals.grandTotal)}
              </div>
              <div className="mt-2 text-[11px] text-amber-100/90 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-200" />
                <span>Reverses customer invoice liability and updates inventory</span>
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
            onClick={() => navigate("/sales/credit-note")}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="app-btn-primary px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditMode ? "Update Credit Note" : "Save Credit Note"}</span>
          </button>
        </div>
      </div>

      {/* Table Column Customizer Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_ITEM_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in return items"
      />
    </div>
  );
}
