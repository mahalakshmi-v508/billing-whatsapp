import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const user = localStorage.getItem("user");

  // ✅ already logged in → go dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}