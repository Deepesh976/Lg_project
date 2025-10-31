// src/main.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { io as ioClient } from 'socket.io-client';

import Login from './components/auth/login';
import Navbar from './components/Navbar/navbar';
import RfidCard from './pages/rfidcard';
import EditRfidCard from './pages/editrfidcard';
import RfidHistory from './pages/rfidhistory';
import Device from './pages/device';
import AddDevice from './pages/addDevice';
import EditDevice from './pages/editDevice';
import ResetPassword from './pages/resetPassword';
import ForgetPassword from './pages/forgetPassword';
import User from './pages/user';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProtectedRoutes from './components/auth/protectedRoutes';

// -------------------- Socket.IO initialization (inline) --------------------
// Default backend socket URL — change via REACT_APP_SOCKET_URL in .env if needed
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Socket options tuned to reduce premature timeouts in development
const socketOptions = {
  transports: ['websocket', 'polling'], // try websocket first
  timeout: 10000, // connection timeout (ms)
  reconnection: true,
  reconnectionAttempts: 8,
  reconnectionDelay: 1000,
  path: '/socket.io', // default path (change if your server uses a custom path)
  withCredentials: true,
};

let socket;
try {
  socket = ioClient(SOCKET_URL, socketOptions);

  socket.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('Socket connected:', socket.id, 'backend:', SOCKET_URL);
  });

  socket.on('connect_error', (err) => {
    // eslint-disable-next-line no-console
    console.warn('Socket connect_error', err && (err.message || err));
  });

  socket.on('disconnect', (reason) => {
    // eslint-disable-next-line no-console
    console.log('Socket disconnected:', reason);
  });

  // Re-dispatch server events as window CustomEvents so your pages can listen as before
  socket.on('rfid-record-updated', (payload) => {
    // eslint-disable-next-line no-console
    console.debug('socket -> rfid-record-updated', payload);
    try {
      window.dispatchEvent(new CustomEvent('rfid-record-updated', { detail: payload }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to dispatch rfid-record-updated CustomEvent', e);
    }
  });

  socket.on('rfid-history-updated', (payload) => {
    // eslint-disable-next-line no-console
    console.debug('socket -> rfid-history-updated', payload);
    try {
      window.dispatchEvent(new CustomEvent('rfid-history-updated', { detail: payload }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to dispatch rfid-history-updated CustomEvent', e);
    }
  });

  // Optional: catch-all forwarder (uncomment if you want ALL server events forwarded)
  // socket.onAny((eventName, payload) => {
  //   window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  // });
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('Socket initialization failed:', err && err.message);
}
// -------------------------------------------------------------------------

// small helper to render pages with navbar + top padding
const WithNavbar = ({ Component }) => (
  <>
    <Navbar />
    <div style={{ paddingTop: '70px' }}>
      <Component />
    </div>
  </>
);

// App (routes)
function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* root: redirect to /login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgetPassword" element={<ForgetPassword />} />
        <Route path="/resetPassword" element={<ResetPassword />} />

        {/* Protected routes (only when ProtectedRoutes allows) */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/rfidcard" element={<WithNavbar Component={RfidCard} />} />
          <Route path="/rfidhistory/:id" element={<WithNavbar Component={RfidHistory} />} />
          <Route path="/editrfid/:id" element={<WithNavbar Component={EditRfidCard} />} />
          <Route path="/editrfidcard/:id" element={<WithNavbar Component={EditRfidCard} />} />
          <Route path="/device" element={<WithNavbar Component={Device} />} />
          <Route path="/addDevice" element={<WithNavbar Component={AddDevice} />} />
          <Route path="/editdevice/:id" element={<WithNavbar Component={EditDevice} />} />
          <Route path="/user" element={<WithNavbar Component={User} />} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<div style={{ padding: 20 }}>Page not found</div>} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
