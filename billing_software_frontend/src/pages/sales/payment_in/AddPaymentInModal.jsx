import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import {
  X,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  RefreshCw,
  UserCheck
} from "lucide-react";

export default function AddPaymentInModal({ isOpen, onClose, onSuccess, initialParty = null }) {
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

  // Auto-calculated Total (Received + Discount)
  const totalAmount = useMemo(() => {
    const recv = parseFloat(receivedAmount) || 0;
    const disc = parseFloat(discountAmount) || 0;
    return recv + disc;
  }, [receivedAmount, discountAmount]);

  // Load next receipt number from settings
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const loadReceiptNo = async () => {
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
    };

    loadReceiptNo();
    return () => {
      cancelled = true;
    };
  }, [isOpen, companyId]);

  // Fetch customer suggestions helper without forcing dropdown open
  const fetchCustomerSuggestions = async (q = "") => {
    if (!adminId) return;
    setSearchingParty(true);
    try {
      const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(q || "")}`);
      if (res.data?.status) {
        setPartySuggestions(res.data.data || []);
      }
    } catch (err) {
      console.error("Error searching customers:", err);
    } finally {
      setSearchingParty(false);
    }
  };

  // Reset states and preload customer list on modal open
  useEffect(() => {
    if (isOpen && adminId) {
      setShowPartyDropdown(false);
      setErrorMsg("");
      fetchCustomerSuggestions("");
      if (initialParty) {
        setSelectedParty(initialParty);
        setPartyQuery(initialParty.name || initialParty.customer_name || "");
        const pending = parseFloat(initialParty.pending_amount ?? initialParty.balance ?? 0);
        if (pending > 0) setReceivedAmount(String(pending));
      } else {
        setSelectedParty(null);
        setPartyQuery("");
        setReceivedAmount("");
        setDiscountAmount("");
        setDescription("");
      }
    }
  }, [isOpen, adminId, initialParty]);

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

  // Submit Handler
  const handleSavePaymentIn = async () => {
    if (!selectedParty) {
      setErrorMsg("Please select a customer.");
      return;
    }
    const amountNum = parseFloat(receivedAmount) || 0;
    if (amountNum <= 0) {
      setErrorMsg("Please enter a valid received amount greater than 0.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const discNum = parseFloat(discountAmount) || 0;
      const finalReceiptNo = String(receiptNo || "").trim() || `PAYIN-${Date.now()}`;
      const payload = {
        company_id: parseInt(companyId) || 0,
        customer_id: selectedParty.id,
        receipt_no: finalReceiptNo,
        amount: amountNum,
        discount_amount: discNum,
        payment_method: paymentType.toLowerCase(),
        payment_date: paymentDate,
        notes: description || `Payment received: ₹${amountNum}${discNum > 0 ? `, Discount: ₹${discNum}` : ""}`,
      };

      const res = await api.post("/invoice/pay_customer_bulk", payload);
      if (res.data?.status) {
        const savedReceiptNo = res.data.invoice_no || res.data.receipt_no || finalReceiptNo;
        if (onSuccess) onSuccess(savedReceiptNo);

        const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
        if (shouldSkipPreview) {
          setToast(`Payment-In #${savedReceiptNo} recorded successfully!`);
          setTimeout(() => setToast(null), 4000);

          // Reset form for next payment entry
          setSelectedParty(null);
          setPartyQuery("");
          setReceivedAmount("");
          setDiscountAmount("");
          setDescription("");

          // Fetch / increment next receipt number
          try {
            const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=payment_in`);
            if (numRes.data?.status && numRes.data?.formatted_number) {
              setReceiptNo(numRes.data.formatted_number);
            } else {
              setReceiptNo((prev) =>
                typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYIN-0001"
              );
            }
          } catch (e) {
            setReceiptNo((prev) =>
              typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYIN-0001"
            );
          }
        } else {
          onClose();
          navigate(`/invoice/${savedReceiptNo}`);
        }
      } else {
        setErrorMsg(res.data?.message || "Failed to record payment.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "An error occurred while saving payment.");
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
        {/* ── 1. HEADER (Matching AddPaymentOutModal Style) ── */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                Record Payment-In Voucher
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Direct customer inward payment collection entry</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── 2. SUCCESS TOAST & ERROR ALERTS ── */}
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

          {/* ── 3. 2-COLUMN GRID (Matching AddPaymentOutModal) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Left Column: Customer Party & Payment Mode */}
            <div className="space-y-3.5">
              {/* Customer Selector */}
              <div ref={partyRef} className="relative">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Customer / Party *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={partyQuery}
                    onChange={(e) => handleSearchParty(e.target.value)}
                    onFocus={() => setShowPartyDropdown(true)}
                    className="w-full px-3.5 py-2.5 pr-8 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  />
                </div>

                {/* Selected Customer Pending Balance Box */}
                {selectedParty && (
                  <div className="flex justify-between items-center mt-1.5 px-2.5 py-1 text-[11px] bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">Pending Due:</span>
                    <span
                      className={`font-black ${
                        Number(selectedParty.pending_amount ?? selectedParty.balance ?? 0) > 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      ₹ {Number(selectedParty.pending_amount ?? selectedParty.balance ?? 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Customer Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-48 overflow-y-auto z-50 py-1">
                    {searchingParty ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-medium">Searching customers...</div>
                    ) : partySuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-600">No matching customer found.</div>
                    ) : (
                      partySuggestions.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => selectParty(cust)}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-emerald-50 flex items-center justify-between border-b border-slate-50 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{cust.name || cust.customer_name}</div>
                            {cust.phone && <div className="text-[10px] text-slate-400">{cust.phone}</div>}
                          </div>
                          {(cust.pending_amount !== undefined || cust.balance !== undefined) && (
                            <span className="font-bold text-rose-600 text-[11px]">
                              Due: ₹{parseFloat(cust.pending_amount ?? cust.balance ?? 0).toFixed(2)}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Payment Mode Selector Buttons (Matching AddPaymentOutModal) */}
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
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-600/30"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Receipt #, Date, Amount, Discount */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Receipt No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt #</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs outline-none focus:border-emerald-600 transition"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs outline-none focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              {/* Received Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Received Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-black text-slate-900 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition"
                />
              </div>

              {/* Discount Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-semibold text-slate-700 text-xs outline-none focus:border-emerald-600 transition"
                />
              </div>

              {/* Net Total Summary Strip */}
              <div className="flex justify-between items-center px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
                <span className="text-emerald-800 font-bold">Total Voucher:</span>
                <span className="text-emerald-800 font-black text-sm">₹ {totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Full-Width Description / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Cleared via UPI / Invoice settlement reference..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-emerald-600 transition"
            />
          </div>
        </div>

        {/* ── 4. FOOTER (Matching AddPaymentOutModal) ── */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePaymentIn}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md shadow-emerald-500/25 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Record Payment-In</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
