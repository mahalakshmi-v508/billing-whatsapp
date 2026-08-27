import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

/* ── Global CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap');

  @keyframes slideDown  { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }
  @keyframes slideUp    { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:none} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes toastIn    { from{opacity:0;transform:translateX(120px)} to{opacity:1;transform:none} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes rowPop     { 0%{opacity:0;transform:translateX(-8px)} 100%{opacity:1;transform:none} }
  @keyframes pulseGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.25)} 50%{box-shadow:0 0 0 6px rgba(99,102,241,0)} }
  @keyframes helpSlide  { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:none} }
  @keyframes quickAddPop { from{opacity:0;transform:scale(.95) translateY(-8px)} to{opacity:1;transform:none} }

  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Outfit',sans-serif; }

  .bill-input {
    width:100%; background:rgba(248,250,255,0.9);
    border:1.5px solid #e2e8f0; border-radius:10px;
    padding:9px 13px; color:#1e293b; font-size:14px;
    font-family:'Outfit',sans-serif; outline:none;
    transition:all .2s;
  }
  .bill-input:focus {
    border-color:#6366f1 !important;
    box-shadow:0 0 0 3px rgba(99,102,241,.12) !important;
    background:#fff !important;
  }
  .bill-input::placeholder { color:#94a3b8; }
  .bill-input:disabled { background:#f1f5f9; color:#94a3b8; cursor:not-allowed; }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }

  .row-enter { animation:rowPop .25s ease both; }

  .del-btn {
    width:30px; height:30px; border-radius:8px; border:none;
    background:rgba(239,68,68,.08); color:#ef4444; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .15s; font-size:16px; flex-shrink:0;
  }
  .del-btn:hover { background:rgba(239,68,68,.18); transform:scale(1.1); }

  .gen-btn {
    width:100%; padding:14px; border:none; border-radius:14px;
    background:linear-gradient(135deg,#4f46e5,#6366f1,#818cf8);
    color:#fff; font-size:15px; font-weight:700;
    font-family:'Outfit',sans-serif; cursor:pointer;
    box-shadow:0 8px 24px rgba(99,102,241,.35);
    transition:all .22s; letter-spacing:.02em;
  }
  .gen-btn:hover { transform:translateY(-2px); box-shadow:0 12px 32px rgba(99,102,241,.45); }
  .gen-btn:active { transform:translateY(0); }
  .gen-btn:disabled { opacity:.65; cursor:not-allowed; transform:none; }

  .suggest-item {
    padding:10px 14px; cursor:pointer;
    font-family:'Outfit',sans-serif; font-size:13.5px; color:#334155;
    transition:background .15s; border-bottom:1px solid #f1f5f9;
    display:flex; justify-content:space-between; align-items:center;
  }
  .suggest-item:hover,.suggest-item.active-suggest { background:#eef2ff; }
  .suggest-item:last-child { border-bottom:none; }

  .customer-suggest-item {
    padding:11px 14px; cursor:pointer;
    font-family:'Outfit',sans-serif; font-size:13px; color:#334155;
    transition:background .15s; border-bottom:1px solid #f1f5f9;
  }
  .customer-suggest-item:hover { background:#eef2ff; }
  .customer-suggest-item:last-child { border-bottom:none; }

  .bill-type-dropdown {
    width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px;
    background:#f8faff; color:#1e293b; font-size:13.5px; font-weight:600;
    font-family:'Outfit',sans-serif; outline:none; cursor:pointer;
    transition:all .2s; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 12px center;
    padding-right:36px;
  }
  .bill-type-dropdown:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }

  .pay-method-btn {
    padding:11px 8px; border-radius:12px; cursor:pointer;
    font-family:'Outfit',sans-serif; font-size:13px; font-weight:700;
    transition:all .2s;
  }
  .pay-method-btn:disabled {
    opacity:0.35; cursor:not-allowed; transform:none !important;
    filter:grayscale(0.5);
  }

  .global-search-input {
    width:100%; background:#fff;
    border:2px solid #c7d2fe; border-radius:14px;
    padding:12px 16px 12px 48px; color:#1e293b; font-size:15px;
    font-family:'Outfit',sans-serif; outline:none;
    transition:all .2s; font-weight:500;
  }
  .global-search-input:focus {
    border-color:#6366f1 !important;
    box-shadow:0 0 0 4px rgba(99,102,241,.15) !important;
  }
  .global-search-input::placeholder { color:#94a3b8; font-weight:400; }

  .kbd {
    display:inline-flex; align-items:center; justify-content:center;
    background:#f1f5f9; border:1.5px solid #cbd5e1; border-radius:6px;
    padding:1px 7px; font-size:11px; font-weight:700; color:#475569;
    font-family:'Outfit',sans-serif; white-space:nowrap;
  }

  .help-panel {
    position:fixed; top:0; right:0; bottom:0; width:380px;
    background:#fff; box-shadow:-8px 0 40px rgba(0,0,0,.15);
    z-index:99998; display:flex; flex-direction:column;
    animation:helpSlide .3s cubic-bezier(.4,0,.2,1) both;
    font-family:'Outfit',sans-serif;
  }

  .seg-btn {
    flex:1; padding:10px 0; border-radius:10px; border:none;
    cursor:pointer; font-size:13px; font-weight:700;
    font-family:'Outfit',sans-serif; transition:all .25s;
  }
`;

/* ── Icons ──────────────────────────────────────────────────────────────── */
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconBox = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);
const IconCard = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconReceipt = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
  </svg>
);
const IconGST = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14l6-6"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="15" r="1.5"/>
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
);
const IconPhone = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconBarcode = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14M7 5v14M11 5v14M15 5v10M19 5v10M15 18v1M19 18v1"/>
  </svg>
);
const IconHelp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconStar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconClock = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:99999, display:"flex", flexDirection:"column", gap:10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:10,
          background: t.type==="success"
            ? "linear-gradient(135deg,#059669,#10b981)"
            : t.type==="error"
            ? "linear-gradient(135deg,#dc2626,#ef4444)"
            : "linear-gradient(135deg,#d97706,#f59e0b)",
          color:"#fff", borderRadius:12, padding:"13px 18px",
          fontWeight:600, fontSize:13.5,
          boxShadow:"0 8px 28px rgba(0,0,0,.18)",
          animation:"toastIn .35s cubic-bezier(.4,0,.2,1) both",
          fontFamily:"'Outfit',sans-serif", minWidth:260, maxWidth:340,
        }}>
          <span style={{ width:22, height:22, borderRadius:6, background:"rgba(255,255,255,.22)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, flexShrink:0 }}>
            {t.type==="success" ? "✓" : t.type==="error" ? "✕" : "!"}
          </span>
          <span style={{ flex:1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Bilingual Help Content ──────────────────────────────────────────────── */
const HELP = {
  en: {
    title: "Billing Help Guide",
    subtitle: "Keyboard-first billing system",
    sections: [
      {
        heading: "⌨️ Keyboard Shortcuts",
        items: [
          { key: "F2", desc: "Focus product search bar" },
          { key: "F3", desc: "Focus customer name field" },
          { key: "F8", desc: "Generate invoice" },
          { key: "↑ ↓", desc: "Navigate product suggestions" },
          { key: "Enter", desc: "Select highlighted product" },
          { key: "Esc", desc: "Close search dropdown" },
          { key: "1/2/3/4", desc: "Select payment: Cash/Online/UPI/Credit" },
        ],
      },
      {
        heading: "🔍 Product Search",
        items: [
          { key: "Name", desc: "Type product name to search instantly" },
          { key: "Barcode", desc: "Scan or type barcode code then press Enter" },
          { key: "Empty focus", desc: "Shows Recent & Frequent products" },
          { key: "Duplicate", desc: "Same product added → qty auto-increments" },
        ],
      },
      {
        heading: "➕ Quick Add (Unlisted Items)",
        items: [
          { key: "Not found", desc: "If product not found, Quick Add panel appears" },
          { key: "Bill-only", desc: "Enter name, price & qty — added to bill only" },
        ],
      },
      {
        heading: "💳 Payment Tips",
        items: [
          { key: "Advance", desc: "Customer advance is auto-deducted from total" },
          { key: "Credit", desc: "Credit only enabled for eligible customers" },
          { key: "Sticky panel", desc: "Payment panel stays visible while scrolling" },
        ],
      },
    ],
  },
  ta: {
    title: "பில்லிங் உதவி வழிகாட்டி",
    subtitle: "விசைப்பலகை மூலம் வேகமான பில்லிங்",
    sections: [
      {
        heading: "⌨️ விசைப்பலகை குறுக்குவழிகள்",
        items: [
          { key: "F2", desc: "தயாரிப்பு தேடல் பெட்டியை திறக்க" },
          { key: "F3", desc: "வாடிக்கையாளர் பெயர் பெட்டியை திறக்க" },
          { key: "F8", desc: "இன்வாய்ஸ் உருவாக்க" },
          { key: "↑ ↓", desc: "தேடல் பட்டியலில் நகர" },
          { key: "Enter", desc: "தேர்ந்தெடுத்த தயாரிப்பை சேர்க்க" },
          { key: "Esc", desc: "தேடல் பட்டியலை மூட" },
          { key: "1/2/3/4", desc: "கட்டணம்: ரொக்கம்/ஆன்லைன்/UPI/கடன்" },
        ],
      },
      {
        heading: "🔍 தயாரிப்பு தேடல்",
        items: [
          { key: "பெயர்", desc: "தயாரிப்பு பெயரை தட்டச்சு செய்து தேடுங்கள்" },
          { key: "பார்கோட்", desc: "பார்கோட் ஸ்கேன் செய்து Enter அழுத்துங்கள்" },
          { key: "காலி தேடல்", desc: "சமீபத்திய & அடிக்கடி பயன்படுத்தியவை காட்டப்படும்" },
          { key: "தொகை", desc: "ஒரே தயாரிப்பை மீண்டும் சேர்த்தால் அளவு தானாக அதிகரிக்கும்" },
        ],
      },
      {
        heading: "➕ விரைவு சேர்க்கை (பட்டியலில் இல்லாத பொருள்)",
        items: [
          { key: "கிடைக்கவில்லை", desc: "தயாரிப்பு இல்லாவிட்டால் விரைவு சேர்க்கை பலகம் தோன்றும்" },
          { key: "சேர்க்க", desc: "பெயர், விலை, அளவு உள்ளிட்டு பில்லில் சேர்க்கவும்" },
        ],
      },
      {
        heading: "💳 கட்டண குறிப்புகள்",
        items: [
          { key: "முன்பணம்", desc: "வாடிக்கையாளரின் முன்பணம் தானாகவே கழிக்கப்படும்" },
          { key: "கடன்", desc: "தகுதியான வாடிக்கையாளர்களுக்கு மட்டுமே கடன் விருப்பம்" },
          { key: "ஒட்டும் பலகம்", desc: "நீங்கள் உருட்டும்போது கட்டண பலகம் எப்போதும் காட்டப்படும்" },
        ],
      },
    ],
  },
};

/* ── LocalStorage helpers ───────────────────────────────────────────────── */
const LS_RECENT_KEY = "billing_recent_products";
const LS_FREQ_KEY   = "billing_freq_products";

function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT_KEY) || "[]"); } catch { return []; }
}
function getFrequent() {
  try { return JSON.parse(localStorage.getItem(LS_FREQ_KEY) || "{}"); } catch { return {}; }
}
function trackUsage(product) {
  const recent = getRecent().filter(p => p.id !== product.id);
  recent.unshift({
    id: product.id,
    product_name: product.product_name || product.name,
    price: product.price,
    product_code: product.product_code,
    unit: product.unit,
    gst_percentage: product.gst_percentage || product.gst || 0,
    stock: product.stock,
    status: "active",
  });
  localStorage.setItem(LS_RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
  const freq = getFrequent();
  freq[product.id] = (freq[product.id] || 0) + 1;
  localStorage.setItem(LS_FREQ_KEY, JSON.stringify(freq));
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function emptyRow() {
  return { product_id:null, name:"", product_code:"", price:0, qty:0, gst:0, unit:"", stock:0, isUnlisted:false };
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function Billing() {

  const user    = JSON.parse(localStorage.getItem("user"));
  const adminId = user.role === "cashier" ? user.admin_id : user.id;
  const navigate = useNavigate();

  /* ── State ── */
  const [rows, setRows]             = useState([emptyRow()]);
  const [products, setProducts]     = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(localStorage.getItem("selected_company_id") || "");

  /* Global search */
  const [globalSearch, setGlobalSearch]           = useState("");
  const [globalSuggestions, setGlobalSuggestions] = useState([]);
  const [showSuggest, setShowSuggest]             = useState(false);
  const [suggestIndex, setSuggestIndex]           = useState(-1);
  const [showNoResult, setShowNoResult]           = useState(false);
  const [recentProducts, setRecentProducts]       = useState([]);
  const globalSearchRef = useRef(null);
  const suggestBoxRef   = useRef(null);
  const searchTimer     = useRef(null);
  const justSelectedRef = useRef(false);

  /* Quick Add */
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickItem, setQuickItem]       = useState({ name:"", price:"", qty:1, unit:"" });

  /* Help */
  const [showHelp, setShowHelp] = useState(false);
  const [helpLang, setHelpLang] = useState("en");

  /* Customer */
  const [customer, setCustomer] = useState({
    id:null, name:"", phone:"", gst_no:"",
    credit_enabled:"0", credit_limit:0, points:0,
    advance_balance:0, pending_amount:0,
  });
  const [nameSuggestions, setNameSuggestions]   = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const nameSuggestRef  = useRef(null);
  const phoneSuggestRef = useRef(null);
  const nameSearchTimer  = useRef(null);
  const phoneSearchTimer = useRef(null);

  /* Bill / Payment */
  const [billType,      setBillType]      = useState("cash_bill");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [payment,       setPayment]       = useState({ received: 0 });

  /* AI Copilot & Smart Features */
  const [aiPrompt, setAiPrompt]           = useState("");
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiAnomalies, setAiAnomalies]     = useState([]);
  const [isListening, setIsListening]     = useState(false);

  /* UI */
  const [generating, setGenerating] = useState(false);
  const [toasts,     setToasts]     = useState([]);

  /* ── Derived totals ── */
  const subtotal     = rows.reduce((s, r) => s + r.price * r.qty, 0);
  const gstTotal     = billType === "gst_bill" ? rows.reduce((s, r) => s + (r.price * r.qty * r.gst) / 100, 0) : 0;
  const total        = subtotal + gstTotal;
  const earnedPoints = Math.floor(total / 100);
  const received     = parseFloat(payment.received) || 0;
  const advanceAvailable = parseFloat(customer.advance_balance) || 0;
  const pendingAmount    = parseFloat(customer.pending_amount)  || 0;
  const advanceUsed      = Math.min(advanceAvailable, total);
  const effectiveTotal   = total - advanceUsed;
  const totalCovered     = received + advanceUsed;
  const balance          = totalCovered - total;
  const cashNeeded       = effectiveTotal;
  const extraAmount      = received > cashNeeded ? received - cashNeeded : 0;
  const pendingBalance   = received < cashNeeded ? cashNeeded - received : 0;
  const validRows        = rows.filter(r => r.name && r.price > 0 && r.qty > 0);

  /* Performance: product maps */
  const productById   = useMemo(() => Object.fromEntries(products.map(p => [String(p.id), p])), [products]);
  const productByCode = useMemo(() => {
    const m = {};
    products.forEach(p => { if (p.product_code) m[String(p.product_code).toLowerCase()] = p; });
    return m;
  }, [products]);

  /* ══ EFFECTS ══ */
  useEffect(() => {
    const s = document.createElement("style");
    s.innerHTML = GLOBAL_CSS;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);

  useEffect(() => {
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then(res => { if (res.data.status) setCompanies(res.data.data || []); });
  }, []);

  useEffect(() => {
    if (!selectedCompany) return;
    api.get("/product/get", { params: { company_id: selectedCompany } })
      .then(r => {
        if (r.data.status) setProducts((r.data.data || []).filter(p => p.status === "active"));
      });
  }, [selectedCompany]);

  useEffect(() => { setRecentProducts(getRecent()); }, []);

  /* AI Suggestions effect */
  useEffect(() => {
    if (!selectedCompany) return;
    const cartProductIds = validRows.map(r => r.product_id).filter(Boolean);
    api.post("/ai/smart_suggest", {
      company_id: selectedCompany,
      customer_id: customer.id || 0,
      cart_product_ids: cartProductIds
    }).then(res => {
      if (res.data.status) setAiSuggestions(res.data.data || []);
    }).catch(() => {});
  }, [selectedCompany, customer.id, validRows.length]);

  /* AI Anomaly check effect */
  useEffect(() => {
    if (validRows.length === 0) {
      setAiAnomalies([]);
      return;
    }
    const timer = setTimeout(() => {
      api.post("/ai/detect_anomaly", {
        cart: validRows,
        total_amount: total
      }).then(res => {
        if (res.data.status) setAiAnomalies(res.data.anomalies || []);
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [validRows, total]);

  const handleAiCopilotSubmit = async (queryText) => {
    const text = queryText || aiPrompt;
    if (!text.trim() || !selectedCompany) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/copilot", {
        prompt: text,
        company_id: selectedCompany,
        cart: validRows
      });
      if (res.data.status) {
        showToast(res.data.message, "success");
        const actions = res.data.actions || [];
        const itemsToAdd = [];

        actions.forEach(act => {
          if (act.type === "add_item" && act.product) {
            itemsToAdd.push(act);
          } else if (act.type === "set_payment_method") {
            setPaymentMethod(act.value);
          } else if (act.type === "set_payment_type" && act.value === "credit") {
            if (Number(customer.credit_enabled) === 1) {
              setPaymentMethod("credit");
            } else {
              showToast("Credit sale requested but customer is not eligible.", "warning");
            }
          } else if (act.type === "set_customer" && act.customer) {
            setCustomer({
              id: act.customer.id,
              name: act.customer.name,
              phone: act.customer.phone,
              gst_no: act.customer.gst_no || "",
              credit_enabled: String(act.customer.credit_enabled || "0"),
              credit_limit: act.customer.credit_limit || 0,
              points: act.customer.points || 0,
              advance_balance: act.customer.advance_balance || 0,
              pending_amount: act.customer.pending_amount || 0,
            });
          }
        });

        if (itemsToAdd.length > 0) {
          addMultipleProducts(itemsToAdd);
        }

        setAiPrompt("");
      } else {
        showToast(res.data.message, "warning");
      }
    } catch (e) {
      showToast("AI Assistant unavailable. Try again.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  const startVoiceCommand = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      showToast("Speech Recognition not supported in browser", "warning");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setAiPrompt(transcript);
      setIsListening(false);
      handleAiCopilotSubmit(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  useEffect(() => {
    if (Number(customer.credit_enabled) !== 1 && paymentMethod === "credit") setPaymentMethod("cash");
  }, [customer.credit_enabled]);

  useEffect(() => {
    if (paymentMethod !== "credit") setPayment(p => ({ ...p, received: effectiveTotal }));
  }, [total, paymentMethod, advanceUsed]);

  /* Outside-click close */
  useEffect(() => {
    const handler = e => {
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target)) { setShowSuggest(false); setSuggestIndex(-1); }
      if (nameSuggestRef.current && !nameSuggestRef.current.contains(e.target)) setNameSuggestions([]);
      if (phoneSuggestRef.current && !phoneSuggestRef.current.contains(e.target)) setPhoneSuggestions([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Global keyboard shortcuts */
  useEffect(() => {
    const handler = e => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : '';
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

      if (e.key === "F2") { e.preventDefault(); globalSearchRef.current?.focus(); }
      if (e.key === "F3") { e.preventDefault(); document.getElementById("cust-name")?.focus(); }
      if (e.key === "F8") { e.preventDefault(); handleGenerateRef.current?.(); }
      if (e.key === "Escape") { setShowHelp(false); setShowSuggest(false); setSuggestIndex(-1); setShowNoResult(false); setShowQuickAdd(false); }

      if (!isInput && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const methods = ["cash", "online", "upi", "credit"];
        const targetMethod = methods[parseInt(e.key) - 1];
        if (targetMethod === "credit" && Number(customer.credit_enabled) !== 1) return;
        setPaymentMethod(targetMethod);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [customer]);

  /* ══ HELPERS ══ */
  const showToast = useCallback((msg, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  /* Frequent products derived from products + localStorage */
  const freqObjects = useMemo(() => {
    const freq = getFrequent();
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => productById[id])
      .filter(Boolean)
      .filter(p => p.status === "active");
  }, [productById]);

  /* ══ PRODUCT SEARCH ══ */
  const handleGlobalSearch = useCallback((value) => {
    setGlobalSearch(value);
    setShowNoResult(false);
    setShowQuickAdd(false);
    setSuggestIndex(-1);
    clearTimeout(searchTimer.current);

    if (!value.trim()) {
      const recent = getRecent().filter(p => productById[p.id] && productById[p.id].status === "active");
      const list = recent.length > 0 ? recent : products.filter(p => p.status === "active" && p.stock > 0).slice(0, 12);
      setGlobalSuggestions(list);
      setShowSuggest(list.length > 0);
      return;
    }

    searchTimer.current = setTimeout(() => {
      const q = value.toLowerCase();
      const filtered = products.filter(p =>
        p.status === "active" &&
        (p.product_name.toLowerCase().includes(q) || String(p.product_code || "").toLowerCase().includes(q))
      );
      setGlobalSuggestions(filtered.slice(0, 20));
      setShowSuggest(filtered.length > 0);
      if (filtered.length === 0) setShowNoResult(true);
    }, 200);
  }, [products, productById]);

  const handleSearchKeyDown = e => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIndex(i => Math.min(i + 1, globalSuggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSuggestIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestIndex >= 0 && globalSuggestions[suggestIndex]) { addOrMergeProduct(globalSuggestions[suggestIndex]); return; }
      const code = globalSearch.trim().toLowerCase();
      if (productByCode[code]) { addOrMergeProduct(productByCode[code]); return; }
      if (globalSuggestions.length > 0) addOrMergeProduct(globalSuggestions[0]);
    }
    else if (e.key === "Escape") { setShowSuggest(false); setSuggestIndex(-1); }
  };

  const addOrMergeProduct = useCallback((product, qtyToAdd = 1) => {
    if (!product) return;
    const p = productById[product.id] || productById[product.product_id] || product;
    const pid = p.id || p.product_id;
    const qtyNum = Number(qtyToAdd) || 1;

    setRows(prevRows => {
      const updated = [...prevRows];
      const existingIdx = updated.findIndex(r => String(r.product_id) === String(pid) && !r.isUnlisted);

      if (existingIdx !== -1) {
        const newQty = updated[existingIdx].qty + qtyNum;
        if (p.stock && newQty > Number(p.stock)) {
          showToast(`Only ${p.stock} in stock!`, "warning");
          return prevRows;
        }
        updated[existingIdx] = { ...updated[existingIdx], qty: newQty };
        showToast(`${p.product_name || p.name} qty → ${newQty}`, "success");
      } else {
        const newRow = {
          product_id: pid,
          name: p.product_name || p.name,
          product_code: p.product_code || "",
          price: Number(p.price),
          gst: Number(p.gst_percentage || p.gst || 0),
          qty: qtyNum,
          unit: p.unit || "",
          stock: Number(p.stock || 0),
          isUnlisted: false,
        };
        const lastEmptyIdx = updated.findLastIndex ? updated.findLastIndex(r => !r.name && !r.product_id) : updated.reduceRight((acc, r, i) => acc === -1 && (!r.name && !r.product_id) ? i : acc, -1);
        if (lastEmptyIdx !== -1) updated[lastEmptyIdx] = newRow;
        else updated.push(newRow);
        if (updated[updated.length - 1].name) updated.push(emptyRow());
      }
      return updated;
    });

    trackUsage(p);
    setRecentProducts(getRecent());
    setGlobalSearch("");
    setShowSuggest(false);
    setSuggestIndex(-1);
    setShowNoResult(false);
    justSelectedRef.current = true;
    globalSearchRef.current?.focus();
  }, [productById, showToast]);

  const addMultipleProducts = useCallback((itemsList) => {
    if (!itemsList || itemsList.length === 0) return;

    setRows(prevRows => {
      let updated = [...prevRows];
      itemsList.forEach(item => {
        const rawProduct = item.product || item;
        const qtyNum = Number(item.quantity || item.qty || 1);
        const p = productById[rawProduct.id] || productById[rawProduct.product_id] || rawProduct;
        const pid = p.id || p.product_id;

        const existingIdx = updated.findIndex(r => String(r.product_id) === String(pid) && !r.isUnlisted);

        if (existingIdx !== -1) {
          const newQty = updated[existingIdx].qty + qtyNum;
          updated[existingIdx] = { ...updated[existingIdx], qty: newQty };
        } else {
          const newRow = {
            product_id: pid,
            name: p.product_name || p.name,
            product_code: p.product_code || "",
            price: Number(p.price),
            gst: Number(p.gst_percentage || p.gst || 0),
            qty: qtyNum,
            unit: p.unit || "",
            stock: Number(p.stock || 0),
            isUnlisted: false,
          };
          const lastEmptyIdx = updated.findLastIndex ? updated.findLastIndex(r => !r.name && !r.product_id) : updated.reduceRight((acc, r, i) => acc === -1 && (!r.name && !r.product_id) ? i : acc, -1);
          if (lastEmptyIdx !== -1) updated[lastEmptyIdx] = newRow;
          else updated.push(newRow);
          if (updated[updated.length - 1].name) updated.push(emptyRow());
        }
        trackUsage(p);
      });
      return updated;
    });

    setRecentProducts(getRecent());
    setGlobalSearch("");
    setShowSuggest(false);
    setSuggestIndex(-1);
    setShowNoResult(false);
  }, [productById]);

  /* Quick Add */
  const addQuickItem = () => {
    if (!quickItem.name.trim() || !quickItem.price) { showToast("Enter name and price", "error"); return; }
    const newRow = {
      product_id: null, name: quickItem.name.trim(), product_code: "",
      price: Number(quickItem.price), gst: 0, qty: Number(quickItem.qty) || 1,
      unit: quickItem.unit, stock: 9999, isUnlisted: true,
    };
    const updated = [...rows];
    const lastEmptyIdx = updated.reduceRight((acc, r, i) => acc === -1 && (!r.name && !r.product_id) ? i : acc, -1);
    if (lastEmptyIdx !== -1) updated[lastEmptyIdx] = newRow;
    else updated.push(newRow);
    if (updated[updated.length - 1].name) updated.push(emptyRow());
    setRows(updated);
    setQuickItem({ name:"", price:"", qty:1, unit:"" });
    setShowQuickAdd(false);
    setGlobalSearch("");
    setShowNoResult(false);
    showToast(`"${newRow.name}" added to bill`, "success");
    globalSearchRef.current?.focus();
  };

  /* Row ops */
  const updateQty = (i, value) => {
    const num = Number(value);
    const updated = [...rows];
    if (updated[i].stock && !updated[i].isUnlisted && num > updated[i].stock) {
      showToast(`Only ${updated[i].stock} in stock!`, "warning");
      updated[i] = { ...updated[i], qty: updated[i].stock };
    } else {
      updated[i] = { ...updated[i], qty: num < 0 ? 0 : num };
    }
    setRows([...updated]);
  };

  const deleteRow = i => {
    if (rows.length === 1) { setRows([emptyRow()]); return; }
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const rowAmount = r => {
    const base = r.price * r.qty;
    return base + (billType === "gst_bill" ? (base * r.gst) / 100 : 0);
  };

  /* ══ CUSTOMER LOGIC ══ */
  const fetchCustomerById = async id => {
    try {
      const res = await api.get(`/customer/get_customer_by_id?id=${id}`);
      if (res.data.status && res.data.data) return res.data.data;
    } catch {}
    return null;
  };

  const selectCustomer = async c => {
    setCustomer(prev => ({ ...prev, id:c.id, name:c.name, phone:c.phone, gst_no:c.gst_no||"", credit_enabled:c.credit_enabled||"0", credit_limit:c.credit_limit||0, points:c.loyalty_points||0, advance_balance:parseFloat(c.advance_balance)||0, pending_amount:parseFloat(c.pending_amount)||0 }));
    setNameSuggestions([]); setPhoneSuggestions([]);
    const fresh = await fetchCustomerById(c.id);
    if (fresh) {
      const adv = parseFloat(fresh.advance_balance)||0, pending = parseFloat(fresh.pending_amount)||0, pts = parseInt(fresh.loyalty_points)||0;
      setCustomer({ id:fresh.id, name:fresh.name, phone:fresh.phone, gst_no:fresh.gst_no||"", credit_enabled:fresh.credit_enabled||"0", credit_limit:fresh.credit_limit||0, points:pts, advance_balance:adv, pending_amount:pending });
      const msgs = [];
      if (pts > 0) msgs.push(`${pts} loyalty pts`);
      if (adv > 0) msgs.push(`₹${adv.toFixed(2)} advance`);
      if (pending > 0) msgs.push(`₹${pending.toFixed(2)} pending`);
      showToast(msgs.length > 0 ? `Customer loaded — ${msgs.join(" · ")}` : "Customer selected", pending > 0 ? "warning" : "success");
    } else showToast("Customer selected", "success");
  };

  const handleNameSearch = value => {
    setCustomer(c => ({ ...c, name:value, id:null, credit_enabled:"0", advance_balance:0, pending_amount:0 }));
    clearTimeout(nameSearchTimer.current);
    if (!value || value.length < 2) { setNameSuggestions([]); return; }
    nameSearchTimer.current = setTimeout(async () => {
      if (!selectedCompany) return;
      setCustomerSearchLoading(true);
      try {
        const res = await api.get("/customer/customer_search", { params: { admin_id: adminId, q: value } });
        setNameSuggestions(res.data.status ? (res.data.data || []) : []);
      } catch { setNameSuggestions([]); }
      setCustomerSearchLoading(false);
    }, 300);
  };

  const handlePhoneSearch = value => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setCustomer(c => ({ ...c, phone:digits, id:null, name:c.id ? "" : c.name, credit_enabled:"0", advance_balance:0, pending_amount:0 }));
    setPhoneSuggestions([]);
    clearTimeout(phoneSearchTimer.current);
    if (digits.length < 3) return;
    phoneSearchTimer.current = setTimeout(async () => {
      if (!selectedCompany) return;
      setCustomerSearchLoading(true);
      try {
        if (digits.length === 10) {
          const res = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, q: value } });
          if (res.data.status && res.data.data) { await selectCustomer(res.data.data); setCustomerSearchLoading(false); return; }
        }
        const res = await api.get("/customer/customer_search", { params: { admin_id: adminId, q: value } });
        setPhoneSuggestions(res.data.status ? (res.data.data || []) : []);
      } catch { setPhoneSuggestions([]); }
      setCustomerSearchLoading(false);
    }, 300);
  };

  /* ══ GENERATE INVOICE ══ */
  const saveOrGetCustomer = async () => {
    if (customer.id) return customer.id;
    const res = await api.post("/customer/customer_save", { company_id: selectedCompany, admin_id: adminId, name: customer.name || "Customer", phone: customer.phone, gst_no: billType === "gst_bill" ? customer.gst_no : "" });
    if (res.data.status) return res.data.customer_id;
    throw new Error(res.data.message || "Failed to save customer");
  };

  const handleGenerate = async () => {
    if (!customer.name.trim() && !customer.phone.trim()) { showToast("Enter Customer Name or Phone!", "error"); return; }
    if (customer.phone.trim() && !/^[0-9]{10}$/.test(customer.phone)) { showToast("Enter valid 10-digit phone!", "error"); return; }
    if (billType === "gst_bill" && !customer.gst_no.trim()) { showToast("GST Number is mandatory for GST Bill!", "error"); return; }
    if (validRows.length === 0) { showToast("Add at least one product!", "error"); return; }
    if (paymentMethod !== "credit" && received <= 0 && advanceUsed < total) { showToast("Enter received amount!", "error"); return; }
    if (paymentMethod === "credit" && Number(customer.credit_enabled) === 1) {
      const limit = parseFloat(customer.credit_limit) || 0;
      if (limit > 0 && total > limit) { showToast(`Purchase ₹${total.toFixed(2)} exceeds credit limit ₹${limit.toLocaleString()}!`, "error"); return; }
    }
    if (!selectedCompany) { showToast("Please select company!", "error"); return; }
    setGenerating(true);
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      const customer_id = await saveOrGetCustomer();
      const res = await api.post("/invoice/create_invoice", {
        company_id: selectedCompany, customer_id,
        customer_name: customer.name, customer_phone: customer.phone,
        cashier_id: u.id, products: validRows,
        sub_total: subtotal, gst_total: gstTotal, total_amount: total,
        gst_type: billType === "gst_bill" ? "with_gst" : "without_gst",
        gst_no: billType === "gst_bill" ? customer.gst_no : "",
        paid_amount: paymentMethod === "credit" ? 0 : received,
        payment_method: paymentMethod,
        payment_type: paymentMethod === "credit" ? "credit" : "cash",
      });
      if (res.data.status) {
        const parts = [];
        if (res.data.advance_used > 0) parts.push(`₹${parseFloat(res.data.advance_used).toFixed(2)} advance used`);
        if (res.data.balance_amount > 0) parts.push(`₹${parseFloat(res.data.balance_amount).toFixed(2)} pending`);
        if (balance > 0 && res.data.advance_delta > 0) parts.push(`₹${parseFloat(res.data.advance_delta).toFixed(2)} added to advance`);
        showToast(parts.length > 0 ? `Invoice generated! ${parts.join(" · ")}` : "Invoice generated!", "success");
        setTimeout(() => navigate(`/invoice/${res.data.invoice_no}`), 900);
      } else showToast(res.data.message || "Something went wrong", "error");
    } catch (err) { showToast(err.message || "Server error. Try again!", "error"); }
    setGenerating(false);
  };

  /* Ref for keyboard shortcut access to handleGenerate */
  const handleGenerateRef = useRef(handleGenerate);
  useEffect(() => { handleGenerateRef.current = handleGenerate; });

  /* Payment method config */
  const paymentMethods = [
    { val:"cash",   label:"💵 Cash",   color:"#059669", bg:"#f0fdf4", border:"#bbf7d0", activeBg:"linear-gradient(135deg,#059669,#10b981)" },
    { val:"online", label:"🌐 Online", color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe", activeBg:"linear-gradient(135deg,#1d4ed8,#3b82f6)" },
    { val:"upi",    label:"📲 UPI",    color:"#7c3aed", bg:"#f5f3ff", border:"#ddd6fe", activeBg:"linear-gradient(135deg,#6d28d9,#8b5cf6)" },
    { val:"credit", label:"🧾 Credit", color:"#dc2626", bg:"#fef2f2", border:"#fecaca", activeBg:"linear-gradient(135deg,#dc2626,#ef4444)", disabled: Number(customer.credit_enabled) !== 1, disabledTitle: "Credit not enabled for this customer" },
  ];

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", background:"#f1f5fb", fontFamily:"'Outfit',sans-serif" }}>
      <Toast toasts={toasts}/>

      {/* ── Help Panel Overlay ── */}
      {showHelp && (
        <div style={{ position:"fixed", inset:0, zIndex:99997, background:"rgba(0,0,0,.4)" }} onClick={() => setShowHelp(false)}>
          <div className="help-panel" onClick={e => e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#312e81,#6366f1)", padding:"22px 24px", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#fff" }}>{HELP[helpLang].title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,.7)", marginTop:3 }}>{HELP[helpLang].subtitle}</div>
                </div>
                <button onClick={() => setShowHelp(false)} style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:10, padding:"7px 10px", cursor:"pointer", color:"#fff", display:"flex" }}>
                  <IconClose/>
                </button>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                {["en","ta"].map(lang => (
                  <button key={lang} onClick={() => setHelpLang(lang)} style={{
                    padding:"6px 18px", borderRadius:20, border:"1.5px solid rgba(255,255,255,.4)",
                    background: helpLang === lang ? "#fff" : "transparent",
                    color: helpLang === lang ? "#4338ca" : "rgba(255,255,255,.85)",
                    fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif", transition:"all .2s",
                  }}>
                    {lang === "en" ? "English" : "தமிழ்"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"16px 20px" }}>
              {HELP[helpLang].sections.map((sec, si) => (
                <div key={si} style={{ marginBottom:22 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"#312e81", marginBottom:10, paddingBottom:6, borderBottom:"2px solid #e0e7ff" }}>{sec.heading}</div>
                  {sec.items.map((item, ii) => (
                    <div key={ii} style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:8 }}>
                      <span className="kbd" style={{ flexShrink:0, minWidth:70, textAlign:"center" }}>{item.key}</span>
                      <span style={{ fontSize:13, color:"#475569", lineHeight:1.5 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Help Button ── */}
      <button
        onClick={() => setShowHelp(true)}
        title="Billing Help Guide (English / தமிழ்)"
        style={{
          position:"fixed", bottom:28, right:28, zIndex:9990,
          width:52, height:52, borderRadius:"50%", border:"none",
          background:"linear-gradient(135deg,#4338ca,#6366f1)",
          color:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 8px 24px rgba(99,102,241,.45)", transition:"all .2s",
          animation:"pulseGlow 3s infinite",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >
        <IconHelp/>
      </button>

      {/* ── Top Header ── */}
      <div style={{ background:"linear-gradient(135deg,#312e81 0%,#4338ca 50%,#6366f1 100%)", padding:"22px 32px 60px", position:"relative", overflow:"hidden" }}>
        {[{s:200,t:-60,r:-50,op:.08},{s:120,t:10,r:160,op:.06},{s:70,b:-20,l:80,op:.07}].map((c,i) => (
          <div key={i} style={{ position:"absolute", top:c.t, right:c.r, bottom:c.b, left:c.l, width:c.s, height:c.s, borderRadius:"50%", background:`rgba(255,255,255,${c.op})`, pointerEvents:"none" }}/>
        ))}
        <div style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", fontFamily:"'Syne',sans-serif", letterSpacing:"-.02em" }}>Invoice Billing</h1>
            <p style={{ fontSize:13, color:"rgba(255,255,255,.65)", marginTop:4, fontWeight:400, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span className="kbd" style={{ background:"rgba(255,255,255,.2)", color:"#fff", borderColor:"rgba(255,255,255,.3)" }}>F2</span> Product Search &nbsp;
              <span className="kbd" style={{ background:"rgba(255,255,255,.2)", color:"#fff", borderColor:"rgba(255,255,255,.3)" }}>F3</span> Customer &nbsp;
              <span className="kbd" style={{ background:"rgba(255,255,255,.2)", color:"#fff", borderColor:"rgba(255,255,255,.3)" }}>F8</span> Generate &nbsp;
              <span style={{ opacity:.6 }}>· Click ? for full guide</span>
            </p>
          </div>

          {/* Company Select */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:2 }}>Company</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"8px" }}>
              {companies.map(c => {
                const isActive = Number(selectedCompany) === Number(c.id);
                return (
                  <button key={c.id} onClick={() => { setSelectedCompany(c.id); localStorage.setItem("selected_company_id", c.id); }} style={{
                    padding:"7px 16px", borderRadius:"10px", fontSize:"13px", fontWeight:"600", cursor:"pointer", transition:"all 0.2s ease",
                    border: isActive ? "2px solid #fff" : "1.5px solid rgba(255,255,255,0.3)",
                    backgroundColor: isActive ? "#ffffff" : "rgba(255,255,255,0.12)",
                    color: isActive ? "#1e3a5f" : "rgba(255,255,255,0.85)",
                    display:"flex", alignItems:"center", gap:"5px",
                  }}>🏢 {c.company_name}</button>
                );
              })}
            </div>
          </div>

          {/* Bill Type */}
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <label style={{ fontSize:10.5, fontWeight:700, color:"rgba(255,255,255,.7)", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Bill Type</label>
            <select className="bill-type-dropdown" value={billType} onChange={e => setBillType(e.target.value)}>
              <option value="cash_bill">Cash Bill</option>
              <option value="gst_bill">GST Bill</option>
            </select>
            <div style={{ display:"inline-flex", alignItems:"center", gap:5, marginTop:6, background:"rgba(255,255,255,.15)", borderRadius:20, padding:"3px 10px", fontSize:11, color:"rgba(255,255,255,.8)", fontWeight:600 }}>
              {billType === "gst_bill" ? <><IconGST/> GST will be calculated</> : <>No GST on this bill</>}
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Billing Copilot & Smart Bar ── */}
      <div style={{ padding: "0 28px", marginTop: -30, marginBottom: 18, position: "relative", zIndex: 1001 }}>
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "16px 20px",
          boxShadow: "0 10px 30px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.04)",
          border: "1.5px solid #c7d2fe",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {/* Top row: AI Copilot Prompt Input & Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#fff",
              padding: "7px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "800",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)"
            }}>
              <span>✨ AI Billing Copilot</span>
            </div>

            <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
              <input
                type="text"
                placeholder='Type or speak command e.g. "Add 5 kg Sonamasuri Rice", "Apply 10% discount", "Payment UPI"...'
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAiCopilotSubmit(); }}
                className="bill-input"
                style={{
                  paddingRight: "85px",
                  fontSize: "13.5px",
                  borderColor: "#c7d2fe",
                  background: "#fdf8ff",
                  borderRadius: "12px"
                }}
              />
              <div style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={startVoiceCommand}
                  title="Speak voice command"
                  style={{
                    background: isListening ? "#ef4444" : "#e0e7ff",
                    color: isListening ? "#fff" : "#4338ca",
                    border: "none",
                    borderRadius: "8px",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    transition: "all 0.2s"
                  }}
                >
                  {isListening ? "🔴" : "🎙️"}
                </button>
                <button
                  type="button"
                  onClick={() => handleAiCopilotSubmit()}
                  disabled={aiLoading}
                  style={{
                    background: "linear-gradient(135deg, #4338ca, #6366f1)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0 12px",
                    height: "32px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  {aiLoading ? "..." : "Run"}
                </button>
              </div>
            </div>
          </div>

          {/* AI Anomalies Warnings */}
          {aiAnomalies.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {aiAnomalies.map((anom, idx) => (
                <div key={idx} style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: anom.type === "error" || anom.type === "danger" ? "#fef2f2" : anom.type === "warning" ? "#fffbeb" : "#eff6ff",
                  color: anom.type === "error" || anom.type === "danger" ? "#b91c1c" : anom.type === "warning" ? "#b45309" : "#1d4ed8",
                  border: `1px solid ${anom.type === "error" || anom.type === "danger" ? "#fecaca" : anom.type === "warning" ? "#fde68a" : "#bfdbfe"}`
                }}>
                  <span>{anom.type === "error" || anom.type === "danger" ? "🚨" : "⚠️"}</span>
                  <div>
                    <strong>{anom.title}:</strong> {anom.message}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* AI Smart Product Recommendations */}
          {aiSuggestions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                💡 AI Smart Add-ons:
              </span>
              {aiSuggestions.map(sug => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => addOrMergeProduct(sug)}
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <span>+ {sug.product_name}</span>
                  <span style={{ color: "#059669", fontSize: "11px", fontWeight: "900" }}>₹{Number(sug.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-column Layout ── */}
      <div style={{ padding:"0 28px 80px", marginTop: 0 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:18, alignItems:"start" }}>

          {/* LEFT: Customer + Products */}
          <div>
            {/* ══ CUSTOMER CARD ══ */}
            <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 24px rgba(99,102,241,.1), 0 1px 4px rgba(0,0,0,.05)", border:"1.5px solid rgba(199,210,254,.5)", padding:"22px 24px", marginBottom:18, overflow:"visible", position:"relative", zIndex:1000, animation:"slideDown .4s ease both" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#4338ca,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 10px rgba(99,102,241,.35)" }}><IconUser/></div>
                  <span style={{ fontWeight:700, fontSize:14, color:"#312e81", letterSpacing:".04em", textTransform:"uppercase" }}>Customer Details</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  {customer.id && pendingAmount > 0 && <div style={{ display:"flex", alignItems:"center", gap:6, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:700, color:"#dc2626" }}>⚠️ Pending: ₹{pendingAmount.toFixed(2)}</div>}
                  {customer.id && advanceAvailable > 0 && <div style={{ display:"flex", alignItems:"center", gap:6, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:700, color:"#059669" }}>💰 Advance: ₹{advanceAvailable.toFixed(2)}</div>}
                  {customer.id && Number(customer.credit_enabled) === 1 && <div style={{ display:"flex", alignItems:"center", gap:6, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:700, color:"#dc2626" }}>🧾 Credit {customer.credit_limit > 0 && `· ₹${Number(customer.credit_limit).toLocaleString()}`}</div>}
                  {customer.id && <div style={{ display:"flex", alignItems:"center", gap:6, background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:700, color:"#059669" }}><span style={{ width:7, height:7, borderRadius:"50%", background:"#10b981", display:"inline-block" }}/>Existing</div>}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                {/* Name */}
                <div ref={nameSuggestRef} style={{ position:"relative" }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"#6366f1", letterSpacing:".08em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    Customer Name * <span className="kbd">F3</span>
                  </label>
                  <input id="cust-name" className="bill-input" placeholder="Search or enter customer name" value={customer.name} onChange={e => handleNameSearch(e.target.value)} onFocus={() => { if (customer.name.length >= 2) handleNameSearch(customer.name); }}/>
                  {customer.points > 0 && <div style={{ marginTop:6, fontSize:12, color:"#059669", fontWeight:600 }}>⭐ Loyalty Points: {customer.points}</div>}
                  {nameSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#fff", border:"1.5px solid #c7d2fe", borderRadius:12, zIndex:9999, maxHeight:200, overflowY:"auto", boxShadow:"0 12px 40px rgba(99,102,241,.2)", animation:"slideDown .2s ease both" }}>
                      {nameSuggestions.map(c => (
                        <div key={c.id} className="customer-suggest-item" onMouseDown={() => selectCustomer(c)}>
                          <div style={{ fontWeight:700, color:"#1e293b", fontSize:13.5 }}>{c.name}</div>
                          <div style={{ display:"flex", alignItems:"center", gap:5, marginTop:2 }}>
                            <IconPhone/>
                            <span style={{ fontSize:12, color:"#64748b" }}>{c.phone}</span>
                            {parseFloat(c.advance_balance) > 0 && <span style={{ fontSize:10, fontWeight:700, background:"#f0fdf4", color:"#059669", borderRadius:6, padding:"1px 7px", marginLeft:4, border:"1px solid #bbf7d0" }}>₹{parseFloat(c.advance_balance).toFixed(0)} adv</span>}
                            {parseFloat(c.pending_amount) > 0 && <span style={{ fontSize:10, fontWeight:700, background:"#fef2f2", color:"#dc2626", borderRadius:6, padding:"1px 7px", marginLeft:4, border:"1px solid #fecaca" }}>₹{parseFloat(c.pending_amount).toFixed(0)} due</span>}
                            {c.credit_enabled === "1" && <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", background:"#fef2f2", color:"#dc2626", borderRadius:6, padding:"1px 7px", marginLeft:4, border:"1px solid #fecaca" }}>Credit</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {customerSearchLoading && <div style={{ position:"absolute", right:12, top:"50%", marginTop:8 }}><span style={{ width:14, height:14, border:"2px solid #c7d2fe", borderTopColor:"#6366f1", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/></div>}
                </div>

                {/* Phone */}
                <div ref={phoneSuggestRef} style={{ position:"relative" }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"#6366f1", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>Phone Number *</label>
                  <div style={{ position:"relative" }}>
                    <input className="bill-input" placeholder="10-digit phone" value={customer.phone} maxLength={10} onChange={e => handlePhoneSearch(e.target.value)}/>
                    {customerSearchLoading && <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, border:"2px solid #c7d2fe", borderTopColor:"#6366f1", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>}
                  </div>
                  {phoneSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#fff", border:"1.5px solid #c7d2fe", borderRadius:12, zIndex:9999, maxHeight:200, overflowY:"auto", boxShadow:"0 12px 40px rgba(99,102,241,.2)", animation:"slideDown .2s ease both" }}>
                      {phoneSuggestions.map(c => (
                        <div key={c.id} className="customer-suggest-item" onMouseDown={() => selectCustomer(c)}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}><IconPhone/><span style={{ fontWeight:700, color:"#1e293b", fontSize:13.5 }}>{c.phone}</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {billType === "gst_bill" && (
                <div style={{ animation:"slideDown .25s ease both" }}>
                  <label style={{ fontSize:11, fontWeight:600, color:"#d97706", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>GST Number * <span style={{ fontSize:10, color:"#dc2626", fontWeight:600, textTransform:"none" }}>(mandatory for GST Bill)</span></label>
                  <div style={{ position:"relative" }}>
                    <input className="bill-input" placeholder="e.g. 29ABCDE1234F1Z5" value={customer.gst_no} maxLength={15} onChange={e => setCustomer(c => ({ ...c, gst_no: e.target.value.toUpperCase() }))} style={{ borderColor: customer.gst_no ? "#f59e0b" : "#e2e8f0", background: customer.gst_no ? "#fffbeb" : undefined, fontWeight: customer.gst_no ? 700 : 400, letterSpacing: customer.gst_no ? ".05em" : 0 }}/>
                    {customer.gst_no && <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:10, fontWeight:700, color:"#d97706", background:"#fef3c7", borderRadius:6, padding:"2px 8px", border:"1px solid #fde68a" }}>{customer.gst_no.length}/15</span>}
                  </div>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:5 }}>Format: 2-digit state code + PAN + entity + Z + checksum (15 chars)</div>
                </div>
              )}
            </div>

            {/* ══ PRODUCTS CARD ══ */}
            <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 24px rgba(99,102,241,.1), 0 1px 4px rgba(0,0,0,.05)", border:"1.5px solid rgba(199,210,254,.5)", marginBottom:18, overflow:"visible", position:"relative", zIndex:1, animation:"slideDown .4s ease .05s both" }}>
              {/* Header */}
              <div style={{ padding:"18px 24px 14px", borderBottom:"1.5px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#4338ca,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 10px rgba(99,102,241,.35)" }}><IconBox/></div>
                  <span style={{ fontWeight:700, fontSize:14, color:"#312e81", letterSpacing:".04em", textTransform:"uppercase" }}>Products</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {billType === "gst_bill" && <span style={{ fontSize:11, fontWeight:700, color:"#d97706", background:"#fef3c7", borderRadius:20, padding:"4px 12px", border:"1px solid #fde68a" }}>GST Inclusive</span>}
                  <span style={{ fontSize:11.5, fontWeight:700, color:"#6366f1", background:"#eef2ff", borderRadius:20, padding:"4px 12px", border:"1px solid #c7d2fe" }}>{validRows.length} item{validRows.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* ── GLOBAL SEARCH BAR ── */}
              <div style={{ padding:"16px 20px 0", position:"relative" }} ref={suggestBoxRef}>
                <div style={{ position:"relative" }}>
                  <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex", zIndex:1 }}><IconSearch/></div>
                  <input
                    ref={globalSearchRef}
                    id="global-product-search"
                    className="global-search-input"
                    placeholder="Search by name or scan barcode… (F2)"
                    value={globalSearch}
                    onChange={e => handleGlobalSearch(e.target.value)}
                    onFocus={() => {
                      if (justSelectedRef.current) {
                        justSelectedRef.current = false;
                        return;
                      }
                      handleGlobalSearch(globalSearch);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    autoComplete="off"
                  />
                  <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ display:"flex", alignItems:"center", gap:4, background:"#f1f5f9", borderRadius:8, padding:"3px 9px", fontSize:11, fontWeight:600, color:"#64748b" }}>
                      <IconBarcode/> Barcode OK
                    </span>
                    <span className="kbd">F2</span>
                  </div>
                </div>

                {/* Dropdown */}
                {showSuggest && globalSuggestions.length > 0 && (
                  <div style={{ position:"absolute", top:"calc(100% + 2px)", left:20, right:20, background:"#fff", border:"1.5px solid #c7d2fe", borderRadius:"0 0 14px 14px", zIndex:9999, maxHeight:280, overflowY:"auto", boxShadow:"0 16px 48px rgba(99,102,241,.2)", animation:"slideDown .2s ease both" }}>
                    {!globalSearch.trim() && recentProducts.length > 0 && (
                      <div style={{ padding:"8px 14px 4px", fontSize:10.5, fontWeight:700, color:"#94a3b8", letterSpacing:".08em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:5 }}>
                        <IconClock/> Recent
                      </div>
                    )}
                    {globalSuggestions.map((s, idx) => (
                      <div key={s.id} className={`suggest-item${suggestIndex === idx ? " active-suggest" : ""}`} onMouseDown={() => addOrMergeProduct(s)} style={{ background: suggestIndex === idx ? "#eef2ff" : undefined }}>
                        <div style={{ display:"flex", flexDirection:"column" }}>
                          <span style={{ fontWeight:600, fontSize:14 }}>{s.product_name}</span>
                          <span style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>
                            {s.product_code && <span style={{ background:"#f1f5f9", borderRadius:4, padding:"1px 5px", marginRight:5, fontFamily:"monospace" }}>#{s.product_code}</span>}
                            {s.unit}
                          </span>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3, flexShrink:0 }}>
                          <span style={{ fontWeight:800, color:"#4338ca", fontSize:14 }}>₹{Number(s.price).toFixed(2)}</span>
                          <span style={{ fontSize:11, fontWeight:700, color: s.stock < 5 ? "#ef4444" : "#059669", background: s.stock < 5 ? "#fef2f2" : "#f0fdf4", borderRadius:6, padding:"2px 8px" }}>Stock: {s.stock}</span>
                        </div>
                      </div>
                    ))}
                    {!globalSearch.trim() && freqObjects.length > 0 && (
                      <>
                        <div style={{ padding:"8px 14px 4px", fontSize:10.5, fontWeight:700, color:"#94a3b8", letterSpacing:".08em", textTransform:"uppercase", display:"flex", alignItems:"center", gap:5, borderTop:"1px solid #f1f5f9", marginTop:4 }}>
                          <IconStar/> Frequent
                        </div>
                        {freqObjects.map(s => (
                          <div key={`freq-${s.id}`} className="suggest-item" onMouseDown={() => addOrMergeProduct(s)}>
                            <span style={{ fontWeight:600, fontSize:13.5 }}>{s.product_name}</span>
                            <span style={{ fontWeight:800, color:"#4338ca", fontSize:13.5 }}>₹{Number(s.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* No result banner */}
                {showNoResult && (
                  <div style={{ marginTop:10, marginBottom:4, animation:"quickAddPop .25s ease both" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fef9ec", border:"1.5px solid #fde68a", borderRadius:12, padding:"12px 16px" }}>
                      <div>
                        <div style={{ fontWeight:700, color:"#92400e", fontSize:13 }}>🔍 "{globalSearch}" — product not found</div>
                        <div style={{ fontSize:12, color:"#b45309", marginTop:2 }}>Add as unlisted item to this bill only</div>
                      </div>
                      <button onClick={() => { setShowQuickAdd(true); setQuickItem({ name:globalSearch.trim(), price:"", qty:1, unit:"" }); }} style={{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#d97706,#f59e0b)", border:"none", borderRadius:10, padding:"8px 16px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif", transition:"all .2s" }}
                        onMouseEnter={e => e.currentTarget.style.transform="scale(1.04)"}
                        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
                        <IconPlus/> Quick Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Add form */}
                {showQuickAdd && (
                  <div style={{ margin:"10px 0 4px", background:"#fffbeb", border:"1.5px solid #fde68a", borderRadius:14, padding:"16px 18px", animation:"quickAddPop .2s ease both" }}>
                    <div style={{ fontWeight:800, color:"#92400e", fontSize:13.5, marginBottom:12 }}>
                      ➕ Add Unlisted Item to Bill <span style={{ fontSize:11, fontWeight:400, color:"#b45309" }}>(bill-only)</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px auto", gap:10, alignItems:"flex-end" }}>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#92400e", display:"block", marginBottom:5 }}>Item Name *</label>
                        <input className="bill-input" placeholder="Product name" value={quickItem.name} onChange={e => setQuickItem(q => ({ ...q, name:e.target.value }))} style={{ borderColor:"#fde68a" }}/>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#92400e", display:"block", marginBottom:5 }}>Price (₹) *</label>
                        <input type="number" className="bill-input" placeholder="0.00" value={quickItem.price} onChange={e => setQuickItem(q => ({ ...q, price:e.target.value }))} style={{ borderColor:"#fde68a" }}/>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#92400e", display:"block", marginBottom:5 }}>Unit</label>
                        <select className="bill-type-dropdown" value={quickItem.unit} onChange={e => setQuickItem(q => ({ ...q, unit:e.target.value }))} style={{ borderColor:"#fde68a", background:"#fff" }}>
                          <option value="">Select Unit</option>
                          <option value="Piece">Piece</option>
                          <option value="Kg">Kg</option>
                          <option value="Gram">Gram</option>
                          <option value="Litre">Litre</option>
                          <option value="ML">ML</option>
                          <option value="Meter">Meter</option>
                          <option value="Feet">Feet</option>
                          <option value="Box">Box</option>
                          <option value="Pack">Pack</option>
                          <option value="Dozen">Dozen</option>
                          <option value="Pair">Pair</option>
                          <option value="Roll">Roll</option>
                          <option value="Bag">Bag</option>
                          <option value="Bottle">Bottle</option>
                          <option value="Can">Can</option>
                          <option value="Set">Set</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:600, color:"#92400e", display:"block", marginBottom:5 }}>Qty</label>
                        <input type="number" className="bill-input" placeholder="1" value={quickItem.qty} min={1} onChange={e => setQuickItem(q => ({ ...q, qty:e.target.value }))} style={{ borderColor:"#fde68a" }}/>
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={addQuickItem} style={{ background:"linear-gradient(135deg,#059669,#10b981)", border:"none", borderRadius:10, padding:"9px 14px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif", whiteSpace:"nowrap" }}>Add</button>
                        <button onClick={() => { setShowQuickAdd(false); setShowNoResult(false); setGlobalSearch(""); }} style={{ background:"transparent", border:"1.5px solid #fde68a", borderRadius:10, padding:"9px 10px", color:"#92400e", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif" }}>✕</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Column headers */}
              <div style={{ display:"grid", gridTemplateColumns:"2fr 90px 100px 80px 110px 36px", gap:8, padding:"12px 20px 8px", background:"#f8faff", borderBottom:"1.5px solid #f1f5f9", marginTop:12 }}>
                {["Product","Qty","Price (₹)", billType === "gst_bill" ? "GST %" : "—","Amount (₹)",""].map((h,i) => (
                  <span key={i} style={{ fontSize:10.5, fontWeight:700, color:"#6366f1", letterSpacing:".09em", textTransform:"uppercase", textAlign: i > 0 ? "center" : "left" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ padding:"8px 12px", minHeight:60 }}>
                {validRows.length === 0 && (
                  <div style={{ textAlign:"center", padding:"32px 0", color:"#94a3b8", fontSize:14 }}>
                    <div style={{ fontSize:40, marginBottom:10 }}>🛒</div>
                    Use the search bar above to add products
                    <div style={{ fontSize:12, marginTop:6 }}>Press <span className="kbd">F2</span> to focus search · Scan barcode to add instantly</div>
                  </div>
                )}
                {rows.map((r, i) => {
                  if (!r.name && !r.product_id) return null;
                  return (
                    <div key={i} className="row-enter" style={{ display:"grid", gridTemplateColumns:"2fr 90px 100px 80px 110px 36px", gap:8, alignItems:"center", padding:"9px 8px", borderBottom: i < rows.length - 1 ? "1px dashed #e2e8f0" : "none", borderRadius:12, background: r.isUnlisted ? "rgba(255,251,235,.7)" : "rgba(238,242,255,.3)", transition:"background .2s" }}>
                      <div>
                        <div style={{ fontWeight:600, fontSize:13.5, color:"#1e293b" }}>{r.name}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                          {r.product_code && <span style={{ fontSize:10, color:"#94a3b8", background:"#f1f5f9", borderRadius:4, padding:"1px 5px", fontFamily:"monospace" }}>#{r.product_code}</span>}
                          {r.unit && <span style={{ fontSize:10, color:"#94a3b8" }}>{r.unit}</span>}
                          {r.isUnlisted && <span style={{ fontSize:10, fontWeight:700, color:"#b45309", background:"#fef3c7", borderRadius:4, padding:"1px 6px", border:"1px solid #fde68a" }}>Unlisted</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <input type="number" className="bill-input" value={r.qty} min={0} onChange={e => updateQty(i, e.target.value)} onWheel={e => e.target.blur()} style={{ textAlign:"center", width:70, padding:"8px 6px", fontSize:14, fontWeight:700 }}/>
                      </div>
                      <div style={{ textAlign:"center" }}>
                        <span style={{ fontSize:14.5, fontWeight:700, color:"#1e293b", display:"block" }}>{r.price > 0 ? `₹${r.price.toFixed(2)}` : <span style={{color:"#cbd5e1"}}>—</span>}</span>
                        {r.qty > 1 && r.price > 0 && <span style={{ fontSize:10.5, color:"#94a3b8" }}>×{r.qty} = ₹{(r.price * r.qty).toFixed(2)}</span>}
                      </div>
                      <div style={{ textAlign:"center" }}>
                        {billType === "gst_bill" && r.gst > 0 ? (
                          <div>
                            <span style={{ fontSize:13, fontWeight:700, color:"#d97706", background:"#fef3c7", borderRadius:8, padding:"3px 10px", display:"inline-block", border:"1px solid #fde68a" }}>{r.gst}%</span>
                            {r.price > 0 && <span style={{ fontSize:10.5, color:"#94a3b8", display:"block", marginTop:2 }}>₹{((r.price * r.qty * r.gst) / 100).toFixed(2)}</span>}
                          </div>
                        ) : <span style={{ color:"#cbd5e1", fontSize:13 }}>—</span>}
                      </div>
                      <div style={{ textAlign:"center" }}>
                        {r.price > 0 ? <span style={{ fontSize:15, fontWeight:800, color:"#4338ca" }}>₹{rowAmount(r).toFixed(2)}</span> : <span style={{ color:"#cbd5e1" }}>—</span>}
                      </div>
                      <button className="del-btn" onClick={() => deleteRow(i)}>×</button>
                    </div>
                  );
                })}
              </div>

              {/* Add unlisted item button */}
              <div style={{ padding:"10px 20px 18px" }}>
                <button onClick={() => { setShowNoResult(true); setShowQuickAdd(true); setQuickItem({ name:"", price:"", qty:1, unit:"" }); setGlobalSearch(""); globalSearchRef.current?.focus(); }}
                  style={{ display:"flex", alignItems:"center", gap:7, background:"transparent", border:"1.5px dashed #fde68a", borderRadius:12, padding:"9px 18px", cursor:"pointer", color:"#b45309", fontWeight:600, fontSize:13.5, fontFamily:"'Outfit',sans-serif", transition:"all .2s" }}
                  onMouseEnter={e => e.currentTarget.style.background="#fffbeb"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:18, lineHeight:1 }}>+</span> Add Unlisted Item
                </button>
              </div>
            </div>
          </div>{/* end left column */}

          {/* ── RIGHT: Sticky Payment Panel ── */}
          <div style={{ position:"sticky", top:16 }}>
            <div style={{ background:"#fff", borderRadius:20, boxShadow:"0 4px 24px rgba(99,102,241,.1)", border:"1.5px solid rgba(199,210,254,.5)", padding:"22px 24px", animation:"slideUp .4s ease .15s both" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#4338ca,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center" }}><IconCard/></div>
                <span style={{ fontWeight:700, fontSize:14, color:"#312e81", letterSpacing:".04em", textTransform:"uppercase" }}>Payment</span>
                <span style={{ marginLeft:"auto" }}><span className="kbd">F8</span></span>
              </div>

              {/* Totals */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#64748b", fontSize:14 }}>Sub Total <span style={{ fontSize:11, color:"#94a3b8" }}>(excl. GST)</span></span>
                <span style={{ fontWeight:700, color:"#1e293b", fontSize:14 }}>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:"#64748b", fontSize:14 }}>GST Total{billType === "cash_bill" && <span style={{ fontSize:11, color:"#94a3b8", marginLeft:5 }}>(Cash Bill)</span>}</span>
                <span style={{ fontWeight:700, color: billType === "gst_bill" ? "#d97706" : "#94a3b8", fontSize:14 }}>{billType === "gst_bill" ? `₹${gstTotal.toFixed(2)}` : "—"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", background:"linear-gradient(135deg,#eef2ff,#e0e7ff)", borderRadius:12, padding:"12px 16px", marginBottom:12, border:"1.5px solid #c7d2fe" }}>
                <span style={{ fontWeight:800, color:"#312e81", fontSize:16 }}>Grand Total</span>
                <span style={{ fontWeight:900, color:"#4338ca", fontSize:18 }}>₹{total.toFixed(2)}</span>
              </div>

              {/* Advance */}
              {advanceAvailable > 0 && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:12, padding:"10px 14px", marginBottom:12, animation:"slideDown .25s ease both" }}>
                  <div>
                    <div style={{ fontWeight:700, color:"#059669", fontSize:13 }}>💰 Advance Balance Applied</div>
                    <div style={{ fontSize:12, color:"#10b981", marginTop:2 }}>Auto-deducted from this invoice</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900, color:"#059669", fontSize:15 }}>−₹{advanceUsed.toFixed(2)}</div>
                    {advanceAvailable > advanceUsed && <div style={{ fontSize:11, color:"#6ee7b7" }}>₹{(advanceAvailable - advanceUsed).toFixed(2)} remaining</div>}
                  </div>
                </div>
              )}
              {advanceUsed > 0 && paymentMethod !== "credit" && (
                <div style={{ display:"flex", justifyContent:"space-between", background:"#fffbeb", borderRadius:10, padding:"10px 14px", border:"1.5px solid #fde68a", marginBottom:12 }}>
                  <span style={{ fontWeight:700, color:"#92400e", fontSize:14 }}>To Collect Now</span>
                  <span style={{ fontWeight:900, color:"#d97706", fontSize:16 }}>₹{effectiveTotal > 0 ? effectiveTotal.toFixed(2) : "0.00"}</span>
                </div>
              )}

              <div style={{ marginBottom:16, fontSize:13, color:"#6366f1", fontWeight:600 }}>🎁 You will earn: {earnedPoints} points</div>

              {/* Payment methods */}
              <label style={{ fontSize:11, fontWeight:600, color:"#6366f1", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
                Payment Method <span style={{ fontSize:10, color:"#94a3b8", fontWeight:400, textTransform:"none", letterSpacing:0 }}>(keys 1 2 3 4)</span>
              </label>
              {customer.id && Number(customer.credit_enabled) !== 1 && (
                <div style={{ fontSize:11.5, color:"#94a3b8", fontWeight:500, background:"#f8faff", borderRadius:8, padding:"6px 12px", marginBottom:10, border:"1px solid #e2e8f0" }}>💡 Credit disabled for this customer</div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                {paymentMethods.map((m, idx) => (
                  <button key={m.val} className="pay-method-btn" disabled={m.disabled} title={m.disabled ? m.disabledTitle : `Press ${idx+1}`}
                    onClick={() => !m.disabled && setPaymentMethod(m.val)}
                    style={{ border: paymentMethod === m.val ? "2px solid transparent" : `1.5px solid ${m.border}`, background: paymentMethod === m.val ? m.activeBg : m.bg, color: paymentMethod === m.val ? "#fff" : m.color, boxShadow: paymentMethod === m.val ? "0 4px 14px rgba(0,0,0,.15)" : "none", transform: paymentMethod === m.val ? "scale(1.03)" : "scale(1)" }}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Credit info */}
              {paymentMethod === "credit" && (
                <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:12, padding:"12px 14px", marginBottom:16, animation:"slideDown .25s ease both" }}>
                  <span style={{ fontSize:18, lineHeight:1 }}>⚠️</span>
                  <div>
                    <div style={{ fontWeight:700, color:"#dc2626", fontSize:13 }}>Credit Sale</div>
                    <div style={{ fontSize:12, color:"#ef4444", marginTop:2 }}>
                      {advanceUsed > 0 ? `Outstanding: ₹${effectiveTotal.toFixed(2)} (after ₹${advanceUsed.toFixed(2)} advance).` : `Full ₹${total.toFixed(2)} recorded as outstanding.`}
                      {customer.credit_limit > 0 && <span style={{ display:"block", marginTop:4, fontWeight:700 }}>Credit Limit: ₹{Number(customer.credit_limit).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Amount received */}
              {paymentMethod !== "credit" && (
                <>
                  <label style={{ fontSize:11, fontWeight:600, color:"#6366f1", letterSpacing:".08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>
                    {advanceUsed > 0 ? `Cash to Collect (₹${effectiveTotal > 0 ? effectiveTotal.toFixed(2) : "0.00"} needed)` : "Amount Received (₹)"}
                  </label>
                  <input type="number" className="bill-input" placeholder={`₹${effectiveTotal > 0 ? effectiveTotal.toFixed(2) : "0.00"}`} value={payment.received} readOnly onWheel={e => e.target.blur()} style={{ fontSize:16, fontWeight:700, marginBottom:12, background:"#f8fafc", cursor:"not-allowed" }}/>

                  {customer.id && (pendingAmount > 0 || advanceAvailable > 0) && (
                    <div style={{ borderRadius:12, overflow:"hidden", border:"1.5px solid #e2e8f0", marginBottom:12, animation:"slideDown .25s ease both" }}>
                      <div style={{ background:"#f8faff", padding:"8px 14px", borderBottom:"1px solid #e2e8f0", fontSize:10.5, fontWeight:700, color:"#6366f1", letterSpacing:".08em", textTransform:"uppercase" }}>Customer Account Summary</div>
                      <div style={{ display:"grid", gridTemplateColumns: pendingAmount > 0 && advanceAvailable > 0 ? "1fr 1fr" : "1fr" }}>
                        {pendingAmount > 0 && <div style={{ padding:"12px 14px", background:"#fef2f2", borderRight: advanceAvailable > 0 ? "1px solid #fecaca" : "none" }}><div style={{ fontSize:11, color:"#ef4444", fontWeight:600, marginBottom:4 }}>⚠️ Previous Pending</div><div style={{ fontSize:18, fontWeight:900, color:"#dc2626" }}>₹{pendingAmount.toFixed(2)}</div><div style={{ fontSize:10.5, color:"#f87171", marginTop:3 }}>Outstanding from past bills</div></div>}
                        {advanceAvailable > 0 && <div style={{ padding:"12px 14px", background:"#f0fdf4" }}><div style={{ fontSize:11, color:"#059669", fontWeight:600, marginBottom:4 }}>💰 Advance Balance</div><div style={{ fontSize:18, fontWeight:900, color:"#059669" }}>₹{advanceAvailable.toFixed(2)}</div><div style={{ fontSize:10.5, color:"#6ee7b7", marginTop:3 }}>{advanceUsed > 0 ? `₹${advanceUsed.toFixed(2)} will be applied` : "Available to apply"}</div></div>}
                      </div>
                    </div>
                  )}

                  <div style={{ background: extraAmount > 0 ? "#f0fdf4" : pendingBalance > 0 ? "#fef2f2" : "#eef2ff", border: extraAmount > 0 ? "1.5px solid #bbf7d0" : pendingBalance > 0 ? "1.5px solid #fecaca" : "1.5px solid #c7d2fe", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
                    {extraAmount > 0 ? (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontWeight:700, color:"#059669", fontSize:14 }}>💰 Extra Amount</span>
                        <span style={{ fontWeight:900, color:"#059669", fontSize:18 }}>₹{extraAmount.toFixed(2)}</span>
                      </div>
                    ) : pendingBalance > 0 ? (
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontWeight:700, color:"#dc2626", fontSize:14 }}>⚠️ Pending Amount</span>
                        <span style={{ fontWeight:900, color:"#dc2626", fontSize:18 }}>₹{pendingBalance.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div style={{ textAlign:"center", fontWeight:700, color:"#4338ca" }}>Fully Paid ✓</div>
                    )}
                  </div>
                </>
              )}

              {/* Credit outstanding */}
              {paymentMethod === "credit" && (
                <div style={{ borderRadius:12, overflow:"hidden", border:"1.5px solid #fecaca", marginBottom:20, background:"#fef2f2" }}>
                  <div style={{ background:"#fee2e2", padding:"8px 14px", borderBottom:"1px solid #fecaca", fontSize:10.5, fontWeight:700, color:"#dc2626", letterSpacing:".08em", textTransform:"uppercase" }}>Credit Sale Summary</div>
                  <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:13, color:"#991b1b", fontWeight:600 }}>This Invoice Outstanding</span><span style={{ fontSize:15, fontWeight:800, color:"#dc2626" }}>₹{effectiveTotal.toFixed(2)}</span></div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:13, color:"#991b1b", fontWeight:600 }}>Previous Outstanding</span><span style={{ fontSize:15, fontWeight:800, color:"#dc2626" }}>₹{pendingAmount.toFixed(2)}</span></div>
                    <div style={{ borderTop:"1px dashed #fca5a5", margin:"4px 0" }}/>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ fontSize:13, color:"#991b1b", fontWeight:800 }}>Total Outstanding</span><span style={{ fontSize:17, fontWeight:900, color:"#991b1b" }}>₹{(pendingAmount + effectiveTotal).toFixed(2)}</span></div>
                  </div>
                </div>
              )}

              {/* Generate button */}
              <button className="gen-btn" onClick={handleGenerate} disabled={generating || !selectedCompany}>
                {generating ? (
                  <span style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
                    <span style={{ width:16, height:16, border:"2.5px solid rgba(255,255,255,.4)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                    Generating…
                  </span>
                ) : (
                  <span style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                    <IconReceipt/> Generate Invoice
                    <span className="kbd" style={{ background:"rgba(255,255,255,.25)", color:"#fff", borderColor:"rgba(255,255,255,.4)", marginLeft:4 }}>F8</span>
                  </span>
                )}
              </button>
            </div>
          </div>{/* end right sticky column */}

        </div>
      </div>
    </div>
  );
}
