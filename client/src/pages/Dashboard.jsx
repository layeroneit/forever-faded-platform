import React, { useState, useEffect } from 'react';
import { admin, appointments } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, DollarSign, Users, MapPin } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const from = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const to = new Date().toISOString();

    if (user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager') {
      Promise.all([
        admin.stats(user?.locationId || undefined),
        appointments.list({ from, to }),
      ])
        .then(([s, list]) => {
          setStats(s);
          setTodayAppointments(list);
        })
        .catch(() => setStats({ totalAppointments: 0, completedToday: 0, totalRevenueCents: 0, staffCount: 0 }))
        .finally(() => setLoading(false));
    } else {
      appointments.list({ from, to })
        .then(setTodayAppointments)
        .catch(() => setTodayAppointments([]))
        .finally(() => setLoading(false));
    }
  }, [user?.role, user?.locationId]);

  if (loading) return <div className="page-loading">Loading dashboard…</div>;

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="dashboard-page">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]}.</p>

      {isOwnerOrAdmin && stats && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={24} /></div>
            <div className="stat-value">{stats.completedToday}</div>
            <div className="stat-label">Completed Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Calendar size={24} /></div>
            <div className="stat-value">{stats.totalAppointments}</div>
            <div className="stat-label">Total Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><DollarSign size={24} /></div>
            <div className="stat-value">${((stats.totalRevenueCents || 0) / 100).toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon"><Users size={24} /></div>
            <div className="stat-value">{stats.staffCount}</div>
            <div className="stat-label">Staff</div>
          </div>
        </div>
      )}

      <h2 className="dashboard-section">Today&apos;s Appointments</h2>
      {todayAppointments.length === 0 ? (
        <div className="empty-state">No appointments today.</div>
      ) : (
        <div className="appointments-list">
          {todayAppointments.map((apt) => (
            <div key={apt.id} className="appointment-card">
              <div className="apt-header">
                <span className={`apt-status status-${apt.status}`}>{apt.status}</span>
                <span className="apt-date">
                  {new Date(apt.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div className="apt-body">
                <div className="apt-service">{apt.service?.name}</div>
                <div className="apt-meta">
                  {apt.client && <span><Users size={14} /> {apt.client.name}</span>}
                  {apt.location && <span><MapPin size={14} /> {apt.location.name}</span>}
                </div>
                <div className="apt-price">${(apt.totalCents / 100).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
