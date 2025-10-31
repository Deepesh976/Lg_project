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

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showRightHint, setShowRightHint] = useState(false);

  const containerRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const socketRef = useRef(null);
  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef(null);

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterFrom, setFilterFrom] = useState(""); // yyyy-mm-dd
  const [filterTo, setFilterTo] = useState("");   // yyyy-mm-dd
  const [activeDateFilter, setActiveDateFilter] = useState(null); // { fromTs, toTs } or null

  // Active Cards popup state
  const [showActivePopup, setShowActivePopup] = useState(false);
  const [activeCards, setActiveCards] = useState([]); // array of { rfid_uid }

  const getRecordTime = useCallback((r) => {
    if (!r) return 0;
    const tryDate = (v) => {
      if (!v) return 0;
      const d = new Date(v);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };
    return tryDate(r.last_seen) || tryDate(r.lastSeen) || tryDate(r.updatedAt) || tryDate(r.createdAt) || 0;
  }, []);

  const sortByLastSeen = useCallback((list) => {
    return [...list].sort((a, b) => {
      const ta = getRecordTime(a);
      const tb = getRecordTime(b);
      if (tb !== ta) return tb - ta;
      if (a && b && a._id && b._id) return String(a._id).localeCompare(String(b._id));
      return 0;
    });
  }, [getRecordTime]);

  // central function to compute filteredRecords based on search + date filter
  const computeFiltered = useCallback((sourceRecords, searchQ, dateFilter) => {
    let arr = Array.isArray(sourceRecords) ? sourceRecords.slice() : [];
    // apply search if present
    const q = String(searchQ || "").trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) => {
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
    }

    // apply date filter if present
    if (dateFilter && typeof dateFilter.fromTs === "number" && typeof dateFilter.toTs === "number") {
      arr = arr.filter((r) => {
        const t = getRecordTime(r);
        return t >= dateFilter.fromTs && t <= dateFilter.toTs;
      });
    }

    return sortByLastSeen(arr);
  }, [getRecordTime, sortByLastSeen]);

  const upsertRecord = useCallback((incoming) => {
    if (!incoming) return;
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

    // recompute filteredRecords from updated records + current search & date filter
    setFilteredRecords((prev = []) => {
      const newRecords = (() => {
        const p = Array.isArray(records) ? [...records] : [];
        // merge incoming into records copy
        const idx = p.findIndex((r) => r && ((incoming._id && r._id && String(r._id) === String(incoming._id)) || (incoming.rfid_uid && r.rfid_uid && String(r.rfid_uid) === String(incoming.rfid_uid))));
        if (idx !== -1) p.splice(idx, 1);
        p.unshift(incoming);
        return p;
      })();
      return computeFiltered(newRecords, searchQuery, activeDateFilter);
    });

    setCurrentPage(1);
  }, [sortByLastSeen, computeFiltered, records, searchQuery, activeDateFilter]);

  const removeRecordById = useCallback((id) => {
    if (!id) return;
    setRecords((prev = []) => (prev || []).filter((r) => String(r._id) !== String(id)));
    setFilteredRecords((prev = []) => (prev || []).filter((r) => String(r._id) !== String(id)));
  }, []);

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
          // compute filteredRecords using current search & date filters
          setFilteredRecords(computeFiltered(sorted, searchQuery, activeDateFilter));
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    fetchRecords();
    pollIntervalRef.current = setInterval(fetchRecords, 15000);

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [sortByLastSeen, computeFiltered, searchQuery, activeDateFilter]);

  // update filteredRecords when searchQuery, records, or activeDateFilter change
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilteredRecords(computeFiltered(records, searchQuery, activeDateFilter));
      setCurrentPage(1);
    }, 180);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, records, computeFiltered, activeDateFilter]);

  useEffect(() => {
    let socket = null;
    try {
      if (window && window.io) {
        if (typeof window.io === "function") socket = window.io();
        else socket = window.io;
      } else if (window && window.socket) {
        socket = window.socket;
      }
    } catch (e) {
      console.warn("Socket init error:", e);
      socket = null;
    }

    if (!socket) return () => {};

    socketRef.current = socket;

    const onUpdate = (payload) => {
      if (!payload) return;
      if (payload.deletedId) {
        removeRecordById(payload.deletedId);
        return;
      }
      if (payload.record) {
        upsertRecord(payload.record);
        return;
      }
      const uid = payload.rfid_uid || payload.rfidUid || payload.uid;
      if (uid) {
        setRecords((prev = []) => {
          const copy = Array.isArray(prev) ? [...prev] : [];
          const idx = copy.findIndex((r) => r && (String(r.rfid_uid) === String(uid) || String(r.rfidUid) === String(uid) || String(r._id) === String(uid)));
          if (idx !== -1) {
            const item = { ...copy[idx], lastSeen: payload.lastSeen || payload.last_seen || new Date().toISOString(), last_seen: payload.lastSeen || payload.last_seen || new Date().toISOString() };
            copy.splice(idx, 1);
            copy.unshift(item);
            // also recompute filteredRecords based on updated records
            setFilteredRecords(computeFiltered(copy, searchQuery, activeDateFilter));
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
  }, [upsertRecord, removeRecordById, sortByLastSeen, computeFiltered, searchQuery, activeDateFilter]);

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

  // keep RFID non-clickable as requested for history view replaced by click behavior
  const onSearchInput = (e) => { setSearchQuery(e.target.value); };

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

  // Apply date filter from modal inputs. Uses inclusive date range.
  const applyDateFilterFromInputs = async () => {
    if (!filterFrom && !filterTo) {
      setActiveDateFilter(null);
      setShowFilterModal(false);
      return;
    }

    // compute timestamps
    const fromTs = filterFrom ? new Date(filterFrom + "T00:00:00").getTime() : -8640000000000000; // very small
    // include full 'to' day until 23:59:59.999
    const toTs = filterTo ? new Date(filterTo + "T23:59:59.999").getTime() : 8640000000000000; // very large

    // set active filter locally
    setActiveDateFilter({ fromTs, toTs });
    setFilteredRecords(computeFiltered(records, searchQuery, { fromTs, toTs }));
    setCurrentPage(1);

    // Fetch active cards from backend aggregation endpoint (controller should implement /api/rfid/active)
    try {
      setLoading(true);
      const res = await axios.get('/api/rfid/active', { params: { from: filterFrom, to: filterTo }, timeout: 20000 });
      const data = Array.isArray(res.data) ? res.data : (res.data.data || res.data.items || res.data.active || []);
      // Expecting array of objects like [{ rfid_uid: 'ABC123' }, ...]
      setActiveCards(data || []);
      setShowActivePopup(true);
    } catch (err) {
      console.warn('active fetch failed', err && err.message ? err.message : err);
      // fallback: derive active cards from client-side records using date filter (unique uids)
      const uids = {};
      (records || []).forEach((r) => {
        const t = getRecordTime(r);
        if (t >= fromTs && t <= toTs) uids[String(r.rfid_uid || '')] = true;
      });
      const arr = Object.keys(uids).filter(Boolean).map((u) => ({ rfid_uid: u }));
      setActiveCards(arr);
      setShowActivePopup(true);
    } finally {
      setLoading(false);
      setShowFilterModal(false);
    }
  };

  const clearDateFilter = () => {
    setFilterFrom("");
    setFilterTo("");
    setActiveDateFilter(null);
    setFilteredRecords(computeFiltered(records, searchQuery, null));
    setCurrentPage(1);
    setShowFilterModal(false);
  };

  const css = `
    .hint-overlay { position: relative; }
    .rfid-hint {
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-70%);
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(20,20,40,0.92), rgba(40,40,80,0.85));
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      box-shadow: 0 8px 20px rgba(12,16,30,0.08);
      z-index: 40;
      cursor: pointer;
    }
    .rfid-hint.hidden { opacity: 0; transform: translate(48px, -50%); pointer-events: none; }
    @keyframes arrowPulseRight { 0% { transform: translateX(0); opacity: 0.8 } 50% { transform: translateX(6px); opacity: 1 } 100% { transform: translateX(0); opacity: 0.8 } }
    .arrow-right { animation: arrowPulseRight 1.2s infinite; }
    .table-empty { text-align: center; padding: 18px 0; color: #666; }

    /* wrapper (outer white card unchanged) */
    .table-wrapper {
      -webkit-overflow-scrolling: touch;
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #e8e8e8;
      background: #fff;
      padding: 0;
    }

    /* small left-shift inside wrapper so Action column is visible */
    .data-table {
      border-collapse: collapse;
      width: calc(100% + 8px);
      table-layout: fixed;
      margin: 0;
      transform: translateX(-7px);
    }

    /* header style: small and clearer */
    .data-table th {
      background: linear-gradient(90deg, #5C67BC);
      color: #fff;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      padding: 6px 8px;
      white-space: normal;
      font-size: 9px;
      letter-spacing: 0.2px;
    }

    /* compact cell text (smaller inner data) */
    .data-table td {
      padding: 6px 6px;
      border-bottom: 1px solid #f2f2f2;
      background: #fff;
      white-space: normal;
      word-break: break-word;
      font-size: 10px;
      color: #333;
      vertical-align: middle;
    }

    .data-table td { font-size: 9.5px; } /* inner data smaller as requested */

    .data-table th:first-child,
    .data-table td:first-child {
      padding-left: 8px;   /* nudged right */
      padding-right: 8px;
      text-align: right;   /* S.No right-aligned */
      width: 42px;
      max-width: 42px;
      font-size: 10px;
    }
    .col-sno-td { padding-top: 12px; padding-bottom: 12px; }

    .data-table tr:hover td { background: rgba(142, 36, 170, 0.02); }

    .truncate { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .col-uid { max-width: 140px; }
    .col-serial { max-width: 100px; }
    .col-name { max-width: 140px; }
    .col-mobile { max-width: 100px; }
    .col-family { max-width: 70px; }

    /* ACTION column: shift left inside table and align buttons to left */
    .data-table th:last-child,
    .data-table td:last-child {
      padding-left: 8px;
      padding-right: 16px;
      width: 72px;
      max-width: 72px;
    }
    .action-buttons { display: flex; gap: 6px; align-items: center; justify-content: flex-start; /* left aligned */ }
    .action-buttons .btn { display: inline-flex; align-items:center; justify-content:center; width:34px; height:34px; padding:0; border-radius:8px; }
    .action-buttons .btn i { margin:0; font-size:14px; }

    /* left-align the multi-line numeric headers and nudge left */
    th.col-waterday .th-split,
    th.col-watermonth .th-split,
    th.col-totallitres .th-split,
    th.col-remaining .th-split,
    th:nth-child(12) .th-split {
      text-align: left;
      padding-left: 8px;
      transform: translateX(-20px);
      display: inline-block;
    }

    td.col-waterday, td.col-watermonth, td.col-totallitres, td.col-remaining, td.col-family, td.col-mobile {
      text-align: center;
    }

    .th-split { display:block; line-height:1.02; text-align:center; }
    .th-split .top { display:block; font-weight:800; font-size:9px; }
    .th-split .bottom { display:block; font-weight:700; font-size:8px; opacity:0.95; }

    th.col-waterday .th-split { text-align:left; }
    th.col-watermonth .th-split { text-align:left; }
    th.col-totallitres .th-split { text-align:left; }
    th.col-remaining .th-split { text-align:left; }
    th:nth-child(12) .th-split { text-align:left; }

    /* modern filter button - visible */
    .filter-btn {
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:10px;
      border: 1px solid rgba(59,130,246,0.18);
      background: linear-gradient(90deg,#e6f0ff,#dbe9ff);
      color: #0b2b62;
      box-shadow: 0 6px 18px rgba(59,130,246,0.12), inset 0 1px 0 rgba(255,255,255,0.6);
      cursor:pointer;
      font-weight:700;
      font-size:13px;
      transition: transform .08s ease, box-shadow .12s ease;
    }
    .filter-btn:active { transform: translateY(1px) scale(0.998); }
    .filter-btn:focus { outline: 2px solid rgba(59,130,246,0.22); outline-offset: 2px; }

    /* Overlay dims the background but does NOT blur it */
    .filter-modal-overlay {
      position: fixed;
      inset: 0;
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:1000;
      background: rgba(10,12,20,0.36); /* dark translucent dim */
      animation: fadeIn .12s ease;
      -webkit-tap-highlight-color: transparent;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    /* Modal: white modern card (no blur inside) */
    .filter-modal {
      width: 440px;
      max-width: calc(100% - 32px);
      border-radius: 12px;
      padding: 20px;
      background: #ffffff;
      color: #0b1b2b;
      border: 1px solid rgba(20,28,40,0.06);
      box-shadow: 0 18px 40px rgba(9,30,66,0.16);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      transform: translateY(40px);
    }

    .filter-modal h3 { margin:0 0 6px 0; font-size:18px; color:#0b1b2b; font-weight:800; }
    .filter-modal .sub { font-size:13px; color:#4b5563; margin-bottom:12px; }

    .filter-row { display:flex; gap:12px; margin: 8px 0 14px 0; align-items:center; }
    .filter-row label { display:block; font-size:13px; color:#374151; width:70px; }
    .filter-row input[type="date"] {
      flex:1;
      padding:10px 12px;
      border-radius:8px;
      border:1px solid rgba(15,23,42,0.06);
      background: #fff;
      color: #0b1b2b;
      font-size:14px;
      box-shadow: inset 0 1px 0 rgba(16,24,40,0.02);
    }

    .filter-actions { display:flex; justify-content: flex-end; gap:10px; margin-top: 8px; }
    .btn-ghost {
      padding:8px 12px;
      border-radius:10px;
      background: transparent;
      color: #374151;
      border:1px solid rgba(15,23,42,0.04);
      cursor:pointer;
      font-weight:700;
    }
    .btn-primary {
      padding:8px 14px;
      border-radius:10px;
      background: linear-gradient(90deg,#6366f1,#3b82f6);
      color:#fff;
      border: none;
      cursor:pointer;
      font-weight:800;
    }

    .active-filter-pill {
      display:inline-block;
      margin-left:8px;
      padding:6px 10px;
      border-radius:999px;
      font-size:12px;
      background: linear-gradient(90deg, rgba(99,102,241,0.12), rgba(59,130,246,0.06));
      color:#0b1b2b;
      border:1px solid rgba(99,102,241,0.12);
    }

    /* Active popup overlay & card grid */
    .active-popup-overlay {
      position: fixed;
      inset: 0;
      display:flex;
      align-items:flex-start; /* slightly lower (not centered) */
      justify-content:center;
      padding-top: 60px; /* push popup down */
      z-index:1100;
      background: rgba(10,12,20,0.36);
    }
    .active-popup {
      width: 520px;
      max-width: calc(100% - 32px);
      border-radius: 12px;
      padding: 18px;
      background: #ffffff;
      color: #0b1b2b;
      border: 1px solid rgba(20,28,40,0.06);
      box-shadow: 0 18px 40px rgba(9,30,66,0.16);
      transform: translateY(20px);
    }
    .active-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(120px,1fr));
      gap:12px;
      margin-top:12px;
      max-height:360px;
      overflow:auto;
      padding:6px;
    }
    .uid-card {
      display:flex;align-items:center;justify-content:center;
      padding:12px 10px;
      border-radius:10px;
      background:linear-gradient(180deg,#fff,#f8f9ff);
      border:1px solid rgba(11,27,43,0.05);
      box-shadow:0 6px 18px rgba(12,20,60,0.06);
      font-weight:700;color:#2563eb;font-size:13px;
      cursor:pointer;
      transition:transform .1s, box-shadow .1s;
      text-align:center;
    }
    .uid-card:hover{transform:translateY(-4px);box-shadow:0 12px 25px rgba(12,20,60,0.1);}
    .btn-close {
      padding:10px 16px;
      border-radius:10px;
      border:none;
      background: linear-gradient(90deg,#111827,#374151);
      color:white;
      font-weight:800;
      cursor:pointer;
    }

    .pagination-controls { display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-top:12px; flex-wrap:wrap; }
    .page-btn { background:#fff; border:1px solid #e6eef8; padding:6px 8px; border-radius:8px; cursor:pointer; min-width:36px; text-align:center; font-size:12px; }
    .page-btn.active { background:linear-gradient(90deg,#6366f1,#3b82f6); color:#fff; border:0; }
    .select { padding:6px 8px; border-radius:8px; border:1px solid #e6eef8; font-size:12px; }

    @media (max-width: 1100px) {
      .col-address, .col-village, .col-remarks, .col-watermonth, .col-totallitres, .col-family { display: none; }
      .data-table { transform: translateX(0); width:100%; }
    }
    @media (max-width: 760px) {
      .data-table th { font-size: 9px; padding: 5px 6px; }
      .data-table td { padding: 6px 6px; font-size: 9px; }
      .truncate { max-width: 90px; }
      .col-uid { max-width: 100px; }
      .col-serial { max-width: 80px; }
      .col-mobile { max-width: 100px; }
      .data-table { transform: translateX(0); width:100%; }
      .filter-modal { width: 92%; padding: 14px; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="page-wrapper" style={{ padding: "6px 6px 6px 0px" }}>
        <div className="page-container" style={{ padding: "6px 6px 6px 0px" }}>
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
                style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}
              >
                <button
                  className="filter-btn"
                  onClick={() => setShowFilterModal(true)}
                  title="Filter records"
                >
                  <i className="fas fa-filter" style={{ fontSize: 13 }} aria-hidden />
                  Filter
                </button>

                {activeDateFilter ? (
                  <span className="active-filter-pill" title="Active date filter">Date filter</span>
                ) : null}

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
                <table className="data-table" style={{}}>
                  <thead>
                    <tr>
                      <th className="col-sno"><div className="th-split"><span className="top"></span></div></th>
                      <th className="col-serial"><div className="th-split"><span className="top">RFID</span><span className="bottom">Serial No</span></div></th>
                      <th className="col-uid"><div className="th-split"><span className="top">RFID</span><span className="bottom">UID</span></div></th>
                      <th className="col-name"><div className="th-split"><span className="top">User</span><span className="bottom">Name</span></div></th>
                      <th className="col-address"><div className="th-split"><span className="top">Address</span></div></th>
                      <th className="col-village"><div className="th-split"><span className="top">Village</span></div></th>
                      <th><div className="th-split"><span className="top">Aadhar</span><span className="bottom">No</span></div></th>
                      <th className="col-mobile"><div className="th-split"><span className="top">Mobile</span><span className="bottom">No</span></div></th>
                      <th className="col-family"><div className="th-split"><span className="top">Family</span><span className="bottom">Members</span></div></th>

                      <th className="col-waterday"><div className="th-split"><span className="top">Water/Day</span><span className="bottom">(L)</span></div></th>
                      <th className="col-watermonth"><div className="th-split"><span className="top">Water/Month</span><span className="bottom">(L)</span></div></th>

                      <th><div className="th-split"><span className="top">No of Times</span><span className="bottom">Visited</span></div></th>

                      <th className="col-totallitres"><div className="th-split"><span className="top">Total Litres</span><span className="bottom">Consumed (L)</span></div></th>
                      <th className="col-remaining"><div className="th-split"><span className="top">Remaining</span><span className="bottom">Card Balance</span></div></th>
                      <th className="col-remarks"><div className="th-split"><span className="top">Remarks</span></div></th>
                      <th><div className="th-split"><span className="top"></span></div></th>
                    </tr>
                  </thead>
                  <tbody>
{!paginatedRecords || paginatedRecords.length === 0 ? (
  <tr>
    <td
      colSpan={columns.length}
      className="table-empty"
      style={{
        textAlign: "center",
        padding: "30px 0",
        color: "#555",
        fontWeight: 600,
        fontSize: "14px",
        background: "#fafafa",
      }}
    >
      {loading ? "Loading records..." : "No records found"}
    </td>
  </tr>
) : (

                      paginatedRecords.map((r, i) => (
                        <tr key={r._id || i}>
                          <td className="col-sno-td">{(currentPage - 1) * pageSize + i + 1}</td>
                          <td className="truncate col-serial">{r.rfid_serial_no || "—"}</td>

                          <td className="truncate col-uid">
                            {r.rfid_uid ? (
                              <span
                                style={{
                                  color: "#2563eb",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  textDecoration: "underline",
                                }}
                                title="View history"
                                onClick={() => navigate(`/rfidhistory/${r.rfid_uid}`)}
                              >
                                {r.rfid_uid}
                              </span>
                            ) : "—"}
                          </td>

                          <td className="truncate col-name">{r.user_name || "—"}</td>
                          <td className="truncate col-address">{r.address || "—"}</td>
                          <td className="truncate col-village">{r.village || "—"}</td>
                          <td className="truncate">{r.aadhar_no || "—"}</td>
                          <td className="truncate col-mobile">{r.mobile_no || "—"}</td>
                          <td className="truncate col-family">{r.family_mems ?? "—"}</td>

                          <td className="truncate col-waterday">{r.quant_water_alloted_per_day ?? "—"}</td>
                          <td className="truncate col-watermonth">{r.quant_water_alloted_per_month ?? "—"}</td>

                          <td className="truncate">{r.swipe_count ?? "—"}</td>

                          <td className="truncate col-totallitres">{r.total_litres_consumed ?? "—"}</td>
                          <td className="truncate col-remaining">{r.remaining_card_balance ?? "—"}</td>
                          <td className="truncate col-remarks">{r.remarks || "—"}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn btn-success"
                                onClick={() => handleEditNavigate(r)}
                                disabled={loading}
                                title="Edit"
                                style={{ background: "#2bb673", border: "none", color: "#fff" }}
                              >
                                <i className="fas fa-edit" />
                              </button>

                              <button
                                className="btn btn-danger"
                                onClick={() => handleDelete(r._id)}
                                disabled={loading}
                                title="Delete"
                                style={{ background: "#ef6970", border: "none", color: "#fff" }}
                              >
                                <i className="fas fa-trash" />
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
                <span style={{ fontSize: 13 }}>Swipe right</span>
                <div className="chev arrow-right" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 6l6 6-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              <div className="pagination-controls">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ color: '#6b7280', fontSize: 12 }}>Show</label>
                  <select value={pageSize} onChange={handlePageSizeChange} className="select">
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <label style={{ color: '#6b7280', fontSize: 12 }}>of {totalItems} items</label>
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
                    <label style={{ color: '#6b7280', fontSize: 12 }}>Go to</label>
                    <input type="number" min={1} max={totalPages} value={currentPage} onChange={(e) => goToPage(e.target.value)} className="select" style={{ width:72 }} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)} role="presentation">
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Filter Records</h3>
            <div className="sub">Filter records by date range</div>

            <div className="filter-row">
              <label>From</label>
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
            </div>

            <div className="filter-row">
              <label>To</label>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
            </div>

            <div className="filter-actions">
              <button className="btn-ghost" onClick={clearDateFilter}>Clear</button>
              <button className="btn-primary" onClick={applyDateFilterFromInputs}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Active Cards Popup */}
      {showActivePopup && (
        <div className="active-popup-overlay" onClick={() => setShowActivePopup(false)} role="presentation">
          <div className="active-popup" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center' }}>Active Cards : {activeCards.length}</h3>

            <div className="active-grid">
              {activeCards.length ? (
                activeCards.map((c, idx) => (
                  <div
                    key={idx}
                    className="uid-card"
                    onClick={() => { if (c && c.rfid_uid) navigate(`/rfidhistory/${c.rfid_uid}`); }}
                    title={c && c.rfid_uid ? `View history for ${c.rfid_uid}` : ''}
                  >
                    {c && c.rfid_uid ? c.rfid_uid : '—'}
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", gridColumn: "1/-1" }}>No Active Cards</div>
              )}
            </div>

            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button className="btn-close" onClick={() => setShowActivePopup(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
