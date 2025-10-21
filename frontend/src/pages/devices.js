import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 1100, background: '#fff', padding: 16, borderRadius: 10, boxShadow: '0 6px 18px rgba(0,0,0,0.06)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' },
  search: { padding: 8, borderRadius: 8, border: '1px solid #ddd', minWidth: 220 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #eee', whiteSpace: 'nowrap' },
  td: { padding: 10, borderBottom: '1px solid #f7f7f7', verticalAlign: 'top' },
  wrapCell: { maxWidth: 260, wordBreak: 'break-word', whiteSpace: 'normal' },
  center: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
  button: { padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' },
  addBtn: { padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#0b74ff', color: '#fff', fontWeight: 700 },
  editBtn: { padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#10b981', color: '#fff' },
  delBtn: { padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff' },
};

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, [page]);

  async function fetchDevices(search = q) {
    try {
      setLoading(true);
      const res = await axios.get('/api/devices', { params: { search, page, limit }});
      setDevices(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      alert('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }

  function onSearch(e) {
    const val = e.target.value;
    setQ(val);
    setPage(1);
    // call immediately with new search
    axios.get('/api/devices', { params: { search: val, page: 1, limit }})
      .then(r => { setDevices(r.data.items || []); setTotal(r.data.total || 0); })
      .catch(err => {
        console.error(err);
        alert('Search failed');
      });
  }

  const handleRefresh = () => {
    fetchDevices();
  };

  const handleAdd = () => {
    navigate('/addDevice');
  };

  const handleEdit = (id) => {
    navigate(`/editdevice/${id}`);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    try {
      await axios.delete(`/api/devices/${id}`);
      // if current page becomes empty after delete, go to previous page if possible
      const remaining = devices.length - 1;
      if (remaining === 0 && page > 1) setPage(p => p - 1);
      else fetchDevices();
    } catch (err) {
      console.error(err);
      alert('Failed to delete device');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>Devices</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              style={styles.search}
              placeholder="Search device id or location"
              value={q}
              onChange={onSearch}
            />
            <button style={styles.button} onClick={handleRefresh} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button style={styles.addBtn} onClick={handleAdd}>+ Add Device</button>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>S.No</th>
                <th style={styles.th}>Device Id</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Price per litre</th>
                <th style={styles.th}>Last Update</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td style={{...styles.td, textAlign:'center'}} colSpan={6}>
                    {loading ? 'Loading devices...' : 'No devices found'}
                  </td>
                </tr>
              ) : devices.map((d, idx) => {
                const serial = (page - 1) * limit + idx + 1;
                const last = d.last_update || d.updatedAt || d.updated_at;
                const lastStr = last ? new Date(last).toLocaleString() : '—';
                const price = d.price_per_litre !== undefined ? Number(d.price_per_litre).toFixed(2) : '—';

                return (
                  <tr key={d._id}>
                    <td style={styles.td}>{serial}</td>
                    <td style={{...styles.td, ...styles.wrapCell}}>{d.device_id || '—'}</td>
                    <td style={{...styles.td, ...styles.wrapCell}}>{d.location || '—'}</td>
                    <td style={styles.td}>{price}</td>
                    <td style={styles.td}>{lastStr}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.editBtn} onClick={() => handleEdit(d._id)}>Edit</button>
                        <button style={styles.delBtn} onClick={() => handleDelete(d._1d)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>Showing {devices.length} of {total}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={styles.button}
              disabled={page <= 1}
              onClick={() => setPage(p => { const np = Math.max(1, p-1); fetchDevices(); return np; })}
            >
              Prev
            </button>
            <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: 8 }}>{page}</div>
            <button
              style={styles.button}
              disabled={page * limit >= total}
              onClick={() => setPage(p => { const np = p + 1; fetchDevices(); return np; })}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
