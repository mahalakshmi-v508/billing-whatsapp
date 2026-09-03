import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Search,
  Printer,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  FileText,
  MoreVertical,
  Pencil,
  Settings,
  TrendingUp,
  Edit3
} from "lucide-react";

export default function DebitNoteList() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Data states
  const [debitNotes, setDebitNotes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states (Pill dropdowns like Payment-Out)
  const [period, setPeriod] = useState("this_month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [firmOpen, setFirmOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [paymentFilterOpen, setPaymentFilterOpen] = useState(false);

  // Date range
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Search & view toggles (Header icons like Payment-Out)
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const periodLabels = {
    all_time: "All Time",
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This Week",
    this_month: "This Month",
    this_quarter: "This Quarter",
    this_year: "This Year",
    custom: "Custom"
  };

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

  // Preset Date Helper
  const setPresetDates = (type) => {
    if (type === "all_time" || type === "all") {
      setFromDate("");
      setToDate("");
      setPeriod("all_time");
      return;
    }

    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === "today") {
      from = now;
      to = now;
    } else if (type === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      from = y;
      to = y;
    } else if (type === "this_week") {
      const day = now.getDay() || 7;
      from.setDate(now.getDate() - day + 1);
      to = new Date();
    } else if (type === "this_month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === "this_quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), qMonth, 1);
      to = new Date(now.getFullYear(), qMonth + 3, 0);
    } else if (type === "this_year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }

    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    setFromDate(fmt(from));
    setToDate(fmt(to));
  };

  useEffect(() => {
    setPresetDates("this_month");
  }, []);

  // Fetch Companies
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

  // Fetch Suppliers
  useEffect(() => {
    const compParam = selectedFirm !== "all" ? `?company_id=${selectedFirm}` : "";
    api.get(`/supplier/get_all${compParam}`)
      .then((res) => {
        if (res.data.status) {
          setSuppliers(res.data.data || []);
        }
      })
      .catch(console.error);
  }, [selectedFirm, adminId]);

  // Fetch Debit Notes
  const fetchDebitNotes = async () => {
    setLoading(true);
    try {
      const compParam = selectedFirm !== "all" ? `&company_id=${selectedFirm}` : "";
      const supParam = selectedSupplier !== "all" ? `&supplier_id=${selectedSupplier}` : "";
      const dateParam = fromDate && toDate ? `&from_date=${fromDate}&to_date=${toDate}` : "";
      const res = await api.get(`/debit_note/list?admin_id=${adminId || 0}${compParam}${supParam}${dateParam}`);
      if (res.data.status) {
        setDebitNotes(res.data.data || []);
      } else {
        setDebitNotes([]);
      }
    } catch (err) {
      console.error("Error fetching debit notes:", err);
      setDebitNotes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebitNotes();
  }, [selectedFirm, selectedSupplier, fromDate, toDate, adminId]);

  // Close menus on outside click safely
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (e.target.closest("[data-dropdown-container]")) {
        return;
      }
      setActiveMenuId(null);
      setPeriodOpen(false);
      setFirmOpen(false);
      setSupplierOpen(false);
      setPaymentFilterOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Filtered List
  const filteredDebitNotes = useMemo(() => {
    return debitNotes.filter((item) => {
      // Date filter
      if (fromDate && toDate && item.return_date) {
        const itemDate = item.return_date.split("T")[0];
        if (itemDate < fromDate || itemDate > toDate) return false;
      }

      // Firm filter
      if (selectedFirm !== "all" && item.company_id) {
        if (String(item.company_id) !== String(selectedFirm)) return false;
      }

      // Supplier filter
      if (selectedSupplier !== "all" && item.supplier_id) {
        if (String(item.supplier_id) !== String(selectedSupplier)) return false;
      }

      // Payment Type filter
      if (paymentFilter !== "all") {
        if (String(item.payment_type).toLowerCase() !== paymentFilter.toLowerCase()) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const retNo = String(item.return_no || "").toLowerCase();
        const billNo = String(item.bill_no || "").toLowerCase();
        const supName = String(item.supplier_name || "").toLowerCase();
        const supPhone = String(item.supplier_phone || "").toLowerCase();
        const total = String(item.total_amount || "");
        if (
          !retNo.includes(q) &&
          !billNo.includes(q) &&
          !supName.includes(q) &&
          !supPhone.includes(q) &&
          !total.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [debitNotes, fromDate, toDate, selectedFirm, selectedSupplier, paymentFilter, searchQuery]);

  // Totals KPI
  const { totalAmount, totalBalance, totalRefund } = useMemo(() => {
    let totAmt = 0;
    let totBal = 0;
    let totRef = 0;
    filteredDebitNotes.forEach((item) => {
      totAmt += Number(item.total_amount || 0);
      totBal += Number(item.balance_amount || 0);
      totRef += Number(item.refund_amount || 0);
    });
    return {
      totalAmount: totAmt,
      totalBalance: totBal,
      totalRefund: totRef
    };
  }, [filteredDebitNotes]);

  // Paginated List
  const totalPages = Math.ceil(filteredDebitNotes.length / rowsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredDebitNotes.slice(start, start + rowsPerPage);
  }, [filteredDebitNotes, currentPage, rowsPerPage]);

  // Delete Debit Note
  const confirmDeleteDebitNote = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api.post("/debit_note/delete", { id: deleteTarget.id });
      if (res.data.status) {
        setActionToast({ type: "success", text: "Debit Note deleted and stock restored successfully!" });
        setDeleteTarget(null);
        fetchDebitNotes();
      } else {
        alert(res.data.message || "Failed to delete Debit Note.");
      }
    } catch (err) {
      console.error("Error deleting debit note:", err);
      alert("Failed to delete Debit Note.");
    } finally {
      setDeleting(false);
      setTimeout(() => setActionToast(null), 3000);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredDebitNotes.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = filteredDebitNotes.map((item, idx) => ({
      "S.No": idx + 1,
      "Return Date": formatDateDMY(item.return_date),
      "Return No": `#${item.return_no || item.id}`,
      "Bill No": item.bill_no || "-",
      "Supplier Name": item.supplier_name || "-",
      "Phone": item.supplier_phone || "-",
      "Payment Type": item.payment_type || "Cash",
      "Total Amount": item.total_amount || 0,
      "Refund Amount": item.refund_amount || 0,
      "Balance Due": item.balance_amount || 0,
      "Status": Number(item.balance_amount || 0) <= 0 ? "Paid" : "Unpaid",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DebitNotes");
    XLSX.writeFile(wb, `Purchase_Return_Report_${fromDate || "all"}.xlsx`);
  };

  const fmtCurrency = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "18px 24px", fontFamily: "Inter, sans-serif" }}>
      
      {/* ── 1. TOP HEADER (Matching Payment-Out Page) ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        
        {/* Title with Down Chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0, letterSpacing: "-0.3px" }}>
            Purchase Return / Debit Note
          </h1>
         
        </div>

        {/* Right Button: + Add Debit Note & Settings */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            onClick={() => navigate("/purchases/debit-note/add")}
            style={{
              background: "#1d72fe",
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
              boxShadow: "0 2px 8px rgba(29, 114, 254, 0.25)"
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add Debit Note</span>
          </button>

          
        </div>

      </div>

      {/* ── 2. FILTER BAR (Exact Matching media_1788344681856.png Pill Badges) ── */}
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
          <div data-dropdown-container style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPeriodOpen((v) => !v);
                setFirmOpen(false);
                setSupplierOpen(false);
                setPaymentFilterOpen(false);
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
                  zIndex: 9999
                }}
              >
                {Object.entries(periodLabels).map(([key, label]) => (
                  <div
                    key={key}
                    onClick={() => {
                      setPeriod(key);
                      setPeriodOpen(false);
                      if (key === "custom") {
                        setShowDatePickerModal(true);
                      } else {
                        setPresetDates(key);
                      }
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
            onClick={() => setShowDatePickerModal(true)}
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
            <span>{fromDate && toDate ? `${formatDateDMY(fromDate)} To ${formatDateDMY(toDate)}` : "All Time"}</span>
          </div>

          {/* 3. All Firms Pill Dropdown */}
          <div data-dropdown-container style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFirmOpen((v) => !v);
                setPeriodOpen(false);
                setSupplierOpen(false);
                setPaymentFilterOpen(false);
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
                {selectedFirm === "all"
                  ? "All Company"
                  : companies.find((c) => String(c.id) === String(selectedFirm))?.company_name || "Firm"}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: firmOpen ? "rotate(180deg)" : "none" }} />
            </button>

            {firmOpen && (
              <div
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
                  zIndex: 9999
                }}
              >
                <div
                  onClick={() => {
                    setSelectedFirm("all");
                    setFirmOpen(false);
                  }}
                  style={{
                    padding: "7px 14px",
                    fontSize: 12.5,
                    fontWeight: selectedFirm === "all" ? 700 : 500,
                    color: selectedFirm === "all" ? "#2563eb" : "#334155",
                    background: selectedFirm === "all" ? "#eff6ff" : "transparent",
                    cursor: "pointer"
                  }}
                >
                  All company
                </div>
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedFirm(c.id);
                      setFirmOpen(false);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: String(selectedFirm) === String(c.id) ? 700 : 500,
                      color: String(selectedFirm) === String(c.id) ? "#2563eb" : "#334155",
                      background: String(selectedFirm) === String(c.id) ? "#eff6ff" : "transparent",
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
          <div data-dropdown-container style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSupplierOpen((v) => !v);
                setPeriodOpen(false);
                setFirmOpen(false);
                setPaymentFilterOpen(false);
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
                style={{
                  position: "absolute",
                  left: 0,
                  top: 36,
                  width: 210,
                  background: "#ffffff",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  border: "1px solid #e2e8f0",
                  padding: "6px 0",
                  maxHeight: 250,
                  overflowY: "auto",
                  zIndex: 9999
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

          {/* 5. All Payment Pill Dropdown */}
          <div data-dropdown-container style={{ position: "relative" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPaymentFilterOpen((v) => !v);
                setPeriodOpen(false);
                setFirmOpen(false);
                setSupplierOpen(false);
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
                {paymentFilter === "all"
                  ? "All Payment"
                  : paymentFilter === "cash"
                  ? "Cash"
                  : paymentFilter === "online"
                  ? "Online"
                  : paymentFilter === "upi"
                  ? "UPI"
                  : paymentFilter === "cheque"
                  ? "Cheque"
                  : "Credit"}
              </span>
              <ChevronDown size={14} style={{ color: "#64748b", transform: paymentFilterOpen ? "rotate(180deg)" : "none" }} />
            </button>

            {paymentFilterOpen && (
              <div
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
                  zIndex: 9999
                }}
              >
                {[
                  { key: "all", label: "All Payment" },
                  { key: "cash", label: "Cash" },
                  { key: "online", label: "Online" },
                  { key: "upi", label: "UPI" },
                  { key: "cheque", label: "Cheque" },
                  { key: "credit", label: "Credit" },
                ].map((item) => (
                  <div
                    key={item.key}
                    onClick={() => {
                      setPaymentFilter(item.key);
                      setPaymentFilterOpen(false);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: paymentFilter === item.key ? 700 : 500,
                      color: paymentFilter === item.key ? "#2563eb" : "#334155",
                      background: paymentFilter === item.key ? "#eff6ff" : "transparent",
                      cursor: "pointer"
                    }}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Tools: Refresh Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={fetchDebitNotes}
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

      {/* ── 3. SUMMARY KPI CARD (Matching Payment-Out Left Card) ── */}
      <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
        <div
          style={{
            width: 320,
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
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>Total Return Amount</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#059669", background: "#ecfdf5", padding: "2px 6px", borderRadius: 12, display: "inline-flex", alignItems: "center", gap: 2 }}>
              100% <TrendingUp size={12} />
            </span>
          </div>

          {/* Large Amount */}
          <div style={{ fontSize: 24, fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>
            ₹ {fmtCurrency(totalAmount)}
          </div>

          {/* Subtitle Paid & Balance */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ color: "#16a34a" }}>Refund: ₹ {fmtCurrency(totalRefund)}</span>
            <span style={{ color: totalBalance > 0 ? "#dc2626" : "#64748b" }}>Balance: ₹ {fmtCurrency(totalBalance)}</span>
          </div>
        </div>
      </div>

      {/* ── 4. TRANSACTIONS TABLE CONTAINER (Matching media_1788344743516.png) ── */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "visible",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          minHeight: 280
        }}
      >
        {/* Table Title Bar with Search Toggle, Excel & Print (Exact media_1788344743516.png) */}
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", textTransform: "capitalize" }}>
            Transactions
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            
            {/* Search Toggle Icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
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

            {/* Excel Report Icon (Green) */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="Export Excel"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a", display: "flex" }}
            >
              <FileSpreadsheet size={19} />
            </button>

            {/* Print Icon (Dark) */}
            <button
              type="button"
              onClick={() => window.print()}
              title="Print Transactions"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#334155", display: "flex" }}
            >
              <Printer size={19} />
            </button>

          </div>
        </div>

        {/* Table Body / Loading / Empty State */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200, color: "#64748b", gap: 10 }}>
            <RefreshCw size={20} className="animate-spin text-blue-600" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Loading Transactions...</span>
          </div>
        ) : filteredDebitNotes.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
            <FileText size={36} strokeWidth={1.5} style={{ margin: "0 auto 10px auto", color: "#cbd5e1" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>No Transactions Available</div>
            <div style={{ fontSize: 12.5, color: "#94a3b8", marginTop: 4 }}>Click "+ Add Debit Note" to record a purchase return.</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#475569", fontWeight: 700, fontSize: 11.5, textTransform: "uppercase" }}>
                <th style={{ padding: "10px 14px", width: 40 }}>#</th>
                <th style={{ padding: "10px 14px" }}>DATE</th>
                <th style={{ padding: "10px 14px" }}>REF NO.</th>
                <th style={{ padding: "10px 14px" }}>PARTY NAME</th>
                <th style={{ padding: "10px 14px" }}>CATEGORY</th>
                <th style={{ padding: "10px 14px" }}>TYPE</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>TOTAL</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>RECEIVED</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>BALANCE</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "10px 14px", textAlign: "center", width: 80 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((item, idx) => {
                const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                const isMenuOpen = activeMenuId === item.id;
                const isPaid = Number(item.balance_amount || 0) <= 0;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background .15s",
                      background: isMenuOpen ? "#f8fafc" : "#ffffff"
                    }}
                    onMouseEnter={(e) => { if (!isMenuOpen) e.currentTarget.style.background = "#f8fafc"; }}
                    onMouseLeave={(e) => { if (!isMenuOpen) e.currentTarget.style.background = "#ffffff"; }}
                  >
                    <td style={{ padding: "11px 14px", color: "#64748b", fontWeight: 600 }}>{globalIdx}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 600, color: "#1e293b" }}>{formatDateDMY(item.return_date)}</td>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "#2563eb" }}>#{item.return_no || item.id}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 700, color: "#1e293b" }}>{item.supplier_name || "-"}</div>
                      {item.supplier_phone && (
                        <div style={{ fontSize: 11, color: "#64748b" }}>{item.supplier_phone}</div>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontWeight: 500 }}>Purchase Return</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: "#f1f5f9",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#334155"
                        }}
                      >
                        {item.payment_type || "Cash"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 800, color: "#1e293b" }}>
                      ₹ {fmtCurrency(item.total_amount)}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                      ₹ {fmtCurrency(item.refund_amount)}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontWeight: 700, color: Number(item.balance_amount || 0) > 0 ? "#dc2626" : "#64748b" }}>
                      ₹ {fmtCurrency(item.balance_amount)}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: isPaid ? "#dcfce7" : "#fee2e2",
                          color: isPaid ? "#15803d" : "#b91c1c"
                        }}
                      >
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>

                    {/* Actions 3-dots Menu */}
                    <td data-dropdown-container style={{ padding: "11px 14px", textAlign: "center", position: "relative" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          padding: "4px 8px",
                          borderRadius: 4,
                          cursor: "pointer",
                          color: "#64748b"
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {isMenuOpen && (
                        <div
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "100%",
                            width: 130,
                            background: "#ffffff",
                            borderRadius: 8,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                            border: "1px solid #cbd5e1",
                            padding: "4px 0",
                            zIndex: 99999,
                            textAlign: "left"
                          }}
                        >
                          <div
                            onClick={() => {
                              navigate(`/purchases/debit-note/edit/${item.id}`);
                              setActiveMenuId(null);
                            }}
                            style={{
                              padding: "8px 12px",
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "#1e293b",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Edit3 size={14} style={{ color: "#2563eb" }} />
                            <span>Edit</span>
                          </div>

                          <div
                            onClick={() => {
                              setDeleteTarget(item);
                              setActiveMenuId(null);
                            }}
                            style={{
                              padding: "8px 12px",
                              fontSize: 12.5,
                              fontWeight: 600,
                              color: "#dc2626",
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              borderTop: "1px solid #f1f5f9"
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <Trash2 size={14} style={{ color: "#dc2626" }} />
                            <span>Delete</span>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Table Footer with Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
                color: currentPage === 1 ? "#cbd5e1" : "#334155"
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                color: currentPage === totalPages ? "#cbd5e1" : "#334155"
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

      </div>

      {/* ── 5. CUSTOM DATE PICKER MODAL ── */}
      {showDatePickerModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setShowDatePickerModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: 360,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              padding: 20
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Select Date Range</h3>
              <button onClick={() => setShowDatePickerModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPeriod("custom");
                  }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4 }}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPeriod("custom");
                  }}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDatePickerModal(false)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowDatePickerModal(false)}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#1d72fe", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setDeleteTarget(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              width: 440,
              maxWidth: "92vw",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.25)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #fee2e2", background: "#fff5f5" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", color: "#dc2626" }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#991b1b" }}>Delete Debit Note</h3>
                <p style={{ margin: "2px 0 0 0", fontSize: 12, color: "#b91c1c" }}>This action cannot be undone.</p>
              </div>
            </div>

            <div style={{ padding: "20px", fontSize: 13.5, color: "#334155", lineHeight: 1.6 }}>
              Are you sure you want to delete Debit Note <b>#{deleteTarget.return_no || deleteTarget.id}</b> for{" "}
              <b>{deleteTarget.supplier_name}</b>?
              <div style={{ marginTop: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
                📦 <b>Stock Restoration:</b> Any items deducted by this debit note will be automatically returned back to your store's inventory.
              </div>
            </div>

            <div style={{ padding: "14px 20px", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#475569" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteDebitNote}
                disabled={deleting}
                style={{ padding: "8px 20px", borderRadius: 6, border: "none", background: "#dc2626", color: "#ffffff", fontWeight: 800, fontSize: 13, cursor: deleting ? "not-allowed" : "pointer" }}
              >
                {deleting ? "Deleting..." : "Delete & Restore Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {actionToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 99999,
            background: "#1e293b",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
            fontSize: 13,
            fontWeight: 700
          }}
        >
          {actionToast.text}
        </div>
      )}

    </div>
  );
}
