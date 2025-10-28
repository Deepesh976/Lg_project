// src/main.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './components/auth/login';
import Navbar from './components/Navbar/navbar';
import DeviceAnalysis from './pages/deviceAnalysis';
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
          <Route path="/deviceAnalysis" element={<WithNavbar Component={DeviceAnalysis} />} />
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

// Render into root
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<AppRoutes />);

export default AppRoutes;
