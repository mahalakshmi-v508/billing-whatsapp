import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageSquareText,
  QrCode,
  Loader2,
  Check,
  Send,
  ShieldAlert,
  Info,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "./settingsApi";
import { useSettings } from "./SettingsContext";
import { SettingsShell, SettingsCard, CheckRow, Badge, InfoIcon } from "./settingsUI";

const TYPES = [
  { key: "sales", label: "Sales" },
  { key: "purchase", label: "Purchase" },
  { key: "sales_return", label: "Sales Return" },
  { key: "purchase_return", label: "Purchase Return" },
  { key: "payment_in", label: "Payment In" },
  { key: "payment_out", label: "Payment Out" },
  { key: "sale_order", label: "Sale Order" },
  { key: "purchase_order", label: "Purchase Order" },
  { key: "estimate", label: "Estimate" },
  { key: "proforma_invoice", label: "Proforma Invoice" },
  { key: "delivery_challan", label: "Delivery Challan" },
  { key: "cancelled_invoice", label: "Cancelled Invoice" },
  { key: "expense", label: "Expense" },
  { key: "sale_fa", label: "Sale FA" },
  { key: "purchase_fa", label: "Purchase FA" },
];

const TYPES_MAP = Object.fromEntries(TYPES.map((t) => [t.key, t.label]));

const VARIABLES = [
  "Firm_Name",
  "Party_Name",
  "Transaction_Type",
  "Invoice_Number",
  "Invoice_Amount",
  "Transaction_Balance",
  "Payment_Amount",
  "Payment_Mode",
  "Invoice_Link",
  "Payment_Link",
];

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
    "[Firm_Name]": ctx.firm_name,
    "[Party_Name]": ctx.party_name,
    "[Transaction_Type]": ctx.transaction_type,
    "[Invoice_Number]": ctx.txn_no,
    "[Invoice_Amount]": ctx.invoice_amount,
    "[Transaction_Balance]": ctx.transaction_balance,
    "[Payment_Amount]": ctx.payment_amount,
    "[Payment_Mode]": ctx.payment_mode,
    "[Invoice_Link]": ctx.invoice_link,
    "[Payment_Link]": ctx.payment_link,
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
  const [previewCtx, setPreviewCtx] = useState(null);
  const [firm, setFirm] = useState({ name: "", phone: "" });
  const [loaded, setLoaded] = useState(false);

  // connection (reuses the existing WhatsApp connection + /whatsapp/connect flow)
  const [conn, setConn] = useState({ status: "disconnected", qr: null, phone: null, name: null });
  const [connecting, setConnecting] = useState(false);

  // save feedback
  const [savedAt, setSavedAt] = useState(null);
  const [toasts, setToasts] = useState([]);
  const saveTimer = useRef(null);

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

  // ── live connection status polling (same loop as the WhatsApp page) ──
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const connectWhatsApp = async () => {
    setConnecting(true);
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
  const isReady = conn.status === "ready";
  const connectedText = conn.phone ? conn.phone.replace(/^91/, "") : (conn.name || "");
  const enabledCount = TYPES.filter((t) => types[t.key]?.auto_send).length;

  const insertVariable = (v) => {
    const current = types[selectedType];
    if (!current) return;
    patchType(selectedType, { template: (current.template || "") + ` [${v}]` });
  };

  return (
    <SettingsShell
      title="Transaction Message"
      subtitle="WHATSAPP MESSAGE SETTINGS"
      icon={<MessageSquareText size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="max-w-[1240px]"
    >
      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── LEFT ── */}
        <div className="lg:col-span-3 space-y-5">
          {/* SEND VIA WHATSAPP */}
          <SettingsCard title="Send via WhatsApp" badge={<Badge tone={isReady ? "green" : "red"}>{isReady ? "Connected" : (conn.status === "disconnected" ? "Not connected" : "Connecting…")}</Badge>}>
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/60 cursor-pointer select-none">
                <input
                  type="radio"
                  name="send_via"
                  className="mt-0.5 accent-blue-600"
                  checked={(sel?.send_via || "personal_whatsapp") === "personal_whatsapp"}
                  onChange={() => patchType(selectedType, { send_via: "personal_whatsapp" })}
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-slate-800">Send via Personal WhatsApp</span>
                  <span className="block text-[12px] text-slate-500 mt-0.5 leading-relaxed">
                    Uses this company's WhatsApp connection to deliver transaction messages.
                  </span>
                  <span className="flex flex-wrap items-center gap-2 mt-2">
                    {isReady ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {connectedText}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
                        <ShieldAlert size={13} />
                        Not connected
                      </span>
                    )}
                  </span>
                </span>
              </label>

              {!isReady && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <QrCode size={15} className="text-blue-500" /> Connect WhatsApp to enable sending
                    </p>
                    <p className="text-[12px] text-slate-500 mt-1">
                      {conn.status === "reconnecting" || conn.status === "initializing"
                        ? "Reconnecting to your WhatsApp account..."
                        : "Scan the QR code with your phone's WhatsApp."}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={connectWhatsApp}
                        disabled={connecting || conn.status === "initializing" || conn.status === "reconnecting"}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
                        Connect WhatsApp
                      </button>
                      {conn.status === "ready" ? null : (
                        <span className="text-[12px] text-slate-400 self-center">
                          status: {conn.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {conn.qr && (
                    <div
                      className="w-[190px] h-[190px] rounded-xl border-2 border-dashed border-slate-300 overflow-hidden bg-white flex items-center justify-center"
                    >
                      <img src={conn.qr} alt="WhatsApp QR" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </SettingsCard>

          {/* RECIPIENT SETTINGS */}
          <SettingsCard title="Message Recipient Settings">
            <CheckRow
              label="Send Message to Party"
              info="Send the transaction message to the customer / supplier on WhatsApp."
              extra={<Badge tone="blue">Important</Badge>}
              checked={!!sel?.send_to_party}
              onChange={(v) => patchType(selectedType, { send_to_party: v })}
            />
            <CheckRow
              label="Send Transaction Update Message"
              info="Also send the message to you (your business WhatsApp number)."
              checked={!!sel?.send_transaction_update}
              onChange={(v) => patchType(selectedType, { send_transaction_update: v })}
            />
            <CheckRow
              label="Send Message Copy to Self"
              info="Send a copy of the message to your own WhatsApp number."
              checked={!!sel?.send_copy_to_self}
              onChange={(v) => patchType(selectedType, { send_copy_to_self: v })}
            />
          </SettingsCard>

          {/* CONTENT SETTINGS */}
          <SettingsCard title="Message Content Settings">
            <CheckRow
              label="Party Current Balance in Message"
              info="Include the remaining balance for the transaction ([Transaction_Balance])."
              checked={!!sel?.party_balance_in_msg}
              onChange={(v) => patchType(selectedType, { party_balance_in_msg: v })}
            />
            <CheckRow
              label="Web invoice link in Message"
              info="Include a link to the web invoice ([Invoice_Link])."
              checked={!!sel?.web_invoice_link_in_msg}
              onChange={(v) => patchType(selectedType, { web_invoice_link_in_msg: v })}
            />
            <CheckRow
              label="Send payment link in Message"
              info="Include a payment link ([Payment_Link]). Payment links are not available yet — the line is automatically hidden."
              checked={!!sel?.payment_link_in_msg}
              onChange={(v) => patchType(selectedType, { payment_link_in_msg: v })}
            />
            <p className="text-[12px] text-slate-400 px-2 pt-1">
              Selected transaction type: <span className="font-semibold text-slate-600">{TYPES_MAP[selectedType]}</span>
            </p>
          </SettingsCard>

          {/* AUTO SEND PER TYPE */}
          <SettingsCard
            title="Send Automatic Message for"
            badge={<Badge tone={enabledCount > 0 ? "blue" : "gray"}>{enabledCount} enabled</Badge>}
          >
            <p className="text-[12.5px] text-slate-500 mb-2">
              Turn ON auto-send for the transactions that should message the party automatically after completion.
              Turning this OFF never disables the WhatsApp icon on the transaction itself.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-4">
              {TYPES.map((t) => {
                const on = !!types[t.key]?.auto_send;
                return (
                  <label
                    key={t.key}
                    onClick={() => setSelectedType(t.key)}
                    className={`flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg cursor-pointer select-none transition-colors ${
                      selectedType === t.key ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`text-[13px] ${selectedType === t.key ? "text-blue-700 font-semibold" : "text-slate-700"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.label}
                    </span>
                    <span
                      role="switch"
                      aria-checked={on}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchType(t.key, { auto_send: !on });
                      }}
                      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${
                        on ? "bg-blue-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          on ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </SettingsCard>
        </div>

        {/* ── RIGHT ── */}
        <div className="lg:col-span-2 space-y-5">
          <SettingsCard title="Select Transaction Type">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-[13.5px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            {sel?.template ? (
              <p className="text-[12px] text-slate-400 mt-2 flex items-center gap-1">
                <Info size={13} className="text-blue-400" />
                Editing the <span className="font-semibold">{TYPES_MAP[selectedType]}</span> message template.
              </p>
            ) : null}
          </SettingsCard>

          <SettingsCard title="Edit Message">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-full px-2 py-0.5 transition"
                >
                  [{v}]
                </button>
              ))}
            </div>
            <textarea
              value={sel?.template || ""}
              onChange={(e) => patchType(selectedType, { template: e.target.value })}
              rows={12}
              placeholder="Write your transaction message. Click a variable above to insert it."
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[11.5px] text-slate-400">Saved automatically as you type.</p>
              {savedAt ? (
                <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-emerald-600">
                  <Check size={13} /> Saved
                </span>
              ) : null}
            </div>
          </SettingsCard>

          <SettingsCard title="Message Preview">
            <div className="rounded-2xl bg-[#eef2f7] p-3">
              <div className="max-w-[85%] ml-auto bg-[#dcf8c6] rounded-2xl rounded-tr-sm px-3.5 py-2.5 shadow-sm">
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-slate-800">
                  {sel ? renderPreview(sel.template, previewCtx || {}, sel) : ""}
                </p>
                <p className="text-[10px] text-slate-500 text-right mt-1.5">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <p className="text-[12px] text-slate-400 mt-2 flex items-center gap-1">
              <Send size={12} className="text-blue-400" />
              Preview uses your latest {TYPES_MAP[selectedType]} transaction
              {previewCtx?.example ? (
                <span className="text-amber-500 font-medium"> (example data — no transaction yet)</span>
              ) : (
                <span> — {previewCtx?.party_name || "your party"}</span>
              )}
            </p>
          </SettingsCard>
        </div>
      </div>

      {/* toasts */}
      <div className="fixed bottom-6 right-6 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl shadow-lg text-[13px] font-medium text-white ${
              t.ok ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}