import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage.jsx';
import SupportQueuePage from './pages/SupportQueuePage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout>
          <Routes>
            {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Customer Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected Detail View */}
              <Route
                path="/complaints/:id"
                element={
                  <ProtectedRoute allowedRoles={['customer', 'support', 'admin']}>
                    <ComplaintDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Support & Admin Queue */}
              <Route
                path="/support/queue"
                element={
                  <ProtectedRoute allowedRoles={['support', 'admin']}>
                    <SupportQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AppLayout>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
