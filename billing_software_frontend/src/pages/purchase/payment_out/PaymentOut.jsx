import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  Settings,
  ChevronDown,
  Calendar,
  Search,
  Printer,
  FileSpreadsheet,
  Share2,
  MoreVertical,
  Filter,
  Eye,
  Trash2,
  Edit3,
  AlertTriangle,
  X,
  RefreshCw,
  TrendingUp,
  ArrowUpDown
} from "lucide-react";
import AddPaymentOutModal from "./AddPaymentOutModal";

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

export default function PaymentOut() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Data states
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || "all"
  );
  const [loading, setLoading] = useState(true);

  // Filter states
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [firmOpen, setFirmOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [suppliers, setSuppliers] = useState([]);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search & view toggles
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Modals & toast states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const menuRef = useRef(null);

  // Format Helper: DD/MM/YYYY
  const formatDateDMY = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatYMD = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  // Calculate preset period dates
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
      case "this_week": {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        end = new Date();
        break;
      }
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
      setFromDate(formatYMD(start));
      setToDate(formatYMD(end));
    } else {
      setFromDate("");
      setToDate("");
    }
  }, [period]);

  // Load Companies
  useEffect(() => {
    if (adminId) {
      api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
        .then((res) => {
          if (res.data.status) {
            setCompanies(res.data.data || []);
          }
        })
        .catch(console.error);
    }
  }, [adminId]);

  // Load Suppliers
  useEffect(() => {
    const compParam = selectedCompany !== "all" ? `?company_id=${selectedCompany}` : "";
    api.get(`/supplier/get_all${compParam}`)
      .then((res) => {
        if (res.data.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [selectedCompany, adminId]);

  // Fetch Payment-Out Records
  const fetchPaymentOuts = async () => {
    setLoading(true);
    try {
      const compParam = selectedCompany !== "all" ? `&company_id=${selectedCompany}` : "";
      const dateParam = fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : "";
      const res = await api.get(`/purchase/get_payment_outs?admin_id=${adminId || 0}${compParam}${dateParam}`);
      if (res.data.status) {
        setPayments(res.data.data || []);
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error("Error fetching payment-outs:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentOuts();
  }, [selectedCompany, fromDate, toDate, adminId]);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
      setPeriodOpen(false);
      setFirmOpen(false);
      setSupplierOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Date range filter
      if (fromDate && toDate && item.payment_date) {
        const itemDate = item.payment_date.split("T")[0].split(" ")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedCompany !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedCompany)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all") {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refNo = String(item.receipt_no || item.id || "").toLowerCase();
        const partyName = String(item.supplier_name || "").toLowerCase();
        const paymentType = String(item.payment_method || "").toLowerCase();
        const total = String(item.amount || "");
        if (
          !refNo.includes(q) &&
          !partyName.includes(q) &&
          !paymentType.includes(q) &&
          !total.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [payments, fromDate, toDate, selectedCompany, searchQuery]);

  // Summary Metrics (Total Amount, Paid Amount)
  const metrics = useMemo(() => {
    let total = 0;
    let paid = 0;
    filteredPayments.forEach((p) => {
      const amt = parseFloat(p.amount || 0);
      total += amt;
      paid += amt;
    });
    return { total, paid };
  }, [filteredPayments]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPayments.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredPayments.slice(start, start + rowsPerPage);
  }, [filteredPayments, safePage, rowsPerPage]);

  // Export to Excel
  const exportToExcel = () => {
    if (filteredPayments.length === 0) {
      alert("No payment-out data to export.");
      return;
    }
    const data = filteredPayments.map((p) => ({
      "Date": formatDateDMY(p.payment_date),
      "Ref No.": p.receipt_no || `REC-${p.id}`,
      "Party Name": p.supplier_name || "Unknown Party",
      "Total Amount": parseFloat(p.amount || 0),
      "Paid": parseFloat(p.amount || 0),
      "Payment Type": p.payment_method || "Cash",
      "Status": "Paid",
      "Notes": p.notes || ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment-Out");
    XLSX.writeFile(wb, `Payment_Out_Report_${fromDate || "all"}.xlsx`);
  };

  // Delete Handler
  const handleDeletePayment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment-out record? Purchase invoice balance will be restored.")) {
      return;
    }
    setDeleting(true);
    try {
      const res = await api.post("/purchase/delete_payment_out", { id });
      if (res.data.status) {
        fetchPaymentOuts();
      } else {
        alert(res.data.message || "Failed to delete payment-out.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting payment-out.");
    } finally {
      setDeleting(false);
      setActiveMenuId(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "18px 24px", fontFamily: "Inter, sans-serif" }}>
      
      {/* ── 1. TOP HEADER (Matching Image 1) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        {/* Title with Down Chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.3px" }}>
            Payment-Out
          </h1>
          <ChevronDown size={18} color="#475569" style={{ marginTop: 2 }} />
        </div>

        {/* Right Buttons: + Add Payment-Out (Red) & Settings */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => {
              setEditingPayment(null);
              setIsAddModalOpen(true);
            }}
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
            <Plus size={16} strokeWidth={2.5} /> Add Payment-Out
          </button>

          <button
            title="Settings"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              padding: 4
            }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* ── 2. FILTER BAR (Matching Image 1 Pill Design) ── */}
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
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontWeight: 600, color: "#64748b", marginRight: 2 }}>Filter by :</span>

          {/* 1. Period Pill Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setFirmOpen(false);
                setUserOpen(false);
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
                cursor: "pointer"
              }}
            >
              <span>{periodLabels[period] || "This Month"}</span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: periodOpen ? "rotate(180deg)" : "none" }} />
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
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Date Range Pill */}
          <div
            onClick={() => setShowDatePicker(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "#f0f9ff",
              color: "#1e293b",
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: 24,
              border: "1px solid #bae6fd",
              cursor: "pointer"
            }}
          >
            <Calendar size={14} color="#0284c7" />
            <span>{fromDate ? formatDateDMY(fromDate) : "01/09/2026"} To {toDate ? formatDateDMY(toDate) : "30/09/2026"}</span>
          </div>

          {/* 3. All Firms Pill Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFirmOpen((v) => !v);
                setPeriodOpen(false);
                setUserOpen(false);
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
                cursor: "pointer"
              }}
            >
              <span>
                {selectedCompany === "all"
                  ? "All Firms"
                  : companies.find((c) => String(c.id) === String(selectedCompany))?.company_name || "Firm"}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: firmOpen ? "rotate(180deg)" : "none" }} />
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
                    setSelectedCompany("all");
                    setFirmOpen(false);
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: selectedCompany === "all" ? 700 : 500,
                    color: selectedCompany === "all" ? "#2563eb" : "#334155",
                    background: selectedCompany === "all" ? "#eff6ff" : "transparent",
                    cursor: "pointer"
                  }}
                >
                  All Firms
                </div>
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCompany(c.id);
                      setFirmOpen(false);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: String(selectedCompany) === String(c.id) ? 700 : 500,
                      color: String(selectedCompany) === String(c.id) ? "#2563eb" : "#334155",
                      background: String(selectedCompany) === String(c.id) ? "#eff6ff" : "transparent",
                      cursor: "pointer"
                    }}
                  >
                    {c.company_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. All Suppliers Pill Dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSupplierOpen((v) => !v);
                setPeriodOpen(false);
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
                cursor: "pointer"
              }}
            >
              <span>
                {selectedSupplier === "all"
                  ? "All Suppliers"
                  : suppliers.find((s) => String(s.id) === String(selectedSupplier))?.supplier_name ||
                    suppliers.find((s) => String(s.id) === String(selectedSupplier))?.name ||
                    "Supplier"}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: supplierOpen ? "rotate(180deg)" : "none" }} />
            </button>

            {supplierOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 36,
                  width: 200,
                  background: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0",
                  padding: "6px 0",
                  maxHeight: 250,
                  overflowY: "auto",
                  zIndex: 999
                }}
              >
                <div
                  onClick={() => {
                    setSelectedSupplier("all");
                    setSupplierOpen(false);
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: selectedSupplier === "all" ? 700 : 500,
                    color: selectedSupplier === "all" ? "#2563eb" : "#334155",
                    background: selectedSupplier === "all" ? "#eff6ff" : "transparent",
                    cursor: "pointer"
                  }}
                >
                  All Suppliers
                </div>
                {suppliers.map((s) => {
                  const sName = s.supplier_name || s.name || `Supplier #${s.id}`;
                  const isSelected = String(selectedSupplier) === String(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedSupplier(s.id);
                        setSupplierOpen(false);
                      }}
                      style={{
                        padding: "7px 14px",
                        fontSize: 12.5,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? "#2563eb" : "#334155",
                        background: isSelected ? "#eff6ff" : "transparent",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                      title={sName}
                    >
                      {sName}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Tools: Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={fetchPaymentOuts}
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
            title="Refresh"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── 3. SUMMARY KPI CARD (Matching Image 1 Left Card) ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
        <div
          style={{
            width: 300,
            background: "#ffffff",
            borderRadius: 12,
            padding: "16px 20px",
            border: "1.5px solid #f1f5f9",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            position: "relative"
          }}
        >
          {/* Top Label & % vs last month */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Total Amount</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 2 }}>
              100% <TrendingUp size={12} />
            </span>
          </div>

          {/* Large Amount */}
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            ₹ {fmt(metrics.total)}
          </div>

          {/* Subtitle Paid */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>Paid: ₹ {fmt(metrics.paid)}</span>
            <span style={{ fontSize: 10.5, color: "#94a3b8" }}>vs last month</span>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS TABLE CONTAINER (Matching Image 1) ── */}
      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
        
        {/* Table Title Bar with Search, Excel & Print */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", textTransform: "capitalize" }}>
            Transactions
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Search Input Toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={() => setShowSearchInput(!showSearchInput)}
                title="Search Transactions"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}
              >
                <Search size={18} />
              </button>
              {showSearchInput && (
                <input
                  type="text"
                  placeholder="Search Ref, party, amount..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                    outline: "none",
                    width: 180
                  }}
                  autoFocus
                />
              )}
            </div>

            {/* Excel Report Icon */}
            <button
              onClick={exportToExcel}
              title="Export Excel"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a", display: "flex" }}
            >
              <FileSpreadsheet size={19} />
            </button>

            {/* Print Icon */}
            <button
              onClick={() => window.print()}
              title="Print"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex" }}
            >
              <Printer size={18} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Date <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Ref. no. <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Party Name <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>Total Amount <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569", textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>Paid <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>Payment Type <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>Status <Filter size={11} color="#94a3b8" /></div>
                </th>
                <th style={{ padding: "12px 18px", fontSize: 11.5, fontWeight: 700, color: "#475569", textAlign: "center" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Loading payment-out transactions...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                /* ── Empty State Matching Image 1 ── */
                <tr>
                  <td colSpan={8} style={{ padding: "60px 20px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                      <AlertTriangle size={36} color="#f87171" strokeWidth={1.8} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
                      No Transaction Found
                    </div>
                    <p style={{ fontSize: 12.5, color: "#94a3b8", margin: 0 }}>
                      We could not find any transactions.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                    >
                      {/* Date */}
                      <td style={{ padding: "12px 18px", fontSize: 13, color: "#334155", fontWeight: 600 }}>
                        {formatDateDMY(p.payment_date)}
                      </td>

                      {/* Ref No */}
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {p.receipt_no || `REC-${p.id}`}
                      </td>

                      {/* Party Name */}
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#2563eb" }}>
                        {p.supplier_name || "Unknown Party"}
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#0f172a", textAlign: "right" }}>
                        ₹ {fmt(p.amount)}
                      </td>

                      {/* Paid */}
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: "#059669", textAlign: "right" }}>
                        ₹ {fmt(p.amount)}
                      </td>

                      {/* Payment Type */}
                      <td style={{ padding: "12px 18px", fontSize: 13, color: "#475569", textTransform: "capitalize" }}>
                        {p.payment_method || "Cash"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 18px", textAlign: "center" }}>
                        <span style={{ fontSize: 11.5, fontWeight: 800, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: 12 }}>
                          Paid
                        </span>
                      </td>

                      {/* Actions Column with 3-Dots */}
                      <td style={{ padding: "12px 18px", textAlign: "center", position: "relative" }}>
                        <div style={{ display: "inline-block", position: "relative" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === p.id ? null : p.id);
                            }}
                            title="Actions"
                            style={{
                              background: activeMenuId === p.id ? "#f1f5f9" : "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "#475569",
                              padding: "4px 6px",
                              borderRadius: 6,
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* 3-dots Floating Dropdown Menu */}
                          {activeMenuId === p.id && (
                            <div
                              ref={menuRef}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "absolute",
                                right: 0,
                                top: 28,
                                background: "#ffffff",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                                zIndex: 999,
                                width: 125,
                                overflow: "hidden",
                                padding: "4px 0",
                                textAlign: "left"
                              }}
                            >
                              {/* Edit Option */}
                              <div
                                onClick={() => {
                                  setEditingPayment(p);
                                  setIsAddModalOpen(true);
                                  setActiveMenuId(null);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 14px",
                                  fontSize: 13,
                                  color: "#1e293b",
                                  cursor: "pointer",
                                  fontWeight: 600
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                              >
                                <Edit3 size={15} color="#2563eb" />
                                <span>Edit</span>
                              </div>

                              {/* Delete Option */}
                              <div
                                onClick={() => handleDeletePayment(p.id)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  padding: "8px 14px",
                                  fontSize: 13,
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  borderTop: "1px solid #f1f5f9"
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                              >
                                <Trash2 size={15} color="#ef4444" />
                                <span>Delete</span>
                              </div>
                            </div>
                          )}
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

      {/* ── 5. ADD / EDIT PAYMENT-OUT MODAL ── */}
      <AddPaymentOutModal
        isOpen={isAddModalOpen}
        editPayment={editingPayment}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPayment(null);
        }}
        onSuccess={fetchPaymentOuts}
      />

    </div>
  );
}
