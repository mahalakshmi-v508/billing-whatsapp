import { createContext, useContext } from "react";

export const DEFAULT_SECURITY = {
  lock_item_price_edit: false,
  max_discount_enabled: true,
  max_discount_limit: 10,
  restrict_selling_below_cost: true,
  supervisor_pin_enabled: true,
  supervisor_admin_pin: "",
  supervisor_pin_set: false,
  auto_screen_lock_minutes: 0,
};

export const CashierSecurityContext = createContext({
  cashierSecurity: DEFAULT_SECURITY,
});

export function useCashierSecurity() {
  return useContext(CashierSecurityContext);
}
