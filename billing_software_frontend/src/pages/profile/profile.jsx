import React, { useEffect, useState } from "react";
import api from "../../services/api";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  KeyRound,
  Calendar,
  Building2,
  Check,
  Copy,
  Pencil,
  Save,
  X,
  Sparkles,
  ExternalLink,
  Lock,
  RefreshCw,
  BadgeCheck,
  ArrowRight,
  UserCheck,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();

  const [userProfile, setUserProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getInitials = (name) => {
    if (!name) return "US";
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser?.id || storedUser?.admin_id || 0;

      if (!userId) {
        showToast("User session not found. Please log in.", "error");
        setLoading(false);
        return;
      }

      const res = await api.post("/auth/get_profile", { id: userId });
      if (res.data?.status && res.data.data) {
        const u = res.data.data;
        setUserProfile(u);
        setFormData({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          password: "",
        });
      } else {
        // Fallback to local storage user
        setUserProfile(storedUser);
        setFormData({
          name: storedUser.name || "",
          email: storedUser.email || "",
          phone: storedUser.phone || "",
          password: "",
        });
      }
    } catch {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      setUserProfile(storedUser);
      setFormData({
        name: storedUser.name || "",
        email: storedUser.email || "",
        phone: storedUser.phone || "",
        password: "",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("Full name is required", "error");
      return;
    }
    if (!formData.email.trim()) {
      showToast("Email address is required", "error");
      return;
    }

    setSaving(true);
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = userProfile?.id || storedUser?.id || 0;

      const payload = {
        id: userId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
      };

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      const res = await api.post("/auth/update_profile", payload);
      if (res.data?.status) {
        showToast("Profile updated successfully!", "success");
        setEditMode(false);

        // Update local storage user object
        const updatedLocalUser = {
          ...storedUser,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        };
        localStorage.setItem("user", JSON.stringify(updatedLocalUser));
        window.dispatchEvent(new Event("storage"));

        // Refresh profile state
        fetchUserProfile();
      } else {
        showToast(res.data?.message || "Failed to update profile", "error");
      }
    } catch {
      showToast("Server error while saving profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        password: "",
      });
    }
    setEditMode(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getRoleBadgeStyle = (role) => {
    switch (role?.toLowerCase()) {
      case "superadmin":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "admin":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      case "cashier":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-top-4 duration-300 backdrop-blur-md ${
            toast.type === "success"
              ? "bg-emerald-500/95 text-white border-emerald-400/30 shadow-emerald-500/20"
              : "bg-rose-500/95 text-white border-rose-400/30 shadow-rose-500/20"
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {toast.type === "success" ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
          </div>
          <span>{toast.msg}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── TOP ACTION HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <User size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight font-display">
                  My Profile
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100 uppercase tracking-wide">
                  Account Overview
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage your personal credentials, contact numbers &amp; authentication settings
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <X size={14} />
                  <span>Cancel</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <Pencil size={14} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>

        {/* ── LOADING STATE ── */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-4 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
              <User size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Loading User Profile...</h3>
              <p className="text-xs text-slate-400 mt-1">Retrieving account identity and permissions</p>
            </div>
          </div>
        ) : !userProfile ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-4 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">User Profile Not Available</h3>
              <p className="text-xs text-slate-400 mt-1">Unable to locate account information.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── USER HERO BANNER CARD ── */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              {/* Background Glow */}
              <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                {/* Avatar & User Details */}
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 border-2 border-white/20 flex items-center justify-center text-white shadow-2xl backdrop-blur-md flex-shrink-0">
                    <span className="text-2xl sm:text-3xl font-black tracking-wider">
                      {getInitials(formData.name)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-black px-2.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                        USER #{userProfile.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getRoleBadgeStyle(
                          userProfile.role
                        )}`}
                      >
                        <ShieldCheck size={11} />
                        {userProfile.role || "User"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {userProfile.status || "Active"}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-display">
                      {formData.name || "System User"}
                    </h2>

                    <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Mail size={13} className="text-indigo-400" />
                        <span>{formData.email}</span>
                      </span>
                      {formData.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone size={13} className="text-indigo-400" />
                          <span>{formData.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Summary Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 w-full md:w-auto">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">System Role</span>
                    <span className="text-xs font-extrabold text-indigo-300 capitalize mt-0.5 block">
                      {userProfile.role || "Administrator"}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 backdrop-blur-xs min-w-[140px]">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Member Since</span>
                    <span className="text-xs font-semibold text-slate-200 mt-0.5 block">
                      {formatDate(userProfile.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2-COLUMN DETAIL GRID ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CARD 1: PERSONAL & CONTACT INFORMATION */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <User size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Personal Information</h3>
                      <p className="text-[11px] text-slate-400">Your profile credentials &amp; contact lines</p>
                    </div>
                  </div>
                  {editMode && (
                    <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Edit Mode
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    {editMode ? (
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          placeholder="Your full name"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <User size={13} className="text-slate-400" />
                          {formData.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.name, "name")}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                          title="Copy Name"
                        >
                          {copiedKey === "name" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    {editMode ? (
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="name@company.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <Mail size={13} className="text-slate-400" />
                          {formData.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formData.email, "email")}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                          title="Copy Email"
                        >
                          {copiedKey === "email" ? (
                            <Check size={13} className="text-emerald-600" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mobile / Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Mobile / Contact Number</label>
                    {editMode ? (
                      <div className="relative">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs font-bold text-slate-900">
                        <span className="flex items-center gap-2">
                          <Phone size={13} className="text-slate-400" />
                          {formData.phone || <span className="text-slate-400 font-normal italic">Not configured</span>}
                        </span>
                        {formData.phone && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${formData.phone}`}
                              className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink size={10} /> Call
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(formData.phone, "phone")}
                              className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-1"
                              title="Copy Phone"
                            >
                              {copiedKey === "phone" ? (
                                <Check size={13} className="text-emerald-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Optional Password Update in Edit Mode */}
                  {editMode && (
                    <div className="pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Update Password (Leave blank to keep unchanged)
                      </label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => handleInputChange("password", e.target.value)}
                          placeholder="New password (min 6 characters)"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 2: ACCOUNT PRIVILEGES & SECURITY */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Security &amp; Workspace</h3>
                      <p className="text-[11px] text-slate-400">Permissions, affiliated organization &amp; access</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Assigned Branch / Company Profile Info */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Primary Associated Company
                      </span>
                      <Building2 size={14} className="text-indigo-600" />
                    </div>
                    <div className="text-xs font-bold text-slate-900">
                      {userProfile.company_name || "Enterprise Workspace"}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Your permissions and invoices are mapped to this organization profile.
                    </p>
                  </div>

                  {/* Account Status & Role Badges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Account Role</span>
                      <span className="text-xs font-bold text-slate-900 capitalize flex items-center gap-1.5">
                        <UserCheck size={14} className="text-indigo-600" />
                        {userProfile.role || "Administrator"}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Active Verification
                      </span>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <BadgeCheck size={14} className="text-emerald-600" />
                        Verified
                      </span>
                    </div>
                  </div>

                  {/* Password & Security Quick Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-blue-50/70 border border-indigo-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <KeyRound size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Password &amp; Authentication</h4>
                        <p className="text-[11px] text-slate-500">Keep your account secure with regular updates</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate("/change-password")}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer shadow-xs flex-shrink-0 flex items-center gap-1"
                    >
                      <span>Change Password</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── QUICK WORKSPACE LAUNCHPAD ── */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Quick Navigation Shortcuts
                  </h3>
                </div>
                <span className="text-xs text-slate-400">Frequently used portals</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-800 border border-slate-200/80 transition cursor-pointer group"
                >
                  <span>Main Dashboard</span>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/company")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-800 border border-slate-200/80 transition cursor-pointer group"
                >
                  <span>Company Management</span>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/change-password")}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-600 hover:text-white text-slate-800 border border-slate-200/80 transition cursor-pointer group"
                >
                  <span>Security &amp; Password</span>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}