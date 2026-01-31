import React, { useState, useEffect } from 'react';
import { locations, admin, users as usersApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, User } from 'lucide-react';
import './Staff.css';

export default function Staff() {
  const { user } = useAuth();
  const [locationsList, setLocationsList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', role: 'barber', locationId: '' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', role: '', locationId: '' });
  const [submitting, setSubmitting] = useState(false);

  const canAdd = user?.role === 'owner' || user?.role === 'admin';
  const canEdit = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    locations.list()
      .then((locs) => {
        setLocationsList(locs);
        if (locs[0]) setLocationId(locs[0].id);
      })
      .catch(() => setLocationsList([]));
  }, []);

  useEffect(() => {
    const params = {};
    if (locationId) params.locationId = locationId;
    if (roleFilter) params.role = roleFilter;
    admin.users(params)
      .then(setStaffList)
      .catch((err) => {
        setStaffList([]);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [locationId, roleFilter]);

  const openAdd = () => {
    setForm({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'barber',
      locationId: locationId || locationsList[0]?.id,
    });
    setError('');
    setShowAdd(true);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await usersApi.create({
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone || undefined,
        role: form.role,
        locationId: form.locationId || undefined,
      });
      setShowAdd(false);
      const params = {};
      if (locationId) params.locationId = locationId;
      if (roleFilter) params.role = roleFilter;
      admin.users(params).then(setStaffList).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (member) => {
    if (!canEdit) return;
    setEditingMember(member);
    setEditForm({
      name: member.name || '',
      phone: member.phone || '',
      role: member.role || 'barber',
      locationId: member.locationId || '',
    });
    setError('');
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    if (!editingMember) return;
    setSubmitting(true);
    setError('');
    try {
      await usersApi.update(editingMember.id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || undefined,
        role: editForm.role,
        locationId: editForm.locationId || undefined,
      });
      setEditingMember(null);
      const params = {};
      if (locationId) params.locationId = locationId;
      if (roleFilter) params.role = roleFilter;
      admin.users(params).then(setStaffList).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">Loading staff…</div>;

  return (
    <div className="staff-page">
      <h1 className="page-title">Staff</h1>
      <p className="page-subtitle">Barbers and team at your location. {canAdd && 'Add barbers or managers below.'}</p>

      <div className="staff-toolbar">
        {locationsList.length > 1 && (
          <select className="staff-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            {locationsList.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}
        <select className="staff-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="barber">Barbers</option>
          <option value="manager">Managers</option>
          <option value="owner">Owners</option>
        </select>
        {canAdd && (
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> Add staff
          </button>
        )}
      </div>

      {staffList.length === 0 ? (
        <div className="empty-state">No staff in this filter. {canAdd && 'Add a barber to get started.'}</div>
      ) : (
        <div className="staff-grid">
          {staffList.map((member) => (
            <div
              key={member.id}
              className={`staff-card ${canEdit ? 'staff-card-selectable' : ''}`}
              onClick={canEdit ? () => openEdit(member) : undefined}
              role={canEdit ? 'button' : undefined}
              tabIndex={canEdit ? 0 : undefined}
              onKeyDown={canEdit ? (e) => e.key === 'Enter' && openEdit(member) : undefined}
            >
              <div className="staff-avatar">
                {member.name ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : <User size={24} />}
              </div>
              <div className="staff-info">
                <span className="staff-name">{member.name}</span>
                <span className="staff-email">{member.email}</span>
                {member.phone && <span className="staff-phone">{member.phone}</span>}
                <span className="staff-role">{member.role}</span>
                {member.location && (
                  <span className="staff-location">
                    {member.location.name}
                    {member.location.city && ` · ${member.location.city}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content staff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add staff member</h2>
              <button type="button" className="btn-icon" onClick={() => setShowAdd(false)}>×</button>
            </div>
            <form onSubmit={handleAddStaff} className="staff-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Mike Johnson"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="e.g. mike@foreverfaded.com"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password (min 6 characters)</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(262) 349-9289"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="barber">Barber</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {locationsList.length > 0 && (
                <div className="form-group">
                  <label>Location</label>
                  <select
                    value={form.locationId}
                    onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                  >
                    <option value="">—</option>
                    {locationsList.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding…' : 'Add staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="modal-overlay" onClick={() => setEditingMember(null)}>
          <div className="modal-content staff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit profile — {editingMember.name}</h2>
              <button type="button" className="btn-icon" onClick={() => setEditingMember(null)}>×</button>
            </div>
            <form onSubmit={handleEditStaff} className="staff-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Email (read-only)</label>
                <input type="email" value={editingMember.email} readOnly disabled className="staff-input-readonly" />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(262) 349-9289"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                  <option value="barber">Barber</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </div>
              {locationsList.length > 0 && (
                <div className="form-group">
                  <label>Location</label>
                  <select
                    value={editForm.locationId}
                    onChange={(e) => setEditForm((f) => ({ ...f, locationId: e.target.value }))}
                  >
                    <option value="">— No site —</option>
                    {locationsList.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingMember(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
