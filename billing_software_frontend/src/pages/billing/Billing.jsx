import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  X, Plus, Calculator, Settings, Calendar, ChevronDown, Check,
  Trash2, FileText, AlignLeft, Image, Paperclip, BarChart2, Share2,
  Printer, MessageSquare, Download, Search, CheckSquare, Square,
  Zap, AlertCircle, ArrowLeft, RefreshCw
} from "lucide-react";

/* ── Indian States List for State of Supply ──────────────────────────────── */
const INDIAN_STATES = [
  "Select", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi"
];

/* ── Units List ──────────────────────────────────────────────────────────── */
const UNITS = ["NONE", "PCS", "BOX", "KG", "LTR", "MTR", "DOZEN", "GRAM", "SET", "BAG"];

/* ── Tax Rates List ──────────────────────────────────────────────────────── */
const TAX_RATES = [
  { label: "Select", value: 0 },
  { label: "None (0%)", value: 0 },
  { label: "GST @ 0%", value: 0 },
  { label: "GST @ 5%", value: 5 },
  { label: "GST @ 12%", value: 12 },
  { label: "GST @ 18%", value: 18 },
  { label: "GST @ 28%", value: 28 },
];

/* ── Mini Calculator Component ───────────────────────────────────────────── */
function CalculatorModal({ isOpen, onClose }) {
  const [calcInput, setCalcInput] = useState("0");
  const [prevVal, setPrevVal] = useState(null);
  const [operation, setOperation] = useState(null);
  const [resetNext, setResetNext] = useState(false);

  if (!isOpen) return null;

  const handleNum = (n) => {
    if (calcInput === "0" || resetNext) {
      setCalcInput(String(n));
      setResetNext(false);
    } else {
      setCalcInput(calcInput + String(n));
    }
  };

  const handleOp = (op) => {
    const current = parseFloat(calcInput);
    if (prevVal === null) {
      setPrevVal(current);
    } else if (operation) {
      const res = calculate(prevVal, current, operation);
      setPrevVal(res);
      setCalcInput(String(res));
    }
    setOperation(op);
    setResetNext(true);
  };

  const calculate = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEquals = () => {
    if (operation && prevVal !== null) {
      const current = parseFloat(calcInput);
      const res = calculate(prevVal, current, operation);
      setCalcInput(String(res));
      setPrevVal(null);
      setOperation(null);
      setResetNext(true);
    }
  };

  const handleClear = () => {
    setCalcInput("0");
    setPrevVal(null);
    setOperation(null);
    setResetNext(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.35)", display: "flex",
      alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        background: "#ffffff", borderRadius: 16, width: 280,
        boxShadow: "0 20px 40px rgba(0,0,0,0.2)", overflow: "hidden",
        border: "1.5px solid #e2e8f0"
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "12px 16px", background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0", display: "flex",
          justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>Calculator</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{
            background: "#f1f5f9", padding: "12px 14px", borderRadius: 10,
            textAlign: "right", fontSize: 22, fontWeight: 800,
            color: "#0f172a", marginBottom: 14, overflowX: "auto"
          }}>
            {calcInput}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["C", "÷", "×", "-"].map(btn => (
              <button key={btn} onClick={() => btn === "C" ? handleClear() : handleOp(btn)}
                style={{
                  padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: "#f8fafc", fontWeight: 700, fontSize: 15,
                  cursor: "pointer", color: "#2563eb"
                }}>{btn}</button>
            ))}
            {[7, 8, 9, "+"].map(btn => (
              <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleOp(btn)}
                style={{
                  padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: typeof btn === "number" ? "#fff" : "#f8fafc",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  color: typeof btn === "number" ? "#1e293b" : "#2563eb"
                }}>{btn}</button>
            ))}
            {[4, 5, 6, "="].map(btn => (
              <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleEquals()}
                style={{
                  padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: btn === "=" ? "#1f8cff" : "#fff",
                  fontWeight: 700, fontSize: 15, cursor: "pointer",
                  color: btn === "=" ? "#fff" : "#1e293b"
                }}>{btn}</button>
            ))}
            {[1, 2, 3, 0].map(btn => (
              <button key={btn} onClick={() => handleNum(btn)}
                style={{
                  padding: "10px", borderRadius: 8, border: "1px solid #cbd5e1",
                  background: "#fff", fontWeight: 700, fontSize: 15,
                  cursor: "pointer", color: "#1e293b"
                }}>{btn}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Billing() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = user.role === "cashier" ? user.admin_id : user.id;

  /* ── Company ── */
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  /* ── Products & Customers Cache ── */
  const [products, setProducts] = useState([]);

  /* ── Tab Management ── */
  const [tabs, setTabs] = useState([{ id: 1, label: "Sale #1" }]);
  const [activeTab, setActiveTab] = useState(1);

  /* ── Sale Header Form State ── */
  const [paymentType, setPaymentType] = useState("cash"); // "cash" or "credit"
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState(null);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceNumber, setInvoiceNumber] = useState(Math.floor(100 + Math.random() * 900));
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [stateOfSupply, setStateOfSupply] = useState("Select");

  /* ── Rows State ── */
  const initialRow = (isLightning = false) => ({
    id: Date.now() + Math.random(),
    product_id: null,
    item_name: "",
    qty: 1,
    free_qty: 0,
    unit: "NONE",
    price: 0,
    price_type: "without_tax",
    discount_percent: 0,
    discount_amount: 0,
    tax_percent: 0,
    tax_amount: 0,
    amount: 0,
    stock: 0,
    product_code: "",
    isLightning,
  });

  const [rows, setRows] = useState([
    initialRow(true),
    initialRow(false),
    initialRow(false),
  ]);

  /* Autocomplete inside table */
  const [activeRowSuggestId, setActiveRowSuggestId] = useState(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  /* ── Bottom Section State ── */
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState("");
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedDoc, setAttachedDoc] = useState(null);

  /* ── Totals & Discounts ── */
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [overallDiscountAmount, setOverallDiscountAmount] = useState(0);
  const [overallTaxRate, setOverallTaxRate] = useState(0);
  const [roundOffEnabled, setRoundOffEnabled] = useState(true);

  /* ── UI Utilities ── */
  const [showCalculator, setShowCalculator] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  const customerBoxRef = useRef(null);
  const itemSuggestRef = useRef(null);
  const shareRef = useRef(null);

  /* ── Load Companies & Products ── */
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role}`);
        if (res.data.status) {
          setCompanies(res.data.data || []);
          if (!selectedCompany && res.data.data.length > 0) {
            const firstId = String(res.data.data[0].id);
            setSelectedCompany(firstId);
            localStorage.setItem("selected_company_id", firstId);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    const loadProducts = async () => {
      try {
        const res = await api.get(`/product/get?company_id=${selectedCompany}`);
        if (res.data.status) {
          setProducts(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProducts();
  }, [selectedCompany]);

  /* ── Customer Autocomplete ── */
  const handleCustomerSearch = async (val) => {
    setCustomerName(val);
    if (!val || val.trim().length === 0) {
      setCustomerSuggestions([]);
      setShowCustomerDropdown(false);
      return;
    }
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(val)}`);
      if (res.data.status) {
        setCustomerSuggestions(res.data.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCustomer = (c) => {
    setCustomerId(c.id);
    setCustomerName(c.name || c.customer_name);
    setCustomerPhone(c.phone || c.customer_phone || "");
    if (c.state) setStateOfSupply(c.state);
    setShowCustomerDropdown(false);
  };

  /* ── Row Calculation ── */
  const recalculateRow = (row) => {
    const q = parseFloat(row.qty) || 0;
    const p = parseFloat(row.price) || 0;
    let base = q * p;

    // Discount
    let disc = 0;
    if (parseFloat(row.discount_percent) > 0) {
      disc = (base * parseFloat(row.discount_percent)) / 100;
    } else if (parseFloat(row.discount_amount) > 0) {
      disc = parseFloat(row.discount_amount);
    }

    const afterDisc = Math.max(0, base - disc);

    // Tax
    let tax = 0;
    if (parseFloat(row.tax_percent) > 0) {
      tax = (afterDisc * parseFloat(row.tax_percent)) / 100;
    }

    const totalAmt = afterDisc + tax;
    return {
      ...row,
      discount_amount: disc,
      tax_amount: tax,
      amount: totalAmt,
    };
  };

  const updateRowField = (rowId, field, val) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = { ...r, [field]: val };
      return recalculateRow(updated);
    }));
  };

  const handleSelectProduct = (rowId, prod) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const updated = {
        ...r,
        product_id: prod.id,
        item_name: prod.product_name || prod.name,
        price: parseFloat(prod.price) || 0,
        unit: prod.unit || "NONE",
        tax_percent: parseFloat(prod.gst_percentage || prod.gst) || 0,
        stock: prod.stock,
        product_code: prod.product_code || "",
      };
      return recalculateRow(updated);
    }));
    setActiveRowSuggestId(null);
  };

  const addRow = () => {
    setRows(prev => [...prev, initialRow(false)]);
  };

  const deleteRow = (rowId) => {
    if (rows.length === 1) {
      setRows([initialRow(true)]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  /* ── Calculations for Bottom Summary ── */
  const totals = useMemo(() => {
    let totalQty = 0;
    let totalFreeQty = 0;
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;

    rows.forEach(r => {
      totalQty += parseFloat(r.qty) || 0;
      totalFreeQty += parseFloat(r.free_qty) || 0;
      totalDiscountAmount += parseFloat(r.discount_amount) || 0;
      totalTaxAmount += parseFloat(r.tax_amount) || 0;
      subtotalAmount += parseFloat(r.amount) || 0;
    });

    // Overall Discount
    let extraDisc = 0;
    if (parseFloat(overallDiscountPercent) > 0) {
      extraDisc = (subtotalAmount * parseFloat(overallDiscountPercent)) / 100;
    } else if (parseFloat(overallDiscountAmount) > 0) {
      extraDisc = parseFloat(overallDiscountAmount);
    }

    const afterExtraDisc = Math.max(0, subtotalAmount - extraDisc);

    // Overall Tax
    let overallTax = 0;
    if (parseFloat(overallTaxRate) > 0) {
      overallTax = (afterExtraDisc * parseFloat(overallTaxRate)) / 100;
    }

    const rawGrandTotal = afterExtraDisc + overallTax;
    const roundedGrandTotal = roundOffEnabled ? Math.round(rawGrandTotal) : rawGrandTotal;
    const roundDifference = roundedGrandTotal - rawGrandTotal;

    return {
      totalQty,
      totalFreeQty,
      totalDiscountAmount: totalDiscountAmount + extraDisc,
      totalTaxAmount: totalTaxAmount + overallTax,
      subtotalAmount,
      rawGrandTotal,
      roundedGrandTotal,
      roundDifference,
    };
  }, [rows, overallDiscountPercent, overallDiscountAmount, overallTaxRate, roundOffEnabled]);

  /* ── Click Outside Listeners ── */
  useEffect(() => {
    const handler = (e) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
      if (itemSuggestRef.current && !itemSuggestRef.current.contains(e.target)) {
        setActiveRowSuggestId(null);
      }
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Submit / Create Invoice ── */
  const handleSave = async () => {
    const validItems = rows.filter(r => r.item_name && r.item_name.trim() !== "");
    if (validItems.length === 0) {
      setAlertMsg("Please add at least one item to the sale.");
      return;
    }

    if (!customerName || customerName.trim() === "") {
      setAlertMsg("Please enter or select a customer name.");
      return;
    }

    setSaving(true);
    setAlertMsg(null);

    const payloadProducts = validItems.map(r => ({
      product_id: r.product_id || 0,
      product_name: r.item_name,
      qty: parseFloat(r.qty) || 1,
      free_qty: parseFloat(r.free_qty) || 0,
      unit: r.unit,
      price: parseFloat(r.price) || 0,
      discount: parseFloat(r.discount_amount) || 0,
      gst: parseFloat(r.tax_percent) || 0,
      tax_amount: parseFloat(r.tax_amount) || 0,
      amount: parseFloat(r.amount) || 0,
    }));

    const payload = {
      company_id: parseInt(selectedCompany) || 0,
      customer_id: customerId || 0,
      customer_name: customerName,
      customer_phone: customerPhone,
      cashier_id: user.id || 0,
      products: payloadProducts,
      sub_total: totals.subtotalAmount,
      gst_total: totals.totalTaxAmount,
      total_amount: totals.roundedGrandTotal,
      paid_amount: paymentType === "cash" ? totals.roundedGrandTotal : 0,
      payment_method: paymentType === "cash" ? "cash" : "credit",
      payment_type: paymentType,
      gst_type: totals.totalTaxAmount > 0 ? "with_gst" : "without_gst",
      state_of_supply: stateOfSupply,
      terms_conditions: termsText,
      description: descriptionText,
    };

    try {
      const res = await api.post("/invoice/create_invoice", payload);
      if (res.data.status) {
        navigate(`/invoice/${res.data.invoice_no}`);
      } else {
        setAlertMsg(res.data.message || "Failed to generate invoice");
      }
    } catch (err) {
      console.error(err);
      setAlertMsg(err.response?.data?.message || "An error occurred while creating invoice.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Filtered Products for Autocomplete ── */
  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery) return products.slice(0, 8);
    const q = itemSearchQuery.toLowerCase();
    return products.filter(p =>
      (p.product_name && p.product_name.toLowerCase().includes(q)) ||
      (p.product_code && String(p.product_code).toLowerCase().includes(q))
    ).slice(0, 10);
  }, [products, itemSearchQuery]);

  return (
    <div style={{
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      minHeight: "100vh",
      background: "#f4f6f9",
      display: "flex",
      flexDirection: "column",
      margin: "-16px",
      color: "#1e293b"
    }}>

      {/* ── TOP BAR & TABS ── */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "8px 16px 0 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Left: Tab list */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {tabs.map(t => (
            <div key={t.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: activeTab === t.id ? "#ffffff" : "#f1f5f9",
              borderTop: activeTab === t.id ? "2.5px solid #1f8cff" : "1px solid transparent",
              borderLeft: "1px solid #e2e8f0",
              borderRight: "1px solid #e2e8f0",
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              fontSize: 13.5,
              fontWeight: 700,
              color: activeTab === t.id ? "#0f172a" : "#64748b",
              cursor: "pointer",
              marginBottom: "-1px"
            }}>
              <span>{t.label}</span>
              <button onClick={(e) => { e.stopPropagation(); navigate("/dashboard"); }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", display: "flex" }}>
                <X size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setRows([initialRow(true), initialRow(false)]);
              setCustomerName("");
              setCustomerPhone("");
            }}
            title="New Sale Tab"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "none",
              background: "#1f8cff",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: 4
            }}
          >
            <Plus size={16} strokeWidth={2.8} />
          </button>
        </div>

        {/* Right: Utilities (Calculator, Settings, Close) */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 6 }}>
          {/* Calculator */}
          <button
            onClick={() => setShowCalculator(true)}
            title="Calculator"
            style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <Calculator size={19} />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", position: "relative", display: "flex", alignItems: "center" }}
          >
            <Settings size={19} />
            <span style={{ position: "absolute", top: -2, right: -2, width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
          </button>

          {/* Close */}
          <button
            onClick={() => navigate("/dashboard")}
            title="Close"
            style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── SUB-HEADER: Mode Bar (Sale | Credit - Cash toggle) ── */}
      <div style={{
        background: "#ffffff",
        borderBottom: "1px solid #eef2f6",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        gap: 18
      }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Sale</h2>

        {/* Credit / Cash Switch Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: paymentType === "credit" ? "#1f8cff" : "#64748b" }}>
            Credit
          </span>
          <div
            onClick={() => setPaymentType(p => p === "cash" ? "credit" : "cash")}
            style={{
              width: 44,
              height: 22,
              borderRadius: 20,
              background: paymentType === "cash" ? "#1f8cff" : "#cbd5e1",
              padding: 2,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: paymentType === "cash" ? "flex-end" : "flex-start",
              transition: "all .2s ease"
            }}
          >
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#ffffff", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: paymentType === "cash" ? "#1f8cff" : "#64748b" }}>
            Cash
          </span>
        </div>
      </div>

      {/* ── ALERT MESSAGE BANNER ── */}
      {alertMsg && (
        <div style={{
          margin: "12px 24px 0 24px", padding: "10px 16px", borderRadius: 8,
          background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
          fontSize: 13.5, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={16} />
            <span>{alertMsg}</span>
          </div>
          <button onClick={() => setAlertMsg(null)} style={{ border: "none", background: "transparent", color: "#dc2626", cursor: "pointer" }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── CUSTOMER & INVOICE DETAILS SECTION ── */}
      <div style={{
        padding: "18px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 16
      }}>
        {/* Left: Customer search & phone input */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Customer Name input */}
          <div ref={customerBoxRef} style={{ position: "relative", width: 260 }}>
            <div style={{
              background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 8,
              padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between"
            }}>
              <input
                type="text"
                placeholder="Search by Name/Phone *"
                value={customerName}
                onChange={(e) => handleCustomerSearch(e.target.value)}
                onFocus={() => { if (customerSuggestions.length > 0) setShowCustomerDropdown(true); }}
                style={{
                  border: "none", outline: "none", width: "100%",
                  fontSize: 13.5, fontWeight: 600, color: "#1e293b"
                }}
              />
              <ChevronDown size={16} color="#94a3b8" />
            </div>

            {/* Suggestions Dropdown */}
            {showCustomerDropdown && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)", zIndex: 1000,
                marginTop: 4, maxHeight: 200, overflowY: "auto"
              }}>
                {customerSuggestions.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    style={{
                      padding: "9px 12px", cursor: "pointer",
                      borderBottom: "1px solid #f1f5f9", fontSize: 13,
                      display: "flex", justifyContent: "space-between"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                  >
                    <span style={{ fontWeight: 700, color: "#0f172a" }}>{c.name || c.customer_name}</span>
                    <span style={{ color: "#64748b" }}>{c.phone || c.customer_phone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phone No. */}
          <div style={{ width: 170 }}>
            <input
              type="text"
              placeholder="Phone No."
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              style={{
                width: "100%", background: "#ffffff", border: "1px solid #cbd5e1",
                borderRadius: 8, padding: "8px 12px", fontSize: 13.5,
                fontWeight: 600, color: "#1e293b", outline: "none", boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {/* Right: Invoice details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          {/* Invoice Number */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Invoice Number</span>
            <div style={{ display: "flex", alignItems: "center", background: "#e0f2fe", borderRadius: 6, padding: "2px 8px" }}>
              <select
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value)}
                style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "#0369a1", outline: "none", cursor: "pointer" }}
              >
                <option value="ss">ss</option>
                <option value="INV-">INV-</option>
                <option value="BILL-">BILL-</option>
              </select>
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>{invoiceNumber}</span>
          </div>

          {/* Invoice Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Invoice Date</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "inherit"
                }}
              />
              <Calendar size={15} color="#0284c7" />
            </div>
          </div>

          {/* State of supply */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>State of supply</span>
            <select
              value={stateOfSupply}
              onChange={e => setStateOfSupply(e.target.value)}
              style={{
                border: "none", background: "transparent", outline: "none",
                fontSize: 13, fontWeight: 700, color: "#0f172a", cursor: "pointer", textAlign: "right"
              }}
            >
              {INDIAN_STATES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── ITEMS TABLE / GRID ── */}
      <div style={{ padding: "0 24px", flex: 1 }}>
        <div style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          overflow: "visible",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                <th style={{ width: 44, padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span style={{ fontSize: 13, color: "#0284c7" }}>|||</span>
                  </div>
                </th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>ITEM</th>
                <th style={{ width: 65, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>QTY</th>
                <th style={{ width: 75, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>FREE QTY</th>
                <th style={{ width: 95, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>UNIT</th>
                <th style={{ width: 125, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>
                  PRICE/UNIT
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Without Tax ▾</div>
                </th>
                <th style={{ width: 140, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>
                  DISCOUNT
                  <div style={{ display: "flex", justifyContent: "space-around", fontSize: 10, color: "#94a3b8" }}>
                    <span>%</span>
                    <span>AMOUNT</span>
                  </div>
                </th>
                <th style={{ width: 150, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>
                  TAX
                  <div style={{ display: "flex", justifyContent: "space-around", fontSize: 10, color: "#94a3b8" }}>
                    <span>%</span>
                    <span>AMOUNT</span>
                  </div>
                </th>
                <th style={{ width: 100, padding: "8px 10px", textAlign: "right", fontWeight: 700, borderRight: "1px solid #e2e8f0" }}>AMOUNT</th>
                <th style={{ width: 44, padding: "8px 6px", textAlign: "center" }}>
                  <button onClick={addRow} style={{ border: "none", background: "transparent", color: "#1f8cff", cursor: "pointer" }}>
                    <Plus size={16} strokeWidth={2.8} />
                  </button>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid #e2e8f0",
                    background: row.isLightning ? "#f0f7ff" : "#ffffff",
                    transition: "background .15s"
                  }}
                >
                  {/* Column 1: Row indicator */}
                  <td style={{ textAlign: "center", padding: "6px", borderRight: "1px solid #e2e8f0" }}>
                    {row.isLightning ? (
                      <Zap size={15} color="#1f8cff" fill="#1f8cff" style={{ margin: "auto" }} />
                    ) : (
                      <span style={{ color: "#94a3b8", fontWeight: 600 }}>{idx}</span>
                    )}
                  </td>

                  {/* Column 2: ITEM name with Autocomplete */}
                  <td style={{ padding: "4px 8px", borderRight: "1px solid #e2e8f0", position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Enter item name..."
                      value={row.item_name}
                      onChange={(e) => {
                        updateRowField(row.id, "item_name", e.target.value);
                        setItemSearchQuery(e.target.value);
                        setActiveRowSuggestId(row.id);
                      }}
                      onFocus={() => {
                        setItemSearchQuery(row.item_name);
                        setActiveRowSuggestId(row.id);
                      }}
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        outline: "none", fontSize: 13, fontWeight: 600, color: "#1e293b"
                      }}
                    />

                    {/* Product Suggestion Dropdown */}
                    {activeRowSuggestId === row.id && (
                      <div ref={itemSuggestRef} style={{
                        position: "absolute", top: "100%", left: 0, width: 280,
                        background: "#ffffff", borderRadius: 8, border: "1px solid #cbd5e1",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.12)", zIndex: 9999,
                        maxHeight: 220, overflowY: "auto", marginTop: 2
                      }}>
                        {filteredProducts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleSelectProduct(row.id, p)}
                            style={{
                              padding: "8px 12px", cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9", fontSize: 12.5,
                              display: "flex", justifyContent: "space-between"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                            onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{p.product_name || p.name}</div>
                              <div style={{ fontSize: 11, color: "#64748b" }}>Stock: {p.stock} {p.unit || ""}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: "#1f8cff" }}>
                              ₹{parseFloat(p.price || 0).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Column 3: QTY */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <input
                      type="number"
                      min="1"
                      value={row.qty || ""}
                      onChange={e => updateRowField(row.id, "qty", e.target.value)}
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        outline: "none", textAlign: "center", fontSize: 13, fontWeight: 700
                      }}
                    />
                  </td>

                  {/* Column 4: FREE QTY */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <input
                      type="number"
                      min="0"
                      value={row.free_qty || ""}
                      onChange={e => updateRowField(row.id, "free_qty", e.target.value)}
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        outline: "none", textAlign: "center", fontSize: 13, color: "#64748b"
                      }}
                    />
                  </td>

                  {/* Column 5: UNIT */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <select
                      value={row.unit}
                      onChange={e => updateRowField(row.id, "unit", e.target.value)}
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        outline: "none", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#475569"
                      }}
                    >
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>

                  {/* Column 6: PRICE/UNIT */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price || ""}
                      onChange={e => updateRowField(row.id, "price", e.target.value)}
                      style={{
                        width: "100%", border: "none", background: "transparent",
                        outline: "none", textAlign: "center", fontSize: 13, fontWeight: 700
                      }}
                    />
                  </td>

                  {/* Column 7: DISCOUNT (% / AMT) */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        type="number"
                        placeholder="%"
                        min="0"
                        max="100"
                        value={row.discount_percent || ""}
                        onChange={e => {
                          updateRowField(row.id, "discount_percent", e.target.value);
                          updateRowField(row.id, "discount_amount", 0);
                        }}
                        style={{
                          width: "50%", border: "none", background: "transparent",
                          outline: "none", textAlign: "center", fontSize: 12
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Amt"
                        min="0"
                        value={row.discount_amount || ""}
                        onChange={e => {
                          updateRowField(row.id, "discount_amount", e.target.value);
                          updateRowField(row.id, "discount_percent", 0);
                        }}
                        style={{
                          width: "50%", border: "none", background: "transparent",
                          outline: "none", textAlign: "center", fontSize: 12
                        }}
                      />
                    </div>
                  </td>

                  {/* Column 8: TAX (% / AMT) */}
                  <td style={{ padding: "4px 6px", borderRight: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                      <select
                        value={row.tax_percent}
                        onChange={e => updateRowField(row.id, "tax_percent", e.target.value)}
                        style={{
                          width: "55%", border: "none", background: "transparent",
                          outline: "none", fontSize: 11.5, color: "#475569", cursor: "pointer"
                        }}
                      >
                        {TAX_RATES.map((tr, i) => (
                          <option key={i} value={tr.value}>{tr.label}</option>
                        ))}
                      </select>
                      <span style={{ fontSize: 11.5, color: "#64748b", width: "45%", textAlign: "right" }}>
                        ₹{row.tax_amount ? row.tax_amount.toFixed(1) : "0"}
                      </span>
                    </div>
                  </td>

                  {/* Column 9: AMOUNT */}
                  <td style={{ padding: "4px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a", borderRight: "1px solid #e2e8f0" }}>
                    ₹{row.amount ? row.amount.toFixed(2) : "0.00"}
                  </td>

                  {/* Column 10: Action Checkmark / Delete */}
                  <td style={{ textAlign: "center", padding: "4px" }}>
                    {row.item_name ? (
                      <button
                        onClick={() => deleteRow(row.id)}
                        title="Delete Row"
                        style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer", display: "flex", margin: "auto" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                        onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
                      >
                        <Trash2 size={15} />
                      </button>
                    ) : (
                      <div style={{
                        width: 22, height: 22, borderRadius: 4,
                        background: "#1f8cff", color: "#fff", display: "flex",
                        alignItems: "center", justifyContent: "center", margin: "auto"
                      }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Table Footer Summary */}
            <tfoot>
              <tr style={{ background: "#ffffff", borderTop: "1.5px solid #e2e8f0" }}>
                <td colSpan={2} style={{ padding: "10px 14px" }}>
                  <button
                    onClick={addRow}
                    style={{
                      padding: "6px 14px", borderRadius: 6,
                      border: "1.5px solid #1f8cff", background: "#ffffff",
                      color: "#1f8cff", fontWeight: 700, fontSize: 12,
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
                    }}
                  >
                    <Plus size={14} strokeWidth={2.8} />
                    ADD ROW
                  </button>
                </td>
                <td style={{ textAlign: "center", fontWeight: 800, fontSize: 13, borderRight: "1px solid #e2e8f0" }}>
                  {totals.totalQty}
                </td>
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 13, borderRight: "1px solid #e2e8f0", color: "#64748b" }}>
                  {totals.totalFreeQty}
                </td>
                <td style={{ borderRight: "1px solid #e2e8f0" }}></td>
                <td style={{ borderRight: "1px solid #e2e8f0" }}></td>
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 12, borderRight: "1px solid #e2e8f0", color: "#64748b" }}>
                  ₹{totals.totalDiscountAmount.toFixed(2)}
                </td>
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 12, borderRight: "1px solid #e2e8f0", color: "#64748b" }}>
                  ₹{totals.totalTaxAmount.toFixed(2)}
                </td>
                <td style={{ textAlign: "right", fontWeight: 800, fontSize: 14, color: "#0f172a", padding: "10px", borderRight: "1px solid #e2e8f0" }}>
                  ₹{totals.subtotalAmount.toFixed(2)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── BOTTOM SECTION: Actions & Totals ── */}
      <div style={{
        padding: "18px 24px 80px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: 20
      }}>
        {/* Left: Action Buttons (Terms, Description, Image, Doc) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 340 }}>
          {/* Terms & Conditions Button / Textarea */}
          <div>
            <button
              onClick={() => setShowTerms(!showTerms)}
              style={{
                width: "100%", padding: "9px 14px", borderRadius: 8,
                border: "1px solid #cbd5e1", background: "#f8fafc",
                color: "#475569", fontWeight: 700, fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8
              }}
            >
              <AlignLeft size={15} />
              <span>ADD TERMS & CONDITIONS</span>
            </button>
            {showTerms && (
              <textarea
                placeholder="Enter terms & conditions for this sale..."
                value={termsText}
                onChange={e => setTermsText(e.target.value)}
                style={{
                  width: "100%", marginTop: 6, padding: "8px 10px",
                  borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12,
                  outline: "none", boxSizing: "border-box", height: 60
                }}
              />
            )}
          </div>

          {/* Description Button / Textarea */}
          <div>
            <button
              onClick={() => setShowDescription(!showDescription)}
              style={{
                width: "100%", padding: "9px 14px", borderRadius: 8,
                border: "1px solid #cbd5e1", background: "#f8fafc",
                color: "#475569", fontWeight: 700, fontSize: 12,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8
              }}
            >
              <Plus size={15} />
              <span>ADD DESCRIPTION</span>
            </button>
            {showDescription && (
              <textarea
                placeholder="Add invoice description or private notes..."
                value={descriptionText}
                onChange={e => setDescriptionText(e.target.value)}
                style={{
                  width: "100%", marginTop: 6, padding: "8px 10px",
                  borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 12,
                  outline: "none", boxSizing: "border-box", height: 60
                }}
              />
            )}
          </div>

          {/* Image & Document Buttons */}
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{
              flex: 1, padding: "9px 12px", borderRadius: 8,
              border: "1px solid #cbd5e1", background: "#f8fafc",
              color: "#475569", fontWeight: 700, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <Image size={15} />
              <span>ADD IMAGE</span>
              <input type="file" accept="image/*" onChange={e => setAttachedImage(e.target.files[0])} style={{ display: "none" }} />
            </label>

            <label style={{
              flex: 1, padding: "9px 12px", borderRadius: 8,
              border: "1px solid #cbd5e1", background: "#f8fafc",
              color: "#475569", fontWeight: 700, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6
            }}>
              <Paperclip size={15} />
              <span>ADD DOCUMENT</span>
              <input type="file" onChange={e => setAttachedDoc(e.target.files[0])} style={{ display: "none" }} />
            </label>
          </div>
        </div>

        {/* Right: Totals Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 340 }}>
          {/* Overall Discount */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Discount</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                placeholder="(%)"
                value={overallDiscountPercent || ""}
                onChange={e => {
                  setOverallDiscountPercent(e.target.value);
                  setOverallDiscountAmount(0);
                }}
                style={{
                  width: 55, padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1",
                  fontSize: 12.5, textAlign: "center", outline: "none"
                }}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="(₹)"
                value={overallDiscountAmount || ""}
                onChange={e => {
                  setOverallDiscountAmount(e.target.value);
                  setOverallDiscountPercent(0);
                }}
                style={{
                  width: 75, padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1",
                  fontSize: 12.5, textAlign: "right", outline: "none"
                }}
              />
            </div>
          </div>

          {/* Overall Tax */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Tax</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={overallTaxRate}
                onChange={e => setOverallTaxRate(e.target.value)}
                style={{
                  padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1",
                  fontSize: 12, outline: "none", background: "#ffffff"
                }}
              >
                {TAX_RATES.map((tr, i) => (
                  <option key={i} value={tr.value}>{tr.label}</option>
                ))}
              </select>
              <span style={{ fontSize: 13, fontWeight: 700, width: 60, textAlign: "right" }}>
                ₹{totals.totalTaxAmount.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Round Off */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={roundOffEnabled}
                onChange={e => setRoundOffEnabled(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Round Off</span>
            </label>
            <input
              type="text"
              readOnly
              value={totals.roundDifference ? (totals.roundDifference > 0 ? `+${totals.roundDifference.toFixed(2)}` : totals.roundDifference.toFixed(2)) : "0.00"}
              style={{
                width: 65, padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1",
                fontSize: 12, textAlign: "center", background: "#f8fafc", color: "#64748b"
              }}
            />
          </div>

          {/* Grand Total */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Total</span>
            <div style={{
              width: 150, padding: "8px 14px", borderRadius: 8, border: "1.5px solid #cbd5e1",
              background: "#ffffff", fontSize: 18, fontWeight: 900, color: "#0f172a", textAlign: "right"
            }}>
              ₹{totals.roundedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM ACTION BAR ── */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#ffffff", borderTop: "1px solid #e2e8f0",
        padding: "10px 24px", display: "flex", justifyContent: "flex-end",
        alignItems: "center", gap: 12, zIndex: 1000,
        boxShadow: "0 -4px 16px rgba(0,0,0,0.06)"
      }}>
        {/* Analytics preview */}
        <button
          title="Sales Analytics"
          style={{
            padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1",
            background: "#ffffff", color: "#0284c7", cursor: "pointer", display: "flex", alignItems: "center"
          }}
        >
          <BarChart2 size={18} />
        </button>

        {/* Share Menu */}
        <div ref={shareRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowShareMenu(!showShareMenu)}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1.5px solid #1f8cff",
              background: "#ffffff", color: "#1f8cff", fontWeight: 700, fontSize: 13.5,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <span>Share</span>
            <ChevronDown size={15} />
          </button>

          {showShareMenu && (
            <div style={{
              position: "absolute", bottom: "100%", right: 0, marginBottom: 8,
              width: 160, background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0",
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)", overflow: "hidden", zIndex: 10000
            }}>
              <div
                onClick={() => { setShowShareMenu(false); window.print(); }}
                style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
              >
                <Printer size={15} color="#64748b" />
                <span>Print Bill</span>
              </div>
              <div
                onClick={() => { setShowShareMenu(false); handleSave(); }}
                style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
              >
                <MessageSquare size={15} color="#16a34a" />
                <span>WhatsApp</span>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 28px", borderRadius: 8, border: "none",
            background: saving ? "#94a3b8" : "#1f8cff",
            color: "#ffffff", fontWeight: 800, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(31, 140, 255, 0.35)",
            transition: "all .15s ease",
            display: "flex", alignItems: "center", gap: 6
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.filter = "brightness(1.08)"; }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.filter = "none"; }}
        >
          {saving ? (
            <span>Saving...</span>
          ) : (
            <span><u>S</u>ave</span>
          )}
        </button>
      </div>

      {/* Calculator Modal */}
      <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
    </div>
  );
}
