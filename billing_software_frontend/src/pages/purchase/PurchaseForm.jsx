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
  ChevronsUpDown
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

/* ── Close Purchase Confirmation Dialog Component (Matching Reference) ── */
function ClosePurchaseModal({ isOpen, onCancel, onConfirm }) {
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
          borderRadius: 6,
          width: 440,
          maxWidth: "92vw",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
          overflow: "hidden",
          border: "1px solid #e2e8f0"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #e5e7eb"
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e3a47" }}>Close Purchase</h3>
          <button
            onClick={onCancel}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body message */}
        <div style={{ padding: "20px", fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
          Current changes will be discarded. Do you wish to continue?
        </div>

        {/* Buttons footer */}
        <div
          style={{
            padding: "10px 20px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 12
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "6px 20px",
              borderRadius: 5,
              border: "1px solid #60a5fa",
              background: "#ffffff",
              color: "#2563eb",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              transition: "all .15s"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "6px 22px",
              borderRadius: 5,
              border: "none",
              background: "#1d72fe",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              transition: "all .15s"
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // Draft ID if editing

  const [showCloseModal, setShowCloseModal] = useState(false);

  // Multi-tab tabs state (e.g. Purchase #1, Purchase #2)
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

  // Global Tax Mode (Without Tax / With Tax) for price column
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

  // Close dropdowns on click outside
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

  // Create empty item row matching Sale Invoice structure
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
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.id) {
      api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
        .then((res) => {
          if (res.data.status) {
            setCompanies(res.data.data);
            if (!selectedCompany && res.data.data.length > 0) {
              setSelectedCompany(res.data.data[0].id);
            }
          }
        })
        .catch(console.error);
    }
  }, []);

  // Load Suppliers & Product Catalog for autocomplete
  useEffect(() => {
    if (!selectedCompany) return;

    api.get(`/supplier/get_all?company_id=${selectedCompany}`)
      .then((res) => {
        if (res.data.status) {
          setSuppliers(res.data.data);
        }
      })
      .catch(console.error);

    api.get(`/product/get?company_id=${selectedCompany}`)
      .then((res) => {
        if (res.data.status) {
          setProductsCatalog(res.data.data);
        }
      })
      .catch(console.error);

    // If ID exists, load purchase
    if (id) {
      setLoading(true);
      api.get(`/purchase/get_purchase_by_id?id=${id}`)
        .then((res) => {
          if (res.data.status) {
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
      // Default 3 rows matching Sale Invoice screenshot
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
      // Price includes tax
      const inclusive = Math.max(0, rawSub - disc);
      tax = inclusive - inclusive / (1 + gstPct / 100);
      total = inclusive;
    } else {
      // Price does NOT include tax
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

  // Switch Global Tax Mode (Without Tax / With Tax)
  const handleTaxModeChange = (mode) => {
    setGlobalTaxMode(mode);
    setShowTaxModeDropdown(false);
    const updated = items.map((r) => calculateRow({ ...r, tax_mode: mode }, mode));
    setItems(updated);
  };

  // Select Product from autocomplete (Sets Quantity = 1 if empty)
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
    const rounded = Math.round(calculatedGross);
    return rounded;
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
        alert(res.data.message);
        navigate("/purchases");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving purchase invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      
      {/* ── TOP MULTI-TAB BAR (Vyapar Tab System) ── */}
      <div style={{ background: "#ffffff", borderBottom: "1.5px solid #e2e8f0", padding: "0 16px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 46 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, height: "100%" }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "0 16px",
                height: "100%",
                background: activeTabId === tab.id ? "#ffffff" : "#f8fafc",
                borderBottom: activeTabId === tab.id ? "3px solid #2563eb" : "3px solid transparent",
                fontWeight: activeTabId === tab.id ? 700 : 500,
                fontSize: 13,
                color: activeTabId === tab.id ? "#2563eb" : "#64748b",
                cursor: "pointer"
              }}
            >
              <span>{tab.title}</span>
              {tabs.length > 1 && (
                <X
                  size={13}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTabs(tabs.filter((t) => t.id !== tab.id));
                  }}
                />
              )}
            </div>
          ))}

          {/* Plus button to add tab */}
          <button
            onClick={() => {
              const newId = tabs.length + 1;
              setTabs([...tabs, { id: newId, title: `Purchase #${newId}` }]);
              setActiveTabId(newId);
            }}
            style={{
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Top Right Quick Utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            title="Calculator"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <Calculator size={18} />
          </button>
          <button
            onClick={() => setShowCloseModal(true)}
            title="Close / Back to Purchases"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <div style={{ padding: "16px 24px", flex: 1, overflowY: "auto" }}>
        
        {/* White Invoice Form Canvas */}
        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          
          {/* Header Title & Firm Selector */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: 0 }}>Purchase</h2>

            {/* Firm Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>Firm:</span>
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  localStorage.setItem("selected_company_id", e.target.value);
                }}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  border: "1.5px solid #e2e8f0",
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#1e293b",
                  outline: "none"
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── PARTY & BILL HEADER ROW ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
            
            {/* Left: Party / Supplier Input */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div ref={partyBoxRef} style={{ position: "relative", flex: 1 }}>
                <div
                  onClick={() => setShowPartyDropdown((prev) => !prev)}
                  style={{
                    border: "1.5px solid #2563eb",
                    borderRadius: 8,
                    padding: "6px 12px",
                    background: "#ffffff",
                    position: "relative",
                    cursor: "pointer"
                  }}
                >
                  <label style={{ fontSize: 11, fontWeight: 800, color: "#2563eb", textTransform: "uppercase", display: "block", cursor: "pointer" }}>
                    Party *
                  </label>
                  <input
                    type="text"
                    placeholder="Search or enter party name..."
                    value={partyInput}
                    onChange={(e) => {
                      setPartyInput(e.target.value);
                      setShowPartyDropdown(true);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPartyDropdown((prev) => !prev);
                    }}
                    onFocus={() => setShowPartyDropdown(true)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#0f172a",
                      marginTop: 2,
                      cursor: "text"
                    }}
                  />
                  <ChevronDown
                    size={14}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPartyDropdown((prev) => !prev);
                    }}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: `translateY(-50%) ${showPartyDropdown ? "rotate(180deg)" : "rotate(0deg)"}`,
                      transition: "transform 0.15s ease",
                      color: "#64748b",
                      cursor: "pointer"
                    }}
                  />
                </div>

                {/* Autocomplete Party Dropdown */}
                {showPartyDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      borderRadius: 8,
                      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                      border: "1px solid #e2e8f0",
                      maxHeight: 200,
                      overflowY: "auto",
                      zIndex: 60,
                      marginTop: 4
                    }}
                  >
                    {filteredSuppliers.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleSelectParty(s)}
                        style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid #f1f5f9",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                      >
                        <span style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{s.supplier_name || s.name}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>{s.mobile_number || s.phone || s.alt_mobile || "No phone"}</span>
                      </div>
                    ))}
                    {filteredSuppliers.length === 0 && (
                      <div style={{ padding: 12, fontSize: 12.5, color: "#64748b", textAlign: "center" }}>
                        Press Save to add <b>"{partyInput}"</b> as a new supplier.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Phone No */}
              <div style={{ width: 180 }}>
                <input
                  type="text"
                  placeholder="Phone No."
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #e2e8f0",
                    outline: "none",
                    fontSize: 13,
                    color: "#334155",
                    boxSizing: "border-box"
                  }}
                />
              </div>
            </div>

            {/* Right: Bill No, Date, State */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Bill Number:</span>
                <input
                  type="text"
                  placeholder="Supplier Invoice #"
                  value={purchaseNo}
                  onChange={(e) => setPurchaseNo(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    width: 170,
                    outline: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>Bill Date:</span>
                <input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    width: 170,
                    outline: "none",
                    cursor: "pointer"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600 }}>State of supply:</span>
                <select
                  value={stateOfSupply}
                  onChange={(e) => setStateOfSupply(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    width: 170,
                    outline: "none"
                  }}
                >
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Other">Other State (IGST)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 4. SALE INVOICE STYLE ITEMS TABLE (Matching media_1788239402238.png) ── */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 0, overflow: "visible", marginBottom: 16 }}>
            <div style={{ overflowX: "auto", overflowY: "visible" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 980 }}>
                <thead>
                  <tr style={{ background: "#ffffff", color: "#374151", height: 46 }}>
                    {/* 1. Barcode Scan Badge Header */}
                    <th style={{ width: 58, padding: "8px 6px", textAlign: "center", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                      <div
                        style={{
                          width: 34,
                          height: 28,
                          borderRadius: 4,
                          background: "#e6f9ed",
                          border: "1px solid #bbf7d0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          margin: "auto"
                        }}
                      >
                        <ScanBarcode size={16} color="#059669" />
                      </div>
                    </th>

                    {/* 2. ITEM Header */}
                    <th style={{ padding: "8px 14px", textAlign: "left", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                      ITEM
                    </th>

                    {/* 3. QTY Header */}
                    <th style={{ width: 68, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
                      QTY
                    </th>

                    {/* 4. UNIT Header */}
                    <th style={{ width: 92, padding: "8px 6px", textAlign: "center", fontWeight: 700, borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", color: "#374151" }}>
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
                        <span>{globalTaxMode === "with_tax" ? "With Tax" : "Without Tax"}</span>
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
                  {items.map((row, idx) => {
                    const isLightning = idx === 0;
                    const rowBg = isLightning ? "#eaf4fe" : "#ffffff";

                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          background: rowBg,
                          height: 44
                        }}
                      >
                        {/* Col 1: Zap on row 0 or (↕ index 🗑️) on subsequent rows */}
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

                          {/* Autocomplete suggestions (Displays on Click / Focus) */}
                          {activeProductSearchIndex === idx && (
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
                                maxHeight: 250,
                                overflowY: "auto"
                              }}
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
                                    <div style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>
                                      No products found. Type to enter <b>"{row.product_name}"</b>.
                                    </div>
                                  );
                                }

                                return filtered.slice(0, 10).map((p) => (
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
                                      <div style={{ fontSize: 10, color: "#94a3b8" }}>Purchase Rate</div>
                                    </div>
                                  </div>
                                ));
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
                        <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600, color: "#111827", fontSize: 13 }}>
                          ₹{row.amount ? row.amount.toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Table Footer: Total row matching screenshot */}
                <tfoot>
                  <tr style={{ background: "#ffffff", borderTop: "1px solid #e2e8f0", height: 46 }}>
                    <td style={{ padding: "6px 12px", borderRight: "1px solid #e2e8f0" }}></td>
                    <td style={{ padding: "6px 14px", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <button
                          onClick={addRow}
                          style={{
                            padding: "6px 16px",
                            borderRadius: 4,
                            border: "1px solid #2563eb",
                            background: "#ffffff",
                            color: "#2563eb",
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4
                          }}
                        >
                          ADD ROW
                        </button>
                        <span style={{ fontWeight: 700, fontSize: 12, color: "#374151", textTransform: "uppercase" }}>
                          TOTAL
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, fontSize: 13, color: "#111827", borderRight: "1px solid #e2e8f0" }}>
                      {totalQty || 0}
                    </td>
                    <td style={{ borderRight: "1px solid #e2e8f0" }}></td>
                    <td style={{ borderRight: "1px solid #e2e8f0" }}></td>
                    <td style={{ textAlign: "center", fontWeight: 600, fontSize: 12.5, color: "#4b5563", borderRight: "1px solid #e2e8f0" }}>
                      {totalDiscount || 0}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600, fontSize: 12.5, color: "#4b5563", borderRight: "1px solid #e2e8f0" }}>
                      {totalTax || 0}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontSize: 13.5, color: "#111827", padding: "6px 12px" }}>
                      ₹{calculatedGross ? calculatedGross.toFixed(2) : "0.00"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ── FOOTER SETTLEMENT & ACTIONS ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
            
            {/* Left: Terms & Notes & Payment Type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Payment Type */}
              <div style={{ width: 220 }}>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  Payment Type
                </label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1.5px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    background: "#ffffff"
                  }}
                >
                  <option value="Cash">Cash</option>
                  <option value="Online">Online / Netbanking</option>
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Add Terms */}
              {/* {!showTermsInput ? (
                <button
                  onClick={() => setShowTermsInput(true)}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  + ADD TERMS & CONDITIONS
                </button>
              ) : (
                <textarea
                  placeholder="Enter Terms & Conditions..."
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}
                />
              )} */}

              {/* Add Description */}
              {/* {!showDescInput ? (
                <button
                  onClick={() => setShowDescInput(true)}
                  style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12.5, fontWeight: 700, cursor: "pointer", textAlign: "left", padding: 0 }}
                >
                  + ADD DESCRIPTION
                </button>
              ) : (
                <textarea
                  placeholder="Enter invoice notes / description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12.5, outline: "none", fontFamily: "inherit" }}
                />
              )} */}
            </div>

            {/* Right: Grand Total, Paid Amount & Balance Due */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-end" }}>
              
              {/* Grand Total Display */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>Total</span>
                <input
                  type="text"
                  readOnly
                  value={`₹ ${fmt(finalPayableTotal)}`}
                  style={{
                    width: 200,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "2px solid #2563eb",
                    fontSize: 18,
                    fontWeight: 900,
                    textAlign: "right",
                    color: "#2563eb",
                    background: "#eff6ff",
                    outline: "none"
                  }}
                />
              </div>

              {/* Paid Amount Input */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#374151" }}>Paid</span>
                  {Number(currentPaid) !== Number(finalPayableTotal) && (
                    <button
                      type="button"
                      onClick={() => {
                        setPaidAmount(finalPayableTotal);
                        setIsPaidModified(false);
                      }}
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#2563eb",
                        borderRadius: 4,
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                      title="Set full paid amount"
                    >
                      Full
                    </button>
                  )}
                </div>
                <div style={{ position: "relative", width: 200 }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#059669" }}>₹</span>
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
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 28px",
                      borderRadius: 8,
                      border: "1.5px solid #10b981",
                      fontSize: 16,
                      fontWeight: 800,
                      textAlign: "right",
                      color: "#047857",
                      background: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>
              </div>

              {/* Balance Due Display */}
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: balanceDue > 0 ? "#dc2626" : "#64748b" }}>
                  Balance Due
                </span>
                <div
                  style={{
                    width: 200,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: `1.5px solid ${balanceDue > 0 ? "#fca5a5" : "#e2e8f0"}`,
                    fontSize: 16,
                    fontWeight: 800,
                    textAlign: "right",
                    color: balanceDue > 0 ? "#dc2626" : "#16a34a",
                    background: balanceDue > 0 ? "#fef2f2" : "#f8fafc",
                    boxSizing: "border-box"
                  }}
                >
                  ₹ {fmt(balanceDue)}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ── BOTTOM ACTION BAR (Matching Blue Save Bar) ── */}
      <div
        style={{
          background: "#ffffff",
          borderTop: "1.5px solid #e2e8f0",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        {/* Left: Upload Bill / Excel */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label
            style={{
              background: "#f1f5f9",
              border: "1.5px solid #e2e8f0",
              color: "#334155",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Paperclip size={15} /> Upload Bill / Excel
            <input type="file" accept=".xlsx, .xls, .csv, image/*, .pdf" onChange={handleExcelUpload} style={{ display: "none" }} />
          </label>
        </div>

        {/* Right: Save / Share Buttons */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => handleSave("draft")}
            disabled={saving || isLocked}
            style={{
              background: "#ffffff",
              border: "1.5px solid #cbd5e1",
              color: "#475569",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: isLocked ? "not-allowed" : "pointer"
            }}
          >
            Save as Draft
          </button>

          <button
            onClick={() => handleSave("submitted")}
            disabled={saving || isLocked}
            style={{
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              borderRadius: 8,
              padding: "9px 24px",
              fontSize: 14,
              fontWeight: 700,
              cursor: isLocked ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,0.25)"
            }}
          >
            {saving ? "Saving..." : isLocked ? "Submitted (Locked)" : "Save"}
          </button>
        </div>
      </div>

      {/* Close Purchase Confirmation Modal */}
      <ClosePurchaseModal
        isOpen={showCloseModal}
        onCancel={() => setShowCloseModal(false)}
        onConfirm={() => navigate("/purchases")}
      />

    </div>
  );
}
