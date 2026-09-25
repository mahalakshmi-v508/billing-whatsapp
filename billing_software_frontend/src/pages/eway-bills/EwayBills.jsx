import { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  History,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import { MOCK_EWAY_BILLS, MOCK_SUMMARY_METRICS } from "./mockEwayData";
import EwayDashboard from "./EwayDashboard";
import EwayList from "./EwayList";
import EwayGenerateStepper from "./EwayGenerateStepper";
import EwayExpiringSoon from "./EwayExpiringSoon";
import EwayExpired from "./EwayExpired";
import EwayCancelled from "./EwayCancelled";
import EwayHistory from "./EwayHistory";
import EwayDetailsModal from "./EwayDetailsModal";
import UpdateVehicleModal from "./UpdateVehicleModal";
import ExtendValidityModal from "./ExtendValidityModal";
import CancelEwayModal from "./CancelEwayModal";

const SUB_NAV_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "generate", label: "Generate", icon: Plus, highlight: true },
  { id: "all", label: "All Bills", icon: Layers },
  { id: "active", label: "Active", icon: CheckCircle2, badgeKey: "active" },
  { id: "expiring", label: "Expiring Soon", icon: Clock, badgeKey: "expiring", tone: "amber" },
  { id: "expired", label: "Expired", icon: AlertTriangle, badgeKey: "expired" },
  { id: "cancelled", label: "Cancelled", icon: XCircle, badgeKey: "cancelled" },
  { id: "history", label: "History", icon: History },
];

export default function EwayBills() {
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [bills, setBills] = useState(MOCK_EWAY_BILLS);
  const [toast, setToast] = useState(null);

  // Modals state
  const [viewingBill, setViewingBill] = useState(null);
  const [updatingVehicleBill, setUpdatingVehicleBill] = useState(null);
  const [extendingValidityBill, setExtendingValidityBill] = useState(null);
  const [cancellingBill, setCancellingBill] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Dynamic live metric calculations
  const metrics = useMemo(() => {
    return {
      total: bills.length + 239, // Combined lifetime
      active: bills.filter((b) => b.status === "Active").length + 158,
      expiring: bills.filter((b) => b.status === "Expiring Soon").length + 10,
      expired: bills.filter((b) => b.status === "Expired").length + 47,
      cancelled: bills.filter((b) => b.status === "Cancelled").length + 23,
    };
  }, [bills]);

  // Tab counts for subnav pills
  const subnavCounts = useMemo(() => {
    return {
      active: bills.filter((b) => b.status === "Active").length,
      expiring: bills.filter((b) => b.status === "Expiring Soon").length,
      expired: bills.filter((b) => b.status === "Expired").length,
      cancelled: bills.filter((b) => b.status === "Cancelled").length,
    };
  }, [bills]);

  // Handlers for modal actions
  const handleSaveVehicle = (updated) => {
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    showToast(`Vehicle updated to ${updated.vehicle_no} for EWB #${updated.ewb_no}`);
  };

  const handleSaveValidity = (updated) => {
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    showToast(`Validity extended successfully for EWB #${updated.ewb_no}`);
  };

  const handleConfirmCancel = (updated) => {
    setBills((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    showToast(`E-Way Bill #${updated.ewb_no} cancelled on portal`);
  };

  const handleCreatedNewBill = (newBill) => {
    setBills((prev) => [newBill, ...prev]);
    showToast(`E-Way Bill #${newBill.ewb_no} generated successfully!`);
  };

  const handlePrint = (bill) => {
    showToast(`Preparing E-Way Bill #${bill.ewb_no} print preview...`);
    window.print();
  };

  const handleDownload = (bill) => {
    showToast(`Downloading official PDF for E-Way Bill #${bill.ewb_no}...`);
  };

  const handleWhatsApp = (bill) => {
    const text = encodeURIComponent(
      `Hello ${bill.customer_name},\nYour E-Way Bill #${bill.ewb_no} for Invoice ${bill.invoice_no} (Vehicle: ${bill.vehicle_no}) has been generated. Valid until ${bill.valid_until}.\nThank you!`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleGenerateNewFromExpired = (bill) => {
    setCurrentTab("generate");
    showToast(`Prefilled document from Invoice ${bill.invoice_no} for new E-Way Bill`);
  };

  return (
    <div className="p-2 space-y-6 max-w-[1600px] mx-auto text-slate-800 font-sans">
      {/* ── Floating Notification Toast ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4.5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* ── Clean Internal Sub-Navigation Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-xs flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto paysplitx-scrollbar-light w-full sm:w-auto">
          {SUB_NAV_TABS.map((t) => {
            const isSelected = currentTab === t.id;
            const Icon = t.icon;
            const count = t.badgeKey ? subnavCounts[t.badgeKey] : null;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrentTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${isSelected
                  ? t.highlight
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm shadow-blue-500/20"
                    : "bg-slate-900 text-white shadow-xs"
                  : t.highlight
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    : "bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
              >
                <Icon size={14} strokeWidth={2.2} />
                <span>{t.label}</span>
                {count !== null && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${isSelected
                      ? "bg-white/20 text-white"
                      : t.tone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                      }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 pr-2 text-xs font-bold text-slate-500">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span>GST Rule 138 Compliant</span>
        </div>
      </div>

      {/* ── View Routing by Tab ── */}
      {currentTab === "dashboard" && (
        <EwayDashboard
          bills={bills}
          metrics={metrics}
          onNavigateTab={setCurrentTab}
          onViewBill={setViewingBill}
          onUpdateVehicle={setUpdatingVehicleBill}
          onExtendValidity={setExtendingValidityBill}
          onCancelBill={setCancellingBill}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {currentTab === "generate" && (
        <EwayGenerateStepper
          onCreated={handleCreatedNewBill}
          onViewGenerated={(b) => setViewingBill(b)}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {currentTab === "all" && (
        <EwayList
          bills={bills}
          initialTab="all"
          onNavigateTab={setCurrentTab}
          onViewBill={setViewingBill}
          onUpdateVehicle={setUpdatingVehicleBill}
          onExtendValidity={setExtendingValidityBill}
          onCancelBill={setCancellingBill}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
          onGenerateNew={handleGenerateNewFromExpired}
        />
      )}

      {currentTab === "active" && (
        <EwayList
          bills={bills}
          initialTab="Active"
          onNavigateTab={setCurrentTab}
          onViewBill={setViewingBill}
          onUpdateVehicle={setUpdatingVehicleBill}
          onExtendValidity={setExtendingValidityBill}
          onCancelBill={setCancellingBill}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
          onGenerateNew={handleGenerateNewFromExpired}
        />
      )}

      {currentTab === "expiring" && (
        <EwayExpiringSoon
          bills={bills}
          onViewBill={setViewingBill}
          onUpdateVehicle={setUpdatingVehicleBill}
          onExtendValidity={setExtendingValidityBill}
          onCancelBill={setCancellingBill}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {currentTab === "expired" && (
        <EwayExpired
          bills={bills}
          onViewBill={setViewingBill}
          onGenerateNew={handleGenerateNewFromExpired}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {currentTab === "cancelled" && (
        <EwayCancelled
          bills={bills}
          onViewBill={setViewingBill}
          onPrint={handlePrint}
          onDownload={handleDownload}
          onWhatsApp={handleWhatsApp}
        />
      )}

      {currentTab === "history" && (
        <EwayHistory onViewBillByEwb={(ewb) => setViewingBill(bills.find((b) => b.ewb_no === ewb))} />
      )}

      {/* ── Reusable Interactive Modals ── */}
      <EwayDetailsModal
        bill={viewingBill}
        isOpen={Boolean(viewingBill)}
        onClose={() => setViewingBill(null)}
        onUpdateVehicle={(b) => setUpdatingVehicleBill(b)}
        onExtendValidity={(b) => setExtendingValidityBill(b)}
        onCancel={(b) => setCancellingBill(b)}
        onPrint={handlePrint}
        onDownload={handleDownload}
        onWhatsApp={handleWhatsApp}
      />

      <UpdateVehicleModal
        bill={updatingVehicleBill}
        isOpen={Boolean(updatingVehicleBill)}
        onClose={() => setUpdatingVehicleBill(null)}
        onSave={handleSaveVehicle}
      />

      <ExtendValidityModal
        bill={extendingValidityBill}
        isOpen={Boolean(extendingValidityBill)}
        onClose={() => setExtendingValidityBill(null)}
        onSave={handleSaveValidity}
      />

      <CancelEwayModal
        bill={cancellingBill}
        isOpen={Boolean(cancellingBill)}
        onClose={() => setCancellingBill(null)}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
}