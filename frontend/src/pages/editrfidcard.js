// EditRfidCard.js
import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function EditRfidCard() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    rfidSerial: "",
    rfidUhd: "",
    name: "",
    address: "",
    village: "",
    aadhar: "",
    mobile: "",
    members: "",
    qtyPerDay: "",
    qtyPerMonth: "",
    visitsPerMonth: "",
    qtyUsedMonth: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ Field labels
  const labels = {
    rfidSerial: "RFID Card Serial Number",
    rfidUhd: "RFID Card UID / Number",
    name: "Full Name",
    address: "Address",
    village: "Village Name",
    aadhar: "Aadhar Number",
    mobile: "Mobile Number",
    members: "Number of Family Members",
    qtyPerDay: "Water Quantity Per Day (L)",
    qtyPerMonth: "Water Quantity Per Month (L)",
    visitsPerMonth: "Visits Per Month",
    qtyUsedMonth: "Quantity Used This Month (L)",
    remarks: "Remarks / Notes",
  };

  useEffect(() => {
    if (state && typeof state === "object" && Object.keys(state).length) {
      setForm((prev) => ({ ...prev, ...state }));
    }
    fetchRecord();
  }, [id]);

  const fetchRecord = async () => {
    if (!id) {
      setError("Missing ID in URL.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`/api/rfid/${id}`);
      if (!res?.data) {
        setError("Record not found.");
      } else {
        setForm({
          rfidSerial: res.data.rfidSerial || "",
          rfidUhd: res.data.rfidUhd || "",
          name: res.data.name || "",
          address: res.data.address || "",
          village: res.data.village || "",
          aadhar: res.data.aadhar || "",
          mobile: res.data.mobile || "",
          members: res.data.members || "",
          qtyPerDay: res.data.qtyPerDay || "",
          qtyPerMonth: res.data.qtyPerMonth || "",
          visitsPerMonth: res.data.visitsPerMonth || "",
          qtyUsedMonth: res.data.qtyUsedMonth || "",
          remarks: res.data.remarks || "",
        });
      }
    } catch (err) {
      console.error("fetchRecord error:", err);
      setError(err.response ? `Server error: ${err.response.statusText}` : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/api/rfid/${id}`, form);
      alert("Record updated successfully!");
      navigate("/rfidcard");
    } catch (err) {
      console.error("Update error:", err);
      alert("Failed to update record.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      setLoading(true);
      await axios.delete(`/api/rfid/${id}`);
      alert("Record deleted successfully!");
      navigate("/rfidcard");
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete record.");
    } finally {
      setLoading(false);
    }
  };

  // === Inline Styles ===
  const styles = {
    container: {
      padding: "5px",
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "Segoe UI, sans-serif",
    },
    form: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "20px",
      padding: "50px",
      borderRadius: "10px",
      background: "#fff",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    },
    labelContainer: {
      display: "flex",
      flexDirection: "column",
      textAlign: "left",
    },
    label: {
      fontWeight: "600",
      marginBottom: "6px",
      color: "#333",
    },
    input: {
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      fontSize: "14px",
      width: "95%",
      textAlign: "center",
    },
    btnPrimary: {
      backgroundColor: "#007bff",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      padding: "10px 20px",
      cursor: "pointer",
      fontWeight: "600",
    },
    btnDanger: {
      backgroundColor: "#dc3545",
      color: "#fff",
      border: "none",
      borderRadius: "6px",
      padding: "10px 20px",
      cursor: "pointer",
      fontWeight: "600",
    },
    actions: {
      gridColumn: "1 / -1",
      display: "flex",
      justifyContent: "center",
      gap: "10px",
      marginTop: "10px",
    },
    error: {
      color: "#b00020",
      marginBottom: "12px",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: "center" }}>Edit RFID Record</h2>

      {loading && <div style={{ textAlign: "center" }}>Loading record...</div>}

      {!loading && error && <div style={styles.error}>{error}</div>}

      {!loading && !error && (
        <form style={styles.form} onSubmit={handleUpdate}>
          {Object.keys(form).map((key) => (
            <div key={key} style={styles.labelContainer}>
              <label htmlFor={key} style={styles.label}>
                {labels[key] || key}
              </label>
              <input
                id={key}
                type={
                  key.includes("qty") || key === "members" || key === "visitsPerMonth"
                    ? "number"
                    : "text"
                }
                name={key}
                value={form[key] || ""}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          ))}

          <div style={styles.actions}>
            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? "Updating..." : "Update Record"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              style={styles.btnDanger}
              disabled={loading}
            >
              Delete
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default EditRfidCard;
