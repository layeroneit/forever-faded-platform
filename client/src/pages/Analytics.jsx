import React, { useState, useEffect } from 'react';
import { appointments, admin } from '../lib/api';
import { Calendar, Clock, MapPin, User, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import './Analytics.css';

const PERIODS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
  { value: 'year', label: 'Yearly' },
];

export default function Analytics() {
  const [period, setPeriod] = useState('day');
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');
  const [scheduledCuts, setScheduledCuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    admin
      .analytics(period)
      .then(setAnalytics)
      .catch((e) => {
        setAnalyticsError(e.message);
        setAnalytics(null);
      })
      .finally(() => setAnalyticsLoading(false));
  }, [period]);

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);
    appointments
      .list({ from: from.toISOString(), to: to.toISOString() })
      .then((list) => {
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
        <h2 className="analytics-section-title">Sales & Earners</h2>
        <p className="analytics-section-desc">
          Revenue and barber performance by period. Select daily, weekly, monthly, or yearly.
        </p>
        <div className="analytics-period-tabs">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              className={`btn ${period === p.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {analyticsError && <div className="page-error">{analyticsError}</div>}
        {analyticsLoading && <div className="page-loading">Loading…</div>}
        {!analyticsLoading && !analyticsError && analytics && (
          <div className="analytics-report">
            <div className="analytics-summary-cards">
              <div className="analytics-summary-card">
                <DollarSign size={20} />
                <span className="analytics-summary-value">
                  ${((analytics.totalRevenueCents || 0) / 100).toLocaleString()}
                </span>
                <span className="analytics-summary-label">Revenue</span>
              </div>
              <div className="analytics-summary-card">
                <Calendar size={20} />
                <span className="analytics-summary-value">{analytics.salesCount ?? 0}</span>
                <span className="analytics-summary-label">Sales</span>
              </div>
            </div>
            <div className="analytics-earners-grid">
              <div className="analytics-earners-block">
                <h3 className="analytics-earners-title"><TrendingUp size={18} /> Top earners</h3>
                {analytics.topEarners?.length === 0 ? (
                  <p className="analytics-empty">No sales in this period.</p>
                ) : (
                  <ul className="analytics-earners-list">
                    {(analytics.topEarners || []).map((e, i) => (
                      <li key={e.barberId}>
                        <span className="analytics-earner-rank">{i + 1}</span>
                        <span className="analytics-earner-name">{e.barberName}</span>
                        <span className="analytics-earner-revenue">${((e.revenueCents ?? 0) / 100).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="analytics-earners-block">
                <h3 className="analytics-earners-title"><TrendingDown size={18} /> Lowest earners</h3>
                {analytics.lowestEarners?.length === 0 ? (
                  <p className="analytics-empty">No sales in this period.</p>
                ) : (
                  <ul className="analytics-earners-list">
                    {(analytics.lowestEarners || []).map((e, i) => (
                      <li key={e.barberId}>
                        <span className="analytics-earner-rank">{i + 1}</span>
                        <span className="analytics-earner-name">{e.barberName}</span>
                        <span className="analytics-earner-revenue">${((e.revenueCents ?? 0) / 100).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

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
                          {apt.client && <span><User size={14} /> {apt.client.name}</span>}
                          {apt.barber && <span>Barber: {apt.barber.name}</span>}
                          {apt.location && <span><MapPin size={14} /> {apt.location.name}</span>}
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
      </section>
    </div>
  );
}
