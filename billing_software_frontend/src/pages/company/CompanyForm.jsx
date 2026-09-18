import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Building2,
  Hash,
  MapPin,
  Phone,
  Percent,
  Upload,
  X,
  Plus,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";

export default function CompanyForm({ isOpen = true, onClose, onSuccess }) {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    gstin: "",
    gst_type: "with_gst",
    phone: "",
    logo: null,
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── Toast helper ── */
  const toast = (msg, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/company");
    }
  };

  const set = (key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: undefined }));
  };

  /* ── File / Logo handling ── */
  const handleLogoChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please select an image file (PNG, JPG, WEBP)", "error");
      return;
    }
    setForm((p) => ({ ...p, logo: file }));
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const removeLogo = (e) => {
    e.stopPropagation();
    setForm((p) => ({ ...p, logo: null }));
    setLogoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const convertToBase64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
    });

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Company name is required";
    if (!form.code.trim()) e.code = "Company code is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (
      form.gstin.trim() &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        form.gstin.trim().toUpperCase()
      )
    ) {
      e.gstin = "Enter a valid 15-digit GSTIN (e.g. 33ABCDE1234F1Z5)";
    }
    if (!form.phone.trim()) {
      e.phone = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(form.phone.trim())) {
      e.phone = "Phone must be exactly 10 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast("Please fix required fields marked in red", "error");
      return;
    }

    setLoading(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    try {
      let base64Logo = "";
      if (form.logo) {
        base64Logo = await convertToBase64(form.logo);
      }

      const payload = {
        admin_id: user?.id || 0,
        company_name: form.name.trim(),
        company_code: form.code.trim().toUpperCase(),
        company_address: form.address.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        gst_type: form.gst_type,
        phone: form.phone.trim(),
        logo: base64Logo,
      };

      const res = await api.post("/company/add_company", payload);
      const isSuccess =
        res.data.status === true ||
        res.data.status === 1 ||
        res.data.status === "true" ||
        res.data.status === "success";

      if (isSuccess) {
        toast("Company registered successfully!", "success");
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate("/company");
          }
        }, 1000);
      } else {
        toast(
          res.data.message ||
            res.data.msg ||
            res.data.error ||
            "Failed to register company",
          "error"
        );
      }
    } catch (err) {
      console.error(err);
      toast("Server error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] max-h-[90vh] transition-all animate-in zoom-in-95 duration-200">
      {/* ── HEADER ── */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/80 to-white flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Register Company
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set up business entity profile, GST tax details &amp; branding
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Close"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <form onSubmit={handleSubmit} className="px-6 sm:px-8 py-6 overflow-y-auto flex-1 space-y-6">
        {/* SECTION 1: COMPANY IDENTIFICATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Building size={14} className="text-indigo-600" />
            <span>Company Identification</span>
            <div className="flex-1 h-px bg-slate-100 ml-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 size={15} />
                </div>
                <input
                  type="text"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.name
                      ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                  }`}
                  placeholder="e.g. Mahalakshmi Traders Pvt Ltd"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoFocus
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            {/* Company Code */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                Company Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash size={14} />
                </div>
                <input
                  type="text"
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-semibold uppercase tracking-wider placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.code
                      ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                  }`}
                  placeholder="e.g. ML001"
                  value={form.code}
                  onChange={(e) =>
                    set("code", e.target.value.toUpperCase().replace(/\s/g, ""))
                  }
                />
              </div>
              {errors.code && (
                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.code}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: TAX COMPLIANCE & GST */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <Percent size={14} className="text-indigo-600" />
            <span>Taxation &amp; GST Details</span>
            <div className="flex-1 h-px bg-slate-100 ml-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* GST Type */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                GST Registration Type
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all cursor-pointer"
                value={form.gst_type}
                onChange={(e) => set("gst_type", e.target.value)}
              >
                <option value="with_gst">With GST (Regular GST Registered)</option>
                <option value="without_gst">Without GST (Composition / Exempt)</option>
              </select>
            </div>

            {/* GSTIN */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold text-slate-700">
                  GSTIN (15 Digits)
                </label>
                <span className="text-[10.5px] text-slate-400">Optional</span>
              </div>
              <input
                type="text"
                maxLength={15}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-semibold uppercase tracking-wider placeholder:text-slate-400 focus:outline-none transition-all ${
                  errors.gstin
                    ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                }`}
                placeholder="33ABCDE1234F1Z5"
                value={form.gstin}
                onChange={(e) =>
                  set("gstin", e.target.value.toUpperCase().slice(0, 15))
                }
              />
              {errors.gstin && (
                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.gstin}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 3: CONTACT & LOCATION */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <MapPin size={14} className="text-indigo-600" />
            <span>Contact &amp; Physical Address</span>
            <div className="flex-1 h-px bg-slate-100 ml-2" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                Contact Phone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone size={14} />
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                    errors.phone
                      ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                      : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                  }`}
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) =>
                    set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.phone}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                Business Address <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                className={`w-full p-3 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all resize-y ${
                  errors.address
                    ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                    : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                }`}
                placeholder="Full street address, city, state and pincode"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
              {errors.address && (
                <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: LOGO & BRANDING */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <ImageIcon size={14} className="text-indigo-600" />
            <span>Company Logo (Optional)</span>
            <div className="flex-1 h-px bg-slate-100 ml-2" />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleLogoChange(e.target.files[0])}
          />

          {!logoPreview ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30 rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 shadow-2xs">
                <Upload size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">
                  Click to upload company logo
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PNG, JPG or WEBP (Max 2MB, square recommended)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden bg-white p-1 flex items-center justify-center flex-shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {form.logo?.name || "Company Logo"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {form.logo ? `${Math.round(form.logo.size / 1024)} KB` : "Uploaded"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={removeLogo}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors cursor-pointer"
                  title="Remove logo"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Registering...
              </>
            ) : (
              <>
                <Plus size={15} strokeWidth={2.5} /> Save Company
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Toast Portal */}
      <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[380px] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 border ${
              t.type === "success"
                ? "bg-slate-900/90 border-emerald-500/40 text-white"
                : "bg-red-950/90 border-red-500/40 text-white"
            }`}
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                t.type === "success"
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}
            >
              {t.type === "success" ? "✓" : "✕"}
            </div>
            <span className="text-xs font-semibold leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* When used inside a Modal popup */}
      {onClose ? (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          className="fixed inset-0 z-[10000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          {content}
        </div>
      ) : (
        /* When accessed as standalone page at /company/add */
        <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
          {content}
        </div>
      )}
    </>
  );
}