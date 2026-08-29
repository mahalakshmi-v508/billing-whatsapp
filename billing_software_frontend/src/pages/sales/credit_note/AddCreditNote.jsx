import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Calculator,
  Settings,
  ScanBarcode,
  Check,
  Search,
  RefreshCw,
  ArrowLeft,
  Pencil,
} from "lucide-react";

function createInitialRow(id = null) {
  return {
    id: id || Date.now() + Math.random(),
    product_id: 0,
    item: "",
    qty: "", // Empty initially until product is chosen
    unit: "NONE",
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
    returnNo: returnNoValue ? String(returnNoValue) : String(index),
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

  // Track existing credit notes count for auto-incrementing return no
  const [existingCount, setExistingCount] = useState(0);

  // Tabs state
  const [tabs, setTabs] = useState([createNewCreditNoteTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);

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

  // Add new tab (Credit Note #2, #3...) with auto-incremented return no
  const handleAddTab = () => {
    const nextIdx = tabs.length + 1;
    const nextReturnNo = existingCount + tabs.length + 1;
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

        // Fetch credit notes count to compute sequential Return No
        const cnRes = await api.get(`/credit_note/list?company_id=${companyId}&admin_id=${adminId}`);
        const count = cnRes.data?.data?.length || 0;
        setExistingCount(count);

        if (!isEditMode) {
          updateActiveTab({ returnNo: String(count + 1) });
        } else {
          // If in Edit Mode, fetch the existing record
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
                    unit: p.unit || "NONE",
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

  // Select Product for Row (Sets Qty to 1 upon selection)
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
      qty: initialQty, // Set to 1 upon choosing product
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
      rows: [...activeTab.rows, createInitialRow()],
    });
  };

  // Remove Row
  const removeRow = (idx) => {
    if (activeTab.rows.length === 1) return;
    const nextRows = activeTab.rows.filter((_, i) => i !== idx);
    updateActiveTab({ rows: nextRows });
  };

  // Summary Calculations for Active Tab (Round off removed)
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

  // Save or Update Credit Note
  const handleSave = async () => {
    const validRows = (activeTab.rows || []).filter((r) => r.item.trim() !== "");
    if (validRows.length === 0) {
      setErrorMsg("Please enter at least one item.");
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
        navigate("/sales/credit-note");
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

          {/* + Add New Credit Note Tab Button */}
          {!isEditMode && (
            <button
              type="button"
              onClick={handleAddTab}
              className="w-7 h-7 flex items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 transition ml-1 cursor-pointer"
              title="Add New Credit Note"
            >
              <Plus size={18} strokeWidth={2.5} />
            </button>
          )}
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
            onClick={() => navigate("/sales/credit-note")}
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
            onClick={() => navigate("/sales/credit-note")}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {isEditMode ? `Edit Credit Note #${activeTab.returnNo}` : "Credit Note"}
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

      {/* ── 3. FORM HEADER (Party & Invoice Details) ── */}
      <div className="p-8 pb-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-slate-200">
        {/* Left Side: Party Selection & Phone */}
        <div className="space-y-4">
          <div ref={partyRef} className="relative">
            <div
              className={`relative border rounded-lg px-3 pt-3 pb-2 transition bg-white ${
                showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500"
              }`}
            >
              <label className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-semibold text-blue-600">
                Party *
              </label>
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={activeTab.partyQuery}
                  onChange={(e) => handleSearchParty(e.target.value)}
                  onFocus={() => {
                    handleSearchParty(activeTab.partyQuery);
                    setShowPartyDropdown(true);
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

                        {bal > 0 ? (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Pending Debt</span>
                            <span className="text-xs font-bold text-red-600">₹{bal.toLocaleString()}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">No pending</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Party Summary Pill */}
            {activeTab.selectedParty && (
              <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between px-1">
                <span>
                  Selected: <strong className="text-slate-800">{activeTab.selectedParty.name || activeTab.selectedParty.customer_name}</strong>
                </span>
                {parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0) > 0 && (
                  <span className="text-red-600 font-semibold">
                    Current Bal: ₹{parseFloat(activeTab.selectedParty.pending_amount ?? activeTab.selectedParty.balance ?? 0).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Phone No."
              value={activeTab.phoneNo}
              onChange={(e) => updateActiveTab({ phoneNo: e.target.value })}
              className="w-56 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-medium outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Right Side: Return No, Original Invoice Number & Dates */}
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Return No.</span>
            <input
              type="text"
              value={activeTab.returnNo}
              onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 font-bold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Invoice Number</span>
            <input
              type="text"
              placeholder="Original invoice no..."
              value={activeTab.invoiceNo}
              onChange={(e) => updateActiveTab({ invoiceNo: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-medium outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Invoice Date</span>
            <input
              type="date"
              value={activeTab.invoiceDate}
              onChange={(e) => updateActiveTab({ invoiceDate: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-medium outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Date</span>
            <input
              type="date"
              value={activeTab.returnDate}
              onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-bold outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">State of supply</span>
            <select
              value={activeTab.stateOfSupply}
              onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
              className="w-44 text-right border-b border-slate-200 pb-1 text-slate-800 font-medium outline-none bg-transparent cursor-pointer"
            >
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Kerala">Kerala</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Andhra Pradesh">Andhra Pradesh</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 4. ITEMS TABLE (Free Qty removed, Quick scan row removed) ── */}
      <div className="flex-1 p-8 pt-4 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse bg-white border border-slate-200 rounded-lg shadow-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase text-[11px]">
              <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">
                <ScanBarcode size={15} className="mx-auto text-slate-500" />
              </th>
              <th className="py-2.5 px-3 border-r border-slate-200 min-w-[220px]">ITEM</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">QTY</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-24">UNIT</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">PRICE/UNIT</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right">DISCOUNT</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right">TAX</th>
              <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">AMOUNT</th>
              <th className="py-2.5 px-3 w-16 text-center">ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {/* Product Rows */}
            {(activeTab.rows || []).map((row, idx) => (
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
                            (p.product_name &&
                              p.product_name.toLowerCase().includes(row.item.toLowerCase()))
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

                {/* Qty (Directly editable, empty initially until product chosen) */}
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
                    <option value="NONE">NONE</option>
                    <option value="PCS">PCS</option>
                    <option value="KGS">KGS</option>
                    <option value="BAGS">BAGS</option>
                    <option value="BOX">BOX</option>
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
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                    <span className="text-slate-300">|</span>
                    <span className="text-[11px] font-mono text-slate-600 w-12 text-right">
                      {parseFloat(row.tax_amt || 0).toFixed(1)}
                    </span>
                  </div>
                </td>

                {/* Row Amount */}
                <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                  ₹ {parseFloat(row.amount || 0).toFixed(2)}
                </td>

                {/* Actions: Edit & Delete Icons */}
                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSearchRow(idx)}
                      className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                      title="Edit Item"
                    >
                      <Pencil size={13} />
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
                ₹ {totals.discount.toFixed(2)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right">
                ₹ {totals.tax.toFixed(2)}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-200 text-right text-sm text-blue-600 font-black">
                ₹ {totals.grandTotal.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── 5. BELOW TABLE DETAILS (Add Description/Image/Doc removed, Round off removed) ── */}
      <div className="p-8 pt-2 bg-white border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left: Payment Type */}
        <div className="space-y-4">
          <div className="relative">
            <div className="relative border border-slate-300 rounded-lg px-3 pt-3 pb-2 w-56">
              <label className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-medium text-slate-500">
                Payment Type
              </label>
              <div
                onClick={() => setShowPaymentTypeDropdown(!showPaymentTypeDropdown)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm font-semibold text-slate-800">{activeTab.paymentType}</span>
                <ChevronDown size={15} className="text-slate-400" />
              </div>
            </div>

            {showPaymentTypeDropdown && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                {["Cash", "Credit", "Bank Transfer", "UPI"].map((type) => (
                  <div
                    key={type}
                    onClick={() => {
                      updateActiveTab({ paymentType: type });
                      setShowPaymentTypeDropdown(false);
                    }}
                    className={`px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                      activeTab.paymentType === type ? "text-blue-600 font-bold bg-blue-50" : "text-slate-700"
                    }`}
                  >
                    <span>{type}</span>
                    {activeTab.paymentType === type && <Check size={13} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Discount, Tax, Total, Paid amount, Balance */}
        <div className="space-y-3.5 text-xs">
          {/* Discount */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Discount</span>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="number"
                  placeholder=""
                  value={activeTab.bottomDiscountPct || ""}
                  onChange={(e) => updateActiveTab({ bottomDiscountPct: e.target.value })}
                  className="w-24 border border-slate-300 rounded px-2 py-1.5 text-right outline-none text-xs"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 text-xs pointer-events-none">(%)</span>
              </div>
              <span className="text-slate-400 font-bold">-</span>
              <div className="relative">
                <input
                  type="number"
                  placeholder=""
                  value={activeTab.bottomDiscountAmt || ""}
                  onChange={(e) => updateActiveTab({ bottomDiscountAmt: e.target.value })}
                  className="w-24 border border-slate-300 rounded px-2 py-1.5 text-right outline-none text-xs"
                />
                <span className="absolute right-2 top-1.5 text-slate-400 text-xs pointer-events-none">(₹)</span>
              </div>
            </div>
          </div>

          {/* Tax */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 font-semibold">Tax</span>
            <div className="flex items-center gap-6">
              <select className="border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-700 bg-white cursor-pointer w-32">
                <option>NONE</option>
                <option>GST @ 5%</option>
                <option>GST @ 12%</option>
                <option>GST @ 18%</option>
                <option>GST @ 28%</option>
              </select>
              <span className="font-bold text-slate-800 text-xs w-10 text-right">
                {totals.tax.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-700 ml-auto mr-4">Total</span>
            <input
              type="text"
              readOnly
              value={totals.grandTotal}
              className="w-48 border border-slate-300 rounded px-3 py-1.5 text-right font-bold text-slate-900 text-sm bg-slate-100/70"
            />
          </div>

          {/* Paid amount */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 ml-auto mr-3">
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
              <span className="text-xs font-bold text-slate-700">Paid amount</span>
            </div>
            <input
              type="number"
              disabled={!activeTab.paidAmountEnabled}
              value={activeTab.paidAmount}
              onChange={(e) => updateActiveTab({ paidAmount: e.target.value })}
              placeholder=""
              className="w-48 border border-slate-300 rounded px-3 py-1.5 text-right font-semibold text-slate-900 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-slate-800 ml-auto mr-4">Balance</span>
            <span className="w-48 text-right font-black text-slate-950 text-base">
              {totals.balance}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6. BOTTOM ACTION BAR ── */}
      <div className="px-8 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shadow-lg">
        {/* Generate e-Invoice Split Button */}
        <div className="inline-flex rounded-md border border-blue-500 shadow-xs bg-white">
          <button
            type="button"
            className="px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
          >
            Generate e-<u>I</u>nvoice
          </button>
          <button
            type="button"
            className="px-2 py-2 text-blue-600 border-l border-blue-500 hover:bg-blue-50 transition cursor-pointer"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Primary Save / Update Button */}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="px-10 py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <RefreshCw size={15} className="animate-spin" />}
          <span><u>S</u>{isEditMode ? "ave Changes" : "ave"}</span>
        </button>
      </div>
    </div>
  );
}
