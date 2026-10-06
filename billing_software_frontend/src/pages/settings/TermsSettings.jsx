import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  CheckCircle2,
  Building2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Search,
  ShoppingCart,
  FileSpreadsheet,
  RotateCcw,
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { SettingsShell } from "./settingsUI";

export default function TermsSettings() {
  const { setSettingsTab } = useSettings();

  const [companyId, setCompanyId] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      if (u && u.company_id) return u.company_id;
      const sel = localStorage.getItem("selected_company_id");
      if (sel && /^\d+$/.test(sel)) return Number(sel);
    } catch {
      /* ignore */
    }
    return 1;
  });

  const [companies, setCompanies] = useState([]);
  const [termsList, setTermsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalForm, setModalForm] = useState({
    text: "",
    applies_to_sale: true,
    applies_to_estimate: true,
    applies_to_credit_note: false,
    is_enabled: true,
  });

  // Load companies
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const adminId = user?.admin_id || user?.id || 0;
    if (adminId) {
      api
        .get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || "admin"}`)
        .then((res) => {
          if (res.data?.status && Array.isArray(res.data.data)) {
            setCompanies(res.data.data);
          }
        })
        .catch((err) => console.error(err));
    }
  }, []);

  // Fetch terms list for company
  const fetchTerms = async (cid) => {
    if (!cid) return;
    setLoading(true);
    try {
      const res = await api.get(`/settings/terms?company_id=${cid}`);
      if (res.data?.status && Array.isArray(res.data.data)) {
        setTermsList(res.data.data);
      } else {
        setTermsList([]);
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load terms & conditions", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms(companyId);
  }, [companyId]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Persist terms list to server
  const persistTerms = async (listToSave) => {
    if (!companyId) return;
    setSaving(true);
    try {
      const res = await api.post("/settings/terms", {
        company_id: companyId,
        terms: listToSave,
      });
      if (res.data?.status) {
        showToast("Terms & conditions updated successfully!");
      } else {
        showToast(res.data?.message || "Failed to save", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error saving terms & conditions", "error");
    } finally {
      setSaving(false);
    }
  };

  // Open Add modal
  const handleOpenAdd = () => {
    setEditingIndex(null);
    setModalForm({
      text: "",
      applies_to_sale: true,
      applies_to_estimate: true,
      applies_to_credit_note: false,
      is_enabled: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit modal
  const handleOpenEdit = (index) => {
    const item = termsList[index];
    if (!item) return;
    setEditingIndex(index);
    setModalForm({
      text: item.text || "",
      applies_to_sale: Boolean(item.applies_to_sale),
      applies_to_estimate: Boolean(item.applies_to_estimate),
      applies_to_credit_note: Boolean(item.applies_to_credit_note),
      is_enabled: item.is_enabled !== false,
    });
    setIsModalOpen(true);
  };

  // Save Modal Form
  const handleSaveModal = (e) => {
    e.preventDefault();
    const trimmed = modalForm.text.trim();
    if (!trimmed) {
      showToast("Please enter terms & conditions text", "error");
      return;
    }

    if (!modalForm.applies_to_sale && !modalForm.applies_to_estimate && !modalForm.applies_to_credit_note) {
      showToast("Please select at least one page assignment", "error");
      return;
    }

    let updated = [...termsList];

    if (editingIndex !== null) {
      updated[editingIndex] = {
        ...updated[editingIndex],
        text: trimmed,
        applies_to_sale: modalForm.applies_to_sale,
        applies_to_estimate: modalForm.applies_to_estimate,
        applies_to_credit_note: modalForm.applies_to_credit_note,
        is_enabled: modalForm.is_enabled,
      };
    } else {
      const newItem = {
        id: "tc-" + Date.now(),
        text: trimmed,
        applies_to_sale: modalForm.applies_to_sale,
        applies_to_estimate: modalForm.applies_to_estimate,
        applies_to_credit_note: modalForm.applies_to_credit_note,
        is_enabled: modalForm.is_enabled,
      };
      updated.push(newItem);
    }

    setTermsList(updated);
    setIsModalOpen(false);
    persistTerms(updated);
  };

  // Delete item
  const handleDelete = (index) => {
    const item = termsList[index];
    if (!window.confirm(`Are you sure you want to delete this terms & conditions entry?\n"${item.text}"`)) {
      return;
    }
    const updated = termsList.filter((_, i) => i !== index);
    setTermsList(updated);
    persistTerms(updated);
  };

  // Quick toggle in table row
  const handleQuickToggle = (index, field) => {
    const updated = [...termsList];
    updated[index] = {
      ...updated[index],
      [field]: !updated[index][field],
    };
    setTermsList(updated);
    persistTerms(updated);
  };

  // Reset to default sample list
  const handleResetDefaults = () => {
    if (
      !window.confirm(
        "Are you sure you want to load standard recommended entries? Custom changes will be replaced."
      )
    ) {
      return;
    }

    const defaultEntries = [
      {
        id: "tc-1",
        text: "Goods once sold cannot be returned.",
        applies_to_sale: true,
        applies_to_estimate: true,
        applies_to_credit_note: false,
        is_enabled: true,
      },
      {
        id: "tc-2",
        text: "Payment should be made within 30 days.",
        applies_to_sale: true,
        applies_to_estimate: true,
        applies_to_credit_note: true,
        is_enabled: true,
      },
      {
        id: "tc-3",
        text: "Subject to availability.",
        applies_to_sale: true,
        applies_to_estimate: true,
        applies_to_credit_note: false,
        is_enabled: true,
      },
      {
        id: "tc-4",
        text: "Credit note is valid only against the original invoice.",
        applies_to_sale: false,
        applies_to_estimate: false,
        applies_to_credit_note: true,
        is_enabled: true,
      },
      {
        id: "tc-5",
        text: "All disputes are subject to local jurisdiction.",
        applies_to_sale: true,
        applies_to_estimate: true,
        applies_to_credit_note: true,
        is_enabled: true,
      },
    ];

    setTermsList(defaultEntries);
    persistTerms(defaultEntries);
  };

  // Filter terms by search query
  const filteredList = termsList.filter((t) =>
    (t.text || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SettingsShell
      title="Terms & Conditions Settings"
      subtitle="Configure terms & conditions text and control page-wise assignment for Add Sale, Add Estimate, and Add Credit Note"
      icon={<FileText size={20} className="text-blue-600" />}
      onClose={() => setSettingsTab("general")}
      actions={
        <div className="flex items-center gap-2.5">
          {companies.length > 1 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <Building2 size={14} className="text-slate-400" />
              <select
                value={companyId}
                onChange={(e) => setCompanyId(Number(e.target.value))}
                className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name || `Company #${c.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving || loading}
            title="Reset to recommended entries"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition shadow-xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Add Terms &amp; Conditions</span>
          </button>
        </div>
      }
    >
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold transition-all ${
            toast.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle size={16} className="text-rose-500" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-500" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-100 rounded-2xl p-4 mb-5 flex items-start gap-3 shadow-xs">
        <div className="w-8 h-8 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={16} />
        </div>
        <div className="text-xs text-slate-600 leading-relaxed flex-1">
          <p className="font-bold text-slate-800 text-[13px] mb-0.5">
            Page-Wise Terms &amp; Conditions Assignment
          </p>
          <p>
            Entries created below will appear in the <strong>Terms &amp; Conditions dropdown</strong> only on the assigned pages (<strong>Add Sale</strong>, <strong>Add Estimate</strong>, and <strong>Add Credit Note</strong>).
            You can click the page checkboxes or status badges directly in the table to toggle them instantly.
          </p>
        </div>
      </div>

      {/* Search Bar & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search terms & conditions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition shadow-2xs"
          />
        </div>
        <div className="text-xs font-semibold text-slate-500">
          Total Entries: <span className="text-slate-800 font-bold">{termsList.length}</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <RefreshCw size={22} className="animate-spin text-blue-500" />
            <span className="text-xs font-medium">Loading terms &amp; conditions...</span>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
              <FileText size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">
              {searchQuery ? "No matching entries found" : "No Terms & Conditions Configured"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-4">
              {searchQuery
                ? `No terms match "${searchQuery}". Clear your search query or add a new entry.`
                : "Add custom terms & conditions or click below to load standard predefined entries."}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Load Recommended Entries
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} /> Add New Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px] select-none">
                  <th className="py-3.5 px-4 w-12 text-center border-r border-slate-100">#</th>
                  <th className="py-3.5 px-4 min-w-[320px] border-r border-slate-100">
                    Terms &amp; Conditions
                  </th>
                  <th className="py-3.5 px-3 w-32 text-center border-r border-slate-100">
                    <div className="flex items-center justify-center gap-1">
                      <ShoppingCart size={12} className="text-blue-500" />
                      <span>Add Sale</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 w-32 text-center border-r border-slate-100">
                    <div className="flex items-center justify-center gap-1">
                      <FileSpreadsheet size={12} className="text-cyan-500" />
                      <span>Add Estimate</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 w-32 text-center border-r border-slate-100">
                    <div className="flex items-center justify-center gap-1">
                      <RotateCcw size={12} className="text-emerald-500" />
                      <span>Add Credit Note</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-3 w-28 text-center border-r border-slate-100">Status</th>
                  <th className="py-3.5 px-4 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((item, idx) => {
                  const actualIndex = termsList.findIndex((t) => t.id === item.id);
                  const isEnabled = item.is_enabled !== false;

                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-blue-50/20 transition-colors ${
                        !isEnabled ? "opacity-60 bg-slate-50/40" : ""
                      }`}
                    >
                      {/* # Index */}
                      <td className="py-3 px-4 text-center font-bold text-slate-400 border-r border-slate-100">
                        {idx + 1}
                      </td>

                      {/* Text */}
                      <td className="py-3 px-4 border-r border-slate-100 font-medium text-slate-800 leading-relaxed">
                        <span>{item.text}</span>
                      </td>

                      {/* Add Sale Assignment */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(actualIndex, "applies_to_sale")}
                          title={`Click to ${item.applies_to_sale ? "remove from" : "assign to"} Add Sale`}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition cursor-pointer ${
                            item.applies_to_sale
                              ? "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
                              : "bg-slate-100 text-slate-300 border border-slate-200 hover:bg-slate-200 hover:text-slate-500"
                          }`}
                        >
                          {item.applies_to_sale ? (
                            <Check size={14} strokeWidth={2.8} />
                          ) : (
                            <X size={13} strokeWidth={2} />
                          )}
                        </button>
                      </td>

                      {/* Add Estimate Assignment */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(actualIndex, "applies_to_estimate")}
                          title={`Click to ${item.applies_to_estimate ? "remove from" : "assign to"} Add Estimate`}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition cursor-pointer ${
                            item.applies_to_estimate
                              ? "bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"
                              : "bg-slate-100 text-slate-300 border border-slate-200 hover:bg-slate-200 hover:text-slate-500"
                          }`}
                        >
                          {item.applies_to_estimate ? (
                            <Check size={14} strokeWidth={2.8} />
                          ) : (
                            <X size={13} strokeWidth={2} />
                          )}
                        </button>
                      </td>

                      {/* Add Credit Note Assignment */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(actualIndex, "applies_to_credit_note")}
                          title={`Click to ${item.applies_to_credit_note ? "remove from" : "assign to"} Add Credit Note`}
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition cursor-pointer ${
                            item.applies_to_credit_note
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-300 border border-slate-200 hover:bg-slate-200 hover:text-slate-500"
                          }`}
                        >
                          {item.applies_to_credit_note ? (
                            <Check size={14} strokeWidth={2.8} />
                          ) : (
                            <X size={13} strokeWidth={2} />
                          )}
                        </button>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3 text-center border-r border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleQuickToggle(actualIndex, "is_enabled")}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer inline-flex items-center gap-1 ${
                            isEnabled
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isEnabled ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isEnabled ? "Active" : "Disabled"}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(actualIndex)}
                            title="Edit terms entry"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(actualIndex)}
                            title="Delete terms entry"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <FileText size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {editingIndex !== null ? "Edit Terms & Conditions" : "Add Terms & Conditions"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Configure text and assign which sales pages it should appear on
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Terms &amp; Conditions Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Goods once sold cannot be returned."
                  value={modalForm.text}
                  onChange={(e) => setModalForm({ ...modalForm, text: e.target.value })}
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none transition resize-none leading-relaxed"
                />
              </div>

              {/* Page Assignments */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Page-Wise Assignment <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Add Sale */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                      modalForm.applies_to_sale
                        ? "bg-blue-50/70 border-blue-300 text-blue-900"
                        : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={modalForm.applies_to_sale}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, applies_to_sale: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">Add Sale</span>
                  </label>

                  {/* Add Estimate */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                      modalForm.applies_to_estimate
                        ? "bg-cyan-50/70 border-cyan-300 text-cyan-900"
                        : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={modalForm.applies_to_estimate}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, applies_to_estimate: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-cyan-600 border-slate-300 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">Add Estimate</span>
                  </label>

                  {/* Add Credit Note */}
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                      modalForm.applies_to_credit_note
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-900"
                        : "bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={modalForm.applies_to_credit_note}
                      onChange={(e) =>
                        setModalForm({ ...modalForm, applies_to_credit_note: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold">Add Credit Note</span>
                  </label>
                </div>
              </div>

              {/* Status */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={modalForm.is_enabled}
                    onChange={(e) =>
                      setModalForm({ ...modalForm, is_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-700">Enabled (Active in dropdowns)</span>
                </label>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{editingIndex !== null ? "Update Entry" : "Save Entry"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SettingsShell>
  );
}
