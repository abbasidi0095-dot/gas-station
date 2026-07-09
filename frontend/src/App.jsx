import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SoldGas from './pages/SoldGas.jsx';
import Workers from './pages/Workers.jsx';
import Financials from './pages/Financials.jsx';
import ReviewQueue from './pages/ReviewQueue.jsx';
import ReceiptHistory from './pages/ReceiptHistory.jsx';
import ReceiptDetail from './pages/ReceiptDetail.jsx';
import Invoices from './pages/Invoices.jsx';
import Settings from './pages/Settings.jsx';

function ProtectedRoute({ children, allowedRoles = ['admin'] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'pompist') {
      return <Navigate to="/financials" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="/sold-gas" element={<ProtectedRoute allowedRoles={['admin']}><SoldGas /></ProtectedRoute>} />
              <Route path="/financials" element={<ProtectedRoute allowedRoles={['pompist', 'admin']}><Financials /></ProtectedRoute>} />
              <Route path="/workers" element={<ProtectedRoute allowedRoles={['admin']}><Workers /></ProtectedRoute>} />
              <Route path="/review-queue" element={<ProtectedRoute allowedRoles={['admin']}><ReviewQueue /></ProtectedRoute>} />
              <Route path="/receipts" element={<ProtectedRoute allowedRoles={['admin']}><ReceiptHistory /></ProtectedRoute>} />
              <Route path="/receipts/:id" element={<ProtectedRoute allowedRoles={['admin']}><ReceiptDetail /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute allowedRoles={['admin']}><Invoices /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
