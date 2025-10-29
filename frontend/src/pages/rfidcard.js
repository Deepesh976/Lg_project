// src/pages/rfidcard.js
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

function Icon({ name, size = 16 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  if (name === 'chev-right') return (
    <svg {...common}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (name === 'chev-left') return (
    <svg {...common}><path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  );
  if (name === 'dots') return (
    <svg {...common}><path d="M12 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="currentColor"/></svg>
  );
  return null;
}

export default function RfidCard() {
  const navigate = useNavigate();

  // data state
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  // search + debounce
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef(null);

  // pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // UI hints
  const [showRightHint, setShowRightHint] = useState(false);

  // refs
  const containerRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef(null);

  // helpers: get ms timestamp from record (prefers snake_case then camelCase)
  const getRecordTime = useCallback((r) => {
    if (!r) return 0;
    const tryDate = (v) => {
      if (!v) return 0;
      const d = new Date(v);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return tryDate(r.last_seen) || tryDate(r.lastSeen) || tryDate(r.updatedAt) || tryDate(r.createdAt) || 0;
  }, []);

  // stable sort newest-first using getRecordTime
  const sortByLastSeen = useCallback((list) => {
    return [...list].sort((a, b) => {
      const ta = getRecordTime(a);
      const tb = getRecordTime(b);
      if (tb !== ta) return tb - ta;
      if (a && b && a._id && b._id) return String(a._id).localeCompare(String(b._id));
      return 0;
    });
  }, [getRecordTime]);

  // normalize id helper
  const normalizeId = useCallback((r) => String(r && (r.rfid_uid || r.rfidUid || r._id || "")).trim().toLowerCase(), []);

  // Upsert incoming record into state and filtered state; move to top and sort
  const upsertRecord = useCallback((incoming) => {
    if (!incoming) return;

    // Records state
    setRecords((prev = []) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      const idx = copy.findIndex((r) => {
        if (!r) return false;
        if (incoming._id && r._id && String(r._id) === String(incoming._id)) return true;
        if (incoming.rfid_uid && r.rfid_uid && String(r.rfid_uid) === String(incoming.rfid_uid)) return true;
        if (incoming.rfidUid && r.rfid_uid && String(r.rfid_uid) === String(incoming.rfidUid)) return true;
        return false;
      });
      if (idx !== -1) copy.splice(idx, 1);
      copy.unshift(incoming);
      return sortByLastSeen(copy);
    });

    // Filtered state
    setFilteredRecords((prev = []) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      const idx = copy.findIndex((r) => {
        if (!r) return false;
        if (incoming._id && r._id && String(r._id) === String(incoming._id)) return true;
        if (incoming.rfid_uid && r.rfid_uid && String(r.rfid_uid) === String(incoming.rfid_uid)) return true;
        if (incoming.rfidUid && r.rfid_uid && String(r.rfid_uid) === String(incoming.rfidUid)) return true;
        return false;
      });
      if (idx !== -1) copy.splice(idx, 1);
      // optional: only insert if it matches current search filter — but simpler to always insert
      copy.unshift(incoming);
      return sortByLastSeen(copy);
    });

    // move to first page to show the updated item
    setCurrentPage(1);
  }, [sortByLastSeen]);

  // Remove record by id
  const removeRecordById = useCallback((id) => {
    if (!id) return;
    setRecords((prev = []) => (prev || []).filter((r) => String(r._id) !== String(id)));
    setFilteredRecords((prev = []) => (prev || []).filter((r) => String(r._id) !== String(id)));
  }, []);

  // Initial + periodic fetch
  useEffect(() => {
    isMountedRef.current = true;
    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/rfid', { timeout: 15000 });
        let data = [];
        if (Array.isArray(res.data)) data = res.data;
        else if (Array.isArray(res.data.items)) data = res.data.items;
        else if (Array.isArray(res.data.data)) data = res.data.data;
        else if (Array.isArray(res.data.records)) data = res.data.records;
        else if (res.data && typeof res.data === 'object') {
          const arr = Object.values(res.data).find((v) => Array.isArray(v));
          data = arr || [];
        }
        const sorted = sortByLastSeen(data);
        if (isMountedRef.current) {
          setRecords(sorted);
          setFilteredRecords(sorted);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    // initial fetch
    fetchRecords();

    // poll every 15s (you can increase or remove if you have socket)
    pollIntervalRef.current = setInterval(fetchRecords, 15000);

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sortByLastSeen]);

  // Search with debounce (client-side filter)
  useEffect(() => {
    // apply immediate if empty query
    if (!searchQuery) {
      setFilteredRecords(sortByLastSeen(records));
      setCurrentPage(1);
      return;
    }

    const q = String(searchQuery || "").trim().toLowerCase();

    // debounce small CPU work (keeps typing smooth)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const filtered = (records || []).filter((r) => {
        if (!r) return false;
        const checks = [
          String(r.user_name ?? "").toLowerCase(),
          String(r.mobile_no ?? "").toLowerCase(),
          String(r.village ?? "").toLowerCase(),
          String(r.rfid_uid ?? "").toLowerCase(),
          String(r.rfid_serial_no ?? "").toLowerCase(),
          String(r.address ?? "").toLowerCase(),
          String(r.aadhar_no ?? "").toLowerCase(),
        ];
        return checks.some((f) => f.includes(q));
      });
      setFilteredRecords(sortByLastSeen(filtered));
      setCurrentPage(1);
    }, 220);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, records, sortByLastSeen]);

  // socket listeners for live upserts and deletes
  useEffect(() => {
    // try to pick socket from window (if you initialize socket elsewhere and attach to window.io)
    let socket = null;
    try {
      if (window && window.io) {
        // if window.io is a function (socket.io factory)
        if (typeof window.io === "function") socket = window.io();
        else socket = window.io;
      } else if (window && window.socket) {
        socket = window.socket;
      }
    } catch (e) {
      console.warn("Socket init error:", e);
      socket = null;
    }

    // If you don't have a global socket, attempt a connect of socket.io-client:
    // NOTE: uncomment following lines if you use socket.io-client and haven't created socket elsewhere.
    /*
    if (!socket) {
      try {
        // eslint-disable-next-line global-require
        const ioClient = require("socket.io-client");
        socket = ioClient(); // connects to same origin
      } catch (e) {
        socket = null;
      }
    }
    */

    if (!socket) return () => {};

    socketRef.current = socket;

    const onUpdate = (payload) => {
      if (!payload) return;
      // removed payload.deletedId
      if (payload.deletedId) {
        removeRecordById(payload.deletedId);
        return;
      }
      // normal path: record object in payload
      if (payload.record) {
        upsertRecord(payload.record);
        return;
      }
      // sometimes server emits rfidUid/lastSeen
      const uid = payload.rfid_uid || payload.rfidUid || payload.uid;
      if (uid) {
        // find matching record and update its lastSeen/last_seen, move to top
        setRecords((prev = []) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const idx = copy.findIndex((r) => r && (String(r.rfid_uid) === String(uid) || String(r.rfidUid) === String(uid) || String(r._id) === String(uid)));
          if (idx !== -1) {
            const item = { ...copy[idx], lastSeen: payload.lastSeen || payload.last_seen || new Date().toISOString(), last_seen: payload.lastSeen || payload.last_seen || new Date().toISOString() };
            copy.splice(idx, 1);
            copy.unshift(item);
            return sortByLastSeen(copy);
          }
          return prev;
        });
        setFilteredRecords((prev = []) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const idx = copy.findIndex((r) => r && (String(r.rfid_uid) === String(uid) || String(r.rfidUid) === String(uid) || String(r._id) === String(uid)));
          if (idx !== -1) {
            const item = { ...copy[idx], lastSeen: payload.lastSeen || payload.last_seen || new Date().toISOString(), last_seen: payload.lastSeen || payload.last_seen || new Date().toISOString() };
            copy.splice(idx, 1);
            copy.unshift(item);
            return sortByLastSeen(copy);
          }
          return prev;
        });
        setCurrentPage(1);
      }
    };

    const onDeleted = (payload) => {
      const id = payload && (payload.deletedId || payload._id);
      if (id) removeRecordById(id);
    };

    socket.on("rfid-record-updated", onUpdate);
    socket.on("rfid-record-deleted", onDeleted);

    return () => {
      try {
        socket.off("rfid-record-updated", onUpdate);
        socket.off("rfid-record-deleted", onDeleted);
      } catch (e) { /* ignore */ }
      socketRef.current = null;
    };
  }, [upsertRecord, removeRecordById, sortByLastSeen]);

  // helpers: download CSV
  const handleDownload = () => {
    if (!filteredRecords || filteredRecords.length === 0) { alert('No records to download!'); return; }
    const csvHeaders = [
      "S.No",
      "RFID Serial No",
      "RFID UID",
      "User Name",
      "Address",
      "Village",
      "Aadhar No",
      "Mobile No",
      "Family Members",
      "Water/Day (L)",
      "Water/Month (L)",
      "No of Times Visited",
      "Total Litres Consumed (L)",
      "Remaining Card Balance",
      "Remarks",
    ];
    const csvRows = [csvHeaders.join(",")];

    filteredRecords.forEach((r, i) => {
      const row = [
        i + 1,
        r.rfid_serial_no || "",
        r.rfid_uid || "",
        `"${(r.user_name || "").replace(/"/g, '""')}"`,
        `"${(r.address || "").replace(/"/g, '""')}"`,
        `"${(r.village || "").replace(/"/g, '""')}"`,
        r.aadhar_no || "",
        r.mobile_no || "",
        r.family_mems ?? "",
        r.quant_water_alloted_per_day ?? "",
        r.quant_water_alloted_per_month ?? "",
        r.swipe_count ?? "",
        r.total_litres_consumed ?? "",
        r.remaining_card_balance ?? "",
        `"${(r.remarks || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "RFID_Users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // edit / delete / view history handlers
  const handleEditNavigate = (rec) => navigate(`/editrfidcard/${rec._id}`, { state: rec });

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      setLoading(true);
      await axios.delete(`/api/rfid/${id}`);
      removeRecordById(id);
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (rec) => {
    const uid = rec && rec.rfid_uid && String(rec.rfid_uid).trim() !== '' ? rec.rfid_uid : rec._id;
    navigate(`/rfidhistory/${encodeURIComponent(uid)}`, { state: { record: rec } });
  };

  // search input handler (updates searchQuery with debounce)
  const onSearchInput = (e) => {
    const v = e.target.value;
    // immediate UI feedback: set the input string (but filtering is debounced in effect above)
    setSearchQuery(v);
  };

  // scroll hint utils
  const atRightEdge = (w) => w.scrollLeft + w.clientWidth >= w.scrollWidth - 8;
  const isOverflowing = (w) => w.scrollWidth > w.clientWidth + 2;

  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    const evaluateHint = () => {
      if (!isOverflowing(wrapper)) { setShowRightHint(false); return; }
      if (atRightEdge(wrapper)) setShowRightHint(false); else setShowRightHint(true);
    };

    evaluateHint();
    const onScroll = () => evaluateHint();
    const onResize = () => evaluateHint();

    wrapper.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      wrapper.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [filteredRecords]);

  const scrollToEndAndToggle = () => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;
    wrapper.scrollTo({ left: wrapper.scrollWidth, behavior: "smooth" });
    setTimeout(() => setShowRightHint(false), 420);
  };
  const onHintKeyDown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scrollToEndAndToggle(); } };

  // pagination calculations (client-side)
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const goToPage = (p) => {
    const page = Math.max(1, Math.min(totalPages, Number(p) || 1));
    setCurrentPage(page);
    if (tableWrapperRef.current) tableWrapperRef.current.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  };
  const handlePageSizeChange = (e) => { const newSize = Number(e.target.value) || 10; setPageSize(newSize); setCurrentPage(1); };

  const getPageButtons = () => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const windowSize = 5; const half = Math.floor(windowSize / 2);
    let start = Math.max(2, currentPage - half);
    let end = Math.min(totalPages - 1, currentPage + half);
    if (currentPage <= half + 1) { start = 2; end = 2 + windowSize - 1; }
    if (currentPage >= totalPages - (half + 1)) { start = totalPages - (windowSize); end = totalPages - 1; }
    const buttons = [1];
    if (start > 2) buttons.push('left-ellipsis');
    for (let i = start; i <= end; i++) buttons.push(i);
    if (end < totalPages - 1) buttons.push('right-ellipsis');
    buttons.push(totalPages);
    return buttons;
  };

  const columns = [
    "S.No",
    "RFID Serial No",
    "RFID UID",
    "User Name",
    "Address",
    "Village",
    "Aadhar No",
    "Mobile No",
    "Family Members",
    "Water/Day (L)",
    "Water/Month (L)",
    "No of Times Visited",
    "Total Litres Consumed (L)",
    "Remaining Card Balance",
    "Remarks",
    "Action",
  ];

  const css = `
    .hint-overlay { position: relative; }
    .rfid-hint {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(20,20,40,0.92), rgba(40,40,80,0.85));
      color: #fff;
      font-weight: 700;
      font-size: 14px;
      box-shadow: 0 10px 30px rgba(12,16,30,0.18);
      z-index: 40;
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.45s ease, transform 0.35s ease;
    }
    .rfid-hint.hidden { opacity: 0; transform: translate(48px, -50%); pointer-events: none; }
    .rfid-hint .chev {
      width: 22px; height: 22px; display:inline-flex; align-items:center; justify-content:center;
      background: rgba(255,255,255,0.12); border-radius: 8px;
    }
    @keyframes arrowPulseRight {
      0% { transform: translateX(0); opacity: 0.75; }
      50% { transform: translateX(6px); opacity: 1; }
      100% { transform: translateX(0); opacity: 0.75; }
    }
    .arrow-right { animation: arrowPulseRight 1.2s infinite; }
    .table-empty { text-align: center; padding: 24px 0; color: #666; }
    .data-table { border-collapse: collapse; width: 100%; }
    .data-table th {
      background: linear-gradient(90deg, #5C67BC);
      color: #fff; text-align: left; font-weight: 700;
      border-bottom: 2px solid rgba(0,0,0,0.08);
      padding: 12px 14px; white-space: nowrap;
    }
    .data-table td { padding: 12px 14px; border-bottom: 1px solid #eee; background: #fff; white-space: nowrap; }
    .data-table tr:hover td { background: rgba(142, 36, 170, 0.04); }
    .action-buttons { display: flex; gap: 8px; align-items: center; }
    .pagination-controls { display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-top:12px; }
    .page-btn { background:#fff; border:1px solid #e6eef8; padding:8px 10px; border-radius:8px; cursor:pointer; min-width:44px; text-align:center; }
    .page-btn.active { background:linear-gradient(90deg,#6366f1,#3b82f6); color:#fff; border:0; }
    .select { padding:8px 10px; border-radius:8px; border:1px solid #e6eef8; }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="page-wrapper" style={{ padding: 6 }}>
        <div className="page-container" style={{ padding: 6 }}>
          <div className="card-panel" style={{ borderRadius: 10, boxShadow: "none" }}>
            <div
              className="page-header"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
              }}
            >
              <div className="header-left" style={{ flex: 1 }}>
                <input
                  className="search-input"
                  placeholder="🔍 Search by name, mobile, village, RFID UID or Serial No..."
                  value={searchQuery}
                  onChange={onSearchInput}
                  style={{
                    width: "86%",
                    maxWidth: "600px",
                    minWidth: "220px",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e3e3e3",
                  }}
                />
              </div>
              <div
                className="header-center"
                style={{ flex: 1, textAlign: "center" }}
              >
                <h2 className="page-title" style={{ margin: 0 }}>
                  Registered Users
                </h2>
              </div>
              <div
                className="header-right"
                style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}
              >
                <button
                  className="btn btn-primary btn-small"
                  onClick={handleDownload}
                  disabled={loading}
                  style={{ padding: "8px 12px", borderRadius: 8 }}
                >
                  <i className="fas fa-download" aria-hidden></i>&nbsp;Download CSV
                </button>
              </div>
            </div>

            <div ref={containerRef} className="hint-overlay" style={{ marginTop: 12 }}>
              <div
                className="table-wrapper"
                ref={tableWrapperRef}
                style={{
                  position: "relative",
                  overflowX: "auto",
                  borderRadius: 10,
                  border: "1px solid #e1e1e1",
                  width: "100%",
                  padding: 0,
                }}
              >
                {/* ORIGINAL TABLE: kept unchanged as requested */}
                <table className="data-table" style={{ minWidth: 1200 }}>
                  <thead>
                    <tr>
                      {columns.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!paginatedRecords || paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="table-empty">
                          {loading ? "Loading records..." : "No records found"}
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r, i) => (
                        <tr key={r._id || i}>
                          <td>{(currentPage - 1) * pageSize + i + 1}</td>
                          <td>{r.rfid_serial_no || "—"}</td>
                          <td>
                            <button
                              className="btn-link"
                              onClick={() => handleViewHistory(r)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#1a73e8",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {r.rfid_uid || "—"}
                            </button>
                          </td>
                          <td>{r.user_name || "—"}</td>
                          <td>{r.address || "—"}</td>
                          <td>{r.village || "—"}</td>
                          <td>{r.aadhar_no || "—"}</td>
                          <td>{r.mobile_no || "—"}</td>
                          <td>{r.family_mems ?? "—"}</td>
                          <td>{r.quant_water_alloted_per_day ?? "—"}</td>
                          <td>{r.quant_water_alloted_per_month ?? "—"}</td>
                          <td>{r.swipe_count ?? "—"}</td>
                          <td>{r.total_litres_consumed ?? "—"}</td>
                          <td>{r.remaining_card_balance ?? "—"}</td>
                          <td>{r.remarks || "—"}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn btn-success btn-small"
                                onClick={() => handleEditNavigate(r)}
                                disabled={loading}
                                style={{ padding: "6px 8px", borderRadius: 6 }}
                              >
                                <i className="fas fa-edit"></i>&nbsp;Edit
                              </button>
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => handleDelete(r._id)}
                                disabled={loading}
                                style={{ padding: "6px 8px", borderRadius: 6 }}
                              >
                                <i className="fas fa-trash"></i>&nbsp;Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                role="button"
                tabIndex={0}
                className={`rfid-hint ${showRightHint ? "" : "hidden"}`}
                onClick={scrollToEndAndToggle}
                onKeyDown={onHintKeyDown}
                aria-label="Swipe right to see more columns"
              >
                <span>Swipe right</span>
                <div className="chev arrow-right" aria-hidden>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              {/* MODERN PAGINATION UI (table untouched) */}
              <div className="pagination-controls">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ color: '#6b7280' }}>Show</label>
                  <select value={pageSize} onChange={handlePageSizeChange} className="select">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label style={{ color: '#6b7280' }}>of {totalItems} items</label>
                </div>

                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}>First</button>
                  <button className="page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>Prev</button>

                  {getPageButtons().map((p, idx) => {
                    if (p === 'left-ellipsis' || p === 'right-ellipsis') return (<div key={p + idx} className="page-btn" style={{ display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="dots" /></div>);
                    const isActive = p === currentPage;
                    return (
                      <button key={p} className={`page-btn ${isActive ? 'active' : ''}`} onClick={() => goToPage(p)} aria-current={isActive ? 'page' : undefined}>{p}</button>
                    );
                  })}

                  <button className="page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>
                  <button className="page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}>Last</button>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ color: '#6b7280' }}>Go to</label>
                    <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => goToPage(e.target.value)} className="select" style={{ width:72 }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
