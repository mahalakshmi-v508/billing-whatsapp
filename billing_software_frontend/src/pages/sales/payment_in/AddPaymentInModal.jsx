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
  User,
  RefreshCw,
} from "lucide-react";

export default function AddPaymentInModal({ isOpen, onClose, onSuccess, initialParty = null }) {
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
  const [showPaymentTypeDropdown, setShowPaymentTypeDropdown] = useState(false);
  const [receiptNo, setReceiptNo] = useState(1);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [receivedAmount, setReceivedAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const partyRef = useRef(null);

  // Auto-calculated Total
  const totalAmount = useMemo(() => {
    const recv = parseFloat(receivedAmount) || 0;
    const disc = parseFloat(discountAmount) || 0;
    return recv + disc;
  }, [receivedAmount, discountAmount]);

  // Load next receipt number
  useEffect(() => {
    if (!isOpen) return;
    const loadReceiptNo = async () => {
      try {
        const res = await api.get(`/invoice/get_customer_payments?customer_id=0`);
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
  }, [isOpen]);

  // Load customer suggestions immediately when modal opens
  useEffect(() => {
    if (isOpen && adminId) {
      handleSearchParty("");
    }
  }, [isOpen, adminId]);

  // Search Customer Parties
  const handleSearchParty = async (q) => {
    setPartyQuery(q);
    setShowPartyDropdown(true);
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
      setErrorMsg("Please select a Party / Customer.");
      return;
    }
    const amountNum = parseFloat(receivedAmount);
    if (!amountNum || amountNum <= 0) {
      setErrorMsg("Please enter a valid received amount.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const discNum = parseFloat(discountAmount) || 0;
      const payload = {
        company_id: parseInt(companyId) || 0,
        customer_id: selectedParty.id,
        receipt_no: String(receiptNo),
        amount: amountNum,
        discount_amount: discNum,
        payment_method: paymentType.toLowerCase(),
        payment_date: paymentDate,
        notes: description || `Payment received: ₹${amountNum}${discNum > 0 ? `, Discount: ₹${discNum}` : ""}`,
      };

      const res = await api.post("/invoice/pay_customer_bulk", payload);
      if (res.data.status) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMsg(res.data.message || "Failed to record payment.");
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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        style={{ minHeight: 460 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. HEADER (Title, Calculator, Settings, Close) ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Payment-In</h2>

          <div className="flex items-center gap-3.5">
            <button
              type="button"
              className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Calculator"
            >
              <Calculator size={18} />
            </button>

            <button
              type="button"
              className="text-slate-400 hover:text-slate-700 relative transition cursor-pointer"
              title="Settings"
            >
              <Settings size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer ml-1"
              title="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── 2. ERROR ALERT ── */}
        {errorMsg && (
          <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg("")} className="text-red-500 hover:text-red-700">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── 3. BODY (Two-Column Layout Matching media_1787829100659.png) ── */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-5">
            {/* Party Selection (Floating Label Box) */}
            <div ref={partyRef} className="relative">
              <div
                className={`relative border rounded-lg px-3 pt-3 pb-2 transition ${
                  showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/20" : "border-blue-500"
                }`}
              >
                <label className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-semibold text-blue-600">
                  Party *
                </label>
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    value={partyQuery}
                    onChange={(e) => handleSearchParty(e.target.value)}
                    onFocus={() => handleSearchParty(partyQuery)}
                    placeholder="Search or select party..."
                    className="w-full bg-transparent text-sm text-slate-800 font-medium outline-none"
                  />
                  <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Suggestions Dropdown */}
              {showPartyDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50 py-1">
                  {searchingParty ? (
                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw size={12} className="animate-spin text-blue-500" />
                      <span>Searching parties...</span>
                    </div>
                  ) : partySuggestions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No parties found.</div>
                  ) : (
                    partySuggestions.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => selectParty(cust)}
                        className="px-3.5 py-2 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-none"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800">{cust.name || cust.customer_name}</div>
                          {cust.phone && <div className="text-[11px] text-slate-400">{cust.phone}</div>}
                        </div>
                        {(cust.pending_amount !== undefined || cust.balance !== undefined) && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Pending</span>
                            <span className="text-xs font-bold text-red-600">
                              ₹{parseFloat(cust.pending_amount ?? cust.balance ?? 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Selected Customer Balance Preview */}
              {selectedParty && (
                <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between px-1">
                  <span>Selected: <strong className="text-slate-700">{selectedParty.name || selectedParty.customer_name}</strong></span>
                  {(selectedParty.pending_amount !== undefined || selectedParty.balance !== undefined) && (
                    <span className="text-red-600 font-semibold">
                      Current Bal: ₹{parseFloat(selectedParty.pending_amount ?? selectedParty.balance ?? 0).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Payment Type */}
            <div className="relative">
              <div className="relative border border-slate-300 rounded-lg px-3 pt-3 pb-2">
                <label className="absolute -top-2.5 left-3 px-1 bg-white text-xs font-medium text-slate-500">
                  Payment Type
                </label>
                <div
                  onClick={() => setShowPaymentTypeDropdown(!showPaymentTypeDropdown)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <span className="text-sm font-medium text-slate-800">{paymentType}</span>
                  <ChevronDown size={16} className="text-slate-400" />
                </div>
              </div>

              {showPaymentTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1">
                  {["Cash", "Online / Bank Transfer", "UPI / GooglePay", "Cheque"].map((type) => (
                    <div
                      key={type}
                      onClick={() => {
                        setPaymentType(type);
                        setShowPaymentTypeDropdown(false);
                      }}
                      className={`px-3 py-2 text-xs font-medium cursor-pointer hover:bg-slate-50 flex items-center justify-between ${
                        paymentType === type ? "text-blue-600 font-bold bg-blue-50/50" : "text-slate-700"
                      }`}
                    >
                      <span>{type}</span>
                      {paymentType === type && <Check size={13} className="text-blue-600" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* + ADD DESCRIPTION Toggle & Textarea */}
            <div>
              {!showDescription ? (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                >
                  <AlignLeft size={13} />
                  <span>ADD DESCRIPTION</span>
                </button>
              ) : (
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-600">Description / Notes</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDescription(false);
                        setDescription("");
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter any reference notes or remarks..."
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-xs text-slate-800 outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              )}
            </div>

            {/* Attachment Camera Icon */}
            <div>
              <button
                type="button"
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer"
                title="Attach photo or slip"
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4">
            {/* Receipt No */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Receipt No</span>
              <input
                type="text"
                value={receiptNo}
                onChange={(e) => setReceiptNo(e.target.value)}
                className="w-36 text-right border-b border-slate-200 pb-1 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Date</span>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-36 text-right text-xs font-semibold text-slate-800 outline-none border-b border-slate-200 pb-1 cursor-pointer"
                />
              </div>
            </div>

            {/* Received Input */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-medium text-slate-500">Received</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-40 border border-slate-300 rounded-md px-3 py-1.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Discount Input */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Discount</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-40 border border-slate-300 rounded-md px-3 py-1.5 text-right text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Total Display */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-lg font-black text-blue-600">
                ₹{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* ── 4. BOTTOM ACTION BAR (Share | Save) ── */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-end gap-3">
          {/* Share Split Button */}
          <div className="inline-flex rounded-md border border-blue-500 shadow-xs">
            <button
              type="button"
              className="px-3.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              Share
            </button>
            <button
              type="button"
              className="px-1.5 py-1.5 text-blue-600 border-l border-blue-500 hover:bg-blue-50 transition cursor-pointer"
            >
              <ChevronDown size={13} />
            </button>
          </div>

          {/* Primary Save Button */}
          <button
            type="button"
            disabled={saving}
            onClick={handleSavePaymentIn}
            className="px-8 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <RefreshCw size={14} className="animate-spin" />}
            <span><u>S</u>ave</span>
          </button>
        </div>
      </div>
    </div>
  );
}
