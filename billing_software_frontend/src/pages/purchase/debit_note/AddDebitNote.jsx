import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import { calculateLine, resolveProductPricing } from "../../../utils/gst";

/**
 * The document-level tax mode a new debit note starts on. "without_tax" is the
 * historical default, so unless the user picks the inclusive toggle the saved
 * product's own mode is used.
 */
const DEFAULT_TAX_MODE = "without_tax";
import {
  X,
  Plus,
  Trash2,
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
  Clock,
  Wallet,
  CheckCircle2
} from "lucide-react";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import { useTableColumns } from "../../../hooks/useTableColumns";

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
    returnNo: returnNoValue ? String(returnNoValue) : "",
    billNo: "",
    billDate: "",
    returnDate: new Date().toISOString().split("T")[0],
    stateOfSupply: "Tamil Nadu",
    globalTaxMode: DEFAULT_TAX_MODE,
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

const DEFAULT_DEBIT_NOTE_ITEM_COLUMNS = [
  { id: "barcode", label: "# / Scan", defaultVisible: true, fixed: true },
  { id: "item_name", label: "Item Name / Product", defaultVisible: true, fixed: true },
  { id: "quantity", label: "Qty", defaultVisible: true },
  { id: "unit", label: "Unit", defaultVisible: true },
  { id: "rate", label: "Rate (₹)", defaultVisible: true },
  { id: "discount", label: "Discount", defaultVisible: true },
  { id: "tax", label: "Tax (GST)", defaultVisible: true },
  { id: "amount", label: "Amount (₹)", defaultVisible: true, fixed: true },
  { id: "action", label: "Action", defaultVisible: true, fixed: true },
];

export default function AddDebitNote() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const [searchParams] = useSearchParams();
  const purchaseId = searchParams.get("purchase_id");

  const {
    columns: tableColumns,
    isOpen: isSettingsOpen,
    openSettings,
    closeSettings,
    toggleColumn,
    resetColumns,
    isColumnVisible,
    visibleColumnCount
  } = useTableColumns(DEFAULT_DEBIT_NOTE_ITEM_COLUMNS, "add_debit_note_item_columns_v1");

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
  const [toast, setToast] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

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
  const handleAddTab = async () => {
    const nextIdx = tabs.length + 1;
    let nextReturnNo = String(nextIdx);
    try {
      const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=debit_note`);
      if (numRes.data?.status && numRes.data?.formatted_number) {
        nextReturnNo = numRes.data.formatted_number;
      }
    } catch {
      nextReturnNo = `DN-${String(nextIdx).padStart(4, "0")}`;
    }
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

  // Fetch next return number immediately on mount in parallel
  useEffect(() => {
    if (isEditMode) return;
    const cid = companyId || localStorage.getItem("selected_company_id") || user?.company_id || 0;
    let cancelled = false;
    api.get(`/invoice-settings/next-number?company_id=${cid || 0}&type=debit_note`)
      .then((numRes) => {
        if (cancelled) return;
        if (numRes.data?.status && numRes.data?.formatted_number) {
          updateActiveTab({ returnNo: numRes.data.formatted_number });
        }
      })
      .catch((err) => {
        console.error("Error fetching next debit note number:", err);
      });
    return () => { cancelled = true; };
  }, [companyId, isEditMode]);

  // Load Suppliers and Products Catalog (with bulletproof fallbacks)
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const cid = companyId || localStorage.getItem("selected_company_id") || user?.company_id || 0;
        
        // Fetch suppliers and products concurrently
        const [supRes, prodRes, countRes] = await Promise.allSettled([
          api.get(`/supplier/get_all?company_id=${cid || 0}`).catch(() => api.get("/supplier/get_all")),
          api.get(`/product/get?company_id=${cid || 0}&admin_id=${adminId || 0}`).catch(() => api.get("/product/get")),
          api.get(`/debit_note/list?company_id=${cid || 0}`)
        ]);

        if (supRes.status === "fulfilled" && supRes.value?.data?.data) {
          setSuppliers(supRes.value.data.data);
        }
        if (prodRes.status === "fulfilled" && prodRes.value?.data?.data) {
          setProductsCatalog(prodRes.value.data.data);
        }
        if (countRes.status === "fulfilled" && countRes.value?.data?.count !== undefined) {
          setExistingCount(countRes.value.data.count);
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
                globalTaxMode: DEFAULT_TAX_MODE,
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

  // If opened from Reports → Purchase → "Convert To Return" (?purchase_id=X),
  // prefill the first tab from the real purchase record (supplier, bill ref,
  // items, payment type and state of supply are all transferred).
  useEffect(() => {
    if (isEditMode || !purchaseId) return;

    let cancelled = false;

    api
      .get("/purchase/get_purchase_by_id", {
        params: { id: purchaseId },
      })
      .then((res) => {
        if (cancelled) return;

        if (!res.data?.status || !res.data.data) return;

        const d = res.data.data;
        const sup = d.supplier || {};

        const rows = Array.isArray(d.items)
          ? d.items.map((it, i) => ({
              id: i + 1,
              product_id: it.product_id || null,
              product_name: it.product_name || it.item || "",
              product_code: it.product_code || "",
              barcode: it.barcode || "",
              quantity: it.quantity || "",
              unit: it.unit && it.unit !== "NONE" ? it.unit : "NONE",
              price: it.price || 0,
              discount_percent:
                Number(it.discount_percent) > 0
                  ? String(it.discount_percent)
                  : "",
              discount_amount: "",
              gst_percentage:
                Number(it.gst_percentage) || 0,
              tax_amount: 0,
              amount: Number(it.total_amount) || 0,
            }))
          : [];

        setTabs((prev) =>
          prev.map((tab, ti) => {
            if (ti !== 0) return tab;

            return {
              ...tab,
              title: `Return of ${d.purchase_no || "Purchase"}`,
              partyInput: d.supplier_name || sup.supplier_name || "",
              selectedSupplier: d.supplier_id
                ? {
                    id: d.supplier_id,
                    supplier_name:
                      d.supplier_name || sup.supplier_name || "",
                    phone: sup.mobile_number || "",
                    pending_balance: 0,
                  }
                : null,
              supplierPhone: sup.mobile_number || "",
              billNo: d.purchase_no || "",
              billDate: d.purchase_date || "",
              stateOfSupply: d.state_of_supply || "Tamil Nadu",
              paymentType: d.payment_type || "Cash",
              items: [
                createEmptyRow(true),
                ...rows,
                createEmptyRow(false),
              ],
            };
          })
        );
      })
      .catch((err) =>
        console.error(
          "Error prefilling debit note from purchase:",
          err
        )
      );

    return () => {
      cancelled = true;
    };
  }, [purchaseId, isEditMode]);

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
  // Delegates to utils/gst.js, which is the same calculator the purchase bill
  // and the backend use. The inline version here re-implemented the two
  // branches without any rounding, so it could drift from the rest of the app
  // by a paisa, and that drift was persisted.
  const calculateRow = (row, taxMode = activeTab.globalTaxMode) => {
    const discPct = parseFloat(row.discount_percent) || 0;
    const discAmtGiven = parseFloat(row.discount_amount) || 0;

    const line = calculateLine({
      price: parseFloat(row.price) || 0,
      quantity: parseFloat(row.quantity) || 0,
      gstRate: parseFloat(row.gst_percentage) || 0,
      // The document-level toggle still wins, because that is how this form has
      // always been used; it is just expressed in the canonical vocabulary.
      priceType: taxMode,
      discount: discPct > 0 ? 0 : discAmtGiven,
      discountPercent: discPct > 0 ? discPct : 0,
    });

    return {
      ...row,
      discount_amount: line.discount > 0 ? line.discount : "",
      tax_amount: line.gst,
      amount: line.total,
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
    // The old line read `prod.tax_rate || prod.gst_rate`, but the products table
    // has neither - the column is `gst_percentage`. That silently produced 0 for
    // every product, so purchase debit notes were raised at 0% GST.
    const pricing = resolveProductPricing(prod, { use: "purchase" });
    // A product saved as "With GST" should return at the same rate the purchase
    // was billed at, unless the user has deliberately overridden the document
    // toggle.
    const savedMode = pricing.priceType;
    const useSavedMode = activeTab.globalTaxMode === DEFAULT_TAX_MODE;
    const nextTaxMode = useSavedMode ? savedMode : activeTab.globalTaxMode;

    let row = {
      ...updated[index],
      product_id: prod.id,
      product_name: prod.name || prod.product_name,
      product_code: prod.product_code || "",
      barcode: prod.barcode || "",
      quantity: updated[index].quantity ? updated[index].quantity : 1,
      unit: prod.unit || "NONE",
      price: pricing.price || "",
      gst_percentage: pricing.gstRate,
    };

    row = calculateRow(row, nextTaxMode);
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
  const { totalQty, totalDiscount, totalTax, totalSubTotal, calculatedTotal, roundOffVal, grandTotal } = useMemo(() => {
    let tQty = 0;
    let tDisc = 0;
    let tTax = 0;
    let tSub = 0;
    let rawTotal = 0;

    activeTab.items.forEach((r, idx) => {
      if (idx === 0 && !r.product_name) return; // skip empty lightning row
      const q = parseFloat(r.quantity) || 0;
      tQty += q;
      tDisc += parseFloat(r.discount_amount) || 0;
      tTax += parseFloat(r.tax_amount) || 0;
      rawTotal += parseFloat(r.amount) || 0;
      // Taxable base comes from each line's own calculation, not from
      // `total - tax`. The back-derivation only holds in inclusive mode, so on
      // the default exclusive mode it understated sub_total by the whole tax.
      tSub += (parseFloat(r.amount) || 0) - (parseFloat(r.tax_amount) || 0);
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
      totalSubTotal: tSub,
      calculatedTotal: rawTotal,
      roundOffVal: diff,
      grandTotal: rounded,
    };
  }, [activeTab.items, activeTab.roundOffEnabled]);

  // Save Debit Note
  const handleSaveDebitNote = async () => {
    setErrorMsg("");
    const validItems = activeTab.items
      .filter((r, idx) => (idx > 0 || r.product_name) && r.product_name && (parseFloat(r.quantity) || 0) > 0);

    if (validItems.length === 0) {
      setErrorMsg("Please enter at least one item with a valid product name and quantity.");
      return;
    }

    if (!activeTab.partyInput && !activeTab.selectedSupplier) {
      setErrorMsg("Please select or enter a Supplier (Party).");
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
        sub_total: totalSubTotal,
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
        const savedReturnNo = res.data.return_no || res.data.invoice_no || activeTab.returnNo;
        if (isEditMode) {
          setToast(`Debit Note #${savedReturnNo} updated successfully!`);
          setTimeout(() => navigate("/purchases/debit-note"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Debit Note #${savedReturnNo} saved successfully!`);
            setTimeout(() => setToast(null), 4000);

            // Fetch next sequential debit note number from settings
            let nextReturnNo = "";
            try {
              const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=debit_note`);
              if (numRes.data?.status && numRes.data?.formatted_number) {
                nextReturnNo = numRes.data.formatted_number;
              } else {
                nextReturnNo = `DN-${String(existingCount + 2).padStart(4, "0")}`;
              }
            } catch (e) {
              nextReturnNo = `DN-${String(existingCount + 2).padStart(4, "0")}`;
            }

            // Reset active tab for continuous next debit note data entry
            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === activeTabId
                  ? createNewDebitNoteTab(tab.id, 1, nextReturnNo)
                  : tab
              )
            );
          } else {
            navigate(`/invoice/${savedReturnNo}`);
          }
        }
      } else {
        setErrorMsg(res.data.message || "Failed to save Debit Note.");
      }
    } catch (err) {
      console.error("Error saving debit note:", err);
      setErrorMsg("Failed to save Debit Note.");
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 antialiased">
      
      {/* ── 1. EXECUTIVE COMMAND BAR & DEBIT NOTE VOUCHER TAB ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 pt-3 pb-0 shadow-xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          
          {/* Voucher Workspace Tab Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTabId;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group relative flex items-center px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer border-t-2 ${
                    isActive
                      ? "border-blue-600 bg-slate-50 text-blue-700 shadow-xs"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Receipt size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.returnNo || "Draft"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Close Tab"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              );
            })}

            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTab}
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition shadow-2xs cursor-pointer mb-1"
                title="Open another Debit Note"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 pb-2 flex-shrink-0">
            <HeaderSettingsButton
              variant="voucher"
              onClick={openSettings}
              isActive={isSettingsOpen}
              title="Customize Table Columns"
            />

            {/* Close Page */}
            <button
              type="button"
              onClick={() => setShowCloseModal(true)}
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
              type="button"
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Purchase Returns"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Purchase Return Desk
                </span>
                <span className="text-xs text-slate-400 font-medium">• Stock Reversal &amp; Debit Note Voucher</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Debit Note #${activeTab.returnNo}` : "New Debit Note"}
              </h1>
            </div>
          </div>

          {/* Quick Voucher Tools */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="Open calculator"
            >
              <Calculator size={14} className="text-emerald-600" />
              <span>Calculator</span>
            </button>

            {/* Tax Mode Switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <div
                onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer shadow-blue-500/20"
                title="Toggle tax inclusive / exclusive pricing"
              >
                <Percent size={15} />
                <span>Prices: {activeTab.globalTaxMode === "with_tax" ? "Tax Inclusive" : "Tax Exclusive"}</span>
                <ChevronDown size={13} className={`transition-transform ${showTaxModeDropdown ? "rotate-180" : ""}`} />
              </div>

              {showTaxModeDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in duration-100">
                  <div
                    onClick={() => handleTaxModeChange("without_tax")}
                    className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                      activeTab.globalTaxMode === "without_tax"
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Tax Exclusive</span>
                    {activeTab.globalTaxMode === "without_tax" && <Check size={14} />}
                  </div>
                  <div
                    onClick={() => handleTaxModeChange("with_tax")}
                    className={`px-3.5 py-2 text-xs font-bold cursor-pointer transition flex items-center justify-between ${
                      activeTab.globalTaxMode === "with_tax"
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>Tax Inclusive</span>
                    {activeTab.globalTaxMode === "with_tax" && <Check size={14} />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. MAIN FORM BODY ── */}
      <main className="flex-1 w-full">

        {/* Success Toast & Error Alerts */}
        {toast && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="px-4 py-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-rose-500 hover:text-rose-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── A. SUPPLIER INTELLIGENCE & RETURN PARAMETERS CARDS ── */}
        <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">

          {/* Left 7 Columns: Supplier & Vendor Profile */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between" ref={partyRef}>
            <div>
              <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier &amp; Vendor Information</h3>
                    <p className="text-[11px] text-slate-400">Search vendor directory or select registered supplier</p>
                  </div>
                </div>

                {activeTab.selectedSupplier &&
                  (() => {
                    const vendorDue = parseFloat(activeTab.selectedSupplier.pending_balance || 0);
                    return (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs border ${
                          vendorDue > 0
                            ? "bg-amber-50 border-amber-200 text-amber-800"
                            : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        {vendorDue > 0 ? (
                          <AlertCircle size={11} className="text-amber-600" />
                        ) : (
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        )}
                        <span>Due: ₹{fmtCurrency(vendorDue)}</span>
                      </span>
                    );
                  })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Supplier Autocomplete Search Input */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-600">
                      Supplier / Vendor Name <span className="text-rose-500">*</span>
                    </label>
                  </div>

                  <div
                    className={`relative border rounded-xl px-3.5 py-2 transition bg-white flex items-center justify-between ${
                      showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Search size={14} className="text-slate-400 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Search supplier by name or phone..."
                        value={activeTab.partyInput}
                        onChange={(e) => {
                          updateActiveTab({ partyInput: e.target.value, selectedSupplier: null });
                          setShowPartyDropdown(true);
                        }}
                        onFocus={() => setShowPartyDropdown(true)}
                        className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                      />
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 cursor-pointer ml-1.5 flex-shrink-0 transition-transform ${
                        showPartyDropdown ? "rotate-180 text-blue-600" : ""
                      }`}
                      onClick={() => setShowPartyDropdown((prev) => !prev)}
                    />
                  </div>

                  {/* Selected Supplier Info & Balance Chip */}
                  {activeTab.selectedSupplier && (
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-[11px] shadow-2xs animate-in fade-in duration-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 truncate">
                          {activeTab.selectedSupplier.supplier_name || activeTab.selectedSupplier.name}
                        </span>
                        {activeTab.supplierPhone && (
                          <span className="text-slate-500 font-medium font-mono text-[10px] shrink-0">
                            • 📱 {activeTab.supplierPhone}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 font-medium">
                          Due:{" "}
                          <span
                            className={`font-bold font-mono ${
                              parseFloat(activeTab.selectedSupplier.pending_balance || 0) > 0
                                ? "text-rose-600 font-black"
                                : "text-slate-700"
                            }`}
                          >
                            ₹ {fmtCurrency(activeTab.selectedSupplier.pending_balance || 0)}
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Supplier Suggestions Dropdown */}
                  {showPartyDropdown && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 w-full bg-white rounded-2xl shadow-xl border border-slate-200 py-1 divide-y divide-slate-100 z-50 max-h-64 overflow-y-auto animate-in fade-in duration-100">
                      {filteredSuppliers.length > 0 ? (
                        filteredSuppliers.map((s) => {
                          const sDue = parseFloat(s.pending_balance || 0);
                          return (
                            <div
                              key={s.id}
                              onClick={() => handleSelectParty(s)}
                              className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                            >
                              <div>
                                <div className="font-bold text-slate-900">{s.supplier_name || s.name}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {s.phone || s.mobile_number || s.alt_mobile || "Registered Vendor"}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <span className="text-[9.5px] text-slate-400 font-semibold uppercase mr-1">Due:</span>
                                <span className={`font-bold text-xs ${sDue > 0 ? "text-rose-600 font-black" : "text-slate-700"}`}>
                                  ₹ {fmtCurrency(sDue)}
                                </span>
                              </div>
                            </div>
                          );
                        })
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

                {/* Phone number field */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Supplier Contact Phone</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Phone number"
                      value={activeTab.supplierPhone}
                      onChange={(e) => updateActiveTab({ supplierPhone: e.target.value })}
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Return Parameters */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Return Parameters</h3>
                  <p className="text-[11px] text-slate-400">Debit note reference &amp; original bill details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Debit Note Return # */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Debit Note Return #</label>
                  <input
                    type="text"
                    placeholder="Return #"
                    value={activeTab.returnNo}
                    onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Original Purchase Bill # */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Original Purchase Bill #</label>
                  <input
                    type="text"
                    placeholder="e.g. PUR-0082"
                    value={activeTab.billNo}
                    onChange={(e) => updateActiveTab({ billNo: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Original Bill Date */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Original Bill Date</label>
                  <input
                    type="date"
                    value={activeTab.billDate}
                    onChange={(e) => updateActiveTab({ billDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer transition"
                  />
                </div>

                {/* Return Date */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">Return Date</label>
                  <input
                    type="date"
                    value={activeTab.returnDate}
                    onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer transition"
                  />
                </div>

                {/* State of Supply */}
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 mb-1 block">State of Supply</label>
                  <select
                    value={activeTab.stateOfSupply}
                    onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer transition"
                  >
                    {indianStates.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── 4. RETURNED ITEMS MATRIX TABLE ── */}
        <div className="px-6 md:px-8 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={14} />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Returned Items &amp; Stock Reversal
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {activeTab.items.length} {activeTab.items.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Add Item Row</span>
              </button>
            </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-600 font-bold select-none text-[11px] uppercase tracking-wider">
                  <th className="w-12 py-3 px-3 text-center border-r border-slate-200/60">
                    <ScanBarcode size={15} className="mx-auto text-slate-400" />
                  </th>
                  <th className="py-3 px-4 min-w-[220px] border-r border-slate-200/60">Item Name / Product</th>
                  {isColumnVisible("quantity") && <th className="py-3 px-3 w-24 text-center border-r border-slate-200/60">Qty</th>}
                  {isColumnVisible("unit") && <th className="py-3 px-3 w-28 text-center border-r border-slate-200/60">Unit</th>}
                  {isColumnVisible("rate") && <th className="py-3 px-3 w-32 text-center border-r border-slate-200/60">Rate (₹)</th>}
                  {isColumnVisible("discount") && (
                    <th className="py-3 px-0 w-36 text-center border-r border-slate-200/60">
                      <div className="border-b border-slate-200/60 pb-1">Discount</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                        <span>%</span>
                        <span>Amount</span>
                      </div>
                    </th>
                  )}
                  {isColumnVisible("tax") && (
                    <th className="py-3 px-0 w-36 text-center border-r border-slate-200/60">
                      <div className="border-b border-slate-200/60 pb-1">Tax (GST)</div>
                      <div className="grid grid-cols-2 pt-1 font-semibold text-[10px] text-slate-500">
                        <span>% Slab</span>
                        <span>Tax (₹)</span>
                      </div>
                    </th>
                  )}
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
                          : "hover:bg-blue-50/30"
                      }`}
                    >
                      {/* Col 1: Lightning / Row # */}
                      <td className="py-2 px-3 text-center border-r border-slate-100">
                        {isLightning ? (
                          <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center mx-auto" title="Quick Add Lightning Row">
                            <Zap size={14} className="fill-blue-500 text-blue-500" />
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
                          className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
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
                                      className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs border-b border-slate-50 last:border-0"
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
                      {isColumnVisible("quantity") && (
                        <td className="py-2 px-2 text-center border-r border-slate-100">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                          />
                        </td>
                      )}

                      {/* Col 4: Unit */}
                      {isColumnVisible("unit") && (
                        <td className="py-2 px-2 text-center border-r border-slate-100">
                          <select
                            value={row.unit}
                            onChange={(e) => updateRow(idx, "unit", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition cursor-pointer"
                          >
                            {unitOptions.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Col 5: Rate */}
                      {isColumnVisible("rate") && (
                        <td className="py-2 px-2 text-center border-r border-slate-100">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={row.price}
                            onChange={(e) => updateRow(idx, "price", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                          />
                        </td>
                      )}

                      {/* Col 6: Discount (% & Amt) */}
                      {isColumnVisible("discount") && (
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
                      )}

                      {/* Col 7: Tax (% & Amt) */}
                      {isColumnVisible("tax") && (
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
                      )}

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

          {/* Table Footer: Live Totals */}
            <div className="px-5 py-3.5 bg-slate-50/60 border-t border-slate-200/80 flex flex-wrap items-center justify-end gap-5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="text-slate-500">Total Qty:</span>
                <span className="text-slate-900 font-black">{totalQty}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="text-slate-500">Discount:</span>
                  <span className="text-rose-600 font-black">-₹{fmtCurrency(totalDiscount)}</span>
                </div>
              )}
              {totalTax > 0 && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className="text-slate-500">GST Tax:</span>
                  <span className="text-emerald-600 font-black">+₹{fmtCurrency(totalTax)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className="text-slate-500">Subtotal:</span>
                <span className="text-slate-900 font-black font-mono text-sm">₹{fmtCurrency(calculatedTotal)}</span>
              </div>
            </div>
          </div>
        </div>

{/* ── 5. FINANCIAL RECONCILIATION & SETTLEMENT SUMMARY ── */}
        <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* Left 7 Columns: Refund Settlement & Reason */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Receipt size={14} />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Refund Settlement &amp; Return Reason</h3>
            </div>

            {/* Refund Type Selection Chips */}
            <div className="pt-1">
              <label className="text-[11px] font-bold text-slate-600 mb-1.5 block">Refund Settlement Mode</label>
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
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-600/20"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Return Reason / Description */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600">Reason for Return / Remarks</label>
                {!activeTab.showDescription && (
                  <button
                    type="button"
                    onClick={() => updateActiveTab({ showDescription: true })}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
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
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 resize-none transition"
                />
              ) : (
                <div
                  onClick={() => updateActiveTab({ showDescription: true })}
                  className="px-3.5 py-3 border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs cursor-pointer hover:bg-slate-50 transition"
                >
                  Click to add reason for debit note (e.g. Quality defect, Wrong shipment, Rate dispute)...
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Financial Breakdown & Settlement */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Wallet size={14} />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Debit Note Summary</span>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                INR (₹)
              </span>
            </div>

            {/* Breakdown */}
            <div className="space-y-2.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Total Returned Qty</span>
                <span className="font-bold text-slate-900">{totalQty}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Return Base Subtotal</span>
                <span className="font-bold text-slate-900">₹ {fmtCurrency(totalSubTotal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Tax (GST)</span>
                <span className={`font-bold ${totalTax > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                  {totalTax > 0 ? `+ ₹ ${fmtCurrency(totalTax)}` : "₹ 0.00"}
                </span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span>Total Discount</span>
                  <span className="font-bold text-rose-600">- ₹ {fmtCurrency(totalDiscount)}</span>
                </div>
              )}
            </div>

            {/* Grand Total Hero Box */}
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
              <div>
                <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
                  Total Debit Value
                </span>
                <span className="text-2xl font-black tracking-tight">
                  ₹ {fmtCurrency(grandTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase">
                  Debit Note
                </span>
              </div>
            </div>

            {/* Settlement: Round Off & Refund Mode */}
            <div className="pt-2 space-y-2 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center">
                <label className="flex items-center gap-2 font-bold text-slate-700 uppercase text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeTab.roundOffEnabled}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>Auto Round Off</span>
                </label>
                <span className="font-bold text-slate-600">
                  {roundOffVal !== 0 ? (roundOffVal > 0 ? `+₹${roundOffVal.toFixed(2)}` : `-₹${Math.abs(roundOffVal).toFixed(2)}`) : "₹0.00"}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-600">Settlement Mode</span>
                <span className="text-xs font-black text-blue-600">{activeTab.paymentType}</span>
              </div>
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-600">Return Reference</span>
                <span className="text-xs font-black font-mono text-slate-900">{activeTab.billNo || "—"}</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* ── 6. STICKY ACTION FOOTER BAR ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 z-30 flex items-center justify-between shadow-lg">
        <button
          type="button"
          onClick={() => setShowCloseModal(true)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
        >
          Discard / Back
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 mr-2">
            <span>Items: <strong className="text-slate-900">{totalQty}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-blue-600 font-mono font-black">₹{fmtCurrency(grandTotal)}</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer"
            >
              Calculator
            </button>
            <button
              type="button"
              onClick={handleSaveDebitNote}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition"
            >
              {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
              <span>{saving ? "Processing..." : "Save Debit Note"}</span>
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

      {/* Table Column Settings Drawer */}
      <CommonTableColumnSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        columns={tableColumns}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        title="Customize Return Items Columns"
      />

    </div>
  );
}
