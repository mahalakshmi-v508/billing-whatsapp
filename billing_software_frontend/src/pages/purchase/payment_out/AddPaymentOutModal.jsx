import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import {
  X,
  ChevronDown,
  Truck,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Search,
  Plus,
  Wallet
} from "lucide-react";
import AddSupplierModal from "../../supplier/AddSupplierModal";

export default function AddPaymentOutModal({ isOpen, onClose, onSuccess, initialSupplier = null, editPayment = null }) {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const companyId = user?.company_id || localStorage.getItem("selected_company_id") || 0;

  // Form States
  const [partyQuery, setPartyQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(initialSupplier || null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [searchingParty, setSearchingParty] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  const [paymentType, setPaymentType] = useState("Cash");
  const [receiptNo, setReceiptNo] = useState(1);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidAmount, setPaidAmount] = useState("");
  const [description, setDescription] = useState("");
  const attachment = "";
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState(null);

  const partyRef = useRef(null);

  // Initialize or populate data when opening modal
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const init = async () => {
      setShowPartyDropdown(false);
      setErrorMsg("");

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
        const initialDue = parseFloat(
          initialSupplier?.pending_balance ??
          initialSupplier?.balance_amount ??
          initialSupplier?.total_balance ??
          initialSupplier?.balance ??
          0
        );
        setPaidAmount(initialDue > 0 ? String(initialDue) : "");
        setPaymentType("Cash");
        setPaymentDate(new Date().toISOString().split("T")[0]);
        setDescription("");

        try {
          const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=payment_out`);
          if (cancelled) return;
          if (numRes.data?.status && numRes.data?.formatted_number) {
            setReceiptNo(numRes.data.formatted_number);
            return;
          }
          const res = await api.get(`/purchase/get_payment_outs?company_id=${companyId}`);
          if (cancelled) return;
          if (res.data?.data) {
            setReceiptNo(`PAYOUT-${String((res.data.data.length || 0) + 1).padStart(4, "0")}`);
          } else {
            setReceiptNo("PAYOUT-0001");
          }
        } catch {
          if (!cancelled) setReceiptNo("PAYOUT-0001");
        }
      }
    };
    init();
    return () => { cancelled = true; };
  }, [isOpen, editPayment, initialSupplier, companyId]);

  // Load suppliers list
  const fetchSuppliers = async (q = "") => {
    if (!companyId) return;
    setSearchingParty(true);
    try {
      const res = await api.get(`/supplier/get_all?company_id=${companyId}`);
      if (res.data.status) {
        const all = res.data.data || [];
        setSuppliers(all);
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

  useEffect(() => {
    if (!isOpen || !companyId) return;
    fetchSuppliers();
  }, [isOpen, companyId]);

  // Search Suppliers when typing
  const handleSearchSuppliers = (q) => {
    setPartyQuery(q);
    setShowPartyDropdown(true);
    if (!q.trim()) {
      setSupplierSuggestions(suppliers.slice(0, 15));
    } else {
      const query = q.toLowerCase();
      setSupplierSuggestions(
        suppliers.filter(
          (s) =>
            (s.supplier_name || s.name || "").toLowerCase().includes(query) ||
            (s.mobile_number || s.phone || "").includes(query)
        )
      );
    }
  };

  const selectSupplier = (sup) => {
    setSelectedSupplier(sup);
    setPartyQuery(sup.supplier_name || sup.name || "");
    setShowPartyDropdown(false);
    setErrorMsg("");

    const pending = parseFloat(sup.pending_balance ?? sup.balance_amount ?? sup.total_balance ?? sup.balance ?? 0);
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
          const savedReceiptNo = res.data.receipt_no || res.data.invoice_no || String(receiptNo);
          if (onSuccess) onSuccess(savedReceiptNo);
          onClose();
          navigate(`/invoice/${savedReceiptNo}`);
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
          const savedReceiptNo = res.data.receipt_no || res.data.invoice_no || String(receiptNo);
          if (onSuccess) onSuccess(savedReceiptNo);

          const shouldSkipPreview = localStorage.getItem("skip_invoice_preview") === "true";
          if (shouldSkipPreview) {
            setToast(`Payment-Out #${savedReceiptNo} recorded successfully!`);
            setTimeout(() => setToast(null), 4000);

            // Reset fields for continuous data entry
            setSelectedSupplier(null);
            setPartyQuery("");
            setPaidAmount("");
            setPaymentType("Cash");
            setPaymentDate(new Date().toISOString().split("T")[0]);
            setDescription("");

            // Fetch / increment next receipt number
            try {
              const numRes = await api.get(`/invoice-settings/next-number?company_id=${companyId}&type=payment_out`);
              if (numRes.data?.status && numRes.data?.formatted_number) {
                setReceiptNo(numRes.data.formatted_number);
              } else {
                setReceiptNo((prev) => (typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYOUT-0001"));
              }
            } catch (e) {
              setReceiptNo((prev) => (typeof prev === "number" ? prev + 1 : parseInt(prev) ? parseInt(prev) + 1 : "PAYOUT-0001"));
            }
          } else {
            onClose();
            navigate(`/invoice/${savedReceiptNo}`);
          }
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

  const vendorDues = parseFloat(
    selectedSupplier?.pending_balance ??
    selectedSupplier?.balance_amount ??
    selectedSupplier?.total_balance ??
    selectedSupplier?.balance ??
    0
  );
  const vendorAdvance = parseFloat(
    selectedSupplier?.advance_balance ??
    selectedSupplier?.advance_amount ??
    0
  );

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
              {/* Supplier Autocomplete Search Input */}
              <div ref={partyRef} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    Supplier / Vendor Name <span className="text-rose-500">*</span>
                  </label>

                </div>

                <div
                  className={`relative border rounded-xl px-3.5 py-2 transition bg-white flex items-center justify-between ${showPartyDropdown ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-300 hover:border-slate-400"
                    }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search supplier by name or phone..."
                      value={partyQuery}
                      onChange={(e) => handleSearchSuppliers(e.target.value)}
                      onFocus={() => {
                        setShowPartyDropdown(true);
                        if (supplierSuggestions.length === 0) setSupplierSuggestions(suppliers.slice(0, 15));
                      }}
                      className="w-full text-xs font-bold text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  <ChevronDown
                    size={14}
                    className="text-slate-400 cursor-pointer ml-1.5 shrink-0"
                    onClick={() => {
                      setShowPartyDropdown((v) => !v);
                      if (supplierSuggestions.length === 0) setSupplierSuggestions(suppliers.slice(0, 15));
                    }}
                  />
                </div>

                {/* Selected Supplier Info & Balance Chip */}
                {selectedSupplier && (
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-xl text-[11px] shadow-2xs animate-in fade-in duration-100">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-slate-800 truncate">
                        {selectedSupplier.supplier_name || selectedSupplier.name}
                      </span>
                      {(selectedSupplier.mobile_number || selectedSupplier.phone) && (
                        <span className="text-slate-500 font-medium font-mono text-[10px] shrink-0">
                          • 📱 {selectedSupplier.mobile_number || selectedSupplier.phone}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      {vendorAdvance > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                          Adv: ₹{vendorAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">
                        Due:{" "}
                        <span className={`font-bold font-mono ${vendorDues > 0 ? "text-rose-600 font-black" : "text-slate-700"}`}>
                          ₹{vendorDues.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Supplier Suggestions Dropdown */}
                {showPartyDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto z-50 py-1 divide-y divide-slate-100 animate-in fade-in duration-100">
                    <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <span
                        onClick={() => {
                          setShowPartyDropdown(false);
                          setShowAddSupplierModal(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                        <span>Add New Supplier</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Due / Advance</span>
                    </div>
                    {searchingParty ? (
                      <div className="p-3 text-xs text-slate-400 text-center font-medium">Loading suppliers...</div>
                    ) : supplierSuggestions.length === 0 ? (
                      <div className="p-3 text-xs text-slate-600 text-center">
                        {partyQuery.trim() ? (
                          <>No match. Will save as <b>"{partyQuery}"</b></>
                        ) : (
                          "No suppliers found"
                        )}
                      </div>
                    ) : (
                      supplierSuggestions.map((s) => {
                        const sDue = parseFloat(s.pending_balance ?? s.balance_amount ?? s.total_balance ?? s.pending_amount ?? 0);
                        const sAdv = parseFloat(s.advance_balance ?? s.advance_amount ?? 0);
                        const sPhone = s.mobile_number || s.phone || s.supplier_phone;
                        return (
                          <div
                            key={s.id}
                            onClick={() => selectSupplier(s)}
                            className="px-3.5 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{s.supplier_name || s.name}</div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {sPhone ? `📱 ${sPhone}` : (s.city || s.state || "Registered Vendor")}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              {sAdv > 0 && (
                                <div className="text-[10px] font-bold text-indigo-700">
                                  Adv: ₹{sAdv.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                              <div>
                                <span className="text-[9.5px] text-slate-400 font-semibold uppercase mr-1">Due:</span>
                                <span className={`font-bold text-xs ${sDue > 0 ? "text-rose-600 font-black" : "text-slate-700"}`}>
                                  ₹{sDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
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
                      className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${paymentType === type
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

            {/* Right Column: Receipt No, Date, Amount */}
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Receipt No */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Receipt #</label>
                  <div className="px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs font-black text-blue-700 font-mono tracking-wide text-center">
                    {receiptNo || "Auto Generated"}
                  </div>
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-black text-slate-900 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Calculation / Disbursement Summary Box */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/70">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Disbursement Summary</span>
              <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                INR Currency
              </span>
            </div>
            {selectedSupplier && vendorAdvance > 0 && (
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Supplier Advance Balance</span>
                <span className="font-bold text-indigo-700">
                  ₹ {vendorAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {selectedSupplier && (
              <div className="flex justify-between items-center text-slate-600 font-semibold">
                <span>Supplier Current Due</span>
                <span className={`font-bold ${vendorDues > 0 ? "text-rose-600 font-black" : "text-slate-700"}`}>
                  ₹ {vendorDues.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 font-semibold">
              <span>Disbursed Amount</span>
              <span className="font-bold text-slate-900">
                ₹ {(parseFloat(paidAmount) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {selectedSupplier && (
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-900">Remaining Payable Due</span>
                <span className={`font-bold ${Math.max(0, (vendorDues - (parseFloat(paidAmount) || 0))) > 0 ? "text-rose-600 font-black text-sm" : "text-emerald-700 font-black text-sm"}`}>
                  ₹ {Math.max(0, (vendorDues - (parseFloat(paidAmount) || 0))).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
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
            onClick={handleSavePaymentOut}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {saving ? "Recording..." : "Save Payment"}
          </button>
        </div>
      </div>

      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        companyId={companyId}
        onSupplierAdded={(s) => {
          selectSupplier(s);
          fetchSuppliers("");
        }}
      />
    </div>
  );
}

