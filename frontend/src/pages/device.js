// src/pages/device.js
import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/pages.css';

function formatNumber(n, decimals = 2) {
  if (n === undefined || n === null || Number.isNaN(Number(n))) return '—';
  return Number(n).toFixed(decimals);
}

/** Simple icon stub for dots — replace with your Icon component if you have one */
function Icon({ name }) {
  if (name === 'dots') return <span style={{ fontSize: 12 }}>…</span>;
  return null;
}

export default function Device() {
  const navigate = useNavigate();
  const location = useLocation();

  const [device, setDevice] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1); // current page (1-indexed)
  const [pageSize, setPageSize] = useState(10); // rows per page (user-selectable)
  const [total, setTotal] = useState(0); // total items from server
  const [loading, setLoading] = useState(false);

  const searchTimer = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // fetch devices (server should accept page & limit)
  const fetchDevice = useCallback(
    async (search = q, pageArg = page, size = pageSize) => {
      try {
        setLoading(true);
        const res = await axios.get('/api/device', {
          params: { search, page: pageArg, limit: size },
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
    [q, page, pageSize]
  );

  // initial and dependency fetch
  useEffect(() => {
    fetchDevice(q, page, pageSize);
  }, [fetchDevice, q, page, pageSize]);

  // handle refresh via location.state
  useEffect(() => {
    if (location?.state?.refresh) {
      setPage(1);
      setQ('');
      fetchDevice('', 1, pageSize);
      if (window.history && window.history.replaceState) {
        const newState = { ...(location.state || {}) };
        delete newState.refresh;
        window.history.replaceState(newState, '');
      }
    }
  }, [location, fetchDevice, pageSize]);

  const onSearch = (e) => {
    const val = e.target.value;
    setQ(val);
    setPage(1);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchDevice(val, 1, pageSize);
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
        // fetchDevice will run due to page change effect
      } else {
        fetchDevice(q, page, pageSize);
      }
    } catch (err) {
      console.error('deleteDevice error', err);
      if (mountedRef.current)
        alert(err?.response?.data?.message || 'Failed to delete device');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // CSV download respects pageSize and page
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
      "Today's Dispensed (L)",
      'Total Dispensed (L)',
      'Status',
      'Last Update',
    ];
    const rows = [headers.join(',')];
    device.forEach((d, i) => {
      const price = d.price_per_ltr ?? d.price_per_litre ?? '';
      const todayL =
        d.todays_total_dispensed_litres ??
        d.today_dispensed_litres ??
        d.today_total_dispensed_litres ??
        d.dispensed_today ??
        d.today_total ??
        '';
      const totalL = d.total_dispensed_litres ?? '';
      const last = d.last_update || d.updatedAt || d.updated_at || '';
      const lastStr = last ? new Date(last).toLocaleString() : '';
      const row = [
        (page - 1) * pageSize + i + 1,
        `"${String(d.device_id ?? '').replace(/"/g, '""')}"`,
        `"${String(d.location ?? '').replace(/"/g, '""')}"`,
        price,
        todayL,
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

  // Pagination helpers
  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const totalItems = total || 0;
  const currentPage = Math.min(Math.max(1, Number(page)), totalPages);

  const goToPage = (p) => {
    const pageNum = Number(p) || 1;
    const clamped = Math.min(Math.max(1, Math.floor(pageNum)), totalPages);
    if (clamped === page) return;
    setPage(clamped);
    // fetchDevice will be triggered by effect
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value) || 10;
    setPageSize(newSize);
    setPage(1);
    // fetchDevice will run via effect because pageSize changed
  };

  // Build page buttons with ellipses (returns array of numbers and 'left-ellipsis'/'right-ellipsis')
  const getPageButtons = () => {
    const pages = [];
    const maxButtons = 7; // including first & last
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const left = 1;
    const right = totalPages;
    const windowSize = 3; // show current +-1 (so 3 middle buttons)
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    pages.push(left);

    if (start > 2) pages.push('left-ellipsis');

    for (let p = start; p <= end; p++) pages.push(p);

    if (end < totalPages - 1) pages.push('right-ellipsis');

    pages.push(right);

    return pages;
  };

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
                  <th>Today's Dispensed (L)</th>
                  <th>Total Dispensed (L)</th>
                  <th>Status</th>
                  <th>Last Update</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {device.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="table-empty">
                      {loading ? 'Loading devices...' : 'No devices found'}
                    </td>
                  </tr>
                ) : (
                  device.map((d, idx) => {
                    const serial = (page - 1) * pageSize + idx + 1;
                    const last = d.last_update || d.updatedAt || d.updated_at;
                    const lastStr = last ? new Date(last).toLocaleString() : '—';
                    const price = d.price_per_ltr ?? d.price_per_litre;
                    const priceStr = price !== undefined ? formatNumber(price, 2) : '—';

                    const todayLitresRaw =
                      d.todays_total_dispensed_litres ??
                      d.today_dispensed_litres ??
                      d.today_total_dispensed_litres ??
                      d.dispensed_today ??
                      d.today_total ??
                      undefined;
                    const todayLitres =
                      todayLitresRaw !== undefined ? formatNumber(todayLitresRaw, 2) : '—';

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
                        <td>{todayLitres}</td>
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

          {/* MODERN PAGINATION UI (only this block changed) */}
          <div className="pagination-container" style={{ marginTop: 12 }}>
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ color: '#6b7280' }}>Show</label>
                <select value={pageSize} onChange={handlePageSizeChange} className="select" style={{ padding: '6px 10px', borderRadius: 8 }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <label style={{ color: '#6b7280' }}>of {totalItems} items</label>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className="page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>First</button>
                <button className="page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>Prev</button>

                {getPageButtons().map((p, idx) => {
                  if (p === 'left-ellipsis' || p === 'right-ellipsis') return (
                    <div key={p + idx} className="page-btn" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding: '8px 12px', borderRadius: 8, background: 'transparent', border: 'none', color: '#9aa4b2' }}>
                      <Icon name="dots" />
                    </div>
                  );
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      className={`page-btn ${isActive ? 'active' : ''}`}
                      onClick={() => goToPage(p)}
                      aria-current={isActive ? 'page' : undefined}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: isActive ? 'linear-gradient(90deg,#6c5ce7,#4f46e5)' : '#fff',
                        color: isActive ? '#fff' : '#111827',
                        border: isActive ? 'none' : '1px solid rgba(0,0,0,0.06)',
                        fontWeight: 600,
                      }}
                    >
                      {p}
                    </button>
                  );
                })}

                <button className="page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>Next</button>
                <button className="page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} style={{ padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>Last</button>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 8 }}>
                  <label style={{ color: '#6b7280' }}>Go to</label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => goToPage(Number(e.target.value))}
                    className="select"
                    style={{ width: 72, padding: '6px 8px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8, color: '#6b7280', textAlign: 'right' }}>
              Showing {device.length} of {totalItems} items — Page {currentPage} of {totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
