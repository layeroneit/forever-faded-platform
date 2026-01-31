import React, { useState, useEffect } from 'react';
import { clients } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Calendar, Hash } from 'lucide-react';
import './Clients.css';

export default function Clients() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    clients
      .list()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading client list…</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="clients-page">
      <h1 className="page-title">Client Library</h1>
      <p className="page-subtitle">
        {user?.role === 'barber' || user?.role === 'manager'
          ? 'Clients who have booked with you. Use last visit for discounts and marketing.'
          : 'All clients across locations. Last booking supports future AI discounting and marketing.'}
      </p>

      {list.length === 0 ? (
        <div className="empty-state">No clients yet.</div>
      ) : (
        <div className="clients-list">
          {list.map((c) => (
            <div key={c.id} className="client-card">
              <div className="client-header">
                <div className="client-avatar">{c.name?.split(' ').map((n) => n[0]).join('') || '?'}</div>
                <div className="client-name">{c.name}</div>
              </div>
              <div className="client-details">
                {c.email && (
                  <span className="client-detail">
                    <Mail size={14} /> {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="client-detail">
                    <Phone size={14} /> {c.phone}
                  </span>
                )}
                <span className="client-detail client-last-booking">
                  <Calendar size={14} /> Last visit: {c.lastBookingAt ? new Date(c.lastBookingAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </span>
                {c.lastServiceName && (
                  <span className="client-detail">Service: {c.lastServiceName}</span>
                )}
                <span className="client-detail client-total">
                  <Hash size={14} /> {c.totalAppointments} appointment{c.totalAppointments !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
