import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import api from "../../services/api";
import {
  PackagePlus,
  Package,
  Building2,
  Tag,
  Hash,
  Scale,
  Percent,
  Sparkles,
  Boxes,
  Layers,
  ArrowLeft,
  Plus,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

/* ─── Toast Hook ─────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = (type, title, msg) => {
    const id = Date.now();
    setToasts((p) => [...p, { id, type, title, msg }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3600);
  };
  const remove = (id) => setToasts((p) => p.filter((t) => t.id !== id));
  return { toasts, show, remove };
}

function ToastPortal({ toasts, remove }) {
  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[380px] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 border ${
            t.type === "success"
              ? "bg-slate-900/90 border-emerald-500/40 text-white"
              : t.type === "error"
              ? "bg-red-950/90 border-red-500/40 text-white"
              : "bg-amber-950/90 border-amber-500/40 text-white"
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              t.type === "success"
                ? "bg-emerald-500 text-white"
                : t.type === "error"
                ? "bg-red-500 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold leading-tight">{t.title}</p>
            {t.msg && <p className="text-[11px] opacity-80 mt-0.5 leading-snug">{t.msg}</p>}
          </div>
          <button
            onClick={() => remove(t.id)}
            className="text-white/60 hover:text-white text-xs p-1 cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ProductForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barcodeKey, setBarcodeKey] = useState(0);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstLoading, setGstLoading] = useState(true);
  const { toasts, show, remove } = useToast();
  const [existingCodes, setExistingCodes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [suppliers, setSuppliers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    product_code: "",
    price: "",
    brand_id: "",
    subcategory_id: "",
    stock: "",
    gst: "",
    barcode: "",
    category_id: "",
    unit: "",
    supplier_id: "",
  });

  const set = (field, val) => setForm((p) => ({ ...p, [field]: val }));

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;
    loadCompanies(user.id);
  }, []);

  const loadCompanies = async (admin_id) => {
    try {
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${admin_id}`);
      if (res.data.status) {
        setCompanies(res.data.data || []);
        const savedCompany = localStorage.getItem("selected_company_id");
        if (savedCompany) {
          setSelectedCompany(savedCompany);
        } else if (res.data.data?.[0]?.id) {
          setSelectedCompany(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getCompanyId = () => {
    return selectedCompany || Number(localStorage.getItem("selected_company_id"));
  };

  const fetchCompanyGST = async (company_id) => {
    setGstLoading(true);
    try {
      if (!company_id) return;
      const res = await api.post("/company/get_company_by_id", { id: company_id });
      if (res.data.status) {
        setGstEnabled(res.data.data.gst_type === "with_gst");
      }
    } finally {
      setGstLoading(false);
    }
  };

  const fetchCategories = async (company_id) => {
    try {
      if (!company_id) {
        setCategories([]);
        return;
      }
      const res = await api.get(`/category/get_active_category?company_id=${company_id}`);
      if (res.data.status) {
        setCategories(res.data.data || []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.log(err);
      setCategories([]);
    }
  };

  const fetchSubCategories = async (company_id, category_id) => {
    if (!category_id) {
      setSubCategories([]);
      return;
    }
    try {
      const res = await api.get(
        `/subcategory/get_active_subcategory?company_id=${company_id}&category_id=${category_id}`
      );
      if (res.data.status) {
        setSubCategories(res.data.data || []);
      } else {
        setSubCategories([]);
      }
    } catch (err) {
      console.log(err);
      setSubCategories([]);
    }
  };

  const fetchBrands = async (company_id) => {
    if (!company_id) {
      setBrands([]);
      return;
    }
    try {
      const res = await api.get(`/brand/get_active_brand?company_id=${company_id}`);
      if (res.data.status) {
        setBrands(res.data.data || []);
      } else {
        setBrands([]);
      }
    } catch (err) {
      console.log(err);
      setBrands([]);
    }
  };

  const fetchSuppliers = async (company_id) => {
    if (!company_id) {
      setSuppliers([]);
      return;
    }
    try {
      const res = await api.get(`/supplier/get_all?company_id=${company_id}`);
      if (res.data.status) {
        setSuppliers(res.data.data || []);
      } else {
        setSuppliers([]);
      }
    } catch (err) {
      console.log(err);
      setSuppliers([]);
    }
  };

  const fetchProducts = async (company_id) => {
    if (!company_id) return;
    try {
      const res = await api.get(`/product/get_product_by_company?company_id=${company_id}`);
      if (res.data.status && res.data.data) {
        const codes = res.data.data
          .map((p) => p.product_code?.trim().toUpperCase())
          .filter(Boolean);
        setExistingCodes(codes);
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    if (!selectedCompany) return;
    fetchCategories(selectedCompany);
    fetchCompanyGST(selectedCompany);
    fetchProducts(selectedCompany);
    fetchSuppliers(selectedCompany);
    fetchBrands(selectedCompany);
  }, [selectedCompany]);

  const handleCompanyChange = (e) => {
    const companyId = e.target.value;
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    setForm((prev) => ({
      ...prev,
      supplier_id: "",
      category_id: "",
      subcategory_id: "",
      brand_id: "",
    }));
    setSubCategories([]);
    setBrands([]);
  };

  const generateBarcode = () => {
    const code = "PRD" + Math.floor(100000 + Math.random() * 900000);
    setForm((p) => ({ ...p, barcode: code }));
    setBarcodeKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      show("warn", "Missing Field", "Product name is required.");
      return;
    }
    if (!form.price) {
      show("warn", "Missing Field", "Price is required.");
      return;
    }
    if (isNaN(Number(form.price)) || Number(form.price) < 0) {
      show("warn", "Invalid Price", "Please enter a valid price.");
      return;
    }
    if (!form.stock) {
      show("warn", "Missing Field", "Stock quantity is required.");
      return;
    }
    if (isNaN(Number(form.stock)) || Number(form.stock) < 0) {
      show("warn", "Invalid Stock", "Please enter a valid stock quantity.");
      return;
    }
    if (!form.unit.trim()) {
      show("warn", "Missing Field", "Unit is required.");
      return;
    }

    // GST required ONLY if enabled
    if (gstEnabled) {
      if (!form.gst || String(form.gst).trim() === "") {
        show("warn", "Missing Field", "GST percentage is required when GST is enabled.");
        return;
      }
      if (isNaN(Number(form.gst)) || Number(form.gst) < 0 || Number(form.gst) > 100) {
        show("warn", "Invalid GST", "Please enter a valid GST percentage (0–100).");
        return;
      }
    }

    if (
      form.product_code.trim() &&
      existingCodes.includes(form.product_code.trim().toUpperCase())
    ) {
      show("error", "Duplicate Product Code", "Product code already exists.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/product/add", {
        product_name: form.name.trim(),
        product_code: form.product_code.trim(),
        category_id: Number(form.category_id) || 0,
        subcategory_id: Number(form.subcategory_id) || 0,
        brand_id: Number(form.brand_id) || 0,
        supplier_id: Number(form.supplier_id) || 0,
        company_id: getCompanyId() || selectedCompany,
        price: form.price,
        sale_price: form.price,
        purchase_price: 0,
        stock: form.stock,
        gst_percentage: gstEnabled ? Number(form.gst) || 0 : 0,
        barcode: form.barcode.trim(),
        unit: form.unit.trim(),
      });

      if (res.data.status) {
        show("success", "Product Saved!", `"${form.name}" has been created successfully.`);
        setTimeout(() => navigate("/products"), 1000);
      } else {
        show("error", "Failed", res.data.message || "Failed to create product.");
      }
    } catch (err) {
      console.error(err);
      show("error", "Server Error", "Unable to connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const COMMON_GST_RATES = ["0", "5", "12", "18", "28"];

  const UNITS = [
    "Piece",
    "Kg",
    "Gram",
    "Litre",
    "ML",
    "Meter",
    "Feet",
    "Box",
    "Pack",
    "Dozen",
    "Pair",
    "Roll",
    "Bag",
    "Bottle",
    "Can",
    "Set",
    "Quintal",
    "Ton",
  ];

  return (
    <>
      <ToastPortal toasts={toasts} remove={remove} />

      <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* ── BACK BUTTON & TOP BAR ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate("/products")}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <ArrowLeft size={15} /> Back to Products
            </button>

            {/* Company Selector */}
            {companies.length > 0 && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <Building2 size={15} className="text-indigo-600" />
                <select
                  value={selectedCompany}
                  onChange={handleCompanyChange}
                  className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                >
                  <option value="">Select Company</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── MAIN CARD ── */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 overflow-hidden">
            {/* Header */}
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <PackagePlus size={22} />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                    Add Product
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure catalog item details, tax options & inventory stock
                  </p>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* SECTION 1: BASIC DETAILS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Tag size={14} className="text-indigo-600" />
                  <span>Basic Details</span>
                  <div className="flex-1 h-px bg-slate-100 ml-2" />
                </div>

                {/* Product Name */}
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Package size={16} />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                      placeholder="e.g. Bisleri Mineral Water 1L"
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {/* HSN & Measuring Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                      HSN / Product Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Hash size={15} />
                      </div>
                      <input
                        type="text"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                        placeholder="e.g. PRD001 / 2202"
                        value={form.product_code}
                        onChange={(e) =>
                          set("product_code", e.target.value.toUpperCase().replace(/\s/g, ""))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                      Measuring Unit <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Scale size={15} />
                      </div>
                      <select
                        className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                        value={form.unit}
                        onChange={(e) => set("unit", e.target.value)}
                      >
                        <option value="">Select Unit</option>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRICING & STOCK */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Boxes size={14} className="text-indigo-600" />
                  <span>Pricing & Stock</span>
                  <div className="flex-1 h-px bg-slate-100 ml-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                        ₹
                      </div>
                      <input
                        type="number"
                        step="any"
                        className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => set("price", e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                      placeholder="0"
                      value={form.stock}
                      onChange={(e) => set("stock", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: GST TAXATION (ENABLE / DISABLE SWITCHER) */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Percent size={15} className="text-indigo-600" />
                      <span className="text-xs font-bold text-slate-900">GST Taxation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enable GST to enter rate percentage, or disable if item is tax exempt
                    </p>
                  </div>

                  {/* Enable / Disable Button Switcher */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        setGstEnabled(false);
                        set("gst", "");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        !gstEnabled
                          ? "bg-slate-800 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Disabled
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstEnabled(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        gstEnabled
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Enabled
                    </button>
                  </div>
                </div>

                {/* Conditional Display */}
                {gstEnabled ? (
                  <div className="pt-2 border-t border-slate-200/70 space-y-2.5 animate-in fade-in duration-150">
                    <label className="block text-[11.5px] font-semibold text-slate-700">
                      GST Percentage Rate (%) <span className="text-red-500">*</span>
                    </label>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                          %
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                          placeholder="e.g. 18"
                          value={form.gst}
                          onChange={(e) => set("gst", e.target.value)}
                        />
                      </div>

                      {/* Quick chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {COMMON_GST_RATES.map((rate) => (
                          <button
                            type="button"
                            key={rate}
                            onClick={() => set("gst", rate)}
                            className={`px-2.5 py-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              String(form.gst) === rate
                                ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {rate}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 text-xs text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>GST field is disabled — 0% tax will be recorded for this item.</span>
                  </div>
                )}
              </div>

              {/* SECTION 4: BARCODE */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Hash size={14} className="text-indigo-600" />
                  <span>Barcode Tracking</span>
                  <div className="flex-1 h-px bg-slate-100 ml-2" />
                </div>

                <div className="flex gap-2.5 items-center">
                  <input
                    type="text"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    placeholder="Enter or generate barcode"
                    value={form.barcode}
                    onChange={(e) => set("barcode", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={generateBarcode}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Sparkles size={14} /> Auto Generate
                  </button>
                </div>

                {form.barcode && (
                  <div
                    key={barcodeKey}
                    className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center animate-in fade-in duration-150"
                  >
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Barcode Scan Preview
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <Barcode value={form.barcode} height={45} fontSize={12} margin={0} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/products")}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || gstLoading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Saving Product...
                  </>
                ) : (
                  <>
                    <Plus size={15} strokeWidth={2.5} /> Save Product
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}