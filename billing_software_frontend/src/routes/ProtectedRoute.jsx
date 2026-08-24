import { Navigate, Outlet } from "react-router-dom";
import NotFound from "../pages/NotFound";

export default function ProtectedRoute({ children, allowedRoles }) {
  const userStr = localStorage.getItem("user");

  // ❌ not logged in
  if (!userStr) {
    return <Navigate to="/" replace />;
  }

  // ✅ logged in
  const user = JSON.parse(userStr);
  const role = user?.role;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <NotFound />;
  }

  return children ? children : <Outlet />;
}