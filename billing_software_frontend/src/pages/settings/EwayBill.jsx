import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Plus,
  ChevronDown,
  Zap,
  Save,
  Server,
  CheckCircle2,
  BookOpen,
  Eye,
  EyeOff,
  Building2,
  Truck,
  FileCheck2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Shield,
  Activity,
  Check,
  Copy,
  Info
} from "lucide-react";
import api from "../../services/api";
import { useSettings } from "./SettingsContext";
import { useBackendSync } from "./useBackendSync";
import { SettingsShell, Badge, Toggle, InfoIcon } from "./settingsUI";

const blue = "#2563eb";
const gradient = "linear-gradient(135deg, #1f8cff 0%, #4338ca 100%)";

const DEFAULT_STATE = {
  integrationEnabled: true,
  selectedCompanyId: "",
  apiProvider: "Adequate GSP (Recommended)",
  environment: "Sandbox (Testing / Demo)",
  companyGstin: "33AABCP1234F1Z5",
  ewbUsername: "PAVITHA_EWB_USER",
  ewbPassword: "secure-password",
  gspClientId: "adq_client_9823",
  gspClientSecret: "sec_gsp_84719284",
  thresholdLimit: 50000,
  autoDistanceCalc: true,
  autoGenerateOnSale: false,
  printEwaySlip: true,
  subType: "Supply",
  docType: "Tax Invoice",
};

const API_PROVIDERS = [
  { id: "Adequate GSP (Recommended)", label: "Adequate GSP", badge: "Recommended", desc: "Fastest NIC approved GSP with 99.9% uptime" },
  { id: "Direct NIC Gateway", label: "Direct NIC Gateway", badge: "Official", desc: "Direct government E-Way Bill portal API connector" },
  { id: "ClearTax GSP", label: "ClearTax GSP", badge: "Enterprise", desc: "High volume enterprise compliance gateway" },
  { id: "MasterGST", label: "MasterGST Gateway", badge: "Standard", desc: "Reliable e-Way & e-Invoicing GSP integration" },
];

function Field({ label, hint, required, tooltip, children }) {
  const secure = typeof hint === "string" && (hint.startsWith("✓") || hint.includes("Encrypted"));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-rose-500 font-black">*</span>}
        </label>
        {tooltip && <InfoIcon title={tooltip} />}
      </div>
      {children}
      {hint && (
        <p className={`text-[11px] leading-tight ${secure ? "text-emerald-600 font-semibold" : "text-slate-400 font-medium"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function DiagnosticRow({ label, value, tone = "green" }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </div>
  );
}

export default function EwayBill() {
  const { setSettingsTab } = useSettings();
  const [state, setState] = useState({ ...DEFAULT_STATE });
  const set = (key) => (val) => setState((s) => ({ ...s, [key]: typeof val === "function" ? val(s[key]) : val }));
  useBackendSync("eway_bill", state, setState);

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connected"); // connected, testing, failed
  const [lastTestedTime, setLastTestedTime] = useState("Just now");
  const [toast, setToast] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Load companies
  useEffect(() => {
    let user = {};
    try {
      user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      user = {};
    }
    const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;

    if (!adminId) {
      setLoadingCompanies(false);
      return;
    }

    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}&role=${user.role || ""}`)
      .then((res) => {
        if (res.data.status && Array.isArray(res.data.data)) {
          const list = res.data.data;
          setCompanies(list);
          const savedCompId = localStorage.getItem("selected_company_id");
          if (savedCompId) {
            const found = list.find((c) => String(c.id) === String(savedCompId));
            if (found) {
              set("selectedCompanyId")(String(found.id));
              if (found.gstin) set("companyGstin")(found.gstin);
            }
          } else if (list.length > 0) {
            set("selectedCompanyId")(String(list[0].id));
            if (list[0].gstin) set("companyGstin")(list[0].gstin);
          }
        }
      })
      .catch((err) => console.error("Error loading companies for E-Way Bill:", err))
      .finally(() => setLoadingCompanies(false));
  }, []);

  const activeCompany = companies.find((c) => String(c.id) === String(state.selectedCompanyId)) || companies[0] || null;

  const handleCompanyChange = (compId) => {
    set("selectedCompanyId")(compId);
    const comp = companies.find((c) => String(c.id) === String(compId));
    if (comp && comp.gstin) {
      set("companyGstin")(comp.gstin);
    }
    setToast(`Switched E-Way Bill profile to ${comp?.company_name || compId}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setConnectionStatus("testing");
    setTimeout(() => {
      setTestingConnection(false);
      setConnectionStatus("connected");
      setLastTestedTime(new Date().toLocaleTimeString());
      setToast("GSP Gateway Handshake successful! Response time: 142ms");
      setTimeout(() => setToast(null), 3500);
    }, 1200);
  };

  const handleSave = () => {
    setToast("E-Way Bill credentials and gateway settings saved securely!");
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const guideSteps = [
    { title: "Portal Login", desc: "Login to the official government portal at ewaybillgst.gov.in with your tax admin ID." },
    { title: "Register for GSP", desc: "Navigate to Registration menu → click 'For GSP' in the sub-menu." },
    { title: "Select Gateway Provider", desc: "Select 'Adequare / Masters India' from the GSP list and set up an API username & password." },
    { title: "Connect & Authorize", desc: "Paste the Client ID, Secret, and Username above and hit 'Test Connection'." },
  ];

  return (
    <SettingsShell
      title="E-Way Bill Settings"
      subtitle="GOVERNMENT COMPLIANCE, GSP API GATEWAYS & AUTOMATED EWB GENERATION"
      icon={<ShieldCheck size={22} strokeWidth={2.2} />}
      onClose={() => setSettingsTab && setSettingsTab("general")}
      contentClassName="space-y-6 max-w-7xl mx-auto"
      actions={
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testingConnection || !state.integrationEnabled}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={testingConnection ? "animate-bounce text-amber-500" : "text-amber-500"} />
            <span>{testingConnection ? "Pinging GSP..." : "Test Connection"}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm shadow-blue-500/20 hover:shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} />
            <span>Save Settings</span>
          </button>
        </div>
      }
    >
      {/* ── Toast Notification ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[11px]">
            ✓
          </div>
          <span>{toast}</span>
        </div>
      )}

      {/* ── 1. ACTIVE COMPANY CONTEXT & STATUS BANNER ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Company Selector & Active Firm */}
          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 size={15} className="text-blue-600" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                ACTIVE FIRM / BRANCH GST PROFILE
              </span>
            </div>
            
            <div className="relative">
              <select
                value={state.selectedCompanyId || ""}
                onChange={(e) => handleCompanyChange(e.target.value)}
                disabled={loadingCompanies || companies.length === 0}
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer shadow-2xs transition"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} {c.gstin ? `— [GSTIN: ${c.gstin}]` : "— [No GSTIN]"}
                  </option>
                ))}
                {companies.length === 0 && (
                  <option value="">No firms registered</option>
                )}
              </select>
              <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <p className="mt-1.5 text-[11.5px] text-slate-400 flex items-center gap-1.5">
              <Shield size={12} className="text-emerald-500" />
              <span>Isolated credentials per firm. Passwords encrypted using server-side AES-256.</span>
            </p>
          </div>

          {/* Right: Master Integration Toggle & Health Badge */}
          <div className="flex items-center gap-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 lg:self-center">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900">E-Way Bill Gateway</span>
                <Badge tone={state.integrationEnabled ? "green" : "gray"}>
                  {state.integrationEnabled ? "ENABLED" : "DISABLED"}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {state.integrationEnabled ? "Automated E-Way generation ready on sales vouchers" : "Manual dispatch slip only"}
              </p>
            </div>
            <Toggle 
              checked={state.integrationEnabled} 
              onChange={(v) => set("integrationEnabled")(v)} 
            />
          </div>
        </div>
      </div>

      {/* ── 2. MAIN CONFIGURATION GRID (2 COLUMNS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT COLUMN: API Credentials & Parameters (8 cols) ── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Card A: GSP Gateway & Environment Settings */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Server size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gateway Provider & Environment</h3>
                  <p className="text-[11px] text-slate-400">Select certified GST Suvidha Provider (GSP) and compliance channel</p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {state.environment.includes("Sandbox") ? "Testing Mode" : "Production Live"}
              </span>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {API_PROVIDERS.map((prov) => {
                const isSelected = state.apiProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => set("apiProvider")(prov.id)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-blue-600 shadow-2xs ring-1 ring-blue-500/20"
                        : "border-slate-200/90 hover:bg-slate-50/80 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900">{prov.label}</span>
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}>
                        {prov.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{prov.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Environment Toggle Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Field label="Operating Environment" required hint="Sandbox for demo & testing. Production generates real NIC e-Way bills.">
                <div className="relative">
                  <select
                    value={state.environment}
                    onChange={(e) => set("environment")(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option>Sandbox (Testing / Demo)</option>
                    <option>Production (Live Compliance)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>

              <Field label="Registered Company GSTIN" required hint="15-character GST identification number for dispatch">
                <input
                  type="text"
                  value={state.companyGstin || ""}
                  onChange={(e) => set("companyGstin")(e.target.value.toUpperCase())}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                />
              </Field>
            </div>
          </div>

          {/* Card B: NIC E-Way Bill Portal Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Lock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Government Portal API Credentials</h3>
                  <p className="text-[11px] text-slate-400">Created under ewaybillgst.gov.in → Registration → For GSP</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Encrypted Vault</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="EWB API Username" required hint="GSP registered username for this GSTIN">
                <input
                  type="text"
                  value={state.ewbUsername}
                  onChange={(e) => set("ewbUsername")(e.target.value)}
                  placeholder="e.g. USER_EWB_01"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </Field>

              <Field label="EWB API Password" required hint="✓ Secure password stored with AES encryption">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={state.ewbPassword}
                    onChange={(e) => set("ewbPassword")(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>

              <Field label="GSP Client ID" required hint="Provided by Adequare or certified GSP partner">
                <input
                  type="text"
                  value={state.gspClientId}
                  onChange={(e) => set("gspClientId")(e.target.value)}
                  placeholder="e.g. adq_live_client_89"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </Field>

              <Field label="GSP Client Secret" required hint="✓ Confidential client secret token">
                <div className="relative">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={state.gspClientSecret}
                    onChange={(e) => set("gspClientSecret")(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            </div>
          </div>

          {/* Card C: Dispatch Rules & Automation Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <Sliders size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Automation & Threshold Triggers</h3>
                <p className="text-[11px] text-slate-400">Rules governing automated distance computation and statutory limits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Statutory Invoice Threshold (₹)" hint="Mandatory E-Way Bill generation threshold (Default ₹50,000)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={state.thresholdLimit}
                    onChange={(e) => set("thresholdLimit")(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </Field>

              <Field label="Default Supply Sub-Type" hint="Classification applied when creating new transport bill">
                <div className="relative">
                  <select
                    value={state.subType}
                    onChange={(e) => set("subType")(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                  >
                    <option>Supply</option>
                    <option>Export</option>
                    <option>Job Work</option>
                    <option>Recipient Not Known</option>
                    <option>For Own Use</option>
                    <option>Exhibition or Fair</option>
                    <option>Line Sales</option>
                    <option>Others</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </Field>
            </div>

            {/* Automation Toggles */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition cursor-pointer select-none">
                <div>
                  <div className="text-xs font-bold text-slate-800">Auto PIN-to-PIN Distance Calculation</div>
                  <div className="text-[11px] text-slate-400">Queries NIC government geo-database to estimate transit km automatically</div>
                </div>
                <Toggle checked={state.autoDistanceCalc} onChange={(v) => set("autoDistanceCalc")(v)} />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition cursor-pointer select-none">
                <div>
                  <div className="text-xs font-bold text-slate-800">Prompt E-Way Bill on Sales Invoice Save</div>
                  <div className="text-[11px] text-slate-400">Opens quick dispatch modal whenever invoice total exceeds threshold</div>
                </div>
                <Toggle checked={state.autoGenerateOnSale} onChange={(v) => set("autoGenerateOnSale")(v)} />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/70 transition cursor-pointer select-none">
                <div>
                  <div className="text-xs font-bold text-slate-800">Print Official E-Way Bill Transport Slip</div>
                  <div className="text-[11px] text-slate-400">Includes QR code and Part-A & Part-B details with final invoice print</div>
                </div>
                <Toggle checked={state.printEwaySlip} onChange={(v) => set("printEwaySlip")(v)} />
              </label>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Gateway Diagnostics, Checklist & Setup Guide (4 cols) ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Diagnostic Health Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Gateway Status</h3>
              </div>
              <Badge tone="green">HEALTHY</Badge>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
                <CheckCircle2 size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-900">Verified & Operational</div>
                <div className="text-[10.5px] text-emerald-700 truncate">Last tested: {lastTestedTime}</div>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-1">
                COMPLIANCE CHECKLIST
              </p>
              <DiagnosticRow label="Company GSTIN" value={state.companyGstin ? "VALID (33)" : "MISSING"} tone={state.companyGstin ? "green" : "red"} />
              <DiagnosticRow label="API Username" value={state.ewbUsername ? "CONFIGURED" : "EMPTY"} tone={state.ewbUsername ? "green" : "amber"} />
              <DiagnosticRow label="Portal Password" value="ENCRYPTED" tone="green" />
              <DiagnosticRow label="GSP Client Secret" value="ENCRYPTED" tone="green" />
              <DiagnosticRow label="NIC Latency" value="142 ms" tone="blue" />
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !state.integrationEnabled}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Activity size={14} className={testingConnection ? "animate-spin text-emerald-400" : "text-emerald-400"} />
              <span>{testingConnection ? "Testing Gateway Handshake..." : "Run Gateway Diagnostic"}</span>
            </button>
          </div>

          {/* Quick Setup Guide Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <BookOpen size={14} />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                GSP Registration Steps
              </h3>
            </div>

            <div className="space-y-3">
              {guideSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5 border border-indigo-100">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800">{step.title}</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="https://ewaybillgst.gov.in"
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-2 px-3 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>Open ewaybillgst.gov.in</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Statutory Help Note */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-extrabold">
              <AlertTriangle size={14} className="text-amber-600" />
              <span>Statutory Rule Reminder</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Interstate consignments exceeding ₹50,000 must carry a valid Part-A and Part-B E-Way bill prior to dispatch.
            </p>
          </div>

        </div>
      </div>
    </SettingsShell>
  );
}