import React, { useState, useEffect } from 'react';
import { users } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './Book.css';

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredBarberId, setPreferredBarberId] = useState('');
  const [barbers, setBarbers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    users.me().then((p) => {
      setProfile(p);
      setName(p.name || '');
      setPhone(p.phone || '');
      setPreferredBarberId(p.preferredBarberId || '');
    }).catch(() => setProfile({}));
    if (user?.role === 'client') {
      users.list({ role: 'barber' }).then(setBarbers).catch(() => setBarbers([]));
    }
  }, [user?.role]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const body = { name, phone };
      if (user?.role === 'client') body.preferredBarberId = preferredBarberId || null;
      const updated = await users.updateMe(body);
      setProfile(updated);
      setMessage('Saved.');
    } catch (err) {
      setMessage(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="page-loading">Loading profile…</div>;

  return (
    <div className="book-page">
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">Manage your account.</p>

      <form onSubmit={handleSave} className="book-panel">
        <label className="book-label">Name</label>
        <input type="text" className="book-input" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: '100%' }} />
        <label className="book-label">Email</label>
        <input type="text" className="book-input" value={profile.email} disabled style={{ maxWidth: '100%', opacity: 0.8 }} />
        <label className="book-label">Phone</label>
        <input type="tel" className="book-input" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ maxWidth: '100%' }} />
        {user?.role === 'client' && barbers.length > 0 && (
          <>
            <label className="book-label">Preferred Barber</label>
            <select className="book-select" value={preferredBarberId} onChange={(e) => setPreferredBarberId(e.target.value)} style={{ maxWidth: '100%' }}>
              <option value="">No preference</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </>
        )}
        {message && <div className={message === 'Saved.' ? 'login-success' : 'login-error'} style={{ marginTop: '1rem' }}>{message}</div>}
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}
