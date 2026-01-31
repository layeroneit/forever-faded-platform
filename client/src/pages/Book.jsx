import React, { useState, useEffect } from 'react';
import { locations, services, users, appointments } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronRight } from 'lucide-react';
import './Book.css';

export default function Book() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [locationsList, setLocationsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [service, setService] = useState(null);
  const [barber, setBarber] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([locations.list(), services.list()])
      .then(([locs, svcs]) => {
        setLocationsList(locs);
        setServicesList(svcs);
        if (locs[0]) setLocationId(locs[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!locationId) return;
    users.list({ locationId, role: 'barber' }).then(setBarbers).catch(() => setBarbers([]));
  }, [locationId]);

  const filteredServices = locationId ? servicesList.filter((s) => s.locationId === locationId) : servicesList;
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  const handleBook = async () => {
    if (!service || !barber || !date || !time) return;
    setSubmitting(true);
    setError('');
    try {
      const startAt = new Date(`${date}T${time}`);
      await appointments.create({
        locationId,
        clientId: user.id,
        barberId: barber.id,
        serviceId: service.id,
        startAt: startAt.toISOString(),
      });
      setStep(1);
      setService(null);
      setBarber(null);
      setDate('');
      setTime('');
      setStep(1);
      alert('Booking confirmed.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (error && step === 1) return <div className="page-error">{error}</div>;

  return (
    <div className="book-page">
      <h1 className="page-title">Book Appointment</h1>
      <p className="page-subtitle">Choose location, service, barber, and time.</p>

      <div className="book-steps">
        <div className={`book-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <span className="book-step-num">1</span>
          <span>Service</span>
        </div>
        <div className={`book-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <span className="book-step-num">2</span>
          <span>Barber</span>
        </div>
        <div className={`book-step ${step >= 3 ? 'active' : ''} ${step > 3 ? 'done' : ''}`}>
          <span className="book-step-num">3</span>
          <span>Date & Time</span>
        </div>
        <div className={`book-step ${step >= 4 ? 'active' : ''}`}>
          <span className="book-step-num">4</span>
          <span>Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <div className="book-panel">
          <label className="book-label">Location</label>
          <select className="book-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locationsList.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <label className="book-label">Service</label>
          <div className="book-grid">
            {filteredServices.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`book-card ${service?.id === s.id ? 'selected' : ''}`}
                onClick={() => setService(s)}
              >
                <div className="book-card-name">{s.name}</div>
                <div className="book-card-meta"><Clock size={14} /> {s.durationMinutes} min</div>
                <div className="book-card-price">${(s.priceCents / 100).toFixed(2)}</div>
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" disabled={!service} onClick={() => setStep(2)}>
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="book-panel">
          <label className="book-label">Choose Barber</label>
          <div className="book-grid barbers">
            {barbers.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`book-card barber ${barber?.id === b.id ? 'selected' : ''}`}
                onClick={() => setBarber(b)}
              >
                <div className="book-avatar">{b.name.split(' ').map((n) => n[0]).join('')}</div>
                <div className="book-card-name">{b.name}</div>
              </button>
            ))}
          </div>
          <div className="book-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!barber} onClick={() => setStep(3)}>Next <ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="book-panel">
          <label className="book-label">Date</label>
          <input type="date" className="book-input" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <>
              <label className="book-label">Time</label>
              <div className="book-times">
                {timeSlots.map((t) => (
                  <button key={t} type="button" className={`book-time ${time === t ? 'selected' : ''}`} onClick={() => setTime(t)}>
                    {t.slice(0, 5)}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="book-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!date || !time} onClick={() => setStep(4)}>Next <ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="book-panel">
          <div className="book-summary">
            <p><strong>Location:</strong> {locationsList.find((l) => l.id === locationId)?.name}</p>
            <p><strong>Service:</strong> {service?.name} — ${(service?.priceCents / 100).toFixed(2)}</p>
            <p><strong>Barber:</strong> {barber?.name}</p>
            <p><strong>Date:</strong> {date} at {time}</p>
          </div>
          {error && <div className="login-error">{error}</div>}
          <div className="book-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleBook}>
              {submitting ? 'Booking…' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
