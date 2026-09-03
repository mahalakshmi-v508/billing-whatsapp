import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  FileSpreadsheet,
  Printer,
  Search,
  Plus,
  MoreVertical,
  Share2,
  Eye,
  Pencil,
  Trash2,
  CreditCard,
  History,
  Wallet,
  Calendar,
  ChevronDown,
  Upload,
  ArrowUpDown,
  X,
  FileText,
  RefreshCw
} from "lucide-react";
import * as XLSX from "xlsx";

const periodLabels = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This Week",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all_time: "All Time",
  custom: "Custom",
};

export default function PurchaseList() {
  const navigate = useNavigate();

  // State
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySupplier, setSelectedHistorySupplier] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [bulkSupplier, setBulkSupplier] = useState(null);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMethod, setBulkMethod] = useState("cash");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkNotes, setBulkNotes] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);

  // Date Formatting Helper
  const formatYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Compute period dates
  useEffect(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "yesterday":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        break;
      case "this_week":
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      case "this_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "this_year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "all_time":
        start = null;
        end = null;
        break;
      default:
        return;
    }

    if (start && end) {
      setStartDate(formatYMD(start));
      setEndDate(formatYMD(end));
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [period]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutside = () => {
      setActiveMenuId(null);
      setPeriodOpen(false);
      setFirmOpen(false);
    };
    window.addEventListener("click", handleOutside);
    return () => window.removeEventListener("click", handleOutside);
  }, []);

  // Initial Companies Load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            setSelectedCompany(savedId);
            setSelectedFirm(savedId);
            fetchPurchasesAndSuppliers(savedId);
          } else if (res.data.data.length > 0) {
            setSelectedFirm("all");
            fetchPurchasesAndSuppliers("all", res.data.data);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch Purchases (supports 'all' companies or specific company)
  const fetchPurchasesAndSuppliers = async (firmId = selectedFirm, companyList = companies) => {
    setLoading(true);
    try {
      let companyIds = [];
      if (firmId === "all" || firmId === "ALL") {
        companyIds = (companyList.length > 0 ? companyList : companies).map((c) => c.id);
      } else {
        companyIds = [Number(firmId)];
      }

      if (companyIds.length === 0 && (companyList.length > 0 || companies.length > 0)) {
        companyIds = (companyList.length > 0 ? companyList : companies).map((c) => c.id);
      }

      if (companyIds.length > 0) {
        const purchaseRequests = companyIds.map((cid) =>
          api.get(`/purchase/get_purchases?company_id=${cid}`)
        );
        const supplierRequests = companyIds.map((cid) =>
          api.get(`/supplier/get_all?company_id=${cid}`)
        );

        const [pResponses, sResponses] = await Promise.all([
          Promise.all(purchaseRequests),
          Promise.all(supplierRequests)
        ]);

        let allPurchases = [];
        pResponses.forEach((res) => {
          if (res.data.status && Array.isArray(res.data.data)) {
            allPurchases = [...allPurchases, ...res.data.data];
          }
        });

        let allSuppliers = [];
        sResponses.forEach((res) => {
          if (res.data.status && Array.isArray(res.data.data)) {
            allSuppliers = [...allSuppliers, ...res.data.data];
          }
        });

        // Deduplicate
        const uniquePurchases = Array.from(new Map(allPurchases.map((p) => [p.id, p])).values());
        uniquePurchases.sort(
          (a, b) => new Date(b.purchase_date || b.created_at) - new Date(a.purchase_date || a.created_at)
        );

        const uniqueSuppliers = Array.from(new Map(allSuppliers.map((s) => [s.id, s])).values());

        setPurchases(uniquePurchases);
        setSuppliers(uniqueSuppliers);
      } else {
        setPurchases([]);
        setSuppliers([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFirmChange = (firmId) => {
    setSelectedFirm(firmId);
    if (firmId !== "all" && firmId !== "ALL") {
      setSelectedCompany(firmId);
      localStorage.setItem("selected_company_id", firmId);
    }
    fetchPurchasesAndSuppliers(firmId);
  };

  // Filtered Purchases by Date & Search
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      // Date filter
      if (startDate && p.purchase_date < startDate) return false;
      if (endDate && p.purchase_date > endDate) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const no = (p.purchase_no || "").toLowerCase();
        const party = (p.supplier_name || "").toLowerCase();
        const type = (p.payment_type || "").toLowerCase();
        if (!no.includes(q) && !party.includes(q) && !type.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [purchases, startDate, endDate, searchQuery]);

  // Math summary bar metrics (Paid + Unpaid = Total)
  const { totalPaid, totalUnpaid, grandTotal } = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let total = 0;
    filteredPurchases.forEach((p) => {
      const pTotal = Number(p.total_amount) || 0;
      const pPaid = Number(p.paid_amount) || 0;
      const pBal = Number(p.balance_amount) || 0;
      paid += pPaid;
      unpaid += pBal;
      total += pTotal;
    });
    return { totalPaid: paid, totalUnpaid: unpaid, grandTotal: total };
  }, [filteredPurchases]);

  // Delete draft
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase draft?")) return;
    try {
      const res = await api.post(`/purchase/delete_purchase`, { id });
      if (res.data.status) {
        alert("Purchase draft deleted successfully");
        fetchPurchasesAndSuppliers(selectedFirm);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting purchase");
    }
  };

  // Payment dialog
  const openPayModal = (purchase) => {
    setPaymentPurchase(purchase);
    setPayAmount(Number(purchase.balance_amount));
    setPayMethod("cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNotes("");
    setShowPayModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (payAmount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    if (payAmount > Number(paymentPurchase.balance_amount)) {
      alert(`Payment amount cannot exceed pending balance of ₹${paymentPurchase.balance_amount}`);
      return;
    }
    setSubmittingPayment(true);
    try {
      const res = await api.post("/purchase/pay_purchase", {
        purchase_id: paymentPurchase.id,
        amount: payAmount,
        payment_method: payMethod,
        payment_date: payDate,
        notes: payNotes
      });
      if (res.data.status) {
        alert(res.data.message);
        setShowPayModal(false);
        fetchPurchasesAndSuppliers(selectedFirm);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Supplier History Ledger Modal
  const openSupplierHistoryModal = async (supplierId, supplierName) => {
    setSelectedHistorySupplier({ id: supplierId, name: supplierName });
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/purchase/get_supplier_payments?supplier_id=${supplierId}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Bulk Supplier Payment (FIFO settle across all supplier bills)
  const openBulkPayDialog = (supplier) => {
    setBulkSupplier(supplier);
    setBulkAmount("");
    setBulkMethod("cash");
    setBulkDate(new Date().toISOString().split("T")[0]);
    setBulkNotes("");
    setBulkPreview([]);
    setShowBulkPayModal(true);
  };

  const handleBulkAmountChange = (amt) => {
    setBulkAmount(amt);
    const numAmt = Number(amt) || 0;
    if (!bulkSupplier || numAmt <= 0) {
      setBulkPreview([]);
      return;
    }

    const unpaidInvoices = purchases
      .filter((p) => p.supplier_id === bulkSupplier.id && Number(p.balance_amount) > 0 && p.status === "submitted")
      .sort((a, b) => new Date(a.purchase_date) - new Date(b.purchase_date));

    let remaining = numAmt;
    const preview = [];

    for (const inv of unpaidInvoices) {
      if (remaining <= 0) break;
      const bal = Number(inv.balance_amount);
      const apply = Math.min(bal, remaining);
      preview.push({
        id: inv.id,
        purchase_no: inv.purchase_no || `#${inv.id}`,
        purchase_date: inv.purchase_date,
        total_amount: inv.total_amount,
        balance_amount: bal,
        allocated_amount: apply,
        new_balance: bal - apply
      });
      remaining -= apply;
    }

    setBulkPreview(preview);
  };

  const submitBulkPayment = async (e) => {
    e.preventDefault();
    const numAmt = Number(bulkAmount) || 0;
    if (numAmt <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    setSubmittingBulk(true);
    try {
      const res = await api.post("/purchase/pay_supplier_bulk", {
        company_id: selectedCompany,
        supplier_id: bulkSupplier.id,
        amount: numAmt,
        payment_method: bulkMethod,
        payment_date: bulkDate,
        notes: bulkNotes
      });
      if (res.data.status) {
        alert(res.data.message);
        setShowBulkPayModal(false);
        fetchPurchasesAndSuppliers(selectedFirm);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error making bulk payment");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Helper number format
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Excel Export
  const exportToExcel = () => {
    if (filteredPurchases.length === 0) {
      alert("No data to export");
      return;
    }

    const data = filteredPurchases.map((p, idx) => ({
      "Sl No": idx + 1,
      "Date": formatDateDMY(p.purchase_date),
      "Invoice No": p.purchase_no || "N/A",
      "Party Name": p.supplier_name || "Unknown",
      "Payment Type": p.payment_type || "Cash",
      "Sub Total (₹)": Number(p.sub_total || 0),
      "GST Total (₹)": Number(p.gst_total || 0),
      "Total Amount (₹)": Number(p.total_amount || 0),
      "Paid Amount (₹)": Number(p.paid_amount || 0),
      "Balance Due (₹)": Number(p.balance_amount || 0),
      "Status": Number(p.balance_amount) <= 0 ? "Paid" : Number(p.paid_amount) > 0 ? "Partial" : "Unpaid"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase Bills");
    XLSX.writeFile(workbook, `Purchase_Bills_${startDate || "All"}_${endDate || "All"}.xlsx`);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "18px 24px", fontFamily: "Inter, sans-serif" }}>
      
      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.3px" }}>
          Purchase Bills
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* + Add Purchase (Primary Red Button) */}
          <button
            onClick={() => navigate("/purchases/new")}
            style={{
              background: "#ef4444",
              border: "none",
              color: "#ffffff",
              borderRadius: 24,
              padding: "9px 20px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)"
            }}
          >
            <Plus size={16} strokeWidth={2.5} /> Add Purchase
          </button>
        </div>
      </div>

      {/* ── FILTER & ACTION BAR (Matches Reference Pill Design) ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: "10px 18px",
          border: "1px solid #e2e8f0",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        {/* Left: Filter by label + Period Pill + Date Range Pill + Company Dropdown Pill */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: "#64748b", marginRight: 2 }}>Filter by :</span>

          {/* 1. Period Pill Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setFirmOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "#f0f9ff",
                color: "#1e293b",
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 24,
                border: "1px solid #bae6fd",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <span>{periodLabels[period] || "This Month"}</span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: periodOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {periodOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 36,
                  width: 150,
                  background: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0",
                  padding: "6px 0",
                  zIndex: 999
                }}
              >
                {Object.entries(periodLabels).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setPeriod(key);
                      setPeriodOpen(false);
                      if (key === "custom") setShowDatePicker(true);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: period === key ? 700 : 500,
                      color: period === key ? "#2563eb" : "#334155",
                      background: period === key ? "#eff6ff" : "transparent",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = period === key ? "#eff6ff" : "transparent")}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Date Range Pill Display */}
          <div
            onClick={() => setShowDatePicker((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "#f0f9ff",
              color: "#1e293b",
              fontWeight: 500,
              fontSize: 12.5,
              borderRadius: 24,
              border: "1px solid #bae6fd",
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            <Calendar size={14} style={{ color: "#64748b" }} />
            <span>
              {startDate ? formatDateDMY(startDate) : "01/09/2026"} To {endDate ? formatDateDMY(endDate) : "30/09/2026"}
            </span>
          </div>

          {/* Custom Date Picker Popover */}
          {showDatePicker && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#ffffff",
                padding: "4px 12px",
                borderRadius: 24,
                border: "1px solid #cbd5e1",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                fontSize: 12
              }}
            >
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPeriod("custom");
                }}
                style={{ fontSize: 12, color: "#334155", border: "none", outline: "none", cursor: "pointer" }}
              />
              <span style={{ color: "#94a3b8" }}>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPeriod("custom");
                }}
                style={{ fontSize: 12, color: "#334155", border: "none", outline: "none", cursor: "pointer" }}
              />
            </div>
          )}

          {/* 3. Company / Firm Dropdown Pill */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFirmOpen((v) => !v);
                setPeriodOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                background: "#f0f9ff",
                color: "#1e293b",
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 24,
                border: "1px solid #bae6fd",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <span>
                {selectedFirm === "all" || selectedFirm === "ALL"
                  ? "All company"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Company"}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: firmOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
            </button>

            {firmOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 36,
                  width: 180,
                  background: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0",
                  padding: "6px 0",
                  maxHeight: 220,
                  overflowY: "auto",
                  zIndex: 999
                }}
              >
                <div
                  onClick={() => {
                    handleFirmChange("all");
                    setFirmOpen(false);
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: selectedFirm === "all" || selectedFirm === "ALL" ? 700 : 500,
                    color: selectedFirm === "all" || selectedFirm === "ALL" ? "#2563eb" : "#334155",
                    background: selectedFirm === "all" || selectedFirm === "ALL" ? "#eff6ff" : "transparent",
                    cursor: "pointer"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      selectedFirm === "all" || selectedFirm === "ALL" ? "#eff6ff" : "transparent")
                  }
                >
                  All company
                </div>
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      handleFirmChange(c.id);
                      setFirmOpen(false);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: String(selectedFirm) === String(c.id) ? 700 : 500,
                      color: String(selectedFirm) === String(c.id) ? "#2563eb" : "#334155",
                      background: String(selectedFirm) === String(c.id) ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        String(selectedFirm) === String(c.id) ? "#eff6ff" : "transparent")
                    }
                  >
                    {c.company_name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Export Excel, Print, Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Excel Report */}
          <button
            onClick={exportToExcel}
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <FileSpreadsheet size={15} /> Excel Report
          </button>

          {/* Print */}
          <button
            onClick={() => window.print()}
            style={{
              background: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Printer size={15} /> Print
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchPurchasesAndSuppliers(selectedFirm)}
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              cursor: "pointer"
            }}
            title="Refresh purchases"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── VYAPAR MATH SUMMARY BAR: Paid + Unpaid = Total ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        
        {/* Paid Card */}
        <div
          style={{
            flex: 1,
            minWidth: 160,
            background: "#ecfdf5",
            borderRadius: 14,
            padding: "14px 18px",
            border: "1.5px solid #a7f3d0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", marginBottom: 4 }}>Paid</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#047857" }}>₹ {fmt(totalPaid)}</div>
        </div>

        {/* Plus Operator */}
        <div style={{ fontSize: 20, fontWeight: 800, color: "#94a3b8" }}>+</div>

        {/* Unpaid Card */}
        <div
          style={{
            flex: 1,
            minWidth: 160,
            background: "#eff6ff",
            borderRadius: 14,
            padding: "14px 18px",
            border: "1.5px solid #bfdbfe",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>Unpaid</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#1d4ed8" }}>₹ {fmt(totalUnpaid)}</div>
        </div>

        {/* Equal Operator */}
        <div style={{ fontSize: 20, fontWeight: 800, color: "#94a3b8" }}>=</div>

        {/* Total Card */}
        <div
          style={{
            flex: 1,
            minWidth: 160,
            background: "#fff7ed",
            borderRadius: 14,
            padding: "14px 18px",
            border: "1.5px solid #fed7aa",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9a3412", marginBottom: 4 }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#c2410c" }}>₹ {fmt(grandTotal)}</div>
        </div>
      </div>

      {/* ── TRANSACTIONS TABLE CONTAINER ── */}
      <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", paddingBottom: 60, position: "relative" }}>
        
        {/* Table Title & Search */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
            TRANSACTIONS
          </div>
          <div style={{ position: "relative", maxWidth: 300 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search bills, party name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                outline: "none",
                fontSize: 13,
                boxSizing: "border-box"
              }}
            />
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    DATE <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    INVOICE NO. <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    PARTY NAME <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    PAYMENT TYPE <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                    AMOUNT <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                    BALANCE DUE <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    STATUS <ArrowUpDown size={11} />
                  </div>
                </th>
                <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", textAlign: "center" }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading purchase transactions...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 50, textAlign: "center" }}>
                    <div style={{ fontSize: 42, marginBottom: 8 }}>📄</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#334155" }}>No transactions found</div>
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 14px" }}>
                      There are no purchase invoices matching your selected filters.
                    </p>
                    <button
                      onClick={() => navigate("/purchases/new")}
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      + Create Purchase Bill
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => {
                  const balance = Number(p.balance_amount) || 0;
                  const paid = Number(p.paid_amount) || 0;
                  const isPaid = balance <= 0;
                  const isPartial = balance > 0 && paid > 0;
                  const isDraft = p.status === "draft";

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                        background: activeMenuId === p.id ? "#f8fafc" : "#ffffff"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = activeMenuId === p.id ? "#f8fafc" : "#ffffff")}
                    >
                      {/* DATE */}
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#334155", fontWeight: 600 }}>
                        {formatDateDMY(p.purchase_date)}
                      </td>

                      {/* INVOICE NO. */}
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {p.purchase_no || <span style={{ color: "#94a3b8", fontWeight: 400 }}>-</span>}
                      </td>

                      {/* PARTY NAME */}
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#2563eb" }}>
                        <span
                          onClick={() => openSupplierHistoryModal(p.supplier_id, p.supplier_name)}
                          title="Click to view supplier ledger"
                          style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                        >
                          {p.supplier_name || "Unknown Party"}
                        </span>
                      </td>

                      {/* PAYMENT TYPE */}
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#475569" }}>
                        {p.payment_type || "Cash"}
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                        {fmt(p.total_amount)}
                      </td>

                      {/* BALANCE DUE */}
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, textAlign: "right", color: balance > 0 ? "#dc2626" : "#16a34a" }}>
                        {fmt(balance)}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {isDraft ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: 12 }}>
                            Draft
                          </span>
                        ) : isPaid ? (
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#16a34a" }}>
                            Paid
                          </span>
                        ) : isPartial ? (
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#d97706" }}>
                            Partial
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#ef4444" }}>
                            Unpaid
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          {/* Print Icon */}
                          <button
                            onClick={() => window.print()}
                            title="Print Invoice Voucher"
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                          >
                            <Printer size={15} />
                          </button>

                          {/* Share / WhatsApp */}
                          <button
                            onClick={() => alert(`Share Voucher for Invoice ${p.purchase_no || p.id} via WhatsApp/PDF`)}
                            title="Share via WhatsApp / Email"
                            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
                          >
                            <Share2 size={15} />
                          </button>

                          {/* 3-Dots Context Menu */}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(activeMenuId === p.id ? null : p.id);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "#64748b",
                                padding: 3,
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              <MoreVertical size={16} />
                            </button>

                            {activeMenuId === p.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: 26,
                                  background: "#ffffff",
                                  borderRadius: 10,
                                  boxShadow: "0 12px 30px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.08)",
                                  border: "1.5px solid #cbd5e1",
                                  padding: 6,
                                  width: 175,
                                  zIndex: 9999,
                                  textAlign: "left"
                                }}
                              >
                                <div
                                  onClick={() => navigate(`/purchases/edit/${p.id}`)}
                                  style={{
                                    padding: "7px 10px",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: "#334155",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <Eye size={13} color="#2563eb" /> View / Edit
                                </div>

                                {p.status === "submitted" && Number(p.balance_amount) > 0 && (
                                  <div
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      openPayModal(p);
                                    }}
                                    style={{
                                      padding: "7px 10px",
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      color: "#334155",
                                      cursor: "pointer",
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <CreditCard size={13} color="#16a34a" /> Record Payment
                                  </div>
                                )}

                                <div
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openSupplierHistoryModal(p.supplier_id, p.supplier_name);
                                  }}
                                  style={{
                                    padding: "7px 10px",
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    color: "#334155",
                                    cursor: "pointer",
                                    borderRadius: 6,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                >
                                  <History size={13} color="#6366f1" /> Payment History
                                </div>

                                {p.status === "draft" && (
                                  <div
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      handleDelete(p.id);
                                    }}
                                    style={{
                                      padding: "7px 10px",
                                      fontSize: 12.5,
                                      fontWeight: 600,
                                      color: "#ef4444",
                                      cursor: "pointer",
                                      borderRadius: 6,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                  >
                                    <Trash2 size={13} color="#ef4444" /> Delete Draft
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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

      {/* ── MODAL: RECORD SINGLE INVOICE PAYMENT ── */}
      {showPayModal && paymentPurchase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setShowPayModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 440,
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>Record Supplier Payment</h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 10, marginBottom: 16, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Party: <b style={{ color: "#0f172a" }}>{paymentPurchase.supplier_name}</b>
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Bill No: <b style={{ color: "#0f172a" }}>{paymentPurchase.purchase_no || `#${paymentPurchase.id}`}</b>
              </div>
              <div style={{ fontSize: 13, color: "#dc2626", fontWeight: 700, marginTop: 4 }}>
                Pending Balance: ₹{fmt(paymentPurchase.balance_amount)}
              </div>
            </div>

            <form onSubmit={submitPayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Paying Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={Number(paymentPurchase.balance_amount)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 14, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 13, fontWeight: 600, outline: "none" }}
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online / Netbanking</option>
                  <option value="upi">UPI (GPay / PhonePe)</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
                  Notes / Reference No.
                </label>
                <input
                  type="text"
                  placeholder="Optional reference / remarks"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#16a34a", color: "#ffffff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  {submittingPayment ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: SUPPLIER PAYMENT HISTORY / LEDGER ── */}
      {showHistoryModal && selectedHistorySupplier && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 620,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              padding: 24,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0 }}>Payment Ledger History</h3>
                <p style={{ fontSize: 12.5, color: "#64748b", margin: "2px 0 0" }}>Supplier: <b>{selectedHistorySupplier.name}</b></p>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {loadingHistory ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading payment records...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No payment transactions recorded for this supplier.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Invoice #</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Method</th>
                      <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount</th>
                      <th style={{ padding: "8px 12px", textAlign: "left" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((h) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 12px", color: "#334155" }}>{formatDateDMY(h.payment_date)}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>{h.purchase_no || `#${h.purchase_id}`}</td>
                        <td style={{ padding: "10px 12px", textTransform: "uppercase", fontSize: 11, fontWeight: 700, color: "#475569" }}>{h.payment_method}</td>
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>₹{fmt(h.amount)}</td>
                        <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 11.5 }}>{h.notes || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => setShowHistoryModal(false)}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
