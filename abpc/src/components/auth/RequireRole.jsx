import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * @param {{ allow?: string[], children: React.ReactNode }} props
 */
export default function RequireRole({ allow = [], children }) {
  const { loading, profile } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  const role = profile?.role || "Employee";
  if (!allow.includes(role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

