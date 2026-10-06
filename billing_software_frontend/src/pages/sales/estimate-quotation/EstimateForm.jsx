import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";
import TermsDropdown from "../../../components/common/TermsDropdown";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ArrowLeft,
  AlignLeft,
  Image as ImageIcon,
  Paperclip,
  GripVertical,
  Search,
  User,
  Phone,
  FileText,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Share2,
  Save,
  Download,
  Percent,
  Layers,
  Sparkles,
  DollarSign,
  Package,
  Scale,
  IndianRupee,
  Tag,
  ReceiptText,
  Wallet
} from "lucide-react";

const DEFAULT_ITEM_COLUMNS = [
  { key: "item", label: "Item Name", icon: Package, color: "text-blue-600", bg: "bg-blue-50", desc: "Product & description" },
  { key: "qty", label: "Quantity", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Item quantity count" },
  { key: "unit", label: "Unit", icon: Scale, color: "text-purple-600", bg: "bg-purple-50", desc: "Unit of measurement (PCS, KG, BOX)" },
  { key: "price", label: "Price / Unit", icon: IndianRupee, color: "text-teal-600", bg: "bg-teal-50", desc: "Unit price / rate" },
  { key: "discount", label: "Discount", icon: Tag, color: "text-amber-600", bg: "bg-amber-50", desc: "Percentage (%) & discount amount" },
  { key: "tax", label: "Tax (GST)", icon: ReceiptText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "GST rate (%) & tax amount" },
  { key: "amount", label: "Amount", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50", desc: "Total calculated line amount" },
];

/* ── Indian States List for State of Supply ──────────────────────────── */
const INDIAN_STATES = [
  "Select", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
];

/* ── Units List ──────────────────────────────────────────────────────── */
const UNITS = ["NONE", "PCS", "BOX", "KG", "LTR", "MTR", "DOZEN", "GRAM", "SET", "BAG", "BUNDLE", "ROLL", "SQFT"];

/* ── Tax Rates List ──────────────────────────────────────────────────── */
const TAX_RATES = [
  { label: "Select", value: 0 },
  { label: "None (0%)", value: 0 },
  { label: "GST @ 0%", value: 0 },
  { label: "GST @ 5%", value: 5 },
  { label: "GST @ 12%", value: 12 },
  { label: "GST @ 18%", value: 18 },
  { label: "GST @ 28%", value: 28 },
];

/* ── LocalStorage key for persisted estimates ────────────────────────── */
const ESTIMATE_STORAGE_KEY = "saved_estimates";

/* ── Factory to create an initial empty item row ─────────────────────── */
function createInitialRow(id = null) {
  return {
    id: id || Date.now() + Math.random(),
    product_id: 0,
    item: "",
    qty: "",
    unit: "NONE",
    price: "",
    price_type: "without_tax",
    discount_pct: "",
    discount_amt: "",
    tax_rate: 0,
    tax_amt: 0,
    amount: 0,
  };
}

/* ── Factory to create a new independent Estimate tab ────────────────── */
function createNewEstimateTab(id, index, nextRefNo, savedEstimate = null) {
  const today = new Date().toISOString().split("T")[0];
  if (savedEstimate) {
    return {
      ...savedEstimate,
      id,
      title: `Estimate #${index}`,
      refNo: savedEstimate.refNo || String(nextRefNo),
      invoiceDate: savedEstimate.invoiceDate || today,
      partyQuery: savedEstimate.partyQuery || savedEstimate.customer_name || "",
      phoneNo: savedEstimate.phoneNo || savedEstimate.customer_phone || "",
      selectedParty: savedEstimate.selectedParty || null,
    };
  }
  return {
    id,
    title: `Estimate #${index}`,
    refNo: `EST-${String(nextRefNo).padStart(4, "0")}`,
    invoiceDate: today,
    stateOfSupply: "Tamil Nadu",
    partyQuery: "",
    selectedParty: null,
    phoneNo: "",
    rows: [createInitialRow(1)],
    showTerms: false,
    // termsText: "1. Quotation valid for 15 days from date of issue.\n2. Goods once sold will not be taken back.\n3. Payment due within 7 days of confirmation.",
    showDescription: false,
    descriptionText: "",
    attachedImage: null,
    attachedDoc: null,
    roundOffEnabled: true,
    roundOffValue: 0,
  };
}

/* ── Close Estimate Confirmation Dialog Component ───────────────────────── */
function CloseEstimateModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Close Estimate Workspace</h3>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 text-xs text-slate-600 leading-relaxed font-medium">
          Current unsaved quotation changes will be discarded. Do you wish to continue and return to the estimates list?
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition cursor-pointer">
            OK, Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EstimateForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams();

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Modals state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Read persisted estimates from localStorage & detect edit target
  const initialSaved = useMemo(() => {
    let saved = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(ESTIMATE_STORAGE_KEY) || "[]");
      saved = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to load saved estimates:", e);
    }
    const savedEstimate = editId
      ? saved.find((e) => String(e.id) === String(editId)) || saved[0] || null
      : null;
    return { saved, savedEstimate };
  }, [editId]);

  const existingCount = initialSaved.saved.length;

  // Tabs state
  const [tabs, setTabs] = useState(() => {
    const firstTab = createNewEstimateTab(
      Date.now(),
      1,
      existingCount + 1,
      initialSaved.savedEstimate
    );
    return [firstTab];
  });
  const [activeTabId, setActiveTabId] = useState(() => tabs[0].id);

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
  } = useTableColumns("estimate_item_columns", DEFAULT_ITEM_COLUMNS);

  // Update active tab helper
  const updateActiveTab = (updates) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // Add new tab with auto-incremented Ref No.
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const nextRefNo = existingCount + tabs.length + 1;
    const newId = Date.now() + Math.random();
    const newTab = createNewEstimateTab(newId, nextIdx, nextRefNo);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  // Close a tab
  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      setShowCloseConfirm(true);
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

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Terms & Description / Image / Doc selectors
  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Load products & prefetch customer list
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
      } catch (err) {
        console.error(err);
      }
    };
    loadInitData();
  }, [companyId, adminId]);

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

  // Close party dropdown and item suggest dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
      if (
        itemSuggestRef.current &&
        !itemSuggestRef.current.contains(e.target) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(e.target)
      ) {
        setActiveSearchRow(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reposition Suggestion Dropdown on Scroll / Resize
  useEffect(() => {
    if (activeSearchRow === null || !activeInputRef.current) return;
    const handleReposition = () => {
      if (activeInputRef.current) {
        const rect = activeInputRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setActiveSearchRow(null);
          return;
        }
        updateSuggestPosition(activeInputRef.current);
      }
    };
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [activeSearchRow]);

  // Row Calculation Helper
  const recalculateRow = (row) => {
    const q = parseFloat(row.qty);
    const p = parseFloat(row.price);

    if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
      return {
        ...row,
        discount_amt: "",
        tax_amt: 0,
        amount: 0,
      };
    }

    const gross = q * p;

    let disc = 0;
    if (parseFloat(row.discount_pct) > 0) {
      disc = (gross * parseFloat(row.discount_pct)) / 100;
    } else if (parseFloat(row.discount_amt) > 0) {
      disc = parseFloat(row.discount_amt);
    }
    const taxable = Math.max(0, gross - disc);

    let tax = 0;
    if (parseFloat(row.tax_rate) > 0) {
      tax = (taxable * parseFloat(row.tax_rate)) / 100;
    }

    const amt = taxable + tax;
    return {
      ...row,
      discount_amt: disc ? disc.toFixed(2) : "",
      tax_amt: tax,
      amount: amt,
    };
  };

  const updateRowFields = (idx, fields) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const nextRows = [...(tab.rows || [])];
        nextRows[idx] = recalculateRow({ ...nextRows[idx], ...fields });
        return { ...tab, rows: nextRows };
      })
    );
  };

  const updateRow = (idx, field, value) => {
    updateRowFields(idx, { [field]: value });
  };

  // Select Product for Row: sets initial qty to 1 (if was empty) & automatically appends next row
  const selectProductForRow = (idx, prod) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        const nextRows = [...(tab.rows || [])];
        const price = parseFloat(prod.price || prod.sale_price || prod.mrp || 0);
        const taxRate = parseFloat(prod.tax_rate || prod.gst_rate || prod.gst_percentage || 0);
        const currentQty = nextRows[idx]?.qty;
        const initialQty = currentQty && parseFloat(currentQty) > 0 ? currentQty : 1;
        nextRows[idx] = recalculateRow({
          ...nextRows[idx],
          product_id: prod.id,
          item: prod.product_name || prod.name,
          qty: initialQty,
          price: price,
          tax_rate: taxRate,
          unit: prod.unit || "NONE",
        });

        const isLastRow = idx === nextRows.length - 1;
        const lastRow = nextRows[nextRows.length - 1];
        const lastRowHasProduct = Boolean(
          lastRow && (lastRow.product_id || (lastRow.item && lastRow.item.trim() !== ""))
        );

        if (isLastRow || lastRowHasProduct) {
          return { ...tab, rows: [...nextRows, createInitialRow()] };
        }

        return { ...tab, rows: nextRows };
      })
    );
    setActiveSearchRow(null);
  };

  // Add Row
  const addRow = () => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        return {
          ...tab,
          rows: [...(tab.rows || []), createInitialRow()],
        };
      })
    );
  };

  // Remove Row (keep at least one empty row)
  const removeRow = (idx) => {
    setTabs((prev) =>
      prev.map((tab) => {
        if (tab.id !== activeTabId) return tab;
        if ((tab.rows || []).length <= 1) {
          return { ...tab, rows: [createInitialRow()] };
        }
        return {
          ...tab,
          rows: tab.rows.filter((_, i) => i !== idx),
        };
      })
    );
  };

  // Summary Calculations for Active Tab
  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    let disc = 0;
    let totalQty = 0;

    (activeTab?.rows || []).forEach((r) => {
      const q = parseFloat(r.qty);
      const p = parseFloat(r.price);
      if (!isNaN(q) && q > 0) totalQty += q;
      if (!isNaN(q) && q > 0 && !isNaN(p) && p > 0) {
        sub += q * p;
      }
      const da = parseFloat(r.discount_amt);
      if (!isNaN(da) && da > 0) disc += da;
      const ta = parseFloat(r.tax_amt);
      if (!isNaN(ta) && ta > 0) tax += ta;
    });

    const grandTotalBeforeRound = Math.max(0, sub - disc + tax);
    let roundOffValue = 0;
    let grandTotal = grandTotalBeforeRound;
    if (activeTab?.roundOffEnabled) {
      grandTotal = Math.round(grandTotalBeforeRound);
      roundOffValue = Number((grandTotal - grandTotalBeforeRound).toFixed(2));
    }

    return {
      subtotal: sub,
      discount: disc,
      tax: tax,
      totalQty,
      grandTotalBeforeRound,
      roundOffValue,
      grandTotal,
    };
  }, [activeTab]);

  // Handle image / document file selection
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateActiveTab({ attachedImage: reader.result });
    reader.readAsDataURL(file);
  };

  const handleDocSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name;
    updateActiveTab({ attachedDoc: { name, size: file.size } });
  };

  // Save Estimate to localStorage
  const handleSave = async () => {
    if (!activeTab) return;

    if (!activeTab.selectedParty && !activeTab.partyQuery.trim()) {
      setErrorMsg("Please specify or select a client customer.");
      return;
    }
    if (!activeTab.invoiceDate) {
      setErrorMsg("Please select an estimate date.");
      return;
    }

    const validRows = (activeTab.rows || []).filter((r) => String(r.item || "").trim() !== "");
    if (validRows.length === 0) {
      setErrorMsg("Please add at least one line item to the quotation.");
      return;
    }
    for (const r of validRows) {
      if (!(parseFloat(r.qty) > 0)) {
        setErrorMsg("Quantity must be greater than 0 for all items.");
        return;
      }
      if (!(parseFloat(r.price) >= 0)) {
        setErrorMsg("Price must be a valid non-negative amount.");
        return;
      }
    }

    setSaving(true);
    setErrorMsg("");

    const estimateRecord = {
      id: activeTab.id,
      refNo: activeTab.refNo,
      invoiceDate: activeTab.invoiceDate,
      stateOfSupply: activeTab.stateOfSupply,
      customer_id: activeTab.selectedParty?.id || 0,
      customer_name: activeTab.partyQuery.trim() || (activeTab.selectedParty?.name || activeTab.selectedParty?.customer_name || "Cash Customer"),
      customer_phone: activeTab.phoneNo,
      company_id: parseInt(companyId) || 0,
      admin_id: adminId,
      rows: validRows.map((r) => ({ ...r })),
      termsText: activeTab.termsText,
      descriptionText: activeTab.descriptionText,
      attachedImage: activeTab.attachedImage,
      attachedDoc: activeTab.attachedDoc,
      roundOffEnabled: activeTab.roundOffEnabled,
      subtotal: totals.subtotal,
      discount_total: totals.discount,
      tax_total: totals.tax,
      round_off: totals.roundOffValue,
      total_amount: totals.grandTotal,
      status: "open",
      created_at: new Date().toISOString(),
    };

    try {
      const saved = JSON.parse(localStorage.getItem(ESTIMATE_STORAGE_KEY) || "[]");
      const existing = Array.isArray(saved) ? saved : [];
      const idx = existing.findIndex((e) => String(e.id) === String(estimateRecord.id));
      if (idx >= 0) {
        existing[idx] = estimateRecord;
      } else {
        existing.push(estimateRecord);
      }
      localStorage.setItem(ESTIMATE_STORAGE_KEY, JSON.stringify(existing));
      navigate("/sales/estimate-quotation");
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred while saving the quotation.");
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
      {/* ── 1. EXECUTIVE COMMAND BAR & PROPOSAL VOUCHER TABS ── */}
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
                    <FileText size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.refNo || "Draft"}
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

            {/* + Add New Proposal Tab */}
            <button
              type="button"
              onClick={handleAddTab}
              className="h-8 px-2.5 mb-1 flex items-center gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold border border-dashed border-blue-300 transition cursor-pointer"
              title="Add New Estimate/Proposal"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="hidden sm:inline">New Proposal</span>
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 pb-2 flex-shrink-0">
            <HeaderSettingsButton
              variant="voucher"
              onClick={() => setShowColumnDrawer(true)}
              isActive={showColumnDrawer}
              title="Customise Table Columns"
            />

            {/* Close Page */}
            <button
              type="button"
              onClick={() => setShowCloseConfirm(true)}
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
              onClick={() => setShowCloseConfirm(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Quotations"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Commercial Proposal
                </span>
                <span className="text-xs text-slate-400 font-medium">• Non-Fiscal Estimate</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {editId ? `Edit Quotation #${activeTab?.refNo || ""}` : "Quotation & Proposal Studio"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const sampleEstimate = "Estimate Details:\n" +
                  `Ref: ${activeTab?.refNo}\n` +
                  `Client: ${activeTab?.partyQuery || "N/A"}\n` +
                  `Total: ${formatCurrency(totals.grandTotal)}\n` +
                  "Thank you for your business!";
                navigator.clipboard?.writeText(sampleEstimate);
                alert("Quotation summary copied to clipboard!");
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>Copy Summary</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
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

      {/* ── 3. CLIENT INTELLIGENCE & DOCUMENT PARAMETERS CARDS ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Client Intelligence Studio Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Client / Recipient Information</h3>
                <p className="text-[11px] text-slate-400">Search customer directory or enter proposal recipient</p>
              </div>
            </div>

            {activeTab?.selectedParty && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={11} /> Selected Party
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Customer Search AutoComplete */}
            <div ref={partyRef} className="relative sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Client Name / Company <span className="text-red-500">*</span>
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
                    value={activeTab?.partyQuery || ""}
                    onChange={(e) => handleSearchParty(e.target.value)}
                    onFocus={() => {
                      if (activeTab) {
                        handleSearchParty(activeTab.partyQuery);
                        setShowPartyDropdown(true);
                      }
                    }}
                    placeholder="Search client by name or phone..."
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
                      <span>Loading client directory...</span>
                    </div>
                  ) : partySuggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      No matching clients found. Type name to create as fresh client.
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
                                Due ₹{bal.toLocaleString()}
                              </span>
                            )}
                            {adv > 0 && (
                              <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                                Adv ₹{adv.toLocaleString()}
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
                  inputMode="numeric"
                  maxLength={10}
                  value={activeTab?.phoneNo || ""}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    updateActiveTab({ phoneNo: val });
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Selected Client Ledger Status pill */}
            <div className="flex flex-col justify-end">
              {activeTab?.selectedParty ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Ledger Profile:</span>
                  <div className="flex items-center gap-1.5">
                    {parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0) > 0 ? (
                      <span className="text-xs font-bold text-red-600">
                        ₹{parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0).toLocaleString()} (Unpaid)
                      </span>
                    ) : parseFloat(activeTab.selectedParty.advance_balance ?? 0) > 0 ? (
                      <span className="text-xs font-bold text-emerald-600">
                        ₹{parseFloat(activeTab.selectedParty.advance_balance ?? 0).toLocaleString()} (Credit Adv)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600">Zero Balance / Standard</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center text-[11px] text-slate-400 italic">
                  Quick proposal mode (Non-account client)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Proposal Document Parameters Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Proposal Parameters</h3>
              <p className="text-[11px] text-slate-400">Sequential voucher reference & tax geography</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Quotation / Ref No. */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Quotation Ref #
              </span>
              <div className="w-40 px-2.5 py-1.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs font-black text-blue-700 font-mono tracking-wide text-right select-all">
                {activeTab?.refNo || "EST-0001"}
              </div>
            </div>

            {/* Estimate Date */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Proposal Date
              </span>
              <input
                type="date"
                value={activeTab?.invoiceDate || ""}
                onChange={(e) => updateActiveTab({ invoiceDate: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            {/* State of Supply */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> Place of Supply
              </span>
              <select
                value={activeTab?.stateOfSupply || "Tamil Nadu"}
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

      {/* ── 4. LINE ITEMS MATRIX TABLE CARD ── */}
      <div className="px-6 md:px-8 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs">
          
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 rounded-t-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Layers size={14} />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Line Items &amp; Inventory Products
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {(activeTab?.rows || []).length} {(activeTab?.rows || []).length === 1 ? "Row" : "Rows"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400">
              Type product name or scan barcode to add
            </span>
          </div>

          <div className="overflow-x-auto min-h-[160px]">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-600 font-bold select-none text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-200/60 w-12">#</th>
                  {visibleColumns.item !== false && (
                    <th className="py-3 px-4 border-r border-slate-200/60 min-w-[240px]">Item Name / Description</th>
                  )}
                  {visibleColumns.qty !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200/60 w-24">Qty</th>
                  )}
                  {visibleColumns.unit !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200/60 w-24">Unit</th>
                  )}
                  {visibleColumns.price !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200/60 w-32">Price / Unit (₹)</th>
                  )}
                  {visibleColumns.discount !== false && (
                    <th className="py-3 px-0 text-center border-r border-slate-200/60 w-36">
                      <div className="border-b border-slate-200/60 pb-1">Discount</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-400">
                        <span>%</span>
                        <span>Amount (₹)</span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.tax !== false && (
                    <th className="py-3 px-0 text-center border-r border-slate-200/60 w-36">
                      <div className="border-b border-slate-200/60 pb-1">Tax (GST)</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-400">
                        <span>% Slab</span>
                        <span>Tax (₹)</span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.amount !== false && (
                    <th className="py-3 px-4 text-right border-r border-slate-200/60 w-32">Amount (₹)</th>
                  )}
                  <th className="py-3 px-2 text-center w-12">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {(activeTab?.rows || []).map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* # Index */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/60 text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Item Name Autocomplete */}
                    {visibleColumns.item !== false && (
                      <td className="py-2 px-3 border-r border-slate-200/60 min-w-[240px]">
                        <input
                          type="text"
                          placeholder="Search product from inventory or type..."
                          value={row.item}
                          onChange={(e) => {
                            const val = e.target.value;
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            updateRow(idx, "item", val);
                            setActiveSearchRow(idx);
                          }}
                          onFocus={(e) => {
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setActiveSearchRow(idx);
                          }}
                          onClick={(e) => {
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setActiveSearchRow(idx);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Qty */}
                    {visibleColumns.qty !== false && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={row.qty}
                          onChange={(e) => updateRow(idx, "qty", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {visibleColumns.unit !== false && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <select
                          value={row.unit || "NONE"}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          className="w-full py-1.5 px-1 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>
                    )}

                    {/* Price */}
                    {visibleColumns.price !== false && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => updateRow(idx, "price", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Discount */}
                    {visibleColumns.discount !== false && (
                      <td className="py-2 px-0 border-r border-slate-200/60">
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                          <input
                            type="number"
                            placeholder="%"
                            min="0"
                            max="100"
                            value={row.discount_pct || ""}
                            onChange={(e) => {
                              updateRowFields(idx, {
                                discount_pct: e.target.value,
                                discount_amt: "",
                              });
                            }}
                            className="w-full py-1 px-1 text-center font-bold text-slate-800 outline-none text-xs"
                          />
                          <input
                            type="number"
                            placeholder="₹"
                            min="0"
                            value={row.discount_amt || ""}
                            onChange={(e) => {
                              updateRowFields(idx, {
                                discount_amt: e.target.value,
                                discount_pct: "",
                              });
                            }}
                            className="w-full py-1 px-1 text-center font-bold text-slate-800 outline-none text-xs"
                          />
                        </div>
                      </td>
                    )}

                    {/* Tax */}
                    {visibleColumns.tax !== false && (
                      <td className="py-2 px-0 border-r border-slate-200/60">
                        <div className="grid grid-cols-2 divide-x divide-slate-200 items-center">
                          <select
                            value={row.tax_rate}
                            onChange={(e) => updateRow(idx, "tax_rate", e.target.value)}
                            className="w-full py-1 px-1 bg-transparent text-center font-bold text-slate-800 outline-none text-xs cursor-pointer"
                          >
                            {TAX_RATES.map((tr, i) => (
                              <option key={i} value={tr.value}>{tr.label}</option>
                            ))}
                          </select>
                          <span className="text-[11px] font-bold text-slate-500 text-center truncate">
                            {row.tax_amt ? `₹${parseFloat(row.tax_amt).toFixed(1)}` : "—"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {visibleColumns.amount !== false && (
                      <td className="py-2.5 px-4 text-right border-r border-slate-200/60 font-black text-slate-900 text-xs">
                        ₹ {row.amount ? parseFloat(row.amount).toFixed(2) : "0.00"}
                      </td>
                    )}

                    {/* Action Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto"
                        title="Delete row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>

              {/* Table Footer */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-800 text-xs">
                  <td colSpan={2} className="py-3 px-4 border-r border-slate-200/60">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>Add Item Row</span>
                    </button>
                  </td>
                  {visibleColumns.qty !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 font-black text-slate-900">
                      {totals.totalQty}
                    </td>
                  )}
                  {visibleColumns.unit !== false && <td className="border-r border-slate-200/60" />}
                  {visibleColumns.price !== false && <td className="border-r border-slate-200/60" />}
                  {visibleColumns.discount !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 text-amber-700">
                      ₹ {totals.discount ? totals.discount.toFixed(2) : "0.00"}
                    </td>
                  )}
                  {visibleColumns.tax !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 text-emerald-700">
                      ₹ {totals.tax ? totals.tax.toFixed(2) : "0.00"}
                    </td>
                  )}
                  {visibleColumns.amount !== false && (
                    <td className="py-3 px-4 text-right border-r border-slate-200/60 font-black text-slate-900">
                      ₹ {totals.grandTotalBeforeRound ? totals.grandTotalBeforeRound.toFixed(2) : "0.00"}
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Product Suggestions Floating Dropdown (Rendered via Portal to eliminate clipping) */}
      {activeSearchRow !== null && suggestCoords && createPortal(
        <div
          ref={itemSuggestRef}
          style={{
            position: "fixed",
            top: `${suggestCoords.top}px`,
            left: `${suggestCoords.left}px`,
            width: `${suggestCoords.width}px`,
            zIndex: 99999,
          }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto py-1 divide-y divide-slate-100 animate-in fade-in duration-100"
        >
          {(() => {
            const currentRow = (activeTab?.rows || [])[activeSearchRow];
            const q = (currentRow?.item || "").trim().toLowerCase();
            const filtered = productsList.filter(
              (p) =>
                !q ||
                (p.product_name && p.product_name.toLowerCase().includes(q)) ||
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.product_code && String(p.product_code).toLowerCase().includes(q)) ||
                (p.barcode && String(p.barcode).toLowerCase().includes(q))
            ).slice(0, 50);

            if (filtered.length === 0) {
              return (
                <div className="px-4 py-3 text-center text-xs text-slate-400 select-none">
                  No products found in catalog. Type custom item name.
                </div>
              );
            }

            return filtered.map((prod) => (
              <div
                key={prod.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectProductForRow(activeSearchRow, prod);
                }}
                className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-slate-900 truncate">{prod.product_name || prod.name}</div>
                  <div className="text-[11px] text-slate-400">Stock: {prod.stock ?? 0} {prod.unit || ""}</div>
                </div>
                <div className="font-extrabold text-blue-600 shrink-0">₹{parseFloat(prod.sale_price || prod.price || 0).toLocaleString()}</div>
              </div>
            ));
          })()}
        </div>,
        document.body
      )}

      {/* ── 5. PROPOSAL TERMS, CLAUSES & FINANCIAL RECONCILIATION ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Proposal Terms, Description & Attachments (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Terms, Conditions & Remarks Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileText size={14} />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Terms, Conditions &amp; Remarks</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Remarks &amp; Note</label>
                <textarea
                  rows={2}
                  placeholder="Enter custom remarks for customer invoice..."
                  value={activeTab.descriptionText || ""}
                  onChange={(e) => updateActiveTab({ descriptionText: e.target.value })}
                  className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms &amp; Conditions</label>
                <TermsDropdown
                  companyId={companyId || 1}
                  page="estimate"
                  value={activeTab.termsText || ""}
                  onChange={(newVal) => updateActiveTab({ termsText: newVal })}
                  placeholder="Select Terms &amp; Conditions..."
                />
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center gap-4">
            <div>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
              >
                <ImageIcon size={14} className="text-blue-600" />
                <span>{activeTab?.attachedImage ? "Replace Image" : "Attach Product Image"}</span>
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {activeTab?.attachedImage && (
                <div className="mt-2 relative inline-block">
                  <img
                    src={activeTab.attachedImage}
                    alt="attachment"
                    className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-xs"
                  />
                  <button
                    onClick={() => updateActiveTab({ attachedImage: null })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
              >
                <Paperclip size={14} className="text-blue-600" />
                <span>{activeTab?.attachedDoc ? "Replace Document" : "Attach Proposal PDF/Doc"}</span>
              </button>
              <input
                ref={docInputRef}
                type="file"
                onChange={handleDocSelect}
                className="hidden"
              />
              {activeTab?.attachedDoc && (
                <div className="mt-2 text-[11px] font-semibold text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <FileText size={12} className="text-blue-600" />
                  <span>{activeTab.attachedDoc.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quotation Summary & Grand Total (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Quotation Summary</span>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              INR Currency
            </span>
          </div>

          <div className="space-y-2.5 text-xs font-semibold text-slate-600">
            {/* Gross Subtotal */}
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Total Item Discounts */}
            <div className="flex justify-between items-center">
              <span>Total Discount</span>
              <span className={`font-bold ${totals.discount > 0 ? "text-rose-600" : "text-slate-700"}`}>
                {totals.discount > 0 ? `- ${formatCurrency(totals.discount)}` : "₹0.00"}
              </span>
            </div>

            {/* Total GST Tax */}
            <div className="flex justify-between items-center">
              <span>Total Tax (GST)</span>
              <span className={`font-bold ${totals.tax > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                {totals.tax > 0 ? `+ ${formatCurrency(totals.tax)}` : "₹0.00"}
              </span>
            </div>

            {/* Round Off Switch */}
            {/* <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={Boolean(activeTab?.roundOffEnabled)}
                  onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                />
                <span className="font-bold text-slate-700">Auto Round-Off</span>
              </label>
              <span className="text-xs font-semibold text-slate-600">
                {totals.roundOffValue !== 0 ? (totals.roundOffValue > 0 ? `+₹${totals.roundOffValue}` : `-₹${Math.abs(totals.roundOffValue)}`) : "₹0.00"}
              </span>
            </div> */}
          </div>

          {/* Grand Total Hero Banner */}
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
            <div>
              <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">Estimated Total</span>
              <span className="text-2xl font-black tracking-tight">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase">
                Quotation Net
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. STICKY COMMAND FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/sales/estimate-quotation")}
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
            <span>{editId ? "Update Quotation" : "Save Quotation"}</span>
          </button>
        </div>
      </div>

      {/* Common Table Column Customizer Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_ITEM_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in line items"
      />

      {/* Close Confirm Modal */}
      <CloseEstimateModal
        isOpen={showCloseConfirm}
        onCancel={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          navigate("/sales/estimate-quotation");
        }}
      />
    </div>
  );
}