
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  Calculator,
  Settings,
  RefreshCw,
  ArrowLeft,
  AlignLeft,
  Image,
  Paperclip,
  GripVertical,
} from "lucide-react";

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
const UNITS = ["NONE", "PCS", "BOX", "KG", "LTR", "MTR", "DOZEN", "GRAM", "SET", "BAG"];

/* ── Tax Rates List ──────────────────────────────────────────────────── */
const TAX_RATES = [
  { label: "Select", value: 0 },
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 },
];

/* ── LocalStorage key for persisted estimates (backend integration later) ── */
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
    discount_amt: 0,
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
    refNo: String(nextRefNo),
    invoiceDate: today,
    stateOfSupply: "Select",
    partyQuery: "",
    selectedParty: null,
    phoneNo: "",
    rows: [createInitialRow(1)],
    showTerms: false,
    termsText: "",
    showDescription: false,
    descriptionText: "",
    attachedImage: null,
    attachedDoc: null,
    roundOffEnabled: false,
    roundOffValue: 0,
  };
}

export default function EstimateForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams();

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

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

  // Update active tab helper
  const updateActiveTab = (updates) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === activeTabId ? { ...tab, ...updates } : tab))
    );
  };

  // Add new tab (Estimate #2, #3...) with auto-incremented Ref No.
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
      navigate("/sales/estimate-quotation");
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

    let disc = 0;
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
    const nextRows = [...(activeTab?.rows || [])];
    nextRows[idx] = { ...nextRows[idx], [field]: value };
    nextRows[idx] = recalculateRow(nextRows[idx]);
    updateActiveTab({ rows: nextRows });
  };

  // Select Product for Row (Sets Qty to 1 upon selection)
  const selectProductForRow = (idx, prod) => {
    const nextRows = [...(activeTab?.rows || [])];
    const price = parseFloat(prod.price || prod.sale_price || prod.mrp || 0);
    const taxRate = parseFloat(prod.tax_rate || prod.gst_rate || 0);
    const currentQty = nextRows[idx]?.qty;
    const initialQty = currentQty && parseFloat(currentQty) > 0 ? currentQty : "1";
    nextRows[idx] = recalculateRow({
      ...nextRows[idx],
      product_id: prod.id,
      item: prod.product_name || prod.name,
      qty: initialQty,
      price: price,
      tax_rate: taxRate,
      unit: prod.unit || "NONE",
    });
    updateActiveTab({ rows: nextRows });
    setActiveSearchRow(null);
  };

  // Add Row
  const addRow = () => {
    updateActiveTab({
      rows: [...(activeTab?.rows || []), createInitialRow()],
    });
  };

  // Remove Row (keep at least one)
  const removeRow = (idx) => {
    if ((activeTab?.rows || []).length === 1) return;
    const nextRows = activeTab.rows.filter((_, i) => i !== idx);
    updateActiveTab({ rows: nextRows });
  };

  // Summary Calculations for Active Tab
  const totals = useMemo(() => {
    let sub = 0;
    let tax = 0;
    let disc = 0;
    let totalQty = 0;

    (activeTab?.rows || []).forEach((r) => {
      const q = parseFloat(r.qty) || 0;
      sub += q * (parseFloat(r.price) || 0);
      disc += parseFloat(r.discount_amt) || 0;
      tax += parseFloat(r.tax_amt) || 0;
      totalQty += q;
    });

    const grandTotalBeforeRound = Math.max(0, sub - disc + tax);
    let roundOffValue = 0;
    let grandTotal = grandTotalBeforeRound;
    if (activeTab?.roundOffEnabled) {
      grandTotal = Math.round(grandTotalBeforeRound);
      roundOffValue = grandTotal - grandTotalBeforeRound;
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

  // Handle image / document file selection (local only)
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

  // Save Estimate to localStorage (backend integration point)
  const handleSave = async () => {
    if (!activeTab) return;

    if (!activeTab.selectedParty && !activeTab.partyQuery.trim()) {
      setErrorMsg("Please select a customer.");
      return;
    }
    if (!activeTab.invoiceDate) {
      setErrorMsg("Please select an invoice date.");
      return;
    }

    const validRows = (activeTab.rows || []).filter((r) => String(r.item || "").trim() !== "");
    if (validRows.length === 0) {
      setErrorMsg("Please add at least one item.");
      return;
    }
    for (const r of validRows) {
      if (!(parseFloat(r.qty) > 0)) {
        setErrorMsg("Quantity must be greater than 0.");
        return;
      }
      if (!(parseFloat(r.price) >= 0)) {
        setErrorMsg("Price must be a valid amount.");
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
      setErrorMsg("An error occurred while saving the estimate.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => {
    const num = parseFloat(val || 0);
    return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* ── 1. TOP TAB BAR ── */}
      <div className="bg-white border-b border-slate-200 px-4 pt-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2 border-t-2 text-xs font-bold rounded-t-lg transition cursor-pointer ${
                activeTabId === tab.id
                  ? "border-blue-600 bg-slate-50 text-blue-700 shadow-xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
              }`}
            >
              <span>{tab.title}</span>
              <button
                onClick={(e) => handleCloseTab(tab.id, e)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-slate-200 text-slate-400 hover:text-red-500 transition"
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* + Add New Estimate Tab Button */}
          <button
            type="button"
            onClick={handleAddTab}
            className="w-7 h-7 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 transition ml-1 cursor-pointer"
            title="Add New Estimate"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Tool Icons */}
        <div className="flex items-center gap-3 pb-2 flex-shrink-0">
          <button className="text-slate-400 hover:text-slate-700 transition cursor-pointer" title="Calculator">
            <Calculator size={18} />
          </button>
          <button className="text-slate-400 hover:text-slate-700 relative transition cursor-pointer" title="Settings">
            <Settings size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
          </button>
          <button
            onClick={() => navigate("/sales/estimate-quotation")}
            className="text-slate-400 hover:text-slate-700 transition ml-1 cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── 2. PAGE HEADER ── */}
      <div className="px-8 pt-4 pb-2 flex items-center justify-between bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sales/estimate-quotation")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {editId ? `Edit Estimate #${activeTab?.refNo || ""}` : "Estimate/Quotation"}
          </h1>
        </div>
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mx-8 mt-3 px-4 py-2.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── 3. FORM HEADER (Customer & Estimate Details) ── */}
      <div className="p-8 pb-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200">
        {/* Left Side: Customer Selection */}
        <div className="space-y-4">
          <div ref={partyRef} className="relative">
            <div
              className={`relative border rounded-lg px-3 pt-3 pb-2 transition bg-white ${
                showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500"
              }`}
            >
              <label className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-semibold text-blue-600">
                Search by Name/Phone *
              </label>
              <div className="flex items-center justify-between">
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
                  placeholder="Search customer party..."
                  className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                />
                <ChevronDown
                  size={16}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="text-slate-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Customer Suggestions Dropdown */}
            {showPartyDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-2xl max-h-56 overflow-y-auto z-50 py-1">
                {loadingParties ? (
                  <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw size={12} className="animate-spin text-blue-500" />
                    <span>Loading customers...</span>
                  </div>
                ) : partySuggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">No customers found.</div>
                ) : (
                  partySuggestions.map((cust) => {
                    const bal = parseFloat(cust.pending_amount ?? cust.balance ?? 0);
                    const adv = parseFloat(cust.advance_balance ?? 0);
                    return (
                      <div
                        key={cust.id}
                        onClick={() => selectParty(cust)}
                        className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{cust.name || cust.customer_name}</div>
                          {cust.phone && <div className="text-[11px] text-slate-400">{cust.phone}</div>}
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {bal > 0 && (
                            <div className="bg-red-50 border border-red-200 px-2 py-0.5 rounded text-right">
                              <span className="text-[9px] text-red-500 uppercase font-semibold block">Pending Debt</span>
                              <span className="text-xs font-bold text-red-700">₹{bal.toLocaleString()}</span>
                            </div>
                          )}
                          {adv > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-right">
                              <span className="text-[9px] text-emerald-500 uppercase font-semibold block">Advance</span>
                              <span className="text-xs font-bold text-emerald-700">₹{adv.toLocaleString()}</span>
                            </div>
                          )}
                          {bal <= 0 && adv <= 0 && (
                            <span className="text-[11px] text-slate-400 font-medium">Clear</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected Party Summary Pill */}
          {activeTab?.selectedParty && (
            <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-600">Selected Customer:</span>
                <span className="font-bold text-slate-900">{activeTab.selectedParty.name || activeTab.selectedParty.customer_name}</span>
              </div>
              <div className="flex items-center gap-2">
                {parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-100 border border-red-200 text-red-700 font-bold text-[11px]">
                    Pending Debt: ₹{parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0).toLocaleString()}
                  </span>
                )}
                {parseFloat(activeTab.selectedParty.advance_balance ?? 0) > 0 && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[11px]">
                    Advance Balance: ₹{parseFloat(activeTab.selectedParty.advance_balance ?? 0).toLocaleString()}
                  </span>
                )}
                {parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0) <= 0 &&
                  parseFloat(activeTab.selectedParty.advance_balance ?? 0) <= 0 && (
                    <span className="text-[11px] text-slate-500 italic">No previous balance</span>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Ref No, Invoice Date & State of Supply */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Ref No.</span>
            <input
              type="text"
              value={activeTab?.refNo || ""}
              onChange={(e) => updateActiveTab({ refNo: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 font-bold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Invoice Date</span>
            <input
              type="date"
              value={activeTab?.invoiceDate || ""}
              onChange={(e) => updateActiveTab({ invoiceDate: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-medium outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">State of supply</span>
            <select
              value={activeTab?.stateOfSupply || "Select"}
              onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-medium outline-none bg-transparent cursor-pointer"
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. ITEMS TABLE ── */}
      <div className="flex-1 p-8 pt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse bg-white border border-slate-200 rounded-lg shadow-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
              <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">#</th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">ITEM</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">QTY</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-24">UNIT</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-36 text-right">
                PRICE/UNIT
                <span className="block font-normal text-[10px] normal-case text-slate-400 mt-0.5">
                  Without Tax <ChevronDown size={9} className="inline" />
                </span>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">
                DISCOUNT
                <span className="block font-normal text-[10px] normal-case text-slate-400 mt-0.5">%&nbsp;|&nbsp;AMOUNT</span>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">
                TAX
                <span className="block font-normal text-[10px] normal-case text-slate-400 mt-0.5">%&nbsp;|&nbsp;AMOUNT</span>
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">AMOUNT</th>
              <th className="py-2.5 px-3 w-16 text-center">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {(activeTab?.rows || []).map((row, idx) => (
              <tr key={row.id || idx} className="border-b border-slate-200 hover:bg-slate-50/70">
                {/* Row Index */}
                <td className="py-2.5 px-3 border-r border-slate-200 text-center text-slate-400 font-medium">
                  {idx + 1}
                </td>

                {/* Item Name Autocomplete */}
                <td className="py-2 px-3 border-r border-slate-200 relative">
                  <input
                    type="text"
                    placeholder="Search product..."
                    value={row.item}
                    onChange={(e) => {
                      updateRow(idx, "item", e.target.value);
                      setActiveSearchRow(idx);
                    }}
                    onFocus={() => setActiveSearchRow(idx)}
                    className="w-full bg-transparent outline-none font-medium text-slate-800 text-xs"
                  />

                  {/* Suggestions Popover */}
                  {activeSearchRow === idx && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 py-1">
                      {productsList
                        .filter(
                          (p) =>
                            !row.item ||
                            !p.product_name ||
                            p.product_name.toLowerCase().includes(row.item.toLowerCase()) ||
                            (p.product_code && p.product_code.toLowerCase().includes(row.item.toLowerCase()))
                        )
                        .slice(0, 8)
                        .map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => selectProductForRow(idx, prod)}
                            className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-800">{prod.product_name}</span>
                            <span className="text-slate-500 font-mono">
                              ₹{parseFloat(prod.sale_price || prod.price || 0)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </td>

                {/* Qty */}
                <td className="py-2 px-2 border-r border-slate-200">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder=""
                    value={row.qty}
                    onChange={(e) => updateRow(idx, "qty", e.target.value)}
                    className="w-full text-right outline-none bg-transparent font-semibold text-slate-800"
                  />
                </td>

                {/* Unit */}
                <td className="py-2 px-2 border-r border-slate-200">
                  <select
                    value={row.unit}
                    onChange={(e) => updateRow(idx, "unit", e.target.value)}
                    className="w-full bg-transparent outline-none text-slate-700 text-xs cursor-pointer"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </td>

                {/* Price */}
                <td className="py-2 px-2 border-r border-slate-200">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={row.price}
                    onChange={(e) => updateRow(idx, "price", e.target.value)}
                    className="w-full text-right outline-none bg-transparent font-semibold text-slate-800"
                  />
                </td>

                {/* Discount */}
                <td className="py-2 px-2 border-r border-slate-200">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="%"
                      value={row.discount_pct || ""}
                      onChange={(e) => updateRow(idx, "discount_pct", e.target.value)}
                      className="w-12 text-right outline-none bg-transparent text-slate-700"
                    />
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] font-mono text-slate-600 w-12 text-right">
                      {parseFloat(row.discount_amt || 0).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Tax */}
                <td className="py-2 px-2 border-r border-slate-200">
                  <div className="flex items-center gap-1">
                    <select
                      value={row.tax_rate}
                      onChange={(e) => updateRow(idx, "tax_rate", e.target.value)}
                      className="bg-transparent outline-none text-xs text-slate-700 cursor-pointer"
                    >
                      {TAX_RATES.map((t) => (
                        <option key={t.label} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] font-mono text-slate-600 w-12 text-right">
                      {parseFloat(row.tax_amt || 0).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Row Amount */}
                <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                  ₹ {(parseFloat(row.amount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>

                {/* Actions */}
                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      className="text-slate-300 hover:text-blue-600 transition cursor-pointer"
                      title="Move Row"
                    >
                      <GripVertical size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="text-slate-300 hover:text-red-500 transition cursor-pointer"
                      title="Remove Item"
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
            <tr className="bg-slate-50/80 font-bold text-slate-800 border-t border-slate-200">
              <td colSpan={2} className="py-2.5 px-4 border-r border-slate-200">
                <button
                  type="button"
                  onClick={addRow}
                  className="px-3 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                >
                  ADD ROW
                </button>
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">{totals.totalQty}</td>
              <td className="py-2.5 px-3 border-r border-slate-200"></td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">TOTAL</td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">
                {formatCurrency(totals.discount)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">
                {formatCurrency(totals.tax)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right text-sm text-blue-600 font-black">
                {formatCurrency(totals.grandTotalBeforeRound)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        {/* ── 5. BELOW TABLE: Terms / Description / Image / Document ── */}
        <div className="flex flex-wrap items-start gap-8 mt-4">
          <div className="space-y-3">
            {/* Terms & Conditions */}
            <button
              type="button"
              onClick={() => updateActiveTab({ showTerms: !activeTab.showTerms })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                activeTab.showTerms
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <AlignLeft size={14} />
              {activeTab.showTerms ? "HIDE TERMS & CONDITIONS" : "ADD TERMS & CONDITIONS"}
            </button>
            {activeTab.showTerms && (
              <textarea
                rows={3}
                value={activeTab.termsText}
                onChange={(e) => updateActiveTab({ termsText: e.target.value })}
                placeholder="Enter terms & conditions..."
                className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
              />
            )}

            {/* Description */}
            <button
              type="button"
              onClick={() => updateActiveTab({ showDescription: !activeTab.showDescription })}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                activeTab.showDescription
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <AlignLeft size={14} />
              {activeTab.showDescription ? "HIDE DESCRIPTION" : "ADD DESCRIPTION"}
            </button>
            {activeTab.showDescription && (
              <textarea
                rows={3}
                value={activeTab.descriptionText}
                onChange={(e) => updateActiveTab({ descriptionText: e.target.value })}
                placeholder="Enter estimate description..."
                className="w-full max-w-md border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
              />
            )}
          </div>

          <div className="space-y-2">
            {/* Add Image */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Image size={14} />
              {activeTab?.attachedImage ? "CHANGE IMAGE" : "ADD IMAGE"}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {activeTab?.attachedImage && (
              <img
                src={activeTab.attachedImage}
                alt="estimate"
                className="w-24 h-24 object-cover rounded-lg border border-slate-200"
              />
            )}

            {/* Add Document */}
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              <Paperclip size={14} />
              {activeTab?.attachedDoc ? "CHANGE DOCUMENT" : "ADD DOCUMENT"}
            </button>
            <input
              ref={docInputRef}
              type="file"
              onChange={handleDocSelect}
              className="hidden"
            />
            {activeTab?.attachedDoc && (
              <div className="text-[11px] text-slate-500 font-medium">{activeTab.attachedDoc.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* ── 6. TOTALS + ROUND OFF (Right aligned) ── */}
      <div className="px-8 pb-4 bg-white border-t border-slate-200">
        <div className="flex justify-end">
          <div className="space-y-3.5 text-xs w-full max-w-xs pt-4">
            {/* Round Off */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(activeTab?.roundOffEnabled)}
                  onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                />
                <span className="text-xs font-bold text-slate-700">Round Off</span>
              </div>
              <input
                type="number"
                step="any"
                value={totals.roundOffValue}
                readOnly
                className="w-32 border border-slate-300 rounded px-3 py-1.5 text-right font-semibold text-slate-900 text-sm bg-slate-100/70 outline-none"
              />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-slate-800 ml-auto mr-4">Total</span>
              <input
                type="text"
                readOnly
                value={formatCurrency(totals.grandTotal)}
                className="w-48 border border-slate-300 rounded px-3 py-1.5 text-right font-bold text-slate-900 text-sm bg-slate-100/70"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 7. BOTTOM ACTION BAR ── */}
      <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shadow-lg">
        {/* Share Split Button */}
        <div className="inline-flex rounded-md border border-blue-500 shadow-xs bg-white">
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
          >
            Share
          </button>
          <button
            type="button"
            className="px-2 py-2 text-blue-600 border-l border-blue-500 hover:bg-blue-50 transition cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Primary Save Button */}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-10 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <RefreshCw size={15} className="animate-spin" />}
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}