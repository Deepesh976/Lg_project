import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function RfidCard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const styles = {
    page: {
      padding: "20px",
      background: "#f5f7fb",
      minHeight: "100vh",
      fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    },
    container: { maxWidth: "1300px", margin: "0 auto" }, // increased container width
    card: {
      background: "#ffffff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 6px 18px rgba(20,30,60,0.06)",
      marginTop: 18,
    },
    header: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
      flexWrap: "wrap",
    },
    headerLeft: { display: "flex", gap: 8, alignItems: "center", flex: 1 },
    headerCenter: { display: "flex", justifyContent: "center", flex: 1 },
    headerRight: { display: "flex", justifyContent: "flex-end", gap: 8, flex: 1 },
    title: {
      fontSize: 22,
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
      letterSpacing: 0.3,
    },
    searchBox: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #d1d5db",
      minWidth: 260,
      outline: "none",
      fontSize: 14,
    },
    downloadBtn: {
      background: "#0b74ff",
      color: "#fff",
      border: "none",
      padding: "9px 14px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 600,
    },
    tableWrap: {
      overflowX: "auto",
      borderRadius: 8,
      border: "1px solid #e6e8ea",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 900, // increased minWidth for more space per column
    },
    thead: { background: "#0b74ff", color: "#fff" },
    th: {
      padding: "1px 1px",
      textAlign: "center",
      fontWeight: 800,
      fontSize: 14,
      borderRight: "1px solid rgba(255,255,255,0.12)",
      whiteSpace: "normal",
      overflowWrap: "break-word",
      wordBreak: "break-word",
      minWidth: 110, // each column slightly wider
    },
    td: {
      padding: "12px 10px",
      textAlign: "center",
      color: "#111827",
      fontSize: 14,
      borderBottom: "1px solid #f1f5f9",
      whiteSpace: "normal",
      overflowWrap: "break-word",
      wordBreak: "break-word",
      minWidth: 100,
    },
    rowEven: { background: "#fff" },
    rowOdd: { background: "#fbfdff" },
    clickableRfid: {
      color: "#0b74ff",
      cursor: "pointer",
      background: "transparent",
      border: "none",
      padding: "6px 8px",
      fontSize: "inherit",
      fontWeight: 700,
      borderRadius: 8,
    },
    actionBtn: {
      padding: "6px 10px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontWeight: 700,
    },
    editBtn: { background: "#10b981", color: "#fff", marginRight: 6 },
    delBtn: { background: "#ef4444", color: "#fff" },
    emptyRow: {
      padding: 28,
      textAlign: "center",
      color: "#6b7280",
      fontStyle: "italic",
    },
    disabledBtn: {
      opacity: 0.6,
      cursor: "not-allowed",
    },
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

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/rfid");

      let data = [];
      if (Array.isArray(res.data)) data = res.data;
      else if (Array.isArray(res.data.items)) data = res.data.items;
      else if (Array.isArray(res.data.data)) data = res.data.data;
      else if (Array.isArray(res.data.records)) data = res.data.records;
      else if (res.data && typeof res.data === "object") {
        const arr = Object.values(res.data).find((v) => Array.isArray(v));
        data = arr || [];
      }

      setRecords(data);
      setFilteredRecords(data);
    } catch (err) {
      console.error("Fetch Error:", err);
      alert("Failed to load RFID records. See console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSearch = (e) => {
    const q = (e.target.value || "").toLowerCase();
    setSearchQuery(q);
    if (!q) {
      setFilteredRecords(records);
      return;
    }
    const filtered = records.filter((r) => {
      return (
        (r.user_name || "").toString().toLowerCase().includes(q) ||
        (r.mobile_no || "").toString().toLowerCase().includes(q) ||
        (r.village || "").toString().toLowerCase().includes(q) ||
        (r.rfid_uid || "").toString().toLowerCase().includes(q) ||
        (r.rfid_serial_no || "").toString().toLowerCase().includes(q)
      );
    });
    setFilteredRecords(filtered);
  };

  const handleEditNavigate = (rec) => {
    navigate(`/editrfidcard/${rec._id}`, { state: rec });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      setLoading(true);
      await axios.delete(`/api/rfid/${id}`);
      const updated = records.filter((r) => r._id !== id);
      setRecords(updated);
      setFilteredRecords(updated);
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = (rec) => {
    const uid =
      rec && rec.rfid_uid && String(rec.rfid_uid).trim() !== ""
        ? rec.rfid_uid
        : rec._id;
    navigate(`/rfidhistory/${encodeURIComponent(uid)}`, { state: { record: rec } });
  };

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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <input
                placeholder="🔍 Search by name, mobile, village, RFID UID or Serial No..."
                value={searchQuery}
                onChange={handleSearch}
                style={styles.searchBox}
              />
            </div>

            <div style={styles.headerCenter}>
              <h2 style={styles.title}>Registered RFID Users</h2>
            </div>

            <div style={styles.headerRight}>
              <button
                style={styles.downloadBtn}
                onClick={handleDownload}
                disabled={loading}
              >
                ⬇️ Download CSV
              </button>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  {columns.map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!filteredRecords || filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={styles.emptyRow}>
                      {loading ? "Loading records..." : "No records found"}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, i) => {
                    const rowStyle = i % 2 === 0 ? styles.rowEven : styles.rowOdd;
                    return (
                      <tr key={r._id || i} style={rowStyle}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>{r.rfid_serial_no || "—"}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleViewHistory(r)}
                            style={styles.clickableRfid}
                            title="View history for this RFID UID"
                          >
                            {r.rfid_uid || "—"}
                          </button>
                        </td>
                        <td style={styles.td}>{r.user_name || "—"}</td>
                        <td style={styles.td}>{r.address || "—"}</td>
                        <td style={styles.td}>{r.village || "—"}</td>
                        <td style={styles.td}>{r.aadhar_no || "—"}</td>
                        <td style={styles.td}>{r.mobile_no || "—"}</td>
                        <td style={styles.td}>{r.family_mems ?? "—"}</td>
                        <td style={styles.td}>{r.quant_water_alloted_per_day ?? "—"}</td>
                        <td style={styles.td}>{r.quant_water_alloted_per_month ?? "—"}</td>
                        <td style={styles.td}>{r.swipe_count ?? "—"}</td>
                        <td style={styles.td}>{r.total_litres_consumed ?? "—"}</td>
                        <td style={styles.td}>{r.remaining_card_balance ?? "—"}</td>
                        <td style={styles.td}>{r.remarks || "—"}</td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.actionBtn, ...styles.editBtn }}
                            onClick={() => handleEditNavigate(r)}
                            disabled={loading}
                          >
                            Edit
                          </button>
                          <button
                            style={{ ...styles.actionBtn, ...styles.delBtn }}
                            onClick={() => handleDelete(r._id)}
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RfidCard;
