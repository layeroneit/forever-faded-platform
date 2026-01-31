import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi } from '../lib/api';
import './Login.css';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user: userData } = await authApi.register(email, password, name, phone || undefined);
      login(token, userData);
      navigate('/book');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1 className="login-title">FOREVER FADED</h1>
          <p className="login-tagline">Create account</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}
          <label className="login-label">Name</label>
          <input type="text" className="login-input" value={name} onChange={(e) => setName(e.target.value)} required />
          <label className="login-label">Email</label>
          <input type="email" className="login-input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="login-label">Phone number</label>
          <input type="tel" className="login-input" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="e.g. (262) 349-9289" />
          <label className="login-label">Password (min 6)</label>
          <input type="password" className="login-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <p className="login-register">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
