import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import {
  X,
  ChevronDown,
  UserCheck,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Wallet,
  Tag,
  RefreshCw,
} from "lucide-react";

export default function AddPaymentInModal({ isOpen, onClose, onSuccess, initialParty = null, editPayment = null }) {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Form States
  const [partyQuery, setPartyQuery] = useState("");
  const [selectedParty, setSelectedParty] = useState(initialParty || null);
  const [partySuggestions, setPartySuggestions] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [searchingParty, setSearchingParty] = useState(false);

  const [paymentType, setPaymentType] = useState("Cash");
  const [receiptNo, setReceiptNo] = useState(1);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null);

  const partyRef = useRef(null);

  // Auto-calculated Total
  const totalAmount = useMemo(() => {
    const recv = parseFloat(receivedAmount) || 0;
    const disc = parseFloat(discountAmount) || 0;
    return recv + disc;
  }, [receivedAmount, discountAmount]);

  // Initialize or populate data when opening modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const init = async () => {
      setShowPartyDropdown(false);
      setErrorMsg("");

      if (editPayment) {
        setSelectedParty({
          id: editPayment.customer_id,
          name: editPayment.customer_name,
          customer_name: editPayment.customer_name,
          pending_amount: editPayment.balance,
        });
        setPartyQuery(editPayment.customer_name || "");
        setReceivedAmount(String(editPayment.amount || ""));
        setDiscountAmount(String(editPayment.discount_amount || ""));
        if (editPayment.payment_method) {
          const pm = editPayment.payment_method.toLowerCase();
          if (pm === "upi") setPaymentType("UPI");
          else if (pm === "online" || pm.includes("bank")) setPaymentType("Online");
          else if (pm === "cheque") setPaymentType("Cheque");
          else setPaymentType("Cash");
        }
        setPaymentDate(editPayment.payment_date || new Date().toISOString().split("T")[0]);
        setReceiptNo(editPayment.receipt_no ? editPayment.receipt_no.replace("REC-", "") : String(editPayment.id));
        setDescription(editPayment.notes || "");
      } else {
        setSelectedParty(initialParty || null);
        setPartyQuery(initialParty ? (initialParty.customer_name || initialParty.name || "") : "");
        const initialDue = Number(initialParty?.pending_amount ?? initialParty?.balance ?? 0);
        setReceivedAmount(initialDue > 0 ? String(initialDue) : "");
        setDiscountAmount("");
        setPaymentType("Cash");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setDescription("");

        try {
          const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=payment_in`);
          if (cancelled) return;
          if (numRes.data?.status && numRes.data?.formatted_number) {
            setReceiptNo(numRes.data.formatted_number);
            return;
          }
          const res = await api.get(`/invoice/get_customer_payments?customer_id=0`);
          if (cancelled) return;
          if (res.data?.data) {
            setReceiptNo(`PAYIN-${String((res.data.data.length || 0) + 1).padStart(4, "0")}`);
          } else {
            setReceiptNo("PAYIN-0001");
          }
        } catch {
          if (!cancelled) setReceiptNo("PAYIN-0001");
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [isOpen, editPayment, initialParty, companyId]);

  // Load customer suggestions list quietly on open
  const fetchCustomerSuggestions = async (q = "") => {
    if (!adminId) return;
    setSearchingParty(true);
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(q || "")}`);
      if (res.data.status) {
        setPartySuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearchingParty(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !adminId) return;
    let cancelled = false;
    const loadCustomers = async () => {
      try {
        const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=`);
        if (cancelled) return;
        if (res.data.status) {
          setPartySuggestions(res.data.data || []);
        }
      } catch (err) {
        console.error("Error loading customers:", err);
      }
    };
    loadCustomers();
    return () => { cancelled = true; };
  }, [isOpen, adminId]);

  // Search Customer Parties when user types
  const handleSearchParty = (q) => {
    setPartyQuery(q);
    setShowPartyDropdown(true);
    fetchCustomerSuggestions(q);
  };

  const selectParty = (cust) => {
    setSelectedParty(cust);
    setPartyQuery(cust.name || cust.customer_name || "");
    setShowPartyDropdown(false);
    setErrorMsg("");

    const pending = parseFloat(cust.pending_amount ?? cust.balance ?? 0);
    if (pending > 0 && (!receivedAmount || receivedAmount === "0" || receivedAmount === "")) {
      setReceivedAmount(String(pending));
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

  // Save Payment-In
  const handleSavePaymentIn = async () => {
    setErrorMsg("");

    if (!selectedParty && !partyQuery.trim()) {
      setErrorMsg("Please select or enter a customer / party name.");
      return;
    }

    const amountNum = parseFloat(receivedAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please enter a valid received amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      const discNum = parseFloat(discountAmount) || 0;
      const finalReceiptNo = String(receiptNo || "").trim() || `PAYIN-${Date.now()}`;
      const payload = {
        company_id: parseInt(companyId) || 0,
        customer_id: selectedParty?.id || 0,
        customer_name: selectedParty ? (selectedParty.name || selectedParty.customer_name) : partyQuery.trim(),
        receipt_no: finalReceiptNo,
        amount: amountNum,
        discount_amount: discNum,
        payment_method: paymentType.toLowerCase(),
        payment_date: paymentDate,
        notes: description || `Payment received: ₹${amountNum}${discNum > 0 ? `, Discount: ₹${discNum}` : ""}`,
      };

      const res = await api.post("/invoice/pay_customer_bulk", payload);
      if (res.data.status) {
        const savedReceiptNo = res.data.invoice_no || res.data.receipt_no || finalReceiptNo;
        if (onSuccess) onSuccess(savedReceiptNo);

        const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
        if (shouldSkipPreview) {
          setToast(`Payment-In #${savedReceiptNo} recorded successfully!`);
          setTimeout(() => setToast(null), 4000);

          // Reset fields for continuous data entry
          setSelectedParty(null);
          setPartyQuery("");
          setReceivedAmount("");
          setDiscountAmount("");
          setPaymentType("Cash");
          setPaymentDate(new Date().toISOString().split("T")[0]);
          setDescription("");

          // Fetch / increment next receipt number
          try {
            const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=payment_in`);
            if (numRes.data?.status && numRes.data?.formatted_number) {
              setReceiptNo(numRes.data.formatted_number);
            } else {
              setReceiptNo((prev) => (typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYIN-0001"));
            }
          } catch (e) {
            setReceiptNo((prev) => (typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYIN-0001"));
          }
        } else {
          onClose();
          navigate(`/invoice/${savedReceiptNo}`);
        }
      } else {
        setErrorMsg(res.data.message || "Failed to record payment-in.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving payment-in.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150 font-sans"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-xs">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                {editPayment ? "Edit Payment-In Voucher" : "Record Payment-In Voucher"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Direct customer payment receipt entry</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Success Toast */}
        {toast && (
          <div className="mx-6 mt-3 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{toast}</span>
            </div>
            <button onClick={() => setToast(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Left Column: Party & Method */}
            <div className="space-y-3.5">
              {/* Party Selector */}
              <div ref={partyRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Party *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer party..."
                    value={partyQuery}
                    onChange={(e) => handleSearchParty(e.target.value)}
                    onFocus={() => setShowPartyDropdown(true)}
                    className="w-full px-3.5 py-2.5 pr-8 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  />
                </div>

                {/* Selected Party Live Pending Balance */}
                {selectedParty && (
                  <div className="flex justify-between items-center mt-1.5 px-1 text-[11px] bg-slate-50 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">Pending Due:</span>
                    <span className={`font-black ${Number(selectedParty.pending_amount || selectedParty.balance || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      ₹ {Number(selectedParty.pending_amount || selectedParty.balance || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Party Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-48 overflow-y-auto z-50 py-1">
                    {searchingParty ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-medium">Loading parties...</div>
                    ) : partySuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-600">
                        No match. Will save as <b>"{partyQuery}"</b>
                      </div>
                    ) : (
                      partySuggestions.map((cust) => (
                        <button
                          key={cust.id}
                          onClick={() => selectParty(cust)}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-blue-50 flex items-center justify-between border-b border-slate-50 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{cust.name || cust.customer_name}</div>
                            {(cust.phone || cust.customer_phone) && (
                              <div className="text-[10px] text-slate-400">{cust.phone || cust.customer_phone}</div>
                            )}
                          </div>
                          {Number(cust.pending_amount || cust.balance || 0) > 0 && (
                            <span className="font-bold text-rose-600 text-[11px]">
                              Due: ₹{Number(cust.pending_amount || cust.balance || 0).toFixed(2)}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Payment Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Cash", "UPI", "Online", "Cheque"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPaymentType(type)}
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                        paymentType === type
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs shadow-blue-600/30"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Receipt No, Date, Amount, Discount */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Receipt No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt #</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Received Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Received Amount (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="any"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-black text-slate-900 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {/* Discount Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Discount Allowed (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 text-sm outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calculation / Receipt Summary Box */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Receipt Summary</span>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>
            {selectedParty && (
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Customer Current Due</span>
                <span className="font-bold text-rose-600">
                  ₹ {Number(selectedParty.pending_amount || selectedParty.balance || 0).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Received Amount</span>
              <span className="font-bold text-slate-900">
                ₹ {(parseFloat(receivedAmount) || 0).toFixed(2)}
              </span>
            </div>
            {parseFloat(discountAmount) > 0 && (
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Discount Allowed</span>
                <span className="font-bold text-amber-600">
                  + ₹ {(parseFloat(discountAmount) || 0).toFixed(2)}
                </span>
              </div>
            )}
            {selectedParty && (
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-900">Remaining Receivable Due</span>
                <span className={`font-bold ${Math.max(0, (Number(selectedParty.pending_amount || selectedParty.balance || 0) - totalAmount)) > 0 ? "text-rose-600 font-black text-sm" : "text-emerald-700 font-black text-sm"}`}>
                  ₹ {Math.max(0, (Number(selectedParty.pending_amount || selectedParty.balance || 0) - totalAmount)).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-xs">
              <span className="font-bold text-slate-900">Total Settled Value</span>
              <span className="font-black text-blue-600 text-sm">
                ₹ {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description & Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Transaction Reference</label>
            <input
              type="text"
              placeholder="Optional remarks, cheque/UTR reference"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePaymentIn}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving && <RefreshCw size={14} className="animate-spin" />}
            <span>{saving ? "Recording..." : "Save Payment"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
