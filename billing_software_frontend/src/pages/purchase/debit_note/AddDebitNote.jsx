import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import HeaderSettingsButton from "../../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../../components/CommonTableColumnSettings";
import useTableColumns from "../../../hooks/useTableColumns";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  ChevronDown,
  Search,
  RefreshCw,
  ArrowLeft,
  Building2,
  Truck,
  FileText,
  AlertCircle,
  Layers,
  Percent,
  Receipt,
  Phone,
  CreditCard,
  CornerUpLeft,
  Save,
  CheckCircle2,
  Sparkles,
  DollarSign,
  Check,
  Zap,
  SlidersHorizontal,
} from "lucide-react";

const DEFAULT_ITEM_COLUMNS = [
  { key: "product_name", label: "Product Name", icon: Layers, color: "text-blue-600", bg: "bg-blue-50", desc: "Return product description" },
  { key: "quantity", label: "Quantity", icon: Layers, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Return quantity" },
  { key: "unit", label: "Unit", icon: Percent, color: "text-purple-600", bg: "bg-purple-50", desc: "Unit of measurement" },
  { key: "price", label: "Price / Unit", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Original unit price" },
  { key: "discount", label: "Discount", icon: Percent, color: "text-amber-600", bg: "bg-amber-50", desc: "Discount percent & amount" },
  { key: "tax", label: "Tax (GST)", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "GST tax rate & amount" },
  { key: "amount", label: "Amount", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Total line item return value" },
];

const unitOptions = [
  "NONE", "PCS", "Box", "Pack", "Kg", "Gram", "Litre", "ML", "Meter", "Feet", "Dozen", "Pair", "Roll", "Bag", "Bottle", "Can", "Set"
];

const gstSlabs = [
  { label: "0% GST", value: 0 },
  { label: "5% GST", value: 5 },
  { label: "12% GST", value: 12 },
  { label: "18% GST", value: 18 },
  { label: "28% GST", value: 28 }
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
    unit: "PCS",
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
    returnNo: returnNoValue ? String(returnNoValue) : `DN-${String(index).padStart(4, "0")}`,
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
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition cursor-pointer"
          >
            OK, Discard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddDebitNote() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const isEditMode = Boolean(editId);
  const [searchParams] = useSearchParams();
  const purchaseId = searchParams.get("purchase_id");

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
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Column customization drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("debit_note_item_columns", DEFAULT_ITEM_COLUMNS);

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

  // Load Suppliers and Products Catalog
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

        // 3. Formatted number from settings
        try {
          const numRes = await api.get(`/invoice-settings/next-number?company_id=${cid || 0}&type=debit_note`);
          if (numRes.data?.status && numRes.data?.formatted_number) {
            if (!isEditMode) {
              updateActiveTab({ returnNo: numRes.data.formatted_number });
            }
          } else {
            const countRes = await api.get(`/debit_note/list?company_id=${cid || 0}`);
            const cnt = countRes.data?.count || 0;
            setExistingCount(cnt);
            if (!isEditMode) {
              updateActiveTab({ returnNo: `DN-${String(cnt + 1).padStart(4, "0")}` });
            }
          }
        } catch {
          if (!isEditMode) {
            updateActiveTab({ returnNo: "DN-0001" });
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
                unit: r.unit || "PCS",
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

  // If opened from Reports → Purchase → "Convert To Return" (?purchase_id=X)
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
              unit: it.unit && it.unit !== "NONE" ? it.unit : "PCS",
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
      unit: prod.unit || "PCS",
      price: unitPrice || "",
      gst_percentage: gstRate,
    };

    row = calculateRow(row, activeTab.globalTaxMode);
    updated[index] = row;

    if (index === 0) {
      updated.splice(1, 0, { ...row, id: Date.now() + Math.random() });
      updated[0] = createEmptyRow(true);
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

  // Calculate Totals Summary
  const { totalQty, totalDiscount, totalTax, calculatedTotal, roundOffVal, grandTotal } = useMemo(() => {
    let tQty = 0;
    let tDisc = 0;
    let tTax = 0;
    let rawTotal = 0;

    activeTab.items.forEach((r, idx) => {
      if (idx === 0 && !r.product_name) return;
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
      diff = Number((rounded - rawTotal).toFixed(2));
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
        const savedReturnNo = res.data.return_no || res.data.invoice_no || activeTab.returnNo;
        if (isEditMode) {
          setToast(`Debit Note #${savedReturnNo} updated successfully!`);
          setTimeout(() => navigate("/purchases/return"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Debit Note #${savedReturnNo} saved successfully!`);
            setTimeout(() => setToast(null), 4000);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-20">
      {/* ── 1. EXECUTIVE COMMAND BAR & DEBIT NOTE TABS ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 pt-3 pb-0 shadow-xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          {/* Voucher Workspace Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
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
                    <CornerUpLeft size={13} className={isActive ? "text-blue-600" : "text-slate-400"} />
                    <span>{tab.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                      {tab.returnNo || "Draft"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-slate-200/80 transition"
                    title="Close tab"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}

            {/* + Add New Return Tab */}
            {!isEditMode && (
              <button
                type="button"
                onClick={handleAddTab}
                className="h-8 px-2.5 mb-1 flex items-center gap-1.5 rounded-lg text-blue-600 hover:bg-blue-50 text-xs font-semibold border border-dashed border-blue-300 transition cursor-pointer"
                title="Add New Purchase Return"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span className="hidden sm:inline">New Return</span>
              </button>
            )}
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2 pb-2 flex-shrink-0">
            {/* Tax Mode Switcher Button */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
              >
                <Percent size={13} className="text-blue-600" />
                <span>{activeTab.globalTaxMode === "with_tax" ? "Tax Inclusive" : "Tax Exclusive"}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

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

            <HeaderSettingsButton
              variant="voucher"
              onClick={() => setShowColumnDrawer(true)}
              isActive={showColumnDrawer}
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
              onClick={() => setShowCloseModal(true)}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Purchase Returns"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                  Purchase Return Desk
                </span>
                <span className="text-xs text-slate-400 font-medium">• Supplier Debit Voucher</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isEditMode ? `Edit Debit Note #${activeTab.returnNo}` : "Purchase Return & Supplier Credit Desk"}
              </h1>
            </div>
          </div>
        </div>

        {/* Success Toast & Error Alerts */}
        {toast && (
          <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700">
              <X size={14} />
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-700">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── 3. SUPPLIER INTELLIGENCE & BILL REFERENCE CARDS ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Supplier Intelligence Card (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Truck size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier / Vendor Profile</h3>
                <p className="text-[11px] text-slate-400">Select supplier receiving returned items for accounts payable adjustment</p>
              </div>
            </div>

            {activeTab.selectedSupplier && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 size={11} /> Linked Supplier
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Supplier Search Box */}
            <div ref={partyRef} className="relative sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                Supplier / Vendor (Party) <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative border rounded-xl px-3.5 py-2.5 transition bg-white flex items-center justify-between ${
                  showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                }`}
              >
                <div className="flex items-center gap-2.5 w-full">
                  <Search size={15} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search supplier by name or phone..."
                    value={activeTab.partyInput}
                    onChange={(e) => {
                      updateActiveTab({ partyInput: e.target.value, selectedSupplier: null });
                      setShowPartyDropdown(true);
                    }}
                    onFocus={() => setShowPartyDropdown(true)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                <ChevronDown
                  size={15}
                  onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  className="text-slate-400 cursor-pointer flex-shrink-0"
                />
              </div>

              {/* Suggestions Popover */}
              {showPartyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 py-1.5 animate-in fade-in">
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectParty(s)}
                        className="px-4 py-2.5 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{s.supplier_name || s.name}</div>
                          {s.phone && <div className="text-[11px] text-slate-400 flex items-center gap-1"><Phone size={10} /> {s.phone}</div>}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Pending Payable</span>
                          <span className="text-xs font-bold text-red-600">
                            ₹ {fmtCurrency(s.pending_balance || 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No matching supplier found. Will create <strong>"{activeTab.partyInput}"</strong> on save.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Supplier Phone */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 mb-1 block">Supplier Contact Phone</label>
              <div className="relative border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="Phone number..."
                  value={activeTab.supplierPhone}
                  onChange={(e) => updateActiveTab({ supplierPhone: e.target.value })}
                  className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Selected Supplier Status pill */}
            <div className="flex flex-col justify-end">
              {activeTab.selectedSupplier ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Payable Balance:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-red-600">
                      ₹ {fmtCurrency(activeTab.selectedSupplier.pending_balance || 0)} (Due to Vendor)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-center text-[11px] text-slate-400 italic">
                  One-off supplier return mode
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Return & Purchase Reference Card (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Return & Bill Parameters</h3>
              <p className="text-[11px] text-slate-400">Debit note ref & original purchase linkages</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Debit Note Return # */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Receipt size={13} className="text-slate-400" /> Return Voucher #
              </span>
              <input
                type="text"
                value={activeTab.returnNo}
                onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
                className="w-40 text-right font-mono font-bold text-xs text-blue-700 bg-blue-50/50 border border-blue-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
              />
            </div>

            {/* Original Purchase Bill # */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <FileText size={13} className="text-slate-400" /> Orig. Purchase Bill #
              </span>
              <input
                type="text"
                placeholder="Optional ref #..."
                value={activeTab.billNo}
                onChange={(e) => updateActiveTab({ billNo: e.target.value })}
                className="w-40 text-right font-medium text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500"
              />
            </div>

            {/* Return Date */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-400" /> Return Date
              </span>
              <input
                type="date"
                value={activeTab.returnDate}
                onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            {/* State of Supply */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                <Building2 size={13} className="text-slate-400" /> Place of Supply
              </span>
              <select
                value={activeTab.stateOfSupply}
                onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                className="w-40 text-right font-semibold text-xs text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DYNAMIC RETURNED LINE ITEMS MATRIX ── */}
      <div className="px-6 md:px-8 mb-6">
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Returned Goods Line Items</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                {activeTab.items.filter((r, i) => i > 0 || r.product_name).length} Items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HeaderSettingsButton
                onClick={() => setShowColumnDrawer(true)}
                tooltip="Customise item table columns"
                variant="voucher"
                isActive={showColumnDrawer}
              />
              <button
                type="button"
                onClick={addRow}
                className="app-btn-primary px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Return Row</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/60 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-3.5 border-r border-slate-200 w-12 text-center">#</th>
                  {visibleColumns.product_name && (
                    <th className="py-3 px-4 border-r border-slate-200 min-w-[260px]">ITEM NAME / PRODUCT</th>
                  )}
                  {visibleColumns.quantity && (
                    <th className="py-3 px-3 border-r border-slate-200 w-24 text-right">QTY</th>
                  )}
                  {visibleColumns.unit && (
                    <th className="py-3 px-3 border-r border-slate-200 w-24">UNIT</th>
                  )}
                  {visibleColumns.price && (
                    <th className="py-3 px-3 border-r border-slate-200 w-36 text-right">RATE (₹)</th>
                  )}
                  {visibleColumns.discount && (
                    <th className="py-3 px-3 border-r border-slate-200 w-32 text-right">DISCOUNT</th>
                  )}
                  {visibleColumns.tax && (
                    <th className="py-3 px-3 border-r border-slate-200 w-32 text-right">TAX (GST)</th>
                  )}
                  {visibleColumns.amount && (
                    <th className="py-3 px-4 border-r border-slate-200 w-36 text-right">AMOUNT (₹)</th>
                  )}
                  <th className="py-3 px-3 w-16 text-center">ACTION</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {activeTab.items.map((row, idx) => {
                  const isLightning = idx === 0;
                  const isProductSearchOpen = activeProductSearchIndex === idx;

                  return (
                    <tr
                      key={row.id || idx}
                      className={`hover:bg-blue-50/25 transition-colors group ${
                        isLightning ? "bg-amber-50/40 border-b border-amber-200/60" : ""
                      }`}
                    >
                      {/* Index / Lightning Badge */}
                      <td className="py-2.5 px-3.5 border-r border-slate-200 text-center font-mono text-slate-400 text-xs">
                        {isLightning ? (
                          <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center mx-auto" title="Quick Add Lightning Row">
                            <Zap size={13} className="fill-amber-500 text-amber-500" />
                          </div>
                        ) : (
                          idx
                        )}
                      </td>

                      {/* Product Name Autocomplete */}
                      {visibleColumns.product_name && (
                        <td className="py-2 px-3 border-r border-slate-200 relative">
                          <input
                            type="text"
                            placeholder={isLightning && !row.product_name ? "⚡ Type item name for instant lightning add..." : "Search catalog product..."}
                            value={row.product_name}
                            onChange={(e) => {
                              updateRow(idx, "product_name", e.target.value);
                              setActiveProductSearchIndex(idx);
                            }}
                            onFocus={() => setActiveProductSearchIndex(idx)}
                            className="w-full bg-transparent outline-none font-semibold text-slate-800 text-xs placeholder:font-normal placeholder:text-slate-400"
                          />

                          {/* Suggestions Popover */}
                          {isProductSearchOpen && (
                            <div
                              ref={productSuggestRef}
                              className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 py-1"
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

                                return filtered.slice(0, 15).map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => handleSelectProduct(idx, p)}
                                    className="px-3.5 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between text-xs border-b border-slate-50 last:border-none transition"
                                  >
                                    <div>
                                      <span className="font-bold text-slate-800">{p.product_name || p.name}</span>
                                      <span className="text-[10px] text-slate-400 ml-2">Stock: {p.stock || 0}</span>
                                    </div>
                                    <span className="text-blue-600 font-mono font-bold">
                                      ₹{parseFloat(p.purchase_price || p.price || 0).toLocaleString()}
                                    </span>
                                  </div>
                                ));
                              })()}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Qty */}
                      {visibleColumns.quantity && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0"
                            value={row.quantity}
                            onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                            className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                          />
                        </td>
                      )}

                      {/* Unit */}
                      {visibleColumns.unit && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <select
                            value={row.unit}
                            onChange={(e) => updateRow(idx, "unit", e.target.value)}
                            className="w-full bg-transparent outline-none text-slate-700 text-xs font-semibold cursor-pointer rounded px-1 py-1"
                          >
                            {unitOptions.map((u) => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Rate */}
                      {visibleColumns.price && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={row.price}
                            onChange={(e) => updateRow(idx, "price", e.target.value)}
                            className="w-full text-right outline-none bg-transparent font-bold text-slate-800 text-xs focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1"
                          />
                        </td>
                      )}

                      {/* Discount */}
                      {visibleColumns.discount && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              placeholder="%"
                              value={row.discount_percent || ""}
                              onChange={(e) => {
                                updateRow(idx, "discount_percent", e.target.value);
                                updateRow(idx, "discount_amount", "");
                              }}
                              className="w-11 text-right outline-none bg-transparent font-semibold text-slate-700 text-xs focus:bg-white rounded px-1 py-0.5"
                            />
                            <span className="text-slate-300">|</span>
                            <input
                              type="number"
                              placeholder="₹"
                              value={row.discount_amount || ""}
                              onChange={(e) => {
                                updateRow(idx, "discount_amount", e.target.value);
                                updateRow(idx, "discount_percent", "");
                              }}
                              className="w-12 text-right outline-none bg-transparent font-semibold text-slate-700 text-xs focus:bg-white rounded px-1 py-0.5"
                            />
                          </div>
                        </td>
                      )}

                      {/* Tax (GST) */}
                      {visibleColumns.tax && (
                        <td className="py-2 px-2 border-r border-slate-200">
                          <div className="flex items-center justify-end gap-1">
                            <select
                              value={row.gst_percentage}
                              onChange={(e) => updateRow(idx, "gst_percentage", e.target.value)}
                              className="bg-transparent outline-none text-xs font-semibold text-slate-700 cursor-pointer"
                            >
                              {gstSlabs.map((s, i) => (
                                <option key={i} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                            <span className="text-slate-300">|</span>
                            <span className="text-[11px] font-mono font-medium text-slate-500 w-12 text-right">
                              {row.tax_amount ? `₹${row.tax_amount.toFixed(1)}` : "0.0"}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Amount */}
                      {visibleColumns.amount && (
                        <td className="py-2 px-4 border-r border-slate-200 text-right font-black text-slate-900 text-xs font-mono">
                          ₹{row.amount ? fmtCurrency(row.amount) : "0.00"}
                        </td>
                      )}

                      {/* Action */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        {!isLightning && (
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
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

              {/* Table Footer Totals */}
              <tfoot>
                <tr className="bg-slate-100/80 font-bold text-slate-800 border-t-2 border-slate-200 text-xs">
                  <td colSpan={visibleColumns.product_name ? 2 : 1} className="py-3 px-4 border-r border-slate-200">
                    <button
                      type="button"
                      onClick={addRow}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>ADD RETURN ITEM</span>
                    </button>
                  </td>
                  {visibleColumns.quantity && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-black">{totalQty}</td>
                  )}
                  {visibleColumns.unit && (
                    <td className="py-3 px-3 border-r border-slate-200"></td>
                  )}
                  {visibleColumns.price && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-bold text-slate-500">TOTALS</td>
                  )}
                  {visibleColumns.discount && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                      -₹{fmtCurrency(totalDiscount)}
                    </td>
                  )}
                  {visibleColumns.tax && (
                    <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-700">
                      +₹{fmtCurrency(totalTax)}
                    </td>
                  )}
                  {visibleColumns.amount && (
                    <td className="py-3 px-4 border-r border-slate-200 text-right text-sm text-blue-700 font-black font-mono">
                      ₹{fmtCurrency(calculatedTotal)}
                    </td>
                  )}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ── 5. SETTLEMENT & REVERSAL SUMMARY ── */}
      <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
        {/* Left: Settlement Mode & Return Reason (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard size={16} className="text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Refund Settlement & Reason</h3>
          </div>

          {/* Refund Settlement Mode Chips */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-2 block">Settlement Mode</label>
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
                        ? "app-pill-active"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reason / Remarks */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 mb-1 block">Return Reason / Notes</label>
            <textarea
              rows={2}
              placeholder="Enter return reason (e.g. Defective batch, wrong shipment, price rate dispute)..."
              value={activeTab.description}
              onChange={(e) => updateActiveTab({ description: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-xs text-slate-800 outline-none focus:border-blue-500 font-medium resize-none bg-slate-50/50"
            />
          </div>
        </div>

        {/* Right: Financial Reconciliation & Grand Total Billboard (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <DollarSign size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Return Financial Valuation</h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Taxable Return Value */}
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold">Taxable Return Value</span>
                <span className="font-mono font-bold text-slate-900">
                  ₹ {fmtCurrency(calculatedTotal - totalTax + totalDiscount)}
                </span>
              </div>

              {/* Total Discount */}
              {totalDiscount > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Discount Reversal</span>
                  <span className="font-mono font-bold text-red-600">-₹ {fmtCurrency(totalDiscount)}</span>
                </div>
              )}

              {/* Total GST Tax */}
              {totalTax > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-semibold">Input GST Reversal</span>
                  <span className="font-mono font-bold text-slate-900">+₹ {fmtCurrency(totalTax)}</span>
                </div>
              )}

              {/* Auto Round Off */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={Boolean(activeTab.roundOffEnabled)}
                    onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer accent-blue-600"
                  />
                  <span className="font-bold text-slate-700">Auto Round-Off</span>
                </label>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  {roundOffVal !== 0 ? (roundOffVal > 0 ? `+₹${roundOffVal}` : `-₹${Math.abs(roundOffVal)}`) : "₹0.00"}
                </span>
              </div>
            </div>
          </div>

          {/* Grand Total Hero Banner */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
              <div className="flex items-center justify-between text-blue-100 text-[11px] font-bold uppercase tracking-wider mb-1">
                <span>Total Debit Note Valuation</span>
                <span className="px-2 py-0.5 rounded bg-white/15 text-white font-mono text-[10px]">Net Return</span>
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                ₹ {fmtCurrency(grandTotal)}
              </div>
              <div className="mt-2 text-[11px] text-blue-100/90 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span>
                  {activeTab.paymentType === "Credit"
                    ? "Reduces supplier outstanding payable ledger"
                    : `Refunded to business via ${activeTab.paymentType}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. STICKY COMMAND FOOTER ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
          >
            Discard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDebitNote}
            className="app-btn-primary px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-md shadow-blue-500/25 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{isEditMode ? "Update Debit Note" : "Save Debit Note"}</span>
          </button>
        </div>
      </div>

      {/* Close Confirm Modal */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases/return")}
      />

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_ITEM_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in debit note items"
      />
    </div>
  );
}
