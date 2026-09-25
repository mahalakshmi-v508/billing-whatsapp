import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  Search,
  Plus,
  X,
  HelpCircle,
  Settings,
  Minimize2,
  Phone,
  Clock,
  Star,
  Barcode,
  ShoppingBag,
  Sparkles,
  Mic,
  MicOff,
  AlertCircle,
  AlertTriangle,
  Info,
  CreditCard,
  Wallet,
  Receipt,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  Printer,
  Trash2,
  Tag,
  Boxes,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
} from "lucide-react";

/* ── Currency Helper ─────────────────────────────────────────────────── */
const INR = "\u20B9";
const formatCurrency = (amount) => `${INR}${Number(amount || 0).toFixed(2)}`;

/* ── Toast Component ─────────────────────────────────────────────────── */
function ToastPortal({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 pointer-events-none font-['Plus_Jakarta_Sans',sans-serif]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 min-w-[280px] max-w-[380px] px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200 border ${t.type === "success"
              ? "bg-slate-900/90 border-emerald-500/40 text-white"
              : t.type === "error"
                ? "bg-red-950/90 border-red-500/40 text-white"
                : t.type === "warning"
                  ? "bg-amber-950/90 border-amber-500/40 text-white"
                  : "bg-slate-900/90 border-indigo-500/40 text-white"
            }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${t.type === "success"
                ? "bg-emerald-500 text-white"
                : t.type === "error"
                  ? "bg-red-500 text-white"
                  : t.type === "warning"
                    ? "bg-amber-500 text-white"
                    : "bg-indigo-500 text-white"
              }`}
          >
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "!"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-snug">{t.msg}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Bilingual Help Content ──────────────────────────────────────────── */
const HELP = {
  en: {
    title: "POS Billing Quick Guide",
    subtitle: "High-speed cashier keyboard shortcuts & tips",
    sections: [
      {
        heading: "Essential Keyboard Shortcuts",
        items: [
          { key: "F2", desc: "Focus product search / barcode input" },
          { key: "F3", desc: "Focus customer name & profile search" },
          { key: "F8", desc: "Instantly generate and print invoice" },
          { key: "Ctrl + T", desc: "Open a brand new active bill tab" },
          { key: "Ctrl + P", desc: "Trigger Save & Print Invoice" },
          { key: "Ctrl + M", desc: "Switch directly to Credit / Other payments" },
          { key: "1 / 2 / 3 / 4", desc: "Quick-toggle: Cash (1), Online (2), UPI (3), Credit (4)" },
          { key: "Esc", desc: "Dismiss open dropdowns, panels & search lists" },
        ],
      },
      {
        heading: "Product Search & Scanning",
        items: [
          { key: "Item Name", desc: "Type letters to trigger instant live suggestions" },
          { key: "Barcode Scan", desc: "Scan or enter barcode code; press Enter to add" },
          { key: "Blank Focus", desc: "Displays frequent & recently billed items" },
          { key: "Duplicates", desc: "Scanning same product increments cart quantity automatically" },
        ],
      },
      {
        heading: "Quick Add (Unlisted Items)",
        items: [
          { key: "Not Found", desc: "Quick-Add card appears when product is not in database" },
          { key: "Bill Only", desc: "Add custom item name & rate into current bill without inventory creation" },
        ],
      },
      {
        heading: "Settlement & Credit Ledger",
        items: [
          { key: "Advance", desc: "Customer advance balance is automatically applied" },
          { key: "Credit", desc: "Credit enabled exclusively for pre-authorized parties" },
          { key: "Change", desc: "Calculates exact cash change to return to customer" },
        ],
      },
    ],
  },
  ta: {
    title: "பில்லிங் உதவி வழிகாட்டி",
    subtitle: "விசைப்பலகை மூலம் அதிவேக பில்லிங் நுணுக்கங்கள்",
    sections: [
      {
        heading: "முக்கிய விசைப்பலகை குறுக்குவழிகள்",
        items: [
          { key: "F2", desc: "தயாரிப்பு / பார்கோட் தேடல் பெட்டியை திறக்க" },
          { key: "F3", desc: "வாடிக்கையாளர் பெயர் தேடலை திறக்க" },
          { key: "F8", desc: "உடனடியாக இன்வாய்ஸ் உருவாக்க" },
          { key: "Ctrl + T", desc: "புதிய பில் தாவலைத் திறக்க" },
          { key: "Ctrl + P", desc: "பில் அச்சிட" },
          { key: "1/2/3/4", desc: "கட்டணம்: ரொக்கம்/ஆன்லைன்/UPI/கடன்" },
        ],
      },
      {
        heading: "தயாரிப்பு தேடல் & பார்கோட்",
        items: [
          { key: "பெயர்", desc: "தயாரிப்பு பெயரை தட்டச்சு செய்து உடனே தேர்ந்தெடுக்கவும்" },
          { key: "பார்கோட்", desc: "பார்கோட் ஸ்கேன் செய்து Enter அழுத்தவும்" },
          { key: "அளவு", desc: "மீண்டும் சேர்த்தால் அளவு தானாக அதிகரிக்கும்" },
        ],
      },
      {
        heading: "விரைவு சேர்க்கை",
        items: [
          { key: "பட்டியலில் இல்லை", desc: "தயாரிப்பு இல்லாவிட்டால் விரைவு சேர்க்கை பலகம் தோன்றும்" },
        ],
      },
    ],
  },
};

/* ── LocalStorage Helpers ───────────────────────────────────────────── */
const LS_RECENT_KEY = "billing_recent_products";
const LS_FREQ_KEY = "billing_freq_products";

function getRecent() {
  try { return JSON.parse(localStorage.getItem(LS_RECENT_KEY) || "[]"); } catch { return []; }
}
function getFrequent() {
  try { return JSON.parse(localStorage.getItem(LS_FREQ_KEY) || "{}"); } catch { return {}; }
}
function trackUsage(product) {
  const recent = getRecent().filter((p) => p.id !== product.id);
  recent.unshift({
    id: product.id,
    product_name: product.product_name || product.name,
    price: product.price,
    product_code: product.product_code,
    unit: product.unit,
    gst_percentage: Number(product.gst_percentage ?? product.gst ?? product.tax_percent ?? 0),
    stock: product.stock,
    status: "active",
  });
  localStorage.setItem(LS_RECENT_KEY, JSON.stringify(recent.slice(0, 8)));
  const freq = getFrequent();
  freq[product.id] = (freq[product.id] || 0) + 1;
  localStorage.setItem(LS_FREQ_KEY, JSON.stringify(freq));
}

function emptyRow() {
  return { product_id: null, name: "", product_code: "", price: 0, qty: 0, discount: 0, freeQty: 0, gst: 0, unit: "", stock: 0, isUnlisted: false };
}

function createFreshBill(id) {
  return {
    id,
    rows: [emptyRow()],
    customer: { id: null, name: "", phone: "", address: "", gst_no: "", credit_enabled: "0", credit_limit: 0, points: 0, advance_balance: 0, pending_amount: 0 },
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
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const adminId = user.role === "cashier" ? user.admin_id : user.id;
  const navigate = useNavigate();

  /* ══ MULTI-BILL TAB STATE ══ */
  const [bills, setBills] = useState(() => [createFreshBill("SS3")]);
  const [activeBillId, setActiveBillId] = useState("SS3");
  const billCounterRef = useRef(4);

  const activeBill = bills.find((b) => b.id === activeBillId) || bills[0];

  const rows = activeBill.rows;
  const customer = activeBill.customer;
  const billType = activeBill.billType;
  const paymentMethod = activeBill.paymentMethod;
  const payment = activeBill.payment;
  const showBreakup = activeBill.showBreakup;

  /* Per-bill setters */
  const setRows = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, rows: typeof val === "function" ? val(b.rows) : val } : b)));
  }, [activeBillId]);

  const setCustomer = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, customer: typeof val === "function" ? val(b.customer) : val } : b)));
  }, [activeBillId]);

  const setBillType = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, billType: val } : b)));
  }, [activeBillId]);

  const setPaymentMethod = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, paymentMethod: val } : b)));
  }, [activeBillId]);

  const setPayment = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, payment: typeof val === "function" ? val(b.payment) : val } : b)));
  }, [activeBillId]);

  const setShowBreakup = useCallback((val) => {
    setBills((prev) => prev.map((b) => (b.id === activeBillId ? { ...b, showBreakup: val } : b)));
  }, [activeBillId]);

  /* ══ SHARED STATE ══ */
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(localStorage.getItem("selected_company_id") || "");

  const [globalSearch, setGlobalSearch] = useState("");
  const [globalSuggestions, setGlobalSuggestions] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const [showNoResult, setShowNoResult] = useState(false);
  const [recentProducts, setRecentProducts] = useState([]);
  const globalSearchRef = useRef(null);
  const suggestBoxRef = useRef(null);
  const searchTimer = useRef(null);
  const justSelectedRef = useRef(false);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickItem, setQuickItem] = useState({ name: "", price: "", qty: 1, unit: "" });

  const [showHelp, setShowHelp] = useState(false);
  const [helpLang, setHelpLang] = useState("en");

  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const nameSuggestRef = useRef(null);
  const phoneSuggestRef = useRef(null);
  const nameSearchTimer = useRef(null);
  const phoneSearchTimer = useRef(null);

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [addCustomerName, setAddCustomerName] = useState("");
  const [addCustomerPhone, setAddCustomerPhone] = useState("");
  const [addCustomerAddress, setAddCustomerAddress] = useState("");

  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiAnomalies, setAiAnomalies] = useState([]);
  const [isListening, setIsListening] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [toasts, setToasts] = useState([]);
  const handleGenerateRef = useRef(null);

  /* ── Derived Totals ── */
  const subtotal = rows.reduce((s, r) => s + r.price * r.qty, 0);
  const totalDiscount = rows.reduce((s, r) => s + (Number(r.discount) || 0), 0);
  const gstTotal = billType === "gst_bill" ? rows.reduce((s, r) => s + (r.price * r.qty * r.gst) / 100, 0) : 0;
  const total = subtotal + gstTotal - totalDiscount;
  const earnedPoints = Math.floor(total / 100);
  const received = parseFloat(payment.received) || 0;
  const advanceAvailable = parseFloat(customer.advance_balance) || 0;
  const pendingAmount = parseFloat(customer.pending_amount) || 0;
  const advanceUsed = Math.min(advanceAvailable, total);
  const effectiveTotal = total - advanceUsed;
  const totalCovered = received + advanceUsed;
  const balance = totalCovered - total;
  const cashNeeded = effectiveTotal;
  const extraAmount = received > cashNeeded ? received - cashNeeded : 0;
  const pendingBalance = received < cashNeeded ? cashNeeded - received : 0;
  const validRows = rows.filter((r) => r.name && r.price > 0 && r.qty > 0);
  const totalItems = validRows.length;
  const totalQty = validRows.reduce((s, r) => s + r.qty + (Number(r.freeQty) || 0), 0);
  const changeToReturn = extraAmount;

  /* Performance: product maps */
  const productById = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products]);
  const productByCode = useMemo(() => {
    const m = {};
    products.forEach((p) => { if (p.product_code) m[String(p.product_code).toLowerCase()] = p; });
    return m;
  }, [products]);

  /* ══ EFFECTS ══ */
  useEffect(() => {
    api.get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data.status) return;
        const loadedCompanies = res.data.data || [];
        setCompanies(loadedCompanies);

        const company = loadedCompanies.find((c) => String(c.id) === String(selectedCompany));
        if (company?.gst_type === "with_gst") {
          setBills((prev) => prev.map((bill) => (
            bill.rows.every((row) => !row.name && !row.product_id)
              ? { ...bill, billType: "gst_bill" }
              : bill
          )));
        }
      });
  }, [adminId, selectedCompany]);

  useEffect(() => {
    if (!selectedCompany) return;
    api.get("/product/get", { params: { company_id: selectedCompany } })
      .then((r) => {
        if (r.data.status) setProducts((r.data.data || []).filter((p) => p.status === "active"));
      });
  }, [selectedCompany]);

  useEffect(() => { setRecentProducts(getRecent()); }, []);

  /* AI Suggestions effect */
  useEffect(() => {
    if (!selectedCompany) return;
    const cartProductIds = validRows.map((r) => r.product_id).filter(Boolean);
    api.post("/ai/smart_suggest", {
      company_id: selectedCompany,
      customer_id: customer.id || 0,
      cart_product_ids: cartProductIds,
    }).then((res) => {
      if (res.data.status) setAiSuggestions(res.data.data || []);
    }).catch(() => { });
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
        total_amount: total,
      }).then((res) => {
        if (res.data.status) setAiAnomalies(res.data.anomalies || []);
      }).catch(() => { });
    }, 400);
    return () => clearTimeout(timer);
  }, [validRows, total]);

  const showToast = useCallback((msg, type = "error") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  const handleAiCopilotSubmit = async (queryText) => {
    const text = queryText || aiPrompt;
    if (!text.trim() || !selectedCompany) return;
    setAiLoading(true);
    try {
      const res = await api.post("/ai/copilot", {
        prompt: text,
        company_id: selectedCompany,
        cart: validRows,
      });
      if (res.data.status) {
        showToast(res.data.message, "success");
        const actions = res.data.actions || [];
        const itemsToAdd = [];

        actions.forEach((act) => {
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
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      showToast("Speech Recognition not supported in browser", "warning");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
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
  }, [customer.credit_enabled, paymentMethod, setPaymentMethod]);

  useEffect(() => {
    if (paymentMethod !== "credit") setPayment((p) => ({ ...p, received: effectiveTotal }));
  }, [total, paymentMethod, advanceUsed, effectiveTotal, setPayment]);

  /* Outside-click close */
  useEffect(() => {
    const handler = (e) => {
      if (suggestBoxRef.current && !suggestBoxRef.current.contains(e.target)) {
        setShowSuggest(false);
        setSuggestIndex(-1);
      }
      if (nameSuggestRef.current && !nameSuggestRef.current.contains(e.target)) setNameSuggestions([]);
      if (phoneSuggestRef.current && !phoneSuggestRef.current.contains(e.target)) setPhoneSuggestions([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Frequent products */
  const freqObjects = useMemo(() => {
    const freq = getFrequent();
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => productById[id])
      .filter(Boolean)
      .filter((p) => p.status === "active");
  }, [productById]);

  /* ══ BILL TABS ══ */
  const createNewBill = useCallback(() => {
    const num = billCounterRef.current++;
    const newId = `SS${num}`;
    const newBill = createFreshBill(newId);
    setBills((prev) => [...prev, newBill]);
    setActiveBillId(newId);
    setGlobalSearch("");
    setShowSuggest(false);
    setSuggestIndex(-1);
    setShowNoResult(false);
    setShowQuickAdd(false);
  }, []);

  const closeBill = useCallback((billId) => {
    setBills((prev) => {
      const remaining = prev.filter((b) => b.id !== billId);
      if (remaining.length === 0) {
        const fresh = createFreshBill("SS3");
        billCounterRef.current = 4;
        return [fresh];
      }
      if (activeBillId === billId) {
        const idx = prev.findIndex((b) => b.id === billId);
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

  /* Global keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toUpperCase() : "";
      const isInput = activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT";

      if (e.key === "F2") { e.preventDefault(); globalSearchRef.current?.focus(); }
      if (e.key === "F3") { e.preventDefault(); document.getElementById("cust-name")?.focus(); }
      if (e.key === "F8") { e.preventDefault(); handleGenerateRef.current?.(); }
      if (e.key === "Escape") {
        setShowHelp(false);
        setShowSuggest(false);
        setSuggestIndex(-1);
        setShowNoResult(false);
        setShowQuickAdd(false);
      }

      if (e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        createNewBill();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        handleGenerateRef.current?.();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        setPaymentMethod("credit");
      }

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
  }, [customer, createNewBill, setPaymentMethod]);

  /* ══ PRODUCT SEARCH ══ */
  const handleGlobalSearch = useCallback((value) => {
    setGlobalSearch(value);
    setShowNoResult(false);
    setShowQuickAdd(false);
    setSuggestIndex(-1);
    clearTimeout(searchTimer.current);

    if (!value.trim()) {
      const recent = getRecent().filter((p) => productById[p.id] && productById[p.id].status === "active");
      const list = recent.length > 0 ? recent : products.filter((p) => p.status === "active" && p.stock > 0).slice(0, 12);
      setGlobalSuggestions(list);
      setShowSuggest(list.length > 0);
      return;
    }

    searchTimer.current = setTimeout(() => {
      const q = value.toLowerCase();
      const filtered = products.filter((p) =>
        p.status === "active" &&
        (p.product_name.toLowerCase().includes(q) || String(p.product_code || "").toLowerCase().includes(q))
      );
      setGlobalSuggestions(filtered.slice(0, 20));
      setShowSuggest(filtered.length > 0);
      if (filtered.length === 0) setShowNoResult(true);
    }, 200);
  }, [products, productById]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestIndex((i) => Math.min(i + 1, globalSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestIndex >= 0 && globalSuggestions[suggestIndex]) {
        addOrMergeProduct(globalSuggestions[suggestIndex]);
        return;
      }
      const code = globalSearch.trim().toLowerCase();
      if (productByCode[code]) {
        addOrMergeProduct(productByCode[code]);
        return;
      }
      if (globalSuggestions.length > 0) addOrMergeProduct(globalSuggestions[0]);
    } else if (e.key === "Escape") {
      setShowSuggest(false);
      setSuggestIndex(-1);
    }
  };

  const addOrMergeProduct = useCallback((product, qtyToAdd = 1) => {
    if (!product) return;
    const p = productById[product.id] || productById[product.product_id] || product;
    const pid = p.id || p.product_id;
    const qtyNum = Number(qtyToAdd) || 1;

    setRows((prevRows) => {
      const updated = [...prevRows];
      const existingIdx = updated.findIndex((r) => String(r.product_id) === String(pid) && !r.isUnlisted);

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
          gst: Number(p.gst_percentage ?? p.gst ?? p.tax_percent ?? 0),
          qty: qtyNum,
          discount: 0,
          freeQty: 0,
          unit: p.unit || "",
          stock: Number(p.stock || 0),
          isUnlisted: false,
        };
        const lastEmptyIdx = updated.findLastIndex
          ? updated.findLastIndex((r) => !r.name && !r.product_id)
          : updated.reduceRight((acc, r, i) => (acc === -1 && (!r.name && !r.product_id) ? i : acc), -1);
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

    setRows((prevRows) => {
      let updated = [...prevRows];
      itemsList.forEach((item) => {
        const rawProduct = item.product || item;
        const qtyNum = Number(item.quantity || item.qty || 1);
        const p = productById[rawProduct.id] || productById[rawProduct.product_id] || rawProduct;
        const pid = p.id || p.product_id;

        const existingIdx = updated.findIndex((r) => String(r.product_id) === String(pid) && !r.isUnlisted);

        if (existingIdx !== -1) {
          const newQty = updated[existingIdx].qty + qtyNum;
          updated[existingIdx] = { ...updated[existingIdx], qty: newQty };
        } else {
          const newRow = {
            product_id: pid,
            name: p.product_name || p.name,
            product_code: p.product_code || "",
            price: Number(p.price),
            gst: Number(p.gst_percentage ?? p.gst ?? p.tax_percent ?? 0),
            qty: qtyNum,
            discount: 0,
            freeQty: 0,
            unit: p.unit || "",
            stock: Number(p.stock || 0),
            isUnlisted: false,
          };
          const lastEmptyIdx = updated.findLastIndex
            ? updated.findLastIndex((r) => !r.name && !r.product_id)
            : updated.reduceRight((acc, r, i) => (acc === -1 && (!r.name && !r.product_id) ? i : acc), -1);
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
    if (!quickItem.name.trim() || !quickItem.price) {
      showToast("Enter item name and price", "error");
      return;
    }
    const newRow = {
      product_id: null,
      name: quickItem.name.trim(),
      product_code: "",
      price: Number(quickItem.price),
      gst: 0,
      qty: Number(quickItem.qty) || 1,
      discount: 0,
      freeQty: 0,
      unit: quickItem.unit,
      stock: 9999,
      isUnlisted: true,
    };
    setRows((prevRows) => {
      const updated = [...prevRows];
      const lastEmptyIdx = updated.reduceRight((acc, r, i) => (acc === -1 && (!r.name && !r.product_id) ? i : acc), -1);
      if (lastEmptyIdx !== -1) updated[lastEmptyIdx] = newRow;
      else updated.push(newRow);
      if (updated[updated.length - 1].name) updated.push(emptyRow());
      return updated;
    });
    setQuickItem({ name: "", price: "", qty: 1, unit: "" });
    setShowQuickAdd(false);
    setGlobalSearch("");
    setShowNoResult(false);
    showToast(`"${newRow.name}" added to bill`, "success");
    globalSearchRef.current?.focus();
  };

  /* Row operations */
  const updateRow = useCallback((i, field, value) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[i] = { ...updated[i], [field]: value };
      return updated;
    });
  }, [setRows]);

  const updateQty = useCallback((i, value) => {
    const num = Number(value);
    setRows((prev) => {
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

  const deleteRow = (i) => {
    setRows((prev) => {
      if (prev.length === 1) return [emptyRow()];
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const rowAmount = (r) => {
    const base = r.price * r.qty;
    const disc = Number(r.discount) || 0;
    const gstAmt = billType === "gst_bill" ? (base * r.gst) / 100 : 0;
    return base + gstAmt - disc;
  };

  /* ══ CUSTOMER SELECTION LOGIC ══ */
  const fetchCustomerById = async (id) => {
    try {
      const res = await api.get(`/customer/get_customer_by_id?id=${id}`);
      if (res.data.status && res.data.data) return res.data.data;
    } catch { }
    return null;
  };

  const selectCustomer = async (c) => {
    setCustomer((prev) => ({
      ...prev,
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address || "",
      gst_no: c.gst_no || "",
      credit_enabled: c.credit_enabled || "0",
      credit_limit: c.credit_limit || 0,
      points: c.loyalty_points || 0,
      advance_balance: parseFloat(c.advance_balance) || 0,
      pending_amount: parseFloat(c.pending_amount) || 0,
    }));
    setNameSuggestions([]);
    setPhoneSuggestions([]);
    const fresh = await fetchCustomerById(c.id);
    if (fresh) {
      const adv = parseFloat(fresh.advance_balance) || 0;
      const pending = parseFloat(fresh.pending_amount) || 0;
      const pts = parseInt(fresh.loyalty_points) || 0;
      setCustomer({
        id: fresh.id,
        name: fresh.name,
        phone: fresh.phone,
        address: fresh.address || "",
        gst_no: fresh.gst_no || "",
        credit_enabled: fresh.credit_enabled || "0",
        credit_limit: fresh.credit_limit || 0,
        points: pts,
        advance_balance: adv,
        pending_amount: pending,
      });
      const msgs = [];
      if (pts > 0) msgs.push(`${pts} pts`);
      if (adv > 0) msgs.push(`${formatCurrency(adv)} adv`);
      if (pending > 0) msgs.push(`${formatCurrency(pending)} due`);
      showToast(msgs.length > 0 ? `Customer verified (${msgs.join(" · ")})` : "Customer selected", pending > 0 ? "warning" : "success");
    } else {
      showToast("Customer selected", "success");
    }
  };

  const handleNameSearch = (value) => {
    setCustomer((c) => ({ ...c, name: value, id: null, credit_enabled: "0", advance_balance: 0, pending_amount: 0 }));
    clearTimeout(nameSearchTimer.current);
    if (!value || value.length < 2) {
      setNameSuggestions([]);
      return;
    }
    nameSearchTimer.current = setTimeout(async () => {
      if (!selectedCompany) return;
      setCustomerSearchLoading(true);
      try {
        const res = await api.get("/customer/customer_search", { params: { admin_id: adminId, q: value } });
        const results = res.data.status ? res.data.data || [] : [];
        setNameSuggestions(results);
      } catch {
        setNameSuggestions([]);
      }
      setCustomerSearchLoading(false);
    }, 300);
  };

  const handlePhoneSearch = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    setCustomer((c) => ({ ...c, phone: digits, id: null, name: c.id ? "" : c.name, credit_enabled: "0", advance_balance: 0, pending_amount: 0 }));
    setPhoneSuggestions([]);
    clearTimeout(phoneSearchTimer.current);
    if (digits.length !== 10) return;
    phoneSearchTimer.current = setTimeout(async () => {
      if (!selectedCompany) return;
      setCustomerSearchLoading(true);
      try {
        const res = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, phone: digits } });
        if (res.data.status && res.data.data) {
          await selectCustomer(res.data.data);
          setCustomerSearchLoading(false);
          return;
        }
        setAddCustomerPhone(digits);
        setAddCustomerName(customer.name || "");
        setAddCustomerAddress("");
        setShowAddCustomer(true);
      } catch { }
      setCustomerSearchLoading(false);
    }, 300);
  };

  const handleSaveNewCustomer = async () => {
    if (!addCustomerName.trim()) { showToast("Customer name is required", "error"); return; }
    if (!addCustomerPhone.trim() || !/^[0-9]{10}$/.test(addCustomerPhone.trim())) {
      showToast("Valid 10-digit phone number required", "error");
      return;
    }
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
          setCustomer((c) => ({ ...c, name: addCustomerName.trim(), phone: addCustomerPhone.trim(), address: addCustomerAddress.trim() }));
        }
        showToast("Customer profile created successfully", "success");
        setShowAddCustomer(false);
        setAddCustomerName("");
        setAddCustomerPhone("");
        setAddCustomerAddress("");
      } else {
        if (res.data.message && res.data.message.includes("already exists")) {
          const phoneRes = await api.get("/customer/get_by_phone", { params: { admin_id: adminId, phone: addCustomerPhone.trim() } });
          if (phoneRes.data.status && phoneRes.data.data) {
            await selectCustomer(phoneRes.data.data);
            showToast("Customer already exists - loaded profile", "success");
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

  /* ══ INVOICE GENERATION ══ */
  const saveOrGetCustomer = async () => {
    if (customer.id) return customer.id;
    const res = await api.post("/customer/customer_save", {
      company_id: selectedCompany,
      admin_id: adminId,
      name: customer.name || "Customer",
      phone: customer.phone,
      gst_no: billType === "gst_bill" ? customer.gst_no : "",
    });
    if (res.data.status) return res.data.customer_id;
    throw new Error(res.data.message || "Failed to save customer");
  };

  const handleGenerate = async () => {
    if (!customer.name.trim() && !customer.phone.trim()) { showToast("Enter Customer Name or Phone Number!", "error"); return; }
    if (customer.phone.trim() && !/^[0-9]{10}$/.test(customer.phone)) { showToast("Enter a valid 10-digit mobile number!", "error"); return; }
    if (billType === "gst_bill" && !customer.gst_no.trim()) { showToast("GST Number is mandatory for GST Bill!", "error"); return; }
    if (validRows.length === 0) { showToast("Add at least one product to the invoice!", "error"); return; }
    if (paymentMethod !== "credit" && received <= 0 && advanceUsed < total) { showToast("Enter received payment amount!", "error"); return; }
    if (paymentMethod === "credit" && Number(customer.credit_enabled) === 1) {
      const limit = parseFloat(customer.credit_limit) || 0;
      if (limit > 0 && total > limit) {
        showToast(`Purchase ${formatCurrency(total)} exceeds credit limit of ${formatCurrency(limit)}!`, "error");
        return;
      }
    }
    if (!selectedCompany) { showToast("Please select billing company!", "error"); return; }

    setGenerating(true);
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      const customer_id = await saveOrGetCustomer();
      const res = await api.post("/invoice/create_invoice", {
        company_id: selectedCompany,
        customer_id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        cashier_id: u.id,
        products: validRows,
        sub_total: subtotal,
        gst_total: gstTotal,
        total_amount: total,
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
        showToast(parts.length > 0 ? `Invoice generated! ${parts.join(" · ")}` : "Invoice generated successfully!", "success");
        setTimeout(() => navigate(`/invoice/${res.data.invoice_no}`), 900);
      } else {
        showToast(res.data.message || "Something went wrong", "error");
      }
    } catch (err) {
      showToast(err.message || "Server error. Please try again!", "error");
    }
    setGenerating(false);
  };

  useEffect(() => { handleGenerateRef.current = handleGenerate; });

  const paymentMethods = [
    { val: "cash", label: "Cash", color: "emerald", keyNum: "1" },
    { val: "online", label: "Online", color: "blue", keyNum: "2" },
    { val: "upi", label: "UPI", color: "violet", keyNum: "3" },
    {
      val: "credit",
      label: "Credit",
      color: "red",
      keyNum: "4",
      disabled: Number(customer.credit_enabled) !== 1,
      disabledTitle: "Credit facility not authorized for this customer",
    },
  ];

  const billDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — MODERN PAYSPLITX POS LAYOUT
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen w-full flex flex-col bg-slate-100 font-['Plus_Jakarta_Sans',sans-serif] text-slate-900 select-none overflow-hidden">
      <ToastPortal toasts={toasts} />

      {/* ── Help Panel Modal ── */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 p-6 flex-shrink-0 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold leading-tight">{HELP[helpLang].title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{HELP[helpLang].subtitle}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelp(false)}
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                {["en", "ta"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setHelpLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${helpLang === lang
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white/10 text-slate-300 hover:bg-white/15"
                      }`}
                  >
                    {lang === "en" ? "English" : "தமிழ்"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {HELP[helpLang].sections.map((sec, si) => (
                <div key={si} className="space-y-3">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    {sec.heading}
                  </div>
                  <div className="space-y-2">
                    {sec.items.map((item, ii) => (
                      <div key={ii} className="flex items-start justify-between gap-3 text-xs p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 font-mono shadow-2xs whitespace-nowrap">
                          {item.key}
                        </kbd>
                        <span className="text-slate-600 text-right leading-relaxed flex-1">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Add New Customer Modal ── */}
      {showAddCustomer && (
        <div
          className="fixed inset-0 z-[100000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAddCustomer(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New Customer</h3>
                  <p className="text-xs text-slate-400">Quick-save profile for billing</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 transition-all"
                  placeholder="e.g. John Doe or Trade Name"
                  value={addCustomerName}
                  onChange={(e) => setAddCustomerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 transition-all"
                  placeholder="10-digit mobile number"
                  value={addCustomerPhone}
                  maxLength={10}
                  onChange={(e) => setAddCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-slate-700 mb-1.5">Address (Optional)</label>
                <input
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-3 focus:ring-indigo-100 transition-all"
                  placeholder="Street / City / Locality"
                  value={addCustomerAddress}
                  onChange={(e) => setAddCustomerAddress(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddCustomer(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewCustomer}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          1. TOP APP HEADER & MULTI-BILL BAR
      ════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 bg-slate-900 text-white px-4 flex items-center justify-between gap-4 flex-shrink-0 z-30 shadow-md">
        {/* Left: POS Branding & Bill Tabs */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0 pr-3 border-r border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-glow-brand">
              <Sparkles size={16} />
            </div>
            <div>
              <span className="font-display font-bold text-xs tracking-tight text-white block leading-tight">PaySplit POS</span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wide block leading-none">Cashio Terminal</span>
            </div>
          </div>

          {/* Bill Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {bills.map((b) => {
              const isActive = b.id === activeBillId;
              return (
                <div
                  key={b.id}
                  onClick={() => switchBill(b.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all whitespace-nowrap border ${isActive
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-900/50"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                >
                  <Receipt size={13} className={isActive ? "text-indigo-200" : "text-slate-400"} />
                  <span>#{b.id}</span>
                  {bills.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeBill(b.id);
                      }}
                      title={`Close ${b.id}`}
                      className="w-4 h-4 rounded-md hover:bg-black/20 flex items-center justify-center text-[10px] opacity-70 hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={createNewBill}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-all cursor-pointer"
              title="Open New Bill (Ctrl+T)"
            >
              <Plus size={13} />
              <span>New Bill</span>
              <kbd className="text-[9px] font-mono opacity-80 ml-1 px-1 py-0.2 rounded bg-emerald-950/60 border border-emerald-500/30">
                Ctrl+T
              </kbd>
            </button>
          </div>
        </div>

        {/* Right: Bill Type, Company & Global Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Bill Type Selector */}
          <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setBillType("cash_bill")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${billType === "cash_bill"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
                }`}
            >
              Cash Bill
            </button>
            <button
              type="button"
              onClick={() => setBillType("gst_bill")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${billType === "gst_bill"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-300 hover:text-white"
                }`}
            >
              GST Bill
            </button>
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Quick Action Icons */}
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            title="POS Keyboard Shortcuts & Help"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <HelpCircle size={16} />
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            title="Return to Dashboard"
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          2. PRODUCT LIVE SEARCH & BARCODE SCANNER TOOLBAR
      ════════════════════════════════════════════════════════════════════ */}
      <div
        ref={suggestBoxRef}
        className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 z-20 flex-shrink-0 shadow-2xs"
      >
        {/* Search Input Box */}
        <div className="relative flex-1 min-w-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              ref={globalSearchRef}
              id="global-product-search"
              type="text"
              placeholder="Scan Barcode or type item name / HSN code / model..."
              value={globalSearch}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              onFocus={() => {
                if (justSelectedRef.current) {
                  justSelectedRef.current = false;
                  return;
                }
                handleGlobalSearch(globalSearch);
              }}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              className="w-full pl-10 pr-24 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-none"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 pointer-events-none">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-200/80 px-1.5 py-0.5 rounded-md">
                <Barcode size={13} />
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-mono font-bold text-[10px] border border-indigo-200">
                F2
              </kbd>
            </div>
          </div>

          {/* Live Search Suggestions Dropdown */}
          {showSuggest && globalSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 max-h-80 overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {!globalSearch.trim() && recentProducts.length > 0 && (
                <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock size={12} /> Recent Items
                </div>
              )}
              {globalSuggestions.map((s, idx) => {
                const isSelected = suggestIndex === idx;
                return (
                  <div
                    key={s.id}
                    onMouseDown={() => addOrMergeProduct(s)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? "bg-indigo-50/90 text-indigo-950 border border-indigo-200" : "hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        <Boxes size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{s.product_name}</div>
                        <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                          {s.product_code && (
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px]">
                              #{s.product_code}
                            </span>
                          )}
                          <span>{s.unit || "PCS"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-3">
                      <div className="text-xs font-extrabold text-slate-900">{formatCurrency(s.price)}</div>
                      <div className={`text-[10px] font-bold ${s.stock < 5 ? "text-red-500" : "text-emerald-600"}`}>
                        Stock: {s.stock}
                      </div>
                    </div>
                  </div>
                );
              })}

              {!globalSearch.trim() && freqObjects.length > 0 && (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-t border-slate-100 mt-1">
                    <Star size={12} className="text-amber-500" /> Frequent Products
                  </div>
                  {freqObjects.map((s) => (
                    <div
                      key={`freq-${s.id}`}
                      onMouseDown={() => addOrMergeProduct(s)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all"
                    >
                      <span className="text-xs font-bold text-slate-800">{s.product_name}</span>
                      <span className="text-xs font-extrabold text-slate-900">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Quick-Add unlisted item popout notice */}
        {showNoResult && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 animate-in fade-in duration-150">
            <span className="truncate max-w-[180px]">"{globalSearch}" not found</span>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(true);
                setQuickItem({ name: globalSearch.trim(), price: "", qty: 1, unit: "" });
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={12} /> Quick Add
            </button>
          </div>
        )}

        {/* Date Badge */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 flex-shrink-0">
          <Calendar size={13} className="text-slate-400" />
          <span>{billDate}</span>
        </div>

        {/* Company Selector */}
        {companies.length > 1 ? (
          <div className="flex-shrink-0">
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                localStorage.setItem("selected_company_id", e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>
        ) : companies.length === 1 ? (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 flex-shrink-0">
            <Building2 size={13} className="text-slate-400" />
            <span className="truncate max-w-[150px]">{companies[0]?.company_name}</span>
          </div>
        ) : null}
      </div>

      {/* Quick-Add unlisted item drawer */}
      {showQuickAdd && (
        <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-3 flex items-center gap-3 flex-wrap animate-in slide-in-from-top duration-150">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Tag size={14} className="text-amber-600" />
            <span>Add Unlisted Product (Bill Only):</span>
          </div>
          <input
            type="text"
            placeholder="Product Name *"
            value={quickItem.name}
            onChange={(e) => setQuickItem((q) => ({ ...q, name: e.target.value }))}
            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 flex-1 min-w-[160px]"
          />
          <input
            type="number"
            placeholder="Price (₹) *"
            value={quickItem.price}
            onChange={(e) => setQuickItem((q) => ({ ...q, price: e.target.value }))}
            className="w-24 px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 text-right"
          />
          <select
            value={quickItem.unit}
            onChange={(e) => setQuickItem((q) => ({ ...q, unit: e.target.value }))}
            className="px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Unit</option>
            <option value="Piece">Piece</option>
            <option value="Kg">Kg</option>
            <option value="Gram">Gram</option>
            <option value="Litre">Litre</option>
            <option value="Box">Box</option>
            <option value="Pack">Pack</option>
          </select>
          <input
            type="number"
            min="1"
            placeholder="Qty"
            value={quickItem.qty}
            onChange={(e) => setQuickItem((q) => ({ ...q, qty: e.target.value }))}
            className="w-16 px-2.5 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 text-center"
          />
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={addQuickItem}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Add Item
            </button>
            <button
              type="button"
              onClick={() => {
                setShowQuickAdd(false);
                setShowNoResult(false);
                setGlobalSearch("");
              }}
              className="p-1.5 text-amber-800 hover:bg-amber-200/50 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          3. MAIN CONTENT: 2-COLUMN HIGH-EFFICIENCY LAYOUT
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-slate-100">
        {/* ── LEFT: PRODUCTS CART TABLE ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200">
          {/* AI Copilot Input Bar */}
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-50/50 to-slate-50 border-b border-slate-100 flex items-center gap-2.5 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={11} /> AI
            </span>
            <input
              type="text"
              placeholder='Try typing "Add 2 Sonamasuri Rice and payment by UPI"...'
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAiCopilotSubmit();
              }}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={startVoiceCommand}
              title="Voice Speech Input"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {isListening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              type="button"
              onClick={() => handleAiCopilotSubmit()}
              disabled={aiLoading}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {aiLoading ? <RefreshCw size={12} className="animate-spin" /> : "Run"}
            </button>
          </div>

          {/* AI Anomaly Warnings */}
          {aiAnomalies.length > 0 && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-200 space-y-1">
              {aiAnomalies.map((anom, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-red-700">
                  <AlertTriangle size={14} className="flex-shrink-0 text-red-500" />
                  <span>
                    <strong>{anom.title}:</strong> {anom.message}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* AI Suggestions Chips */}
          {aiSuggestions.length > 0 && (
            <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                Suggestions:
              </span>
              {aiSuggestions.map((sug) => (
                <button
                  key={sug.id}
                  type="button"
                  onClick={() => addOrMergeProduct(sug)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 text-[11px] font-bold transition-colors flex-shrink-0"
                >
                  <Plus size={11} /> {sug.product_name}
                  <span className="text-emerald-800 font-extrabold">{formatCurrency(sug.price)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Data Table */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_100px_1fr_75px_70px_100px_85px_95px_65px_36px] bg-slate-50/90 border-b border-slate-200 px-4 py-2.5 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex-shrink-0">
              <span>#</span>
              <span>CODE</span>
              <span>ITEM NAME</span>
              <span className="text-center">QTY</span>
              <span className="text-center">UNIT</span>
              <span className="text-right">PRICE</span>
              <span className="text-right">DISC</span>
              <span className="text-right">{billType === "gst_bill" ? "TAX / AMT" : "AMOUNT"}</span>
              <span className="text-center">FREE</span>
              <span />
            </div>

            {/* Table Rows Body */}
            <div className="flex-1 overflow-y-auto px-4 divide-y divide-slate-100">
              {!rows.some((r) => r.name || r.product_id) && (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
                    <ShoppingBag size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Billing Cart is Empty</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                    Scan barcode or use the search bar above (<kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-bold text-[10px]">F2</kbd>) to add products to this bill.
                  </p>
                </div>
              )}

              {rows.map((r, i) => {
                if (!r.name && !r.product_id) return null;
                const disc = Number(r.discount) || 0;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-[40px_100px_1fr_75px_70px_100px_85px_95px_65px_36px] py-2 items-center hover:bg-slate-50/70 transition-colors text-xs"
                  >
                    <span className="text-[11px] font-semibold text-slate-400">{i + 1}</span>

                    <span className="font-mono text-[11px] text-slate-600">
                      {r.product_code ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">#{r.product_code}</span>
                      ) : r.isUnlisted ? (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Unlisted
                        </span>
                      ) : (
                        "—"
                      )}
                    </span>

                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate leading-snug">{r.name}</div>
                      {r.unit && <span className="text-[10px] text-slate-400">{r.unit}</span>}
                    </div>

                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        value={r.qty}
                        onChange={(e) => updateQty(i, e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        className="w-14 px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-center font-bold text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-center">
                      {r.isUnlisted ? (
                        <select
                          value={r.unit}
                          onChange={(e) => updateRow(i, "unit", e.target.value)}
                          className="px-1.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium"
                        >
                          <option value="">-</option>
                          <option value="Piece">Pc</option>
                          <option value="Kg">Kg</option>
                          <option value="Gram">Gm</option>
                          <option value="Litre">L</option>
                          <option value="Box">Box</option>
                        </select>
                      ) : (
                        <span className="text-[11.5px] font-medium text-slate-600">{r.unit || "—"}</span>
                      )}
                    </div>

                    <div className="text-right">
                      {r.isUnlisted ? (
                        <input
                          type="number"
                          min="0"
                          value={r.price}
                          onChange={(e) => updateRow(i, "price", Number(e.target.value) || 0)}
                          onWheel={(e) => e.target.blur()}
                          className="w-20 px-2 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-right font-bold text-xs focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-slate-900">{r.price > 0 ? formatCurrency(r.price) : "—"}</span>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <input
                        type="number"
                        min="0"
                        value={r.discount || 0}
                        onChange={(e) => updateRow(i, "discount", Number(e.target.value) || 0)}
                        onWheel={(e) => e.target.blur()}
                        className={`w-16 px-2 py-1 bg-white border rounded-lg text-right font-semibold text-xs focus:outline-none ${disc > 0 ? "border-red-300 text-red-600" : "border-slate-200 text-slate-800"
                          }`}
                      />
                    </div>

                    <div className="text-right whitespace-nowrap">
                      {billType === "gst_bill" && r.gst > 0 ? (
                        <div>
                          <div className="font-extrabold text-slate-900">{formatCurrency(rowAmount(r))}</div>
                          <div className="text-[10px] text-amber-600 font-bold">
                            {r.gst}% ({formatCurrency((r.price * r.qty * r.gst) / 100)})
                          </div>
                        </div>
                      ) : (
                        <span className="font-extrabold text-slate-900">{r.price > 0 ? formatCurrency(rowAmount(r)) : "—"}</span>
                      )}
                    </div>

                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        value={r.freeQty || 0}
                        onChange={(e) => updateRow(i, "freeQty", Number(e.target.value) || 0)}
                        onWheel={(e) => e.target.blur()}
                        className="w-12 px-1 py-1 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-center font-medium text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => deleteRow(i)}
                        title="Remove item from bill"
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: SETTLEMENT, CUSTOMER & TOTALS PANEL ── */}
        <div className="w-88 flex flex-col bg-slate-50 border-l border-slate-200 flex-shrink-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Customer Search Section */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <User size={14} className="text-indigo-600" />
                  <span>Customer Details</span>
                </label>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono font-bold text-[10px]">
                  F3
                </kbd>
              </div>

              <div className="space-y-2">
                {/* Name search */}
                <div ref={nameSuggestRef} className="relative">
                  <input
                    id="cust-name"
                    type="text"
                    placeholder="Customer Name (e.g. Ramesh)"
                    value={customer.name}
                    onChange={(e) => handleNameSearch(e.target.value)}
                    onFocus={() => {
                      if (customer.name.length >= 2) handleNameSearch(customer.name);
                    }}
                    autoComplete="off"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                  {customerSearchLoading && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <RefreshCw size={13} className="animate-spin text-indigo-600" />
                    </div>
                  )}

                  {nameSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto p-1 animate-in fade-in duration-100">
                      {nameSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={() => selectCustomer(c)}
                          className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="text-xs font-bold text-slate-900">{c.name}</div>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Phone size={10} /> {c.phone}
                            </span>
                            {parseFloat(c.advance_balance) > 0 && (
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                                {formatCurrency(parseFloat(c.advance_balance))} adv
                              </span>
                            )}
                            {parseFloat(c.pending_amount) > 0 && (
                              <span className="text-red-700 font-bold bg-red-50 px-1 rounded">
                                {formatCurrency(parseFloat(c.pending_amount))} due
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Phone search */}
                <div ref={phoneSuggestRef} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                    <Phone size={13} />
                  </div>
                  <input
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={customer.phone}
                    maxLength={10}
                    onChange={(e) => handlePhoneSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                  />
                  {phoneSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto p-1">
                      {phoneSuggestions.map((c) => (
                        <div
                          key={c.id}
                          onMouseDown={() => selectCustomer(c)}
                          className="p-2 rounded-xl hover:bg-slate-50 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10.5px] text-slate-500">{c.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {customer.points > 0 && (
                  <div className="text-[11px] font-bold text-indigo-600 flex items-center gap-1">
                    <Star size={12} className="text-amber-500 fill-amber-400" />
                    <span>{customer.points} Loyalty Points Available</span>
                  </div>
                )}
              </div>

              {/* Status Badges */}
              {customer.id && (
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {pendingAmount > 0 && (
                    <span className="text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md">
                      Due: {formatCurrency(pendingAmount)}
                    </span>
                  )}
                  {advanceAvailable > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Advance: {formatCurrency(advanceAvailable)}
                    </span>
                  )}
                  {Number(customer.credit_enabled) === 1 && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md">
                      Credit Limit: {formatCurrency(Number(customer.credit_limit || 0))}
                    </span>
                  )}
                </div>
              )}

              {billType === "gst_bill" && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[10.5px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                    GSTIN (Mandatory) *
                  </label>
                  <input
                    type="text"
                    placeholder="22ABCDE1234F1Z5"
                    value={customer.gst_no}
                    maxLength={15}
                    onChange={(e) => setCustomer((c) => ({ ...c, gst_no: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-amber-300 rounded-xl text-xs font-bold font-mono uppercase tracking-wider text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Bill Totals Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill Amount</span>
                <span className="text-xl font-extrabold text-slate-900 font-display tracking-tight">
                  {formatCurrency(total)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-1">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 block font-semibold">Total Items</span>
                  <span className="font-extrabold text-slate-800 text-sm">{totalItems}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-[10.5px] text-slate-400 block font-semibold">Total Qty</span>
                  <span className="font-extrabold text-slate-800 text-sm">{totalQty}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBreakup(!showBreakup)}
                className="w-full py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {showBreakup ? "Hide Tax & Subtotal Breakup" : "View Detailed Tax & Subtotal"}
              </button>

              {showBreakup && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs animate-in fade-in duration-100">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-red-600 font-medium">
                      <span>Discount</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>GST {billType === "cash_bill" ? "(Cash Bill)" : ""}</span>
                    <span className="font-bold text-slate-800">
                      {billType === "gst_bill" ? formatCurrency(gstTotal) : "—"}
                    </span>
                  </div>
                  {advanceUsed > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Advance Applied</span>
                      <span>-{formatCurrency(advanceUsed)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advance Deducted Notice */}
            {advanceAvailable > 0 && advanceUsed > 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>
                  Advance of <strong>{formatCurrency(advanceUsed)}</strong> applied automatically.
                </span>
              </div>
            )}

            {/* Payment Method Selector Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Payment Mode</span>
                <span className="text-[10.5px] text-slate-400 font-semibold">Press keys 1 - 4</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((m) => {
                  const isSelected = paymentMethod === m.val;
                  return (
                    <button
                      key={m.val}
                      type="button"
                      disabled={m.disabled}
                      title={m.disabled ? m.disabledTitle : `Press ${m.keyNum}`}
                      onClick={() => !m.disabled && setPaymentMethod(m.val)}
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${m.disabled
                          ? "opacity-35 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200"
                          : isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-900/20"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                    >
                      <span>{m.label}</span>
                      <kbd
                        className={`text-[9px] font-mono px-1 py-0.2 rounded ${isSelected ? "bg-indigo-800 text-white" : "bg-white text-slate-500 border border-slate-200"
                          }`}
                      >
                        {m.keyNum}
                      </kbd>
                    </button>
                  );
                })}
              </div>

              {/* Credit warning info */}
              {paymentMethod === "credit" && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 space-y-1">
                  <div>Credit Sale Recorded</div>
                  <div className="text-[11px] opacity-90">
                    Outstanding: {formatCurrency(effectiveTotal)} (recorded to party ledger)
                  </div>
                </div>
              )}

              {/* Cash change / pending summary */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={extraAmount > 0 ? "text-emerald-700" : "text-slate-600"}>Change to Return</span>
                  <span className={`text-sm font-extrabold ${extraAmount > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                    {formatCurrency(changeToReturn)}
                  </span>
                </div>
                {extraAmount > 0 && (
                  <p className="text-[10.5px] text-emerald-600 font-medium">Extra cash to return to customer</p>
                )}
                {pendingBalance > 0 && (
                  <p className="text-[10.5px] text-red-500 font-medium">Amount pending from customer</p>
                )}
              </div>
            </div>

            <div className="text-center text-xs font-semibold text-slate-400">
              Customer earns <strong className="text-slate-700">{earnedPoints}</strong> loyalty points
            </div>
          </div>

          {/* Bottom Fixed Action Buttons */}
          <div className="p-4 bg-white border-t border-slate-200 flex gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedCompany}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing Bill...</span>
                </>
              ) : (
                <>
                  <Printer size={15} />
                  <span>Save & Print Bill</span>
                  <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-800 text-emerald-200 ml-1">
                    Ctrl+P
                  </kbd>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("credit")}
              title="Switch to Credit Payment Mode"
              className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Credit (F4)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
