import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Percent, ArrowLeft, Save } from "lucide-react";

export default function TaxForm() {
  const navigate = useNavigate();
  const [tax, setTax] = useState({
    name: "",
    percent: "",
  });

  return (
    <div className="p-6 max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/tax")}
          className="app-btn-secondary p-2"
          title="Back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Percent size={20} className="text-brand-600" />
            <span>Add Tax Slab</span>
          </h1>
          <p className="text-xs text-slate-500">Define a new GST tax slab rate</p>
        </div>
      </div>

      <div className="app-card space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Tax Name (e.g. GST 18%, Cess)
          </label>
          <input
            placeholder="e.g. GST 18%"
            value={tax.name}
            className="app-input"
            onChange={(e) => setTax({ ...tax, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Tax Percentage (%)
          </label>
          <input
            type="number"
            placeholder="e.g. 18"
            value={tax.percent}
            className="app-input"
            onChange={(e) => setTax({ ...tax, percent: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate("/tax")}
            className="app-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => navigate("/tax")}
            className="app-btn-primary"
          >
            <Save size={15} />
            <span>Save Tax</span>
          </button>
        </div>
      </div>
    </div>
  );
}