import { useState, useEffect, useRef, useMemo } from "react";
import api from "../../../services/api";
import {
  X,
  ChevronDown,
  Truck,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  DollarSign
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
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    } else {
      setSelectedSupplier(initialSupplier || null);
      setPartyQuery(initialSupplier ? (initialSupplier.supplier_name || initialSupplier.name || "") : "");
      setPaidAmount("");
      setPaymentType("Cash");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setDescription("");

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
    setErrorMsg("");

    if (!selectedSupplier && !partyQuery.trim()) {
      setErrorMsg("Please select or enter a supplier / party name.");
      return;
    }

    const amountNum = parseFloat(paidAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMsg("Please enter a valid paid amount greater than 0.");
      return;
    }

    setSaving(true);
    try {
      if (editPayment) {
        const payload = {
          id: editPayment.id,
          amount: amountNum,
          payment_method: paymentType.toLowerCase(),
          payment_date: paymentDate,
          receipt_no: String(receiptNo),
          notes: description || `Payment-Out voucher of ₹${amountNum}`,
          attachment: attachment
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
          supplier_id: selectedSupplier?.id || 0,
          supplier_name: selectedSupplier ? (selectedSupplier.supplier_name || selectedSupplier.name) : partyQuery.trim(),
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
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shadow-xs">
              <Truck size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight">
                {editPayment ? "Edit Payment-Out Voucher" : "Record Payment-Out Voucher"}
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Direct vendor payout disbursement entry</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

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
                  Supplier / Vendor *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search supplier..."
                    value={partyQuery}
                    onChange={(e) => handleSearchSuppliers(e.target.value)}
                    onFocus={() => setShowPartyDropdown(true)}
                    className="w-full px-3.5 py-2.5 pr-8 rounded-xl border border-slate-300 font-bold text-slate-900 text-xs outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                    onClick={() => setShowPartyDropdown(!showPartyDropdown)}
                  />
                </div>

                {/* Selected Supplier Live Unpaid Balance */}
                {selectedSupplier && (
                  <div className="flex justify-between items-center mt-1.5 px-1 text-[11px] bg-slate-50 py-1 rounded-lg border border-slate-200">
                    <span className="text-slate-500 font-medium">Pending Due:</span>
                    <span className={`font-black ${Number(selectedSupplier.pending_balance || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      ₹ {Number(selectedSupplier.pending_balance || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Supplier Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-48 overflow-y-auto z-50 py-1">
                    {searchingParty ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-medium">Loading suppliers...</div>
                    ) : supplierSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-600">
                        No match. Will save as <b>"{partyQuery}"</b>
                      </div>
                    ) : (
                      supplierSuggestions.map((sup) => (
                        <button
                          key={sup.id}
                          onClick={() => selectSupplier(sup)}
                          className="w-full text-left px-3.5 py-2 text-xs hover:bg-purple-50 flex items-center justify-between border-b border-slate-50 cursor-pointer"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{sup.supplier_name || sup.name}</div>
                            {sup.mobile_number && <div className="text-[10px] text-slate-400">{sup.mobile_number}</div>}
                          </div>
                          {Number(sup.pending_balance) > 0 && (
                            <span className="font-bold text-rose-600 text-[11px]">
                              Due: ₹{Number(sup.pending_balance).toFixed(2)}
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
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs shadow-purple-600/30"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Receipt No, Date, Amount */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Receipt No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt #</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 text-xs outline-none focus:border-purple-600 transition"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold text-slate-800 text-xs outline-none focus:border-purple-600 transition"
                  />
                </div>
              </div>

              {/* Paid Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Disbursed Amount (₹) *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="any"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-base outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
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
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:border-purple-600 transition"
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
            onClick={handleSavePaymentOut}
            disabled={saving}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Recording..." : "Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
