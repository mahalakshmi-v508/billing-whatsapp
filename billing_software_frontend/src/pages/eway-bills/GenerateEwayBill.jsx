import { useNavigate } from "react-router-dom";
import { ArrowLeft, Truck } from "lucide-react";
import EwayGenerateStepper from "./EwayGenerateStepper";

export default function GenerateEwayBill() {
  const navigate = useNavigate();

  return (
    <div className="p-2 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate("/e-way")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={14} />
          <span>Back to E-Way Bills</span>
        </button>

        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
          <Truck size={14} className="text-blue-600" />
          <span>GST E-Way Bill Generation Wizard</span>
        </span>
      </div>

      <EwayGenerateStepper
        onCreated={() => { }}
        onViewGenerated={() => navigate("/e-way")}
        onPrint={() => window.print()}
        onDownload={() => { }}
        onWhatsApp={() => { }}
      />
    </div>
  );
}