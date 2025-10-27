// Navbar.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const menuItems = [
  { path: "/device", label: "Devices", icon: "fas fa-microchip" },
  { path: "/user", label: "Users", icon: "fas fa-users" },
  { path: "/rfidcard", label: "RFID Cards", icon: "fas fa-id-card" },
  // { path: "/deviceAnalysis", label: "Analytics", icon: "fas fa-chart-bar" },
];

export default function Navbar() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [isWide, setIsWide] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 880 : true
  );
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function onResize() {
      setIsWide(window.innerWidth >= 880);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleLogout = () => {
    try {
      // clear stored auth
      localStorage.removeItem("lg_admin_token");
      localStorage.removeItem("lg_admin");
      // remove axios default header if set
      if (axios.defaults && axios.defaults.headers && axios.defaults.headers.common) {
        delete axios.defaults.headers.common["Authorization"];
      }
    } catch (e) {
      // ignore storage errors
    }
    // navigate to login (replace so back button doesn't return to protected pages)
    navigate("/login", { replace: true });
  };

  // Inline styles (no external CSS)
  const styles = {
    fontLink: {
      display: "none",
    },
    navbarTop: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 68,
      background: "linear-gradient(90deg,#5a4ad6,#6f56d9)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      boxShadow: "0 6px 18px rgba(25,25,50,0.12)",
      zIndex: 1200,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
    },
    navbarContainer: {
      width: "100%",
      maxWidth: 1200,
      margin: "0 auto",
      padding: "0 20px",
      display: "flex",
      alignItems: "center",
      gap: 16,
    },
    menuBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(255,255,255,0.12)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "#fff",
      padding: "8px 12px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      outline: "none",
    },
    menuIcon: {
      fontSize: 18,
      lineHeight: 1,
    },
    navbarBrand: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    logoIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      background: "rgba(255,255,255,0.12)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
    },
    brandText: {
      fontSize: 20,
      fontWeight: 800,
      letterSpacing: 0.4,
    },
    spacer: { flex: 1 },
    desktopMenu: {
      display: "flex",
      gap: 18,
      alignItems: "center",
      listStyle: "none",
    },
    desktopMenuItem: {
      padding: "8px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 700,
      color: "rgba(255,255,255,0.95)",
      textDecoration: "none",
      whiteSpace: "nowrap",
    },
    desktopActive: {
      background: "rgba(255,255,255,0.12)",
      color: "#fff",
    },
    // Logout (desktop)
    logoutDesktop: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.12)",
      color: "#fff",
      border: "1px solid rgba(255,255,255,0.12)",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
    },
    logoutDesktopIcon: {
      fontSize: 16,
    },
    // overlay and sidebar
    overlay: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      zIndex: 1100,
    },
    sidebar: {
      position: "fixed",
      top: 0,
      left: showSidebar ? 0 : -320,
      width: 320,
      height: "100vh",
      background: "#fff",
      color: "#222",
      boxShadow: "0 10px 30px rgba(20,20,40,0.12)",
      zIndex: 1150,
      display: "flex",
      flexDirection: "column",
      transition: "left 240ms cubic-bezier(.22,.9,.3,1)",
      padding: 18,
    },
    sidebarHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 14,
    },
    sidebarBrand: {
      display: "flex",
      alignItems: "center",
      gap: 10,
    },
    sidebarLogoIcon: {
      width: 44,
      height: 44,
      borderRadius: 8,
      background: "#f1f4ff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#4a3fd6",
      fontWeight: 800,
    },
    sidebarBrandText: { fontWeight: 800, fontSize: 16 },
    sidebarCloseBtn: { background: "transparent", border: "none", cursor: "pointer", fontSize: 18 },
    sidebarNav: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      marginTop: 8,
      flex: 1,
      overflowY: "auto",
      paddingRight: 6,
    },
    sidebarLink: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      padding: "10px 12px",
      borderRadius: 8,
      color: "#333",
      textDecoration: "none",
      fontWeight: 700,
    },
    sidebarLinkIcon: { width: 22, textAlign: "center" },
    sidebarActive: {
      background: "linear-gradient(90deg,#eef0ff,#f7f8ff)",
      color: "#2b2b8a",
    },
    sidebarFooter: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #f0f2f7" },
    logoutBtn: {
      width: "100%",
      display: "flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
      padding: "10px 12px",
      borderRadius: 8,
      border: "none",
      background: "#f9f9fb",
      cursor: "pointer",
      fontWeight: 700,
    },
  };

  return (
    <>
      {/* Font Awesome link: it's fine here but adding to public/index.html <head> is more reliable */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        style={styles.fontLink}
      />

      <header style={styles.navbarTop}>
        <div style={styles.navbarContainer}>
          {/* show hamburger on small screens */}
          {!isWide && (
            <button
              style={styles.menuBtn}
              onClick={() => setShowSidebar(true)}
              aria-label="Open menu"
              type="button"
            >
              <i className="fas fa-bars" style={styles.menuIcon} />
              <span style={{ marginLeft: 8 }}>Menu</span>
            </button>
          )}

          {/* brand */}
          <div style={styles.navbarBrand}>
            <div style={styles.logoIcon}>
              <i className="fas fa-project-diagram" />
            </div>
            <span style={styles.brandText}>PURIFIED DRINKING WATER</span>
          </div>

          <div style={styles.spacer} />

          {/* Desktop inline menu */}
          {isWide && (
            <>
              <nav style={styles.desktopMenu} aria-label="Main navigation">
                {menuItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      style={{
                        ...styles.desktopMenuItem,
                        ...(active ? styles.desktopActive : {}),
                      }}
                    >
                      <i className={item.icon} style={{ marginRight: 8 }} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout button on desktop */}
              <button
                onClick={handleLogout}
                style={{ ...styles.logoutDesktop, marginLeft: 12 }}
                aria-label="Logout"
              >
                <i className="fas fa-sign-out-alt" style={styles.logoutDesktopIcon} />
                <span>Logout</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Sidebar overlay (only when sidebar open) */}
      {showSidebar && <div style={styles.overlay} onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <aside style={styles.sidebar} aria-hidden={!showSidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.sidebarBrand}>
            <div style={styles.sidebarLogoIcon}>
              <i className="fas fa-project-diagram" />
            </div>
            <span style={styles.sidebarBrandText}>PURIFIED DRINKING WATER</span>
          </div>

          <button
            onClick={() => setShowSidebar(false)}
            aria-label="Close menu"
            style={styles.sidebarCloseBtn}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        <nav style={styles.sidebarNav} aria-label="Sidebar navigation">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setShowSidebar(false)}
                style={{
                  ...styles.sidebarLink,
                  ...(isActive ? styles.sidebarActive : {}),
                }}
              >
                <i className={item.icon} style={styles.sidebarLinkIcon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={styles.sidebarFooter}>
          <button
            onClick={() => {
              setShowSidebar(false);
              handleLogout();
            }}
            style={styles.logoutBtn}
          >
            <i className="fas fa-sign-out-alt" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
