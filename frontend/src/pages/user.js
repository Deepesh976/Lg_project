// src/pages/user.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/pages.css";

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

  // Inline content/container styles to ensure heading and layout are correct
  const styles = {
    pageWrapper: {
      padding: "28px 24px",
      display: "flex",
      justifyContent: "center",
      background: "transparent",
      minHeight: "calc(100vh - 80px)",
      boxSizing: "border-box",
    },
    pageContainer: {
      width: "100%",
      maxWidth: 1200,
    },
    formWrapper: {
      background: "#fff",
      borderRadius: 14,
      padding: 28,
      boxShadow: "0 6px 24px rgba(30,40,80,0.08)",
      boxSizing: "border-box",
    },
    formTitle: {
      color: "#000", // force black
      fontWeight: 800,
      fontSize: 28,
      textAlign: "center",
      margin: "4px 0 24px 0",
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20,
      alignItems: "start",
    },
    // individual group fallback (keeps your CSS classes but ensures label/input styles)
    formGroup: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    formLabel: {
      color: "#111",
      fontWeight: 700,
      fontSize: 15,
    },
    formInput: {
      padding: "14px 16px",
      borderRadius: 10,
      border: "1px solid #e0e3e8",
      background: "#fff",
      outline: "none",
      fontSize: 14,
      color: "#111",
      boxSizing: "border-box",
    },
    formActions: {
      marginTop: 26,
      display: "flex",
      gap: 12,
      justifyContent: "flex-start",
      gridColumn: "1 / -1",
    },
    btnPrimary: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 10,
      border: "none",
      background: "#4a3fd6",
      color: "#fff",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
    },
    btnSecondary: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      borderRadius: 10,
      border: "1px solid #d5d7db",
      background: "#fff",
      color: "#111",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
    },
    // responsive tweaks
    '@media_sm': {
      formGrid: {
        gridTemplateColumns: "repeat(2, 1fr)",
      },
    },
    '@media_xs': {
      formGrid: {
        gridTemplateColumns: "1fr",
      },
    },
  };

  return (
    <div className="page-wrapper" style={styles.pageWrapper}>
      <div className="page-container" style={styles.pageContainer}>
        <div className="form-wrapper" style={styles.formWrapper}>
          {/* single heading, forced to black */}
          <h2 className="form-title" style={styles.formTitle}>
            Add User Details
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={styles.formGrid}>
              {/* RFID Serial No */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  RFID Serial No <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="rfid_serial_no"
                  value={form.rfid_serial_no}
                  onChange={handleChange}
                  placeholder="Enter Serial no"
                  style={styles.formInput}
                />
              </div>

              {/* RFID UID */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  RFID UID <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="rfid_uid"
                  value={form.rfid_uid}
                  onChange={handleChange}
                  placeholder="Enter UID"
                  style={styles.formInput}
                />
              </div>

              {/* Username */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Username <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="user_name"
                  value={form.user_name}
                  onChange={handleChange}
                  placeholder="Enter user name"
                  required
                  style={styles.formInput}
                />
              </div>

              {/* Mobile */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Mobile <span className="required">*</span>
                </label>
                <input
                  className="form-input"
                  name="mobile_no"
                  value={form.mobile_no}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  required
                  type="tel"
                  style={styles.formInput}
                />
              </div>

              {/* Address */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Address
                </label>
                <input
                  className="form-input"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Address"
                  style={styles.formInput}
                />
              </div>

              {/* Village */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Village
                </label>
                <input
                  className="form-input"
                  name="village"
                  value={form.village}
                  onChange={handleChange}
                  placeholder="Village"
                  style={styles.formInput}
                />
              </div>

              {/* Aadhar */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Aadhar No
                </label>
                <input
                  className="form-input"
                  name="aadhar_no"
                  value={form.aadhar_no}
                  onChange={handleChange}
                  placeholder="Aadhar number"
                  style={styles.formInput}
                />
              </div>

              {/* Family Members */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Family Members
                </label>
                <input
                  className="form-input"
                  name="family_mems"
                  value={form.family_mems}
                  onChange={handleChange}
                  placeholder="Number of family members"
                  type="number"
                  style={styles.formInput}
                />
              </div>

              {/* Water / Day */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Water / Day (L)
                </label>
                <input
                  className="form-input"
                  name="quant_water_alloted_per_day"
                  value={form.quant_water_alloted_per_day}
                  onChange={handleChange}
                  placeholder="Daily allotment (L)"
                  type="number"
                  style={styles.formInput}
                />
              </div>

              {/* Water / Month */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Water / Month (L)
                </label>
                <input
                  className="form-input"
                  name="quant_water_alloted_per_month"
                  value={form.quant_water_alloted_per_month}
                  onChange={handleChange}
                  placeholder="Monthly allotment (L)"
                  type="number"
                  style={styles.formInput}
                />
              </div>

              {/* Swipe Count */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  No of times visited (month)
                </label>
                <input
                  className="form-input"
                  name="swipe_count"
                  value={form.swipe_count}
                  onChange={handleChange}
                  placeholder="Number of swipes"
                  type="number"
                  style={styles.formInput}
                />
              </div>

              {/* Total Litres Consumed */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Total Litres Consumed (L)
                </label>
                <input
                  className="form-input"
                  name="total_litres_consumed"
                  value={form.total_litres_consumed}
                  onChange={handleChange}
                  placeholder="Total litres consumed"
                  type="number"
                  style={styles.formInput}
                />
              </div>

              {/* Remaining Card Balance */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Remaining Card Balance (₹)
                </label>
                <input
                  className="form-input"
                  name="remaining_card_balance"
                  value={form.remaining_card_balance}
                  onChange={handleChange}
                  placeholder="Remaining balance in ₹"
                  type="number"
                  step="0.01"
                  min="0"
                  style={styles.formInput}
                />
              </div>

              {/* Remarks */}
              <div className="form-group" style={styles.formGroup}>
                <label className="form-label" style={styles.formLabel}>
                  Remarks
                </label>
                <input
                  className="form-input"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Remarks"
                  style={styles.formInput}
                />
              </div>

              {/* Actions row spans full width */}
              <div style={styles.formActions}>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={loading}
                  style={styles.btnPrimary}
                >
                  <i className="fas fa-save" />
                  {loading ? " Saving..." : " Save & Go to RFID list"}
                </button>

                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={handleReset}
                  disabled={loading}
                  style={styles.btnSecondary}
                >
                  <i className="fas fa-redo" />
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
