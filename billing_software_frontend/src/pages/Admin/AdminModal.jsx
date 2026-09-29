import { useState, useEffect } from "react";
import api from "../../services/api";
import {
  X,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function AdminModal({
  isOpen,
  mode = "add", // 'add' | 'edit'
  adminData = null,
  onClose,
  onSuccess,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setShowPass(false);
      if (mode === "edit" && adminData) {
        setForm({
          name: adminData.name || "",
          email: adminData.email || "",
          phone: adminData.phone || "",
          password: "",
        });
      } else {
        setForm({
          name: "",
          email: "",
          phone: "",
          password: "",
        });
      }
    }
  }, [isOpen, mode, adminData]);

  if (!isOpen) return null;

  const setValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError("");
  };

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

    if (mode === "add") {
      if (!form.password || form.password.trim().length < 6) {
        setError("Password is required and must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");

      if (mode === "add") {
        const res = await api.post("/admin/create_admin", {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          role: "admin",
          company_id: user.company_id || null,
          requested_by: user.id || null,
        });

        if (res.data.status) {
          onSuccess("Administrator created successfully!");
          onClose();
        } else {
          setError(res.data.message || "Failed to create administrator");
        }
      } else {
        // Edit mode
        const res = await api.post("/admin/update_admin", {
          id: adminData?.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password ? form.password : undefined,
        });

        if (res.data.status) {
          onSuccess("Administrator details updated successfully!");
          onClose();
        } else {
          setError(res.data.message || "Failed to update administrator");
        }
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {mode === "add" ? "Add New Administrator" : "Edit Administrator"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === "add"
                  ? "Create a new company administrator with full access"
                  : `Update details for ${adminData?.name || "administrator"}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-in fade-in">
              <AlertCircle size={15} className="flex-shrink-0" />
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
              Used for WhatsApp reports and security notifications.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              {mode === "add" ? (
                <>
                  Password <span className="text-rose-500">*</span>
                </>
              ) : (
                "New Password (Optional)"
              )}
            </label>
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPass ? "text" : "password"}
                placeholder={
                  mode === "add"
                    ? "Minimum 6 characters"
                    : "Leave blank to keep current password"
                }
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

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
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
              {loading
                ? mode === "add"
                  ? "Creating..."
                  : "Saving..."
                : mode === "add"
                ? "Create Admin"
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
