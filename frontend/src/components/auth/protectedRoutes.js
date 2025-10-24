// src/components/protectedRoutes.js
import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import axios from 'axios';

/**
 * ProtectedRoutes (React Router v6)
 * - Verifies JWT stored at localStorage key 'lg_admin_token' by calling /api/admin/me
 * - While verifying shows a loader. If invalid, clears token and redirects to /login.
 * - Usage (App.js):
 *   <Route element={<ProtectedRoutes />}>
 *     <Route path="/rfidcard" element={<WithNavbar Component={RfidCard} />} />
 *   </Route>
 */

export default function ProtectedRoutes({ redirectTo = '/login' }) {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      const token = localStorage.getItem('lg_admin_token');
      if (!token) {
        if (mounted) {
          setAuthorized(false);
          setChecking(false);
        }
        return;
      }

      // Attach token to axios for subsequent requests
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      try {
        // server should return 200 and admin info if token valid
        await axios.get('/api/admin/me', { timeout: 8000 });
        if (mounted) setAuthorized(true);
      } catch (err) {
        // invalid or expired token
        try {
          localStorage.removeItem('lg_admin_token');
          localStorage.removeItem('lg_admin');
        } catch (e) {}
        delete axios.defaults.headers.common['Authorization'];
        if (mounted) setAuthorized(false);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#374151' }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Checking authentication…</div>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '4px solid rgba(59,130,246,0.15)',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!authorized) {
    // redirect to login and keep `from` for possible post-login redirect
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/**
 * logout helper - clears stored token and axios header
 * returns the redirect path for caller to navigate
 */
export function logout(redirectPath = '/login') {
  try {
    localStorage.removeItem('lg_admin_token');
    localStorage.removeItem('lg_admin');
    delete axios.defaults.headers.common['Authorization'];
  } catch (e) {
    // ignore
  }
  return redirectPath;
}
