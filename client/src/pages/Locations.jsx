import React, { useState, useEffect } from 'react';
import { locations as locationsApi, admin } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, Plus, User, X } from 'lucide-react';
import './Locations.css';

const LOCATION_FIELDS = ['name', 'address', 'city', 'state', 'zip', 'phone', 'timezone'];

export default function Locations() {
  const { user } = useAuth();
  const [locationsList, setLocationsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    timezone: 'America/Chicago',
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    Promise.all([locationsApi.list(), canManage ? admin.users() : Promise.resolve([])])
      .then(([locs, staff]) => {
        setLocationsList(locs);
        setStaffList(staff);
      })
      .catch((err) => {
        setError(err.message);
        setLocationsList([]);
        setStaffList([]);
      })
      .finally(() => setLoading(false));
  }, [canManage]);

  const staffByLocation = staffList.reduce((acc, s) => {
    const locId = s.locationId || '_none';
    if (!acc[locId]) acc[locId] = [];
    acc[locId].push(s);
    return acc;
  }, {});

  const openAdd = () => {
    setForm({
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      timezone: 'America/Chicago',
    });
    setError('');
    setShowAdd(true);
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const created = await locationsApi.create({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim() || undefined,
        zip: form.zip.trim() || undefined,
        phone: form.phone.trim() || undefined,
        timezone: form.timezone.trim() || 'America/Chicago',
      });
      setLocationsList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setShowAdd(false);
      if (canManage) admin.users().then(setStaffList).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading locations…</div>;

  return (
    <div className="locations-page">
      <h1 className="page-title">Locations</h1>
      <p className="page-subtitle">Sites and assigned staff. {canManage && 'Add a new site below.'}</p>

      {canManage && (
        <div className="locations-toolbar">
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> Add a new site
          </button>
        </div>
      )}

      {error && <div className="locations-error">{error}</div>}

      {locationsList.length === 0 ? (
        <div className="empty-state">
          No locations yet. {canManage && 'Click "Add a new site" to create one.'}
        </div>
      ) : (
        <div className="locations-list">
          {locationsList.map((loc) => (
            <section key={loc.id} className="location-card">
              <div className="location-header">
                <div className="location-icon">
                  <MapPin size={24} />
                </div>
                <div className="location-main">
                  <h2 className="location-name">{loc.name}</h2>
                  <p className="location-address">
                    {loc.address}
                    {loc.city && `, ${loc.city}`}
                    {loc.state && ` ${loc.state}`}
                    {loc.zip && ` ${loc.zip}`}
                  </p>
                  {loc.phone && <p className="location-phone">{loc.phone}</p>}
                </div>
              </div>
              <div className="location-staff">
                <h3 className="location-staff-title">Assigned staff</h3>
                {(!staffByLocation[loc.id] || staffByLocation[loc.id].length === 0) ? (
                  <p className="location-staff-empty">No staff assigned to this site.</p>
                ) : (
                  <ul className="location-staff-list">
                    {staffByLocation[loc.id].map((member) => (
                      <li key={member.id} className="location-staff-item">
                        <span className="location-staff-avatar">
                          {member.name ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : <User size={14} />}
                        </span>
                        <span className="location-staff-name">{member.name}</span>
                        <span className="location-staff-role">{member.role}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content locations-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add a new site</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSite} className="locations-form">
              {error && <div className="form-error">{error}</div>}
              {LOCATION_FIELDS.map((field) => (
                <div key={field} className="form-group">
                  <label>
                    {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                  </label>
                  {field === 'timezone' ? (
                    <select
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    >
                      <option value="America/Chicago">America/Chicago</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Denver">America/Denver</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                    </select>
                  ) : (
                    <input
                      type={field === 'phone' ? 'tel' : 'text'}
                      value={form[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                      placeholder={field === 'name' ? 'e.g. Forever Faded — Waukesha' : ''}
                      required={['name', 'address', 'city'].includes(field)}
                    />
                  )}
                </div>
              ))}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
