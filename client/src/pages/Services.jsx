import React, { useState, useEffect } from 'react';
import { locations, services as servicesApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Scissors, Plus, Pencil, X } from 'lucide-react';
import './Services.css';

const CATEGORIES = ['Face', 'Adults', 'Teens', 'Children', 'Seniors & Military'];

export default function Services() {
  const { user } = useAuth();
  const [locationsList, setLocationsList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // 'add' | { id } for edit
  const [form, setForm] = useState({ name: '', category: '', description: '', durationMinutes: 30, priceCents: 3500, isActive: true });
  const [submitting, setSubmitting] = useState(false);

  const canManage = ['owner', 'admin', 'manager'].includes(user?.role);

  useEffect(() => {
    locations.list()
      .then((locs) => {
        setLocationsList(locs);
        if (locs[0]) setLocationId(locs[0].id);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!canManage) {
      servicesApi.list(locationId).then(setServicesList).catch(() => setServicesList([]));
      return;
    }
    // Owner: fetch all services (same catalog for every location)
    servicesApi.list(undefined, true)
      .then(setServicesList)
      .catch(() => setServicesList([]));
  }, [locationId, canManage]);

  const openAdd = () => {
    setForm({
      locationId: '', // '' = All locations
      name: '',
      category: '',
      description: '',
      durationMinutes: 30,
      priceCents: 3500,
      isActive: true,
    });
    setModal('add');
  };

  const openEdit = (svc) => {
    setForm({
      name: svc.name,
      category: svc.category || '',
      description: svc.description || '',
      durationMinutes: svc.durationMinutes,
      priceCents: svc.priceCents,
      isActive: svc.isActive,
      locationId: svc.locationId || '',
    });
    setModal({ id: svc.id });
  };

  const closeModal = () => {
    setModal(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const durationMinutes = Number(form.durationMinutes) || 30;
      const priceCents = Number(form.priceCents) || 3500;
      if (modal === 'add') {
        await servicesApi.create({
          ...form,
          locationId: form.locationId || null,
          durationMinutes,
          priceCents,
        });
      } else {
        await servicesApi.update(modal.id, {
          name: form.name,
          category: form.category || null,
          description: form.description || null,
          durationMinutes,
          priceCents,
          isActive: form.isActive,
          locationId: form.locationId || null,
        });
      }
      closeModal();
      if (canManage) servicesApi.list(undefined, true).then(setServicesList).catch(() => {});
      else servicesApi.list(locationId).then(setServicesList).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const byCategory = servicesList.reduce((acc, s) => {
    const cat = s.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  if (loading) return <div className="page-loading">Loading services…</div>;

  return (
    <div className="services-page">
      <h1 className="page-title">Services</h1>
      <p className="page-subtitle">Forever Faded service menu. {canManage && 'Add or edit services below.'}</p>

      {canManage && (
        <div className="services-toolbar">
          <p className="services-toolbar-note">Services apply to all locations.</p>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} /> Add service
          </button>
        </div>
      )}

      {!canManage && locationsList.length > 1 && (
        <select className="services-location-select" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          {locationsList.map((loc) => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      )}

      {Object.keys(byCategory).length === 0 ? (
        <div className="empty-state">No services yet. {canManage && 'Add one to get started.'}</div>
      ) : (
        <div className="services-list">
          {Object.entries(byCategory).map(([category, items]) => (
            <section key={category} className="services-category">
              <h2 className="services-category-title">{category}</h2>
              <div className="services-cards">
                {items.map((svc) => (
                  <div key={svc.id} className={`service-card ${!svc.isActive ? 'inactive' : ''}`}>
                    <div className="service-card-main">
                      <span className="service-name">{svc.name}</span>
                      {svc.description && <p className="service-desc">{svc.description}</p>}
                      <div className="service-meta">
                        <span>{svc.durationMinutes} min</span>
                        <span>${(svc.priceCents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    {canManage && (
                      <button type="button" className="btn-icon" onClick={() => openEdit(svc)} title="Edit">
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content services-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'add' ? 'Add service' : 'Edit service'}</h2>
              <button type="button" className="btn-icon" onClick={closeModal}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="services-form">
              {error && <div className="form-error">{error}</div>}
              {modal === 'add' && (
                <p className="form-hint">New services are available at all locations.</p>
              )}
              {modal !== 'add' && canManage && (
                <div className="form-group">
                  <label>Available at</label>
                  <select
                    value={form.locationId || ''}
                    onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}
                  >
                    <option value="">All locations</option>
                    {locationsList.map((loc) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Cut"
                  required
                />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Simple bleach lightened process"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={form.priceCents == null ? '' : (form.priceCents / 100)}
                    onChange={(e) => setForm((f) => ({ ...f, priceCents: Math.round(parseFloat(e.target.value || 0) * 100) }))}
                  />
                </div>
              </div>
              {modal !== 'add' && (
                <div className="form-group form-check">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Active (show for booking)
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : modal === 'add' ? 'Add service' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
