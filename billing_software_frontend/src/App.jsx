import AppRoutes from "./routes/AppRoutes";
import UpdateNotificationBanner from "./components/common/UpdateNotificationBanner";
import './App.css';

function App() {
  return (
    <>
      <AppRoutes />
      <UpdateNotificationBanner />
    </>
  );
}

export default App;