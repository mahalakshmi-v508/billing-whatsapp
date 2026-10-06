import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  X, Plus, Calendar, ChevronDown, Check,
  Trash2, AlignLeft, BarChart2,
  Printer, MessageSquare, AlertCircle, Phone, ScanBarcode, Zap,
  Search, RotateCcw, Package, Layers, Scale, IndianRupee, Tag, ReceiptText, Wallet, FileText, CheckCircle2,
  Building2, UserCheck, CreditCard, ArrowLeft, RefreshCw, Save, Share2, DollarSign, Percent, ShieldAlert, ArrowRight
} from "lucide-react";
import HeaderSettingsButton from "../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../components/CommonTableColumnSettings";
import useTableColumns from "../../hooks/useTableColumns";
import CustomerForm from "../customer/CustomerForm";
import AddProductModal from "../products/AddProductModal";
import TermsDropdown from "../../components/common/TermsDropdown";

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

/* ── Due Date Calculator based on Invoice Date and Customer Credit Days ──── */
function calculateDueDate(invDateStr, days) {
  if (!invDateStr) return new Date().toISOString().split("T")[0];
  const parts = String(invDateStr).split("-").map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return invDateStr;
  }
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + (Number(days) || 0));
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ── Factory to create a brand new independent Sale tab state ────────────── */
function createNewSaleTab(id, index, defaultInvNo = "") {
  const today = new Date().toISOString().split("T")[0];
  return {
    id,
    label: `Sale #${index}`,
    paymentType: "cash", // "cash" or "credit"
    priceType: "without_tax",
    customerName: "",
    customerPhone: "",
    customerId: null,
    gstNo: "",
    billingAddress: "",
    shippingAddress: "",
    creditDays: 0,
    customerPendingBalance: 0,
    customerAdvanceBalance: 0,
    customerCreditLimit: 0,
    invoicePrefix: "INV-",
    invoiceNumber: defaultInvNo || "INV-0001",
    formattedInvoiceNo: defaultInvNo || "INV-0001",
    invoiceDate: today,
    dueDate: today,
    stateOfSupply: "Select",
    rows: [
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle size={16} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Close Sale Workspace</h3>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 text-xs text-slate-600 leading-relaxed">
          Current unsaved invoice changes will be discarded. Do you wish to continue and return to the invoices list?
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
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [productNotFoundDialog, setProductNotFoundDialog] = useState(null); // { rowId, query }
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [productInitialName, setProductInitialName] = useState("");
  const [pendingProductRowId, setPendingProductRowId] = useState(null);
  const searchDebounceTimerRef = useRef(null);
  const blurTimerRef = useRef(null);

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

  /* ── Reposition and Dismiss Dropdown on Scroll / Resize / Outside Click ── */
  useEffect(() => {
    const handleDocumentClick = (e) => {
      if (
        itemSuggestRef.current &&
        !itemSuggestRef.current.contains(e.target) &&
        activeInputRef.current &&
        !activeInputRef.current.contains(e.target)
      ) {
        setActiveRowSuggestId(null);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!activeRowSuggestId || !activeInputRef.current) return;
    const handleReposition = () => {
      if (activeInputRef.current) {
        updateSuggestPosition(activeInputRef.current);
      }
    };
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [activeRowSuggestId]);

  /* ── Fetch Products from Company / Admin / Catalog ── */
  const fetchAllProducts = async (targetCompanyId) => {
    try {
      const compId = targetCompanyId || selectedCompany || localStorage.getItem("selected_company_id");
      let prods = [];
      if (compId) {
        const res = await api.get(`/product/get?company_id=${compId}`);
        if (res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
          prods = res.data.data;
        }
      }
      if (prods.length === 0 && adminId) {
        const res = await api.get(`/product/get?admin_id=${adminId}`);
        if (res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
          prods = res.data.data;
        }
      }
      if (prods.length === 0) {
        const res = await api.get(`/product/get`);
        if (res.data?.status && Array.isArray(res.data.data)) {
          prods = res.data.data;
        }
      }
      setProducts(prods);
      return prods;
    } catch (err) {
      console.error("Error loading products in AddSale:", err);
      return [];
    }
  };

  /* ── Load Companies & Products on Mount ── */
  useEffect(() => {
    const loadCompaniesAndProducts = async () => {
      let companyList = [];
      try {
        const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId || ""}&role=${user.role || ""}`);
        if (res.data?.status && Array.isArray(res.data.data)) {
          companyList = res.data.data;
          setCompanies(companyList);
        }
      } catch (err) {
        console.error("Error loading companies:", err);
      }

      let activeCid = selectedCompany || localStorage.getItem("selected_company_id");
      const isValid = companyList.some(c => String(c.id) === String(activeCid));
      if ((!activeCid || !isValid) && companyList.length > 0) {
        activeCid = String(companyList[0].id);
        setSelectedCompany(activeCid);
        localStorage.setItem("selected_company_id", activeCid);
      }

      await fetchAllProducts(activeCid);
    };
    loadCompaniesAndProducts();
  }, [adminId, user.role]);

  useEffect(() => {
    if (!selectedCompany) return;
    fetchAllProducts(selectedCompany);
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
            : [createInitialRow()];

          const loadedSale = {
            id: 1,
            tabIndex: 1,
            label: `Edit Sale #${inv.invoice_no}`,
            paymentType: inv.payment_type === "gst" || (inv.payment_type === "cash" && (inv.gst_no || (inv.customer && inv.customer.gst_no))) ? "gst" : (inv.payment_type || (String(inv.payment_method).toLowerCase() === "credit" ? "credit" : "cash")),
            invoiceNumber: inv.invoice_no,
            invoiceDate: inv.created_at ? inv.created_at.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0],
            stateOfSupply: inv.state_of_supply || "Tamil Nadu",
            dueDate: inv.due_date ? inv.due_date.split("T")[0].split(" ")[0] : (inv.created_at ? inv.created_at.split("T")[0].split(" ")[0] : new Date().toISOString().split("T")[0]),
            customerName: inv.customer_name || "",
            customerPhone: inv.customer_phone || "",
            customerId: inv.customer_id || null,
            gstNo: inv.gst_no || (inv.customer && inv.customer.gst_no) || "",
            billingAddress: inv.billing_address || "",
            shippingAddress: inv.shipping_address || "",
            creditDays: Number(inv.customer?.credit_days || 0),
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
  const handleCustomerSearch = async (val, forceCreditOnly) => {
    const isCredit = forceCreditOnly !== undefined ? forceCreditOnly : (activeSale?.paymentType === "credit");
    updateActiveSale({
      customerName: val,
      customerId: null,
      creditDays: 0,
      customerPendingBalance: 0,
      customerAdvanceBalance: 0,
      dueDate: isCredit ? (activeSale?.invoiceDate || new Date().toISOString().split("T")[0]) : (activeSale?.dueDate || "")
    });
    try {
      const creditParam = isCredit ? "&credit_only=1" : "";
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(val || "")}${creditParam}`);
      if (res.data.status) {
        setCustomerSuggestions(res.data.data || []);
        setShowCustomerDropdown(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadInitialCustomers = async (forceCreditOnly) => {
    try {
      const isCredit = forceCreditOnly !== undefined ? forceCreditOnly : (activeSale?.paymentType === "credit");
      const creditParam = isCredit ? "&credit_only=1" : "";
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${creditParam}`);
      if (res.data.status) {
        setCustomerSuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectCustomer = (c) => {
    const cDays = c.credit_days !== undefined && c.credit_days !== null && c.credit_days !== "" ? Number(c.credit_days) : 0;
    const calcDueDate = calculateDueDate(activeSale.invoiceDate, cDays);

    updateActiveSale({
      customerId: c.id,
      customerName: c.name || c.customer_name,
      customerPhone: c.phone || c.customer_phone || "",
      gstNo: activeSale.paymentType === "gst" ? (c.gst_no || activeSale.gstNo || "") : "",
      billingAddress: c.address || c.billing_address || "",
      shippingAddress: c.shipping_address || c.address || "",
      customerPendingBalance: parseFloat(c.pending_amount) || 0,
      customerAdvanceBalance: parseFloat(c.advance_balance) || 0,
      customerCreditLimit: parseFloat(c.credit_limit) || 0,
      creditDays: cDays,
      dueDate: calcDueDate,
      stateOfSupply: c.state || activeSale.stateOfSupply,
    });
    setShowCustomerDropdown(false);
  };

  const handleCustomerCreated = async (createdCustomer) => {
    setShowAddCustomerModal(false);
    showToast("Customer created successfully!", true);

    const isCredit = activeSale?.paymentType === "credit";
    try {
      const searchParam = createdCustomer?.phone || createdCustomer?.name || "";
      const creditParam = isCredit ? "&credit_only=1" : "";
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(searchParam)}${creditParam}`);

      let matched = null;
      if (res.data?.status && Array.isArray(res.data.data) && res.data.data.length > 0) {
        matched = res.data.data.find(c =>
          (createdCustomer?.phone && String(c.phone) === String(createdCustomer.phone)) ||
          (createdCustomer?.name && String(c.name).toLowerCase() === String(createdCustomer.name).toLowerCase())
        ) || res.data.data[0];
      }

      await loadInitialCustomers(isCredit);

      if (matched) {
        setCustomerSuggestions(prev => {
          const exists = prev.some(c => String(c.id) === String(matched.id));
          return exists ? prev : [matched, ...prev];
        });

        if (isCredit) {
          if (Number(matched.credit_enabled) === 1) {
            selectCustomer(matched);
          } else {
            showToast("Customer created, but credit billing is not enabled for this customer.", false);
          }
        } else {
          selectCustomer(matched);
        }
      } else if (createdCustomer) {
        if (isCredit) {
          if (Number(createdCustomer.credit_enabled) === 1) {
            selectCustomer(createdCustomer);
          } else {
            showToast("Customer created, but credit billing is not enabled for this customer.", false);
          }
        } else {
          selectCustomer(createdCustomer);
        }
      }
    } catch (err) {
      console.error("Error refreshing customer after creation:", err);
      await loadInitialCustomers(isCredit);
    }
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

  /* ── Product Selection: Automatically sets Quantity = 1 (if was empty) & appends next row ── */
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

      // Automatically append next row if the current row was the last row or if the bottom row is filled
      const isLastRow = updatedRows.length > 0 && updatedRows[updatedRows.length - 1].id === rowId;
      const lastRow = updatedRows[updatedRows.length - 1];
      const lastRowHasProduct = Boolean(
        lastRow && (lastRow.product_id || (lastRow.item_name && lastRow.item_name.trim() !== ""))
      );

      if (isLastRow || lastRowHasProduct) {
        return { ...sale, rows: [...updatedRows, createInitialRow()] };
      }

      return { ...sale, rows: updatedRows };
    });
    setActiveRowSuggestId(null);
  };

  /* ── Product Not Found Dialog & Add Product Modal Handlers ── */
  const triggerProductNotFound = (rowId, query) => {
    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    setActiveRowSuggestId(null);
    setPendingProductRowId(rowId);
    setProductNotFoundDialog({
      rowId,
      query: (query || "").trim(),
    });
  };

  const handleCancelProductNotFound = () => {
    if (productNotFoundDialog?.rowId) {
      const rId = productNotFoundDialog.rowId;
      updateActiveSale(sale => {
        const updatedRows = sale.rows.map(r => {
          if (r.id !== rId) return r;
          if (!r.product_id) {
            return { ...r, item_name: "" };
          }
          return r;
        });
        return { ...sale, rows: updatedRows };
      });
    }
    setProductNotFoundDialog(null);
    setPendingProductRowId(null);
  };

  const handleProceedProductNotFound = () => {
    const query = productNotFoundDialog?.query || "";
    const rowId = productNotFoundDialog?.rowId || pendingProductRowId;
    setPendingProductRowId(rowId);
    setProductInitialName(query);
    setProductNotFoundDialog(null);
    setShowAddProductModal(true);
  };

  const handleProductCreated = async (createdProd) => {
    setShowAddProductModal(false);
    const targetRowId = pendingProductRowId;
    setPendingProductRowId(null);
    setProductInitialName("");

    showToast("Product added successfully!", true);

    const compId = selectedCompany || user?.company_id || (companies[0] ? companies[0].id : "");
    const freshProducts = await fetchAllProducts(compId);

    let matched = null;
    if (createdProd?.id) {
      matched = freshProducts.find(p => String(p.id) === String(createdProd.id));
    }
    if (!matched && (createdProd?.product_name || createdProd?.name)) {
      const pName = (createdProd.product_name || createdProd.name || "").trim().toLowerCase();
      matched = freshProducts.find(p => (p.product_name || p.name || "").trim().toLowerCase() === pName);
    }
    if (!matched && createdProd) {
      matched = createdProd;
      setProducts(prev => {
        const exists = prev.some(p => String(p.id) === String(createdProd.id));
        return exists ? prev : [createdProd, ...prev];
      });
    }

    if (matched && targetRowId) {
      handleSelectProduct(targetRowId, matched);
    }
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
    if (!activeSale) return { totalQty: 0, totalFreeQty: 0, totalDiscountAmount: 0, totalTaxAmount: 0, grossSubtotal: 0, taxableSubtotal: 0, subtotalAmount: 0, rawGrandTotal: 0, roundedGrandTotal: 0, roundDifference: 0 };

    let totalQty = 0;
    let totalFreeQty = 0;
    let grossSubtotal = 0;
    let totalTaxAmount = 0;
    let totalDiscountAmount = 0;
    let roundedGrandTotal = 0;

    activeSale.rows.forEach(r => {
      const q = parseFloat(r.qty);
      if (!isNaN(q) && q > 0) totalQty += q;
      const fq = parseFloat(r.free_qty);
      if (!isNaN(fq) && fq > 0) totalFreeQty += fq;
      const p = parseFloat(r.price);
      if (!isNaN(q) && q > 0 && !isNaN(p) && p > 0) {
        grossSubtotal += (q * p);
      }
      const da = parseFloat(r.discount_amount);
      if (!isNaN(da) && da > 0) totalDiscountAmount += da;
      const ta = parseFloat(r.tax_amount);
      if (!isNaN(ta) && ta > 0) totalTaxAmount += ta;
      const a = parseFloat(r.amount);
      if (!isNaN(a) && a > 0) roundedGrandTotal += a;
    });

    const taxableSubtotal = Math.max(0, grossSubtotal - totalDiscountAmount);
    const roundDifference = 0;

    return {
      totalQty,
      totalFreeQty,
      totalDiscountAmount,
      totalTaxAmount,
      grossSubtotal,
      taxableSubtotal,
      subtotalAmount: taxableSubtotal,
      rawGrandTotal: roundedGrandTotal,
      roundedGrandTotal,
      roundDifference,
    };
  }, [activeSale]);

  /* ── Reposition Product Suggestion on Scroll / Resize ── */
  useEffect(() => {
    if (!activeRowSuggestId || !activeInputRef.current) return;
    const handleReposition = () => {
      if (activeInputRef.current) {
        const rect = activeInputRef.current.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          setActiveRowSuggestId(null);
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
  }, [activeRowSuggestId]);

  /* ── Click Outside Listeners ── */
  useEffect(() => {
    const handler = (e) => {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
      if (
        itemSuggestRef.current &&
        !itemSuggestRef.current.contains(e.target) &&
        (!activeInputRef.current || !activeInputRef.current.contains(e.target))
      ) {
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
      billing_address: activeSale.paymentType === "credit" ? "" : activeSale.billingAddress,
      shipping_address: activeSale.paymentType === "credit" ? "" : activeSale.shippingAddress,
      cashier_id: user.id || 0,
      products: payloadProducts,
      sub_total: totals.subtotalAmount,
      gst_total: totals.totalTaxAmount,
      total_amount: totals.roundedGrandTotal,
      paid_amount: activeSale.paymentType === "credit"
        ? (activeSale.receivedEnabled !== false
            ? (activeSale.receivedAmount !== "" && activeSale.receivedAmount !== undefined
                ? (parseFloat(activeSale.receivedAmount) || 0)
                : totals.roundedGrandTotal)
            : 0)
        : totals.roundedGrandTotal,
      balance_amount: activeSale.paymentType === "credit"
        ? Math.max(0, totals.roundedGrandTotal - (activeSale.receivedEnabled !== false
            ? (activeSale.receivedAmount !== "" && activeSale.receivedAmount !== undefined
                ? (parseFloat(activeSale.receivedAmount) || 0)
                : totals.roundedGrandTotal)
            : 0))
        : 0,
      payment_method: activeSale.paymentType === "credit" ? "credit" : "cash",
      payment_type: activeSale.paymentType,
      source: "sale",
      due_date: activeSale.paymentType === "credit" ? (activeSale.dueDate || activeSale.invoiceDate) : null,
      gst_type: totals.totalTaxAmount > 0 ? "with_gst" : "without_gst",
      gst_no: activeSale.paymentType === "gst" ? (activeSale.gstNo?.trim() || "") : "",
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
    if (!itemSearchQuery || !itemSearchQuery.trim()) return products.slice(0, 50);
    const q = itemSearchQuery.trim().toLowerCase();
    return products.filter(p =>
      (p.product_name && p.product_name.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.product_code && String(p.product_code).toLowerCase().includes(q)) ||
      (p.barcode && String(p.barcode).toLowerCase().includes(q))
    ).slice(0, 50);
  }, [products, itemSearchQuery]);

  if (!activeSale) return null;
  const isCredit = activeSale.paymentType === "credit";
  const isGst = activeSale.paymentType === "gst";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 antialiased">
      
      {/* ── 1. EXECUTIVE COMMAND BAR & MULTI-SALE VOUCHER TABS ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 pt-3 pb-0 shadow-xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          
          {/* Voucher Workspace Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {sales.map((tab) => {
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
                    <ReceiptText size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.label || `Sale #${tab.id}`}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.formattedInvoiceNo || tab.invoiceNumber || "Draft"}
                    </span>
                  </div>
                  {sales.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-200/80 transition"
                      title="Close tab"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}

            {/* + Add New Sale Tab */}
            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddNewTab}
                className="h-8 px-2.5 mb-1 flex items-center gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold border border-dashed border-blue-300 transition cursor-pointer"
                title="Add New Sale Voucher"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Sale</span>
              </button>
            )}
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
              title="Back to Invoices"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Commercial Billing
                </span>
                <span className="text-xs text-slate-400 font-medium">• Tax Invoice &amp; POS</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Invoice #${activeSale.formattedInvoiceNo || activeSale.invoiceNumber}` : "Sales & Tax Invoice Studio"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Sale Type Mode Switcher: Cash Sale | Credit Sale | GST Sale */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  updateActiveSale({ paymentType: "cash", gstNo: "" });
                  loadInitialCustomers(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeSale.paymentType === "cash" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Wallet size={13} />
                <span>Cash Sale</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  let cDays = 0;
                  let retainCustomer = false;
                  if (activeSale.customerId) {
                    const currentCust = customerSuggestions.find(c => c.id === activeSale.customerId);
                    if (currentCust && Number(currentCust.credit_enabled) === 1) {
                      cDays = Number(currentCust.credit_days) || 0;
                      retainCustomer = true;
                    }
                  }
                  const newDueDate = calculateDueDate(activeSale.invoiceDate, cDays);
                  updateActiveSale({
                    paymentType: "credit",
                    creditDays: cDays,
                    dueDate: newDueDate,
                    gstNo: "",
                    ...(activeSale.customerId && !retainCustomer ? {
                      customerId: null,
                      customerName: "",
                      customerPhone: "",
                      billingAddress: "",
                      shippingAddress: "",
                      customerPendingBalance: 0,
                      customerCreditLimit: 0,
                    } : {})
                  });
                  loadInitialCustomers(true);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isCredit ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard size={13} />
                <span>Credit Sale</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateActiveSale({ paymentType: "gst" });
                  loadInitialCustomers(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isGst ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ReceiptText size={13} />
                <span>GST Sale</span>
              </button>
            </div>

            {/* Copy Summary Quick Action */}
            <button
              type="button"
              onClick={() => {
                const summary = "Sale Invoice Details:\n" +
                  `Invoice: ${activeSale.formattedInvoiceNo || activeSale.invoiceNumber}\n` +
                  `Customer: ${activeSale.customerName || "Cash Customer"}\n` +
                  `Total: ₹${totals.roundedGrandTotal.toFixed(2)}\n` +
                  `Payment Mode: ${activeSale.paymentType.toUpperCase()}`;
                navigator.clipboard?.writeText(summary);
                showToast("Invoice summary copied to clipboard!", true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 size={14} className="text-slate-500" />
              <span>Copy Summary</span>
            </button>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toast && (
          <div className={`mt-4 px-4 py-3 border text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
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
      </div>

      {/* ── 3. CUSTOMER INTELLIGENCE & INVOICE PARAMETERS CARDS ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        
        {/* Left: Customer Profile & Contact Details (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between" ref={customerBoxRef}>
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Customer Information</h3>
                  <p className="text-[11px] text-slate-400">Search customer directory or enter walk-in party</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSale.customerAdvanceBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Adv: ₹{activeSale.customerAdvanceBalance.toLocaleString("en-IN")}
                  </span>
                )}
                {activeSale.customerPendingBalance > 0 && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-1">
                    <AlertCircle size={11} /> Due: ₹{activeSale.customerPendingBalance.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Customer Autocomplete Search Input */}
              <div className="sm:col-span-7 relative">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                  Customer / Business Name {isCredit && <span className="text-rose-500">*</span>}
                </label>
                <div
                  className={`relative border rounded-xl px-3.5 py-2 transition bg-white flex items-center justify-between ${
                    showCustomerDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Search size={14} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={activeSale.customerName}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => {
                        setIsCustomerFocused(true);
                        setShowCustomerDropdown(true);
                        if (customerSuggestions.length === 0) loadInitialCustomers(isCredit);
                      }}
                      onBlur={() => setIsCustomerFocused(false)}
                      className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 cursor-pointer ml-1.5 flex-shrink-0"
                    onClick={() => {
                      setShowCustomerDropdown(v => !v);
                      if (customerSuggestions.length === 0) loadInitialCustomers(isCredit);
                    }}
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showCustomerDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1 divide-y divide-slate-100 animate-in fade-in duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span
                        onClick={() => {
                          setShowCustomerDropdown(false);
                          setShowAddCustomerModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        + Add New Customer
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Due / Adv</span>
                    </div>
                    {(() => {
                      const list = isCredit
                        ? customerSuggestions.filter(c => Number(c.credit_enabled) === 1)
                        : customerSuggestions;
                      if (list.length === 0) {
                        return (
                          <div className="p-3 text-xs text-slate-400 text-center">
                            {isCredit ? "No credit customers found" : "No customers found"}
                          </div>
                        );
                      }
                      return list.map((c) => {
                        const due = parseFloat(c.pending_amount || 0);
                        const adv = parseFloat(c.advance_balance || 0);
                        const cDays = Number(c.credit_days) || 0;
                        return (
                          <div
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-900 truncate">{c.name || c.customer_name}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span>{c.phone || c.customer_phone || ""}</span>
                                {isCredit && (
                                  <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded text-[10px]">
                                    {cDays} {cDays === 1 ? "Day" : "Days"} Credit
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-auto pl-2">
                              {due > 0 && adv > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-xs font-bold text-rose-600 inline-flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-slate-500">Due:</span>
                                    <span>₹{due.toLocaleString("en-IN")}</span>
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-slate-500">Adv:</span>
                                    <span>₹{adv.toLocaleString("en-IN")}</span>
                                  </span>
                                </div>
                              ) : adv > 0 ? (
                                <span className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                                  <span className="text-[10.5px] font-semibold text-slate-500">Adv:</span>
                                  <span className="font-extrabold text-emerald-600">₹{adv.toLocaleString("en-IN")}</span>
                                </span>
                              ) : (
                                <span className="text-xs font-bold text-slate-700 inline-flex items-center gap-1">
                                  <span className="text-[10.5px] font-semibold text-slate-500">Due:</span>
                                  <span className={due > 0 ? "text-rose-600 font-extrabold" : "text-slate-800 font-bold"}>
                                    ₹{due.toLocaleString("en-IN")}
                                  </span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </div>

              {/* Customer Phone */}
              <div className="sm:col-span-5">
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Contact Phone</label>
                <div className="relative border border-slate-300 rounded-xl px-3.5 py-2 bg-white flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                  <Phone size={13} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={activeSale.customerPhone}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      updateActiveSale({ customerPhone: val });
                    }}
                    className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* GST No Field (Visible only when GST Sale is selected) */}
              {isGst && (
                <div className="sm:col-span-12">
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">GST No</label>
                  <div className="relative border border-slate-300 rounded-xl px-3.5 py-2 bg-white flex items-center gap-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/15 transition">
                    <ReceiptText size={13} className="text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Enter customer GSTIN (e.g. 33AAAAA0000A1Z5)"
                      value={activeSale.gstNo || ""}
                      onChange={(e) => updateActiveSale({ gstNo: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cash Billing & Shipping Address (Editable in Cash Mode) */}
            {!isCredit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3">
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 mb-1 block">Billing Address</label>
                  <textarea
                    rows={1}
                    placeholder="Enter billing address..."
                    value={activeSale.billingAddress}
                    onChange={e => updateActiveSale({ billingAddress: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] font-bold text-slate-500 mb-1 block">Shipping Address</label>
                  <textarea
                    rows={1}
                    placeholder="Enter delivery address..."
                    value={activeSale.shippingAddress}
                    onChange={e => updateActiveSale({ shippingAddress: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-500 transition resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Invoice Document Metadata (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice Parameters</h3>
                <p className="text-[11px] text-slate-400">Document number, posting date &amp; state tax</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Invoice Number */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Invoice #</label>
                <div className="px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs font-black text-blue-700 font-mono tracking-wide text-center">
                  {activeSale.formattedInvoiceNo || activeSale.invoiceNumber || "INV-0001"}
                </div>
              </div>

              {/* Invoice Date */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">Invoice Date</label>
                <div className="relative border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white flex items-center focus-within:border-blue-500 transition">
                  <input
                    type="date"
                    value={activeSale.invoiceDate}
                    onChange={e => {
                      const newInvDate = e.target.value;
                      const cDays = Number(activeSale.creditDays) || 0;
                      const newDueDate = calculateDueDate(newInvDate, cDays);
                      updateActiveSale({
                        invoiceDate: newInvDate,
                        dueDate: newDueDate
                      });
                    }}
                    className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              {/* State of Supply */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 mb-1 block">State of Supply</label>
                <select
                  value={activeSale.stateOfSupply}
                  onChange={e => updateActiveSale({ stateOfSupply: e.target.value })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
            </div>

            {/* Credit Terms (Due Date & Credit Days) */}
            {isCredit && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-100">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Credit Due Date</label>
                  <input
                    type="date"
                    value={activeSale.dueDate || activeSale.invoiceDate}
                    onChange={e => updateActiveSale({ dueDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 outline-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Credit Terms</label>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
                    Due in <strong className="text-slate-900">{Number(activeSale.creditDays) || 0} {Number(activeSale.creditDays) === 1 ? "Day" : "Days"}</strong>
                  </div>
                </div>
              </div>
            )}
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
                {activeSale.rows.length} {activeSale.rows.length === 1 ? "Row" : "Rows"}
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
                  {visibleColumns.item_name !== false && (
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
                {activeSale.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* # Index */}
                    <td className="py-2.5 px-3 text-center border-r border-slate-200/60 text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    {/* Item Name Autocomplete */}
                    {visibleColumns.item_name !== false && (
                      <td className="py-2 px-3 border-r border-slate-200/60 min-w-[240px]">
                        <input
                          type="text"
                          placeholder="Search product from inventory or type..."
                          value={row.item_name}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
                            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            updateRowField(row.id, "item_name", val);
                            setItemSearchQuery(val);
                            setActiveRowSuggestId(row.id);

                            const trimmed = val.trim();
                            if (trimmed.length >= 2) {
                              const q = trimmed.toLowerCase();
                              const hasMatch = products.some(p =>
                                (p.product_name && p.product_name.toLowerCase().includes(q)) ||
                                (p.name && p.name.toLowerCase().includes(q)) ||
                                (p.product_code && String(p.product_code).toLowerCase().includes(q)) ||
                                (p.barcode && String(p.barcode).toLowerCase().includes(q))
                              );
                              if (!hasMatch) {
                                searchDebounceTimerRef.current = setTimeout(() => {
                                  triggerProductNotFound(row.id, trimmed);
                                }, 750);
                              }
                            }
                          }}
                          onFocus={(e) => {
                            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setItemSearchQuery(row.item_name || "");
                            setActiveRowSuggestId(row.id);
                            if (products.length === 0) {
                              fetchAllProducts();
                            }
                          }}
                          onClick={(e) => {
                            if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                            activeInputRef.current = e.currentTarget;
                            updateSuggestPosition(e.currentTarget);
                            setItemSearchQuery(row.item_name || "");
                            setActiveRowSuggestId(row.id);
                            if (products.length === 0) {
                              fetchAllProducts();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
                              const val = (row.item_name || "").trim();
                              if (!val) return;
                              const match = products.find(
                                (p) =>
                                  (p.product_name || p.name || "").trim().toLowerCase() === val.toLowerCase() ||
                                  (p.product_code && String(p.product_code).trim().toLowerCase() === val.toLowerCase()) ||
                                  (p.barcode && String(p.barcode).trim().toLowerCase() === val.toLowerCase())
                              );
                              if (match) {
                                handleSelectProduct(row.id, match);
                              } else {
                                triggerProductNotFound(row.id, val);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const val = (e.target.value || "").trim();
                            if (!val) return;
                            if (row.product_id) {
                              const currentProd = products.find(p => String(p.id) === String(row.product_id));
                              if (currentProd && (currentProd.product_name || currentProd.name || "").trim().toLowerCase() === val.toLowerCase()) {
                                return;
                              }
                            }
                            const match = products.find(
                              (p) =>
                                (p.product_name || p.name || "").trim().toLowerCase() === val.toLowerCase() ||
                                (p.product_code && String(p.product_code).trim().toLowerCase() === val.toLowerCase()) ||
                                (p.barcode && String(p.barcode).trim().toLowerCase() === val.toLowerCase())
                            );
                            if (match) {
                              handleSelectProduct(row.id, match);
                              return;
                            }
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
                          onChange={e => updateRowField(row.id, "qty", e.target.value)}
                          className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                        />
                      </td>
                    )}

                    {/* Unit */}
                    {visibleColumns.unit !== false && (
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
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
                      <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.price}
                          onChange={e => updateRowField(row.id, "price", e.target.value)}
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
                      <td className="py-2 px-0 border-r border-slate-200/60">
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
                      <td className="py-2.5 px-4 text-right border-r border-slate-200/60 font-black text-slate-900 text-xs">
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
                      ₹ {totals.totalDiscountAmount.toFixed(2)}
                    </td>
                  )}
                  {visibleColumns.tax !== false && (
                    <td className="py-3 px-2 text-center border-r border-slate-200/60 text-emerald-700">
                      ₹ {totals.totalTaxAmount.toFixed(2)}
                    </td>
                  )}
                  {visibleColumns.amount !== false && (
                    <td className="py-3 px-4 text-right border-r border-slate-200/60 font-black text-slate-900">
                      ₹ {totals.subtotalAmount.toFixed(2)}
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
      {activeRowSuggestId && suggestCoords && createPortal(
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
          {filteredProducts.length === 0 ? (
            itemSearchQuery.trim() ? (
              <div
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
                  triggerProductNotFound(activeRowSuggestId, itemSearchQuery);
                }}
                className="px-4 py-3 hover:bg-amber-50 cursor-pointer flex items-center justify-between transition group border border-amber-200/60 rounded-xl m-1.5 bg-amber-50/40"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">Product Not Found</div>
                    <div className="text-[11px] text-slate-500">
                      "{itemSearchQuery}" is not available in product list
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <span>Proceed</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-xs text-slate-400 select-none">
                No products found in catalog. Type product name to search or add.
              </div>
            )
          ) : (
            <>
              {filteredProducts.map(p => (
                <div
                  key={p.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
                    handleSelectProduct(activeRowSuggestId, p);
                  }}
                  className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-900 truncate">{p.product_name || p.name}</div>
                    <div className="text-[11px] text-slate-400">Stock: {p.stock ?? 0} {p.unit || ""}</div>
                  </div>
                  <div className="font-extrabold text-blue-600 shrink-0">₹{parseFloat(p.price || 0).toLocaleString()}</div>
                </div>
              ))}
              {itemSearchQuery && !filteredProducts.some(p => (p.product_name || p.name || "").toLowerCase() === itemSearchQuery.toLowerCase()) && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (searchDebounceTimerRef.current) clearTimeout(searchDebounceTimerRef.current);
                    triggerProductNotFound(activeRowSuggestId, itemSearchQuery);
                  }}
                  className="px-3.5 py-2 hover:bg-amber-50/70 bg-slate-50/50 cursor-pointer flex items-center justify-between text-xs text-amber-800 font-bold border-t border-slate-100 transition"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle size={13} className="text-amber-600" />
                    <span>Not in list? Click to add "{itemSearchQuery}"</span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-bold flex items-center gap-0.5">
                    Proceed <ArrowRight size={11} />
                  </span>
                </div>
              )}
            </>
          )}
        </div>,
        document.body
      )}

      {/* ── 5. FINANCIAL RECONCILIATION & TOTALS SUMMARY ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left 7 Columns: Notes, Terms & Overrides */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
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
                value={activeSale.descriptionText}
                onChange={e => updateActiveSale({ descriptionText: e.target.value })}
                className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Terms &amp; Conditions</label>
              <TermsDropdown
                companyId={selectedCompany || user?.company_id || 1}
                page="sale"
                value={activeSale.termsText || ""}
                onChange={(newVal) => updateActiveSale({ termsText: newVal })}
                placeholder="Select Terms &amp; Conditions..."
              />
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Financial Summary & Settlement */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Wallet size={14} />
              </div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Financial Breakdown</span>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              INR (₹)
            </span>
          </div>

          {/* Financial Summary Breakdown */}
          <div className="space-y-2.5 text-xs font-semibold text-slate-600">
            <div className="flex justify-between items-center">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₹ {totals.grossSubtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Total Discount</span>
              <span className={`font-bold ${totals.totalDiscountAmount > 0 ? "text-rose-600" : "text-slate-700"}`}>
                {totals.totalDiscountAmount > 0 ? `- ₹ ${totals.totalDiscountAmount.toFixed(2)}` : "₹ 0.00"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span>Total Tax (GST)</span>
              <span className={`font-bold ${totals.totalTaxAmount > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                {totals.totalTaxAmount > 0 ? `+ ₹ ${totals.totalTaxAmount.toFixed(2)}` : "₹ 0.00"}
              </span>
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
                {isCredit ? "Credit Mode" : isGst ? "GST Sale" : "Cash Paid"}
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
                    className="cursor-pointer text-blue-600 rounded"
                  />
                  <span>Amount Received</span>
                </label>
                <input
                  type="number"
                  disabled={activeSale.receivedEnabled === false}
                  value={activeSale.receivedAmount !== undefined && activeSale.receivedAmount !== "" ? activeSale.receivedAmount : totals.roundedGrandTotal}
                  onChange={e => updateActiveSale({ receivedAmount: e.target.value })}
                  className="w-32 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
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

      </div>

      {/* ── 6. STICKY ACTION FOOTER BAR ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 z-30 flex items-center justify-between shadow-lg">
        <button
          type="button"
          onClick={() => setShowCloseConfirm(true)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
        >
          Discard
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 mr-2">
            <span>Items: <strong className="text-slate-900">{totals.totalQty}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-blue-600 font-mono font-black">₹{totals.roundedGrandTotal.toFixed(2)}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition"
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saving ? (isEditMode ? "Updating..." : "Saving...") : isEditMode ? "Update Sale" : "Save Invoice"}</span>
          </button>
        </div>
      </footer>

      {/* ── MODALS PRESERVED ── */}
      
      {/* Delete Row Modal */}
      {rowToDelete && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setRowToDelete(null)}>
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900">Remove Item Row?</h3>
              <p className="text-xs text-slate-500">This line item will be deleted from the current invoice.</p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
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

      {/* Unlisted Products Warning Modal */}
      {unlistedProductsWarning && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" onClick={() => setUnlistedProductsWarning(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-3 bg-amber-50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Product Not in Inventory</h3>
                <p className="text-[11px] text-amber-700">Item not found in product catalog</p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
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
              <p className="text-xs text-slate-600 leading-relaxed">This product is not in your inventory. Do you want to proceed with billing or add it to inventory?</p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button type="button" onClick={() => setUnlistedProductsWarning(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={handleProceedFromWarning} className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer">
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
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Package size={16} />
                </div>
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    value={quickAddModal.form.sale_price}
                    onChange={e => setQuickAddForm("sale_price", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    value={quickAddModal.form.purchase_price}
                    onChange={e => setQuickAddForm("purchase_price", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-blue-500"
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

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button type="button" onClick={() => setQuickAddModal(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickAddProduct}
                disabled={quickAddModal.saving}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {quickAddModal.saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save &amp; Continue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full">
            <CustomerForm
              onSuccess={handleCustomerCreated}
              onCancel={() => setShowAddCustomerModal(false)}
            />
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

      {/* Product Not Found Dialog */}
      {productNotFoundDialog && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={handleCancelProductNotFound}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-amber-100 flex items-center gap-3 bg-amber-50">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">Product Not Found</h3>
                <p className="text-[11px] text-amber-700">Item not available in product list</p>
              </div>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                This product is not available in the product list. Would you like to add this product to the product list?
              </p>
              {productNotFoundDialog.query && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 flex items-center justify-between">
                  <span className="text-slate-500">Product Name:</span>
                  <span className="font-bold text-blue-600 font-mono">"{productNotFoundDialog.query}"</span>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelProductNotFound}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedProductNotFound}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Proceed</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reused Existing Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => {
          setShowAddProductModal(false);
          setPendingProductRowId(null);
          setProductInitialName("");
        }}
        initialName={productInitialName}
        companyId={selectedCompany || user?.company_id || (companies[0] ? companies[0].id : "")}
        onProductAdded={handleProductCreated}
      />

    </div>
  );
}