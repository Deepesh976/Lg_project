// src/App.js
import React from 'react';
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
import User from './pages/user';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ProtectedRoutes from './components/auth/protectedRoutes'; // ensure path matches
// Note: if you placed protectedRoutes.js under src/components, import from './components/protectedRoutes'

axios.defaults.baseURL = process.env.REACT_APP_API_BASE || 'http://192.168.0.126:5000';

// if there's a token already (page refresh), attach it to axios header
const existingToken = localStorage.getItem('lg_admin_token');
if (existingToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${existingToken}`;
}

const WithNavbar = ({ Component }) => (
  <>
    <Navbar />
    <div style={{ paddingTop: '70px' }}>
      <Component />
    </div>
  </>
);

export default function App() {
  return (
    <Router>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Protected routes (all children require auth) */}
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
          {/* if you want, a protected 404 or fallback can be added */}
        </Route>

        {/* Catch-all 404 for unmatched public paths */}
        <Route path="*" element={<div style={{ padding: 20 }}>Page not found</div>} />
      </Routes>
    </Router>
  );
}
