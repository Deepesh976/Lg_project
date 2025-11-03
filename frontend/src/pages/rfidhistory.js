import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * RFID History — minimal change: make today's litres summation robust.
 * All other logic preserved as you provided.
 */

export default function RfidHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // filter modal
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);

  // download modal
  const [downloadOpen, setDownloadOpen] = useState(false);

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

      // Discover array in common shapes (unchanged order)
      let records = [];
      if (Array.isArray(data.response)) records = data.response;
      else if (Array.isArray(data)) records = data;
      else if (Array.isArray(data.data)) records = data.data;
      else if (Array.isArray(data.items)) records = data.items;
      else if (data && typeof data === "object") {
        const arr = Object.values(data).find((v) => Array.isArray(v));
        records = arr || [];
      }

      // DO NOT sort — use backend order directly
      setHistory(records);

      // optional: notify other components that this UID's history updated
      try {
        let uidToNotify = null;
        if (Array.isArray(records) && records.length > 0) {
          const first = records[0];
          uidToNotify =
            first.RFID_UID ||
            first["RFID UID"] ||
            first.rfid_uid ||
            first.uid ||
            first.RFID ||
            null;
        }
        if (!uidToNotify) uidToNotify = id;
        if (uidToNotify) {
          const detail = { rfidUid: String(uidToNotify).trim() };
          window.dispatchEvent(new CustomEvent("rfid-history-updated", { detail }));
        }
      } catch (e) {
        // ignore
      }

      if (!records.length) setError("No data found for this RFID UID");
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
      setPage(1);
    }
  };

  /* ----------------- Helpers: field extraction & robust date detection ----------------- */

  const getField = (obj, keys) => {
    if (!obj) return "—";
    const tryKeys = Array.isArray(keys) ? keys : [keys];
    for (const k of tryKeys) {
      if (k in obj && obj[k] !== null && obj[k] !== undefined && obj[k] !== "") return obj[k];
      if (typeof k === "string") {
        const camel = k.replace(/[_\s]+([a-zA-Z])/g, (_, c) => c.toUpperCase()).replace(/\s/g, "");
        if (camel in obj && obj[camel] !== null && obj[camel] !== undefined && obj[camel] !== "")
          return obj[camel];
        const underscored = k.replace(/\s+/g, "_");
        if (underscored in obj && obj[underscored] !== null && obj[underscored] !== undefined && obj[underscored] !== "")
          return obj[underscored];
      }
    }
    return "—";
  };

  const parseNumberField = (rec, keys) => {
    const raw = getField(rec, keys);
    if (raw === "—" || raw === null || raw === undefined || raw === "") return 0;
    const s = String(raw).replace(/,/g, "").trim();
    const m = s.match(/^-?\d+(\.\d+)?/);
    const numStr = m ? m[0] : s;
    const v = parseFloat(numStr);
    return Number.isFinite(v) ? v : 0;
  };

  const safeNum = (v) => {
    if (v === null || v === undefined || v === "") return "—";
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };

  // Robustly extract a Date object (or null) from a record
  const getRecordDate = (rec) => {
    if (!rec || typeof rec !== "object") return null;

    // try numeric timestamp fields first (epoch seconds or ms)
    const tsCandidate = getField(rec, ["timestamp", "timeStamp", "ts", "time", "createdAt", "created_at", "updatedAt", "updated_at"]);
    if (tsCandidate !== undefined && tsCandidate !== null && tsCandidate !== "") {
      const s = String(tsCandidate).trim();
      if (/^-?\d+$/.test(s)) {
        // digits only -> epoch (10 or 13+ digits)
        if (s.length <= 10) return new Date(Number(s) * 1000);
        return new Date(Number(s));
      }
      // try ISO parse
      const iso = Date.parse(s);
      if (!Number.isNaN(iso)) return new Date(iso);
    }

    // If TxnDate and TxnTime exist separately, combine and parse
    const txnDate = getField(rec, ["TxnDate", "Txn_Date", "Date", "date"]);
    const txnTime = getField(rec, ["TxnTime", "time", "Time"]);
    if (txnDate && txnDate !== "—") {
      const combined = txnTime && txnTime !== "—" ? `${String(txnDate).trim()} ${String(txnTime).trim()}` : String(txnDate).trim();
      const p = tryParseDateString(combined);
      if (p) return p;
    }

    // try common date-like fields
    const candidates = [
      getField(rec, ["dateTime", "datetime", "DateTime", "Date_Time", "date_time", "TxnDateTime", "transaction_datetime"]),
      getField(rec, ["Date", "date", "TxnDate", "transaction_date"]),
      getField(rec, ["Time", "time", "TxnTime", "transaction_time"]),
    ].filter(Boolean);

    for (const c of candidates) {
      if (c && c !== "—") {
        const p = tryParseDateString(String(c));
        if (p) return p;
      }
    }

    // try all string fields searching for a date-like token
    for (const key of Object.keys(rec)) {
      const val = rec[key];
      if (!val) continue;
      if (typeof val === "string" && /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})|(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})|(\d{10,13})/.test(val)) {
        const p = tryParseDateString(String(val));
        if (p) return p;
      }
    }

    // fallback: try Date.parse on whole record string
    try {
      const str = JSON.stringify(rec);
      const p = tryParseDateString(str);
      if (p) return p;
    } catch (e) {
      // ignore
    }

    return null;
  };

  // helper: try parsing flexible date strings (ISO, yyyy-mm-dd, dd/mm/yyyy, epoch tokens)
  const tryParseDateString = (s) => {
    if (!s) return null;
    const str = String(s).trim();

    // ISO first
    const iso = Date.parse(str);
    if (!Number.isNaN(iso)) return new Date(iso);

    // find epoch token
    const epochMatch = str.match(/(^|\D)(\d{10,13})(\D|$)/);
    if (epochMatch) {
      const digits = epochMatch[2];
      const n = Number(digits);
      if (digits.length === 10) return new Date(n * 1000);
      return new Date(n);
    }

    // try dd/mm/yyyy or dd-mm-yyyy or mm/dd/yyyy heuristic (prefer day-first if ambiguous)
    const parts = str.split(/\s+/);
    const datePart = parts[0];
    const timePart = parts.slice(1).join(" ");

    const dmy = datePart.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
    if (dmy) {
      let a = Number(dmy[1]);
      let b = Number(dmy[2]);
      let c = String(dmy[3]);
      if (c.length === 2) c = "20" + c;
      let day, month, year;
      if (a > 12) {
        day = String(a).padStart(2, "0");
        month = String(b).padStart(2, "0");
      } else if (b > 12) {
        month = String(a).padStart(2, "0");
        day = String(b).padStart(2, "0");
      } else {
        // ambiguous: prefer day-first
        day = String(a).padStart(2, "0");
        month = String(b).padStart(2, "0");
      }
      year = String(c);
      const isoLike = `${year}-${month}-${day}` + (timePart ? ` ${timePart}` : "");
      const parsed = Date.parse(isoLike);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    // yyyy-mm-dd
    const ymd = datePart.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (ymd) {
      const isoLike =
        `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}` +
        (timePart ? ` ${timePart}` : "");
      const parsed = Date.parse(isoLike);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }

    // last resort
    const last = Date.parse(str);
    if (!Number.isNaN(last)) return new Date(last);

    return null;
  };

  /* ----------------- filtering & pagination (use getRecordDate) ----------------- */
  const viewData = useMemo(() => {
    if (!activeFilter) return history;
    const { from, to } = activeFilter;
    return history.filter((rec) => {
      const d = getRecordDate(rec);
      if (!d) return false;
      return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
    });
  }, [history, activeFilter]);

  const totalItems = viewData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]); // eslint-disable-line

  const paginatedData = viewData.slice((page - 1) * pageSize, page * pageSize);

  const goToPage = (p) => {
    const pn = Math.max(1, Math.min(totalPages, Number(p) || 1));
    setPage(pn);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ----------------- summaries ----------------- */
  // Total litres across entire history (backend data) — safer than relying on filtering-side date parsing
  const totalLitres = useMemo(() => {
    return history.reduce(
      (sum, r) =>
        sum +
        parseNumberField(r, [
          "Litres Consumed",
          "Litres",
          "litres_consumed",
          "litres",
          "litre",
          "liter",
          "volume",
        ]),
      0
    );
  }, [history]);

  const isSameLocalDay = (dateA, dateB) =>
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate();

  // === UPDATED: Today's litres computed from history (based on local day).
  // Uses getRecordDate first; if that returns null it attempts to combine Date + Time fields and parse.
  const todaysLitres = useMemo(() => {
    const nowLocal = new Date();
    return history.reduce((sum, r) => {
      let d = getRecordDate(r);

      // If parsing failed, attempt to construct from date/time fields explicitly
      if (!d) {
        const df = getField(r, ["Date", "date", "TxnDate"]);
        const tf = getField(r, ["Time", "time", "TxnTime"]);
        if (df && df !== "—") {
          const combined = tf && tf !== "—" ? `${String(df).trim()} ${String(tf).trim()}` : String(df).trim();
          d = tryParseDateString(combined);
        }
      }

      if (!d) return sum;
      if (isSameLocalDay(d, nowLocal)) {
        return (
          sum +
          parseNumberField(r, [
            "Litres Consumed",
            "Litres",
            "litres_consumed",
            "litres",
            "litre",
            "liter",
            "volume",
          ])
        );
      }
      return sum;
    }, 0);
  }, [history]);

  /* ----------------- download last 30 days CSV ----------------- */
  const downloadLast30CSV = () => {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 30);

    const last30 = history.filter((r) => {
      const d = getRecordDate(r);
      return d && d >= from && d <= today;
    });

    if (!last30.length) {
      alert("No data for the last 30 days.");
      return;
    }

    const headers = Array.from(new Set(last30.flatMap((o) => Object.keys(o))));
    const csvRows = [headers.join(",")];
    last30.forEach((r) => csvRows.push(headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")));

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RFID_Last30Days_${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadOpen(false);
  };

  /* ----------------- filter handlers ----------------- */
  const openFilter = () => {
    if (activeFilter) {
      setFilterFrom(activeFilter.from.toISOString().slice(0, 10));
      setFilterTo(activeFilter.to.toISOString().slice(0, 10));
    } else {
      setFilterFrom("");
      setFilterTo("");
    }
    setFilterOpen(true);
  };

  const applyFilter = (e) => {
    e.preventDefault();
    if (!filterFrom && !filterTo) {
      setActiveFilter(null);
      setFilterOpen(false);
      setPage(1);
      return;
    }
    let from = filterFrom ? new Date(filterFrom + "T00:00:00") : new Date(0);
    let to = filterTo ? new Date(filterTo + "T23:59:59.999") : new Date(8640000000000000);
    if (from > to) [from, to] = [to, from];
    setActiveFilter({ from, to });
    setFilterOpen(false);
    setPage(1);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setFilterFrom("");
    setFilterTo("");
    setFilterOpen(false);
    setPage(1);
  };

  const fmtDate = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${year}-${m}-${dd}`;
  };

  /* ----------------- render ----------------- */
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

  // Filter button label: show selected range if active
  const filterButtonLabel = activeFilter
    ? `🔎 Filter (${fmtDate(activeFilter.from)} → ${fmtDate(activeFilter.to)})`
    : "🔎 Filter";

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <button style={styles.backBtn} onClick={() => navigate(-1)}>
              ← Back
            </button>

            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <button
                onClick={openFilter}
                style={styles.filterBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(37,99,235,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.12)";
                }}
                title="Filter by date range"
              >
                {filterButtonLabel}
              </button>

              <button
                onClick={() => setDownloadOpen(true)}
                style={styles.downloadBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(5,150,105,0.18)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(5,150,105,0.12)";
                }}
                title="Download last 30 days CSV"
              >
                ⬇️ Download
              </button>
            </div>
          </div>

          <h2 style={styles.heading}>RFID Card History</h2>

          <div style={styles.cardsRow}>
            <div
              style={styles.summaryCardLight}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(96,165,250,0.18)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
              }}
            >
              <div style={{ fontSize: 15 }}>Today's Litres Consumed</div>
              <div style={{ fontSize: 24, marginTop: 8, fontWeight: 800 }}>{todaysLitres.toFixed(2)} L</div>
            </div>

            <div
              style={styles.summaryCardGreen}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 12px 30px rgba(34,197,94,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
              }}
            >
              <div style={{ fontSize: 15 }}>Total Litres Consumed</div>
              <div style={{ fontSize: 24, marginTop: 8, fontWeight: 800 }}>{totalLitres.toFixed(2)} L</div>
            </div>
          </div>

          {loading && <div style={styles.empty}>Loading data...</div>}
          {!loading && error && <div style={{ color: "red", textAlign: "center", marginBottom: 12 }}>{error}</div>}

          {!loading && !error && (
            <>
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
                    {paginatedData.length > 0 ? (
                      paginatedData.map((item, i) => {
                        const index = (page - 1) * pageSize + i + 1;
                        const rfid = getField(item, ["RFID_UID", "RFID UID", "rfid_uid", "uid", "RFID"]);
                        const deviceId = getField(item, ["Device Id", "DeviceId", "device_id", "device"]);
                        const remaining = getField(item, [
                          "Remaining Card Balance",
                          "RemainingBalance",
                          "remaining_card_balance",
                          "remaining",
                        ]);
                        const litres = getField(item, ["Litres Consumed", "Litres", "litres_consumed", "litres", "litre", "liter", "volume"]);
                        const amount = getField(item, ["Amount Debited", "AmountDebited", "amount_debited", "amount"]);
                        const price = getField(item, ["Price Per Litre", "PricePerLitre", "price_per_litre", "price"]);
                        const dateField = getField(item, ["Date", "date", "dateTime", "DateTime", "TxnDate"]);
                        const timeField = getField(item, ["Time", "time", "TxnTime"]);
                        const dateStr = dateField || "—";
                        const timeStr = timeField || "—";

                        return (
                          <tr key={i}>
                            <td style={styles.td}>{index}</td>
                            <td style={styles.td}>{rfid}</td>
                            <td style={styles.td}>{deviceId}</td>
                            <td style={styles.td}>{safeNum(remaining)}</td>
                            <td style={styles.td}>{dateStr}</td>
                            <td style={styles.td}>{timeStr}</td>
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

              {/* Pagination */}
              {totalItems > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ color: "#6b7280" }}>Show</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                    >
                      {[10, 20, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span style={{ color: "#6b7280" }}>of {totalItems} items</span>
                  </div>

                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => goToPage(1)} disabled={page === 1} style={pageBtn(page === 1)}>
                      First
                    </button>
                    <button onClick={() => goToPage(page - 1)} disabled={page === 1} style={pageBtn(page === 1)}>
                      Prev
                    </button>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {getPageButtons(totalPages, page).map((p, idx) =>
                        p === "left-ellipsis" || p === "right-ellipsis" ? (
                          <div key={p + idx} style={{ padding: "8px 12px", color: "#9aa4b2" }}>
                            …
                          </div>
                        ) : (
                          <button key={p} onClick={() => goToPage(p)} style={p === page ? styles.activePageBtn : pageBtn(false)}>
                            {p}
                          </button>
                        )
                      )}
                    </div>

                    <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} style={pageBtn(page === totalPages)}>
                      Next
                    </button>
                    <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} style={pageBtn(page === totalPages)}>
                      Last
                    </button>

                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <label style={{ color: "#6b7280" }}>Go to</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={page}
                        onChange={(e) => goToPage(Number(e.target.value))}
                        style={{ width: 70, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 8 }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filter Modal (glassy) */}
      {filterOpen && (
        <GlassModal onClose={() => setFilterOpen(false)}>
          <h3 style={{ textAlign: "center", color: "#1e293b" }}>🗓 Filter by Date</h3>
          <form onSubmit={applyFilter} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 13, color: "#374151" }}>
              From
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} style={styles.input} />
            </label>

            <label style={{ fontSize: 13, color: "#374151" }}>
              To
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} style={styles.input} />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={() => setFilterOpen(false)} style={styles.btnNeutral}>
                Cancel
              </button>
              <button type="button" onClick={clearFilter} style={styles.btnDanger}>
                Clear
              </button>
              <button type="submit" style={styles.btnPrimary}>
                Apply
              </button>
            </div>
          </form>
        </GlassModal>
      )}

      {/* Download Modal */}
      {downloadOpen && (
        <GlassModal onClose={() => setDownloadOpen(false)}>
          <h3 style={{ textAlign: "center", color: "#1e293b" }}>⬇️ Download 30 Days Data</h3>
          <p style={{ textAlign: "center", marginBottom: 20 }}>
            This is your 30 Days data from{" "}
            <b>{new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}</b> to{" "}
            <b>{new Date().toISOString().slice(0, 10)}</b>.
          </p>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button onClick={downloadLast30CSV} style={styles.gradientDownloadBtn}>
              ⬇️ Download CSV
            </button>
          </div>
        </GlassModal>
      )}
    </div>
  );
}

/* ----------------- pagination helpers, modal, styles ----------------- */

function getPageButtons(totalPages, currentPage) {
  const pages = [];
  const maxButtons = 7;
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  pages.push(1);
  if (start > 2) pages.push("left-ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push("right-ellipsis");
  pages.push(totalPages);
  return pages;
}

const pageBtn = (disabled) => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: disabled ? "#f9fafb" : "#fff",
  color: disabled ? "#9ca3af" : "#111827",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 700,
});

function GlassModal({ children, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(2,6,23,0.5)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        zIndex: 1200,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 460,
          maxWidth: "96%",
          background: "rgba(255,255,255,0.95)",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 12px 40px rgba(2,6,23,0.28)",
          animation: "fadeIn 0.18s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const styles = {
  page: { padding: "10px 20px 30px", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Roboto, Arial" },
  container: { maxWidth: 1200, margin: "0 auto" },
  card: { background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(20,30,60,0.06)" },
  backBtn: { background: "#0b74ff", color: "#fff", border: "none", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 700 },
  heading: { textAlign: "center", marginBottom: 8, fontSize: 26, fontWeight: 800, color: "#1e293b", letterSpacing: "0.4px" },
  cardsRow: { display: "flex", justifyContent: "center", gap: 20, marginTop: -6, marginBottom: 12, flexWrap: "wrap" },
  summaryCardLight: { flex: "0 0 260px", padding: "16px 18px", borderRadius: 12, background: "linear-gradient(135deg,#e0f2fe,#bfdbfe)", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", textAlign: "center", fontWeight: 700, transition: "transform 0.18s ease, box-shadow 0.18s ease" },
  summaryCardGreen: { flex: "0 0 260px", padding: "16px 18px", borderRadius: 12, background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", textAlign: "center", fontWeight: 700, transition: "transform 0.18s ease, box-shadow 0.18s ease" },
  tableWrap: { overflowX: "auto", borderRadius: 8, border: "1px solid #e6e8ea" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: { padding: 12, background: "#0b74ff", color: "#fff", textAlign: "center", fontWeight: 700 },
  td: { padding: 10, textAlign: "center", borderBottom: "1px solid #f1f5f9", color: "#111827", fontSize: 14 },
  empty: { padding: 24, textAlign: "center", color: "#6b7280", fontStyle: "italic" },
  filterBtn: { background: "linear-gradient(135deg,#2563eb,#3b82f6)", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 6px 20px rgba(37,99,235,0.12)", transition: "transform 0.18s ease, box-shadow 0.18s ease" },
  downloadBtn: { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 14px", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 6px 20px rgba(5,150,105,0.12)", transition: "transform 0.18s ease, box-shadow 0.18s ease" },
  input: { width: "100%", padding: "8px 10px", marginTop: 6, borderRadius: 8, border: "1px solid #d1d5db" },
  btnPrimary: { padding: "8px 12px", borderRadius: 8, background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 },
  btnNeutral: { padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid #e5e7eb", cursor: "pointer", fontWeight: 700 },
  btnDanger: { padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid #fca5a5", color: "#dc2626", cursor: "pointer", fontWeight: 700 },
  gradientDownloadBtn: { background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 12, cursor: "pointer", fontWeight: 700, boxShadow: "0 8px 26px rgba(5,150,105,0.14)" },
  activePageBtn: { padding: "8px 12px", borderRadius: 8, background: "linear-gradient(135deg,#6c5ce7,#4f46e5)", color: "#fff", border: "none", fontWeight: 700 },
};
