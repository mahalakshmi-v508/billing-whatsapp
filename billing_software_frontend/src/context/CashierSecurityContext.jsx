import { createContext, useContext, useEffect, useState } from "react";
import { fetchSettings } from "../pages/settings/settingsApi";
import { CASHIER_SECURITY_KEY } from "../pages/settings/CashierSecuritySettings";

const DEFAULT_SECURITY = {
  lock_item_price_edit: false,
  max_discount_enabled: true,
  max_discount_limit: 10,
  restrict_selling_below_cost: true,
  supervisor_pin_enabled: true,
  supervisor_admin_pin: "",
  supervisor_pin_set: false,
  auto_screen_lock_minutes: 0,
};

const CashierSecurityContext = createContext({
  cashierSecurity: DEFAULT_SECURITY,
});

export function CashierSecurityProvider({ children }) {
  const [cashierSecurity, setCashierSecurity] = useState(DEFAULT_SECURITY);

  useEffect(() => {
    let mounted = true;

    fetchSettings().then((settings) => {
      if (!mounted) return;
      const slice = settings && settings[CASHIER_SECURITY_KEY];
      if (slice) setCashierSecurity((prev) => ({ ...prev, ...slice }));
    });

    const handleUpdate = (e) => {
      if (e?.detail && e.detail[CASHIER_SECURITY_KEY]) {
        setCashierSecurity((prev) => ({ ...prev, ...e.detail[CASHIER_SECURITY_KEY] }));
      }
    };
    window.addEventListener("company-settings-updated", handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("company-settings-updated", handleUpdate);
    };
  }, []);

  return (
    <CashierSecurityContext.Provider value={{ cashierSecurity }}>
      {children}
    </CashierSecurityContext.Provider>
  );
}

export function useCashierSecurity() {
  return useContext(CashierSecurityContext);
}
