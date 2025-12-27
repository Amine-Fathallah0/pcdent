import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div id="landing-page" className="landing-page">
      <div className="landing-container">
        <div className="landing-header">
          <div className="logo">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z"/>
            </svg>
          </div>
          <h1>Dental AI Assistant</h1>
          <p className="landing-subtitle">Advanced AI-Powered Dental Analysis & Management System</p>
        </div>
        <div className="role-selection">
          <Link to="/patient" className="role-card">
            <div className="role-icon patient-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h3>Patient Portal</h3>
            <p>View your dental history, treatment plans, and upload images</p>
          </Link>
          <Link to="/dentist" className="role-card">
            <div className="role-icon dentist-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3>Clinician Dashboard</h3>
            <p>AI-assisted diagnosis, patient management, and analytics</p>
          </Link>
          <Link to="/admin" className="role-card">
            <div className="role-icon admin-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <h3>Admin & Analytics</h3>
            <p>System monitoring, clinic statistics, and user management</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
