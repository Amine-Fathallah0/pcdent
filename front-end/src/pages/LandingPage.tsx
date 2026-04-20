import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Activity, UserRound } from 'lucide-react';
import { Button } from '../components/ui/button';
import TextType from '../components/ui/TextType';
import CountUp from '../components/ui/CountUp';
import ThemeToggle from '../components/auth/ThemeToggle';
import FloatingImageBackground from '../components/auth/FloatingImageBackground';
import LiveSystemSnapshot from '../components/auth/LiveSystemSnapshot';
import { getFloatingAssetsByTheme } from '../components/auth/floatingImageAssets';

const LandingPage = () => {
  const { resolvedTheme } = useTheme();
  const backgroundAssets = getFloatingAssetsByTheme(resolvedTheme);
  const brandLogo = resolvedTheme === 'dark' ? '/dentalyze/light.png' : '/dentalyze/dark.png';

  return (
    <div id="landing-page" className="landing-page">
      <FloatingImageBackground imageUrls={backgroundAssets} cursorStrength={30} />
      <div className="landing-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="landing-container">
        <header className="landing-nav reveal">
          <div className="landing-brand">
            <div className="landing-logo-shell">
              <img className="landing-logo" src={brandLogo} alt="Dentalyze" />
            </div>
          </div>
          <div className="flex gap-3">
            <ThemeToggle />
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
            <TextType
              as="h2"
              className="hero-title"
              text="Smarter dental care, from first scan to follow-up."
              typingSpeed={42}
              initialDelay={250}
              loop={false}
              startOnVisible
            />
            <p className="landing-subtitle">
              A unified platform for clinicians and patients. Track diagnostics, manage visits, and
              unlock AI-driven insight with confidence.
            </p>
            <div className="hero-metrics">
              <div className="metric-card">
                <div className="metric-value">
                  <CountUp from={120} to={45} direction="down" duration={2.2} />s
                </div>
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
              <LiveSystemSnapshot />
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
                <UserRound size={30} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <span className="role-tag">Patients</span>
              <h3>Patient Portal</h3>
              <p>Access results, upload scans, and follow treatment plans in one place.</p>
            </Link>
            <Link to="/dentist" className="role-card reveal delay-2">
              <div className="role-icon dentist-icon">
                <Activity size={30} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <span className="role-tag">Clinicians</span>
              <h3>Clinician Dashboard</h3>
              <p>Coordinate appointments, review AI insights, and manage patient care.</p>
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
