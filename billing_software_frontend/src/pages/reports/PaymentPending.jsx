import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Search,
  Phone,
  MapPin,
  Download,
  Wallet,
  CheckCircle2,
  ChevronRight,
  Filter,
  IndianRupee,
  X,
  MessageCircle,
  FileDown,
  ChevronLeft,
  History,
  BarChart3,
  Users,
  AlertCircle,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Calendar,
  CreditCard,
  Building2,
  Check,
  ArrowRight,
  Info,
} from "lucide-react";
import ReportAnalyticsView from "../../components/reports/ReportAnalyticsView";

/* ─────────────────── Helpers ─────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* FIFO Auto-Distribution Algorithm */
const distributePayment = (pendingInvoices, totalAmount) => {
  let remaining = Number(totalAmount);
  return pendingInvoices.map((inv) => {
    const bal = Number(inv.balance_amount || 0);
    if (remaining <= 0) return { ...inv, _applying: 0, _newBalance: bal };
    const applying = Math.min(remaining, bal);
    remaining -= applying;
    return { ...inv, _applying: applying, _newBalance: bal - applying };
  });
};

const INV_PER_PAGE = 8;

export default function PaymentPending() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const admin_id = user?.role === "cashier" ? user?.admin_id : user?.id;

  // Data states
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [customerFilterTab, setCustomerFilterTab] = useState("all"); // 'all' | 'with_dues' | 'cleared'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [toast, setToast] = useState(null);

  // Customer Payment History Modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Collect Payment Modal
  const [showCollect, setShowCollect] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("cash");
  const [collectDate, setCollectDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [collectNotes, setCollectNotes] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [preview, setPreview] = useState([]);

  // WhatsApp Reminder State
  const [sendingReminder, setSendingReminder] = useState(false);

  // Analytics View State
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Table & Checkbox selection
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [invPage, setInvPage] = useState(1);

  // Filter States
  const [showFilter, setShowFilter] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCustomer, setFilterCustomer] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const appliedCount = [
    fromDate || toDate,
    filterMethod !== "all",
    filterStatus !== "all",
    filterCustomer,
  ].filter(Boolean).length;

  /* ── Fetch customers & pending history ── */
  const fetchCustomers = useCallback(
    async (keepSelectedId = null) => {
      setLoading(true);
      try {
        const res = await api.get(
          `/customer/get_all_customer?admin_id=${admin_id}`
        );
        if (res.data.status) {
          const creditOnly = (res.data.data || []).filter(
            (c) => Number(c.credit_enabled) === 1
          );
          setCustomers(creditOnly);

          if (creditOnly.length > 0) {
            const target = keepSelectedId
              ? creditOnly.find((c) => c.id === keepSelectedId) || creditOnly[0]
              : selectedCustomer || creditOnly[0];
            setSelectedCustomer(target);
            fetchCustomerHistory(target.id);
          } else {
            setSelectedCustomer(null);
            setInvoiceHistory([]);
          }
        }
      } catch (err) {
        console.error("Error fetching customers:", err);
      } finally {
        setLoading(false);
      }
    },
    [admin_id]
  );

  const fetchAllHistory = useCallback(async () => {
    try {
      const res = await api.get(
        `/invoice/get_pending_invoice_history?admin_id=${admin_id}`
      );
      if (res.data.status) {
        const data = (res.data.data || []).filter(
          (item) => Number(item.balance_amount) > 0
        );
        setAllHistory(data);
      }
    } catch (err) {
      console.error("Error fetching pending history:", err);
    }
  }, [admin_id]);

  const fetchCustomerHistory = async (customerId, overrides = {}) => {
    if (!customerId) return;
    setLoadingInvoices(true);
    try {
      const res = await api.get(
        `/invoice/get_pending_invoice_history?admin_id=${admin_id}`
      );
      if (res.data.status) {
        let data = (res.data.data || []).filter(
          (item) => Number(item.customer_id) === Number(customerId)
        );

        // Apply filters
        const method = overrides.filterMethod ?? filterMethod;
        const status = overrides.filterStatus ?? filterStatus;
        const from = overrides.fromDate ?? fromDate;
        const to = overrides.toDate ?? toDate;

        if (method !== "all") {
          data = data.filter((i) => i.payment_method?.toLowerCase() === method);
        }

        if (status === "paid") {
          data = data.filter((i) => Number(i.balance_amount) <= 0);
        } else if (status === "not_paid") {
          data = data.filter((i) => Number(i.balance_amount) > 0);
        }

        if (from) {
          data = data.filter(
            (i) => i.created_at && i.created_at.slice(0, 10) >= from
          );
        }
        if (to) {
          data = data.filter(
            (i) => i.created_at && i.created_at.slice(0, 10) <= to
          );
        }

        setInvoiceHistory(data);
        setCheckedIds(new Set());
        setInvPage(1);
      }
    } catch (err) {
      console.error("Error fetching customer invoices:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAllHistory();
  }, [fetchCustomers, fetchAllHistory]);

  // Live FIFO preview calculation
  useEffect(() => {
    const pending = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
    const sortedPending = [...pending].sort((a, b) => {
      const da = new Date(a.created_at || a.invoice_date || 0);
      const db = new Date(b.created_at || b.invoice_date || 0);
      return da - db || a.id - b.id;
    });

    if (!collectAmount || Number(collectAmount) <= 0) {
      setPreview([]);
      return;
    }
    setPreview(distributePayment(sortedPending, collectAmount));
  }, [collectAmount, invoiceHistory]);

  const getCustomerPendingTotal = (customerId) =>
    allHistory
      .filter((i) => Number(i.customer_id) === Number(customerId))
      .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  const pendingInvoices = useMemo(
    () => invoiceHistory.filter((i) => Number(i.balance_amount) > 0),
    [invoiceHistory]
  );
  const totalPending = useMemo(
    () => pendingInvoices.reduce((s, i) => s + Number(i.balance_amount || 0), 0),
    [pendingInvoices]
  );

  /* ── KPI Stat Calculations ── */
  const globalStats = useMemo(() => {
    const totalReceivables = allHistory.reduce(
      (sum, i) => sum + Number(i.balance_amount || 0),
      0
    );

    const customersWithDues = customers.filter(
      (c) => getCustomerPendingTotal(c.id) > 0
    ).length;

    const clearedCustomers = customers.length - customersWithDues;

    const totalCreditLimit = customers.reduce(
      (sum, c) => sum + Number(c.credit_limit || 0),
      0
    );

    return {
      totalReceivables,
      customersWithDues,
      clearedCustomers,
      totalCreditLimit,
    };
  }, [allHistory, customers]);

  /* ── Filter apply & reset ── */
  const applyFilter = () => {
    if (selectedCustomer) fetchCustomerHistory(selectedCustomer.id);
  };

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setFilterMethod("all");
    setFilterStatus("all");
    setFilterCustomer("");
    if (selectedCustomer) {
      fetchCustomerHistory(selectedCustomer.id, {
        filterMethod: "all",
        filterStatus: "all",
        filterCustomer: "",
        fromDate: "",
        toDate: "",
      });
    }
  };

  /* ── Filtered Customer List ── */
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search) ||
        (c.address && c.address.toLowerCase().includes(search.toLowerCase()));

      const pt = getCustomerPendingTotal(c.id);
      if (customerFilterTab === "with_dues" && pt <= 0) return false;
      if (customerFilterTab === "cleared" && pt > 0) return false;

      return matchSearch;
    });
  }, [customers, search, customerFilterTab, allHistory]);

  /* ── Invoice Pagination ── */
  const totalInvPages = Math.ceil(invoiceHistory.length / INV_PER_PAGE) || 1;
  const invStart = (invPage - 1) * INV_PER_PAGE;
  const currentInvs = invoiceHistory.slice(invStart, invStart + INV_PER_PAGE);

  /* ── Checkbox Selection ── */
  const allCurrentChecked =
    currentInvs.length > 0 && currentInvs.every((i) => checkedIds.has(i.id));

  const toggleAll = () => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allCurrentChecked) currentInvs.forEach((i) => next.delete(i.id));
      else currentInvs.forEach((i) => next.add(i.id));
      return next;
    });
  };

  const toggleOne = (id, e) => {
    e.stopPropagation();
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedInvRows = invoiceHistory.filter((i) => checkedIds.has(i.id));
  const exportRows = checkedIds.size > 0 ? selectedInvRows : invoiceHistory;

  // Analytics rows
  const analyticsRows = useMemo(
    () =>
      invoiceHistory.map((item) => ({
        date: item.created_at || item.due_date || "",
        group: item.payment_method || "Credit",
        value: Number(item.balance_amount || 0),
        count: 1,
      })),
    [invoiceHistory]
  );

  /* ── Export Excel ── */
  const downloadExcel = () => {
    if (!exportRows.length) {
      showToast("No invoice data available to export", false);
      return;
    }
    const rows = exportRows.map((item, idx) => ({
      "S.No": idx + 1,
      "Invoice No": item.invoice_no || "-",
      "Customer Name": selectedCustomer?.name || "-",
      "Phone": selectedCustomer?.phone || "-",
      "Invoice Date": formatDate(item.created_at || item.invoice_date),
      "Due Date": formatDate(item.due_date),
      "Payment Method": (item.payment_method || "-").toUpperCase(),
      "Total Amount (₹)": Number(item.total_amount || 0),
      "Paid Amount (₹)": Number(item.paid_amount_total || 0),
      "Balance Due (₹)": Number(item.balance_amount || 0),
      "Payment Status": Number(item.balance_amount) <= 0 ? "PAID" : "PENDING",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pending Invoices");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${selectedCustomer?.name || "Customer"}_Pending_Invoices.xlsx`
    );
    showToast("Excel sheet downloaded successfully!");
  };

  /* ── Export PDF ── */
  const downloadPDF = () => {
    if (!exportRows.length) {
      showToast("No invoice data available to export", false);
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });

    // Header styling
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, doc.internal.pageSize.width, 24, "F");

    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `Pending Receivables Ledger — ${selectedCustomer?.name || "Customer"}`,
      14,
      15
    );

    doc.setFontSize(9);
    doc.setTextColor(239, 246, 255);
    doc.text(
      `Generated on: ${new Date().toLocaleString("en-IN")} | Phone: ${
        selectedCustomer?.phone || "N/A"
      }`,
      doc.internal.pageSize.width - 14,
      15,
      { align: "right" }
    );

    autoTable(doc, {
      startY: 30,
      head: [
        [
          "Invoice No",
          "Bill Date",
          "Due Date",
          "Method",
          "Total Amount",
          "Paid Amount",
          "Pending Due",
          "Status",
        ],
      ],
      body: exportRows.map((item) => [
        item.invoice_no || "-",
        formatDate(item.created_at || item.invoice_date),
        formatDate(item.due_date),
        (item.payment_method || "-").toUpperCase(),
        `₹${fmt(item.total_amount)}`,
        `₹${fmt(item.paid_amount_total)}`,
        `₹${fmt(item.balance_amount)}`,
        Number(item.balance_amount) <= 0 ? "PAID" : "NOT PAID",
      ]),
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontSize: 9,
        fontStyle: "bold",
      },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    doc.save(
      `${selectedCustomer?.name || "Customer"}_Pending_Invoices_Report.pdf`
    );
    showToast("PDF report downloaded successfully!");
  };

  /* ── Open Collect Modal ── */
  const openCollect = () => {
    if (!selectedCustomer) return;
    setCollectAmount("");
    setCollectMethod("cash");
    setCollectDate(new Date().toISOString().split("T")[0]);
    setCollectNotes("");
    setPreview([]);
    setShowCollect(true);
  };

  /* ── Submit Bulk Payment Collection ── */
  const handleBulkCollect = async () => {
    if (!collectAmount || Number(collectAmount) <= 0) {
      showToast("Please enter a valid collection amount", false);
      return;
    }

    setCollecting(true);
    try {
      const res = await api.post("/invoice/pay_customer_bulk", {
        company_id:
          localStorage.getItem("selected_company_id") ||
          user?.company_id ||
          "",
        customer_id: selectedCustomer.id,
        amount: Number(collectAmount),
        payment_method: collectMethod,
        payment_date: collectDate,
        notes: collectNotes,
      });

      if (res.data.status) {
        showToast("Payment collected and allocated successfully! 🎉");
        setShowCollect(false);
        setCollectAmount("");
        setPreview([]);
        await fetchCustomers(selectedCustomer.id);
        await fetchAllHistory();
        await fetchCustomerHistory(selectedCustomer.id);
      } else {
        showToast(res.data.message || "Failed to collect payment", false);
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || "Server error while collecting payment",
        false
      );
    } finally {
      setCollecting(false);
    }
  };

  /* ── Open Customer Payment History ── */
  const openCustomerHistoryModal = async (cust) => {
    if (!cust) return;
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(
        `/invoice/get_customer_payments?customer_id=${cust.id}`
      );
      if (res.data.status) {
        setPaymentHistory(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Could not load payment history", false);
    } finally {
      setLoadingHistory(false);
    }
  };

  /* ── Send WhatsApp Reminder ── */
  const sendCustomerReminder = async () => {
    if (!selectedCustomer) return;
    const pi = invoiceHistory.filter(
      (item) =>
        Number(item.balance_amount) > 0 && item.payment_method === "credit"
    );
    if (!pi.length) {
      showToast("No pending credit invoices found for this customer.", false);
      return;
    }
    setSendingReminder(true);
    try {
      for (const item of pi) {
        await api.post("/whatsapp/send_reminder", {
          invoice_no: item.invoice_no,
          phone: selectedCustomer.phone,
          name: selectedCustomer.name,
          amount: item.balance_amount,
          due_date: item.due_date,
          template_name: "hello_world",
        });
      }
      showToast(`WhatsApp reminder dispatched for ${pi.length} invoice(s)! 📱`);
    } catch (err) {
      showToast("Unable to send WhatsApp reminder.", false);
    } finally {
      setSendingReminder(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 font-sans text-slate-800">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
              toast.ok
                ? "bg-emerald-500 shadow-emerald-500/20"
                : "bg-rose-500 shadow-rose-500/20"
            }`}
          >
            {toast.ok ? <Check size={16} /> : <X size={16} />}
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Payment Pending
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              {customers.length} Credit Accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track customer receivables, overdue balances, FIFO bulk collections & WhatsApp alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            disabled={!invoiceHistory.length}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              invoiceHistory.length
                ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200/80 cursor-pointer shadow-sm"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
            }`}
          >
            <BarChart3 size={15} />
            Analytics
          </button>

          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all relative ${
              showFilter || appliedCount > 0
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-sm"
            }`}
          >
            <Filter size={15} />
            Filters
            {appliedCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-black -ml-1">
                {appliedCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              fetchCustomers(selectedCustomer?.id);
              fetchAllHistory();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition-all"
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── KPI METRIC STATS STRIP ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Receivables */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Receivables
            </span>
            <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
              ₹{fmt(globalStats.totalReceivables)}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Outstanding across credit bills
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Customers with Dues */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Accounts with Dues
            </span>
            <div className="text-xl sm:text-2xl font-black text-amber-600 mt-1">
              {globalStats.customersWithDues}{" "}
              <span className="text-xs font-semibold text-slate-400">
                / {customers.length}
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Active accounts owing balance
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertCircle size={24} />
          </div>
        </div>

        {/* Cleared Accounts */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Cleared Accounts
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
              {globalStats.clearedCustomers}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Zero pending balance
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Total Credit Limit Assigned */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Credit Limit
            </span>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 mt-1">
              ₹{fmt(globalStats.totalCreditLimit)}
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Allocated business credit
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <ShieldCheck size={24} />
          </div>
        </div>
      </div>

      {/* ── EXPANDABLE FILTER TOOLBAR ── */}
      {showFilter && (
        <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-indigo-600" />
              <span className="text-sm font-bold text-slate-800">
                Filter Customer Invoices
              </span>
            </div>
            {appliedCount > 0 && (
              <button
                onClick={resetFilter}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <X size={14} /> Clear All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* From Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Payment Method
              </label>
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Methods</option>
                <option value="credit">Credit Only</option>
                <option value="cash">Cash</option>
                <option value="online">Online Transfer</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Payment Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">All Statuses</option>
                <option value="not_paid">Pending / Not Paid</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
            <button
              onClick={resetFilter}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={applyFilter}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN MAIN VIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CUSTOMER DIRECTORY (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
          {/* Header & Tabs */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users size={14} className="text-indigo-600" /> Credit Accounts
              </span>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                {filteredCustomers.length}
              </span>
            </div>

            {/* Tab Filters */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200/70 p-1 rounded-xl mb-3 text-xs font-bold">
              <button
                onClick={() => setCustomerFilterTab("all")}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  customerFilterTab === "all"
                    ? "bg-white text-indigo-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({customers.length})
              </button>
              <button
                onClick={() => setCustomerFilterTab("with_dues")}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  customerFilterTab === "with_dues"
                    ? "bg-white text-rose-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                With Dues
              </button>
              <button
                onClick={() => setCustomerFilterTab("cleared")}
                className={`py-1.5 rounded-lg text-center transition-all ${
                  customerFilterTab === "cleared"
                    ? "bg-white text-emerald-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cleared
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search name, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Customer Scroll List */}
          <div className="overflow-y-auto max-h-[620px] divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Users size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-500">
                  No credit customers found
                </p>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const pt = getCustomerPendingTotal(c.id);
                const isSelected = selectedCustomer?.id === c.id;
                const initials = (c.name || "C")
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      fetchCustomerHistory(c.id);
                      setCollectAmount("");
                      setPreview([]);
                    }}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-all border-l-4 ${
                      isSelected
                        ? "bg-indigo-50/90 border-indigo-600"
                        : "border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 ${
                          pt > 0
                            ? "bg-rose-100 text-rose-700"
                            : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {initials}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-extrabold text-slate-900 truncate">
                          {c.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Phone size={11} /> {c.phone || "No phone"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 ml-2">
                      <div
                        className={`text-xs font-black ${
                          pt > 0
                            ? "text-rose-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {pt > 0 ? `₹${fmt(pt)}` : "₹0 (Cleared)"}
                      </div>
                      {Number(c.credit_limit) > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Limit: ₹{fmt(c.credit_limit)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER BANNER & INVOICES (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {!selectedCustomer ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center shadow-sm">
              <Users size={48} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                No Customer Selected
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Please select a credit customer from the left directory to view pending invoices and collect payments.
              </p>
            </div>
          ) : (
            <>
              {/* CUSTOMER PROFILE & ACTIONS BANNER */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Customer Basic Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900">
                        {selectedCustomer.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        CREDIT CUSTOMER
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone size={13} className="text-slate-400" />
                        {selectedCustomer.phone || "No phone"}
                      </span>
                      {selectedCustomer.address && (
                        <span className="flex items-center gap-1">
                          <MapPin size={13} className="text-slate-400" />
                          {selectedCustomer.address}
                        </span>
                      )}
                      {Number(selectedCustomer.credit_limit) > 0 && (
                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                          <CreditCard size={13} className="text-indigo-600" />
                          Credit Limit: ₹{fmt(selectedCustomer.credit_limit)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Balance Chip & Main Action */}
                  <div className="flex items-center gap-3">
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-right">
                      <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        Total Pending
                      </div>
                      <div className="text-lg font-black text-rose-600">
                        ₹{fmt(totalPending)}
                      </div>
                    </div>

                    {totalPending > 0 && (
                      <button
                        onClick={openCollect}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all transform active:scale-95"
                      >
                        <Wallet size={15} />
                        Collect Payment
                      </button>
                    )}
                  </div>
                </div>

                {/* Secondary Action Buttons Bar */}
                <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-slate-100 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {totalPending > 0 && (
                      <button
                        onClick={sendCustomerReminder}
                        disabled={sendingReminder}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                      >
                        <MessageCircle size={14} />
                        {sendingReminder ? "Sending WhatsApp..." : "WhatsApp Reminder"}
                      </button>
                    )}

                    <button
                      onClick={() => openCustomerHistoryModal(selectedCustomer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                    >
                      <History size={14} />
                      Payment History
                    </button>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadExcel}
                      disabled={!invoiceHistory.length}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-emerald-600 border border-emerald-200 shadow-sm transition-colors"
                    >
                      <Download size={13} />
                      Excel {checkedIds.size > 0 && `(${checkedIds.size})`}
                    </button>
                    <button
                      onClick={downloadPDF}
                      disabled={!invoiceHistory.length}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-rose-600 border border-rose-200 shadow-sm transition-colors"
                    >
                      <FileDown size={13} />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* INVOICES TABLE CONTAINER */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                      Pending & Credit Invoices
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      {invoiceHistory.length} Bills
                    </span>
                  </div>

                  {checkedIds.size > 0 && (
                    <span className="text-xs font-semibold text-indigo-600">
                      {checkedIds.size} invoice(s) selected for export
                    </span>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 w-10">
                          <input
                            type="checkbox"
                            checked={allCurrentChecked}
                            onChange={toggleAll}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                          />
                        </th>
                        <th className="py-3 px-4">Invoice No</th>
                        <th className="py-3 px-4">Date / Due</th>
                        <th className="py-3 px-4 text-center">Method</th>
                        <th className="py-3 px-4 text-right">Total</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Pending</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {loadingInvoices ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-indigo-500" />
                            Loading customer invoices...
                          </td>
                        </tr>
                      ) : currentInvs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                            <CheckCircle2 size={32} className="mx-auto text-slate-300 mb-2" />
                            No invoices match the selected filter.
                          </td>
                        </tr>
                      ) : (
                        currentInvs.map((inv) => {
                          const isPaid = Number(inv.balance_amount || 0) <= 0;
                          const isChecked = checkedIds.has(inv.id);

                          return (
                            <tr
                              key={inv.id}
                              onClick={() => navigate(`/invoice/${inv.invoice_no}`)}
                              className={`transition-colors cursor-pointer group ${
                                isChecked
                                  ? "bg-indigo-50/80"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <td
                                className="py-3.5 px-4"
                                onClick={(e) => toggleOne(inv.id, e)}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => toggleOne(inv.id, e)}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer accent-indigo-600"
                                />
                              </td>
                              <td className="py-3.5 px-4 font-bold text-indigo-600 flex items-center gap-1.5">
                                {inv.invoice_no || "-"}
                                <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">
                                <div>{formatDate(inv.created_at || inv.invoice_date)}</div>
                                {inv.due_date && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Due: {formatDate(inv.due_date)}
                                  </div>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                  {inv.payment_method || "-"}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right font-semibold text-slate-800">
                                ₹{fmt(inv.total_amount)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                                ₹{fmt(inv.paid_amount_total)}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                                ₹{fmt(inv.balance_amount)}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide ${
                                    isPaid
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {isPaid ? "PAID" : "PENDING"}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalInvPages > 1 && (
                  <div className="p-3.5 border-t border-slate-100 flex items-center justify-between bg-white">
                    <button
                      onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                      disabled={invPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft size={14} /> Previous
                    </button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalInvPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setInvPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            invPage === p
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setInvPage((p) => Math.min(totalInvPages, p + 1))}
                      disabled={invPage === totalInvPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── COLLECT BULK PAYMENT MODAL (FIFO) ── */}
      {showCollect && selectedCustomer && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCollect(false);
          }}
          className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Wallet size={18} className="text-indigo-600" />
                  Collect Customer Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Amount will be auto-allocated oldest-first (FIFO) for{" "}
                  <strong className="text-slate-800">
                    {selectedCustomer.name}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setShowCollect(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Total Due Pill */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <div>
                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">
                    Total Pending Balance
                  </span>
                  <div className="text-lg font-black text-rose-600">
                    ₹{fmt(totalPending)}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-700">
                  {pendingInvoices.length} Pending Bills
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Amount to Collect (₹) *
                </label>
                <div className="relative">
                  <IndianRupee
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(e.target.value)}
                    placeholder={`e.g. ₹${fmt(totalPending)}`}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Quick percentage buttons */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[25, 50, 75, 100].map((pct) => {
                    const val = Math.round((totalPending * pct) / 100);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCollectAmount(String(val))}
                        className="py-1.5 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 border border-slate-200 transition-colors"
                      >
                        {pct}% (₹{fmt(val)})
                      </button>
                    );
                  })}
                </div>

                {/* Excess amount warning */}
                {Number(collectAmount) > totalPending && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] mt-2 font-medium">
                    <Info size={14} className="flex-shrink-0" />
                    <span>
                      Excess amount of{" "}
                      <strong>₹{fmt(Number(collectAmount) - totalPending)}</strong> will be credited as customer advance balance.
                    </span>
                  </div>
                )}
              </div>

              {/* Method & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Payment Method
                  </label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="online">Online Transfer (NEFT/IMPS)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="loyalty">Loyalty Points</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={collectDate}
                    onChange={(e) => setCollectDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Reference / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={collectNotes}
                  onChange={(e) => setCollectNotes(e.target.value)}
                  placeholder="e.g. Cheque No, UTR Reference or remarks"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* FIFO Live Split Preview Table */}
              {preview.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden mt-3">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex items-center justify-between text-[11px]">
                    <span>FIFO Payment Distribution Preview</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">
                      Oldest Bills First
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                        <tr>
                          <th className="p-2">Invoice</th>
                          <th className="p-2 text-right">Balance</th>
                          <th className="p-2 text-right">Applying</th>
                          <th className="p-2 text-center">Outcome</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.map((p) => {
                          const willPay = Number(p._applying) > 0;
                          const fullyClear = Number(p._newBalance) <= 0;
                          return (
                            <tr
                              key={p.id}
                              className={
                                fullyClear
                                  ? "bg-emerald-50/60"
                                  : willPay
                                  ? "bg-amber-50/60"
                                  : ""
                              }
                            >
                              <td className="p-2 font-bold text-slate-800">
                                {p.invoice_no}
                              </td>
                              <td className="p-2 text-right text-rose-600 font-semibold">
                                ₹{fmt(p.balance_amount)}
                              </td>
                              <td className="p-2 text-right font-bold text-emerald-600">
                                {willPay ? `₹${fmt(p._applying)}` : "—"}
                              </td>
                              <td className="p-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    fullyClear
                                      ? "bg-emerald-100 text-emerald-700"
                                      : willPay
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-400"
                                  }`}
                                >
                                  {fullyClear
                                    ? "✓ Cleared"
                                    : willPay
                                    ? `Bal: ₹${fmt(p._newBalance)}`
                                    : "Unchanged"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCollect(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCollect}
                disabled={collecting || !collectAmount || Number(collectAmount) <= 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all"
              >
                <Wallet size={15} />
                {collecting
                  ? "Processing Payment..."
                  : `Collect ₹${collectAmount ? fmt(collectAmount) : "0"}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOMER PAYMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className="fixed inset-0 z-[10000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <History size={18} className="text-indigo-600" />
                  Payment History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ledger of collections recorded for{" "}
                  <strong className="text-slate-800">
                    {selectedCustomer?.name}
                  </strong>
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Summary Bar */}
            {!loadingHistory && paymentHistory.length > 0 && (
              <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="font-bold text-emerald-800">
                    Total Collections: ₹
                    {fmt(
                      paymentHistory.reduce(
                        (sum, h) => sum + Number(h.amount || 0),
                        0
                      )
                    )}
                  </span>
                </div>
                <span className="font-semibold text-emerald-700">
                  {paymentHistory.length} transaction(s)
                </span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-y-auto flex-1 p-0">
              {loadingHistory ? (
                <div className="py-14 text-center text-slate-400 font-medium text-xs">
                  <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-indigo-500" />
                  Loading payment history records...
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="py-14 text-center text-slate-400 font-medium text-xs">
                  <History size={36} className="mx-auto text-slate-300 mb-2" />
                  No payment history recorded for this customer yet.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Method</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {h.invoice_no || "Bulk Payment"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">
                          {formatDate(h.payment_date || h.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          ₹{fmt(h.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                            {h.payment_method || "cash"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {h.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── REPORT ANALYTICS MODAL ── */}
      {analyticsOpen && (
        <ReportAnalyticsView
          title="Payment Pending Analytics"
          subtitle={`${fromDate || "All"} → ${toDate || "All"} • ${
            analyticsRows.length
          } records`}
          rows={analyticsRows}
          symbol="₹"
          groupLabel="Payment Types"
          onClose={() => setAnalyticsOpen(false)}
        />
      )}
    </div>
  );
}