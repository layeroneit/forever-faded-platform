import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Menu, X, LogOut, Calendar, User, Home, Users, Scissors, DollarSign, BarChart3, Settings, Package, CreditCard, ClipboardList, BookUser } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const navByRole = {
  client: [
    { to: '/book', label: 'Book', icon: Calendar },
    { to: '/appointments', label: 'My Appointments', icon: Calendar },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  barber: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/clients', label: 'Clients', icon: BookUser },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  manager: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/schedule', label: 'Schedule', icon: Calendar },
    { to: '/appointments', label: 'Appointments', icon: Calendar },
    { to: '/clients', label: 'Clients', icon: BookUser },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  owner: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/daily-cuts', label: 'Daily Cuts', icon: ClipboardList },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/clients', label: 'Clients', icon: BookUser },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/services', label: 'Services', icon: Scissors },
    { to: '/locations', label: 'Locations', icon: MapPin },
    { to: '/inventory', label: 'Inventory', icon: Package },
    { to: '/payroll', label: 'Payroll', icon: DollarSign },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/daily-cuts', label: 'Daily Cuts', icon: ClipboardList },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/clients', label: 'Clients', icon: BookUser },
    { to: '/staff', label: 'Staff', icon: Users },
    { to: '/services', label: 'Services', icon: Scissors },
    { to: '/locations', label: 'Locations', icon: MapPin },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = navByRole[user?.role] || [];

  return (
    <div className="layout">
      <header className="layout-header">
        <button type="button" className="layout-menu-btn" onClick={() => setSidebarOpen((o) => !o)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <Link to="/" className="layout-logo">
          <img src="/logo.png" alt="Forever Faded" className="layout-logo-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.classList.add('show'); }} />
          <span className="layout-logo-text layout-logo-fallback">FOREVER FADED</span>
        </Link>
        <div className="layout-spacer" />
      </header>

      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="layout-sidebar-header">
          <span className="layout-logo-text">FOREVER FADED</span>
          {user?.location && (
            <p className="layout-location">
              <MapPin size={12} /> {user.location.name}
            </p>
          )}
        </div>
        <nav className="layout-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`layout-nav-link ${location.pathname === to ? 'active' : ''}`}
            >
              <Icon size={20} /> {label}
            </Link>
          ))}
        </nav>
        <div className="layout-sidebar-footer">
          <div className="layout-user">
            <div className="layout-avatar">{user?.name?.split(' ').map((n) => n[0]).join('') || '?'}</div>
            <div>
              <div className="layout-user-name">{user?.name}</div>
              <div className="layout-user-role">{user?.role}</div>
            </div>
          </div>
          <button type="button" className="layout-logout" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      <main className={`layout-main ${sidebarOpen ? '' : 'full'}`}>{children}</main>
    </div>
  );
}
