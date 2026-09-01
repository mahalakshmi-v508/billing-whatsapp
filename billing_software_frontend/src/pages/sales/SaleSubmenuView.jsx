import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ArrowLeft, FileText } from "lucide-react";

export default function SaleSubmenuView({ title = "Sale Document", type = "document", subtitle }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const defaultSubtitle = {
    quotation: "Create and track customer estimates and price quotations",
    proforma: "Manage proforma invoices before final billing generation",
    order: "Track confirmed customer purchase and sale orders",
    challan: "Manage dispatch and delivery challans for goods transfer",
    credit_note: "Process sales returns, credit notes, and customer adjustments"
  }[type] || "Manage and view documents";

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/reports")}
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition"
            title="Back to Sales Invoices"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{subtitle || defaultSubtitle}</p>
          </div>
        </div>

        {/* Action button to create new */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/sales/add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition transform active:scale-95"
          >
            <Plus size={18} />
            <span>Create {title.split("/")[0].trim()}</span>
          </button>
        </div>
      </div>

      {/* ── SUMMARY STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Records</span>
          <div className="text-2xl font-bold text-slate-800 mt-1">0</div>
          <span className="text-xs text-slate-400">All recorded {title}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Value</span>
          <div className="text-2xl font-bold text-blue-600 mt-1">₹0.00</div>
          <span className="text-xs text-slate-400">Combined document value</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">Active</div>
          <span className="text-xs text-slate-400">Ready for entries</span>
        </div>
      </div>

      {/* ── FILTERS & SEARCH ── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm mb-6 flex flex-col md:flex-row gap-3 justify-between items-center">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()} by customer or number...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>

          <button
            onClick={() => navigate("/reports")}
            className="px-3.5 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition"
          >
            View All Sales
          </button>
        </div>
      </div>

      {/* ── TABLE / EMPTY STATE ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No {title} Created Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Get started by creating your first {title.toLowerCase()}. Once generated, all details, printouts, and customer records will be organized right here.
          </p>
          <button
            onClick={() => navigate("/sales/add")}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition"
          >
            <Plus size={18} />
            <span>Create New {title.split("/")[0].trim()}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
