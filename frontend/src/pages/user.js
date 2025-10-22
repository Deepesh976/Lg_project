// src/pages/user.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const styles = {
  page: {
    padding: 20,
    background: "#f5f7fb",
    minHeight: "100vh",
    fontFamily: "Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    display: "flex",
    justifyContent: "center",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    boxShadow: "0 6px 18px rgba(20,30,60,0.08)",
    width: "100%",
    maxWidth: 900,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  formRow: {
    display: "flex",
    gap: 20,
    flexWrap: "wrap",
  },
  formGroup: {
    flex: "1 1 45%",
    display: "flex",
    flexDirection: "column",
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    outline: "none",
  },
  actions: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 10,
  },
  submitBtn: {
    background: "#0b74ff",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },
  resetBtn: {
    background: "#f3f4f6",
    color: "#111",
    border: "1px solid #e5e7eb",
    padding: "10px 18px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 15,
  },
};

export default function User() {
  const navigate = useNavigate();

  const initialForm = {
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
  };

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!form.user_name?.trim() || !String(form.mobile_no || "").trim()) {
      alert("Please provide user name and mobile number.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        rfid_serial_no: (form.rfid_serial_no || "").trim(),
        rfid_uid: (form.rfid_uid || "").trim(),
        user_name: (form.user_name || "").trim(),
        address: (form.address || "").trim(),
        village: (form.village || "").trim(),
        aadhar_no: form.aadhar_no !== undefined ? String(form.aadhar_no).trim() : "",
        mobile_no: form.mobile_no !== undefined ? String(form.mobile_no).trim() : "",
        family_mems: form.family_mems ? Number(form.family_mems) : 0,
        quant_water_alloted_per_day: form.quant_water_alloted_per_day
          ? Number(form.quant_water_alloted_per_day)
          : 0,
        quant_water_alloted_per_month: form.quant_water_alloted_per_month
          ? Number(form.quant_water_alloted_per_month)
          : 0,
        swipe_count: form.swipe_count ? Number(form.swipe_count) : 0,
        // NEW field name used consistently with backend/model
        total_litres_consumed: form.total_litres_consumed
          ? Number(form.total_litres_consumed)
          : 0,
        remaining_card_balance: form.remaining_card_balance
          ? Number(form.remaining_card_balance)
          : 0,
        remarks: (form.remarks || "").trim(),
      };

      await axios.post("/api/rfid", payload);

      // Navigate back to rfid list and request refresh
      navigate("/rfidcard", { state: { refresh: true } });
    } catch (err) {
      console.error("Error creating RFID/user:", err?.response || err?.message || err);
      const msg = err?.response?.data?.message || "Failed to create user";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Add User Details</h2>

        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            {/* Left column */}
            <div style={styles.formGroup}>
              <label style={styles.label}>RFID Serial No *</label>
              <input
                style={styles.input}
                name="rfid_serial_no"
                value={form.rfid_serial_no}
                onChange={handleChange}
                placeholder="Enter Serial no"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>RFID UID *</label>
              <input
                style={styles.input}
                name="rfid_uid"
                value={form.rfid_uid}
                onChange={handleChange}
                placeholder="Enter UID"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Username *</label>
              <input
                style={styles.input}
                name="user_name"
                value={form.user_name}
                onChange={handleChange}
                placeholder="Enter user name"
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Mobile *</label>
              <input
                style={styles.input}
                name="mobile_no"
                value={form.mobile_no}
                onChange={handleChange}
                placeholder="Enter mobile number"
                required
                type="tel"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input
                style={styles.input}
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Village</label>
              <input
                style={styles.input}
                name="village"
                value={form.village}
                onChange={handleChange}
                placeholder="Village"
              />
            </div>

            {/* Right column */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Aadhar No</label>
              <input
                style={styles.input}
                name="aadhar_no"
                value={form.aadhar_no}
                onChange={handleChange}
                placeholder="Aadhar number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Family Members</label>
              <input
                style={styles.input}
                name="family_mems"
                value={form.family_mems}
                onChange={handleChange}
                placeholder="Number of family members"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Water / Day (L)</label>
              <input
                style={styles.input}
                name="quant_water_alloted_per_day"
                value={form.quant_water_alloted_per_day}
                onChange={handleChange}
                placeholder="Daily allotment (L)"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Water / Month (L)</label>
              <input
                style={styles.input}
                name="quant_water_alloted_per_month"
                value={form.quant_water_alloted_per_month}
                onChange={handleChange}
                placeholder="Monthly allotment (L)"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>No of times visited (month)</label>
              <input
                style={styles.input}
                name="swipe_count"
                value={form.swipe_count}
                onChange={handleChange}
                placeholder="Number of swipes"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Total Litres Consumed (L)</label>
              <input
                style={styles.input}
                name="total_litres_consumed"
                value={form.total_litres_consumed}
                onChange={handleChange}
                placeholder="Total litres consumed"
                type="number"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Remaining Card Balance (₹)</label>
              <input
                style={styles.input}
                name="remaining_card_balance"
                value={form.remaining_card_balance}
                onChange={handleChange}
                placeholder="Remaining balance in ₹"
                type="number"
                step="0.01"
                min="0"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Remarks</label>
              <input
                style={styles.input}
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                placeholder="Remarks"
              />
            </div>
          </div>

          <div style={styles.actions}>
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save & Go to RFID list"}
            </button>
            <button style={styles.resetBtn} type="button" onClick={handleReset} disabled={loading}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
