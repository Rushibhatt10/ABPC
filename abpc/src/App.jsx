import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import Landing from './page/landing.jsx';
import Insects from './page/insects.jsx';
import VideoPage from './page/video.jsx';
import Rushzzz from './page/rushzzz.jsx';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CustomersPage from './pages/CustomersPage';
import JobsPage from './pages/JobsPage';
import ReportsPage from './pages/ReportsPage';
import PricingPage from './pages/PricingPage';
import InvoicesPage from './pages/InvoicesPage';
import QuotationsPage from './pages/QuotationsPage';
import PaymentsPage from './pages/PaymentsPage';
import WhatsAppPage from './pages/WhatsAppPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import AMCPage from './pages/AMCPage';
import AMCPrintPage from './pages/AMCPrintPage';
import AppShell from './components/AppShell';
import Preloader from './components/Preloader.jsx';
import QuotationPrintPage from './pages/QuotationPrintPage';
import InvoicePrintPage from './pages/InvoicePrintPage';
import CertificatePage from './pages/CertificatePage';
import RequireAuth from './components/auth/RequireAuth.jsx';
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
            <Routes>
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/admin/login" element={<LoginPage />} />

              {/* Protected admin routes */}
              <Route path="/admin" element={<AdminRoutes />}>
                <Route index element={<HomePage />} />
                <Route path="dashboard" element={<HomePage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="invoices" element={<InvoicesPage />} />
                <Route path="quotations" element={<QuotationsPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route path="amc" element={<AMCPage />} />
                <Route path="whatsapp" element={<WhatsAppPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                {/* Legacy routes */}
                <Route path="homepage" element={<HomePage />} />
                <Route path="bills" element={<InvoicesPage />} />
                <Route path="reminders" element={<PaymentsPage />} />
                <Route path="new-job" element={<JobsPage />} />
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
          </main>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
