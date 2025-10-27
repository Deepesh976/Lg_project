// src/pages/Login.js
import React, { useState, useEffect, useRef } from 'react';
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

  mainContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    minHeight: 'calc(100vh - 70px)',
    gap: '1.5rem',
    padding: '2rem 2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },

  // ✨ Slideshow wrapper with border & polish
  slideshowSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '20px',
    background: 'linear-gradient(145deg, #ffffff, #e8e8ef)',
    boxShadow: '0 10px 40px rgba(63, 81, 181, 0.15)',
    border: '4px solid transparent',
    backgroundClip: 'padding-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '420px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },

  slideshowImg: {
    width: '100%',
    maxWidth: '600px',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '16px',
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    transition: 'opacity 800ms ease-in-out, transform 2s ease',
    opacity: 0,
    pointerEvents: 'none',
    userSelect: 'none',
  },

  formSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: '450px',
    padding: 'clamp(1.5rem, 4vw, 2rem)',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(63, 81, 181, 0.1)',
    textAlign: 'center',
  },
  logo: {
    width: '160px',
    height: '160px',
    margin: '0 auto 1rem',
    objectFit: 'contain',
    display: 'block',
  },
  formTitle: {
    fontSize: 'clamp(1.4rem, 4vw, 1.8rem)',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0.5rem 0 0.3rem 0',
  },
  formSubtitle: {
    fontSize: '0.95rem',
    color: '#666',
    marginBottom: '1.8rem',
  },
  formGroup: {
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
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
  inputField: {
    width: '100%',
    padding: '0.7rem 0.95rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '0.8rem 1rem',
    background: 'linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)',
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
  },
};

const SLIDES = ['/1.jpg', '/2.jpg'];
const SLIDE_INTERVAL = 4000;

const Login = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const navigate = useNavigate();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => {
        setIndex((prev) => (prev + 1) % SLIDES.length);
      }, SLIDE_INTERVAL);
    }
    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg('');
    if (!email || !password) {
      setErrMsg('Please enter both email and password.');
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post('/api/admin/login', { email, password });
      const token = res?.data?.token;
      if (!token) throw new Error('Invalid response');
      localStorage.setItem('lg_admin_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      navigate('/rfidcard', { replace: true });
    } catch (err) {
      setErrMsg('Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .slideshow-img.show { opacity: 1 !important; transform: scale(1.02); }
        .slideshow-section:hover { transform: scale(1.01); box-shadow: 0 14px 45px rgba(63,81,181,0.25); }

        @media (max-width: 1024px) {
          .login-main-container { grid-template-columns: 1fr; padding: 1.5rem; }
        }
        @media (max-width: 640px) {
          .login-logo { width: 130px; height: 130px; }
          .slideshow-section { min-height: 240px; }
        }
      `}</style>

      <div style={styles.wrapper}>
        <header style={styles.headerBar}>
          <h1 style={styles.headerTitle}>PURIFIED DRINKING WATER</h1>
        </header>

        <main style={styles.mainContainer} className="login-main-container">
          {/* 🖼️ Slideshow Section */}
          <section
            style={styles.slideshowSection}
            className="slideshow-section"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {SLIDES.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`slide-${i}`}
                className={`slideshow-img ${i === index ? 'show' : ''}`}
                style={{
                  ...styles.slideshowImg,
                  opacity: i === index ? 1 : 0,
                }}
                draggable={false}
              />
            ))}
          </section>

          {/* 🔒 Form Section */}
          <section style={styles.formSection}>
            <div style={styles.formCard}>
              <img src="/logo.png" alt="Company Logo" style={styles.logo} />
              <h2 style={styles.formTitle}>Welcome User</h2>
              <p style={styles.formSubtitle}>Sign in to access your account</p>

              <form onSubmit={handleSubmit}>
                {errMsg && (
                  <div style={{ color: 'crimson', marginBottom: 10, textAlign: 'center' }}>
                    {errMsg}
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <i className="fas fa-envelope" style={{ color: '#3f51b5' }} />
                    Email
                  </label>
                  <input
                    style={styles.inputField}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <i className="fas fa-lock" style={{ color: '#3f51b5' }} />
                    Password
                  </label>
                  <input
                    style={styles.inputField}
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    background: btnHover
                      ? 'linear-gradient(135deg, #2c3ea8 0%, #3d4888 100%)'
                      : styles.submitBtn.background,
                    opacity: loading ? 0.85 : 1,
                  }}
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
