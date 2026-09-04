import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  X, Plus, Calculator, Settings, Calendar, ChevronDown, Check,
  Trash2, AlignLeft, Image, Paperclip, BarChart2,
  Printer, MessageSquare, AlertCircle, Phone, ScanBarcode, Zap, ChevronsUpDown, TrendingUp, ShieldAlert
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

/* ── Factory to create an initial row for a sale (Quantity initially EMPTY) ─ */
function createInitialRow(isLightning = false) {
  return {
    id: Date.now() + Math.random(),
    product_id: null,
    item_name: "",
    qty: "", // Must be initially EMPTY until product is selected
    free_qty: "",
    unit: "NONE",
    price: "",
    price_type: "without_tax",
    discount_percent: "",
    discount_amount: "",
    tax_percent: 0,
    tax_amount: 0,
    amount: 0,
    stock: 0,
    product_code: "",
    isLightning,
  };
}

/* ── Factory to create a brand new independent Sale tab state ────────────── */
function createNewSaleTab(id, index) {
  return {
    id,
    label: `Sale #${index}`,
    paymentType: "cash", // "cash" or "credit"
    priceType: "without_tax",
    customerName: "",
    customerPhone: "",
    customerId: null,
    billingAddress: "",
    shippingAddress: "",
    creditDays: 30,
    customerPendingBalance: 0,
    customerCreditLimit: 0,
    invoicePrefix: "ss",
    invoiceNumber: index + 2,
    invoiceDate: new Date().toISOString().split("T")[0],
    stateOfSupply: "Select",
    rows: [
      createInitialRow(true),
      createInitialRow(false),
      createInitialRow(false),
    ],
    showTerms: false,
    termsText: "",
    showDescription: false,
    descriptionText: "",
    attachedImage: null,
    attachedDoc: null,
    overallDiscountPercent: "",
    overallDiscountAmount: "",
    overallTaxRate: 0,
    roundOffEnabled: true,
    receivedEnabled: true,
    receivedAmount: "",
  };
}

/* ── Theme Constants ─────────────────────────────────────────────────────── */
const THEME = {
  primary: "#1f8cff",
  primaryHover: "#1877dc",
  primarySoft: "#eaf3ff",
  textMain: "#1f2937",
  textMuted: "#6b7280",
  border: "#d1d5db",
  borderLight: "#e5e7eb",
  bgPage: "#f4f6fb",
  bgCard: "#ffffff",
  danger: "#ef4444",
  dangerSoft: "#fef2f2",
};

/* ── Close Sale Confirmation Dialog Component ───────────────────────────── */
function CloseSaleModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(15, 23, 42, 0.45)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onCancel}>
      <div style={{
        background: "#ffffff", borderRadius: 8, width: 400, maxWidth: "92vw",
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)", overflow: "hidden",
        border: `1px solid ${THEME.borderLight}`
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "14px 18px", display: "flex", justifyContent: "space-between",
          alignItems: "center", borderBottom: `1px solid ${THEME.borderLight}`
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.textMain }}>Close Sale</h3>
          <button onClick={onCancel} style={{ border: "none", background: "transparent", cursor: "pointer", color: THEME.textMuted, display: "flex" }}>
            <X size={17} />
          </button>
        </div>
        <div style={{ padding: "18px", fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>
          Current changes will be discarded. Do you wish to continue?
        </div>
        <div style={{ padding: "12px 18px 16px", display: "flex", justifyContent: "flex-end", gap: 10, background: "#fafbfc", borderTop: `1px solid ${THEME.borderLight}` }}>
          <button onClick={onCancel} style={{
            padding: "7px 16px", borderRadius: 6, border: `1px solid ${THEME.border}`,
            background: "#ffffff", color: THEME.primary, fontWeight: 700, fontSize: 13, cursor: "pointer"
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "7px 20px", borderRadius: 6, border: "none",
            background: THEME.primary, color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer"
          }}>OK</button>
        </div>
      </div>
    </div>
  );
}

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

  const calculate = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
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
      background: "rgba(15, 23, 42, 0.4)",
      display: "flex", alignItems: "center", justifyContent: "center"
    }} onClick={onClose}>
      <div style={{
        background: "#ffffff", borderRadius: 10, width: 280,
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)", overflow: "hidden",
        border: `1px solid ${THEME.borderLight}`
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: "12px 16px", background: "#f8fafc",
          borderBottom: `1px solid ${THEME.borderLight}`, display: "flex",
          justifyContent: "space-between", alignItems: "center"
        }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: THEME.textMain }}>Calculator</span>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: THEME.textMuted }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{
            background: "#f1f5f9", padding: "10px 12px", borderRadius: 6,
            textAlign: "right", fontSize: 22, fontWeight: 900,
            color: THEME.textMain, marginBottom: 14, overflowX: "auto"
          }}>
            {calcInput}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {["C", "÷", "×", "-"].map(btn => (
              <button key={btn} onClick={() => btn === "C" ? handleClear() : handleOp(btn)}
                style={{
                  padding: "10px", borderRadius: 6, border: `1px solid ${THEME.borderLight}`,
                  background: "#f8fafc", fontWeight: 800, fontSize: 14,
                  cursor: "pointer", color: THEME.primary
                }}>{btn}</button>
            ))}
            {[7, 8, 9, "+"].map(btn => (
              <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleOp(btn)}
                style={{
                  padding: "10px", borderRadius: 6, border: `1px solid ${THEME.borderLight}`,
                  background: typeof btn === "number" ? "#fff" : "#f8fafc",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  color: typeof btn === "number" ? THEME.textMain : THEME.primary
                }}>{btn}</button>
            ))}
            {[4, 5, 6, "="].map(btn => (
              <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleEquals()}
                style={{
                  padding: "10px", borderRadius: 6, border: `1px solid ${THEME.borderLight}`,
                  background: btn === "=" ? THEME.primary : "#fff",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  color: btn === "=" ? "#fff" : THEME.textMain
                }}>{btn}</button>
            ))}
            {[1, 2, 3, 0].map(btn => (
              <button key={btn} onClick={() => handleNum(btn)}
                style={{
                  padding: "10px", borderRadius: 6, border: `1px solid ${THEME.borderLight}`,
                  background: "#fff", fontWeight: 700, fontSize: 14,
                  cursor: "pointer", color: THEME.textMain
                }}>{btn}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: ADD SALE
══════════════════════════════════════════════════════════════════════════ */
export default function AddSale() {
  const navigate = useNavigate();
  const { invoiceNo } = useParams();
  const isEditMode = Boolean(invoiceNo);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = user.role === "cashier" ? user.admin_id : user.id;

  /* ── Modals State ── */
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [rowToDelete, setRowToDelete] = useState(null);

  /* ── Companies & Products ── */
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [products, setProducts] = useState([]);

  /* ── Multi-Tab Independent State ── */
  const [sales, setSales] = useState([createNewSaleTab(1, 1)]);
  const [activeTabId, setActiveTabId] = useState(1);
  const [tabCounter, setTabCounter] = useState(1);

  /* Active Sale Reference */
  const activeSale = useMemo(() => {
    return sales.find(s => s.id === activeTabId) || sales[0];
  }, [sales, activeTabId]);

  /* Helper to update only the active sale tab */
  const updateActiveSale = (updater) => {
    setSales(prev => prev.map(s => {
      if (s.id !== activeTabId) return s;
      return typeof updater === "function" ? updater(s) : { ...s, ...updater };
    }));
  };

  /* ── Autocomplete States ── */
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerFocused, setIsCustomerFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);

  const [activeRowSuggestId, setActiveRowSuggestId] = useState(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  /* ── UI Utilities ── */
  const [showCalculator, setShowCalculator] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg, ok = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  /* ── Column settings dropdown (opened via the "+" icon in the table header) ── */
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [extraColumns, setExtraColumns] = useState({
    itemCategory: false,
    itemCode: false,
    hsnCode: false,
    description: false,
    discount: true,
  });
  const toggleExtraColumn = (key) => {
    setExtraColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const customerBoxRef = useRef(null);
  const itemSuggestRef = useRef(null);
  const shareRef = useRef(null);
  const columnMenuRef = useRef(null);

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

  /* ── Load Existing Invoice when in Edit Mode ── */
  useEffect(() => {
    if (!invoiceNo) return;
    const loadInvoiceToEdit = async () => {
      try {
        const res = await api.get(`/invoice/get_invoice_by_id?id=${invoiceNo}`);
        if (res.data.status && res.data.data) {
          const inv = res.data.data;
          const prods = Array.isArray(inv.products)
            ? inv.products
            : (typeof inv.products === "string" ? JSON.parse(inv.products) : []);

          const mappedRows = prods.length > 0
            ? prods.map((p, idx) => ({
                id: Date.now() + idx + Math.random(),
                product_id: p.product_id || null,
                item_name: p.product_name || p.name || "",
                qty: parseFloat(p.qty) || 1,
                unit: p.unit || "NONE",
                price: parseFloat(p.price) || 0,
                discount_percent: p.discount_percent ? String(p.discount_percent) : "",
                discount_amount: p.discount ? String(p.discount) : "",
                tax_percent: parseFloat(p.gst ?? p.tax_percent ?? 0) || 0,
                tax_amount: parseFloat(p.tax_amount) || 0,
                amount: parseFloat(p.amount) || 0,
                stock: p.stock || null,
                product_code: p.product_code || "",
              }))
            : [createInitialRow(false)];

          const loadedSale = {
            id: 1,
            tabIndex: 1,
            label: `Edit Sale #${inv.invoice_no}`,
            paymentType: inv.payment_type || (String(inv.payment_method).toLowerCase() === "credit" ? "credit" : "cash"),
            invoiceNumber: inv.invoice_no,
            invoiceDate: inv.created_at ? inv.created_at.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0],
            stateOfSupply: inv.state_of_supply || "Tamil Nadu",
            customerName: inv.customer_name || "",
            customerPhone: inv.customer_phone || "",
            customerId: inv.customer_id || null,
            billingAddress: inv.billing_address || "",
            shippingAddress: inv.shipping_address || "",
            rows: mappedRows,
            overallDiscountPercent: "",
            overallDiscountAmount: "",
            overallTaxRate: 0,
            roundOffEnabled: true,
            receivedEnabled: inv.payment_type === "credit" && Number(inv.paid_amount || 0) > 0,
            receivedAmount: inv.payment_type === "credit" ? String(inv.paid_amount || "") : "",
          };

          setSales([loadedSale]);
          setActiveTabId(1);
          if (inv.company_id) {
            setSelectedCompany(String(inv.company_id));
          }
        }
      } catch (err) {
        console.error("Error loading invoice for edit:", err);
        showToast("Failed to load invoice details for editing.", false);
      }
    };
    loadInvoiceToEdit();
  }, [invoiceNo]);

  /* ── Tab Management: Add / Close ── */
  const handleAddNewTab = () => {
    const nextNum = tabCounter + 1;
    const newId = Date.now();
    const newTab = createNewSaleTab(newId, nextNum);
    setSales(prev => [...prev, newTab]);
    setActiveTabId(newId);
    setTabCounter(nextNum);
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    if (sales.length === 1) {
      setShowCloseConfirm(true);
      return;
    }
    const filtered = sales.filter(s => s.id !== tabId);
    setSales(filtered);
    if (activeTabId === tabId) {
      setActiveTabId(filtered[filtered.length - 1].id);
    }
  };

  /* ── Customer Search & Auto Fetch ── */
  const handleCustomerSearch = async (val) => {
    updateActiveSale({ customerName: val, customerId: null });
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(val || "")}`);
      if (res.data.status) {
        setCustomerSuggestions(res.data.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialCustomers = async () => {
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=`);
      if (res.data.status) {
        setCustomerSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCustomer = (c) => {
    updateActiveSale({
      customerId: c.id,
      customerName: c.name || c.customer_name,
      customerPhone: c.phone || c.customer_phone || "",
      billingAddress: c.address || c.billing_address || "",
      shippingAddress: c.shipping_address || c.address || "",
      customerPendingBalance: parseFloat(c.pending_amount) || 0,
      customerCreditLimit: parseFloat(c.credit_limit) || 0,
      stateOfSupply: c.state || activeSale.stateOfSupply,
    });
    setShowCustomerDropdown(false);
  };

  /* ── Row Calculation (Initial amount = 0 when quantity/price empty) ── */
  const recalculateRow = (row) => {
    const q = parseFloat(row.qty);
    const p = parseFloat(row.price);

    // If quantity or price is not a valid positive number, amount is 0
    if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
      return {
        ...row,
        discount_amount: "",
        tax_amount: 0,
        amount: 0,
      };
    }

    let base = q * p;

    let disc = 0;
    if (parseFloat(row.discount_percent) > 0) {
      disc = (base * parseFloat(row.discount_percent)) / 100;
    } else if (parseFloat(row.discount_amount) > 0) {
      disc = parseFloat(row.discount_amount);
    }

    const afterDisc = Math.max(0, base - disc);

    let tax = 0;
    if (parseFloat(row.tax_percent) > 0) {
      tax = (afterDisc * parseFloat(row.tax_percent)) / 100;
    }

    const totalAmt = afterDisc + tax;
    return {
      ...row,
      discount_amount: disc ? disc.toFixed(2) : "",
      tax_amount: tax,
      amount: totalAmt,
    };
  };

  const updateRowField = (rowId, field, val) => {
    updateActiveSale(sale => {
      const updatedRows = sale.rows.map(r => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: val };
        return recalculateRow(updated);
      });
      return { ...sale, rows: updatedRows };
    });
  };

  /* ── Product Selection: Automatically sets Quantity = 1 (if was empty) ── */
  const handleSelectProduct = (rowId, prod) => {
    updateActiveSale(sale => {
      const updatedRows = sale.rows.map(r => {
        if (r.id !== rowId) return r;
        const currentQty = (r.qty !== "" && r.qty !== null && parseFloat(r.qty) > 0) ? r.qty : 1;
        const updated = {
          ...r,
          product_id: prod.id,
          item_name: prod.product_name || prod.name,
          price: parseFloat(prod.price) || 0,
          qty: currentQty, // Automatically set to 1 upon product selection
          unit: prod.unit || "NONE",
          tax_percent: parseFloat(prod.gst_percentage || prod.gst) || 0,
          stock: prod.stock,
          product_code: prod.product_code || "",
        };
        return recalculateRow(updated);
      });
      return { ...sale, rows: updatedRows };
    });
    setActiveRowSuggestId(null);
  };

  const addRow = () => {
    updateActiveSale(sale => ({
      ...sale,
      rows: [...sale.rows, createInitialRow(false)]
    }));
  };

  const deleteRow = (rowId) => {
    updateActiveSale(sale => {
      if (sale.rows.length === 1) {
        return { ...sale, rows: [createInitialRow(true)] };
      }
      return { ...sale, rows: sale.rows.filter(r => r.id !== rowId) };
    });
  };

  const confirmDeleteRow = () => {
    if (rowToDelete !== null) {
      deleteRow(rowToDelete);
      setRowToDelete(null);
    }
  };

  /* ── Calculations for Bottom Summary (Initial Total = 0) ── */
  const totals = useMemo(() => {
    if (!activeSale) return { totalQty: 0, totalFreeQty: 0, totalDiscountAmount: 0, totalTaxAmount: 0, subtotalAmount: 0, roundedGrandTotal: 0, roundDifference: 0 };

    let totalQty = 0;
    let totalFreeQty = 0;
    let subtotalAmount = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;

    activeSale.rows.forEach(r => {
      const q = parseFloat(r.qty);
      if (!isNaN(q) && q > 0) totalQty += q;
      const fq = parseFloat(r.free_qty);
      if (!isNaN(fq) && fq > 0) totalFreeQty += fq;
      const da = parseFloat(r.discount_amount);
      if (!isNaN(da) && da > 0) totalDiscountAmount += da;
      const ta = parseFloat(r.tax_amount);
      if (!isNaN(ta) && ta > 0) totalTaxAmount += ta;
      const a = parseFloat(r.amount);
      if (!isNaN(a) && a > 0) subtotalAmount += a;
    });

    let extraDisc = 0;
    if (parseFloat(activeSale.overallDiscountPercent) > 0) {
      extraDisc = (subtotalAmount * parseFloat(activeSale.overallDiscountPercent)) / 100;
    } else if (parseFloat(activeSale.overallDiscountAmount) > 0) {
      extraDisc = parseFloat(activeSale.overallDiscountAmount);
    }

    const afterExtraDisc = Math.max(0, subtotalAmount - extraDisc);

    let overallTax = 0;
    if (parseFloat(activeSale.overallTaxRate) > 0) {
      overallTax = (afterExtraDisc * parseFloat(activeSale.overallTaxRate)) / 100;
    }

    const rawGrandTotal = afterExtraDisc + overallTax;
    const roundedGrandTotal = activeSale.roundOffEnabled ? Math.round(rawGrandTotal) : rawGrandTotal;
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
  }, [activeSale]);

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
      if (columnMenuRef.current && !columnMenuRef.current.contains(e.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Save Invoice ── */
  const handleSave = async () => {
    if (!activeSale) return;

    /* Party Name Validation (Required ONLY for Credit Bills) */
    if (activeSale.paymentType === "credit" && (!activeSale.customerName || !activeSale.customerName.trim())) {
      showToast("Party name doesn't exist, please create a new party.", false);
      return;
    }

    const validItems = activeSale.rows.filter(r => r.item_name && r.item_name.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one item to the sale.", false);
      return;
    }

    setSaving(true);
    setToast(null);

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

    const companyId = parseInt(selectedCompany) || parseInt(user.company_id) || (companies[0] ? parseInt(companies[0].id) : 0);

    const payload = {
      company_id: companyId,
      admin_id: adminId,
      customer_id: activeSale.customerId || 0,
      customer_name: activeSale.customerName?.trim() || "Cash Customer",
      customer_phone: activeSale.customerPhone || "",
      billing_address: activeSale.paymentType === "cash" ? activeSale.billingAddress : "",
      shipping_address: activeSale.paymentType === "cash" ? activeSale.shippingAddress : "",
      cashier_id: user.id || 0,
      products: payloadProducts,
      sub_total: totals.subtotalAmount,
      gst_total: totals.totalTaxAmount,
      total_amount: totals.roundedGrandTotal,
      paid_amount: activeSale.paymentType === "cash"
        ? totals.roundedGrandTotal
        : (activeSale.receivedEnabled !== false
            ? (activeSale.receivedAmount !== "" && activeSale.receivedAmount !== undefined
                ? (parseFloat(activeSale.receivedAmount) || 0)
                : totals.roundedGrandTotal)
            : 0),
      balance_amount: activeSale.paymentType === "cash"
        ? 0
        : Math.max(0, totals.roundedGrandTotal - (activeSale.receivedEnabled !== false
            ? (activeSale.receivedAmount !== "" && activeSale.receivedAmount !== undefined
                ? (parseFloat(activeSale.receivedAmount) || 0)
                : totals.roundedGrandTotal)
            : 0)),
      payment_method: activeSale.paymentType === "cash" ? "cash" : "credit",
      payment_type: activeSale.paymentType,
      gst_type: totals.totalTaxAmount > 0 ? "with_gst" : "without_gst",
      state_of_supply: activeSale.stateOfSupply,
      terms_conditions: activeSale.termsText,
      description: activeSale.descriptionText,
    };

    try {
      const endpoint = isEditMode ? "/invoice/update_invoice" : "/invoice/create_invoice";
      const submitPayload = isEditMode ? { ...payload, invoice_no: invoiceNo } : payload;
      const res = await api.post(endpoint, submitPayload);
      if (res.data.status) {
        if (isEditMode) {
          navigate("/sales/invoices");
        } else {
          navigate(`/invoice/${res.data.invoice_no}`);
        }
      } else {
        showToast(res.data.message || (isEditMode ? "Failed to update invoice" : "Failed to generate invoice"), false);
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "An error occurred while saving invoice.", false);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery) return products.slice(0, 6);
    const q = itemSearchQuery.toLowerCase();
    return products.filter(p =>
      (p.product_name && p.product_name.toLowerCase().includes(q)) ||
      (p.product_code && String(p.product_code).toLowerCase().includes(q))
    ).slice(0, 6);
  }, [products, itemSearchQuery]);

  if (!activeSale) return null;
  const isCredit = activeSale.paymentType === "credit";

  const fieldInputStyle = {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: THEME.textMain,
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: "100vh",
      width: "100vw",
      background: THEME.bgPage,
      display: "flex",
      flexDirection: "column",
      color: THEME.textMain,
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      overflowY: "auto",
      overflowX: "hidden",
      fontSize: 13,
    }}>

      {/* ── 1. TOP HEADER / TABS (MATCHING SCREENSHOT) ── */}
      <header style={{
        background: "#ffffff",
        borderBottom: `1px solid ${THEME.borderLight}`,
        padding: "10px 24px 0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {/* Left: Dynamic Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {sales.map(s => {
            const isActive = s.id === activeTabId;
            return (
              <div
                key={s.id}
                onClick={() => setActiveTabId(s.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 16px",
                  background: isActive ? "#ffffff" : "transparent",
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  color: isActive ? THEME.textMain : THEME.textMuted,
                  cursor: "pointer",
                  border: isActive ? `1px solid ${THEME.borderLight}` : "1px solid transparent",
                  borderBottom: isActive ? "1px solid #ffffff" : "none",
                  marginBottom: "-1px",
                }}
              >
                <span>{s.label}</span>
                <button
                  onClick={(e) => handleCloseTab(e, s.id)}
                  title="Close tab"
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: THEME.textMuted,
                    display: "flex",
                    padding: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = THEME.danger}
                  onMouseLeave={e => e.currentTarget.style.color = THEME.textMuted}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}

          <button
            onClick={handleAddNewTab}
            title="Add New Sale Tab"
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              border: "none",
              background: THEME.primary,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: 6,
            }}
          >
            <Plus size={14} strokeWidth={2.8} />
          </button>
        </div>

        {/* Right: Header Utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 8 }}>
          <button
            onClick={() => setShowCalculator(true)}
            title="Calculator"
            style={{ border: "none", background: "transparent", color: THEME.textMuted, cursor: "pointer", display: "flex" }}
          >
            <Calculator size={17} />
          </button>

          <button
            onClick={() => navigate("/settings")}
            title="Settings"
            style={{ border: "none", background: "transparent", color: THEME.textMuted, cursor: "pointer", position: "relative", display: "flex" }}
          >
            <Settings size={17} />
            <span style={{ position: "absolute", top: -1, right: -1, width: 6, height: 6, borderRadius: "50%", background: THEME.danger }} />
          </button>

          <button
            onClick={() => setShowCloseConfirm(true)}
            title="Close"
            style={{ border: "none", background: "transparent", color: THEME.textMuted, cursor: "pointer", display: "flex" }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* ── 2. MODE BAR (Sale | Credit ⟷ Cash Switch) ── */}
      <div style={{
        background: "#ffffff",
        borderBottom: `1px solid ${THEME.borderLight}`,
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: 16
      }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.textMain }}>Sale</h2>

        <span style={{ fontSize: 13, fontWeight: 600, color: isCredit ? THEME.primary : THEME.textMuted }}>Credit</span>
        <button
          type="button"
          onClick={() => updateActiveSale({ paymentType: isCredit ? "cash" : "credit" })}
          style={{
            width: 38,
            height: 20,
            borderRadius: 12,
            background: THEME.primary,
            border: "none",
            padding: 2,
            cursor: "pointer",
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            transition: "background .15s"
          }}
        >
          <span style={{
            position: "absolute",
            left: isCredit ? 2 : 18,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            transition: "left .15s"
          }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: !isCredit ? THEME.primary : THEME.textMuted }}>Cash</span>
      </div>

      {/* ── FLOATING TOAST NOTIFICATION (MATCHING media_1787816249828.png) ── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 28,
            zIndex: 99999,
            minWidth: 320,
            maxWidth: 420,
            background: toast.ok ? "#10b981" : "#ef4444",
            color: "#ffffff",
            borderRadius: 6,
            padding: "12px 16px",
            boxShadow: "0 6px 20px rgba(239, 68, 68, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldAlert size={26} color="#ffffff" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 500, lineHeight: 1.35, color: "#ffffff" }}>
              {toast.msg}
            </span>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              opacity: 0.9,
            }}
            title="Close"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* ── 3. CUSTOMER & INVOICE DETAILS ROW (MATCHING media_1787726192602.png & media_1787726203749.png) ── */}
      <div style={{ padding: "20px 24px 14px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 32, flexWrap: "wrap" }}>
          
          {/* Left Column: Customer Name, Phone, and (if Cash) Billing Address, Shipping Address */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: "1 1 480px", maxWidth: 560 }}>
            {/* Top row: Customer Name + Phone No */}
            <div style={{ display: "flex", gap: 16 }}>
              {/* Customer Name input with notch label */}
              <div ref={customerBoxRef} style={{ position: "relative", flex: "1 1 260px" }}>
                <div style={{
                  position: "relative",
                  background: "#ffffff",
                  border: `1.5px solid ${isCustomerFocused || showCustomerDropdown ? THEME.primary : THEME.border}`,
                  borderRadius: 4,
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  height: 38,
                  boxSizing: "border-box",
                  transition: "border .15s"
                }}>
                  {/* Floating notch label */}
                  <span style={{
                    position: "absolute",
                    top: -9,
                    left: 10,
                    background: "#ffffff",
                    padding: "0 4px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: isCustomerFocused || showCustomerDropdown ? THEME.primary : "#4b5563"
                  }}>
                    Customer <span style={{ color: "#ef4444" }}>*</span>
                  </span>

                  <input
                    type="text"
                    placeholder={activeSale.customerName ? "" : "Search by Name / Phone"}
                    value={activeSale.customerName}
                    onChange={(e) => handleCustomerSearch(e.target.value)}
                    onFocus={() => {
                      setIsCustomerFocused(true);
                      setShowCustomerDropdown(true);
                      if (customerSuggestions.length === 0) loadInitialCustomers();
                    }}
                    onBlur={() => setIsCustomerFocused(false)}
                    style={fieldInputStyle}
                  />
                  <ChevronDown
                    size={16}
                    color={isCustomerFocused || showCustomerDropdown ? THEME.primary : THEME.textMuted}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setShowCustomerDropdown(v => !v);
                      if (customerSuggestions.length === 0) loadInitialCustomers();
                    }}
                  />
                </div>

                {/* Show BAL under Customer Name if pending balance exists */}
                {activeSale.customerPendingBalance > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0d9488", marginTop: 2, paddingLeft: 4 }}>
                    BAL: {activeSale.customerPendingBalance}
                  </div>
                )}

                {/* Autocomplete Dropdown (Matching media_1787726192602.png) */}
                {showCustomerDropdown && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0,
                    background: "#ffffff", borderRadius: 4, border: `1px solid ${THEME.borderLight}`,
                    boxShadow: "0 10px 24px rgba(0,0,0,0.12)", zIndex: 1000,
                    marginTop: 4, overflow: "visible", maxHeight: "none"
                  }}>
                    {/* Header: Add Party + Party Balance */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", borderBottom: `1px solid ${THEME.borderLight}`,
                      background: "#f9fafb"
                    }}>
                      <span
                        onClick={() => navigate("/customers/add")}
                        style={{ color: THEME.primary, fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                      >
                        ⊕ Add Party
                      </span>
                      <span style={{ color: "#6b7280", fontSize: 11.5, fontWeight: 600 }}>Party Balance</span>
                    </div>

                    {customerSuggestions.length === 0 ? (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: THEME.textMuted }}>
                        No customers found
                      </div>
                    ) : (
                      customerSuggestions.map((c) => {
                        const bal = parseFloat(c.pending_amount || 0);
                        return (
                          <div
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            style={{
                              padding: "8px 12px", cursor: "pointer",
                              borderBottom: `1px solid #f1f5f9`, fontSize: 12.5,
                              display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = THEME.primarySoft}
                            onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                          >
                            <div>
                              <div style={{ fontWeight: 700, color: THEME.textMain }}>{c.name || c.customer_name}</div>
                              <div style={{ fontSize: 11, color: THEME.textMuted }}>{c.phone || c.customer_phone || ""}</div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 700, color: THEME.textMain, fontSize: 12 }}>{bal}</span>
                              {bal > 0 && (
                                <div style={{
                                  width: 16, height: 16, background: "#10b981", borderRadius: 3,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  color: "#fff", fontSize: 10, fontWeight: 800
                                }}>
                                  ↙
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Phone No box with notch label */}
              <div style={{
                position: "relative",
                background: "#ffffff",
                border: `1.5px solid ${isPhoneFocused ? THEME.primary : THEME.border}`,
                borderRadius: 4,
                padding: "8px 10px",
                display: "flex",
                alignItems: "center",
                height: 38,
                flex: "1 1 180px",
                boxSizing: "border-box",
                transition: "border .15s"
              }}>
                <span style={{
                  position: "absolute",
                  top: -9,
                  left: 10,
                  background: "#ffffff",
                  padding: "0 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: isPhoneFocused ? THEME.primary : "#4b5563"
                }}>
                  Phone No.
                </span>
                <input
                  type="text"
                  placeholder=""
                  value={activeSale.customerPhone}
                  onFocus={() => setIsPhoneFocused(true)}
                  onBlur={() => setIsPhoneFocused(false)}
                  onChange={(e) => updateActiveSale({ customerPhone: e.target.value })}
                  style={fieldInputStyle}
                />
              </div>
            </div>

            {/* Bottom row (CASH ONLY): Billing Address + Shipping Address */}
            {activeSale.paymentType === "cash" && (
              <div>
                <div style={{ display: "flex", gap: 16 }}>
                  {/* Billing Address */}
                  <div style={{
                    position: "relative",
                    background: "#ffffff",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    flex: "1 1 260px",
                    boxSizing: "border-box"
                  }}>
                    <span style={{
                      position: "absolute",
                      top: -8,
                      left: 8,
                      background: "#ffffff",
                      padding: "0 4px",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#6b7280"
                    }}>
                      Billing Address
                    </span>
                    <textarea
                      placeholder=""
                      value={activeSale.billingAddress}
                      onChange={e => updateActiveSale({ billingAddress: e.target.value })}
                      style={{
                        width: "100%", height: 50, border: "none", background: "transparent",
                        fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                        color: THEME.textMain, resize: "none"
                      }}
                    />
                  </div>

                  {/* Shipping Address */}
                  <div style={{
                    position: "relative",
                    background: "#ffffff",
                    border: `1px solid ${THEME.border}`,
                    borderRadius: 4,
                    padding: "8px 10px",
                    flex: "1 1 180px",
                    boxSizing: "border-box"
                  }}>
                    <span style={{
                      position: "absolute",
                      top: -8,
                      left: 8,
                      background: "#ffffff",
                      padding: "0 4px",
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#6b7280"
                    }}>
                      Shipping Address
                    </span>
                    <textarea
                      placeholder=""
                      value={activeSale.shippingAddress}
                      onChange={e => updateActiveSale({ shippingAddress: e.target.value })}
                      style={{
                        width: "100%", height: 50, border: "none", background: "transparent",
                        fontSize: 12.5, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                        color: THEME.textMain, resize: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Remove & Change links (matching media_1787726203749.png) */}
                {activeSale.customerId && (
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
                    <span
                      onClick={() => updateActiveSale({ customerId: null, customerName: "", customerPhone: "", billingAddress: "", shippingAddress: "", customerPendingBalance: 0 })}
                      style={{ fontSize: 11, color: "#6b7280", cursor: "pointer", fontWeight: 500 }}
                    >
                      Remove
                    </span>
                    <span
                      onClick={() => {
                        setShowCustomerDropdown(true);
                        if (customerSuggestions.length === 0) loadInitialCustomers();
                      }}
                      style={{ fontSize: 11, color: THEME.primary, cursor: "pointer", fontWeight: 600 }}
                    >
                      Change
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Invoice Details (Invoice Number, Invoice Date, State of supply) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 280 }}>
            {/* Invoice Number */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
              <span style={{ fontSize: 12.5, color: THEME.textMuted, fontWeight: 500 }}>Invoice Number</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ background: "#e0f2fe", borderRadius: 4, padding: "3px 6px", display: "flex", alignItems: "center", gap: 4 }}>
                  <select
                    value={activeSale.invoicePrefix}
                    onChange={e => updateActiveSale({ invoicePrefix: e.target.value })}
                    style={{ border: "none", background: "transparent", fontSize: 12, fontWeight: 700, color: "#0369a1", outline: "none", cursor: "pointer" }}
                  >
                    <option value="ss">ss</option>
                    <option value="INV-">INV-</option>
                    <option value="BILL-">BILL-</option>
                  </select>
                  <ChevronDown size={11} color="#0369a1" />
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: THEME.textMain }}>{activeSale.invoiceNumber}</span>
              </div>
            </div>

            {/* Invoice Date */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
              <span style={{ fontSize: 12.5, color: THEME.textMuted, fontWeight: 500 }}>Invoice Date</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="date"
                  value={activeSale.invoiceDate}
                  onChange={e => updateActiveSale({ invoiceDate: e.target.value })}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, fontWeight: 600, color: THEME.textMain }}
                />
                <Calendar size={14} color={THEME.primary} />
              </div>
            </div>

            {/* State of supply */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
              <span style={{ fontSize: 12.5, color: THEME.textMuted, fontWeight: 500 }}>State of supply</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <select
                  value={activeSale.stateOfSupply}
                  onChange={e => updateActiveSale({ stateOfSupply: e.target.value })}
                  style={{
                    border: "none", outline: "none", background: "transparent",
                    fontSize: 13, fontWeight: 500, color: THEME.textMain, cursor: "pointer", textAlign: "right"
                  }}
                >
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                <ChevronDown size={12} color={THEME.textMuted} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 4. ITEMS TABLE (QUANTITY INITIALLY EMPTY -> SETS TO 1 UPON PRODUCT SELECTION) ── */}
      <div style={{
        margin: "0 24px 18px 24px",
        background: "#ffffff",
        border: `1px solid ${THEME.borderLight}`,
        borderRadius: 0,
        overflow: "visible"
      }}>
        <div style={{ overflowX: "auto", overflowY: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#ffffff", color: "#374151", height: 46 }}>
                {/* 1. Barcode scan badge */}
                <th style={{ width: 58, padding: "8px 6px", textAlign: "center", borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}` }}>
                  <div style={{
                    width: 34, height: 28, borderRadius: 4, background: "#e6f9ed", border: "1px solid #bbf7d0",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "auto"
                  }}>
                    <ScanBarcode size={16} color="#059669" />
                  </div>
                </th>

                {/* 2. ITEM */}
                <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  ITEM
                </th>

                {/* 3. QTY */}
                <th style={{ width: 68, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  QTY
                </th>

                {/* 4. UNIT */}
                <th style={{ width: 92, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  UNIT
                </th>

                {/* 6. PRICE/UNIT */}
                <th style={{ width: 140, padding: "6px 8px", textAlign: "center", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  <div>PRICE/UNIT</div>
                  <div style={{ fontSize: 10.5, color: "#6b7280", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 2, marginTop: 2 }}>
                    <span>Without Tax</span> <ChevronDown size={11} />
                  </div>
                </th>

                {/* 7. DISCOUNT */}
                <th style={{ width: 140, padding: 0, textAlign: "center", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  <div style={{ padding: "5px 6px", borderBottom: `1px solid ${THEME.borderLight}` }}>DISCOUNT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontSize: 10.5, color: "#6b7280", fontWeight: 500 }}>
                    <div style={{ padding: "3px 2px", borderRight: `1px solid ${THEME.borderLight}` }}>%</div>
                    <div style={{ padding: "3px 2px" }}>AMOUNT</div>
                  </div>
                </th>

                {/* 8. TAX */}
                <th style={{ width: 145, padding: 0, textAlign: "center", fontWeight: 700, borderRight: `1px solid ${THEME.borderLight}`, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  <div style={{ padding: "5px 6px", borderBottom: `1px solid ${THEME.borderLight}` }}>TAX</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontSize: 10.5, color: "#6b7280", fontWeight: 500 }}>
                    <div style={{ padding: "3px 2px", borderRight: `1px solid ${THEME.borderLight}` }}>%</div>
                    <div style={{ padding: "3px 2px" }}>AMOUNT</div>
                  </div>
                </th>

                {/* 9. AMOUNT */}
                <th style={{ width: 110, padding: "8px 12px", textAlign: "right", fontWeight: 700, borderBottom: `1px solid ${THEME.borderLight}`, color: "#374151" }}>
                  AMOUNT
                </th>
              </tr>
            </thead>

            <tbody>
              {activeSale.rows.map((row, idx) => {
                const isLightning = row.isLightning || idx === 0;
                const rowBg = isLightning ? "#eaf4fe" : "#ffffff";

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: `1px solid ${THEME.borderLight}`,
                      background: rowBg,
                      height: 44,
                    }}
                  >
                    {/* Column 1: Row Indicator + Reorder & Delete icons */}
                    <td style={{ textAlign: "center", padding: "6px 6px", borderRight: `1px solid ${THEME.borderLight}` }}>
                      {isLightning ? (
                        <Zap size={16} color={THEME.primary} fill={THEME.primary} style={{ margin: "auto" }} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <span style={{ color: "#9ca3af", display: "flex", cursor: "grab" }} title="Drag / Reorder">
                            <ChevronsUpDown size={12} />
                          </span>
                          <span style={{ color: "#4b5563", fontWeight: 600, fontSize: 12 }}>{idx}</span>
                          <button
                            onClick={() => setRowToDelete(row.id)}
                            title="Delete this row"
                            style={{
                              border: "none", background: "transparent", color: "#6b7280",
                              cursor: "pointer", display: "flex", padding: 2, borderRadius: 4
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = THEME.danger}
                            onMouseLeave={e => e.currentTarget.style.color = "#6b7280"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Column 2: ITEM name input */}
                    <td style={{ padding: "6px 10px", position: "relative", borderRight: `1px solid ${THEME.borderLight}` }}>
                      <input
                        type="text"
                        placeholder={isLightning && !row.item_name ? "" : "Enter item name..."}
                        value={row.item_name}
                        onChange={(e) => {
                          updateRowField(row.id, "item_name", e.target.value);
                          setItemSearchQuery(e.target.value);
                          setActiveRowSuggestId(row.id);
                        }}
                        onFocus={() => { setItemSearchQuery(row.item_name); setActiveRowSuggestId(row.id); }}
                        style={{ ...fieldInputStyle, fontSize: 13, fontWeight: 500 }}
                      />
                      
                      {/* Product Suggestions Dropdown with NO INTERNAL SCROLLBAR */}
                      {activeRowSuggestId === row.id && (
                        <div ref={itemSuggestRef} style={{
                          position: "absolute", top: "100%", left: 0, width: 310,
                          background: "#ffffff", borderRadius: 6, border: `1px solid ${THEME.borderLight}`,
                          boxShadow: "0 10px 24px rgba(0,0,0,0.12)", zIndex: 9999,
                          marginTop: 2, overflow: "visible", maxHeight: "none"
                        }}>
                          {filteredProducts.map(p => (
                            <div key={p.id} onClick={() => handleSelectProduct(row.id, p)} style={{
                              padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${THEME.borderLight}`,
                              fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center"
                            }}
                              onMouseEnter={e => e.currentTarget.style.background = THEME.primarySoft}
                              onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}>
                              <div>
                                <div style={{ fontWeight: 700, color: THEME.textMain }}>{p.product_name || p.name}</div>
                                <div style={{ fontSize: 11, color: THEME.textMuted }}>Stock: {p.stock} {p.unit || ""}</div>
                              </div>
                              <div style={{ fontWeight: 700, color: THEME.primary }}>₹{parseFloat(p.price || 0).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Column 3: QTY (Initially EMPTY, becomes 1 upon product selection, fully editable) */}
                    <td style={{ padding: "6px 6px", borderRight: `1px solid ${THEME.borderLight}` }}>
                      <input
                        type="number"
                        min="1"
                        placeholder=""
                        value={row.qty}
                        onChange={e => updateRowField(row.id, "qty", e.target.value)}
                        style={{ ...fieldInputStyle, textAlign: "center", fontSize: 13, fontWeight: 600 }}
                      />
                    </td>

                    {/* Column 4: UNIT */}
                    <td style={{ padding: "6px 6px", borderRight: `1px solid ${THEME.borderLight}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        <select
                          value={row.unit}
                          onChange={e => updateRowField(row.id, "unit", e.target.value)}
                          style={{ ...fieldInputStyle, fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer", textAlign: "center" }}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <ChevronDown size={11} color="#6b7280" />
                      </div>
                    </td>

                    {/* Column 6: PRICE/UNIT */}
                    <td style={{ padding: "6px 6px", borderRight: `1px solid ${THEME.borderLight}` }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder=""
                        value={row.price || ""}
                        onChange={e => updateRowField(row.id, "price", e.target.value)}
                        style={{ ...fieldInputStyle, textAlign: "center", fontSize: 13, fontWeight: 600 }}
                      />
                    </td>

                    {/* Column 7: DISCOUNT (% & AMOUNT) */}
                    <td style={{ padding: 0, borderRight: `1px solid ${THEME.borderLight}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                        <div style={{ borderRight: `1px solid ${THEME.borderLight}`, padding: "6px 2px" }}>
                          <input
                            type="number"
                            placeholder=""
                            min="0"
                            max="100"
                            value={row.discount_percent || ""}
                            onChange={e => {
                              updateRowField(row.id, "discount_percent", e.target.value);
                              updateRowField(row.id, "discount_amount", "");
                            }}
                            style={{ ...fieldInputStyle, textAlign: "center", fontSize: 12.5 }}
                          />
                        </div>
                        <div style={{ padding: "6px 2px" }}>
                          <input
                            type="number"
                            placeholder=""
                            min="0"
                            value={row.discount_amount || ""}
                            onChange={e => {
                              updateRowField(row.id, "discount_amount", e.target.value);
                              updateRowField(row.id, "discount_percent", "");
                            }}
                            style={{ ...fieldInputStyle, textAlign: "center", fontSize: 12.5 }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Column 8: TAX (% & AMOUNT) */}
                    <td style={{ padding: 0, borderRight: `1px solid ${THEME.borderLight}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                        <div style={{ borderRight: `1px solid ${THEME.borderLight}`, padding: "6px 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <select
                            value={row.tax_percent}
                            onChange={e => updateRowField(row.id, "tax_percent", e.target.value)}
                            style={{ ...fieldInputStyle, fontSize: 11.5, color: "#374151", cursor: "pointer", fontWeight: 500, textAlign: "center" }}
                          >
                            {TAX_RATES.map((tr, i) => (
                              <option key={i} value={tr.value}>{tr.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={11} color="#6b7280" />
                        </div>
                        <div style={{ padding: "6px 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                            {row.tax_amount ? `₹${row.tax_amount.toFixed(1)}` : ""}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 9: AMOUNT */}
                    <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: "#111827", fontSize: 13 }}>
                      {row.amount ? `₹${row.amount.toFixed(2)}` : "₹0.00"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer: Total row matching screenshot */}
            <tfoot>
              <tr style={{ background: "#ffffff", borderTop: `1px solid ${THEME.borderLight}`, height: 46 }}>
                <td style={{ padding: "6px 12px", borderRight: `1px solid ${THEME.borderLight}` }}></td>
                <td style={{ padding: "6px 14px", borderRight: `1px solid ${THEME.borderLight}` }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button
                      onClick={addRow}
                      style={{
                        padding: "6px 16px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.primary}`,
                        background: "#ffffff",
                        color: THEME.primary,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "all .15s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = THEME.primarySoft}
                      onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                    >
                      ADD ROW
                    </button>
                    <span style={{ fontWeight: 700, fontSize: 12, color: "#374151", textTransform: "uppercase" }}>
                      TOTAL
                    </span>
                  </div>
                </td>
                <td style={{ textAlign: "center", fontWeight: 700, fontSize: 13, color: "#111827", borderRight: `1px solid ${THEME.borderLight}` }}>
                  {totals.totalQty || 0}
                </td>
                <td style={{ borderRight: `1px solid ${THEME.borderLight}` }}></td>
                <td style={{ borderRight: `1px solid ${THEME.borderLight}` }}></td>
                <td style={{ textAlign: "center", fontWeight: 600, fontSize: 12.5, color: "#4b5563", borderRight: `1px solid ${THEME.borderLight}` }}>
                  {totals.totalDiscountAmount || 0}
                </td>
                <td style={{ textAlign: "center", fontWeight: 600, fontSize: 12.5, color: "#4b5563", borderRight: `1px solid ${THEME.borderLight}` }}>
                  {totals.totalTaxAmount || 0}
                </td>
                <td style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, color: "#111827", padding: "6px 12px" }}>
                  ₹{totals.subtotalAmount ? totals.subtotalAmount.toFixed(2) : "0.00"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── 5. BOTTOM SECTION: TOTALS ONLY (MATCHING 1ST & 2ND IMAGES, 3RD IMAGE REMOVED) ── */}
      <div style={{
        margin: "16px 24px 100px 24px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "flex-start",
      }}>
        {/* Right: Totals summary matching 1st Image (Cash) & 2nd Image (Credit) */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: 420,
          maxWidth: "100%",
        }}>
          {/* 1. Discount */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#4b5563" }}>Discount</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="number"
                placeholder="(%)"
                value={activeSale.overallDiscountPercent || ""}
                onChange={e => updateActiveSale({ overallDiscountPercent: e.target.value, overallDiscountAmount: "" })}
                style={{
                  width: 65, height: 32, padding: "4px 6px", borderRadius: 5,
                  border: "1px solid #d1d5db", background: "#ffffff", fontSize: 12.5, textAlign: "center", outline: "none"
                }}
              />
              <span style={{ color: "#9ca3af" }}>-</span>
              <input
                type="number"
                placeholder="(₹)"
                value={activeSale.overallDiscountAmount || ""}
                onChange={e => updateActiveSale({ overallDiscountAmount: e.target.value, overallDiscountPercent: "" })}
                style={{
                  width: 80, height: 32, padding: "4px 8px", borderRadius: 5,
                  border: "1px solid #d1d5db", background: "#ffffff", fontSize: 12.5, textAlign: "right", outline: "none"
                }}
              />
            </div>
          </div>

          {/* 2. Tax */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "#4b5563" }}>Tax</span>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                value={activeSale.overallTaxRate}
                onChange={e => updateActiveSale({ overallTaxRate: e.target.value })}
                style={{
                  width: 120, height: 32, padding: "4px 8px", borderRadius: 5,
                  border: "1px solid #d1d5db", background: "#ffffff", fontSize: 12,
                  color: "#6b7280", fontWeight: 600, cursor: "pointer", outline: "none"
                }}
              >
                {TAX_RATES.map((tr, i) => <option key={i} value={tr.value}>{tr.label}</option>)}
              </select>
              <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 28, textAlign: "right", color: "#111827" }}>
                {totals.totalTaxAmount ? totals.totalTaxAmount.toFixed(0) : "0"}
              </span>
            </div>
          </div>

          {/* 3. Round Off & Total Row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            {/* Left: Round Off Checkbox + Diff Box */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="roundOffCheckbox"
                checked={activeSale.roundOffEnabled}
                onChange={e => updateActiveSale({ roundOffEnabled: e.target.checked })}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" }}
              />
              <label htmlFor="roundOffCheckbox" style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 500, cursor: "pointer" }}>
                Round Off
              </label>
              <input
                type="text"
                readOnly
                value={totals.roundDifference ? (totals.roundDifference > 0 ? `+${totals.roundDifference.toFixed(2)}` : totals.roundDifference.toFixed(2)) : ""}
                style={{
                  width: 52, height: 30, padding: "2px 4px", borderRadius: 4,
                  border: "1px solid #d1d5db", background: "#ffffff", fontSize: 12, textAlign: "center", color: "#6b7280"
                }}
              />
            </div>

            {/* Right: Total */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#374151" }}>Total</span>
              <div style={{
                width: 155, height: 36, padding: "6px 12px", borderRadius: 6,
                border: "1px solid #d1d5db", background: "#f3f4f6", fontSize: 15,
                fontWeight: 700, color: "#111827", textAlign: "right", boxSizing: "border-box",
                display: "flex", alignItems: "center", justifyContent: "flex-end"
              }}>
                {totals.roundedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* 4. CREDIT ONLY: Received & Balance (2nd Image) */}
          {activeSale.paymentType === "credit" && (
            <>
              {/* Received Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    id="receivedCheckbox"
                    checked={activeSale.receivedEnabled !== false}
                    onChange={e => {
                      const checked = e.target.checked;
                      updateActiveSale({
                        receivedEnabled: checked,
                        receivedAmount: checked ? (activeSale.receivedAmount || totals.roundedGrandTotal) : "0"
                      });
                    }}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#2563eb" }}
                  />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: "#374151" }}>Received</span>
                </label>

                <input
                  type="number"
                  disabled={activeSale.receivedEnabled === false}
                  value={activeSale.receivedAmount !== undefined && activeSale.receivedAmount !== "" ? activeSale.receivedAmount : totals.roundedGrandTotal}
                  onChange={e => updateActiveSale({ receivedAmount: e.target.value })}
                  style={{
                    width: 155, height: 36, padding: "6px 12px", borderRadius: 6,
                    border: "1px solid #d1d5db", background: activeSale.receivedEnabled === false ? "#f3f4f6" : "#ffffff",
                    fontSize: 15, fontWeight: 700, color: "#111827", textAlign: "right", boxSizing: "border-box", outline: "none"
                  }}
                />
              </div>

              {/* Balance Row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#1f2937" }}>Balance</span>
                <div style={{
                  width: 155, padding: "4px 12px", fontSize: 15, fontWeight: 800,
                  color: "#111827", textAlign: "right"
                }}>
                  {Math.max(0, totals.roundedGrandTotal - (activeSale.receivedEnabled !== false ? (parseFloat(activeSale.receivedAmount !== undefined && activeSale.receivedAmount !== "" ? activeSale.receivedAmount : totals.roundedGrandTotal) || 0) : 0)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── 6. STICKY BOTTOM ACTION BAR (MATCHING 4TH IMAGE) ── */}
      <footer style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#ffffff", borderTop: "1px solid #e5e7eb",
        padding: "10px 24px", display: "flex", justifyContent: "flex-end",
        alignItems: "center", gap: 14, zIndex: 1000,
        boxShadow: "0 -2px 10px rgba(0,0,0,0.03)"
      }}>
        {/* Left: Trend Graph Button */}
        <button
          type="button"
          title="Sales Margin Analytics"
          style={{
            width: 36, height: 36, borderRadius: 6,
            background: "#eff6ff", border: "none", color: "#2563eb",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all .15s"
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
          onMouseLeave={e => e.currentTarget.style.background = "#eff6ff"}
        >
          <TrendingUp size={18} strokeWidth={2.2} />
        </button>

        {/* Center: Generate e-Invoice Split Button */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            style={{
              padding: "7px 16px", borderRadius: "6px 0 0 6px",
              border: "1px solid #60a5fa", borderRight: "none",
              background: "#ffffff", color: "#2563eb", fontWeight: 600,
              fontSize: 13, cursor: "pointer", transition: "all .15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
            onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
          >
            <span>Generate e-<u>I</u>nvoice</span>
          </button>
          <button
            type="button"
            style={{
              padding: "7px 9px", borderRadius: "0 6px 6px 0",
              border: "1px solid #60a5fa",
              background: "#ffffff", color: "#2563eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all .15s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#f0f9ff"}
            onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
          >
            <ChevronDown size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right: Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "7px 28px", borderRadius: 6, border: "none",
            background: saving ? "#93c5fd" : "#1f8cff",
            color: "#ffffff", fontWeight: 700, fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 2px 4px rgba(31, 140, 255, 0.2)",
            transition: "all .15s"
          }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#1d4ed8"; }}
          onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#1f8cff"; }}
        >
          {saving ? (
            <span>{isEditMode ? "Updating..." : "Saving..."}</span>
          ) : isEditMode ? (
            <span>Update Sale</span>
          ) : (
            <span><u>S</u>ave</span>
          )}
        </button>
      </footer>

      {/* Delete Confirmation Modal */}
      {rowToDelete && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 99999,
          background: "rgba(15, 23, 42, 0.45)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setRowToDelete(null)}>
          <div style={{
            background: "#ffffff", borderRadius: 8, width: 350, maxWidth: "90vw",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)", overflow: "hidden",
            border: `1px solid ${THEME.borderLight}`
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: "16px 20px 8px 20px", fontSize: 15, fontWeight: 800, color: THEME.textMain }}>
              Delete this item?
            </div>
            <div style={{ padding: "0 20px 16px 20px", fontSize: 13, color: THEME.textMuted }}>
              This row will be removed from the sale.
            </div>
            <div style={{ padding: "10px 18px 14px", display: "flex", justifyContent: "flex-end", gap: 10, background: "#f8fafc", borderTop: `1px solid ${THEME.borderLight}` }}>
              <button onClick={() => setRowToDelete(null)} style={{
                padding: "6px 14px", borderRadius: 6, border: `1px solid ${THEME.border}`,
                background: "#ffffff", color: THEME.textMain, fontWeight: 700, fontSize: 12.5, cursor: "pointer"
              }}>Cancel</button>
              <button onClick={confirmDeleteRow} style={{
                padding: "6px 16px", borderRadius: 6, border: "none",
                background: THEME.danger, color: "#ffffff", fontWeight: 800, fontSize: 12.5, cursor: "pointer"
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Close Sale Confirmation Modal */}
      <CloseSaleModal
        isOpen={showCloseConfirm}
        onCancel={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          navigate("/sales/invoices");
        }}
      />

      {/* Calculator Modal */}
      <CalculatorModal isOpen={showCalculator} onClose={() => setShowCalculator(false)} />
    </div>
  );
}