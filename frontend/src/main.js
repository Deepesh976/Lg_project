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
import Devices from './pages/devices';
import AddDevice from './pages/addDevice'; // <- corrected path/casing
import Users from './pages/users';
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
        <Route path="/" element={<Login />} />
        <Route path="/deviceAnalysis" element={<WithNavbar Component={DeviceAnalysis} />} />
        <Route path="/rfidcard" element={<WithNavbar Component={RfidCard} />} />

        {/* History routes */}
        <Route path="/rfidhistory/:id" element={<WithNavbar Component={RfidHistory} />} />
        <Route path="/rfidhistory" element={<Navigate to="/rfidcard" replace />} />

        {/* Edit routes */}
        <Route path="/editrfid/:id" element={<WithNavbar Component={EditRfidCard} />} />
        <Route path="/editrfidcard/:id" element={<WithNavbar Component={EditRfidCard} />} />
        <Route path="/editrfidcard" element={<Navigate to="/rfidcard" replace />} />

        <Route path="/devices" element={<WithNavbar Component={Devices} />} />
        <Route path="/users" element={<WithNavbar Component={Users} />} />
        <Route path="/adddevice" element={<WithNavbar Component={AddDevice} />} />

        {/* Catch-all 404 */}
        <Route path="*" element={<div style={{ padding: 20 }}>Page not found</div>} />
      </Routes>
    </Router>
  );
}
