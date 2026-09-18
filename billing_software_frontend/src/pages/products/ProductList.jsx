import { useEffect, useState, useMemo } from "react";
import api from "../../services/api";
import { Edit } from "lucide-react";
import {
  Search, Plus, ChevronDown, SlidersHorizontal,
  MoreVertical, FileSpreadsheet, ArrowUpRight, Filter, X,
  Package, MousePointerClick, Boxes, Tags, Ruler, Inbox,
  ShoppingBag, Layers, ListTree, Grid, List, BarChart3,
  ChevronRight, ChevronLeft, Star, Zap, Eye, Building2,
  CheckCircle2, AlertTriangle, ShieldAlert, RefreshCw, Pencil
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
    { key: "subcategory", label: "Sub Categories", icon: ListTree },
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

          {/* ─── CATEGORY TAB (PaySplitX Style) ─── */}
          {activeTab === "category" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)]">
              {/* Left Directory Panel */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
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

                {/* Search & Action Header */}
                <div className="p-3 border-b border-slate-100 space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search categories..."
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
                  <button
                    onClick={() => setShowCatModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all hover:scale-[1.01]"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add New Category</span>
                  </button>
                </div>

                {/* Category List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
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
                            onClick={() => setSelectedCategory(null)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                              selectedCategory === null
                                ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                                : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedCategory === null ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                <Package size={13} />
                              </div>
                              <span className="text-xs truncate">Uncategorized Items</span>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${selectedCategory === null ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                              {uncategorizedCount}
                            </span>
                          </div>
                        )}
                        {catRows.map((c) => {
                          const isSelected = selectedCategory?.id === c.id;
                          return (
                            <div
                              key={c.id}
                              onClick={() => setSelectedCategory(c)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                                  : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                  <Layers size={13} />
                                </div>
                                <span className="text-xs truncate">{c.name}</span>
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isSelected ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
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

              {/* Right Content Panel */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
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
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            <Layers size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                {items.length} items
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">Products assigned to this category classification</p>
                          </div>
                        </div>
                        {!isUncategorized && selectedCategory && (
                          <button
                            onClick={() => setShowMoveCategoryModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-600 hover:bg-indigo-100/70 text-xs font-bold rounded-xl transition-all"
                          >
                            <ArrowUpRight size={13} />
                            <span>Move Items Here</span>
                          </button>
                        )}
                      </div>

                      {/* Search Filter Bar */}
                      <div className="p-3 border-b border-slate-100 bg-white">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={categoryItemsSearch}
                            onChange={(e) => setCategoryItemsSearch(e.target.value)}
                            placeholder={`Filter ${items.length} items in this category...`}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          {categoryItemsSearch && (
                            <button onClick={() => setCategoryItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {filteredItems.length === 0 ? (
                          <div className="py-16 text-center">
                            <Boxes size={36} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700">No items found</div>
                            <p className="text-xs text-slate-400 mt-1">This category has no assigned inventory items</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredItems.map((p) => {
                              const stockNum = Number(p.stock || 0);
                              const minStock = Number(p.min_stock_alert || 0);
                              const isLow = stockNum <= minStock && stockNum > 0;
                              const isZero = stockNum <= 0;
                              return (
                                <div
                                  key={p.id}
                                  className="p-3 bg-white rounded-xl border border-slate-200/70 hover:border-indigo-200 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                      {p.product_image ? (
                                        <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Package size={16} className="text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                        {p.product_name}
                                      </div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-slate-500 font-semibold">{p.product_sku || p.barcode || "No SKU"}</span>
                                        {p.brand_name && <span>• {p.brand_name}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className={`text-xs font-bold ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                      {stockNum} units
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                      {money(p.selling_price || 0)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── SUB CATEGORIES TAB (PaySplitX Style) ─── */}
          {activeTab === "subcategory" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)]">
              {/* Left Directory Panel */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <ListTree size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Subcategory Directory</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {subcategories.length} Total
                  </span>
                </div>

                {/* Search & Action Header */}
                <div className="p-3 border-b border-slate-100 space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search sub categories..."
                      value={subcategoryListSearch}
                      onChange={(e) => setSubcategoryListSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    {subcategoryListSearch && (
                      <button onClick={() => setSubcategoryListSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSubcatModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all hover:scale-[1.01]"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add New Subcategory</span>
                  </button>
                </div>

                {/* Subcategory List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {(() => {
                    const subRows = subcategories
                      .filter((sc) => {
                        const q = subcategoryListSearch.toLowerCase();
                        if (!q) return true;
                        const catName = categories.find(c => c.id === sc.category_id)?.name || "";
                        return sc.name?.toLowerCase().includes(q) || catName.toLowerCase().includes(q);
                      })
                      .map((sc) => ({
                        ...sc,
                        categoryName: categories.find(c => c.id === sc.category_id)?.name || "",
                        count: products.filter(p => Number(p.subcategory_id) === Number(sc.id)).length,
                      }));

                    if (subRows.length === 0) {
                      return <div className="p-8 text-center text-slate-400 text-xs">No sub categories found</div>;
                    }
                    return subRows.map((sc) => {
                      const isSelected = selectedSubcategory?.id === sc.id;
                      return (
                        <div
                          key={sc.id}
                          onClick={() => setSelectedSubcategory(sc)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                              : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                              <ListTree size={13} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs truncate font-bold">{sc.name}</div>
                              {sc.categoryName && (
                                <div className="text-[10px] text-slate-400 truncate">{sc.categoryName}</div>
                              )}
                            </div>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${isSelected ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                            {sc.count}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Right Content Panel */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                {(() => {
                  const items = selectedSubcategory
                    ? products.filter(p => Number(p.subcategory_id) === Number(selectedSubcategory.id))
                    : [];
                  const filteredItems = items.filter(p =>
                    p.product_name?.toLowerCase().includes(subcategoryItemsSearch.toLowerCase())
                  );

                  return (
                    <>
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            <ListTree size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">
                                {selectedSubcategory ? selectedSubcategory.name : "Select a Sub Category"}
                              </h3>
                              {selectedSubcategory && (
                                <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                  {items.length} items
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">Inventory items assigned under this subcategory classification</p>
                          </div>
                        </div>
                        {selectedSubcategory && (
                          <button
                            onClick={() => setShowMoveSubcategoryModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-600 hover:bg-indigo-100/70 text-xs font-bold rounded-xl transition-all"
                          >
                            <ArrowUpRight size={13} />
                            <span>Move Items Here</span>
                          </button>
                        )}
                      </div>

                      {/* Content Area */}
                      <div className="flex-1 overflow-y-auto flex flex-col">
                        {!selectedSubcategory ? (
                          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3">
                              <ListTree size={28} />
                            </div>
                            <div className="text-sm font-bold text-slate-800">Select a sub category</div>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                              Choose a subcategory from the left panel to inspect its assigned products and inventory levels.
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Search Filter Bar */}
                            <div className="p-3 border-b border-slate-100 bg-white">
                              <div className="relative">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={subcategoryItemsSearch}
                                  onChange={(e) => setSubcategoryItemsSearch(e.target.value)}
                                  placeholder={`Filter ${items.length} items in this subcategory...`}
                                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                                {subcategoryItemsSearch && (
                                  <button onClick={() => setSubcategoryItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Items Grid */}
                            <div className="flex-1 overflow-y-auto p-4">
                              {filteredItems.length === 0 ? (
                                <div className="py-16 text-center">
                                  <Boxes size={36} className="text-slate-300 mx-auto mb-2" />
                                  <div className="text-sm font-bold text-slate-700">No items found</div>
                                  <p className="text-xs text-slate-400 mt-1">This subcategory has no assigned inventory items</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {filteredItems.map((p) => {
                                    const stockNum = Number(p.stock || 0);
                                    const minStock = Number(p.min_stock_alert || 0);
                                    const isLow = stockNum <= minStock && stockNum > 0;
                                    const isZero = stockNum <= 0;
                                    return (
                                      <div
                                        key={p.id}
                                        className="p-3 bg-white rounded-xl border border-slate-200/70 hover:border-indigo-200 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                            {p.product_image ? (
                                              <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Package size={16} className="text-slate-400" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                              {p.product_name}
                                            </div>
                                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                              <span className="font-mono text-slate-500 font-semibold">{p.product_sku || p.barcode || "No SKU"}</span>
                                              {p.brand_name && <span>• {p.brand_name}</span>}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <div className={`text-xs font-bold ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                            {stockNum} units
                                          </div>
                                          <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                            {money(p.selling_price || 0)}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── BRAND TAB (PaySplitX Style) ─── */}
          {activeTab === "brand" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)]">
              {/* Left Directory Panel */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Tags size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Brand Catalog</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {brands.length} Total
                  </span>
                </div>

                {/* Search & Action Header */}
                <div className="p-3 border-b border-slate-100 space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search brands..."
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
                  <button
                    onClick={() => setShowBrandModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all hover:scale-[1.01]"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add New Brand</span>
                  </button>
                </div>

                {/* Brand List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
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
                            onClick={() => setSelectedBrand(null)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                              selectedBrand === null
                                ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                                : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${selectedBrand === null ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                <Package size={13} />
                              </div>
                              <span className="text-xs truncate">Unbranded Products</span>
                            </div>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${selectedBrand === null ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                              {unbrandedCount}
                            </span>
                          </div>
                        )}
                        {brandRows.map((b) => {
                          const isSelected = selectedBrand?.id === b.id;
                          return (
                            <div
                              key={b.id}
                              onClick={() => setSelectedBrand(b)}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                                  : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                  <Tags size={13} />
                                </div>
                                <span className="text-xs truncate">{b.name}</span>
                              </div>
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isSelected ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
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

              {/* Right Content Panel */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
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
                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                            <Tags size={18} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                {items.length} items
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400">Products assigned under this manufacturer or brand label</p>
                          </div>
                        </div>
                        {!isUnbranded && selectedBrand && (
                          <button
                            onClick={() => setShowMoveBrandModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200/80 text-indigo-600 hover:bg-indigo-100/70 text-xs font-bold rounded-xl transition-all"
                          >
                            <ArrowUpRight size={13} />
                            <span>Move Items Here</span>
                          </button>
                        )}
                      </div>

                      {/* Search Filter Bar */}
                      <div className="p-3 border-b border-slate-100 bg-white">
                        <div className="relative">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={brandItemsSearch}
                            onChange={(e) => setBrandItemsSearch(e.target.value)}
                            placeholder={`Filter ${items.length} items in this brand...`}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                          {brandItemsSearch && (
                            <button onClick={() => setBrandItemsSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Items Grid */}
                      <div className="flex-1 overflow-y-auto p-4">
                        {filteredItems.length === 0 ? (
                          <div className="py-16 text-center">
                            <Tags size={36} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-sm font-bold text-slate-700">No items found</div>
                            <p className="text-xs text-slate-400 mt-1">This brand has no assigned inventory items</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filteredItems.map((p) => {
                              const stockNum = Number(p.stock || 0);
                              const minStock = Number(p.min_stock_alert || 0);
                              const isLow = stockNum <= minStock && stockNum > 0;
                              const isZero = stockNum <= 0;
                              return (
                                <div
                                  key={p.id}
                                  className="p-3 bg-white rounded-xl border border-slate-200/70 hover:border-indigo-200 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200/70 flex items-center justify-center shrink-0 text-slate-500 overflow-hidden">
                                      {p.product_image ? (
                                        <img src={p.product_image} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <Package size={16} className="text-slate-400" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-slate-900 truncate" title={p.product_name}>
                                        {p.product_name}
                                      </div>
                                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono text-slate-500 font-semibold">{p.product_sku || p.barcode || "No SKU"}</span>
                                        {p.category_name && <span>• {p.category_name}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className={`text-xs font-bold ${isZero ? "text-rose-600" : isLow ? "text-amber-600" : "text-emerald-600"}`}>
                                      {stockNum} units
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
                                      {money(p.selling_price || 0)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ─── UNIT TAB (PaySplitX Style) ─── */}
          {activeTab === "unit" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)]">
              {/* Left Directory Panel */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Ruler size={14} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">Measurement Units</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {units.length} Total
                  </span>
                </div>

                {/* Search & Action Header */}
                <div className="p-3 border-b border-slate-100 space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search units..."
                      value={unitListSearch}
                      onChange={(e) => setUnitListSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    {unitListSearch && (
                      <button onClick={() => setUnitListSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setShowUnitModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-sm shadow-indigo-100 transition-all hover:scale-[1.01]"
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add New Unit</span>
                  </button>
                </div>

                {/* Unit List */}
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
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
                          onClick={() => handleSelectUnit(u)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50/90 border border-indigo-200/80 text-indigo-950 font-bold shadow-xs"
                              : "hover:bg-slate-50 text-slate-700 font-medium border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                              <Ruler size={13} />
                            </div>
                            <span className="text-xs truncate font-semibold">{u.full}</span>
                          </div>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ml-2 shrink-0 ${isSelected ? "bg-indigo-200/70 text-indigo-800" : "bg-slate-100 text-slate-500"}`}>
                            {u.short}
                          </span>
                        </div>
                      );
                    })}
                  {units.filter(u => 
                    u.full.toLowerCase().includes(unitListSearch.toLowerCase()) || 
                    u.short.toLowerCase().includes(unitListSearch.toLowerCase())
                  ).length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">No units found</div>
                  )}
                </div>
              </div>

              {/* Right Panel - Unit Details */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
                {!selectedUnit ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-3">
                      <Ruler size={28} />
                    </div>
                    <div className="text-sm font-bold text-slate-800">Select a unit</div>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Click on any unit from the list to view its specifications and configure conversion factors.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Unit Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          <Ruler size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{selectedUnit.full}</h3>
                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                              {selectedUnit.short}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400">Unit of measurement specification and conversion rates</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUnitFullForm(selectedUnit.full);
                          setUnitShortForm(selectedUnit.short);
                          setShowUnitModal(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all shadow-xs"
                      >
                        <Pencil size={12} />
                        <span>Edit Unit</span>
                      </button>
                    </div>

                    {/* Unit Details Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      {/* Specifications Card */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Unit Specifications
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/70 border border-slate-200/70 rounded-xl">
                          <div>
                            <div className="text-[11px] font-medium text-slate-400">FULL NAME</div>
                            <div className="text-sm font-bold text-slate-900 mt-0.5">{selectedUnit.full}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-medium text-slate-400">SHORT CODE / SYMBOL</div>
                            <div className="text-sm font-bold text-indigo-600 mt-0.5">{selectedUnit.short}</div>
                          </div>
                        </div>
                      </div>

                      {/* Conversion Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Conversion Rates
                          </span>
                          <button
                            onClick={() => setShowConversionModal(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
                          >
                            <Plus size={13} strokeWidth={2.5} />
                            <span>Add Conversion</span>
                          </button>
                        </div>

                        {/* Conversion List */}
                        {conversions.length === 0 ? (
                          <div className="p-8 border-2 border-dashed border-slate-200/80 rounded-2xl text-center bg-slate-50/50">
                            <Ruler size={28} className="text-slate-300 mx-auto mb-2" />
                            <div className="text-xs font-bold text-slate-600">No conversions configured</div>
                            <p className="text-[11px] text-slate-400 mt-0.5">Define multi-pack and bulk conversion rates for billing accuracy</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {conversions.map((conv, index) => (
                              <div
                                key={index}
                                className="p-3 bg-white border border-slate-200/70 rounded-xl flex items-center justify-between shadow-xs hover:border-indigo-200 transition-all"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    1x
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">
                                      1 {conv.fromUnit || selectedUnit.full}
                                    </span>
                                    <span className="text-slate-400 font-bold text-xs">=</span>
                                    <span className="text-xs font-bold text-indigo-600">
                                      {conv.value} {conv.toUnit}
                                    </span>
                                    {conv.isBase && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 ml-1">
                                        Base Unit
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setConversions(prev => prev.filter((_, i) => i !== index));
                                    showToast("Conversion removed");
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-all"
                                  title="Remove conversion"
                                >
                                  <X size={14} />
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
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Category</h3>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
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

      {showSubcatModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowSubcatModal(false); }}
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
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Subcategory</h3>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                  Parent Category *
                </label>
                <select
                  value={subcatCategoryId}
                  onChange={(e) => setSubcatCategoryId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    background: COLORS.bg,
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
                  Subcategory Name *
                </label>
                <input
                  className="focus-ring"
                  value={subcatForm}
                  onChange={(e) => setSubcatForm(e.target.value)}
                  placeholder="e.g. Mobile Phones"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: RADIUS.sm,
                    border: `1.5px solid ${COLORS.border}`,
                    outline: "none",
                    fontSize: 14,
                    transition: "all 0.15s",
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSubcategory()}
                />
              </div>
            </div>
            <div style={{ padding: "16px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowSubcatModal(false)}
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
                onClick={handleAddSubcategory}
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
                {savingSub ? "Saving..." : "Save Subcategory"}
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
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Brand</h3>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
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
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: SHADOW.modal,
              animation: "popIn 0.2s cubic-bezier(0.2,0.8,0.2,1)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: COLORS.text }}>Add Unit</h3>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
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