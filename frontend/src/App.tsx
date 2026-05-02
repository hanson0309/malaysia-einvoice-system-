import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerFormPage from './pages/CustomerFormPage';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/new" element={<InvoiceFormPage />} />
            <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
