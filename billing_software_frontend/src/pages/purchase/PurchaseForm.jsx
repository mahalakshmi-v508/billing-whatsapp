import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  ArrowLeft,
  Save,
  UploadCloud,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  X,
  FileText,
  Truck,
  Building2,
  Calendar,
  Layers,
  Percent,
  ReceiptText,
  Wallet,
  AlertCircle,
  Download,
  Check,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Search,
  Package,
} from "lucide-react";
import * as XLSX from "xlsx";
import HeaderSettingsButton from "../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../components/CommonTableColumnSettings";
import { useTableColumns } from "../../hooks/useTableColumns";

const DEFAULT_PURCHASE_FORM_COLUMNS = [
  { id: "status", label: "Status", defaultVisible: true },
  { id: "product_name", label: "Product Name", defaultVisible: true, fixed: true },
  { id: "product_code", label: "Product Code", defaultVisible: true },
  { id: "barcode", label: "Barcode", defaultVisible: true },
  { id: "category", label: "Category", defaultVisible: true },
  { id: "brand", label: "Brand", defaultVisible: true },
  { id: "supplier_price", label: "Supplier Price", defaultVisible: true },
  { id: "selling_price", label: "Selling Price", defaultVisible: true },
  { id: "selling_price_unit", label: "Selling Price Unit", defaultVisible: true },
  { id: "quantity", label: "Qty", defaultVisible: true },
  { id: "unit", label: "Unit", defaultVisible: true },
  { id: "gst_percentage", label: "GST %", defaultVisible: true },
  { id: "action", label: "Action", defaultVisible: true, fixed: true },
];

const unitOptions = [
  "Piece", "Kg", "Gram", "Litre", "ML", "Meter", "Feet", 
  "Box", "Pack", "Dozen", "Pair", "Roll", "Bag", "Bottle", 
  "Can", "Set"
];

export default function PurchaseForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // Draft ID if editing

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [purchaseNo, setPurchaseNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidAmount, setPaidAmount] = useState(0);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isLocked, setIsLocked] = useState(false); // Locked if submitted

  const {
    columns: tableColumns,
    isOpen: isSettingsOpen,
    openSettings,
    closeSettings,
    toggleColumn,
    resetColumns,
    isColumnVisible,
    visibleColumnCount
  } = useTableColumns(DEFAULT_PURCHASE_FORM_COLUMNS, "purchase_form_item_columns_v2");

  // Category and Brand states (Standalone)
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Load Companies
  useEffect(() => {
    let user = {};
    try {
      user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch (e) {
      user = {};
    }
    const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
    if (adminId) {
      api.get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || ""}`)
        .then(res => {
          if (res.data.status) {
            setCompanies(res.data.data);
          }
        })
        .catch(console.error);
    }
  }, []);

  // Load basic configurations when company or draft ID changes
  useEffect(() => {
    if (!selectedCompany) return;

    // Load Suppliers for selected company
    api.get(`/supplier/get_all?company_id=${selectedCompany}`)
      .then(res => {
        if (res.data.status) {
          setSuppliers(res.data.data);
        }
      })
      .catch(console.error);

    // Load Categories for selected company
    api.get(`/category/get_active_category?company_id=${selectedCompany}`)
      .then(res => {
        if (res.data.status) {
          setCategories(res.data.data);
        }
      })
      .catch(console.error);

    // Load All Active Brands for selected company (Standalone)
    api.get(`/brand/get_active_brand?company_id=${selectedCompany}`)
      .then(res => {
        if (res.data.status) {
          setBrands(res.data.data || []);
        }
      })
      .catch(console.error);

    // If ID is provided, load the draft purchase
    if (id) {
      setLoading(true);
      api.get(`/purchase/get_purchase_by_id?id=${id}`)
        .then(res => {
          if (res.data.status) {
            const p = res.data.data;
            setSelectedSupplier(p.supplier_id);
            setPurchaseNo(p.purchase_no || "");
            setPurchaseDate(p.purchase_date);
            setPaidAmount(p.paid_amount || 0);
            setIsLocked(p.status === "submitted");

            // Format items for validation lookup
            const formatted = p.items.map(item => ({
              product_name: item.product_name,
              product_code: item.product_code || "",
              barcode: item.barcode || "",
              category_name: item.category_name || "",
              brand_name: item.brand_name || "",
              price: Number(item.price),
              selling_price: Number(item.selling_price || 0),
              selling_price_per_unit: item.selling_price_per_unit || "",
              quantity: Number(item.quantity),
              unit: item.unit || "Piece",
              gst_percentage: Number(item.gst_percentage),
              product_id: item.product_id,
              category_id: item.category_id,
              brand_id: item.brand_id,
              status: "valid",
              errors: [],
              warnings: []
            }));
            setItems(formatted);

            // Re-run validation against backend DB to check status
            runBackendValidation(formatted);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else if (!id && selectedCompany) {
      api.get(`/invoice-settings/next-number?company_id=${selectedCompany}&type=purchase_order`)
        .then(res => {
          if (res.data?.status && res.data?.formatted_number) {
            setPurchaseNo(prev => prev || res.data.formatted_number);
          }
        })
        .catch(() => {});
    }
  }, [selectedCompany, id]);

  // Run validation on local items with backend lookups
  const runBackendValidation = async (currentItems) => {
    if (currentItems.length === 0) return;
    try {
      const res = await api.post("/purchase/validate_items", {
        company_id: selectedCompany,
        items: currentItems.map(item => ({
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          category_name: item.category_name,
          brand_name: item.brand_name,
          price: item.price,
          selling_price: item.selling_price || 0,
          selling_price_per_unit: item.selling_price_per_unit || "",
          quantity: item.quantity,
          unit: item.unit,
          gst_percentage: item.gst_percentage
        }))
      });
      if (res.data.status) {
        const validated = res.data.data;

        // Build the resolved items list
        const resolvedItems = currentItems.map((item, index) => {
          const val = validated[index] || {};
          return {
            ...item,
            product_id: val.product_id,
            category_id: val.category_id || item.category_id,
            brand_id: val.brand_id || item.brand_id,
            status: val.status,
            errors: val.errors || [],
            warnings: val.warnings || []
          };
        });

        setItems(resolvedItems);
      }
    } catch (err) {
      console.error("Backend validation error", err);
    }
  };

  // Perform complete required field local validation followed by backend API validation
  const validateAllItems = async () => {
    let hasLocalError = false;
    const validatedLocalItems = items.map((item) => {
      const errors = [];
      
      if (!item.product_name || !item.product_name.trim()) {
        errors.push("Product name is required");
      }
      if (item.price === undefined || item.price === null || parseFloat(item.price) <= 0) {
        errors.push("Supplier price must be greater than 0");
      }
      if (item.selling_price === undefined || item.selling_price === null || parseFloat(item.selling_price) <= 0) {
        errors.push("Selling price must be greater than 0");
      }
      if (item.quantity === undefined || item.quantity === null || parseInt(item.quantity) <= 0) {
        errors.push("Quantity must be greater than 0");
      }
      if (!item.unit || !item.unit.trim()) {
        errors.push("Unit is required");
      }

      if (errors.length > 0) {
        hasLocalError = true;
        return {
          ...item,
          status: "error",
          errors: errors,
          warnings: item.warnings || []
        };
      }

      return {
        ...item,
        status: "valid",
        errors: [],
        warnings: item.warnings || []
      };
    });

    if (hasLocalError) {
      setItems(validatedLocalItems);
      alert("Validation failed! Some required fields in the table are missing or invalid. Errored rows are highlighted in red.");
      return null;
    }

    // Call backend validate_items API
    try {
      const res = await api.post("/purchase/validate_items", {
        company_id: selectedCompany,
        items: validatedLocalItems.map(item => ({
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          category_name: item.category_name,
          brand_name: item.brand_name,
          price: item.price,
          selling_price: item.selling_price || 0,
          selling_price_per_unit: item.selling_price_per_unit || "",
          quantity: item.quantity,
          unit: item.unit,
          gst_percentage: item.gst_percentage
        }))
      });

      if (res.data.status) {
        const validated = res.data.data;
        const resolvedItems = validatedLocalItems.map((item, index) => {
          const val = validated[index] || {};
          return {
            ...item,
            product_id: val.product_id,
            category_id: val.category_id || item.category_id,
            brand_id: val.brand_id || item.brand_id,
            status: val.status,
            errors: [...(item.errors || []), ...(val.errors || [])],
            warnings: val.warnings || []
          };
        });

        setItems(resolvedItems);

        // Check for any errors returned from backend
        const hasBackendErrors = resolvedItems.some(item => item.status === "error");
        if (hasBackendErrors) {
          alert("Validation failed on server! Please check the errored rows highlighted in red.");
          return null;
        }

        return resolvedItems;
      } else {
        alert("Server validation failed: " + res.data.message);
        return null;
      }
    } catch (err) {
      console.error(err);
      alert("Error validating purchase items with server.");
      return null;
    }
  };

  // Trigger Excel file template download
  const downloadTemplate = () => {
    const headers = [
      ["Product Name", "Product Code", "Barcode", "Category", "Brand", "Supplier Price", "Selling Price", "Selling Price Per Unit", "Quantity", "Unit", "GST %"],
      ["Sample Product A", "PRDA01", "1234567890", "Electronics", "BrandX", "15000", "18000", "per Piece", "10", "Piece", "18"],
      ["Sample Product B", "PRDB02", "", "Groceries", "BrandY", "120", "150", "per Pack", "50", "Pack", "5"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Purchase_Invoice_Import_Template.xlsx");
  };

  // Parse Excel file input
  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        alert("The uploaded excel sheet is empty!");
        return;
      }

      // Map spreadsheet columns to keys (without subcategory)
      const parsed = json.map(row => {
        const findVal = (names) => {
          const key = Object.keys(row).find(k => names.includes(k.trim().toLowerCase()));
          return key ? row[key] : "";
        };

        return {
          product_name: String(findVal(["product name", "name", "product_name"]) || ""),
          product_code: String(findVal(["product code", "code", "sku", "product_code"]) || ""),
          barcode: String(findVal(["barcode", "barcode_no"]) || ""),
          category_name: String(findVal(["category", "category name", "category_name"]) || ""),
          brand_name: String(findVal(["brand", "brand name", "brand_name"]) || ""),
          price: parseFloat(findVal(["supplier price", "purchase price", "price", "rate", "cost", "cost price"]) || 0),
          selling_price: parseFloat(findVal(["selling price", "selling_price", "sell price"]) || 0),
          selling_price_per_unit: String(findVal(["selling price per unit", "selling_price_per_unit", "sell price per unit"]) || ""),
          quantity: parseInt(findVal(["quantity", "qty", "stock"]) || 0),
          unit: String(findVal(["unit", "uom"]) || "Piece"),
          gst_percentage: parseFloat(findVal(["gst %", "gst", "gst_percentage"]) || 0),
          status: "pending",
          errors: [],
          warnings: []
        };
      });

      setItems(parsed);
      // Run backend validation to resolve IDs, then prefetch dropdowns
      try {
        const res = await api.post("/purchase/validate_items", {
          company_id: selectedCompany,
          items: parsed.map(item => ({
            product_name: item.product_name,
            product_code: item.product_code,
            barcode: item.barcode,
            category_name: item.category_name,
            brand_name: item.brand_name,
            price: item.price,
            selling_price: item.selling_price || 0,
            selling_price_per_unit: item.selling_price_per_unit || "",
            quantity: item.quantity,
            unit: item.unit,
            gst_percentage: item.gst_percentage
          }))
        });
        if (res.data.status) {
          const validated = res.data.data;
          const resolvedItems = parsed.map((item, index) => {
            const val = validated[index] || {};
            return {
              ...item,
              product_id: val.product_id,
              category_id: val.category_id || item.category_id,
              brand_id: val.brand_id || item.brand_id,
              status: val.status,
              errors: val.errors || [],
              warnings: val.warnings || []
            };
          });
          setItems(resolvedItems);
        }
      } catch (err) {
        console.error("Excel validation error", err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input value
    e.target.value = null;
  };

  // Add a blank manual row
  const addManualRow = () => {
    const newRow = {
      product_name: "",
      product_code: "",
      barcode: "",
      category_name: "",
      brand_name: "",
      category_id: "",
      brand_id: "",
      price: 0,
      selling_price: 0,
      selling_price_per_unit: "",
      quantity: 1,
      unit: "Piece",
      gst_percentage: 0,
      status: "pending",
      errors: [],
      warnings: []
    };
    const updated = [...items, newRow];
    setItems(updated);
  };

  // Modify row inline
  const updateRowField = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    updated[index].status = "pending";
    updated[index].errors = [];
    setItems(updated);
  };

  // Handle Category Select (Standalone)
  const handleCategoryChange = (index, categoryId) => {
    const cat = categories.find(c => Number(c.id) === Number(categoryId));
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      category_id: categoryId,
      category_name: cat ? cat.name : "",
      status: "pending",
      errors: []
    };
    setItems(updated);
  };

  // Handle Brand Select (Standalone)
  const handleBrandChange = (index, brandId) => {
    const brand = brands.find(b => Number(b.id) === Number(brandId));
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      brand_id: brandId,
      brand_name: brand ? (brand.name || brand.brand_name) : "",
      status: "pending",
      errors: []
    };
    setItems(updated);
  };

  // Remove row
  const deleteRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  // Lookup product by code and auto-fill row fields
  const fetchProductByCode = async (index, code) => {
    if (!code || !selectedCompany) return;
    try {
      const res = await api.get(`/product/get_by_code?company_id=${selectedCompany}&product_code=${encodeURIComponent(code)}`);
      if (res.data.status) {
        const p = res.data.data;
        const updated = [...items];
        updated[index] = {
          ...updated[index],
          product_name: p.product_name || updated[index].product_name,
          product_code: p.product_code || code,
          barcode: p.barcode || updated[index].barcode,
          category_id: p.category_id || "",
          category_name: p.category_name || "",
          brand_id: p.brand_id || "",
          brand_name: p.brand_name || "",
          price: p.price || updated[index].price,
          unit: p.unit || updated[index].unit,
          gst_percentage: p.gst_percentage || updated[index].gst_percentage,
          product_id: p.id,
          status: "valid",
          errors: [],
          warnings: []
        };
        setItems(updated);
      }
    } catch (err) {
      console.error("fetchProductByCode error", err);
    }
  };

  // Calculation totals
  const subTotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (parseFloat(item.price) || 0)), 0);
  const gstTotal = items.reduce((sum, item) => sum + (((Number(item.quantity) || 0) * (parseFloat(item.price) || 0)) * ((parseFloat(item.gst_percentage) || 0) / 100)), 0);
  const grandTotal = subTotal + gstTotal;

  // Actions
  const handleSaveDraft = async () => {
    if (!selectedCompany) {
      alert("Please select a company!");
      return;
    }
    if (!selectedSupplier) {
      alert("Please select a supplier!");
      return;
    }

    const validatedItems = await validateAllItems();
    if (!validatedItems) return;

    setSaving(true);
    try {
      const res = await api.post("/purchase/save_draft", {
        id: id || 0,
        company_id: selectedCompany,
        supplier_id: selectedSupplier,
        purchase_no: purchaseNo,
        purchase_date: purchaseDate,
        paid_amount: paidAmount,
        items: validatedItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          category_id: item.category_id,
          category_name: item.category_name,
          brand_id: item.brand_id,
          brand_name: item.brand_name,
          price: item.price,
          selling_price: item.selling_price || 0,
          selling_price_per_unit: item.selling_price_per_unit || "",
          quantity: item.quantity,
          unit: item.unit,
          gst_percentage: item.gst_percentage
        }))
      });
      if (res.data.status) {
        alert(res.data.message);
        navigate("/purchases");
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving purchase draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPurchase = async () => {
    if (!selectedCompany) {
      alert("Please select a company!");
      return;
    }
    if (!selectedSupplier) {
      alert("Please select a supplier!");
      return;
    }

    const validatedItems = await validateAllItems();
    if (!validatedItems) return;

    if (!window.confirm("Submit purchase? This will commit items and update inventory stock values permanently.")) return;

    setSaving(true);
    try {
      const res = await api.post("/purchase/submit_purchase", {
        id: id || 0,
        company_id: selectedCompany,
        supplier_id: selectedSupplier,
        purchase_no: purchaseNo,
        purchase_date: purchaseDate,
        paid_amount: paidAmount,
        items: validatedItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          barcode: item.barcode,
          category_id: item.category_id,
          category_name: item.category_name,
          brand_id: item.brand_id,
          brand_name: item.brand_name,
          price: item.price,
          selling_price: item.selling_price || 0,
          selling_price_per_unit: item.selling_price_per_unit || "",
          quantity: item.quantity,
          unit: item.unit,
          gst_percentage: item.gst_percentage
        }))
      });
      if (res.data.status) {
        const savedPurchaseNo = res.data.purchase_no || res.data.invoice_no || purchaseNo;
        if (id) {
          setToast(`Purchase Bill #${savedPurchaseNo} updated successfully!`);
          setTimeout(() => navigate("/purchases"), 1500);
        } else {
          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Purchase Bill #${savedPurchaseNo} saved successfully!`);
            setTimeout(() => setToast(null), 4500);

            // Reset form for next purchase entry
            setSelectedSupplier("");
            setPaidAmount(0);
            setItems([]);

            // Fetch next purchase number
            try {
              const nextRes = await api.get(`/invoice-settings/next-number?company_id=${selectedCompany}&type=purchase_order`);
              if (nextRes.data?.status && nextRes.data?.formatted_number) {
                setPurchaseNo(nextRes.data.formatted_number);
              } else {
                setPurchaseNo(`PO-${Date.now()}`);
              }
            } catch {
              setPurchaseNo(`PO-${Date.now()}`);
            }
          } else {
            navigate(`/invoice/${savedPurchaseNo}`);
          }
        }
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error finalizing purchase");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 pb-24 antialiased">
      
      {/* ── 1. EXECUTIVE COMMAND BAR & PURCHASE VOUCHER TAB ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 md:px-6 pt-3 pb-0 shadow-xs sticky top-0 z-30">
        <div className="flex items-center justify-between gap-4">
          
          {/* Voucher Workspace Tab Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <div className="group relative flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all cursor-pointer border-t-2 border-blue-600 bg-slate-50 text-blue-700 shadow-xs font-bold">
              <div className="flex items-center gap-2">
                <Truck size={13} className="text-blue-600" />
                <span>{isLocked ? "View Purchase Bill" : id ? "Edit Purchase" : "Purchase Invoice"}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 font-mono">
                  {purchaseNo || "Draft"}
                </span>
              </div>
            </div>
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
              onClick={() => navigate("/purchases")}
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
              onClick={() => navigate("/purchases")}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-xs cursor-pointer"
              title="Back to Purchases"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                  Procurement Desk
                </span>
                <span className="text-xs text-slate-400 font-medium">• Stock Inward &amp; Purchase Voucher</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isLocked ? `View Purchase Bill #${purchaseNo}` : id ? `Edit Draft Purchase #${purchaseNo}` : "New Purchase Invoice"}
              </h1>
            </div>
          </div>

          {/* Quick Excel Tools */}
          {!isLocked && (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={downloadTemplate}
                className="px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Download sample excel template"
              >
                <Download size={14} className="text-emerald-600" />
                <span>Template.xlsx</span>
              </button>

              <label
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 ${
                  selectedCompany
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 cursor-pointer shadow-blue-500/20"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
                title={selectedCompany ? "Upload Excel Spreadsheet" : "Select company first to upload excel"}
              >
                <UploadCloud size={15} />
                <span>Upload Excel</span>
                {selectedCompany && (
                  <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
                )}
              </label>
            </div>
          )}
        </div>

        {/* Success Toast */}
        {toast && (
          <div className="mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm font-semibold flex items-center justify-center gap-2">
          <RefreshCw size={18} className="animate-spin text-blue-600" />
          <span>Loading purchase record...</span>
        </div>
      ) : (
        <>
          {/* ── 3. SUPPLIER INTELLIGENCE & INVOICE PARAMETERS CARDS ── */}
          <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 mb-6">
            
            {/* Left: Supplier & Company Profile (7 Cols) */}
            <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Supplier &amp; Vendor Profile</h3>
                    <p className="text-[11px] text-slate-400">Select company branch and supplier for procurement tracking</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Company Select */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                      Company / Branch <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedCompany}
                      disabled={isLocked}
                      onChange={(e) => {
                        const compId = e.target.value;
                        setSelectedCompany(compId);
                        localStorage.setItem("selected_company_id", compId);
                        setSelectedSupplier("");
                        setItems([]);
                        setCategories([]);
                        setBrands([]);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed transition"
                    >
                      <option value="">Select Company</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.company_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier Select */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">
                      Supplier / Vendor <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedSupplier}
                      disabled={isLocked || !selectedCompany}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed transition"
                    >
                      <option value="">{selectedCompany ? "Select Supplier" : "Select Company First"}</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.supplier_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Invoice Parameters (5 Cols) */}
            <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Invoice Parameters</h3>
                    <p className="text-[11px] text-slate-400">Purchase bill order reference &amp; inward date</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Bill No */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">Bill / Invoice No</label>
                    <input
                      type="text"
                      value={purchaseNo}
                      disabled={isLocked}
                      onChange={(e) => setPurchaseNo(e.target.value)}
                      placeholder="Enter Bill No (e.g. PO-001)"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 transition"
                    />
                  </div>

                  {/* Purchase Date */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 block">Purchase Date</label>
                    <input
                      type="date"
                      value={purchaseDate}
                      disabled={isLocked}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 cursor-pointer transition"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── 4. PURCHASED ITEMS MATRIX TABLE ── */}
          <div className="px-6 md:px-8 mb-6">
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Layers size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Purchased Items &amp; Inventory Stock
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {items.length} {items.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {!isLocked && (
                  <button
                    type="button"
                    onClick={addManualRow}
                    disabled={!selectedCompany}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      selectedCompany
                        ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 shadow-2xs"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    <Plus size={14} strokeWidth={2.5} />
                    <span>Add Item Row</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
                  <thead>
                    <tr className="bg-slate-50/60 border-b border-slate-200/80 text-slate-600 font-bold select-none text-[11px] uppercase tracking-wider">
                      {isColumnVisible("status") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-12">Status</th>
                      )}
                      {isColumnVisible("product_name") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 min-w-[200px]">Product Name *</th>
                      )}
                      {isColumnVisible("product_code") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 w-36">Product Code</th>
                      )}
                      {isColumnVisible("barcode") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 w-36">Barcode (Opt)</th>
                      )}
                      {isColumnVisible("category") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 w-44">Category (Opt)</th>
                      )}
                      {isColumnVisible("brand") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 w-44">Brand (Opt)</th>
                      )}
                      {isColumnVisible("supplier_price") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-32">Supplier Price (₹)</th>
                      )}
                      {isColumnVisible("selling_price") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-32">Selling Price (₹)</th>
                      )}
                      {isColumnVisible("selling_price_unit") && (
                        <th className="py-3 px-3 border-r border-slate-200/60 w-36">Selling Price Unit</th>
                      )}
                      {isColumnVisible("quantity") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-24">Qty</th>
                      )}
                      {isColumnVisible("unit") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-28">Unit</th>
                      )}
                      {isColumnVisible("gst_percentage") && (
                        <th className="py-3 px-3 text-center border-r border-slate-200/60 w-24">GST %</th>
                      )}
                      {!isLocked && <th className="py-3 px-2 text-center w-12">Action</th>}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 font-medium">
                    {items.length === 0 ? (
                      <tr>
                        <td
                          colSpan={visibleColumnCount || (isLocked ? 12 : 13)}
                          className="py-12 text-center text-slate-400 text-xs font-semibold"
                        >
                          No items added. Select Company first, then Upload Excel or click <strong>+ Add Item Row</strong> to begin.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const statusColors = {
                          valid: { bg: "bg-emerald-100 text-emerald-700 border border-emerald-300", icon: "✓" },
                          warning: { bg: "bg-amber-100 text-amber-800 border border-amber-300", icon: "!" },
                          error: { bg: "bg-rose-100 text-rose-700 border border-rose-300", icon: "!" },
                          pending: { bg: "bg-slate-100 text-slate-600 border border-slate-300", icon: "?" }
                        };
                        const statusStyle = statusColors[item.status] || statusColors.pending;
                        const isRowErrored = item.status === "error";

                        return (
                          <tr
                            key={index}
                            className={`transition-colors ${
                              isRowErrored ? "bg-rose-50/50 hover:bg-rose-50" : "hover:bg-blue-50/30"
                            }`}
                          >
                            {/* Status */}
                            {isColumnVisible("status") && (
                              <td className="py-2.5 px-3 text-center border-r border-slate-200/60">
                                <div
                                  title={[...(item.errors || []), ...(item.warnings || [])].join("\n")}
                                  className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center font-bold text-[11px] cursor-pointer ${statusStyle.bg}`}
                                >
                                  {statusStyle.icon}
                                </div>
                              </td>
                            )}

                            {/* Product Name */}
                            {isColumnVisible("product_name") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <input
                                  type="text"
                                  value={item.product_name}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "product_name", e.target.value)}
                                  placeholder="Enter product name..."
                                  className={`w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/15 transition ${
                                    isRowErrored && (!item.product_name || !item.product_name.trim())
                                      ? "border border-rose-400 focus:border-rose-500"
                                      : "border border-slate-200 focus:border-blue-500"
                                  }`}
                                />
                              </td>
                            )}

                            {/* Code */}
                            {isColumnVisible("product_code") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <input
                                  type="text"
                                  value={item.product_code}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "product_code", e.target.value)}
                                  onBlur={(e) => fetchProductByCode(index, e.target.value.trim())}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      fetchProductByCode(index, e.target.value.trim());
                                    }
                                  }}
                                  placeholder="Code + Enter"
                                  title="Enter product code and press Enter to auto-fill"
                                  className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                                />
                              </td>
                            )}

                            {/* Barcode */}
                            {isColumnVisible("barcode") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <input
                                  type="text"
                                  value={item.barcode}
                                  disabled={isLocked}
                                  placeholder="Optional"
                                  onChange={(e) => updateRowField(index, "barcode", e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50/70 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-blue-500 transition"
                                />
                              </td>
                            )}

                            {/* Category */}
                            {isColumnVisible("category") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <select
                                  value={item.category_id || ""}
                                  disabled={isLocked || !selectedCompany}
                                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer disabled:bg-slate-100"
                                >
                                  <option value="">Select Category (Opt)</option>
                                  {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* Brand */}
                            {isColumnVisible("brand") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <select
                                  value={item.brand_id || ""}
                                  disabled={isLocked || !selectedCompany}
                                  onChange={(e) => handleBrandChange(index, e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer disabled:bg-slate-100"
                                >
                                  <option value="">Select Brand (Opt)</option>
                                  {brands.map(b => (
                                    <option key={b.id} value={b.id}>{b.name || b.brand_name}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* Supplier Price */}
                            {isColumnVisible("supplier_price") && (
                              <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "price", e.target.value)}
                                  className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                                />
                              </td>
                            )}

                            {/* Selling Price */}
                            {isColumnVisible("selling_price") && (
                              <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.selling_price}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "selling_price", e.target.value)}
                                  className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                                />
                              </td>
                            )}

                            {/* Selling Price Unit */}
                            {isColumnVisible("selling_price_unit") && (
                              <td className="py-2 px-3 border-r border-slate-200/60">
                                <select
                                  value={item.selling_price_per_unit || ""}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "selling_price_per_unit", e.target.value)}
                                  className="w-full px-2 py-1.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none cursor-pointer"
                                >
                                  <option value="">Select Unit</option>
                                  {unitOptions.map(opt => (
                                    <option key={opt} value={`per ${opt}`}>per {opt}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* Qty */}
                            {isColumnVisible("quantity") && (
                              <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "quantity", parseInt(e.target.value) || 0)}
                                  className="w-full py-1.5 px-2 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-900 text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition"
                                />
                              </td>
                            )}

                            {/* Unit */}
                            {isColumnVisible("unit") && (
                              <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                                <select
                                  value={item.unit || ""}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "unit", e.target.value)}
                                  className="w-full py-1.5 px-1 bg-slate-50/70 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none cursor-pointer"
                                >
                                  {unitOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </td>
                            )}

                            {/* GST */}
                            {isColumnVisible("gst_percentage") && (
                              <td className="py-2 px-2 border-r border-slate-200/60 text-center">
                                <input
                                  type="number"
                                  value={item.gst_percentage}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "gst_percentage", parseFloat(e.target.value) || 0)}
                                  className="w-full py-1.5 px-1 bg-slate-50/70 focus:bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:border-blue-500 transition"
                                />
                              </td>
                            )}

                            {/* Action delete */}
                            {!isLocked && (
                              <td className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => deleteRow(index)}
                                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer mx-auto"
                                  title="Delete row"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Table Footer */}
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-800 text-xs">
                        <td colSpan={2} className="py-3 px-4 border-r border-slate-200/60">
                          Total Summary ({items.length} {items.length === 1 ? "Line Item" : "Line Items"})
                        </td>
                        <td colSpan={visibleColumnCount ? visibleColumnCount - 3 : 10} className="py-3 px-4 text-right border-r border-slate-200/60">
                          Subtotal (Cost): <strong className="text-slate-900 font-mono ml-1">₹ {subTotal.toFixed(2)}</strong>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          Total: ₹ {grandTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>

          {/* ── 5. FINANCIAL RECONCILIATION & TOTALS SUMMARY ── */}
          <div className="px-6 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Left 7 Columns: Inward Instructions & Details */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <FileText size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Procurement Workflow Guidance</h3>
              </div>
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-600 leading-relaxed space-y-2">
                <p>• <strong>Automatic Code Matching:</strong> Enter an existing product code into any row to automatically auto-fill its category, brand, and unit details.</p>
                <p>• <strong>Inventory Stock Inward:</strong> Clicking <strong>Submit to Inventory</strong> will finalize the invoice and increase inventory stock quantities across your catalog.</p>
                <p>• <strong>Save as Draft:</strong> You can save this purchase as a draft to resume later without altering stock balances immediately.</p>
              </div>
            </div>

            {/* Right 5 Columns: Financial Breakdown & Settlement */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Wallet size={14} />
                  </div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Summary</span>
                </div>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  INR (₹)
                </span>
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center">
                  <span>Total Items</span>
                  <span className="font-bold text-slate-900">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Subtotal (Purchase Cost)</span>
                  <span className="font-bold text-slate-900">₹ {subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Total Tax (GST)</span>
                  <span className={`font-bold ${gstTotal > 0 ? "text-emerald-700" : "text-slate-700"}`}>
                    {gstTotal > 0 ? `+ ₹ ${gstTotal.toFixed(2)}` : "₹ 0.00"}
                  </span>
                </div>
              </div>

              {/* Grand Total Hero Box */}
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-4 text-white shadow-md shadow-blue-500/20 flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">Grand Total</span>
                  <span className="text-2xl font-black tracking-tight">
                    ₹ {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold uppercase">
                    Purchase Bill
                  </span>
                </div>
              </div>

              {/* Settlement: Paid Amount & Remaining Balance */}
              {!isLocked ? (
                <div className="pt-2 space-y-2 border-t border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 uppercase text-[11px]">Paid Amount</label>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={paidAmount || ""}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full pl-6 pr-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-right outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-600">Remaining Balance Due</span>
                    <span className={`text-xs font-black ${Math.max(0, grandTotal - paidAmount) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                      ₹ {Math.max(0, grandTotal - paidAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-600">Paid Amount</span>
                  <span className="text-slate-900">₹ {Number(paidAmount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* ── 6. STICKY ACTION FOOTER BAR ── */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-6 py-3.5 z-30 flex items-center justify-between shadow-lg">
        <button
          type="button"
          onClick={() => navigate("/purchases")}
          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
        >
          Discard / Back
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-600 mr-2">
            <span>Items: <strong className="text-slate-900">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</strong></span>
            <span>•</span>
            <span>Total: <strong className="text-blue-600 font-mono font-black">₹{grandTotal.toFixed(2)}</strong></span>
          </div>

          {!isLocked ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={handleSubmitPurchase}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 transition"
              >
                {saving ? <RefreshCw size={15} className="animate-spin" /> : <Check size={15} />}
                <span>{saving ? "Processing..." : "Submit to Inventory"}</span>
              </button>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 size={15} />
              <span>Bill Submitted</span>
            </div>
          )}
        </div>
      </footer>

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        columns={tableColumns}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        title="Customize Invoice Item Columns"
      />

    </div>
  );
}
