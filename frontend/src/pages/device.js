// src/pages/device.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/pages.css';

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

  function getStatusBadgeClass(status) {
    const s = (status || '').toUpperCase();
    if (s === 'ACTIVE') return 'status-active';
    if (s === 'MAINTENANCE') return 'status-maintenance';
    if (s === 'INACTIVE') return 'status-inactive';
    return 'status-pending';
  }

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="card-panel">
          <div className="page-header">
            <div className="header-left">
              <input
                className="search-input"
                placeholder="Search device id or location"
                value={q}
                onChange={onSearch}
              />
            </div>

            <div className="header-center">
              <h2 className="page-title">Devices</h2>
            </div>

            <div className="header-right">
              <button
                className="btn btn-secondary btn-small"
                onClick={handleDownload}
                disabled={loading}
              >
                <i className="fas fa-download"></i>
                Download
              </button>
              <button
                className="btn btn-primary btn-small"
                onClick={handleAdd}
              >
                <i className="fas fa-plus"></i>
                Add Device
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Device Id</th>
                  <th>Location</th>
                  <th>Price per litre</th>
                  <th>Total (L)</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {device.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">
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
                        <td>{serial}</td>
                        <td>{d.device_id || '—'}</td>
                        <td>{d.location || '—'}</td>
                        <td>{priceStr}</td>
                        <td>{totalLitres}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(stat)}`}>
                            {stat}
                          </span>
                        </td>
                        <td>{lastStr}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn btn-success btn-small"
                              onClick={() => handleEdit(d._id)}
                            >
                              <i className="fas fa-edit"></i>
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleDelete(d._id)}
                            >
                              <i className="fas fa-trash"></i>
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

          <div className="pagination-container">
            <div className="pagination-info">
              Showing {device.length} of {total}
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="fas fa-chevron-left"></i> Prev
              </button>
              <div className="pagination-page">{page}</div>
              <button
                className="pagination-btn"
                disabled={page * limit >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
