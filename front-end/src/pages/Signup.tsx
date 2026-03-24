import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/card';
import { toast } from 'sonner';

type UserType = 'patient' | 'dentist' | null;

const Signup: React.FC = () => {
  const navigate = useNavigate();
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

    const { token, user_id, full_name } = loginResponse.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user_id', user_id);
    localStorage.setItem('full_name', full_name);
    localStorage.setItem('user_role', role);

    navigate(role === 'dentist' ? '/dentist' : '/patient');
  };

  const persistAuthAndRedirect = (
    data: { token?: string; user_id?: string; full_name?: string },
    role: 'dentist' | 'patient'
  ) => {
    if (!data.token || !data.user_id || !data.full_name) {
      return false;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user_id', data.user_id);
    localStorage.setItem('full_name', data.full_name);
    localStorage.setItem('user_role', role);
    navigate(role === 'dentist' ? '/dentist' : '/patient');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (userType === 'dentist') {
        const payload = {
          user: {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
          },
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
            navigate('/login');
          }
        }
      } else if (userType === 'patient') {
        const payload = {
          user: {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
          },
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
            navigate('/login');
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
      <div className="auth-page">
        <div className="landing-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        <div className="auth-container">
          <Card className="auth-card auth-card-wide">
            <CardHeader>
              <span className="auth-badge">Sign up</span>
              <CardTitle className="auth-title">Create your account</CardTitle>
              <CardDescription>Choose the workspace that fits your role.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setUserType('patient')}
                  className="role-choice"
                >
                  <div className="role-choice-icon">👤</div>
                  <div>
                    <div className="role-choice-title">Patient</div>
                    <div className="role-choice-desc">Book appointments and track your care</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType('dentist')}
                  className="role-choice"
                >
                  <div className="role-choice-icon">🦷</div>
                  <div>
                    <div className="role-choice-title">Dentist</div>
                    <div className="role-choice-desc">Manage patients and review AI insights</div>
                  </div>
                </button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Back to home
              </Button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="auth-link"
              >
                Already have an account? Login
              </button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Step 2: Registration form
  const isPatient = userType === 'patient';
  const isDentist = userType === 'dentist';

  return (
    <div className="auth-page">
      <div className="landing-orbs" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>
      <div className="auth-container">
        <Card className="auth-card auth-card-wide">
          <CardHeader>
            <span className="auth-badge">Sign up</span>
            <CardTitle className="auth-title">
              Register as {isPatient ? 'Patient' : 'Dentist'}
            </CardTitle>
            <CardDescription>
              {isPatient ? 'Create your patient account' : 'Create your professional dentist account'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
            {/* Common fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username *</label>
              <Input
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password *</label>
              <Input
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {/* Patient-specific fields */}
            {isPatient && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date of Birth *</label>
                  <Input
                    name="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Number *</label>
                  <Input
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    rows={3}
                    required
                  />
                </div>
              </>
            )}

            {/* Dentist-specific fields */}
            {isDentist && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Clinic Location *</label>
                  <Input
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Number *</label>
                  <Input
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}
          </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="primary-cta w-full"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => setUserType(null)}
                className="w-full"
              >
                Back
              </Button>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="auth-link"
              >
                Already have an account? Login
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
