import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import {
  Search,
  MessageCircle,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Send as SendIcon,
  Phone,
  ChevronLeft,
  MessageSquareText,
  Unplug,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Settings,
  X,
  Paperclip,
  Image as ImageIcon,
  User,
  PlugZap,
} from "lucide-react";

// ── delivery indicators (real status from DB via ack events) ──
function Ticks({ status }) {
  if (status === "read") return <CheckCheck size={15} color="#53bdeb" />;
  if (status === "delivered") return <CheckCheck size={15} color="#8696a0" />;
  if (status === "sent") return <Check size={14} color="#8696a0" />;
  return <Clock size={12} color="#8696a0" />;
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d)) return String(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

function dayLabel(ts) {
  const d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d)) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function shortTime(ts) {
  const label = dayLabel(ts);
  if (label === "Today") return formatTime(ts);
  if (label === "Yesterday") return "Yesterday";
  const d = new Date(String(ts).replace(" ", "T"));
  if (isNaN(d)) return "";
  return d.toLocaleDateString([], { day: "2-digit", month: "short" });
}

const previewIcon = (m) => {
  if (!m) return "";
  if (m.message_type === "document") return "📄 ";
  if (m.message_type === "image") return "📷 ";
  return "";
};

export default function WhatsAppChat() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(localStorage.getItem("selected_company_id") || "");
  // connection state: null = unknown, else 'disconnected' | 'qr_ready' | 'authenticated' | 'ready' ...
  const [connState, setConnState] = useState(null);
  const [qr, setQr] = useState(null);
  const [waPhone, setWaPhone] = useState(null);
  const [waName, setWaName] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const [chats, setChats] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState(null);

  const bottomRef = useRef(null);
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const connected = connState === "ready";

  // ── companies ──
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    api
      .get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (!savedId && res.data.data.length === 1) {
            setCompanyId(res.data.data[0].id);
            localStorage.setItem("selected_company_id", res.data.data[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  // ── connection status polling (drives QR vs chat view) ──
  useEffect(() => {
    if (!companyId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.get(`/whatsapp/connect_status?company_id=${companyId}`);
        if (!cancelled && res.data.status) {
          const st = res.data.data?.status || "disconnected";
          setConnState(st);
          setQr(res.data.data?.qr || null);
          setWaPhone(res.data.data?.phone || null);
          setWaName(res.data.data?.name || null);
        }
      } catch (err) {
        if (!cancelled) {
          setConnState(null);
          setWaPhone(null);
          setWaName(null);
        }
      }
    };

    load();
    const t = setInterval(load, connected ? 5000 : 2500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [companyId, connected]);

  // ── contact list polling ──
  const loadChats = async () => {
    if (!companyId || !connected) return;
    try {
      const res = await api.get(`/whatsapp/chats?company_id=${companyId}`);
      if (res.data.status) setChats(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!companyId || !connected) {
      setChats([]);
      return;
    }
    loadChats();
    const t = setInterval(loadChats, 5000);
    return () => clearInterval(t);
  }, [companyId, connected]);

  // ── selected conversation ──
  const loadMessages = async (phone) => {
    if (!companyId || !phone) return;
    try {
      const res = await api.get(`/whatsapp/messages?company_id=${companyId}&phone=${phone}`);
      if (res.data.status) setMessages(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markRead = async (phone) => {
    try {
      await api.post("/whatsapp/mark_read", { company_id: companyId, phone });
      setChats((prev) => prev.map((c) => (c.phone === phone ? { ...c, unread: 0 } : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const selectContact = (chat) => {
    setSelectedPhone(chat.phone);
    setMessages([]);
    markRead(chat.phone);
    loadMessages(chat.phone);
  };

  useEffect(() => {
    if (!selectedPhone) return;
    const t = setInterval(() => loadMessages(selectedPhone), 3000);
    return () => clearInterval(t);
  }, [selectedPhone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── connect / disconnect ──
  const connectWhatsApp = async () => {
    if (!companyId) {
      showToast("Please select a company first", false);
      return;
    }

    setConnecting(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.post("/whatsapp/connect", {
        company_id: companyId,
        user_id: user?.id,
      });
      showToast(res.data.message || "Generating QR code...");
    } catch (err) {
      showToast(err.response?.data?.message || "WhatsApp service is not reachable", false);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!window.confirm("Disconnect WhatsApp? You will need to scan the QR code again.")) return;

    setDisconnecting(true);
    try {
      const res = await api.post("/whatsapp/disconnect", { company_id: companyId });
      if (res.data.status) {
        showToast(res.data.message || "WhatsApp disconnected");
        setDrawerOpen(false);
        setSelectedPhone(null);
        setMessages([]);
        setChats([]);
        setQr(null);
        setConnState("disconnected");
      } else {
        showToast(res.data.message || "Failed to disconnect", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to disconnect", false);
    } finally {
      setDisconnecting(false);
    }
  };

  // ── send text message ──
  const sendDraft = async () => {
    const text = draft.trim();
    if (!text || !selectedPhone || sending) return;

    setSending(true);
    try {
      const res = await api.post("/whatsapp/send_message", {
        company_id: companyId,
        phone: selectedPhone,
        message: text,
      });

      if (res.data.status) {
        setDraft("");
        await loadMessages(selectedPhone);
        await loadChats();
      } else {
        showToast(res.data.message || "Failed to send", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to send", false);
    } finally {
      setSending(false);
    }
  };

  // ── send file (document / photo) through real WhatsApp ──
  const handleFilePick = (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedPhone) return;

    if (file.size > 16 * 1024 * 1024) {
      showToast("File too large (max 16 MB)", false);
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = String(reader.result).split(",")[1];
        const res = await api.post("/whatsapp/send_file", {
          company_id: companyId,
          phone: selectedPhone,
          file_base64: base64,
          mimetype: file.type || "application/octet-stream",
          filename: file.name,
          caption: "",
        });

        if (res.data.status) {
          showToast(kind === "image" ? "Photo sent" : "Document sent");
          await loadMessages(selectedPhone);
          await loadChats();
        } else {
          showToast(res.data.message || "Failed to send file", false);
        }
      } catch (err) {
        showToast(err.response?.data?.message || "Failed to send file", false);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      showToast("Could not read file", false);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setCompanyId(id);
    setSelectedPhone(null);
    setMessages([]);
    setChats([]);
    setConnState(null);
    setQr(null);
    setWaPhone(null);
    setWaName(null);
    localStorage.setItem("selected_company_id", id);
  };

  const filteredChats = chats.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  const selectedMeta = chats.find((c) => c.phone === selectedPhone) || null;
  const avatarLetter = (name) => (name || "?").trim().charAt(0).toUpperCase();

  const CompanySelect = ({ className }) => (
    <select className={className} value={companyId} onChange={handleCompanyChange}>
      <option value="">Select Company</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.company_name}
        </option>
      ))}
    </select>
  );

  // ── render helpers ──
  const renderBubble = (m) => {
    const out = m.direction === "outgoing";

    return (
      <div key={m.id} className={`wc-row ${out ? "wc-out" : "wc-in"}`}>
        <div className={`wc-bubble ${out ? "wc-bubble-out" : ""}`}>
          {m.type === "document" && m.invoice ? (
            <div className="wc-doc">
              <div className="wc-doc-card">
                <div className="wc-doc-icon">
                  <FileText size={22} />
                </div>
                <div className="wc-doc-info">
                  <div className="wc-doc-name">{m.invoice.invoice_no}</div>
                  <div className="wc-doc-sub">
                    {m.invoice.total_amount !== undefined && m.invoice.total_amount !== null
                      ? `${inr(m.invoice.total_amount)}`
                      : "Invoice"}
                    {m.invoice.payment_status ? ` · ${m.invoice.payment_status}` : ""}
                  </div>
                </div>
              </div>
              {(m.invoice.due_date || m.invoice.balance_amount !== undefined) && (
                <div className="wc-doc-meta">
                  {m.invoice.balance_amount > 0 && m.invoice.due_date
                    ? `Due ${m.invoice.due_date}`
                    : ""}
                </div>
              )}
            </div>
          ) : m.type === "image" ? (
            <div className="wc-img-card">
              <div className="wc-img-thumb">
                <ImageIcon size={26} />
              </div>
              <div className="wc-img-name">{m.filename || "Photo"}</div>
            </div>
          ) : m.type === "document" ? (
            <div className="wc-doc">
              <div className="wc-doc-card">
                <div className="wc-doc-icon">
                  <FileText size={22} />
                </div>
                <div className="wc-doc-info">
                  <div className="wc-doc-name">{m.filename || "Document"}</div>
                  <div className="wc-doc-sub">PDF · Document</div>
                </div>
              </div>
            </div>
          ) : null}
          {m.text ? <div className="wc-text">{m.text}</div> : null}
          <div className="wc-meta">
            <span>{formatTime(m.time)}</span>
            {out && <Ticks status={m.status} />}
          </div>
        </div>
      </div>
    );
  };

  const renderConversation = () => {
    const groups = [];
    let lastDay = null;
    messages.forEach((m) => {
      const day = dayLabel(m.time);
      if (day !== lastDay) {
        groups.push({ type: "day", label: day, key: `d-${m.id}` });
        lastDay = day;
      }
      groups.push({ type: "msg", data: m, key: `m-${m.id}` });
    });

    return groups.map((g) =>
      g.type === "day" ? (
        <div key={g.key} className="wc-day">
          <span>{g.label}</span>
        </div>
      ) : (
        renderBubble(g.data)
      )
    );
  };

  const inr = (v) =>
    v === null || v === undefined || v === ""
      ? ""
      : "₹" + Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="wa-page">
      <style>{`
        .wa-page { padding: 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; height: calc(100vh - 32px); display: flex; flex-direction: column; box-sizing: border-box; }
        .wa-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 700; margin-bottom: 16px; }
        .wa-title-icon { width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #25d366, #128c7e); display: flex; align-items: center; justify-content: center; color: #fff; }
        .wa-select { padding: 9px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: #fff; font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; min-width: 220px; outline: none; }

        .wa-shell { flex: 1; min-height: 0; display: grid; grid-template-columns: 360px 1fr; background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); overflow: hidden; position: relative; }
        @media (max-width: 1024px) { .wa-shell { grid-template-columns: 300px 1fr; } }

        /* LEFT PANEL */
        .wc-left { border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; min-height: 0; background: #fff; position: relative; z-index: 1; }
        .wc-search-box { padding: 12px; border-bottom: 1px solid #f1f5f9; position: relative; display: flex; align-items: center; gap: 8px; }
        .wc-search { width: 100%; padding: 10px 14px 10px 38px; border-radius: 12px; border: 1.5px solid #e2e8f0; font-size: 13.5px; outline: none; background: #f8fafc; box-sizing: border-box; font-family: inherit; }
        .wc-search:focus { border-color: #25d366; background: #fff; }
        .wc-gear-btn { width: 38px; height: 38px; min-width: 38px; border-radius: 10px; border: none; background: #f1f5f9; color: #475569; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease; }
        .wc-gear-btn:hover { background: #dcfce7; color: #128c7e; }
        .wc-search-icon { position: absolute; left: 24px; top: 50%; transform: translateY(-42%); color: #94a3b8; }
        .wc-list { flex: 1; overflow-y: auto; min-height: 0; }
        .wc-contact { display: flex; gap: 12px; padding: 12px 14px; cursor: pointer; align-items: center; border-bottom: 1px solid #f8fafc; transition: background 0.15s ease; }
        .wc-contact:hover { background: #f4fdf7; }
        .wc-contact.active { background: #dcfce7; }
        .wc-avatar { width: 44px; height: 44px; min-width: 44px; border-radius: 50%; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-weight: 700; font-size: 17px; display: flex; align-items: center; justify-content: center; }
        .wc-c-main { flex: 1; min-width: 0; }
        .wc-c-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        .wc-c-name { font-size: 14.5px; font-weight: 700; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wc-c-time { font-size: 11px; color: #8696a0; white-space: nowrap; }
        .wc-c-bottom { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 3px; }
        .wc-c-preview { font-size: 12.5px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wc-unread { min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px; background: #25d366; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .wc-list-empty { padding: 40px 20px; text-align: center; color: #8696a0; font-size: 13px; white-space: pre-line; line-height: 1.7; }

        /* RIGHT PANEL */
        .wc-right { display: flex; flex-direction: column; min-height: 0; background: #efeae2; }
        .wc-chat-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #f0f2f5; border-bottom: 1px solid #e2e8f0; }
        .wc-chat-head-avatar { width: 40px; height: 40px; min-width: 40px; border-radius: 50%; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .wc-chat-head-name { font-size: 15px; font-weight: 700; color: #111b21; line-height: 1.2; }
        .wc-chat-head-sub { font-size: 12px; color: #667781; display: flex; align-items: center; gap: 6px; }
        .wc-conn-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .wc-messages { flex: 1; overflow-y: auto; padding: 18px 22px 10px; background-image: radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px); background-size: 18px 18px; }
        .wc-day { text-align: center; margin: 10px 0 14px; }
        .wc-day span { background: rgba(255,255,255,0.85); color: #54656f; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 8px; }
        .wc-row { display: flex; margin-bottom: 8px; }
        .wc-out { justify-content: flex-end; }
        .wc-in { justify-content: flex-start; }
        .wc-bubble { max-width: 68%; border-radius: 10px; padding: 7px 9px 5px; box-shadow: 0 1px 1px rgba(11,20,26,0.13); background: #ffffff; }
        .wc-bubble-out { background: #d9fdd3; border-top-right-radius: 2px; }
        .wc-bubble:not(.wc-bubble-out) { border-top-left-radius: 2px; }
        .wc-text { font-size: 13.8px; color: #111b21; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }
        .wc-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 10.5px; color: #667781; margin-top: 3px; }

        .wc-doc-card { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.05); border-radius: 9px; padding: 9px 11px; min-width: 210px; }
        .wc-doc-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 9px; background: #fff; color: #b91c1c; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px #e2e8f0; }
        .wc-doc-info { min-width: 0; }
        .wc-doc-name { font-size: 13.5px; font-weight: 700; color: #111b21; word-break: break-all; }
        .wc-doc-sub { font-size: 12px; color: #54656f; margin-top: 1px; }
        .wc-doc-meta { font-size: 11.5px; color: #54656f; margin-top: 5px; }
        .wc-img-card { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.05); border-radius: 9px; padding: 9px 11px; min-width: 180px; }
        .wc-img-thumb { width: 44px; height: 44px; min-width: 44px; border-radius: 9px; background: #fff; color: #0369a1; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px #e2e8f0; }
        .wc-img-name { font-size: 12.5px; font-weight: 600; color: #111b21; word-break: break-all; }

        .wc-inputbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f0f2f5; border-top: 1px solid #e2e8f0; }
        .wc-attach-btn { width: 40px; height: 40px; min-width: 40px; border-radius: 50%; border: none; background: transparent; color: #54656f; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease; }
        .wc-attach-btn:hover { background: #e2e8f0; }
        .wc-attach-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .wc-input { flex: 1; padding: 12px 16px; border-radius: 999px; border: 1px solid #e2e8f0; font-size: 14px; outline: none; font-family: inherit; background: #fff; }
        .wc-input:focus { border-color: #25d366; }
        .wc-send-btn { width: 44px; height: 44px; min-width: 44px; border-radius: 50%; border: none; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 8px rgba(18,140,126,0.35); }
        .wc-send-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .wc-uploading { font-size: 11.5px; color: #128c7e; font-weight: 600; white-space: nowrap; }

        /* EMPTY STATES */
        .wa-empty-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #8696a0; text-align: center; padding: 30px; background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(15,23,42,0.08); }
        .wc-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; color: #8696a0; text-align: center; padding: 30px; }
        .wc-empty-icon { width: 84px; height: 84px; border-radius: 50%; background: #f0fdf4; color: #25d366; display: flex; align-items: center; justify-content: center; }
        .wc-empty h3 { margin: 0; font-size: 17px; color: #41544d; }
        .wc-empty p { margin: 0; font-size: 13px; max-width: 340px; line-height: 1.6; }

        /* SETTINGS DRAWER (slides from left over interface) */
        .wc-drawer-backdrop { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.45); z-index: 10; animation: wc-fade-in 0.2s ease; }
        @keyframes wc-fade-in { from { opacity: 0; } to { opacity: 1; } }
        .wc-drawer { position: absolute; left: 0; top: 0; bottom: 0; width: 340px; max-width: 85%; background: #fff; z-index: 11; box-shadow: 8px 0 30px rgba(15,23,42,0.25); transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); display: flex; flex-direction: column; }
        .wc-drawer.open { transform: translateX(0); }
        .wc-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #f1f5f9; }
        .wc-drawer-title { font-size: 16px; font-weight: 700; color: #111b21; display: flex; align-items: center; gap: 8px; }
        .wc-drawer-close { border: none; background: transparent; color: #64748b; cursor: pointer; padding: 6px; border-radius: 8px; display: flex; }
        .wc-drawer-close:hover { background: #f1f5f9; }
        .wc-drawer-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 18px; }
        .wc-drawer-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; margin-bottom: 8px; }
        .wc-drawer-select { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #334155; outline: none; box-sizing: border-box; font-family: inherit; }
        .wc-status-card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: #f8fafc; }
        .wc-status-row { display: flex; align-items: center; gap: 10px; }
        .wc-status-icon { width: 34px; height: 34px; min-width: 34px; border-radius: 10px; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; }
        .wc-status-label { font-size: 10.5px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .wc-status-value { font-size: 13.5px; font-weight: 700; color: #1e293b; word-break: break-all; }
        .wc-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; width: fit-content; }
        .wc-badge.ok { background: #dcfce7; color: #15803d; }
        .wc-badge.off { background: #fee2e2; color: #b91c1c; }
        .wc-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .wc-disconnect-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border: none; border-radius: 12px; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(239, 68, 68, 0.3); }
        .wc-disconnect-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* CONNECT VIEW (QR) */
        .wa-connect-wrap { flex: 1; min-height: 0; overflow-y: auto; display: flex; align-items: center; justify-content: center; padding: 10px; }
        .wa-card { width: 100%; max-width: 860px; background: #fff; border-radius: 20px; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08); overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 768px) { .wa-card { grid-template-columns: 1fr; } }
        .wa-brand { background: linear-gradient(160deg, #f0fdf4, #dcfce7); padding: 40px 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 16px; }
        .wa-brand-icon { width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, #25d366, #128c7e); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35); }
        .wa-brand h2 { margin: 0; font-size: 21px; font-weight: 700; color: #14532d; }
        .wa-brand p { margin: 0; font-size: 13px; line-height: 1.65; color: #3f6212; }
        .wa-connect { padding: 32px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 16px; }
        .wa-connect h2 { margin: 0; font-size: 17px; font-weight: 700; }
        .wa-qr-box { width: 230px; height: 230px; border-radius: 16px; border: 2px dashed #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8fafc; }
        .wa-qr-box img { width: 100%; height: 100%; object-fit: contain; }
        .wa-qr-placeholder { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #94a3b8; font-size: 13px; font-weight: 600; }
        .wa-steps { display: flex; flex-direction: column; gap: 8px; text-align: left; width: 100%; max-width: 270px; }
        .wa-step-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #475569; }
        .wa-step-num { width: 22px; height: 22px; min-width: 22px; border-radius: 50%; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
        .wa-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 26px; border: none; border-radius: 12px; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 14px rgba(18, 140, 126, 0.35); }
        .wa-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .wa-spin { animation: wa-rotate 1s linear infinite; color: #128c7e; }
        @keyframes wa-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wa-status-text { font-size: 13px; color: #64748b; font-weight: 600; }

        .wc-toast { position: fixed; bottom: 24px; right: 24px; z-index: 9999; padding: 12px 20px; border-radius: 12px; color: #fff; font-size: 13.5px; font-weight: 600; box-shadow: 0 8px 24px rgba(15,23,42,0.25); }
        .wc-toast.ok { background: #16a34a; }
        .wc-toast.err { background: #dc2626; }

        @media (max-width: 900px) {
          .wa-shell { grid-template-columns: 1fr; }
          .wc-left { display: ${selectedPhone && connected ? "none" : "flex"}; }
          .wc-right { display: ${selectedPhone && connected ? "flex" : "none"}; }
          .wc-back { display: inline-flex !important; }
        }
        .wc-back { display: none; border: none; background: transparent; color: #54656f; cursor: pointer; padding: 4px; }
      `}</style>

      {/* TITLE BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div className="wa-title">
          <div className="wa-title-icon">
            <MessageSquareText size={22} />
          </div>
          WhatsApp
        </div>
      </div>

      {!companyId ? (
        <div className="wa-empty-center">
          <div className="wc-empty-icon"><User size={40} /></div>
          <h3>Select your company</h3>
          <p>Open the settings panel and choose a company<br />to load its WhatsApp account.</p>
          <button className="wa-btn" onClick={() => setDrawerOpen(true)}>
            <Settings size={15} /> Open Settings
          </button>
        </div>
      ) : !connected ? (
        /* ══════════ DISCONNECTED → CONNECTION / QR UI ══════════ */
        <div className="wa-connect-wrap">
          <div className="wa-card">
            <div className="wa-brand">
              <div className="wa-brand-icon">
                <MessageCircle size={40} />
              </div>
              <h2>WhatsApp as Usual</h2>
              <p>
                Connect your existing WhatsApp account and start chatting with
                customers, sending invoices, documents and photos — all from
                your billing software.
              </p>
            </div>

            <div className="wa-connect">
              {connState === "authenticated" ? (
                <>
                  <Loader2 size={34} className="wa-spin" />
                  <h2>Almost there…</h2>
                  <div className="wa-status-text">Syncing your WhatsApp account…</div>
                </>
              ) : connState === "initializing" ? (
                <>
                  <Loader2 size={34} className="wa-spin" />
                  <h2>Starting…</h2>
                  <div className="wa-status-text">Launching WhatsApp service…</div>
                </>
              ) : (
                <>
                  <h2>Scan this QR code</h2>
                  <div className="wa-qr-box">
                    {qr ? (
                      <img src={qr} alt="WhatsApp QR" />
                    ) : (
                      <div className="wa-qr-placeholder">
                        {connecting || connState === "qr_ready" ? (
                          <>
                            <Loader2 size={28} />
                            Generating QR…
                          </>
                        ) : (
                          <>
                            <QrCode size={34} />
                            Click Connect to start
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="wa-steps">
                    <div className="wa-step-row"><span className="wa-step-num">1</span> Open WhatsApp on your mobile phone</div>
                    <div className="wa-step-row"><span className="wa-step-num">2</span> Tap ⋮ → Linked Devices</div>
                    <div className="wa-step-row"><span className="wa-step-num">3</span> Tap Link a Device</div>
                    <div className="wa-step-row"><span className="wa-step-num">4</span> Scan this QR code</div>
                  </div>

                  {!qr && (
                    <button className="wa-btn" onClick={connectWhatsApp} disabled={connecting}>
                      {connecting ? (
                        <><Loader2 size={16} /> Connecting…</>
                      ) : (
                        <><PlugZap size={16} /> Connect WhatsApp</>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════ CONNECTED → REAL CHAT INTERFACE ══════════ */
        <div className="wa-shell">
          {/* LEFT: REAL CONTACTS */}
          <div className="wc-left">
            <div className="wc-search-box">
              <Search size={15} className="wc-search-icon" />
              <input
                className="wc-search"
                placeholder="Search name or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                className="wc-gear-btn"
                title="WhatsApp Settings"
                onClick={() => setDrawerOpen(true)}
              >
                <Settings size={18} />
              </button>
            </div>
            <div className="wc-list">
              {filteredChats.length === 0 ? (
                <div className="wc-list-empty">
                  {chats.length === 0
                    ? "No conversations yet.\n\nContacts appear here automatically once you exchange messages or send an invoice via WhatsApp."
                    : "No matching contacts."}
                </div>
              ) : (
                filteredChats.map((c) => (
                  <div
                    key={c.phone}
                    className={`wc-contact ${selectedPhone === c.phone ? "active" : ""}`}
                    onClick={() => selectContact(c)}
                  >
                    <div className="wc-avatar">{avatarLetter(c.name)}</div>
                    <div className="wc-c-main">
                      <div className="wc-c-top">
                        <span className="wc-c-name">{c.name}</span>
                        <span className="wc-c-time">{shortTime(c.last_time)}</span>
                      </div>
                      <div className="wc-c-bottom">
                        <span className="wc-c-preview">
                          {previewIcon({ message_type: c.last_type })}
                          {c.preview}
                        </span>
                        {c.unread > 0 && <span className="wc-unread">{c.unread}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: CONVERSATION */}
          <div className="wc-right">
            {!selectedPhone ? (
              <div className="wc-empty">
                <div className="wc-empty-icon"><MessageSquareText size={40} /></div>
                <h3>Select a contact</h3>
                <p>Pick a customer from the list to view their real WhatsApp history.</p>
              </div>
            ) : (
              <>
                <div className="wc-chat-head">
                  <button className="wc-back" onClick={() => setSelectedPhone(null)}>
                    <ChevronLeft size={22} />
                  </button>
                  <div className="wc-chat-head-avatar">{avatarLetter(selectedMeta?.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wc-chat-head-name">{selectedMeta?.name || selectedPhone}</div>
                    <div className="wc-chat-head-sub">
                      <Phone size={11} />
                      +{selectedPhone.replace(/^91(?=\d{10}$)/, "")}
                    </div>
                  </div>
                  <button
                    className="wc-gear-btn"
                    title="WhatsApp Settings"
                    onClick={() => setDrawerOpen(true)}
                  >
                    <Settings size={18} />
                  </button>
                </div>

                <div className="wc-messages">
                  {messages.length === 0 ? (
                    <div className="wc-list-empty">No messages yet.</div>
                  ) : (
                    renderConversation()
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="wc-inputbar">
                  <input
                    type="file"
                    ref={docInputRef}
                    style={{ display: "none" }}
                    onChange={(e) => handleFilePick(e, "document")}
                  />
                  <input
                    type="file"
                    ref={imgInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleFilePick(e, "image")}
                  />
                  <button
                    className="wc-attach-btn"
                    title="Send photo"
                    disabled={!connected || uploading}
                    onClick={() => imgInputRef.current?.click()}
                  >
                    <ImageIcon size={19} />
                  </button>
                  <button
                    className="wc-attach-btn"
                    title="Send document"
                    disabled={!connected || uploading}
                    onClick={() => docInputRef.current?.click()}
                  >
                    <Paperclip size={19} />
                  </button>
                  <input
                    className="wc-input"
                    placeholder={
                      uploading ? "Sending file…" :
                      connected ? "Type a message…" : "Connect WhatsApp to send messages"
                    }
                    value={draft}
                    disabled={!connected}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDraft()}
                  />
                  <button className="wc-send-btn" onClick={sendDraft} disabled={!connected || sending}>
                    <SendIcon size={18} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ══════════ SETTINGS DRAWER (SLIDES FROM LEFT) ══════════ */}
          {drawerOpen && (
            <div className="wc-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          )}
          <div className={`wc-drawer ${drawerOpen ? "open" : ""}`}>
            <div className="wc-drawer-head">
              <div className="wc-drawer-title">
                <Settings size={17} /> WhatsApp Settings
              </div>
              <button className="wc-drawer-close" onClick={() => setDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="wc-drawer-body">
              {/* COMPANY */}
              <div>
                <div className="wc-drawer-label">Company</div>
                <CompanySelect className="wc-drawer-select" />
              </div>

              {/* CONNECTION STATUS */}
              <div>
                <div className="wc-drawer-label">Connection</div>
                <div className="wc-status-card">
                  <span className={`wc-badge ${connected ? "ok" : "off"}`}>
                    <span className="wc-badge-dot" />
                    {connected ? "Connected" : connState === null ? "Checking…" : "Disconnected"}
                  </span>
                  <div className="wc-status-row">
                    <div className="wc-status-icon"><Phone size={16} /></div>
                    <div>
                      <div className="wc-status-label">WhatsApp Number</div>
                      <div className="wc-status-value">
                        {connected && waPhone ? `+${waPhone}` : "—"}
                      </div>
                    </div>
                  </div>
                  {connected && waName && (
                    <div className="wc-status-row">
                      <div className="wc-status-icon"><CheckCircle2 size={16} /></div>
                      <div>
                        <div className="wc-status-label">Account</div>
                        <div className="wc-status-value">{waName}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DISCONNECT */}
              <div>
                <div className="wc-drawer-label">Session</div>
                <button
                  className="wc-disconnect-btn"
                  onClick={disconnectWhatsApp}
                  disabled={disconnecting || !connected}
                  style={{ width: "100%" }}
                >
                  {disconnecting ? (
                    <><Loader2 size={15} /> Disconnecting…</>
                  ) : (
                    <><Unplug size={15} /> Disconnect WhatsApp</>
                  )}
                </button>
                <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.6, marginTop: 10 }}>
                  Disconnecting logs out this WhatsApp session. Scan the QR code
                  again to reconnect a new or the same account.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`wc-toast ${toast.ok ? "ok" : "err"}`}>{toast.msg}</div>}
    </div>
  );
}
