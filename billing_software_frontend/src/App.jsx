import AppRoutes from "./routes/AppRoutes";
import UpdateNotificationBanner from "./components/common/UpdateNotificationBanner";
import { CashierSecurityProvider } from "./context/CashierSecurityContext";
import './App.css';

function App() {
  return (
    <CashierSecurityProvider>
      <AppRoutes />
      <UpdateNotificationBanner />
    </CashierSecurityProvider>
  );
}

export default App;