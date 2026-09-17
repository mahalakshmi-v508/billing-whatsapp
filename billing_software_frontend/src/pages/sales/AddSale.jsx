import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  X, Plus, Calculator, Settings, Calendar, ChevronDown, Check,
  Trash2, AlignLeft, Image, Paperclip, BarChart2,
  Printer, MessageSquare, AlertCircle, Phone, ScanBarcode, Zap, ChevronsUpDown, TrendingUp, ShieldAlert,
  Search, RotateCcw, GripVertical, Package, Layers, Scale, IndianRupee, Tag, ReceiptText, Wallet, FileText, CheckCircle2,
  Building2, UserCheck, CreditCard, ArrowLeft, RefreshCw, Save
} from "lucide-react";
import HeaderSettingsButton from "../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../components/CommonTableColumnSettings";
import useTableColumns from "../../hooks/useTableColumns";

/* ── Item Table Columns List for customization drawer with rich icons & colors ─ */
const DEFAULT_ITEM_COLUMNS = [
  { key: "item_name", label: "Item Name", icon: Package, color: "text-blue-600", bg: "bg-blue-50", desc: "Product & description" },
  { key: "qty", label: "Quantity", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Item quantity count" },
  { key: "unit", label: "Unit", icon: Scale, color: "text-purple-600", bg: "bg-purple-50", desc: "Unit of measurement (PCS, KG, BOX)" },
  { key: "price", label: "Price / Unit", icon: IndianRupee, color: "text-teal-600", bg: "bg-teal-50", desc: "Unit price / rate" },
  { key: "discount", label: "Discount", icon: Tag, color: "text-amber-600", bg: "bg-amber-50", desc: "Percentage (%) & discount amount" },
  { key: "tax", label: "Tax (GST)", icon: ReceiptText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "GST rate (%) & tax amount" },
  { key: "amount", label: "Amount", icon: Wallet, color: "text-rose-600", bg: "bg-rose-50", desc: "Total calculated line amount" },
];

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
function createInitialRow() {
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
  };
}

/* ── Factory to create a brand new independent Sale tab state ────────────── */
function createNewSaleTab(id, index, defaultInvNo = "") {
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
    invoicePrefix: "INV-",
    invoiceNumber: defaultInvNo || "INV-0001",
    formattedInvoiceNo: defaultInvNo || "INV-0001",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    stateOfSupply: "Select",
    rows: [
      createInitialRow(),
      createInitialRow(),
      createInitialRow(),
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
    roundOffEnabled: false,
    receivedEnabled: true,
    receivedAmount: "",
  };
}

/* ── Close Sale Confirmation Dialog Component ───────────────────────────── */
function CloseSaleModal({ isOpen, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900">Close Sale Workspace</h3>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current unsaved invoice changes will be discarded. Do you wish to continue and return to the invoices list?
        </div>
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition cursor-pointer">
            OK, Discard
          </button>
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={onClose}>
      <div className="bg-white rounded-2xl w-72 shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center">
          <span className="font-bold text-xs">Calculator</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-4 bg-slate-50 text-right text-2xl font-black text-slate-900 min-h-[56px] border-b border-slate-200">
          {calcInput}
        </div>
        <div className="grid grid-cols-4 gap-2 p-3 bg-white">
          {["C", "÷", "×", "-"].map(btn => (
            <button key={btn} onClick={() => btn === "C" ? handleClear() : handleOp(btn)}
              className="py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs text-blue-600 hover:bg-slate-100 transition cursor-pointer">
              {btn}
            </button>
          ))}
          {[7, 8, 9, "+"].map(btn => (
            <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleOp(btn)}
              className={`py-2.5 rounded-xl border transition cursor-pointer font-bold text-xs ${typeof btn === "number" ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50" : "border-slate-200 bg-slate-50 text-blue-600"}`}>
              {btn}
            </button>
          ))}
          {[4, 5, 6, "="].map(btn => (
            <button key={btn} onClick={() => typeof btn === "number" ? handleNum(btn) : handleEquals()}
              className={`py-2.5 rounded-xl border transition cursor-pointer font-bold text-xs ${btn === "=" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"}`}>
              {btn}
            </button>
          ))}
          {[1, 2, 3, 0].map(btn => (
            <button key={btn} onClick={() => handleNum(btn)}
              className="py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-800 hover:bg-slate-50 transition cursor-pointer">
              {btn}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT: ADD SALE (BILLING & POS COMMERCIAL WORKSPACE)
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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [unlistedProductsWarning, setUnlistedProductsWarning] = useState(null);
  const [quickAddModal, setQuickAddModal] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (msg, ok = false) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, ok });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  /* ── Table Column Customization Drawer state & persistence ── */
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
  } = useTableColumns("add_sale_item_columns", DEFAULT_ITEM_COLUMNS);

  const customerBoxRef = useRef(null);
  const itemSuggestRef = useRef(null);

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
    const compId = selectedCompany || user?.company_id || (companies[0] ? companies[0].id : "");
    if (!compId) return;
    const loadProducts = async () => {
      try {
        const res = await api.get(`/product/get?company_id=${compId}`);
        if (res.data.status) {
          setProducts(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProducts();
  }, [selectedCompany, user?.company_id, companies]);

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
            : [createInitialRow()];

          const loadedSale = {
            id: 1,
            tabIndex: 1,
            label: `Edit Sale #${inv.invoice_no}`,
            paymentType: inv.payment_type || (String(inv.payment_method).toLowerCase() === "credit" ? "credit" : "cash"),
            invoiceNumber: inv.invoice_no,
            invoiceDate: inv.created_at ? inv.created_at.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0],
            stateOfSupply: inv.state_of_supply || "Tamil Nadu",
            dueDate: inv.due_date ? inv.due_date.split("T")[0].split(" ")[0] : (inv.created_at ? inv.created_at.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0]),
            customerName: inv.customer_name || "",
            customerPhone: inv.customer_phone || "",
            customerId: inv.customer_id || null,
            billingAddress: inv.billing_address || "",
            shippingAddress: inv.shipping_address || "",
            rows: mappedRows,
            overallDiscountPercent: "",
            overallDiscountAmount: "",
            overallTaxRate: 0,
            roundOffEnabled: false,
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

  /* ── Load Next Invoice Number Preview from Dedicated Invoice Settings ── */
  useEffect(() => {
    if (isEditMode) return;
    const companyId = parseInt(selectedCompany) || parseInt(user?.company_id) || (companies[0] ? parseInt(companies[0].id) : 1);
    if (!companyId) return;

    api.get(`/invoice-settings/next-number?company_id=${companyId}`)
      .then((res) => {
        if (res.data && res.data.status && res.data.invoice_no) {
          const nextInvNo = res.data.invoice_no;
          setSales((prev) =>
            prev.map((tab) => ({
              ...tab,
              invoiceNumber: nextInvNo,
              formattedInvoiceNo: nextInvNo,
            }))
          );
        }
      })
      .catch((err) => console.error("Error fetching next invoice number:", err));
  }, [selectedCompany, isEditMode, companies, user?.company_id]);

  /* ── Tab Management: Add / Close ── */
  const handleAddNewTab = () => {
    const nextNum = tabCounter + 1;
    const newId = Date.now();
    const currentInvNo = activeSale?.formattedInvoiceNo || "INV-0001";
    const newTab = createNewSaleTab(newId, nextNum, currentInvNo);
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
    const cDays = c.credit_days !== undefined && c.credit_days !== null && c.credit_days !== "" ? Number(c.credit_days) : 30;
    const baseDate = new Date(activeSale.invoiceDate || Date.now());
    baseDate.setDate(baseDate.getDate() + cDays);
    const calcDueDate = baseDate.toISOString().split("T")[0];

    updateActiveSale({
      customerId: c.id,
      customerName: c.name || c.customer_name,
      customerPhone: c.phone || c.customer_phone || "",
      billingAddress: c.address || c.billing_address || "",
      shippingAddress: c.shipping_address || c.address || "",
      customerPendingBalance: parseFloat(c.pending_amount) || 0,
      customerCreditLimit: parseFloat(c.credit_limit) || 0,
      creditDays: cDays,
      dueDate: calcDueDate,
      stateOfSupply: c.state || activeSale.stateOfSupply,
    });
    setShowCustomerDropdown(false);
  };

  /* ── Row Calculation (Initial amount = 0 when quantity/price empty) ── */
  const recalculateRow = (row) => {
    const q = parseFloat(row.qty);
    const p = parseFloat(row.price);

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
          qty: currentQty,
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
      rows: [...sale.rows, createInitialRow()]
    }));
  };

  const deleteRow = (rowId) => {
    updateActiveSale(sale => {
      if (sale.rows.length === 1) {
        return { ...sale, rows: [createInitialRow()] };
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

  /* ── Calculations for Bottom Summary ── */
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
    const roundedGrandTotal = rawGrandTotal;
    const roundDifference = 0;

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
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Save Invoice (With Unlisted Products Detection) ── */
  const handleSave = async (bypassUnlistedCheck = false) => {
    if (!activeSale) return;

    if (activeSale.paymentType === "credit" && (!activeSale.customerName || !activeSale.customerName.trim())) {
      showToast("Party name doesn't exist, please create a new party.", false);
      return;
    }

    const validItems = activeSale.rows.filter(r => r.item_name && r.item_name.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one item to the sale.", false);
      return;
    }

    const isBypass = bypassUnlistedCheck === true;
    if (!isBypass) {
      const unlistedItems = validItems.filter(r => {
        const pid = parseInt(r.product_id) || 0;
        if (pid > 0) {
          const found = products.some(p => parseInt(p.id) === pid);
          if (found) return false;
        }
        const rowName = (r.item_name || "").trim().toLowerCase();
        if (!rowName) return false;
        const foundByName = products.some(p => (p.product_name || p.name || "").trim().toLowerCase() === rowName);
        return !foundByName;
      });

      if (unlistedItems.length > 0) {
        setUnlistedProductsWarning(unlistedItems);
        return;
      }
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
      due_date: activeSale.paymentType === "credit" ? (activeSale.dueDate || activeSale.invoiceDate) : null,
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
        const savedInvNo = res.data.invoice_no || invoiceNo || "Invoice";
        if (isEditMode) {
          showToast(`Invoice #${savedInvNo} updated successfully!`, true);
          setTimeout(() => navigate("/sales/invoices"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            showToast(`Invoice #${savedInvNo} generated successfully!`, true);

            const companyId = parseInt(selectedCompany) || parseInt(user?.company_id) || (companies[0] ? parseInt(companies[0].id) : 1);
            let nextInvNo = "";
            try {
              const nextRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}`);
              if (nextRes.data && nextRes.data.status && nextRes.data.invoice_no) {
                nextInvNo = nextRes.data.invoice_no;
              }
            } catch (e) {
              console.error("Error fetching next invoice no:", e);
            }

            setSales(prev => prev.map(s => {
              if (s.id === activeTabId) {
                return createNewSaleTab(s.id, 1, nextInvNo);
              }
              return s;
            }));
          } else {
            navigate(`/invoice/${savedInvNo}`);
          }
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

  /* ── Quick Add Product Flow for Unlisted Items ── */
  const handleProceedFromWarning = () => {
    const items = unlistedProductsWarning || [];
    setUnlistedProductsWarning(null);
    if (items.length > 0) {
      const first = items[0];
      setQuickAddModal({
        queue: items,
        currentIndex: 0,
        form: {
          product_name: first.item_name || "",
          purchase_price: "",
          sale_price: first.price !== "" && first.price !== undefined ? String(first.price) : "",
          purchase_gst: "",
          sale_gst: (first.tax_percent !== undefined && first.tax_percent !== null && first.tax_percent !== "") ? String(first.tax_percent) : "0",
          unit: (first.unit && first.unit !== "NONE") ? first.unit : "PCS",
          stock: (first.qty !== "" && first.qty !== undefined && !isNaN(first.qty)) ? String(first.qty) : "0",
        },
        saving: false,
        error: "",
      });
    } else {
      handleSave(true);
    }
  };

  const setQuickAddForm = (field, val) => {
    setQuickAddModal(prev => {
      if (!prev) return null;
      return {
        ...prev,
        error: "",
        form: { ...prev.form, [field]: val }
      };
    });
  };

  const handleSaveQuickAddProduct = async () => {
    if (!quickAddModal) return;
    const { form, queue, currentIndex } = quickAddModal;

    if (!form.product_name || !form.product_name.trim()) {
      setQuickAddModal(prev => ({ ...prev, error: "Product name is required." }));
      return;
    }

    if (form.sale_price === "" || isNaN(Number(form.sale_price)) || Number(form.sale_price) < 0) {
      setQuickAddModal(prev => ({ ...prev, error: "Valid sale price is required." }));
      return;
    }

    setQuickAddModal(prev => ({ ...prev, saving: true, error: "" }));

    try {
      const companyId = parseInt(selectedCompany) || parseInt(user?.company_id) || (companies[0] ? parseInt(companies[0].id) : 0);

      const payload = {
        product_name: form.product_name.trim(),
        company_id: companyId,
        price: parseFloat(form.sale_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        purchase_price: form.purchase_price !== "" ? (parseFloat(form.purchase_price) || 0) : 0,
        gst_percentage: form.sale_gst !== "" ? (parseFloat(form.sale_gst) || 0) : 0,
        purchase_gst: form.purchase_gst !== "" ? (parseFloat(form.purchase_gst) || 0) : 0,
        unit: form.unit || "PCS",
        stock: form.stock !== "" ? (parseInt(form.stock) || 0) : 0,
        status: "active"
      };

      const res = await api.post("/product/add", payload);
      if (res.data && res.data.status) {
        const newProduct = res.data.data || {
          id: Date.now(),
          product_name: payload.product_name,
          price: payload.price,
          sale_price: payload.sale_price,
          gst_percentage: payload.gst_percentage,
          unit: payload.unit,
          stock: payload.stock
        };

        setProducts(prev => [newProduct, ...prev]);

        const currentItem = queue[currentIndex];
        updateActiveSale(sale => {
          const updatedRows = sale.rows.map(r => {
            if (r.id === currentItem.id || (r.item_name && r.item_name.trim().toLowerCase() === currentItem.item_name.trim().toLowerCase())) {
              const updated = {
                ...r,
                product_id: newProduct.id,
                item_name: newProduct.product_name,
                price: parseFloat(newProduct.sale_price || newProduct.price) || 0,
                unit: (newProduct.unit && newProduct.unit !== "NONE") ? newProduct.unit : r.unit,
                tax_percent: parseFloat(newProduct.gst_percentage || 0),
                stock: newProduct.stock,
                product_code: newProduct.product_code || ""
              };
              return recalculateRow(updated);
            }
            return r;
          });
          return { ...sale, rows: updatedRows };
        });

        const nextIndex = currentIndex + 1;
        if (nextIndex < queue.length) {
          const nextItem = queue[nextIndex];
          setQuickAddModal({
            queue,
            currentIndex: nextIndex,
            form: {
              product_name: nextItem.item_name || "",
              purchase_price: "",
              sale_price: nextItem.price !== "" && nextItem.price !== undefined ? String(nextItem.price) : "",
              purchase_gst: "",
              sale_gst: (nextItem.tax_percent !== undefined && nextItem.tax_percent !== null && nextItem.tax_percent !== "") ? String(nextItem.tax_percent) : "0",
              unit: (nextItem.unit && nextItem.unit !== "NONE") ? nextItem.unit : "PCS",
              stock: (nextItem.qty !== "" && nextItem.qty !== undefined && !isNaN(nextItem.qty)) ? String(nextItem.qty) : "0"
            },
            saving: false,
            error: ""
          });
        } else {
          setQuickAddModal(null);
          showToast(`Product "${newProduct.product_name}" added to inventory!`, true);
          setTimeout(() => {
            handleSave(true);
          }, 150);
        }
      } else {
        setQuickAddModal(prev => ({
          ...prev,
          saving: false,
          error: res.data?.message || "Failed to add product"
        }));
      }
    } catch (err) {
      console.error("Error adding quick product:", err);
      setQuickAddModal(prev => ({
        ...prev,
        saving: false,
        error: err.response?.data?.message || "Server error while adding product."
      }));
    }
  };

  const filteredProducts = useMemo(() => {
    if (!itemSearchQuery) return products.slice(0, 8);
    const q = itemSearchQuery.toLowerCase();
    return products.filter(p =>
      (p.product_name && p.product_name.toLowerCase().includes(q)) ||
      (p.product_code && String(p.product_code).toLowerCase().includes(q))
    ).slice(0, 8);
  }, [products, itemSearchQuery]);

  if (!activeSale) return null;
  const isCredit = activeSale.paymentType === "credit";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col antialiased">
      
      {/* ── 1. EXECUTIVE BILLING WORKSPACE COMMAND BAR ── */}
      <header className="bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-2xs">
        
        {/* Left: Branding & Multi-Sale Tabs */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCloseConfirm(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Back to Invoices"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
              <ReceiptText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {isEditMode ? `Edit Invoice #${activeSale.formattedInvoiceNo}` : "New Sale Invoice"}
                </h1>
                
                {/* Credit / Cash Mode Pill Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateActiveSale({ paymentType: "cash" })}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase transition cursor-pointer ${
                      !isCredit ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cDays = Number(activeSale.creditDays) || 30;
                      const baseDate = new Date(activeSale.invoiceDate || Date.now());
                      baseDate.setDate(baseDate.getDate() + cDays);
                      updateActiveSale({ paymentType: "credit", dueDate: baseDate.toISOString().split("T")[0] });
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase transition cursor-pointer ${
                      isCredit ? "bg-blue-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Credit
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Issue tax invoice, manage party credits & dispatch sales</p>
            </div>
          </div>
        </div>

        {/* Center: Dynamic Multi-Tab Switcher */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {sales.map(s => {
              const isActive = s.id === activeTabId;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveTabId(s.id)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isActive ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>{s.label}</span>
                  {sales.length > 1 && (
                    <X
                      size={12}
                      className="text-slate-400 hover:text-rose-600"
                      onClick={(e) => handleCloseTab(e, s.id)}
                    />
                  )}
                </div>
              );
            })}

            {!isEditMode && (
              <button
                onClick={handleAddNewTab}
                className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-blue-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
                title="Add New Sale Tab"
              >
                <Plus size={13} strokeWidth={3} />
              </button>
            )}
          </div>

          {/* Quick Tools */}
          <HeaderSettingsButton
            variant="voucher"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
            title="Customise Table Columns"
          />

          <button
            onClick={() => setShowCalculator(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-2xs"
            title="Calculator"
          >
            <Calculator size={16} />
          </button>

          <button
            onClick={() => setShowCloseConfirm(true)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer shadow-2xs"
            title="Close Sale"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── 2. MAIN BILLING WORKSPACE BODY ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* Floating Toast Notification */}
        {toast && (
          <div className={`px-4 py-3 border text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
            toast.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-700"
          }`}>
            <div className="flex items-center gap-2">
              {toast.ok ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <ShieldAlert size={16} className="text-rose-600 shrink-0" />}
              <span>{toast.msg}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── SECTION 1: CUSTOMER & INVOICE METADATA CARD ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left 6 Columns: Customer Lookup & Contact */}
            <div className="lg:col-span-6 space-y-3.5" ref={customerBoxRef}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={15} className="text-blue-600" />
                  <span>Customer Information</span>
                </span>
                {activeSale.customerPendingBalance > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Outstanding Debt: ₹{activeSale.customerPendingBalance.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Customer Autocomplete Input */}
                <div className="sm:col-span-7 relative">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer / Business Name {isCredit && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={activeSale.customerName}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => {
                        setIsCustomerFocused(true);
                        setShowCustomerDropdown(true);
                        if (customerSuggestions.length === 0) loadInitialCustomers();
                      }}
                      onBlur={() => setIsCustomerFocused(false)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                      onClick={() => {
                        setShowCustomerDropdown(v => !v);
                        if (customerSuggestions.length === 0) loadInitialCustomers();
                      }}
                    />
                  </div>

                  {/* Autocomplete Dropdown */}
                  {showCustomerDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1 animate-in fade-in duration-100">
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                        <span onClick={() => navigate("/customers/add")} className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                          + Add New Customer
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Party Balance</span>
                      </div>
                      {customerSuggestions.length === 0 ? (
                        <div className="p-3 text-xs text-slate-400 text-center">No customers found</div>
                      ) : (
                        customerSuggestions.map((c) => {
                          const bal = parseFloat(c.pending_amount || 0);
                          return (
                            <div
                              key={c.id}
                              onClick={() => selectCustomer(c)}
                              className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{c.name || c.customer_name}</div>
                                <div className="text-[11px] text-slate-400">{c.phone || c.customer_phone || ""}</div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-slate-800">₹{bal.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Customer Phone */}
                <div className="sm:col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={activeSale.customerPhone}
                      onFocus={() => setIsPhoneFocused(true)}
                      onBlur={() => setIsPhoneFocused(false)}
                      onChange={(e) => updateActiveSale({ customerPhone: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                    />
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Cash Billing / Shipping Address (Collapsible in Cash Mode) */}
              {!isCredit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Billing Address</label>
                    <textarea
                      rows={1}
                      placeholder="Enter billing address..."
                      value={activeSale.billingAddress}
                      onChange={e => updateActiveSale({ billingAddress: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600 transition resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-bold text-slate-600 mb-1">Shipping Address</label>
                    <textarea
                      rows={1}
                      placeholder="Enter delivery address..."
                      value={activeSale.shippingAddress}
                      onChange={e => updateActiveSale({ shippingAddress: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-50/60 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600 transition resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right 6 Columns: Invoice Document Metadata */}
            <div className="lg:col-span-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Invoice Number */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice #</label>
                  <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-black text-blue-700 tracking-wider text-center shadow-2xs">
                    {activeSale.formattedInvoiceNo || activeSale.invoiceNumber || "INV-0001"}
                  </div>
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={activeSale.invoiceDate}
                    onChange={e => {
                      const newInvDate = e.target.value;
                      const cDays = Number(activeSale.creditDays) || 30;
                      const baseDate = new Date(newInvDate || Date.now());
                      baseDate.setDate(baseDate.getDate() + cDays);
                      updateActiveSale({
                        invoiceDate: newInvDate,
                        dueDate: baseDate.toISOString().split("T")[0]
                      });
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                  />
                </div>

                {/* State of Supply */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">State of Supply</label>
                  <select
                    value={activeSale.stateOfSupply}
                    onChange={e => updateActiveSale({ stateOfSupply: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>

              {/* Credit Terms (Due Date & Credit Days) */}
              {isCredit && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Due Date</label>
                    <input
                      type="date"
                      value={activeSale.dueDate || activeSale.invoiceDate}
                      onChange={e => updateActiveSale({ dueDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-amber-900 outline-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Terms</label>
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
                      Payment due within <strong>{activeSale.creditDays || 30} days</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── SECTION 2: DYNAMIC LINE ITEMS MATRIX ── */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Line Items & Inventory Products ({activeSale.rows.length} rows)
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              Type product name or scan barcode to add
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[980px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold select-none text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 text-center border-r border-slate-200 w-12">#</th>
                  {visibleColumns.item_name !== false && (
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[240px]">Item Name / Description</th>
                  )}
                  {visibleColumns.qty !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200 w-24">Qty</th>
                  )}
                  {visibleColumns.unit !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200 w-24">Unit</th>
                  )}
                  {visibleColumns.price !== false && (
                    <th className="py-3 px-3 text-center border-r border-slate-200 w-32">Price / Rate (₹)</th>
                  )}
                  {visibleColumns.discount !== false && (
                    <th className="py-3 px-0 text-center border-r border-slate-200 w-36">
                      <div className="border-b border-slate-200 pb-1">Discount</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                        <span>%</span>
                        <span>Amount (₹)</span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.tax !== false && (
                    <th className="py-3 px-0 text-center border-r border-slate-200 w-36">
                      <div className="border-b border-slate-200 pb-1">Tax (GST)</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                        <span>% Slab</span>
                        <span>Tax (₹)</span>
                      </div>
                    </th>
                  )}
                  {visibleColumns.amount !== false && (
                    <th className="py-3 px-4 text-right border-r border-slate-200 w-32">Amount (₹)</th>
                  )}
                  <th className="py-3 px-2 text-center w-12">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {activeSale.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* # Index */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200 text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Item Name Autocomplete */}
                    {visibleColumns.item_name !== false && (
                      <td className="py-2 px-3 border-r border-slate-200 relative">
                        <input
                          type="text"
                          placeholder="Search product from inventory or type..."
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
                          className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                        />

                        {/* Product Suggestions Dropdown */}
                        {activeRowSuggestId === row.id && (
                          <div ref={itemSuggestRef} className="absolute left-3 top-full mt-1 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1 animate-in fade-in duration-100">
                            {filteredProducts.map(p => (
                              <div
                                key={p.id}
                                onClick={() => handleSelectProduct(row.id, p)}
                                className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-900">{p.product_name || p.name}</div>
                                  <div className="text-[11px] text-slate-400">Stock: {p.stock} {p.unit || ""}</div>
                                </div>
                                <div className="font-extrabold text-blue-600">₹{parseFloat(p.price || 0).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    )}

                    {/* Qty */}
                    {visibleColumns.qty !== false && (
                      <td className="py-2 px-2 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={row.qty}
                          onChange={e => updateRowField(row.id, "qty", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {visibleColumns.unit !== false && (
                      <td className="py-2 px-2 border-r border-slate-200 text-center">
                        <select
                          value={row.unit}
                          onChange={e => updateRowField(row.id, "unit", e.target.value)}
                          className="w-full py-1.5 px-1 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                    )}

                    {/* Price */}
                    {visibleColumns.price !== false && (
                      <td className="py-2 px-2 border-r border-slate-200 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={e => updateRowField(row.id, "price", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                        />
                      </td>
                    )}

                    {/* Discount */}
                    {visibleColumns.discount !== false && (
                      <td className="py-2 px-0 border-r border-slate-200">
                        <div className="grid grid-cols-2 divide-x divide-slate-200">
                          <input
                            type="number"
                            placeholder="%"
                            min="0"
                            max="100"
                            value={row.discount_percent || ""}
                            onChange={e => {
                              updateRowField(row.id, "discount_percent", e.target.value);
                              updateRowField(row.id, "discount_amount", "");
                            }}
                            className="w-full py-1 px-1 text-center font-bold text-slate-800 outline-none text-xs"
                          />
                          <input
                            type="number"
                            placeholder="₹"
                            min="0"
                            value={row.discount_amount || ""}
                            onChange={e => {
                              updateRowField(row.id, "discount_amount", e.target.value);
                              updateRowField(row.id, "discount_percent", "");
                            }}
                            className="w-full py-1 px-1 text-center font-bold text-slate-800 outline-none text-xs"
                          />
                        </div>
                      </td>
                    )}

                    {/* Tax */}
                    {visibleColumns.tax !== false && (
                      <td className="py-2 px-0 border-r border-slate-200">
                        <div className="grid grid-cols-2 divide-x divide-slate-200 items-center">
                          <select
                            value={row.tax_percent}
                            onChange={e => updateRowField(row.id, "tax_percent", e.target.value)}
                            className="w-full py-1 px-1 bg-transparent text-center font-bold text-slate-800 outline-none text-xs cursor-pointer"
                          >
                            {TAX_RATES.map((tr, i) => (
                              <option key={i} value={tr.value}>{tr.label}</option>
                            ))}
                          </select>
                          <span className="text-[11px] font-bold text-slate-500 text-center truncate">
                            {row.tax_amount ? `₹${row.tax_amount.toFixed(1)}` : "—"}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Amount */}
                    {visibleColumns.amount !== false && (
                      <td className="py-2.5 px-4 text-right border-r border-slate-200 font-black text-slate-900 text-xs">
                        ₹ {row.amount ? row.amount.toFixed(2) : "0.00"}
                      </td>
                    )}

                    {/* Action Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => setRowToDelete(row.id)}
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
                  <td colSpan={2} className="py-3 px-4 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl border border-blue-600 bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition cursor-pointer"
                    >
                      <Plus size={14} strokeWidth={3} />
                      <span>+ Add Item Row</span>
                    </button>
                  </td>
                  {visibleColumns.qty !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 font-black text-slate-900">
                      {totals.totalQty}
                    </td>
                  )}
                  {visibleColumns.unit !== false && <td className="border-r border-slate-200" />}
                  {visibleColumns.price !== false && <td className="border-r border-slate-200" />}
                  {visibleColumns.discount !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 text-amber-700">
                      ₹ {totals.totalDiscountAmount.toFixed(2)}
                    </td>
                  )}
                  {visibleColumns.tax !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200 text-emerald-700">
                      ₹ {totals.totalTaxAmount.toFixed(2)}
                    </td>
                  )}
                  {visibleColumns.amount !== false && (
                    <td className="py-3 px-4 text-right border-r border-slate-200 font-black text-slate-900">
                      ₹ {totals.subtotalAmount.toFixed(2)}
                    </td>
                  )}
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* ── SECTION 3: FINANCIAL RECONCILIATION & TOTALS SUMMARY ── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* Left 7 Columns: Notes, Terms & Overrides */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Terms, Conditions & Remarks</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Remarks & Note</label>
                <textarea
                  rows={2}
                  placeholder="Enter custom remarks for customer invoice..."
                  value={activeSale.descriptionText}
                  onChange={e => updateActiveSale({ descriptionText: e.target.value })}
                  className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Terms & Conditions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Goods once sold will not be returned..."
                  value={activeSale.termsText}
                  onChange={e => updateActiveSale({ termsText: e.target.value })}
                  className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-600 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Financial Summary & Settlement */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Breakdown</span>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>

            {/* Discount & Tax Row */}
            <div className="space-y-2 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Subtotal (Net Items)</span>
                <span className="font-bold text-slate-900">₹ {totals.subtotalAmount.toFixed(2)}</span>
              </div>

              {/* Overall Discount */}
              <div className="flex justify-between items-center">
                <span>Overall Discount</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    placeholder="%"
                    value={activeSale.overallDiscountPercent || ""}
                    onChange={e => updateActiveSale({ overallDiscountPercent: e.target.value, overallDiscountAmount: "" })}
                    className="w-14 py-1 px-1.5 border border-slate-200 rounded-md text-right text-xs outline-none"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    placeholder="₹"
                    value={activeSale.overallDiscountAmount || ""}
                    onChange={e => updateActiveSale({ overallDiscountAmount: e.target.value, overallDiscountPercent: "" })}
                    className="w-18 py-1 px-1.5 border border-slate-200 rounded-md text-right text-xs outline-none"
                  />
                </div>
              </div>

              {/* Overall Tax */}
              <div className="flex justify-between items-center">
                <span>GST Tax Total</span>
                <div className="flex items-center gap-2">
                  <select
                    value={activeSale.overallTaxRate}
                    onChange={e => updateActiveSale({ overallTaxRate: e.target.value })}
                    className="py-1 px-1.5 border border-slate-200 rounded-md text-xs font-medium outline-none cursor-pointer"
                  >
                    {TAX_RATES.map((tr, i) => <option key={i} value={tr.value}>{tr.label}</option>)}
                  </select>
                  <span className="font-bold text-emerald-700 w-16 text-right">
                    +₹ {totals.totalTaxAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Grand Total Hero Box */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">Grand Total</span>
                <span className="text-2xl font-black tracking-tight">
                  ₹ {totals.roundedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase">
                  {isCredit ? "Credit Mode" : "Cash Paid"}
                </span>
              </div>
            </div>

            {/* Credit Mode: Received Amount & Remaining Balance */}
            {isCredit && (
              <div className="pt-2 space-y-2 border-t border-slate-100 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeSale.receivedEnabled !== false}
                      onChange={e => {
                        const checked = e.target.checked;
                        updateActiveSale({
                          receivedEnabled: checked,
                          receivedAmount: checked ? (activeSale.receivedAmount || totals.roundedGrandTotal) : "0"
                        });
                      }}
                      className="cursor-pointer text-blue-600"
                    />
                    <span>Amount Received</span>
                  </label>
                  <input
                    type="number"
                    disabled={activeSale.receivedEnabled === false}
                    value={activeSale.receivedAmount !== undefined && activeSale.receivedAmount !== "" ? activeSale.receivedAmount : totals.roundedGrandTotal}
                    onChange={e => updateActiveSale({ receivedAmount: e.target.value })}
                    className="w-32 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-900 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>Balance Due</span>
                  <span className="text-sm font-black text-rose-600">
                    ₹ {Math.max(0, totals.roundedGrandTotal - (activeSale.receivedEnabled !== false ? (parseFloat(activeSale.receivedAmount !== undefined && activeSale.receivedAmount !== "" ? activeSale.receivedAmount : totals.roundedGrandTotal) || 0) : 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

          </div>

        </section>

      </main>

      {/* ── 4. STICKY ACTION FOOTER ── */}
      <footer className="bg-white border-t border-slate-200/90 px-4 sm:px-6 py-3 flex items-center justify-between sticky bottom-0 z-40 shadow-md">
        <button
          type="button"
          onClick={() => setShowCloseConfirm(true)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
        >
          Discard
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="app-btn-primary h-9 px-8 rounded-xl text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saving ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update Sale" : "Save Invoice"}</span>
          </button>
        </div>
      </footer>

      {/* ── MODALS PRESERVED ── */}
      
      {/* Delete Row Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setRowToDelete(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Remove Item Row?</h3>
              <p className="text-xs text-slate-500">This line item will be deleted from the current invoice.</p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button type="button" onClick={() => setRowToDelete(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={confirmDeleteRow} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm Modal */}
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

      {/* Unlisted Products Warning Modal */}
      {unlistedProductsWarning && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setUnlistedProductsWarning(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-3 bg-amber-50">
              <AlertCircle size={22} className="text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">Product Not in Inventory</h3>
                <p className="text-[11px] text-amber-700">Item not found in product catalog</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                {unlistedProductsWarning.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{item.item_name}</div>
                      <div className="text-[11px] text-slate-500">Rate: ₹{parseFloat(item.price || 0).toFixed(2)}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[11px]">
                      Qty: {item.qty || 1}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600">This product is not in your inventory. Do you want to proceed with billing or add it to inventory?</p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button type="button" onClick={() => setUnlistedProductsWarning(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleProceedFromWarning} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5">
                <Check size={14} />
                <span>Proceed to Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {quickAddModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setQuickAddModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <Package size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Product to Inventory</h3>
              </div>
              {quickAddModal.queue.length > 1 && (
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {quickAddModal.currentIndex + 1} of {quickAddModal.queue.length}
                </span>
              )}
            </div>

            {quickAddModal.error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{quickAddModal.error}</span>
              </div>
            )}

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  value={quickAddModal.form.product_name}
                  onChange={e => setQuickAddForm("product_name", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    value={quickAddModal.form.sale_price}
                    onChange={e => setQuickAddForm("sale_price", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={quickAddModal.form.purchase_price}
                    onChange={e => setQuickAddForm("purchase_price", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST Tax Rate</label>
                  <select
                    value={quickAddModal.form.sale_gst}
                    onChange={e => setQuickAddForm("sale_gst", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="0">None / 0%</option>
                    <option value="5">GST @ 5%</option>
                    <option value="12">GST @ 12%</option>
                    <option value="18">GST @ 18%</option>
                    <option value="28">GST @ 28%</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <select
                    value={quickAddModal.form.unit}
                    onChange={e => setQuickAddForm("unit", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none cursor-pointer"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
              <button type="button" onClick={() => setQuickAddModal(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAddProduct}
                disabled={quickAddModal.saving}
                className="app-btn-primary px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              >
                {quickAddModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save &amp; Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Column Customizer Drawer */}
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

    </div>
  );
}