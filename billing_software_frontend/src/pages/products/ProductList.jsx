import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import { Edit } from "lucide-react";
import {
  Search, Plus, ChevronDown, SlidersHorizontal,
  MoreVertical, FileSpreadsheet, ArrowUpRight, Filter, X,
  Package, MousePointerClick, Boxes, Tags, Ruler, Inbox,
  ShoppingBag, Layers, ListTree, Grid, List, BarChart3,
  ChevronRight, ChevronLeft, Star, Zap, Eye, Building2,
  CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, Pencil,
  Tag, Sparkles, TrendingUp, LayoutGrid, LayoutList, ArrowRight, Check
} from "lucide-react";
import AddProductModal from "./AddProductModal";
import EditProductModal from "./EditProductModal";
import StatusBadge from "../../components/ui/StatusBadge";

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

/* ─────────────────────────  DESIGN SYSTEM (PAYSPLITX PALETTE)  ───────────────────────── */
const COLORS = {
  bg: "#f8faff",
  surface: "#ffffff",
  surfaceAlt: "#f8faff",
  border: "#e8edf5",
  text: "#0f172a",
  textSoft: "#334155",
  textMuted: "#64748b",
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  primaryTint: "#eef2ff",
  success: "#10b981",
  successTint: "#ecfdf5",
  danger: "#ef4444",
  dangerTint: "#fef2f2",
  warning: "#f59e0b",
  warningTint: "#fffbeb",
  brand: "#6366f1",
  brandDark: "#4338ca",
  brandTint: "#eef2ff",
  gradient: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
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
  const [productFilterTab, setProductFilterTab] = useState("all");
  const [showProductDrawer, setShowProductDrawer] = useState(false);
  const [selectedProductRows, setSelectedProductRows] = useState([]);

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
  const [brandViewMode, setBrandViewMode] = useState("cards");
  const [brandItemFilter, setBrandItemFilter] = useState("all");
  const [brandItemsLayout, setBrandItemsLayout] = useState("grid");
  const [showMoveBrandModal, setShowMoveBrandModal] = useState(false);
  const [moveBrandSearch, setMoveBrandSearch] = useState("");
  const [moveBrandSelected, setMoveBrandSelected] = useState([]);
  const [removeFromExistingBrand, setRemoveFromExistingBrand] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryListSearch, setCategoryListSearch] = useState("");
  const [categoryItemsSearch, setCategoryItemsSearch] = useState("");
  const [categoryViewMode, setCategoryViewMode] = useState("cards");
  const [categoryItemFilter, setCategoryItemFilter] = useState("all");
  const [categoryItemsLayout, setCategoryItemsLayout] = useState("grid");
  const [showMoveCategoryModal, setShowMoveCategoryModal] = useState(false);
  const [moveCategorySearch, setMoveCategorySearch] = useState("");
  const [moveCategorySelected, setMoveCategorySelected] = useState([]);
  const [removeFromExistingCategory, setRemoveFromExistingCategory] = useState(false);
  const [showMoveSubcategoryModal, setShowMoveSubcategoryModal] = useState(false);
  const [moveSubcategorySearch, setMoveSubcategorySearch] = useState("");
  const [moveSubcategorySelected, setMoveSubcategorySelected] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [subcategoryListSearch, setSubcategoryListSearch] = useState("");
  const [subcategoryItemsSearch, setSubcategoryItemsSearch] = useState("");
  const [showSubcatModal, setShowSubcatModal] = useState(false);
  const [subcatForm, setSubcatForm] = useState("");
  const [subcatCategoryId, setSubcatCategoryId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [unitListSearch, setUnitListSearch] = useState("");
  const [unitItemsSearch, setUnitItemsSearch] = useState("");
  const [unitViewMode, setUnitViewMode] = useState("cards");
  const [unitItemFilter, setUnitItemFilter] = useState("all");
  const [unitItemsLayout, setUnitItemsLayout] = useState("grid");
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

  useEffect(() => {
    const modalOpen = showCatModal || showSubcatModal || showBrandModal || showUnitModal;
    document.body.style.overflow = modalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [showCatModal, showSubcatModal, showBrandModal, showUnitModal]);

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

  const fetchSubcategories = async (company_id) => {
    if (!company_id) {
      setSubcategories([]);
      return;
    }
    try {
      const res = await api.get(`/subcategory/get_active_subcategory?company_id=${company_id}`);
      if (res.data.status) setSubcategories(res.data.data);
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
    fetchSubcategories(selectedCompany);
    fetchBrands(selectedCompany);
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedProduct) fetchSaleHistory(selectedProduct.id);
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (activeTab === "unit" && !selectedUnit && units.length > 0) {
      handleSelectUnit(units[0]);
    }
  }, [activeTab]);

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
    fetchSubcategories(companyId);
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

  const totalStockUnits = useMemo(() => {
    return products.reduce((s, p) => s + Number(p.stock || 0), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter((p) => p.status === "active" && Number(p.stock || 0) <= 5 && Number(p.stock || 0) > 0).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter((p) => Number(p.stock || 0) <= 0).length;
  }, [products]);

  const inStockCount = useMemo(() => {
    return products.filter((p) => Number(p.stock || 0) > 5).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((s, p) => {
      const price = Number(p.purchase_price || p.price || 0);
      return s + (Number(p.stock || 0) * price);
    }, 0);
  }, [products]);

  const displayedProducts = useMemo(() => {
    return filtered.filter((p) => {
      const stock = Number(p.stock || 0);
      if (productFilterTab === "in_stock") return stock > 5;
      if (productFilterTab === "low_stock") return p.status === "active" && stock <= 5 && stock > 0;
      if (productFilterTab === "out_of_stock") return stock <= 0;
      return true;
    });
  }, [filtered, productFilterTab]);

  const openProductDrawer = (p) => {
    handleSelectProduct(p);
    setShowProductDrawer(true);
  };

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
        category_id: selectedCategory?.id || 0,
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

  const handleAddSubcategory = async () => {
    if (!subcatForm.trim()) {
      showToast("Enter a subcategory name", false);
      return;
    }
    if (!subcatCategoryId) {
      showToast("Please select a category", false);
      return;
    }
    setSavingSub(true);
    try {
      const res = await api.post("/subcategory/create", {
        name: subcatForm.trim(),
        category_id: Number(subcatCategoryId),
        company_id: getCompanyId(),
      });
      if (res.data.status) {
        showToast("Subcategory added!");
        setSubcatForm("");
        setSubcatCategoryId("");
        setShowSubcatModal(false);
        fetchSubcategories(selectedCompany);
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

  const moveProducts = async (productIds, changes) => {
    const res = await api.post("/product/move", {
      product_ids: productIds,
      company_id: getCompanyId(),
      ...changes,
    });

    if (!res.data.status) {
      throw new Error(res.data.message || "Failed to move products");
    }
  };

  const handleMoveToCategory = async () => {
    if (!selectedCategory || moveCategorySelected.length === 0) return;
    try {
      await moveProducts(moveCategorySelected, { category_id: selectedCategory.id });
      setProducts((prev) => prev.map((p) => moveCategorySelected.includes(p.id)
        ? { ...p, category_name: selectedCategory.name, category_id: selectedCategory.id }
        : p));
      showToast(`Moved ${moveCategorySelected.length} item(s) to ${selectedCategory.name}`);
    } catch (err) {
      showToast(err.message, false);
      return;
    }
    setShowMoveCategoryModal(false);
    setMoveCategorySelected([]);
    setMoveCategorySearch("");
    setRemoveFromExistingCategory(false);
  };

  const handleMoveToBrand = async () => {
    if (!selectedBrand || moveBrandSelected.length === 0) return;
    try {
      await moveProducts(moveBrandSelected, { brand_id: selectedBrand.id });
      setProducts((prev) => prev.map((p) => moveBrandSelected.includes(p.id)
        ? { ...p, brand_name: selectedBrand.name, brand_id: selectedBrand.id }
        : p));
      showToast(`Moved ${moveBrandSelected.length} item(s) to ${selectedBrand.name}`);
    } catch (err) {
      showToast(err.message, false);
      return;
    }
    setShowMoveBrandModal(false);
    setMoveBrandSelected([]);
    setMoveBrandSearch("");
    setRemoveFromExistingBrand(false);
  };

  const handleMoveToSubcategory = async () => {
    if (!selectedSubcategory || moveSubcategorySelected.length === 0) return;
    try {
      await moveProducts(moveSubcategorySelected, { subcategory_id: selectedSubcategory.id });
      setProducts((prev) => prev.map((p) => moveSubcategorySelected.includes(p.id)
        ? { ...p, subcategory_name: selectedSubcategory.name, subcategory_id: selectedSubcategory.id }
        : p));
      showToast(`Moved ${moveSubcategorySelected.length} item(s) to ${selectedSubcategory.name}`);
    } catch (err) {
      showToast(err.message, false);
      return;
    }
    setShowMoveSubcategoryModal(false);
    setMoveSubcategorySelected([]);
    setMoveSubcategorySearch("");
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

  const moveSubcategoryOptions = products.filter(
    (p) =>
      Number(p.subcategory_id) !== Number(selectedSubcategory?.id) &&
      p.product_name?.toLowerCase().includes(moveSubcategorySearch.toLowerCase())
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
      <div style={{ minHeight: "100%", width: "100%", background: COLORS.bg, fontFamily: FONT, color: COLORS.textSoft }}>

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

        {/* ─── TAB BAR (PaySplitX Segmented Nav) ─── */}
        <div className="bg-white border-b border-slate-200/80 px-6 py-2.5 flex items-center gap-2 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = 
              key === "product" ? products.length :
              key === "brand" ? brands.length :
              key === "category" ? categories.length :
              key === "subcategory" ? subcategories.length :
              key === "unit" ? units.length : 0;
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon size={14} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ─── CONTENT AREA ─── */}
        <div style={{ padding: "8px 24px 24px", height: "calc(100vh - 108px)" }}>

          {/* ─── PRODUCT TAB: PaySplitX Style ─── */}
          {activeTab === "product" && (
            <div className="space-y-5">
              {/* ── 4 METRIC STAT CARDS (PaySplitX Style) ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total SKUs */}
                <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ShoppingBag size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                    {products.length}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="text-emerald-600 font-bold">
                      {products.filter((p) => p.status === "active").length} Active
                    </span>
                    <span>in catalog</span>
                  </div>
                </div>

                {/* Total Units */}
                <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Stock Units</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Boxes size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
                    {fmt(totalStockUnits)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Units across all inventory
                  </div>
                </div>

                {/* Low Stock Alert */}
                <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Alerts</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <AlertTriangle size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-amber-600 tracking-tight my-1 font-display">
                    {lowStockCount}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Requires replenishing</span>
                  </div>
                </div>

                {/* Total Inventory Value */}
                <div className="psx-card p-4 relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock Valuation</span>
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                      <Zap size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-cyan-700 tracking-tight my-1 font-display">
                    ₹{fmt(totalInventoryValue)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total current asset valuation
                  </div>
                </div>
              </div>

              {/* ── SEARCH & FILTER TOOLBAR ── */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Segment Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl flex-wrap">
                  {[
                    { id: "all", label: "All Items", count: products.length },
                    { id: "in_stock", label: "In Stock", count: inStockCount },
                    { id: "low_stock", label: "Low Stock Alert", count: lowStockCount },
                    { id: "out_of_stock", label: "Out of Stock", count: outOfStockCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setProductFilterTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        productFilterTab === tab.id
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          productFilterTab === tab.id
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-200/70 text-slate-600"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Right side search and add */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative min-w-[240px]">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name, code, barcode..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-glow-brand transition transform active:scale-95 cursor-pointer"
                  >
                    <Plus size={15} strokeWidth={2.6} />
                    <span>Add Product</span>
                  </button>
                </div>
              </div>

              {/* ── PRODUCTS DIRECTORY TABLE (PaySplitX Style) ── */}
              <div className="psx-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse psx-table">
                    <thead>
                      <tr>
                        <th className="w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              displayedProducts.length > 0 &&
                              selectedProductRows.length === displayedProducts.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductRows(displayedProducts.map((p) => p.id));
                              } else {
                                setSelectedProductRows([]);
                              }
                            }}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </th>
                        <th>Product & SKU</th>
                        <th>Barcode / HSN</th>
                        <th>Purchase Price</th>
                        <th>Sale Price</th>
                        <th>Stock Level</th>
                        <th>Status</th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                            <RefreshCw size={20} className="animate-spin text-indigo-600 mx-auto mb-2" />
                            Loading inventory items...
                          </td>
                        </tr>
                      ) : displayedProducts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-16 text-center text-slate-400">
                            <Package size={36} className="mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No products found</p>
                            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search keywords</p>
                          </td>
                        </tr>
                      ) : (
                        displayedProducts.map((p) => {
                          const stock = Number(p.stock || 0);
                          const isChecked = selectedProductRows.includes(p.id);
                          const isLow = stock <= 5 && stock > 0;
                          const isOut = stock <= 0;

                          return (
                            <tr key={p.id} className={isChecked ? "bg-indigo-50/40" : ""}>
                              {/* Checkbox */}
                              <td className="text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedProductRows((prev) =>
                                      prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                                    );
                                  }}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>

                              {/* Product Name & SKU */}
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-50 to-slate-100 text-indigo-600 border border-slate-200/80 flex items-center justify-center font-bold flex-shrink-0 shadow-xs">
                                    <Package size={18} />
                                  </div>
                                  <div>
                                    <div
                                      onClick={() => openProductDrawer(p)}
                                      className="font-bold text-slate-900 hover:text-indigo-600 text-xs cursor-pointer transition"
                                    >
                                      {p.product_name}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                      <span className="font-mono">{p.product_code || "No SKU"}</span>
                                      {p.category_name && (
                                        <>
                                          <span>•</span>
                                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                            {p.category_name}
                                          </span>
                                        </>
                                      )}
                                      {p.brand_name && (
                                        <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 font-medium">
                                          {p.brand_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Barcode / HSN */}
                              <td>
                                <span className="font-mono text-xs text-slate-600">
                                  {p.barcode || "—"}
                                </span>
                              </td>

                              {/* Purchase Price */}
                              <td>
                                <span className="text-xs font-semibold text-slate-700">
                                  ₹{fmt(p.purchase_price || 0)}
                                </span>
                              </td>

                              {/* Selling Price */}
                              <td>
                                <span className="text-xs font-bold text-slate-900">
                                  ₹{fmt(p.sale_price || p.price || 0)}
                                </span>
                              </td>

                              {/* Stock */}
                              <td>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs font-bold ${
                                      isOut
                                        ? "text-rose-600"
                                        : isLow
                                        ? "text-amber-600"
                                        : "text-emerald-600"
                                    }`}
                                  >
                                    {stock}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {p.unit || "units"}
                                  </span>
                                </div>
                              </td>

                              {/* Status */}
                              <td>
                                {isOut ? (
                                  <StatusBadge status="danger" label="Out of Stock" size="sm" />
                                ) : isLow ? (
                                  <StatusBadge status="warning" label="Low Stock" size="sm" />
                                ) : (
                                  <StatusBadge status="success" label="In Stock" size="sm" />
                                )}
                              </td>

                              {/* Action Buttons */}
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* View Drawer */}
                                  <button
                                    onClick={() => openProductDrawer(p)}
                                    title="View Stock Transactions"
                                    className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                  >
                                    <Eye size={15} />
                                  </button>

                                  {/* Edit Product */}
                                  <button
                                    onClick={() => {
                                      handleSelectProduct(p);
                                      setShowEditModal(true);
                                    }}
                                    title="Edit Product"
                                    className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── SLIDE-OVER PRODUCT DETAIL & TRANSACTION HISTORY DRAWER ── */}
              {showProductDrawer && selectedProduct && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
                    onClick={() => setShowProductDrawer(false)}
                  />
                  <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                    <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250">
                      {/* Header */}
                      <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-start justify-between flex-shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow-glow-brand">
                            <Package size={22} />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold font-display">{selectedProduct.product_name}</h2>
                            <p className="text-xs text-indigo-300 flex items-center gap-2 mt-0.5 font-mono">
                              <span>SKU: {selectedProduct.product_code || "N/A"}</span>
                              {selectedProduct.category_name && <span>• {selectedProduct.category_name}</span>}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => setShowProductDrawer(false)}
                          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Pricing & Stock KPI strip */}
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 flex-wrap flex-shrink-0">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Sale Price</span>
                            <span className="text-sm font-extrabold text-slate-900">₹{fmt(selectedProduct.sale_price || selectedProduct.price || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Purchase Price</span>
                            <span className="text-sm font-extrabold text-slate-700">₹{fmt(selectedProduct.purchase_price || 0)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block">Available Stock</span>
                            <span className="text-sm font-extrabold text-emerald-600">{selectedProduct.stock} {selectedProduct.unit || ""}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowEditModal(true)}
                            className="psx-btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-glow-brand"
                          >
                            <Pencil size={13} />
                            <span>Edit Product</span>
                          </button>
                        </div>
                      </div>

                      {/* Drawer Body: Transactions */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 paysplitx-scrollbar-light">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-wider">
                            Stock Movement & Sales History ({filteredHistory.length})
                          </h3>
                          <button
                            onClick={exportToCSV}
                            className="psx-btn-secondary px-3 py-1 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet size={13} className="text-emerald-600" />
                            <span>Export CSV</span>
                          </button>
                        </div>

                        <div className="psx-table-container">
                          <table className="w-full text-left border-collapse psx-table text-xs">
                            <thead>
                              <tr>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Quantity</th>
                                <th>Sale Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loadingHistory ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-slate-400">
                                    Loading history...
                                  </td>
                                </tr>
                              ) : filteredHistory.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-slate-400">
                                    No transaction history recorded yet for this product.
                                  </td>
                                </tr>
                              ) : (
                                filteredHistory.map((s, i) => (
                                  <tr key={i}>
                                    <td className="font-semibold text-slate-800">{s.customer_name || "-"}</td>
                                    <td className="text-slate-500">{s.customer_phone || "-"}</td>
                                    <td className="font-bold text-slate-900">{s.quantity} {selectedProduct.unit || ""}</td>
                                    <td className="font-bold text-emerald-600">₹{fmt(s.price)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── CATEGORY TAB (Modernized UI/UX) ─── */}
          {activeTab === "category" && (
            <div className="space-y-4">
              {/* ── 1. CATEGORY METRIC KPI STRIP ── */}
              {(() => {
                const uncategorizedProducts = products.filter((p) => !p.category_name);
                const categorizedProducts = products.filter((p) => Boolean(p.category_name));
                const totalCategorizedStock = categorizedProducts.reduce((s, p) => s + Number(p.stock || 0), 0);
                const totalCategorizedValuation = categorizedProducts.reduce((s, p) => {
                  const price = Number(p.purchase_price || p.price || 0);
                  return s + Number(p.stock || 0) * price;
                }, 0);
                const categorizedPercentage = products.length > 0
                  ? Math.round((categorizedProducts.length / products.length) * 100)
                  : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Total Categories */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Categories</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Layers size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                        {categories.length}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-indigo-600 font-bold">{categorizedProducts.length} items</span>
                        <span>classified into categories</span>
                      </div>
                    </div>

                    {/* Catalog Coverage */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categorization Rate</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
                        {categorizedPercentage}%
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-emerald-700 font-bold">{totalCategorizedStock} units</span>
                        <span>in categorized stock</span>
                      </div>
                    </div>

                    {/* Uncategorized Alert */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className={`absolute top-0 left-0 right-0 h-1 ${uncategorizedProducts.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Uncategorized Items</span>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${uncategorizedProducts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {uncategorizedProducts.length > 0 ? <AlertTriangle size={16} /> : <Check size={16} />}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold tracking-tight my-1 font-display ${uncategorizedProducts.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
                        {uncategorizedProducts.length}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={uncategorizedProducts.length > 0 ? "text-amber-700 font-semibold" : "text-slate-500"}>
                          {uncategorizedProducts.length > 0 ? "Unassigned classification" : "All items categorized"}
                        </span>
                        {uncategorizedProducts.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedCategory(null);
                              setCategoryViewMode("split");
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-bold underline cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Categorized Valuation */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category Asset Value</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-cyan-700 tracking-tight my-1 font-display">
                        ₹{fmt(totalCategorizedValuation)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Asset value of categorized products
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 2. CATEGORY TOOLBAR & VIEW CONTROLS ── */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left search */}
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories by name..."
                      value={categoryListSearch}
                      onChange={(e) => setCategoryListSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    {categoryListSearch && (
                      <button onClick={() => setCategoryListSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right controls: View Toggle & Add Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    <button
                      onClick={() => setCategoryViewMode("split")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        categoryViewMode === "split"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Studio Master-Detail Explorer"
                    >
                      <Layers size={13} />
                      <span>Studio View</span>
                    </button>
                    <button
                      onClick={() => setCategoryViewMode("cards")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        categoryViewMode === "cards"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Visual Category Card Showcase"
                    >
                      <LayoutGrid size={13} />
                      <span>Card Showcase</span>
                    </button>
                  </div>

                  {/* Add New Category Button */}
                  <button
                    onClick={() => setShowCatModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-glow-brand transition transform active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.6} />
                    <span>Add Category</span>
                  </button>
                </div>
              </div>

              {/* ── 3.A VIEW MODE: VISUAL CATEGORY SHOWCASE GRID ── */}
              {categoryViewMode === "cards" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Special Card: Uncategorized Items */}
                    {(() => {
                      const uncategorizedItems = products.filter((p) => !p.category_name);
                      const uncategorizedStock = uncategorizedItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                      const showCard = categoryListSearch === "" || "uncategorized generic".includes(categoryListSearch.toLowerCase());

                      if (!showCard && uncategorizedItems.length === 0) return null;

                      return (
                        <div
                          className="bg-white rounded-2xl border border-amber-200/80 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent rounded-bl-full pointer-events-none" />
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-amber-500/20 shrink-0">
                                  <Package size={20} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 font-display flex items-center gap-1.5">
                                    <span>Uncategorized Items</span>
                                  </h4>
                                  <span className="text-[11px] text-amber-700 font-medium mt-0.5 inline-block">
                                    Needs Category Assignment
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                {uncategorizedItems.length} SKUs
                              </span>
                            </div>

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                                <span className="font-extrabold text-slate-800 font-mono">{uncategorizedStock} units</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                                <span className="font-bold text-amber-600 inline-flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  <span>Unassigned</span>
                                </span>
                              </div>
                            </div>

                            {/* Product preview pills */}
                            <div className="mt-3.5 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recent Items:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {uncategorizedItems.slice(0, 3).map((p) => (
                                  <span key={p.id} className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                                    {p.product_name}
                                  </span>
                                ))}
                                {uncategorizedItems.length > 3 && (
                                  <span className="text-[11px] text-slate-400 self-center">
                                    +{uncategorizedItems.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Action footer */}
                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setSelectedCategory(null);
                                setCategoryViewMode("split");
                              }}
                              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Explore Uncategorized SKUs</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Category Cards */}
                    {(() => {
                      const filteredCategories = categories.filter((c) =>
                        c.name?.toLowerCase().includes(categoryListSearch.toLowerCase())
                      );

                      if (filteredCategories.length === 0 && categoryListSearch) {
                        return (
                          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80">
                            <Layers size={36} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700">No categories found matching "{categoryListSearch}"</div>
                            <p className="text-xs text-slate-400 mt-1">Try another search keyword or create a new category</p>
                          </div>
                        );
                      }

                      return filteredCategories.map((c, idx) => {
                        const catItems = products.filter((p) => p.category_name === c.name);
                        const catStock = catItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                        const catValue = catItems.reduce((s, p) => {
                          const price = Number(p.purchase_price || p.price || 0);
                          return s + Number(p.stock || 0) * price;
                        }, 0);
                        const subcatsCount = subcategories.filter((sc) => Number(sc.category_id) === Number(c.id)).length;
                        const lowStockInCat = catItems.filter((p) => Number(p.stock || 0) <= Number(p.min_stock_alert || 5)).length;

                        // Monogram / Initials
                        const monogram = (c.name || "C")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase();

                        const gradientList = [
                          "from-indigo-600 to-purple-600",
                          "from-blue-600 to-cyan-600",
                          "from-emerald-600 to-teal-600",
                          "from-rose-600 to-pink-600",
                          "from-amber-600 to-orange-600",
                          "from-purple-600 to-fuchsia-600",
                        ];
                        const gradient = gradientList[idx % gradientList.length];

                        return (
                          <div
                            key={c.id}
                            className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none" />
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} text-white font-black tracking-wider flex items-center justify-center text-sm shadow-md shadow-indigo-500/15 shrink-0`}>
                                    {monogram}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900 font-display truncate max-w-[150px]" title={c.name}>
                                      {c.name}
                                    </h4>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <span>ID: #{c.id}</span>
                                      {subcatsCount > 0 && <span>• {subcatsCount} subcategories</span>}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                                  {catItems.length} Products
                                </span>
                              </div>

                              {/* Metrics Strip */}
                              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                                  <span className="font-extrabold text-slate-800 font-mono">{catStock} units</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Inventory Value</span>
                                  <span className="font-extrabold text-emerald-600 font-mono">₹{fmt(catValue)}</span>
                                </div>
                              </div>

                              {/* Stock Health indicator */}
                              <div className="mt-3 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium">Stock Health:</span>
                                {lowStockInCat > 0 ? (
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    <span>{lowStockInCat} low stock warning</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <Check size={11} />
                                    <span>Healthy stock</span>
                                  </span>
                                )}
                              </div>

                              {/* Product preview pills */}
                              <div className="mt-3.5 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Classified Products:</span>
                                {catItems.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No products assigned yet</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {catItems.slice(0, 3).map((p) => (
                                      <span key={p.id} className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                                        {p.product_name}
                                      </span>
                                    ))}
                                    {catItems.length > 3 && (
                                      <span className="text-[11px] text-slate-400 self-center">
                                        +{catItems.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Action footer */}
                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setSelectedCategory(c);
                                  setShowMoveCategoryModal(true);
                                }}
                                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-xl border border-slate-200/80 transition flex items-center gap-1 cursor-pointer"
                                title="Move inventory items into this category"
                              >
                                <ArrowUpRight size={13} />
                                <span>Move Items</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedCategory(c);
                                  setCategoryViewMode("split");
                                }}
                                className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>View Inventory</span>
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* ── 3.B VIEW MODE: STUDIO MASTER-DETAIL VIEW ── */}
              {categoryViewMode === "split" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)]">
                  {/* Left Category Directory Panel */}
                  <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Layers size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Category Directory</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {categories.length} Total
                      </span>
                    </div>

                    {/* Category List Scrollable Body */}
                    <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
                      {(() => {
                        const uncategorizedCount = products.filter((p) => !p.category_name).length;
                        const catRows = categories
                          .filter((c) => c.name?.toLowerCase().includes(categoryListSearch.toLowerCase()))
                          .map((c) => ({
                            ...c,
                            count: products.filter((p) => p.category_name === c.name).length,
                            subcatCount: subcategories.filter((sc) => Number(sc.category_id) === Number(c.id)).length,
                          }));
                        const showUncategorized = categoryListSearch === "" || "uncategorized generic".includes(categoryListSearch.toLowerCase());

                        return (
                          <>
                            {showUncategorized && (
                              <div
                                onClick={() => setSelectedCategory(null)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                  selectedCategory === null
                                    ? "bg-amber-50/90 border border-amber-300 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400/20"
                                    : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedCategory === null ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                                    <Package size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs truncate font-bold">Uncategorized Items</div>
                                    <div className="text-[10px] text-amber-700 font-medium">Unassigned Classification</div>
                                  </div>
                                </div>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${selectedCategory === null ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-500"}`}>
                                  {uncategorizedCount}
                                </span>
                              </div>
                            )}

                            {catRows.map((c) => {
                              const isSelected = selectedCategory?.id === c.id;
                              const monogram = (c.name || "C").substring(0, 2).toUpperCase();

                              return (
                                <div
                                  key={c.id}
                                  onClick={() => setSelectedCategory(c)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-indigo-50/90 border border-indigo-300 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400/20"
                                      : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 border border-slate-200/70"
                                    }`}>
                                      {monogram}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs truncate font-bold">{c.name}</div>
                                      <div className="text-[10px] text-slate-400">
                                        {c.subcatCount > 0 ? `${c.subcatCount} subcategories` : `ID: #${c.id}`}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${isSelected ? "bg-indigo-200 text-indigo-900" : "bg-slate-100 text-slate-500"}`}>
                                    {c.count}
                                  </span>
                                </div>
                              );
                            })}

                            {catRows.length === 0 && !showUncategorized && (
                              <div className="p-8 text-center text-slate-400 text-xs">No categories found</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Category Command Center Panel */}
                  <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    {(() => {
                      const isUncategorized = selectedCategory === null;
                      const label = isUncategorized ? "Uncategorized Products" : selectedCategory?.name || "Select a Category";
                      const allCatItems = isUncategorized
                        ? products.filter((p) => !p.category_name)
                        : products.filter((p) => p.category_name === selectedCategory?.name);

                      // Sub-filtered items
                      const filteredItems = allCatItems.filter((p) => {
                        const matchesSearch = p.product_name?.toLowerCase().includes(categoryItemsSearch.toLowerCase()) ||
                          p.product_code?.toLowerCase().includes(categoryItemsSearch.toLowerCase()) ||
                          p.barcode?.toLowerCase().includes(categoryItemsSearch.toLowerCase());
                        if (!matchesSearch) return false;

                        const stock = Number(p.stock || 0);
                        if (categoryItemFilter === "in_stock") return stock > 5;
                        if (categoryItemFilter === "low_stock") return stock <= 5 && stock > 0;
                        if (categoryItemFilter === "out_of_stock") return stock <= 0;
                        return true;
                      });

                      const totalUnits = allCatItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                      const totalValuation = allCatItems.reduce((s, p) => {
                        const price = Number(p.purchase_price || p.price || 0);
                        return s + Number(p.stock || 0) * price;
                      }, 0);
                      const lowStockUnits = allCatItems.filter((p) => Number(p.stock || 0) <= 5 && Number(p.stock || 0) > 0).length;

                      return (
                        <>
                          {/* Category Hero Header */}
                          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0 ${
                                isUncategorized ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20" : "bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/20"
                              }`}>
                                {isUncategorized ? <Package size={22} /> : (label.substring(0, 2).toUpperCase())}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-slate-900 font-display">{label}</h3>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isUncategorized ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                  }`}>
                                    {allCatItems.length} SKUs
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                                  <span>Units: <b className="text-slate-800">{totalUnits}</b></span>
                                  <span>•</span>
                                  <span>Value: <b className="text-emerald-600">₹{fmt(totalValuation)}</b></span>
                                  {lowStockUnits > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-600 font-bold flex items-center gap-1">
                                        <AlertTriangle size={11} /> {lowStockUnits} low stock
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions on active category */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {!isUncategorized && selectedCategory && (
                                <button
                                  onClick={() => setShowMoveCategoryModal(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                                >
                                  <ArrowUpRight size={13} />
                                  <span>Move Items Here</span>
                                </button>
                              )}
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                <Plus size={13} strokeWidth={2.5} />
                                <span>Add Product</span>
                              </button>
                            </div>
                          </div>

                          {/* Filter Segment & Search Bar */}
                          <div className="p-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Filter segments */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl flex-wrap">
                              {[
                                { id: "all", label: "All Items", count: allCatItems.length },
                                { id: "in_stock", label: "In Stock", count: allCatItems.filter((p) => Number(p.stock || 0) > 5).length },
                                { id: "low_stock", label: "Low Stock", count: lowStockUnits },
                                { id: "out_of_stock", label: "Out of Stock", count: allCatItems.filter((p) => Number(p.stock || 0) <= 0).length },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => setCategoryItemFilter(f.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                    categoryItemFilter === f.id
                                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <span>{f.label}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    categoryItemFilter === f.id ? "bg-indigo-50 text-indigo-700 font-bold" : "bg-slate-200/70 text-slate-500"
                                  }`}>
                                    {f.count}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Search input & layout switch */}
                            <div className="flex items-center gap-2">
                              <div className="relative min-w-[200px]">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={categoryItemsSearch}
                                  onChange={(e) => setCategoryItemsSearch(e.target.value)}
                                  placeholder={`Filter ${allCatItems.length} items...`}
                                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {categoryItemsSearch && (
                                  <button onClick={() => setCategoryItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
                                <button
                                  onClick={() => setCategoryItemsLayout("grid")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${categoryItemsLayout === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Cards layout"
                                >
                                  <Grid size={13} />
                                </button>
                                <button
                                  onClick={() => setCategoryItemsLayout("table")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${categoryItemsLayout === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Table layout"
                                >
                                  <List size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Items Display Area */}
                          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredItems.length === 0 ? (
                              <div className="py-16 text-center">
                                <Layers size={36} className="text-slate-300 mx-auto mb-2" />
                                <div className="text-sm font-bold text-slate-700">No products found</div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {allCatItems.length === 0
                                    ? "This category currently has no inventory items assigned"
                                    : "No items match your active search / status filters"}
                                </p>
                              </div>
                            ) : categoryItemsLayout === "grid" ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredItems.map((p) => {
                                  const stockNum = Number(p.stock || 0);
                                  const minStock = Number(p.min_stock_alert || 5);
                                  const isLow = stockNum <= minStock && stockNum > 0;
                                  const isZero = stockNum <= 0;

                                  return (
                                    <div
                                      key={p.id}
                                      className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                            {p.product_image ? (
                                              <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Package size={18} className="text-slate-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                              {p.product_name}
                                            </h4>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                              <span className="font-mono font-semibold text-slate-500">{p.product_sku || p.barcode || "No SKU"}</span>
                                              {p.brand_name && <span>• {p.brand_name}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                          isZero ? "bg-rose-50 text-rose-700 border-rose-200" : isLow ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}>
                                          {isZero ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                                          <span className="font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Units</span>
                                          <span className={`font-bold font-mono ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                            {stockNum} {p.unit || "units"}
                                          </span>
                                        </div>

                                        {/* Quick Action Buttons */}
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          <button
                                            onClick={() => openProductDrawer(p)}
                                            title="View Product History"
                                            className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Eye size={13} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleSelectProduct(p);
                                              setShowEditModal(true);
                                            }}
                                            title="Edit Product"
                                            className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Compact Table View */
                              <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                                      <th className="p-3">Product Name</th>
                                      <th className="p-3">SKU / Code</th>
                                      <th className="p-3">Brand</th>
                                      <th className="p-3">Selling Price</th>
                                      <th className="p-3">Stock Level</th>
                                      <th className="p-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((p) => {
                                      const stockNum = Number(p.stock || 0);
                                      const minStock = Number(p.min_stock_alert || 5);
                                      const isLow = stockNum <= minStock && stockNum > 0;
                                      const isZero = stockNum <= 0;

                                      return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                          <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden">
                                              {p.product_image ? (
                                                <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <Package size={14} className="text-slate-400" />
                                              )}
                                            </div>
                                            <span className="truncate max-w-[180px]">{p.product_name}</span>
                                          </td>
                                          <td className="p-3 font-mono text-slate-600 font-semibold">{p.product_sku || p.barcode || "-"}</td>
                                          <td className="p-3 text-slate-500">{p.brand_name || "-"}</td>
                                          <td className="p-3 font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</td>
                                          <td className="p-3">
                                            <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded-full text-[11px] ${
                                              isZero ? "bg-rose-50 text-rose-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${isZero ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`} />
                                              {stockNum} {p.unit || ""}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => openProductDrawer(p)}
                                                title="View Product"
                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Eye size={13} />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleSelectProduct(p);
                                                  setShowEditModal(true);
                                                }}
                                                title="Edit Product"
                                                className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Pencil size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* ─── BRAND TAB (Modernized UI/UX) ─── */}
          {activeTab === "brand" && (
            <div className="space-y-4">
              {/* ── 1. BRAND METRIC KPI STRIP ── */}
              {(() => {
                const unbrandedProducts = products.filter((p) => !p.brand_name);
                const brandedProducts = products.filter((p) => Boolean(p.brand_name));
                const totalBrandedStock = brandedProducts.reduce((s, p) => s + Number(p.stock || 0), 0);
                const totalBrandedValuation = brandedProducts.reduce((s, p) => {
                  const price = Number(p.purchase_price || p.price || 0);
                  return s + Number(p.stock || 0) * price;
                }, 0);
                const brandedPercentage = products.length > 0
                  ? Math.round((brandedProducts.length / products.length) * 100)
                  : 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Total Brands */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Brands</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Tags size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                        {brands.length}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-indigo-600 font-bold">{brandedProducts.length} items</span>
                        <span>tagged under brands</span>
                      </div>
                    </div>

                    {/* Branded Catalog Coverage */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Catalog Coverage</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-600 tracking-tight my-1 font-display">
                        {brandedPercentage}%
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-emerald-700 font-bold">{totalBrandedStock} units</span>
                        <span>in branded stock</span>
                      </div>
                    </div>

                    {/* Unbranded Alert */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className={`absolute top-0 left-0 right-0 h-1 ${unbrandedProducts.length > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unbranded Items</span>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${unbrandedProducts.length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {unbrandedProducts.length > 0 ? <AlertTriangle size={16} /> : <Check size={16} />}
                        </div>
                      </div>
                      <div className={`text-2xl font-bold tracking-tight my-1 font-display ${unbrandedProducts.length > 0 ? "text-amber-600" : "text-slate-900"}`}>
                        {unbrandedProducts.length}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={unbrandedProducts.length > 0 ? "text-amber-700 font-semibold" : "text-slate-500"}>
                          {unbrandedProducts.length > 0 ? "Generic / unassigned" : "All products branded"}
                        </span>
                        {unbrandedProducts.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedBrand(null);
                              setBrandViewMode("split");
                            }}
                            className="text-indigo-600 hover:text-indigo-700 font-bold underline cursor-pointer"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Branded Valuation */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Branded Stock Value</span>
                        <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-cyan-700 tracking-tight my-1 font-display">
                        ₹{fmt(totalBrandedValuation)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Asset value of branded products
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 2. BRAND TOOLBAR & VIEW CONTROLS ── */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left search */}
                <div className="flex items-center gap-3 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search brands by name..."
                      value={brandListSearch}
                      onChange={(e) => setBrandListSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    {brandListSearch && (
                      <button onClick={() => setBrandListSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Right controls: View Toggle & Add Button */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                    <button
                      onClick={() => setBrandViewMode("split")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        brandViewMode === "split"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Studio Master-Detail Explorer"
                    >
                      <Layers size={13} />
                      <span>Studio View</span>
                    </button>
                    <button
                      onClick={() => setBrandViewMode("cards")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        brandViewMode === "cards"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Visual Brand Card Showcase"
                    >
                      <LayoutGrid size={13} />
                      <span>Card Showcase</span>
                    </button>
                  </div>

                  {/* Add New Brand Button */}
                  <button
                    onClick={() => setShowBrandModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-glow-brand transition transform active:scale-95 cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.6} />
                    <span>Add Brand</span>
                  </button>
                </div>
              </div>

              {/* ── 3.A VIEW MODE: VISUAL BRAND SHOWCASE GRID ── */}
              {brandViewMode === "cards" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Special Card: Unbranded / Generic Items */}
                    {(() => {
                      const unbrandedItems = products.filter((p) => !p.brand_name);
                      const unbrandedStock = unbrandedItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                      const showCard = brandListSearch === "" || "unbranded generic".includes(brandListSearch.toLowerCase());

                      if (!showCard && unbrandedItems.length === 0) return null;

                      return (
                        <div
                          className="bg-white rounded-2xl border border-amber-200/80 hover:border-amber-400 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/60 to-transparent rounded-bl-full pointer-events-none" />
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-amber-500/20 shrink-0">
                                  <Package size={20} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-sm text-slate-900 font-display flex items-center gap-1.5">
                                    <span>Unbranded Items</span>
                                  </h4>
                                  <span className="text-[11px] text-amber-700 font-medium mt-0.5 inline-block">
                                    Needs Brand Assignment
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                {unbrandedItems.length} SKUs
                              </span>
                            </div>

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                                <span className="font-extrabold text-slate-800 font-mono">{unbrandedStock} units</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                                <span className="font-bold text-amber-600 inline-flex items-center gap-1">
                                  <AlertTriangle size={11} />
                                  <span>Unassigned</span>
                                </span>
                              </div>
                            </div>

                            {/* Product preview pills */}
                            <div className="mt-3.5 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Recent Items:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {unbrandedItems.slice(0, 3).map((p) => (
                                  <span key={p.id} className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                                    {p.product_name}
                                  </span>
                                ))}
                                {unbrandedItems.length > 3 && (
                                  <span className="text-[11px] text-slate-400 self-center">
                                    +{unbrandedItems.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Action footer */}
                          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setSelectedBrand(null);
                                setBrandViewMode("split");
                              }}
                              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Explore Unbranded SKUs</span>
                              <ArrowRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Brand Cards */}
                    {(() => {
                      const filteredBrands = brands.filter((b) =>
                        b.name?.toLowerCase().includes(brandListSearch.toLowerCase())
                      );

                      if (filteredBrands.length === 0 && brandListSearch) {
                        return (
                          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80">
                            <Tags size={36} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700">No brands found matching "{brandListSearch}"</div>
                            <p className="text-xs text-slate-400 mt-1">Try another search keyword or create a new brand</p>
                          </div>
                        );
                      }

                      return filteredBrands.map((b, idx) => {
                        const brandItems = products.filter((p) => p.brand_name === b.name);
                        const brandStock = brandItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                        const brandValue = brandItems.reduce((s, p) => {
                          const price = Number(p.purchase_price || p.price || 0);
                          return s + Number(p.stock || 0) * price;
                        }, 0);
                        const lowStockInBrand = brandItems.filter((p) => Number(p.stock || 0) <= Number(p.min_stock_alert || 5)).length;

                        // Monogram / Initials
                        const monogram = (b.name || "B")
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase();

                        const gradientList = [
                          "from-indigo-600 to-violet-600",
                          "from-blue-600 to-cyan-600",
                          "from-emerald-600 to-teal-600",
                          "from-rose-600 to-pink-600",
                          "from-amber-600 to-orange-600",
                          "from-purple-600 to-fuchsia-600",
                        ];
                        const gradient = gradientList[idx % gradientList.length];

                        return (
                          <div
                            key={b.id}
                            className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none" />
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} text-white font-black tracking-wider flex items-center justify-center text-sm shadow-md shadow-indigo-500/15 shrink-0`}>
                                    {monogram}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900 font-display truncate max-w-[150px]" title={b.name}>
                                      {b.name}
                                    </h4>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <span>ID: #{b.id}</span>
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                                  {brandItems.length} Products
                                </span>
                              </div>

                              {/* Metrics Strip */}
                              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                                  <span className="font-extrabold text-slate-800 font-mono">{brandStock} units</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Inventory Value</span>
                                  <span className="font-extrabold text-emerald-600 font-mono">₹{fmt(brandValue)}</span>
                                </div>
                              </div>

                              {/* Stock Health indicator */}
                              <div className="mt-3 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium">Stock Health:</span>
                                {lowStockInBrand > 0 ? (
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    <span>{lowStockInBrand} low stock warning</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <Check size={11} />
                                    <span>Healthy stock</span>
                                  </span>
                                )}
                              </div>

                              {/* Product preview pills */}
                              <div className="mt-3.5 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Assigned Products:</span>
                                {brandItems.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No products assigned yet</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {brandItems.slice(0, 3).map((p) => (
                                      <span key={p.id} className="text-[11px] bg-slate-50 border border-slate-200/80 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[160px]">
                                        {p.product_name}
                                      </span>
                                    ))}
                                    {brandItems.length > 3 && (
                                      <span className="text-[11px] text-slate-400 self-center">
                                        +{brandItems.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Action footer */}
                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  setSelectedBrand(b);
                                  setShowMoveBrandModal(true);
                                }}
                                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-xl border border-slate-200/80 transition flex items-center gap-1 cursor-pointer"
                                title="Move inventory items into this brand"
                              >
                                <ArrowUpRight size={13} />
                                <span>Move Items</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedBrand(b);
                                  setBrandViewMode("split");
                                }}
                                className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>View Inventory</span>
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* ── 3.B VIEW MODE: STUDIO MASTER-DETAIL VIEW ── */}
              {brandViewMode === "split" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)]">
                  {/* Left Brand Directory Panel */}
                  <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Tags size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Brand Explorer</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {brands.length} Total
                      </span>
                    </div>

                    {/* Brand List Scrollable Body */}
                    <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
                      {(() => {
                        const unbrandedCount = products.filter((p) => !p.brand_name).length;
                        const brandRows = brands
                          .filter((b) => b.name?.toLowerCase().includes(brandListSearch.toLowerCase()))
                          .map((b) => ({
                            ...b,
                            count: products.filter((p) => p.brand_name === b.name).length,
                          }));
                        const showUnbranded = brandListSearch === "" || "unbranded generic".includes(brandListSearch.toLowerCase());

                        return (
                          <>
                            {showUnbranded && (
                              <div
                                onClick={() => setSelectedBrand(null)}
                                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                  selectedBrand === null
                                    ? "bg-amber-50/90 border border-amber-300 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400/20"
                                    : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedBrand === null ? "bg-amber-500 text-white shadow-xs" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                                    <Package size={14} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs truncate font-bold">Unbranded Products</div>
                                    <div className="text-[10px] text-amber-700 font-medium">Generic / Unassigned</div>
                                  </div>
                                </div>
                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${selectedBrand === null ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-500"}`}>
                                  {unbrandedCount}
                                </span>
                              </div>
                            )}

                            {brandRows.map((b, idx) => {
                              const isSelected = selectedBrand?.id === b.id;
                              const monogram = (b.name || "B").substring(0, 2).toUpperCase();

                              return (
                                <div
                                  key={b.id}
                                  onClick={() => setSelectedBrand(b)}
                                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                    isSelected
                                      ? "bg-indigo-50/90 border border-indigo-300 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400/20"
                                      : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs"
                                        : "bg-slate-100 text-slate-600 border border-slate-200/70"
                                    }`}>
                                      {monogram}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs truncate font-bold">{b.name}</div>
                                      <div className="text-[10px] text-slate-400">ID: #{b.id}</div>
                                    </div>
                                  </div>
                                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${isSelected ? "bg-indigo-200 text-indigo-900" : "bg-slate-100 text-slate-500"}`}>
                                    {b.count}
                                  </span>
                                </div>
                              );
                            })}

                            {brandRows.length === 0 && !showUnbranded && (
                              <div className="p-8 text-center text-slate-400 text-xs">No brands found</div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Brand Inventory Center Panel */}
                  <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    {(() => {
                      const isUnbranded = selectedBrand === null;
                      const label = isUnbranded ? "Unbranded Products" : selectedBrand?.name || "Select a Brand";
                      const allBrandItems = isUnbranded
                        ? products.filter((p) => !p.brand_name)
                        : products.filter((p) => p.brand_name === selectedBrand?.name);

                      // Sub-filtered items
                      const filteredItems = allBrandItems.filter((p) => {
                        const matchesSearch = p.product_name?.toLowerCase().includes(brandItemsSearch.toLowerCase()) ||
                          p.product_code?.toLowerCase().includes(brandItemsSearch.toLowerCase()) ||
                          p.barcode?.toLowerCase().includes(brandItemsSearch.toLowerCase());
                        if (!matchesSearch) return false;

                        const stock = Number(p.stock || 0);
                        if (brandItemFilter === "in_stock") return stock > 5;
                        if (brandItemFilter === "low_stock") return stock <= 5 && stock > 0;
                        if (brandItemFilter === "out_of_stock") return stock <= 0;
                        return true;
                      });

                      const totalUnits = allBrandItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                      const totalValuation = allBrandItems.reduce((s, p) => {
                        const price = Number(p.purchase_price || p.price || 0);
                        return s + Number(p.stock || 0) * price;
                      }, 0);
                      const lowStockUnits = allBrandItems.filter((p) => Number(p.stock || 0) <= 5 && Number(p.stock || 0) > 0).length;

                      return (
                        <>
                          {/* Brand Hero Header */}
                          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/90 via-indigo-50/30 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm shrink-0 ${
                                isUnbranded ? "bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20" : "bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-500/20"
                              }`}>
                                {isUnbranded ? <Package size={22} /> : (label.substring(0, 2).toUpperCase())}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-slate-900 font-display">{label}</h3>
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isUnbranded ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                  }`}>
                                    {allBrandItems.length} SKUs
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap font-mono">
                                  <span>Units: <b className="text-slate-800">{totalUnits}</b></span>
                                  <span>•</span>
                                  <span>Value: <b className="text-emerald-600">₹{fmt(totalValuation)}</b></span>
                                  {lowStockUnits > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="text-amber-600 font-bold flex items-center gap-1">
                                        <AlertTriangle size={11} /> {lowStockUnits} low stock
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions on active brand */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              {!isUnbranded && selectedBrand && (
                                <button
                                  onClick={() => setShowMoveBrandModal(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                                >
                                  <ArrowUpRight size={13} />
                                  <span>Move Items Here</span>
                                </button>
                              )}
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                <Plus size={13} strokeWidth={2.5} />
                                <span>Add Product</span>
                              </button>
                            </div>
                          </div>

                          {/* Filter Segment & Search Bar */}
                          <div className="p-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Filter segments */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl flex-wrap">
                              {[
                                { id: "all", label: "All Items", count: allBrandItems.length },
                                { id: "in_stock", label: "In Stock", count: allBrandItems.filter((p) => Number(p.stock || 0) > 5).length },
                                { id: "low_stock", label: "Low Stock", count: lowStockUnits },
                                { id: "out_of_stock", label: "Out of Stock", count: allBrandItems.filter((p) => Number(p.stock || 0) <= 0).length },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => setBrandItemFilter(f.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                    brandItemFilter === f.id
                                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <span>{f.label}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    brandItemFilter === f.id ? "bg-indigo-50 text-indigo-700 font-bold" : "bg-slate-200/70 text-slate-500"
                                  }`}>
                                    {f.count}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Search input & layout switch */}
                            <div className="flex items-center gap-2">
                              <div className="relative min-w-[200px]">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={brandItemsSearch}
                                  onChange={(e) => setBrandItemsSearch(e.target.value)}
                                  placeholder={`Filter ${allBrandItems.length} items...`}
                                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {brandItemsSearch && (
                                  <button onClick={() => setBrandItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
                                <button
                                  onClick={() => setBrandItemsLayout("grid")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${brandItemsLayout === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Cards layout"
                                >
                                  <Grid size={13} />
                                </button>
                                <button
                                  onClick={() => setBrandItemsLayout("table")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${brandItemsLayout === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Table layout"
                                >
                                  <List size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Items Display Area */}
                          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredItems.length === 0 ? (
                              <div className="py-16 text-center">
                                <Tags size={36} className="text-slate-300 mx-auto mb-2" />
                                <div className="text-sm font-bold text-slate-700">No products found</div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {allBrandItems.length === 0
                                    ? "This brand currently has no inventory items assigned"
                                    : "No items match your active search / status filters"}
                                </p>
                              </div>
                            ) : brandItemsLayout === "grid" ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredItems.map((p) => {
                                  const stockNum = Number(p.stock || 0);
                                  const minStock = Number(p.min_stock_alert || 5);
                                  const isLow = stockNum <= minStock && stockNum > 0;
                                  const isZero = stockNum <= 0;

                                  return (
                                    <div
                                      key={p.id}
                                      className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                            {p.product_image ? (
                                              <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Package size={18} className="text-slate-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                              {p.product_name}
                                            </h4>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                              <span className="font-mono font-semibold text-slate-500">{p.product_sku || p.barcode || "No SKU"}</span>
                                              {p.category_name && <span>• {p.category_name}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                          isZero ? "bg-rose-50 text-rose-700 border-rose-200" : isLow ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}>
                                          {isZero ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                                          <span className="font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Units</span>
                                          <span className={`font-bold font-mono ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                            {stockNum} {p.unit || "units"}
                                          </span>
                                        </div>

                                        {/* Quick Action Buttons */}
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          <button
                                            onClick={() => openProductDrawer(p)}
                                            title="View Product History"
                                            className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Eye size={13} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleSelectProduct(p);
                                              setShowEditModal(true);
                                            }}
                                            title="Edit Product"
                                            className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Compact Table View */
                              <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                                      <th className="p-3">Product Name</th>
                                      <th className="p-3">SKU / Code</th>
                                      <th className="p-3">Category</th>
                                      <th className="p-3">Selling Price</th>
                                      <th className="p-3">Stock Level</th>
                                      <th className="p-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((p) => {
                                      const stockNum = Number(p.stock || 0);
                                      const minStock = Number(p.min_stock_alert || 5);
                                      const isLow = stockNum <= minStock && stockNum > 0;
                                      const isZero = stockNum <= 0;

                                      return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                          <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden">
                                              {p.product_image ? (
                                                <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <Package size={14} className="text-slate-400" />
                                              )}
                                            </div>
                                            <span className="truncate max-w-[180px]">{p.product_name}</span>
                                          </td>
                                          <td className="p-3 font-mono text-slate-600 font-semibold">{p.product_sku || p.barcode || "-"}</td>
                                          <td className="p-3 text-slate-500">{p.category_name || "-"}</td>
                                          <td className="p-3 font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</td>
                                          <td className="p-3">
                                            <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded-full text-[11px] ${
                                              isZero ? "bg-rose-50 text-rose-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${isZero ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`} />
                                              {stockNum} {p.unit || ""}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => openProductDrawer(p)}
                                                title="View Product"
                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Eye size={13} />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleSelectProduct(p);
                                                  setShowEditModal(true);
                                                }}
                                                title="Edit Product"
                                                className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Pencil size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── UNIT TAB (Modernized UI/UX) ─── */}
          {activeTab === "unit" && (
            <div className="space-y-4">
              {/* ── 1. UNIT METRIC KPI STRIP ── */}
              {(() => {
                const totalUnitsCount = units.length;
                const productsWithUnit = products.filter((p) => Boolean(p.unit));
                const unitCoveragePercent = products.length > 0
                  ? Math.round((productsWithUnit.length / products.length) * 100)
                  : 0;
                
                // Calculate total conversion rules count across predefined map + dynamic conversions
                const totalConversionsCount = Object.values(unitConversionMap).reduce((acc, curr) => acc + curr.length, 0) + conversions.length;
                
                const totalUnitStock = productsWithUnit.reduce((s, p) => s + Number(p.stock || 0), 0);
                const totalUnitValuation = productsWithUnit.reduce((s, p) => {
                  const price = Number(p.purchase_price || p.price || 0);
                  return s + Number(p.stock || 0) * price;
                }, 0);

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Registered Units */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Units</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Ruler size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                        {totalUnitsCount}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-indigo-600 font-bold">{productsWithUnit.length} products</span>
                        <span>measured with units</span>
                      </div>
                    </div>

                    {/* Unit Measurement Coverage */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Coverage</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Sparkles size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                        {unitCoveragePercent}%
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${unitCoveragePercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Conversions Matrix */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conversion Matrix</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <RefreshCw size={15} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display">
                        {totalConversionsCount}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <span className="text-blue-600 font-bold">{conversions.length} active</span>
                        <span>in selected unit</span>
                      </div>
                    </div>

                    {/* Total Unit Stock Valuation */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stock Valuation</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <TrendingUp size={16} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight my-1 font-display font-mono">
                        ₹{fmt(totalUnitValuation)}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="text-purple-600 font-bold">{totalUnitStock} units</span>
                        <span>total measured quantity</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ── 2. TOOLBAR & VIEW CONTROLS ── */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search unit name or symbol (e.g. Kg, Litre, Pcs)..."
                    value={unitListSearch}
                    onChange={(e) => setUnitListSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  {unitListSearch && (
                    <button
                      onClick={() => setUnitListSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  {/* View mode switcher */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                    <button
                      onClick={() => setUnitViewMode("split")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        unitViewMode === "split"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutList size={14} />
                      <span className="hidden sm:inline">Studio View</span>
                    </button>
                    <button
                      onClick={() => setUnitViewMode("cards")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        unitViewMode === "cards"
                          ? "bg-white text-indigo-600 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutGrid size={14} />
                      <span className="hidden sm:inline">Showcase</span>
                    </button>
                  </div>

                  {/* Add Unit Button */}
                  <button
                    onClick={() => {
                      setUnitFullForm("");
                      setUnitShortForm("");
                      setShowUnitModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-200 transition-all hover:scale-[1.01] cursor-pointer"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add New Unit</span>
                  </button>
                </div>
              </div>

              {/* ── 3.A VIEW MODE: CARD SHOWCASE GRID ── */}
              {unitViewMode === "cards" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(() => {
                      const filteredUnits = units.filter(
                        (u) =>
                          u.full.toLowerCase().includes(unitListSearch.toLowerCase()) ||
                          u.short.toLowerCase().includes(unitListSearch.toLowerCase())
                      );

                      if (filteredUnits.length === 0) {
                        return (
                          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200/80">
                            <Ruler size={36} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700">No units matched your query</div>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
                          </div>
                        );
                      }

                      return filteredUnits.map((u, idx) => {
                        const unitKey = u.full.replace(/\s+/g, "_");
                        const unitConvs = unitConversionMap[unitKey] || unitConversionMap[u.full] || [];
                        const unitItems = products.filter(
                          (p) =>
                            (p.unit || "").trim().toUpperCase() === u.short.trim().toUpperCase() ||
                            (p.unit || "").trim().toUpperCase() === u.full.trim().toUpperCase()
                        );
                        const unitStock = unitItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                        const unitValue = unitItems.reduce((s, p) => {
                          const price = Number(p.purchase_price || p.price || 0);
                          return s + Number(p.stock || 0) * price;
                        }, 0);
                        const lowStockInUnit = unitItems.filter(
                          (p) => Number(p.stock || 0) <= Number(p.min_stock_alert || 5) && Number(p.stock || 0) > 0
                        ).length;

                        const monogram = u.short.substring(0, 4).toUpperCase();
                        const gradientList = [
                          "from-indigo-600 to-purple-600",
                          "from-blue-600 to-cyan-600",
                          "from-emerald-600 to-teal-600",
                          "from-rose-600 to-pink-600",
                          "from-amber-600 to-orange-600",
                          "from-purple-600 to-fuchsia-600",
                        ];
                        const gradient = gradientList[idx % gradientList.length];

                        return (
                          <div
                            key={u.full}
                            className="bg-white rounded-2xl border border-slate-200/80 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-50/50 to-transparent rounded-bl-full pointer-events-none" />
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} text-white font-black tracking-wider flex items-center justify-center text-xs shadow-md shadow-indigo-500/15 shrink-0`}>
                                    {monogram}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-sm text-slate-900 font-display truncate max-w-[140px]" title={u.full}>
                                      {u.full}
                                    </h4>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                                        {u.short}
                                      </span>
                                      {unitConvs.length > 0 && <span>• {unitConvs.length} conversions</span>}
                                    </span>
                                  </div>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 shrink-0">
                                  {unitItems.length} Products
                                </span>
                              </div>

                              {/* Metrics Strip */}
                              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Stock</span>
                                  <span className="font-extrabold text-slate-800 font-mono">{unitStock} {u.short}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Stock Value</span>
                                  <span className="font-extrabold text-emerald-600 font-mono">₹{fmt(unitValue)}</span>
                                </div>
                              </div>

                              {/* Stock Health indicator */}
                              <div className="mt-3 flex items-center justify-between text-[11px]">
                                <span className="text-slate-400 font-medium">Stock Status:</span>
                                {lowStockInUnit > 0 ? (
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    <span>{lowStockInUnit} low stock</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <Check size={11} />
                                    <span>Healthy stock</span>
                                  </span>
                                )}
                              </div>

                              {/* Conversion Preview Formula */}
                              <div className="mt-3.5 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Conversion Equation:</span>
                                {unitConvs.length === 0 ? (
                                  <p className="text-[11px] text-slate-400 italic">No conversion rule defined</p>
                                ) : (
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-xs font-medium text-slate-700 flex items-center justify-between">
                                    <span className="font-bold text-slate-900">1 {u.short}</span>
                                    <span className="text-indigo-600 font-bold">= {unitConvs[0].value} {unitConvs[0].toUnit}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Action footer */}
                            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                onClick={() => {
                                  handleSelectUnit(u);
                                  setShowConversionModal(true);
                                }}
                                className="py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-xl border border-slate-200/80 transition flex items-center gap-1 cursor-pointer"
                                title="Add conversion rate for this unit"
                              >
                                <Plus size={13} />
                                <span>Add Conv</span>
                              </button>

                              <button
                                onClick={() => {
                                  handleSelectUnit(u);
                                  setUnitViewMode("split");
                                }}
                                className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Unit Studio</span>
                                <ArrowRight size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* ── 3.B VIEW MODE: STUDIO MASTER-DETAIL VIEW ── */}
              {unitViewMode === "split" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)]">
                  {/* Left Unit Directory Panel */}
                  <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                          <Ruler size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Unit Directory</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {units.length} Total
                      </span>
                    </div>

                    {/* Unit List Scrollable Body */}
                    <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
                      {(() => {
                        const unitRows = units
                          .filter(
                            (u) =>
                              u.full.toLowerCase().includes(unitListSearch.toLowerCase()) ||
                              u.short.toLowerCase().includes(unitListSearch.toLowerCase())
                          )
                          .map((u) => ({
                            ...u,
                            count: products.filter(
                              (p) =>
                                (p.unit || "").trim().toUpperCase() === u.short.trim().toUpperCase() ||
                                (p.unit || "").trim().toUpperCase() === u.full.trim().toUpperCase()
                            ).length,
                          }));

                        if (unitRows.length === 0) {
                          return <div className="p-8 text-center text-slate-400 text-xs">No units found</div>;
                        }

                        return unitRows.map((u) => {
                          const isSelected = selectedUnit?.full === u.full;
                          const monogram = u.short.substring(0, 3).toUpperCase();

                          return (
                            <div
                              key={u.full}
                              onClick={() => handleSelectUnit(u)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-indigo-50/90 border border-indigo-300 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-400/20"
                                  : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl font-bold text-[11px] flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-xs"
                                      : "bg-slate-100 text-slate-600 border border-slate-200/70"
                                  }`}
                                >
                                  {monogram}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs truncate font-bold">{u.full}</div>
                                  <div className="text-[10px] text-slate-400">Symbol: <span className="font-mono font-bold text-indigo-600">{u.short}</span></div>
                                </div>
                              </div>
                              <span
                                className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                                  isSelected ? "bg-indigo-200 text-indigo-900" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {u.count} items
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Right Unit Studio Panel */}
                  <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                    {(() => {
                      if (!selectedUnit) {
                        return (
                          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-xs">
                              <Ruler size={30} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Select a Measurement Unit</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                              Choose a measurement unit from the directory panel to configure specifications, conversion rates, and browse inventory items.
                            </p>
                          </div>
                        );
                      }

                      const activeUnit = selectedUnit;
                      const allUnitItems = products.filter(
                        (p) =>
                          (p.unit || "").trim().toUpperCase() === activeUnit.short.trim().toUpperCase() ||
                          (p.unit || "").trim().toUpperCase() === activeUnit.full.trim().toUpperCase()
                      );

                      const filteredItems = allUnitItems.filter((p) => {
                        const stockNum = Number(p.stock || 0);
                        const minStock = Number(p.min_stock_alert || 5);
                        if (unitItemFilter === "in_stock") return stockNum > minStock;
                        if (unitItemFilter === "low_stock") return stockNum <= minStock && stockNum > 0;
                        if (unitItemFilter === "out_of_stock") return stockNum <= 0;
                        return true;
                      }).filter((p) => {
                        if (!unitItemsSearch) return true;
                        const q = unitItemsSearch.toLowerCase();
                        return (
                          p.product_name?.toLowerCase().includes(q) ||
                          p.product_sku?.toLowerCase().includes(q) ||
                          p.barcode?.toLowerCase().includes(q)
                        );
                      });

                      const totalStockUnits = allUnitItems.reduce((s, p) => s + Number(p.stock || 0), 0);
                      const totalStockValuation = allUnitItems.reduce((s, p) => {
                        const price = Number(p.purchase_price || p.price || 0);
                        return s + Number(p.stock || 0) * price;
                      }, 0);
                      const lowStockUnits = allUnitItems.filter(
                        (p) => Number(p.stock || 0) <= Number(p.min_stock_alert || 5) && Number(p.stock || 0) > 0
                      ).length;

                      return (
                        <>
                          {/* Unit Studio Header */}
                          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shadow-md shadow-indigo-500/20 shrink-0">
                                {activeUnit.short.substring(0, 3).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base font-bold text-slate-900 font-display">
                                    {activeUnit.full}
                                  </h3>
                                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200/80">
                                    Symbol: {activeUnit.short}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span>{allUnitItems.length} Products Measured</span>
                                  <span>•</span>
                                  <span>{totalStockUnits} Available Stock ({activeUnit.short})</span>
                                  <span>•</span>
                                  <span className="font-semibold text-emerald-600">₹{fmt(totalStockValuation)} Value</span>
                                </div>
                              </div>
                            </div>

                            {/* Actions on active unit */}
                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <button
                                onClick={() => {
                                  setUnitFullForm(activeUnit.full);
                                  setUnitShortForm(activeUnit.short);
                                  setShowUnitModal(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                <Pencil size={12} />
                                <span>Edit Unit</span>
                              </button>
                              <button
                                onClick={() => setShowConversionModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                <Plus size={13} />
                                <span>Add Conversion</span>
                              </button>
                              <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                              >
                                <Plus size={13} strokeWidth={2.5} />
                                <span>Add Product</span>
                              </button>
                            </div>
                          </div>

                          {/* Unit Specifications & Conversions Mini Strip */}
                          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <RefreshCw size={13} className="text-indigo-600" />
                                <span>Configured Conversion Equations</span>
                              </span>
                              <span className="text-xs text-slate-400 font-medium">
                                {conversions.length} active formula{conversions.length === 1 ? "" : "s"}
                              </span>
                            </div>

                            {conversions.length === 0 ? (
                              <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-between text-xs text-slate-500">
                                <span>No dynamic conversions defined for {activeUnit.full}.</span>
                                <button
                                  onClick={() => setShowConversionModal(true)}
                                  className="text-indigo-600 font-bold hover:underline"
                                >
                                  + Define Conversion Rate
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {conversions.map((conv, index) => (
                                  <div
                                    key={index}
                                    className="p-2.5 bg-slate-50/90 border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all group"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold text-[10px] shrink-0">
                                        1×
                                      </div>
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-900 truncate">
                                          1 {conv.fromUnit || activeUnit.full} = {conv.value} {conv.toUnit}
                                        </div>
                                        {conv.isBase && (
                                          <span className="text-[10px] font-bold text-emerald-600">Base Unit Reference</span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => {
                                        setConversions((prev) => prev.filter((_, i) => i !== index));
                                        showToast("Conversion removed");
                                      }}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                      title="Remove conversion"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Filter Segment & Search Bar */}
                          <div className="p-3 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            {/* Filter segments */}
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl flex-wrap">
                              {[
                                { id: "all", label: "All Items", count: allUnitItems.length },
                                { id: "in_stock", label: "In Stock", count: allUnitItems.filter((p) => Number(p.stock || 0) > 5).length },
                                { id: "low_stock", label: "Low Stock", count: lowStockUnits },
                                { id: "out_of_stock", label: "Out of Stock", count: allUnitItems.filter((p) => Number(p.stock || 0) <= 0).length },
                              ].map((f) => (
                                <button
                                  key={f.id}
                                  onClick={() => setUnitItemFilter(f.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                    unitItemFilter === f.id
                                      ? "bg-white text-indigo-700 font-bold shadow-xs"
                                      : "text-slate-600 hover:text-slate-900"
                                  }`}
                                >
                                  <span>{f.label}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                    unitItemFilter === f.id ? "bg-indigo-50 text-indigo-700 font-bold" : "bg-slate-200/70 text-slate-500"
                                  }`}>
                                    {f.count}
                                  </span>
                                </button>
                              ))}
                            </div>

                            {/* Search input & layout switch */}
                            <div className="flex items-center gap-2">
                              <div className="relative min-w-[200px]">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={unitItemsSearch}
                                  onChange={(e) => setUnitItemsSearch(e.target.value)}
                                  placeholder={`Filter ${allUnitItems.length} items...`}
                                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                                {unitItemsSearch && (
                                  <button onClick={() => setUnitItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={12} />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
                                <button
                                  onClick={() => setUnitItemsLayout("grid")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${unitItemsLayout === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Cards layout"
                                >
                                  <Grid size={13} />
                                </button>
                                <button
                                  onClick={() => setUnitItemsLayout("table")}
                                  className={`p-1.5 rounded-md transition cursor-pointer ${unitItemsLayout === "table" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
                                  title="Table layout"
                                >
                                  <List size={13} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Items Display Area */}
                          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {filteredItems.length === 0 ? (
                              <div className="py-16 text-center">
                                <Ruler size={36} className="text-slate-300 mx-auto mb-2" />
                                <div className="text-sm font-bold text-slate-700">No products found</div>
                                <p className="text-xs text-slate-400 mt-1">
                                  {allUnitItems.length === 0
                                    ? "This unit currently has no inventory items measured with it"
                                    : "No items match your active search / status filters"}
                                </p>
                              </div>
                            ) : unitItemsLayout === "grid" ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredItems.map((p) => {
                                  const stockNum = Number(p.stock || 0);
                                  const minStock = Number(p.min_stock_alert || 5);
                                  const isLow = stockNum <= minStock && stockNum > 0;
                                  const isZero = stockNum <= 0;

                                  return (
                                    <div
                                      key={p.id}
                                      className="p-3.5 bg-white rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3 group"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                            {p.product_image ? (
                                              <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Package size={18} className="text-slate-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                              {p.product_name}
                                            </h4>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                              <span className="font-mono font-semibold text-slate-500">{p.product_sku || p.barcode || "No SKU"}</span>
                                              {p.category_name && <span>• {p.category_name}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                                          isZero ? "bg-rose-50 text-rose-700 border-rose-200" : isLow ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        }`}>
                                          {isZero ? "Out of Stock" : isLow ? "Low Stock" : "In Stock"}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                        <div>
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Selling Price</span>
                                          <span className="font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</span>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Available Units</span>
                                          <span className={`font-bold font-mono ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                            {stockNum} {p.unit || activeUnit.short}
                                          </span>
                                        </div>

                                        {/* Quick Action Buttons */}
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                          <button
                                            onClick={() => openProductDrawer(p)}
                                            title="View Product History"
                                            className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Eye size={13} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              handleSelectProduct(p);
                                              setShowEditModal(true);
                                            }}
                                            title="Edit Product"
                                            className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                          >
                                            <Pencil size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Compact Table View */
                              <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                                      <th className="p-3">Product Name</th>
                                      <th className="p-3">SKU / Code</th>
                                      <th className="p-3">Category</th>
                                      <th className="p-3">Selling Price</th>
                                      <th className="p-3">Stock Level</th>
                                      <th className="p-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((p) => {
                                      const stockNum = Number(p.stock || 0);
                                      const minStock = Number(p.min_stock_alert || 5);
                                      const isLow = stockNum <= minStock && stockNum > 0;
                                      const isZero = stockNum <= 0;

                                      return (
                                        <tr key={p.id} className="hover:bg-slate-50/80 transition">
                                          <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 overflow-hidden">
                                              {p.product_image ? (
                                                <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <Package size={14} className="text-slate-400" />
                                              )}
                                            </div>
                                            <span className="truncate max-w-[180px]">{p.product_name}</span>
                                          </td>
                                          <td className="p-3 font-mono text-slate-600 font-semibold">{p.product_sku || p.barcode || "-"}</td>
                                          <td className="p-3 text-slate-500">{p.category_name || "-"}</td>
                                          <td className="p-3 font-bold text-slate-900 font-mono">{money(p.selling_price || p.price || 0)}</td>
                                          <td className="p-3">
                                            <span className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded-full text-[11px] ${
                                              isZero ? "bg-rose-50 text-rose-700" : isLow ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${isZero ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"}`} />
                                              {stockNum} {p.unit || activeUnit.short}
                                            </span>
                                          </td>
                                          <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => openProductDrawer(p)}
                                                title="View Product"
                                                className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Eye size={13} />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleSelectProduct(p);
                                                  setShowEditModal(true);
                                                }}
                                                title="Edit Product"
                                                className="w-7 h-7 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                                              >
                                                <Pencil size={12} />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── ADD CATEGORY MODAL (Modernized Tailwind Structure) ─── */}
      {showCatModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCatModal(false); }}
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Add Category</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Organize and group catalog inventory</p>
                </div>
              </div>
              <button
                onClick={() => setShowCatModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Layers size={15} />
                  </div>
                  <input
                    type="text"
                    value={catForm}
                    onChange={(e) => setCatForm(e.target.value)}
                    placeholder="e.g. Beverages, Electronics, Groceries"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">This category will be available for tagging products immediately.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={savingSub}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSub ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Save Category</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD BRAND MODAL (Modernized Tailwind Structure) ─── */}
      {showBrandModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowBrandModal(false); }}
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Tags size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Add Brand</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Register a brand or manufacturer</p>
                </div>
              </div>
              <button
                onClick={() => setShowBrandModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Brand Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Tag size={15} />
                  </div>
                  <input
                    type="text"
                    value={brandForm}
                    onChange={(e) => setBrandForm(e.target.value)}
                    placeholder="e.g. Apple, Nestlé, Amul, Samsung"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">Brand will be visible in filter chips and inventory tags.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBrandModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddBrand}
                disabled={savingSub}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSub ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Save Brand</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD UNIT MODAL (Modernized Tailwind Structure) ─── */}
      {showUnitModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnitModal(false); }}
          className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <Ruler size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Add Measurement Unit</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configure unit definition and symbol</p>
                </div>
              </div>
              <button
                onClick={() => setShowUnitModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Ruler size={15} />
                  </div>
                  <input
                    type="text"
                    value={unitFullForm}
                    onChange={(e) => setUnitFullForm(e.target.value)}
                    placeholder="e.g. KILOGRAMS, LITRES, PIECES"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold uppercase tracking-wide text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleAddUnit()}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Short Code / Symbol <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono font-bold text-xs">
                    #
                  </div>
                  <input
                    type="text"
                    value={unitShortForm}
                    onChange={(e) => setUnitShortForm(e.target.value)}
                    placeholder="e.g. Kg, Ltr, Pcs, Box"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleAddUnit()}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">This symbol will appear beside product stock quantities on invoices.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddUnit}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer"
              >
                <Plus size={14} strokeWidth={2.5} />
                <span>Save Unit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD CONVERSION MODAL (Modernized Tailwind Structure) ─── */}
      {showConversionModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowConversionModal(false); }}
          className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Add Unit Conversion</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Define multi-pack and bulk conversion ratio</p>
                </div>
              </div>
              <button
                onClick={() => setShowConversionModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* From Unit Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Source Unit
                </label>
                <div className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold text-xs flex items-center justify-between">
                  <span>1 {selectedUnit?.full || "UNIT"}</span>
                  <span className="text-[11px] font-semibold text-indigo-600 font-mono">({selectedUnit?.short || ""})</span>
                </div>
              </div>

              {/* Conversion Equation Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Conversion Value <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={conversionValue}
                    onChange={(e) => setConversionValue(e.target.value)}
                    placeholder="e.g. 1000 or 12"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    onKeyDown={(e) => e.key === "Enter" && handleAddConversion()}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Unit <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={conversionToUnit}
                      onChange={(e) => setConversionToUnit(e.target.value)}
                      className="w-full px-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 appearance-none cursor-pointer"
                    >
                      <option value="">Select target unit</option>
                      {units
                        .filter((u) => u.full !== selectedUnit?.full)
                        .map((u) => (
                          <option key={u.full} value={u.full}>
                            {u.full} ({u.short})
                          </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Equation Preview Box */}
              {conversionValue && conversionToUnit && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                  <span className="font-medium text-slate-600">Calculated Ratio:</span>
                  <span className="font-bold">
                    1 {selectedUnit?.full} = {conversionValue} {conversionToUnit}
                  </span>
                </div>
              )}

              {/* Base Unit Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={conversionIsBase}
                    onChange={(e) => setConversionIsBase(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-700">Set as base fundamental reference unit</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowConversionModal(false);
                  setConversionValue("");
                  setConversionToUnit("");
                  setConversionIsBase(false);
                  setConversionRate("");
                }}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddConversion}
                disabled={savingConversion}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:from-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingConversion ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Save Conversion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveSubcategoryModal && selectedSubcategory && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoveSubcategoryModal(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(10,22,40,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div style={{ background: COLORS.surface, borderRadius: RADIUS.lg, width: "100%", maxWidth: 560, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: SHADOW.modal }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Move Items to {selectedSubcategory.name}</h3>
              <button onClick={() => setShowMoveSubcategoryModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: COLORS.textMuted, padding: 4 }}><X size={20} /></button>
            </div>
            <div style={{ padding: "16px 24px 0" }}>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", top: "50%", left: 12, transform: "translateY(-50%)", color: COLORS.textMuted }} />
                <input className="focus-ring" value={moveSubcategorySearch} onChange={(e) => setMoveSubcategorySearch(e.target.value)} placeholder="Search items..." style={{ width: "100%", padding: "9px 12px 9px 36px", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.border}`, outline: "none", fontSize: 13 }} />
              </div>
            </div>
            <div style={{ padding: "12px 24px", flex: 1, overflowY: "auto" }}>
              {moveSubcategoryOptions.map((p) => {
                const checked = moveSubcategorySelected.includes(p.id);
                return (
                  <div key={p.id} className="hover-bg" onClick={() => setMoveSubcategorySelected(prev => checked ? prev.filter(id => id !== p.id) : [...prev, p.id])} style={{ padding: "10px 12px", borderRadius: RADIUS.sm, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", borderBottom: `1px solid ${COLORS.border}` }}>
                    <input type="checkbox" checked={checked} onChange={() => {}} />
                    <span style={{ flex: 1, fontSize: 13.5, color: COLORS.text }}>{p.product_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>{Number(p.stock || 0)}</span>
                  </div>
                );
              })}
              {moveSubcategoryOptions.length === 0 && <div style={{ padding: 30, textAlign: "center", color: COLORS.textMuted }}>No items found</div>}
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setShowMoveSubcategoryModal(false)} style={{ padding: "8px 16px", borderRadius: RADIUS.sm, border: `1.5px solid ${COLORS.border}`, background: "transparent", fontWeight: 600, fontSize: 12, cursor: "pointer", color: COLORS.textSoft }}>Cancel</button>
              <button onClick={handleMoveToSubcategory} disabled={moveSubcategorySelected.length === 0} style={{ padding: "8px 20px", borderRadius: RADIUS.sm, border: "none", background: moveSubcategorySelected.length === 0 ? COLORS.textMuted : COLORS.primary, color: "#fff", fontWeight: 700, fontSize: 12, cursor: moveSubcategorySelected.length === 0 ? "not-allowed" : "pointer" }}>Move ({moveSubcategorySelected.length})</button>
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