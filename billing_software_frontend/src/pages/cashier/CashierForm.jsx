import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserPlus,
  X,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

export default function CashierForm({ isOpen = true, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [errors, setErrors] = useState({});

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/cashier");
    }
  };

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full name is required";
    if (!form.email.trim()) {
      errs.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address";
    }
    if (!form.password.trim()) {
      errs.password = "Password is required";
    } else if (form.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validate()) {
      showToast("Please correct the errors in the form", false);
      return;
    }

    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "cashier",
        admin_id: user?.id,
        requested_by: user?.id,
      });

      const msg = res.data.message || "";
      const isOk =
        res.data.status ||
        msg.toLowerCase().includes("limit") ||
        msg.toLowerCase().includes("request");

      if (res.data.status) {
        showToast(res.data.message || "Cashier account created successfully!", true);
        setForm({ name: "", email: "", password: "" });
        setShowPass(false);

        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            navigate("/cashier");
          }
        }, 1000);
      } else {
        showToast(msg || "Failed to create cashier account", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Server error. Please try again.", false);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col font-['Plus_Jakarta_Sans',sans-serif] transition-all animate-in zoom-in-95 duration-200">
      {/* ── HEADER ── */}
      <div className="px-6 sm:px-7 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-b from-slate-50/80 to-white flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <UserPlus size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Add Cashier Account
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Create counter operator credentials for billing access
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

      {/* ── FORM BODY ── */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-5">
        {/* Full Name */}
        <div>
          <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <User size={15} />
            </div>
            <input
              type="text"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                errors.name
                  ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                  : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
              }`}
              placeholder="e.g. Rahul Sharma"
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

        {/* Login Email */}
        <div>
          <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
            Login Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail size={15} />
            </div>
            <input
              type="email"
              className={`w-full pl-10 pr-3.5 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                errors.email
                  ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                  : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
              }`}
              placeholder="cashier@store.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.email}
            </p>
          )}
        </div>

        {/* Access Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11.5px] font-semibold text-slate-700">
              Login Password <span className="text-red-500">*</span>
            </label>
            <span className="text-[10.5px] text-slate-400">Min. 6 characters</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock size={15} />
            </div>
            <input
              type={showPass ? "text" : "password"}
              className={`w-full pl-10 pr-10 py-2.5 bg-white border rounded-xl text-xs font-medium placeholder:text-slate-400 focus:outline-none transition-all ${
                errors.password
                  ? "border-red-500 focus:ring-3 focus:ring-red-100 text-red-900"
                  : "border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 text-slate-900"
              }`}
              placeholder="Create strong password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
              <AlertCircle size={12} /> {errors.password}
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck size={16} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800">Counter Operator Security: </span>
            This account allows cashier counter login with restricted access strictly to POS billing and receipt printing.
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-100">
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
                <RefreshCw size={14} className="animate-spin" /> Creating Account...
              </>
            ) : (
              <>
                <UserPlus size={15} /> Create Cashier
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <>
      {/* Toast Notification */}
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
        /* When accessed as standalone page at /cashier/add */
        <div className="min-h-screen bg-[#f8faff] p-4 sm:p-6 lg:p-8 flex items-center justify-center font-['Plus_Jakarta_Sans',sans-serif]">
          {content}
        </div>
      )}
    </>
  );
}
