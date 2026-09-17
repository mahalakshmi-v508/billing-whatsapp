import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

/* ── Currency Helper ─────────────────────────────────────────────────── */
const INR = "\u20B9";
const formatCurrency = (amount) => `${INR}${Number(amount || 0).toFixed(2)}`;

/* ── Global CSS ─────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@300;400;500;600;700;800&display=swap');

  @keyframes slideDown  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
  @keyframes slideUp    { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:none} }
  @keyframes fadeIn     { from{opacity:0} to{opacity:1} }
  @keyframes toastIn    { from{opacity:0;transform:translateX(120px)} to{opacity:1;transform:none} }
  @keyframes spin       { to{transform:rotate(360deg)} }
  @keyframes rowPop     { 0%{opacity:0;transform:translateX(-6px)} 100%{opacity:1;transform:none} }
  @keyframes pulseGlow  { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.2)} 50%{box-shadow:0 0 0 5px rgba(34,197,94,0)} }
  @keyframes helpSlide  { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:none} }
  @keyframes quickAddPop { from{opacity:0;transform:scale(.96) translateY(-6px)} to{opacity:1;transform:none} }

  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Inter','Outfit',sans-serif; }

  .pos-input {
    width:100%; background:#fff;
    border:1px solid #d1d5db; border-radius:4px;
    padding:6px 8px; color:#111827; font-size:13px;
    font-family:'Inter',sans-serif; outline:none;
    transition:border-color .15s;
  }
  .pos-input:focus {
    border-color:#3b82f6 !important;
    box-shadow:0 0 0 2px rgba(59,130,246,.15) !important;
  }
  .pos-input::placeholder { color:#9ca3af; }
  .pos-input:disabled { background:#f3f4f6; color:#9ca3af; cursor:not-allowed; }

  .pos-input-compact {
    width:100%; background:#fff;
    border:1px solid #e5e7eb; border-radius:3px;
    padding:4px 6px; color:#111827; font-size:13px;
    font-family:'Inter',sans-serif; outline:none;
    transition:border-color .15s; text-align:center;
  }
  .pos-input-compact:focus {
    border-color:#3b82f6 !important;
    box-shadow:0 0 0 1px rgba(59,130,246,.2) !important;
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; margin:0; }
  input[type=number] { -moz-appearance:textfield; }

  .row-enter { animation:rowPop .2s ease both; }

  .del-btn {
    width:24px; height:24px; border-radius:3px; border:none;
    background:transparent; color:#9ca3af; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .12s; font-size:15px; flex-shrink:0;
  }
  .del-btn:hover { background:#fef2f2; color:#ef4444; }

  .pos-btn-primary {
    flex:1; padding:10px 16px; border:none; border-radius:4px;
    background:#22c55e; color:#fff; font-size:13px; font-weight:700;
    font-family:'Inter',sans-serif; cursor:pointer;
    transition:all .15s; letter-spacing:.01em;
  }
  .pos-btn-primary:hover { background:#16a34a; }
  .pos-btn-primary:active { transform:scale(.99); }
  .pos-btn-primary:disabled { opacity:.6; cursor:not-allowed; transform:none; }

  .pos-btn-secondary {
    flex:1; padding:10px 16px; border:1px solid #d1d5db; border-radius:4px;
    background:#fff; color:#374151; font-size:13px; font-weight:600;
    font-family:'Inter',sans-serif; cursor:pointer;
    transition:all .15s;
  }
  .pos-btn-secondary:hover { background:#f9fafb; border-color:#9ca3af; }

  .suggest-item {
    padding:8px 12px; cursor:pointer;
    font-family:'Inter',sans-serif; font-size:13px; color:#374151;
    transition:background .1s; border-bottom:1px solid #f3f4f6;
    display:flex; justify-content:space-between; align-items:center;
  }
  .suggest-item:hover,.suggest-item.active-suggest { background:#eff6ff; }
  .suggest-item:last-child { border-bottom:none; }

  .customer-suggest-item {
    padding:8px 12px; cursor:pointer;
    font-family:'Inter',sans-serif; font-size:12px; color:#374151;
    transition:background .1s; border-bottom:1px solid #f3f4f6;
  }
  .customer-suggest-item:hover { background:#eff6ff; }
  .customer-suggest-item:last-child { border-bottom:none; }

  .pos-select {
    width:100%; padding:6px 8px; border:1px solid #d1d5db; border-radius:4px;
    background:#fff; color:#111827; font-size:13px; font-weight:500;
    font-family:'Inter',sans-serif; outline:none; cursor:pointer;
    transition:border-color .15s; appearance:none;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 8px center;
    padding-right:28px;
  }
  .pos-select:focus { border-color:#3b82f6; box-shadow:0 0 0 2px rgba(59,130,246,.12); }

  .pay-method-btn {
    padding:7px 6px; border-radius:4px; cursor:pointer;
    font-family:'Inter',sans-serif; font-size:12px; font-weight:600;
    transition:all .15s; text-align:center;
  }
  .pay-method-btn:disabled {
    opacity:0.35; cursor:not-allowed; transform:none !important;
    filter:grayscale(0.5);
  }

  .pos-search-input {
    width:100%; background:#fff;
    border:1px solid #d1d5db; border-radius:4px;
    padding:8px 12px 8px 36px; color:#111827; font-size:13px;
    font-family:'Inter',sans-serif; outline:none;
    transition:border-color .15s;
  }
  .pos-search-input:focus {
    border-color:#3b82f6 !important;
    box-shadow:0 0 0 2px rgba(59,130,246,.12) !important;
  }
  .pos-search-input::placeholder { color:#9ca3af; }

  .kbd {
    display:inline-flex; align-items:center; justify-content:center;
    background:#f3f4f6; border:1px solid #d1d5db; border-radius:3px;
    padding:1px 5px; font-size:10px; font-weight:600; color:#6b7280;
    font-family:'Inter',sans-serif; white-space:nowrap;
  }

  .help-panel {
    position:fixed; top:0; right:0; bottom:0; width:360px;
    background:#fff; box-shadow:-6px 0 30px rgba(0,0,0,.12);
    z-index:99998; display:flex; flex-direction:column;
    animation:helpSlide .25s cubic-bezier(.4,0,.2,1) both;
    font-family:'Inter',sans-serif;
  }

  .pos-table-wrap { display:flex; flex-direction:column; height:100%; }
  .pos-table-head { display:grid; background:#f9fafb; border-bottom:1px solid #e5e7eb; padding:0 12px; flex-shrink:0; }
  .pos-table-body { flex:1; overflow-y:auto; padding:0 12px; min-height:0; }
  .pos-table-row { display:grid; align-items:center; border-bottom:1px solid #f3f4f6; padding:6px 0; }
  .pos-table-row:last-child { border-bottom:none; }
  .pos-table-head span { font-size:11px; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:.04em; }

  .bill-tab {
    padding:4px 14px; border-radius:4px; cursor:pointer;
    font-family:'Inter',sans-serif; font-size:12px; font-weight:600;
    transition:all .12s; border:1px solid #d1d5db;
    background:#f9fafb; color:#6b7280; display:flex; align-items:center; gap:6px;
  }
  .bill-tab:hover { background:#f3f4f6; }
  .bill-tab.active {
    background:#22c55e; color:#fff; border-color:#22c55e;
  }
  .bill-tab-close {
    width:16px; height:16px; border-radius:50%; border:none;
    background:transparent; color:inherit; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    fontSize:12px; padding:0; lineHeight:1; opacity:.6;
  }
  .bill-tab-close:hover { opacity:1; background:rgba(0,0,0,.1); }
  .bill-tab.active .bill-tab-close:hover { background:rgba(255,255,255,.3); }
`;

/* ── Icons ──────────────────────────────────────────────────────────── */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconHelp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconReceipt = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8z"/>
    <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/>
  </svg>
);
const IconMinimize = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
  </svg>
);
const IconPhone = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);
const IconClock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconStar = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconBarcode = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14M7 5v14M11 5v14M15 5v10M19 5v10M15 18v1M19 18v1"/>
  </svg>
);

/* ── Toast ──────────────────────────────────────────────────────────── */
function Toast({ toasts }) {
  return (
    <div style={{ position:"fixed", top:12, right:12, zIndex:99999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display:"flex", alignItems:"center", gap:8,
          background: t.type==="success" ? "#22c55e" : t.type==="error" ? "#ef4444" : "#f59e0b",
          color:"#fff", borderRadius:6, padding:"10px 14px",
          fontWeight:600, fontSize:12.5,
          boxShadow:"0 4px 16px rgba(0,0,0,.15)",
          animation:"toastIn .3s cubic-bezier(.4,0,.2,1) both",
          fontFamily:"'Inter',sans-serif", minWidth:220, maxWidth:320,
        }}>
          <span style={{ flex:1 }}>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Bilingual Help Content ──────────────────────────────────────────── */
const HELP = {
  en: {
    title: "Billing Help Guide",
    subtitle: "Keyboard-first billing system",
    sections: [
      {
        heading: "Keyboard Shortcuts",
        items: [
          { key: "F2", desc: "Focus product search bar" },
          { key: "F3", desc: "Focus customer name field" },
          { key: "F8", desc: "Generate invoice" },
          { key: "Arrow Keys", desc: "Navigate product suggestions" },
          { key: "Enter", desc: "Select highlighted product" },
          { key: "Esc", desc: "Close search dropdown" },
          { key: "1/2/3/4", desc: "Select payment: Cash/Online/UPI/Credit" },
        ],
      },
      {
        heading: "Product Search",
        items: [
          { key: "Name", desc: "Type product name to search instantly" },
          { key: "Barcode", desc: "Scan or type barcode code then press Enter" },
          { key: "Empty focus", desc: "Shows Recent & Frequent products" },
          { key: "Duplicate", desc: "Same product added -> qty auto-increments" },
        ],
      },
      {
        heading: "Quick Add (Unlisted Items)",
        items: [
          { key: "Not found", desc: "If product not found, Quick Add panel appears" },
          { key: "Bill-only", desc: "Enter name, price & qty - added to bill only" },
        ],
      },
      {
        heading: "Payment Tips",
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
        heading: "விசைப்பலகை குறுக்குவழிகள்",
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
        heading: "தயாரிப்பு தேடல்",
        items: [
          { key: "பெயர்", desc: "தயாரிப்பு பெயரை தட்டச்சு செய்து தேடுங்கள்" },
          { key: "பார்கோட்", desc: "பார்கோட் ஸ்கேன் செய்து Enter அழுத்துங்கள்" },
          { key: "காலி தேடல்", desc: "சமீபத்திய & அடிக்கடி பயன்படுத்தியவை காட்டப்படும்" },
          { key: "தொகை", desc: "ஒரே தயாரிப்பை மீண்டும் சேர்த்தால் அளவு தானாக அதிகரிக்கும்" },
        ],
      },
      {
        heading: "விரைவு சேர்க்கை (பட்டியலில் இல்லாத பொருள்)",
        items: [
          { key: "கிடைக்கவில்லை", desc: "தயாரிப்பு இல்லாவிட்டால் விரைவு சேர்க்கை பலகம் தோன்றும்" },
          { key: "சேர்க்க", desc: "பெயர், விலை, அளவு உள்ளிட்டு பில்லில் சேர்க்கவும்" },
        ],
      },
      {
        heading: "கட்டண குறிப்புகள்",
        items: [
          { key: "முன்பணம்", desc: "வாடிக்கையாளரின் முன்பணம் தானாகவே கழிக்கப்படும்" },
          { key: "கடன்", desc: "தகுதியான வாடிக்கையாளர்களுக்கு மட்டுமே கடன் விருப்பம்" },
          { key: "ஒட்டும் பலகம்", desc: "நீங்கள் உருட்டும்போது கட்டண பலகம் எப்போதும் காட்டப்படும்" },
        ],
      },
    ],
  },
};

/* ── LocalStorage helpers ───────────────────────────────────────────── */
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

/* ── Helpers ─────────────────────────────────────────────────────────── */
function emptyRow() {
  return { product_id:null, name:"", product_code:"", price:0, qty:0, discount:0, freeQty:0, gst:0, unit:"", stock:0, isUnlisted:false };
}

function createFreshBill(id) {
  return {
    id,
    rows: [emptyRow()],
    customer: { id:null, name:"", phone:"", address:"", gst_no:"", credit_enabled:"0", credit_limit:0, points:0, advance_balance:0, pending_amount:0 },
    billType: "cash_bill",
    paymentMethod: "cash",
    payment: { received: 0 },
    showBreakup: false,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function Billing() {

  const user    = JSON.parse(localStorage.getItem("user"));
  const adminId = user.role === "cashier" ? user.admin_id : user.id;
  const navigate = useNavigate();

  /* ══ MULTI-BILL TAB STATE ══ */
  const [bills, setBills] = useState(() => [createFreshBill("SS3")]);
  const [activeBillId, setActiveBillId] = useState("SS3");
  const billCounterRef = useRef(4);

  /* Get active bill helpers */
  const activeBill = bills.find(b => b.id === activeBillId) || bills[0];
  const updateActiveBill = useCallback((updates) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, ...updates } : b));
  }, [activeBillId]);

  /* Per-bill state shortcuts (read from activeBill) */
  const rows = activeBill.rows;
  const customer = activeBill.customer;
  const billType = activeBill.billType;
  const paymentMethod = activeBill.paymentMethod;
  const payment = activeBill.payment;
  const showBreakup = activeBill.showBreakup;

  /* Per-bill setters */
  const setRows = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, rows: typeof val === "function" ? val(b.rows) : val } : b));
  }, [activeBillId]);
  const setCustomer = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, customer: typeof val === "function" ? val(b.customer) : val } : b));
  }, [activeBillId]);
  const setBillType = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, billType: val } : b));
  }, [activeBillId]);
  const setPaymentMethod = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, paymentMethod: val } : b));
  }, [activeBillId]);
  const setPayment = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, payment: typeof val === "function" ? val(b.payment) : val } : b));
  }, [activeBillId]);
  const setShowBreakup = useCallback((val) => {
    setBills(prev => prev.map(b => b.id === activeBillId ? { ...b, showBreakup: val } : b));
  }, [activeBillId]);

  /* ══ SHARED STATE (not per-bill) ══ */
  const [products, setProducts]     = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(localStorage.getItem("selected_company_id") || "");

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

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickItem, setQuickItem]       = useState({ name:"", price:"", qty:1, unit:"" });

  const [showHelp, setShowHelp] = useState(false);
  const [helpLang, setHelpLang] = useState("en");

  const [nameSuggestions, setNameSuggestions]   = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const nameSuggestRef  = useRef(null);
  const phoneSuggestRef = useRef(null);
  const nameSearchTimer  = useRef(null);
  const phoneSearchTimer = useRef(null);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerName, setAddCustomerName] = useState("");
  const [addCustomerPhone, setAddCustomerPhone] = useState("");
  const [addCustomerAddress, setAddCustomerAddress] = useState("");

  const [aiPrompt, setAiPrompt]           = useState("");
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiAnomalies, setAiAnomalies]     = useState([]);
  const [isListening, setIsListening]     = useState(false);

  const [generating, setGenerating] = useState(false);
  const [toasts,     setToasts]     = useState([]);

  /* ── Derived totals (from active bill) ── */
  const subtotal     = rows.reduce((s, r) => s + r.price * r.qty, 0);
  const totalDiscount = rows.reduce((s, r) => s + (Number(r.discount) || 0), 0);
  const gstTotal     = billType === "gst_bill" ? rows.reduce((s, r) => s + (r.price * r.qty * r.gst) / 100, 0) : 0;
  const total        = subtotal + gstTotal - totalDiscount;
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
  const totalItems       = validRows.length;
  const totalQty         = validRows.reduce((s, r) => s + r.qty + (Number(r.freeQty) || 0), 0);
  const changeToReturn   = extraAmount;

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
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

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

  /* Frequent products */
  const freqObjects = useMemo(() => {
    const freq = getFrequent();
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => productById[id])
      .filter(Boolean)
      .filter(p => p.status === "active");
  }, [productById]);

  /* ══ NEW BILL TAB ══ */
  const createNewBill = useCallback(() => {
    const num = billCounterRef.current++;
    const newId = `SS${num}`;
    const newBill = createFreshBill(newId);
    setBills(prev => [...prev, newBill]);
    setActiveBillId(newId);
    setGlobalSearch("");
    setShowSuggest(false);
    setSuggestIndex(-1);
    setShowNoResult(false);
    setShowQuickAdd(false);
  }, []);

  const closeBill = useCallback((billId) => {
    setBills(prev => {
      const remaining = prev.filter(b => b.id !== billId);
      if (remaining.length === 0) {
        const fresh = createFreshBill("SS3");
        billCounterRef.current = 4;
        return [fresh];
      }
      if (activeBillId === billId) {
        const idx = prev.findIndex(b => b.id === billId);
        const nextIdx = idx > 0 ? idx - 1 : 0;
        setActiveBillId(remaining[nextIdx].id);
      }
      return remaining;
    });
  }, [activeBillId]);

  const switchBill = useCallback((billId) => {
    setActiveBillId(billId);
    setGlobalSearch("");
    setShowSuggest(false);
    setSuggestIndex(-1);
    setShowNoResult(false);
    setShowQuickAdd(false);
    setNameSuggestions([]);
    setPhoneSuggestions([]);
  }, []);

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
        showToast(`${p.product_name || p.name} qty -> ${newQty}`, "success");
      } else {
        const newRow = {
          product_id: pid,
          name: p.product_name || p.name,
          product_code: p.product_code || "",
          price: Number(p.price),
          gst: Number(p.gst_percentage || p.gst || 0),
          qty: qtyNum,
          discount: 0,
          freeQty: 0,
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
  }, [productById, showToast, setRows]);

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
            discount: 0,
            freeQty: 0,
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
  }, [productById, setRows]);

  /* Quick Add */
  const addQuickItem = () => {
    if (!quickItem.name.trim() || !quickItem.price) { showToast("Enter name and price", "error"); return; }
    const newRow = {
      product_id: null, name: quickItem.name.trim(), product_code: "",
      price: Number(quickItem.price), gst: 0, qty: Number(quickItem.qty) || 1,
      discount: 0, freeQty: 0,
      unit: quickItem.unit, stock: 9999, isUnlisted: true,
    };
    setRows(prevRows => {
      const updated = [...prevRows];
      const lastEmptyIdx = updated.reduceRight((acc, r, i) => acc === -1 && (!r.name && !r.product_id) ? i : acc, -1);
      if (lastEmptyIdx !== -1) updated[lastEmptyIdx] = newRow;
      else updated.push(newRow);
      if (updated[updated.length - 1].name) updated.push(emptyRow());
      return updated;
    });
    setQuickItem({ name:"", price:"", qty:1, unit:"" });
    setShowQuickAdd(false);
    setGlobalSearch("");
    setShowNoResult(false);
    showToast(`"${newRow.name}" added to bill`, "success");
    globalSearchRef.current?.focus();
  };

  /* Row ops */
  const updateRow = useCallback((i, field, value) => {
    setRows(prev => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  }, [setRows]);

  const updateQty = useCallback((i, value) => {
    const num = Number(value);
    setRows(prev => {
      const updated = [...prev];
      if (updated[i].stock && !updated[i].isUnlisted && num > updated[i].stock) {
        showToast(`Only ${updated[i].stock} in stock!`, "warning");
        updated[i] = { ...updated[i], qty: updated[i].stock };
      } else {
        updated[i] = { ...updated[i], qty: num < 0 ? 0 : num };
      }
      return [...updated];
    });
  }, [showToast, setRows]);

  const deleteRow = i => {
    setRows(prev => {
      if (prev.length === 1) return [emptyRow()];
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const rowAmount = r => {
    const base = r.price * r.qty;
    const disc = Number(r.discount) || 0;
    const gstAmt = billType === "gst_bill" ? (base * r.gst) / 100 : 0;
    return base + gstAmt - disc;
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
    setCustomer(prev => ({ ...prev, id:c.id, name:c.name, phone:c.phone, address:c.address||"", gst_no:c.gst_no||"", credit_enabled:c.credit_enabled||"0", credit_limit:c.credit_limit||0, points:c.loyalty_points||0, advance_balance:parseFloat(c.advance_balance)||0, pending_amount:parseFloat(c.pending_amount)||0 }));
    setNameSuggestions([]); setPhoneSuggestions([]);
    const fresh = await fetchCustomerById(c.id);
    if (fresh) {
      const adv = parseFloat(fresh.advance_balance)||0, pending = parseFloat(fresh.pending_amount)||0, pts = parseInt(fresh.loyalty_points)||0;
      setCustomer({ id:fresh.id, name:fresh.name, phone:fresh.phone, address:fresh.address||"", gst_no:fresh.gst_no||"", credit_enabled:fresh.credit_enabled||"0", credit_limit:fresh.credit_limit||0, points:pts, advance_balance:adv, pending_amount:pending });
      const msgs = [];
      if (pts > 0) msgs.push(`${pts} loyalty pts`);
      if (adv > 0) msgs.push(`${formatCurrency(adv)} advance`);
      if (pending > 0) msgs.push(`${formatCurrency(pending)} pending`);
      showToast(msgs.length > 0 ? `Customer loaded \u2014 ${msgs.join(" \u00B7 ")}` : "Customer selected", pending > 0 ? "warning" : "success");
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
        const results = res.data.status ? (res.data.data || []) : [];
        setNameSuggestions(results);
      } catch { setNameSuggestions([]); }
      setCustomerSearchLoading(false);
    }, 300);
  };

  const handlePhoneSearch = value => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setCustomer(c => ({ ...c, phone:digits, id:null, name:c.id ? "" : c.name, credit_enabled:"0", advance_balance:0, pending_amount:0 }));
    setPhoneSuggestions([]);
    clearTimeout(phoneSearchTimer.current);
    if (digits.length !== 10) return;
    phoneSearchTimer.current = setTimeout(async () => {
      if (!selectedCompany) return;
      setCustomerSearchLoading(true);
      try {
        const res = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, phone: digits } });
        if (res.data.status && res.data.data) { await selectCustomer(res.data.data); setCustomerSearchLoading(false); return; }
        setAddCustomerPhone(digits);
        setAddCustomerName(customer.name || "");
        setAddCustomerAddress("");
        setShowAddCustomer(true);
      } catch {}
      setCustomerSearchLoading(false);
    }, 300);
  };

  const openAddCustomerPopup = () => {
    setAddCustomerName(customer.name || "");
    setAddCustomerPhone(customer.phone || "");
    setAddCustomerAddress("");
    setShowAddCustomer(true);
  };

  const handleSaveNewCustomer = async () => {
    if (!addCustomerName.trim()) { showToast("Customer name is required", "error"); return; }
    if (!addCustomerPhone.trim() || !/^[0-9]{10}$/.test(addCustomerPhone.trim())) { showToast("Valid 10-digit phone number required", "error"); return; }
    try {
      const res = await api.post("/customer/create_customer", {
        admin_id: adminId,
        name: addCustomerName.trim(),
        phone: addCustomerPhone.trim(),
        address: addCustomerAddress.trim(),
      });
      if (res.data.status) {
        const phoneRes = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, phone: addCustomerPhone.trim() } });
        if (phoneRes.data.status && phoneRes.data.data) {
          await selectCustomer(phoneRes.data.data);
        } else {
          setCustomer(c => ({ ...c, name:addCustomerName.trim(), phone:addCustomerPhone.trim(), address:addCustomerAddress.trim() }));
        }
        showToast("Customer created successfully", "success");
        setShowAddCustomer(false);
        setAddCustomerName("");
        setAddCustomerPhone("");
        setAddCustomerAddress("");
      } else {
        if (res.data.message && res.data.message.includes("already exists")) {
          const phoneRes = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, phone: addCustomerPhone.trim() } });
          if (phoneRes.data.status && phoneRes.data.data) {
            await selectCustomer(phoneRes.data.data);
            showToast("Customer already exists - selected existing customer", "success");
            setShowAddCustomer(false);
            setAddCustomerName("");
            setAddCustomerPhone("");
            setAddCustomerAddress("");
          } else {
            showToast(res.data.message, "error");
          }
        } else {
          showToast(res.data.message || "Failed to create customer", "error");
        }
      }
    } catch (err) {
      showToast(err.message || "Server error", "error");
    }
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
      if (limit > 0 && total > limit) { showToast(`Purchase ${formatCurrency(total)} exceeds credit limit ${formatCurrency(limit)}!`, "error"); return; }
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
        if (res.data.advance_used > 0) parts.push(`${formatCurrency(parseFloat(res.data.advance_used))} advance used`);
        if (res.data.balance_amount > 0) parts.push(`${formatCurrency(parseFloat(res.data.balance_amount))} pending`);
        if (balance > 0 && res.data.advance_delta > 0) parts.push(`${formatCurrency(parseFloat(res.data.advance_delta))} added to advance`);
        showToast(parts.length > 0 ? `Invoice generated! ${parts.join(" \u00B7 ")}` : "Invoice generated!", "success");
        setTimeout(() => navigate(`/invoice/${res.data.invoice_no}`), 900);
      } else showToast(res.data.message || "Something went wrong", "error");
    } catch (err) { showToast(err.message || "Server error. Try again!", "error"); }
    setGenerating(false);
  };

  const handleGenerateRef = useRef(handleGenerate);
  useEffect(() => { handleGenerateRef.current = handleGenerate; });

  /* Payment method config */
  const paymentMethods = [
    { val:"cash",   label:"Cash",   color:"#22c55e", bg:"#f0fdf4", border:"#bbf7d0", activeBg:"#22c55e" },
    { val:"online", label:"Online", color:"#3b82f6", bg:"#eff6ff", border:"#bfdbfe", activeBg:"#3b82f6" },
    { val:"upi",    label:"UPI",    color:"#8b5cf6", bg:"#f5f3ff", border:"#ddd6fe", activeBg:"#8b5cf6" },
    { val:"credit", label:"Credit", color:"#ef4444", bg:"#fef2f2", border:"#fecaca", activeBg:"#ef4444", disabled: Number(customer.credit_enabled) !== 1, disabledTitle: "Credit not enabled for this customer" },
  ];

  const billDate = new Date().toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — POS LAYOUT
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"#f0f2f5", fontFamily:"'Inter','Outfit',sans-serif", overflow:"hidden" }}>
      <Toast toasts={toasts}/>

      {/* ── Help Panel Overlay ── */}
      {showHelp && (
        <div style={{ position:"fixed", inset:0, zIndex:99997, background:"rgba(0,0,0,.35)" }} onClick={() => setShowHelp(false)}>
          <div className="help-panel" onClick={e => e.stopPropagation()}>
            <div style={{ background:"#1f2937", padding:"16px 20px", flexShrink:0 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{HELP[helpLang].title}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,.6)", marginTop:2 }}>{HELP[helpLang].subtitle}</div>
                </div>
                <button onClick={() => setShowHelp(false)} style={{ background:"rgba(255,255,255,.12)", border:"none", borderRadius:6, padding:"6px 8px", cursor:"pointer", color:"#fff", display:"flex" }}>
                  <IconClose/>
                </button>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {["en","ta"].map(lang => (
                  <button key={lang} onClick={() => setHelpLang(lang)} style={{
                    padding:"4px 14px", borderRadius:4, border:"1px solid rgba(255,255,255,.3)",
                    background: helpLang === lang ? "#fff" : "transparent",
                    color: helpLang === lang ? "#1f2937" : "rgba(255,255,255,.8)",
                    fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'Inter',sans-serif", transition:"all .15s",
                  }}>
                    {lang === "en" ? "English" : "\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD"}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"14px 18px" }}>
              {HELP[helpLang].sections.map((sec, si) => (
                <div key={si} style={{ marginBottom:18 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:8, paddingBottom:5, borderBottom:"1px solid #e5e7eb" }}>{sec.heading}</div>
                  {sec.items.map((item, ii) => (
                    <div key={ii} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                      <span className="kbd" style={{ flexShrink:0, minWidth:60, textAlign:"center" }}>{item.key}</span>
                      <span style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Customer Popup ── */}
      {showAddCustomer && (
        <div style={{ position:"fixed", inset:0, zIndex:99997, background:"rgba(0,0,0,.35)" }} onClick={() => setShowAddCustomer(false)}>
          <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#fff", borderRadius:8, width:380, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)", fontFamily:"'Inter','Outfit',sans-serif" }} onClick={e => e.stopPropagation()}>
            <div style={{ padding:"14px 18px", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Add New Customer</div>
              <button onClick={() => setShowAddCustomer(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:4, display:"flex", fontSize:18, lineHeight:1 }}><IconClose/></button>
            </div>
            <div style={{ padding:"16px 18px" }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", display:"block", marginBottom:4 }}>Customer Name</label>
                <input className="pos-input" placeholder="Enter customer name" value={addCustomerName} onChange={e => setAddCustomerName(e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", display:"block", marginBottom:4 }}>Phone Number</label>
                <input className="pos-input" placeholder="10-digit phone number" value={addCustomerPhone} maxLength={10} onChange={e => setAddCustomerPhone(e.target.value.replace(/\D/g, "").slice(0,10))} style={{ padding:"6px 8px", fontSize:12 }}/>
              </div>
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", display:"block", marginBottom:4 }}>Address</label>
                <input className="pos-input" placeholder="Enter address (optional)" value={addCustomerAddress} onChange={e => setAddCustomerAddress(e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
              </div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <button onClick={() => setShowAddCustomer(false)} className="pos-btn-secondary" style={{ flex:"none", padding:"8px 16px" }}>Cancel</button>
                <button onClick={handleSaveNewCustomer} className="pos-btn-primary" style={{ flex:"none", padding:"8px 16px" }}>Save Customer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TOP HEADER BAR — with bill tabs
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"0 16px", height:40, display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        {/* Bill Tabs */}
        <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
          {bills.map(b => (
            <div key={b.id} className={`bill-tab${b.id === activeBillId ? " active" : ""}`} onClick={() => switchBill(b.id)}>
              <span>#{b.id}</span>
              {bills.length > 1 && (
                <button className="bill-tab-close" onClick={(e) => { e.stopPropagation(); closeBill(b.id); }} title={`Close ${b.id}`}>x</button>
              )}
            </div>
          ))}
          <button onClick={createNewBill} style={{
            padding:"4px 12px", borderRadius:4, border:"1px dashed #22c55e",
            background:"#f0fdf4", color:"#22c55e", fontSize:12, fontWeight:600,
            cursor:"pointer", fontFamily:"'Inter',sans-serif", display:"flex", alignItems:"center", gap:4,
          }}>
            <IconPlus/> New Bill <span className="kbd" style={{ marginLeft:2 }}>Ctrl+T</span>
          </button>
        </div>

        <div style={{ flex:1 }} />

        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:1, height:20, background:"#e5e7eb", margin:"0 4px" }} />
          <span style={{ fontSize:11, color:"#6b7280" }}>Bill Type</span>
          <select
            className="pos-select"
            value={billType}
            onChange={e => setBillType(e.target.value)}
            style={{ width:"auto", padding:"3px 24px 3px 8px", fontSize:12, borderRadius:4 }}
          >
            <option value="cash_bill">Cash Bill</option>
            <option value="gst_bill">GST Bill</option>
          </select>
          {billType === "gst_bill" && <span style={{ fontSize:10, color:"#d97706", background:"#fef3c7", borderRadius:3, padding:"2px 6px", fontWeight:600, border:"1px solid #fde68a" }}>GST</span>}
          <div style={{ width:1, height:20, background:"#e5e7eb", margin:"0 4px" }} />
          <button onClick={() => setShowHelp(true)} title="Help" style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", padding:4, display:"flex", borderRadius:4 }}><IconHelp/></button>
          <button title="Settings" style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", padding:4, display:"flex", borderRadius:4 }}><IconSettings/></button>
          <button title="Minimize" style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", padding:4, display:"flex", borderRadius:4 }}><IconMinimize/></button>
          <button title="Close" style={{ background:"none", border:"none", cursor:"pointer", color:"#6b7280", padding:4, display:"flex", borderRadius:4 }}><IconClose/></button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          PRODUCT SEARCH BAR
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"8px 16px", flexShrink:0, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }} ref={suggestBoxRef}>
        <div style={{ position:"relative", flex:1, minWidth:0 }}>
          <div style={{ position:"relative", maxWidth:"100%" }}>
          <div style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", display:"flex", zIndex:1 }}><IconSearch/></div>
          <input
            ref={globalSearchRef}
            id="global-product-search"
            className="pos-search-input"
            placeholder="Scan or search by item code, model no or item name..."
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
          <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, fontWeight:500, color:"#9ca3af" }}>
              <IconBarcode/> Barcode
            </span>
            <span className="kbd">F2</span>a
          </div>
        </div>

        {showSuggest && globalSuggestions.length > 0 && (
          <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#fff", border:"1px solid #d1d5db", borderRadius:"0 0 6px 6px", zIndex:9999, maxHeight:260, overflowY:"auto", boxShadow:"0 8px 24px rgba(0,0,0,.12)", animation:"slideDown .15s ease both" }}>
            {!globalSearch.trim() && recentProducts.length > 0 && (
              <div style={{ padding:"6px 12px 3px", fontSize:10, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".04em", display:"flex", alignItems:"center", gap:4 }}>
                <IconClock/> Recent
              </div>
            )}
            {globalSuggestions.map((s, idx) => (
              <div key={s.id} className={`suggest-item${suggestIndex === idx ? " active-suggest" : ""}`} onMouseDown={() => addOrMergeProduct(s)}>
                <div style={{ display:"flex", flexDirection:"column" }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{s.product_name}</span>
                  <span style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>
                    {s.product_code && <span style={{ background:"#f3f4f6", borderRadius:3, padding:"1px 4px", marginRight:4, fontFamily:"monospace", fontSize:10 }}>#{s.product_code}</span>}
                    {s.unit}
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                  <span style={{ fontWeight:700, color:"#111827", fontSize:13 }}>{formatCurrency(s.price)}</span>
                  <span style={{ fontSize:10, fontWeight:600, color: s.stock < 5 ? "#ef4444" : "#22c55e" }}>Stock: {s.stock}</span>
                </div>
              </div>
            ))}
            {!globalSearch.trim() && freqObjects.length > 0 && (
              <>
                <div style={{ padding:"6px 12px 3px", fontSize:10, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:".04em", display:"flex", alignItems:"center", gap:4, borderTop:"1px solid #f3f4f6", marginTop:3 }}>
                  <IconStar/> Frequent
                </div>
                {freqObjects.map(s => (
                  <div key={`freq-${s.id}`} className="suggest-item" onMouseDown={() => addOrMergeProduct(s)}>
                    <span style={{ fontWeight:600, fontSize:12.5 }}>{s.product_name}</span>
                    <span style={{ fontWeight:700, color:"#111827", fontSize:12.5 }}>{formatCurrency(s.price)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {showNoResult && (
          <div style={{ marginTop:6, animation:"quickAddPop .2s ease both" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"8px 12px" }}>
              <div>
                <div style={{ fontWeight:600, color:"#92400e", fontSize:12 }}>"{globalSearch}" - product not found</div>
                <div style={{ fontSize:11, color:"#b45309", marginTop:1 }}>Add as unlisted item to this bill only</div>
              </div>
              <button onClick={() => { setShowQuickAdd(true); setQuickItem({ name:globalSearch.trim(), price:"", qty:1, unit:"" }); }} style={{ display:"flex", alignItems:"center", gap:4, background:"#d97706", border:"none", borderRadius:4, padding:"6px 12px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
                <IconPlus/> Quick Add
              </button>
            </div>
          </div>
        )}

        {showQuickAdd && (
          <div style={{ marginTop:6, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:6, padding:"10px 12px", animation:"quickAddPop .15s ease both" }}>
            <div style={{ fontWeight:600, color:"#92400e", fontSize:12, marginBottom:8 }}>
              + Add Unlisted Item to Bill <span style={{ fontSize:10, fontWeight:400, color:"#b45309" }}>(bill-only)</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 80px auto", gap:8, alignItems:"flex-end" }}>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#92400e", display:"block", marginBottom:3 }}>Name *</label>
                <input className="pos-input" placeholder="Product name" value={quickItem.name} onChange={e => setQuickItem(q => ({ ...q, name:e.target.value }))} style={{ borderColor:"#fde68a", padding:"5px 8px", fontSize:12 }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#92400e", display:"block", marginBottom:3 }}>{`Price (${INR})`} *</label>
                <input type="number" className="pos-input" placeholder="0.00" value={quickItem.price} onChange={e => setQuickItem(q => ({ ...q, price:e.target.value }))} style={{ borderColor:"#fde68a", padding:"5px 8px", fontSize:12 }}/>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#92400e", display:"block", marginBottom:3 }}>Unit</label>
                <select className="pos-select" value={quickItem.unit} onChange={e => setQuickItem(q => ({ ...q, unit:e.target.value }))} style={{ borderColor:"#fde68a", padding:"5px 8px", fontSize:12 }}>
                  <option value="">Unit</option>
                  <option value="Piece">Piece</option>
                  <option value="Kg">Kg</option>
                  <option value="Gram">Gram</option>
                  <option value="Litre">Litre</option>
                  <option value="ML">ML</option>
                  <option value="Meter">Meter</option>
                  <option value="Box">Box</option>
                  <option value="Pack">Pack</option>
                  <option value="Dozen">Dozen</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:600, color:"#92400e", display:"block", marginBottom:3 }}>Qty</label>
                <input type="number" className="pos-input" placeholder="1" value={quickItem.qty} min={1} onChange={e => setQuickItem(q => ({ ...q, qty:e.target.value }))} style={{ borderColor:"#fde68a", padding:"5px 8px", fontSize:12 }}/>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <button onClick={addQuickItem} style={{ background:"#22c55e", border:"none", borderRadius:4, padding:"6px 12px", color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>Add</button>
                <button onClick={() => { setShowQuickAdd(false); setShowNoResult(false); setGlobalSearch(""); }} style={{ background:"transparent", border:"1px solid #fde68a", borderRadius:4, padding:"6px 8px", color:"#92400e", fontWeight:500, fontSize:12, cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>x</button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Date */}
        <div style={{ flexShrink:0 }}>
          <div style={{ fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>Date</div>
          <div style={{ fontSize:12, fontWeight:600, color:"#111827", padding:"6px 10px", background:"#fff", border:"1px solid #d1d5db", borderRadius:4, whiteSpace:"nowrap" }}>{billDate}</div>
        </div>

        {/* Company */}
        {companies.length > 1 ? (
          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>Company</div>
            <select className="pos-select" value={selectedCompany} onChange={e => { setSelectedCompany(e.target.value); localStorage.setItem("selected_company_id", e.target.value); }} style={{ width:160, fontSize:12, padding:"6px 28px 6px 8px" }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
        ) : companies.length === 1 ? (
          <div style={{ flexShrink:0 }}>
            <div style={{ fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>Company</div>
            <div style={{ fontSize:12, fontWeight:600, color:"#111827", padding:"6px 10px", background:"#fff", border:"1px solid #d1d5db", borderRadius:4, whiteSpace:"nowrap" }}>{companies[0]?.company_name}</div>
          </div>
        ) : null}

      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT — TWO-COLUMN LAYOUT
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── LEFT: Product Table ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", borderRight:"1px solid #e5e7eb", background:"#fff" }}>

          {/* AI Copilot */}
          <div style={{ borderBottom:"1px solid #e5e7eb", padding:"6px 12px", display:"flex", alignItems:"center", gap:6, flexShrink:0, background:"#fafbfc" }}>
            <span style={{ fontSize:11, fontWeight:700, color:"#6366f1", background:"#eef2ff", borderRadius:3, padding:"2px 6px", border:"1px solid #c7d2fe", whiteSpace:"nowrap" }}>AI</span>
            <input type="text" placeholder='AI command: "Add 5 kg Sonamasuri Rice", "Payment UPI"...' value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleAiCopilotSubmit(); }} className="pos-input" style={{ flex:1, fontSize:12, padding:"4px 8px", borderRadius:3, borderColor:"#e5e7eb", background:"#fff" }}/>
            <button type="button" onClick={startVoiceCommand} title="Voice command" style={{ background: isListening ? "#ef4444" : "#f3f4f6", color: isListening ? "#fff" : "#6b7280", border: "none", borderRadius: 3, width: 26, height: 26, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", transition: "all 0.15s", flexShrink: 0 }}>
              {isListening ? "REC" : "MIC"}
            </button>
            <button type="button" onClick={() => handleAiCopilotSubmit()} disabled={aiLoading} style={{ background: "#6366f1", color: "#fff", border: "none", borderRadius: 3, padding: "0 8px", height: 26, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
              {aiLoading ? "..." : "Run"}
            </button>
          </div>

          {aiAnomalies.length > 0 && (
            <div style={{ borderBottom:"1px solid #e5e7eb", padding:"4px 12px", flexShrink:0, display:"flex", flexDirection:"column", gap:2, background:"#fafbfc" }}>
              {aiAnomalies.map((anom, idx) => (
                <div key={idx} style={{ padding: "3px 8px", borderRadius: 3, fontSize: 11, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, background: anom.type === "error" || anom.type === "danger" ? "#fef2f2" : anom.type === "warning" ? "#fffbeb" : "#eff6ff", color: anom.type === "error" || anom.type === "danger" ? "#b91c1c" : anom.type === "warning" ? "#b45309" : "#1d4ed8" }}>
                  <span>{anom.type === "error" || anom.type === "danger" ? "!" : "i"}</span>
                  <div><strong>{anom.title}:</strong> {anom.message}</div>
                </div>
              ))}
            </div>
          )}

          {aiSuggestions.length > 0 && (
            <div style={{ borderBottom:"1px solid #e5e7eb", padding:"4px 12px", flexShrink:0, display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", background:"#fafbfc" }}>
              <span style={{ fontSize:10, fontWeight:700, color:"#6366f1", textTransform:"uppercase", letterSpacing:".04em" }}>AI Suggests:</span>
              {aiSuggestions.map(sug => (
                <button key={sug.id} type="button" onClick={() => addOrMergeProduct(sug)} style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", color:"#166534", padding:"2px 8px", borderRadius:12, fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:3 }}>
                  + {sug.product_name} <span style={{ color:"#059669", fontWeight:700 }}>{formatCurrency(sug.price)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="pos-table-wrap" style={{ flex:1, minHeight:0 }}>
            <div className="pos-table-head" style={{ gridTemplateColumns:"36px 90px 1fr 60px 70px 90px 80px 80px 70px 30px", padding:"6px 12px" }}>
              <span>#</span>
              <span>ITEM CODE</span>
              <span>ITEM NAME</span>
              <span style={{ textAlign:"center" }}>QTY</span>
              <span style={{ textAlign:"center" }}>UNIT</span>
              <span style={{ textAlign:"right" }}>PRICE/UNIT</span>
              <span style={{ textAlign:"right" }}>DISCOUNT</span>
              <span style={{ textAlign:"right" }}>{billType === "gst_bill" ? "TAX" : "AMOUNT"}</span>
              <span style={{ textAlign:"center" }}>FREE</span>
              <span></span>
            </div>

            <div className="pos-table-body">
              {!rows.some(r => r.name || r.product_id) && (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#9ca3af", fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8, opacity:.5 }}>&#128722;</div>
                  <div>Use the search bar above to add products</div>
                  <div style={{ fontSize:11, marginTop:4 }}>Press <span className="kbd">F2</span> to focus search or scan barcode</div>
                </div>
              )}
              {rows.map((r, i) => {
                if (!r.name && !r.product_id) return null;
                const disc = Number(r.discount) || 0;
                return (
                  <div key={i} className="pos-table-row row-enter" style={{ display:"grid", gridTemplateColumns:"36px 90px 1fr 60px 70px 90px 80px 80px 70px 30px", padding:"4px 12px", background: i % 2 === 0 ? "#fff" : "#fafbfc", alignItems:"center", minHeight:38 }}>
                    <span style={{ fontSize:11, color:"#9ca3af", fontWeight:500 }}>{i + 1}</span>
                    <span style={{ fontSize:12, color:"#6b7280", fontFamily:"monospace" }}>{r.product_code ? `#${r.product_code}` : r.isUnlisted ? <span style={{ fontSize:10, color:"#b45309", background:"#fef3c7", borderRadius:2, padding:"1px 4px" }}>Unlisted</span> : "\u2014"}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#111827", lineHeight:1.3 }}>{r.name}</div>
                      {r.unit && <span style={{ fontSize:10, color:"#9ca3af" }}>{r.unit}</span>}
                    </div>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <input type="number" className="pos-input-compact" value={r.qty} min={0} onChange={e => updateQty(i, e.target.value)} onWheel={e => e.target.blur()} style={{ width:48, fontSize:12, fontWeight:600, padding:"3px 4px" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      {r.isUnlisted ? (
                        <select className="pos-select" value={r.unit} onChange={e => updateRow(i, "unit", e.target.value)} style={{ width:62, fontSize:11, padding:"2px 18px 2px 4px" }}>
                          <option value="">-</option>
                          <option value="Piece">Pc</option>
                          <option value="Kg">Kg</option>
                          <option value="Gram">Gm</option>
                          <option value="Litre">L</option>
                          <option value="ML">Ml</option>
                          <option value="Meter">M</option>
                          <option value="Box">Box</option>
                          <option value="Pack">Pk</option>
                          <option value="Dozen">Dz</option>
                        </select>
                      ) : (
                        <span style={{ fontSize:12, color:"#6b7280" }}>{r.unit || "\u2014"}</span>
                      )}
                    </div>
                    <div style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                      {r.isUnlisted ? (
                        <input type="number" className="pos-input-compact" value={r.price} min={0} onChange={e => updateRow(i, "price", Number(e.target.value) || 0)} onWheel={e => e.target.blur()} style={{ width:76, fontSize:12, fontWeight:600, padding:"3px 4px", textAlign:"right" }}/>
                      ) : (
                        <span style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{r.price > 0 ? formatCurrency(r.price) : "\u2014"}</span>
                      )}
                    </div>
                    <div style={{ display:"flex", justifyContent:"flex-end" }}>
                      <input type="number" className="pos-input-compact" value={r.discount || 0} min={0} onChange={e => updateRow(i, "discount", Number(e.target.value) || 0)} onWheel={e => e.target.blur()} style={{ width:68, fontSize:12, fontWeight:500, padding:"3px 4px", textAlign:"right", color: disc > 0 ? "#dc2626" : "#111827" }}/>
                    </div>
                    <div style={{ textAlign:"right", whiteSpace:"nowrap" }}>
                      {billType === "gst_bill" && r.gst > 0 ? (
                        <span style={{ fontSize:12, fontWeight:600, color:"#d97706" }}>{r.gst}% <span style={{ fontSize:10, color:"#9ca3af" }}>{formatCurrency((r.price * r.qty * r.gst) / 100)}</span></span>
                      ) : (
                        <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{r.price > 0 ? formatCurrency(rowAmount(r)) : "\u2014"}</span>
                      )}
                    </div>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <input type="number" className="pos-input-compact" value={r.freeQty || 0} min={0} onChange={e => updateRow(i, "freeQty", Number(e.target.value) || 0)} onWheel={e => e.target.blur()} style={{ width:48, fontSize:12, fontWeight:500, padding:"3px 4px" }}/>
                    </div>
                    <div style={{ display:"flex", justifyContent:"center" }}>
                      <button className="del-btn" onClick={() => deleteRow(i)} title="Remove item" style={{ width:20, height:20 }}>&times;</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>{/* end left */}

        {/* ── RIGHT: Customer + Payment Panel ── */}
        <div style={{ width:340, flexShrink:0, display:"flex", flexDirection:"column", overflow:"hidden", background:"#f9fafb" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>

            {/* Customer Search */}
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", display:"block", marginBottom:4 }}>
                Customer <span className="kbd" style={{ marginLeft:4 }}>F11</span>
              </label>
              <div style={{ display:"flex", gap:6, alignItems:"flex-start" }}>
                <div ref={nameSuggestRef} style={{ position:"relative", flex:2, minWidth:0 }}>
                  <input id="cust-name" className="pos-input" placeholder="Search for a customer by name, phone number" value={customer.name} onChange={e => handleNameSearch(e.target.value)} onFocus={() => { if (customer.name.length >= 2) handleNameSearch(customer.name); }} style={{ padding:"6px 8px", fontSize:12 }}/>
                  {customer.points > 0 && <div style={{ marginTop:3, fontSize:11, color:"#059669", fontWeight:600 }}>Points: {customer.points}</div>}
                  {nameSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#fff", border:"1px solid #d1d5db", borderRadius:4, zIndex:9999, maxHeight:200, overflowY:"auto", boxShadow:"0 6px 20px rgba(0,0,0,.1)" }}>
                      {nameSuggestions.map(c => (
                        <div key={c.id} className="customer-suggest-item" onMouseDown={() => selectCustomer(c)}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, color:"#111827", fontSize:12 }}>{c.name}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                              <IconPhone/>
                              <span style={{ fontSize:11, color:"#6b7280" }}>{c.phone}</span>
                              {parseFloat(c.advance_balance) > 0 && <span style={{ fontSize:9, fontWeight:700, background:"#f0fdf4", color:"#059669", borderRadius:2, padding:"1px 4px" }}>{formatCurrency(parseFloat(c.advance_balance))} adv</span>}
                              {parseFloat(c.pending_amount) > 0 && <span style={{ fontSize:9, fontWeight:700, background:"#fef2f2", color:"#dc2626", borderRadius:2, padding:"1px 4px" }}>{formatCurrency(parseFloat(c.pending_amount))} due</span>}
                            </div>
                            {c.address && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {customerSearchLoading && <span style={{ position:"absolute", right:8, top:"50%", width:12, height:12, border:"2px solid #d1d5db", borderTopColor:"#3b82f6", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>}
                </div>
                <div ref={phoneSuggestRef} style={{ position:"relative", flex:1, minWidth:0 }}>
                  <input className="pos-input" placeholder="Phone number" value={customer.phone} maxLength={10} onChange={e => handlePhoneSearch(e.target.value)} style={{ padding:"6px 8px", fontSize:12 }}/>
                  {phoneSuggestions.length > 0 && (
                    <div style={{ position:"absolute", top:"calc(100% + 2px)", left:0, right:0, background:"#fff", border:"1px solid #d1d5db", borderRadius:4, zIndex:9999, maxHeight:200, overflowY:"auto", boxShadow:"0 6px 20px rgba(0,0,0,.1)" }}>
                      {phoneSuggestions.map(c => (
                        <div key={c.id} className="customer-suggest-item" onMouseDown={() => selectCustomer(c)}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:600, color:"#111827", fontSize:12 }}>{c.name}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
                              <IconPhone/>
                              <span style={{ fontSize:11, color:"#6b7280" }}>{c.phone}</span>
                            </div>
                            {c.address && <div style={{ fontSize:10, color:"#9ca3af", marginTop:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{c.address}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {customer.id && (
                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:6 }}>
                  {pendingAmount > 0 && <span style={{ fontSize:10, fontWeight:600, background:"#fef2f2", color:"#dc2626", borderRadius:3, padding:"2px 6px", border:"1px solid #fecaca" }}>Pending: {formatCurrency(pendingAmount)}</span>}
                  {advanceAvailable > 0 && <span style={{ fontSize:10, fontWeight:600, background:"#f0fdf4", color:"#059669", borderRadius:3, padding:"2px 6px", border:"1px solid #bbf7d0" }}>Advance: {formatCurrency(advanceAvailable)}</span>}
                  {Number(customer.credit_enabled) === 1 && <span style={{ fontSize:10, fontWeight:600, background:"#fef2f2", color:"#dc2626", borderRadius:3, padding:"2px 6px", border:"1px solid #fecaca" }}>Credit{customer.credit_limit > 0 ? ` ${formatCurrency(Number(customer.credit_limit))}` : ""}</span>}
                </div>
              )}

              {billType === "gst_bill" && (
                <div style={{ marginTop:6 }}>
                  <label style={{ fontSize:10, fontWeight:600, color:"#d97706", textTransform:"uppercase", display:"block", marginBottom:3 }}>GST Number *</label>
                  <input className="pos-input" placeholder="29ABCDE1234F1Z5" value={customer.gst_no} maxLength={15} onChange={e => setCustomer(c => ({ ...c, gst_no: e.target.value.toUpperCase() }))} style={{ padding:"5px 8px", fontSize:12, letterSpacing:".03em" }}/>
                  <div style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{customer.gst_no.length}/15</div>
                </div>
              )}
            </div>

            {/* Total Section */}
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:6, padding:"10px 12px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Total</span>
                <span style={{ fontSize:18, fontWeight:800, color:"#111827" }}>{formatCurrency(total)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:12, color:"#6b7280" }}>Items:</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{totalItems}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"#6b7280" }}>Quantity:</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#374151" }}>{totalQty}</span>
              </div>
              <button onClick={() => setShowBreakup(!showBreakup)} style={{ width:"100%", background:"none", border:"1px solid #e5e7eb", borderRadius:4, padding:"5px 0", fontSize:11, fontWeight:600, color:"#6b7280", cursor:"pointer", fontFamily:"'Inter',sans-serif", textAlign:"center" }}>
                {showBreakup ? "Hide Breakup" : "Full Breakup"}
              </button>
              {showBreakup && (
                <div style={{ marginTop:8, padding:"8px 0", borderTop:"1px solid #f3f4f6" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, color:"#6b7280" }}>Sub Total</span>
                    <span style={{ fontSize:11, fontWeight:600, color:"#374151" }}>{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:11, color:"#6b7280" }}>Discount</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#dc2626" }}>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, color:"#6b7280" }}>GST{billType === "cash_bill" ? " (Cash Bill)" : ""}</span>
                    <span style={{ fontSize:11, fontWeight:600, color: billType === "gst_bill" ? "#d97706" : "#9ca3af" }}>{billType === "gst_bill" ? formatCurrency(gstTotal) : "\u2014"}</span>
                  </div>
                  {advanceUsed > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:11, color:"#6b7280" }}>Advance Applied</span>
                      <span style={{ fontSize:11, fontWeight:600, color:"#22c55e" }}>-{formatCurrency(advanceUsed)}</span>
                    </div>
                  )}
                  <div style={{ borderTop:"1px dashed #e5e7eb", marginTop:4, paddingTop:4, display:"flex", justifyContent:"space-between" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>Grand Total</span>
                    <span style={{ fontSize:12, fontWeight:800, color:"#111827" }}>{formatCurrency(total)}</span>
                  </div>
                </div>
              )}
            </div>

            {advanceAvailable > 0 && advanceUsed > 0 && (
              <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"6px 10px", marginBottom:10, fontSize:11, color:"#059669", fontWeight:600 }}>
                Advance {formatCurrency(advanceUsed)} auto-deducted{advanceAvailable > advanceUsed ? ` (${formatCurrency(advanceAvailable - advanceUsed)} remaining)` : ""}
              </div>
            )}

            {/* Payment Section */}
            <div style={{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:6, padding:"10px 12px", marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", marginBottom:6 }}>Payment Mode</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, marginBottom:10 }}>
                {paymentMethods.map((m, idx) => (
                  <button key={m.val} className="pay-method-btn" disabled={m.disabled} title={m.disabled ? m.disabledTitle : `Press ${idx+1}`}
                    onClick={() => !m.disabled && setPaymentMethod(m.val)}
                    style={{ border: paymentMethod === m.val ? `2px solid ${m.activeBg}` : `1px solid ${m.border}`, background: paymentMethod === m.val ? `${m.bg}` : "#fff", color: paymentMethod === m.val ? m.activeBg : m.color, fontWeight: paymentMethod === m.val ? 700 : 600 }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "credit" && (
                <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:4, padding:"6px 10px", marginBottom:8, fontSize:11, color:"#dc2626" }}>
                  <strong>Credit Sale</strong> - {advanceUsed > 0 ? `Outstanding: ${formatCurrency(effectiveTotal)} (after ${formatCurrency(advanceUsed)} advance).` : `Full ${formatCurrency(total)} recorded as outstanding.`}
                  {customer.credit_limit > 0 && <div style={{ marginTop:2, fontWeight:600 }}>Limit: {formatCurrency(Number(customer.credit_limit))}</div>}
                </div>
              )}

              {paymentMethod !== "credit" && (
                <>
                  <div style={{ fontSize:11, fontWeight:600, color:"#6b7280", textTransform:"uppercase", letterSpacing:".04em", marginBottom:4 }}>
                    {`Amount Received (${INR})`}
                  </div>
                  <input type="number" className="pos-input" placeholder={effectiveTotal > 0 ? formatCurrency(effectiveTotal) : "0.00"} value={payment.received} readOnly onWheel={e => e.target.blur()} style={{ fontSize:14, fontWeight:700, padding:"7px 10px", background:"#f3f4f6", cursor:"not-allowed", marginBottom:6 }}/>

                  {customer.id && (pendingAmount > 0 || advanceAvailable > 0) && (
                    <div style={{ border:"1px solid #e5e7eb", borderRadius:4, marginBottom:6, overflow:"hidden" }}>
                      <div style={{ background:"#f9fafb", padding:"4px 10px", borderBottom:"1px solid #e5e7eb", fontSize:10, fontWeight:600, color:"#6b7280", textTransform:"uppercase" }}>Account Summary</div>
                      <div style={{ display:"grid", gridTemplateColumns: pendingAmount > 0 && advanceAvailable > 0 ? "1fr 1fr" : "1fr" }}>
                        {pendingAmount > 0 && <div style={{ padding:"6px 10px", background:"#fef2f2", borderRight: advanceAvailable > 0 ? "1px solid #fecaca" : "none" }}><div style={{ fontSize:10, color:"#ef4444", fontWeight:600 }}>Pending</div><div style={{ fontSize:14, fontWeight:800, color:"#dc2626" }}>{formatCurrency(pendingAmount)}</div></div>}
                        {advanceAvailable > 0 && <div style={{ padding:"6px 10px", background:"#f0fdf4" }}><div style={{ fontSize:10, color:"#059669", fontWeight:600 }}>Advance</div><div style={{ fontSize:14, fontWeight:800, color:"#059669" }}>{formatCurrency(advanceAvailable)}</div></div>}
                      </div>
                    </div>
                  )}
                </>
              )}

              {paymentMethod === "credit" && (
                <div style={{ border:"1px solid #fecaca", borderRadius:4, marginBottom:8, background:"#fef2f2", overflow:"hidden" }}>
                  <div style={{ background:"#fee2e2", padding:"4px 10px", borderBottom:"1px solid #fecaca", fontSize:10, fontWeight:600, color:"#dc2626", textTransform:"uppercase" }}>Credit Summary</div>
                  <div style={{ padding:"6px 10px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:11, color:"#991b1b" }}>This Invoice</span><span style={{ fontSize:12, fontWeight:700, color:"#dc2626" }}>{formatCurrency(effectiveTotal)}</span></div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:11, color:"#991b1b" }}>Previous Pending</span><span style={{ fontSize:12, fontWeight:700, color:"#dc2626" }}>{formatCurrency(pendingAmount)}</span></div>
                    <div style={{ borderTop:"1px dashed #fca5a5", margin:"3px 0" }}/>
                    <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:11, fontWeight:700, color:"#991b1b" }}>Total Outstanding</span><span style={{ fontSize:13, fontWeight:800, color:"#991b1b" }}>{formatCurrency(pendingAmount + effectiveTotal)}</span></div>
                  </div>
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 10px", background: extraAmount > 0 ? "#f0fdf4" : "#f9fafb", border: extraAmount > 0 ? "1px solid #bbf7d0" : "1px solid #e5e7eb", borderRadius:4, marginTop:6 }}>
                <span style={{ fontSize:12, fontWeight:600, color: extraAmount > 0 ? "#059669" : pendingBalance > 0 ? "#dc2626" : "#6b7280" }}>Change to Return</span>
                <span style={{ fontSize:14, fontWeight:800, color: extraAmount > 0 ? "#059669" : pendingBalance > 0 ? "#dc2626" : "#111827" }}>{formatCurrency(changeToReturn)}</span>
              </div>
              {extraAmount > 0 && <div style={{ fontSize:10, color:"#059669", fontWeight:500, textAlign:"right", marginTop:2 }}>Extra amount returned to customer</div>}
              {pendingBalance > 0 && <div style={{ fontSize:10, color:"#dc2626", fontWeight:500, textAlign:"right", marginTop:2 }}>Amount pending from customer</div>}
            </div>

            <div style={{ fontSize:11, color:"#6b7280", fontWeight:500, marginBottom:6, textAlign:"center" }}>Earn: {earnedPoints} loyalty points</div>
          </div>

          {/* Bottom Action Buttons */}
          <div style={{ padding:"10px 14px", borderTop:"1px solid #e5e7eb", background:"#fff", display:"flex", gap:8, flexShrink:0 }}>
            <button className="pos-btn-primary" onClick={handleGenerate} disabled={generating || !selectedCompany}>
              {generating ? (
                <span style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                  <span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.4)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"spin .7s linear infinite" }}/>
                  Generating...
                </span>
              ) : (
                <span style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center" }}>
                  <IconReceipt/> Save & Print Bill <span className="kbd" style={{ background:"rgba(255,255,255,.25)", color:"#fff", borderColor:"rgba(255,255,255,.4)", marginLeft:2 }}>Ctrl+P</span>
                </span>
              )}
            </button>
            <button className="pos-btn-secondary" onClick={() => { setPaymentMethod("credit"); }} title="Other/Credit Payments">
              Other/Credit <span className="kbd" style={{ marginLeft:2 }}>Ctrl+M</span>
            </button>
          </div>
        </div>{/* end right panel */}

      </div>{/* end main content */}
    </div>
  );
}
