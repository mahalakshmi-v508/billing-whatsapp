import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";

export default function ChangePassword() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.old_password.trim()) {
      setError("Please enter your current password");
      return;
    }

    if (!form.new_password.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (form.new_password.length < 6) {
      setError("New password must be at least 6 characters long");
      return;
    }

    if (form.new_password === form.old_password) {
      setError("New password must be different from your current password");
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError("New password and confirmation password do not match");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.post("/admin/change_password", {
        admin_id: user?.id,
        old_password: form.old_password,
        new_password: form.new_password,
      });

      if (res.data.status) {
        setSuccess(true);
        showToast("Password updated successfully! 🎉", true);
        setForm({
          old_password: "",
          new_password: "",
          confirm_password: "",
        });
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        setError(res.data.message || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Server error while changing password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Live password requirements
  const hasMinLength = form.new_password.length >= 6;
  const passwordsMatch =
    form.confirm_password.length > 0 &&
    form.new_password === form.confirm_password;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 flex flex-col justify-center items-center font-sans text-slate-800">
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

      {/* ── MAIN CARD CONTAINER ── */}
      <div className="w-full max-w-md">
        {/* Back Link */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-4 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Card Header Banner */}
          <div className="p-6 sm:p-8 bg-gradient-to-br from-indigo-50/90 via-blue-50/60 to-white border-b border-slate-100 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 mb-4">
              <KeyRound size={26} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Change Password
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs">
              Ensure your account stays secure by choosing a strong, unique password.
            </p>
          </div>

          {/* Card Form Body */}
          <div className="p-6 sm:p-8">
            {success ? (
              <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Password Updated!
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your password has been changed successfully. Redirecting to dashboard...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold animate-in fade-in">
                    <AlertCircle size={16} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showOld ? "text" : "password"}
                      name="old_password"
                      required
                      placeholder="Enter your current password"
                      value={form.old_password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(!showOld)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showOld ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showNew ? "text" : "password"}
                      name="new_password"
                      required
                      placeholder="Minimum 6 characters"
                      value={form.new_password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password requirement indicator */}
                  {form.new_password && (
                    <div className="flex items-center gap-1.5 text-[11px] mt-1.5 font-medium">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hasMinLength ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={
                          hasMinLength ? "text-emerald-600 font-bold" : "text-slate-400"
                        }
                      >
                        At least 6 characters
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirm_password"
                      required
                      placeholder="Re-enter your new password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Password matching indicator */}
                  {form.confirm_password && (
                    <div className="flex items-center gap-1.5 text-[11px] mt-1.5 font-medium">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          passwordsMatch ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span
                        className={
                          passwordsMatch
                            ? "text-emerald-600 font-bold"
                            : "text-rose-500 font-semibold"
                        }
                      >
                        {passwordsMatch
                          ? "Passwords match ✓"
                          : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    {loading && <Loader2 size={15} className="animate-spin" />}
                    {loading ? "Updating Password..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}