import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

const styles = {
  wrapper: {
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: "#f5f7fa",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  headerBar: {
    width: "100%",
    padding: "1rem 2rem",
    background: "linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)",
    color: "#fff",
    textAlign: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
    textAlign: "center",
    marginTop: "4rem",
  },
  title: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: "#1a1a2e",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.7rem 0.95rem",
    fontSize: "1rem",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    marginBottom: "1rem",
  },
  button: {
    width: "100%",
    padding: "0.8rem 1rem",
    background: "linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)",
    border: "none",
    outline: "none",
    borderRadius: "8px",
    color: "#fff",
    fontWeight: 700,
    textTransform: "uppercase",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(63, 81, 181, 0.3)",
  },
};

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const token = params.get("token");
  const email = params.get("email");

  useEffect(() => {
    if (!token || !email) {
      setError("Invalid or missing reset token.");
    }
  }, [token, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/api/admin/resetPassword", {
        token,
        email,
        newPassword,
      });

      if (res.data.success) {
        setMessage("Password has been reset successfully!");
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setError(res.data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Reset Password Error:", err);
      setError("Error resetting password. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.headerBar}>
        <h1>PURIFIED DRINKING WATER</h1>
      </header>

      <div style={styles.card}>
        <h2 style={styles.title}>Reset Your Password</h2>

        {message && <div style={{ color: "green", marginBottom: 10 }}>{message}</div>}
        {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={styles.input}
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={styles.input}
            required
          />

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
