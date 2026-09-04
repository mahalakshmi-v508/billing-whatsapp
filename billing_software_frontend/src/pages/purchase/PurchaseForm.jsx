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
  Phone
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

/* ── Built-in Calculator Modal ── */
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

  // Multi-tab tabs state
  const [tabs, setTabs] = useState([{ id: 1, title: id ? `Edit #${id}` : "Purchase #1" }]);
  const [activeTabId, setActiveTabId] = useState(1);

  // Core Form State
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  const [suppliers, setSuppliers] = useState([]);
  const [partyInput, setPartyInput] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [supplierPhone, setSupplierPhone] = useState("");

  const [purchaseNo, setPurchaseNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [stateOfSupply, setStateOfSupply] = useState("Tamil Nadu");

  // Global Tax Mode (Without Tax / With Tax)
  const [globalTaxMode, setGlobalTaxMode] = useState("without_tax");
  const [showTaxModeDropdown, setShowTaxModeDropdown] = useState(false);

  // Items Grid
  const [items, setItems] = useState([]);
  const [productsCatalog, setProductsCatalog] = useState([]);
  const [activeProductSearchIndex, setActiveProductSearchIndex] = useState(null);

  // Settlement & Extra info
  const [paymentType, setPaymentType] = useState("Cash");
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);
  const [roundOffAmount, setRoundOffAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isPaidModified, setIsPaidModified] = useState(false);
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [showTermsInput, setShowTermsInput] = useState(false);
  const [description, setDescription] = useState("");
  const [showDescInput, setShowDescInput] = useState(false);
  const [billAttachment, setBillAttachment] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const productSuggestRef = useRef(null);
  const partyBoxRef = useRef(null);

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

  // Create empty item row
  function createEmptyRow() {
    return {
      product_id: null,
      product_name: "",
      product_code: "",
      barcode: "",
      quantity: "",
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

  // Load Companies
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.id) {
      api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
        .then((res) => {
          if (res.data?.status) {
            setCompanies(res.data.data || []);
            if (!selectedCompany && res.data.data.length > 0) {
              setSelectedCompany(res.data.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, []);

  // Load Suppliers & Product Catalog
  useEffect(() => {
    if (!selectedCompany) return;

    api.get(`/supplier/get_all?company_id=${selectedCompany}`)
      .then((res) => {
        if (res.data?.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);

    api.get(`/product/get?company_id=${selectedCompany}`)
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
            setPurchaseNo(p.purchase_no || "");
            setPurchaseDate(p.purchase_date || new Date().toISOString().split("T")[0]);
            setPaidAmount(p.paid_amount !== undefined && p.paid_amount !== null ? Number(p.paid_amount) : Number(p.total_amount || 0));
            setIsPaidModified(true);
            setPaymentType(p.payment_type || "Cash");
            setStateOfSupply(p.state_of_supply || "Tamil Nadu");
            setTermsAndConditions(p.terms_conditions || "");
            if (p.terms_conditions) setShowTermsInput(true);
            setDescription(p.description || "");
            if (p.description) setShowDescInput(true);
            setBillAttachment(p.bill_attachment || "");
            setIsLocked(p.status === "submitted");

            if (p.supplier) {
              setSelectedSupplier(p.supplier);
              setPartyInput(p.supplier.supplier_name || p.supplier.name || "");
              setSupplierPhone(p.supplier.mobile_number || p.supplier.phone || p.supplier.alt_mobile || "");
            }

            const formattedItems = (p.items || []).map((item) => ({
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
            setItems(formattedItems.length > 0 ? formattedItems : [createEmptyRow(), createEmptyRow(), createEmptyRow()]);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setItems([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
    }
  }, [selectedCompany, id]);

  // Row calculation helper
  const calculateRow = (row, taxMode = globalTaxMode) => {
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
    const updated = [...items];
    updated[index][field] = value;
    updated[index] = calculateRow(updated[index]);
    setItems(updated);
  };

  // Switch Global Tax Mode
  const handleTaxModeChange = (mode) => {
    setGlobalTaxMode(mode);
    setShowTaxModeDropdown(false);
    const updated = items.map((r) => calculateRow({ ...r, tax_mode: mode }, mode));
    setItems(updated);
  };

  // Select Product from autocomplete
  const handleSelectProduct = (index, prod) => {
    const updated = [...items];
    const currentQty =
      updated[index].quantity !== "" && updated[index].quantity !== null && parseFloat(updated[index].quantity) > 0
        ? updated[index].quantity
        : 1;

    updated[index] = calculateRow({
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
    });
    setItems(updated);
    setActiveProductSearchIndex(null);
  };

  // Add & Delete Row
  const addRow = () => {
    setItems([...items, createEmptyRow()]);
  };

  const deleteRow = (index) => {
    if (items.length <= 1) {
      setItems([createEmptyRow()]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Party Selection
  const handleSelectParty = (supplier) => {
    setSelectedSupplier(supplier);
    setPartyInput(supplier.supplier_name || supplier.name || "");
    setSupplierPhone(supplier.mobile_number || supplier.phone || supplier.alt_mobile || "");
    setShowPartyDropdown(false);
  };

  // Filtered Suppliers for autocomplete
  const filteredSuppliers = useMemo(() => {
    if (!partyInput.trim()) return suppliers.slice(0, 10);
    const q = partyInput.toLowerCase();
    return suppliers.filter(
      (s) =>
        (s.supplier_name || s.name || "").toLowerCase().includes(q) ||
        (s.mobile_number || s.phone || s.alt_mobile || "").includes(q)
    );
  }, [suppliers, partyInput]);

  // Overall totals
  const { totalQty, totalDiscount, totalTax, calculatedGross } = useMemo(() => {
    let qty = 0;
    let disc = 0;
    let tax = 0;
    let gross = 0;

    items.forEach((item) => {
      const q = parseFloat(item.quantity);
      if (!isNaN(q) && q > 0) qty += q;
      const d = parseFloat(item.discount_amount);
      if (!isNaN(d) && d > 0) disc += d;
      const t = parseFloat(item.tax_amount);
      if (!isNaN(t) && t > 0) tax += t;
      const a = parseFloat(item.amount);
      if (!isNaN(a) && a > 0) gross += a;
    });

    return { totalQty: qty, totalDiscount: disc, totalTax: tax, calculatedGross: gross };
  }, [items]);

  // Final Total with Round-Off
  const finalPayableTotal = useMemo(() => {
    if (!roundOffEnabled) {
      return calculatedGross;
    }
    return Math.round(calculatedGross);
  }, [calculatedGross, roundOffEnabled]);

  useEffect(() => {
    if (roundOffEnabled) {
      const diff = Math.round(calculatedGross) - calculatedGross;
      setRoundOffAmount(Number(diff.toFixed(2)));
    } else {
      setRoundOffAmount(0);
    }
  }, [calculatedGross, roundOffEnabled]);

  // Auto-sync paidAmount with finalPayableTotal if not manually modified
  useEffect(() => {
    if (!id && !isPaidModified) {
      setPaidAmount(finalPayableTotal);
    }
  }, [finalPayableTotal, id, isPaidModified]);

  const currentPaid = paidAmount === "" ? 0 : parseFloat(paidAmount) || 0;
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
          product_id: null,
          product_name: String(findVal(["product name", "item", "product_name"]) || ""),
          product_code: String(findVal(["product code", "code", "sku"]) || ""),
          barcode: String(findVal(["barcode"]) || ""),
          quantity: Number(findVal(["quantity", "qty"])) || 1,
          unit: String(findVal(["unit"]) || "NONE"),
          price: Number(findVal(["price", "rate", "cost", "supplier price"])) || 0,
          tax_mode: globalTaxMode,
          discount_percent: Number(findVal(["discount %", "discount_percent"])) || "",
          discount_amount: Number(findVal(["discount", "discount amount"])) || "",
          gst_percentage: Number(findVal(["gst %", "gst", "tax"])) || "",
          tax_amount: 0,
          selling_price: Number(findVal(["selling price", "sell price"])) || 0,
          amount: 0
        };
        return calculateRow(item);
      });

      setItems(parsed);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
  };

  // Submit & Save Form
  const handleSave = async (status = "submitted") => {
    if (!selectedCompany) {
      alert("Please select a company!");
      return;
    }
    if (!selectedSupplier && !partyInput.trim()) {
      alert("Please enter or select a supplier party name!");
      return;
    }

    const validItems = items.filter((i) => i.product_name && i.product_name.trim());
    if (validItems.length === 0) {
      alert("Please enter at least one item with a valid product name!");
      return;
    }

    setSaving(true);
    try {
      let supplierId = selectedSupplier?.id;
      if (!supplierId && partyInput.trim()) {
        const supRes = await api.post("/supplier/create", {
          company_id: selectedCompany,
          supplier_name: partyInput.trim(),
          mobile_number: supplierPhone.trim() || "0000000000",
          phone: supplierPhone.trim()
        });
        if (supRes.data.status) {
          supplierId = supRes.data.data?.id || supRes.data.supplier_id;
        }
      }

      const payload = {
        id: id || 0,
        company_id: selectedCompany,
        supplier_id: supplierId,
        purchase_no: purchaseNo,
        purchase_date: purchaseDate,
        state_of_supply: stateOfSupply,
        payment_type: paymentType,
        round_off: roundOffAmount,
        total_amount: finalPayableTotal,
        paid_amount: currentPaid,
        balance_amount: balanceDue,
        terms_conditions: termsAndConditions,
        description: description,
        bill_attachment: billAttachment,
        items: validItems.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          quantity: item.quantity || 1,
          unit: item.unit || "NONE",
          price: item.price || 0,
          tax_mode: item.tax_mode || globalTaxMode,
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col">
      
      {/* ── 1. EXECUTIVE TOP COMMAND BAR ── */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs sticky top-0 z-40">
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
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.title}</span>
                  {tabs.length > 1 && (
                    <X
                      size={12}
                      className="text-slate-400 hover:text-rose-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTabs(tabs.filter((t) => t.id !== tab.id));
                      }}
                    />
                  )}
                </div>
              );
            })}

            <button
              onClick={() => {
                const newId = tabs.length + 1;
                setTabs([...tabs, { id: newId, title: `Purchase #${newId}` }]);
                setActiveTabId(newId);
              }}
              className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-blue-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
              title="Add New Purchase Tab"
            >
              <Plus size={13} strokeWidth={3} />
            </button>
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
        
        {/* ── SECTION 1: SUPPLIER & BILL METADATA CARD ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
            <Building2 size={16} className="text-blue-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Purchase & Supplier Information</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left 6 Columns: Supplier Search & Contact */}
            <div className="lg:col-span-6 space-y-4">
              {/* Supplier Search Box */}
              <div ref={partyBoxRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier / Vendor Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search or enter supplier name..."
                    value={partyInput}
                    onChange={(e) => {
                      setPartyInput(e.target.value);
                      setShowPartyDropdown(true);
                    }}
                    onClick={() => setShowPartyDropdown(true)}
                    onFocus={() => setShowPartyDropdown(true)}
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-2xs"
                  />
                  <Truck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <ChevronDown
                    size={14}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer transition-transform ${showPartyDropdown ? "rotate-180" : ""}`}
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-52 overflow-y-auto z-50 py-1 animate-in fade-in zoom-in-95 duration-100">
                    {filteredSuppliers.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectParty(s)}
                        className="w-full text-left px-3.5 py-2 hover:bg-blue-50/70 border-b border-slate-50 flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{s.supplier_name || s.name}</div>
                          <div className="text-[10px] text-slate-400">{s.mobile_number || s.phone || "No phone"}</div>
                        </div>
                        {Number(s.pending_balance) > 0 && (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            Due: ₹{Number(s.pending_balance).toFixed(2)}
                          </span>
                        )}
                      </button>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        Will register <b>"{partyInput}"</b> as a new supplier.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone & Selected Supplier Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Supplier phone..."
                      value={supplierPhone}
                      onChange={(e) => setSupplierPhone(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
                    />
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {selectedSupplier && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Party Status</span>
                    <span className="text-xs font-black text-slate-800 truncate">
                      {selectedSupplier.supplier_name || selectedSupplier.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right 6 Columns: Bill No, Date, Firm, State of Supply */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Firm Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Firm</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => {
                    setSelectedCompany(e.target.value);
                    localStorage.setItem("selected_company_id", e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.company_name}</option>
                  ))}
                </select>
              </div>

              {/* Bill Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supplier Bill #</label>
                <input
                  type="text"
                  placeholder="e.g. INV-9042"
                  value={purchaseNo}
                  onChange={(e) => setPurchaseNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Bill Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bill Date</label>
                <div className="relative">
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition cursor-pointer"
                  />
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* State of Supply */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State of Supply</label>
                <select
                  value={stateOfSupply}
                  onChange={(e) => setStateOfSupply(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition"
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
        </section>

        {/* ── SECTION 2: PRODUCT LINE ITEMS TABLE (Hero Section) ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={15} className="text-blue-600" />
                <span>Product & Item Details ({items.length} items)</span>
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Tax Mode Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer shadow-2xs"
                >
                  <Percent size={12} className="text-blue-600" />
                  <span>Price: {globalTaxMode === "with_tax" ? "With Tax (Inclusive)" : "Without Tax (Exclusive)"}</span>
                  <ChevronDown size={12} />
                </button>

                {showTaxModeDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-50 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => handleTaxModeChange("without_tax")}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${globalTaxMode === "without_tax" ? "text-blue-600" : "text-slate-700"}`}
                    >
                      Without Tax (Price Exclusive)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTaxModeChange("with_tax")}
                      className={`w-full text-left px-3.5 py-2 hover:bg-slate-50 ${globalTaxMode === "with_tax" ? "text-blue-600" : "text-slate-700"}`}
                    >
                      With Tax (Price Inclusive)
                    </button>
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 font-extrabold text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-10">#</th>
                  <th className="py-3 px-4 border-r border-slate-200/70">Item Name</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-20">Qty</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-24">Unit</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-28">Price / Unit</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-32">Discount (% / ₹)</th>
                  <th className="py-3 px-3 text-center border-r border-slate-200/70 w-32">Tax (% / ₹)</th>
                  <th className="py-3 px-4 text-right border-r border-slate-200/70 w-28">Amount</th>
                  <th className="py-3 px-3 text-center w-12">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-semibold">
                {items.map((row, idx) => (
                  <tr key={idx} className="group hover:bg-blue-50/20 transition-colors">
                    
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/70 text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Item Name Input with Autocomplete */}
                    <td className="py-2 px-3 border-r border-slate-200/70 relative">
                      <input
                        type="text"
                        placeholder="Search product from catalog or enter name..."
                        value={row.product_name}
                        onChange={(e) => {
                          updateRow(idx, "product_name", e.target.value);
                          setActiveProductSearchIndex(idx);
                        }}
                        onClick={() => setActiveProductSearchIndex(idx)}
                        onFocus={() => setActiveProductSearchIndex(idx)}
                        className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-500 transition"
                      />

                      {/* Autocomplete suggestions */}
                      {activeProductSearchIndex === idx && (
                        <div
                          ref={productSuggestRef}
                          className="absolute left-3 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1"
                        >
                          {(() => {
                            const q = (row.product_name || "").toLowerCase().trim();
                            const filtered = q
                              ? productsCatalog.filter(
                                  (p) =>
                                    (p.product_name || p.name || "").toLowerCase().includes(q) ||
                                    (p.product_code || "").toLowerCase().includes(q) ||
                                    (p.barcode || "").includes(q)
                                )
                              : productsCatalog;

                            if (filtered.length === 0) {
                              return (
                                <div className="p-3 text-xs text-slate-400 text-center font-medium">
                                  No matches. Will save <b>"{row.product_name}"</b>
                                </div>
                              );
                            }

                            return filtered.slice(0, 10).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectProduct(idx, p)}
                                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="font-bold text-xs text-slate-900">{p.product_name || p.name}</div>
                                  <div className="text-[10px] text-slate-400">
                                    Stock: {p.stock || 0} {p.unit || ""} {p.product_code ? `• Code: ${p.product_code}` : ""}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-extrabold text-xs text-blue-600">
                                    ₹{parseFloat(p.purchase_price || p.price || 0).toLocaleString()}
                                  </div>
                                  <div className="text-[10px] text-slate-400">Rate</div>
                                </div>
                              </button>
                            ));
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2 border-r border-slate-200/70 text-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="1"
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                        className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 transition"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 border-r border-slate-200/70 text-center">
                      <select
                        value={row.unit}
                        onChange={(e) => updateRow(idx, "unit", e.target.value)}
                        className="w-full py-1.5 px-1 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                      >
                        {unitOptions.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </td>

                    {/* Price/Unit */}
                    <td className="py-2 px-2 border-r border-slate-200/70 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.price}
                        onChange={(e) => updateRow(idx, "price", e.target.value)}
                        className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 transition"
                      />
                    </td>

                    {/* Discount (% / Amount) */}
                    <td className="py-2 px-2 border-r border-slate-200/70">
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="number"
                          placeholder="%"
                          min="0"
                          max="100"
                          value={row.discount_percent || ""}
                          onChange={(e) => {
                            updateRow(idx, "discount_percent", e.target.value);
                            updateRow(idx, "discount_amount", "");
                          }}
                          className="w-full py-1 px-1 bg-slate-50/70 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 text-center outline-none"
                        />
                        <input
                          type="number"
                          placeholder="₹"
                          min="0"
                          value={row.discount_amount || ""}
                          onChange={(e) => {
                            updateRow(idx, "discount_amount", e.target.value);
                            updateRow(idx, "discount_percent", "");
                          }}
                          className="w-full py-1 px-1 bg-slate-50/70 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 text-center outline-none"
                        />
                      </div>
                    </td>

                    {/* Tax (% / Amount) */}
                    <td className="py-2 px-2 border-r border-slate-200/70">
                      <div className="grid grid-cols-2 gap-1 items-center">
                        <select
                          value={row.gst_percentage}
                          onChange={(e) => updateRow(idx, "gst_percentage", e.target.value)}
                          className="w-full py-1 px-1 bg-slate-50/70 border border-slate-200 rounded-md text-[11px] font-bold text-slate-800 outline-none"
                        >
                          {gstSlabs.map((s, i) => (
                            <option key={i} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                        <span className="text-[11px] font-bold text-slate-500 text-center truncate">
                          {row.tax_amount ? `₹${row.tax_amount.toFixed(1)}` : "-"}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-4 text-right border-r border-slate-200/70 font-black text-slate-900 text-xs">
                      ₹{row.amount ? row.amount.toFixed(2) : "0.00"}
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(idx)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto"
                        title="Delete line"
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
                      onClick={addRow}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>+ Add Line Item</span>
                    </button>
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200/70 text-slate-900 font-black">
                    {totalQty || 0}
                  </td>
                  <td className="border-r border-slate-200/70"></td>
                  <td className="border-r border-slate-200/70"></td>
                  <td className="py-3 px-2 text-center border-r border-slate-200/70 text-slate-700">
                    ₹{totalDiscount || 0}
                  </td>
                  <td className="py-3 px-2 text-center border-r border-slate-200/70 text-emerald-700">
                    ₹{totalTax || 0}
                  </td>
                  <td className="py-3 px-4 text-right border-r border-slate-200/70 font-black text-slate-900">
                    ₹{calculatedGross ? calculatedGross.toFixed(2) : "0.00"}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── SECTION 3: BOTTOM SETTLEMENT & EXECUTIVE SUMMARY ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left 7 Cols: Payment Mode & Terms */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <CreditCard size={16} className="text-blue-600" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Payment Mode & Extra Notes</h3>
            </div>

            {/* Payment Method Selector Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["Cash", "Online", "UPI", "Cheque"].map((mode) => {
                  const isSelected = paymentType === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentType(mode)}
                      className={`py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer text-center ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Internal Notes</label>
              <textarea
                rows={2}
                placeholder="Add supplier notes, freight remarks, or invoice references..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Right 5 Cols: Financial Intelligence Summary Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Settlement Breakdown</span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>

            {/* Subtotal & Taxes */}
            <div className="space-y-2 text-xs font-semibold text-slate-600">
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
                    checked={roundOffEnabled}
                    onChange={(e) => setRoundOffEnabled(e.target.checked)}
                    className="cursor-pointer"
                  />
                  <span>Round Off</span>
                </label>
                <span className="font-mono text-slate-500 text-xs">
                  {roundOffAmount ? (roundOffAmount > 0 ? `+${roundOffAmount.toFixed(2)}` : roundOffAmount.toFixed(2)) : "0.00"}
                </span>
              </div>
            </div>

            {/* Grand Total Hero Box */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">Grand Total</span>
                <span className="text-2xl font-black tracking-tight">₹ {fmt(finalPayableTotal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-extrabold uppercase">
                  Payable
                </span>
              </div>
            </div>

            {/* Amount Paid & Due Balance */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Amount Paid</span>
                  {Number(currentPaid) !== Number(finalPayableTotal) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(finalPayableTotal);
                        setIsPaidModified(false);
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
                    value={paidAmount === "" ? "" : paidAmount}
                    onChange={(e) => {
                      setIsPaidModified(true);
                      const val = e.target.value;
                      setPaidAmount(val === "" ? "" : val);
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
            className="flex items-center gap-2 px-7 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
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
