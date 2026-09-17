//whatsapp
import { Children, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
  Pencil, Search, Phone, MapPin, Download, Wallet,
  CheckCircle, ChevronRight, IndianRupee, X, MessageCircle, History, Filter
} from "lucide-react";
import CustomerForm from "./CustomerForm"; // <-- import the form
import EditCustomer from "./EditCustomer"; // <-- import the edit form (opens as popup modal)
import { Table, Thead, Th, Tbody, Tr, Td, TableStatusBadge, TableEmptyState, TableLoadingState } from "../../components/table";

/* ─────────────────── helpers ─────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date.replace(" ", "T")).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

/* Smart FIFO distribution */
const distributePayment = (pendingInvoices, totalAmount) => {
  let remaining = Number(totalAmount);
  return pendingInvoices.map((inv) => {
    const bal = Number(inv.balance_amount);
    if (remaining <= 0) return { ...inv, _applying: 0, _newBalance: bal };
    const applying = Math.min(remaining, bal);
    remaining -= applying;
    return { ...inv, _applying: applying, _newBalance: bal - applying };
  });
};

/* ─────────────────── component ─────────────────── */
export default function CustomerList() {
  const navigate = useNavigate();

  const [customers, setCustomers]             = useState([]);
  const [search, setSearch]                   = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [invoiceHistory, setInvoiceHistory]   = useState([]);
  const [allHistory, setAllHistory]           = useState([]);
  const [toast, setToast]                     = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory]     = useState([]);
  const [loadingHistory, setLoadingHistory]     = useState(false);

  /* collect popup */
  const [showCollect, setShowCollect]         = useState(false);
  const [collectAmount, setCollectAmount]     = useState("");
  const [collectMethod, setCollectMethod]     = useState("cash");
  const [collectDate, setCollectDate]         = useState(new Date().toISOString().split("T")[0]);
  const [collectNotes, setCollectNotes]       = useState("");
  const [collecting, setCollecting]           = useState(false);
  const [preview, setPreview]                 = useState([]);

  const [sendingReminder, setSendingReminder] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));
  const admin_id = user?.id;

  const [selectedRows, setSelectedRows] = useState([]);

  // Modal state for adding customer
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal state for editing customer (popup instead of navigate)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState(null);

  // 3-dot dropdown menu state
  const [menuOpen, setMenuOpen] = useState(false);

  // View customer modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const loadCompanies = async () => {
    try {
      const user = JSON.parse(
        localStorage.getItem("user")
      );
      const res = await api.get(
        `/company/get_companies_by_admin?admin_id=${user.id}`
      );
      if (res.data.status) {
        setCompanies(res.data.data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  /* ── toast ── */
  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get(
        `/customer/get_all_customer?admin_id=${admin_id}`
      );
      if (res.data.status) {
        setCustomers(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedCustomer(res.data.data[0]);
          fetchCustomerHistory(res.data.data[0].id);
        }
      }
    } catch (err) { console.log(err); }
  };

  // fetchAllHistory — use admin_id
  const fetchAllHistory = async () => {
    try {
      const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
      if (res.data.status) setAllHistory(res.data.data);
    } catch (err) { console.log(err); }
  };

  // fetchCustomerHistory — use admin_id
  const fetchCustomerHistory = async (customerId) => {
    try {
      const res = await api.get(`/invoice/get_pending_invoice_history?admin_id=${admin_id}`);
      if (res.data.status) {
        setInvoiceHistory(
          res.data.data.filter(
            (item) => Number(item.customer_id) === Number(customerId)
          )
        );
      }
    } catch (err) { console.log(err); }
  };

  const handleCompanyChange = async (e) => {
    const companyId = e.target.value;
    setSelectedCompany(companyId);
    localStorage.setItem(
      "selected_company_id",
      companyId
    );
    fetchCustomers(companyId);
    fetchAllHistory(companyId);
  };

  useEffect(() => {
    fetchCustomers();
    fetchAllHistory();
  }, []);

  /* ── preview recalc ── */
  useEffect(() => {
    const pending = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
    // Sort oldest first (FIFO) for payment distribution preview
    const sortedPending = [...pending].sort((a, b) => {
      const da = new Date(a.created_at || a.invoice_date || 0);
      const db = new Date(b.created_at || b.invoice_date || 0);
      return da - db || a.id - b.id;
    });
    if (!collectAmount || Number(collectAmount) <= 0) { setPreview([]); return; }
    setPreview(distributePayment(sortedPending, collectAmount));
  }, [collectAmount, invoiceHistory]);

  /* ── derived ── */
  const getCustomerPendingTotal = (customerId) =>
    allHistory
      .filter((i) => Number(i.customer_id) === Number(customerId))
      .reduce((s, i) => s + Number(i.balance_amount || 0), 0);

  const pendingInvoices = invoiceHistory.filter((i) => Number(i.balance_amount) > 0);
  const totalPending    = pendingInvoices.reduce((s, i) => s + Number(i.balance_amount), 0);

  /* ── open popup ── */
  const openCollect = () => {
    setCollectAmount("");
    setCollectMethod("cash");
    setCollectDate(new Date().toISOString().split("T")[0]);
    setCollectNotes("");
    setPreview([]);
    setShowCollect(true);
  };

  /* ── bulk collect ── */
  const handleBulkCollect = async () => {
    if (!collectAmount || Number(collectAmount) <= 0) { showToast("Enter a valid amount", false); return; }

    setCollecting(true);
    try {
      const res = await api.post("/invoice/pay_customer_bulk", {
        company_id:     selectedCompany,
        customer_id:    selectedCustomer.id,
        amount:         Number(collectAmount),
        payment_method: collectMethod,
        payment_date:   collectDate,
        notes:          collectNotes,
      });

      if (res.data.status) {
        showToast("Payment collected successfully", true);
        setShowCollect(false);
        setCollectAmount("");
        setPreview([]);
        fetchCustomerHistory(selectedCustomer.id);
        fetchAllHistory();
      } else {
        showToast(res.data.message || "Failed to collect payment", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Server error, please retry", false);
    } finally {
      setCollecting(false);
    }
  };

  // Open customer payment history modal
  const openCustomerHistoryModal = async (cust) => {
    setPaymentHistory([]);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/invoice/get_customer_payments?customer_id=${cust.id}`);
      if (res.data.status) {
        setPaymentHistory(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open view customer modal with all details
  const openViewCustomer = async (cust) => {
    setShowViewModal(true);
    setViewCustomer(null);
    setViewLoading(true);
    setMenuOpen(false);
    try {
      const res = await api.get(`/customer/get_customer_by_id?id=${cust.id}`);
      if (res.data.status) {
        setViewCustomer(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setViewLoading(false);
    }
  };

  /* ── excel ── */
  const downloadExcel = () => {
    const source = selectedRows.length > 0
      ? invoiceHistory.filter((_, i) => selectedRows.includes(i))
      : invoiceHistory;

    const rows = source.map((item) => ({
      "Payment Method": item.payment_method || "-",
      Total: item.total_amount,
      Paid: item.paid_amount_total,
      Pending: item.balance_amount,
      "Due Date": item.due_date ? formatDate(item.due_date) : "-",
      Status: Number(item.balance_amount) <= 0 ? "Paid" : "Not Paid",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [18, 15, 15, 15, 18, 18].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `${selectedCustomer?.name || "customer"}_report.xlsx`
    );
  };

  const filtered = customers.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  const sendCustomerReminder = async () => {
    if (!selectedCustomer) return;
    const pendingInvoices = invoiceHistory.filter(
      item =>
        Number(item.balance_amount) > 0 &&
        item.payment_method === "credit"
    );
    if (pendingInvoices.length === 0) {
      showToast("No pending invoices found.", false);
      return;
    }
    setSendingReminder(true);
    try {
      for (const item of pendingInvoices) {
        await api.post("/whatsapp/send_reminder", {
          invoice_no: item.invoice_no,
          phone: selectedCustomer.phone,
          name: selectedCustomer.name,
          amount: item.balance_amount,
          due_date: item.due_date,
          template_name: "hello_world"
        });
      }
      showToast(
        `Reminder sent for ${pendingInvoices.length} pending invoice(s).`
      );
    } catch (err) {
      console.log(err);
      showToast(
        "Unable to send reminder.",
        false
      );
    } finally {
      setSendingReminder(false);
    }
  };

  /* ════════════════════════════════════════════ */
  return (
    <>
      <style>{`
        @keyframes toastIn  { from{opacity:0;transform:translateY(-10px) scale(.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes popIn    { from{opacity:0;transform:scale(.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .cust-row:hover     { background:#f8fafc !important; }
        .collect-btn:hover  { background:#1d4ed8 !important; transform:translateY(-1px); }
        .method-btn:hover   { border-color:#2563eb !important; color:#2563eb !important; }
        .quick-btn:hover    { background:#dbeafe !important; }
        .close-btn:hover    { background:#f1f5f9 !important; }
      `}</style>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed", top:20, right:20, zIndex:99999,
          background: toast.ok ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "linear-gradient(135deg,#dc2626,#ef4444)",
          color:"#fff", padding:"13px 20px", borderRadius:14,
          boxShadow:"0 10px 30px rgba(0,0,0,.2)",
          display:"flex", alignItems:"center", gap:10,
          fontWeight:600, fontSize:14, animation:"toastIn .25s ease"
        }}>
          <div style={{
            width:22, height:22, borderRadius:7, background:"rgba(255,255,255,.22)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700
          }}>
            {toast.ok ? "✓" : "✕"}
          </div>
          {toast.msg}
        </div>
      )}

      {/* ── COLLECT PAYMENT POPUP ── */}
      {showCollect && selectedCustomer && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowCollect(false); }}
          style={{
            position:"fixed", inset:0, zIndex:9999,
            background:"rgba(15,23,42,.55)",
            backdropFilter:"blur(4px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:20
          }}
        >
          <div style={{
            background:"#fff", borderRadius:20,
            width:"100%", maxWidth:620,
            maxHeight:"88vh",
            display:"flex", flexDirection:"column",
            boxShadow:"0 25px 50px -12px rgba(0,0,0,0.15)",
            overflow:"hidden"
          }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(135deg, #eff6ff, #dbeafe)", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <Wallet size={20} color="#2563eb" /> Collect Customer Payment
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#475569" }}>
                    Payment will be split across pending invoices oldest-first (FIFO) for <strong>{selectedCustomer.name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowCollect(false)}
                  style={{ border: "none", background: "#f1f5f9", color: "#475569", padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  ✕ Cancel
                </button>
              </div>

              {/* Summary row */}
              <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Total Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>₹{fmt(totalPending)}</div>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Pending Invoices</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }}>
                    {pendingInvoices.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Form + Preview */}
            <div style={{ overflowY:"auto", flex:1 }}>
              <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Amount Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Amount to Collect (₹) *</label>
                  <div style={{ position: "relative" }}>
                    <IndianRupee size={16} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      placeholder={`Total Pending: ₹${fmt(totalPending)}`}
                      style={{
                        width: "100%", padding: "11px 14px 11px 36px", borderRadius: "10px",
                        border: "1.5px solid #e2e8f0", outline: "none", fontSize: "16px",
                        fontWeight: "700", boxSizing: "border-box"
                      }}
                    />
                  </div>
                  {/* Excess balance notice banner */}
                  {Number(collectAmount) > totalPending && (
                    <div style={{
                      background: "#eff6ff", border: "1.5px solid #bfdbfe",
                      borderRadius: 10, padding: "10px 12px", color: "#1e40af",
                      fontSize: "12px", fontWeight: "600", marginTop: 4, display: "flex", gap: 6, alignItems: "center"
                    }}>
                      ℹ️ Excess of <strong>₹{fmt(Number(collectAmount) - totalPending)}</strong> will be saved as advance balance.
                    </div>
                  )}
                  {/* Quick percentage helper buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    {[25, 50, 100].map((pct) => {
                      const val = Math.round(totalPending * pct / 100);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCollectAmount(String(val))}
                          style={{
                            flex: 1, padding: "6px 0", fontSize: "12px", fontWeight: 700,
                            background: "#eff6ff", color: "#2563eb",
                            border: "1.5px solid #bfdbfe", borderRadius: 8, cursor: "pointer",
                            transition: "background .15s"
                          }}
                        >
                          {pct}% (₹{fmt(val)})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Method + Date row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Method</label>
                    <select
                      value={collectMethod}
                      onChange={(e) => setCollectMethod(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="loyalty">Loyalty</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Date</label>
                    <input
                      type="date"
                      value={collectDate}
                      onChange={(e) => setCollectDate(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Notes / Reference</label>
                  <input
                    type="text"
                    value={collectNotes}
                    onChange={(e) => setCollectNotes(e.target.value)}
                    placeholder="e.g. Transaction ID, Cheque No or bank remarks."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                {/* Live Split Preview */}
                {preview.length > 0 && (
                  <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden", marginTop: 4 }}>
                    <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      📊 Distribution Preview (FIFO – Oldest Invoices First)
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Invoice No</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Due Date</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Pending</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Applying</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>New Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((p, idx) => {
                          const willPay = Number(p._applying) > 0;
                          const fullyClear = Number(p._newBalance) <= 0;
                          return (
                            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: willPay ? (fullyClear ? "#f0fdf4" : "#fffbeb") : "#fff" }}>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                {p.invoice_no || "N/A"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "12px", color: "#64748b" }}>
                                {p.due_date ? formatDate(p.due_date) : "-"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", color: "#dc2626", fontWeight: "600" }}>
                                ₹{fmt(p.balance_amount)}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700", color: willPay ? "#16a34a" : "#94a3b8" }}>
                                {willPay ? `₹${fmt(p._applying)}` : "—"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700" }}>
                                <span style={{
                                  padding: "3px 8px", borderRadius: 20, fontSize: 12,
                                  background: fullyClear ? "#dcfce7" : (willPay ? "#fef9c3" : "#f1f5f9"),
                                  color: fullyClear ? "#15803d" : (willPay ? "#92400e" : "#94a3b8")
                                }}>
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
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowCollect(false)}
                style={{
                  flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1",
                  background: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCollect}
                disabled={collecting || !collectAmount || Number(collectAmount) <= 0}
                style={{
                  flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                  background: collecting ? "#94a3b8" : "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#ffffff", fontWeight: "700", fontSize: "14px", cursor: collecting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                <Wallet size={16} />
                {collecting ? "Processing..." : `Collect ₹${collectAmount ? fmt(Math.min(Number(collectAmount), totalPending)) : "0"}`}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── ADD CUSTOMER MODAL ── */}
      {showAddModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{width: "100%" }}>
            <CustomerForm
              onSuccess={() => {
                setShowAddModal(false);
                fetchCustomers();
                fetchAllHistory();
              }}
              onCancel={() => setShowAddModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── EDIT CUSTOMER MODAL ── */}
      {showEditModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "100%" }}>
            <EditCustomer
              customerId={editCustomerId}
              onSuccess={() => {
                setShowEditModal(false);
                fetchCustomers();
                fetchAllHistory();
              }}
              onCancel={() => setShowEditModal(false)}
            />
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">

        {/* HEADER */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Customers</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage your customer directories & payment ledgers</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={downloadExcel} className="app-btn-secondary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer">
              <Download size={15}/>
              <span>{selectedRows.length > 0 ? `Download (${selectedRows.length})` : "Excel Download"}</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="app-btn-primary h-9 px-4 rounded-xl text-sm font-semibold shadow-sm cursor-pointer">
              + Add Customer
            </button>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">

          {/* ── LEFT: Customer Directory ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col h-[calc(100vh-140px)]">
            <div className="p-3 border-b border-slate-100 relative">
              <Search size={14} className="absolute top-1/2 left-6 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
              />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {filtered.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      fetchCustomerHistory(c.id);
                      setCollectAmount("");
                      setPreview([]);
                      setSelectedRows([]);
                    }}
                    className={`p-3.5 cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-blue-50/80 border-l-4 border-blue-600 font-bold"
                        : "hover:bg-slate-50 border-l-4 border-transparent text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>{c.phone}</span>
                          {Number(c.advance_balance || 0) > 0 && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                              Adv: ₹{fmt(c.advance_balance)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Customer Ledger & Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col min-h-[500px]">

            {/* customer info + collect button */}
            {selectedCustomer && (
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/40">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3.5">
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-slate-900 truncate">
                      {selectedCustomer.name}
                    </h2>
                    <div className="flex flex-col gap-0.5 text-xs text-slate-500 mt-1 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" /> {selectedCustomer.phone}
                      </span>
                      {selectedCustomer.address && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400" /> {selectedCustomer.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* RIGHT side: pending badge + send reminder + payment history + collect payment + edit in ONE neat line */}
                  <div className="flex items-center gap-2.5 flex-nowrap overflow-x-auto max-w-full flex-shrink-0 py-0.5">

                    {/* pending badge */}
                    {totalPending > 0 && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl px-4 py-1.5 text-center flex-shrink-0">
                        <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                          PENDING
                        </div>
                        <div className="text-base font-black text-rose-600 leading-tight">
                          ₹{fmt(totalPending)}
                        </div>
                      </div>
                    )}

                    {/* advance badge */}
                    {Number(selectedCustomer.advance_balance || 0) > 0 && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-1.5 text-center flex-shrink-0">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          ADVANCE
                        </div>
                        <div className="text-base font-black text-emerald-600 leading-tight">
                          ₹{fmt(selectedCustomer.advance_balance)}
                        </div>
                      </div>
                    )}

                    {/* Send Reminder Button (Double line text) */}
                    {totalPending > 0 && (
                      <button
                        onClick={sendCustomerReminder}
                        disabled={sendingReminder}
                        className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 flex-shrink-0"
                      >
                        <MessageCircle size={15} />
                        <span className="flex flex-col text-left leading-tight font-bold">
                          <span>Send</span>
                          <span>Reminder</span>
                        </span>
                      </button>
                    )}

                    {/* Payment History Button (Double line text) */}
                    <button
                      onClick={() => openCustomerHistoryModal(selectedCustomer)}
                      className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition cursor-pointer flex-shrink-0"
                    >
                      <History size={15} />
                      <span className="flex flex-col text-left leading-tight font-bold">
                        <span>Payment</span>
                        <span>History</span>
                      </span>
                    </button>

                    {/* Collect Payment Button (Double line text) */}
                    {totalPending > 0 && (
                      <button
                        onClick={openCollect}
                        className="app-btn-primary px-3.5 py-1.5 rounded-2xl text-xs font-bold shadow-xs transition cursor-pointer flex-shrink-0"
                      >
                        <Wallet size={15} />
                        <span className="flex flex-col text-left leading-tight font-bold">
                          <span>Collect</span>
                          <span>Payment</span>
                        </span>
                      </button>
                    )}

                    {/* Edit Customer Button after Collect Payment */}
                    <button
                      onClick={() => {
                        setEditCustomerId(selectedCustomer.id);
                        setShowEditModal(true);
                      }}
                      className="w-9 h-9 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer flex-shrink-0"
                      title="Edit Customer"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Standardized Table */}
            <div className="overflow-x-auto flex-1">
              <Table>
                <Thead>
                  <tr>
                    <Th align="center" showFilter={false} className="w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                        checked={invoiceHistory.length > 0 && selectedRows.length === invoiceHistory.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(invoiceHistory.map((_, i) => i));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                      />
                    </Th>
                    <Th>Payment Method</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Pending</Th>
                    <Th>Due Date</Th>
                    <Th align="center">Status</Th>
                  </tr>
                </Thead>

                <Tbody>
                  {invoiceHistory.length === 0 ? (
                    <TableEmptyState
                      colSpan={7}
                      title="No Billing Records"
                      description="This customer has no billing or payment history records yet."
                    />
                  ) : (
                    invoiceHistory.map((item, index) => {
                      const isPaid = Number(item.balance_amount) <= 0;
                      const isChecked = selectedRows.includes(index);
                      return (
                        <Tr
                          key={index}
                          active={isChecked}
                          onClick={() => {
                            setSelectedRows(prev =>
                              prev.includes(index)
                                ? prev.filter(i => i !== index)
                                : [...prev, index]
                            );
                          }}
                        >
                          <Td align="center" onClick={(e) => e.stopPropagation()} className="w-10">
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedRows(prev =>
                                  prev.includes(index)
                                    ? prev.filter(i => i !== index)
                                    : [...prev, index]
                                );
                              }}
                            />
                          </Td>
                          <Td className="font-semibold capitalize text-slate-800">
                            {item.payment_method || "-"}
                          </Td>
                          <Td align="right" className="font-bold text-slate-900">
                            ₹{fmt(item.total_amount)}
                          </Td>
                          <Td align="right" className="font-bold text-emerald-700">
                            ₹{fmt(item.paid_amount_total)}
                          </Td>
                          <Td align="right">
                            <span className={`font-bold ${isPaid ? "text-slate-600" : "text-rose-600"}`}>
                              ₹{fmt(item.balance_amount)}
                            </span>
                          </Td>
                          <Td className="text-slate-600">
                            {item.due_date ? formatDate(item.due_date) : "-"}
                          </Td>
                          <Td align="center">
                            <TableStatusBadge status={isPaid ? "Paid" : "Unpaid"} />
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* ── CUSTOMER PAYMENT HISTORY MODAL ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[10000] p-4 font-sans">
          <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-200 overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Payment History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All recorded payments for <strong className="text-slate-800">{selectedCustomer?.name}</strong>
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Table */}
            <div className="overflow-y-auto flex-1">
              <Table>
                <Thead>
                  <tr>
                    <Th>Bill No</Th>
                    <Th>Bill Date</Th>
                    <Th>Pay Date</Th>
                    <Th align="right">Amount Paid</Th>
                    <Th>Method</Th>
                    <Th>Notes</Th>
                  </tr>
                </Thead>

                <Tbody>
                  {loadingHistory ? (
                    <TableLoadingState colSpan={6} message="Loading payment records..." />
                  ) : paymentHistory.length === 0 ? (
                    <TableEmptyState
                      colSpan={6}
                      title="No Payment Records"
                      description="No payment transactions recorded for this customer yet."
                    />
                  ) : (
                    paymentHistory.map((h) => (
                      <Tr key={h.id}>
                        <Td className="font-bold text-slate-900">{h.invoice_no || "N/A"}</Td>
                        <Td className="text-slate-600">{h.invoice_date ? formatDate(h.invoice_date) : "-"}</Td>
                        <Td className="text-slate-600">{h.payment_date ? formatDate(h.payment_date) : "-"}</Td>
                        <Td align="right" className="font-bold text-emerald-700">₹{fmt(h.amount)}</Td>
                        <Td className="capitalize font-semibold text-slate-700">{h.payment_method}</Td>
                        <Td className="text-slate-500">{h.notes || "-"}</Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW CUSTOMER MODAL ── */}
      {showViewModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowViewModal(false); }}
          style={{
            position:"fixed", inset:0, zIndex:10000,
            background:"rgba(15,23,42,.55)",
            backdropFilter:"blur(4px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            padding:20, fontFamily:"Inter, sans-serif"
          }}
        >
          <div style={{
            background:"#fff", borderRadius:20, width:"100%", maxWidth:680,
            maxHeight:"88vh", display:"flex", flexDirection:"column",
            boxShadow:"0 25px 50px -12px rgba(0,0,0,0.15)", overflow:"hidden"
          }}>
            {/* Header */}
            <div style={{
              padding:"20px 24px", borderBottom:"1px solid #e2e8f0",
              background:"linear-gradient(135deg, #eff6ff, #dbeafe)", flexShrink:0
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:"#0f172a", display:"flex", alignItems:"center", gap:8 }}>
                    <Eye size={20} color="#2563eb"/> Customer Details
                  </h3>
                  <p style={{ margin:"4px 0 0", fontSize:13, color:"#475569" }}>
                    {viewCustomer ? viewCustomer.name : "Loading..."}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  style={{ border:"none", background:"#f1f5f9", color:"#475569", padding:"8px 14px", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer" }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Body */}
            <div style={{ overflowY:"auto", flex:1, padding:"20px 24px" }}>
              {viewLoading ? (
                <div style={{ textAlign:"center", padding:"40px", color:"#64748b", fontSize:13, fontWeight:500 }}>
                  Loading customer details...
                </div>
              ) : viewCustomer ? (
                <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
                  {/* Basic info */}
                  <Section title="Basic Information" icon="👤">
                    <Row label="Name" value={viewCustomer.name} />
                    <Row label="Phone" value={viewCustomer.phone} />
                    <Row label="Email" value={viewCustomer.email} />
                    <Row label="State" value={viewCustomer.state} />
                    <Row label="Date of Birth" value={viewCustomer.date_of_birth && formatDate(viewCustomer.date_of_birth)} />
                  </Section>

                  {/* GST info */}
                  <Section title="GST Details" icon="🧾">
                    <Row label="GST Type" value={viewCustomer.type} />
                    <Row label="GSTIN" value={viewCustomer.gst_no} />
                    <Row label="PAN Number" value={viewCustomer.pan_number} />
                  </Section>

                  {/* Billing address */}
                  <Section title="Billing Address" icon="🏠">
                    <Row label="Address" value={viewCustomer.address || viewCustomer.address_line1} />
                    {viewCustomer.address_line1 && viewCustomer.address_line1 !== viewCustomer.address && (
                      <Row label="Address Line 1" value={viewCustomer.address_line1} />
                    )}
                    <Row label="Address Line 2" value={viewCustomer.address_line2} />
                    <Row label="City" value={viewCustomer.city} />
                    <Row label="Country" value={viewCustomer.billing_country} />
                    <Row label="Pincode" value={viewCustomer.billing_pincode} />
                  </Section>

                  {/* Shipping address */}
                  <Section title="Shipping Address" icon="🚚">
                    <Row label="Address" value={viewCustomer.shipping_address || viewCustomer.shipping_address_line1} />
                    <Row label="Address Line 2" value={viewCustomer.shipping_address_line2} />
                    <Row label="City" value={viewCustomer.shipping_city} />
                    <Row label="Country" value={viewCustomer.shipping_country} />
                    <Row label="Pincode" value={viewCustomer.shipping_pincode} />
                  </Section>

                  {/* Credit & balance */}
                  <Section title="Credit & Balance" icon="💳">
                    <Row
                      label="Credit Enabled"
                      value={Number(viewCustomer.credit_enabled) === 1 ? "Yes" : "No"}
                      valueStyle={{ color: Number(viewCustomer.credit_enabled) === 1 ? "#16a34a" : "#64748b" }}
                    />
                    {Number(viewCustomer.credit_enabled) === 1 && (
                      <>
                        <Row label="Credit Limit" value={`₹${fmt(viewCustomer.credit_limit)}`} />
                        <Row label="Credit Days" value={`${viewCustomer.credit_days || 0} days`} />
                      </>
                    )}
                    <Row label="Advance Balance" value={`₹${fmt(viewCustomer.advance_balance)}`} />
                    <Row label="Pending Amount" value={`₹${fmt(viewCustomer.pending_amount)}`} />
                    <Row label="Account Number" value={viewCustomer.account_number} />
                  </Section>
                </div>
              ) : (
                <div style={{ textAlign:"center", padding:"40px", color:"#94a3b8" }}>
                  Failed to load customer details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const card = {
  background:"#fff", borderRadius:14,
  border:"1px solid #e5e7eb",
  display:"flex", flexDirection:"column",
};
const btnGreen = {
  background:"#16a34a", color:"#fff", border:"none",
  borderRadius:10, padding:"10px 16px",
  fontWeight:700, cursor:"pointer",
  display:"flex", alignItems:"center", gap:7, fontSize:13
};
const btnRed = {
  background:"#ef4444", color:"#fff", border:"none",
  borderRadius:10, padding:"10px 16px",
  fontWeight:700, cursor:"pointer", fontSize:13
};
const btnEdit = {
  background:"#eff6ff", border:"1px solid #dbeafe",
  width:44, height:44, borderRadius:12,
  cursor:"pointer", color:"#2563eb",
  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
};
const btnMenu = {
  background:"#f8fafc", border:"1.5px solid #e2e8f0",
  width:44, height:44, borderRadius:12,
  cursor:"pointer", color:"#475569",
  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  transition:"all .15s"
};
const menuItem = {
  width:"100%", background:"#fff", border:"none", textAlign:"left",
  padding:"10px 14px", fontSize:13, fontWeight:600, color:"#334155",
  cursor:"pointer", display:"flex", alignItems:"center", gap:10,
  fontFamily:"Inter, sans-serif"
};

const Section = ({ title, icon, children }) => {
  const hasData = Children.toArray(children).some((child) => {
    const value = child?.props?.value;
    return value !== null && value !== undefined && String(value).trim() !== "";
  });

  if (!hasData) return null;

  return (
    <div style={{ background:"#f8fafc", borderRadius:14, border:"1px solid #e2e8f0", padding:16 }}>
      <div style={{
        fontSize:12, fontWeight:800, color:"#0f172a", textTransform:"uppercase",
        letterSpacing:".5px", marginBottom:12, display:"flex", alignItems:"center", gap:6
      }}>
        <span>{icon}</span> {title}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:"8px 20px" }}>
        {children}
      </div>
    </div>
  );
};

const Row = ({ label, value, valueStyle }) => (
  value !== null && value !== undefined && String(value).trim() !== "" && <>
    <div style={{ fontSize:12.5, fontWeight:600, color:"#64748b" }}>{label}</div>
    <div style={{ fontSize:13, fontWeight:600, color:"#0f172a", wordBreak:"break-word", ...valueStyle }}>
      {value}
    </div>
  </>
);