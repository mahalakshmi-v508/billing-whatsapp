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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* HEADER */}
          <div className="bg-gradient-to-r from-[#1f8cff] to-[#4338ca] p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Tag size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Create New Support Ticket</h3>
                <p className="text-xs text-white/80">Submit your query or issue to our technical support team</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* FORM BODY */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* SUBJECT */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief summary of your issue (e.g. Printer connection error on billing)"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
              />
            </div>

            {/* CATEGORY & PRIORITY */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Category
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition bg-white"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-xl">
                  {["low", "medium", "high", "critical"].map((p) => {
                    const active = formData.priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p })}
                        className={`py-2 text-xs font-bold capitalize rounded-lg transition ${
                          active
                            ? p === "critical"
                              ? "bg-red-600 text-white shadow"
                              : p === "high"
                              ? "bg-orange-500 text-white shadow"
                              : p === "medium"
                              ? "bg-amber-500 text-white shadow"
                              : "bg-indigo-600 text-white shadow"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain the problem in detail. Include steps to reproduce, error codes, or customer details if applicable..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-sm transition"
              />
            </div>

            {/* ATTACHMENTS DRAG & DROP */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Attachments <span className="text-gray-400 font-normal">(Optional — Max {maxFileSizeMB}MB)</span>
              </label>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${
                  dragActive ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
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
                  <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    <span className="text-indigo-600 hover:underline">Click to upload</span> or drag and drop files here
                  </p>
                  <p className="text-xs text-gray-400">Supported: JPG, PNG, PDF, DOCX, XLSX, ZIP</p>
                </label>
              </div>

              {/* FILE PREVIEW LIST */}
              {files.length > 0 && (
                <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-indigo-50/60 rounded-xl text-xs text-indigo-900 border border-indigo-100"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText size={16} className="text-indigo-500 shrink-0" />
                        <span className="font-semibold truncate">{file.name}</span>
                        <span className="text-gray-400">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-100 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SUBMIT ACTIONS */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1f8cff] to-[#4338ca] text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:opacity-95 transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Ticket...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    Submit Ticket
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
