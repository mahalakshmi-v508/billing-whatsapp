import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquareText,
  QrCode,
  Loader2,
  Check,
  Send,
  ShieldAlert,
  Info,
  Sparkles,
  Smartphone,
  CheckCheck,
  RotateCcw,
  FileText,
  Receipt,
  CreditCard,
  Truck,
  Phone,
  Wifi,
  WifiOff,
  Building2,
  Search,
  CheckCircle2,
  ExternalLink,
  Zap,
  Tag,
  Sliders,
  Calendar,
  IndianRupee,
  Layers,
  X
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "./settingsApi";
import { useSettings } from "./SettingsContext";
import { SettingsShell, Badge, Toggle, InfoIcon } from "./settingsUI";

const blue = "#2563eb";

/* ─── TRANSACTION TYPES & METADATA ─────────────────────────────────────────── */
const TYPES = [
  { key: "sales", label: "Sales Invoice", category: "Sales", icon: FileText, desc: "Sent when a sales bill or tax invoice is generated" },
  { key: "payment_in", label: "Payment In", category: "Accounts", icon: IndianRupee, desc: "Sent upon receipt of party funds or settlement" },
  { key: "estimate", label: "Estimate / Quotation", category: "Sales", icon: FileText, desc: "Price quote or proforma estimate for prospective buyers" },
  { key: "sales_return", label: "Sales Return (Credit Note)", category: "Sales", icon: RotateCcw, desc: "Sent when party returns goods or claims a credit note" },
  { key: "sale_order", label: "Sale Order", category: "Sales", icon: Receipt, desc: "Booking order confirmation sent to customer" },
  { key: "delivery_challan", label: "Delivery Challan", category: "Logistics", icon: Truck, desc: "Transport and consignment dispatch note" },
  { key: "proforma_invoice", label: "Proforma Invoice", category: "Sales", icon: FileText, desc: "Preliminary commercial bill prior to delivery" },
  { key: "purchase", label: "Purchase Bill", category: "Purchase", icon: Receipt, desc: "Sent to supplier upon receiving raw goods/stock" },
  { key: "payment_out", label: "Payment Out", category: "Accounts", icon: CreditCard, desc: "Disbursement voucher confirmation to vendors" },
  { key: "purchase_order", label: "Purchase Order", category: "Purchase", icon: FileText, desc: "Official purchase order issued to vendors" },
  { key: "purchase_return", label: "Purchase Return (Dr Note)", category: "Purchase", icon: RotateCcw, desc: "Debit note sent when returning stock to vendor" },
  { key: "cancelled_invoice", label: "Cancelled Invoice", category: "Compliance", icon: ShieldAlert, desc: "Notification when an existing invoice is voided" },
  { key: "expense", label: "Expense Voucher", category: "Accounts", icon: IndianRupee, desc: "Operational expense and payout receipt" },
  { key: "sale_fa", label: "Sale FA (Fixed Asset)", category: "Assets", icon: Layers, desc: "Fixed asset disposal or liquidation note" },
  { key: "purchase_fa", label: "Purchase FA (Fixed Asset)", category: "Assets", icon: Layers, desc: "Fixed asset procurement voucher" },
  { key: "royalty_points", label: "Royalty Points", category: "Rewards", icon: Sparkles, desc: "Loyalty rewards milestone and bonus points" },
  { key: "credit_due", label: "Credit Due Reminder", category: "Recovery", icon: Calendar, desc: "Gentle reminder for outstanding credit payments" },
];

const TYPES_MAP = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));

const CATEGORIES = ["All", "Sales", "Purchase", "Accounts", "Logistics", "Rewards & Due"];

const VARIABLE_GROUPS = [
  {
    category: "Party & Firm",
    items: [
      { tag: "Firm_Name", label: "Firm Name", desc: "Your business company name" },
      { tag: "Party_Name", label: "Party Name", desc: "Customer or supplier name" },
      { tag: "Transaction_Type", label: "Type", desc: "Sales, Payment, Order etc." },
    ]
  },
  {
    category: "Amounts & Balance",
    items: [
      { tag: "Invoice_Number", label: "Invoice #", desc: "Generated voucher number" },
      { tag: "Invoice_Amount", label: "Amount", desc: "Total invoice value (₹)" },
      { tag: "Transaction_Balance", label: "Balance", desc: "Remaining party balance" },
      { tag: "Payment_Amount", label: "Paid Amt", desc: "Received / paid amount" },
      { tag: "Payment_Mode", label: "Pay Mode", desc: "Cash, UPI, Bank Transfer" },
    ]
  },
  {
    category: "Links & Terms",
    items: [
      { tag: "Invoice_Link", label: "Invoice URL", desc: "PDF online view link" },
      { tag: "Payment_Link", label: "Payment URL", desc: "Online payment gateway link" },
      { tag: "Due_Date", label: "Due Date", desc: "Payment settlement deadline" },
      { tag: "Credit_Days", label: "Credit Days", desc: "Allowed credit duration" },
      { tag: "Royalty_Points", label: "Points", desc: "Customer loyalty points" },
    ]
  }
];

/** Selectable message variants per transaction type. */
const VARIANTS = [
  { key: "template_1", label: "Template 1", badge: "Standard", desc: "Standard detailed business format" },
  { key: "template_2", label: "Template 2", badge: "Compact", desc: "Concise summary format" },
  { key: "custom", label: "Customize", badge: "Custom", desc: "Your tailored message draft" },
];

/** Per-type extra number inputs shown in the auto-send grid when the toggle is ON. */
const EXTRA_FIELDS = {
  royalty_points: { label: "Royalty Points Threshold", key: "royalty_points_threshold", placeholder: "100", unit: "pts" },
  credit_due: { label: "Credit Due Days", key: "credit_days", placeholder: "30", unit: "days" },
};

/** The row field that holds the message for a given variant. */
function fieldForVariant(variant) {
  if (variant === "template_2") return "template_2";
  if (variant === "custom") return "custom_template";
  return "template";
}

/** The message content stored for a variant on a settings row. */
function messageForVariant(row, variant) {
  if (!row) return "";
  return row[fieldForVariant(variant)] || "";
}

/** Mirrors the server-side line/token suppression rules for the live preview. */
function renderPreview(template, ctx, s) {
  if (!template) return "";
  const enabled = {
    Transaction_Balance: !!s.party_balance_in_msg,
    Invoice_Link: !!s.web_invoice_link_in_msg && !!ctx.invoice_link,
    Payment_Link: !!s.payment_link_in_msg && !!ctx.payment_link,
    Payment_Amount: ctx.payment_amount !== "" && ctx.payment_amount != null,
    Payment_Mode: !!ctx.payment_mode,
  };
  const kept = template
    .split(/\r?\n/)
    .filter(
      (line) =>
        !Object.entries(enabled).some(
          ([tok, on]) => !on && line.includes(`[${tok}]`)
        )
    );

  let out = kept.join("\n");
  const map = {
    "[Firm_Name]": ctx.firm_name || "My Company",
    "[Party_Name]": ctx.party_name || "Sri Murugan Traders",
    "[Transaction_Type]": ctx.transaction_type || "Sales Invoice",
    "[Invoice_Number]": ctx.txn_no || "INV-2026-0001",
    "[Invoice_Amount]": ctx.invoice_amount || "1,726.00",
    "[Transaction_Balance]": ctx.transaction_balance || "500.00",
    "[Payment_Amount]": ctx.payment_amount || "1,726.00",
    "[Payment_Mode]": ctx.payment_mode || "Cash",
    "[Invoice_Link]": ctx.invoice_link || "https://bill.ly/inv9823",
    "[Payment_Link]": ctx.payment_link || "https://pay.ly/p9823",
    "[Royalty_Points]": ctx.royalty_points || "150",
    "[Due_Date]": ctx.due_date || "30/09/2026",
    "[Credit_Days]": ctx.credit_days || "15",
  };
  Object.entries(map).forEach(([tok, v]) => {
    out = out.split(tok).join(v || "");
  });

  out = out
    .split("\n")
    .filter((line) => !/^[^:]*:\s*$/.test(line))
    .join("\n");

  return out.trim();
}

export default function TransactionMessage() {
  const { setSettingsTab } = useSettings();
  const companyId = getCompanyId();
  const [types, setTypes] = useState({});
  const [selectedType, setSelectedType] = useState("sales");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewCtx, setPreviewCtx] = useState(null);
  const [firm, setFirm] = useState({ name: "", phone: "" });
  const [loaded, setLoaded] = useState(false);

  // connection
  const [conn, setConn] = useState({ status: "disconnected", qr: null, phone: null, name: null });
  const [connecting, setConnecting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // save feedback
  const [savedAt, setSavedAt] = useState(null);
  const [toasts, setToasts] = useState([]);
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);

  const showToast = useCallback((msg, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);

  // ── load settings ──
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    api
      .get("/transaction-messages/settings", { params: { company_id: companyId } })
      .then((res) => {
        if (cancelled || !res.data.status) return;
        setTypes(res.data.data.types || {});
        setFirm(res.data.data.firm || { name: "", phone: "" });
        const c = res.data.data.connection || {};
        setConn({ status: c.status || "disconnected", qr: null, phone: c.phone, name: c.name });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // ── live connection status polling ──
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(`/whatsapp/connect_status?company_id=${companyId}`);
        if (!cancelled && res.data.status) {
          setConn((c) => ({
            ...c,
            status: res.data.data?.status || c.status,
            qr: res.data.data?.qr || c.qr,
            phone: res.data.data?.phone || c.phone,
            name: res.data.data?.name || c.name,
          }));
        }
      } catch {
        /* preserve last known state */
      }
    };
    load();
    const t = setInterval(load, conn.status === "ready" ? 8000 : 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [companyId, conn.status]);

  const connectWhatsApp = async () => {
    setConnecting(true);
    setShowQrModal(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const res = await api.post("/whatsapp/connect", {
        company_id: companyId,
        user_id: user.id,
      });
      showToast(res.data.message || "Generating QR code...");
    } catch (err) {
      showToast(err.response?.data?.message || "WhatsApp service is not reachable", false);
    } finally {
      setConnecting(false);
    }
  };

  // ── preview context per selected type ──
  useEffect(() => {
    if (!companyId || !selectedType) {
      setPreviewCtx(null);
      return;
    }
    let cancelled = false;
    api
      .get("/transaction-messages/preview-data", {
        params: { company_id: companyId, transaction_type: selectedType },
      })
      .then((res) => {
        if (!cancelled && res.data.status) setPreviewCtx(res.data.data);
      })
      .catch(() => setPreviewCtx(null));
    return () => {
      cancelled = true;
    };
  }, [companyId, selectedType]);

  // ── save (debounced upsert for one type) ──
  const scheduleSave = useCallback(
    (typeKey, next) => {
      setTypes((t) => ({ ...t, [typeKey]: next }));
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!companyId) return;
        try {
          await api.post("/transaction-messages/settings", {
            company_id: companyId,
            settings: [next],
          });
          setSavedAt(Date.now());
        } catch {
          showToast("Could not save settings", false);
        }
      }, 700);
    },
    [companyId, showToast]
  );

  const patchType = (typeKey, patch) => {
    const current = types[typeKey];
    if (!current) return;
    scheduleSave(typeKey, { ...current, ...patch });
  };

  const sel = types[selectedType] || null;
  const activeVariant = sel?.selected_template || "template_1";
  const activeField = fieldForVariant(activeVariant);
  const activeMessage = sel ? sel[activeField] || "" : "";
  const isReady = conn.status === "ready";
  const connectedText = conn.phone ? conn.phone.replace(/^91/, "+91 ") : (conn.name || "Connected");
  const enabledCount = TYPES.filter((t) => types[t.key]?.auto_send).length;

  const insertVariable = (v) => {
    const current = types[selectedType];
    if (!current) return;
    const field = fieldForVariant(current.selected_template || "template_1");
    const existing = current[field] || "";
    
    // Insert at cursor if textarea is focused
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || existing.length;
      const end = textarea.selectionEnd || existing.length;
      const insertion = `[${v}]`;
      const nextText = existing.substring(0, start) + insertion + existing.substring(end);
      patchType(selectedType, { [field]: nextText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertion.length, start + insertion.length);
      }, 50);
    } else {
      patchType(selectedType, { [field]: existing + ` [${v}]` });
    }
  };

  const filteredTypes = useMemo(() => {
    return TYPES.filter((t) => {
      const matchCat = categoryFilter === "All" || 
        (categoryFilter === "Rewards & Due" ? (t.category === "Rewards" || t.category === "Recovery") : t.category === categoryFilter);
      const matchSearch = !searchQuery || 
        t.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [categoryFilter, searchQuery]);

  return (
    <SettingsShell
      title="Transaction Messages"
      subtitle="WHATSAPP AUTOMATION, DYNAMIC TEMPLATES & DISPATCH RULES"
      icon={<MessageSquareText size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="space-y-4 px-2 sm:px-4 md:px-5 py-3 sm:py-4 max-w-full"
      actions={
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${
            isReady 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${isReady ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="truncate max-w-[200px]">{isReady ? `Active: ${connectedText}` : "Offline"}</span>
          </div>
        </div>
      }
    >
      {/* ── 1. UNIFIED COMPACT GATEWAY & DISPATCH PARAMETERS BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          
          {/* Left: WhatsApp Gateway Status & Connect CTA */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${
              isReady ? "bg-emerald-600 text-white shadow-emerald-600/20" : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}>
              {isReady ? <CheckCheck size={20} /> : <Phone size={20} />}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-extrabold text-slate-900 tracking-tight">
                  WhatsApp Business Gateway
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
                  isReady 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {isReady ? connectedText : "Not Linked"}
                </span>
              </div>
              <p className="text-[11.5px] text-slate-400 mt-0.5 truncate">
                {isReady 
                  ? "Direct customer delivery active upon transaction completion" 
                  : "Scan QR code to connect company WhatsApp account"}
              </p>
            </div>

            {!isReady && (
              <button
                type="button"
                onClick={connectWhatsApp}
                disabled={connecting || conn.status === "initializing" || conn.status === "reconnecting"}
                className="ml-2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer flex-shrink-0 disabled:opacity-50"
              >
                {connecting ? <Loader2 size={13} className="animate-spin" /> : <QrCode size={13} />}
                <span>Link WhatsApp</span>
              </button>
            )}
          </div>

          {/* Right: Quick Compact Dispatch Parameters for Selected Type */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap bg-slate-50/80 p-2 sm:p-2.5 rounded-xl border border-slate-200/70 xl:self-center">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
              RULES:
            </span>

            <label className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer select-none">
              <span className="text-[11.5px] font-semibold text-slate-700">Send to Party</span>
              <Toggle
                checked={!!sel?.send_to_party}
                onChange={(v) => patchType(selectedType, { send_to_party: v })}
              />
            </label>

            <label className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer select-none">
              <span className="text-[11.5px] font-semibold text-slate-700">Party Balance</span>
              <Toggle
                checked={!!sel?.party_balance_in_msg}
                onChange={(v) => patchType(selectedType, { party_balance_in_msg: v })}
              />
            </label>

            <label className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer select-none">
              <span className="text-[11.5px] font-semibold text-slate-700">PDF Link</span>
              <Toggle
                checked={!!sel?.web_invoice_link_in_msg}
                onChange={(v) => patchType(selectedType, { web_invoice_link_in_msg: v })}
              />
            </label>

            <label className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer select-none">
              <span className="text-[11.5px] font-semibold text-slate-700">Copy to Self</span>
              <Toggle
                checked={!!sel?.send_copy_to_self}
                onChange={(v) => patchType(selectedType, { send_copy_to_self: v })}
              />
            </label>
          </div>
        </div>

        {/* QR Code Inline Scanner (when linking) */}
        {!isReady && conn.qr && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/60 animate-in fade-in duration-200">
            <div className="w-28 h-28 bg-white p-1.5 rounded-lg border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <img src={conn.qr} alt="Scan WhatsApp QR" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-0.5 text-center sm:text-left min-w-0">
              <div className="text-xs font-bold text-slate-900">Scan QR Code from your Mobile Device</div>
              <p className="text-[11px] text-slate-500 leading-snug">
                WhatsApp on phone → Settings / Menu → Linked Devices → Link a Device, and point camera here.
              </p>
              <div className="text-[10.5px] text-emerald-700 font-semibold pt-0.5">
                Auto-connecting as soon as scanned...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. MAIN 2-COLUMN DUAL-PANE INTERFACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* ── LEFT PANE: Transaction Types Directory (5 cols) ── */}
        <div className="lg:col-span-5 space-y-3">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Sliders size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Transaction Types
                  </h3>
                </div>
              </div>
              <Badge tone={enabledCount > 0 ? "blue" : "gray"}>
                {enabledCount} Auto-Send Active
              </Badge>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 paysplitx-scrollbar-light">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter vouchers..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Scrollable Transaction Cards List */}
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 paysplitx-scrollbar-light">
              {filteredTypes.map((t) => {
                const Icon = t.icon;
                const isSelected = selectedType === t.key;
                const isAutoSend = !!types[t.key]?.auto_send;
                const extra = EXTRA_FIELDS[t.key];

                return (
                  <div
                    key={t.key}
                    onClick={() => setSelectedType(t.key)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none relative ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-600 shadow-xs ring-1 ring-blue-500/30"
                        : "bg-white border-slate-200/80 hover:bg-slate-50/70 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                        }`}>
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                            <span>{t.label}</span>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {t.desc}
                          </div>
                        </div>
                      </div>

                      {/* Right: Auto-Send Switch */}
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className={`text-[9.5px] font-extrabold uppercase ${isAutoSend ? "text-blue-600" : "text-slate-400"}`}>
                          {isAutoSend ? "Auto" : "Manual"}
                        </span>
                        <Toggle
                          checked={isAutoSend}
                          onChange={(v) => patchType(t.key, { auto_send: v })}
                        />
                      </div>
                    </div>

                    {/* Extra input fields if active (Royalty / Credit Days) */}
                    {extra && isAutoSend && (
                      <div
                        className="mt-2 pt-1.5 border-t border-slate-200/60 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10.5px] font-semibold text-slate-600">{extra.label}:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={types[t.key]?.[extra.key] ?? ""}
                            onChange={(e) => patchType(t.key, { [extra.key]: e.target.value })}
                            placeholder={extra.placeholder}
                            className="w-16 px-1.5 py-0.5 border border-slate-200 rounded-md text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          />
                          <span className="text-[10px] text-slate-400 font-semibold">{extra.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANE: Template Editor & WhatsApp Chat Simulator (7 cols) ── */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Card A: Template Selection & Live Editor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    {TYPES_MAP[selectedType]} Template
                  </h3>
                  <Badge tone={activeVariant === "custom" ? "amber" : "blue"}>
                    {VARIANTS.find((v) => v.key === activeVariant)?.label || "Template 1"}
                  </Badge>
                </div>
              </div>

              {/* Template Variant Radio Pills */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
                {VARIANTS.map((v) => {
                  const isSelected = activeVariant === v.key;
                  return (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => patchType(selectedType, { selected_template: v.key })}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-blue-700 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Variable Chips Cloud */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  CLICK TO INSERT VARIABLES
                </span>
                <span className="text-[10px] text-slate-400">Inserts at cursor</span>
              </div>

              <div className="space-y-1.5 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/70">
                {VARIABLE_GROUPS.map((grp) => (
                  <div key={grp.category} className="flex flex-wrap items-center gap-1">
                    <span className="text-[9.5px] font-bold text-slate-400 uppercase w-20 flex-shrink-0">
                      {grp.category}:
                    </span>
                    {grp.items.map((it) => (
                      <button
                        key={it.tag}
                        type="button"
                        onClick={() => insertVariable(it.tag)}
                        title={it.desc}
                        className="text-[11px] font-mono font-bold text-blue-600 bg-white hover:bg-blue-50 border border-slate-200/90 hover:border-blue-300 rounded px-1.5 py-0.5 transition cursor-pointer shadow-2xs"
                      >
                        [{it.tag}]
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Rich Textarea Editor */}
            <div className="space-y-1.5">
              <textarea
                ref={textareaRef}
                value={activeMessage}
                onChange={(e) => patchType(selectedType, { [activeField]: e.target.value })}
                rows={7}
                placeholder="Compose your WhatsApp transaction message template..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 leading-relaxed resize-y shadow-inner"
              />

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{activeMessage.length} chars • {activeMessage.split(/\s+/).filter(Boolean).length} words</span>
                <div className="flex items-center gap-1.5">
                  {savedAt ? (
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                      <Check size={12} /> Auto-saved
                    </span>
                  ) : (
                    <span>Auto-saves as you type</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card B: Realistic WhatsApp Smartphone Preview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Smartphone size={15} className="text-emerald-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Live WhatsApp Preview
                </h3>
              </div>
              <span className="text-[10.5px] font-bold text-slate-400">
                Party View Simulation
              </span>
            </div>

            {/* Realistic WhatsApp Chat Device Frame */}
            <div className="rounded-xl overflow-hidden border border-slate-300 shadow-xs max-w-lg mx-auto bg-[#efeae2]">
              {/* WhatsApp App Bar Header */}
              <div className="bg-[#075e54] text-white px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold text-[11px] flex-shrink-0 border border-white/20">
                    {(previewCtx?.party_name || "SM")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      <span>{previewCtx?.party_name || "Sri Murugan Traders"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block flex-shrink-0" />
                    </div>
                    <div className="text-[9.5px] text-emerald-100/90 truncate">Online</div>
                  </div>
                </div>
                <div className="text-[9.5px] font-mono opacity-80 uppercase tracking-wider">
                  WhatsApp
                </div>
              </div>

              {/* Chat Canvas with Wallpaper Background */}
              <div 
                className="p-3 sm:p-4 min-h-[190px] flex flex-col justify-end"
                style={{
                  backgroundColor: "#efeae2",
                  backgroundImage: "radial-gradient(#d4ccc0 0.75px, transparent 0.75px)",
                  backgroundSize: "16px 16px"
                }}
              >
                {/* Date separator */}
                <div className="text-center mb-2">
                  <span className="bg-white/80 backdrop-blur-xs text-slate-600 text-[9.5px] font-bold px-2 py-0.5 rounded shadow-2xs">
                    TODAY
                  </span>
                </div>

                {/* WhatsApp Chat Bubble */}
                <div className="max-w-[92%] sm:max-w-[88%] ml-auto bg-[#d9fdd3] text-slate-900 rounded-xl rounded-tr-xs p-3 shadow-xs border border-[#c1e9bb] relative animate-in fade-in duration-200">
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-sans">
                    {sel ? renderPreview(activeMessage, previewCtx || {}, sel) : "No message template loaded."}
                  </p>
                  
                  {/* Message Timestamp & Blue Ticks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9.5px] text-slate-500">
                    <span>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    <CheckCheck size={13} className="text-[#53bdeb]" />
                  </div>
                </div>
              </div>

              {/* Chat Input Dummy Bar */}
              <div className="bg-[#f0f2f5] px-3 py-1.5 border-t border-slate-200 flex items-center gap-2 text-slate-400 text-xs">
                <div className="flex-1 bg-white rounded-full px-3 py-1 text-[10.5px] text-slate-400 shadow-inner">
                  Message
                </div>
                <div className="w-6 h-6 rounded-full bg-[#00a884] text-white flex items-center justify-center">
                  <Send size={11} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Toast Notifications ── */}
      <div className="fixed bottom-6 right-6 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3.5 py-2 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
              t.ok ? "bg-slate-900 border border-slate-700" : "bg-rose-600"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${t.ok ? "bg-emerald-400" : "bg-white"}`} />
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}