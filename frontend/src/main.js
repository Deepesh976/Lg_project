// App.js
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

axios.defaults.baseURL = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

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
        {/* Authentication */}
        <Route path="/" element={<Login />} />

        {/* Pages with Navbar */}
        <Route path="/deviceAnalysis" element={<WithNavbar Component={DeviceAnalysis} />} />
        <Route path="/rfidcard" element={<WithNavbar Component={RfidCard} />} />

        {/* History routes */}
        <Route path="/rfidhistory/:id" element={<WithNavbar Component={RfidHistory} />} />
        <Route path="/rfidhistory" element={<Navigate to="/rfidcard" replace />} />

        {/* Edit RFID routes */}
        <Route path="/editrfid/:id" element={<WithNavbar Component={EditRfidCard} />} />
        <Route path="/editrfidcard/:id" element={<WithNavbar Component={EditRfidCard} />} />
        <Route path="/editrfidcard" element={<Navigate to="/rfidcard" replace />} />

        {/* Device CRUD routes (normalized) */}
        <Route path="/device" element={<WithNavbar Component={Device} />} />
        <Route path="/addDevice" element={<WithNavbar Component={AddDevice} />} />
        {/* redirect bare /editdevice to list to avoid 404 when no id provided */}
        <Route path="/editdevice" element={<Navigate to="/devices" replace />} />
        <Route path="/editdevice/:id" element={<WithNavbar Component={EditDevice} />} />

        {/* User */}
        <Route path="/user" element={<WithNavbar Component={User} />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<div style={{ padding: 20 }}>Page not found</div>} />
      </Routes>
    </Router>
  );
}
