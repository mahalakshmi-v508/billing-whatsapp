import { useEffect, useState } from "react";
import api from "../services/api";
import { fetchSettings, getCompanyId } from "../pages/settings/settingsApi";
import { CASHIER_SECURITY_KEY } from "../pages/settings/CashierSecuritySettings";
import { CashierSecurityContext, DEFAULT_SECURITY } from "./cashierSecurity";

export function CashierSecurityProvider({ children }) {
  const [cashierSecurity, setCashierSecurity] = useState(DEFAULT_SECURITY);

  useEffect(() => {
    let mounted = true;

    // Supervisor PIN now lives in users table (company admin row) — fetch it separately
    const loadSupervisorPin = () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (!user?.id || !user?.role) {
          if (mounted) {
            setCashierSecurity((prev) => ({
              ...prev,
              supervisor_admin_pin: "",
              supervisor_pin_set: false,
            }));
          }
          return Promise.resolve();
        }
        const companyId = getCompanyId();
        return api
          .get("/auth/supervisor_pin", {
            params: { user_id: user.id, role: user.role, company_id: companyId },
          })
          .then((res) => {
            if (!mounted || res.data?.status !== "success") return;
            setCashierSecurity((prev) => ({
              ...prev,
              supervisor_admin_pin: res.data.supervisor_pin || "",
              supervisor_pin_set: Boolean(res.data.supervisor_pin_set),
            }));
          })
          .catch(() => {});
      } catch {
        return Promise.resolve();
      }
    };

    const loadAll = () => {
      fetchSettings().then((settings) => {
        if (!mounted) return;
        const slice = settings && settings[CASHIER_SECURITY_KEY];
        if (slice) setCashierSecurity((prev) => ({ ...prev, ...slice }));
      });
      loadSupervisorPin();
    };

    // Load on mount AND whenever the signed-in user changes (login happens
    // without a full page reload, so the provider may already be mounted).
    loadAll();

    const handleAuthChanged = () => loadAll();
    window.addEventListener("auth-user-changed", handleAuthChanged);

    const handleUpdate = (e) => {
      if (e?.detail && e.detail[CASHIER_SECURITY_KEY]) {
        setCashierSecurity((prev) => ({ ...prev, ...e.detail[CASHIER_SECURITY_KEY] }));
      }
    };
    window.addEventListener("company-settings-updated", handleUpdate);

    const handlePinUpdate = (e) => {
      if (!e?.detail) return;
      setCashierSecurity((prev) => ({
        ...prev,
        supervisor_admin_pin: e.detail.supervisor_admin_pin ?? prev.supervisor_admin_pin,
        supervisor_pin_set: e.detail.supervisor_pin_set ?? prev.supervisor_pin_set,
      }));
    };
    window.addEventListener("supervisor-pin-updated", handlePinUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("auth-user-changed", handleAuthChanged);
      window.removeEventListener("company-settings-updated", handleUpdate);
      window.removeEventListener("supervisor-pin-updated", handlePinUpdate);
    };
  }, []);

  return (
    <CashierSecurityContext.Provider value={{ cashierSecurity }}>
      {children}
    </CashierSecurityContext.Provider>
  );
}
