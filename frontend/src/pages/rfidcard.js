import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

export default function RfidCard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRightHint, setShowRightHint] = useState(false);

  // refs
  const isMountedRef = useRef(true);
  const containerRef = useRef(null);
  const tableWrapperRef = useRef(null);
  const evaluateTimeoutRef = useRef(null);
  const latestRecordsRef = useRef(records);
  useEffect(() => {
    latestRecordsRef.current = records;
  }, [records]);

  // mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /** 🧠 Sort helper — prefer lastSeen, fallback to updatedAt/createdAt */
  const sortByLastSeen = useCallback((list) => {
    return [...list].sort((a, b) => {
      const ta =
        (a && a.lastSeen && new Date(a.lastSeen).getTime()) ||
        (a && a.updatedAt && new Date(a.updatedAt).getTime()) ||
        (a && a.createdAt && new Date(a.createdAt).getTime()) ||
        0;
      const tb =
        (b && b.lastSeen && new Date(b.lastSeen).getTime()) ||
        (b && b.updatedAt && new Date(b.updatedAt).getTime()) ||
        (b && b.createdAt && new Date(b.createdAt).getTime()) ||
        0;
      return tb - ta;
    });
  }, []);

  /** Fetch a single RFID by trying to find it in the full list (safe when /:id expects ObjectId) */
  const findRecordInList = useCallback(async (uid) => {
    if (!uid) return null;
    try {
      const res = await axios.get("/api/rfid", { timeout: 10000 });
      let all = [];
      if (Array.isArray(res.data)) all = res.data;
      else if (Array.isArray(res.data.data)) all = res.data.data;
      else if (Array.isArray(res.data.items)) all = res.data.items;
      else if (res.data && typeof res.data === "object") {
        const arr = Object.values(res.data).find((v) => Array.isArray(v));
        all = arr || [];
      }

      const lowerUid = String(uid).trim().toLowerCase();
      const found = all.find((r) => String(r.rfid_uid || r.rfidUid || r._id || "")
        .trim()
        .toLowerCase() === lowerUid);
      return found || null;
    } catch (err) {
      console.warn("findRecordInList error:", err && (err.message || err));
      return null;
    }
  }, []);

  /** 📦 Fetch RFID records from backend */
  const fetchRecords = useCallback(async () => {
    const controller = new AbortController();
    try {
      if (!isMountedRef.current) return;
      setLoading(true);

      const res = await axios.get("/api/rfid", {
        signal: controller.signal,
        timeout: 15000,
      });

      let data = [];
      if (Array.isArray(res.data)) data = res.data;
      else if (Array.isArray(res.data.items)) data = res.data.items;
      else if (Array.isArray(res.data.data)) data = res.data.data;
      else if (Array.isArray(res.data.records)) data = res.data.records;
      else if (res.data && typeof res.data === "object") {
        const arr = Object.values(res.data).find((v) => Array.isArray(v));
        data = arr || [];
      }

      const sorted = sortByLastSeen(data);
      if (isMountedRef.current) {
        setRecords(sorted);
        setFilteredRecords(sorted);
      }
    } catch (err) {
      if (err.name === "CanceledError" || axios.isCancel?.(err)) {
        // aborted
      } else {
        console.error("Fetch Error:", err);
        if (isMountedRef.current) alert("Failed to load RFID records. See console for details.");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
    return () => controller.abort();
  }, [sortByLastSeen]);

  // initial + polling
  useEffect(() => {
    fetchRecords();
    const timer = setInterval(() => {
      if (isMountedRef.current) fetchRecords();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchRecords]);

  /** Handle incoming global event when a card's history was updated
   *  Strategy:
   *   1) Immediately move any local matching row to top for instant feedback.
   *   2) Fetch the full list and find the updated row by rfid_uid (case-insensitive).
   *   3) Insert the fresh row at top (avoids calling /api/rfid/:id which expects ObjectId).
   */
  useEffect(() => {
    let mounted = true;
    const normalizeId = (r) => String(r && (r.rfid_uid || r.rfidUid || r._id || "")).trim().toLowerCase();

    const handler = async (e) => {
      if (!mounted) return;
      try {
        const detail = e && e.detail ? e.detail : null;
        if (!detail) return;
        const rawIdent = detail.rfidUid || detail.rfid_uid || detail.uid || detail.id || detail._id || "";
        const rfidUid = String(rawIdent).trim();
        if (!rfidUid) return;
        const lowerUid = rfidUid.toLowerCase();

        // 1) Instant local move if present
        setRecords((prev) => {
          const idx = prev.findIndex((r) => normalizeId(r) === lowerUid);
          if (idx === -1) return prev;
          const found = prev[idx];
          const rest = prev.filter((_, i) => i !== idx);
          return [found, ...rest];
        });
        setFilteredRecords((prev) => {
          const idx = prev.findIndex((r) => normalizeId(r) === lowerUid);
          if (idx === -1) return prev;
          const found = prev[idx];
          const rest = prev.filter((_, i) => i !== idx);
          return [found, ...rest];
        });

        // 2) Ensure authoritative fresh record from server (search list)
        const fresh = await findRecordInList(rfidUid);
        if (fresh && isMountedRef.current) {
          setRecords((prev) => {
            const filtered = prev.filter((x) => String(x._id || x.rfid_uid || "").trim().toLowerCase() !== String(fresh._id || fresh.rfid_uid || "").trim().toLowerCase());
            const inserted = [fresh, ...filtered];
            return sortByLastSeen(inserted);
          });
          setFilteredRecords((prev) => {
            const filtered = prev.filter((x) => String(x._id || x.rfid_uid || "").trim().toLowerCase() !== String(fresh._id || fresh.rfid_uid || "").trim().toLowerCase());
            const inserted = [fresh, ...filtered];
            return sortByLastSeen(inserted);
          });
        }
      } catch (err) {
        console.warn("rfid-history-updated handler error:", err);
      }
    };

    window.addEventListener("rfid-history-updated", handler);
    return () => {
      mounted = false;
      window.removeEventListener("rfid-history-updated", handler);
    };
  }, [findRecordInList, sortByLastSeen]);

  /** 🔍 Safe search helper and filter */
  const safeLower = (v) => {
    try {
      return String(v ?? "").toLowerCase();
    } catch (e) {
      return "";
    }
  };

  const handleSearch = (e) => {
    const raw = e?.target?.value ?? "";
    const q = safeLower(raw);
    setSearchQuery(raw);

    if (!q) {
      setFilteredRecords(records);
      return;
    }

    const filtered = records.filter((r) => {
      if (!r) return false;
      const checks = [
        safeLower(r.user_name),
        safeLower(r.mobile_no),
        safeLower(r.village),
        safeLower(r.rfid_uid),
        safeLower(r.rfid_serial_no),
        safeLower(r.address),
        safeLower(r.aadhar_no),
      ];
      return checks.some((fieldVal) => fieldVal.includes(q));
    });

    setFilteredRecords(filtered);
  };

  const handleEditNavigate = (rec) =>
    navigate(`/editrfidcard/${rec._id}`, { state: rec });

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      setLoading(true);
      await axios.delete(`/api/rfid/${id}`);
      const updated = records.filter((r) => r._id !== id);
      if (isMountedRef.current) {
        setRecords(updated);
        setFilteredRecords(updated);
      }
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete record.");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const handleViewHistory = (rec) => {
    const uid =
      rec && rec.rfid_uid && String(rec.rfid_uid).trim() !== ""
        ? rec.rfid_uid
        : rec._id;
    navigate(`/rfidhistory/${encodeURIComponent(uid)}`, { state: { record: rec } });
  };

  /** ⬇️ Download CSV */
  const handleDownload = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      alert("No records to download!");
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

  // --- scroll hint utils ---
  const atRightEdge = (w) => w.scrollLeft + w.clientWidth >= w.scrollWidth - 8;
  const isOverflowing = (w) => w.scrollWidth > w.clientWidth + 2;

  const evaluateHint = (wrapper) => {
    if (!wrapper) return;
    if (!isOverflowing(wrapper)) {
      if (isMountedRef.current) setShowRightHint(false);
      return;
    }
    if (atRightEdge(wrapper)) {
      if (isMountedRef.current) setShowRightHint(false);
    } else {
      if (isMountedRef.current) setShowRightHint(true);
    }
  };

  useEffect(() => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;

    if (evaluateTimeoutRef.current) clearTimeout(evaluateTimeoutRef.current);
    evaluateTimeoutRef.current = setTimeout(() => evaluateHint(wrapper), 100);

    const onScroll = () => evaluateHint(wrapper);
    const onResize = () => evaluateHint(wrapper);

    wrapper.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      wrapper.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (evaluateTimeoutRef.current) {
        clearTimeout(evaluateTimeoutRef.current);
        evaluateTimeoutRef.current = null;
      }
    };
  }, [filteredRecords]);

  const scrollToEndAndToggle = () => {
    const wrapper = tableWrapperRef.current;
    if (!wrapper) return;
    wrapper.scrollTo({ left: wrapper.scrollWidth, behavior: "smooth" });
    setTimeout(() => {
      if (isMountedRef.current) setShowRightHint(false);
    }, 420);
  };

  const onHintKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      scrollToEndAndToggle();
    }
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
                  onChange={handleSearch}
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
                <table className="data-table" style={{ minWidth: 1200 }}>
                  <thead>
                    <tr>
                      {columns.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredRecords || filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="table-empty">
                          {loading ? "Loading records..." : "No records found"}
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, i) => (
                        <tr key={r._id || i}>
                          <td>{i + 1}</td>
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
