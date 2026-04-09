import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireRole({ allow = [], children }) {
  const { loading, profile } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const role = profile?.role || "worker";
  if (!allow.includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

