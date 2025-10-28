import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/**
 * ForgetPassword.js
 *
 * Behavior:
 * - If REACT_APP_API_BASE_URL is set, requests will be sent to `${REACT_APP_API_BASE_URL}/api/...`
 * - Otherwise uses relative path '/api/...' so CRA proxy (or same-origin deployment) will work.
 *
 * Dev tips:
 * - package.json "proxy": "http://localhost:5000" is the simplest for local dev with CRA.
 * - You can set REACT_APP_API_BASE_URL in .env for mobile testing across LAN.
 */

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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    position: "relative",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: "clamp(1.2rem, 4vw, 1.6rem)",
    fontWeight: 700,
    letterSpacing: "0.5px",
    margin: 0,
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
  subtitle: {
    fontSize: "0.95rem",
    color: "#666",
    marginBottom: "1.8rem",
  },
  formGroup: {
    marginBottom: "1rem",
    textAlign: "left",
  },
  label: {
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#333",
    marginBottom: "0.4rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.7rem 0.95rem",
    fontSize: "1rem",
    border: "2px solid #e0e0e0",
    borderRadius: "8px",
    transition: "all 0.3s ease",
    fontFamily: "inherit",
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
  backLink: {
    display: "inline-block",
    marginTop: "1.4rem",
    color: "#3f51b5",
    textDecoration: "none",
    fontWeight: 600,
    transition: "color 0.3s ease",
  },
  info: {
    fontSize: "0.9rem",
    color: "#444",
    marginTop: "0.5rem",
  },
};

export default function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Build endpoint URL: prefer env variable (useful for mobile testing),
  // otherwise use relative path so CRA proxy works in development.
  const API_BASE = process.env.REACT_APP_API_BASE_URL
    ? process.env.REACT_APP_API_BASE_URL.replace(/\/$/, "")
    : ""; // empty => use relative URLs

  const forgotUrl = `${API_BASE}/api/admin/forgotPassword`.replace(/^(\/api)/, "$1"); // keep leading / if API_BASE is empty

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your registered email.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      // POST the email
      const res = await axios.post(forgotUrl, { email }, { timeout: 10000 });

      // backend intentionally returns a generic success message to avoid email enumeration.
      if (res?.data?.success) {
        setMessage(
          "If that email exists, a reset link has been sent. Check your inbox (and spam)."
        );
        // optionally redirect after short delay
        setTimeout(() => navigate("/login"), 2500);
      } else {
        setError(res?.data?.message || "Failed to request reset link. Try again later.");
      }
    } catch (err) {
      console.error("Forget Password Error (detailed):", err);

      // Axios error classification
      if (err.response) {
        // Server responded with a status code out of 2xx
        const status = err.response.status;
        const serverMsg = err.response.data?.message || err.response.statusText;
        setError(`Server error ${status}: ${serverMsg}`);
      } else if (err.request) {
        // Request was made but no response received
        setError(
          "Network error: cannot reach the server. If you're testing on mobile, ensure the backend is reachable from your device."
        );
      } else {
        // Something else happened
        setError("Unexpected error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <header style={styles.headerBar}>
        <h1 style={styles.headerTitle}>PURIFIED DRINKING WATER</h1>
      </header>

      <div style={styles.card}>
        <h2 style={styles.title}>Forgot Password?</h2>
        <p style={styles.subtitle}>
          Enter your registered email address to receive a password reset link.
        </p>

        {message && <div style={{ color: "green", marginBottom: 10 }}>{message}</div>}
        {error && <div style={{ color: "crimson", marginBottom: 10 }}>{error}</div>}

        <form onSubmit={handleSubmit} aria-label="Forgot password form">
          <div style={styles.formGroup}>
            <label style={styles.label} htmlFor="fp-email">
              <i className="fas fa-envelope" style={{ color: "#3f51b5" }} />
              Email Address
            </label>
            <input
              id="fp-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              aria-required="true"
            />
          </div>

          <button
            type="submit"
            style={{ ...styles.button, opacity: loading ? 0.85 : 1 }}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
{/* 
        <div style={styles.info}>
          Tip: If you're testing locally, set <code>REACT_APP_API_BASE_URL</code> or add a{" "}
          <code>proxy</code> entry in <code>package.json</code>.
        </div> */}

        <a
          href="/login"
          onClick={(e) => {
            e.preventDefault();
            navigate("/login");
          }}
          style={styles.backLink}
        >
          ← Back to Login
        </a>
      </div>
    </div>
  );
}
