import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import api from '../lib/api';
import { Button, Card, Input, Label, Spinner } from '@heroui/react';
import { toast } from 'sonner';
import ThemeToggle from '../components/auth/ThemeToggle';
import FloatingImageBackground from '../components/auth/FloatingImageBackground';
import { getFloatingAssetsByTheme } from '../components/auth/floatingImageAssets';
import TextType from '../components/ui/TextType';
import '../styles/auth-rework.css';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const backgroundAssets = getFloatingAssetsByTheme(resolvedTheme);
  const brandLogo = resolvedTheme === 'dark' ? '/dentalyze/light.png' : '/dentalyze/dark.png';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('user_role');

    if (!token) {
      return;
    }

    if (role === 'dentist') {
      navigate('/dentist', { replace: true });
      return;
    }

    if (role === 'patient') {
      navigate('/patient', { replace: true });
      return;
    }

    if (role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [navigate]);

  const getErrorMessage = (error: any, fallback: string) => {
    const data = error?.response?.data;
    if (!data) return fallback;
    if (typeof data === 'string') return data;
    if (data.detail) return data.detail;
    if (data.username && Array.isArray(data.username)) return data.username.join(', ');
    return fallback;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('login/', { username, password });
      const { access, refresh, is_dentist, user_id, full_name } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('token', access);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('full_name', full_name);
      localStorage.setItem('user_role', is_dentist ? 'dentist' : 'patient');

      toast.success('Login successful!');

      if (is_dentist) {
        navigate('/dentist', { replace: true });
      } else {
        navigate('/patient', { replace: true });
      }
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Invalid credentials or server error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authx-page">
      <FloatingImageBackground imageUrls={backgroundAssets} cursorStrength={28} />
      <div className="landing-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="authx-grid-overlay" aria-hidden="true" />
      <div className="authx-shell">
        <header className="authx-topbar">
          <div className="authx-brand">
            <div className="authx-brand-logo-shell">
              <img className="authx-brand-logo" src={brandLogo} alt="Dentalyze" />
            </div>
          </div>
          <ThemeToggle />
        </header>

        <section className="authx-main authx-main--equal">
          <Card className="authx-hero-card" variant="default">
            <p className="authx-kicker">Clinical Intelligence</p>
            <h1 className="authx-heading">Sign in and continue patient care with confidence.</h1>
            <TextType
              as="p"
              className="authx-copy"
              text="Access appointments, AI report workflows, and secure dentist-patient communication from one streamlined workspace."
              typingSpeed={22}
              initialDelay={120}
              loop={false}
              showCursor={false}
              startOnVisible
            />
            <ul className="authx-feature-list">
              <li className="authx-feature-item">
                <span className="authx-feature-dot" />
                <TextType
                  as="span"
                  text="Real-time case status tracking"
                  typingSpeed={20}
                  initialDelay={620}
                  loop={false}
                  showCursor={false}
                  startOnVisible
                />
              </li>
              <li className="authx-feature-item">
                <span className="authx-feature-dot" />
                <TextType
                  as="span"
                  text="HIPAA-minded workflow structure"
                  typingSpeed={20}
                  initialDelay={1020}
                  loop={false}
                  showCursor={false}
                  startOnVisible
                />
              </li>
              <li className="authx-feature-item">
                <span className="authx-feature-dot" />
                <TextType
                  as="span"
                  text="Secure role-based dashboards"
                  typingSpeed={20}
                  initialDelay={1420}
                  loop={false}
                  showCursor={false}
                  startOnVisible
                />
              </li>
            </ul>
          </Card>

          <Card className="authx-form-card authx-form-card--login" variant="tertiary">
            <Card.Header>
              <Card.Title className="authx-form-title">Welcome back</Card.Title>
              <Card.Description className="authx-form-subtitle">
                Enter your credentials to continue.
              </Card.Description>
            </Card.Header>
            <Card.Content>
              <form onSubmit={handleLogin} className="authx-form-grid">
                <div className="authx-form-grid">
                  <Label htmlFor="username">Username or Email</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="dr.smith or dr.smith@clinic.com"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    required
                  />
                </div>

                <div className="authx-form-grid">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                  />
                </div>

                <div className="authx-cta">
                  <Button type="submit" fullWidth isDisabled={loading}>
                    {loading ? (
                      <>
                        <Spinner color="current" size="sm" />
                        Logging in...
                      </>
                    ) : (
                      'Login'
                    )}
                  </Button>
                  <div className="authx-inline-actions">
                    <Button type="button" variant="outline" onPress={() => navigate('/')}>
                      Back to home
                    </Button>
                    <button type="button" onClick={() => navigate('/signup')} className="authx-link">
                      New here? Create account
                    </button>
                  </div>
                </div>
              </form>
            </Card.Content>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default Login;
