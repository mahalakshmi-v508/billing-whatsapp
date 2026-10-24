import { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Check,
  Table,
  Info,
} from "lucide-react";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell } from "./settingsUI";

const STORAGE_KEY = "item_settings";

const DEFAULT_STATE = {
  customFields: [],
  custom_fields: [],
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_STATE;
  }
}

function CustomFieldModal({ isOpen, onClose, field, onSave }) {
  const [label, setLabel] = useState(field?.label || field?.name || "");
  const [key, setKey] = useState(field?.name || field?.key || "");
  const [type, setType] = useState(field?.type || "text");
  const [optionsStr, setOptionsStr] = useState(
    Array.isArray(field?.options) ? field.options.join(", ") : field?.options || ""
  );
  const [required, setRequired] = useState(Boolean(field?.required));
  const [showInTable, setShowInTable] = useState(
    field?.show_in_table !== undefined ? Boolean(field.show_in_table) : true
  );
  const [error, setError] = useState("");

  // Sync state whenever field or isOpen changes
  useEffect(() => {
    if (field) {
      setLabel(field.label || field.name || "");
      setKey(field.name || field.key || "");
      setType(field.type || "text");
      setOptionsStr(
        Array.isArray(field.options) ? field.options.join(", ") : field.options || ""
      );
      setRequired(Boolean(field.required));
      setShowInTable(field.show_in_table !== undefined ? Boolean(field.show_in_table) : true);
    } else {
      setLabel("");
      setKey("");
      setType("text");
      setOptionsStr("");
      setRequired(false);
      setShowInTable(true);
    }
    setError("");
  }, [field, isOpen]);

  const handleLabelChange = (val) => {
    setLabel(val);
    if (!field) {
      // Auto-generate key from label for new field
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setKey(generated);
    }
  };

  const handleSave = () => {
    if (!label.trim()) {
      setError("Field label is required");
      return;
    }
    const cleanKey = (key || label)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!cleanKey) {
      setError("Valid field key/identifier is required");
      return;
    }

    let parsedOptions = [];
    if (type === "select") {
      parsedOptions = optionsStr
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (parsedOptions.length === 0) {
        setError("Please enter at least one option for the dropdown (comma separated)");
        return;
      }
    }

    onSave(
      {
        id: field?.id || (field?.name ? `cf_${field.name}` : `cf_${Date.now()}`),
        name: cleanKey,
        key: cleanKey,
        label: label.trim(),
        type,
        options: parsedOptions,
        required,
        show_in_table: showInTable,
      },
      field?.id || field?.name || field?.key
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {field ? "Edit Custom Field" : "Add Custom Field"}
              </h3>
              <p className="text-[11px] text-slate-400">Configure dynamic field for products</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Label / Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Color, Warranty, Rack No, Size"
              value={label}
              onChange={(e) => {
                setError("");
                handleLabelChange(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Identifier (Key) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. rack_no, color"
              value={key}
              onChange={(e) => {
                setError("");
                setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"));
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">Unique technical key used in database JSON</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Field Type</label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition cursor-pointer appearance-none"
              >
                <option value="text">Single Line Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="select">Dropdown / Selection List</option>
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {type === "select" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dropdown Options <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Option 1, Option 2, Option 3 (comma separated)"
                value={optionsStr}
                onChange={(e) => {
                  setError("");
                  setOptionsStr(e.target.value);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">Separate choices with commas</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInTable}
                onChange={(e) => setShowInTable(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">Show as column in Products Table</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700">Mandatory field (Required in Add / Edit)</span>
            </label>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
          >
            Save Field
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Item() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState(loadState);
  useBackendSync("item", state, setState);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);

  const customFields = Array.isArray(state.customFields)
    ? state.customFields
    : Array.isArray(state.custom_fields)
    ? state.custom_fields
    : [];

  const handleSaveCustomField = (newOrUpdatedField, originalIdentifier) => {
    setState((s) => {
      const current = Array.isArray(s.customFields)
        ? s.customFields
        : Array.isArray(s.custom_fields)
        ? s.custom_fields
        : [];
      const existsIndex = current.findIndex((f) => {
        if (
          originalIdentifier &&
          (f.id === originalIdentifier || f.name === originalIdentifier || f.key === originalIdentifier)
        ) {
          return true;
        }
        if (newOrUpdatedField.id && f.id === newOrUpdatedField.id) return true;
        if (newOrUpdatedField.name && (f.name === newOrUpdatedField.name || f.key === newOrUpdatedField.name)) return true;
        return false;
      });
      let updated;
      if (existsIndex >= 0) {
        updated = [...current];
        updated[existsIndex] = newOrUpdatedField;
      } else {
        updated = [...current, newOrUpdatedField];
      }
      const next = { ...s, customFields: updated, custom_fields: updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
      } catch {
        /* best-effort */
      }
      return next;
    });
  };

  const handleDeleteCustomField = (idOrKey) => {
    if (!window.confirm("Are you sure you want to delete this custom field?")) {
      return;
    }
    setState((s) => {
      const current = Array.isArray(s.customFields)
        ? s.customFields
        : Array.isArray(s.custom_fields)
        ? s.custom_fields
        : [];
      const updated = current.filter((f) => f.id !== idOrKey && f.name !== idOrKey);
      const next = { ...s, customFields: updated, custom_fields: updated };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event("storage"));
      } catch {
        /* best-effort */
      }
      return next;
    });
  };

  const handleToggleTableColumn = (field) => {
    handleSaveCustomField({
      ...field,
      show_in_table: !field.show_in_table,
    });
  };

  return (
    <SettingsShell
      title="Product Custom Fields"
      subtitle="MANAGE DYNAMIC ATTRIBUTES FOR PRODUCTS"
      icon={<SlidersHorizontal size={22} strokeWidth={2.2} />}
      contentClassName="space-y-6 max-w-5xl"
    >
      {/* Top Banner & Action */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-purple-50/40 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-800">
              Dynamic Custom Fields for Products
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
              {customFields.length} {customFields.length === 1 ? "Field" : "Fields"} Active
            </span>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Create extra product attributes like <strong>Color</strong>, <strong>Warranty</strong>,{" "}
            <strong>Rack No</strong>, <strong>Size</strong>, or <strong>Expiry</strong>.
            Fields configured here will automatically appear in <strong>Add Product</strong>,{" "}
            <strong>Edit Product</strong>, and inside the <strong>Products Table</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingField(null);
            setModalOpen(true);
          }}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/25 cursor-pointer shrink-0 active:scale-95"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Custom Field</span>
        </button>
      </div>

      {/* Custom Fields Directory Table */}
      {customFields.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50/50 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <SlidersHorizontal size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700">No custom fields defined yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Add your first custom field to start capturing custom details for your products.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingField(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>Create First Custom Field</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Field Label</th>
                  <th className="py-3 px-4">Key (JSON)</th>
                  <th className="py-3 px-4">Input Type</th>
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4 text-center">In Products Table</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {customFields.map((f, idx) => (
                  <tr key={f.id || f.name} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span>{f.label}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                        {f.name || f.key}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {f.type}
                        </span>
                        {f.type === "select" && Array.isArray(f.options) && f.options.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            ({f.options.length} options)
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {f.required ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                          Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                          Optional
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleTableColumn(f)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                          f.show_in_table
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200 hover:text-slate-600"
                        }`}
                        title="Click to toggle column visibility in Products directory table"
                      >
                        <Table size={12} />
                        <span>{f.show_in_table ? "Visible" : "Hidden"}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingField(f);
                            setModalOpen(true);
                          }}
                          className="w-7 h-7 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition cursor-pointer"
                          title="Edit Custom Field"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(f.id || f.name)}
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer"
                          title="Delete Custom Field"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Tips Footer */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
        <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-700">How Custom Fields Work:</p>
          <ul className="list-disc list-inside text-slate-500 text-[11.5px] space-y-0.5">
            <li>Any field added here is automatically stored inside MySQL as a structured JSON attribute under <code className="font-mono bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">custom_fields</code>.</li>
            <li>Forms for <strong>Add Product</strong> and <strong>Edit Product</strong> render these dynamic input fields automatically.</li>
            <li>If <strong>Visible</strong> in table is chosen, a dedicated column will appear in the Products Directory Table.</li>
          </ul>
        </div>
      </div>

      {/* Custom Field Modal */}
      {modalOpen && (
        <CustomFieldModal
          key={editingField ? (editingField.id || editingField.name || editingField.key || "edit") : "new"}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingField(null);
          }}
          field={editingField}
          onSave={handleSaveCustomField}
        />
      )}
    </SettingsShell>
  );
}
