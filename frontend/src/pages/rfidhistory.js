// src/pages/rfidHistory.js
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

export default function RfidHistory() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [meta, setMeta] = useState({
    rfid_serial_no: state?.rfid_serial_no || "",
    rfid_uid: state?.rfid_uid || "",
    user_name: state?.user_name || "",
    address: state?.address || "",
    village: state?.village || "",
    aadhar_no: state?.aadhar_no || "",
    mobile_no: state?.mobile_no || "",
    family_mems: state?.family_mems ?? "",
    quant_water_alloted_per_day: state?.quant_water_alloted_per_day ?? "",
    quant_water_alloted_per_month: state?.quant_water_alloted_per_month ?? "",
    swipe_count: state?.swipe_count ?? "",
    remarks: state?.remarks || "",
  });
  const [history, setHistory] = useState([]); // array of swipe entries
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`/api/rfid/${id}/history`);
      if (res?.data) {
        setCount(res.data.count ?? (res.data.history?.length ?? 0));
        setHistory(res.data.history ?? []);
        if (res.data.meta) {
          setMeta((prev) => ({ ...prev, ...res.data.meta }));
        }
      } else {
        setCount(0);
        setHistory([]);
      }
    } catch (err) {
      console.error("fetchHistory error:", err);
      setError(err.response?.data?.message || "Failed to fetch history.");
      setCount(0);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async (historyId) => {
    if (!window.confirm("Are you sure you want to delete this history entry?")) return;
    try {
      await axios.delete(`/api/rfid/${id}/history/${historyId}`);
      // remove locally
      setHistory((prev) => prev.filter((h) => (h._id || h.id) !== historyId));
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error("delete history error:", err);
      alert(err?.response?.data?.message || "Failed to delete history entry");
    }
  };

  const handleEditHistory = (entry) => {
    // navigate to an edit-history page (you can implement it)
    const historyId = entry._id || entry.id;
    navigate(`/edithistory/${historyId}`, { state: { entry, cardMeta: meta, rfidId: id } });
  };

  // styles (keeps design consistent with your record list)
  const styles = {
    page: {
      padding: "10px",
      background: "#f5f7fb",
      minHeight: "100vh",
      fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    },
    container: { maxWidth: "1200px", margin: "0 auto" },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 6px 18px rgba(20,30,60,0.06)",
    },
    backBtn: {
      background: "#0b74ff",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: 6,
      cursor: "pointer",
      marginBottom: 16,
      fontWeight: 600,
    },
    title: {
      textAlign: "center",
      fontSize: 22,
      fontWeight: 700,
      color: "#1f2937",
      marginBottom: 18,
    },
    tableWrap: {
      overflowX: "auto",
      borderRadius: 8,
      border: "1px solid #e6e8ea",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1200 },
    th: {
      padding: "12px 10px",
      textAlign: "center",
      fontWeight: 800,
      fontSize: 13,
      background: "#0b74ff",
      color: "#fff",
      position: "sticky",
      top: 0,
      zIndex: 2,
      whiteSpace: "nowrap",
    },
    td: {
      padding: "10px",
      textAlign: "center",
      borderBottom: "1px solid #f1f5f9",
      color: "#111827",
      fontSize: 14,
      whiteSpace: "nowrap",
    },
    personRow: { background: "#eef5ff", fontWeight: 600, color: "#0b74ff" },
    emptyRow: {
      padding: 20,
      textAlign: "center",
      color: "#6b7280",
      fontStyle: "italic",
    },
    actionBtn: {
      padding: "6px 10px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontWeight: 700,
    },
    editBtn: { background: "#10b981", color: "#fff", marginRight: 8 },
    delBtn: { background: "#ef4444", color: "#fff" },
  };

  // new column headings exactly as requested
  const headers = [
    "S.No",
    "RFID Serial No",
    "RFID UID",
    "Username",
    "TimeStamp",
    "Device_ID",
    "Amt_Debited",
    "Remaining_Card_Balance",
    "No_of_Litres_Consumed",
    "Remarks",
    "Action",
  ];

  // helper to extract fields safely from entry
  const getField = (entry, field) => {
    // check meta first, then cardSnapshot, then top-level keys
    const meta = entry.meta || {};
    const snap = entry.cardSnapshot || {};
    return meta[field] ?? snap[field] ?? entry[field] ?? "—";
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>

          <h2 style={styles.title}>RFID Card History</h2>

          {loading && <div style={styles.emptyRow}>Loading history...</div>}
          {!loading && error && <div style={{ color: "red", textAlign: "center" }}>{error}</div>}

          {/* Table */}
          {!loading && !error && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {headers.map((h) => (
                      <th key={h} style={styles.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* Person summary row (if we have meta data) */}
                  {meta && (meta.rfid_serial_no || meta.rfid_uid || meta.user_name) ? (
                    <tr style={styles.personRow}>
                      <td style={styles.td}>1</td>
                      <td style={styles.td}>{meta.rfid_serial_no || "—"}</td>
                      <td style={styles.td}>{meta.rfid_uid || "—"}</td>
                      <td style={styles.td}>{meta.user_name || "—"}</td>
                      <td style={styles.td}>—</td>
                      <td style={styles.td}>—</td>
                      <td style={styles.td}>—</td>
                      <td style={styles.td}>—</td>
                      <td style={styles.td}>—</td>
                      <td style={styles.td}>{meta.remarks || "—"}</td>
                      <td style={styles.td}>—</td>
                    </tr>
                  ) : null}

                  {/* History rows */}
                  {history.length > 0 ? (
                    history.map((h, i) => {
                      const idx = (i + 2); // account for person summary row
                      const historyId = h._id || h.id || `${i}`;
                      // determine timestamp
                      const ts = h.timestamp || h.createdAt || h.created_at || null;
                      const tsStr = ts ? new Date(ts).toLocaleString() : "—";

                      // look for the fields in meta/cardSnapshot/top-level
                      const rfidSerial = getField(h, "rfid_serial_no") !== "—" ? getField(h, "rfid_serial_no") : getField(h, "rfidSerial");
                      const rfidUid = getField(h, "rfid_uid") !== "—" ? getField(h, "rfid_uid") : getField(h, "rfidUhd");
                      const username = getField(h, "user_name") !== "—" ? getField(h, "user_name") : getField(h, "name");
                      const deviceId = getField(h, "device_id");
                      const amtDebited = getField(h, "amt_debited") ?? getField(h, "amount") ?? "—";
                      const remainingBal = getField(h, "remaining_balance") ?? getField(h, "card_balance") ?? "—";
                      const litres = getField(h, "litres_consumed") ?? getField(h, "litres") ?? getField(h, "no_of_litres") ?? "—";
                      const remarks = getField(h, "remarks") ?? (h.note || "—");

                      return (
                        <tr key={historyId}>
                          <td style={styles.td}>{idx}</td>
                          <td style={styles.td}>{rfidSerial}</td>
                          <td style={styles.td}>{rfidUid}</td>
                          <td style={styles.td}>{username}</td>
                          <td style={styles.td}>{tsStr}</td>
                          <td style={styles.td}>{deviceId}</td>
                          <td style={styles.td}>{amtDebited}</td>
                          <td style={styles.td}>{remainingBal}</td>
                          <td style={styles.td}>{litres}</td>
                          <td style={styles.td}>{remarks}</td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                              <button style={{ ...styles.actionBtn, ...styles.editBtn }} onClick={() => handleEditHistory(h)}>Edit</button>
                              <button style={{ ...styles.actionBtn, ...styles.delBtn }} onClick={() => handleDeleteHistory(historyId)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={11} style={styles.emptyRow}>
                        No history entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
