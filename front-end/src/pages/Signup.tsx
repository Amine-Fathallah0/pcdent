import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import api from '../lib/api';
import { Button, Card, Input, Label, Spinner } from '@heroui/react';
import { toast } from 'sonner';
import ThemeToggle from '../components/auth/ThemeToggle';
import FloatingImageBackground from '../components/auth/FloatingImageBackground';
import { getFloatingAssetsByTheme } from '../components/auth/floatingImageAssets';
import '../styles/auth-rework.css';

type UserType = 'patient' | 'dentist' | null;

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const backgroundAssets = getFloatingAssetsByTheme(resolvedTheme);
  const brandLogo = resolvedTheme === 'dark' ? '/dentalyze/light.png' : '/dentalyze/dark.png';
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    // Dentist-specific
    location: '',
    contact_number: '',
    // Patient-specific
    date_of_birth: '',
    address: '',
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const getErrorMessage = (error: any, fallback: string) => {
    let msg = fallback;
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        msg = `Server Error: ${error.response.status}`;
      } else if (error.response.data.detail) {
        msg = error.response.data.detail;
      } else {
        const errors: string[] = [];
        for (const [key, value] of Object.entries(error.response.data)) {
          if (typeof value === 'object' && value !== null) {
            for (const [subKey, subValue] of Object.entries(value as object)) {
              errors.push(`${key} -> ${subKey}: ${subValue}`);
            }
          } else {
            errors.push(`${key}: ${value}`);
          }
        }
        if (errors.length > 0) {
          msg = errors.join(' | ');
        }
      }
    }
    return msg;
  };

  const autoLoginAndRedirect = async (role: 'dentist' | 'patient') => {
    const loginResponse = await api.post('login/', {
      username: formData.username,
      password: formData.password,
    });

    const { access, refresh, user_id, full_name } = loginResponse.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('token', access);
    localStorage.setItem('user_id', user_id);
    localStorage.setItem('full_name', full_name);
    localStorage.setItem('user_role', role);

    navigate(role === 'dentist' ? '/dentist' : '/patient', { replace: true });
  };

  const persistAuthAndRedirect = (
    data: { access?: string; refresh?: string; user_id?: string; full_name?: string },
    role: 'dentist' | 'patient'
  ) => {
    if (!data.access || !data.refresh || !data.user_id || !data.full_name) {
      return false;
    }

    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    localStorage.setItem('token', data.access);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('full_name', data.full_name);
    localStorage.setItem('user_role', role);
    navigate(role === 'dentist' ? '/dentist' : '/patient', { replace: true });
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userType === 'dentist') {
        const payload = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          location: formData.location,
          contact_number: formData.contact_number
        };

        const registerResponse = await api.post('dentists/register/', payload);

        toast.success('Dentist account created successfully!');
        const loggedIn = persistAuthAndRedirect(registerResponse.data, 'dentist');
        if (!loggedIn) {
          try {
            await autoLoginAndRedirect('dentist');
          } catch (loginError: any) {
            console.error(loginError);
            toast.warning('Account created, but auto-login failed. Please login manually.');
            navigate('/login', { replace: true });
          }
        }
      } else if (userType === 'patient') {
        const payload = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          contact_number: formData.contact_number,
          address: formData.address
        };

        const registerResponse = await api.post('patients/register/', payload);

        toast.success('Patient account created successfully!');
        const loggedIn = persistAuthAndRedirect(registerResponse.data, 'patient');
        if (!loggedIn) {
          try {
            await autoLoginAndRedirect('patient');
          } catch (loginError: any) {
            console.error(loginError);
            toast.warning('Account created, but auto-login failed. Please login manually.');
            navigate('/login', { replace: true });
          }
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(getErrorMessage(error, 'Registration failed. Please check your inputs.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Select user type
  if (!userType) {
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

          <section className="authx-main">
            <Card className="authx-hero-card" variant="default">
              <p className="authx-kicker">Create Access</p>
              <h1 className="authx-heading">Join the platform built for faster dental decisions.</h1>
              <p className="authx-copy">
                Start with a patient or dentist workspace and keep every image, report, and appointment organized from day one.
              </p>
              <ul className="authx-feature-list">
                <li className="authx-feature-item"><span className="authx-feature-dot" /> Guided registration in under 2 minutes</li>
                <li className="authx-feature-item"><span className="authx-feature-dot" /> Secure image and report lifecycle</li>
                <li className="authx-feature-item"><span className="authx-feature-dot" /> Built for collaboration across care teams</li>
              </ul>
            </Card>

            <Card className="authx-form-card" variant="tertiary">
              <Card.Header>
                <Card.Title className="authx-form-title">Choose account type</Card.Title>
                <Card.Description className="authx-form-subtitle">
                  Pick the role that matches your workflow.
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="authx-role-grid">
                  <button type="button" className="authx-role-btn" onClick={() => setUserType('patient')}>
                    <div className="authx-role-title">Patient account</div>
                    <div className="authx-role-desc">Track visits, upload images, and receive treatment updates.</div>
                  </button>
                  <button type="button" className="authx-role-btn" onClick={() => setUserType('dentist')}>
                    <div className="authx-role-title">Dentist account</div>
                    <div className="authx-role-desc">Review AI findings, manage cases, and coordinate with patients.</div>
                  </button>
                </div>
                <div className="authx-cta">
                  <div className="authx-inline-actions">
                    <Button variant="outline" onPress={() => navigate('/')}>Back to home</Button>
                    <button type="button" onClick={() => navigate('/login')} className="authx-link">
                      Already have an account? Login
                    </button>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </section>
        </div>
      </div>
    );
  }

  // Step 2: Registration form
  const isPatient = userType === 'patient';
  const isDentist = userType === 'dentist';

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

        <section className="authx-main">
          <Card className="authx-hero-card" variant="default">
            <p className="authx-kicker">Step Two</p>
            <h1 className="authx-heading">Register as {isPatient ? 'Patient' : 'Dentist'}.</h1>
            <p className="authx-copy">
              {isPatient
                ? 'Set up your account to upload scans, schedule appointments, and follow treatment updates.'
                : 'Set up your professional profile to review AI insights and manage active patient cases.'}
            </p>
            <ul className="authx-feature-list">
              <li className="authx-feature-item"><span className="authx-feature-dot" /> Encrypted records and role-based access</li>
              <li className="authx-feature-item"><span className="authx-feature-dot" /> Instant dashboard access after signup</li>
              <li className="authx-feature-item"><span className="authx-feature-dot" /> Built to scale from solo clinics to teams</li>
            </ul>
          </Card>

          <Card className="authx-form-card" variant="tertiary">
            <Card.Header>
              <Card.Title className="authx-form-title">Create your {isPatient ? 'patient' : 'dentist'} profile</Card.Title>
              <Card.Description className="authx-form-subtitle">
                Complete all required fields to continue.
              </Card.Description>
            </Card.Header>

            <Card.Content>
              <form onSubmit={handleSubmit} className="authx-form-grid">
                <div className="authx-row-2">
                  <div className="authx-form-grid">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} fullWidth required />
                  </div>
                  <div className="authx-form-grid">
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" name="username" value={formData.username} onChange={handleChange} fullWidth required />
                  </div>
                </div>

                <div className="authx-row-2">
                  <div className="authx-form-grid">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth required />
                  </div>
                  <div className="authx-form-grid">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} fullWidth required />
                  </div>
                </div>

                {isPatient && (
                  <>
                    <div className="authx-row-2">
                      <div className="authx-form-grid">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input
                          id="date_of_birth"
                          name="date_of_birth"
                          type="date"
                          value={formData.date_of_birth}
                          onChange={handleChange}
                          fullWidth
                          required
                        />
                      </div>
                      <div className="authx-form-grid">
                        <Label htmlFor="contact_number_patient">Contact Number</Label>
                        <Input
                          id="contact_number_patient"
                          name="contact_number"
                          value={formData.contact_number}
                          onChange={handleChange}
                          fullWidth
                          required
                        />
                      </div>
                    </div>
                    <div className="authx-form-grid">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" name="address" value={formData.address} onChange={handleChange} fullWidth required />
                    </div>
                  </>
                )}

                {isDentist && (
                  <div className="authx-row-2">
                    <div className="authx-form-grid">
                      <Label htmlFor="location">Clinic Location</Label>
                      <Input id="location" name="location" value={formData.location} onChange={handleChange} fullWidth required />
                    </div>
                    <div className="authx-form-grid">
                      <Label htmlFor="contact_number_dentist">Contact Number</Label>
                      <Input
                        id="contact_number_dentist"
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        fullWidth
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="authx-cta">
                  <Button type="submit" fullWidth isDisabled={loading}>
                    {loading ? (
                      <>
                        <Spinner color="current" size="sm" />
                        Creating account...
                      </>
                    ) : (
                      'Create account'
                    )}
                  </Button>
                  <div className="authx-inline-actions">
                    <Button type="button" variant="outline" onPress={() => setUserType(null)}>
                      Change role
                    </Button>
                    <button type="button" onClick={() => navigate('/login')} className="authx-link">
                      Already have an account? Login
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

export default Signup;
