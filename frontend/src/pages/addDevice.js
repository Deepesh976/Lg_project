import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = {
  page: {
    padding: 20,
    background: '#f5f7fb',
    minHeight: '100vh',
    fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 6px 18px rgba(20,30,60,0.08)',
    width: '100%',
    maxWidth: 600,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 14,
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
  },
  actions: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
  },
  submitBtn: {
    background: '#0b74ff',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
  },
  resetBtn: {
    background: '#f3f4f6',
    color: '#111',
    border: '1px solid #e5e7eb',
    padding: '10px 18px',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  }
};

export default function AddDevice() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    device_id: '',
    location: '',
    price_per_litre: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm({ device_id: '', location: '', price_per_litre: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.device_id.trim()) {
      alert('Device Id is required.');
      return;
    }
    if (form.price_per_litre === '' || isNaN(Number(form.price_per_litre))) {
      alert('Price per litre is required and must be a number.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        device_id: form.device_id.trim(),
        location: form.location.trim() || 'Unknown',
        price_per_litre: Number(form.price_per_litre)
      };

      const res = await axios.post('/api/devices', payload);
      // success
      alert('Device added successfully.');
      // navigate back to devices list (adjust route if needed)
      navigate('/devices');
    } catch (err) {
      console.error('Add device error:', err);
      const msg = err?.response?.data?.message || 'Failed to add device';
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Add Device</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Device Id *</label>
            <input
              name="device_id"
              value={form.device_id}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter unique device id (eg. DEV-001)"
              autoFocus
            />
            <div style={styles.hint}>Unique identifier for the device (serial or tag).</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter device location (eg. Pump House A)"
            />
            <div style={styles.hint}>Optional. Defaults to "Unknown" if left empty.</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Price per litre *</label>
            <input
              name="price_per_litre"
              value={form.price_per_litre}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter price (number)"
              type="number"
              step="0.01"
              min="0"
            />
            <div style={styles.hint}>Numeric value. Example: 0.75</div>
          </div>

          <div style={styles.actions}>
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Add Device'}
            </button>
            <button type="button" style={styles.resetBtn} onClick={handleReset} disabled={loading}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
