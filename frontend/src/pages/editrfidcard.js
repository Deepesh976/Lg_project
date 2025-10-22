// src/pages/editrfidcard.js
import React, { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import axios from "axios";

function EditRfidCard() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const allowedFields = [
    "rfid_serial_no",
    "rfid_uid",
    "user_name",
    "address",
    "village",
    "aadhar_no",
    "mobile_no",
    "family_mems",
    "quant_water_alloted_per_day",
    "quant_water_alloted_per_month",
    "swipe_count",
    "total_litres_consumed",
    "remaining_card_balance",
    "remarks",
  ];

  const [form, setForm] = useState({
    rfid_serial_no: "",
    rfid_uid: "",
    user_name: "",
    address: "",
    village: "",
    aadhar_no: "",
    mobile_no: "",
    family_mems: "",
    quant_water_alloted_per_day: "",
    quant_water_alloted_per_month: "",
    swipe_count: "",
    total_litres_consumed: "",
    remaining_card_balance: "",
    remarks: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Label map for display
  const labels = {
    rfid_serial_no: "RFID Card Serial Number",
    rfid_uid: "RFID UID",
    user_name: "Full Name",
    address: "Address",
    village: "Village",
    aadhar_no: "Aadhar Number",
    mobile_no: "Mobile Number",
    family_mems: "Number of Family Members",
    quant_water_alloted_per_day: "Water / Day (L)",
    quant_water_alloted_per_month: "Water / Month (L)",
    swipe_count: "No of Times Visited",
    total_litres_consumed: "Total Litres Consumed (L)",
    remaining_card_balance: "Remaining Card Balance (₹)",
    remarks: "Remarks / Notes",
  };

  // Fetch record on mount or prefill from navigation state (but only allowed fields)
  useEffect(() => {
    if (state && typeof state === "object" && Object.keys(state).length) {
      // filter the incoming state to only allowed fields (prevents copying _id, __v, createdAt, allotment, etc.)
      const filtered = {};
      allowedFields.forEach((k) => {
        if (state[k] !== undefined) filtered[k] = state[k];
      });
      setForm((prev) => ({ ...prev, ...filtered }));
      setLoading(false);
    } else {
      fetchRecord();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const d = res.data;
        // Map only the allowed fields explicitly (ignore _id, createdAt, updatedAt, __v, allotment)
        setForm({
          rfid_serial_no: d.rfid_serial_no || "",
          rfid_uid: d.rfid_uid || "",
          user_name: d.user_name || "",
          address: d.address || "",
          village: d.village || "",
          aadhar_no: d.aadhar_no || "",
          mobile_no: d.mobile_no || "",
          family_mems: d.family_mems ?? "",
          quant_water_alloted_per_day: d.quant_water_alloted_per_day ?? "",
          quant_water_alloted_per_month: d.quant_water_alloted_per_month ?? "",
          swipe_count: d.swipe_count ?? "",
          total_litres_consumed: d.total_litres_consumed ?? "",
          remaining_card_balance: d.remaining_card_balance ?? "",
          remarks: d.remarks || "",
        });
      }
    } catch (err) {
      console.error("fetchRecord error:", err);
      setError(err?.response ? `Server error: ${err.response.statusText}` : "Network error");
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

      // Prepare payload with proper number conversions (only allowed fields)
      const payload = {
        rfid_serial_no: (form.rfid_serial_no || "").trim(),
        rfid_uid: (form.rfid_uid || "").trim(),
        user_name: (form.user_name || "").trim(),
        address: (form.address || "").trim(),
        village: (form.village || "").trim(),
        aadhar_no: (form.aadhar_no || "").toString().trim(),
        mobile_no: (form.mobile_no || "").toString().trim(),
        family_mems: Number(form.family_mems) || 0,
        quant_water_alloted_per_day: Number(form.quant_water_alloted_per_day) || 0,
        quant_water_alloted_per_month: Number(form.quant_water_alloted_per_month) || 0,
        swipe_count: Number(form.swipe_count) || 0,
        total_litres_consumed: Number(form.total_litres_consumed) || 0,
        remaining_card_balance: Number(form.remaining_card_balance) || 0,
        remarks: (form.remarks || "").trim(),
      };

      await axios.put(`/api/rfid/${id}`, payload);
      alert("RFID record updated successfully!");
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

  // === Styles ===
  const styles = {
    container: {
      padding: "20px",
      maxWidth: "900px",
      margin: "0 auto",
      fontFamily: "Segoe UI, sans-serif",
    },
    form: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: "20px",
      padding: "30px",
      borderRadius: "10px",
      background: "#fff",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
    labelContainer: { display: "flex", flexDirection: "column", textAlign: "left" },
    label: { fontWeight: "600", marginBottom: "6px", color: "#333" },
    input: {
      padding: "10px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      fontSize: "14px",
      width: "95%",
      textAlign: "center",
    },
    btnPrimary: {
      backgroundColor: "#0b74ff",
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
    error: { color: "#b00020", marginBottom: "12px", textAlign: "center" },
  };

  return (
    <div style={styles.container}>
      <h2 style={{ textAlign: "center" }}>Edit RFID Record</h2>

      {loading && <div style={{ textAlign: "center" }}>Loading record...</div>}

      {!loading && error && <div style={styles.error}>{error}</div>}

      {!loading && !error && (
        <form style={styles.form} onSubmit={handleUpdate}>
          {allowedFields.map((key) => (
            <div key={key} style={styles.labelContainer}>
              <label htmlFor={key} style={styles.label}>
                {labels[key] || key}
              </label>
              <input
                id={key}
                type={
                  [
                    "family_mems",
                    "quant_water_alloted_per_day",
                    "quant_water_alloted_per_month",
                    "swipe_count",
                    "total_litres_consumed",
                    "remaining_card_balance",
                  ].includes(key)
                    ? "number"
                    : "text"
                }
                name={key}
                value={form[key] ?? ""}
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
