import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Pencil, Trash2, Eye, FileSpreadsheet, History, CreditCard, Search, Phone, Mail, MapPin, Wallet } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");

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

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then(res => {
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
      let fetchedPurchases = [];
      if (pRes.data.status) {
        fetchedPurchases = pRes.data.data;
        setPurchases(fetchedPurchases);
      }

      // Fetch Suppliers
      const sRes = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (sRes.data.status) {
        const fetchedSuppliers = sRes.data.data;
        setSuppliers(fetchedSuppliers);
        
        // Auto-select first supplier if available
        if (fetchedSuppliers.length > 0) {
          setSelectedSupplier(fetchedSuppliers[0]);
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
        notes: payNotes
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
    const pendingBills = supplierBills.filter(p => Number(p.balance_amount) > 0 && p.status === "submitted");
    const sorted = [...pendingBills].sort((a, b) => {
      const da = new Date(a.purchase_date), db = new Date(b.purchase_date);
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
        notes: bulkNotes
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
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Get total pending amount for a supplier (submitted invoices only, drafts excluded)
  const getSupplierPendingTotal = (supplierId) => {
    return purchases
      .filter((p) => Number(p.supplier_id) === Number(supplierId) && p.status === "submitted")
      .reduce((sum, p) => sum + Number(p.balance_amount || 0), 0);
  };

  // Filter suppliers by sidebar search
  const filteredSuppliers = suppliers.filter((s) => {
    const name = s.supplier_name ? s.supplier_name.toLowerCase() : "";
    const phone = s.phone ? s.phone.toLowerCase() : "";
    return name.includes(supplierSearch.toLowerCase()) || phone.includes(supplierSearch.toLowerCase());
  });

  // Filter current supplier's purchase bills by search bar input
  const supplierBills = selectedSupplier
    ? purchases.filter((p) => Number(p.supplier_id) === Number(selectedSupplier.id))
    : [];

  const filteredBills = supplierBills.filter((p) => {
    const billNo = p.purchase_no ? p.purchase_no.toLowerCase() : "";
    return billNo.includes(search.toLowerCase());
  });

  // Calculated totals of selected supplier
  const selectedSupplierPendingTotal = selectedSupplier ? getSupplierPendingTotal(selectedSupplier.id) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: 20, fontFamily: "Inter, sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Supplier Purchases</h2>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 13 }}>Manage supplier purchase invoices, drafts, & credit payments</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => navigate("/purchases/reports")}
            style={{
              background: "#16a34a", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 7, fontSize: 13
            }}
          >
            <FileSpreadsheet size={15} /> GST Report
          </button>
          <button
            onClick={() => navigate("/purchases/new")}
            style={{
              background: "#ef4444", color: "#fff", border: "none",
              borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13
            }}
          >
            + Add Purchase
          </button>
        </div>
      </div>

      {/* Company Selector Buttons */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isActive ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5
                }}
              >
                <span>🏢</span> {c.company_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2-COLUMN SPLIT LAYOUT */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: 16,
        height: "calc(100vh - 150px)"
      }}>

        {/* ── LEFT PANEL: Suppliers List ── */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
          {/* Supplier Search */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #f1f5f9", position: "relative" }}>
            <Search size={15} style={{ position: "absolute", top: "50%", left: 24, transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              placeholder="Search supplier..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 34px",
                borderRadius: 10, border: "1px solid #e2e8f0",
                outline: "none", fontSize: 13, boxSizing: "border-box"
              }}
            />
          </div>
          {/* Suppliers List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No suppliers found</div>
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
                    }}
                    style={{
                      padding: "12px 14px", borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      background: isSelected ? "#eff6ff" : "#fff",
                      borderLeft: isSelected ? "3px solid #2563eb" : "3px solid transparent",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{s.supplier_name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{s.phone || "No phone"}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: pt > 0 ? "#ef4444" : "#94a3b8" }}>
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
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          
          {selectedSupplier && (
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
                    {selectedSupplier.supplier_name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                    <Phone size={13} /> {selectedSupplier.phone || "N/A"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", marginBottom: 4 }}>
                    <Mail size={13} /> {selectedSupplier.email || "N/A"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                    <MapPin size={13} /> {selectedSupplier.address || "No address"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  {/* Payment History Button */}
                  <button
                    onClick={() => openSupplierHistoryModal(selectedSupplier)}
                    style={{
                      background: "#f1f5f9", border: "1.5px solid #e2e8f0",
                      borderRadius: 10, padding: "8px 14px", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center",
                      gap: 6, fontSize: 13, color: "#475569"
                    }}
                  >
                    <History size={15} /> Payment History
                  </button>

                  {/* Pay All Pending Button – only show if supplier has pending balance */}
                  {selectedSupplierPendingTotal > 0 && (
                    <button
                      onClick={openBulkPayModal}
                      style={{
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        border: "none", borderRadius: 10, padding: "8px 16px",
                        fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center",
                        gap: 6, fontSize: 13, color: "#ffffff",
                        boxShadow: "0 4px 12px rgba(217,119,6,0.3)"
                      }}
                    >
                      <Wallet size={15} /> Pay All Pending
                    </button>
                  )}

                  {/* Total Pending Balance Badge */}
                  {selectedSupplierPendingTotal > 0 && (
                    <div style={{
                      background: "#fef2f2", border: "1px solid #fecaca",
                      borderRadius: 12, padding: "8px 16px", textAlign: "center"
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: ".5px" }}>
                        Pending Balance
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>
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
            <div style={{ padding: "12px 20px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
              <Search size={15} style={{ color: "#94a3b8" }} />
              <input
                placeholder="Search bills by Invoice/Bill No..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1, padding: "8px 12px",
                  borderRadius: 8, border: "1px solid #e2e8f0",
                  outline: "none", fontSize: 13
                }}
              />
            </div>
          )}

          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.2fr 1fr 1fr 1fr 1fr 1fr",
            padding: "11px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 700, fontSize: 12, color: "#64748b",
            textTransform: "uppercase", letterSpacing: ".5px",
            textAlign: "center", flexShrink: 0
          }}>
            <span style={{ textAlign: "left" }}>Date</span>
            <span style={{ textAlign: "left" }}>Bill No</span>
            <span>Total</span>
            <span>Paid</span>
            <span>Pending</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          {/* Invoice Table Rows */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {!selectedSupplier ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: 48, color: "#94a3b8", textAlign: "center"
              }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>🏢</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>No Supplier Selected</div>
                <p style={{ fontSize: 13, marginTop: 6, maxWidth: 300, lineHeight: 1.6 }}>
                  Select a supplier from the left sidebar to view purchase invoices and billing histories.
                </p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: 48, color: "#94a3b8", textAlign: "center"
              }}>
                <div style={{ fontSize: 52, marginBottom: 14 }}>📄</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>No Purchase Invoices</div>
                <p style={{ fontSize: 13, marginTop: 6, maxWidth: 300, lineHeight: 1.6 }}>
                  There are no purchase invoices matching your search for this supplier.
                </p>
              </div>
            ) : (
              filteredBills.map((p) => {
                const isPaid = Number(p.balance_amount) <= 0;
                return (
                  <div
                    key={p.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1fr 1fr 1fr 1fr 1fr",
                      padding: "14px 20px",
                      alignItems: "center", textAlign: "center",
                      borderBottom: "1px solid #f8fafc",
                      background: "#fff",
                      transition: "background .15s"
                    }}
                  >
                    <div style={{ textAlign: "left", fontSize: 13, color: "#334155" }}>
                      {p.purchase_date}
                    </div>
                    <div style={{ textAlign: "left", fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                      {p.purchase_no || "N/A"}
                    </div>
                    <div style={{ fontSize: 13, color: "#334155" }}>₹{fmt(p.total_amount)}</div>
                    <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>
                      ₹{fmt(p.paid_amount)}
                    </div>
                    <div>
                      <span style={{
                        background: isPaid ? "#f0fdf4" : "#fee2e2",
                        color: isPaid ? "#16a34a" : "#dc2626",
                        padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700
                      }}>
                        ₹{fmt(p.balance_amount)}
                      </span>
                    </div>
                    <div>
                      <span style={{
                        padding: "5px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: p.status === "submitted" ? "#dcfce7" : "#fee2e2",
                        color: p.status === "submitted" ? "#15803d" : "#dc2626",
                        display: "inline-block", minWidth: 72, textAlign: "center"
                      }}>
                        {p.status}
                      </span>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        {p.status === "draft" ? (
                          <>
                            <button
                              onClick={() => navigate(`/purchases/edit/${p.id}`)}
                              title="Edit Draft"
                              style={{
                                border: "none", background: "#f0fdf4", color: "#16a34a",
                                padding: "6px", borderRadius: "6px", cursor: "pointer", display: "flex"
                              }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              title="Delete Draft"
                              style={{
                                border: "none", background: "#fef2f2", color: "#dc2626",
                                padding: "6px", borderRadius: "6px", cursor: "pointer", display: "flex"
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`/purchases/edit/${p.id}`)}
                              title="View Details"
                              style={{
                                border: "none", background: "#eff6ff", color: "#2563eb",
                                padding: "6px", borderRadius: "6px", cursor: "pointer", display: "flex"
                              }}
                            >
                              <Eye size={14} />
                            </button>
                            {Number(p.balance_amount) > 0 && (
                              <button
                                onClick={() => openPayModal(p)}
                                title="Pay Pending Balance"
                                style={{
                                  border: "none", background: "#fef3c7", color: "#d97706",
                                  padding: "6px", borderRadius: "6px", cursor: "pointer", display: "flex"
                                }}
                              >
                                <CreditCard size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* ── PAY MODAL ── */}
      {showPayModal && paymentPurchase && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#ffffff", width: "100%", maxWidth: "450px",
            borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
          }}>
            <div style={{ padding: "20px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>Record Supplier Payment</h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                Bill No: <span style={{ fontWeight: "700", color: "#334155" }}>{paymentPurchase.purchase_no || "N/A"}</span>
              </p>
            </div>

            <form onSubmit={submitPayment} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
              
              {/* Balances Display */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "12px", background: "#fef3c7", borderRadius: "12px", border: "1px solid #fde68a" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Paid Amount</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#b45309" }}>₹{fmt(paymentPurchase.paid_amount)}</div>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "700", textTransform: "uppercase" }}>Pending Balance</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#dc2626" }}>₹{fmt(paymentPurchase.balance_amount)}</div>
                </div>
              </div>

              {/* Pay Amount input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={Number(paymentPurchase.balance_amount)}
                  min="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "10px",
                    border: "1.5px solid #e2e8f0", outline: "none", fontSize: "14px"
                  }}
                />
              </div>

              {/* Payment Method select */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "10px",
                    border: "1.5px solid #e2e8f0", outline: "none", fontSize: "14px", background: "#ffffff"
                  }}
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online Transfer / Netbanking</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card Payment</option>
                </select>
              </div>

              {/* Payment Date input */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  style={{
                    width: "100%", padding: "10px", borderRadius: "10px",
                    border: "1.5px solid #e2e8f0", outline: "none", fontSize: "14px"
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>Notes / Reference</label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. UPI Transaction ID or Cheque No."
                  rows="2"
                  style={{
                    width: "100%", padding: "10px", borderRadius: "10px",
                    border: "1.5px solid #e2e8f0", outline: "none", fontSize: "14px", fontFamily: "inherit"
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1",
                    background: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: "none",
                    background: "#10b981", color: "#ffffff", fontWeight: "700", fontSize: "14px", cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(16,185,129,0.15)"
                  }}
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
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#ffffff", width: "100%", maxWidth: "700px",
            borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            maxHeight: "80vh", display: "flex", flexDirection: "column"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                    Payment History
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    All payments recorded for <strong>{selectedSupplier?.supplier_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    border: "none", background: "#f1f5f9", color: "#475569",
                    padding: "8px 14px", borderRadius: 10, fontWeight: 700,
                    fontSize: 13, cursor: "pointer"
                  }}
                >
                  ✕ Close
                </button>
              </div>

              {/* Summary bar */}
              {!loadingHistory && paymentHistory.length > 0 && (
                <div style={{
                  marginTop: 12, background: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 10, padding: "10px 14px",
                  display: "flex", gap: 24, alignItems: "center"
                }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Total Paid</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#15803d" }}>
                      ₹{fmt(paymentHistory.reduce((s, h) => s + Number(h.amount || 0), 0))}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Transactions</span>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#334155" }}>{paymentHistory.length}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading payment records...</div>
              ) : paymentHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🧾</div>
                  No payment records found for this supplier yet.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Bill No</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Invoice Date</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Pay Date</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Amount Paid</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Method</th>
                      <th style={{ padding: "11px 16px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentHistory.map((h, idx) => (
                      <tr key={h.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#0f172a", fontWeight: "700" }}>
                          {h.purchase_no || "N/A"}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#64748b" }}>
                          {h.invoice_date || "-"}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#334155", fontWeight: "500" }}>
                          {h.payment_date}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#16a34a", fontWeight: "700" }}>
                          ₹{fmt(h.amount)}
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#475569", textTransform: "capitalize" }}>
                          <span style={{
                            padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: h.payment_method === "cash" ? "#f0fdf4" : "#eff6ff",
                            color: h.payment_method === "cash" ? "#15803d" : "#2563eb"
                          }}>
                            {h.payment_method}
                          </span>
                        </td>
                        <td style={{ padding: "11px 16px", fontSize: "13px", color: "#64748b" }}>
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

      {/* ── BULK PAY MODAL ── */}
      {showBulkPayModal && selectedSupplier && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#ffffff", width: "100%", maxWidth: "620px",
            borderRadius: "20px", border: "1px solid #e2e8f0",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)",
            maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden"
          }}>

            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "linear-gradient(135deg, #fefce8, #fffbeb)", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                    <Wallet size={20} color="#d97706" /> Pay All Pending
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                    Payment will be split across pending invoices oldest-first (FIFO) for <strong>{selectedSupplier.supplier_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkPayModal(false)}
                  style={{ border: "none", background: "#f1f5f9", color: "#475569", padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  ✕ Cancel
                </button>
              </div>

              {/* Summary row */}
              <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>Total Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#dc2626" }}>₹{fmt(selectedSupplierPendingTotal)}</div>
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Pending Invoices</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#15803d" }}>
                    {supplierBills.filter(p => Number(p.balance_amount) > 0 && p.status === "submitted").length}
                  </div>
                </div>
              </div>
            </div>

            {/* Form + Preview */}
            <form onSubmit={submitBulkPayment} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Amount Input */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedSupplierPendingTotal}
                    required
                    value={bulkAmount}
                    onChange={(e) => handleBulkAmountChange(e.target.value)}
                    placeholder={`Max: ₹${fmt(selectedSupplierPendingTotal)}`}
                    style={{
                      width: "100%", padding: "11px 14px", borderRadius: "10px",
                      border: "1.5px solid #e2e8f0", outline: "none", fontSize: "15px",
                      fontWeight: "700", boxSizing: "border-box"
                    }}
                  />
                </div>

                {/* Method + Date row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Method</label>
                    <select
                      value={bulkMethod}
                      onChange={(e) => setBulkMethod(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", background: "#fff", boxSizing: "border-box" }}
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="card">Card</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Payment Date</label>
                    <input
                      type="date"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Notes / Reference</label>
                  <input
                    type="text"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="e.g. Cheque No. or UPI Ref."
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", outline: "none", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>

                {/* Live Split Preview */}
                {bulkPreview.length > 0 && (
                  <div style={{ borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: "12px", fontWeight: "700", color: "#334155", textTransform: "uppercase", letterSpacing: ".5px" }}>
                      📊 Distribution Preview (FIFO – Oldest Invoice First)
                    </div>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Bill No</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Date</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Pending</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>Applying</th>
                          <th style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>New Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.map((p, idx) => {
                          const willPay = Number(p._applying) > 0;
                          const fullyClear = Number(p._newBalance) <= 0;
                          return (
                            <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9", background: willPay ? (fullyClear ? "#f0fdf4" : "#fffbeb") : "#fff" }}>
                              <td style={{ padding: "9px 12px", fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>
                                {p.purchase_no || "N/A"}
                              </td>
                              <td style={{ padding: "9px 12px", fontSize: "12px", color: "#64748b" }}>
                                {p.purchase_date}
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
                    {/* Leftover notice */}
                    {Number(bulkAmount) > selectedSupplierPendingTotal && (
                      <div style={{ padding: "10px 14px", background: "#eff6ff", borderTop: "1px solid #bfdbfe", fontSize: "12.5px", color: "#2563eb", fontWeight: "600" }}>
                        ℹ️ Amount exceeds total pending. Only ₹{fmt(selectedSupplierPendingTotal)} will be applied.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setShowBulkPayModal(false)}
                  style={{
                    flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #cbd5e1",
                    background: "#ffffff", color: "#475569", fontWeight: "600", fontSize: "14px", cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBulk || !bulkAmount || Number(bulkAmount) <= 0}
                  style={{
                    flex: 2, padding: "12px", borderRadius: "10px", border: "none",
                    background: submittingBulk ? "#94a3b8" : "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#ffffff", fontWeight: "700", fontSize: "14px", cursor: submittingBulk ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(217,119,6,0.2)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}
                >
                  <Wallet size={16} />
                  {submittingBulk ? "Processing..." : `Record Payment of ₹${bulkAmount ? fmt(Math.min(Number(bulkAmount), selectedSupplierPendingTotal)) : "0"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
