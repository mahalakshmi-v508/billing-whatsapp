import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Truck,
  FileText,
  Building2,
  MapPin,
  User,
  Info,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "../settings/settingsApi";

const EWAY_FIELDS = [
  { key: "transaction_type", label: "Transaction Type", options: ["Outward", "Inward"] },
  { key: "supply_type", label: "Supply Type", options: ["Supply", "CS", "Fix Value Supply", "Works Contract", "Debit Note", "Credit Note"] },
  { key: "sub_supply_type", label: "Sub Supply Type", options: ["Outward", "Job Work", "Inter State Transfer", "Export", "Sale"] },
  { key: "doc_type", label: "Document Type", options: ["INV", "BOE", "BIL", "CHL", "EXP"] },
];

function money(n) {
  const v = Number(n || 0);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  const s = String(d);
  const day = `${s.slice(0, 10)}`;
  return day;
}

function defaultsFrom(invoice, customer) {
  const customerAddress = [customer?.address, customer?.city, customer?.state]
    .filter(Boolean)
    .join(", ");
  const companyAddress = String(invoice?.company_address || "").trim();
  const fromPlace = (companyAddress.split(",")[0] || invoice?.company_name || "").trim();
  return {
    transaction_type: "Outward",
    supply_type: "Supply",
    sub_supply_type: "Outward",
    doc_type: invoice && invoice.invoice_type === "Bill of Supply" ? "BIL" : "INV",
    doc_number: invoice?.invoice_no || "",
    doc_date: fmtDate(invoice?.created_at || invoice?.invoice_date || ""),
    from_address: companyAddress,
    to_address: customerAddress,
    from_place: fromPlace,
    transport_mode: "Road",
    transporter_name: "",
    transporter_id: "",
    vehicle_type: "Regular",
    vehicle_number: "",
    distance_km: "",
  };
}

function Input({ label, value, onChange, type = "text", error, placeholder, className = "" }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`px-3 py-2.5 border rounded-lg text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
          error ? "border-red-400 bg-red-50/30" : "border-slate-300"
        } ${className}`}
      />
      {error ? <span className="text-[11px] font-semibold text-red-500">{error}</span> : null}
    </label>
  );
}

function Select({ label, value, onChange, options, error }) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`px-3 py-2.5 border rounded-lg text-[13px] text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition cursor-pointer ${
          error ? "border-red-400 bg-red-50/30" : "border-slate-300"
        }`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error ? <span className="text-[11px] font-semibold text-red-500">{error}</span> : null}
    </label>
  );
}

export default function GenerateEwayBill() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invoiceNoParam = params.get("invoice_no") || "";
  const invoiceIdParam = params.get("invoice_id") || "";

  const companyId = useMemo(() => getCompanyId(), []);

  // ── Load invoice + customer ──
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/invoice/get_invoice_by_id", {
          params: { id: invoiceIdParam || invoiceNoParam },
        });
        if (!active) return;
        if (!res.data || !res.data.status) {
          setLoadError((res.data && res.data.message) || "Could not load invoice.");
          return;
        }
        const inv = res.data.data || null;
        setInvoice(inv);
        if (inv) setForm(defaultsFrom(inv, null));
      } catch {
        if (active) setLoadError("Failed to load invoice. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [invoiceIdParam, invoiceNoParam]);

  const [customer, setCustomer] = useState(null);
  useEffect(() => {
    let active = true;
    if (!invoice || !invoice.customer_id) return;
    (async () => {
      try {
        const res = await api.get("/customer/get_customer_by_id", { params: { id: invoice.customer_id } });
        if (!active || !res.data || !res.data.status) return;
        const cust = res.data.data || null;
        setCustomer(cust);
        setForm((prev) => ({
          ...defaultsFrom(invoice, cust),
          ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== "" && v != null)),
        }));
      } catch {
        /* customer profile is optional enrichment */
      }
    })();
    return () => {
      active = false;
    };
  }, [invoice]);

  // ── Dynamic GST calculation ──
  const gst = useMemo(() => {
    if (!invoice) return null;
    const products = Array.isArray(invoice.products) ? invoice.products : [];
    const sellerGstin = String(invoice.gstin || "").trim();
    const buyerGstin = String(invoice.gst_no || (customer && customer.gst_no) || "").trim();
    const intraState =
      sellerGstin.length >= 2 && buyerGstin.length >= 2 && sellerGstin.slice(0, 2) === buyerGstin.slice(0, 2);

    const items = products
      .map((item) => {
        const qty = Number(item.quantity ?? item.qty ?? 0);
        const rate = Number(item.price ?? item.rate ?? 0);
        const discount = Number(item.discount ?? 0);
        const gstRate = Number(item.gst ?? item.gst_rate ?? 0);
        const taxable = Math.max(0, qty * rate - discount);
        const gstAmt = (taxable * gstRate) / 100;
        const cgst = intraState ? gstAmt / 2 : 0;
        const sgst = intraState ? gstAmt / 2 : 0;
        const igst = intraState ? 0 : gstAmt;
        return {
          productId: item.product_id,
          name: item.product_name || item.name || "",
          code: item.product_code || "",
          qty,
          unit: item.unit || "",
          rate,
          discount,
          gstRate,
          taxable: Math.round(taxable * 100) / 100,
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          igst: Math.round(igst * 100) / 100,
          lineTotal: Math.round((taxable + cgst + sgst + igst) * 100) / 100,
        };
      })
      .filter((i) => i.name || i.qty > 0 || i.rate > 0);

    const sum = (pick) => Math.round(items.reduce((acc, i) => acc + pick(i), 0) * 100) / 100;
    const taxableTotal = sum((i) => i.taxable);
    const cgstTotal = sum((i) => i.cgst);
    const sgstTotal = sum((i) => i.sgst);
    const igstTotal = sum((i) => i.igst);
    const gstTotal = cgstTotal + sgstTotal + igstTotal;
    const computedTotal = taxableTotal + gstTotal;
    const invoiceTotal = Math.max(computedTotal, Number(invoice.total_amount || 0));

    return {
      items,
      intraState,
      sellerGstin,
      buyerGstin,
      taxableTotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      gstTotal,
      computedTotal,
      invoiceTotal,
    };
  }, [invoice, customer]);

  // ── E-Way form ──
  const setField = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // ── Validation ──
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedBill, setSubmittedBill] = useState(null);

  const validate = () => {
    const errs = {};
    if (!invoice) errs.invoice = "Invoice data is missing.";
    if (!gst || gst.items.length === 0) errs.items = "No billable items found on this invoice.";
    if (!form.transport_mode) errs.transport_mode = "Transport mode is required.";
    if (!form.vehicle_number || !form.vehicle_number.trim()) errs.vehicle_number = "Vehicle number is required.";
    if (!form.distance_km || Number(form.distance_km) <= 0) errs.distance_km = "Approximate distance is required.";
    if (!form.from_address || !form.from_address.trim()) errs.from_address = "From address is required.";
    if (!form.to_address || !form.to_address.trim()) errs.to_address = "To address is required.";
    if (!form.doc_number) errs.doc_number = "Document number is required.";
    if (!gst?.sellerGstin) errs.sellerGSTIN = "Seller GSTIN is missing.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        company_id: companyId,
        invoice_id: invoice.id,
        invoice_no: invoice.invoice_no,
        invoice_value: gst.invoiceTotal,
        taxable_amount: gst.taxableTotal,
        cgst_amount: gst.cgstTotal,
        sgst_amount: gst.sgstTotal,
        igst_amount: gst.igstTotal,
        gst_total: gst.gstTotal,
        items: gst.items.map((i) => ({
          product_id: i.productId,
          product_name: i.name,
          product_code: i.code,
          quantity: i.qty,
          unit: i.unit,
          rate: i.rate,
          discount: i.discount,
          gst_rate: i.gstRate,
          taxable: i.taxable,
          cgst: i.cgst,
          sgst: i.sgst,
          igst: i.igst,
          line_total: i.lineTotal,
        })),
        from_gstin: gst.sellerGstin,
        to_gstin: gst.buyerGstin || "URP",
        consignee_name: invoice.customer_name,
        consignee_place: customer?.city || customer?.state || "",
        consignee_address: form.to_address,
        from_place: form.from_place,
        from_address: form.from_address,
        customer_phone: invoice.customer_phone || customer?.phone || "",
        transport_mode: form.transport_mode,
        transporter_name: form.transporter_name,
        transporter_id: form.transporter_id,
        vehicle_type: form.vehicle_type,
        vehicle_number: form.vehicle_number.trim().toUpperCase(),
        distance_km: Number(form.distance_km),
        transaction_type: form.transaction_type,
        supply_type: form.supply_type,
        sub_supply_type: form.sub_supply_type,
        doc_type: form.doc_type,
        doc_number: form.doc_number,
        doc_date: form.doc_date,
        ewaybill_type: "EWB",
      };

      const res = await api.post("/eway-bill/create", payload);
      if (res.data && res.data.status) {
        setSubmittedBill(res.data.data || null);
        setTimeout(() => navigate("/e-way"), 1600);
      } else {
        setSubmitError((res.data && res.data.message) || "Submission failed.");
      }
    } catch (err) {
      setSubmitError(
        (err.response && err.response.data && err.response.data.message) ||
          "Could not generate E-Way Bill. Please check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={34} className="animate-spin text-blue-600" />
          <p className="text-sm font-semibold">Loading invoice details…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-6 flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Invoice not found</h2>
          <p className="text-sm text-slate-500 mb-5">{loadError}</p>
          <button
            type="button"
            onClick={() => navigate("/sales/invoices")}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer"
          >
            Back to Sales Invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 font-['Plus_Jakarta_Sans',sans-serif]">

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/sales/invoices")}
            className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer flex-shrink-0"
            title="Back to Sales Invoices"
          >
            <ArrowLeft size={19} />
          </button>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Truck size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Generate E-Way Bill</h1>
            <p className="text-[12.5px] text-slate-500 font-medium truncate">
              Invoice <span className="font-bold text-blue-600">#{invoice?.invoice_no || invoiceNoParam}</span>
              {gst && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      gst.intraState
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-purple-50 text-purple-600 border-purple-200"
                    }`}
                  >
                    {gst.intraState ? "Intra-State" : "Inter-State"} · CGST+SGST / IGST
                  </span>
                </span>
              )}
            </p>
          </div>
        </div>
        {submittedBill && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[13px] font-bold">
            <CheckCircle2 size={16} /> EWB {submittedBill.ewb_number} generated
          </div>
        )}
      </div>

      {/* success banner */}
      {submittedBill && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
          <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
          <span>E-Way Bill generated successfully. Redirecting to the registry…</span>
        </div>
      )}
      {submitError && (
        <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* ── 1. INVOICE SUMMARY ── */}
      <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
          <h2 className="text-[13.5px] font-bold text-slate-700">Invoice Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Seller */}
          <div className="p-5 space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Building2 size={13} /> Supplier / Seller
            </p>
            <p className="text-[14px] font-bold text-slate-800">{invoice.company_name || "—"}</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">{invoice.company_address || "—"}</p>
            <p className="text-[12px] text-slate-600 font-semibold">
              GSTIN: <span className="font-mono text-slate-800">{gst?.sellerGstin || "—"}</span>
            </p>
            <p className="text-[12px] text-slate-500">{invoice.phone ? `Ph: ${invoice.phone}` : ""}</p>
          </div>
          {/* Buyer */}
          <div className="p-5 space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <User size={13} /> Customer / Buyer
            </p>
            <p className="text-[14px] font-bold text-slate-800">{invoice.customer_name || "—"}</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              {[customer?.address, customer?.city, customer?.state].filter(Boolean).join(", ") || "—"}
            </p>
            <p className="text-[12px] text-slate-600 font-semibold">
              GSTIN: <span className="font-mono text-slate-800">{gst?.buyerGstin || "—"}</span>
            </p>
            <p className="text-[12px] text-slate-500">{invoice.customer_phone || customer?.phone || ""}</p>
          </div>
          {/* Meta */}
          <div className="p-5 space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Info size={13} /> Document Info
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              <span className="text-slate-500">Invoice Number</span>
              <span className="font-bold text-slate-800 text-right">{invoice.invoice_no || "—"}</span>
              <span className="text-slate-500">Invoice Date</span>
              <span className="font-bold text-slate-800 text-right">{fmtDate(invoice.created_at || invoice.invoice_date)}</span>
              <span className="text-slate-500">Invoice Type</span>
              <span className="font-bold text-slate-800 text-right">{invoice.invoice_type || "Tax Invoice"}</span>
              <span className="text-slate-500">Payment</span>
              <span className="font-bold text-slate-800 text-right capitalize">{invoice.payment_method || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. ITEMS + GST ── */}
      <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-slate-700">Item Details &amp; GST Calculation</h2>
          <span className="text-[11px] font-semibold text-slate-400">
            {gst?.intraState ? "Intra-state → CGST & SGST split" : "Inter-state → IGST"}
          </span>
        </div>
        <table className="w-full text-left text-xs min-w-max">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[10.5px] tracking-wide">
              <th className="py-3 px-4 font-semibold whitespace-nowrap">#</th>
              <th className="py-3 px-4 font-semibold">Item</th>
              <th className="py-3 px-4 font-semibold whitespace-nowrap">Code / HSN</th>
              <th className="py-3 px-4 font-semibold text-right">Qty</th>
              <th className="py-3 px-4 font-semibold text-right">Rate</th>
              <th className="py-3 px-4 font-semibold text-right">GST %</th>
              <th className="py-3 px-4 font-semibold text-right">Taxable</th>
              <th className="py-3 px-4 font-semibold text-right">CGST</th>
              <th className="py-3 px-4 font-semibold text-right">SGST</th>
              <th className="py-3 px-4 font-semibold text-right">IGST</th>
              <th className="py-3 px-4 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {gst?.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                <td className="py-3 px-4 font-semibold text-slate-700">{item.name}</td>
                <td className="py-3 px-4 text-slate-500 font-mono">{item.code || "—"}</td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {item.qty} <span className="text-slate-400">{item.unit}</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-600">{money(item.rate)}</td>
                <td className="py-3 px-4 text-right font-semibold text-slate-700">{item.gstRate}%</td>
                <td className="py-3 px-4 text-right text-slate-700">{money(item.taxable)}</td>
                <td className="py-3 px-4 text-right text-slate-600">{money(item.cgst)}</td>
                <td className="py-3 px-4 text-right text-slate-600">{money(item.sgst)}</td>
                <td className="py-3 px-4 text-right text-slate-600">{money(item.igst)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/80 border-t border-slate-200 text-[12px]">
              <td colSpan={6} className="py-3.5 px-4 font-bold uppercase text-[10.5px] tracking-wide text-slate-500">
                Totals
              </td>
              <td className="py-3.5 px-4 text-right font-bold text-slate-800">{money(gst?.taxableTotal)}</td>
              <td className="py-3.5 px-4 text-right font-semibold text-slate-600">{money(gst?.cgstTotal)}</td>
              <td className="py-3.5 px-4 text-right font-semibold text-slate-600">{money(gst?.sgstTotal)}</td>
              <td className="py-3.5 px-4 text-right font-semibold text-slate-600">{money(gst?.igstTotal)}</td>
              <td className="py-3.5 px-4 text-right font-bold text-slate-800">{money(gst?.invoiceTotal)}</td>
            </tr>
            <tr className="bg-blue-50/50 text-[11.5px]">
              <td colSpan={6} className="py-3 px-4 font-bold uppercase tracking-wide text-slate-500">
                Taxable · {money(gst?.taxableTotal)} &nbsp;|&nbsp; GST {money(gst?.gstTotal)} · CGST {money(gst?.cgstTotal)} + SGST{" "}
                {money(gst?.sgstTotal)} + IGST {money(gst?.igstTotal)}
              </td>
              <td colSpan={2} className="py-3 px-4 text-right font-bold text-slate-500 uppercase tracking-wide">
                Invoice Total
              </td>
              <td colSpan={3} className="py-3 px-4 text-right text-[16px] font-extrabold text-blue-700">
                {money(gst?.invoiceTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {errors.items && (
        <p className="mt-2 text-[12px] font-semibold text-red-500 flex items-center gap-1.5">
          <AlertCircle size={13} /> {errors.items}
        </p>
      )}
      {(errors.sellerGSTIN || errors.buyerGSTIN) && (
        <p className="mt-2 text-[12px] font-semibold text-red-500 flex items-center gap-1.5">
          <AlertCircle size={13} />
          {errors.sellerGSTIN || ""} {errors.buyerGSTIN || ""}
        </p>
      )}

      {/* ── 3. E-WAY BILL FORM ── */}
      <form onSubmit={handleSubmit} className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold text-slate-700 flex items-center gap-2">
            <Truck size={16} className="text-blue-600" /> E-Way Bill Details
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Transport details are prefilled where possible — review before proceeding</span>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Document */}
          <Select label="Transaction Type" value={form.transaction_type} onChange={setField("transaction_type")} options={EWAY_FIELDS[0].options} />
          <Select label="Supply Type" value={form.supply_type} onChange={setField("supply_type")} options={EWAY_FIELDS[1].options} />
          <Select label="Sub Supply Type" value={form.sub_supply_type} onChange={setField("sub_supply_type")} options={EWAY_FIELDS[2].options} />
          <Select label="Document Type" value={form.doc_type} onChange={setField("doc_type")} options={EWAY_FIELDS[3].options} />
          <Input label="Document Number" value={form.doc_number} onChange={setField("doc_number")} error={errors.doc_number} />
          <Input label="Document Date" type="date" value={form.doc_date} onChange={setField("doc_date")} />

          {/* Addresses */}
          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <Input label="From Address (Dispatch)" value={form.from_address} onChange={setField("from_address")} error={errors.from_address} />
            <Input label="To Address (Delivery)" value={form.to_address} onChange={setField("to_address")} error={errors.to_address} />
          </div>

          {/* Transport */}
          <div className="sm:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            <Select label="Transport Mode" value={form.transport_mode} onChange={setField("transport_mode")} options={["Road", "Rail", "Air", "Ship"]} error={errors.transport_mode} />
            <Select label="Vehicle Type" value={form.vehicle_type} onChange={setField("vehicle_type")} options={["Regular", "ODC"]} />
            <Input label="Vehicle Number" value={form.vehicle_number} onChange={setField("vehicle_number")} error={errors.vehicle_number} placeholder="e.g. TN-01-AB-1234" />
            <Input label="Approximate Distance (km)" type="number" value={form.distance_km} onChange={setField("distance_km")} error={errors.distance_km} placeholder="e.g. 420" />
            <Input label="Transporter Name" value={form.transporter_name} onChange={setField("transporter_name")} placeholder="Optional" />
            <Input label="Transporter ID" value={form.transporter_id} onChange={setField("transporter_id")} placeholder="Optional" />
            <div className="sm:col-span-2 xl:col-span-2 flex flex-col gap-1.5">
              <span className="text-[11.5px] font-bold uppercase tracking-wide text-slate-500">Validity Rule</span>
              <p className="px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11.5px] text-slate-500 leading-relaxed">
                Regular goods: 200 km per day · ODC: 20 km per day · minimum 1 day · up to 15 days without distance. Valid-upto is
                computed automatically on the server.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Proceed */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11.5px] text-slate-400 flex items-center gap-1.5">
            <MapPin size={13} className="text-slate-400" />
            {form.transport_mode} transport · {form.vehicle_number ? form.vehicle_number.toUpperCase() : "no vehicle yet"}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[14px] font-bold shadow-md shadow-blue-600/20 cursor-pointer transition"
          >
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} />}
            {submitting ? "Posting E-Way Bill…" : "Proceed & Generate E-Way Bill"}
          </button>
        </div>
      </form>

      <p className="mt-4 text-center text-[11.5px] text-slate-400">
        E-Way Bill will be linked to invoice <span className="font-bold text-slate-500">#{invoice?.invoice_no}</span>.
        Only one active E-Way Bill is allowed per invoice.
      </p>
    </div>
  );
}