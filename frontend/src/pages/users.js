import React, { useState } from "react";
import axios from "axios";

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
    maxWidth: 600,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1f2937",
    marginBottom: 20,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 14,
    display: "flex",
    flexDirection: "column",
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

export default function Users() {
  const [form, setForm] = useState({
    user_name: "",
    address: "",
    village: "",
    aadhar_no: "",
    mobile_no: "",
    family_mems: "",
    quant_water_alloted_per_day: "",
    quant_water_alloted_per_month: "",
    swipe_count: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.user_name || !form.mobile_no) {
      alert("Please fill in Username and Mobile number");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/rfid", form);
      alert("User added successfully!");
      console.log("Saved user:", res.data);
      setForm({
        user_name: "",
        address: "",
        village: "",
        aadhar_no: "",
        mobile_no: "",
        family_mems: "",
        quant_water_alloted_per_day: "",
        quant_water_alloted_per_month: "",
        swipe_count: "",
      });
    } catch (err) {
      console.error("Error adding user:", err);
      alert("Failed to add user");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      user_name: "",
      address: "",
      village: "",
      aadhar_no: "",
      mobile_no: "",
      family_mems: "",
      quant_water_alloted_per_day: "",
      quant_water_alloted_per_month: "",
      swipe_count: "",
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>User Info</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username</label>
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
            <label style={styles.label}>Address</label>
            <input
              style={styles.input}
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter address"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Village</label>
            <input
              style={styles.input}
              name="village"
              value={form.village}
              onChange={handleChange}
              placeholder="Enter village name"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Aadhar No</label>
            <input
              style={styles.input}
              name="aadhar_no"
              value={form.aadhar_no}
              onChange={handleChange}
              placeholder="Enter Aadhar number"
              type="number"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Mobile</label>
            <input
              style={styles.input}
              name="mobile_no"
              value={form.mobile_no}
              onChange={handleChange}
              placeholder="Enter mobile number"
              type="number"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Family Members</label>
            <input
              style={styles.input}
              name="family_mems"
              value={form.family_mems}
              onChange={handleChange}
              placeholder="Enter number of family members"
              type="number"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Water/Day (L)</label>
            <input
              style={styles.input}
              name="quant_water_alloted_per_day"
              value={form.quant_water_alloted_per_day}
              onChange={handleChange}
              placeholder="Enter daily water allotment"
              type="number"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Water/Month (L)</label>
            <input
              style={styles.input}
              name="quant_water_alloted_per_month"
              value={form.quant_water_alloted_per_month}
              onChange={handleChange}
              placeholder="Enter monthly water allotment"
              type="number"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>No. of Times Taken Water in Month</label>
            <input
              style={styles.input}
              name="swipe_count"
              value={form.swipe_count}
              onChange={handleChange}
              placeholder="Enter number of times water taken"
              type="number"
            />
          </div>

          <div style={styles.actions}>
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </button>
            <button style={styles.resetBtn} type="button" onClick={handleReset}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
