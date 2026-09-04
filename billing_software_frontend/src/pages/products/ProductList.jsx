import { useEffect, useState } from "react";
import api from "../../services/api";
import { Edit } from "lucide-react";
import {
  Search, Plus, ChevronDown, SlidersHorizontal,
  MoreVertical, FileSpreadsheet, ArrowUpRight, Filter, X,
  Package, MousePointerClick, Boxes, Tags, Ruler, Inbox,
  ShoppingBag, Layers, Grid, List, BarChart3,
  ChevronRight, ChevronLeft, Star, Zap,
} from "lucide-react";
import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const money = (n) =>
  `\u20B9 ${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ─────────────────────────  DESIGN SYSTEM  ───────────────────────── */
const COLORS = {
  bg: "#f0f2f6",
  surface: "#ffffff",
  surfaceAlt: "#f8f9fc",
  border: "#e4e7ef",
  text: "#0a1628",
  textSoft: "#3d4a66",
  textMuted: "#8a94a8",
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primaryTint: "#eff6ff",
  success: "#059669",
  successTint: "#ecfdf5",
  danger: "#dc2626",
  dangerTint: "#fef2f2",
  warning: "#d97706",
  warningTint: "#fffbeb",
  brand: "#7c3aed",
  brandDark: "#6d28d9",
  brandTint: "#f5f3ff",
  gradient: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
};

const RADIUS = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
const SHADOW = {
  card: "0 1px 3px rgba(10,22,40,.06), 0 1px 2px rgba(10,22,40,.04)",
  raised: "0 8px 24px -8px rgba(10,22,40,.12)",
  modal: "0 24px 60px -16px rgba(10,22,40,.3)",
  glow: "0 0 0 4px rgba(37,99,235,.15)",
};
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export default function ProductList() {
  const [activeTab, setActiveTab] = useState("product");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [txnSearch, setTxnSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [saleHistory, setSaleHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [catForm, setCatForm] = useState("");
  const [brandForm, setBrandForm] = useState("");
  const [savingSub, setSavingSub] = useState(false);
  
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversionValue, setConversionValue] = useState("");
  const [conversionToUnit, setConversionToUnit] = useState("");
  const [conversionIsBase, setConversionIsBase] = useState(false);
  const [conversionRate, setConversionRate] = useState("");
  const [savingConversion, setSavingConversion] = useState(false);
  const unitConversionMap = {
    LITRE: [
      { fromUnit: "LITRE", value: 1000, toUnit: "MILLILITRE", isBase: true },
      { fromUnit: "LITRE", value: 1000, toUnit: "MILILITRE", isBase: false },
      { fromUnit: "LITRE", value: 33.814, toUnit: "FLUID OUNCE", isBase: false },
      { fromUnit: "LITRE", value: 4.227, toUnit: "CUP", isBase: false },
    ],
    MILILITRE: [
      { fromUnit: "MILILITRE", value: 0.001, toUnit: "LITRE", isBase: true },
      { fromUnit: "MILILITRE", value: 0.0338, toUnit: "FLUID OUNCE", isBase: false },
    ],
    KILOGRAMS: [
      { fromUnit: "KILOGRAMS", value: 1000, toUnit: "GRAMMES", isBase: true },
      { fromUnit: "KILOGRAMS", value: 2.2046, toUnit: "POUNDS", isBase: false },
      { fromUnit: "KILOGRAMS", value: 35.274, toUnit: "OUNCES", isBase: false },
    ],
    GRAMMES: [
      { fromUnit: "GRAMMES", value: 0.001, toUnit: "KILOGRAMS", isBase: true },
      { fromUnit: "GRAMMES", value: 0.03527, toUnit: "OUNCES", isBase: false },
    ],
    METERS: [
      { fromUnit: "METERS", value: 100, toUnit: "CENTIMETER", isBase: true },
      { fromUnit: "METERS", value: 3.2808, toUnit: "FEET", isBase: false },
      { fromUnit: "METERS", value: 39.3701, toUnit: "INCHES", isBase: false },
      { fromUnit: "METERS", value: 1.0936, toUnit: "YARDS", isBase: false },
    ],
    KILOMETER: [
      { fromUnit: "KILOMETER", value: 1000, toUnit: "METERS", isBase: true },
      { fromUnit: "KILOMETER", value: 0.6214, toUnit: "MILES", isBase: false },
    ],
    NUMBERS: [
      { fromUnit: "NUMBERS", value: 12, toUnit: "DOZENS", isBase: false },
      { fromUnit: "NUMBERS", value: 1, toUnit: "NUMBERS", isBase: true },
    ],
    DOZENS: [
      { fromUnit: "DOZENS", value: 12, toUnit: "NUMBERS", isBase: true },
      { fromUnit: "DOZENS", value: 1, toUnit: "GROSS", isBase: false },
    ],
    PIECES: [
      { fromUnit: "PIECES", value: 12, toUnit: "DOZENS", isBase: false },
      { fromUnit: "PIECES", value: 1, toUnit: "PIECES", isBase: true },
      { fromUnit: "PIECES", value: 100, toUnit: "HUNDREDS", isBase: false },
    ],
    PAIRS: [
      { fromUnit: "PAIRS", value: 2, toUnit: "PIECES", isBase: true },
      { fromUnit: "PAIRS", value: 6, toUnit: "DOZENS", isBase: false },
    ],
    BOX: [
      { fromUnit: "BOX", value: 24, toUnit: "PIECES", isBase: true },
      { fromUnit: "BOX", value: 2, toUnit: "DOZENS", isBase: false },
    ],
    BOTTLES: [
      { fromUnit: "BOTTLES", value: 1, toUnit: "BOTTLES", isBase: true },
      { fromUnit: "BOTTLES", value: 12, toUnit: "DOZENS", isBase: false },
    ],
    PACKS: [
      { fromUnit: "PACKS", value: 10, toUnit: "PIECES", isBase: true },
      { fromUnit: "PACKS", value: 1, toUnit: "PACKS", isBase: false },
    ],
    SET: [
      { fromUnit: "SET", value: 1, toUnit: "SET", isBase: true },
      { fromUnit: "SET", value: 6, toUnit: "DOZENS", isBase: false },
    ],
    BAGS: [
      { fromUnit: "BAGS", value: 50, toUnit: "KILOGRAMS", isBase: true },
    ],
    BUNDLES: [
      { fromUnit: "BUNDLES", value: 10, toUnit: "PIECES", isBase: true },
    ],
    CANS: [
      { fromUnit: "CANS", value: 1, toUnit: "LITRE", isBase: true },
    ],
    CARTONS: [
      { fromUnit: "CARTONS", value: 24, toUnit: "PIECES", isBase: true },
    ],
    CUBIC_METER: [
      { fromUnit: "CUBIC METER", value: 1000, toUnit: "LITRE", isBase: true },
      { fromUnit: "CUBIC METER", value: 35.3147, toUnit: "CUBIC FEET", isBase: false },
    ],
    DAY: [
      { fromUnit: "DAY", value: 24, toUnit: "HOUR", isBase: true },
    ],
    HOUR: [
      { fromUnit: "HOUR", value: 60, toUnit: "MINUTES", isBase: true },
    ],
  };

  const [conversions, setConversions] = useState([]);

  const [units, setUnits] = useState([
    { full: "BAGS", short: "Bag" },
    { full: "BOTTLES", short: "Btl" },
    { full: "BOX", short: "Box" },
    { full: "BUNDLES", short: "Bdl" },
    { full: "CANS", short: "Can" },
    { full: "CARTONS", short: "Ctn" },
    { full: "CUBIC METER", short: "Mtq" },
    { full: "DAY", short: "Day" },
    { full: "DOZENS", short: "Dzn" },
    { full: "GRAMMES", short: "Gm" },
    { full: "HOUR", short: "Hur" },
    { full: "KILOGRAMS", short: "Kg" },
    { full: "KILOMETER", short: "Kmt" },
    { full: "LITRE", short: "Ltr" },
    { full: "METERS", short: "Mtr" },
    { full: "NUMBERS", short: "Nos" },
    { full: "PACKS", short: "Pac" },
    { full: "PAIRS", short: "Pair" },
    { full: "PIECES", short: "Pcs" },
    { full: "SET", short: "Set" },
  ]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandListSearch, setBrandListSearch] = useState("");
  const [brandItemsSearch, setBrandItemsSearch] = useState("");
  const [showMoveBrandModal, setShowMoveBrandModal] = useState(false);
  const [moveBrandSearch, setMoveBrandSearch] = useState("");
  const [moveBrandSelected, setMoveBrandSelected] = useState([]);
  const [removeFromExistingBrand, setRemoveFromExistingBrand] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryListSearch, setCategoryListSearch] = useState("");
  const [categoryItemsSearch, setCategoryItemsSearch] = useState("");
  const [showMoveCategoryModal, setShowMoveCategoryModal] = useState(false);
  const [moveCategorySearch, setMoveCategorySearch] = useState("");
  const [moveCategorySelected, setMoveCategorySelected] = useState([]);
  const [removeFromExistingCategory, setRemoveFromExistingCategory] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitListSearch, setUnitListSearch] = useState("");
  const [conversionSearch, setConversionSearch] = useState("");
  const [unitFullForm, setUnitFullForm] = useState("");
  const [unitShortForm, setUnitShortForm] = useState("");

  const handleSelectUnit = (u) => {
    setSelectedUnit(u);
    const key = u.full.replace(/\s+/g, "_");
    const defaultConvs = unitConversionMap[key] || unitConversionMap[u.full] || [];
    setConversions(defaultConvs);
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const getCompanyId = () => Number(localStorage.getItem("selected_company_id"));

  const loadCompanies = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${user.id}`);
      if (res.data.status) {
        setCompanies(res.data.data);
        const savedId = localStorage.getItem("selected_company_id");
        const stillValid = res.data.data.some(c => String(c.id) === savedId);
        if (savedId && stillValid) {
          fetchProducts(savedId);
        } else if (res.data.data.length > 0) {
          const firstId = String(res.data.data[0].id);
          setSelectedCompany(firstId);
          localStorage.setItem("selected_company_id", firstId);
          fetchProducts(firstId);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchProducts = async (company_id) => {
    setLoading(true);
    try {
      const res = await api.get(`/product/get?company_id=${company_id}`);
      if (res.data.status) {
        setProducts(res.data.data);
        setSelectedProduct(res.data.data?.[0] || null);
        setSaleHistory([]);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (company_id) => {
    if (!company_id) {
      setCategories([]);
      return;
    }
    try {
      const res = await api.get(`/category/get_active_category?company_id=${company_id}`);
      if (res.data.status) setCategories(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchBrands = async (company_id) => {
    if (!company_id) {
      setBrands([]);
      return;
    }
    try {
      const res = await api.get(`/brand/get_active_brand?company_id=${company_id}`);
      if (res.data.status) setBrands(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchSaleHistory = async (product_id) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/product/get_sale_history?product_id=${product_id}`);
      if (res.data.status) setSaleHistory(res.data.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    fetchProducts(selectedCompany);
    fetchCategories(selectedCompany);
    fetchBrands(selectedCompany);
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedProduct) fetchSaleHistory(selectedProduct.id);
  }, [selectedProduct?.id]);

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    if (!companyId) {
      setProducts([]);
      setSelectedProduct(null);
      return;
    }
    fetchProducts(companyId);
    fetchCategories(companyId);
    fetchBrands(companyId);
  };

  const toggleStatus = async (product) => {
    const newStatus = product.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/product/toggle_status_product", {
        id: product.id,
        status: newStatus,
      });
      if (res.data.status) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
        );
        if (selectedProduct?.id === product.id)
          setSelectedProduct((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error(err);
      showToast("Server Error", false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredHistory = saleHistory.filter((s) => {
    const q = txnSearch.toLowerCase();
    if (!q) return true;
    return (
      (s.invoice_no || "").toLowerCase().includes(q) ||
      (s.customer_name || "").toLowerCase().includes(q)
    );
  });

  const handleSelectProduct = (p) => {
    setSelectedProduct(p);
    setSaleHistory([]);
  };

  const handleAddCategory = async () => {
    if (!catForm.trim()) {
      showToast("Enter a category name", false);
      return;
    }
    setSavingSub(true);
    try {
      const res = await api.post("/category/create", {
        name: catForm,
        company_id: getCompanyId(),
      });
      if (res.data.status) {
        showToast("Category added!");
        setCatForm("");
        setShowCatModal(false);
        fetchCategories(selectedCompany);
      } else {
        showToast(res.data.message || "Failed", false);
      }
    } catch (err) {
      showToast("Server Error", false);
    } finally {
      setSavingSub(false);
    }
  };

  const handleAddBrand = async () => {
    if (!brandForm.trim()) {
      showToast("Enter a brand name", false);
      return;
    }
    setSavingSub(true);
    try {
      const res = await api.post("/brand/create", {
        name: brandForm,
        company_id: getCompanyId(),
      });
      if (res.data.status) {
        showToast("Brand added!");
        setBrandForm("");
        setShowBrandModal(false);
        fetchBrands(selectedCompany);
      } else {
        showToast(res.data.message || "Failed", false);
      }
    } catch (err) {
      showToast("Server Error", false);
    } finally {
      setSavingSub(false);
    }
  };

  const handleAddUnit = () => {
    if (!unitFullForm.trim() || !unitShortForm.trim()) {
      showToast("Enter full name and short name", false);
      return;
    }
    const newUnit = { full: unitFullForm.trim().toUpperCase(), short: unitShortForm.trim() };
    setUnits((prev) => [...prev, newUnit]);
    handleSelectUnit(newUnit);
    showToast("Unit added!");
    setUnitFullForm("");
    setUnitShortForm("");
    setShowUnitModal(false);
  };

  const handleAddConversion = () => {
    if (!conversionValue.trim()) {
      showToast("Please enter a conversion value", false);
      return;
    }
    if (!conversionToUnit) {
      showToast("Please select a target unit", false);
      return;
    }
    
    setSavingConversion(true);
    try {
      const newConversion = {
        fromUnit: selectedUnit.full,
        value: conversionValue,
        toUnit: conversionToUnit,
        isBase: conversionIsBase,
        rate: conversionRate || "None"
      };
      
      setConversions(prev => [...prev, newConversion]);
      showToast("Conversion added successfully!");
      
      setConversionValue("");
      setConversionToUnit("");
      setConversionIsBase(false);
      setConversionRate("");
      setShowConversionModal(false);
    } catch (err) {
      showToast("Failed to add conversion", false);
    } finally {
      setSavingConversion(false);
    }
  };

  const exportToCSV = () => {
    if (!filteredHistory.length) {
      showToast("Nothing to export", false);
      return;
    }
    const header = ["Type", "Invoice/Ref", "Name", "Date", "Quantity", "Price/Unit", "Status"];
    const rows = filteredHistory.map((s) => [
      s.type || "Sale",
      s.invoice_no || "N/A",
      s.customer_name || "-",
      formatDate(s.date),
      `${s.quantity ?? ""} ${selectedProduct?.unit || ""}`.trim(),
      s.price ?? "",
      s.status || "Paid",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedProduct?.product_name || "transactions"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMoveToCategory = () => {
    if (!selectedCategory || moveCategorySelected.length === 0) return;
    setProducts((prev) =>
      prev.map((p) =>
        moveCategorySelected.includes(p.id)
          ? { ...p, category_name: selectedCategory.name, category_id: selectedCategory.id }
          : p
      )
    );
    showToast(`Moved ${moveCategorySelected.length} item(s) to ${selectedCategory.name}`);
    setShowMoveCategoryModal(false);
    setMoveCategorySelected([]);
    setMoveCategorySearch("");
    setRemoveFromExistingCategory(false);
  };

  const handleMoveToBrand = () => {
    if (!selectedBrand || moveBrandSelected.length === 0) return;
    setProducts((prev) =>
      prev.map((p) =>
        moveBrandSelected.includes(p.id) ? { ...p, brand_name: selectedBrand.name, brand_id: selectedBrand.id } : p
      )
    );
    showToast(`Moved ${moveBrandSelected.length} item(s) to ${selectedBrand.name}`);
    setShowMoveBrandModal(false);
    setMoveBrandSelected([]);
    setMoveBrandSearch("");
    setRemoveFromExistingBrand(false);
  };

  const moveCategoryOptions = products.filter(
    (p) =>
      p.category_id !== selectedCategory?.id &&
      p.product_name?.toLowerCase().includes(moveCategorySearch.toLowerCase())
  );

  const moveBrandOptions = products.filter(
    (p) =>
      p.brand_id !== selectedBrand?.id &&
      p.product_name?.toLowerCase().includes(moveBrandSearch.toLowerCase())
  );

  const TABS = [
    { key: "product", label: "Products", icon: ShoppingBag },
    { key: "brand", label: "Brands", icon: Tags },
    { key: "category", label: "Categories", icon: Layers },
    { key: "unit", label: "Units", icon: Ruler },
  ];

  const stockValue = selectedProduct
    ? Number(selectedProduct.stock || 0) * Number(selectedProduct.purchase_price || 0)
    : 0;

  // ─── Components ───
  const EmptyState = ({ icon, title, subtitle }) => (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: RADIUS.xl,
          background: COLORS.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          border: `2px dashed ${COLORS.border}`,
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.text }}>{title}</div>
      {subtitle && (
        <p style={{ fontSize: 13, marginTop: 6, color: COLORS.textMuted, lineHeight: 1.6 }}>
          {subtitle}
        </p>
      )}
    </div>
  );

  const StatCard = ({ label, value, icon, color }) => (
    <div
      style={{
        background: COLORS.surface,
        borderRadius: RADIUS.md,
        padding: "14px 18px",
        border: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: RADIUS.sm,
          background: color || COLORS.primaryTint,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.primary,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.text }}>{value}</div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #b0b5c0; }
        @keyframes slideIn { from { opacity:0; transform: translateY(-8px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes popIn { from { opacity:0; transform: scale(0.95) translateY(12px); } to { opacity:1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .hover-lift:hover { transform: translateY(-1px); transition: transform 0.15s; }
        .hover-bg:hover { background: ${COLORS.bg}; }
        .focus-ring:focus { outline: none; box-shadow: 0 0 0 3px ${COLORS.primaryTint}, 0 0 0 6px rgba(37,99,235,0.08); }
        .tab-btn { position: relative; transition: all 0.15s; }
        .tab-btn:hover { color: ${COLORS.text}; }
        .tab-btn::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 0; height: 2.5px; background: ${COLORS.primary}; transition: width 0.2s; border-radius: 2px; }
        .tab-btn.active::after { width: 70%; }
        .product-card { transition: all 0.15s; cursor: pointer; }
        .product-card:hover { border-color: ${COLORS.primary}; box-shadow: ${SHADOW.raised}; }
        .product-card.selected { border-color: ${COLORS.primary}; background: ${COLORS.primaryTint}; box-shadow: ${SHADOW.glow}; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: toast.ok ? COLORS.text : COLORS.danger,
            color: "#fff",
            padding: "14px 22px",
            borderRadius: RADIUS.md,
            boxShadow: SHADOW.modal,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontWeight: 600,
            fontSize: 13.5,
            animation: "slideIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            fontFamily: FONT,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: toast.ok ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {toast.ok ? "✓" : "✕"}
          </div>
          {toast.msg}
        </div>
      )}

      {/* Modals */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onProductAdded={() => {
          fetchProducts(selectedCompany);
        }}
      />
      <EditProductModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        product={selectedProduct}
        onProductUpdated={() => {
          fetchProducts(selectedCompany);
        }}
      />

      {/* ─── MAIN LAYOUT ─── */}
      <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: FONT, color: COLORS.textSoft }}>

        {/* ─── COMPANY SELECTOR ─── */}
        <div
          style={{
            background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Company
          </span>
          {companies.length > 0 ? (
            companies.map((c) => {
              const isActive = Number(selectedCompany) === Number(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleCompanyChange(String(c.id))}
                  style={{
                    padding: "6px 16px",
                    borderRadius: RADIUS.pill,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isActive ? `2px solid ${COLORS.primary}` : `1.5px solid ${COLORS.border}`,
                    background: isActive ? COLORS.primaryTint : "transparent",
                    color: isActive ? COLORS.primary : COLORS.textMuted,
                    transition: "all 0.15s",
                  }}
                >
                  {c.company_name}
                </button>
              );
            })
          ) : (
            <span style={{ fontSize: 13, color: COLORS.textMuted }}>No companies available</span>
          )}
        </div>

        {/* ─── TAB BAR ─── */}
        <div
          style={{
            display: "flex",
            background: COLORS.surface,
            borderBottom: `1px solid ${COLORS.border}`,
            padding: "0 16px",
            gap: 0,
          }}
        >
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`tab-btn ${activeTab === key ? "active" : ""}`}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "14px 20px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: activeTab === key ? COLORS.text : COLORS.textMuted,
                borderBottom: activeTab === key ? `2.5px solid ${COLORS.primary}` : "2.5px solid transparent",
                marginBottom: -1,
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "color 0.15s",
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* ─── CONTENT AREA ─── */}
        <div style={{ padding: "20px 24px 24px", height: "calc(100vh - 120px)" }}>

          {/* ─── PRODUCT TAB ─── */}
          {activeTab === "product" && (
            <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, height: "100%" }}>

              {/* LEFT PANEL */}
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                {/* Search + Actions */}
                <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <Search size={16} style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                      <input
                        className="focus-ring"
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "9px 12px 9px 36px",
                          borderRadius: RADIUS.sm,
                          border: `1.5px solid ${COLORS.border}`,
                          outline: "none",
                          fontSize: 13,
                          color: COLORS.text,
                          background: COLORS.bg,
                          transition: "border-color 0.15s",
                        }}
                      />
                    </div>
                    <button
                      onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
                      style={{
                        padding: "7px 12px",
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.border}`,
                        background: COLORS.surface,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: COLORS.textSoft,
                        transition: "all 0.15s",
                      }}
                    >
                      {viewMode === "list" ? <Grid size={16} /> : <List size={16} />}
                    </button>
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="hover-lift"
                    style={{
                      width: "100%",
                      padding: "10px",
                      background: COLORS.gradient,
                      color: "#fff",
                      border: "none",
                      borderRadius: RADIUS.sm,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      transition: "opacity 0.15s",
                    }}
                  >
                    <Plus size={16} /> Add New Product
                  </button>
                </div>

                {/* Product Count */}
                <div
                  style={{
                    padding: "10px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.textMuted,
                    borderBottom: `1px solid ${COLORS.border}`,
                    background: COLORS.surfaceAlt,
                  }}
                >
                  <span>{filtered.length} products</span>
                  <span>{products.filter(p => p.status === "active").length} active</span>
                </div>

                {/* Product List */}
                <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
                      {selectedCompany ? "Loading..." : "Select a company"}
                    </div>
                  ) : filtered.length === 0 ? (
                    <EmptyState icon={<Package size={28} color={COLORS.textMuted} />} title="No items" subtitle="Try adjusting your search" />
                  ) : viewMode === "list" ? (
                    filtered.map((p) => {
                      const isSelected = selectedProduct?.id === p.id;
                      const stock = Number(p.stock || 0);
                      return (
                        <div
                          key={p.id}
                          className={`product-card ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectProduct(p)}
                          style={{
                            padding: "12px 18px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderLeft: isSelected ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                            borderBottom: `1px solid ${COLORS.border}`,
                            background: isSelected ? COLORS.primaryTint : "transparent",
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{p.product_name}</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{p.product_code || "No code"}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: stock < 5 ? COLORS.danger : COLORS.success }}>
                              {stock}
                            </div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted }}>{p.unit || "unit"}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 12 }}>
                      {filtered.map((p) => {
                        const isSelected = selectedProduct?.id === p.id;
                        const stock = Number(p.stock || 0);
                        return (
                          <div
                            key={p.id}
                            className={`product-card ${isSelected ? "selected" : ""}`}
                            onClick={() => handleSelectProduct(p)}
                            style={{
                              padding: "14px",
                              borderRadius: RADIUS.md,
                              border: `1.5px solid ${isSelected ? COLORS.primary : COLORS.border}`,
                              background: isSelected ? COLORS.primaryTint : COLORS.surface,
                              textAlign: "center",
                            }}
                          >
                            <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text }}>{p.product_name}</div>
                            <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{p.product_code || "—"}</div>
                            <div style={{ marginTop: 8 }}>
                              <span style={{ fontWeight: 700, fontSize: 16, color: stock < 5 ? COLORS.danger : COLORS.success }}>
                                {stock}
                              </span>
                              <span style={{ fontSize: 11, color: COLORS.textMuted, marginLeft: 4 }}>{p.unit || ""}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANEL - Product Detail */}
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                {!selectedProduct ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: RADIUS.xl,
                        background: COLORS.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                        border: `2px dashed ${COLORS.border}`,
                      }}
                    >
                      <MousePointerClick size={32} color={COLORS.primary} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>Select a product</div>
                    <p style={{ fontSize: 13, marginTop: 6, color: COLORS.textMuted, maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
                      Click on any product from the list to view its details and transaction history.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Product Header */}
                    <div
                      style={{
                        padding: "20px 24px",
                        borderBottom: `1px solid ${COLORS.border}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        background: COLORS.surfaceAlt,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.01em" }}>
                            {selectedProduct.product_name}
                          </span>
                          <button
                            onClick={() => setShowEditModal(true)}
                            style={{
                              background: COLORS.primaryTint,
                              border: "none",
                              borderRadius: RADIUS.sm,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              color: COLORS.primary,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              transition: "all 0.15s",
                            }}
                          >
                            <ArrowUpRight size={13} /> Edit
                          </button>
                        </div>
                        <div style={{ display: "flex", gap: 20, marginTop: 10, flexWrap: "wrap" }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Sale Price
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginLeft: 6 }}>
                              {money(selectedProduct.sale_price || selectedProduct.price)}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Purchase Price
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginLeft: 6 }}>
                              {money(selectedProduct.purchase_price)}
                            </span>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Unit
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginLeft: 6 }}>
                              {selectedProduct.unit || "—"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                        <StatCard
                          label="Stock"
                          value={fmt(selectedProduct.stock)}
                          icon={<Package size={16} />}
                          color={COLORS.successTint}
                        />
                        <StatCard
                          label="Value"
                          value={money(stockValue)}
                          icon={<Zap size={16} />}
                          color={COLORS.warningTint}
                        />
                        <button
                          onClick={() => setShowEditModal(true)}
                          style={{
                            padding: "8px 16px",
                            background: COLORS.primary,
                            color: "#fff",
                            border: "none",
                            borderRadius: RADIUS.sm,
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "all 0.15s",
                            whiteSpace: "nowrap",
                          }}
                          className="hover-lift"
                        >
                          <SlidersHorizontal size={14} /> Adjust Stock
                        </button>
                      </div>
                    </div>

                    {/* Transactions */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 14,
                          flexWrap: "wrap",
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: "0.03em" }}>
                          Transaction History
                          <span style={{ fontWeight: 400, color: COLORS.textMuted, marginLeft: 8, fontSize: 12 }}>
                            ({filteredHistory.length})
                          </span>
                        </span>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ position: "relative" }}>
                            <Search size={13} style={{ position: "absolute", top: "50%", left: 10, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                            <input
                              className="focus-ring"
                              value={txnSearch}
                              onChange={(e) => setTxnSearch(e.target.value)}
                              placeholder="Search transactions"
                              style={{
                                padding: "7px 10px 7px 32px",
                                borderRadius: RADIUS.sm,
                                border: `1.5px solid ${COLORS.border}`,
                                outline: "none",
                                fontSize: 12,
                                width: 180,
                                background: COLORS.bg,
                                transition: "all 0.15s",
                              }}
                            />
                          </div>
                          <button
                            onClick={exportToCSV}
                            style={{
                              padding: "7px 14px",
                              borderRadius: RADIUS.sm,
                              border: "none",
                              background: COLORS.success,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              transition: "all 0.15s",
                            }}
                            className="hover-lift"
                          >
                            <FileSpreadsheet size={14} /> Export
                          </button>
                        </div>
                      </div>

                      {loadingHistory ? (
                        <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted }}>Loading transactions...</div>
                      ) : filteredHistory.length === 0 ? (
                        <div
                          style={{
                            border: `1.5px dashed ${COLORS.border}`,
                            borderRadius: RADIUS.md,
                            background: COLORS.surfaceAlt,
                          }}
                        >
                          <EmptyState
                            icon={<Inbox size={28} color={COLORS.textMuted} />}
                            title="No transactions"
                            subtitle="This product hasn't been sold yet"
                          />
                        </div>
                      ) : (
                        <div
                          style={{
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: RADIUS.md,
                            overflow: "hidden",
                            background: COLORS.surface,
                          }}
                        >
                          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                            <thead>
                              <tr style={{ background: COLORS.surfaceAlt, borderBottom: `1px solid ${COLORS.border}` }}>
                                <th style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Name</th>
                                <th style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone Number</th>
                                <th style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quantity</th>
                                <th style={{ padding: "10px 14px", fontWeight: 700, color: COLORS.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredHistory.map((s, i) => {
                                return (
                                  <tr key={i} className="hover-bg" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                                    <td style={{ padding: "11px 14px", fontWeight: 600, color: COLORS.text }}>{s.customer_name || "-"}</td>
                                    <td style={{ padding: "11px 14px", color: COLORS.textSoft }}>{s.customer_phone || "-"}</td>
                                    <td style={{ padding: "11px 14px", fontWeight: 600, color: COLORS.text }}>
                                      {s.quantity} {selectedProduct.unit?.slice(0, 3) || ""}
                                    </td>
                                    <td style={{ padding: "11px 14px", fontWeight: 600, color: COLORS.text }}>{money(s.price)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── CATEGORY TAB ─── */}
          {activeTab === "category" && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "100%" }}>
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", top: "50%", left: 11, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                    <input
                      className="focus-ring"
                      placeholder="Search categories..."
                      value={categoryListSearch}
                      onChange={(e) => setCategoryListSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 34px",
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.border}`,
                        outline: "none",
                        fontSize: 13,
                        background: COLORS.bg,
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowCatModal(true)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "9px",
                      background: COLORS.gradient,
                      color: "#fff",
                      border: "none",
                      borderRadius: RADIUS.sm,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                    className="hover-lift"
                  >
                    <Plus size={15} /> New Category
                  </button>
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {(() => {
                    const uncategorizedCount = products.filter(p => !p.category_name).length;
                    const catRows = categories
                      .filter(c => c.name?.toLowerCase().includes(categoryListSearch.toLowerCase()))
                      .map(c => ({ ...c, count: products.filter(p => p.category_name === c.name).length }));
                    const showUncategorized = categoryListSearch === "" || "not in any category".includes(categoryListSearch.toLowerCase());

                    return (
                      <>
                        {showUncategorized && (
                          <div
                            className="product-card"
                            onClick={() => setSelectedCategory(null)}
                            style={{
                              padding: "12px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderLeft: selectedCategory === null ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                              borderBottom: `1px solid ${COLORS.border}`,
                              background: selectedCategory === null ? COLORS.primaryTint : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontWeight: selectedCategory === null ? 700 : 600, fontSize: 13.5, color: COLORS.text }}>
                              Uncategorized
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMuted }}>{uncategorizedCount}</span>
                          </div>
                        )}
                        {catRows.map((c) => {
                          const isSelected = selectedCategory?.id === c.id;
                          return (
                            <div
                              key={c.id}
                              className="product-card"
                              onClick={() => setSelectedCategory(c)}
                              style={{
                                padding: "12px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderLeft: isSelected ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                                borderBottom: `1px solid ${COLORS.border}`,
                                background: isSelected ? COLORS.primaryTint : "transparent",
                              }}
                            >
                              <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13.5, color: COLORS.text }}>
                                {c.name}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMuted }}>{c.count}</span>
                            </div>
                          );
                        })}
                        {catRows.length === 0 && !showUncategorized && (
                          <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No categories found</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                {(() => {
                  const isUncategorized = selectedCategory === null;
                  const label = isUncategorized ? "Uncategorized Items" : selectedCategory?.name || "Select a category";
                  const items = isUncategorized
                    ? products.filter(p => !p.category_name)
                    : products.filter(p => p.category_name === selectedCategory?.name);
                  const filteredItems = items.filter(p =>
                    p.product_name?.toLowerCase().includes(categoryItemsSearch.toLowerCase())
                  );

                  return (
                    <>
                      <div
                        style={{
                          padding: "16px 20px",
                          borderBottom: `1px solid ${COLORS.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: COLORS.surfaceAlt,
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{label}</span>
                          <span style={{ marginLeft: 10, fontSize: 13, color: COLORS.textMuted }}>({items.length} items)</span>
                        </div>
                        {!isUncategorized && selectedCategory && (
                          <button
                            onClick={() => setShowMoveCategoryModal(true)}
                            style={{
                              padding: "7px 16px",
                              borderRadius: RADIUS.sm,
                              border: "none",
                              background: COLORS.primary,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            className="hover-lift"
                          >
                            Move Items Here
                          </button>
                        )}
                      </div>

                      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                        <div style={{ position: "relative", marginBottom: 14 }}>
                          <Search size={14} style={{ position: "absolute", top: "50%", left: 11, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                          <input
                            className="focus-ring"
                            value={categoryItemsSearch}
                            onChange={(e) => setCategoryItemsSearch(e.target.value)}
                            placeholder="Search items..."
                            style={{
                              width: "100%",
                              padding: "8px 12px 8px 34px",
                              borderRadius: RADIUS.sm,
                              border: `1.5px solid ${COLORS.border}`,
                              outline: "none",
                              fontSize: 13,
                              background: COLORS.bg,
                              transition: "all 0.15s",
                            }}
                          />
                        </div>

                        {filteredItems.length === 0 ? (
                          <EmptyState icon={<Boxes size={28} color={COLORS.textMuted} />} title="No items" subtitle="This category is empty" />
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {filteredItems.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  padding: "12px 16px",
                                  border: `1px solid ${COLORS.border}`,
                                  borderRadius: RADIUS.sm,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: COLORS.surface,
                                }}
                              >
                                <span style={{ fontWeight: 500, fontSize: 13, color: COLORS.text }}>{p.product_name}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.success }}>
                                  {Number(p.stock || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── BRAND TAB ─── */}
          {activeTab === "brand" && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "100%" }}>
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", top: "50%", left: 11, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                    <input
                      className="focus-ring"
                      placeholder="Search brands..."
                      value={brandListSearch}
                      onChange={(e) => setBrandListSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 34px",
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.border}`,
                        outline: "none",
                        fontSize: 13,
                        background: COLORS.bg,
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowBrandModal(true)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "9px",
                      background: COLORS.gradient,
                      color: "#fff",
                      border: "none",
                      borderRadius: RADIUS.sm,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                    className="hover-lift"
                  >
                    <Plus size={15} /> New Brand
                  </button>
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {(() => {
                    const unbrandedCount = products.filter(p => !p.brand_name).length;
                    const brandRows = brands
                      .filter(b => b.name?.toLowerCase().includes(brandListSearch.toLowerCase()))
                      .map(b => ({ ...b, count: products.filter(p => p.brand_name === b.name).length }));
                    const showUnbranded = brandListSearch === "" || "not in any brand".includes(brandListSearch.toLowerCase());

                    return (
                      <>
                        {showUnbranded && (
                          <div
                            className="product-card"
                            onClick={() => setSelectedBrand(null)}
                            style={{
                              padding: "12px 16px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderLeft: selectedBrand === null ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                              borderBottom: `1px solid ${COLORS.border}`,
                              background: selectedBrand === null ? COLORS.primaryTint : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{ fontWeight: selectedBrand === null ? 700 : 600, fontSize: 13.5, color: COLORS.text }}>
                              Unbranded
                            </span>
                            <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMuted }}>{unbrandedCount}</span>
                          </div>
                        )}
                        {brandRows.map((b) => {
                          const isSelected = selectedBrand?.id === b.id;
                          return (
                            <div
                              key={b.id}
                              className="product-card"
                              onClick={() => setSelectedBrand(b)}
                              style={{
                                padding: "12px 16px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderLeft: isSelected ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                                borderBottom: `1px solid ${COLORS.border}`,
                                background: isSelected ? COLORS.primaryTint : "transparent",
                              }}
                            >
                              <span style={{ fontWeight: isSelected ? 700 : 600, fontSize: 13.5, color: COLORS.text }}>
                                {b.name}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMuted }}>{b.count}</span>
                            </div>
                          );
                        })}
                        {brandRows.length === 0 && !showUnbranded && (
                          <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>No brands found</div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                {(() => {
                  const isUnbranded = selectedBrand === null;
                  const label = isUnbranded ? "Unbranded Items" : selectedBrand?.name || "Select a brand";
                  const items = isUnbranded
                    ? products.filter(p => !p.brand_name)
                    : products.filter(p => p.brand_name === selectedBrand?.name);
                  const filteredItems = items.filter(p =>
                    p.product_name?.toLowerCase().includes(brandItemsSearch.toLowerCase())
                  );

                  return (
                    <>
                      <div
                        style={{
                          padding: "16px 20px",
                          borderBottom: `1px solid ${COLORS.border}`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: COLORS.surfaceAlt,
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.text }}>{label}</span>
                          <span style={{ marginLeft: 10, fontSize: 13, color: COLORS.textMuted }}>({items.length} items)</span>
                        </div>
                        {!isUnbranded && selectedBrand && (
                          <button
                            onClick={() => setShowMoveBrandModal(true)}
                            style={{
                              padding: "7px 16px",
                              borderRadius: RADIUS.sm,
                              border: "none",
                              background: COLORS.primary,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            className="hover-lift"
                          >
                            Move Items Here
                          </button>
                        )}
                      </div>

                      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
                        <div style={{ position: "relative", marginBottom: 14 }}>
                          <Search size={14} style={{ position: "absolute", top: "50%", left: 11, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                          <input
                            className="focus-ring"
                            value={brandItemsSearch}
                            onChange={(e) => setBrandItemsSearch(e.target.value)}
                            placeholder="Search items..."
                            style={{
                              width: "100%",
                              padding: "8px 12px 8px 34px",
                              borderRadius: RADIUS.sm,
                              border: `1.5px solid ${COLORS.border}`,
                              outline: "none",
                              fontSize: 13,
                              background: COLORS.bg,
                              transition: "all 0.15s",
                            }}
                          />
                        </div>

                        {filteredItems.length === 0 ? (
                          <EmptyState icon={<Tags size={28} color={COLORS.textMuted} />} title="No items" subtitle="This brand is empty" />
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {filteredItems.map((p) => (
                              <div
                                key={p.id}
                                style={{
                                  padding: "12px 16px",
                                  border: `1px solid ${COLORS.border}`,
                                  borderRadius: RADIUS.sm,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: COLORS.surface,
                                }}
                              >
                                <span style={{ fontWeight: 500, fontSize: 13, color: COLORS.text }}>{p.product_name}</span>
                                <span style={{ fontWeight: 700, fontSize: 14, color: COLORS.success }}>
                                  {Number(p.stock || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── UNIT TAB ─── */}
          {activeTab === "unit" && (
            <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, height: "100%" }}>
              {/* Left Panel - Unit List */}
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", top: "50%", left: 11, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                    <input
                      className="focus-ring"
                      placeholder="Search units..."
                      value={unitListSearch}
                      onChange={(e) => setUnitListSearch(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 12px 8px 34px",
                        borderRadius: RADIUS.sm,
                        border: `1.5px solid ${COLORS.border}`,
                        outline: "none",
                        fontSize: 13,
                        background: COLORS.bg,
                        transition: "all 0.15s",
                      }}
                    />
                  </div>
                  <button
                    onClick={() => setShowUnitModal(true)}
                    style={{
                      width: "100%",
                      marginTop: 10,
                      padding: "9px",
                      background: COLORS.gradient,
                      color: "#fff",
                      border: "none",
                      borderRadius: RADIUS.sm,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s",
                    }}
                    className="hover-lift"
                  >
                    <Plus size={15} /> New Unit
                  </button>
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {units
                    .filter(u => 
                      u.full.toLowerCase().includes(unitListSearch.toLowerCase()) || 
                      u.short.toLowerCase().includes(unitListSearch.toLowerCase())
                    )
                    .map((u) => {
                      const isSelected = selectedUnit?.full === u.full;
                      return (
                        <div
                          key={u.full}
                          className="product-card"
                          onClick={() => handleSelectUnit(u)}
                          style={{
                            padding: "12px 16px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderLeft: isSelected ? `3px solid ${COLORS.primary}` : "3px solid transparent",
                            borderBottom: `1px solid ${COLORS.border}`,
                            background: isSelected ? COLORS.primaryTint : "transparent",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontWeight: isSelected ? 700 : 500, fontSize: 13.5, color: COLORS.text }}>
                            {u.full}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMuted }}>{u.short}</span>
                        </div>
                      );
                    })}
                  {units.filter(u => 
                    u.full.toLowerCase().includes(unitListSearch.toLowerCase()) || 
                    u.short.toLowerCase().includes(unitListSearch.toLowerCase())
                  ).length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: COLORS.textMuted, fontSize: 13 }}>
                      No units found
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Unit Details */}
              <div
                style={{
                  background: COLORS.surface,
                  borderRadius: RADIUS.lg,
                  border: `1px solid ${COLORS.border}`,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: SHADOW.card,
                }}
              >
                {!selectedUnit ? (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: RADIUS.xl,
                        background: COLORS.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 16,
                        border: `2px dashed ${COLORS.border}`,
                      }}
                    >
                      <Ruler size={32} color={COLORS.primary} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>Select a unit</div>
                    <p style={{ fontSize: 13, marginTop: 6, color: COLORS.textMuted, maxWidth: 300, textAlign: "center", lineHeight: 1.6 }}>
                      Click on any unit from the list to view its details and conversions.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Unit Header */}
                    <div
                      style={{
                        padding: "20px 24px",
                        borderBottom: `1px solid ${COLORS.border}`,
                        background: COLORS.surfaceAlt,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: 20, fontWeight: 800, color: COLORS.text, letterSpacing: "-0.01em" }}>
                            {selectedUnit.full}
                          </span>
                          <span
                            style={{
                              marginLeft: 12,
                              padding: "2px 12px",
                              borderRadius: RADIUS.pill,
                              fontSize: 11,
                              fontWeight: 600,
                              background: COLORS.primaryTint,
                              color: COLORS.primary,
                            }}
                          >
                            {selectedUnit.short}
                          </span>
                        </div>
                        <button
                          style={{
                            padding: "6px 14px",
                            borderRadius: RADIUS.sm,
                            border: `1.5px solid ${COLORS.border}`,
                            background: COLORS.surface,
                            fontWeight: 600,
                            fontSize: 12,
                            cursor: "pointer",
                            color: COLORS.textSoft,
                            transition: "all 0.15s",
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                          className="hover-bg"
                          onClick={() => {
                            setUnitFullForm(selectedUnit.full);
                            setUnitShortForm(selectedUnit.short);
                            setShowUnitModal(true);
                          }}
                        >
                          <Edit size={14} /> Edit
                        </button>
                      </div>
                    </div>

                    {/* Unit Details */}
                    <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
                      {/* UNITS Section */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ 
                          fontSize: 12, 
                          fontWeight: 700, 
                          color: COLORS.textMuted, 
                          textTransform: "uppercase", 
                          letterSpacing: "0.06em",
                          marginBottom: 12 
                        }}>
                          UNITS
                        </div>
                        <div
                          style={{
                            padding: "12px 16px",
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: RADIUS.sm,
                            background: COLORS.surfaceAlt,
                            display: "flex",
                            alignItems: "center",
                            gap: 20,
                          }}
                        >
                          <div>
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>FULLNAME</span>
                            <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginTop: 2 }}>
                              {selectedUnit.full}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>SHORTNAME</span>
                            <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text, marginTop: 2 }}>
                              {selectedUnit.short}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CONVERSION Section */}
                      <div>
                        <div style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center",
                          marginBottom: 12 
                        }}>
                          <span style={{ 
                            fontSize: 12, 
                            fontWeight: 700, 
                            color: COLORS.textMuted, 
                            textTransform: "uppercase", 
                            letterSpacing: "0.06em" 
                          }}>
                            CONVERSION
                          </span>
                          <button
                            onClick={() => setShowConversionModal(true)}
                            style={{
                              padding: "6px 16px",
                              borderRadius: RADIUS.sm,
                              border: "none",
                              background: COLORS.gradient,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              cursor: "pointer",
                              transition: "all 0.15s",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                            className="hover-lift"
                          >
                            <Plus size={14} /> Add Conversion
                          </button>
                        </div>

                        {/* Conversion List */}
                        {conversions.length === 0 ? (
                          <div
                            style={{
                              border: `1.5px dashed ${COLORS.border}`,
                              borderRadius: RADIUS.md,
                              padding: "30px 20px",
                              textAlign: "center",
                              background: COLORS.surfaceAlt,
                            }}
                          >
                            <Ruler size={28} color={COLORS.textMuted} style={{ marginBottom: 8, opacity: 0.5 }} />
                            <div style={{ fontWeight: 500, fontSize: 13, color: COLORS.textMuted }}>
                              No conversions yet
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              border: `1px solid ${COLORS.border}`,
                              borderRadius: RADIUS.md,
                              overflow: "hidden",
                            }}
                          >
                            {conversions.map((conv, index) => (
                              <div
                                key={index}
                                style={{
                                  padding: "12px 16px",
                                  borderBottom: index < conversions.length - 1 ? `1px solid ${COLORS.border}` : "none",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  background: COLORS.surface,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                  <span style={{ fontWeight: 600, color: COLORS.text }}>
                                    1 {conv.fromUnit || selectedUnit.full}
                                  </span>
                                  <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 15 }}>=</span>
                                  <span style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>
                                    {conv.value} {conv.toUnit}
                                  </span>
                                  {conv.isBase && (
                                    <span
                                      style={{
                                        padding: "1px 10px",
                                        borderRadius: RADIUS.pill,
                                        fontSize: 10,
                                        fontWeight: 600,
                                        background: COLORS.successTint,
                                        color: COLORS.success,
                                      }}
                                    >
                                      Base
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => {
                                    setConversions(prev => prev.filter((_, i) => i !== index));
                                    showToast("Conversion removed");
                                  }}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: COLORS.textMuted,
                                    padding: 4,
                                    borderRadius: RADIUS.sm,
                                    transition: "all 0.15s",
                                  }}
                                  className="hover-bg"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {showCatModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCatModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 400,
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Category</h3>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                Category Name *
              </label>
              <input
                className="focus-ring"
                value={catForm}
                onChange={e => setCatForm(e.target.value)}
                placeholder="e.g. Electronics"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  outline: "none",
                  fontSize: 14,
                  transition: "all 0.15s",
                }}
                onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              />
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowCatModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  background: "transparent",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: COLORS.textSoft,
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                disabled={savingSub}
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: "none",
                  background: savingSub ? COLORS.textMuted : COLORS.primary,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: savingSub ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {savingSub ? "Saving..." : "Save Category"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBrandModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowBrandModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 400,
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Brand</h3>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                Brand Name *
              </label>
              <input
                className="focus-ring"
                value={brandForm}
                onChange={e => setBrandForm(e.target.value)}
                placeholder="e.g. Nike"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  outline: "none",
                  fontSize: 14,
                  transition: "all 0.15s",
                }}
                onKeyDown={e => e.key === "Enter" && handleAddBrand()}
              />
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowBrandModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  background: "transparent",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: COLORS.textSoft,
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddBrand}
                disabled={savingSub}
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: "none",
                  background: savingSub ? COLORS.textMuted : COLORS.primary,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: savingSub ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {savingSub ? "Saving..." : "Save Brand"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUnitModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnitModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 400,
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Unit</h3>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                  Full Name *
                </label>
                <input
                  className="focus-ring"
                  value={unitFullForm}
                  onChange={e => setUnitFullForm(e.target.value)}
                  placeholder="e.g. KILOGRAMS"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleAddUnit()}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                  Short Name *
                </label>
                <input
                  className="focus-ring"
                  value={unitShortForm}
                  onChange={e => setUnitShortForm(e.target.value)}
                  placeholder="e.g. Kg"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleAddUnit()}
                />
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowUnitModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  background: "transparent",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: COLORS.textSoft,
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUnit}
                style={{
                  flex: 2,
                  padding: "10px",
                  borderRadius: RADIUS.sm,
                  border: "none",
                  background: COLORS.primary,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Save Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CONVERSION MODAL ─── */}
      {showConversionModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowConversionModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 99999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 520,
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>
                Add Conversion
              </h3>
              <button
                onClick={() => setShowConversionModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: COLORS.textMuted,
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: RADIUS.sm,
                  transition: "all 0.15s",
                }}
                className="hover-bg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px" }}>
              {/* From Unit */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: COLORS.textMuted, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em", 
                  display: "block", 
                  marginBottom: 6 
                }}>
                  From Unit
                </label>
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    background: COLORS.bg,
                    fontSize: 14,
                    fontWeight: 600,
                    color: COLORS.text,
                  }}
                >
                  {selectedUnit?.full || "Select a unit"}
                </div>
              </div>

              {/* Conversion Value */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: COLORS.textMuted, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em", 
                  display: "block", 
                  marginBottom: 6 
                }}>
                  Conversion Value *
                </label>
                <input
                  className="focus-ring"
                  value={conversionValue}
                  onChange={(e) => setConversionValue(e.target.value)}
                  placeholder="e.g. 1000"
                  type="number"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    color: COLORS.text,
                    transition: "all 0.15s",
                  }}
                  onKeyDown={e => e.key === "Enter" && handleAddConversion()}
                />
              </div>

              {/* To Unit */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: COLORS.textMuted, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em", 
                  display: "block", 
                  marginBottom: 6 
                }}>
                  To Unit *
                </label>
                <select
                  className="focus-ring"
                  value={conversionToUnit}
                  onChange={(e) => setConversionToUnit(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    color: COLORS.text,
                    background: COLORS.surface,
                    transition: "all 0.15s",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select a unit</option>
                  {units
                    .filter(u => u.full !== selectedUnit?.full)
                    .map((u) => (
                      <option key={u.full} value={u.full}>
                        {u.full} ({u.short})
                      </option>
                    ))}
                </select>
              </div>

              {/* Base Unit Checkbox */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 10, 
                  cursor: "pointer",
                  fontSize: 13,
                  color: COLORS.textSoft,
                }}>
                  <input
                    type="checkbox"
                    checked={conversionIsBase}
                    onChange={(e) => setConversionIsBase(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer",
                      accentColor: COLORS.primary,
                    }}
                  />
                  <span>Set as base unit</span>
                </label>
              </div>

              {/* Rate (optional) */}
              <div>
                <label style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: COLORS.textMuted, 
                  textTransform: "uppercase", 
                  letterSpacing: "0.04em", 
                  display: "block", 
                  marginBottom: 6 
                }}>
                  Rate (Optional)
                </label>
                <input
                  className="focus-ring"
                  value={conversionRate}
                  onChange={(e) => setConversionRate(e.target.value)}
                  placeholder="e.g. 0.001"
                  type="number"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    color: COLORS.text,
                    transition: "all 0.15s",
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setShowConversionModal(false);
                  setConversionValue("");
                  setConversionToUnit("");
                  setConversionIsBase(false);
                  setConversionRate("");
                }}
                style={{
                  padding: "10px 24px",
                  borderRadius: RADIUS.sm,
                  border: `1.5px solid ${COLORS.border}`,
                  background: "transparent",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  color: COLORS.textSoft,
                  transition: "all 0.15s",
                }}
                className="hover-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddConversion}
                disabled={savingConversion}
                style={{
                  padding: "10px 32px",
                  borderRadius: RADIUS.sm,
                  border: "none",
                  background: savingConversion ? COLORS.textMuted : COLORS.gradient,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: savingConversion ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
                className="hover-lift"
              >
                {savingConversion ? "Saving..." : "Save Conversion"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Category Modal */}
      {showMoveCategoryModal && selectedCategory && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoveCategoryModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 560,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Select Items to Move</h3>
              <button
                onClick={() => setShowMoveCategoryModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: COLORS.textMuted, padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                <input
                  className="focus-ring"
                  value={moveCategorySearch}
                  onChange={(e) => setMoveCategorySearch(e.target.value)}
                  placeholder="Search items..."
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                />
              </div>
            </div>

            <div style={{ padding: "12px 24px", flex: 1, overflowY: "auto" }}>
              {moveCategoryOptions.map((p) => {
                const checked = moveCategorySelected.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="hover-bg"
                    onClick={() => setMoveCategorySelected(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                    style={{
                      padding: "10px 12px",
                      borderRadius: RADIUS.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => {}} />
                    <span style={{ flex: 1, fontSize: 13.5, color: COLORS.text }}>{p.product_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{Number(p.stock || 0)}</span>
                  </div>
                );
              })}
              {moveCategoryOptions.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted }}>No items found</div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textSoft, cursor: "pointer" }}>
                <input type="checkbox" checked={removeFromExistingCategory} onChange={(e) => setRemoveFromExistingCategory(e.target.checked)} />
                Remove from existing category
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowMoveCategoryModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    background: "transparent",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    color: COLORS.textSoft,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToCategory}
                  disabled={moveCategorySelected.length === 0}
                  style={{
                    padding: "8px 20px",
                    borderRadius: RADIUS.sm,
                    border: "none",
                    background: moveCategorySelected.length === 0 ? COLORS.textMuted : COLORS.danger,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: moveCategorySelected.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Move ({moveCategorySelected.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move Brand Modal */}
      {showMoveBrandModal && selectedBrand && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoveBrandModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(10,22,40,.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: RADIUS.lg,
              width: "100%",
              maxWidth: 560,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Select Items to Move</h3>
              <button
                onClick={() => setShowMoveBrandModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: COLORS.textMuted, padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                <input
                  className="focus-ring"
                  value={moveBrandSearch}
                  onChange={(e) => setMoveBrandSearch(e.target.value)}
                  placeholder="Search items..."
                  style={{
                    width: "100%",
                    padding: "9px 12px 9px 36px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 13,
                    transition: "all 0.15s",
                  }}
                />
              </div>
            </div>

            <div style={{ padding: "12px 24px", flex: 1, overflowY: "auto" }}>
              {moveBrandOptions.map((p) => {
                const checked = moveBrandSelected.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className="hover-bg"
                    onClick={() => setMoveBrandSelected(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                    style={{
                      padding: "10px 12px",
                      borderRadius: RADIUS.sm,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      borderBottom: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => {}} />
                    <span style={{ flex: 1, fontSize: 13.5, color: COLORS.text }}>{p.product_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{Number(p.stock || 0)}</span>
                  </div>
                );
              })}
              {moveBrandOptions.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted }}>No items found</div>
              )}
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: COLORS.textSoft, cursor: "pointer" }}>
                <input type="checkbox" checked={removeFromExistingBrand} onChange={(e) => setRemoveFromExistingBrand(e.target.checked)} />
                Remove from existing brand
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowMoveBrandModal(false)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    background: "transparent",
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: "pointer",
                    color: COLORS.textSoft,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMoveToBrand}
                  disabled={moveBrandSelected.length === 0}
                  style={{
                    padding: "8px 20px",
                    borderRadius: RADIUS.sm,
                    border: "none",
                    background: moveBrandSelected.length === 0 ? COLORS.textMuted : COLORS.danger,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: moveBrandSelected.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Move ({moveBrandSelected.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}