import React, { useState, useEffect, useCallback } from 'react';
import { appointments } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, User, XCircle, UserX, DollarSign } from 'lucide-react';
import './Appointments.css';

export default function Appointments() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [adjustApt, setAdjustApt] = useState(null);
  const [adjustDiscount, setAdjustDiscount] = useState('');
  const [adjustRefund, setAdjustRefund] = useState('');

  const fetchList = useCallback(() => {
    return appointments.list().then(setList).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const handleCancel = (apt, reason) => {
    if (busyId) return;
    setBusyId(apt.id);
    setActionError('');
    appointments
      .cancel(apt.id, reason)
      .then(() => fetchList())
      .catch((e) => setActionError(e.message))
      .finally(() => setBusyId(null));
  };

  const handleAdjustSubmit = () => {
    if (!adjustApt || busyId) return;
    const discountCents = adjustDiscount === '' ? undefined : Math.round(parseFloat(adjustDiscount) * 100);
    const refundCents = adjustRefund === '' ? undefined : Math.round(parseFloat(adjustRefund) * 100);
    if (discountCents === undefined && refundCents === undefined) {
      setAdjustApt(null);
      return;
    }
    setBusyId(adjustApt.id);
    setActionError('');
    const body = {};
    if (discountCents !== undefined) body.discountCents = discountCents;
    if (refundCents !== undefined) body.refundCents = refundCents;
    appointments
      .update(adjustApt.id, body)
      .then(() => {
        setAdjustApt(null);
        setAdjustDiscount('');
        setAdjustRefund('');
        fetchList();
      })
      .catch((e) => setActionError(e.message))
      .finally(() => setBusyId(null));
  };

  const canCancel = (apt) => ['pending', 'confirmed'].includes(apt.status);
  const isStaff = user?.role && ['barber', 'manager', 'owner', 'admin'].includes(user.role);
  const canAdjust = (apt) => isStaff && (apt.status === 'completed' || ['paid_at_shop', 'prepaid_online', 'refunded'].includes(apt.paymentStatus));

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

      {actionError && <div className="page-error apt-action-error">{actionError}</div>}

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
                <div className="apt-price">
                  ${((apt.totalCents - (apt.discountCents || 0)) / 100).toFixed(2)}
                  {(apt.discountCents || 0) > 0 && <span className="apt-discount"> (discount ${(apt.discountCents / 100).toFixed(2)})</span>}
                  {(apt.refundCents || 0) > 0 && <span className="apt-refund"> · refunded ${(apt.refundCents / 100).toFixed(2)}</span>}
                  {' · '}{apt.paymentStatus}
                </div>

                {canCancel(apt) && (
                  <div className="apt-actions">
                    {user?.role === 'client' ? (
                      <button
                        type="button"
                        className="apt-btn apt-btn-cancel"
                        disabled={busyId === apt.id}
                        onClick={() => handleCancel(apt)}
                      >
                        <XCircle size={16} /> Cancel
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="apt-btn apt-btn-cancel"
                          disabled={busyId === apt.id}
                          onClick={() => handleCancel(apt, 'cancelled')}
                        >
                          <XCircle size={16} /> Cancel
                        </button>
                        <button
                          type="button"
                          className="apt-btn apt-btn-no-show"
                          disabled={busyId === apt.id}
                          onClick={() => handleCancel(apt, 'no_show')}
                        >
                          <UserX size={16} /> No-show
                        </button>
                      </>
                    )}
                  </div>
                )}

                {canAdjust(apt) && (
                  <div className="apt-actions">
                    {adjustApt?.id === apt.id ? (
                      <div className="apt-adjust-form">
                        <label>Discount $</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={(apt.discountCents / 100).toFixed(2)}
                          value={adjustDiscount}
                          onChange={(e) => setAdjustDiscount(e.target.value)}
                          className="apt-input"
                        />
                        <label>Refund $</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={(apt.refundCents || 0) / 100}
                          value={adjustRefund}
                          onChange={(e) => setAdjustRefund(e.target.value)}
                          className="apt-input"
                        />
                        <button type="button" className="apt-btn apt-btn-primary" onClick={handleAdjustSubmit} disabled={!!busyId}>
                          Apply
                        </button>
                        <button type="button" className="apt-btn apt-btn-ghost" onClick={() => { setAdjustApt(null); setAdjustDiscount(''); setAdjustRefund(''); }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="apt-btn apt-btn-adjust"
                        onClick={() => { setAdjustApt(apt); setAdjustDiscount(''); setAdjustRefund(''); }}
                      >
                        <DollarSign size={16} /> Discount / Refund
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
