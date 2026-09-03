import { useEffect, useState, useRef } from "react";
import api from "../../services/api";
import { getEcho, leaveChannel } from "../../services/echo";
import {
  Search,
  FileText,
  Check,
  CheckCheck,
  Clock,
  Send as SendIcon,
  Phone,
  ChevronLeft,
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
  ChevronDown,
  CornerUpLeft,
  Copy,
  Forward,
  Pencil,
  Trash2,
  Rocket,
} from "lucide-react";

// Proper WhatsApp logo glyph (official mark, monochrome)
const WhatsAppIcon = ({ size = 24, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

// ── delivery indicators (real status from DB via ack events) ──
function Ticks({ status }) {
  if (status === "read")
    return (
      <span className="inline-flex items-center ml-0.5">
        <CheckCheck size={16} className="text-[#53bdeb] drop-shadow-sm" />
      </span>
    );
  if (status === "delivered")
    return (
      <span className="inline-flex items-center ml-0.5">
        <CheckCheck size={16} className="text-[#8696a0]" />
      </span>
    );
  if (status === "sent")
    return (
      <span className="inline-flex items-center ml-0.5">
        <Check size={14} className="text-[#8696a0]" />
      </span>
    );
  return (
    <span className="inline-flex items-center ml-0.5">
      <Clock size={12} className="text-[#8696a0] opacity-70" />
    </span>
  );
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

const statusRank = { pending: 0, sent: 1, delivered: 2, read: 3, received: 4 };

export default function WhatsAppChat() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(localStorage.getItem("selected_company_id") || "");
  // connection state: 'checking' | 'initializing' | 'reconnecting' | 'authenticated' | 'ready' | 'qr_ready' | 'disconnected' | 'auth_failure'
  const [connState, setConnState] = useState("checking");
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

  // reply: highlight the original message when a quote is clicked
  const [highlightId, setHighlightId] = useState(null);

  // swipe-to-reply: visual offset while dragging a message row
  const [swipe, setSwipe] = useState({ id: null, x: 0 });

  // message action menu
  const [menuOpenFor, setMenuOpenFor] = useState(null); // message id (string) with menu open
  const [hoverId, setHoverId] = useState(null); // message id being hovered
  const [replyTo, setReplyTo] = useState(null); // message object being replied to
  const [editingMsg, setEditingMsg] = useState(null); // message object being edited

  // forward flow
  const [forwardMsg, setForwardMsg] = useState(null); // message being forwarded
  const [forwardCust, setForwardCust] = useState([]); // all saved customers
  const [forwardSearch, setForwardSearch] = useState("");
  const [forwardSel, setForwardSel] = useState([]); // selected customer ids
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSending, setForwardSending] = useState(false);

  // delete choice dialog
  const [deleteTarget, setDeleteTarget] = useState(null); // message object pending delete

  const scrollRef = useRef(null);      // conversation scroll container
  const stickToBottom = useRef(true);  // only auto-scroll when the user is near the bottom
  const docInputRef = useRef(null);
  const imgInputRef = useRef(null);
  const inputRef = useRef(null);
  const menuRef = useRef(null);
  const msgEls = useRef({});
  const editedRef = useRef({});    // msgId -> edited text (in-session edit override)
  const swipeStart = useRef(null); // active swipe gesture info

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
        // Do NOT reset connState on network glitches or transient errors.
        // Preserve last known state to prevent flashing the QR screen.
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

  // Build the quote banner data for a message that carries a reply reference.
  // The original message lives in the same chat history, so we always resolve
  // the exact sender name and original text from it (backend-driven flow).
  const buildReplyMeta = (m, lookup) => {
    const rid = m.reply_to_message_id ?? m.replyToId;
    if (!rid) return null;
    const ridS = String(rid);
    const orig = lookup.get(ridS);
    if (!orig) return null;
    return {
      toId: ridS,
      author:
        orig.direction === "outgoing"
          ? (waName || "You")
          : (orig.customer_name || selectedMeta?.name || "Customer"),
      text: quoteText(orig),
    };
  };

  // ── selected conversation with monotonic status merge ──
  const loadMessages = async (phone) => {
    if (!companyId || !phone) return;
    try {
      const res = await api.get(`/whatsapp/messages?company_id=${companyId}&phone=${phone}`);
      if (res.data.status) {
        const incoming = res.data.data || [];
        setMessages((prev) => {
          let merged;
          if (prev.length === 0) {
            merged = incoming;
          } else {
            const prevMap = new Map();
            for (const m of prev) {
              if (m.whatsapp_message_id) prevMap.set(m.whatsapp_message_id, m);
              if (m.id) prevMap.set(String(m.id), m);
            }

            merged = incoming.map((inc) => {
              const existing = (inc.whatsapp_message_id && prevMap.get(inc.whatsapp_message_id)) ||
                               (inc.id && prevMap.get(String(inc.id)));
              if (existing) {
                const existingRank = statusRank[existing.status] || 0;
                const incomingRank = statusRank[inc.status] || 0;
                // Preserve locally-added reply/quote metadata and in-session edits
                // so polling does not revert them.
                const preserve = {};
                if (existing.replyMetadata) preserve.replyMetadata = existing.replyMetadata;
                if (existing.edited) {
                  preserve.edited = true;
                  preserve.text = existing.text || inc.text;
                }
                return {
                  ...inc,
                  ...preserve,
                  status: existingRank > incomingRank ? existing.status : inc.status,
                };
              }
              return inc;
            });
          }

          // Materialize quote-banner metadata for every message that references
          // an original message, so replies render correctly inside the bubble.
          const byId = new Map();
          for (const cm of merged) {
            if (cm.id !== undefined && cm.id !== null) byId.set(String(cm.id), cm);
            if (cm.whatsapp_message_id) byId.set(String(cm.whatsapp_message_id), cm);
          }
          return merged.map((m) => {
            if (m.replyMetadata) return m;
            const meta = buildReplyMeta(m, byId);
            return meta ? { ...m, replyMetadata: meta } : m;
          });
        });
      }
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
    stickToBottom.current = true;
    markRead(chat.phone);
    loadMessages(chat.phone);
  };

  useEffect(() => {
    if (!selectedPhone) return;
    const t = setInterval(() => loadMessages(selectedPhone), 3000);
    return () => clearInterval(t);
  }, [selectedPhone]);

  // ── real-time WebSocket listener for message status ticks ──
  useEffect(() => {
    if (!connected) return;

    let channel = null;

    try {
      const echo = getEcho();
      channel = echo.channel("whatsapp-chat");

      channel.listen(".message-status", (data) => {
        const msgId = data.whatsapp_message_id;
        const ack = Number(data.status);

        if (!msgId) return;

        let newStatus = "sent";
        if (ack >= 3) newStatus = "read";
        else if (ack >= 2) newStatus = "delivered";

        const targetRank = statusRank[newStatus] || 1;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.whatsapp_message_id === msgId || String(m.id) === String(msgId)) {
              const currentRank = statusRank[m.status] || 0;
              return currentRank < targetRank ? { ...m, status: newStatus } : m;
            }
            return m;
          })
        );
      });
    } catch (err) {
      console.warn("WebSocket listener setup failed:", err.message);
    }

    return () => {
      if (channel) {
        leaveChannel("whatsapp-chat");
      }
    };
  }, [connected]);

  // Only auto-scroll to the latest message when the user is already near the
  // bottom. If the user has scrolled up to read older messages, keep their
  // exact position — never yank them back down on message/state updates.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    if (!stickToBottom.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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

  // ── save an edited message: persist via backend API then update chat ──
  const sendEdited = async () => {
    const text = draft.trim();
    if (!text || !selectedPhone || sending || !editingMsg) return;

    const editKey = msgKey(editingMsg);
    const editId = editingMsg.id !== undefined ? editingMsg.id : editingMsg.whatsapp_message_id;

    setSending(true);
    try {
      // Real backend edit: update the ORIGINAL message by its id, persist in DB,
      // and (when possible) propagate the edit to WhatsApp itself.
      const res = await api.post("/whatsapp/update_message", {
        company_id: companyId,
        message_id: String(editId),
        message: text,
      });

      if (!res.data.status) {
        showToast(res.data.message || "Failed to update message", false);
        setSending(false);
        return;
      }

      // Update the existing message in place (never duplicate).
      setMessages((prev) =>
        prev.map((m) => {
          const match =
            (editingMsg.id !== undefined && String(m.id) === String(editingMsg.id)) ||
            (editingMsg.whatsapp_message_id &&
              m.whatsapp_message_id === editingMsg.whatsapp_message_id);
          if (match) return { ...m, text, edited: true };
          return m;
        })
      );
      if (editKey) editedRef.current[editKey] = { text };
      setDraft("");
      setEditingMsg(null);
      showToast("Message updated");
      await loadMessages(selectedPhone);
      await loadChats();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update message", false);
    } finally {
      setSending(false);
    }
  };

  // ── send text message ──
  const sendDraft = async () => {
    const text = draft.trim();
    if (!text || !selectedPhone || sending) return;

    // real reply reference: the DB id of the original message being replied to
    const replying = replyTo && !editingMsg;
    const replyToId = replying && replyTo.id !== undefined ? String(replyTo.id) : null;

    setSending(true);
    try {
      const res = await api.post("/whatsapp/send_message", {
        company_id: companyId,
        phone: selectedPhone,
        message: text,
        reply_to_message_id: replyToId,
      });

      if (res.data.status) {
        // The reply reference is persisted by the backend and returned with the
        // created message; the refresh below re-materializes the quote banner
        // from that real data (no fake/local reply state).
        setDraft("");
        setReplyTo(null);
        setEditingMsg(null);
        stickToBottom.current = true;
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
          stickToBottom.current = true;
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

  // ── message action menu ──
  const toggleMenu = (e, m) => {
    e.stopPropagation();
    if (menuOpenFor === String(m.id)) {
      setMenuOpenFor(null);
    } else {
      setMenuOpenFor(String(m.id));
    }
  };

  // close menus / forward on outside click
  useEffect(() => {
    const onDoc = (e) => {
      const inBtn = e.target.closest && e.target.closest(".wc-bubble-menu-btn, .wc-msg-menu, .wc-msg-menu-item");
      if (inBtn) return;
      setMenuOpenFor(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const quoteText = (m) => {
    if (!m) return "";
    if (m.text) return m.text;
    if (m.type === "image") return m.filename || "Photo";
    if (m.type === "document") {
      if (m.invoice) return m.invoice.invoice_no || "Invoice";
      return m.filename || "Document";
    }
    return "Message";
  };

  // stable key for a message object (DB id preferred, wa id fallback)
  const msgKey = (m) =>
    m == null
      ? null
      : String(m.id !== undefined && m.id !== null ? m.id : m.whatsapp_message_id);

  // REPLY → set up quoted message banner in composer
  const handleReply = (m) => {
    setReplyTo(m);
    setEditingMsg(null);
    setMenuOpenFor(null);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  // ── swipe-to-reply gesture (real WhatsApp: swipe RIGHT on any message) ──
  const SWIPE_THRESH = 48;

  const onRowPointerDown = (e, m) => {
    // ignore swipes that start on interactive controls (menu button, reply banner, links)
    if (e.target.closest && e.target.closest(".wc-bubble-menu-btn, .wc-reply-banner, .wc-msg-menu, .wc-msg-menu-item, button, a")) return;
    if (e.button !== undefined && e.pointerType === "mouse" && e.button !== 0) return;
    try {
      if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) { /* ignore */ }
    swipeStart.current = {
      id: String(m.id),
      x: e.clientX,
      y: e.clientY,
      active: true,
    };
  };

  const onRowPointerMove = (e) => {
    const s = swipeStart.current;
    if (!s || !s.active) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // only react to horizontal intent
    if (Math.abs(dx) <= Math.abs(dy)) return;
    if (e.cancelable) e.preventDefault();
    // replying is triggered by swiping RIGHT for both incoming and outgoing messages
    const clamped = Math.max(0, Math.min(220, dx));
    setSwipe({ id: s.id, x: clamped });
  };

  const endSwipe = (e) => {
    const s = swipeStart.current;
    if (!s || !s.active) return;
    s.active = false;
    swipeStart.current = null;
    const dx = e.clientX - s.x;
    const valid = dx >= SWIPE_THRESH;
    setSwipe({ id: null, x: 0 });
    if (!valid) return;
    const target = messages.find(
      (mm) => String(mm.id) === s.id || (mm.whatsapp_message_id && String(mm.whatsapp_message_id) === s.id)
    );
    if (target) handleReply(target);
  };

  const cancelSwipe = () => {
    if (swipeStart.current) swipeStart.current.active = false;
    swipeStart.current = null;
    setSwipe({ id: null, x: 0 });
  };

  // scroll to an original message referenced by a reply quote and highlight it
  const goToMessage = (id) => {
    const mid = String(id);
    const el = msgEls.current[mid] ||
      (scrollRef.current && scrollRef.current.querySelector(`[data-mid="${mid}"]`)) ||
      null;
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setHighlightId(null);
    requestAnimationFrame(() => setHighlightId(mid));
    setTimeout(() => setHighlightId(null), 2400);
  };

  // COPY → copy exact message text to clipboard with proper error handling
  const handleCopy = (m) => {
    const text = m.text || quoteText(m);
    setMenuOpenFor(null);
    const fallbackCopy = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch (err) {
        return false;
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Message copied"))
        .catch(() => {
          const ok = fallbackCopy();
          showToast(ok ? "Message copied" : "Could not copy message", !!ok);
        });
    } else {
      const ok = fallbackCopy();
      showToast(ok ? "Message copied" : "Could not copy message", !!ok);
    }
  };

  // EDIT (own messages) → load into composer
  const handleEdit = (m) => {
    setEditingMsg(m);
    setReplyTo(null);
    setDraft(m.text || "");
    setMenuOpenFor(null);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  // DELETE → real backend delete (DB + optional WhatsApp delete)
  const handleDelete = async (m, deleteFor = "everyone") => {
    if (!selectedPhone) return;
    setMenuOpenFor(null);
    setDeleteTarget(null);
    const delId = m.id !== undefined ? m.id : m.whatsapp_message_id;
    try {
      const res = await api.post("/whatsapp/delete_message", {
        company_id: companyId,
        message_id: String(delId),
        delete_for: deleteFor,
      });
      if (res.data.status) {
        if (deleteFor === "everyone") {
          // "Delete for everyone" → show placeholder in UI, refresh from server
          await loadMessages(selectedPhone);
        } else {
          // "Delete for me" → remove from UI only
          setMessages((prev) =>
            prev.filter((x) => {
              if (m.id !== undefined && String(x.id) === String(m.id)) return false;
              if (m.whatsapp_message_id && x.whatsapp_message_id === m.whatsapp_message_id) return false;
              return true;
            })
          );
        }
        // Remove any in-session edit override for the deleted message.
        const key = msgKey(m);
        if (key && editedRef.current[key]) delete editedRef.current[key];
        showToast(deleteFor === "everyone" ? "Message deleted for everyone" : "Message deleted");
        await loadChats();
      } else {
        showToast(res.data.message || "Failed to delete message", false);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete message", false);
    }
  };

  // ── FORWARD: load saved customers & open selection UI ──
  const handleForward = async (m) => {
    setMenuOpenFor(null);
    setForwardMsg(m);
    setForwardSel([]);
    setForwardSearch("");
    setForwardLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const res = await api.get(`/customer/get_all_customer`, {
        params: { admin_id: user?.id },
      });
      if (res.data.status) {
        setForwardCust(res.data.data || []);
      } else {
        setForwardCust([]);
      }
    } catch (err) {
      console.error(err);
      setForwardCust([]);
    } finally {
      setForwardLoading(false);
    }
  };

  const closeForward = () => {
    setForwardMsg(null);
    setForwardSel([]);
    setForwardSearch("");
  };

  const toggleForwardSel = (id) => {
    setForwardSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const forwardFiltered = forwardCust.filter((c) => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  const forwardFmtPhone = (p) => String(p || "").replace(/^91(?=\d{10}$)/, "");

  const sendForward = async () => {
    if (forwardSel.length === 0 || !forwardMsg || forwardSending) {
      if (forwardSel.length === 0) showToast("Select at least one customer", false);
      return;
    }
    // Build the exact content to forward from the selected message.
    let content = "";
    if (forwardMsg.text) {
      content = forwardMsg.text;
    } else if (forwardMsg.type === "document" && forwardMsg.invoice && forwardMsg.invoice.invoice_no) {
      // Forward a faithful, formatted invoice summary (media bytes are not stored).
      content = `Invoice: ${forwardMsg.invoice.invoice_no}` +
        (forwardMsg.invoice.total_amount != null ? `\nAmount: ${inr(forwardMsg.invoice.total_amount)}` : "") +
        (forwardMsg.invoice.balance_amount > 0 && forwardMsg.invoice.due_date
          ? `\nDue: ${forwardMsg.invoice.due_date}` : "");
    } else {
      // Generic media: forward the caption/name.
      const caption = quoteText(forwardMsg);
      if (caption) content = `Forwarded: ${caption}`;
    }

    if (!content) {
      showToast("Nothing to forward for this message", false);
      return;
    }

    setForwardSending(true);
    try {
      const targets = forwardCust.filter((c) => forwardSel.includes(c.id));
      let sent = 0;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        let phone = String(t.phone || "");
        phone = phone.replace(/\D/g, "");
        if (/^\d{10}$/.test(phone)) phone = "91" + phone;
        if (!phone) continue;
        const r = await api.post("/whatsapp/send_message", {
          company_id: companyId,
          phone,
          message: content,
        });
        if (r.data.status) sent++;
        // Small spacing between forwards avoids WhatsApp rate limiting.
        if (i < targets.length - 1) await new Promise((res) => setTimeout(res, 600));
      }
      showToast(`Message forwarded to ${sent} customer${sent === 1 ? "" : "s"}`);
      if (sent > 0) {
        await loadChats();
        if (selectedPhone) await loadMessages(selectedPhone);
      }
      closeForward();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to forward", false);
    } finally {
      setForwardSending(false);
    }
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
    const menuOpen = menuOpenFor === String(m.id);
    const isHighlighted = highlightId === String(m.id);
    const key = msgKey(m);
    const reply = m.replyMetadata || null;
    const edited = m.edited || Boolean(key && editedRef.current[key]);
    const bodyText = key && editedRef.current[key] ? editedRef.current[key].text : m.text;

    return (
      <div
        key={m.id}
        className={`wc-row ${out ? "wc-out" : "wc-in"} ${menuOpen ? "wc-row-open" : ""} ${isHighlighted ? "wc-row-highlight" : ""}`}
        onMouseEnter={() => setHoverId(String(m.id))}
        onMouseLeave={() => { if (!menuOpen) setHoverId(null); }}
        onPointerDown={(e) => onRowPointerDown(e, m)}
        onPointerMove={onRowPointerMove}
        onPointerUp={endSwipe}
        onPointerCancel={cancelSwipe}
      >
        <div
          className={`wc-bubble-wrap ${out ? "wc-bubble-wrap-out" : "wc-bubble-wrap-in"} ${swipe.id === String(m.id) ? "wc-bubble-wrap-swiping" : ""}`}
          data-mid={String(m.id)}
          ref={(el) => { msgEls.current[String(m.id)] = el; }}
          style={swipe.id === String(m.id) && swipe.x ? { transform: `translateX(${swipe.x}px)` } : undefined}
        >
        <div className={`wc-bubble ${out ? "wc-bubble-out" : ""}`}>
          {/* Reply quote banner rendered on bubble when it's a reply */}
          {reply ? (
            <div
              className="wc-reply-banner"
              onClick={() => goToMessage(reply.toId)}
              title="Go to quoted message"
            >
              <div className="wc-reply-author">{reply.author || "Reply"}</div>
              <div className="wc-reply-text">{reply.text || reply.raw || ""}</div>
            </div>
          ) : null}
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
          {bodyText ? <div className="wc-text">{bodyText}</div> : null}
          <div className="wc-meta">
            {edited && <span className="wc-edited-label">edited</span>}
            <span>{formatTime(m.time)}</span>
            {out && <Ticks status={m.status} />}
          </div>
        </div>

        {/* Hover dropdown (chevron) button */}
        <button
          className={`wc-bubble-menu-btn ${hoverId === String(m.id) || menuOpen ? "show" : ""} ${menuOpen ? "open" : ""}`}
          onClick={(e) => toggleMenu(e, m)}
          title="Message actions"
          aria-label="Message actions"
        >
          <ChevronDown size={15} />
        </button>

        {/* WhatsApp-style action menu popover */}
        {menuOpen && (
          <div className="wc-msg-menu" ref={menuOpen ? menuRef : undefined}>
            <div className="wc-msg-menu-item" onClick={() => handleReply(m)}>
              <CornerUpLeft size={15} />
              <span>Reply</span>
            </div>
            <div className="wc-msg-menu-item" onClick={() => handleCopy(m)}>
              <Copy size={15} />
              <span>Copy</span>
            </div>
            <div className="wc-msg-menu-item" onClick={() => handleForward(m)}>
              <Forward size={15} />
              <span>Forward</span>
            </div>
            {out && m.text ? (
              <div className="wc-msg-menu-item" onClick={() => handleEdit(m)}>
                <Pencil size={15} />
                <span>Edit</span>
              </div>
            ) : null}
            <div className="wc-msg-menu-item wc-msg-menu-danger" onClick={() => { setDeleteTarget(m); setMenuOpenFor(null); }}>
              <Trash2 size={15} />
              <span>Delete</span>
            </div>
          </div>
        )}
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
        .wa-page { padding: 16px 24px 16px 24px; font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; height: calc(100% + 32px); margin-top: -16px; min-height: 0; max-height: calc(100% + 32px); overflow: hidden; display: flex; flex-direction: column; box-sizing: border-box; }
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
        .wc-messages { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 18px 22px 10px; background-image: radial-gradient(rgba(0,0,0,0.02) 1px, transparent 1px); background-size: 18px 18px; }
        .wc-day { text-align: center; margin: 10px 0 14px; }
        .wc-day span { background: rgba(255,255,255,0.85); color: #54656f; font-size: 11.5px; font-weight: 600; padding: 5px 12px; border-radius: 8px; }
        .wc-row { display: flex; min-width: 0; max-width: 100%; margin-bottom: 8px; }
        .wc-out { justify-content: flex-end; }
        .wc-in { justify-content: flex-start; }
        .wc-bubble { max-width: 68%; min-width: 0; border-radius: 10px; padding: 7px 9px 5px; box-shadow: 0 1px 1px rgba(11,20,26,0.13); background: #ffffff; }
        .wc-bubble-out { background: #d9fdd3; border-top-right-radius: 2px; }
        .wc-bubble:not(.wc-bubble-out) { border-top-left-radius: 2px; }
        .wc-text { font-size: 13.8px; color: #111b21; line-height: 1.45; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
        .wc-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 10.5px; color: #667781; margin-top: 3px; }

        .wc-doc-card { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.05); border-radius: 9px; padding: 9px 11px; min-width: 0; max-width: 100%; }
        .wc-doc-icon { width: 38px; height: 38px; min-width: 38px; border-radius: 9px; background: #fff; color: #b91c1c; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px #e2e8f0; }
        .wc-doc-info { min-width: 0; }
        .wc-doc-name { font-size: 13.5px; font-weight: 700; color: #111b21; word-break: break-all; }
        .wc-doc-sub { font-size: 12px; color: #54656f; margin-top: 1px; }
        .wc-doc-meta { font-size: 11.5px; color: #54656f; margin-top: 5px; }
        .wc-img-card { display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.05); border-radius: 9px; padding: 9px 11px; min-width: 0; max-width: 100%; }
        .wc-img-thumb { width: 44px; height: 44px; min-width: 44px; border-radius: 9px; background: #fff; color: #0369a1; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px #e2e8f0; }
        .wc-img-name { font-size: 12.5px; font-weight: 600; color: #111b21; word-break: break-all; }

        .wc-inputbar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #f0f2f5; border-top: 1px solid #e2e8f0; }
        .wc-attach-btn { width: 40px; height: 40px; min-width: 40px; border-radius: 50%; border: none; background: transparent; color: #54656f; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.15s ease; }
        .wc-attach-btn:hover { background: #e2e8f0; }
        .wc-attach-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .wc-input { flex: 1; min-width: 0; padding: 12px 16px; border-radius: 999px; border: 1px solid #e2e8f0; font-size: 14px; outline: none; font-family: inherit; background: #fff; }
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
        .wc-drawer { position: absolute; left: 0; top: 0; bottom: 0; width: 340px; max-width: 85%; background: #fff; z-index: 11; border-right: 1px solid #e2e8f0; transform: translateX(-100%); transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); display: flex; flex-direction: column; }
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

        /* ── message hover dropdown button ── */
        .wc-row { position: relative; align-items: flex-start; touch-action: pan-y; }
        .wc-row-highlight { animation: wc-flash-row 2.4s ease; }
        @keyframes wc-flash-row {
          0% { background: rgba(37,211,102,0.45); }
          60% { background: rgba(37,211,102,0.35); }
          100% { background: transparent; }
        }
        .wc-bubble-wrap { position: relative; display: inline-flex; max-width: 68%; min-width: 0; transition: transform 0.18s ease; }
        .wc-bubble-wrap-swiping { transition: none; will-change: transform; }
        .wc-bubble-wrap-in { align-self: flex-start; }
        .wc-bubble-wrap-out { align-self: flex-end; }
        .wc-bubble { max-width: 100%; }
        .wc-bubble-menu-btn { position: absolute; top: 2px; width: 26px; height: 26px; border-radius: 50%; border: none; background: transparent; color: #667781; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0; transition: opacity 0.12s ease, background 0.12s ease; }
        .wc-bubble-wrap-in .wc-bubble-menu-btn { right: calc(100% + 2px); }
        .wc-bubble-wrap-out .wc-bubble-menu-btn { left: calc(100% + 2px); }
        .wc-bubble-menu-btn:hover { background: rgba(11,20,26,0.08); }
        .wc-bubble-menu-btn.show, .wc-bubble-menu-btn.open { opacity: 1; }
        .wc-bubble-menu-btn.open { background: rgba(11,20,26,0.1); transform: rotate(180deg); }

        /* ── WhatsApp-style action menu ── */
        .wc-msg-menu { position: absolute; top: 34px; z-index: 30; min-width: 170px; background: #ffffff; border-radius: 10px; box-shadow: 0 2px 12px rgba(11,20,26,0.18), 0 0 0 0.5px rgba(0,0,0,0.06); padding: 6px 0; overflow: hidden; }
        .wc-in .wc-msg-menu { left: 0; }
        .wc-out .wc-msg-menu { right: 0; }
        .wc-msg-menu-item { display: flex; align-items: center; gap: 12px; padding: 9px 18px; font-size: 13.5px; font-weight: 500; color: #111b21; cursor: pointer; transition: background 0.1s ease; white-space: nowrap; }
        .wc-msg-menu-item:hover { background: #f0f2f5; }
        .wc-msg-menu-item svg { color: #667781; flex-shrink: 0; }
        .wc-msg-menu-danger { color: #c62828; }
        .wc-msg-menu-danger svg { color: #c62828; }

        /* reply banner inside a bubble (displays quoted/referenced message) */
        .wc-reply-banner { border-left: 3px solid #31a24c; background: rgba(37,211,102,0.08); padding: 5px 9px; border-radius: 6px; margin-bottom: 5px; cursor: pointer; }
        .wc-reply-banner:hover { background: rgba(37,211,102,0.16); }
        .wc-reply-author { font-size: 12px; font-weight: 700; color: #008069; }
        .wc-reply-text { font-size: 12.5px; color: #54656f; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
        .wc-edited-label { font-size: 10px; color: #667781; font-style: italic; }

        /* ── composer reply/edit bar ── */
        .wc-reply-bar { display: flex; align-items: stretch; gap: 10px; width: 100%; background: #dcfce7; border-radius: 10px; padding: 6px 8px; margin-bottom: 8px; box-sizing: border-box; }
        .wc-reply-bar-accent { width: 4px; border-radius: 4px; background: #25d366; flex-shrink: 0; }
        .wc-reply-bar-body { flex: 1; min-width: 0; }
        .wc-reply-bar-title { font-size: 11.5px; font-weight: 700; color: #008069; }
        .wc-reply-bar-text { font-size: 12.5px; color: #54656f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wc-reply-bar-close { border: none; background: transparent; color: #667781; cursor: pointer; display: flex; align-items: flex-start; padding: 2px; }
        .wc-inputbar { flex-wrap: wrap; }
        .wc-edit-send { background: linear-gradient(135deg, #16a34a, #128c7e); }

        /* ── forward overlay ── */
        .wc-forward-backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .wc-forward-modal { width: 100%; max-width: 420px; max-height: 82vh; background: #fff; border-radius: 16px; box-shadow: 0 12px 40px rgba(11,20,26,0.3); display: flex; flex-direction: column; overflow: hidden; }
        .wc-forward-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #f1f5f9; }
        .wc-forward-title { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: #111b21; }
        .wc-forward-title svg { color: #128c7e; }
        .wc-forward-close { border: none; background: transparent; color: #667781; cursor: pointer; display: flex; padding: 4px; border-radius: 8px; }
        .wc-forward-close:hover { background: #f1f5f9; }
        .wc-forward-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 14px 18px; gap: 12px; }
        .wc-forward-msg { display: flex; flex-direction: column; gap: 3px; background: #f0f2f5; border-radius: 10px; padding: 10px 12px; }
        .wc-forward-msg-label { font-size: 11px; font-weight: 700; color: #008069; text-transform: uppercase; letter-spacing: 0.4px; }
        .wc-forward-msg-text { font-size: 13.5px; color: #111b21; white-space: pre-wrap; word-break: break-word; max-height: 80px; overflow-y: auto; }
        .wc-forward-search-box { position: relative; }
        .wc-forward-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .wc-forward-search { width: 100%; padding: 10px 12px 10px 34px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; outline: none; box-sizing: border-box; font-family: inherit; }
        .wc-forward-search:focus { border-color: #25d366; }
        .wc-forward-list { flex: 1; min-height: 120px; max-height: 44vh; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .wc-forward-loading, .wc-forward-empty { padding: 30px 10px; text-align: center; color: #8696a0; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
        .wc-fcust { display: flex; align-items: center; gap: 12px; padding: 9px 10px; border-radius: 10px; cursor: pointer; transition: background 0.12s ease; }
        .wc-fcust:hover { background: #f4fdf7; }
        .wc-fcust.sel { background: #dcfce7; }
        .wc-fcust-avatar { width: 38px; height: 38px; min-width: 38px; border-radius: 50%; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 15px; }
        .wc-fcust-main { flex: 1; min-width: 0; }
        .wc-fcust-name { font-size: 13.5px; font-weight: 600; color: #111b21; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wc-fcust-phone { font-size: 12px; color: #667781; }
        .wc-fcust-tick { width: 22px; height: 22px; min-width: 22px; border-radius: 50%; border: 2px solid #bec7cc; display: flex; align-items: center; justify-content: center; color: #fff; box-sizing: border-box; }
        .wc-fcust-tick.sel { background: #25d366; border-color: #25d366; }
        .wc-forward-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-top: 1px solid #f1f5f9; }
        .wc-forward-count { font-size: 12.5px; font-weight: 600; color: #54656f; }
        .wc-forward-send { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 22px; border: none; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; background: linear-gradient(135deg, #25d366, #128c7e); color: #fff; box-shadow: 0 4px 14px rgba(18,140,126,0.3); transition: opacity 0.15s ease; }
        .wc-forward-send:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
        .wc-forward-send.ready { animation: none; }


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
            <WhatsAppIcon size={22} />
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
                <WhatsAppIcon size={40} />
              </div>
              <h2>WhatsApp as Usual</h2>
              <p>
                Connect your existing WhatsApp account and start chatting with
                customers, sending invoices, documents and photos — all from
                your billing software.
              </p>
            </div>

            <div className="wa-connect">
              {connState === "checking" ? (
                <>
                  <Loader2 size={34} className="wa-spin" />
                  <h2>Checking Connection…</h2>
                  <div className="wa-status-text">Checking WhatsApp connection status…</div>
                </>
              ) : connState === "reconnecting" ? (
                <>
                  <Loader2 size={34} className="wa-spin" />
                  <h2>Reconnecting…</h2>
                  <div className="wa-status-text">Restoring WhatsApp session…</div>
                </>
              ) : connState === "authenticated" ? (
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
                <div className="wc-empty-icon"><WhatsAppIcon size={40} /></div>
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
                      {selectedPhone.replace(/^91(?=\d{10}$)/, "")}
                    </div>
                  </div>
                </div>

                <div className="wc-messages" ref={scrollRef} onScroll={handleScroll}>
                  {messages.length === 0 ? (
                    <div className="wc-list-empty">No messages yet.</div>
                  ) : (
                    renderConversation()
                  )}
                </div>

                <div className="wc-inputbar">
                  {(replyTo || editingMsg) && (
                    <div className="wc-reply-bar">
                      <div className="wc-reply-bar-accent" />
                      <div className="wc-reply-bar-body">
                        <div className="wc-reply-bar-title">
                          {editingMsg
                            ? "Edit message"
                            : (replyTo.direction === "outgoing"
                                ? (waName || "You")
                                : (selectedMeta?.name || replyTo.customer_name || "Customer"))}
                        </div>
                        <div className="wc-reply-bar-text">
                          {editingMsg
                            ? (editingMsg.text || quoteText(editingMsg))
                            : quoteText(replyTo)}
                        </div>
                      </div>
                      <button
                        className="wc-reply-bar-close"
                        title="Cancel"
                        onClick={() => { setReplyTo(null); setEditingMsg(null); setDraft(editingMsg ? "" : draft); }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
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
                    ref={inputRef}
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
                  <button
                    className={`wc-send-btn ${editingMsg ? "wc-edit-send" : ""}`}
                    onClick={() => (editingMsg ? sendEdited() : sendDraft())}
                    disabled={!connected || sending}
                    title={editingMsg ? "Save changes" : "Send"}
                  >
                    {editingMsg ? <Check size={18} /> : <SendIcon size={18} />}
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
              {/* CONNECTION STATUS */}
              <div>
                <div className="wc-drawer-label">Connection</div>
                <div className="wc-status-card">
                  <span className={`wc-badge ${connected ? "ok" : "off"}`}>
                    <span className="wc-badge-dot" />
                    {connected ? "Connected" : connState === "checking" ? "Checking…" : connState === "reconnecting" ? "Reconnecting…" : connState === "initializing" ? "Initializing…" : "Disconnected"}
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

      {/* ══════════ FORWARD: CUSTOMER SELECTION OVERLAY ══════════ */}
      {forwardMsg && (
        <div className="wc-forward-backdrop" onClick={closeForward}>
          <div className="wc-forward-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wc-forward-head">
              <div className="wc-forward-title">
                <Forward size={16} />
                Forward message
              </div>
              <button className="wc-forward-close" onClick={closeForward}>
                <X size={18} />
              </button>
            </div>

            <div className="wc-forward-body">
              {/* quoting the message being forwarded */}
              <div className="wc-forward-msg">
                <span className="wc-forward-msg-label">Forwarding:</span>
                <span className="wc-forward-msg-text">{quoteText(forwardMsg)}</span>
              </div>

              <div className="wc-forward-search-box">
                <Search size={14} className="wc-forward-search-icon" />
                <input
                  className="wc-forward-search"
                  placeholder="Search customers…"
                  value={forwardSearch}
                  onChange={(e) => setForwardSearch(e.target.value)}
                />
              </div>

              <div className="wc-forward-list">
                {forwardLoading ? (
                  <div className="wc-forward-loading">
                    <Loader2 size={20} className="wa-spin" />
                    Loading customers…
                  </div>
                ) : forwardFiltered.length === 0 ? (
                  <div className="wc-forward-empty">No customers found</div>
                ) : (
                  forwardFiltered.map((c) => {
                    const sel = forwardSel.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`wc-fcust ${sel ? "sel" : ""}`}
                        onClick={() => toggleForwardSel(c.id)}
                      >
                        <div className="wc-fcust-avatar">{avatarLetter(c.name)}</div>
                        <div className="wc-fcust-main">
                          <div className="wc-fcust-name">{c.name || "—"}</div>
                          {c.phone ? (
                            <div className="wc-fcust-phone">{forwardFmtPhone(c.phone)}</div>
                          ) : null}
                        </div>
                        <span className={`wc-fcust-tick ${sel ? "sel" : ""}`}>
                          {sel && <CheckCheck size={13} />}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="wc-forward-footer">
              <div className="wc-forward-count">
                {forwardSel.length > 0
                  ? `${forwardSel.length} selected`
                  : "0 selected"}
              </div>
              <button
                className={`wc-forward-send ${forwardSel.length > 0 ? "ready" : ""}`}
                onClick={sendForward}
                disabled={forwardSending || forwardSel.length === 0}
              >
                {forwardSending ? (
                  <><Loader2 size={16} className="wa-spin" /> Sending…</>
                ) : (
                  <><Rocket size={16} /> Send</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`wc-toast ${toast.ok ? "ok" : "err"}`}>{toast.msg}</div>}
    </div>
  );
}
