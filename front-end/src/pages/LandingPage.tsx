import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const LandingPage = () => {
  return (
    <div id="landing-page" className="landing-page">
      <div className="landing-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="landing-container">
        <header className="landing-nav reveal">
          <div className="landing-brand">
            <div className="landing-logo">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2C8 2 5 5 5 9c0 2 1 4 2 5v6a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6c1-1 2-3 2-5 0-4-3-7-7-7z" />
              </svg>
            </div>
            <h1 className="landing-title">Dental AI Assistant</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link to="/signup">
              <Button className="primary-cta">Sign Up</Button>
            </Link>
          </div>
        </header>

        <section className="landing-hero">
          <div className="hero-copy reveal delay-1">
            <span className="hero-badge">AI guided care</span>
            <h2 className="hero-title">Smarter dental care, from first scan to follow-up.</h2>
            <p className="landing-subtitle">
              A unified platform for clinicians and patients. Track diagnostics, manage visits, and
              unlock AI-driven insight with confidence.
            </p>
            <div className="hero-metrics">
              <div className="metric-card">
                <div className="metric-value">45s</div>
                <div className="metric-label">Average case setup</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">3x</div>
                <div className="metric-label">Faster clinical review</div>
              </div>
              <div className="metric-card">
                <div className="metric-value">24/7</div>
                <div className="metric-label">Patient access</div>
              </div>
            </div>
          </div>

          <div className="hero-panel reveal delay-2">
            <div className="panel-label">Live system snapshot</div>
            <div className="panel-grid">
              <div className="panel-card">
                <div className="panel-card-title">AI scan analysis</div>
                <p>Auto-triage, anomaly detection, and instant summaries.</p>
              </div>
              <div className="panel-card">
                <div className="panel-status">
                  <span>Clinician queue</span>
                  <span className="status-pill">Healthy</span>
                </div>
              </div>
              <div className="panel-card">
                <div className="panel-card-title">Patient readiness</div>
                <p>Share results, schedule visits, and manage reminders.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="role-section">
          <div className="role-header">
            <div>
              <h3 className="section-title">Choose your workspace</h3>
              <p className="section-subtitle">Tailored experiences for every role in the clinic.</p>
            </div>
          </div>
          <div className="role-selection">
            <Link to="/patient" className="role-card reveal delay-1">
              <div className="role-icon patient-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <span className="role-tag">Patients</span>
              <h3>Patient Portal</h3>
              <p>Access results, upload scans, and follow treatment plans in one place.</p>
            </Link>
            <Link to="/dentist" className="role-card reveal delay-2">
              <div className="role-icon dentist-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span className="role-tag">Clinicians</span>
              <h3>Clinician Dashboard</h3>
              <p>Coordinate appointments, review AI insights, and manage patient care.</p>
            </Link>
            <Link to="/admin" className="role-card reveal delay-3">
              <div className="role-icon admin-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <span className="role-tag">Operations</span>
              <h3>Admin & Analytics</h3>
              <p>Monitor performance, understand clinic metrics, and optimize workflows.</p>
            </Link>
          </div>
        </section>

        <section className="cta-panel reveal delay-2">
          <div>
            <h2>New to the platform?</h2>
            <p>Create your account and get a tailored onboarding in minutes.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
