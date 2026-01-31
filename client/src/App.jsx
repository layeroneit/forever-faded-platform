import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Book from './pages/Book';
import Appointments from './pages/Appointments';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import Staff from './pages/Staff';
import Locations from './pages/Locations';
import Settings from './pages/Settings';
import DailyCuts from './pages/DailyCuts';
import Analytics from './pages/Analytics';
import Clients from './pages/Clients';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function Placeholder({ title }) {
  return (
    <div>
      <h1 className="page-title">{title}</h1>
      <p className="page-subtitle">Coming soon. Use the API for now.</p>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/book" element={<Book />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/daily-cuts" element={<DailyCuts />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/schedule" element={<Placeholder title="Schedule" />} />
                  <Route path="/inventory" element={<Placeholder title="Inventory" />} />
                  <Route path="/payroll" element={<Placeholder title="Payroll" />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
