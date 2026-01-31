import React, { useState } from 'react';
import { admin } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import './Book.css';

export default function Settings() {
  const { user } = useAuth();
  const [testEmailTo, setTestEmailTo] = useState(user?.email || '');
  const [testResult, setTestResult] = useState('');
  const [sending, setSending] = useState(false);

  const isOwnerOrAdmin = user?.role === 'owner' || user?.role === 'admin';

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmailTo?.trim()) {
      setTestResult('Enter an email address.');
      return;
    }
    setSending(true);
    setTestResult('');
    try {
      const data = await admin.sendTestEmail(testEmailTo.trim());
      setTestResult(data.message || 'Test email sent.');
    } catch (err) {
      let msg = err.message || 'Failed to send test email.';
      if (msg === 'Failed to fetch' || msg.toLowerCase().includes('failed to fetch')) {
        msg = 'Could not reach the API. Make sure the server is running (cd server && npm run dev on port 3001).';
      } else if (msg.toLowerCase().includes('not found')) {
        msg = `${msg} Restart the server after code changes.`;
      }
      setTestResult(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="book-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage app and email settings.</p>

      {isOwnerOrAdmin && (
        <div className="book-panel" style={{ maxWidth: '480px' }}>
          <h2 className="dashboard-section">Send test email</h2>
          <p className="book-hint">Verify SMTP by sending a test email. Owner/admin only.</p>
          <form onSubmit={handleSendTestEmail}>
            <label className="book-label">Send to</label>
            <input
              type="email"
              className="book-input"
              value={testEmailTo}
              onChange={(e) => setTestEmailTo(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {testResult && (
              <div className={testResult.startsWith('Test email sent') ? 'login-success' : 'login-error'} style={{ marginTop: '0.75rem' }}>
                {testResult}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }} disabled={sending}>
              {sending ? 'Sending…' : 'Send test email'}
            </button>
          </form>
        </div>
      )}

      {!isOwnerOrAdmin && (
        <p className="page-subtitle">You don’t have access to settings.</p>
      )}
    </div>
  );
}
