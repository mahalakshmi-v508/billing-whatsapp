import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Pencil,
  Trash2,
  Eye,
  FileSpreadsheet,
  History,
  CreditCard,
  Search,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Plus,
  Share2,
  X,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import AddSupplierModal from "../supplier/AddSupplierModal";
import ShareTransactionPopover from "../../components/ShareTransactionPopover";
import HeaderSettingsButton from "../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../components/CommonTableColumnSettings";
import useTableColumns from "../../hooks/useTableColumns";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableStatusBadge,
  TableEmptyState,
  TableLoadingState,
} from "../../components/table";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Purchase bill date" },
  { key: "bill_no", label: "Bill No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Purchase bill/invoice number" },
  { key: "total", label: "Total", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Total purchase amount" },
  { key: "paid", label: "Paid", icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", desc: "Amount paid" },
  { key: "pending", label: "Pending", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Remaining balance pending" },
  { key: "status", label: "Status", icon: CheckCircle2, color: "text-amber-600", bg: "bg-amber-50", desc: "Bill submission status" },
  { key: "actions", label: "Actions", icon: SlidersHorizontal, color: "text-slate-600", bg: "bg-slate-100", desc: "Edit, View, Share, Pay" },
];

export default function PurchaseList() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  // Search & Filters
  const [search, setSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [activeShareId, setActiveShareId] = useState(null);

  // Column Customization Drawer state & persistence
  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("purchase_bill_columns", DEFAULT_COLUMNS);

  // Pagination states for invoice table
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Payment Modal States
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentPurchase, setPaymentPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Bulk Pay Modal States
  const [showBulkPayModal, setShowBulkPayModal] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkMethod, setBulkMethod] = useState("cash");
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split("T")[0]);
  const [bulkNotes, setBulkNotes] = useState("");
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [bulkPreview, setBulkPreview] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api
      .get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            fetchPurchasesAndSuppliers(savedId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchPurchasesAndSuppliers = async (companyId) => {
    setLoading(true);
    try {
      // Fetch Purchases
      const pRes = await api.get(`/purchase/get_purchases?company_id=${companyId}`);
      if (pRes.data.status) {
        setPurchases(pRes.data.data);
      }

      // Fetch Suppliers
      const sRes = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (sRes.data.status) {
        const fetchedSuppliers = sRes.data.data;
        setSuppliers(fetchedSuppliers);

        // Auto-select first supplier if available
        if (fetchedSuppliers.length > 0) {
          setSelectedSupplier((prev) => {
            if (prev) {
              const stillExists = fetchedSuppliers.find((s) => s.id === prev.id);
              return stillExists || fetchedSuppliers[0];
            }
            return fetchedSuppliers[0];
          });
        } else {
          setSelectedSupplier(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    fetchPurchasesAndSuppliers(companyId);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this draft purchase?")) return;
    try {
      const res = await api.post(`/purchase/delete_purchase`, { id });
      if (res.data.status) {
        alert("Purchase draft deleted successfully");
        fetchPurchasesAndSuppliers(selectedCompany);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting purchase");
    }
  };

  // Open Payment dialog
  const openPayModal = (purchase) => {
    setPaymentPurchase(purchase);
    setPayAmount(Number(purchase.balance_amount));
    setPayMethod("cash");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayNotes("");
    setShowPayModal(true);
  };

  // Submit Payment
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
        notes: payNotes,
      });
      if (res.data.status) {
        alert("Payment recorded successfully");
        setShowPayModal(false);
        fetchPurchasesAndSuppliers(selectedCompany);
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

  // Open supplier-level Payment History
  const openSupplierHistoryModal = async (supplier) => {
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/purchase/get_supplier_payments?supplier_id=${supplier.id}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // FIFO distribution preview helper
  const distributePayment = (pendingBills, totalAmount) => {
    let remaining = Number(totalAmount) || 0;
    return pendingBills.map((p) => {
      const bal = Number(p.balance_amount);
      if (remaining <= 0) return { ...p, _applying: 0, _newBalance: bal };
      const applying = Math.min(remaining, bal);
      remaining -= applying;
      return { ...p, _applying: applying, _newBalance: bal - applying };
    });
  };

  // Open Bulk Pay modal
  const openBulkPayModal = () => {
    setBulkAmount("");
    setBulkMethod("cash");
    setBulkDate(new Date().toISOString().split("T")[0]);
    setBulkNotes("");
    setBulkPreview([]);
    setShowBulkPayModal(true);
  };

  // Live preview update on amount change
  const handleBulkAmountChange = (val) => {
    setBulkAmount(val);
    const pendingBills = supplierBills.filter(
      (p) => Number(p.balance_amount) > 0 && p.status === "submitted"
    );
    const sorted = [...pendingBills].sort((a, b) => {
      const da = new Date(a.purchase_date),
        db = new Date(b.purchase_date);
      return da - db || a.id - b.id;
    });
    setBulkPreview(distributePayment(sorted, val));
  };

  // Submit Bulk Payment
  const submitBulkPayment = async (e) => {
    e.preventDefault();
    if (!bulkAmount || Number(bulkAmount) <= 0) {
      alert("Please enter a valid amount!");
      return;
    }
    if (!selectedSupplier) return;

    setSubmittingBulk(true);
    try {
      const res = await api.post("/purchase/pay_supplier_bulk", {
        supplier_id: selectedSupplier.id,
        amount: Number(bulkAmount),
        payment_method: bulkMethod,
        payment_date: bulkDate,
        notes: bulkNotes,
      });
      if (res.data.status) {
        alert(res.data.message);
        setShowBulkPayModal(false);
        fetchPurchasesAndSuppliers(selectedCompany);
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error recording bulk payment");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Helper formatting currency
  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Get total pending amount for a supplier (submitted invoices only, drafts excluded)
  const getSupplierPendingTotal = (supplierId) => {
    return purchases
      .filter(
        (p) => Number(p.supplier_id) === Number(supplierId) && p.status === "submitted"
      )
      .reduce((sum, p) => sum + Number(p.balance_amount || 0), 0);
  };

  // Filter suppliers by sidebar search
  const filteredSuppliers = suppliers.filter((s) => {
    const name = s.supplier_name ? s.supplier_name.toLowerCase() : "";
    const phone = (s.mobile_number || s.phone || s.alt_mobile || "").toLowerCase();
    return (
      name.includes(supplierSearch.toLowerCase()) ||
      phone.includes(supplierSearch.toLowerCase())
    );
  });

  // Filter current supplier's purchase bills by search bar input
  const supplierBills = selectedSupplier
    ? purchases.filter((p) => Number(p.supplier_id) === Number(selectedSupplier.id))
    : [];

  const filteredBills = supplierBills.filter((p) => {
    const billNo = p.purchase_no ? p.purchase_no.toLowerCase() : "";
    return billNo.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredBills.length / rowsPerPage) || 1;
  const paginatedBills = filteredBills.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Calculated totals of selected supplier
  const selectedSupplierPendingTotal = selectedSupplier
    ? getSupplierPendingTotal(selectedSupplier.id)
    : 0;

  return (
    <div className="space-y-4 pb-12 max-w-[1600px] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Supplier Purchases</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage supplier purchase invoices, drafts, & credit payments
          </p>
        </div>
        <div className="flex gap-2.5 items-center flex-wrap">
          <button
            onClick={() => navigate("/purchases/reports")}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>GST Report</span>
          </button>
          <button
            onClick={() => navigate("/purchases/new")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Purchase</span>
          </button>
          <HeaderSettingsButton
            variant="list"
            onClick={() => setShowColumnDrawer(true)}
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* Company Selector Buttons */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🏢</span>
                <span>{c.company_name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2-COLUMN SPLIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        {/* ── LEFT PANEL: Suppliers List ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[560px]">
          {/* Supplier Search & Add Button */}
          <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                placeholder="Search supplier..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> Add Supplier
            </button>
          </div>

          {/* Suppliers List */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                Loading suppliers...
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-medium">
                No suppliers found
              </div>
            ) : (
              filteredSuppliers.map((s) => {
                const pt = getSupplierPendingTotal(s.id);
                const isSelected = selectedSupplier?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSupplier(s);
                      setSearch("");
                      setCurrentPage(1);
                    }}
                    className={`p-3.5 cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-blue-50/80 border-l-4 border-blue-600 font-semibold"
                        : "hover:bg-slate-50 border-l-4 border-transparent text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="truncate pr-2">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {s.supplier_name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {s.mobile_number || s.phone || "No phone"}
                        </div>
                      </div>
                      <div
                        className={`text-xs font-bold shrink-0 ${
                          pt > 0 ? "text-rose-600 font-extrabold" : "text-slate-400"
                        }`}
                      >
                        ₹{fmt(pt)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Invoice Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[560px]">
          {selectedSupplier && (
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedSupplier.supplier_name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-slate-400" />
                      {selectedSupplier.mobile_number || selectedSupplier.phone || "N/A"}
                      {selectedSupplier.alt_mobile && (
                        <span className="text-slate-400"> / {selectedSupplier.alt_mobile}</span>
                      )}
                    </span>
                    {selectedSupplier.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" /> {selectedSupplier.email}
                      </span>
                    )}
                    {selectedSupplier.address && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" /> {selectedSupplier.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Payment History Button */}
                  <button
                    onClick={() => openSupplierHistoryModal(selectedSupplier)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <History size={14} />
                    <span>Payment History</span>
                  </button>

                  {/* Pay All Pending Button */}
                  {selectedSupplierPendingTotal > 0 && (
                    <button
                      onClick={openBulkPayModal}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-sm transition cursor-pointer"
                    >
                      <Wallet size={14} />
                      <span>Pay All Pending</span>
                    </button>
                  )}

                  {/* Total Pending Balance Badge */}
                  {selectedSupplierPendingTotal > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-center">
                      <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        Pending Balance
                      </div>
                      <div className="text-base font-black text-rose-700">
                        ₹{fmt(selectedSupplierPendingTotal)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bills Search Toolbar */}
          {selectedSupplier && (
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  placeholder="Search bills by Invoice/Bill No..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>
          )}

          {/* Standardized Invoice Table */}
          <div className="flex-1 flex flex-col">
            {!selectedSupplier ? (
              <TableEmptyState
                title="No Supplier Selected"
                description="Select a supplier from the left sidebar to view purchase invoices and billing history."
              />
            ) : filteredBills.length === 0 ? (
              <TableEmptyState
                title="No Purchase Invoices"
                description="There are no purchase invoices matching your search for this supplier."
              />
            ) : (
              <>
                <Table>
                  <Thead>
                    <tr>
                      {visibleColumns.date && <Th>Date</Th>}
                      {visibleColumns.bill_no && <Th>Bill No</Th>}
                      {visibleColumns.total && <Th align="right">Total</Th>}
                      {visibleColumns.paid && <Th align="right">Paid</Th>}
                      {visibleColumns.pending && <Th align="right">Pending</Th>}
                      {visibleColumns.status && <Th align="center">Status</Th>}
                      {visibleColumns.actions && <Th align="center">Actions</Th>}
                    </tr>
                  </Thead>
                  <Tbody>
                    {paginatedBills.map((p) => {
                      const isPaid = Number(p.balance_amount) <= 0;
                      return (
                        <Tr key={p.id}>
                          {visibleColumns.date && (
                            <Td className="text-slate-600 whitespace-nowrap">
                              {p.purchase_date}
                            </Td>
                          )}
                          {visibleColumns.bill_no && (
                            <Td className="font-bold text-slate-900 whitespace-nowrap font-mono">
                              {p.purchase_no || "N/A"}
                            </Td>
                          )}
                          {visibleColumns.total && (
                            <Td align="right" className="font-semibold text-slate-800">
                              ₹{fmt(p.total_amount)}
                            </Td>
                          )}
                          {visibleColumns.paid && (
                            <Td align="right" className="font-semibold text-emerald-600">
                              ₹{fmt(p.paid_amount)}
                            </Td>
                          )}
                          {visibleColumns.pending && (
                            <Td align="right">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                                  isPaid
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                ₹{fmt(p.balance_amount)}
                              </span>
                            </Td>
                          )}
                          {visibleColumns.status && (
                            <Td align="center">
                              <TableStatusBadge
                                variant={p.status === "submitted" ? "success" : "warning"}
                                label={p.status}
                              />
                            </Td>
                          )}
                          {visibleColumns.actions && (
                            <Td align="center">
                              <div className="flex items-center justify-center gap-1.5">
                                {p.status === "draft" ? (
                                  <>
                                    <button
                                      onClick={() => navigate(`/purchases/edit/${p.id}`)}
                                      title="Edit Draft"
                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition cursor-pointer"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(p.id)}
                                      title="Delete Draft"
                                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => navigate(`/purchases/edit/${p.id}`)}
                                      title="View Details"
                                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition cursor-pointer"
                                    >
                                      <Eye size={14} />
                                    </button>
                                    <div className="relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveShareId(activeShareId === p.id ? null : p.id);
                                        }}
                                        title="Share Invoice"
                                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                                      >
                                        <Share2 size={14} />
                                      </button>
                                      <ShareTransactionPopover
                                        isOpen={activeShareId === p.id}
                                        onClose={() => setActiveShareId(null)}
                                        transaction={p}
                                        type="Purchase Bill"
                                      />
                                    </div>
                                    {Number(p.balance_amount) > 0 && (
                                      <button
                                        onClick={() => openPayModal(p)}
                                        title="Pay Pending Balance"
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition cursor-pointer"
                                      >
                                        <CreditCard size={14} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </Td>
                          )}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredBills.length}
                  rowsPerPage={rowsPerPage}
                  onPageChange={(page) => setCurrentPage(page)}
                  onRowsPerPageChange={(size) => {
                    setRowsPerPage(size);
                    setCurrentPage(1);
                  }}
                  itemLabel="invoices"
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── PAY MODAL ── */}
      {showPayModal && paymentPurchase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Supplier Payment</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bill No: <span className="font-semibold text-slate-700">{paymentPurchase.purchase_no || "N/A"}</span>
                </p>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={submitPayment} className="p-5 flex flex-col gap-4">
              {/* Balances Display */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                <div>
                  <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Paid Amount</span>
                  <div className="text-base font-bold text-amber-900">₹{fmt(paymentPurchase.paid_amount)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-rose-800 font-bold uppercase tracking-wider">Pending Balance</span>
                  <div className="text-base font-bold text-rose-700">₹{fmt(paymentPurchase.balance_amount)}</div>
                </div>
              </div>

              {/* Pay Amount input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={Number(paymentPurchase.balance_amount)}
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm font-semibold"
                />
              </div>

              {/* Payment Method select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white text-slate-700"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer / Netbanking</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              {/* Payment Date input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Notes / Reference</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. UPI Transaction ID or Cheque No."
                  rows="2"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {submittingPayment ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUPPLIER PAYMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 overflow-hidden shadow-xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Payment History</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    All payments recorded for <strong>{selectedSupplier?.supplier_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Summary bar */}
              {!loadingHistory && paymentHistory.length > 0 && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-6 items-center">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Total Paid</span>
                    <div className="text-base font-bold text-emerald-700">
                      ₹{fmt(paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transactions</span>
                    <div className="text-base font-bold text-slate-800">{paymentHistory.length}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body Table */}
            <div className="overflow-y-auto flex-1 p-0">
              {loadingHistory ? (
                <TableLoadingState message="Loading payment records..." />
              ) : paymentHistory.length === 0 ? (
                <TableEmptyState
                  title="No Payment Records"
                  description="No payment records found for this supplier yet."
                />
              ) : (
                <Table>
                  <Thead>
                    <tr>
                      <Th>Bill No</Th>
                      <Th>Invoice Date</Th>
                      <Th>Pay Date</Th>
                      <Th align="right">Amount Paid</Th>
                      <Th align="center">Method</Th>
                      <Th>Notes</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {paymentHistory.map((h) => (
                      <Tr key={h.id}>
                        <Td className="font-bold text-slate-900 font-mono">
                          {h.purchase_no || "N/A"}
                        </Td>
                        <Td className="text-slate-500">{h.invoice_date || "-"}</Td>
                        <Td className="text-slate-700 font-medium">{h.payment_date}</Td>
                        <Td align="right" className="font-bold text-emerald-600">
                          ₹{fmt(h.amount)}
                        </Td>
                        <Td align="center">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                            {h.payment_method}
                          </span>
                        </Td>
                        <Td className="text-slate-500 text-xs">{h.notes || "-"}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── BULK PAY MODAL ── */}
      {showBulkPayModal && selectedSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl max-h-[88vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex-shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Wallet size={18} className="text-amber-600" />
                    <span>Pay All Pending</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Payment will be split across pending invoices oldest-first (FIFO) for{" "}
                    <strong>{selectedSupplier.supplier_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkPayModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Summary row */}
              <div className="mt-3 flex gap-3">
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 text-center flex-1">
                  <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                    Total Pending
                  </div>
                  <div className="text-base font-bold text-rose-700">
                    ₹{fmt(selectedSupplierPendingTotal)}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-center flex-1">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Pending Invoices
                  </div>
                  <div className="text-base font-bold text-emerald-700">
                    {
                      supplierBills.filter(
                        (p) => Number(p.balance_amount) > 0 && p.status === "submitted"
                      ).length
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Form + Preview */}
            <form
              onSubmit={submitBulkPayment}
              className="flex-1 overflow-y-auto flex flex-col"
            >
              <div className="p-5 flex flex-col gap-3.5">
                {/* Amount Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedSupplierPendingTotal}
                    required
                    value={bulkAmount}
                    onChange={(e) => handleBulkAmountChange(e.target.value)}
                    placeholder={`Max: ₹${fmt(selectedSupplierPendingTotal)}`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold"
                  />
                </div>

                {/* Method + Date row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Payment Method</label>
                    <select
                      value={bulkMethod}
                      onChange={(e) => setBulkMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs bg-white text-slate-700"
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-600">Payment Date</label>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600">Notes / Reference</label>
                  <input
                    type="text"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="e.g. Cheque No. or UPI Ref."
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none text-xs text-slate-700"
                  />
                </div>

                {/* Live Split Preview */}
                {bulkPreview.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden mt-1">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      📊 Distribution Preview (FIFO – Oldest Invoice First)
                    </div>
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                          <th className="py-2 px-3">Bill No</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Pending</th>
                          <th className="py-2 px-3">Applying</th>
                          <th className="py-2 px-3">New Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {bulkPreview.map((p) => {
                          const willPay = Number(p._applying) > 0;
                          const fullyClear = Number(p._newBalance) <= 0;
                          return (
                            <tr
                              key={p.id}
                              className={
                                willPay
                                  ? fullyClear
                                    ? "bg-emerald-50/50"
                                    : "bg-amber-50/40"
                                  : "bg-white"
                              }
                            >
                              <td className="py-2 px-3 font-bold text-slate-900 font-mono">
                                {p.purchase_no || "N/A"}
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px]">
                                {p.purchase_date}
                              </td>
                              <td className="py-2 px-3 text-rose-600 font-semibold">
                                ₹{fmt(p.balance_amount)}
                              </td>
                              <td className="py-2 px-3 font-bold text-emerald-600">
                                {willPay ? `₹${fmt(p._applying)}` : "—"}
                              </td>
                              <td className="py-2 px-3 font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] ${
                                    fullyClear
                                      ? "bg-emerald-100 text-emerald-800"
                                      : willPay
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {fullyClear ? "✓ Cleared" : `₹${fmt(p._newBalance)}`}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowBulkPayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk || !bulkAmount || Number(bulkAmount) <= 0}
                  className="flex-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Wallet size={15} />
                  <span>
                    {submittingBulk
                      ? "Processing..."
                      : `Record Payment of ₹${
                          bulkAmount
                            ? fmt(
                                Math.min(
                                  Number(bulkAmount),
                                  selectedSupplierPendingTotal
                                )
                              )
                            : "0"
                        }`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        companyId={selectedCompany}
        onSupplierAdded={(newSupplier) => {
          fetchPurchasesAndSuppliers(selectedCompany);
          if (newSupplier && newSupplier.id) {
            setSelectedSupplier(newSupplier);
          }
        }}
      />

      {/* Table Column Customizer Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide columns in Purchase Bills table"
      />
    </div>
  );
}
