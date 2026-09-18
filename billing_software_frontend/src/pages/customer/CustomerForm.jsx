import { useEffect, useState } from "react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import {
  X,
  RefreshCw,
  BadgeCheck,
  UserPlus,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Plus,
  ShieldCheck,
  Lock,
  Calendar,
  Wallet,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function CustomerForm({ onSuccess, onCancel }) {
  const navigate = useNavigate();

  // ─── form state ──────────────────────────────────────────────
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gst_no: "",
    gst_type: "Unregistered/Consumer",
    billing_address: "",
    address_line1: "",
    address_line2: "",
    city: "",
    billing_country: "India",
    billing_pincode: "",
    shipping_address: "",
    enable_shipping: false,
    shipping_address_line1: "",
    shipping_address_line2: "",
    shipping_city: "",
    shipping_country: "India",
    shipping_pincode: "",
    show_detailed_shipping_address: false,
    state: "",
    email: "",
    show_detailed_address: false,
    credit_enabled: 0,
    credit_limit: "",
    credit_days: "",
    account_number: "",
    pan_number: "",
    date_of_birth: "",
    balance: "",
    pending: "",
  });

  const [loading, setLoading] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState({});

  // ─── tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("gst");

  // ─── OTP state ──────────────────────────────────────────────
  const [isCreditAuthorized, setIsCreditAuthorized] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // ─── GST verify state ──────────────────────────────────
  const [gstCaptchaImg, setGstCaptchaImg] = useState("");
  const [gstSessionId, setGstSessionId] = useState("");
  const [enteredCaptcha, setEnteredCaptcha] = useState("");
  const [showCaptchaBox, setShowCaptchaBox] = useState(false);
  const [gstVerified, setGstVerified] = useState(false);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isVerifyingGst, setIsVerifyingGst] = useState(false);

  // ─── confirm-popup state ────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    const phone = form.phone.trim();
    if (phone.length !== 10) {
      setPhoneExists(false);
      setCheckingPhone(false);
      return undefined;
    }

    let cancelled = false;
    const checkPhone = async () => {
      setCheckingPhone(true);
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        const res = await api.get("/customer/get_by_phone", {
          params: { phone, admin_id: user?.id },
        });
        if (!cancelled) setPhoneExists(Boolean(res.data?.status));
      } catch (err) {
        if (!cancelled) setPhoneExists(false);
      } finally {
        if (!cancelled) setCheckingPhone(false);
      }
    };

    checkPhone();
    return () => {
      cancelled = true;
    };
  }, [form.phone]);

  // ─── helpers ────────────────────────────────────────────────
  const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const setErrorsField = (k, v) => {
    setErrors((p) => ({ ...p, [k]: v }));
  };

  const validateField = (k, v) => {
    let msg = "";
    if (k === "email" && v.trim()) {
      if (!EMAIL_REGEX.test(v.trim())) msg = "Enter a valid email address (e.g. user@gmail.com)";
    } else if (k === "account_number" && v.trim()) {
      if (!/^[0-9]{6,18}$/.test(v.trim())) msg = "Account number must be 6–18 digits";
    } else if (k === "pan_number") {
      if (v.length > 0 && v.length < 10) msg = "PAN must be 10 characters";
      else if (v.length === 10 && !PAN_REGEX.test(v)) msg = "Invalid PAN format (e.g. ABCDE1234F)";
    } else if (k === "date_of_birth" && v) {
      const dob = new Date(v);
      const now = new Date();
      if (isNaN(dob.getTime()) || dob > now) msg = "Date of birth cannot be in the future";
    }
    setErrorsField(k, msg);
    return msg;
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setIsDirty(true);
    validateField(k, v);
  };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const getMissingRequiredFields = () => {
    const requiredFields = [
      ["Customer Name", form.name],
      ["Phone Number", form.phone],
    ];

    if (form.show_detailed_address) {
      requiredFields.push(
        ["Billing Address Line 1", form.address_line1],
        ["Billing Address Line 2", form.address_line2],
        ["Billing City", form.city],
        ["Billing Pincode", form.billing_pincode]
      );
    }

    if (form.enable_shipping) {
      requiredFields.push(["Shipping Address", form.shipping_address]);

      if (form.show_detailed_shipping_address) {
        requiredFields.push(
          ["Shipping Address Line 1", form.shipping_address_line1],
          ["Shipping Address Line 2", form.shipping_address_line2],
          ["Shipping City", form.shipping_city],
          ["Shipping Pincode", form.shipping_pincode]
        );
      }
    }

    if (form.credit_enabled === 1) {
      requiredFields.push(
        ["Credit Limit", form.credit_limit],
        ["Credit Days", form.credit_days],
        ["Balance", form.balance],
        ["Pending", form.pending]
      );
    }

    return requiredFields.filter(([, value]) => !String(value ?? "").trim());
  };

  const hasMissingRequiredFields = getMissingRequiredFields().length > 0;

  // ─── whole-form cancel: confirm only if the form is dirty ──
  const handleCancelClick = () => {
    if (isDirty) {
      setConfirmAction("close");
    } else if (onCancel) {
      onCancel();
    } else {
      navigate("/customer");
    }
  };

  const handleConfirm = () => {
    if (confirmAction === "close") {
      setConfirmAction(null);
      if (onCancel) onCancel();
      else navigate("/customer");
    }
  };

  const keepEditing = () => {
    setConfirmAction(null);
  };

  // ─── OTP handlers ──────────────────────────────
  const handleSendCreditOtp = async () => {
    setIsSendingOtp(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/auth/send_otp_for_credit", {
        user_id: user?.id,
        role: user?.role,
      });
      if (res.data.status === "success") {
        setAdminEmail(res.data.email);
        setOtpSent(true);
        showToast(res.data.message || "OTP sent successfully to admin email!");
      } else {
        showToast(res.data.message || "Failed to send OTP", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error sending OTP", false);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyCreditOtp = async () => {
    if (!enteredOtp.trim()) {
      showToast("Please enter the OTP code", false);
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.post("/auth/verify_otp", {
        email: adminEmail,
        otp: enteredOtp.trim(),
      });
      if (res.data.status === "success") {
        setIsCreditAuthorized(true);
        showToast("Credit limit authorized successfully!");
      } else {
        showToast(res.data.message || "Invalid OTP code", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error verifying OTP", false);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // ─── GST verify handlers ──────────────────────────────
  const resetGstVerify = () => {
    setGstVerified(false);
    setShowCaptchaBox(false);
    setGstCaptchaImg("");
    setGstSessionId("");
    setEnteredCaptcha("");
  };

  const fetchCaptcha = async () => {
    if (!form.gst_no.trim()) {
      showToast("Enter GSTIN first", false);
      return;
    }
    setIsLoadingCaptcha(true);
    try {
      const res = await api.get("/customer/getCaptcha");
      if (res.data.status === false || !res.data.image) {
        showToast(res.data.message || "Failed to load captcha", false);
        return;
      }
      setGstCaptchaImg(res.data.image);
      setGstSessionId(res.data.sessionId);
      setEnteredCaptcha("");
      setShowCaptchaBox(true);
      setGstVerified(false);
    } catch (err) {
      console.error(err);
      showToast("Error loading captcha", false);
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const handleVerifyGst = async () => {
    if (gstVerified) return;

    if (!gstSessionId) {
      showToast("Please refresh the captcha", false);
      return;
    }

    if (!enteredCaptcha.trim()) {
      showToast("Enter the captcha code", false);
      return;
    }

    setIsVerifyingGst(true);

    try {
      const res = await api.post("/customer/getGSTDetails", {
        sessionId: gstSessionId,
        GSTIN: form.gst_no.trim().toUpperCase(),
        captcha: enteredCaptcha.trim(),
      });

      const payload = res.data;
      const gstDetails = payload?.data?.tp || payload?.tp || payload;

      if (gstDetails && gstDetails.gstin && gstDetails.lgnm) {
        const address = gstDetails?.pradr?.adr || "";
        const businessName = gstDetails.tradeNam || gstDetails.lgnm || "";
        const gstType =
          String(gstDetails.dty || "").toLowerCase() === "composition"
            ? "Registered Business - Composition"
            : "Registered Business - Regular";

        let state = "";
        const stj = String(gstDetails.stj || "");
        if (stj.toLowerCase().includes("tamil nadu")) {
          state = "Tamil Nadu";
        }

        setForm((p) => ({
          ...p,
          name: businessName || p.name,
          gst_no: gstDetails.gstin || p.gst_no,
          gst_type: gstType,
          state: state || p.state,
          billing_country: "India",
          billing_address: address || p.billing_address,
        }));

        setGstVerified(true);
        setShowCaptchaBox(false);
        setGstCaptchaImg("");
        setGstSessionId("");
        setEnteredCaptcha("");
        setIsDirty(true);

        showToast("GST verified! Business details populated.");
      } else {
        const message =
          payload?.error?.message ||
          payload?.message ||
          "Verification failed. Please check the GSTIN and captcha.";

        showToast(
          String(message)
            .replace(/<[^>]+>/g, "")
            .slice(0, 120),
          false
        );
        fetchCaptcha();
      }
    } catch (err) {
      console.error("GST Verification Error:", err);
      const serverMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Server error while verifying GST";

      showToast(
        String(serverMessage)
          .replace(/<[^>]+>/g, "")
          .slice(0, 120),
        false
      );
    } finally {
      setIsVerifyingGst(false);
    }
  };

  // ─── submit ──────────────────────────────────────────────────
  const handleSubmit = async (andNew = false) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const admin_id = user?.id;

    const missingFields = getMissingRequiredFields();
    if (missingFields.length > 0) {
      showToast(`Please fill ${missingFields[0][0]}`, false);
      return;
    }

    if (!form.name.trim()) {
      showToast("Customer Name is required", false);
      return;
    }
    if (!/^[0-9]{10}$/.test(form.phone)) {
      showToast("Enter a valid 10-digit mobile number", false);
      return;
    }

    const isB2B = form.gst_type.startsWith("Registered");
    if (isB2B) {
      if (!form.gst_no.trim()) {
        showToast("GSTIN is required for registered customers", false);
        return;
      }
      if (!GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GSTIN format (e.g. 22ABCDE1234F1Z5)", false);
        return;
      }
    } else {
      if (form.gst_no.trim() && !GST_REGEX.test(form.gst_no)) {
        showToast("Invalid GSTIN format", false);
        return;
      }
    }

    const fieldChecks = [
      ["email", form.email],
      ["account_number", form.account_number],
      ["pan_number", form.pan_number],
      ["date_of_birth", form.date_of_birth],
    ];
    const validationMessages = {};
    for (const [k, v] of fieldChecks) {
      const msg = validateField(k, v);
      if (msg) validationMessages[k] = msg;
    }
    if (Object.keys(validationMessages).length > 0) {
      showToast(Object.values(validationMessages)[0], false);
      return;
    }

    if (form.credit_enabled === 1 && !isCreditAuthorized) {
      showToast("Please verify admin OTP to authorize credit limit", false);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        admin_id,
        name: form.name.trim(),
        phone: form.phone,
        email: form.email,
        state: form.state,
        address: form.billing_address,
        address_line1: form.address_line1,
        address_line2: form.address_line2,
        city: form.city,
        billing_country: form.billing_country,
        billing_pincode: form.billing_pincode,
        shipping_address: form.shipping_address,
        shipping_address_line1: form.shipping_address_line1,
        shipping_address_line2: form.shipping_address_line2,
        shipping_city: form.shipping_city,
        shipping_country: form.shipping_country,
        shipping_pincode: form.shipping_pincode,
        gst_no: form.gst_no,
        type: form.gst_type,
        credit_enabled: form.credit_enabled,
        credit_limit: form.credit_enabled ? form.credit_limit : 0,
        credit_days: form.credit_enabled ? form.credit_days : 0,
        account_number: form.account_number,
        pan_number: form.pan_number,
        date_of_birth: form.date_of_birth,
        advance_balance: form.balance || 0,
        pending_amount: form.pending || 0,
      };

      const res = await api.post("/customer/create_customer", payload);
      if (res.data.status) {
        showToast("Customer created successfully!");
        if (andNew) {
          setForm({
            name: "",
            phone: "",
            gst_no: "",
            gst_type: "Unregistered/Consumer",
            billing_address: "",
            address_line1: "",
            address_line2: "",
            city: "",
            billing_country: "India",
            billing_pincode: "",
            shipping_address: "",
            enable_shipping: false,
            shipping_address_line1: "",
            shipping_address_line2: "",
            shipping_city: "",
            shipping_country: "India",
            shipping_pincode: "",
            show_detailed_shipping_address: false,
            state: "",
            email: "",
            show_detailed_address: false,
            credit_enabled: 0,
            credit_limit: "",
            credit_days: "",
            account_number: "",
            pan_number: "",
            date_of_birth: "",
            balance: "",
            pending: "",
          });
          setIsCreditAuthorized(false);
          setOtpSent(false);
          setEnteredOtp("");
          resetGstVerify();
          setErrors({});
          setActiveTab("gst");
          setIsDirty(false);
        } else if (onSuccess) {
          onSuccess();
        } else {
          setTimeout(() => navigate("/customer"), 1000);
        }
      } else {
        showToast(res.data.message || "Failed to create customer", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error occurred while saving", false);
    }
    setLoading(false);
  };

  const TABS = [
    { key: "gst", label: "GST & Addresses", icon: MapPin },
    { key: "credit", label: "Credit & Limits", icon: CreditCard, badge: form.credit_enabled ? "Enabled" : null },
    { key: "additional", label: "Additional Info", icon: FileText },
  ];

  return (
    <>
      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[99999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-white text-xs font-semibold backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 ${
            toast.ok
              ? "bg-slate-900/90 border border-emerald-500/40 shadow-emerald-950/20"
              : "bg-red-950/90 border border-red-500/40 shadow-red-950/20"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
              toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
            }`}
          >
            {toast.ok ? "✓" : "✕"}
          </div>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── GST CAPTCHA MODAL ─── */}
      {showCaptchaBox && gstCaptchaImg && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCaptchaBox(false)}
          className="fixed inset-0 z-[100001] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Verify GSTIN</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter characters from image below</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCaptchaBox(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={gstCaptchaImg}
                alt="GST Captcha"
                className="h-10 rounded-lg border border-slate-200 object-contain bg-white px-2"
              />
              <button
                type="button"
                onClick={fetchCaptcha}
                disabled={isLoadingCaptcha}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-white hover:text-indigo-600 transition-all border border-transparent hover:border-slate-200 disabled:opacity-50"
                title="Refresh Captcha"
              >
                <RefreshCw size={16} className={isLoadingCaptcha ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 tracking-wider uppercase focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 placeholder:text-slate-400"
                placeholder="CAPTCHA"
                value={enteredCaptcha}
                onChange={(e) => setEnteredCaptcha(e.target.value.toUpperCase())}
                autoFocus
              />
              <button
                type="button"
                onClick={handleVerifyGst}
                disabled={isVerifyingGst || !enteredCaptcha.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-indigo-200 disabled:opacity-50 flex items-center justify-center min-w-[75px]"
              >
                {isVerifyingGst ? <RefreshCw size={14} className="animate-spin" /> : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── UNSAVED CONFIRMATION MODAL ─── */}
      {confirmAction && (
        <div
          className="fixed inset-0 z-[100002] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={keepEditing}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-slate-200"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Discard Changes?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              You have unsaved form entries. If you leave now, all customer details entered will be lost.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={keepEditing}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-all"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN MODAL CONTAINER ─── */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] mx-auto max-h-[90vh] transition-all">
        {/* ── HEADER ── */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/70 to-white flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">Add Customer</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Register new customer profile, GST details, billing & credit terms
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelClick}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* ── SCROLLABLE FORM BODY ── */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-1 space-y-6">
          {/* Top Quick Profile Section: Name, GSTIN & Phone */}
          <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/70">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 transition-all"
                    placeholder="Enter full name or trade title"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* GSTIN (15 Digits) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-semibold text-slate-700">
                    GSTIN (15 Digits)
                  </label>
                  {gstVerified && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <BadgeCheck size={12} /> Verified
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Building2 size={15} />
                    </div>
                    <input
                      type="text"
                      className={`w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-semibold uppercase tracking-wider transition-all placeholder:text-slate-400 focus:outline-none ${
                        gstVerified
                          ? "bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                          : "bg-white text-slate-900 border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                      }`}
                      placeholder="22ABCDE1234F1Z5"
                      value={form.gst_no}
                      maxLength={15}
                      onChange={(e) => {
                        if (gstVerified) return;
                        set("gst_no", e.target.value.toUpperCase().slice(0, 15));
                      }}
                      disabled={gstVerified}
                      readOnly={gstVerified}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={fetchCaptcha}
                    disabled={isLoadingCaptcha || !form.gst_no.trim() || gstVerified}
                    className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs ${
                      gstVerified
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default"
                        : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50/60 disabled:opacity-50"
                    }`}
                  >
                    {isLoadingCaptcha ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : gstVerified ? (
                      <BadgeCheck size={14} />
                    ) : (
                      "Verify"
                    )}
                  </button>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11.5px] font-semibold text-slate-700">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  {checkingPhone && (
                    <span className="text-[10.5px] text-slate-400">Checking...</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={15} />
                  </div>
                  <input
                    type="tel"
                    className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                      phoneExists
                        ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
                    }`}
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    maxLength={10}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>
                {phoneExists && (
                  <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> This phone number is already registered
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── SEGMENTED TAB STRIP ── */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 w-full sm:w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm shadow-slate-200 border border-slate-200/60"
                      : "text-slate-500 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon size={14} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-700">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: GST & ADDRESSES ── */}
          {activeTab === "gst" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Profile Tax & Contact Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                    GST Classification
                  </label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    value={form.gst_type}
                    onChange={(e) => set("gst_type", e.target.value)}
                  >
                    <option value="Unregistered/Consumer">Unregistered / Consumer</option>
                    <option value="Registered Business - Regular">Registered Business - Regular</option>
                    <option value="Registered Business - Composition">Registered Business - Composition</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                    State / Jurisdiction
                  </label>
                  <input
                    type="text"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    placeholder="e.g. Tamil Nadu"
                    value={form.state}
                    onChange={(e) => set("state", e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-700">Email Address</label>
                    {errors.email && (
                      <span className="text-[10.5px] text-red-500">{errors.email}</span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail size={15} />
                    </div>
                    <input
                      type="email"
                      className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                        errors.email
                          ? "border-red-500 focus:ring-3 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                      }`}
                      placeholder="customer@domain.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Addresses Split (Billing & Shipping) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Billing Address Card */}
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Billing Address</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => set("show_detailed_address", !form.show_detailed_address)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      {form.show_detailed_address ? <EyeOff size={13} /> : <Eye size={13} />}
                      {form.show_detailed_address ? "Simple View" : "Detailed Fields"}
                    </button>
                  </div>

                  <textarea
                    rows={form.show_detailed_address ? 2 : 4}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 resize-y"
                    placeholder="Enter full billing street address..."
                    value={form.billing_address}
                    onChange={(e) => set("billing_address", e.target.value)}
                  />

                  {/* Detailed Billing Fields */}
                  {form.show_detailed_address && (
                    <div className="pt-2 grid grid-cols-2 gap-2.5 animate-in fade-in duration-150">
                      <div className="col-span-2">
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                          placeholder="Address Line 1"
                          value={form.address_line1}
                          onChange={(e) => set("address_line1", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                          placeholder="Address Line 2"
                          value={form.address_line2}
                          onChange={(e) => set("address_line2", e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                          placeholder="City"
                          value={form.city}
                          onChange={(e) => set("city", e.target.value)}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          maxLength={6}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                          placeholder="Pincode (6-digit)"
                          value={form.billing_pincode}
                          onChange={(e) => set("billing_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Shipping Address Card */}
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Shipping Address</span>
                    </div>

                    {!form.enable_shipping ? (
                      <button
                        type="button"
                        onClick={() => set("enable_shipping", true)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      >
                        <Plus size={13} /> Enable Shipping
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            set("show_detailed_shipping_address", !form.show_detailed_shipping_address)
                          }
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          {form.show_detailed_shipping_address ? <EyeOff size={13} /> : <Eye size={13} />}
                          {form.show_detailed_shipping_address ? "Simple" : "Detailed"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            set("enable_shipping", false);
                            set("shipping_address", "");
                          }}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700"
                        >
                          Disable
                        </button>
                      </div>
                    )}
                  </div>

                  {!form.enable_shipping ? (
                    <div className="h-28 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center bg-white/50">
                      <p className="text-xs text-slate-400 font-medium">
                        Shipping address disabled (Billing address will be used by default)
                      </p>
                      <button
                        type="button"
                        onClick={() => set("enable_shipping", true)}
                        className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Click here to specify separate shipping destination
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5 animate-in fade-in duration-150">
                      <textarea
                        rows={form.show_detailed_shipping_address ? 2 : 4}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 resize-y"
                        placeholder="Enter full shipping delivery address..."
                        value={form.shipping_address}
                        onChange={(e) => set("shipping_address", e.target.value)}
                      />

                      {/* Detailed Shipping Fields */}
                      {form.show_detailed_shipping_address && (
                        <div className="pt-2 grid grid-cols-2 gap-2.5 animate-in fade-in duration-150">
                          <div className="col-span-2">
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                              placeholder="Shipping Line 1"
                              value={form.shipping_address_line1}
                              onChange={(e) => set("shipping_address_line1", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                              placeholder="Shipping Line 2"
                              value={form.shipping_address_line2}
                              onChange={(e) => set("shipping_address_line2", e.target.value)}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                              placeholder="Shipping City"
                              value={form.shipping_city}
                              onChange={(e) => set("shipping_city", e.target.value)}
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              maxLength={6}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                              placeholder="Shipping Pincode"
                              value={form.shipping_pincode}
                              onChange={(e) => set("shipping_pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: CREDIT & LIMITS ── */}
          {activeTab === "credit" && (
            <div className="space-y-6 max-w-2xl animate-in fade-in duration-150">
              {/* Credit Enabled Switcher Card */}
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-indigo-600" /> Credit Facilities & Ledger Limits
                    </h4>
                    <p className="text-[11.5px] text-slate-500 mt-0.5">
                      Authorize revolving credit terms, payment days and opening ledger balances
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
                    <button
                      type="button"
                      onClick={() => {
                        set("credit_enabled", 0);
                        setIsCreditAuthorized(false);
                        setOtpSent(false);
                        setEnteredOtp("");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.credit_enabled === 0
                          ? "bg-slate-800 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Disabled
                    </button>
                    <button
                      type="button"
                      onClick={() => set("credit_enabled", 1)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        form.credit_enabled === 1
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Enabled
                    </button>
                  </div>
                </div>

                {/* Sub-section when credit enabled */}
                {form.credit_enabled === 1 && (
                  <div className="mt-5 pt-5 border-t border-slate-200">
                    {!isCreditAuthorized ? (
                      /* Admin OTP Authorization Box */
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5">
                        <div className="flex items-start gap-3.5 mb-4">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                            <Lock size={18} />
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-amber-900">Admin Authorization Required</h5>
                            <p className="text-[11.5px] text-amber-700 mt-0.5">
                              To prevent unapproved exposure, credit allocation requires a 2-factor OTP sent to admin email.
                            </p>
                          </div>
                        </div>

                        {!otpSent ? (
                          <button
                            type="button"
                            onClick={handleSendCreditOtp}
                            disabled={isSendingOtp}
                            className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isSendingOtp ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <ShieldCheck size={16} />
                            )}
                            {isSendingOtp ? "Dispatching OTP..." : "Send Verification OTP to Admin Email"}
                          </button>
                        ) : (
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-amber-200">
                            <p className="text-xs text-slate-600">
                              Verification code sent to: <strong className="text-slate-900">{adminEmail}</strong>
                            </p>
                            <div className="flex items-center gap-2.5 max-w-sm">
                              <input
                                type="text"
                                maxLength={6}
                                placeholder="Enter 6-digit OTP"
                                value={enteredOtp}
                                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tracking-widest text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                              />
                              <button
                                type="button"
                                onClick={handleVerifyCreditOtp}
                                disabled={isVerifyingOtp || !enteredOtp.trim()}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                              >
                                {isVerifyingOtp ? "Verifying..." : "Verify & Unlock"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSendCreditOtp}
                              disabled={isSendingOtp}
                              className="text-[11px] font-semibold text-indigo-600 hover:underline inline-block"
                            >
                              Didn't get code? Resend OTP
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Authorized Form Fields */
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-max text-xs font-bold">
                          <CheckCircle2 size={15} /> Credit Facility Authorized
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                              Credit Limit (₹) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                                ₹
                              </div>
                              <input
                                type="number"
                                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                                placeholder="0.00"
                                value={form.credit_limit}
                                onChange={(e) => set("credit_limit", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                              Credit Days <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Clock size={15} />
                              </div>
                              <input
                                type="number"
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                                placeholder="e.g. 30"
                                value={form.credit_days}
                                onChange={(e) => set("credit_days", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                              Opening Advance Balance (₹) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Wallet size={15} />
                              </div>
                              <input
                                type="number"
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                                placeholder="0.00"
                                value={form.balance}
                                onChange={(e) => set("balance", e.target.value)}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                              Pending Due Amount (₹) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                                ₹
                              </div>
                              <input
                                type="number"
                                className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                                placeholder="0.00"
                                value={form.pending}
                                onChange={(e) => set("pending", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: ADDITIONAL FIELDS ── */}
          {activeTab === "additional" && (
            <div className="space-y-4 max-w-xl animate-in fade-in duration-150">
              <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-700">Bank Account Number</label>
                    {errors.account_number && (
                      <span className="text-[10.5px] text-red-500 font-medium">{errors.account_number}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                      errors.account_number
                        ? "border-red-500 focus:ring-3 focus:ring-red-100"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    }`}
                    placeholder="e.g. 91823019283"
                    value={form.account_number}
                    onChange={(e) => set("account_number", e.target.value.replace(/[^0-9]/g, "").slice(0, 18))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-700">PAN Number</label>
                    {errors.pan_number && (
                      <span className="text-[10.5px] text-red-500 font-medium">{errors.pan_number}</span>
                    )}
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-semibold uppercase tracking-wider placeholder:text-slate-400 focus:outline-none transition-all ${
                      errors.pan_number
                        ? "border-red-500 focus:ring-3 focus:ring-red-100"
                        : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                    }`}
                    placeholder="ABCDE1234F"
                    value={form.pan_number}
                    onChange={(e) => set("pan_number", e.target.value.toUpperCase().slice(0, 10))}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11.5px] font-semibold text-slate-700">Date of Birth</label>
                    {errors.date_of_birth && (
                      <span className="text-[10.5px] text-red-500 font-medium">{errors.date_of_birth}</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium text-slate-800 focus:outline-none transition-all ${
                        errors.date_of_birth
                          ? "border-red-500 focus:ring-3 focus:ring-red-100"
                          : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100"
                      }`}
                      value={form.date_of_birth}
                      onChange={(e) => set("date_of_birth", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER ACTIONS BAR ── */}
        <div className="px-6 sm:px-8 py-4 bg-slate-50/90 border-t border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={handleCancelClick}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading || checkingPhone || phoneExists || hasMissingRequiredFields}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & New
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading || checkingPhone || phoneExists || hasMissingRequiredFields}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Saving Customer...
                </>
              ) : (
                <>
                  Save Customer <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}