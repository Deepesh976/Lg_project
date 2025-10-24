import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/pages.css';

export default function AddDevice() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    device_id: '',
    price_per_ltr: '',
    total_dispensed_litres: '',
    location: '',
    status: 'ACTIVE',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm({
      device_id: '',
      price_per_ltr: '',
      total_dispensed_litres: '',
      location: '',
      status: 'ACTIVE',
    });
  };

  const handleClose = () => {
    navigate('/device');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const deviceId = (form.device_id || '').trim();
    if (!deviceId) {
      alert('Device ID is required.');
      return;
    }

    if (form.price_per_ltr === '' || isNaN(Number(form.price_per_ltr))) {
      alert('Price per litre is required and must be a number.');
      return;
    }

    if (form.total_dispensed_litres !== '' && isNaN(Number(form.total_dispensed_litres))) {
      alert('Total dispensed litres must be a number.');
      return;
    }

    const payload = {
      device_id: deviceId,
      price_per_ltr: Number(form.price_per_ltr),
      total_dispensed_litres: form.total_dispensed_litres === '' ? 0 : Number(form.total_dispensed_litres),
      location: (form.location || 'Unknown').trim() || 'Unknown',
      status: (form.status || 'ACTIVE').toUpperCase(),
    };

    try {
      setLoading(true);
      await axios.post('/api/device', payload);

      // success
      setForm({
        device_id: '',
        price_per_ltr: '',
        total_dispensed_litres: '',
        location: '',
        status: 'ACTIVE',
      });
      alert('✅ Device added successfully!');
      // navigate back to list and signal refresh
      navigate('/device', { state: { refresh: true } });
    } catch (err) {
      console.error('Add device error:', err);
      const msg = err?.response?.data?.message || 'Failed to add device';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="form-wrapper">
          {/* Header with Close Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '2px solid #f5f7fa',
          }}>
            <h2 className="form-title" style={{ marginBottom: 0, flex: 1 }}>
              <i className="fas fa-plus-circle" style={{ marginRight: '0.8rem', color: '#3f51b5' }}></i>
              Add Device
            </h2>
            <button
              type="button"
              className="btn btn-small"
              onClick={handleClose}
              title="Close form"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '2px solid rgba(239, 68, 68, 0.2)',
                padding: '0.6rem 0.8rem',
                minWidth: 'auto',
              }}
            >
              <i className="fas fa-times" style={{ fontSize: '1.1rem' }}></i>
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* Device ID */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-microchip" style={{ color: '#3f51b5', marginRight: '0.4rem' }}></i>
                  Device ID <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="device_id"
                  value={form.device_id}
                  onChange={handleChange}
                  placeholder="Enter unique device ID (e.g., 105833)"
                  autoFocus
                  required
                />
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }}></i>
                  Unique identifier for the device (serial or tag)
                </div>
              </div>

              {/* Location */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-map-marker-alt" style={{ color: '#3f51b5', marginRight: '0.4rem' }}></i>
                  Location
                </label>
                <input
                  className="form-input"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Enter device location (e.g., Vishakapatnam)"
                />
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }}></i>
                  Defaults to "Unknown" if left empty
                </div>
              </div>

              {/* Price per litre */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-rupee-sign" style={{ color: '#3f51b5', marginRight: '0.4rem' }}></i>
                  Price per litre <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="price_per_ltr"
                  value={form.price_per_ltr}
                  onChange={handleChange}
                  placeholder="Enter price (number)"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                />
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }}></i>
                  Numeric value. Example: 1
                </div>
              </div>

              {/* Total dispensed litres */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-tint" style={{ color: '#3f51b5', marginRight: '0.4rem' }}></i>
                  Total dispensed litres
                </label>
                <input
                  className="form-input"
                  name="total_dispensed_litres"
                  value={form.total_dispensed_litres}
                  onChange={handleChange}
                  placeholder="Enter total dispensed litres (default 0)"
                  type="number"
                  step="0.01"
                  min="0"
                />
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }}></i>
                  Defaults to 0
                </div>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-power-off" style={{ color: '#3f51b5', marginRight: '0.4rem' }}></i>
                  Status
                </label>
                <select
                  className="form-select"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.4rem' }}>
                  <i className="fas fa-info-circle" style={{ marginRight: '0.3rem' }}></i>
                  Device operational status
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={loading}
              >
                <i className="fas fa-save"></i>
                {loading ? 'Saving...' : 'Add Device'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleReset}
                disabled={loading}
              >
                <i className="fas fa-redo"></i>
                Reset
              </button>
              <button
                className="btn"
                type="button"
                onClick={handleClose}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                  color: '#6b7280',
                  border: '2px solid #d1d5db',
                }}
              >
                <i className="fas fa-times"></i>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
