import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AppShell from "./components/AppShell";
import Preloader from "./components/Preloader.jsx";
import RequireAuth from "./components/auth/RequireAuth.jsx";

const Landing = lazy(() => import("./page/landing.jsx"));
const Insects = lazy(() => import("./page/insects.jsx"));
const VideoPage = lazy(() => import("./page/video.jsx"));
const Rushzzz = lazy(() => import("./page/rushzzz.jsx"));

const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const CustomersPage = lazy(() => import("./pages/CustomersPage.jsx"));
const JobsPage = lazy(() => import("./pages/JobsPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.jsx"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage.jsx"));
const QuotationsPage = lazy(() => import("./pages/QuotationsPage.jsx"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage.jsx"));
const WhatsAppPage = lazy(() => import("./pages/WhatsAppPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.jsx"));
const AMCPage = lazy(() => import("./pages/AMCPage.jsx"));
const AMCPrintPage = lazy(() => import("./pages/AMCPrintPage.jsx"));
const QuotationPrintPage = lazy(() => import("./pages/QuotationPrintPage.jsx"));
const InvoicePrintPage = lazy(() => import("./pages/InvoicePrintPage.jsx"));
const CertificatePage = lazy(() => import("./pages/CertificatePage.jsx"));

function RouteFallback() {
  return <div className="p-8 text-center text-sm text-slate-500">Loading...</div>;
}

function withBoundary(moduleName, element) {
  return <AppErrorBoundary moduleName={moduleName}>{element}</AppErrorBoundary>;
}

function AdminRoutes() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Preloader />
        <Router basename="/">
          <main>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/" element={<Landing />} />
                <Route path="/admin/login" element={<LoginPage />} />

                {/* Protected admin routes */}
                <Route path="/admin" element={<AdminRoutes />}>
                  <Route index element={<HomePage />} />
                  <Route path="dashboard" element={<HomePage />} />
                  <Route path="customers" element={<CustomersPage />} />
                  <Route path="jobs" element={withBoundary("JobsPage", <JobsPage />)} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="pricing" element={<PricingPage />} />
                  <Route path="invoices" element={withBoundary("BillingPage", <InvoicesPage />)} />
                  <Route path="quotations" element={<QuotationsPage />} />
                  <Route path="payments" element={<PaymentsPage />} />
                  <Route path="amc" element={withBoundary("AMCPage", <AMCPage />)} />
                  <Route path="whatsapp" element={<WhatsAppPage />} />
                  <Route path="analytics" element={withBoundary("AnalyticsPage", <AnalyticsPage />)} />
                  <Route path="settings" element={<SettingsPage />} />
                  {/* Legacy routes */}
                  <Route path="homepage" element={<HomePage />} />
                  <Route path="bills" element={withBoundary("BillingPage", <InvoicesPage />)} />
                  <Route path="reminders" element={<PaymentsPage />} />
                  <Route path="new-job" element={withBoundary("JobsPage", <JobsPage />)} />
                </Route>

                {/* Print Pages - No AppShell to avoid layout blockers */}
                <Route path="/admin/invoices/:id" element={<RequireAuth><InvoicePrintPage /></RequireAuth>} />
                <Route path="/admin/quotations/:id" element={<RequireAuth><QuotationPrintPage /></RequireAuth>} />
                <Route path="/admin/amc/:id" element={<RequireAuth><AMCPrintPage /></RequireAuth>} />
                <Route path="/admin/certificate/:id" element={<RequireAuth><CertificatePage /></RequireAuth>} />

                {/* Legacy public pages */}
                <Route path="/insects" element={<Insects />} />
                <Route path="/video" element={<VideoPage />} />
                <Route path="/rushzzz" element={<Rushzzz />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
