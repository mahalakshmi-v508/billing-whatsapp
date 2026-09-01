import { createContext, useContext } from "react";

// Settings tab state lives in MainLayout. It is shared here through a dedicated
// React context rather than the router Outlet context, because /settings is
// nested under an extra <ProtectedRoute> layer whose <Outlet/> does not forward
// the parent Outlet context (so useOutletContext() would always be undefined).
const SettingsContext = createContext({});

export function useSettings() {
  return useContext(SettingsContext);
}

export default SettingsContext;
