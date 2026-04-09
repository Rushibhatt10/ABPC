import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequirePricingAdmin({ children }) {
  const { loading, isPricingAdmin } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!isPricingAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

