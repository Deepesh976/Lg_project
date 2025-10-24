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
    <div className="page-wrapper">
      <div className="page-container">
        <div className="form-wrapper">
          <h2 className="form-title">Add User Details</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">RFID Serial No <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="rfid_serial_no"
                  value={form.rfid_serial_no}
                  onChange={handleChange}
                  placeholder="Enter Serial no"
                />
              </div>

              <div className="form-group">
                <label className="form-label">RFID UID <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="rfid_uid"
                  value={form.rfid_uid}
                  onChange={handleChange}
                  placeholder="Enter UID"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Username <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="user_name"
                  value={form.user_name}
                  onChange={handleChange}
                  placeholder="Enter user name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile <span className="required">*</span></label>
                <input
                  className="form-input"
                  name="mobile_no"
                  value={form.mobile_no}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  required
                  type="tel"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Address"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Village</label>
                <input
                  className="form-input"
                  name="village"
                  value={form.village}
                  onChange={handleChange}
                  placeholder="Village"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Aadhar No</label>
                <input
                  className="form-input"
                  name="aadhar_no"
                  value={form.aadhar_no}
                  onChange={handleChange}
                  placeholder="Aadhar number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Family Members</label>
                <input
                  className="form-input"
                  name="family_mems"
                  value={form.family_mems}
                  onChange={handleChange}
                  placeholder="Number of family members"
                  type="number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Water / Day (L)</label>
                <input
                  className="form-input"
                  name="quant_water_alloted_per_day"
                  value={form.quant_water_alloted_per_day}
                  onChange={handleChange}
                  placeholder="Daily allotment (L)"
                  type="number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Water / Month (L)</label>
                <input
                  className="form-input"
                  name="quant_water_alloted_per_month"
                  value={form.quant_water_alloted_per_month}
                  onChange={handleChange}
                  placeholder="Monthly allotment (L)"
                  type="number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">No of times visited (month)</label>
                <input
                  className="form-input"
                  name="swipe_count"
                  value={form.swipe_count}
                  onChange={handleChange}
                  placeholder="Number of swipes"
                  type="number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Total Litres Consumed (L)</label>
                <input
                  className="form-input"
                  name="total_litres_consumed"
                  value={form.total_litres_consumed}
                  onChange={handleChange}
                  placeholder="Total litres consumed"
                  type="number"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Remaining Card Balance (₹)</label>
                <input
                  className="form-input"
                  name="remaining_card_balance"
                  value={form.remaining_card_balance}
                  onChange={handleChange}
                  placeholder="Remaining balance in ₹"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Remarks</label>
                <input
                  className="form-input"
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Remarks"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                <i className="fas fa-save"></i>
                {loading ? "Saving..." : "Save & Go to RFID list"}
              </button>
              <button className="btn btn-secondary" type="button" onClick={handleReset} disabled={loading}>
                <i className="fas fa-redo"></i>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
