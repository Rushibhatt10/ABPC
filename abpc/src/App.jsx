import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Landing from './page/landing.jsx';
import Insects from './page/insects.jsx';
import VideoPage from './page/video.jsx';
import Rushzzz from './page/rushzzz.jsx';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CustomersPage from './pages/CustomersPage';
import BillsPage from './pages/BillsPage';
import AppShell from './components/AppShell';
import Preloader from './components/Preloader.jsx';
import QuotationPrintPage from './pages/QuotationPrintPage';
import InvoicePrintPage from './pages/InvoicePrintPage';
import NewJobPage from './pages/NewJobPage';
import RemindersPage from './pages/RemindersPage';

function AdminRoutes() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Preloader />
        <Router basename="/">
          <Routes>
            <Route path="/" element={<Landing />} />
            
            {/* Public admin login (must be outside the auth-guarded outlet) */}
            <Route path="/admin/login" element={<LoginPage />} />

            <Route path="/admin" element={<AdminRoutes />}>
              <Route index element={<HomePage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="new-job" element={<NewJobPage />} />
              <Route path="bills" element={<BillsPage />} />
              <Route path="reminders" element={<RemindersPage />} />
              <Route path="quotations/:id" element={<QuotationPrintPage />} />
              <Route path="invoices/:id" element={<InvoicePrintPage />} />
            </Route>

            <Route path="/insects" element={<Insects />} />
            <Route path="/video" element={<VideoPage />} />
            <Route path="/rushzzz" element={<Rushzzz />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;