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
  ChevronsUpDown
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          width: 440,
          maxWidth: "92vw",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
          overflow: "hidden",
          border: "1px solid #e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e3a47" }}>Close Debit Note</h3>
          <button onClick={onCancel} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#374151" }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
          Current changes will be discarded. Do you wish to continue?
        </div>
        <div style={{ padding: "12px 20px", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={onCancel}
            style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "7px 20px", borderRadius: 6, border: "none", background: "#1d72fe", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            OK
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
        // eslint-disable-next-line no-eval
        const res = eval(calcInput.replace(/×/g, "*").replace(/÷/g, "/"));
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          width: 280,
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          overflow: "hidden"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "10px 14px", background: "#1e293b", color: "#ffffff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>Calculator</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#ffffff", cursor: "pointer" }}><X size={15} /></button>
        </div>
        <div style={{ padding: "14px", background: "#f8fafc", textAlign: "right", fontSize: 22, fontWeight: 800, color: "#0f172a", minHeight: 48, borderBottom: "1px solid #e2e8f0" }}>
          {calcInput || "0"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, padding: 12 }}>
          {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "C", "0", "=", "+"].map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => handleBtn(b)}
              style={{
                padding: "12px 0",
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 6,
                border: "1px solid #e2e8f0",
                background: b === "=" ? "#2563eb" : b === "C" ? "#fee2e2" : "#ffffff",
                color: b === "=" ? "#ffffff" : b === "C" ? "#dc2626" : "#1e293b",
                cursor: "pointer"
              }}
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
    <div style={{ background: "#f8fafc", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* ── 1. TOP TABS & UTILITY BAR (Exact Vyapar Reference) ── */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 42
        }}
      >
        {/* Multi-tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? "#1d72fe" : "#64748b",
                  borderBottom: isActive ? "2.5px solid #1d72fe" : "2.5px solid transparent",
                  background: isActive ? "#f8fafc" : "transparent",
                  cursor: "pointer",
                  borderRadius: "4px 4px 0 0"
                }}
              >
                <span>{tab.title}</span>
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#94a3b8", display: "flex" }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}

          {!isEditMode && (
            <button
              type="button"
              onClick={handleAddTab}
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#1d72fe",
                color: "#ffffff",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                marginLeft: 6
              }}
              title="Add New Debit Note Tab"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Right utility icons */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="button"
            onClick={() => setShowCalculator(true)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
            title="Open Calculator"
          >
            <Calculator size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowCloseModal(true)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4 }}
            title="Close Form"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── 2. PAGE HEADER TITLE ── */}
      <div style={{ padding: "12px 24px 4px 24px" }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Debit Note</h2>
      </div>

      {/* ── 3. MAIN FORM BODY ── */}
      <div style={{ flex: 1, padding: "8px 24px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Top Details Grid (Left Party, Right Voucher metadata) */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 32,
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          {/* Left: Party * & Phone No. */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              
              {/* Searchable Party Box with Instant Dropdown */}
              <div ref={partyRef} style={{ position: "relative", flex: 1 }}>
                <div
                  onClick={() => setShowPartyDropdown((prev) => !prev)}
                  style={{
                    position: "relative",
                    border: "1.5px solid #2563eb",
                    borderRadius: 6,
                    padding: "4px 12px",
                    background: "#ffffff",
                    cursor: "pointer"
                  }}
                >
                  <label
                    style={{
                      position: "absolute",
                      top: -9,
                      left: 10,
                      background: "#ffffff",
                      padding: "0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2563eb"
                    }}
                  >
                    Party *
                  </label>
                  <input
                    type="text"
                    placeholder="Search or select supplier..."
                    value={activeTab.partyInput}
                    onChange={(e) => {
                      updateActiveTab({ partyInput: e.target.value, selectedSupplier: null });
                      setShowPartyDropdown(true);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPartyDropdown(true);
                    }}
                    onFocus={() => setShowPartyDropdown(true)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#1e293b",
                      padding: "4px 0",
                      cursor: "text"
                    }}
                  />
                  <ChevronDown
                    size={16}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPartyDropdown((prev) => !prev);
                    }}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: `translateY(-50%) ${showPartyDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
                      transition: "transform 0.15s ease",
                      color: "#64748b",
                      cursor: "pointer"
                    }}
                  />
                </div>

                {/* Suppliers Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 40,
                      width: "100%",
                      background: "#ffffff",
                      borderRadius: 8,
                      boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
                      border: "1px solid #cbd5e1",
                      maxHeight: 220,
                      overflowY: "auto",
                      zIndex: 999
                    }}
                  >
                    {filteredSuppliers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectParty(s)}
                        style={{
                          padding: "9px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#eff6ff"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{s.supplier_name || s.name}</div>
                          {(s.phone || s.mobile_number) && (
                            <div style={{ fontSize: 11, color: "#64748b" }}>{s.phone || s.mobile_number}</div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10.5, color: "#94a3b8" }}>Balance</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                            ₹ {fmtCurrency(s.pending_balance || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <div style={{ padding: "12px 14px", fontSize: 12.5, color: "#64748b", textAlign: "center" }}>
                        Press Save to add <b>"{activeTab.partyInput}"</b> as a new supplier.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone No. */}
              <div
                style={{
                  width: 170,
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  padding: "4px 10px",
                  background: "#ffffff",
                  position: "relative"
                }}
              >
                <label style={{ position: "absolute", top: -9, left: 8, background: "#ffffff", padding: "0 4px", fontSize: 10, fontWeight: 600, color: "#64748b" }}>
                  Phone No.
                </label>
                <input
                  type="text"
                  placeholder="Phone No."
                  value={activeTab.supplierPhone}
                  onChange={(e) => updateActiveTab({ supplierPhone: e.target.value })}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 13, color: "#1e293b", padding: "4px 0" }}
                />
              </div>

            </div>

            {/* Live Party Balance indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              <span>Party Balance:</span>
              <span style={{ color: "#dc2626", fontWeight: 800 }}>
                ₹ {fmtCurrency(activeTab.selectedSupplier?.pending_balance || 0)}
              </span>
            </div>

          </div>

          {/* Right: Return No, Bill Number, Bill Date, Date, State of supply */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              
              {/* Return No. */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Return No.</span>
                <input
                  type="text"
                  value={activeTab.returnNo}
                  onChange={(e) => updateActiveTab({ returnNo: e.target.value })}
                  style={{ width: 80, border: "none", outline: "none", textAlign: "right", fontSize: 13, fontWeight: 700, color: "#1e293b" }}
                />
              </div>

              {/* Bill Number */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Bill Number</span>
                <input
                  type="text"
                  placeholder="e.g. PUR-001"
                  value={activeTab.billNo}
                  onChange={(e) => updateActiveTab({ billNo: e.target.value })}
                  style={{ width: 110, border: "none", outline: "none", textAlign: "right", fontSize: 13, fontWeight: 600, color: "#1e293b" }}
                />
              </div>

            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              
              {/* Bill Date */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Bill Date</span>
                <input
                  type="date"
                  value={activeTab.billDate}
                  onChange={(e) => updateActiveTab({ billDate: e.target.value })}
                  style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 600, color: "#1e293b", cursor: "pointer" }}
                />
              </div>

              {/* Return Date */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Date</span>
                <input
                  type="date"
                  value={activeTab.returnDate}
                  onChange={(e) => updateActiveTab({ returnDate: e.target.value })}
                  style={{ border: "none", outline: "none", fontSize: 12, fontWeight: 700, color: "#1e293b", cursor: "pointer" }}
                />
              </div>

            </div>

            {/* State of supply */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", paddingBottom: 4 }}>
              <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>State of supply</span>
              <select
                value={activeTab.stateOfSupply}
                onChange={(e) => updateActiveTab({ stateOfSupply: e.target.value })}
                style={{ border: "none", outline: "none", fontSize: 12.5, fontWeight: 700, color: "#1e293b", background: "transparent", cursor: "pointer" }}
              >
                {indianStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* ── 4. ITEMS TABLE (Exact Matches media_1788343634794.png) ── */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            overflow: "visible",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                
                {/* 1. Barcode Scanner Icon Header */}
                <th style={{ width: 44, padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                  <div
                    style={{
                      width: 32,
                      height: 26,
                      borderRadius: 4,
                      background: "#e6f9ed",
                      border: "1px solid #bbf7d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "auto"
                    }}
                  >
                    <ScanBarcode size={15} color="#059669" />
                  </div>
                </th>

                {/* 2. ITEM */}
                <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  ITEM
                </th>

                {/* 3. QTY */}
                <th style={{ width: 70, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  QTY
                </th>

                {/* 4. UNIT */}
                <th style={{ width: 96, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  UNIT
                </th>

                {/* 5. PRICE/UNIT Header (with Without Tax dropdown) */}
                <th style={{ width: 140, padding: "6px 8px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151", position: "relative" }}>
                  <div>PRICE/UNIT</div>
                  <div
                    onClick={() => setShowTaxModeDropdown(!showTaxModeDropdown)}
                    style={{
                      fontSize: 10.5,
                      color: "#6b7280",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 2,
                      marginTop: 2,
                      cursor: "pointer"
                    }}
                  >
                    <span>{activeTab.globalTaxMode === "with_tax" ? "With Tax" : "Without Tax"}</span>
                    <ChevronDown size={11} />
                  </div>

                  {showTaxModeDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#ffffff",
                        borderRadius: 6,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                        zIndex: 100,
                        width: 120,
                        padding: "4px 0"
                      }}
                    >
                      <div
                        onClick={() => handleTaxModeChange("without_tax")}
                        style={{ padding: "6px 12px", fontSize: 11, cursor: "pointer", color: "#334155" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        Without Tax
                      </div>
                      <div
                        onClick={() => handleTaxModeChange("with_tax")}
                        style={{ padding: "6px 12px", fontSize: 11, cursor: "pointer", color: "#334155" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        With Tax
                      </div>
                    </div>
                  )}
                </th>

                {/* 6. DISCOUNT Header (% & AMOUNT) */}
                <th style={{ width: 140, padding: 0, textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  <div style={{ padding: "5px 6px", borderBottom: "1px solid #e2e8f0" }}>DISCOUNT</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontSize: 10.5, color: "#6b7280", fontWeight: 500 }}>
                    <div style={{ padding: "3px 2px", borderRight: "1px solid #e2e8f0" }}>%</div>
                    <div style={{ padding: "3px 2px" }}>AMOUNT</div>
                  </div>
                </th>

                {/* 7. TAX Header (% & AMOUNT) */}
                <th style={{ width: 145, padding: 0, textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  <div style={{ padding: "5px 6px", borderBottom: "1px solid #e2e8f0" }}>TAX</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", fontSize: 10.5, color: "#6b7280", fontWeight: 500 }}>
                    <div style={{ padding: "3px 2px", borderRight: "1px solid #e2e8f0" }}>%</div>
                    <div style={{ padding: "3px 2px" }}>AMOUNT</div>
                  </div>
                </th>

                {/* 8. AMOUNT Header */}
                <th style={{ width: 110, padding: "8px 12px", textAlign: "right", fontWeight: 700, borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                  AMOUNT
                </th>
              </tr>
            </thead>

            <tbody>
              {activeTab.items.map((row, idx) => {
                const isLightning = idx === 0;
                const rowBg = isLightning ? "#eaf4fe" : "#ffffff";
                const isProductSearchOpen = activeProductSearchIndex === idx;

                return (
                  <tr
                    key={row.id || idx}
                    style={{
                      borderBottom: "1px solid #e2e8f0",
                      background: rowBg,
                      height: 44
                    }}
                  >
                    {/* Col 1: Zap ⚡ on row 0 or (↕ index 🗑️) on subsequent rows */}
                    <td style={{ textAlign: "center", padding: "6px 6px", borderRight: "1px solid #e2e8f0" }}>
                      {isLightning ? (
                        <Zap size={16} color="#2563eb" fill="#2563eb" style={{ margin: "auto" }} />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <span style={{ color: "#9ca3af", display: "flex", cursor: "grab" }}>
                            <ChevronsUpDown size={12} />
                          </span>
                          <span style={{ color: "#4b5563", fontWeight: 600, fontSize: 12 }}>{idx}</span>
                          <button
                            type="button"
                            onClick={() => deleteRow(idx)}
                            title="Delete row"
                            style={{ border: "none", background: "transparent", color: "#6b7280", cursor: "pointer", display: "flex", padding: 2 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Col 2: ITEM name input with autocomplete */}
                    <td style={{ padding: "6px 10px", position: "relative", borderRight: "1px solid #e2e8f0" }}>
                      <input
                        type="text"
                        placeholder={isLightning && !row.product_name ? "" : "Enter item name..."}
                        value={row.product_name}
                        onChange={(e) => {
                          updateRow(idx, "product_name", e.target.value);
                          setActiveProductSearchIndex(idx);
                        }}
                        onClick={() => setActiveProductSearchIndex(idx)}
                        onFocus={() => setActiveProductSearchIndex(idx)}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#0f172a"
                        }}
                      />

                      {/* Autocomplete suggestions */}
                      {isProductSearchOpen && (
                        <div
                          ref={productSuggestRef}
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            width: 330,
                            background: "#ffffff",
                            borderRadius: 6,
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                            zIndex: 9999,
                            marginTop: 2,
                            maxHeight: 220,
                            overflowY: "auto"
                          }}
                        >
                          {(() => {
                            const q = (row.product_name || "").toLowerCase().trim();
                            const selectedSupId = activeTab.selectedSupplier?.id;

                            // Filter supplier-specific products if a supplier is selected
                            let sourceList = productsCatalog;
                            if (selectedSupId) {
                              const supItems = productsCatalog.filter(
                                (p) => Number(p.supplier_id) === Number(selectedSupId)
                              );
                              if (supItems.length > 0) {
                                sourceList = supItems;
                              }
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
                                <div style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>
                                  {selectedSupId
                                    ? `No products found for ${activeTab.partyInput || "this supplier"}. Type to enter "${row.product_name}".`
                                    : `No products found. Type to enter "${row.product_name}".`}
                                </div>
                              );
                            }

                            return (
                              <>
                                {selectedSupId && sourceList.length > 0 && (
                                  <div style={{ padding: "6px 12px", background: "#f1f5f9", fontSize: 11, fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0" }}>
                                    📦 Products for {activeTab.partyInput || "Supplier"} ({filtered.length})
                                  </div>
                                )}
                                {filtered.slice(0, 15).map((p) => (
                                  <div
                                    key={p.id}
                                    onClick={() => handleSelectProduct(idx, p)}
                                    style={{
                                      padding: "9px 12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                      fontSize: 12,
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                                  >
                                    <div>
                                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{p.product_name || p.name}</div>
                                      <div style={{ fontSize: 11, color: "#64748b" }}>
                                        Stock: {p.stock || 0} {p.unit || ""} {p.product_code ? `• Code: ${p.product_code}` : ""}
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <div style={{ fontWeight: 700, color: "#2563eb" }}>
                                        ₹{parseFloat(p.purchase_price || p.price || 0).toLocaleString()}
                                      </div>
                                      <div style={{ fontSize: 10, color: "#94a3b8" }}>Rate</div>
                                    </div>
                                  </div>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Col 3: QTY */}
                    <td style={{ padding: "6px 6px", borderRight: "1px solid #e2e8f0" }}>
                      <input
                        type="number"
                        min="0"
                        placeholder=""
                        value={row.quantity}
                        onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0f172a"
                        }}
                      />
                    </td>

                    {/* Col 4: UNIT */}
                    <td style={{ padding: "6px 6px", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        <select
                          value={row.unit}
                          onChange={(e) => updateRow(idx, "unit", e.target.value)}
                          style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#374151",
                            cursor: "pointer",
                            textAlign: "center"
                          }}
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} color="#6b7280" />
                      </div>
                    </td>

                    {/* Col 5: PRICE/UNIT */}
                    <td style={{ padding: "6px 6px", borderRight: "1px solid #e2e8f0" }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder=""
                        value={row.price}
                        onChange={(e) => updateRow(idx, "price", e.target.value)}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#0f172a"
                        }}
                      />
                    </td>

                    {/* Col 6: DISCOUNT (% & AMOUNT) */}
                    <td style={{ padding: 0, borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                        <div style={{ borderRight: "1px solid #e2e8f0", padding: "6px 2px" }}>
                          <input
                            type="number"
                            placeholder=""
                            min="0"
                            max="100"
                            value={row.discount_percent || ""}
                            onChange={(e) => {
                              updateRow(idx, "discount_percent", e.target.value);
                              updateRow(idx, "discount_amount", "");
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              textAlign: "center",
                              fontSize: 12.5,
                              color: "#0f172a"
                            }}
                          />
                        </div>
                        <div style={{ padding: "6px 2px" }}>
                          <input
                            type="number"
                            placeholder=""
                            min="0"
                            value={row.discount_amount || ""}
                            onChange={(e) => {
                              updateRow(idx, "discount_amount", e.target.value);
                              updateRow(idx, "discount_percent", "");
                            }}
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              textAlign: "center",
                              fontSize: 12.5,
                              color: "#0f172a"
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Col 7: TAX (% & AMOUNT) */}
                    <td style={{ padding: 0, borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
                        <div style={{ borderRight: "1px solid #e2e8f0", padding: "6px 2px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <select
                            value={row.gst_percentage}
                            onChange={(e) => updateRow(idx, "gst_percentage", e.target.value)}
                            style={{
                              border: "none",
                              outline: "none",
                              background: "transparent",
                              fontSize: 11.5,
                              color: "#374151",
                              cursor: "pointer",
                              fontWeight: 500,
                              textAlign: "center"
                            }}
                          >
                            {gstSlabs.map((s, i) => (
                              <option key={i} value={s.value}>{s.label}</option>
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

                    {/* Col 8: AMOUNT */}
                    <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a", fontSize: 13 }}>
                      ₹{row.amount ? Number(row.amount).toFixed(2) : "0.00"}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Footer: ADD ROW button & Totals Summary */}
          <div
            style={{
              padding: "10px 16px",
              background: "#ffffff",
              borderTop: "1.5px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <button
              type="button"
              onClick={addRow}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 16px",
                borderRadius: 6,
                border: "1.5px solid #1d72fe",
                background: "#ffffff",
                color: "#1d72fe",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              <span>ADD ROW</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 32, fontSize: 13, fontWeight: 700, color: "#475569" }}>
              <div>TOTAL <span style={{ color: "#0f172a", marginLeft: 8 }}>{totalQty}</span></div>
              <div>{totalDiscount > 0 ? `₹${totalDiscount.toFixed(2)}` : "0"}</div>
              <div>{totalTax > 0 ? `₹${totalTax.toFixed(2)}` : "0"}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
                ₹{fmtCurrency(calculatedTotal)}
              </div>
            </div>
          </div>

        </div>

        {/* ── 5. SETTLEMENT AREA (Payment Type, Round Off, Grand Total) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            background: "#ffffff",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            padding: "16px 20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          {/* Left: Payment Type & Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* Payment Type */}
            <div style={{ width: 220 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Payment Type
              </label>
              <select
                value={activeTab.paymentType}
                onChange={(e) => updateActiveTab({ paymentType: e.target.value })}
                style={{
                  width: "100%",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#1e293b",
                  background: "#ffffff",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="Cash">Cash</option>
                <option value="Online">Online / Netbanking</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit (Adjust Supplier Debt)</option>
              </select>
            </div>

            {/* Description Toggle */}
            {!activeTab.showDescription ? (
              <button
                type="button"
                onClick={() => updateActiveTab({ showDescription: true })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  width: "fit-content"
                }}
              >
                <AlignLeft size={14} />
                <span>+ ADD DESCRIPTION</span>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>Description / Return Reason</span>
                <textarea
                  rows="2"
                  placeholder="Enter reason for purchase return..."
                  value={activeTab.description}
                  onChange={(e) => updateActiveTab({ description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                    outline: "none"
                  }}
                />
              </div>
            )}

          </div>

          {/* Right: Round Off & Grand Total */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end", justifyContent: "center" }}>
            
            {/* Round Off Checkbox */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "#475569", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={activeTab.roundOffEnabled}
                  onChange={(e) => updateActiveTab({ roundOffEnabled: e.target.checked })}
                  style={{ cursor: "pointer" }}
                />
                <span>Round Off</span>
              </label>

              <input
                type="text"
                readOnly
                value={roundOffVal ? (roundOffVal > 0 ? `+${roundOffVal.toFixed(2)}` : roundOffVal.toFixed(2)) : "0.00"}
                style={{ width: 80, padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", background: "#f8fafc", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#64748b" }}
              />
            </div>

            {/* Total Box */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Total</span>
              <div
                style={{
                  minWidth: 160,
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1.5px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#1e293b",
                  textAlign: "right"
                }}
              >
                ₹ {fmtCurrency(grandTotal)}
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── 6. BOTTOM ACTION BAR (Share ▾ | Save) ── */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 12
        }}
      >
        {/* Share ▾ Split Button */}
        <div style={{ display: "flex", alignItems: "center", border: "1px solid #60a5fa", borderRadius: 6, overflow: "hidden", background: "#ffffff" }}>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#2563eb",
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Share
          </button>
          <div style={{ borderLeft: "1px solid #bfdbfe", padding: "8px 8px", color: "#2563eb", cursor: "pointer", display: "flex" }}>
            <ChevronDown size={14} />
          </div>
        </div>

        {/* Save Button (Primary Blue) */}
        <button
          type="button"
          onClick={handleSaveDebitNote}
          disabled={saving}
          style={{
            background: "#1d72fe",
            border: "none",
            color: "#ffffff",
            borderRadius: 6,
            padding: "9px 34px",
            fontSize: 14,
            fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 2px 6px rgba(29, 114, 254, 0.3)"
          }}
        >
          {saving ? "Saving..." : (
            <span><u>S</u>ave</span>
          )}
        </button>
      </div>

      {/* Close Confirm Modal */}
      <CloseConfirmModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases/return")}
      />

      {/* Built-in Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

    </div>
  );
}
