import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UploadCloud,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Tag,
  ShieldAlert,
  Headset,
  Sparkles,
  Paperclip,
  Check,
  Zap,
} from "lucide-react";
import api from "../../services/api";

export default function CreateTicketModal({ isOpen, onClose, onTicketCreated }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const selectedCompanyId = localStorage.getItem("selected_company_id");

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    subject: "",
    category_id: "",
    priority: "medium",
    description: "",
  });

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const allowedExtensions = ["jpg", "jpeg", "png", "pdf", "docx", "xlsx", "zip"];
  const maxFileSizeMB = 10; // 10MB limit

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      setError("");
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/ticket/categories");
      if (res.data.status) {
        setCategories(res.data.data || []);
        if (res.data.data.length > 0) {
          setFormData((prev) => ({ ...prev, category_id: res.data.data[0].id }));
        }
      }
    } catch (err) {
      console.error("Failed to load ticket categories", err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (newFiles) => {
    let validFiles = [];
    let errMsgs = [];

    newFiles.forEach((file) => {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        errMsgs.push(`"${file.name}" is not a supported file type (.${ext}). Allowed: ${allowedExtensions.join(", ")}`);
        return;
      }
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        errMsgs.push(`"${file.name}" exceeds the maximum allowed size of ${maxFileSizeMB}MB.`);
        return;
      }
      validFiles.push(file);
    });

    if (errMsgs.length > 0) {
      setError(errMsgs.join(" | "));
    } else {
      setError("");
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim()) {
      setError("Please enter a ticket subject.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please provide a description of the issue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = new FormData();
      payload.append("subject", formData.subject.trim());
      payload.append("category_id", formData.category_id);
      payload.append("priority", formData.priority);
      payload.append("description", formData.description.trim());
      payload.append("user_id", user.id || 1);
      payload.append("user_name", user.name || "User");
      payload.append("user_role", user.role || "customer");
      if (selectedCompanyId) {
        payload.append("company_id", selectedCompanyId);
      }

      files.forEach((file) => {
        payload.append("attachments[]", file);
      });

      const res = await api.post("/tickets", payload, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.status) {
        setFormData({ subject: "", category_id: "", priority: "medium", description: "" });
        setFiles([]);
        onTicketCreated && onTicketCreated(res.data.ticket);
        onClose();
      } else {
        setError(res.data.message || "Failed to create ticket.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Server error while creating ticket.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[90vh] font-sans text-slate-800"
        >
          {/* ── HEADER ── */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                <Headset size={20} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white tracking-tight">Create New Support Ticket</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Submit your query or technical issue to our technical support team
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          {/* ── FORM BODY ── */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4.5 flex-1 paysplitx-scrollbar-light">
            {/* Error Alert Box */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* SUBJECT */}
            <div className="space-y-1.5 mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Ticket Subject <span className="text-rose-500">*</span></span>
                <span className="text-[10.5px] text-slate-400 font-normal">Brief summary of the issue</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Printer connection error on billing counter POS"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
              />
            </div>

            {/* CATEGORY & PRIORITY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Tag size={13} className="text-indigo-600" /> Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Selector Pills */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" /> Priority Level
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  {[
                    { id: "low", label: "Low", activeColor: "bg-slate-700 text-white shadow-xs" },
                    { id: "medium", label: "Medium", activeColor: "bg-amber-600 text-white shadow-xs" },
                    { id: "high", label: "High", activeColor: "bg-orange-600 text-white shadow-xs" },
                    { id: "critical", label: "Critical", activeColor: "bg-rose-600 text-white shadow-xs animate-pulse font-extrabold" },
                  ].map((p) => {
                    const active = formData.priority === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p.id })}
                        className={`py-1.5 text-[11px] font-bold capitalize rounded-lg transition cursor-pointer text-center ${active
                          ? p.activeColor
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                          }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-1.5 mt-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Detailed Description <span className="text-rose-500">*</span></span>
                <span className="text-[10.5px] text-slate-400 font-normal">Include error codes or steps</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain the problem in detail. Include steps to reproduce, what you expected vs what occurred, or error messages..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs leading-relaxed"
              />
            </div>

            {/* ATTACHMENTS DRAG & DROP */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Paperclip size={13} className="text-indigo-600" /> Supporting Attachments
                </span>
                <span className="text-[10.5px] text-slate-400 font-normal">Optional (Max {maxFileSizeMB}MB per file)</span>
              </label>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4 text-center transition ${dragActive
                  ? "border-indigo-500 bg-indigo-50/60"
                  : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
                  }`}
              >
                <input
                  type="file"
                  multiple
                  id="ticket-file-input"
                  onChange={handleFileChange}
                  accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx,.zip"
                  className="hidden"
                />
                <label htmlFor="ticket-file-input" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    <span className="text-indigo-600 hover:underline font-bold">Click to upload</span> or drag and drop files here
                  </p>
                  <p className="text-[10.5px] text-slate-400">Supported: JPG, PNG, PDF, DOCX, XLSX, ZIP</p>
                </label>
              </div>

              {/* FILE PREVIEW LIST */}
              {files.length > 0 && (
                <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto paysplitx-scrollbar-light">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-indigo-50/60 rounded-xl text-xs text-indigo-950 border border-indigo-100/80 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={15} className="text-indigo-600 shrink-0" />
                        <span className="font-semibold truncate">{file.name}</span>
                        <span className="text-slate-400 text-[10.5px]">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-100 transition cursor-pointer"
                        title="Remove File"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── FOOTER ACTIONS ── */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Ticket...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    <span>Submit Ticket</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
