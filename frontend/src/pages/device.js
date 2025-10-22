// src/pages/device.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const styles = {
  container: { display: 'flex', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 1100,
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8, flex: 1 },
  headerCenter: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    textAlign: 'center',
  },
  headerRight: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 25,
    fontWeight: 800,
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  search: {
    padding: 8,
    borderRadius: 8,
    border: '1px solid #ddd',
    minWidth: 220,
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: 10,
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: 10,
    borderBottom: '1px solid #f7f7f7',
    verticalAlign: 'top',
  },
  wrapCell: { maxWidth: 260, wordBreak: 'break-word', whiteSpace: 'normal' },
  button: {
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
  },
  addBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    background: '#0b74ff',
    color: '#fff',
    fontWeight: 700,
  },
  downloadBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #e6eefc',
    cursor: 'pointer',
    background: '#fff',
    color: '#0b74ff',
    fontWeight: 700,
  },
  editBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: '#10b981',
    color: '#fff',
  },
  delBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: '#ef4444',
    color: '#fff',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 12,
  },
};

function formatNumber(n, decimals = 2) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(decimals);
}

function statusStyle(status) {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return { background: '#ecfdf5', color: '#065f46' };
  if (s === 'MAINTENANCE') return { background: '#fff7ed', color: '#92400e' };
  if (s === 'INACTIVE') return { background: '#fef2f2', color: '#991b1b' };
  return { background: '#f3f4f6', color: '#374151' };
}

export default function Device() {
  const navigate = useNavigate();
  const location = useLocation();

  const [device, setDevice] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const limit = 20;
  const searchTimer = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const fetchDevice = useCallback(
    async (search = q, pageArg = page) => {
      try {
        setLoading(true);
        const res = await axios.get('/api/device', {
          params: { search, page: pageArg, limit },
        });
        if (!mountedRef.current) return;
        setDevice(res.data.items || []);
        setTotal(res.data.total || 0);
      } catch (err) {
        console.error('fetchDevice error', err);
        if (mountedRef.current)
          alert('Failed to load devices. Check console for details.');
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [limit, q, page]
  );

  useEffect(() => {
    fetchDevice(q, page);
  }, [fetchDevice, q, page]);

  useEffect(() => {
    if (location?.state?.refresh) {
      setPage(1);
      setQ('');
      fetchDevice('', 1);
      if (window.history && window.history.replaceState) {
        const newState = { ...(location.state || {}) };
        delete newState.refresh;
        window.history.replaceState(newState, '');
      }
    }
  }, [location, fetchDevice]);

  const onSearch = (e) => {
    const val = e.target.value;
    setQ(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchDevice(val, 1);
    }, 300);
  };

  const handleAdd = () => navigate('/adddevice');
  const handleEdit = (id) => navigate(`/editdevice/${id}`);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    try {
      setLoading(true);
      await axios.delete(`/api/device/${id}`);
      const remaining = device.length - 1;
      if (remaining <= 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        fetchDevice(q, page);
      }
    } catch (err) {
      console.error('deleteDevice error', err);
      if (mountedRef.current)
        alert(err?.response?.data?.message || 'Failed to delete device');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!device || device.length === 0) {
      alert('No devices to download on this page.');
      return;
    }
    const headers = [
      'S.No',
      'Device Id',
      'Location',
      'Price per litre',
      'Total (L)',
      'Status',
      'Last Update',
    ];
    const rows = [headers.join(',')];
    device.forEach((d, i) => {
      const price = d.price_per_ltr ?? d.price_per_litre ?? '';
      const totalL = d.total_dispensed_litres ?? '';
      const last = d.last_update || d.updatedAt || d.updated_at || '';
      const lastStr = last ? new Date(last).toLocaleString() : '';
      const row = [
        (page - 1) * limit + i + 1,
        `"${String(d.device_id ?? '').replace(/"/g, '""')}"`,
        `"${String(d.location ?? '').replace(/"/g, '""')}"`,
        price,
        totalL,
        `"${String(d.status ?? '').replace(/"/g, '""')}"`,
        `"${lastStr.replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devices_page_${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header layout: Left (Search), Center (Heading), Right (Buttons) */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <input
              style={styles.search}
              placeholder="Search device id or location"
              value={q}
              onChange={onSearch}
            />
          </div>

          <div style={styles.headerCenter}>
            <h2 style={styles.title}>Devices</h2>
          </div>

          <div style={styles.headerRight}>
            <button style={styles.downloadBtn} onClick={handleDownload} disabled={loading}>
              ⬇️ Download
            </button>
            <button style={styles.addBtn} onClick={handleAdd}>
              + Add Device
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>S.No</th>
                <th style={styles.th}>Device Id</th>
                <th style={styles.th}>Location</th>
                <th style={styles.th}>Price per litre</th>
                <th style={styles.th}>Total (L)</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Update</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {device.length === 0 ? (
                <tr>
                  <td style={{ ...styles.td, textAlign: 'center' }} colSpan={8}>
                    {loading ? 'Loading devices...' : 'No devices found'}
                  </td>
                </tr>
              ) : (
                device.map((d, idx) => {
                  const serial = (page - 1) * limit + idx + 1;
                  const last = d.last_update || d.updatedAt || d.updated_at;
                  const lastStr = last ? new Date(last).toLocaleString() : '—';
                  const price = d.price_per_ltr ?? d.price_per_litre;
                  const priceStr = price !== undefined ? formatNumber(price, 2) : '—';
                  const totalLitres =
                    d.total_dispensed_litres !== undefined
                      ? formatNumber(d.total_dispensed_litres, 2)
                      : '—';
                  const stat = d.status || '—';
                  return (
                    <tr key={d._id || idx}>
                      <td style={styles.td}>{serial}</td>
                      <td style={{ ...styles.td, ...styles.wrapCell }}>
                        {d.device_id || '—'}
                      </td>
                      <td style={{ ...styles.td, ...styles.wrapCell }}>
                        {d.location || '—'}
                      </td>
                      <td style={styles.td}>{priceStr}</td>
                      <td style={styles.td}>{totalLitres}</td>
                      <td style={styles.td}>
                        <span
                          style={{ ...styles.statusBadge, ...statusStyle(stat) }}
                        >
                          {stat}
                        </span>
                      </td>
                      <td style={styles.td}>{lastStr}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            style={styles.editBtn}
                            onClick={() => handleEdit(d._id)}
                          >
                            Edit
                          </button>
                          <button
                            style={styles.delBtn}
                            onClick={() => handleDelete(d._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            marginTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            Showing {device.length} of {total}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              style={styles.button}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <div
              style={{
                padding: '8px 12px',
                border: '1px solid #eee',
                borderRadius: 8,
              }}
            >
              {page}
            </div>
            <button
              style={styles.button}
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
