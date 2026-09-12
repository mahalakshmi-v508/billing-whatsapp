import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Lock,
  Plus,
  ChevronDown,
  Zap,
  Save,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "../../services/api";
import { getCompanyId } from "./settingsApi";
import { SettingsShell, Badge, Toggle } from "./settingsUI";

const DEFAULT_FORM = {
  integrationEnabled: false,
  apiProvider: "Adequate GSP (Recommended)",
  environment: "Sandbox (Testing / Demo)",
  companyGstin: "",
  ewbUsername: "",
  gspClientId: "",
};

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

const selectCls =
  "w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-[13.5px] text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer";

function Field({ label, hint, children }) {
  const secure = typeof hint === "string" && hint.startsWith("✓");
  return (
    <div>
      <label className="block text-[11px] font-bold tracking-wide text-slate-500 mb-1.5">{label}</label>
      {children}
      {hint && (
        <p className={`mt-1 text-[11.5px] leading-snug ${secure ? "text-emerald-600 font-medium" : "text-slate-400"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

function ChecklistRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-slate-600">{label}</span>
      <Badge tone={value === "Pending" ? "gray" : "green"}>{value}</Badge>
    </div>
  );
}

function EwayBillSettings() {
  const companyId = getCompanyId();

  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [secrets, setSecrets] = useState({ ewbPassword: "", gspClientSecret: "" });
  const [savedFlags, setSavedFlags] = useState({ ewbPasswordSaved: false, gspClientSecretSaved: false });
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId ? String(companyId) : "");
  const [lastTest, setLastTest] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const showToast = (msg, ok = true) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, ok }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  };

  const set = (key) => (val) => setForm((s) => ({ ...s, [key]: val }));

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user && user.id) {
      api
        .get(`/company/get_companies_by_admin?admin_id=${user.id}`)
        .then((res) => {
          const list = (res.data && res.data.data) || [];
          setCompanies(list);
          if (list.length && !list.some((c) => String(c.id) === String(selectedCompanyId))) {
            setSelectedCompanyId(String(list[0].id));
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    api
      .get("/eway-bill/settings", { params: { company_id: companyId } })
      .then((res) => {
        if (cancelled) return;
        const d = res.data && res.data.data;
        if (d) {
          setForm({
            integrationEnabled: !!d.integrationEnabled,
            apiProvider: d.apiProvider || DEFAULT_FORM.apiProvider,
            environment: d.environment || DEFAULT_FORM.environment,
            companyGstin: d.companyGstin || "",
            ewbUsername: d.ewbUsername || "",
            gspClientId: d.gspClientId || "",
          });
          setSavedFlags({
            ewbPasswordSaved: !!d.ewbPasswordSaved,
            gspClientSecretSaved: !!d.gspClientSecretSaved,
          });
          if (d.lastTestAt) {
            setLastTest({ at: d.lastTestAt, status: d.lastTestStatus, message: d.lastTestMessage });
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) {
      showToast("Company ID missing", false);
      return;
    }
    setSaving(true);
    try {
      const res = await api.post("/eway-bill/settings", {
        company_id: companyId,
        settings: { ...form, ...secrets },
      });
      if (res.data && res.data.status) {
        const d = res.data.data;
        if (d) {
          setSavedFlags({
            ewbPasswordSaved: !!d.ewbPasswordSaved,
            gspClientSecretSaved: !!d.gspClientSecretSaved,
          });
          if (d.lastTestAt) {
            setLastTest({ at: d.lastTestAt, status: d.lastTestStatus, message: d.lastTestMessage });
          }
        }
        setSecrets({ ewbPassword: "", gspClientSecret: "" });
        showToast(res.data.message || "Settings saved successfully");
      } else {
        showToast((res.data && res.data.message) || "Save failed", false);
      }
    } catch {
      showToast("Could not reach server", false);
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!companyId) {
      showToast("Company ID missing", false);
      return;
    }
    setTesting(true);
    try {
      // Persist the current form values so the stored config is tested.
      await api
        .post("/eway-bill/settings", { company_id: companyId, settings: { ...form, ...secrets } })
        .catch(() => {});
      const res = await api.post("/eway-bill/test-connection", { company_id: companyId });
      if (res.data) {
        const d = res.data.data;
        if (d && d.lastTestAt) {
          setLastTest({ at: d.lastTestAt, status: d.lastTestStatus, message: d.lastTestMessage });
        }
        if (res.data.status) showToast("Connection successful (sandbox gateway)");
        else showToast(res.data.message || "Connection failed", false);
      }
    } catch {
      showToast("Could not reach server", false);
    }
    setTesting(false);
  };

  const selCompany = companies.find((c) => String(c.id) === String(selectedCompanyId));
  const gstin = form.companyGstin || (selCompany && selCompany.gstin) || "";
  const stateCode = gstin.slice(0, 2);
  const gstinSet = gstin.trim().length > 0;

  const guideSteps = [
    "Login to the official E-Way Bill portal (ewaybillgst.gov.in).",
    "Navigate to Registration → For GSP.",
    "Select Adequare as GSP and create your API username and password.",
    "Paste your credentials above and click Test Connection.",
  ];

  return (
    <SettingsShell
      title="E-Way Bill Settings"
      subtitle="Manage company-wise E-Way Bill API credentials, GSP gateway parameters, and secure encrypted storage."
      icon={<ShieldCheck size={22} strokeWidth={2.2} />}
      contentClassName="px-10 py-9 space-y-6"
      actions={
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-[13px] font-semibold shadow-sm hover:bg-slate-50 whitespace-nowrap"
        >
          <Plus size={15} />
          Add New Company
        </button>
      }
    >
      {/* SECURITY INFORMATION BANNER */}
      <div className="flex items-start gap-4 rounded-2xl bg-sky-50 border border-sky-100 p-5">
        <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
          <Lock size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-slate-800">Multi-Client Isolated Security Architecture</h3>
          <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
            Each client company maintains its own independent GSTIN and API credentials. All passwords and client
            secrets are AES encrypted server-side and never exposed to the frontend browser context.
          </p>
        </div>
      </div>

      {/* MAIN E-WAY BILL CONFIGURATION CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        {/* A. COMPANY SELECTION AREA */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="w-full lg:max-w-xl">
            <label className="block text-[11px] font-bold tracking-widest text-slate-500 mb-1.5">
              SELECT CLIENT / COMPANY PROFILE
            </label>
            <div className="relative">
              <select
                className={selectCls}
                value={selectedCompanyId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedCompanyId(id);
                  const c = companies.find((x) => String(x.id) === String(id));
                  if (c && c.gstin) set("companyGstin")(c.gstin);
                }}
              >
                {companies.length === 0 && <option value="">Loading companies…</option>}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name}
                    {c.gstin ? ` (${c.gstin})` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
          <div className="lg:text-right lg:pb-1">
            <p className="text-[11px] font-bold tracking-widest text-slate-500">REGISTERED STATE &amp; ADDRESS:</p>
            <p className="mt-1 text-[13.5px] font-semibold text-slate-800">
              {selCompany ? selCompany.company_name : "—"}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500">
              {gstinSet
                ? `State Code: ${stateCode} | GSTIN: ${gstin}`
                : "No GSTIN configured yet for this company."}
            </p>
          </div>
        </div>

        <hr className="my-5 border-slate-100" />

        {/* B. E-WAY BILL API CONFIGURATION */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-bold text-slate-800">E-Way Bill API Configuration</h3>
            <p className="mt-0.5 text-[12.5px] text-slate-500">
              Configure GSP or Direct NIC gateway parameters for automated generation
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11.5px] font-extrabold tracking-widest text-slate-700">INTEGRATION ENABLED</span>
            <Toggle checked={form.integrationEnabled} onChange={(v) => set("integrationEnabled")(v)} />
          </div>
        </div>

        {/* C. FORM FIELDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-4 mt-5">
          <Field label="API Provider *" hint="Selected GSP or Direct gateway adapter">
            <div className="relative">
              <select
                className={selectCls}
                value={form.apiProvider}
                onChange={(e) => set("apiProvider")(e.target.value)}
              >
                <option>Adequate GSP (Recommended)</option>
                <option>Direct NIC Gateway</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </Field>

          <Field label="Environment *" hint="Sandbox for testing / Production for live compliance">
            <div className="relative">
              <select
                className={selectCls}
                value={form.environment}
                onChange={(e) => set("environment")(e.target.value)}
              >
                <option>Sandbox (Testing / Demo)</option>
                <option>Production (Live)</option>
              </select>
              <ChevronDown
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </Field>

          <Field label="Company GSTIN **" hint={gstinSet ? "✓ GSTIN registered for this profile" : "15-character GST identification number"}>
            <input
              className={inputCls}
              value={form.companyGstin}
              onChange={(e) => set("companyGstin")(e.target.value)}
            />
          </Field>

          <Field label="EWB API Username *" hint="E-Way Bill portal API user registered for this GSTIN">
            <input
              className={inputCls}
              value={form.ewbUsername}
              onChange={(e) => set("ewbUsername")(e.target.value)}
            />
          </Field>

          <Field
            label="EWB API Password"
            hint={savedFlags.ewbPasswordSaved ? "✓ Secure password currently saved (AES encrypted)" : "Type a value to store it encrypted"}
          >
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className={`${inputCls} pr-9`}
                value={secrets.ewbPassword}
                placeholder={savedFlags.ewbPasswordSaved ? "•••••••• (saved — type to change)" : "Enter EWB API password"}
                onChange={(e) => setSecrets((s) => ({ ...s, ewbPassword: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          <Field label="GSP Client ID *" hint="Provided by Adequare or GSP partner">
            <input
              className={inputCls}
              value={form.gspClientId}
              onChange={(e) => set("gspClientId")(e.target.value)}
            />
          </Field>

          <Field
            label="GSP Client Secret"
            hint={savedFlags.gspClientSecretSaved ? "✓ Secure client secret currently saved (AES encrypted)" : "Type a value to store it encrypted"}
          >
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                className={`${inputCls} pr-9`}
                value={secrets.gspClientSecret}
                placeholder={savedFlags.gspClientSecretSaved ? "•••••••• (saved — type to change)" : "Enter GSP client secret"}
                onChange={(e) => setSecrets((s) => ({ ...s, gspClientSecret: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>
        </div>

        {/* D. ACTION BUTTONS */}
        <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-[13px] font-semibold bg-white hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
          >
            <Zap size={15} className="text-amber-500" />
            {testing ? "Testing…" : "Test Connection"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 text-white text-[13px] font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            <Save size={15} />
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {/* CONNECTION STATUS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Server size={17} />
          </div>
          <h3 className="text-[15px] font-bold text-slate-800">Connection Status</h3>
        </div>

        {lastTest ? (
          <div
            className={`mt-4 flex items-center gap-3 rounded-xl px-4 py-3.5 border ${
              lastTest.status === "connected"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full ${
                lastTest.status === "connected"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-500"
              } flex items-center justify-center flex-shrink-0`}
            >
              {lastTest.status === "connected" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            </div>
            <div className="min-w-0">
              <p
                className={`text-[14px] font-bold ${
                  lastTest.status === "connected" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {lastTest.status === "connected" ? "✓ Connected & Verified" : "Connection Failed"}
              </p>
              <p className={`text-[12px] ${lastTest.status === "connected" ? "text-emerald-600/90" : "text-red-500/90"}`}>
                Last tested: {String(lastTest.at).slice(0, 16).replace("T", " ")}
              </p>
              {lastTest.message && (
                <p className="mt-0.5 text-[11.5px] text-slate-500 truncate">{lastTest.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-amber-700">Not Tested Yet</p>
              <p className="text-[12px] text-amber-600/90">Save settings, then click Test Connection.</p>
            </div>
          </div>
        )}

        <p className="mt-4 text-[11px] font-bold tracking-widest text-slate-500">CONFIGURATION CHECKLIST:</p>
        <div className="mt-2 space-y-1.5">
          <ChecklistRow label="GSTIN Set" value={gstinSet ? "Yes" : "No"} />
          <ChecklistRow label="API Password" value={savedFlags.ewbPasswordSaved ? "Encrypted" : "Pending"} />
          <ChecklistRow label="Client Secret" value={savedFlags.gspClientSecretSaved ? "Encrypted" : "Pending"} />
        </div>
      </div>

      {/* ADEQUARE GSP SETUP GUIDE CARD */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 max-w-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
            <BookOpen size={17} />
          </div>
          <h3 className="text-[15px] font-bold text-slate-800">Adequare GSP Setup Guide</h3>
        </div>
        <ol className="mt-4 space-y-2.5">
          {guideSteps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-[13px] text-slate-600 leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* TOASTS */}
      <div className="fixed bottom-5 right-5 space-y-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-lg border ${
              t.ok ? "bg-emerald-600 text-white border-emerald-700" : "bg-red-600 text-white border-red-700"
            }`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </SettingsShell>
  );
}

export default function EwayBill() {
  return <EwayBillSettings />;
}