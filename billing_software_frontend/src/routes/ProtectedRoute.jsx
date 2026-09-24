import { Navigate, Outlet } from "react-router-dom";
import NotFound from "../pages/NotFound";

export default function ProtectedRoute({ children, allowedRoles }) {
  const userStr = localStorage.getItem("user");

  // ❌ not logged in
  if (!userStr) {
    return <Navigate to="/" replace />;
  }

  // ✅ logged in
  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch (e) {
    localStorage.removeItem("user");
    return <Navigate to="/" replace />;
  }

  const role = user?.role;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <NotFound />;
  }

  return children ? children : <Outlet />;
}