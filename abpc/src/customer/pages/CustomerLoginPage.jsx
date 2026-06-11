import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomerAuth } from "../context/customerAuthState";
import { Phone, LogIn, ShieldAlert, UserRound } from "lucide-react";
import Logo from "../../components/Logo";

const magicLinkParams = new URLSearchParams(window.location.search);
const initialCustomerId = magicLinkParams.get("cid") || "";
const initialPhoneNumber = magicLinkParams.get("phone") || "";

export default function CustomerLoginPage() {
  const { loginCustomer, isAuthenticated, loading: authLoading } = useCustomerAuth();
  const navigate = useNavigate();
  
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/customer/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Magic links use the same two-field verification as the manual form.
  useEffect(() => {
    if (initialCustomerId && initialPhoneNumber.trim().replace(/\D/g, "").length >= 10) {
      loginCustomer(initialCustomerId, initialPhoneNumber)
        .then(() => {
          navigate("/customer/dashboard", { replace: true });
        })
        .catch((err) => {
          setError(err.message || "Magic link login failed.");
          setLoading(false);
        });
    }
  }, [loginCustomer, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginCustomer(customerId, phoneNumber);
      navigate("/customer/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in. Please check your registered mobile number.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center">
          <div className="hover:scale-105 transition-transform duration-300 origin-center mb-6">
            <Logo variant="horizontal" className="w-48" />
          </div>
          <h2 className="mt-2 text-center text-2xl font-black tracking-tight text-slate-900">
            Customer 
          </h2>
          <p className="mt-1.5 text-center text-sm text-slate-500 max-w-xs">
            Access your AMC records, invoices, quotations, and service completion certificates.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading || authLoading ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-slate-500">Verifying number...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="customer-id" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Customer ID
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserRound className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    name="customer-id"
                    id="customer-id"
                    required
                    autoComplete="username"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    placeholder="ID shown on invoice or quotation"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all text-base"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Registered Phone Number
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    autoComplete="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter 10-digit mobile number"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)] transition-all text-base"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full primary-btn flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  Access Portal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-slate-400">
          <p>© {new Date().getFullYear()} AB Pest Control · Surat, Gujarat</p>
          <p className="mt-1">For support, call +91 93744 88004</p>
        </div>

      </div>
    </div>
  );
}
