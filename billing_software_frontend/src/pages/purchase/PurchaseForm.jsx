import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  X,
  Upload,
  Share2,
  Calculator,
  Settings,
  ChevronDown,
  Paperclip,
  Check,
  Search,
  ScanBarcode,
  Zap,
  ChevronsUpDown,
  Building2,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  AlertCircle,
  FileSpreadsheet,
  Layers,
  Percent,
  Receipt,
  HelpCircle,
  CreditCard,
  Phone,
  CornerUpLeft
} from "lucide-react";
import * as XLSX from "xlsx";

const unitOptions = [
  "NONE", "Piece", "Box", "Pack", "Kg", "Gram", "Litre", "ML", "Meter", "Feet", "Dozen", "Pair", "Roll", "Bag", "Bottle", "Can", "Set"
];

const gstSlabs = [
  { label: "Select", value: "" },
  { label: "0%", value: 0 },
  { label: "5%", value: 5 },
  { label: "12%", value: 12 },
  { label: "18%", value: 18 },
  { label: "28%", value: 28 }
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
    tax_mode: "without_tax",
    discount_percent: "",
    discount_amount: "",
    gst_percentage: "",
    tax_amount: 0,
    selling_price: 0,
    amount: 0
  };
}

function createNewPurchaseTab(id, index, purchaseNoValue = "") {
  return {
    id,
    title: `Purchase #${index}`,
    selectedCompany: localStorage.getItem("selected_company_id") || "",
    partyInput: "",
    selectedSupplier: null,
    supplierPhone: "",
    purchaseNo: purchaseNoValue || "",
    purchaseDate: new Date().toISOString().split("T")[0],
    stateOfSupply: "Tamil Nadu",
    globalTaxMode: "without_tax",
    paymentType: "Cash",
    roundOffEnabled: true,
    paidAmount: 0,
    isPaidModified: false,
    termsAndConditions: "",
    showTermsInput: false,
    description: "",
    showDescInput: false,
    billAttachment: "",
    items: [
      createEmptyRow(true),  // Row 0: Quick Add / Lightning Row ⚡
      createEmptyRow(false), // Row 1: Regular Row
      createEmptyRow(false)  // Row 2: Regular Row
    ],
  };
}

/* ── Close Purchase Confirmation Dialog Component ── */
function ClosePurchaseModal({ isOpen, onCancel, onConfirm }) {
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
          <h3 className="text-sm font-bold text-slate-900">Close Purchase</h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current unsaved changes will be discarded. Do you wish to continue and return to the purchase bills list?
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
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 transition cursor-pointer"
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

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // Draft / Edit ID

  const [showCloseModal, setShowCloseModal] = useState(false);

  // Multi-tab purchases state (each purchase tab has its own items & metadata)
  const [tabs, setTabs] = useState([createNewPurchaseTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);

  // Common catalog state
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showTaxModeDropdown, setShowTaxModeDropdown] = useState(false);
  const [activeProductSearchIndex, setActiveProductSearchIndex] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  const productSuggestRef = useRef(null);
  const partyBoxRef = useRef(null);

  // Active Tab reference
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
    const newId = Date.now();
    const newTab = createNewPurchaseTab(newId, nextIdx);
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (partyBoxRef.current && !partyBoxRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
      if (productSuggestRef.current && !productSuggestRef.current.contains(e.target)) {
        setActiveProductSearchIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Companies
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.id) {
      api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
        .then((res) => {
          if (res.data?.status) {
            setCompanies(res.data.data || []);
            if (!selectedCompany && res.data.data.length > 0) {
              const firstCid = res.data.data[0].id;
              setSelectedCompany(firstCid);
              updateActiveTab({ selectedCompany: firstCid });
            }
          }
        })
        .catch(console.error);
    }
  }, []);

  // Load Suppliers & Product Catalog
  useEffect(() => {
    const currentCompanyId = activeTab.selectedCompany || selectedCompany || localStorage.getItem("selected_company_id");
    if (!currentCompanyId) return;

    api.get(`/supplier/get_all?company_id=${currentCompanyId}`)
      .then((res) => {
        if (res.data?.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);

    api.get(`/product/get?company_id=${currentCompanyId}`)
      .then((res) => {
        if (res.data?.status) {
          setProductsCatalog(res.data.data || []);
        }
      })
      .catch(console.error);

    // If ID exists, load purchase
    if (id) {
      setLoading(true);
      api.get(`/purchase/get_purchase_by_id?id=${id}`)
        .then((res) => {
          if (res.data?.status && res.data.data) {
            const p = res.data.data;
            const loadedItems = (p.items || []).map((item) => ({
              id: Date.now() + Math.random(),
              product_id: item.product_id || null,
              product_name: item.product_name || "",
              product_code: item.product_code || "",
              barcode: item.barcode || "",
              quantity: item.quantity !== null && item.quantity !== undefined ? item.quantity : 1,
              unit: item.unit || "NONE",
              price: item.price !== null && item.price !== undefined ? item.price : 0,
              tax_mode: item.tax_mode || "without_tax",
              discount_percent: item.discount_percent || "",
              discount_amount: item.discount_amount || "",
              gst_percentage: item.gst_percentage !== null && item.gst_percentage !== undefined ? item.gst_percentage : "",
              tax_amount: Number(item.tax_amount) || 0,
              selling_price: Number(item.selling_price) || 0,
              amount: Number(item.total_amount) || 0
            }));

            const formattedItems = [
              createEmptyRow(true),
              ...(loadedItems.length > 0 ? loadedItems : [createEmptyRow(false), createEmptyRow(false)])
            ];

            setTabs([
              {
                id: 1,
                title: `Edit #${p.purchase_no || id}`,
                selectedCompany: p.company_id || currentCompanyId || "",
                partyInput: p.supplier?.supplier_name || p.supplier?.name || "",
                selectedSupplier: p.supplier || null,
                supplierPhone: p.supplier?.mobile_number || p.supplier?.phone || p.supplier?.alt_mobile || "",
                purchaseNo: p.purchase_no || "",
                purchaseDate: p.purchase_date || new Date().toISOString().split("T")[0],
                stateOfSupply: p.state_of_supply || "Tamil Nadu",
                globalTaxMode: "without_tax",
                paymentType: p.payment_type || "Cash",
                roundOffEnabled: true,
                paidAmount: p.paid_amount !== undefined && p.paid_amount !== null ? Number(p.paid_amount) : Number(p.total_amount || 0),
                isPaidModified: true,
                termsAndConditions: p.terms_conditions || "",
                showTermsInput: Boolean(p.terms_conditions),
                description: p.description || "",
                showDescInput: Boolean(p.description),
                billAttachment: p.bill_attachment || "",
                items: formattedItems
              }
            ]);
            setActiveTabId(1);
            setIsLocked(p.status === "submitted");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [selectedCompany, id, activeTab.selectedCompany]);

  // Row calculation helper
  const calculateRow = (row, taxMode = activeTab.globalTaxMode) => {
    const qty = parseFloat(row.quantity);
    const price = parseFloat(row.price);

    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      return {
        ...row,
        discount_amount: row.discount_amount || "",
        tax_amount: 0,
        amount: 0
      };
    }

    const rawSub = qty * price;
    let disc = 0;
    if (parseFloat(row.discount_percent) > 0) {
      disc = (rawSub * parseFloat(row.discount_percent)) / 100;
    } else if (parseFloat(row.discount_amount) > 0) {
      disc = parseFloat(row.discount_amount);
    }

    const taxable = Math.max(0, rawSub - disc);
    const gstPct = parseFloat(row.gst_percentage) || 0;

    let tax = 0;
    let total = 0;

    if (taxMode === "with_tax" || row.tax_mode === "with_tax") {
      const inclusive = Math.max(0, rawSub - disc);
      tax = inclusive - inclusive / (1 + gstPct / 100);
      total = inclusive;
    } else {
      tax = (taxable * gstPct) / 100;
      total = taxable + tax;
    }

    return {
      ...row,
      tax_mode: taxMode,
      discount_amount: disc ? Number(disc.toFixed(2)) : "",
      tax_amount: Number(tax.toFixed(2)),
      amount: Number(total.toFixed(2))
    };
  };

  // Update Item Row Field
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

  // Switch Global Tax Mode
  const handleTaxModeChange = (mode) => {
    const recalculated = activeTab.items.map((r) => calculateRow({ ...r, tax_mode: mode }, mode));
    updateActiveTab({ globalTaxMode: mode, items: recalculated });
    setShowTaxModeDropdown(false);
  };

  // Select Product from autocomplete
  const handleSelectProduct = (index, prod) => {
    const updated = [...activeTab.items];
    const currentQty =
      updated[index].quantity !== "" && updated[index].quantity !== null && parseFloat(updated[index].quantity) > 0
        ? updated[index].quantity
        : 1;

    let row = calculateRow(
      {
        ...updated[index],
        product_id: prod.id,
        product_name: prod.product_name || prod.name,
        product_code: prod.product_code || "",
        barcode: prod.barcode || "",
        price: prod.purchase_price ? parseFloat(prod.purchase_price) : parseFloat(prod.price) || 0,
        selling_price: parseFloat(prod.price) || 0,
        quantity: currentQty,
        unit: prod.unit || "NONE",
        gst_percentage: prod.gst_percentage !== null && prod.gst_percentage !== undefined ? prod.gst_percentage : ""
      },
      activeTab.globalTaxMode
    );

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

  // Add & Delete Row
  const addRow = () => {
    updateActiveTab({ items: [...activeTab.items, createEmptyRow(false)] });
  };

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

  // Party Selection with supplier-specific products loading
  const handleSelectParty = async (supplier) => {
    updateActiveTab({
      selectedSupplier: supplier,
      partyInput: supplier.supplier_name || supplier.name || "",
      supplierPhone: supplier.mobile_number || supplier.phone || supplier.alt_mobile || ""
    });
    setShowPartyDropdown(false);

    if (supplier.id) {
      try {
        const [prodBySup, supProds] = await Promise.all([
          api.get(`/product/get_by_supplier?supplier_id=${supplier.id}`),
          api.get(`/supplier_product/get_by_supplier?supplier_id=${supplier.id}`)
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

  // Filtered Suppliers for autocomplete
  const filteredSuppliers = useMemo(() => {
    const q = (activeTab.partyInput || "").toLowerCase().trim();
    if (!q) return suppliers.slice(0, 10);
    return suppliers.filter(
      (s) =>
        (s.supplier_name || s.name || "").toLowerCase().includes(q) ||
        (s.mobile_number || s.phone || s.alt_mobile || "").includes(q)
    );
  }, [suppliers, activeTab.partyInput]);

  // Overall totals for active tab
  const { totalQty, totalDiscount, totalTax, calculatedGross, roundOffAmount, finalPayableTotal } = useMemo(() => {
    let qty = 0;
    let disc = 0;
    let tax = 0;
    let gross = 0;

    activeTab.items.forEach((item, idx) => {
      if (idx === 0 && !item.product_name) return; // skip empty lightning row
      const q = parseFloat(item.quantity);
      if (!isNaN(q) && q > 0) qty += q;
      const d = parseFloat(item.discount_amount);
      if (!isNaN(d) && d > 0) disc += d;
      const t = parseFloat(item.tax_amount);
      if (!isNaN(t) && t > 0) tax += t;
      const a = parseFloat(item.amount);
      if (!isNaN(a) && a > 0) gross += a;
    });

    let roundDiff = 0;
    let payable = gross;
    if (activeTab.roundOffEnabled) {
      payable = Math.round(gross);
      roundDiff = payable - gross;
    }

    return {
      totalQty: qty,
      totalDiscount: disc,
      totalTax: tax,
      calculatedGross: gross,
      roundOffAmount: Number(roundDiff.toFixed(2)),
      finalPayableTotal: payable,
    };
  }, [activeTab.items, activeTab.roundOffEnabled]);

  // Auto-sync paidAmount with finalPayableTotal if not manually modified
  useEffect(() => {
    if (!id && !activeTab.isPaidModified) {
      updateActiveTab({ paidAmount: finalPayableTotal });
    }
  }, [finalPayableTotal, id, activeTab.isPaidModified]);

  const currentPaid = activeTab.paidAmount === "" ? 0 : parseFloat(activeTab.paidAmount) || 0;
  const balanceDue = Math.max(0, finalPayableTotal - currentPaid);

  // Format Helper
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Excel Upload Parser
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (json.length === 0) {
        alert("The uploaded excel sheet is empty!");
        return;
      }

      const parsed = json.map((row) => {
        const findVal = (names) => {
          const key = Object.keys(row).find((k) => names.includes(k.trim().toLowerCase()));
          return key ? row[key] : "";
        };

        const item = {
          id: Date.now() + Math.random(),
          product_id: null,
          product_name: String(findVal(["product name", "item", "product_name"]) || ""),
          product_code: String(findVal(["product code", "code", "sku"]) || ""),
          barcode: String(findVal(["barcode"]) || ""),
          quantity: Number(findVal(["quantity", "qty"])) || 1,
          unit: String(findVal(["unit"]) || "NONE"),
          price: Number(findVal(["price", "rate", "cost", "supplier price"])) || 0,
          tax_mode: activeTab.globalTaxMode,
          discount_percent: Number(findVal(["discount %", "discount_percent"])) || "",
          discount_amount: Number(findVal(["discount", "discount amount"])) || "",
          gst_percentage: Number(findVal(["gst %", "gst", "tax"])) || "",
          tax_amount: 0,
          selling_price: Number(findVal(["selling price", "sell price"])) || 0,
          amount: 0
        };
        return calculateRow(item, activeTab.globalTaxMode);
      });

      updateActiveTab({
        items: [createEmptyRow(true), ...parsed]
      });
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  // Submit & Save Form
  const handleSave = async (status = "submitted") => {
    const compId = activeTab.selectedCompany || selectedCompany || localStorage.getItem("selected_company_id");
    if (!compId) {
      alert("Please select a company!");
      return;
    }
    if (!activeTab.selectedSupplier && !activeTab.partyInput.trim()) {
      alert("Please enter or select a supplier party name!");
      return;
    }

    const validItems = activeTab.items.filter(
      (i, idx) => (idx > 0 || i.product_name) && i.product_name && i.product_name.trim()
    );
    if (validItems.length === 0) {
      alert("Please enter at least one item with a valid product name!");
      return;
    }

    setSaving(true);
    try {
      let supplierId = activeTab.selectedSupplier?.id;
      if (!supplierId && activeTab.partyInput.trim()) {
        const supRes = await api.post("/supplier/create", {
          company_id: compId,
          supplier_name: activeTab.partyInput.trim(),
          mobile_number: activeTab.supplierPhone.trim() || "0000000000",
          phone: activeTab.supplierPhone.trim()
        });
        if (supRes.data.status) {
          supplierId = supRes.data.data?.id || supRes.data.supplier_id;
        }
      }

      const payload = {
        id: id || 0,
        company_id: compId,
        supplier_id: supplierId,
        purchase_no: activeTab.purchaseNo,
        purchase_date: activeTab.purchaseDate,
        state_of_supply: activeTab.stateOfSupply,
        payment_type: activeTab.paymentType,
        round_off: roundOffAmount,
        total_amount: finalPayableTotal,
        paid_amount: currentPaid,
        balance_amount: balanceDue,
        terms_conditions: activeTab.termsAndConditions,
        description: activeTab.description,
        bill_attachment: activeTab.billAttachment,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          quantity: item.quantity || 1,
          unit: item.unit || "NONE",
          price: item.price || 0,
          tax_mode: item.tax_mode || activeTab.globalTaxMode,
          discount_percent: item.discount_percent || 0,
          discount_amount: item.discount_amount || 0,
          gst_percentage: item.gst_percentage || 0,
          selling_price: item.selling_price || 0
        }))
      };

      const endpoint = status === "draft" ? "/purchase/save_draft" : "/purchase/submit_purchase";
      const res = await api.post(endpoint, payload);

      if (res.data.status) {
        navigate("/purchases");
      } else {
        alert(res.data.message || "Failed to save purchase invoice");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving purchase invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased pb-24">
      
      {/* ── 1. EXECUTIVE TOP COMMAND BAR ── */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCloseModal(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Back to Purchases"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-xs shadow-blue-500/20">
              <Receipt size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {id ? `Edit Purchase Invoice #${id}` : "Add Purchase Invoice"}
                </h1>
                {isLocked && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Submitted (Read-Only)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Record inward supplier bill & inventory stock</p>
            </div>
          </div>
        </div>

        {/* Multi-Tab Switcher & Utility Tools */}
        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-blue-600 shadow-xs border border-slate-200/80"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Receipt size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
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

            {!id && (
              <button
                type="button"
                onClick={handleAddTab}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Add New Purchase Tab"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Import Excel Tool */}
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold shadow-2xs transition cursor-pointer" title="Import Excel Sheet">
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Import Excel</span>
            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
          </label>

          {/* Calculator Tool */}
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold shadow-2xs transition cursor-pointer"
            title="Calculator"
          >
            <Calculator size={14} className="text-slate-500" />
            <span className="hidden sm:inline">Calculator</span>
          </button>

          {/* Close Action */}
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Close Form"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── 2. FORM WORKSPACE CONTAINER ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ── SECTION 1: SUPPLIER & BILL METADATA CARD ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h2 className="text-sm font-bold text-slate-900">Purchase & Supplier Information</h2>
            </div>
            {activeTab.selectedSupplier && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200/60 rounded-xl text-xs">
                <span className="text-amber-700 font-medium">Supplier Pending Balance:</span>
                <span className="font-extrabold text-amber-900">₹ {fmt(activeTab.selectedSupplier.pending_balance || 0)}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            
            {/* Left 6 Columns: Supplier Search & Contact */}
            <div className="md:col-span-6 space-y-4" ref={partyBoxRef}>
              {/* Supplier Search Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Supplier / Vendor Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Truck size={16} className="absolute left-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search or enter supplier name..."
                      value={activeTab.partyInput}
                      onChange={(e) => {
                        updateActiveTab({ partyInput: e.target.value, selectedSupplier: null });
                        setShowPartyDropdown(true);
                      }}
                      onClick={() => setShowPartyDropdown(true)}
                      onFocus={() => setShowPartyDropdown(true)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                    />
                    <ChevronDown
                      size={15}
                      className={`absolute right-3.5 text-slate-400 transition-transform cursor-pointer ${
                        showPartyDropdown ? "rotate-180 text-blue-600" : ""
                      }`}
                      onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showPartyDropdown && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {filteredSuppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleSelectParty(s)}
                          className="px-4 py-2.5 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                              {(s.supplier_name || s.name || "S")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{s.supplier_name || s.name}</p>
                              <p className="text-[11px] text-slate-500">{s.mobile_number || s.phone || "No phone"}</p>
                            </div>
                          </div>
                          {Number(s.pending_balance) > 0 && (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-medium">Due</span>
                              <span className="text-xs font-bold text-rose-600">
                                ₹ {Number(s.pending_balance).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      {filteredSuppliers.length === 0 && (
                        <div className="p-4 text-center">
                          <p className="text-xs text-slate-500">No matching supplier found.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Will register <strong>"{activeTab.partyInput}"</strong> as a new supplier.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Phone & Selected Supplier Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Contact Phone</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Supplier phone..."
                      value={activeTab.supplierPhone}
                      onChange={(e) => updateActiveTab({ supplierPhone: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">State of Supply</label>
                  <select
                    value={activeTab.stateOfSupply}
                    onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden cursor-pointer"
                  >
                    <option value="Tamil Nadu">Tamil Nadu (Intra-State)</option>
                    <option value="Kerala">Kerala (IGST)</option>
                    <option value="Karnataka">Karnataka (IGST)</option>
                    <option value="Andhra Pradesh">Andhra Pradesh (IGST)</option>
                    <option value="Maharashtra">Maharashtra (IGST)</option>
                    <option value="Other">Other State (IGST)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right 6 Columns: Bill No, Date, Firm */}
            <div className="md:col-span-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Firm Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Company / Firm</label>
                  <select
                    value={activeTab.selectedCompany || selectedCompany}
                    onChange={(e) => {
                      updateActiveTab({ selectedCompany: e.target.value });
                      setSelectedCompany(e.target.value);
                      localStorage.setItem("selected_company_id", e.target.value);
                    }}
                    className="w-full px-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-semibold text-slate-900 transition-all outline-hidden cursor-pointer"
                  >
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                {/* Bill Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Supplier Bill #</label>
                  <div className="relative">
                    <FileText size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. INV-9042"
                      value={activeTab.purchaseNo}
                      onChange={(e) => updateActiveTab({ purchaseNo: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-mono font-bold text-slate-900 transition-all outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bill Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Bill Date</label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                    <input
                      type="date"
                      value={activeTab.purchaseDate}
                      onChange={(e) => updateActiveTab({ purchaseDate: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2 bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-bold text-slate-900 transition-all outline-hidden cursor-pointer"
                    />
                  </div>
                </div>

                {/* Active Tab Reference Badge */}
                <div className="flex flex-col justify-end">
                  <div className="px-3.5 py-2 bg-blue-50/60 rounded-xl border border-blue-200/60 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Active Workspace</span>
                    <span className="text-xs font-black text-blue-900">{activeTab.title}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* ── SECTION 2: PRODUCT LINE ITEMS TABLE (Separate Workspace Section for each Tab) ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          
          {/* Table Header & Controls Bar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Product & Item Details <span className="text-blue-600">({activeTab.title})</span>
                </h2>
                <p className="text-[11px] text-slate-500">Add products, quantities, purchase rates, discounts and GST tax slabs</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Tax Mode Switcher */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div
                  onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
                >
                  <Percent size={13} className="text-blue-600" />
                  <span>Prices: {activeTab.globalTaxMode === "with_tax" ? "Tax Inclusive" : "Tax Exclusive"}</span>
                  <ChevronDown size={13} className="text-slate-400" />
                </div>

                {showTaxModeDropdown && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                    <div
                      onClick={() => handleTaxModeChange("without_tax")}
                      className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                        activeTab.globalTaxMode === "without_tax" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tax Exclusive</span>
                      {activeTab.globalTaxMode === "without_tax" && <Check size={14} />}
                    </div>
                    <div
                      onClick={() => handleTaxModeChange("with_tax")}
                      className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                        activeTab.globalTaxMode === "with_tax" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Tax Inclusive</span>
                      {activeTab.globalTaxMode === "with_tax" && <Check size={14} />}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Excel / Bill */}
              <label className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition cursor-pointer shadow-2xs">
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span>Import Excel</span>
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelUpload} className="hidden" />
              </label>
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
                  <th className="py-3 px-3 w-32 text-center border-r border-slate-200/60">Price / Unit (₹)</th>
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
                          ? "bg-blue-50/40 hover:bg-blue-50/70 border-b border-blue-200/60"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Col 1: Lightning / Row # */}
                      <td className="py-2 px-3 text-center border-r border-slate-100">
                        {isLightning ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center mx-auto" title="Quick Add Lightning Row">
                            <Zap size={14} className="fill-blue-600 text-blue-600" />
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
                          placeholder={isLightning && !row.product_name ? "⚡ Type item name for instant add..." : "Search catalog or enter item name..."}
                          value={row.product_name}
                          onChange={(e) => {
                            updateRow(idx, "product_name", e.target.value);
                            setActiveProductSearchIndex(idx);
                          }}
                          onFocus={() => setActiveProductSearchIndex(idx)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-hidden transition-all"
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
                                    No item found. Will save <strong>"{row.product_name}"</strong>.
                                  </div>
                                );
                              }

                              return (
                                <>
                                  {selectedSupId && sourceList.length > 0 && (
                                    <div className="px-3 py-1 bg-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                                      Supplier Catalog ({filtered.length})
                                    </div>
                                  )}
                                  {filtered.slice(0, 15).map((p) => (
                                    <div
                                      key={p.id}
                                      onClick={() => handleSelectProduct(idx, p)}
                                      className="px-3.5 py-2 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition text-xs border-b border-slate-50 last:border-0"
                                    >
                                      <div>
                                        <p className="font-bold text-slate-900">{p.product_name || p.name}</p>
                                        <p className="text-[11px] text-slate-400">
                                          Stock: {p.stock || 0} {p.unit || ""} {p.product_code ? `• Code: ${p.product_code}` : ""}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-extrabold text-blue-600">
                                          ₹{parseFloat(p.purchase_price || p.price || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 block">Purchase Cost</span>
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
                          placeholder="1"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white text-center font-bold text-slate-900 outline-hidden transition-all text-xs"
                        />
                      </td>

                      {/* Col 4: Unit */}
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <select
                          value={row.unit}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white text-center font-semibold text-slate-700 outline-hidden transition-all text-xs cursor-pointer"
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </td>

                      {/* Col 5: Price / Unit */}
                      <td className="py-2 px-2 text-center border-r border-slate-100">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={(e) => updateRow(idx, "price", e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white text-center font-bold text-slate-900 outline-hidden transition-all text-xs"
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
                        ₹ {row.amount ? fmt(row.amount) : "0.00"}
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

          {/* Table Footer Summary Bar */}
          <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-blue-700 text-xs font-bold shadow-2xs transition cursor-pointer"
            >
              <Plus size={14} className="text-blue-600" />
              <span>Add Another Item Row</span>
            </button>

            <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
              <div>
                <span className="text-slate-400 font-medium">Total Qty:</span>{" "}
                <span className="text-slate-900">{totalQty || 0}</span>
              </div>
              {totalDiscount > 0 && (
                <div>
                  <span className="text-slate-400 font-medium">Discount:</span>{" "}
                  <span className="text-rose-600">-₹{fmt(totalDiscount)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div>
                  <span className="text-slate-400 font-medium">GST Tax:</span>{" "}
                  <span className="text-emerald-700">+₹{fmt(totalTax)}</span>
                </div>
              )}
              <div className="text-sm font-black text-slate-900">
                <span className="text-slate-400 font-medium text-xs">Subtotal:</span>{" "}
                ₹{fmt(calculatedGross)}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: BOTTOM SETTLEMENT & EXECUTIVE SUMMARY ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left 7 Cols: Payment Mode & Terms */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-sm font-bold text-slate-900">Payment Mode & Extra Notes</h3>
            </div>

            {/* Payment Method Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Payment Method</label>
              <div className="flex flex-wrap gap-2">
                {["Cash", "Online", "UPI", "Cheque"].map((mode) => {
                  const isSelected = activeTab.paymentType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateActiveTab({ paymentType: mode })}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-600/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Remarks / Internal Notes</label>
              <textarea
                rows={3}
                placeholder="Add supplier notes, freight remarks, or invoice references..."
                value={activeTab.description}
                onChange={(e) => updateActiveTab({ description: e.target.value })}
                className="w-full p-3 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs font-medium text-slate-900 transition-all outline-hidden resize-none"
              />
            </div>
          </div>

          {/* Right 5 Cols: Financial Intelligence Summary Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Settlement Breakdown</h3>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>

            {/* Subtotal & Taxes */}
            <div className="space-y-2.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Gross Subtotal</span>
                <span className="font-bold text-slate-900">₹ {fmt(calculatedGross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Tax (GST)</span>
                <span className="font-bold text-emerald-700">+ ₹ {fmt(totalTax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Discount</span>
                <span className="font-bold text-rose-600">- ₹ {fmt(totalDiscount)}</span>
              </div>

              {/* Round Off Toggle */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-bold">
                  <input
                    type="checkbox"
                    checked={activeTab.roundOffEnabled}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>Round Off</span>
                </label>
                <span className="font-mono text-slate-500 text-xs">
                  {roundOffAmount ? (roundOffAmount > 0 ? `+${roundOffAmount.toFixed(2)}` : roundOffAmount.toFixed(2)) : "0.00"}
                </span>
              </div>
            </div>

            {/* Grand Total Hero Box */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block mb-1">Grand Total</span>
                <span className="text-2xl sm:text-3xl font-black tracking-tight">₹ {fmt(finalPayableTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-extrabold uppercase">
                  Payable
                </span>
              </div>
            </div>

            {/* Amount Paid & Due Balance */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Amount Paid</span>
                  {Number(currentPaid) !== Number(finalPayableTotal) && (
                    <button
                      type="button"
                      onClick={() => {
                        updateActiveTab({ paidAmount: finalPayableTotal, isPaidModified: false });
                      }}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                    >
                      Full Settle
                    </button>
                  )}
                </div>
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={activeTab.paidAmount === "" ? "" : activeTab.paidAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateActiveTab({
                        isPaidModified: true,
                        paidAmount: val === "" ? "" : val
                      });
                    }}
                    placeholder="0.00"
                    className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-right text-slate-900 outline-none focus:bg-white focus:border-blue-500 transition"
                  />
                </div>
              </div>

              {/* Balance Due Pill */}
              <div className={`p-2.5 rounded-xl border flex justify-between items-center text-xs font-bold ${
                balanceDue > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}>
                <span>Balance Due</span>
                <span className="text-sm font-black">₹ {fmt(balanceDue)}</span>
              </div>
            </div>

          </div>

        </section>

      </main>

      {/* ── 4. STICKY FLOATING ACTION FOOTER ── */}
      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-lg">
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
            onClick={() => handleSave("draft")}
            disabled={saving || isLocked}
            className="px-5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            Save as Draft
          </button>

          <button
            type="button"
            onClick={() => handleSave("submitted")}
            disabled={saving || isLocked}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? "Saving..." : isLocked ? "Submitted (Locked)" : "Save Purchase"}</span>
          </button>
        </div>
      </footer>

      {/* Close Confirm Modal */}
      <ClosePurchaseModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases")}
      />

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

    </div>
  );
}
