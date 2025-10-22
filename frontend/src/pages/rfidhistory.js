import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * RFID History (proxy-based)
 * - Reads device response like:
 *   { response: [ { "Device Id": "...", "RFID_UID": "...", "Remaining Card Balance": 64, "Date": "...", "Time": "...", "Litres Consumed": 15, "Amount Debited": 30, "Price Per Litre": 2 }, ... ] }
 * - No raw inspector, no edit/delete actions.
 */

export default function RfidHistory() {
  const { id } = useParams(); // RFID UID
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) fetchViaProxy(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchViaProxy = async (uid) => {
    setLoading(true);
    setError("");
    setHistory([]);
    try {
      const url = `/api/proxy/atw/${encodeURIComponent(uid)}`;
      const res = await axios.get(url, { timeout: 15000 });
      const data = res?.data ?? {};

      // Handle { response: [...] } or direct arrays
      let records = [];
      if (Array.isArray(data.response)) records = data.response;
      else if (Array.isArray(data)) records = data;
      else if (Array.isArray(data.data)) records = data.data;
      else if (Array.isArray(data.items)) records = data.items;
      else if (data && typeof data === "object") {
        const arr = Object.values(data).find((v) => Array.isArray(v));
        records = arr || [];
      }

      setHistory(records);
      if (records.length === 0)
        setError("No data found for this RFID UID (proxy returned empty).");
    } catch (err) {
      console.error("fetchViaProxy error:", err);
      if (err.response)
        setError(
          `Proxy/Device returned ${err.response.status}: ${JSON.stringify(
            err.response.data
          )}`
        );
      else if (err.request)
        setError("No response from proxy. Ensure backend can reach the device.");
      else setError(err.message || "Unknown error from proxy fetch.");
    } finally {
      setLoading(false);
    }
  };

  const getField = (obj, keys) => {
    if (!obj) return "—";
    const tryKeys = Array.isArray(keys) ? keys : [keys];
    for (const k of tryKeys) {
      if (k in obj && obj[k] !== null && obj[k] !== undefined) return obj[k];
      if (typeof k === "string") {
        const camel = k
          .replace(/[_\s]+([a-zA-Z])/g, (_, c) => c.toUpperCase())
          .replace(/\s/g, "");
        if (camel in obj && obj[camel] !== null && obj[camel] !== undefined)
          return obj[camel];
        const underscored = k.replace(/\s+/g, "_");
        if (
          underscored in obj &&
          obj[underscored] !== null &&
          obj[underscored] !== undefined
        )
          return obj[underscored];
      }
    }
    return "—";
  };

  const splitDateTime = (dateStr, timeStr) => ({
    date: dateStr || "—",
    time: timeStr || "—",
  });

  const safeNum = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };

  // ---- Compact layout styles ----
  const styles = {
    page: {
      padding: "10px 20px 20px",
      background: "#f5f7fb",
      minHeight: "100vh",
      fontFamily: "Segoe UI, Roboto, Arial",
    },
    container: { maxWidth: 1200, margin: "0 auto" },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 10,
      boxShadow: "0 6px 18px rgba(20,30,60,0.06)",
    },
    backBtn: {
      background: "#0b74ff",
      color: "#fff",
      border: "none",
      padding: "8px 14px",
      borderRadius: 6,
      cursor: "pointer",
      marginBottom: 12,
      fontWeight: 600,
    },
    title: {
      textAlign: "center",
      fontSize: 22,
      fontWeight: 700,
      color: "#1f2937",
      marginBottom: 12, // smaller gap between title & table
    },
    tableWrap: {
      overflowX: "auto",
      borderRadius: 8,
      border: "1px solid #e6e8ea",
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
    th: {
      padding: 12,
      background: "#0b74ff",
      color: "#fff",
      textAlign: "center",
      fontWeight: 700,
    },
    td: {
      padding: 10,
      textAlign: "center",
      borderBottom: "1px solid #f1f5f9",
      color: "#111827",
      fontSize: 14,
    },
    empty: {
      padding: 24,
      textAlign: "center",
      color: "#6b7280",
      fontStyle: "italic",
    },
  };

  const headers = [
    "S.No",
    "RFID_UID",
    "Device Id",
    "Remaining Card Balance",
    "Date",
    "Time",
    "Litres Consumed",
    "Amount Debited",
    "Price Per Litre",
  ];

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h2 style={styles.title}>RFID Card History</h2>

          {loading && <div style={styles.empty}>Loading data...</div>}
          {!loading && error && (
            <div style={{ color: "red", textAlign: "center", marginBottom: 12 }}>
              {error}
            </div>
          )}

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
                  {history.length > 0 ? (
                    history.map((item, i) => {
                      const rfid = getField(item, [
                        "RFID_UID",
                        "RFID UID",
                        "rfid_uid",
                        "uid",
                      ]);
                      const deviceId = getField(item, [
                        "Device Id",
                        "DeviceId",
                        "device_id",
                      ]);
                      const remaining = getField(item, [
                        "Remaining Card Balance",
                        "RemainingBalance",
                        "remaining_card_balance",
                      ]);
                      const litres = getField(item, [
                        "Litres Consumed",
                        "Litres",
                        "litres_consumed",
                      ]);
                      const amount = getField(item, [
                        "Amount Debited",
                        "AmountDebited",
                        "amount_debited",
                      ]);
                      const price = getField(item, [
                        "Price Per Litre",
                        "PricePerLitre",
                        "price_per_litre",
                      ]);
                      const dateField = getField(item, ["Date", "date"]);
                      const timeField = getField(item, ["Time", "time"]);
                      const { date, time } = splitDateTime(dateField, timeField);

                      return (
                        <tr key={i}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={styles.td}>{rfid}</td>
                          <td style={styles.td}>{deviceId}</td>
                          <td style={styles.td}>{safeNum(remaining)}</td>
                          <td style={styles.td}>{date}</td>
                          <td style={styles.td}>{time}</td>
                          <td style={styles.td}>{safeNum(litres)}</td>
                          <td style={styles.td}>{safeNum(amount)}</td>
                          <td style={styles.td}>{safeNum(price)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={headers.length} style={styles.empty}>
                        No records found
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
