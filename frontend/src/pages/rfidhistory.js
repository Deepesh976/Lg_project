import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * RFID History (proxy-based)
 * - Reads device response like:
 *   { response: [ { "Device Id": "...", "RFID_UID": "...", "Remaining Card Balance": 64, "Date": "...", "Time": "...", "Litres Consumed": 15, "Amount Debited": 30, "Price Per Litre": 2 }, ... ] }
 * - No raw inspector, no edit/delete actions.
 *
 * Behavior changes:
 * - Records are sorted so the most recently updated / newest records come first.
 * - The parser is tolerant to common field names and several timestamp shapes.
 */

export default function RfidHistory() {
  const { id } = useParams(); // RFID UID or _id depending on navigation
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

      // Extract array from common shapes
      let records = [];
      if (Array.isArray(data.response)) records = data.response;
      else if (Array.isArray(data)) records = data;
      else if (Array.isArray(data.data)) records = data.data;
      else if (Array.isArray(data.items)) records = data.items;
      else if (data && typeof data === "object") {
        const arr = Object.values(data).find((v) => Array.isArray(v));
        records = arr || [];
      }

      // Normalize and sort by timestamp (newest first)
      const withTs = records.map((r) => {
        return {
          original: r,
          ts: parseRecordTimestamp(r), // Date or null
        };
      });

      withTs.sort((a, b) => {
        const ta = a.ts ? a.ts.getTime() : 0;
        const tb = b.ts ? b.ts.getTime() : 0;
        return tb - ta; // newest first
      });

      const sorted = withTs.map((w) => w.original);
      setHistory(sorted);

      if (sorted.length === 0)
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

  /**
   * Try to extract/parse a timestamp from a record
   * Strategies:
   * - If record has numeric 'timestamp' or 'ts' => use as millis or seconds
   * - If has ISO-like field 'dateTime' or 'datetime' => parse directly
   * - If has 'Date' and 'Time' fields (or variants) => join and parse
   * - Fallback: try Date.parse on stringified record (not ideal)
   */
  const parseRecordTimestamp = (rec) => {
    if (!rec || typeof rec !== "object") return null;

    const get = (keys) => {
      for (const k of keys) {
        if (k in rec && rec[k] !== null && rec[k] !== undefined) return rec[k];
        // try camel/underscored variants
        const camel = k
          .replace(/[_\s]+([a-zA-Z])/g, (_, c) => c.toUpperCase())
          .replace(/\s/g, "");
        if (camel in rec && rec[camel] !== null && rec[camel] !== undefined)
          return rec[camel];
        const underscored = k.replace(/\s+/g, "_");
        if (
          underscored in rec &&
          rec[underscored] !== null &&
          rec[underscored] !== undefined
        )
          return rec[underscored];
      }
      return undefined;
    };

    // 1) timestamp / ts (could be seconds or milliseconds)
    const tsRaw = get(["timestamp", "timeStamp", "ts"]);
    if (tsRaw !== undefined && tsRaw !== null && tsRaw !== "") {
      const n = Number(tsRaw);
      if (!Number.isNaN(n)) {
        // heuristics: if large (>= 1e12) assume ms, if ~1e9 assume seconds
        if (n > 1e12) return new Date(n);
        if (n > 1e9) return new Date(n);
        // seconds -> ms
        if (n > 0) return new Date(n * 1000);
      }
      // try parse as ISO string
      const parsedISO = Date.parse(String(tsRaw));
      if (!Number.isNaN(parsedISO)) return new Date(parsedISO);
    }

    // 2) ISO-like datetime fields
    const iso = get(["dateTime", "datetime", "DateTime", "dt"]);
    if (iso) {
      const parsed = Date.parse(String(iso));
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    // 3) Date + Time pair
    const dateField = get(["Date", "date", "transaction_date", "TxnDate"]);
    const timeField = get(["Time", "time", "transaction_time", "TxnTime"]);
    if (dateField) {
      // combine date and time (if any) into a parseable string
      const dateStr = String(dateField).trim();
      const timeStr = timeField ? String(timeField).trim() : "";
      // common formats: "YYYY-MM-DD", "DD/MM/YYYY", "DD-MM-YYYY", time maybe "HH:mm" or "HH:mm:ss"
      // Try a few parses:
      const attempts = [];
      if (timeStr) attempts.push(`${dateStr} ${timeStr}`);
      attempts.push(dateStr);

      for (const attempt of attempts) {
        const p = tryParseFlexibleDate(attempt);
        if (p) return p;
      }
    }

    // 4) try common combined fields like 'Date_Time' or 'date_time'
    const combined = get(["Date_Time", "date_time", "DateTime", "dateTime"]);
    if (combined) {
      const p = tryParseFlexibleDate(String(combined));
      if (p) return p;
    }

    // 5) last resort: try parsing any stringified numeric/date-like field
    try {
      const str = JSON.stringify(rec);
      const p = tryParseFlexibleDate(str);
      if (p) return p;
    } catch (e) {
      // ignore
    }

    return null;
  };

  /**
   * Flexible date parser:
   * - Attempts Date.parse first
   * - If fails and pattern is DD/MM/YYYY or DD-MM-YYYY, converts to YYYY-MM-DD for parsing
   */
  const tryParseFlexibleDate = (s) => {
    if (!s) return null;
    const str = String(s).trim();

    // direct ISO-ish parse
    const iso = Date.parse(str);
    if (!Number.isNaN(iso)) return new Date(iso);

    // handle "DD/MM/YYYY" or "DD-MM-YYYY" optionally with time "HH:mm[:ss]"
    // split date and optional time
    const parts = str.split(" ");
    const datePart = parts[0];
    const timePart = parts.slice(1).join(" ");

    // match dd/mm/yyyy or dd-mm-yyyy
    const dmy = datePart.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmy) {
      let dd = dmy[1].padStart(2, "0");
      let mm = dmy[2].padStart(2, "0");
      let yy = dmy[3];
      // normalize year
      if (yy.length === 2) {
        // assume 20xx for two-digit years (safer for modern data)
        yy = "20" + yy;
      }
      const isoLike = `${yy}-${mm}-${dd}` + (timePart ? ` ${timePart}` : "");
      const parsed = Date.parse(isoLike);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    // match yyyy/mm/dd or yyyy-mm-dd (already attempted via Date.parse but try again)
    const ymd = datePart.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (ymd) {
      const isoLike = `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(
        ymd[3]
      ).padStart(2, "0")}` + (timePart ? ` ${timePart}` : "");
      const parsed = Date.parse(isoLike);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    // fallback: try Date.parse on the whole string one more time
    const last = Date.parse(str);
    if (!Number.isNaN(last)) return new Date(last);

    return null;
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
