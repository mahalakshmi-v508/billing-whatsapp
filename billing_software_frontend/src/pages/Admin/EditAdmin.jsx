import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronLeft,
  Loader2,
  Check,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function EditAdmin() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

  const loadAdmin = async () => {
    try {
      setPageLoading(true);
      const res = await api.get(`/admin/get_admin_by_id?id=${id}`);
      if (res.data.status) {
        setForm({
          name: res.data.data.name || "",
          email: res.data.data.email || "",
          phone: res.data.data.phone || "",
          password: "",
        });
      } else {
        showToast(res.data.message || "Admin not found", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load admin data", false);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadAdmin();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter administrator's full name");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter a valid email address");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      setError("Please enter a valid email format");
      return;
    }

    if (form.phone && form.phone.trim().length > 0 && !/^\d{10}$/.test(form.phone.trim().replace(/\D/g, ""))) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/admin/update_admin", {
        id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password ? form.password : undefined,
      });

      if (res.data.status) {
        showToast("Administrator updated successfully!");
        setTimeout(() => {
          navigate("/admin");
        }, 1200);
      } else {
        setError(res.data.message || "Failed to update administrator");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Server error occurred. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 font-sans text-slate-800">
      {/* ── TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
              toast.ok
                ? "bg-emerald-500 shadow-emerald-500/20"
                : "bg-rose-500 shadow-rose-500/20"
            }`}
          >
            {toast.ok ? <Check size={16} /> : <X size={16} />}
          </div>
          <span className="text-sm font-semibold text-slate-800">
            {toast.msg}
          </span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="max-w-xl mx-auto mb-6">
        <button
          type="button"
          onClick={() => navigate("/admin")}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-3 transition-colors"
        >
          <ChevronLeft size={16} /> Back to Admins
        </button>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Edit Administrator
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Update profile details, contact phone, and credentials for this administrator.
        </p>
      </div>

      {/* ── FORM CARD ── */}
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8">
        {pageLoading ? (
          <div className="py-16 text-center text-slate-400 font-medium text-xs">
            <RefreshCw size={24} className="mx-auto animate-spin mb-2 text-indigo-500" />
            Loading administrator details...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold animate-in fade-in">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) => setValue("name", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@company.com"
                  value={form.email}
                  onChange={(e) => setValue("email", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Mobile Number
              </label>
              <div className="relative">
                <Phone
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="tel"
                  maxLength={12}
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={(e) => setValue("phone", e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Used for WhatsApp alerts and security notifications.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                New Password (Optional)
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="Leave blank to keep current password"
                  value={form.password}
                  onChange={(e) => setValue("password", e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all transform active:scale-95"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}