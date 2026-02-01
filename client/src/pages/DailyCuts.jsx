import React, { useState, useEffect } from 'react';
import { appointments } from '../lib/api';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import './DailyCuts.css';

export default function DailyCuts() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError('');
    // Build range in local time so future dates are correct (date-only string is UTC midnight)
    const [y, m, d] = date.split('-').map(Number);
    const from = new Date(y, m - 1, d, 0, 0, 0, 0);
    const to = new Date(y, m - 1, d, 23, 59, 59, 999);
    appointments
      .list({ from: from.toISOString(), to: to.toISOString() })
      .then(setList)
      .catch((e) => {
        setError(e.message);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [date]);

  const reportDate = date ? new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <div className="daily-cuts-page">
      <h1 className="page-title">Daily Cuts</h1>
      <p className="page-subtitle">All scheduled cuts at any location for the selected date.</p>

      <div className="daily-cuts-controls">
        <label className="book-label">Date</label>
        <input
          type="date"
          className="book-input daily-cuts-date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <div className="page-error">{error}</div>}
      {loading && <div className="page-loading">Loading report…</div>}

      {!loading && !error && (
        <>
          <h2 className="daily-cuts-report-title">{reportDate}</h2>
          {list.length === 0 ? (
            <div className="empty-state">No scheduled cuts for this date.</div>
          ) : (
            <div className="daily-cuts-report">
              <div className="daily-cuts-summary">
                Total: <strong>{list.length}</strong> appointment{list.length !== 1 ? 's' : ''}
              </div>
              <div className="appointments-list">
                {list.map((apt) => (
                  <div key={apt.id} className="appointment-card">
                    <div className="apt-header">
                      <span className={`apt-status status-${apt.status}`}>{apt.status}</span>
                      <span className="apt-date">
                        <Clock size={14} /> {new Date(apt.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="apt-body">
                      <div className="apt-service">{apt.service?.name}</div>
                      <div className="apt-meta">
                        {apt.client && (
                          <span><User size={14} /> {apt.client.name}</span>
                        )}
                        {apt.barber && (
                          <span>Barber: {apt.barber.name}</span>
                        )}
                        {apt.location && (
                          <span><MapPin size={14} /> {apt.location.name}</span>
                        )}
                      </div>
                      <div className="apt-price">${((apt.totalCents ?? 0) / 100).toFixed(2)} · {apt.paymentStatus}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
