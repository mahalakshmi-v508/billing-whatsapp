import { useState, useEffect, useRef, useMemo } from "react";
import api from "../../../services/api";
import {
  X,
  Calculator,
  Settings,
  Calendar,
  ChevronDown,
  Camera,
  AlignLeft,
  Share2,
  Check,
  Search,
  Truck,
  RefreshCw,
  Plus
} from "lucide-react";

export default function AddPaymentOutModal({ isOpen, onClose, onSuccess, initialSupplier = null, editPayment = null }) {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Form States
  const [partyQuery, setPartyQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(initialSupplier || null);
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [searchingParty, setSearchingParty] = useState(false);

  const [paymentType, setPaymentType] = useState("Cash");
  const [receiptNo, setReceiptNo] = useState(1);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidAmount, setPaidAmount] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);

  const partyRef = useRef(null);

  // Initialize or populate data when opening modal
  useEffect(() => {
    if (!isOpen) return;
    if (editPayment) {
      setSelectedSupplier({
        id: editPayment.supplier_id,
        name: editPayment.supplier_name,
        supplier_name: editPayment.supplier_name,
        pending_balance: editPayment.invoice_balance
      });
      setPartyQuery(editPayment.supplier_name || "");
      setPaidAmount(String(editPayment.amount || ""));
      if (editPayment.payment_method) {
        const pm = editPayment.payment_method.toLowerCase();
        if (pm === "upi") setPaymentType("UPI");
        else if (pm === "online") setPaymentType("Online");
        else if (pm === "cheque") setPaymentType("Cheque");
        else setPaymentType("Cash");
      }
      setPaymentDate(editPayment.payment_date || new Date().toISOString().split("T")[0]);
      setReceiptNo(editPayment.receipt_no ? editPayment.receipt_no.replace("REC-", "") : String(editPayment.id));
      setDescription(editPayment.notes || "");
      if (editPayment.notes) setShowDescription(true);
    } else {
      setSelectedSupplier(initialSupplier || null);
      setPartyQuery(initialSupplier ? (initialSupplier.supplier_name || initialSupplier.name || "") : "");
      setPaidAmount("");
      setPaymentType("Cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setShowDescription(false);

      // Load next sequential receipt number for new payments
      const loadReceiptNo = async () => {
        try {
          const res = await api.get(`/purchase/get_payment_outs?company_id=${companyId}`);
          if (res.data?.data) {
            setReceiptNo((res.data.data.length || 0) + 1);
          } else {
            setReceiptNo(Math.floor(Date.now() / 1000) % 10000);
          }
        } catch {
          setReceiptNo(Math.floor(Date.now() / 1000) % 10000);
        }
      };
      loadReceiptNo();
    }
  }, [isOpen, editPayment, initialSupplier, companyId]);

  // Load suppliers list on open
  useEffect(() => {
    if (isOpen && companyId) {
      handleSearchSuppliers("");
    }
  }, [isOpen, companyId]);

  // Search Suppliers
  const handleSearchSuppliers = async (q) => {
    setPartyQuery(q);
    setShowPartyDropdown(true);
    setSearchingParty(true);
    try {
      const res = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (res.data.status) {
        const all = res.data.data || [];
        if (!q.trim()) {
          setSupplierSuggestions(all.slice(0, 15));
        } else {
          const query = q.toLowerCase();
          setSupplierSuggestions(
            all.filter(
              (s) =>
                (s.supplier_name || s.name || "").toLowerCase().includes(query) ||
                (s.mobile_number || s.phone || "").includes(query)
            )
          );
        }
      }
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setSearchingParty(false);
    }
  };

  const selectSupplier = (sup) => {
    setSelectedSupplier(sup);
    setPartyQuery(sup.supplier_name || sup.name || "");
    setShowPartyDropdown(false);
    setErrorMsg("");

    // If supplier has a balance / pending amount, suggest it in paidAmount if empty
    const pending = parseFloat(sup.pending_balance ?? sup.balance ?? 0);
    if (pending > 0 && (!paidAmount || paidAmount === "0" || paidAmount === "")) {
      setPaidAmount(String(pending));
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (partyRef.current && !partyRef.current.contains(e.target)) {
        setShowPartyDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Save Payment-Out
  const handleSavePaymentOut = async () => {
    if (!selectedSupplier && !partyQuery.trim()) {
      setErrorMsg("Please select or enter a Supplier / Party.");
      return;
    }
    const amountNum = parseFloat(paidAmount);
    if (!amountNum || amountNum <= 0) {
      setErrorMsg("Please enter a valid paid amount.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      let supplierId = selectedSupplier?.id;
      if (!supplierId && partyQuery.trim()) {
        const supRes = await api.post("/supplier/create", {
          company_id: companyId,
          supplier_name: partyQuery.trim(),
          mobile_number: "0000000000"
        });
        if (supRes.data.status) {
          supplierId = supRes.data.data?.id || supRes.data.supplier_id;
        }
      }

      if (editPayment && editPayment.id) {
        const payload = {
          id: editPayment.id,
          amount: amountNum,
          payment_method: paymentType.toLowerCase(),
          payment_date: paymentDate,
          receipt_no: String(receiptNo),
          notes: description || `Payment-Out voucher of ₹${amountNum}`,
        };
        const res = await api.post("/purchase/update_payment_out", payload);
        if (res.data.status) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMsg(res.data.message || "Failed to update payment-out.");
        }
      } else {
        const payload = {
          company_id: parseInt(companyId) || 0,
          supplier_id: supplierId,
          amount: amountNum,
          payment_method: paymentType.toLowerCase(),
          payment_date: paymentDate,
          receipt_no: String(receiptNo),
          notes: description || `Payment-Out voucher of ₹${amountNum}`,
          attachment: attachment
        };

        const res = await api.post("/purchase/create_payment_out", payload);
        if (res.data.status) {
          if (onSuccess) onSuccess();
          onClose();
        } else {
          setErrorMsg(res.data.message || "Failed to record payment-out.");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving payment-out.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "Inter, sans-serif"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 8,
          width: "100%",
          maxWidth: 780,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── TOP HEADER (Matching Image 2) ── */}
        <div
          style={{
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #f1f5f9"
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>
            Payment-Out
          </h2>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Calculator Icon */}
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              title="Calculator"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 2 }}
            >
              <Calculator size={19} />
            </button>

            {/* Settings Icon with Red Dot */}
            <div style={{ position: "relative", cursor: "pointer", color: "#64748b", display: "flex" }}>
              <Settings size={19} />
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 6,
                  height: 6,
                  background: "#ef4444",
                  borderRadius: "50%"
                }}
              />
            </div>

            {/* Close Cross Icon */}
            <button
              onClick={onClose}
              title="Close"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", padding: 2 }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── MODAL BODY FORM (Matching Image 2 Layout) ── */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
          
          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "10px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Top Row: Party Dropdown (Left) & Receipt No / Date (Right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, alignItems: "start" }}>
            
            {/* Left Column: Party & Payment Type */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              
              {/* Party * Dropdown Box with Blue Border */}
              <div ref={partyRef} style={{ position: "relative" }}>
                <div
                  style={{
                    position: "relative",
                    border: "2px solid #2563eb",
                    borderRadius: 6,
                    padding: "6px 12px 6px 12px",
                    background: "#ffffff"
                  }}
                >
                  <label
                    style={{
                      position: "absolute",
                      top: -9,
                      left: 10,
                      background: "#ffffff",
                      padding: "0 4px",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#2563eb"
                    }}
                  >
                    Party *
                  </label>
                  
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="text"
                      placeholder="Search or enter party name..."
                      value={partyQuery}
                      onChange={(e) => handleSearchSuppliers(e.target.value)}
                      onFocus={() => setShowPartyDropdown(true)}
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#1e293b",
                        background: "transparent"
                      }}
                    />
                    <ChevronDown size={18} color="#2563eb" style={{ cursor: "pointer", marginLeft: 6 }} onClick={() => setShowPartyDropdown(!showPartyDropdown)} />
                  </div>
                </div>

                {/* Selected Supplier Live Unpaid Balance */}
                {selectedSupplier && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, padding: "0 4px" }}>
                    <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 500 }}>Unpaid Balance:</span>
                    <span style={{ fontSize: 12, color: Number(selectedSupplier.pending_balance || 0) > 0 ? "#dc2626" : "#059669", fontWeight: 800 }}>
                      ₹{Number(selectedSupplier.pending_balance || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Supplier Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                      zIndex: 100,
                      marginTop: 4,
                      maxHeight: 200,
                      overflowY: "auto"
                    }}
                  >
                    {searchingParty ? (
                      <div style={{ padding: 12, fontSize: 13, color: "#94a3b8", textAlign: "center" }}>Loading parties...</div>
                    ) : supplierSuggestions.length === 0 ? (
                      <div style={{ padding: 12, fontSize: 13, color: "#64748b" }}>
                        <span>No existing party found. Press save to create new party <b>"{partyQuery}"</b></span>
                      </div>
                    ) : (
                      supplierSuggestions.map((sup) => (
                        <div
                          key={sup.id}
                          onClick={() => selectSupplier(sup)}
                          style={{
                            padding: "9px 14px",
                            fontSize: 13,
                            color: "#1e293b",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid #f8fafc"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#eff6ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
                        >
                          <div>
                            <div style={{ fontWeight: 700 }}>{sup.supplier_name || sup.name}</div>
                            {sup.mobile_number && <div style={{ fontSize: 11, color: "#64748b" }}>{sup.mobile_number}</div>}
                          </div>
                          {sup.pending_balance > 0 && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626" }}>
                              Due: ₹{Number(sup.pending_balance).toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Payment Type Dropdown Box */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "relative",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    padding: "4px 12px",
                    background: "#ffffff"
                  }}
                >
                  <label
                    style={{
                      position: "absolute",
                      top: -9,
                      left: 10,
                      background: "#ffffff",
                      padding: "0 4px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#64748b"
                    }}
                  >
                    Payment Type
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    style={{
                      width: "100%",
                      border: "none",
                      outline: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#1e293b",
                      background: "transparent",
                      padding: "4px 0",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Online">Online / Netbanking</option>
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Right Column: Receipt No, Date, and Paid Amount Box */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-end" }}>
              
              {/* Receipt No */}
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Receipt No</span>
                <input
                  type="text"
                  value={receiptNo}
                  onChange={(e) => setReceiptNo(e.target.value)}
                  style={{
                    width: 150,
                    border: "none",
                    borderBottom: "1px solid #cbd5e1",
                    padding: "4px 8px",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#1e293b",
                    outline: "none",
                    textAlign: "right"
                  }}
                />
              </div>

              {/* Date */}
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Date</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{
                      border: "none",
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#1e293b",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  />
                  <Calendar size={15} color="#64748b" />
                </div>
              </div>

              {/* Paid Amount Input Box (Matching Image 2) */}
              <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 18 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Paid</span>
                <input
                  type="number"
                  placeholder=""
                  min="0"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  style={{
                    width: 170,
                    height: 38,
                    padding: "6px 12px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 16,
                    fontWeight: 800,
                    textAlign: "right",
                    color: "#1e293b",
                    outline: "none",
                    background: "#ffffff",
                    boxSizing: "border-box"
                  }}
                />
              </div>

            </div>

          </div>

        </div>

        {/* ── BOTTOM ACTIONS FOOTER (Matching Image 2) ── */}
        <div
          style={{
            padding: "14px 28px",
            background: "#ffffff",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 12
          }}
        >
          {/* Share ▾ Button */}
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #60a5fa", borderRadius: 6, overflow: "hidden", background: "#ffffff" }}>
            <button
              type="button"
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              Share
            </button>
            <div style={{ borderLeft: "1px solid #bfdbfe", padding: "8px 8px", color: "#2563eb", cursor: "pointer", display: "flex" }}>
              <ChevronDown size={14} />
            </div>
          </div>

          {/* Save Button (Primary Blue) */}
          <button
            type="button"
            onClick={handleSavePaymentOut}
            disabled={saving}
            style={{
              background: "#1d72fe",
              border: "none",
              color: "#ffffff",
              borderRadius: 6,
              padding: "9px 30px",
              fontSize: 14,
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(29, 114, 254, 0.3)"
            }}
          >
            {saving ? "Saving..." : (
              <span><u>S</u>ave</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
