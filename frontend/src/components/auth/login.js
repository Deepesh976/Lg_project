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
    padding: '0.75rem 1.25rem',
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
    fontSize: 'clamp(1rem, 4vw, 1.4rem)',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '0.5px',
  },
  mainContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 420px',
    height: 'calc(100vh - 64px)',
    gap: '1rem',
    padding: '1rem 1rem',
    maxWidth: '1350px',
    margin: '0 auto',
    boxSizing: 'border-box',
    alignItems: 'center',
  },
  slideshowSection: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '14px',
    background: 'linear-gradient(145deg, #ffffff, #e8e8ef)',
    boxShadow: '0 8px 30px rgba(63, 81, 181, 0.12)',
    border: '1.5px solid rgba(63, 81, 181, 0.12)',
    backgroundClip: 'padding-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(95% - 16px)',
    minHeight: '40vh',
    maxHeight: '520px',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  slideshowImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '14px',
    position: 'absolute',
    top: 0,
    left: 0,
    transition: 'opacity 800ms ease-in-out, transform 1200ms ease',
    opacity: 0,
    inset: 0,
    pointerEvents: 'none',
    userSelect: 'none',
  },
  formSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '1rem 1.25rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.06)',
    border: '1px solid rgba(63, 81, 181, 0.06)',
    textAlign: 'center',
    maxHeight: 'calc(100vh - 140px)',
    overflowY: 'auto',
  },
  logo: {
    width: '120px',
    height: '120px',
    margin: '0 auto 0.75rem',
    objectFit: 'contain',
    display: 'block',
  },
  formTitle: {
    fontSize: 'clamp(1.2rem, 3.5vw, 1.6rem)',
    fontWeight: 700,
    color: '#1a1a2e',
    margin: '0.25rem 0 0.25rem 0',
  },
  formSubtitle: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '1rem',
  },
  formGroup: {
    marginBottom: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.35rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  inputField: {
    width: '100%',
    padding: '0.6rem 0.85rem',
    fontSize: '0.95rem',
    border: '1.5px solid #e0e0e0',
    borderRadius: '8px',
    transition: 'all 0.25s ease',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  submitBtn: {
    width: '100%',
    padding: '0.72rem 1rem',
    background: 'linear-gradient(135deg, #3f51b5 0%, #5a55ae 100%)',
    border: 'none',
    outline: 'none',
    borderRadius: '8px',
    color: '#fff',
    textTransform: 'uppercase',
    fontWeight: 700,
    fontSize: '0.95rem',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 12px rgba(63, 81, 181, 0.25)',
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

      // Debug: confirm axios baseURL (visible in browser console)
      // eslint-disable-next-line no-console
      console.log('DEBUG axios.baseURL =', axios.defaults.baseURL);

      const res = await axios.post('/api/admin/login', { email, password });

      // eslint-disable-next-line no-console
      console.log('DEBUG login response:', res && res.data);

      const token = res?.data?.token;
      if (!token) {
        const serverMsg = res?.data?.message || 'No token received from server';
        setErrMsg(serverMsg);
        return;
      }

      // persist token and set header immediately
      localStorage.setItem('lg_admin_token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // quick verify to ensure the token works and ProtectedRoutes won't 401
      try {
        const me = await axios.get('/api/admin/me');
        // eslint-disable-next-line no-console
        console.log('Verified /me:', me.data);
      } catch (verifyErr) {
        // eslint-disable-next-line no-console
        console.error('verify /me failed', verifyErr?.response?.status, verifyErr?.response?.data);
        const serverMsg = verifyErr?.response?.data?.message || 'Token verification failed';
        setErrMsg(serverMsg);
        return;
      }

      // navigate to protected route
      navigate('/device', { replace: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Login error (detailed):', err);
      const serverMsg = err?.response?.data?.message;
      if (serverMsg) setErrMsg(serverMsg);
      else setErrMsg(`Login failed: ${err.message || 'Check your credentials or server.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        html, body, #root { height: 100%; }
        .slideshow-img.show { opacity: 1 !important; transform: scale(1.02); }
        .slideshow-section:hover { transform: scale(1.01); box-shadow: 0 14px 45px rgba(63,81,181,0.18); }

        @media (max-width: 1024px) {
          .login-main-container { grid-template-columns: 1fr; padding: 0.8rem; height: auto; gap: 0.75rem; }
          .slideshow-section { min-height: 28vh; max-height: 360px; border-radius: 12px; }
          .formCard { max-width: 520px; }
        }
        @media (max-width: 640px) {
          .login-logo { width: 100px; height: 100px; }
          .slideshow-section { min-height: 220px; }
          .formCard { padding: 0.75rem; }
        }
      `}</style>

      <div style={styles.wrapper}>
        <header style={styles.headerBar}>
          <h1 style={styles.headerTitle}>PURIFIED DRINKING WATER</h1>
        </header>

        <main style={styles.mainContainer} className="login-main-container">
          {/* Slideshow Section */}
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

          {/* Form Section */}
          <section style={styles.formSection}>
            <div style={styles.formCard} className="formCard">
              <img src="/logo.png" alt="Company Logo" style={styles.logo} className="login-logo" />
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
                    opacity: loading ? 0.9 : 1,
                  }}
                  onMouseEnter={() => setBtnHover(true)}
                  onMouseLeave={() => setBtnHover(false)}
                  disabled={loading}
                >
                  <i className="fas fa-sign-in-alt" style={{ marginRight: '0.5rem' }} />
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>

                <div style={{ marginTop: '0.9rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/forgetPassword')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3f51b5',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: '0.92rem',
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Login;
