import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../../styles/navbar.css';

const menuItems = [
  { path: '/device', label: 'Devices' },
  { path: '/user', label: 'Users' },
  { path: '/rfidcard', label: 'RFID CARD' },
  { path: '/deviceAnalysis', label: 'Device Analysis' },
];

const Navbar = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <>
      <nav className="topbar">
        <div
          className="menu-button"
          onClick={() => setShowSidebar(true)}
          aria-label="Open menu"
          role="button"
        >
          &#9776;
        </div>
        <div className="brand-title">LG PROJECT</div>
      </nav>

      {showSidebar && <div className="nav-overlay" onClick={() => setShowSidebar(false)} />}

      <aside className={`sidebar ${showSidebar ? 'visible' : ''}`}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setShowSidebar(false)}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={() => {
            setShowSidebar(false);
            handleLogout();
          }}
          className="logout-button"
        >
          Logout
        </button>
      </aside>
    </>
  );
};

export default Navbar;
