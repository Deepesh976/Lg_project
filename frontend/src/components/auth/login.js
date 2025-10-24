// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const styles = {
  wrapper: {
    fontFamily: "'Poppins', sans-serif",
    backgroundColor: '#f5f7fa',
    minHeight: '100vh',
    margin: 0,
    padding: 0,
  },
  headerBar: {
    width: '100%',
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    position: 'relative',
    zIndex: 100,
  },
  headerTitle: {
    fontSize: 'clamp(1.2rem, 5vw, 1.6rem)',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '0.5px',
  },

  /* MAIN LAYOUT - slightly reduced top padding so children sit higher */
  mainContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    minHeight: 'calc(100vh - 70px)',
    gap: '1.5rem',                 // a bit tighter
    padding: '2rem 2rem',          // moved up by reducing vertical padding
    maxWidth: '1400px',
    margin: '0 auto',
  },

  /* ILLUSTRATION - nudge upwards using translateY */
  illustrationSection: {
    display: 'flex',
    alignItems: 'flex-start',      // align to top so translate looks natural
    justifyContent: 'center',
    minHeight: '420px',
  },
  illustrationImage: {
    width: '100%',
    maxWidth: '600px',
    height: 'auto',
    objectFit: 'contain',
    animation: 'float 3s ease-in-out infinite',
    transform: 'translateY(-12px)',   // move image up
    transition: 'transform 300ms ease',
  },

  /* FORM - nudge upwards slightly as well */
  formSection: {
    display: 'flex',
    alignItems: 'flex-start',     // align to top
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: '450px',
    padding: 'clamp(1.5rem, 4vw, 2rem)', // slightly reduced padding to pull contents up
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(63, 81, 181, 0.1)',
    transform: 'translateY(-12px)', // move card up a bit
  },
  logo: {
    width: '220px',                 // slightly smaller so it doesn't push content down
    height: '220px',
    margin: '0 auto 1.25rem',       // smaller bottom margin
    objectFit: 'contain',
    display: 'block',
    transform: 'translateY(-80px)',  // lift the logo a touch
  },

  /* Titles and text: reduce bottom spacing */
formTitle: {
  fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
  fontWeight: 700,
  color: '#1a1a2e',
  margin: '-9.5rem 0 0.4rem 0',  // moved up closer to logo
  textAlign: 'center',
},
formSubtitle: {
  fontSize: '0.95rem',
  color: '#666',
  textAlign: 'center',
  marginBottom: '1.8rem',        // reduced gap below subtitle
},
  /* form controls: tighten spacing */
  formGroup: {
    marginBottom: '0.9rem',      // smaller gap between inputs
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.4rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  iconLabel: {
    fontSize: '1rem',
    color: '#3f51b5',
  },
  inputField: {
    width: '100%',
    padding: '0.7rem 0.95rem',   // slightly smaller vertical padding
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  inputFieldFocus: {
    borderColor: '#3f51b5',
    boxShadow: '0 0 0 3px rgba(63, 81, 181, 0.1)',
  },

  /* submit: move up a bit by reducing marginTop */
  submitBtn: {
    width: '100%',
    padding: '0.78rem 1rem',
    backgroundColor: 'linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)',
    border: 'none',
    outline: 'none',
    borderRadius: '8px',
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(63, 81, 181, 0.3)',
    marginTop: '0.6rem',         // tightened from 1rem
  },
  submitBtnHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(63, 81, 181, 0.4)',
  },

  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    color: '#666',
  },
  checkboxInput: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    accentColor: '#3f51b5',
  },
  rememberLabel: {
    cursor: 'pointer',
  },
  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0px)',
    },
    '50%': {
      transform: 'translateY(-20px)',
    },
  },
};

/* Component */
const Login = () => {
  const [btnHover, setBtnHover] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');
    if (!email || !password) {
      setErrMsg('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(
        '/api/admin/login',
        { email: email.trim(), password },
        { timeout: 10000 }
      );

      const token = res?.data?.token;
      if (!token) {
        setErrMsg('Login failed: server did not return a token.');
        setLoading(false);
        return;
      }

      // store token and set axios default header
      localStorage.setItem('lg_admin_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // optionally store admin info
      if (res.data?.admin) {
        try {
          localStorage.setItem('lg_admin', JSON.stringify(res.data.admin));
        } catch (e) {
          // ignore storage errors
        }
      }

      // redirect to protected area
      navigate('/rfidcard', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setErrMsg(err.response.data.message);
      } else if (err.code === 'ECONNABORTED') {
        setErrMsg('Login timed out. Please try again.');
      } else {
        setErrMsg('Login failed. Check credentials or server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @media (max-width: 1024px) {
          .login-main-container {
            grid-template-columns: 1fr;
            padding: 1.5rem 1.5rem;
            gap: 1.25rem;
          }
          .login-illustration-section { min-height: 300px; order: 2; }
          .login-form-section { order: 1; }
          .login-form-card { max-width: 100%; transform: translateY(-8px); }
          .login-illustration-image { transform: translateY(-12px); }
        }

        @media (max-width: 640px) {
          .login-main-container { padding: 1rem 1rem; gap: 1rem; min-height: auto; }
          .login-logo { width: 180px; height: 180px; margin-bottom: 1rem; transform: translateY(-6px); }
          .login-form-title { font-size: 1.4rem; }
          .login-input-field { font-size: 16px; padding: 0.7rem 0.9rem; }
          .login-submit-btn { padding: 0.75rem 0.9rem; font-size: 0.95rem; margin-top: 0.5rem; }
        }

        .login-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(63,81,181,0.4); }
        .login-submit-btn:active { transform: translateY(0); }
        .login-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>

      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />

      <div style={styles.wrapper}>
        <header style={styles.headerBar}>
          <h1 style={styles.headerTitle} className="login-header-title">LG PROJECT</h1>
        </header>

        <main style={styles.mainContainer} className="login-main-container">
          {/* Illustration Section */}
          <section style={styles.illustrationSection} className="login-illustration-section">
            <img
              src="/log.svg"
              alt="Login Illustration"
              style={styles.illustrationImage}
              className="login-illustration-image"
            />
          </section>

          {/* Form Section */}
          <section style={styles.formSection} className="login-form-section">
            <div style={styles.formCard} className="login-form-card">
              <img src="/logo.png" alt="Company Logo" style={styles.logo} className="login-logo" />

              <h2 style={styles.formTitle} className="login-form-title">Welcome User</h2>
              <p style={styles.formSubtitle}>Sign in to access your account</p>

              <form onSubmit={handleSubmit}>
                {errMsg && (
                  <div style={{ color: 'crimson', marginBottom: 10, textAlign: 'center' }}>
                    {errMsg}
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <i className="fas fa-envelope" style={{ marginRight: 8, color: '#3f51b5' }} />
                    Email
                  </label>
                  <input
                    className="login-input-field"
                    style={styles.inputField}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <i className="fas fa-lock" style={{ marginRight: 8, color: '#3f51b5' }} />
                    Password
                  </label>
                  <input
                    className="login-input-field"
                    style={styles.inputField}
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    ...(btnHover ? styles.submitBtnHover : {}),
                    background: btnHover
                      ? 'linear-gradient(135deg, #2c3ea8 0%, #3d4888 100%)'
                      : 'linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)',
                    opacity: loading ? 0.85 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                  className="login-submit-btn"
                  onMouseEnter={() => setBtnHover(true)}
                  onMouseLeave={() => setBtnHover(false)}
                  disabled={loading}
                >
                  <i className="fas fa-sign-in-alt" style={{ marginRight: '0.5rem' }} />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Login;
