import React, { useState, useEffect } from 'react';
import { appointments } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import './Appointments.css';

export default function Appointments() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    appointments.list()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading appointments…</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="appointments-page">
      <h1 className="page-title">
        {user?.role === 'client' ? 'My Appointments' : 'Appointments'}
      </h1>
      <p className="page-subtitle">
        {user?.role === 'client' ? 'View and manage your bookings.' : 'Today and upcoming.'}
      </p>

      {list.length === 0 ? (
        <div className="empty-state">No appointments yet.</div>
      ) : (
        <div className="appointments-list">
          {list.map((apt) => (
            <div key={apt.id} className="appointment-card">
              <div className="apt-header">
                <span className={`apt-status status-${apt.status}`}>{apt.status}</span>
                <span className="apt-date">
                  <Calendar size={14} /> {new Date(apt.startAt).toLocaleDateString()} · {new Date(apt.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <div className="apt-body">
                <div className="apt-service">{apt.service?.name}</div>
                <div className="apt-meta">
                  {user?.role === 'client' && apt.barber && (
                    <span><User size={14} /> {apt.barber.name}</span>
                  )}
                  {user?.role !== 'client' && apt.client && (
                    <span><User size={14} /> {apt.client.name}</span>
                  )}
                  {apt.location && (
                    <span><MapPin size={14} /> {apt.location.name}</span>
                  )}
                </div>
                <div className="apt-price">${(apt.totalCents / 100).toFixed(2)} · {apt.paymentStatus}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
