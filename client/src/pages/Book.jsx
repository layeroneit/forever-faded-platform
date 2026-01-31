import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { locations, services, users, appointments, payments } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Clock, ChevronRight } from 'lucide-react';
import './Book.css';

function CheckoutForm({ appointmentId, amountCents, onSuccess, onPayAtShop }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');
    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/book',
          receipt_email: undefined,
        },
      });
      if (submitError) {
        setError(submitError.message || 'Payment failed');
        setProcessing(false);
        return;
      }
      await payments.confirmPrepaid(appointmentId);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="book-panel">
      <h2 className="dashboard-section">Pay now</h2>
      <p className="book-hint">${(amountCents / 100).toFixed(2)} — secure payment via Stripe.</p>
      <PaymentElement />
      {error && <div className="login-error" style={{ marginTop: '1rem' }}>{error}</div>}
      <div className="book-actions" style={{ marginTop: '1rem' }}>
        <button type="button" className="btn btn-secondary" onClick={onPayAtShop}>
          I&apos;ll pay at the shop
        </button>
        <button type="submit" className="btn btn-primary" disabled={!stripe || processing}>
          {processing ? 'Processing…' : 'Pay now'}
        </button>
      </div>
    </form>
  );
}

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
  const [bookedAppointment, setBookedAppointment] = useState(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [paymentPreparing, setPaymentPreparing] = useState(false);

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

  const filteredServices = locationId
    ? servicesList.filter((s) => s.locationId === locationId || s.locationId == null)
    : servicesList;
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];

  const handleBook = async (payNow = false) => {
    if (!service || !barber || !date || !time) return;
    setSubmitting(true);
    setError('');
    setBookingSuccess('');
    try {
      const startAt = new Date(`${date}T${time}`);
      const apt = await appointments.create({
        locationId,
        clientId: user.id,
        barberId: barber.id,
        serviceId: service.id,
        startAt: startAt.toISOString(),
      });
      if (!payNow) {
        setBookingSuccess('Booking confirmed. Pay at the shop.');
        resetAfterBook();
        return;
      }
      setBookedAppointment(apt);
      setPaymentPreparing(true);
      try {
        const { clientSecret } = await payments.createPaymentIntent(apt.id, apt.totalCents);
        const { publishableKey } = await payments.config();
        if (publishableKey && clientSecret) {
          const stripe = await loadStripe(publishableKey);
          setStripePromise(stripe);
          setPaymentClientSecret(clientSecret);
        } else {
          setBookingSuccess('Booking confirmed. Online payment is not configured — please pay at the shop.');
          resetAfterBook();
        }
      } catch (e) {
        setBookingSuccess('Booking confirmed. Online payment unavailable — please pay at the shop.');
        resetAfterBook();
      } finally {
        setPaymentPreparing(false);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAfterBook = () => {
    setBookedAppointment(null);
    setPaymentClientSecret('');
    setStep(1);
    setService(null);
    setBarber(null);
    setDate('');
    setTime('');
  };

  const handlePaymentSuccess = () => {
    setBookingSuccess('Booking confirmed. Payment received.');
    resetAfterBook();
  };

  const handlePayAtShop = () => {
    setBookingSuccess('Booking confirmed. Pay at the shop.');
    resetAfterBook();
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (error && step === 1) return <div className="page-error">{error}</div>;

  if (bookingSuccess) {
    return (
      <div className="book-page">
        <h1 className="page-title">Book Appointment</h1>
        <div className="login-success" style={{ marginTop: '1rem' }}>{bookingSuccess}</div>
        <button type="button" className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setBookingSuccess('')}>
          Book another
        </button>
      </div>
    );
  }

  if (paymentPreparing) {
    return (
      <div className="book-page">
        <h1 className="page-title">Book Appointment</h1>
        <div className="page-loading">Booking confirmed. Preparing payment…</div>
      </div>
    );
  }

  if (bookedAppointment && paymentClientSecret && stripePromise) {
    const options = { clientSecret: paymentClientSecret };
    return (
      <div className="book-page">
        <h1 className="page-title">Book Appointment</h1>
        <p className="page-subtitle">Complete payment for your booking.</p>
        <Elements stripe={stripePromise} options={options}>
          <CheckoutForm
            appointmentId={bookedAppointment.id}
            amountCents={bookedAppointment.totalCents}
            onSuccess={handlePaymentSuccess}
            onPayAtShop={handlePayAtShop}
          />
        </Elements>
      </div>
    );
  }

  return (
    <div className="book-page">
      <h1 className="page-title">Book Appointment</h1>
      <p className="page-subtitle">Choose location, barber, service, and time.</p>

      <div className="book-steps">
        <div className={`book-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <span className="book-step-num">1</span>
          <span>Location</span>
        </div>
        <div className={`book-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <span className="book-step-num">2</span>
          <span>Barber</span>
        </div>
        <div className={`book-step ${step >= 3 ? 'active' : ''} ${step > 4 ? 'done' : ''}`}>
          <span className="book-step-num">3</span>
          <span>Service</span>
        </div>
        <div className={`book-step ${step >= 4 ? 'active' : ''} ${step > 4 ? 'done' : ''}`}>
          <span className="book-step-num">4</span>
          <span>Date & Time</span>
        </div>
        <div className={`book-step ${step >= 5 ? 'active' : ''}`}>
          <span className="book-step-num">5</span>
          <span>Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <div className="book-panel">
          <label className="book-label">Choose location</label>
          <select className="book-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locationsList.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <div className="book-actions">
            <span />
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="book-panel">
          <label className="book-label">Choose barber at {locationsList.find((l) => l.id === locationId)?.name}</label>
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
          {barbers.length === 0 && <p className="book-empty">No barbers at this location yet.</p>}
          <div className="book-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!barber} onClick={() => setStep(3)}>
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="book-panel">
          <label className="book-label">Choose service</label>
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
          <div className="book-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!service} onClick={() => setStep(4)}>
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
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
            <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>Back</button>
            <button type="button" className="btn btn-primary" disabled={!date || !time} onClick={() => setStep(5)}>
              Next <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="book-panel">
          <div className="book-summary">
            <p><strong>Location:</strong> {locationsList.find((l) => l.id === locationId)?.name}</p>
            <p><strong>Barber:</strong> {barber?.name}</p>
            <p><strong>Service:</strong> {service?.name} — ${(service?.priceCents / 100).toFixed(2)}</p>
            <p><strong>Date:</strong> {date} at {time}</p>
          </div>
          {error && <div className="login-error">{error}</div>}
          <p className="book-hint" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            Choose how you&apos;d like to pay:
          </p>
          <div className="book-payment-options">
            <button
              type="button"
              className="btn btn-primary"
              disabled={submitting}
              onClick={() => handleBook(true)}
            >
              {submitting ? 'Booking…' : 'Pay now with card'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={submitting}
              onClick={() => handleBook(false)}
            >
              Pay at the shop
            </button>
          </div>
          <div className="book-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(4)}>
              Back
            </button>
            <span />
          </div>
        </div>
      )}
    </div>
  );
}
