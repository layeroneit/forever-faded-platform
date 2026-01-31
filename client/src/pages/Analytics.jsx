import React, { useState, useEffect } from 'react';
import { appointments } from '../lib/api';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import './Analytics.css';

export default function Analytics() {
  const [scheduledCuts, setScheduledCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);
    appointments
      .list({ from: from.toISOString(), to: to.toISOString() })
      .then((list) => {
        // Exclude cancelled/no_show; order by startAt ascending (closest date to latest)
        const upcoming = list
          .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
          .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
        setScheduledCuts(upcoming);
      })
      .catch((e) => {
        setError(e.message);
        setScheduledCuts([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="analytics-page">
      <h1 className="page-title">Analytics</h1>
      <p className="page-subtitle">Reports across all locations.</p>

      <section className="analytics-section">
        <h2 className="analytics-section-title">Scheduled Cuts by Date & Time</h2>
        <p className="analytics-section-desc">
          All scheduled cuts at any location, ordered from closest date/time to latest.
        </p>
        {error && <div className="page-error">{error}</div>}
        {loading && <div className="page-loading">Loading report…</div>}
        {!loading && !error && (
          <>
            {scheduledCuts.length === 0 ? (
              <div className="empty-state">No scheduled cuts in the date range.</div>
            ) : (
              <div className="analytics-report">
                <div className="daily-cuts-summary">
                  Total: <strong>{scheduledCuts.length}</strong> scheduled appointment{scheduledCuts.length !== 1 ? 's' : ''}
                </div>
                <div className="appointments-list">
                  {scheduledCuts.map((apt) => (
                    <div key={apt.id} className="appointment-card">
                      <div className="apt-header">
                        <span className={`apt-status status-${apt.status}`}>{apt.status}</span>
                        <span className="apt-date">
                          <Calendar size={14} /> {new Date(apt.startAt).toLocaleDateString()} ·{' '}
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
                        <div className="apt-price">${(apt.totalCents / 100).toFixed(2)} · {apt.paymentStatus}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
