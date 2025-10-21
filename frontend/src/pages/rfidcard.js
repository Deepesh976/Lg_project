import React, { useEffect, useState } from "react";
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
    container: { maxWidth: "1200px", margin: "0 auto" },
    card: {
      background: "#ffffff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 6px 18px rgba(20,30,60,0.06)",
      marginTop: 18,
    },
    headerRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      marginBottom: 18,
      flexWrap: "wrap",
    },
    title: {
      flex: 1,
      textAlign: "center",
      fontSize: 22,
      fontWeight: 700,
      color: "#1f2937",
      margin: 0,
    },
    leftControls: { display: "flex", gap: 8, alignItems: "center" },
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
      minWidth: 1300,
    },
    thead: { background: "#0b74ff", color: "#fff" },
    th: {
      padding: "12px 10px",
      textAlign: "center",
      fontWeight: 800,
      fontSize: 14,
      borderRight: "1px solid rgba(255,255,255,0.12)",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px 10px",
      textAlign: "center",
      color: "#111827",
      fontSize: 14,
      borderBottom: "1px solid #f1f5f9",
      whiteSpace: "nowrap",
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
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/rfid");
      const data = Array.isArray(res.data) ? res.data : [];
      setRecords(data);
      setFilteredRecords(data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const q = e.target.value.toLowerCase();
    setSearchQuery(q);
    if (!q) {
      setFilteredRecords(records);
      return;
    }
    const filtered = records.filter(
      (r) =>
        r.user_name?.toLowerCase().includes(q) ||
        r.mobile_no?.toString().includes(q) ||
        r.village?.toLowerCase().includes(q) ||
        r.rfid_uid?.toLowerCase().includes(q) ||
        r.rfid_serial_no?.toLowerCase().includes(q)
    );
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
    navigate(`/rfidhistory/${rec._id}`, { state: rec });
  };

  const handleDownload = () => {
    if (filteredRecords.length === 0) {
      alert("No records to download!");
      return;
    }

    const headers = [
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
      "Swipe Count",
      "Used (L)",
      "Allotment",
      "Remarks",
    ];
    const csvRows = [headers.join(",")];

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
        r.quant_water_used_in_month ?? "",
        `"${(r.allotment || "").replace(/"/g, '""')}"`,
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
          <div style={styles.headerRow}>
            <div style={styles.leftControls}>
              <input
                placeholder="🔍 Search by name, mobile, village, RFID UID or Serial No..."
                value={searchQuery}
                onChange={handleSearch}
                style={styles.searchBox}
              />
              <button style={styles.downloadBtn} onClick={handleDownload}>
                ⬇️ Download CSV
              </button>
            </div>

            <h2 style={styles.title}>Registered RFID Users</h2>
            <div style={{ width: 120 }} />
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  {[
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
                    "Swipe Count",
                    "Used (L)",
                    "Allotment",
                    "Remarks",
                    "Action",
                  ].map((h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={16} style={styles.emptyRow}>
                      {loading ? "Loading records..." : "No records found"}
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, i) => {
                    const rowStyle = i % 2 === 0 ? styles.rowEven : styles.rowOdd;
                    return (
                      <tr key={r._id} style={rowStyle}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>{r.rfid_serial_no || "—"}</td>
                        <td style={styles.td}>
                          <button
                            onClick={() => handleViewHistory(r)}
                            style={styles.clickableRfid}
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
                        <td style={styles.td}>{r.quant_water_used_in_month ?? "—"}</td>
                        <td style={styles.td}>{r.allotment || "—"}</td>
                        <td style={styles.td}>{r.remarks || "—"}</td>
                        <td style={styles.td}>
                          <button
                            style={{ ...styles.actionBtn, ...styles.editBtn }}
                            onClick={() => handleEditNavigate(r)}
                          >
                            Edit
                          </button>
                          <button
                            style={{ ...styles.actionBtn, ...styles.delBtn }}
                            onClick={() => handleDelete(r._id)}
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
