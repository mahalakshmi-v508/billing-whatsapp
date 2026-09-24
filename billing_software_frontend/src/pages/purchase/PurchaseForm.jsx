import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Save, UploadCloud, Plus, Trash2, HelpCircle, CheckCircle2, X } from "lucide-react";
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
  { id: "subcategory", label: "Subcategory", defaultVisible: true },
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
  } = useTableColumns(DEFAULT_PURCHASE_FORM_COLUMNS, "purchase_form_item_columns_v1");

  // Category, Subcategory, and Brand Cache states
  const [categories, setCategories] = useState([]);
  const [companySubcategories, setCompanySubcategories] = useState({}); // catId -> subcategories
  const [companyBrands, setCompanyBrands] = useState({}); // `${catId}-${subcatId}` -> brands

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
              subcategory_name: item.subcategory_name || "",
              brand_name: item.brand_name || "",
              price: Number(item.price),
              selling_price: Number(item.selling_price || 0),
              selling_price_per_unit: item.selling_price_per_unit || "",
              quantity: Number(item.quantity),
              unit: item.unit || "Piece",
              gst_percentage: Number(item.gst_percentage),
              product_id: item.product_id,
              category_id: item.category_id,
              subcategory_id: item.subcategory_id,
              brand_id: item.brand_id,
              status: "valid",
              errors: [],
              warnings: []
            }));
            setItems(formatted);

            // Prefetch subcategories and brands caches for loaded items
            const uniqueCats = [...new Set(p.items.map(i => i.category_id).filter(Boolean))];
            uniqueCats.forEach(catId => {
              api.get(`/subcategory/get_active_subcategory?company_id=${p.company_id}&category_id=${catId}`)
                .then(resSub => {
                  if (resSub.data.status) {
                    setCompanySubcategories(prev => ({ ...prev, [catId]: resSub.data.data }));
                  }
                });
            });

            p.items.forEach(item => {
              if (item.category_id && item.subcategory_id) {
                const key = `${item.category_id}-${item.subcategory_id}`;
                api.get(`/brand/get_active_brand?company_id=${p.company_id}&category_id=${item.category_id}&subcategory_id=${item.subcategory_id}`)
                  .then(resBrand => {
                    if (resBrand.data.status) {
                      setCompanyBrands(prev => ({ ...prev, [key]: resBrand.data.data }));
                    }
                  });
              }
            });

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
          subcategory_name: item.subcategory_name,
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
            subcategory_id: val.subcategory_id || item.subcategory_id,
            brand_id: val.brand_id || item.brand_id,
            status: val.status,
            errors: val.errors || [],
            warnings: val.warnings || []
          };
        });

        setItems(resolvedItems);

        // Prefetch subcategory options for all resolved category_ids (bypass stale closure)
        const uniqueCatIds = [...new Set(resolvedItems.map(i => i.category_id).filter(Boolean))];
        for (const catId of uniqueCatIds) {
          try {
            const subRes = await api.get(`/subcategory/get_active_subcategory?company_id=${selectedCompany}&category_id=${catId}`);
            if (subRes.data.status) {
              setCompanySubcategories(prev => ({ ...prev, [catId]: subRes.data.data }));
            }
          } catch (e) { console.error("subcategory prefetch error", e); }
        }

        // Prefetch brand options for any resolved category+subcategory combos
        const uniqueKeys = [...new Set(
          resolvedItems
            .filter(i => i.category_id && i.subcategory_id)
            .map(i => `${i.category_id}-${i.subcategory_id}`)
        )];
        // Use a local set to avoid duplicate fetches within this pass (bypass stale closure)
        const fetchedKeys = new Set();
        for (const key of uniqueKeys) {
          if (!fetchedKeys.has(key)) {
            fetchedKeys.add(key);
            const [catId, subId] = key.split("-");
            try {
              const brandRes = await api.get(`/brand/get_active_brand?company_id=${selectedCompany}&category_id=${catId}&subcategory_id=${subId}`);
              if (brandRes.data.status) {
                setCompanyBrands(prev => ({ ...prev, [key]: brandRes.data.data }));
              }
            } catch (e) { console.error("brand prefetch error", e); }
          }
        }
      }
    } catch (err) {
      console.error("Backend validation error", err);
    }
  };

  // Perform complete required field local validation followed by backend API validation
  const validateAllItems = async () => {
    let hasLocalError = false;
    const validatedLocalItems = items.map((item, index) => {
      const errors = [];
      
      if (!item.product_name || !item.product_name.trim()) {
        errors.push("Product name is required");
      }
      // Barcode, Category, Subcategory, Brand are optional fields
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
          subcategory_name: item.subcategory_name,
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
            subcategory_id: val.subcategory_id || item.subcategory_id,
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
      ["Product Name", "Product Code", "Barcode", "Category", "Subcategory", "Brand", "Supplier Price", "Selling Price", "Selling Price Per Unit", "Quantity", "Unit", "GST %"],
      ["Sample Product A", "PRDA01", "1234567890", "Electronics", "Mobiles", "BrandX", "15000", "18000", "per Piece", "10", "Piece", "18"],
      ["Sample Product B", "PRDB02", "", "Groceries", "Snacks", "BrandY", "120", "150", "per Pack", "50", "Pack", "5"]
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

      // Map spreadsheet columns to keys
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
          subcategory_name: String(findVal(["subcategory", "sub category", "subcategory_name"]) || ""),
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
            subcategory_name: item.subcategory_name,
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
              subcategory_id: val.subcategory_id || item.subcategory_id,
              brand_id: val.brand_id || item.brand_id,
              status: val.status,
              errors: val.errors || [],
              warnings: val.warnings || []
            };
          });
          setItems(resolvedItems);

          // Prefetch subcategories for all unique category IDs
          const uniqueCatIds = [...new Set(resolvedItems.map(i => i.category_id).filter(Boolean))];
          for (const catId of uniqueCatIds) {
            if (!companySubcategories[catId]) {
              try {
                const subRes = await api.get(`/subcategory/get_active_subcategory?company_id=${selectedCompany}&category_id=${catId}`);
                if (subRes.data.status) {
                  setCompanySubcategories(prev => ({ ...prev, [catId]: subRes.data.data }));
                }
              } catch (e) { console.error(e); }
            }
          }

          // Prefetch brands for all unique category+subcategory combos
          const uniqueKeys = [...new Set(
            resolvedItems
              .filter(i => i.category_id && i.subcategory_id)
              .map(i => `${i.category_id}-${i.subcategory_id}`)
          )];
          for (const key of uniqueKeys) {
            if (!companyBrands[key]) {
              const [catId, subId] = key.split("-");
              try {
                const brandRes = await api.get(`/brand/get_active_brand?company_id=${selectedCompany}&category_id=${catId}&subcategory_id=${subId}`);
                if (brandRes.data.status) {
                  setCompanyBrands(prev => ({ ...prev, [key]: brandRes.data.data }));
                }
              } catch (e) { console.error(e); }
            }
          }
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
      subcategory_name: "",
      brand_name: "",
      category_id: "",
      subcategory_id: "",
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

  // Handle Category Select
  const handleCategoryChange = async (index, categoryId) => {
    const cat = categories.find(c => Number(c.id) === Number(categoryId));
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      category_id: categoryId,
      category_name: cat ? cat.name : "",
      subcategory_id: "",
      subcategory_name: "",
      brand_id: "",
      brand_name: "",
      status: "pending",
      errors: []
    };
    setItems(updated);

    if (categoryId && !companySubcategories[categoryId]) {
      try {
        const res = await api.get(`/subcategory/get_active_subcategory?company_id=${selectedCompany}&category_id=${categoryId}`);
        if (res.data.status) {
          setCompanySubcategories(prev => ({ ...prev, [categoryId]: res.data.data }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle Subcategory Select
  const handleSubcategoryChange = async (index, subcategoryId) => {
    const categoryId = items[index].category_id;
    const subcats = companySubcategories[categoryId] || [];
    const subcat = subcats.find(s => Number(s.id) === Number(subcategoryId));

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      subcategory_id: subcategoryId,
      subcategory_name: subcat ? subcat.name : "",
      brand_id: "",
      brand_name: "",
      status: "pending",
      errors: []
    };
    setItems(updated);

    const cacheKey = `${categoryId}-${subcategoryId}`;
    if (categoryId && subcategoryId && !companyBrands[cacheKey]) {
      try {
        const res = await api.get(`/brand/get_active_brand?company_id=${selectedCompany}&category_id=${categoryId}&subcategory_id=${subcategoryId}`);
        if (res.data.status) {
          setCompanyBrands(prev => ({ ...prev, [cacheKey]: res.data.data }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Handle Brand Select
  const handleBrandChange = (index, brandId) => {
    const categoryId = items[index].category_id;
    const subcategoryId = items[index].subcategory_id;
    const cacheKey = `${categoryId}-${subcategoryId}`;
    const brandsList = companyBrands[cacheKey] || [];
    const brand = brandsList.find(b => Number(b.id) === Number(brandId));

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      brand_id: brandId,
      brand_name: brand ? brand.name : "",
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
          subcategory_id: p.subcategory_id || "",
          subcategory_name: p.subcategory_name || "",
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

        // Pre-fetch subcategory + brand dropdowns for this product's category/subcategory
        if (p.category_id) {
          if (!companySubcategories[p.category_id]) {
            const subRes = await api.get(`/subcategory/get_active_subcategory?company_id=${selectedCompany}&category_id=${p.category_id}`);
            if (subRes.data.status) {
              setCompanySubcategories(prev => ({ ...prev, [p.category_id]: subRes.data.data }));
            }
          }
          if (p.subcategory_id) {
            const cacheKey = `${p.category_id}-${p.subcategory_id}`;
            if (!companyBrands[cacheKey]) {
              const brandRes = await api.get(`/brand/get_active_brand?company_id=${selectedCompany}&category_id=${p.category_id}&subcategory_id=${p.subcategory_id}`);
              if (brandRes.data.status) {
                setCompanyBrands(prev => ({ ...prev, [cacheKey]: brandRes.data.data }));
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Product code lookup error", err);
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
          subcategory_id: item.subcategory_id,
          subcategory_name: item.subcategory_name,
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
          subcategory_id: item.subcategory_id,
          subcategory_name: item.subcategory_name,
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
    <div style={{ padding: "30px", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .purchase-form-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 25px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .purchase-form-grid {
            grid-template-columns: 1fr;
          }
        }
        .purchase-form-select, .purchase-form-input {
          width: 100%;
          padding: 10px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          background: #ffffff;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .purchase-form-select:focus, .purchase-form-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .purchase-form-select:disabled, .purchase-form-input:disabled {
          background: #f1f5f9;
          color: #64748b;
          cursor: not-allowed;
        }
        .scroll-container::-webkit-scrollbar {
          height: 10px;
          display: block;
        }
        .scroll-container::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 6px;
        }
        .scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 6px;
          border: 2px solid #f8fafc;
        }
        .scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* Floating Success Toast */}
      {toast && (
        <div style={{
          position: "fixed",
          top: 24,
          right: 28,
          zIndex: 99999,
          minWidth: 320,
          maxWidth: 420,
          background: "#10b981",
          color: "#ffffff",
          borderRadius: 8,
          padding: "12px 18px",
          boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
          animation: "fadeIn 0.2s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle2 size={20} color="#ffffff" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>{toast}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{ background: "transparent", border: "none", color: "#ffffff", cursor: "pointer", display: "flex" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "25px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => navigate("/purchases")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              cursor: "pointer",
              color: "#475569"
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0 }}>
              {isLocked ? "View Purchase Bill" : id ? "Edit Draft Purchase" : "New Purchase Invoice"}
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
              {isLocked ? "Submitted purchase invoice detail is locked" : "Upload supplier invoices or add items manually"}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>Loading purchase record...</div>
      ) : (
        <div className="purchase-form-grid">
          {/* Main Workspace (Import & Grid Table) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "25px", minWidth: 0 }}>
            
            {/* Import Controls */}
            {!isLocked && (
              <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0", display: "flex", flexWrap: "wrap", gap: "15px", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Import Invoice Items</h3>
                  <p style={{ fontSize: "13px", color: "#64748b", marginTop: "3px" }}>Upload supplier excel directly to validate and check catalog matches</p>
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={downloadTemplate}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      background: "#f0fdf4",
                      color: "#16a34a",
                      border: "1.5px solid #bbf7d0",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    Template.xlsx
                  </button>
                  <label
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      background: selectedCompany ? "#2563eb" : "#94a3b8",
                      color: "#ffffff",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: selectedCompany ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <UploadCloud size={16} /> Upload Excel
                    {selectedCompany && (
                      <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} style={{ display: "none" }} />
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Validation Correction Grid */}
            <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b", margin: 0 }}>Invoice Items</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <HeaderSettingsButton onClick={openSettings} variant="table" />
                  {!isLocked && (
                    <button
                      onClick={addManualRow}
                      disabled={!selectedCompany}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: selectedCompany ? "#ffffff" : "#f1f5f9",
                        color: selectedCompany ? "#2563eb" : "#94a3b8",
                        border: selectedCompany ? "1.5px solid #dbeafe" : "1.5px solid #e2e8f0",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        cursor: selectedCompany ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Plus size={14} /> Add Row
                    </button>
                  )}
                </div>
              </div>
              <div className="scroll-container" style={{ overflowX: "auto", paddingBottom: "10px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1600px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {isColumnVisible("status") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "40px" }}>Status</th>}
                      {isColumnVisible("product_name") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "150px" }}>Product Name *</th>}
                      {isColumnVisible("product_code") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "100px" }}>Product Code</th>}
                      {isColumnVisible("barcode") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "100px" }}>Barcode <span style={{ fontSize: "10px", fontWeight: "500", color: "#94a3b8" }}>(Opt)</span></th>}
                      {isColumnVisible("category") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "130px" }}>Category <span style={{ fontSize: "10px", fontWeight: "500", color: "#94a3b8" }}>(Opt)</span></th>}
                      {isColumnVisible("subcategory") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "130px" }}>Subcategory <span style={{ fontSize: "10px", fontWeight: "500", color: "#94a3b8" }}>(Opt)</span></th>}
                      {isColumnVisible("brand") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "120px" }}>Brand <span style={{ fontSize: "10px", fontWeight: "500", color: "#94a3b8" }}>(Opt)</span></th>}
                      {isColumnVisible("supplier_price") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "90px" }}>Supplier Price</th>}
                      {isColumnVisible("selling_price") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "90px" }}>Selling Price</th>}
                      {isColumnVisible("selling_price_unit") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "100px" }}>Selling Price Unit</th>}
                      {isColumnVisible("quantity") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "60px" }}>Qty</th>}
                      {isColumnVisible("unit") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "90px" }}>Unit</th>}
                      {isColumnVisible("gst_percentage") && <th style={{ padding: "12px 10px", fontSize: "12px", fontWeight: "700", color: "#64748b", width: "70px" }}>GST %</th>}
                      {!isLocked && <th style={{ padding: "12px 10px", width: "40px" }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={visibleColumnCount || (isLocked ? 13 : 14)} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                          No items added. Select Company first, then Import excel or add manual rows to start.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => {
                        const statusColors = {
                          valid: { bg: "#dcfce7", color: "#15803d" },
                          warning: { bg: "#fef9c3", color: "#854d0e" },
                          error: { bg: "#fee2e2", color: "#b91c1c" },
                          pending: { bg: "#f1f5f9", color: "#475569" }
                        };
                        const statusStyle = statusColors[item.status] || statusColors.pending;

                        const isRowErrored = item.status === "error";

                        return (
                          <tr key={index} style={{
                            borderBottom: "1px solid #f1f5f9",
                            outline: isRowErrored ? "1.5px solid #ef4444" : "none",
                            backgroundColor: isRowErrored ? "#fff5f5" : "inherit"
                          }}>
                            {/* Status */}
                            {isColumnVisible("status") && (
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <div
                                  title={[...(item.errors || []), ...(item.warnings || [])].join("\n")}
                                  style={{
                                    width: "22px",
                                    height: "22px",
                                    borderRadius: "50%",
                                    backgroundColor: statusStyle.bg,
                                    color: statusStyle.color,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: "800",
                                    fontSize: "11px",
                                    cursor: "pointer"
                                  }}
                                >
                                  {item.status === "valid" ? "✓" : item.status === "error" ? "!" : "?"}
                                </div>
                              </td>
                            )}
                            {/* Product Name */}
                            {isColumnVisible("product_name") && (
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="text"
                                  value={item.product_name}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "product_name", e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "6px 8px",
                                    border: isRowErrored && (!item.product_name || !item.product_name.trim())
                                      ? "1.5px solid #ef4444"
                                      : "1px solid #e2e8f0",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    boxSizing: "border-box"
                                  }}
                                />
                              </td>
                            )}
                            {/* Code */}
                            {isColumnVisible("product_code") && (
                              <td style={{ padding: "6px 5px" }}>
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
                                  title="Enter product code and press Enter or Tab to auto-fill product details"
                                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Barcode */}
                            {isColumnVisible("barcode") && (
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="text"
                                  value={item.barcode}
                                  disabled={isLocked}
                                  placeholder="Optional"
                                  onChange={(e) => updateRowField(index, "barcode", e.target.value)}
                                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Category */}
                            {isColumnVisible("category") && (
                              <td style={{ padding: "6px 5px" }}>
                                <select
                                  value={item.category_id || ""}
                                  disabled={isLocked || !selectedCompany}
                                  onChange={(e) => handleCategoryChange(index, e.target.value)}
                                  style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12.5px", background: "#ffffff", boxSizing: "border-box" }}
                                >
                                  <option value="">Select Category (Opt)</option>
                                  {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {/* Subcategory */}
                            {isColumnVisible("subcategory") && (
                              <td style={{ padding: "6px 5px" }}>
                                <select
                                  value={item.subcategory_id || ""}
                                  disabled={isLocked || !item.category_id}
                                  onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                                  style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12.5px", background: "#ffffff", boxSizing: "border-box" }}
                                >
                                  <option value="">Select Subcategory (Opt)</option>
                                  {(companySubcategories[item.category_id] || []).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {/* Brand */}
                            {isColumnVisible("brand") && (
                              <td style={{ padding: "6px 5px" }}>
                                <select
                                  value={item.brand_id || ""}
                                  disabled={isLocked || !item.subcategory_id}
                                  onChange={(e) => handleBrandChange(index, e.target.value)}
                                  style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12.5px", background: "#ffffff", boxSizing: "border-box" }}
                                >
                                  <option value="">Select Brand (Opt)</option>
                                  {(companyBrands[`${item.category_id}-${item.subcategory_id}`] || []).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {/* Price */}
                            {isColumnVisible("supplier_price") && (
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="text"
                                  value={item.price}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "price", e.target.value)}
                                  style={{ width: "100%", padding: "6px 8px", border: isRowErrored && (item.price === undefined || item.price === null || parseFloat(item.price) <= 0) ? "1.5px solid #ef4444" : "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Selling Price */}
                            {isColumnVisible("selling_price") && (
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="text"
                                  value={item.selling_price}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "selling_price", e.target.value)}
                                  style={{ width: "100%", padding: "6px 8px", border: isRowErrored && (item.selling_price === undefined || item.selling_price === null || parseFloat(item.selling_price) <= 0) ? "1.5px solid #ef4444" : "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Selling Price per Unit */}
                            {isColumnVisible("selling_price_unit") && (
                              <td style={{ padding: "6px 5px" }}>
                                <select
                                  value={item.selling_price_per_unit || ""}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "selling_price_per_unit", e.target.value)}
                                  style={{ width: "100%", padding: "6px 4px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12.5px", background: "#ffffff", boxSizing: "border-box" }}
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
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "quantity", parseInt(e.target.value) || 0)}
                                  style={{ width: "100%", padding: "6px 8px", border: isRowErrored && (item.quantity === undefined || item.quantity === null || parseInt(item.quantity) <= 0) ? "1.5px solid #ef4444" : "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Unit */}
                            {isColumnVisible("unit") && (
                              <td style={{ padding: "6px 5px" }}>
                                <select
                                  value={item.unit || ""}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "unit", e.target.value)}
                                  style={{ width: "100%", padding: "6px 4px", border: isRowErrored && (!item.unit || !item.unit.trim()) ? "1.5px solid #ef4444" : "1px solid #e2e8f0", borderRadius: "6px", fontSize: "12.5px", background: "#ffffff", boxSizing: "border-box" }}
                                >
                                  <option value="">Select Unit</option>
                                  {unitOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                            {/* GST */}
                            {isColumnVisible("gst_percentage") && (
                              <td style={{ padding: "6px 5px" }}>
                                <input
                                  type="number"
                                  value={item.gst_percentage}
                                  disabled={isLocked}
                                  onChange={(e) => updateRowField(index, "gst_percentage", parseFloat(e.target.value) || 0)}
                                  style={{ width: "100%", padding: "6px 8px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }}
                                />
                              </td>
                            )}
                            {/* Action delete */}
                            {!isLocked && (
                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <button
                                  onClick={() => deleteRow(index)}
                                  style={{
                                    border: "none",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    padding: "6px",
                                    borderRadius: "6px",
                                    cursor: "pointer"
                                  }}
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
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar Panel (Supplier details & Totals summary) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
            {/* Metadata Card */}
            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.01)" }}>
              <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "15px" }}>Invoice Parameters</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                
                {/* Company Select */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Company *</label>
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
                      setCompanySubcategories({});
                      setCompanyBrands({});
                    }}
                    className="purchase-form-select"
                  >
                    <option value="">Select Company</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.company_name}</option>
                    ))}
                  </select>
                </div>

                {/* Supplier Select */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Supplier *</label>
                  <select
                    value={selectedSupplier}
                    disabled={isLocked || !selectedCompany}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="purchase-form-select"
                  >
                    <option value="">{selectedCompany ? "Select Supplier" : "Select Company First"}</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.supplier_name}</option>
                    ))}
                  </select>
                </div>

                {/* Bill No */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Bill / Invoice No</label>
                  <input
                    type="text"
                    value={purchaseNo}
                    disabled={isLocked}
                    onChange={(e) => setPurchaseNo(e.target.value)}
                    placeholder="Enter Invoice Bill No"
                    className="purchase-form-input"
                  />
                </div>

                {/* Date */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    disabled={isLocked}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="purchase-form-input"
                  />
                </div>
              </div>
            </div>

            {/* Standardized Purchase Summary Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Purchase Summary</span>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  INR Currency
                </span>
              </div>

              {/* Items Count, Subtotal & GST Total */}
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
                        className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-600">Remaining Balance Due</span>
                    <span className={`text-xs ${Math.max(0, grandTotal - paidAmount) > 0 ? "text-rose-600" : "text-emerald-700"}`}>
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

              {/* Action Buttons */}
              {!isLocked ? (
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSubmitPurchase}
                    disabled={saving}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? "Processing..." : "Submit to Inventory"}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="w-full py-2 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs text-center flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} />
                  <span>Bill Submitted to Inventory</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
