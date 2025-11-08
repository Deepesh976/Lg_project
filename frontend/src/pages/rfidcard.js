// src/pages/rfidcard.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  const recordsRef = useRef([]);
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

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [activeDateFilter, setActiveDateFilter] = useState(null);

  const [showActivePopup, setShowActivePopup] = useState(false);
  const [activeCards, setActiveCards] = useState([]);

  const [externalFilterActive, setExternalFilterActive] = useState(false);

  const externalApiBase = "https://lgatw.aplp.site/api/v2/atw/stream/active/fetch";

  const pad2 = (n) => (n < 10 ? "0" + n : String(n));

  const formatDateYYYYMMDD_UTC = useCallback((ms) => {
    if (ms === null || ms === undefined) return "";
    const d = new Date(Number(ms));
    if (isNaN(d.getTime())) return "";
    const yyyy = d.getUTCFullYear();
    const mm = pad2(d.getUTCMonth() + 1);
    const dd = pad2(d.getUTCDate());
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const parseYMDtoUTCStart = useCallback((ymd) => {
    if (!ymd) return null;
    const parts = String(ymd).split("-");
    if (parts.length !== 3) return null;
    const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  }, []);
  const parseYMDtoUTCEnd = useCallback((ymd) => {
    if (!ymd) return null;
    const parts = String(ymd).split("-");
    if (parts.length !== 3) return null;
    const y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (!y || !m || !d) return null;
    return Date.UTC(y, m - 1, d, 23, 59, 59, 999);
  }, []);

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

  const computeFiltered = useCallback((sourceRecords, searchQ, dateFilter) => {
    let arr = Array.isArray(sourceRecords) ? sourceRecords.slice() : [];
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

    if (!externalFilterActive && dateFilter && typeof dateFilter.fromTs === "number" && typeof dateFilter.toTs === "number") {
      arr = arr.filter((r) => {
        const t = getRecordTime(r);
        return t >= dateFilter.fromTs && t <= dateFilter.toTs;
      });
    }

    return sortByLastSeen(arr);
  }, [externalFilterActive, getRecordTime, sortByLastSeen]);

  const normalizeUid = useCallback((raw) => {
    if (!raw && raw !== 0) return "";
    try {
      return String(raw).trim().toUpperCase();
    } catch (e) { return String(raw || "").trim().toUpperCase(); }
  }, []);

  const recordHasActivity = useCallback((r) => {
    if (!r) return false;
    const t = getRecordTime(r);
    if (t && t > 0) return true;
    const sc = Number(r.swipe_count || r.swipes || r.swipes_in_range || 0);
    if (!Number.isNaN(sc) && sc > 0) return true;
    const tl = Number(r.total_litres_consumed || r.totalLitresConsumed || 0);
    if (!Number.isNaN(tl) && tl > 0) return true;
    const fl = Number(r.filtered_litres ?? r.filteredLitres ?? r.litres_consumed ?? r.litresConsumed ?? r.litres ?? 0);
    if (!Number.isNaN(fl) && fl > 0) return true;
    const fs = Number(r.filtered_swipes ?? r.filteredSwipes ?? r.visited_times ?? r.visitedTimes ?? r.swipes ?? 0);
    if (!Number.isNaN(fs) && fs > 0) return true;
    return false;
  }, [getRecordTime]);

  const normalizeIncomingRecord = useCallback((rec, isFilteredView) => {
    if (!rec || typeof rec !== "object") return rec;
    const normalized = { ...rec };

    const litresAvailable =
      normalized.litres_consumed ??
      normalized.litresConsumed ??
      normalized.filtered_litres ??
      normalized.filteredLitres ??
      normalized.litres ??
      normalized.total_litres_consumed ??
      null;

    const swipesAvailable =
      normalized.visited_times ??
      normalized.visitedTimes ??
      normalized.filtered_swipes ??
      normalized.filteredSwipes ??
      normalized.swipes_in_range ??
      normalized.swipes ??
      normalized.swipe_count ??
      null;

    if (litresAvailable !== null && litresAvailable !== undefined) {
      const n = Number(litresAvailable);
      normalized.litres_consumed = Number.isNaN(n) ? litresAvailable : n;
    } else {
      normalized.litres_consumed = normalized.litres_consumed ?? 0;
    }

    if (swipesAvailable !== null && swipesAvailable !== undefined) {
      const n2 = Number(swipesAvailable);
      normalized.visited_times = Number.isNaN(n2) ? swipesAvailable : n2;
    } else {
      normalized.visited_times = normalized.visited_times ?? 0;
    }

    normalized.filtered_litres = normalized.filtered_litres ?? normalized.litres_consumed ?? null;
    normalized.filtered_swipes = normalized.filtered_swipes ?? normalized.visited_times ?? null;

    if (!isFilteredView) {
      normalized.visited_times = 0;
      normalized.filtered_swipes = 0;
      normalized.litres_consumed = 0;
      normalized.filtered_litres = 0;
    }

    return normalized;
  }, []);

  const upsertRecord = useCallback((incoming) => {
    if (!incoming) return;
    const rec = normalizeIncomingRecord(incoming, externalFilterActive);
    setRecords((prev = []) => {
      const copy = Array.isArray(prev) ? [...prev] : [];
      const idx = copy.findIndex((r) => {
        if (!r) return false;
        if (rec._id && r._id && String(r._id) === String(rec._id)) return true;
        if (rec.rfid_uid && r.rfid_uid && String(r.rfid_uid) === String(rec.rfid_uid)) return true;
        if (rec.rfidUid && r.rfid_uid && String(r.rfid_uid) === String(rec.rfidUid)) return true;
        return false;
      });
      if (idx !== -1) copy.splice(idx, 1);
      copy.unshift(rec);
      const newRecords = sortByLastSeen(copy);
      try {
        setFilteredRecords(computeFiltered(newRecords, searchQuery, activeDateFilter));
      } catch (e) {
        console.warn("recompute filtered after upsert failed", e);
      }
      setCurrentPage(1);
      return newRecords;
    });
  }, [sortByLastSeen, computeFiltered, searchQuery, activeDateFilter, normalizeIncomingRecord, externalFilterActive]);

  const removeRecordById = useCallback((id) => {
    if (!id) return;
    setRecords((prev = []) => {
      const next = (prev || []).filter((r) => String(r._id) !== String(id));
      return next;
    });
    setFilteredRecords((prev = []) => (prev || []).filter((r) => String(r._id) !== String(id)));
  }, []);

  const harvestArrayFromResponse = (resData) => {
    if (!resData) return [];
    if (Array.isArray(resData)) return resData;
    if (Array.isArray(resData.items)) return resData.items;
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData.records)) return resData.records;
    if (Array.isArray(resData.response)) return resData.response;
    if (typeof resData === "object") {
      const arr = Object.values(resData).find((v) => Array.isArray(v));
      return arr || [];
    }
    return [];
  };

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    isMountedRef.current = true;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeDateFilter && externalFilterActive) {
      (async () => {
        try {
          setLoading(true);
          const res = await axios.get('/api/rfid', { timeout: 15000 });
          const raw = harvestArrayFromResponse(res.data);
          const normalizedList = (raw || []).map(r => normalizeIncomingRecord(r, true));
          const sorted = sortByLastSeen(normalizedList);
          if (isMountedRef.current) {
            if (!recordsRef.current || recordsRef.current.length === 0) {
              setRecords(sorted);
              setFilteredRecords(computeFiltered(sorted, searchQuery, activeDateFilter));
            }
          }
        } catch (err) {
          console.error('Fetch Error (poll suppressed):', err);
        } finally {
          if (isMountedRef.current) setLoading(false);
        }
      })();
      return () => { isMountedRef.current = false; };
    }

    const fetchRecords = async () => {
      try {
        setLoading(true);
        const res = await axios.get('/api/rfid', { timeout: 15000 });
        const raw = harvestArrayFromResponse(res.data);
        const normalizedIncoming = (raw || []).map(r => normalizeIncomingRecord(r, externalFilterActive));
        const sorted = sortByLastSeen(normalizedIncoming);
        if (isMountedRef.current) {
          setRecords(sorted);
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
      pollIntervalRef.current = null;
    };
  }, [sortByLastSeen, computeFiltered, searchQuery, activeDateFilter, externalFilterActive, normalizeIncomingRecord]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setFilteredRecords(computeFiltered(records, searchQuery, activeDateFilter));
      setCurrentPage(1);
    }, 180);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, records, computeFiltered, activeDateFilter, externalFilterActive]);

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
            const merged = { ...copy[idx], ...payload };
            const item = normalizeIncomingRecord(merged, externalFilterActive);
            copy.splice(idx, 1);
            copy.unshift(item);
            const newSorted = sortByLastSeen(copy);
            setFilteredRecords(computeFiltered(newSorted, searchQuery, activeDateFilter));
            setCurrentPage(1);
            return newSorted;
          }
          return prev;
        });
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
  }, [upsertRecord, removeRecordById, sortByLastSeen, computeFiltered, searchQuery, activeDateFilter, externalFilterActive, normalizeIncomingRecord]);

  const fetchExternalIds = async (fromYmd, toYmd) => {
    const fromParam = fromYmd || "";
    const toParam = toYmd || "";
    const url = `${externalApiBase}?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}`;
    try {
      setLoading(true);
      const res = await axios.get(url, { timeout: 20000 });
      const arr = harvestArrayFromResponse(res.data);
      const ids = (arr || []).map((o) => normalizeUid(o && (o._id || o.rfid_uid || o.uid || ""))).filter(Boolean);
      return { ids, raw: arr || [] };
    } catch (err) {
      console.error("External IDs fetch failed:", err);
      return { ids: [], raw: [] };
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilterFromInputs = async () => {
    if (!filterFrom && !filterTo) {
      clearDateFilter();
      return;
    }

    const fromTs = filterFrom ? parseYMDtoUTCStart(filterFrom) : -8640000000000000;
    const toTs = filterTo ? parseYMDtoUTCEnd(filterTo) : 8640000000000000;
    const fromLabel = filterFrom || "";
    const toLabel = filterTo || "";
    setActiveDateFilter({ fromTs, toTs, fromLabel, toLabel });

    setExternalFilterActive(true);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const { ids: idList, raw: rawItems } = await fetchExternalIds(filterFrom || "", filterTo || "");
      if (!Array.isArray(idList) || idList.length === 0) {
        setRecords([]);
        setFilteredRecords([]);
        setActiveCards([]);
        setShowActivePopup(true);
        setShowFilterModal(false);
        setCurrentPage(1);
        return;
      }

      const localArr = Array.isArray(recordsRef.current) ? recordsRef.current.slice() : [];
      const localMapByUid = new Map();
      localArr.forEach((r) => {
        const keys = [
          normalizeUid(r.rfid_uid || r.rfidUid || ""),
          normalizeUid(r._id || ""),
        ].filter(Boolean);
        keys.forEach((k) => {
          if (!localMapByUid.has(k)) localMapByUid.set(k, r);
        });
      });

      const metricsMap = new Map();
      rawItems.forEach((item) => {
        const key = normalizeUid(item._id || item.rfid_uid || item.uid || item.id || "");
        if (!key) return;
        const litresRaw =
          item.litres_consumed ??
          item.litresConsumed ??
          item.filtered_litres ??
          item.filteredLitres ??
          item.litres ??
          item.total_litres_consumed ??
          null;
        const swipesRaw =
          item.visited_times ??
          item.visitedTimes ??
          item.filtered_swipes ??
          item.filteredSwipes ??
          item.swipes_in_range ??
          item.swipes ??
          item.swipe_count ??
          null;

        const litres = litresRaw === null || litresRaw === undefined ? null : Number(litresRaw);
        const swipes = swipesRaw === null || swipesRaw === undefined ? null : Number(swipesRaw);

        metricsMap.set(key, { litres, swipes });
      });

      const matched = [];
      const missing = [];
      idList.forEach((ext) => {
        if (localMapByUid.has(ext)) {
          const localRec = { ...localMapByUid.get(ext) };
          const m = metricsMap.get(ext);
          if (m) {
            if (m.litres !== undefined && m.litres !== null) localRec.filtered_litres = m.litres;
            if (m.swipes !== undefined && m.swipes !== null) localRec.filtered_swipes = m.swipes;
            if (typeof m.litres === "number") {
              if (localRec.litres_consumed === undefined || localRec.litres_consumed === null) {
                localRec.litres_consumed = m.litres;
              }
            }
            if (typeof m.swipes === "number") {
              if (localRec.visited_times === undefined || localRec.visited_times === null) {
                localRec.visited_times = m.swipes;
              }
            }
          }
          const normalizedLocalRec = normalizeIncomingRecord(localRec, true);
          matched.push(normalizedLocalRec);
        } else missing.push(ext);
      });

      const sorted = sortByLastSeen(matched || []);
      setRecords(sorted);

      const computed = computeFiltered(sorted, searchQuery, null);
      setFilteredRecords(computed);
      setCurrentPage(1);

      const activeOnly = (computed || []).filter((r) => recordHasActivity(r));

      const seen = new Set();
      const arr = [];
      (activeOnly || []).forEach((r) => {
        if (!r) return;
        const canon = normalizeUid(r.rfid_uid || r.rfidUid || r._id || "");
        if (!canon) return;
        if (!seen.has(canon)) {
          seen.add(canon);
          arr.push({
            rfid_uid: canon,
            user_name: r.user_name || "",
            mobile_no: r.mobile_no || "",
            address: r.address || "",
            village: r.village || "",
          });
        }
      });

      setActiveCards(arr);
      setShowActivePopup(true);
      setShowFilterModal(false);
    } catch (err) {
      console.error("applyDateFilterFromInputs error:", err);
      alert("Failed to apply date filter. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilter = async () => {
    setFilterFrom("");
    setFilterTo("");
    setActiveDateFilter(null);
    setExternalFilterActive(false);
    setShowFilterModal(false);
    setActiveCards([]);
    try {
      setLoading(true);
      const res = await axios.get('/api/rfid', { timeout: 15000 });
      const raw = harvestArrayFromResponse(res.data);
      const normalizedIncoming = (raw || []).map(r => normalizeIncomingRecord(r, false));
      const sorted = sortByLastSeen(normalizedIncoming);
      setRecords(sorted);
      setFilteredRecords(computeFiltered(sorted, searchQuery, null));
      setCurrentPage(1);
    } catch (err) {
      console.error("Clear filter fetch failed:", err);
      const data = (recordsRef.current || []).map((r) => normalizeIncomingRecord(r, false));
      setFilteredRecords(computeFiltered(data, searchQuery, null));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    let exportRecords = [];
    if (externalFilterActive && (filterFrom || filterTo)) {
      exportRecords = filteredRecords.slice();
    } else {
      exportRecords = computeFiltered(recordsRef.current || [], searchQuery, activeDateFilter);
    }

    if (!exportRecords || exportRecords.length === 0) {
      alert('No records to download!');
      return;
    }

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
      "No of Liters consumed (Filtered Range)",
      "No of Swipes Visited (Filtered Range)",
      "Remaining Card Balance",
      "Remarks",
    ];
    const csvRows = [csvHeaders.join(",")];

    exportRecords.forEach((r, i) => {
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
        r.filtered_litres ?? r.filteredLitres ?? r.litres_consumed ?? r.litresConsumed ?? r.litres ?? "",
        r.filtered_swipes ?? r.filteredSwipes ?? r.visited_times ?? r.visitedTimes ?? r.swipes ?? r.swipe_count ?? "",
        r.remaining_card_balance ?? "",
        `"${(r.remarks || "").replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const filename = activeDateFilter && activeDateFilter.fromLabel
      ? `RFID_Users_${activeDateFilter.fromLabel}${activeDateFilter.toLabel ? `_to_${activeDateFilter.toLabel}` : ""}.csv`
      : "RFID_Users.csv";
    a.href = url;
    a.download = filename;
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
    "Total number of times visited",
    "Total Litres Consumed (L)",
    "litres_consumed",
    "visited_times",
    "Remaining Card Balance",
    "Remarks",
    "Action",
  ];

  // CSS adjustments to expand table and show full data clearly
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

    .table-wrapper {
      -webkit-overflow-scrolling: touch;
      overflow-x: auto;
      border-radius: 10px;
      border: 1px solid #e8e8e8;
      background: #fff;
      padding: 0;
    }

    /* MAIN change: allow automatic column widths so cells expand to show content */
    .data-table {
      border-collapse: collapse;
      width: 100%;
      table-layout: auto; /* allow columns to size based on content */
      margin: 0;
      transform: none;
      font-size: 13px; /* slightly larger for readability */
    }

    .data-table th {
      background: linear-gradient(90deg, #5C67BC);
      color: #fff;
      text-align: left;
      font-weight: 700;
      border-bottom: 1px solid rgba(0,0,0,0.06);
      padding: 10px 12px;
      white-space: normal;
      font-size: 11px;
      letter-spacing: 0.4px;
    }

    .data-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #f2f2f2;
      background: #fff;
      white-space: normal; /* allow wrap */
      word-break: break-word;
      font-size: 13px;
      color: #222;
      vertical-align: top;
      line-height: 1.25;
    }

    /* remove truncation; let content wrap */
    .truncate { max-width: none; overflow: visible; text-overflow: unset; white-space: normal; }

    /* give important columns reasonable min-widths so they appear readable */
    .col-serial { min-width: 110px; width: 110px; }
    .col-uid { min-width: 160px; width: 160px; }
    .col-name { min-width: 180px; width: 180px; }
    .col-address { min-width: 220px; width: 220px; }
    .col-remarks { min-width: 240px; width: 240px; }
    .col-filtered-litres { min-width: 160px; width: 160px; text-align: center; }
    .col-filtered-swipes { min-width: 140px; width: 140px; text-align: center; }
    .col-mobile { min-width: 120px; width: 120px; }
    .col-family { min-width: 90px; width: 90px; text-align: center; }

    .data-table th:first-child,
    .data-table td:first-child {
      padding-left: 12px;
      padding-right: 12px;
      text-align: right;
      width: 56px;
      max-width: 56px;
      font-size: 13px;
    }
    .col-sno-td { padding-top: 14px; padding-bottom: 14px; }

    .data-table tr:hover td { background: rgba(142, 36, 170, 0.02); }

    .action-buttons { display: flex; gap: 8px; align-items: center; justify-content: flex-start; }
    .action-buttons .btn { display: inline-flex; align-items:center; justify-content:center; width:36px; height:36px; padding:0; border-radius:8px; }
    .action-buttons .btn i { margin:0; font-size:14px; }

    .th-split { display:block; line-height:1.02; text-align:center; }
    .th-split .top { display:block; font-weight:800; font-size:11px; }
    .th-split .bottom { display:block; font-weight:700; font-size:10px; opacity:0.95; }

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

    .filter-modal-overlay {
      position: fixed;
      inset: 0;
      display:flex;
      align-items:center;
      justify-content:center;
      z-index:1000;
      background: rgba(10,12,20,0.36);
      animation: fadeIn .12s ease;
      -webkit-tap-highlight-color: transparent;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

    .filter-modal {
      width: 480px;
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

    .active-popup-overlay {
      position: fixed;
      inset: 0;
      display:flex;
      align-items:flex-start;
      justify-content:center;
      padding-top: 60px;
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

    .pagination-controls { display:flex; gap:12px; align-items:center; justify-content:flex-end; margin-top:12px; flex-wrap:wrap; }
    .page-btn { background:#fff; border:1px solid #e6eef8; padding:8px 10px; border-radius:8px; cursor:pointer; min-width:40px; text-align:center; font-size:13px; }
    .page-btn.active { background:linear-gradient(90deg,#6366f1,#3b82f6); color:#fff; border:0; }
    .select { padding:8px 10px; border-radius:8px; border:1px solid #e6eef8; font-size:13px; }

    @media (max-width: 1100px) {
      /* retain filtered columns visibility, hide some less-essential columns to keep readability */
      .col-address, .col-village, .col-remarks { display: none; }
      .data-table { width: 100%; }
      .col-uid { min-width: 120px; width: 120px; }
      .col-name { min-width: 140px; width: 140px; }
    }
    @media (max-width: 760px) {
      .data-table th { font-size: 10px; padding: 8px 8px; }
      .data-table td { padding: 8px 8px; font-size: 12px; }
      .col-serial { min-width: 90px; width: 90px; }
      .col-uid { min-width: 110px; width: 110px; }
      .col-mobile { min-width: 100px; width: 100px; }
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
                  <span
                    className="active-filter-pill"
                    title={
                      activeDateFilter.fromLabel === activeDateFilter.toLabel
                        ? `Active: ${activeDateFilter.fromLabel}`
                        : `Active: ${activeDateFilter.fromLabel} → ${activeDateFilter.toLabel}`
                    }
                  >
                    {activeDateFilter.fromLabel === activeDateFilter.toLabel
                      ? activeDateFilter.fromLabel
                      : `${activeDateFilter.fromLabel} → ${activeDateFilter.toLabel}`}
                  </span>
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

                      <th><div className="th-split"><span className="top">Total number of</span><span className="bottom">times visited</span></div></th>

                      <th className="col-totallitres"><div className="th-split"><span className="top">Total Litres</span><span className="bottom">Consumed (L)</span></div></th>

                      <th className="col-filtered-litres"><div className="th-split"><span className="top">litres_consumed</span><span className="bottom">(filtered range)</span></div></th>
                      <th className="col-filtered-swipes"><div className="th-split"><span className="top">visited_times</span><span className="bottom">(filtered range)</span></div></th>

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

                          <td className="truncate">{ r.swipe_count ?? "—" }</td>

                          <td className="truncate col-totallitres">{r.total_litres_consumed ?? "—"}</td>

                          <td className="truncate col-filtered-litres">{(r.filtered_litres ?? r.filteredLitres ?? r.litres_consumed ?? r.litresConsumed ?? 0)}</td>
                          <td className="truncate col-filtered-swipes">{(r.filtered_swipes ?? r.filteredSwipes ?? r.visited_times ?? r.visitedTimes ?? r.swipes ?? r.swipe_count ?? 0)}</td>

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
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {showFilterModal && (
        <div className="filter-modal-overlay" onClick={() => setShowFilterModal(false)} role="presentation">
          <div className="filter-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Filter Records</h3>
            <div className="sub">Filter records by date range (format: YYYY-MM-DD)</div>

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

      {showActivePopup && (
        <div className="active-popup-overlay" onClick={() => setShowActivePopup(false)} role="presentation">
          <div className="active-popup" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ textAlign: 'center' }}>
              Active Cards : <span style={{ fontWeight: 900, marginLeft: 8 }}>{activeCards.length}</span>
            </h3>

            {activeDateFilter ? (
              <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, opacity: 0.85, marginTop: 6 }}>
                {activeDateFilter.fromLabel === activeDateFilter.toLabel
                  ? activeDateFilter.fromLabel
                  : `${activeDateFilter.fromLabel} → ${activeDateFilter.toLabel}`}
              </div>
            ) : null}

            <div className="active-grid">
              {activeCards.length ? (
                activeCards.map((c, idx) => (
                  <div
                    key={idx}
                    className="uid-card"
                    onClick={() => { if (c && c.rfid_uid) navigate(`/rfidhistory/${c.rfid_uid}`); }}
                    title={c && c.rfid_uid ? `View history for ${c.rfid_uid}` : ''}
                  >
                    <div>
                      <div style={{ color: "#1e40af", fontWeight: 900 }}>{c.rfid_uid}</div>
                      {(c.user_name || c.mobile_no) ? (
                        <div className="uid-meta">{c.user_name ? c.user_name : ""}{c.user_name && c.mobile_no ? " · " : ""}{c.mobile_no ? c.mobile_no : ""}</div>
                      ) : null}
                    </div>
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
