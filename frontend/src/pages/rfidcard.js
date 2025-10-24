// src/pages/rfidcard.js
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

function RfidCard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    // prefer rfid_uid (non-empty) otherwise fallback to _id
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
    <div className="page-wrapper">
      <div className="page-container">
        <div className="card-panel">
          <div className="page-header">
            <div className="header-left">
              <input
                className="search-input"
                placeholder="🔍 Search by name, mobile, village, RFID UID or Serial No..."
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>

            <div className="header-center">
              <h2 className="page-title">Registered RFID Users</h2>
            </div>

            <div className="header-right">
              <button
                className="btn btn-primary btn-small"
                onClick={handleDownload}
                disabled={loading}
              >
                <i className="fas fa-download"></i>
                Download CSV
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
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
                          title="View history for this RFID UID"
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
                          >
                            <i className="fas fa-edit"></i>
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDelete(r._id)}
                            disabled={loading}
                          >
                            <i className="fas fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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