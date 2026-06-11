import { Navigate, useLocation } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthState";

export default function CustomerRequireAuth({ children }) {
  const { isAuthenticated, loading } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-slate-500">Loading Portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/customer/login" state={{ from: location }} replace />;
  }

  return children;
}
