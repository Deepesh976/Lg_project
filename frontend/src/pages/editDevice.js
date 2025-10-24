import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

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
    maxWidth: 680,
  },
  title: { fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 16, textAlign: 'center' },
  formGroup: { marginBottom: 14, display: 'flex', flexDirection: 'column' },
  label: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff' },
  actions: { marginTop: 20, display: 'flex', justifyContent: 'center', gap: 10 },
  submitBtn: { background: '#0b74ff', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 },
  cancelBtn: { background: '#f3f4f6', color: '#111', border: '1px solid #e5e7eb', padding: '10px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  error: { color: '#b91c1c', fontSize: 13, marginTop: 6 },
};

const ALLOWED_STATUSES = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'];

export default function EditDevice() {
  const { id } = useParams();
  const navigate = useNavigate();

  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    device_id: '',
    price_per_ltr: '',
    total_dispensed_litres: '',
    location: '',
    status: 'ACTIVE',
  });

  // cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchDevice = useCallback(async () => {
    try {
      setFetching(true);
      setError('');
      const res = await axios.get(`/api/device/${id}`);
      const device = res.data.device || res.data; // controller returns { device, ... } or device
      if (!device) throw new Error('Device not found in response');

      if (!mountedRef.current) return;

      setForm({
        device_id: device.device_id || '',
        price_per_ltr: device.price_per_ltr !== undefined ? String(device.price_per_ltr) : '',
        total_dispensed_litres: device.total_dispensed_litres !== undefined ? String(device.total_dispensed_litres) : '',
        location: device.location || '',
        status: device.status || 'ACTIVE',
      });
    } catch (err) {
      console.error('fetchDevice error', err?.response || err?.message || err);
      if (mountedRef.current) setError(err?.response?.data?.message || 'Failed to fetch device');
    } finally {
      if (mountedRef.current) setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const validate = () => {
    if (!form.device_id.trim()) return 'Device ID missing';
    if (form.price_per_ltr === '' || isNaN(Number(form.price_per_ltr)) || Number(form.price_per_ltr) < 0) return 'price_per_ltr must be a number >= 0';
    if (form.total_dispensed_litres !== '' && (isNaN(Number(form.total_dispensed_litres)) || Number(form.total_dispensed_litres) < 0)) return 'total_dispensed_litres must be a number >= 0';
    if (!ALLOWED_STATUSES.includes(String(form.status || '').toUpperCase())) return `status must be one of: ${ALLOWED_STATUSES.join(', ')}`;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    const payload = {
      // device_id is intentionally not sent to avoid changing it (server disallows)
      price_per_ltr: Number(form.price_per_ltr),
      total_dispensed_litres: form.total_dispensed_litres === '' ? 0 : Number(form.total_dispensed_litres),
      location: (form.location || 'Unknown').trim() || 'Unknown',
      status: (form.status || 'ACTIVE').toUpperCase(),
    };

    try {
      setLoading(true);
      await axios.put(`/api/device/${id}`, payload);
      if (!mountedRef.current) return;
      alert('✅ Device updated successfully');
      navigate('/device', { state: { refresh: true } });
    } catch (err) {
      console.error('updateDevice error', err);
      if (mountedRef.current) setError(err?.response?.data?.message || 'Failed to update device');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/device');
  };

  if (fetching) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.title}>Loading device...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Edit Device</h2>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Device ID (read-only)</label>
            <input name="device_id" value={form.device_id} style={styles.input} readOnly />
            <div style={styles.hint}>Device ID is unique and cannot be changed here.</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Location</label>
            <input name="location" value={form.location} onChange={handleChange} style={styles.input} placeholder="Location" />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Price per litre *</label>
            <input
              name="price_per_ltr"
              value={form.price_per_ltr}
              onChange={handleChange}
              style={styles.input}
              type="number"
              step="0.01"
              min="0"
              placeholder="Price per litre"
            />
            <div style={styles.hint}>Numeric value. Example: 1</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Total dispensed litres</label>
            <input
              name="total_dispensed_litres"
              value={form.total_dispensed_litres}
              onChange={handleChange}
              style={styles.input}
              type="number"
              step="0.01"
              min="0"
              placeholder="Total dispensed litres"
            />
            <div style={styles.hint}>Number. Usually tracking value (can be 0).</div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select name="status" value={form.status} onChange={handleChange} style={styles.select}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
            <div style={styles.hint}>Device operational status.</div>
          </div>

          <div style={styles.actions}>
            <button style={styles.submitBtn} type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save changes'}</button>
            <button type="button" style={styles.cancelBtn} onClick={handleCancel} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
