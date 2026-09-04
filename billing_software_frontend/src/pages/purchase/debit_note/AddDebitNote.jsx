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
  AlignLeft,
  Zap,
  ChevronsUpDown,
  Building2,
  Truck,
  DollarSign,
  FileText,
  AlertCircle,
  Layers,
  Percent,
  Receipt,
  Phone,
  CreditCard,
  CornerUpLeft,
  Save,
  Clock
} from "lucide-react";

const unitOptions = [
  "NONE", "Piece", "Box", "Pack", "Kg", "Gram", "Litre", "ML", "Meter", "Feet", "Dozen", "Pair", "Roll", "Bag", "Bottle", "Can", "Set"
];

const gstSlabs = [
  { label: "Select", value: 0 },
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 }
];

const indianStates = [
  "Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana", "Maharashtra", "Delhi", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Other"
];

function createEmptyRow(isQuickAdd = false) {
  return {
    id: Date.now() + Math.random(),
    product_id: null,
    product_name: "",
    product_code: "",
    barcode: "",
    quantity: isQuickAdd ? "" : "",
    unit: "NONE",
    price: "",
    discount_percent: "",
    discount_amount: "",
    gst_percentage: 0,
    tax_amount: 0,
    amount: 0,
  };
}

function createNewDebitNoteTab(id, index, returnNoValue = null) {
  return {
    id,
    title: `Debit Note #${index}`,
    partyInput: "",
    selectedSupplier: null,
    supplierPhone: "",
    returnNo: returnNoValue ? String(returnNoValue) : String(index),
    billNo: "",
    billDate: "",
    returnDate: new Date().toISOString().split("T")[0],
    stateOfSupply: "Tamil Nadu",
    globalTaxMode: "without_tax",
    paymentType: "Cash",
    roundOffEnabled: true,
    showDescription: false,
    description: "",
    items: [
      createEmptyRow(true),  // Row 0: Quick Add / Lightning Row ⚡
      createEmptyRow(false), // Row 1: Regular Row
      createEmptyRow(false)  // Row 2: Regular Row
    ],
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CornerUpLeft size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Close Debit Note</h3>
              <p className="text-[11px] text-slate-500">Unsaved purchase return data will be discarded</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current changes in this debit note voucher will be discarded. Do you wish to continue and return to the purchase returns list?
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
            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition cursor-pointer"
          >
            OK, Discard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Built-in Calculator Modal (Safe) ── */
function CalculatorModal({ isOpen, onClose }) {
  const [calcInput, setCalcInput] = useState("");
  if (!isOpen) return null;

  const handleBtn = (val) => {
    if (val === "C") setCalcInput("");
    else if (val === "=") {
      try {
        const sanitized = calcInput.replace(/×/g, "*").replace(/÷/g, "/");
        // Safe evaluation without direct eval
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
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
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

export default function AddDebitNote() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  const [existingCount, setExistingCount] = useState(0);
  const [tabs, setTabs] = useState([createNewDebitNoteTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);

  const [suppliers, setSuppliers] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showTaxModeDropdown, setShowTaxModeDropdown] = useState(false);
  const [activeProductSearchIndex, setActiveProductSearchIndex] = useState(null);

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [saving, setSaving] = useState(false);

  const partyRef = useRef(null);
  const productSuggestRef = useRef(null);

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
    const nextReturnNo = existingCount + tabs.length + 1;
    const newId = Date.now();
    const newTab = createNewDebitNoteTab(newId, nextIdx, nextReturnNo);
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

  // Load Suppliers and Products Catalog (with bulletproof fallbacks)
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const cid = companyId || localStorage.getItem("selected_company_id") || user?.company_id || 0;
        
        // 1. Fetch Suppliers
        const supRes = await api.get(`/supplier/get_all?company_id=${cid || 0}`);
        let supsList = [];
        if (supRes.data?.status && Array.isArray(supRes.data.data) && supRes.data.data.length > 0) {
          supsList = supRes.data.data;
        } else {
          // Fallback to fetch all suppliers
          const fallbackSup = await api.get("/supplier/get_all");
          if (fallbackSup.data?.status && Array.isArray(fallbackSup.data.data)) {
            supsList = fallbackSup.data.data;
          }
        }
        setSuppliers(supsList);

        // 2. Fetch Products
        const prodRes = await api.get(`/product/get?company_id=${cid || 0}&admin_id=${adminId || 0}`);
        let prodsList = [];
        if (prodRes.data?.status && Array.isArray(prodRes.data.data) && prodRes.data.data.length > 0) {
          prodsList = prodRes.data.data;
        } else {
          const fallbackProd = await api.get(`/product/get`);
          if (fallbackProd.data?.status && Array.isArray(fallbackProd.data.data)) {
            prodsList = fallbackProd.data.data;
          }
        }
        setProductsCatalog(prodsList);

        // 3. Count for return no
        const countRes = await api.get(`/debit_note/list?company_id=${cid || 0}`);
        if (countRes.data?.status) {
          const cnt = countRes.data.count || 0;
          setExistingCount(cnt);
          if (!isEditMode) {
            updateActiveTab({ returnNo: String(cnt + 1) });
          }
        }
      } catch (err) {
        console.error("Error loading catalog for Debit Note:", err);
      }
    };
    fetchCatalog();
  }, [companyId]);

  // If in edit mode, fetch Debit Note data
  useEffect(() => {
    if (isEditMode && editId) {
      api.get(`/debit_note/get_by_id?id=${editId}`)
        .then((res) => {
          if (res.data?.status && res.data.data) {
            const d = res.data.data;
            const loadedRows = Array.isArray(d.products)
              ? d.products
              : typeof d.products === "string"
              ? JSON.parse(d.products)
              : [];

            const formattedItems = [
              createEmptyRow(true),
              ...(loadedRows.map((r, i) => ({
                id: i + 1,
                product_id: r.product_id || null,
                product_name: r.product_name || r.item || "",
                product_code: r.product_code || "",
                barcode: r.barcode || "",
                quantity: r.quantity || r.qty || "",
                unit: r.unit || "NONE",
                price: r.price || r.unit_price || 0,
                discount_percent: r.discount_percent || r.discount_pct || "",
                discount_amount: r.discount_amount || r.discount_amt || "",
                gst_percentage: r.gst_percentage || r.tax_rate || 0,
                tax_amount: r.tax_amount || r.tax_amt || 0,
                amount: r.amount || r.total_amount || 0,
              })))
            ];

            setTabs([
              {
                id: 1,
                title: `Edit #${d.return_no || d.id}`,
                partyInput: d.supplier_name || "",
                selectedSupplier: {
                  id: d.supplier_id,
                  supplier_name: d.supplier_name,
                  phone: d.supplier_phone,
                  pending_balance: 0,
                },
                supplierPhone: d.supplier_phone || "",
                returnNo: d.return_no || String(d.id),
                billNo: d.bill_no || "",
                billDate: d.bill_date || "",
                returnDate: d.return_date || new Date().toISOString().split("T")[0],
                stateOfSupply: d.state_of_supply || "Tamil Nadu",
                globalTaxMode: "without_tax",
                paymentType: d.payment_type || "Cash",
                roundOffEnabled: true,
                showDescription: Boolean(d.description),
                description: d.description || "",
                items: formattedItems.length > 1 ? formattedItems : [createEmptyRow(true), createEmptyRow(false)],
              }
            ]);
            setActiveTabId(1);
          }
        })
        .catch(console.error);
    }
  }, [isEditMode, editId]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
      if (productSuggestRef.current && !productSuggestRef.current.contains(e.target)) {
        setActiveProductSearchIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Suppliers for Party dropdown
  const filteredSuppliers = useMemo(() => {
    const q = (activeTab.partyInput || "").toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter((s) => {
      const name = (s.supplier_name || s.name || "").toLowerCase();
      const phone = (s.phone || s.mobile_number || s.alt_mobile || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [suppliers, activeTab.partyInput]);

  // Recalculate single item row
  const calculateRow = (row, taxMode = activeTab.globalTaxMode) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    const discPct = parseFloat(row.discount_percent) || 0;
    const gstPct = parseFloat(row.gst_percentage) || 0;

    const baseAmount = qty * price;
    let discAmt = parseFloat(row.discount_amount) || 0;

    if (discPct > 0) {
      discAmt = (baseAmount * discPct) / 100;
    }

    const taxable = Math.max(0, baseAmount - discAmt);
    let taxAmt = 0;
    let finalAmt = taxable;

    if (taxMode === "without_tax") {
      taxAmt = (taxable * gstPct) / 100;
      finalAmt = taxable + taxAmt;
    } else {
      // With Tax mode
      taxAmt = taxable - taxable / (1 + gstPct / 100);
      finalAmt = taxable;
    }

    return {
      ...row,
      discount_amount: discAmt > 0 ? discAmt : "",
      tax_amount: taxAmt,
      amount: finalAmt,
    };
  };

  // Update item row field
  const updateRow = (index, field, value) => {
    const updated = [...activeTab.items];
    let row = { ...updated[index], [field]: value };

    // Auto-create new row if user is typing in the last regular row
    if (index === updated.length - 1 && field === "product_name" && value.trim()) {
      updated.push(createEmptyRow(false));
    }

    row = calculateRow(row, activeTab.globalTaxMode);
    updated[index] = row;
    updateActiveTab({ items: updated });
  };

  // Select Product from Autocomplete
  const handleSelectProduct = (index, prod) => {
    const updated = [...activeTab.items];
    const unitPrice = parseFloat(prod.purchase_price || prod.price || prod.sale_price || 0);
    const gstRate = parseFloat(prod.tax_rate || prod.gst_rate || 0);

    let row = {
      ...updated[index],
      product_id: prod.id,
      product_name: prod.name || prod.product_name,
      product_code: prod.product_code || "",
      barcode: prod.barcode || "",
      quantity: updated[index].quantity ? updated[index].quantity : 1,
      unit: prod.unit || "NONE",
      price: unitPrice || "",
      gst_percentage: gstRate,
    };

    row = calculateRow(row, activeTab.globalTaxMode);
    updated[index] = row;

    // If it was the Quick Add / Lightning Row (row 0), create a regular row below
    if (index === 0) {
      updated.splice(1, 0, { ...row, id: Date.now() + Math.random() });
      updated[0] = createEmptyRow(true); // reset quick add
    } else if (index === updated.length - 1) {
      updated.push(createEmptyRow(false));
    }

    updateActiveTab({ items: updated });
    setActiveProductSearchIndex(null);
  };

  // Add empty row
  const addRow = () => {
    updateActiveTab({ items: [...activeTab.items, createEmptyRow(false)] });
  };

  // Delete row
  const deleteRow = (index) => {
    if (index === 0) {
      // Clear quick add row
      const updated = [...activeTab.items];
      updated[0] = createEmptyRow(true);
      updateActiveTab({ items: updated });
      return;
    }
    const filtered = activeTab.items.filter((_, i) => i !== index);
    if (filtered.length <= 1) {
      filtered.push(createEmptyRow(false));
    }
    updateActiveTab({ items: filtered });
  };

  // Switch Tax Mode (Without Tax / With Tax)
  const handleTaxModeChange = (mode) => {
    const recalculated = activeTab.items.map((r) => calculateRow(r, mode));
    updateActiveTab({ globalTaxMode: mode, items: recalculated });
    setShowTaxModeDropdown(false);
  };

  // Select Party from dropdown
  const handleSelectParty = async (s) => {
    updateActiveTab({
      selectedSupplier: s,
      partyInput: s.supplier_name || s.name || "",
      supplierPhone: s.phone || s.mobile_number || s.alt_mobile || "",
    });
    setShowPartyDropdown(false);

    if (s.id) {
      try {
        const [prodBySup, supProds] = await Promise.all([
          api.get(`/product/get_by_supplier?supplier_id=${s.id}`),
          api.get(`/supplier_product/get_by_supplier?supplier_id=${s.id}`)
        ]);

        const extraProds = [];
        if (prodBySup.data?.status && Array.isArray(prodBySup.data.data)) {
          extraProds.push(...prodBySup.data.data);
        }
        if (supProds.data?.status && Array.isArray(supProds.data.data)) {
          extraProds.push(...supProds.data.data);
        }

        if (extraProds.length > 0) {
          setProductsCatalog((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newOnes = extraProds.filter((p) => !existingIds.has(p.id));
            return [...newOnes, ...prev];
          });
        }
      } catch (err) {
        console.error("Error fetching supplier-specific products:", err);
      }
    }
  };

  // Calculate Totals Summary (Rows 1 to N, ignoring row 0 if empty)
  const { totalQty, totalDiscount, totalTax, calculatedTotal, roundOffVal, grandTotal } = useMemo(() => {
    let tQty = 0;
    let tDisc = 0;
    let tTax = 0;
    let rawTotal = 0;

    activeTab.items.forEach((r, idx) => {
      if (idx === 0 && !r.product_name) return; // skip empty lightning row
      const q = parseFloat(r.quantity) || 0;
      tQty += q;
      tDisc += parseFloat(r.discount_amount) || 0;
      tTax += parseFloat(r.tax_amount) || 0;
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
      totalDiscount: tDisc,
      totalTax: tTax,
      calculatedTotal: rawTotal,
      roundOffVal: diff,
      grandTotal: rounded,
    };
  }, [activeTab.items, activeTab.roundOffEnabled]);

  // Save Debit Note
  const handleSaveDebitNote = async () => {
    const validItems = activeTab.items
      .filter((r, idx) => (idx > 0 || r.product_name) && r.product_name && (parseFloat(r.quantity) || 0) > 0);

    if (validItems.length === 0) {
      alert("Please enter at least one item with a valid product name and quantity.");
      return;
    }

    if (!activeTab.partyInput && !activeTab.selectedSupplier) {
      alert("Please select or enter a Supplier (Party).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: isEditMode ? editId : undefined,
        admin_id: adminId,
        company_id: companyId,
        return_no: activeTab.returnNo || "1",
        bill_no: activeTab.billNo,
        bill_date: activeTab.billDate || null,
        return_date: activeTab.returnDate,
        supplier_id: activeTab.selectedSupplier?.id || null,
        supplier_name: activeTab.selectedSupplier?.supplier_name || activeTab.partyInput,
        supplier_phone: activeTab.supplierPhone,
        products: validItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          qty: item.quantity,
          unit: item.unit,
          price: item.price,
          discount_percent: item.discount_percent,
          discount_amount: item.discount_amount,
          tax_rate: item.gst_percentage,
          tax_amount: item.tax_amount,
          total_amount: item.amount,
        })),
        sub_total: calculatedTotal - totalTax + totalDiscount,
        tax_total: totalTax,
        discount_total: totalDiscount,
        round_off: roundOffVal,
        total_amount: grandTotal,
        refund_amount: activeTab.paymentType.toLowerCase() === "credit" ? 0 : grandTotal,
        payment_type: activeTab.paymentType,
        state_of_supply: activeTab.stateOfSupply,
        description: activeTab.description,
      };

      const url = isEditMode ? "/debit_note/update" : "/debit_note/create";
      const res = await api.post(url, payload);

      if (res.data.status) {
        navigate("/purchases/return");
      } else {
        alert(res.data.message || "Failed to save Debit Note.");
      }
    } catch (err) {
      console.error("Error saving debit note:", err);
      alert("Failed to save Debit Note.");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 flex flex-col font-sans text-slate-800 antialiased pb-24">
      
      {/* ── 1. EXECUTIVE COMMAND HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Left: Back & Badge Title */}
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all border border-slate-200/70 shadow-2xs cursor-pointer"
              title="Back to Purchase Returns"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
                <CornerUpLeft size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-slate-900 tracking-tight">
                    {isEditMode ? "Edit Debit Note" : "New Debit Note"}
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60 rounded-full">
                    Purchase Return
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Record purchase returns, defective items & supplier credit notes</p>
              </div>
            </div>
          </div>

          {/* Center: Multi-Tab Vouchers */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-rose-700 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Receipt size={13} className={isActive ? "text-rose-600" : "text-slate-400"} />
                  <span>{tab.title}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}

            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTab}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Open another Return Tab"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Right: Quick Tools */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Calculator size={14} className="text-slate-500" />
              <span>Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* ── 2. MAIN FORM BODY ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex-1 w-full space-y-6">

        {/* ── SECTION 1: SUPPLIER & RETURN DETAILS ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-sm font-bold text-slate-900">Supplier & Voucher Reference</h2>
            </div>
            {activeTab.selectedSupplier && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-xl text-xs">
                <span className="text-amber-700 font-medium">Supplier Pending Balance:</span>
                <span className="font-extrabold text-amber-900">₹ {fmtCurrency(activeTab.selectedSupplier.pending_balance || 0)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Left: Supplier Search / Selection */}
            <div className="md:col-span-6 space-y-4" ref={partyRef}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supplier / Vendor (Party) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Truck size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search supplier by name or phone..."
                      value={activeTab.partyInput}
                      onChange={(e) => {
                        updateActiveTab({ partyInput: e.target.value, selectedSupplier: null });
                        setShowPartyDropdown(true);
                      }}
                      onFocus={() => setShowPartyDropdown(true)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                    />
                    <ChevronDown
                      size={15}
                      className={`absolute right-3.5 text-slate-400 transition-transform cursor-pointer ${
                        showPartyDropdown ? "rotate-180 text-rose-600" : ""
                      }`}
                      onClick={() => setShowPartyDropdown((prev) => !prev)}
                    />
                  </div>

                  {/* Supplier Suggestions Dropdown */}
                  {showPartyDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => handleSelectParty(s)}
                            className="px-4 py-2.5 hover:bg-rose-50/60 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                                {(s.supplier_name || s.name || "S")[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900">{s.supplier_name || s.name}</p>
                                <p className="text-[11px] text-slate-500">{s.phone || s.mobile_number || "No phone"}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-medium">Balance</span>
                              <span className="text-xs font-bold text-rose-600">
                                ₹ {fmtCurrency(s.pending_balance || 0)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-500">No matching supplier found.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Saving will create <strong>"{activeTab.partyInput}"</strong> as a new vendor.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone number field */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Supplier Contact Phone</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={activeTab.supplierPhone}
                      onChange={(e) => updateActiveTab({ supplierPhone: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State of Supply</label>
                  <select
                    value={activeTab.stateOfSupply}
                    onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden cursor-pointer"
                  >
                    {indianStates.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Right: Return #, Original Bill Ref & Dates */}
            <div className="md:col-span-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Debit Note Return #</label>
                  <div className="relative">
                    <Receipt size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Return #"
                      value={activeTab.returnNo}
                      onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-bold text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Purchase Bill #</label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. PUR-0082"
                      value={activeTab.billNo}
                      onChange={(e) => updateActiveTab({ billNo: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Original Bill Date</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={activeTab.billDate}
                      onChange={(e) => updateActiveTab({ billDate: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Return Date</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-500" />
                    <input
                      type="date"
                      value={activeTab.returnDate}
                      onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-rose-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-bold text-slate-900 transition-all outline-hidden cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── SECTION 2: RETURN ITEMS TABLE ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Returned Line Items</h2>
                <p className="text-[11px] text-slate-500">Add returned goods with quantity, rate, discount and GST slab</p>
              </div>
            </div>

            {/* Tax Mode Switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
              >
                <Percent size={13} className="text-rose-600" />
                <span>Prices: {activeTab.globalTaxMode === "with_tax" ? "Tax Inclusive" : "Tax Exclusive"}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </div>

              {showTaxModeDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                  <div
                    onClick={() => handleTaxModeChange("without_tax")}
                    className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                      activeTab.globalTaxMode === "without_tax" ? "bg-rose-50 text-rose-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Tax Exclusive</span>
                    {activeTab.globalTaxMode === "without_tax" && <Check size={14} />}
                  </div>
                  <div
                    onClick={() => handleTaxModeChange("with_tax")}
                    className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                      activeTab.globalTaxMode === "with_tax" ? "bg-rose-50 text-rose-700" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Tax Inclusive</span>
                    {activeTab.globalTaxMode === "with_tax" && <Check size={14} />}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="w-12 py-3 px-3 text-center border-r border-slate-200/60">
                    <ScanBarcode size={15} className="mx-auto text-slate-400" />
                  </th>
                  <th className="py-3 px-4 min-w-[220px] border-r border-slate-200/60">Item Name / Product</th>
                  <th className="py-3 px-3 w-24 text-center border-r border-slate-200/60">Qty</th>
                  <th className="py-3 px-3 w-28 text-center border-r border-slate-200/60">Unit</th>
                  <th className="py-3 px-3 w-32 text-center border-r border-slate-200/60">Rate (₹)</th>
                  <th className="py-3 px-0 w-36 text-center border-r border-slate-200/60">
                    <div className="border-b border-slate-200/60 pb-1">Discount</div>
                    <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                      <span>%</span>
                      <span>Amount</span>
                    </div>
                  </th>
                  <th className="py-3 px-0 w-36 text-center border-r border-slate-200/60">
                    <div className="border-b border-slate-200/60 pb-1">Tax (GST)</div>
                    <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                      <span>% Slab</span>
                      <span>Tax (₹)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 w-32 text-right">Amount (₹)</th>
                  <th className="py-3 px-2 w-10 text-center"></th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {activeTab.items.map((row, idx) => {
                  const isLightning = idx === 0;
                  const isProductSearchOpen = activeProductSearchIndex === idx;

                  return (
                    <tr
                      key={row.id || idx}
                      className={`transition-colors ${
                        isLightning
                          ? "bg-rose-50/40 hover:bg-rose-50/70 border-b border-rose-200/60"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Col 1: Lightning / Row # */}
                      <td className="py-2 px-3 text-center border-r border-slate-100">
                        {isLightning ? (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center mx-auto" title="Quick Add Lightning Row">
                            <Zap size={14} className="fill-rose-500 text-rose-500" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-slate-400 font-bold text-[11px]">
                            <span>{idx}</span>
                          </div>
                        )}
                      </td>

                      {/* Col 2: Product Name Autocomplete */}
                      <td className="py-2 px-3 relative border-r border-slate-100">
                        <input
                          type="text"
                          placeholder={isLightning && !row.product_name ? "⚡ Type item name for instant add..." : "Enter returned product name..."}
                          value={row.product_name}
                          onChange={(e) => {
                            updateRow(idx, "product_name", e.target.value);
                            setActiveProductSearchIndex(idx);
                          }}
                          onFocus={() => setActiveProductSearchIndex(idx)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-rose-500 focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-hidden transition-all"
                        />

                        {/* Product Suggestions Dropdown */}
                        {isProductSearchOpen && (
                          <div
                            ref={productSuggestRef}
                            className="absolute left-2 top-full mt-1 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 max-h-60 overflow-y-auto animate-in fade-in duration-100"
                          >
                            {(() => {
                              const q = (row.product_name || "").toLowerCase().trim();
                              const selectedSupId = activeTab.selectedSupplier?.id;

                              let sourceList = productsCatalog;
                              if (selectedSupId) {
                                const supItems = productsCatalog.filter(
                                  (p) => Number(p.supplier_id) === Number(selectedSupId)
                                );
                                if (supItems.length > 0) sourceList = supItems;
                              }

                              const filtered = q
                                ? sourceList.filter(
                                    (p) =>
                                      (p.product_name || p.name || "").toLowerCase().includes(q) ||
                                      (p.product_code || "").toLowerCase().includes(q) ||
                                      (p.barcode || "").includes(q)
                                  )
                                : sourceList;

                              if (filtered.length === 0) {
                                return (
                                  <div className="p-3 text-center text-xs text-slate-500">
                                    No item found. Press Enter to use <strong>"{row.product_name}"</strong>.
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {selectedSupId && sourceList.length > 0 && (
                                    <div className="px-3 py-1 bg-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                      Vendor Catalog ({filtered.length})
                                    </div>
                                  )}
                                  {filtered.slice(0, 15).map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => handleSelectProduct(idx, p)}
                                      className="px-3.5 py-2 hover:bg-rose-50/70 cursor-pointer flex items-center justify-between transition text-xs border-b border-slate-50 last:border-0"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900">{p.product_name || p.name}</p>
                                        <p className="text-[11px] text-slate-400">
                                          Stock: {p.stock || 0} {p.unit || ""} {p.product_code ? `• Code: ${p.product_code}` : ""}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-extrabold text-rose-600">
                                          ₹{parseFloat(p.purchase_price || p.price || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">Unit Cost</span>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </td>

                      {/* Col 3: Qty */}
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="0"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-rose-500 focus:bg-white text-center font-bold text-slate-900 outline-hidden transition-all text-xs"
                        />
                      </td>

                      {/* Col 4: Unit */}
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <select
                          value={row.unit}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-rose-500 focus:bg-white text-center font-semibold text-slate-700 outline-hidden transition-all text-xs cursor-pointer"
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>

                      {/* Col 5: Rate */}
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => updateRow(idx, "price", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-rose-500 focus:bg-white text-center font-bold text-slate-900 outline-hidden transition-all text-xs"
                        />
                      </td>

                      {/* Col 6: Discount (% & Amt) */}
                      <td className="py-2 px-0 border-r border-slate-100">
                        <div className="grid grid-cols-2 divide-x divide-slate-100">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="%"
                            value={row.discount_percent || ""}
                            onChange={(e) => {
                              updateRow(idx, "discount_percent", e.target.value);
                              updateRow(idx, "discount_amount", "");
                            }}
                            className="w-full px-1.5 py-1.5 text-center font-semibold text-slate-700 placeholder:text-slate-300 outline-hidden text-xs"
                          />
                          <input
                            type="number"
                            min="0"
                            placeholder="₹"
                            value={row.discount_amount || ""}
                            onChange={(e) => {
                              updateRow(idx, "discount_amount", e.target.value);
                              updateRow(idx, "discount_percent", "");
                            }}
                            className="w-full px-1.5 py-1.5 text-center font-semibold text-slate-700 placeholder:text-slate-300 outline-hidden text-xs"
                          />
                        </div>
                      </td>

                      {/* Col 7: Tax (% & Amt) */}
                      <td className="py-2 px-0 border-r border-slate-100">
                        <div className="grid grid-cols-2 divide-x divide-slate-100 items-center">
                          <select
                            value={row.gst_percentage}
                            onChange={(e) => updateRow(idx, "gst_percentage", e.target.value)}
                            className="w-full px-1.5 py-1.5 text-center font-semibold text-slate-700 outline-hidden text-xs cursor-pointer"
                          >
                            {gstSlabs.map((s, i) => (
                              <option key={i} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <div className="px-1.5 py-1.5 text-center font-bold text-slate-600 text-xs truncate">
                            {row.tax_amount ? `₹${row.tax_amount.toFixed(1)}` : "—"}
                          </div>
                        </div>
                      </td>

                      {/* Col 8: Row Amount */}
                      <td className="py-2 px-4 text-right font-black text-slate-900 text-xs">
                        ₹ {row.amount ? fmtCurrency(row.amount) : "0.00"}
                      </td>

                      {/* Col 9: Delete */}
                      <td className="py-2 px-2 text-center">
                        {!isLightning && (
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Add Row & Live Totals */}
          <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-rose-300 hover:bg-rose-50/30 text-rose-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Plus size={14} className="text-rose-600" />
              <span>Add Another Item Row</span>
            </button>

            <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Total Qty:</span>{" "}
                <span className="text-slate-900">{totalQty}</span>
              </div>
              {totalDiscount > 0 && (
                <div>
                  <span className="text-slate-400 font-medium">Discount:</span>{" "}
                  <span className="text-amber-600">-₹{fmtCurrency(totalDiscount)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div>
                  <span className="text-slate-400 font-medium">GST Tax:</span>{" "}
                  <span className="text-rose-600">+₹{fmtCurrency(totalTax)}</span>
                </div>
              )}
              <div className="text-sm font-black text-slate-900">
                <span className="text-slate-400 font-medium text-xs">Subtotal:</span>{" "}
                ₹{fmtCurrency(calculatedTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: REFUND SETTLEMENT & HERO TOTAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Refund Mode & Reason / Notes (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h2 className="text-sm font-bold text-slate-900">Refund Settlement & Reason</h2>
            </div>

            {/* Refund Type Selection Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Refund Settlement Mode</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Cash", value: "Cash" },
                  { label: "Online / Bank", value: "Online" },
                  { label: "UPI", value: "UPI" },
                  { label: "Cheque", value: "Cheque" },
                  { label: "Credit Adjustment", value: "Credit" }
                ].map((type) => {
                  const isSelected = activeTab.paymentType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateActiveTab({ paymentType: type.value })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs shadow-rose-600/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Return Reason / Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Return / Remarks</label>
                {!activeTab.showDescription && (
                  <button
                    type="button"
                    onClick={() => updateActiveTab({ showDescription: true })}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    + Add Reason
                  </button>
                )}
              </div>

              {activeTab.showDescription ? (
                <textarea
                  rows="3"
                  placeholder="e.g. Defective batch received, wrong part number delivered, overcharged rate adjustment..."
                  value={activeTab.description}
                  onChange={(e) => updateActiveTab({ description: e.target.value })}
                  className="w-full p-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 text-xs font-medium text-slate-900 transition-all outline-hidden resize-none"
                />
              ) : (
                <div
                  onClick={() => updateActiveTab({ showDescription: true })}
                  className="p-3 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs cursor-pointer hover:bg-slate-50/50 transition"
                >
                  Click to add reason for debit note (e.g. Quality defect, Wrong shipment, Rate dispute)...
                </div>
              )}
            </div>
          </div>

          {/* Right: Tax Breakdown & Hero Grand Total (5 Cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Return Value Summary
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span>Taxable Return Value</span>
                <span className="font-bold text-slate-900">₹ {fmtCurrency(calculatedTotal - totalTax + totalDiscount)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-amber-600 font-medium">
                  <span>Total Discount</span>
                  <span className="font-bold">-₹ {fmtCurrency(totalDiscount)}</span>
                </div>
              )}

              {totalTax > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-medium">
                  <span>Total GST Return Tax</span>
                  <span className="font-bold">+₹ {fmtCurrency(totalTax)}</span>
                </div>
              )}

              {/* Round Off Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeTab.roundOffEnabled}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="font-bold text-slate-600">
                  {roundOffVal !== 0 ? (roundOffVal > 0 ? `+₹${roundOffVal.toFixed(2)}` : `-₹${Math.abs(roundOffVal).toFixed(2)}`) : "₹0.00"}
                </span>
              </div>
            </div>

            {/* Hero Total Box */}
            <div className="bg-gradient-to-br from-rose-600 via-rose-700 to-red-700 rounded-2xl p-5 text-white shadow-lg shadow-rose-600/25">
              <span className="text-xs uppercase tracking-wider font-extrabold text-rose-200 block mb-1">
                Total Refund / Credit Value
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight">
                ₹ {fmtCurrency(grandTotal)}
              </div>
              <p className="text-[11px] text-rose-100/80 mt-1">
                {activeTab.paymentType === "Credit"
                  ? "Will reduce supplier outstanding payable ledger"
                  : `Will be refunded to business via ${activeTab.paymentType}`}
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* ── 4. STICKY BOTTOM COMMAND BAR ── */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Discard
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDebitNote}
              disabled={saving}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Save Debit Note</span>
                </>
              )}
            </button>
          </div>

        </div>
      </footer>

      {/* Close Confirm Modal */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases/return")}
      />

      {/* Built-in Safe Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

    </div>
  );
}
