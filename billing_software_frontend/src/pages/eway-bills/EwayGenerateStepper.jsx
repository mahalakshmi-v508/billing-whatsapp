import { useState, useEffect } from "react";
import {
  Truck,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Printer,
  Download,
  Share2,
  Eye,
  RotateCcw,
  Copy,
  Check,
  Building2,
  User,
  Package,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { formatINR } from "./mockEwayData";

const INITIAL_FORM = {
  // Step 1: Document
  docType: "Tax Invoice",
  docNo: `INV-2026-00${Math.floor(100 + Math.random() * 900)}`,
  docDate: new Date().toISOString().split("T")[0],
  customerName: "ABC Traders Ltd",
  customerGstin: "33AABCT1234F1Z5",
  customerPhone: "+91 98765 43210",
  customerAddress: "45, Industrial Estate, Guindy, Chennai, Tamil Nadu - 600032",
  placeOfDelivery: "Chennai, Tamil Nadu",
  items: [
    { name: "Super Basmati Rice (25kg)", hsn: "10063020", qty: 40, unit: "Bags", rate: 1750, taxable: 70000, gstRate: 5, gstAmount: 3500, total: 73500 },
    { name: "Sona Masoori Rice (25kg)", hsn: "10063010", qty: 25, unit: "Bags", rate: 1400, taxable: 35000, gstRate: 5, gstAmount: 1750, total: 36750 },
  ],

  // Step 2: Transport
  transportMode: "Road",
  transporterName: "XYZ Logistics & Express",
  transporterId: "33TRNSP1029F1Z1",
  vehicleNo: "TN 76 AB 1234",
  vehicleType: "Regular",
  distance: 145,
  docLrNo: "LR-98241",
  docLrDate: new Date().toISOString().split("T")[0],
};

export default function EwayGenerateStepper({ onCreated, onViewGenerated, onPrint, onDownload, onWhatsApp }) {
  const [step, setStep] = useState(1); // 1: Doc, 2: Transport, 3: Review, 4: Loading, 5: Success
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [copied, setCopied] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // 0 to 4
  const [generatedBill, setGeneratedBill] = useState(null);

  // Calculations
  const totalTaxable = formData.items.reduce((sum, item) => sum + (Number(item.taxable) || 0), 0);
  const totalGst = formData.items.reduce((sum, item) => sum + (Number(item.gstAmount) || 0), 0);
  const invoiceTotal = totalTaxable + totalGst;

  const handleItemChange = (index, field, val) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      const target = { ...nextItems[index], [field]: val };

      if (field === "qty" || field === "rate" || field === "gstRate") {
        const qty = Number(field === "qty" ? val : target.qty) || 0;
        const rate = Number(field === "rate" ? val : target.rate) || 0;
        const gstRate = Number(field === "gstRate" ? val : target.gstRate) || 0;
        const taxable = qty * rate;
        const gstAmount = (taxable * gstRate) / 100;
        target.taxable = taxable;
        target.gstAmount = gstAmount;
        target.total = taxable + gstAmount;
      }
      nextItems[index] = target;
      return { ...prev, items: nextItems };
    });
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { name: "New Product Item", hsn: "10063090", qty: 10, unit: "Pcs", rate: 1000, taxable: 10000, gstRate: 18, gstAmount: 1800, total: 11800 },
      ],
    }));
  };

  const removeItem = (idx) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  // Step 4: Simulated Generation Progress
  const startGeneration = () => {
    setStep(4);
    setLoadingProgress(1);

    setTimeout(() => {
      setLoadingProgress(2);
    }, 700);

    setTimeout(() => {
      setLoadingProgress(3);
    }, 1400);

    setTimeout(() => {
      setLoadingProgress(4);
    }, 2100);

    setTimeout(() => {
      const newEwbNo = `18${Math.floor(1000000000 + Math.random() * 9000000000)}`;
      const createdObj = {
        id: `EWB-${Date.now()}`,
        ewb_no: newEwbNo,
        invoice_no: formData.docNo,
        invoice_date: formData.docDate,
        doc_type: formData.docType,
        customer_name: formData.customerName,
        customer_gstin: formData.customerGstin,
        customer_phone: formData.customerPhone,
        customer_address: formData.customerAddress,
        place_of_delivery: formData.placeOfDelivery,
        supplier_name: "Smart Ledger Enterprise Pvt Ltd",
        supplier_gstin: "33AABCS5555L1Z8",
        supplier_address: "12, Commercial Road, Coimbatore, Tamil Nadu - 641001",
        taxable_value: totalTaxable,
        cgst: totalGst / 2,
        sgst: totalGst / 2,
        igst: 0,
        total_value: invoiceTotal,
        distance: `${formData.distance} km`,
        transport_mode: formData.transportMode,
        transporter_name: formData.transporterName,
        transporter_id: formData.transporterId,
        vehicle_no: formData.vehicleNo.toUpperCase(),
        vehicle_type: formData.vehicleType,
        doc_lr_no: formData.docLrNo,
        doc_lr_date: formData.docLrDate,
        generated_at: "Just now",
        valid_until: "2026-09-27 11:59 PM",
        remaining_time: "2 days remaining",
        status: "Active",
        items: formData.items,
        timeline: [
          {
            title: "E-Way Bill Generated",
            time: "Just now",
            user: "Current User",
            note: `Generated for ${formData.docType} #${formData.docNo} via NIC Portal`,
          },
        ],
      };

      setGeneratedBill(createdObj);
      onCreated && onCreated(createdObj);
      setStep(5);
    }, 2800);
  };

  const handleCopy = () => {
    if (generatedBill) {
      navigator.clipboard?.writeText(generatedBill.ewb_no);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetForm = () => {
    setFormData(INITIAL_FORM);
    setGeneratedBill(null);
    setStep(1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Wizard Header with Step Indicator ── */}
      {step <= 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Generate New E-Way Bill</h2>
              <p className="text-xs text-slate-500">Provide document and transit details to register with NIC Gateway</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Step {step} of 3
            </span>
          </div>

          {/* Progress Bar & Indicators */}
          <div className="grid grid-cols-3 gap-2 mt-5">
            {[
              { num: 1, label: "1. Document & Items" },
              { num: 2, label: "2. Transport & Vehicle" },
              { num: 3, label: "3. Review & Submit" },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => s.num < step && setStep(s.num)}
                className={`p-2.5 rounded-xl border text-center transition ${
                  step === s.num
                    ? "bg-blue-50/80 border-blue-500 text-blue-700 font-bold shadow-2xs"
                    : step > s.num
                    ? "bg-slate-50 border-slate-200 text-emerald-700 font-semibold cursor-pointer hover:bg-slate-100"
                    : "bg-slate-50/50 border-slate-100 text-slate-400 font-medium"
                }`}
              >
                <span className="text-xs flex items-center justify-center gap-1.5">
                  {step > s.num ? <CheckCircle2 size={13} className="text-emerald-600" /> : null}
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Document Details & Product Line Items ── */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileText size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Document Information & Consignee Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Document Type *</label>
              <select
                value={formData.docType}
                onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Bill of Supply">Bill of Supply</option>
                <option value="Delivery Challan">Delivery Challan</option>
                <option value="Credit Note">Credit Note</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Document / Invoice Number *</label>
              <input
                type="text"
                required
                value={formData.docNo}
                onChange={(e) => setFormData({ ...formData, docNo: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Document Date *</label>
              <input
                type="date"
                required
                value={formData.docDate}
                onChange={(e) => setFormData({ ...formData, docDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Consignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Customer / Consignee Name *</label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Consignee GSTIN (Optional if Unregistered)</label>
              <input
                type="text"
                value={formData.customerGstin}
                onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value.toUpperCase() })}
                placeholder="e.g. 33AABCT1234F1Z5"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Delivery Address / Destination *</label>
              <input
                type="text"
                required
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Place of Delivery (State / City) *</label>
              <input
                type="text"
                required
                value={formData.placeOfDelivery}
                onChange={(e) => setFormData({ ...formData, placeOfDelivery: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Product Items Table */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <Package size={15} className="text-blue-600" />
                Product Line Items
              </span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition cursor-pointer"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10.5px] font-extrabold uppercase text-slate-500 border-b border-slate-200">
                    <th className="p-3">Product Description</th>
                    <th className="p-3 w-28">HSN Code</th>
                    <th className="p-3 w-20">Qty</th>
                    <th className="p-3 w-24">Rate (₹)</th>
                    <th className="p-3 w-24">Taxable (₹)</th>
                    <th className="p-3 w-20">GST %</th>
                    <th className="p-3 w-28 text-right">Total (₹)</th>
                    <th className="p-3 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => handleItemChange(idx, "hsn", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => handleItemChange(idx, "qty", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-slate-800">
                        {formatINR(item.taxable)}
                      </td>
                      <td className="p-2.5">
                        <select
                          value={item.gstRate}
                          onChange={(e) => handleItemChange(idx, "gstRate", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        {formatINR(item.total)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-300 hover:text-rose-600 transition p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax Total Footnote */}
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Taxable Total: <strong className="text-slate-900 font-mono">{formatINR(totalTaxable)}</strong> + GST: <strong className="text-slate-900 font-mono">{formatINR(totalGst)}</strong>
              </span>
              <span className="text-sm font-black text-slate-900 font-mono">
                Invoice Total: {formatINR(invoiceTotal)}
              </span>
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <span>Continue to Transport Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Transport & Vehicle Information ── */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Truck size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Transportation & Part-B Vehicle Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Transportation Mode *</label>
              <select
                value={formData.transportMode}
                onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Road">Road</option>
                <option value="Rail">Rail</option>
                <option value="Air">Air</option>
                <option value="Ship">Ship</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Approximate Distance (km) *</label>
              <input
                type="number"
                required
                value={formData.distance}
                onChange={(e) => setFormData({ ...formData, distance: Number(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Transporter Name</label>
              <input
                type="text"
                value={formData.transporterName}
                onChange={(e) => setFormData({ ...formData, transporterName: e.target.value })}
                placeholder="e.g. XYZ Logistics / Self"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Transporter GSTIN / TRANSIN</label>
              <input
                type="text"
                value={formData.transporterId}
                onChange={(e) => setFormData({ ...formData, transporterId: e.target.value.toUpperCase() })}
                placeholder="e.g. 33TRNSP1029F1Z1"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Vehicle Number *</label>
              <input
                type="text"
                required
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                placeholder="e.g. TN 76 AB 1234"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Vehicle Type</label>
              <select
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="Regular">Regular</option>
                <option value="Over Dimensional Cargo (ODC)">Over Dimensional Cargo (ODC)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Doc / LR / Railway Receipt Number</label>
              <input
                type="text"
                value={formData.docLrNo}
                onChange={(e) => setFormData({ ...formData, docLrNo: e.target.value })}
                placeholder="e.g. LR-98241"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">LR Document Date</label>
              <input
                type="date"
                value={formData.docLrDate}
                onChange={(e) => setFormData({ ...formData, docLrDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Document</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold transition shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <span>Review Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Complete Review Summary Card ── */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Review E-Way Bill Details Before Submission</h3>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Ready to Transmit
            </span>
          </div>

          {/* 3 Review Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 block">Document Details</span>
              <p className="font-bold text-slate-900">{formData.docType} #{formData.docNo}</p>
              <p className="text-slate-600">Dated: {formData.docDate}</p>
              <p className="font-mono font-bold text-blue-700">Total: {formatINR(invoiceTotal)}</p>
            </div>

            {/* Consignee Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 block">Consignee (Ship To)</span>
              <p className="font-bold text-slate-900 truncate">{formData.customerName}</p>
              <p className="text-slate-600 font-mono">{formData.customerGstin || "Unregistered"}</p>
              <p className="text-slate-500 truncate">{formData.placeOfDelivery}</p>
            </div>

            {/* Transport Box */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <span className="text-[10.5px] font-bold uppercase text-slate-400 block">Transport (Part-B)</span>
              <p className="font-mono font-bold text-slate-900">{formData.vehicleNo} ({formData.vehicleType})</p>
              <p className="text-slate-600">{formData.transporterName || "Self"}</p>
              <p className="text-slate-500">Distance: {formData.distance} km</p>
            </div>
          </div>

          {/* Items Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
              Included Items ({formData.items.length})
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5">HSN</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Taxable</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {formData.items.map((it, i) => (
                  <tr key={i}>
                    <td className="p-2.5 font-medium">{it.name}</td>
                    <td className="p-2.5 font-mono">{it.hsn}</td>
                    <td className="p-2.5 text-right">{it.qty} {it.unit}</td>
                    <td className="p-2.5 text-right font-mono">{formatINR(it.taxable)}</td>
                    <td className="p-2.5 text-right font-mono font-bold">{formatINR(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to Edit</span>
            </button>

            <button
              type="button"
              onClick={startGeneration}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-extrabold transition shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <Sparkles size={15} />
              <span>Generate E-Way Bill via NIC</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Loading State with Step Checklist ── */}
      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-10 md:p-14 shadow-xs text-center flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 shadow-md shadow-blue-500/20">
            <Truck size={30} className="animate-bounce" />
          </div>

          <div>
            <h3 className="text-base font-extrabold text-slate-900">Generating E-Way Bill...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to NIC E-Way Bill Gateway via GSP</p>
          </div>

          {/* Animated Checklist Steps */}
          <div className="w-full max-w-sm space-y-3 text-left">
            <div className={`flex items-center gap-3 text-xs ${loadingProgress >= 1 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
              {loadingProgress >= 1 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>Validating invoice format & GSTIN check</span>
            </div>

            <div className={`flex items-center gap-3 text-xs ${loadingProgress >= 2 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
              {loadingProgress >= 2 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>Preparing Part-A & Part-B transport payload</span>
            </div>

            <div className={`flex items-center gap-3 text-xs ${loadingProgress >= 3 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
              {loadingProgress >= 3 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>Signing payload with Digital Key</span>
            </div>

            <div className={`flex items-center gap-3 text-xs ${loadingProgress >= 4 ? "text-emerald-700 font-bold" : "text-slate-400"}`}>
              {loadingProgress >= 4 ? <CheckCircle2 size={16} className="text-emerald-600" /> : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
              <span>Finalizing E-Way Bill Number allocation</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 5: Success Screen ── */}
      {step === 5 && generatedBill && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md shadow-emerald-500/20">
              <Check size={32} strokeWidth={3} />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">E-Way Bill Generated Successfully!</h2>
            <p className="text-xs text-slate-500">Your E-Way Bill is now registered on the official GST EWB Portal.</p>
          </div>

          {/* Generated EWB Highlight Box */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10.5px] uppercase font-extrabold text-slate-400 tracking-wider">E-Way Bill Number</span>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="text-xl md:text-2xl font-mono font-black text-emerald-400 tracking-wider">
                    {generatedBill.ewb_no}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
                    title="Copy E-Way Bill Number"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-5">
                <div>
                  <span className="text-slate-400 block text-[10px]">Valid Until</span>
                  <span className="font-bold text-white block">{generatedBill.valid_until}</span>
                  <span className="text-emerald-400 text-[10px] font-bold">48 Hours Window</span>
                </div>
              </div>
            </div>
          </div>

          {/* Details Snapshot Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[10.5px]">Invoice Reference</span>
              <span className="font-bold text-slate-800 block mt-0.5">{generatedBill.invoice_no}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Customer</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">{generatedBill.customer_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Vehicle Number</span>
              <span className="font-mono font-bold text-slate-800 block mt-0.5">{generatedBill.vehicle_no}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10.5px]">Invoice Total</span>
              <span className="font-mono font-bold text-slate-900 block mt-0.5">{formatINR(generatedBill.total_value)}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onViewGenerated && onViewGenerated(generatedBill)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Eye size={14} />
              <span>View E-Way Bill</span>
            </button>

            <button
              type="button"
              onClick={() => onDownload && onDownload(generatedBill)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Download size={14} />
              <span>Download PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onPrint && onPrint(generatedBill)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition shadow-2xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={() => onWhatsApp && onWhatsApp(generatedBill)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700 transition shadow-2xs cursor-pointer"
            >
              <Share2 size={14} />
              <span>Send via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Generate Another</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
